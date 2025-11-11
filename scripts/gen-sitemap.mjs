// scripts/gen-sitemap.mjs
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1) 站点域名：优先用环境变量，其次默认你的域名
const SITE_URL = (process.env.SITE_URL || 'https://docpdfhub.com').replace(/\/+$/, '');

// 2) 需要扫描的目录（相对项目根目录）
const SCAN_DIRS = ['.', 'blog', 'tools'];

// 3) 忽略的文件/页面（按文件名或相对路径匹配）
const IGNORE = new Set([
  'b.html',
  'ads.txt',              // 非 HTML
  'manifest.webmanifest', // 非 HTML
]);

// 4) 简单的优先级策略
function getPriority(urlPath) {
  if (urlPath === '/') return 1.0;
  if (urlPath.startsWith('/tools/')) return 0.8;
  if (urlPath.startsWith('/blog/')) return 0.7;
  if (urlPath === '/privacy.html') return 0.3;
  return 0.6;
}

function toUrlPath(fromRootFile) {
  // 将本地相对路径转成以 / 开头的 URL path
  let p = fromRootFile.replace(/\\/g, '/');
  if (p === 'index.html') return '/';
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

async function walkHtml(root) {
  const results = [];

  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const abs = path.join(dir, ent.name);
      const rel = path.relative(root, abs);

      if (ent.isDirectory()) {
        await walk(abs);
        continue;
      }
      // 只要 .html
      if (!ent.name.endsWith('.html')) continue;
      if (IGNORE.has(ent.name) || IGNORE.has(rel)) continue;

      const stat = await fsp.stat(abs);
      results.push({
        rel,
        mtime: stat.mtime
      });
    }
  }

  await walk(root);
  return results;
}

function formatDate(d) {
  // YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');

  // 收集所有 .html
  const htmlFiles = [];
  for (const dir of SCAN_DIRS) {
    const abs = path.join(projectRoot, dir);
    if (fs.existsSync(abs)) {
      const items = await walkHtml(projectRoot); // 我们已经递归 root，下面过滤目录
      // 直接跳出循环，因为 walkHtml(root) 已经拿到了所有相对路径
      htmlFiles.push(...items);
      break;
    }
  }

  // 去重（同名相对路径只留一个）
  const map = new Map();
  for (const f of htmlFiles) {
    map.set(f.rel, f);
  }

  const pages = [...map.values()]
    .filter(f => {
      // 仅保留三大目录内或根目录的 html
      const rel = f.rel.replace(/\\/g, '/');
      return (
        rel === 'index.html' ||
        rel === 'privacy.html' ||
        rel.startsWith('blog/') ||
        rel.startsWith('tools/')
      );
    })
    .sort((a, b) => a.rel.localeCompare(b.rel));

  const urls = pages.map(({ rel, mtime }) => {
    const locPath = toUrlPath(rel);
    return {
      loc: `${SITE_URL}${locPath}`,
      lastmod: formatDate(mtime),
      changefreq: 'monthly',
      priority: getPriority(locPath),
    };
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority.toFixed(1)}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  // 写到根目录
  const outRoot = path.join(projectRoot, 'sitemap.xml');
  await fsp.writeFile(outRoot, xml, 'utf8');

  // 如存在 /public，也同步一份（兼容 Vercel Output Directory）
  const publicDir = path.join(projectRoot, 'public');
  if (fs.existsSync(publicDir) && fs.lstatSync(publicDir).isDirectory()) {
    const outPublic = path.join(publicDir, 'sitemap.xml');
    await fsp.writeFile(outPublic, xml, 'utf8');
    console.log(`[sitemap] generated ${urls.length} urls -> /sitemap.xml and /public/sitemap.xml`);
  } else {
    console.log(`[sitemap] generated ${urls.length} urls -> /sitemap.xml`);
  }
}

main().catch(err => {
  console.error('[sitemap] failed:', err);
  process.exit(1);
});
