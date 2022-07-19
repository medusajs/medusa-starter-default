variable "qovery_organization_id" {
  type = string
  nullable = false
  description = "ID of Qovery organization"
}

variable "qovery_create_cluster" {
  type = bool
  nullable = false
  default = true
  description = "Whether to create a new cluster or not"
}

variable "qovery_cluster_id" {
  type = string
  nullable = true
  default = ""
  description = "The ID of the cluster you want to use if you don't want to create a new one. You can get the Cluster ID using this endpoint: https://api-doc.qovery.com/#tag/Clusters/operation/listOrganizationCluster"
}

variable "qovery_access_token" {
  type = string
  sensitive = true
  nullable = false
  description = "Qovery's access token generated with the command 'qovery token'"
}

variable "aws_access_key_id" {
  type = string
  sensitive = true
  nullable = true
  description = "Necessary only if creating a new cluster"
}

variable "aws_secret_access_key" {
  type = string
  sensitive = true
  nullable = true
  description = "Necessary only if creating a new cluster"
}

variable "aws_region" {
  type = string
  nullable = false
  default = "us-east-2"
  description = "Necessary only if creating a new cluster"
}

variable "medusa_jwt_secret" {
  type    = string
  default = "your-super-secret" # TO CHANGE FOR PRODUCTION
  sensitive = true
  nullable = false
  description = "The JWT Secret to use in Medusa"
}

variable "medusa_cookie_secret" {
  type    = string
  default = "your-super-secret-pt2" # TO CHANGE FOR PRODUCTION
  sensitive = true
  nullable = false
  description = "The Cookie Secret to use in Medusa"
}

variable "git_url" {
  type = string
  nullable = false
  description = "The Git repo associated with the qovery app. Make sure it ends with '.git'."
}

variable "git_branch" {
  type = string
  nullable = false
  default = "master"
  description = "The branch of the Git repo. Default is master"
}

variable "git_root_path" {
  type = string
  nullable = false
  default = "/"
  description = "The base directory to run the app from. Default is /"
}