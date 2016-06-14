'use strict';

const Manager = require('../model/manager');
const Session = require('../model/session');
const User = require('../model/user');
//typically properties passed through middleware to the routes are set
//to the request not the response.
module.exports = function(req, res, next) {

  let username = req.headers.username;
  if (!username) return next(new Error('Please enter a username in the headers'));

  Manager.findOne({username}, (err, manager) => {
    if (err) return next(err);
    else if (!manager) {
      User.findOne({username}, (err, user) => {
        if (err) return next(err);
        res.user = user;
      });

      Session.findOne({users: username}, (err, session) => {
        if (err) return next(err);
        else if (!session) return next(err);
        res.session = session;

        Manager.findOne({username: session.managerId}, (err, manager) => {
          if (err) return next(err);
          else if (!manager) return next(err);
          res.manager = manager;
          return next();
        });
      });
    } else {
      res.manager = manager;

      Session.findOne({managerId: username}, (err, session) => {
        if (err) return next(err);
        else if (!session) return next(err);
        res.session = session;
        next();
      });
    }
  });
};
