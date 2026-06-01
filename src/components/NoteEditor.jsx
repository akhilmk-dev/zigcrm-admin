import React, { useState, useRef, useEffect } from 'react';
import RichTextEditor from './RichTextEditor';
import api, { getFileUrl } from '../api/axiosConfig';
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
  category,
  setCategory,
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
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  // ─── Audio Recording ─────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const SILENCE_TIMEOUT = 3000; // auto-stop after 3s of silence

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.stop();
      // clean up audio recording
      clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // ─── Audio Recording helpers ─────────────────────────────────────────────────
  const formatRecordTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const startAudioRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // pick best supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // stop all tracks to release mic
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recordTimerRef.current);
        setIsRecording(false);

        if (audioChunksRef.current.length === 0) return;

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const fileName = `voice_note_${Date.now()}.${ext}`;
        const audioFile = new File([blob], fileName, { type: mimeType });

        // upload via existing attachment endpoint
        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append('files', audioFile);
          const response = await api.post('/notes/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          const newFiles = response.data.files;
          if (newFiles && newFiles.length > 0) {
            setAttachments(prev => [...prev, newFiles[0]]);
            toast.success('Audio recorded and attached!');
          }
        } catch (err) {
          console.error('Audio upload error', err);
          toast.error('Failed to upload audio recording');
        } finally {
          setIsUploading(false);
          setRecordSeconds(0);
        }
      };

      recorder.start(250); // capture in 250ms chunks
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        toast.error('Microphone permission denied. Please allow microphone access.');
      } else {
        console.error('Recording error', err);
        toast.error('Could not start audio recording');
      }
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // suppress onstop upload by clearing chunks first
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setRecordSeconds(0);
  };

  const toggleAudioRecording = () => {
    if (isRecording) stopAudioRecording();
    else startAudioRecording();
  };

  const stopVoice = () => {
    shouldRestartRef.current = false;
    clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText('');
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice transcription not supported. Please use Chrome or Edge.');
      return;
    }

    shouldRestartRef.current = true;

    const initSession = () => {
      if (!shouldRestartRef.current) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';
      recognitionRef.current = recognition;

      // Reset silence countdown — called on every speech activity
      const resetSilenceTimer = () => {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          // No speech for SILENCE_TIMEOUT ms → auto-stop
          if (shouldRestartRef.current) {
            shouldRestartRef.current = false;
            recognition.stop();
          }
        }, SILENCE_TIMEOUT);
      };

      recognition.onstart = () => {
        setIsListening(true);
        setInterimText('');
        resetSilenceTimer();
      };

      recognition.onresult = (event) => {
        resetSilenceTimer(); // Any speech resets the silence countdown
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += t;
          else interim += t;
        }
        setInterimText(interim);
        if (final) {
          setInterimText('');
          setContent(prev => {
            const empty = !prev || prev === '<p><br></p>' || prev.trim() === '';
            return empty
              ? `<p>${final.trim()}</p>`
              : prev.replace(/<p><br><\/p>$/, '') + `<p>${final.trim()}</p>`;
          });
        }
      };

      // Suppress non-critical errors; let onend handle restart
      recognition.onerror = (e) => {
        if (e.error === 'aborted' || e.error === 'no-speech' || e.error === 'network') return;
        toast.error(`Voice error: ${e.error}`);
        shouldRestartRef.current = false;
      };

      recognition.onend = () => {
        if (shouldRestartRef.current) {
          // Session ended naturally (browser limit / silence) — restart seamlessly
          setTimeout(initSession, 150);
        } else {
          // Manual stop or silence timeout fired
          setIsListening(false);
          setInterimText('');
          clearTimeout(silenceTimerRef.current);
        }
      };

      try {
        recognition.start();
      } catch {
        setTimeout(initSession, 300);
      }
    };

    initSession();
  };

  const toggleVoice = () => {
    if (isListening) stopVoice();
    else startVoice();
  };

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

  const hasAudioAttachment = attachments.some(a => a.type?.startsWith('audio/') || a.name?.match(/\.(webm|wav|ogg|mp3|m4a)$/i));

  const handleSave = async () => {
    const hasText = content.trim() && content !== '<p><br></p>';
    if (!hasText && !hasAudioAttachment) return;

    const plainTextContent = content
      .replace(/<\/p><p>/g, '\n') // Preserve paragraph line breaks
      .replace(/<[^>]*>/g, '')    // Strip all HTML tags
      .trim();

    setIsSaving(true);
    try {
      await api.post('/notes', {
        contact_id: contactId,
        deal_id: dealId,
        tenant_id: tenantId,
        title: title?.trim() ? title.trim() : 'Untitled',
        content: plainTextContent,
        category: category || null,
        attachments
      });
      setTitle('');
      setContent('');
      setAttachments([]);
      if (setCategory) setCategory('');
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

      {/* Voice Transcribe */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={toggleVoice}
          title={isListening ? 'Stop voice transcription' : 'Transcribe voice to text'}
          style={{
            padding: '6px 8px', borderRadius: '4px', border: 'none',
            backgroundColor: isListening ? '#fee2e2' : 'transparent',
            color: isListening ? '#ef4444' : '#64748b',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', transition: 'all 0.15s ease', outline: 'none'
          }}
          onMouseOver={(e) => { if (!isListening) { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; } }}
          onMouseOut={(e) => { if (!isListening) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          {isListening && (
            <span style={{
              position: 'absolute', top: '2px', right: '2px',
              width: '7px', height: '7px', borderRadius: '50%',
              backgroundColor: '#ef4444', border: '1.5px solid #fff'
            }} />
          )}
        </button>
      </div>

      {/* Audio Record Button */}
      <style>{`@keyframes rec-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.5)} 50%{box-shadow:0 0 0 5px rgba(239,68,68,0)} }`}</style>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          type="button"
          onClick={toggleAudioRecording}
          disabled={isUploading}
          title={isRecording ? 'Stop recording & save audio' : 'Record audio note'}
          style={{
            padding: '6px 8px', borderRadius: '4px', border: 'none',
            backgroundColor: isRecording ? '#fef2f2' : 'transparent',
            color: isRecording ? '#ef4444' : '#64748b',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s ease', outline: 'none',
            animation: isRecording ? 'none' : 'none'
          }}
          onMouseOver={(e) => { if (!isRecording && !isUploading) { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; } }}
          onMouseOut={(e) => { if (!isRecording && !isUploading) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}
        >
          {isRecording ? (
            // Stop icon (square)
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          ) : (
            // Record icon (circle)
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
            </svg>
          )}
          {isRecording && (
            <span style={{
              position: 'absolute', top: '3px', right: '3px',
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: '#ef4444',
              animation: 'rec-pulse 1.2s ease-in-out infinite'
            }} />
          )}
        </button>
        {isRecording && (
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444', letterSpacing: '0.5px', minWidth: '34px' }}>
            {formatRecordTime(recordSeconds)}
          </span>
        )}
      </div>

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

      {isListening && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '6px 20px', backgroundColor: '#fff5f5',
          borderBottom: '1px solid #fee2e2'
        }}>
          <style>{`@keyframes voice-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }`}</style>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: '#ef4444', flexShrink: 0,
            animation: 'voice-pulse 1.2s ease-in-out infinite'
          }} />
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626' }}>Listening…</span>
          {interimText && (
            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {interimText}
            </span>
          )}
          <button
            type="button"
            onClick={toggleVoice}
            style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '700', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}
          >
            Stop
          </button>
        </div>
      )}

      {isRecording && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '6px 20px', backgroundColor: '#fff1f2',
          borderBottom: '1px solid #fecdd3'
        }}>
          <span style={{
            width: '10px', height: '10px', borderRadius: '50%',
            backgroundColor: '#ef4444', flexShrink: 0,
            animation: 'rec-pulse 1.2s ease-in-out infinite'
          }} />
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626' }}>Recording…</span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', letterSpacing: '1px' }}>
            {formatRecordTime(recordSeconds)}
          </span>
          <button
            type="button"
            onClick={stopAudioRecording}
            style={{ fontSize: '11px', fontWeight: '700', color: '#15803d', background: '#dcfce7', border: '1px solid #86efac', cursor: 'pointer', padding: '2px 10px', borderRadius: '4px' }}
          >
            ✓ Save
          </button>
          <button
            type="button"
            onClick={cancelAudioRecording}
            style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: '700', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}
          >
            Cancel
          </button>
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
              disabled={isSaving || isUploading || ((!content.trim() || content === '<p><br></p>') && !hasAudioAttachment)}
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
                opacity: (isSaving || isUploading || ((!content.trim() || content === '<p><br></p>') && !hasAudioAttachment)) ? 0.5 : 1,
                boxShadow: '0 2px 8px rgba(112,145,245,0.3)'
              }}
              onMouseOver={(e) => {
                if (!(isSaving || isUploading || ((!content.trim() || content === '<p><br></p>') && !hasAudioAttachment))) {
                  e.currentTarget.style.backgroundColor = '#5c7ee6';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(92,126,230,0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (!(isSaving || isUploading || ((!content.trim() || content === '<p><br></p>') && !hasAudioAttachment))) {
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
          {attachments.map((file, idx) => {
            const isAudio = file.type?.startsWith('audio/') || file.name?.match(/\.(webm|wav|ogg|mp3|m4a)$/i);
            if (isAudio && file.url) {
              return (
                <div key={idx} style={{
                  width: '100%',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  </svg>
                  <audio controls src={getFileUrl(file.url)} style={{ flex: 1, height: '32px', outline: 'none' }} />
                  <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{file.name}</span>
                  <button
                    onClick={() => removeAttachment(idx)}
                    style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', display: 'flex', flexShrink: 0 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            }
            return (
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
            );
          })}
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
