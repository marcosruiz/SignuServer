var express = require('express');
var router = express.Router();
var User = require('./models/user');
var bcrypt = require('bcrypt');
var HttpStatus = require('http-status-codes');
var sendStandardError = require('./index').sendStandardError;

/* GET users listing. */
var thisSession;


/**
 * Create a new user
 */
router.post('/signup', function (req, res, next) {
    // thisSession = req.session; // Uncomment if you want to start a session
    if (req.body.password == req.body.password2) {
        thisUser = new User({
            "username": req.body.username,
            "password": req.body.password,
            "email": req.body.email,
            "name": req.body.name,
            "lastname": req.body.lastname,
            "creation_date": Date.now(),
            "last_edition_date": Date.now()
        });

        thisUser.save(function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    "error": {
                        "code": HttpStatus.INTERNAL_SERVER_ERROR,
                        "message": err.message
                    }
                });
            } else {
                // thisSession._id = user._id; // Uncomment if you want to start a session
                user._id = undefined;
                user.password = undefined;
                res.json(user);
            }
        });
    } else {
        res.status(HttpStatus.UNAUTHORIZED).json({
            "error": {
                "code": HttpStatus.UNAUTHORIZED,
                "message": "Passwords do not match"
            }
        });
    }
})

/**
 * Log in:
 * it starts a new session
 * it returns info of user if password is correct
 */
router.post('/login', function (req, res, next) {
    thisSession = req.session;
    thisUser = {
        "email": req.body.email
    };
    User.findOne(thisUser, function (err, user) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                "error": {
                    "code": HttpStatus.INTERNAL_SERVER_ERROR,
                    "message": "Error to connect to database"
                }
            });
        } else {
            if (user != null) {
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                            "error": {
                                "code": HttpStatus.INTERNAL_SERVER_ERROR,
                                "message": "Error to compare passwords"
                            }
                        });
                    } else {
                        if (isMatch) {
                            thisSession._id = user._id;
                            user._id = undefined;
                            user.password = undefined;
                            res.json(user);
                        } else {
                            res.status(HttpStatus.UNAUTHORIZED).json({
                                "error": {
                                    "code": HttpStatus.UNAUTHORIZED,
                                    "message": "Incorrect password"
                                }
                            });
                        }
                    }
                });
            } else {
                res.status(HttpStatus.NOT_FOUND).json({
                    "error": {
                        "code": HttpStatus.NOT_FOUND,
                        "message": "User not found"
                    }
                });
            }

        }
    });
});

/**
 * Log out: Close the current session
 */
router.post('/logout', function (req, res, next) {
    var thisSession = req.session;
    console.log(thisSession);
    if (thisSession._id != undefined) {
        thisSession.destroy(function (err) {
            if (err) {
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            } else {
                res.json({"message": "Logged out correctly"});
            }
        });
    } else {
        sendStandardError(res, HttpStatus.FORBIDDEN);
    }

});

/**
 * Return info of the user in session
 */
router.get('/info', function (req, res, next) {
    thisSession = req.session;
    if (thisSession._id == undefined) {
        sendStandardError(res, HttpStatus.FORBIDDEN);
    } else {
        User.findById(thisSession._id, function (err, user) {
            if (err) {
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            } else {
                if (user != null) {
                    user._id = undefined;
                    user.password = undefined;
                    res.json(user);
                } else {
                    sendStandardError(res, HttpStatus.NOT_FOUND);
                }

            }
        });
    }
});


var deleteUser = function (req, res, next) {
    thisSession = req.session;
    if (thisSession._id != undefined) {
        User.findById(thisSession._id, function (err, user) {
            if (err) {
                sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
            } else {
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (err) {
                        sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
                    } else {
                        if (isMatch) {
                            User.findByIdAndRemove(thisSession._id, function (err) {
                                if (err) {
                                    sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
                                } else {
                                    res.json({"message": "User deleted"});
                                }
                            });
                        } else {
                            res.status(HttpStatus.UNAUTHORIZED).json({
                                "error": {
                                    "code": HttpStatus.UNAUTHORIZED,
                                    "message": "The password is incorrect"
                                }
                            });
                        }

                    }
                });
            }
        });
    } else {
        sendStandardError(res, HttpStatus.FORBIDDEN);
    }

};

/**
 * Delete the current user if the password is correct
 */
router.delete('/', deleteUser);

var putUser = function (req, res, next) {
    thisSession = req.session;
    if (thisSession._id != undefined) {
        User.findById(thisSession._id, function (err, user) {
            if (err) {
                sendStandardError(res, HttpStatus.FORBIDDEN);
            } else {
                if (user != null) {
                    if (req.body.name != null && req.body.name != '') {
                        user.name = req.body.name;
                    }
                    if (req.body.lastname != null && req.body.lastname != '') {
                        user.lastname = req.body.lastname;
                    }
                    if (req.body.email != null && req.body.email != '') {
                        user.email = req.body.email;
                    }
                    if (req.body.password != null && req.body.password != '' && req.body.password == req.body.password2) {
                        user.password = req.body.password;
                    }
                    if (req.body.username != null && req.body.username != '') {
                        user.username = req.body.username;
                    }
                    user.last_edition_date = Date.now();

                    User.updateOne({_id: thisSession._id}, user, {}, function (err, num) {
                        if (err) {
                            sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
                        } else {
                            User.findById(thisSession._id, function (err, user) {
                                if (err) {
                                    sendStandardError(res, HttpStatus.INTERNAL_SERVER_ERROR);
                                } else {
                                    user.password = undefined;
                                    user._id = undefined;
                                    res.json(user);
                                }
                            });
                        }
                    })
                } else {
                    sendStandardError(res, HttpStatus.NOT_FOUND);
                }

            }
        });
    } else {
        sendStandardError(res, HttpStatus.FORBIDDEN);
    }

}

/**
 * Edit the current user
 */
router.put('/', putUser);

/**
 * This is necesary for HTML forms work fine
 */
router.post('/', function (req, res, next) {
    if (req.body._method == 'delete') {
        deleteUser(req, res, next);
    } else if (req.body._method == 'put') {
        putUser(req, res, next);
    } else {
        sendStandardError(res, HttpStatus.BAD_REQUEST);
    }
});

router.signPdf = function (user_id, pdf_id, callback) {
    User.findByIdAndUpdate(user_id, {
        $pull: {"pdfs_to_sign": {"pdf_id": pdf_id}},
        $push: {"pdfs_signed": {"pdf_id": pdf_id}}
    }, {safe: true, new: true}, callback);
};



module.exports = router;
