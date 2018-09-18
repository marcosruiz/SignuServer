var mongoose = require('mongoose');
const Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

const tokenSchema = new Schema({
    accessToken: String,
    expires: Date,
    clientId: String,
    user_id: {type: ObjectId, ref: 'User'}
});

//Autoremove for expired tokens
tokenSchema.index({"expires": 1}, {expireAfterSeconds: 0});

var Token = mongoose.model('Token', tokenSchema);


module.exports = Token;