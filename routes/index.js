var express = require('express');
var router = express.Router();

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

router.get('/delete', function(req, res, next){
    res.render('deleteuser', {title: 'Signu: Delete user'});
});

router.get('/update', function(req, res, next){
    res.render('updateuser', {title: 'Signu: Edit user'});
});

router.get('/uploadfile', function (req, res, next) {
    res.render('uploadfile', {title: 'Signu: Upload file'});
})

module.exports = router;
