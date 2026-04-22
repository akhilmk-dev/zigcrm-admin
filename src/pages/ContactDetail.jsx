import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../api/axiosConfig';
import { Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select } from '../components/common/Modal';
import RichTextEditor from '../components/RichTextEditor';

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  
  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tenants, setTenants] = useState([]);

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
      email: Yup.string().email('Invalid email address'),
      phone: Yup.string().required('Phone number is required'),
      company_name: Yup.string().required('Workplace name is required'),
      profession: Yup.string().required('Profession is required')
    }),
    onSubmit: async (values) => {
      try {
        await api.patch(`/contacts/${id}`, values);
        setIsEditModalOpen(false);
        fetchDetail();
      } catch (err) {
        console.error("Update contact error", err);
      }
    }
  });

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/contacts/${id}`);
      setData(response.data);
    } catch (err) {
      console.error("Fetch detail error", err);
      if (err.response?.status === 404) {
        alert("Contact not found");
        navigate('/contacts');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    
    setIsSubmittingNote(true);
    try {
      await api.post('/notes', {
        contact_id: id,
        tenant_id: contact.tenant_id,
        title: noteTitle,
        content: noteContent
      });
      setNoteTitle('');
      setNoteContent('');
      fetchDetail(); // Refresh to show new note
    } catch (err) {
      console.error("Add note error", err);
    } finally {
      setIsSubmittingNote(false);
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
      fetchDetail();
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading contact details...</div>;
  if (!data) return null;
  const contact = data.contact || {};
  const tasks = data.tasks || [];
  const deals = data.deals || [];
  const notes = data.notes || [];

  return (
    <div>
      {/* Breadcrumbs & Navigation */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
        <Link to="/contacts" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Contacts</Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{contact.first_name} {contact.last_name}</span>
      </div>

      {/* Header Profile Section */}
      <div style={{ 
        backgroundColor: '#fff', 
        borderRadius: '16px', 
        padding: '32px', 
        border: '1px solid var(--border)',
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--primary-light)', 
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: 'bold'
          }}>
            {contact.first_name[0]}{contact.last_name?.[0] || ''}
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              {contact.first_name} {contact.last_name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <Badge type={contact.status === 'active' ? 'success' : contact.status === 'lost' ? 'danger' : 'warning'}>
                {contact.status.toUpperCase()}
              </Badge>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>•</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{contact.company_name || 'Individual'}</span>
            </div>
          </div>
        </div>
         <div style={{ display: 'flex', gap: '12px' }}>
           <Button type="secondary" onClick={handleOpenEditModal}>Edit Details</Button>
           <Button type="danger" onClick={() => { if(window.confirm("Delete contact?")) { api.delete(`/contacts/${id}`).then(() => navigate('/contacts')) } }}>Delete</Button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Col: Detailed Info */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: 'var(--text-main)' }}>Contact Information</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <InfoRow label="Email" value={contact.email} icon="✉️" />
              <InfoRow label="Phone" value={contact.phone} icon="📞" />
              <InfoRow label="Profession" value={contact.profession} icon="🎓" />
              <InfoRow label="Job Title" value={contact.job_title} icon="👔" />
              <InfoRow label="Source" value={contact.source} icon="📍" />
              <InfoRow label="Company" value={contact.tenants?.tenant_name} icon="🏢" isBadge />
              <InfoRow label="Tags" value={contact.tags} icon="🏷️" />
              <InfoRow label="Joined" value={new Date(contact.created_at).toLocaleDateString()} icon="📅" />
            </div>
          </div>
        </aside>

        {/* Right Col: Activity/Tabs */}
        <main style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
          {/* Tabs Header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
            <TabItem active={activeTab === 'notes'} onClick={() => setActiveTab('notes')}>Timeline & Notes ({notes.length})</TabItem>
            <TabItem active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')}>Tasks ({tasks.length})</TabItem>
            <TabItem active={activeTab === 'deals'} onClick={() => setActiveTab('deals')}>Deals ({deals.length})</TabItem>
          </div>

          <div style={{ padding: '32px', flex: 1 }}>
            {activeTab === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Note Creation */}
                <div style={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '16px', 
                  border: '1px solid var(--border)',
                  padding: '24px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{ marginBottom: '20px' }}>
                    <input 
                      placeholder="Note Title..."
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      style={{
                        width: '100%',
                        fontSize: '22px',
                        fontWeight: '700',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-main)',
                        backgroundColor: 'transparent'
                      }}
                    />
                    <div style={{ height: '1px', backgroundColor: 'var(--border)', marginTop: '8px', width: '60px' }} />
                  </div>
                  
                  <RichTextEditor 
                    value={noteContent}
                    onChange={setNoteContent}
                    placeholder="Start architectural thinking..."
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <Button 
                      type="primary" 
                      onClick={handleAddNote}
                      disabled={isSubmittingNote || !noteContent.trim() || noteContent === '<p><br></p>'}
                    >
                      {isSubmittingNote ? 'Saving...' : 'Save Note'}
                    </Button>
                  </div>
                </div>

                {/* Notes Feed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {notes.length === 0 ? (
                    <div style={{ textAlign: 'center', py: '40px', color: 'var(--text-muted)' }}>
                      No notes yet. Start the conversation!
                    </div>
                  ) : notes.map(note => (
                    <div key={note.id} style={{ 
                      padding: '24px', 
                      borderRadius: '16px', 
                      backgroundColor: '#fff', 
                      border: '1px solid var(--border)',
                      position: 'relative',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            backgroundColor: 'var(--primary-light)', 
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '700'
                          }}>
                            {note.author_name?.[0] || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)' }}>{note.author_name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{new Date(note.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteNote(note.id)}
                          style={{ border: 'none', background: 'none', color: 'var(--danger)', fontSize: '12px', cursor: 'pointer', opacity: 0.4 }}
                        >
                          Delete
                        </button>
                      </div>

                      {note.title && (
                        <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>
                          {note.title}
                        </h4>
                      )}

                      <div 
                        className="note-html-content"
                        style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-main)' }}
                        dangerouslySetInnerHTML={{ __html: note.content }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                   <Button size="sm" onClick={() => navigate('/tasks')}>Manage All Tasks</Button>
                </div>
                {tasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No tasks linked to this contact.</div>
                ) : tasks.map(task => (
                  <div key={task.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '10px', height: '10px', borderRadius: '50%', 
                        backgroundColor: task.status === 'completed' ? 'var(--success)' : 'var(--warning)' 
                      }} />
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{task.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}</div>
                      </div>
                    </div>
                    <Badge type={task.status === 'completed' ? 'success' : 'warning'}>{task.status}</Badge>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'deals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {deals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No deals associated with this contact.</div>
                ) : deals.map(deal => (
                  <div key={deal.id} style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>{deal.deal_name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Value: <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>${deal.value}</span></div>
                    </div>
                    <Badge type={deal.status === 'won' ? 'success' : deal.status === 'lost' ? 'danger' : 'primary'}>{deal.stage}</Badge>
                  </div>
                ))}
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
            />
            <Input 
                label="Phone" 
                name="phone"
                placeholder="+1 (555) 000-0000"
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
