import api from './client';
import { ApprovedFact } from '../types';

export interface FactCreatePayload {
  workspace_id: string;
  title: string;
  statement: string;
  source_reference: string;
  source_type: string;
  source_url?: string | null;
  verification_status?: 'verified' | 'unverified' | 'expired';
  product_or_campaign?: string | null;
  last_verified_date?: string | null;
  expiration_date?: string | null;
  is_active?: boolean;
}

export interface FactUpdatePayload {
  title?: string;
  statement?: string;
  source_reference?: string;
  source_type?: string;
  source_url?: string | null;
  verification_status?: 'verified' | 'unverified' | 'expired';
  product_or_campaign?: string | null;
  last_verified_date?: string | null;
  expiration_date?: string | null;
  is_active?: boolean;
}

export const factsApi = {
  list: async (workspaceId: string): Promise<ApprovedFact[]> => {
    const res = await api.get<ApprovedFact[]>(`/facts?workspace_id=${workspaceId}`);
    return res.data;
  },

  create: async (payload: FactCreatePayload): Promise<ApprovedFact> => {
    const res = await api.post<ApprovedFact>('/facts', payload);
    return res.data;
  },

  update: async (id: string, payload: FactUpdatePayload): Promise<ApprovedFact> => {
    const res = await api.patch<ApprovedFact>(`/facts/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/facts/${id}`);
  },
};
