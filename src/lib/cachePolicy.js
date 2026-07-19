export const CACHE_LIMITS = Object.freeze({ auto: 'auto', mb256: 256 * 1024 ** 2, mb512: 512 * 1024 ** 2, gb1: 1024 ** 3, gb2: 2 * 1024 ** 3 });
export const CACHE_TRIGGER_RATIO = 0.9;
export const CACHE_TARGET_RATIO = 0.75;

export function resolveCacheLimit(mode, quota = 0) {
  if (typeof CACHE_LIMITS[mode] === 'number') return CACHE_LIMITS[mode];
  return Math.max(CACHE_LIMITS.mb256, Math.min(CACHE_LIMITS.gb2, Math.floor((Number(quota) || CACHE_LIMITS.mb256 / 0.2) * 0.2)));
}
export function selectCacheEvictions(entries, limit, protectedKeys = new Set()) {
  const total = entries.reduce((sum, entry) => sum + (entry.size || 0), 0);
  if (total <= limit * CACHE_TRIGGER_RATIO) return [];
  let remaining = total;
  const selected = [];
  const candidates = entries.filter((entry) => !protectedKeys.has(entry.key)).sort((a, b) => (a.lastAccessedAt || 0) - (b.lastAccessedAt || 0));
  for (const entry of candidates) {
    if (remaining <= limit * CACHE_TARGET_RATIO) break;
    selected.push(entry);
    remaining -= entry.size || 0;
  }
  return selected;
}

export function resolveMemoryImageCacheBudget(deviceMemory) {
  const memory = Number(deviceMemory);
  if (Number.isFinite(memory) && memory <= 4) return 64 * 1024 ** 2;
  if (Number.isFinite(memory) && memory >= 8) return 192 * 1024 ** 2;
  return 96 * 1024 ** 2;
}

export function selectMemoryImageCacheEvictions(entries, incomingSize, budget, maxEntries = 64) {
  let bytes = entries.reduce((sum, entry) => sum + (Number(entry.size) || 0), 0);
  let count = entries.length;
  const incoming = Math.max(0, Number(incomingSize) || 0);
  const limit = Math.max(1, Number(budget) || 1);
  const victims = [];
  const oldestFirst = [...entries].sort((a, b) => (a.lastAccessedAt || 0) - (b.lastAccessedAt || 0));
  while (oldestFirst.length && (count + 1 > maxEntries || bytes + incoming > limit)) {
    const victim = oldestFirst.shift();
    victims.push(victim.key);
    bytes -= Number(victim.size) || 0;
    count -= 1;
  }
  return victims;
}
