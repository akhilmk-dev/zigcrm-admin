import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api, { FILE_BASE_URL } from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select, ConfirmModal } from '../components/common/Modal';
import { usePermission } from '../hooks/usePermission';
import { toast } from 'react-hot-toast';

export default function Tasks() {
  const { hasPermission } = usePermission();
  const [tasks, setTasks] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [staff, setStaff] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [taskToDelete, setTaskToDelete] = useState(null);
  
  // Search & Pagination states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);

  // Super Admin view states
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      due_date: '',
      status: 'pending',
      priority: 'medium',
      assigned_to: '',
      contact_id: '',
      document_url: '',
      tenant_id: ''
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Task title is required'),
      tenant_id: Yup.string().when('isGlobalAdmin', {
        is: () => isGlobalAdmin && !editingTask,
        then: () => Yup.string().required('Company assignment is required')
      }),
      priority: Yup.string().required('Priority is required')
    }),
    onSubmit: async (values) => {
      try {
        if (editingTask) {
          await api.patch(`/tasks/${editingTask.id}`, values);
          toast.success('Task updated successfully');
        } else {
          await api.post('/tasks', values);
          toast.success('Task created successfully');
        }
        fetchData();
        handleCloseModal();
      } catch (err) {
        console.error("Save Task Error:", err);
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

      const [tasksRes, tenantsRes] = await Promise.all([
        api.get(`/tasks?${queryParams.toString()}`),
        isGlobalAdmin ? api.get('/tenants/selection') : Promise.resolve({ data: [] })
      ]);
      
      setTasks(tasksRes.data.data || []);
      setTotalCount(tasksRes.data.totalCount || 0);

      if (isGlobalAdmin) setTenants(tenantsRes.data || []);
      
      // Fetch staff and contacts for the current tenant or chosen tenant
      const tid = selectedTenantId || loggedInUser.tenantId;
      if (tid) {
        const [staffRes, contactsRes] = await Promise.all([
          api.get(`/users?tenant_id=${tid}`),
          api.get(`/contacts?tenant_id=${tid}&limit=1000`)
        ]);
        setStaff(staffRes.data.data || []);
        setContacts(contactsRes.data.data || []);
      }
    } catch (err) {
      console.error("Fetch Tasks Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTenantId, page, debouncedSearch]);

  // Fetch staff and contacts when formik tenant_id changes (for creation by Super Admin)
  useEffect(() => {
    if (formik.values.tenant_id) {
       formik.setFieldValue('contact_id', ''); // Reset contact when tenant changes
       setContacts([]); // Clear current list while loading new one
       Promise.all([
         api.get(`/users?tenant_id=${formik.values.tenant_id}`),
         api.get(`/contacts?tenant_id=${formik.values.tenant_id}&limit=1000`)
       ]).then(([staffRes, contactsRes]) => {
         setStaff(staffRes.data.data || []);
         setContacts(contactsRes.data.data || []);
       }).catch(console.error);
    } else {
       setStaff([]);
       setContacts([]);
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

  const handleOpenModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      formik.setValues({
        title: task.title,
        description: task.description || '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        status: task.status,
        priority: task.priority || 'medium',
        assigned_to: task.assigned_to || '',
        contact_id: task.contact_id || '',
        document_url: task.document_url || '',
        tenant_id: task.tenant_id || ''
      });
    } else {
      setEditingTask(null);
      formik.resetForm({
        values: {
            title: '', 
            description: '', 
            due_date: '', 
            status: 'pending',
            priority: 'medium',
            assigned_to: '',
            contact_id: '',
            document_url: '',
            tenant_id: isGlobalAdmin ? selectedTenantId : (loggedInUser.tenantId || '')
        }
      });
      setUploadedFileName('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await api.post('/tasks/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      formik.setFieldValue('document_url', res.data.url);
      setUploadedFileName(res.data.fileName || file.name);
      toast.success('Document uploaded');
    } catch (err) {
      console.error("Upload Error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/tasks/${taskToDelete}`);
      toast.success('Task deleted successfully');
      fetchData();
    } catch (err) {
      console.error("Delete Task Error:", err);
    } finally {
      setTaskToDelete(null);
    }
  };

  const columns = [
    { 
      header: 'Task Title', 
      key: 'title',
      render: (row) => (
        <div>
          <div style={{ fontWeight: '600' }}>{row.title}</div>
          {row.description && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {row.description.split(/\s+/).length > 5 
                ? row.description.split(/\s+/).slice(0, 5).join(' ') + '...' 
                : row.description}
            </div>
          )}
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
        render: (row) => <Badge type="primary">{row.tenant_name || 'Individual'}</Badge>
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
      header: 'Priority', 
      key: 'priority',
      render: (row) => {
        const types = { low: 'secondary', medium: 'warning', high: 'danger' };
        return <Badge type={types[row.priority || 'medium']}>{row.priority?.toUpperCase() || 'MEDIUM'}</Badge>;
      }
    },
    { 
      header: 'Assignee', 
      key: 'assigned_to',
      render: (row) => row.assigned_to_user?.name || 'Unassigned'
    },
    {
      header: 'Contact / Partner',
      key: 'contact_name',
      render: (row) => (
        <div style={{ fontSize: '13px' }}>
          {row.contact_first_name ? (
            <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
              {row.contact_first_name} {row.contact_last_name}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          )}
        </div>
      )
    },
    { 
      header: 'Doc', 
      key: 'document_url',
      render: (row) => row.document_url ? (
        <a 
          href={`${FILE_BASE_URL}${row.document_url}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ textDecoration: 'none', fontSize: '18px' }}
          onClick={(e) => e.stopPropagation()}
        >
          📄
        </a>
      ) : '-'
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
            fontSize: '14px'
          }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search task, status, company..."
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
        data={tasks} 
        isLoading={loading}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        actions={(row) => (
          <>
            {hasPermission('tasks.update') && (
              <Button type="secondary" size="sm" onClick={() => handleOpenModal(row)}>Edit</Button>
            )}
            {hasPermission('tasks.delete') && (
              <Button type="ghost" size="sm" onClick={() => setTaskToDelete(row.id)}>
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
          <Button onClick={formik.handleSubmit} disabled={formik.isSubmitting}>
            {editingTask ? (formik.isSubmitting ? 'Updating...' : 'Update Task') : (formik.isSubmitting ? 'Creating...' : 'Create Task')}
          </Button>
        </>}
      >
        <form onSubmit={formik.handleSubmit}>
          {isGlobalAdmin && !editingTask && (
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
            label="Task Title" 
            name="title"
            placeholder="Enter task title"
            value={formik.values.title} 
            onChange={formik.handleChange} 
            onBlur={formik.handleBlur}
            error={formik.errors.title}
            touched={formik.touched.title}
            required 
          />

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Description</label>
            <textarea 
              name="description"
              placeholder="Provide a detailed description of the task..."
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
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
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input 
                label="Due Date" 
                type="date" 
                name="due_date"
                value={formik.values.due_date} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
            />
            
            <Select
                label="Priority"
                name="priority"
                value={formik.values.priority}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
            >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
            </Select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
                label="Assign To"
                name="assigned_to"
                value={formik.values.assigned_to}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
            >
                <option value="">Select Staff</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>

            <Select
                label="Status"
                name="status"
                value={formik.values.status}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
            >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <Select
                label="Contact / Partner"
                name="contact_id"
                value={formik.values.contact_id}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
            >
                <option value="">Select Contact</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.company_name})</option>)}
            </Select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Reference Document</label>
            
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              style={{
                position: 'relative',
                width: '100%',
                minHeight: '120px',
                border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '12px',
                backgroundColor: dragActive ? 'rgba(var(--primary-rgb), 0.05)' : '#fcfcfc',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                overflow: 'hidden'
              }}
              onClick={() => document.getElementById('file-upload').click()}
            >
              <input 
                id="file-upload"
                type="file" 
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                disabled={uploading}
              />
              
              {uploading ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    border: '3px solid rgba(var(--primary-rgb), 0.1)', 
                    borderTopColor: 'var(--primary)', 
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 12px'
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>Uploading document...</span>
                </div>
              ) : formik.values.document_url ? (
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
                  <div style={{ 
                    fontSize: '40px', 
                    marginBottom: '12px',
                    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
                  }}>📄</div>
                  <div style={{ 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    color: '#059669', // Succesful green
                    marginBottom: '4px' 
                  }}>
                    Document Uploaded!
                  </div>
                  {uploadedFileName && (
                    <div style={{ 
                      fontSize: '13px', 
                      color: 'var(--text-muted)', 
                      marginBottom: '12px',
                      maxWidth: '250px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      margin: '0 auto 12px'
                    }}>
                      {uploadedFileName}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px' }}>
                    <a 
                      href={`${FILE_BASE_URL}${formik.values.document_url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ 
                        fontSize: '13px', 
                        color: 'var(--primary)', 
                        fontWeight: '700', 
                        textDecoration: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(var(--primary-rgb), 0.1)'
                      }}
                    >
                      Preview File
                    </a>
                    <Button 
                      size="sm" 
                      type="ghost"
                      onClick={(e) => { e.stopPropagation(); document.getElementById('file-upload').click(); }}
                    >
                      Change File
                    </Button>
                  </div>
                  <style>{`
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                  `}</style>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>📤</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '4px' }}>
                    Click or drag file to upload
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    PDF, DOC, images (max 5MB)
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task?"
      />
    </div>
  );
}
