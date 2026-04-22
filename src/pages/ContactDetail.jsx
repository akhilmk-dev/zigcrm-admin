import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../api/axiosConfig';
import { Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select } from '../components/common/Modal';
import RichTextEditor from '../components/RichTextEditor';
import NoteEditor from '../components/NoteEditor';
import NoteItem from '../components/NoteItem';

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  
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

  if (loading) return <ContactDetailSkeleton />;
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

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2.5fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Col: Detailed Info */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Profile Card */}
          <div style={{ 
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
              <Button type="secondary" size="sm" onClick={handleOpenEditModal} style={{ width: '100%' }}>Edit</Button>
              <Button type="danger" size="sm" onClick={() => { if(window.confirm("Delete contact?")) { api.delete(`/contacts/${id}`).then(() => navigate('/contacts')) } }} style={{ width: '100%' }}>Delete</Button>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px' }}>
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
                <NoteEditor 
                  contactId={id} 
                  tenantId={contact.tenant_id} 
                  onSave={fetchDetail} 
                />

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {notes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', backgroundColor: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📝</div>
                      <div style={{ fontSize: '16px', fontWeight: '600' }}>No notes yet</div>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>Start the conversation by adding a note above.</div>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <NoteItem 
                        key={note.id} 
                        note={note} 
                        onDelete={handleDeleteNote}
                        isExpanded={expandedNoteId === note.id}
                        onToggle={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                      />
                    ))
                  )}
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
