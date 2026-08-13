# Amazon Translate pre prekladovú vrstvu (zahraničné články -> SK).
# Ingest Lambda (lambda_ingest.py -> translate_sk.py) volá TranslateText;
# pri SourceLanguageCode="auto" Translate používa Comprehend na detekciu jazyka.
resource "aws_iam_role_policy" "translate" {
  name = "${local.p}-translate"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect   = "Allow",
      Action   = ["translate:TranslateText", "comprehend:DetectDominantLanguage"],
      Resource = "*"
    }]
  })
}
