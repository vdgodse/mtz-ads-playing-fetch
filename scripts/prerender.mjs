import fs from "node:fs/promises";
import path from "node:path";

import { createServer } from "vite";

const projectRoot = process.cwd();
const outDir = path.resolve(projectRoot, "dist");
const indexHtmlPath = path.join(outDir, "index.html");

const vite = await createServer({
  root: projectRoot,
  logLevel: "error",
  appType: "custom",
  server: {
    middlewareMode: true,
  },
});

try {
  const template = await fs.readFile(indexHtmlPath, "utf8");
  const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");

  if (typeof render !== "function") {
    throw new Error("Expected a render() export from src/entry-server.tsx");
  }

  const appHtml = await render();
  const rootTagPattern = /<div\s+id=["']root["']\s*>\s*<\/div>/i;

  if (!rootTagPattern.test(template)) {
    throw new Error("Could not find an empty #root container in dist/index.html");
  }

  const html = template.replace(rootTagPattern, `<div id="root">${appHtml}</div>`);
  await fs.writeFile(indexHtmlPath, html, "utf8");
} finally {
  await vite.close();
}
