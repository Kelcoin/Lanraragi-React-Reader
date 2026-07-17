import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { observeArchiveGridLayout } from '../lib/archivePagination';

const ArchiveGrid = forwardRef(function ArchiveGrid({ className = '', children, ...props }, forwardedRef) {
  const gridRef = useRef(null);
  useImperativeHandle(forwardedRef, () => gridRef.current);
  useLayoutEffect(() => observeArchiveGridLayout(gridRef.current), []);

  return (
    <div ref={gridRef} className={['archive-grid', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
});

export default ArchiveGrid;
