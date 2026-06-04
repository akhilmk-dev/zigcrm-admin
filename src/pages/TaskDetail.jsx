import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api, { getFileUrl } from '../api/axiosConfig';
import { Badge } from '../components/common/DataTable';
import { Modal, Button, Input, ConfirmModal } from '../components/common/Modal';
import { FormSelect } from '../components/common/FormSelect';
import { toast } from 'react-hot-toast';
import CRMWorkspaceTabs from '../components/common/CRMWorkspaceTabs';

const InfoRow = ({ label, value, icon, isBadge = false, isLink = false, linkUrl = '' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>{icon}</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
      {isBadge && value ? (
        <div style={{ marginTop: '2px' }}><Badge type={getBadgeType(label, value)}>{value}</Badge></div>
      ) : isLink && value ? (
        <a href={linkUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>{value}</a>
      ) : (
        <span style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: '600' }}>{value || 'N/A'}</span>
      )}
    </div>
  </div>
);

const getBadgeType = (label, value) => {
  if (label === 'Status') {
    const types = { pending: 'warning', in_progress: 'primary', completed: 'success', cancelled: 'secondary' };
    return types[value?.toLowerCase().replace(' ', '_')] || 'default';
  }
  if (label === 'Priority') {
    const types = { low: 'secondary', medium: 'warning', high: 'danger' };
    return types[value?.toLowerCase()] || 'default';
  }
  return 'primary';
};

const getDealStageBadgeType = (stage) => {
  const s = stage?.toLowerCase() || '';
  if (s.includes('prospecting') || s.includes('lead')) return 'secondary';
  if (s.includes('qualification')) return 'warning';
  if (s.includes('proposal') || s.includes('negotiation')) return 'primary';
  if (s.includes('won') || s.includes('closed_won')) return 'success';
  if (s.includes('lost') || s.includes('closed_lost')) return 'danger';
  return 'default';
};

const formatRelativeDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  const now = new Date();

  const isToday = date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) {
    return `Today, ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${dateStr}, ${timeStr}`;
  }
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Workspace Tab States
  const [activeTab, setActiveTab] = useState('task_list');
  const [searchQuery, setSearchQuery] = useState('');
  
  // States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [contactDeals, setContactDeals] = useState([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [tasksRemaining, setTasksRemaining] = useState(0);
  const [taskPage, setTaskPage] = useState(1);

  const handleTaskLoadMore = () => {
    const nextPage = taskPage + 1;
    setTaskPage(nextPage);
    if (data?.contact?.id) {
      fetchTasks(data.contact.id, nextPage, true);
    }
  };

  const handleTaskCollapse = () => {
    setTaskPage(1);
    setTasks(prev => prev.slice(0, 5));
    if (data?.contact?.id) {
      fetchTasks(data.contact.id, 1, false);
    }
  };

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;

  const fetchTasks = async (contactId, pageNum = 1, append = false) => {
    if (!contactId) return;
    try {
      const response = await api.get(`/contacts/${contactId}?type=tasks&page=${pageNum}&limit=100`);
      const responseData = response.data.tasks;
      if (responseData) {
        const newItems = responseData.data || [];
        setTasks(prev => {
          const currentItems = append ? prev : [];
          const mergedData = [...currentItems];
          newItems.forEach(item => {
            if (!mergedData.some(existing => existing.id === item.id)) {
              mergedData.push(item);
            }
          });
          return mergedData;
        });
        const totalCount = responseData.pagination?.totalCount || 0;
        setTasksRemaining(totalCount - (append ? (tasks.length + newItems.length) : newItems.length));
      }
    } catch (err) {
      console.error("Fetch tasks error", err);
    }
  };

  const fetchDetail = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`/tasks/${id}`);
      setData(response.data);
      if (response.data.task?.contact_id) {
        fetchTasks(response.data.task.contact_id, 1, false);
      }
    } catch (err) {
      console.error("Fetch task detail error", err);
      if (err.response?.status === 404) {
        navigate('/tasks');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

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
        is: () => isGlobalAdmin,
        then: () => Yup.string().required('Company assignment is required')
      }),
      priority: Yup.string().required('Priority is required')
    }),
    onSubmit: async (values) => {
      try {
        await api.patch(`/tasks/${id}`, values);
        toast.success('Task updated successfully');
        setIsEditModalOpen(false);
        fetchDetail();
      } catch (err) {
        console.error("Update task error", err);
        toast.error('Failed to update task');
      }
    }
  });

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
      const fileInput = document.getElementById('file-upload-detail');
      if (fileInput) fileInput.value = '';
    }
  };

  const handleOpenEditModal = () => {
    if (!data?.task) return;
    const { task } = data;
    
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

    if (isGlobalAdmin) {
      api.get('/tenants/selection').then(res => setTenants(res.data || []));
    }
    
    const tid = task.tenant_id;
    if (tid) {
      api.get(`/contacts?tenant_id=${tid}&limit=1000`).then(res => setContacts(res.data.data || []));
      api.get(`/users?tenant_id=${tid}`).then(res => setStaff(res.data.data || []));
    }

    setIsEditModalOpen(true);
  };

  useEffect(() => {
    if (formik.values.tenant_id && isEditModalOpen) {
      api.get(`/contacts?tenant_id=${formik.values.tenant_id}&limit=1000`).then(res => setContacts(res.data.data || []));
      api.get(`/users?tenant_id=${formik.values.tenant_id}`).then(res => setStaff(res.data.data || []));
    }
  }, [formik.values.tenant_id]);

  useEffect(() => {
    const contactId = formik.values.contact_id;
    if (contactId && isEditModalOpen) {
      setLoadingDeals(true);
      const tenantId = formik.values.tenant_id || loggedInUser?.tenantId;
      api.get(`/deals/selection?contact_id=${contactId}${tenantId ? `&tenant_id=${tenantId}` : ''}`)
        .then(res => setContactDeals(res.data.data || []))
        .catch(console.error)
        .finally(() => setLoadingDeals(false));
    } else {
      setContactDeals([]);
    }
  }, [formik.values.contact_id, formik.values.tenant_id, isEditModalOpen]);

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Task deleted successfully');
      navigate('/tasks');
    } catch (err) {
      console.error("Delete task error", err);
      toast.error('Failed to delete task');
    }
  };

function TaskDetailSkeleton() {
  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px 24px 24px 24px', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .skeleton-shimmer {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s infinite linear;
          border-radius: 4px;
        }

        @keyframes skeleton-shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .contact-detail-grid {
          display: grid;
          grid-template-columns: 3fr 7fr;
          gap: 16px;
          align-items: start;
        }
        
        .crm-left-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .crm-right-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .crm-card {
          background-color: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05);
          overflow: hidden;
        }

        .info-row-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px dashed #f1f5f9;
        }

        .info-row-item:last-child {
          border-bottom: none;
        }

        @media (max-width: 1024px) {
          .contact-detail-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>

      {/* Breadcrumb Header Row Placeholder */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        marginBottom: '16px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="skeleton-shimmer" style={{ width: '60px', height: '16px' }}></div>
          <div className="skeleton-shimmer" style={{ width: '12px', height: '12px' }}></div>
          <div className="skeleton-shimmer" style={{ width: '140px', height: '16px' }}></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="skeleton-shimmer" style={{ width: '90px', height: '34px', borderRadius: '8px' }}></div>
          <div className="skeleton-shimmer" style={{ width: '80px', height: '34px', borderRadius: '8px' }}></div>
        </div>
      </div>

      <div className="contact-detail-grid">
        {/* Left Column (30%) */}
        <aside className="crm-left-col">
          {/* Task Info Card Placeholder */}
          <div className="crm-card" style={{ padding: '16px 14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
              <div className="skeleton-shimmer" style={{ width: '48px', height: '48px', borderRadius: '10px', flexShrink: 0 }}></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton-shimmer" style={{ width: '130px', height: '18px' }}></div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="info-row-item">
                  <div className="skeleton-shimmer" style={{ width: '80px', height: '14px' }}></div>
                  <div className="skeleton-shimmer" style={{ width: '100px', height: '14px' }}></div>
                </div>
              ))}
            </div>
          </div>

          {/* Associated Contact Card Placeholder */}
          <div className="crm-card">
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="skeleton-shimmer" style={{ width: '14px', height: '14px', borderRadius: '50%' }}></div>
              <div className="skeleton-shimmer" style={{ width: '110px', height: '14px' }}></div>
            </div>

            <div style={{ padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div className="skeleton-shimmer" style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }}></div>
                <div style={{ flex: 1 }}>
                  <div className="skeleton-shimmer" style={{ width: '110px', height: '15px', marginBottom: '6px' }}></div>
                  <div className="skeleton-shimmer" style={{ width: '80px', height: '12px' }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="info-row-item">
                    <div className="skeleton-shimmer" style={{ width: '65px', height: '13px' }}></div>
                    <div className="skeleton-shimmer" style={{ width: '105px', height: '13px' }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column (70%) */}
        <main className="crm-right-col">
          <div className="crm-card" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
            {/* Workspace Header Placeholder */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fdfdfd', height: '53px' }}>
              <div className="skeleton-shimmer" style={{ width: '14px', height: '14px', borderRadius: '4px' }}></div>
              <div className="skeleton-shimmer" style={{ width: '100px', height: '15px' }}></div>
            </div>

            {/* Task Title & Badges Placeholder */}
            <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="skeleton-shimmer" style={{ width: '220px', height: '26px' }}></div>
              <div className="skeleton-shimmer" style={{ width: '70px', height: '20px', borderRadius: '12px' }}></div>
              <div className="skeleton-shimmer" style={{ width: '60px', height: '20px', borderRadius: '12px' }}></div>
            </div>

            {/* Workspace Body Placeholder */}
            <div style={{ padding: '0 20px 24px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Description Placeholder */}
              <div className="skeleton-shimmer" style={{ height: '100px', borderRadius: '12px', marginBottom: '28px' }}></div>

              {/* Linked Deal Section Placeholder */}
              <div style={{ marginTop: '8px', flex: 1 }}>
                <div className="skeleton-shimmer" style={{ width: '80px', height: '12px', marginBottom: '12px' }}></div>
                <div style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '24px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '24px'
                }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div className="skeleton-shimmer" style={{ width: '60px', height: '11px' }}></div>
                      <div className="skeleton-shimmer" style={{ width: '90px', height: '14px' }}></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons in Footer */}
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <div className="skeleton-shimmer" style={{ width: '120px', height: '36px', borderRadius: '8px' }}></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

  if (loading) return <TaskDetailSkeleton />;
  if (!data || !data.task) return null;

  const { task, contact } = data;

  const mapTask = (t) => ({
    id: `task-${t.id}`,
    originalId: t.id,
    type: 'task',
    date: t.created_at ? new Date(t.created_at) : new Date(),
    title: 'Task created',
    subTitle: t.title,
    taskDescription: t.description || 'No description provided.',
    description: `Task assigned. Priority: ${t.priority.toUpperCase()}. Due Date: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No limit'}`,
    author: t.assignee_name || 'System',
    priority: t.priority,
    status: t.status,
    due_date: t.due_date,
    badgeColor: '#8b5cf6',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    )
  });

  const tasksToShow = tasks.map(mapTask);
  const filteredTasks = tasksToShow.filter(act => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(query);
      const matchSub = (act.subTitle || '').toLowerCase().includes(query);
      const matchDesc = (act.taskDescription || '').toLowerCase().includes(query);
      if (!matchTitle && !matchSub && !matchDesc) return false;
    }
    return true;
  });

  const getStatusBadgeType = (status) => {
    const types = { pending: 'warning', in_progress: 'primary', completed: 'success', cancelled: 'secondary' };
    return types[status] || 'default';
  };

  const getPriorityBadgeType = (priority) => {
    const types = { low: 'secondary', medium: 'warning', high: 'danger' };
    return types[priority] || 'default';
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '16px 24px 24px 24px', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .contact-detail-grid {
          display: grid;
          grid-template-columns: 3fr 7fr;
          gap: 16px;
          align-items: start;
        }
        
        .crm-left-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .crm-right-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .crm-card {
          background-color: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05);
          overflow: hidden;
          transition: box-shadow 0.15s ease;
        }
        
        .crm-card:hover {
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
        }

        .info-row-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px dashed #f1f5f9;
          font-size: 12.5px;
        }

        .info-row-item:last-child {
          border-bottom: none;
        }

        .timeline-line {
          position: absolute;
          left: 21px;
          top: 28px;
          bottom: 4px;
          width: 2px;
          background-color: #f1f5f9;
        }

        .timeline-node {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          alignItems: center;
          justifyContent: center;
          z-index: 2;
          flex-shrink: 0;
          border: 3px solid #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .timeline-item-container {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding-bottom: 8px;
        }

        .timeline-item-container:last-child {
          padding-bottom: 0;
        }

        @media (max-width: 1024px) {
          .contact-detail-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>

      {/* Breadcrumb Header Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        marginBottom: '16px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        {/* Left: Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
          <Link to="/tasks" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: '500' }}>Tasks</Link>
          <span style={{ color: '#cbd5e1', display: 'flex' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg></span>
          <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>{task.title}</span>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              backgroundColor: '#fef2f2',
              fontSize: '12.5px',
              fontWeight: '600',
              color: '#ef4444',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
          >
            Delete Task
          </button>

          <button
            onClick={handleOpenEditModal}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.15)',
              transition: 'all 0.15s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
          >
            Edit Task
          </button>
        </div>
      </div>

      <div className="contact-detail-grid">
        {/* Left Column (30%): Task Info & Associated Contact */}
        <aside className="crm-left-col">
          
          {/* Task Info Card */}
          <div className="crm-card" style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
            {/* Top Avatar & Title Info Section */}
            <div className="profile-top-info" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #dbeafe',
                  flexShrink: 0,
                  color: '#2563eb',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.1)'
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px', wordBreak: 'break-word', display: 'inline', marginRight: '6px' }}>
                    {task.title}
                  </h2>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: task.status === 'completed' ? '#eff6ff' : '#fef9c3', padding: '2px 8px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '850', color: task.status === 'completed' ? '#2563eb' : '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {task.status?.replace('_', ' ') || 'PENDING'}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>
                  Priority: <span style={{ color: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>{task.priority || 'medium'}</span>
                </div>
              </div>
            </div>

            {/* Key-Value Fields as premium card rows */}
            <div className="profile-structured-rows" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px' }}>
              
              {/* Row: Associated Contact */}
              {contact && (
                <div 
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Associated Contact</span>
                      <span style={{ fontSize: '13px', fontWeight: '750', color: '#2563eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {contact.first_name} {contact.last_name || ''}
                      </span>
                    </div>
                  </div>
                  <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                  </span>
                </div>
              )}

              {/* Row 1: Assigned To */}
              <div 
                onClick={() => task.assigned_to && navigate(`/users/${task.assigned_to}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: task.assigned_to ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (task.assigned_to) {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Assigned To</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: task.assigned_to ? '#2563eb' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.assignee_name || task.assigned_to_user?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
                <span style={{ color: task.assigned_to ? '#2563eb' : '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 2: Company */}
              <div 
                onClick={() => task.tenant_id && navigate(`/tenants/${task.tenant_id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: task.tenant_id ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (task.tenant_id) {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                      <path d="M6 12H4a2 2 0 0 0-2 2v8" />
                      <path d="M18 16h2a2 2 0 0 1 2 2v4" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Company</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: task.tenant_id ? '#2563eb' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.vendor_name || task.tenants?.owner?.name || 'Individual'}
                    </span>
                  </div>
                </div>
                <span style={{ color: task.tenant_id ? '#2563eb' : '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 3: Due Date */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Due Date</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No limit'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 4: Created Date */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Created Date</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {new Date(task.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

            </div>
          </div>

          {/* Associated Contact Card */}
          <div className="crm-card" style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: '750', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Associated Contact
              </h3>
              {contact && (
                <Link
                  to={`/contacts/${contact.id}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                    textDecoration: 'none'
                  }}
                >
                  View profile
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
              )}
            </div>

            <div className="profile-structured-rows" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px' }}>
              {!contact ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                  No contact associated with this task.
                </div>
              ) : (
                <>
                  {/* Row 1: Contact Name */}
                  <div 
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Contact Name</span>
                        <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {contact.first_name} {contact.last_name || ''}
                        </span>
                      </div>
                    </div>
                    <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                    </span>
                  </div>

                  {/* Row 2: Email */}
                  <div 
                    onClick={() => contact.email && (window.location.href = `mailto:${contact.email}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#fff',
                      cursor: contact.email ? 'pointer' : 'default',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (contact.email) {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Email Address</span>
                        <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {contact.email || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                    </span>
                  </div>

                  {/* Row 3: Phone */}
                  <div 
                    onClick={() => contact.phone && (window.location.href = `tel:${contact.phone}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#fff',
                      cursor: contact.phone ? 'pointer' : 'default',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (contact.phone) {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.5 19.5 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Phone Number</span>
                        <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {contact.phone || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                    </span>
                  </div>

                  {/* Row 4: Company Partner */}
                  <div 
                    onClick={() => contact.tenant_id && navigate(`/tenants/${contact.tenant_id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#fff',
                      cursor: contact.tenant_id ? 'pointer' : 'default',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (contact.tenant_id) {
                        e.currentTarget.style.borderColor = '#2563eb';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                          <path d="M6 12H4a2 2 0 0 0-2 2v8" />
                          <path d="M18 16h2a2 2 0 0 1 2 2v4" />
                        </svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Company</span>
                        <span style={{ fontSize: '13px', fontWeight: '750', color: contact.tenant_id ? '#2563eb' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {contact.company_name || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <span style={{ color: contact.tenant_id ? '#2563eb' : '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Right Workspace Column (70%) */}
        <main className="crm-right-col">
          <CRMWorkspaceTabs
            tabs={[
              {
                id: 'task_list',
                label: 'Tasks',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: activeTab === 'task_list' ? '#2563eb' : '#64748b' }}><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
                count: contact ? (tasks.length + tasksRemaining) : 1
              }
            ]}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder="Search tasks..."
            showFilterType={false}
            showFilterTime={false}
          >
            {activeTab === 'task_list' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {filteredTasks.length > 0 && <div className="timeline-line" />}

                  {filteredTasks.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#64748b', textAlign: 'center' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: '#f5f3ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        border: '1px solid #ede9fe',
                        color: '#8b5cf6'
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>No tasks linked</div>
                      <div style={{ fontSize: '12.5px', color: '#94a3b8', maxWidth: '280px' }}>This contact doesn't have any tasks linked.</div>
                    </div>
                  ) : (
                    <>
                      {filteredTasks.map((act) => {
                        return (
                          <div key={act.id} className="timeline-item-container">
                            {/* Timeline Node Badge Icon */}
                            <div
                              className="timeline-node"
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#faf5ff',
                                color: '#8b5cf6',
                                border: '3px solid #fff',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                                flexShrink: 0,
                                zIndex: 2
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                            </div>

                            {/* Timeline snug info card */}
                            <div style={{
                              flex: 1,
                              backgroundColor: '#ffffff',
                              padding: '6px 0px 8px 0px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              gap: '16px'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <Link 
                                      to={`/tasks/${act.originalId}`} 
                                      style={{ 
                                        textDecoration: 'none', 
                                        color: '#0f172a',
                                        transition: 'color 0.15s ease'
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.color = '#2563eb'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.color = '#0f172a'; }}
                                    >
                                      <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '700', color: 'inherit' }}>
                                        {act.subTitle || 'Untitled Task'}
                                      </h4>
                                    </Link>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                                      Priority:
                                    </span>
                                    <span style={{
                                      fontSize: '10px',
                                      fontWeight: '800',
                                      textTransform: 'uppercase',
                                      color: act.priority === 'high' ? '#b91c1c' : act.priority === 'medium' ? '#d97706' : '#475569',
                                      backgroundColor: act.priority === 'high' ? '#fee2e2' : act.priority === 'medium' ? '#fef3c7' : '#f1f5f9',
                                      padding: '1px 6px',
                                      borderRadius: '4px'
                                    }}>
                                      {act.priority || 'medium'}
                                    </span>

                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginLeft: '6px' }}>
                                      Status:
                                    </span>
                                    <span style={{
                                      fontSize: '10px',
                                      fontWeight: '800',
                                      textTransform: 'uppercase',
                                      color: act.status === 'completed' ? '#2563eb' : '#d97706',
                                      backgroundColor: act.status === 'completed' ? '#eff6ff' : '#fef3c7',
                                      padding: '1px 6px',
                                      borderRadius: '4px'
                                    }}>
                                      {act.status?.replace('_', ' ') || 'pending'}
                                    </span>

                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', marginLeft: '6px' }}>
                                      Due: {act.due_date ? new Date(act.due_date).toLocaleDateString() : 'No date'}
                                    </span>
                                  </div>
                                  {act.taskDescription && (
                                    <div style={{
                                      fontSize: '12.5px',
                                      color: '#475569',
                                      marginTop: '6px',
                                      lineHeight: '1.5',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                      fontWeight: '400'
                                    }}>
                                      {act.taskDescription}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                                <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '500' }}>
                                  {formatRelativeDate(act.date)}
                                </span>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    overflow: 'hidden'
                                  }}>
                                    <span style={{ textTransform: 'uppercase' }}>{act.author[0] || 'U'}</span>
                                  </div>
                                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                                    {act.author || 'User'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Horizontal Line Partition intersecting with Vertical Line */}
                            <div style={{
                              position: 'absolute',
                              left: '8px',
                              right: '0',
                              bottom: '0',
                              height: '1px',
                              backgroundColor: '#f1f5f9',
                              zIndex: 1
                            }} />
                          </div>
                        );
                      })}
                      {(tasksRemaining > 0 || tasks.length > 5) && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', marginBottom: '12px' }}>
                          {tasksRemaining > 0 && (
                            <button
                              onClick={handleTaskLoadMore}
                              style={{
                                padding: '4px 6px',
                                backgroundColor: 'transparent',
                                color: 'hsl(219.81deg 84.06% 50.78%)',
                                border: 'none',
                                borderRadius: '0',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'color 0.15s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.color = 'rgb(24 82 215)'; }}
                              onMouseOut={(e) => { e.currentTarget.style.color = 'hsl(219.81deg 84.06% 50.78%)'; }}
                            >
                              Load More ({tasksRemaining})
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </button>
                          )}
                          {tasks.length > 5 && (
                            <button
                              onClick={handleTaskCollapse}
                              style={{
                                padding: '4px 6px',
                                backgroundColor: 'transparent',
                                color: '#dc2626',
                                border: 'none',
                                borderRadius: '0',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'color 0.15s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.color = '#b91c1c'; }}
                              onMouseOut={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                            >
                              Show Less
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                                <path d="m18 15-6-6-6 6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

              </div>
            )}
          </CRMWorkspaceTabs>
        </main>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Task"
        footer={<>
          <Button type="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
          <Button onClick={formik.handleSubmit} disabled={formik.isSubmitting}>
            {formik.isSubmitting ? 'Updating...' : 'Update Task'}
          </Button>
        </>}
      >
        <form onSubmit={formik.handleSubmit}>
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
              onClick={() => document.getElementById('file-upload-detail').click()}
            >
              <input
                id="file-upload-detail"
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
                  <div style={{ fontSize: '40px', marginBottom: '12px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>📄</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)', marginBottom: '4px' }}>
                    Document Uploaded!
                  </div>
                  {uploadedFileName && (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 auto 12px' }}>
                      {uploadedFileName}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px' }}>
                    <a
                      href={getFileUrl(formik.values.document_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '700', textDecoration: 'none', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'rgba(var(--primary-rgb), 0.1)' }}
                    >
                      Preview File
                    </a>
                    <Button
                      size="sm"
                      type="ghost"
                      htmlType="button"
                      onClick={(e) => { e.stopPropagation(); document.getElementById('file-upload-detail').click(); }}
                    >
                      Change File
                    </Button>
                  </div>
                  <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
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

      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete} title="Delete Task" message="Are you sure you want to delete this task? This action cannot be undone." />
    </div>
  );
}
