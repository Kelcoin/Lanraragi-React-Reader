import assert from 'node:assert/strict';
import fs from 'node:fs';
import { claimPwaReload, getServiceWorkerVersion } from '../src/lib/pwaReloadGuard.js';

const values = new Map();
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
};

assert.equal(getServiceWorkerVersion('https://reader.test/sw.js?v=1.2.1-abc123'), '1.2.1-abc123');
assert.equal(claimPwaReload(storage, '1.2.1-abc123', 1000), true);
assert.equal(claimPwaReload(storage, '1.2.1-abc123', 2000), false);
assert.equal(claimPwaReload(storage, '1.2.1-def456', 2000), true);
const corruptStorage = { getItem: () => '{broken', setItem: () => {} };
assert.equal(claimPwaReload(corruptStorage, '1.2.1-ghi789', 3000), true);

const swSource = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const installBlock = swSource.slice(swSource.indexOf("self.addEventListener('install'"), swSource.indexOf("self.addEventListener('activate'"));
assert.doesNotMatch(installBlock, /skipWaiting/, 'install must wait for explicit activation');

const mainSource = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
assert.match(mainSource, /hadControllerBeforeRegistration/, 'first controller acquisition must be distinguishable');
assert.match(mainSource, /claimPwaReload/, 'controller changes need a cross-reload guard');

console.log('PWA reload guard checks passed');
