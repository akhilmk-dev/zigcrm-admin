import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

/**
 * Custom form select with a portal-based dropdown.
 * Pass searchable={true} to show a filter input inside the dropdown.
 *
 * options shape: [{ value, label, color?, avatar? }]
 */
export const FormSelect = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  options = [],
  placeholder = 'Select...',
  error,
  touched,
  required,
  icon,
  disabled = false,
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  const filtered = searchable && search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const selected = options.find(o => String(o.value) === String(value));

  const openDropdown = useCallback(() => {
    if (disabled) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const extraHeight = searchable ? 48 : 0;
      const estimatedDropHeight = Math.min(264, filtered.length * 44 + 8 + extraHeight);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < estimatedDropHeight + 12 && rect.top > estimatedDropHeight;
      setPos({
        top: openUpward ? rect.top - estimatedDropHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    setIsOpen(v => !v);
  }, [disabled, filtered.length, searchable]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    if (!isOpen) setSearch('');
  }, [isOpen, searchable]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        if (onBlur) onBlur({ target: { name } });
      }
    };
    const handleEsc = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    const handleScroll = (e) => {
      // Don't close when scrolling inside the dropdown itself
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, name, onBlur]);

  const handleSelect = (opt) => {
    onChange({ target: { name, value: opt.value } });
    setIsOpen(false);
  };

  const hasError = touched && error;
  const borderColor = hasError ? 'var(--danger)' : isOpen ? 'var(--primary)' : 'var(--border)';

  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)'
        }}>
          {icon && <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>{icon}</span>}
          {label}
          {required && <span style={{ color: 'var(--danger)', marginLeft: '2px' }}>*</span>}
        </label>
      )}

      <button
        type="button"
        ref={triggerRef}
        onClick={openDropdown}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px 36px 10px 12px',
          borderRadius: '8px',
          border: `1.5px solid ${borderColor}`,
          backgroundColor: disabled ? '#f8fafc' : '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          textAlign: 'left',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          position: 'relative',
          boxSizing: 'border-box',
          outline: 'none',
          fontFamily: 'inherit',
          boxShadow: isOpen ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
        }}
      >
        {selected?.color && (
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: selected.color, flexShrink: 0 }} />
        )}
        {selected?.avatar && (
          <span style={{
            width: '22px', height: '22px', borderRadius: '50%',
            backgroundColor: '#dbeafe', display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#1d4ed8', flexShrink: 0
          }}>
            {selected.avatar}
          </span>
        )}
        <span style={{
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: selected ? 'var(--text-main)' : '#94a3b8'
        }}>
          {selected?.label || placeholder}
        </span>
        <span style={{
          position: 'absolute', right: '10px', top: '50%',
          transform: `translateY(-50%) rotate(${isOpen ? 180 : 0}deg)`,
          transition: 'transform 0.2s',
          display: 'flex', color: 'var(--text-muted)', pointerEvents: 'none'
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {hasError && (
        <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>{error}</div>
      )}

      {isOpen && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            width: `${pos.width}px`,
            backgroundColor: '#fff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 12px 36px rgba(15,23,42,0.14)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '264px',
            animation: 'dropdownFade 0.15s ease',
          }}
        >
          {/* Search input */}
          {searchable && (
            <div style={{ padding: '8px 8px 4px', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <svg
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
                >
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 30px',
                    borderRadius: '6px',
                    border: '1.5px solid var(--border)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    backgroundColor: '#f8fafc',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
                No results
              </div>
            ) : filtered.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={opt.value}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
                  style={{
                    padding: '9px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    borderRadius: '7px',
                    backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                    color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                    transition: 'background-color 0.1s',
                    fontWeight: isSelected ? '500' : '400',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {opt.color && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: opt.color, flexShrink: 0 }} />
                  )}
                  {opt.avatar && (
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9',
                      display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '11px', fontWeight: '700',
                      color: isSelected ? '#1d4ed8' : '#475569', flexShrink: 0
                    }}>
                      {opt.avatar}
                    </span>
                  )}
                  <span style={{ flex: 1 }}>{opt.label}</span>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)', flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
