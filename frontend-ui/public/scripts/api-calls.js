// AJAX request the tracks given an accessToken and a list of trackIDs
function spotifyGetTracks(accessToken, tracks) {
    return $.ajax({
        url: 'https://api.spotify.com/v1/tracks?ids=' + tracks.join(","),
        headers: {
            'Authorization': 'Bearer ' + accessToken,
        },
    });
}

function recordUserInteraction(interaction, username) {
    let queryString = "?type=" + interaction.type + "&song_id=" + interaction.songId + "&user=" + username;
    return $.ajax({
        url: "/record-interaction" + queryString
    });
}

function getSuggestedSongs(accessToken, username) {
    let queryString = "?access_token=" + accessToken + "&user=" + username;
    return $.ajax({
        url: "/refresh-feed" + queryString
    });
}