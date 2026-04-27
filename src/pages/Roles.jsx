import React, { useState, useEffect, useCallback } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input, ConfirmModal } from '../components/common/Modal';
import { usePermission } from '../hooks/usePermission';
import { toast } from 'react-hot-toast';

export default function Roles() {
  const { user: loggedInUser } = usePermission();
  const isSuperAdmin = loggedInUser?.isSuperAdmin;

  // ─── List State ──────────────────────────────────────────────────────────────
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // ─── Permissions State ───────────────────────────────────────────────────────
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isPermsModalOpen, setIsPermsModalOpen] = useState(false);
  const [rolePerms, setRolePerms] = useState([]);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // ─── New Role Modal ───────────────────────────────────────────────────────────
  const [isNewRoleModalOpen, setIsNewRoleModalOpen] = useState(false);

  const formik = useFormik({
    initialValues: {
      role_name: '',
      description: ''
    },
    validationSchema: Yup.object({
      role_name: Yup.string().required('Role name is required').min(3, 'Min 3 characters'),
      description: Yup.string().max(200, 'Max 200 characters')
    }),
    onSubmit: async (values) => {
      try {
        await api.post('/roles', values);
        toast.success('Role created successfully');
        fetchRoles();
        setIsNewRoleModalOpen(false);
        formik.resetForm();
      } catch (err) {
        console.error('Create Role Error:', err);
      }
    }
  });

  // ─── Debounce ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 500);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Load Permissions (once) ─────────────────────────────────────────────────
  useEffect(() => {
    api.get('/permissions').then(res => setAllPermissions(res.data || [])).catch(() => {});
  }, []);

  // ─── Load Roles ──────────────────────────────────────────────────────────────
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: pageSize });
      if (debouncedSearch) params.append('search', debouncedSearch);

      const res = await api.get(`/roles?${params.toString()}`);
      setRoles(res.data.data || []);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error('Fetch Roles Error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, pageSize]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  // ─── Open Permissions Modal ───────────────────────────────────────────────────
  const handleOpenPerms = async (role) => {
    setSelectedRole(role);
    try {
      const res = await api.get(`/roles/${role.id}/permissions`);
      setRolePerms(res.data || []);
      setIsPermsModalOpen(true);
    } catch (err) {
      console.error('Fetch Role Permissions Error:', err);
    }
  };

  // ─── Toggle a Permission ──────────────────────────────────────────────────────
  const togglePermission = async (permId) => {
    const newPerms = rolePerms.includes(permId)
      ? rolePerms.filter(id => id !== permId)
      : [...rolePerms, permId];
    setRolePerms(newPerms);

    try {
      await api.post(`/roles/${selectedRole.id}/permissions`, { permissionIds: newPerms });
      toast.success('Permissions updated');
    } catch (err) {
      console.error('Save Permissions Error:', err);
    }
  };

  // ─── Delete Role ──────────────────────────────────────────────────────────────
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      await api.delete(`/roles/${roleToDelete}`);
      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (err) {
      console.error('Delete Role Error:', err);
    } finally {
      setRoleToDelete(null);
    }
  };

  // ─── Permission Groups ───────────────────────────────────────────────────────
  const groupedPermissions = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.module_name]) acc[perm.module_name] = { own: [], all: [] };
    if (perm.action.endsWith('_all')) {
      acc[perm.module_name].all.push(perm);
    } else {
      acc[perm.module_name].own.push(perm);
    }
    return acc;
  }, {});

  // ─── Table Columns ────────────────────────────────────────────────────────────
  const columns = [
    {
      header: 'Role Name',
      key: 'role_name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '600', color: row.role_name.startsWith('tenant-') ? '#0ea5e9' : 'var(--text-main)' }}>
            {row.role_name}
          </span>
          {row.is_system_role && <Badge>System</Badge>}
          {row.role_name.startsWith('tenant-') && <Badge type="info">Tenant</Badge>}
        </div>
      )
    },
    { header: 'Description', key: 'description', render: (row) => <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{row.description || '—'}</span> },
    {
      header: 'Created',
      key: 'created_at',
      render: (row) => <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(row.created_at).toLocaleDateString()}</span>
    }
  ];

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Access Denied</h2>
        <p>Only Super Admins can manage roles and permissions.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Unified Roles Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
            Platform and Tenant roles are now managed centrally. Use the <code>tenant-</code> prefix for roles intended for client staff.
          </p>
        </div>
        <Button onClick={() => setIsNewRoleModalOpen(true)}>
          + Create New Role
        </Button>
      </div>

      {/* Sticky Filter Bar */}
      <div style={{ 
        position: 'sticky', 
        top: 'var(--header-height)', 
        zIndex: 40, 
        backgroundColor: 'var(--bg-main)', 
        paddingTop: '8px',
        paddingBottom: '16px',
        margin: '0 -24px 16px -24px',
        paddingLeft: '24px',
        paddingRight: '24px',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <span style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search roles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
          />
        </div>
      </div>
    </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={roles}
        isLoading={loading}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        actions={(row) => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button 
              type="secondary" 
              size="sm" 
              onClick={() => handleOpenPerms(row)}
              disabled={row.role_name === 'Super Admin'}
              title={row.role_name === 'Super Admin' ? "Super Admin permissions are locked for system safety" : ""}
            >
              Edit Permissions
            </Button>
            {!row.is_system_role && (
              <Button type="ghost" size="sm" onClick={() => setRoleToDelete(row.id)}>
                <span style={{ color: 'var(--danger)' }}>Delete</span>
              </Button>
            )}
          </div>
        )}
      />

      {/* ─── Permissions Edit Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={isPermsModalOpen}
        onClose={() => setIsPermsModalOpen(false)}
        title={`Permissions: ${selectedRole?.role_name}`}
        width="820px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxHeight: '62vh', overflowY: 'auto', padding: '4px 8px' }}>
          {Object.keys(groupedPermissions).map(module => (
            <div key={module}>
              <h4 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.07em', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                {module}
              </h4>

              {/* Personal permissions */}
              {groupedPermissions[module].own.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                    🔒 Personal (own records only)
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                    {groupedPermissions[module].own.map(perm => (
                      <label key={perm.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '8px 10px', borderRadius: '8px', backgroundColor: rolePerms.includes(perm.id) ? '#eff6ff' : '#fafafa', border: `1px solid ${rolePerms.includes(perm.id) ? '#bfdbfe' : '#e2e8f0'}`, transition: 'all 0.15s' }}>
                        <input
                          type="checkbox"
                          checked={rolePerms.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          style={{ marginTop: '2px', width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                            {perm.action.charAt(0).toUpperCase() + perm.action.slice(1)}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{perm.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Tenant-wide permissions */}
              {groupedPermissions[module].all.length > 0 && (
                <div style={{ backgroundColor: '#fffbeb', borderRadius: '10px', padding: '12px', border: '1px dashed #fcd34d' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                    🏢 Tenant-Wide (all records in company)
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                    {groupedPermissions[module].all.map(perm => (
                      <label key={perm.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '8px 10px', borderRadius: '8px', backgroundColor: rolePerms.includes(perm.id) ? '#fef3c7' : '#fff', border: `1px solid ${rolePerms.includes(perm.id) ? '#fcd34d' : '#e2e8f0'}`, transition: 'all 0.15s' }}>
                        <input
                          type="checkbox"
                          checked={rolePerms.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          style={{ marginTop: '2px', width: '15px', height: '15px', cursor: 'pointer', accentColor: '#f59e0b' }}
                        />
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                            {perm.action.replace('_all', ' All').charAt(0).toUpperCase() + perm.action.replace('_all', ' All').slice(1)}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{perm.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* ─── Create Role Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={isNewRoleModalOpen}
        onClose={() => setIsNewRoleModalOpen(false)}
        title="Create Unified Role"
        footer={<>
          <Button type="secondary" onClick={() => setIsNewRoleModalOpen(false)}>Cancel</Button>
          <Button onClick={formik.handleSubmit} disabled={formik.isSubmitting}>
            {formik.isSubmitting ? 'Creating...' : 'Create Role'}
          </Button>
        </>}
      >
        <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fefce8', border: '1px solid #fde047', fontSize: '13px', color: '#854d0e', marginBottom: '16px' }}>
          💡 Start the name with <strong>tenant-</strong> (e.g. <code>tenant-sales</code>) if this role is intended for client staff.
        </div>

        <form onSubmit={formik.handleSubmit}>
          <Input
            label="Role Name"
            name="role_name"
            placeholder="e.g. manager or tenant-operator"
            value={formik.values.role_name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.role_name}
            touched={formik.touched.role_name}
            required
          />
          <Input
            label="Description"
            name="description"
            placeholder="Brief description of what this role can do"
            value={formik.values.description}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.description}
            touched={formik.touched.description}
          />
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={!!roleToDelete}
        onClose={() => setRoleToDelete(null)}
        onConfirm={handleDeleteRole}
        title="Delete Role"
        message="Are you sure you want to delete this role? This might affect users assigned to it."
      />
    </div>
  );
}
