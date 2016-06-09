'use strict';

const Manager = require('../model/manager');
const Session = require('../model/session');
const User = require('../model/user');

module.exports = function(req, res, next) {

  let user_id = res.manager.username;

  Manager.findOne({username: user_id}, (err, manager) => {
    if (!manager) {
      User.findOne({username: user_id}, (err, user) => {
        if (err) return res.send('Cannot find user.');
        res.user = user;
      });

      Session.findOne({users: user_id}, (err, session) => {
        if (err) return res.send('Cannot find session.');
        res.session = session;
        console.log('session', session);

        Manager.findOne({username: session.manager_id}, (err, manager) => {
          if (err) return res.send('Cannot find manager.');
          res.manager = manager;
          next();
        });
      });
    } else {

      res.manager = manager;

      Session.findOne({manager_id: user_id}, (err, session) => {
        if (err) return res.send('Cannot find session.');
        res.session = session;
        next();
      });
    }
  });

};
