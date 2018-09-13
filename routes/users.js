"use strict";

var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');
var User = require('../public/routes/models/user');
var Pdf = require('../public/routes/models/pdf');
var bcrypt = require('bcrypt');
var HttpStatus = require('http-status-codes');
var AppStatus = require('../public/routes/app-err-codes-en');
var sendStandardError = require('./index').sendStandardError;
var GAP_TIME_TO_EMAIL = 1800000;

/* GET users listing. */
var thisSession;

/**
 * Return a json with code and message code of app-err-codes.js
 * @param code
 * @returns {{code: *, message: *}}
 */
function getJsonAppError(code) {
    var res = {
        "code": code,
        "message": AppStatus.getStatusText(code)
    };
    return res;
}

/**
 * Delete references to eliminated PDFs
 * @param user
 */
function checkUser(user) {
    // Update pdfs
    if (user.pdfs_to_sign != undefined) {
        user.pdfs_to_sign.forEach(function (pdf_id) {
            Pdf.findById(pdf_id, function (err, pdf) {
                if (err) {
                } else if (pdf == undefined) {
                    // Delete from my pdfs
                    User.findByIdAndUpdate(user._id, {$pull: ({"pdfs_to_sign": pdf_id})});
                }
            });
        });
    }
    // Update related users
    if (user.users_related != undefined) {
        user.users_related.forEach(function (pdf_id) {
            Pdf.findById(pdf_id, function (err, pdf) {
                if (err) {
                } else if (pdf == null) {
                    // Delete from my pdfs
                    User.findByIdAndUpdate(user._id, {$pull: ({"users_related": pdf_id})});
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
    if (req.body.email == null || req.body.email == '') {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    } else if (req.body.password == null || req.body.password == '') {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    } else {
        var randomString = generateRandomString(5);
        var thisUser;
        thisUser = new User({
            "email": req.body.email,
            "name": req.body.name,
            "lastname": req.body.lastname,
            "creation_date": Date.now(),
            "last_edition_date": Date.now(),
            "activation.is_activated": false,
            "activation.when": Date.now(),
            "activation.code": randomString,
            "password": req.body.password
        });
        User.findOne({email: thisUser.email}, function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
            } else if (user == null) {
                // User did not exist
                thisUser.save(function (err, user) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                    } else if (user == null) {
                        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
                    } else {

                        sendEmail(user, randomString, function (err, info) {
                            if (err) {
                                res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.EMAIL_ERROR));
                            } else {
                                user.password = undefined;
                                user.activation.code = undefined;
                                var data = {user: user};
                                if (process.env.NODE_ENV == 'test') {
                                    data.ac_code_raw = randomString
                                }
                                res.json({
                                    "code": AppStatus.SUCCESS,
                                    "message": "Email was sent to " + req.body.email,
                                    "data": data
                                });
                            }
                        });

                    }
                });
            } else if (!user.activation.is_activated) {
                // User is not activated
                User.findByIdAndRemove(user._id, function (err, user) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                    } else {
                        thisUser.save(function (err, user) {
                            if (err) {
                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                            } else if (user == null) {
                                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
                            } else {
                                sendEmail(user, randomString, function (err, info) {
                                    if (err) {
                                        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.EMAIL_ERROR));
                                    } else {
                                        user.password = undefined;
                                        user.activation.code = undefined;
                                        var data = {user : user};
                                        if (process.env.NODE_ENV == 'test') {
                                            data.ac_code_raw = randomString
                                        }
                                        res.json({
                                            "code": AppStatus.SUCCESS,
                                            "message": "Email was sent to " + req.body.email,
                                            "data": data
                                        });
                                    }
                                });
                            }
                        });

                    }
                });
            } else {
                // User exists
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_ALREADY_EXISTS));
            }
        });

    }
});

/**
 * Put activation.is_activated to true if activation.code match
 */
router.patch('/authemail', authEmail);
router.post('/authemail', function (req, res, next) {
    if (req.body._method == 'patch') {
        authEmail(req, res, next);
    } else {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    }
});

function authEmail(req, res, next) {
    //This check also should be in the front-end
    if (req.body._id == null || req.body._id == '') {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    } else if (req.body.ac_code == null || req.body.ac_code == '') {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    } else {
        User.findById(req.body._id, function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
            } else if (user == null) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
            } else {
                user.compareActivationCode(req.body.ac_code, function (err, isMatch) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.ERROR_AC));
                    } else if (isMatch) {
                        var gapOfTime = Date.now() - user.activation.when;
                        if (gapOfTime < GAP_TIME_TO_EMAIL) {
                            User.findByIdAndUpdate(user._id, {
                                'activation.code': null,
                                'activation.is_activated': true
                            }, {new: true}, function (err, user) {
                                if (err) {
                                    res.stat(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                                } else if (user == null) {
                                    res.stat(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
                                } else {
                                    user.password = undefined;
                                    user.next_email = undefined;
                                    res.json({
                                        "code": AppStatus.USER_ACTIVATED,
                                        "message": AppStatus.getStatusText(AppStatus.USER_ACTIVATED),
                                        "data": {user: user}
                                    });
                                }
                            });
                        } else {
                            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.TIMEOUT));
                        }
                    } else {
                        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.AC_NOT_MATCH));
                    }
                });
            }
        });
    }
};
/**
 * Generate new password and send an email to email user
 * @param req
 * @param res
 * @param next
 */
router.patch('/newpassword', function (req, res, next) {
    genNewPassword(req, res, next)
});
router.post('/newpassword', function (req, res, next) {
    if (req.body._method == 'patch') {
        genNewPassword(req, res, next);
    } else {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    }

});

function genNewPassword(req, res, next) {
    req.body.email;
    var code = generateRandomString(5);
    User.findOneAndUpdate({email: req.body.email}, {password: code}, {new: true}, function (err, user) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
        } else if (user == null) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
        } else {
            sendEmail(req.body.email, code);
            res.json({"code": AppStatus.SUCCESS, "message": "Email was sent to " + req.body.email});
        }
    })
};

/**
 * Sends an email to email with randomString as content
 * @param email
 * @param randomString
 */
function sendEmail(user, randomString, next) {
    // Read file email.txt with email and password
    var i = 0;
    var inputFile = "./routes/email.txt";
    var fromEmail;
    var fromPass;

    var fs = require('fs'),
        readline = require('readline'),
        instream = fs.createReadStream(inputFile),
        outstream = new (require('stream'))(),
        rl = readline.createInterface(instream, outstream);

    rl.on('line', function (line) {
        if (i == 1) {
            fromEmail = line;
        } else if (i == 2) {
            fromPass = line;
        }
        i++;
    });

    rl.on('close', function (line) {
        console.log('done reading file.');

        // Send mail
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: fromEmail,
                pass: fromPass
            },
            tls: {rejectUnauthorized: false}
        });

        var mailOptions = {
            from: fromEmail,
            to: user.email,
            subject: 'Activate your user in Signu',
            html: '<p>Here you have your code to finish your autentication: </p>' +
            '<h1>' + randomString + '</h1>' +
            '<p>Check it in /activateuser .</p>' +
            '<p>Or click <a href="http://localhost:3000/activateuser?_id=' + user._id + '&ac_code=' + randomString + '">here</a> and click on the button. You have 30 minutes to do it.</p>' +
            '<p>Ignore this email if you did not request it</p>' +
            '<p>Signu team</p>',
        };
        transporter.sendMail(mailOptions, next);
    });


};

/**
 * Return a String of the length lenght
 * @param length
 * @returns {string}
 */
function generateRandomString(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
};

/**
 * Log in:
 * it starts a new session
 * it returns info of user if password is correct
 */
router.post('/login', function (req, res, next) {
    thisSession = req.session;
    var thisUser;
    thisUser = {
        "email": req.body.email
    };
    if (req.body.email == null || req.body.password == null) {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    } else {
        User.findOne(thisUser, function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
            } else if (user == null) {
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
            } else if (!user.activation.is_activated) {
                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_DESACTIVATED));
            } else {
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.INCORRECT_PASS));
                    } else if (isMatch) {
                        thisSession._id = user._id;
                        checkUser(user);
                        user.password = undefined;
                        var response = {
                            "code": AppStatus.SUCCESS,
                            "message": "The user has been logged successfully",
                            "data": {user: user}
                        };
                        res.json(response);

                        // Pdf.findById(user.pdfs_to_sign, function (err, pdfs) {
                        //     if (err) {
                        //         res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({});
                        //     } else {
                        //         if (pdfs != null) {
                        //             data.pdfs_to_sign = pdfs;
                        //         }
                        //         Pdf.findById(user.pdfs_signed, function (err, pdfs) {
                        //             if (err) {
                        //                 res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({});
                        //             } else {
                        //                 if (pdfs != null) {
                        //                     data.pdfs_signed = pdfs;
                        //                 }
                        //                 Pdf.findById(user.pdfs_owned, function (err, pdfs) {
                        //                     if (err) {
                        //                         res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({});
                        //                     } else {
                        //                         if (pdfs != null) {
                        //                             data.pdfs_owned = pdfs;
                        //                         }
                        //                         var arrayUsersRelated = user.users_related.map(a => a._id);
                        //                         User.find({'_id': {$in: arrayUsersRelated}}, function(err, users){
                        //                             if (err) {
                        //                                 res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({});
                        //                             } else {
                        //                                 if(users != null){
                        //                                     data.users_related = users;
                        //                                 }
                        //                                 response.data = data;
                        //                                 res.json(response);
                        //                             }
                        //                         });
                        //
                        //                     }
                        //                 });
                        //             }
                        //         });
                        //     }
                        // });

                    } else {
                        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.INCORRECT_PASS));
                    }
                });
            }
        }).populate('pdfs_owned').populate('pdfs_to_sign').populate('pdfs_signed').populate('users_related', '-password');
    }
});

/**
 * Log out: Close the current session
 */
router.post('/logout', function (req, res, next) {
    var thisSession = req.session;
    console.log(thisSession);
    if (thisSession._id != null) {
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
    if (thisSession._id == null) {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.NOT_LOGGED));
    } else {
        User.findById(thisSession._id, function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.INTERNAL_ERROR));
            } else {
                if (user != null) {
                    user.password = undefined;
                    res.json({
                        "code": AppStatus.SUCCESS,
                        "message": AppStatus.getStatusText(AppStatus.SUCCESS),
                        "data": {user: user}
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

/**
 * Put flag activated to false the current user if the password is correct
 */
router.put('/desactivate', desactivateUser);
router.post('/desactivate', function (req, res, next) {
    if (req.body._method == 'put') {
        desactivateUser(req, res, next);
    } else {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    }
});

function desactivateUser(req, res, next) {
    thisSession = req.session;
    if (thisSession._id != null) {
        User.findById(thisSession._id, function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            } else if (user == null) {
                res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
            } else {
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                    } else if (!isMatch) {
                        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.INCORRECT_PASS));
                    } else {
                        User.findByIdAndUpdate(thisSession._id, {'activation.is_activated': false}, {new: true}, function (err, user) {
                            if (err) {
                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                            } else {
                                res.json({
                                    "code": AppStatus.SUCCESS,
                                    "message": AppStatus.getStatusText(AppStatus.USER_DESACTIVATED),
                                    "data": {user: user}
                                });
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
 * Delete user if password is correct
 */
router.delete('/', deleteUser);
router.post('/', function (req, res, next) {
    if (req.body._method == 'delete') {
        deleteUser(req, res, next);
    } else {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    }
});

function deleteUser(req, res, next) {
    thisSession = req.session;
    if (thisSession._id == null) {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.NOT_LOGGED));
    } else {
        User.findById(thisSession._id, function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            } else if (user == null) {
                res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
            } else {
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                    } else if (!isMatch) {
                        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.INCORRECT_PASS));
                    } else {
                        User.findByIdAndRemove(thisSession._id, {'activation.is_activated': false}, {new: true}, function (err, user) {
                            if (err) {
                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                            } else if (user == null) {
                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
                            }
                            else {
                                res.json({
                                    "code": AppStatus.USER_DELETED,
                                    "message": AppStatus.getStatusText(AppStatus.USER_DELETED)
                                });
                            }
                        });
                    }
                });
            }
        });
    }
};

/**
 * Edit user (email)
 */
router.put('/email', editEmail);
router.post('/email', function (req, res, next) {
    if (req.body._method == 'put') {
        editEmail(req, res, next);
    } else {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    }
});

function editEmail(req, res, next) {
    thisSession = req.session;
    if (thisSession._id != null) {
        var randomString = generateRandomString(5);
        var modUser = {};
        var isMod = false;
        if (req.body.email != null && req.body.email != '') {
            modUser.next_email.email = req.body.email;
            modUser.next_email.when = Date.now();
            modUser.next_email.code = randomString;
        }
        sendEmail(req.body.email, randomString, function (err, info) {
            if (err) {
                res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.EMAIL_ERROR));
            } else {
                User.findByIdAndUpdate(thisSession._id, modUser, {new: true}, function (err, user) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
                    } else if (user == null) {
                        res.status(HttpStatus.FORBIDDEN).json(getJsonAppError(AppStatus.NOT_LOGGED));
                    } else {
                        user.password = undefined;
                        user.activation = undefined;
                        user.next_email = undefined;
                        res.json({
                            "code": AppStatus.USER_UPDATED,
                            "message": AppStatus.getStatusText(AppStatus.USER_UPDATED),
                            "data": {user: user}
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
 * Edit user (password)
 */
router.put('/password', editPassword);
router.post('/password', function (req, res, next) {
    if (req.body._method == 'put') {
        editPassword(req, res, next);
    } else {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    }
});

function editPassword(req, res, next) {
    thisSession = req.session;
    if (thisSession._id != null) {
        User.findById(thisSession._id, function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
            } else if (user == null) {
                res.status(HttpStatus.FORBIDDEN).json(getJsonAppError(AppStatus.NOT_LOGGED));
            } else {
                if (req.body.password == null || req.body.password == '') {
                    res.status(HttpStatus.NOT_FOUND).json(getJsonAppError(AppStatus.NOT_LOGGED));
                } else {
                    user.last_edition_date = Date.now();
                    user.password = req.body.password;
                    user.save(function (err, user) {
                        if (err) {
                            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                        } else if (user == null) {
                            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.INTERNAL_ERROR));
                        } else {
                            user.password = undefined;
                            user.activation = undefined;
                            res.json({
                                "code": AppStatus.USER_UPDATED,
                                "message": AppStatus.getStatusText(AppStatus.USER_UPDATED),
                                "data": {user: user}
                            });
                        }
                    });
                }
            }
        });
    } else {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.NOT_LOGGED));
    }
};

/**
 * Edit user (name, lastname)
 */
router.put('/', editUser);
router.post('/', function (req, res, next) {
    if (req.body._method == 'put') {
        editUser(req, res, next);
    } else {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    }
});

function editUser(req, res, next) {
    thisSession = req.session;
    if (thisSession._id != null) {
        var modUser = {};
        var isMod = false;
        if (req.body.name != null && req.body.name != '') {
            modUser.name = req.body.name;
        }
        if (req.body.lastname != null && req.body.lastname != '') {
            modUser.lastname = req.body.lastname;
        }
        User.findByIdAndUpdate(thisSession._id, modUser, {new: true}, function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
            } else if (user == null) {
                res.status(HttpStatus.FORBIDDEN).json(getJsonAppError(AppStatus.NOT_LOGGED));
            } else {
                user.password = undefined;
                user.activation = undefined;
                res.json({
                    "code": AppStatus.USER_UPDATED,
                    "message": AppStatus.getStatusText(AppStatus.USER_UPDATED),
                    "data": {user: user}
                });
            }
        });
    } else {
        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.NOT_LOGGED));
    }
};

module.exports = router;
