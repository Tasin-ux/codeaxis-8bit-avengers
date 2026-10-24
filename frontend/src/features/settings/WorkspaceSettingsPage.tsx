import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { workspacesApi } from '../../api/workspaces';
import { WorkspaceMembership } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Alert } from '../../components/ui/Alert';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { Plus, Trash2 } from 'lucide-react';

export const WorkspaceSettingsPage: React.FC = () => {
  const { currentWorkspace, membership, refreshWorkspaces } = useAuth();
  const [members, setMembers] = useState<WorkspaceMembership[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingWs, setSavingWs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add member modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'manager' | 'creator' | 'external'>(
    'creator'
  );

  const isAdmin = membership?.role === 'admin';
  const { ask, dialog } = useConfirm();

  const loadData = async () => {
    if (!currentWorkspace) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setName(currentWorkspace.name);
      setDescription(currentWorkspace.description || '');
      const memberList = await workspacesApi.listMembers(currentWorkspace.id);
      setMembers(memberList);
    } catch {
      setError('Failed to load workspace members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWorkspace]);

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setSavingWs(true);
    setError(null);
    try {
      await workspacesApi.update(currentWorkspace.id, {
        name,
        description,
      });
      await refreshWorkspaces();
      setSuccess('Workspace settings updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update workspace');
    } finally {
      setSavingWs(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setError(null);
    try {
      await workspacesApi.addMember(currentWorkspace.id, {
        email: newMemberEmail,
        role: newMemberRole,
      });
      setModalOpen(false);
      setNewMemberEmail('');
      setSuccess('Member added to workspace.');
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add member');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!currentWorkspace) return;
    try {
      await workspacesApi.updateMemberRole(currentWorkspace.id, userId, newRole);
      setSuccess('Role updated.');
      setTimeout(() => setSuccess(null), 2000);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentWorkspace) return;
    const ok = await ask({
      title: 'Remove member?',
      message:
        'This removes their access to this workspace. Their submissions and reviews are kept.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    try {
      await workspacesApi.removeMember(currentWorkspace.id, userId);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove member');
    }
  };

  if (loading) return <LoadingSpinner message="Loading workspace settings..." />;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
          Workspace Settings &amp; Access Control
        </h2>
        <p className="text-sm text-stone-500 mt-1">
          Configure workspace identity, team roles, and governance permissions.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/* General Settings */}
      <Card title="Workspace Profile" subtitle="General details about this brand governance workspace">
        <form onSubmit={handleSaveWorkspace} className="space-y-4">
          <Input
            label="Workspace Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin}
            required
          />

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isAdmin}
            rows={3}
          />

          {isAdmin && (
            <div className="flex justify-end pt-2">
              <Button type="submit" loading={savingWs}>
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* Members & Roles */}
      <Card
        title="Workspace Members"
        subtitle="Manage access roles: Administrator, Brand Manager, Content Creator, External Contributor"
        action={
          isAdmin && (
            <Button size="sm" onClick={() => setModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
              Add Member
            </Button>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Joined</th>
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-stone-50/50">
                  <td className="py-3 px-4 font-medium text-stone-900">
                    <div>
                      <p>{m.user?.full_name || 'Member'}</p>
                      <p className="text-xs text-stone-400">{m.user?.email || m.user_id}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {isAdmin ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                        className="text-xs border border-stone-300 rounded-md py-1.5 pl-2.5 pr-7 font-semibold text-stone-700 bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/15 focus:border-teal-600"
                      >
                        <option value="admin">Administrator</option>
                        <option value="manager">Brand Manager</option>
                        <option value="creator">Content Creator</option>
                        <option value="external">External Contributor</option>
                      </select>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 capitalize">
                        {m.role}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-stone-400">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveMember(m.user_id)}
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Member Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Workspace Member">
        <form onSubmit={handleAddMember} className="space-y-4">
          <Input
            label="User Email Address"
            type="email"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            placeholder="colleague@brandguard.ai"
            required
          />

          <Select
            label="Assigned Role"
            value={newMemberRole}
            onChange={(e) => setNewMemberRole(e.target.value as any)}
            options={[
              { value: 'creator', label: 'Content Creator (Create, edit, audit own drafts)' },
              { value: 'manager', label: 'Brand Manager (Manage rules, review & approve content)' },
              { value: 'admin', label: 'Administrator (Full workspace governance access)' },
              { value: 'external', label: 'External Contributor (Draft submissions only)' },
            ]}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add to Workspace</Button>
          </div>
        </form>
      </Modal>
      {dialog}
    </div>
  );
};
