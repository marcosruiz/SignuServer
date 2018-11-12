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
    path: {type: String},
    destination: {type: String},
    with_stamp: {type: Boolean, default: false},
    encoding: {type: String},
    creation_date: {type: Date, default: Date.now()},
    last_edition_date: {type: Date, required: true},
    owner_id: {type: ObjectId, ref: 'User'},
    signers: [{
        _id: {type: ObjectId, ref: 'Pdf'},
        is_signed: {type: Boolean, default: false},
        signature_date: {type: Date, default: null}
    }],
    was_locked: {type: Boolean, default: false},
    when_was_locked: {type: Date},
    was_locked_by: {type: ObjectId, ref: 'User'}
});

var Pdf = mongoose.model('Pdf', pdfSchema);

module.exports = Pdf;