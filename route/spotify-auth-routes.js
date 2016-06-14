'use strict';

const express = require('express');
const router = express.Router();
const request = require('request');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

const Manager = require('../model/manager');
const Session = require('../model/session');

const generateRandomString = require('../lib/generate-random-string');

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const stateKey = 'spotify_auth_state';

let accessToken;
let managerId;
let redirectUri;

router.use(express.static(__dirname + '/../public'))
   .use(cookieParser());

router.get('/login', (req, res) => {

  let state = generateRandomString(16);
  res.cookie(stateKey, state);
  let scope = 'user-read-private playlist-modify-private';
  //multiple lines
  redirectUri = `${req.headers.host === 'localhost:8888'?'http://localhost:8888/callback':'https://eq-project.herokuapp.com/callback'}`;

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: clientId,
      scope: scope,
      redirect_uri: redirectUri,
      state: state
    }));
});

router.get('/callback', (req, res, next) => {

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
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(clientId + ':' + clientSecret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, (error, response, body) => {

      if (!error && response.statusCode === 200) {
        accessToken = body.access_token;
        let expiresIn = body.expires_in * 1000;
        let refreshToken = body.refresh_token;

        let options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + accessToken },
          json: true
        };

        request.get(options, (error, response, body) => {

          managerId = body.id;
          //multiple lines
          let newManager = new Manager({username: managerId, tokenExpires: expiresIn + Date.now(), accessToken, refreshToken});
          let newSession = new Session({managerId});

          Manager.findOneAndUpdate({username: managerId}, {$set: {accessToken, refreshToken}}, (err, manager) => {

            if (err) return next(err);

            else if (!manager) {
              newManager.save((err) => {
                if (err) return next(err);
                newSession.save((err) => {
                  if (err) return next(err);
                  return res.json({Message: 'Successfully authorized'});
                });
              });
            } else {
              res.json({Message: 'You are already authorized, but thanks for trying!'});
            }
          });
        });
      }
    });
  }
});

router.use((err, req, res, next) => {
  res.json(err.message);
  next(err);
});

module.exports = router;
