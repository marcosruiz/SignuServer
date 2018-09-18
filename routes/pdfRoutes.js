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
var AppStatus = require('../public/routes/app-err-codes-en');
var getJsonAppError = AppStatus.getJsonAppError;
var thisSession;
var newPdf;
var LOCK_TIME = 60000; // 60 seg
var UserRoutes = require('./userRoutes.js');

/**
 * Download pdf
 */
router.get('/:pdf_id', function (req, res, next) {
    thisSession = req.session;
    if (thisSession._id == null) {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_LOGGED));
    } else {
        PdfModel.findById(req.params.pdf_id, function (err, pdf) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
            } else if (pdf == null) {
                res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
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
                        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_LOGGED));
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
    if (thisSession._id == null) {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_LOGGED));
    } else {
        var isAnyUserSigning = {success: false};
        PdfModel.findById(req.params.pdf_id, function (err, pdf) {
            var timeDiff = (Date.now() - pdf.is_any_user_signing.when);
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
            } else if (pdf == null) {
                res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
            } else if (pdf.is_any_user_signing._id == null || timeDiff >= LOCK_TIME || pdf.is_any_user_signing.success == true) {
                // Everything OK: no one more is trying to sign this pdf
                var newPdf = {
                    is_any_user_signing: {_id: thisSession._id, when: Date.now(), success: false}
                };
                PdfModel.findByIdAndUpdate(pdf._id, newPdf, null, function (err, pdf) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                    } else if (pdf == null) {
                        res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
                    } else {
                        res.json({
                            code: AppStatus.PDF_UNLOCKED,
                            message: AppStatus.getStatusText(AppStatus.PDF_UNLOCKED),
                            data: {pdf: pdf}
                        });
                    }
                });
            } else {
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.PDF_NOT_LOCKED_BY_YOU));
            }
        });
    }
}

router.post('/unlock/:pdf_id', function (req, res, next) {
    if (req.body._method == 'put') {
        unlockPdf(req, res);
    } else {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    }
});

/**
 * This unlock pdf 1 minute for this user
 */
router.put('/unlock/:pdf_id', unlockPdf);

/**
 * Upload a new PDF with pending signatures
 */
function postPdf(req, res) {
    thisSession = req.session;
    if (thisSession._id == null) {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_LOGGED));
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
        if (req.body.signers != null) {
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
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
            } else {
                UserRoutes.addPdfToUsers(pdf);
                res.json({
                    code: AppStatus.PDF_CREATED,
                    message: AppStatus.getStatusText(AppStatus.PDF_CREATED),
                    data: {pdf: pdf}
                });
            }
        });
    }
}

/**
 * Add signers to a pdf
 */
router.put('/addsigners/:pdf_id', upload.single('pdf'), addSignersToPdf);
router.post('/addsigners/:pdf_id', upload.single('pdf'), function (req, res, next) {
    if (req.body._method = 'put') {
        addSignersToPdf(req, res, next);
    } else {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    }
});

function addSignersToPdf(req, res, next) {
    thisSession = req.session;
    if (thisSession._id == null) {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_LOGGED));
    } else {
        PdfModel.findById(req.params.pdf_id, function (err, pdf) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
            } else if (pdf == null) {
                res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
            } else if (pdf.owner_id.toString() != thisSession._id) {
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_OWNER));
            } else if (pdf.with_stamp) {
                res.status(HttpStatus.FORBIDDEN).json(getJsonAppError(AppStatus.PDF_WITH_STAMP));
            } else {
                newPdf = {signers: []};
                pdf.signers.forEach(function (signer) {
                    newPdf.signers.push(signer);
                });
                // Inserts signers if they are not duplicated
                req.body.signers.forEach(function (signer) {
                    var found = isSignerThere(pdf.signers, signer._id);
                    var found2 = isSignerThere(req.body.signers, signer._id);
                    if (found == 0 && found2 == 1) {
                        var itemAux = {
                            _id: signer._id,
                            is_signed: false,
                            when: undefined
                        }
                        newPdf.signers.push(itemAux);
                    }
                });
                if (pdf.signers.length >= newPdf.signers.length) {
                    // There is no new correct signers
                    res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
                } else {
                    PdfModel.findByIdAndUpdate(req.params.pdf_id, newPdf, {new: true}, function (err, pdf) {
                        if (err) {
                            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                        } else if (pdf == null) {
                            res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
                        } else {
                            res.json({
                                code: AppStatus.PDF_SIGNER_ADDED,
                                message: AppStatus.getStatusText(AppStatus.PDF_SIGNER_ADDED),
                                data: {pdf: pdf}
                            });
                        }
                    });
                }
            }
        });
    }
}

/**
 * Add a signer to pdf
 */
router.put('/addsigner/:pdf_id', upload.single('pdf'), addSignerToPdf);
router.post('/addsigner/:pdf_id', upload.single('pdf'), function (req, res, next) {
    if (req.body._method == 'put') {
        addSignerToPdf(req, res, next);
    } else {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    }
});

function addSignerToPdf(req, res, next) {
    thisSession = req.session;
    if (thisSession._id == null) {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_LOGGED));
    } else {
        PdfModel.findById(req.params.pdf_id, function (err, pdf) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
            } else if (pdf == null) {
                res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
            } else if (pdf.owner_id.toString() != thisSession._id) {
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_OWNER));
            } else if (pdf.with_stamp) {
                res.status(HttpStatus.FORBIDDEN).json(getJsonAppError(AppStatus.PDF_WITH_STAMP));
            } else {
                var newSigner = {_id: req.body.signer_id, is_signed: false, when: undefined};
                PdfModel.findOneAndUpdate({
                    _id: req.params.pdf_id,
                    'signers._id': {$ne: newSigner._id}
                }, {$push: {signers: newSigner}}, {new: true, safe: false}, function (err, newPdf) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                    } else if (newPdf == null) {
                        res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
                    } else if (newPdf.signers.length == pdf.signers.length) {
                        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
                    } else {
                        res.json({
                            code: AppStatus.PDF_SIGNER_ADDED,
                            message: AppStatus.getStatusText(AppStatus.PDF_SIGNER_ADDED),
                            data: {pdf: newPdf}
                        });
                    }
                });
            }
        });
    }
}

/**
 * checks how many times is the id
 * @param signersArray
 * @param userId
 * @returns {boolean}
 */
function isSignerThere(signersArray, userId) {
    var found = 0;
    for (var i = 0; i < signersArray.length; i++) {
        if (signersArray[i]._id == userId) {
            found++;
        }
    }
    return found;
}

/**
 * This is necesary for HTML forms work fine
 */
router.post('/', upload.single('pdf'), postPdf);

router.post('/:pdf_id', upload.single('pdf'), function (req, res, next) {
    if (req.body._method == 'delete') {
        deletePdf(req, res, next); // Delete pdf
    } else if (req.body._method == 'put') {
        signPdf(req, res, next); // Update pdf
    } else {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    }
});

/**
 * Sign a PDF. You should previusly unlock
 * @param req
 * @param res
 */
function signPdf(req, res) {
    thisSession = req.session;
    //req.checkParms("pdf_id", "Enter a valid pdf_id").isMongoId();
    var err = req.validationErrors();
    if (thisSession._id == null) {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_LOGGED));
    } else if (err) {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    } else {
        PdfModel.findById(req.body.pdf_id, function (err, pdf) {
            var timeDiff = (Date.now() - pdf.is_any_user_signing.when);
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
            } else if (pdf == null) {
                res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
            } else if (pdf.is_any_user_signing == null) {
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.PDF_NOT_LOCKED));
            } else if (pdf.is_any_user_signing._id != thisSession._id) {
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.PDF_LOCKED));
            } else if (timeDiff >= LOCK_TIME) {
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.PDF_TIMEOUT));
            } else {
                var arraySigner = pdf.signers.filter(function (item) {
                    return item._id == thisSession._id;
                });
                var actualSigner = arraySigner[0];
                var index = pdf.signers.indexOf(actualSigner);
                if (arraySigner.length < 1) {
                    res.status(HttpStatus.FORBIDDEN).json(getJsonAppError(AppStatus.PDF_NOT_SIGNER));
                } else if (actualSigner.is_signed) {
                    res.status(HttpStatus.FORBIDDEN).json(getJsonAppError(AppStatus.PDF_SIGNED));
                } else {
                    // Delete old file
                    fs.unlink(pdf.path, function (err) {
                        if (err) {
                            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                        } else {
                            // Update database
                            pdf.path = req.file.path;
                            pdf.file_name = req.file.filename;
                            // pdf.destination = req.file.destination;
                            pdf.encoding = req.file.encoding;
                            // pdf.mime_type = req.file.mimetype;
                            // pdf.signers[index].signer_id = thisSession._id;
                            pdf.is_any_user_signing.success = true;
                            pdf.signers[index].is_signed = true;
                            pdf.signers[index].signature_date = Date.now();
                            PdfModel.findByIdAndUpdate(pdf._id, pdf, {new: true}, function (err, pdf) {
                                if (err) {
                                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                                } else if (pdf == null) {
                                    res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
                                } else {
                                    res.json({
                                        code: AppStatus.PDF_SIGNED,
                                        message: AppStatus.getStatusText(AppStatus.PDF_SIGNED),
                                        data: {pdf: pdf}
                                    });
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
router.put('/:pdf_id', upload.single('pdf'), signPdf);

/**
 * Delete a pdf from database and filesystem
 * @param req
 * @param res
 */
function deletePdf(req, res) {
    thisSession = req.session;
    if (thisSession._id == null) {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_LOGGED));
    } else {
        PdfModel.findById(req.params.pdf_id, function (err, pdf) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
            } else if (pdf == null) {
                res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
            } else if (thisSession._id != pdf.owner_id.toString()) {
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_OWNER));
            } else {
                fs.unlink(pdf.path, function (err, result) {
                    if (err) {
                        res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
                    } else {
                        PdfModel.findByIdAndRemove(req.params.pdf_id, function (err, pdf) {
                            if (err) {
                                res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
                            } else if (pdf == null) {
                                res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
                            } else {
                                UserRoutes.deletePdfOfUsers(pdf);
                                res.json({
                                    'code': AppStatus.PDF_DELETED,
                                    'message': AppStatus.getStatusText(AppStatus.PDF_DELETED)
                                });
                            }
                        });
                    }
                });
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
router.get('/status/:pdf_id', function (req, res, next) {
    PdfModel.findById(req.params.pdf_id, function (err, pdf) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
        } else if (pdf == null) {
            res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
        } else {
            res.send({code: AppStatus.SUCCESS,
                message: AppStatus.getStatusText(AppStatus.SUCCESS),
                data: {pdf: pdf}});
        }
    });
});

module.exports = router;