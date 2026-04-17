import { Knowledge2 } from "../src/client.js";

async function main() {
  const baseUrl = requireEnv("K2_BASE_URL");
  const apiKey = requireEnv("K2_API_KEY");
  const jobTimeoutS = parseInt(process.env.K2_SMOKE_JOB_TIMEOUT_S ?? "120", 10);
  const jobTimeoutMs = jobTimeoutS * 1000;

  const client = new Knowledge2({
    apiHost: baseUrl,
    apiKey,
    maxRetries: 2,
    timeout: 30000,
  });

  const tag = `smoke-${Date.now()}`;

  console.log("=== K2 TypeScript SDK Smoke Test ===\n");

  // Step 1: Auth - whoami
  step("1. Verify authentication");
  const whoami = await client.auth.whoami();
  console.log(`  Authenticated as ${whoami.email ?? whoami.userId} (org: ${whoami.orgId})`);

  // Step 2: Create project
  step("2. Create project");
  const project = await client.projects.create(`${tag}-project`);
  const projectId = (project as any).projectId ?? (project as any).id;
  console.log(`  Project: ${projectId}`);

  // Step 3: Create corpus
  step("3. Create corpus");
  const corpus = await client.corpora.create(projectId, `${tag}-corpus`);
  const corpusId = (corpus as any).corpusId ?? (corpus as any).id;
  console.log(`  Corpus: ${corpusId}`);

  // Step 4: Upload documents
  step("4. Upload documents");
  await client.documents.uploadBatch(corpusId, [
    { sourceUri: `inline://${tag}/doc1`, rawText: "The quick brown fox jumps over the lazy dog." },
    { sourceUri: `inline://${tag}/doc2`, rawText: "Machine learning enables computers to learn from data without explicit programming." },
    { sourceUri: `inline://${tag}/doc3`, rawText: "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript." },
  ], { wait: true, timeoutMs: jobTimeoutMs, pollIntervalMs: 2000 });
  console.log("  Uploaded 3 documents");

  // Step 5: Build indexes
  step("5. Build indexes");
  await client.indexes.build(corpusId, { wait: true, pollIntervalMs: 2000, timeoutMs: jobTimeoutMs });
  console.log("  Indexes built successfully");

  // Step 6: Search
  step("6. Search");
  const searchResult = await client.search.query(corpusId, {
    query: "What is TypeScript?",
    topK: 3,
  });
  const resultCount = searchResult?.results?.length ?? 0;
  console.log(`  Got ${resultCount} results`);
  if (resultCount === 0) {
    throw new Error("Search returned no results — expected at least 1");
  }

  // Step 7: Generate (RAG)
  step("7. Generate (RAG)");
  try {
    const genResult = await client.search.generate(corpusId, {
      query: "Summarize TypeScript in one sentence.",
      topK: 3,
    });
    console.log(`  Generated answer: ${(genResult as any)?.answer?.slice(0, 80) ?? "(no answer)"}...`);
  } catch (err: unknown) {
    // Generation may not be available in all environments
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  Generate not available (skipped): ${msg}`);
  }

  // Step 8: List jobs
  step("8. List jobs");
  const jobsPage = await client.jobs.list({ corpusId });
  console.log(`  Found ${jobsPage?.items?.length ?? 0} jobs`);

  // Step 9: Cleanup (best-effort)
  step("9. Cleanup");
  try {
    await client.corpora.delete(corpusId, { force: true });
    console.log("  Corpus deleted");
  } catch {
    console.log("  Corpus cleanup failed (non-fatal)");
  }

  console.log("\n=== Smoke test PASSED ===");
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`ERROR: Required environment variable ${name} is not set.`);
    process.exit(1);
  }
  return val;
}

function step(label: string): void {
  console.log(`\n${label}`);
}

main().catch((err) => {
  console.error("\n=== Smoke test FAILED ===");
  console.error(err);
  process.exit(1);
});
