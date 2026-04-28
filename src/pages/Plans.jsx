import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../api/axiosConfig';
import { DataTable, Badge } from '../components/common/DataTable';
import { Button } from '../components/common/Modal';
import { usePermission } from '../hooks/usePermission';

export default function Plans() {
  const { user } = usePermission();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tenants/plans');
      setPlans(response.data || []);
    } catch (err) {
      console.error("Failed to fetch plans", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const columns = [
    {
      header: 'Plan Tier',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '10px', 
            backgroundColor: row.plan_name === 'Enterprise' ? '#fdf2f8' : row.plan_name === 'Pro' ? '#eff6ff' : '#f0fdf4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            {row.plan_name === 'Enterprise' ? '🚀' : row.plan_name === 'Pro' ? '💎' : '🌱'}
          </div>
          <div>
            <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{row.plan_name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.description}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Monthly Price',
      render: (row) => (
        <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
          ${row.price} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '400' }}>/mo</span>
        </div>
      )
    },
    {
      header: 'Limits',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '13px' }}>
            👥 <strong>{row.max_users}</strong> Users
          </div>
          <div style={{ fontSize: '13px' }}>
            💾 <strong>{row.max_storage >= 1024 ? `${row.max_storage/1024}GB` : `${row.max_storage}MB`}</strong> Storage
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge type={row.is_active ? 'success' : 'secondary'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  ];

  if (!user?.isSuperAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Access Denied</h2>
        <p>Only Super Admins can manage global subscription tiers.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Subscription Plans</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>Define global pricing tiers and feature restrictions for all tenants.</p>
        </div>
        <Button onClick={() => toast.info("Plan customization coming soon!")}>
          + Create New Tier
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={plans}
        isLoading={loading}
        pageSize={10}
        totalCount={plans.length}
        currentPage={1}
        onPageChange={() => {}}
        actions={(row) => (
          <Button type="secondary" size="sm" onClick={() => toast.info("Edit functionality coming soon!")}>
            Configure Features
          </Button>
        )}
      />

      {/* Info Card */}
      <div style={{ 
        marginTop: '32px', 
        padding: '24px', 
        borderRadius: '16px', 
        backgroundColor: '#fff', 
        border: '1px solid var(--border)',
        display: 'flex',
        gap: '24px',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '32px' }}>💡</div>
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>Plan-Based Gating is Active</h4>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5' }}>
            The system currently checks both user roles and tenant plans. If a module (like 'Deals') is disabled for a plan, 
            no users within those tenants will be able to access it, regardless of their individual permissions.
          </p>
        </div>
      </div>
    </div>
  );
}
