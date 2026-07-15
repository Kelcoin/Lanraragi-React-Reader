import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classifyEhGalleryPage, presentEhError } from '../src/lib/ehCommentsState.js';

const accessibleExpunged = `
  <html><head><title>Gallery - E-Hentai Galleries</title></head><body>
    <script>var gid = 4053204; var token = "7f925882bb";</script>
    <div>Visible: No (Expunged)</div>
    <div id="cdiv"><div class="c1">A real comment</div></div>
  </body></html>`;

assert.equal(classifyEhGalleryPage(accessibleExpunged, 200), 'available');
assert.equal(classifyEhGalleryPage('<h1>Gallery Not Available</h1>', 200), 'unavailable');
assert.equal(classifyEhGalleryPage('', 404), 'unavailable');
assert.equal(classifyEhGalleryPage('', 403), 'blocked');

assert.deepEqual(presentEhError('EH_CLOUDFLARE_BLOCK'), {
  title: 'E-Hentai 暂时拒绝访问',
  detail: 'Worker 节点可能触发 Cloudflare 验证或 IP 临时限制。',
  needsCookie: false,
});
assert.deepEqual(presentEhError('EH_REQUIRES_LOGIN'), {
  title: '需要 E-Hentai 登录信息',
  detail: 'Cookie 可能缺失、已过期，或未包含 nw=1。',
  needsCookie: true,
});
const unknown = presentEhError('UNKNOWN_WORKER_ERROR', '  upstream exploded  ');
assert.equal(unknown.title, '无法获取 E-Hentai 评论');
assert.equal(unknown.detail, 'upstream exploded');

const workerSource = fs.readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
assert.match(workerSource, /\/id=\["'\]cdiv\["'\]\/i\.test/, 'Worker should recognize actual cdiv markup');
assert.doesNotMatch(workerSource, /includes\(['"]#cdiv['"]\)/, 'Worker must not look for CSS selector text in HTML');

const componentSource = fs.readFileSync(new URL('../src/components/EhComments.jsx', import.meta.url), 'utf8');
assert.match(componentSource, /presentEhError/, 'component should use canonical error presentations');
assert.match(componentSource, /error\.title/);
assert.match(componentSource, /error\.detail/);
assert.doesNotMatch(componentSource, /function isGalleryUnavailable/, 'classification should have one source of truth');

console.log('EH comments state checks passed');
