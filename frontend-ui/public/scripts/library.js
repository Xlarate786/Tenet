/* Chris Sciavolino (cds253) */
// let urlParams = new URLSearchParams(window.location.search);
// let recentSongs = urlParams.getAll("recent_songs");
// let accessToken = urlParams.get("access_token");
// let displayName = urlParams.get("display_name");
// let refreshToken = urlParams.get("refresh_token");
// let username = urlParams.get("username");

function getTracksById(ids, accessToken, username) {
    let trackRequest = spotifyGetTracks(accessToken, ids);
    trackRequest.then(resp => {
        console.log(resp);
        let songs = resp.tracks.map(song => new Song(song));
        console.log(resp, songs);
        displaySongs(songs, username);
    }, err => {
        console.log(err);
    });
}

// changes the view to show all the rendered songs in the view
function displaySongs(songs, username) {
    const tableElement = document.querySelector(".js-suggested-table");
    tableElement.innerHTML = "";
    songs.forEach(song => {
        tableElement.innerHTML += song.render;
    });
    const playButtons = document.querySelectorAll(".js-play-button");
    const player = document.querySelector(".js-player");
    $('.js-play-button').on('click', function () {
        if (!player.paused) {
            // user is skipping a song to play another, send feedback
            console.log("Logging skip!!");
            let songPreview = player.getAttribute("src");
            let song = songs.filter(s => s.previewUrl === songPreview)[0];
            if (song !== undefined && song !== null) {
                let interaction = {
                    type: "skipped",
                    songId: song.id
                };
                sendUserInteraction(interaction, username);
            }
        }
        let songId = $(this).attr('data-href');
        let songObj = songs.filter(s => s.id === songId)[0];
        console.log(songObj);
        $(".js-player").attr("src", songObj.previewUrl);
        $(".js-title-display").text("Song: " + songObj.name);
        $(".js-artist-display").text("Artist(s): " + songObj.artists.join(", "));
        document.querySelector(".js-player").play();
    });

    player.addEventListener("ended", function () {
        let songUrl = player.getAttribute("src");
        let songId = songs.filter(s => s.previewUrl === songUrl)[0].id;
        let interaction = {
            type: "finished",
            songId: songId
        };
        sendUserInteraction(interaction, username);
    });
    return songs;
}

function sendUserInteraction(interaction, username) {
    let interactionRequest = recordUserInteraction(interaction, username);
    interactionRequest.then(resp => {
        console.log("Response recorded!");
        console.log(resp);
    }, err => {
        console.log(err);
    })
}

function refreshFeed(accessToken, username) {
    let songsRequest = getSuggestedSongs(accessToken, username);
    songsRequest.then(res => {
        res = JSON.parse(res);
        console.log("RESP", res.join(","));
        // let suggestedSongIds = res;
        getTracksById(res, accessToken, username);
    }, err => {
        console.log(err);
    })
}