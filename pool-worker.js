const { parentPort } = require('worker_threads')
const { processOrders } = require('./analytics')

// Unlike the one-shot workers, this worker stays alive and waits for
// tasks. It pays the spawn + JIT warm-up cost ONCE, then serves every
// subsequent request at full speed.
parentPort.on('message', ({ startId, count }) => {
    parentPort.postMessage(processOrders(startId, count))
})
