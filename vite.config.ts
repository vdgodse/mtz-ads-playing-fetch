import fs from "node:fs/promises";
import path from "node:path";

import { defineConfig, type Plugin, type ResolvedConfig } from "vite";
import react from "@vitejs/plugin-react";
import { PurgeCSS } from "purgecss";
import { initialLetterBootstrap } from "./src/noImports/initialLetterBootstrap";
import { HISTORY_STORAGE_KEY } from "./src/config/constants";

async function collectFilesRecursive(dirPath: string, matcher: RegExp): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        return collectFilesRecursive(fullPath, matcher);
      }
      return matcher.test(entry.name) ? [fullPath] : [];
    }),
  );

  return nested.flat();
}

function inlineCriticalCssIntoHtml(): Plugin {
  let resolved: ResolvedConfig;

  return {
    name: "inline-critical-css-into-html",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      resolved = config;
    },
    async transformIndexHtml(html) {
      const criticalCssPath = path.join(resolved.root, "src", "styles", "critical.css");

      let criticalCss = "";
      try {
        criticalCss = await fs.readFile(criticalCssPath, "utf8");
      } catch {
        return html;
      }

      return html.replace(
        "</head>",
        `<style data-critical="true">\n${criticalCss}\n</style>\n</head>`,
      );
    },
  };
}

function purgeStylesheets(): Plugin {
  let resolved: ResolvedConfig;

  return {
    name: "purge-stylesheets",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      resolved = config;
    },
    async closeBundle() {
      const outDir = resolved.build.outDir;
      const indexHtmlPath = path.join(outDir, "index.html");

      let html: string;
      try {
        html = await fs.readFile(indexHtmlPath, "utf8");
      } catch {
        // Nothing to do if the build didn't emit an index.html.
        return;
      }

      const base = resolved.base ?? "/";

      const hrefToCssPath = (href: string): string => {
        let relPath = href;
        const qIdx = relPath.indexOf("?");
        if (qIdx >= 0) relPath = relPath.slice(0, qIdx);
        if (relPath.startsWith(base)) relPath = relPath.slice(base.length);
        if (relPath.startsWith("/")) relPath = relPath.slice(1);
        return path.join(outDir, relPath);
      };

      // Find local stylesheet links so we can purge and potentially remove empty files.
      const stylesheetTagRe =
        /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi;
      const stylesheetMatches = Array.from(html.matchAll(stylesheetTagRe));

      const purgeContentFiles = await collectFilesRecursive(outDir, /\.(html|js)$/i);

      for (const match of stylesheetMatches) {
        const fullTag = match[0];
        const href = match[1];
        if (!href) continue;
        if (/^(https?:)?\/\//i.test(href)) continue;

        // Purge unused selectors from non-critical CSS using built output as content.
        const cssFsPath = hrefToCssPath(href);
        let isEmptyAfterPurge = false;
        try {
          const css = await fs.readFile(cssFsPath, "utf8");
          const purgeResult = await new PurgeCSS().purge({
            content: purgeContentFiles,
            css: [{ raw: css }],
            defaultExtractor: (content: string) => content.match(/[A-Za-z0-9-_:/]+/g) ?? [],
            safelist: {
              standard: [
                // Keep common state classes often toggled dynamically.
                /^(is|has|state)-/,
                /^(open|active|visible|hidden)$/,
              ],
            },
          });

          const purgedCss = purgeResult[0]?.css;
          if (typeof purgedCss === "string") {
            const normalized = purgedCss.trim();
            isEmptyAfterPurge = normalized.length === 0;

            if (isEmptyAfterPurge) {
              await fs.rm(cssFsPath).catch(() => undefined);
            } else {
              await fs.writeFile(cssFsPath, purgedCss, "utf8");
            }
          }
        } catch {
          // If purging fails, keep original CSS to avoid broken styles.
        }

        if (isEmptyAfterPurge) {
          html = html.replace(fullTag, "");
        }
      }

      await fs.writeFile(indexHtmlPath, html, "utf8");
    },
  };
}

function injectInitialLetterBootstrapScript(): Plugin {
  return {
    name: "inject-initial-letter-bootstrap-script",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      const initialLetterBootstrapScript = `<script>(${initialLetterBootstrap.toString()})(${JSON.stringify(HISTORY_STORAGE_KEY)});</script>`;

      if (!html.includes("__MTZ_INITIAL_LETTER__")) {
        return html.replace("</body>", `${initialLetterBootstrapScript}</body>`);
      }

      return html;
    },
  };
}

export default defineConfig({
  plugins: [
    react({
      babel: {
        // React Compiler ("React Forget") must run first in Babel plugins.
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    inlineCriticalCssIntoHtml(),
    purgeStylesheets(),
    injectInitialLetterBootstrapScript(),
  ],
  base: "/mtz-ads-playing-fetch/",
});
