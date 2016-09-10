'use strict';

var webworkify = require('webworkify');
var Evented = require('../evented');

var subworkers = [];
function createSubworker(body, options) {
    var worker = createWorker();
    var subworkerId = subworkers.length;

    worker.postMessage({
        type: 'createSubworker',
        data: {
            subworkerId: subworkerId,
            bodyURL: URL.createObjectURL(webworkify(body, {bare: true})),
            options: options
        }
    });

    var subworker = subworkers[subworkerId] = {
        on: Evented.on,
        off: Evented.off,
        once: Evented.once,
        listens: Evented.listens,
        _fire: Evented.fire,
        send: function(type, data) {
            worker.postMessage({
                subworkerId: subworkerId,
                type: type,
                data: data
            });
        }
    };

    return subworker;
}

var workers = [];
function createWorker() {
    var worker = workers[workers.length] = webworkify(require('./worker_index.js'));
    worker.addEventListener('message', function(event) {
        var message = event.data;
        subworkers[message.subworkerId]._fire(message.type, message.data);
    });
    return worker;
}


module.exports = createSubworker;
