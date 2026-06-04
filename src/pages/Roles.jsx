import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input, ConfirmModal } from '../components/common/Modal';
import { usePermission } from '../hooks/usePermission';
import { toast } from 'react-hot-toast';

export default function Roles() {
  const { hasPermission, user: loggedInUser } = usePermission();
  const isSuperAdmin = loggedInUser?.isSuperAdmin;
  const isTenant = !isSuperAdmin && !loggedInUser?.isAdmin;
  const canManage = isSuperAdmin || hasPermission('roles.manage');

  // ─── List State ──────────────────────────────────────────────────────────────
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // ─── Permissions State ───────────────────────────────────────────────────────
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isPermsModalOpen, setIsPermsModalOpen] = useState(false);
  const [rolePerms, setRolePerms] = useState([]);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);

  // ─── New Role Modal ───────────────────────────────────────────────────────────
  const [isNewRoleModalOpen, setIsNewRoleModalOpen] = useState(false);

  // ─── Edit Role Modal ──────────────────────────────────────────────────────────
  const [editingRole, setEditingRole] = useState(null);

  const editFormik = useFormik({
    initialValues: { role_name: '', description: '' },
    enableReinitialize: true,
    validationSchema: Yup.object({
      role_name: Yup.string().required('Role name is required').min(3, 'Min 3 characters').max(100, 'Max 100 characters'),
      description: Yup.string().max(500, 'Max 500 characters')
    }),
    onSubmit: async (values) => {
      try {
        await api.patch(`/roles/${editingRole.id}`, {
          role_name: values.role_name.trim(),
          description: values.description.trim()
        });
        toast.success('Role updated successfully');
        setEditingRole(null);
        fetchRoles();
      } catch (err) {
        console.error('Update Role Error:', err);
      }
    }
  });

  const openEditModal = (role) => {
    setEditingRole(role);
    editFormik.setValues({ role_name: role.role_name, description: role.description || '' });
  };

  const formik = useFormik({
    initialValues: {
      role_name: '',
      description: ''
    },
    validationSchema: Yup.object({
      role_name: Yup.string().required('Role name is required').min(3, 'Min 3 characters'),
      description: Yup.string().max(500, 'Max 500 characters')
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
    api.get('/permissions').then(res => setAllPermissions(res.data || [])).catch(() => { });
  }, []);

  // ─── Load Roles ──────────────────────────────────────────────────────────────
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pageSize,
        sortField,
        sortOrder
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (roleFilter) params.append('roleFilter', roleFilter);

      const res = await api.get(`/roles?${params.toString()}`);
      setRoles(res.data.data || []);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error('Fetch Roles Error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter, pageSize, sortField, sortOrder]);

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
  const togglePermission = (permId) => {
    const newPerms = rolePerms.includes(permId)
      ? rolePerms.filter(id => id !== permId)
      : [...rolePerms, permId];
    setRolePerms(newPerms);
  };

  const handleUpdatePermissions = async () => {
    try {
      await api.post(`/roles/${selectedRole.id}/permissions`, { permissionIds: rolePerms });
      toast.success('Permissions updated successfully');
      setIsPermsModalOpen(false);
      setIsUpdateConfirmOpen(false);
    } catch (err) {
      console.error('Save Permissions Error:', err);
      toast.error('Failed to update permissions');
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
      sortKey: 'role_name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {row.role_name === 'Super Admin' ? (
            <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
              {row.role_name}
            </span>
          ) : (
            <Link
              to={`/roles/${row.id}`}
              style={{
                fontWeight: '600',
                color: row.role_name.startsWith('tenant-') ? '#0ea5e9' : 'var(--text-main)',
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
              onMouseLeave={(e) => e.target.style.color = row.role_name.startsWith('tenant-') ? '#0ea5e9' : 'var(--text-main)'}
            >
              {row.role_name}
            </Link>
          )}
          {row.is_system_role && <Badge>System</Badge>}
          {row.role_name.startsWith('tenant-') && <Badge type="info">Tenant</Badge>}
        </div>
      )
    },
    {
      header: 'Description',
      key: 'description',
      render: (row) => <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{row.description || '—'}</span>
    },
    {
      header: 'Created',
      key: 'created_at',
      sortKey: 'created_at',
      render: (row) => <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(row.created_at).toLocaleDateString()}</span>
    }
  ];

  if (!canManage) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to manage roles and permissions.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Unified Roles Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
            Platform and Tenant roles are now managed centrally. Use the <code>tenant-</code> prefix for roles intended for client staff.
          </p>
        </div>
        <Button onClick={() => setIsNewRoleModalOpen(true)} style={{ borderRadius: '6px' }}>
          + Create New Role
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ borderRadius: '6px' }}>

        {/* Search Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '280px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Search</span>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 32px 8px 36px', borderRadius: '6px', border: '1px solid rgb(203, 213, 225)', fontSize: '13px', outline: 'none', backgroundColor: '#fff', transition: 'border-color 0.2s', height: '38px', boxSizing: 'border-box' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'rgb(203, 213, 225)'}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#334155', padding: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Reset Button */}
        {(() => {
          const hasFilters = !!(roleFilter || search);
          return (
            <button
              title={hasFilters ? 'Clear all filters' : 'No active filters'}
              onClick={() => {
                if (!hasFilters) return;
                setRoleFilter('');
                setSearch('');
                setPage(1);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '6px',
                border: `1px solid ${hasFilters ? '#f87171' : 'rgb(203, 213, 225)'}`,
                backgroundColor: hasFilters ? '#fff1f2' : '#f8fafc',
                color: hasFilters ? '#dc2626' : '#cbd5e1',
                cursor: hasFilters ? 'pointer' : 'default',
                transition: 'all 0.2s',
                alignSelf: 'flex-end',
                flexShrink: 0
              }}
              onMouseOver={(e) => { if (hasFilters) e.currentTarget.style.backgroundColor = '#fee2e2'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = hasFilters ? '#fff1f2' : '#f8fafc'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          );
        })()}
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
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={(field, order) => {
          setSortField(field);
          setSortOrder(order);
        }}
        actions={(row) => (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {row.role_name !== 'Super Admin' && (
              <Link to={`/roles/${row.id}`} style={{ textDecoration: 'none' }}>
                <Button
                  size="sm"
                  title="View / Edit Role Details"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 8px' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </Button>
              </Link>
            )}
            {!row.is_system_role && (!isTenant || row.tenant_id) && (
              <Button
                type="secondary"
                size="sm"
                onClick={() => openEditModal(row)}
                title="Edit role name and description"
                style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </Button>
            )}
            <Button
              type="ghost"
              size="sm"
              onClick={() => handleOpenPerms(row)}
              disabled={row.role_name === 'Super Admin' || (isTenant && !row.tenant_id)}
              title={
                row.role_name === 'Super Admin'
                  ? "Super Admin permissions are locked for system safety"
                  : (isTenant && !row.tenant_id)
                    ? "Global template permissions are locked and read-only"
                    : "Edit Permissions"
              }
              style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </Button>
            {!row.is_system_role && (!isTenant || row.tenant_id) && (
              <Button 
                type="ghost" 
                size="sm" 
                onClick={() => setRoleToDelete(row.id)}
                title="Delete Role"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 8px' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', color: 'var(--danger)' }}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
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
        footer={<>
          <Button type="secondary" onClick={() => setIsPermsModalOpen(false)}>Cancel</Button>
          <Button onClick={() => setIsUpdateConfirmOpen(true)}>Update Permissions</Button>
        </>}
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

              {/* Tenant-wide permissions (temporarily hidden) */}
              {false && groupedPermissions[module].all.length > 0 && (
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
          <textarea
            label="Description"
            name="description"
            placeholder="Brief description of what this role can do"
            value={formik.values.description}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.description}
            touched={formik.touched.description}
            style={{
              width: '100%',
              padding: '10px 12px',
              minHeight: '80px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              backgroundColor: '#fff',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              color: 'var(--text-main)'
            }}
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

      <ConfirmModal
        isOpen={isUpdateConfirmOpen}
        onClose={() => setIsUpdateConfirmOpen(false)}
        onConfirm={handleUpdatePermissions}
        title="Update Permissions"
        message={`Are you sure you want to update the permissions for the role "${selectedRole?.role_name}"?`}
      />

      {/* ─── Edit Role Modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!editingRole}
        onClose={() => setEditingRole(null)}
        title="Edit Role"
        footer={<>
          <Button type="secondary" onClick={() => setEditingRole(null)}>Cancel</Button>
          <Button onClick={editFormik.handleSubmit} disabled={editFormik.isSubmitting}>
            {editFormik.isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </>}
      >
        <form onSubmit={editFormik.handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Role Name"
            name="role_name"
            placeholder="e.g. manager or tenant-operator"
            value={editFormik.values.role_name}
            onChange={editFormik.handleChange}
            onBlur={editFormik.handleBlur}
            error={editFormik.errors.role_name}
            touched={editFormik.touched.role_name}
            required
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Description</label>
            <textarea
              name="description"
              placeholder="Brief description of what this role can do"
              value={editFormik.values.description}
              onChange={editFormik.handleChange}
              onBlur={editFormik.handleBlur}
              style={{
                width: '100%',
                padding: '10px 12px',
                minHeight: '90px',
                borderRadius: '12px',
                border: `1px solid ${editFormik.touched.description && editFormik.errors.description ? 'var(--danger)' : 'var(--border)'}`,
                fontSize: '13px',
                backgroundColor: '#fff',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                color: 'var(--text-main)',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => {
                editFormik.handleBlur(e);
                e.target.style.borderColor = editFormik.errors.description ? 'var(--danger)' : 'var(--border)';
              }}
            />
            {editFormik.touched.description && editFormik.errors.description && (
              <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{editFormik.errors.description}</span>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
