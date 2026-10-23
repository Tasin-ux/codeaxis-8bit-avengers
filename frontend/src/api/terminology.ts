import api from './client';
import { ApprovedTerminology } from '../types';

export interface TerminologyCreatePayload {
  workspace_id: string;
  preferred_term: string;
  disallowed_term: string;
  explanation: string;
  case_sensitive?: boolean;
  is_active?: boolean;
}

export interface TerminologyUpdatePayload {
  preferred_term?: string;
  disallowed_term?: string;
  explanation?: string;
  case_sensitive?: boolean;
  is_active?: boolean;
}

export const terminologyApi = {
  list: async (workspaceId: string): Promise<ApprovedTerminology[]> => {
    const res = await api.get<ApprovedTerminology[]>(`/terminology?workspace_id=${workspaceId}`);
    return res.data;
  },

  create: async (payload: TerminologyCreatePayload): Promise<ApprovedTerminology> => {
    const res = await api.post<ApprovedTerminology>('/terminology', payload);
    return res.data;
  },

  update: async (id: string, payload: TerminologyUpdatePayload): Promise<ApprovedTerminology> => {
    const res = await api.patch<ApprovedTerminology>(`/terminology/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/terminology/${id}`);
  },
};
