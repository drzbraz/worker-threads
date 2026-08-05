const { parentPort } = require('worker_threads')
const { TOTAL_ORDERS, processOrders } = require('./analytics')

// Crunch the whole Black Friday dataset in a single background thread.
const report = processOrders(0, TOTAL_ORDERS)

parentPort.postMessage(report)
