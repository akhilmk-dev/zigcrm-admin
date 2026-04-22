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
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
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
              fontWeight: 'bold'
            }}>
              {user?.email?.[0].toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800' }}>{user?.email}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>ID: {user?.id}</p>
              <div style={{ marginTop: '8px' }}>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  backgroundColor: 'var(--primary-light)', 
                  color: 'var(--primary)', 
                  padding: '4px 10px', 
                  borderRadius: '20px',
                  textTransform: 'uppercase'
                }}>
                  {user?.isSuperAdmin ? 'Platform Super Admin' : user?.tenantRoleName || 'User'}
                </span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px', borderTop: '1px solid var(--border)', paddingTop: '32px' }}>
             <div>
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Account Status</p>
                <p style={{ fontWeight: '600', color: 'var(--success)' }}>Active</p>
             </div>
             <div>
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Member Since</p>
                <p style={{ fontWeight: '600' }}>April 2026</p>
             </div>
             <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button 
                  size="sm" 
                  onClick={() => setIsModalOpen(true)}
                  style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none' }}
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
