// scripts/gen-sitemap.mjs
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === 修改这里：你的站点域名（结尾不要有斜杠） ===
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://docpdfhub.com';

// 扫描这些目录下的 .html 文件
const ROOT_DIR = path.resolve(__dirname, '..');
const SCAN_DIRS = [
  ROOT_DIR,                // 根目录（index.html）
  path.join(ROOT_DIR, 'tools'),
  path.join(ROOT_DIR, 'blog'),
];

// 忽略规则
const IGNORE = new Set([
  '/404.html',
  '/blog/index.html',
]);

// 简单优先级/更新频率规则
function getPriority(urlPath) {
  if (urlPath === '/') return 1.0;
  if (urlPath.startsWith('/tools/')) return 0.8;
  if (urlPath.startsWith('/blog/')) return 0.7;
  return 0.5;
}
function getChangefreq(urlPath) {
  if (urlPath === '/') return 'weekly';
  if (urlPath.startsWith('/blog/')) return 'weekly';
  return 'monthly';
}

async function collectHtmlFiles(dir) {
  const out = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) {
      out.push(...await collectHtmlFiles(full));
    } else if (it.isFile() && it.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

function toUrlPath(absPath) {
  let rel = path.relative(ROOT_DIR, absPath).replace(/\\/g, '/');
  if (!rel.startsWith('/')) rel = '/' + rel;
  // 统一处理 index.html -> /
  if (rel === '/index.html') return '/';
  // 例如 /blog/some-post/index.html -> /blog/some-post/
  rel = rel.replace(/\/index\.html$/i, '/');
  return rel;
}

async function run() {
  const fileSet = new Set();
  for (const d of SCAN_DIRS) {
    try {
      const files = await collectHtmlFiles(d);
      files.forEach(f => fileSet.add(f));
    } catch {}
  }

  const items = [];
  for (const abs of fileSet) {
    const urlPath = toUrlPath(abs);
    if (IGNORE.has(urlPath)) continue;
    // 只收录 /, /tools/, /blog/
    if (!/^\/($|tools\/|blog\/)/.test(urlPath)) continue;

    const stat = await fs.stat(abs);
    const lastmod = stat.mtime.toISOString();
    items.push({ urlPath, lastmod });
  }

  // 按路径排序，首页优先
  items.sort((a, b) => a.urlPath.localeCompare(b.urlPath));

  const urlsXml = items.map(({ urlPath, lastmod }) => {
    const loc = SITE_ORIGIN + urlPath;
    const priority = getPriority(urlPath).toFixed(1);
    const changefreq = getChangefreq(urlPath);
    return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`.trim();
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>
`;

  await fs.writeFile(path.join(ROOT_DIR, 'sitemap.xml'), xml, 'utf8');
  console.log(`[sitemap] generated ${items.length} urls -> /sitemap.xml`);
}

run().catch(err => { console.error(err); process.exit(1); });
