import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { usePermission } from '../hooks/usePermission';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, user } = usePermission();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
       await api.post('/auth/logout');
    } catch(err) {
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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    )},
    { label: 'Tenants', path: '/tenants', permission: 'tenants.manage', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" /><path d="M9 8h1" /><path d="M9 12h1" /><path d="M9 16h1" /><path d="M14 8h1" /><path d="M14 12h1" /><path d="M14 16h1" />
        <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
      </svg>
    )},
    { label: 'Users', path: '/users', permission: 'users.manage', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )},
    { label: 'Roles', path: '/roles', requireSuperAdmin: true, icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )},
    { label: 'Contacts', path: '/contacts', permission: 'contacts.read', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 2H8C6.9 2 6 2.9 6 4V20C6 21.1 6.9 22 8 22H16C17.1 22 18 21.1 18 20V4C18 2.9 17.1 2" />
        <line x1="12" y1="18" x2="12.01" y2="18" /><path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      </svg>
    )},
    { label: 'Deals', path: '/deals', permission: 'deals.read', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    )},
    { label: 'Tasks', path: '/tasks', permission: 'tasks.read', icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 11 3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    )},
  ];

  const filteredNav = navItems.filter(item => {
    let isVisible = true;
    if (item.requireSuperAdmin) isVisible = user?.isSuperAdmin;
    else if (item.permission) isVisible = hasPermission(item.permission);
    if (!isVisible) return false;
    if (searchQuery) return item.label.toLowerCase().includes(searchQuery.toLowerCase());
    return true; 
  });

  const displayName = user?.name || user?.email?.split('@')[0] || 'Account';
  
  const desktopSidebarWidth = isSidebarHovered ? '260px' : '80px';
  const sidebarWidth = isMobile ? '280px' : desktopSidebarWidth;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      
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
        onMouseEnter={() => !isMobile && setIsSidebarHovered(true)}
        onMouseLeave={() => !isMobile && setIsSidebarHovered(false)}
        style={{ 
          width: sidebarWidth, 
          backgroundColor: '#fff', 
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: isMobile && !isMobileMenuOpen ? '-280px' : '0',
          height: '100vh',
          zIndex: 100,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isSidebarHovered || (isMobile && isMobileMenuOpen) ? '10px 0 30px rgba(0,0,0,0.05)' : 'none',
          overflowX: 'hidden'
        }}
      >
        <div style={{ 
          height: 'var(--header-height)', 
          display: 'flex', 
          alignItems: 'center', 
          padding: isSidebarHovered || isMobile ? '0 24px' : '0 20px',
          borderBottom: '1px solid var(--border)',
          whiteSpace: 'nowrap'
        }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            backgroundColor: 'var(--primary)', 
            borderRadius: '8px',
            marginRight: '12px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '900',
            fontSize: '18px',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
          }}>Z</div>
          {(isSidebarHovered || isMobile) && (
            <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.8px', opacity: 1, transition: 'opacity 0.2s' }}>ZIGCRM</span>
          )}
        </div>

        {/* Sidebar Search */}
        <div style={{ padding: isSidebarHovered || isMobile ? '16px 20px 8px' : '16px 14px 8px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: isSidebarHovered || isMobile ? '12px' : '50%', transform: isSidebarHovered || isMobile ? 'translateY(-50%)' : 'translate(-50%, -50%)', top: '50%', color: '#94a3b8' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </span>
            {(isSidebarHovered || isMobile) && (
              <input 
                type="text" 
                placeholder="Search menu..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  backgroundColor: '#f8fafc',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              />
            )}
          </div>
        </div>
        
        <nav style={{ flex: 1, padding: '12px 0 24px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            const showLabels = isSidebarHovered || isMobile;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: showLabels ? 'flex-start' : 'center',
                  padding: showLabels ? '12px 24px' : '12px 0',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                  fontWeight: isActive ? '700' : '600',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                  borderLeft: showLabels ? `4px solid ${isActive ? 'var(--primary)' : 'transparent'}` : 'none',
                  whiteSpace: 'nowrap'
                }}
                onMouseOver={(e) => !isActive && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                onMouseOut={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'transparent')}
                title={!showLabels ? item.label : ''}
              >
                <span style={{ 
                  marginRight: showLabels ? '14px' : '0', 
                  display: 'flex', 
                  alignItems: 'center',
                  color: isActive ? 'var(--primary)' : '#94a3b8',
                  flexShrink: 0
                }}>
                  {item.icon}
                </span>
                {showLabels && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Sign Out */}
        <div style={{ padding: isSidebarHovered || isMobile ? '16px 20px' : '16px 14px', borderTop: '1px solid var(--border)' }}>
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isSidebarHovered || isMobile ? 'flex-start' : 'center',
              padding: '12px',
              borderRadius: '10px',
              color: 'var(--danger)',
              border: (isSidebarHovered || isMobile) ? '1px solid #fee2e2' : 'none',
              backgroundColor: (isSidebarHovered || isMobile) ? '#fff5f5' : 'transparent',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ marginRight: isSidebarHovered || isMobile ? '10px' : '0', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </span>
            {(isSidebarHovered || isMobile) && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        marginLeft: isMobile ? '0' : desktopSidebarWidth, 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        width: '100%'
      }}>
        <header style={{ 
          height: 'var(--header-height)', 
          backgroundColor: '#fff', 
          borderBottom: '1px solid var(--border)',
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
                  border: '1px solid var(--border)',
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            )}
            <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Pages</span>
              <span style={{ color: 'var(--border)', fontSize: '14px' }}>/</span>
              <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '600' }}>
                {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
              </span>
            </div>
            {isMobile && (
              <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>
                {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
              </span>
            )}
          </div>
          
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
                   border: '1px solid var(--border)',
                   backgroundColor: '#fff',
                   cursor: 'pointer',
                   transition: 'all 0.2s',
                   boxShadow: isProfileOpen ? '0 0 0 3px rgba(37, 99, 235, 0.1)' : 'none'
                 }}
               >
                 <div style={{ 
                   width: '28px', 
                   height: '28px', 
                   borderRadius: '50%', 
                   backgroundColor: '#f1f5f9', 
                   color: 'var(--text-muted)',
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
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{displayName}</span>
                    <svg 
                      width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: isProfileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-muted)' }}
                    >
                      <path d="m6 9 6 6 6-6"/>
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
                       <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                     </svg>
                     Sign Out
                   </button>
                 </div>
               )}
             </div>
          </div>
        </header>

        <main style={{ padding: isMobile ? '20px' : '32px', flex: 1 }}>
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
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
