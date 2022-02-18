
#
# NLB Resources
#
resource "aws_lb" "default" {
  count                            = var.load_balancer_arn == "" ? 1 : 0
  name                             = trimsuffix(replace(substr("${var.project}-elb${var.name_suffix}", 0, 32), "_", "-"), "-")
  enable_cross_zone_load_balancing = true

  subnets         = var.public_subnet_ids
  security_groups = [aws_security_group.lb[0].id]

  tags = var.tags
}

resource "aws_lb_target_group" "default" {
  name = trimsuffix(replace(substr("${var.project}-tg${var.name_suffix}", 0, 32), "_", "-"), "-")
  port     = var.container_port
  protocol = "HTTP"
  vpc_id   = var.vpc_id
  target_type = "ip"
  tags = var.tags
  depends_on = [
    aws_lb.default
  ]
}


# use this resource as listener if no SSL certificate was provided (HTTP only)
# will listen on specified listener port (default 80)
resource "aws_lb_listener" "http" {
  count             = var.acm_certificate_arn == null && length(aws_lb.default) > 0 ? 1 : 0
  load_balancer_arn = aws_lb.default[0].arn
  port              = var.listener_port
  protocol          = "HTTP"
  default_action {
    target_group_arn = aws_lb_target_group.default.id
    type             = "forward"
  }
}


# If SSL certificate available forward HTTP requests to HTTPS
# Listener port will be ignored
resource "aws_lb_listener" "http_https" {
  count             = var.acm_certificate_arn == null || length(aws_lb.default) == 0 ? 0 : 1
  load_balancer_arn = aws_lb.default[0].arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}



# If SSL certificate present, use this resource as listener
# listener port will be ignored
resource "aws_lb_listener" "https" {
  count             = var.acm_certificate_arn == null || length(aws_lb.default) == 0 ? 0 : 1
  load_balancer_arn = aws_lb.default[0].arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = var.acm_certificate_arn
  default_action {
    target_group_arn = aws_lb_target_group.default.id
    type             = "forward"
  }
}

module "lb_listener_rule" {
  count = var.load_balancer_arn == null ? 0 : 1
  source              = "./lb_listener_rule"
  container_port      = var.container_port
  lb_target_group_arn = aws_lb_target_group.default.id
  listener_arn        = var.listener_arn
  project_prefix      = var.project_prefix
  path_pattern        = var.path_pattern
  tags                = var.tags
  vpc_id              = var.vpc_id
  priority            = var.priority
  depends_on = [
    aws_lb_target_group.default
  ]
}