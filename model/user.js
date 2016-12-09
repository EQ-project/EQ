'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const secret = process.env.SECRET || 'testPass';

const User = new mongoose.Schema({
  username: {type: String, required: true},
  password: {type: String, required: true},
  findHash: {type: String, unique: true},
  userToken: {type: String, default: null},
  vetoes: {type: Number, required: true, default: 0},
  tracks: {type: Array},
  signInTime: {type: Number, default: Date.now()},
});

User.methods.generatePasswordHash = function(password) {
  return new Promise((resolve, reject) => {
    bcrypt.hashSync(this.password, 8, (err, hash) => {
      if (err) return reject(err);
      this.password = hash;
      resolve(this);
    });
  });
};

User.methods.comparePassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

User.methods.generateToken = function() {
  return jwt.sign({_id: this._id}, secret);
};

module.exports = mongoose.model('user', User);
