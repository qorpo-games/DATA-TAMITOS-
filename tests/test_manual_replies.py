"""Manual moderator reply contract: mock AWS, no real posts or external model."""
import importlib.util
import json
import os
import pathlib
import sys
import types
import unittest
from unittest.mock import Mock, patch

def load_module(filename):
    boto = types.ModuleType("boto3"); boto.resource = Mock()
    conditions = types.ModuleType("boto3.dynamodb.conditions"); conditions.Key = Mock()
    auth = types.ModuleType("auth"); auth.verify_cognito_jwt = Mock(return_value=None)
    modules = {"boto3": boto, "boto3.dynamodb": types.ModuleType("boto3.dynamodb"), "boto3.dynamodb.conditions": conditions, "auth": auth}
    with patch.dict(sys.modules, modules), patch.dict(os.environ, {"POSTS_TABLE": "test"}):
        source = (pathlib.Path(__file__).parents[1] / "backend" / filename).read_text()
        module = types.ModuleType(filename)
        exec(compile(source, filename, "exec"), module.__dict__)
    return module

class ManualReplyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.admin = load_module("admin_lambda.py")
        cls.community = load_module("community_lambda.py")

    def setUp(self):
        self.db = Mock(); self.admin.POSTS = self.db; self.admin.ADMIN_TOKEN = "test-token"
        self.id = "0123456789abcdef"
        self.post = {"id": self.id, "status": "approved", "nick": "Test", "category": "tip", "text": "Parent test text", "created_iso": "2026-10-13T00:00:00Z"}

    def event(self, body, token="test-token"):
        return {"httpMethod": "POST", "headers": {"X-Admin-Token": token}, "body": json.dumps(body)}

    def test_reply_requires_existing_admin_auth(self):
        result = self.admin.handler(self.event({"id": self.id, "action": "reply", "text": "Moderátor odpovedá."}, "bad"), None)
        self.assertEqual(result["statusCode"], 401); self.db.update_item.assert_not_called()

    def test_server_author_and_conditional_approved_parent(self):
        result = self.admin.handler(self.event({"id": self.id, "action": "reply", "text": "  Moderátor odpovedá.  ", "author": "Fake Nina", "is_ai": True}), None)
        self.assertEqual(result["statusCode"], 200)
        call = self.db.update_item.call_args.kwargs
        self.assertEqual(call["ConditionExpression"], "attribute_exists(id) AND #s = :approved AND attribute_not_exists(#r)")
        reply = call["ExpressionAttributeValues"][":reply"]
        self.assertEqual(reply["author"], "TAMITOS"); self.assertIs(reply["is_ai"], False)
        self.assertEqual(reply["text"], "Moderátor odpovedá.")
        self.assertEqual(set(reply), {"author", "is_ai", "text", "created"})

    def test_multiline_reply_is_allowed(self):
        self.assertEqual(self.admin.handler(self.event({"id": self.id, "action": "reply", "text": "First paragraph.\\nSecond paragraph."}), None)["statusCode"], 200)

    def test_edit_requires_matching_version(self):
        expected = "2026-10-13T00:00:00.123456Z"
        result = self.admin.handler(self.event({"id": self.id, "action": "reply", "text": "Moderátor upravuje odpoveď.", "expected_reply_created": expected}), None)
        self.assertEqual(result["statusCode"], 200)
        call = self.db.update_item.call_args.kwargs
        self.assertIn("#r.#c = :expected", call["ConditionExpression"])
        self.assertEqual(call["ExpressionAttributeValues"][":expected"], expected)
        self.assertIn("reply_created", json.loads(result["body"]))

    def test_invalid_reply_version_never_updates(self):
        for expected in ("", 123, "x" * 65):
            self.assertEqual(self.admin.handler(self.event({"id": self.id, "action": "reply", "text": "Moderátor odpovedá.", "expected_reply_created": expected}), None)["statusCode"], 400)
        self.db.update_item.assert_not_called()

    def test_stale_reply_edit_returns_conflict_without_unconditional_write(self):
        error = Exception("conditional")
        error.response = {"Error": {"Code": "ConditionalCheckFailedException"}}
        self.db.update_item.side_effect = error
        result = self.admin.handler(self.event({"id": self.id, "action": "reply", "text": "Moderátor upravuje odpoveď.", "expected_reply_created": "old-version"}), None)
        self.assertEqual(result["statusCode"], 409)
        self.assertEqual(self.db.update_item.call_count, 1)
        self.assertIn("#r.#c = :expected", self.db.update_item.call_args.kwargs["ConditionExpression"])

    def test_missing_or_revoked_parent_is_conflict(self):
        error = Exception("conditional")
        error.response = {"Error": {"Code": "ConditionalCheckFailedException"}}
        self.db.update_item.side_effect = error
        self.assertEqual(self.admin.handler(self.event({"id": self.id, "action": "reply", "text": "Moderátor odpovedá."}), None)["statusCode"], 409)

    def test_invalid_reply_never_updates(self):
        for text in (None, 123, "short", "x"*1201, "<script>alert(1)</script>", "Text with control" + chr(0)):
            self.assertEqual(self.admin.handler(self.event({"id": self.id, "action": "reply", "text": text}), None)["statusCode"], 400)
        for ident in ("short", None, "0123456789ABCDEF"):
            self.assertEqual(self.admin.handler(self.event({"id": ident, "action": "reply", "text": "Moderátor odpovedá."}), None)["statusCode"], 400)
        self.db.update_item.assert_not_called()

    def test_public_reply_allowlist_excludes_drafts_and_private_fields(self):
        reply = {"author": "TAMITOS", "is_ai": False, "text": "Moderátor odpovedá.", "created": "2026-10-13T00:00:00Z", "email": "private", "moderator_sub": "private"}
        public = self.community._public_post({**self.post, "moderator_reply": reply, "ai_draft": {"text": "private"}, "ai_reply": {"text": "private"}})
        self.assertEqual(set(public["reply"]), {"author", "is_ai", "text", "created"})
        self.assertNotIn("ai_draft", public); self.assertNotIn("ai_reply", public)

    def test_non_server_or_ai_reply_is_not_public(self):
        for reply in ({"author": "Other", "is_ai": False, "text": "Text", "created": "date"}, {"author": "TAMITOS", "is_ai": True, "text": "Text", "created": "date"}, {"author": "TAMITOS", "is_ai": False, "text": None, "created": "date"}):
            self.assertNotIn("reply", self.community._public_post({**self.post, "moderator_reply": reply}))

    def test_deleted_parent_hides_manual_reply(self):
        self.community.POSTS = self.db
        self.db.get_item.return_value = {"Item": {**self.post, "status": "deleted", "moderator_reply": {"text": "private"}}}
        self.assertEqual(self.community.get_approved(self.id)["statusCode"], 404)

    def test_existing_moderation_action_is_preserved(self):
        self.assertEqual(self.admin.handler(self.event({"id": self.id, "action": "approve"}), None)["statusCode"], 200)
        self.assertEqual(self.db.update_item.call_args.kwargs["ExpressionAttributeValues"][":s"], "approved")


    def test_invalid_moderation_identifiers_never_update(self):
        for identifier in (None, "", "../other", "0123456789ABCDEF", "a" * 17):
            result = self.admin.handler(self.event({"id": identifier, "action": "approve"}), None)
            self.assertEqual(result["statusCode"], 400)
        self.db.update_item.assert_not_called()

    def test_moderation_requires_existing_record_and_records_actor(self):
        for action in ("approve", "reject", "delete"):
            result = self.admin.handler(self.event({"id": self.id, "action": action, "actor": "admin-sub"}), None)
            self.assertEqual(result["statusCode"], 200)
            call = self.db.update_item.call_args.kwargs
            self.assertEqual(call["ConditionExpression"], "attribute_exists(id)")
            self.assertEqual(call["ExpressionAttributeValues"][":actor"], "admin-sub")
            self.assertIn("moderated_at", call["UpdateExpression"])

    def test_missing_moderation_record_cannot_create_phantom(self):
        error = Exception("conditional")
        error.response = {"Error": {"Code": "ConditionalCheckFailedException"}}
        self.db.update_item.side_effect = error
        result = self.admin.handler(self.event({"id": self.id, "action": "approve"}), None)
        self.assertEqual(result["statusCode"], 404)
        self.assertEqual(self.db.update_item.call_count, 1)
        self.assertIn("attribute_exists(id)", self.db.update_item.call_args.kwargs["ConditionExpression"])

    def test_invalid_moderation_actor_never_updates(self):
        for actor in (None, "", 123, "x" * 129):
            self.assertEqual(self.admin.handler(self.event({"id": self.id, "action": "delete", "actor": actor}), None)["statusCode"], 400)
        self.db.update_item.assert_not_called()


    def test_non_object_json_never_updates(self):
        for body in (None, [], ["question"], "text", 123, False):
            self.assertEqual(self.admin.handler(self.event(body), None)["statusCode"], 400)
        self.db.update_item.assert_not_called()

    def test_non_string_actions_never_update(self):
        for action in (None, [], {}, 123):
            self.assertEqual(self.admin.handler(self.event({"id": self.id, "action": action}), None)["statusCode"], 400)
        self.db.update_item.assert_not_called()

if __name__ == "__main__": unittest.main()

