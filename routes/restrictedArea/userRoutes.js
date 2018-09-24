/**
 * This class manage every interaction with users collection and the routes that them
 */
"use strict";
var express = require('express');
var router = express.Router();
var nodemailer = require('nodemailer');
var User = require('../models/user');
var Pdf = require('../models/pdf');
var AccessTokenModel = require('../authorisation/accessTokenModel');
var bcrypt = require('bcrypt');
var HttpStatus = require('http-status-codes');
var AppStatus = require('../../public/routes/app-err-codes-en');
var getJsonApp = AppStatus.getJsonApp;
var GAP_TIME_TO_EMAIL = 1800000; // milliseconds
var fromEmail = require('./emailConfig').EMAIL_SECRET;
var fromPass = require('./emailConfig').PASS_SECRET;

function userRoutes(app) {
    router.post('/signup', createUser);
    //router.post('/login', loginUser);
    router.post('/logout', app.oauth.authorise(), logOutUser);
    router.get('/info', app.oauth.authorise(), getInfoUser);

    // Edit user fields
    router.put('/', app.oauth.authorise(), editUser);
    router.post('/', app.oauth.authorise(), function (req, res, next) {
        if (req.body._method == 'put') {
            editUser(req, res, next);
        } else if (req.body._method == 'delete') {
            deleteUser(req, res, next);
        } else {
            res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
        }
    });
    router.put('/email', app.oauth.authorise(), editNextEmail);
    router.post('/email', app.oauth.authorise(), function (req, res, next) {
        if (req.body._method == 'put') {
            editNextEmail(req, res);
        } else {
            res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
        }
    });
    router.put('/password', app.oauth.authorise(), editPassword);
    router.post('/password', app.oauth.authorise(), function (req, res, next) {
        if (req.body._method == 'put') {
            editPassword(req, res, next);
        } else {
            res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
        }
    });
    router.put('/related', app.oauth.authorise(), addRelated);
    router.post('/related', app.oauth.authorise(), function (req, res, next) {
        if (req.body._method == 'put') {
            addRelated(req, res, next);
        } else {
            res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
        }
    });
    router.delete('/', app.oauth.authorise(), deleteUser);

    router.put('/authemail', activateUser);
    router.post('/authemail', function (req, res, next) {
        if (req.body._method == 'put') {
            activateUser(req, res, next);
        } else {
            res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
        }
    });
    router.put('/authnextemail', authNextEmail);
    router.post('/authnextemail', function (req, res, next) {
        if (req.body._method == 'put') {
            authNextEmail(req, res, next);
        } else {
            res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
        }
    });

    return router;
}

/**
 * Delete references to eliminated PDFs
 * @param {Object} user - {pdfs_to_sign, users_related}
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
 * User exists and activated -> Error
 * User exists and desactivated -> Delete old user and create a new one
 * User not exists -> Create new user
 * @param {Object} req - body = {email, name, lastname, password}
 * @param {Object} res - 200 if everything ok
 */
function createUser(req, res) {
    // console.log(req.get('host'));
    if (req.body.email == null || req.body.email == '') {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
    } else if (req.body.password == null || req.body.password == '') {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
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
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
            } else if (user == null) {
                // User did not exist
                thisUser.save(function (err, user) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                    } else if (user == null) {
                        res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.USER_NOT_FOUND));
                    } else {
                        var mailOptions = {
                            to: user.email,
                            subject: 'Activate your user in Signu',
                            html: '<p>Click <a href="http://localhost:3000/activateuser?_id=' + user._id + '&code=' + randomString + '">here</a> and click on the button to activate your email. You have 30 minutes to do it.</p>' +
                            '<p>Ignore this email if you did not request it</p>' +
                            '<p>Here you have your code to finish your autentication: </p>' +
                            '<h1>' + randomString + '</h1>' +
                            '<p>Signu team</p>'
                        };
                        sendEmail(mailOptions, function (err, info) {
                            if (err) {
                                user.remove();
                                res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.EMAIL_ERROR));
                            } else {
                                user.password = undefined;
                                user.activation.code = undefined;
                                var data = {user: user};
                                if (process.env.NODE_ENV == 'test') {
                                    data.code_raw = randomString
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
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                    } else {
                        thisUser.save(function (err, user) {
                            if (err) {
                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                            } else if (user == null) {
                                res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.USER_NOT_FOUND));
                            } else {
                                var mailOptions = {
                                    to: user.email,
                                    subject: 'Activate your user in Signu',
                                    html: '<p>Click <a href="http://localhost:3000/activateuser?_id=' + user._id + '&code=' + randomString + '">here</a> and click on the button to activate your email. You have 30 minutes to do it.</p>' +
                                    '<p>Ignore this email if you did not request it</p>' +
                                    '<p>Here you have your code to finish your autentication: </p>' +
                                    '<h1>' + randomString + '</h1>' +
                                    '<p>Signu team</p>'
                                };
                                sendEmail(mailOptions, function (err, info) {
                                    if (err) {
                                        user.remove();
                                        res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.EMAIL_ERROR));
                                    } else {
                                        user.password = undefined;
                                        user.activation.code = undefined;
                                        var data = {user: user};
                                        if (process.env.NODE_ENV == 'test') {
                                            data.code_raw = randomString
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
                res.status(HttpStatus.CONFLICT).json(getJsonApp(AppStatus.USER_ALREADY_EXISTS));
            }
        });

    }
}

/**
 * If code == activation.code put activation.is_activated to true
 * @param {Object} req - body = {_id, code}
 * @param {Object} res - 200 if activation.is_activated changes to true
 */
function activateUser(req, res) {
    //This check also should be in the front-end
    if (req.body._id == null || req.body._id == '') {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
    } else if (req.body.code == null || req.body.code == '') {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
    } else {
        User.findById(req.body._id, function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
            } else if (user == null) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.USER_NOT_FOUND));
            } else if (user.activation.is_activated == true) {
                res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.USER_ACTIVATED));
            } else {
                if (req.body.code == user.activation.code) {
                    var gapOfTime = Date.now() - user.activation.when;
                    if (gapOfTime < GAP_TIME_TO_EMAIL) {
                        User.findByIdAndUpdate(user._id, {
                            'activation.code': null,
                            'activation.is_activated': true
                        }, {new: true}, function (err, user) {
                            if (err) {
                                res.stat(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                            } else if (user == null) {
                                res.stat(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.USER_NOT_FOUND));
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
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.TIMEOUT));
                    }
                } else {
                    res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.AC_NOT_MATCH));
                }
            }
        });
    }
};

/**
 * Update email if req.body.code == next_email.code
 * @param {Object} req - body = {_id, code}
 * @param {Object} res - 200 if email was replaced by next_email.email
 */
function authNextEmail(req, res) {
    //This check also should be in the front-end
    if (req.body._id == null || req.body._id == '') {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
    } else if (req.body.code == null || req.body.code == '') {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.BAD_REQUEST));
    } else {
        User.findById(req.body._id, function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
            } else if (user == null) {
                res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.USER_NOT_FOUND));
            } else if (user.activation.is_activated != true) {
                res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.USER_DESACTIVATED));
            } else {
                if (req.body.code == user.next_email.code) {
                    var gapOfTime = Date.now() - user.next_email.when;
                    if (gapOfTime < GAP_TIME_TO_EMAIL) {
                        User.findByIdAndUpdate(user._id, {
                            'next_email.code': null,
                            'next_email.email': null,
                            'email': user.next_email.email
                        }, {new: true}, function (err, user) {
                            if (err) {
                                res.stat(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                            } else if (user == null) {
                                res.stat(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.USER_NOT_FOUND));
                            } else {
                                user.password = undefined;
                                res.json({
                                    "code": AppStatus.USER_ACTIVATED,
                                    "message": AppStatus.getStatusText(AppStatus.USER_ACTIVATED),
                                    "data": {user: user}
                                });
                            }
                        });
                    } else {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.TIMEOUT));
                    }
                } else {
                    res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.AC_NOT_MATCH));
                }
            }
        });
    }
}

/**
 * Sends an email
 * @param {Object} mailOptions - mailOptions = {to, subject, html}
 * @callback {function} next
 */
function sendEmail(mailOptions, next) {
    // Send mail
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: fromEmail,
            pass: fromPass
        },
        tls: {rejectUnauthorized: false}
    });

    mailOptions.from = fromEmail;

    if (process.env.NODE_ENV == 'test') {
        next(false);
    } else {
        transporter.sendMail(mailOptions, next);
    }
};

/**
 * Return a String of the length <lenght>
 * @param {number} length - length of random string which return
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
 * Log out: Delete token
 * @param {Object} req
 * @param {Object} res - 200 if token is deleted
 */
function logOutUser(req, res) {
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.deleteAccessToken(myToken, function (err, result) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
        } else {
            res.json(AppStatus.getJsonApp(AppStatus.USER_LOG_OUT));
        }
    });
}

/**
 * Return info of the user in session
 * @param {Object} req
 * @param {Object} res - 200 if user info is sended
 */
function getInfoUser(req, res) {
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.getAccessToken(myToken, function (err, token) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
        } else if (token == null) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.TOKEN_NOT_FOUND));
        } else {
            User.findById(token.user_id, function (err, user) {
                if (err) {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.INTERNAL_ERROR));
                } else if (user == null) {
                    res.status(HttpStatus.UNAUTHORIZED).json({
                        "code": AppStatus.USER_NOT_FOUND,
                        "message": AppStatus.getStatusText(AppStatus.USER_NOT_FOUND)
                    });
                } else {
                    res.json({
                        "code": AppStatus.SUCCESS,
                        "message": AppStatus.getStatusText(AppStatus.SUCCESS),
                        "data": {user: user}
                    });
                }
            }).populate('pdfs_owned').populate('pdfs_to_sign').populate('pdfs_signed').populate('users_related', '-password -activation');
        }
    });
}

/**
 * Delete user if password is correct
 * @param {Object} req - body = {password}
 * @param {Object} res - 200 if password was updated
 */
function deleteUser(req, res) {
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.getAccessToken(myToken, function (err, token) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
        } else if (token == null) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.TOKEN_NOT_FOUND));
        } else {
            User.findById(token.user_id, function (err, user) {
                if (err) {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.INTERNAL_ERROR));
                } else if (user == null) {
                    res.status(HttpStatus.UNAUTHORIZED).json({
                        "code": AppStatus.USER_NOT_FOUND,
                        "message": AppStatus.getStatusText(AppStatus.USER_NOT_FOUND)
                    });
                } else {
                    user.comparePassword(req.body.password, function (err, isMatch) {
                        if (err) {
                            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                        } else if (!isMatch) {
                            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.INCORRECT_PASS));
                        } else {
                            User.findByIdAndRemove(token.user_id, function (err, user) {
                                if (err) {
                                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                                } else if (user == null) {
                                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.USER_NOT_FOUND));
                                } else {
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
    });
};

/**
 * Edit next_email of a user and send a email to it to check it
 * @param {Object} req - body = {email}
 * @param {Object} res - 200 if next_email was updated
 */
function editNextEmail(req, res) {
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.getAccessToken(myToken, function (err, token) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
        } else if (token == null) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.TOKEN_NOT_FOUND));
        } else {
            var randomString = generateRandomString(5);
            var modUser = {};
            var isMod = false;
            if (req.body.email != null && req.body.email != '') {
                modUser.next_email = {};
                modUser.next_email.email = req.body.email;
                modUser.next_email.when = Date.now();
                modUser.next_email.code = randomString;
            }
            var mailOptions = {
                to: req.body.email,
                subject: 'Activate your user in Signu',
                html: '<p>Click <a href="http://localhost:3000/confirmnewemail?_id=' + token.user_id +
                '&code=' + randomString +
                '">here</a> and click on the button to change to your new email. You have 30 minutes to do it.</p>' +
                '<p>Ignore this email if you did not request it</p>' +
                '<p>If you prefer, here you have your code to finish your autentication: </p>' +
                '<p>' + randomString + '</p>' +
                '<p>Signu team</p>'
            };
            sendEmail(mailOptions, function (err, info) {
                if (err) {
                    res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.EMAIL_ERROR));
                } else {
                    User.findByIdAndUpdate(token.user_id, modUser, {new: true}, function (err, user) {
                        if (err) {
                            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.USER_NOT_FOUND));
                        } else if (user == null) {
                            res.status(HttpStatus.FORBIDDEN).json(getJsonApp(AppStatus.USER_NOT_LOGGED));
                        } else {
                            user.password = undefined;
                            if (process.env.NODE_ENV != 'test') {
                                user.next_email.code = undefined;
                            }
                            res.json({
                                "code": AppStatus.USER_UPDATED,
                                "message": AppStatus.getStatusText(AppStatus.USER_UPDATED),
                                "data": {user: user}
                            });
                        }
                    });
                }
            });
        }
    });
};


/**
 * Edit password of user
 * @param {Object} req - body = {password}
 * @param {Object} res - 200 if password was updated
 */
function editPassword(req, res) {
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.getAccessToken(myToken, function (err, token) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
        } else if (token == null) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.TOKEN_NOT_FOUND));
        } else {
            User.findById(token.user_id, function (err, user) {
                if (err) {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.USER_NOT_FOUND));
                } else if (user == null) {
                    res.status(HttpStatus.FORBIDDEN).json(getJsonApp(AppStatus.USER_NOT_LOGGED));
                } else {
                    if (req.body.password == null || req.body.password == '') {
                        res.status(HttpStatus.NOT_FOUND).json(getJsonApp(AppStatus.USER_NOT_LOGGED));
                    } else {
                        user.last_edition_date = Date.now();
                        user.password = req.body.password;
                        user.save(function (err, user) {
                            if (err) {
                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
                            } else if (user == null) {
                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.INTERNAL_ERROR));
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
        }
    });


};

/**
 * Edit name and/or lastname of actual user
 * @param {Object} req - body = {name, lastname}
 * @param {Object} res - 200 if user was updated
 */
function editUser(req, res) {
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.getAccessToken(myToken, function (err, token) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
        } else if (token == null) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.TOKEN_NOT_FOUND));
        } else {
            var modUser = {};
            if (req.body.name != null && req.body.name != '') {
                modUser.name = req.body.name;
            }
            if (req.body.lastname != null && req.body.lastname != '') {
                modUser.lastname = req.body.lastname;
            }
            modUser.last_edition_date = Date.now();
            User.findByIdAndUpdate(token.user_id, modUser, {new: true}, function (err, user) {
                if (err) {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.USER_NOT_FOUND));
                } else if (user == null) {
                    res.status(HttpStatus.BAD_REQUEST).json(getJsonApp(AppStatus.USER_NOT_FOUND));
                } else {
                    user.password = undefined;
                    user.activation.code = undefined;
                    res.json({
                        "code": AppStatus.USER_UPDATED,
                        "message": AppStatus.getStatusText(AppStatus.USER_UPDATED),
                        "data": {user: user}
                    });
                }
            });
        }
    });
};

/**
 * Add a related_id to users_related list of actual user
 * @param {Object} req - body = {related_id}
 * @param {Object} res - 200 if related_id was added
 */
function addRelated(req, res) {
    var myToken = req.headers.authorization.split(" ", 2)[1];
    AccessTokenModel.getAccessToken(myToken, function (err, token) {
        if (err) {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.DATABASE_ERROR));
        } else if (token == null) {
            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.TOKEN_NOT_FOUND));
        } else {
            User.count({_id: req.body.related_id}, function (err, count) {
                if (err) {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.BAD_REQUEST));
                } else if (count <= 0) {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.USER_NOT_FOUND));
                } else {
                    User.findByIdAndUpdate(token.user_id, {$addToSet: {users_related: req.body.related_id}}, {
                        new: true,
                        safe: true
                    }, function (err, user) {
                        if (err) {
                            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.BAD_REQUEST));
                        } else if (user == null) {
                            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonApp(AppStatus.USER_NOT_FOUND));
                        } else if (user.activation.is_activated != true) {
                            res.status(HttpStatus.UNAUTHORIZED).json(getJsonApp(AppStatus.USER_DESACTIVATED));
                        } else {
                            user.password = undefined;
                            user.activation.code = undefined;
                            res.json({
                                "code": AppStatus.USER_UPDATED,
                                "message": AppStatus.getStatusText(AppStatus.USER_UPDATED),
                                "data": {user: user}
                            });
                        }
                    });
                }
            });
        }
    });
};

//////////////
// EXPORTS //
/////////////

/**
 * Add pdf to their creator and signers if is not repeated
 * @param {Object} pdf - pdf = {_id, owner_id}
 */
function addPdfToUsers(pdf) {
    var newPdf = {_id: pdf._id};
    User.findByIdAndUpdate(pdf.owner_id, {$addToSet: {pdfs_owned: newPdf}}, {safe: false});
    pdf.signers.forEach(function (signer) {
        if (signer.is_signed) {
            User.findByIdAndUpdate(signer._id, {$addToSet: {pdfs_signed: newPdf}}, {safe: false});
        } else {
            User.findByIdAndUpdate(signer._id, {$addToSet: {pdfs_to_sign: newPdf}}, {safe: false});
        }
    });
};

/**
 * Delete all references to pdf
 * @param {Object} pdf - pdf = {_id, owner_id}
 */
function deletePdfOfUsers(pdf) {
    User.findByIdAndUpdate(pdf.owner_id, {$pull: {"pdfs_owned": pdf._id}}, {safe: true});
    pdf.signers.forEach(function (signer) {
        if (signer.is_signed) {
            User.findByIdAndUpdate(signer._id, {$pull: {"pdfs_to_sign": pdf._id}}, {safe: true});
        } else {
            User.findByIdAndUpdate(signer._id, {$pull: {"pdfs_signed": pdf._id}}, {safe: true});
        }
    });
};

module.exports.userRoutes = userRoutes;
module.exports.addPdfToUsers = addPdfToUsers;
module.exports.deletePdfOfUsers = deletePdfOfUsers;
