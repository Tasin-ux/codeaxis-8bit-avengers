import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { guidelinesApi, GuidelineCreatePayload } from '../../api/guidelines';
import { BrandGuideline } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { SeverityBadge } from '../../components/ui/SeverityBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/Alert';
import { Plus, Trash2, Edit2, BookOpen } from 'lucide-react';

export const GuidelinesPage: React.FC = () => {
  const { currentWorkspace, membership } = useAuth();
  const [guidelines, setGuidelines] = useState<BrandGuideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tone & Voice');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low' | 'info'>(
    'medium'
  );

  const canManage = membership?.role === 'admin' || membership?.role === 'manager';

  const loadGuidelines = async () => {
    if (!currentWorkspace) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await guidelinesApi.list(currentWorkspace.id);
      setGuidelines(data);
    } catch (err: any) {
      setError('Failed to load brand guidelines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuidelines();
  }, [currentWorkspace]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setCategory('Tone & Voice');
    setSeverity('medium');
    setModalOpen(true);
  };

  const handleOpenEdit = (g: BrandGuideline) => {
    setEditingId(g.id);
    setTitle(g.title);
    setDescription(g.description);
    setCategory(g.category);
    setSeverity(g.severity);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setError(null);

    try {
      if (editingId) {
        await guidelinesApi.update(editingId, {
          title,
          description,
          category,
          severity,
        });
      } else {
        const payload: GuidelineCreatePayload = {
          workspace_id: currentWorkspace.id,
          title,
          description,
          category,
          severity,
        };
        await guidelinesApi.create(payload);
      }
      setModalOpen(false);
      await loadGuidelines();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this guideline?')) return;
    try {
      await guidelinesApi.delete(id);
      await loadGuidelines();
    } catch (err: any) {
      setError('Failed to delete guideline');
    }
  };

  if (loading) return <LoadingSpinner message="Loading guidelines..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Brand Guidelines</h2>
          <p className="text-sm text-slate-500 mt-1">
            Core qualitative and quantitative rules for brand tone, voice, and style.
          </p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} icon={<Plus className="w-4 h-4" />}>
            Add Guideline
          </Button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {guidelines.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen className="w-8 h-8 text-slate-400" />}
            title="No guidelines configured"
            description="Add brand voice and communication guidelines for this workspace."
            actionLabel={canManage ? 'Add Guideline' : undefined}
            onAction={canManage ? handleOpenCreate : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guidelines.map((g) => (
            <Card key={g.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {g.category}
                  </span>
                  <SeverityBadge severity={g.severity} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">{g.title}</h3>
                <p className="text-sm text-slate-600">{g.description}</p>
              </div>

              {canManage && (
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit2 className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenEdit(g)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => handleDelete(g.id)}
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
        title={editingId ? 'Edit Brand Guideline' : 'Add Brand Guideline'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Guideline Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Professional and approachable tone"
            required
          />

          <Textarea
            label="Description & Guidance"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain the guideline in detail, including examples of good and bad phrasing..."
            rows={4}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: 'Tone & Voice', label: 'Tone & Voice' },
                { value: 'Legal & Compliance', label: 'Legal & Compliance' },
                { value: 'Style', label: 'Style' },
                { value: 'Competitive', label: 'Competitive' },
                { value: 'Product', label: 'Product' },
              ]}
            />

            <Select
              label="Severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
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
            <Button type="submit">{editingId ? 'Save Changes' : 'Create Guideline'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
