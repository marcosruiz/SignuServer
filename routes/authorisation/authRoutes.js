
module.exports = (router, expressApp, authRoutesMethods) => {

    router.post('/register', registerUser);

    router.post('/login', login);

    return router;
};

function registerUser(req, res){
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
                                res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.EMAIL_ERROR));
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
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                    } else {
                        thisUser.save(function (err, user) {
                            if (err) {
                                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(getJsonAppError(AppStatus.DATABASE_ERROR));
                            } else if (user == null) {
                                res.status(HttpStatus.UNAUTHORIZED).json(getJsonAppError(AppStatus.USER_NOT_FOUND));
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
                                        res.status(HttpStatus.BAD_REQUEST).json(getJsonAppError(AppStatus.EMAIL_ERROR));
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
                res.status(HttpStatus.CONFLICT).json(getJsonAppError(AppStatus.USER_ALREADY_EXISTS));
            }
        });

    }
}


function login(req, res){}