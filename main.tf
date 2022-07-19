terraform {
  required_providers {
    qovery = {
      source = "qovery/qovery"
    }
  }
}

provider "qovery" {
  token = var.qovery_access_token
}

resource "qovery_aws_credentials" "my_aws_creds" {
  organization_id   = var.qovery_organization_id
  name              = "My AWS Creds"
  access_key_id     = var.aws_access_key_id
  secret_access_key = var.aws_secret_access_key
  count = var.qovery_create_cluster ? 1 : 0
}

resource "qovery_cluster" "my_cluster" {
  organization_id   = var.qovery_organization_id
  credentials_id    = qovery_aws_credentials.my_aws_creds[0].id
  name              = "Demo Medusa cluster"
  description       = "Terraform medusa cluster"
  cloud_provider    = "AWS"
  region            = var.aws_region
  instance_type     = "T3A_MEDIUM"
  min_running_nodes = 3
  max_running_nodes = 4
  state             = "RUNNING"
  count = var.qovery_create_cluster ? 1 : 0

  depends_on = [
    qovery_aws_credentials.my_aws_creds
  ]
}

resource "qovery_project" "my_project" {
  organization_id = var.qovery_organization_id
  name            = "Medusa"

  depends_on = [
    qovery_cluster.my_cluster
  ]
}

resource "qovery_environment" "production" {
  project_id = qovery_project.my_project.id
  name       = "production"
  mode       = "PRODUCTION"
  cluster_id = !var.qovery_create_cluster && var.qovery_cluster_id != "" ? var.qovery_cluster_id : qovery_cluster.my_cluster[0].id

  depends_on = [
    qovery_project.my_project
  ]
}

resource "qovery_database" "my_psql_database" {
  environment_id = qovery_environment.production.id
  name           = "medusa psql db"
  type           = "POSTGRESQL"
  version        = "13"
  mode           = "MANAGED" # Use AWS RDS for PostgreSQL (backup and PITR automatically configured by Qovery)
  storage        = 10 # 10GB of storage
  accessibility  = "PRIVATE" # do not make it publicly accessible
  state          = "RUNNING"

  depends_on = [
    qovery_environment.production,
  ]
}

resource "qovery_database" "my_redis_database" {
  environment_id = qovery_environment.production.id
  name           = "medusa redis db"
  type           = "REDIS"
  version        = "6"
  mode           = "CONTAINER"
  storage        = 10 # 10GB of storage
  accessibility  = "PRIVATE"
  state          = "RUNNING"

  depends_on = [
    qovery_environment.production,
    qovery_database.my_psql_database,
  ]
}

resource "qovery_application" "medusa_app" {
  environment_id = qovery_environment.production.id
  name           = "medusa app"
  cpu            = 1000
  memory         = 512
  state          = "RUNNING"
  git_repository = {
    url       = var.git_url
    branch    = var.git_branch
    root_path = var.git_root_path
  }
  build_mode            = "DOCKER"
  dockerfile_path       = "Dockerfile"
  min_running_instances = 1
  max_running_instances = 1
  ports                 = [
    {
      internal_port       = 9000
      external_port       = 443
      protocol            = "HTTP"
      publicly_accessible = true
    }
  ]
  environment_variables = [
    {
      key   = "PORT"
      value = "9000"
    },
    {
      key   = "NODE_ENV"
      value = "production"
    },
    {
      key   = "NPM_CONFIG_PRODUCTION"
      value = "false"
    }
  ]
  secrets = [
    {
      key   = "JWT_SECRET"
      value = var.medusa_jwt_secret
    },
    {
      key   = "COOKIE_SECRET"
      value = var.medusa_cookie_secret
    },
    {
      key   = "DATABASE_URL"
      value = "postgresql://${qovery_database.my_psql_database.login}:${qovery_database.my_psql_database.password}@${qovery_database.my_psql_database.internal_host}:${qovery_database.my_psql_database.port}/postgres"
    },
    {
      key   = "REDIS_URL"
      value = "redis://${qovery_database.my_redis_database.login}:${qovery_database.my_redis_database.password}@${qovery_database.my_redis_database.internal_host}:${qovery_database.my_redis_database.port}"
    }
  ]

  depends_on = [
    qovery_environment.production,
    qovery_database.my_psql_database,
    qovery_database.my_redis_database,
  ]
}