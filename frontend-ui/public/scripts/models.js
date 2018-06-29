class Song {
    constructor(infoDict) {
        this.id = infoDict.id;
        this.name = infoDict.name;
        this.artists = infoDict.artists.map(a => a.name);
        this.album = infoDict.album.name;
        this.previewUrl = infoDict.preview_url;
    }

    get songDictionary() {
        return {
            id: this.id,
            name: this.name,
            artists: this.artists,
            album: this.album,
            preview: this.previewUrl
        };
    }

    get render() {
        return ' <div class="song-wrapper">' +
            '<a class="play-button js-play-button" data-href="' + this.id + '">Play</a>' +
            '<span class="song-text"> | ' + this.name + ' | </span> ' +
            '<span class="song-text">' + this.artists.join(", ") + ' | </span> ' +
            '<span class="song-text">' + this.album + '</span>' +
            '</div>';
    }
}

