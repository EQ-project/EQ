'use strict';

const express = require('express');
const bodyParser = require('body-parser').json();
const basicAuth = require('../lib/basic-auth');
const User = require('../model/user');
const Session = require('../model/session');
const router = module.exports = express.Router();

router.post('/signup', bodyParser, (req, res, next) => {

  let newUser = new User(req.body);
  let managerID = req.headers.manager;
  newUser.password = newUser.hashPassword();
  req.body.password = null;

  User.findOne({username: req.body.username}, (err, user) => {
    if (err || user) return next(new Error('Could not create user'));
    newUser.user_token = newUser.generateToken();

    newUser.save((err, user) => {
      if (err) return next(new Error('Could not create user'));
      else if (req.headers.manager) findAndUpdateSession(managerID, user, next);
      res.json({token: newUser.user_token});
    });
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

    findAndUpdateSession(managerID, user, next);
    return res.json({token: user.generateToken()});
  });
});

function findAndUpdateSession(managerID, user, next) {
  Session.findOne({manager_id: managerID}, (err, session) => {
    if (err || !session) return next(new Error('Cannot find session'));
    else if (session.users.indexOf(user.username) === -1) {
      let sessionArray = session.users;
      sessionArray.push(user.username);
      Session.findOneAndUpdate({manager_id: managerID}, {$set: {users: sessionArray}}, (err) => {
        if (err) return next(new Error('Cannot update session'));
      });
    }
  });
}

module.exports = router;
