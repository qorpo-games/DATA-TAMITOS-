output "api_base_url" {
  description = "Základná URL API (dočasná, kým sa nenapojí data.tamitos.com)"
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.tamitos.id
}

output "cognito_app_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "cognito_hosted_ui_domain" {
  value = "${aws_cognito_user_pool_domain.hosted.domain}.auth.${var.region}.amazoncognito.com"
}

output "next_steps" {
  value = "Napoj data.tamitos.com na api_base_url (custom domain + ACM + DNS). Doplň COGNITO_APP_CLIENT_ID do frontendu."
}
