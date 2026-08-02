const express = require('express')
const { Worker } = require('worker_threads')
const app  = express()
const port = 3000

const THREAD_COUNT = 4


app.get('/non-blocking/', (req,res)=>{
    res.status(200).send('page is non blocking')
})

function createWorker(){
    return new Promise((resolve, reject)=>{
        const worker = new Worker('./four-workers.js', {
            workerData: {
                thread_count: THREAD_COUNT
            }
        })

        worker.on("message", (data) => {
            resolve(data)
        })
    
        worker.on("error", (error) => {
            reject(`an error occured: ${error}`)
        })

    })
}

app.get('/blocking/', async (req,res)=>{

    const workerPromisses = []

    for (let index = 0; index < THREAD_COUNT; index++) {
        workerPromisses.push(createWorker())        
    }

    const thread_results = await Promise.all(workerPromisses)
    const total = thread_results[0] + thread_results[1] + thread_results[2] + thread_results[3]
    res.status(200).send(`result is ${total}`)
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})