import fs from "node:fs/promises";
import path from "node:path";
import { minify as minifyHtml } from "html-minifier-terser";
import { createServer } from "vite";

const projectRoot = process.cwd();
const outDir = path.resolve(projectRoot, "dist");
const indexHtmlPath = path.join(outDir, "index.html");
const manifestPath = path.join(outDir, ".vite", "manifest.json");
const sourceIndexHtmlPath = path.join(projectRoot, "index.html");

const vite = await createServer({
  root: projectRoot,
  logLevel: "error",
  appType: "custom",
  server: {
    middlewareMode: true,
  },
});

function inferAssetLinkTag(file) {
  const filePath = file.split(/[?#]/, 1)[0] ?? file;

  if (filePath.endsWith(".css")) {
    return `<link rel="preload" href="${file}" as="style" crossorigin onload="this.onload=null;this.rel='stylesheet'">`;
  }

  if (filePath.endsWith(".js")) {
    return `<link rel="modulepreload" href="${file}">`;
  }

  if (filePath.endsWith(".woff2")) {
    return `<link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`;
  }

  if (filePath.endsWith(".woff")) {
    return `<link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`;
  }

  if (filePath.endsWith(".ttf")) {
    return `<link rel="preload" href="${file}" as="font" type="font/ttf" crossorigin>`;
  }

  return "";
}

function parseTagAttributes(tag) {
  const attrs = new Map();
  const attrRegex =
    /([A-Za-z_:][-A-Za-z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  let match;
  while ((match = attrRegex.exec(tag)) !== null) {
    const name = match[1];
    if (!name) continue;

    const lowerName = name.toLowerCase();
    if (lowerName === "script" || lowerName === "link") {
      continue;
    }

    const rawValue = match[2] ?? match[3] ?? match[4];
    attrs.set(lowerName, {
      name,
      hasValue: rawValue !== undefined,
      value: rawValue ?? "",
    });
  }

  return attrs;
}

function serializeAttributes(attributes, omitNames = new Set()) {
  const chunks = [];
  for (const [lowerName, attr] of attributes) {
    if (omitNames.has(lowerName)) {
      continue;
    }

    if (attr.hasValue) {
      chunks.push(`${attr.name}="${attr.value}"`);
    } else {
      chunks.push(attr.name);
    }
  }

  return chunks.join(" ");
}

function collectSourceScriptAttributes(html) {
  const attributesBySrc = new Map();
  const scriptTagPattern = /<script\s+[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(scriptTagPattern)) {
    const fullTag = match[0];
    const src = match[1];
    if (!fullTag || !src) {
      continue;
    }

    const normalizedSrc = normalizeComparableAssetPath(src);
    if (!normalizedSrc) {
      continue;
    }

    const attrs = parseTagAttributes(fullTag);
    attrs.delete("src");
    attrs.delete("type");

    attributesBySrc.set(normalizedSrc, attrs);
  }

  return attributesBySrc;
}

function normalizeComparableAssetPath(filePath) {
  if (!filePath) {
    return "";
  }

  const withoutQuery = filePath.split(/[?#]/, 1)[0] ?? filePath;
  const withoutOrigin = withoutQuery.replace(/^(https?:)?\/\/[^/]+/i, "");
  return withoutOrigin.replace(/^\/+/, "");
}

function isSameAssetPath(leftPath, rightPath) {
  const left = normalizeComparableAssetPath(leftPath);
  const right = normalizeComparableAssetPath(rightPath);

  if (!left || !right) {
    return false;
  }

  return left === right || left.endsWith(`/${right}`) || right.endsWith(`/${left}`);
}

function collectExistingAssetReferences(html) {
  const refs = new Set();

  const tagRefPattern = /<(?:script\s+[^>]*\bsrc|link\s+[^>]*\bhref)=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(tagRefPattern)) {
    const ref = match[1];
    if (!ref) {
      continue;
    }

    refs.add(ref);
  }

  return refs;
}

function applyManagedStylesheetTag(fullTag, href) {
  const attrs = parseTagAttributes(fullTag);
  attrs.set("rel", { name: "rel", hasValue: true, value: "preload" });
  attrs.set("href", { name: "href", hasValue: true, value: href });
  attrs.set("as", { name: "as", hasValue: true, value: "style" });
  attrs.set("onload", {
    name: "onload",
    hasValue: true,
    value: "this.onload=null;this.rel='stylesheet'",
  });

  const preloadLink = `<link ${serializeAttributes(attrs)}>`;

  return `${preloadLink}`;
}

function buildBuiltToSourceScriptMap(sourceToBuiltScriptMap) {
  const builtToSource = new Map();

  for (const [sourcePath, builtPath] of sourceToBuiltScriptMap) {
    const normalizedBuiltPath = normalizeComparableAssetPath(builtPath);
    if (!normalizedBuiltPath || builtToSource.has(normalizedBuiltPath)) {
      continue;
    }

    builtToSource.set(normalizedBuiltPath, sourcePath);
  }

  return builtToSource;
}

function applyScriptCustomAttributes(html, sourceScriptAttributes, builtToSourceScriptMap) {
  if (!sourceScriptAttributes || sourceScriptAttributes.size === 0) {
    return html;
  }

  if (!builtToSourceScriptMap || builtToSourceScriptMap.size === 0) {
    return html;
  }

  return html.replace(/<script\s+[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, (fullTag, src) => {
    const attrs = parseTagAttributes(fullTag);
    const typeAttr = attrs.get("type");
    const isModule = (typeAttr?.value ?? "").toLowerCase() === "module";

    if (!isModule) {
      return fullTag;
    }

    const normalizedSrc = normalizeComparableAssetPath(src);
    const sourcePath = normalizedSrc ? builtToSourceScriptMap.get(normalizedSrc) : null;

    if (!sourcePath) {
      return fullTag;
    }

    const attrsToApply = sourceScriptAttributes.get(sourcePath);
    if (!attrsToApply || attrsToApply.size === 0) {
      return fullTag;
    }

    const existingAttrs = parseTagAttributes(fullTag);
    for (const [name, attr] of attrsToApply) {
      if (!existingAttrs.has(name)) {
        existingAttrs.set(name, attr);
      }
    }

    return `<script ${serializeAttributes(existingAttrs)}>`;
  });
}

function collectLocalSourceModuleScripts(html) {
  const scriptPaths = new Set();
  const scriptTagPattern = /<script\s+[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(scriptTagPattern)) {
    const fullTag = match[0];
    const src = match[1];
    if (!fullTag || !src) {
      continue;
    }

    const attrs = parseTagAttributes(fullTag);
    const typeAttr = attrs.get("type");
    const isModule = (typeAttr?.value ?? "").toLowerCase() === "module";
    if (!isModule) {
      continue;
    }

    if (/^(https?:)?\/\//i.test(src) || src.startsWith("data:")) {
      continue;
    }

    const normalized = normalizeComparableAssetPath(src);
    if (!normalized) {
      continue;
    }

    scriptPaths.add(normalized);
  }

  return scriptPaths;
}

function resolveChunkBySourcePath(manifest, sourcePath) {
  if (!sourcePath) {
    return null;
  }

  const candidates = [sourcePath, `/${sourcePath}`];
  for (const key of candidates) {
    const chunk = manifest[key];
    if (chunk?.file) {
      return chunk;
    }
  }

  for (const chunk of Object.values(manifest)) {
    if (chunk?.src === sourcePath && chunk?.file) {
      return chunk;
    }
  }

  return null;
}

function rewriteSourceModuleScriptSrcs(html, sourceToBuiltScriptMap) {
  if (!sourceToBuiltScriptMap || sourceToBuiltScriptMap.size === 0) {
    return html;
  }

  return html.replace(/<script\s+[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, (fullTag, src) => {
    const attrs = parseTagAttributes(fullTag);
    const typeAttr = attrs.get("type");
    const isModule = (typeAttr?.value ?? "").toLowerCase() === "module";

    if (!isModule) {
      return fullTag;
    }

    const normalizedSrc = normalizeComparableAssetPath(src);
    if (!normalizedSrc) {
      return fullTag;
    }

    const nextSrc = sourceToBuiltScriptMap.get(normalizedSrc);
    if (!nextSrc) {
      return fullTag;
    }

    attrs.set("src", { name: "src", hasValue: true, value: nextSrc });

    return `<script ${serializeAttributes(attrs)}>`;
  });
}

function resolveManifestEntryChunks(manifest) {
  const entries = [];

  const htmlEntry = manifest["index.html"];
  if (htmlEntry?.isEntry) {
    entries.push(htmlEntry);
  }

  for (const chunk of Object.values(manifest)) {
    if (!chunk?.isEntry || entries.includes(chunk)) {
      continue;
    }

    entries.push(chunk);
  }

  return entries;
}

function resolveManifestChunk(manifest, chunkId) {
  if (!chunkId) {
    return null;
  }

  return (
    manifest[chunkId] ?? manifest[`/${chunkId}`] ?? manifest[chunkId.replace(/^\//, "")] ?? null
  );
}

function collectClientAssets(manifest, entryChunk) {
  const files = new Set();
  const visited = new Set();

  function visit(chunk) {
    if (!chunk || visited.has(chunk.file)) {
      return;
    }

    visited.add(chunk.file);

    if (chunk.file) {
      files.add(chunk.file);
    }

    for (const cssFile of chunk.css ?? []) {
      files.add(cssFile);
    }

    for (const assetFile of chunk.assets ?? []) {
      files.add(assetFile);
    }

    for (const imported of chunk.imports ?? []) {
      visit(resolveManifestChunk(manifest, imported));
    }

    for (const dynamicImported of chunk.dynamicImports ?? []) {
      visit(resolveManifestChunk(manifest, dynamicImported));
    }
  }

  visit(entryChunk);
  return files;
}

function collectClientAssetsFromSourceScripts(manifest, sourceScripts) {
  const allFiles = new Set();
  const resolvedChunks = [];

  for (const sourceScript of sourceScripts) {
    const chunk = resolveChunkBySourcePath(manifest, sourceScript);
    if (!chunk || resolvedChunks.includes(chunk)) {
      continue;
    }

    resolvedChunks.push(chunk);
  }

  if (resolvedChunks.length === 0) {
    resolvedChunks.push(...resolveManifestEntryChunks(manifest));
  }

  for (const chunk of resolvedChunks) {
    for (const file of collectClientAssets(manifest, chunk)) {
      allFiles.add(file);
    }
  }

  return allFiles;
}

function normalizeEmittedAssetPath(filePath) {
  if (!filePath || /^(https?:)?\/\//i.test(filePath) || filePath.startsWith("data:")) {
    return null;
  }

  const noQuery = filePath.split(/[?#]/, 1)[0] ?? filePath;
  const normalized = noQuery.replace(/^\/+/, "");
  const assetsMatch = normalized.match(/(^|\/)assets\/[^/]+\.js$/i);

  if (assetsMatch) {
    const idx = normalized.lastIndexOf("assets/");
    return normalized.slice(idx);
  }

  return normalized;
}

async function collectWorkerAssetsFromBuiltScripts(outDirPath, clientFiles) {
  const workerFiles = new Set();
  const scriptFiles = [...clientFiles]
    .map((file) => file.split(/[?#]/, 1)[0] ?? file)
    .filter((filePath) => filePath.endsWith(".js"));

  const workerCtorPatterns = [
    /\bnew\s+(?:Worker|SharedWorker)\s*\(\s*new\s+URL\(\s*["'`]([^"'`]+?\.js(?:\?[^"'`]*)?)["'`]\s*,\s*import\.meta\.url\s*\)/g,
    /\bnew\s+(?:Worker|SharedWorker)\s*\(\s*["'`]([^"'`]+?\.js(?:\?[^"'`]*)?)["'`]/g,
  ];

  for (const scriptFile of scriptFiles) {
    const normalizedScriptPath = normalizeEmittedAssetPath(scriptFile);
    if (!normalizedScriptPath) {
      continue;
    }

    const absScriptPath = path.join(outDirPath, normalizedScriptPath);

    let scriptContent = "";
    try {
      scriptContent = await fs.readFile(absScriptPath, "utf8");
    } catch {
      continue;
    }

    for (const pattern of workerCtorPatterns) {
      for (const match of scriptContent.matchAll(pattern)) {
        const rawWorkerPath = match[1];
        const normalizedWorkerPath = normalizeEmittedAssetPath(rawWorkerPath);
        if (!normalizedWorkerPath) {
          continue;
        }

        workerFiles.add(normalizedWorkerPath);
      }
    }
  }

  return workerFiles;
}

function applyAssetLinks(html, clientFiles) {
  const existingAssetRefs = collectExistingAssetReferences(html);

  const cssFiles = [...clientFiles]
    .map((file) => file.split(/[?#]/, 1)[0] ?? file)
    .filter((filePath) => filePath.endsWith(".css"));

  if (cssFiles.length > 0) {
    html = html.replace(
      /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi,
      (fullTag, href) => {
        if (/^(https?:)?\/\//i.test(href)) {
          return fullTag;
        }

        const hrefPath = href.split(/[?#]/, 1)[0] ?? href;
        const isManagedCss = cssFiles.some(
          (filePath) => hrefPath.endsWith(filePath) || hrefPath.endsWith(`/${filePath}`),
        );

        if (!isManagedCss) {
          return fullTag;
        }

        return applyManagedStylesheetTag(fullTag, href);
      },
    );
  }

  const seen = new Set();
  let preloadLinks = "";

  for (const file of clientFiles) {
    if (seen.has(file)) continue;
    seen.add(file);

    const alreadyReferenced = [...existingAssetRefs].some((ref) => isSameAssetPath(ref, file));
    if (alreadyReferenced) {
      continue;
    }

    const tag = inferAssetLinkTag(file);
    if (!tag) continue;

    const filePath = file.split(/[?#]/, 1)[0] ?? file;

    if (filePath.endsWith(".css")) continue;

    preloadLinks += `${tag}\n`;
  }

  return { html, preloadLinks };
}

try {
  const template = await fs.readFile(indexHtmlPath, "utf8");
  const sourceIndexHtml = await fs.readFile(sourceIndexHtmlPath, "utf8").catch(() => "");
  const manifestRaw = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);
  const sourceModuleScripts = collectLocalSourceModuleScripts(sourceIndexHtml);
  const sourceToBuiltScriptMap = new Map();
  for (const sourceScriptPath of sourceModuleScripts) {
    const chunk = resolveChunkBySourcePath(manifest, sourceScriptPath);
    if (chunk?.file) {
      sourceToBuiltScriptMap.set(sourceScriptPath, chunk.file);
    }
  }
  const builtToSourceScriptMap = buildBuiltToSourceScriptMap(sourceToBuiltScriptMap);
  const sourceScriptAttributes = collectSourceScriptAttributes(sourceIndexHtml);

  const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");

  if (typeof render !== "function") {
    throw new Error("Expected a render() export from src/entry-server.tsx");
  }

  const appHtml = await render();
  const clientFiles = collectClientAssetsFromSourceScripts(manifest, sourceModuleScripts);
  const workerFiles = await collectWorkerAssetsFromBuiltScripts(outDir, clientFiles);

  for (const workerFile of workerFiles) {
    clientFiles.add(workerFile);
  }

  const rootTagPattern = /<div\s+id=["']root["']\s*>\s*<\/div>/i;

  if (!rootTagPattern.test(template)) {
    throw new Error("Could not find an empty #root container in dist/index.html");
  }

  let html = template.replace(rootTagPattern, `<div id="root">${appHtml}</div>`);
  const linkedAssets = applyAssetLinks(html, clientFiles);
  html = linkedAssets.html;
  const { preloadLinks } = linkedAssets;

  if (preloadLinks) {
    html = html.replace("</head>", `${preloadLinks}</head>`);
  }

  html = rewriteSourceModuleScriptSrcs(html, sourceToBuiltScriptMap);
  html = applyScriptCustomAttributes(html, sourceScriptAttributes, builtToSourceScriptMap);

  html = await minifyHtml(html, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    keepClosingSlash: true,
    minifyCSS: true,
    minifyJS: true,
  });

  await fs.writeFile(indexHtmlPath, html, "utf8");
} finally {
  await vite.close();
}
