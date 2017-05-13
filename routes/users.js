var express = require('express');
var router = express.Router();
var User = require('./models/user');
var bcrypt = require('bcrypt');

/* GET users listing. */
var thisSession;

/**
 * Create a new user
 */
router.post('/signup', function (req, res, next) {
    // thisSession = req.session; // Uncomment if you want to start a session
    if(req.body.password == req.body.password2){
        thisUser = new User({
            "username" : req.body.username,
            "password" : req.body.password,
            "email" : req.body.email,
            "name" : req.body.name,
            "lastname" : req.body.lastname,
            "creation_date" : Date.now(),
            "last_edition_date" : Date.now()
        })

        thisUser.save(function (err, user) {
            if(err){
                res.send(err);
            }else{
                // thisSession._id = user._id; // Uncomment if you want to start a session
                user._id = undefined;
                user.password = undefined;
                res.json(user);
            }
        });
    } else{
        res.send("Passwords don't match");
    }
})

/**
 * Log in:
 * it starts a new session
 * it returns info of user if password is correct
 */
router.post('/login', function(req, res, next) {
    thisSession = req.session;
    thisUser = {
        "email" : req.body.email
    };
    User.findOne(thisUser, function (err, user) {
        if(err){
            res.send("This email don't exist");
        }else{
            user.comparePassword(req.body.password, function(err, isMatch){
                if(err){
                    res.send("The password is incorrect");
                } else{
                    thisSession._id = user._id;
                    user._id = undefined;
                    user.password = undefined;
                    res.json(user);
                }
            });
        }
    });
});

/**
 * Log out: Close the current session
 */
router.post('/logout', function(req, res, next){
    req.session.destroy(function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect('/');
        }
    });
});

/**
 * Return info of the user in session
 */
router.get('/info', function(req, res, next){
    thisSession = req.session;
    if(thisSession._id == null || thisSession._id==''){
        res.send("You are not logged");
    } else{
        User.findById(thisSession._id, function (err, user) {
            if(err){
                res.send(err);
            }else{
                user._id = undefined;
                user.password = undefined;
                res.json(user);
            }
        });
    }
});


var deleteUser = function(req, res, next){
    thisSession = req.session;
    User.findById(thisSession._id, function (err, user) {
        if(err){
            res.send(err);
        } else{
            user.comparePassword(req.body.password, function(err, isMatch){
                if(err){
                    res.send("The password is incorrect");
                } else{
                    User.findByIdAndRemove(thisSession._id, function (err) {
                        if(err){
                            res.send(err);
                        } else{
                            res.send("Deleted user");
                        }
                    });
                }
            });
        }
    });
};

/**
 * Delete the current user if the password is correct
 */
router.delete('/', deleteUser);

var putUser = function(req, res, next){
    console.log("Editing a user");
    thisSession = req.session;
    User.findById(thisSession._id, function (err, user) {
        if(err){
            res.send("You are not logged");
        } else{
            if(req.body.name != null && req.body.name != ''){
                user.name = req.body.name;
            }
            if(req.body.lastname != null && req.body.lastname != ''){
                user.lastname = req.body.lastname;
            }
            if(req.body.email != null && req.body.email != ''){
                user.email = req.body.email;
            }
            if(req.body.password != null && req.body.password != '' && req.body.password == req.body.password2){
                user.password = req.body.password;
            }
            if(req.body.username != null && req.body.username != ''){
                user.username = req.body.username;
            }
            user.last_edition_date = Date.now();

            User.updateOne({_id : thisSession._id}, user, {}, function (err, num) {
                if(err){
                    res.send("Something was wrong");
                } else{
                    res.send(num);
                }
            })
        }
    });
}

/**
 * Edit the current user
 */
router.put('/', putUser);

/**
 * This is need to HTML form works fine
 */
router.post('/', function (req, res, next) {
    if(req.body._method == 'delete'){
        deleteUser(req, res, next);
    } else if(req.body._method == 'put'){
        putUser(req, res, next);
    } else {
        res.send("Something was wrong");
    }
});

module.exports = router;
