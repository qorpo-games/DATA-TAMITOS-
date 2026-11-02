# Review state is private and separate from imported provider rows.
# Integrate into the current-account deployment; do not apply legacy-account
# Terraform without first reconciling its existing state/resources.
resource "aws_dynamodb_table" "provider_review" {
  name         = "${local.p}-provider-review"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  attribute {
    name = "id"
    type = "S"
  }
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
  server_side_encryption { enabled = true }
  point_in_time_recovery { enabled = true }
}

resource "aws_iam_role" "provider_review" {
  name = "${local.p}-provider-review"
  assume_role_policy = jsonencode({Version = "2012-10-17", Statement = [{Effect = "Allow", Action = "sts:AssumeRole", Principal = {Service = "lambda.amazonaws.com"}}]})
}
resource "aws_iam_role_policy_attachment" "provider_review_logs" {
  role       = aws_iam_role.provider_review.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
resource "aws_iam_role_policy" "provider_review" {
  role = aws_iam_role.provider_review.id
  policy = jsonencode({Version = "2012-10-17", Statement = [
    {Effect = "Allow", Action = ["dynamodb:GetItem"], Resource = aws_dynamodb_table.providers.arn},
    {Effect = "Allow", Action = ["dynamodb:GetItem", "dynamodb:Scan", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:ConditionCheckItem"], Resource = aws_dynamodb_table.provider_review.arn}
  ]})
}
resource "aws_lambda_function" "provider_review" {
  function_name    = "${local.p}-provider-review"
  runtime          = "python3.11"
  handler          = "provider_review.handler"
  timeout          = 15
  role             = aws_iam_role.provider_review.arn
  filename         = local.app_zip
  source_code_hash = filebase64sha256(local.app_zip)
  environment {
    variables = {
      PROVIDERS_TABLE       = aws_dynamodb_table.providers.name
      PROVIDER_REVIEW_TABLE = aws_dynamodb_table.provider_review.name
      ADMIN_TOKEN           = var.admin_token
      CORS_ORIGIN           = var.cors_origin
    }
  }
}
resource "aws_apigatewayv2_integration" "provider_review" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.provider_review.invoke_arn
  payload_format_version = "2.0"
}
resource "aws_apigatewayv2_route" "provider_review" {
  for_each  = toset(["GET /provider-sources", "GET /provider-review", "POST /provider-review", "POST /provider-confirmation"])
  api_id    = aws_apigatewayv2_api.api.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.provider_review.id}"
}
resource "aws_lambda_permission" "provider_review" {
  statement_id  = "AllowAPIProviderReview"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.provider_review.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
