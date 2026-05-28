import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api, { FILE_BASE_URL, getFileUrl, saveActivityLog } from '../api/axiosConfig';
import { toast } from 'react-hot-toast';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select, ConfirmModal } from '../components/common/Modal';
import { SearchableSelect } from '../components/common/SearchableSelect';
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
  const [filterUsers, setFilterUsers] = useState([]);

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
      profile_image_url: '',
      address: '',
      gst_no: ''
    },
    validationSchema: Yup.object({
      first_name: Yup.string().required('First name is required'),
      tenant_id: Yup.string().required('Company assignment is required'),
      email: Yup.string().email('Invalid email address').required('Email is required'),
      phone: Yup.string()
        .required('Phone number is required')
        .matches(/^\+?[\d\s-]{7,15}$/, 'Invalid phone number format'),
      company_name: Yup.string(),
      profession: Yup.string()
    }),
    onSubmit: async (values) => {
      try {
        if (editingContact) {
          await api.patch(`/contacts/${editingContact.id}`, values);
          toast.success('Contact updated successfully');
          saveActivityLog({
            contact_id: editingContact.id,
            activity_type: 'contact_updated',
            title: 'Updated Contact',
            description: `Updated details of ${values.first_name} ${values.last_name || ''}`
          });
        } else {
          const response = await api.post('/contacts', values);
          toast.success('Contact created successfully');
          if (response.data) {
            saveActivityLog({
              contact_id: response.data.id,
              activity_type: 'contact_created',
              title: 'Created Contact',
              description: `Created contact: ${values.first_name} ${values.last_name || ''}`
            });
          }
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

  // Fetch users for the Assignee Filter
  useEffect(() => {
    if (showAssigneeFilter) {
      const tid = isGlobalAdmin ? selectedTenantId : loggedInUser?.tenantId;
      api.get(`/users?scope=tenant&limit=1000${tid ? `&tenant_id=${tid}` : ''}`)
        .then(res => setFilterUsers(res.data.data || []))
        .catch(console.error);
    }
  }, [selectedTenantId, isGlobalAdmin, loggedInUser?.tenantId, showAssigneeFilter]);

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

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('sortField', sortField);
      queryParams.append('sortOrder', sortOrder);
      queryParams.append('export', 'true');

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

      toast.loading('Exporting contacts...', { id: 'export-contacts' });
      const response = await api.get(`/contacts?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contacts_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Contacts exported successfully', { id: 'export-contacts' });
    } catch (err) {
      console.error("Export contacts failed", err);
      toast.error('Failed to export contacts', { id: 'export-contacts' });
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTenantId, page, debouncedSearch, statusFilter, assigneeFilter, sortField, sortOrder]);

  // Handle global search and status from URL
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch !== null) {
      setSearch(urlSearch);
      setDebouncedSearch(urlSearch);
    } else {
      setSearch('');
      setDebouncedSearch('');
    }

    const urlStatus = searchParams.get('status');
    if (urlStatus !== null) {
      setStatusFilter(urlStatus);
    } else {
      setStatusFilter('');
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
        profession: contact.profession || '',
        address: contact.address || '',
        gst_no: contact.gst_no || ''
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
          profession: '',
          address: '',
          gst_no: ''
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
      saveActivityLog({
        contact_id: contactToDelete.id,
        activity_type: 'contact_deleted',
        title: 'Deleted Contact',
        description: `Deleted contact: ${contactToDelete.first_name} ${contactToDelete.last_name || ''}`
      });
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
      header: 'Owner / Company',
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
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button type="secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </Button>
          {hasPermission('contacts.create') && (
            <Button onClick={() => handleOpenModal()}>+ Add Contact</Button>
          )}
        </div>
      </div>
      {/* Sticky Filters & Search Row */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        padding: '16px 20px',
        margin: '0 0 20px 0',
        display: 'flex',
        width: '100%',
        boxSizing: 'border-box',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'flex-end'
      }}>
        {isGlobalAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filter by Company</span>
            <select
              value={selectedTenantId}
              onChange={(e) => { setSelectedTenantId(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', height: '38px', minWidth: '180px', cursor: 'pointer' }}
            >
              <option value="">All Companies (Global View)</option>
              {Array.isArray(tenants) && tenants.map(t => <option key={t.id} value={t.id}>{t.owner_name || t.tenant_name || t.name || 'Unknown Company'}</option>)}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', cursor: 'pointer', height: '38px', minWidth: '140px' }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assignee</span>
            <SearchableSelect
              name="assigneeFilter"
              value={assigneeFilter}
              onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }}
              options={[
                { value: '', label: 'All Assignees' },
                { value: 'unassigned', label: 'Unassigned Only' },
                ...filterUsers.map(u => ({ value: u.id, label: u.name }))
              ]}
              placeholder="All Assignees"
              style={{ width: '220px', marginBottom: 0 }}
              innerStyle={{ padding: '8px 12px', minHeight: 'auto', borderRadius: '12px', fontSize: '13px', border: '1px solid var(--border)', backgroundColor: '#f8fafc', height: '38px' }}
            />
          </div>
        )}

        {/* Search Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '280px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search</span>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              style={{ width: '100%', padding: '10px 32px 10px 36px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', transition: 'border-color 0.2s', height: '38px' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#334155', padding: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Restore Button */}
        {(() => {
          const hasFilters = !!(selectedTenantId || statusFilter || assigneeFilter || search);
          return (
            <button
              title={hasFilters ? 'Clear all filters' : 'No active filters'}
              onClick={() => {
                if (!hasFilters) return;
                setSelectedTenantId('');
                setStatusFilter('');
                setAssigneeFilter('');
                setSearch('');
                setPage(1);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                border: `1px solid ${hasFilters ? '#f87171' : 'var(--border)'}`,
                backgroundColor: hasFilters ? '#fff1f2' : '#f8fafc',
                color: hasFilters ? '#dc2626' : '#cbd5e1',
                cursor: hasFilters ? 'pointer' : 'default',
                transition: 'all 0.2s',
                alignSelf: 'flex-end'
              }}
              onMouseOver={(e) => { if (hasFilters) e.currentTarget.style.backgroundColor = '#fee2e2'; }}
              onMouseOut={(e) => { if (hasFilters) e.currentTarget.style.backgroundColor = '#fff1f2'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          );
        })()}
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
              {Array.isArray(tenants) && tenants.map(t => <option key={t.id} value={t.id}>{t.owner_name || t.tenant_name || t.name || 'Unknown Company'}</option>)}
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
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Address"
              name="address"
              placeholder="e.g. 123 Main St"
              value={formik.values.address}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.address}
              touched={formik.touched.address}
            />
            <Input
              label="GST Number"
              name="gst_no"
              placeholder="e.g. 22AAAAA0000A1Z5"
              value={formik.values.gst_no}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.gst_no}
              touched={formik.touched.gst_no}
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
