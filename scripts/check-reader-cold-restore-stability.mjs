import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/pages/Reader.jsx', import.meta.url), 'utf8');

assert.doesNotMatch(source, /正在切换到/, 'Reader loading copy should be mode-agnostic');
assert.match(source, /正在加载第 \$\{normalTargetIndex \+ 1\} 页/);
assert.match(source, /正在加载第 \$\{currentIndex \+ 1\} 页/);
assert.match(source, /readyPageUrlRef/, 'PageImage should remember which page its ready source represents');
assert.match(source, /preserveReadySource/, 'cache-policy relaxation should preserve an already ready image');
assert.ok(
  source.indexOf('readyPageUrlRef.current = pageUrl') < source.indexOf("if (typeof image.decode === 'function')"),
  'loaded source must be protected before a potentially long decode',
);

console.log('Reader cold-restore stability checks passed');
