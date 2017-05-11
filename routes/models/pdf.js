/**
 * Created by Marcos on 11/05/2017.
 */
'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;


const pdfSchema =  new Schema({
    original_name_pdf: {type: String},
    creator_id: {type: ObjectId},
    is_completely_signed: {type: Boolean},
    someone_is_signing: {type: Boolean},
    signers : [{signer_id: {type: ObjectId}, is_signed: {type: Boolean}, signature_date: {type: Date}}]
});

var Pdf = mongoose.model('Pdf', pdfSchema);

module.exports = User;