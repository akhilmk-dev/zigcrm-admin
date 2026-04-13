import React, { useState } from 'react';
import api from '../api/axiosConfig';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      window.location.href = '/'; 
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
         setError(err.response.data.error || 'Invalid credentials or permissions');
      } else {
         setError('Server connection error.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      width: '100vw',
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: 'var(--bg-main)',
      padding: '24px'
    }}>
      <div style={{ 
        backgroundColor: 'var(--bg-card)', 
        padding: '48px 40px', 
        borderRadius: '16px', 
        width: '100%', 
        maxWidth: '440px', 
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            backgroundColor: 'var(--primary)', 
            borderRadius: '12px',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '24px'
          }}>Z</div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '14px' }}>Sign in to continue to your CRM dashboard</p>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: '#fef2f2', 
            color: 'var(--danger)', 
            padding: '12px 16px', 
            borderRadius: 'var(--radius)', 
            fontSize: '14px',
            marginBottom: '24px',
            border: '1px solid #fee2e2',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>Email Address</label>
            <input 
              type="email" 
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: 'var(--radius)', 
                border: '1px solid var(--border)', 
                backgroundColor: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: 'var(--radius)', 
                border: '1px solid var(--border)', 
                backgroundColor: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <button 
             type="submit" 
             disabled={loading}
             style={{ 
               marginTop: '8px', 
               width: '100%', 
               padding: '12px', 
               borderRadius: 'var(--radius)', 
               backgroundColor: 'var(--primary)', 
               color: '#white', 
               border: 'none', 
               cursor: loading ? 'not-allowed' : 'pointer', 
               fontWeight: '600',
               fontSize: '16px',
               color: '#fff',
               opacity: loading ? 0.7 : 1
             }}>
             {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Don't have an account? <span style={{ color: 'var(--primary)', fontWeight: '600', cursor: 'pointer' }}>Contact your admin</span>
        </p>
      </div>
    </div>
  );
}
