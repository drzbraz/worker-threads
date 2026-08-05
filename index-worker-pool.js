const express = require('express')
const os = require('os')
const { TOTAL_ORDERS, mergeReports, formatReport } = require('./analytics')
const { WorkerPool } = require('./worker-pool')

const app = express()
const port = 3000

const THREAD_COUNT = Math.min(4, os.availableParallelism())

// ✅✅✅ PRODUCTION-SHAPED: the previous versions spawn new workers on
// every request — under real traffic that's a resource exhaustion
// incident waiting to happen (each spawn costs ~50-100ms plus a fresh
// JIT warm-up, and concurrent requests multiply the thread count).
//
// A pool pre-spawns N persistent workers at boot and REUSES them:
// spawn cost is paid once, the JIT stays warm, and concurrency is
// capped no matter how many requests arrive.
const pool = new WorkerPool('./pool-worker.js', THREAD_COUNT)

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'store is up, customers are buying 🛒' })
})

app.get('/sales-report', async (req, res) => {
    const start = performance.now()
    const chunkSize = Math.ceil(TOTAL_ORDERS / THREAD_COUNT)

    const tasks = []
    for (let i = 0; i < THREAD_COUNT; i++) {
        const startId = i * chunkSize
        const count = Math.min(chunkSize, TOTAL_ORDERS - startId)
        tasks.push(pool.exec({ startId, count }))
    }

    try {
        const chunks = await Promise.all(tasks)
        res.status(200).json({
            mode: `pool of ${THREAD_COUNT} persistent workers (reused across requests ♻️)`,
            ...formatReport(mergeReports(chunks), performance.now() - start)
        })
    } catch (error) {
        res.status(500).json({ error: String(error) })
    }
})

app.listen(port, () => {
    console.log(`🛍️  Store API listening on port ${port} (pool of ${THREAD_COUNT} persistent workers)`)
    console.log(`   GET /health        -> should always be instant`)
    console.log(`   GET /sales-report  -> hit it twice and compare tookMs (warm JIT!)`)
})
