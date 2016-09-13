'use strict';
/* global self */

module.exports = function() { self.exports = function(options) {

    this.on('marco', function() {
        this.send('polo', {animal: options.animal});
    });

}};
