import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function redirectToLogin() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  if (window.location.pathname !== '/login') {
    const next = encodeURIComponent(
      window.location.pathname + window.location.search
    );
    window.location.href = `/login?next=${next}`;
  }
}

async function refreshSession(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;
  try {
    // Use a bare axios instance so this call never hits our own interceptors.
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL || '/api/v1'}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const { access_token, refresh_token } = res.data;
    if (!access_token) return false;
    localStorage.setItem('access_token', access_token);
    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
    return true;
  } catch {
    return false;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // FastAPI 422 validation errors return `detail` as an array of objects.
    // Normalize it to a readable string so React never tries to render
    // raw objects (which throws "Objects are not valid as a React child").
    const data = error.response?.data as { detail?: unknown } | undefined;
    if (error.response?.status === 422 && data && Array.isArray(data.detail)) {
      const detail = (data.detail as Array<{ loc?: string[]; msg?: string }>)
        .map((item) => {
          const location = Array.isArray(item.loc) ? item.loc.join('.') : '';
          return location ? `${location}: ${item.msg ?? 'Invalid value'}` : (item.msg ?? 'Invalid value');
        })
        .join('; ');
      data.detail = detail || 'Invalid request';
    }

    const config = error.config as RetriableRequestConfig | undefined;
    const url = String(config?.url ?? '');
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');

    // On 401, try a single silent refresh before giving up on the session.
    if (error.response?.status === 401 && !isAuthEndpoint && !config?._retry) {
      if (config) config._retry = true;
      const refreshed = await refreshSession();
      if (refreshed && config) {
        return api.request(config);
      }
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export default api;
