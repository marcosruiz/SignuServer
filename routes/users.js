var express = require('express');
var router = express.Router();
var User = require('./models/user');
var Pdf = require('./models/pdf');
var bcrypt = require('bcrypt');
var HttpStatus = require('http-status-codes');
var AppStatus = require('./app-err-codes-en');
var sendStandardError = require('./index').sendStandardError;

/* GET users listing. */
var thisSession;

function getJsonAppError(code, message) {
    "use strict";
    var res = {
        "code": code,
        "message": AppStatus.getStatusText(code)
    };
    return res;
}

function updateUser(user) {
    "use strict";
    // Update friends
    user.related_people.forEach(function (user_id) {
        User.findById(user_id, function (err, user) {
            if (err) {

            } else if (user == undefined) {
                // Delete from my related_people
                User.findByIdAndUpdate(user._id, $pull({"related_people": user_id}));
            }
        });
    });
    // Update pdfs
    user.pdfs_to_sign.forEach(function (pdf_id) {
        Pdf.findById(pdf_id, function (err, pdf) {
            if (err) {
            } else if (pdf == undefined) {
                // Delete from my pdfs
                User.findByIdAndUpdate(user._id, {$pull: ({"pdfs_to_sign": pdf_id})});
            }
        });
    });
    user.pdfs_signed.forEach(function (pdf_id) {
        Pdf.findById(pdf_id, function (err, pdf) {
            if (err) {
            } else if (pdf == undefined) {
                // Delete from my pdfs
                User.findByIdAndUpdate(user._id, {$pull: ({"pdfs_signed": pdf_id})});
            }
        });
    });

    return;
}

/**
 * Create a new user
 */
router.post('/signup', function (req, res, next) {
    if (req.body.password != req.body.password2) {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.INCORRECT_PASS));
    } else if (req.body.email == undefined) {
        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.BAD_REQUEST));
    } else {
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
                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
            } else {
                // thisSession._id = user._id; // Uncomment if you want to start a session
                user._id = undefined;
                user.password = undefined;
                res.json({
                    "code": AppStatus.SUCCESS,
                    "message": "The user has been created",
                    "data": user
                });
            }
        });
    }
});

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
                res.status(HttpStatus.UNAUTHORIZED).json({
                    "code": AppStatus.USER_NOT_FOUND,
                    "message": AppStatus.getStatusText(AppStatus.USER_NOT_FOUND)
                });
            } else {
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.INCORRECT_PASS));
                    } else if (isMatch) {
                        thisSession._id = user._id;
                        updateUser(user);
                        user._id = undefined;
                        user.password = undefined;
                        var response = {
                            "code": AppStatus.SUCCESS,
                            "message": "The user has been logged successfully",
                            "data": user,
                            "pdfs_to_sign" : [],
                            "pdfs_signed" : [],
                            "pdfs_owned" : []
                        };
                        Pdf.findById(user.pdfs_to_sign, function(err, pdfs){
                            if(err){
                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({});
                            } else{
                                if(pdfs != undefined){
                                    response.pdfs_to_sign = pdfs;
                                }
                                Pdf.findById(user.pdfs_signed, function (err, pdfs) {
                                    if(err){
                                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({});
                                    } else{
                                        if(pdfs!=undefined){
                                            response.pdfs_signed = pdfs;
                                        }
                                        Pdf.findById(user.pdfs_owned, function(err, pdfs){
                                            if(err){
                                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({});
                                            } else{
                                                if(pdfs!=undefined){
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
                        "data": user
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


var deleteUser = function (req, res, next) {
    thisSession = req.session;
    if (thisSession._id != undefined) {
        User.findById(thisSession._id, function (err, user) {
            if (err) {
                res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            } else {
                user.comparePassword(req.body.password, function (err, isMatch) {
                    if (err) {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR);
                    } else if (!isMatch) {
                        res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.INCORRECT_PASS));
                    } else {
                        User.findByIdAndRemove(thisSession._id, function (err) {
                            if (err) {
                                res.status(HttpStatus.INTERNAL_SERVER_ERROR);
                            } else {
                                res.json({"message": "User deleted"});
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
router.delete('/', deleteUser);

/**
 * Edit user
 * @param req
 * @param res
 * @param next
 */
var putUser = function (req, res, next) {
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
                                        "data": user
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
        res.status(HttpStatus.BAD_REQUEST);
    }
});


module.exports = router;
