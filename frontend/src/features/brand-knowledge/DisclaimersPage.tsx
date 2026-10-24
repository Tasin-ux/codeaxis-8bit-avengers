import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { disclaimersApi, DisclaimerCreatePayload } from '../../api/disclaimers';
import { RequiredDisclaimer } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { SeverityBadge } from '../../components/ui/SeverityBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/Alert';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { Plus, Trash2, Edit2, FileWarning } from 'lucide-react';

export const DisclaimersPage: React.FC = () => {
  const { currentWorkspace, membership } = useAuth();
  const [disclaimers, setDisclaimers] = useState<RequiredDisclaimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [text, setText] = useState('');
  const [contentCategory, setContentCategory] = useState('marketing_copy');
  const [severity, setSeverity] = useState('high');

  const canManage = membership?.role === 'admin' || membership?.role === 'manager';
  const { ask, dialog } = useConfirm();

  const loadDisclaimers = async () => {
    if (!currentWorkspace) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await disclaimersApi.list(currentWorkspace.id);
      setDisclaimers(data);
    } catch {
      setError('Failed to load disclaimers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisclaimers();
  }, [currentWorkspace]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setText('');
    setContentCategory('marketing_copy');
    setSeverity('high');
    setModalOpen(true);
  };

  const handleOpenEdit = (d: RequiredDisclaimer) => {
    setEditingId(d.id);
    setText(d.text);
    setContentCategory(d.content_category);
    setSeverity(d.severity);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setError(null);

    try {
      if (editingId) {
        await disclaimersApi.update(editingId, {
          text,
          content_category: contentCategory,
          severity,
        });
      } else {
        const payload: DisclaimerCreatePayload = {
          workspace_id: currentWorkspace.id,
          text,
          content_category: contentCategory,
          severity,
        };
        await disclaimersApi.create(payload);
      }
      setModalOpen(false);
      await loadDisclaimers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await ask({
      title: 'Delete disclaimer?',
      message: 'This permanently removes the required disclaimer from this workspace.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await disclaimersApi.delete(id);
      await loadDisclaimers();
    } catch {
      setError('Failed to delete disclaimer');
    }
  };

  if (loading) return <LoadingSpinner message="Loading disclaimers..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
            Required Disclaimers
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Mandatory disclosures that must appear in submitted content based on category.
          </p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} icon={<Plus className="w-4 h-4" />}>
            Add Disclaimer
          </Button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {disclaimers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileWarning className="w-8 h-8 text-stone-400" />}
            title="No required disclaimers configured"
            description="Add legal or regulatory disclaimers required for specific content types."
            actionLabel={canManage ? 'Add Disclaimer' : undefined}
            onAction={canManage ? handleOpenCreate : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {disclaimers.map((d) => (
            <Card key={d.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 capitalize">
                    {d.content_category.replace('_', ' ')}
                  </span>
                  <SeverityBadge severity={d.severity} />
                </div>
                <p className="text-sm text-stone-800 font-medium italic bg-stone-50 p-3 rounded-lg border border-stone-100 mt-2">
                  &quot;{d.text}&quot;
                </p>
              </div>

              {canManage && (
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-stone-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit2 className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenEdit(d)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => handleDelete(d.id)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Required Disclaimer' : 'Add Required Disclaimer'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            label="Exact Disclaimer Text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Results may vary based on configuration."
            rows={3}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Applicable Content Category"
              value={contentCategory}
              onChange={(e) => setContentCategory(e.target.value)}
              options={[
                { value: 'marketing_copy', label: 'Marketing Copy' },
                { value: 'product_description', label: 'Product Description' },
                { value: 'social_media', label: 'Social Media' },
                { value: 'email', label: 'Email' },
                { value: 'advertisement', label: 'Advertisement' },
                { value: 'presentation', label: 'Presentation' },
              ]}
            />

            <Select
              label="Violation Severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              options={[
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
                { value: 'info', label: 'Info' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingId ? 'Save Changes' : 'Create Disclaimer'}</Button>
          </div>
        </form>
      </Modal>
      {dialog}
    </div>
  );
};
