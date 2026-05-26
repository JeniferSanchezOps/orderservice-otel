terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

provider "google" {
  credentials = file(var.credentials_file)
  project     = var.project_id
  region      = var.region
  zone        = var.zone
}
resource "google_compute_address" "orders_lb_ip" {
  name   = "orders-lb-ip"
  region = var.region
  project = var.project_id
}
# Create a simple zonal GKE cluster
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.zone

  initial_node_count = var.node_count

  node_config {
    machine_type = var.machine_type
    disk_size_gb = var.disk_size_gb
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]
  }

  remove_default_node_pool = false
  # Keep master authorized networks/default settings for simplicity
}

data "google_client_config" "current" {}

# Kubernetes provider configured from the created cluster
provider "kubernetes" {
  host                   = "https://${google_container_cluster.primary.endpoint}"
  token                  = data.google_client_config.current.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.primary.master_auth.0.cluster_ca_certificate)
}

# Kubernetes namespace (optional)
resource "kubernetes_namespace" "app" {
  metadata {
    name = "orders"
  }
}

# NOTE: kubernetes_secret.dockerhub removed to use local image on nodes

# Deployment (uses local image on nodes)
resource "kubernetes_deployment" "orders" {
  metadata {
    name      = "orderservice-deployment"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = {
      app = "orderservice"
    }
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = "orderservice"
      }
    }

    template {
      metadata {
        labels = {
          app = "orderservice"
        }
      }

      spec {
        container {
          name  = "orderservice"
          image = var.image
          image_pull_policy = "IfNotPresent"

          env {
            name  = "DEMO_MODE"
            value = "true"
          }

          env {
            name  = "OTEL_EXPORTER_OTLP_ENDPOINT"
            value = var.otel_exporter_endpoint
          }

          port {
            container_port = 3000
          }

          readiness_probe {
            http_get {
              path = "/health"
              port = 3000
            }
            initial_delay_seconds = 5
            period_seconds        = 10
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 3000
            }
            initial_delay_seconds = 15
            period_seconds        = 20
          }
        }
      }
    }
  }
}

# Service LoadBalancer
resource "kubernetes_service" "orders_lb" {
  metadata {
    name      = "orderservice-lb"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    load_balancer_ip = google_compute_address.orders_lb_ip.address

    selector = {
      app = "orderservice"
    }

    port {
      port        = 80
      target_port = 3000
      protocol    = "TCP"
    }

    type = "LoadBalancer"
  }
}