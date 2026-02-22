import fs from "node:fs/promises";
import path from "node:path";

import { minify as minifyHtml } from "html-minifier-terser";
import { defineConfig, type Plugin, type ResolvedConfig } from "vite";
import react from "@vitejs/plugin-react";
import { PurgeCSS } from "purgecss";

async function collectFilesRecursive(
  dirPath: string,
  matcher: RegExp,
): Promise<string[]> {
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

function inlineCssIntoHtml(): Plugin {
  let resolved: ResolvedConfig;

  return {
    name: "inline-css-into-html",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      resolved = config;
    },
    async transformIndexHtml(html) {
      const criticalCssPath = path.join(resolved.root, "src", "critical.css");

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

      const escapeRegExp = (value: string) =>
        value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const hrefToCssPath = (href: string): string => {
        let relPath = href;
        const qIdx = relPath.indexOf("?");
        if (qIdx >= 0) relPath = relPath.slice(0, qIdx);
        if (relPath.startsWith(base)) relPath = relPath.slice(base.length);
        if (relPath.startsWith("/")) relPath = relPath.slice(1);
        return path.join(outDir, relPath);
      };

      // Convert remaining local stylesheet links to non-blocking preload.
      const stylesheetTagRe =
        /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi;
      const stylesheetMatches = Array.from(html.matchAll(stylesheetTagRe));

      const purgeContentFiles = await collectFilesRecursive(
        outDir,
        /\.(html|js)$/i,
      );

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
            defaultExtractor: (content: string) =>
              content.match(/[A-Za-z0-9-_:/]+/g) ?? [],
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
          continue;
        }

        const escapedHref = escapeRegExp(href);
        const exactTagRe = new RegExp(
          `<link\\s+[^>]*rel=["']stylesheet["'][^>]*href=["']${escapedHref}["'][^>]*>`,
          "i",
        );

        html = html.replace(
          exactTagRe,
          [
            `<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'">`,
            `<noscript><link rel="stylesheet" href="${href}"></noscript>`,
          ].join("\n"),
        );
      }

      // Remove any accidental inline data modulepreload tags.
      html = html.replace(
        /<link\s+[^>]*rel=["']modulepreload["'][^>]*href=["']data:[^"']+["'][^>]*>\s*/gi,
        "",
      );

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
    },
  };
}

export default defineConfig({
  plugins: [react(), inlineCssIntoHtml()],
  base: "/mtz-ads-playing-fetch/",
});
