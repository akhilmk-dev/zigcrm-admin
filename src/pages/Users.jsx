import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useSearchParams, Link } from 'react-router-dom';
import api, { FILE_BASE_URL, getFileUrl } from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input, ConfirmModal } from '../components/common/Modal';
import { FormSelect } from '../components/common/FormSelect';
import { usePermission } from '../hooks/usePermission';
import { toast } from 'react-hot-toast';
import { countries } from '../constants/countries';
import { isValidPhoneNumber } from 'libphonenumber-js';

function SearchableCountryCodeSelect({ value, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
          {label}
        </label>
      )}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '10px 12px',
          borderRadius: '12px',
          border: `1px solid ${isOpen ? 'var(--primary)' : 'var(--border)'}`,
          backgroundColor: '#fff',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '38px',
          boxSizing: 'border-box',
          color: 'var(--text-main)',
          transition: 'all 0.2s',
          boxShadow: isOpen ? '0 0 0 2px rgba(99, 102, 241, 0.15)' : 'none'
        }}
      >
        <span style={{ fontWeight: '600' }}>{value}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.6 }}>
          <path d="M1 1l4 4 4-4" />
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          width: '280px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          zIndex: 99999,
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxSizing: 'border-box'
        }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search code or country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '6px 8px 6px 26px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{
            maxHeight: '180px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            paddingRight: '2px'
          }}>
            {filteredCountries.length === 0 ? (
              <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>No results</div>
            ) : (
              filteredCountries.map((c, idx) => (
                <div
                  key={`${c.name}-${c.code}-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(c.code);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: value === c.code ? 'var(--bg-muted)' : 'transparent',
                    color: value === c.code ? 'var(--primary)' : 'var(--text-main)',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = value === c.code ? 'var(--bg-muted)' : 'transparent';
                  }}
                >
                  <span style={{ fontWeight: '500' }}>{c.name}</span>
                  <span style={{ fontWeight: '600', opacity: 0.8 }}>{c.code}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateError, setDateError] = useState('');
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


  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      phoneCode: '+91',
      phone: '',
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
      phone: Yup.string()
        .required('Phone number is required')
        .test('is-valid-phone', 'Invalid phone number for the selected country', function (value) {
          if (!value) return false;
          const { phoneCode } = this.parent;
          const fullNumber = `${phoneCode}${value.replace(/[\s()-]/g, '')}`;
          try {
            return isValidPhoneNumber(fullNumber);
          } catch (e) {
            return false;
          }
        }),
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
          phone: `${values.phoneCode}${values.phone.replace(/[\s()-]/g, '')}`,
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
      if (fromDate && !dateError) params.append('from_date', fromDate);
      if (toDate && !dateError) params.append('to_date', toDate);

      const res = await api.get(`/users?${params.toString()}`);
      setUsers(res.data.data || []);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error('Fetch Users Error:', err);
    } finally {
      setLoading(false);
    }
  }, [viewScope, filterTenantId, page, debouncedSearch, statusFilter, fromDate, toDate, dateError, isGlobalAdmin, pageSize, sortField, sortOrder]);

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

      let matchedCode = '+91';
      let matchedPhone = user.phone || '';
      if (user.phone && user.phone.startsWith('+')) {
        const sortedCountries = [...countries].sort((a, b) => b.code.length - a.code.length);
        const foundCountry = sortedCountries.find(c => user.phone.startsWith(c.code));
        if (foundCountry) {
          matchedCode = foundCountry.code;
          matchedPhone = user.phone.substring(foundCountry.code.length);
        }
      }

      formik.resetForm({
        values: {
          name: user.name,
          email: user.email,
          phoneCode: matchedCode,
          phone: matchedPhone,
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
          phoneCode: '+91',
          phone: '',
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

  // ─── Table Columns ────────────────────────────────────────────────────────────
  const avatarPalettes = [
    { bg: '#dbeafe', color: '#1d4ed8' },
    { bg: '#dcfce7', color: '#15803d' },
    { bg: '#fce7f3', color: '#be185d' },
    { bg: '#fef9c3', color: '#854d0e' },
    { bg: '#ede9fe', color: '#6d28d9' },
    { bg: '#ffedd5', color: '#c2410c' },
    { bg: '#f0f9ff', color: '#0369a1' },
    { bg: '#f1f5f9', color: '#475569' },
  ];

  const columns = [
    {
      header: 'User',
      key: 'name',
      sortKey: 'name',
      render: (row) => {
        const initial = (row.name || 'U')[0].toUpperCase();
        const palette = avatarPalettes[initial.charCodeAt(0) % avatarPalettes.length];
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link to={`/users/${row.id}`} style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: row.profile_image_url ? 'transparent' : palette.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              textDecoration: 'none'
            }}>
              {row.profile_image_url ? (
                <img src={getFileUrl(row.profile_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '13px', fontWeight: '700', color: palette.color }}>{initial}</span>
              )}
            </Link>
            <Link to={`/users/analytics?userId=${row.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px', display: 'block' }}>{row.name}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.email}</span>
            </Link>
          </div>
        );
      }
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
      header: 'Created Date',
      key: 'created_at',
      sortKey: 'created_at',
      render: (row) => {
        if (!row.created_at) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        const d = new Date(row.created_at);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>{day}/{month}/{year}</span>;
      }
    },
    {
      header: 'Status',
      key: 'status',
      sortKey: 'status',
      render: (row) => {
        const isActive = row.status === 'active';
        const isSuspended = row.status === 'suspended';
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'capitalize',
            backgroundColor: isActive ? '#dcfce7' : isSuspended ? '#fee2e2' : '#f1f5f9',
            color: isActive ? '#16a34a' : isSuspended ? '#dc2626' : '#64748b'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isActive ? '#16a34a' : isSuspended ? '#dc2626' : '#94a3b8',
              flexShrink: 0,
              display: 'inline-block'
            }} />
            {row.status}
          </span>
        );
      }
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
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            backgroundColor: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>User Management</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>Manage access, roles, and account status.</p>
          </div>
        </div>
        <div className="page-actions">
          {/* Temporarily hidden Export button */}
          {/* <Button type="secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </Button> */}
          {hasPermission('users.manage') && (
            <Button onClick={() => handleOpenModal()} style={{ borderRadius: '6px' }}>
              + Add {isAddingPlatformUser ? 'Platform Admin' : 'Tenant User'}
            </Button>
          )}
        </div>
      </div>
      {/* Filters & Search Row */}
      <div className="filter-bar" style={{ borderRadius: '6px' }}>
        {/* Scope Toggle — Super Admin ONLY sees this */}
        {isSuperAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>View Scope</span>
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
                    height: '30px', display: 'flex', alignItems: 'center'
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
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Company</span>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                value={filterTenantId}
                onChange={(e) => { setFilterTenantId(e.target.value); setPage(1); }}
                style={{ appearance: 'none', WebkitAppearance: 'none', padding: '8px 36px 8px 12px', borderRadius: '6px', border: '1px solid rgb(203, 213, 225)', fontSize: '13px', outline: 'none', backgroundColor: '#fff', height: '38px', minWidth: '180px', cursor: 'pointer', width: '100%' }}
              >
                <option value="">All Companies</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.owner_name || t.tenant_name || t.name || 'Unknown Company'}</option>)}
              </select>
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
          </div>
        )}

        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Status</span>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ appearance: 'none', WebkitAppearance: 'none', padding: '8px 36px 8px 12px', borderRadius: '6px', border: '1px solid rgb(203, 213, 225)', fontSize: '13px', outline: 'none', backgroundColor: '#fff', height: '38px', minWidth: '150px', cursor: 'pointer', width: '100%' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b', display: 'flex', alignItems: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>
        </div>

        {/* Search Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '220px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Search</span>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 32px 8px 36px', borderRadius: '6px', border: '1px solid rgb(203, 213, 225)', fontSize: '13px', outline: 'none', backgroundColor: '#fff', height: '38px', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
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

        {/* From Date Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>From Date</span>
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => {
              const val = e.target.value;
              setFromDate(val);
              setPage(1);
              if (val && toDate && val > toDate) {
                setDateError('From date cannot be after To date');
              } else {
                setDateError('');
              }
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${dateError ? '#f87171' : 'rgb(203, 213, 225)'}`,
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#fff',
              height: '38px',
              width: '155px',
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* To Date Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>To Date</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => {
              const val = e.target.value;
              setToDate(val);
              setPage(1);
              if (fromDate && val && fromDate > val) {
                setDateError('To date cannot be before From date');
              } else {
                setDateError('');
              }
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${dateError ? '#f87171' : 'rgb(203, 213, 225)'}`,
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#fff',
              height: '38px',
              width: '155px',
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
          />
          {dateError && (
            <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '500', marginTop: '-2px' }}>{dateError}</span>
          )}
        </div>

        {/* Reset Button */}
        {(() => {
          const hasFilters = !!(filterTenantId || statusFilter || search || fromDate || toDate);
          return (
            <button
              title={hasFilters ? 'Clear all filters' : 'No active filters'}
              onClick={() => {
                if (!hasFilters) return;
                setFilterTenantId('');
                setStatusFilter('');
                setSearch('');
                setFromDate('');
                setToDate('');
                setDateError('');
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
              onMouseOut={(e) => { if (hasFilters) e.currentTarget.style.backgroundColor = hasFilters ? '#fff1f2' : '#f8fafc'; }}
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', width: '100%' }}>
            <div style={{ width: '140px', flexShrink: 0 }}>
              <SearchableCountryCodeSelect
                label="Code"
                value={formik.values.phoneCode}
                onChange={(code) => formik.setFieldValue('phoneCode', code)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label="Phone Number"
                name="phone"
                type="text"
                placeholder="e.g. 9876543210"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.errors.phone}
                touched={formik.touched.phone}
                required
              />
            </div>
          </div>
          {/* Role and Company details moved up, Passwords moved down */}

          {/* Company Selector (For Global Admins when viewScope is tenant) */}
          {isGlobalAdmin && viewScope === 'tenant' && (
            <FormSelect
              label="Company"
              name="target_tenant_id"
              value={formik.values.target_tenant_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.target_tenant_id}
              touched={formik.touched.target_tenant_id}
              required
              placeholder="— Select a Company —"
              options={tenants.map(t => ({
                value: t.id,
                label: t.owner_name || t.tenant_name || t.name || 'Unknown Company',
                avatar: (t.owner_name || t.tenant_name || t.name || '?')[0].toUpperCase()
              }))}
            />
          )}

          {/* Unified Role Selector */}
          <FormSelect
            label="Assigned Role"
            name="role_id"
            value={formik.values.role_id}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.role_id}
            touched={formik.touched.role_id}
            required
            disabled={formRolesLoading}
            placeholder="Select a role"
            options={filteredRoles.map(r => ({ value: r.id, label: r.role_name }))}
          />
          {filteredRoles.length === 0 && !formRolesLoading && (
            <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '-12px', marginBottom: '16px' }}>
              ⚠️ No suitable roles found. Roles starting with <code>tenant-</code> are only for tenant users.
            </p>
          )}

          {/* Account Status */}
          <FormSelect
            label="Account Status"
            name="status"
            value={formik.values.status}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            required
            options={[
              { value: 'active', label: 'Active', color: '#10b981' },
              { value: 'inactive', label: 'Inactive', color: '#94a3b8' },
            ]}
          />

          {/* Password Section - Bottom Placement + Conditional Rendering */}
          {(!editingUser || hasPermission('users.change_password') || hasPermission('users.manage') || loggedInUser?.user_type === 'tenant_admin') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <Input
                label={editingUser ? 'New Password' : 'Password'}
                name="password"
                type="password"
                placeholder="••••••••"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.errors.password}
                touched={formik.touched.password}
                required={!editingUser}
                helperText={editingUser ? "Leave blank to keep current password" : undefined}
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
          )}
        </form>
      </Modal>



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
