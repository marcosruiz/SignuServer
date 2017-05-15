/**
 * Created by Marcos on 11/05/2017.
 */

var express = require('express');
var router = express.Router();
var fs = require('fs');
var Pdf = require('./models/pdf');
const path = require('path');
var multer = require('multer');
var upload = multer({ dest: 'uploads/'});
var HttpStatus = require('http-status-codes');


router.get('/:id', function(req, res, next){
    res.download("uploads/" + req.params.id, "download.pdf");
});

router.post('/', upload.single('pdf'), function(req, res, next){
    console.log(req.file);
    newPdf = new Pdf({
        "original_name" : req.file.originalname,
        "mime_type" : req.file.mimetype,
        "file_name" : req.file.filename,
        "is_full_signed" : false,
        "creation_date" : new Date(),
        "someone_is_signing" : false
    });
    newPdf.save(function(err, pdf){
        if(err){
            res.send("Error");
        }else{
            res.json(pdf);
        }
    });
});

router.put('/', function(req, res, next){
    res.send("TODO Editar pdf y su info");
});

router.delete('/', function(req, res, next){
    res.send("TODO Eliminar pdf y su info");
});

router.get('/status', function(req, res, next){
    res.send("TODO Devolver estado de firma pdf");
});

module.exports = router;