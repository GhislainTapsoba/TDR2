import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://teamproject.deep-technologies.com/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Unauthorized - clear token and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;

// Auth API
export const authAPI = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    register: (email: string, name: string, password: string, phone: string) =>
        api.post('/auth/register', { email, name, password, phone }),
};

// Users API
export const usersAPI = {
    getAll: () => api.get('/users'),
    create: (data: any) => api.post('/users', data),
    update: (id: string, data: any) => api.put(`/users/${id}`, data),
    delete: (id: string) => api.delete(`/users/${id}`),
};

// Projects API
export const projectsAPI = {
    getAll: (params?: any) => api.get('/projects', { params }),
    getById: (id: string) => api.get(`/projects/${id}`),
    create: (data: any) => api.post('/projects', data),
    update: (id: string, data: any) => api.put(`/projects/${id}`, data),
    delete: (id: string) => api.delete(`/projects/${id}`),
};

// Stages API
export const stagesAPI = {
    getAll: (params?: any) => api.get('/stages', { params }),
    getById: (id: string) => api.get(`/stages/${id}`),
    create: (data: any) => api.post('/stages', data),
    update: (id: string, data: any) => api.put(`/stages/${id}`, data),
    delete: (id: string) => api.delete(`/stages/${id}`),
};

// Tasks API
export const tasksAPI = {
    getAll: (params?: any) => api.get('/tasks', { params }),
    getById: (id: string) => api.get(`/tasks/${id}`),
    create: (data: any) => api.post('/tasks', data),
    update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
    delete: (id: string) => api.delete(`/tasks/${id}`),
};

// Notifications API
export const notificationsAPI = {
    getAll: (params?: any) => api.get('/notifications', { params }),
    markAsRead: (id: string) => api.put(`/notifications/${id}`),
    delete: (id: string) => api.delete(`/notifications/${id}`),
};

// Email confirmation API
export const emailAPI = {
    confirm: (token: string) => api.get(`/email-confirm?token=${token}`),
};

// Documents API
export const documentsAPI = {
    getAll: (params?: any) => api.get('/documents', { params }),
    getById: (id: string) => api.get(`/documents/${id}`),
    create: (data: any) => api.post('/documents', data),
    delete: (id: string) => api.delete(`/documents/${id}`),
};

// Comments API
export const commentsAPI = {
    getAll: (params?: any) => api.get('/comments', { params }),
    create: (data: any) => api.post('/comments', data),
    update: (id: string, data: any) => api.put(`/comments/${id}`, data),
    delete: (id: string) => api.delete(`/comments/${id}`),
};

// Activity Logs API
export const activityLogsAPI = {
    getAll: (params?: any) => api.get('/activity-logs', { params }),
    create: (data: any) => api.post('/activity-logs', data),
};

// Settings API
export const settingsAPI = {
    get: () => api.get('/settings'),
    update: (data: any) => api.put('/settings', data),
};

// Notification Preferences API
export const notificationPreferencesAPI = {
    get: () => api.get('/notification-preferences'),
    update: (data: any) => api.put('/notification-preferences', data),
};

// Profile API
export const profileAPI = {
    get: () => api.get('/profile'),
    update: (data: any) => api.put('/profile', data),
};

// Dashboard API
export const dashboardAPI = {
    getStats: () => api.get('/dashboard'),
};

// Roles API
export const rolesAPI = {
    getAll: () => api.get('/roles'),
    create: (data: any) => api.post('/roles', data),
};

// Permissions API
export const permissionsAPI = {
    getAll: () => api.get('/permissions'),
};

// Role Permissions API
export const rolePermissionsAPI = {
    getAll: (params?: any) => api.get('/role-permissions', { params }),
};
