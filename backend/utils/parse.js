let Follower = require('./follower.js')

// parse_subscriber_information(json) takes in a subscriber json request
// and parses it into a Follower object, which is easier to use.
//     - Returns: Follower instance with all associated information

module.exports = class Parse{
  constructor(){
  }

  parse_subscriber_information(json){
    return Follower.Follower();
  }
}



