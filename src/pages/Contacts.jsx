import React, { useState, useEffect } from 'react';
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
  
  // Super Admin view states
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    status: 'lead',
    tenant_id: ''
  });

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (isGlobalAdmin && selectedTenantId) {
          queryParams.append('tenant_id', selectedTenantId);
      }

      const [contactsRes, tenantsRes] = await Promise.all([
        api.get(`/contacts?${queryParams.toString()}`),
        isGlobalAdmin ? api.get('/tenants') : Promise.resolve({ data: [] })
      ]);
      
      setContacts(contactsRes.data);
      if (isGlobalAdmin) setTenants(tenantsRes.data);
    } catch (err) {
      console.error("Fetch Contacts Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTenantId]);

  const handleOpenModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        first_name: contact.first_name,
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company_name: contact.company_name || '',
        status: contact.status,
        tenant_id: contact.tenant_id || ''
      });
    } else {
      setEditingContact(null);
      setFormData({ 
          first_name: '', 
          last_name: '', 
          email: '', 
          phone: '', 
          company_name: '', 
          status: 'lead',
          tenant_id: isGlobalAdmin ? selectedTenantId : ''
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
        <div style={{ fontWeight: '600' }}>{row.first_name} {row.last_name}</div>
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

      {isGlobalAdmin && (
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>Filter by Company:</span>
            <select 
              value={selectedTenantId} 
              onChange={(e) => setSelectedTenantId(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '14px', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="">All Companies (Global View)</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.tenant_name}</option>)}
            </select>
        </div>
      )}

      <DataTable 
        columns={columns} 
        data={contacts} 
        isLoading={loading}
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
          {isGlobalAdmin && !editingContact && (
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Assign to Company</label>
                <select 
                  value={formData.tenant_id}
                  onChange={(e) => setFormData({...formData, tenant_id: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '14px', backgroundColor: '#fff' }}
                  required
                >
                  <option value="">Select a Company</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.tenant_name}</option>)}
                </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="First Name" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} required />
            <Input label="Last Name" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
          </div>
          <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          <Input label="Workplace Name" value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} />
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Lead Status</label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                fontSize: '14px',
                backgroundColor: '#fff',
                outline: 'none'
              }}
            >
              <option value="lead">Lead</option>
              <option value="active">Active Customer</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
