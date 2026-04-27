import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api, { FILE_BASE_URL, getFileUrl } from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select, ConfirmModal } from '../components/common/Modal';
import { usePermission } from '../hooks/usePermission';
import { toast } from 'react-hot-toast';
import { countries } from '../constants/countries';
import { isValidPhoneNumber } from 'libphonenumber-js';

export default function Tenants() {
  const { user } = usePermission();
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [tenantToDelete, setTenantToDelete] = useState(null);

  const isPlatformAdmin = user?.isSuperAdmin || user?.isAdmin;

  // Pagination, Search, and Filter states
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
    initialValues: {
      plan_id: '',
      name: '',
      email: '',
      phone: '',
      country: '',
      status: 'active',
      password: '',
      re_password: '',
      owner_id: '',
      profile_image_url: ''
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Company / Owner Name is required'),
      email: Yup.string().email('Invalid email address').required('Owner email is required'),
      phone: Yup.string()
        .required('Phone number is required')
        .test('is-valid-phone', 'Invalid phone number for selected country', function(value) {
          const { country } = this.parent;
          if (!country || !value) return true;
          const selectedCountry = countries.find(c => c.name === country);
          if (!selectedCountry) return true;
          try {
            return isValidPhoneNumber(value, selectedCountry.iso);
          } catch (e) {
            return false;
          }
        }),
      country: Yup.string().required('Country is required'),
      plan_id: Yup.string().required('Subscription plan is required'),
      status: Yup.string().required('Status is required'),
      password: Yup.string().when('isEditing', {
          is: () => !editingTenant,
          then: () => Yup.string().required('Password is required').min(6, 'Min 6 characters')
      }),
      re_password: Yup.string().oneOf([Yup.ref('password'), null], 'Passwords must match')
    }),
    onSubmit: async (values) => {
      try {
        if (editingTenant) {
          await api.patch(`/tenants/${editingTenant.id}`, values);
          toast.success('Tenant updated successfully');
        } else {
          await api.post('/tenants', values);
          toast.success('Tenant created successfully');
        }
        fetchTenants();
        handleCloseModal();
      } catch (err) {
        console.error("Failed to save tenant", err);
      }
    }
  });

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

  useEffect(() => {
    fetchTenants();
  }, [page, debouncedSearch, statusFilter, sortField, sortOrder]);

  const handleOpenModal = (tenant = null) => {
    if (tenant) {
      setEditingTenant(tenant);
      formik.setValues({
        plan_id: tenant.plan_id || '',
        name: tenant.owner_name || '',
        email: tenant.owner_email || '',
        phone: tenant.owner_phone || '',
        country: tenant.country || '',
        status: tenant.owner_status || tenant.status || 'active',
        password: '',
        re_password: '',
        owner_id: tenant.owner_id || '',
        profile_image_url: tenant.owner_profile_image || ''
      });
    } else {
      setEditingTenant(null);
      formik.resetForm({
        values: {
          plan_id: plans.find(p => p.plan_name === 'Free Tier')?.id || '',
          name: '',
          email: '',
          phone: '',
          country: '',
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
      sortKey: 'owner(name)',
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
          <div style={{ fontWeight: '600' }}>{row.owner_name}</div>
        </div>
      )
    },
    {
      header: 'Plan',
      render: (row) => (
        <Badge type="info">{row.plan_name}</Badge>
      )
    },
    { header: 'Email', key: 'owner_email', sortKey: 'owner(email)' },
    {
      header: 'Status',
      sortKey: 'owner(status)',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Tenants</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>Manage all registered platform companies and their status.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <span>+</span> Add Tenant
        </Button>
      </div>

      {/* Sticky Filters & Search Row */}
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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(page);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#fff',
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
        <div style={{ position: 'relative', width: '320px' }}>
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
              padding: '8px 12px 8px 36px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#fff',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
      </div>
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
            <Button type="secondary" size="sm" onClick={() => handleOpenModal(row)}>Edit</Button>
            <Button type="ghost" size="sm" onClick={() => setTenantToDelete(row.id)}>
              <span style={{ color: 'var(--danger)' }}>Delete</span>
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
            <Select
              label="Subscription Plan"
              name="plan_id"
              value={formik.values.plan_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.plan_id}
              touched={formik.touched.plan_id}
              required
            >
              <option value="">Select Plan</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.plan_name} (${p.price})</option>
              ))}
            </Select>
          </div>

          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px' }}>Company / Owner Details</h3>

          <Input
            label="Company / Owner Name"
            name="name"
            placeholder="Acme Inc. / John Doe"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.name}
            touched={formik.touched.name}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Owner Email"
              name="email"
              type="email"
              placeholder="owner@acme.com"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.email}
              touched={formik.touched.email}
              required
            />
            <Select
              label="Country"
              name="country"
              value={formik.values.country}
              onChange={(e) => {
                const countryName = e.target.value;
                const selectedCountry = countries.find(c => c.name === countryName);
                formik.setFieldValue('country', countryName);
                
                if (selectedCountry) {
                  const currentPhone = formik.values.phone;
                  // If phone is empty or only contains a previous dial code, update it
                  const isJustCode = countries.some(c => currentPhone.trim() === c.code);
                  if (!currentPhone || isJustCode) {
                    formik.setFieldValue('phone', selectedCountry.code + ' ');
                  }
                }
              }}
              onBlur={formik.handleBlur}
              error={formik.errors.country}
              touched={formik.touched.country}
              required
            >
              <option value="">Select Country</option>
              {countries.map(c => (
                <option key={c.name} value={c.name}>{c.name} ({c.code})</option>
              ))}
            </Select>
          </div>

          <Input
            label="Phone Number"
            name="phone"
            placeholder="+1 234 567 890"
            value={formik.values.phone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.phone}
            touched={formik.touched.phone}
            required
            helperText="Include country code (e.g. +91 9876543210)"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label={editingTenant ? "New Password (optional)" : "Password"}
              name="password"
              type="password"
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
              placeholder="••••••••"
              value={formik.values.re_password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.re_password}
              touched={formik.touched.re_password}
              required={!editingTenant}
            />
          </div>

          <Select
            label="Status"
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
