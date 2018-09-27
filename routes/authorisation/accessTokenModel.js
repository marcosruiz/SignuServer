var mongoose = require('mongoose');

/**
 * Configuration.
 */

var clientModel = require('../models/client'),
    tokenModel = require('../models/token'),
    userModel = require('../models/user');

/*
 * Get access token.
 */

var getAccessToken = function (bearerToken, callback) {
    // console.log('getAccessToken() called and bearerToken is: ', bearerToken);
    tokenModel.findOne({
        accessToken: bearerToken
    }, callback);
};

/**
 * Delete access token
 * @param bearerToken
 * @param callback
 */
var deleteAccessToken = function (bearerToken, callback){
    tokenModel.deleteOne({
        accessToken: bearerToken
    }, callback);
}

/**
 * Get client.
 */

var getClient = function (clientId, clientSecret, callback) {
    // console.log('getClient() called');
    clientModel.findOne({
        clientId: clientId,
        clientSecret: clientSecret
    }, callback);
};

/**
 * Grant type allowed.
 */

var grantTypeAllowed = function (clientId, grantType, callback) {
    // console.log('grantTypeAllowed() called');
    callback(false, grantType === "password");
};

/**
 * Save token.
 */

var saveAccessToken = function (accessToken, clientId, expires, user, callback) {
    // console.log('saveAccessToken() called');
    var token = new tokenModel({
        accessToken: accessToken,
        expires: expires,
        clientId: clientId,
        user_id: user._id
    });

    token.save(callback);
};

/*
 * Get user.
 */

var getUser = function (username, password, callback) {
    // console.log('getUser() called and username is: ', username);
    userModel.findOne({
        email: username
    }, function(err, user){
        if(err){
            callback(err);
        } else if (user == null){
            callback(new Error('User not found'));
        } else if(!user.activation.is_activated){
            callback(new Error('User not activated'));
        }else {
            user.comparePassword(password, function (err, isMatch) {
                if(err){
                    callback(err);
                } else if(!isMatch){
                    callback(new Error('Passwords do not match'));
                } else {
                    callback(err, user);
                }
            });
        }
    });
};

/**
 * Export model definition object.
 */

module.exports = {
    getAccessToken: getAccessToken,
    deleteAccessToken : deleteAccessToken,
    getClient: getClient,
    grantTypeAllowed: grantTypeAllowed,
    saveAccessToken: saveAccessToken,
    getUser: getUser
};
