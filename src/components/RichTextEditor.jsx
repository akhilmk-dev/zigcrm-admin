import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();

  return (
    <div className="editor-toolbar" style={{
      display: 'flex',
      gap: '8px',
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      backgroundColor: 'var(--bg-main)',
      flexWrap: 'wrap'
    }}>
      <ToolbarButton 
        onClick={toggleBold} 
        active={editor.isActive('bold')} 
        label="B" 
        style={{ fontWeight: 'bold' }} 
      />
      <ToolbarButton 
        onClick={toggleItalic} 
        active={editor.isActive('italic')} 
        label="I" 
        style={{ fontStyle: 'italic', fontFamily: 'serif' }} 
      />
      <ToolbarButton 
        onClick={toggleUnderline} 
        active={editor.isActive('underline')} 
        label="U" 
        style={{ textDecoration: 'underline' }} 
      />
      <div style={{ width: '1px', backgroundColor: 'var(--border)', margin: '0 4px' }} />
      <ToolbarButton 
        onClick={toggleBulletList} 
        active={editor.isActive('bulletList')} 
        label="• List" 
      />
      <ToolbarButton 
        onClick={toggleOrderedList} 
        active={editor.isActive('orderedList')} 
        label="1. List" 
      />
    </div>
  );
};

const ToolbarButton = ({ onClick, active, label, style = {} }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: '4px 12px',
      borderRadius: '6px',
      border: '1px solid ' + (active ? 'var(--primary)' : 'transparent'),
      backgroundColor: active ? 'var(--primary-light)' : 'transparent',
      color: active ? 'var(--primary)' : 'var(--text-main)',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'all 0.2s',
      ...style
    }}
  >
    {label}
  </button>
);

export default function RichTextEditor({ value, onChange, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
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
      <MenuBar editor={editor} />
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
