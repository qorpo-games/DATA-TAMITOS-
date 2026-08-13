variable "region" {
  description = "AWS región"
  type        = string
  default     = "eu-central-1"
}

variable "project" {
  description = "Prefix pre názvy zdrojov"
  type        = string
  default     = "tamitos-health"
}

variable "turnstile_secret" {
  description = "Cloudflare Turnstile secret (anti-spam pre komunitu)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "cors_origin" {
  description = "Povolený origin pre API (web)"
  type        = string
  default     = "https://tamitos.com"
}

variable "ingest_cron" {
  description = "Denný job — 03:00 UTC = 05:00 Europe/Bratislava (leto)"
  type        = string
  default     = "cron(0 3 * * ? *)"
}
