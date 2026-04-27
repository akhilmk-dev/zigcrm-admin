import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import { usePermission } from '../hooks/usePermission';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, user } = usePermission();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalCategory, setGlobalCategory] = useState('tenants');
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync global search with URL
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch !== null) {
      setGlobalSearch(urlSearch);
    } else {
      setGlobalSearch('');
    }

    const path = location.pathname.split('/')[1];
    if (['tenants', 'deals', 'users'].includes(path)) {
      setGlobalCategory(path);
    }
  }, [searchParams, location.pathname]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error("Logout failed network error");
    } finally {
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    {
      label: 'Dashboard', path: '/', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      label: 'Tenants', path: '/tenants', requirePlatformAdmin: true, icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" /><path d="M9 8h1" /><path d="M9 12h1" /><path d="M9 16h1" /><path d="M14 8h1" /><path d="M14 12h1" /><path d="M14 16h1" />
          <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
        </svg>
      )
    },
    {
      label: 'Users', path: '/users', permission: 'users.manage', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
    {
      label: 'Roles', path: '/roles', permission: 'roles.manage', icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    },
    {
      label: 'Contacts', path: '/contacts', permission: 'contacts.read', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      label: 'Deals', path: '/deals', permission: 'deals.read', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      )
    },
    {
      label: 'Tasks', path: '/tasks', permission: 'tasks.read', icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14" /><path d="M5 12h14" /><rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      )
    },
  ];

  const filteredNav = navItems.filter(item => {
    let isVisible = true;
    if (item.requireSuperAdmin) isVisible = user?.isSuperAdmin;
    else if (item.requirePlatformAdmin) isVisible = user?.isSuperAdmin || user?.isAdmin;
    else if (item.permission) isVisible = hasPermission(item.permission);
    
    if (!isVisible) return false;
    if (searchQuery) return item.label.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  const displayName = user?.name || user?.email?.split('@')[0] || 'Account';

  const desktopSidebarWidth = '80px';
  const sidebarWidth = isMobile ? '280px' : desktopSidebarWidth;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      <style>
        {`
          .sidebar-icon-container {
            position: relative;
          }
          .sidebar-tooltip {
            position: absolute;
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            background-color: #fff;
            color: var(--text-main);
            padding: 8px 14px;
            border-radius: var(--radius-sm);
            font-size: 13px;
            font-weight: 600;
            margin-left: 14px;
            white-space: nowrap;
            opacity: 0;
            visibility: hidden;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 1000;
            pointer-events: none;
            box-shadow: var(--shadow-lg);
          }
          .sidebar-tooltip::before {
            content: '';
            position: absolute;
            left: -6px;
            top: 50%;
            transform: translateY(-50%);
            border-style: solid;
            border-width: 6px 7px 6px 0;
            border-color: transparent #fff transparent transparent;
          }
          .sidebar-icon-container:hover .sidebar-tooltip {
            opacity: 1;
            visibility: visible;
            transform: translateY(-50%) translateX(2px);
          }
          .sidebar-icon-link {
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .sidebar-icon-link:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
            color: #fff !important;
          }
          .sidebar-icon-link:hover svg {
            color: #fff !important;
          }
        `}
      </style>

      {/* Sidebar Backdrop Overlay (Mobile only) */}
      {isMobile && isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 90
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: sidebarWidth,
          backgroundColor: '#223458',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: isMobile && !isMobileMenuOpen ? '-280px' : '0',
          height: '100vh',
          zIndex: 100,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: (isMobile && isMobileMenuOpen) ? '10px 0 30px rgba(0,0,0,0.2)' : 'none',
          overflowX: 'visible'
        }}
      >
        <div style={{
          height: 'var(--header-height, 64px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMobile ? 'flex-start' : 'center',
          padding: isMobile ? '0 24px' : '0',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          whiteSpace: 'nowrap'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            backgroundColor: 'var(--primary)',
            borderRadius: 'var(--radius-sm)',
            marginRight: isMobile ? '12px' : '0',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: 'var(--font-headline)',
            fontWeight: '900',
            fontSize: '20px',
            boxShadow: '0 4px 14px rgba(6, 200, 93, 0.25)'
          }}>Z</div>
          {isMobile && (
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.8px' }}>ZIGCRM</span>
          )}
        </div>

        {/* Sidebar Search */}
        <div 
          ref={searchRef}
          style={{ padding: isMobile ? '16px 20px 8px' : '16px 14px 8px' }} 
          className={!isMobile ? "sidebar-icon-container" : ""}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            {!isMobile ? (
              <>
                <button 
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="sidebar-icon-link"
                  style={{
                    width: '100%',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSearchOpen ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: isSearchOpen ? 'var(--primary)' : '#94a3b8',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
                {!isSearchOpen && <div className="sidebar-tooltip">Search</div>}
                
                {isSearchOpen && (
                  <div style={{
                    position: 'absolute',
                    left: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    marginLeft: '12px',
                    width: '260px',
                    backgroundColor: '#fff',
                    padding: '12px',
                    borderRadius: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                    border: '1px solid var(--border)',
                    zIndex: 1000,
                    animation: 'slideIn 0.2s ease-out'
                  }}>
                    <style>
                      {`
                        @keyframes slideIn {
                          from { opacity: 0; transform: translateY(-50%) translateX(-10px); }
                          to { opacity: 1; transform: translateY(-50%) translateX(0); }
                        }
                      `}
                    </style>
                    {/* Small triangle arrow for popover */}
                    <div style={{
                      position: 'absolute',
                      left: '-6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      borderStyle: 'solid',
                      borderWidth: '6px 6px 6px 0',
                      borderColor: 'transparent var(--border) transparent transparent',
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: '1px',
                        top: '-6px',
                        borderStyle: 'solid',
                        borderWidth: '6px 6px 6px 0',
                        borderColor: 'transparent #fff transparent transparent',
                      }} />
                    </div>
                    
                    <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Search Menu
                    </div>
                    <input
                      type="text"
                      placeholder="Type to search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '2px solid var(--primary-light)',
                        fontSize: '14px',
                        fontFamily: 'var(--font-body)',
                        backgroundColor: '#fff',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s',
                        color: 'var(--text-main)'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--primary)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(6, 200, 93, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--primary-light)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <span style={{ position: 'absolute', left: '12px', transform: 'translateY(-50%)', top: '50%', color: 'rgba(255, 255, 255, 0.5)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '13px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s',
                    color: '#fff'
                  }}
                />
              </>
            )}
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 0 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            const showLabels = isMobile;
            return (
              <div key={item.path} className={!isMobile ? "sidebar-icon-container" : ""} style={{ padding: showLabels ? '0 16px' : '0 12px' }}>
                <Link
                  to={item.path}
                  onClick={() => isMobile && setIsMobileMenuOpen(false)}
                  className="sidebar-icon-link"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: showLabels ? 'flex-start' : 'center',
                    padding: showLabels ? '12px 16px' : '12px 0',
                    color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                    backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                    fontWeight: isActive ? '700' : '600',
                    fontSize: '14px',
                    textDecoration: 'none',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: showLabels ? `4px solid ${isActive ? 'var(--primary)' : 'transparent'}` : 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{
                    marginRight: showLabels ? '14px' : '0',
                    display: 'flex',
                    alignItems: 'center',
                    color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                    flexShrink: 0
                  }}>
                    {item.icon}
                  </span>
                  {showLabels && <span>{item.label}</span>}
                </Link>
                {!isMobile && <div className="sidebar-tooltip">{item.label}</div>}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Sign Out */}
        <div style={{ padding: isMobile ? '16px 20px' : '16px 12px', borderTop: '1px solid var(--border)' }} className={!isMobile ? "sidebar-icon-container" : ""}>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="sidebar-icon-link"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMobile ? 'flex-start' : 'center',
              padding: isMobile ? '12px' : '12px 0',
              borderRadius: '8px',
              color: 'var(--danger)',
              border: isMobile ? '1px solid #fee2e2' : 'none',
              backgroundColor: isMobile ? '#fff5f5' : 'transparent',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ marginRight: isMobile ? '10px' : '0', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            {isMobile && <span>Sign Out</span>}
          </button>
          {!isMobile && <div className="sidebar-tooltip">Sign Out</div>}
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        marginLeft: isMobile ? '0' : desktopSidebarWidth,
        display: 'flex',
        flexDirection: 'column',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        width: '100%',
        minWidth: 0
      }}>
        <header style={{
          height: 'var(--header-height)',
          backgroundColor: '#223458',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 16px' : '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 80
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isMobile && (
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'transparent',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            )}
            <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Pages</span>
              <span style={{ color: 'var(--border)', fontSize: '14px' }}>/</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {(() => {
                  const path = location.pathname;
                  if (path.startsWith('/contacts/') && path.split('/').length === 3) {
                    return (
                      <>
                        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Contact</span>
                        <span style={{ color: 'var(--border)', fontSize: '14px' }}>/</span>
                        <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '600' }}>Contact detail</span>
                      </>
                    );
                  }
                  const navItem = navItems.find(i => i.path === path);
                  return (
                    <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
                      {navItem?.label || 'Dashboard'}
                    </span>
                  );
                })()}
              </div>
            </div>
            {isMobile && (
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>
                {(() => {
                  const path = location.pathname;
                  if (path.startsWith('/contacts/') && path.split('/').length === 3) return 'Contact detail';
                  return navItems.find(i => i.path === path)?.label || 'Dashboard';
                })()}
              </span>
            )}
          </div>

          {/* Global Search Bar (Admin Only) */}
          {(user?.isSuperAdmin || user?.isAdmin) && !isMobile && (
              <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '2px',
                  width: '380px',
                  margin: '0 20px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                  <select 
                      value={globalCategory}
                      onChange={(e) => setGlobalCategory(e.target.value)}
                      style={{
                          backgroundColor: 'transparent',
                          color: '#fff',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '700',
                          padding: '0 12px',
                          outline: 'none',
                          cursor: 'pointer',
                          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                          height: '32px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em'
                      }}
                  >
                      <option value="tenants" style={{ color: '#000' }}>Tenants</option>
                      <option value="deals" style={{ color: '#000' }}>Deals</option>
                      <option value="users" style={{ color: '#000' }}>Users</option>
                  </select>
                  <input 
                      type="text"
                      placeholder={`Search ${globalCategory}...`}
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                              if (globalSearch.trim()) {
                                  navigate(`/${globalCategory}?search=${encodeURIComponent(globalSearch)}`);
                              } else {
                                  navigate(`/${globalCategory}`);
                              }
                          }
                      }}
                      style={{
                          flex: 1,
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#fff',
                          padding: '8px 12px',
                          fontSize: '13px',
                          outline: 'none',
                          fontFamily: 'inherit'
                      }}
                  />
                  {globalSearch && (
                      <button 
                        onClick={() => {
                            setGlobalSearch('');
                            navigate(`/${globalCategory}`);
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.4)',
                            padding: '0 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                  )}
                  <button 
                    onClick={() => {
                        if (globalSearch.trim()) {
                            navigate(`/${globalCategory}?search=${encodeURIComponent(globalSearch)}`);
                        } else {
                            navigate(`/${globalCategory}`);
                        }
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.5)',
                        padding: '0 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                    </svg>
                  </button>
              </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user?.tenantId && !isMobile && (
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                backgroundColor: '#f1f5f9',
                color: 'var(--text-muted)',
                padding: '4px 12px',
                borderRadius: '20px',
                letterSpacing: '0.05em'
              }}>
                TENANT MODE
              </span>
            )}

            {/* Profile Section */}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 12px',
                  borderRadius: '30px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                  boxShadow: isProfileOpen ? '0 0 0 4px rgba(255, 255, 255, 0.1)' : 'none'
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                {!isMobile && (
                  <>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{displayName}</span>
                    <svg
                      width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: isProfileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'rgba(255, 255, 255, 0.6)' }}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </>
                )}
              </button>

              {isProfileOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 12px)',
                  right: 0,
                  width: '240px',
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  border: '1px solid var(--border)',
                  padding: '8px',
                  zIndex: 100
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', marginBottom: '8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.email}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase' }}>
                      {user?.isSuperAdmin ? 'Super Admin' : user?.isAdmin ? 'Admin' : (user?.tenantRoleName || 'User')}
                    </p>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'background 0.2s'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px', color: 'var(--text-muted)' }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    My Profile
                  </Link>

                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: 'var(--danger)',
                      border: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      marginTop: '4px'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main style={{ padding: isMobile ? '16px' : '24px', flex: 1 }}>
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '400px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#fff1f1',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'var(--danger)'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>Sign Out</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '28px', lineHeight: '1.5' }}>
              Are you sure you want to sign out?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  backgroundColor: '#fff',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: 'var(--danger)',
                  color: '#fff',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
