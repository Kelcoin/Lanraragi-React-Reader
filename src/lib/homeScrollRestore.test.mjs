import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../pages/Home.jsx', import.meta.url), 'utf8');

test('home restores vertical scroll before paint and never retries it', () => {
  assert.match(source, /useLayoutEffect/);
  const verticalStart = source.indexOf('// Restore vertical scroll before first paint');
  const horizontalStart = source.indexOf('// Restore horizontal scrollers after mount');
  assert.ok(verticalStart >= 0 && horizontalStart > verticalStart);
  const vertical = source.slice(verticalStart, horizontalStart);
  const horizontal = source.slice(horizontalStart, source.indexOf('useEffect(() => {', horizontalStart + 20));
  assert.match(vertical, /window\.scrollTo/);
  assert.doesNotMatch(vertical, /requestAnimationFrame/);
  assert.doesNotMatch(horizontal, /window\.scrollTo/);
  assert.doesNotMatch(source, /requestAnimationFrame\(\(\) => \{\s*innerFrame = requestAnimationFrame\(restoreScroll\)/);
});

