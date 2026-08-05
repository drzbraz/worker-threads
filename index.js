const express = require('express')
const { Worker } = require('worker_threads')
const { TOTAL_ORDERS, processOrders, formatReport } = require('./analytics')

const app = express()
const port = 3000

// Regular endpoint: customers are browsing the store.
// This must ALWAYS respond fast, even during heavy reporting.
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'store is up, customers are buying 🛒' })
})

// ❌ THE PROBLEM: finance asks for the Black Friday report
// and we compute it on the main thread. While these 300 million
// orders are being crunched, the ENTIRE API is frozen —
// /health stops responding and every customer request hangs.
app.get('/sales-report/blocking', (req, res) => {
    const start = performance.now()
    const report = processOrders(0, TOTAL_ORDERS)
    res.status(200).json({
        mode: 'main thread (event loop blocked 😱)',
        ...formatReport(report, performance.now() - start)
    })
})

// ✅ THE FIX: same computation, delegated to a Worker Thread.
// The event loop stays free, /health keeps responding instantly.
app.get('/sales-report', (req, res) => {
    const start = performance.now()
    const worker = new Worker('./worker.js')

    worker.on('message', (report) => {
        res.status(200).json({
            mode: 'worker thread (event loop free 🚀)',
            ...formatReport(report, performance.now() - start)
        })
    })

    worker.on('error', (error) => {
        res.status(500).json({ error: error.message })
    })
})

app.listen(port, () => {
    console.log(`🛍️  Store API listening on port ${port}`)
    console.log(`   GET /health                 -> should always be instant`)
    console.log(`   GET /sales-report/blocking  -> freezes the whole API`)
    console.log(`   GET /sales-report           -> heavy work on a worker thread`)
})
