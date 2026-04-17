# @knowledge2/sdk

[![npm version](https://img.shields.io/npm/v/%40knowledge2%2Fsdk)](https://www.npmjs.com/package/@knowledge2/sdk)
[![Node 20+](https://img.shields.io/badge/node-20%2B-blue)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Official TypeScript SDK for the [Knowledge<sup>2</sup>](https://knowledge2.ai) retrieval platform API.
The supported public customer journey is:

`create corpus -> ingest documents -> build indexes -> search -> optimize retrieval`

## Installation

```bash
npm install @knowledge2/sdk
```

Requires Node.js 20 or later.

## Surface Categories

| Category | Surface |
|---|---|
| Core retrieval workflow | orgs, auth, projects, corpora, documents, indexes, search, jobs |
| Enterprise capabilities | agents, feeds, pipelines, A2A |

The main docs and examples below focus on the core retrieval workflow.

## Quick Start

```typescript
import { Knowledge2 } from "@knowledge2/sdk";

const client = new Knowledge2({ apiKey: "k2_..." });

// Search a corpus
const results = await client.search.query("corpus-id", {
  query: "What is retrieval augmented generation?",
  topK: 5,
});

console.log(results?.results);
```

## Authentication

The SDK supports three authentication methods. API key auth is the default choice
for server-side programmatic access.

```typescript
// API key (most common)
const client = new Knowledge2({ apiKey: "k2_..." });

// Bearer token (OAuth)
const client = new Knowledge2({ bearerToken: "..." });

// Admin token
const client = new Knowledge2({ adminToken: "..." });
```

## Examples

### Create a corpus and ingest documents

```typescript
import { Knowledge2 } from "@knowledge2/sdk";

const client = new Knowledge2({ apiKey: "k2_..." });

// Create a corpus
const corpus = await client.corpora.create("project-id", "My Corpus", "A test corpus");

// Upload a document
await client.documents.upload(corpus!.id, {
  rawText: "Knowledge2 is a retrieval platform.",
  metadata: { source: "example" },
});

// Build indexes (waits for completion by default)
await client.indexes.build(corpus!.id);
```

### Queue-first batch upload

```typescript
const enqueue = await client.documents.uploadBatch(
  corpus!.id,
  [
    {
      sourceUri: "doc://overview",
      rawText: "Knowledge2 builds dense and sparse indexes for hybrid retrieval.",
      metadata: { topic: "overview" },
    },
  ],
  { wait: false },
);

console.log(enqueue.jobId, enqueue.batchId, enqueue.count);

const batch = await client.documents.getBatch(corpus!.id, enqueue.batchId);
console.log(batch.status, batch.docIds);
```

For raw-text batch uploads, `wait: false` returns an enqueue handle with
`jobId`, `batchId`, and `count`. Fetch completion status, final document IDs,
and any per-item errors from `client.documents.getBatch(...)`.

### Optimize retrieval defaults

```typescript
const job = await client.indexes.optimize(corpus!.id, {
  exampleQueries: [
    "how does hybrid retrieval work",
    "what is bm25 tuning",
    "how does rrf combine dense and sparse search",
  ],
  queryCount: 25,
  topK: 10,
  metric: "ndcg",
  wait: false,
});

console.log(job.jobId, job.jobType);
```

`client.indexes.optimize(...)` waits for completion by default. Pass
`wait: false` when you want to enqueue the optimization job and poll it later.

### Search with generation

```typescript
const response = await client.search.generate("corpus-id", {
  query: "What is Knowledge2?",
  topK: 10,
});

console.log(response?.answer);
console.log(response?.usedSources);
```

### Agents and feeds

```typescript
const corpus = await client.corpora.create(
  "project-id",
  "Support Corpus",
  "Knowledge base for the support agent",
);

const agent = await client.agents.create({
  projectId: "project-id",
  corpusId: corpus!.id,
  name: "Support Agent",
  systemPrompt: "Answer using the connected Knowledge2 resources only.",
});

await client.feeds.create({
  projectId: "project-id",
  name: "Support Feed",
  sourceAgentId: agent!.id,
  executionMode: "answer",
});
```

Enterprise capabilities are available through:

- `client.agents`
- `client.feeds`
- `client.pipelineSpecs`
- `client.a2a`

### Pagination

```typescript
const page = await client.corpora.list({ limit: 10, offset: 0 });

for await (const corpus of client.corpora.listAll()) {
  console.log(corpus.name);
}
```

### Error handling

```typescript
import { Knowledge2, NotFoundError, RateLimitError } from "@knowledge2/sdk";

const client = new Knowledge2({ apiKey: "k2_..." });

try {
  await client.corpora.get("nonexistent");
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log("Corpus not found:", err.message);
  } else if (err instanceof RateLimitError) {
    console.log("Rate limited, retry after:", err.retryAfter, "ms");
  }
}
```

Catching feature-gated and quota errors:

```typescript
import {
  FeatureNotEnabledError,
  QuotaExceededError,
} from "@knowledge2/sdk";

try {
  await client.agents.list();
} catch (e) {
  if (e instanceof FeatureNotEnabledError) {
    console.log(`Feature '${e.feature}' not enabled. Visit: ${e.consoleUrl}`);
  } else if (e instanceof QuotaExceededError) {
    console.log(`Quota exceeded: ${e.quota} (${e.current}/${e.limit})`);
    // e.retryable is false — don't retry
  }
}
```

## Configuration

```typescript
const client = new Knowledge2({
  apiKey: "k2_...",
  apiHost: "https://api.knowledge2.ai",  // custom API host
  orgId: "org-123",                        // skip auto-detection
  timeout: 30000,                          // request timeout (ms)
  maxRetries: 3,                           // retry count for transient errors
});
```

## Debug Logging

```typescript
Knowledge2.setDebug(true);
// All requests will be logged to stderr with [K2 SDK] prefix
// Auth headers are automatically redacted
```

## Security Best Practices

- **Never hardcode credentials** — use environment variables or a secrets manager. See [`.env.example`](https://github.com/knowledge2-ai/knowledge2-typescript-sdk/blob/main/.env.example).
- **Always use HTTPS** in production. The SDK warns if a custom `apiHost` uses `http://`.
- **Rotate API keys** regularly with `client.auth.rotateApiKey()`.
- **Handle errors safely** — 5xx error details are automatically sanitized to prevent server info leaks.

For full security guidance, see [SECURITY.md](https://github.com/knowledge2-ai/knowledge2-typescript-sdk/blob/main/SECURITY.md).

## Features

- Zero runtime dependencies (uses Node.js built-in `fetch`)
- Dual ESM/CJS output
- Full TypeScript types with strict mode
- Coverage for core retrieval APIs plus enterprise agents, feeds, pipelines, and A2A
- Automatic retry with exponential backoff for transient errors
- Automatic `snake_case` / `camelCase` conversion
- Job polling with configurable timeout and AbortSignal support
- Async iterator pagination
- Debug logging with credential redaction

## Support

- Issues: [knowledge2-ai/knowledge2-typescript-sdk/issues](https://github.com/knowledge2-ai/knowledge2-typescript-sdk/issues)
- Security: [SECURITY.md](https://github.com/knowledge2-ai/knowledge2-typescript-sdk/blob/main/SECURITY.md)

## License

MIT
