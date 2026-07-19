import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDedupeSavedResultPayload,
  compactDedupeArchives,
  getDuplicateSelectionDisabledIds,
  normalizeDuplicateSelection,
} from '../src/lib/deduplicate.js';

const groups = [['A', 'B'], ['A', 'C'], ['B', 'C']];

test('duplicate selection keeps one archive in every connected component', () => {
  assert.deepEqual(normalizeDuplicateSelection(groups, ['A', 'B', 'C']), ['A']);
  assert.deepEqual(normalizeDuplicateSelection([['A', 'B'], ['A', 'C']], ['B', 'C']), ['B', 'C']);
});

test('duplicate selection allows at most one archive from each direct group', () => {
  assert.deepEqual(normalizeDuplicateSelection([['A', 'B'], ['A', 'C']], ['A', 'B']), ['A']);
  assert.deepEqual(normalizeDuplicateSelection([['A', 'B'], ['A', 'C']], ['A', 'A']), ['A']);
});

test('duplicate selection exposes candidates that would violate interlocks', () => {
  assert.deepEqual(
    Array.from(getDuplicateSelectionDisabledIds(groups, new Set(['A']))).sort(),
    ['B', 'C'],
  );
  assert.deepEqual(
    Array.from(getDuplicateSelectionDisabledIds([['A', 'B'], ['A', 'C']], new Set(['B']))).sort(),
    ['A'],
  );
});

test('dedupe persistence keeps only visible archives and whitelisted fields', () => {
  const archiveA = { arcid: 'A', title: 'A', tags: 'artist:a', size: 10, pagecount: 2, progress: 1, date_added: 123, unrelated: 'drop-me' };
  const archiveB = { id: 'B', title: 'B', filesize: 20, total: 3, page: 2, extra: { large: true } };
  const compact = compactDedupeArchives([[archiveA, archiveB], [archiveA]]);
  assert.deepEqual(compact, [
    { arcid: 'A', title: 'A', tags: 'artist:a', size: 10, pagecount: 2, progress: 1, date_added: 123 },
    { id: 'B', title: 'B', filesize: 20, total: 3, page: 2 },
  ]);
});

test('dedupe persistence rebuilds the snapshot from remaining groups and removes empty results', () => {
  const archiveA = { arcid: 'A', title: 'A', unrelated: 'drop-me' };
  const archiveB = { arcid: 'B', title: 'B' };
  const archiveC = { arcid: 'C', title: 'C' };
  const payload = createDedupeSavedResultPayload({
    groups: [[archiveA, archiveB]],
    dateRange: { start: '2026-01-01', end: '2026-07-19' },
    status: '已删除 1 个档案',
    lastScanStats: { pairCount: 2 },
    workerWarning: '',
    selectedArchiveIds: new Set(['A', 'C']),
    selectedGroupKeys: new Set(['A|B', 'B|C']),
    savedAt: '2026-07-19T00:00:00.000Z',
  });

  assert.deepEqual(payload.groups, [['A', 'B']]);
  assert.deepEqual(payload.archives, [
    { arcid: 'A', title: 'A' },
    { arcid: 'B', title: 'B' },
  ]);
  assert.deepEqual(payload.selectedArchiveIds, ['A']);
  assert.deepEqual(payload.selectedGroupKeys, ['A|B']);
  assert.equal(createDedupeSavedResultPayload({ groups: [] }), null);
  assert.equal(createDedupeSavedResultPayload({ groups: [[archiveC]] }), null);
});
