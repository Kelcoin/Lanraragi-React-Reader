import assert from 'node:assert/strict';
import {
  getNextThemeMode,
  normalizeThemeMode,
  resolveThemeMode,
} from '../src/lib/theme.js';

assert.equal(normalizeThemeMode('auto'), 'auto');
assert.equal(normalizeThemeMode('dark'), 'dark');
assert.equal(normalizeThemeMode('light'), 'light');
assert.equal(normalizeThemeMode('unknown'), 'auto');
assert.equal(normalizeThemeMode(null), 'auto');

assert.equal(resolveThemeMode('dark', false), 'dark');
assert.equal(resolveThemeMode('light', true), 'light');
assert.equal(resolveThemeMode('auto', true), 'dark');
assert.equal(resolveThemeMode('auto', false), 'light');

assert.equal(getNextThemeMode('auto'), 'dark');
assert.equal(getNextThemeMode('dark'), 'light');
assert.equal(getNextThemeMode('light'), 'auto');
assert.equal(getNextThemeMode('unknown'), 'auto');

console.log('theme self-check passed');
