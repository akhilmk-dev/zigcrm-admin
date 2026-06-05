import React from 'react';
import api, { getFileUrl } from '../../api/axiosConfig';
import { Input } from '../common/Modal';
import { PhoneInput } from '../common/PhoneInput';
import { FormSelect } from '../common/FormSelect';

const STATUS_OPTIONS = [
  { value: 'new',        label: 'New',        color: '#10b981' },
  { value: 'discussion', label: 'Discussion',  color: '#f59e0b' },
  { value: 'won',        label: 'Won',         color: '#3b82f6' },
  { value: 'loss',       label: 'Loss',        color: '#ef4444' },
];

const IcoLabel = ({ d, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
      {d}
    </svg>
    {children}
  </span>
);

const SectionDivider = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0 14px' }}>
    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>{label}</span>
    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
  </div>
);

const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' };

export default function EditContactForm({ formik, tenants = [], tenantUsers = [], isGlobalAdmin = false }) {
  return (
    <form onSubmit={formik.handleSubmit} style={{ paddingBottom: '4px' }}>

      {/* Avatar row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border)' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#EEF2FF', border: '2px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {formik.values.profile_image_url ? (
              <img src={getFileUrl(formik.values.profile_image_url)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            )}
          </div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--primary)', border: '2px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', borderRadius: '50%' }}
            onChange={async (e) => {
              const file = e.currentTarget.files[0];
              if (!file) return;
              const fd = new FormData();
              fd.append('file', file);
              try {
                const res = await api.post('/upload', fd);
                formik.setFieldValue('profile_image_url', res.data.url);
              } catch (err) {
                console.error('Upload failed', err);
              }
            }}
          />
        </div>
        <div>
          <p style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)' }}>
            {formik.values.profile_image_url ? 'Change photo' : 'Add profile picture'}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>JPG or PNG · max 2 MB</p>
        </div>
      </div>

      {/* Assign to company (super admin only) */}
      {isGlobalAdmin && (
        <FormSelect
          label="Assign to Company"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="18" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M8 10h.01M8 14h.01M16 6h.01M16 10h.01M16 14h.01"/></svg>}
          name="tenant_id"
          value={formik.values.tenant_id}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.errors.tenant_id}
          touched={formik.touched.tenant_id}
          required
          searchable
          placeholder="Select a company…"
          options={Array.isArray(tenants) ? tenants.map(t => ({
            value: t.id,
            label: t.owner_name || t.tenant_name || t.name || 'Unknown Company',
            avatar: (t.owner_name || t.tenant_name || t.name || '?')[0].toUpperCase(),
          })) : []}
        />
      )}

      {/* Basic Information */}
      <SectionDivider label="Basic Information" />

      <div style={grid2}>
        <Input
          label={<IcoLabel d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>}>First Name</IcoLabel>}
          name="first_name" placeholder="John"
          value={formik.values.first_name}
          onChange={(e) => { formik.handleChange(e); formik.setFieldTouched('first_name', true, false); }}
          onBlur={formik.handleBlur}
          error={formik.errors.first_name} touched={formik.touched.first_name} required
        />
        <Input
          label={<IcoLabel d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>}>Last Name</IcoLabel>}
          name="last_name" placeholder="Doe"
          value={formik.values.last_name}
          onChange={(e) => { formik.handleChange(e); formik.setFieldTouched('last_name', true, false); }}
          onBlur={formik.handleBlur}
        />
      </div>

      <div style={grid2}>
        <Input
          label={<IcoLabel d={<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>}>Email</IcoLabel>}
          type="email" name="email" placeholder="john.doe@example.com"
          value={formik.values.email}
          onChange={(e) => { formik.handleChange(e); formik.setFieldTouched('email', true, false); }}
          onBlur={formik.handleBlur}
          error={formik.errors.email} touched={formik.touched.email}
        />
        <PhoneInput
          label={<IcoLabel d={<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.09 6.09l.87-.87a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></>}>Phone</IcoLabel>}
          name="phone"
          value={formik.values.phone}
          onChange={formik.handleChange} onBlur={formik.handleBlur}
          error={formik.errors.phone} touched={formik.touched.phone} required
        />
      </div>

      {/* Gender radio */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Gender</label>
        <div style={{ display: 'flex', gap: '24px' }}>
          {['male', 'female', 'other'].map(option => (
            <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>
              <input
                type="radio"
                name="gender"
                value={option}
                checked={formik.values.gender === option}
                onChange={formik.handleChange}
                style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: '15px', height: '15px' }}
              />
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {/* Work Details */}
      <SectionDivider label="Work Details" />

      <div style={grid2}>
        <Input
          label={<IcoLabel d={<><rect x="3" y="2" width="18" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M8 10h.01M8 14h.01M16 6h.01M16 10h.01M16 14h.01"/></>}>Workplace</IcoLabel>}
          name="company_name" placeholder="Acme Corp"
          value={formik.values.company_name}
          onChange={(e) => { formik.handleChange(e); formik.setFieldTouched('company_name', true, false); }}
          onBlur={formik.handleBlur}
          error={formik.errors.company_name} touched={formik.touched.company_name}
        />
        <Input
          label={<IcoLabel d={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>}>Profession</IcoLabel>}
          name="profession" placeholder="e.g. Attorney, Realtor"
          value={formik.values.profession}
          onChange={formik.handleChange} onBlur={formik.handleBlur}
          error={formik.errors.profession} touched={formik.touched.profession}
        />
      </div>

      <Input
        label={<IcoLabel d={<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>}>Address</IcoLabel>}
        name="address" placeholder="e.g. 123 Main St, New York"
        value={formik.values.address}
        onChange={formik.handleChange} onBlur={formik.handleBlur}
        error={formik.errors.address} touched={formik.touched.address}
      />

      <Input
        label={<IcoLabel d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>}>GST Number</IcoLabel>}
        name="gst_no" placeholder="e.g. 22AAAAA0000A1Z5"
        value={formik.values.gst_no}
        onChange={formik.handleChange} onBlur={formik.handleBlur}
        error={formik.errors.gst_no} touched={formik.touched.gst_no}
      />

      {/* CRM Settings */}
      <SectionDivider label="CRM Settings" />

      <div style={grid2}>
        <FormSelect
          label="Assigned To"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
          name="assigned_to"
          value={formik.values.assigned_to}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          searchable
          placeholder="Unassigned"
          options={[
            { value: '', label: 'Unassigned' },
            ...tenantUsers.map(u => ({
              value: u.id,
              label: u.name + (u.roles?.role_name ? ` · ${u.roles.role_name}` : ''),
              avatar: (u.name || '?')[0].toUpperCase(),
            })),
          ]}
        />
        <FormSelect
          label="Lead Status"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>}
          name="status"
          value={formik.values.status}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          options={STATUS_OPTIONS}
        />
      </div>

      <div style={grid2}>
        <Input
          label={<IcoLabel d={<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>}>Source</IcoLabel>}
          name="source" placeholder="e.g. LinkedIn, Referral"
          value={formik.values.source}
          onChange={formik.handleChange} onBlur={formik.handleBlur}
        />
        <Input
          label={<IcoLabel d={<><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>}>Tags</IcoLabel>}
          name="tags" placeholder="e.g. VIP, Tech"
          value={formik.values.tags}
          onChange={formik.handleChange} onBlur={formik.handleBlur}
        />
      </div>

    </form>
  );
}
