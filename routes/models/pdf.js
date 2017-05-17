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
    total_signatues: {type: Number},
    current_signatures : {type: Number},
    file_name: {type: String, required: true, unique: true},
    path : {type: String},
    destination : {type: String},
    encoding : {type: String},
    someone_is_signing: {type: Boolean}, // this could be a Date
    user_id_signing: {type: ObjectId},
    creation_date : {type: Date},
    signers: [{signer_id: {type: ObjectId}, is_signed: {type: Boolean}, signature_date: {type: Date}}]
});

var Pdf = mongoose.model('Pdf', pdfSchema);

module.exports = Pdf;