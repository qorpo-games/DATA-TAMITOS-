# Public community detail contract

This change prepares a stable public read contract for the Slovak TAMITOS Spolu hub. It does not publish the hub, enable replies, generate AI answers, or change moderation decisions.

## Verified repository state

At main commit dcd6f6dd3167981f1823d3850a055492e2aa6654, DATA has a moderated community feed and submission endpoint. Public list responses lack IDs, and no detail or replies routes exist. The separate TAMITOS Move common admin integration is already live according to the release evidence supplied by the parent task. The standalone hub is a design prototype, not an integrated production forum.

## Contract

- GET /api/community returns approved items with stable id and the existing public fields.
- GET /api/community/{id} returns {item: ...} for an approved post only.
- Missing, pending, flagged, rejected, and malformed IDs return the same 404 body.
- Public responses use an explicit field allowlist. Account sub, email, moderation flag, unpublished AI fields, and other record fields are excluded.
- Detail reads are consistent. Lists re-read each candidate consistently because the GSI can still contain a recently revoked post.
- Cache-Control: no-store prevents client caching of moderation changes. Existing CloudFront API caching is already disabled.
- Invalid list limits return 400, rather than raising an error or querying with a negative limit.
- Angular CommunityService exposes detail(id). No UI component currently calls it.

Lists can contain fewer rows than the requested limit when index candidates have been revoked. Pagination and reply counts are intentionally outside this change.

## Validation

Nine stdlib unittest cases cover private-field exclusion, consistent reads, identical unpublished/missing responses, invalid IDs, stale-index revocation, current content, invalid and valid limits, route dispatch, and preservation of submission dispatch. No real parent question is created or approved.

Run: python3 -B -m unittest discover -s tests -p test_community_public.py -v

## Release order and remaining work

1. Review this PR against the existing AI draft PR #1. Both edit backend/community_lambda.py, so reconcile the handler and projection changes explicitly before combining them.
2. Deploy the Lambda and the new API Gateway GET detail route together, then verify public HTTP behavior using synthetic approved fixtures in a test environment.
3. Integrate the approved-read contract into the approved Slovak hub design using the existing TAMITOS site header, fonts, and authentic character assets. English remains the current article blog.
4. Add replies storage, moderation, read and submission routes with privacy tests as a separate change.
5. Select an AI provider, approve the citations registry and operational limits, then implement an opt-in worker. AI generation and publication remain disabled.

Terraform apply, a Lambda rollout, production UI publication, and AI activation have not been performed by this PR. No IAM, credentials, prices, analytics, or language routing are changed.
