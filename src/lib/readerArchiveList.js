export function getReaderArchiveListMeta(item, type) {
  if (type === 'watchlist') {
    return { timestamp: Number(item?.addedAt) || 0, progress: '' };
  }
  return {
    timestamp: Number(item?.time) || 0,
    progress: `${Number(item?.page) || 0}/${Number(item?.total) || 0}`,
  };
}
