import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api, { getFileUrl } from '../api/axiosConfig';
import { Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select } from '../components/common/Modal';
import { toast } from 'react-hot-toast';
import { countries } from '../constants/countries';
import { isValidPhoneNumber } from 'libphonenumber-js';

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [tenant, setTenant] = useState(null);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState('This Month');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchTenantData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Fetch Tenant from list
      const tenantsRes = await api.get('/tenants?limit=1000');
      const foundTenant = (tenantsRes.data?.data || []).find(t => t.id === id);
      
      if (!foundTenant) {
        toast.error('Tenant not found');
        navigate('/tenants');
        return;
      }
      setTenant(foundTenant);

      // 2. Fetch Tenant Users
      const usersRes = await api.get(`/users?tenant_id=${id}&limit=1000`);
      setUsers(usersRes.data?.data || []);

      // 3. Fetch Contacts
      const contactsRes = await api.get(`/contacts?tenant_id=${id}&limit=1000`);
      setContacts(contactsRes.data?.data || []);

      // 4. Fetch Deals
      const dealsRes = await api.get(`/deals?tenant_id=${id}&limit=1000`);
      setDeals(dealsRes.data?.data || []);

    } catch (err) {
      console.error('Error fetching tenant details:', err);
      toast.error('Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
    api.get('/tenants/plans')
      .then(res => setPlans(res.data || []))
      .catch(console.error);
  }, [id]);

  const formik = useFormik({
    initialValues: {
      plan_id: '',
      name: '',
      email: '',
      phone: '',
      country: '',
      status: 'active',
      password: '',
      re_password: '',
      owner_id: '',
      profile_image_url: ''
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Company / Owner Name is required'),
      email: Yup.string().email('Invalid email address').required('Owner email is required'),
      phone: Yup.string()
        .required('Phone number is required')
        .test('is-indian-phone', 'Invalid mobile number. Enter a valid phone number.', function (value) {
          if (!value) return false;
          const sanitized = value.replace(/[\s()-]/g, '');
          const indianPhoneRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
          return indianPhoneRegex.test(sanitized);
        }),
      country: Yup.string().required('Country is required'),
      plan_id: Yup.string().required('Subscription plan is required'),
      status: Yup.string().required('Status is required'),
      password: Yup.string().test('min-6', 'Password must be at least 6 characters', val => !val || val.length >= 6),
      re_password: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
    }),
    onSubmit: async (values) => {
      try {
        const selectedCountry = countries.find(c => c.name === values.country);
        const dialCode = selectedCountry ? selectedCountry.code.split(',')[0].trim().replace(/[^\d+]/g, '') : '';
        const phoneWithoutSpaces = values.phone?.replace(/[\s()-]/g, '') || '';
        let formattedPhone = phoneWithoutSpaces;
        if (/^[6-9]\d{9}$/.test(phoneWithoutSpaces)) {
          formattedPhone = `+91${phoneWithoutSpaces}`;
        } else if (/^91[6-9]\d{9}$/.test(phoneWithoutSpaces)) {
          formattedPhone = `+91${phoneWithoutSpaces.substring(2)}`;
        } else if (/^0[6-9]\d{9}$/.test(phoneWithoutSpaces)) {
          formattedPhone = `+91${phoneWithoutSpaces.substring(1)}`;
        } else if (/^\+91[6-9]\d{9}$/.test(phoneWithoutSpaces)) {
          formattedPhone = phoneWithoutSpaces;
        }

        const payload = { ...values, phone: formattedPhone };
        await api.patch(`/tenants/${id}`, payload);
        toast.success('Tenant details updated successfully');
        setIsEditModalOpen(false);
        fetchTenantData(true);
      } catch (err) {
        console.error('Failed to update tenant:', err);
        const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to update tenant';
        if (errMsg.toLowerCase().includes('email')) {
          formik.setFieldError('email', errMsg);
          formik.setFieldTouched('email', true, false);
        } else if (errMsg.toLowerCase().includes('phone')) {
          formik.setFieldError('phone', errMsg);
          formik.setFieldTouched('phone', true, false);
        } else {
          toast.error(errMsg);
        }
      }
    }
  });

  const handleOpenEditModal = () => {
    if (!tenant) return;

    let phoneVal = tenant.owner_phone || '';
    if (phoneVal && tenant.country) {
      const selectedCountry = countries.find(c => c.name === tenant.country);
      if (selectedCountry) {
        const cleanPhone = phoneVal.replace(/[^\d+]/g, '');
        const codes = selectedCountry.code.split(',').map(c => c.trim().replace(/[^\d+]/g, ''));
        for (const code of codes) {
          if (cleanPhone.startsWith(code)) {
            phoneVal = cleanPhone.substring(code.length);
            break;
          }
        }
      }
    }

    formik.resetForm({
      values: {
        plan_id: tenant.plan_id || '',
        name: tenant.owner_name || '',
        email: tenant.owner_email || '',
        phone: phoneVal,
        country: tenant.country || '',
        status: tenant.owner_status || tenant.status || 'active',
        password: '',
        re_password: '',
        owner_id: tenant.owner_id || '',
        profile_image_url: tenant.owner_profile_image || ''
      }
    });
    setIsEditModalOpen(true);
  };

  if (loading) {
    return (
      <div style={{ padding: '0 8px 24px 8px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Top Section Skeleton: 60% Left, 40% Right */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '6fr 4fr',
          gap: '20px',
          width: '100%'
        }}>
          {/* Left Column: Tenant Detail Card Skeleton */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
            height: '240px'
          }}>
            {/* Profile Avatar & Details row */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '20px', backgroundColor: '#f1f5f9', animation: 'pulse 1.5s infinite' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ width: '40%', height: '20px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                <div style={{ width: '30%', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>

            {/* Quick Stats Grid Skeleton */}
            <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ flex: '1', height: '35px', backgroundColor: '#f1f5f9', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: '1', height: '35px', backgroundColor: '#f1f5f9', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: '1', height: '35px', backgroundColor: '#f1f5f9', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: '1', height: '35px', backgroundColor: '#f1f5f9', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
            </div>

            {/* Footer Row Skeleton */}
            <div style={{ display: 'flex', borderTop: '1px solid var(--border)', paddingTop: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '120px', height: '18px', backgroundColor: '#f1f5f9', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
            </div>
          </div>

          {/* Right Column: 3 Stats Cards Skeleton Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'space-between', height: '240px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '16px 20px', flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f1f5f9', animation: 'pulse 1.5s infinite' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ width: '120px', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '70px', height: '20px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                </div>
              </div>
              <div style={{ width: '60px', height: '22px', backgroundColor: '#f1f5f9', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
            </div>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '16px 20px', flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f1f5f9', animation: 'pulse 1.5s infinite' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ width: '120px', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '50px', height: '20px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                </div>
              </div>
              <div style={{ width: '60px', height: '22px', backgroundColor: '#f1f5f9', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
            </div>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '16px 20px', flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f1f5f9', animation: 'pulse 1.5s infinite' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ width: '120px', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ width: '50px', height: '20px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                </div>
              </div>
              <div style={{ width: '60px', height: '22px', backgroundColor: '#f1f5f9', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
            </div>
          </div>
        </div>

        {/* Main Grid Skeleton representing Left Column and Right Column */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth < 1024 ? '1fr' : '1.2fr 1fr',
          gap: '20px',
          width: '100%',
          alignItems: 'flex-start'
        }}>
          {/* Left Column Stack Skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Tenant Users (Staff) Skeleton */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', height: '250px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '200px', height: '20px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: '1', backgroundColor: '#f8fafc', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
            </div>
            {/* Contacts Under Tenant Skeleton */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', height: '250px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '220px', height: '20px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: '1', backgroundColor: '#f8fafc', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
            </div>
          </div>

          {/* Right Column Stack Skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Deals Income Overview Graph Skeleton */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', height: '280px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '180px', height: '20px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                <div style={{ width: '100px', height: '32px', backgroundColor: '#f1f5f9', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
              </div>
              <div style={{ flex: '1', backgroundColor: '#f8fafc', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
            </div>
            {/* Recent Deals Skeleton */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px', height: '220px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '150px', height: '20px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: '1', backgroundColor: '#f8fafc', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tenant) return null;

  // Compute metrics
  const totalDealsIncome = deals
    .filter(d => d.status === 'won')
    .reduce((sum, d) => sum + Number(d.value || 0), 0);

  const activeDealsCount = deals
    .filter(d => d.status === 'open' || d.status === 'pending' || d.status === 'in_progress')
    .length;

  const closedWonCount = deals
    .filter(d => d.status === 'won')
    .length;

  const totalClosedDeals = deals
    .filter(d => d.status === 'won' || d.status === 'lost')
    .length;

  const conversionRate = totalClosedDeals > 0 
    ? Math.round((closedWonCount / totalClosedDeals) * 100) 
    : 0;

  // SVG Chart data points for Deals Income Overview
  // We can render a elegant, premium undulating curve
  const chartPoints = [
    { x: '01 May', y: 3000 },
    { x: '06 May', y: 5500 },
    { x: '11 May', y: 4800 },
    { x: '16 May', y: 8200 },
    { x: '21 May', y: 10567 },
    { x: '26 May', y: 6400 },
    { x: '31 May', y: 9200 },
  ];

  const maxVal = 15000;
  const chartWidth = 500;
  const chartHeight = 180;
  const pointsString = chartPoints.map((pt, i) => {
    const xPos = 45 + (i / (chartPoints.length - 1)) * (chartWidth - 65);
    const yPos = chartHeight - (pt.y / maxVal) * chartHeight;
    return `${xPos},${yPos}`;
  }).join(' ');

  const closedPath = `45,${chartHeight} ${pointsString} 480,${chartHeight}`;

  return (
    <div style={{ padding: '0 8px 24px 8px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 60% Tenant Detail / 40% Deals Stats side-by-side Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '6fr 4fr',
        gap: '20px',
        width: '100%',
        alignItems: 'stretch'
      }}>
        {/* Left Card (60%): Tenant Info */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01), 0 2px 4px -2px rgba(0,0,0,0.01)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          {/* First Row Profile Details Layout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px',
            width: '100%'
          }}>
            {/* Profile Avatar & Name/Location Column */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '260px', flex: '1' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                backgroundColor: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                color: '#fff',
                fontWeight: 'bold',
                boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {tenant.owner_profile_image ? (
                  <img src={getFileUrl(tenant.owner_profile_image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>🏢</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '850', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.5px' }}>
                  {tenant.owner_name}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  📍 <span>{tenant.country || 'Not specified'}</span>
                </div>
              </div>
            </div>

            {/* Email & Phone Number Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px', flex: '1' }}>
              <a href={`mailto:${tenant.owner_email}`} style={{ textDecoration: 'none', fontSize: '13.5px', color: 'var(--text-main)', fontWeight: '750', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ✉️ {tenant.owner_email}
              </a>
              {tenant.owner_phone ? (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  📞 {tenant.owner_phone}
                </span>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No phone number</span>
              )}
            </div>

            {/* Status & Edit Action Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', minWidth: '110px' }}>
              <Badge type={tenant.owner_status === 'active' ? 'success' : 'danger'}>
                {tenant.owner_status || 'Active'}
              </Badge>
              <Button onClick={handleOpenEditModal} style={{ backgroundColor: 'var(--primary)', color: '#fff', border: 'none', padding: '6px 14px', fontSize: '11.5px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer' }} onMouseOver={(e) => e.target.style.backgroundColor = 'var(--primary-hover)'} onMouseOut={(e) => e.target.style.backgroundColor = 'var(--primary)'}>
                Edit Tenant
              </Button>
            </div>
          </div>

          {/* Quick Stats Grid inside Header */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <div style={{ flex: '1', minWidth: '80px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plan</div>
              <div style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                👑 {tenant.plan_name || 'Free Tier'}
              </div>
            </div>
            <div style={{ flex: '1', minWidth: '100px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Member Since</div>
              <div style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                {new Date(tenant.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div style={{ flex: '1', minWidth: '90px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tenant Users</div>
              <div style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                👥 {users.length}
              </div>
            </div>
            <div style={{ flex: '1', minWidth: '95px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Contacts</div>
              <div style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                👤 {contacts.length}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', borderTop: '1px solid var(--border)', paddingTop: '16px', alignItems: 'center' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '700', backgroundColor: '#f1f5f9', padding: '3px 10px', borderRadius: '6px' }}>
              Tenant ID : {tenant.id.substring(0, 13).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Right Stack (40%): Stats Cards stacked vertically with smaller padding to align perfectly */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          justifyContent: 'space-between'
        }}>
          {/* Card 1: Total Deals Income */}
          <div style={{ backgroundColor: '#eff6ff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #dbeafe', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: '1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                💸
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '750' }}>Total Deals Income</div>
                <div style={{ fontSize: '20px', fontWeight: '850', color: '#1e3a8a', marginTop: '2px' }}>
                  ₹{totalDealsIncome.toLocaleString()}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: '800', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '30px' }}>
                +18.6%
              </span>
              <div style={{ fontSize: '10px', color: '#1e40af', marginTop: '4px' }}>vs last 30 days</div>
            </div>
          </div>

          {/* Card 2: Active Deals */}
          <div style={{ backgroundColor: '#eff6ff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #dbeafe', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: '1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                💼
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '750' }}>Active Deals</div>
                <div style={{ fontSize: '20px', fontWeight: '850', color: '#1e3a8a', marginTop: '2px' }}>
                  {activeDealsCount}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: '800', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '30px' }}>
                +50%
              </span>
              <div style={{ fontSize: '10px', color: '#1e40af', marginTop: '4px' }}>vs last 30 days</div>
            </div>
          </div>

          {/* Card 3: Closed Won Deals */}
          <div style={{ backgroundColor: '#f5f3ff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #ede9fe', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: '1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                🏆
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#4f46e5', fontWeight: '750' }}>Closed Won Deals</div>
                <div style={{ fontSize: '20px', fontWeight: '850', color: '#3730a3', marginTop: '2px' }}>
                  {closedWonCount}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#4f46e5', fontWeight: '800', backgroundColor: '#e0e7ff', padding: '2px 8px', borderRadius: '30px' }}>
                +16.7%
              </span>
              <div style={{ fontSize: '10px', color: '#4f46e5', marginTop: '4px' }}>vs last 30 days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout containing Left Column Stack and Right Column Stack */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '20px',
        alignItems: 'start',
        width: '100%'
      }}>
        {/* Left Column Stack: Tenant Users (Staff) & Contacts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tenant Users Table */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>👥</span>
                <h2 style={{ fontSize: '16px', fontWeight: '850', color: 'var(--text-main)', margin: 0 }}>
                  Tenant Users (Staff)
                </h2>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '12px' }}>
                {users.length} Users
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '750', color: 'var(--text-muted)', textTransform: 'uppercase' }}>User</th>
                    <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '750', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Role</th>
                    <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '750', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</th>
                    <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '750', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 5).map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-muted)', overflow: 'hidden', flexShrink: 0 }}>
                            {u.profile_image_url ? (
                              <img src={getFileUrl(u.profile_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', color: 'var(--text-muted)' }}>
                                {(u.name || 'U')[0]}
                              </div>
                            )}
                          </div>
                          <Link to={`/users/${u.id}`} style={{ fontWeight: '750', fontSize: '13px', color: 'var(--text-main)', textDecoration: 'none' }}>
                            {u.name}
                          </Link>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <Badge type="info">{u.roles?.role_name || u.role || 'Staff'}</Badge>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <Badge type={u.status === 'active' ? 'success' : 'danger'}>{u.status || 'Active'}</Badge>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: '30px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No staff users registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '16px' }}>
              <Link to="/users" style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                View All Users ➔
              </Link>
            </div>
          </div>

          {/* Contacts Under Tenant Users */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>👤</span>
                <h2 style={{ fontSize: '16px', fontWeight: '850', color: 'var(--text-main)', margin: 0 }}>
                  Contacts Under Tenant Users
                </h2>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '12px' }}>
                Total Contacts: {contacts.length}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '750', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contact Name</th>
                    <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '750', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</th>
                    <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '750', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone</th>
                    <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '750', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.slice(0, 5).map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-muted)', overflow: 'hidden', flexShrink: 0 }}>
                            {c.profile_image_url ? (
                              <img src={getFileUrl(c.profile_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', color: 'var(--text-muted)' }}>
                                {(c.first_name || 'C')[0]}
                              </div>
                            )}
                          </div>
                          <Link to={`/contacts/${c.id}`} style={{ fontWeight: '750', fontSize: '13px', color: 'var(--text-main)', textDecoration: 'none' }}>
                            {c.first_name} {c.last_name || ''}
                          </Link>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', color: 'var(--text-muted)' }}>{c.email || '—'}</td>
                      <td style={{ padding: '12px 8px', fontSize: '13px', color: 'var(--text-muted)' }}>{c.phone || '—'}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <Badge type={c.status === 'active' ? 'success' : 'secondary'}>
                          {c.status || 'lead'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {contacts.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: '30px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No contacts registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '16px' }}>
              <Link to="/contacts" style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                View All Contacts ➔
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column Stack: Deals Income Overview Chart & Recent Deals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Deals Income Overview Chart */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>📈</span>
                <h2 style={{ fontSize: '16px', fontWeight: '850', color: 'var(--text-main)', margin: 0 }}>
                  Deals Income Overview
                </h2>
              </div>
              
              <select 
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option>This Month</option>
                <option>Last 30 Days</option>
                <option>All Time</option>
              </select>
            </div>

            <div>
              <div style={{ fontSize: '24px', fontWeight: '850', color: 'var(--text-main)' }}>
                ₹{totalDealsIncome.toLocaleString()}
              </div>
              <div style={{ fontSize: '12.5px', color: '#2563eb', fontWeight: '750', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ↗ 18.6% <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>vs last month</span>
              </div>
            </div>

            {/* SVG Custom Area/Line Chart */}
            <div style={{ position: 'relative', marginTop: '24px', width: '100%', height: `${chartHeight + 40}px` }}>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const yPos = chartHeight - ratio * chartHeight;
                  const labelVal = Math.round(ratio * maxVal);
                  return (
                    <g key={idx}>
                      <line x1="45" y1={yPos} x2={chartWidth} y2={yPos} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
                      <text x="36" y={yPos + 4} fill="var(--text-muted)" fontSize="9" fontWeight="700" textAnchor="end">
                        {labelVal >= 1000 ? `${labelVal/1000}k` : labelVal}
                      </text>
                    </g>
                  );
                })}

                {/* Filled Area */}
                <polygon points={closedPath} fill="url(#chartGradient)" />

                {/* Stroke Line */}
                <polyline points={pointsString} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Interactive Tooltip Node for 21 May */}
                {(() => {
                  const activeIndex = 4; // 21 May
                  const pt = chartPoints[activeIndex];
                  const xPos = 45 + (activeIndex / (chartPoints.length - 1)) * (chartWidth - 65);
                  const yPos = chartHeight - (pt.y / maxVal) * chartHeight;

                  return (
                    <g>
                      {/* Vertical guideline */}
                      <line x1={xPos} y1="0" x2={xPos} y2={chartHeight} stroke="#2563eb" strokeWidth="1" strokeDasharray="2,2" />
                      
                      {/* Pulse outer ring */}
                      <circle cx={xPos} cy={yPos} r="8" fill="#2563eb" fillOpacity="0.15" />
                      {/* Inner core circle */}
                      <circle cx={xPos} cy={yPos} r="4.5" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
                      
                      {/* Floating Info card above the node */}
                      <g transform={`translate(${xPos - 40}, ${yPos - 38})`}>
                        <rect width="80" height="28" rx="6" fill="#1e293b" />
                        <text x="40" y="12" fill="#fff" fontSize="8" fontWeight="800" textAnchor="middle">
                          ₹{pt.y.toLocaleString()}
                        </text>
                        <text x="40" y="22" fill="#94a3b8" fontSize="7" fontWeight="600" textAnchor="middle">
                          {pt.x}
                        </text>
                      </g>
                    </g>
                  );
                })()}

                {/* X Axis Labels */}
                {chartPoints.map((pt, i) => {
                  const xPos = 45 + (i / (chartPoints.length - 1)) * (chartWidth - 65);
                  return (
                    <text key={i} x={xPos} y={chartHeight + 18} fill="var(--text-muted)" fontSize="9.5" fontWeight="700" textAnchor="middle">
                      {pt.x}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Recent Deals List */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>💼</span>
                <h2 style={{ fontSize: '16px', fontWeight: '850', color: 'var(--text-main)', margin: 0 }}>
                  Recent Deals
                </h2>
              </div>
              
              <Link to="/deals" style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--primary)', textDecoration: 'none' }}>
                View All
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {deals.slice(0, 5).map(deal => (
                <div key={deal.id} style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: deal.status === 'won' ? '#eff6ff' : deal.status === 'lost' ? '#fee2e2' : '#eff6ff',
                      color: deal.status === 'won' ? '#2563eb' : deal.status === 'lost' ? '#ef4444' : '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      flexShrink: 0
                    }}>
                      💰
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <Link to={`/deals/${deal.id}`} style={{ fontWeight: '750', fontSize: '13.5px', color: 'var(--text-main)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deal.deal_name}
                      </Link>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>🚩 {deal.stage}</span>
                        <span>•</span>
                        <span>👤 {deal.assigned_to_user?.name || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '850', color: 'var(--text-main)' }}>
                      ₹{deal.value?.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: deal.status === 'won' ? 'var(--success)' : deal.status === 'lost' ? 'var(--danger)' : 'var(--warning)', marginTop: '2px' }}>
                      {deal.status}
                    </div>
                  </div>
                </div>
              ))}

              {deals.length === 0 && (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No deals created.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Tenant Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Tenant Details"
        footer={
          <>
            <Button type="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={formik.handleSubmit} disabled={formik.isSubmitting}>
              {formik.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={formik.handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
            <Select
              label="Subscription Plan"
              name="plan_id"
              value={formik.values.plan_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.plan_id}
              touched={formik.touched.plan_id}
              required
            >
              <option value="">Select Plan</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.plan_name} (₹{p.price})</option>
              ))}
            </Select>
          </div>

          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '16px' }}>Company / Owner Details</h3>

          <Input
            label="Company / Owner Name"
            name="name"
            placeholder="Acme Inc. / John Doe"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.name}
            touched={formik.touched.name}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Owner Email"
              name="email"
              type="email"
              placeholder="owner@acme.com"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.email}
              touched={formik.touched.email}
              required
            />
            <Select
              label="Country"
              name="country"
              value={formik.values.country}
              onChange={(e) => {
                formik.setFieldValue('country', e.target.value);
              }}
              onBlur={formik.handleBlur}
              error={formik.errors.country}
              touched={formik.touched.country}
              required
            >
              <option value="">Select Country</option>
              {countries.map(c => (
                <option key={c.name} value={c.name}>{c.name} ({c.code})</option>
              ))}
            </Select>
          </div>

          <Input
            label="Phone Number"
            name="phone"
            type="tel"
            placeholder="e.g. 9876543210"
            value={formik.values.phone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            onKeyDown={(e) => {
              if (
                ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', '+'].includes(e.key) ||
                (e.key === 'a' && (e.ctrlKey === true || e.metaKey === true)) ||
                (e.key === 'c' && (e.ctrlKey === true || e.metaKey === true)) ||
                (e.key === 'v' && (e.ctrlKey === true || e.metaKey === true)) ||
                (e.key === 'x' && (e.ctrlKey === true || e.metaKey === true))
              ) {
                return;
              }
              if (!/^[0-9]$/.test(e.key)) {
                e.preventDefault();
              }
            }}
            error={formik.errors.phone}
            touched={formik.touched.phone}
            required
            helperText="Enter 10-digit Indian mobile number"
          />

          <Select
            label="Status"
            name="status"
            value={formik.values.status}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.status}
            touched={formik.touched.status}
            required
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </Select>
        </form>
      </Modal>

    </div>
  );
}
