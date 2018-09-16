/**
 * Created by Marcos on 11/05/2017.
 */
'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
const pdfSchema = new Schema({
    original_name: {type: String},
    mime_type: {type: String},
    file_name: {type: String, required: true, unique: true},
    path : {type: String},
    destination : {type: String},
    with_stamp :  {type: Boolean, default: false},
    encoding : {type: String},
    creation_date : {type: Date, default: Date.now()},
    last_edition_date : {type: Date},
    owner_id: {type: ObjectId, ref: 'User'},
    is_any_user_signing: {_id: {type: ObjectId, ref: 'User'}, when: {type: Date}, success: {type: Boolean, defalut: false}}, // Shows who tried to sign
    signers: [{_id: {type: ObjectId, ref: 'Pdf'}, is_signed: {type: Boolean, defalut:false}, signature_date: {type: Date, defalut: null}}]
});

var Pdf = mongoose.model('Pdf', pdfSchema);

module.exports = Pdf;