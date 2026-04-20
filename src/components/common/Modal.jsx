import React from 'react';

export const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>{title}</h3>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px', 
              color: 'var(--text-muted)', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const Button = ({ children, onClick, type = 'primary', size = 'md', disabled = false, danger = false }) => {
  const baseStyles = {
    borderRadius: 'var(--radius)',
    fontWeight: '600',
    border: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s'
  };

  const types = {
    primary: { backgroundColor: 'var(--primary)', color: '#fff' },
    secondary: { backgroundColor: '#fff', color: 'var(--text-main)', border: '1px solid var(--border)' },
    ghost: { backgroundColor: 'transparent', color: 'var(--text-main)' },
    danger: { backgroundColor: 'var(--danger)', color: '#fff' }
  };

  const sizes = {
    sm: { padding: '6px 12px', fontSize: '12px' },
    md: { padding: '10px 18px', fontSize: '14px' },
    lg: { padding: '12px 24px', fontSize: '16px' }
  };

  const selectedType = types[type] || types.primary;
  const selectedSize = sizes[size] || sizes.md;

  return (
    <button 
      onClick={!disabled ? onClick : undefined}
      style={{ ...baseStyles, ...selectedType, ...selectedSize }}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const Input = ({ label, error, touched, required, ...props }) => {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <input 
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 'var(--radius)',
          border: `1px solid ${touched && error ? 'var(--danger)' : 'var(--border)'}`,
          fontSize: '14px',
          outline: 'none',
          backgroundColor: '#fff',
          transition: 'border-color 0.2s'
        }}
        onFocus={(e) => {
          if (!(touched && error)) e.target.style.borderColor = 'var(--primary)';
        }}
        onBlur={(e) => {
          if (!(touched && error)) e.target.style.borderColor = 'var(--border)';
        }}
        {...props}
      />
      {touched && error && (
        <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>{error}</div>
      )}
    </div>
  );
};

export const Select = ({ label, error, touched, required, children, ...props }) => {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <select 
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 'var(--radius)',
          border: `1px solid ${touched && error ? 'var(--danger)' : 'var(--border)'}`,
          fontSize: '14px',
          outline: 'none',
          backgroundColor: '#fff',
          transition: 'border-color 0.2s'
        }}
        {...props}
      >
        {children}
      </select>
      {touched && error && (
        <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>{error}</div>
      )}
    </div>
  );
};
