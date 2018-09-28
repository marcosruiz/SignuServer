/**
 * Created by Marcos on 17/05/2017.
 */

//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

var mongoose = require("mongoose");
var User = require('../routes/models/user');
var Pdf = require('../routes/models/pdf');
var Client = require('../routes/models/client');
var fs = require('fs');
var config = require('config');

//Require the dev-dependencies
var chai = require('chai');
var mocha = require('mocha');
var chaiHttp = require('chai-http');
var server = require('../app');
var should = chai.should();
var HttpStatus = require('http-status-codes');
var AppStatus = require('../public/routes/app-err-codes-en');
var request = require('supertest');

var checkUser = require('./commonTestFunctions').checkUser;
var checkPdf = require('./commonTestFunctions').checkPdf;
var checkToken = require('./commonTestFunctions').checkToken;
var checkError = require('./commonTestFunctions').checkError;

chai.use(chaiHttp);

var token;
var testUser, testUser2, testUser3, testPdf, testPdf2, testPdf3, testPdf4, testPdf5;
var testClient1;

/**
 * Login using Oauth2 and return info user
 * @param {Object} user - user: {email, password}
 * @callback next(err, res)
 */
function oauthLogin(user, next) {
    request(server).post('/oauth2/token')
        .type('form')
        .send({
            grant_type: 'password',
            username: user.email,
            password: user.password,
            client_id: "application",
            client_secret: "secret"
        })
        .expect(HttpStatus.OK)
        .expect(function (res) {
            token = res.body.access_token;
        })
        .end(function (err, resToken) {
            checkToken(resToken);
            // Check user exists
            request(server).get('/api/users/info')
                .set('Authorization', 'Bearer ' + token)
                .expect(HttpStatus.OK)
                .end(function (err, resUser) {
                    checkUser(resUser);
                    next(err, resUser, resToken);
                });
        });
};

describe('Pdfs', function () {
    "use strict";
    /**
     * We prepare 3 users and 1 file
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
            // Owner
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
            // Signer
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
                testUser = user;
                newUser2.save(function (err, user) {
                    testUser2 = user;
                    newUser3.save(function (err, user) {
                        testUser3 = user;
                        Pdf.remove({}, function () {
                            var newPdf = new Pdf({
                                original_name: "original_name",
                                owner_id: testUser._id,
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
                                owner_id: testUser._id,
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
                                owner_id: testUser._id,
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
                                owner_id: testUser._id,
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
                                    _id: testUser._id,
                                    is_signed: false,
                                    signature_date: undefined
                                }],
                                with_stamp: true
                            });
                            var newPdf5 = new Pdf({
                                original_name: "original_name",
                                owner_id: testUser._id,
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
                                    _id: testUser._id,
                                    is_signed: false,
                                    signature_date: undefined
                                }],
                                with_stamp: true
                            });
                            newPdf.save(function (err, pdf) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    testPdf = pdf;
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
                                                                }
                                                            });
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    });
                                    //Create a test file
                                    fs.createReadStream('test/testFiles/test.pdf').pipe(fs.createWriteStream(config.uploads_dir + 'test'));
                                    fs.createReadStream('test/testFiles/test.pdf').pipe(fs.createWriteStream(config.uploads_dir + 'test2'));
                                    fs.createReadStream('test/testFiles/test.pdf').pipe(fs.createWriteStream(config.uploads_dir + 'test3'));
                                    fs.createReadStream('test/testFiles/test.pdf').pipe(fs.createWriteStream(config.uploads_dir + 'test4'));
                                    fs.createReadStream('test/testFiles/test.pdf').pipe(fs.createWriteStream(config.uploads_dir + 'test5'));
                                    done();
                                }
                            });
                        });
                    });
                });
            });

        });


    });

    /**
     * Create client
     */
    mocha.before(function (done) {
        testClient1 = new Client({clientId: 'application', clientSecret: 'secret'});
        done();
    });

    /**
     * Delete all clients, users and pdfs
     */
    mocha.after(function (done) {
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

    /**
     * Test /POST route
     */
    describe('POST tests', function () {
        it('it should POST/UPLOAD a pdf', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var pdf = {
                signers: [testUser._id, testUser2._id, testUser3._id]
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.post('/api/pdfs/')
                    .set('Authorization', 'Bearer ' + token)
                    .set('content-type', 'multipart/form-data')
                    .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                    .end(function (err, res) {
                        checkPdf(res);
                        testPdf = res.body;
                        done();
                    });
            });
        });

        it('it should NOT POST/UPLOAD a PDF cause I am not logged', function (done) {
            var agent = chai.request.agent(server);
            agent.post('/api/pdfs')
                .set('Authorization', 'Bearer ' + 'aaa')
                .set('content-type', 'multipart/form-data')
                .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                .end(function (err, res) {
                    checkError(res);
                    res.should.have.status(HttpStatus.BAD_REQUEST);
                    res.body.should.have.property('message', 'The access token provided is invalid.')
                    done();
                });
        });

    });
    describe('PUT.ADDSIGNER tests', function () {
        it('it should ADD a signer to a PDF', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var signer_id = {
                signer_id: testUser2._id
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.put('/api/pdfs/addsigner/' + testPdf3._id)
                    .set('Authorization', 'Bearer ' + token)
                    .send(signer_id)
                    .end(function (err, res) {
                        checkPdf(res);
                        res.body.data.pdf.signers.length.should.be.eql(1);
                        res.body.data.pdf.signers.pop().is_signed.should.be.eql(false);
                        done();
                    });
            });
        });
        it('it should ADD a signer to a PDF using POST', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var signer_id = {
                _method: 'put',
                signer_id: testUser2._id
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.post('/api/pdfs/addsigner/' + testPdf3._id)
                    .set('Authorization', 'Bearer ' + token)
                    .send(signer_id)
                    .end(function (err, res) {
                        checkPdf(res);
                        res.body.data.pdf.signers.length.should.be.eql(1);
                        res.body.data.pdf.signers.pop().is_signed.should.be.eql(false);
                        done();
                    });
            });
        });
        it('it should NOT ADD a signer to a PDF two times (is_signed: false)', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var signer_id = {
                signer_id: testUser2._id
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.put('/api/pdfs/addsigner/' + testPdf3._id)
                    .set('Authorization', 'Bearer ' + token)
                    .send(signer_id)
                    .end(function (err, res) {
                        checkPdf(res);
                        res.body.data.pdf.signers.length.should.be.eql(1);
                        res.body.data.pdf.signers[0].is_signed.should.be.eql(false);
                        agent.put('/api/pdfs/addsigner/' + testPdf3._id)
                            .set('Authorization', 'Bearer ' + token)
                            .send(signer_id)
                            .end(function (err, res) {
                                checkError(res);
                                res.should.have.status(HttpStatus.NOT_FOUND);
                                done();
                            });
                    });
            });
        });
        it('it should NOT ADD a signer to a PDF two times (is_signed: true)', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var signer_id = {
                signer_id: testUser2._id
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.put('/api/pdfs/addsigner/' + testPdf2._id)
                    .set('Authorization', 'Bearer ' + token)
                    .send(signer_id)
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.NOT_FOUND);
                        done();
                    });
            });
        });
    });

    describe('PUT.ADDSIGNERS tests', function () {
        it('it should ADD a signer to a PDF', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var pdf = {
                signers: [{_id: testUser2._id}]
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.put('/api/pdfs/addsigners/' + testPdf3._id)
                    .set('Authorization', 'Bearer ' + token)
                    .send(pdf)
                    .end(function (err, res) {
                        checkPdf(res);
                        res.body.data.pdf.signers.length.should.be.eql(1);
                        done();
                    });
            });
        });
        it('it should ADD a signer to a PDF using POST', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var pdf = {
                _method: 'put',
                signers: [{_id: testUser2._id}]
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.post('/api/pdfs/addsigners/' + testPdf3._id)
                    .set('Authorization', 'Bearer ' + token)
                    .send(pdf)
                    .end(function (err, res) {
                        checkPdf(res);
                        res.body.data.pdf.signers.length.should.be.eql(1);
                        done();
                    });
            });
        });
        it('it should NOT ADD a signer to a PDF cause is already a signer', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var pdf = {
                signers: [{_id: testUser2._id}]
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.put('/api/pdfs/addsigners/' + testPdf2._id)
                    .set('Authorization', 'Bearer ' + token)
                    .send(pdf)
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.BAD_REQUEST);
                        done();
                    });
            });
        });
        it('it should NOT ADD a signer to a PDF cause it has stamp', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var pdf = {
                signers: [{_id: testUser3._id}]
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.put('/api/pdfs/addsigners/' + testPdf4._id)
                    .set('Authorization', 'Bearer ' + token)
                    .send(pdf)
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.FORBIDDEN);
                        done();
                    });
            });
        });
        it('it should NOT ADD a signer to a PDF cause I am not the owner', function (done) {
            var user = {
                email: "test3@test3",
                password: "test3"
            };
            var pdf = {
                signers: [{_id: testUser3._id}]
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.put('/api/pdfs/addsigners/' + testPdf3._id)
                    .set('Authorization', 'Bearer ' + token)
                    .send(pdf)
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.UNAUTHORIZED);
                        done();
                    });
            });
        });
        it('it should NOT ADD a signer to a PDF cause I am not logged', function (done) {
            var pdf = {
                signers: [{_id: testUser3._id}]
            };
            var agent = chai.request.agent(server);
            agent.put('/api/pdfs/addsigners/' + testPdf3._id)
                .send(pdf)
                .end(function (err, res) {
                    checkError(res);
                    res.should.have.status(HttpStatus.BAD_REQUEST);
                    done();
                });
        });
    });

    describe('PUT.SIGN tests', function () {
        it('it should UPDATE/SIGN a PDF', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, resUser) {
                checkUser(resUser);
                var tempPdf = {pdf_id: testPdf._id, last_edition_date: testPdf.last_edition_date};
                agent.put('/api/pdfs/' + testPdf._id)
                    .set('Authorization', 'Bearer ' + token)
                    .field('content-type', 'multipart/form-data')
                    .field('pdf_id', testPdf._id.toString())
                    .field('last_edition_date', testPdf.last_edition_date.valueOf())
                    .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                    .end(function (err, res) {
                        console.log(res.body.data.pdf.signers);
                        checkPdf(res);
                        res.body.data.pdf.signers.length.should.be.eql(1);
                        res.body.data.pdf.signers.pop().is_signed.should.be.eql(true);
                        done();
                    });
            });
        });
        it('it should NOT UPDATE/SIGN a PDF cause I am not logged', function (done) {
            var agent = chai.request.agent(server);
            var tempPdf = {pdf_id: testPdf._id};
            agent.put('/api/pdfs/' + testPdf._id.toString())
                .field('content-type', 'multipart/form-data')
                .field('pdf_id', testPdf._id.toString())
                .field('last_edition_date', testPdf.last_edition_date.valueOf())
                .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                .end(function (err, res) {
                    checkError(res);
                    res.should.have.status(HttpStatus.BAD_REQUEST);
                    res.body.should.have.property('message', 'The access token was not found');
                    done();
                });
        });
        it('it should UPDATE/SIGN a PDF using POST', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                var tempPdf = {pdf_id: testPdf._id};
                agent.post('/api/pdfs/' + testPdf._id.toString())
                    .set('Authorization', 'Bearer ' + token)
                    .field('_method', 'put')
                    .field('content-type', 'multipart/form-data')
                    .field('pdf_id', testPdf._id.toString())
                    .field('last_edition_date', testPdf.last_edition_date.valueOf())
                    .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                    .end(function (err, res) {
                        checkPdf(res);
                        res.body.data.pdf.signers.length.should.be.eql(1);
                        res.body.data.pdf.signers.pop().is_signed.should.be.eql(true);
                        done();
                    });
            });
        });
        it('it should NOT UPDATE/SIGN a PDF cause is totally signed', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.put('/api/pdfs/' + testPdf2._id.toString())
                    .set('Authorization', 'Bearer ' + token)
                    .field('pdf_id', testPdf2._id.toString())
                    .field('last_edition_date', testPdf2.last_edition_date.valueOf())
                    .field('content-type', 'multipart/form-data')
                    .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.NOT_FOUND);
                        done();
                    });
            });
        });
        it('it should NOT UPDATE/SIGN a PDF cause I already sign (but is not totally signed)', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.put('/api/pdfs/' + testPdf4._id)
                    .set('Authorization', 'Bearer ' + token)
                    .field('pdf_id', testPdf4._id.toString())
                    .field('last_edition_date', testPdf4.last_edition_date.valueOf())
                    .field('content-type', 'multipart/form-data')
                    .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.NOT_FOUND);
                        done();
                    });
            });
        });
        it('it should NOT UPDATE/SIGN a PDF cause I am not the owner and I am not a signer', function (done) {
            var user = {
                email: "test3@test3",
                password: "test3"
            };
            var pdf = {
                signers: [testUser._id]
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.put('/api/pdfs/' + testPdf._id.toString())
                    .set('Authorization', 'Bearer ' + token)
                    .field('pdf_id', testPdf._id.toString())
                    .field('last_edition_date', testPdf.last_edition_date.valueOf())
                    .field('content-type', 'multipart/form-data')
                    .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.NOT_FOUND);
                        done();
                    });
            });
        });
        it('it should NOT UPDATE/SIGN a PDF cause I am the owner but I am not a signer', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var pdf = {
                signers: [testUser._id]
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.put('/api/pdfs/' + testPdf._id.toString())
                    .set('Authorization', 'Bearer ' + token)
                    .field('content-type', 'multipart/form-data')
                    .field('pdf_id', testPdf._id.toString())
                    .field('last_edition_date', testPdf.last_edition_date.valueOf())
                    .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.NOT_FOUND);
                        done();
                    });
            });
        });
        it('it should NOT UPDATE/SIGN a PDF cause I did not need unlock', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                var tempPdf = {pdf_id: testPdf._id};
                agent.put('/api/pdfs/' + testPdf._id.toString())
                    .set('Authorization', 'Bearer ' + token)
                    .field('content-type', 'multipart/form-data')
                    .field('pdf_id', testPdf._id.toString())
                    .field('last_edition_date', testPdf.last_edition_date.valueOf())
                    .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                    .end(function (err, res) {
                        checkPdf(res);
                        done();
                    });
            });
        });
        it('it should NOT UPDATE/SIGN a PDF second time cause is OUTDATED', function (done) {
            var user1 = {
                email: "test@test",
                password: "test"
            };
            var user2 = {
                email: "test2@test2",
                password: "test2"
            };
            var agent1 = chai.request.agent(server);
            var agent2 = chai.request.agent(server);
            oauthLogin(user1, function (err, res, resToken1) {
                checkUser(res);
                var tempPdf = {pdf_id: testPdf5._id};
                oauthLogin(user2, function (err, res, resToken2) {
                    checkUser(res);
                    var tempPdf = {pdf_id: testPdf5._id};
                    agent2.put('/api/pdfs/' + testPdf5._id.toString())
                        .set('Authorization', 'Bearer ' + resToken2.body.access_token)
                        .field('content-type', 'multipart/form-data')
                        .field('pdf_id', testPdf5._id.toString())
                        .field('last_edition_date', testPdf5.last_edition_date.valueOf())
                        .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                        .end(function (err, res) {
                            checkPdf(res);
                            agent1.put('/api/pdfs/' + testPdf5._id.toString())
                                .set('Authorization', 'Bearer ' + resToken1.body.access_token)
                                .field('content-type', 'multipart/form-data')
                                .field('pdf_id', testPdf5._id.toString())
                                .field('last_edition_date', testPdf5.last_edition_date.valueOf())
                                .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                                .end(function (err, res) {
                                    checkError(res);
                                    res.body.code.should.be.eql(AppStatus.PDF_NOT_FOUND);
                                    agent1.get('/api/pdfs/status/' + testPdf5._id.toString())
                                        .set('Authorization', 'Bearer ' + resToken1.body.access_token)
                                        .end(function (err, res) {
                                            checkPdf(res);
                                            res.body.data.pdf.signers.length.should.be.eql(2);
                                            (res.body.data.pdf.signers[0].is_signed * res.body.data.pdf.signers[1].is_signed).should.be.eql(0);
                                            done();
                                        });
                                });
                        });
                });
            });
        });
        it('it should UPDATE/SIGN a PDF 2 times', function (done) {
            var user1 = {
                email: "test@test",
                password: "test"
            };
            var user2 = {
                email: "test2@test2",
                password: "test2"
            };
            var agent1 = chai.request.agent(server);
            var agent2 = chai.request.agent(server);
            oauthLogin(user1, function (err, res, resToken1) {
                checkUser(res);
                var tempPdf = {pdf_id: testPdf5._id};
                oauthLogin(user2, function (err, res, resToken2) {
                    checkUser(res);
                    var tempPdf = {pdf_id: testPdf5._id};
                    agent1.put('/api/pdfs/' + testPdf5._id.toString())
                        .set('Authorization', 'Bearer ' + resToken1.body.access_token)
                        .field('content-type', 'multipart/form-data')
                        .field('pdf_id', testPdf5._id.toString())
                        .field('last_edition_date', testPdf5.last_edition_date.valueOf())
                        .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                        .end(function (err, res) {
                            checkPdf(res);
                            res.body.data.pdf.signers.length.should.be.eql(2);
                            (res.body.data.pdf.signers[0].is_signed * res.body.data.pdf.signers[1].is_signed).should.be.eql(0);
                            agent2.put('/api/pdfs/' + testPdf5._id.toString())
                                .set('Authorization', 'Bearer ' + resToken2.body.access_token)
                                .field('content-type', 'multipart/form-data')
                                .field('pdf_id', testPdf5._id.toString())
                                .field('last_edition_date', res.body.data.pdf.last_edition_date)
                                .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                                .end(function (err, res) {
                                    checkPdf(res);
                                    res.body.data.pdf.signers.length.should.be.eql(2);
                                    res.body.data.pdf.signers.pop().is_signed.should.be.eql(true);
                                    res.body.data.pdf.signers.pop().is_signed.should.be.eql(true);
                                    done();
                                });
                        });
                });
            });
        });
    });
    describe('GET tests', function () {
        it('it should GET INFO of a PDF', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.get('/api/pdfs/status/' + testPdf._id)
                    .set('Authorization', 'Bearer ' + token)
                    .end(function (err, res) {
                        checkPdf(res);
                        done();
                    });
            });
        });
        it('it should GET INFO of a PDF but I am not logged', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            agent.get('/api/pdfs/status/' + testPdf._id)
                .set('Authorization', 'Bearer ' + token)
                .end(function (err, res) {
                    checkPdf(res);
                    done();
                });
        });
        it('it should NOT GET INFO of a PDF cause it is impossible', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.get('/api/pdfs/status/' + "fdsjflk")
                    .set('Authorization', 'Bearer ' + token)
                    .end(function (err, res) {
                        res.should.have.status(HttpStatus.INTERNAL_SERVER_ERROR);
                        checkError(res);
                        done();
                    });
            });
        });
        it('it should NOT GET INFO of a PDF cause it does not exists', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.get('/api/pdfs/status/' + "5b9239b82a839517ac9e2011")
                    .set('Authorization', 'Bearer ' + token)
                    .end(function (err, res) {
                        res.should.have.status(HttpStatus.NOT_FOUND);
                        checkError(res);
                        done();
                    });
            });
        });
        it('it should DOWNLOAD a PDF cause I am the owner and a signer', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.get('/api/pdfs/' + testPdf._id)
                    .set('Authorization', 'Bearer ' + token)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        done();
                    });
            });
        });
        it('it should DOWNLOAD a PDF cause I am the owner', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.get('/api/pdfs/' + testPdf._id)
                    .set('Authorization', 'Bearer ' + token)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        done();
                    });
            });
        });
        it('it should DOWNLOAD a PDF cause I am a signer', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.get('/api/pdfs/' + testPdf._id)
                    .set('Authorization', 'Bearer ' + token)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        done();
                    });
            });
        });

        it('it should NOT DOWNLOAD a pdf cause I am not the owner or a signer', function (done) {
            var user = {
                email: "test3@test3",
                password: "test3"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.get('/api/pdfs/' + testPdf._id)
                    .set('Authorization', 'Bearer ' + token)
                    .end(function (err, res) {
                        res.should.have.status(HttpStatus.UNAUTHORIZED);
                        done();
                    });
            });
        });
        it('it should NOT DOWNLOAD a pdf cause I am not logged', function (done) {
            var agent = chai.request.agent(server);
            agent.get('/api/pdfs/' + testPdf._id)
                .set('Authorization', 'Bearer ' + token)
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.UNAUTHORIZED);
                    done();
                });
        });
    });

    describe('DELETE tests', function () {
        it('it should NOT DELETE a pdf cause I am not logged', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            agent.delete('/api/pdfs/' + testPdf._id)
                .set('Authorization', 'Bearer ' + token)
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.UNAUTHORIZED);
                    checkError(res);
                    done();
                });
        });
        it('it should NOT DELETE a pdf cause I am not the owner', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            agent.delete('/api/pdfs/' + testPdf._id)
                .set('Authorization', 'Bearer ' + token)
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.UNAUTHORIZED);
                    checkError(res);
                    done();
                });
        });
        it('it should DELETE a pdf', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.delete('/api/pdfs/' + testPdf._id.toString())
                    .set('Authorization', 'Bearer ' + token)
                    .end(function (err, res) {
                        res.should.have.status(HttpStatus.OK);
                        res.body.should.have.property('code', AppStatus.PDF_DELETED);
                        res.body.should.have.property('message', AppStatus.getStatusText(AppStatus.PDF_DELETED));
                        done();
                    });
            });
        });
        it('it should DELETE a pdf using POST', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.post('/api/pdfs/' + testPdf._id.toString())
                    .set('Authorization', 'Bearer ' + token)
                    .field('_method', 'delete')
                    .end(function (err, res) {
                        res.should.have.status(HttpStatus.OK);
                        res.body.should.have.property('code', AppStatus.PDF_DELETED);
                        res.body.should.have.property('message', AppStatus.getStatusText(AppStatus.PDF_DELETED));
                        done();
                    });
            });
        });
        it('it should NOT DELETE a pdf cause pdf._id is impossible', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.delete('/api/pdfs/' + "randomString")
                    .set('Authorization', 'Bearer ' + token)
                    .end(function (err, res) {
                        res.should.have.status(HttpStatus.NOT_FOUND);
                        checkError(res);
                        done();
                    });
            });
        });
        it('it should NOT DELETE a pdf cause pdf._id do not exists', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res) {
                checkUser(res);
                agent.delete('/api/pdfs/' + "5b9239b82a839517ac9e2011")
                    .set('Authorization', 'Bearer ' + token)
                    .end(function (err, res) {
                        res.should.have.status(HttpStatus.NOT_FOUND);
                        checkError(res);
                        done();
                    });
            });
        });
    });
});

