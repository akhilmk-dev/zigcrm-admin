import React, { useState, useRef } from 'react';
import RichTextEditor from './RichTextEditor';
import { Button } from './common/Modal';
import api from '../api/axiosConfig';
import { toast } from 'react-hot-toast';

export default function NoteEditor({ contactId, tenantId, onSave, style = {} }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const response = await api.post('/notes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAttachments([...attachments, ...response.data.files]);
    } catch (err) {
      console.error("Upload error", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!content.trim() || content === '<p><br></p>') return;
    
    setIsSaving(true);
    try {
      await api.post('/notes', {
        contact_id: contactId,
        tenant_id: tenantId,
        title,
        content,
        attachments
      });
      setTitle('');
      setContent('');
      setAttachments([]);
      toast.success('Note saved successfully');
      if (onSave) onSave();
    } catch (err) {
      console.error("Save note error", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to render specific file type icons
  const getFileIcon = (type, name) => {
    if (type?.startsWith('image/')) {
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
    }
    if (type === 'application/pdf' || name?.toLowerCase().endsWith('.pdf')) {
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h3a2 2 0 0 1 0 4h-3V15z"/><path d="M5 12h14"/><path d="M7 12V5"/></svg>;
    }
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
  };

  const attachButton = (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple style={{ display: 'none' }} />
      <input type="file" ref={imageInputRef} onChange={handleFileChange} multiple accept="image/*" style={{ display: 'none' }} />
      
      <div style={{ width: '1px', backgroundColor: 'var(--border)', height: '20px', margin: '0 8px' }} />
      
      {/* Attach Files */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        title="Attach Files"
        style={{
          padding: '4px 10px', borderRadius: '6px', border: '1px solid transparent',
          backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>

      {/* Upload Image */}
      <button
        type="button"
        onClick={() => imageInputRef.current?.click()}
        disabled={isUploading}
        title="Upload Image"
        style={{
          padding: '4px 10px', borderRadius: '6px', border: '1px solid transparent',
          backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
      </button>
    </div>
  );

  return (
    <div style={{ 
      backgroundColor: '#fff', 
      borderRadius: '16px', 
      border: '1px solid var(--border)',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
      transition: 'all 0.3s ease',
      ...style
    }}>
      <div style={{ marginBottom: '20px' }}>
        <input 
          placeholder="Note Title (optional)..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: '100%',
            fontSize: '20px',
            fontWeight: '700',
            border: 'none',
            outline: 'none',
            color: 'var(--text-main)',
            backgroundColor: 'transparent',
            letterSpacing: '-0.5px'
          }}
        />
        <div style={{ height: '2px', backgroundColor: 'var(--primary-light)', marginTop: '8px', width: '40px', borderRadius: '2px' }} />
      </div>
      
      <RichTextEditor 
        value={content}
        onChange={setContent}
        placeholder="Capture your thoughts..."
        extraToolbarContent={attachButton}
      />

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
          {attachments.map((file, idx) => (
            <div key={idx} style={{ 
              position: 'relative',
              padding: '8px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--text-main)'
            }}>
              {getFileIcon(file.type, file.name)}
              <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </span>
              <button 
                onClick={() => removeAttachment(idx)}
                style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px', display: 'flex' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <Button 
          type="primary" 
          onClick={handleSave}
          disabled={isSaving || isUploading || !content.trim() || content === '<p><br></p>'}
          style={{ paddingLeft: '32px', paddingRight: '32px' }}
        >
          {isSaving ? 'Saving...' : 'Save Note'}
        </Button>
      </div>
    </div>
  );
}
