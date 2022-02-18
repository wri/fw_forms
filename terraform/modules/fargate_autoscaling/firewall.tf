# ALB Security group
# This is the group you need to edit if you want to restrict access to your application
resource "aws_security_group" "lb" {
  count       = var.load_balancer_security_group == "" ? 1 : 0
  name        = "${var.project}-ecs-alb${var.name_suffix}"
  description = "Controls access to the ALB"
  vpc_id      = var.vpc_id

  # When using SSL certificate open port 80 for ingress, otherwise user specific port
  ingress {
    protocol    = "tcp"
    from_port   = var.acm_certificate_arn == null ? 80 : var.listener_port
    to_port     = var.acm_certificate_arn == null ? 80 : var.listener_port
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    protocol    = "tcp"
    from_port   = 443
    to_port     = 443
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    {
      Name = "${var.project}-ecs-alb${var.name_suffix}"
    },
    var.tags
  )
}


# Open container port for egress and link with ECS Task security group
resource "aws_security_group_rule" "lb_task_egress" {
  security_group_id        = length(aws_security_group.lb) == 1 ? aws_security_group.lb[0].id : var.load_balancer_security_group
  from_port                = var.container_port
  to_port                  = var.container_port
  protocol                 = "tcp"
  type                     = "egress"
  source_security_group_id = aws_security_group.ecs_tasks.id
}


# Traffic to the ECS Cluster should only come from the ALB
# Tasks should be able to communicate with any external resource
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.project}-ecs-tasks${var.name_suffix}"
  description = "Allow inbound access from the ALB only"
  vpc_id      = var.vpc_id

  ingress {
    protocol        = "tcp"
    from_port       = var.container_port
    to_port         = var.container_port
    security_groups = length(aws_security_group.lb) > 0 ? [aws_security_group.lb[0].id] : [var.load_balancer_security_group]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    {
      Name = "${var.project}-ecs-tasks${var.name_suffix}"
    },
    var.tags
  )
}
