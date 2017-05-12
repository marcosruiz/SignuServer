var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Signu: Home' });
});

router.get('/login', function (req, res, next) {
    res.render('login', {title: 'Signu: Log in'})
});

router.get('/signup', function(req, res, next){
   res.render('signup', {title: 'Signu: Sign up'})
});

module.exports = router;
