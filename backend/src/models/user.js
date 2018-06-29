

module.exports = class User {
  constructor(username, song_id, user_interactions, ml_model){
    this.username = username;
    this.song_id = song_id;
    this.user_interactions = user_interactions;
    this.ml_model = ml_model;
  }

}



