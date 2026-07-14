import assert from 'node:assert/strict';
import fs from 'node:fs';

const { createImageLoadQueue, IMAGE_LOAD_PRIORITY } = await import('../src/lib/imageLoadQueue.js');

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

{
  const queue = createImageLoadQueue({ maxConcurrent: 3 });
  const first = deferred();
  const current = deferred();
  const starts = [];

  queue.schedule('preload-1', async () => { starts.push('preload-1'); await first.promise; return 1; }, IMAGE_LOAD_PRIORITY.PRELOAD);
  queue.schedule('preload-2', async () => { starts.push('preload-2'); return 2; }, IMAGE_LOAD_PRIORITY.PRELOAD);
  await tick();
  queue.schedule('current', async () => { starts.push('current'); await current.promise; return 3; }, IMAGE_LOAD_PRIORITY.CRITICAL);
  queue.schedule('preload-3', async () => { starts.push('preload-3'); return 4; }, IMAGE_LOAD_PRIORITY.PRELOAD);
  await tick();

  assert.deepEqual(starts, ['preload-1', 'preload-2', 'current'], 'current page must use the reserved slot and block new preloads');
  current.resolve();
  await tick();
  assert.equal(starts.at(-1), 'preload-3');
  first.resolve();
}

{
  const queue = createImageLoadQueue({ maxConcurrent: 2 });
  const blocker = deferred();
  const starts = [];
  queue.schedule('blocker', async () => { starts.push('blocker'); await blocker.promise; }, IMAGE_LOAD_PRIORITY.NORMAL);
  const low = queue.schedule('page', async () => { starts.push('page'); return 'loaded'; }, IMAGE_LOAD_PRIORITY.PRELOAD);
  const promoted = queue.schedule('page', () => { throw new Error('dedupe failed'); }, IMAGE_LOAD_PRIORITY.CRITICAL);
  await tick();

  assert.equal(low, promoted, 'same-key callers must share one promise');
  assert.deepEqual(starts, ['blocker', 'page'], 'queued preload must be promoted when it becomes current');
  assert.equal(await promoted, 'loaded');
  blocker.resolve();
}

{
  const queue = createImageLoadQueue({ maxConcurrent: 3 });
  const activePage = deferred();
  const starts = [];
  const preload = queue.schedule('page', async () => {
    starts.push('page');
    await activePage.promise;
  }, IMAGE_LOAD_PRIORITY.PRELOAD);
  await tick();
  const promoted = queue.schedule('page', () => { throw new Error('dedupe failed'); }, IMAGE_LOAD_PRIORITY.CRITICAL);
  queue.schedule('other-preload', async () => { starts.push('other-preload'); }, IMAGE_LOAD_PRIORITY.PRELOAD);
  await tick();

  assert.equal(preload, promoted, 'an active preload must still deduplicate when it becomes current');
  assert.deepEqual(starts, ['page'], 'an active preload promoted to current must pause new background work');
  activePage.resolve();
  await tick();
  assert.deepEqual(starts, ['page', 'other-preload']);
}

const cacheSource = fs.readFileSync(new URL('../src/lib/imageCache.js', import.meta.url), 'utf8');
const readerSource = fs.readFileSync(new URL('../src/pages/Reader.jsx', import.meta.url), 'utf8');

assert.match(cacheSource, /scheduleImageLoad\([\s\S]*IMAGE_LOAD_PRIORITY/, 'cache reads and primes must share the priority scheduler');
assert.match(readerSource, /pageLoadPhase\.status !== 'ready'[\s\S]*return;/, 'reader must not preload until the current page is ready');
assert.doesNotMatch(readerSource, /const indices = \[currentIndex, \.\.\.getPreloadIndices\(\)\]/, 'current page must not be redundantly primed');
assert.match(readerSource, /IMAGE_LOAD_PRIORITY\.CRITICAL/, 'current page requests must use critical priority');
assert.doesNotMatch(readerSource, /function thumbQueue|const thumbPending/, 'drawer thumbnails must not bypass the global queue through a second pool');
assert.match(readerSource, /getImage\(thumbKey,[\s\S]*getArchiveThumbnail/, 'drawer thumbnail network reads must enter the global queue before fetching');

console.log('image load queue checks passed');
