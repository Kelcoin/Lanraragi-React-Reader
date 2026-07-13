import React, { useCallback, useId, useRef, useState } from 'react';
import TagSuggest from './TagSuggest';
import { replaceCurrentArchiveSearchToken } from '../lib/archiveSearch';
import { deleteFilterPreset, readFilterPresets, saveFilterPreset } from '../lib/filterPresets';

export default function ArchiveSearchBox({ query, setQuery, placeholder }) {
  const searchBoxRef = useRef(null);
  const suggestActiveRef = useRef(false);
  const [presets, setPresets] = useState(readFilterPresets);
  const [showPresets, setShowPresets] = useState(false);
  const presetMenuId = useId();

  const handleTagSelect = useCallback((tag) => {
    suggestActiveRef.current = false;
    setQuery(value => replaceCurrentArchiveSearchToken(value, tag));
    setTimeout(() => searchBoxRef.current?.querySelector('input')?.focus(), 50);
  }, [setQuery]);

  const savePreset = useCallback(() => {
    const name = prompt('为当前筛选方案命名:');
    if (!name || !name.trim()) return;
    setPresets(saveFilterPreset({ name, query }));
    setShowPresets(false);
  }, [query]);

  return (
    <div className="archive-search-wrap" ref={searchBoxRef}>
      <div className="archive-search-row">
        <div className="archive-search-input-wrap">
          <input
            className="input-glass"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !suggestActiveRef.current) event.currentTarget.blur();
            }}
            placeholder={placeholder}
            style={{ padding: '10px 38px 10px 12px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
          />
          {query && (
            <button
              type="button"
              className="input-clear-btn"
              onClick={() => setQuery('')}
              style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)' }}
              aria-label="清空搜索"
            >
              ×
            </button>
          )}
          <TagSuggest inputValue={query} onSelectTag={handleTagSelect} containerRef={searchBoxRef} onSetActive={(active) => { suggestActiveRef.current = active; }} />
        </div>
        <button
          type="button"
          className="btn archive-search-menu-button"
          onClick={() => setShowPresets(v => !v)}
          aria-expanded={showPresets}
          aria-controls={presetMenuId}
          aria-label={showPresets ? '收起筛选方案' : '展开筛选方案'}
        >
          <span className="archive-search-menu-label">筛选方案</span>
          <svg className="archive-search-chevron" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M3.5 6l4.5 4 4.5-4z" />
          </svg>
        </button>
      </div>
      {showPresets && (
        <div className="archive-search-presets dropdown-animate" id={presetMenuId}>
          <div className="archive-search-preset-actions">
            <button type="button" className="btn" onClick={savePreset}>保存当前方案</button>
            <button type="button" className="btn" onClick={() => { setQuery(''); setShowPresets(false); }}>清空筛选</button>
          </div>
          {presets.length > 0 ? presets.map(preset => (
            <div key={preset.name} className="archive-search-preset-row">
              <button type="button" onClick={() => { setQuery(preset.query || ''); setShowPresets(false); }} title={preset.query || preset.name}>
                {preset.name}
              </button>
              <button type="button" aria-label={`删除 ${preset.name}`} onClick={() => setPresets(deleteFilterPreset(preset.name))}>×</button>
            </div>
          )) : (
            <div className="archive-search-empty">暂无筛选方案</div>
          )}
        </div>
      )}
    </div>
  );
}
