import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import { Modal, Button, Input, ConfirmModal } from '../components/common/Modal';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../api/axiosConfig';
import { toast } from 'react-hot-toast';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = usePermission();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      editFormik.setFieldValue('profileImage', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleFinalSubmit = async () => {
    setIsUpdating(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: formik.values.currentPassword,
        newPassword: formik.values.newPassword
      });
      toast.success('Password changed successfully.');
      setIsModalOpen(false);
      setIsLoggingOut(true); // Trigger full screen loader

      setTimeout(() => {
        handleLogout();
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password');
      setIsUpdating(false);
      setShowFinalConfirm(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },
    validationSchema: Yup.object({
      currentPassword: Yup.string().required('Current password is required'),
      newPassword: Yup.string()
        .required('New password is required')
        .min(6, 'Password must be at least 6 characters'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('newPassword'), null], 'Passwords must match')
        .required('Please confirm your new password')
    }),
    onSubmit: async () => {
      setShowFinalConfirm(true);
    }
  });

  const editFormik = useFormik({
    initialValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      country: user?.country || '',
      timezone: user?.timezone || '',
      profileImage: null
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      name: Yup.string().required('Name is required'),
      email: Yup.string().email('Invalid email').required('Email is required'),
      phone: Yup.string().nullable(),
    }),
    onSubmit: async (values) => {
      setIsSavingProfile(true);
      try {
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('email', values.email);
        formData.append('phone', values.phone || '');
        formData.append('address', values.address || '');
        formData.append('country', values.country || '');
        formData.append('timezone', values.timezone || '');
        if (values.profileImage) {
          formData.append('file', values.profileImage);
        }

        const response = await api.patch('/profile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Profile updated successfully');

        // Update local storage and state
        const updatedUser = { ...user, ...response.data.data };
        if (response.data.profileImageUrl) {
          updatedUser.profile_image_url = response.data.profileImageUrl;
        }
        localStorage.setItem('user', JSON.stringify(updatedUser));

        setIsEditModalOpen(false);
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to update profile');
      } finally {
        setIsSavingProfile(false);
      }
    }
  });

  if (isLoggingOut) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #2563eb',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>Password changed successfully!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Logging out for security...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const groupedPermissions = user?.permissions?.reduce((acc, perm) => {
    if (perm === '*') return acc;
    const [module, action] = perm.split('.');
    if (!acc[module]) acc[module] = [];
    acc[module].push(action);
    return acc;
  }, {}) || {};

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>My Profile</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Overview of your account settings and access level.</p>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        {/* User Info Card */}
        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px', marginBottom: '32px' }}>
            {/* Column 1: Profile Icon */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 'bold',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0, 109, 47, 0.2)'
              }}>
                {user?.profile_image_url ? (
                  <img src={user.profile_image_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user?.email?.[0].toUpperCase()
                )}
              </div>
            </div>

            {/* Column 2: Profile Info */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>{user?.email}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>ID: {user?.id}</p>
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                padding: '4px 12px',
                borderRadius: '20px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {user?.isSuperAdmin ? 'Platform Super Admin' : user?.tenantRoleName || 'User'}
              </span>
            </div>

            {/* Column 3: Edit Profile Button */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div
                onClick={() => setIsEditModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '700',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  transition: 'all 0.2s',
                  backgroundColor: 'var(--primary-light)',
                  border: '1px solid transparent'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 109, 47, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit Profile
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '32px',
            borderTop: '1px solid var(--border)',
            paddingTop: '32px'
          }}>
            {/* Column 1: Account Status */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>Account Status</p>
              <p style={{ fontWeight: '700', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>
                Active
              </p>
            </div>

            {/* Column 2: Member Since */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>Member Since</p>
              <p style={{ fontWeight: '700', color: 'var(--text-main)' }}>April 2026</p>
            </div>

            {/* Column 3: Change Password Button */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Button
                size="sm"
                onClick={() => setIsModalOpen(true)}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                }}
              >
                🔒 Change Password
              </Button>
            </div>
          </div>
        </div>

        {/* Permissions Card */}
        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px' }}>Active Permissions</h3>

          {user?.permissions?.includes('*') ? (
            <div style={{ padding: '24px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
              <p style={{ fontWeight: '600', color: 'var(--primary)' }}>Master Access Enabled</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>As a Super Admin, you have unrestricted access to all platform and CRM modules.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {Object.keys(groupedPermissions).length > 0 ? Object.keys(groupedPermissions).map(module => (
                <div key={module} style={{ padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: 'var(--radius)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'capitalize', color: 'var(--text-main)', marginBottom: '12px' }}>{module}</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {groupedPermissions[module].map(action => (
                      <span key={action} style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        backgroundColor: '#fff',
                        color: 'var(--text-muted)',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)'
                      }}>
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              )) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No permissions assigned to this role.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Update Security Credentials"
        footer={
          <>
            <Button type="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={formik.handleSubmit}>Update Password</Button>
          </>
        }
      >
        <form onSubmit={formik.handleSubmit}>
          <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              For your security, you must provide your current password to set a new one. After updating, you will be signed out of all devices.
            </p>
          </div>

          <Input
            label="Current Password"
            name="currentPassword"
            type="password"
            placeholder="••••••••"
            value={formik.values.currentPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.currentPassword}
            touched={formik.touched.currentPassword}
            required
          />

          <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

          <Input
            label="New Password"
            name="newPassword"
            type="password"
            placeholder="••••••••"
            value={formik.values.newPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.newPassword}
            touched={formik.touched.newPassword}
            required
          />

          <Input
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={formik.values.confirmPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.confirmPassword}
            touched={formik.touched.confirmPassword}
            required
          />
        </form>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile Details"
        footer={
          <>
            <Button type="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={editFormik.handleSubmit} loading={isSavingProfile}>
              {isSavingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={editFormik.handleSubmit}>
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Image Upload Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                <img
                  src={imagePreview || user?.profile_image_url || 'https://via.placeholder.com/100'}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-light)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <label htmlFor="profileImage" style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s'
                }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                  <input type="file" id="profileImage" hidden accept="image/*" onChange={handleImageChange} />
                </label>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Change Profile Picture</p>
            </div>

            <Input
              label="Full Name"
              name="name"
              placeholder="Your Name"
              value={editFormik.values.name}
              onChange={editFormik.handleChange}
              onBlur={editFormik.handleBlur}
              error={editFormik.errors.name}
              touched={editFormik.touched.name}
              required
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="your@email.com"
              value={editFormik.values.email}
              onChange={editFormik.handleChange}
              onBlur={editFormik.handleBlur}
              error={editFormik.errors.email}
              touched={editFormik.touched.email}
              required
            />

            <Input
              label="Phone Number"
              name="phone"
              placeholder="+1 234 567 890"
              value={editFormik.values.phone}
              onChange={editFormik.handleChange}
              onBlur={editFormik.handleBlur}
              error={editFormik.errors.phone}
              touched={editFormik.touched.phone}
            />

            {(user?.user_type === 'tenant_admin' || user?.isSuperAdmin) && (
              <>
                <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Organization Details</p>

                <Input
                  label="Address"
                  name="address"
                  placeholder="123 Street, City"
                  value={editFormik.values.address}
                  onChange={editFormik.handleChange}
                  onBlur={editFormik.handleBlur}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Input
                    label="Country"
                    name="country"
                    placeholder="USA"
                    value={editFormik.values.country}
                    onChange={editFormik.handleChange}
                    onBlur={editFormik.handleBlur}
                  />
                  <Input
                    label="Timezone"
                    name="timezone"
                    placeholder="UTC+0"
                    value={editFormik.values.timezone}
                    onChange={editFormik.handleChange}
                    onBlur={editFormik.handleBlur}
                  />
                </div>
              </>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showFinalConfirm}
        onClose={() => setShowFinalConfirm(false)}
        onConfirm={handleFinalSubmit}
        title="Confirm Password Change"
        message="Are you sure you want to change your password? You will be logged out immediately after the update."
        confirmLabel={isUpdating ? "Updating..." : "Yes, Change Password"}
        type="primary"
      />
    </div>
  );
}
