import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getFileUrl } from '../api/axiosConfig';
import { AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Home() {
    const [stats, setStats] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('all');
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [activityType, setActivityType] = useState('all');
    const [activitySearch, setActivitySearch] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/stats?timeFilter=${timeFilter}`);
                setStats(res.data);
            } catch (err) {
                console.error("Dashboard Stats Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [timeFilter]);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLogsLoading(true);
                const res = await api.get(`/logs?activity_type=${activityType}&search=${encodeURIComponent(activitySearch)}&page=1&limit=20&sortOrder=desc`);
                setActivityLogs(res.data?.data || []);
            } catch (err) {
                console.error("Dashboard Logs Fetch Error:", err);
            } finally {
                setLogsLoading(false);
            }
        };
        const timer = setTimeout(() => {
            fetchLogs();
        }, 300);
        return () => clearTimeout(timer);
    }, [activityType, activitySearch]);

    const isMobile = windowWidth < 768;
    const isTablet = windowWidth >= 768 && windowWidth < 1024;

    // Derived stats or mockup fallbacks to match visual precisely
    const totalRevenue = stats?.revenue ?? 10577;
    const activeDeals = stats?.activeDeals ?? 5;
    const newLeads = stats?.newLeads ?? 18;
    const totalContacts = stats?.totalContacts ?? 24;
    const openTasks = stats?.openTasks ?? 17;

    const averageDealValue = stats?.averageDealValue ?? 2115.4;
    const dealsWon = stats?.dealsWon ?? 5;

    // Custom curves matching sparklines of mockup
    const sparklineDataBlue = [
        { value: 12 }, { value: 10 }, { value: 14 }, { value: 11 }, { value: 15 }, { value: 13 }, { value: 16 }
    ];
    const sparklineDataGreen = [
        { value: 10 }, { value: 12 }, { value: 10 }, { value: 15 }, { value: 12 }, { value: 14 }, { value: 16 }
    ];
    const sparklineDataPurple = [
        { value: 15 }, { value: 13 }, { value: 17 }, { value: 14 }, { value: 16 }, { value: 13 }, { value: 15 }
    ];
    const sparklineDataOrange = [
        { value: 12 }, { value: 10 }, { value: 13 }, { value: 11 }, { value: 14 }, { value: 12 }, { value: 15 }
    ];
    const sparklineDataPink = [
        { value: 14 }, { value: 12 }, { value: 15 }, { value: 11 }, { value: 13 }, { value: 10 }, { value: 12 }
    ];

    const getStageColor = (name, index) => {
        const stage = name?.toLowerCase() || '';
        if (stage.includes('prospec') || stage.includes('lead')) return '#f59e0b'; // Lead - Orange
        if (stage.includes('qualif')) return '#3b82f6';  // Qualification - Blue
        if (stage.includes('propos')) return '#8b5cf6';  // Proposal - Purple
        if (stage.includes('negot')) return '#a855f7';  // Negotiation - Purple
        if (stage.includes('won') || stage.includes('close')) return '#10b981';   // Won/Closed - Green
        if (stage.includes('lost')) return '#ef4444';   // Lost - Red
        
        const fallbacks = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
        return fallbacks[index % fallbacks.length];
    };

    const hasDealDistribution = stats?.dealDistribution?.length > 0;
    const pieData = hasDealDistribution 
        ? stats.dealDistribution.map((item, index) => ({
            ...item,
            color: item.color || getStageColor(item.name, index)
          }))
        : [
            { name: 'Qualification', value: 18, color: '#3b82f6' },
            { name: 'Won', value: 36, color: '#10b981' },
            { name: 'Lead', value: 36, color: '#f59e0b' },
            { name: 'Proposal', value: 9, color: '#8b5cf6' }
          ];

    const formatActivityDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    const formatActivityTime = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // Group logs by Date (limit to latest 10 activities)
    const groupedActivities = activityLogs.slice(0, 10).reduce((acc, log) => {
        const dateStr = formatActivityDate(log.created_at || new Date());
        if (!acc[dateStr]) {
            acc[dateStr] = [];
        }
        acc[dateStr].push(log);
        return acc;
    }, {});

    const renderActivities = (Object.keys(groupedActivities).length > 0 || activitySearch || activityType !== 'all') 
        ? groupedActivities 
        : {
        "May 24, 2026": [
            {
                id: 1,
                activity_type: 'call',
                contact_name: 'Rahul Sharma',
                contact_id: 'mock-1',
                description: 'Outgoing call • 2m 15s',
                created_at: new Date('2026-05-24T11:35:00').toISOString()
            },
            {
                id: 2,
                activity_type: 'whatsapp',
                contact_name: 'Priya Mehta',
                contact_id: 'mock-2',
                description: 'Sent: Deal update and documents',
                created_at: new Date('2026-05-24T11:28:00').toISOString()
            },
            {
                id: 3,
                activity_type: 'note',
                author_name: 'Leetcode',
                contact_id: 'mock-3',
                description: 'Added note: Discussed automation',
                created_at: new Date('2026-05-24T11:20:00').toISOString()
            },
            {
                id: 4,
                activity_type: 'task',
                author_name: 'Leetcode',
                contact_id: 'mock-4',
                description: 'Updated task: Follow up on integration',
                created_at: new Date('2026-05-24T11:12:00').toISOString(),
                status: 'PENDING',
                priority: 'MEDIUM'
            },
            {
                id: 5,
                activity_type: 'email',
                contact_name: 'Arjun Verma',
                contact_id: 'mock-5',
                description: 'Re: Proposal for CRM implementation',
                created_at: new Date('2026-05-24T10:58:00').toISOString()
            },
            {
                id: 6,
                activity_type: 'sms',
                contact_name: 'Sneha Iyer',
                contact_id: 'mock-6',
                description: 'Sent SMS: Meeting confirmed for tomorrow',
                created_at: new Date('2026-05-24T10:45:00').toISOString()
            }
        ],
        "May 23, 2026": [
            {
                id: 7,
                activity_type: 'call',
                contact_name: 'Vikram Singh',
                contact_id: 'mock-7',
                description: 'Incoming call • 4m 32s',
                created_at: new Date('2026-05-23T16:30:00').toISOString()
            },
            {
                id: 8,
                activity_type: 'note',
                author_name: 'Leetcode',
                contact_id: 'mock-8',
                description: 'Added note: Client interested in advanced plan',
                created_at: new Date('2026-05-23T15:15:00').toISOString()
            },
            {
                id: 9,
                activity_type: 'email',
                contact_name: 'Neha Kapoor',
                contact_id: 'mock-9',
                description: 'Sent: Pricing details and terms',
                created_at: new Date('2026-05-23T13:05:00').toISOString()
            },
            {
                id: 10,
                activity_type: 'task',
                author_name: 'Leetcode',
                contact_id: 'mock-10',
                description: 'Created task: Prepare demo for new client',
                created_at: new Date('2026-05-23T12:40:00').toISOString(),
                status: 'PENDING',
                priority: 'HIGH'
            }
        ]
    };

    const getActivityStyles = (type) => {
        const normalType = (type || '').toLowerCase();
        if (normalType.includes('call')) {
            return {
                bg: '#eff6ff',
                color: '#2563eb',
                badgeBg: '#f0fdf4',
                badgeText: '#15803d',
                badgeLabel: 'CALL',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                )
            };
        }
        if (normalType.includes('whatsapp')) {
            return {
                bg: '#e8fbf0',
                color: '#25D366',
                badgeBg: '#e8fbf0',
                badgeText: '#128C7E',
                badgeLabel: 'WHATSAPP',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                )
            };
        }
        if (normalType.includes('deal')) {
            return {
                bg: '#eafaf1',
                color: '#10b981',
                badgeBg: '#eafaf1',
                badgeText: '#10b981',
                badgeLabel: 'DEAL',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="14" x="2" y="6" rx="2" />
                        <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                        <path d="M2 12h20" />
                    </svg>
                )
            };
        }
        if (normalType.includes('note')) {
            return {
                bg: '#fff7ed',
                color: '#f97316',
                badgeBg: '#fff7ed',
                badgeText: '#f97316',
                badgeLabel: 'NOTE',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                )
            };
        }
        if (normalType.includes('task')) {
            return {
                bg: '#eff6ff',
                color: '#3b82f6',
                badgeBg: '#eff6ff',
                badgeText: '#2563eb',
                badgeLabel: 'TASK',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                )
            };
        }
        if (normalType.includes('email') || normalType.includes('mail')) {
            return {
                bg: '#faf5ff',
                color: '#8b5cf6',
                badgeBg: '#faf5ff',
                badgeText: '#7c3aed',
                badgeLabel: 'EMAIL',
                icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                )
            };
        }
        return {
            bg: '#f0fdfa',
            color: '#0d9488',
            badgeBg: '#f0fdfa',
            badgeText: '#0d9488',
            badgeLabel: 'SMS',
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            )
        };
    };

    return (
        <div style={{ maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, sans-serif', padding: isMobile ? '16px' : '24px', paddingBottom: '60px', backgroundColor: '#fafbfc', minHeight: '100vh' }}>

            {/* Header section */}
            <div style={{ marginBottom: '32px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '16px' }}>
                <div>
                    <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: '800', color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Welcome back, {user?.name?.split(' ')[0] || 'leetcode'}! 👋
                    </div>
                    <div style={{ fontSize: '15px', color: '#64748b', fontWeight: '500' }}>
                        Here's what's happening with your CRM {
                            timeFilter === 'today' ? 'today' :
                            timeFilter === 'last7days' ? 'in the last 7 days' :
                            timeFilter === 'month' ? 'this month' :
                            'of all time'
                        }.
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderRadius: '12px', padding: '4px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                        {[
                            { value: 'today', label: 'Today' },
                            { value: 'last7days', label: 'Last 7 Days' },
                            { value: 'month', label: 'This Month' },
                            { value: 'all', label: 'All Time' }
                        ].map(option => (
                            <div
                                key={option.value}
                                onClick={() => setTimeFilter(option.value)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    backgroundColor: timeFilter === option.value ? '#f1f5f9' : 'transparent',
                                    color: timeFilter === option.value ? '#0f172a' : '#64748b',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                    <div style={{ border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#2563eb', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        May 2026
                    </div>
                </div>
            </div>

            {/* Top Cards Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)'),
                gap: '16px',
                marginBottom: '32px',
                width: '100%'
            }}>
                {/* Metric Card 1: Total Revenue */}
                <Link to="/deals" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <div className="hover-card" style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', flex: 1, cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                                    <polyline points="17 6 23 6 23 12"></polyline>
                                </svg>
                            </div>
                            <div>
                                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Total Revenue</div>
                                <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>₹{totalRevenue.toLocaleString('en-IN')}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
                            <div style={{ fontSize: '12px', fontWeight: '750', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><polyline points="18 15 12 9 6 15"></polyline></svg> 18.6%
                            </div>
                            <div style={{ width: '80px', height: '24px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={sparklineDataBlue}>
                                        <defs>
                                            <linearGradient id="gradient-blue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                                                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} fill="url(#gradient-blue)" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </Link>

                {/* Metric Card 2: Active Deals */}
                <Link to="/deals?status=open" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <div className="hover-card" style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', flex: 1, cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#eafaf1', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                    <rect width="20" height="14" x="2" y="6" rx="2" />
                                    <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                                    <path d="M2 12h20" />
                                </svg>
                            </div>
                            <div>
                                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Active Deals</div>
                                <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{activeDeals}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
                            <div style={{ fontSize: '12px', fontWeight: '750', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><polyline points="18 15 12 9 6 15"></polyline></svg> 12.4%
                            </div>
                            <div style={{ width: '80px', height: '24px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={sparklineDataGreen}>
                                        <defs>
                                            <linearGradient id="gradient-green" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                                                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#gradient-green)" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </Link>

                {/* Metric Card 3: New Leads */}
                <Link to="/contacts?status=lead" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <div className="hover-card" style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', flex: 1, cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#f5efff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <div>
                                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>New Leads</div>
                                <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{newLeads}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
                            <div style={{ fontSize: '12px', fontWeight: '750', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><polyline points="18 15 12 9 6 15"></polyline></svg> 18.7%
                            </div>
                            <div style={{ width: '80px', height: '24px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={sparklineDataPurple}>
                                        <defs>
                                            <linearGradient id="gradient-purple" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradient-purple)" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </Link>

                {/* Metric Card 4: Total Contacts */}
                <Link to="/contacts" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <div className="hover-card" style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', flex: 1, cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#ffeedb', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                            <div>
                                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Total Contacts</div>
                                <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{totalContacts}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
                            <div style={{ fontSize: '12px', fontWeight: '750', color: '#f97316', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><polyline points="18 15 12 9 6 15"></polyline></svg> 8.3%
                            </div>
                            <div style={{ width: '80px', height: '24px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={sparklineDataOrange}>
                                        <defs>
                                            <linearGradient id="gradient-orange" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#f97316" stopOpacity={0.2} />
                                                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} fill="url(#gradient-orange)" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </Link>

                {/* Metric Card 5: Open Tasks */}
                <Link to="/tasks?status=pending" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <div className="hover-card" style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', flex: 1, cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#ffeef2', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                                    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                </svg>
                            </div>
                            <div>
                                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Open Tasks</div>
                                <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{openTasks}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
                            <div style={{ fontSize: '12px', fontWeight: '750', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><polyline points="6 9 12 15 18 9"></polyline></svg> 6.5%
                            </div>
                            <div style={{ width: '80px', height: '24px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={sparklineDataPink}>
                                        <defs>
                                            <linearGradient id="gradient-pink" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2} />
                                                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="value" stroke="#f43f5e" strokeWidth={2} fill="url(#gradient-pink)" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Split layout: All Activities and Right-hand Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile || isTablet ? '1fr' : '1.8fr 1fr', gap: '24px', alignItems: 'start' }}>

                {/* Left Column: All Activities */}
                <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>All Activities</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            {/* Sleek Search Input */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', color: '#94a3b8' }}>
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                                </svg>
                                <input 
                                    type="text" 
                                    placeholder="Search activities..." 
                                    value={activitySearch} 
                                    onChange={(e) => setActivitySearch(e.target.value)} 
                                    style={{
                                        padding: '8px 12px 8px 36px',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '13px',
                                        outline: 'none',
                                        width: isMobile ? '130px' : '180px',
                                        fontFamily: 'inherit',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* Sleek Filter Dropdown */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none' }}>
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                                </svg>
                                <select 
                                    value={activityType} 
                                    onChange={(e) => setActivityType(e.target.value)} 
                                    style={{
                                        padding: '8px 32px 8px 36px',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '13px',
                                        outline: 'none',
                                        backgroundColor: '#fff',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        appearance: 'none'
                                    }}
                                >
                                    <option value="all">All Activities</option>
                                    <option value="call">Call</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="email">Email</option>
                                    <option value="note">Note</option>
                                    <option value="task">Task</option>
                                    <option value="sms">SMS</option>
                                    <option value="meeting">Meeting</option>
                                    <option value="linkedin">LinkedIn</option>
                                    <option value="deals">Deals</option>
                                </select>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ position: 'absolute', right: '12px', color: '#94a3b8', pointerEvents: 'none' }}>
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {Object.keys(renderActivities).map((dateKey, dateIdx) => (
                            <div key={dateKey} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#64748b' }}>
                                        {dateKey}
                                    </span>
                                    {dateIdx === 0 && (
                                        <span 
                                            onClick={() => navigate('/contacts')} 
                                            style={{ fontSize: '12.5px', fontWeight: '750', color: '#2563eb', cursor: 'pointer', transition: 'color 0.2s' }}
                                            onMouseEnter={(e) => e.target.style.color = '#1d4ed8'}
                                            onMouseLeave={(e) => e.target.style.color = '#2563eb'}
                                        >
                                            View All
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                    {renderActivities[dateKey].map((log, idx, arr) => {
                                        const styles = getActivityStyles(log.activity_type);
                                        const showAuthor = ['note', 'task'].includes((log.activity_type || '').toLowerCase());
                                        const mainName = showAuthor ? (log.author_name || 'Leetcode') : (log.contact_name || 'Rahul Sharma');

                                        return (
                                            <div 
                                                key={log.id} 
                                                style={{ 
                                                    display: 'flex', 
                                                    gap: '14px', 
                                                    alignItems: 'flex-start', 
                                                    justifyContent: 'space-between', 
                                                    padding: '16px 0',
                                                    borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #f1f5f9'
                                                }}
                                            >
                                                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: styles.bg, color: styles.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        {styles.icon}
                                                    </div>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                            {log.contact_id ? (
                                                                <Link 
                                                                    to={`/contacts/${log.contact_id}`}
                                                                    style={{ 
                                                                        fontSize: '14.5px', 
                                                                        fontWeight: '750', 
                                                                        color: '#0f172a', 
                                                                        textDecoration: 'none',
                                                                        transition: 'color 0.2s'
                                                                    }}
                                                                    onMouseEnter={(e) => e.target.style.color = '#2563eb'}
                                                                    onMouseLeave={(e) => e.target.style.color = '#0f172a'}
                                                                >
                                                                    {mainName}
                                                                </Link>
                                                            ) : (
                                                                <span style={{ fontSize: '14.5px', fontWeight: '750', color: '#0f172a' }}>{mainName}</span>
                                                            )}
                                                            <span style={{
                                                                fontSize: '10px',
                                                                fontWeight: '800',
                                                                backgroundColor: styles.badgeBg,
                                                                color: styles.badgeText,
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                letterSpacing: '0.02em'
                                                            }}>{styles.badgeLabel}</span>
                                                        </div>
                                                        <div style={{ fontSize: '13.5px', color: '#475569', fontWeight: '500', marginTop: '4px', lineHeight: '1.4' }}>
                                                            {log.description}
                                                        </div>
                                                        {/* Task Badges in Mockup: PENDING / MEDIUM / HIGH */}
                                                        {log.activity_type === 'task' && (
                                                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                                <span style={{ fontSize: '10px', fontWeight: '800', border: '1px solid #f97316', color: '#f97316', backgroundColor: '#fff7ed', padding: '3px 8px', borderRadius: '4px' }}>
                                                                    {log.status || 'PENDING'}
                                                                </span>
                                                                <span style={{
                                                                    fontSize: '10px',
                                                                    fontWeight: '800',
                                                                    border: log.priority === 'HIGH' ? '1px solid #ef4444' : '1px solid #f97316',
                                                                    color: log.priority === 'HIGH' ? '#ef4444' : '#f97316',
                                                                    backgroundColor: log.priority === 'HIGH' ? '#fef2f2' : '#fff7ed',
                                                                    padding: '3px 8px',
                                                                    borderRadius: '4px'
                                                                }}>
                                                                    {log.priority === 'HIGH' ? 'HIGH PRIORITY' : 'MEDIUM PRIORITY'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap', paddingTop: '2px' }}>
                                                    {formatActivityTime(log.created_at)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {Object.keys(renderActivities).length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '14px', fontWeight: '500' }}>
                                No activities found matching your criteria.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Secondary Metrics & Distribution */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Card 1: Average Deal Value */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#eafaf1', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                        </div>
                        <div>
                            <div style={{ fontSize: '13.5px', color: '#64748b', fontWeight: '600' }}>Average Deal Value</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '4px 0 2px' }}>₹{averageDealValue.toLocaleString('en-IN')}</div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><polyline points="18 15 12 9 6 15"></polyline></svg> 12.4% <span style={{ color: '#64748b', fontWeight: '500' }}>vs last period</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Deals Won */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f3efff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34M12 2a4 4 0 0 0-4 4v5c0 1.5 2 2.5 4 2.5s4-1 4-2.5V6a4 4 0 0 0-4-4Z" />
                            </svg>
                        </div>
                        <div>
                            <div style={{ fontSize: '13.5px', color: '#64748b', fontWeight: '600' }}>Deals Won</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '4px 0 2px' }}>{dealsWon}</div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><polyline points="18 15 12 9 6 15"></polyline></svg> 18.7% <span style={{ color: '#64748b', fontWeight: '500' }}>vs last period</span>
                            </div>
                        </div>
                    </div>

                    {/* Deal Distribution Doughnut Chart */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>Deal Distribution</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                            <div style={{ width: '130px', height: '130px', position: 'relative', flexShrink: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            innerRadius={45}
                                            outerRadius={65}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color || '#e2e8f0'} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '12px', fontWeight: '700', color: '#64748b', letterSpacing: '0.02em' }}>Stage</div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {pieData.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                                            <span style={{ color: '#475569', fontWeight: '600' }}>{item.name}</span>
                                        </div>
                                        <div style={{ fontWeight: '800', color: '#0f172a' }}>{item.value}%</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
