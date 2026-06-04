import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useSearchParams, Link } from 'react-router-dom';
import api, { FILE_BASE_URL, getFileUrl } from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input, ConfirmModal } from '../components/common/Modal';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { FormSelect } from '../components/common/FormSelect';
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
  const [filterUsers, setFilterUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [contactDeals, setContactDeals] = useState([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  
  // Search & Pagination states
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Super Admin view states
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;
  const showAssigneeFilter = loggedInUser?.user_type !== 'tenant_user';

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
      tenant_id: '',
      deal_id: ''
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Task title is required'),
      tenant_id: Yup.string().when('isGlobalAdmin', {
        is: () => isGlobalAdmin && !editingTask,
        then: () => Yup.string().required('Company assignment is required')
      }),
      priority: Yup.string().required('Priority is required'),
      contact_id: Yup.string().required('Contact / Partner is required')
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

  // Fetch deals when contact_id changes
  useEffect(() => {
    const contactId = formik.values.contact_id;
    if (contactId) {
      setLoadingDeals(true);
      const tenantId = formik.values.tenant_id || selectedTenantId || loggedInUser?.tenantId;
      api.get(`/deals/selection?contact_id=${contactId}${tenantId ? `&tenant_id=${tenantId}` : ''}`)
        .then(res => {
          setContactDeals(res.data.data || []);
        })
        .catch(console.error)
        .finally(() => setLoadingDeals(false));
    } else {
      setContactDeals([]);
      formik.setFieldValue('deal_id', '');
    }
  }, [formik.values.contact_id, formik.values.tenant_id, selectedTenantId, loggedInUser?.tenantId]);

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
      if (priorityFilter) queryParams.append('priority', priorityFilter);
      if (assigneeFilter) queryParams.append('assigned_to', assigneeFilter);

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
  }, [selectedTenantId, page, debouncedSearch, statusFilter, priorityFilter, assigneeFilter, sortField, sortOrder]);

  // Handle global search from navbar and status from URL
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
      // Extract filename from URL if it exists
      if (task.document_url) {
        const parts = task.document_url.split('/');
        setUploadedFileName(parts[parts.length - 1]);
      } else {
        setUploadedFileName('');
      }
      formik.setValues({
        title: task.title,
        description: task.description || '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        status: task.status,
        priority: task.priority || 'medium',
        assigned_to: task.assigned_to || '',
        contact_id: task.contact_id || '',
        document_url: task.document_url || '',
        tenant_id: task.tenant_id || '',
        deal_id: task.deal_id || ''
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
            tenant_id: isGlobalAdmin ? selectedTenantId : (loggedInUser.tenantId || ''),
            deal_id: ''
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
      toast.success('Document uploaded successfully');
    } catch (err) {
      console.error("Upload Error:", err);
      const errorMsg = err.response?.data?.error || 'Failed to upload document';
      toast.error(errorMsg);
    } finally {
      setUploading(false);
      // Reset input value so the same file can be selected again if needed
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
    }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    const deletedTaskObj = tasks.find(t => t.id === taskToDelete);
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
      sortKey: 'title',
      render: (row) => (
        <div>
          <Link to={`/tasks/${row.id}`} style={{ fontWeight: '600', color: 'var(--primary)', textDecoration: 'none' }}>{row.title}</Link>
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
      sortKey: 'due_date',
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
          href={getFileUrl(row.document_url)} 
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
      sortKey: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Tasks</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>Keep track of daily activities and team assignments.</p>
        </div>
        {hasPermission('tasks.create') && (
          <Button onClick={() => handleOpenModal()} style={{ borderRadius: '6px' }}>+ New Task</Button>
        )}
      </div>

      {/* Filters & Search Row */}
      <div className="filter-bar" style={{ borderRadius: '6px' }}>
        {isGlobalAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Company</span>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                value={selectedTenantId}
                onChange={(e) => { setSelectedTenantId(e.target.value); setPage(1); }}
                style={{ appearance: 'none', WebkitAppearance: 'none', padding: '8px 36px 8px 12px', borderRadius: '6px', border: '1px solid rgb(203, 213, 225)', fontSize: '13px', outline: 'none', backgroundColor: '#fff', height: '38px', minWidth: '180px', cursor: 'pointer', width: '100%' }}
              >
                <option value="">All Companies (Global View)</option>
                {Array.isArray(tenants) && tenants.map(t => <option key={t.id} value={t.id}>{t.owner_name || t.tenant_name || t.name || 'Unknown Company'}</option>)}
              </select>
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </span>
            </div>
          </div>
        )}

        {/* Priority Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Priority</span>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              style={{ appearance: 'none', WebkitAppearance: 'none', padding: '8px 36px 8px 12px', borderRadius: '6px', border: '1px solid rgb(203, 213, 225)', fontSize: '13px', outline: 'none', backgroundColor: '#fff', height: '38px', minWidth: '140px', cursor: 'pointer', width: '100%' }}
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b', display: 'flex', alignItems: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </div>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Status</span>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ appearance: 'none', WebkitAppearance: 'none', padding: '8px 36px 8px 12px', borderRadius: '6px', border: '1px solid rgb(203, 213, 225)', fontSize: '13px', outline: 'none', backgroundColor: '#fff', height: '38px', minWidth: '140px', cursor: 'pointer', width: '100%' }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b', display: 'flex', alignItems: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </div>
        </div>

        {/* Assignee Filter */}
        {showAssigneeFilter && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Assignee</span>
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
              innerStyle={{ padding: '8px 12px', minHeight: 'auto', borderRadius: '6px', fontSize: '13px', border: '1px solid rgb(203, 213, 225)', backgroundColor: '#fff', height: '38px' }}
            />
          </div>
        )}

        {/* Search Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '220px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Search</span>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search task, status, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 32px 8px 36px', borderRadius: '6px', border: '1px solid rgb(203, 213, 225)', fontSize: '13px', outline: 'none', backgroundColor: '#fff', transition: 'border-color 0.2s', height: '38px', boxSizing: 'border-box' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'rgb(203, 213, 225)'}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#334155', padding: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Reset Button */}
        {(() => {
          const hasFilters = !!(selectedTenantId || priorityFilter || statusFilter || assigneeFilter || search);
          return (
            <button
              title={hasFilters ? 'Clear all filters' : 'No active filters'}
              onClick={() => {
                if (!hasFilters) return;
                setSelectedTenantId('');
                setPriorityFilter('');
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
                borderRadius: '6px',
                border: `1px solid ${hasFilters ? '#f87171' : 'rgb(203, 213, 225)'}`,
                backgroundColor: hasFilters ? '#fff1f2' : '#f8fafc',
                color: hasFilters ? '#dc2626' : '#cbd5e1',
                cursor: hasFilters ? 'pointer' : 'default',
                transition: 'all 0.2s',
                alignSelf: 'flex-end',
                flexShrink: 0
              }}
              onMouseOver={(e) => { if (hasFilters) e.currentTarget.style.backgroundColor = '#fee2e2'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = hasFilters ? '#fff1f2' : '#f8fafc'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
          );
        })()}
      </div>

      <DataTable 
        columns={columns} 
        data={tasks} 
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
            {hasPermission('tasks.update') && (
              <Button type="secondary" size="sm" onClick={() => handleOpenModal(row)} title="Edit Task" style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </Button>
            )}
            {hasPermission('tasks.delete') && (
              <Button type="ghost" size="sm" onClick={() => setTaskToDelete(row.id)} title="Delete Task" style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
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
            <FormSelect
              label="Assign to Company"
              name="tenant_id"
              value={formik.values.tenant_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.tenant_id}
              touched={formik.touched.tenant_id}
              required
              searchable
              placeholder="Select a Company"
              options={Array.isArray(tenants) ? tenants.map(t => ({
                value: t.id,
                label: t.owner_name || t.tenant_name || t.name || 'Unknown Company',
                avatar: (t.owner_name || t.tenant_name || t.name || '?')[0].toUpperCase()
              })) : []}
            />
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
              onBlur={(e) => { formik.handleBlur(e); e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              style={{
                width: '100%',
                padding: '10px 12px',
                minHeight: '80px',
                borderRadius: '8px',
                border: '1.5px solid var(--border)',
                fontSize: '14px',
                backgroundColor: '#fff',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
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
              min={new Date().toISOString().split('T')[0]}
            />

            <FormSelect
              label="Priority"
              name="priority"
              value={formik.values.priority}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              required
              options={[
                { value: 'low',    label: 'Low',    color: '#10b981' },
                { value: 'medium', label: 'Medium', color: '#f59e0b' },
                { value: 'high',   label: 'High',   color: '#ef4444' },
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <FormSelect
              label="Assign To"
              name="assigned_to"
              value={formik.values.assigned_to}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              searchable
              placeholder="Select Staff"
              options={[
                { value: '', label: 'Unassigned' },
                ...staff.map(s => ({ value: s.id, label: s.name, avatar: s.name?.[0]?.toUpperCase() }))
              ]}
            />

            <FormSelect
              label="Status"
              name="status"
              value={formik.values.status}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              options={[
                { value: 'pending',     label: 'Pending',     color: '#f59e0b' },
                { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
                { value: 'completed',   label: 'Completed',   color: '#10b981' },
                { value: 'cancelled',   label: 'Cancelled',   color: '#ef4444' },
              ]}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <FormSelect
              label="Contact / Partner"
              name="contact_id"
              value={formik.values.contact_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.contact_id}
              touched={formik.touched.contact_id}
              required
              searchable
              placeholder="Select Contact"
              options={contacts.map(c => ({
                value: c.id,
                label: `${c.first_name} ${c.last_name}${c.company_name ? ` (${c.company_name})` : ''}`,
                avatar: c.first_name?.[0]?.toUpperCase()
              }))}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <FormSelect
              label="Associated Deal"
              name="deal_id"
              value={formik.values.deal_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={!formik.values.contact_id || loadingDeals}
              placeholder={formik.values.contact_id ? (loadingDeals ? 'Loading deals…' : 'Select Deal (Optional)') : 'Please select a contact first'}
              options={[
                { value: '', label: 'None' },
                ...contactDeals.map(d => ({ value: d.id, label: d.name }))
              ]}
            />
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
                    color: 'var(--primary)', // Succesful blue
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
                      href={getFileUrl(formik.values.document_url)} 
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
                      htmlType="button"
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
