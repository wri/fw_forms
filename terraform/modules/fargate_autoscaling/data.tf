

data "aws_subnet" "public_subnet" {
  count = length(var.public_subnet_ids)
  id    = var.public_subnet_ids[count.index]
}

#
# ECS IAM resources
#
data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }

    actions = [
      "sts:AssumeRole",
    ]
  }
}


data "template_file" "autoscaling_role" {
  template = file("${path.module}/templates/service_role.json.tmpl")
  vars = {
    service = "ecs.application-autoscaling.amazonaws.com"
  }
}

data "local_file" "appautoscaling_role_policy" {

  filename = "${path.module}/templates/appautoscaling_role_policy.json"
}

data "template_file" "ecs_update_service_policy" {
  template = file("${path.module}/templates/iam_policy_update_ecs_service.json.tmpl")
  vars = {
    service_arn = aws_ecs_service.default.id
  }
}