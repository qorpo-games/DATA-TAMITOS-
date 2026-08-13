# Samostatný TAMITOS Cognito pool (NIE daoblackswan). Vlastné useri pre health portál.
resource "aws_cognito_user_pool" "tamitos" {
  name = "tamitos-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_uppercase = false
    require_symbols   = false
  }

  # súhlas s newsletterom (checkbox pri registrácii -> custom atribút)
  schema {
    name                = "newsletter"
    attribute_data_type = "String"
    mutable             = true
    string_attribute_constraints {
      min_length = 0
      max_length = 8
    }
  }

  lambda_config {
    post_confirmation = aws_lambda_function.post_confirm.arn
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "tamitos-web"
  user_pool_id = aws_cognito_user_pool.tamitos.id

  generate_secret     = false # public SPA client
  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]

  supported_identity_providers         = ["COGNITO"]
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  allowed_oauth_flows_user_pool_client = true
  callback_urls                        = ["https://tamitos.com/health/komunita", "http://localhost:4200/komunita"]
  logout_urls                          = ["https://tamitos.com/health", "http://localhost:4200"]
}

# voliteľne: Hosted UI doména
resource "aws_cognito_user_pool_domain" "hosted" {
  domain       = "tamitos-health-auth"
  user_pool_id = aws_cognito_user_pool.tamitos.id
}

# post-confirmation Lambda (zápis usera + newsletter súhlasu do TAMITOS DB)
resource "aws_lambda_function" "post_confirm" {
  function_name    = "${local.p}-cognito-post-confirm"
  runtime          = "python3.11"
  handler          = "cognito_post_confirmation.handler"
  timeout          = 15
  role             = aws_iam_role.lambda.arn
  filename         = local.app_zip
  source_code_hash = filebase64sha256(local.app_zip)
  environment {
    variables = {
      USERS_TABLE      = aws_dynamodb_table.users.name
      NEWSLETTER_TABLE = aws_dynamodb_table.newsletter.name
    }
  }
}

resource "aws_lambda_permission" "cognito_invoke" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.post_confirm.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.tamitos.arn
}
