// Simulates crunching a huge batch of Black Friday orders.
// For every order we apply "business rules": tax, plus a fraud score.
// In real life this could be: aggregating sales data, generating a PDF report,
// resizing images, hashing passwords, parsing a huge CSV export...
// Anything CPU-bound that would freeze the Event Loop.

const TOTAL_ORDERS = 300_000_000

// Deterministic pseudo-random price between $10.00 and $500.00,
// so every run (and every worker chunk) produces the same numbers.
function orderPrice(orderId) {
    const hash = Math.imul(orderId, 2654435761) >>> 0
    return 10 + (hash % 49001) / 100
}

function processOrders(startId, count) {
    let revenue = 0
    let biggestOrder = 0
    let flagged = 0

    for (let i = 0; i < count; i++) {
        const price = orderPrice(startId + i)

        // per-order business rules
        const tax = price * 0.08
        const fraudScore = Math.sqrt((price * 31) % 97) * Math.log1p(price)
        if (fraudScore > 60) flagged++

        revenue += price + tax
        if (price > biggestOrder) biggestOrder = price
    }

    return {
        orders: count,
        revenue,
        biggestOrder,
        flagged
    }
}

function formatReport({ orders, revenue, biggestOrder, flagged }, durationMs) {
    return {
        ordersProcessed: orders.toLocaleString('en-US'),
        totalRevenue: `$${revenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
        averageOrder: `$${(revenue / orders).toFixed(2)}`,
        biggestOrder: `$${biggestOrder.toFixed(2)}`,
        flaggedForFraudReview: flagged.toLocaleString('en-US'),
        tookMs: Math.round(durationMs)
    }
}

module.exports = { TOTAL_ORDERS, processOrders, formatReport }
