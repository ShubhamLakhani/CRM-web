import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
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
        const hasUser = localStorage.getItem('apex-user');
        if (!hasUser) {
          // If we are not already on the login page and session is completely gone, redirect
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
          const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
          const { accessToken } = res.data;

          setMemoryToken(accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          processQueue(null, accessToken);

          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('apex-user');
          setMemoryToken(null);
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
  refresh: async (organizationId?: string) => {
    const res = await apiClient.post('/auth/refresh', { organizationId });
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post('/auth/logout');
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

// Invitations Services
export const invitationsService = {
  getPending: async () => {
    const res = await apiClient.get('/invitations');
    return res.data;
  },
  invite: async (data: { email: string; roleId: string }) => {
    const res = await apiClient.post('/invitations', data);
    return res.data;
  },
  resend: async (id: string) => {
    const res = await apiClient.post(`/invitations/${id}/resend`);
    return res.data;
  },
  revoke: async (id: string) => {
    const res = await apiClient.delete(`/invitations/${id}`);
    return res.data;
  },
  accept: async (token: string) => {
    const res = await apiClient.post('/invitations/accept', { token });
    return res.data;
  },
  validate: async (token: string) => {
    const res = await apiClient.get('/invitations/validate', { params: { token } });
    return res.data;
  },
  registerAndAccept: async (data: { token: string; name: string; password: string }) => {
    const res = await apiClient.post('/invitations/register-and-accept', data);
    return res.data;
  },
};

// Organizations Services
export const organizationsService = {
  getMyOrganizations: async () => {
    const res = await apiClient.get('/organizations/my-organizations');
    return res.data;
  },
  switch: async (organizationId: string) => {
    const res = await apiClient.post('/organizations/switch', { organizationId });
    return res.data;
  },
};

// Features Services
export const featuresService = {
  getFeatures: async () => {
    const res = await apiClient.get('/features');
    return res.data;
  },
  toggleFeature: async (featureId: string, isEnabled: boolean) => {
    const res = await apiClient.patch(`/features/${featureId}`, { isEnabled });
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
  getAiForecast: async () => {
    const res = await apiClient.get('/deals/ai/forecast');
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

export const activitiesService = {
  getAll: async (search?: string, type?: string, page?: number, limit?: number) => {
    const params: any = {};
    if (search) params.search = search;
    if (type) params.type = type;
    if (page) params.page = page;
    if (limit) params.limit = limit;
    const res = await apiClient.get('/activities', { params });
    return res.data;
  },
  getByEntity: async (entityType: string, entityId: string, page?: number, limit?: number) => {
    const params: any = {};
    if (page) params.page = page;
    if (limit) params.limit = limit;
    const res = await apiClient.get(`/activities/entity/${entityType}/${entityId}`, { params });
    return res.data;
  },
};
