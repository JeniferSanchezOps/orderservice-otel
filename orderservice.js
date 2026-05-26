/*
 Simple order status proxy for Encargo delivery company.

 Environment variables:
  - PORT=3000
  - ENCARGO_API_BASE=https://api.encargo.example
  - ENCARGO_API_KEY=your_api_key_here
  - DEMO_MODE=true   # set to "true" to enable demo random responses
*/

// OpenTelemetry setup
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const otelExporterOtlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'orderservice',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${otelExporterOtlpEndpoint}/v1/traces`,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error shutting down SDK', err);
      process.exit(1);
    });
});


const express = require('express');
const fetch = require('node-fetch'); // npm i node-fetch@2
require('dotenv').config(); // optional: npm i dotenv

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
//const ENCARGO_API_BASE = process.env.ENCARGO_API_BASE || 'https://api.encargo.example'; //solopara local 
const ENCARGO_API_KEY = process.env.ENCARGO_API_KEY || '';
const DEMO_MODE = (process.env.DEMO_MODE === 'true') || (process.env.DEMO === 'true');

// Demo statuses and helper
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
  const events = [
    { time: now, location: 'Warehouse', status: 'pending' },
    { time: new Date(Date.now() - 60 * 60 * 1000).toISOString(), location: 'Hub', status: 'picked_up' },
  ];
  return {
    orderId,
    provider: 'encargo',
    status,
    updatedAt: now,
    events,
    raw: {
      id: orderId,
      status,
      mock: true,
      message: `Demo mode response: ${status}`,
    }
  };
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// GET /orders/:id/status -> returns { orderId, status, provider: 'encargo', raw: ... }
app.get('/orders/:id/status', async (req, res) => {
  const orderId = req.params.id;
  if (!orderId) return res.status(400).json({ error: 'order id required' });

  // Return demo/random response when DEMO_MODE is enabled
  if (DEMO_MODE) {
    return res.json(demoOrderResponse(orderId));
  }

  const url = `${ENCARGO_API_BASE.replace(/\/$/, '')}/orders/${encodeURIComponent(orderId)}`;

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': ENCARGO_API_KEY ? `Bearer ${ENCARGO_API_KEY}` : undefined,
      },
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return res.status(resp.status).json({ error: 'encargo error', details: text });
    }

    const body = await resp.json().catch(() => ({}));
    // Adjust this mapping to match Encargo response shape:
    const status = body.status || body.order_status || body.state || 'unknown';

    return res.json({
      orderId,
      provider: 'encargo',
      status,
      raw: body,
    });
  } catch (err) {
    return res.status(500).json({ error: 'request failed', message: err.message });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Order status service listening on http://localhost:${PORT}`);
  console.log(`OpenTelemetry endpoint: ${otelExporterOtlpEndpoint}`);
});