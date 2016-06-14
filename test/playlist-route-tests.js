'use strict';

const chai = require('chai');
const chaiHTTP = require('chai-http');
chai.use(chaiHTTP);
const expect = chai.expect;
const request = chai.request;
const mongoose = require('mongoose');

const Manager = require('../model/manager');
const Session = require('../model/session');

const accessToken = process.env.ACCESS_TOKEN;
const dbPort = process.env.MONGOLAB_URI;
process.env.MONGOLAB_URI = 'mongodb://localhost/test';

require('../server.js');

describe('playlist routes', () => {

  let token;
  let manager;

  before((done) => {
    //If you're using the same number multiple times throughout your code you
    //should assign it to a variable somewhere. Both so that if you have to change
    //it you only have to change it in one place and to give it semantic meaning.
    //Numbers that appear multiple times like this without explicitly stated
    //meaning are called 'magic numbers.' Since it's just a number it's hard to
    //tell why you're using it multiple times and you can make that clear with your
    //variable name. Something like: const TEST_ID = '1216797299'
    let testManager = new Manager({username: '1216797299', accessToken, refreshToken: 'test', tokenExpires: Date.now() + 100000});
    let testSession = new Session({managerId: '1216797299'});

    testManager.save((err, data) => {
      if (err) throw err;
      manager = data;

      testSession.save((err) => {
        if (err) throw err;

        request('localhost:8888')
        .post('/signup')
        .set('manager', '1216797299')
        .send({username:'test', password:'test'})
        .end((err, res) => {
          if (err) throw err;
          token = res.body.token;
          done();
        });
      });
    });
  });


  before((done) => {
    let testManager = new Manager({username: '1216797299', accessToken: accessToken, refreshToken: 'test', tokenExpires: Date.now() + 100000});
    let testSession = new Session({managerId: '1216797299'});

    testManager.save((err, data) => {
      if (err) throw err;
      manager = data;
      
      testSession.save((err) => {
        if (err) throw err;
        done();
      });
    });
  });

  after((done) => {
    process.env.MONGOLAB_URI = dbPort;
    mongoose.connection.db.dropDatabase(() => {
      done();
    });
  });

  describe('tests that need a playlist created', () => {

    before((done) => {
      request('localhost:8888')
       .post('/create/test')
       .set('username', manager.username)
       .set('token', token)
       .end((err,res) => {
         if (err) throw err;
         expect(res.body.Message).to.eql('Playlist Created!');
         done();
       });
    });

    it('should get a playlist', (done) => {
      request('localhost:8888')
      .get('/playlist')
      .set('token', token)
      .set('username', manager.username)
      .end((err,res) => {
        if (err) throw err;
        expect(typeof res.body).to.eql('object');
        done();
      });
    });

    it('should add a track', (done) => {
      request('localhost:8888')
      //I'd probably also set this track id to a constant.
      .post('/add/spotify:track:33vzOPcd9FRirYGlCu32x4')
      .set('token', token)
      .set('username', manager.username)
      .end((err,res) => {
        if (err) throw err;
        expect(res.body.Message).to.eql('Track added!');
        done();
      });
    });

    it('should delete a track', (done) => {
      request('localhost:8888')
      .delete('/delete/spotify:track:33vzOPcd9FRirYGlCu32x4')
      .set('token', token)
      .set('username', manager.username)
      .end((err,res) => {
        if (err) throw err;
        expect(res.body.Message).to.eql('Track deleted!');
        done();
      });
    });
  });
});
