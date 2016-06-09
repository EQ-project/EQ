'use strict';

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const request = require('request');
const Manager = require('../model/manager');
let userId;

module.exports = function(req, res, next) {

  let time = Date.now();
  let manager = res.manager;
  userId = manager.username;

  let authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: manager.refreshToken
    },
    json: true
  };

  if (manager.tokenExpires < time) {
    request.post(authOptions, getNewToken);
  } else next();

  function getNewToken(err, response, body) {
    if (!err && response.statusCode === 200) {
      let expiresIn = body.expires_in * 1000;
      let accessToken = body.access_token;

      Manager.findOneAndUpdate({username: userId}, { $set: {accessToken: accessToken, tokenExpires: expiresIn + Date.now()}}, {new: true}, (err, manager) => {
        if (err) throw err;
        res.manager = manager;
        next();
      });
    }
  }
};
