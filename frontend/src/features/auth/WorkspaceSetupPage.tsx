import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { workspacesApi } from '../../api/workspaces';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

export const WorkspaceSetupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setCurrentWorkspace, refreshWorkspaces } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const ws = await workspacesApi.create({
        name,
        description,
      });
      await refreshWorkspaces();
      await setCurrentWorkspace(ws);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create workspace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-stone-900 mb-2">Create Your Workspace</h3>
      <p className="text-sm text-stone-500 mb-6">
        Set up a workspace for your brand guidelines, terminology, and content checks.
      </p>

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Workspace Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acme Marketing"
          required
        />

        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Workspace purpose and team scope..."
          rows={3}
        />

        <Button type="submit" className="w-full" loading={loading}>
          Set Up Workspace &amp; Continue
        </Button>
      </form>
    </div>
  );
};
