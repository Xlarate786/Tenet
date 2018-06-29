let express = require('express');           // common NodeJS routing package
let bodyParser = require('body-parser');    // parse JSON bodies in req/res objects
let request = require('request');           // handles sending HTTP requests
let querystring = require('querystring');   // prepares a query URL string for requests
let AWS = require('aws-sdk');               // AWS NodeJS development SDK
let _ = require('../config')();              // contains important constants and config numbers
let Backend = require('./models/backend.js');      // backend of server. processes ML models
let http = require('http');
let SpotifyWebApi = require('spotify-web-api-node');

// allowing EJS connects server to views and allows passing of variables from one to another
let app = express();
app.set('view engine', 'ejs');

let backend = new Backend();

// to support JSON-encoded bodies
app.use(bodyParser());

// set up AWS DynamoDB connection
AWS.config.update({
    region: "us-east-1",
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

app.get("/subs", function (req, res) {
    res.send(backend.subscribers);
});


/**
 * /subscribe: Fetches data from the datastore and saves a trained
 * model associated with the user in a local reference.
 * Should be called when a user logs into the client-side service
 * params: { username }
 * returns: 200 if successful
 */
app.get('/subscribe', function (req, res){

    let username = req.query.username || null;

    //check if valid parameters passed it
    if (username === null){
        res.send("Status Code:" + 400);
    }
    //subscribe and send status code
    let status_code = backend.subscribe(username);
    res.send("Status Code:" + status_code);

});


/**
 * /receive-info: Takes in a user interaction and trains the user model to account
 * for this interaction.
 * params: { username, interactionType, songId }
 * returns: 200 if successful
 */
app.get('/receive-info', function (req, res) {
    //body has json object
    let username = req.query.username || null;
    let songId = req.query.song_id || null;
    let interactionType = req.query.type || null;

    console.log(username, songId, interactionType);
    //check null or return bad request
    if (username === null || songId === null || interactionType === null || req.query.error){
        //set res status code to 400 and return error message in http body; send body response
        res.send("Status Code:" + 400);
    } else {
        let status_code = backend.receive_information(username, songId, interactionType); //check if 200?
        res.send("Status Code:" + status_code); //not sure if this is correct
    }
});

/**
 * /suggest: Takes in a list of possible song suggestions and uses the user's
 * individual ML model to determine which to suggest.
 * params: { username, songs }
 * returns: [ suggestedSongIds ]
 */
app.get('/suggest', function (req, res) {
    let username = req.query.username || null;
    let songs = req.query.songs || null;

    //check null or return bad request
    if (username == null || songs == null){
        console.log("songs", songs);
        console.log("username", username);
        res.send("Status Code:" + 400);
    } else {
        backend.suggest(username, songs).then(resp => {
            console.log(resp);
            res.send(resp);
        }, err => {
            console.log(err);
        });
    }
});

// start listening and serving requests on port 3000
const PORT = 3000;
app.listen(PORT, function () {
    console.log('app listening on localhost:' + PORT);
});