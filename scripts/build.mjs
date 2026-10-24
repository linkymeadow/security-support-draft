import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { documentTitle, escapeHtml as h, renderMarkdown } from './markdown.mjs';

const siteRoot = fileURLToPath(new URL('../', import.meta.url));
const repository = 'https://github.com/linkymeadow/security-support-draft';
const siteTitle = '보안 지침에 대한 제안';
const draftText = '보안 지침에 담을 내용을 제안하는 검토·토론용 초안입니다.';
const { values } = parseArgs({ options: {
  'content-dir': { type: 'string', default: process.env.CONTENT_DIR || '../security-support-draft-main' },
  'out-dir': { type: 'string', default: 'dist' },
  'base-path': { type: 'string', default: '/security-support-draft' },
  'site-url': { type: 'string', default: 'https://linkymeadow.github.io/security-support-draft' },
} });
const contentDir = path.resolve(values['content-dir']);
const outDir = path.resolve(values['out-dir']);
const basePath = '/' + values['base-path'].split('/').filter(Boolean).join('/');
const prefix = basePath === '/' ? '' : basePath;
if (prefix && !/^\/[a-zA-Z0-9/_-]+$/.test(prefix)) throw new Error('base-path가 올바르지 않습니다.');
const siteUrl = new URL(values['site-url']);
if (!['https:', 'http:'].includes(siteUrl.protocol) || siteUrl.search || siteUrl.hash || siteUrl.username || siteUrl.password) {
  throw new Error('site-url은 쿼리·인증 정보 없는 HTTP(S) 주소여야 합니다.');
}
if (siteUrl.pathname.replace(/\/$/, '') !== prefix) throw new Error('site-url의 경로와 base-path가 일치해야 합니다.');
const canonicalRoot = siteUrl.origin + prefix;

// dist 외의 경로는 지우거나 덮어쓰지 않는다. 원문과 빌드 소스를 분리한다.
if (outDir !== path.join(siteRoot, 'dist')) throw new Error('출력 폴더는 디자인 저장소 바로 아래 dist여야 합니다.');
if (contentDir === siteRoot || contentDir.startsWith(outDir + path.sep)) throw new Error('문서 원본은 별도 작업 폴더여야 합니다.');
try {
  if ((await fs.lstat(outDir)).isSymbolicLink()) throw new Error('출력 폴더가 심볼릭 링크입니다.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }

async function readDocument(file) {
  const absolute = path.join(contentDir, ...file.split('/'));
  const stat = await fs.lstat(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('일반 Markdown 파일만 게시합니다: ' + file);
  return fs.readFile(absolute, 'utf8');
}

function modificationDate(file) {
  try {
    return execFileSync('git', ['-C', contentDir, 'log', '-1', '--format=%cs', '--', file], { encoding: 'utf8', windowsHide: true }).trim();
  } catch { return ''; }
}

const readme = await readDocument('README.md');
const proposals = [...readme.matchAll(/^\s*-\s+\[([^\]]+)\]\((proposal\/[a-z0-9-]+\.md)\)/gm)]
  .map((match) => ({ file: match[2], label: match[1] }));
if (proposals.length === 0) throw new Error('README에서 제안 문서 목차를 찾지 못했습니다.');
if (new Set(proposals.map((item) => item.file)).size !== proposals.length) throw new Error('README 목차에 중복 문서가 있습니다.');
const sources = ['README.md', ...proposals.map((item) => item.file), 'CONTRIBUTING.md'];
const routes = new Map(sources.map((file) => [file,
  file === 'README.md' ? '/' : file === 'CONTRIBUTING.md' ? '/contributing/' : '/' + file.replace(/\.md$/, '/')
]));
const documents = await Promise.all(sources.map(async (file) => {
  const markdown = file === 'README.md' ? readme : await readDocument(file);
  const rendered = renderMarkdown(markdown, { source: file, routes, basePath: prefix });
  return { file, title: documentTitle(markdown), route: routes.get(file), markdown, ...rendered, date: modificationDate(file) };
}));

function navigation(current) {
  const links = documents.map((doc) => '<li><a href="' + h(prefix + doc.route) + '"' +
    (doc.file === current ? ' aria-current="page"' : '') + '>' + h(doc.file === 'README.md' ? '소개와 전체 목차' : doc.title) + '</a></li>').join('\n');
  return '<nav class="document-nav" aria-label="문서 탐색"><h2 class="nav-heading">문서 목차</h2><ol class="nav-list">' + links + '</ol></nav>';
}

function layout({ title, route, body, file = '', date = '', noindex = false }) {
  const canonical = canonicalRoot + route;
  const nav = navigation(file);
  const sourceUrl = repository + '/blob/main/' + file;
  return [
    '<!doctype html><html lang="ko"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light dark">',
    '<meta name="referrer" content="strict-origin-when-cross-origin">',
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;self&#39;; img-src &#39;self&#39; https: http:; base-uri &#39;none&#39;; form-action &#39;none&#39;">',
    '<title>' + h(title === siteTitle ? title : title + ' · ' + siteTitle) + '</title>',
    '<meta name="description" content="' + h(draftText) + '">',
    noindex ? '<meta name="robots" content="noindex, follow">' : '',
    '<link rel="canonical" href="' + h(canonical) + '">',
    '<meta property="og:type" content="website"><meta property="og:locale" content="ko_KR">',
    '<meta property="og:title" content="' + h(title) + '"><meta property="og:description" content="' + h(draftText) + '">',
    '<meta property="og:url" content="' + h(canonical) + '">',
    '<link rel="stylesheet" href="' + h(prefix) + '/assets/site.css">',
    '</head><body id="top"><a class="skip-link" href="#main-content">본문으로 바로가기</a>',
    '<header class="site-header"><div class="header-inner"><a class="brand" href="' + h(prefix) + '/">' + siteTitle + '</a>',
    '<nav class="header-links" aria-label="참여"><a href="' + repository + '">GitHub</a><a href="' + repository + '/discussions">의견 나누기</a></nav></div></header>',
    '<div class="page-shell"><aside class="sidebar">' + nav + '</aside><main id="main-content" class="content' + (file === 'README.md' ? ' home' : '') + '">',
    '<details class="mobile-menu"><summary>문서 목차</summary>' + nav + '</details>',
    '<div class="document-meta"><span class="draft-label">제안 초안</span>' + (date ? '<time datetime="' + h(date) + '">수정 ' + h(date.replaceAll('-', '.')) + '</time>' : '') + '</div>',
    file !== 'README.md' && !noindex ? '<p class="draft-description">' + draftText + '</p>' : '',
    '<article class="prose">' + body + '</article>',
    file ? '<div class="document-actions"><a href="' + h(sourceUrl) + '">GitHub에서 원문 보기</a><a href="' + repository + '/edit/main/' + h(file) + '">수정 제안</a><a href="#top">맨 위로</a></div>' : '',
    '</main></div><footer class="site-footer"><div class="footer-inner"><p>내용의 정확성·완전성·최신성이나 적용 결과를 보증하지 않습니다.</p><a href="' + h(prefix) + '/#보증-부인">보증 부인</a></div></footer>',
    '</body></html>\n',
  ].join('\n');
}

const output = new Map();
for (const doc of documents) {
  const html = doc.file === 'README.md' ? doc.html.replace(/<ul>([\s\S]*?)<\/ul>/g, (list) => list.includes(prefix + '/proposal/') ? list.replace('<ul>', '<ul class="proposal-list">') : list) : doc.html;
  output.set(doc.route + 'index.html', layout({ ...doc, body: html }));
}
output.set('/404.html', layout({ title: '문서를 찾을 수 없습니다', route: '/404.html', noindex: true,
  body: '<h1>문서를 찾을 수 없습니다.</h1><p>주소가 바뀌었거나 존재하지 않는 문서입니다.</p><p><a href="' + h(prefix) + '/">전체 문서 목차로 이동</a></p>',
}));

// 출력을 쓰기 전에 내부 링크·앵커를 검증해 잘못된 게시 결과를 막는다.
const htmlByRoute = new Map([...output].map(([file, html]) => [file.replace(/index\.html$/, ''), html]));
for (const [file, html] of output) {
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1].replaceAll('&amp;', '&');
    if (href.startsWith('http') || href.startsWith('mailto:') || href.endsWith('.css')) continue;
    const url = new URL(href, 'https://preview.invalid' + prefix + file);
    if (url.pathname !== prefix && !url.pathname.startsWith(prefix + '/')) throw new Error('사이트 경로 밖의 링크: ' + href);
    const targetRoute = url.pathname.slice(prefix.length).replace(/index\.html$/, '') || '/';
    const targetHtml = htmlByRoute.get(targetRoute);
    if (!targetHtml) throw new Error('생성되지 않은 페이지: ' + targetRoute);
    if (url.hash && !targetHtml.includes('id="' + h(decodeURIComponent(url.hash.slice(1))) + '"')) throw new Error('존재하지 않는 문서 위치: ' + href);
  }
}
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(path.join(outDir, 'assets'), { recursive: true });
for (const [file, html] of output) {
  const destination = path.join(outDir, ...file.split('/').filter(Boolean));
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, html, 'utf8');
}
await fs.copyFile(path.join(siteRoot, 'assets/site.css'), path.join(outDir, 'assets/site.css'));
await fs.writeFile(path.join(outDir, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: ' + canonicalRoot + '/sitemap.xml\n');
await fs.writeFile(path.join(outDir, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + documents.map((doc) => '<url><loc>' + h(canonicalRoot + doc.route) + '</loc>' + (doc.date ? '<lastmod>' + doc.date + '</lastmod>' : '') + '</url>').join('\n') + '\n</urlset>\n');
await fs.writeFile(path.join(outDir, '.nojekyll'), '');
console.log('빌드 완료: 문서 ' + documents.length + '개 + 404, ' + outDir);
console.log('문서 원본: ' + contentDir);
