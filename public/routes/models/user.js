/**
 * Created by Marcos on 11/05/2017.
 */
'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;


const userSchema =  new Schema({
    password: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    activation : {is_activated : {type: Boolean, default: false, required: true}, when: {type:Date}, code: String},
    name: {type: String, required: true},
    lastname: {type: String},
    last_edition_date: {type:Date},
    creation_date: {type: Date, required: true, default: Date.now()},
    users_related : [{_id: {type : ObjectId, ref: 'User'}}],
    pdfs_owned : [{_id : {type : ObjectId, ref: 'Pdf'}}],
    pdfs_to_sign : [{_id : {type : ObjectId, ref: 'Pdf'}}],
    pdfs_signed : [{_id : {type : ObjectId, ref: 'Pdf'}}]
});

userSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (user.isModified('password')){
        // generate a salt
        bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
            if (err) return next(err);

            // hash the password using our new salt
            bcrypt.hash(user.password, salt, function(err, hash) {
                if (err) return next(err);

                // override the cleartext password with the hashed one
                user.password = hash;
                next();
            });
        });
    }

    // only hash the activation.code if it has been modified (or is new)
    if(user.isModified('activation.code')){
        // generate a salt
        bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
            if (err) return next(err);

            // hash the activation.code using our new salt
            bcrypt.hash(user.activation.code, salt, function(err, hash) {
                if (err) return next(err);

                // override the cleartext activation.code with the hashed one
                user.activation.code = hash;
                next();
            });
        });
    }
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

userSchema.methods.compareActivationCode = function(candidateCode, cb) {
    bcrypt.compare(candidateCode, this.activation.code, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

var User = mongoose.model('User', userSchema);

module.exports = User;