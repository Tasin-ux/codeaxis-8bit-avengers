import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { User, Shield, Mail, Calendar } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, membership, currentWorkspace } = useAuth();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">User Profile</h2>
        <p className="text-sm text-slate-500 mt-1">
          Your personal account details and workspace permissions.
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{user?.full_name}</h3>
            <p className="text-sm text-slate-500">@{user?.username}</p>
          </div>
        </div>

        <div className="pt-6 space-y-4 text-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-500 w-32">Email:</span>
            <span className="text-slate-900">{user?.email}</span>
          </div>

          <div className="flex items-center gap-3 text-slate-700">
            <Shield className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-500 w-32">Current Role:</span>
            <span className="capitalize font-semibold text-indigo-600">
              {membership?.role || 'Member'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-700">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-500 w-32">Active Workspace:</span>
            <span className="text-slate-900">{currentWorkspace?.name || 'None'}</span>
          </div>

          <div className="flex items-center gap-3 text-slate-700">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-500 w-32">Account Created:</span>
            <span className="text-slate-900">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
