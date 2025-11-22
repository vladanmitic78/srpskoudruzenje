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
  
  confirmParticipation: async (id) => {
    const response = await api.post(`/events/${id}/confirm`);
    return response.data;
  },
  
  cancelParticipation: async (id) => {
    const response = await api.delete(`/events/${id}/confirm`);
    return response.data;
  },
  
  getParticipants: async (id) => {
    const response = await api.get(`/events/${id}/participants`);
    return response.data;
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
};

// ==================== Contact APIs ====================
export const contactAPI = {
  submit: async (formData) => {
    const response = await api.post('/contact/', formData);
    return response.data;
  },
};

export default api;
