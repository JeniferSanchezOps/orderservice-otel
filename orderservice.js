/*
 Simple order status service for Encargo delivery company.

 Environment variables:
  - PORT=3000
  - DEMO_MODE=true
*/

const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DEMO_MODE = process.env.DEMO_MODE === 'true';

const DEMO_STATUSES = [
  'pending',
  'assigned',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'exception'
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function demoOrderResponse(orderId) {
  const status = randomChoice(DEMO_STATUSES);
  const now = new Date().toISOString();

  return {
    orderId,
    provider: 'encargo',
    status,
    updatedAt: now,
    events: [
      {
        time: now,
        location: 'Warehouse',
        status: 'pending'
      },
      {
        time: new Date(Date.now() - 3600000).toISOString(),
        location: 'Hub',
        status: 'picked_up'
      }
    ],
    raw: {
      id: orderId,
      status,
      mock: true,
      message: `Demo mode response: ${status}`
    }
  };
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'orderservice',
    timestamp: new Date().toISOString()
  });
});

app.get('/orders/:id/status', async (req, res) => {
  const orderId = req.params.id;

  if (!orderId) {
    return res.status(400).json({
      error: 'order id required'
    });
  }

  if (DEMO_MODE) {
    return res.json(demoOrderResponse(orderId));
  }

  return res.json({
    orderId,
    provider: 'encargo',
    status: 'unknown'
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'orderservice',
    version: '1.0.0',
    endpoints: [
      '/health',
      '/orders/:id/status'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Order service listening on port ${PORT}`);
  console.log(`Demo mode: ${DEMO_MODE}`);
});