import React, { useState, useRef } from 'react';
import RichTextEditor from './RichTextEditor';
import { Button } from './common/Modal';
import api from '../api/axiosConfig';
import { toast } from 'react-hot-toast';

export default function NoteEditor({ 
  contactId, 
  dealId, 
  tenantId, 
  onSave, 
  style = {}, 
  minHeight = '150px', 
  hideTitle = false, 
  placeholder = "Capture your thoughts...",
  externalTitle,
  setExternalTitle,
  header = null,
  noWrapper = false
}) {
  const [internalTitle, setInternalTitle] = useState('');
  const title = externalTitle !== undefined ? externalTitle : internalTitle;
  const setTitle = setExternalTitle !== undefined ? setExternalTitle : setInternalTitle;

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

      const newFiles = response.data.files;
      if (newFiles && newFiles.length > 0) {
        const newFile = newFiles[0];
        const isImage = newFile.type?.startsWith('image/');

        setAttachments(prev => {
          // Remove existing file of the same category
          const filtered = prev.filter(f => {
            const fIsImage = f.type?.startsWith('image/');
            return isImage ? !fIsImage : fIsImage;
          });
          return [...filtered, newFile];
        });
      }
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
      const response = await api.post('/notes', {
        contact_id: contactId,
        deal_id: dealId,
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

  const handleCancel = () => {
    setTitle('');
    setContent('');
    setAttachments([]);
  };

  // Helper to render specific file type icons
  const getFileIcon = (type, name) => {
    if (type?.startsWith('image/')) {
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3b82f6' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
    }
    if (type === 'application/pdf' || name?.toLowerCase().endsWith('.pdf')) {
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15h3a2 2 0 0 1 0 4h-3V15z" /><path d="M5 12h14" /><path d="M7 12V5" /></svg>;
    }
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
  };

  const attachButton = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
      <input type="file" ref={imageInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />

      {/* Attach Files */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        title="Attach Files"
        style={{
          padding: '6px 8px', borderRadius: '4px', border: 'none',
          backgroundColor: 'transparent', color: '#64748b', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease',
          outline: 'none'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#f1f5f9';
          e.currentTarget.style.color = '#1e293b';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#64748b';
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(45deg)' }}>
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
          padding: '6px 8px', borderRadius: '4px', border: 'none',
          backgroundColor: 'transparent', color: '#64748b', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease',
          outline: 'none'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#f1f5f9';
          e.currentTarget.style.color = '#1e293b';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#64748b';
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
        </svg>
      </button>
    </div>
  );

  const editorContent = (
    <>
      {/* Optional header slot (title + deal picker rendered from parent) */}
      {header && (
        <div style={{ padding: '16px 20px 0 20px' }}>
          {header}
        </div>
      )}

      {!hideTitle && (
        <div style={{ padding: '16px 20px 0 20px' }}>
          <input
            placeholder="Note Title (optional)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              fontSize: '16px',
              fontWeight: '700',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              backgroundColor: 'transparent',
            }}
          />
          <div style={{ height: '2px', backgroundColor: 'var(--primary-light)', marginTop: '8px', width: '40px', borderRadius: '2px' }} />
        </div>
      )}

      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder={placeholder}
        extraToolbarContent={attachButton}
        minHeight={minHeight}
        toolbarPosition="bottom"
        noBorder={true}
        actions={(
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                padding: '6px 12px',
                transition: 'color 0.15s ease',
                outline: 'none'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#1e293b'}
              onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isUploading || !content.trim() || content === '<p><br></p>'}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                backgroundColor: '#7091F5',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '100px',
                transition: 'all 0.15s ease',
                outline: 'none',
                opacity: (isSaving || isUploading || !content.trim() || content === '<p><br></p>') ? 0.5 : 1,
                boxShadow: '0 2px 8px rgba(112,145,245,0.3)'
              }}
              onMouseOver={(e) => {
                if (!(isSaving || isUploading || !content.trim() || content === '<p><br></p>')) {
                  e.currentTarget.style.backgroundColor = '#5c7ee6';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(92,126,230,0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (!(isSaving || isUploading || !content.trim() || content === '<p><br></p>')) {
                  e.currentTarget.style.backgroundColor = '#7091F5';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(112,145,245,0.3)';
                }
              }}
            >
              {isSaving ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        )}
      />

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '12px 20px' }}>
          {attachments.map((file, idx) => (
            <div key={idx} style={{
              position: 'relative',
              padding: '6px 10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#1e293b'
            }}>
              {getFileIcon(file.type, file.name)}
              <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </span>
              <button
                onClick={() => removeAttachment(idx)}
                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', display: 'flex' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (noWrapper) {
    return editorContent;
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      ...style
    }}>
      {editorContent}
    </div>
  );
}
