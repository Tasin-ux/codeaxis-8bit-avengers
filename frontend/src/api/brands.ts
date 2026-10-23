import api from './client';
import { Brand } from '../types';

export interface BrandCreatePayload {
  workspace_id: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface BrandUpdatePayload {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export const brandsApi = {
  list: async (workspaceId: string): Promise<Brand[]> => {
    const res = await api.get<Brand[]>(`/brands?workspace_id=${workspaceId}`);
    return res.data;
  },

  create: async (payload: BrandCreatePayload): Promise<Brand> => {
    const res = await api.post<Brand>('/brands', payload);
    return res.data;
  },

  update: async (id: string, payload: BrandUpdatePayload): Promise<Brand> => {
    const res = await api.patch<Brand>(`/brands/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/brands/${id}`);
  },
};
