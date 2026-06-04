import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import { Modal, Button, Input, ConfirmModal } from '../components/common/Modal';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../api/axiosConfig';
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
  const [profileData, setProfileData] = useState(user);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/profile');
        if (response.data?.data) {
          setProfileData(response.data.data);
          localStorage.setItem('user', JSON.stringify({ ...user, ...response.data.data }));
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
  }, []);

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

  const getParsedPhone = () => {
    let matchedCode = '+91';
    let matchedPhone = profileData?.phone || '';
    if (profileData?.phone && profileData.phone.startsWith('+')) {
      const sortedCountries = [...countries].sort((a, b) => b.code.length - a.code.length);
      const foundCountry = sortedCountries.find(c => profileData.phone.startsWith(c.code));
      if (foundCountry) {
        matchedCode = foundCountry.code;
        matchedPhone = profileData.phone.substring(foundCountry.code.length);
      }
    }
    return { phoneCode: matchedCode, phone: matchedPhone };
  };

  const parsedPhone = getParsedPhone();

  const editFormik = useFormik({
    validateOnChange: true,
    validateOnBlur: true,
    initialValues: {
      name: profileData?.name || '',
      email: profileData?.email || '',
      phoneCode: parsedPhone.phoneCode,
      phone: parsedPhone.phone,
      address: profileData?.address || '',
      country: profileData?.country || '',
      profileImage: null
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      name: Yup.string().required('Name is required').min(3, 'Minimum 3 characters required').max(60, 'Maximum 60 characters allowed').matches(/^[a-zA-Z\s'-]*$/, 'Special characters or symbols are not allowed'),
      email: Yup.string().matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email address').required('Email is required'),
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
    }),
    onSubmit: async (values) => {
      setIsSavingProfile(true);
      try {
        const phoneWithoutSpaces = values.phone?.replace(/[\s()-]/g, '') || '';
        const formattedPhone = `${values.phoneCode}${phoneWithoutSpaces}`;

        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('email', values.email);
        formData.append('phone', formattedPhone);
        formData.append('address', values.address || '');
        formData.append('country', values.country || '');
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

  const profileItems = [
    {
      label: 'Full Name',
      value: profileData?.name || '',
      icon: (
        <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
    {
      label: 'Email',
      value: profileData?.email || '',
      icon: (
        <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      )
    },
    {
      label: 'Date Joined',
      value: profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
      icon: (
        <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    },
    {
      label: 'Role',
      value: user?.isSuperAdmin ? 'Platform Super Admin' : (profileData?.roles?.role_name || profileData?.tenantRoleName || ''),
      icon: (
        <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      )
    },
    {
      label: 'Phone',
      value: profileData?.phone || '',
      icon: (
        <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      )
    },
    {
      label: 'Department',
      value: profileData?.department || '',
      icon: (
        <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <line x1="9" y1="22" x2="9" y2="16" />
          <line x1="15" y1="22" x2="15" y2="16" />
          <line x1="9" y1="16" x2="15" y2="16" />
          <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M12 6h.01M12 10h.01" />
        </svg>
      )
    },
    {
      label: 'Address',
      value: profileData?.address || profileData?.country || '',
      icon: (
        <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )
    },
    {
      label: 'Username',
      value: profileData?.username || profileData?.email?.split('@')[0] || '',
      icon: (
        <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 14a4 4 0 0 0-4-4h0a4 4 0 0 0-4 4" />
          <circle cx="12" cy="7" r="2" />
        </svg>
      )
    }
  ];

  const filteredProfileItems = profileItems.filter(item => {
    const isTenantUser = user?.user_type === 'tenant_admin' || user?.user_type === 'tenant_user' || user?.isTenant;
    if (isTenantUser && (item.label === 'Department' || item.label === 'Username')) {
      return false;
    }
    return true;
  });

  const getPermissionsList = () => {
    const isSuper = user?.isSuperAdmin || user?.permissions?.includes('*');
    
    if (isSuper) {
      const superModules = [
        { module: 'Leads', actions: ['manage', 'create', 'update', 'delete', 'view'], desc: 'Unrestricted administration, creation, modification, and tracking of leads.' },
        { module: 'Contacts', actions: ['manage', 'create', 'update', 'delete', 'view'], desc: 'Unrestricted administration, creation, modification, and management of client contacts.' },
        { module: 'Deals', actions: ['manage', 'create', 'update', 'delete', 'view'], desc: 'Unrestricted administration, creation, modification, and tracking of deals/pipelines.' },
        { module: 'Tasks', actions: ['manage', 'create', 'update', 'delete', 'view'], desc: 'Unrestricted access to manage, assign, track, and complete CRM tasks.' },
        { module: 'Users', actions: ['manage', 'create', 'update', 'delete', 'view'], desc: 'Unrestricted administration and management of organization users and memberships.' },
        { module: 'Roles', actions: ['manage', 'create', 'update', 'delete', 'view'], desc: 'Unrestricted creation, assignment, and modification of permission roles.' },
        { module: 'Reports', actions: ['view', 'read'], desc: 'Access to view analytical dashboards and performance metrics.', level: 'Read Only' }
      ];
      return superModules.map(m => ({
        module: m.module,
        actions: m.actions,
        accessLevel: m.level || 'Full Access',
        desc: m.desc
      }));
    }

    const rawPermissions = user?.permissions || [];
    const grouped = {};
    
    rawPermissions.forEach(perm => {
      if (!perm || perm === '*') return;
      const parts = perm.split('.');
      if (parts.length < 2) return;
      
      const moduleKey = parts[0];
      const actionKey = parts[1];
      
      if (!grouped[moduleKey]) {
        grouped[moduleKey] = [];
      }
      if (!grouped[moduleKey].includes(actionKey)) {
        grouped[moduleKey].push(actionKey);
      }
    });

    const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

    return Object.keys(grouped).map(moduleKey => {
      const actions = grouped[moduleKey];
      const moduleName = capitalize(moduleKey);
      
      const hasWritePrivileges = actions.some(action => 
        ['manage', 'create', 'write', 'delete', 'update', 'edit', 'add'].includes(action.toLowerCase())
      );
      const accessLevel = hasWritePrivileges ? 'Full Access' : 'Read Only';
      
      const actionsString = actions.map(act => act.toLowerCase()).join(', ');
      const desc = `Assigned privileges in the ${moduleKey} module: ${actionsString}.`;

      return {
        module: moduleName,
        actions,
        accessLevel,
        desc
      };
    });
  };

  const permissionsList = getPermissionsList();

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 24px 48px 24px', boxSizing: 'border-box' }}>
      
      {/* Header section exactly like provided image */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Profile</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onClick={() => navigate('/')}>Home</span>
            <span>&gt;</span>
            <span style={{ color: '#0f172a', fontWeight: '500' }}>Profile</span>
          </div>
        </div>
        
        {/* Buttons exactly like the mockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsEditModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1.5px solid #3b82f6',
              color: '#3b82f6',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#eff6ff';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit Profile
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1.5px solid #3b82f6',
              color: '#3b82f6',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#eff6ff';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Change Password
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        
        {/* Profile Information Card */}
        <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 24px 0' }}>Profile Information</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '36px', flexWrap: 'wrap' }}>
            
            {/* Left: Avatar with green active indicator */}
            <div style={{ position: 'relative', width: '110px', height: '110px' }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                fontWeight: '700',
                overflow: 'hidden',
                border: '1px solid #e2e8f0'
              }}>
                {profileData?.profile_image_url ? (
                  <img src={profileData.profile_image_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  profileData?.name ? profileData.name[0].toUpperCase() : 'U'
                )}
              </div>
              
              {/* Green indicator */}
              <div style={{
                position: 'absolute',
                bottom: '4px',
                right: '4px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                border: '3px solid #ffffff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}></div>
            </div>

            {/* Right: Info grid of exactly 9 properties */}
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px 32px'
            }}>
              {filteredProfileItems.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '2px' }}>{item.label}</div>
                    <div style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: '700' }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Active Permissions Card */}
        <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Active Permissions</h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px 0' }}>This is a list of permissions currently active for your account.</p>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', textAlign: 'left', padding: '12px 16px' }}>Module</th>
                  <th style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', textAlign: 'left', padding: '12px 16px' }}>Active Permissions</th>
                  <th style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', textAlign: 'left', padding: '12px 16px' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {permissionsList.map((perm, idx) => (
                  <tr key={idx} style={{ borderBottom: idx === permissionsList.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" stroke="#2563eb"></circle>
                        <polyline points="16 9 11 14 8 11"></polyline>
                      </svg>
                      <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#0f172a' }}>{perm.module}</span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {perm.actions.map((act, actIdx) => (
                          <span key={actIdx} style={{
                            fontSize: '11.5px',
                            fontWeight: '600',
                            backgroundColor: '#f8fafc',
                            color: '#475569',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            border: '1.5px solid #e2e8f0',
                            textTransform: 'lowercase',
                            display: 'inline-block'
                          }}>
                            {act}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13.5px', color: '#64748b' }}>{perm.desc}</td>
                  </tr>
                ))}
                {permissionsList.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                      No active permissions assigned to your role.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
            placeholder="Enter your current password"
            autoComplete="current-password"
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
            placeholder="Enter your new password"
            autoComplete="new-password"
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
            placeholder="Re-enter your new password"
            autoComplete="new-password"
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
              onChange={(e) => { editFormik.handleChange(e); editFormik.setFieldTouched('name', true, false); }}
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
              onChange={(e) => { editFormik.handleChange(e); editFormik.setFieldTouched('email', true, false); }}
              onBlur={editFormik.handleBlur}
              error={editFormik.errors.email}
              touched={editFormik.touched.email}
              required
            />

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', width: '100%' }}>
              <div style={{ width: '140px', flexShrink: 0 }}>
                <SearchableCountryCodeSelect
                  label="Code"
                  value={editFormik.values.phoneCode}
                  onChange={(code) => editFormik.setFieldValue('phoneCode', code)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  label="Phone Number"
                  name="phone"
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={editFormik.values.phone}
                  onChange={editFormik.handleChange}
                  onBlur={editFormik.handleBlur}
                  onKeyDown={(e) => {
                    if (
                      ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) ||
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
                  error={editFormik.errors.phone}
                  touched={editFormik.touched.phone}
                  required
                />
              </div>
            </div>

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
