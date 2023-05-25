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
  name    = "byu-wabs-oauth"
  gh_org  = "byu-oit"
  gh_repo = "byu-wabs-oauth"
  env     = "prd"

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

module "acs" {
  source = "github.com/byu-oit/terraform-aws-acs-info?ref=v4.0.0"
}

module "gha_role" {
  source                         = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                        = "5.17.0"
  create_role                    = true
  role_name                      = "${local.name}-${local.env}-gha"
  provider_url                   = module.acs.github_oidc_provider.url
  role_permissions_boundary_arn  = module.acs.role_permissions_boundary.arn
  role_policy_arns               = module.acs.power_builder_policies[*].arn
  oidc_fully_qualified_audiences = ["sts.amazonaws.com"]
  oidc_subjects_with_wildcards   = ["repo:${local.gh_org}/${local.gh_repo}:*"]
}
