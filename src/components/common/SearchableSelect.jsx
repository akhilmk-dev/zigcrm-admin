import React, { useState, useRef, useEffect } from 'react';

/**
 * Custom Searchable Select Component
 * @param {Object} props
 * @param {string} props.label - Field label
 * @param {Array} props.options - Array of { value, label } objects
 * @param {any} props.value - Current selected value
 * @param {Function} props.onChange - Handler for value change (receives event-like object or value)
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.error - Error message
 * @param {boolean} props.touched - Whether field was touched
 * @param {boolean} props.required - Whether field is required
 * @param {string} props.name - Field name for Formik
 */
export const SearchableSelect = ({ 
  label, 
  options = [], 
  value, 
  onChange, 
  onBlur,
  placeholder = 'Select an option', 
  error, 
  touched, 
  required,
  name,
  style = {},
  innerStyle = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        if (onBlur) onBlur({ target: { name } });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [name, onBlur]);

  const filteredOptions = options.filter(opt => 
    String(opt.label).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleSelect = (option) => {
    // Mimic standard event for Formik/generic handlers
    const fakeEvent = {
      target: {
        name,
        value: option.value
      }
    };
    onChange(fakeEvent);
    setIsOpen(false);
  };

  return (
    <div style={{ marginBottom: '16px', position: 'relative', ...style }} ref={containerRef}>
      {label && (
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}

      <div 
        onClick={handleToggle}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 'var(--radius)',
          border: `1px solid ${touched && error ? 'var(--danger)' : 'var(--border)'}`,
          fontSize: '14px',
          backgroundColor: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '41px',
          transition: 'all 0.2s',
          ...innerStyle
        }}
      >
        <span style={{ color: selectedOption ? 'var(--text-main)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          marginTop: '4px',
          zIndex: 70,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
            <input 
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: 'var(--bg-main)'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div style={{ 
            maxHeight: '220px', 
            overflowY: 'auto',
            padding: '4px'
          }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>No matches found</div>
            ) : (
              filteredOptions.map(opt => (
                <div 
                  key={opt.value}
                  onClick={() => handleSelect(opt)}
                  style={{
                    padding: '10px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: value === opt.value ? 'var(--primary-light)' : 'transparent',
                    color: value === opt.value ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: value === opt.value ? '700' : '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (value !== opt.value) e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                  }}
                  onMouseOut={(e) => {
                    if (value !== opt.value) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {touched && error && (
        <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>{error}</div>
      )}
    </div>
  );
};
