export const ARCHIVE_PAGE_SIZE = 50;
export const ARCHIVE_BROWSE_MODES = {
  scroll: 'scroll',
  paged: 'paged',
};

export function normalizeArchiveBrowseMode(value) {
  return value === ARCHIVE_BROWSE_MODES.paged ? ARCHIVE_BROWSE_MODES.paged : ARCHIVE_BROWSE_MODES.scroll;
}

export function getArchivePageCount(total, pageSize = ARCHIVE_PAGE_SIZE) {
  const count = Number(total);
  if (!Number.isFinite(count) || count <= 0) return 1;
  return Math.max(1, Math.ceil(count / pageSize));
}

export function clampArchivePage(page, total, pageSize = ARCHIVE_PAGE_SIZE) {
  const normalized = Math.max(0, Math.floor(Number(page) || 0));
  if (total === null || total === undefined || total === '' || !Number.isFinite(Number(total))) return normalized;
  return Math.min(normalized, getArchivePageCount(total, pageSize) - 1);
}

export function getArchivePageStart(page, pageSize = ARCHIVE_PAGE_SIZE) {
  return Math.max(0, Math.floor(Number(page) || 0)) * pageSize;
}

export function getSmartArchivePageSize({ columns = 1, rows = 0, preferred = ARCHIVE_PAGE_SIZE, minimum = 1 } = {}) {
  const safeColumns = Math.max(1, Math.floor(Number(columns) || 1));
  const safeMinimum = Math.max(1, Math.floor(Number(minimum) || 1));
  const safePreferred = Math.max(safeColumns, Math.floor(Number(preferred) || ARCHIVE_PAGE_SIZE));
  const byRows = Math.floor(Number(rows) || 0) * safeColumns;
  if (byRows > 0) return Math.max(safeMinimum, byRows);
  return Math.max(safeMinimum, safeColumns, Math.ceil(safePreferred / safeColumns) * safeColumns);
}

export function getArchivePageAfterResize(page, oldSize, newSize) {
  const safeNewSize = Math.max(1, Math.floor(Number(newSize) || 1));
  return Math.floor(getArchivePageStart(page, oldSize) / safeNewSize);
}

export function getLastArchiveRowCentering(containerRect, itemRects, tolerance = 2) {
  if (!containerRect || !Array.isArray(itemRects) || itemRects.length === 0) {
    return { indexes: [], offset: 0 };
  }
  const usableItems = itemRects
    .map((rect, index) => ({ rect, index }))
    .filter(({ rect }) => rect && Number.isFinite(rect.top) && Number.isFinite(rect.left) && Number.isFinite(rect.right));
  if (usableItems.length === 0) return { indexes: [], offset: 0 };

  const lastTop = Math.max(...usableItems.map(({ rect }) => rect.top));
  const lastRow = usableItems.filter(({ rect }) => Math.abs(rect.top - lastTop) <= tolerance);
  const groupLeft = Math.min(...lastRow.map(({ rect }) => rect.left));
  const groupRight = Math.max(...lastRow.map(({ rect }) => rect.right));
  const containerCenter = containerRect.left + containerRect.width / 2;
  const rowCenter = (groupLeft + groupRight) / 2;

  return {
    indexes: lastRow.map(({ index }) => index),
    offset: Math.round(containerCenter - rowCenter),
  };
}
