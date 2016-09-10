'use strict';

var createPooledWorker = require('./util/worker2');

var worker = createPooledWorker(require('../js/util/worker2/marco_polo_worker'), {animal: 'chicken'});
worker.once('polo', function(options) {
    console.log('polo', options.animal);
});
console.log('marco');
worker.send('marco');
