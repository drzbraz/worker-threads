const { Worker } = require('worker_threads')

// Minimal worker pool: N persistent workers, a FIFO task queue.
// This is the pattern behind libraries like piscina — in production,
// use one of those instead of rolling your own.
class WorkerPool {
    constructor(script, size) {
        this.script = script
        this.idle = []
        this.queue = []
        for (let i = 0; i < size; i++) {
            this.idle.push(new Worker(script))
        }
    }

    exec(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject })
            this.#dispatch()
        })
    }

    #dispatch() {
        while (this.idle.length > 0 && this.queue.length > 0) {
            const worker = this.idle.pop()
            const { task, resolve, reject } = this.queue.shift()

            const onMessage = (result) => {
                worker.off('error', onError)
                this.idle.push(worker)
                this.#dispatch()
                resolve(result)
            }

            const onError = (error) => {
                worker.off('message', onMessage)
                // a crashed worker is replaced so the pool never shrinks
                this.idle.push(new Worker(this.script))
                this.#dispatch()
                reject(error)
            }

            worker.once('message', onMessage)
            worker.once('error', onError)
            worker.postMessage(task)
        }
    }
}

module.exports = { WorkerPool }
