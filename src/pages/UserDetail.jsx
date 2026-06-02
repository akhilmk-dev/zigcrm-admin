import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api, { getFileUrl } from '../api/axiosConfig';
import { Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select, ConfirmModal } from '../components/common/Modal';
import { toast } from 'react-hot-toast';
import NoteEditor from '../components/NoteEditor';
import CRMWorkspaceTabs from '../components/common/CRMWorkspaceTabs';


const formatRelativeDate = (dateString) => {
  const date = new Date(dateString);
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

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);

  const [newNote, setNewNote] = useState('');
  const [newContactId, setNewContactId] = useState('');
  const [allContacts, setAllContacts] = useState([]); // For add contact dropdown

  const [activeTab, setActiveTab] = useState('activities');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTime, setFilterTime] = useState('all');
  const [visibleActivitiesCount, setVisibleActivitiesCount] = useState(5);
  const [visibleNotesCount, setVisibleNotesCount] = useState(5);
  const [visibleDealsCount, setVisibleDealsCount] = useState(5);
  const [visibleTasksCount, setVisibleTasksCount] = useState(5);
  const [noteTitle, setNoteTitle] = useState('');
  const [selectedDealId, setSelectedDealId] = useState('');
  const [showDealDropdown, setShowDealDropdown] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const [dealPage, setDealPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;

  // Formik for Editing User Info
  const editUserFormik = useFormik({
    initialValues: {
      name: '',
      email: '',
      role_id: '',
      target_tenant_id: '',
      status: 'active',
      profile_image_url: '',
      phone: '',
      department: '',
      employee_id: '',
      location: '',
      reports_to: ''
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Full name is required'),
      email: Yup.string().email('Invalid email address').required('Email is required'),
      role_id: Yup.string().required('Role is required')
    }),
    onSubmit: async (values) => {
      try {
        const payload = {
          name: values.name,
          email: values.email,
          role_id: values.role_id,
          target_tenant_id: values.target_tenant_id || userData?.tenant_id,
          status: values.status,
          profile_image_url: values.profile_image_url,
          phone: values.phone,
          department: values.department,
          employee_id: values.employee_id,
          location: values.location,
          reports_to: values.reports_to
        };
        await api.patch(`/users/${id}`, payload);
        toast.success('User updated successfully');
        setIsEditModalOpen(false);
        fetchUserDetails();
      } catch (err) {
        console.error('Update User Error:', err);
        toast.error('Failed to update user');
      }
    }
  });

  // Formik for Reset Password
  const resetPasswordFormik = useFormik({
    initialValues: {
      password: '',
      re_password: ''
    },
    validationSchema: Yup.object({
      password: Yup.string().required('Password is required').min(6, 'Password must be at least 6 characters'),
      re_password: Yup.string()
        .required('Please confirm password')
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
    }),
    onSubmit: async (values) => {
      try {
        await api.patch(`/users/${id}`, { password: values.password });
        toast.success('Password reset successfully');
        setIsResetPasswordModalOpen(false);
        resetPasswordFormik.resetForm();
      } catch (err) {
        console.error('Reset Password Error:', err);
        toast.error('Failed to reset password');
      }
    }
  });

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch user primary details
      const userRes = await api.get(`/users/${id}`);
      const user = userRes.data;
      setUserData(user);

      // Populate Edit Formik
      editUserFormik.setValues({
        name: user.name || '',
        email: user.email || '',
        role_id: user.role_id || '',
        target_tenant_id: user.tenant_id || '',
        status: user.status || 'active',
        profile_image_url: user.profile_image_url || '',
        phone: user.phone || '+91 98765 43210',
        department: user.department || 'Sales',
        employee_id: user.employee_id || `EMP-${1000 + parseInt(id.slice(-3) || '24', 16) % 900}`,
        location: user.location || 'New York, USA',
        reports_to: user.reports_to || 'Sarah Miller'
      });

      // 2. Fetch associated contacts
      const contactsRes = await api.get(`/contacts?assigned_to=${id}&limit=100`);
      setContacts(contactsRes.data.data || []);

      // 3. Fetch associated deals
      const dealsRes = await api.get(`/deals?assigned_to=${id}&limit=100`);
      setDeals(dealsRes.data.data || []);

      // 4. Fetch associated tasks
      const tasksRes = await api.get(`/tasks?assigned_to=${id}&limit=100`);
      setTasks(tasksRes.data.data || []);

      // 5. Populate some mock notes since backend might not support user-specific notes model
      setNotes([]);

      // 6. Fetch all contacts for link dropdown
      const allContactsRes = await api.get(`/contacts?limit=200`);
      setAllContacts(allContactsRes.data.data || []);

      // 7. Load roles and tenants if admin
      if (isGlobalAdmin) {
        const tenantsRes = await api.get('/tenants/selection');
        setTenants(tenantsRes.data || []);
        const rolesRes = await api.get('/roles?limit=100');
        setRoles(rolesRes.data.data || []);
      }
    } catch (err) {
      console.error('Fetch User Details Error:', err);
      toast.error('Failed to load user details');
      navigate('/users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const handleDeactivate = async () => {
    try {
      const newStatus = userData?.status === 'active' ? 'suspended' : 'active';
      await api.patch(`/users/${id}/status`, { status: newStatus });
      toast.success(`User successfully ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      setIsDeactivateModalOpen(false);
      fetchUserDetails();
    } catch (err) {
      console.error('Deactivate User Error:', err);
      toast.error('Failed to change status');
    }
  };

  const handleDeleteUser = async () => {
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted successfully');
      setIsDeleteModalOpen(false);
      navigate('/users');
    } catch (err) {
      console.error('Delete User Error:', err);
      toast.error('Failed to delete user');
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }
    const note = {
      id: `note-${Date.now()}`,
      content: newNote,
      author: loggedInUser?.name || 'Admin User',
      date: new Date().toISOString()
    };
    setNotes([note, ...notes]);
    setNewNote('');
    setIsAddNoteModalOpen(false);
    toast.success('Note added successfully');
  };

  const handleDeleteNote = (noteId) => {
    if (window.confirm("Delete this note?")) {
      setNotes(notes.filter(n => n.originalId !== noteId && n.id !== noteId));
    }
  };

  const totalDealValue = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);

  // Helper mappings
  const mapNote = (n) => ({
    id: `note-${n.id}`,
    originalId: n.id,
    type: 'note',
    date: new Date(n.date || n.created_at || Date.now()),
    title: 'Note added',
    subTitle: n.title,
    description: n.content,
    author: n.author || n.author_name || 'System',
    attachments: n.attachments,
    badgeColor: '#f97316', // Orange
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    deal: n.deal
  });

  const mapDeal = (d) => ({
    id: `deal-${d.id}`,
    originalId: d.id,
    type: 'deal',
    date: new Date(d.created_at || Date.now()),
    title: 'Deal associated',
    subTitle: d.deal_name,
    description: `New CRM Deal associated. Stage: <strong style="color: var(--primary); font-weight: 700; text-transform: uppercase; background-color: #eff6ff; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${d.stage?.replace('_', ' ')}</strong>. Value: <strong style="color: #2563eb; font-weight: 800; background-color: #eff6ff; padding: 2px 6px; border-radius: 4px; font-size: 12px;">₹${Number(d.value || 0).toLocaleString('en-IN')}</strong>`,
    author: d.assignee_name || 'System',
    badgeColor: '#1e3a8a', // Dark blue
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="6" rx="2" /><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><path d="M22 13a18.15 18.15 0 0 1-20 0" /><path d="M12 12h.01" />
      </svg>
    )
  });

  const mapTask = (t) => ({
    id: `task-${t.id}`,
    originalId: t.id,
    type: 'task',
    date: new Date(t.created_at || Date.now()),
    title: 'Task created',
    subTitle: t.title,
    taskDescription: t.description || 'No description provided.',
    description: `Task assigned. Priority: ${(t.priority||'').toUpperCase()}. Due Date: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No limit'}`,
    author: t.assignee_name || 'System',
    priority: t.priority,
    status: t.status,
    due_date: t.due_date,
    badgeColor: '#8b5cf6', // Purple
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    )
  });

  const activitiesToShow = [
    ...notes.map(mapNote),
    ...deals.map(mapDeal),
    ...tasks.map(mapTask)
  ].sort((a, b) => b.date - a.date);

  const notesToShow = notes.map(mapNote);
  const dealsToShow = deals.map(mapDeal);
  const tasksToShow = tasks.map(mapTask);

  const filteredActivities = activitiesToShow.filter(act => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(query);
      const matchSub = (act.subTitle || '').toLowerCase().includes(query);
      const matchDesc = (act.description || '').toLowerCase().includes(query);
      if (!matchTitle && !matchSub && !matchDesc) return false;
    }
    if (filterType !== 'all') {
      if (act.type !== filterType) return false;
    }
    if (filterTime !== 'all') {
      const now = new Date();
      const diffTime = Math.abs(now - act.date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (filterTime === 'today' && diffDays > 1) return false;
      if (filterTime === 'week' && diffDays > 7) return false;
      if (filterTime === 'month' && diffDays > 30) return false;
    }
    return true;
  });

  const filteredNotes = notesToShow.filter(act => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(query);
      const matchSub = (act.subTitle || '').toLowerCase().includes(query);
      const matchDesc = (act.description || '').toLowerCase().includes(query);
      if (!matchTitle && !matchSub && !matchDesc) return false;
    }
    return true;
  });

  const filteredDeals = dealsToShow.filter(act => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(query);
      const matchSub = (act.subTitle || '').toLowerCase().includes(query);
      const matchDesc = (act.description || '').toLowerCase().includes(query);
      if (!matchTitle && !matchSub && !matchDesc) return false;
    }
    return true;
  });

  const filteredTasks = tasksToShow.filter(act => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(query);
      const matchSub = (act.subTitle || '').toLowerCase().includes(query);
      const matchDesc = (act.description || '').toLowerCase().includes(query);
      if (!matchTitle && !matchSub && !matchDesc) return false;
    }
    return true;
  });

  const handleLinkContact = async () => {
    if (!newContactId) {
      toast.error('Please select a contact');
      return;
    }
    try {
      await api.patch(`/contacts/${newContactId}`, { assigned_to: id });
      toast.success('Contact associated successfully');
      setIsAddContactModalOpen(false);
      setNewContactId('');
      fetchUserDetails();
    } catch (err) {
      console.error('Link Contact Error:', err);
      toast.error('Failed to associate contact');
    }
  };

  if (loading) {
    return <UserDetailSkeleton />;
  }

  // Fallback / initials for reports_to
  const getInitials = (name) => {
    return (name || 'U')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div style={{ padding: '0 8px 30px' }}>
      <style>{`
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
          left: 20px;
          top: 28px;
          bottom: 12px;
          width: 2px;
          background-color: #e2e8f0;
        }

        .timeline-item-container {
          position: relative;
          display: flex;
          gap: 14px;
          padding-bottom: 16px;
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
        
        .crm-card {
          background-color: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05);
          overflow: hidden;
          transition: box-shadow 0.15s ease;
        }

        .user-detail-grid {
          display: grid;
          grid-template-columns: minmax(310px, 340px) 1fr;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .user-detail-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
      `}</style>
      {/* Breadcrumbs & Header Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600' }}>
          <Link to="/users" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = 'var(--primary)'} onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}>Users</Link>
          <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
          <span style={{ color: 'var(--text-main)' }}>{userData?.name}</span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button 
            type="secondary" 
            onClick={() => setIsEditModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', padding: '8px 14px', borderRadius: '8px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit User
          </Button>

          <Button 
            type="secondary" 
            onClick={() => setIsResetPasswordModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', padding: '8px 14px', borderRadius: '8px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Reset Password
          </Button>

          <Button 
            type="secondary" 
            onClick={() => setIsDeactivateModalOpen(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '13px', 
              fontWeight: '700', 
              padding: '8px 14px', 
              borderRadius: '8px',
              color: userData?.status === 'active' ? '#dc2626' : '#2563eb',
              borderColor: userData?.status === 'active' ? '#fecaca' : '#bfdbfe',
              backgroundColor: userData?.status === 'active' ? '#fef2f2' : '#eff6ff'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/></svg>
            {userData?.status === 'active' ? 'Deactivate User' : 'Activate User'}
          </Button>

          <button 
            onClick={() => setIsDeleteModalOpen(true)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="user-detail-grid">
        {/* ================= LEFT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* USER DETAILS CARD */}
          <div className="crm-card" style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
            {/* Top Avatar & Name Info Section */}
            <div className="profile-top-info" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {userData?.profile_image_url ? (
                  <img src={getFileUrl(userData.profile_image_url)} alt="Profile" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2e8f0' }} />
                ) : (
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #dbeafe',
                    flexShrink: 0
                  }}>
                    {/* Cute SVG Owl Avatar! */}
                    <svg width="42" height="42" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="32" cy="36" r="20" fill="#1e3a8a" />
                      <path d="M16 28C16 20 22 16 32 16C42 16 48 20 48 28C48 30 45 32 32 32C19 32 16 30 16 28Z" fill="#2563eb" />
                      <circle cx="23" cy="28" r="8" fill="#ffffff" />
                      <circle cx="41" cy="28" r="8" fill="#ffffff" />
                      <circle cx="23" cy="28" r="4" fill="#0f172a" />
                      <circle cx="41" cy="28" r="4" fill="#0f172a" />
                      <circle cx="24.5" cy="26.5" r="1.5" fill="#ffffff" />
                      <circle cx="42.5" cy="26.5" r="1.5" fill="#ffffff" />
                      <polygon points="32,32 29,37 35,37" fill="#f59e0b" />
                      <path d="M18 20L26 23L20 16Z" fill="#1e3a8a" />
                      <path d="M46 20L38 23L44 16Z" fill="#1e3a8a" />
                      <path d="M26 44C29 42 35 42 38 44" stroke="#bfdbfe" strokeWidth="2" strokeLinecap="round" />
                      <path d="M28 48C30 46 34 46 36 48" stroke="#bfdbfe" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
                    {userData?.name}
                  </h2>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: userData?.status === 'suspended' ? '#fef2f2' : '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '850', color: userData?.status === 'suspended' ? '#dc2626' : '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {userData?.status || 'ACTIVE'}
                    </span>
                    <span style={{ color: userData?.status === 'suspended' ? '#fca5a5' : '#3b82f6', fontSize: '12px', display: 'flex', alignItems: 'center' }}>★</span>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>
                  {userData?.roles?.role_name || 'Staff'} at {userData?.department || 'Sales'}
                </div>
              </div>
            </div>

            {/* Social Quick Contact Toolbar Pills (Email, Call) */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', width: '100%' }}>
              {userData?.email && (
                <a href={`mailto:${userData.email}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  outline: 'none'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#64748b' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  Email
                </a>
              )}

              {userData?.phone && (
                <a href={`tel:${userData.phone}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  outline: 'none'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#64748b' }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  Call
                </a>
              )}
            </div>

            {/* Structured Rows List redesigned to match profile cards exactly */}
            <div className="profile-structured-rows" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px', marginTop: '24px' }}>
              
              {/* Row 1: Email */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: userData?.email ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (userData?.email) {
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
                onClick={() => userData?.email && (window.location.href = `mailto:${userData.email}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Email</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userData?.email || 'N/A'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 2: Phone */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: userData?.phone ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (userData?.phone) {
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
                onClick={() => userData?.phone && (window.location.href = `tel:${userData.phone}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Phone</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userData?.phone || 'N/A'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 3: Role */}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Role</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userData?.roles?.role_name || 'Staff'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 4: Department */}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="14" x="2" y="7" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Department</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userData?.department || 'Sales'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 5: Reports To */}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Reports To</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userData?.reports_to || 'Sarah Miller'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 6: Employee ID */}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Employee ID</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userData?.employee_id || `EMP-${1000 + parseInt(id.slice(-3) || '24', 16) % 900}`}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 7: Location */}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Location</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userData?.location || 'New York, USA'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 8: Status */}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Status</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userData?.status ? userData.status.toUpperCase() : 'ACTIVE'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 9: Last Login */}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 14 14" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Last Login</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {userData?.last_login ? new Date(userData.last_login).toLocaleString() : '28 Apr 2026, 10:30 AM'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

            </div>
          </div>

          {/* ASSOCIATED CONTACTS CARD */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-muted)' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: 'var(--text-main)' }}>Associated Contacts ({contacts.length})</h3>
              </div>
              <button 
                onClick={() => setIsAddContactModalOpen(true)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--primary)',
                  color: 'var(--primary)',
                  backgroundColor: 'transparent',
                  fontWeight: '750',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 109, 47, 0.05)'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                + Add Contact
              </button>
            </div>

            {/* Contacts list */}
            {contacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                No associated contacts.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {contacts.slice(0, 3).map((contact, idx) => (
                  <div key={contact.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: idx < 2 ? '14px' : '0', borderBottom: idx < 2 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        fontSize: '11px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(0, 109, 47, 0.1)'
                      }}>
                        {getInitials(contact.first_name + ' ' + (contact.last_name || ''))}
                      </div>
                      <div>
                        <Link to={`/contacts/${contact.id}`} style={{ fontWeight: '800', fontSize: '13.5px', color: 'var(--text-main)', textDecoration: 'none' }} onMouseOver={(e) => e.target.style.color = 'var(--primary)'} onMouseOut={(e) => e.target.style.color = 'var(--text-main)'}>
                          {contact.first_name} {contact.last_name}
                        </Link>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>{contact.company_name || 'Individual'}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} style={{ display: 'flex', color: 'var(--text-muted)' }} title={contact.email}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} style={{ display: 'flex', color: 'var(--text-muted)' }} title={contact.phone}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </a>
                      )}
                      {idx === 0 && (
                        <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px' }}>
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '14px', textAlign: 'center' }}>
              <Link to="/contacts" style={{ fontSize: '13px', fontWeight: '750', color: 'var(--primary)', textDecoration: 'none' }} onMouseOver={(e) => e.target.style.color = '#1d4ed8'} onMouseOut={(e) => e.target.style.color = 'var(--primary)'}>
                View All Contacts
              </Link>
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="crm-right-col">
          
          {/* Note Editor Card removed as requested */}

          <CRMWorkspaceTabs
            tabs={[
              {
                id: 'activities',
                label: 'All Activities',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: activeTab === 'activities' ? '#2563eb' : '#64748b' }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              },
              {
                id: 'notes',
                label: 'Notes',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: activeTab === 'notes' ? '#2563eb' : '#64748b' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
                count: notes.length
              },
              {
                id: 'deals',
                label: 'Deals',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: activeTab === 'deals' ? '#2563eb' : '#64748b' }}><rect width="20" height="14" x="2" y="6" rx="2" /><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><path d="M22 13a18.15 18.15 0 0 1-20 0" /><path d="M12 12h.01" /></svg>,
                count: deals.length
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
            searchPlaceholder={activeTab === 'activities' ? "Search activities..." : activeTab === 'notes' ? "Search notes..." : activeTab === 'deals' ? "Search deals..." : "Search tasks..."}
            filterType={filterType}
            setFilterType={setFilterType}
            filterTime={filterTime}
            setFilterTime={setFilterTime}
            showFilterType={activeTab === 'activities'}
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
            {/* Tab 1: activities timeline */}
            {activeTab === 'activities' && (
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {filteredActivities.length > 0 && <div className="timeline-line" />}

                {filteredActivities.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#64748b', textAlign: 'center' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      borderRadius: '50%', 
                      backgroundColor: '#f8fafc', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      marginBottom: '16px',
                      border: '1px solid #e2e8f0',
                      color: '#94a3b8'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>No activities found</div>
                    <div style={{ fontSize: '12.5px', color: '#94a3b8', maxWidth: '280px' }}>Try adjusting your search query or selecting a different filter.</div>
                  </div>
                ) : (
                  filteredActivities.slice(0, visibleActivitiesCount).map((act) => (
                    <div key={act.id} className="timeline-item-container">

                      {/* Timeline Node Badge Icon (Snug size) */}
                      <div
                        className="timeline-node"
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: act.badgeColor === '#f97316' ? '#fffbeb' : act.badgeColor === '#1e3a8a' ? '#eff6ff' : act.badgeColor === '#8b5cf6' ? '#faf5ff' : '#f1f5f9',
                          color: act.badgeColor,
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

                          {act.type === 'note' && act.attachments && act.attachments.length > 0 && (
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

                          {act.type === 'note' && act.deal && (
                            <Link
                              to={`/deals/${act.deal.id}`}
                              style={{
                                display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 10px',
                                  backgroundColor: '#eff6ff',
                                  borderRadius: '6px',
                                  textDecoration: 'none',
                                  color: '#1e40af',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  border: '1px solid #bfdbfe',
                                  marginTop: '6px',
                                  width: 'fit-content',
                                  transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#dbeafe';
                                e.currentTarget.style.borderColor = '#93c5fd';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#eff6ff';
                                e.currentTarget.style.borderColor = '#bfdbfe';
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#2563eb' }}>
                                <rect width="20" height="14" x="2" y="6" rx="2" />
                                <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                              </svg>
                              <span>Linked Deal: <strong>{act.deal.deal_name}</strong> (₹{Number(act.deal.value).toLocaleString('en-IN')})</span>
                            </Link>
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

                          {act.type === 'note' && (
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
                          )}
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
                  ))
                )}

                {filteredActivities.length > visibleActivitiesCount && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', marginBottom: '12px' }}>
                    <button
                      onClick={() => setVisibleActivitiesCount(prev => prev + 5)}
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
                      Load More ({filteredActivities.length - visibleActivitiesCount})
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    {visibleActivitiesCount > 5 && (
                      <button
                        onClick={() => setVisibleActivitiesCount(5)}
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
              </div>
            )}

            {/* Tab 2: Notes Detailed View */}
            {activeTab === 'notes' && (
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {filteredNotes.length > 0 && <div className="timeline-line" />}

                {filteredNotes.length === 0 ? (
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
                    <div style={{ fontSize: '12.5px', color: '#94a3b8', maxWidth: '280px' }}>Try adding a note above or adjusting your search criteria.</div>
                  </div>
                ) : (
                  filteredNotes.slice(0, visibleNotesCount).map((act) => (
                    <div key={act.id} className="timeline-item-container">
                      {/* Timeline Node Badge Icon (Snug size) */}
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

                          {act.deal && (
                            <Link
                              to={`/deals/${act.deal.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                backgroundColor: '#eff6ff',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                color: '#1e40af',
                                fontSize: '11px',
                                fontWeight: '700',
                                border: '1px solid #bfdbfe',
                                marginTop: '6px',
                                width: 'fit-content',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#dbeafe';
                                e.currentTarget.style.borderColor = '#93c5fd';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#eff6ff';
                                e.currentTarget.style.borderColor = '#bfdbfe';
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#2563eb' }}>
                                <rect width="20" height="14" x="2" y="6" rx="2" />
                                <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                              </svg>
                              <span>Linked Deal: <strong>{act.deal.deal_name}</strong> (₹{Number(act.deal.value).toLocaleString('en-IN')})</span>
                            </Link>
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
                              <span style={{ textTransform: 'uppercase' }}>{act.author[0] || 'U'}</span>
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
                  ))
                )}

                {filteredNotes.length > visibleNotesCount && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', marginBottom: '12px' }}>
                    <button
                      onClick={() => setVisibleNotesCount(prev => prev + 5)}
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
                      Load More ({filteredNotes.length - visibleNotesCount})
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    {visibleNotesCount > 5 && (
                      <button
                        onClick={() => setVisibleNotesCount(5)}
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
              </div>
            )}

            {/* Tab 3: Deals Detailed View */}
            {activeTab === 'deals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {filteredDeals.length > 0 && <div className="timeline-line" />}

                  {filteredDeals.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#64748b', textAlign: 'center' }}>
                      <div style={{ 
                        width: '56px', 
                        height: '56px', 
                        borderRadius: '50%', 
                        backgroundColor: '#f0fdf4', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        marginBottom: '16px',
                        border: '1px solid #dcfce7',
                        color: '#16a34a'
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="6" rx="2" /><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>No deals associated</div>
                      <div style={{ fontSize: '12.5px', color: '#94a3b8', maxWidth: '280px' }}>This user doesn't have any deals assigned.</div>
                    </div>
                  ) : (
                    <>
                      {filteredDeals.slice(0, visibleDealsCount).map((act) => (
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
                              backgroundColor: '#eff6ff',
                              color: '#1e3a8a',
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
                      ))}
                      {filteredDeals.length > visibleDealsCount && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', marginBottom: '12px' }}>
                          <button
                            onClick={() => setVisibleDealsCount(prev => prev + 5)}
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
                            Load More ({filteredDeals.length - visibleDealsCount})
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </button>
                          {visibleDealsCount > 5 && (
                            <button
                              onClick={() => setVisibleDealsCount(5)}
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

            {/* Tab 4: Tasks Detailed View */}
            {activeTab === 'tasks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                      <div style={{ fontSize: '12.5px', color: '#94a3b8', maxWidth: '280px' }}>This user doesn't have any tasks linked.</div>
                    </div>
                  ) : (
                    <>
                      {filteredTasks.slice(0, visibleTasksCount).map((act) => (
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
                                  {act.subTitle || 'Untitled Task'}
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
                      ))}
                      {filteredTasks.length > visibleTasksCount && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', marginBottom: '12px' }}>
                          <button
                            onClick={() => setVisibleTasksCount(prev => prev + 5)}
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
                            Load More ({filteredTasks.length - visibleTasksCount})
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </button>
                          {visibleTasksCount > 5 && (
                            <button
                              onClick={() => setVisibleTasksCount(5)}
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
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* EDIT USER DETAILS MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User Details"
        footer={<>
          <Button type="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
          <Button onClick={editUserFormik.handleSubmit} disabled={editUserFormik.isSubmitting}>
            {editUserFormik.isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </>}
      >
        <form onSubmit={editUserFormik.handleSubmit}>
          <Input 
            label="Full Name"
            name="name"
            value={editUserFormik.values.name}
            onChange={editUserFormik.handleChange}
            onBlur={editUserFormik.handleBlur}
            error={editUserFormik.errors.name}
            touched={editUserFormik.touched.name}
            required
          />

          <Input 
            label="Email Address"
            name="email"
            type="email"
            value={editUserFormik.values.email}
            onChange={editUserFormik.handleChange}
            onBlur={editUserFormik.handleBlur}
            error={editUserFormik.errors.email}
            touched={editUserFormik.touched.email}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input 
              label="Phone Number"
              name="phone"
              value={editUserFormik.values.phone}
              onChange={editUserFormik.handleChange}
              onBlur={editUserFormik.handleBlur}
            />
            <Input 
              label="Department"
              name="department"
              value={editUserFormik.values.department}
              onChange={editUserFormik.handleChange}
              onBlur={editUserFormik.handleBlur}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input 
              label="Employee ID"
              name="employee_id"
              value={editUserFormik.values.employee_id}
              onChange={editUserFormik.handleChange}
              onBlur={editUserFormik.handleBlur}
            />
            <Input 
              label="Location"
              name="location"
              value={editUserFormik.values.location}
              onChange={editUserFormik.handleChange}
              onBlur={editUserFormik.handleBlur}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input 
              label="Reports To"
              name="reports_to"
              value={editUserFormik.values.reports_to}
              onChange={editUserFormik.handleChange}
              onBlur={editUserFormik.handleBlur}
            />
            {isGlobalAdmin && (
              <Select
                label="Role"
                name="role_id"
                value={editUserFormik.values.role_id}
                onChange={editUserFormik.handleChange}
                onBlur={editUserFormik.handleBlur}
                required
              >
                <option value="">Select a role</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
              </Select>
            )}
          </div>
        </form>
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        title="Reset User Password"
        footer={<>
          <Button type="secondary" onClick={() => setIsResetPasswordModalOpen(false)}>Cancel</Button>
          <Button onClick={resetPasswordFormik.handleSubmit} disabled={resetPasswordFormik.isSubmitting}>
            {resetPasswordFormik.isSubmitting ? 'Resetting...' : 'Confirm Reset'}
          </Button>
        </>}
      >
        <form onSubmit={resetPasswordFormik.handleSubmit}>
          <Input 
            label="New Password"
            name="password"
            type="password"
            placeholder="Min 6 characters"
            value={resetPasswordFormik.values.password}
            onChange={resetPasswordFormik.handleChange}
            onBlur={resetPasswordFormik.handleBlur}
            error={resetPasswordFormik.errors.password}
            touched={resetPasswordFormik.touched.password}
            required
          />
          <Input 
            label="Confirm Password"
            name="re_password"
            type="password"
            placeholder="Confirm your new password"
            value={resetPasswordFormik.values.re_password}
            onChange={resetPasswordFormik.handleChange}
            onBlur={resetPasswordFormik.handleBlur}
            error={resetPasswordFormik.errors.re_password}
            touched={resetPasswordFormik.touched.re_password}
            required
          />
        </form>
      </Modal>

      {/* DEACTIVATE CONFIRM MODAL */}
      <ConfirmModal 
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        onConfirm={handleDeactivate}
        title={userData?.status === 'active' ? 'Deactivate User Account' : 'Activate User Account'}
        message={`Are you sure you want to ${userData?.status === 'active' ? 'deactivate' : 'activate'} this user? ${userData?.status === 'active' ? 'This user will no longer be able to log in or access the portal.' : 'This will restore their portal login privileges.'}`}
        confirmText="Confirm"
        confirmType={userData?.status === 'active' ? 'danger' : 'success'}
      />

      {/* DELETE CONFIRM MODAL */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        title="Delete User Permanently"
        message={`Are you sure you want to delete ${userData?.name}? This action cannot be undone and will delete all user assignments, timeline records, and system logins permanently.`}
        confirmText="Yes, Delete"
        confirmType="danger"
      />

      {/* ADD NOTE MODAL */}
      <Modal
        isOpen={isAddNoteModalOpen}
        onClose={() => setIsAddNoteModalOpen(false)}
        title="Add Private Note"
        footer={<>
          <Button type="secondary" onClick={() => setIsAddNoteModalOpen(false)}>Cancel</Button>
          <Button onClick={handleAddNote}>Add Note</Button>
        </>}
      >
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Note Content</label>
          <textarea 
            placeholder="Write user notes, reminders or review info..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              minHeight: '100px',
              outline: 'none',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </Modal>

      {/* ADD ASSOCIATED CONTACT MODAL */}
      <Modal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        title="Associate Contact"
        footer={<>
          <Button type="secondary" onClick={() => setIsAddContactModalOpen(false)}>Cancel</Button>
          <Button onClick={handleLinkContact}>Associate</Button>
        </>}
      >
        <Select
          label="Select Contact to Assign"
          value={newContactId}
          onChange={(e) => setNewContactId(e.target.value)}
          required
        >
          <option value="">— Select a Contact —</option>
          {allContacts.filter(c => c.assigned_to !== id).map(c => (
            <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.company_name || 'Individual'})</option>
          ))}
        </Select>
      </Modal>
    </div>
  );
}

function DetailRow({ label, value, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>
        <span style={{ display: 'flex', color: 'var(--text-muted)', opacity: 0.6 }}>{icon}</span>
        <span>{label}</span>
      </div>
      <div style={{ color: 'var(--text-main)', fontWeight: '750', textAlign: 'right' }}>
        {value || '—'}
      </div>
    </div>
  );
}


function PaginationControls({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '16px', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
      <button 
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        style={{
          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
          backgroundColor: currentPage === 1 ? 'var(--bg-main)' : '#fff',
          color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          fontSize: '12px', fontWeight: '600', transition: 'all 0.15s'
        }}
      >
        Previous
      </button>
      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
        Page <span style={{ color: 'var(--text-main)' }}>{currentPage}</span> of {totalPages}
      </span>
      <button 
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        style={{
          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
          backgroundColor: currentPage === totalPages ? 'var(--bg-main)' : '#fff',
          color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-main)',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          fontSize: '12px', fontWeight: '600', transition: 'all 0.15s'
        }}
      >
        Next
      </button>
    </div>
  );
}

function UserDetailSkeleton() {
  return (
    <div style={{ padding: '0 8px 30px' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
      `}</style>
      <div className="skeleton" style={{ width: '200px', height: '20px', marginBottom: '24px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '30% 70%', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="skeleton" style={{ height: '380px' }} />
          <div className="skeleton" style={{ height: '200px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="skeleton" style={{ height: '300px' }} />
          <div className="skeleton" style={{ height: '300px' }} />
        </div>
      </div>
    </div>
  );
}
