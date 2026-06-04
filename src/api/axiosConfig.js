import React from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Create a custom axios instance
const api = axios.create({
    baseURL: isLocalhost 
        ? 'http://localhost:5010/api' 
        : 'https://zigcrm-apis.staff-b0c.workers.dev/api',
    withCredentials: true // Important for sending/receiving HttpOnly cookies (refresh token)
});

export const FILE_BASE_URL = isLocalhost
    ? 'http://localhost:5010'
    : 'https://zigcrm-apis.staff-b0c.workers.dev';

/**
 * Helper to get the correct URL for a file.
 * If the URL is already absolute (starts with http), it returns it as is.
 * Otherwise, it prepends the FILE_BASE_URL.
 */
export const getFileUrl = (path) => {
    if (!path) return '';
    
    // Ensure path is a string and trim any accidental whitespace
    const cleanPath = String(path).trim();
    
    // If it's already an absolute URL, return it as is
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://') || cleanPath.startsWith('data:')) {
        return cleanPath;
    }
    
    // For relative paths, ensure we have a slash between base and path
    const hasLeadingSlash = cleanPath.startsWith('/');
    return `${FILE_BASE_URL}${hasLeadingSlash ? '' : '/'}${cleanPath}`;
};

/**
 * Helper to record activity logs silently.
 */
export const saveActivityLog = async (logData) => {
    try {
        await api.post('/logs', logData);
    } catch (err) {
        console.error("Failed to save activity log", err);
    }
};

// Flag to track preventing infinite loops on refresh failures
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (accessToken) => {
    refreshSubscribers.map(cb => cb(accessToken));
    refreshSubscribers = [];
};

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle Errors and Refresh Token
api.interceptors.response.use(
    (response) => {
        // You can add success toasts here if desired
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 and Refresh Token
        if (error.response?.status === 401 && originalRequest.url !== '/auth/refresh' && originalRequest.url !== '/auth/login' && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise(function (resolve) {
                    subscribeTokenRefresh(token => {
                        originalRequest.headers['Authorization'] = 'Bearer ' + token;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true });
                const newAccessToken = data.accessToken;
                localStorage.setItem('accessToken', newAccessToken);
                isRefreshing = false;
                onRefreshed(newAccessToken);
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (err) {
                isRefreshing = false;
                localStorage.clear();
                await axios.post(`${api.defaults.baseURL}/auth/logout`, {}, { withCredentials: true }).catch(() => { });
                window.location.href = '/login';
                return Promise.reject(err);
            }
        }

        // Global Error Toasting (excluding 401 which is handled above)
        const toastId = `api-error:${error.config?.method || 'unknown'}:${error.config?.url || 'unknown'}`;
        const showErrorToast = (message) => {
            toast.dismiss(toastId);
            toast.custom((t) => React.createElement(
                'div',
                {
                    style: {
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        background: '#fef2f2', color: '#991b1b',
                        border: '1px solid #fca5a5', padding: '12px 14px',
                        borderRadius: '10px', boxShadow: '0 4px 16px rgba(239,68,68,0.15)',
                        maxWidth: '380px', width: '100%',
                        opacity: t.visible ? 1 : 0, transition: 'opacity 0.2s ease'
                    }
                },
                React.createElement(
                    'svg',
                    { width: '18', height: '18', viewBox: '0 0 24 24', fill: 'none', stroke: '#dc2626', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round', style: { flexShrink: 0, marginTop: '1px' } },
                    React.createElement('circle', { cx: '12', cy: '12', r: '10' }),
                    React.createElement('line', { x1: '12', y1: '8', x2: '12', y2: '12' }),
                    React.createElement('line', { x1: '12', y1: '16', x2: '12.01', y2: '16' })
                ),
                React.createElement('span', { style: { flex: 1, fontSize: '13px', fontWeight: '500', lineHeight: '1.4' } }, message),
                React.createElement(
                    'button',
                    {
                        onClick: () => toast.dismiss(t.id),
                        title: 'Dismiss',
                        style: {
                            background: 'transparent', border: 'none', color: '#dc2626',
                            cursor: 'pointer', padding: '2px', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            borderRadius: '4px', flexShrink: 0
                        }
                    },
                    React.createElement(
                        'svg',
                        { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' },
                        React.createElement('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
                        React.createElement('line', { x1: '6', y1: '6', x2: '18', y2: '18' })
                    )
                )
            ), { duration: 6000, id: toastId });
        };

        if (error.response && error.response.status !== 401) {
            const message = error.response.data?.error || error.response.data?.message || 'An unexpected error occurred';
            showErrorToast(message);
        } else if (!error.response) {
            showErrorToast('Network error. Please check your connection.');
        }

        return Promise.reject(error);
    }
);

export default api;
