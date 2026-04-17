import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const outputPath = path.join(repoRoot, "src", "types", "generated.ts");
const cliPath = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "openapi-typescript.cmd" : "openapi-typescript",
);

if (!existsSync(cliPath)) {
  console.error("openapi-typescript CLI not found. Run 'npm ci' in sdk-ts first.");
  process.exit(1);
}

const explicitSpecPath = process.env.K2_OPENAPI_PATH
  ? path.resolve(process.cwd(), process.env.K2_OPENAPI_PATH)
  : null;
const localSpecPath = path.join(repoRoot, "openapi.json");
const specCandidates = [explicitSpecPath, localSpecPath].filter(Boolean);

let specPath = null;

for (const candidate of specCandidates) {
  if (candidate && existsSync(candidate)) {
    specPath = candidate;
    break;
  }
}

if (!specPath) {
  console.error(
    `OpenAPI spec not found. Set K2_OPENAPI_PATH or place openapi.json in ${repoRoot}.`,
  );
  process.exit(1);
}

const result = spawnSync(cliPath, [specPath, "-o", outputPath], {
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

if (typeof result.status === "number" && result.status !== 0) {
  process.exit(result.status);
}
