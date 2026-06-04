import React, { useState, useEffect, useRef } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { isValidPhoneNumber } from 'libphonenumber-js';
import api, { getFileUrl } from '../../api/axiosConfig';
import { Modal, Button, Input } from '../common/Modal';
import { FormSelect } from '../common/FormSelect';
import { toast } from 'react-hot-toast';
import { countries } from '../../constants/countries';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function SearchableCountryCodeSelect({ value, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filtered = countries.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{label}</label>
      )}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '10px 12px', borderRadius: '12px',
          border: `1px solid ${isOpen ? 'var(--primary)' : 'var(--border)'}`,
          backgroundColor: '#fff', fontSize: '13px', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          height: '38px', boxSizing: 'border-box', color: 'var(--text-main)',
          transition: 'all 0.2s',
          boxShadow: isOpen ? '0 0 0 2px rgba(99, 102, 241, 0.15)' : 'none'
        }}
      >
        <span style={{ fontWeight: '600' }}>{value}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          backgroundColor: '#fff', border: '1px solid var(--border)',
          borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxHeight: '220px', overflow: 'hidden', display: 'flex', flexDirection: 'column', marginTop: '4px'
        }}>
          <div style={{ padding: '8px' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search country..."
              style={{
                width: '100%', padding: '7px 10px', border: '1px solid var(--border)',
                borderRadius: '8px', fontSize: '12px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '160px' }}>
            {filtered.map(c => (
              <div
                key={c.code}
                onClick={() => { onChange(c.code); setIsOpen(false); setSearch(''); }}
                style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between',
                  backgroundColor: c.code === value ? 'var(--primary-light, #eff6ff)' : 'transparent',
                  color: c.code === value ? 'var(--primary)' : 'var(--text-main)'
                }}
                onMouseEnter={e => { if (c.code !== value) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                onMouseLeave={e => { if (c.code !== value) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span>{c.name}</span>
                <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{c.code}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddTenantUserModal({ isOpen, onClose, user, onSuccess, defaultTenantId }) {
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;

  const [tenants, setTenants] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const isEditing = !!user;

  const formik = useFormik({
    validateOnChange: true,
    validateOnBlur: true,
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
      name: Yup.string().required('Full name is required').min(3, 'Minimum 3 characters required').max(60, 'Maximum 60 characters allowed').matches(/^[a-zA-Z\s'-]*$/, 'Special characters or symbols are not allowed'),
      email: Yup.string()
        .matches(EMAIL_REGEX, 'Invalid email address')
        .required('Email is required'),
      phone: Yup.string()
        .required('Phone number is required')
        .test('is-valid-phone', 'Invalid phone number for the selected country', function (value) {
          if (!value) return false;
          const { phoneCode } = this.parent;
          const fullNumber = `${phoneCode}${value.replace(/[\s()-]/g, '')}`;
          try { return isValidPhoneNumber(fullNumber); } catch { return false; }
        }),
      password: isEditing
        ? Yup.string().test('min-6', 'Password must be at least 6 characters', val => !val || val.length >= 6)
        : Yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
      re_password: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .when('password', {
          is: (val) => val && val.length > 0,
          then: (schema) => schema.required('Please confirm your password'),
          otherwise: (schema) => schema.notRequired(),
        }),
      role_id: Yup.string().required('Role is required'),
      target_tenant_id: isGlobalAdmin
        ? Yup.string().required('Company assignment is required')
        : Yup.string(),
    }),
    onSubmit: async (values) => {
      try {
        const payload = {
          scope: 'tenant',
          name: values.name,
          email: values.email,
          phone: `${values.phoneCode}${values.phone.replace(/[\s()-]/g, '')}`,
          role_id: values.role_id,
          target_tenant_id: values.target_tenant_id || loggedInUser?.tenantId,
          status: values.status,
          profile_image_url: values.profile_image_url,
        };
        if (values.password) payload.password = values.password;

        if (isEditing) {
          await api.patch(`/users/${user.id}`, payload);
          toast.success('User updated successfully');
        } else {
          await api.post('/users', payload);
          toast.success('User created successfully');
        }
        onSuccess?.();
        handleClose();
      } catch (err) {
        console.error('Save User Error:', err);
        toast.error('Failed to save user');
      }
    }
  });

  const handleClose = () => {
    formik.resetForm();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    setRolesLoading(true);
    api.get('/roles?limit=1000')
      .then(res => setRoles((res.data.data || []).filter(r => r.role_name.startsWith('tenant-'))))
      .catch(() => { })
      .finally(() => setRolesLoading(false));

    if (isGlobalAdmin) {
      api.get('/tenants/selection').then(res => setTenants(res.data || [])).catch(() => { });
    }

    if (user) {
      let matchedCode = '+91';
      let matchedPhone = user.phone || '';
      if (user.phone?.startsWith('+')) {
        const sorted = [...countries].sort((a, b) => b.code.length - a.code.length);
        const found = sorted.find(c => user.phone.startsWith(c.code));
        if (found) { matchedCode = found.code; matchedPhone = user.phone.substring(found.code.length); }
      }
      formik.resetForm({
        values: {
          name: user.name || '',
          email: user.email || '',
          phoneCode: matchedCode,
          phone: matchedPhone,
          password: '',
          re_password: '',
          role_id: user.role_id || '',
          target_tenant_id: user.tenant_id || defaultTenantId || '',
          status: user.status || 'active',
          profile_image_url: user.profile_image_url || '',
        }
      });
    } else {
      formik.resetForm({
        values: {
          name: '',
          email: '',
          phoneCode: '+91',
          phone: '',
          password: '',
          re_password: '',
          role_id: '',
          target_tenant_id: defaultTenantId || (isGlobalAdmin ? '' : loggedInUser?.tenantId || ''),
          status: 'active',
          profile_image_url: '',
        }
      });
    }
  }, [isOpen, user?.id]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Tenant User' : 'Add Tenant User'}
      footer={
        <>
          <Button type="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={formik.handleSubmit} disabled={formik.isSubmitting}>
            {isEditing
              ? (formik.isSubmitting ? 'Saving...' : 'Save Changes')
              : (formik.isSubmitting ? 'Creating...' : 'Create User')}
          </Button>
        </>
      }
    >
      <form onSubmit={formik.handleSubmit}>
        {/* Profile Image */}
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '90px', height: '90px', borderRadius: '20px',
            backgroundColor: 'var(--bg-muted)', border: '2px dashed var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden'
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
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                try {
                  const res = await api.post('/upload', formData);
                  formik.setFieldValue('profile_image_url', res.data.url);
                } catch (err) {
                  console.error('Upload failed', err);
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
          onChange={(e) => { formik.handleChange(e); formik.setFieldTouched('name', true, false); }}
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
          onChange={(e) => {
            formik.handleChange(e);
            formik.setFieldTouched('email', true, false);
          }}
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

        {isGlobalAdmin && (
          <FormSelect
            label="Company"
            name="target_tenant_id"
            value={formik.values.target_tenant_id}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.target_tenant_id}
            touched={formik.touched.target_tenant_id}
            required
            searchable
            placeholder="— Select a Company —"
            options={tenants.map(t => ({
              value: t.id,
              label: t.owner_name || t.tenant_name || t.name || 'Unknown Company',
              avatar: (t.owner_name || t.tenant_name || t.name || '?')[0].toUpperCase()
            }))}
          />
        )}

        <FormSelect
          label="Assigned Role"
          name="role_id"
          value={formik.values.role_id}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.role_id}
          touched={formik.touched.role_id}
          required
          searchable
          disabled={rolesLoading}
          placeholder="Select a role"
          options={roles.map(r => ({ value: r.id, label: r.role_name }))}
        />
        {roles.length === 0 && !rolesLoading && (
          <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '-12px', marginBottom: '16px' }}>
            ⚠️ No tenant roles found. Roles must start with <code>tenant-</code> to appear here.
          </p>
        )}

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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
          <Input
            label={isEditing ? 'New Password' : 'Password'}
            name="password"
            type="password"
            placeholder="Min 6 characters"
            autoComplete="new-password"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.password}
            touched={formik.touched.password}
            required={!isEditing}
            helperText={isEditing ? 'Leave blank to keep current password' : undefined}
          />
          <Input
            label="Confirm Password"
            name="re_password"
            type="password"
            placeholder="Re-enter password"
            autoComplete="new-password"
            value={formik.values.re_password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.re_password}
            touched={formik.touched.re_password}
            required={!isEditing}
          />
        </div>
      </form>
    </Modal>
  );
}
