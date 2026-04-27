import React, { useState, useEffect } from 'react';

// Icons for the table
const UserIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', opacity: 0.7 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);

const TextIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', opacity: 0.7 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
);

const StarIcon = ({ filled = false }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "#FFB800" : "none"} stroke={filled ? "#FFB800" : "#CBD5E1"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
);

export const Badge = ({ children, type = 'default' }) => {
  const styles = {
    default: { backgroundColor: '#F1F5F9', color: '#475569' },
    success: { backgroundColor: '#DCFCE7', color: '#15803d' },
    danger: { backgroundColor: '#FEE2E2', color: '#b91c1c' },
    warning: { backgroundColor: '#FEF3C7', color: '#a16207' },
    primary: { backgroundColor: '#E0F2FE', color: '#0369a1' }
  };

  const selected = styles[type] || styles.default;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'capitalize',
      ...selected
    }}>
      {children}
    </span>
  );
};

const TableSkeleton = ({ columns, hasActions }) => {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
      <style>
        {`
          @keyframes skeleton-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          .skeleton-box {
            background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
            background-size: 200% 100%;
            animation: skeleton-shimmer 1.5s infinite;
            border-radius: 4px;
          }
        `}
      </style>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              {columns.map((col, idx) => (
                <th key={idx} style={{ padding: '16px 20px' }}>
                  <div className="skeleton-box" style={{ width: '60px', height: '14px' }} />
                </th>
              ))}
              {hasActions && <th style={{ padding: '16px 20px' }}></th>}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, rowIndex) => (
              <tr key={rowIndex} style={{ borderBottom: '1px solid var(--border)' }}>
                {columns.map((_, colIndex) => (
                  <td key={colIndex} style={{ padding: '16px 20px' }}>
                    <div className="skeleton-box" style={{ width: colIndex === 0 ? '70%' : '40%', height: '16px' }} />
                  </td>
                ))}
                {hasActions && (
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <div className="skeleton-box" style={{ width: '60px', height: '28px', borderRadius: '8px' }} />
                      <div className="skeleton-box" style={{ width: '60px', height: '28px', borderRadius: '8px' }} />
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

export const DataTable = ({
  columns,
  data,
  actions,
  isLoading,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  maxHeight = 'calc(100vh - 200px)', // Optimized for Page Scroll -> Table Scroll transition
  containerStyle = {}
}) => {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);

  useEffect(() => {
    let timeout;
    if (isLoading) {
      setShowSkeleton(true);
    } else {
      timeout = setTimeout(() => setShowSkeleton(false), 800);
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (showSkeleton) {
    return <TableSkeleton columns={columns} hasActions={!!actions} />;
  }

  const rows = Array.isArray(data) ? data : (data?.data || []);
  const hasData = rows.length > 0;
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  // Pagination Text
  const startRange = (currentPage - 1) * pageSize + 1;
  const endRange = Math.min(currentPage * pageSize, totalCount);

  return (
    <div style={{ 
      backgroundColor: '#fff', 
      borderRadius: 'var(--radius)', 
      border: '1px solid var(--border)', 
      overflow: 'hidden', 
      boxShadow: 'var(--shadow)', 
      width: '100%',
      maxWidth: '100%',
      ...containerStyle 
    }}>
      <div style={{ 
        overflowX: 'auto', 
        overflowY: 'auto', 
        maxHeight, 
        width: '100%' 
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
              <th style={{ 
                width: '50px', 
                minWidth: '50px', 
                maxWidth: '50px',
                padding: '12px 0', 
                position: 'sticky', 
                top: 0, 
                backgroundColor: 'var(--table-header-bg)', 
                zIndex: 10, 
                borderBottom: '1px solid var(--table-border)', 
                textAlign: 'center' 
              }}>
                <span style={{ fontSize: '11px', color: 'var(--table-text-header)', fontWeight: '800' }}>#</span>
              </th>
              {columns.map((col, headIdx) => (
                <th 
                  key={headIdx} 
                  style={{ 
                    padding: '12px 20px', 
                    fontSize: '11px', 
                    fontFamily: 'var(--font-headline)', 
                    fontWeight: '800', 
                    color: 'var(--table-text-header)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.08em',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'var(--table-header-bg)',
                    zIndex: 10,
                    borderBottom: '1px solid var(--table-border)',
                    borderLeft: '1px solid var(--table-border)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {col.header.toLowerCase().includes('name') || col.header.toLowerCase().includes('owner') ? <UserIcon /> : <TextIcon />}
                    {col.header}
                  </div>
                </th>
              ))}
              {actions && (
                <th 
                  style={{ 
                    padding: '12px 20px', 
                    fontSize: '11px', 
                    fontFamily: 'var(--font-headline)', 
                    fontWeight: '800', 
                    color: 'var(--table-text-header)', 
                    textTransform: 'uppercase', 
                    textAlign: 'right', 
                    letterSpacing: '0.08em',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'var(--table-header-bg)',
                    zIndex: 10,
                    borderBottom: '1px solid var(--table-border)',
                    borderLeft: '1px solid var(--table-border)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {!hasData ? (
              <tr>
                <td colSpan={columns.length + (actions ? 2 : 1)} style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => (
                <tr 
                  key={rowIdx} 
                  style={{ 
                    borderBottom: '1px solid var(--table-border)', 
                    transition: 'all 0.2s',
                    position: 'relative'
                  }} 
                  className="table-row"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--table-row-hover)'} 
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ 
                    width: '50px', 
                    minWidth: '50px', 
                    maxWidth: '50px',
                    padding: '12px 0', 
                    textAlign: 'center', 
                    fontSize: '13px', 
                    color: 'var(--text-muted)', 
                    borderRight: '1px solid var(--table-border)' 
                  }}>
                    {((currentPage - 1) * pageSize) + rowIdx + 1}
                  </td>
                  {columns.map((col, cellIdx) => (
                    <td key={cellIdx} style={{ padding: '12px 20px', fontSize: '14px', color: 'var(--text-main)', borderLeft: cellIdx > 0 ? '1px solid var(--table-border)' : 'none' }}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                  {actions && (
                    <td style={{ padding: '12px 20px', textAlign: 'right', borderLeft: '1px solid var(--table-border)' }}>
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
          borderTop: '1px solid var(--table-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fff'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
            Viewing <span style={{ color: 'var(--text-main)' }}>{startRange}-{endRange}</span> of <span style={{ color: 'var(--text-main)' }}>{totalCount}</span> results
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--table-border)',
                backgroundColor: currentPage === 1 ? '#F8FAFC' : '#fff',
                color: currentPage === 1 ? '#CBD5E1' : '#475569',
                fontSize: '13px',
                fontWeight: '600',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ←
            </button>
            <div style={{
              padding: '6px 12px',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '13px',
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
                border: '1px solid var(--table-border)',
                backgroundColor: currentPage >= totalPages ? '#F8FAFC' : '#fff',
                color: currentPage >= totalPages ? '#CBD5E1' : '#475569',
                fontSize: '13px',
                fontWeight: '600',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
