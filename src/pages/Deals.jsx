import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select, ConfirmModal } from '../components/common/Modal';
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
  
  // Search & Pagination states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);

  // Super Admin view states
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState(null);

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;

  const formik = useFormik({
    initialValues: {
      deal_name: '',
      value: '',
      stage: 'prospecting',
      contact_id: '',
      status: 'open',
      tenant_id: '',
      assigned_to: ''
    },
    validationSchema: Yup.object({
      deal_name: Yup.string().required('Deal name is required'),
      value: Yup.number()
        .typeError('Value must be a number')
        .positive('Value must be greater than 0')
        .required('Deal value is required'),
      tenant_id: Yup.string().required('Company assignment is required'),
      assigned_to: Yup.string().nullable()
    }),
    onSubmit: async (values) => {
      try {
        if (editingDeal) {
          await api.patch(`/deals/${editingDeal.id}`, values);
        } else {
          await api.post('/deals', values);
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

      if (isGlobalAdmin && selectedTenantId) {
          queryParams.append('tenant_id', selectedTenantId);
      }

      if (debouncedSearch) {
          queryParams.append('search', debouncedSearch);
      }

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

  useEffect(() => {
    fetchData();
  }, [selectedTenantId, page, debouncedSearch]);

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

  const handleOpenModal = (deal = null) => {
    if (deal) {
      setEditingDeal(deal);
      formik.setValues({
        deal_name: deal.deal_name,
        value: deal.value,
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
            stage: 'prospecting', 
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

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const columns = [
    { 
      header: 'Deal Name', 
      key: 'deal_name',
      render: (row) => (
        <div style={{ fontWeight: '600' }}>{row.deal_name}</div>
      )
    },
    { 
      header: 'Value', 
      key: 'value',
      render: (row) => formatCurrency(row.value)
    },
    { 
      header: 'Stage', 
      key: 'stage',
      render: (row) => {
        const types = { prospecting: 'primary', qualification: 'warning', proposal: 'warning', negotiation: 'warning', closed: 'success' };
        return <Badge type={types[row.stage]}>{row.stage}</Badge>;
      }
    },
    // Show Company column for Global Admins
    ...(isGlobalAdmin ? [{
        header: 'Owner Company',
        key: 'tenant_name',
        render: (row) => <Badge type="primary">{row.tenant_name || 'Individual'}</Badge>
    }] : []),
    { 
      header: 'Assignee', 
      key: 'assigned_to',
      render: (row) => row.assigned_to_user?.name || 'Unassigned'
    },
    { 
      header: 'Status', 
      key: 'status',
      render: (row) => {
        const types = { open: 'primary', won: 'success', lost: 'danger' };
        return <Badge type={types[row.status]}>{row.status}</Badge>;
      }
    },
    { 
      header: 'Created', 
      key: 'created_at',
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
        {hasPermission('deals.create') && (
          <Button onClick={() => handleOpenModal()}>+ New Deal</Button>
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
            placeholder="Search deal, stage, company..."
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
        data={deals} 
        isLoading={loading}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
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
            error={formik.errors.value}
            touched={formik.touched.value}
            required 
          />
          
          <Select
            label="Contact Partner"
            name="contact_id"
            value={formik.values.contact_id}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          >
            <option value="">Select a contact</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </Select>

          <Select
            label="Assigned To"
            name="assigned_to"
            value={formik.values.assigned_to}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          >
            <option value="">Unassigned</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
                label="Pipeline Stage"
                name="stage"
                value={formik.values.stage}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
            >
                <option value="prospecting">Prospecting</option>
                <option value="qualification">Qualification</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
                <option value="closed">Closed</option>
            </Select>

            <Select
                label="Status"
                name="status"
                value={formik.values.status}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
            >
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
            </Select>
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
