import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input } from '../components/common/Modal';
import { usePermission } from '../hooks/usePermission';

export default function Tasks() {
  const { hasPermission } = usePermission();
  const [tasks, setTasks] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  
  // Super Admin view states
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    status: 'pending',
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

      const [tasksRes, tenantsRes] = await Promise.all([
        api.get(`/tasks?${queryParams.toString()}`),
        isGlobalAdmin ? api.get('/tenants') : Promise.resolve({ data: [] })
      ]);
      
      setTasks(tasksRes.data);
      if (isGlobalAdmin) setTenants(tenantsRes.data);
    } catch (err) {
      console.error("Fetch Tasks Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTenantId]);

  const handleOpenModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        status: task.status,
        tenant_id: task.tenant_id || ''
      });
    } else {
      setEditingTask(null);
      setFormData({ 
          title: '', 
          description: '', 
          due_date: '', 
          status: 'pending',
          tenant_id: isGlobalAdmin ? selectedTenantId : ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await api.patch(`/tasks/${editingTask.id}`, formData);
      } else {
        await api.post('/tasks', formData);
      }
      fetchData();
      handleCloseModal();
    } catch (err) {
      console.error("Save Task Error:", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this task?")) {
      await api.delete(`/tasks/${id}`);
      fetchData();
    }
  };

  const columns = [
    { 
      header: 'Task Title', 
      key: 'title',
      render: (row) => (
        <div>
          <div style={{ fontWeight: '600' }}>{row.title}</div>
          {row.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.description}</div>}
        </div>
      )
    },
    { 
      header: 'Due Date', 
      key: 'due_date',
      render: (row) => row.due_date ? new Date(row.due_date).toLocaleDateString() : '-'
    },
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
        const types = { pending: 'warning', in_progress: 'primary', completed: 'success', cancelled: 'secondary' };
        return <Badge type={types[row.status]}>{row.status.replace('_', ' ')}</Badge>;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Tasks</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Keep track of daily activities and team assignments.</p>
        </div>
        {hasPermission('tasks.create') && (
          <Button onClick={() => handleOpenModal()}>+ New Task</Button>
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
        data={tasks} 
        isLoading={loading}
        actions={(row) => (
          <>
            {hasPermission('tasks.update') && (
              <Button type="secondary" size="sm" onClick={() => handleOpenModal(row)}>Edit</Button>
            )}
            {hasPermission('tasks.delete') && (
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
        title={editingTask ? 'Edit Task' : 'New Task'}
        footer={<>
          <Button type="secondary" onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleSubmit}>{editingTask ? 'Update Task' : 'Create Task'}</Button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          {isGlobalAdmin && !editingTask && (
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

          <Input label="Task Title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Description</label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
               style={{
                width: '100%',
                padding: '10px 12px',
                minHeight: '80px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                fontSize: '14px',
                backgroundColor: '#fff',
                outline: 'none',
                fontFamily: 'inherit'
              }}
              placeholder="What needs to be done?"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Input label="Due Date" type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} />
            
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Status</label>
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
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
