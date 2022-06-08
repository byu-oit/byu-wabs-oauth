terraform {
  backend "s3" {
    bucket         = "terraform-state-storage-113609878794"
    dynamodb_table = "terraform-state-lock-113609878794"
    key            = "byu-wabs-oauth/dev/setup.tfstate"
    region         = "us-west-2"
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = "us-west-2"
}

locals {
  name = "byu-wabs-oauth"
  tags = {
    name = local.name
    repo = "https://github.com/byu-oit/${local.name}"
  }
}

resource "aws_ssm_parameter" "consumer_key" {
  count = length(var.consumer_key) > 0 ? 1 : 0
  name  = "/${local.name}/consumer_key"
  type  = "SecureString"
  value = var.consumer_key
  tags  = local.tags
}

resource "aws_ssm_parameter" "consumer_secret" {
  count = length(var.consumer_secret) > 0 ? 1 : 0
  name  = "/${local.name}/consumer_secret"
  type  = "SecureString"
  value = var.consumer_secret
  tags  = local.tags
}

resource "aws_ssm_parameter" "callback_url" {
  count = length(var.callback_url) > 0 ? 1 : 0
  name  = "/${local.name}/callback_url"
  type  = "String"
  value = var.callback_url
  tags  = local.tags
}

resource "aws_ssm_parameter" "net_id" {
  count = length(var.net_id) > 0 ? 1 : 0
  name  = "/${local.name}/net_id"
  type  = "String"
  value = var.net_id
  tags  = local.tags
}

resource "aws_ssm_parameter" "password" {
  count = length(var.password) > 0 ? 1 : 0
  name  = "/${local.name}/password"
  type  = "SecureString"
  value = var.password
  tags  = local.tags
}
