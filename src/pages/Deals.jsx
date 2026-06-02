import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input, ConfirmModal } from '../components/common/Modal';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { FormSelect } from '../components/common/FormSelect';

import { toast } from 'react-hot-toast';
import { usePermission } from '../hooks/usePermission';

export default function Deals() {
  const { hasPermission } = usePermission();
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [staff, setStaff] = useState([]);
  const [filterUsers, setFilterUsers] = useState([]);

  // Search & Pagination states
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [stageFilter, setStageFilter] = useState(searchParams.get('stage') || '');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Super Admin view states
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState(null);

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;
  const showAssigneeFilter = loggedInUser?.user_type !== 'tenant_user';

  const formik = useFormik({
    initialValues: {
      deal_name: '',
      value: '',
      currency: 'USD',
      stage: 'lead',
      contact_id: '',
      status: 'open',
      tenant_id: '',
      assigned_to: ''
    },
    validationSchema: Yup.object({
      deal_name: Yup.string().required('Deal name is required'),
      value: Yup.number()
        .typeError('Invalid value. Only numbers are allowed')
        .min(0, 'Value cannot be negative')
        .required('Deal value is required'),
      tenant_id: Yup.string().required('Company assignment is required'),
      contact_id: Yup.string().required('Contact partner is required'),
      assigned_to: Yup.string().nullable()
    }),
    onSubmit: async (values) => {
      try {
        if (editingDeal) {
          await api.patch(`/deals/${editingDeal.id}`, values);
          toast.success('Deal updated successfully');
        } else {
          await api.post('/deals', values);
          toast.success('Deal created successfully');
        }
        fetchData();
        handleCloseModal();
      } catch (err) {
        console.error("Save Deal Error:", err);
      }
    }
  });

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

      if (statusFilter) queryParams.append('status', statusFilter);
      if (stageFilter) queryParams.append('stage', stageFilter);
      if (assigneeFilter) queryParams.append('assigned_to', assigneeFilter);

      const [dealsRes, tenantsRes] = await Promise.all([
        api.get(`/deals?${queryParams.toString()}`),
        isGlobalAdmin ? api.get('/tenants/selection') : Promise.resolve({ data: [] })
      ]);

      setDeals(dealsRes.data.data || []);
      setTotalCount(dealsRes.data.totalCount || 0);

      if (isGlobalAdmin) setTenants(tenantsRes.data || []);

      // Fetch contacts and staff for the specific tenant or current tenant
      const tid = formik.values.tenant_id || selectedTenantId || loggedInUser.tenantId;
      if (tid) {
        api.get(`/contacts?tenant_id=${tid}&limit=100`).then(res => setContacts(res.data.data || []));
        api.get(`/users?tenant_id=${tid}`).then(res => setStaff(res.data.data || []));
      }

    } catch (err) {
      console.error("Fetch Deals Error:", err);
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

      if (statusFilter) queryParams.append('status', statusFilter);
      if (stageFilter) queryParams.append('stage', stageFilter);
      if (assigneeFilter) queryParams.append('assigned_to', assigneeFilter);

      toast.loading('Exporting deals...', { id: 'export-deals' });
      const response = await api.get(`/deals?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `deals_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Deals exported successfully', { id: 'export-deals' });
    } catch (err) {
      console.error("Export deals failed", err);
      toast.error('Failed to export deals', { id: 'export-deals' });
    }
  };

  // Fetch users for the Assignee Filter
  useEffect(() => {
    if (showAssigneeFilter) {
      const tid = isGlobalAdmin ? selectedTenantId : loggedInUser?.tenantId;
      api.get(`/users?scope=tenant&limit=1000${tid ? `&tenant_id=${tid}` : ''}`)
        .then(res => setFilterUsers(res.data.data || []))
        .catch(console.error);
    }
  }, [selectedTenantId, isGlobalAdmin, loggedInUser?.tenantId, showAssigneeFilter]);

  useEffect(() => {
    fetchData();
  }, [selectedTenantId, page, debouncedSearch, statusFilter, stageFilter, assigneeFilter, sortField, sortOrder]);

  // Handle global search from navbar & stage/status filters from URL
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch !== null) {
      setSearch(urlSearch);
      setDebouncedSearch(urlSearch);
    } else {
      setSearch('');
      setDebouncedSearch('');
    }

    const urlStage = searchParams.get('stage');
    if (urlStage !== null) {
      setStageFilter(urlStage);
    } else {
      setStageFilter('');
    }

    const urlStatus = searchParams.get('status');
    if (urlStatus !== null) {
      setStatusFilter(urlStatus);
    } else {
      setStatusFilter('');
    }

    setPage(1);
  }, [searchParams]);

  // If tenant changes in form, refresh contacts and staff list
  useEffect(() => {
    if (formik.values.tenant_id) {
      api.get(`/contacts?tenant_id=${formik.values.tenant_id}&limit=100`).then(res => setContacts(res.data.data || []));
      api.get(`/users?tenant_id=${formik.values.tenant_id}`).then(res => setStaff(res.data.data || []));
    }
  }, [formik.values.tenant_id]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Synchronize status with pipeline stage
  useEffect(() => {
    const stage = formik.values.stage;
    if (stage === 'won' || stage === 'lost') {
      formik.setFieldValue('status', stage);
    } else if (stage === 'lead' || stage === 'qualification' || stage === 'proposal' || stage === 'negotiation' || stage === 'prospecting') {
      formik.setFieldValue('status', 'open');
    }
  }, [formik.values.stage]);

  const handleOpenModal = (deal = null) => {
    if (deal) {
      setEditingDeal(deal);
      formik.setValues({
        deal_name: deal.deal_name,
        value: deal.value,
        currency: deal.currency || 'INR',
        stage: deal.stage,
        contact_id: deal.contact_id || '',
        status: deal.status,
        tenant_id: deal.tenant_id || '',
        assigned_to: deal.assigned_to || ''
      });
    } else {
      setEditingDeal(null);
      formik.resetForm({
        values: {
          deal_name: '',
          value: '',
          currency: 'INR',
          stage: 'lead',
          contact_id: '',
          status: 'open',
          tenant_id: isGlobalAdmin ? selectedTenantId : (loggedInUser.tenantId || ''),
          assigned_to: ''
        }
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDeal(null);
  };

  const handleDelete = (deal) => {
    setDealToDelete(deal);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!dealToDelete) return;
    try {
      await api.delete(`/deals/${dealToDelete.id}`);
      toast.success('Deal deleted successfully');
      fetchData();
      setDeleteConfirmOpen(false);
    } catch (err) {
      console.error("Delete Deal Error:", err);
      toast.error('Failed to delete deal');
    }
  };

  const formatCurrency = (val, currencyCode = 'USD') => {
    const code = currencyCode || 'USD';
    const locales = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB' };
    return new Intl.NumberFormat(locales[code] || 'en-US', { style: 'currency', currency: code }).format(val);
  };

  const columns = [
    {
      header: 'Deal Name',
      key: 'deal_name',
      sortKey: 'deal_name',
      render: (row) => (
        <Link
          to={`/deals/${row.id}`}
          style={{
            fontWeight: '700',
            color: 'var(--primary)',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => e.target.style.textDecoration = 'underline'}
          onMouseOut={e => e.target.style.textDecoration = 'none'}
        >
          {row.deal_name}
        </Link>
      )
    },
    {
      header: 'Contact Partner',
      key: 'contact',
      render: (row) => row.contact
        ? `${row.contact.first_name} ${row.contact.last_name || ''}`.trim()
        : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No contact</span>
    },
    {
      header: 'Value',
      key: 'value',
      sortKey: 'value',
      render: (row) => formatCurrency(row.value, 'USD')
    },
    {
      header: 'Stage',
      key: 'stage',
      sortKey: 'stage',
      render: (row) => {
        const types = { prospecting: 'primary', lead: 'primary', qualification: 'warning', proposal: 'warning', negotiation: 'warning', won: 'success', lost: 'danger', closed: 'success' };
        const displayStage = row.stage === 'prospecting' ? 'lead' : row.stage;
        return <Badge type={types[row.stage] || 'default'}>{displayStage}</Badge>;
      }
    },
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
        const types = { open: 'primary', won: 'success', lost: 'danger' };
        return <Badge type={types[row.status]}>{row.status}</Badge>;
      }
    },
    {
      header: 'Created',
      key: 'created_at',
      sortKey: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Deals</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>Track your sales pipeline and revenue forecasting.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button type="secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </Button>
          {hasPermission('deals.create') && (
            <Button onClick={() => handleOpenModal()}>+ New Deal</Button>
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
              onChange={(e) => {
                setSelectedTenantId(e.target.value);
                setPage(1);
              }}
              style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', height: '38px', minWidth: '180px', cursor: 'pointer' }}
            >
              <option value="">All Companies (Global View)</option>
              {Array.isArray(tenants) && tenants.map(t => <option key={t.id} value={t.id}>{t.owner_name || t.tenant_name || t.name || 'Unknown Company'}</option>)}
            </select>
          </div>
        )}

        {/* Stage Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stage</span>
          <select
            value={stageFilter}
            onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
            style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', cursor: 'pointer', height: '38px', minWidth: '140px' }}
          >
            <option value="">All Stages</option>
            <option value="lead">Lead</option>
            <option value="qualification">Qualification</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', cursor: 'pointer', height: '38px', minWidth: '140px' }}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
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
              placeholder="Search deal, stage, company..."
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
          const hasFilters = !!(selectedTenantId || stageFilter || statusFilter || assigneeFilter || search);
          return (
            <button
              title={hasFilters ? 'Clear all filters' : 'No active filters'}
              onClick={() => {
                if (!hasFilters) return;
                setSelectedTenantId('');
                setStageFilter('');
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
        data={deals}
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
            {hasPermission('deals.update') && (
              <Button type="secondary" size="sm" onClick={() => handleOpenModal(row)}>Edit</Button>
            )}
            {hasPermission('deals.delete') && (
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
        title={editingDeal ? 'Edit Deal' : 'New Deal'}
        footer={<>
          <Button type="secondary" onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={formik.handleSubmit} disabled={formik.isSubmitting}>
            {editingDeal ? (formik.isSubmitting ? 'Saving...' : 'Save Changes') : (formik.isSubmitting ? 'Creating...' : 'Create Deal')}
          </Button>
        </>}
      >
        <form onSubmit={formik.handleSubmit}>
          {isGlobalAdmin && (
            <FormSelect
              label="Assign to Company"
              name="tenant_id"
              value={formik.values.tenant_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.tenant_id}
              touched={formik.touched.tenant_id}
              required
              placeholder="Select a company"
              options={Array.isArray(tenants) ? tenants.map(t => ({
                value: t.id,
                label: t.owner_name || t.tenant_name || t.name || 'Unknown Company',
                avatar: (t.owner_name || t.tenant_name || t.name || '?')[0].toUpperCase()
              })) : []}
            />
          )}

          <Input
            label="Deal Name"
            name="deal_name"
            placeholder="e.g. Enterprise License"
            value={formik.values.deal_name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.deal_name}
            touched={formik.touched.deal_name}
            required
          />

          <Input
            label="Value ($)"
            type="number"
            name="value"
            placeholder="0.00"
            value={formik.values.value}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            onKeyDown={(e) => {
              if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
            }}
            error={formik.errors.value}
            touched={formik.touched.value}
            required
          />

          <FormSelect
            label="Contact Partner"
            name="contact_id"
            value={formik.values.contact_id}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Select a contact"
            required
            searchable
            error={formik.errors.contact_id}
            touched={formik.touched.contact_id}
            options={contacts.map(c => ({
              value: c.id,
              label: `${c.first_name} ${c.last_name}`,
              avatar: c.first_name?.[0]?.toUpperCase()
            }))}
          />

          <FormSelect
            label="Assigned To"
            name="assigned_to"
            value={formik.values.assigned_to}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Unassigned"
            options={[
              { value: '', label: 'Unassigned' },
              ...staff.map(s => ({ value: s.id, label: s.name, avatar: s.name?.[0]?.toUpperCase() }))
            ]}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormSelect
              label="Pipeline Stage"
              name="stage"
              value={formik.values.stage}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              options={[
                { value: 'lead',          label: 'Lead' },
                { value: 'qualification', label: 'Qualification' },
                { value: 'proposal',      label: 'Proposal' },
                { value: 'negotiation',   label: 'Negotiation' },
                { value: 'won',           label: 'Won',  color: '#10b981' },
                { value: 'lost',          label: 'Lost', color: '#ef4444' },
              ]}
            />

            <FormSelect
              label="Status"
              name="status"
              value={formik.values.status}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              options={[
                { value: 'open', label: 'Open', color: '#3b82f6' },
                { value: 'won',  label: 'Won',  color: '#10b981' },
                { value: 'lost', label: 'Lost', color: '#ef4444' },
              ]}
            />
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Deal"
        message={`Are you sure you want to delete the deal "${dealToDelete?.deal_name}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
        confirmType="danger"
      />
    </div>
  );
}
