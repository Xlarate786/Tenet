//Primary file to run on the server to initiate backend processes on a
//machine.

let Backend = require('./models/backend.js');

// main(): set up all necessary information and runs
// methods for the new backend machine to be able to accept client requests.

module.exports = function Main(){
  constructor(){
    let backend = new Backend();
  }
};

