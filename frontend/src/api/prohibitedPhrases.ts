import api from './client';
import { ProhibitedPhrase } from '../types';

export interface ProhibitedPhraseCreatePayload {
  workspace_id: string;
  phrase: string;
  reason: string;
  severity: string;
  suggested_alternative?: string;
  case_sensitive?: boolean;
  whole_word?: boolean;
  is_active?: boolean;
}

export interface ProhibitedPhraseUpdatePayload {
  phrase?: string;
  reason?: string;
  severity?: string;
  suggested_alternative?: string;
  case_sensitive?: boolean;
  whole_word?: boolean;
  is_active?: boolean;
}

export const prohibitedPhrasesApi = {
  list: async (workspaceId: string): Promise<ProhibitedPhrase[]> => {
    const res = await api.get<ProhibitedPhrase[]>(`/prohibited-phrases?workspace_id=${workspaceId}`);
    return res.data;
  },

  create: async (payload: ProhibitedPhraseCreatePayload): Promise<ProhibitedPhrase> => {
    const res = await api.post<ProhibitedPhrase>('/prohibited-phrases', payload);
    return res.data;
  },

  update: async (id: string, payload: ProhibitedPhraseUpdatePayload): Promise<ProhibitedPhrase> => {
    const res = await api.patch<ProhibitedPhrase>(`/prohibited-phrases/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/prohibited-phrases/${id}`);
  },
};
