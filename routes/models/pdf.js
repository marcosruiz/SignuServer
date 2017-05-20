/**
 * Created by Marcos on 11/05/2017.
 */
'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
const pdfSchema = new Schema({
    original_name: {type: String},
    owner_id: {type: ObjectId},
    mime_type: {type: String},
    total_signatures: {type: Number, default: 0},
    current_signatures : {type: Number, default: 0},
    file_name: {type: String, required: true, unique: true},
    path : {type: String},
    destination : {type: String},
    with_stamp :  {type: Boolean, default: false},
    encoding : {type: String},
    someone_is_signing: {type: Boolean, default: false}, // this could be a Date
    user_id_signing : {type: ObjectId},
    creation_date : {type: Date, default: Date.now()},
    signers: [{user_id: {type: ObjectId}, is_signed: {type: Boolean}, signature_date: {type: Date}}]
});

var Pdf = mongoose.model('Pdf', pdfSchema);

module.exports = Pdf;