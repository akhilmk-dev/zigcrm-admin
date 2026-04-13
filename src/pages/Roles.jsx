import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input } from '../components/common/Modal';
import { usePermission } from '../hooks/usePermission';

export default function Roles() {
  const { hasPermission } = usePermission();
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selection / Modal States
  const [selectedRole, setSelectedRole] = useState(null);
  const [isPermsModalOpen, setIsPermsModalOpen] = useState(false);
  const [rolePerms, setRolePerms] = useState([]);
  const [isNewRoleModalOpen, setIsNewRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState({ role_name: '', description: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/permissions')
      ]);
      setRoles(rolesRes.data);
      setAllPermissions(permsRes.data);
    } catch (err) {
      console.error("Fetch Roles/Perms Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenPerms = async (role) => {
    setSelectedRole(role);
    try {
      const res = await api.get(`/roles/${role.id}/permissions`);
      setRolePerms(res.data);
      setIsPermsModalOpen(true);
    } catch (err) {
      console.error("Fetch Role Permissions Error:", err);
    }
  };

  const togglePermission = async (permId) => {
    let newPerms;
    if (rolePerms.includes(permId)) {
      newPerms = rolePerms.filter(id => id !== permId);
    } else {
      newPerms = [...rolePerms, permId];
    }
    setRolePerms(newPerms);
    
    try {
      await api.post(`/roles/${selectedRole.id}/permissions`, { permissionIds: newPerms });
    } catch (err) {
      console.error("Save Permissions Error:", err);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/roles', newRole);
      setRoles([...roles, res.data]);
      setIsNewRoleModalOpen(false);
      setNewRole({ role_name: '', description: '' });
    } catch (err) {
      console.error("Create Role Error:", err);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm("Are you sure you want to delete this role?")) return;
    try {
      await api.delete(`/roles/${roleId}`);
      setRoles(roles.filter(r => r.id !== roleId));
    } catch (err) {
      console.error("Delete Role Error:", err);
      alert("Failed to delete role.");
    }
  };

  const columns = [
    { 
      header: 'Role Name', 
      key: 'role_name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '600' }}>{row.role_name}</span>
          {row.is_system_role && <Badge>System</Badge>}
        </div>
      )
    },
    { header: 'Description', key: 'description' },
    { 
      header: 'Created At', 
      key: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    }
  ];

  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.module_name]) acc[perm.module_name] = [];
    acc[perm.module_name].push(perm);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Roles & Permissions</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Define access levels and assign permissions for your team members.</p>
        </div>
        {hasPermission('roles.manage') && (
          <Button onClick={() => setIsNewRoleModalOpen(true)}>+ Create Role</Button>
        )}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <DataTable 
          columns={columns} 
          data={roles} 
          isLoading={loading}
          actions={(row) => (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button type="secondary" size="sm" onClick={() => handleOpenPerms(row)}>Edit Permissions</Button>
              {!row.is_system_role && (
                <Button type="ghost" size="sm" onClick={() => handleDeleteRole(row.id)}>
                  <span style={{ color: 'var(--danger)' }}>Delete</span>
                </Button>
              )}
            </div>
          )}
        />
      </div>

      {/* Permissions Edit Modal */}
      <Modal
        isOpen={isPermsModalOpen}
        onClose={() => setIsPermsModalOpen(false)}
        title={`Edit Permissions: ${selectedRole?.role_name}`}
        width="800px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxHeight: '60vh', overflowY: 'auto', padding: '12px' }}>
          {Object.keys(groupedPermissions).map(module => (
            <div key={module}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                {module} Module
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {groupedPermissions[module].map(perm => (
                  <label key={perm.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    transition: 'background-color 0.2s'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={rolePerms.includes(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>{perm.action.charAt(0).toUpperCase() + perm.action.slice(1)}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{perm.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* New Role Modal */}
      <Modal 
        isOpen={isNewRoleModalOpen} 
        onClose={() => setIsNewRoleModalOpen(false)} 
        title="Create New Role"
        footer={<>
          <Button type="secondary" onClick={() => setIsNewRoleModalOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateRole}>Create Role</Button>
        </>}
      >
        <Input 
          label="Role Name" 
          placeholder="e.g. Sales Manager" 
          value={newRole.role_name}
          onChange={(e) => setNewRole({...newRole, role_name: e.target.value})}
        />
        <Input 
          label="Description" 
          placeholder="What can this role do?" 
          value={newRole.description}
          onChange={(e) => setNewRole({...newRole, description: e.target.value})}
        />
      </Modal>
    </div>
  );
}
