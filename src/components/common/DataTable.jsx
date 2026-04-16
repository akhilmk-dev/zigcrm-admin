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

export const DataTable = ({ 
  columns, 
  data, 
  actions, 
  isLoading, 
  totalCount, 
  currentPage, 
  pageSize, 
  onPageChange 
}) => {
  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading records...</div>;
  }

  const hasData = data && data.length > 0;
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

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
            {!hasData ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalCount > 0 && onPageChange && (
        <div style={{ 
          padding: '12px 24px', 
          borderTop: '1px solid var(--border)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: '#fff'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} entries
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: currentPage === 1 ? '#f8fafc' : '#fff',
                color: currentPage === 1 ? '#94a3b8' : 'var(--text-main)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Previous
            </button>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: 'var(--primary)', 
              color: '#fff', 
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700'
            }}>
              {currentPage}
            </div>
            <button 
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: currentPage >= totalPages ? '#f8fafc' : '#fff',
                color: currentPage >= totalPages ? '#94a3b8' : 'var(--text-main)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
