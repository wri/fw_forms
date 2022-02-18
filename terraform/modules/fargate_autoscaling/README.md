# AWS Fargate Service with autoscaling

Terraform module to create an AWS Fargate Service with autoscaling.

- Creates Fargate service using provided container definition 
- Creates new Application Load Balancer or uses user defined ALB

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 0.12.13, < 0.14 |

## Providers

| Name | Version |
|------|---------|
| aws | >= 2.63, < 4 |
| local | n/a |
| template | n/a |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| acm\_certificate\_arn | The ACM/ SSL certificate to use. When set, listener port will be set to 443. Request to port 80 will be forwarded. All other ports will be closed. | `string` | `null` | no |
| auto\_scaling\_cooldown | n/a | `number` | `300` | no |
| auto\_scaling\_max\_capacity | n/a | `number` | `1` | no |
| auto\_scaling\_max\_cpu\_util | n/a | `number` | `75` | no |
| auto\_scaling\_min\_capacity | n/a | `number` | `1` | no |
| container\_definition | JSON object defining the task container | `string` | n/a | yes |
| container\_name | The name of the container to associate with the load balancer. | `string` | n/a | yes |
| container\_port | The port on the container to associate with the load balancer. | `number` | n/a | yes |
| desired\_count | Number of tasks | `number` | `1` | no |
| fargate\_cpu | n/a | `number` | `1` | no |
| fargate\_memory | n/a | `number` | `512` | no |
| force\_new\_deployment | n/a | `bool` | `true` | no |
| listener\_port | The default port the Load Balancer listern should listen to. Will be ignored when acm\_certificate is set. | `number` | `80` | no |
| load\_balancer\_arn | Optional Load Balancer to use for fargate cluster. When left blank, a new LB will be created | `string` | `""` | no |
| load\_balancer\_security\_group | Optional secuirty group of load balancer with which the task can communicate. Required if load\_blancer\_arn is not empty | `string` | `""` | no |
| name\_suffix | n/a | `string` | `""` | no |
| private\_subnet\_ids | n/a | `list(string)` | n/a | yes |
| project | n/a | `string` | n/a | yes |
| public\_subnet\_ids | n/a | `list(string)` | n/a | yes |
| security\_group\_ids | n/a | `list(string)` | n/a | yes |
| tags | n/a | `map(string)` | n/a | yes |
| task\_execution\_role\_policies | n/a | `list(string)` | `[]` | no |
| task\_role\_policies | n/a | `list(string)` | `[]` | no |
| vpc\_id | n/a | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| ecs\_cluster\_name | Name of ECS cluster |
| ecs\_security\_group\_id | Security group ID of the ECS service security group. |
| ecs\_service\_name | Name of ECS service |
| ecs\_update\_service\_policy\_arn | ARN of IAM policy to allow updating ECS service |
| lb\_dns\_name | DNS of application load balance |


## Usage Example

```terraform

module "fargate_autoscaling" {
  source                       = "git::https://github.com/wri/gfw-terraform-modules.git//modules/fargate_autoscaling"
  project                      = "my-project"
  name_suffix                  = "my-workspace"
  tags                         = { BuiltBy     = "Terraform" }
  vpc_id                       = vpc_id
  private_subnet_ids           = []
  public_subnet_ids            = data.terraform_remote_state.core.outputs.public_subnet_ids
  container_name               = var.container_name
  container_port               = var.container_port
  listener_port                = var.listener_port
  desired_count                = var.desired_count
  fargate_cpu                  = var.fargate_cpu
  fargate_memory               = var.fargate_memory
  auto_scaling_cooldown        = var.auto_scaling_cooldown
  auto_scaling_max_capacity    = var.auto_scaling_max_capacity
  auto_scaling_max_cpu_util    = var.auto_scaling_max_cpu_util
  auto_scaling_min_capacity    = var.auto_scaling_min_capacity
  security_group_ids           = [data.terraform_remote_state.core.outputs.postgresql_security_group_id]
  task_role_policies           = [data.terraform_remote_state.core.outputs.iam_policy_s3_write_data-lake_arn]
  task_execution_role_policies = [data.terraform_remote_state.core.outputs.secrets_postgresql-reader_policy_arn, data.terraform_remote_state.core.outputs.secrets_postgresql-writer_policy_arn]
  container_definition         = data.template_file.container_definition.rendered

}

```