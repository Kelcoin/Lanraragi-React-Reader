import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const reader = readFileSync(new URL('../pages/Reader.jsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('../components/ArchiveCard.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
const pageImage = reader.slice(reader.indexOf('const PageImage'), reader.indexOf('const ReaderArchiveThumb'));

test('mobile archive titles keep the active theme text color', () => {
  assert.doesNotMatch(card, /isMobile\s*\?\s*\{\s*cursor:\s*'pointer',\s*color:\s*'var\(--accent\)'/);
  assert.match(css, /\.archive-title[\s\S]*-webkit-text-fill-color:\s*var\(--text-main\)/i);
});

test('page image keeps the decoded frame until its replacement is ready', () => {
  assert.doesNotMatch(pageImage, /setImgSrc\(null\)/);
  assert.match(pageImage, /await decoded\.decode/);
  assert.match(css, /\[data-ios="true"\][\s\S]*backface-visibility:\s*hidden/);
});

