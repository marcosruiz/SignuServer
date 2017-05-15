/**
 * Created by Marcos on 11/05/2017.
 */

var express = require('express');
var router = express.Router();
var fs = require('fs');
const formidable = require('formidable');
const path = require('path')

router.get('/', function(req, res, next){
    res.send("TODO Devolver pdf");
});

// var updateFile = function(req, res, next){
//     var fstream;
//     req.pipe(req.busboy);
//     req.busboy.on('file', function (fieldname, file, filename) {
//         console.log("Uploading: " + filename);
//         fstream = fs.createWriteStream(__dirname + '/files/' + filename);
//         file.pipe(fstream);
//         fstream.on('end', function () {
//             res.send('ok');
//         });
//     });
// };

function uploadMedia (req, res, next) { // router.post(url, function(req,res,next){
    var fileName = 'prueba';
    var fileExt = 'pdf';

    var form = new formidable.IncomingForm()
    form.multiples = true
    form.keepExtensions = true
    form.uploadDir = uploadDir
    form.parse(req, function (err, fields, files){
        if (err){
            res.send(err);
        } else{
            res.json({ uploaded: true })
        }
    });
    form.on('fileBegin', function (name, file) {
        file.path = __dirname + '/' + name;
    })
}

router.post('/', function(req, res, next){
    uploadMedia(req, res, next);
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