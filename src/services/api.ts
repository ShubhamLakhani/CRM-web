import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let memoryToken: string | null = null;
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setMemoryToken = (token: string | null) => {
  memoryToken = token;
};

// Auto-inject JWT token to outbound requests from memory
apiClient.interceptors.request.use(
  (config) => {
    if (memoryToken) {
      config.headers.Authorization = `Bearer ${memoryToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Global response error interceptor (handles automatic JWT token refreshing & concurrency retry queuing)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Trigger token refresh on 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (typeof window !== 'undefined') {
        const persistedToken = localStorage.getItem('apex-session-token');
        const persistedRefreshToken = localStorage.getItem('apex-refresh-token');
        if (!persistedToken || !persistedRefreshToken) {
          // If we are not already on the login page and session is completely gone, redirect
          localStorage.removeItem('apex-session-token');
          localStorage.removeItem('apex-refresh-token');
          localStorage.removeItem('apex-user');
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Perform refreshing via standard axios instance to bypass interceptors
          const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: persistedRefreshToken });
          const { accessToken, refreshToken } = res.data;

          setMemoryToken(accessToken);
          localStorage.setItem('apex-session-token', accessToken);
          localStorage.setItem('apex-refresh-token', refreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          processQueue(null, accessToken);

          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('apex-session-token');
          localStorage.removeItem('apex-refresh-token');
          localStorage.removeItem('apex-user');
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    }
    return Promise.reject(error);
  },
);

// Auth Services
export const authService = {
  register: async (data: any) => {
    const res = await apiClient.post('/auth/register', data);
    return res.data;
  },
  login: async (data: any) => {
    const res = await apiClient.post('/auth/login', data);
    return res.data;
  },
  me: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  refresh: async (refreshToken: string) => {
    const res = await apiClient.post('/auth/refresh', { refreshToken });
    return res.data;
  },
  logout: async (refreshToken: string) => {
    const res = await apiClient.post('/auth/logout', { refreshToken });
    return res.data;
  },
  logoutAll: async () => {
    const res = await apiClient.post('/auth/logout-all');
    return res.data;
  },
  getUsers: async () => {
    const res = await apiClient.get('/auth/users');
    return res.data;
  },
};

// Contacts Services
export const contactsService = {
  getAll: async (search?: string, status?: string, page?: number, limit?: number) => {
    const params: any = {};
    if (search) params.search = search;
    if (status) params.status = status;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    const res = await apiClient.get('/contacts', { params });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get(`/contacts/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await apiClient.post('/contacts', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await apiClient.patch(`/contacts/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/contacts/${id}`);
    return res.data;
  },
};

// Deals Services
export const dealsService = {
  getAll: async () => {
    const res = await apiClient.get('/deals');
    return res.data;
  },
  getStats: async () => {
    const res = await apiClient.get('/deals/summary/stats');
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get(`/deals/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await apiClient.post('/deals', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await apiClient.patch(`/deals/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/deals/${id}`);
    return res.data;
  },
  addNote: async (id: string, description: string) => {
    const res = await apiClient.post(`/deals/${id}/notes`, { description });
    return res.data;
  },
};

// Companies Services
export const companiesService = {
  getAll: async (search?: string, industry?: string, page?: number, limit?: number) => {
    const params: any = {};
    if (search) params.search = search;
    if (industry) params.industry = industry;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    const res = await apiClient.get('/companies', { params });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get(`/companies/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await apiClient.post('/companies', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await apiClient.patch(`/companies/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/companies/${id}`);
    return res.data;
  },
};

// Tasks Services
export const tasksService = {
  getAll: async (search?: string, status?: string) => {
    const params: any = {};
    if (search) params.search = search;
    if (status) params.status = status;
    const res = await apiClient.get('/tasks', { params });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get(`/tasks/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await apiClient.post('/tasks', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await apiClient.patch(`/tasks/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/tasks/${id}`);
    return res.data;
  },
};
