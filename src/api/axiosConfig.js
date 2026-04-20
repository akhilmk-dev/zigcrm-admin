import axios from 'axios';

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

// Response Interceptor: Handle 401 and Refresh Token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // Return immediately if it's not a 401 Auth error, or if request is the refresh or login endpoint itself
        if (error.response?.status !== 401 || originalRequest.url === '/auth/refresh' || originalRequest.url === '/auth/login') {
            return Promise.reject(error);
        }

        // Only try to refresh once
        if (!originalRequest._retry) {
            if (isRefreshing) {
                // If currently refreshing, wait and try again
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
                // Hit the backend to process the HttpOnly refresh token
                const { data } = await axios.post('http://localhost:5010/api/auth/refresh', {}, { withCredentials: true });
                
                const newAccessToken = data.accessToken;
                
                // Save new token
                localStorage.setItem('accessToken', newAccessToken);
                
                isRefreshing = false;
                onRefreshed(newAccessToken);

                // Re-try the original failing request
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                return api(originalRequest);

            } catch (err) {
                // Completely failed to refresh (Refresh Token Expired too)
                isRefreshing = false;
                console.error("Session expired completely. Force Logout.");
                
                // Clear local storage completely
                localStorage.clear();
                
                // Tell backend to clear the http-only cookie too
                await axios.post('http://localhost:5010/api/auth/logout', {}, { withCredentials: true }).catch(() => {});

                // Force UI Navigation to Login (Window location is safest pure-JS fallback outside of React Router context)
                window.location.href = '/login';
                
                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
