'use strict';

var createPooledWorker = require('./pooled_worker');

var worker = createPooledWorker(require('../js/pooled_worker/marco_polo_worker'), {animal: 'chicken'});
worker.once('polo', function(options) {
    console.log('polo', options.animal);
});
console.log('marco');
worker.send('marco');
