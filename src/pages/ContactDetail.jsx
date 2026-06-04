import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api, { getFileUrl, saveActivityLog } from '../api/axiosConfig';
import { Badge } from '../components/common/DataTable';
import { Modal, Button, Input, Select, ConfirmModal } from '../components/common/Modal';
import RichTextEditor from '../components/RichTextEditor';
import NoteEditor from '../components/NoteEditor';
import NoteItem from '../components/NoteItem';
import { toast } from 'react-hot-toast';
import { PhoneInput } from '../components/common/PhoneInput';
import { SearchableSelect } from '../components/common/SearchableSelect';
import CRMWorkspaceTabs from '../components/common/CRMWorkspaceTabs';

const formatRelativeDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  const now = new Date();

  const isToday = date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) {
    return `Today, ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${dateStr}, ${timeStr}`;
  }
};

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activities');
  const [noteTitle, setNoteTitle] = useState('');
  const [isNoteEditorExpanded, setIsNoteEditorExpanded] = useState(false);
  const [noteCategory, setNoteCategory] = useState('');

  // More Actions dropdown state (removed -- using direct Delete button)

  // Search & Filter state for Activities/Timeline
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTime, setFilterTime] = useState('all');

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);
  const [viewingDeal, setViewingDeal] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [notePage, setNotePage] = useState(1);
  const [dealPage, setDealPage] = useState(1);
  const [taskPage, setTaskPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const isInitialMount = useRef(true);

  // Add Task/Deal States
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
  const [staff, setStaff] = useState([]);
  const [tenantContacts, setTenantContacts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [selectedDealId, setSelectedDealId] = useState('');
  const [showDealDropdown, setShowDealDropdown] = useState(false);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const emailDropdownRef = useRef(null);

  const [communicationModal, setCommunicationModal] = useState({
    isOpen: false,
    type: '',
    destination: '',
    title: '',
    message: ''
  });

  // Close email dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (emailDropdownRef.current && !emailDropdownRef.current.contains(e.target)) {
        setShowEmailDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const logMailActivity = () => {
    api.post('/logs', {
      contact_id: id,
      activity_type: 'mail',
      title: 'contacted through mail',
      description: 'contacted through mail',
      meta_data: {
        contact_name: [data?.contact?.first_name, data?.contact?.last_name].filter(Boolean).join(' ')
      }
    }).then(() => {
      toast.success('Mail activity logged successfully.');
      fetchDetail(true);
    }).catch((err) => console.error('Log mail error', err));
  };

  const handleQuickContactClick = (e, type, destination) => {
    if (e) e.preventDefault();
    if (!destination) {
      toast.error(`No ${type === 'mail' ? 'email address' : 'phone number'} available for this contact.`);
      return;
    }

    // For mail and call: skip the modal — open directly and log in background.
    // For whatsapp: show confirmation modal as before.
    if (type === 'mail') {
      window.location.href = `mailto:${destination}`;
      api.post('/logs', {
        contact_id: id,
        activity_type: 'mail',
        title: 'contacted through mail',
        description: 'contacted through mail',
        meta_data: {
          contact_name: [data?.contact?.first_name, data?.contact?.last_name].filter(Boolean).join(' ')
        }
      }).then(() => {
        toast.success('Mail activity logged successfully.');
        fetchDetail(true);
      }).catch((err) => console.error('Log mail error', err));
      return;
    }

    if (type === 'call') {
      const link = document.createElement('a');
      link.href = `tel:${destination}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      api.post('/logs', {
        contact_id: id,
        activity_type: 'call',
        title: 'Outgoing call',
        description: 'Outgoing call',
        meta_data: {
          contact_name: [data?.contact?.first_name, data?.contact?.last_name].filter(Boolean).join(' ')
        }
      }).then(() => {
        toast.success('Call activity logged successfully.');
        fetchDetail(true);
      }).catch((err) => console.error('Log call error', err));
      return;
    }

    // WhatsApp — keep the confirmation modal
    const title = 'Connect on WhatsApp';
    const message = `Would you like to open WhatsApp to message ${data?.contact?.first_name || ''} at ${destination}? This will also log a "Whatsapp" activity note in the contact timeline.`;
    setCommunicationModal({ isOpen: true, type, destination, title, message });
  };

  const handleConfirmCommunication = () => {
    const { type, destination } = communicationModal;
    // Only WhatsApp reaches here now
    setCommunicationModal(prev => ({ ...prev, isOpen: false }));
    window.open(`https://wa.me/${destination.replace(/\D/g, '')}`, '_blank', 'noopener,noreferrer');
    api.post('/logs', {
      contact_id: id,
      activity_type: 'whatsapp',
      title: 'contacted through whatsapp',
      description: 'contacted through whatsapp',
      meta_data: {
        contact_name: [data?.contact?.first_name, data?.contact?.last_name].filter(Boolean).join(' ')
      }
    }).then(() => {
      toast.success('WhatsApp activity logged successfully.');
      fetchDetail(true);
    }).catch((err) => console.error('Log whatsapp error', err));
  };

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const isGlobalAdmin = loggedInUser?.isSuperAdmin || loggedInUser?.isAdmin;

  const formik = useFormik({
    validateOnChange: true,
    validateOnBlur: true,
    initialValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company_name: '',
      job_title: '',
      source: '',
      tags: '',
      status: 'new',
      tenant_id: '',
      profession: '',
      assigned_to: '',
      profile_image_url: '',
      address: '',
      gst_no: '',
      gender: ''
    },
    validationSchema: Yup.object({
      first_name: Yup.string().required('First name is required').min(3, 'Minimum 3 characters required').max(60, 'Maximum 60 characters allowed').matches(/^[a-zA-Z\s'-]*$/, 'Special characters or symbols are not allowed'),
      last_name: Yup.string().test('min-3', 'Minimum 3 characters required', val => !val || val.length >= 3).max(60, 'Maximum 60 characters allowed').matches(/^[a-zA-Z\s'-]*$/, 'Special characters or symbols are not allowed'),
      company_name: Yup.string().test('min-3', 'Minimum 3 characters required', val => !val || val.length >= 3).max(60, 'Maximum 60 characters allowed').matches(/^[a-zA-Z0-9\s'.,&()-]*$/, 'Special characters or symbols are not allowed'),
      tenant_id: Yup.string().required('Company assignment is required'),
      email: Yup.string().matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email address'),
      phone: Yup.string()
        .required('Phone number is required')
        .matches(/^\+?[\d\s-]{7,15}$/, 'Invalid phone number format'),
      profession: Yup.string()
    }),
    onSubmit: async (values) => {
      try {
        await api.patch(`/contacts/${id}`, values);
        toast.success('Contact updated successfully');
        setIsEditModalOpen(false);
        saveActivityLog({
          contact_id: id,
          activity_type: 'contact_updated',
          title: 'Updated Contact',
          description: `Updated contact profile details`,
          meta_data: {
            contact_name: [values.first_name, values.last_name].filter(Boolean).join(' ')
          }
        });
        fetchDetail();
      } catch (err) {
        console.error("Update contact error", err);
      }
    }
  });

  const addTaskFormik = useFormik({
    initialValues: {
      title: '',
      description: '',
      due_date: '',
      status: 'pending',
      priority: 'medium',
      assigned_to: '',
      contact_id: id,
      document_url: '',
      tenant_id: '',
      deal_id: ''
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Task title is required'),
      priority: Yup.string().required('Priority is required'),
      contact_id: Yup.string().required('Contact Partner is required')
    }),
    onSubmit: async (values) => {
      try {
        await api.post('/tasks', values);
        toast.success('Task created successfully');
        setIsAddTaskModalOpen(false);
        addTaskFormik.resetForm();
        setUploadedFileName('');
        fetchDetail(true);
      } catch (err) {
        console.error("Create Task Error:", err);
      }
    }
  });

  const addDealFormik = useFormik({
    initialValues: {
      deal_name: '',
      value: '',
      stage: 'lead',
      contact_id: id,
      status: 'open',
      tenant_id: '',
      assigned_to: ''
    },
    validationSchema: Yup.object({
      deal_name: Yup.string().required('Deal name is required'),
      value: Yup.number()
        .typeError('Invalid value. Only numbers are allowed')
        .min(0, 'Value cannot be negative')
        .required('Deal value is required'),
      contact_id: Yup.string().required('Contact Partner is required')
    }),
    onSubmit: async (values) => {
      try {
        await api.post('/deals', values);
        toast.success('Deal created successfully');
        setIsAddDealModalOpen(false);
        addDealFormik.resetForm();
        fetchDetail(true);
      } catch (err) {
        console.error("Create Deal Error:", err);
      }
    }
  });

  // Synchronize status with pipeline stage for Deal modal
  useEffect(() => {
    const stage = addDealFormik.values.stage;
    if (stage === 'won' || stage === 'lost') {
      addDealFormik.setFieldValue('status', stage);
    } else if (stage === 'lead' || stage === 'qualification' || stage === 'proposal' || stage === 'negotiation' || stage === 'prospecting') {
      addDealFormik.setFieldValue('status', 'open');
    }
  }, [addDealFormik.values.stage]);

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

    if (isEditModalOpen) {
      timer = setTimeout(() => {
        // 1. Autocomplete for address field
        const inputElement = document.querySelector('input[name="address"]');
        if (inputElement && window.google && window.google.maps && window.google.maps.places) {
          autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
            types: ['geocode', 'establishment'],
          });
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place && place.formatted_address) {
              formik.setFieldValue('address', place.formatted_address);
            } else if (place && place.name) {
              formik.setFieldValue('address', place.name);
            }
          });
        }

        // 2. Autocomplete for workplace (company_name) field
        const companyInputElement = document.querySelector('input[name="company_name"]');
        if (companyInputElement && window.google && window.google.maps && window.google.maps.places) {
          companyAutocomplete = new window.google.maps.places.Autocomplete(companyInputElement, {
            types: ['establishment'],
          });
          companyAutocomplete.addListener('place_changed', () => {
            const place = companyAutocomplete.getPlace();
            if (place) {
              if (place.name) {
                formik.setFieldValue('company_name', place.name);
              }
              if (place.formatted_address) {
                formik.setFieldValue('address', place.formatted_address);
              }
            }
          });
        }
      }, 300);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (autocomplete && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
      if (companyAutocomplete && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(companyAutocomplete);
      }
    };
  }, [isEditModalOpen]);

  const fetchDetail = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const dateParam = filterTime && filterTime !== 'all' ? `&dateFilter=${filterTime}` : '';
      const response = await api.get(`/contacts/${id}?activities_limit=5&tasks_limit=5&notes_limit=5&deals_limit=5${searchParam}${dateParam}`);
      setData(response.data);
      setActivityPage(1);
      setNotePage(1);
      setDealPage(1);
      setTaskPage(1);
    } catch (err) {
      console.error("Fetch detail error", err);
      if (err.response?.status === 404) {
        navigate('/contacts');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchTabDetail = async (tabName, pageNum, limitVal = ITEMS_PER_PAGE, append = false) => {
    try {
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const dateParam = filterTime && filterTime !== 'all' ? `&dateFilter=${filterTime}` : '';
      const response = await api.get(`/contacts/${id}?type=${tabName}&page=${pageNum}&limit=${limitVal}${searchParam}${dateParam}`);
      setData(prev => {
        if (!prev) return prev;
        const responseData = response.data[tabName];
        if (!responseData) return prev;

        const newItems = responseData.data || [];
        const currentItems = append ? (prev[tabName]?.data || []) : [];

        // Merge items ensuring unique IDs
        const mergedData = [...currentItems];
        newItems.forEach(item => {
          if (!mergedData.some(existing => existing.id === item.id)) {
            mergedData.push(item);
          }
        });

        return {
          ...prev,
          [tabName]: {
            ...prev[tabName],
            ...responseData,
            data: mergedData
          }
        };
      });
    } catch (err) {
      console.error(`Fetch tab ${tabName} error`, err);
    }
  };

  const handleActivityLoadMore = () => {
    const nextPage = activityPage + 1;
    setActivityPage(nextPage);
    fetchTabDetail('activities', nextPage, ITEMS_PER_PAGE, true);
  };

  const handleNoteLoadMore = () => {
    const nextPage = notePage + 1;
    setNotePage(nextPage);
    fetchTabDetail('notes', nextPage, ITEMS_PER_PAGE, true);
  };

  const handleDealLoadMore = () => {
    const nextPage = dealPage + 1;
    setDealPage(nextPage);
    fetchTabDetail('deals', nextPage, ITEMS_PER_PAGE, true);
  };

  const handleTaskLoadMore = () => {
    const nextPage = taskPage + 1;
    setTaskPage(nextPage);
    fetchTabDetail('tasks', nextPage, ITEMS_PER_PAGE, true);
  };

  const handleActivityCollapse = () => {
    setActivityPage(1);
    setData(prev => {
      if (!prev || !prev.activities) return prev;
      return {
        ...prev,
        activities: {
          ...prev.activities,
          data: prev.activities.data.slice(0, 5)
        }
      };
    });
  };

  const handleNoteCollapse = () => {
    setNotePage(1);
    setData(prev => {
      if (!prev || !prev.notes) return prev;
      return {
        ...prev,
        notes: {
          ...prev.notes,
          data: prev.notes.data.slice(0, 5)
        }
      };
    });
  };

  const handleDealCollapse = () => {
    setDealPage(1);
    setData(prev => {
      if (!prev || !prev.deals) return prev;
      return {
        ...prev,
        deals: {
          ...prev.deals,
          data: prev.deals.data.slice(0, 5)
        }
      };
    });
  };

  const handleTaskCollapse = () => {
    setTaskPage(1);
    setData(prev => {
      if (!prev || !prev.tasks) return prev;
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          data: prev.tasks.data.slice(0, 5)
        }
      };
    });
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (isInitialMount.current) {
      fetchDetail(false);
      isInitialMount.current = false;
    } else {
      fetchDetail(true);
    }
  }, [id, debouncedSearch, filterTime]);

  useEffect(() => {
    if (data?.contact?.tenant_id) {
      addTaskFormik.setFieldValue('tenant_id', data.contact.tenant_id);
      addDealFormik.setFieldValue('tenant_id', data.contact.tenant_id);

      // Fetch staff for this tenant
      api.get(`/users?tenant_id=${data.contact.tenant_id}`)
        .then(res => setStaff(res.data.data || []))
        .catch(err => console.error("Fetch staff error", err));

      // Fetch contacts under this tenant for the Contact Partner dropdown
      api.get(`/contacts?tenant_id=${data.contact.tenant_id}&limit=100`)
        .then(res => setTenantContacts(res.data.data || []))
        .catch(err => console.error("Fetch tenant contacts error", err));
    }
  }, [data?.contact?.tenant_id]);

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

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/contacts/${id}`);
      toast.success('Contact deleted successfully');
      navigate('/contacts');
    } catch (err) {
      console.error("Delete contact error", err);
      toast.error('Failed to delete contact');
    }
  };

  const handleShareContact = () => {
    if (!contact) return;

    const lines = [
      `Name: ${[contact.first_name, contact.last_name].filter(Boolean).join(' ')}`,
      contact.email   ? `Email: ${contact.email}`     : null,
      contact.phone   ? `Phone: ${contact.phone}`     : null,
      contact.address ? `Address: ${contact.address}` : null,
    ].filter(Boolean);

    const text = lines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success('Contact details copied to clipboard!'))
        .catch(() => fallbackCopyToClipboard(text));
    } else {
      fallbackCopyToClipboard(text);
    }
  };


  const performCopyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          toast.success('Contact details copied to clipboard!');
        })
        .catch((err) => {
          fallbackCopyToClipboard(text);
        });
    } else {
      fallbackCopyToClipboard(text);
    }
  };

  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success('Contact details copied to clipboard!');
      } else {
        toast.error('Failed to copy contact details.');
      }
    } catch (err) {
      toast.error('Failed to copy contact details.');
    }
    document.body.removeChild(textArea);
  };

  const handleOpenEditModal = () => {
    if (!data?.contact) return;
    const { contact } = data;
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
      profession: contact.profession || '',
      assigned_to: contact.assigned_to || '',
      profile_image_url: contact.profile_image_url || '',
      address: contact.address || '',
      gst_no: contact.gst_no || '',
      gender: contact.gender || ''
    });

    if (isGlobalAdmin) {
      api.get('/tenants').then(res => setTenants(res.data.data || []));
    }

    setIsEditModalOpen(true);
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm("Delete this note?")) {
      await api.delete(`/notes/${noteId}`);
      fetchDetail(true);
    }
  };

  const handleOpenAddTask = () => {
    addTaskFormik.resetForm({
      values: {
        ...addTaskFormik.initialValues,
        tenant_id: data?.contact?.tenant_id || ''
      }
    });
    setUploadedFileName('');
    setIsAddTaskModalOpen(true);
  };

  const handleOpenAddDeal = () => {
    addDealFormik.resetForm({
      values: {
        ...addDealFormik.initialValues,
        tenant_id: data?.contact?.tenant_id || ''
      }
    });
    if (isGlobalAdmin && tenants.length === 0) {
      api.get('/tenants').then(res => setTenants(res.data.data || []));
    }
    setIsAddDealModalOpen(true);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await api.post('/tasks/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      addTaskFormik.setFieldValue('document_url', res.data.url);
      setUploadedFileName(res.data.fileName || file.name);
      toast.success('Document uploaded successfully');
    } catch (err) {
      console.error("Upload Error:", err);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  // (previous dropdown handling removed)

  if (loading) return <ContactDetailSkeleton />;
  if (!data) return null;

  const contact = data.contact || {};
  const tasks = data.tasks?.data || [];
  const deals = data.deals?.data || [];
  const notes = data.notes?.data || [];
  const activities = data.activities?.data || [];

  // 1. Dynamic Deal Value Calculation
  const totalDealValue = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);

  // Helper mappings
  const getCategoryProps = (category) => {
    switch ((category || '').toLowerCase()) {
      case 'call':
        return { badgeColor: '#16a34a', badgeBg: '#f0fdf4', title: 'Call',
          icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> };
      case 'whatsapp':
        return { badgeColor: '#25D366', badgeBg: '#e8fbf0', title: 'WhatsApp',
          icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> };
      case 'mail':
        return { badgeColor: '#8b5cf6', badgeBg: '#faf5ff', title: 'Mail',
          icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg> };
      case 'meeting':
        return { badgeColor: '#2563eb', badgeBg: '#eff6ff', title: 'Meeting',
          icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> };
      case 'sms':
        return { badgeColor: '#0ea5e9', badgeBg: '#f0f9ff', title: 'SMS',
          icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> };
      case 'linkedin':
        return { badgeColor: '#0a66c2', badgeBg: '#eff6ff', title: 'LinkedIn',
          icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg> };
      default:
        return null;
    }
  };

  const mapNote = (n) => {
    const hasTitle = n.title && n.title.trim() !== '' && n.title.toLowerCase() !== 'untitled';
    const displayTitle = hasTitle ? n.title : (n.category ? `${n.category} logged` : 'Note');
    return {
      id: `note-${n.id}`,
      originalId: n.id,
      type: 'note',
      date: new Date(n.created_at),
      title: displayTitle,
      subTitle: '',
      description: n.content,
      author: n.author_name || 'System',
      attachments: n.attachments,
      category: n.category,
      badgeColor: '#f97316',
      badgeBg: '#fffbeb',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      ),
      deal: n.deal
    };
  };

  const mapDeal = (d) => ({
    id: `deal-${d.id}`,
    originalId: d.id,
    type: 'deal',
    date: new Date(d.created_at),
    title: 'Deal associated',
    subTitle: d.deal_name,
    description: `New CRM Deal associated. Stage: <strong style="color: var(--primary); font-weight: 700; text-transform: uppercase; background-color: #eff6ff; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${d.stage?.replace('_', ' ')}</strong>. Value: <strong style="color: #2563eb; font-weight: 800; background-color: #eff6ff; padding: 2px 6px; border-radius: 4px; font-size: 12px;">₹${Number(d.value || 0).toLocaleString('en-IN')}</strong>`,
    author: d.assignee_name || 'System',
    badgeColor: '#1e3a8a', // Dark blue
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="6" rx="2" /><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><path d="M22 13a18.15 18.15 0 0 1-20 0" /><path d="M12 12h.01" />
      </svg>
    )
  });

  const mapTask = (t) => ({
    id: `task-${t.id}`,
    originalId: t.id,
    type: 'task',
    date: new Date(t.created_at),
    title: 'Task created',
    subTitle: t.title,
    taskDescription: t.description || 'No description provided.',
    description: `Task assigned. Priority: ${t.priority.toUpperCase()}. Due Date: ${t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No limit'}`,
    author: t.assignee_name || 'System',
    priority: t.priority,
    status: t.status,
    due_date: t.due_date,
    badgeColor: '#8b5cf6', // Purple
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    )
  });

  const mapGenericActivity = (act) => {
    const type = act.activity_type || act.type || 'activity';
    const isContactEvent = type.includes('contact');
    const isNoteActivity = type.includes('note');
    const catProps = act.category ? getCategoryProps(act.category) : null;
    const title = catProps
      ? `${catProps.title} logged`
      : isNoteActivity
        ? (act.title && act.title !== 'Untitled' ? act.title : 'Note')
        : (act.title || 'Activity');
    return {
      id: act.id,
      originalId: act.id,
      type: type,
      date: act.created_at ? new Date(act.created_at) : (act.date ? new Date(act.date) : new Date()),
      title,
      subTitle: '',
      description: (isNoteActivity && act.note_content) ? act.note_content : (act.description || ''),
      author: act.author_name || act.author || 'System',
      attachments: act.attachments || null,
      category: act.category || null,
      isNote: isNoteActivity,
      badgeColor: catProps ? catProps.badgeColor : (isContactEvent ? '#2563eb' : '#64748b'),
      badgeBg: catProps ? catProps.badgeBg : (isContactEvent ? '#eff6ff' : '#f1f5f9'),
      icon: catProps ? catProps.icon : isContactEvent ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      )
    };
  };

  const formatActivityItem = (act) => {
    const type = act.activity_type || act.type;
    if (type === 'note') return mapNote(act);
    if (type === 'deal') return mapDeal(act);
    if (type === 'task') return mapTask(act);
    return mapGenericActivity(act);
  };

  const activitiesToShow = activities.map(formatActivityItem);
  const notesToShow = notes.map(mapNote);
  const dealsToShow = deals.map(mapDeal);
  const tasksToShow = tasks.map(mapTask);

  // Timeline Filtering Logic
  const filteredActivities = activitiesToShow.filter(act => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(query);
      const matchSub = (act.subTitle || '').toLowerCase().includes(query);
      const matchDesc = (act.description || '').toLowerCase().includes(query);
      if (!matchTitle && !matchSub && !matchDesc) return false;
    }
    if (filterType !== 'all') {
      if (act.type !== filterType) return false;
    }
    if (filterTime !== 'all') {
      const now = new Date();
      const diffTime = Math.abs(now - act.date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (filterTime === 'today' && diffDays > 1) return false;
      if (filterTime === 'week' && diffDays > 7) return false;
      if (filterTime === 'month' && diffDays > 30) return false;
    }
    return true;
  });

  const filteredNotes = notesToShow.filter(act => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(query);
      const matchSub = (act.subTitle || '').toLowerCase().includes(query);
      const matchDesc = (act.description || '').toLowerCase().includes(query);
      if (!matchTitle && !matchSub && !matchDesc) return false;
    }
    return true;
  });

  const filteredDeals = dealsToShow.filter(act => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(query);
      const matchSub = (act.subTitle || '').toLowerCase().includes(query);
      const matchDesc = (act.description || '').toLowerCase().includes(query);
      if (!matchTitle && !matchSub && !matchDesc) return false;
    }
    return true;
  });

  const filteredTasks = tasksToShow.filter(act => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(query);
      const matchSub = (act.subTitle || '').toLowerCase().includes(query);
      const matchDesc = (act.description || '').toLowerCase().includes(query);
      if (!matchTitle && !matchSub && !matchDesc) return false;
    }
    return true;
  });

  const activitiesRemaining = (data?.activities?.pagination?.totalCount || 0) - activities.length;
  const notesRemaining = (data?.notes?.pagination?.totalCount || 0) - notes.length;
  const dealsRemaining = (data?.deals?.pagination?.totalCount || 0) - deals.length;
  const tasksRemaining = (data?.tasks?.pagination?.totalCount || 0) - tasks.length;

  return (
    <div className="contact-detail-workspace" style={{ padding: '0 0 24px 0', minHeight: '100vh', marginTop: '0', backgroundColor: 'hsl(0deg 0% 98.04%)' }}>
      <style>{`
        .contact-detail-grid {
          display: grid;
          grid-template-columns: minmax(310px, 340px) 1fr;
          gap: 20px;
          align-items: start;
        }
        
        .crm-left-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }

        .crm-right-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
        }

        .crm-card {
          background-color: #fff;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .quick-contact-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #eff6ff;
          color: #2563eb;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
        }

        .quick-contact-btn:hover {
          background-color: #dbeafe;
          transform: translateY(-1px);
        }

        .deal-summary-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid #f1f5f9;
          transition: background-color 0.15s;
        }

        .deal-summary-item:hover {
          background-color: #f8fafc;
        }

        .crm-tab-btn {
          padding: 14px 20px;
          font-size: 13.5px;
          font-weight: 700;
          color: #64748b;
          border: none;
          background: transparent;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          border-radius: 0;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .crm-tab-btn.active {
          color: hsl(218.71deg 90.89% 73.35%);
          border-bottom-color: #2563eb;
        }

        .timeline-line {
          position: absolute;
          left: 21px;
          top: 28px;
          bottom: 4px;
          width: 2px;
          background-color: #f1f5f9;
        }

        .timeline-item-container {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding-bottom: 8px;
        }

        .timeline-item-container:last-child {
          padding-bottom: 0;
        }

        .timeline-node {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          flex-shrink: 0;
          border: 3px solid #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        @media (max-width: 1024px) {
          .contact-detail-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }

        @media (max-width: 768px) {
          .contact-detail-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
            margin-bottom: 12px !important;
          }

          .contact-detail-header-actions {
            width: 100% !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
          }

          .contact-detail-header-actions button {
            flex: 1 1 calc(50% - 4px) !important;
            min-width: 120px !important;
            padding: 8px 10px !important;
            font-size: 12.5px !important;
            justify-content: center !important;
          }

          div.crm-card {
            padding: 16px !important;
          }

          .profile-top-info {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 12px !important;
          }

          .profile-top-info h2 {
            text-align: center !important;
            justify-content: center !important;
          }

          .profile-top-info div {
            justify-content: center !important;
          }

          .profile-structured-rows span {
            word-break: break-word !important;
            white-space: normal !important;
          }

          .contact-detail-tabs {
            display: flex !important;
            width: 100% !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
          }

          .contact-detail-tabs::-webkit-scrollbar {
            display: none !important;
          }

          .crm-tab-btn {
            flex-shrink: 0 !important;
            flex-grow: 1 !important;
            justify-content: center !important;
            padding: 12px 16px !important;
            font-size: 13px !important;
            white-space: nowrap !important;
          }

          .tab-list-filters-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
            padding: 14px 16px !important;
          }

          . > div:first-child {
            max-width: 100% !important;
            width: 100% !important;
          }

          .tab-list-filters-bar > div:last-child {
            width: 100% !important;
            display: flex !important;
            gap: 8px !important;
          }

          .tab-list-filters-bar > div:last-child > select {
            flex: 1 !important;
            width: auto !important;
          }
        }

        @media (max-width: 600px) {
          .deal-item-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
            padding: 12px 16px !important;
          }

          .deal-item-row > div:last-child {
            text-align: left !important;
            width: 100% !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
        }
      `}</style>

      {/* Breadcrumbs & Header Actions */}
      <div className="contact-detail-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0 16px 0',
        marginBottom: '8px'
      }}>
        {/* Left: Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <Link to="/contacts" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: '500', transition: 'color 0.15s ease' }} onMouseEnter={(e) => e.currentTarget.style.color = '#64748b'} onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}>Contacts</Link>
          <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
          </span>
          <span style={{ color: '#0f172a', fontWeight: '700' }}>{contact.first_name} {contact.last_name || ''}</span>
        </div>

        {/* Right: Actions */}
        <div className="contact-detail-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #fee2e2',
              backgroundColor: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              color: '#ef4444',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#fef2f2';
              e.currentTarget.style.borderColor = '#fca5a5';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#fff';
              e.currentTarget.style.borderColor = '#fee2e2';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete Contact
          </button>

          <button
            onClick={handleShareContact}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#fff';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#475569' }}>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share Contact
          </button>

          <button
            onClick={handleOpenEditModal}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            Edit Contact
          </button>
        </div>
      </div>

      {/* Snug Grid Layout */}
      <div className="contact-detail-grid">

        {/* Left Sidebar (25%) */}
        <aside className="crm-left-col">
          {/* Profile Card */}
          <div className="crm-card" style={{ padding: '24px', border: '1px solid #e2e8f0', borderRadius: '16px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
            {/* Top Avatar & Name Info Section */}
            <div className="profile-top-info" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {contact.profile_image_url ? (
                  <img src={getFileUrl(contact.profile_image_url)} alt="Profile" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2e8f0' }} />
                ) : (
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #dbeafe',
                    flexShrink: 0
                  }}>
                    {/* Cute SVG Owl Avatar! */}
                    <svg width="42" height="42" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="32" cy="36" r="20" fill="#1e3a8a" />
                      <path d="M16 28C16 20 22 16 32 16C42 16 48 20 48 28C48 30 45 32 32 32C19 32 16 30 16 28Z" fill="#2563eb" />
                      <circle cx="23" cy="28" r="8" fill="#ffffff" />
                      <circle cx="41" cy="28" r="8" fill="#ffffff" />
                      <circle cx="23" cy="28" r="4" fill="#0f172a" />
                      <circle cx="41" cy="28" r="4" fill="#0f172a" />
                      <circle cx="24.5" cy="26.5" r="1.5" fill="#ffffff" />
                      <circle cx="42.5" cy="26.5" r="1.5" fill="#ffffff" />
                      <polygon points="32,32 29,37 35,37" fill="#f59e0b" />
                      <path d="M18 20L26 23L20 16Z" fill="#1e3a8a" />
                      <path d="M46 20L38 23L44 16Z" fill="#1e3a8a" />
                      <path d="M26 44C29 42 35 42 38 44" stroke="#bfdbfe" strokeWidth="2" strokeLinecap="round" />
                      <path d="M28 48C30 46 34 46 36 48" stroke="#bfdbfe" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
                    {contact.first_name} {contact.last_name || ''}
                  </h2>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '850', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {contact.status || 'LEAD'}
                    </span>
                    <span style={{ color: '#fbbf24', fontSize: '12px', display: 'flex', alignItems: 'center' }}>★</span>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>
                  {contact.job_title || 'Consultant'} at {contact.company_name || 'neptune'}
                </div>
              </div>
            </div>

            {/* Social Quick Contact Toolbar Pills (Email, Call, WhatsApp only) */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', width: '100%' }}>
              {/* Email pill with app-picker dropdown */}
              <div ref={emailDropdownRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    if (!contact.email) { toast.error('No email address available for this contact.'); return; }
                    setShowEmailDropdown(prev => !prev);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: '20px',
                    border: '1px solid #e2e8f0', backgroundColor: '#fff',
                    fontSize: '12px', fontWeight: '600', color: contact.email ? '#475569' : '#94a3b8',
                    cursor: contact.email ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease', outline: 'none'
                  }}
                  onMouseOver={(e) => { if (contact.email) { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: contact.email ? '#64748b' : '#94a3b8' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  Email
                </button>

                {showEmailDropdown && contact.email && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                    backgroundColor: '#fff', borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 30px -5px rgba(0,0,0,0.12), 0 4px 8px -2px rgba(0,0,0,0.06)',
                    zIndex: 9999, minWidth: '210px', overflow: 'hidden'
                  }}>
                    <div style={{ padding: '8px 12px 6px', fontSize: '10px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Open email with
                    </div>
                    {[
                      {
                        label: 'Gmail',
                        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" fill="#fff" stroke="#e2e8f0" strokeWidth="1.5"/><path d="M22 6l-10 7L2 6" stroke="#EA4335" strokeWidth="2" strokeLinecap="round"/></svg>,
                        color: '#EA4335',
                        action: () => { window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(contact.email)}`, '_blank'); logMailActivity(); setShowEmailDropdown(false); }
                      },
                      {
                        label: 'Outlook Web',
                        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="#0078D4"><rect x="2" y="4" width="20" height="16" rx="2" fill="#0078D4"/><path d="M2 8l10 6 10-6" stroke="#fff" strokeWidth="1.5"/></svg>,
                        color: '#0078D4',
                        action: () => { window.open(`https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(contact.email)}`, '_blank'); logMailActivity(); setShowEmailDropdown(false); }
                      },
                      {
                        label: 'Yahoo Mail',
                        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="#6001D2"><rect x="2" y="4" width="20" height="16" rx="2" fill="#6001D2"/><path d="M2 8l10 6 10-6" stroke="#fff" strokeWidth="1.5"/></svg>,
                        color: '#6001D2',
                        action: () => { window.open(`https://compose.mail.yahoo.com/?to=${encodeURIComponent(contact.email)}`, '_blank'); logMailActivity(); setShowEmailDropdown(false); }
                      },
                      {
                        label: 'Default Mail App',
                        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
                        color: '#475569',
                        action: () => { window.location.href = `mailto:${contact.email}`; logMailActivity(); setShowEmailDropdown(false); }
                      },
                    ].map((opt) => (
                      <button key={opt.label} onClick={opt.action} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        width: '100%', padding: '9px 14px',
                        background: 'none', border: 'none',
                        fontSize: '13px', fontWeight: '500', color: '#1e293b',
                        cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s'
                      }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </button>
                    ))}
                    <div style={{ borderTop: '1px solid #f1f5f9', padding: '6px 8px' }}>
                      <button onClick={() => { navigator.clipboard.writeText(contact.email); toast.success('Email address copied!'); setShowEmailDropdown(false); }} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        width: '100%', padding: '8px 6px',
                        background: 'none', border: 'none',
                        fontSize: '12px', fontWeight: '500', color: '#64748b',
                        cursor: 'pointer', textAlign: 'left', borderRadius: '8px'
                      }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy email address
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={e => handleQuickContactClick(e, 'call', contact.phone)} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none'
              }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#64748b' }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                Call
              </button>

              <button onClick={e => handleQuickContactClick(e, 'whatsapp', contact.phone)} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none'
              }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#16a34a' }}>
                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
                </svg>
                WhatsApp
              </button>
            </div>

            {/* Structured Rows List redesign as detailed border cards */}
            <div className="profile-structured-rows" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px', marginTop: '24px' }}>

              {/* Row 1: Email — opens same app-picker dropdown */}
              <div
                onClick={() => {
                  if (!contact.email) { toast.error('No email address available for this contact.'); return; }
                  setShowEmailDropdown(prev => !prev);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: contact.email ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (contact.email) {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Email</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact.email || 'N/A'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 2: Phone */}
              <div
                onClick={() => contact.phone && handleQuickContactClick(null, 'call', contact.phone)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: contact.phone ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (contact.phone) {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Phone</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact.phone || 'N/A'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 3: Work */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="14" x="2" y="6" rx="2" /><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><path d="M12 12h.01" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Work</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      N/A
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 4: Company (Respective Navigation to /tenants/:id) */}
              <div
                onClick={() => contact.tenant_id && navigate(`/tenants/${contact.tenant_id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: contact.tenant_id ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (contact.tenant_id) {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                      <path d="M6 12H4a2 2 0 0 0-2 2v8" />
                      <path d="M18 16h2a2 2 0 0 1 2 2v4" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Company</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: contact.tenant_id ? '#2563eb' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact.company_name || 'N/A'}
                    </span>
                  </div>
                </div>
                <span style={{ color: contact.tenant_id ? '#2563eb' : '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 5: Industry */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="8" y1="19" x2="16" y2="19" /><line x1="12" y1="14" x2="12" y2="19" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Industry</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact.profession || 'N/A'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 6: Source */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: 'default',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Source</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact.source || 'N/A'}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

              {/* Row 7: Owner (Respective Navigation to /users/:id) */}
              <div
                onClick={() => contact.assigned_to && navigate(`/users/${contact.assigned_to}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#fff',
                  cursor: contact.assigned_to ? 'pointer' : 'default',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (contact.assigned_to) {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Owner</span>
                    <span style={{ fontSize: '13px', fontWeight: '750', color: contact.assigned_to ? '#2563eb' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact.tenants?.owner?.name || 'leetcode'}
                    </span>
                  </div>
                </div>
                <span style={{ color: contact.assigned_to ? '#2563eb' : '#cbd5e1', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </span>
              </div>

            </div>
          </div>

          {/* Deals Card */}
          <div className="crm-card" style={{ padding: '0px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: 'hsl(0deg 0% 99.61%)', overflow: 'hidden' }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '14.5px', fontWeight: '600', color: '#0f172a', margin: 0 }}>
                Deals ({deals.length})
              </h3>
              <button
                onClick={() => setActiveTab('deals')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontWeight: '600',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                View all
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>

            {/* Deals list */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {deals.length === 0 ? (
                <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                  No deals linked.
                </div>
              ) : (
                deals.slice(0, 3).map((d, index) => {
                  const colorsList = [
                    {
                      bg: '#eff6ff',
                      icon: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                          <polyline points="17 6 23 6 23 12" />
                        </svg>
                      )
                    },
                    {
                      bg: '#f5f3ff',
                      icon: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      )
                    },
                    {
                      bg: '#fff7ed',
                      icon: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      )
                    }
                  ];
                  const cScheme = colorsList[index % colorsList.length];

                  // Setup status styling matching mockup exactly
                  let statusBg = '#eff6ff';
                  let statusColor = '#2563eb';
                  let statusLabel = 'In Progress';

                  if (d.status?.toLowerCase() === 'won') {
                    statusBg = '#eff6ff';
                    statusColor = '#2563eb';
                    statusLabel = 'Won';
                  } else if (d.status?.toLowerCase() === 'lost') {
                    statusBg = '#fef2f2';
                    statusColor = '#dc2626';
                    statusLabel = 'Lost';
                  } else if (d.status?.toLowerCase() === 'proposal') {
                    statusBg = '#fff7ed';
                    statusColor = '#ea580c';
                    statusLabel = 'Proposal';
                  }

                  return (
                    <div key={d.id} className="deal-item-row" style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 20px',
                      borderBottom: index === Math.min(deals.length, 3) - 1 ? 'none' : '1px solid #f1f5f9'
                    }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0 }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: cScheme.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {cScheme.icon}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.deal_name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: '400' }}>
                            {contact.company_name || 'Acme Inc.'}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                          ${Number(d.value).toLocaleString()}
                        </div>
                        <div style={{ display: 'inline-flex', marginTop: '4px' }}>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: '600',
                            color: statusColor,
                            backgroundColor: statusBg,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            textTransform: 'capitalize'
                          }}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total Deals Summary Banner */}
            <div style={{
              padding: '16px 20px',
              backgroundColor: 'hsl(0deg 0% 99.61%)',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Total Deal Value</span>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                ${totalDealValue.toLocaleString()}
              </span>
            </div>
          </div>
        </aside>

        {/* Right Workspace (75%) */}
        <main className="crm-right-col">

          {/* Quick Action Cards Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '14px',
            width: '100%',
            marginBottom: '16px'
          }}>
            {/* Add Note Card */}
            <div
              onClick={() => {
                setIsNoteEditorExpanded(!isNoteEditorExpanded);
                if (!isNoteEditorExpanded) {
                  setTimeout(() => {
                    const el = document.getElementById('note-title-input');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.focus();
                    }
                  }, 150);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', whiteSpace: 'nowrap' }}>Add Note</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Add a new note</span>
              </div>
            </div>

            {/* Add Deal Card */}
            <div
              onClick={handleOpenAddDeal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#16a34a';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="14" x="2" y="6" rx="2" /><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', whiteSpace: 'nowrap' }}>Add Deal</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Create a new deal</span>
              </div>
            </div>

            {/* Add Task Card */}
            <div
              onClick={handleOpenAddTask}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', whiteSpace: 'nowrap' }}>Add Task</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Create a new task</span>
              </div>
            </div>

            {/* Call Card */}
            <div
              onClick={e => handleQuickContactClick(e, 'call', contact.phone)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', whiteSpace: 'nowrap' }}>Call</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Quick call</span>
              </div>
            </div>

            {/* WhatsApp Card */}
            <div
              onClick={e => handleQuickContactClick(e, 'whatsapp', contact.phone)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#16a34a';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: '750', color: '#0f172a', whiteSpace: 'nowrap' }}>WhatsApp</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Send message</span>
              </div>
            </div>
          </div>
          {/* ── Note Editor Card ─────────────────────────────────── */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '18px 20px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease'
          }}>
            {/* Collapse / Expand Toggle Header */}
            <div
              onClick={() => setIsNoteEditorExpanded(!isNoteEditorExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
                paddingBottom: isNoteEditorExpanded ? '14px' : '0',
                borderBottom: isNoteEditorExpanded ? '1px solid #f1f5f9' : 'none',
                marginBottom: isNoteEditorExpanded ? '14px' : '0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                </div>
                <span style={{ fontSize: '14.5px', fontWeight: '750', color: '#0f172a' }}>Add Note</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isNoteEditorExpanded && <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Click to expand</span>}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"
                  style={{ transform: isNoteEditorExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            {isNoteEditorExpanded && (
              <>
                {/* Row 1 — Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <input
                    id="note-title-input"
                    type="text"
                    placeholder="Add Note Title"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: '#111827',
                      backgroundColor: 'transparent',
                      width: '100%',
                      padding: '0'
                    }}
                  />
                </div>

                {/* Category Selection Dropdown */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '7px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                      <line x1="4" y1="22" x2="4" y2="15" />
                    </svg>
                    <span style={{
                      fontSize: '10.5px', fontWeight: '700', color: '#9ca3af',
                      textTransform: 'uppercase', letterSpacing: '0.6px'
                    }}>
                      Category:
                    </span>
                  </div>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '13.5px',
                      color: '#1e293b',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">No Category</option>
                    <option value="Call">Call</option>
                    <option value="Whatsapp">Whatsapp</option>
                    <option value="Mail">Mail</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Sms">Sms</option>
                    <option value="LinkedIn">LinkedIn</option>
                  </select>
                </div>

                {/* Row 2 — Deal label + dropdown */}
                <div style={{ position: 'relative', marginBottom: '14px' }}>
                  {/* "🔒 LINK TO ACTIVE DEAL:" label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '7px' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span style={{
                      fontSize: '10.5px', fontWeight: '700', color: '#9ca3af',
                      textTransform: 'uppercase', letterSpacing: '0.6px'
                    }}>
                      Link to Active Deal:
                    </span>
                  </div>

                  {!selectedDealId ? (
                    <>
                      {/* Dashed select button */}
                      <button
                        type="button"
                        onClick={() => setShowDealDropdown(!showDealDropdown)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          width: '100%', padding: '9px 12px',
                          border: '1px dashed #d1d5db', borderRadius: '8px',
                          backgroundColor: '#ffffff', cursor: 'pointer',
                          outline: 'none', textAlign: 'left',
                          transition: 'border-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#818cf8'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                      >
                        <span style={{ fontSize: '13.5px', color: '#9ca3af', fontWeight: '400' }}>
                          Select a deal to associate with this note...
                        </span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                          style={{ flexShrink: 0, transform: showDealDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      {/* Dropdown list */}
                      {showDealDropdown && deals.length > 0 && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                          zIndex: 300, maxHeight: '220px', overflowY: 'auto',
                          backgroundColor: '#ffffff', border: '1px solid #e5e7eb',
                          borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: '6px'
                        }}>
                          {deals.map(d => (
                            <div
                              key={d.id}
                              onClick={() => { setSelectedDealId(d.id); setShowDealDropdown(false); }}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                                transition: 'background-color 0.12s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>{d.deal_name}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                                  Stage: <strong style={{ color: '#3b82f6', textTransform: 'uppercase' }}>{d.stage?.replace('_', ' ')}</strong>
                                </div>
                              </div>
                              <span style={{
                                fontSize: '12px', fontWeight: '700', color: '#2563eb',
                                backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '5px', flexShrink: 0
                              }}>
                                ${Number(d.value || 0).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Empty state when no deals */}
                      {showDealDropdown && deals.length === 0 && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                          zIndex: 300, backgroundColor: '#ffffff', border: '1px solid #e5e7eb',
                          borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: '20px',
                          textAlign: 'center', fontSize: '13px', color: '#94a3b8'
                        }}>
                          No deals associated with this contact
                        </div>
                      )}
                    </>
                  ) : (
                    /* Selected deal chip */
                    (() => {
                      const selectedDeal = deals.find(d => d.id === selectedDealId);
                      if (!selectedDeal) return null;
                      return (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '9px 12px', borderRadius: '8px',
                          border: '1px solid #bfdbfe', backgroundColor: '#eff6ff'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '6px',
                              backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', color: '#2563eb', flexShrink: 0
                            }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <rect width="20" height="14" x="2" y="6" rx="2" />
                                <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                              </svg>
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e3a8a' }}>{selectedDeal.deal_name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
                                <span style={{
                                  fontSize: '9.5px', fontWeight: '700', backgroundColor: '#dbeafe',
                                  color: '#1e40af', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase'
                                }}>
                                  {selectedDeal.stage?.replace('_', ' ')}
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb' }}>
                                  ${Number(selectedDeal.value || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button" onClick={() => setSelectedDealId('')} title="Unlink Deal"
                            style={{
                              border: 'none', background: '#dbeafe', color: '#1e40af',
                              width: '20px', height: '20px', borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', fontSize: '14px', fontWeight: '800',
                              outline: 'none', transition: 'all 0.15s ease', flexShrink: 0
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fecaca'; e.currentTarget.style.color = '#dc2626'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe'; e.currentTarget.style.color = '#1e40af'; }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Row 3 — Rich text editor (has its own border per mockup) */}
                <NoteEditor
                  contactId={id}
                  dealId={selectedDealId}
                  tenantId={contact.tenant_id}
                  onSave={() => {
                    setNoteTitle('');
                    setSelectedDealId('');
                    setNoteCategory('');
                    setIsNoteEditorExpanded(false);
                    fetchDetail(true);
                  }}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: 'none',
                    overflow: 'hidden'
                  }}
                  minHeight="90px"
                  hideTitle={true}
                  placeholder={`Write a note about ${contact.first_name} ${contact.last_name || ''}..`}
                  externalTitle={noteTitle}
                  setExternalTitle={setNoteTitle}
                  category={noteCategory}
                  setCategory={setNoteCategory}
                />
              </>
            )}

          </div>
          {/* ── /Note Editor Card ─────────────────────────────────── */}

          <CRMWorkspaceTabs
            tabs={[
              {
                id: 'activities',
                label: 'All Activities',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: activeTab === 'activities' ? '#2563eb' : '#64748b' }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              },
              {
                id: 'notes',
                label: 'Notes',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: activeTab === 'notes' ? '#2563eb' : '#64748b' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
                count: data?.notes?.pagination?.totalCount || 0
              },
              {
                id: 'deals',
                label: 'Deals',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: activeTab === 'deals' ? '#2563eb' : '#64748b' }}><rect width="20" height="14" x="2" y="6" rx="2" /><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><path d="M22 13a18.15 18.15 0 0 1-20 0" /><path d="M12 12h.01" /></svg>,
                count: data?.deals?.pagination?.totalCount || 0
              },
              {
                id: 'tasks',
                label: 'Tasks',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: activeTab === 'tasks' ? '#2563eb' : '#64748b' }}><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
                count: data?.tasks?.pagination?.totalCount || 0
              }
            ]}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchPlaceholder={activeTab === 'activities' ? "Search activities..." : activeTab === 'notes' ? "Search notes..." : activeTab === 'deals' ? "Search deals..." : "Search tasks..."}
            filterType={filterType}
            setFilterType={setFilterType}
            filterTime={filterTime}
            setFilterTime={setFilterTime}
            showFilterType={activeTab === 'activities'}
            showFilterTime={true}
            filterTypeOptions={[
              { value: 'all', label: 'All Types' },
              { value: 'note', label: 'Notes Only' },
              { value: 'task', label: 'Tasks Only' },
              { value: 'deal', label: 'Deals Only' }
            ]}
            filterTimeOptions={[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'Past Week' },
              { value: 'month', label: 'Past Month' }
            ]}
          >
            {/* Tab 1: activities timeline */}
            {activeTab === 'activities' && (
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {filteredActivities.length > 0 && <div className="timeline-line" />}

                {filteredActivities.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#64748b', textAlign: 'center' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px',
                      border: '1px solid #e2e8f0',
                      color: '#94a3b8'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>No activities found</div>
                    <div style={{ fontSize: '12.5px', color: '#94a3b8', maxWidth: '280px' }}>Try adjusting your search query or selecting a different filter.</div>
                  </div>
                ) : (
                  filteredActivities.map((act) => (
                    <div key={act.id} className="timeline-item-container">

                      {/* Timeline Node Badge Icon (Snug size) */}
                      <div
                        className="timeline-node"
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: act.badgeBg || (act.badgeColor === '#f97316' ? '#fffbeb' : act.badgeColor === '#1e3a8a' ? '#eff6ff' : act.badgeColor === '#8b5cf6' ? '#faf5ff' : '#f1f5f9'),
                          color: act.badgeColor,
                          border: '3px solid #fff',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                          flexShrink: 0,
                          zIndex: 2
                        }}
                      >
                        {act.icon}
                      </div>

                      {/* Timeline snug info card */}
                      <div style={{
                        flex: 1,
                        backgroundColor: '#ffffff',
                        padding: '6px 0px 8px 0px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '16px'
                      }}>
                        {/* LEFT COLUMN: Title & Description */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                              {act.title}
                            </h4>
                            {act.subTitle && (
                              <div style={{ fontSize: '12px', fontWeight: '600', color: '#2563eb', marginBottom: '1px' }}>
                                {act.subTitle}
                              </div>
                            )}
                            <div
                              style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5', wordBreak: 'break-word', fontWeight: '400' }}
                              dangerouslySetInnerHTML={{ __html: act.description }}
                            />
                          </div>

                          {(act.type?.includes('note') || act.type === 'audio_not_created' || act.type === 'audio_note_created') && act.attachments && act.attachments.length > 0 && (
                            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {act.attachments.map((file, idx) => {
                                const isAudio = file.type?.startsWith('audio/') || file.name?.match(/\.(webm|wav|ogg|mp3|m4a)$/i);
                                if (isAudio && file.url) {
                                  return (
                                    <div key={idx} style={{
                                      display: 'flex', alignItems: 'center', gap: '8px',
                                      padding: '6px 10px', backgroundColor: '#fff1f2',
                                      border: '1px solid #fecdd3', borderRadius: '8px'
                                    }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                      </svg>
                                      <audio controls src={getFileUrl(file.url)} style={{ flex: 1, height: '28px', outline: 'none' }} preload="metadata" />
                                      <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                                    </div>
                                  );
                                }
                                return (
                                  <a
                                    key={idx}
                                    href={getFileUrl(file.url)}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 8px',
                                      backgroundColor: '#fff',
                                      borderRadius: '4px',
                                      textDecoration: 'none',
                                      color: 'var(--primary)',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      border: '1px solid #e2e8f0'
                                    }}
                                  >
                                    📎 {file.name}
                                  </a>
                                );
                              })}
                            </div>
                          )}

                          {act.type === 'note' && act.deal && (
                            <Link
                              to={`/deals/${act.deal.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                backgroundColor: '#eff6ff',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                color: '#1e40af',
                                fontSize: '11px',
                                fontWeight: '700',
                                border: '1px solid #bfdbfe',
                                marginTop: '6px',
                                width: 'fit-content',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#dbeafe';
                                e.currentTarget.style.borderColor = '#93c5fd';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#eff6ff';
                                e.currentTarget.style.borderColor = '#bfdbfe';
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#2563eb' }}>
                                <rect width="20" height="14" x="2" y="6" rx="2" />
                                <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                              </svg>
                              <span>Linked Deal: <strong>{act.deal.deal_name}</strong> (₹{Number(act.deal.value).toLocaleString('en-IN')})</span>
                            </Link>
                          )}
                        </div>

                        {/* RIGHT COLUMN: Date & Avatar/Name */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                          <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '500' }}>
                            {formatRelativeDate(act.date)}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              fontSize: '10px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              overflow: 'hidden'
                            }}>
                              <span style={{ textTransform: 'uppercase' }}>{(act.author || 'U')[0]}</span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                              {act.author || 'User'}
                            </span>
                          </div>

                          {(act.type === 'note' || act.type === 'audio_not_created' || act.type === 'audio_note_created') && (
                            <button
                              onClick={() => handleDeleteNote(act.originalId)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#dc2626',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                opacity: 0.7,
                                marginTop: '4px',
                                padding: 0
                              }}
                              onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                              onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                            >
                              Delete note
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Horizontal Line Partition intersecting with Vertical Line */}
                      <div style={{
                        position: 'absolute',
                        left: '8px',
                        right: '0',
                        bottom: '0',
                        height: '1px',
                        backgroundColor: '#f1f5f9',
                        zIndex: 1
                      }} />
                    </div>
                  ))
                )}

                {(activitiesRemaining > 0 || activities.length > 5) && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', marginBottom: '12px' }}>
                    {activitiesRemaining > 0 && (
                      <button
                        onClick={handleActivityLoadMore}
                        style={{
                          padding: '4px 6px',
                          backgroundColor: 'transparent',
                          color: 'hsl(219.81deg 84.06% 50.78%)',
                          border: 'none',
                          borderRadius: '0',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'color 0.15s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.color = 'rgb(24 82 215)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = 'hsl(219.81deg 84.06% 50.78%)'; }}
                      >
                        Load More ({activitiesRemaining})
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    )}
                    {activities.length > 5 && (
                      <button
                        onClick={handleActivityCollapse}
                        style={{
                          padding: '4px 6px',
                          backgroundColor: 'transparent',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '0',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'color 0.15s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.color = '#b91c1c'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                      >
                        Show Less
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                          <path d="m18 15-6-6-6 6" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Notes Detailed View */}
            {activeTab === 'notes' && (
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {filteredNotes.length > 0 && <div className="timeline-line" />}

                {filteredNotes.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#64748b', textAlign: 'center' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: '#fff7ed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px',
                      border: '1px solid #ffedd5',
                      color: '#ea580c'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>No notes found</div>
                    <div style={{ fontSize: '12.5px', color: '#94a3b8', maxWidth: '280px' }}>Try adding a note above or adjusting your search criteria.</div>
                  </div>
                ) : (
                  filteredNotes.map((act) => (
                    <div key={act.id} className="timeline-item-container">
                      {/* Timeline Node Badge Icon (Snug size) */}
                      <div
                        className="timeline-node"
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: act.badgeBg || '#fffbeb',
                          color: act.badgeColor || '#f97316',
                          border: '3px solid #fff',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                          flexShrink: 0,
                          zIndex: 2
                        }}
                      >
                        {act.icon}
                      </div>

                      {/* Timeline snug info card */}
                      <div style={{
                        flex: 1,
                        backgroundColor: '#ffffff',
                        padding: '6px 0px 8px 0px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '16px'
                      }}>
                        {/* LEFT COLUMN: Title & Description */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                                {act.title}
                              </h4>
                              {act.isNote && (
                                <span style={{
                                  fontSize: '9px',
                                  fontWeight: '700',
                                  color: '#16a34a',
                                  backgroundColor: '#f1f5f9',
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  letterSpacing: '0.02em',
                                  border: '1px solid #e2e8f0'
                                }}>Note</span>
                              )}
                            </div>
                            <div
                              style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5', wordBreak: 'break-word', fontWeight: '400' }}
                              dangerouslySetInnerHTML={{ __html: act.description }}
                            />
                          </div>

                          {act.attachments && act.attachments.length > 0 && (
                            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {act.attachments.map((file, idx) => {
                                const isAudio = file.type?.startsWith('audio/') || file.name?.match(/\.(webm|wav|ogg|mp3|m4a)$/i);
                                if (isAudio && file.url) {
                                  return (
                                    <div key={idx} style={{
                                      display: 'flex', alignItems: 'center', gap: '8px',
                                      padding: '6px 10px', backgroundColor: '#fff1f2',
                                      border: '1px solid #fecdd3', borderRadius: '8px'
                                    }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                      </svg>
                                      <audio controls src={getFileUrl(file.url)} style={{ flex: 1, height: '28px', outline: 'none' }} preload="metadata" />
                                      <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                                    </div>
                                  );
                                }
                                return (
                                  <a
                                    key={idx}
                                    href={getFileUrl(file.url)}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 8px',
                                      backgroundColor: '#fff',
                                      borderRadius: '4px',
                                      textDecoration: 'none',
                                      color: 'var(--primary)',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      border: '1px solid #e2e8f0'
                                    }}
                                  >
                                    📎 {file.name}
                                  </a>
                                );
                              })}
                            </div>
                          )}

                          {act.deal && (
                            <Link
                              to={`/deals/${act.deal.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                backgroundColor: '#eff6ff',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                color: '#1e40af',
                                fontSize: '11px',
                                fontWeight: '700',
                                border: '1px solid #bfdbfe',
                                marginTop: '6px',
                                width: 'fit-content',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#dbeafe';
                                e.currentTarget.style.borderColor = '#93c5fd';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#eff6ff';
                                e.currentTarget.style.borderColor = '#bfdbfe';
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#2563eb' }}>
                                <rect width="20" height="14" x="2" y="6" rx="2" />
                                <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                              </svg>
                              <span>Linked Deal: <strong>{act.deal.deal_name}</strong> (₹{Number(act.deal.value).toLocaleString('en-IN')})</span>
                            </Link>
                          )}
                        </div>

                        {/* RIGHT COLUMN: Date & Avatar/Name */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                          <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '500' }}>
                            {formatRelativeDate(act.date)}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              fontSize: '10px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              overflow: 'hidden'
                            }}>
                              <span style={{ textTransform: 'uppercase' }}>{act.author[0] || 'U'}</span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                              {act.author || 'User'}
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteNote(act.originalId)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#dc2626',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              opacity: 0.7,
                              marginTop: '4px',
                              padding: 0
                            }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                            onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                          >
                            Delete note
                          </button>
                        </div>
                      </div>

                      {/* Horizontal Line Partition intersecting with Vertical Line */}
                      <div style={{
                        position: 'absolute',
                        left: '8px',
                        right: '0',
                        bottom: '0',
                        height: '1px',
                        backgroundColor: '#f1f5f9',
                        zIndex: 1
                      }} />
                    </div>
                  ))
                )}

                {(notesRemaining > 0 || notes.length > 5) && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', marginBottom: '12px' }}>
                    {notesRemaining > 0 && (
                      <button
                        onClick={handleNoteLoadMore}
                        style={{
                          padding: '4px 6px',
                          backgroundColor: 'transparent',
                          color: 'hsl(219.81deg 84.06% 50.78%)',
                          border: 'none',
                          borderRadius: '0',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'color 0.15s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.color = 'rgb(24 82 215)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = 'hsl(219.81deg 84.06% 50.78%)'; }}
                      >
                        Load More ({notesRemaining})
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    )}
                    {notes.length > 5 && (
                      <button
                        onClick={handleNoteCollapse}
                        style={{
                          padding: '4px 6px',
                          backgroundColor: 'transparent',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '0',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'color 0.15s'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.color = '#b91c1c'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                      >
                        Show Less
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                          <path d="m18 15-6-6-6 6" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Deals Detailed View */}
            {activeTab === 'deals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {filteredDeals.length > 0 && <div className="timeline-line" />}

                  {filteredDeals.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#64748b', textAlign: 'center' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: '#f0fdf4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        border: '1px solid #dcfce7',
                        color: '#16a34a'
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="6" rx="2" /><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>No deals associated</div>
                      <div style={{ fontSize: '12.5px', color: '#94a3b8', maxWidth: '280px' }}>This contact doesn't have any deals linked. Click "Add Deal" above to link one.</div>
                    </div>
                  ) : (
                    <>
                      {filteredDeals.map((act) => (
                        <div key={act.id} className="timeline-item-container">
                          {/* Timeline Node Badge Icon */}
                          <div
                            className="timeline-node"
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: act.badgeBg || '#eff6ff',
                              color: act.badgeColor || '#1e3a8a',
                              border: '3px solid #fff',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                              flexShrink: 0,
                              zIndex: 2
                            }}
                          >
                            {act.icon}
                          </div>

                          {/* Timeline snug info card */}
                          <div style={{
                            flex: 1,
                            backgroundColor: '#ffffff',
                            padding: '6px 0px 8px 0px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '16px'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                                    {act.title}
                                  </h4>
                                  {act.isNote && (
                                    <span style={{
                                      fontSize: '9px',
                                      fontWeight: '700',
                                      color: '#16a34a',
                                      backgroundColor: '#f1f5f9',
                                      padding: '1px 6px',
                                      borderRadius: '10px',
                                      letterSpacing: '0.02em',
                                      border: '1px solid #e2e8f0'
                                    }}>Note</span>
                                  )}
                                </div>
                                {act.subTitle && (
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#2563eb', marginBottom: '1px' }}>
                                    {act.subTitle}
                                  </div>
                                )}
                                <div
                                  style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5', wordBreak: 'break-word', fontWeight: '400' }}
                                  dangerouslySetInnerHTML={{ __html: act.description }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                              <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '500' }}>
                                {formatRelativeDate(act.date)}
                              </span>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  backgroundColor: '#f1f5f9',
                                  color: '#475569',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  overflow: 'hidden'
                                }}>
                                  <span style={{ textTransform: 'uppercase' }}>{act.author[0] || 'U'}</span>
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                                  {act.author || 'User'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Horizontal Line Partition intersecting with Vertical Line */}
                          <div style={{
                            position: 'absolute',
                            left: '8px',
                            right: '0',
                            bottom: '0',
                            height: '1px',
                            backgroundColor: '#f1f5f9',
                            zIndex: 1
                          }} />
                        </div>
                      ))}
                      {(dealsRemaining > 0 || deals.length > 5) && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', marginBottom: '12px' }}>
                          {dealsRemaining > 0 && (
                            <button
                              onClick={handleDealLoadMore}
                              style={{
                                padding: '4px 6px',
                                backgroundColor: 'transparent',
                                color: 'hsl(219.81deg 84.06% 50.78%)',
                                border: 'none',
                                borderRadius: '0',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'color 0.15s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.color = 'rgb(24 82 215)'; }}
                              onMouseOut={(e) => { e.currentTarget.style.color = 'hsl(219.81deg 84.06% 50.78%)'; }}
                            >
                              Load More ({dealsRemaining})
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </button>
                          )}
                          {deals.length > 5 && (
                            <button
                              onClick={handleDealCollapse}
                              style={{
                                padding: '4px 6px',
                                backgroundColor: 'transparent',
                                color: '#dc2626',
                                border: 'none',
                                borderRadius: '0',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'color 0.15s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.color = '#b91c1c'; }}
                              onMouseOut={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                            >
                              Show Less
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                                <path d="m18 15-6-6-6 6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Tasks Detailed View */}
            {activeTab === 'tasks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {filteredTasks.length > 0 && <div className="timeline-line" />}

                  {filteredTasks.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#64748b', textAlign: 'center' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: '#f5f3ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px',
                        border: '1px solid #ede9fe',
                        color: '#8b5cf6'
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>No tasks linked</div>
                      <div style={{ fontSize: '12.5px', color: '#94a3b8', maxWidth: '280px' }}>This contact doesn't have any tasks linked. Click "Add Task" above to link one.</div>
                    </div>
                  ) : (
                    <>
                      {filteredTasks.map((act) => (
                        <div key={act.id} className="timeline-item-container">
                          {/* Timeline Node Badge Icon */}
                          <div
                            className="timeline-node"
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#faf5ff',
                              color: '#8b5cf6',
                              border: '3px solid #fff',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                              flexShrink: 0,
                              zIndex: 2
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                          </div>

                          {/* Timeline snug info card */}
                          <div style={{
                            flex: 1,
                            backgroundColor: '#ffffff',
                            padding: '6px 0px 8px 0px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '16px'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                                  {act.subTitle || 'Untitled Task'}
                                </h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                                    Priority:
                                  </span>
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    color: act.priority === 'high' ? '#b91c1c' : act.priority === 'medium' ? '#d97706' : '#475569',
                                    backgroundColor: act.priority === 'high' ? '#fee2e2' : act.priority === 'medium' ? '#fef3c7' : '#f1f5f9',
                                    padding: '1px 6px',
                                    borderRadius: '4px'
                                  }}>
                                    {act.priority || 'medium'}
                                  </span>

                                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginLeft: '6px' }}>
                                    Status:
                                  </span>
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    color: act.status === 'completed' ? '#2563eb' : '#d97706',
                                    backgroundColor: act.status === 'completed' ? '#eff6ff' : '#fef3c7',
                                    padding: '1px 6px',
                                    borderRadius: '4px'
                                  }}>
                                    {act.status?.replace('_', ' ') || 'pending'}
                                  </span>

                                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', marginLeft: '6px' }}>
                                    Due: {act.due_date ? new Date(act.due_date).toLocaleDateString() : 'No date'}
                                  </span>
                                </div>
                                {act.taskDescription && (
                                  <div style={{
                                    fontSize: '12.5px',
                                    color: '#475569',
                                    marginTop: '6px',
                                    lineHeight: '1.5',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontWeight: '400'
                                  }}>
                                    {act.taskDescription}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                              <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: '500' }}>
                                {formatRelativeDate(act.date)}
                              </span>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  backgroundColor: '#f1f5f9',
                                  color: '#475569',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  overflow: 'hidden'
                                }}>
                                  <span style={{ textTransform: 'uppercase' }}>{act.author[0] || 'U'}</span>
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                                  {act.author || 'User'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Horizontal Line Partition intersecting with Vertical Line */}
                          <div style={{
                            position: 'absolute',
                            left: '8px',
                            right: '0',
                            bottom: '0',
                            height: '1px',
                            backgroundColor: '#f1f5f9',
                            zIndex: 1
                          }} />
                        </div>
                      ))}
                      {(tasksRemaining > 0 || tasks.length > 5) && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', marginBottom: '12px' }}>
                          {tasksRemaining > 0 && (
                            <button
                              onClick={handleTaskLoadMore}
                              style={{
                                padding: '4px 6px',
                                backgroundColor: 'transparent',
                                color: 'hsl(219.81deg 84.06% 50.78%)',
                                border: 'none',
                                borderRadius: '0',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'color 0.15s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.color = 'rgb(24 82 215)'; }}
                              onMouseOut={(e) => { e.currentTarget.style.color = 'hsl(219.81deg 84.06% 50.78%)'; }}
                            >
                              Load More ({tasksRemaining})
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </button>
                          )}
                          {tasks.length > 5 && (
                            <button
                              onClick={handleTaskCollapse}
                              style={{
                                padding: '4px 6px',
                                backgroundColor: 'transparent',
                                color: '#dc2626',
                                border: 'none',
                                borderRadius: '0',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'color 0.15s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.color = '#b91c1c'; }}
                              onMouseOut={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                            >
                              Show Less
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', verticalAlign: 'middle' }}>
                                <path d="m18 15-6-6-6 6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </CRMWorkspaceTabs>
        </main>
      </div>
      {/* MODALS */}

      {/* Edit Details Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Contact Details"
        footer={<>
          <Button type="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
          <Button onClick={formik.handleSubmit} disabled={formik.isSubmitting}>
            {formik.isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </>}
      >
        <form onSubmit={formik.handleSubmit}>
          {/* Avatar Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#e2e8f0',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--border)'
            }}>
              {formik.values.profile_image_url ? (
                <img src={getFileUrl(formik.values.profile_image_url)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '24px' }}>👤</span>
              )}
              <input
                type="file"
                accept="image/*"
                style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                onChange={async (e) => {
                  const file = e.currentTarget.files[0];
                  if (file) {
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const res = await api.post('/upload', formData);
                      formik.setFieldValue('profile_image_url', res.data.url);
                    } catch (err) {
                      console.error("Upload failed", err);
                    }
                  }
                }}
              />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Click avatar to upload profile picture</p>
          </div>

          {isGlobalAdmin && (
            <Select
              label="Assign to Company"
              name="tenant_id"
              value={formik.values.tenant_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.tenant_id}
              touched={formik.touched.tenant_id}
              required
            >
              <option value="">Select a Company</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.owner_name || t.tenant_name || t.name || 'Unknown Company'}</option>)}
            </Select>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="First Name"
              name="first_name"
              placeholder="John"
              value={formik.values.first_name}
              onChange={(e) => { formik.handleChange(e); formik.setFieldTouched('first_name', true, false); }}
              onBlur={formik.handleBlur}
              error={formik.errors.first_name}
              touched={formik.touched.first_name}
              required
            />
            <Input
              label="Last Name"
              name="last_name"
              placeholder="Doe"
              value={formik.values.last_name}
              onChange={(e) => { formik.handleChange(e); formik.setFieldTouched('last_name', true, false); }}
              onBlur={formik.handleBlur}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="john.doe@example.com"
              value={formik.values.email}
              onChange={(e) => { formik.handleChange(e); formik.setFieldTouched('email', true, false); }}
              onBlur={formik.handleBlur}
              error={formik.errors.email}
              touched={formik.touched.email}
            />
            <Input
              label="Phone"
              name="phone"
              placeholder="+1 (555) 000-0000"
              value={formik.values.phone}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.phone}
              touched={formik.touched.phone}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Workplace Name"
              name="company_name"
              placeholder="Acme Corp"
              value={formik.values.company_name}
              onChange={(e) => { formik.handleChange(e); formik.setFieldTouched('company_name', true, false); }}
              onBlur={formik.handleBlur}
              error={formik.errors.company_name}
              touched={formik.touched.company_name}
            />
            <Input
              label="Profession"
              name="profession"
              placeholder="e.g. Attorney, Realtor"
              value={formik.values.profession}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.profession}
              touched={formik.touched.profession}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Address"
              name="address"
              placeholder="e.g. 123 Main St"
              value={formik.values.address}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.address}
              touched={formik.touched.address}
            />
            <Input
              label="GST Number"
              name="gst_no"
              placeholder="e.g. 22AAAAA0000A1Z5"
              value={formik.values.gst_no}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.errors.gst_no}
              touched={formik.touched.gst_no}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
              label="Gender"
              name="gender"
              value={formik.values.gender}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
            <div />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
              label="Assigned To"
              name="assigned_to"
              value={formik.values.assigned_to}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            >
              <option value="">Unassigned</option>
              {tenantUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.roles?.role_name})</option>)}
            </Select>

            <Input
              label="Job Title"
              name="job_title"
              placeholder="CEO"
              value={formik.values.job_title}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
              label="Lead Status"
              name="status"
              value={formik.values.status}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            >
              <option value="new">New</option>
              <option value="discussion">Discussion</option>
              <option value="won">Won</option>
              <option value="loss">Loss</option>
            </Select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Source"
              name="source"
              placeholder="e.g. LinkedIn"
              value={formik.values.source}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <Input
              label="Tags"
              name="tags"
              placeholder="e.g. VIP, Prospect"
              value={formik.values.tags}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
          </div>
        </form>
      </Modal>

      {/* Task Details Modal */}
      <Modal
        isOpen={!!viewingTask}
        onClose={() => setViewingTask(null)}
        title="Task Details"
        footer={<Button onClick={() => setViewingTask(null)}>Close</Button>}
      >
        {viewingTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>{viewingTask.title}</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>{viewingTask.description || 'No description provided.'}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <InfoRow label="Status" value={<Badge type={viewingTask.status === 'completed' ? 'success' : 'warning'}>{viewingTask.status}</Badge>} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>} />
              <InfoRow label="Priority" value={<Badge type={viewingTask.priority === 'high' ? 'danger' : viewingTask.priority === 'medium' ? 'warning' : 'secondary'}>{viewingTask.priority?.toUpperCase()}</Badge>} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>} />
              <InfoRow label="Vendor" value={viewingTask.vendor_name || 'N/A'} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>} />
              <InfoRow label="Assignee" value={viewingTask.assignee_name || 'Unassigned'} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
              <InfoRow label="Contact Partner" value={`${data?.contact?.first_name} ${data?.contact?.last_name}`} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
              <InfoRow label="Due Date" value={viewingTask.due_date ? new Date(viewingTask.due_date).toLocaleDateString() : 'No date'} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>} />
              <InfoRow label="Created At" value={new Date(viewingTask.created_at).toLocaleDateString()} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>} />
            </div>

            {viewingTask.document_url && (
              <div style={{ marginTop: '12px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: '750', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Attached Document</div>
                <a
                  href={getFileUrl(viewingTask.document_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'var(--primary)', fontWeight: '750' }}
                >
                  <span style={{ display: 'flex' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg></span> View Document
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Deal Details Modal */}
      <Modal
        isOpen={!!viewingDeal}
        onClose={() => setViewingDeal(null)}
        title="Deal Details"
        footer={<Button onClick={() => setViewingDeal(null)}>Close</Button>}
      >
        {viewingDeal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>{viewingDeal.deal_name}</h2>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)' }}>₹{viewingDeal.value.toLocaleString()}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <InfoRow label="Stage" value={<Badge type="primary">{viewingDeal.stage}</Badge>} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>} />
              <InfoRow label="Status" value={<Badge type={viewingDeal.status === 'won' ? 'success' : viewingDeal.status === 'lost' ? 'danger' : 'warning'}>{viewingDeal.status}</Badge>} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>} />
              <InfoRow label="Vendor" value={viewingDeal.vendor_name || 'N/A'} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>} />
              <InfoRow label="Assignee" value={viewingDeal.assignee_name || 'Unassigned'} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
              <InfoRow label="Expected Close" value={viewingDeal.expected_close_date ? new Date(viewingDeal.expected_close_date).toLocaleDateString() : 'No date'} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>} />
              <InfoRow label="Probability" value={`${viewingDeal.probability || 0}%`} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>} />
              <InfoRow label="Created At" value={new Date(viewingDeal.created_at).toLocaleDateString()} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>} />
            </div>

            {viewingDeal.description && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '750', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Description / Notes</div>
                <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.6', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  {viewingDeal.description}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Contact Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Contact"
        message={`Are you sure you want to delete ${contact.first_name} ${contact.last_name}? This will permanently remove the contact and all associated data.`}
        confirmText="Yes, Delete"
        confirmType="danger"
      />

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        title="Add New Task"
        footer={<>
          <Button type="secondary" onClick={() => setIsAddTaskModalOpen(false)}>Cancel</Button>
          <Button onClick={addTaskFormik.handleSubmit} disabled={addTaskFormik.isSubmitting}>
            {addTaskFormik.isSubmitting ? 'Creating...' : 'Create Task'}
          </Button>
        </>}
      >
        <form onSubmit={addTaskFormik.handleSubmit}>
          <Input
            label="Task Title"
            name="title"
            placeholder="Enter task title"
            value={addTaskFormik.values.title}
            onChange={addTaskFormik.handleChange}
            onBlur={addTaskFormik.handleBlur}
            error={addTaskFormik.errors.title}
            touched={addTaskFormik.touched.title}
            required
          />

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Description</label>
            <textarea
              name="description"
              placeholder="Provide a detailed description of the task..."
              value={addTaskFormik.values.description}
              onChange={addTaskFormik.handleChange}
              onBlur={addTaskFormik.handleBlur}
              style={{
                width: '100%',
                padding: '10px 12px',
                minHeight: '80px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                fontSize: '14px',
                backgroundColor: '#fff',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input
              label="Due Date"
              type="date"
              name="due_date"
              value={addTaskFormik.values.due_date}
              onChange={addTaskFormik.handleChange}
              onBlur={addTaskFormik.handleBlur}
            />

            <Select
              label="Priority"
              name="priority"
              value={addTaskFormik.values.priority}
              onChange={addTaskFormik.handleChange}
              onBlur={addTaskFormik.handleBlur}
              required
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
              label="Assign To"
              name="assigned_to"
              value={addTaskFormik.values.assigned_to}
              onChange={addTaskFormik.handleChange}
              onBlur={addTaskFormik.handleBlur}
            >
              <option value="">Select Staff</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>

            <Select
              label="Status"
              name="status"
              value={addTaskFormik.values.status}
              onChange={addTaskFormik.handleChange}
              onBlur={addTaskFormik.handleBlur}
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <Select
              label="Associated Deal"
              name="deal_id"
              value={addTaskFormik.values.deal_id}
              onChange={addTaskFormik.handleChange}
              onBlur={addTaskFormik.handleBlur}
            >
              <option value="">Select Deal (Optional)</option>
              {deals.map(d => (
                <option key={d.id} value={d.id}>
                  {d.deal_name} (${Number(d.value || 0).toLocaleString()} - {d.stage})
                </option>
              ))}
            </Select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <Select
              label="Contact Partner"
              name="contact_id"
              value={addTaskFormik.values.contact_id}
              onChange={addTaskFormik.handleChange}
              onBlur={addTaskFormik.handleBlur}
              error={addTaskFormik.errors.contact_id}
              touched={addTaskFormik.touched.contact_id}
              required
            >
              <option value="">Select Contact</option>
              {tenantContacts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name || ''}
                </option>
              ))}
            </Select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>Reference Document</label>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              style={{
                position: 'relative',
                width: '100%',
                minHeight: '120px',
                border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '12px',
                backgroundColor: dragActive ? 'rgba(var(--primary-rgb), 0.05)' : '#fcfcfc',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                overflow: 'hidden'
              }}
              onClick={() => document.getElementById('task-file-upload').click()}
            >
              <input
                id="task-file-upload"
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                disabled={uploading}
              />

              {uploading ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid rgba(var(--primary-rgb), 0.1)',
                    borderTopColor: 'var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 12px'
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>Uploading document...</span>
                </div>
              ) : addTaskFormik.values.document_url ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center', color: 'var(--primary)' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg></div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)', marginBottom: '4px' }}>Document Uploaded!</div>
                  {uploadedFileName && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{uploadedFileName}</div>}
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '8px', opacity: 0.5, display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg></div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>Click or drag file to upload</div>
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Deal Modal */}
      <Modal
        isOpen={isAddDealModalOpen}
        onClose={() => setIsAddDealModalOpen(false)}
        title="Add New Deal"
        footer={<>
          <Button type="secondary" onClick={() => setIsAddDealModalOpen(false)}>Cancel</Button>
          <Button onClick={addDealFormik.handleSubmit} disabled={addDealFormik.isSubmitting}>
            {addDealFormik.isSubmitting ? 'Creating...' : 'Create Deal'}
          </Button>
        </>}
      >
        <form onSubmit={addDealFormik.handleSubmit}>
          {isGlobalAdmin && (
            <SearchableSelect
              label="Assign to Company"
              name="tenant_id"
              value={addDealFormik.values.tenant_id}
              options={Array.isArray(tenants) ? tenants.map(t => ({ value: t.id, label: t.owner_name || t.tenant_name || t.name || 'Unknown Company' })) : []}
              onChange={addDealFormik.handleChange}
              onBlur={addDealFormik.handleBlur}
              error={addDealFormik.errors.tenant_id}
              touched={addDealFormik.touched.tenant_id}
              required
            />
          )}
          <Input
            label="Deal Name"
            name="deal_name"
            placeholder="e.g. Enterprise License"
            value={addDealFormik.values.deal_name}
            onChange={addDealFormik.handleChange}
            onBlur={addDealFormik.handleBlur}
            error={addDealFormik.errors.deal_name}
            touched={addDealFormik.touched.deal_name}
            required
          />

          <Input
            label="Value ($)"
            type="number"
            name="value"
            placeholder="0.00"
            value={addDealFormik.values.value}
            onChange={addDealFormik.handleChange}
            onBlur={addDealFormik.handleBlur}
            onKeyDown={(e) => {
              if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
            }}
            error={addDealFormik.errors.value}
            touched={addDealFormik.touched.value}
            required
          />

          <SearchableSelect
            label="Assigned To"
            name="assigned_to"
            value={addDealFormik.values.assigned_to}
            options={staff.map(s => ({ value: s.id, label: s.name }))}
            onChange={addDealFormik.handleChange}
            onBlur={addDealFormik.handleBlur}
            placeholder="Unassigned"
          />

          <SearchableSelect
            label="Contact Partner"
            name="contact_id"
            value={addDealFormik.values.contact_id}
            options={tenantContacts.map(c => ({
              value: c.id,
              label: `${c.first_name} ${c.last_name || ''}`.trim()
            }))}
            onChange={addDealFormik.handleChange}
            onBlur={addDealFormik.handleBlur}
            error={addDealFormik.errors.contact_id}
            touched={addDealFormik.touched.contact_id}
            placeholder="Select Contact"
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
              label="Pipeline Stage"
              name="stage"
              value={addDealFormik.values.stage}
              onChange={addDealFormik.handleChange}
              onBlur={addDealFormik.handleBlur}
            >
              <option value="lead">Lead</option>
              <option value="qualification">Qualification</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </Select>

            <Select
              label="Status"
              name="status"
              value={addDealFormik.values.status}
              onChange={addDealFormik.handleChange}
              onBlur={addDealFormik.handleBlur}
            >
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </Select>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={communicationModal.isOpen}
        onClose={() => setCommunicationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmCommunication}
        title={communicationModal.title}
        message={communicationModal.message}
        confirmLabel="Proceed"
        cancelLabel="Cancel"
        type="primary"
      />
    </div>
  );
}

function InfoRow({ label, value, icon, isBadge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
        {isBadge && value ? (
          <div style={{ marginTop: '2px' }}><Badge type="info">{value}</Badge></div>
        ) : (
          <div style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>{value || 'Not provided'}</div>
        )}
      </div>
    </div>
  );
}

function PaginationControls({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '16px', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        style={{
          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
          backgroundColor: currentPage === 1 ? 'var(--bg-main)' : '#fff',
          color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          fontSize: '12px', fontWeight: '600', transition: 'all 0.15s'
        }}
      >
        Previous
      </button>
      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
        Page <span style={{ color: 'var(--text-main)' }}>{currentPage}</span> of {totalPages}
      </span>
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        style={{
          padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
          backgroundColor: currentPage === totalPages ? 'var(--bg-main)' : '#fff',
          color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-main)',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          fontSize: '12px', fontWeight: '600', transition: 'all 0.15s'
        }}
      >
        Next
      </button>
    </div>
  );
}

function ContactDetailSkeleton() {
  return (
    <div style={{ padding: '24px' }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
      `}</style>

      {/* Breadcrumbs Skeleton */}
      <div className="skeleton" style={{ width: '150px', height: '18px', marginBottom: '16px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(290px, 1fr) 3fr', gap: '16px' }}>
        {/* Left Column Skeleton */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px 14px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%', marginBottom: '12px' }} />
            <div className="skeleton" style={{ width: '120px', height: '18px', marginBottom: '8px' }} />
            <div className="skeleton" style={{ width: '80px', height: '14px', marginBottom: '16px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
              <div className="skeleton" style={{ height: '30px' }} />
              <div className="skeleton" style={{ height: '30px' }} />
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px 14px', border: '1px solid var(--border)' }}>
            <div className="skeleton" style={{ width: '100px', height: '16px', marginBottom: '12px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: 'flex', gap: '8px' }}>
                  <div className="skeleton" style={{ width: '14px', height: '14px' }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ width: '80px', height: '12px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Column Skeleton */}
        <main style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', gap: '16px' }}>
            <div className="skeleton" style={{ width: '80px', height: '36px', borderRadius: '0' }} />
            <div className="skeleton" style={{ width: '80px', height: '36px', borderRadius: '0' }} />
            <div className="skeleton" style={{ width: '80px', height: '36px', borderRadius: '0' }} />
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <div className="skeleton" style={{ width: '150px', height: '18px', marginBottom: '12px' }} />
              <div className="skeleton" style={{ width: '100%', height: '100px', marginBottom: '12px' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div className="skeleton" style={{ width: '80px', height: '32px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2].map(i => (
                <div key={i} className="skeleton" style={{ height: '50px', borderRadius: '8px' }} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
