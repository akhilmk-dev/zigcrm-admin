import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api, { FILE_BASE_URL, getFileUrl, saveActivityLog } from '../api/axiosConfig';
import { toast } from 'react-hot-toast';
import { DataTable, Badge } from '../components/common/DataTable';
import { Modal, Button, Input, ConfirmModal } from '../components/common/Modal';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { PhoneInput } from '../components/common/PhoneInput';
import { FormSelect } from '../components/common/FormSelect';
import { usePermission } from '../hooks/usePermission';
import { isValidPhoneNumber } from 'libphonenumber-js';

const STATUS_OPTIONS = [
  { value: 'new',        label: 'New',        color: '#10b981' },
  { value: 'discussion', label: 'Discussion',  color: '#f59e0b' },
  { value: 'won',        label: 'Won',         color: '#3b82f6' },
  { value: 'loss',       label: 'Loss',        color: '#ef4444' },
];

/* ── icon + label text ──────────────────────────────────────── */
const IcoLabel = ({ d, children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
      {d}
    </svg>
    {children}
  </span>
);

/* ── subtle section header divider ─────────────────────────── */
const SectionDivider = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0 14px' }}>
    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>{label}</span>
    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
  </div>
);

export default function Contacts() {
  const { hasPermission } = usePermission();
  const [contacts, setContacts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  // Search & Pagination states
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status')?.toLowerCase() || '');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Super Admin view states
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantUsers, setTenantUsers] = useState([]);
  const [filterUsers, setFilterUsers] = useState([]);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;
  const showAssigneeFilter = loggedInUser?.user_type !== 'tenant_user';

  // ─── Google Places API Integration ──────────────────────────────────────────
  useEffect(() => {
    // 1. Inject CSS for Google Places dropdown z-index to overlay on modal
    if (!document.getElementById('google-places-zindex-style')) {
      const style = document.createElement('style');
      style.id = 'google-places-zindex-style';
      style.innerHTML = `.pac-container { z-index: 99999 !important; }`;
      document.head.appendChild(style);
    }

    // 2. Load Google Maps Places Script
    if (!window.google) {
      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    let autocomplete = null;
    let companyAutocomplete = null;
    let timer = null;
    let addressNativeHandler = null;

    if (isModalOpen) {
      timer = setTimeout(() => {
        // ── Address field ────────────────────────────────────────
        const inputElement = document.querySelector('input[name="address"]');
        if (inputElement) {
          // Capture-phase listener fires before Google's handlers, ensuring every
          // keystroke reaches formik even when Google Places stops propagation.
          addressNativeHandler = (e) => {
            setFieldValueRef.current('address', e.target.value, false);
          };
          inputElement.addEventListener('input', addressNativeHandler, true);

          if (window.google?.maps?.places) {
            autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
              types: ['geocode', 'establishment'],
            });
            autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace();
              const value = place?.formatted_address || place?.name || '';
              if (value) setFieldValueRef.current('address', value);
            });
          }
        }

        // ── Workplace (company_name) field ───────────────────────
        const companyInputElement = document.querySelector('input[name="company_name"]');
        if (companyInputElement && window.google?.maps?.places) {
          companyAutocomplete = new window.google.maps.places.Autocomplete(companyInputElement, {
            types: ['establishment'],
          });
          companyAutocomplete.addListener('place_changed', () => {
            const place = companyAutocomplete.getPlace();
            if (place?.name) setFieldValueRef.current('company_name', place.name);
            if (place?.formatted_address) setFieldValueRef.current('address', place.formatted_address);
          });
        }
      }, 300);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (addressNativeHandler) {
        const el = document.querySelector('input[name="address"]');
        if (el) el.removeEventListener('input', addressNativeHandler, true);
      }
      if (autocomplete && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
      if (companyAutocomplete && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(companyAutocomplete);
      }
    };
  }, [isModalOpen]);

  const formik = useFormik({
    initialValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company_name: '',
      profession: '',
      job_title: '',
      source: '',
      tags: '',
      status: 'new',
      tenant_id: '',
      assigned_to: '',
      profile_image_url: '',
      address: '',
      gst_no: ''
    },
    validationSchema: Yup.object({
      first_name: Yup.string().required('First name is required'),
      tenant_id: Yup.string().required('Company assignment is required'),
      email: Yup.string().email('Invalid email address'),
      phone: Yup.string()
        .required('Phone number is required')
        .test('is-valid-phone', 'Invalid international phone number', (val) => {
          if (!val) return false;
          try { return isValidPhoneNumber(val); } catch { return false; }
        }),
      company_name: Yup.string(),
      profession: Yup.string()
    }),
    onSubmit: async (values) => {
      try {
        if (editingContact) {
          await api.patch(`/contacts/${editingContact.id}`, values);
          toast.success('Contact updated successfully');
          saveActivityLog({
            contact_id: editingContact.id,
            activity_type: 'contact_updated',
            title: 'Updated Contact',
            description: `Updated details of ${values.first_name} ${values.last_name || ''}`
          });
        } else {
          await api.post('/contacts', values);
          toast.success('Contact created successfully');
        }
        fetchData();
        handleCloseModal();
      } catch (err) {
        console.error("Save Contact Error:", err);
      }
    }
  });

  // Stable ref so native listeners never capture a stale setFieldValue
  const setFieldValueRef = useRef(formik.setFieldValue);
  useEffect(() => { setFieldValueRef.current = formik.setFieldValue; });

  // Fetch users for assignment when tenant selection changes
  useEffect(() => {
    const tid = formik.values.tenant_id || loggedInUser?.tenantId;
    if (tid) {
      api.get(`/users?tenant_id=${tid}&scope=tenant&limit=100`)
        .then(res => setTenantUsers(res.data.data || []))
        .catch(console.error);
    } else {
      setTenantUsers([]);
    }
  }, [formik.values.tenant_id]);

  // Fetch users for the Assignee Filter
  useEffect(() => {
    if (showAssigneeFilter) {
      const tid = isGlobalAdmin ? selectedTenantId : loggedInUser?.tenantId;
      api.get(`/users?scope=tenant&limit=1000${tid ? `&tenant_id=${tid}` : ''}`)
        .then(res => setFilterUsers(res.data.data || []))
        .catch(console.error);
    }
  }, [selectedTenantId, isGlobalAdmin, loggedInUser?.tenantId, showAssigneeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', page);
      queryParams.append('limit', pageSize);
      queryParams.append('sortField', sortField);
      queryParams.append('sortOrder', sortOrder);

      if (isGlobalAdmin && selectedTenantId) {
        queryParams.append('tenant_id', selectedTenantId);
      }

      if (debouncedSearch) {
        queryParams.append('search', debouncedSearch);
      }

      if (statusFilter) {
        queryParams.append('status', statusFilter);
      }

      if (assigneeFilter) {
        queryParams.append('assigned_to', assigneeFilter);
      }

      const [contactsRes, tenantsRes] = await Promise.all([
        api.get(`/contacts?${queryParams.toString()}`),
        isGlobalAdmin ? api.get('/tenants/selection') : Promise.resolve({ data: [] })
      ]);

      setContacts(contactsRes.data.data || []);
      setTotalCount(contactsRes.data.totalCount || 0);

      if (isGlobalAdmin) setTenants(tenantsRes.data || []);
    } catch (err) {
      console.error("Fetch Contacts Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('sortField', sortField);
      queryParams.append('sortOrder', sortOrder);
      queryParams.append('export', 'true');

      if (isGlobalAdmin && selectedTenantId) {
        queryParams.append('tenant_id', selectedTenantId);
      }

      if (debouncedSearch) {
        queryParams.append('search', debouncedSearch);
      }

      if (statusFilter) {
        queryParams.append('status', statusFilter);
      }

      if (assigneeFilter) {
        queryParams.append('assigned_to', assigneeFilter);
      }

      toast.loading('Exporting contacts...', { id: 'export-contacts' });
      const response = await api.get(`/contacts?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contacts_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Contacts exported successfully', { id: 'export-contacts' });
    } catch (err) {
      console.error("Export contacts failed", err);
      toast.error('Failed to export contacts', { id: 'export-contacts' });
    }
  };

  const downloadCSVFormat = () => {
    const headers = [
      'First Name *',
      'Last Name',
      'Email',
      'Phone *',
      'Workplace Name',
      'Profession',
      'Address',
      'GST Number',
      'Source',
      'Tags'
    ];
    
    const sampleRow = [
      'John',
      'Doe',
      'johndoe@example.com',
      '+919876543210',
      'Acme Corp',
      'Software Engineer',
      '123 Tech Park, Bangalore',
      '29AAAAA1111A1Z1',
      'Website',
      'Premium,Tech'
    ];

    const csvContent = [
      headers.join(','),
      sampleRow.map(val => `"${val.replace(/"/g, '""')}"`).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'contacts_import_format.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (e) => {
    if (!hasPermission('contacts.import')) {
      toast.error("Permission denied: You do not have permission to import contacts");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          toast.error("CSV file is empty or missing headers");
          return;
        }

        // Clean headers and normalize them
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
        
        const contacts = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Intelligently parse fields keeping commas inside quotes safe
          const values = [];
          let currentVal = '';
          let insideQuotes = false;
          for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const char = line[charIdx];
            if (char === '"' || char === "'") {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
              currentVal = '';
            } else {
              currentVal += char;
            }
          }
          values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

          const rowData = {};
          headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });

          // Match header aliases
          const name = rowData.name || rowData.first_name || rowData['first name'] || rowData['first name *'] || '';
          const phone = rowData.phone || rowData.mobile || rowData['phone number'] || rowData['mobile number'] || rowData['phone *'] || '';
          const email = rowData.email || rowData['email address'] || '';
          const company = rowData.company_name || rowData.company || rowData.workplace || rowData['workplace name'] || rowData['company name'] || '';
          const profession = rowData.profession || '';
          const address = rowData.address || '';
          const gst = rowData.gst_no || rowData.gst || rowData['gst number'] || '';
          const source = rowData.source || '';
          const tags = rowData.tags || '';

          let first_name = name;
          let last_name = '';
          if (name && !rowData.first_name) {
            const parts = name.trim().split(/\s+/);
            first_name = parts[0];
            last_name = parts.slice(1).join(' ');
          } else if (rowData.first_name) {
            first_name = rowData.first_name;
            last_name = rowData.last_name || '';
          }

          contacts.push({
            first_name,
            last_name,
            phone,
            email,
            company_name: company,
            profession,
            address,
            gst_no: gst,
            source,
            tags
          });
        }

        if (contacts.length === 0) {
          toast.error("No contacts found in CSV");
          return;
        }

        toast.loading("Importing contacts...", { id: "import-contacts" });
        const response = await api.post('/contacts/bulk-import', { contacts });
        
        const { importedCount, skippedCount } = response.data;
        
        toast.success(`Successfully imported ${importedCount} contact(s).`, { id: "import-contacts" });
        if (skippedCount > 0) {
          toast.error(`${skippedCount} contact(s) were skipped (invalid mobile number or duplicate).`, { id: "import-skipped", duration: 6000 });
        }
        
        const dismissToasts = () => {
          toast.dismiss("import-contacts");
          toast.dismiss("import-skipped");
          document.removeEventListener('click', dismissToasts);
        };
        setTimeout(() => {
          document.addEventListener('click', dismissToasts);
        }, 100);

        fetchData();
      } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.error || "Failed to parse or import CSV", { id: "import-contacts" });

        const dismissToasts = () => {
          toast.dismiss("import-contacts");
          document.removeEventListener('click', dismissToasts);
        };
        setTimeout(() => {
          document.addEventListener('click', dismissToasts);
        }, 100);
      } finally {
        e.target.value = ''; // Reset file input
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    fetchData();
  }, [selectedTenantId, page, debouncedSearch, statusFilter, assigneeFilter, sortField, sortOrder]);

  // Handle global search and status from URL
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch !== null) {
      setSearch(urlSearch);
      setDebouncedSearch(urlSearch);
    } else {
      setSearch('');
      setDebouncedSearch('');
    }

    const urlStatus = searchParams.get('status');
    if (urlStatus !== null) {
      setStatusFilter(urlStatus.toLowerCase());
    } else {
      setStatusFilter('');
    }

    setPage(1);
  }, [searchParams]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      formik.setValues({
        first_name: contact.first_name,
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company_name: contact.company_name || '',
        job_title: contact.job_title || '',
        source: contact.source || '',
        tags: contact.tags || '',
        status: contact.status,
        tenant_id: contact.tenant_id || '',
        assigned_to: contact.assigned_to || '',
        profile_image_url: contact.profile_image_url || '',
        profession: contact.profession || '',
        address: contact.address || '',
        gst_no: contact.gst_no || ''
      });
    } else {
      setEditingContact(null);
      formik.resetForm({
        values: {
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          company_name: '',
          job_title: '',
          source: '',
          tags: '',
          status: 'lead',
          tenant_id: isGlobalAdmin ? selectedTenantId : (loggedInUser?.tenantId || ''),
          assigned_to: '',
          profile_image_url: '',
          profession: '',
          address: '',
          gst_no: ''
        }
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleDelete = (contact) => {
    setContactToDelete(contact);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    try {
      await api.delete(`/contacts/${contactToDelete.id}`);
      toast.success('Contact deleted successfully');
      saveActivityLog({
        contact_id: contactToDelete.id,
        activity_type: 'contact_deleted',
        title: 'Deleted Contact',
        description: `Deleted contact: ${contactToDelete.first_name} ${contactToDelete.last_name || ''}`
      });
      fetchData();
      setDeleteConfirmOpen(false);
    } catch (err) {
      console.error("Delete Contact Error:", err);
      toast.error('Failed to delete contact');
    }
  };

  const columns = [
    {
      header: 'Name',
      key: 'name',
      sortKey: 'first_name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)'
          }}>
            {row.profile_image_url ? (
              <img src={getFileUrl(row.profile_image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                {row.first_name?.[0]}{row.last_name?.[0]}
              </span>
            )}
          </div>
          <Link
            to={`/contacts/${row.id}`}
            style={{
              fontWeight: '600',
              color: 'var(--primary)',
              textDecoration: 'none',
              transition: 'color 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--primary-hover)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--primary)'}
          >
            {row.first_name} {row.last_name}
          </Link>
        </div>
      )
    },
    { header: 'Phone', key: 'phone', sortKey: 'phone' },
    { header: 'Email', key: 'email', sortKey: 'email' },
    { header: 'Workplace', key: 'company_name', sortKey: 'company_name' },
    { header: 'Profession', key: 'profession', sortKey: 'profession', render: (row) => row.profession || '—' },
    // Show Company column for Global Admins
    ...(isGlobalAdmin ? [{
      header: 'Owner / Company',
      key: 'tenant_name',
      sortKey: 'tenant_id',
      render: (row) => <Badge type="primary">{row.tenant_name || 'Individual'}</Badge>
    }] : []),
    {
      header: 'Assignee',
      key: 'assigned_to',
      sortKey: 'assigned_to_user(name)',
      render: (row) => row.assigned_to_user?.name || 'Unassigned'
    },
    {
      header: 'Status',
      key: 'status',
      sortKey: 'status',
      render: (row) => {
        const types = { lead: 'warning', active: 'success', lost: 'danger' };
        return <Badge type={types[row.status]}>{row.status}</Badge>;
      }
    },
    {
      header: 'Created at',
      key: 'created_at',
      sortKey: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Contacts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>Keep track of your prospects and customer relations.</p>
        </div>
        <div className="page-actions">
          {hasPermission('contacts.import') && (
            <>
              <input
                type="file"
                accept=".csv"
                id="csv-import-file-input"
                style={{ display: 'none' }}
                onChange={handleImportCSV}
              />
              <Button
                type="secondary"
                onClick={downloadCSVFormat}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                CSV Format
              </Button>
              <Button
                type="secondary"
                onClick={() => document.getElementById('csv-import-file-input').click()}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Import
              </Button>
            </>
          )}
          <Button type="secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </Button>
          {hasPermission('contacts.create') && (
            <Button onClick={() => handleOpenModal()}>+ Add Contact</Button>
          )}
        </div>
      </div>
      {/* Filters & Search Row */}
      <div className="filter-bar">
        {isGlobalAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filter by Company</span>
            <select
              value={selectedTenantId}
              onChange={(e) => { setSelectedTenantId(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', height: '38px', minWidth: '180px', cursor: 'pointer' }}
            >
              <option value="">All Companies (Global View)</option>
              {Array.isArray(tenants) && tenants.map(t => <option key={t.id} value={t.id}>{t.owner_name || t.tenant_name || t.name || 'Unknown Company'}</option>)}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', cursor: 'pointer', height: '38px', minWidth: '140px' }}
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="discussion">Discussion</option>
            <option value="won">Won</option>
            <option value="loss">Loss</option>
          </select>
        </div>

        {/* Assignee Filter */}
        {showAssigneeFilter && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assignee</span>
            <SearchableSelect
              name="assigneeFilter"
              value={assigneeFilter}
              onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }}
              options={[
                { value: '', label: 'All Assignees' },
                { value: 'unassigned', label: 'Unassigned Only' },
                ...filterUsers.map(u => ({ value: u.id, label: u.name }))
              ]}
              placeholder="All Assignees"
              style={{ width: '220px', marginBottom: 0 }}
              innerStyle={{ padding: '8px 12px', minHeight: 'auto', borderRadius: '12px', fontSize: '13px', border: '1px solid var(--border)', backgroundColor: '#f8fafc', height: '38px' }}
            />
          </div>
        )}

        {/* Search Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '280px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search</span>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search name, email, workplace, profession..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 32px 10px 36px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', backgroundColor: '#f8fafc', transition: 'border-color 0.2s', height: '38px' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: '#e2e8f0', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#334155', padding: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Restore Button */}
        {(() => {
          const hasFilters = !!(selectedTenantId || statusFilter || assigneeFilter || search);
          return (
            <button
              title={hasFilters ? 'Clear all filters' : 'No active filters'}
              onClick={() => {
                if (!hasFilters) return;
                setSelectedTenantId('');
                setStatusFilter('');
                setAssigneeFilter('');
                setSearch('');
                setPage(1);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                border: `1px solid ${hasFilters ? '#f87171' : 'var(--border)'}`,
                backgroundColor: hasFilters ? '#fff1f2' : '#f8fafc',
                color: hasFilters ? '#dc2626' : '#cbd5e1',
                cursor: hasFilters ? 'pointer' : 'default',
                transition: 'all 0.2s',
                alignSelf: 'flex-end'
              }}
              onMouseOver={(e) => { if (hasFilters) e.currentTarget.style.backgroundColor = '#fee2e2'; }}
              onMouseOut={(e) => { if (hasFilters) e.currentTarget.style.backgroundColor = '#fff1f2'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          );
        })()}
      </div>

      <DataTable
        columns={columns}
        data={contacts}
        isLoading={loading}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        onPageChange={setPage}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={(field, order) => {
          setSortField(field);
          setSortOrder(order);
        }}
        actions={(row) => (
          <>
            {hasPermission('contacts.update') && (
              <Button type="secondary" size="sm" onClick={() => handleOpenModal(row)}>Edit</Button>
            )}
            {hasPermission('contacts.delete') && (
              <Button type="ghost" size="sm" onClick={() => handleDelete(row)}>
                <span style={{ color: 'var(--danger)' }}>Delete</span>
              </Button>
            )}
          </>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingContact ? 'Edit Contact' : 'New Contact'}
        maxWidth="640px"
        footer={
          <>
            <Button type="secondary" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={formik.handleSubmit} disabled={formik.isSubmitting}>
              {editingContact
                ? (formik.isSubmitting ? 'Saving…' : 'Save Changes')
                : (formik.isSubmitting ? 'Creating…' : '+ Create Contact')}
            </Button>
          </>
        }
      >
        <form onSubmit={formik.handleSubmit} style={{ paddingBottom: '4px' }}>

          {/* ── Avatar row ──────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#EEF2FF', border: '2px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {formik.values.profile_image_url ? (
                  <img src={getFileUrl(formik.values.profile_image_url)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                )}
              </div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--primary)', border: '2px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', borderRadius: '50%' }}
                onChange={async (e) => {
                  const file = e.currentTarget.files[0];
                  if (!file) return;
                  const fd = new FormData(); fd.append('file', file);
                  try { const res = await api.post('/upload', fd); formik.setFieldValue('profile_image_url', res.data.url); }
                  catch (err) { console.error('Upload failed', err); }
                }}
              />
            </div>
            <div>
              <p style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)' }}>
                {formik.values.profile_image_url ? 'Change photo' : 'Add profile picture'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>JPG or PNG · max 2 MB</p>
            </div>
          </div>

          {/* ── Assign to company (super admin only) ────────────── */}
          {isGlobalAdmin && (
            <FormSelect
              label="Assign to Company"
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="18" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M8 10h.01M8 14h.01M16 6h.01M16 10h.01M16 14h.01"/></svg>}
              name="tenant_id"
              value={formik.values.tenant_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.tenant_id}
              touched={formik.touched.tenant_id}
              required
              placeholder="Select a company…"
              options={[
                ...(Array.isArray(tenants) ? tenants.map(t => ({
                  value: t.id,
                  label: t.owner_name || t.tenant_name || t.name || 'Unknown Company',
                  avatar: (t.owner_name || t.tenant_name || t.name || '?')[0].toUpperCase(),
                })) : []),
              ]}
            />
          )}

          {/* ── Section: Basic info ─────────────────────────────── */}
          <SectionDivider label="Basic Information" />

          <div className="form-grid-2">
            <Input
              label={<IcoLabel d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>}>First Name</IcoLabel>}
              name="first_name" placeholder="John"
              value={formik.values.first_name} onChange={formik.handleChange} onBlur={formik.handleBlur}
              error={formik.errors.first_name} touched={formik.touched.first_name} required
            />
            <Input
              label={<IcoLabel d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>}>Last Name</IcoLabel>}
              name="last_name" placeholder="Doe"
              value={formik.values.last_name} onChange={formik.handleChange} onBlur={formik.handleBlur}
            />
          </div>

          <div className="form-grid-2">
            <Input
              label={<IcoLabel d={<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>}>Email</IcoLabel>}
              type="email" name="email" placeholder="john.doe@example.com"
              value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur}
              error={formik.errors.email} touched={formik.touched.email}
            />
            <PhoneInput
              label={<IcoLabel d={<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.09 6.09l.87-.87a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></>}>Phone</IcoLabel>}
              name="phone"
              value={formik.values.phone} onChange={formik.handleChange} onBlur={formik.handleBlur}
              error={formik.errors.phone} touched={formik.touched.phone} required
            />
          </div>

          {/* ── Section: Work ───────────────────────────────────── */}
          <SectionDivider label="Work Details" />

          <div className="form-grid-2">
            <Input
              label={<IcoLabel d={<><rect x="3" y="2" width="18" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M8 10h.01M8 14h.01M16 6h.01M16 10h.01M16 14h.01"/></>}>Workplace</IcoLabel>}
              name="company_name" placeholder="Acme Corp"
              value={formik.values.company_name} onChange={formik.handleChange} onBlur={formik.handleBlur}
              error={formik.errors.company_name} touched={formik.touched.company_name}
            />
            <Input
              label={<IcoLabel d={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>}>Profession</IcoLabel>}
              name="profession" placeholder="e.g. Attorney, Realtor"
              value={formik.values.profession} onChange={formik.handleChange} onBlur={formik.handleBlur}
              error={formik.errors.profession} touched={formik.touched.profession}
            />
          </div>

          <Input
              label={<IcoLabel d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>}>GST Number</IcoLabel>}
              name="gst_no" placeholder="e.g. 22AAAAA0000A1Z5"
              value={formik.values.gst_no} onChange={formik.handleChange} onBlur={formik.handleBlur}
              error={formik.errors.gst_no} touched={formik.touched.gst_no}
            />

          {/* ── Section: CRM ────────────────────────────────────── */}
          <SectionDivider label="CRM Settings" />

          <div className="form-grid-2">
            <FormSelect
              label="Assigned To"
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
              name="assigned_to"
              value={formik.values.assigned_to}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="Unassigned"
              options={[
                { value: '', label: 'Unassigned' },
                ...tenantUsers.map(u => ({
                  value: u.id,
                  label: u.name + (u.roles?.role_name ? ` · ${u.roles.role_name}` : ''),
                  avatar: (u.name || '?')[0].toUpperCase(),
                })),
              ]}
            />
            <FormSelect
              label="Lead Status"
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>}
              name="status"
              value={formik.values.status}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              options={STATUS_OPTIONS}
            />
          </div>

          <div className="form-grid-2">
            <Input
              label={<IcoLabel d={<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>}>Source</IcoLabel>}
              name="source" placeholder="e.g. LinkedIn, Referral"
              value={formik.values.source} onChange={formik.handleChange} onBlur={formik.handleBlur}
            />
            <Input
              label={<IcoLabel d={<><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>}>Tags</IcoLabel>}
              name="tags" placeholder="e.g. VIP, Tech"
              value={formik.values.tags} onChange={formik.handleChange} onBlur={formik.handleBlur}
            />
          </div>

          {/* ── Section: Location ───────────────────────────────── */}
          <SectionDivider label="Location" />

          <Input
            label={<IcoLabel d={<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>}>Address</IcoLabel>}
            name="address" placeholder="e.g. 123 Main St, New York"
            value={formik.values.address} onChange={formik.handleChange} onBlur={formik.handleBlur}
            error={formik.errors.address} touched={formik.touched.address}
          />

        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Contact"
        message={`Are you sure you want to delete ${contactToDelete?.first_name} ${contactToDelete?.last_name}? This action cannot be undone.`}
        confirmText="Yes, Delete"
        confirmType="danger"
      />
    </div>
  );
}
