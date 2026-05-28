import React, { useState, useEffect, useCallback } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useSearchParams, Link } from 'react-router-dom';
import api, { FILE_BASE_URL, getFileUrl } from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select, ConfirmModal } from '../components/common/Modal';
import { usePermission } from '../hooks/usePermission';
import { toast } from 'react-hot-toast';

export default function Users() {
  const { hasPermission, user: loggedInUser } = usePermission();

  const isSuperAdmin = loggedInUser?.isSuperAdmin;
  const isAdmin = loggedInUser?.isAdmin;
  const isGlobalAdmin = isSuperAdmin || isAdmin;
  const isPlatformAdmin = isGlobalAdmin;

  if (!isPlatformAdmin && !hasPermission('users.manage')) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '400px', lineHeight: '1.6' }}>
          This area is restricted to Platform Administrators. If you believe this is an error, please contact your system provider.
        </p>
        <Button style={{ marginTop: '32px' }} onClick={() => window.location.href = '/'}>Return to Dashboard</Button>
      </div>
    );
  }

  // ─── List State ──────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewScope, setViewScope] = useState('tenant'); // 'platform' | 'tenant'
  const [filterTenantId, setFilterTenantId] = useState('');
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // ─── Dropdown Data ───────────────────────────────────────────────────────────
  const [tenants, setTenants] = useState([]);          // For filter bar + modal
  const [allRoles, setAllRoles] = useState([]);        // Unified roles list
  const [formRolesLoading, setFormRolesLoading] = useState(false);

  // ─── Modal State ─────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      password: '',
      re_password: '',
      role_id: '',
      target_tenant_id: '',
      status: 'active',
      profile_image_url: '',
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Full name is required'),
      email: Yup.string().email('Invalid email address').required('Email is required'),
      password: editingUser
        ? Yup.string().test('min-6', 'Password must be at least 6 characters', val => !val || val.length >= 6)
        : Yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
      re_password: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .when('password', {
          is: (val) => val && val.length > 0,
          then: (schema) => schema.required('Please confirm your new password'),
          otherwise: (schema) => schema.notRequired()
        }),
      role_id: Yup.string().required('Role is required'),
      target_tenant_id: Yup.string().when('viewScope', {
        is: () => viewScope === 'tenant' && isGlobalAdmin,
        then: (schema) => schema.required('Company assignment is required')
      })
    }),
    onSubmit: async (values) => {
      try {
        const payload = {
          scope: viewScope,
          name: values.name,
          email: values.email,
          role_id: values.role_id,
          target_tenant_id: values.target_tenant_id || loggedInUser?.tenantId,
          status: values.status,
          profile_image_url: values.profile_image_url,
        };

        if (values.password) payload.password = values.password;

        if (editingUser) {
          await api.patch(`/users/${editingUser.id}`, payload);
          toast.success('User updated successfully');
        } else {
          await api.post('/users', payload);
          toast.success('User created successfully');
        }

        handleCloseModal();
        fetchUsers();
      } catch (err) {
        console.error('Save User Error:', err);
      }
    }
  });

  // ─── Debounce ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 500);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Load Tenants (once, for Global Admins) ──────────────────────────────────
  useEffect(() => {
    if (isGlobalAdmin) {
      api.get('/tenants/selection').then(res => setTenants(res.data || [])).catch(() => { });
    }
  }, [isGlobalAdmin]);

  // ─── Load Unified Roles ──────────────────────────────────────────────────────
  const loadRoles = async () => {
    setFormRolesLoading(true);
    try {
      const res = await api.get('/roles?limit=1000');
      setAllRoles(res.data.data || []);
    } catch (err) {
      console.error('Load Roles Error:', err);
    } finally {
      setFormRolesLoading(false);
    }
  };

  useEffect(() => { loadRoles(); }, []);

  // ─── Load Users (filtered) ───────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pageSize,
        sortField,
        sortOrder
      });
      if (isGlobalAdmin) params.append('scope', viewScope);
      if (filterTenantId) params.append('tenant_id', filterTenantId);
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/users?${params.toString()}`);
      setUsers(res.data.data || []);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error('Fetch Users Error:', err);
    } finally {
      setLoading(false);
    }
  }, [viewScope, filterTenantId, page, debouncedSearch, statusFilter, isGlobalAdmin, pageSize, sortField, sortOrder]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        sortField,
        sortOrder,
        export: 'true'
      });
      if (isGlobalAdmin) params.append('scope', viewScope);
      if (filterTenantId) params.append('tenant_id', filterTenantId);
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);

      toast.loading('Exporting users...', { id: 'export-users' });
      const response = await api.get(`/users?${params.toString()}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Users exported successfully', { id: 'export-users' });
    } catch (err) {
      console.error("Export users failed", err);
      toast.error('Failed to export users', { id: 'export-users' });
    }
  };

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Handle global search from navbar
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch !== null) {
      setSearch(urlSearch);
      setDebouncedSearch(urlSearch);
    } else {
      setSearch('');
      setDebouncedSearch('');
    }
    setPage(1);
  }, [searchParams]);

  // ─── Modal Open/Close ─────────────────────────────────────────────────────────
  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      formik.resetForm({
        values: {
          name: user.name,
          email: user.email,
          password: '',
          re_password: '',
          role_id: user.role_id || '',
          target_tenant_id: user.tenant_id || '',
          status: user.status || 'active',
          profile_image_url: user.profile_image_url || '',
        }
      });
    } else {
      setEditingUser(null);
      const defaultTenantId = !isGlobalAdmin ? loggedInUser?.tenantId : '';
      formik.resetForm({
        values: {
          name: '',
          email: '',
          password: '',
          re_password: '',
          role_id: '',
          target_tenant_id: defaultTenantId || '',
          status: 'active',
          profile_image_url: ''
        }
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditingUser(null); };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await api.delete(`/users/${userToDelete.id}`);
      toast.success('User deleted successfully');
      fetchUsers();
      setDeleteConfirmOpen(false);
    } catch (err) {
      console.error('Delete User Error:', err);
    } finally {
      setIsDeletingUser(false);
    }
  };

  const toggleStatus = (user) => {
    setUserToToggle(user);
    setStatusConfirmOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!userToToggle) return;
    setIsUpdatingStatus(true);
    const newStatus = userToToggle.status === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/users/${userToToggle.id}/status`, { status: newStatus });
      toast.success(`User account ${newStatus === 'active' ? 'activated' : 'suspended'}`);
      fetchUsers();
      setStatusConfirmOpen(false);
    } catch (err) {
      console.error('Status Update Error:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!formik.values.password) {
      toast.error('Please enter a new password');
      return;
    }
    if (formik.values.password !== formik.values.re_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (formik.values.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setPasswordConfirmOpen(true);
  };

  const confirmPasswordUpdate = async () => {
    setIsUpdatingPassword(true);
    try {
      await api.patch(`/users/${editingUser.id}`, { password: formik.values.password });
      toast.success('Password updated successfully');
      setPasswordConfirmOpen(false);
      handleCloseModal();
      fetchUsers();
    } catch (err) {
      console.error('Password Update Error:', err);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // ─── Table Columns ────────────────────────────────────────────────────────────
  const columns = [
    {
      header: 'Name',
      key: 'name',
      sortKey: 'name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to={`/users/${row.id}`} style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)',
            flexShrink: 0,
            cursor: 'pointer',
            textDecoration: 'none'
          }}>
            {row.profile_image_url ? (
              <img src={getFileUrl(row.profile_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                {(row.name || 'U')[0].toUpperCase()}
              </span>
            )}
          </Link>
          <Link to={`/users/analytics?userId=${row.id}`} style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
            <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '14px', display: 'block' }}>
              {row.name}
            </span>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{row.email}</p>
          </Link>
        </div>
      )
    },
    {
      header: 'Role',
      key: 'role',
      sortKey: 'roles(role_name)',
      render: (row) => (
        <Badge type="primary">
          {row.roles?.role_name || row.role || '—'}
        </Badge>
      )
    },
    ...(isGlobalAdmin && viewScope === 'tenant' ? [{
      header: 'Company',
      key: 'company',
      render: (row) => <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{row.tenant_name || '—'}</span>
    }] : []),
    {
      header: 'Status',
      key: 'status',
      sortKey: 'status',
      render: (row) => <Badge type={row.status === 'active' ? 'success' : 'danger'}>{row.status}</Badge>
    },
  ];

  // Filtering roles based on context
  const filteredRoles = allRoles.filter(r => {
    if (viewScope === 'tenant') {
      return r.role_name.startsWith('tenant-');
    } else {
      // Exclude tenant- prefixed roles AND the literal "Tenant" role for platform admins
      return !r.role_name.startsWith('tenant-') && r.role_name !== 'Tenant';
    }
  });

  const isAddingPlatformUser = viewScope === 'platform' && isSuperAdmin;
  const modalTitle = editingUser
    ? `Edit ${isAddingPlatformUser ? 'Platform Admin' : 'Tenant User'}`
    : `Add ${isAddingPlatformUser ? 'Platform Admin' : 'Tenant User'}`;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>User Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>Manage access, roles, and account status.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button type="secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </Button>
          {hasPermission('users.manage') && (
            <Button onClick={() => handleOpenModal()}>
              + Add {isAddingPlatformUser ? 'Platform Admin' : 'Tenant User'}
            </Button>
          )}
        </div>
      </div>
      {/* Sticky Filter Bar */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        padding: '16px 20px',
        margin: '0 0 20px 0',
        display: 'flex',
        width: '100%',
        boxSizing: 'border-box',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'flex-end'
      }}>
        {/* Scope Toggle — Super Admin ONLY sees this */}
        {isSuperAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>View Scope</span>
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px', height: '38px', alignItems: 'center' }}>
              {['platform', 'tenant'].map(scope => (
                <button
                  key={scope}
                  onClick={() => { setViewScope(scope); setFilterTenantId(''); setSearch(''); setPage(1); }}
                  style={{
                    padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    fontSize: '12px', fontWeight: '600', transition: 'all 0.2s',
                    backgroundColor: viewScope === scope ? '#fff' : 'transparent',
                    color: viewScope === scope ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: viewScope === scope ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {scope === 'platform' ? '🛡️ Platform Admins' : '🏢 Tenant Users'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Company Filter — Global Admins when viewing tenant users */}
        {isGlobalAdmin && viewScope === 'tenant' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filter by Company</span>
            <select
              value={filterTenantId}
              onChange={(e) => { setFilterTenantId(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', height: '38px', minWidth: '180px', cursor: 'pointer' }}
            >
              <option value="">All Companies</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.owner_name || t.tenant_name || t.name || 'Unknown Company'}</option>)}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', height: '38px', minWidth: '140px', cursor: 'pointer' }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Search Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '280px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search</span>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 32px 10px 36px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', transition: 'border-color 0.2s', height: '38px' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#334155', padding: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Restore Button */}
        {(() => {
          const hasFilters = !!(filterTenantId || statusFilter || search);
          return (
            <button
              title={hasFilters ? 'Clear all filters' : 'No active filters'}
              onClick={() => {
                if (!hasFilters) return;
                setFilterTenantId('');
                setStatusFilter('');
                setSearch('');
                setPage(1);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                border: `1px solid ${hasFilters ? '#f87171' : 'var(--border)'}`,
                backgroundColor: hasFilters ? '#fff1f2' : '#f8fafc',
                color: hasFilters ? '#dc2626' : '#cbd5e1',
                cursor: hasFilters ? 'pointer' : 'default',
                transition: 'all 0.2s',
                alignSelf: 'flex-end'
              }}
              onMouseOver={(e) => { if (hasFilters) e.currentTarget.style.backgroundColor = '#fee2e2'; }}
              onMouseOut={(e) => { if (hasFilters) e.currentTarget.style.backgroundColor = '#fff1f2'; }}
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
        data={users}
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
            {hasPermission('users.manage') && (
              <Button
                size="sm"
                type="secondary"
                onClick={() => handleOpenModal(row)}
                title="Edit User"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 8px' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </Button>
            )}
            {hasPermission('users.manage') && row.user_type !== 'platform' && (
              <Button
                type="ghost"
                size="sm"
                onClick={() => toggleStatus(row)}
                title={row.status === 'active' ? "Suspend User" : "Activate User"}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 8px' }}
              >
                {row.status === 'active' ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', color: 'var(--danger)' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', color: 'var(--success)' }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
              </Button>
            )}
            {hasPermission('users.manage') && row.user_type !== 'platform' && row.id !== loggedInUser?.id && (
              <Button
                type="ghost"
                size="sm"
                onClick={() => handleDeleteUser(row)}
                title="Delete User"
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

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalTitle}
        footer={<>
          <Button type="secondary" onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={formik.handleSubmit} disabled={formik.isSubmitting}>
            {editingUser ? (formik.isSubmitting ? 'Saving...' : 'Save Changes') : (formik.isSubmitting ? 'Creating...' : 'Create User')}
          </Button>
        </>}
      >
        <form onSubmit={formik.handleSubmit}>
          {/* Profile Image Upload */}
          <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '20px',
              backgroundColor: 'var(--bg-muted)',
              border: '2px dashed var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {formik.values.profile_image_url ? (
                <img src={getFileUrl(formik.values.profile_image_url)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '32px' }}>👤</span>
              )}
              <input
                type="file"
                accept="image/*"
                style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                onChange={async (e) => {
                  const file = e.currentTarget.files[0];
                  if (file) {
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const res = await api.post('/upload', formData);
                      formik.setFieldValue('profile_image_url', res.data.url);
                    } catch (err) {
                      console.error("Upload failed", err);
                    }
                  }
                }}
              />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>Click to upload user avatar</p>
          </div>

          <Input
            label="Full Name"
            name="name"
            placeholder="Jane Doe"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.name}
            touched={formik.touched.name}
            required
          />
          <Input
            label="Email Address"
            name="email"
            type="email"
            placeholder="jane@company.com"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.email}
            touched={formik.touched.email}
            required
          />
          {/* Role and Company details moved up, Passwords moved down */}

          {/* Company Selector (For Global Admins when viewScope is tenant) */}
          {isGlobalAdmin && viewScope === 'tenant' && (
            <Select
              label="Company"
              name="target_tenant_id"
              value={formik.values.target_tenant_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.target_tenant_id}
              touched={formik.touched.target_tenant_id}
              required
            >
              <option value="">— Select a Company —</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.owner_name || t.tenant_name || t.name || 'Unknown Company'}</option>)}
            </Select>
          )}

          {/* Unified Role Selector */}
          <Select
            label="Assigned Role"
            name="role_id"
            value={formik.values.role_id}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.role_id}
            touched={formik.touched.role_id}
            required
            disabled={formRolesLoading}
          >
            <option value="">Select a role</option>
            {filteredRoles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
          </Select>
          {filteredRoles.length === 0 && !formRolesLoading && (
            <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '-12px', marginBottom: '16px' }}>
              ⚠️ No suitable roles found. Roles starting with <code>tenant-</code> are only for tenant users.
            </p>
          )}

          {/* Account Status */}
          <Select
            label="Account Status"
            name="status"
            value={formik.values.status}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            required
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </Select>

          {/* Password Section - Bottom Placement + Conditional Rendering */}
          {(!editingUser || hasPermission('users.change_password')) && (
            <div style={{
              marginTop: '24px',
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editingUser ? '🔐 Security & Password' : '🔑 Initial Access'}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input
                  label={editingUser ? 'New Password' : 'Temporary Password'}
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.errors.password}
                  touched={formik.touched.password}
                  required={!editingUser}
                />
                <Input
                  label="Confirm Password"
                  name="re_password"
                  type="password"
                  placeholder="••••••••"
                  value={formik.values.re_password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.errors.re_password}
                  touched={formik.touched.re_password}
                  required={!editingUser}
                />
              </div>

              {editingUser && (
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="primary"
                    size="sm"
                    onClick={(e) => { e.preventDefault(); handlePasswordChange(); }}
                    style={{ border: '1px solid rgba(255, 255, 255, 0.4)' }}
                  >
                    Change Password
                  </Button>
                </div>
              )}
            </div>
          )}
        </form>
      </Modal>

      <ConfirmModal
        isOpen={passwordConfirmOpen}
        onClose={() => setPasswordConfirmOpen(false)}
        onConfirm={confirmPasswordUpdate}
        title="Confirm Password Change"
        message="Are you sure you want to change this user's password? The user will need to use the new password for their next login."
        confirmLabel={isUpdatingPassword ? "Updating..." : "Yes, Change Password"}
        type="danger"
        disabled={isUpdatingPassword}
      />

      <ConfirmModal
        isOpen={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusChange}
        title={`Confirm Account ${userToToggle?.status === 'active' ? 'Suspension' : 'Activation'}`}
        message={`Are you sure you want to ${userToToggle?.status === 'active' ? 'suspend' : 'activate'} this user account (${userToToggle?.email})?`}
        confirmLabel={isUpdatingStatus ? "Updating..." : `Yes, ${userToToggle?.status === 'active' ? 'Suspend' : 'Activate'}`}
        type={userToToggle?.status === 'active' ? "danger" : "primary"}
        disabled={isUpdatingStatus}
      />

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm Delete Account"
        message={`Are you sure you want to permanently delete user account (${userToDelete?.email})? This action is irreversible.`}
        confirmLabel={isDeletingUser ? "Deleting..." : "Yes, Delete Account"}
        type="danger"
        disabled={isDeletingUser}
      />
    </div>
  );
}
