'use strict';

const router = require('express').Router();
const request = require('superagent');

const User = require('../model/user');
const Session = require('../model/session');
const Manager = require('../model/manager');

const findModels = require('../lib/find-models');
const checkToken = require('../lib/check-token');
const jwtAuth = require('../lib/jwt-auth');
const refreshVetoes = require('../lib/refresh-vetoes');
//I would say to put these in the blocks that they correspond to.
//Since you're not setting these to be in the module scope it could
//be a little misleading intention-wise to set them there.
let accessToken;
let playlistId;
let managerId;

router.get('/playlist', findModels, checkToken, jwtAuth, (req, res) => {

  playlistId = res.session.playlistId;
  managerId = res.manager.username;
  accessToken = res.manager.accessToken;
  //superagent actually already returns promises if you call .then instead of
  //.end, cool use of a promise though!
  let plPromise = new Promise((resolve, reject) => {
    request
      .get(`https://api.spotify.com/v1/users/${managerId}/playlists/${playlistId}`)
      .set('Authorization', 'Bearer ' + accessToken)
      .end((err, res) => {

        if (err) return reject({message: err});

        let playlistArr = res.body.tracks.items;

        resolve (playlistArr.map(function(item, index) {
          let track = item.track;
          //since the position, id, and name fields are consistent
          //I would have set those out here and dot assigned just
          //the other one or two params in your conditionals.
          if (track.artists.length > 1) {
            return {
              postion: index,
              id: track.id,
              name: track.name,
              artistOne: track.artists[0].name,
              artistTwo: track.artists[1].name
            };

          } else {
            return {
              position: index,
              id: track.id,
              name: track.name,
              artist: track.artists[0].name
            };
          }
        }));
      });
  });

  plPromise.then((plData) => {
    res.json({playlist: plData});
  }, (err) => {
    res.json(err);
  });
});
//With rest routes you want to name them after the resource and let
//the method dictate the action. So rather than /create it's implicit that
//a post request sent to this route (I'd go for /playlists) is the create for
//that resource, then make sure to make that clear in your docs.
router.post('/create/:name', findModels, checkToken, (req, res, next) => {

  accessToken = res.manager.accessToken;
  managerId = res.manager.username;
  let playlistName = req.params.name;

  if (res.user) return next(new Error('Users are not permitted to create a playlist'));

  request
  .post(`https://api.spotify.com/v1/users/${managerId}/playlists`)
  .send({name: playlistName, public: false})
  .set('Authorization', `Bearer ${accessToken}`)
  .set('Accept', 'application/json')
  .end((err, response) => {
    playlistId = response.body.id;

    if (err) return next(err);
    else {
      Session.findOneAndUpdate({managerId}, {$set: {playlistId}}, (err) => {
        if (err) return next(err);
        res.json({Message: 'Playlist Created!'});
      });
    }
  });
});
//similarly here you're modifying a playlist so it would most likely be a put
//request to that playlist.
router.post('/add/:track', findModels, checkToken, jwtAuth, (req, res, next) => {

  accessToken = res.manager.accessToken;
  //there could be a good reason for this in some cases, but generally if you
  //have a body available you want to send data in that as opposed to the params.
  //Use params for things like get and delete requests which don't usually have
  //bodies.
  let track = req.params.track;
  //I might do:
  //let trackExists = (!res.user && res.manager.tracks.indexOf(track !== -1))
  //  || (res.user && res.user.tracks.indexOf(track) !== -1)
  // if (trackExists) return res.json({Message: 'Song already on playlist.'})
  //Setting a variable for your checks and using it in
  //conditionals is a useful pattern to know.
  if (!res.user && (res.manager.tracks.indexOf(track) !== -1) ) {
    return res.json({Message: 'Song already on playlist.'});

  } else if (res.user && res.user.tracks.indexOf(track) !== -1) {
    return res.json({Message: 'Song already on playlist.'});

  } else if (!res.session.playlistId) {
    return res.json({Message: 'The manager has not created a playlist.'});

  } else {

    request
      .post(`https://api.spotify.com/v1/users/${res.session.managerId}/playlists/${res.session.playlistId}/tracks`)
      .send({uris: [`${track}`]})
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .end((err) => {
        if (err) {
          return next(err);
        } else if (!res.user) {
          Manager.findOne({username: res.manager.username}, (err, manager) => {
            if (err) return next(err);
            let managerTrackArray = manager.tracks;
            managerTrackArray.push(track);

            Manager.findOneAndUpdate({username: manager.username}, {$set: {tracks: managerTrackArray}}, (err) => {
              if (err) return next(err);
              return res.json({Message:'Track added!'});
            });
          });
        } else {
          User.findOne({username: res.user.username}, (err, user) => {
            let tracks = user.tracks;
            tracks.push(track);

            User.findOneAndUpdate({username: user.username}, {$set: {tracks}}, (err) => {
              if (err) return next(new Error('Cannot update user tracks'));
              res.json({Message:'Track added!'});
            });
          });
        }
      });
  }
});

router.delete('/delete/:track', findModels, checkToken, jwtAuth, refreshVetoes, (req, res, next) => {

  let manager = res.manager;
  let track = req.params.track;
  let managerId = manager.username;
  accessToken = manager.accessToken;
  playlistId = res.session.playlistId;

  if (!res.session.playlistId) {
    return res.json({Message: 'The manager has not created a playlist.'});
  }

  else if (!res.user) {
    Manager.findOne({username: res.manager.username}, (err, manager) => {
      //keep in mind that when you name the argument coming back from your
      //db calls the same as a variable you had set higher in the route
      //it's actually shadowing that variable. By shadowing I mean it's
      //getting in the way of looking up that value. It's not overwriting
      //it since the argument name is scoped to this block. So when this
      //block closes it will be back to the value it has in the surrounding
      //scope. If it's working here there's not necessarily something wrong
      //with it but you want to be careful of this as it can cause some subtle
      //bugs.
      if (err) return next(err);
      else if (manager.vetoes === res.session.users.length + 1) return res.json({Message: 'Out of vetoes'});
      else {
        let newManagerVetoCount = manager.vetoes + 1;

        Manager.findOneAndUpdate({username: manager.username}, {$set: {vetoes: newManagerVetoCount}}, (err) => {
          if (err) return next(err);
        });
        requestDelete();
      }
    });
  } else {
    User.findOne({username: res.user.username}, (err, user) => {
      if (user.vetoes === res.session.users.length + 1) res.json({Message: 'Out of vetoes'});
      else {
        let newUserVetoCount = user.vetoes + 1;

        User.findOneAndUpdate({username: user.username}, {$set: {vetoes: newUserVetoCount}}, (err) => {
          if (err) return next(err);
        });
        requestDelete();
      }
    });
  }
  //There's nothing exactly wrong with getting values from the surrounding scope
  //like this (managerId, playlistId, etc.) but for the sake of encapsulation
  //and potentially testability I would pass them in to the function as
  //arguments. It's a good practice to avoid relying on side effects wherever
  //possible.
  function requestDelete() {
    request
      .del(`https://api.spotify.com/v1/users/${managerId}/playlists/${playlistId}/tracks`)
      .send({'tracks': [{'uri': `${track}`}]})
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', 'application/json')
      .end((err) => {
        if (err) return next(err);
        res.json({Message:'Track deleted!'});
      });
  }
});


router.use((err, req, res, next) => {
  res.json(err.message);
  next(err);
});

module.exports = router;
