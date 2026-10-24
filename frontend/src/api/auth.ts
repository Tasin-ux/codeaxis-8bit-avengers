import api from './client';
import { User } from '../types';

export interface LoginPayload {
  email?: string; // email or username
  username?: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  full_name: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<TokenResponse> => {
    const res = await api.post<TokenResponse>('/auth/login', payload);
    return res.data;
  },

  register: async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const res = await api.post<RegisterResponse>('/auth/register', payload);
    return res.data;
  },

  verifyOtp: async (email: string, code: string): Promise<TokenResponse> => {
    const res = await api.post<TokenResponse>('/auth/verify-otp', { email, code });
    return res.data;
  },

  resendOtp: async (email: string, purpose: 'register' | 'forgot_password' = 'register'): Promise<void> => {
    await api.post('/auth/resend-otp', { email, purpose });
  },

  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_workspace_id');
  },
};
