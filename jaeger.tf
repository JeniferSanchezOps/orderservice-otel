# Namespace para observabilidad
resource "kubernetes_namespace" "observability" {
  metadata {
    name = "observability"
  }
}

# Deployment de Jaeger all-in-one
resource "kubernetes_deployment" "jaeger" {
  metadata {
    name      = "jaeger"
    namespace = kubernetes_namespace.observability.metadata[0].name
    labels = {
      app = "jaeger"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "jaeger"
      }
    }

    template {
      metadata {
        labels = {
          app = "jaeger"
        }
      }

      spec {
        container {
          name  = "jaeger"
          image = "jaegertracing/all-in-one:latest"

          port {
            container_port = 6831
            protocol       = "UDP"
            name           = "jaeger-compact"
          }

          port {
            container_port = 4318
            protocol       = "TCP"
            name           = "otlp-http"
          }

          port {
            container_port = 16686
            protocol       = "TCP"
            name           = "jaeger-ui"
          }

          resources {
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }
      }
    }
  }
}

# Service para Jaeger (ClusterIP interno + LoadBalancer para UI)
resource "kubernetes_service" "jaeger_otlp" {
  metadata {
    name      = "jaeger-otlp"
    namespace = kubernetes_namespace.observability.metadata[0].name
  }

  spec {
    selector = {
      app = "jaeger"
    }

    port {
      port        = 4318
      target_port = 4318
      protocol    = "TCP"
      name        = "otlp-http"
    }

    port {
      port        = 6831
      target_port = 6831
      protocol    = "UDP"
      name        = "jaeger-compact"
    }

    type = "ClusterIP"
  }
}

resource "kubernetes_service" "jaeger_ui" {
  metadata {
    name      = "jaeger-ui"
    namespace = kubernetes_namespace.observability.metadata[0].name
  }

  spec {
    selector = {
      app = "jaeger"
    }

    port {
      port        = 16686
      target_port = 16686
      protocol    = "TCP"
    }

    type = "LoadBalancer"
  }
}

output "jaeger_ui_ip" {
  description = "External IP for Jaeger UI"
  value       = kubernetes_service.jaeger_ui.status[0].load_balancer[0].ingress[0].ip
  depends_on = [kubernetes_service.jaeger_ui]
}

output "jaeger_otlp_endpoint" {
  description = "Internal Jaeger OTLP endpoint for orderservice"
  value       = "http://jaeger-otlp.observability:4318"
}