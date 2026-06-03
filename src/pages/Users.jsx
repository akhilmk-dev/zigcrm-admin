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
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ─── Dropdown Data ───────────────────────────────────────────────────────────
  const [tenants, setTenants] = useState([]);          // For filter bar + modal
  const [allRoles, setAllRoles] = useState([]);        // Unified roles list
  const [formRolesLoading, setFormRolesLoading] = useState(false);

  // ─── Modal State ─────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);


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
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await api.get(`/users?${params.toString()}`);
      setUsers(res.data.data || []);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error('Fetch Users Error:', err);
    } finally {
      setLoading(false);
    }
  }, [viewScope, filterTenantId, page, debouncedSearch, statusFilter, isGlobalAdmin, pageSize, sortField, sortOrder, fromDate, toDate]);

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
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

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

  const handleFromDateChange = (val) => {
    if (toDate && val > toDate) {
      toast.error('From Date cannot be greater than To Date');
      return;
    }
    setFromDate(val);
    setPage(1);
  };

  const handleToDateChange = (val) => {
    if (fromDate && val < fromDate) {
      toast.error('To Date cannot be less than From Date');
      return;
    }
    setToDate(val);
    setPage(1);
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
    const newStatus = userToToggle.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/users/${userToToggle.id}/status`, { status: newStatus });
      toast.success(`User account ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchUsers();
      setStatusConfirmOpen(false);
    } catch (err) {
      console.error('Status Update Error:', err);
    } finally {
      setIsUpdatingStatus(false);
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
      header: 'Created Date',
      key: 'created_at',
      sortKey: 'created_at',
      render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'
    },
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date)) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startRange = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRange = Math.min(page * pageSize, totalCount);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#1e293b' }}>
      <style>
        {`
          .custom-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 16px;
          }
          .custom-title-section h1 {
            font-size: 28px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
            font-family: Inter, sans-serif;
          }
          .custom-title-section p {
            font-size: 14px;
            color: #64748b;
            margin: 4px 0 0 0;
          }
          .btn-add-tenant {
            background-color: #1d4ed8;
            color: #ffffff;
            font-size: 14px;
            font-weight: 600;
            padding: 10px 20px;
            border-radius: 8px;
            border: none;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(29, 78, 216, 0.15);
            transition: all 0.2s ease;
          }
          .btn-add-tenant:hover {
            background-color: #1e40af;
            box-shadow: 0 6px 16px rgba(29, 78, 216, 0.25);
          }
          .custom-filter-card {
            background: #ffffff;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            padding: 12px 20px;
            margin-bottom: 16px;
            display: flex;
            gap: 12px;
            align-items: flex-end;
            flex-wrap: wrap;
          }
          @media (max-width: 768px) {
            .custom-filter-card {
              flex-direction: column;
              align-items: stretch;
            }
          }
          .filter-field-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .filter-field-group label {
            font-size: 13px;
            font-weight: 600;
            color: #334155;
          }
          .custom-select-wrapper {
            position: relative;
            display: flex;
            align-items: center;
          }
          .custom-select {
            width: 100%;
            height: 38px;
            padding: 6px 32px 6px 12px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background-color: #ffffff;
            font-size: 14px;
            color: #334155;
            outline: none;
            cursor: pointer;
            appearance: none;
            min-width: 140px;
          }
          .custom-select-arrow {
            position: absolute;
            right: 12px;
            pointer-events: none;
            color: #64748b;
            display: flex;
            align-items: center;
          }
          .custom-input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            width: 100%;
          }
          .custom-input-icon {
            position: absolute;
            left: 14px;
            pointer-events: none;
            color: #94a3b8;
            display: flex;
            align-items: center;
          }
          .custom-input-search {
            width: 100%;
            height: 38px;
            padding: 6px 12px 6px 42px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background-color: #ffffff;
            font-size: 14px;
            color: #334155;
            outline: none;
            box-sizing: border-box;
          }
          .filter-field-group-search {
            flex-grow: 1;
            min-width: 280px;
          }
          @media (max-width: 768px) {
            .custom-input-search {
              width: 100%;
            }
          }
          .custom-input-date-wrapper {
            position: relative;
            display: flex;
            align-items: center;
          }
          .custom-input-date {
            width: 170px;
            height: 38px;
            padding: 6px 40px 6px 12px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background-color: #ffffff;
            font-size: 14px;
            color: #334155;
            outline: none;
            cursor: pointer;
          }
          @media (max-width: 768px) {
            .custom-input-date {
              width: 100%;
            }
          }
          .custom-input-date::-webkit-calendar-picker-indicator {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            opacity: 0;
            width: 20px;
            height: 20px;
            cursor: pointer;
            z-index: 2;
          }
          .custom-date-icon {
            position: absolute;
            right: 12px;
            pointer-events: none;
            color: #64748b;
            display: flex;
            align-items: center;
            z-index: 1;
          }
          .btn-reset-filters {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            background-color: #ffffff;
            color: #1d4ed8;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .btn-reset-filters:hover {
            background-color: #f8fafc;
            border-color: #94a3b8;
          }
          .table-container-card {
            background: #ffffff;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            margin-bottom: 16px;
          }
          .table-scroll-wrapper {
            overflow-x: auto;
            width: 100%;
          }
          .pixel-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          .pixel-table th {
            background-color: #f8fafc;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 600;
            color: #475569;
            border-bottom: 1px solid #e2e8f0;
            white-space: nowrap;
          }
          .pixel-table td {
            padding: 10px 16px;
            font-size: 14px;
            color: #334155;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
            white-space: nowrap;
          }
          .pixel-table tr:last-child td {
            border-bottom: none;
          }
          .user-profile-cell {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .avatar-circle-letter {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background-color: #eff6ff;
            color: #1d4ed8;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 15px;
          }
          .avatar-circle-image {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            object-fit: cover;
          }
          .user-name-info {
            display: flex;
            flex-direction: column;
          }
          .user-name-info .name {
            font-weight: 600;
            color: #0f172a;
          }
          .user-name-info .email {
            font-size: 12px;
            color: #64748b;
            margin-top: 2px;
          }
          .role-pill-badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            background-color: #eff6ff;
            color: #1d4ed8;
          }
          .status-active-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            background-color: #f0fdf4;
            color: #16a34a;
          }
          .status-inactive-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            background-color: #f8fafc;
            color: #64748b;
          }
          .status-suspended-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            background-color: #fef2f2;
            color: #dc2626;
          }
          .action-btn-box {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
            background-color: #ffffff;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .action-btn-box:hover {
            background-color: #f8fafc;
            border-color: #94a3b8;
          }
          .pagination-footer {
            padding: 16px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
          }
          .footer-stats {
            font-size: 14px;
            color: #475569;
          }
          .footer-pagination-controls {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .rows-per-page-container {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #475569;
          }
          .rows-per-page-select {
            height: 32px;
            padding: 4px 24px 4px 8px;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
            background-color: #ffffff;
            font-size: 14px;
            color: #334155;
            outline: none;
            cursor: pointer;
            appearance: none;
          }
          .pagination-btn-group {
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .pag-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
            background-color: #ffffff;
            color: #475569;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .pag-btn:hover:not(.disabled) {
            background-color: #f8fafc;
          }
          .pag-btn.active {
            background-color: #1d4ed8;
            color: #ffffff;
            border-color: #1d4ed8;
          }
          .pag-btn.disabled {
            color: #cbd5e1;
            border-color: #e2e8f0;
            cursor: not-allowed;
          }
        `}
      </style>

      {/* Header */}
      <div className="custom-header">
        <div className="custom-title-section">
          <h1>User Management</h1>
          <p>Manage access, roles, and account status.</p>
        </div>
        {hasPermission('users.manage') && (
          <button className="btn-add-tenant" onClick={() => handleOpenModal()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Tenant User
          </button>
        )}
      </div>

      {/* Filters & Search Row */}
      <div className="custom-filter-card">
        {/* Scope Toggle — Super Admin ONLY sees this */}
        {isSuperAdmin && (
          <div className="filter-field-group">
            <label>View Scope</label>
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', height: '42px', alignItems: 'center' }}>
              {['platform', 'tenant'].map(scope => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => { setViewScope(scope); setFilterTenantId(''); setSearch(''); setPage(1); }}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '12px', fontWeight: '600', transition: 'all 0.2s',
                    backgroundColor: viewScope === scope ? '#fff' : 'transparent',
                    color: viewScope === scope ? '#1d4ed8' : '#64748b',
                    boxShadow: viewScope === scope ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {scope === 'platform' ? '🛡️ Platform' : '🏢 Tenant'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Company Filter — Global Admins when viewing tenant users */}
        {isGlobalAdmin && viewScope === 'tenant' && (
          <div className="filter-field-group">
            <label>Company</label>
            <div className="custom-select-wrapper">
              <select
                className="custom-select"
                value={filterTenantId}
                onChange={(e) => { setFilterTenantId(e.target.value); setPage(1); }}
              >
                <option value="">All Companies</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.owner_name || t.tenant_name || t.name || 'Unknown Company'}</option>)}
              </select>
              <span className="custom-select-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </span>
            </div>
          </div>
        )}

        {/* Status Filter */}
        <div className="filter-field-group">
          <label>Status</label>
          <div className="custom-select-wrapper">
            <select
              className="custom-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            <span className="custom-select-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </span>
          </div>
        </div>

        {/* Search Filter */}
        <div className="filter-field-group filter-field-group-search">
          <label>Search</label>
          <div className="custom-input-wrapper">
            <span className="custom-input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </span>
            <input
              type="text"
              className="custom-input-search"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* From Date Filter */}
        <div className="filter-field-group">
          <label>From Date</label>
          <div className="custom-input-date-wrapper">
            <input
              type="date"
              className="custom-input-date"
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
            />
            <span className="custom-date-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </span>
          </div>
        </div>

        {/* To Date Filter */}
        <div className="filter-field-group">
          <label>To Date</label>
          <div className="custom-input-date-wrapper">
            <input
              type="date"
              className="custom-input-date"
              value={toDate}
              onChange={(e) => handleToDateChange(e.target.value)}
            />
            <span className="custom-date-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </span>
          </div>
        </div>

        {/* Restore Button */}
        <button
          className="btn-reset-filters"
          title="Clear all filters"
          onClick={() => {
            setFilterTenantId('');
            setStatusFilter('');
            setSearch('');
            setFromDate('');
            setToDate('');
            setPage(1);
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
        </button>
      </div>

      {/* Table Card */}
      <div className="table-container-card">
        <div className="table-scroll-wrapper">
          <table className="pixel-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                <th>User</th>
                <th>Role</th>
                <th 
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const newOrder = sortField === 'created_at' && sortOrder === 'asc' ? 'desc' : 'asc';
                    setSortField('created_at');
                    setSortOrder(newOrder);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Created Date
                    <svg 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      style={{ 
                        transform: sortField === 'created_at' && sortOrder === 'asc' ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                        opacity: sortField === 'created_at' ? 1 : 0.4
                      }}
                    >
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <polyline points="19 12 12 19 5 12"></polyline>
                    </svg>
                  </div>
                </th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    No users found matching filters.
                  </td>
                </tr>
              ) : (
                users.map((row, idx) => {
                  const displayIndex = (page - 1) * pageSize + idx + 1;
                  return (
                    <tr key={row.id}>
                      <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 500 }}>
                        {displayIndex}
                      </td>
                      <td>
                        <div className="user-profile-cell">
                          {row.profile_image_url ? (
                            <img className="avatar-circle-image" src={getFileUrl(row.profile_image_url)} alt={row.name} />
                          ) : (
                            <div className="avatar-circle-letter">
                              {(row.name || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="user-name-info">
                            <span className="name">{row.name}</span>
                            <span className="email">{row.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="role-pill-badge">
                          {row.roles?.role_name || row.role || '—'}
                        </span>
                      </td>
                      <td>
                        {formatDate(row.created_at)}
                      </td>
                      <td>
                        {row.status === 'active' ? (
                          <span className="status-active-pill">
                            <span style={{ fontSize: '10px' }}>•</span> Active
                          </span>
                        ) : row.status === 'suspended' ? (
                          <span className="status-suspended-pill">
                            <span style={{ fontSize: '10px' }}>•</span> Suspended
                          </span>
                        ) : (
                          <span className="status-inactive-pill">
                            <span style={{ fontSize: '10px' }}>•</span> Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {hasPermission('users.manage') && (
                            <button
                              className="action-btn-box"
                              onClick={() => handleOpenModal(row)}
                              title="Edit User"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          )}
                          {hasPermission('users.manage') && row.user_type !== 'platform' && (
                            <button
                              className="action-btn-box"
                              onClick={() => toggleStatus(row)}
                              title={row.status === 'active' ? "Deactivate User" : "Activate User"}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                              </svg>
                            </button>
                          )}
                          {hasPermission('users.manage') && row.user_type !== 'platform' && row.id !== loggedInUser?.id && (
                            <button
                              className="action-btn-box"
                              onClick={() => handleDeleteUser(row)}
                              title="Delete User"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="pagination-footer">
          <div className="footer-stats">
            Showing <strong>{startRange}</strong> to <strong>{endRange}</strong> of <strong>{totalCount}</strong> results
          </div>
          
          <div className="footer-pagination-controls">
            <div className="pagination-btn-group">
              <button
                className={`pag-btn ${page === 1 ? 'disabled' : ''}`}
                onClick={() => page > 1 && setPage(1)}
                disabled={page === 1}
              >
                «
              </button>
              <button
                className={`pag-btn ${page === 1 ? 'disabled' : ''}`}
                onClick={() => page > 1 && setPage(page - 1)}
                disabled={page === 1}
              >
                ‹
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  className={`pag-btn ${page === pageNum ? 'active' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                className={`pag-btn ${page === totalPages ? 'disabled' : ''}`}
                onClick={() => page < totalPages && setPage(page + 1)}
                disabled={page === totalPages}
              >
                ›
              </button>
              <button
                className={`pag-btn ${page === totalPages ? 'disabled' : ''}`}
                onClick={() => page < totalPages && setPage(totalPages)}
                disabled={page === totalPages}
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>

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
              { value: 'active',    label: 'Active',    color: '#10b981' },
              { value: 'inactive',  label: 'Inactive',  color: '#94a3b8' },
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
        isOpen={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusChange}
        title={`Confirm Account ${userToToggle?.status === 'active' ? 'Deactivation' : 'Activation'}`}
        message={`Are you sure you want to ${userToToggle?.status === 'active' ? 'deactivate' : 'activate'} this user account (${userToToggle?.email})?`}
        confirmLabel={isUpdatingStatus ? "Updating..." : `Yes, ${userToToggle?.status === 'active' ? 'Deactivate' : 'Activate'}`}
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
