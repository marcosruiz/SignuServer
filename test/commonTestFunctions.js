var chai = require('chai');
const should = chai.should();
var HttpStatus = require('http-status-codes');
var AppStatus = require('../public/routes/app-err-codes-en');
var server = require('../app');
var request = require('supertest');
var fs = require('fs');
var config = require('config');
var User = require('../routes/models/user');
var Pdf = require('../routes/models/pdf');

var testUser1, testUser2, testUser3;
var testPdf1, testPdf2, testPdf3, testPdf4, testPdf5;

function setUpDatabase(cb){
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
                            }],
                            was_locked: false,
                            add_signers_enabled: false,
                            with_stamp: false
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
                            }],
                            was_locked: false,
                            add_signers_enabled: false
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
                            signers: [],
                            was_locked: false,
                            add_signers_enabled: false,
                            with_stamp: false
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
                            with_stamp: true,
                            was_locked: false,
                            add_signers_enabled: false
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
                                                                                var userArray = [testUser1, testUser2, testUser3];
                                                                                var pdfArray = [testPdf1, testPdf2, testPdf3, testPdf4, testPdf5];
                                                                                cb(userArray, pdfArray);
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
}

function checkUser(res) {
    res.should.have.status(HttpStatus.OK);
    res.body.should.be.a('object');
    res.body.should.have.property('code');
    //res.body.code.should.be.under(1000);
    res.body.should.have.property('message');
    res.body.should.have.property('data');
    res.body.data.user.should.have.property('name');
    res.body.data.user.should.have.property('lastname');
    res.body.data.user.should.have.property('email');
    res.body.data.user.should.have.property('pdfs_to_sign');
    res.body.data.user.should.have.property('pdfs_owned');
    res.body.data.user.should.have.property('pdfs_signed');
    res.body.data.user.should.have.property('users_related');
    res.body.data.user.pdfs_to_sign.should.be.an.Array;
    res.body.data.user.pdfs_signed.should.be.an.Array;
    res.body.data.user.users_related.should.be.an.Array;
    // res.body.users_related.length.should.be.eql(0);
}

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

function checkToken(res) {
    res.body.should.have.property('access_token');
    res.body.should.have.property('token_type', 'bearer');
    res.body.should.have.property('expires_in');
}

function checkError(res) {
    res.body.should.be.a('object');
    res.body.should.have.property('message');
    res.body.should.have.property('code');
    res.body.code.should.be.above(999);
}

function checkPdf(res) {
    res.should.have.status(HttpStatus.OK);
    res.body.data.pdf.should.be.a('object');
    res.body.data.pdf.should.have.property('original_name');
    res.body.data.pdf.should.have.property('owner_id');
    res.body.data.pdf.should.have.property('mime_type');
    res.body.data.pdf.should.have.property('file_name');
    res.body.data.pdf.should.have.property('path');
    res.body.data.pdf.should.have.property('destination');
    res.body.data.pdf.should.have.property('encoding');
    res.body.data.pdf.should.have.property('with_stamp');
    res.body.data.pdf.should.have.property('creation_date');
    res.body.data.pdf.should.have.property('signers');
    res.body.data.pdf.signers.should.be.an.Array;
}

module.exports = {
    checkUser: checkUser,
    checkToken: checkToken,
    checkError: checkError,
    checkPdf: checkPdf,
    oauthLogin: oauthLogin,
    setUpDatabase: setUpDatabase
}