import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';

const MenuBar = ({ editor, extraContent }) => {
  const [activePicker, setActivePicker] = React.useState(null); // 'color' or 'highlight'

  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  
  const toggleUppercase = () => {
    const isUppercase = editor.getAttributes('textStyle').textTransform === 'uppercase';
    editor.chain().focus().setMark('textStyle', { textTransform: isUppercase ? 'none' : 'uppercase' }).run();
  };

  const colors = [
    '#000000', '#475569', '#94a3b8', '#ef4444', '#f97316', '#f59e0b', 
    '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef'
  ];

  const bgColors = [
    '#ffffff', '#fbbf24', '#fde047', '#a3e635', '#4ade80', '#2dd4bf', 
    '#22d3ee', '#60a5fa', '#818cf8', '#a78bfa', '#e879f9', '#fb7185'
  ];

  const handleColorSelect = (color) => {
    editor.chain().focus().setColor(color).run();
    setActivePicker(null);
  };

  const handleBgSelect = (color) => {
    editor.chain().focus().toggleHighlight({ color }).run();
    setActivePicker(null);
  };

  return (
    <div className="editor-toolbar" style={{
      display: 'flex',
      gap: '8px',
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      backgroundColor: 'var(--bg-main)',
      flexWrap: 'wrap',
      alignItems: 'center',
      position: 'relative'
    }}>
      <ToolbarButton onClick={toggleBold} active={editor.isActive('bold')} title="Bold">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><line x1="6" y1="4" x2="6" y2="20"/></svg>
      </ToolbarButton>
      <ToolbarButton onClick={toggleItalic} active={editor.isActive('italic')} title="Italic">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
      </ToolbarButton>
      <ToolbarButton onClick={toggleUnderline} active={editor.isActive('underline')} title="Underline">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
      </ToolbarButton>
      
      <div style={{ width: '1px', backgroundColor: 'var(--border)', height: '20px', margin: '0 4px' }} />

      <ToolbarButton 
        onClick={toggleUppercase} 
        active={editor.getAttributes('textStyle').textTransform === 'uppercase'} 
        title="Uppercase"
      >
        <span style={{ fontSize: '13px', fontWeight: '800' }}>TT</span>
      </ToolbarButton>

      <div style={{ width: '1px', backgroundColor: 'var(--border)', height: '20px', margin: '0 4px' }} />

      {/* Color Picker */}
      <div style={{ position: 'relative' }}>
        <button 
          type="button"
          onClick={() => setActivePicker(activePicker === 'color' ? null : 'color')}
          style={{
            padding: '4px 8px', borderRadius: '6px', border: '1px solid transparent',
            backgroundColor: activePicker === 'color' ? 'var(--primary-light)' : 'transparent',
            color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: '800', borderBottom: '3px solid ' + (editor.getAttributes('textStyle').color || '#000') }}>A</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        {activePicker === 'color' && (
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 100, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {colors.map(c => (
              <div key={c} onClick={() => handleColorSelect(c)} style={{ width: '24px', height: '24px', backgroundColor: c, borderRadius: '6px', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.05)' }} />
            ))}
          </div>
        )}
      </div>

      {/* Background Picker */}
      <div style={{ position: 'relative' }}>
        <button 
          type="button"
          onClick={() => setActivePicker(activePicker === 'highlight' ? null : 'highlight')}
          style={{
            padding: '4px 8px', borderRadius: '6px', border: '1px solid transparent',
            backgroundColor: activePicker === 'highlight' ? 'var(--primary-light)' : 'transparent',
            color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: editor.getAttributes('highlight').color || 'transparent' }}><path d="m12 19 7-7 3 3-7 7-3-3Z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5Z"/><path d="m2 2 5 5"/><path d="m8.5 8.5 1.5 1.5"/></svg>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        {activePicker === 'highlight' && (
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', backgroundColor: '#fff', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 100, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {bgColors.map(c => (
              <div key={c} onClick={() => handleBgSelect(c)} style={{ width: '24px', height: '24px', backgroundColor: c, borderRadius: '6px', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.05)' }} />
            ))}
          </div>
        )}
      </div>

      <div style={{ width: '1px', backgroundColor: 'var(--border)', height: '20px', margin: '0 4px' }} />
      
      <ToolbarButton onClick={toggleBulletList} active={editor.isActive('bulletList')} title="Bullet List">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      </ToolbarButton>
      <ToolbarButton onClick={toggleOrderedList} active={editor.isActive('orderedList')} title="Ordered List">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
        </svg>
      </ToolbarButton>

      {/* Extra Content (e.g. Attach Button) */}
      {extraContent}
    </div>
  );
};

const ToolbarButton = ({ onClick, active, children, style = {}, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      padding: '4px 10px',
      borderRadius: '6px',
      border: '1px solid ' + (active ? 'var(--primary)' : 'transparent'),
      backgroundColor: active ? 'var(--primary-light)' : 'transparent',
      color: active ? 'var(--primary)' : 'var(--text-main)',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style
    }}
  >
    {children}
  </button>
);

export default function RichTextEditor({ value, onChange, placeholder, extraToolbarContent }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure(),
      Underline.configure(),
      TextStyle.extend({
        addAttributes() {
          return {
            textTransform: {
              default: null,
              parseHTML: element => element.style.textTransform,
              renderHTML: attributes => {
                if (!attributes.textTransform) return {};
                return { style: `text-transform: ${attributes.textTransform}` };
              },
            },
          };
        },
      }),
      Color.configure(),
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: 'outline: none; min-height: 150px; padding: 16px; font-size: 14px; line-height: 1.6; color: var(--text-main);',
      },
    },
  });

  // Sync value from props if it changes externally (e.g., reset)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className="tiptap-editor-container" style={{
      backgroundColor: '#fff',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <MenuBar editor={editor} extraContent={extraToolbarContent} />
      <EditorContent editor={editor} />
      
      <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-muted);
          pointer-events: none;
          height: 0;
        }
        .tiptap ul, .tiptap ol {
          padding: 0 1rem;
          margin: 1rem 0;
        }
        .tiptap blockquote {
          border-left: 3px solid var(--border);
          padding-left: 1rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
