import type { APIRoute } from "astro";
import { sitemapUrl } from "../scripts/seo.js";

export const GET: APIRoute = () => new Response(
  `User-agent: *
Allow: /

Sitemap: ${sitemapUrl(import.meta.env.SITE, import.meta.env.BASE_URL)}
`,
  { headers: { "Content-Type": "text/plain; charset=utf-8" } },
);
