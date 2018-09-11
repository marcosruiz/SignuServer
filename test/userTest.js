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
    res.body.should.have.property('code');
    res.body.should.have.property('message');
    res.body.should.have.property('data');
    res.body.data.user.should.have.property('name');
    res.body.data.user.should.have.property('lastname');
    res.body.data.user.should.have.property('email');
    res.body.data.user.should.have.property('pdfs_to_sign');
    res.body.data.user.should.have.property('pdfs_owned');
    res.body.data.user.should.have.property('pdfs_signed');
    res.body.data.user.pdfs_to_sign.should.be.an.Array;
    // res.body.pdfs_to_sign.length.should.be.eql(0);
    res.body.data.user.should.have.property('users_related');
    res.body.data.user.users_related.should.be.an.Array;
    // res.body.related_people.length.should.be.eql(0);
}

function checkError(res) {
    res.body.should.be.a('object');
    res.body.should.have.property('message');
    res.body.should.have.property('code');
    res.body.code.should.be.above(999);
}

describe('Users', function () {
    var testUser1;
    var testUser2;
    var testUser3;
    beforeEach(function (done) { //Before each test we empty the database and let test1@test and test2@test users
        User.remove({}, function (err) {

            // Add a test1@test user
            newUser1 = new User({
                "password": "test",
                "email": "test@test.com",
                "name": "test",
                "lastname": "test",
                "activation.is_activated": true,
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
                        "activation.is_activated": true,
                        "creation_date": Date.now(),
                        "last_edition_date": Date.now(),
                        "pdfs_to_sign": [],
                        "pdfs_signed": [],
                        "pdfs_owned": [],
                        "related_people": [{_id: user._id}]
                    });
                    newUser2.save(function (err, user) {
                        if (err) {
                            console.log(err);
                        } else {
                            testUser2 = user;
                            newUser3 = new User({
                                "password": "test3",
                                "email": "test3@test.com",
                                "name": "test3",
                                "lastname": "test3",
                                "activation.is_activated": false,
                                "creation_date": Date.now(),
                                "last_edition_date": Date.now(),
                                "pdfs_to_sign": [],
                                "pdfs_signed": [],
                                "pdfs_owned": [],
                                "related_people": [{_id: user._id}]
                            });
                            newUser3.save(function (err, user) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    testUser3 = user;
                                }
                                done();
                            });
                        }

                    });
                }

            });
        })
            ;

        });
        /*
         * Test the /POST route
         */
        describe('SINGUP tests', function () {
            it('it should POST a user', function (done) {
                var user = {
                    email: "sobrenombre@gmail.com",
                    name: "TestName",
                    lastname: "TestLastName",
                    password: "TestPassword"
                };
                chai.request(server)
                    .post('/api/users/signup')
                    .send(user)
                    .end(function (err, res) {
                        checkIsUser(res);
                        res.body.should.have.property('code', AppStatus.SUCCESS);
                        res.body.should.have.property('message');
                        done();
                    });
            });
            it('it should POST a user cause it is not activated', function (done) {
                var user = {
                    email: "test3@test.com",
                    name: "TestName",
                    lastname: "TestLastName",
                    password: "TestPassword"
                };
                chai.request(server)
                    .post('/api/users/signup')
                    .send(user)
                    .end(function (err, res) {
                        checkIsUser(res);
                        res.body.should.have.property('code', AppStatus.SUCCESS);
                        res.body.should.have.property('message');
                        done();
                    });
            });
            it('it should NOT POST cause it is already activated', function (done) {
                var user = {
                    email: "test@test.com",
                    name: "TestName",
                    lastname: "TestLastName",
                    password: "TestPassword"
                };
                chai.request(server)
                    .post('/api/users/signup')
                    .send(user)
                    .end(function (err, res) {
                        checkError(res);
                        done();
                    });
            });
            it('it should NOT POST a user due to the email', function (done) {
                var user = {
                    email: "emailTest",
                    name: "nameTest",
                    lastname: "lastnameTest",
                    password: "passwordTest"
                };
                chai.request(server)
                    .post('/api/users/signup')
                    .send(user)
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.BAD_REQUEST);
                        res.body.should.be.a('object');
                        res.body.should.have.property('message');
                        res.body.should.have.property('code', AppStatus.EMAIL_ERROR);
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
                        console.log(res.body);
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
                        checkError(res);
                        res.should.have.status(HttpStatus.UNAUTHORIZED);
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
                        checkError(res);
                        res.should.have.status(HttpStatus.UNAUTHORIZED);
                        res.body.should.have.property('code', AppStatus.INCORRECT_PASS);
                        done();
                    });
            });
            it('it should NOT LOGIN a user cause it is not activated', function (done) {
                var user = {
                    email: "test3@test.com",
                    password: "test3"
                };
                chai.request(server)
                    .post('/api/users/login')
                    .send(user)
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.UNAUTHORIZED);
                        res.body.should.have.property('code', AppStatus.USER_DESACTIVATED);
                        done();
                    });
            });
        });

        describe('EDIT user tests', function () {
            it('it should EDIT password of a user', function (done) {
                var user = {
                    email: "test@test.com",
                    password: "test"
                };
                var editedUser = {
                    password: "newPassTest"
                };
                var agent = chai.request.agent(server);
                agent.post('/api/users/login')
                    .send(user)
                    .end(function (err, res) {
                        agent.put('/api/users/')
                            .send(editedUser)
                            .end(function (err, res) {
                                console.log(res.body);
                                checkIsUser(res);
                                res.body.data.user.should.have.property('lastname', 'test');
                                res.body.data.user.should.have.property('name', 'test');
                                res.body.data.user.should.have.property('email', 'test@test.com');
                                done();
                            });
                    });
            });
            it('it should EDIT the name a user', function (done) {
                var user = {
                    email: "test@test.com",
                    password: "test"
                };
                var editedUser = {
                    name: "newNameTest"
                };
                var agent = chai.request.agent(server);
                agent.post('/api/users/login')
                    .send(user)
                    .end(function (err, res) {
                        agent.put('/api/users/')
                            .send(editedUser)
                            .end(function (err, res) {
                                checkIsUser(res);
                                res.body.data.user.should.have.property('lastname', 'test');
                                res.body.data.user.should.have.property('name', 'newNameTest');
                                res.body.data.user.should.have.property('email', 'test@test.com');
                                done();
                            });
                    });
            });

            it('it should EDIT lastname of a user', function (done) {
                var user = {
                    email: "test@test.com",
                    password: "test"
                };
                var editedUser = {
                    lastname: "newLastnameTest"
                };
                var agent = chai.request.agent(server);
                agent.post('/api/users/login')
                    .send(user)
                    .end(function (err, res) {
                        agent.put('/api/users/')
                            .send(editedUser)
                            .end(function (err, res) {
                                checkIsUser(res);
                                res.body.data.user.should.have.property('lastname', 'newLastnameTest');
                                res.body.data.user.should.have.property('name', 'test');
                                res.body.data.user.should.have.property('email', 'test@test.com');
                                done();
                            });
                    });
            });

            it('it should EDIT name, lastname and password of a user', function (done) {
                var user = {
                    email: "test@test.com",
                    password: "test"
                };
                var editedUser = {
                    password: "newPasswordTest",
                    lastname: "newLastnameTest",
                    name: "newNameTest"
                };
                var agent = chai.request.agent(server);
                agent.post('/api/users/login')
                    .send(user)
                    .end(function (err, res) {
                        agent.put('/api/users/')
                            .send(editedUser)
                            .end(function (err, res) {
                                checkIsUser(res);
                                res.body.data.user.should.have.property('lastname', 'newLastnameTest');
                                res.body.data.user.should.have.property('name', 'newNameTest');
                                res.body.data.user.should.have.property('email', 'test@test.com');
                                done();
                            });
                    });
            });

            it('TODO it should EDIT email of a user', function (done) {
                // TODO
                var user = {
                    email: "test@test.com",
                    password: "test"
                };
                var editedUser = {
                    email: "newTest@newTest.com"
                };
                var agent = chai.request.agent(server);
                agent.post('/api/users/login')
                    .send(user)
                    .end(function (err, res) {
                        agent.put('/api/users/')
                            .send(editedUser)
                            .end(function (err, res) {
                                checkError(res);
                                done();
                            });
                    });
            });

            it('it should NOT EDIT a user cause I am not logged', function (done) {
                var agent = chai.request.agent(server);
                agent.put('/api/users')
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.UNAUTHORIZED);
                        res.body.should.have.property('code', AppStatus.NOT_LOGGED);
                        done();
                    });
            });

            it('it should NOT EDIT a user', function (done) {
                var user = {
                    email: "test@test.com",
                    password: "test"
                };
                var editedUser = {
                    wrong: "newPassTest"
                };
                var agent = chai.request.agent(server);
                agent.post('/api/users/login')
                    .send(user)
                    .end(function (err, res) {
                        agent.put('/api/users/')
                            .send(editedUser)
                            .end(function (err, res) {
                                checkError(res);
                                done();
                            });
                    });
            });

            it('it should ADD A RELATED_USER', function (done) {
                // TODO
                var user = {
                    email: "test@test.com",
                    password: "test"
                };
                var agent = chai.request.agent(server);
                agent.post('/api/users/login')
                    .send(user)
                    .end(function (err, res) {
                        agent.patch('/api/users/related/' + testUser2._id)
                            .end(function (err, res) {
                                checkIsUser(res);
                                res.body.user.should.have.property('lastname', 'editedTest');
                                done();
                            });
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
                        agent.put('/api/users/desactivate')
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
                agent.put('/api/users/desactivate')
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