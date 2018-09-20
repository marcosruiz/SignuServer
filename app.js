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
var config = require('config');
var swaggerUi = require('swagger-ui-express');
var swaggerDocument = require('./swagger.json');
var OAuth2Server = require('oauth2-server');

var app = express();

app.use(bodyParser.urlencoded({extended: true, parameterLimit: '1000000', limit: '50mb'}));
app.use(bodyParser.json());

//Mongose
mongoose.Promise = global.Promise; // To avoid a warning
mongoose.connect(config.DBHost, function (err, res) {
    if (err) {
        return console.error('Error connecting to "%s":', config.DBHost, err);
    } else {
        console.log('Connected successfully to "%s"', config.DBHost);
    }
});

// Oauth2
app.oauth = OAuth2Server({
    model: require('./routes/authorisation/accessTokenModel.js'),
    grants: ['password'],
    debug: true
});
app.all('/oauth/token', app.oauth.grant());
app.use(app.oauth.errorHandler());

// Routes
var userRoutes = require('./routes/restrictedArea/userRoutes').userRoutes(app);
var pdfs = require('./routes/restrictedArea/pdfRoutes');
// var auth = require('./routes/authorisation/authRoutes');

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

app.use(expressValidator());
app.use(cookieParser()); //TODO should I use cookies?
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/', index);
app.use('/api/users', userRoutes);
app.use('/api/pdfs', pdfs);
// app.use('/api/authorisation/authRoutes', auth);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
