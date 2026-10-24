import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  port: { type: 'string', default: '8850' },
  'base-path': { type: 'string', default: '/security-support-draft' },
} });
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const prefix = '/' + values['base-path'].split('/').filter(Boolean).join('/');
const basePath = prefix === '/' ? '' : prefix;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
await fs.access(path.join(root, 'index.html'));
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/' && basePath || url.pathname === basePath) {
      response.writeHead(302, { Location: basePath + '/' }); response.end(); return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const pathname = decodeURIComponent(url.pathname);
    if (!pathname.startsWith(basePath + '/')) throw new Error('Not found');
    let relative = pathname.slice(basePath.length + 1);
    if (relative.split('/').some((part) => part.startsWith('.')) || relative.includes('\\')) throw new Error('Not found');
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const absolute = path.resolve(root, relative);
    if (!absolute.startsWith(root)) throw new Error('Not found');
    const bytes = await fs.readFile(absolute);
    response.writeHead(200, { 'Content-Type': types[path.extname(absolute)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : await fs.readFile(path.join(root, '404.html')));
  }
});
server.listen(Number(values.port), '127.0.0.1', () => console.log('로컬 미리보기: http://127.0.0.1:' + values.port + basePath + '/'));
