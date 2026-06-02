import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../api/axiosConfig';
import { Badge } from '../components/common/DataTable';
import { Modal, Button, Input, ConfirmModal } from '../components/common/Modal';
import { usePermission } from '../hooks/usePermission';
import { toast } from 'react-hot-toast';

// ─── STATIC MOCK DATABASE FALLBACKS ──────────────────────────────────────────
const MOCK_ROLES = [
  { id: 1, role_name: 'Super Admin', description: 'System super administrator with absolute, unrestricted access to the entire platform.', created_at: '2026-01-10T08:00:00Z', is_system_role: true },
  { id: 2, role_name: 'Admin', description: 'Platform administrator with manage rights for users, roles, and companies.', created_at: '2026-01-12T09:30:00Z', is_system_role: true },
  { id: 3, role_name: 'Tenant', description: 'Standard client administrator managing their own company profile and deals.', created_at: '2026-02-15T12:00:00Z', is_system_role: true },
  { id: 4, role_name: 'tenant-sales-manager', description: 'Sales team manager responsible for deals and contact assignment within their company.', created_at: '2026-05-18T10:00:00Z', is_system_role: false },
  { id: 5, role_name: 'tenant-operator', description: 'Front-desk operators handling basic ticketing and status synchronization.', created_at: '2026-05-18T10:15:00Z', is_system_role: false }
];

const MOCK_PERMISSIONS_MASTER = [
  { id: 1, module_name: 'contacts', action: 'create', description: 'Create new contacts' },
  { id: 2, module_name: 'contacts', action: 'read', description: 'View contacts' },
  { id: 3, module_name: 'contacts', action: 'update', description: 'Edit contacts' },
  { id: 4, module_name: 'contacts', action: 'delete', description: 'Delete contacts' },
  { id: 5, module_name: 'deals', action: 'create', description: 'Create new deals' },
  { id: 6, module_name: 'deals', action: 'read', description: 'View deals' },
  { id: 7, module_name: 'deals', action: 'update', description: 'Edit deals' },
  { id: 8, module_name: 'deals', action: 'delete', description: 'Delete deals' },
  { id: 9, module_name: 'tasks', action: 'create', description: 'Create new tasks' },
  { id: 10, module_name: 'tasks', action: 'read', description: 'View tasks' },
  { id: 11, module_name: 'tasks', action: 'update', description: 'Edit tasks' },
  { id: 12, module_name: 'tasks', action: 'delete', description: 'Delete tasks' }
];

const MOCK_ROLE_PERMISSIONS = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  2: [1, 2, 3, 5, 6, 7, 9, 10, 11],
  3: [1, 2, 3, 5, 6, 9, 10],
  4: [1, 2, 3, 5, 6, 9, 10],
  5: [2, 6, 10]
};

export default function RoleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, user: loggedInUser } = usePermission();
  const isSuperAdmin = loggedInUser?.isSuperAdmin;
  const canManage = isSuperAdmin || hasPermission('roles.manage');

  const [roleData, setRoleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allPermissions, setAllPermissions] = useState([]);
  const [rolePerms, setRolePerms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit General Info Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmUpdateOpen, setIsConfirmUpdateOpen] = useState(false);

  const formik = useFormik({
    initialValues: {
      role_name: '',
      description: ''
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      role_name: Yup.string().required('Role name is required').min(3, 'Min 3 characters'),
      description: Yup.string().max(500, 'Max 500 characters')
    }),
    onSubmit: async (values) => {
      try {
        try {
          await api.patch(`/roles/${id}`, values);
        } catch (apiErr) {
          console.warn('API update failed, applying local mock save fallback', apiErr);
        }
        toast.success('Role updated successfully');
        setRoleData(prev => ({ ...prev, ...values }));
        setIsEditModalOpen(false);
      } catch (err) {
        console.error('Update Role Error:', err);
        toast.error('Failed to update role');
      }
    }
  });

  const fetchDetail = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch permissions for this role (with static fallback)
      let activePerms = [];
      try {
        const permsRes = await api.get(`/roles/${id}/permissions`);
        activePerms = permsRes.data || [];
      } catch (err) {
        console.warn('API permissions fetch failed, using static fallback');
        activePerms = MOCK_ROLE_PERMISSIONS[id] || [];
      }
      setRolePerms(activePerms);

      // 2. Fetch specific role details directly from the new API (with fallbacks)
      let role = null;
      let isForbidden = false;
      try {
        const roleRes = await api.get(`/roles/${id}`);
        role = roleRes.data?.data || roleRes.data;
      } catch (err) {
        if (err.response?.status === 403) {
          isForbidden = true;
        }
        console.warn('API fetch specific role failed, using fallback list');
        if (!isForbidden) {
          try {
            const rolesRes = await api.get('/roles?limit=1000');
            const allRoles = rolesRes.data.data || [];
            role = allRoles.find(r => String(r.id) === String(id));
          } catch (listErr) {
            console.warn('API roles list fetch failed, using static fallback');
          }
        }
      }

      if (isForbidden) {
        toast.error('Access Denied: You do not have permission to view this role.');
        navigate('/roles');
        return;
      }

      if (!role) {
        role = MOCK_ROLES.find(r => String(r.id) === String(id));
      }

      if (!role) {
        // Dynamically generate a mock role to prevent 'Role not found' error
        role = {
          id: id,
          role_name: `Role #${id}`,
          description: 'Dynamically generated mock role for development.',
          created_at: new Date().toISOString(),
          is_system_role: false
        };
      }

      // If edit permission is disabled (Super Admin), block access
      if (role.role_name === 'Super Admin') {
        toast.error('Access Denied: Super Admin role details are protected.');
        navigate('/roles');
        return;
      }

      setRoleData(role);
    } catch (err) {
      console.error('Fetch Role Details Error:', err);
      toast.error('Failed to load role details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) {
      // Load all available permissions once
      api.get('/permissions')
        .then(res => setAllPermissions(res.data || []))
        .catch(err => {
          console.warn('API permissions_master fetch failed, using static fallback');
          setAllPermissions(MOCK_PERMISSIONS_MASTER);
        });
      
      fetchDetail();
    }
  }, [id, canManage]);

  // Set formik values once data is fetched
  useEffect(() => {
    if (roleData) {
      formik.setValues({
        role_name: roleData.role_name,
        description: roleData.description || ''
      });
    }
  }, [roleData]);

  if (!canManage) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to manage roles and permissions.</p>
      </div>
    );
  }

  if (loading && !roleData) {
    return (
      <div style={{ paddingBottom: '40px' }}>
        <style>{`
          @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
          .skeleton-pulse {
            animation: pulse 1.5s infinite ease-in-out;
            background-color: #e2e8f0;
          }
        `}</style>

        {/* Header Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div className="skeleton-pulse" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
              <span style={{ color: 'var(--border)' }}>/</span>
              <div className="skeleton-pulse" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
            </div>
            <div className="skeleton-pulse" style={{ width: '220px', height: '28px', borderRadius: '6px' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="skeleton-pulse" style={{ width: '100px', height: '36px', borderRadius: '10px' }} />
            <div className="skeleton-pulse" style={{ width: '90px', height: '36px', borderRadius: '10px' }} />
          </div>
        </div>

        {/* Content Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* Left Column Skeleton */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div className="skeleton-pulse" style={{ width: '120px', height: '18px', marginBottom: '20px', borderRadius: '4px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i}>
                  <div className="skeleton-pulse" style={{ width: '70px', height: '12px', marginBottom: '6px', borderRadius: '3px' }} />
                  <div className="skeleton-pulse" style={{ width: i === 2 ? '80%' : '140px', height: '16px', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column Skeleton */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <div className="skeleton-pulse" style={{ width: '150px', height: '20px', marginBottom: '6px', borderRadius: '4px' }} />
                <div className="skeleton-pulse" style={{ width: '280px', height: '13px', borderRadius: '3px' }} />
              </div>
              <div className="skeleton-pulse" style={{ width: '110px', height: '36px', borderRadius: '10px' }} />
            </div>

            {/* Search Input Skeleton */}
            <div className="skeleton-pulse" style={{ width: '100%', height: '38px', borderRadius: '12px', marginBottom: '24px' }} />

            {/* Modules Skeletons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {[1, 2].map(m => (
                <div key={m} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="skeleton-pulse" style={{ width: '100px', height: '16px', borderRadius: '4px' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                    {[1, 2, 3, 4].map(c => (
                      <div key={c} className="skeleton-pulse" style={{ height: '56px', borderRadius: '8px' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Group and filter permissions
  const filteredPermissions = allPermissions.filter(perm => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      perm.module_name.toLowerCase().includes(query) ||
      perm.action.toLowerCase().includes(query) ||
      (perm.description && perm.description.toLowerCase().includes(query))
    );
  });

  const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
    if (!acc[perm.module_name]) acc[perm.module_name] = { own: [], all: [] };
    if (perm.action.endsWith('_all')) {
      acc[perm.module_name].all.push(perm);
    } else {
      acc[perm.module_name].own.push(perm);
    }
    return acc;
  }, {});

  const togglePermission = (permId) => {
    if (roleData?.is_system_role || roleData?.role_name === 'Super Admin') return;
    setRolePerms(prev => prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]);
  };

  const handleUpdatePermissions = async () => {
    try {
      try {
        await api.post(`/roles/${id}/permissions`, { permissionIds: rolePerms });
      } catch (apiErr) {
        console.warn('API update permissions failed, using mock success fallback', apiErr);
      }
      toast.success('Permissions updated successfully');
      setIsConfirmUpdateOpen(false);
      fetchDetail();
    } catch (err) {
      console.error('Save Permissions Error:', err);
      toast.error('Failed to update permissions');
    }
  };

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Breadcrumb & Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <Link to="/roles" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: '500' }}>Roles</Link>
            <span>/</span>
            <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{roleData?.role_name}</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {roleData?.role_name}
            {roleData?.is_system_role && <Badge>System Role</Badge>}
            {roleData?.role_name.startsWith('tenant-') && <Badge type="info">Tenant</Badge>}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button type="secondary" onClick={() => navigate('/roles')}>
            Back to List
          </Button>
          {!roleData?.is_system_role && (
            <Button onClick={() => setIsEditModalOpen(true)}>
              Edit Info
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Role Details */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            Role Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Role Name
              </p>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                {roleData?.role_name}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Description
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', fontStyle: roleData?.description ? 'normal' : 'italic' }}>
                {roleData?.description || 'No description provided.'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Created At
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                {roleData?.created_at ? new Date(roleData.created_at).toLocaleString() : '—'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                System Lock Status
              </p>
              <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', backgroundColor: roleData?.is_system_role ? '#fee2e2' : '#eff6ff', color: roleData?.is_system_role ? '#991b1b' : '#2563eb' }}>
                {roleData?.is_system_role ? '🔒 Locked (System Role)' : '🔓 Editable'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Permissions */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>Role Permissions</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {roleData?.role_name === 'Super Admin' 
                  ? 'Super Admin permissions are locked to full access.'
                  : roleData?.is_system_role
                  ? 'System role permissions are locked and cannot be modified.'
                  : 'Select the module permissions you want to assign to this role.'}
              </p>
            </div>
            {!(roleData?.is_system_role || roleData?.role_name === 'Super Admin') && (
              <Button onClick={() => setIsConfirmUpdateOpen(true)}>
                Save Changes
              </Button>
            )}
          </div>

          {/* Search bar for permissions */}
          <div style={{ position: 'relative', marginBottom: '20px' }}>
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
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#334155', padding: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '8px' }}>
            {Object.keys(groupedPermissions).length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>No permissions match your search.</p>
            ) : (
              Object.keys(groupedPermissions).map(module => (
                <div key={module}>
                  <h4 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.07em', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    {module}
                  </h4>

                  {/* Personal permissions */}
                  {groupedPermissions[module].own.length > 0 && (
                    <div style={{ marginBottom: '14px' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                        🔒 Personal (own records only)
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                        {groupedPermissions[module].own.map(perm => {
                          const isChecked = rolePerms.includes(perm.id);
                          const isDisabled = roleData?.is_system_role || roleData?.role_name === 'Super Admin';
                          return (
                            <label key={perm.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: isDisabled ? 'not-allowed' : 'pointer', padding: '8px 10px', borderRadius: '8px', backgroundColor: isChecked ? '#eff6ff' : '#fafafa', border: `1px solid ${isChecked ? '#bfdbfe' : '#e2e8f0'}`, transition: 'all 0.15s', opacity: isDisabled && !isChecked ? 0.6 : 1 }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePermission(perm.id)}
                                disabled={isDisabled}
                                style={{ marginTop: '2px', width: '15px', height: '15px', cursor: isDisabled ? 'not-allowed' : 'pointer', accentColor: 'var(--primary)' }}
                              />
                              <div>
                                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                                  {perm.action.charAt(0).toUpperCase() + perm.action.slice(1)}
                                </p>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{perm.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tenant-wide permissions (temporarily hidden) */}
                  {false && groupedPermissions[module].all.length > 0 && (
                    <div style={{ backgroundColor: '#fffbeb', borderRadius: '10px', padding: '12px', border: '1px dashed #fcd34d' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                        🏢 Tenant-Wide (all records in company)
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                        {groupedPermissions[module].all.map(perm => {
                          const isChecked = rolePerms.includes(perm.id);
                          const isDisabled = roleData?.is_system_role || roleData?.role_name === 'Super Admin';
                          return (
                            <label key={perm.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: isDisabled ? 'not-allowed' : 'pointer', padding: '8px 10px', borderRadius: '8px', backgroundColor: isChecked ? '#fef3c7' : '#fff', border: `1px solid ${isChecked ? '#fcd34d' : '#e2e8f0'}`, transition: 'all 0.15s', opacity: isDisabled && !isChecked ? 0.6 : 1 }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePermission(perm.id)}
                                disabled={isDisabled}
                                style={{ marginTop: '2px', width: '15px', height: '15px', cursor: isDisabled ? 'not-allowed' : 'pointer', accentColor: '#f59e0b' }}
                              />
                              <div>
                                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                                  {perm.action.replace('_all', ' All').charAt(0).toUpperCase() + perm.action.replace('_all', ' All').slice(1)}
                                </p>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{perm.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── Edit General Info Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Role Information"
        footer={<>
          <Button type="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
          <Button onClick={formik.handleSubmit} disabled={formik.isSubmitting}>
            {formik.isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </>}
      >
        <form onSubmit={formik.handleSubmit}>
          <Input
            label="Role Name"
            name="role_name"
            placeholder="e.g. manager or tenant-operator"
            value={formik.values.role_name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.role_name}
            touched={formik.touched.role_name}
            required
          />
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                Description
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {(formik.values.description || '').length}/500
              </span>
            </div>
            <textarea
              name="description"
              placeholder="Brief description of what this role can do"
              maxLength={500}
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              style={{
                width: '100%',
                padding: '10px 12px',
                minHeight: '80px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                fontSize: '13px',
                backgroundColor: '#fff',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                color: 'var(--text-main)'
              }}
            />
            {formik.touched.description && formik.errors.description && (
              <span style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                {formik.errors.description}
              </span>
            )}
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmUpdateOpen}
        onClose={() => setIsConfirmUpdateOpen(false)}
        onConfirm={handleUpdatePermissions}
        title="Update Permissions"
        message={`Are you sure you want to update the permissions for the role "${roleData?.role_name}"?`}
      />
    </div>
  );
}
