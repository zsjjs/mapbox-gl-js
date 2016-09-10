'use strict';
/* global self */

var Evented = require('../evented');

module.exports = function() {
    var subworkers = {};
    function createSubworker(data) {
        var subworkerId = data.subworkerId;
        var subworker = subworkers[subworkerId] = {
            on: Evented.on,
            off: Evented.off,
            once: Evented.once,
            listens: Evented.listens,
            _fire: Evented.fire,
            send: function(type, data) {
                self.postMessage({
                    subworkerId: subworkerId,
                    type: type,
                    data: data
                });
            }
        };

        self.exports = {};
        self.importScripts(data.bodyURL);
        self.exports.call(subworker, data.options);
        self.exports = {};
    }

    self.addEventListener('message', function(event) {
        var message = event.data;
        if (message.subworkerId == null) {
            if (message.type === 'createSubworker') {
                createSubworker(message.data);
            }
        } else {
            subworkers[message.subworkerId]._fire(message.type, message.data);
        }
    });
};
