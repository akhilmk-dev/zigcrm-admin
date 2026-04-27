import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Modal';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--neutral)',
      textAlign: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: '#fff',
        padding: '60px 40px',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        {/* Large 404 Visual */}
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <h1 style={{ 
            fontSize: '120px', 
            fontWeight: '900', 
            margin: 0, 
            lineHeight: 1,
            fontFamily: 'var(--font-headline)',
            color: 'var(--primary)',
            opacity: 0.1,
            userSelect: 'none'
          }}>404</h1>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
             <div style={{
               width: '80px',
               height: '80px',
               backgroundColor: 'var(--primary)',
               borderRadius: '24px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               color: '#fff',
               boxShadow: '0 10px 25px rgba(0, 109, 47, 0.3)'
             }}>
               <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <path d="m21 21-4.3-4.3"/><circle cx="11" cy="11" r="8"/><path d="M11 8v6"/><path d="M8 11h6"/>
               </svg>
             </div>
          </div>
        </div>

        <div style={{ gap: '8px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ 
            fontSize: '32px', 
            fontWeight: '800', 
            color: 'var(--text-main)', 
            margin: 0,
            fontFamily: 'var(--font-headline)',
            letterSpacing: '-0.5px'
          }}>
            Page Not Found
          </h2>
          <p style={{ 
            color: 'var(--text-muted)', 
            fontSize: '16px', 
            lineHeight: '1.6',
            margin: 0,
            fontWeight: '500'
          }}>
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <Button onClick={() => navigate(-1)} type="secondary" style={{ padding: '12px 24px' }}>
            Go Back
          </Button>
          <Button onClick={() => navigate('/')} style={{ padding: '12px 24px' }}>
            Back to Home
          </Button>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '24px',
          height: '24px',
          backgroundColor: '#223458',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '12px',
          fontWeight: '900'
        }}>Z</div>
        <span style={{ fontSize: '14px', fontWeight: '800', color: '#223458', letterSpacing: '-0.5px' }}>ZIGCRM</span>
      </div>
    </div>
  );
}
