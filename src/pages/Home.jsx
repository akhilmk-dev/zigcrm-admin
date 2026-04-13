import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/stats');
        setStats(res.data);
      } catch (err) {
        console.error("Fetch Stats Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const getDashboardCards = () => {
    if (user?.isSuperAdmin || user?.isAdmin) {
      return [
        { label: 'Platform Status', value: stats?.status || 'Healthy', icon: '🟢', color: 'var(--success)' },
        { label: 'Total Tenants', value: stats?.tenants || 0, icon: '🏢', color: 'var(--primary)' },
        { label: 'Global Users', value: stats?.users || 0, icon: '👥', color: 'var(--warning)' },
      ];
    }
    return [
      { label: 'Active Deals', value: stats?.deals || 0, icon: '🤝', color: 'var(--primary)' },
      { label: 'Total Contacts', value: stats?.contacts || 0, icon: '📇', color: 'var(--success)' },
      { label: 'Pending Tasks', value: stats?.tasks || 0, icon: '✅', color: 'var(--warning)' },
    ];
  };

  const cards = getDashboardCards();

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
          Welcome back, {user?.email?.split('@')[0]}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          Here's what's happening on your {user?.isSuperAdmin ? 'platform' : 'dashboard'} today.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {cards.map((card, idx) => (
          <div key={idx} style={{ 
            backgroundColor: '#fff', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '4px', 
              height: '100%', 
              backgroundColor: card.color 
            }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
               <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                 {card.label}
               </span>
               <span style={{ fontSize: '24px' }}>{card.icon}</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)' }}>
              {loading ? '...' : card.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Quick Start Guide</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '14px', marginBottom: '24px' }}>
            To get the most out of ZIGCRM, start by setting up your team and contacts. Use the sidebar to navigate through your modules.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <button style={{ padding: '10px 20px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: '600', fontSize: '14px' }}>
              Documentation
            </button>
            <button style={{ padding: '10px 20px', backgroundColor: '#fff', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontWeight: '600', fontSize: '14px' }}>
              Watch Demo
            </button>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--primary)', padding: '32px', borderRadius: '16px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px', position: 'relative', zIndex: 1 }}>Upgrade Plan</h3>
          <p style={{ fontSize: '14px', opacity: 0.9, lineHeight: '1.5', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
            Unlock advanced CRM features and unlimited data storage with a Pro subscription.
          </p>
          <button style={{ padding: '10px 20px', backgroundColor: '#fff', color: 'var(--primary)', border: 'none', borderRadius: 'var(--radius)', fontWeight: '700', fontSize: '14px', position: 'relative', zIndex: 1 }}>
            See Pricing
          </button>
          <div style={{ 
            position: 'absolute', 
            bottom: '-20px', 
            right: '-20px', 
            fontSize: '120px', 
            opacity: 0.1, 
            transform: 'rotate(-15deg)' 
          }}>🚀</div>
        </div>
      </div>
    </div>
  );
}
