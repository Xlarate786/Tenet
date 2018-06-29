/* Chris Sciavolino (cds253) */

document.addEventListener('DOMContentLoaded', function () {
    let urlParams = new URLSearchParams(window.location.search);
    let recentSongIds = urlParams.getAll("recent_songs");
    let accessToken = urlParams.get("access_token");
    let displayName = urlParams.get("display_name");
    let refreshToken = urlParams.get("refresh_token");
    let username = urlParams.get("username");

    let currentSongs = getTracksById(recentSongIds, accessToken, username);
    const refreshButton = document.querySelector(".js-refresh-button");
    refreshButton.addEventListener("click", function () {
        refreshFeed(accessToken, username);
    });
});