import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

function clampPosition(x, y) {
  const width = 150;
  const height = 92;
  const gap = 8;
  return {
    left: Math.min(Math.max(gap, x), Math.max(gap, window.innerWidth - width - gap)),
    top: Math.min(Math.max(gap, y), Math.max(gap, window.innerHeight - height - gap)),
  };
}

export default function DedupeArchiveContextMenu({ menu, onClose, onOpenNewTab, onViewThumbnails }) {
  const position = useMemo(() => clampPosition(menu?.x || 0, menu?.y || 0), [menu?.x, menu?.y]);

  useEffect(() => {
    if (!menu) return undefined;
    const close = () => onClose?.();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menu, onClose]);

  if (!menu?.archive) return null;
  const run = (action) => (event) => {
    event.stopPropagation();
    action?.(menu.archive);
    onClose?.();
  };

  return createPortal(
    <div
      role="menu"
      className="archive-context-menu dedupe-archive-context-menu dropdown-animate"
      style={{ left: `${position.left}px`, top: `${position.top}px` }}
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button type="button" role="menuitem" className="archive-context-menu-item" onClick={run(onOpenNewTab)}>
        打开阅读页
      </button>
      <button type="button" role="menuitem" className="archive-context-menu-item" onClick={run(onViewThumbnails)}>
        查看缩略图
      </button>
    </div>,
    document.body,
  );
}
