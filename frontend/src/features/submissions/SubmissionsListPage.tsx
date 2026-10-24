import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { submissionsApi } from '../../api/submissions';
import { ContentSubmission } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/Alert';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PlusCircle, FileText, ArrowRight, Trash2 } from 'lucide-react';

export const SubmissionsListPage: React.FC = () => {
  const { currentWorkspace, user, membership } = useAuth();
  const navigate = useNavigate();
  const { ask, dialog } = useConfirm();
  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  const loadSubmissions = async () => {
    if (!currentWorkspace) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await submissionsApi.list(
        currentWorkspace.id,
        undefined,
        undefined,
        statusFilter === 'all' ? undefined : statusFilter
      );
      setSubmissions(data);
    } catch {
      setError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [currentWorkspace, statusFilter]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const ok = await ask({
      title: 'Delete draft?',
      message: 'This permanently removes the draft and all of its revisions.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await submissionsApi.delete(id);
      await loadSubmissions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete submission');
    }
  };

  if (loading) return <LoadingSpinner message="Loading submissions..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
            Content Submissions
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Create, audit, and track content drafts through the brand governance pipeline.
          </p>
        </div>
        <Button icon={<PlusCircle className="w-4 h-4" />} onClick={() => navigate('/submissions/new')}>
          New Submission
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Filter Tabs */}
      <div className="flex border-b border-stone-200 gap-6 text-sm font-medium">
        {['all', 'draft', 'in_review', 'changes_requested', 'approved'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`pb-3 capitalize transition-colors cursor-pointer ${
              statusFilter === st
                ? 'border-b-2 border-teal-600 text-teal-600 font-semibold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {submissions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="w-8 h-8 text-stone-400" />}
            title="No submissions found"
            description="Create your first content submission to run compliance and factual checks."
            actionLabel="Create Submission"
            onAction={() => navigate('/submissions/new')}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Title</th>
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Revision</th>
                  <th className="py-3 px-6">Updated</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {submissions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-stone-50/60 transition-colors cursor-pointer"
                    onClick={() => navigate(`/submissions/${sub.id}`)}
                  >
                    <td className="py-4 px-6 font-semibold text-stone-900">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-stone-400 shrink-0" />
                        <span className="truncate max-w-sm">{sub.title}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-stone-600 text-xs capitalize">
                      {sub.content_type.replace('_', ' ')}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="py-4 px-6 text-stone-500 text-xs font-medium">
                      Rev {sub.current_revision_number}
                    </td>
                    <td className="py-4 px-6 text-stone-500 text-xs">
                      {new Date(sub.updated_at || sub.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/submissions/${sub.id}`);
                        }}
                      >
                        Open <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                      {sub.status === 'draft' &&
                        (sub.author_id === user?.id || membership?.role === 'admin') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => handleDelete(e, sub.id)}
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                          />
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {dialog}
    </div>
  );
};
