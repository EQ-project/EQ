# __EQ:__ _Spotify Playlist Equalizer_
A server-side application enabling collaborative Spotify playlist creation and modification.  The app allows multiple connected users to add, veto/delete, and view a single playlist via simple REST requests.  A premium Spotify account is required for the user initially creating and playing songs from the playlist, hereafter referred to as "the manager".

---

## Connecting to EQ
To test out our application, the manager will need to authorize EQ to access their Premium Spotify account and manage their playlists. First, visit the [authorization page](https://eq-project.herokuapp.com/), which will grant EQ this access.

Any additional collaborating users (excluding the manager) will be required to sign up with our application or log in.  You may use the REST client of your choice, but we are using curl for our demonstrations.

#### Sign up:
Send a POST request to /signup with a JSON body including username and password. If you'd like to join a manager's playlist session right away, include a header with the manager's username.
```sh
$ curl -X POST -H "Content-Type:application/json" -H "manager:username" eq-project.herokuapp.com/signup -d '{"username":"test", "password":"test"}'
```
#### Log in:
Send a GET request to /signin and include a header with the manager's username. This will connect the user to the collaborative session initiated by the manager upon authorization. Include your username and password with your request. The server will send you a token as a reponse, which you should save and send along with every subsequent request within the headers. If you choose to use a client other than curl, you will need to send the username and password using Basic Authorization.
```sh
$ curl --user username:password -H "manager:username" eq-project.herokuapp.com/signin
```

---

## Basic Use & Playlist Modification Requests
Now, you are all set to create a playlist as a group! For all requests, you will need to include your username and personal token obtained from login.

#### Create a Playlist (Manager only)
To make a new playlist, the manager should send a POST request including their Spotify username in the headers and the playlist name in the URI. Please note that you cannot include spaces within the name, as it is part of the URI.
```sh
$ curl -X POST -H "username:yourUsername" eq-project.herokuapp.com/create/PlaylistName
```

#### Get the current state of the playlist
For users that would like to see the playlist as it stands, make a GET request with your username and token within the headers. If the manager would like more information about the playlist, they may omit the token with their GET request.

##### Manager Example
```sh
$ curl -H "username:yourUsername" eq-project.herokuapp.com/playlist
```
##### User Example
```sh
$ curl -H "username:yourUsername" -H "token:yourToken" eq-project.herokuapp.com/playlist
```

#### Add a track to the playlist
To add a track to the playlist, you must retrieve the track URI from Spotify. If you have the application open, you can right click on the track name and click "Copy Spotify URI." Include this track URI within the request URI path.  Users must include their access token and username within the headers. Managers may omit the token.

##### Manager Example
```sh
$ curl -X POST -H "username:yourUsername" eq-project.herokuapp.com/add/SpotifyURI
```
##### User Example
```sh
$ curl -X POST -H "username:yourUsername" -H "token:yourToken" eq-project.herokuapp.com/add/SpotifyURI
```

#### Veto a track
Users get a limited number of vetoes per hour, determined by the number of collaborators. To veto a track to the playlist, you must retrieve the track URI from Spotify. If you have the application open, you can right click on the track name and click "Copy Spotify URI." Include this track URI within the request URI path.  Users must include their access token and username within the headers. Managers may omit the token.

##### Manager Example
```sh
$ curl -X DELETE -H "username:yourUsername" eq-project.herokuapp.com/delete/SpotifyURI
```
##### User Example
```sh
$ curl -X DELETE -H "username:yourUsername" -H "token:yourToken" eq-project.herokuapp.com/delete/SpotifyURI
```
---
## Todo
* Reorganize tracks upon addition/deletion for music equality!
* Enable easier track addition/deletion without looking up the URI.
* Allow for users to copy the playlist to their own accounts.
* Implement an upvote system to keep track of popular songs.
* Allow users to replace a track that they have added without penalty.
