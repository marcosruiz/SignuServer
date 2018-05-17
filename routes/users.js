var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');
var User = require('../public/routes/models/user');
var Pdf = require('../public/routes/models/pdf');
var bcrypt = require('bcrypt');
var HttpStatus = require('http-status-codes');
var AppStatus = require('../public/routes/app-err-codes-en');
var sendStandardError = require('./index').sendStandardError;

/* GET users listing. */
var thisSession;

function getJsonAppError(code) {
    "use strict";
    var res = {
        "code": code,
        "message": AppStatus.getStatusText(code)
    };
    return res;
}

function checkUser(user) {
    "use strict";
    // Update pdfs
    if (user.pdfs_sign != undefined) {
        user.pdfs_sign.forEach(function (pdf_id) {
            Pdf.findById(pdf_id, function (err, pdf) {
                if (err) {
                } else if (pdf == undefined) {
                    // Delete from my pdfs
                    User.findByIdAndUpdate(user._id, {$pull: ({"pdfs_sign": pdf_id})});
                }
            });
        });
    }
    if (user.related_users != undefined) {
        user.related_users.forEach(function (pdf_id) {
            Pdf.findById(pdf_id, function (err, pdf) {
                if (err) {
                } else if (pdf == undefined) {
                    // Delete from my pdfs
                    User.findByIdAndUpdate(user._id, {$pull: ({"related_users": pdf_id})});
                }
            });
        });
    }

    return;
}


/**
 * Create a new user
 */
router.post('/signup', function (req, res, next) {
    if (req.body.email == undefined) {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    } else {
        var randomString = generateRandomString(5);
        thisUser = new User({
            "username": req.body.username,
            "email": req.body.email,
            "name": req.body.name,
            "lastname": req.body.lastname,
            "creation_date": Date.now(),
            "last_edition_date": Date.now(),
            "activated": false,
            "activation_code": randomString
        });
        thisUser.save(function (err, user) {
            if (err) {
                console.log(err);
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
            } else if (user == undefined) {
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
            } else {
                // thisSession._id = user._id; // Uncomment if you want to start a session
                sendEmail(req.body.email, randomString);
                // TODO desactivate user at 24 hours
                user._id = undefined;
                res.json({
                    "code": AppStatus.SUCCESS,
                    "message": "Email was sent to " + req.body.email
                });
            }
        });
    }
});

function generateRandomString(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

function sendEmail(email, randomString) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'sobrenombre@gmail.com',
            pass: 'YecaARe20dEGo'
        }
    });

    var mailOptions = {
        from: 'sobrenombre@gmail.com',
        to: email,
        subject: 'Activate your user in Signu',
        text: 'Here you have your activation code to finish your autentication: ' + randomString + '. Check it in /activateuser',
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

router.post('/authemail', function (req, res, next) {
    if (req.body._method == 'patch') {
        authUser(req, res, next);
    }
});

router.patch('/authemail', function (req, res, next) {
    authUser(req, res, next);
});

function genNewAC(req, res, next) {
    req.body.email;
    var code = generateRandomString(5);
    User.findOneAndUpdate({email: req.body.email}, {activation_code: code}, {new: true}, function (err, user) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR))
        } else if (user == undefined) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_FOUND))
        } else {
            sendEmail(req.body.email, code);
            res.json({"code": AppStatus.SUCCESS, "message": "Email was sent to " + req.body.email});
        }
    })
}

router.patch('/newac', genNewAC)

router.post('/newac')

function authUser(req, res, next) {
    if (req.body.password != req.body.password2) {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.NOT_MATCH_PASS));
    } else {
        User.findOne({email: req.body.email}, function (err, user) {
            user.compareActivationCode(req.body.activationcode, function (err, isMatch) {
                if (err) {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                        "code": AppStatus.INTERNAL_ERROR,
                        "message": "Error comparing activation codes"
                    });
                } else if (isMatch) {
                    User.findByIdAndUpdate(user._id, {
                        activation_code: undefined,
                        activated: true,
                        password: req.body.password
                    }, {new: true}, function (err, user) {
                        if (err) {
                            res.stat(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                        } else if (user == undefined) {
                            res.stat(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
                        } else {
                            user.password = undefined;
                            user._id = undefined;
                            res.json({
                                "code": AppStatus.SUCCESS,
                                "message": "Your email has been authenticated",
                                "user": user
                            });
                        }
                    })
                } else {
                    res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.AC_NOT_MATCH));
                }
            })
        })
    }
}

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
    if (req.body.email == undefined || req.body.password == undefined) {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    } else {
        User.findOne(thisUser, function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
            } else if (user == undefined) {
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
            } else if (!user.activated) {
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_DESACTIVATED))
            } else {
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.INCORRECT_PASS));
                    } else if (isMatch) {
                        thisSession._id = user._id;
                        checkUser(user);
                        user._id = undefined;
                        user.password = undefined;
                        var response = {
                            "code": AppStatus.SUCCESS,
                            "message": "The user has been logged successfully",
                            "user": user,
                            "pdfs_to_sign": [],
                            "pdfs_signed": [],
                            "pdfs_owned": []
                        };
                        Pdf.findById(user.pdfs_to_sign, function (err, pdfs) {
                            if (err) {
                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({});
                            } else {
                                if (pdfs != undefined) {
                                    response.pdfs_to_sign = pdfs;
                                }
                                Pdf.findById(user.pdfs_signed, function (err, pdfs) {
                                    if (err) {
                                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({});
                                    } else {
                                        if (pdfs != undefined) {
                                            response.pdfs_signed = pdfs;
                                        }
                                        Pdf.findById(user.pdfs_owned, function (err, pdfs) {
                                            if (err) {
                                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({});
                                            } else {
                                                if (pdfs != undefined) {
                                                    response.pdfs_owned = pdfs;
                                                }
                                                res.json(response);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    } else {
                        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.INCORRECT_PASS));
                    }
                });
            }
        });
    }
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
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.INTERNAL_ERROR));
            } else {
                res.json({
                    "code": AppStatus.SUCCESS,
                    "message": "Logged out correctly"
                });
            }
        });
    } else {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.NOT_LOGGED));
    }
});

/**
 * Return info of the user in session
 */
router.get('/info', function (req, res, next) {
    thisSession = req.session;
    if (thisSession._id == undefined) {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.NOT_LOGGED));
    } else {
        User.findById(thisSession._id, function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.INTERNAL_ERROR));
            } else {
                if (user != undefined) {
                    user._id = undefined;
                    user.password = undefined;
                    res.json({
                        "code": AppStatus.SUCCESS,
                        "message": AppStatus.getStatusText(AppStatus.SUCCESS),
                        "user": user
                    });
                } else {
                    res.status(HttpStatus.UNAUTHORIZED).json({
                        "code": AppStatus.USER_NOT_FOUND,
                        "message": AppStatus.getStatusText(AppStatus.USER_NOT_FOUND)
                    });
                }

            }
        });
    }
});


var desactivateUser = function (req, res, next) {
    thisSession = req.session;
    if (thisSession._id != undefined) {
        User.findById(thisSession._id, function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            } else {
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                    } else if (!isMatch) {
                        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.INCORRECT_PASS));
                    } else {
                        User.findByIdAndUpdate(thisSession._id, {activated: false}, {new: true}, function (err) {
                            if (err) {
                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                            } else {
                                res.json({"code": AppStatus.SUCCESS, "message": "User desactivated"});
                            }
                        });
                    }
                });
            }
        });
    } else {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.NOT_LOGGED));
    }

};

/**
 * Delete the current user if the password is correct
 */
router.patch('/desactivate', desactivateUser);

router.post('/desactivate', function (req, res, next) {
    if (req.body._method == 'patch') {
        desactivateUser(req, res, next);
    }
});

/**
 * Edit user
 * @param req
 * @param res
 * @param next
 */
var editUser = function (req, res, next) {
    thisSession = req.session;
    if (thisSession._id != undefined) {
        User.findById(thisSession._id, function (err, user) {
            if (err) {
                res.status(HttpStatus.FORBIDDEN).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
            } else {
                if (user != null) {
                    if (req.body.name != null && req.body.name != '') {
                        user.name = req.body.name;
                    }
                    if (req.body.lastname != null && req.body.lastname != '') {
                        user.lastname = req.body.lastname;
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
                            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.INTERNAL_ERROR));
                        } else {
                            User.findById(thisSession._id, function (err, user) {
                                if (err) {
                                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.INTERNAL_ERROR));
                                    ;
                                } else {
                                    user.password = undefined;
                                    user._id = undefined;
                                    res.json({
                                        "code": AppStatus.USER_UPDATED,
                                        "message": AppStatus.getStatusText(AppStatus.USER_UPDATED),
                                        "user": user
                                    });
                                }
                            });
                        }
                    })
                } else {
                    res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.NOT_LOGGED));
                }
            }
        });
    } else {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.NOT_LOGGED));
    }
}

/**
 * Edit the current user
 */
router.patch('/', editUser);


/**
 * This is necesary for HTML forms work fine
 */
router.post('/', function (req, res, next) {
    if (req.body._method == 'patch') {
        editUser(req, res, next);
    } else {
        res.status(HttpStatus.BAD_REQUEST);
    }
});


module.exports = router;
