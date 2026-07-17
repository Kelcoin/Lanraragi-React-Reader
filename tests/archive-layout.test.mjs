import assert from 'node:assert/strict';
import test from 'node:test';
import * as pagination from '../src/lib/archivePagination.js';

const container = { left: 0, width: 640 };

test('centers every incomplete visual row and leaves full rows unchanged', () => {
  assert.equal(typeof pagination.getArchiveRowCentering, 'function');
  const result = pagination.getArchiveRowCentering(container, [
    { top: 0, left: 0, right: 150, span: 1 },
    { top: 0, left: 160, right: 310, span: 1 },
    { top: 300, left: 0, right: 150, span: 1 },
    { top: 300, left: 160, right: 310, span: 1 },
    { top: 300, left: 320, right: 470, span: 1 },
    { top: 300, left: 480, right: 630, span: 1 },
    { top: 600, left: 0, right: 310, span: 2 },
  ], 4);

  assert.deepEqual(result.translations, [
    { index: 0, offset: 165 },
    { index: 1, offset: 165 },
    { index: 6, offset: 165 },
  ]);
});

test('removes centering when scrolling fills a formerly incomplete row', () => {
  assert.equal(typeof pagination.getArchiveRowCentering, 'function');
  const result = pagination.getArchiveRowCentering(container, [
    { top: 0, left: 0, right: 150, span: 1 },
    { top: 0, left: 160, right: 310, span: 1 },
    { top: 0, left: 320, right: 470, span: 1 },
    { top: 0, left: 480, right: 630, span: 1 },
  ], 4);

  assert.deepEqual(result.translations, []);
});
