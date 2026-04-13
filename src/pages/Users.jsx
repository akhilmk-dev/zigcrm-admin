import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input } from '../components/common/Modal';
import { usePermission } from '../hooks/usePermission';

export default function Users() {
  const { hasPermission } = usePermission();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Super Admin view states
  const [viewScope, setViewScope] = useState('tenant'); // 'platform' or 'tenant'
  const [selectedTenantId, setSelectedTenantId] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: '',
    target_tenant_id: '',
    platform_role: 'admin'
  });

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (isGlobalAdmin) {
        queryParams.append('scope', viewScope);
        if (selectedTenantId) queryParams.append('tenant_id', selectedTenantId);
      }

      const [usersRes, tenantsRes] = await Promise.all([
        api.get(`/users?${queryParams.toString()}`),
        isGlobalAdmin ? api.get('/tenants') : Promise.resolve({ data: [] })
      ]);
      
      setUsers(usersRes.data);
      if (isGlobalAdmin) setTenants(tenantsRes.data);

      // Fetch roles if we are in tenant context or regular tenant admin
      if (!isGlobalAdmin || (viewScope === 'tenant' && (selectedTenantId || formData.target_tenant_id))) {
          const tid = isGlobalAdmin ? (selectedTenantId || formData.target_tenant_id) : '';
          const rolesRes = await api.get(`/roles${tid ? `?tenant_id=${tid}` : ''}`);
          setRoles(rolesRes.data);
      } else {
          setRoles([]);
      }
    } catch (err) {
      console.error("Fetch Users Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewScope, selectedTenantId]);

  // When form target tenant changes, refresh roles for that tenant
  useEffect(() => {
    if (isGlobalAdmin && viewScope === 'tenant' && formData.target_tenant_id) {
        api.get(`/roles?tenant_id=${formData.target_tenant_id}`).then(res => setRoles(res.data));
    }
  }, [formData.target_tenant_id]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Keep empty for password edit
        role_id: user.role_id || '',
        target_tenant_id: user.tenant_id || '',
        platform_role: user.role || 'admin'
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role_id: '',
        target_tenant_id: selectedTenantId || '',
        platform_role: 'admin'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      
      // Clean up payload for specific target types
      if (viewScope === 'platform' && isGlobalAdmin) {
          payload.role = formData.platform_role;
          delete payload.target_tenant_id;
          delete payload.role_id;
      }
      
      // Don't send empty password if editing
      if (editingUser && !payload.password) {
          delete payload.password;
      }

      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, payload);
      } else {
        await api.post('/users', payload);
      }

      handleCloseModal();
      fetchData();
      setFormData({ name: '', email: '', password: '', role_id: '', target_tenant_id: '', platform_role: 'admin' });
    } catch (err) {
      console.error("Save User Error:", err);
      alert(err.response?.data?.error || "Failed to save user");
    }
  };

  const toggleStatus = async (user) => {
     const newStatus = user.status === 'active' ? 'suspended' : 'active';
     try {
       await api.patch(`/users/${user.id}/status`, { status: newStatus });
       fetchData();
     } catch (err) {
       console.error("Status Update Error:", err);
     }
  };

  const columns = [
    { 
      header: 'Name', 
      key: 'name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
            {(row.name || 'U')[0].toUpperCase()}
          </div>
          <div style={{ fontWeight: '600' }}>{row.name}</div>
        </div>
      )
    },
    { header: 'Email', key: 'email' },
    { 
      header: 'Role', 
      key: 'role',
      render: (row) => (
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          {row.role || row.tenant_roles?.role_name || 'User'}
        </span>
      )
    },
    // Show Company column for Global Admins
    ...(isGlobalAdmin && viewScope === 'tenant' ? [{
        header: 'Company',
        key: 'tenant_name',
        render: (row) => <Badge type="primary">{row.tenants?.tenant_name || 'Individual'}</Badge>
    }] : []),
    { 
      header: 'Status', 
      key: 'status',
      render: (row) => (
        <Badge type={row.status === 'active' ? 'success' : 'danger'}>{row.status}</Badge>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>User Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Manage user access, roles, and account status.</p>
        </div>
        {hasPermission('users.manage') && (
          <Button onClick={() => handleOpenModal()}>+ Add {viewScope === 'platform' ? 'Platform Admin' : 'Tenant User'}</Button>
        )}
      </div>

      {isGlobalAdmin && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
          <button 
            onClick={() => { setViewScope('platform'); setSelectedTenantId(''); }}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', backgroundColor: viewScope === 'platform' ? '#fff' : 'transparent', color: viewScope === 'platform' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: viewScope === 'platform' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
          >
            Platform Admins
          </button>
          <button 
            onClick={() => setViewScope('tenant')}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600', backgroundColor: viewScope === 'tenant' ? '#fff' : 'transparent', color: viewScope === 'tenant' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: viewScope === 'tenant' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
          >
            Tenant Users
          </button>
          
          {viewScope === 'tenant' && (
            <select 
              value={selectedTenantId} 
              onChange={(e) => setSelectedTenantId(e.target.value)}
              style={{ marginLeft: '12px', padding: '4px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="">All Companies (Everything)</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.tenant_name}</option>)}
            </select>
          )}
        </div>
      )}

      <DataTable 
        columns={columns} 
        data={users} 
        isLoading={loading}
        actions={(row) => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" type="secondary" onClick={() => handleOpenModal(row)}>Edit</Button>
            <Button 
                type="ghost" 
                size="sm" 
                onClick={() => toggleStatus(row)}
            >
                <span style={{ color: row.status === 'active' ? 'var(--danger)' : 'var(--success)' }}>
                    {row.status === 'active' ? 'Suspend' : 'Activate'}
                </span>
            </Button>
          </div>
        )}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingUser ? `Edit ${viewScope === 'platform' ? 'Platform Admin' : 'Tenant User'}` : `Add New ${viewScope === 'platform' ? 'Platform Admin' : 'Tenant User'}`}
        footer={<>
          <Button type="secondary" onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleSubmit}>{editingUser ? 'Save Changes' : 'Create User'}</Button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          {isGlobalAdmin && viewScope === 'tenant' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Target Company</label>
              <select 
                value={formData.target_tenant_id}
                onChange={(e) => setFormData({...formData, target_tenant_id: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: '#fff' }}
                required
                disabled={!!editingUser} // Prevent moving users between tenants for now
              >
                <option value="">Select a Company</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.tenant_name}</option>)}
              </select>
            </div>
          )}

          <Input 
            label="Full Name" 
            placeholder="John Doe" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <Input 
            label="Email Address" 
            type="email"
            placeholder="john@example.com" 
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          <Input 
            label={editingUser ? "Reset Password (Leave blank to keep current)" : "Temporary Password"}
            type="password"
            placeholder="••••••••" 
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required={!editingUser}
          />
          
          {viewScope === 'platform' ? (
             <div style={{ marginBottom: '16px' }}>
             <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Platform Role</label>
             <select 
               value={formData.platform_role}
               onChange={(e) => setFormData({...formData, platform_role: e.target.value})}
               style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: '#fff' }}
             >
               <option value="admin">Platform Admin</option>
               <option value="super_admin">Super Admin</option>
             </select>
           </div>
          ) : (
            (roles.length > 0) && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Assigned Role</label>
                <select 
                  value={formData.role_id}
                  onChange={(e) => setFormData({...formData, role_id: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: '#fff' }}
                  required
                >
                  <option value="">Select a role</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
                </select>
              </div>
            )
          )}
        </form>
      </Modal>
    </div>
  );
}
