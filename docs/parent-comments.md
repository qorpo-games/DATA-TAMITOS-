# Moderated replies from parents

POST /community accepts optional `parent_id`: exactly 16 lowercase hexadecimal characters identifying an approved root question. Existing root submissions are unchanged. A reply must pass the same honeypot, minimum fill time, captcha (when configured), rate and moderation guards as a question. Every accepted reply remains `pending` or `flagged`; public clients cannot set approval, verified status or account identity. No automatic retries or new idempotency guarantee are added.

GET /community lists approved root questions only. GET /community/{id} returns:

```json
{"item": {"id":"0123456789abcdef"}, "comments": [{"id":"1111111111111111","nick":"Rodič","text":"Public comment text","created":"2026-10-13T00:00:00Z","verified":false}], "comments_truncated":false}
```

The abbreviated item above retains the existing root public contract and manual TAMITOS moderator reply. Comments have only id, nick, text, created and verified fields. Account identifiers, email, optional child/health metadata, moderation flags and AI drafts are not public. A child cannot be used as another child's parent or opened as a standalone public root. Moderation continues through the existing approve/reject/delete actions.

The query reads the latest 100 candidates for this specific parent from the sparse `parent-created-index`, then consistently rereads current child content/status and checks the parent again. Approved results are sorted chronologically. `comments_truncated` signals that additional older candidates exist. The interface should say that it displays recent comments in that case. This prevents other threads consuming a global comment window. Cursor pagination can be added later without exposing database keys.

## Deployment order

1. Update the EXISTING th_community table to add the `parent-created-index` GSI, hash key `parent_id` (S), range key `created` (N), projection ALL. Preserve id PK, billing mode, existing status-created-index and all other settings. The corresponding Terraform change is limited to this table block. No new tables or IAM/secret changes are required; check existing query permissions cover table indexes.
2. Wait for the new index to become ACTIVE before deploying community_lambda.py. Do not deploy this handler first, because details need the index and intentionally do not fall back to a global last-100 query.
3. Deploy the Lambda with its existing environment, auth module, tables, captcha settings and rate rules. There is no production data backfill to run manually: DynamoDB indexes existing records with parent_id automatically. Old root questions lack parent_id and do not appear in the sparse index.
4. Deploy the TAMITOS form with optional parent_id and the detail comments renderer. Render parent text as text, not unescaped HTML. On 201 show pending-moderation confirmation, never an invented live comment. Do not silently resubmit failed requests.
5. Read-only production validation may confirm approved thread details, no private fields and root listing exclusion. Tests use mocks only; no test question/comment should be written to production for verification.

Run: `python3 -m unittest discover -s tests -v`. The new tests cover malformed bodies, invalid parents, existing anti-spam, flagged/pending moderation, stale indexes, changed parent association, parent revocation, private fields and explicit truncation. Existing root/API and manual moderator reply tests must continue to pass.
