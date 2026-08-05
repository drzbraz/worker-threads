const { workerData, parentPort } = require('worker_threads')
const { processOrders } = require('./analytics')

// Each worker crunches its own slice of the Black Friday orders.
const { startId, count } = workerData
const report = processOrders(startId, count)

parentPort.postMessage(report)
