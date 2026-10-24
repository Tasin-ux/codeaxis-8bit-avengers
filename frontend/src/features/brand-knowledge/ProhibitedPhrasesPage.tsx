import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  prohibitedPhrasesApi,
  ProhibitedPhraseCreatePayload,
} from '../../api/prohibitedPhrases';
import { ProhibitedPhrase } from '../../types';
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
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { Plus, Trash2, Edit2, Ban } from 'lucide-react';

export const ProhibitedPhrasesPage: React.FC = () => {
  const { currentWorkspace, membership } = useAuth();
  const [phrases, setPhrases] = useState<ProhibitedPhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [phrase, setPhrase] = useState('');
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState('high');
  const [suggestedAlternative, setSuggestedAlternative] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(true);

  const canManage = membership?.role === 'admin' || membership?.role === 'manager';
  const { ask, dialog } = useConfirm();

  const loadPhrases = async () => {
    if (!currentWorkspace) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await prohibitedPhrasesApi.list(currentWorkspace.id);
      setPhrases(data);
    } catch {
      setError('Failed to load prohibited phrases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhrases();
  }, [currentWorkspace]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setPhrase('');
    setReason('');
    setSeverity('high');
    setSuggestedAlternative('');
    setCaseSensitive(false);
    setWholeWord(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (p: ProhibitedPhrase) => {
    setEditingId(p.id);
    setPhrase(p.phrase);
    setReason(p.reason ?? '');
    setSeverity(p.severity);
    setSuggestedAlternative(p.suggested_alternative || '');
    setCaseSensitive(p.case_sensitive);
    setWholeWord(p.whole_word);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setError(null);

    try {
      if (editingId) {
        await prohibitedPhrasesApi.update(editingId, {
          phrase,
          reason,
          severity,
          suggested_alternative: suggestedAlternative,
          case_sensitive: caseSensitive,
          whole_word: wholeWord,
        });
      } else {
        const payload: ProhibitedPhraseCreatePayload = {
          workspace_id: currentWorkspace.id,
          phrase,
          reason,
          severity,
          suggested_alternative: suggestedAlternative,
          case_sensitive: caseSensitive,
          whole_word: wholeWord,
        };
        await prohibitedPhrasesApi.create(payload);
      }
      setModalOpen(false);
      await loadPhrases();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await ask({
      title: 'Delete prohibited phrase?',
      message: 'This permanently removes the rule. Submissions will no longer be checked against it.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await prohibitedPhrasesApi.delete(id);
      await loadPhrases();
    } catch {
      setError('Failed to delete prohibited phrase');
    }
  };

  if (loading) return <LoadingSpinner message="Loading prohibited phrases..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
            Prohibited Phrases
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Expressions strictly disallowed across content submissions due to legal, regulatory, or brand risks.
          </p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} icon={<Plus className="w-4 h-4" />}>
            Add Prohibited Phrase
          </Button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {phrases.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Ban className="w-8 h-8 text-stone-400" />}
            title="No prohibited phrases configured"
            description="Add phrases that must not appear in marketing copy."
            actionLabel={canManage ? 'Add Prohibited Phrase' : undefined}
            onAction={canManage ? handleOpenCreate : undefined}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Prohibited Phrase</th>
                  <th className="py-3 px-6">Severity</th>
                  <th className="py-3 px-6">Reason</th>
                  <th className="py-3 px-6">Suggested Alternative</th>
                  <th className="py-3 px-6">Matching</th>
                  {canManage && <th className="py-3 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {phrases.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/50">
                    <td className="py-4 px-6 font-semibold text-red-600 font-mono text-xs">
                      &quot;{p.phrase}&quot;
                    </td>
                    <td className="py-4 px-6">
                      <SeverityBadge severity={p.severity} />
                    </td>
                    <td className="py-4 px-6 text-stone-600 max-w-xs">{p.reason}</td>
                    <td className="py-4 px-6 text-emerald-700 font-medium text-xs">
                      {p.suggested_alternative || <span className="text-stone-400 italic">None</span>}
                    </td>
                    <td className="py-4 px-6 text-stone-500 text-xs">
                      {p.whole_word ? 'Whole word' : 'Substrings'}
                      {p.case_sensitive && ', Case-sensitive'}
                    </td>
                    {canManage && (
                      <td className="py-4 px-6 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenEdit(p)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => handleDelete(p.id)}
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
        title={editingId ? 'Edit Prohibited Phrase' : 'Add Prohibited Phrase'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Prohibited Phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="e.g. guarantees results"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Severity"
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

            <Input
              label="Suggested Alternative (optional)"
              value={suggestedAlternative}
              onChange={(e) => setSuggestedAlternative(e.target.value)}
              placeholder="e.g. designed to achieve results"
            />
          </div>

          <Textarea
            label="Reason for Prohibition"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain the legal, regulatory, or reputational liability..."
            rows={3}
            required
          />

          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pp_whole_word"
                checked={wholeWord}
                onChange={(e) => setWholeWord(e.target.checked)}
                className="rounded border-stone-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="pp_whole_word" className="text-sm text-stone-700">
                Match whole word only (avoids partial substrings)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pp_case_sensitive"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="rounded border-stone-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="pp_case_sensitive" className="text-sm text-stone-700">
                Case sensitive matching
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingId ? 'Save Changes' : 'Create Rule'}</Button>
          </div>
        </form>
      </Modal>
      {dialog}
    </div>
  );
};
