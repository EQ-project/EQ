'use strict';

const express = require('express');
const router = express.Router();
const request = require('request');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const stateKey = 'spotify_auth_state';

const generateRandomString = require('../lib/generate-random-string');

const Manager = require('../model/manager');
const Session = require('../model/session');

let access_token;
let manager_id;
let redirect_uri;

router.use(express.static(__dirname + '/../public'))
   .use(cookieParser());

router.get('/login', (req, res) => {

  let state = generateRandomString(16);
  res.cookie(stateKey, state);
  let scope = 'user-read-private playlist-modify-private';
  redirect_uri = `${req.headers.host === 'localhost:8888'?'http://localhost:8888/callback':'https://eq-project.herokuapp.com/callback'}`;
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

router.get('/callback', function(req, res) {

  let code = req.query.code || null;
  let state = req.query.state || null;
  let storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);

    let authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {

      if (!error && response.statusCode === 200) {
        access_token = body.access_token;
        let expires_in = body.expires_in * 1000;
        let refresh_token = body.refresh_token;

        let options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        request.get(options, function(error, response, body) {

          manager_id = body.id;
          let newManager = new Manager({username: manager_id, tokenExpires: expires_in + Date.now(), accessToken: access_token, refreshToken: refresh_token});
          let newSession = new Session({manager_id: manager_id});

          Manager.findOneAndUpdate({username: manager_id}, { $set: {accessToken: access_token, refreshToken: refresh_token}}, (err, manager) => {

            if (!manager) {
              newManager.save((err) => {
                if (err) console.log('manager save error');
              });
            }
          });

          Session.findOne({manager_id: manager_id}, (err, session) => {

            if (!session) {
              newSession.save((err) => {
                if (err) console.log('session save error');
                return res.send('Please have users include the field username in the headers of every request');
              });
            }
          });
          res.send('Please have users include the field username in the headers of every request');
        });
      }
    });
  }
});

module.exports = router;
