let Parse = require('../utils/parse.js');
let tf = require('@tensorflow/tfjs');
let rf = require('ml-random-forest');
let User = require('./user.js');
let _ = require('../../config')();  //config data
let request = require('request');
let SpotifyWebApi = require('spotify-web-api-node');
let AWS = require('aws-sdk');

let spotifyApi = new SpotifyWebApi({
    clientId: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET,
    redirectUri: SPOTIFY_REDIRECT_URI
});

AWS.config.update({
    region: "us-east-1",
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

//attempt at creating classes
module.exports = class Backend {
    constructor(){
        this.subscribers = {};
        let curInstance = this;
        let authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            headers: {
                'Authorization': 'Basic ' + (new Buffer(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'))
            },
            form: {
                grant_type: 'client_credentials'
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                // use the access token to access the Spotify Web API
                curInstance.accessToken = body.access_token;
            }
        });
    }

    //  subscribe(): request to be part of an event listener group
    // Should be called on init
    // Called by follower servers
    // Returns: 200 if successs [user models]
    subscribe(username) {
        //need to access the database and train all songs in database
        console.log("called subscribe method");
        let docClient = new AWS.DynamoDB.DocumentClient();
        let params = {
            Key:{
                "Username": username
            },
            TableName: "Interaction"
        };

        let curInstance = this;

        //get information
        docClient.get(params, function(err, data) {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                return 400;
            } else {
                console.log("no err in AWS");
                // [{ Label: "...", SongId: "..."}, ... ]
                let interactions = data["Item"]["Interactions"];
                let songs = interactions.map(s => s.SongId);

                // SongId -> Label
                let songIdLabels = {};
                for (let i = 0; i < interactions.length; i++) {
                    songIdLabels[interactions[i].SongId] = interactions[i].Label;
                }
                console.log("inside AWS about to call spot");
                spotifyApi.setAccessToken(curInstance.accessToken);
                spotifyApi.getAudioFeaturesForTracks(songs)
                    .then(function(data) {
                        console.log("Inside then callbacks");
                        let features = data.body.audio_features;
                        let trainingSet = [];
                        let predictions = [];

                        //looping over features in data
                        for (let i = 0; i < features.length; i++){
                            let fVec = features[i];  //current feature
                            let featurenums = [];           //the current feature parsed and appended to features
                            let songLabel = songIdLabels[fVec.id];  //the label associated with interaction
                            let negativeLabels = [ "skipped", "thumb_down" ];
                            let positiveLabels = [ "finished", "thumb_up" ];

                            //setting numerical label
                            if (negativeLabels.indexOf(songLabel) !== -1){
                                songLabel = "-1";
                            } else if (positiveLabels.indexOf(songLabel) !== -1){
                                songLabel = "1";
                            }

                            for(let i = 0; i < 11; i++) {
                                featurenums.push(fVec[i]);
                            }
                            trainingSet.push(featurenums);
                            predictions.push(songLabel);

                        }

                        // train classifier
                        let options = {
                            seed: 3,
                            maxFeatures: 0.8,
                            replacement: true,
                            nEstimators: 25,
                            useSampleBagging: true
                        };

                        let classifier = new rf.RandomForestClassifier(options);
                        classifier.train(trainingSet, predictions);
                        curInstance.subscribers[username] = classifier;
                        console.log("Updated subscribers!");
                        return 200;
                    }, function(err) {
                        console.log(err);
                        return 400;
                    });
            }
        });
        return 200;
    };


    // receive_information(json): receive a json of user interactions to be passed to ML
    //     json: dictionary of user interactions with the interface Called by follower servers
    //     Returns: 200 if success
    receive_information(username, songId, interactionType) {
        //check if in subscribers:
        if (username in this.subscribers){
            // let label = "1";
            let songLabel = interactionType;
            let negativeLabels = [ "skipped", "thumb_down" ];
            let positiveLabels = [ "finished", "thumb_up" ];
            let curInstance = this;

            // setting numerical label
            if (negativeLabels.indexOf(songLabel) !== -1){
                songLabel = "-1";
            } else {
                songLabel = "1";
            }

            spotifyApi.setAccessToken(curInstance.accessToken);

            //get the data from spotify api
            spotifyApi.getAudioFeaturesForTrack(songId)
                .then(function(data) {
                    let fVec = data.body;
                    let featureVals = [];

                    for(let i = 0; i < 11; i++) {
                        featureVals.push(fVec[i]);
                    }

                    let trainingSet = [featureVals];
                    let predictions = [songLabel];
                    let classifier = curInstance.subscribers[username];
                    classifier.train(trainingSet, predictions);
                    curInstance.subscribers[username] = classifier;
                }, function(err){
                    console.log(err);
                });

            return 200;
        } else { //append by calling subscribe
            return this.subscribe(username);
        }
    }

    suggest(username, songs) {
        console.log("suggest called");
        let curInstance = this;
        if (!Array.isArray(songs)) { songs = [songs]; }
        if (username in curInstance.subscribers === false) {
            console.log("username not found in subs", username);
            return songs;
        }
        spotifyApi.setAccessToken(curInstance.accessToken);
        return spotifyApi.getAudioFeaturesForTracks(songs)
            .then(function(data) {
                let songFeaturesList = data.body.audio_features;
                let songFeatureSet = [];

                //looping over features in data
                for(let i = 0; i < songFeaturesList.length; i++) {
                    let fVec = songFeaturesList[i];  //current feature vector
                    let featureVals = [];

                    for(let i = 0; i < 11; i++) {
                        featureVals.push(fVec[i]);
                    }

                    songFeatureSet.push(featureVals);
                }
                let userModel = curInstance.subscribers[username];
                let preds = userModel.predict(songFeatureSet);
                let suggestedIds = [];
                for(let i = 0; i < preds.length; i++) {
                    if (preds[i] === 1) {
                        suggestedIds.push(songFeaturesList[i].id);
                    }
                }
                return suggestedIds;
            });
    };
};





