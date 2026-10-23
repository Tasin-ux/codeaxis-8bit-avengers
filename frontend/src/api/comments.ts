import api from './client';
import { ReviewComment } from '../types';

export interface CommentCreatePayload {
  text: string;
  revision_number?: number | null;
  finding_id?: string | null;
}

export const commentsApi = {
  list: async (submissionId: string): Promise<ReviewComment[]> => {
    const res = await api.get<ReviewComment[]>(`/submissions/${submissionId}/comments`);
    return res.data;
  },

  create: async (submissionId: string, payload: CommentCreatePayload): Promise<ReviewComment> => {
    const res = await api.post<ReviewComment>(`/submissions/${submissionId}/comments`, payload);
    return res.data;
  },
};
