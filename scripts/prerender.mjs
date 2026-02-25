import fs from "node:fs/promises";
import path from "node:path";
import { minify as minifyHtml } from "html-minifier-terser";
import { createServer } from "vite";

const projectRoot = process.cwd();
const outDir = path.resolve(projectRoot, "dist");
const indexHtmlPath = path.join(outDir, "index.html");
const manifestPath = path.join(outDir, ".vite", "manifest.json");

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
    return `<link rel="preload" href="${file}" as="style" crossorigin onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="${file}" crossorigin></noscript>`;
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

function resolveClientEntryChunk(manifest, entryPath) {
  const candidates = [entryPath, `/${entryPath}`];
  for (const key of candidates) {
    const chunk = manifest[key];
    if (chunk?.isEntry) {
      return chunk;
    }
  }

  for (const chunk of Object.values(manifest)) {
    if (chunk?.isEntry && chunk?.src === entryPath) {
      return chunk;
    }
  }

  const htmlEntry = manifest["index.html"];
  if (htmlEntry?.isEntry) {
    return htmlEntry;
  }

  for (const chunk of Object.values(manifest)) {
    if (chunk?.isEntry) {
      return chunk;
    }
  }

  return null;
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
      visit(manifest[imported]);
    }
  }

  visit(entryChunk);
  return files;
}

function applyAssetLinks(html, clientFiles) {
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

        return inferAssetLinkTag(href);
      },
    );
  }

  const seen = new Set();
  let preloadLinks = "";

  for (const file of clientFiles) {
    if (seen.has(file)) continue;
    seen.add(file);

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
  const manifestRaw = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);

  const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");

  if (typeof render !== "function") {
    throw new Error("Expected a render() export from src/entry-server.tsx");
  }

  const appHtml = await render();
  const clientEntryChunk = resolveClientEntryChunk(manifest, "src/main.tsx");
  const clientFiles = clientEntryChunk ? collectClientAssets(manifest, clientEntryChunk) : [];

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
