import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FILE_BASE_URL, getFileUrl } from '../api/axiosConfig';
import { ConfirmModal } from './common/Modal';

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

export default function NoteItem({ note, onDelete, isExpanded, onToggle }) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const attachments = Array.isArray(note.attachments) ? note.attachments : [];
  const images = attachments.filter(a => a.type?.startsWith('image/'));
  const files = attachments.filter(a => !a.type?.startsWith('image/'));

  const handleDelete = () => {
    setIsDeleteModalOpen(false);
    onDelete(note.id);
  };

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: isExpanded ? '0 15px 35px -5px rgba(0, 0, 0, 0.08)' : '0 2px 8px -2px rgba(0,0,0,0.02)',
      marginBottom: '12px'
    }}>
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete"
      />

      {/* Accordion Header */}
      <div 
        onClick={onToggle}
        style={{ 
          padding: '16px 20px', 
          display: 'flex', 
          alignItems: 'flex-start', 
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: isExpanded ? 'var(--bg-main)' : '#fff',
          gap: '16px'
        }}
      >
        {/* LEFT COLUMN: Title & Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
               {note.title || 'Note'}
             </span>
             {attachments.length > 0 && (
                <span style={{ 
                  fontSize: '10px', 
                  backgroundColor: 'var(--bg-main)', 
                  padding: '2px 6px', 
                  borderRadius: '10px', 
                  color: 'var(--text-muted)',
                  fontWeight: '700',
                  flexShrink: 0
                }}>
                  📎 {attachments.length}
                </span>
              )}
          </div>
          <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {note.content ? note.content.replace(/<[^>]*>/g, '').substring(0, 100) || 'Added a note' : 'Added a note'}
          </div>
        </div>
        
        {/* RIGHT COLUMN: Date & Avatar/Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
             {/* Date */}
             <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
               {formatRelativeDate(note.created_at)}
             </div>
             
             {/* Avatar & Name */}
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--primary-light)', 
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: '800',
                  flexShrink: 0
                }}>
                  {note.author_name?.[0] || 'U'}
                </div>
                <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>
                  {note.author_name || 'User'}
                </span>
             </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '12px', borderLeft: '1px solid var(--border)', height: '100%' }}>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteModalOpen(true);
                }}
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  opacity: 0.5,
                  transition: 'opacity 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                onMouseOut={(e) => e.currentTarget.style.opacity = 0.5}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
            <svg
              width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{
                transform: isExpanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.3s',
                color: 'var(--text-muted)'
              }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Accordion Content */}
      <div style={{
        maxHeight: isExpanded ? '2000px' : '0',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        borderTop: isExpanded ? '1px solid var(--border)' : '0 solid transparent'
      }}>
        <div style={{ padding: '24px' }}>
          {note.title && (
            <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>
              {note.title}
            </h4>
          )}

          {note.deal && (
            <Link
              to={`/deals/${note.deal.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '6px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                fontSize: '11.5px',
                fontWeight: '600',
                marginBottom: '14px',
                textDecoration: 'none',
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
              <span>Linked Deal: <strong>{note.deal.deal_name}</strong> (₹{Number(note.deal.value).toLocaleString('en-IN')})</span>
            </Link>
          )}

          <div
            className="note-html-content"
            style={{ fontSize: '15px', lineHeight: '1.7', color: 'var(--text-main)' }}
            dangerouslySetInnerHTML={{ __html: note.content }}
          />

          {/* Images Gallery */}
          {images.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginTop: '24px' }}>
              {images.map((img, idx) => (
                <a key={idx} href={getFileUrl(img.url)} target="_blank" rel="noopener noreferrer" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={getFileUrl(img.url)} alt={img.name} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                </a>
              ))}
            </div>
          )}

          {/* Files List */}
          {files.length > 0 && (
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {files.map((file, idx) => (
                <a
                  key={idx}
                  href={getFileUrl(file.url)}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-main)',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    fontWeight: '600',
                    border: '1px solid var(--border)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {getFileIcon(file.type, file.name)}
                  <span style={{ flex: 1 }}>{file.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
