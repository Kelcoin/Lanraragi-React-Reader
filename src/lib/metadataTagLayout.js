export function metadataTagFontScale(availableWidth, preferredWidth) {
  const available = Math.max(0, Number(availableWidth) || 0);
  const preferred = Math.max(1, Number(preferredWidth) || 1);
  return Math.round(Math.max(0.62, Math.min(1, available / preferred)) * 100) / 100;
}

export function metadataTagReservedWidth(translatedWidth, originalWidth, chromeWidth) {
  if (!Number.isFinite(translatedWidth) || !Number.isFinite(originalWidth)) return null;
  return Math.max(translatedWidth, originalWidth) + chromeWidth;
}
