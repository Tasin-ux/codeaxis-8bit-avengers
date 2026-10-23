import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { submissionsApi } from '../../api/submissions';
import { ContentSubmission } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/Alert';
import { ClipboardCheck, ArrowRight } from 'lucide-react';

export const ReviewQueuePage: React.FC = () => {
  const { currentWorkspace, membership } = useAuth();
  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isManagerOrAdmin = membership?.role === 'admin' || membership?.role === 'manager';

  const loadQueue = async () => {
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
        'in_review'
      );
      setSubmissions(data);
    } catch {
      setError('Failed to load review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [currentWorkspace]);

  if (loading) return <LoadingSpinner message="Loading review queue..." />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Manager Review Queue
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Submissions awaiting brand compliance inspection, feedback, or final approval.
        </p>
      </div>

      {!isManagerOrAdmin && (
        <Alert type="info">
          You are viewing the queue as a content creator. Only workspace managers or admins can
          approve submissions or request formal revisions.
        </Alert>
      )}

      {error && <Alert type="error">{error}</Alert>}

      {submissions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardCheck className="w-8 h-8 text-emerald-500" />}
            title="Review Queue is Empty"
            description="There are currently no drafts waiting for manager review."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <Card key={sub.id} className="hover:border-indigo-200 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{sub.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                      In Review
                    </span>
                    <span className="text-xs text-slate-400">Rev {sub.current_revision_number}</span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 max-w-2xl">{sub.content}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="capitalize">{sub.content_type.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>Submitted {new Date(sub.updated_at || sub.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <Link to={`/submissions/${sub.id}`}>
                  <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                    {isManagerOrAdmin ? 'Review & Decide' : 'Inspect Findings'}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
