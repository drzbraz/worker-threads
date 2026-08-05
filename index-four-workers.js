const express = require('express')
const { Worker } = require('worker_threads')
const os = require('os')
const { TOTAL_ORDERS, mergeReports, formatReport } = require('./analytics')

const app = express()
const port = 3000

// One worker per CPU core (capped at 4 for the demo).
const THREAD_COUNT = Math.min(4, os.availableParallelism())

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'store is up, customers are buying 🛒' })
})

function createWorker(startId, count) {
    return new Promise((resolve, reject) => {
        const worker = new Worker('./four-workers.js', {
            workerData: { startId, count }
        })

        worker.on('message', resolve)
        worker.on('error', reject)
    })
}

// ✅✅ THE UPGRADE: instead of one worker crunching all 300 million
// orders alone, we split the dataset into chunks and process them
// in PARALLEL — one worker per CPU core. Same result, a fraction
// of the time, and the event loop never blocks.
app.get('/sales-report', async (req, res) => {
    const start = performance.now()
    const chunkSize = Math.ceil(TOTAL_ORDERS / THREAD_COUNT)

    const workers = []
    for (let i = 0; i < THREAD_COUNT; i++) {
        const startId = i * chunkSize
        const count = Math.min(chunkSize, TOTAL_ORDERS - startId)
        workers.push(createWorker(startId, count))
    }

    try {
        const chunks = await Promise.all(workers)

        res.status(200).json({
            mode: `${THREAD_COUNT} worker threads in parallel (event loop free 🚀🚀)`,
            ...formatReport(mergeReports(chunks), performance.now() - start)
        })
    } catch (error) {
        res.status(500).json({ error: String(error) })
    }
})

app.listen(port, () => {
    console.log(`🛍️  Store API listening on port ${port} (${THREAD_COUNT} worker threads)`)
    console.log(`   GET /health        -> should always be instant`)
    console.log(`   GET /sales-report  -> dataset split across ${THREAD_COUNT} parallel workers`)
})
