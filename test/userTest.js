/**
 * Created by Marcos on 15/05/2017.
 */

//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

//Mongoose
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var User = require('../routes/models/user');
var Pdf = require('../routes/models/pdf');
var Client = require('../routes/models/client');
var config = require('config');
var fs = require('fs');

//Require the dev-dependencies
var mocha = require('mocha');
var request = require('supertest');
var chai = require('chai');
var expect = require('chai').expect;
var chaiHttp = require('chai-http');
var server = require('../app');
var HttpStatus = require('http-status-codes');
var AppStatus = require('../public/routes/app-err-codes-en');

var checkUser = require('./commonTestFunctions').checkUser;
var checkToken = require('./commonTestFunctions').checkToken;
var checkError = require('./commonTestFunctions').checkError;
var oauthLogin = require('./commonTestFunctions').oauthLogin;

chai.use(chaiHttp);

const userCredentials = {
    email: 'test@test',
    password: 'test'
}
var authenticatedUser = request.agent(server);

describe('Users', function () {
    var testUser1, testUser2, testUser3;
    var testPdf1;
    var testClient1;

    /**
     * Create a client
     */
    mocha.before(function (done) {
        testClient1 = new Client({clientId: 'application', clientSecret: 'secret'});
        done();
    });

    /**
     * Delete all clients
     */
    mocha.after(function (done) {
        done();
    });

    /**
     * Create users and pdfs
     */
    beforeEach(function (done) {
        // Delete all test files
        var arrayFiles = fs.readdirSync(config.uploads_dir);
        var i;
        for (i = 0; i < arrayFiles.length; i++) {
            fs.unlink(config.uploads_dir + arrayFiles[i]);
        }
        // End delete all test files

        // Add users and pdfs
        User.remove({}, function (err) {
            // Owner on 1,2,3,4,5 and singer on 4,5
            var newUser1 = new User({
                "password": "test",
                "email": "test@test",
                "name": "test",
                "lastname": "test",
                "creation_date": Date.now(),
                "last_edition_date": Date.now(),
                "pdfs_to_sign": [],
                "pdfs_signed": [],
                "pdfs_owned": [],
                "related_people": [],
                "activation": {is_activated: true, when: Date.now()}
            });
            // Signer on 1,2,4,5
            var newUser2 = new User({
                "password": "test2",
                "email": "test2@test2",
                "name": "test2",
                "lastname": "test2",
                "creation_date": Date.now(),
                "last_edition_date": Date.now(),
                "pdfs_to_sign": [],
                "pdfs_signed": [],
                "pdfs_owned": [],
                "related_people": [],
                "activation": {is_activated: true, when: Date.now()}
            });
            // Independient user
            var newUser3 = new User({
                "password": "test3",
                "email": "test3@test3",
                "name": "test3",
                "lastname": "test3",
                "creation_date": Date.now(),
                "last_edition_date": Date.now(),
                "pdfs_to_sign": [],
                "pdfs_signed": [],
                "pdfs_owned": [],
                "related_people": [],
                "activation": {is_activated: true, when: Date.now()}
            });

            // Adding users
            newUser1.save(function (err, user) {
                testUser1 = user;
                newUser2.save(function (err, user) {
                    testUser2 = user;
                    newUser3.save(function (err, user) {
                        testUser3 = user;
                        Pdf.remove({}, function () {
                            var newPdf = new Pdf({
                                original_name: "original_name",
                                owner_id: testUser1._id,
                                mime_type: "application/pdf",
                                file_name: "test",
                                path: config.uploads_dir + "test",
                                destination: config.uploads_dir,
                                encoding: "7bit",
                                is_any_user_signing: undefined,
                                creation_date: Date.now(),
                                last_edition_date: Date.now(),
                                signers: [{
                                    _id: testUser2._id,
                                    is_signed: false,
                                    signature_date: undefined
                                }]
                            });
                            var newPdf2 = new Pdf({
                                original_name: "original_name",
                                owner_id: testUser1._id,
                                mime_type: "application/pdf",
                                with_stamp: false,
                                file_name: "test2",
                                path: config.uploads_dir + "test2",
                                destination: config.uploads_dir,
                                encoding: "7bit",
                                is_any_user_signing: undefined,
                                creation_date: Date.now(),
                                last_edition_date: Date.now(),
                                signers: [{
                                    _id: testUser2._id,
                                    is_signed: true,
                                    signature_date: Date.now()
                                }]
                            });
                            var newPdf3 = new Pdf({
                                original_name: "original_name",
                                owner_id: testUser1._id,
                                mime_type: "application/pdf",
                                file_name: "test3",
                                path: config.uploads_dir + "test3",
                                destination: config.uploads_dir,
                                encoding: "7bit",
                                is_any_user_signing: undefined,
                                creation_date: Date.now(),
                                last_edition_date: Date.now(),
                                signers: []
                            });
                            var newPdf4 = new Pdf({
                                original_name: "original_name",
                                owner_id: testUser1._id,
                                mime_type: "application/pdf",
                                file_name: "test4",
                                path: config.uploads_dir + "test4",
                                destination: config.uploads_dir,
                                encoding: "7bit",
                                is_any_user_signing: undefined,
                                creation_date: Date.now(),
                                last_edition_date: Date.now(),
                                signers: [{
                                    _id: testUser2._id,
                                    is_signed: true,
                                    signature_date: Date.now()
                                }, {
                                    _id: testUser1._id,
                                    is_signed: false,
                                    signature_date: undefined
                                }],
                                with_stamp: true
                            });
                            var newPdf5 = new Pdf({
                                original_name: "original_name",
                                owner_id: testUser1._id,
                                mime_type: "application/pdf",
                                file_name: "test5",
                                path: config.uploads_dir + "test5",
                                destination: config.uploads_dir,
                                encoding: "7bit",
                                is_any_user_signing: undefined,
                                creation_date: Date.now(),
                                last_edition_date: Date.now(),
                                signers: [{
                                    _id: testUser2._id,
                                    is_signed: false,
                                    signature_date: undefined
                                }, {
                                    _id: testUser1._id,
                                    is_signed: false,
                                    signature_date: undefined
                                }],
                                with_stamp: true
                            });
                            newPdf.save(function (err, pdf) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    testPdf1 = pdf;
                                    newPdf2.save(function (err, pdf) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            testPdf2 = pdf;
                                            newPdf3.save(function (err, pdf) {
                                                if (err) {
                                                    console.log(err);
                                                } else {
                                                    testPdf3 = pdf;
                                                    newPdf4.save(function (err, pdf) {
                                                        if (err) {
                                                            console.log(err);
                                                        } else {
                                                            testPdf4 = pdf;
                                                            newPdf5.save(function (err, pdf) {
                                                                if (err) {
                                                                    console.log(err);
                                                                } else {
                                                                    testPdf5 = pdf;
                                                                    // Edit users
                                                                    // TODO: ADD users
                                                                    testUser1.password = "test";
                                                                    testUser2.password = "test2";
                                                                    testUser1.pdfs_owned = [testPdf1._id, testPdf2._id, testPdf3._id, testPdf4._id, testPdf5._id];
                                                                    testUser1.pdfs_to_sign = [testPdf4._id, testPdf5._id];
                                                                    testUser2.pdfs_to_sign = [testPdf1._id, testPdf2._id, testPdf4._id, testPdf5._id];
                                                                    testUser1.save(function (err, res) {
                                                                        if (err) {
                                                                            console.log(err)
                                                                        } else {
                                                                            testUser2.save(function (err, res) {
                                                                                if (err) {
                                                                                    console.log(err)
                                                                                } else {
                                                                                    //Create a test file
                                                                                    fs.createReadStream('test/testFiles/test.pdf').pipe(fs.createWriteStream(config.uploads_dir + 'test'));
                                                                                    fs.createReadStream('test/testFiles/test.pdf').pipe(fs.createWriteStream(config.uploads_dir + 'test2'));
                                                                                    fs.createReadStream('test/testFiles/test.pdf').pipe(fs.createWriteStream(config.uploads_dir + 'test3'));
                                                                                    fs.createReadStream('test/testFiles/test.pdf').pipe(fs.createWriteStream(config.uploads_dir + 'test4'));
                                                                                    fs.createReadStream('test/testFiles/test.pdf').pipe(fs.createWriteStream(config.uploads_dir + 'test5'));
                                                                                    done();
                                                                                }
                                                                            });
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        });
                    });
                });
            });
        });
    });

    /**
     * Delete all users and pdfs
     */
    afterEach(function (done) {
        User.remove({}, function (err) {
            if (err) {
                console.log(err);
            } else {
                Pdf.remove({}, function () {
                    if (err) {
                        console.log(err);
                    } else {
                        done();
                    }
                });
            }
        });
    });

    /*
     * Test the /POST route
     */
    describe('CREATE USER tests', function () {
        it('it should POST a user', function (done) {
            var user = {
                email: "testEmail@test",
                name: "TestName",
                lastname: "TestLastName",
                password: "TestPassword"
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/create')
                .send(user)
                .end(function (err, res) {
                    checkUser(res);
                    var port = server.get('port');
                    res.body.should.have.property('code', AppStatus.SUCCESS);
                    res.body.should.have.property('message');
                    done();
                });
        });
        it('it should POST a user and activate it', function (done) {
            var user = {
                email: "sobrenombre@gmail.com",
                name: "TestName",
                lastname: "TestLastName",
                password: "TestPassword"
            };
            chai.request(server)
                .post('/api/users/create')
                .send(user)
                .end(function (err, res) {
                    checkUser(res);
                    res.body.should.have.property('code', AppStatus.SUCCESS);
                    res.body.should.have.property('message');
                    res.body.data.user.activation.should.have.property('is_activated', false);
                    res.body.data.should.have.property('code_raw');
                    var body = {_id: res.body.data.user._id, code: res.body.data.code_raw};
                    chai.request(server)
                        .put('/api/users/authemail/')
                        .send(body)
                        .end(function (err, res) {
                            checkUser(res);
                            res.body.should.have.property('code');
                            res.body.should.have.property('message');
                            res.body.data.user.activation.should.have.property('is_activated', true);
                            done();
                        });
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
                .post('/api/users/create')
                .send(user)
                .end(function (err, res) {
                    checkUser(res);
                    res.body.should.have.property('code', AppStatus.SUCCESS);
                    res.body.should.have.property('message');
                    done();
                });
        });
        it('it should NOT POST cause it is already activated', function (done) {
            var user = {
                email: "test@test",
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
        it('it should NOT POST a user due to the email but it POST due to we are test mode', function (done) {
            var user = {
                email: "emailTest",
                name: "nameTest",
                lastname: "lastnameTest",
                password: "passwordTest"
            };
            chai.request(server)
                .post('/api/users/create')
                .send(user)
                .end(function (err, res) {
                    checkUser(res);
                    res.body.should.have.property('message');
                    res.body.should.have.property('code');

                    // checkError(res);
                    // res.should.have.status(HttpStatus.BAD_REQUEST);
                    // res.body.should.be.a('object');
                    // res.body.should.have.property('message');
                    // res.body.should.have.property('code', AppStatus.EMAIL_ERROR);
                    done();
                });
        });
    });

    describe('LOGIN tests with OAUTH2', function () {

        // it('it should LOGIN a user', function (done) {
        //     var user = {
        //         email: "test2@test2.com",
        //         password: "test2"
        //     };
        //     oauthLogin(user, function (err, res) {
        //         if (!err) {
        //             done();
        //         }
        //     });
        // });
        // it('it should LOGIN a user with pdfs and related', function (done) {
        //     var user = {
        //         email: "test2@test2.com",
        //         password: "test2"
        //     };
        //     oauthLogin(user, function (err, res) {
        //         if (!err) {
        //             done();
        //         }
        //     });
        // });
        it('it should NOT LOGIN a user due to the email', function (done) {
            var user = {
                email: "wrong@wrong",
                password: "test"
            };
            request(server).post('/oauth2/token')
                .type('form')
                .send({
                    grant_type: 'password',
                    username: user.email,
                    password: user.password,
                    client_id: "application",
                    client_secret: "secret"
                })
                .end(function (err, res) {
                    res.body.should.have.property('code', 503);
                    res.body.should.have.property('error', 'server_error');
                    res.body.should.have.property('error_description', 'server_error');
                    done();
                });

        });
        it('it should NOT LOGIN a user due to the password', function (done) {
            var user = {
                email: "test@test",
                password: "wrong"
            };
            request(server).post('/oauth2/token')
                .type('form')
                .send({
                    grant_type: 'password',
                    username: user.email,
                    password: user.password,
                    client_id: "application",
                    client_secret: "secret"
                })
                .end(function (err, res) {
                    res.body.should.have.property('code', 503);
                    res.body.should.have.property('error', 'server_error');
                    res.body.should.have.property('error_description', 'server_error');
                    done();
                });
        });
        it('it should NOT LOGIN a user cause it is not activated', function (done) {
            var user = {
                email: "test3@test.com",
                password: "test3"
            };
            request(server).post('/oauth2/token')
                .type('form')
                .send({
                    grant_type: 'password',
                    username: user.email,
                    password: user.password,
                    client_id: "application",
                    client_secret: "secret"
                })
                .end(function (err, res) {
                    res.body.should.have.property('code', 503);
                    res.body.should.have.property('error', 'server_error');
                    res.body.should.have.property('error_description', 'server_error');
                    done();
                });
        });
    });

    describe('EDIT user tests', function () {
        it('it should EDIT password of a user', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var editedUser = {
                email: "test@test",
                password: "newPassTest"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                agent.put('/api/users/password')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send(editedUser)
                    .end(function (err, res) {
                        checkUser(res);
                        res.body.data.user.should.have.property('lastname', 'test');
                        res.body.data.user.should.have.property('name', 'test');
                        res.body.data.user.should.have.property('email', 'test@test');
                        oauthLogin(editedUser, function (err, res) {
                            done();
                        });
                    });
            });
        });
        it('it should EDIT password of a user using POST', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var editedUser = {
                _method: "put",
                password: "newPassTest"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                agent.post('/api/users/password')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send(editedUser)
                    .end(function (err, res) {
                        checkUser(res);
                        res.body.data.user.should.have.property('lastname', 'test');
                        res.body.data.user.should.have.property('name', 'test');
                        res.body.data.user.should.have.property('email', 'test@test');
                        editedUser.email = user.email;
                        oauthLogin(editedUser, function (err, res) {
                            done();
                        });
                    });
            });
        });
        it('it should EDIT the name a user', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var editedUser = {
                name: "newNameTest"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                agent.put('/api/users/')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send(editedUser)
                    .end(function (err, res) {
                        checkUser(res);
                        res.body.data.user.should.have.property('lastname', 'test');
                        res.body.data.user.should.have.property('name', 'newNameTest');
                        res.body.data.user.should.have.property('email', 'test@test');
                        done();
                    });
            });
        });

        it('it should EDIT lastname and name of a user', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var editedUser = {
                name: "newNameTest",
                lastname: "newLastnameTest"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                agent.put('/api/users/')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send(editedUser)
                    .end(function (err, res) {
                        checkUser(res);
                        res.body.data.user.should.have.property('lastname', 'newLastnameTest');
                        res.body.data.user.should.have.property('name', 'newNameTest');
                        res.body.data.user.should.have.property('email', 'test@test');
                        done();
                    });
            });
        });

        it('it should EDIT lastname and name of a user using POST', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var editedUser = {
                _method: "put",
                name: "newNameTest",
                lastname: "newLastnameTest"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                agent.post('/api/users/')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send(editedUser)
                    .end(function (err, res) {
                        checkUser(res);
                        res.body.data.user.should.have.property('lastname', 'newLastnameTest');
                        res.body.data.user.should.have.property('name', 'newNameTest');
                        res.body.data.user.should.have.property('email', 'test@test');
                        done();
                    });
            });
        });

        it('it should EDIT lastname of a user', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var editedUser = {
                lastname: "newLastnameTest"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                agent.put('/api/users/')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send(editedUser)
                    .end(function (err, res) {
                        checkUser(res);
                        res.body.data.user.should.have.property('lastname', 'newLastnameTest');
                        res.body.data.user.should.have.property('name', 'test');
                        res.body.data.user.should.have.property('email', 'test@test');
                        done();
                    });
            });

        });

        it('it should EDIT email of a user', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var editedUser = {
                email: "sobrenombre@gmail.com"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                agent.put('/api/users/email')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send(editedUser)
                    .end(function (err, res) {
                        checkUser(res);
                        res.body.data.user.next_email.should.have.property('email', 'sobrenombre@gmail.com');
                        res.body.data.user.should.have.property('email', 'test@test');
                        res.body.data.user.next_email.should.have.property('code');
                        agent.put('/api/users/authnextemail')
                            .send({_id: testUser1._id, code: res.body.data.user.next_email.code})
                            .end(function (err, res) {
                                checkUser(res);
                                res.body.data.user.should.have.property('email', 'sobrenombre@gmail.com');
                                done();
                            });
                    });
            });
        });

        it('it should EDIT email of a user using POST', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var editedUser = {
                _method: "put",
                email: "sobrenombre@gmail.com"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                agent.post('/api/users/email')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send(editedUser)
                    .end(function (err, res) {
                        checkUser(res);
                        res.body.data.user.next_email.should.have.property('email', 'sobrenombre@gmail.com');
                        res.body.data.user.should.have.property('email', 'test@test');
                        res.body.data.user.next_email.should.have.property('code');
                        agent.put('/api/users/authnextemail')
                            .send({_id: testUser1._id, code: res.body.data.user.next_email.code})
                            .end(function (err, res) {
                                checkUser(res);
                                res.body.data.user.should.have.property('email', 'sobrenombre@gmail.com');
                                done();
                            });
                    });
            });
        });

        it('it should NOT EDIT a user cause I am not logged', function (done) {
            var agent = chai.request.agent(server);
            agent.put('/api/users')
                .end(function (err, res) {
                    checkError(res);
                    res.should.have.status(HttpStatus.BAD_REQUEST);
                    res.body.should.have.property('code', AppStatus.BAD_REQUEST);
                    res.body.should.have.property('message', 'The access token was not found');
                    done();
                });
        });

        it('it should NOT EDIT a user cause wrong req.body', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var editedUser = {
                wrong: "newPassTest"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                var user1 = res.body.data.user;
                agent.put('/api/users/')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send(editedUser)
                    .end(function (err, res) {
                        checkUser(res);
                        var user2 = res.body.data.user;
                        expect(user1.creation_date).to.equal(user2.creation_date);
                        expect(user1.email).to.equal(user2.email);
                        expect(user1._id).to.equal(user2._id);
                        expect(user1.last_edition_date).to.not.equal(user2.last_edition_date);
                        expect(user1.pdfs_owned.length).to.equal(user2.pdfs_owned.length);
                        expect(user1.pdfs_to_sign.length).to.equal(user2.pdfs_to_sign.length);
                        expect(user1.users_related.length).to.equal(user2.users_related.length);
                        expect(user1.name).to.equal(user2.name);
                        expect(user1.lastname).to.equal(user2.lastname);
                        done();
                    });
            });
        });

        it('it should ADD A RELATED_USER', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, resUser, resToken) {
                var numUsers1 = resUser.body.data.user.users_related.length;
                var auth = 'Bearer ' + resToken.body.access_token;
                agent.put('/api/users/related/')
                    .set('Authorization', auth)
                    .send({related_id: testUser3._id})
                    .end(function (err, res) {
                        checkUser(res);
                        var numUsers2 = res.body.data.user.users_related.length;
                        res.body.data.user.users_related.should.be.an.Array;
                        numUsers2.should.be.equal(numUsers1 + 1);
                        done();
                    });
            });
        });
        it('it should ADD A RELATED_USER using POST', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                var numUsers1 = res.body.data.user.users_related.length;
                agent.post('/api/users/related/')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send({_method: 'put', related_id: testUser3._id})
                    .end(function (err, res) {
                        checkUser(res);
                        var numUsers2 = res.body.data.user.users_related.length;
                        res.body.data.user.users_related.should.be.an.Array;
                        numUsers2.should.be.equal(numUsers1 + 1);
                        done();
                    });
            });
        });
        it('it should NOT ADD A RELATED_USER cause I am not logged', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            agent.put('/api/users/related/')
                .send({related_id: testUser3._id})
                .end(function (err, res) {
                    checkError(res);
                    res.should.have.status(HttpStatus.BAD_REQUEST);
                    res.body.should.have.property('code', AppStatus.BAD_REQUEST);
                    res.body.should.have.property('message', 'The access token was not found');
                    done();
                });
        });


        // it('it should NOT ADD A RELATED_USER cause it is already in it', function (done) {
        //     var user = {
        //         email: "test@test",
        //         password: "test"
        //     };
        //     var agent = chai.request.agent(server);
        //     oauthLogin(user, function (err, res, resToken) {
        //         var numUsers1 = res.body.data.user.users_related.length;
        //         agent.put('/api/users/related/')
        //             .set('Authorization', 'Bearer ' + resToken.body.access_token)
        //             .send({related_id: testUser2._id})
        //             .end(function (err, res) {
        //                 checkUser(res);
        //                 var numUsers2 = res.body.data.user.users_related.length;
        //                 res.body.data.user.users_related.should.be.an.Array;
        //                 numUsers2.should.be.equal(numUsers1);
        //                 done();
        //             });
        //     });
        // });

        it('it should NOT ADD A RELATED_USER cause it is invalid', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    agent.put('/api/users/related/')
                        .send({related_id: 'djasdjkl'})
                        .end(function (err, res) {
                            checkError(res);
                            res.body.code.should.be.equal(AppStatus.BAD_REQUEST);
                            done();
                        });
                });
        });
        it('it should NOT ADD A RELATED_USER cause it not exists', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                agent.put('/api/users/related/')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send({related_id: '5b9b93beb4905736bc99e262'})
                    .end(function (err, res) {
                        checkError(res);
                        res.body.code.should.be.equal(AppStatus.USER_NOT_FOUND);
                        done();
                    });
            });
        });
    });

    describe('GET INFO user tests', function () {

        it('it should GET a user', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            oauthLogin(user, function (err, res, resToken) {
                var agent = chai.request.agent(server);
                agent.get('/api/users/info')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .end(function (err, res) {
                        checkUser(res);
                        done();
                    });
            });
        });
        it('it should GET a user EXT', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            oauthLogin(user, function (err, res, resToken) {
                var agent = chai.request.agent(server);
                agent.get('/api/users/info/ext')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .end(function (err, res) {
                        //check user ext
                        res.should.have.status(HttpStatus.OK);
                        res.body.should.be.a('object');
                        res.body.should.have.property('code');
                        //res.body.code.should.be.under(1000);
                        res.body.should.have.property('message');
                        res.body.should.have.property('data');
                        res.body.data.user_ext.should.have.property('name');
                        res.body.data.user_ext.should.have.property('lastname');
                        res.body.data.user_ext.should.have.property('email');
                        res.body.data.user_ext.should.have.property('pdfs_to_sign');
                        res.body.data.user_ext.should.have.property('pdfs_owned');
                        res.body.data.user_ext.should.have.property('pdfs_signed');
                        res.body.data.user_ext.should.have.property('users_related');
                        res.body.data.user_ext.pdfs_to_sign.should.be.an.Array;
                        res.body.data.user_ext.pdfs_signed.should.be.an.Array;
                        res.body.data.user_ext.users_related.should.be.an.Array;

                        res.body.data.user_ext.pdfs_to_sign[0].owner_id.should.be.a('object');
                        res.body.data.user_ext.pdfs_to_sign[0].signers[0]._id.should.be.a('object');
                        res.body.data.user_ext.pdfs_owned[0].signers[0]._id.should.be.a('object');
                        done();
                    });
            });
        });
        it('it should NOT GET a user cause I am not logged', function (done) {
            var agent = chai.request.agent(server);
            agent.get('/api/users/info')
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.BAD_REQUEST);
                    checkError(res);
                    res.body.should.have.property('code', AppStatus.BAD_REQUEST);
                    res.body.should.have.property('message', 'The access token was not found');
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
            oauthLogin(user, function (err, res, resToken) {
                var agent = chai.request.agent(server);
                agent.post('/api/users/logout')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .end(function (err, res) {
                        res.should.have.status(HttpStatus.OK);
                        res.body.should.have.property('code', AppStatus.USER_LOG_OUT);
                        res.body.should.have.property('message', AppStatus.getStatusText(AppStatus.USER_LOG_OUT));
                        done();
                    });
            });
        });
        it('it should NOT LOGOUT a user cause my token is bad', function (done) {
            var agent = chai.request.agent(server);
            agent.post('/api/users/logout')
                .set('Authorization', 'Bearer 276fbbd75da3f317548b0a56e3179bd64074b0b8')
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.BAD_REQUEST);
                    checkError(res);
                    res.body.should.have.property('code', AppStatus.BAD_REQUEST);
                    done();
                });
        });
        it('it should NOT LOGOUT a user cause I have no token', function (done) {
            var agent = chai.request.agent(server);
            agent.post('/api/users/logout')
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.BAD_REQUEST);
                    checkError(res);
                    res.body.should.have.property('code', AppStatus.BAD_REQUEST);
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
            oauthLogin(user, function (err, res, resToken) {
                var agent = chai.request.agent(server);
                agent.delete('/api/users/')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send({password: 'test'})
                    .end(function (err, res) {
                        res.should.have.status(HttpStatus.OK);
                        res.body.should.have.property('code', AppStatus.USER_DELETED);
                        res.body.should.have.property('message', AppStatus.getStatusText(AppStatus.USER_DELETED));
                        done();
                    });
            });
        });
        it('it should DELETE a user using POST', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            oauthLogin(user, function (err, res, resToken) {
                var agent = chai.request.agent(server);
                agent.post('/api/users/')
                    .send({_method: 'delete', password: 'test'})
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .end(function (err, res) {
                        res.should.have.status(HttpStatus.OK);
                        res.body.should.have.property('code', AppStatus.USER_DELETED);
                        res.body.should.have.property('message', AppStatus.getStatusText(AppStatus.USER_DELETED));
                        done();
                    });
            });
        });
        it('it should NOT DELETE a user cause I am not logged', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            agent.delete('/api/users/')
                .send({password: 'test'})
                .end(function (err, res) {
                    checkError(res);
                    res.body.should.have.property('code', AppStatus.BAD_REQUEST);
                    res.body.should.have.property('message', 'The access token was not found');
                    done();
                });
        });
    });
});