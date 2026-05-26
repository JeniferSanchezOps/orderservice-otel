# Encargo Order Service with OpenTelemetry

Servicio de estado de órdenes para la empresa Encargo (delivery). Incluye:
- Node.js Express API con modo demo
- OpenTelemetry para observabilidad
- Kubernetes deployment con 2+ réplicas
- Terraform para infraestructura en GCP
- LoadBalancer expuesto a internet

## Requisitos

- Node.js 18+
- Docker & Docker Buildx
- Terraform >= 1.0
- kubectl
- gcloud CLI
- Cuenta GCP con billing habilitado

## Estructura

```
├── orderservice.js         # Servicio principal con OpenTelemetry
├── package.json            # Dependencias Node.js
├── Dockerfile              # Imagen Docker
├── main.tf                 # Configuración Kubernetes y GCP
├── variables.tf            # Variables Terraform
├── terraform.tfvars        # Valores de variables
├── outputs.tf              # Outputs de Terraform
├── k8s/
│   └── orders-manifest.yaml # Manifiestos Kubernetes (opcional)
└── README.md               # Este archivo
```

## Inicio rápido

### Local

```bash
npm install
export DEMO_MODE=true
npm start
# Visita http://localhost:3000/health
```

### Docker

```bash
docker build -t jensanchez/orderservice:latest .
docker run -p 3000:3000 -e DEMO_MODE=true jensanchez/orderservice:latest
```

### Kubernetes en GCP con Terraform

```bash
# Configurar GCP
gcloud auth login
gcloud config set project <PROJECT_ID>

# Crear infraestructura
terraform init
terraform apply -auto-approve

# Obtener IP del LoadBalancer
kubectl get svc orderservice-lb -n orders -o wide

# Probar API
curl http://<EXTERNAL_IP>/health
curl http://<EXTERNAL_IP>/orders/123/status
```

## Variables de Entorno

- `PORT`: Puerto del servidor (default: 3000)
- `DEMO_MODE`: Habilitar modo demo con datos aleatorios (default: false)
- `ENCARGO_API_BASE`: URL base de la API de Encargo
- `ENCARGO_API_KEY`: API key para Encargo
- `OTEL_EXPORTER_OTLP_ENDPOINT`: Endpoint de OpenTelemetry (default: http://localhost:4318)

## OpenTelemetry

El servicio exporta traces en formato OTLP. Para recopilar y visualizar:

```bash
# Desplegar Jaeger en Kubernetes
kubectl create namespace observability
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-kubernetes/master/jaeger-all-in-one.yaml -n observability

# Port-forward a Jaeger UI
kubectl port-forward -n observability svc/jaeger 16686:16686

# Visita http://localhost:16686
```

## Endpoints

- `GET /health` - Health check
- `GET /orders/:id/status` - Obtener estado de orden

## Deployment

```bash
# Push a Docker Hub
docker buildx build --platform linux/amd64 -t jensanchez/orderservice:latest --push .

# Actualizar en Kubernetes
kubectl set image deployment/orderservice-deployment -n orders orderservice=jensanchez/orderservice:latest
kubectl rollout status deployment/orderservice-deployment -n orders
```

## Licencia

MIT