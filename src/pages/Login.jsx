import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../api/axiosConfig';

export default function Login() {
  const [error, setError] = useState('');

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
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'var(--bg-main)',
      padding: '24px'
    }}>
      <div style={{
        padding: '48px 40px',
        width: '100%',
        maxWidth: '440px',
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

        <form onSubmit={formik.handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                Email Address <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              name="email"
              type="email"
              placeholder="name@company.com"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius)',
                border: `1px solid ${formik.touched.email && formik.errors.email ? 'var(--danger)' : 'var(--border)'}`,
                backgroundColor: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
            {formik.touched.email && formik.errors.email && (
                <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{formik.errors.email}</div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                Password <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius)',
                border: `1px solid ${formik.touched.password && formik.errors.password ? 'var(--danger)' : 'var(--border)'}`,
                backgroundColor: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
            {formik.touched.password && formik.errors.password && (
                <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{formik.errors.password}</div>
            )}
          </div>
          <button
            type="submit"
            disabled={formik.isSubmitting}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius)',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              border: 'none',
              cursor: formik.isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '16px',
              opacity: formik.isSubmitting ? 0.7 : 1
            }}>
            {formik.isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Don't have an account? <span style={{ color: 'var(--primary)', fontWeight: '600', cursor: 'pointer' }}>Contact your admin</span>
        </p>
      </div>
    </div>
  );
}
