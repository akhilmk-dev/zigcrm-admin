import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api, { getFileUrl } from '../api/axiosConfig';
import { Button, Input, Select } from '../components/common/Modal';
import { toast } from 'react-hot-toast';
import { countries } from '../constants/countries';
import { isValidPhoneNumber } from 'libphonenumber-js';

const EnvelopeIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const UsersIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ContactIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CloudUploadIcon = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="38" height="38" fill="none" stroke="rgba(255,255,255,0.85)" viewBox="0 0 24 24" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 22V12h6v10" />
    <path d="M8 7h.01M12 7h.01M16 7h.01M8 12h.01M16 12h.01" />
  </svg>
);

const SaveIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

function InfoRow({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '11px 0',
      borderBottom: '1px solid var(--border)'
    }}>
      <div style={{
        width: '30px', height: '30px',
        borderRadius: '8px',
        backgroundColor: '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        color: '#64748b'
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '1px' }}>{label}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      </div>
    </div>
  );
}

function SearchableCountryCodeSelect({ value, onChange }) {
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
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '10px 12px',
          borderRadius: '8px',
          border: `1.5px solid ${isOpen ? 'var(--primary)' : 'var(--border)'}`,
          backgroundColor: '#fff',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '42px',
          boxSizing: 'border-box',
          color: 'var(--text-main)',
          transition: 'all 0.2s',
          boxShadow: isOpen ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none'
        }}
      >
        <span style={{ fontWeight: '600' }}>{value}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.5 }}>
          <path d="M1 1l4 4 4-4" />
        </svg>
      </div>
      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: '280px',
          backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--border)',
          boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', zIndex: 99999,
          padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box'
        }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text" placeholder="Search code or country..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', padding: '6px 8px 6px 26px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '2px' }}>
            {filteredCountries.length === 0 ? (
              <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>No results</div>
            ) : filteredCountries.map((c, idx) => (
              <div
                key={`${c.name}-${c.code}-${idx}`}
                onClick={(e) => { e.stopPropagation(); onChange(c.code); setIsOpen(false); setSearch(''); }}
                style={{
                  padding: '8px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  backgroundColor: value === c.code ? 'var(--bg-muted)' : 'transparent',
                  color: value === c.code ? 'var(--primary)' : 'var(--text-main)', transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = value === c.code ? 'var(--bg-muted)' : 'transparent'; }}
              >
                <span style={{ fontWeight: '500' }}>{c.name}</span>
                <span style={{ fontWeight: '600', opacity: 0.8 }}>{c.code}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const fetchTenantData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const tenantsRes = await api.get('/tenants?limit=1000');
      const foundTenant = (tenantsRes.data?.data || []).find(t => t.id === id);
      if (!foundTenant) {
        toast.error('Tenant not found');
        navigate('/tenants');
        return;
      }
      setTenant(foundTenant);
      const usersRes = await api.get(`/users?tenant_id=${id}&limit=1000`);
      setUsers(usersRes.data?.data || []);
      const contactsRes = await api.get(`/contacts?tenant_id=${id}&limit=1000`);
      setContacts(contactsRes.data?.data || []);
    } catch (err) {
      console.error('Error fetching tenant details:', err);
      toast.error('Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
    api.get('/tenants/plans')
      .then(res => setPlans(res.data || []))
      .catch(console.error);
  }, [id]);

  const parseTenantPhone = (t) => {
    let phoneCode = '+91';
    let phone = t?.owner_phone || '';
    if (phone.startsWith('+')) {
      const sorted = [...countries].sort((a, b) => b.code.length - a.code.length);
      const found = sorted.find(c => phone.startsWith(c.code));
      if (found) { phoneCode = found.code; phone = phone.substring(found.code.length); }
    }
    return { phoneCode, phone };
  };

  const parsed = parseTenantPhone(tenant);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('File size must be less than 2MB'); return; }
    formik.setFieldValue('profileImage', file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const formik = useFormik({
    validateOnChange: true,
    validateOnBlur: true,
    enableReinitialize: true,
    initialValues: {
      plan_id: tenant?.plan_id || '',
      name: tenant?.owner_name || '',
      email: tenant?.owner_email || '',
      phoneCode: parsed.phoneCode,
      phone: parsed.phone,
      status: tenant?.owner_status || tenant?.status || 'active',
      password: '',
      re_password: '',
      owner_id: tenant?.owner_id || '',
      profile_image_url: tenant?.owner_profile_image || '',
      profileImage: null
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .required('Company / Owner Name is required')
        .min(3, 'Minimum 3 characters required')
        .max(60, 'Maximum 60 characters allowed')
        .matches(/^[a-zA-Z0-9\s'.,&()-]*$/, 'Special characters or symbols are not allowed'),
      email: Yup.string()
        .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email address')
        .required('Owner email is required'),
      phone: Yup.string()
        .required('Phone number is required')
        .test('is-valid-phone', 'Invalid phone number for the selected country code', function (value) {
          const { phoneCode } = this.parent;
          if (!value) return false;
          try { return isValidPhoneNumber(`${phoneCode}${value}`); } catch { return false; }
        }),
      plan_id: Yup.string().required('Subscription plan is required'),
      status: Yup.string().required('Status is required'),
      password: Yup.string().test('min-6', 'Password must be at least 6 characters', val => !val || val.length >= 6),
      re_password: Yup.string().oneOf([Yup.ref('password'), null], 'Passwords must match')
    }),
    onSubmit: async (values) => {
      try {
        const phoneWithoutSpaces = values.phone?.replace(/[\s()-]/g, '') || '';
        const formattedPhone = `${values.phoneCode}${phoneWithoutSpaces}`;

        if (values.profileImage) {
          const formData = new FormData();
          formData.append('plan_id', values.plan_id);
          formData.append('name', values.name);
          formData.append('email', values.email);
          formData.append('phone', formattedPhone);
          formData.append('status', values.status);
          formData.append('owner_id', values.owner_id);
          if (values.password) {
            formData.append('password', values.password);
            formData.append('re_password', values.re_password);
          }
          formData.append('file', values.profileImage);
          await api.patch(`/tenants/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        } else {
          const payload = { ...values, phone: formattedPhone };
          delete payload.profileImage;
          await api.patch(`/tenants/${id}`, payload);
        }

        toast.success('Tenant details updated successfully');
        setImagePreview(null);
        fetchTenantData(true);
      } catch (err) {
        console.error('Failed to update tenant:', err);
        const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to update tenant';
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

  if (loading) {
    return (
      <div style={{ padding: '0 8px 24px 8px' }}>
        <style>{`
          .td-layout { display: flex; gap: 20px; align-items: flex-start; }
          .td-sidebar { width: 300px; flex-shrink: 0; }
          .td-content { flex: 1; min-width: 0; }
          @media (max-width: 820px) {
            .td-layout { flex-direction: column; }
            .td-sidebar { width: 100%; }
          }
          @keyframes tdPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
          .td-skel { background: #f1f5f9; border-radius: 6px; animation: tdPulse 1.5s infinite; }
        `}</style>
        <div className="td-layout">
          <div className="td-sidebar">
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #c7d2fe 0%, #bfdbfe 100%)', height: '200px' }} />
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div className="td-skel" style={{ width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="td-skel" style={{ width: '60%', height: '10px', marginBottom: '5px' }} />
                      <div className="td-skel" style={{ width: '90%', height: '13px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="td-content">
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="td-skel" style={{ width: '140px', height: '20px', marginBottom: '8px' }} />
                  <div className="td-skel" style={{ width: '260px', height: '13px' }} />
                </div>
                <div className="td-skel" style={{ width: '110px', height: '38px', borderRadius: '8px' }} />
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="td-skel" style={{ width: '160px', height: '15px' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="td-skel" style={{ height: '42px', borderRadius: '8px' }} />
                    <div className="td-skel" style={{ height: '42px', borderRadius: '8px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tenant) return null;

  const statusColor = {
    active: '#22c55e',
    inactive: '#f59e0b',
    suspended: '#ef4444'
  }[tenant.owner_status] || '#22c55e';

  const currentAvatar = imagePreview || (tenant.owner_profile_image ? getFileUrl(tenant.owner_profile_image) : null);

  return (
    <div style={{ padding: '0 8px 24px 8px' }}>
      <style>{`
        .td-layout { display: flex; gap: 20px; align-items: flex-start; }
        .td-sidebar { width: 300px; flex-shrink: 0; }
        .td-content { flex: 1; min-width: 0; }
        .td-upload-area:hover { border-color: var(--primary) !important; background-color: #eef2ff !important; }
        .td-copy-btn:hover { color: var(--primary) !important; }
        @media (max-width: 820px) {
          .td-layout { flex-direction: column; }
          .td-sidebar { width: 100%; }
        }
        @media (max-width: 600px) {
          .td-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="td-layout">

        {/* ── LEFT SIDEBAR ── */}
        <div className="td-sidebar">
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

            {/* Gradient header */}
            <div style={{
              background: 'linear-gradient(135deg, #3b5bdb 0%, #4361ee 50%, #2196f3 100%)',
              padding: '32px 20px 28px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
            }}>
              <div style={{
                width: '90px', height: '90px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
                border: '3px solid rgba(255,255,255,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0
              }}>
                {currentAvatar
                  ? <img src={currentAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <BuildingIcon />
                }
              </div>

              <h2 style={{ color: '#fff', fontSize: '17px', fontWeight: '700', margin: 0, textAlign: 'center', lineHeight: '1.35', maxWidth: '220px', wordBreak: 'break-word' }}>
                {tenant.owner_name}
              </h2>

              <span style={{
                backgroundColor: statusColor,
                color: '#fff',
                padding: '3px 14px', borderRadius: '20px',
                fontSize: '12px', fontWeight: '600',
                display: 'inline-flex', alignItems: 'center', gap: '5px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.8)', display: 'inline-block' }} />
                {(tenant.owner_status || 'active').charAt(0).toUpperCase() + (tenant.owner_status || 'active').slice(1)}
              </span>
            </div>

            {/* Info rows */}
            <div style={{ padding: '6px 20px 4px' }}>
              <InfoRow icon={<EnvelopeIcon />} label="Owner Email" value={tenant.owner_email || '—'} />
              <InfoRow icon={<PhoneIcon />} label="Phone Number" value={tenant.owner_phone || '—'} />
              <InfoRow icon={<CalendarIcon />} label="Plan" value={tenant.plan_name || 'Free Tier'} />
              <InfoRow icon={<CalendarIcon />} label="Member Since" value={new Date(tenant.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
              <InfoRow icon={<UsersIcon />} label="Tenant Users" value={users.length} />
              <InfoRow icon={<ContactIcon />} label="Total Contacts" value={contacts.length} />
            </div>

            {/* Tenant ID */}
            <div style={{ padding: '12px 20px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '7px' }}>Tenant ID</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '8px 12px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-main)', flex: 1, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tenant.id.substring(0, 13).toUpperCase()}
                </span>
                <button
                  className="td-copy-btn"
                  onClick={() => { navigator.clipboard.writeText(tenant.id); toast.success('Copied!'); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '2px', transition: 'color 0.2s' }}
                  title="Copy Tenant ID"
                >
                  <CopyIcon />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT CONTENT ── */}
        <div className="td-content">
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              padding: '22px 24px 18px', borderBottom: '1px solid var(--border)',
              flexWrap: 'wrap', gap: '12px'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Edit Tenant</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Update the tenant's details, subscription, contact, and account information.
                </p>
              </div>
              <Button onClick={formik.handleSubmit} disabled={formik.isSubmitting} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <SaveIcon />
                {formik.isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            {/* Form body */}
            <div style={{ padding: '24px' }}>
              <form onSubmit={formik.handleSubmit}>

                {/* Profile Image */}
                <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 4px' }}>Profile Image</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>Upload a new profile image for the tenant.</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>

                    {/* Avatar preview */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '74px', height: '74px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border)', backgroundColor: '#e2e8f0' }}>
                        {currentAvatar
                          ? <img src={currentAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '26px', fontWeight: '700' }}>
                              {tenant.owner_name?.[0]?.toUpperCase() || 'T'}
                            </div>
                        }
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          position: 'absolute', bottom: '1px', right: '1px',
                          width: '22px', height: '22px', borderRadius: '50%',
                          backgroundColor: 'var(--primary)', border: '2px solid #fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: '#fff'
                        }}
                        title="Change image"
                      >
                        <svg width="9" height="9" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>

                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/svg+xml" onChange={handleImageChange} style={{ display: 'none' }} />

                    {/* Upload area */}
                    <div
                      className="td-upload-area"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        flex: 1, minWidth: '160px',
                        border: '1.5px dashed var(--border)',
                        borderRadius: '10px', padding: '18px 20px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '5px', cursor: 'pointer', backgroundColor: '#fafbfc',
                        transition: 'border-color 0.2s, background-color 0.2s'
                      }}
                    >
                      <div style={{ color: '#94a3b8' }}><CloudUploadIcon /></div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Upload Image</span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>JPG, PNG or SVG. Max size 2MB.</span>
                    </div>
                  </div>
                </div>

                {/* Subscription Plan */}
                <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ maxWidth: '380px' }}>
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
                        <option key={p.id} value={p.id}>{p.plan_name} (₹{p.price})</option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Company / Owner Details */}
                <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 16px' }}>Company / Owner Details</h3>
                  <div className="td-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>

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

                    <Input
                      label="Owner Email"
                      name="email"
                      type="email"
                      placeholder="owner@acme.com"
                      value={formik.values.email}
                      onChange={(e) => { formik.handleChange(e); formik.setFieldTouched('email', true, false); }}
                      onBlur={formik.handleBlur}
                      error={formik.errors.email}
                      touched={formik.touched.email}
                      required
                    />

                    {/* Phone */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                        Phone Number <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{ width: '100px', flexShrink: 0 }}>
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
                            onBlur={formik.handleBlur}
                            onKeyDown={(e) => {
                              if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) || (e.ctrlKey || e.metaKey)) return;
                              if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                            }}
                            style={{
                              width: '100%', padding: '10px 12px', borderRadius: '8px',
                              border: `1.5px solid ${formik.touched.phone && formik.errors.phone ? 'var(--danger)' : 'var(--border)'}`,
                              fontSize: '14px', outline: 'none', backgroundColor: '#fff',
                              boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s', height: '42px'
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
                      {formik.touched.phone && formik.errors.phone && (
                        <div style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: '500', marginTop: '4px' }}>{formik.errors.phone}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 16px' }}>Account Status</h3>
                  <div style={{ maxWidth: '240px' }}>
                    <Select
                      label="Status"
                      name="status"
                      value={formik.values.status}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.errors.status}
                      touched={formik.touched.status}
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </Select>
                  </div>
                </div>

              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
