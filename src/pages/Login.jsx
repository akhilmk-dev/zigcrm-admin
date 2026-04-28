import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';

export default function Login() {
  const [error, setError] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: ''
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Email is required'),
      password: Yup.string().required('Password is required')
    }),
    onSubmit: async (values, { setSubmitting }) => {
      setError('');
      try {
        const response = await api.post('/auth/login', values);
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
        setSubmitting(false);
      }
    }
  });

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#fff',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Left Side: Branding/Visual (Desktop only) */}
      <div 
        id="branding-side"
        style={{
          flex: '1.2',
          backgroundColor: '#0f172a',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px',
          overflow: 'hidden'
        }}
      >
        {/* Abstract Background Decoration */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle, rgba(0, 109, 47, 0.15) 0%, rgba(15, 23, 42, 0) 70%)',
          filter: 'blur(60px)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-5%',
          right: '-5%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(0, 109, 47, 0.1) 0%, rgba(15, 23, 42, 0) 70%)',
          filter: 'blur(50px)'
        }} />

        <div style={{ position: 'relative', zIndex: 3, maxWidth: '480px', textAlign: 'center' }}>
          <div style={{
            fontSize: '48px',
            fontWeight: '900',
            color: '#fff',
            marginBottom: '24px',
            lineHeight: '1.1',
            letterSpacing: '-2px'
          }}>
            Accelerate your <span style={{ color: 'var(--primary)' }}>business growth</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '18px', lineHeight: '1.6', marginBottom: '40px' }}>
            Elevate your customer relationships with the next generation of CRM intelligence and automation.
          </p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div 
        id="login-form-container"
        style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '40px 60px',
          maxWidth: '560px',
          margin: '0 auto',
          zIndex: 2
        }}
      >
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '32px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'var(--primary)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: '800',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(0, 109, 47, 0.2)'
            }}>Z</div>
            <span style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              color: 'var(--text-main)',
              letterSpacing: '-0.5px'
            }}>ZigCRM</span>
          </div>

          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '800', 
            color: 'var(--text-main)',
            marginBottom: '12px',
            letterSpacing: '-1px'
          }}>Welcome back</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
            Please enter your details to sign in to your account.
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fff1f2',
            color: '#e11d48',
            padding: '14px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            marginBottom: '28px',
            border: '1px solid #ffe4e6',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: '500'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        <form onSubmit={formik.handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '10px', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: 'var(--text-main)' 
            }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                name="email"
                type="email"
                placeholder="name@company.com"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `1.5px solid ${formik.touched.email && formik.errors.email ? 'var(--danger)' : 'var(--border)'}`,
                  backgroundColor: '#f9fafb',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  color: 'var(--text-main)'
                }}
                onFocus={(e) => {
                  if (!(formik.touched.email && formik.errors.email)) {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.backgroundColor = '#fff';
                    e.target.style.boxShadow = '0 0 0 4px rgba(0, 109, 47, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  formik.handleBlur(e);
                  if (!(formik.touched.email && formik.errors.email)) {
                    e.target.style.borderColor = 'var(--border)';
                    e.target.style.backgroundColor = '#f9fafb';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              />
            </div>
            {formik.touched.email && formik.errors.email && (
                <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '6px', fontWeight: '500' }}>{formik.errors.email}</div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)', textDecoration: 'none' }}>Forgot password?</Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  paddingRight: '48px',
                  borderRadius: '12px',
                  border: `1.5px solid ${formik.touched.password && formik.errors.password ? 'var(--danger)' : 'var(--border)'}`,
                  backgroundColor: '#f9fafb',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  color: 'var(--text-main)'
                }}
                onFocus={(e) => {
                  if (!(formik.touched.password && formik.errors.password)) {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.backgroundColor = '#fff';
                    e.target.style.boxShadow = '0 0 0 4px rgba(0, 109, 47, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  formik.handleBlur(e);
                  if (!(formik.touched.password && formik.errors.password)) {
                    e.target.style.borderColor = 'var(--border)';
                    e.target.style.backgroundColor = '#f9fafb';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            {formik.touched.password && formik.errors.password && (
                <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '6px', fontWeight: '500' }}>{formik.errors.password}</div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              id="remember" 
              style={{ 
                width: '18px', 
                height: '18px', 
                borderRadius: '4px', 
                accentColor: 'var(--primary)',
                cursor: 'pointer'
              }} 
            />
            <label htmlFor="remember" style={{ fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
              Remember for 30 days
            </label>
          </div>

          <button
            type="submit"
            disabled={formik.isSubmitting}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              border: 'none',
              cursor: formik.isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: '700',
              fontSize: '16px',
              opacity: formik.isSubmitting ? 0.7 : 1,
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0, 109, 47, 0.25)'
            }}
            onMouseOver={(e) => !formik.isSubmitting && (e.target.style.backgroundColor = 'var(--primary-hover)')}
            onMouseOut={(e) => !formik.isSubmitting && (e.target.style.backgroundColor = 'var(--primary)')}
          >
            {formik.isSubmitting ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Signing in...
              </div>
            ) : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '40px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Don't have an account? <span style={{ color: 'var(--primary)', fontWeight: '700', cursor: 'pointer' }}>Contact support</span>
        </p>
      </div>

      {/* Global style for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1024px) {
          #branding-side { display: none !important; }
          #login-form-container { max-width: 100% !important; padding: 40px 24px !important; }
        }
      `}</style>
    </div>
  );
}
