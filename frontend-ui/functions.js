/* Chris Sciavolino (cds253) */
module.exports = function () {
    /**
     * Generates a random string containing numbers and letters
     * @param  {number} length The length of the string
     * @return {string} The generated string
     */
    this.generateRandomString = function(length) {
        let text = '';
        let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };
};