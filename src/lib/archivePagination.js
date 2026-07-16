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

export function getArchiveRowCentering(containerRect, itemRects, columnCount, tolerance = 2) {
  if (!containerRect || !Array.isArray(itemRects) || itemRects.length === 0) {
    return { translations: [] };
  }
  const columns = Math.max(1, Math.floor(Number(columnCount) || 1));
  const usableItems = itemRects
    .map((rect, index) => ({ rect, index }))
    .filter(({ rect }) => rect && Number.isFinite(rect.top) && Number.isFinite(rect.left) && Number.isFinite(rect.right));
  if (usableItems.length === 0) return { translations: [] };

  const containerCenter = containerRect.left + containerRect.width / 2;
  const rows = [];
  usableItems.forEach((item) => {
    const row = rows.find((candidate) => Math.abs(candidate.top - item.rect.top) <= tolerance);
    if (row) row.items.push(item);
    else rows.push({ top: item.rect.top, items: [item] });
  });
  rows.sort((a, b) => a.top - b.top);

  const translations = rows.flatMap(({ items }) => {
    const occupiedColumns = items.reduce(
      (total, { rect }) => total + Math.max(1, Math.min(columns, Math.floor(Number(rect.span) || 1))),
      0,
    );
    if (occupiedColumns >= columns) return [];
    const groupLeft = Math.min(...items.map(({ rect }) => rect.left));
    const groupRight = Math.max(...items.map(({ rect }) => rect.right));
    const offset = Math.round(containerCenter - (groupLeft + groupRight) / 2);
    return items.map(({ index }) => ({ index, offset }));
  });
  return { translations };
}

function getGridColumnCount(grid) {
  const template = getComputedStyle(grid).gridTemplateColumns;
  if (!template || template === 'none') return 1;
  return Math.max(1, template.trim().split(/\s+/).length);
}

function getGridItemSpan(item, columns) {
  const style = getComputedStyle(item);
  const start = Number.parseInt(style.gridColumnStart, 10);
  const end = Number.parseInt(style.gridColumnEnd, 10);
  if (Number.isFinite(start) && end === -1) return Math.max(1, columns - start + 1);
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) return Math.min(columns, end - start);
  const span = `${style.gridColumnStart} ${style.gridColumnEnd}`.match(/span\s+(\d+)/)?.[1];
  if (span) return Math.min(columns, Math.max(1, Number.parseInt(span, 10)));
  return item.classList.contains('is-wide') ? Math.min(2, columns) : 1;
}

export function observeArchiveGridLayout(grid) {
  if (!grid) return () => {};

  let frame = 0;
  const layoutRows = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const items = Array.from(grid.children);
      items.forEach((item) => { item.style.translate = ''; });
      const columns = getGridColumnCount(grid);
      const { translations } = getArchiveRowCentering(
        grid.getBoundingClientRect(),
        items.map((item) => {
          const rect = item.getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            span: getGridItemSpan(item, columns),
          };
        }),
        columns,
      );
      translations.forEach(({ index, offset }) => {
        if (Math.abs(offset) >= 1) items[index].style.translate = `${offset}px 0`;
      });
    });
  };

  const resizeObserver = new ResizeObserver(layoutRows);
  const mutationObserver = new MutationObserver((records) => {
    if (records.some((record) => record.type === 'childList' && record.target === grid)) {
      Array.from(grid.children).forEach((item) => {
        mutationObserver.observe(item, { attributes: true, attributeFilter: ['class'] });
      });
    }
    layoutRows();
  });

  resizeObserver.observe(grid);
  mutationObserver.observe(grid, { childList: true });
  Array.from(grid.children).forEach((item) => {
    mutationObserver.observe(item, { attributes: true, attributeFilter: ['class'] });
  });
  window.addEventListener('resize', layoutRows);
  layoutRows();

  return () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    window.removeEventListener('resize', layoutRows);
    Array.from(grid.children).forEach((item) => { item.style.translate = ''; });
  };
}
