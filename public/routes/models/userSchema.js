/**
 * Created by Marcos on 11/05/2017.
 */
'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;


const userSchema = new Schema({
    password: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    next_email: {email: {type: String}, code: {type: String}, when: {type: Date}},
    activation: {is_activated: {type: Boolean, default: false, required: true}, when: {type: Date}, code: String},
    name: {type: String, required: true},
    lastname: {type: String},
    last_edition_date: {type: Date},
    creation_date: {type: Date, required: true, default: Date.now()},
    users_related: [{type: ObjectId, ref: 'User'}],
    pdfs_owned: [{type: ObjectId, ref: 'Pdf'}],
    pdfs_to_sign: [{type: ObjectId, ref: 'Pdf'}],
    pdfs_signed: [{type: ObjectId, ref: 'Pdf'}]
});

function hashPassword(user, next) {
    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
        if (err) return next(err);

        // hash the password using our new salt
        bcrypt.hash(user.password, salt, function (err, hash) {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
}

userSchema.pre('save', function (next) {
    var user = this;
    hashPassword(user, next);
});

userSchema.methods.comparePassword = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

userSchema.methods.compareActivationCode = function (candidateCode, cb) {
    if(candidateCode == this.activation.code){
        cb(null, true);
    } else {
        return cb(new Error('activation code does not match'));
    }
};

var User = mongoose.model('User', userSchema);

module.exports = User;