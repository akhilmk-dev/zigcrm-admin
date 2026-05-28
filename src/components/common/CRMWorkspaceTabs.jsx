import React from 'react';

export default function CRMWorkspaceTabs({
  tabs = [], // [{ id, label, icon, count }]
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  searchPlaceholder,
  // Filters dropdown props:
  filterType,
  setFilterType,
  filterTime,
  setFilterTime,
  // Toggle displays:
  showFilterType = false,
  showFilterTime = true,
  filterTypeOptions = [], // [{ value, label }]
  filterTimeOptions = [], // [{ value, label }]
  children
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Headers row - swipeable on mobile */}
      <div className="crm-tabs-scroll-container" style={{
        display: 'flex',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        marginBottom: '-1px',
        position: 'relative',
        zIndex: 10
      }}>
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const isFirst = index === 0;
          const isLast = index === tabs.length - 1;

          return (
            <button
              key={tab.id}
              className={`crm-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 24px',
                fontSize: '13.5px',
                fontWeight: isActive ? '700' : '600',
                color: isActive ? 'hsl(218.68deg 49.39% 51.96%)' : '#64748b',
                borderBottom: isActive ? '1px solid #ffffff' : '1px solid #e2e8f0',
                borderTopLeftRadius: isFirst ? '10px' : '0px',
                borderBottomLeftRadius: '0px',
                borderTopRightRadius: isLast ? '10px' : '0px',
                borderBottomRightRadius: '0px',
                borderRight: '1px solid #e2e8f0',
                borderLeft: isFirst ? '1px solid #e2e8f0' : 'none',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: isActive ? '#ffffff' : 'rgb(250 250 250)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                outline: 'none',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              {tab.icon}
              {tab.label} {tab.count !== undefined ? `(${tab.count})` : ''}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: '-1px',
                  left: '3px',
                  right: '3px',
                  height: '3px',
                  backgroundColor: '#2563eb',
                  borderRadius: '0px'
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab lists card */}
      <div className="crm-card" style={{ borderTop: '1px solid #e2e8f0', borderTopLeftRadius: '0px', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>

        {/* Dense search & filter options */}
        <div className="tab-list-filters-bar" style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          backgroundColor: '#ffffff'
        }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
            <input
              type="text"
              placeholder={searchPlaceholder || "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 36px 8px 12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                outline: 'none',
                height: '36px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontWeight: '500',
                transition: 'all 0.15s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </span>
          </div>

          {/* Filters dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {showFilterType && filterTypeOptions.length > 0 && (
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: '6px 28px 6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#475569',
                  height: '36px',
                  cursor: 'pointer',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2.5'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' d='m6 9 6 6 6-6'/%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                  backgroundSize: '12px'
                }}
              >
                {filterTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}

            {showFilterTime && filterTimeOptions.length > 0 && (
              <select
                value={filterTime}
                onChange={(e) => setFilterTime(e.target.value)}
                style={{
                  padding: '6px 28px 6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#475569',
                  height: '36px',
                  cursor: 'pointer',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2.5'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' d='m6 9 6 6 6-6'/%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                  backgroundSize: '12px'
                }}
              >
                {filterTimeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}

            <button style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              outline: 'none'
            }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
            </button>
          </div>
        </div>

        {/* Horizontal Line under Search & Filter - Not touching left & right borders */}
        <div style={{
          marginLeft: '20px',
          marginRight: '20px',
          height: '1px',
          backgroundColor: '#e2e8f0'
        }} />

        {/* Dynamic tabs area */}
        <div style={{ padding: '24px 20px', flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
