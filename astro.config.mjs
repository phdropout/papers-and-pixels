// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE_URL } from './src/site.js';
import { siteOrigin, includeInSitemap } from './src/scripts/seo.js';

const origin = siteOrigin(process.env.ASTRO_SITE || SITE_URL);
const base = process.env.ASTRO_BASE || '/';

// https://astro.build/config
export default defineConfig({
  // Pages supplies its configured domain; the public HTTPS domain is the default.
  site: origin,
  base,
  integrations: [sitemap({ filter: (page) => includeInSitemap(page, origin, base) })],
  trailingSlash: 'always',
  vite: {
    optimizeDeps: {
      // Prepare dependencies used by lazy-loaded tools before serving pages.
      // Late discovery can otherwise invalidate a module URL already in use.
      include: ['exifreader', '@pdf-lib/upng', 'libheif-js', 'pdf-lib', 'pdfjs-dist'],
    },
  },
});
