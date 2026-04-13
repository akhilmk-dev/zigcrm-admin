import React from 'react';

export const Badge = ({ children, type = 'default' }) => {
  const styles = {
    default: { backgroundColor: '#f1f5f9', color: '#475569' },
    success: { backgroundColor: '#ecfdf5', color: '#059669' },
    danger: { backgroundColor: '#fef2f2', color: '#dc2626' },
    warning: { backgroundColor: '#fffbeb', color: '#d97706' },
    primary: { backgroundColor: '#eff6ff', color: '#2563eb' }
  };

  const selected = styles[type] || styles.default;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      ...selected
    }}>
      {children}
    </span>
  );
};

export const DataTable = ({ columns, data, actions, isLoading }) => {
  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading records...</div>;
  }

  if (!data || data.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>No records found.</div>;
  }

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              {columns.map((col, headIdx) => (
                <th key={headIdx} style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {col.header}
                </th>
              ))}
              {actions && <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                {columns.map((col, cellIdx) => (
                  <td key={cellIdx} style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-main)' }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {actions(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
