import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
const reader = readFileSync(new URL('../pages/Reader.jsx', import.meta.url), 'utf8');
const comments = readFileSync(new URL('../components/EhComments.jsx', import.meta.url), 'utf8');

test('reader theme defines dark and cold porcelain semantic tokens', () => {
  for (const token of [
    '--reader-toolbar-bg', '--reader-control-bg', '--reader-control-border',
    '--reader-control-text', '--reader-stage-bg', '--reader-panel-bg',
    '--reader-skeleton-base', '--comment-card-bg', '--comment-input-bg',
  ]) {
    assert.ok(css.includes(token), `missing ${token}`);
  }
  assert.match(css, /:root\[data-theme="light"\][\s\S]*--reader-toolbar-bg/);
});

test('reader and EH comments use semantic theme classes', () => {
  assert.match(reader, /className="reader-root"/);
  assert.match(reader, /className="reader-toolbar"/);
  assert.match(reader, /className="reader-page-nav-button"/);
  assert.match(comments, /className="eh-comments\b/);
  assert.doesNotMatch(reader, /background: 'rgba\(15, 18, 25, 0\.9\)'/);
  assert.doesNotMatch(css, /transition:\s*all\b/);
});
