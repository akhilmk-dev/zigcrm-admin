import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api, { getFileUrl } from '../api/axiosConfig';
import { Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select, ConfirmModal } from '../components/common/Modal';
import RichTextEditor from '../components/RichTextEditor';
import NoteEditor from '../components/NoteEditor';
import NoteItem from '../components/NoteItem';
import { toast } from 'react-hot-toast';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { PhoneInput } from '../components/common/PhoneInput';

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [isNoteEditorExpanded, setIsNoteEditorExpanded] = useState(true);
  
  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);
  const [viewingDeal, setViewingDeal] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const [dealPage, setDealPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Add Task/Deal States
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
  const [staff, setStaff] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;

  const formik = useFormik({
    initialValues: {
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
      profession: ''
    },
    validationSchema: Yup.object({
      first_name: Yup.string().required('First name is required'),
      tenant_id: Yup.string().required('Company assignment is required'),
      email: Yup.string().email('Invalid email address').required('Email is required'),
      phone: Yup.string()
        .required('Phone number is required')
        .test('is-valid-phone', 'Invalid phone number for the selected country', (value) => {
          if (!value) return false;
          const phoneNumber = parsePhoneNumberFromString(value);
          return phoneNumber ? phoneNumber.isValid() : false;
        }),
      company_name: Yup.string().required('Workplace name is required'),
      profession: Yup.string().required('Profession is required')
    }),
    onSubmit: async (values) => {
      try {
        await api.patch(`/contacts/${id}`, values);
        toast.success('Contact updated successfully');
        setIsEditModalOpen(false);
        fetchDetail();
      } catch (err) {
        console.error("Update contact error", err);
      }
    }
  });

  const addTaskFormik = useFormik({
    initialValues: {
      title: '',
      description: '',
      due_date: '',
      status: 'pending',
      priority: 'medium',
      assigned_to: '',
      contact_id: id,
      document_url: '',
      tenant_id: ''
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Task title is required'),
      priority: Yup.string().required('Priority is required')
    }),
    onSubmit: async (values) => {
      try {
        await api.post('/tasks', values);
        toast.success('Task created successfully');
        setIsAddTaskModalOpen(false);
        addTaskFormik.resetForm();
        setUploadedFileName('');
        fetchDetail(true);
      } catch (err) {
        console.error("Create Task Error:", err);
      }
    }
  });

  const addDealFormik = useFormik({
    initialValues: {
      deal_name: '',
      value: '',
      stage: 'prospecting',
      contact_id: id,
      status: 'open',
      tenant_id: '',
      assigned_to: ''
    },
    validationSchema: Yup.object({
      deal_name: Yup.string().required('Deal name is required'),
      value: Yup.number()
        .typeError('Value must be a number')
        .positive('Value must be greater than 0')
        .required('Deal value is required')
    }),
    onSubmit: async (values) => {
      try {
        await api.post('/deals', values);
        toast.success('Deal created successfully');
        setIsAddDealModalOpen(false);
        addDealFormik.resetForm();
        fetchDetail(true);
      } catch (err) {
        console.error("Create Deal Error:", err);
      }
    }
  });

  const fetchDetail = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`/contacts/${id}`);
      setData(response.data);
    } catch (err) {
      console.error("Fetch detail error", err);
      if (err.response?.status === 404) {
        navigate('/contacts');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  useEffect(() => {
    if (data?.contact?.tenant_id) {
      addTaskFormik.setFieldValue('tenant_id', data.contact.tenant_id);
      addDealFormik.setFieldValue('tenant_id', data.contact.tenant_id);
      
      // Fetch staff for this tenant
      api.get(`/users?tenant_id=${data.contact.tenant_id}`)
        .then(res => setStaff(res.data.data || []))
        .catch(err => console.error("Fetch staff error", err));
    }
  }, [data?.contact?.tenant_id]);

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/contacts/${id}`);
      toast.success('Contact deleted successfully');
      navigate('/contacts');
    } catch (err) {
      console.error("Delete contact error", err);
      toast.error('Failed to delete contact');
    }
  };

  const handleOpenEditModal = () => {
    if (!data?.contact) return;
    const { contact } = data;
    formik.setValues({
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
      profession: contact.profession || ''
    });
    
    if (isGlobalAdmin) {
      api.get('/tenants').then(res => setTenants(res.data.data || []));
    }
    
    setIsEditModalOpen(true);
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm("Delete this note?")) {
      await api.delete(`/notes/${noteId}`);
      fetchDetail(true);
    }
  };

  const handleOpenAddTask = () => {
    addTaskFormik.resetForm({
      values: {
        ...addTaskFormik.initialValues,
        tenant_id: data?.contact?.tenant_id || ''
      }
    });
    setUploadedFileName('');
    setIsAddTaskModalOpen(true);
  };

  const handleOpenAddDeal = () => {
    addDealFormik.resetForm({
      values: {
        ...addDealFormik.initialValues,
        tenant_id: data?.contact?.tenant_id || ''
      }
    });
    setIsAddDealModalOpen(true);
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
      addTaskFormik.setFieldValue('document_url', res.data.url);
      setUploadedFileName(res.data.fileName || file.name);
      toast.success('Document uploaded successfully');
    } catch (err) {
      console.error("Upload Error:", err);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <ContactDetailSkeleton />;
  if (!data) return null;
  const contact = data.contact || {};
  const tasks = data.tasks || [];
  const deals = data.deals || [];
  const notes = data.notes || [];

  return (
    <div className="contact-detail-container">
      <style>{`
        .contact-detail-layout {
          display: grid;
          grid-template-columns: minmax(320px, 1fr) 2.5fr;
          gap: 32px;
          align-items: start;
        }

        .contact-tabs-header {
          display: flex;
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .contact-tabs-header::-webkit-scrollbar {
          display: none;
        }

        @media (max-width: 1024px) {
          .contact-detail-layout {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          
          .contact-detail-sidebar {
            order: 1;
          }
          
          .contact-detail-main {
            order: 2;
          }

          .contact-tabs-header {
            padding: 0 16px;
          }

          .contact-main-content {
            padding: 20px !important;
          }
        }

        @media (max-width: 640px) {
          .contact-detail-container {
            padding: 16px;
          }
          
          .contact-profile-card {
             padding: 24px !important;
          }

          .contact-info-card {
            padding: 16px !important;
          }
        }
      `}</style>

      {/* Breadcrumbs & Navigation */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
        <Link to="/contacts" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Contacts</Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{contact.first_name} {contact.last_name}</span>
      </div>

      {/* Main Content Layout */}
      <div className="contact-detail-layout">
        
        {/* Left Col: Detailed Info */}
        <aside className="contact-detail-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Profile Card */}
          <div className="contact-profile-card" style={{ 
            backgroundColor: '#fff', 
            borderRadius: '16px', 
            padding: '32px', 
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary-light)', 
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              fontWeight: 'bold',
              marginBottom: '20px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
            }}>
              {contact.first_name[0]}{contact.last_name?.[0] || ''}
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>
              {contact.first_name} {contact.last_name}
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Badge type={contact.status === 'active' ? 'success' : contact.status === 'lost' ? 'danger' : 'warning'}>
                  {contact.status.toUpperCase()}
                </Badge>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>{contact.company_name || 'Individual'}</span>
              </div>
              {contact.tenants?.owner?.name && (
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Owner: {contact.tenants.owner.name}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
              <Button type="secondary" size="sm" onClick={handleOpenEditModal} style={{ width: '100%', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                Edit
              </Button>
              <Button type="danger" size="sm" onClick={() => setIsDeleteModalOpen(true)} style={{ width: '100%', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Delete
              </Button>
            </div>
          </div>

          <div className="contact-info-card" style={{ 
            backgroundColor: '#fff', 
            borderRadius: '16px', 
            padding: '24px', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>Contact Information</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <InfoRow label="Email" value={contact.email} icon="✉️" />
              <InfoRow label="Phone" value={contact.phone} icon="📞" />
              <InfoRow label="Profession" value={contact.profession} icon="🎓" />
              <InfoRow label="Job Title" value={contact.job_title} icon="👔" />
              <InfoRow label="Source" value={contact.source} icon="📍" />
              <InfoRow label="Owner Company" value={contact.tenants?.owner?.name} icon="🏢" isBadge />
              <InfoRow label="Tags" value={contact.tags} icon="🏷️" />
              <InfoRow label="Joined" value={new Date(contact.created_at).toLocaleDateString()} icon="📅" />
            </div>
          </div>
        </aside>

        {/* Right Col: Activity/Tabs */}
        <main className="contact-detail-main" style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
          {/* Tabs Header */}
          <div className="contact-tabs-header">
            <TabItem active={activeTab === 'notes'} onClick={() => setActiveTab('notes')}>Timeline & Notes ({notes.length})</TabItem>
            <TabItem active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')}>Tasks ({tasks.length})</TabItem>
            <TabItem active={activeTab === 'deals'} onClick={() => setActiveTab('deals')}>Deals ({deals.length})</TabItem>
          </div>

          <div className="contact-main-content" style={{ padding: '32px', flex: 1 }}>
            {activeTab === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '16px', 
                  overflow: 'hidden',
                  backgroundColor: '#fff',
                  boxShadow: '0 12px 30px -10px rgba(0,0,0,0.08), 0 4px 10px -5px rgba(0,0,0,0.04)'
                }}>
                  <div 
                    onClick={() => setIsNoteEditorExpanded(!isNoteEditorExpanded)}
                    style={{ 
                      padding: '16px 24px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      backgroundColor: 'var(--bg-main)',
                      borderBottom: isNoteEditorExpanded ? '1px solid var(--border)' : 'none',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                  >
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <span style={{ 
                         fontSize: '12px', 
                         transform: isNoteEditorExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                         transition: 'transform 0.2s',
                         display: 'inline-block',
                         color: 'var(--text-muted)'
                       }}>
                         ▼
                       </span>
                       <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <span style={{ fontSize: '18px' }}>📝</span> Create New Note
                       </h4>
                     </div>
                     {isNoteEditorExpanded ? (
                       <span 
                         onClick={(e) => { e.stopPropagation(); setIsNoteEditorExpanded(false); }}
                         style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer' }}
                        >
                         Click to view all notes
                       </span>
                     ) : (
                       <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Click to expand editor</span>
                     )}
                  </div>
                  
                  <div style={{ 
                    maxHeight: isNoteEditorExpanded ? '1000px' : '0',
                    opacity: isNoteEditorExpanded ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'all 0.3s ease-in-out'
                  }}>
                    <div style={{ padding: '24px' }}>
                      <NoteEditor 
                        contactId={id} 
                        tenantId={contact.tenant_id} 
                        onSave={() => fetchDetail(true)} 
                        style={{ border: 'none', boxShadow: 'none', padding: 0 }}
                      />
                    </div>
                  </div>
                </div>

                <div className="notes-scroll" style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  maxHeight: (!isNoteEditorExpanded && notes.length > 6) ? '480px' : 'auto',
                  overflowY: (!isNoteEditorExpanded && notes.length > 6) ? 'auto' : 'visible',
                  paddingRight: (!isNoteEditorExpanded && notes.length > 6) ? '12px' : '0',
                  position: 'relative',
                  marginTop: isNoteEditorExpanded ? '16px' : '0'
                }}>
                  <style>{`
                    .notes-scroll::-webkit-scrollbar { width: 6px; }
                    .notes-scroll::-webkit-scrollbar-track { background: transparent; }
                    .notes-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                    .notes-scroll::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                  `}</style>
                  {notes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', backgroundColor: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📝</div>
                      <div style={{ fontSize: '16px', fontWeight: '600' }}>No notes yet</div>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>Start the conversation by adding a note above.</div>
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: isNoteEditorExpanded ? '0' : '4px',
                      position: 'relative',
                      height: isNoteEditorExpanded ? '140px' : 'auto'
                    }}>
                      {notes.map((note, index) => {
                        const isPiled = isNoteEditorExpanded;
                        const isVisibleInPile = index < 3;
                        if (isPiled && !isVisibleInPile) return null;

                        const pileStyles = isPiled ? {
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          zIndex: 10 - index,
                          transform: `translateY(${index * 12}px) scale(${1 - (index * 0.04)})`,
                          opacity: 1 - (index * 0.2),
                          pointerEvents: index === 0 ? 'auto' : 'none',
                        } : {};

                        return (
                          <div key={note.id} style={pileStyles}>
                            <NoteItem 
                              note={note} 
                              onDelete={handleDeleteNote}
                              isExpanded={!isNoteEditorExpanded && expandedNoteId === note.id}
                              onToggle={() => {
                                if (isNoteEditorExpanded) {
                                  setIsNoteEditorExpanded(false);
                                } else {
                                  setExpandedNoteId(expandedNoteId === note.id ? null : note.id);
                                }
                              }}
                            />
                          </div>
                        );
                      })}
                      {isNoteEditorExpanded && notes.length > 3 && (
                        <div 
                          onClick={() => setIsNoteEditorExpanded(false)}
                          style={{ 
                            position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)',
                            fontSize: '11px', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', zIndex: 11,
                            backgroundColor: '#fff', padding: '4px 14px', borderRadius: '20px', border: '1px solid var(--primary-light)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          <span>📂</span> View {notes.length - 1} more notes
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '8px' }}>
                   <Button size="sm" type="primary" onClick={handleOpenAddTask} style={{ gap: '6px' }}>
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                     Add Task
                   </Button>
                   <Button size="sm" type="secondary" onClick={() => navigate('/tasks')}>Manage All Tasks</Button>
                </div>
                {tasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No tasks linked to this contact.</div>
                ) : (
                  <>
                    {tasks.slice((taskPage - 1) * ITEMS_PER_PAGE, taskPage * ITEMS_PER_PAGE).map(task => (
                      <div key={task.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '10px', height: '10px', borderRadius: '50%', 
                            backgroundColor: task.status === 'completed' ? 'var(--success)' : 'var(--warning)' 
                          }} />
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-main)' }}>{task.title}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>📅</span> {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}
                              </div>
                              <div style={{ 
                                fontSize: '11px', 
                                fontWeight: '700', 
                                textTransform: 'uppercase', 
                                color: task.priority === 'high' ? 'var(--danger)' : task.priority === 'medium' ? 'var(--warning)' : '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                ⚡ {task.priority || 'medium'}
                              </div>
                              <div style={{ 
                                fontSize: '11px', 
                                fontWeight: '700', 
                                textTransform: 'uppercase', 
                                color: task.status === 'completed' ? 'var(--success)' : 'var(--warning)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                📊 {task.status}
                              </div>
                              <div style={{ 
                                fontSize: '11px', 
                                fontWeight: '600', 
                                color: 'var(--primary)', 
                                backgroundColor: '#f0f7ff', 
                                padding: '2px 8px', 
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                border: '1px solid #e0f0ff'
                              }}>
                                🏢 {task.vendor_name || 'Individual'}
                              </div>
                              <div style={{ 
                                fontSize: '11px', 
                                fontWeight: '600', 
                                color: '#475569', 
                                backgroundColor: '#f1f5f9', 
                                padding: '2px 8px', 
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                border: '1px solid #e2e8f0'
                              }}>
                                👤 {task.assignee_name || 'Unassigned'}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Button size="sm" type="primary" onClick={() => setViewingTask(task)}>View</Button>
                        </div>
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
            )}

            {activeTab === 'deals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '8px' }}>
                   <Button size="sm" type="primary" onClick={handleOpenAddDeal} style={{ gap: '6px' }}>
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                     Add Deal
                   </Button>
                   <Button size="sm" type="secondary" onClick={() => navigate('/deals')}>Manage All Deals</Button>
                </div>
                {deals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No deals associated with this contact.</div>
                ) : (
                  <>
                    {deals.slice((dealPage - 1) * ITEMS_PER_PAGE, dealPage * ITEMS_PER_PAGE).map(deal => (
                      <div key={deal.id} style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-main)' }}>{deal.deal_name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Value: <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>${deal.value}</span></div>
                            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🏁 {deal.stage}
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              fontWeight: '700', 
                              textTransform: 'uppercase', 
                              color: deal.status === 'won' ? 'var(--success)' : deal.status === 'lost' ? 'var(--danger)' : 'var(--warning)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              📈 {deal.status}
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              fontWeight: '600', 
                              color: 'var(--primary)', 
                              backgroundColor: '#f0f7ff', 
                              padding: '2px 8px', 
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              border: '1px solid #e0f0ff'
                            }}>
                              🏢 {deal.vendor_name || 'Individual'}
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              fontWeight: '600', 
                              color: '#475569', 
                              backgroundColor: '#f1f5f9', 
                              padding: '2px 8px', 
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              border: '1px solid #e2e8f0'
                            }}>
                              👤 {deal.assignee_name || 'Unassigned'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Button size="sm" type="primary" onClick={() => setViewingDeal(deal)}>View</Button>
                        </div>
                      </div>
                    ))}
                    <PaginationControls 
                      currentPage={dealPage} 
                      totalItems={deals.length} 
                      itemsPerPage={ITEMS_PER_PAGE} 
                      onPageChange={setDealPage} 
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Edit Contact Details"
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
                {tenants.map(t => <option key={t.id} value={t.id}>{t.tenant_name}</option>)}
            </Select>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input 
                label="First Name" 
                name="first_name"
                placeholder="John"
                value={formik.values.first_name} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
                error={formik.errors.first_name}
                touched={formik.touched.first_name}
                required 
            />
            <Input 
                label="Last Name" 
                name="last_name"
                placeholder="Doe"
                value={formik.values.last_name} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input 
                label="Email" 
                name="email"
                type="email" 
                placeholder="john.doe@example.com"
                value={formik.values.email} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
                error={formik.errors.email}
                touched={formik.touched.email}
                required
            />
            <PhoneInput 
                label="Phone" 
                name="phone"
                value={formik.values.phone} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
                error={formik.errors.phone}
                touched={formik.touched.phone}
                required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input 
                label="Workplace Name" 
                name="company_name"
                placeholder="Acme Corp"
                value={formik.values.company_name} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
                error={formik.errors.company_name}
                touched={formik.touched.company_name}
                required
            />
            <Input 
                label="Profession" 
                name="profession"
                placeholder="e.g. Attorney, Realtor"
                value={formik.values.profession} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
                error={formik.errors.profession}
                touched={formik.touched.profession}
                required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input 
                label="Job Title" 
                name="job_title"
                placeholder="CEO"
                value={formik.values.job_title} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
            />
            <Select
                label="Lead Status"
                name="status"
                value={formik.values.status}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
            >
                <option value="lead">Lead</option>
                <option value="active">Active Customer</option>
                <option value="lost">Lost</option>
            </Select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input 
                label="Source" 
                name="source"
                placeholder="e.g. LinkedIn"
                value={formik.values.source} 
                onChange={formik.handleChange} 
                onBlur={formik.handleBlur}
            />
            <Input 
              label="Tags" 
              name="tags"
              placeholder="e.g. VIP, Prospect"
              value={formik.values.tags} 
              onChange={formik.handleChange} 
              onBlur={formik.handleBlur}
            />
          </div>
        </form>
      </Modal>

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
              <InfoRow label="Status" value={<Badge type={viewingTask.status === 'completed' ? 'success' : 'warning'}>{viewingTask.status}</Badge>} icon="📊" />
              <InfoRow label="Priority" value={<Badge type={viewingTask.priority === 'high' ? 'danger' : viewingTask.priority === 'medium' ? 'warning' : 'secondary'}>{viewingTask.priority?.toUpperCase()}</Badge>} icon="⚡" />
              <InfoRow label="Vendor" value={viewingTask.vendor_name || 'N/A'} icon="🏢" />
              <InfoRow label="Assignee" value={viewingTask.assignee_name || 'Unassigned'} icon="👤" />
              <InfoRow label="Contact Partner" value={`${data?.contact?.first_name} ${data?.contact?.last_name}`} icon="🤝" />
              <InfoRow label="Due Date" value={viewingTask.due_date ? new Date(viewingTask.due_date).toLocaleDateString() : 'No date'} icon="📅" />
              <InfoRow label="Created At" value={new Date(viewingTask.created_at).toLocaleDateString()} icon="⏲️" />
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
                  <span>📄</span> View Document
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Deal Detail Modal */}
      <Modal
        isOpen={!!viewingDeal}
        onClose={() => setViewingDeal(null)}
        title="Deal Details"
        footer={<Button onClick={() => setViewingDeal(null)}>Close</Button>}
      >
        {viewingDeal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>{viewingDeal.deal_name}</h2>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)' }}>${viewingDeal.value}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <InfoRow label="Stage" value={<Badge type="primary">{viewingDeal.stage}</Badge>} icon="🏁" />
              <InfoRow label="Status" value={<Badge type={viewingDeal.status === 'won' ? 'success' : viewingDeal.status === 'lost' ? 'danger' : 'warning'}>{viewingDeal.status}</Badge>} icon="📈" />
              <InfoRow label="Vendor" value={viewingDeal.vendor_name || 'N/A'} icon="🏢" />
              <InfoRow label="Assignee" value={viewingDeal.assignee_name || 'Unassigned'} icon="👤" />
              <InfoRow label="Expected Close" value={viewingDeal.expected_close_date ? new Date(viewingDeal.expected_close_date).toLocaleDateString() : 'No date'} icon="📅" />
              <InfoRow label="Probability" value={`${viewingDeal.probability || 0}%`} icon="🎲" />
              <InfoRow label="Created At" value={new Date(viewingDeal.created_at).toLocaleDateString()} icon="⏲️" />
            </div>

            {viewingDeal.description && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Description / Notes</div>
                <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.6', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {viewingDeal.description}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Contact"
        message={`Are you sure you want to delete ${contact.first_name} ${contact.last_name}? This will permanently remove the contact and all associated data.`}
        confirmText="Yes, Delete"
        confirmType="danger"
      />

      {/* Add Task Modal */}
      <Modal 
        isOpen={isAddTaskModalOpen} 
        onClose={() => setIsAddTaskModalOpen(false)} 
        title="Add New Task"
        footer={<>
          <Button type="secondary" onClick={() => setIsAddTaskModalOpen(false)}>Cancel</Button>
          <Button onClick={addTaskFormik.handleSubmit} disabled={addTaskFormik.isSubmitting}>
            {addTaskFormik.isSubmitting ? 'Creating...' : 'Create Task'}
          </Button>
        </>}
      >
        <form onSubmit={addTaskFormik.handleSubmit}>
          <Input 
            label="Task Title" 
            name="title"
            placeholder="Enter task title"
            value={addTaskFormik.values.title} 
            onChange={addTaskFormik.handleChange} 
            onBlur={addTaskFormik.handleBlur}
            error={addTaskFormik.errors.title}
            touched={addTaskFormik.touched.title}
            required 
          />

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Description</label>
            <textarea 
              name="description"
              placeholder="Provide a detailed description of the task..."
              value={addTaskFormik.values.description}
              onChange={addTaskFormik.handleChange}
              onBlur={addTaskFormik.handleBlur}
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
                value={addTaskFormik.values.due_date} 
                onChange={addTaskFormik.handleChange} 
                onBlur={addTaskFormik.handleBlur}
            />
            
            <Select
                label="Priority"
                name="priority"
                value={addTaskFormik.values.priority}
                onChange={addTaskFormik.handleChange}
                onBlur={addTaskFormik.handleBlur}
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
                value={addTaskFormik.values.assigned_to}
                onChange={addTaskFormik.handleChange}
                onBlur={addTaskFormik.handleBlur}
            >
                <option value="">Select Staff</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>

            <Select
                label="Status"
                name="status"
                value={addTaskFormik.values.status}
                onChange={addTaskFormik.handleChange}
                onBlur={addTaskFormik.handleBlur}
            >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
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
              onClick={() => document.getElementById('task-file-upload').click()}
            >
              <input 
                id="task-file-upload"
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
              ) : addTaskFormik.values.document_url ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📄</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#059669', marginBottom: '4px' }}>Document Uploaded!</div>
                  {uploadedFileName && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{uploadedFileName}</div>}
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>📤</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>Click or drag file to upload</div>
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Deal Modal */}
      <Modal 
        isOpen={isAddDealModalOpen} 
        onClose={() => setIsAddDealModalOpen(false)} 
        title="Add New Deal"
        footer={<>
          <Button type="secondary" onClick={() => setIsAddDealModalOpen(false)}>Cancel</Button>
          <Button onClick={addDealFormik.handleSubmit} disabled={addDealFormik.isSubmitting}>
            {addDealFormik.isSubmitting ? 'Creating...' : 'Create Deal'}
          </Button>
        </>}
      >
        <form onSubmit={addDealFormik.handleSubmit}>
          <Input 
            label="Deal Name" 
            name="deal_name"
            placeholder="e.g. Enterprise License"
            value={addDealFormik.values.deal_name} 
            onChange={addDealFormik.handleChange} 
            onBlur={addDealFormik.handleBlur}
            error={addDealFormik.errors.deal_name}
            touched={addDealFormik.touched.deal_name}
            required 
          />
          
          <Input 
            label="Value ($)" 
            type="number" 
            name="value"
            placeholder="0.00"
            value={addDealFormik.values.value} 
            onChange={addDealFormik.handleChange} 
            onBlur={addDealFormik.handleBlur}
            error={addDealFormik.errors.value}
            touched={addDealFormik.touched.value}
            required 
          />
          
          <Select
            label="Assigned To"
            name="assigned_to"
            value={addDealFormik.values.assigned_to}
            onChange={addDealFormik.handleChange}
            onBlur={addDealFormik.handleBlur}
          >
            <option value="">Unassigned</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
                label="Pipeline Stage"
                name="stage"
                value={addDealFormik.values.stage}
                onChange={addDealFormik.handleChange}
                onBlur={addDealFormik.handleBlur}
            >
                <option value="prospecting">Prospecting</option>
                <option value="qualification">Qualification</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
                <option value="closed">Closed</option>
            </Select>

            <Select
                label="Status"
                name="status"
                value={addDealFormik.values.status}
                onChange={addDealFormik.handleChange}
                onBlur={addDealFormik.handleBlur}
            >
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
            </Select>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function InfoRow({ label, value, icon, isBadge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
        {isBadge && value ? (
          <Badge type="info">{value}</Badge>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>{value || 'Not provided'}</div>
        )}
      </div>
    </div>
  );
}

function TabItem({ children, active, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{
        padding: '16px 20px',
        fontSize: '14px',
        fontWeight: '600',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginBottom: '-1px'
      }}
    >
      {children}
    </div>
  );
}

function PaginationControls({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '24px', padding: '16px 0', borderTop: '1px solid var(--border)' }}>
      <button 
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

function ContactDetailSkeleton() {
  return (
    <div style={{ padding: '40px' }}>
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

      {/* Breadcrumbs Skeleton */}
      <div className="skeleton" style={{ width: '200px', height: '20px', marginBottom: '24px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2.5fr', gap: '32px' }}>
        {/* Left Column Skeleton */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '32px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: '100px', height: '100px', borderRadius: '50%', marginBottom: '20px' }} />
            <div className="skeleton" style={{ width: '150px', height: '24px', marginBottom: '12px' }} />
            <div className="skeleton" style={{ width: '100px', height: '18px', marginBottom: '24px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
              <div className="skeleton" style={{ height: '36px' }} />
              <div className="skeleton" style={{ height: '36px' }} />
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
            <div className="skeleton" style={{ width: '120px', height: '20px', marginBottom: '20px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: 'flex', gap: '12px' }}>
                  <div className="skeleton" style={{ width: '20px', height: '20px' }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ width: '60px', height: '10px', marginBottom: '4px' }} />
                    <div className="skeleton" style={{ width: '100px', height: '14px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Column Skeleton */}
        <main style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px', gap: '24px' }}>
            <div className="skeleton" style={{ width: '100px', height: '48px', borderRadius: '0' }} />
            <div className="skeleton" style={{ width: '100px', height: '48px', borderRadius: '0' }} />
            <div className="skeleton" style={{ width: '100px', height: '48px', borderRadius: '0' }} />
          </div>
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Note Creation Skeleton */}
            <div style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: '16px' }}>
              <div className="skeleton" style={{ width: '200px', height: '24px', marginBottom: '20px' }} />
              <div className="skeleton" style={{ width: '100%', height: '150px', marginBottom: '20px' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div className="skeleton" style={{ width: '100px', height: '40px' }} />
              </div>
            </div>

            {/* Note Items Skeleton */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: '70px', borderRadius: '12px' }} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
