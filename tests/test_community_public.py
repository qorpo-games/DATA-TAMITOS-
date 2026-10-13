"""Public community API tests, no AWS calls or real parent posts."""
import importlib.util
import json
import pathlib
import sys
import types
import unittest
from unittest.mock import Mock, patch

class PublicTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        boto = types.ModuleType("boto3")
        boto.resource = Mock()
        conditions = types.ModuleType("boto3.dynamodb.conditions")
        conditions.Key = Mock()
        auth = types.ModuleType("auth")
        auth.verify_cognito_jwt = Mock(return_value=None)
        modules = {"boto3": boto, "boto3.dynamodb": types.ModuleType("boto3.dynamodb"),
                   "boto3.dynamodb.conditions": conditions, "auth": auth}
        with patch.dict(sys.modules, modules):
            source = (pathlib.Path(__file__).parents[1] / "backend" / "community_lambda.py").read_text()
            cls.api = types.ModuleType("public_community_test")
            exec(compile(source, "community_lambda.py", "exec"), cls.api.__dict__)

    def setUp(self):
        self.db = Mock()
        self.api.POSTS = self.db
        self.item = {"id": "0123456789abcdef", "status": "approved", "nick": "Test",
                     "category": "tip", "text": "Example text.", "created_iso": "2026-10-13T00:00:00Z",
                     "sub": "private", "email": "private@example.invalid", "flag": "private", "ai_reply": "private"}

    def event(self, method="GET", path="/community", query=None):
        return {"rawPath": path, "requestContext": {"http": {"method": method}}, "queryStringParameters": query}

    def test_approved_detail_has_only_public_fields(self):
        self.db.get_item.return_value = {"Item": self.item}
        r = self.api.handler(self.event(path="/community/" + self.item["id"]), None)
        self.assertEqual(r["statusCode"], 200)
        self.assertEqual(set(json.loads(r["body"])["item"]), {"id", "nick", "category", "childAge", "topic", "text", "created", "verified"})
        self.db.get_item.assert_called_once_with(Key={"id": self.item["id"]}, ConsistentRead=True)
        self.assertEqual(r["headers"]["Cache-Control"], "no-store")

    def test_missing_and_private_are_identical(self):
        responses = []
        for status in (None, "pending", "rejected", "flagged"):
            self.db.get_item.return_value = {} if status is None else {"Item": {**self.item, "status": status}}
            r = self.api.handler(self.event(path="/community/" + self.item["id"]), None)
            self.assertEqual(r["statusCode"], 404)
            responses.append(r)
        self.assertTrue(all(r == responses[0] for r in responses))

    def test_malformed_id_never_reads_database(self):
        for ident in ("", "x", "../admin", "0123456789ABCDEF", self.item["id"] + "/replies"):
            self.assertEqual(self.api.handler(self.event(path="/community/" + ident), None)["statusCode"], 404)
        self.db.get_item.assert_not_called()

    def test_stale_index_cannot_expose_revoked_post(self):
        self.db.query.return_value = {"Items": [self.item]}
        self.db.get_item.return_value = {"Item": {**self.item, "status": "pending"}}
        self.assertEqual(json.loads(self.api.handler(self.event(), None)["body"]), {"items": []})

    def test_list_has_current_content_and_stable_id(self):
        self.db.query.return_value = {"Items": [self.item]}
        self.db.get_item.return_value = {"Item": {**self.item, "text": "Current text"}}
        row = json.loads(self.api.handler(self.event(), None)["body"])["items"][0]
        self.assertEqual(row["text"], "Current text")
        self.assertEqual(row["id"], self.item["id"])
        self.assertNotIn("sub", row)

    def test_invalid_limits_never_query(self):
        for limit in ("0", "-1", "101", "x", "1.5", "", None):
            self.assertEqual(self.api.handler(self.event(query={"limit": limit}), None)["statusCode"], 400)
        self.db.query.assert_not_called()

    def test_valid_limits(self):
        self.db.query.return_value = {"Items": []}
        for limit in ("1", "30", "100"):
            self.assertEqual(self.api.handler(self.event(query={"limit": limit}), None)["statusCode"], 200)
            self.assertEqual(self.db.query.call_args.kwargs["Limit"], int(limit))

    def test_unsupported_methods_and_paths(self):
        for method, path, expected in (("DELETE", "/community", 405), ("PUT", "/community", 405), ("GET", "/admin", 404), ("POST", "/community/" + self.item["id"], 404)):
            self.assertEqual(self.api.handler(self.event(method, path), None)["statusCode"], expected)
        self.db.query.assert_not_called()
        self.assertEqual(self.api.handler(self.event("OPTIONS"), None)["statusCode"], 204)

    def test_submit_dispatch_is_preserved(self):
        with patch.object(self.api, "submit", return_value={"statusCode": 201}) as submit:
            event = self.event("POST")
            self.assertEqual(self.api.handler(event, None)["statusCode"], 201)
            submit.assert_called_once_with(event)

if __name__ == "__main__":
    unittest.main()
