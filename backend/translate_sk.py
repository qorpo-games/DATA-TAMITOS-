"""
TAMITOS — prekladová vrstva (Amazon Translate) pre zahraničné články.

Preloží titulok + zhrnutie do slovenčiny pre našu komunitu. Originál
(URL aj pôvodný titulok/summary) zostáva zachovaný, takže vždy vieme
odkázať na zdroj. Beží celé na AWS (žiadne externé API), účtuje sa za znaky.

Používa lambda_ingest.py pri dennom zbere feedu noviniek.
"""
import boto3

_client = boto3.client("translate")

# Amazon Translate: limit ~10 000 bajtov na požiadavku; summary je aj tak krátke.
_MAX = 9000


def translate_to_sk(text, source="auto"):
    """Preloží text do slovenčiny. Pri chybe vráti originál (fail-safe)."""
    if not text or not text.strip():
        return text
    try:
        resp = _client.translate_text(
            Text=text[:_MAX],
            SourceLanguageCode=source,
            TargetLanguageCode="sk",
        )
        return resp.get("TranslatedText", text)
    except Exception as e:  # noqa: BLE001
        print("translate err:", e)
        return text
