module.exports = class Song {
    constructor(track) {
        this.id = track.id;
        this.name = track.name;
        this.artists = track.artists.map(a => a.name);
        this.album = track.album.name;
        this.previewUrl = track.preview_url;
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
};