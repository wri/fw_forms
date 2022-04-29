# Require TF version to be same as or greater than 0.12.24
terraform {
  backend "s3" {
    region  = "us-east-1"
    key     = "wri__fw_forms.tfstate"
    encrypt = true
  }
}

provider "aws" {
  region = var.region
}


# Docker image for FW Template app
module "app_docker_image" {
  source     = "git::https://github.com/wri/gfw-terraform-modules.git//terraform/modules/container_registry?ref=v0.5.1"
  image_name = lower("${var.project_prefix}-docker-image")
  root_dir   = "${path.root}/../"
  tag        = local.container_tag
}

module "fargate_autoscaling" {
  source                       = "git::https://github.com/wri/gfw-terraform-modules.git//terraform/modules/fargate_autoscaling_v2?ref=v0.5.5"
  project                      = var.project_prefix
  tags                         = local.fargate_tags
  vpc_id                       = data.terraform_remote_state.core.outputs.vpc_id
  private_subnet_ids           = data.terraform_remote_state.core.outputs.private_subnet_ids
  public_subnet_ids            = data.terraform_remote_state.core.outputs.public_subnet_ids
  container_name               = var.project_prefix
  container_port               = var.container_port
  desired_count                = var.desired_count
  fargate_cpu                  = var.fargate_cpu
  fargate_memory               = var.fargate_memory
  auto_scaling_cooldown        = var.auto_scaling_cooldown
  auto_scaling_max_capacity    = var.auto_scaling_max_capacity
  auto_scaling_max_cpu_util    = var.auto_scaling_max_cpu_util
  auto_scaling_min_capacity    = var.auto_scaling_min_capacity
  load_balancer_arn            = data.terraform_remote_state.fw_core.outputs.lb_arn
  load_balancer_security_group = data.terraform_remote_state.fw_core.outputs.lb_security_group_id
  cluster_id                   = data.terraform_remote_state.fw_core.outputs.ecs_cluster_id
  cluster_name                 = data.terraform_remote_state.fw_core.outputs.ecs_cluster_name
  security_group_ids           = [data.terraform_remote_state.core.outputs.document_db_security_group_id, data.terraform_remote_state.core.outputs.redis_security_group_id]
  task_role_policies = [
    data.terraform_remote_state.fw_core.outputs.data_bucket_write_policy_arn
  ]
  task_execution_role_policies = [
    data.terraform_remote_state.core.outputs.document_db_secrets_policy_arn,
    module.google_sheets_private_key.read_policy_arn,
    module.google_sheets_project_email.read_policy_arn
  ]
  container_definition = data.template_file.container_definition.rendered

  lb_target_group_arn = module.fargate_autoscaling.lb_target_group_arn
  listener_arn        = data.terraform_remote_state.fw_core.outputs.lb_listener_arn
  project_prefix      = var.project_prefix
  path_pattern        = ["/v1/fw_forms/healthcheck", "/v1/questionnaire*", "/v1/reports*", "/v3/reports*"]
  priority = 1
  health_check_path = "/v1/fw_forms/healthcheck"

  depends_on = [
    module.google_sheets_private_key,
    module.google_sheets_project_email,
    module.app_docker_image
  ]
}



data "template_file" "container_definition" {
  template = file("${path.root}/templates/container_definition.json.tmpl")
  vars = {
    environment    = var.environment
    aws_region     = var.region
    image          = "${module.app_docker_image.repository_url}:${local.container_tag}"
    container_port = var.container_port
    container_name = var.project_prefix
    log_group      = aws_cloudwatch_log_group.default.name
    db_secret_arn  = data.terraform_remote_state.core.outputs.document_db_secrets_arn
    # data_bucket = data.terraform_remote_state.fw_core.outputs.data_bucket
    google_private_key   = module.google_sheets_private_key.secret_arn
    google_project_email = module.google_sheets_project_email.secret_arn
    target_sheet_id      = var.target_sheet_id
    wri_mail_recipients  = var.wri_mail_recipients

    node_env                  = var.node_env
    mongo_port_27017_tcp_addr = data.terraform_remote_state.core.outputs.document_db_endpoint
    ct_url                    = var.ct_url
    local_url                 = "http://127.0.0.1:${var.container_port}"
    teams_api_url             = "https://${data.terraform_remote_state.fw_core.outputs.public_url}/v1"
    areas_api_url             = var.areas_api_url
    api_api_url               = var.api_api_url
    s3_access_key_id          = var.s3_access_key_id
    s3_secret_access_key      = var.s3_secret_access_key
    s3_bucket                 = var.s3_bucket

  }

}


#
# CloudWatch Resources
#
resource "aws_cloudwatch_log_group" "default" {
  name              = "/aws/ecs/${var.project_prefix}-log"
  retention_in_days = var.log_retention
}


#
# Secrets
#

module "google_sheets_private_key" {
  source        = "git::https://github.com/wri/gfw-terraform-modules.git//terraform/modules/secrets?ref=v0.5.1"
  project       = var.project_prefix
  name          = "${var.project_prefix}-google_sheets_private_key"
  secret_string = var.google_sheets_private_key
}

module "google_sheets_project_email" {
  source        = "git::https://github.com/wri/gfw-terraform-modules.git//terraform/modules/secrets?ref=v0.5.1"
  project       = var.project_prefix
  name          = "${var.project_prefix}-google_sheets_project_email"
  secret_string = var.google_sheets_project_email
}
#
# Route53 Healthcheck
#

module "route53_healthcheck" {
  source           = "git::https://github.com/wri/gfw-terraform-modules.git//terraform/modules/route53_healthcheck?ref=v0.5.7"
  prefix           = var.project_prefix
  healthcheck_fqdn = data.terraform_remote_state.fw_core.outputs.public_url
  healthcheck_path = var.healthcheck_path
  forward_emails   = var.healthcheck_sns_emails
  depends_on = [
    module.fargate_autoscaling
  ]
}

#
# Cloudwatch HTTP Error rate alarm
#

module "error_rate_alarm" {
  source = "git::https://github.com/wri/gfw-terraform-modules.git//terraform/modules/http_error_rate_alarm?ref=v0.5.7"

  project_prefix = var.project_prefix
  httpOkQuery = "[direction=\"-->\", requestType, path, responseCode=200 || responseCode=202 , responseTime, dataSize]"
  httpOkLogGroup = aws_cloudwatch_log_group.default.name
  httpErrorsQuery = "[direction=\"-->\", requestType, path, responseCode=4* || responseCode=5* , responseTime, dataSize]"
  httpErrorsLogGroup = aws_cloudwatch_log_group.default.name
  metricsNamespace = "HttpErrorRateAlarms"

  alarm_actions = [module.route53_healthcheck.sns_topic_arn]

  alarm_threshold = "10" // Percent
}