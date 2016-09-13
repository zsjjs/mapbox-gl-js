var webworkify = require('webworkify');
var Evented = require('../util/evented');
var window = require('../util/window');

var nativeWorkers = [];
function createNativeWorkers() {
    var workerCount = require('../mapbox-gl').workerCount || 3;
    for (var i = 0; i < workerCount; i++) {
        nativeWorkers[i] = webworkify(require('./worker_index.js'));
        nativeWorkers[i].addEventListener('message', function(event) {
            var message = event.data;
            Evented.fire.call(
                pooledWorkers[message.pooledWorkerId],
                message.type,
                message.data
            );
        });
    }
}

var nextNativeWorkerIndex = 0;
function allocateNativeWorker() {
    if (!nativeWorkers.length) createNativeWorkers();
    var nativeWorker = nativeWorkers[nextNativeWorkerIndex];
    nextNativeWorkerIndex = (nextNativeWorkerIndex + 1) % nativeWorkers.length;
    return nativeWorker;
}

var pooledWorkers = [];
function createPooledWorker(body, options) {
    var pooledWorkerId = pooledWorkers.length;
    var nativeWorker = allocateNativeWorker();

    nativeWorker.postMessage({
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
            nativeWorker.postMessage({
                pooledWorkerId: pooledWorkerId,
                type: type,
                data: data
            });
        }
    }

    return pooledWorker;
}
module.exports = createPooledWorker;
