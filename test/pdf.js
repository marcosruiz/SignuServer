/**
 * Created by Marcos on 17/05/2017.
 */

//During the test the env variable is set to test
process.env.NODE_ENV = 'test';

var mongoose = require("mongoose");
var User = require('../routes/models/user');
var Pdf = require('../routes/models/pdf');
var fs = require('fs');

//Require the dev-dependencies
var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../app');
var should = chai.should();
var HttpStatus = require('http-status-codes');

chai.use(chaiHttp);

function checkIsPdf(res){
    res.should.have.status(200);
    res.body.should.be.a('object');
    res.body.should.have.property('original_name');
    res.body.should.have.property('owner_id');
    res.body.should.have.property('mime_type');
    res.body.should.have.property('total_signatures');
    res.body.should.have.property('current_signatures');
    res.body.should.have.property('file_name');
    res.body.should.have.property('path');
    res.body.should.have.property('destination');
    res.body.should.have.property('encoding');
    res.body.should.have.property('someone_is_signing');
    // res.body.should.have.property('user_id_signing');
    res.body.should.have.property('creation_date');
    res.body.should.have.property('signers');
    res.body.signers.should.be.an.Array;
}

function checkIsUser(res) {
    res.should.have.status(200);
    res.body.should.be.a('object');
    res.body.should.have.property('name');
    res.body.should.have.property('lastname');
    res.body.should.have.property('email');
    res.body.should.have.property('username');
    res.body.should.have.property('pdfs_to_sign');
    res.body.pdfs_to_sign.should.be.an.Array;
    res.body.should.have.property('related_people');
    res.body.related_people.should.be.an.Array;
}

function checkError(res) {
    res.body.should.be.a('object');
    res.body.should.have.property('error');
    res.body.error.should.have.property('message');
    res.body.error.should.have.property('code');
}
var testUser, testPdf;

describe('Pdfs', function () {
    "use strict";
    before(function (done) { //Before each test we empty the database and let a test user
        User.remove({}, function (err) {
            // Add a test user
            var newUser = new User({
                "username": "test",
                "password": "test",
                "email": "test@test",
                "name": "test",
                "lastname": "test",
                "creation_date": Date.now(),
                "last_edition_date": Date.now(),
                "pdfs_to_sign" : [],
                "pdfs_signed" : [],
                "pdfs_owned" : [],
                "related_people" : []
            });
            newUser.save(function (err, user) {
                if (err) {
                    console.log(err);
                } else{
                    testUser = user;
                }
                done();
            });
        });

        Pdf.remove({}, function(err){
            //This stay void
        });

        //TODO DELETE ALL TEST FILES

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
                signers : [testUser._id]
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
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
                signers : [testUser._id]
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.patch('/api/pdfs/addsigners/' + testPdf._id)
                        .send(pdf)
                        .end(function (err, res) {
                            checkIsPdf(res);
                            res.body.signers.length.should.be.eql(1);
                            done();
                        });
                });
        });
        it('it should UPDATE/SIGN a PDF', function (done) {
            var user = {
                email: "test@test",
                password: "test"
            };
            var pdf = {
                signers : [testUser._id]
            };
            var agent = chai.request.agent(server);
            agent.post('/api/users/login')
                .send(user)
                .end(function (err, res) {
                    checkIsUser(res);
                    agent.put('/api/pdfs/unlock/' + testPdf._id)
                        .end(function(err, res){
                            agent.put('/api/pdfs/' + testPdf._id)
                                .set('content-type', 'multipart/form-data')
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
        it('it should NOT POST/ NOT UPLOAD a pdf due to you are not logged', function (done) {
            var pdf = {
                "signers" : [testUser._id]
            };
            var agent = chai.request.agent(server);
            agent.post('/api/pdfs/')
                .set('content-type', 'multipart/form-data')
                .send(pdf)
                .attach("pdf", fs.readFileSync('test/testFiles/prueba1.pdf'), "pdf")
                .end(function (err, res) {
                    checkError(res);
                    done();
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
                        .end(function(err, res){
                            checkIsPdf(res);
                            done();
                        });
                });
        });

    });

});