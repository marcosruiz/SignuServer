/**
 * Created by Marcos on 17/05/2017.
 */

//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

var mongoose = require("mongoose");
var User = require('../public/routes/models/user');
var Pdf = require('../public/routes/models/pdf');
var fs = require('fs');
var config = require('config');

//Require the dev-dependencies
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../app');
var should = chai.should();
var HttpStatus = require('http-status-codes');

chai.use(chaiHttp);

function checkIsPdf(res) {
    res.should.have.status(HttpStatus.OK);
    res.body.should.be.a('object');
    res.body.should.have.property('original_name');
    res.body.should.have.property('owner_id');
    res.body.should.have.property('mime_type');
    res.body.should.have.property('file_name');
    res.body.should.have.property('path');
    res.body.should.have.property('destination');
    res.body.should.have.property('encoding');
    res.body.should.have.property('with_stamp');
    res.body.should.have.property('creation_date');
    res.body.should.have.property('signers');
    res.body.signers.should.be.an.Array;
}

function checkIsUser(res) {
    res.should.have.status(HttpStatus.OK);
    res.body.user.should.be.a('object');
    res.body.user.should.have.property('name');
    res.body.user.should.have.property('lastname');
    res.body.user.should.have.property('email');
    res.body.user.should.have.property('pdfs_to_sign');
    res.body.user.pdfs_to_sign.should.be.an.Array;
    res.body.user.should.have.property('related_people');
    res.body.user.related_people.should.be.an.Array;
}

function checkError(res) {
    res.body.should.be.a('object');
    res.body.should.have.property('error');
    res.body.error.should.have.property('message');
    res.body.error.should.have.property('code');
}
var testUser, testUser2, testUser3, testPdf, testPdf2, testPdf3, testPdf4;

describe('Pdfs', function () {
    "use strict";
    /**
     * We prepare 3 users and 1 file
     */
    beforeEach(function (done) { //Before each test we empty the database and let a test user
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
                "related_people": []
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
                "related_people": []
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
                "related_people": []
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
                                signers: [{_id: testUser2._id,
                                    is_signed: false,
                                    signature_date: undefined}]
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
                                signers: [{_id: testUser2._id,
                                    is_signed: true,
                                    signature_date: Date.now()}]
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
                                signers: [{_id: testUser2._id,
                                    is_signed: true,
                                    signature_date: Date.now()
                                }, {_id: testUser._id,
                                    is_signed: false,
                                    signature_date: undefined}],
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
     * Test /POST route
     */
    describe('POST tests', function () {
        it('it should POST/UPLOAD a pdf', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var pdf = {
                signers: [testUser._id]
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.post('/api/pdfs/')
                        .set('content-type', 'multipart/form-data')
                        .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                        .end(function (err, res) {
                            checkIsPdf(res);
                            testPdf = res.body;
                            done();
                        });
                });
        });
        it('it should ADD a signer to a PDF', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var pdf = {
                signers: [testUser2._id]
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.patch('/api/pdfs/addsigners/' + testPdf3._id)
                        .send(pdf)
                        .end(function (err, res) {
                            checkIsPdf(res);
                            res.body.signers.length.should.be.eql(1);
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
                signers: [testUser2._id]
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.patch('/api/pdfs/addsigners/' + testPdf2._id)
                        .send(pdf)
                        .end(function (err, res) {
                            checkIsPdf(res);
                            res.body.signers.length.should.be.eql(1);
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
                signers: [testUser3._id]
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.patch('/api/pdfs/addsigners/' + testPdf4._id)
                        .send(pdf)
                        .end(function (err, res) {
                            checkError(res);
                            // res.should.have.status(HttpStatus.UNAUTHORIZED);
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
                signers: [testUser3._id]
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.patch('/api/pdfs/addsigners/' + testPdf3._id)
                        .send(pdf)
                        .end(function (err, res) {
                            checkError(res);
                            // res.should.have.status(HttpStatus.UNAUTHORIZED);
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
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.put('/api/pdfs/unlock/' +testPdf._id)
                        .end(function (err, res) {
                            agent.post('/api/pdfs/')
                                .set('content-type', 'multipart/form-data')
                                .field('pdf_id', testPdf._id.toString())
                                .field('_method', 'put')
                                .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                                .end(function (err, res) {
                                    checkError(res);
                                    res.should.have.status(HttpStatus.FORBIDDEN);
                                    done();
                                });
                        });
                });
        });
        it('it should UPDATE/SIGN a PDF', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    var tempPdf = {pdf_id: testPdf._id};
                    agent.put('/api/pdfs/unlock/' + testPdf._id)
                        .end(function (err, res) {
                            agent.post('/api/pdfs/')
                                .set('content-type', 'multipart/form-data')
                                .field('pdf_id', testPdf._id.toString())
                                .field('_method', 'put')
                                .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                                .end(function (err, res) {
                                    checkIsPdf(res);
                                    res.body.signers.length.should.be.eql(1);
                                    res.body.signers.pop().is_signed.should.be.eql(true);
                                    done();
                                });
                        });
                });
        });
        it('it should NOT UPDATE/SIGN a PDF cause is totally signed', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.put('/api/pdfs/unlock/' + testPdf2._id)
                        .end(function (err, res) {
                            agent.post('/api/pdfs/')
                                .field('pdf_id', testPdf2._id.toString())
                                .field('_method', 'put')
                                .set('content-type', 'multipart/form-data')
                                .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                                .end(function (err, res) {
                                    checkError(res);
                                    res.should.have.status(HttpStatus.FORBIDDEN);
                                    done();
                                });
                        });
                });
        });
        it('it should NOT UPDATE/SIGN a PDF cause I already sign (but is not totally signed)', function (done) {
            var user = {
                email: "test2@test2",
                password: "test2"
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.put('/api/pdfs/unlock/' + testPdf4._id)
                        .end(function (err, res) {
                            agent.post('/api/pdfs/')
                                .field('pdf_id',testPdf4._id.toString())
                                .field('_method', 'put')
                                .set('content-type', 'multipart/form-data')
                                .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                                .end(function (err, res) {
                                    checkError(res);
                                    res.should.have.status(HttpStatus.FORBIDDEN);
                                    done();
                                });
                        });
                });
        });
        it('it should NOT UPDATE/SIGN a PDF cause I am  not the owner and I am not a signer', function (done) {
            var user = {
                email: "test3@test3",
                password: "test3"
            };
            var pdf = {
                signers: [testUser._id]
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.put('/api/pdfs/unlock/' + testPdf._id)
                        .end(function (err, res) {
                            agent.post('/api/pdfs/')
                                .field('pdf_id',testPdf._id.toString())
                                .field('_method', 'put')
                                .set('content-type', 'multipart/form-data')
                                .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                                .end(function (err, res) {
                                    checkError(res);
                                    res.should.have.status(HttpStatus.FORBIDDEN);
                                    done();
                                });
                        });
                });
        });

    });

    describe('GET tests', function () {
        it('it should GET INFO of a pdf', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.get('/api/pdfs/status/' + testPdf._id)
                        .end(function (err, res) {
                            checkIsPdf(res);
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
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.get('/api/pdfs/' + testPdf._id)
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
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.get('/api/pdfs/' + testPdf._id)
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
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.get('/api/pdfs/' + testPdf._id)
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
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.get('/api/pdfs/' + testPdf._id)
                        .end(function (err, res) {
                            res.should.have.status(HttpStatus.UNAUTHORIZED);
                            done();
                        });
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
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.delete('/api/pdfs/' + testPdf._id)
                        .end(function (err, res) {
                            res.should.have.status(HttpStatus.OK);
                            console.log(res.body);
                            res.body.should.have.property('message', 'Pdf deleted');
                            done();
                        });
                });
        });
    });
});