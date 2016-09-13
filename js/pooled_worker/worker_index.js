'use strict';
/* global self */

var Evented = require('../util/evented');

module.exports = function() {

    var pooledWorkers = {};
    function createPooledWorker(data) {
        var pooledWorkerId = data.pooledWorkerId;
        var pooledWorker = pooledWorkers[pooledWorkerId] = {
            on: Evented.on,
            off: Evented.off,
            once: Evented.once,
            listens: Evented.listens,
            send: function(type, data) {
                self.postMessage({
                    pooledWorkerId: pooledWorkerId,
                    type: type,
                    data: data
                });
            }
        };

        self.exports = {};
        self.importScripts(data.bodyURL);
        self.exports.call(pooledWorker, data.options);
        self.exports = {};
    }

    self.addEventListener('message', function(event) {
        var message = event.data;
        if (message.pooledWorkerId == null) {
            if (message.type === 'createPooledWorker') {
                createPooledWorker(message.data);
            }
        } else {
            Evented.fire.call(
                pooledWorkers[message.pooledWorkerId],
                message.type,
                message.data
            );
        }
    });

};
