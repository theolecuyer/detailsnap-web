import axios from 'axios';

function makeInstance(baseURL) {
  const instance = axios.create({ baseURL });
  instance.interceptors.request.use(cfg => {
    const token = localStorage.getItem('ds_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
  });
  instance.interceptors.response.use(
    r => r,
    err => {
      if (err.response?.status === 401) {
        localStorage.removeItem('ds_token');
        localStorage.removeItem('ds_user');
        window.location.href = '/login';
      }
      return Promise.reject(err);
    },
  );
  return instance;
}

export const authApi  = makeInstance(import.meta.env.VITE_AUTH_URL  || 'http://localhost:8081');
export const coreApi  = makeInstance(import.meta.env.VITE_CORE_URL  || 'http://localhost:8082');
export const mediaApi = makeInstance(import.meta.env.VITE_MEDIA_URL || 'http://localhost:8083');

export const fmt = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents ?? 0) / 100);
