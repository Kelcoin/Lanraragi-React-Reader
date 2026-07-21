export function getTagSuggestPlacement(rect, viewportWidth, viewportHeight, {
  gap = 6,
  viewportGap = 12,
  maxHeight = 320,
} = {}) {
  const availableWidth = Math.max(0, viewportWidth - viewportGap * 2);
  const width = Math.min(Math.max(0, rect.width), availableWidth);
  const left = Math.max(
    viewportGap,
    Math.min(rect.left, viewportWidth - width - viewportGap),
  );
  const below = Math.max(0, viewportHeight - rect.bottom - gap - viewportGap);
  const above = Math.max(0, rect.top - gap - viewportGap);
  const openAbove = below < 180 && above > below;
  const placement = {
    left,
    width,
    maxHeight: Math.min(maxHeight, openAbove ? above : below),
  };
  if (openAbove) placement.bottom = viewportHeight - rect.top + gap;
  else placement.top = rect.bottom + gap;
  return placement;
}
