var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var expressValidator = require('express-validator');
var index = require('./routes/index');
var users = require('./routes/userRoutes');
var pdfs = require('./routes/pdfRoutes');
var auth = require('./routes/authorisation/authRoutes');
var config = require('config');
var nodemailer = require('nodemailer');
var swaggerUi = require('swagger-ui-express');
var swaggerDocument = require('./swagger.json');
var oAuth2Server = require('node-oauth2-server');

var app = express();


// Security settings
app.disable('x-powered-by');
// Sessions
app.use(session({
    secret: 'ssshhh',
    resave: true,
    saveUninitialized: true
}));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.urlencoded({extended: true, parameterLimit: '1000000', limit: '50mb'}));
app.use(bodyParser.json());
app.use(expressValidator());
app.use(cookieParser()); //TODO I sould not use cookies?
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/', index);
app.use('/api/users', users);
app.use('/api/pdfs', pdfs);
// app.use('/api/authorisation/authRoutes', auth);

// Oauth2
app.oauth = oAuth2Server({
    model: require('./model.js'),
    grants: ['password'],
    debug: true
});

app.all('/oauth/token', app.oauth.grant());

app.get('/topsecret', app.oauth.authorise(), function (req, res) {
    res.send('Congratulations, you are in a secret area!');
});

app.use(app.oauth.errorHandler());
// END Oauth2

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};
//
//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

// I dont know if the connection should be here
mongoose.Promise = global.Promise; // To avoid a warning
mongoose.connect(config.DBHost, function (err, res) {
    if (err) {
        return console.error('Error connecting to "%s":', config.DBHost, err);
    }
    console.log('Connected successfully to "%s"', config.DBHost);
});



module.exports = app;
