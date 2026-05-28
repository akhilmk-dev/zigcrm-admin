import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api, { getFileUrl } from '../api/axiosConfig';
import { Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select, ConfirmModal } from '../components/common/Modal';
import { toast } from 'react-hot-toast';

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

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;

  const fetchDetail = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`/tasks/${id}`);
      setData(response.data);
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
      tenant_id: ''
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
      const fileInput = document.getElementById('file-upload');
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
      tenant_id: task.tenant_id || ''
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
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
          <div className="crm-card" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
            
            {/* Workspace Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fdfdfd' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-muted)' }}><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Task Workspace</h3>
            </div>

            {/* Task Title & Details */}
            <div style={{ padding: '24px 20px 24px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.5px' }}>{task.title}</h1>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Badge type={getStatusBadgeType(task.status)}>{task.status?.replace('_', ' ')}</Badge>
                <Badge type={getPriorityBadgeType(task.priority)}>{task.priority?.toUpperCase()}</Badge>
              </div>
            </div>

            {/* Task Description Body */}
            <div style={{ padding: '0 20px 24px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                {task.description ? (
                  <div style={{ padding: '20px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>Description / Notes</h4>
                    <p style={{ fontSize: '14.5px', color: 'var(--text-main)', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>{task.description}</p>
                  </div>
                ) : (
                  <div style={{ padding: '32px 20px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13.5px' }}>
                    No description provided for this task.
                  </div>
                )}
                {/* Linked Deal Section */}
                {data.deal && (
                  <div style={{ marginTop: '28px' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-muted)' }}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                      Linked Deal
                    </h4>
                    
                    <div style={{
                      backgroundColor: 'var(--bg-main)',
                      borderRadius: '16px',
                      border: '1px solid var(--border)',
                      padding: '24px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gridTemplateRows: 'repeat(3, auto)',
                      gap: '24px',
                      transition: 'all 0.2s ease'
                    }}>
                      {/* Row 1, Col 1: Deal Name */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deal Name</span>
                        <Link to={`/deals/${data.deal.id}`} style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--primary)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {data.deal.deal_name || data.deal.name}
                        </Link>
                      </div>

                      {/* Row 1, Col 2: Deal Value */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deal Value</span>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: '#10b981' }}>
                          ₹{Number(data.deal.value || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Row 1, Col 3: Pipeline Stage */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pipeline Stage</span>
                        <Badge type={getDealStageBadgeType(data.deal.stage)} style={{ fontSize: '10px', padding: '2px 8px', fontWeight: '700' }}>
                          {data.deal.stage === 'prospecting' ? 'LEAD' : data.deal.stage?.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>

                      {/* Row 2, Col 1: Deal Status */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deal Status</span>
                        <Badge type={data.deal.status === 'won' ? 'success' : data.deal.status === 'lost' ? 'danger' : 'primary'} style={{ fontSize: '10px', padding: '2px 8px', fontWeight: '700' }}>
                          {data.deal.status?.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Row 2, Col 2: Assignee */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assignee</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {data.deal.assignee_name || data.deal.assigned_to_user?.name ? (
                            <>
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#e2e8f0', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', flexShrink: 0 }}>
                                {(data.deal.assignee_name || data.deal.assigned_to_user?.name)[0]}
                              </div>
                              {data.deal.assignee_name || data.deal.assigned_to_user?.name}
                            </>
                          ) : 'Unassigned'}
                        </span>
                      </div>

                      {/* Row 2, Col 3: Company */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {data.deal.vendor_name || 'Individual'}
                        </span>
                      </div>

                      {/* Row 3, Col 1: Created Date */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created Date</span>
                        <span style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-main)' }}>
                          {new Date(data.deal.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Row 3, Col 2: Associated Contact */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Associated Contact</span>
                        <span style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'No Contact'}
                        </span>
                      </div>

                      {/* Row 3, Col 3: Workplace */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workplace</span>
                        <span style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {contact?.company_name || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attachments Section */}
                {task.document_url && (
                  <div style={{ marginTop: '24px' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                      Attachments
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <a
                        href={getFileUrl(task.document_url)}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          backgroundColor: '#fff',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          color: 'var(--primary)',
                          fontSize: '12.5px',
                          fontWeight: '700',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.15s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.backgroundColor = '#fff';
                        }}
                      >
                        📎 {task.document_url.split('/').pop() || 'View Document'}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons in Footer */}
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="secondary" onClick={() => navigate('/tasks')}>Return to Tasks</Button>
              </div>
            </div>

          </div>
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
            {formik.isSubmitting ? 'Saving...' : 'Save Changes'}
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
                {Array.isArray(tenants) && tenants.map(t => <option key={t.id} value={t.id}>{t.owner_name || t.tenant_name || t.name || 'Unknown Company'}</option>)}
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
                    color: '#059669', 
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

      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete} title="Delete Task" message="Are you sure you want to delete this task? This action cannot be undone." />
    </div>
  );
}
