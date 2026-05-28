import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api, { getFileUrl } from '../api/axiosConfig';
import { Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select, ConfirmModal } from '../components/common/Modal';
import { SearchableSelect } from '../components/common/SearchableSelect';
import NoteItem from '../components/NoteItem';
import NoteEditor from '../components/NoteEditor';
import { toast } from 'react-hot-toast';
import CRMWorkspaceTabs from '../components/common/CRMWorkspaceTabs';

const InfoRow = ({ label, value, icon, isBadge = false }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>{icon}</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
      {isBadge && value ? (
        <div style={{ marginTop: '2px' }}><Badge type="primary">{value}</Badge></div>
      ) : (
        <span style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: '600' }}>{value || 'N/A'}</span>
      )}
    </div>
  </div>
);

const HorizontalInfo = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px', flex: '1 1 auto' }}>
    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>{value || 'N/A'}</div>
  </div>
);

const TabItem = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '16px 24px',
      border: 'none',
      background: 'none',
      borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
      color: active ? 'var(--primary)' : 'var(--text-muted)',
      fontWeight: active ? '700' : '600',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s',
      outline: 'none',
      marginBottom: '-1px'
    }}
  >
    {children}
  </button>
);

function PaginationControls({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '24px', padding: '16px 0', borderTop: '1px solid var(--border)' }}>
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        style={{
          padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
          backgroundColor: currentPage === 1 ? 'var(--bg-main)' : '#fff',
          color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          fontSize: '13px', fontWeight: '600', transition: 'all 0.2s'
        }}
      >
        Previous
      </button>
      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
        Page <span style={{ color: 'var(--text-main)' }}>{currentPage}</span> of {totalPages}
      </span>
      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        style={{
          padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
          backgroundColor: currentPage === totalPages ? 'var(--bg-main)' : '#fff',
          color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-main)',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          fontSize: '13px', fontWeight: '600', transition: 'all 0.2s'
        }}
      >
        Next
      </button>
    </div>
  );
}

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tab states
  const [activeTab, setActiveTab] = useState('notes');
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTime, setFilterTime] = useState('all');
  const [visibleActivitiesCount, setVisibleActivitiesCount] = useState(5);
  const [visibleNotesCount, setVisibleNotesCount] = useState(5);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(true);
  const [taskPage, setTaskPage] = useState(1);
  const [viewingTask, setViewingTask] = useState(null);

  // Edit / Delete Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [staff, setStaff] = useState([]);

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;
  const ITEMS_PER_PAGE = 10;

  const fetchDetail = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`/deals/${id}`);
      setData(response.data);
    } catch (err) {
      console.error("Fetch deal detail error", err);
      if (err.response?.status === 404) {
        navigate('/deals');
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
      deal_name: '',
      value: '',
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
      tenant_id: Yup.string().required('Company assignment is required')
    }),
    onSubmit: async (values) => {
      try {
        await api.patch(`/deals/${id}`, values);
        toast.success('Deal updated successfully');
        setIsEditModalOpen(false);
        fetchDetail();
      } catch (err) {
        console.error("Update deal error", err);
        toast.error('Failed to update deal');
      }
    }
  });

  const handleOpenEditModal = () => {
    if (!data?.deal) return;
    const { deal } = data;
    formik.setValues({
      deal_name: deal.deal_name,
      value: deal.value,
      stage: deal.stage,
      contact_id: deal.contact_id || '',
      status: deal.status,
      tenant_id: deal.tenant_id,
      assigned_to: deal.assigned_to || ''
    });

    if (isGlobalAdmin) {
      api.get('/tenants/selection').then(res => setTenants(res.data || []));
    }

    const tid = deal.tenant_id;
    if (tid) {
      api.get(`/contacts?tenant_id=${tid}&limit=100`).then(res => setContacts(res.data.data || []));
      api.get(`/users?tenant_id=${tid}`).then(res => setStaff(res.data.data || []));
    }

    setIsEditModalOpen(true);
  };

  useEffect(() => {
    if (formik.values.tenant_id && isEditModalOpen) {
      api.get(`/contacts?tenant_id=${formik.values.tenant_id}&limit=100`).then(res => setContacts(res.data.data || []));
      api.get(`/users?tenant_id=${formik.values.tenant_id}`).then(res => setStaff(res.data.data || []));
    }
  }, [formik.values.tenant_id]);

  // Synchronize status with pipeline stage
  useEffect(() => {
    const stage = formik.values.stage;
    if (stage === 'won' || stage === 'lost') {
      formik.setFieldValue('status', stage);
    } else if (stage === 'lead' || stage === 'qualification' || stage === 'proposal' || stage === 'negotiation' || stage === 'prospecting') {
      formik.setFieldValue('status', 'open');
    }
  }, [formik.values.stage]);

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/deals/${id}`);
      toast.success('Deal deleted successfully');
      navigate('/deals');
    } catch (err) {
      console.error("Delete deal error", err);
      toast.error('Failed to delete deal');
    }
  };

function DealDetailSkeleton() {
  return (
    <div className="contact-detail-workspace" style={{ padding: '0 0 24px 0', minHeight: '100vh' }}>
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
          grid-template-columns: minmax(290px, 1fr) 3fr;
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

        .timeline-line {
          position: absolute;
          left: 20px;
          top: 28px;
          bottom: 12px;
          width: 2px;
          background-color: #f1f5f9;
        }

        .timeline-item-container {
          position: relative;
          display: flex;
          gap: 14px;
          padding-bottom: 24px;
        }

        .timeline-node {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          flex-shrink: 0;
          border: 3px solid #fff;
          box-shadow: 0 2px 4px rgb(0 0 0 / 0.05);
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
        marginBottom: '12px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="skeleton-shimmer" style={{ width: '60px', height: '16px' }}></div>
          <div className="skeleton-shimmer" style={{ width: '12px', height: '12px' }}></div>
          <div className="skeleton-shimmer" style={{ width: '120px', height: '16px' }}></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="skeleton-shimmer" style={{ width: '90px', height: '34px', borderRadius: '8px' }}></div>
          <div className="skeleton-shimmer" style={{ width: '80px', height: '34px', borderRadius: '8px' }}></div>
        </div>
      </div>

      <div className="contact-detail-grid">
        {/* Left Sidebar Placeholder */}
        <aside className="crm-left-col">
          {/* Deal Profile Card Placeholder */}
          <div className="crm-card" style={{ padding: '16px 14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
              <div className="skeleton-shimmer" style={{ width: '48px', height: '48px', borderRadius: '10px', flexShrink: 0 }}></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton-shimmer" style={{ width: '120px', height: '18px', marginBottom: '8px' }}></div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div className="skeleton-shimmer" style={{ width: '60px', height: '16px', borderRadius: '4px' }}></div>
                  <div className="skeleton-shimmer" style={{ width: '40px', height: '16px', borderRadius: '4px' }}></div>
                </div>
              </div>
            </div>

            {/* Value Banner Placeholder */}
            <div className="skeleton-shimmer" style={{ height: '38px', borderRadius: '8px', marginBottom: '14px' }}></div>

            {/* Dense Key-Value Field Rows Placeholders */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="info-row-item">
                  <div className="skeleton-shimmer" style={{ width: '70px', height: '14px' }}></div>
                  <div className="skeleton-shimmer" style={{ width: '90px', height: '14px' }}></div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              <div className="skeleton-shimmer" style={{ width: '60px', height: '12px', marginBottom: '6px' }}></div>
              <div className="skeleton-shimmer" style={{ width: '100%', height: '36px' }}></div>
            </div>
          </div>

          {/* Primary Contact Card Placeholder */}
          <div className="crm-card">
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="skeleton-shimmer" style={{ width: '14px', height: '14px', borderRadius: '50%' }}></div>
              <div className="skeleton-shimmer" style={{ width: '100px', height: '14px' }}></div>
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
                    <div className="skeleton-shimmer" style={{ width: '50px', height: '13px' }}></div>
                    <div className="skeleton-shimmer" style={{ width: '100px', height: '13px' }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Workspace Placeholder */}
        <main className="crm-right-col">
          <div className="crm-card" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
            {/* Headers row placeholder */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fdfdfd', height: '44px', alignItems: 'center', padding: '0 16px', gap: '16px' }}>
              <div className="skeleton-shimmer" style={{ width: '100px', height: '18px' }}></div>
              <div className="skeleton-shimmer" style={{ width: '90px', height: '18px' }}></div>
            </div>

            {/* Filters placeholder */}
            <div style={{ padding: '12px 14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div className="skeleton-shimmer" style={{ flex: 1, height: '36px', borderRadius: '8px' }}></div>
              <div className="skeleton-shimmer" style={{ width: '80px', height: '36px', borderRadius: '8px' }}></div>
              <div className="skeleton-shimmer" style={{ width: '90px', height: '36px', borderRadius: '8px' }}></div>
              <div className="skeleton-shimmer" style={{ width: '32px', height: '32px', borderRadius: '8px' }}></div>
            </div>

            {/* Timeline area placeholder */}
            <div style={{ padding: '16px 14px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div className="timeline-line" />
              {[1, 2, 3].map(i => (
                <div key={i} className="timeline-item-container">
                  <div className="timeline-node skeleton-shimmer"></div>
                  <div style={{
                    flex: 1,
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <div className="skeleton-shimmer" style={{ width: '70px', height: '12px' }}></div>
                        <div className="skeleton-shimmer" style={{ width: '120px', height: '14px' }}></div>
                      </div>
                      <div className="skeleton-shimmer" style={{ width: '100%', height: '32px' }}></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <div className="skeleton-shimmer" style={{ width: '80px', height: '12px' }}></div>
                      <div className="skeleton-shimmer" style={{ width: '22px', height: '22px', borderRadius: '50%' }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

  if (loading) return <DealDetailSkeleton />;
  if (!data) return null;

  const deal = data.deal || {};
  const contact = data.contact;
  const tasks = Array.isArray(data.tasks) ? data.tasks : (data.tasks?.data || []);
  const notes = Array.isArray(data.notes) ? data.notes : (data.notes?.data || []);

  const getStageIndex = (stage) => {
    const s = stage?.toLowerCase() || '';
    if (s === 'lead' || s === 'prospecting') return 0;
    if (s === 'qualification') return 1;
    if (s === 'proposal') return 2;
    if (s === 'negotiation') return 3;
    if (s === 'won' || s === 'lost') return 4;
    return 0;
  };
  const activeIndex = getStageIndex(deal.stage);

  const getStageBadgeType = (stage) => {
    const s = stage?.toLowerCase() || '';
    if (s.includes('prospec') || s.includes('lead')) return 'primary';
    if (s.includes('qualif')) return 'warning';
    if (s.includes('propos')) return 'warning';
    if (s.includes('negot')) return 'warning';
    if (s.includes('won') || s.includes('close')) return 'success';
    if (s.includes('lost')) return 'danger';
    return 'default';
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const formatRelativeDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${dateStr}, ${timeStr}`;
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Delete this note?')) {
      try {
        await api.delete(`/notes/${noteId}`);
        fetchDetail(true);
      } catch (err) {
        console.error('Delete note error', err);
      }
    }
  };

  // Build unified activities array (notes + tasks + deal creation)
  const rawActivities = [
    // Deal creation as an activity
    {
      id: `deal-${deal.id}`,
      originalId: deal.id,
      type: 'deal',
      date: new Date(deal.created_at),
      title: 'Deal Created',
      subTitle: deal.deal_name,
      description: deal.description || '',
      author: deal.assignee_name || 'System',
      attachments: [],
      badgeColor: '#1e3a8a',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="6" rx="2" /><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><path d="M22 13a18.15 18.15 0 0 1-20 0" /><path d="M12 12h.01" />
        </svg>
      )
    },
    // Notes
    ...notes.map(n => ({
      id: `note-${n.id}`,
      originalId: n.id,
      type: 'note',
      date: new Date(n.created_at),
      title: 'Note Added',
      subTitle: n.title,
      description: n.content,
      author: n.author_name || 'System',
      attachments: n.attachments || [],
      badgeColor: '#f97316',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      )
    })),
    // Tasks
    ...tasks.map(t => ({
      id: `task-${t.id}`,
      originalId: t.id,
      type: 'task',
      date: new Date(t.created_at),
      title: 'Task Added',
      subTitle: t.title,
      description: `Task assigned. Priority: ${t.priority?.toUpperCase()}. Due Date: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No limit'}`,
      author: t.assignee_name || 'System',
      attachments: [],
      badgeColor: '#8b5cf6',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      )
    }))
  ].sort((a,b) => new Date(b.date) - new Date(a.date));

  const filteredActivities = rawActivities.filter(act => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (act.title || '').toLowerCase().includes(q);
      const matchSub = (act.subTitle || '').toLowerCase().includes(q);
      const matchDesc = (act.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchSub && !matchDesc) return false;
    }
    if (filterType !== 'all' && act.type !== filterType) return false;
    if (filterTime !== 'all') {
      const now = new Date();
      const diffTime = Math.abs(now - new Date(act.date));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (filterTime === 'today' && diffDays > 1) return false;
      if (filterTime === 'week' && diffDays > 7) return false;
      if (filterTime === 'month' && diffDays > 30) return false;
    }
    return true;
  });

  return (
    <div className="contact-detail-workspace" style={{ padding: '0 0 24px 0', minHeight: '100vh' }}>
      <style>{`
        .contact-detail-grid {
          display: grid;
          grid-template-columns: minmax(320px, 350px) 1fr;
          gap: 20px;
          align-items: start;
        }
        
        .crm-left-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        .crm-right-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
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

        .crm-tab-btn {
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          border: none;
          background: transparent;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .crm-tab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .timeline-line {
          position: absolute;
          left: 21px;
          top: 28px;
          bottom: 4px;
          width: 2px;
          background-color: #f1f5f9;
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

        .timeline-node {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          flex-shrink: 0;
          border: 3px solid #fff;
          box-shadow: 0 2px 4px rgb(0 0 0 / 0.05);
        }

        @media (max-width: 1024px) {
          .contact-detail-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }

        @media (max-width: 768px) {
          div.crm-card {
            padding: 16px !important;
          }

          .profile-top-info {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 12px !important;
          }

          .profile-top-info h2 {
            text-align: center !important;
            justify-content: center !important;
          }

          .profile-top-info div {
            justify-content: center !important;
          }
        }
      `}</style>

      {/* Breadcrumb Header Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        marginBottom: '12px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
          <Link to="/deals" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: '500' }}>Deals</Link>
          <span style={{ color: '#cbd5e1', display: 'flex' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg></span>
          <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>{deal.deal_name}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); }}
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
            Delete Deal
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
            Edit Deal
          </button>
        </div>
      </div>

      <div className="contact-detail-grid">

        {/* Left Sidebar (25%) */}
        <aside className="crm-left-col">

          {/* Snug Deal Profile Card */}
          <div className="crm-card" style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
            {/* Top Avatar & Name Info Section */}
            <div className="profile-top-info" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
                  border: '1.5px solid #dbeafe',
                  flexShrink: 0
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="6" rx="2" /><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><path d="M22 13a18.15 18.15 0 0 1-20 0" /><path d="M12 12h.01" /></svg>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'block', wordBreak: 'break-word' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px', display: 'inline', marginRight: '8px' }}>
                    {deal.deal_name}
                  </h2>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '850',
                    textTransform: 'uppercase',
                    backgroundColor: deal.status === 'won' ? '#eff6ff' : deal.status === 'lost' ? '#fee2e2' : '#fef9c3',
                    color: deal.status === 'won' ? '#2563eb' : deal.status === 'lost' ? '#b91c1c' : '#d97706',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    letterSpacing: '0.5px',
                    display: 'inline-block',
                    verticalAlign: 'middle',
                    whiteSpace: 'nowrap'
                  }}>
                    {deal.status || 'OPEN'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginTop: '4px', wordBreak: 'break-word' }}>
                  Stage: <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{deal.stage === 'prospecting' ? 'lead' : (deal.stage || 'N/A')}</span>
                </div>
                {contact && (
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginTop: '6px', wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, color: '#64748b' }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    <Link to={`/contacts/${contact.id}`} style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>{contact.first_name} {contact.last_name || ''}</Link>
                  </div>
                )}
              </div>
            </div>

            {/* Structured Rows List Redesigned as Premium Card Rows */}
            <div className="profile-structured-rows" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px', marginTop: '24px' }}>
              
              {/* Row 1: Deal Value */}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Deal Value</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatCurrency(deal.value)}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 2: Assigned To */}
              <div 
                onClick={() => deal.assigned_to && navigate(`/users/${deal.assigned_to}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: deal.assigned_to ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (deal.assigned_to) {
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Assigned To</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: deal.assigned_to ? '#2563eb' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {deal.assignee_name || 'Unassigned'}
                    </span>
                  </div>
                </div>
                <span style={{ color: deal.assigned_to ? '#2563eb' : '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 3: Client / Company */}
              <div 
                onClick={() => deal.tenant_id && navigate(`/tenants/${deal.tenant_id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: deal.tenant_id ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (deal.tenant_id) {
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
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Company Partner</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: deal.tenant_id ? '#2563eb' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {deal.vendor_name || 'N/A'}
                    </span>
                  </div>
                </div>
                <span style={{ color: deal.tenant_id ? '#2563eb' : '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 4: Expected Close */}
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
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Expected Close</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'TBD'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 5: Probability */}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 6l-9.5 9.5-5-5L1 18"></path><path d="M17 6h6v6"></path></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Probability</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {deal.probability ? `${deal.probability}%` : 'N/A'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 6: Created Date */}
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
                      {new Date(deal.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

            </div>

            {deal.description && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Description</span>
                <span style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5', display: 'block', wordBreak: 'break-word' }}>{deal.description}</span>
              </div>
            )}
          </div>

          {/* Primary Contact Card */}
          <div className="crm-card" style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: '750', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Primary Contact
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

            {/* Structured Rows List redesigned as premium card rows */}
            <div className="profile-structured-rows" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px' }}>
              {!contact ? (
                <div style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                  No primary contact assigned.
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

        {/* Right Workspace (75%) */}
        <main className="crm-right-col">

          {/* Pipeline Progress Bar */}
          <div className="crm-card" style={{
            padding: '18px 24px',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            overflowX: 'auto'
          }}>
            {[
              { label: 'Lead', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
              { label: 'Qualified', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg> },
              { label: 'Proposal', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> },
              { label: 'Negotiation', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
              { label: deal.stage === 'lost' ? 'Lost' : deal.stage === 'won' ? 'Won' : 'Won / Lost', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" /><path d="M12 2a6 6 0 0 1 6 6v3.5c0 2.5-2 4.5-4.5 4.5h-3C8 16 6 14 6 11.5V8a6 6 0 0 1 6-6z" /></svg> }
            ].map((step, idx) => {
              const isActive = idx === activeIndex;
              const isCompleted = idx < activeIndex;
              const isLast = idx === 4;

              // Styles
              const circleBg = isActive 
                ? '#2563eb' 
                : isCompleted 
                  ? '#eff6ff' 
                  : '#ffffff';
              const circleColor = isActive 
                ? '#ffffff' 
                : isCompleted 
                  ? '#2563eb' 
                  : '#94a3b8';
              const circleBorder = isActive 
                ? 'none' 
                : isCompleted 
                  ? '1.5px solid #dbeafe' 
                  : '1.5px solid #cbd5e1';
              const textColor = isActive 
                ? '#2563eb' 
                : isCompleted 
                  ? '#0f172a' 
                  : '#64748b';
              const textWeight = isActive || isCompleted ? '700' : '500';

              return (
                <React.Fragment key={idx}>
                  {/* Step Item */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    {/* Circle Badge */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: circleBg,
                      color: circleColor,
                      border: circleBorder,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
                      transition: 'all 0.2s ease'
                    }}>
                      {step.icon}
                    </div>

                    {/* Step Label */}
                    <span style={{
                      fontSize: '13px',
                      fontWeight: textWeight,
                      color: textColor,
                      transition: 'all 0.2s ease'
                    }}>
                      {step.label}
                    </span>
                  </div>

                  {/* Connecting Line */}
                  {!isLast && (
                    <div style={{
                      flex: 1,
                      height: '2px',
                      backgroundColor: isCompleted || isActive ? '#2563eb' : '#e2e8f0',
                      minWidth: '24px',
                      transition: 'all 0.2s ease'
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Add Note removed for Deal detail (notes managed via Timeline & Notes tab) */}

          {/* Tab lists card */}
          {/* Wrapper to group tabs and card snugly without vertical gaps */}
          <CRMWorkspaceTabs
            tabs={[
              {
                id: 'notes',
                label: 'Notes',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: activeTab === 'notes' ? '#2563eb' : '#64748b' }}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
                count: notes.length
              },
              {
                id: 'tasks',
                label: 'Tasks',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: activeTab === 'tasks' ? '#2563eb' : '#64748b' }}><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
                count: tasks.length
              }
            ]}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder={
              activeTab === 'notes' ? "Search notes..." : "Search tasks..."
            }
            filterType={filterType}
            setSearchQuery={setSearchQuery}
            filterTime={filterTime}
            setFilterTime={setFilterTime}
            showFilterType={false}
            showFilterTime={true}
            filterTypeOptions={[
              { value: 'all', label: 'All Types' },
              { value: 'note', label: 'Notes Only' },
              { value: 'task', label: 'Tasks Only' },
              { value: 'deal', label: 'Deals Only' }
            ]}
            filterTimeOptions={[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'Past Week' },
              { value: 'month', label: 'Past Month' }
            ]}
          >


            {/* Tab 2: Notes timeline view */}
            {activeTab === 'notes' && (
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {notes.length > 0 && <div className="timeline-line" />}

                {notes.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#64748b', textAlign: 'center' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      borderRadius: '50%', 
                      backgroundColor: '#fff7ed', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      marginBottom: '16px',
                      border: '1px solid #ffedd5',
                      color: '#ea580c'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>No notes found</div>
                    <div style={{ fontSize: '12.5px', color: '#94a3b8', maxWidth: '280px' }}>No notes associated with this deal yet.</div>
                  </div>
                ) : (
                  notes.map(n => ({
                    id: `note-${n.id}`,
                    originalId: n.id,
                    type: 'note',
                    date: new Date(n.created_at),
                    title: 'Note Added',
                    subTitle: n.title,
                    description: n.content,
                    author: n.author_name || 'System',
                    attachments: n.attachments || [],
                    badgeColor: '#f97316',
                    icon: (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                    )
                  }))
                  .filter(act => {
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase();
                      const matchTitle = (act.title || '').toLowerCase().includes(q);
                      const matchSub = (act.subTitle || '').toLowerCase().includes(q);
                      const matchDesc = (act.description || '').toLowerCase().includes(q);
                      if (!matchTitle && !matchSub && !matchDesc) return false;
                    }
                    return true;
                  })
                  .slice(0, visibleNotesCount)
                  .map((act) => (
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
                          backgroundColor: '#fffbeb',
                          color: '#f97316',
                          border: '3px solid #fff',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                          flexShrink: 0,
                          zIndex: 2
                        }}
                      >
                        {act.icon}
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
                        {/* LEFT COLUMN: Title & Description */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                              {act.title}
                            </h4>
                            {act.subTitle && (
                              <div style={{ fontSize: '12px', fontWeight: '600', color: '#2563eb', marginBottom: '1px' }}>
                                {act.subTitle}
                              </div>
                            )}
                            <div
                              style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5', wordBreak: 'break-word', fontWeight: '400' }}
                              dangerouslySetInnerHTML={{ __html: act.description }}
                            />
                          </div>

                          {act.attachments && act.attachments.length > 0 && (
                            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {act.attachments.map((file, idx) => (
                                <a
                                  key={idx}
                                  href={getFileUrl(file.url)}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    backgroundColor: '#fff',
                                    borderRadius: '4px',
                                    textDecoration: 'none',
                                    color: 'var(--primary)',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    border: '1px solid #e2e8f0'
                                  }}
                                >
                                  📎 {file.name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* RIGHT COLUMN: Date & Avatar/Name */}
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
                              <span style={{ textTransform: 'uppercase' }}>{(act.author || 'U')[0]}</span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                              {act.author || 'User'}
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteNote(act.originalId)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#dc2626',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              opacity: 0.7,
                              marginTop: '4px',
                              padding: 0
                            }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                            onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                          >
                            Delete note
                          </button>
                        </div>
                      </div>

                      {/* Horizontal Line Partition */}
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
                  ))
                )}

                {visibleNotesCount < notes.length && (
                  <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <button
                      onClick={() => setVisibleNotesCount(prev => prev + 5)}
                      style={{
                        padding: '4px 6px',
                        backgroundColor: 'transparent',
                        color: 'hsl(219.81deg 84.06% 50.78%)',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'color 0.15s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.color = 'rgb(24 82 215)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.color = 'hsl(219.81deg 84.06% 50.78%)'; }}
                    >
                      Load More ({notes.length - visibleNotesCount})
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Tasks Timeline View */}
            {activeTab === 'tasks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {tasks.length > 0 && <div className="timeline-line" />}

                  {tasks.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#64748b', textAlign: 'center' }}>
                      <div style={{ 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '50%', 
                        backgroundColor: '#faf5ff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        marginBottom: '16px',
                        border: '1px solid #faf5ff',
                        color: '#8b5cf6'
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>No tasks found</div>
                      <div style={{ fontSize: '12.5px', color: '#94a3b8', maxWidth: '280px' }}>No tasks associated with this deal yet.</div>
                    </div>
                  ) : (
                    <>
                      {tasks
                      .filter(act => {
                        if (searchQuery) {
                          const q = searchQuery.toLowerCase();
                          const matchTitle = (act.title || '').toLowerCase().includes(q);
                          const matchDesc = (act.description || '').toLowerCase().includes(q);
                          if (!matchTitle && !matchDesc) return false;
                        }
                        return true;
                      })
                      .slice((taskPage - 1) * ITEMS_PER_PAGE, taskPage * ITEMS_PER_PAGE).map((act) => (
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
                                <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                                  {act.title || 'Untitled Task'}
                                </h4>
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
                                {act.description && (
                                  <div style={{
                                    fontSize: '12.5px',
                                    color: '#475569',
                                    marginTop: '6px',
                                    lineHeight: '1.5',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontWeight: '400'
                                  }}>
                                    {act.description}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                              <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '500' }}>
                                {formatRelativeDate(act.created_at || act.date)}
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
                                  {act.assignee_name?.[0] || 'U'}
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>{act.assignee_name || 'Unassigned'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Horizontal Line Partition */}
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
                      ))}
                      <PaginationControls
                        currentPage={taskPage}
                        totalItems={tasks.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setTaskPage}
                      />
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
        title="Edit Deal"
        footer={<>
          <Button type="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
          <Button onClick={formik.handleSubmit} disabled={formik.isSubmitting}>
            {formik.isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </>}
      >
        <form onSubmit={formik.handleSubmit}>
          {isGlobalAdmin && (
            <SearchableSelect
              label="Assign to Company"
              name="tenant_id"
              value={formik.values.tenant_id}
              options={Array.isArray(tenants) ? tenants.map(t => ({ value: t.id, label: t.owner_name || t.tenant_name || t.name || 'Unknown Company' })) : []}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.tenant_id}
              touched={formik.touched.tenant_id}
              required
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
            label="Value (₹)"
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

          <SearchableSelect
            label="Contact Partner"
            name="contact_id"
            value={formik.values.contact_id}
            options={contacts.map(c => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Select a contact"
          />

          <SearchableSelect
            label="Assigned To"
            name="assigned_to"
            value={formik.values.assigned_to}
            options={staff.map(s => ({ value: s.id, label: s.name }))}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Unassigned"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
              label="Pipeline Stage"
              name="stage"
              value={formik.values.stage}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            >
              <option value="lead">Lead</option>
              <option value="qualification">Qualification</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
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

      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete} title="Delete Deal" message="Are you sure you want to delete this deal? This action cannot be undone." />

      {/* Task Detail Modal */}
      <Modal
        isOpen={!!viewingTask}
        onClose={() => setViewingTask(null)}
        title="Task Details"
        footer={<Button onClick={() => setViewingTask(null)}>Close</Button>}
      >
        {viewingTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px' }}>{viewingTask.title}</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>{viewingTask.description || 'No description provided.'}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <InfoRow label="Status" value={<Badge type={viewingTask.status === 'completed' ? 'success' : 'warning'}>{viewingTask.status}</Badge>} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>} />
              <InfoRow label="Priority" value={<Badge type={viewingTask.priority === 'high' ? 'danger' : viewingTask.priority === 'medium' ? 'warning' : 'secondary'}>{viewingTask.priority?.toUpperCase()}</Badge>} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>} />
              <InfoRow label="Vendor" value={viewingTask.vendor_name || 'N/A'} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>} />
              <InfoRow label="Assignee" value={viewingTask.assignee_name || 'Unassigned'} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
              <InfoRow label="Contact Partner" value={contact ? `${contact.first_name} ${contact.last_name}` : 'N/A'} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
              <InfoRow label="Due Date" value={viewingTask.due_date ? new Date(viewingTask.due_date).toLocaleDateString() : 'No date'} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>} />
              <InfoRow label="Created At" value={new Date(viewingTask.created_at).toLocaleDateString()} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>} />
            </div>

            {viewingTask.document_url && (
              <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Attached Document</div>
                <a
                  href={getFileUrl(viewingTask.document_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'var(--primary)', fontWeight: '600' }}
                >
                  <span style={{ display: 'flex' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg></span> View Document
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
