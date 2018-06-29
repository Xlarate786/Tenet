/* Chris Sciavolino (cds253) */
let express = require('express');                       // common NodeJS routing package
let bodyParser = require('body-parser');                // parse JSON bodies in req/res objects
let request = require('request');                       // handles sending HTTP requests
let querystring = require('querystring');               // prepares a query URL string for requests
let passwordHash = require('password-hash');            // used to hash and verify passwords
let AWS = require('aws-sdk');                           // AWS NodeJS development SDK
let spotifyWebApi = require('spotify-web-api-node');    // Github Spotify API Wrapper
let config = require('./config')();                     // contains important constants and config numbers
let funcs = require('./functions')();
let Song = require('./models/song');

// allowing EJS connects server to views and allows passing of variables from one to another
let app = express();
app.set('view engine', 'ejs');

// to support JSON-encoded bodies
app.use(bodyParser());

// to natively serve static content in the public dir
app.use(express.static("public"));

// set up AWS DynamoDB connection
AWS.config.update({
    region: "us-east-1",
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

let userDict = {};

app.get("/login", function (req, res) {
    console.log("QUERY ARGS", req.query);
    res.render(__dirname + "/public/login", req.query);
});

// redirects the user to the Spotify default login page for authentication
app.get('/spotify-login', function (req, res) {
    let username = req.query.username || null;
    let state = generateRandomString(16);

    if (username === null) { console.log("Error: username not passed when signing up."); }

    userDict[state] = username;

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: SPOTIFY_CLIENT_ID,
            scope: SPOTIFY_SCOPES.join(" "),
            redirect_uri: SPOTIFY_REDIRECT_URI,
            state: state
        })
    );
});

// callback function for the Spotify login page -- handles retrieving access_tokens if validated user info
app.get('/spotify-authorization', function (req, endpointResponse) {
    let code = req.query.code || null;
    let state = req.query.state || null;
    let username = userDict[state];
    delete userDict[state];

    // check if denied access or no code returned in response
    if (code === null || req.query.error) {
        endpointResponse.redirect('/spotify-error?' +
            querystring.stringify({
                error: req.query.error
            })
        );
    }

    // prepare request for access_token and refresh_token with code from the response
    let authOptions = {
        url: "https://accounts.spotify.com/api/token",
        form: {
            code: code,
            redirect_uri: SPOTIFY_REDIRECT_URI,
            grant_type: "authorization_code"
        },
        headers: {
            'Authorization': 'Basic ' + (new Buffer(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'))
        },
        json: true
    };

    // post request with the authorization_code to retrieve an access_token and refresh_token for the user
    request.post(authOptions, function (err, postResp, body) {
        if (!err && postResp.statusCode === 200) {
            // no error and correct status code
            let accessToken = body.access_token;
            let refreshToken = body.refresh_token;

            // prepare request basic information about the user with new access_token
            let userInfoRequest = {
                url: "https://api.spotify.com/v1/me",
                headers: { 'Authorization': 'Bearer ' + accessToken },
                json: true
            };

            let mostRecentTracksRequest = {
                url: "https://api.spotify.com/v1/me/player/recently-played",
                headers: { 'Authorization': 'Bearer ' + accessToken },
                json: true
            };

            request.get(userInfoRequest, function (err, res, body) {
                let displayName = body.display_name;
                let userId = body.id;
                let userProduct = body.product;
                let docClient = new AWS.DynamoDB.DocumentClient();
                let updateQuery = {
                    TableName: "User",
                    Key: {
                        "Username": username
                    },
                    UpdateExpression: "set DisplayName=:d, AccessToken=:a, RefreshToken=:r",
                    ExpressionAttributeValues:{
                        ":d":displayName,
                        ":a":accessToken,
                        ":r":refreshToken
                    },
                    ReturnValues:"UPDATED_NEW"
                };

                console.log("Trying to update new user to DynamoDB User table");
                docClient.update(updateQuery, (err, data) => {
                    if (err) {
                        console.log("Unable to update item. Error JSON: ", JSON.stringify(err, null, 2));
                    } else {
                        console.log("Updated item: ", JSON.stringify(data, null, 2));
                        request.get(mostRecentTracksRequest, function (err, res, body) {
                            let items = body.items || null;
                            let tracks = items.map(obj => new Song(obj.track));

                            let interactions = tracks.map(function (song) {
                                return {
                                    "SongId": song.id,
                                    "Label": "finished"
                                };
                            });
                            let addInteractionsQuery = {
                                TableName: "Interaction",
                                Item: {
                                    "Username": username,
                                    "Interactions": interactions
                                }
                            };

                            console.log("Trying to Add new interaction to DynamoDB User table");
                            docClient.put(addInteractionsQuery, (err, data) => {
                                if (err) {
                                    console.log("Unable to Add item. Error JSON: ", JSON.stringify(err, null, 2));
                                } else {
                                    console.log("Added item: ", JSON.stringify(data, null, 2));
                                }
                            });
                            // redirect to main page, passing in user information to the page
                            endpointResponse.redirect('/main?' +
                                querystring.stringify({
                                    access_token: accessToken,
                                    refresh_token: refreshToken,
                                    display_name: displayName,
                                    username: username,
                                    recent_songs: tracks.map(t => t.id)
                                })
                            );
                        });
                    }
                });
            });
        } else {
            // error with request for access_token or unsuccessful status code
            console.log("**ERROR** in /spotify-authorization access_token request");
            console.log("Status code:", postResp.statusCode);
            console.log("Response body:", body);
        }
    });
});

// serve the main page, passing in the params from the access_token request
app.get('/main', function (req, res) {
    console.log("QUERY ARGS", req.query);
    res.render(__dirname + "/public/main", req.query);
});

app.get("/record-interaction", function (req, endpointResp) {
    console.log("QUERY arguments in record interaction", req.query);
    let songId = req.query.song_id;
    let interactionType = req.query.type;
    let username = req.query.user;
    // write to DB
    let docClient = new AWS.DynamoDB.DocumentClient();
    let updateQuery = {
        TableName: "Interaction",
        Key: {
            "Username": username
        },
        UpdateExpression: "set #int=list_append(#int,:i)",
        ExpressionAttributeNames: {
            "#int": "Interactions"
        },
        ExpressionAttributeValues:{
            ":i": [{
                "SongId": songId,
                "Label": interactionType
            }],
        },
        ReturnValues:"UPDATED_NEW"
    };

    console.log("Trying to update new user to DynamoDB Interaction table");
    docClient.update(updateQuery, (err, data) => {
        if (err) {
            console.log("Unable to update item. Error JSON: ", JSON.stringify(err, null, 2));
            endpointResp.send("Failure :(");
        } else {
            // console.log("Updated item: ", JSON.stringify(data, null, 2));
            console.log("Successfully updated!");
            let queryString = "?username=" + username + "&song_id=" + songId + "&type=" + interactionType;
            let interactionRequest = {
                url: BACKEND_HOSTNAME + "/receive-info" + queryString,
            };

            request.get(interactionRequest, function (err, res, body) {
                if (body === "Status Code:200") {
                    console.log("Successful!");
                    endpointResp.send("successful!");
                } else if (err) {
                    console.log("Error!", err);
                    endpointResp.send(err);
                }
            });
        }
    });
});

app.get("/refresh-feed", function (req, endpointRes) {
    let accessToken = req.query.access_token;
    let username = req.query.user;

    let librarySongsRequest = {
        url: "https://api.spotify.com/v1/me/tracks?limit=50",
        headers: { 'Authorization': 'Bearer ' + accessToken },
        json: true
    };

    request.get(librarySongsRequest, function (err, res, body) {
        console.log(body);
        let items = body.items || null;
        items = items.filter(obj => obj.preview_url !== null);
        let tracks = items.map(obj => new Song(obj.track));
        let songIds = tracks.map(t => t.id);

        let queryString = "?username=" + username + "&songs=" + songIds.join(",");
        let suggestedSongsRequest = {
            url: BACKEND_HOSTNAME + "/suggest" + queryString,
        };

        request.get(suggestedSongsRequest, function (err, res, body) {
            if (err) console.log("ERROR", err);
            console.log(body);
            endpointRes.send(body);
        });
    });
});

app.get("/sign-up", function (req, res) {
    res.render(__dirname + "/public/sign-up", req.query);
});

// serve an error page for all spotify errors
app.get('/spotify-error', function (req, res) {
    res.render(__dirname + "/public/spotify-error", req.query);
});

app.post('/sign-up-validate', function (req, res) {
    let docClient = new AWS.DynamoDB.DocumentClient();
    let username = req.body.username || null;
    let password = req.body.password || null;

    if (!username || !password) {
        // either username or password not submitted -> reject with error
        res.redirect("/sign-up?" +
            querystring.stringify({
                error: (
                    "Missing information: " +
                    (username === null ? "username " : "") +
                    (password === null ? "password" : "")
                )
            })
        );
        return;
    }

    let userInfo = {
        TableName: "User",
        Key: {
            "Username": username
        }
    };

    docClient.get(userInfo, (err, data) => {
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            let usernameTaken = data.Item !== undefined;
            if (usernameTaken) {
                // trying to sign up with unavailable username -> redirect with error msg
                res.redirect("/sign-up?" +
                    querystring.stringify({
                        error: "Sorry, username " + username + " is already taken."
                    })
                );
            } else {
                // username available, create a new User entry
                let newUser = {
                    TableName: "User",
                    Item: {
                        "Username": req.body.username,
                        "HashPassword": passwordHash.generate(req.body.password),
                        "DisplayName": null,
                        "AccessToken": null,
                        "RefreshToken": null
                    }
                };

                console.log("Trying to add new user to DynamoDB User table");
                docClient.put(newUser, (err, data) => {
                    if (err) {
                        console.log("Unable to add item. Error JSON: ", JSON.stringify(err, null, 2));
                    } else {
                        console.log("Added item: ", JSON.stringify(data, null, 2));
                        res.redirect("/spotify-login?" +
                            querystring.stringify({
                                "username": username
                            })
                        );
                    }
                });
            }
        }
    });
});

// Validates whether the user's account information is accurate by
// querying the AWS database in the backend.
app.post('/login-validate', function (req, res) {
    let docClient = new AWS.DynamoDB.DocumentClient();
    const user = req.body.username;
    const password = req.body.password;

    let userInfo = {
        TableName: "User",
        Key: {
            "Username": user
        }
    };

    docClient.get(userInfo, (err, data) => {
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            console.log(data.Item);
            if (data.Item === undefined) {
                // invalid username
                res.redirect("/login?" +
                    querystring.stringify({
                        error: "Incorrect username and password."
                    })
                );
                return;
            }
            const displayName = data.Item.DisplayName || null;
            const refreshToken = data.Item.RefreshToken || null;
            const hashedPassword = data.Item.HashPassword || null;
            if (!passwordHash.verify(password, hashedPassword)) {
                // invalid password
                res.redirect("/login?" +
                    querystring.stringify({
                        error: "Incorrect username and password."
                    })
                );
            }

            if (refreshToken === undefined || refreshToken === null) {
                // no refresh token -> need to log into spotify
                res.redirect("/spotify-login?" +
                    querystring.stringify({
                        username: user
                    })
                );
                return;
            }

            let authOptions = {
                url: 'https://accounts.spotify.com/api/token',
                headers: { 'Authorization': 'Basic ' + (new Buffer(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')) },
                form: {
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                },
                json: true
            };

            request.post(authOptions, function(error, response, body) {
                if (!error && response.statusCode === 200) {
                    let accessToken = body.access_token;

                    let interactionsInfo = {
                        TableName: "Interaction",
                        Key: {
                            "Username": user
                        }
                    };

                    docClient.get(interactionsInfo, (err, data) => {
                        if (err) {
                            console.log("Error:", err);
                        } else {
                            let songIds = data.Item.Interactions.map(entry => entry.SongId).slice(0, 20);
                            let subscribeRequest = {
                                url: BACKEND_HOSTNAME + "/subscribe?username=" + user
                            };
                            request.get(subscribeRequest, function (error, response, body) {
                                res.redirect('/main?' +
                                    querystring.stringify({
                                        access_token: accessToken,
                                        refresh_token: refreshToken,
                                        display_name: displayName,
                                        username: user,
                                        recent_songs: songIds
                                    })
                                );
                            });
                        }
                    });
                }
            });
        }
    });
});

// start listening and serving requests on port 3000
const PORT = 3000;
app.listen(PORT, function () {
    console.log('app listening on localhost:' + PORT);
});