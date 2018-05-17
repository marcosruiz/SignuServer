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
    username: {type: String, unique: true},
    password: {type: String},
    activation_code: {type: String},
    email: {type: String, required: true, unique: true},
    activated : {type: Boolean, required: true, default: false},
    name: {type: String},
    lastname: {type: String},
    last_edition_date: {type:Date},
    creation_date: {type: Date, required: true, default: Date.now()},
    related_people : [{user_id: {type : ObjectId}}],
    pdfs_owned : [{pdf_id : {type : ObjectId}}],
    pdfs_sign : [{pdf_id : {type : ObjectId}}]
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

    // only hash the activation_code if it has been modified (or is new)
    if(user.isModified('activation_code')){
        // generate a salt
        bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
            if (err) return next(err);

            // hash the activation_code using our new salt
            bcrypt.hash(user.activation_code, salt, function(err, hash) {
                if (err) return next(err);

                // override the cleartext activation_code with the hashed one
                user.activation_code = hash;
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
    bcrypt.compare(candidateCode, this.activation_code, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};
var User = mongoose.model('User', userSchema);

module.exports = User;