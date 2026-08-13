# ---- Verejný web na data.tamitos.com: S3 (statický web) + CloudFront ----
# CloudFront: default -> S3 (Angular SPA); /api/* -> API Gateway (strip /api prefix).
# Certifikát (us-east-1) sa dodá cez -var="cert_arn=...". DNS: CNAME data -> CloudFront.

variable "cert_arn" {
  description = "ACM certifikát (us-east-1) pre data.tamitos.com"
  type        = string
  default     = ""
}

variable "site_domain" {
  type    = string
  default = "data.tamitos.com"
}

resource "aws_s3_bucket" "web" {
  bucket = "${local.p}-web-979848238256"
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket                  = aws_s3_bucket.web.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "web" {
  name                              = "${local.p}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Function: odstráni /api prefix, aby to sadlo na routy API Gateway (/articles, /community, ...)
resource "aws_cloudfront_function" "strip_api" {
  name    = "${local.p}-strip-api"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var req = event.request;
      req.uri = req.uri.replace(/^\/api/, '');
      if (req.uri === '') { req.uri = '/'; }
      return req;
    }
  EOT
}

locals {
  api_host = replace(aws_apigatewayv2_api.api.api_endpoint, "https://", "")
}

resource "aws_cloudfront_distribution" "web" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.site_domain]
  price_class         = "PriceClass_100"
  comment             = "TAMITOS Health web"

  origin {
    origin_id                = "s3"
    domain_name              = aws_s3_bucket.web.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.web.id
  }

  origin {
    origin_id   = "api"
    domain_name = local.api_host
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized
  }

  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "api"
    viewer_protocol_policy    = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # Managed-AllViewerExceptHostHeader
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.strip_api.arn
    }
  }

  # SPA routing: chýbajúce cesty -> index.html
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = var.cert_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

resource "aws_s3_bucket_policy" "web" {
  bucket = aws_s3_bucket.web.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Sid       = "AllowCloudFrontRead",
      Effect    = "Allow",
      Principal = { Service = "cloudfront.amazonaws.com" },
      Action    = "s3:GetObject",
      Resource  = "${aws_s3_bucket.web.arn}/*",
      Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.web.arn } }
    }]
  })
}

output "cloudfront_domain" { value = aws_cloudfront_distribution.web.domain_name }
output "web_bucket" { value = aws_s3_bucket.web.id }
