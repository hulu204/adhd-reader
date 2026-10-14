'use strict';
// Node-only behavioral checks; no GUI browser or third-party test dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
class Element {
  constructor(tag = '') { this.tag = tag; this.value = ''; this.children = []; this.attributes = {}; this.hidden = false; this.style = { setProperty() {} }; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  set textContent(value) { this.children = [String(value)]; }
  get textContent() { return this.children.map(child => typeof child === 'string' ? child : child.textContent).join(''); }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key]; }
  addEventListener() {}
  focus() {}
}
function environment(values = {}) {
  const ids = new Map();
  const messages = [], changes = [];
  const context = vm.createContext({ console, URL, URLSearchParams, Intl, setTimeout, Uint8Array,
    document: { createElement: tag => new Element(tag), createTextNode: text => new Element('text').alsoText(text),
      getElementById: id => { if (!ids.has(id)) ids.set(id, new Element(id)); return ids.get(id); } },
    chrome: { runtime: { getURL: file => `chrome-extension://test/${file}`, onMessage: { addListener: fn => messages.push(fn) } },
      storage: { sync: { get: async defaults => ({ ...defaults, ...values }) }, onChanged: { addListener: fn => changes.push(fn) } } }
  });
  vm.runInContext(read('lib/emphasize.js'), context);
  return { context, ids, messages, changes };
}
Element.prototype.alsoText = function(text) { this.textContent = text; return this; };
function emphasisChecks() {
  const { context } = environment(), api = context.ADHDReader;
  const source = "Focus cafe\u0301, don't العربية 中文 日本語 한글 123 <script>alert(1)</script>";
  const result = api.create(source, { ratio: .45 });
  assert.equal(result.wrapper.textContent, source);
  assert.equal(result.parts[0].bold.textContent, 'Foc');
  assert.equal(result.parts[1].units.length, 4);
  assert.ok(result.parts.every(part => !/[中文日本語한글]/u.test(part.units.join(''))));
  api.update(result.parts, .7); assert.equal(result.wrapper.textContent, source);
  assert.equal(result.parts[0].bold.textContent, 'Focu');
  const target = new Element(); api.render(target, source, { enabled: false });
  assert.equal(target.children[0].tag, 'text'); assert.equal(target.textContent, source);
  assert.equal(api.normalize({ ratio: Infinity, opacity: 0, weight: 999 }).weight, 900);
  assert.equal(api.normalize({ ratio: Infinity, opacity: 0 }).opacity, .4);
}
async function viewerChecks(mode, values = {}) {
  const env = environment(values), { context, ids, messages } = env;
  const fetched = [], worker = {};
  let fallbackCount = 0;
  context.location = { search: mode === 'url' ? '?url=https%3A%2F%2Fexample.com%2Fdocument.pdf' : mode === 'bad-url' ? '?url=javascript%3Aalert(1)' : '' };
  context.GlobalWorkerOptions = worker;
  context.getDocument = () => ({ destroy: async () => {}, promise: Promise.resolve({ numPages: 2, getPage: async number => ({
    getTextContent: async () => ({ items: number === 1 ? [{ str: 'Focus', hasEOL: false }, { str: 'reading', hasEOL: true }] : [] }), cleanup() {}
  }) }) });
  context.chrome.mimeHandler = {
    getStreamInfo: async () => { if (mode !== 'stream') throw new Error('Standalone'); return { originalUrl: 'https://example.com/document.pdf', streamUrl: 'stream:one-use' }; },
    abortAndFallbackToNativeHandler: async () => { fallbackCount++; }
  };
  context.fetch = async (url, options) => { fetched.push({ url, options }); return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) }; };
  const source = read('viewer/pdf.js').replace(/^import .*;\n/, '').replace(/init\(\)\.catch\(/, 'globalThis.finished = init().catch(');
  vm.runInContext(source, context); await context.finished;
  if (mode === 'bad-url') { assert.equal(fetched.length, 0); assert.match(ids.get('status').textContent, /Could not load/); return; }
  if (mode === 'stream' && values.pdfMimeHandler === false) { assert.equal(fallbackCount, 1); assert.equal(fetched.length, 0); return; }
  assert.equal(fetched.length, 1);
  assert.equal(fetched[0].url, mode === 'stream' ? 'stream:one-use' : 'https://example.com/document.pdf');
  if (mode === 'url') assert.equal(fetched[0].options.credentials, 'include');
  assert.equal(ids.get('pages').children.length, 2);
  const article = ids.get('pages').children[0].children[1];
  assert.equal(article.textContent, 'Focus reading');
  assert.match(ids.get('pages').children[1].textContent, /No extractable text/);
  messages[0]({ type: 'adhdr-preview', values: { enabled: false } }, {}, () => {});
  assert.equal(article.children[0].tag, 'text');
  assert.ok(worker.workerSrc.endsWith('pdf.worker.min.mjs'));
  if (mode === 'stream') { await ids.get('fallback').onclick(); assert.equal(fallbackCount, 1); }
}
async function docsChecks() {
  const { context, messages, changes } = environment();
  const body = new Element('body');
  context.document.body = body; context.document.activeElement = new Element('focus');
  context.location = { hostname: 'docs.google.com' };
  let labels = [];
  context.document.querySelectorAll = () => labels.map(text => new Element('rect').alsoLabel(text));
  vm.runInContext(read('content-docs.js'), context);
  await Promise.resolve();
  assert.equal(body.children[0].textContent, 'Focus Reader');
  messages[0]({ type: 'adhdr-docs-open' }, {}, () => {});
  const panel = body.children[1];
  assert.match(panel.children[4].textContent, /copy.*paste/);
  const input = panel.children[5], output = panel.children[6];
  input.value = 'Pasted focus text'; input.oninput(); assert.equal(output.textContent, input.value);
  labels = ['Extracted first line', 'Another line']; panel.children[3].onclick();
  assert.equal(input.value, labels.join('\n')); assert.equal(output.textContent, input.value);
  changes[0]({ enabled: { newValue: false } }, 'sync'); assert.equal(output.children[0].tag, 'text');
  panel.children[2].onclick(); assert.equal(panel.hidden, true);
  messages[0]({ type: 'adhdr-docs-open' }, {}, () => {}); assert.equal(panel.hidden, false);
}
Element.prototype.alsoLabel = function(text) { this.attributes['aria-label'] = text; return this; };
async function backgroundChecks() {
  const events = {}, stored = { pdfMimeHandler: false }, handled = [], opened = [];
  const context = vm.createContext({ console, URL, chrome: {
    commands: { onCommand: { addListener() {} } }, tabs: { create: async options => opened.push(options) },
    runtime: { id: 'test', getURL: file => 'chrome-extension://test/' + file,
      onInstalled: { addListener: fn => { events.install = fn; } }, onStartup: { addListener() {} },
      onMessage: { addListener: fn => { events.message = fn; } } },
    storage: { sync: { get: async () => stored }, onChanged: { addListener: fn => { events.change = fn; } } },
    mimeHandler: { setMimeHandlerOptions: async (type, options) => handled.push({ type, options }) }
  } });
  vm.runInContext(read('background.js'), context);
  await context.syncPdfHandler(); assert.equal(handled[0].options.enabled, false);
  stored.pdfMimeHandler = true; await context.syncPdfHandler(); assert.equal(handled[1].options.enabled, true);
  const send = url => new Promise(resolve => events.message({ type: 'adhdr-open-pdf', url }, { id: 'test' }, resolve));
  assert.equal((await send('https://example.com/test.pdf')).ok, true); assert.equal(opened.length, 1);
  assert.match(opened[0].url, /viewer\/pdf.html\?url=https%3A/);
  assert.equal((await send('javascript:alert(1)')).ok, false); assert.equal(opened.length, 1);
}
function pdfFixture() {
  const stream = 'BT /F1 18 Tf 40 200 Td (Focus reading fixture) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf = '%PDF-1.4\n', offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf));
}
async function pdfExtractionCheck() {
  // Text-only extraction does not call geometry; Node 20 needs this constructor stub.
  globalThis.DOMMatrix = class {};
  if (!Promise.withResolvers) Promise.withResolvers = () => {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
  };
  const pdfjs = await import('../vendor/pdfjs/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', require('node:url').pathToFileURL(__filename)).href;
  const task = pdfjs.getDocument({ data: pdfFixture(), isEvalSupported: false, useSystemFonts: true });
  try {
    const pdf = await task.promise; assert.equal(pdf.numPages, 1);
    const page = await pdf.getPage(1), text = await page.getTextContent();
    assert.equal(text.items.map(item => item.str).join(''), 'Focus reading fixture');
  } finally { await task.destroy(); }
}
async function main() {
  emphasisChecks();
  await viewerChecks('stream'); await viewerChecks('url'); await viewerChecks('bad-url');
  await viewerChecks('stream', { pdfMimeHandler: false });
  await viewerChecks('url', { disabledSites: { 'example.com': true } });
  await pdfExtractionCheck(); await docsChecks(); await backgroundChecks();
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.version, '0.2.0');
  assert.ok(manifest.content_scripts.every(script => script.all_frames === false));
  assert.equal(manifest.mime_types_handler['application/pdf'].handler_url, 'viewer/pdf.html');
  assert.ok(fs.existsSync(path.join(root, 'COMPETITOR-REVIEWS-zh.md')));
  console.log('PASS: shared emphasis, stream/URL reader paths, disabled handler, URL rejection, real bundled PDF extraction, Docs extraction/paste/settings, background MIME toggle, manifest.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
