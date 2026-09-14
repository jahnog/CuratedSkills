#!/usr/bin/env node
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, relative, resolve, sep } from 'node:path';
import { ROOT } from './lib/catalog.mjs';

const DOCS_DIR = join(ROOT, 'docs');
const PORT = Number(process.env.PORT || 4173);
const HOST = '127.0.0.1';

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

if (!existsSync(join(DOCS_DIR, 'index.html'))) {
  console.error('Missing docs/index.html — run npm run build first.');
  process.exit(1);
}

function isInsideDocs(filePath) {
  const rel = relative(DOCS_DIR, filePath);
  return rel !== '' && !rel.startsWith(`..${sep}`) && !rel.startsWith('..') && rel !== '..';
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${HOST}:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  if (pathname === '/index.html' || pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = resolve(DOCS_DIR, `.${pathname}`);
  if (!isInsideDocs(filePath) && filePath !== join(DOCS_DIR, 'index.html')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  res.writeHead(200, {
    'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`Serving docs/ at http://${HOST}:${PORT}/`);
});
