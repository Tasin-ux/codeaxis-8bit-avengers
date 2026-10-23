import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { terminologyApi, TerminologyCreatePayload } from '../../api/terminology';
import { ApprovedTerminology } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/Alert';
import { Plus, Trash2, Edit2, SpellCheck, ArrowRight, Check, X } from 'lucide-react';

export const TerminologyPage: React.FC = () => {
  const { currentWorkspace, membership } = useAuth();
  const [terms, setTerms] = useState<ApprovedTerminology[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [preferredTerm, setPreferredTerm] = useState('');
  const [disallowedTerm, setDisallowedTerm] = useState('');
  const [explanation, setExplanation] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);

  const canManage = membership?.role === 'admin' || membership?.role === 'manager';

  const loadTerms = async () => {
    if (!currentWorkspace) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await terminologyApi.list(currentWorkspace.id);
      setTerms(data);
    } catch {
      setError('Failed to load terminology');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTerms();
  }, [currentWorkspace]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setPreferredTerm('');
    setDisallowedTerm('');
    setExplanation('');
    setCaseSensitive(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (t: ApprovedTerminology) => {
    setEditingId(t.id);
    setPreferredTerm(t.preferred_term);
    setDisallowedTerm(t.disallowed_term);
    setExplanation(t.explanation ?? '');
    setCaseSensitive(t.case_sensitive);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setError(null);

    try {
      if (editingId) {
        await terminologyApi.update(editingId, {
          preferred_term: preferredTerm,
          disallowed_term: disallowedTerm,
          explanation,
          case_sensitive: caseSensitive,
        });
      } else {
        const payload: TerminologyCreatePayload = {
          workspace_id: currentWorkspace.id,
          preferred_term: preferredTerm,
          disallowed_term: disallowedTerm,
          explanation,
          case_sensitive: caseSensitive,
        };
        await terminologyApi.create(payload);
      }
      setModalOpen(false);
      await loadTerms();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this terminology entry?')) return;
    try {
      await terminologyApi.delete(id);
      await loadTerms();
    } catch {
      setError('Failed to delete terminology entry');
    }
  };

  if (loading) return <LoadingSpinner message="Loading terminology..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Approved Terminology
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Standardize vocabulary by replacing disallowed phrases with brand-preferred terms.
          </p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} icon={<Plus className="w-4 h-4" />}>
            Add Terminology
          </Button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {terms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<SpellCheck className="w-8 h-8 text-slate-400" />}
            title="No terminology rules configured"
            description="Add preferred vs disallowed terms for this workspace."
            actionLabel={canManage ? 'Add Terminology' : undefined}
            onAction={canManage ? handleOpenCreate : undefined}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Disallowed Term</th>
                  <th className="py-3 px-6"></th>
                  <th className="py-3 px-6">Preferred Term</th>
                  <th className="py-3 px-6">Explanation</th>
                  <th className="py-3 px-6">Case Sensitive</th>
                  {canManage && <th className="py-3 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {terms.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-6 font-semibold text-red-600">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 border border-red-200">
                        <X className="w-3.5 h-3.5" />
                        {t.disallowed_term}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-slate-400">
                      <ArrowRight className="w-4 h-4" />
                    </td>
                    <td className="py-4 px-6 font-semibold text-emerald-700">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200">
                        <Check className="w-3.5 h-3.5" />
                        {t.preferred_term}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 max-w-xs">{t.explanation}</td>
                    <td className="py-4 px-6 text-slate-500 text-xs">
                      {t.case_sensitive ? 'Yes' : 'No'}
                    </td>
                    {canManage && (
                      <td className="py-4 px-6 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenEdit(t)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => handleDelete(t.id)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Dialog */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Terminology Rule' : 'Add Terminology Rule'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Disallowed Term / Variant"
            value={disallowedTerm}
            onChange={(e) => setDisallowedTerm(e.target.value)}
            placeholder="e.g. consumer"
            required
          />

          <Input
            label="Preferred Term"
            value={preferredTerm}
            onChange={(e) => setPreferredTerm(e.target.value)}
            placeholder="e.g. customer"
            required
          />

          <Textarea
            label="Explanation & Reason"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Why is this preferred over the alternative?"
            rows={3}
            required
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="case_sensitive"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="case_sensitive" className="text-sm font-medium text-slate-700">
              Case sensitive matching
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingId ? 'Save Changes' : 'Create Terminology'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
