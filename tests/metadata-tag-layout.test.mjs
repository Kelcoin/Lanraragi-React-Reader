import assert from 'node:assert/strict';
import test from 'node:test';
import { metadataTagReservedWidth } from '../src/lib/metadataTagLayout.js';

test('unmeasured metadata tags never overwrite a known row width', () => {
  assert.equal(metadataTagReservedWidth(null, null, 57), null);
  assert.equal(metadataTagReservedWidth(120, 80, 57), 177);
  assert.equal(metadataTagReservedWidth(80, 120, 57), 177);
});
