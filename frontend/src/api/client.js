import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 60000, // 60s timeout for heavy AI video processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected network error occurred.';
    if (error.response) {
      if (typeof error.response.data?.detail === 'string') {
        message = error.response.data.detail;
      } else if (Array.isArray(error.response.data?.detail)) {
        message = error.response.data.detail.map(d => `${d.loc?.join('.') || 'param'}: ${d.msg}`).join(', ');
      } else {
        message = `HTTP ${error.response.status}: ${error.response.statusText || 'Request failed'}`;
      }
    } else if (error.request) {
      message = 'Cannot reach backend server. Please verify FastAPI is running at http://127.0.0.1:8000';
    } else {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
