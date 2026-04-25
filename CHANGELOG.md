# Changelog

## 0.3.0 (2026-04-23)

### Added

- `client.agents.testChat(agentId, body, opts?)` — send a test-chat request
  against an agent's draft or active version (optional `version: 'draft' | 'active'`).
- `client.agents.activate(agentId)` and `client.agents.archive(agentId)` —
  lifecycle transitions `draft/archived -> active` and `active -> archived`.
- `client.agents.drafts.{create, get, discard, activate}(agentId)` — draft
  lifecycle management on the agent resource.
- `client.agents.subscriptions.create(...)` now accepts
  `mode: 'always' | 'explicit' | 'nl_semantic'`, `matchSpec`,
  `matchSpecDescription`, and `threshold` for parity with the Python SDK's
  subscription authoring modes.
- `client.agents.update(...)` now accepts `intentFallback:
  'broadcast' | 'empty' | 'retry_wider'` and `corpusId`.
- `client.feeds.createDraft` / `getDraft` / `activateDraft` /
  `discardDraft` — feed draft lifecycle. `activateDraft` returns the
  updated **parent** feed.
- `client.feeds.listSubscriptions(feedId)` — read-only view of
  subscriptions from the feed record, including `matchSpec` and
  `matchSpecDescription` for explicit / `nl_semantic` subscriptions.
- `client.feeds.submitFeedback(feedId, { rating, chunkId, feedRunId })`
  and `client.feeds.getFeedbackStats(feedId, { feedRunId? })` — feed
  result feedback and aggregated stats. Response interfaces require all
  server-guaranteed fields to catch deserialization regressions at the
  type layer.

## 0.2.0 (2026-04-16)

Raw-text batch ingestion and retrieval optimization update for the public
TypeScript SDK.

### Added

- `client.indexes.optimize(...)` for retrieval optimization jobs
- `client.documents.getBatch(...)` for batch-status lookup on raw-text uploads

### Changed

- `client.documents.uploadBatch(...)` returns an enqueue handle when used with `wait: false`
- refreshed README guidance for raw-text batch uploads and retrieval optimization

## 0.1.1 (2026-04-14)

Feature and packaging update for the Knowledge<sup>2</sup> TypeScript SDK.

### Added

- new typed client resources for agents, feeds, A2A, and pipelines
- typed handling for feature-gated and quota-related API errors

### Changed

- refreshed the public SDK documentation and examples for the expanded API surface
- aligned package metadata, repository links, and issue links for the public `@knowledge2/sdk` package

## 0.1.0 (2026-03-02)

Initial release of the Knowledge<sup>2</sup> TypeScript SDK.

### Features

- Knowledge<sup>2</sup> client with API key, bearer token, and admin token authentication
- core public retrieval workflow support for orgs, auth, projects, corpora, documents, indexes, search, and jobs
- Automatic retry with exponential backoff for transient errors (5xx, 429, network)
- Typed error hierarchy matching the Python SDK (10 error classes)
- Automatic `snake_case`/`camelCase` conversion at the serialization boundary
- Job polling with configurable timeout and AbortSignal support
- Async iterator pagination via `listAll*()` methods
- OpenAPI-generated types from the K2 API spec
- Dual ESM/CJS output with TypeScript declarations
- Zero runtime dependencies (Node.js 20+ built-in `fetch`)
- Debug logging with credential redaction
