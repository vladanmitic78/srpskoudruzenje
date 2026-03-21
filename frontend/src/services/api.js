import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== Auth APIs ====================
export const authAPI = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  
  verifyEmail: async (token) => {
    const response = await api.get(`/auth/verify-email?token=${token}`);
    return response.data;
  },
  
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', null, {
      params: { email }
    });
    return response.data;
  },
  
  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', null, {
      params: { token, new_password: newPassword }
    });
    return response.data;
  },
};

// ==================== User APIs ====================
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
  
  updateProfile: async (userData) => {
    const response = await api.put('/users/me', userData);
    return response.data;
  },
  
  changePassword: async (passwordData) => {
    const response = await api.post('/users/change-password', passwordData);
    return response.data;
  },
  
  cancelMembership: async (reason) => {
    const response = await api.post('/users/cancel-membership', { reason });
    return response.data;
  },
};

// ==================== News APIs ====================
export const newsAPI = {
  getAll: async (limit = 10, skip = 0) => {
    const response = await api.get(`/news/?limit=${limit}&skip=${skip}`);
    return response.data;
  },
  
  create: async (newsData) => {
    const response = await api.post('/news/', newsData);
    return response.data;
  },
  
  update: async (id, newsData) => {
    const response = await api.put(`/news/${id}`, newsData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/news/${id}`);
    return response.data;
  },
};

// ==================== Events APIs ====================
export const eventsAPI = {
  getAll: async () => {
    const response = await api.get('/events/');
    return response.data;
  },
  
  create: async (eventData) => {
    const response = await api.post('/events/', eventData);
    return response.data;
  },
  
  update: async (id, eventData) => {
    const response = await api.put(`/events/${id}`, eventData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  },
  
  confirmParticipation: async (id, memberId = null) => {
    const params = memberId ? { member_id: memberId } : {};
    const response = await api.post(`/events/${id}/confirm`, null, { params });
    return response.data;
  },
  
  cancelParticipation: async (id, reason, memberId = null) => {
    const params = { reason };
    if (memberId) params.member_id = memberId;
    const response = await api.delete(`/events/${id}/confirm`, { params });
    return response.data;
  },
  
  getParticipants: async (id) => {
    const response = await api.get(`/events/${id}/participants`);
    return response.data;
  },
  
  getMyStats: async () => {
    const response = await api.get('/events/stats/my');
    return response.data;
  },
  
  // Attendance Tracking APIs
  getAttendance: async (id) => {
    const response = await api.get(`/events/${id}/attendance`);
    return response.data;
  },
  
  markAttendance: async (eventId, userId, attended) => {
    const response = await api.post(`/events/${eventId}/attendance/${userId}?attended=${attended}`);
    return response.data;
  },
  
  markBulkAttendance: async (eventId, attendanceData) => {
    const response = await api.post(`/events/${eventId}/attendance/bulk`, {
      attendance: attendanceData
    });
    return response.data;
  },
  
  markWalkIn: async (eventId, userId) => {
    const response = await api.post(`/events/${eventId}/attendance/walkin/${userId}`);
    return response.data;
  },
  
  // Attendance Reports APIs
  getAttendanceReportData: async (startDate, endDate, trainingGroup, eventId = null) => {
    const params = new URLSearchParams();
    if (eventId) {
      params.append('event_id', eventId);
    } else {
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (trainingGroup) params.append('training_group', trainingGroup);
    }
    const response = await api.get(`/events/reports/attendance/data?${params.toString()}`);
    return response.data;
  },
  
  downloadAttendanceReport: (startDate, endDate, trainingGroup, format = 'pdf', eventId = null) => {
    const params = new URLSearchParams();
    if (eventId) {
      params.append('event_id', eventId);
    } else {
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (trainingGroup) params.append('training_group', trainingGroup);
    }
    params.append('format', format);
    
    // Return the URL for download
    return `${process.env.REACT_APP_BACKEND_URL}/api/events/reports/attendance?${params.toString()}`;
  },
};

// ==================== Invoices APIs ====================
export const invoicesAPI = {
  getMy: async () => {
    const response = await api.get('/invoices/my');
    return response.data;
  },
  
  getAll: async () => {
    const response = await api.get('/invoices/');
    return response.data;
  },
  
  create: async (invoiceData) => {
    const response = await api.post('/invoices/', invoiceData);
    return response.data;
  },
  
  markPaid: async (id, paymentDate) => {
    const response = await api.put(`/invoices/${id}/mark-paid`, { paymentDate });
    return response.data;
  },
  
  uploadFile: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/invoices/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/invoices/${id}`);
    return response.data;
  },
  
  update: async (id, invoiceData) => {
    const response = await api.put(`/invoices/${id}`, invoiceData);
    return response.data;
  },
  
  // Credit Note APIs
  credit: async (id, reason) => {
    const response = await api.post(`/invoices/${id}/credit`, { reason });
    return response.data;
  },
  
  getMyCreditNotes: async () => {
    const response = await api.get('/invoices/credit-notes/my');
    return response.data;
  },
  
  getAllCreditNotes: async () => {
    const response = await api.get('/invoices/credit-notes/');
    return response.data;
  },
};

// ==================== Gallery APIs ====================
export const galleryAPI = {
  getAll: async () => {
    const response = await api.get('/gallery/');
    return response.data;
  },
  
  create: async (galleryData) => {
    const response = await api.post('/gallery/', galleryData);
    return response.data;
  },
  
  update: async (id, galleryData) => {
    const response = await api.put(`/gallery/${id}`, galleryData);
    return response.data;
  },
  
  uploadImage: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/gallery/${id}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/gallery/${id}`);
    return response.data;
  },
};

// ==================== Stories APIs ====================
export const storiesAPI = {
  getAll: async () => {
    const response = await api.get('/stories/');
    return response.data;
  },
  
  create: async (storyData) => {
    const response = await api.post('/stories/', storyData);
    return response.data;
  },
  
  update: async (id, storyData) => {
    const response = await api.put(`/stories/${id}`, storyData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/stories/${id}`);
    return response.data;
  },
};

// ==================== Settings APIs ====================
export const settingsAPI = {
  get: async () => {
    const response = await api.get('/settings/');
    return response.data;
  },
  
  update: async (settingsData) => {
    const response = await api.put('/settings/', settingsData);
    return response.data;
  },
};

// ==================== Admin APIs ====================
export const adminAPI = {
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },
  
  getStatistics: async () => {
    const response = await api.get('/admin/statistics');
    return response.data;
  },
  
  suspendUser: async (userId) => {
    const response = await api.post(`/admin/users/${userId}/suspend`);
    return response.data;
  },
  
  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },
  
  getUserDetails: async (userId) => {
    const response = await api.get(`/admin/users/${userId}/details`);
    return response.data;
  },
  
  exportMembersPDF: async () => {
    const response = await api.get('/admin/export/members/pdf', {
      responseType: 'blob'
    });
    return response.data;
  },
  
  exportMembersXML: async () => {
    const response = await api.get('/admin/export/members/xml', {
      responseType: 'blob'
    });
    return response.data;
  },
  
  exportMembersExcel: async () => {
    const response = await api.get('/admin/export/members/excel', {
      responseType: 'blob'
    });
    return response.data;
  },
  
  // Admin Management APIs (Super Admin only)
  getAllAdmins: async (role = null) => {
    const url = role ? `/admin/admins?role=${role}` : '/admin/admins';
    const response = await api.get(url);
    return response.data;
  },
  
  createAdmin: async (adminData) => {
    const response = await api.post('/admin/admins/create', adminData);
    return response.data;
  },
  
  updateAdmin: async (adminId, updateData) => {
    const response = await api.put(`/admin/admins/${adminId}`, updateData);
    return response.data;
  },
  
  resetAdminPassword: async (adminId) => {
    const response = await api.post(`/admin/admins/${adminId}/reset-password`);
    return response.data;
  },
  
  deleteAdmin: async (adminId) => {
    const response = await api.delete(`/admin/admins/${adminId}`);
    return response.data;
  },
  
  // Get current user's permissions
  getMyPermissions: async () => {
    const response = await api.get('/admin/my-permissions');
    return response.data;
  },
};

// ==================== Content Management APIs ====================
export const contentAPI = {
  getPageContent: async (pageId) => {
    const response = await api.get(`/content/pages/${pageId}`);
    return response.data;
  },
  
  getAllPages: async () => {
    const response = await api.get('/content/pages');
    return response.data;
  },
  
  createContent: async (contentData) => {
    const response = await api.post('/content/pages', contentData);
    return response.data;
  },
  
  updateContent: async (contentId, contentData) => {
    const response = await api.put(`/content/pages/${contentId}`, contentData);
    return response.data;
  },
  
  deleteContent: async (contentId) => {
    const response = await api.delete(`/content/pages/${contentId}`);
    return response.data;
  },

  // About Page
  getAbout: async () => {
    const response = await api.get('/content/about');
    return response.data;
  },

  updateAbout: async (contentData) => {
    const response = await api.put('/content/about', contentData);
    return response.data;
  },

  // Serbian Story
  getSerbianStory: async () => {
    const response = await api.get('/content/serbian-story');
    return response.data;
  },

  updateSerbianStory: async (contentData) => {
    const response = await api.put('/content/serbian-story', contentData);
    return response.data;
  },
};

// ==================== Contact APIs ====================
export const contactAPI = {
  submit: async (formData) => {
    const response = await api.post('/contact/', formData);
    return response.data;
  },
};

// ==================== Family APIs ====================
export const familyAPI = {
  // Get all family members for current user
  getMembers: async () => {
    const response = await api.get('/family/members');
    return response.data;
  },
  
  // Get a specific family member
  getMember: async (memberId) => {
    const response = await api.get(`/family/members/${memberId}`);
    return response.data;
  },
  
  // Add a new family member
  addMember: async (memberData) => {
    const response = await api.post('/family/members', memberData);
    return response.data;
  },
  
  // Update a family member
  updateMember: async (memberId, memberData) => {
    const response = await api.put(`/family/members/${memberId}`, memberData);
    return response.data;
  },
  
  // Remove a family member (unlink, doesn't delete account)
  removeMember: async (memberId) => {
    const response = await api.delete(`/family/members/${memberId}`);
    return response.data;
  },
  
  // Admin: Get all family relationships
  adminGetAllFamilies: async () => {
    const response = await api.get('/family/admin/all');
    return response.data;
  },
  
  // Admin: Add family member to any user
  adminAddMember: async (userId, memberData) => {
    const response = await api.post(`/family/admin/members/${userId}`, memberData);
    return response.data;
  },
  
  // Admin: Remove family member relationship
  adminRemoveMember: async (memberId, deleteAccount = false) => {
    const response = await api.delete(`/family/admin/members/${memberId}?delete_account=${deleteAccount}`);
    return response.data;
  },
  
  // Admin: Send photo consent reminders to all parents with minors without consent
  sendConsentReminders: async () => {
    const response = await api.post('/family/admin/send-consent-reminders');
    return response.data;
  },
  
  // Get minors without consent for current user
  getMinorsWithoutConsent: async () => {
    const response = await api.get('/family/minors-without-consent');
    return response.data;
  },
  
  // Update photo consent for a family member
  updatePhotoConsent: async (memberId, consent) => {
    const response = await api.put(`/family/members/${memberId}/photo-consent?consent=${consent}`);
    return response.data;
  },
};

// ==================== Documents APIs ====================
export const documentsAPI = {
  // === Public Documents ===
  getPublicDocuments: async (category = null, search = null) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    const response = await api.get(`/documents/public?${params.toString()}`);
    return response.data;
  },
  
  uploadPublicDocument: async (formData) => {
    const response = await api.post('/documents/public', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  updatePublicDocument: async (docId, formData) => {
    const response = await api.put(`/documents/public/${docId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  deletePublicDocument: async (docId) => {
    const response = await api.delete(`/documents/public/${docId}`);
    return response.data;
  },
  
  // === Personal Documents ===
  getMyPersonalDocuments: async () => {
    const response = await api.get('/documents/personal');
    return response.data;
  },
  
  adminGetPersonalDocuments: async (userId = null) => {
    const params = userId ? `?user_id=${userId}` : '';
    const response = await api.get(`/documents/personal/admin${params}`);
    return response.data;
  },
  
  uploadPersonalDocument: async (formData) => {
    const response = await api.post('/documents/personal', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  bulkUploadPersonalDocument: async (formData) => {
    const response = await api.post('/documents/personal/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  deletePersonalDocument: async (docId) => {
    const response = await api.delete(`/documents/personal/${docId}`);
    return response.data;
  },
  
  // === Association Documents ===
  getAssociationDocuments: async (visibility = null, category = null) => {
    const params = new URLSearchParams();
    if (visibility) params.append('visibility', visibility);
    if (category) params.append('category', category);
    const response = await api.get(`/documents/association?${params.toString()}`);
    return response.data;
  },
  
  uploadAssociationDocument: async (formData) => {
    const response = await api.post('/documents/association', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  updateAssociationDocument: async (docId, formData) => {
    const response = await api.put(`/documents/association/${docId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  
  deleteAssociationDocument: async (docId) => {
    const response = await api.delete(`/documents/association/${docId}`);
    return response.data;
  },
  
  // === Statistics ===
  getDocumentStats: async () => {
    const response = await api.get('/documents/stats');
    return response.data;
  },
  
  // === File Download ===
  getFileUrl: (fileUrl) => {
    return `${BACKEND_URL}${fileUrl}`;
  }
};

export default api;
