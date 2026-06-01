import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api, { getFileUrl } from '../api/axiosConfig';
import { toast } from 'react-hot-toast';

export default function UserAnalytics() {
  const [searchParams] = useSearchParams();
  const userIdParam = searchParams.get('userId');

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const today = new Date();
  const past7Days = new Date();
  past7Days.setDate(today.getDate() - 6);
  const defaultFrom = past7Days.toISOString().split('T')[0];
  const defaultTo = today.toISOString().split('T')[0];

  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;
  const isTenantAdmin = loggedInUser?.user_type === 'tenant_admin';
  const isTenantUser = loggedInUser?.user_type === 'tenant_user';
  const canSelectUser = isGlobalAdmin || isTenantAdmin;

  const [usersList, setUsersList] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(() => {
    if (userIdParam) return userIdParam;
    return canSelectUser ? '' : (loggedInUser?.id || '');
  });
  const [selectedUser, setSelectedUser] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  const [showDatePopover, setShowDatePopover] = useState(false);
  const [tempFromDate, setTempFromDate] = useState(defaultFrom);
  const [tempToDate, setTempToDate] = useState(defaultTo);
  const popoverRef = React.useRef(null);

  // Click outside to close Date Range Popover
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowDatePopover(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);



  const applyCustomRange = () => {
    if (tempFromDate && tempToDate) {
      const fDate = new Date(tempFromDate);
      const tDate = new Date(tempToDate);
      if (fDate > tDate) {
        toast.error('From date cannot be greater than To date');
        return;
      }
    }
    setFromDate(tempFromDate);
    setToDate(tempToDate);
    setShowDatePopover(false);
  };

  const formatDateRangeLabel = () => {
    if (!fromDate && !toDate) return 'All Time';
    const opt = { month: 'short', day: 'numeric', year: 'numeric' };
    const fStr = fromDate ? new Date(fromDate).toLocaleDateString('en-US', opt) : 'Beginning';
    const tStr = toDate ? new Date(toDate).toLocaleDateString('en-US', opt) : 'Present';
    return `${fStr} - ${tStr}`;
  };

  const handleReset = () => {
    setSelectedUserId(userIdParam || (canSelectUser ? '' : (loggedInUser?.id || '')));
    setSearchQuery('');
    setActivityTypeFilter('all');
    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setTempFromDate(defaultFrom);
    setTempToDate(defaultTo);
    setPage(1);
  };

  // Load all users to populate the "Select User" dropdown
  useEffect(() => {
    api.get('/users?limit=100')
      .then(res => {
        const list = res.data.data || [];
        setUsersList(list);
      })
      .catch(console.error);
  }, []);

  // Sync selected user details
  useEffect(() => {
    if (selectedUserId && usersList.length > 0) {
      const match = usersList.find(u => String(u.id) === String(selectedUserId));
      if (match) {
        setSelectedUser(match);
      }
    } else {
      setSelectedUser(null);
    }
  }, [selectedUserId, usersList]);

  const [metrics, setMetrics] = useState({
    users: { count: '0', rate: '0%', label: '' },
    contacts: { count: '0', rate: '0%', label: '' },
    calls: { count: '0', rate: '0%', label: '', outgoing: '-', incoming: '-' },
    whatsapp: { count: '0', rate: '0%', label: '', sent: '-', received: '-' },
    emails: { count: '0', rate: '0%', label: '', sent: '-', received: '-' },
    notes: { count: '0', rate: '0%', label: '' },
    tasks: { count: '0', rate: '0%', label: '', pending: '-', completed: '-' }
  });
  const [activities, setActivities] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const params = { page, limit };
        if (selectedUserId) {
          params.user_id = selectedUserId;
        }
        if (fromDate) {
          params.from_date = fromDate;
        }
        if (toDate) {
          params.to_date = toDate;
        }
        if (searchQuery) {
          params.search = searchQuery;
        }
        if (activityTypeFilter && activityTypeFilter !== 'all') {
          params.activity_type = activityTypeFilter;
        }
        const res = await api.get('/users/activities', { params });
        const data = res.data;
        
        const a = data.analytics || {};
        setMetrics({
          users: { 
            count: String(a.total_users || usersList.length || '0'), 
            rate: a.users_rate?.rate || '-', 
            label: a.users_rate?.label || '',
            isUp: a.users_rate?.isUp ?? true
          },
          contacts: { 
            count: String(a.contacts_count || '0'), 
            rate: a.contacts_rate?.rate || '-', 
            label: a.contacts_rate?.label || '',
            isUp: a.contacts_rate?.isUp ?? true
          },
          calls: { 
            count: String(a.calls || '0'), 
            rate: a.calls_rate?.rate || '-', 
            label: a.calls_rate?.label || '',
            isUp: a.calls_rate?.isUp ?? true,
            outgoing: String(a.outgoing_calls || '0'), 
            incoming: String(a.incoming_calls || '0') 
          },
          whatsapp: { 
            count: String(a.whatsapp || '0'), 
            rate: a.whatsapp_rate?.rate || '-', 
            label: a.whatsapp_rate?.label || '',
            isUp: a.whatsapp_rate?.isUp ?? true,
            sent: '-', 
            received: '-' 
          },
          emails: { 
            count: String(a.emails || '0'), 
            rate: a.emails_rate?.rate || '-', 
            label: a.emails_rate?.label || '',
            isUp: a.emails_rate?.isUp ?? true,
            sent: '-', 
            received: '-' 
          },
          notes: { 
            count: String(a.notes_created || '0'), 
            rate: a.notes_rate?.rate || '-', 
            label: a.notes_rate?.label || '',
            isUp: a.notes_rate?.isUp ?? true
          },
          tasks: { 
            count: String(a.tasks_created || '0'), 
            rate: a.tasks_rate?.rate || '-', 
            label: a.tasks_rate?.label || '',
            isUp: a.tasks_rate?.isUp ?? true,
            pending: String(a.pending_tasks || '0'), 
            completed: String(a.completed_tasks || '0') 
          }
        });

        const mappedActivities = (data.data || []).map(item => {
           let type = item.activity_type || 'Activity';
           if (type.toLowerCase() === 'call' && item.call_type) {
               type = `Call (${item.call_type})`;
           }
           let badge = item.call_type || 'Log';
           let badgeColor = '#f1f5f9';
           let badgeTextColor = '#475569';
           let iconSvg = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/></svg>;
           
           const lType = (item.activity_type || '').toLowerCase();
           if (lType === 'call') {
               badge = item.call_type || 'Call';
               if (badge.toLowerCase() === 'outgoing') {
                   badgeColor = '#e2f0d9';
                   badgeTextColor = '#385723';
               } else if (badge.toLowerCase() === 'incoming') {
                   badgeColor = '#eff6ff';
                   badgeTextColor = '#2563eb';
               } else if (badge.toLowerCase() === 'missed') {
                   badgeColor = '#fee2e2';
                   badgeTextColor = '#dc2626';
               } else {
                   badgeColor = '#e2f0d9';
                   badgeTextColor = '#385723';
               }
               iconSvg = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
           } else if (lType.includes('contact')) {
               badge = 'Contact';
               badgeColor = '#faf5ff';
               badgeTextColor = '#8b5cf6';
               iconSvg = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
            } else if (lType.includes('whatsapp')) {
                badge = 'WhatsApp';
                badgeColor = '#e7fbf0';
                badgeTextColor = '#075e54';
                iconSvg = <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.634 3.971 14.16 2.946 11.535 2.945c-5.445 0-9.87 4.37-9.873 9.8.001 2.128.563 4.2 1.629 6.005L2.28 21.8l3.147-.815zM17.486 14.41c-.323-.161-1.913-.938-2.21-1.046-.297-.109-.514-.162-.73.161-.216.324-.838 1.046-1.027 1.262-.19.217-.378.244-.7.082-.323-.162-1.365-.498-2.601-1.59-1.037-.915-1.607-2.045-1.81-2.394-.202-.349-.022-.538.15-.71.155-.154.343-.399.515-.599.172-.2.23-.343.344-.571.114-.228.057-.428-.028-.59-.086-.162-.73-1.742-.999-2.39-.263-.627-.528-.542-.722-.551-.186-.01-.399-.011-.612-.011-.213 0-.559.08-.85.399-.29.32-1.11 1.077-1.11 2.628 0 1.551 1.139 3.05 1.29 3.255.152.204 2.24 3.396 5.427 4.754.758.323 1.349.515 1.81.659.76.24 1.452.207 2.001.126.611-.09 1.912-.775 2.18-1.521.267-.746.267-1.387.186-1.52-.08-.135-.297-.216-.62-.378z"/></svg>;
            } else if (lType.includes('note')) {
                badge = 'Note';
                badgeColor = '#fff7ed';
                badgeTextColor = '#ea580c';
                iconSvg = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
            } else if (lType.includes('task')) {
                badge = 'Task';
                badgeColor = '#eff6ff';
                badgeTextColor = '#2563eb';
                iconSvg = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
            } else if (lType.includes('email') || lType.includes('mail')) {
                badge = 'Email';
                badgeColor = '#eff6ff';
                badgeTextColor = '#2563eb';
                iconSvg = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
            } else if (lType.includes('deal')) {
                badge = 'Deal';
                badgeColor = '#ecfdf5';
                badgeTextColor = '#047857';
                iconSvg = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
            }

           const date = new Date(item.created_at);
           const formattedTime = isNaN(date) ? '' : date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

           let contactName = item.contact_name || item.contact_no || (item.contact_id ? 'Contact ' + item.contact_id.substring(0, 4) : 'Unknown');

           let contactBadge = contactName.substring(0, 2).toUpperCase();
           if (contactName.startsWith('Contact')) contactBadge = 'C';

           return {
             id: item.id,
             type: type,
             badge: badge,
             badgeColor: badgeColor,
             badgeTextColor: badgeTextColor,
             icon: (
               <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: badgeTextColor, flexShrink: 0 }}>
                 {iconSvg}
               </div>
             ),
             contactName: contactName,
             contactBadge: contactBadge,
             contactColor: '#eff6ff',
             contactTextColor: '#2563eb',
             contactId: item.contact_id,
             details: item.description || item.title || '-',
             attachments: item.attachments || null,
             time: formattedTime,
             duration: item.call_duration !== null && item.call_duration !== undefined ? `${item.call_duration}s` : '-',
             userName: item.user?.name || 'Unknown User'
           };
        });

        setActivities(mappedActivities);
        setTotalCount(data.totalCount || 0);
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchActivities();
   }, [selectedUserId, page, limit, fromDate, toDate, searchQuery, usersList.length, activityTypeFilter]);

  return (
    <div style={{ padding: '0 0 32px 0', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. Header Toolbar */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </span>
          <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
            CRM Users Analytics
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={handleReset}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 24px' }}>
        
        {/* 2. Filters Row */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '16px',
          alignItems: 'stretch',
          marginBottom: '24px',
          width: '100%'
        }}>
          {/* User selector - hidden for tenant_user */}
          {!isTenantUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: isMobile ? '1' : '2', minWidth: '220px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', fontFamily: 'Inter, sans-serif' }}>Select User</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={!canSelectUser}
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '10px 36px 10px 44px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1f2937',
                  backgroundColor: canSelectUser ? '#ffffff' : '#f1f5f9',
                  outline: 'none',
                  cursor: canSelectUser ? 'pointer' : 'not-allowed',
                  appearance: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                <option value="">All Users</option>
                {usersList.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <div style={{
                position: 'absolute',
                left: '12px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: '700',
                pointerEvents: 'none',
                fontFamily: 'Inter, sans-serif'
              }}>
                {selectedUser ? (selectedUser.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'ALL'}
              </div>
              <div style={{ position: 'absolute', right: '12px', pointerEvents: 'none', display: 'flex', color: '#9ca3af' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
          </div>
          )}

          {/* Date Selector Popover */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: isMobile ? '1' : '1', maxWidth: isMobile ? '100%' : '33.33%', minWidth: '220px', position: 'relative' }} ref={popoverRef}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', fontFamily: 'Inter, sans-serif' }}>Date Range</span>
            <button
              type="button"
              onClick={() => setShowDatePopover(!showDatePopover)}
              style={{
                width: '100%',
                height: '44px',
                padding: '10px 36px 10px 44px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937',
                backgroundColor: '#ffffff',
                outline: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                textAlign: 'left',
                position: 'relative',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              <div style={{ position: 'absolute', left: '14px', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              </div>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formatDateRangeLabel()}
              </span>
              <div style={{ position: 'absolute', right: '12px', display: 'flex', color: '#9ca3af' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </button>

            {/* DATE RANGE POPUP OVERLAY */}
            {showDatePopover && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                zIndex: 999,
                width: '320px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                fontFamily: 'Inter, sans-serif'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '750', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Date Range</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>From Date</span>
                      <input
                        type="date"
                        value={tempFromDate}
                        max={tempToDate}
                        onChange={(e) => setTempFromDate(e.target.value)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '13.5px',
                          outline: 'none',
                          color: '#1f2937',
                          fontWeight: '600',
                          backgroundColor: '#f8fafc',
                          transition: 'border-color 0.2s',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>To Date</span>
                      <input
                        type="date"
                        value={tempToDate}
                        min={tempFromDate}
                        onChange={(e) => setTempToDate(e.target.value)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '13.5px',
                          outline: 'none',
                          color: '#1f2937',
                          fontWeight: '600',
                          backgroundColor: '#f8fafc',
                          transition: 'border-color 0.2s',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      type="button"
                      onClick={() => setShowDatePopover(false)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#fff',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        color: '#64748b',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={applyCustomRange}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#2563eb',
                        color: '#fff',
                        fontSize: '12.5px',
                        fontWeight: '750',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Analytics Grid (Row 1) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(auto-fit, minmax(220px, 1fr))' : (isTenantUser || selectedUserId ? 'repeat(4, 1fr)' : 'repeat(5, 1fr)'),
          gap: '16px',
          marginBottom: '16px'
        }}>
          {/* Card 1: Users - hidden for tenant_user or when viewing an individual user */}
          {!isTenantUser && !selectedUserId && (
          <div className="crm-card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
              </div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Users</span>
            </div>
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-1px' }}>{metrics.users.count}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.7 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                {formatDateRangeLabel()}
              </span>
            </div>
          </div>
          )}

          {/* Card 2: Contacts */}
          <div className="crm-card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Contacts</span>
            </div>
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-1px' }}>{Number(metrics.contacts.count).toLocaleString()}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.7 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                {formatDateRangeLabel()}
              </span>
            </div>
          </div>

          {/* Card 3: Calls */}
          <div className="crm-card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Calls</span>
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-1px' }}>{Number(metrics.calls.count).toLocaleString()}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.7 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  {formatDateRangeLabel()}
                </span>
              </div>
            </div>
            
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Outgoing</span>
                <span style={{ color: '#16a34a', fontWeight: '750' }}>{metrics.calls.outgoing}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Incoming</span>
                <span style={{ color: '#2563eb', fontWeight: '750' }}>{metrics.calls.incoming}</span>
              </div>
            </div>
          </div>

          {/* Card 4: WhatsApp */}
          <div className="crm-card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(37, 211, 102, 0.1)', color: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.634 3.971 14.16 2.946 11.535 2.945c-5.445 0-9.87 4.37-9.873 9.8.001 2.128.563 4.2 1.629 6.005L2.28 21.8l3.147-.815zM17.486 14.41c-.323-.161-1.913-.938-2.21-1.046-.297-.109-.514-.162-.73.161-.216.324-.838 1.046-1.027 1.262-.19.217-.378.244-.7.082-.323-.162-1.365-.498-2.601-1.59-1.037-.915-1.607-2.045-1.81-2.394-.202-.349-.022-.538.15-.71.155-.154.343-.399.515-.599.172-.2.23-.343.344-.571.114-.228.057-.428-.028-.59-.086-.162-.73-1.742-.999-2.39-.263-.627-.528-.542-.722-.551-.186-.01-.399-.011-.612-.011-.213 0-.559.08-.85.399-.29.32-1.11 1.077-1.11 2.628 0 1.551 1.139 3.05 1.29 3.255.152.204 2.24 3.396 5.427 4.754.758.323 1.349.515 1.81.659.76.24 1.452.207 2.001.126.611-.09 1.912-.775 2.18-1.521.267-.746.267-1.387.186-1.52-.08-.135-.297-.216-.62-.378z" /></svg>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>WhatsApp</span>
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-1px' }}>{Number(metrics.whatsapp.count).toLocaleString()}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.7 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  {formatDateRangeLabel()}
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Sent</span>
                <span style={{ color: '#16a34a', fontWeight: '750' }}>{metrics.whatsapp.count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Received</span>
                <span style={{ color: '#2563eb', fontWeight: '750' }}>0</span>
              </div>
            </div>
          </div>

          {/* Card 5: Emails */}
          <div className="crm-card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                </div>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Emails</span>
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-1px' }}>{Number(metrics.emails.count).toLocaleString()}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.7 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  {formatDateRangeLabel()}
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Sent</span>
                <span style={{ color: '#16a34a', fontWeight: '750' }}>{metrics.emails.count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Received</span>
                <span style={{ color: '#2563eb', fontWeight: '750' }}>0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Grid (Row 2) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(auto-fit, minmax(220px, 1fr))' : 'repeat(5, 1fr)',
          gap: '16px',
          marginBottom: '28px'
        }}>
          {/* Card 6: Notes */}
          <div className="crm-card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(249, 115, 22, 0.1)', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              </div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Notes</span>
            </div>
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-1px' }}>{Number(metrics.notes.count).toLocaleString()}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.7 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                {formatDateRangeLabel()}
              </span>
            </div>
          </div>

          {/* Card 7: Tasks */}
          <div className="crm-card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', flex: 1 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><polyline points="9 14 11 16 15 12" /></svg>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Tasks</span>
                </div>
                <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-1px' }}>{Number(metrics.tasks.count).toLocaleString()}</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.7 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  {formatDateRangeLabel()}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '110px', borderLeft: '1px solid #f1f5f9', paddingLeft: '16px', marginLeft: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Pending</span>
                <span style={{ color: '#ea580c', fontWeight: '750', fontSize: '14px' }}>{metrics.tasks.pending}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Completed</span>
                <span style={{ color: '#16a34a', fontWeight: '750', fontSize: '14px' }}>{metrics.tasks.completed}</span>
              </div>
            </div>
          </div>

          {/* Flex placeholders to maintain 5-column layout alignment on desktop */}
          {!isMobile && (
            <>
              <div style={{ gridColumn: 'span 1' }} />
              <div style={{ gridColumn: 'span 1' }} />
              <div style={{ gridColumn: 'span 1' }} />
            </>
          )}
        </div>
        
        {/* Horizontal Partition Line */}
        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '32px 0 24px 0' }} />

        {/* 4. Activities Section Header (Placed Outside) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
            All Activities
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </span>
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px 8px 30px',
                  fontSize: '12.5px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  outline: 'none',
                  width: '200px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                }}
              />
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: 'absolute', left: '10px', color: '#94a3b8', pointerEvents: 'none' }}>
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <select
                value={activityTypeFilter}
                onChange={(e) => { setActivityTypeFilter(e.target.value); setPage(1); }}
                style={{
                  padding: '8px 24px 8px 30px',
                  fontSize: '12.5px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: '600',
                  appearance: 'none',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  minWidth: '130px',
                  fontFamily: 'inherit'
                }}
              >
                <option value="all">All</option>
                <option value="call">Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="note">Note</option>
                <option value="task">Task</option>
                <option value="sms">SMS</option>
                <option value="meeting">Meeting</option>
                <option value="linkedin">LinkedIn</option>
                <option value="deal">Deal</option>
              </select>
              <div style={{ position: 'absolute', right: '8px', pointerEvents: 'none', display: 'flex', color: '#9ca3af' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Activities Table Card Container */}
        <div className="crm-card" style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}>
          {/* Activities Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '750', color: '#64748b', textTransform: 'uppercase' }}>Activity</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '750', color: '#64748b', textTransform: 'uppercase' }}>User</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '750', color: '#64748b', textTransform: 'uppercase' }}>Contact</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '750', color: '#64748b', textTransform: 'uppercase' }}>Details</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '750', color: '#64748b', textTransform: 'uppercase' }}>Time</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '750', color: '#64748b', textTransform: 'uppercase' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {activities
                  .map((act) => (
                    <tr key={act.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.12s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      {/* Activity Name */}
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {act.icon}
                          <span style={{ fontWeight: '700' }}>{act.type}</span>
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: '850',
                            textTransform: 'uppercase',
                            backgroundColor: act.badgeColor,
                            color: act.badgeTextColor,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            letterSpacing: '0.3px'
                          }}>
                            {act.badge}
                          </span>
                        </div>
                      </td>

                      {/* User */}
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                        {act.userName}
                      </td>

                      {/* Contact Badge */}
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#0f172a' }}>
                        {act.contactId ? (
                          <Link to={`/contacts/${act.contactId}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', cursor: 'pointer' }}>
                            <div style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: act.contactColor,
                              color: act.contactTextColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: '750'
                            }}>
                              {act.contactBadge}
                            </div>
                            <span style={{ fontWeight: '650', color: '#334155' }}>{act.contactName}</span>
                          </Link>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: '750'
                            }}>
                              -
                            </div>
                            <span style={{ fontWeight: '500', color: '#94a3b8' }}>-</span>
                          </div>
                        )}
                      </td>

                      {/* Details */}
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#475569', fontWeight: '500', maxWidth: '320px' }}>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                           <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.details}</span>
                           {act.attachments && act.attachments.length > 0 && (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                               {act.attachments.map((file, idx) => {
                                 const isAudio = file.type?.startsWith('audio/') || file.name?.match(/\.(webm|wav|ogg|mp3|m4a)$/i);
                                 if (isAudio && file.url) {
                                   return (
                                     <div key={idx} style={{
                                       display: 'flex', alignItems: 'center', gap: '6px',
                                       padding: '5px 8px', backgroundColor: '#fff1f2',
                                       border: '1px solid #fecdd3', borderRadius: '8px'
                                     }}>
                                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                         <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                         <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                       </svg>
                                       <audio controls src={getFileUrl(file.url)} style={{ flex: 1, height: '26px', minWidth: 0, outline: 'none' }} preload="metadata" />
                                     </div>
                                   );
                                 }
                                 return (
                                   <a key={idx} href={getFileUrl(file.url)} download target="_blank" rel="noopener noreferrer"
                                     style={{
                                       display: 'inline-flex', alignItems: 'center', gap: '4px',
                                       padding: '2px 8px', backgroundColor: '#fff',
                                       borderRadius: '4px', textDecoration: 'none',
                                       color: '#2563eb', fontSize: '11px', fontWeight: '700',
                                       border: '1px solid #dbeafe'
                                     }}
                                   >
                                     📎 {file.name}
                                   </a>
                                 );
                               })}
                             </div>
                           )}
                         </div>
                       </td>

                      {/* Time */}
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                        {act.time}
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
                        {act.duration}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={{
            padding: '16px 24px',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #f1f5f9'
          }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
              Showing {Math.min((page - 1) * limit + 1, totalCount || 0)} to {Math.min(page * limit, totalCount || 0)} of {totalCount || 0} activities
            </span>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button disabled={page === 1} onClick={() => setPage(page - 1)} style={{ border: 'none', background: 'none', color: page === 1 ? '#cbd5e1' : '#64748b', cursor: page === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', padding: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              
              <button style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', backgroundColor: '#e2f0d9', color: '#385723', fontWeight: '750', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {page}
              </button>
              
              <button disabled={page * limit >= totalCount} onClick={() => setPage(page + 1)} style={{ border: 'none', background: 'none', color: page * limit >= totalCount ? '#cbd5e1' : '#64748b', cursor: page * limit >= totalCount ? 'default' : 'pointer', display: 'flex', alignItems: 'center', padding: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
