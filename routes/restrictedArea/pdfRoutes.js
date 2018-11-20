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
var AppStatus = require('../app-err-codes-en');
var getJsonApp = AppStatus.getJsonApp;
var newPdf;
var LOCK_TIME_MILLIS = 60000; // 60 seg
var UserRoutes = require('./userRoutes.js');

function pdfRoutes(app) {

    router.get('/:pdf_id', app.oauth.authorise(), downloadPdf);
    router.get('/info/:pdf_id', app.oauth.authorise(), getInfoPdf);
    router.put('/addsigners/:pdf_id', upload.single('pdf'), app.oauth.authorise(), addSignersToPdf);
    router.post('/addsigners/:pdf_id', upload.single('pdf'), app.oauth.authorise(), function (req, res) {
        if (req.body._method = 'put') {
            addSignersToPdf(req, res);
        } else {
            res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
        }
    });
    router.put('/addsigner/:pdf_id', upload.single('pdf'), app.oauth.authorise(), addSignerToPdf);
    router.post('/addsigner/:pdf_id', upload.single('pdf'), app.oauth.authorise(), function (req, res, next) {
        if (req.body._method == 'put') {
            addSignerToPdf(req, res, next);
        } else {
            res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
        }
    });
    router.post('/', upload.single('pdf'), app.oauth.authorise(), uploadPdf);
    router.post('/:pdf_id', upload.single('pdf'), app.oauth.authorise(), function (req, res, next) {
        if (req.body._method == 'delete') {
            deletePdf(req, res, next); // Delete pdf
        } else if (req.body._method == 'put') {
            signPdf(req, res, next); // Update pdf
        } else {
            res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
        }
    });
    router.put('/:pdf_id', upload.single('pdf'), app.oauth.authorise(), signPdf);
    router.delete('/:pdf_id', app.oauth.authorise(), deletePdf);
    router.put('/lock/:pdf_id', upload.single('pdf'), app.oauth.authorise(), lockPdf);


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
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                } else if (pdf == null) {
                    // If pdf do not exist on db delete from user
                    UserRoutes.deletePdfFromUser(token.user_id, req.params.pdf_id);
                    res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.PDF_NOT_FOUND));
                } else {
                    if (pdf.owner_id.toString() == token.user_id) {
                        res.download(pdf.path, pdf.original_name);
                        if (res.statusCode.valueOf() == HttpStatus.NOT_FOUND) { // TODO check if works
                            UserRoutes.deletePdfFromUser(token.user_id, req.params.pdf_id);
                        }
                    } else {
                        var isSigner = pdf.signers.some(function (signer) {
                            return signer._id.toString() == token.user_id;
                        });
                        if (isSigner) {
                            res.download(pdf.path, pdf.original_name);
                            if (res.statusCode.valueOf() == HttpStatus.NOT_FOUND) { // TODO check if works
                                UserRoutes.deletePdfFromUser(token.user_id, req.params.pdf_id);
                            }
                        } else {
                            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.USER_NOT_LOGGED));
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
            // If we enabled add singers we can not have stamp
            var withStamp = req.body.with_stamp;
            // TODO add_signers_enabled should not be a string
            if(req.body.add_signers_enabled == "true" || req.body.add_signers_enabled == true){
                withStamp = false;
            }
            newPdf = new PdfModel({
                "original_name": req.file.originalname,
                "mime_type": req.file.mimetype,
                "file_name": req.file.filename,
                "destination": req.file.destination,
                "path": req.file.path,
                "with_stamp": withStamp,
                "add_signers_enabled" : req.body.add_signers_enabled,
                "encoding": req.file.encoding,
                "creation_date": Date.now(),
                "last_edition_date": Date.now(),
                "owner_id": token.user_id
            });

            // Add signers
            var signers = [];
            if (req.body.signers != null && req.body.signers.length > 0) {
                // Creates a array of signers without duplicates
                var uniqueSigners = [];
                var signer;
                // TODO fix this
                uniqueSigners = req.body.signers.filter(function (item, pos) {
                    return (req.body.signers.indexOf(item) == pos);
                });

                for (var i = 0; i < uniqueSigners.length; i++) {
                    if (req.body.signers[i] != '') {
                        signer = {_id: uniqueSigners[i], is_signed: false, signature_date: undefined};
                        signers.push(signer);
                    }
                }
            }

            newPdf.signers = signers;

            newPdf.save(function (err, pdf) {
                if (err) {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
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
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                } else if (pdf == null) {
                    res.status(HttpStatus.NOT_FOUND).json(getJsonApp(AppStatus.PDF_NOT_FOUND));
                } else if (pdf.owner_id.toString() != token.user_id) {
                    res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.USER_NOT_OWNER));
                } else if (pdf.with_stamp) {
                    res.status(HttpStatus.FORBIDDEN).json(getJsonApp(AppStatus.PDF_WITH_STAMP));
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
                        res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
                    } else {
                        PdfModel.findByIdAndUpdate(req.params.pdf_id, newPdf, {new: true}, function (err, pdf) {
                            if (err) {
                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                            } else if (pdf == null) {
                                res.status(HttpStatus.NOT_FOUND).json(getJsonApp(AppStatus.PDF_NOT_FOUND));
                            } else {
                                UserRoutes.addPdfToUsers(pdf);
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

function lockPdf(req, res) {
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.getAccessToken(myToken, function (err, token) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
        } else if (token == null) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.TOKEN_NOT_FOUND));
        } else {
            PdfModel.findOne({
                _id: req.params.pdf_id,
                'signers._id': token.user_id
            }, function (err, pdf) {
                if (err) {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                } else if (pdf == null) {
                    res.status(HttpStatus.NOT_FOUND).json(getJsonApp(AppStatus.PDF_NOT_FOUND));
                } else {
                    var now = Date.now();
                    if (pdf.was_locked == null || pdf.was_locked == false || (now.valueOf() - pdf.when_was_locked.valueOf()) > LOCK_TIME_MILLIS || token.user_id == pdf.was_locked_by) {
                        PdfModel.findByIdAndUpdate(req.params.pdf_id, {
                            was_locked: true,
                            when_was_locked: now,
                            was_locked_by: token.user_id
                        }, {new: true}, function (err, pdf) {
                            if (err) {
                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                            } else if (pdf == null) {
                                res.status(HttpStatus.NOT_FOUND).json(getJsonApp(AppStatus.PDF_NOT_FOUND));
                            } else {
                                res.json({
                                    code: AppStatus.PDF_LOCKED_SUCCESS,
                                    message: AppStatus.getStatusText(AppStatus.PDF_LOCKED_SUCCESS),
                                    data: {pdf: pdf}
                                });
                            }
                        });
                    } else {
                        res.status(HttpStatus.LOCKED).json({
                            code: AppStatus.PDF_LOCKED,
                            message: AppStatus.getStatusText(AppStatus.PDF_LOCKED),
                            data: {pdf: pdf}
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
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                } else if (pdf == null) {
                    res.status(HttpStatus.NOT_FOUND).json(getJsonApp(AppStatus.PDF_NOT_FOUND));
                } else if (pdf.owner_id.toString() != token.user_id) {
                    res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.USER_NOT_OWNER));
                } else if (pdf.with_stamp) {
                    res.status(HttpStatus.FORBIDDEN).json(getJsonApp(AppStatus.PDF_WITH_STAMP));
                } else {
                    var newSigner = {_id: req.body.signer_id, is_signed: false, when: undefined};
                    PdfModel.findOneAndUpdate({
                        _id: req.params.pdf_id,
                        'signers._id': {$ne: newSigner._id}
                    }, {$push: {signers: newSigner}}, {new: true, safe: false}, function (err, newPdf) {
                        if (err) {
                            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                        } else if (newPdf == null) {
                            res.status(HttpStatus.NOT_FOUND).json(getJsonApp(AppStatus.PDF_NOT_FOUND));
                        } else if (newPdf.signers.length == pdf.signers.length) {
                            res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
                        } else {
                            UserRoutes.addPdfToUsers(newPdf);
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
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.USER_NOT_LOGGED));
            } else if (err) {
                res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
            } else {
                var date = new Date(Date.now().valueOf() - LOCK_TIME_MILLIS);
                var pdfToFind = {
                    _id: req.params.pdf_id,
                    encoding: req.file.encoding,
                    last_edition_date: req.body.last_edition_date,
                    signers: {_id: token.user_id, is_signed: false},
                    was_locked: true,
                    when_was_locked: {$gt: date},
                    was_locked_by: token.user_id
                };
                var now = Date.now();
                var pdfToUpdate = {
                    path: req.file.path,
                    file_name: req.file.filename,
                    mime_type: req.file.mime_type,
                    destination: req.file.destination,
                    last_edition_date: now,
                    'signers.$.is_signed': true,
                    'signers.$.signature_date': now,
                    was_locked: false
                };
                PdfModel.findOneAndUpdate(pdfToFind, pdfToUpdate, {new: true}, function (err, pdf) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                    } else if (pdf == null) {
                        res.status(HttpStatus.NOT_FOUND).json(getJsonApp(AppStatus.PDF_NOT_FOUND));
                    } else {
                        // Delete old file
                        fs.unlink(pdf.path, function (err) {
                            if (err) {
                                console.error(err);
                            }
                        });
                        UserRoutes.notifySign(token.user_id, pdf._id);
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
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                } else if (pdf == null) {
                    var pdf = {_id: req.params.pdf_id, owner_id: token.user_id}
                    UserRoutes.deletePdfOfUsers(pdf);
                    res.status(HttpStatus.NOT_FOUND).json(getJsonApp(AppStatus.PDF_NOT_FOUND));
                } else if (token.user_id != pdf.owner_id.toString()) {
                    res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.USER_NOT_OWNER));
                } else {
                    fs.unlink(pdf.path, function (err, result) {
                        if (err) {
                            UserRoutes.deletePdfOfUsers(pdf);
                            res.status(HttpStatus.NOT_FOUND).json(getJsonApp(AppStatus.PDF_NOT_FOUND));
                        } else {
                            PdfModel.findByIdAndRemove(req.params.pdf_id, function (err, pdf) {
                                if (err) {
                                    res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.PDF_NOT_FOUND));
                                } else if (pdf == null) {
                                    res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.PDF_NOT_FOUND));
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
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.getAccessToken(myToken, function (err, token) {
        PdfModel.findById(req.params.pdf_id, function (err, pdf) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
            } else if (pdf == null) {
                var pdf = {_id: req.params.pdf_id, owner_id: token.user_id}
                UserRoutes.deletePdfOfUsers(pdf);
                res.status(HttpStatus.NOT_FOUND).json(getJsonApp(AppStatus.PDF_NOT_FOUND));
            } else {
                res.send({
                    code: AppStatus.SUCCESS,
                    message: AppStatus.getStatusText(AppStatus.SUCCESS),
                    data: {pdf: pdf}
                });
            }
        });
    });

}

module.exports.pdfRoutes = pdfRoutes;