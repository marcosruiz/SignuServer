var chai = require('chai');
const should = chai.should();
var HttpStatus = require('http-status-codes');
var AppStatus = require('../public/routes/app-err-codes-en');
var server = require('../app');
var request = require('supertest');

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
    oauthLogin: oauthLogin
}