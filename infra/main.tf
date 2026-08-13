terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.region
}

locals {
  p = var.project
}

# ------------------------------------------------------------------ DynamoDB
# Dátové tabuľky (napĺňa denný ingest) + komunitné tabuľky.
resource "aws_dynamodb_table" "articles" {
  name         = "${local.p}-articles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  attribute {
    name = "id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "providers" {
  name         = "${local.p}-providers"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "ext_id"
  attribute {
    name = "ext_id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "studies" {
  name         = "${local.p}-studies"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "nct_id"
  attribute {
    name = "nct_id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "community" {
  name         = "th_community"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  attribute {
    name = "id"
    type = "S"
  }
  attribute {
    name = "status"
    type = "S"
  }
  attribute {
    name = "created"
    type = "N"
  }
  global_secondary_index {
    name            = "status-created-index"
    hash_key        = "status"
    range_key       = "created"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "ratelimit" {
  name         = "th_ratelimit"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "ip"
  attribute {
    name = "ip"
    type = "S"
  }
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}

resource "aws_dynamodb_table" "users" {
  name         = "th_users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "sub"
  attribute {
    name = "sub"
    type = "S"
  }
}

resource "aws_dynamodb_table" "newsletter" {
  name         = "th_newsletter"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "email"
  attribute {
    name = "email"
    type = "S"
  }
}

# ------------------------------------------------------------------ IAM
resource "aws_iam_role" "lambda" {
  name = "${local.p}-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "ddb" {
  name = "${local.p}-ddb"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan", "dynamodb:BatchWriteItem"],
      Resource = "*"
    }]
  })
}

# ------------------------------------------------------------------ Lambda vrstva (python deps)
# ZIP vrstvy vytvorí deploy/build.sh (openpyxl, feedparser, requests, pyjwt[crypto]).
resource "aws_lambda_layer_version" "deps" {
  layer_name          = "${local.p}-deps"
  filename            = "${path.module}/../build/layer.zip"
  compatible_runtimes = ["python3.11"]
  source_code_hash    = filebase64sha256("${path.module}/../build/layer.zip")
}

# spoločný kód lambd (build.sh spraví build/app.zip zo /backend a /data-pipeline)
locals { app_zip = "${path.module}/../build/app.zip" }

resource "aws_lambda_function" "ingest" {
  function_name    = "${local.p}-ingest"
  runtime          = "python3.11"
  handler          = "lambda_ingest.handler"
  timeout          = 300
  memory_size      = 512
  role             = aws_iam_role.lambda.arn
  filename         = local.app_zip
  source_code_hash = filebase64sha256(local.app_zip)
  layers           = [aws_lambda_layer_version.deps.arn]
  environment {
    variables = {
      ARTICLES_TABLE  = aws_dynamodb_table.articles.name
      PROVIDERS_TABLE = aws_dynamodb_table.providers.name
      STUDIES_TABLE   = aws_dynamodb_table.studies.name
    }
  }
}

resource "aws_lambda_function" "data_read" {
  function_name    = "${local.p}-data-read"
  runtime          = "python3.11"
  handler          = "data_read_lambda.handler"
  timeout          = 15
  role             = aws_iam_role.lambda.arn
  filename         = local.app_zip
  source_code_hash = filebase64sha256(local.app_zip)
  environment {
    variables = {
      ARTICLES_TABLE  = aws_dynamodb_table.articles.name
      PROVIDERS_TABLE = aws_dynamodb_table.providers.name
      STUDIES_TABLE   = aws_dynamodb_table.studies.name
      CORS_ORIGIN     = var.cors_origin
    }
  }
}

resource "aws_lambda_function" "community" {
  function_name    = "${local.p}-community"
  runtime          = "python3.11"
  handler          = "community_lambda.handler"
  timeout          = 15
  role             = aws_iam_role.lambda.arn
  filename         = local.app_zip
  source_code_hash = filebase64sha256(local.app_zip)
  layers           = [aws_lambda_layer_version.deps.arn]
  environment {
    variables = {
      POSTS_TABLE           = aws_dynamodb_table.community.name
      RATE_TABLE            = aws_dynamodb_table.ratelimit.name
      TURNSTILE_SECRET      = var.turnstile_secret
      COGNITO_REGION        = var.region
      COGNITO_USER_POOL_ID  = aws_cognito_user_pool.tamitos.id
      COGNITO_APP_CLIENT_ID = aws_cognito_user_pool_client.web.id
    }
  }
}

# ------------------------------------------------------------------ API Gateway (HTTP API)
resource "aws_apigatewayv2_api" "api" {
  name          = "${local.p}-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = [var.cors_origin]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["content-type", "authorization"]
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
  # jednoduchý throttling proti spamu
  default_route_settings {
    throttling_rate_limit  = 20
    throttling_burst_limit = 40
  }
}

# integrácie + routy
locals {
  routes = {
    "GET /articles"   = aws_lambda_function.data_read.invoke_arn
    "GET /providers"  = aws_lambda_function.data_read.invoke_arn
    "GET /studies"    = aws_lambda_function.data_read.invoke_arn
    "GET /community"  = aws_lambda_function.community.invoke_arn
    "POST /community" = aws_lambda_function.community.invoke_arn
  }
}

resource "aws_apigatewayv2_integration" "data_read" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.data_read.invoke_arn
  payload_format_version = "2.0"
}
resource "aws_apigatewayv2_integration" "community" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.community.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "r" {
  for_each  = toset(["GET /articles", "GET /providers", "GET /studies"])
  api_id    = aws_apigatewayv2_api.api.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.data_read.id}"
}
resource "aws_apigatewayv2_route" "community" {
  for_each  = toset(["GET /community", "POST /community"])
  api_id    = aws_apigatewayv2_api.api.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.community.id}"
}

resource "aws_lambda_permission" "data_read" {
  statement_id  = "AllowAPIData"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.data_read.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
resource "aws_lambda_permission" "community" {
  statement_id  = "AllowAPICommunity"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.community.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

# ------------------------------------------------------------------ EventBridge (denný job)
resource "aws_scheduler_schedule" "daily" {
  name = "${local.p}-daily-ingest"
  flexible_time_window {
    mode = "OFF"
  }
  schedule_expression = var.ingest_cron
  target {
    arn      = aws_lambda_function.ingest.arn
    role_arn = aws_iam_role.scheduler.arn
  }
}

resource "aws_iam_role" "scheduler" {
  name = "${local.p}-scheduler-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "scheduler.amazonaws.com" } }]
  })
}
resource "aws_iam_role_policy" "scheduler_invoke" {
  name = "${local.p}-scheduler-invoke"
  role = aws_iam_role.scheduler.id
  policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [{ Effect = "Allow", Action = "lambda:InvokeFunction", Resource = aws_lambda_function.ingest.arn }]
  })
}

# ------------------------------------------------------------------ POZN. k data.tamitos.com
# Vlastná doména (data.tamitos.com) = ACM cert (regionálny v eu-central-1) +
# aws_apigatewayv2_domain_name + api_mapping + DNS CNAME/A na tamitos.com zóne.
# Doplní sa po vytvorení certifikátu — viď infra/README.md.
