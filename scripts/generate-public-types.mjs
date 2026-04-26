import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeOpenApiSpec } from "./sanitize-openapi.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const outputPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(repoRoot, "src", "types", "generated.ts");
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
let cleanupDir = null;

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

const sanitizedSpec = sanitizeOpenApiSpec(JSON.parse(readFileSync(specPath, "utf8")));
cleanupDir ??= mkdtempSync(path.join(tmpdir(), "k2-openapi-"));
const sanitizedSpecPath = path.join(cleanupDir, "openapi.public.json");
writeFileSync(sanitizedSpecPath, `${JSON.stringify(sanitizedSpec, null, 2)}\n`, "utf8");

const result = spawnSync(cliPath, [sanitizedSpecPath, "-o", outputPath], {
  stdio: "inherit",
});

if (cleanupDir) {
  rmSync(cleanupDir, { force: true, recursive: true });
}

if (result.error) {
  throw result.error;
}

if (typeof result.status === "number" && result.status !== 0) {
  process.exit(result.status);
}
