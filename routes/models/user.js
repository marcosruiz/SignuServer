/**
 * Created by Marcos on 11/05/2017.
 */
'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

const userSchema =  new Schema({
    username: {type: String},
    password: {type: String},
    email: {type: String},
    name: {type: String},
    last_edition_date: {type:Date},
    creation_date: {type: Date},
    related_people : [{user_id: {type: ObjectId}}]
});

var User = mongoose.model('User', userSchema);

module.exports = User;