var webworkify = require('webworkify');
var Evented = require('../util/evented');

var workers = [];
function createWorker() {
    var worker = webworkify(require('./worker_index.js'));
    worker.addEventListener('message', function(event) {
        var message = event.data;
        Evented.fire.call(
            pooledWorkers[message.pooledWorkerId],
            message.type,
            message.data
        );
    })
    return worker;
}

var pooledWorkers = [];
function createPooledWorker(body, options) {
    var worker = createWorker();
    var pooledWorkerId = pooledWorkers.length;

    worker.postMessage({
        type: 'createPooledWorker',
        data: {
            pooledWorkerId: pooledWorkerId,
            bodyURL: window.URL.createObjectURL(webworkify(body, {bare: true})),
            options: options
        }
    });

    var pooledWorker = pooledWorkers[pooledWorkerId] = {
        on: Evented.on,
        off: Evented.off,
        once: Evented.once,
        listens: Evented.listens,
        send: function(type, data) {
            worker.postMessage({
                pooledWorkerId: pooledWorkerId,
                type: type,
                data: data
            });
        }
    }

    return pooledWorker;
}
module.exports = createPooledWorker;
