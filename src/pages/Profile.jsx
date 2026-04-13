import React from 'react';
import { usePermission } from '../hooks/usePermission';

export default function Profile() {
  const { user } = usePermission();

  const groupedPermissions = user?.permissions?.reduce((acc, perm) => {
    if (perm === '*') return acc; // Special case handled below
    const [module, action] = perm.split('.');
    if (!acc[module]) acc[module] = [];
    acc[module].push(action);
    return acc;
  }, {}) || {};

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>My Profile</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Overview of your account settings and access level.</p>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        {/* User Info Card */}
        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary)', 
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 'bold'
            }}>
              {user?.email?.[0].toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800' }}>{user?.email}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>ID: {user?.id}</p>
              <div style={{ marginTop: '8px' }}>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  backgroundColor: 'var(--primary-light)', 
                  color: 'var(--primary)', 
                  padding: '4px 10px', 
                  borderRadius: '20px',
                  textTransform: 'uppercase'
                }}>
                  {user?.isSuperAdmin ? 'Platform Super Admin' : user?.tenantRoleName || 'User'}
                </span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
             <div>
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Account Status</p>
                <p style={{ fontWeight: '600', color: 'var(--success)' }}>Active</p>
             </div>
             <div>
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Member Since</p>
                <p style={{ fontWeight: '600' }}>April 2026</p>
             </div>
          </div>
        </div>

        {/* Permissions Card */}
        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px' }}>Active Permissions</h3>
          
          {user?.permissions?.includes('*') ? (
            <div style={{ padding: '24px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
               <p style={{ fontWeight: '600', color: 'var(--primary)' }}>Master Access Enabled</p>
               <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>As a Super Admin, you have unrestricted access to all platform and CRM modules.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
               {Object.keys(groupedPermissions).length > 0 ? Object.keys(groupedPermissions).map(module => (
                 <div key={module} style={{ padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius)' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'capitalize', color: 'var(--text-main)', marginBottom: '12px' }}>{module}</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                       {groupedPermissions[module].map(action => (
                         <span key={action} style={{ 
                            fontSize: '11px', 
                            fontWeight: '600', 
                            backgroundColor: '#fff', 
                            color: 'var(--text-muted)', 
                            padding: '4px 10px', 
                            borderRadius: '4px',
                            border: '1px solid var(--border)' 
                         }}>
                           {action}
                         </span>
                       ))}
                    </div>
                 </div>
               )) : (
                 <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No permissions assigned to this role.</p>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
