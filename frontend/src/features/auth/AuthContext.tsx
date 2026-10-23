import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { authApi } from '../../api/auth';
import { workspacesApi } from '../../api/workspaces';
import { User, Workspace, WorkspaceMembership } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  membership: WorkspaceMembership | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; full_name: string; password: string }) => Promise<void>;
  logout: () => void;
  setCurrentWorkspace: (ws: Workspace) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [membership, setMembership] = useState<WorkspaceMembership | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMembership = async (workspaceId: string, userId: string) => {
    try {
      const members = await workspacesApi.listMembers(workspaceId);
      const myMembership = members.find((m) => m.user_id === userId) || null;
      setMembership(myMembership);
    } catch {
      setMembership(null);
    }
  };

  const loadWorkspaces = useCallback(async (activeUser: User) => {
    try {
      const wsList = await workspacesApi.list();
      setWorkspaces(wsList);

      const savedWsId = localStorage.getItem('current_workspace_id');
      const selected = wsList.find((w) => w.id === savedWsId) || wsList[0] || null;

      if (selected) {
        setCurrentWorkspaceState(selected);
        localStorage.setItem('current_workspace_id', selected.id);
        await fetchMembership(selected.id, activeUser.id);
      }
    } catch (e) {
      console.error('Failed to load workspaces', e);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getMe();
      setUser(currentUser);
      await loadWorkspaces(currentUser);
    } catch (err) {
      // Only end the session when the token is actually rejected (401).
      // Transient network/server errors must not silently log the user out.
      if (isAxiosError(err) && err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [loadWorkspaces]);

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [token, refreshUser]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Backend accepts either `email` or `username` as the identifier.
      const res = await authApi.login({ email, password });
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('refresh_token', res.refresh_token);
      setToken(res.access_token);
      // The login response only contains tokens — fetch the user profile.
      const me = await authApi.getMe();
      setUser(me);
      await loadWorkspaces(me);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: { email: string; username: string; full_name: string; password: string }) => {
    setLoading(true);
    try {
      await authApi.register(data);
      // Auto-login after successful registration
      await login(data.email, data.password);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authApi.logout();
    setToken(null);
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspaceState(null);
    setMembership(null);
  };

  const setCurrentWorkspace = async (ws: Workspace) => {
    setCurrentWorkspaceState(ws);
    localStorage.setItem('current_workspace_id', ws.id);
    if (user) {
      await fetchMembership(ws.id, user.id);
    }
  };

  const refreshWorkspaces = async () => {
    if (user) {
      await loadWorkspaces(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentWorkspace,
        workspaces,
        membership,
        loading,
        login,
        register,
        logout,
        setCurrentWorkspace,
        refreshUser,
        refreshWorkspaces,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
