import api from './client';
import { Workspace, WorkspaceMembership } from '../types';

export interface WorkspaceCreatePayload {
  name: string;
  slug?: string;
  description?: string;
}

export interface WorkspaceUpdatePayload {
  name?: string;
  description?: string;
}

export interface AddMemberPayload {
  user_id?: string;
  email?: string;
  role: 'admin' | 'manager' | 'creator' | 'external';
}

export const workspacesApi = {
  list: async (): Promise<Workspace[]> => {
    const res = await api.get<Workspace[]>('/workspaces');
    return res.data;
  },

  create: async (payload: WorkspaceCreatePayload): Promise<Workspace> => {
    const res = await api.post<Workspace>('/workspaces', payload);
    return res.data;
  },

  getById: async (id: string): Promise<Workspace> => {
    const res = await api.get<Workspace>(`/workspaces/${id}`);
    return res.data;
  },

  update: async (id: string, payload: WorkspaceUpdatePayload): Promise<Workspace> => {
    const res = await api.patch<Workspace>(`/workspaces/${id}`, payload);
    return res.data;
  },

  listMembers: async (workspaceId: string): Promise<WorkspaceMembership[]> => {
    const res = await api.get<WorkspaceMembership[]>(`/workspaces/${workspaceId}/members`);
    return res.data;
  },

  addMember: async (workspaceId: string, payload: AddMemberPayload): Promise<WorkspaceMembership> => {
    const res = await api.post<WorkspaceMembership>(`/workspaces/${workspaceId}/members`, payload);
    return res.data;
  },

  updateMemberRole: async (
    workspaceId: string,
    userId: string,
    role: string
  ): Promise<WorkspaceMembership> => {
    const res = await api.patch<WorkspaceMembership>(`/workspaces/${workspaceId}/members/${userId}`, {
      role,
    });
    return res.data;
  },

  removeMember: async (workspaceId: string, userId: string): Promise<void> => {
    await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
  },
};
