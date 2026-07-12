import { getSyncToken, getWorkerUrl } from './worker-config';
import { decorateArchiveRecord, hydrateArchiveRecords, rememberArchiveMetadata } from './archiveMetadataCache';

const LOCAL_HISTORY_KEY = 'lrr_history';
const LOCAL_HIDE_READ_KEY = 'lrr_hide_read';
const REMOTE_HISTORY_CACHE_KEY = 'lrr_history_remote_cache';
const REMOTE_HIDE_READ_CACHE_KEY = 'lrr_hide_read_remote_cache';
const CROP_COVER_KEY = 'lrr_crop_cover';
const ARCHIVE_BROWSE_MODE_KEY = 'lrr_archive_browse_mode';

function remoteConfig() {
  const workerUrl = getWorkerUrl();
  const token = getSyncToken();
  if (!workerUrl || !token) return null;
  return { base: workerUrl.replace(/\/$/, ''), token };
}

export function hasRemoteHistory() {
  return !!remoteConfig();
}

function normalizeHistoryItem(item) {
  const id = String(item?.id || item?.arcid || '').trim();
  if (!id) return null;
  return {
    id,
    page: Number(item.page) || 0,
    time: Number(item.time) || 0,
  };
}

function sortHistoryByTime(list) {
  return (Array.isArray(list) ? list : [])
    .map(normalizeHistoryItem)
    .filter(Boolean)
    .sort((a, b) => (b.time || 0) - (a.time || 0));
}

function safeReadJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function emitHistoryChanged() {
  window.dispatchEvent(new CustomEvent('lrr:history-changed'));
}

function activeHistoryKey() {
  return hasRemoteHistory() ? REMOTE_HISTORY_CACHE_KEY : LOCAL_HISTORY_KEY;
}

function activeHideReadKey() {
  return hasRemoteHistory() ? REMOTE_HIDE_READ_CACHE_KEY : LOCAL_HIDE_READ_KEY;
}

function writeHistoryCache(list, { notify = true } = {}) {
  localStorage.setItem(activeHistoryKey(), JSON.stringify(sortHistoryByTime(list)));
  if (notify) emitHistoryChanged();
}

function writeHideReadCache(v) {
  localStorage.setItem(activeHideReadKey(), v ? '1' : '0');
  emitHistoryChanged();
}

async function workerJson(endpoint, { method = 'GET', body = null } = {}) {
  const cfg = remoteConfig();
  if (!cfg) throw new Error('未配置 Worker');
  const init = {
    method,
    headers: { 'x-sync-token': cfg.token },
  };
  if (body) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(cfg.base + endpoint, init);
  if (!res.ok) throw new Error(`Worker Error: ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function archiveToHistoryItem(archive, page) {
  rememberArchiveMetadata(archive);
  return {
    id: archive.arcid,
    page,
    time: Date.now(),
  };
}

function getStoredHistory() {
  return sortHistoryByTime(safeReadJson(activeHistoryKey(), []));
}

export const getHistory = () => getStoredHistory().map(decorateArchiveRecord).filter(Boolean);

export async function loadHistoryState() {
  const remote = hasRemoteHistory();
  let histories;
  let hideRead;
  let retentionDays = 0;

  if (remote) {
    const data = await workerJson('/history');
    histories = sortHistoryByTime(data?.histories || []);
    hideRead = !!data?.hideRead;
    retentionDays = data?.retentionDays || 0;
    localStorage.setItem(REMOTE_HISTORY_CACHE_KEY, JSON.stringify(histories));
    localStorage.setItem(REMOTE_HIDE_READ_CACHE_KEY, hideRead ? '1' : '0');
  } else {
    histories = getStoredHistory();
    hideRead = getHideRead();
    writeHistoryCache(histories, { notify: false });
  }

  const hydrated = await hydrateArchiveRecords(histories);
  if (hydrated.missingIds.length > 0) await pruneHistoryItems(hydrated.missingIds);
  emitHistoryChanged();
  return { histories: hydrated.items, hideRead, remote, retentionDays };
}

export const saveHistory = async (archive, page) => {
  if (!archive?.arcid) return false;
  const item = archiveToHistoryItem(archive, page);
  const history = getStoredHistory().filter((h) => h.id !== item.id);
  writeHistoryCache([...history, item]);

  if (!hasRemoteHistory()) return true;
  try {
    await workerJson('/history', { method: 'PUT', body: { history: item } });
    return true;
  } catch {
    return false;
  }
};

export const getHideRead = () => localStorage.getItem(activeHideReadKey()) === '1';

export const setHideRead = async (v) => {
  writeHideReadCache(v);
  if (!hasRemoteHistory()) return true;
  try {
    await workerJson('/history', { method: 'PUT', body: { hideRead: !!v } });
    return true;
  } catch {
    return false;
  }
};

export const replaceAllHistory = async (list) => {
  const histories = sortHistoryByTime(list);
  writeHistoryCache(histories);
  if (!hasRemoteHistory()) return true;
  try {
    await workerJson('/history', { method: 'PUT', body: { histories } });
    return true;
  } catch {
    return false;
  }
};

export const removeHistoryItems = async (archiveIds) => {
  const removeSet = new Set((Array.isArray(archiveIds) ? archiveIds : []).filter(Boolean));
  if (removeSet.size === 0) return 0;
  const before = getStoredHistory();
  const next = before.filter((item) => !removeSet.has(item.id));
  const removed = before.length - next.length;
  if (removed === 0) return 0;

  writeHistoryCache(next);
  if (!hasRemoteHistory()) return removed;
  try {
    await workerJson('/history', { method: 'DELETE', body: { ids: Array.from(removeSet) } });
  } catch {}
  return removed;
};

export const removeHistoryItem = async (archiveId) => removeHistoryItems([archiveId]);

export const pruneHistoryItems = async (archiveIds) => {
  const removeSet = new Set((Array.isArray(archiveIds) ? archiveIds : []).filter(Boolean));
  if (removeSet.size === 0) return 0;
  const before = getStoredHistory();
  const next = before.filter((item) => !removeSet.has(item.id));
  const removed = before.length - next.length;
  if (removed === 0) return 0;

  writeHistoryCache(next);
  if (hasRemoteHistory()) {
    try {
      await workerJson('/history', { method: 'DELETE', body: { ids: Array.from(removeSet) } });
    } catch {}
  }
  return removed;
};

export const getCropCover = () => localStorage.getItem(CROP_COVER_KEY) !== '0';

export const setCropCover = (v) => {
  localStorage.setItem(CROP_COVER_KEY, v ? '1' : '0');
};

export const getArchiveBrowseMode = () => localStorage.getItem(ARCHIVE_BROWSE_MODE_KEY) === 'paged' ? 'paged' : 'scroll';

export const setArchiveBrowseMode = (mode) => {
  localStorage.setItem(ARCHIVE_BROWSE_MODE_KEY, mode === 'paged' ? 'paged' : 'scroll');
};
