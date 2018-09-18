var express = require('express');
var router = express.Router();
var HttpStatus = require('http-status-codes');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Signu: Home' });
});

router.get('/login', function (req, res, next) {
    res.render('login', {title: 'Signu: Log in'});
});

router.get('/signup', function(req, res, next){
   res.render('signup', {title: 'Signu: Sign up'});
});

// router.get('/signupfacebook', function(req, res, next){
//     res.render('signupfacebook', {title: 'Signu: Sign up with facebook'});
// });

router.get('/delete', function(req, res, next){
    res.render('deleteuser', {title: 'Signu: Delete user'});
});

router.get('/update', function(req, res, next){
    res.render('updateuser', {title: 'Signu: Edit user'});
});

router.get('/uploadfile', function (req, res, next) {
    res.render('uploadfile', {title: 'Signu: Upload file'});
});

router.get('/updatefile', function (req, res, next) {
    res.render('updatefile', {title: 'Signu: Update file'});
});

router.get('/unlockfile', function (req, res, next) {
    res.render('unlockfile', {title: 'Signu: Unlock file'});
});

router.get('/activateuser', function(req, res, next){
    res.render('activateuser', {title: 'Signu: Activate user/ email',_id: req.query._id, code : req.query.code});
});

router.get('/confirmnewemail', function(req, res, next){
    res.render('confirmnewemail', {title: 'Signu: Confirm new email',_id: req.query._id, code : req.query.code});
});

router.sendStandardError = function sendStandardError (res, status) {
    res.status(status).json({
        "code": status,
        "message": HttpStatus.getStatusText(status)
    });
};

module.exports = router;

