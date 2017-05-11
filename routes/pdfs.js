/**
 * Created by Marcos on 11/05/2017.
 */

var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next){
    res.send("TODO Devolver info usuario");
});

router.post('/', function(req, res, next){
    res.send("TODO Subir pdf y su info");
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