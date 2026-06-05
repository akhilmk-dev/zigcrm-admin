import React, { useState, useEffect, useRef } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../../api/axiosConfig';
import { Modal, Button, Input } from '../common/Modal';
import { FormSelect } from '../common/FormSelect';
import { toast } from 'react-hot-toast';
import { useScrollToError } from '../../hooks/useScrollToError';

const getStageIndex = (stage) => {
  const s = stage?.toLowerCase() || '';
  if (s === 'lead' || s === 'prospecting') return 0;
  if (s === 'qualification') return 1;
  if (s === 'proposal') return 2;
  if (s === 'negotiation') return 3;
  if (s === 'won' || s === 'lost') return 4;
  return 0;
};

export default function EditDealModal({ isOpen, onClose, deal, onSuccess }) {
  const loggedInUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;
  const isTenantUser = loggedInUser?.user_type === 'tenant_user';

  const [contacts, setContacts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [reason, setReason] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);
  const originalStageRef = useRef(null);
  const reasonBoxRef = useRef(null);

  const formik = useFormik({
    initialValues: {
      deal_name: '',
      value: '',
      currency: 'USD',
      stage: 'lead',
      contact_id: '',
      status: 'open',
      tenant_id: '',
      assigned_to: ''
    },
    validationSchema: Yup.object({
      deal_name: Yup.string().required('Deal name is required').min(3, 'Minimum 3 characters required').max(60, 'Maximum 60 characters allowed'),
      value: Yup.number()
        .typeError('Invalid value. Only numbers are allowed')
        .min(0, 'Value cannot be negative')
        .required('Deal value is required'),
      tenant_id: Yup.string().required('Company assignment is required'),
    }),
    onSubmit: async (values) => {
      const isDown = getStageIndex(values.stage) < getStageIndex(originalStageRef.current);

      if (isTenantUser && isDown) return;

      if (!isTenantUser && isDown && !reason.trim()) {
        setReasonTouched(true);
        return;
      }

      try {
        const payload = { ...values };
        if (isDown && reason.trim()) payload.reason = reason.trim();
        await api.patch(`/deals/${deal.id}`, payload);
        toast.success('Deal updated successfully');
        onSuccess?.();
        handleClose();
      } catch (err) {
        console.error('Update deal error', err);
        toast.error('Failed to update deal');
      }
    }
  });
  useScrollToError(formik);

  const handleClose = () => {
    formik.resetForm();
    setReason('');
    setReasonTouched(false);
    originalStageRef.current = null;
    onClose();
  };

  useEffect(() => {
    if (isOpen && deal) {
      originalStageRef.current = deal.stage;
      setReason('');
      setReasonTouched(false);
      formik.resetForm({
        values: {
          deal_name: deal.deal_name || '',
          value: deal.value || '',
          currency: deal.currency || 'USD',
          stage: deal.stage || 'lead',
          contact_id: deal.contact_id || '',
          status: deal.status || 'open',
          tenant_id: deal.tenant_id || '',
          assigned_to: deal.assigned_to || ''
        }
      });

      if (isGlobalAdmin) {
        api.get('/tenants/selection').then(res => setTenants(res.data || []));
      }
      const tid = deal.tenant_id;
      if (tid) {
        api.get(`/contacts?tenant_id=${tid}&limit=100`).then(res => setContacts(res.data.data || []));
        api.get(`/users?tenant_id=${tid}&module=deals`).then(res => setStaff(res.data.data || []));
      }
    }
  }, [isOpen, deal?.id]);

  useEffect(() => {
    if (formik.values.tenant_id && isOpen) {
      api.get(`/contacts?tenant_id=${formik.values.tenant_id}&limit=100`).then(res => setContacts(res.data.data || []));
      api.get(`/users?tenant_id=${formik.values.tenant_id}&module=deals`).then(res => setStaff(res.data.data || []));
    }
  }, [formik.values.tenant_id]);

  useEffect(() => {
    const stage = formik.values.stage;
    if (stage === 'won' || stage === 'lost') {
      formik.setFieldValue('status', stage);
    } else if (['lead', 'qualification', 'proposal', 'negotiation', 'prospecting'].includes(stage)) {
      formik.setFieldValue('status', 'open');
    }
    if (originalStageRef.current) {
      const isDown = getStageIndex(stage) < getStageIndex(originalStageRef.current);
      if (!isDown) {
        setReason('');
        setReasonTouched(false);
      }
    }
  }, [formik.values.stage]);

  const isDowngrade = originalStageRef.current
    ? getStageIndex(formik.values.stage) < getStageIndex(originalStageRef.current)
    : false;

  useEffect(() => {
    if (isDowngrade && !isTenantUser && reasonBoxRef.current) {
      setTimeout(() => {
        reasonBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }, [isDowngrade]);

  const showTenantUserAlert = isTenantUser && isDowngrade;
  const showReasonField = !isTenantUser && isDowngrade;
  const saveDisabled = formik.isSubmitting || (isTenantUser && isDowngrade);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Deal"
      footer={
        <>
          <Button type="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={formik.handleSubmit} disabled={saveDisabled}>
            {formik.isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <form onSubmit={formik.handleSubmit}>
        {isGlobalAdmin && (
          <FormSelect
            label="Assign to Company"
            name="tenant_id"
            value={formik.values.tenant_id}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.errors.tenant_id}
            touched={formik.touched.tenant_id}
            required
            searchable
            placeholder="Select a company"
            options={Array.isArray(tenants) ? tenants.map(t => ({
              value: t.id,
              label: t.owner_name || t.tenant_name || t.name || 'Unknown Company',
              avatar: (t.owner_name || t.tenant_name || t.name || '?')[0].toUpperCase()
            })) : []}
          />
        )}

        <Input
          label="Deal Name"
          name="deal_name"
          placeholder="e.g. Enterprise License"
          value={formik.values.deal_name}
          onChange={(e) => { formik.handleChange(e); formik.setFieldTouched('deal_name', true, false); }}
          onBlur={formik.handleBlur}
          error={formik.errors.deal_name}
          touched={formik.touched.deal_name}
          required
        />

        <Input
          label="Value ($)"
          type="number"
          name="value"
          placeholder="0.00"
          value={formik.values.value}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          onKeyDown={(e) => {
            if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
          }}
          error={formik.errors.value}
          touched={formik.touched.value}
          required
        />

        <FormSelect
          label="Contact Partner"
          name="contact_id"
          value={formik.values.contact_id}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          placeholder="Select a contact"
          searchable
          options={contacts.map(c => ({
            value: c.id,
            label: `${c.first_name} ${c.last_name || ''}`.trim(),
            avatar: c.first_name?.[0]?.toUpperCase()
          }))}
        />

        <FormSelect
          label="Assigned To"
          name="assigned_to"
          value={formik.values.assigned_to}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          searchable
          placeholder="Unassigned"
          options={[
            { value: '', label: 'Unassigned' },
            ...staff.map(s => ({ value: s.id, label: s.name, avatar: s.name?.[0]?.toUpperCase() }))
          ]}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <FormSelect
            label="Pipeline Stage"
            name="stage"
            value={formik.values.stage}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            options={[
              { value: 'lead',          label: 'Lead' },
              { value: 'qualification', label: 'Qualification' },
              { value: 'proposal',      label: 'Proposal' },
              { value: 'negotiation',   label: 'Negotiation' },
              { value: 'won',           label: 'Won',  color: '#10b981' },
              { value: 'lost',          label: 'Lost', color: '#ef4444' },
            ]}
          />

          <FormSelect
            label="Status"
            name="status"
            value={formik.values.status}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            options={[
              { value: 'open', label: 'Open', color: '#3b82f6' },
              { value: 'won',  label: 'Won',  color: '#10b981' },
              { value: 'lost', label: 'Lost', color: '#ef4444' },
            ]}
          />
        </div>

        {/* Tenant user: cannot move stage backwards */}
        {showTenantUserAlert && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '1px' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400e' }}>Action Restricted</div>
              <div style={{ fontSize: '12px', color: '#78350f', marginTop: '3px' }}>
                Moving a deal to a previous stage is not permitted. Please contact your administrator or a higher authority to revert the deal stage.
              </div>
            </div>
          </div>
        )}

        {/* Admin / tenant_admin: mandatory reason when downgrading */}
        {showReasonField && (
          <div ref={reasonBoxRef} style={{ marginTop: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-main)',
              marginBottom: '6px'
            }}>
              Reason for Stage Change <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => { setReason(e.target.value); setReasonTouched(true); }}
              onBlur={() => setReasonTouched(true)}
              placeholder="Please provide a reason for moving the deal to a previous stage..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1.5px solid ${reasonTouched && !reason.trim() ? 'var(--danger, #ef4444)' : 'var(--border, #e2e8f0)'}`,
                borderRadius: '10px',
                fontSize: '13px',
                color: 'var(--text-main)',
                backgroundColor: 'var(--bg-main, #fff)',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                lineHeight: '1.5',
                transition: 'border-color 0.2s'
              }}
            />
            {reasonTouched && !reason.trim() && (
              <span style={{ fontSize: '12px', color: 'var(--danger, #ef4444)', marginTop: '4px', display: 'block' }}>
                A reason is required when moving a stage backwards
              </span>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
