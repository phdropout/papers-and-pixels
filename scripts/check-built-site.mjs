import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SITE_NAME, SITE_URL } from "../src/site.js";
import { canonicalUrl, siteOrigin, sitemapUrl } from "../src/scripts/seo.js";

// Check actual generated pages, so broken subdirectory links fail before deploy.
const output = resolve("dist");
const base = `/${(process.env.ASTRO_BASE || "").replace(/^\/+|\/+$/g, "")}`.replace(/\/?$/, "/");
const origin = "https://build-check.invalid";
const publicOrigin = siteOrigin(process.env.ASTRO_SITE || SITE_URL);
const sitemap = sitemapUrl(publicOrigin, base);
const canonicals = new Set(), titles = new Set(), descriptions = new Set();
function decode(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt);/g, (entity) => ({ "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">" })[entity]);
}
function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map(([tag]) =>
    Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)])));
}
const pages = readdirSync(output, { recursive: true }).filter((path) => path.endsWith(".html"));
assert(pages.length > 0, "No built pages found");
let links = 0;
for (const page of pages) {
  const html = readFileSync(resolve(output, page), "utf8");
  const pageUrl = new URL(base + page.replace(/index\.html$/, ""), origin);
  const expectedCanonical = canonicalUrl(pageUrl.pathname, publicOrigin, base);
  const linksOnPage = tags(html, "link");
  const canonicalLinks = linksOnPage.filter((tag) => tag.rel === "canonical");
  assert.equal(canonicalLinks.length, 1, `${page}: expected one canonical URL`);
  assert.equal(canonicalLinks[0].href, expectedCanonical, `${page}: wrong canonical URL`);
  canonicals.add(expectedCanonical);
  assert(linksOnPage.some((tag) => tag.rel === "sitemap" && tag.href === sitemap), `${page}: missing sitemap discovery link`);
  const pageTitles = [...html.matchAll(/<title>([\s\S]*?)<\/title>/g)];
  assert.equal(pageTitles.length, 1, `${page}: expected one title`);
  const title = decode(pageTitles[0][1]).trim();
  assert(title.endsWith(` | ${SITE_NAME}`), `${page}: missing site brand in title`);
  assert(!titles.has(title), `${page}: duplicate page title`); titles.add(title);
  const meta = tags(html, "meta");
  const descriptionTags = meta.filter((tag) => tag.name === "description");
  assert.equal(descriptionTags.length, 1, `${page}: expected one description`);
  const description = descriptionTags[0].content?.trim();
  assert(description && !descriptions.has(description), `${page}: missing or duplicate description`); descriptions.add(description);
  assert(meta.some((tag) => tag.property === "og:url" && tag.content === expectedCanonical), `${page}: sharing URL differs from canonical`);
  assert(meta.some((tag) => tag.property === "og:title" && tag.content === title), `${page}: sharing title differs from page title`);
  assert(meta.some((tag) => tag.property === "og:description" && tag.content === description), `${page}: sharing description differs from page description`);
  assert(!meta.some((tag) => tag.name === "robots" && /noindex/i.test(tag.content)), `${page}: public page is marked noindex`);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `${page}: expected one main heading`);
  for (const [, value] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = new URL(value, pageUrl);
    if (url.origin !== origin) continue;
    assert(url.pathname.startsWith(base), `${page}: path escapes deployment base: ${value}`);
    const path = decodeURIComponent(url.pathname.slice(base.length));
    const file = resolve(output, path.endsWith("/") || !path ? `${path}index.html` : path);
    assert(existsSync(file), `${page}: missing link or asset: ${value}`);
    links++;
  }
}
for (const directory of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  assert(readdirSync(resolve(output, "pdfjs", directory)).length > 0, `Missing PDF resources: ${directory}`);
}
const scripts = readdirSync(resolve(output, "_astro")).filter((file) => file.endsWith(".js"));
assert(scripts.some((file) => readFileSync(resolve(output, "_astro", file), "utf8").includes(`${base}pdfjs/`)), "PDF preview URLs must include the deployment base");
const locations = (xml) => [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, value]) => decode(value));
function readSitemap(url) {
  const target = new URL(url);
  assert.equal(target.origin, publicOrigin, "Sitemap points to another origin");
  assert(target.pathname.startsWith(base), "Sitemap escapes deployment base");
  return readFileSync(resolve(output, target.pathname.slice(base.length)), "utf8");
}
const sitemapFiles = locations(readSitemap(sitemap));
assert(sitemapFiles.length > 0, "Sitemap index is empty");
const entries = sitemapFiles.flatMap((url) => locations(readSitemap(url)));
assert.equal(entries.length, new Set(entries).size, "Sitemap repeats a URL");
assert.deepEqual(new Set(entries), canonicals, "Sitemap must contain exactly the preferred page URLs");
const robots = readFileSync(resolve(output, "robots.txt"), "utf8");
assert.deepEqual(robots.trim().split(/\r?\n/), ["User-agent: *", "Allow: /", "", `Sitemap: ${sitemap}`], "robots.txt must contain valid directives and the correct sitemap");
const home = readFileSync(resolve(output, "index.html"), "utf8");
const schema = JSON.parse(home.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)?.[1] || "null");
assert.equal(schema?.["@type"], "WebSite", "Missing homepage website schema");
assert.equal(schema.name, SITE_NAME); assert.equal(schema.url, new URL(base, publicOrigin).href);
console.log(`Verified ${pages.length} pages, ${links} internal references, PDF assets, metadata, and ${entries.length} canonical sitemap URLs under ${base}`);
