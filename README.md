# Orderservice - OpenTelemetry, Jaeger and Kubernetes Demo

## Overview

This project demonstrates how to deploy a Node.js microservice on Google Kubernetes Engine (GKE) with distributed tracing using OpenTelemetry and Jaeger.

The application exposes a simple REST API that simulates order status lookups for a delivery company and automatically generates traces that can be visualized in Jaeger.

## Architecture

```text
Client
   |
   v
LoadBalancer Service
   |
   v
Orderservice (Node.js + Express)
   |
   v
OpenTelemetry SDK
   |
   v
OTLP Exporter (HTTP 4318)
   |
   v
Jaeger Collector
   |
   v
Jaeger UI
```

## Features

* Node.js Express REST API
* OpenTelemetry auto-instrumentation
* Distributed tracing with Jaeger
* Docker containerization
* Kubernetes deployment on GKE
* Health checks (Liveness and Readiness Probes)
* Horizontal scaling support
* Infrastructure as Code ready
* Demo mode for testing without external dependencies

---

## API Endpoints

### Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok",
  "service": "orderservice"
}
```

### Order Status

```http
GET /orders/{id}/status
```

Example:

```http
GET /orders/123/status
```

Response:

```json
{
  "orderId": "123",
  "provider": "encargo",
  "status": "out_for_delivery",
  "timestamp": "2026-06-04T02:00:49.932Z"
}
```

---

## Local Execution

### Install Dependencies

```bash
npm install
```

### Run Application

```bash
npm start
```

Application starts on:

```text
http://localhost:3000
```

---

## Environment Variables

| Variable                    | Description              | Default               |
| --------------------------- | ------------------------ | --------------------- |
| PORT                        | Application port         | 3000                  |
| DEMO_MODE                   | Enable demo responses    | false                 |
| OTEL_SERVICE_NAME           | Service name for tracing | orderservice          |
| OTEL_EXPORTER_OTLP_ENDPOINT | Jaeger OTLP endpoint     | http://localhost:4318 |

Example:

```bash
export DEMO_MODE=true
export OTEL_SERVICE_NAME=orderservice
export OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger-otlp.observability:4318
```

---

## Docker Build

### Build Image

```bash
docker build -t orderservice .
```

### Run Container

```bash
docker run -p 3000:3000 orderservice
```

---

## Build for GKE (Mac M-Series)

```bash
docker buildx build \
--platform linux/amd64 \
-t <dockerhub-user>/orderservice:v1 \
--push .
```

---

## Kubernetes Deployment

Deploy the application:

```bash
kubectl apply -f deployment.yaml
```

Verify:

```bash
kubectl get pods -n orders
```

Check logs:

```bash
kubectl logs -n orders deployment/orderservice-deployment
```

---

## OpenTelemetry Configuration

The service uses automatic instrumentation:

```javascript
getNodeAutoInstrumentations()
```

Collected traces are exported through:

```text
OTLP HTTP Exporter
```

Destination:

```text
http://jaeger-otlp.observability:4318
```

---

## Generate Sample Traffic

```bash
for i in {1..20}; do
  curl http://<LOAD_BALANCER_IP>/orders/$i/status
done
```

---

## Access Jaeger

Open:

```text
http://<JAEGER_UI_IP>:16686
```

Search for:

```text
orderservice
```

Expected traces:

```text
GET /orders/:id/status
GET /health
```

---

## Monitoring and Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n orders
```

### Check Events

```bash
kubectl describe pod <pod-name> -n orders
```

### Current Logs

```bash
kubectl logs <pod-name> -n orders
```

### Previous Container Logs

```bash
kubectl logs -p <pod-name> -n orders
```

---

## Future Enhancements

* OpenTelemetry Collector
* Prometheus Metrics
* Grafana Dashboards
* Distributed tracing across multiple services
* CI/CD with GitHub Actions
* Terraform automation
* Horizontal Pod Autoscaler (HPA)

---

## Technologies Used

* Node.js
* Express
* OpenTelemetry
* Jaeger
* Docker
* Kubernetes
* Google Kubernetes Engine (GKE)
* GitHub
* Docker Hub

---

## Author

Jenifer Sanchez

Performance Engineer | Observability | Cloud Native Technologies
