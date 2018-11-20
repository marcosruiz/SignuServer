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
var expect = chai.expect;
var HttpStatus = require('http-status-codes');
var AppStatus = require('../public/routes/app-err-codes-en');
var request = require('supertest');

var checkUser = require('./commonTestFunctions').checkUser;
var checkPdf = require('./commonTestFunctions').checkPdf;
var checkToken = require('./commonTestFunctions').checkToken;
var checkError = require('./commonTestFunctions').checkError;
var oauthLogin = require('./commonTestFunctions').oauthLogin;
var setUpDatabase = require('./commonTestFunctions').setUpDatabase;

chai.use(chaiHttp);

var testUser1, testUser2, testUser3;
var testPdf1, testPdf2, testPdf3, testPdf4, testPdf5;
var testClient1;

var user = {
    email: "test@test",
    password: "test"
};
var user2 = {
    email: "test2@test2",
    password: "test2"
};
var user3 = {
    email: "test3@test3",
    password: "test3"
};

describe('Pdfs', function () {
    "use strict";
    /**
     * We prepare 3 users and 1 file
     */
    beforeEach(function (done) {
        setUpDatabase(function(userArray, pdfArray){
            testUser1 = userArray[0]; // Owner on 1,2,3,4,5 and singer on 4,5
            testUser2 = userArray[1]; // Signer on 1,2,4,5
            testUser3 = userArray[2]; // Independient user
            testPdf1 = pdfArray[0];
            testPdf2 = pdfArray[1];
            testPdf3 = pdfArray[2];
            testPdf4 = pdfArray[3];
            testPdf5 = pdfArray[4];
            done();
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
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res1, resToken) {
                checkUser(res1);
                var nPdfs1 = res1.body.data.user.pdfs_owned.length;
                agent.post('/api/pdfs/')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .set('content-type', 'multipart/form-data')
                    .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                    .end(function (err, res2) {
                        checkPdf(res2);
                        testPdf5 = res2.body;
                        agent.get('/api/users/info')
                            .set('Authorization', 'Bearer ' + resToken.body.access_token)
                            .end(function (err, res3) {
                                checkUser(res3);
                                var nPdfs2 = res3.body.data.user.pdfs_owned.length;
                                (nPdfs2).should.be.equal(nPdfs1 + 1);
                                done();
                            });
                    });
            });
        });

        it('it should POST/UPLOAD a pdf with signers', function (done) {
            var body = {
                signers: [testUser1._id.toString(), testUser2._id.toString(), testUser3._id.toString()]
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, resUser, resToken) {
                checkUser(resUser);
                expect(resUser.body.data.user.pdfs_to_sign.length).to.be.equal(2);
                agent.post('/api/pdfs/')
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .set('content-type', 'multipart/form-data')
                    .type('form')
                    .field('signers[0]', body.signers[0])
                    .field('signers[1]', body.signers[1])
                    .field('signers[2]', body.signers[2])
                    .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                    .then(function (res2) {
                        checkPdf(res2);
                        testPdf5 = res2.body;
                        agent.get('/api/users/info')
                            .set('Authorization', 'Bearer ' + resToken.body.access_token)
                            .end(function (err, res3) {
                                checkUser(res3);
                                var nPdfs1 = resUser.body.data.user.pdfs_owned.length;
                                var nPdfs2 = res3.body.data.user.pdfs_owned.length;
                                (nPdfs2).should.be.equal(nPdfs1 + 1);
                                // resOauth = [err, resUser, resToken]
                                oauthLogin(user, function (err, resUser, resToken) {
                                    checkUser(resUser);
                                    expect(resUser.body.data.user.pdfs_to_sign.length).to.be.equal(3);
                                    oauthLogin(user2, function (err, resUser, resToken) {
                                        checkUser(resUser);
                                        expect(resUser.body.data.user.pdfs_to_sign.length).to.be.equal(5);
                                        oauthLogin(user3, function (err, resUser, resToken) {
                                            checkUser(resUser);
                                            expect(resUser.body.data.user.pdfs_to_sign.length).to.be.equal(1);
                                            done();
                                        });
                                    });
                                });
                            });
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
            var user2 = {
                email: "test2@test2",
                password: "test2"
            };
            var body = {
                signer_id: testUser2._id
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, resUser1, resToken1) {
                checkUser(resUser1);
                oauthLogin(user2, function (err, resUser2, resToken2) {
                    checkUser(resUser2);
                    agent.put('/api/pdfs/addsigner/' + testPdf3._id)
                        .set('Authorization', 'Bearer ' + resToken1.body.access_token)
                        .send(body)
                        .end(function (err, res) {
                            checkPdf(res);
                            agent.get('/api/users/info')
                                .set('Authorization', 'Bearer ' + resToken2.body.access_token)
                                .end(function (err, res3) {
                                    checkUser(res3);
                                    var nPdfs1 = resUser2.body.data.user.pdfs_to_sign.length;
                                    var nPdfs2 = res3.body.data.user.pdfs_to_sign.length;
                                    (nPdfs2).should.be.equal(nPdfs1 + 1);
                                    done();
                                });
                        });
                });
            });
        });

        it('it should ADD a signer to a PDF using post', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var user2 = {
                email: "test2@test2",
                password: "test2"
            };
            var body = {
                signer_id: testUser2._id,
                _method: 'put'
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, resUser1, resToken1) {
                checkUser(resUser1);
                oauthLogin(user2, function (err, resUser2, resToken2) {
                    checkUser(resUser2);
                    agent.post('/api/pdfs/addsigner/' + testPdf3._id)
                        .set('Authorization', 'Bearer ' + resToken1.body.access_token)
                        .send(body)
                        .end(function (err, res) {
                            checkPdf(res);
                            agent.get('/api/users/info')
                                .set('Authorization', 'Bearer ' + resToken2.body.access_token)
                                .end(function (err, res3) {
                                    checkUser(res3);
                                    var nPdfs1 = resUser2.body.data.user.pdfs_to_sign.length;
                                    var nPdfs2 = res3.body.data.user.pdfs_to_sign.length;
                                    (nPdfs2).should.be.equal(nPdfs1 + 1);
                                    done();
                                });
                        });
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
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.put('/api/pdfs/addsigner/' + testPdf3._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send(signer_id)
                    .end(function (err, res) {
                        checkPdf(res);
                        res.body.data.pdf.signers.length.should.be.eql(1);
                        res.body.data.pdf.signers[0].is_signed.should.be.eql(false);
                        agent.put('/api/pdfs/addsigner/' + testPdf3._id)
                            .set('Authorization', 'Bearer ' + resToken.body.access_token)
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
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.put('/api/pdfs/addsigner/' + testPdf2._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
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
            var user2 = {
                email: "test2@test2",
                password: "test2"
            };
            var body = {
                signers: [{_id: testUser2._id}]
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, resUser1, resToken1) {
                checkUser(resUser1);
                oauthLogin(user2, function (err, resUser2, resToken2) {
                    checkUser(resUser2);
                    agent.put('/api/pdfs/addsigners/' + testPdf3._id)
                        .set('Authorization', 'Bearer ' + resToken1.body.access_token)
                        .send(body)
                        .end(function (err, res) {
                            checkPdf(res);
                            agent.get('/api/users/info')
                                .set('Authorization', 'Bearer ' + resToken2.body.access_token)
                                .end(function (err, res3) {
                                    checkUser(res3);
                                    var nPdfs1 = resUser2.body.data.user.pdfs_to_sign.length;
                                    var nPdfs2 = res3.body.data.user.pdfs_to_sign.length;
                                    (nPdfs2).should.be.equal(nPdfs1 + 1);
                                    done();
                                });
                        });
                });
            });
        });

        it('it should ADD a signer to a PDF using post', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var user2 = {
                email: "test2@test2",
                password: "test2"
            };
            var body = {
                _method: 'put',
                signers: [{_id: testUser2._id}]
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, resUser1, resToken1) {
                checkUser(resUser1);
                oauthLogin(user2, function (err, resUser2, resToken2) {
                    checkUser(resUser2);
                    agent.post('/api/pdfs/addsigners/' + testPdf3._id)
                        .set('Authorization', 'Bearer ' + resToken1.body.access_token)
                        .send(body)
                        .end(function (err, res) {
                            checkPdf(res);
                            agent.get('/api/users/info')
                                .set('Authorization', 'Bearer ' + resToken2.body.access_token)
                                .end(function (err, res3) {
                                    checkUser(res3);
                                    var nPdfs1 = resUser2.body.data.user.pdfs_to_sign.length;
                                    var nPdfs2 = res3.body.data.user.pdfs_to_sign.length;
                                    (nPdfs2).should.be.equal(nPdfs1 + 1);
                                    done();
                                });
                        });
                });
            });
        });

        it('it should NOT ADD a signer to a PDF cause is already a signer', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var user2 = {
                email: "test2@test2",
                password: "test2"
            };
            var pdf = {
                signers: [{_id: testUser2._id}]
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res1, resToken) {
                checkUser(res1);
                agent.put('/api/pdfs/addsigners/' + testPdf2._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send(pdf)
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.BAD_REQUEST);
                        // Check user
                        oauthLogin(user2, function (err, res1, resToken) {
                            checkUser(res1);
                            agent.get('/api/users/info')
                                .set('Authorization', 'Bearer ' + resToken.body.access_token)
                                .end(function (err, res3) {
                                    checkUser(res3);
                                    var nPdfs1 = res1.body.data.user.pdfs_to_sign.length;
                                    var nPdfs2 = res3.body.data.user.pdfs_to_sign.length;
                                    (nPdfs2).should.be.equal(nPdfs1);
                                    done();
                                });
                        });
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
            oauthLogin(user, function (err, res1, resToken) {
                checkUser(res1);
                agent.put('/api/pdfs/addsigners/' + testPdf4._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send(pdf)
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.FORBIDDEN);
                        // Check user
                        agent.get('/api/users/info')
                            .set('Authorization', 'Bearer ' + resToken.body.access_token)
                            .end(function (err, res3) {
                                checkUser(res3);
                                var nPdfs1 = res1.body.data.user.pdfs_to_sign.length;
                                var nPdfs2 = res3.body.data.user.pdfs_to_sign.length;
                                (nPdfs2).should.be.equal(nPdfs1);
                                done();
                            });
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
            oauthLogin(user, function (err, res1, resToken) {
                checkUser(res1);
                agent.put('/api/pdfs/addsigners/' + testPdf3._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .send(pdf)
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.UNAUTHORIZED);
                        // Check user
                        agent.get('/api/users/info')
                            .set('Authorization', 'Bearer ' + resToken.body.access_token)
                            .end(function (err, res3) {
                                checkUser(res3);
                                var nPdfs1 = res1.body.data.user.pdfs_to_sign.length;
                                var nPdfs2 = res3.body.data.user.pdfs_to_sign.length;
                                (nPdfs2).should.be.equal(nPdfs1);
                                done();
                            });
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

    describe('PUT.LOCK tests', function () {
        it('it should LOCK a PDF', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, resUser, resToken) {
                checkUser(resUser);
                var tempPdf = {pdf_id: testPdf5._id, last_edition_date: testPdf5.last_edition_date};
                agent.put('/api/pdfs/lock/' + testPdf5._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .end(function (err, res) {
                        // console.log(res.body.data.pdf);
                        checkPdf(res);
                        res.body.data.pdf.signers.length.should.be.eql(2);
                        res.body.data.pdf.signers.pop().is_signed.should.be.eql(false);
                        res.body.data.pdf.was_locked.should.be.eql(true);
                        res.body.data.pdf.should.have.property('when_was_locked');
                        res.body.data.pdf.was_locked_by.should.be.eql(resUser.body.data.user._id);
                        // Check user
                        agent.get('/api/users/info')
                            .set('Authorization', 'Bearer ' + resToken.body.access_token)
                            .end(function (err, res3) {
                                checkUser(res3);
                                var nPdfsToSign1 = resUser.body.data.user.pdfs_to_sign.length;
                                var nPdfsSigned1 = resUser.body.data.user.pdfs_signed.length;
                                var nPdfsToSign2 = res3.body.data.user.pdfs_to_sign.length;
                                var nPdfsSigned2 = res3.body.data.user.pdfs_signed.length;
                                (nPdfsSigned2).should.be.equal(nPdfsSigned1);
                                (nPdfsToSign2).should.be.equal(nPdfsToSign1);
                                done();
                            });
                    });
            });
        });
        it('it should LOCK AND SIGN a PDF', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, resUser, resToken) {
                checkUser(resUser);
                var tempPdf = {pdf_id: testPdf5._id, last_edition_date: testPdf5.last_edition_date};
                // Lock pdf
                agent.put('/api/pdfs/lock/' + testPdf5._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .end(function (err, res) {
                        // console.log(res.body.data.pdf);
                        checkPdf(res);
                        res.body.data.pdf.signers.length.should.be.eql(2);
                        res.body.data.pdf.signers.pop().is_signed.should.be.eql(false);
                        res.body.data.pdf.was_locked.should.be.eql(true);
                        res.body.data.pdf.should.have.property('when_was_locked');
                        res.body.data.pdf.was_locked_by.should.be.eql(resUser.body.data.user._id);

                        // Sign pdf
                        agent.put('/api/pdfs/' + testPdf5._id)
                            .set('Authorization', 'Bearer ' + resToken.body.access_token)
                            .field('content-type', 'multipart/form-data')
                            .field('pdf_id', testPdf5._id.toString())
                            .field('last_edition_date', testPdf5.last_edition_date.valueOf())
                            .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                            .end(function (err, res) {
                                console.log(res.body.data.pdf.signers);
                                checkPdf(res);
                                res.body.data.pdf.signers.length.should.be.eql(2);
                                res.body.data.pdf.signers.pop().is_signed.should.be.eql(false);
                                res.body.data.pdf.signers.pop().is_signed.should.be.eql(true);
                                // Get and check user
                                agent.get('/api/users/info')
                                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                                    .end(function (err, res3) {
                                        checkUser(res3);
                                        var nPdfsToSign1 = resUser.body.data.user.pdfs_to_sign.length;
                                        var nPdfsSigned1 = resUser.body.data.user.pdfs_signed.length;
                                        var nPdfsToSign2 = res3.body.data.user.pdfs_to_sign.length;
                                        var nPdfsSigned2 = res3.body.data.user.pdfs_signed.length;
                                        var expToSign = nPdfsToSign1 - 1;
                                        var expSigned = nPdfsSigned1 + 1;
                                        (nPdfsToSign2).should.be.equal(expToSign);
                                        (nPdfsSigned2).should.be.equal(expSigned);
                                        done();
                                    });
                            });
                    });
            });
        });
        it('it should NOT LOCK second time', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, resUser, resToken) {
                checkUser(resUser);
                var tempPdf = {pdf_id: testPdf5._id, last_edition_date: testPdf5.last_edition_date};
                agent.put('/api/pdfs/lock/' + testPdf5._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .end(function (err, res) {
                        // console.log(res.body.data.pdf);
                        checkPdf(res);
                        res.body.data.pdf.signers.length.should.be.eql(2);
                        res.body.data.pdf.signers.pop().is_signed.should.be.eql(false);
                        res.body.data.pdf.was_locked.should.be.eql(true);
                        res.body.data.pdf.should.have.property('when_was_locked');
                        res.body.data.pdf.was_locked_by.should.be.eql(resUser.body.data.user._id);

                        agent.put('/api/pdfs/lock/' + testPdf5._id)
                            .set('Authorization', 'Bearer ' + resToken.body.access_token)
                            .end(function (err, res) {
                                // console.log(res.body.data.pdf);
                                res.statusCode.should.be.eql(HttpStatus.LOCKED);
                                res.body.code.should.be.eql(AppStatus.PDF_LOCKED);
                                res.body.data.pdf.signers.length.should.be.eql(2);
                                res.body.data.pdf.signers.pop().is_signed.should.be.eql(false);
                                res.body.data.pdf.was_locked.should.be.eql(true);
                                res.body.data.pdf.should.have.property('when_was_locked');
                                res.body.data.pdf.was_locked_by.should.be.eql(resUser.body.data.user._id);
                                // Check user
                                agent.get('/api/users/info')
                                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                                    .end(function (err, res3) {
                                        checkUser(res3);
                                        var nPdfsToSign1 = resUser.body.data.user.pdfs_to_sign.length;
                                        var nPdfsSigned1 = resUser.body.data.user.pdfs_signed.length;
                                        var nPdfsToSign2 = res3.body.data.user.pdfs_to_sign.length;
                                        var nPdfsSigned2 = res3.body.data.user.pdfs_signed.length;
                                        (nPdfsSigned2).should.be.equal(nPdfsSigned1);
                                        (nPdfsToSign2).should.be.equal(nPdfsToSign1);
                                        done();
                                    });
                            });
                    });
            });
        });
        it('it should LOCK AND SIGN a PDF 2 times', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var user2 = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, resUser, resToken) {
                checkUser(resUser);
                var tempPdf = {pdf_id: testPdf5._id, last_edition_date: testPdf5.last_edition_date};
                agent.put('/api/pdfs/lock/' + testPdf5._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .end(function (err, res) {
                        // console.log(res.body.data.pdf);
                        checkPdf(res);
                        res.body.data.pdf.signers.length.should.be.eql(2);
                        res.body.data.pdf.signers.pop().is_signed.should.be.eql(false);
                        res.body.data.pdf.signers.pop().is_signed.should.be.eql(false);
                        res.body.data.pdf.was_locked.should.be.eql(true);
                        res.body.data.pdf.should.have.property('when_was_locked');
                        res.body.data.pdf.was_locked_by.should.be.eql(resUser.body.data.user._id);

                        // Sign pdf
                        agent.put('/api/pdfs/' + testPdf5._id)
                            .set('Authorization', 'Bearer ' + resToken.body.access_token)
                            .field('content-type', 'multipart/form-data')
                            .field('last_edition_date', testPdf5.last_edition_date.valueOf())
                            .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                            .end(function (err, res) {
                                // console.log(res.body.data.pdf);
                                checkPdf(res);
                                res.body.data.pdf.signers.length.should.be.eql(2);
                                res.body.data.pdf.signers.pop().is_signed.should.be.eql(false);
                                res.body.data.pdf.signers.pop().is_signed.should.be.eql(true);
                                res.body.data.pdf.was_locked.should.be.eql(false);

                                // Lock pdf
                                oauthLogin(user2, function (err, resUser, resToken) {
                                    agent.put('/api/pdfs/lock/' + testPdf5._id)
                                        .set('Authorization', 'Bearer ' + resToken.body.access_token)
                                        .end(function (err, res) {
                                            // console.log(res.body.data.pdf);
                                            checkPdf(res);
                                            res.body.data.pdf.signers.length.should.be.eql(2);
                                            res.body.data.pdf.signers.pop().is_signed.should.be.eql(false);
                                            res.body.data.pdf.signers.pop().is_signed.should.be.eql(true);
                                            res.body.data.pdf.was_locked.should.be.eql(true);
                                            res.body.data.pdf.should.have.property('when_was_locked');
                                            res.body.data.pdf.was_locked_by.should.be.eql(resUser.body.data.user._id);

                                            // Sign pdf
                                            agent.put('/api/pdfs/' + testPdf5._id)
                                                .set('Authorization', 'Bearer ' + resToken.body.access_token)
                                                .field('content-type', 'multipart/form-data')
                                                .field('last_edition_date', res.body.data.pdf.last_edition_date)
                                                .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                                                .end(function (err, res) {
                                                    // console.log(res.body.data.pdf);
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
        });
    });
    describe('PUT.SIGN tests', function () {

        it('it should UPDATE/SIGN a PDF', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, resUser, resToken) {
                checkUser(resUser);
                var tempPdf = {pdf_id: testPdf5._id, last_edition_date: testPdf5.last_edition_date};
                agent.put('/api/pdfs/' + testPdf5._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .field('content-type', 'multipart/form-data')
                    .field('pdf_id', testPdf5._id.toString())
                    .field('last_edition_date', testPdf5.last_edition_date.valueOf())
                    .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                    .end(function (err, res) {
                        console.log(res.body.data.pdf.signers);
                        checkPdf(res);
                        res.body.data.pdf.signers.length.should.be.eql(1);
                        res.body.data.pdf.signers.pop().is_signed.should.be.eql(true);
                        // Check user
                        agent.get('/api/users/info')
                            .set('Authorization', 'Bearer ' + resToken.body.access_token)
                            .end(function (err, res3) {
                                checkUser(res3);
                                var nPdfsToSign1 = resUser.body.data.user.pdfs_to_sign.length;
                                var nPdfsSigned1 = resUser.body.data.user.pdfs_signed.length;
                                var nPdfsToSign2 = res3.body.data.user.pdfs_to_sign.length;
                                var nPdfsSigned2 = res3.body.data.user.pdfs_signed.length;
                                (nPdfsSigned2).should.be.equal(nPdfsSigned1 + 1);
                                (nPdfsToSign2).should.be.equal(nPdfsToSign1 - 1);
                                done();
                            });
                    });
            });
        });
        it('it should NOT UPDATE/SIGN a PDF cause I am not logged', function (done) {
            var agent = chai.request.agent(server);
            var tempPdf = {pdf_id: testPdf5._id};
            agent.put('/api/pdfs/' + testPdf5._id.toString())
                .field('content-type', 'multipart/form-data')
                .field('pdf_id', testPdf5._id.toString())
                .field('last_edition_date', testPdf5.last_edition_date.valueOf())
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
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                var tempPdf = {pdf_id: testPdf5._id};
                agent.post('/api/pdfs/' + testPdf5._id.toString())
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .field('_method', 'put')
                    .field('content-type', 'multipart/form-data')
                    .field('pdf_id', testPdf5._id.toString())
                    .field('last_edition_date', testPdf5.last_edition_date.valueOf())
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
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.put('/api/pdfs/' + testPdf2._id.toString())
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
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
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.put('/api/pdfs/' + testPdf4._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
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
                signers: [testUser1._id]
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.put('/api/pdfs/' + testPdf5._id.toString())
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .field('pdf_id', testPdf5._id.toString())
                    .field('last_edition_date', testPdf5.last_edition_date.valueOf())
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
                signers: [testUser1._id]
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.put('/api/pdfs/' + testPdf5._id.toString())
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .field('content-type', 'multipart/form-data')
                    .field('pdf_id', testPdf5._id.toString())
                    .field('last_edition_date', testPdf5.last_edition_date.valueOf())
                    .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                    .end(function (err, res) {
                        checkError(res);
                        res.should.have.status(HttpStatus.NOT_FOUND);
                        done();
                    });
            });
        });
        it('it should NOT UPDATE/SIGN a PDF cause I did not lock', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                var tempPdf = {pdf_id: testPdf5._id};
                agent.put('/api/pdfs/' + testPdf5._id.toString())
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .field('content-type', 'multipart/form-data')
                    .field('pdf_id', testPdf5._id.toString())
                    .field('last_edition_date', testPdf5.last_edition_date.valueOf())
                    .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                    .end(function (err, res) {
                        checkError(res);
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
                                    agent1.get('/api/pdfs/info/' + testPdf5._id.toString())
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
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.get('/api/pdfs/info/' + testPdf5._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .end(function (err, res) {
                        checkPdf(res);
                        done();
                    });
            });
        });
        it('it should GET INFO of a PDF but my token has expired', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            agent.get('/api/pdfs/info/' + testPdf5._id)
                .set('Authorization', 'Bearer ' + "b9e1c4213859ef67181604502e596961ab57cbb0")
                .end(function (err, res) {
                    // TODO checkPdf(res);
                    done();
                });
        });
        it('it should NOT GET INFO of a PDF cause it is impossible', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.get('/api/pdfs/info/' + "fdsjflk")
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
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
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.get('/api/pdfs/info/' + "5b9239b82a839517ac9e2011")
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
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
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.get('/api/pdfs/' + testPdf5._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
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
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.get('/api/pdfs/' + testPdf5._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
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
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.get('/api/pdfs/' + testPdf5._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
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
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.get('/api/pdfs/' + testPdf5._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .end(function (err, res) {
                        res.should.have.status(HttpStatus.UNAUTHORIZED);
                        done();
                    });
            });
        });
        // it('it should NOT DOWNLOAD a pdf cause token has expired', function (done) {
        //     var agent = chai.request.agent(server);
        //     agent.get('/api/pdfs/' + testPdf5._id)
        //         .set('Authorization', 'Bearer ' + "b9e1c4213859ef67181604502e596961ab57cbb0")
        //         .end(function (err, res) {
        //             res.should.have.status(HttpStatus.UNAUTHORIZED);
        //             done();
        //         });
        // });
    });

    describe('DELETE tests', function () {
        it('it should NOT DELETE a pdf cause token is invalid', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            agent.delete('/api/pdfs/' + testPdf5._id)
                .set('Authorization', 'Bearer ' + "aaa")
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.BAD_REQUEST);
                    checkError(res);
                    done();
                });
        });
        it('it should NOT DELETE a pdf cause I am not logged', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            agent.delete('/api/pdfs/' + testPdf5._id)
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.BAD_REQUEST);
                    checkError(res);
                    done();
                });
        });
        it('it should NOT DELETE a pdf cause token has expired', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            agent.delete('/api/pdfs/' + testPdf5._id)
                .set('Authorization', 'Bearer ' + "b9e1c4213859ef67181604502e596961ab57cba0")
                .end(function (err, res) {
                    res.should.have.status(HttpStatus.BAD_REQUEST);
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
            oauthLogin(user, function (err, res, resToken) {
                agent.delete('/api/pdfs/' + testPdf5._id)
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .end(function (err, res) {
                        res.should.have.status(HttpStatus.UNAUTHORIZED);
                        checkError(res);
                        done();
                    });
            });

        });
        it('it should DELETE a pdf', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.delete('/api/pdfs/' + testPdf5._id.toString())
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
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
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.post('/api/pdfs/' + testPdf5._id.toString())
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
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
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.delete('/api/pdfs/' + "randomString")
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
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
            oauthLogin(user, function (err, res, resToken) {
                checkUser(res);
                agent.delete('/api/pdfs/' + "5b9239b82a839517ac9e2011")
                    .set('Authorization', 'Bearer ' + resToken.body.access_token)
                    .end(function (err, res) {
                        res.should.have.status(HttpStatus.NOT_FOUND);
                        checkError(res);
                        done();
                    });
            });
        });
    });
});

