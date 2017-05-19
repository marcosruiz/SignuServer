/**
 * Created by Marcos on 11/05/2017.
 */
"use strict";
var express = require('express');
var router = express.Router();
var fs = require('fs');
var Pdf = require('./models/pdf');
const path = require('path');
var multer = require('multer');
var upload = multer({dest: 'uploads/'});
var HttpStatus = require('http-status-codes');
var sendStandardError = require('./index').sendStandardError;
var thisSession;
var newPdf;

router.get('/:id', function (req, res, next) {
    Pdf.findById(req.params.id, function (err, pdf) {
        if (err) {
            sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
            res.download(pdf.path, pdf.original_name);
        }
    });
});

router.post('/unlock', function(req, res, next){
    if (req.body._method == 'put') {
        unlockPdf(req, res);
    }
});

function unlockPdf(req, res) {
//TODO delete id_pdf from user collection
    //TODO unlock pdf in 10 min
    thisSession = req.session;
    if (thisSession._id == undefined) {
        sendStandardError(res, HttpStatus.UNAUTHORIZED);
    } else {
        var newPdf = {
            "someone_is_signing": true,
            "user_id_signing": thisSession._id
        };
        console.log(req.body.pdf_id);
        Pdf.findOneAndUpdate({
            "_id": req.body.pdf_id,
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
router.put('/unlock', function (req, res, next) {
    unlockPdf(req, res);
});

function lockPdf(pdf_id) {
    console.log("No one is signing now");
    newPdf = {"someone_is_signing": false};
    Pdf.findByIdAndUpdate(pdf_id, newPdf, {new: true});
}

/**
 * Upload a new PDF
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
            "signers" : []
        });
        console.log(req.body);

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

function addSignersToPdf(req, res, next){
    thisSession = req.session;
    if (thisSession._id == undefined) {
        sendStandardError(res, HttpStatus.UNAUTHORIZED);
    } else {
        Pdf.findById(req.params.pdf_id, function(err, pdf){
            if(err){
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            }else if(pdf.owner_id != thisSession._id){
                sendStandardError(res, HttpStatus.FORBIDDEN);
            }else{
                newPdf = {
                    "total_signatures" : 0,
                    "signers" : []
                };
                req.body.signers.forEach(function (id) {
                    var item= {
                        "user_id" : id,
                        "is_signed" : false
                    }
                    newPdf.total_signatures = newPdf.total_signatures + 1;
                    newPdf.signers.push(item);
                });
                Pdf.findByIdAndUpdate(req.params.pdf_id, newPdf, {new : true}, function(err, pdf){
                    if(err){
                        console.log(err);
                        sendStandardError(res, HttpStatus.NOT_FOUND);
                    }else{
                        res.json(pdf);
                    }
                });
            }
        });
    }
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

function putPdf(req, res) {
    thisSession = req.session;
    req.checkBody("pdf_id", "Enter a valid pdf_id").isMongoId();
    var err = req.validationErrors();
    if (thisSession._id == undefined) {
        sendStandardError(res, HttpStatus.UNAUTHORIZED);
    } else if (err) {
        sendStandardError(res, HttpStatus.BAD_REQUEST);
    } else {
        Pdf.findById(req.body.pdf_id, function (err, pdf) {
            if (err) {
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            } else if (pdf == null) {
                sendStandardError(res, HttpStatus.NOT_FOUND);
            } else if (!pdf.someone_is_signing) {
                sendStandardError(res, HttpStatus.LOCKED);
            } else if (pdf.someone_is_signing && pdf.user_id_signing != thisSession._id) {
                sendStandardError(res, HttpStatus.LOCKED);
            } else if (pdf.total_signatues == pdf.current_signatures) {
                sendStandardError(res, HttpStatus.FORBIDDEN);
            } else {
                var index = pdf.signers.indexOf(thisSession._id);
                if (index < 0) {
                    sendStandardError(res, HttpStatus.FORBIDDEN);
                } else if (pdf.signers[index].is_signed) {
                    sendStandardError(res, HttpStatus.FORBIDDEN);
                } else {
                    // Delete old file
                    fs.unlink(pdf.path, function (err) {
                        if (err) {
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
                            pdf.signers[index].signer_id = thisSession._id;
                            pdf.signers[index].is_signed = true;
                            pdf.signers[index].signature_date = Date.now();
                            Pdf.findByIdAndUpdate(pdf._id, pdf, {new: true}, function (err, pdf) {
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
router.put('/', upload.single('pdf'), function (req, res, next) {
    putPdf(req, res);
});

function deletePdf(req, res) {
    thisSession = req.session;
    if (thisSession._id == undefined) {
        sendStandardError(res, HttpStatus.UNAUTHORIZED);
    } else {
        Pdf.findById(req.body.pdf_id, function (err, pdf) {
            if (err) {
                res.send("No pdf found")
            } else {
                if (thisSession._id == pdf.owner_id) {
                    fs.unlink(pdf.path, function (err, result) {
                        if (err) {
                            res.send("It could not be deleted")
                        } else {
                            Pdf.findByIdAndRemove(req.body.pdf_id, function (err, result) {
                                if (err) {
                                    res.send("It couldnt be deleted in database");
                                } else {
                                    res.send("Deleted");
                                    // TODO hay que eliminar este pdf de todos los usuarios
                                }
                            });
                        }
                    });
                } else {
                    res.send("You are not the owner");
                }
            }
        });
    }
}
router.delete('/', function (req, res, next) {
    deletePdf(req, res);
});

router.get('/status/:id', function (req, res, next) {
    Pdf.findById(req.params.id, function (err, pdf) {
        if (err) {
            sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
            res.send(pdf);
        }
    });
});

module.exports = router;