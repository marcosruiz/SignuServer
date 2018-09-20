var mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clientSchema = new Schema({
    clientId: String,
    clientSecret: String
});

var Client = mongoose.model('Client', clientSchema);

module.exports = Client;