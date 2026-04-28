import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/stats?timeFilter=${timeFilter}`);
        setStats(res.data);
      } catch (err) {
        console.error("Fetch Stats Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [timeFilter]);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const SkeletonCard = ({ height = '100%', width = '100%' }) => (
    <div className="skeleton" style={{ height, width, borderRadius: '16px' }} />
  );

  if (loading) {
    return (
      <div style={{ maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, sans-serif', padding: isMobile ? '16px' : '24px', paddingBottom: '60px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: '12px' }}>
          <div style={{ width: '200px' }}>
            <div className="skeleton" style={{ height: '14px', width: '100px', marginBottom: '8px' }} />
            <div className="skeleton" style={{ height: '32px', width: '200px' }} />
          </div>
          <div className="skeleton" style={{ height: '36px', width: '140px', borderRadius: '20px' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div className="skeleton" style={{ height: '180px', borderRadius: '16px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="skeleton" style={{ height: '78px', borderRadius: '16px' }} />
            <div className="skeleton" style={{ height: '78px', borderRadius: '16px' }} />
          </div>
          <div className="skeleton" style={{ height: '180px', borderRadius: '16px' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile || isTablet ? '1fr' : '2fr 1fr', gap: '24px' }}>
          <div className="skeleton" style={{ height: '400px', borderRadius: '16px' }} />
          <div className="skeleton" style={{ height: '400px', borderRadius: '16px' }} />
        </div>
      </div>
    );
  }

  const PIE_COLORS = ['#10b981', '#6ee7b7', '#fecdd3', '#fca5a5'];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, sans-serif', padding: isMobile ? '16px' : '24px', paddingBottom: '60px' }}>
      
      <div style={{ marginBottom: '24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: '12px' }}>
          <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500', marginBottom: '4px' }}>Overview</div>
              <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: '800', color: '#1e293b' }}>Dashboard Reports</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', padding: '4px', border: '1px solid #e2e8f0' }}>
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
                              padding: '6px 16px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              backgroundColor: timeFilter === option.value ? '#fff' : 'transparent',
                              color: timeFilter === option.value ? '#0f172a' : '#64748b',
                              boxShadow: timeFilter === option.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                              transition: 'all 0.2s ease'
                          }}
                      >
                          {option.label}
                      </div>
                  ))}
              </div>
              <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
              </div>
          </div>
      </div>

      {/* Top Cards Row: Revenue, Active Deals, New Leads */}
      <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : (stats?.showRevenue ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr 1fr'), 
          gap: '24px', 
          marginBottom: '24px' 
      }}>
          {/* Revenue Card - Only show for privileged users */}
          {stats?.showRevenue && (
            <div style={{ backgroundColor: 'var(--success)', borderRadius: '16px', padding: '24px', color: '#fff', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.1, transform: 'rotate(-15deg)' }}>
                    <svg width="150" height="150" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h2.73c.12.91.95 1.39 1.95 1.39 1.25 0 1.91-.68 1.91-1.54 0-2.31-4.88-1.25-4.88-4.63 0-1.58 1.05-2.67 2.23-3.04V4h2.67v1.89c1.55.3 2.76 1.32 2.94 3.02h-2.64c-.16-.83-.8-1.33-1.85-1.33-1.12 0-1.75.64-1.75 1.48 0 2.2 4.88 1.15 4.88 4.6 0 1.83-1.26 2.87-2.35 3.16z"/></svg>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', opacity: 0.9, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ padding: '6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        Total Revenue
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: isMobile ? '32px' : '42px', fontWeight: '800', letterSpacing: '-1px' }}>${(stats?.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                        Growth
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', marginLeft: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#fff', marginLeft: '-10px', border: '2px solid var(--success)', backgroundImage: 'url(https://i.pravatar.cc/100?img=1)', backgroundSize: 'cover' }}></div>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#fff', marginLeft: '-10px', border: '2px solid var(--success)', backgroundImage: 'url(https://i.pravatar.cc/100?img=2)', backgroundSize: 'cover' }}></div>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#166534', marginLeft: '-10px', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>+4</div>
                    </div>
                </div>
            </div>
          )}

          {/* Micro Cards */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '24px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: isMobile ? '16px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1, border: '1px solid #f1f5f9' }}>
                <div>
                    <div style={{ fontSize: isMobile ? '12px' : '14px', color: '#64748b', fontWeight: '600', marginBottom: '8px' }}>Active Deals</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: '800', color: '#1e293b' }}>{stats?.activeDeals || 0}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#10b981', fontSize: '12px', fontWeight: '600' }}>
                           <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                           High
                        </div>
                    </div>
                </div>
                <div style={{ backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '16px', color: '#10b981' }}>
                    <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
            </div>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: isMobile ? '16px' : '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1, border: '1px solid #f1f5f9' }}>
                <div>
                    <div style={{ fontSize: isMobile ? '12px' : '14px', color: '#64748b', fontWeight: '600', marginBottom: '8px' }}>New Leads</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <div style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: '800', color: '#1e293b' }}>{stats?.newLeads || 0}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#3b82f6', fontSize: '12px', fontWeight: '600' }}>
                           <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                           Up
                        </div>
                    </div>
                </div>
                <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '16px', color: '#3b82f6' }}>
                    <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
            </div>
          </div>

          {/* Deal Distribution */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>Deal Distribution</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '24px', flex: 1 }}>
                  <div style={{ width: isMobile ? '100px' : '140px', height: isMobile ? '100px' : '140px', position: 'relative' }}>
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={stats?.dealDistribution?.length ? stats.dealDistribution : [{ name: 'Empty', value: 1 }]}
                                  innerRadius={isMobile ? 35 : 50}
                                  outerRadius={isMobile ? 50 : 70}
                                  paddingAngle={5}
                                  dataKey="value"
                                  stroke="none"
                              >
                                  {
                                      (stats?.dealDistribution || []).map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                      ))
                                  }
                              </Pie>
                          </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '10px', fontWeight: '600', color: '#64748b' }}>Stage</div>
                  </div>
                  <div style={{ flex: 1 }}>
                      {(stats?.dealDistribution || []).slice(0, 3).map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '8px' : '12px', fontSize: isMobile ? '11px' : '13px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></div>
                                  <span style={{ color: '#64748b', fontWeight: '500' }}>{item.name}</span>
                              </div>
                              <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.value}</div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* Bottom Row: Charts and Wins */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile || isTablet ? '1fr' : '2fr 1fr', gap: '24px' }}>
          
          {/* Performance Chart Desktop */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: isMobile ? '20px' : '32px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                  <div>
                    <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '700', color: '#1e293b' }}>
                        {stats?.showRevenue ? 'Performance Overview' : 'Monthly Wins'}
                    </div>
                    {!stats?.showRevenue && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Number of successful deals per month</div>}
                  </div>
                  <div style={{ color: '#94a3b8' }}>•••</div>
              </div>
              <div style={{ height: isMobile ? '250px' : '350px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.chartData || []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12, fill: '#94a3b8' }} dy={10} />
                          <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                              {
                                  (stats?.chartData || []).map((entry, index, arr) => (
                                      <Cell
                                          key={`cell-${index}`}
                                          fill={index === arr.length - 1 ? 'var(--success)' : '#cbd5e1'}
                                      />
                                  ))
                              }
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Recent Wins Desktop */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: isMobile ? '20px' : '32px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '700', color: '#1e293b' }}>Recent Wins</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--success)', cursor: 'pointer' }}>View All</div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {(stats?.recentWins || []).map((win, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px' }}>
                              <div style={{ width: isMobile ? '40px' : '48px', height: isMobile ? '40px' : '48px', borderRadius: '12px', backgroundColor: idx % 2 === 0 ? '#ecfdf5' : '#fff1f2', color: idx % 2 === 0 ? 'var(--success)' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '16px' : '20px' }}>
                                  {idx % 2 === 0 ? '🚀' : '✨'}
                              </div>
                              <div>
                                  <div style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>{win.name}</div>
                                  <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>{win.company} • Closed by {win.assignee.split(' ')[0]}</div>
                              </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: '700', color: 'var(--success)', marginBottom: '4px' }}>+${(win.value || 0).toLocaleString()}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>
                                  {Math.max(1, Math.floor((new Date() - new Date(win.timeAgo)) / (1000 * 60 * 60)))}h ago
                              </div>
                          </div>
                      </div>
                  ))}
                  {stats?.recentWins?.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '15px' }}>No recent wins found.</div>
                  )}
              </div>
          </div>

      </div>
    </div>
  );
}
