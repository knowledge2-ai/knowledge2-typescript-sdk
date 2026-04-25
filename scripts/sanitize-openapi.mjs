import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const COMPONENT_REF_RE = /^#\/components\/([^/]+)\/([^/]+)$/;

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectSecuritySchemes(value, sink) {
  if (!Array.isArray(value)) {
    return;
  }

  for (const requirement of value) {
    if (!isPlainObject(requirement)) {
      continue;
    }

    for (const schemeName of Object.keys(requirement)) {
      sink.add(schemeName);
    }
  }
}

function collectRefsAndMetadata(value, refs, securitySchemes, tagNames) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRefsAndMetadata(item, refs, securitySchemes, tagNames);
    }
    return;
  }

  if (!isPlainObject(value)) {
    if (typeof value === "string") {
      const match = value.match(COMPONENT_REF_RE);
      if (match) {
        refs.add(`${match[1]}/${match[2]}`);
      }
    }
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "$ref" && typeof child === "string") {
      const match = child.match(COMPONENT_REF_RE);
      if (match) {
        refs.add(`${match[1]}/${match[2]}`);
      }
    }

    if (key === "security") {
      collectSecuritySchemes(child, securitySchemes);
    }

    if (key === "tags" && Array.isArray(child)) {
      for (const tagName of child) {
        if (typeof tagName === "string") {
          tagNames.add(tagName);
        }
      }
    }

    collectRefsAndMetadata(child, refs, securitySchemes, tagNames);
  }
}

function getComponentEntry(spec, section, name) {
  const components = isPlainObject(spec.components) ? spec.components : null;
  if (!components) {
    return null;
  }

  const sectionEntries = components[section];
  if (!isPlainObject(sectionEntries)) {
    return null;
  }

  const entry = sectionEntries[name];
  return entry === undefined ? null : entry;
}

export function sanitizeOpenApiSpec(spec) {
  if (!isPlainObject(spec)) {
    throw new Error("OpenAPI spec must be a JSON object.");
  }

  const rawPaths = spec.paths;
  if (!isPlainObject(rawPaths)) {
    throw new Error("OpenAPI spec is missing a top-level 'paths' object.");
  }

  const publicPaths = Object.fromEntries(
    Object.entries(rawPaths).filter(([route]) => !route.startsWith("/internal/")),
  );

  const sanitizedSpec = structuredClone(spec);
  sanitizedSpec.paths = publicPaths;
  delete sanitizedSpec.components;

  const referencedComponents = new Set();
  const referencedSecuritySchemes = new Set();
  const usedTags = new Set();
  collectRefsAndMetadata(
    sanitizedSpec,
    referencedComponents,
    referencedSecuritySchemes,
    usedTags,
  );

  const sanitizedComponents = {};
  const componentQueue = [...referencedComponents];
  const seenComponents = new Set();

  while (componentQueue.length > 0) {
    const componentKey = componentQueue.pop();
    if (!componentKey || seenComponents.has(componentKey)) {
      continue;
    }

    seenComponents.add(componentKey);
    const [section, name] = componentKey.split("/", 2);
    const componentEntry = getComponentEntry(spec, section, name);
    if (componentEntry === null) {
      throw new Error(`OpenAPI spec references missing component ${componentKey}.`);
    }

    sanitizedComponents[section] ??= {};
    sanitizedComponents[section][name] = structuredClone(componentEntry);

    collectRefsAndMetadata(
      componentEntry,
      referencedComponents,
      referencedSecuritySchemes,
      usedTags,
    );

    for (const nestedRef of referencedComponents) {
      if (!seenComponents.has(nestedRef)) {
        componentQueue.push(nestedRef);
      }
    }
  }

  if (referencedSecuritySchemes.size > 0) {
    const allSecuritySchemes = isPlainObject(spec.components?.securitySchemes)
      ? spec.components.securitySchemes
      : null;
    if (allSecuritySchemes) {
      for (const schemeName of referencedSecuritySchemes) {
        const scheme = allSecuritySchemes[schemeName];
        if (scheme !== undefined) {
          sanitizedComponents.securitySchemes ??= {};
          sanitizedComponents.securitySchemes[schemeName] = structuredClone(scheme);
        }
      }
    }
  }

  if (Object.keys(sanitizedComponents).length > 0) {
    sanitizedSpec.components = sanitizedComponents;
  }

  if (Array.isArray(spec.tags)) {
    const publicTags = spec.tags.filter(
      (tag) => !isPlainObject(tag) || typeof tag.name !== "string" || usedTags.has(tag.name),
    );
    if (publicTags.length > 0) {
      sanitizedSpec.tags = structuredClone(publicTags);
    } else {
      delete sanitizedSpec.tags;
    }
  }

  return sanitizedSpec;
}

function main(argv) {
  const [inputPath, outputPath] = argv;
  if (!inputPath || !outputPath) {
    console.error("Usage: node ./scripts/sanitize-openapi.mjs <input.json> <output.json>");
    return 1;
  }

  const resolvedInputPath = path.resolve(process.cwd(), inputPath);
  const resolvedOutputPath = path.resolve(process.cwd(), outputPath);
  const rawSpec = JSON.parse(readFileSync(resolvedInputPath, "utf8"));
  const sanitizedSpec = sanitizeOpenApiSpec(rawSpec);

  mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
  writeFileSync(`${resolvedOutputPath}`, `${JSON.stringify(sanitizedSpec, null, 2)}\n`, "utf8");
  return 0;
}

const entrypointPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (entrypointPath === modulePath) {
  process.exitCode = main(process.argv.slice(2));
}
