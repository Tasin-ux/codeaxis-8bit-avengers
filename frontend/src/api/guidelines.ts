import api from './client';
import { BrandGuideline } from '../types';

export interface GuidelineCreatePayload {
  workspace_id: string;
  brand_id?: string | null;
  title: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  is_active?: boolean;
}

export interface GuidelineUpdatePayload {
  brand_id?: string | null;
  title?: string;
  description?: string;
  category?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  is_active?: boolean;
}

export const guidelinesApi = {
  list: async (workspaceId: string): Promise<BrandGuideline[]> => {
    const res = await api.get<BrandGuideline[]>(`/guidelines?workspace_id=${workspaceId}`);
    return res.data;
  },

  create: async (payload: GuidelineCreatePayload): Promise<BrandGuideline> => {
    const res = await api.post<BrandGuideline>('/guidelines', payload);
    return res.data;
  },

  update: async (id: string, payload: GuidelineUpdatePayload): Promise<BrandGuideline> => {
    const res = await api.patch<BrandGuideline>(`/guidelines/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/guidelines/${id}`);
  },
};
