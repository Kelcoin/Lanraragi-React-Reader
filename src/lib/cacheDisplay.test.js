import test from 'node:test';
import assert from 'node:assert/strict';
import { getCacheUsagePercent } from './cacheDisplay.js';

test('cache usage percent is clamped and rounded', () => {
  assert.equal(getCacheUsagePercent({ bytes: 25, limit: 100 }), 25);
  assert.equal(getCacheUsagePercent({ bytes: 110, limit: 100 }), 100);
  assert.equal(getCacheUsagePercent({ bytes: 10, limit: 0 }), 0);
});
