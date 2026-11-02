import { SITE_URL } from "../site.js";

const imageToolAliases = new Set(["image-resizer/", "image-compressor/", "image-converter/"]);

export function siteOrigin(value = SITE_URL) {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("The site URL must use HTTP or HTTPS.");
  url.protocol = "https:";
  return url.origin;
}

export function basePath(value = "/") {
  const path = value.replace(/^\/+|\/+$/g, "");
  return path ? `/${path}/` : "/";
}

export function canonicalUrl(pathname, origin = SITE_URL, base = "/") {
  const url = new URL(siteOrigin(origin));
  // Take only the pathname, never a caller's host, query parameters or fragment.
  let path = new URL(pathname, url).pathname.replace(/\/index\.html$/, "/");
  if (!path.endsWith("/") && !path.split("/").at(-1).includes(".")) path += "/";
  const prefix = basePath(base);
  if (path.startsWith(prefix) && imageToolAliases.has(path.slice(prefix.length))) path = prefix + "image-tools/";
  url.pathname = path;
  return url.href;
}

export function sitemapUrl(origin = SITE_URL, base = "/") {
  return new URL(`${basePath(base)}sitemap-index.xml`, siteOrigin(origin)).href;
}

export function includeInSitemap(page, origin = SITE_URL, base = "/") {
  const url = new URL(page);
  return url.pathname.endsWith("/") && url.href === canonicalUrl(url.pathname, origin, base);
}
