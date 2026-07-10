import { getSyncToken, getWorkerUrl } from './worker-config';

const LOCAL_WATCHLIST_KEY = 'lrr_watchlist';
const REMOTE_WATCHLIST_CACHE_KEY = 'lrr_watchlist_remote_cache';

function remoteConfig() {
  const workerUrl = getWorkerUrl();
  const token = getSyncToken();
  if (!workerUrl || !token) return null;
  return { base: workerUrl.replace(/\/$/, ''), token };
}

export function hasRemoteWatchlist() {
  return !!remoteConfig();
}

function safeReadJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function emitWatchlistChanged() {
  window.dispatchEvent(new CustomEvent('lrr:watchlist-changed'));
}

function activeWatchlistKey() {
  return hasRemoteWatchlist() ? REMOTE_WATCHLIST_CACHE_KEY : LOCAL_WATCHLIST_KEY;
}

function normalizeWatchlistItem(item) {
  const id = item?.id || item?.arcid;
  if (!id) return null;
  return {
    ...item,
    id: String(id),
    arcid: String(id),
    title: item.title || String(id),
    tags: item.tags || '',
    addedAt: Number(item.addedAt) || Date.now(),
  };
}

function sortWatchlist(list) {
  return (Array.isArray(list) ? list : [])
    .map(normalizeWatchlistItem)
    .filter(Boolean)
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

function writeWatchlistCache(list, { notify = true } = {}) {
  localStorage.setItem(activeWatchlistKey(), JSON.stringify(sortWatchlist(list)));
  if (notify) emitWatchlistChanged();
}

async function buildJsonRequest(payload) {
  const text = JSON.stringify(payload);
  const headers = { 'Content-Type': 'application/json' };
  if (text.length < 2048 || typeof CompressionStream === 'undefined') {
    return { headers, body: text };
  }
  try {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    const body = await new Response(stream).blob();
    return { headers: { ...headers, 'Content-Encoding': 'gzip' }, body };
  } catch {
    return { headers, body: text };
  }
}

async function workerJson(endpoint, { method = 'GET', body = null } = {}) {
  const cfg = remoteConfig();
  if (!cfg) throw new Error('未配置 Worker');
  const init = {
    method,
    headers: { 'x-sync-token': cfg.token },
  };
  if (body) {
    const req = await buildJsonRequest(body);
    init.headers = { ...init.headers, ...req.headers };
    init.body = req.body;
  }
  const res = await fetch(cfg.base + endpoint, init);
  if (!res.ok) throw new Error(`Worker Error: ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const getWatchlist = () => sortWatchlist(safeReadJson(activeWatchlistKey(), []));

export async function loadWatchlistState() {
  if (!hasRemoteWatchlist()) return { items: getWatchlist(), remote: false };
  const data = await workerJson('/watchlist');
  const items = sortWatchlist(data?.items || []);
  localStorage.setItem(REMOTE_WATCHLIST_CACHE_KEY, JSON.stringify(items));
  emitWatchlistChanged();
  return { items, remote: true, lastSync: data?.lastSync || 0 };
}

export const addWatchlistItem = async (archive) => {
  const item = normalizeWatchlistItem(archive);
  if (!item) return false;
  item.addedAt = Date.now();
  const next = getWatchlist().filter((entry) => entry.id !== item.id);
  writeWatchlistCache([item, ...next]);
  if (!hasRemoteWatchlist()) return true;
  try {
    await workerJson('/watchlist', { method: 'PUT', body: { item } });
    return true;
  } catch {
    return false;
  }
};

export const removeWatchlistItems = async (archiveIds) => {
  const removeSet = new Set((Array.isArray(archiveIds) ? archiveIds : []).map(String).filter(Boolean));
  if (removeSet.size === 0) return 0;
  const before = getWatchlist();
  const next = before.filter((item) => !removeSet.has(item.id));
  const removed = before.length - next.length;
  if (removed === 0) return 0;
  writeWatchlistCache(next);
  if (hasRemoteWatchlist()) {
    try {
      await workerJson('/watchlist', { method: 'DELETE', body: { ids: Array.from(removeSet) } });
    } catch {}
  }
  return removed;
};

export const removeWatchlistItem = async (archiveId) => removeWatchlistItems([archiveId]);
