import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMetadataTag, mergeTags, normalizeMetadataPlugins, parseTags } from './metadataEditor.js';
test('tag input trims and de-duplicates case-insensitively', () => assert.deepEqual(parseTags('artist:a, Artist:A, female:x'), ['artist:a', 'female:x']));
test('plugin tags merge without replacing current tags', () => assert.deepEqual(mergeTags(['artist:a'], 'female:x,artist:a'), ['artist:a', 'female:x']));
test('plugin options use unique API namespaces instead of object strings', () => {
  assert.deepEqual(normalizeMetadataPlugins({ plugins: [{ name: 'A', namespace: 'a' }, { name: 'B', namespace: 'b' }] }), [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }]);
});
test('formats technical metadata tags for people', () => {
  assert.match(formatMetadataTag('date_added:1770912980'), /^添加日期：\d{4}年\d+月\d+日$/);
  assert.equal(formatMetadataTag('source:e-hentai.org/g/123/abc'), '来源：e-hentai.org/g/123/abc');
  assert.equal(formatMetadataTag('female:kissing', () => '亲吻'), '亲吻');
});
