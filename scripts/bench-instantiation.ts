/**
 * Benchmark: measure Knowledge2 client instantiation time.
 *
 * Target: < 50 ms per instantiation (NFR-5).
 * This script is intended for manual local runs only — not wired into CI.
 *
 * Usage:
 *   npx tsx scripts/bench-instantiation.ts
 */

const ITERATIONS = 1_000;
const THRESHOLD_MS = 50;

async function main() {
  // Dynamic import so we measure the factory call, not module load.
  const { Knowledge2 } = await import("../src/index.js");

  const times: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    new Knowledge2({ apiKey: "k2_bench_key" });
    times.push(performance.now() - start);
  }

  times.sort((a, b) => a - b);
  const avg = times.reduce((s, t) => s + t, 0) / times.length;
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];

  console.log(`Instantiation benchmark (${ITERATIONS} iterations)`);
  console.log(`  avg: ${avg.toFixed(3)} ms`);
  console.log(`  p50: ${p50.toFixed(3)} ms`);
  console.log(`  p95: ${p95.toFixed(3)} ms`);
  console.log(`  p99: ${p99.toFixed(3)} ms`);

  if (p99 > THRESHOLD_MS) {
    console.error(`\nFAIL: p99 (${p99.toFixed(3)} ms) exceeds ${THRESHOLD_MS} ms threshold`);
    process.exit(1);
  }

  console.log(`\nPASS: p99 within ${THRESHOLD_MS} ms threshold`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
