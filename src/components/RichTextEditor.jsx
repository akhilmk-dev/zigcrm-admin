import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';

const MenuBar = ({ editor, extraContent, isBottom = false }) => {
  const [activePicker, setActivePicker] = React.useState(null); // 'color' or 'highlight'

  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();

  const toggleLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

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
      gap: '6px',
      padding: isBottom ? '0px' : '12px 16px',
      borderBottom: isBottom ? 'none' : '1px solid var(--border)',
      backgroundColor: isBottom ? 'transparent' : 'var(--bg-main)',
      flexWrap: 'wrap',
      alignItems: 'center',
      position: 'relative'
    }}>
      <ToolbarButton onClick={toggleBold} active={editor.isActive('bold')} title="Bold">
        <span style={{ fontSize: '13.5px', fontWeight: '800', fontFamily: 'Inter, system-ui', padding: '0 2px' }}>B</span>
      </ToolbarButton>
      <ToolbarButton onClick={toggleItalic} active={editor.isActive('italic')} title="Italic">
        <span style={{ fontSize: '13.5px', fontWeight: '600', fontStyle: 'italic', fontFamily: 'Georgia, serif', padding: '0 2px' }}>I</span>
      </ToolbarButton>
      <ToolbarButton onClick={toggleUnderline} active={editor.isActive('underline')} title="Underline">
        <span style={{ fontSize: '13.5px', fontWeight: '600', textDecoration: 'underline', fontFamily: 'Inter, system-ui', padding: '0 2px' }}>U</span>
      </ToolbarButton>

      <div style={{ width: '1px', backgroundColor: '#cbd5e1', height: '14px', margin: '0 8px' }} />

      {!isBottom && (
        <>
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
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ fill: editor.getAttributes('highlight').color || 'transparent' }}><path d="m12 19 7-7 3 3-7 7-3-3Z" /><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5Z" /><path d="m2 2 5 5" /><path d="m8.5 8.5 1.5 1.5" /></svg>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
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
        </>
      )}

      <ToolbarButton onClick={toggleBulletList} active={editor.isActive('bulletList')} title="Bullet List">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </ToolbarButton>
      <ToolbarButton onClick={toggleOrderedList} active={editor.isActive('orderedList')} title="Ordered List">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
        </svg>
      </ToolbarButton>



      {/* Extra Content (e.g. Attach Button) */}
      {extraContent}
    </div>
  );
};

const ToolbarButton = ({ onClick, active, children, style = {}, title }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px 8px',
        borderRadius: '4px',
        border: 'none',
        backgroundColor: active 
          ? '#eff6ff' 
          : (hovered ? '#f1f5f9' : 'transparent'),
        color: active ? '#2563eb' : '#64748b',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '600',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
        ...style
      }}
    >
      {children}
    </button>
  );
};

export default function RichTextEditor({ value, onChange, placeholder, extraToolbarContent, minHeight = '150px', toolbarPosition = 'top', actions = null, noBorder = false }) {
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
      Placeholder.configure({
        placeholder: placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: `outline: none; min-height: ${minHeight}; padding: 16px; font-size: 14px; line-height: 1.6; color: var(--text-main);`,
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
      borderRadius: noBorder ? '0' : '8px',
      border: noBorder ? 'none' : '1px solid #e2e8f0',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {toolbarPosition === 'top' ? (
        <>
          <MenuBar editor={editor} extraContent={extraToolbarContent} />
          <EditorContent editor={editor} />
        </>
      ) : (
        <>
          <EditorContent editor={editor} />
          <div className="editor-bottom-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MenuBar editor={editor} extraContent={extraToolbarContent} isBottom={true} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {actions}
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 480px) {
          .editor-bottom-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
            padding: 12px 16px !important;
          }
          .editor-bottom-bar > div {
            justify-content: space-between !important;
            width: 100% !important;
          }
        }
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
