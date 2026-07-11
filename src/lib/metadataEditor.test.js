import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeTags, normalizeMetadataPlugins, parseTags } from './metadataEditor.js';
test('tag input trims and de-duplicates case-insensitively', () => assert.deepEqual(parseTags('artist:a, Artist:A, female:x'), ['artist:a', 'female:x']));
test('plugin tags merge without replacing current tags', () => assert.deepEqual(mergeTags(['artist:a'], 'female:x,artist:a'), ['artist:a', 'female:x']));
test('plugin options use unique API namespaces instead of object strings', () => {
  assert.deepEqual(normalizeMetadataPlugins({ plugins: [{ name: 'A', namespace: 'a' }, { name: 'B', namespace: 'b' }] }), [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }]);
});
