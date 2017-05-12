var express = require('express');
var router = express.Router();
var User = require('./models/user');

/* GET users listing. */
var thisSession;

router.post('/signup', function (req, res, next) {
    thisSession = req.session;
    thisUser = new User({
        "username" : req.body.username,
        "password" : req.body.password,
        "email" : req.body.email,
        "name" : req.body.name,
        "lastname" : req.body.lastname,
        "creation_date" : Date.now(),
        "last_edition_date" : Date.now()
    });
    thisUser.save(function (err, user) {
        if(err){
            res.send(err);
        }else{
            res.send("You signed up correctly");
        }
    });
})

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

router.get('/', function(req, res, next){
    thisSession = req.session;
    if(thisSession._id == null){
        res.send("You are not logged");
    } else{
        User.findById(thisSession._id, function (err, user) {
            if(err){
                res.send(err);
            }else{
                res.json(user);
            }
        });
    }
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
