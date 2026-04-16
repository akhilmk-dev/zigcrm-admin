import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input } from '../components/common/Modal';

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);

  // Pagination, Search, and Filter states
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({
    tenant_name: '',
    company_email: '',
    phone: '',
    country: '',
    status: 'active'
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pageSize,
        search: debouncedSearch,
        status: statusFilter
      });
      const response = await api.get(`/tenants?${params.toString()}`);
      setTenants(response.data.data);
      setTotalCount(response.data.totalCount);
    } catch (err) {
      console.error("Failed to fetch tenants", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [page, debouncedSearch, statusFilter]);

  const handleOpenModal = (tenant = null) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        tenant_name: tenant.tenant_name,
        company_email: tenant.company_email || '',
        phone: tenant.phone || '',
        country: tenant.country || '',
        status: tenant.status
      });
    } else {
      setEditingTenant(null);
      setFormData({
        tenant_name: '',
        company_email: '',
        phone: '',
        country: '',
        status: 'active'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTenant(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTenant) {
        await api.patch(`/tenants/${editingTenant.id}`, formData);
      } else {
        await api.post('/tenants', formData);
      }
      fetchTenants();
      handleCloseModal();
    } catch (err) {
      console.error("Failed to save tenant", err);
      alert(err.response?.data?.error || "Error saving tenant");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this tenant? This cannot be undone.")) {
      try {
        await api.delete(`/tenants/${id}`);
        fetchTenants();
      } catch (err) {
        console.error("Failed to delete tenant", err);
      }
    }
  };

  const columns = [
    {
      header: 'Company Name',
      render: (row) => (
        <div style={{ fontWeight: '600' }}>{row.tenant_name}</div>
      )
    },
    { header: 'Email', key: 'company_email' },
    { header: 'Country', key: 'country' },
    {
      header: 'Status',
      render: (row) => {
        const types = { active: 'success', trial: 'warning', suspended: 'danger', inactive: 'secondary' };
        return <Badge type={types[row.status]}>{row.status}</Badge>;
      }
    },
    {
      header: 'Joined',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Tenants</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Manage all registered platform companies and their status.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <span>+</span> Add Tenant
        </Button>
      </div>

      {/* Filters & Search Row */}
      <div style={{ 
        marginBottom: '24px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'flex-end'
      }}>
        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>Filter by Status:</span>
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
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
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
            placeholder="Search name, email or country..."
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
        data={tenants}
        isLoading={loading}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        actions={(row) => (
          <>
            <Button type="secondary" size="sm" onClick={() => handleOpenModal(row)}>Edit</Button>
            <Button type="ghost" size="sm" onClick={() => handleDelete(row.id)}>
              <span style={{ color: 'var(--danger)' }}>Delete</span>
            </Button>
          </>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
        footer={
          <>
            <Button type="secondary" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingTenant ? 'Update Tenant' : 'Create Tenant'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Company Name"
            placeholder="Acme Inc."
            value={formData.tenant_name}
            onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
            required
          />
          <Input
            label="Company Email"
            type="email"
            placeholder="admin@acme.com"
            value={formData.company_email}
            onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Phone"
              placeholder="+1..."
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Country"
              placeholder="USA"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
