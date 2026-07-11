export function parseTags(value) {
  const seen = new Set();
  return String(value || '').split(',').map(tag => tag.trim()).filter(tag => {
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export function mergeTags(current, incoming) { return parseTags([...current, ...parseTags(incoming)].join(',')); }
export function metadataFingerprint(value = {}) { return JSON.stringify([value.title || '', value.summary || '', parseTags(value.tags).join(',')]); }

export function normalizeMetadataPlugins(list) {
  const source = Array.isArray(list) ? list : (list?.data || list?.plugins || []);
  const seen = new Set();
  return source.map((item, index) => {
    if (typeof item === 'string') return { value: item, label: item };
    const candidates = [item?.namespace, item?.plugin_id, item?.id, item?.plugin, item?.name];
    const rawValue = candidates.find(value => ['string', 'number'].includes(typeof value));
    const value = String(rawValue ?? `plugin-${index}`);
    const label = String(item?.name || item?.label || rawValue || `插件 ${index + 1}`);
    return { value, label };
  }).filter(option => option.value && !seen.has(option.value) && seen.add(option.value));
}
