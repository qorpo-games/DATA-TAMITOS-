import sys
import unittest
from pathlib import Path
from unittest.mock import Mock
sys.path.insert(0, str(Path(__file__).parents[1] / "backend"))
from ai_replies import process, validate_sources, validate_answer

SOURCE = {"id": "book", "title": "Kniha TAMITOS", "url": "https://tamitos.com/sk/kniha",
          "excerpt": "Informácie o knihe.", "approved": True, "language": "sk",
          "review_until": 2000, "auto_publish": True}
ANSWER = {"confidence": "adequate", "kind": "navigation", "paragraphs": [
    {"text": "Informácie o knihe nájdeš v odkaze.", "source_ids": ["book"]}]}
class ConditionalFailure(Exception):
    response = {"Error": {"Code": "ConditionalCheckFailedException"}}
FAIL = ConditionalFailure()

class Replies(unittest.TestCase):
    def test_disabled_does_not_read_or_send_question(self):
        db, generate = Mock(), Mock()
        self.assertEqual(process(db, "a"*16, [SOURCE], generate), "disabled")
        db.update_item.assert_not_called()
        generate.assert_not_called()

    def test_stale_unapproved_and_english_sources_are_excluded(self):
        pack = [dict(SOURCE, review_until=999), dict(SOURCE, approved=False),
                dict(SOURCE, language="en"), dict(SOURCE, url="javascript:alert(1)")]
        self.assertEqual(validate_sources(pack, 1000), {})

    def test_model_cannot_invent_url_or_citation(self):
        pack = validate_sources([SOURCE], 1000)
        for paragraph in [{"text": "Pozri https://evil.example", "source_ids": ["book"]},
                          {"text": "Text", "source_ids": ["invented"]},
                          {"text": "Text", "source_ids": []}]:
            with self.assertRaises(ValueError):
                validate_answer(dict(ANSWER, paragraphs=[paragraph]), pack)

    def test_single_claim_loser_does_not_call_provider(self):
        db, generate = Mock(), Mock()
        db.update_item.side_effect = FAIL
        self.assertEqual(process(db, "a"*16, [SOURCE], generate, enabled=True, now=1000), "not_claimed")
        generate.assert_not_called()

    def test_only_text_sent_and_default_is_human_review(self):
        db, generate = Mock(), Mock(return_value=ANSWER)
        db.update_item.return_value = {"Attributes": {"text": "Kde je kniha?", "topic": "knihy",
            "email": "private@example.com", "sub": "private-id", "ai_attempts": 1}}
        self.assertEqual(process(db, "a"*16, [SOURCE], generate, enabled=True, now=1000), "needs_review")
        self.assertEqual(generate.call_args.args[0], "Kde je kniha?")
        self.assertNotIn("private", str(generate.call_args))
        self.assertIn("ai_draft", db.update_item.call_args.kwargs["UpdateExpression"])

    def test_removed_parent_cannot_publish(self):
        db, generate = Mock(), Mock(return_value=ANSWER)
        db.update_item.side_effect = [{"Attributes": {"text": "Kniha?", "topic": "knihy", "ai_attempts": 1}}, FAIL]
        self.assertEqual(process(db, "a"*16, [SOURCE], generate, enabled=True, auto_publish=True, now=1000), "cancelled")

    def test_clinical_topic_never_autopublishes(self):
        db, generate = Mock(), Mock(return_value=ANSWER)
        db.update_item.return_value = {"Attributes": {"text": "Otázka", "topic": "terapie", "ai_attempts": 1}}
        self.assertEqual(process(db, "a"*16, [SOURCE], generate, enabled=True, auto_publish=True, now=1000), "needs_review")

    def test_retry_is_bounded_and_error_does_not_expose_provider_message(self):
        db, generate = Mock(), Mock(side_effect=RuntimeError("private-sdk-secret"))
        db.update_item.return_value = {"Attributes": {"text": "Otázka", "ai_attempts": 3}}
        self.assertEqual(process(db, "a"*16, [SOURCE], generate, enabled=True, now=1000), "needs_review")
        self.assertNotIn("private-sdk-secret", str(db.update_item.call_args))

    def test_free_generated_text_cannot_autopublish_even_in_product_topic(self):
        db, generate = Mock(), Mock(return_value=ANSWER)
        db.update_item.return_value = {"Attributes": {"text": "Otázka", "topic": "knihy", "ai_attempts": 1}}
        self.assertEqual(process(db, "a"*16, [SOURCE], generate, enabled=True, auto_publish=True, now=1000), "needs_review")

    def test_only_editor_approved_exact_excerpt_can_autopublish(self):
        answer = dict(ANSWER, paragraphs=[{"text": SOURCE["excerpt"], "source_ids": ["book"]}])
        db, generate = Mock(), Mock(return_value=answer)
        db.update_item.return_value = {"Attributes": {"text": "Otázka", "topic": "knihy", "ai_attempts": 1}}
        self.assertEqual(process(db, "a"*16, [SOURCE], generate, enabled=True, auto_publish=True, now=1000), "complete")

if __name__ == "__main__":
    unittest.main()
