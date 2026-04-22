import axios from 'axios';
import { toast } from 'react-hot-toast';

// Create a custom axios instance
const api = axios.create({
    baseURL: 'http://localhost:5010/api',
    withCredentials: true // Important for sending/receiving HttpOnly cookies (refresh token)
});

export const FILE_BASE_URL = 'http://localhost:5010';

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
                return new Promise(function(resolve) {
                    subscribeTokenRefresh(token => {
                        originalRequest.headers['Authorization'] = 'Bearer ' + token;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await axios.post('http://localhost:5010/api/auth/refresh', {}, { withCredentials: true });
                const newAccessToken = data.accessToken;
                localStorage.setItem('accessToken', newAccessToken);
                isRefreshing = false;
                onRefreshed(newAccessToken);
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (err) {
                isRefreshing = false;
                localStorage.clear();
                await axios.post('http://localhost:5010/api/auth/logout', {}, { withCredentials: true }).catch(() => {});
                window.location.href = '/login';
                return Promise.reject(err);
            }
        }

        // Global Error Toasting (excluding 401 which is handled above)
        if (error.response && error.response.status !== 401) {
            const message = error.response.data?.error || error.response.data?.message || 'An unexpected error occurred';
            toast.error(message);
        } else if (!error.response) {
            toast.error('Network error. Please check your connection.');
        }

        return Promise.reject(error);
    }
);

export default api;
