import assert from 'node:assert/strict';
import test from 'node:test';
import {basePath, canonicalUrl, includeInSitemap, siteOrigin, sitemapUrl} from '../src/scripts/seo.js';

test('the public origin defaults to the HTTPS custom domain and upgrades HTTP configuration',()=>{
 assert.equal(siteOrigin(),'https://papersandpixels.net');
 assert.equal(siteOrigin('http://papersandpixels.net/old-path/'),'https://papersandpixels.net');
 assert.throws(()=>siteOrigin('file:///tmp/site'));
});
test('canonicals remove tracking parameters and fragments and normalize trailing slashes',()=>{
 assert.equal(canonicalUrl('/merge-pdf?utm_source=test#preview'),'https://papersandpixels.net/merge-pdf/');
 assert.equal(canonicalUrl('/'),'https://papersandpixels.net/');
 assert.equal(canonicalUrl('/pdf-viewer/index.html'),'https://papersandpixels.net/pdf-viewer/');
 assert.equal(canonicalUrl('https://unrelated.example/coloring-studio/?file=private.png'),'https://papersandpixels.net/coloring-studio/');
});
test('alternate Image Tools entry points consolidate to their shared workspace',()=>{
 for(const route of ['image-resizer','image-compressor','image-converter']) {
  assert.equal(canonicalUrl('/'+route+'/'),'https://papersandpixels.net/image-tools/');
  assert.equal(includeInSitemap('https://papersandpixels.net/'+route+'/'),false);
 }
 assert.equal(includeInSitemap('https://papersandpixels.net/image-tools/'),true);
});
test('canonicals and sitemaps consistently respect a deployment subdirectory',()=>{
 assert.equal(basePath('/papers-and-pixels'),'/papers-and-pixels/');
 assert.equal(basePath('/'),'/');
 assert.equal(canonicalUrl('/papers-and-pixels/merge-pdf/','https://example.com','/papers-and-pixels'),'https://example.com/papers-and-pixels/merge-pdf/');
 assert.equal(canonicalUrl('/papers-and-pixels/image-compressor/','https://example.com','/papers-and-pixels/'),'https://example.com/papers-and-pixels/image-tools/');
 assert.equal(sitemapUrl('http://example.com','/papers-and-pixels'),'https://example.com/papers-and-pixels/sitemap-index.xml');
 assert.equal(includeInSitemap('https://example.com/papers-and-pixels/image-converter/','https://example.com','/papers-and-pixels'),false);
 assert.equal(includeInSitemap('https://example.com/papers-and-pixels/','https://example.com','/papers-and-pixels'),true);
});
test('the sitemap includes public HTML routes, not endpoints, tracking variants or alternate origins',()=>{
 assert.equal(includeInSitemap('https://papersandpixels.net/coloring-studio/'),true);
 assert.equal(includeInSitemap('https://papersandpixels.net/robots.txt'),false);
 assert.equal(includeInSitemap('https://papersandpixels.net/image-tools/?utm_source=test'),false);
 assert.equal(includeInSitemap('http://papersandpixels.net/'),false);
 assert.equal(includeInSitemap('https://other.example/'),false);
 assert.equal(sitemapUrl(),'https://papersandpixels.net/sitemap-index.xml');
});
