'use strict';

const express = require('express');
const router = express.Router();
const request = require('request'); // "Request" library
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

const client_id = process.env.CLIENT_ID; // Your client id
const client_secret = process.env.CLIENT_SECRET; // Your secret
const redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
const stateKey = 'spotify_auth_state';

const generateRandomString = require('../lib/generate-random-string');

const User = require('../model/user');

let access_token;

router.use(express.static(__dirname + '/../public'))
   .use(cookieParser());

router.get('/login', (req, res) => {

  let state = generateRandomString(16);
  res.cookie(stateKey, state);
  console.log('Cookies', req.cookies)

  // your application requests authorization
  let scope = 'user-read-private playlist-modify-private';
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

  // your application requests refresh and access tokens
  // after checking the state parameter

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
    var authOptions = {
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
        console.log(access_token);

        let options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
          let newUser = new User({user_id: body.id, tokenExpires: expires_in + Date.now(), accessToken: access_token, refreshToken: refresh_token});

          User.findOneAndUpdate({user_id: body.id}, { $set: {accessToken: access_token, refreshToken: refresh_token}}, (err, user) => {
            if (!user) {
              newUser.save((err) => {
                if (err) console.log('save error');
              });
            }
          });
        });
      }
      res.send(`Please include this access token with every request: ${access_token}`);
    });
  }
});

module.exports = router;
