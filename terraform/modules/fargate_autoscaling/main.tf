### ECS

resource "aws_ecs_cluster" "default" {
  count = var.cluster_id == "" ? 1 : 0
  name = "${var.project}-cluster${var.name_suffix}"
  tags = var.tags
}

resource "aws_ecs_service" "default" {
  name                               = "${var.project}-service${var.name_suffix}"
  cluster                            = length(aws_ecs_cluster.default) > 0 ? aws_ecs_cluster.default[0].id : var.cluster_id
  task_definition                    = aws_ecs_task_definition.default.arn
  desired_count                      = var.desired_count
  launch_type                        = "FARGATE"
  force_new_deployment               = var.force_new_deployment
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  tags                               = var.tags


  network_configuration {
    security_groups = concat([aws_security_group.ecs_tasks.id], var.security_group_ids)
    subnets         = var.private_subnet_ids
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.default.arn
    container_name   = var.container_name
    container_port   = var.container_port
  }

  # TODO: check if this is nessessary
  //  lifecycle {
  //    ignore_changes = [desired_count]
  //  }

  depends_on = [
    aws_lb_listener.http,
    aws_lb_listener.http_https,
    aws_lb_listener.https,
    aws_lb_target_group.default,
    module.lb_listener_rule
  ]
}

resource "aws_ecs_task_definition" "default" {
  family       = "${var.project}${var.name_suffix}"
  network_mode = "awsvpc"
  requires_compatibilities = [
  "FARGATE"]
  cpu                   = var.fargate_cpu
  memory                = var.fargate_memory
  execution_role_arn    = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn         = aws_iam_role.ecs_task_role.arn
  container_definitions = var.container_definition
  tags                  = var.tags
}

# Autoscaling

resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = var.auto_scaling_max_capacity
  min_capacity       = var.auto_scaling_min_capacity
  resource_id        = "service/${length(aws_ecs_cluster.default) > 0 ? aws_ecs_cluster.default[0].name : var.cluster_name}/${aws_ecs_service.default.name}"
  role_arn           = aws_iam_role.autoscaling.arn
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  depends_on = [aws_ecs_service.default]
}

resource "aws_appautoscaling_policy" "default" {

  name               = "${var.project}-autoscaling-policy${var.name_suffix}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = var.auto_scaling_max_cpu_util

    scale_in_cooldown  = var.auto_scaling_cooldown
    scale_out_cooldown = var.auto_scaling_cooldown

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }

  depends_on = [aws_appautoscaling_target.ecs_target]
}