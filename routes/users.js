var express = require('express');
var router = express.Router();

var User = require('./models/user');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send("TODO ");
});

router.get('/:id', function(req, res, next){
    User.findById(req.params.id, function (err, user) {
        if(err){
            res.send(err);
        }else{
            res.json(user);
        }
    })
});

router.post('/', function(req, res, next){
    var user = new User({
        name: req.body.name,
        email: req.body.email
    });

    user.save(function (err, user) {
        if(err){
            res.send(err);
        }else{
            User.find(function (err, users) {
                if(err){
                    res.send(err);
                }else{
                    res.json(users);
                }
            })
        }
    });
});

router.delete('/', function(req, res, next){
    res.send("TODO Eliminar usuario");
});

router.put('/', function(req, res, next){
    res.send("TODO Editar usuario");
});

module.exports = router;
