import { Env } from '@env';
import axios from 'axios';

import { getToken, getUserData, removeToken, setToken } from '@/lib/auth/utils';

export const client = axios.create({
  baseURL: Env.API_URL,
});

// Request interceptor to attach Bearer token
client.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token?.access) {
      config.headers.Authorization = `Bearer ${token.access}`;
    }

    if (__DEV__) {
      // Note: TypeScript types ("expected response") are erased at runtime and cannot be logged automatically.
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
let isRefreshing = false;

interface QueueItem {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}

let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

client.interceptors.response.use(
  (response) => {
    if (__DEV__) {
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (__DEV__ && originalRequest) {
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return client(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const token = getToken();
      if (!token?.refresh) {
        isRefreshing = false;
        // Optional: Trigger signOut here if needed
        return Promise.reject(error);
      }

      try {
        const userId = getUserData()?.id;
        const response = await axios.post(`${Env.API_URL}/auth/refresh-token`, {
          refreshToken: token.refresh,
          userId: userId,
        });

        const newTokens = response.data.data;
        setToken({
          access: newTokens.accessToken,
          refresh: newTokens.refreshToken,
        });

        processQueue(null, newTokens.accessToken);
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        removeToken();
        // Optional: Trigger signOut here
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
