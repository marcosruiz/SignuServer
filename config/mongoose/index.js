/**
 * Created by Marcos on 11/05/2017.
 */

'use strict';

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/auth');

module.exports = mongoose;