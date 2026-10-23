import api from './client';
import { RequiredDisclaimer } from '../types';

export interface DisclaimerCreatePayload {
  workspace_id: string;
  text: string;
  content_category: string;
  severity: string;
  is_active?: boolean;
}

export interface DisclaimerUpdatePayload {
  text?: string;
  content_category?: string;
  severity?: string;
  is_active?: boolean;
}

export const disclaimersApi = {
  list: async (workspaceId: string): Promise<RequiredDisclaimer[]> => {
    const res = await api.get<RequiredDisclaimer[]>(`/disclaimers?workspace_id=${workspaceId}`);
    return res.data;
  },

  create: async (payload: DisclaimerCreatePayload): Promise<RequiredDisclaimer> => {
    const res = await api.post<RequiredDisclaimer>('/disclaimers', payload);
    return res.data;
  },

  update: async (id: string, payload: DisclaimerUpdatePayload): Promise<RequiredDisclaimer> => {
    const res = await api.patch<RequiredDisclaimer>(`/disclaimers/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/disclaimers/${id}`);
  },
};
