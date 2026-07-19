import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import * as cachePolicy from '../src/lib/cachePolicy.js';
import * as imageLoadQueue from '../src/lib/imageLoadQueue.js';
import * as readerLayout from '../src/lib/readerLayout.js';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('reader preloads remote pages as blobs without decoding throwaway images', () => {
  const source = read('src/pages/Reader.jsx');
  assert.match(source, /import \{[^}]*primeImage[^}]*\} from '\.\.\/lib\/imageCache';/s);
  assert.doesNotMatch(source, /function primePageImage|new Image\(\)[\s\S]{0,300}\.decode\(\)/);
  assert.match(source, /primeImage\(normalized/);
});

test('decode window includes current spread and one spread on each side', () => {
  assert.equal(typeof readerLayout.getReaderDecodeWindow, 'function');
  const spreads = readerLayout.buildReaderSpreads({ pageCount: 8, doublePage: true });
  assert.deepEqual(
    readerLayout.getReaderDecodeWindow(spreads, 2).map((spread) => spread.map((unit) => unit.pageIndex)),
    [[1, 2], [3, 4], [5, 6]],
  );
});

test('normal paged reader keeps adjacent decode-window images mounted offscreen', () => {
  const source = read('src/pages/Reader.jsx');
  assert.match(source, /const adjacentDecodePageIndices =/);
  assert.match(source, /adjacentDecodePageIndices\.map\([\s\S]*?<PageImage[\s\S]*?serializedDecode/);
});

test('image decode queue runs one task at a time', async () => {
  assert.equal(typeof imageLoadQueue.createImageDecodeQueue, 'function');
  const queue = imageLoadQueue.createImageDecodeQueue();
  const events = [];
  let releaseFirst;
  const first = queue.schedule('first', async () => {
    events.push('first:start');
    await new Promise((resolve) => { releaseFirst = resolve; });
    events.push('first:end');
  });
  const second = queue.schedule('second', async () => events.push('second:start'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ['first:start']);
  releaseFirst();
  await Promise.all([first.promise, second.promise]);
  assert.deepEqual(events, ['first:start', 'first:end', 'second:start']);
});

test('image decode queue cancels stale queued and active work', async () => {
  const queue = imageLoadQueue.createImageDecodeQueue();
  let activeSignal;
  let staleStarted = false;
  const active = queue.schedule('active', async (signal) => {
    activeSignal = signal;
    await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
  });
  const stale = queue.schedule('stale', async () => { staleStarted = true; });
  await new Promise((resolve) => setImmediate(resolve));
  stale.cancel();
  active.cancel();
  await Promise.allSettled([active.promise, stale.promise]);
  assert.equal(activeSignal.aborted, true);
  assert.equal(staleStarted, false);
});

test('memory image cache policy uses byte budget and oldest-first eviction', () => {
  assert.equal(typeof cachePolicy.resolveMemoryImageCacheBudget, 'function');
  assert.equal(typeof cachePolicy.selectMemoryImageCacheEvictions, 'function');
  assert.equal(cachePolicy.resolveMemoryImageCacheBudget(2), 64 * 1024 ** 2);
  assert.equal(cachePolicy.resolveMemoryImageCacheBudget(8), 192 * 1024 ** 2);
  assert.deepEqual(cachePolicy.selectMemoryImageCacheEvictions([
    { key: 'old', size: 40, lastAccessedAt: 1 },
    { key: 'new', size: 40, lastAccessedAt: 2 },
  ], 50, 100), ['old']);
});
