const FILTER_PRESETS_KEY = 'lrr_filter_presets';

export function readFilterPresets() {
  try {
    const list = JSON.parse(localStorage.getItem(FILTER_PRESETS_KEY) || '[]');
    return Array.isArray(list) ? list.filter(item => item?.name) : [];
  } catch {
    return [];
  }
}

export function writeFilterPresets(list) {
  localStorage.setItem(FILTER_PRESETS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
}

export function saveFilterPreset({ name, query, sortBy = 'date_added', order = 'desc' }) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return readFilterPresets();
  const next = [
    ...readFilterPresets().filter(item => item.name !== trimmed),
    { name: trimmed, query: query || '', sortBy, order },
  ];
  writeFilterPresets(next);
  return next;
}

export function deleteFilterPreset(name) {
  const next = readFilterPresets().filter(item => item.name !== name);
  writeFilterPresets(next);
  return next;
}
