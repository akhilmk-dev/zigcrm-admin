import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../api/axiosConfig';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1: Email Formik
  const emailFormik = useFormik({
    initialValues: { email: '' },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Email is required'),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await api.post('/auth/forgot-password', { email: values.email });
        setEmail(values.email);
        setStep(2);
        toast.success('OTP sent successfully (Dummy: 5555)');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to send OTP');
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Step 2: OTP Formik
  const otpFormik = useFormik({
    initialValues: { otp: '' },
    validationSchema: Yup.object({
      otp: Yup.string().length(4, 'OTP must be 4 digits').required('OTP is required'),
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await api.post('/auth/verify-otp', { email, otp: values.otp });
        setOtp(values.otp);
        setStep(3);
        toast.success('OTP verified');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Invalid or expired OTP');
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Step 3: Reset Formik
  const resetFormik = useFormik({
    initialValues: { newPassword: '', confirmPassword: '' },
    validationSchema: Yup.object({
      newPassword: Yup.string().required('New password is required').min(6, 'Min 6 characters'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('newPassword'), null], 'Passwords must match')
        .required('Please confirm your password')
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await api.post('/auth/reset-password', { 
          email, 
          otp, 
          newPassword: values.newPassword 
        });
        toast.success('Password reset successful. Please login.');
        navigate('/login');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to reset password');
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
      {/* Left Side: Branding (Desktop only) */}
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
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(15, 23, 42, 0) 70%)',
          filter: 'blur(60px)'
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
            Secure your <span style={{ color: 'var(--primary)' }}>workspace</span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '18px', lineHeight: '1.6' }}>
            Follow the simple steps to recover your access and get back to growing your business.
          </p>
        </div>
      </div>

      {/* Right Side: Step Forms */}
      <div 
        id="form-container"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <Link to="/login" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                fontSize: '20px'
              }}>Z</div>
              <span style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-main)' }}>ZigCRM</span>
            </Link>
          </div>

          {step === 1 && (
            <>
              <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>Forgot password?</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Enter your email address and we'll send you an OTP code.</p>
            </>
          )}
          {step === 2 && (
            <>
              <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>Verify OTP</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>We've sent a 4-digit code to <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{email}</span></p>
            </>
          )}
          {step === 3 && (
            <>
              <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px' }}>Reset password</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Create a new strong password for your account.</p>
            </>
          )}
        </div>

        {/* --- STEP 1: EMAIL --- */}
        {step === 1 && (
          <form onSubmit={emailFormik.handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>Email Address</label>
              <input
                name="email"
                type="email"
                placeholder="name@company.com"
                value={emailFormik.values.email}
                onChange={emailFormik.handleChange}
                onBlur={emailFormik.handleBlur}
                style={inputStyle(emailFormik.touched.email && emailFormik.errors.email)}
              />
              {emailFormik.touched.email && emailFormik.errors.email && (
                <div style={errorStyle}>{emailFormik.errors.email}</div>
              )}
            </div>
            <button type="submit" disabled={emailFormik.isSubmitting} style={buttonStyle(emailFormik.isSubmitting)}>
              {emailFormik.isSubmitting ? 'Sending...' : 'Send OTP Code'}
            </button>
            <Link to="/login" style={{ textAlign: 'center', fontSize: '14px', color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
              ← Back to Login
            </Link>
          </form>
        )}

        {/* --- STEP 2: OTP --- */}
        {step === 2 && (
          <form onSubmit={otpFormik.handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>4-Digit Code</label>
              <input
                name="otp"
                type="text"
                placeholder="0000"
                maxLength="4"
                value={otpFormik.values.otp}
                onChange={otpFormik.handleChange}
                onBlur={otpFormik.handleBlur}
                style={{ ...inputStyle(otpFormik.touched.otp && otpFormik.errors.otp), textAlign: 'center', letterSpacing: '8px', fontSize: '24px', fontWeight: '700' }}
              />
              {otpFormik.touched.otp && otpFormik.errors.otp && (
                <div style={errorStyle}>{otpFormik.errors.otp}</div>
              )}
            </div>
            <button type="submit" disabled={otpFormik.isSubmitting} style={buttonStyle(otpFormik.isSubmitting)}>
              {otpFormik.isSubmitting ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer' }}>
              Change email address
            </button>
          </form>
        )}

        {/* --- STEP 3: RESET --- */}
        {step === 3 && (
          <form onSubmit={resetFormik.handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={resetFormik.values.newPassword}
                  onChange={resetFormik.handleChange}
                  onBlur={resetFormik.handleBlur}
                  style={inputStyle(resetFormik.touched.newPassword && resetFormik.errors.newPassword)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeButtonStyle}>
                  {showPassword ? eyeOffIcon : eyeIcon}
                </button>
              </div>
              {resetFormik.touched.newPassword && resetFormik.errors.newPassword && (
                <div style={errorStyle}>{resetFormik.errors.newPassword}</div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={resetFormik.values.confirmPassword}
                  onChange={resetFormik.handleChange}
                  onBlur={resetFormik.handleBlur}
                  style={inputStyle(resetFormik.touched.confirmPassword && resetFormik.errors.confirmPassword)}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={eyeButtonStyle}>
                  {showConfirmPassword ? eyeOffIcon : eyeIcon}
                </button>
              </div>
              {resetFormik.touched.confirmPassword && resetFormik.errors.confirmPassword && (
                <div style={errorStyle}>{resetFormik.errors.confirmPassword}</div>
              )}
            </div>

            <button type="submit" disabled={resetFormik.isSubmitting} style={buttonStyle(resetFormik.isSubmitting)}>
              {resetFormik.isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          #branding-side { display: none !important; }
          #form-container { max-width: 100% !important; padding: 40px 24px !important; }
        }
      `}</style>
    </div>
  );
}

// Reusable Styles
const inputStyle = (hasError) => ({
  width: '100%',
  padding: '14px 16px',
  borderRadius: '12px',
  border: `1.5px solid ${hasError ? 'var(--danger)' : 'var(--border)'}`,
  backgroundColor: '#f9fafb',
  fontSize: '15px',
  outline: 'none',
  transition: 'all 0.2s',
  color: 'var(--text-main)'
});

const buttonStyle = (isSubmitting) => ({
  marginTop: '12px',
  width: '100%',
  padding: '14px',
  borderRadius: '12px',
  backgroundColor: 'var(--primary)',
  color: '#fff',
  border: 'none',
  cursor: isSubmitting ? 'not-allowed' : 'pointer',
  fontWeight: '700',
  fontSize: '16px',
  opacity: isSubmitting ? 0.7 : 1,
  transition: 'all 0.2s',
  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
});

const errorStyle = { color: 'var(--danger)', fontSize: '12px', marginTop: '6px', fontWeight: '500' };

const eyeButtonStyle = {
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
  borderRadius: '8px'
};

const eyeIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const eyeOffIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;
