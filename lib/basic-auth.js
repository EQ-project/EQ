'use strict';

module.exports = function(req, res, next) {

  if (!req.headers.authorization) return next(new Error('Please sign in!'));

  let authString = req.headers.authorization.split(' ').pop();
  let userBuf = new Buffer(authString, 'base64');
  let userArr = userBuf.toString().split(':');
  userBuf.fill(0);

  req.auth = {
    username: userArr[0],
    password: userArr[1],
  };

  if (!req.auth.username || !req.auth.password) {
    return next(new Error('Username or Password missing'));
  }

  next();
};
