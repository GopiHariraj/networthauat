import axios from 'axios';

// --- Cache API Utility ---
const CACHE_NAME = 'networth-api-cache-v1';

export const apiCache = {
    async get(url: string) {
        if (typeof window === 'undefined' || !window.caches) return null;
        try {
            const cache = await caches.open(CACHE_NAME);
            const response = await cache.match(url);
            if (response) {
                return await response.json();
            }
        } catch (e) {
            console.error('[Cache API] Get error:', e);
        }
        return null;
    },

    async set(url: string, data: any) {
        if (typeof window === 'undefined' || !window.caches) return;
        try {
            const cache = await caches.open(CACHE_NAME);
            const response = new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json' }
            });
            await cache.put(url, response);
        } catch (e) {
            console.error('[Cache API] Set error:', e);
        }
    },

    async invalidate(patterns: string[]) {
        if (typeof window === 'undefined' || !window.caches) return;
        try {
            const cache = await caches.open(CACHE_NAME);
            const keys = await cache.keys();
            for (const request of keys) {
                if (patterns.some(p => request.url.includes(p))) {
                    await cache.delete(request);
                }
            }
        } catch (e) {
            console.error('[Cache API] Invalidate error:', e);
        }
    },

    async clear() {
        if (typeof window === 'undefined' || !window.caches) return;
        try {
            await caches.delete(CACHE_NAME);
            console.log('[Cache API] Cache cleared');
        } catch (e) {
            console.error('[Cache API] Clear error:', e);
        }
    }
};

// Dynamically determine API URL based on current hostname
const getApiUrl = () => {
    // If env var is set, use it unless it's localhost and we are not on localhost
    if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    // Server-side internal Docker URL
    if (typeof window === 'undefined' && process.env.INTERNAL_API_URL) {
        return process.env.INTERNAL_API_URL;
    }
    if (typeof window !== 'undefined') {
        const { hostname, port, origin } = window.location;
        if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '3000') {
            return 'http://localhost:3001/api';
        }
        if (port === '3000') return `${origin.replace(':3000', ':3001')}/api`;
        return `${origin}/api`;
    }
    return 'http://localhost:3001/api';
};

export const API_URL = getApiUrl();

export const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 60000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for handling caching and errors
apiClient.interceptors.response.use(
    async (response) => {
        const { config } = response;

        // Cache GET requests
        if (config.method === 'get' && response.data) {
            // Background update - allow the UI to continue
            apiCache.set(config.url || '', response.data);
        }

        // Invalidate cache on mutations
        if (['post', 'put', 'patch', 'delete'].includes(config.method || '')) {
            const url = config.url || '';
            // Determine what to invalidate based on URL
            if (url.includes('gold-assets')) apiCache.invalidate(['gold-assets']);
            else if (url.includes('stock-assets')) apiCache.invalidate(['stock-assets']);
            else if (url.includes('properties')) apiCache.invalidate(['properties']);
            else if (url.includes('bank-accounts')) apiCache.invalidate(['bank-accounts']);
            else if (url.includes('loans')) apiCache.invalidate(['loans']);
            else if (url.includes('insurance')) apiCache.invalidate(['insurance']);
            else if (url.includes('bond-assets')) apiCache.invalidate(['bond-assets']);
            else if (url.includes('mutual-fund-assets')) apiCache.invalidate(['mutual-fund-assets']);
            else if (url.includes('credit-cards')) apiCache.invalidate(['credit-cards']);
            else if (url.includes('expenses')) apiCache.invalidate(['expenses']);
            else if (url.includes('goals')) apiCache.invalidate(['goals']);
        }

        return response;
    },
    async (error) => {
        if (error.response?.status === 401) {
            console.warn('[API Client] Unauthorized access - redirecting to login');

            // Clear cache on unauthorized
            apiCache.clear();

            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('refreshToken');
            document.cookie = 'token=; path=/; max-age=0';

            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    login: (credentials: any) => apiClient.post('/auth/login', credentials),
    signup: (data: any) => apiClient.post('/auth/signup', data),
};

export const usersApi = {
    updateCurrency: (currency: string) => apiClient.put('/users/me/currency', { currency }),
    updateModuleVisibility: (moduleVisibility: any) => apiClient.put('/users/me/module-visibility', { moduleVisibility }),
};

export const transactionsApi = {
    create: (data: any) => apiClient.post('/transactions', data),
    parseStatement: (file: File, accountId: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (accountId) formData.append('accountId', accountId);
        return apiClient.post('/transactions/statement', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },
    parseSMS: (text: string) => apiClient.post('/transactions/sms', { text }),
    analyzeReceipt: (image: string) => apiClient.post('/transactions/receipt', { image }),
    getAll: (accountId?: string) => {
        const params = accountId ? `?accountId=${accountId}` : '';
        return apiClient.get(`/transactions${params}`);
    },
    getDashboard: (params: any) => apiClient.get('/transactions/dashboard', { params }),
    update: (id: string, data: any) => apiClient.patch(`/transactions/${id}`, data),
    delete: (id: string) => apiClient.delete(`/transactions/${id}`),
};

export const aiApi = {
    chat: (message: string, context: any) => apiClient.post('/ai/chat', { message, context }),
};

export const depreciatingAssetsApi = {
    getAll: () => apiClient.get('/depreciating-assets'),
    create: (data: any) => apiClient.post('/depreciating-assets', data),
    update: (id: string, data: any) => apiClient.patch(`/depreciating-assets/${id}`, data),
    delete: (id: string) => apiClient.delete(`/depreciating-assets/${id}`),
};



export default apiClient;
