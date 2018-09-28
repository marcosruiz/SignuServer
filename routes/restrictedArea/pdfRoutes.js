/**
 * Created by Marcos on 11/05/2017.
 */
"use strict";
var express = require('express');
var router = express.Router();
var fs = require('fs');
var PdfModel = require('../models/pdf');
var UserModel = require('../models/user');
var AccessTokenModel = require('../authorisation/accessTokenModel');
const path = require('path');
var multer = require('multer');
var config = require('config');
var upload = multer({dest: config.uploads_dir});
var HttpStatus = require('http-status-codes');
var AppStatus = require('../../public/routes/app-err-codes-en');
var getJsonAppError = AppStatus.getJsonApp;
var newPdf;
var LOCK_TIME = 60000; // 60 seg
var UserRoutes = require('./userRoutes.js');

function pdfRoutes(app) {

    router.get('/:pdf_id', app.oauth.authorise(), downloadPdf);
    router.get('/status/:pdf_id', app.oauth.authorise(), getInfoPdf);
    router.put('/addsigners/:pdf_id', upload.single('pdf'), app.oauth.authorise(), addSignersToPdf);
    router.post('/addsigners/:pdf_id', upload.single('pdf'), app.oauth.authorise(), function (req, res) {
        if (req.body._method = 'put') {
            addSignersToPdf(req, res);
        } else {
            res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
        }
    });
    router.put('/addsigner/:pdf_id', upload.single('pdf'), app.oauth.authorise(), addSignerToPdf);
    router.post('/addsigner/:pdf_id', upload.single('pdf'), app.oauth.authorise(), function (req, res, next) {
        if (req.body._method == 'put') {
            addSignerToPdf(req, res, next);
        } else {
            res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
        }
    });
    router.post('/', upload.single('pdf'), app.oauth.authorise(), uploadPdf);
    router.post('/:pdf_id', upload.single('pdf'), app.oauth.authorise(), function (req, res, next) {
        if (req.body._method == 'delete') {
            deletePdf(req, res, next); // Delete pdf
        } else if (req.body._method == 'put') {
            signPdf(req, res, next); // Update pdf
        } else {
            res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
        }
    });
    router.put('/:pdf_id', upload.single('pdf'), app.oauth.authorise(), signPdf);
    router.delete('/:pdf_id', app.oauth.authorise(), deletePdf);

    return router;
}

/**
 * Download a pdf
 * @param {Object} req - req.params.pdf_id
 * @param {Object} res -
 */
function downloadPdf(req, res) {
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.getAccessToken(myToken, function (err, token) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
        } else if (token == null) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.TOKEN_NOT_FOUND));
        } else {
            PdfModel.findById(req.params.pdf_id, function (err, pdf) {
                if (err) {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                } else if (pdf == null) {
                    res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
                } else {
                    if (pdf.owner_id.toString() == token.user_id) {
                        res.download(pdf.path, pdf.original_name);
                    } else {
                        var isSigner = pdf.signers.some(function (signer) {
                            return signer._id.toString() == token.user_id;
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
}


/**
 * Upload a new PDF with pending signatures
 * @param {Object} req - req.body : {signers}
 * @param {Object} res - 200 if everything OK
 */
function uploadPdf(req, res) {
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.getAccessToken(myToken, function (err, token) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
        } else if (token == null) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.TOKEN_NOT_FOUND));
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
                "last_edition_date": Date.now(),
                "owner_id": token.user_id
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
    });
}

/**
 * Add signers to pdf
 * @param {Object} req - req.params.pdf_id req.body.signers
 * @param {Object} res - 200 if everything OK
 */
function addSignersToPdf(req, res) {
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.getAccessToken(myToken, function (err, token) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
        } else if (token == null) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.TOKEN_NOT_FOUND));
        } else {
            PdfModel.findById(req.params.pdf_id, function (err, pdf) {
                if (err) {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                } else if (pdf == null) {
                    res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
                } else if (pdf.owner_id.toString() != token.user_id) {
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
    });
}

/**
 * Add a signer to pdf
 * @param {Object} req - req.params.pdf_id req.body : {signer_id}
 * @param {Object} res - 200 if signer is added to pdf
 */
function addSignerToPdf(req, res) {
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.getAccessToken(myToken, function (err, token) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
        } else if (token == null) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.TOKEN_NOT_FOUND));
        } else {
            PdfModel.findById(req.params.pdf_id, function (err, pdf) {
                if (err) {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                } else if (pdf == null) {
                    res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
                } else if (pdf.owner_id.toString() != token.user_id) {
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
    });
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
 * Sign a PDF
 * @param {Object} req - req.body : {pdf_id, last_edition_date}
 * @param {Object} res - 200 if everything OK
 */
function signPdf(req, res) {
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.getAccessToken(myToken, function (err, token) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
        } else if (token == null) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.TOKEN_NOT_FOUND));
        } else {
            if (token.user_id == null) {
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_LOGGED));
            } else if (err) {
                res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
            } else {
                var pdfToFind = {
                    _id: req.body.pdf_id,
                    encoding: req.file.encoding,
                    last_edition_date: req.body.last_edition_date,
                    signers: {_id: token.user_id, is_signed: false}
                };
                var now = Date.now();
                var pdfToUpdate = {
                    path: req.file.path,
                    filename: req.file.filename,
                    mime_type: req.file.mime_type,
                    last_edition_date: now,
                    'signers.$.is_signed': true,
                    'signers.$.signature_date': now
                };
                PdfModel.findOneAndUpdate(pdfToFind, pdfToUpdate, {new: true}, function (err, pdf) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                    } else if (pdf == null) {
                        res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
                    } else {
                        // Delete old file
                        fs.unlink(pdf.path, function (err) {
                            if (err) {
                                console.error(err);
                            }
                        });
                        res.json({
                            code: AppStatus.PDF_SIGNED,
                            message: AppStatus.getStatusText(AppStatus.PDF_SIGNED),
                            data: {pdf: pdf}
                        });
                    }
                });
            }
        }
    });
}

/**
 * Delete a pdf from database and filesystem
 * @param {Object} req - req.params.pdf_id
 * @param {Object} res - 200 if pdf is deleted from filesystem and database
 */
function deletePdf(req, res) {
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.getAccessToken(myToken, function (err, token) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
        } else if (token == null) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.TOKEN_NOT_FOUND));
        } else {
            PdfModel.findById(req.params.pdf_id, function (err, pdf) {
                if (err) {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                } else if (pdf == null) {
                    res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
                } else if (token.user_id != pdf.owner_id.toString()) {
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
    });
}

/**
 * Get info of pdf
 * @param {Object} req - req.params.pdf_id
 * @param {Object} res - 200 if everything OK
 */
function getInfoPdf(req, res) {
    PdfModel.findById(req.params.pdf_id, function (err, pdf) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
        } else if (pdf == null) {
            res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.PDF_NOT_FOUND));
        } else {
            res.send({
                code: AppStatus.SUCCESS,
                message: AppStatus.getStatusText(AppStatus.SUCCESS),
                data: {pdf: pdf}
            });
        }
    });
}

module.exports.pdfRoutes = pdfRoutes;