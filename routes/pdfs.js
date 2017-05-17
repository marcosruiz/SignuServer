/**
 * Created by Marcos on 11/05/2017.
 */

var express = require('express');
var router = express.Router();
var fs = require('fs');
var Pdf = require('./models/pdf');
const path = require('path');
var multer = require('multer');
var upload = multer({dest: 'uploads/'});
var HttpStatus = require('http-status-codes');
//var CheckPreconditions = require("check-preconditions");
//var check = CheckPreconditions.check;


router.get('/:id', function (req, res, next) {
    Pdf.findById(req.params.id, function (err, pdf) {
        if (err) {
            sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
            res.download("uploads/" + req.params.id, pdf.original_name);
        }
    });
});


router.post('/', upload.single('pdf'), function (req, res, next) {
    thisSession = req.session;
    newPdf = new Pdf({
        "original_name": req.file.originalname,
        "mime_type": req.file.mimetype,
        "file_name": req.file.filename,
        "destination": req.file.destination,
        "path": req.file.path,
        "encoding": req.file.encoding,
        "is_full_signed": false,
        "creation_date": new Date(),
        "someone_is_signing": false,
        "owner_id": thisSession._id
    });
    newPdf.save(function (err, pdf) {
        if (err) {
            res.send("Error");
        } else {
            res.json(pdf);
        }
    });
});

router.put('/', function (req, res, next) {
    // req.assert("session._id", "You are not logged").isMongoId();
    var thisSession = req.session;
    if(thisSession == null || thisSession == undefined || thisSession._id == undefined){
        sendStandardError(res, HttpStatus.UNAUTHORIZED);
        return;
    }
    // req.checkBody("email", "Enter a valid email address").optional().isEmail();
    // req.checkBody("pdf_id", "Enter a valid pdf_id").isMongoId();
    //
    // var errors = req.validationErrors();
    // if (errors) {
    //     res.status(HttpStatus.BAD_REQUEST).json({"error": {"code": HttpStatus.BAD_REQUEST, "messages": errors}});
    //     return;
    // }
    //res.status(200).send("ok");
});

router.delete('/', function (req, res, next) {
    thisSession = req.session;
    check(thisSession._id).is.not.an.undefined();
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
                        })
                    }
                })
            } else {
                res.send("You are not the owner");
            }
        }
    });
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