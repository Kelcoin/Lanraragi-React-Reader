import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/ArchiveSearchBox.jsx', import.meta.url), 'utf8');

test('archive search exposes an accessible preset dropdown button', () => {
  assert.match(source, /archive-search-menu-button/);
  assert.match(source, /aria-expanded=\{showPresets\}/);
  assert.match(source, /aria-controls=\{presetMenuId\}/);
  assert.match(source, /archive-search-chevron/);
  assert.match(source, /id=\{presetMenuId\}/);
});

