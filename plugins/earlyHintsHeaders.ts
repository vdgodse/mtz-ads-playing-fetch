import fs from "node:fs/promises";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

/**
 * Vite plugin that generates a Cloudflare Pages `_headers` file
 * with Early Hints Link headers for resources marked with `data-early-hint`.
 *
 * Usage in source HTML:
 *   <script src="./src/main.tsx" data-early-hint></script>
 *   <link rel="stylesheet" href="./src/styles.css" data-early-hint>
 *   <link rel="preload" href="/fonts/main.woff2" as="font" data-early-hint>
 *
 * @see https://developers.cloudflare.com/pages/configuration/early-hints/
 */
export function earlyHintsHeaders(): Plugin {
  let resolved: ResolvedConfig;

  return {
    name: "early-hints-headers",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      resolved = config;
    },
    async closeBundle() {
      const outDir = resolved.build.outDir;
      const base = resolved.base ?? "/";

      // Read SOURCE index.html (where data-early-hint attributes exist)
      const sourceHtmlPath = path.join(resolved.root, "index.html");
      let sourceHtml: string;
      try {
        sourceHtml = await fs.readFile(sourceHtmlPath, "utf8");
      } catch {
        console.warn("[early-hints-headers] No source index.html found, skipping");
        return;
      }

      // Read manifest to map source entries to built assets
      const manifestPath = path.join(outDir, ".vite", "manifest.json");
      let manifest: Record<string, { file: string; css?: string[] }>;
      try {
        const raw = await fs.readFile(manifestPath, "utf8");
        manifest = JSON.parse(raw);
      } catch {
        console.warn("[early-hints-headers] No manifest found, skipping");
        return;
      }

      const linkHeaders: string[] = [];

      // Find all elements with data-early-hint
      const earlyHintRegex = /<(\w+)[^>]*data-early-hint[^>]*>/gi;

      for (const match of sourceHtml.matchAll(earlyHintRegex)) {
        const tag = match[0];
        const tagName = match[1].toLowerCase();

        // Extract src or href
        const srcMatch = tag.match(/(?:src|href)=["']([^"']+)["']/);
        const url = srcMatch?.[1];
        if (!url) continue;

        // Extract rel and as attributes
        const relMatch = tag.match(/rel=["']([^"']+)["']/);
        const rel = relMatch?.[1];

        const asMatch = tag.match(/\sas=["']([^"']+)["']/);
        const asValue = asMatch?.[1];

        // Resolve URL through manifest if it's a source file
        let resolvedUrl = url;
        if (!url.startsWith("http")) {
          let normalizedUrl = url;
          if (normalizedUrl.startsWith("./")) normalizedUrl = normalizedUrl.slice(2);
          if (normalizedUrl.startsWith("/")) normalizedUrl = normalizedUrl.slice(1);

          const manifestEntry =
            manifest[normalizedUrl] ||
            manifest[`/${normalizedUrl}`] ||
            manifest[`./${normalizedUrl}`];

          // Fallback to index.html entry for main bundle
          const indexEntry = manifest["index.html"];

          if (manifestEntry?.file) {
            resolvedUrl = `${base}${manifestEntry.file}`;
          } else if (indexEntry?.file && tagName === "script") {
            resolvedUrl = `${base}${indexEntry.file}`;
          } else {
            resolvedUrl = url.startsWith("/") ? url : `${base}${url}`;
          }
        }

        // Determine as type and rel for the Link header
        let linkAs: string | undefined = asValue;
        let linkRel = "preload";
        let crossorigin = false;

        if (tagName === "script") {
          const isModule = /type=["']module["']/.test(tag);
          linkAs = "script";
          // Vite adds crossorigin to module scripts, so we must match it
          if (isModule) {
            crossorigin = true;
          }
        } else if (tagName === "link") {
          if (rel === "stylesheet") {
            linkAs = "style";
          } else if (rel === "preconnect") {
            linkRel = "preconnect";
            linkAs = undefined;
          }
          // Check if the link tag has crossorigin
          crossorigin = /\bcrossorigin\b/.test(tag);
        }

        const asPart = linkAs ? `; as=${linkAs}` : "";
        const crossoriginPart = crossorigin ? "; crossorigin" : "";
        linkHeaders.push(`  Link: <${resolvedUrl}>; rel=${linkRel}${asPart}${crossoriginPart}`);
      }

      // Dedupe
      const uniqueHeaders = [...new Set(linkHeaders)];

      if (uniqueHeaders.length === 0) {
        console.log("[early-hints-headers] No data-early-hint resources found, skipping");
        return;
      }

      const headersContent = `/*\n${uniqueHeaders.join("\n")}\n`;

      const headersPath = path.join(outDir, "_headers");
      await fs.writeFile(headersPath, headersContent, "utf8");

      console.log(
        `[early-hints-headers] Generated _headers with ${uniqueHeaders.length} Link header(s)`,
      );
    },
  };
}
