import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api, { FILE_BASE_URL, getFileUrl } from '../api/axiosConfig';
import { toast } from 'react-hot-toast';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select, ConfirmModal } from '../components/common/Modal';
import { usePermission } from '../hooks/usePermission';
import { isValidPhoneNumber } from 'libphonenumber-js';

export default function Contacts() {
  const { hasPermission } = usePermission();
  const [contacts, setContacts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  
  // Search & Pagination states
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Super Admin view states
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantUsers, setTenantUsers] = useState([]);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;
  const showAssigneeFilter = loggedInUser?.user_type !== 'tenant_user';

  const formik = useFormik({
    initialValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company_name: '',
      profession: '',
      job_title: '',
      source: '',
      tags: '',
      status: 'lead',
      tenant_id: '',
      assigned_to: '',
      profile_image_url: ''
    },
    validationSchema: Yup.object({
      first_name: Yup.string().required('First name is required'),
      tenant_id: Yup.string().required('Company assignment is required'),
      email: Yup.string().email('Invalid email address').required('Email is required'),
      phone: Yup.string()
        .required('Phone number is required')
        .matches(/^\+?[\d\s-]{7,15}$/, 'Invalid phone number format'),
      company_name: Yup.string().required('Workplace name is required'),
      profession: Yup.string().required('Profession is required')
    }),
    onSubmit: async (values) => {
      try {
        if (editingContact) {
          await api.patch(`/contacts/${editingContact.id}`, values);
          toast.success('Contact updated successfully');
        } else {
          await api.post('/contacts', values);
          toast.success('Contact created successfully');
        }
        fetchData();
        handleCloseModal();
      } catch (err) {
        console.error("Save Contact Error:", err);
      }
    }
  });

  // Fetch users for assignment when tenant selection changes
  useEffect(() => {
    const tid = formik.values.tenant_id || loggedInUser?.tenantId;
    if (tid) {
      api.get(`/users?tenant_id=${tid}&scope=tenant&limit=100`)
        .then(res => setTenantUsers(res.data.data || []))
        .catch(console.error);
    } else {
      setTenantUsers([]);
    }
  }, [formik.values.tenant_id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('limit', pageSize);
      queryParams.append('sortField', sortField);
      queryParams.append('sortOrder', sortOrder);

      if (isGlobalAdmin && selectedTenantId) {
          queryParams.append('tenant_id', selectedTenantId);
      }
      
      if (debouncedSearch) {
          queryParams.append('search', debouncedSearch);
      }

      if (statusFilter) {
          queryParams.append('status', statusFilter);
      }

      if (assigneeFilter) {
          queryParams.append('assigned_to', assigneeFilter);
      }

      const [contactsRes, tenantsRes] = await Promise.all([
        api.get(`/contacts?${queryParams.toString()}`),
        isGlobalAdmin ? api.get('/tenants/selection') : Promise.resolve({ data: [] })
      ]);
      
      setContacts(contactsRes.data.data || []);
      setTotalCount(contactsRes.data.totalCount || 0);

      if (isGlobalAdmin) setTenants(tenantsRes.data || []);
    } catch (err) {
      console.error("Fetch Contacts Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTenantId, page, debouncedSearch, statusFilter, assigneeFilter, sortField, sortOrder]);

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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(search);
        setPage(1); // Reset page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      formik.setValues({
        first_name: contact.first_name,
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company_name: contact.company_name || '',
        job_title: contact.job_title || '',
        source: contact.source || '',
        tags: contact.tags || '',
        status: contact.status,
        tenant_id: contact.tenant_id || '',
        assigned_to: contact.assigned_to || '',
        profile_image_url: contact.profile_image_url || '',
        profession: contact.profession || ''
      });
    } else {
      setEditingContact(null);
      formik.resetForm({
        values: {
            first_name: '', 
            last_name: '', 
            email: '', 
            phone: '', 
            company_name: '', 
            job_title: '',
            source: '',
            tags: '',
            status: 'lead',
            tenant_id: isGlobalAdmin ? selectedTenantId : (loggedInUser?.tenantId || ''),
            assigned_to: '',
            profile_image_url: '',
            profession: ''
        }
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleDelete = (contact) => {
    setContactToDelete(contact);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    try {
      await api.delete(`/contacts/${contactToDelete.id}`);
      toast.success('Contact deleted successfully');
      fetchData();
      setDeleteConfirmOpen(false);
    } catch (err) {
      console.error("Delete Contact Error:", err);
      toast.error('Failed to delete contact');
    }
  };

  const columns = [
    { 
      header: 'Name', 
      key: 'name',
      sortKey: 'first_name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            overflow: 'hidden', 
            backgroundColor: 'var(--bg-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)'
          }}>
            {row.profile_image_url ? (
               <img src={getFileUrl(row.profile_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
               <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                 {row.first_name?.[0]}{row.last_name?.[0]}
               </span>
            )}
          </div>
          <Link 
            to={`/contacts/${row.id}`}
            style={{ 
              fontWeight: '600', 
              color: 'var(--primary)', 
              textDecoration: 'none',
              transition: 'color 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--primary-hover)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--primary)'}
          >
            {row.first_name} {row.last_name}
          </Link>
        </div>
      )
    },
    { header: 'Email', key: 'email', sortKey: 'email' },
    { header: 'Workplace', key: 'company_name', sortKey: 'company_name' },
    { header: 'Profession', key: 'profession', sortKey: 'profession', render: (row) => row.profession || '—' },
    // Show Company column for Global Admins
    ...(isGlobalAdmin ? [{
        header: 'Owner Company',
        key: 'tenant_name',
        sortKey: 'tenant_id',
        render: (row) => <Badge type="primary">{row.tenant_name || 'Individual'}</Badge>
    }] : []),
    { 
      header: 'Assignee', 
      key: 'assigned_to',
      sortKey: 'assigned_to_user(name)',
      render: (row) => row.assigned_to_user?.name || 'Unassigned'
    },
    { 
      header: 'Status', 
      key: 'status',
      sortKey: 'status',
      render: (row) => {
        const types = { lead: 'warning', active: 'success', lost: 'danger' };
        return <Badge type={types[row.status]}>{row.status}</Badge>;
      }
    },
    { 
      header: 'Created at', 
      key: 'created_at',
      sortKey: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Contacts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>Keep track of your prospects and customer relations.</p>
        </div>
        {hasPermission('contacts.create') && (
          <Button onClick={() => handleOpenModal()}>+ Add Contact</Button>
        )}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isGlobalAdmin && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>Filter by Company:</span>
              <select 
                value={selectedTenantId} 
                onChange={(e) => {
                  setSelectedTenantId(e.target.value);
                  setPage(1);
                }}
                style={{ marginLeft: '12px', padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
              >
                <option value="">All Companies (Global View)</option>
                {Array.isArray(tenants) && tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: isGlobalAdmin ? '12px' : '0' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>Status:</span>
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
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="">All Statuses</option>
              <option value="lead">Lead</option>
              <option value="active">Active Customer</option>
              <option value="lost">Lost</option>
              <option value="vip">VIP</option>
            </select>
          </div>

          {/* Assignee Filter */}
          {showAssigneeFilter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>Assignee:</span>
              <select
                value={assigneeFilter}
                onChange={(e) => {
                  setAssigneeFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Assignees</option>
                <option value="unassigned">Unassigned Only</option>
              </select>
            </div>
          )}
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
            placeholder="Search name, email, workplace, profession..."
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
        data={contacts} 
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
            {hasPermission('contacts.update') && (
              <Button type="secondary" size="sm" onClick={() => handleOpenModal(row)}>Edit</Button>
            )}
            {hasPermission('contacts.delete') && (
              <Button type="ghost" size="sm" onClick={() => handleDelete(row)}>
                <span style={{ color: 'var(--danger)' }}>Delete</span>
              </Button>
            )}
          </>
        )}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingContact ? 'Edit Contact' : 'New Contact'}
        footer={<>
          <Button type="secondary" onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={formik.handleSubmit} disabled={formik.isSubmitting}>
            {editingContact ? (formik.isSubmitting ? 'Saving...' : 'Save Changes') : (formik.isSubmitting ? 'Creating...' : 'Create Contact')}
          </Button>
        </>}
      >
        <form onSubmit={formik.handleSubmit}>
          {/* Profile Image Upload */}
          <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '24px', 
              backgroundColor: 'var(--bg-muted)', 
              border: '2px dashed var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {formik.values.profile_image_url ? (
                 <img src={getFileUrl(formik.values.profile_image_url)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '24px' }}>👤</span>
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
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Click avatar to upload profile picture</p>
          </div>

          {isGlobalAdmin && (
            <Select
                label="Assign to Company"
                name="tenant_id"
                value={formik.values.tenant_id}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.errors.tenant_id}
                touched={formik.touched.tenant_id}
                required
            >
                <option value="">Select a Company</option>
                {Array.isArray(tenants) && tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input 
                label="First Name" 
                name="first_name"
                placeholder="John"
                value={formik.values.first_name} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
                error={formik.errors.first_name}
                touched={formik.touched.first_name}
                required 
            />
            <Input 
                label="Last Name" 
                name="last_name"
                placeholder="Doe"
                value={formik.values.last_name} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input 
                label="Email" 
                type="email" 
                name="email"
                placeholder="john.doe@example.com"
                value={formik.values.email} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
                error={formik.errors.email}
                touched={formik.touched.email}
                required
            />
            <Input 
                label="Phone" 
                name="phone"
                placeholder="+1 (555) 000-0000"
                value={formik.values.phone} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
                error={formik.errors.phone}
                touched={formik.touched.phone}
                required
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input 
                label="Workplace Name" 
                name="company_name"
                placeholder="Acme Corp"
                value={formik.values.company_name} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
                error={formik.errors.company_name}
                touched={formik.touched.company_name}
                required
            />
            <Input 
                label="Profession" 
                name="profession"
                placeholder="e.g. Attorney, Realtor"
                value={formik.values.profession} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
                error={formik.errors.profession}
                touched={formik.touched.profession}
                required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
                label="Assigned To"
                name="assigned_to"
                value={formik.values.assigned_to}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
            >
                <option value="">Unassigned</option>
                {tenantUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.roles?.role_name})</option>)}
            </Select>

            <Input 
                label="Job Title" 
                name="job_title"
                placeholder="e.g. CEO, Sales VP"
                value={formik.values.job_title} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
                label="Lead Status"
                name="status"
                value={formik.values.status}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
            >
                <option value="lead">Lead</option>
                <option value="active">Active Customer</option>
                <option value="lost">Lost</option>
                <option value="vip">VIP</option>
            </Select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input 
                label="Source" 
                name="source"
                placeholder="e.g. LinkedIn, Referral" 
                value={formik.values.source} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
            />
            <Input 
                label="Tags" 
                name="tags"
                placeholder="e.g. VIP, Tech" 
                value={formik.values.tags} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
            />
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Contact"
        message={`Are you sure you want to delete ${contactToDelete?.first_name} ${contactToDelete?.last_name}? This action cannot be undone.`}
        confirmText="Yes, Delete"
        confirmType="danger"
      />
    </div>
  );
}
