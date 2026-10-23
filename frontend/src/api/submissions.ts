import api from './client';
import {
  ContentSubmission,
  ReviewFinding,
  SubmissionRevision,
} from '../types';

export interface SubmissionCreatePayload {
  workspace_id: string;
  brand_id?: string | null;
  title: string;
  content: string;
  content_type?: string;
}

export interface SubmissionUpdatePayload {
  title?: string;
  content?: string;
  brand_id?: string | null;
  content_type?: string;
}

export interface ReviewDecisionPayload {
  decision: 'approved' | 'changes_requested';
  comment?: string;
}

export const submissionsApi = {
  list: async (
    workspaceId: string,
    brandId?: string,
    authorId?: string,
    status?: string
  ): Promise<ContentSubmission[]> => {
    let url = `/submissions?workspace_id=${workspaceId}`;
    if (brandId) url += `&brand_id=${brandId}`;
    if (authorId) url += `&author_id=${authorId}`;
    if (status) url += `&status=${status}`;
    const res = await api.get<ContentSubmission[]>(url);
    return res.data;
  },

  create: async (payload: SubmissionCreatePayload): Promise<ContentSubmission> => {
    const res = await api.post<ContentSubmission>('/submissions', payload);
    return res.data;
  },

  getById: async (id: string): Promise<ContentSubmission> => {
    const res = await api.get<ContentSubmission>(`/submissions/${id}`);
    return res.data;
  },

  update: async (id: string, payload: SubmissionUpdatePayload): Promise<ContentSubmission> => {
    const res = await api.patch<ContentSubmission>(`/submissions/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/submissions/${id}`);
  },

  runReview: async (id: string): Promise<ReviewFinding[]> => {
    const res = await api.post<ReviewFinding[]>(`/submissions/${id}/review`);
    return res.data;
  },

  submitForReview: async (id: string): Promise<ContentSubmission> => {
    const res = await api.post<ContentSubmission>(`/submissions/${id}/submit`);
    return res.data;
  },

  approve: async (id: string, payload?: ReviewDecisionPayload): Promise<ContentSubmission> => {
    const res = await api.post<ContentSubmission>(`/submissions/${id}/approve`, payload || {
      decision: 'approved',
    });
    return res.data;
  },

  requestChanges: async (id: string, payload: ReviewDecisionPayload): Promise<ContentSubmission> => {
    const res = await api.post<ContentSubmission>(`/submissions/${id}/request-changes`, payload);
    return res.data;
  },

  getFindings: async (id: string): Promise<ReviewFinding[]> => {
    const res = await api.get<ReviewFinding[]>(`/submissions/${id}/findings`);
    return res.data;
  },

  getRevisions: async (id: string): Promise<SubmissionRevision[]> => {
    const res = await api.get<SubmissionRevision[]>(`/submissions/${id}/revisions`);
    return res.data;
  },
};
