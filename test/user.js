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
function checkIsUser(res) {
    res.should.have.status(200);
    res.body.should.be.a('object');
    res.body.should.have.property('name');
    res.body.should.have.property('lastname');
    res.body.should.have.property('email');
    res.body.should.have.property('username');
    res.body.should.have.property('pdfs_to_sign');
    res.body.pdfs_to_sign.should.be.an.Array;
    res.body.pdfs_to_sign.length.should.be.eql(0);
    res.body.should.have.property('related_people');
    res.body.related_people.should.be.an.Array;
    res.body.related_people.length.should.be.eql(0);
}

function checkError(res) {
    res.body.should.be.a('object');
    res.body.should.have.property('error');
    res.body.error.should.have.property('message');
    res.body.error.should.have.property('code');
}
describe('Users', function () {
    beforeEach(function (done) { //Before each test we empty the database and let a test user
        User.remove({}, function (err) {

            // Add a test user
            newUser = new User({
                "username": "test",
                "password": "test",
                "email": "test@test",
                "name": "test",
                "lastname": "test",
                "creation_date": Date.now(),
                "last_edition_date": Date.now()
            });
            newUser.save(function (err, user) {
                if (err) {
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
                email: "pass@pass",
                username: "pass",
                password: "pass",
                password2: "pass",
                name: "pass",
                lastname: "pass"
            };
            chai.request(server)
                .post('/api/users/signup')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
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
                email: "test@test",
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
                email: "test@test",
                password: "wrong"
            };
            chai.request(server)
                .post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.UNAUTHORIZED);
                    checkError(res);
                    done();
                });
        });
    });

    describe('EDIT user tests', function () {
        it('it should EDIT a user', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var editedUser = {
                email: "test@test",
                password: "test",
                lastname: "editedTest"
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    agent.put('/api/users/')
                        .send(editedUser)
                        .end(function (err, res) {
                            checkIsUser(res);
                            res.body.should.have.property('lastname', 'editedTest');
                            done();
                        });
                });
        });
        it('it should NOT EDIT a user', function (done) {
            var agent = chai.request.agent(server);
            agent.put('/api/users')
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.FORBIDDEN);
                    checkError(res);
                    done();
                });
        });
    });

    describe('GET user tests', function () {
        it('it should GET a user', function (done) {
            var user = {
                email: "test@test",
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
                    res.should.have.status(HttpStatus.FORBIDDEN);
                    checkError(res);
                    done();
                });
        });
    });

    describe('DELETE user tests', function () {
        it('it should DELETE a user', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    agent.delete('/api/users')
                        .send(user)
                        .end(function (err, res) {
                            res.should.have.status(HttpStatus.OK);
                            res.body.should.have.property('message', 'User deleted');
                            done();
                        });
                });
        });
        it('it should NOT DELETE a user', function (done) {
            var agent = chai.request.agent(server);
            agent.delete('/api/users/')
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.FORBIDDEN);
                    checkError(res);
                    done();
                });
        });
    });

    describe('LOGOUT user tests', function () {
        it('it should LOGOUT a user', function (done) {
            var user = {
                email: "test@test",
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
            agent.delete('/api/users/')
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.FORBIDDEN);
                    checkError(res);
                    done();
                });
        });
    });
});