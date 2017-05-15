/**
 * Created by Marcos on 15/05/2017.
 */

//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

var mongoose = require("mongoose");
var User = require('../routes/models/user');

//Require the dev-dependencies
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../app');
var should = chai.should();
var HttpStatus = require('http-status-codes');

chai.use(chaiHttp);
//Our parent block
describe('Users', function () {
    beforeEach(function (done) { //Before each test we empty the database
        User.remove({}, function (err) {

            // Add a test user
            newUser = new User({
                "username" : "test",
                "password" : "test",
                "email" : "test@test",
                "name" : "test",
                "lastname" : "test",
                "creation_date" : Date.now(),
                "last_edition_date" : Date.now()
            });
            newUser.save(function (err, user) {
                if(err){
                    console.log(err);
                }
                done();
            });

        });

    });
    /*
     * Test the /POST route
     */
    describe('SINGUP tests', function () {
        it('it should POST a user', function (done) {
            var user = {
                email : "pass@pass",
                username : "pass",
                password : "pass",
                password2 : "pass"
            };
            chai.request(server)
                .post('/api/users/signup')
                .send(user)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('email');
                    res.body.should.have.property('username');
                    done();
                });
        });
        it('it should NOT POST a user due to the email', function (done) {
            var user = {
                password : "pass",
                password2 : "pass"
            };
            chai.request(server)
                .post('/api/users/signup')
                .send(user)
                .end(function (err, res) {
                    console.log(res.body);
                    res.should.have.status(HttpStatus.INTERNAL_SERVER_ERROR);
                    res.body.should.be.a('object');
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('message');
                    res.body.error.should.have.property('code');
                    done();
                });
        });
    });

    describe('LOGIN tests', function () {
        it('it should LOGIN a user', function (done) {
            var user = {
                email : "test@test",
                password : "test"
            };
            chai.request(server)
                .post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('email');
                    res.body.should.have.property('username');
                    done();
                });
        });
        it('it should NOT LOGIN a user due to the email', function (done) {
            var user = {
                email : "wrong@wrong",
                password : "test"
            };
            chai.request(server)
                .post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    res.should.have.status(404);
                    res.body.should.be.a('object');
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('message');
                    res.body.error.should.have.property('code');
                    done();
                });
        });
        it('it should NOT LOGIN a user due to the password', function (done) {
            var user = {
                email : "test@test",
                password : "wrong"
            };
            chai.request(server)
                .post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    res.should.have.status(401);
                    res.body.should.be.a('object');
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('message');
                    res.body.error.should.have.property('code');
                    console.log(res.body);
                    done();
                });
        });
    });


});