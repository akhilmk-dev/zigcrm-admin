import React from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { usePermission } from '../hooks/usePermission';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, user } = usePermission();

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

  const navItems = [
    { label: 'Dashboard', path: '/', icon: '📊' },
    { label: 'Tenants', path: '/tenants', icon: '🏢', requiresAdmin: true },
    { label: 'Users', path: '/users', icon: '👥', permission: 'users.manage' },
    { label: 'Roles', path: '/roles', icon: '🔐', permission: 'roles.manage' },
    { label: 'Contacts', path: '/contacts', icon: '📇', permission: 'contacts.read' },
    { label: 'Deals', path: '/deals', icon: '🤝', permission: 'deals.read' },
    { label: 'Tasks', path: '/tasks', icon: '✅', permission: 'tasks.read' },
    { label: 'My Profile', path: '/profile', icon: '👤' },
  ];

  const filteredNav = navItems.filter(item => {
    // Platform Level Routes
    if (item.requiresAdmin) return user?.isSuperAdmin || user?.isAdmin;
    
    // Normal Routes
    if (item.permission) return hasPermission(item.permission);
    
    return true; // Dashboard etc visible to all
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      
      {/* Sidebar */}
      <aside style={{ 
        width: 'var(--sidebar-width)', 
        backgroundColor: '#fff', 
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 50
      }}>
        <div style={{ 
          height: 'var(--header-height)', 
          display: 'flex', 
          alignItems: 'center', 
          padding: '0 24px',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            backgroundColor: 'var(--primary)', 
            borderRadius: '6px',
            marginRight: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>Z</div>
          <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', letterSpacing: '-0.5px' }}>ZIGCRM</span>
        </div>
        
        <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius)',
                  color: isActive ? 'var(--primary)' : 'var(--secondary)',
                  backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
              >
                <span style={{ marginRight: '12px', fontSize: '18px' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '12px',
            backgroundColor: 'var(--bg-main)',
            borderRadius: 'var(--radius)',
            marginBottom: '12px'
          }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary)', 
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              marginRight: '12px',
              fontSize: '14px'
            }}>
              {user?.email?.[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                {user?.isSuperAdmin ? 'Super Admin' : user?.isAdmin ? 'Admin' : (user?.tenantRoleName || 'User')}
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{ 
              width: '100%', 
              padding: '10px', 
              backgroundColor: '#fff', 
              color: 'var(--danger)', 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius)', 
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, marginLeft: 'var(--sidebar-width)', display: 'flex', flexDirection: 'column' }}>
        <header style={{ 
          height: 'var(--header-height)', 
          backgroundColor: '#fff', 
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Pages</span>
            <span style={{ color: 'var(--border)', fontSize: '14px' }}>/</span>
            <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '600' }}>
              {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             {user?.tenantId && (
               <span style={{ 
                 fontSize: '12px', 
                 fontWeight: '700', 
                 backgroundColor: 'var(--primary-light)', 
                 color: 'var(--primary)', 
                 padding: '4px 10px', 
                 borderRadius: '20px'
               }}>
                 TENANT MODE
               </span>
             )}
          </div>
        </header>

        <main style={{ padding: '32px', flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
