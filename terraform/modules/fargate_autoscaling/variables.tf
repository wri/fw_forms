variable "project" {
  type = string
}

variable "name_suffix" {
  type    = string
  default = ""
}

variable "cluster_id" {
  type = string
  default = ""
}

variable "cluster_name" {
  type = string
  default = ""
}

variable "tags" {
  type = map(string)
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "load_balancer_arn" {
  type        = string
  default     = ""
  description = "Optional Load Balancer to use for fargate cluster. When left blank, a new LB will be created"
}

variable "load_balancer_security_group" {
  type        = string
  default     = ""
  description = "Optional secuirty group of load balancer with which the task can communicate. Required if load_blancer_arn is not empty"
}

variable "container_name" {
  type        = string
  description = "The name of the container to associate with the load balancer."
}

variable "container_port" {
  type        = number
  description = "The port on the container to associate with the load balancer."
}

variable "listener_port" {
  type        = number
  description = "The default port the Load Balancer listern should listen to. Will be ignored when acm_certificate is set."
  default     = 80
}

variable "desired_count" {
  type        = number
  description = "Number of tasks"
  default     = 1
}

variable "fargate_cpu" {
  type    = number
  default = 1
}

variable "fargate_memory" {
  type    = number
  default = 512
}

variable "auto_scaling_max_cpu_util" {
  type    = number
  default = 75
}

variable "auto_scaling_max_capacity" {
  type    = number
  default = 1
}

variable "auto_scaling_min_capacity" {
  type    = number
  default = 1
}

variable "auto_scaling_cooldown" {
  type    = number
  default = 300
}

variable "security_group_ids" {
  type = list(string)
}

variable "task_role_policies" {
  type    = list(string)
  default = []
}

variable "task_execution_role_policies" {
  type    = list(string)
  default = []
}

variable "container_definition" {
  type        = string
  description = "JSON object defining the task container"
}

variable "force_new_deployment" {
  type    = bool
  default = true
}

variable "acm_certificate_arn" {
  type        = string
  default     = null
  description = "The ACM/ SSL certificate to use. When set, listener port will be set to 443. Request to port 80 will be forwarded. All other ports will be closed."
}