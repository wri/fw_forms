output "ecs_security_group_id" {
  value       = aws_security_group.ecs_tasks.id
  description = "Security group ID of the ECS service security group."
}

output "lb_dns_name" {
  value       = length(aws_lb.default) == 1 ? aws_lb.default[0].dns_name : ""
  description = "DNS of application load balance"
}

output lb_target_group_arn {
  value = aws_lb_target_group.default.arn
}

output "ecs_cluster_name" {
  value       = length(aws_ecs_cluster.default) > 0 ? aws_ecs_cluster.default[0].name : var.cluster_name
  description = "Name of ECS cluster"
}

output "ecs_service_name" {
  value       = aws_ecs_service.default.name
  description = "Name of ECS service"
}

output "ecs_update_service_policy_arn" {
  value       = aws_iam_policy.ecs_update_service_policy.arn
  description = "ARN of IAM policy to allow updating ECS service"
}