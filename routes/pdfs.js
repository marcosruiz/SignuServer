/**
 * Created by Marcos on 11/05/2017.
 */
"use strict";
var express = require('express');
var router = express.Router();
var fs = require('fs');
var PdfModel = require('../public/routes/models/pdf');
var UserModel = require('../public/routes/models/user');
const path = require('path');
var multer = require('multer');
var config = require('config');
var upload = multer({dest: config.uploads_dir});
var HttpStatus = require('http-status-codes');
var sendStandardError = require('./index').sendStandardError;
var thisSession;
var newPdf;
var LOCK_TIME = Date.UTC(0, 0, 0, 0, 1, 0, 0);

/**
 * Download pdf
 */
router.get('/:pdf_id', function (req, res, next) {
    thisSession = req.session;
    if (thisSession._id == undefined) {
        sendStandardError(res, HttpStatus.UNAUTHORIZED);
    } else {
        PdfModel.findById(req.params.pdf_id, function (err, pdf) {
            if (err) {
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            } else {
                if (pdf.owner_id.toString() == thisSession._id) {
                    res.download(pdf.path, pdf.original_name);
                } else {
                    var isSigner = pdf.signers.some(function (signer) {
                        return signer._id.toString() == thisSession._id;
                    });
                    if (isSigner) {
                        res.download(pdf.path, pdf.original_name);
                    } else {
                        sendStandardError(res, HttpStatus.UNAUTHORIZED);
                    }
                }
            }
        });
    }
});

/**
 * Unlock a pdf to a specific user if
 * pdf exists and
 * (there is no previus signer or
 * previus signer LOCK_TIME expired or
 * previus signer signed with success )
 * @param req
 * @param res
 */
function unlockPdf(req, res) {
    thisSession = req.session;
    if (thisSession._id == undefined) {
        sendStandardError(res, HttpStatus.UNAUTHORIZED);
    } else {

        var isAnyUserSigning = {success: false};
        PdfModel.findById(req.params.pdf_id, function (err, pdf) {
            if (err) {
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            } else if (pdf == null || pdf == undefined) {
                sendStandardError(res, HttpStatus.NOT_FOUND);
            } else if (pdf.is_any_user_signing._id == undefined || pdf.is_any_user_signing._id == null || true || (Date.now() - pdf.is_any_user_signing.when) >= LOCK_TIME || pdf.is_any_user_signing.success == true) {
                // Everything OK: no one more is trying to sign this pdf
                // Is not worth use timeouts cause I want a server without state
                //setTimeout(lockPdf, 60000, pdf._id); // 60 sec of delay
                var newPdf = {
                    is_any_user_signing: {_id: thisSession._id, when: Date.now(), success: false}
                };
                PdfModel.findByIdAndUpdate(pdf._id, newPdf, null, function (err, pdf) {
                    if (err) {
                        sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
                    } else if (pdf == null || pdf == undefined) {
                        sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
                    } else {
                        res.json(pdf);
                    }
                });
            } else {
                sendStandardError(res, HttpStatus.LOCKED);
            }
        });
    }
}

router.post('/unlock', function (req, res, next) {
    if (req.body._method == 'put') {
        unlockPdf(req, res);
    }
});

/**
 * This unlock pdf 1 minute for this user
 */
router.put('/unlock/:pdf_id', function (req, res, next) {
    unlockPdf(req, res);
});

/**
 * Upload a new PDF with pending signatures
 */
function postPdf(req, res) {
    thisSession = req.session;
    if (thisSession._id == undefined) {
        sendStandardError(res, HttpStatus.UNAUTHORIZED);
    } else {
        newPdf = new PdfModel({
            "original_name": req.file.originalname,
            "mime_type": req.file.mimetype,
            "file_name": req.file.filename,
            "destination": req.file.destination,
            "path": req.file.path,
            "with_stamp": false,
            "encoding": req.file.encoding,
            "creation_date": Date.now(),
            "owner_id": thisSession._id,
        });

        // Add signatures
        var signers = [];
        if (req.body.signers != null || req.body.signers != undefined) {

            // Creates a array of signers without duplicates
            var uniqueSigners = [];
            var signer;
            uniqueSigners = req.body.signers.filter(function (item, pos) {
                return (req.body.signers.indexOf(item) == pos);
            });

            for (var i = 0; i < uniqueSigners; i++) {
                if (req.body.signers[i] != '') {
                    signer = {_id: uniqueSigners[i], is_signed: false, signature_date: null};
                    signers.push(signer);
                }
            }
        }

        newPdf.signers = signers;

        newPdf.save(function (err, pdf) {
            if (err) {
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            } else {
                addPdfToUser(pdf);
                res.json(pdf);
            }
        });
    }
}

/**
 *
 */
router.patch('/addsigners/:pdf_id', upload.single('pdf'), addSignersToPdf);

/**
 * Add signers to a pdf
 * @param req
 * @param res
 * @param next
 */
function addSignersToPdf(req, res, next) {
    thisSession = req.session;
    if (thisSession._id == undefined) {
        sendStandardError(res, HttpStatus.UNAUTHORIZED);
    } else {
        PdfModel.findById(req.params.pdf_id, function (err, pdf) {
            if (err) {
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            } else if (pdf.owner_id.toString() != thisSession._id) {
                sendStandardError(res, HttpStatus.FORBIDDEN);
            } else if (pdf.with_stamp && pdf.total_signatures != 0) {
                sendStandardError(res, HttpStatus.FORBIDDEN);
            } else {
                newPdf = {
                    "signers": pdf.signers
                };
                req.body.signers.forEach(function (id) {
                    var found = isSignerThere(pdf.signers, id);
                    if (!found) {
                        var item = {
                            _id: id,
                            is_signed: false,
                            when: undefined
                        }
                        newPdf.signers.push(item);
                    }
                });
                PdfModel.findByIdAndUpdate(req.params.pdf_id, newPdf, {new: true}, function (err, pdf) {
                    if (err) {
                        sendStandardError(res, HttpStatus.NOT_FOUND);
                    } else {
                        res.json(pdf);
                    }
                });
            }
        });
    }
}

/**
 * checks if there is a signer with the same _id as userId
 * @param signersArray
 * @param userId
 * @returns {boolean}
 */
function isSignerThere(signersArray, userId) {
    var found = false;
    for (var i = 0; i < signersArray.length; i++) {
        if (signersArray[i]._id == userId) {
            found = true;
            break;
        }
    }
    return found;
}

function generateRandomString() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

/**
 * This is necesary for HTML forms work fine
 */
router.post('/', upload.single('pdf'), function (req, res, next) {
    if (req.body._method == 'delete') {
        deletePdf(req, res, next); // Delete pdf
    } else if (req.body._method == 'put') {
        putPdf(req, res, next); // Update pdf
    } else {
        postPdf(req, res, next); // Upload pdf
    }
});

/**
 * Update a pdf/ Add a signature. You should previusly unlock
 * @param req
 * @param res
 */
function putPdf(req, res) {
    thisSession = req.session;
    // req.checkParms("pdf_id", "Enter a valid pdf_id").isMongoId();
    var err = req.validationErrors();
    if (thisSession._id == undefined) {
        sendStandardError(res, HttpStatus.UNAUTHORIZED);
    } else if (err) {
        sendStandardError(res, HttpStatus.BAD_REQUEST);
    } else {
        PdfModel.findById(req.body.pdf_id, function (err, pdf) {
            if (err) {
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            } else if (pdf == null) {
                sendStandardError(res, HttpStatus.NOT_FOUND);
            } else if (pdf.is_any_user_signing == null || pdf.is_any_user_signing == undefined) {
                sendStandardError(res, HttpStatus.LOCKED);
            } else if (pdf.is_any_user_signing._id.toString() != thisSession._id) {
                sendStandardError(res, HttpStatus.LOCKED);
            } else if (Date.now() - pdf.is_any_user_signing.when <= LOCK_TIME) {
                sendStandardError(res, HttpStatus.LOCKED);
            } else {
                var arraySigner = pdf.signers.filter(function (item) {
                    return item._id == thisSession._id;
                });
                var actualSigner = arraySigner[0];
                var index = pdf.signers.indexOf(actualSigner);
                if (arraySigner.length < 1) {
                    sendStandardError(res, HttpStatus.FORBIDDEN);
                } else if (actualSigner.is_signed) {
                    sendStandardError(res, HttpStatus.FORBIDDEN);
                } else {
                    // Delete old file
                    fs.unlink(pdf.path, function (err) {
                        if (err) {
                            console.log(err);
                            sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
                        } else {
                            // Update database
                            pdf.path = req.file.path;
                            pdf.file_name = req.file.filename;
                            // pdf.destination = req.file.destination;
                            // pdf.encoding = req.file.encoding;
                            // pdf.mime_type = req.file.mimetype;
                            // pdf.signers[index].signer_id = thisSession._id;
                            pdf.signers[index].is_signed = true;
                            pdf.signers[index].signature_date = Date.now();
                            PdfModel.findByIdAndUpdate(pdf._id, pdf, {new: true}, function (err, pdf) {
                                if (err) {
                                    sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
                                } else {
                                    res.json(pdf);
                                }
                            });
                        }
                    });
                }
            }
        });
    }
}

/**
 * Update a PDF with one more signature
 */
router.put('/:pdf_id', upload.single('pdf'), function (req, res, next) {
    putPdf(req, res);
});

/**
 * Delete a pdf from database and filesystem
 * @param req
 * @param res
 */
function deletePdf(req, res) {
    thisSession = req.session;
    if (thisSession._id == undefined) {
        sendStandardError(res, HttpStatus.UNAUTHORIZED);
    } else {
        PdfModel.findById(req.params.pdf_id, function (err, pdf) {
            if (err) {
                sendStandardError(res, HttpStatus.NOT_FOUND);
            } else {
                if (thisSession._id == pdf.owner_id.toString()) {
                    fs.unlink(pdf.path, function (err, result) {
                        if (err) {
                            sendStandardError(res, HttpStatus.NOT_FOUND);
                        } else {
                            PdfModel.findByIdAndRemove(req.params.pdf_id, function (err, pdf) {
                                if (err) {
                                    sendStandardError(res, HttpStatus.NOT_FOUND);
                                } else {
                                    res.json({'message': 'Pdf deleted'});
                                    deletePdfOfAllUsers(pdf);
                                }
                            });
                        }
                    });
                } else {
                    sendStandardError(res, HttpStatus.UNAUTHORIZED);
                }
            }
        });
    }
}

router.delete('/:pdf_id', function (req, res, next) {
    deletePdf(req, res);
});

/**
 * Get info of pdf
 */
router.get('/status/:id', function (req, res, next) {
    PdfModel.findById(req.params.id, function (err, pdf) {
        if (err) {
            sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
            res.send(pdf);
        }
    });
});

/////////////////////////////////
// UserModel collection management //
////////////////////////////////

function deletePdfOfAllUsers(pdf) {
    UserModel.findByIdAndUpdate(pdf.owner_id, {$pull: {"pdfs_owned": {"pdf_id": pdf._id}}}, {safe: true});
    pdf.signers.forEach(function (signer) {
        if (signer.is_signed) {
            UserModel.findByIdAndUpdate(signer._id, {$pull: {"pdfs_to_sign": {"pdf_id": pdf._id}}}, {safe: true});
        } else {
            UserModel.findByIdAndUpdate(signer._id, {$pull: {"pdfs_signed": {"pdf_id": pdf._id}}}, {safe: true});
        }
    });
    UserModel.findByIdAndUpdate()
};

/**
 * Add PDF pdf to their creator, signers
 * @param pdf
 */
function addPdfToUser(pdf) {
    var newPdf = {_id: pdf._id};
    UserModel.findByIdAndUpdate(pdf.owner_id, {$push: {pdfs_owned: newPdf}}, {safe: false});
    pdf.signers.forEach(function (signer) {
        if (signer.is_signed) {
            UserModel.findByIdAndUpdate(signer._id, {$push: {pdfs_signed: newPdf}}, {safe: false});
        } else {
            UserModel.findByIdAndUpdate(signer._id, {$push: {pdfs_to_sign: newPdf}}, {safe: false});
        }
    });

    UserModel.findByIdAndUpdate()
};

/**
 * Standar output for mongoose queries
 * Used for test
 * @param err
 * @param user
 */
function standarCBM(err, user) {
    if (err) {
        console.log("SOMETHING WAS WRONG" + err);
    } else {
        console.log("EVERYTHING OK: " + user);
    }
};

/**
 *
 * @param user_id
 * @param pdf_id
 * @param callback
 */
function signPdf(user_id, pdf_id, callback) {
    UserModel.findByIdAndUpdate(user_id, {
        $pull: {pdfs_to_sign: {_id: pdf_id}},
        $push: {pdfs_signed: {id: pdf_id}}
    }, {safe: false, new: true}, callback);
};

module.exports = router;