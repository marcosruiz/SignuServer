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
    email: {type: String, required: true, unique: true},
    name: {type: String},
    lastname: {type: String},
    last_edition_date: {type:Date},
    creation_date: {type: Date, default: Date.now()},
    related_people : [{user_id: {type : ObjectId}}],
    pdfs_to_sign : [{pdf_id : {type : ObjectId}}],
    pdfs_signed : [{pdf_id : {type : ObjectId}}],
    pdfs_owned : [{pdf_id : {type : ObjectId}}]
});

userSchema.pre('save', function(next) {
    var user = this;

    // only hash the password if it has been modified (or is new)
    if (!user.isModified('password')) return next();

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
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

var User = mongoose.model('User', userSchema);

module.exports = User;