import React, { useState, useEffect, useRef } from 'react';
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

export default function Tenants() {
  const { user } = usePermission();
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [tenantToDelete, setTenantToDelete] = useState(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isPlatformAdmin = user?.isSuperAdmin || user?.isAdmin;

  // Pagination, Search, and Filter states
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  if (!isPlatformAdmin) {
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

  const formik = useFormik({
    validateOnChange: true,
    validateOnBlur: true,
    initialValues: {
      plan_id: '',
      name: '',
      email: '',
      phoneCode: '+91',
      phone: '',
      address: '',
      status: 'active',
      password: '',
      re_password: '',
      owner_id: '',
      profile_image_url: ''
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Company / Owner Name is required').min(3, 'Minimum 3 characters required').max(60, 'Maximum 60 characters allowed'),
      email: Yup.string().matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email address').required('Owner email is required'),
      phone: Yup.string()
        .required('Phone number is required')
        .test('is-valid-phone', 'Invalid phone number for the selected country code', function (value) {
          const { phoneCode } = this.parent;
          if (!value) return false;
          try {
            return isValidPhoneNumber(`${phoneCode}${value}`);
          } catch {
            return false;
          }
        }),
      plan_id: Yup.string().required('Subscription plan is required'),
      status: Yup.string().required('Status is required'),
      password: editingTenant
        ? Yup.string().test('min-6', 'Password must be at least 6 characters', val => !val || val.length >= 6)
        : Yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
      re_password: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .when('password', {
          is: (val) => val && val.length > 0,
          then: (schema) => schema.required('Please confirm password'),
          otherwise: (schema) => schema.notRequired()
        })
    }),
    onSubmit: async (values) => {
      try {
        const phoneWithoutSpaces = values.phone?.replace(/[\s()-]/g, '') || '';
        const formattedPhone = `${values.phoneCode}${phoneWithoutSpaces}`;

        const payload = { ...values, phone: formattedPhone };
        if (editingTenant) {
          await api.patch(`/tenants/${editingTenant.id}`, payload);
          toast.success('Tenant updated successfully');
        } else {
          await api.post('/tenants', payload);
          toast.success('Tenant created successfully');
        }
        fetchTenants();
        handleCloseModal();
      } catch (err) {
        console.error("Failed to save tenant", err);
        const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to save tenant';
        if (errMsg.toLowerCase().includes('email')) {
          formik.setFieldError('email', errMsg);
          formik.setFieldTouched('email', true, false);
        } else if (errMsg.toLowerCase().includes('phone')) {
          formik.setFieldError('phone', errMsg);
          formik.setFieldTouched('phone', true, false);
        } else {
          toast.error(errMsg);
        }
      }
    }
  });

  const setFieldValueRef = useRef(formik.setFieldValue);
  useEffect(() => { setFieldValueRef.current = formik.setFieldValue; });

  // Load Google Places API
  useEffect(() => {
    if (!document.getElementById('google-places-zindex-style')) {
      const style = document.createElement('style');
      style.id = 'google-places-zindex-style';
      style.innerHTML = `.pac-container { z-index: 99999 !important; }`;
      document.head.appendChild(style);
    }
    if (!window.google) {
      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  // Attach Places autocomplete to the company name field when modal opens
  useEffect(() => {
    let nameAutocomplete = null;
    let timer = null;

    if (isModalOpen) {
      timer = setTimeout(() => {
        const nameInput = document.querySelector('input[name="name"]');
        if (nameInput && window.google?.maps?.places) {
          nameAutocomplete = new window.google.maps.places.Autocomplete(nameInput, {
            types: ['establishment'],
          });
          nameAutocomplete.addListener('place_changed', () => {
            const place = nameAutocomplete.getPlace();
            if (place?.name) setFieldValueRef.current('name', place.name);
            if (place?.formatted_address) setFieldValueRef.current('address', place.formatted_address);
          });
        }
      }, 300);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (nameAutocomplete && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(nameAutocomplete);
      }
    };
  }, [isModalOpen]);

  // Scroll to first validation error on submit
  useEffect(() => {
    if (formik.submitCount === 0 || !isModalOpen) return;
    const fieldOrder = ['plan_id', 'name', 'email', 'phone', 'password', 're_password', 'status'];
    const firstErrorField = fieldOrder.find(f => formik.errors[f]);
    if (!firstErrorField) return;
    const el =
      document.querySelector(`input[name="${firstErrorField}"]`) ||
      document.querySelector(`[data-field="${firstErrorField}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [formik.submitCount]);

  // Load plans for the dropdown
  useEffect(() => {
    api.get('/tenants/plans').then(res => setPlans(res.data || [])).catch(console.error);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pageSize,
        search: debouncedSearch,
        status: statusFilter,
        sortField,
        sortOrder
      });
      const response = await api.get(`/tenants?${params.toString()}`);
      setTenants(response.data.data);
      setTotalCount(response.data.totalCount);
    } catch (err) {
      console.error("Failed to fetch tenants", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        status: statusFilter,
        sortField,
        sortOrder,
        export: 'true'
      });
      toast.loading('Exporting tenants...', { id: 'export-tenants' });
      const response = await api.get(`/tenants?${params.toString()}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tenants_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Tenants exported successfully', { id: 'export-tenants' });
    } catch (err) {
      console.error("Export tenants failed", err);
      toast.error('Failed to export tenants', { id: 'export-tenants' });
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [page, debouncedSearch, statusFilter, sortField, sortOrder]);

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

  const handleOpenModal = (tenant = null) => {
    if (tenant) {
      setEditingTenant(tenant);

      let matchedCode = '+91';
      let matchedPhone = tenant.owner_phone || '';
      if (tenant.owner_phone && tenant.owner_phone.startsWith('+')) {
        const sortedCountries = [...countries].sort((a, b) => b.code.length - a.code.length);
        const foundCountry = sortedCountries.find(c => tenant.owner_phone.startsWith(c.code));
        if (foundCountry) {
          matchedCode = foundCountry.code;
          matchedPhone = tenant.owner_phone.substring(foundCountry.code.length);
        }
      }

      formik.resetForm({
        values: {
          plan_id: tenant.plan_id || '',
          name: tenant.owner_name || '',
          email: tenant.owner_email || '',
          phoneCode: matchedCode,
          phone: matchedPhone,
          address: tenant.address || '',
          status: tenant.owner_status || tenant.status || 'active',
          password: '',
          re_password: '',
          owner_id: tenant.owner_id || '',
          profile_image_url: tenant.owner_profile_image || ''
        }
      });
    } else {
      setEditingTenant(null);
      formik.resetForm({
        values: {
          plan_id: plans.find(p => p.plan_name === 'Free Tier')?.id || '',
          name: '',
          email: '',
          phoneCode: '+91',
          phone: '',
          address: '',
          status: 'active',
          password: '',
          re_password: '',
          owner_id: '',
          profile_image_url: ''
        }
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTenant(null);
  };

  const handleDelete = async () => {
    if (!tenantToDelete) return;
    try {
      await api.delete(`/tenants/${tenantToDelete}`);
      toast.success('Tenant deleted successfully');
      fetchTenants();
    } catch (err) {
      console.error("Failed to delete tenant", err);
    } finally {
      setTenantToDelete(null);
    }
  };

  const columns = [
    {
      header: 'Company / Owner Name',
      sortKey: 'owner_name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)',
            flexShrink: 0
          }}>
            {row.owner_profile_image ? (
              <img src={getFileUrl(row.owner_profile_image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                {(row.owner_name || 'T')[0].toUpperCase()}
              </span>
            )}
          </div>
          <Link to={`/tenants/${row.id}`} style={{ fontWeight: '750', textDecoration: 'none', color: 'var(--text-main)' }} onMouseOver={(e) => e.target.style.color = 'var(--primary)'} onMouseOut={(e) => e.target.style.color = 'var(--text-main)'}>
            {row.owner_name}
          </Link>
        </div>
      )
    },
    {
      header: 'Plan',
      render: (row) => (
        <Badge type="info">{row.plan_name}</Badge>
      )
    },
    { header: 'Email', key: 'owner_email' },
    {
      header: 'Status',
      render: (row) => {
        const types = { active: 'success', suspended: 'danger', inactive: 'secondary' };
        return <Badge type={types[row.owner_status || 'inactive']}>{row.owner_status || 'inactive'}</Badge>;
      }
    },
    {
      header: 'Joined',
      sortKey: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Tenants</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>Manage all registered platform companies and their status.</p>
        </div>
        <div className="page-actions">
          <Button type="secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </Button>
          <Button onClick={() => handleOpenModal()} style={{ borderRadius: '6px' }}>
            + Add Tenant
          </Button>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="filter-bar">
        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#f8fafc',
              height: '38px',
              minWidth: '140px',
              cursor: 'pointer'
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '280px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search</span>
          <div style={{ position: 'relative', width: '100%' }}>
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
              placeholder="Search name, email or country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 32px 10px 36px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#f8fafc',
                transition: 'border-color 0.2s',
                height: '38px'
              }}
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
          const hasFilters = !!(statusFilter || search);
          return (
            <button
              title={hasFilters ? 'Clear all filters' : 'No active filters'}
              onClick={() => {
                if (!hasFilters) return;
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

      <DataTable
        columns={columns}
        data={tenants}
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
          <>
            <Button type="secondary" size="sm" onClick={() => handleOpenModal(row)} title="Edit Tenant" style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </Button>
            <Button type="ghost" size="sm" onClick={() => setTenantToDelete(row.id)} title="Delete Tenant" style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </Button>
          </>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
        footer={
          <>
            <Button type="secondary" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={formik.handleSubmit} disabled={formik.isSubmitting}>
              {editingTenant ? (formik.isSubmitting ? 'Updating...' : 'Update Tenant') : (formik.isSubmitting ? 'Creating...' : 'Create Tenant')}
            </Button>
          </>
        }
      >
        <form onSubmit={formik.handleSubmit}>
          {/* Owner Profile Image Upload */}
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
                <img src={getFileUrl(formik.values.profile_image_url)} alt="Owner Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '32px' }}>🏢</span>
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
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>Click to upload owner profile picture</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
            <div data-field="plan_id">
              <FormSelect
                label="Subscription Plan"
                name="plan_id"
                value={formik.values.plan_id}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.errors.plan_id}
                touched={formik.touched.plan_id}
                required
                placeholder="Select Plan"
                options={plans.map(p => ({ value: p.id, label: `${p.plan_name} (₹${p.price})` }))}
              />
            </div>
          </div>

          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px' }}>Company / Owner Details</h3>

          <Input
            label="Company / Owner Name"
            name="name"
            placeholder="Acme Inc. / John Doe"
            value={formik.values.name}
            onChange={(e) => { formik.handleChange(e); formik.setFieldTouched('name', true, false); }}
            onBlur={formik.handleBlur}
            error={formik.errors.name}
            touched={formik.touched.name}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Input
              label="Owner Email"
              name="email"
              type="email"
              autoComplete="off"
              placeholder="owner@acme.com"
              value={formik.values.email}
              onChange={(e) => { formik.handleChange(e); formik.setFieldTouched('email', true, false); }}
              onBlur={formik.handleBlur}
              error={formik.errors.email}
              touched={formik.touched.email}
              required
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                Phone Number <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <div style={{ width: '90px', flexShrink: 0 }}>
                  <SearchableCountryCodeSelect
                    value={formik.values.phoneCode}
                    onChange={(val) => formik.setFieldValue('phoneCode', val)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="Phone number"
                    value={formik.values.phone}
                    onChange={formik.handleChange}
                    onKeyDown={(e) => {
                      if (
                        ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', '+'].includes(e.key) ||
                        (e.key === 'a' && (e.ctrlKey === true || e.metaKey === true)) ||
                        (e.key === 'c' && (e.ctrlKey === true || e.metaKey === true)) ||
                        (e.key === 'v' && (e.ctrlKey === true || e.metaKey === true)) ||
                        (e.key === 'x' && (e.ctrlKey === true || e.metaKey === true))
                      ) {
                        return;
                      }
                      if (!/^[0-9]$/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1.5px solid ${formik.touched.phone && formik.errors.phone ? 'var(--danger)' : 'var(--border)'}`,
                      fontSize: '13px',
                      outline: 'none',
                      backgroundColor: '#fff',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      height: '38px',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      if (!(formik.touched.phone && formik.errors.phone)) {
                        e.target.style.borderColor = 'var(--primary)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
                      }
                    }}
                    onBlur={(e) => {
                      formik.handleBlur(e);
                      if (!(formik.touched.phone && formik.errors.phone)) {
                        e.target.style.borderColor = 'var(--border)';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  />
                </div>
              </div>
              {formik.touched.phone && formik.errors.phone ? (
                <span style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: '500' }}>{formik.errors.phone}</span>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Enter standard mobile number without country code</span>
              )}
            </div>
          </div>

          <Input
            label="Company Address"
            name="address"
            placeholder="123 Corporate Blvd, Suite 100"
            value={formik.values.address}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.address}
            touched={formik.touched.address}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label={editingTenant ? "New Password (optional)" : "Password"}
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.password}
              touched={formik.touched.password}
              required={!editingTenant}
            />
            <Input
              label="Confirm Password"
              name="re_password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={formik.values.re_password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.re_password}
              touched={formik.touched.re_password}
              required={!editingTenant || !!formik.values.password}
            />
          </div>

          <div data-field="status">
            <FormSelect
              label="Status"
              name="status"
              value={formik.values.status}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.status}
              touched={formik.touched.status}
              required
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
              ]}
            />
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!tenantToDelete}
        onClose={() => setTenantToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Tenant"
        message="Are you sure you want to delete this tenant? This action will permanently remove all associated data."
      />
    </div>
  );
}
