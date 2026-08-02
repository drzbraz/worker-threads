const {workerData, parentPort} = require("worker_threads")

let counter=0
for (let index = 0; index < 20_000_000_000 / workerData.thread_count; index++) {
    counter++    
}

parentPort.postMessage(counter)