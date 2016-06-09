'use strict';

const express = require('express');
const bodyParser = require('body-parser').json();
const basicAuth = require('../lib/basic-auth');
const User = require('../model/user');
const Session = require('../model/session');
const router = module.exports = express.Router();

router.post('/signup', bodyParser, (req, res, next) => {

  let managerID = req.headers.manager;
  let newUser = new User(req.body);
  newUser.password = newUser.hashPassword();
  req.body.password = null;

  User.findOne({username: req.body.username}, (err, user) => {
    if (err || user) return next(new Error('Could not create user'));
    else {
      newUser.user_token = newUser.generateToken();
      newUser.save((err) => {
        if (err) return next(new Error('Could not create user'));

        else if (managerID) {
          Session.findOne({manager_id: managerID}, (err, session) => {
            if (err || !session) return next(new Error('Cannot find session'));
            if (session.users.indexOf(req.body.username) === -1) {
              let sessionArray = session.users;
              sessionArray.push(req.body.username);
              Session.findOneAndUpdate({manager_id: managerID}, {$set: {users: sessionArray}}, (err) => {
                if (err) return next(new Error('Cannot update session'));
              });
            }
          });
        } else {
          res.json({Message: 'No session found... Please log in with manager username!'});
        }
      });
    }
  });
});


router.get('/signin', basicAuth, (req, res, next) => {

  let managerID = req.headers.manager;
  let username = req.auth.username;

  User.findOne({username}, (err, user) => {
    if (err || !user) return next(new Error('Cannot find user'));
    if (!user.comparePassword(req.auth.password)) {
      return next(new Error('Invalid password'));
    }

    Session.findOne({manager_id: managerID}, (err, session) => {
      if (err || !session) return next(new Error('Cannot find session'));
      if (session.users.indexOf(user.username) === -1) {
        let sessionArray = session.users;
        sessionArray.push(user.username);
        Session.findOneAndUpdate({manager_id: managerID}, {$set: {users: sessionArray}}, (err) => {
          if (err) return next(new Error('Cannot update session'));
        });
      }
    });
    return res.json({token: user.generateToken()});
  });

});

module.exports = router;
