/**
 * Created by Marcos on 15/05/2017.
 */

//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var User = require('../public/routes/models/user');
var usersRoutes = require('../routes/users');

//Require the dev-dependencies
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../app');
var should = chai.should();
var HttpStatus = require('http-status-codes');
var AppStatus = require('../public/routes/app-err-codes-en');

chai.use(chaiHttp);
//Our parent block
function checkIsUser(res) {
    res.should.have.status(200);
    res.body.should.be.a('object');
    res.body.user.should.have.property('name');
    res.body.user.should.have.property('lastname');
    res.body.user.should.have.property('email');
    res.body.user.should.have.property('pdfs_to_sign');
    res.body.user.should.have.property('pdfs_owned');
    res.body.user.should.have.property('pdfs_signed');
    res.body.user.pdfs_to_sign.should.be.an.Array;
    // res.body.pdfs_to_sign.length.should.be.eql(0);
    res.body.user.should.have.property('related_people');
    res.body.user.related_people.should.be.an.Array;
    // res.body.related_people.length.should.be.eql(0);
}

function checkError(res) {
    res.body.should.be.a('object');
    res.body.should.have.property('message');
    res.body.should.have.property('code');
}
describe('Users', function () {
    var testUser1;
    var testUser2;
    beforeEach(function (done) { //Before each test we empty the database and let test1@test and test2@test users
        User.remove({}, function (err) {

            // Add a test1@test user
            newUser1 = new User({
                "password": "test",
                "email": "test@test.com",
                "name": "test",
                "lastname": "test",
                "activated": false,
                "creation_date": Date.now(),
                "last_edition_date": Date.now(),
                "pdfs_to_sign": [],
                "pdfs_signed": [],
                "pdfs_owned": [],
                "related_people": []
            });
            newUser1.save(function (err, user) {
                if (err) {
                    console.log(err);
                } else {
                    testUser1 = user;
                    newUser2 = new User({
                        "password": "test2",
                        "email": "test2@test.com",
                        "name": "test2",
                        "lastname": "test2",
                        "activated": false,
                        "creation_date": Date.now(),
                        "last_edition_date": Date.now(),
                        "pdfs_to_sign": [],
                        "pdfs_signed": [],
                        "pdfs_owned": [],
                        "related_people": [{_id: user._id}]
                    });
                    newUser2.save(function(err, user){
                        if (err) {
                            console.log(err);
                        } else {
                            testUser2 = user;
                        }
                        done();
                    });
                }

            });
        });

    });
    /*
     * Test the /POST route
     */
    describe('SINGUP tests', function () {
        it('it should POST a user', function (done) {
            var user = {
                email: "sobrenombre@gmail.com",
                name: "TestName",
                lastname: "TestLastName"
            };
            chai.request(server)
                .post('/api/users/signup')
                .send(user)
                .end(function (err, res) {
                    res.body.should.have.property('code', 0);
                    res.body.should.have.property('message');
                    console.log(res.body);
                    done();
                });
        });
        it('it should NOT POST a user due to the email', function (done) {
            var user = {
                password: "pass",
                password2: "pass"
            };
            chai.request(server)
                .post('/api/users/signup')
                .send(user)
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.BAD_REQUEST);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    res.body.should.have.property('code', AppStatus.BAD_REQUEST);
                    done();
                });
        });
    });

    describe('LOGIN tests', function () {
        it('it should LOGIN a user', function (done) {
            var user = {
                email: "test@test.com",
                password: "test"
            };
            chai.request(server)
                .post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    done();
                });
        });
        it('it should NOT LOGIN a user due to the email', function (done) {
            var user = {
                email: "wrong@wrong",
                password: "test"
            };
            chai.request(server)
                .post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.UNAUTHORIZED);
                    res.body.should.be.a('object');
                    res.body.should.have.property('message');
                    res.body.should.have.property('code', AppStatus.USER_NOT_FOUND);
                    done();
                });
        });
        it('it should NOT LOGIN a user due to the password', function (done) {
            var user = {
                email: "test@test.com",
                password: "wrong"
            };
            chai.request(server)
                .post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.UNAUTHORIZED);
                    checkError(res);
                    res.body.should.have.property('code', AppStatus.INCORRECT_PASS);
                    done();
                });
        });
    });

    describe('EDIT user tests', function () {
        it('it should EDIT a user', function (done) {
            var user = {
                email: "test@test.com",
                password: "test"
            };
            var editedUser = {
                email: "test@test.com",
                password: "test",
                lastname: "editedTest"
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    agent.patch('/api/users/')
                        .send(editedUser)
                        .end(function (err, res) {
                            checkIsUser(res);
                            res.body.user.should.have.property('lastname', 'editedTest');
                            done();
                        });
                });
        });
        it('it should NOT EDIT a user cause I am not logged', function (done) {
            var agent = chai.request.agent(server);
            agent.patch('/api/users')
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.UNAUTHORIZED);
                    checkError(res);
                    res.body.should.have.property('code', AppStatus.NOT_LOGGED);
                    done();
                });
        });
    });

    describe('GET user tests', function () {
        it('it should GET a user', function (done) {
            var user = {
                email: "test@test.com",
                password: "test"
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    agent.get('/api/users/info')
                        .end(function (err, res) {
                            checkIsUser(res);
                            done();
                        });
                });
        });
        it('it should NOT GET a user', function (done) {
            var agent = chai.request.agent(server);
            agent.get('/api/users/info')
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.UNAUTHORIZED);
                    checkError(res);
                    res.body.should.have.property('code', AppStatus.NOT_LOGGED);
                    done();
                });
        });
    });

    describe('DESACTIVATE user tests', function () {
        it('it should DESACTIVATE a user', function (done) {
            var user = {
                email: "test@test.com",
                password: "test"
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    agent.patch('/api/users/desactivate')
                        .send(user)
                        .end(function (err, res) {
                            res.should.have.status(HttpStatus.OK);
                            res.body.should.have.property('code', 0);
                            res.body.should.have.property('message');
                            done();
                        });
                });
        });
        it('it should NOT DESACTIVATE a user', function (done) {
            var agent = chai.request.agent(server);
            agent.patch('/api/users/desactivate')
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.UNAUTHORIZED);
                    checkError(res);
                    res.body.should.have.property('code', AppStatus.NOT_LOGGED);
                    res.body.should.have.property('message');
                    done();
                });
        });
    });

    describe('LOGOUT user tests', function () {
        it('it should LOGOUT a user', function (done) {
            var user = {
                email: "test@test.com",
                password: "test"
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    agent.post('/api/users/logout')
                        .send(user)
                        .end(function (err, res) {
                            res.should.have.status(HttpStatus.OK);
                            res.body.should.have.property('message', 'Logged out correctly');
                            done();
                        });
                });
        });
        it('it should NOT LOGOUT a user', function (done) {
            var agent = chai.request.agent(server);
            agent.post('/api/users/logout')
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.UNAUTHORIZED);
                    checkError(res);
                    res.body.should.have.property('code', AppStatus.NOT_LOGGED);
                    done();
                });
        });
    });
});