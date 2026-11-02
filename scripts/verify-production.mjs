import { chromium } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('app/src/main/assets/editor');
const csp = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'";
const server = http.createServer((request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  const mime = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2':'font/woff2' }[path.extname(file)] ?? 'application/octet-stream';
  fs.readFile(file, (error, data) => { response.writeHead(error ? 404 : 200, { 'Content-Type': mime, 'Content-Security-Policy': csp }); response.end(error ? 'missing' : data); });
}).listen(5180, '127.0.0.1');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('favicon')) errors.push(message.text()); });
  const external = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:5180')) external.push(request.url()); });
  await page.goto('http://127.0.0.1:5180');
  await page.locator('#runButton').click();
  await page.waitForFunction(() => document.querySelector('#executionState').textContent === '실행 완료');
  assert.equal(await page.locator('#climateValue').textContent(), '22°C');
  assert.equal(await page.evaluate(()=>document.fonts.check('500 18px "Asta Sans Variable"')),true);
  assert.match(await page.evaluate(()=>getComputedStyle(document.body).fontFamily),/Asta Sans/);
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  await fs.promises.mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/production-offline.png' });
  console.log('Production bundle: passed; native-equivalent CSP; no external network requests.');
} finally { await browser.close(); server.close(); }
