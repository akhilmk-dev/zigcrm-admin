import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api, { getFileUrl } from '../api/axiosConfig';
import { Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select, ConfirmModal } from '../components/common/Modal';
import { toast } from 'react-hot-toast';



export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);

  const [newContactId, setNewContactId] = useState('');
  const [allContacts, setAllContacts] = useState([]);

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;

  // Formik for Editing User Info
  const editUserFormik = useFormik({
    validateOnChange: true,
    validateOnBlur: true,
    initialValues: {
      name: '',
      email: '',
      role_id: '',
      target_tenant_id: '',
      status: 'active',
      profile_image_url: '',
      phone: '',
      department: '',
      employee_id: '',
      location: '',
      reports_to: ''
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Full name is required').min(3, 'Minimum 3 characters required').max(60, 'Maximum 60 characters allowed'),
      email: Yup.string().matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email address').required('Email is required'),
      role_id: Yup.string().required('Role is required')
    }),
    onSubmit: async (values) => {
      try {
        const payload = {
          name: values.name,
          email: values.email,
          role_id: values.role_id,
          target_tenant_id: values.target_tenant_id || userData?.tenant_id,
          status: values.status,
          profile_image_url: values.profile_image_url,
          phone: values.phone,
          department: values.department,
          employee_id: values.employee_id,
          location: values.location,
          reports_to: values.reports_to
        };
        await api.patch(`/users/${id}`, payload);
        toast.success('User updated successfully');
        fetchUserDetails();
      } catch (err) {
        console.error('Update User Error:', err);
        toast.error('Failed to update user');
      }
    }
  });

  // Formik for Reset Password
  const resetPasswordFormik = useFormik({
    initialValues: {
      password: '',
      re_password: ''
    },
    validationSchema: Yup.object({
      password: Yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
      re_password: Yup.string()
        .required('Please confirm password')
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
    }),
    onSubmit: async (values) => {
      try {
        await api.patch(`/users/${id}`, { password: values.password });
        toast.success('Password reset successfully');
        setIsResetPasswordModalOpen(false);
        resetPasswordFormik.resetForm();
      } catch (err) {
        console.error('Reset Password Error:', err);
        toast.error('Failed to reset password');
      }
    }
  });

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch user primary details
      const userRes = await api.get(`/users/${id}`);
      const user = userRes.data;
      setUserData(user);

      // Populate Edit Formik
      editUserFormik.setValues({
        name: user.name || '',
        email: user.email || '',
        role_id: user.role_id || '',
        target_tenant_id: user.tenant_id || '',
        status: user.status || 'active',
        profile_image_url: user.profile_image_url || '',
        phone: user.phone || '',
        department: user.department || '',
        employee_id: user.employee_id || '',
        location: user.location || '',
        reports_to: user.reports_to || ''
      });

      // 2. Fetch associated contacts
      const contactsRes = await api.get(`/contacts?assigned_to=${id}&limit=100`);
      setContacts(contactsRes.data.data || []);

      // 3. Fetch all contacts for link dropdown
      const allContactsRes = await api.get(`/contacts?limit=200`);
      setAllContacts(allContactsRes.data.data || []);

      // 7. Load roles and tenants if admin
      if (isGlobalAdmin) {
        const tenantsRes = await api.get('/tenants/selection');
        setTenants(tenantsRes.data || []);
        const rolesRes = await api.get('/roles?limit=100');
        setRoles(rolesRes.data.data || []);
      }
    } catch (err) {
      console.error('Fetch User Details Error:', err);
      toast.error('Failed to load user details');
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const handleDeleteUser = async () => {
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted successfully');
      setIsDeleteModalOpen(false);
      navigate('/users');
    } catch (err) {
      console.error('Delete User Error:', err);
      toast.error('Failed to delete user');
    }
  };

  const handleLinkContact = async () => {
    if (!newContactId) {
      toast.error('Please select a contact');
      return;
    }
    try {
      await api.patch(`/contacts/${newContactId}`, { assigned_to: id });
      toast.success('Contact associated successfully');
      setIsAddContactModalOpen(false);
      setNewContactId('');
      fetchUserDetails();
    } catch (err) {
      console.error('Link Contact Error:', err);
      toast.error('Failed to associate contact');
    }
  };

  if (loading) {
    return <UserDetailSkeleton />;
  }

  // Fallback / initials for reports_to
  const getInitials = (name) => {
    return (name || 'U')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div style={{ padding: '0 8px 30px' }}>
      <style>{`
        .crm-tab-btn {
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          border: none;
          background: transparent;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .crm-tab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .timeline-line {
          position: absolute;
          left: 20px;
          top: 28px;
          bottom: 12px;
          width: 2px;
          background-color: #e2e8f0;
        }

        .timeline-item-container {
          position: relative;
          display: flex;
          gap: 14px;
          padding-bottom: 16px;
        }

        .timeline-item-container:last-child {
          padding-bottom: 0;
        }

        .timeline-node {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          flex-shrink: 0;
          border: 3px solid #fff;
          box-shadow: 0 2px 4px rgb(0 0 0 / 0.05);
        }
        
        .crm-card {
          background-color: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05);
          overflow: hidden;
          transition: box-shadow 0.15s ease;
        }

        .user-detail-grid {
          display: grid;
          grid-template-columns: minmax(310px, 340px) 1fr;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .user-detail-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
      `}</style>
      {/* Breadcrumbs & Header Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600' }}>
          <Link to="/users" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = 'var(--primary)'} onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}>Users</Link>
          <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
          <span style={{ color: 'var(--text-main)' }}>{userData?.name}</span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            type="secondary"
            onClick={() => setIsResetPasswordModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', padding: '8px 14px', borderRadius: '8px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Reset Password
          </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="user-detail-grid">
        {/* ================= LEFT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* USER DETAILS CARD */}
          <div className="crm-card" style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
            {/* Top Avatar & Name Info Section */}
            <div className="profile-top-info" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {userData?.profile_image_url ? (
                  <img src={getFileUrl(userData.profile_image_url)} alt="Profile" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2e8f0' }} />
                ) : (
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #dbeafe',
                    flexShrink: 0,
                    fontSize: '22px',
                    fontWeight: '800',
                    color: '#2563eb'
                  }}>
                    {(userData?.name || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
                    {userData?.name}
                  </h2>
                  <div style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: userData?.status === 'suspended' ? '#fef2f2' : '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '850', color: userData?.status === 'suspended' ? '#dc2626' : '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {userData?.status || 'ACTIVE'}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>
                  {userData?.roles?.role_name || 'Staff'}
                </div>
              </div>
            </div>

            {/* Social Quick Contact Toolbar Pills (Email, Call) */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', width: '100%' }}>
              {userData?.email && (
                <a href={`mailto:${userData.email}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  outline: 'none'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#64748b' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  Email
                </a>
              )}

              {userData?.phone && (
                <a href={`tel:${userData.phone}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  outline: 'none'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#64748b' }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  Call
                </a>
              )}
            </div>

            {/* Structured Rows List redesigned to match profile cards exactly */}
            <div className="profile-structured-rows" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px', marginTop: '24px' }}>
              
              {/* Row 1: Email */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: userData?.email ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (userData?.email) {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => userData?.email && (window.location.href = `mailto:${userData.email}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Email</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userData?.email || 'N/A'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 2: Phone */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: userData?.phone ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (userData?.phone) {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => userData?.phone && (window.location.href = `tel:${userData.phone}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Phone</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userData?.phone || 'N/A'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 3: Role */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Role</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userData?.roles?.role_name || 'Staff'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Location */}
              {userData?.location && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'default', transition: 'all 0.15s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Location</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userData.location}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </span>
              </div>
              )}

              {/* Row 8: Status */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Status</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userData?.status ? userData.status.toUpperCase() : 'ACTIVE'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

            </div>
          </div>

          {/* ASSOCIATED CONTACTS CARD */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-muted)' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: 'var(--text-main)' }}>Associated Contacts ({contacts.length})</h3>
              </div>
              <button 
                onClick={() => setIsAddContactModalOpen(true)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--primary)',
                  color: 'var(--primary)',
                  backgroundColor: 'transparent',
                  fontWeight: '750',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 109, 47, 0.05)'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                + Add Contact
              </button>
            </div>

            {/* Contacts list */}
            {contacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                No associated contacts.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {contacts.slice(0, 3).map((contact, idx) => (
                  <div key={contact.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingBottom: idx < 2 ? '14px' : '0', borderBottom: idx < 2 ? '1px solid var(--border)' : 'none', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        fontSize: '11px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(0, 109, 47, 0.1)',
                        flexShrink: 0
                      }}>
                        {getInitials(contact.first_name + ' ' + (contact.last_name || ''))}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <Link to={`/contacts/${contact.id}`} style={{ fontWeight: '800', fontSize: '13.5px', color: 'var(--text-main)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onMouseOver={(e) => e.target.style.color = 'var(--primary)'} onMouseOut={(e) => e.target.style.color = 'var(--text-main)'}>
                          {contact.first_name} {contact.last_name}
                        </Link>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.company_name || 'Individual'}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} style={{ display: 'flex', color: 'var(--text-muted)' }} title={contact.email}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} style={{ display: 'flex', color: 'var(--text-muted)' }} title={contact.phone}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </a>
                      )}
                      {idx === 0 && (
                        <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '14px', textAlign: 'center' }}>
              <Link to="/contacts" style={{ fontSize: '13px', fontWeight: '750', color: 'var(--primary)', textDecoration: 'none' }} onMouseOver={(e) => e.target.style.color = '#1d4ed8'} onMouseOut={(e) => e.target.style.color = 'var(--primary)'}>
                View All Contacts
              </Link>
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="crm-right-col">

          {/* INLINE EDIT USER FORM */}
          <div className="crm-card" style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Edit User Details</h3>
            </div>

            <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Input
                label="Full Name"
                name="name"
                value={editUserFormik.values.name}
                onChange={(e) => { editUserFormik.handleChange(e); editUserFormik.setFieldTouched('name', true, false); }}
                onBlur={editUserFormik.handleBlur}
                error={editUserFormik.errors.name}
                touched={editUserFormik.touched.name}
                required
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                value={editUserFormik.values.email}
                onChange={(e) => { editUserFormik.handleChange(e); editUserFormik.setFieldTouched('email', true, false); }}
                onBlur={editUserFormik.handleBlur}
                error={editUserFormik.errors.email}
                touched={editUserFormik.touched.email}
                required
              />

              <Input
                label="Phone Number"
                name="phone"
                value={editUserFormik.values.phone}
                onChange={editUserFormik.handleChange}
                onBlur={editUserFormik.handleBlur}
              />

              {isGlobalAdmin && (
                <Select
                  label="Role"
                  name="role_id"
                  value={editUserFormik.values.role_id}
                  onChange={editUserFormik.handleChange}
                  onBlur={editUserFormik.handleBlur}
                  required
                >
                  <option value="">Select a role</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
                </Select>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <Button onClick={editUserFormik.handleSubmit} disabled={editUserFormik.isSubmitting}>
                  {editUserFormik.isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        title="Reset User Password"
        footer={<>
          <Button type="secondary" onClick={() => setIsResetPasswordModalOpen(false)}>Cancel</Button>
          <Button onClick={resetPasswordFormik.handleSubmit} disabled={resetPasswordFormik.isSubmitting}>
            {resetPasswordFormik.isSubmitting ? 'Resetting...' : 'Confirm Reset'}
          </Button>
        </>}
      >
        <form onSubmit={resetPasswordFormik.handleSubmit}>
          <Input
            label="New Password"
            name="password"
            type="password"
            placeholder="Min 6 characters"
            autoComplete="new-password"
            value={resetPasswordFormik.values.password}
            onChange={resetPasswordFormik.handleChange}
            onBlur={resetPasswordFormik.handleBlur}
            error={resetPasswordFormik.errors.password}
            touched={resetPasswordFormik.touched.password}
            required
          />
          <Input
            label="Confirm Password"
            name="re_password"
            type="password"
            placeholder="Re-enter new password"
            autoComplete="new-password"
            value={resetPasswordFormik.values.re_password}
            onChange={resetPasswordFormik.handleChange}
            onBlur={resetPasswordFormik.handleBlur}
            error={resetPasswordFormik.errors.re_password}
            touched={resetPasswordFormik.touched.re_password}
            required
          />
        </form>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        title="Delete User Permanently"
        message={`Are you sure you want to delete ${userData?.name}? This action cannot be undone and will delete all user assignments, timeline records, and system logins permanently.`}
        confirmText="Yes, Delete"
        confirmType="danger"
      />

      {/* ADD ASSOCIATED CONTACT MODAL */}
      <Modal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        title="Associate Contact"
        footer={<>
          <Button type="secondary" onClick={() => setIsAddContactModalOpen(false)}>Cancel</Button>
          <Button onClick={handleLinkContact}>Associate</Button>
        </>}
      >
        <Select
          label="Select Contact to Assign"
          value={newContactId}
          onChange={(e) => setNewContactId(e.target.value)}
          required
        >
          <option value="">â€” Select a Contact â€”</option>
          {allContacts.filter(c => c.assigned_to !== id).map(c => (
            <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.company_name || 'Individual'})</option>
          ))}
        </Select>
      </Modal>
    </div>
  );
}

function DetailRow({ label, value, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>
        <span style={{ display: 'flex', color: 'var(--text-muted)', opacity: 0.6 }}>{icon}</span>
        <span>{label}</span>
      </div>
      <div style={{ color: 'var(--text-main)', fontWeight: '750', textAlign: 'right' }}>
        {value || 'â€”'}
      </div>
    </div>
  );
}


function PaginationControls({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '16px', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
      <button 
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        style={{
          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
          backgroundColor: currentPage === 1 ? 'var(--bg-main)' : '#fff',
          color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          fontSize: '12px', fontWeight: '600', transition: 'all 0.15s'
        }}
      >
        Previous
      </button>
      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
        Page <span style={{ color: 'var(--text-main)' }}>{currentPage}</span> of {totalPages}
      </span>
      <button 
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        style={{
          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
          backgroundColor: currentPage === totalPages ? 'var(--bg-main)' : '#fff',
          color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-main)',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          fontSize: '12px', fontWeight: '600', transition: 'all 0.15s'
        }}
      >
        Next
      </button>
    </div>
  );
}

function UserDetailSkeleton() {
  return (
    <div style={{ padding: '0 8px 30px' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
      `}</style>
      <div className="skeleton" style={{ width: '200px', height: '20px', marginBottom: '24px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '30% 70%', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="skeleton" style={{ height: '380px' }} />
          <div className="skeleton" style={{ height: '200px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="skeleton" style={{ height: '300px' }} />
          <div className="skeleton" style={{ height: '300px' }} />
        </div>
      </div>
    </div>
  );
}
