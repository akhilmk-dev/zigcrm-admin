import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input } from '../components/common/Modal';
import { usePermission } from '../hooks/usePermission';

export default function Users() {
  const { hasPermission, user: loggedInUser } = usePermission();

  const isSuperAdmin = loggedInUser?.isSuperAdmin;
  const isAdmin = loggedInUser?.isAdmin;
  const isGlobalAdmin = isSuperAdmin || isAdmin;

  // ─── List State ──────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewScope, setViewScope] = useState('tenant'); // 'platform' | 'tenant'
  const [filterTenantId, setFilterTenantId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);

  // ─── Dropdown Data ───────────────────────────────────────────────────────────
  const [tenants, setTenants] = useState([]);          // For filter bar + modal
  const [allRoles, setAllRoles] = useState([]);        // Unified roles list

  // ─── Modal State ─────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: '',
    target_tenant_id: '',
  });
  const [formRolesLoading, setFormRolesLoading] = useState(false);

  // ─── Debounce ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 500);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Load Tenants (once, for Global Admins) ──────────────────────────────────
  useEffect(() => {
    if (isGlobalAdmin) {
      api.get('/tenants').then(res => setTenants(res.data.data || [])).catch(() => {});
    }
  }, [isGlobalAdmin]);

  // ─── Load Unified Roles ──────────────────────────────────────────────────────
  const loadRoles = async () => {
    setFormRolesLoading(true);
    try {
      // Get all roles for internal filtering
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
      const params = new URLSearchParams({ page, limit: pageSize });
      if (isGlobalAdmin) params.append('scope', viewScope);
      if (filterTenantId) params.append('tenant_id', filterTenantId);
      if (debouncedSearch) params.append('search', debouncedSearch);

      const res = await api.get(`/users?${params.toString()}`);
      setUsers(res.data.data || []);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error('Fetch Users Error:', err);
    } finally {
      setLoading(false);
    }
  }, [viewScope, filterTenantId, page, debouncedSearch, isGlobalAdmin, pageSize]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ─── Modal Open/Close ─────────────────────────────────────────────────────────
  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role_id: user.role_id || '',
        target_tenant_id: user.tenant_id || '',
      });
    } else {
      setEditingUser(null);
      const defaultTenantId = !isGlobalAdmin ? loggedInUser?.tenantId : '';
      setFormData({ 
        name: '', 
        email: '', 
        password: '', 
        role_id: '', 
        target_tenant_id: defaultTenantId || '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditingUser(null); };

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        scope: viewScope,
        name: formData.name,
        email: formData.email,
        role_id: formData.role_id,
        target_tenant_id: formData.target_tenant_id || loggedInUser?.tenantId,
      };

      if (formData.password) payload.password = formData.password;

      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, payload);
      } else {
        await api.post('/users', payload);
      }

      handleCloseModal();
      fetchUsers();
    } catch (err) {
      console.error('Save User Error:', err);
      alert(err.response?.data?.error || 'Failed to save user');
    }
  };

  const toggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/users/${user.id}/status`, { status: newStatus });
      fetchUsers();
    } catch (err) {
      console.error('Status Update Error:', err);
    }
  };

  // ─── Table Columns ────────────────────────────────────────────────────────────
  const columns = [
    {
      header: 'Name',
      key: 'name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #818cf8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px', flexShrink: 0 }}>
            {(row.name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '14px' }}>{row.name}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Role',
      key: 'role',
      render: (row) => (
        <Badge type="primary">
          {row.roles?.role_name || row.role || '—'}
        </Badge>
      )
    },
    ...(isGlobalAdmin && viewScope === 'tenant' ? [{
      header: 'Company',
      key: 'company',
      render: (row) => <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{row.tenants?.tenant_name || '—'}</span>
    }] : []),
    {
      header: 'Status',
      key: 'status',
      render: (row) => <Badge type={row.status === 'active' ? 'success' : 'danger'}>{row.status}</Badge>
    },
  ];

  // Filtering roles based on context
  const filteredRoles = allRoles.filter(r => {
    if (viewScope === 'tenant') {
        return r.role_name.startsWith('tenant-');
    } else {
        return !r.role_name.startsWith('tenant-');
    }
  });

  const isAddingPlatformUser = viewScope === 'platform' && isSuperAdmin;
  const modalTitle = editingUser
    ? `Edit ${isAddingPlatformUser ? 'Platform Admin' : 'Tenant User'}`
    : `Add ${isAddingPlatformUser ? 'Platform Admin' : 'Tenant User'}`;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>User Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Manage access, roles, and account status.</p>
        </div>
        {hasPermission('users.manage') && (
          <Button onClick={() => handleOpenModal()}>
            + Add {isAddingPlatformUser ? 'Platform Admin' : 'Tenant User'}
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Scope Toggle — Super Admin ONLY sees this */}
          {isSuperAdmin && (
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
              {['platform', 'tenant'].map(scope => (
                <button
                  key={scope}
                  onClick={() => { setViewScope(scope); setFilterTenantId(''); setSearch(''); setPage(1); }}
                  style={{
                    padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: '600', transition: 'all 0.2s',
                    backgroundColor: viewScope === scope ? '#fff' : 'transparent',
                    color: viewScope === scope ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: viewScope === scope ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {scope === 'platform' ? '🛡️ Platform Admins' : '🏢 Tenant Users'}
                </button>
              ))}
            </div>
          )}

          {/* Company Filter — Global Admins when viewing tenant users */}
          {isGlobalAdmin && viewScope === 'tenant' && (
            <select
              value={filterTenantId}
              onChange={(e) => { setFilterTenantId(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="">All Companies</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.tenant_name}</option>)}
            </select>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '300px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '14px' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
          />
        </div>
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
        actions={(row) => (
          <div style={{ display: 'flex', gap: '8px' }}>
            {hasPermission('users.manage') && (
              <Button size="sm" type="secondary" onClick={() => handleOpenModal(row)}>Edit</Button>
            )}
            {hasPermission('users.manage') && (
              <Button type="ghost" size="sm" onClick={() => toggleStatus(row)}>
                <span style={{ color: row.status === 'active' ? 'var(--danger)' : 'var(--success)' }}>
                  {row.status === 'active' ? 'Suspend' : 'Activate'}
                </span>
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
          <Button onClick={handleSubmit}>{editingUser ? 'Save Changes' : 'Create User'}</Button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          <Input label="Full Name" placeholder="Jane Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Email Address" type="email" placeholder="jane@company.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
          <Input
            label={editingUser ? 'Reset Password (blank = no change)' : 'Temporary Password'}
            type="password" placeholder="••••••••"
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            required={!editingUser}
          />

          {/* Company Selector (For Global Admins when viewScope is tenant) */}
          {isGlobalAdmin && viewScope === 'tenant' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Company</label>
              <select
                value={formData.target_tenant_id}
                onChange={e => setFormData({ ...formData, target_tenant_id: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: '#fff', outline: 'none' }}
                required
              >
                <option value="">— Select a Company —</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.tenant_name}</option>)}
              </select>
            </div>
          )}

          {/* Unified Role Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
              Assigned Role
              {formRolesLoading && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>Loading...</span>}
            </label>
            <select
              value={formData.role_id}
              onChange={e => setFormData({ ...formData, role_id: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: '#fff', outline: 'none' }}
              required
              disabled={formRolesLoading}
            >
              <option value="">Select a role</option>
              {filteredRoles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
            </select>
            {filteredRoles.length === 0 && !formRolesLoading && (
              <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px' }}>
                ⚠️ No suitable roles found. Roles starting with <code>tenant-</code> are only for tenant users.
              </p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
