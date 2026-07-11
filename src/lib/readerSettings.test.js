import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReaderSettings } from './readerSettings.js';

test('normalizes old and conflicting reader settings', () => {
  const value = normalizeReaderSettings({ readingLayout: 'webtoon', doublePageEnabled: true, splitWidePagesEnabled: true, rotateWidePagesEnabled: true });
  assert.equal(value.doublePageEnabled, false);
  assert.equal(value.rotateWidePagesEnabled, false);
  assert.equal(value.pageIndicatorVisibilityMode, 'auto');
});
test('migrates the old double-page checkbox into reading layout', () => {
  const value = normalizeReaderSettings({ readingLayout: 'single', doublePageEnabled: true });
  assert.equal(value.readingLayout, 'double');
  assert.equal(value.doublePageEnabled, true);
});
