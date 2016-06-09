'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const request = require('chai').request;
const mongoose = require('mongoose');

const Session = require('../model/session');
const Manager = require('../model/manager');
const User = require('../model/user');

const checkToken = require('../lib/check-token');
const generateRandomString = require('../lib/generate-random-string');
const findModels = require('../lib/find-models');
const refresh = require('../lib/refresh-vetoes');

process.env.MONGOLAB_URI = 'mongodb://localhost/test_db';
const dbPort = process.env.MONGOLAB_URI;
const access_token = process.env.ACCESS_TOKEN;
const refresh_token = process.env.REFRESH_TOKEN;

require('../server');


let req = {};
req.token = access_token;
req.headers = {};
req.headers.username = 'test';
let res = {};
let vUser;

describe('middleware unit tests', () => {

  before((done) => {

    let testManager = new Manager({username: '1216797299', accessToken: access_token, refreshToken: refresh_token, tokenExpires: Date.now() + 100000});
    let testSession = new Session({manager_id: '1216797299', users:['test']});
    let testUser = new User({username:'test2', password:'test2', vetoes:1, signInTime:(Date.now() + 3600001)});

    testManager.save((err, data) => {
      if (err) throw err;
      res.manager = data;

      testSession.save((err) => {
        if (err) throw err;

        testUser.save((err) => {
          if (err) throw err;

          request('localhost:8888')
          .post('/signup')
          .set('manager', '1216797299')
          .send({username:'test', password:'test'})
          .end((err) => {
            if (err) throw err;
            done();
          });
        });
      });
    });
  });

  after((done) => {
    process.env.MONGOLAB_URI = dbPort;
    mongoose.connection.db.dropDatabase(() => {
      done();
    });
  });

  describe('check token middleware tests', () => {

    it('should not change the token stored on the manager if it is valid', (done) => {

      checkToken(req, res, () => {
        expect(res.manager.accessToken).to.eql(access_token);
        done();
      });
    });

    it('should request a new token and store it on the manager if the current token is invalid', (done) => {
      Manager.findOneAndUpdate({username: '1216797299'}, {$set: {tokenExpires: 0}}, {new: true}, (err, manager) => {
        if (err) throw err;
        res.manager = manager;
        checkToken(req, res, () => {
          expect(res.manager.accessToken).to.not.eql(access_token);
          done();
        });
      });
    });
  });

  describe('generate random string tests', () => {

    it('should return a string', () => {
      let randomString = generateRandomString(10);
      expect(randomString.length).to.eql(10);
      expect(typeof randomString).to.eql('string');
    });
  });

  describe('find models tests', () => {

    it('should find a user and attach the user, manager, and session to the response body', (done) => {
      findModels(req, res, () => {
        expect(res).to.have.property('user');
        expect(res).to.have.property('manager');
        expect(res).to.have.property('session');
        expect(res.user.username).to.eql('test');
        vUser = res.user;
        done();
      });
    });

    it('should error if no username is given in request', (done) => {
      req.headers.username = null;
      res = {};

      findModels(req, res, () => {
        expect(res).to.not.have.property('user');
        expect(res).to.not.have.property('manager');
        expect(res).to.not.have.property('session');
        done();
      });
    });
  });
  describe('refresh vetoes test', () => {

    it('should set vetoes back to zero', (done) => {
      res = {};
      res.user = vUser;

      refresh(req,res, () => {
        expect(res.user.vetoes).to.eql(0);
        done();
      });
    });
  });
});
