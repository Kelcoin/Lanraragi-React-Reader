import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('worker CORS allows content-encoding preflight header', () => {
  const source = readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
  assert.match(source, /Access-Control-Allow-Headers['"]:\s*['"][^'"]*content-encoding/i);
});
