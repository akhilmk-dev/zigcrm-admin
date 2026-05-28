const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'DealDetail.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {notes.map(note => (
                          <NoteItem 
                            key={note.id} 
                            note={note} 
                            onDelete={null}
                            isExpanded={expandedNoteId === note.id}
                            onToggle={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                          />
                        ))}
                      </div>
                    )}`;

const normalize = str => str.replace(/\r\n/g, '\n').trim();
const normalizedContent = normalize(content);
const normalizedTarget = normalize(targetStr);

const replacement = `                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: isTimelineCollapsed ? '0' : '4px',
                        position: 'relative',
                        height: isTimelineCollapsed && notes.length > 1 ? '140px' : 'auto'
                      }}>
                        {notes.map((note, index) => {
                          const isPiled = isTimelineCollapsed && notes.length > 1;
                          const isVisibleInPile = index < 3;
                          if (isPiled && !isVisibleInPile) return null;

                          const pileStyles = isPiled ? {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            zIndex: 10 - index,
                            transform: \`translateY(\${index * 12}px) scale(\${1 - (index * 0.04)})\`,
                            opacity: 1 - (index * 0.2),
                            pointerEvents: index === 0 ? 'auto' : 'none',
                          } : {};

                          return (
                            <div key={note.id} style={pileStyles}>
                              <NoteItem 
                                note={note} 
                                onDelete={null}
                                isExpanded={!isTimelineCollapsed && expandedNoteId === note.id}
                                onToggle={() => {
                                  if (isTimelineCollapsed && notes.length > 1) {
                                    setIsTimelineCollapsed(false);
                                  } else {
                                    setExpandedNoteId(expandedNoteId === note.id ? null : note.id);
                                  }
                                }}
                              />
                            </div>
                          );
                        })}
                        {isTimelineCollapsed && notes.length > 1 && (
                          <div 
                            onClick={() => setIsTimelineCollapsed(false)}
                            style={{ 
                              position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)',
                              fontSize: '11px', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer', zIndex: 11,
                              backgroundColor: '#fff', padding: '4px 14px', borderRadius: '20px', border: '1px solid var(--primary-light)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <span style={{ display: 'flex' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></span> View {notes.length - 1} more notes
                          </div>
                        )}
                        {!isTimelineCollapsed && notes.length > 1 && (
                           <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                             <button 
                               onClick={() => {
                                 setIsTimelineCollapsed(true);
                                 setExpandedNoteId(null);
                               }}
                               style={{
                                 padding: '6px 16px', borderRadius: '20px', border: '1px solid var(--border)',
                                 backgroundColor: '#fff', color: 'var(--text-muted)', cursor: 'pointer',
                                 fontSize: '12px', fontWeight: '600', transition: 'all 0.2s'
                               }}
                             >
                               Collapse Timeline
                             </button>
                           </div>
                        )}
                      </div>
                    )}`;

if (normalizedContent.includes(normalizedTarget)) {
  const finalContent = content.replace(
    /(\s+)\)\s*:\s*\(\s*<div\s+style=\{\{\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*gap:\s*'8px'\s*\}\}>[\s\S]*?<\/div>\s*\)\}/,
    replacement
  );
  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log('Successfully patched DealDetail.jsx!');
} else {
  console.log('Target string not found in DealDetail.jsx.');
}
