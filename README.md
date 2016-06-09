# __EQ:__ _Spotify Playlist Equalizer_
A server-side application enabling collaborative Spotify playlist creation and modification.  The app allows multiple connected users to add, veto/delete, and view a single playlist via simple REST requests.  A premium Spotify account is required for the user initially creating and playing songs from the playlist, hereafter referred to as "the manager".

---

## Connecting to EQ
To test out our application, the manager will need to authorize EQ to access their Premium Spotify account and manage their playlists. First, visit the [authorization page](http://http://eq-project.herokuapp.com/), which will grant EQ this access.

Any additional collaborating users (excluding the manager) will be required to sign up with our application or log in.  You may use the REST client of your choice, but we are using curl for our demonstrations.

#### Sign up:
Send a POST request to /signup with a JSON body including username and password. If you'd like to join a manager's playlist session right away, include a header with the manager's username.
```sh
$ curl -i -X POST -H "Content-Type:application/json" -H "manager:username" eq-project.herokuapp.com/signup -d '{"username":"test", "password":"test"}'
```

#### Log in:
Send a GET request to /signin and include a header with the manager's username. This will connect the user to the collaborative session initiated by the manager upon authorization. Include your username and password with your request. The server will send you a token as a reponse, which you should save and send along with every subsequent request within the headers. If you choose to use a client other than curl, you will need to send the username and password using Basic Authorization.
```sh
$ curl --user username:password -H "manager:username" eq-project.herokuapp.com/signin
```

---

## Basic Use & Playlist Modification Requests
Now, you are all set to create a playlist as a group! For all requests, you will need to include your personal token obtained from login.

#### Create a Playlist (Manager only)
To make a new playlist, the manager should send a POST request including the playlist name in the URI. Please note that you cannot include spaces within the name, as it is part of the URI.
```sh
$ curl -i -X POST -H "token:token" eq-project.herokuapp.com/create/PlaylistName
```

#### Get the current state of the playlist
For users that would like to see the playlist as it stands, make a GET request with your username within the headers.
```sh
$ curl -H "Content-Type:application/json" eq-project.herokuapp.com/playlist
```
#### Add a track to the playlist
For users that would like to see the playlist as it stands, make a GET request with your username within the headers.
```sh
$ curl -H "Content-Type:application/json" eq-project.herokuapp.com/playlist
```

#### Veto a track
For users that would like to see the playlist as it stands, make a GET request with your username within the headers.
```sh
$ curl -H "Content-Type:application/json" eq-project.herokuapp.com/playlist
```
---

## Todo
* Reorganize tracks upon addition/deletion for music equality!
* Allow for users to copy the playlist to their own accounts.
* Implement an upvote system to keep track of popular songs.
* Allow users to replace a track that they have added without penalty.
