# Admin API pre moderátora komunity (token-chránené). Routy: GET /admin-posts, POST /admin-moderate.
variable "admin_token" {
  description = "Tajný token pre admin moderátorské rozhranie"
  type        = string
  default     = ""
  sensitive   = true
}

resource "aws_lambda_function" "admin" {
  function_name    = "${local.p}-admin"
  runtime          = "python3.11"
  handler          = "admin_lambda.handler"
  timeout          = 15
  role             = aws_iam_role.lambda.arn
  filename         = local.app_zip
  source_code_hash = filebase64sha256(local.app_zip)
  environment {
    variables = {
      POSTS_TABLE = aws_dynamodb_table.community.name
      ADMIN_TOKEN = var.admin_token
    }
  }
}

resource "aws_apigatewayv2_integration" "admin" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.admin.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "admin" {
  for_each  = toset(["GET /admin-posts", "POST /admin-moderate"])
  api_id    = aws_apigatewayv2_api.api.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.admin.id}"
}

resource "aws_lambda_permission" "admin" {
  statement_id  = "AllowAPIAdmin"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
