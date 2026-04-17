import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input } from '../components/common/Modal';
import { usePermission } from '../hooks/usePermission';

export default function Contacts() {
  const { hasPermission } = usePermission();
  const [contacts, setContacts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  
  // Search & Pagination states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  
  // Super Admin view states
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantUsers, setTenantUsers] = useState([]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    job_title: '',
    source: '',
    tags: '',
    status: 'lead',
    tenant_id: '',
    assigned_to: ''
  });

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;

  // Fetch users for assignment when tenant selection changes
  useEffect(() => {
    const tid = formData.tenant_id || loggedInUser?.tenantId;
    if (tid) {
      api.get(`/users?tenant_id=${tid}&scope=tenant&limit=100`)
        .then(res => setTenantUsers(res.data.data || []))
        .catch(console.error);
    } else {
      setTenantUsers([]);
    }
  }, [formData.tenant_id]);

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

      const [contactsRes, tenantsRes] = await Promise.all([
        api.get(`/contacts?${queryParams.toString()}`),
        isGlobalAdmin ? api.get('/tenants') : Promise.resolve({ data: { data: [] } })
      ]);
      
      // Response is now { data, totalCount, page, limit }
      setContacts(contactsRes.data.data || []);
      setTotalCount(contactsRes.data.totalCount || 0);

      if (isGlobalAdmin) setTenants(tenantsRes.data.data || []);
    } catch (err) {
      console.error("Fetch Contacts Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch on filter/page change
  useEffect(() => {
    fetchData();
  }, [selectedTenantId, page, debouncedSearch]);

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
      setFormData({
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
        assigned_to: contact.assigned_to || ''
      });
    } else {
      setEditingContact(null);
      setFormData({ 
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
          assigned_to: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await api.patch(`/contacts/${editingContact.id}`, formData);
      } else {
        await api.post('/contacts', formData);
      }
      fetchData();
      handleCloseModal();
    } catch (err) {
      console.error("Save Contact Error:", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this contact?")) {
      await api.delete(`/contacts/${id}`);
      fetchData();
    }
  };

  const columns = [
    { 
      header: 'Name', 
      key: 'name',
      render: (row) => (
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
      )
    },
    { header: 'Email', key: 'email' },
    { header: 'Workplace', key: 'company_name' },
    // Show Company column for Global Admins
    ...(isGlobalAdmin ? [{
        header: 'Owner Company',
        key: 'tenant_name',
        render: (row) => <Badge type="primary">{row.tenants?.tenant_name || 'Individual'}</Badge>
    }] : []),
    { 
      header: 'Status', 
      key: 'status',
      render: (row) => {
        const types = { lead: 'warning', active: 'success', lost: 'danger' };
        return <Badge type={types[row.status]}>{row.status}</Badge>;
      }
    },
    { 
      header: 'Created at', 
      key: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Contacts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Keep track of your prospects and customer relations.</p>
        </div>
        {hasPermission('contacts.create') && (
          <Button onClick={() => handleOpenModal()}>+ Add Contact</Button>
        )}
      </div>

      {/* Filters & Search Row */}
      <div style={{ 
        marginBottom: '24px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
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
                {Array.isArray(tenants) && tenants.map(t => <option key={t.id} value={t.id}>{t.tenant_name}</option>)}
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
            fontSize: '14px'
          }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search name, email, company..."
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

      <DataTable 
        columns={columns} 
        data={contacts} 
        isLoading={loading}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        actions={(row) => (
          <>
            {hasPermission('contacts.update') && (
              <Button type="secondary" size="sm" onClick={() => handleOpenModal(row)}>Edit</Button>
            )}
            {hasPermission('contacts.delete') && (
              <Button type="ghost" size="sm" onClick={() => handleDelete(row.id)}>
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
          <Button onClick={handleSubmit}>{editingContact ? 'Save Changes' : 'Create Contact'}</Button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          {isGlobalAdmin && (
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Assign to Company</label>
                <select 
                  value={formData.tenant_id}
                  onChange={(e) => setFormData({...formData, tenant_id: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: '#fff' }}
                  required
                >
                  <option value="">Select a Company</option>
                  {Array.isArray(tenants) && tenants.map(t => <option key={t.id} value={t.id}>{t.tenant_name}</option>)}
                </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="First Name" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} required />
            <Input label="Last Name" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="Workplace Name" value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} />
            <Input label="Job Title" value={formData.job_title} onChange={(e) => setFormData({...formData, job_title: e.target.value})} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
             <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Assigned To</label>
                <select 
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: '#fff' }}
                >
                  <option value="">Unassigned</option>
                  {tenantUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.roles?.role_name})</option>)}
                </select>
             </div>
             <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Lead Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: '#fff', outline: 'none' }}
                >
                  <option value="lead">Lead</option>
                  <option value="active">Active Customer</option>
                  <option value="lost">Lost</option>
                </select>
             </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="Source" placeholder="e.g. LinkedIn, Referral" value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value})} />
            <Input label="Tags" placeholder="e.g. VIP, Tech" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
