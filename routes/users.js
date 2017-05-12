var express = require('express');
var router = express.Router();
var User = require('./models/user');

/* GET users listing. */
var thisSession;

router.post('/login', function(req, res, next) {
    thisSession = req.session;
    thisUser = {
        "username" : req.body.username,
        "email" : req.body.email
    };
    User.findOne(thisUser, function (err, user) {
        if(err){
            res.send(err);
        }else{
            thisSession._id = user._id;
            res.json(user);
        }
    });
});

router.post('/logout', function(req, res, next){
    req.session.destroy(function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect('/');
        }
    });
});

router.get('/', function (req, res, next) {
    res.send("Welcome to Signu : Users path");
});

router.get('/:id', function(req, res, next){
    thisSession = req.session;
    User.findById(req.params.id, function (err, user) {
        console.log(user._id);
        console.log(thisSession);
        if(user._id == thisSession._id){
            if(err){
                res.send(err);
            }else{
                res.json(user);
            }
        } else{
            res.send("You shall not pass");
        }

    });
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
