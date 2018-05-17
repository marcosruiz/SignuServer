/**
 * Created by Marcos on 11/05/2017.
 */
"use strict";
var express = require('express');
var router = express.Router();
var fs = require('fs');
var Pdf = require('./models/pdf');
var User = require('./models/user');
const path = require('path');
var multer = require('multer');
var config = require('config');
var upload = multer({dest: config.uploads_dir});
var HttpStatus = require('http-status-codes');
var sendStandardError = require('../../routes/index').sendStandardError;
var thisSession;
var newPdf;

/**
 * Download pdf
 */
router.get('/:pdf_id', function (req, res, next) {
    thisSession = req.session;
    if (thisSession._id == undefined) {
        sendStandardError(res, HttpStatus.UNAUTHORIZED);
    } else {
        Pdf.findById(req.params.pdf_id, function (err, pdf) {
            if (err) {
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            } else {
                if (pdf.owner_id == thisSession._id) {
                    res.download(pdf.path, pdf.original_name);
                } else {
                    var isSigner = pdf.signers.some(function (signer) {
                        return signer.user_id == thisSession._id;
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

router.post('/unlock', function (req, res, next) {
    if (req.body._method == 'put') {
        unlockPdf(req, res);
    }
});

/**
 * Unlock a pdf to a specific user
 * @param req
 * @param res
 */
function unlockPdf(req, res) {
    thisSession = req.session;
    if (thisSession._id == undefined) {
        sendStandardError(res, HttpStatus.UNAUTHORIZED);
    } else {
        var newPdf = {
            "someone_is_signing": true,
            "user_id_signing": thisSession._id
        };
        Pdf.findOneAndUpdate({
            "_id": req.params.pdf_id,
            "someone_is_signing": false
        }, newPdf, {new: true}, function (err, pdf) {
            if (err) {
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            } else if (pdf == null) {
                sendStandardError(res, HttpStatus.LOCKED);
            } else {
                setTimeout(lockPdf, 60000, pdf._id); // 60 segundos de delay
                res.json(pdf);
            }
        });
    }
}
/**
 * This unlock pdf 10 minutes for this user
 */
router.put('/unlock/:pdf_id', function (req, res, next) {
    unlockPdf(req, res);
});

/**
 * Lock pdf
 * @param pdf_id
 */
function lockPdf(pdf_id) {
    console.log("No one is signing now");
    newPdf = {"someone_is_signing": false};
    Pdf.findByIdAndUpdate(pdf_id, newPdf, {new: true});
}

/**
 * Upload a new PDF without pending signatures
 */
function postPdf(req, res) {
    thisSession = req.session;
    if (thisSession._id == undefined) {
        sendStandardError(res, HttpStatus.UNAUTHORIZED);
    } else {
        newPdf = new Pdf({
            "original_name": req.file.originalname,
            "mime_type": req.file.mimetype,
            "file_name": req.file.filename,
            "destination": req.file.destination,
            "path": req.file.path,
            "encoding": req.file.encoding,
            "is_full_signed": false,
            "total_signatures": 0,
            "current_signatures": 0,
            "creation_date": new Date(),
            "someone_is_signing": false,
            "owner_id": thisSession._id,
            "signers": []
        });

        newPdf.save(function (err, pdf) {
            if (err) {
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            } else {
                res.json(pdf);
            }
        });
    }
}
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
        Pdf.findById(req.params.pdf_id, function (err, pdf) {
            if (err) {
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            } else if (pdf.owner_id != thisSession._id) {
                sendStandardError(res, HttpStatus.FORBIDDEN);
            } else if (pdf.with_stamp && pdf.total_signatures != 0) {
                sendStandardError(res, HttpStatus.FORBIDDEN);
            } else {
                newPdf = {
                    "total_signatures": pdf.total_signatures,
                    "signers": pdf.signers
                };
                req.body.signers.forEach(function (id) {
                    var item = {
                        "user_id": id,
                        "is_signed": false
                    }
                    newPdf.total_signatures = newPdf.total_signatures + 1;
                    newPdf.signers.push(item);
                });
                Pdf.findByIdAndUpdate(req.params.pdf_id, newPdf, {new: true}, function (err, pdf) {
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
 * Update a pdf/ Add a signature
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
        Pdf.findById(req.params.pdf_id, function (err, pdf) {
            if (err) {
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            } else if (pdf == null) {
                sendStandardError(res, HttpStatus.NOT_FOUND);
            } else if (!pdf.someone_is_signing) {
                sendStandardError(res, HttpStatus.LOCKED);
            } else if (pdf.someone_is_signing && pdf.user_id_signing != thisSession._id) {
                sendStandardError(res, HttpStatus.LOCKED);
            } else if (pdf.total_signatures == pdf.current_signatures) {
                sendStandardError(res, HttpStatus.FORBIDDEN);
            } else {
                var arraySigner = pdf.signers.filter(function (item) {
                    return item.user_id == thisSession._id;
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
                            pdf.destination = req.file.destination;
                            pdf.encoding = req.file.encoding;
                            pdf.mime_type = req.file.mimetype;
                            pdf.current_signatures = pdf.current_signatures + 1;
                            pdf.someone_is_signing = false;
                            // pdf.signers[index].signer_id = thisSession._id;
                            pdf.signers[index].is_signed = true;
                            pdf.signers[index].signature_date = Date.now();
                            Pdf.findByIdAndUpdate(pdf._id, pdf, {new: true}, function (err, pdf) {
                                if (err) {
                                    sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
                                } else {
                                    lockPdf(pdf._id);
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
        Pdf.findById(req.params.pdf_id, function (err, pdf) {
            if (err) {
                sendStandardError(res, HttpStatus.NOT_FOUND);
            } else {
                if (thisSession._id == pdf.owner_id) {
                    fs.unlink(pdf.path, function (err, result) {
                        if (err) {
                            sendStandardError(res, HttpStatus.NOT_FOUND);
                        } else {
                            Pdf.findByIdAndRemove(req.params.pdf_id, function (err, pdf) {
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
    Pdf.findById(req.params.id, function (err, pdf) {
        if (err) {
            sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
            res.send(pdf);
        }
    });
});

/////////////////////////////////
// User collection management //
////////////////////////////////

function deletePdfOfAllUsers(pdf) {
    User.findByIdAndUpdate(pdf.owner_id, {$pull: {"pdfs_owned": {"pdf_id": pdf._id}}}, {safe: true});
    pdf.signers.forEach(function (signer) {
        if (signer.is_signed) {
            User.findByIdAndUpdate(signer.user_id, {$pull: {"pdfs_to_sign": {"pdf_id": pdf._id}}}, {safe: true});
        } else {
            User.findByIdAndUpdate(signer.user_id, {$pull: {"pdfs_signed": {"pdf_id": pdf._id}}}, {safe: true});
        }
    });
    User.findByIdAndUpdate()
};

function signPdf(user_id, pdf_id, callback) {
    User.findByIdAndUpdate(user_id, {
        $pull: {"pdfs_to_sign": {"pdf_id": pdf_id}},
        $push: {"pdfs_signed": {"pdf_id": pdf_id}}
    }, {safe: true, new: true}, callback);
};

module.exports = router;