import test from 'node:test';
import assert from 'node:assert/strict';
import { getReaderArchiveListMeta } from './readerArchiveList.js';

test('builds history and watchlist metadata', () => {
  assert.deepEqual(
    getReaderArchiveListMeta({ time: 10, page: 3, total: 12 }, 'history'),
    { timestamp: 10, progress: '3/12' },
  );
  assert.deepEqual(
    getReaderArchiveListMeta({ addedAt: 20 }, 'watchlist'),
    { timestamp: 20, progress: '' },
  );
});
