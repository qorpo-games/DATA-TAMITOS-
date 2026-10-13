# Public community detail and manual reply release

## Scope

This increment makes the existing moderated Slovak feed linkable and adds a manual response from the TAMITOS moderator. It does not enable model calls or automatic publication. English blog behavior is unchanged.

Public routes:
- GET /api/community?limit=30 returns {items: [...]}, with stable lowercase 16-character hex id.
- GET /api/community/{id} returns {item: ...}, only for an approved parent.
- Public fields: id, nick, category, childAge, topic, text, created, verified.
- Optional reply: {author: "TAMITOS", is_ai: false, text: string, created: UTC ISO string}.
- AI drafts, AI replies, account sub, email, moderation flags, tokens, and arbitrary record fields are not exposed.
- Missing, pending, flagged, rejected and deleted parents return the same 404.
- No cache; consistent current-state reads protect against stale approval-index entries.

Manual moderator route, using the existing server-side admin token:
POST /api/admin-moderate
{"id": "0123456789abcdef", "action": "reply", "text": "Plain text, 15 to 1200 trimmed characters.", "expected_reply_created": null}

The server fixes the author, is_ai and timestamp, ignoring supplied author values. The update is conditional on an existing approved parent. Invalid input returns 400, unauthorized access 401, and a missing or withdrawn parent 409. Plain text must be escaped by the client, never rendered via innerHTML. First reply requires expected_reply_created absent or null and atomically requires no existing moderator_reply. An edit requires expected_reply_created equal to the currently loaded reply.created; stale edits return 409 and keep the existing answer. Success returns reply_created with the new UTC microsecond timestamp. Two admins cannot silently overwrite each other. Soft-deleting the parent hides its response. No real parent question is answered by tests.

## Verified build and deployment evidence

Repository main at dcd6f6dd3167981f1823d3850a055492e2aa6654 has no .github workflow files in its recursive tree. deploy/build.sh builds app.zip and a Python 3.11 dependency layer. deploy/redeploy.sh is a manual CloudShell script combining Angular/S3/CloudFront and Lambda updates; it does NOT add new API Gateway routes.

Do not use that full-site script for this backend-only release. The existing community/admin Lambda names in that script are tamitos-health-community and tamitos-health-admin, region eu-central-1. These are repository references, not a substitute for verifying the deployed resource configuration.

## Backend-only rollout checklist for the release owner

1. Review and merge PR #2 at the reviewed head SHA. Draft AI PR #1 also edits community_lambda.py; do not overwrite the manual reply field or current-state public projection when reconciling.
2. Read existing Lambda configuration, handler, runtime, layers and function code hashes. Keep environment variables, secrets, roles and existing layers unchanged. Back up current Lambda code packages or record versioned rollback targets before updating.
3. Create app.zip with all backend Python files from the merged reviewed revision. community_lambda.py imports auth.py; do not deploy a one-file zip. Use the existing dependency layer rather than rebuilding it unnecessarily.
4. Run the 21 public/manual unittest cases with mocked AWS. Compile all backend files under Python 3.11.
5. Update function code only for community and admin. Wait for LastUpdateStatus Successful for both. No update-function-configuration, Terraform apply, IAM mutation, or AI scheduler is needed.
6. Read the actual API Gateway routes. Reuse the integration target of existing GET /community and add GET /community/{id} only if absent. Confirm the existing default stage auto_deploy behavior before adding the route. Do not create a second API or integration.
7. Verify anonymous list JSON, invalid limit 400, malformed/random detail 404 and absence of private fields. Compare rejected/missing fixture behavior in a test environment. Production no-public-post state is valid, not a reason to approve real questions.
8. Test reply creation against synthetic approved/revoked fixtures only. Never reply to or publish real parent questions as a release test.
9. Release the common admin reply bridge/UI and Slovak public hub independently. Both must handle absence of reply and unavailable detail safely.
10. Update the release status only after HTTP behavior is verified. Backend code merge alone is not production deployment.

## Tests and remaining boundaries

Nine public-detail cases and twelve manual-reply cases pass using source fetched from the proposed revision, with no AWS calls. Public list and detail share the same projection and consistent read status check.

Public user replies, reply moderation queues, and their rate limiting/storage are still not implemented. This increment provides one server-authored moderator response per approved post, not unrestricted threaded discussion. AI provider choice, approved citation registry and an explicitly enabled worker remain separate; no private question is sent externally.

Full Angular production build, Terraform plan/apply, AWS rollout and production detail HTTP verification have not been performed by this agent. The Angular service change is additive. No UI, analytics, sitemap, pricing, credentials, or account permissions are changed.
