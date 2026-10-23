import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { submissionsApi } from '../../api/submissions';
import { analyticsApi } from '../../api/analytics';
import { ContentSubmission, AnalyticsOverview } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  BookOpen,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [subs, stats] = await Promise.all([
          submissionsApi.list(currentWorkspace.id),
          analyticsApi.getOverview(currentWorkspace.id),
        ]);
        setSubmissions(subs);
        setOverview(stats);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentWorkspace]);

  if (loading) {
    return <LoadingSpinner message="Loading workspace dashboard..." />;
  }

  const inReviewCount =
    overview?.submissions_by_status.find((s) => s.status === 'in_review')?.count || 0;
  const approvedCount =
    overview?.submissions_by_status.find((s) => s.status === 'approved')?.count || 0;
  const changesCount =
    overview?.submissions_by_status.find((s) => s.status === 'changes_requested')?.count || 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Governance Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time brand compliance metrics and content review activity for{' '}
            <span className="font-semibold text-slate-700">{currentWorkspace?.name}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/submissions/new">
            <Button icon={<PlusCircle className="w-4 h-4" />}>New Submission</Button>
          </Link>
          <Link to="/brand-knowledge">
            <Button variant="outline" icon={<BookOpen className="w-4 h-4" />}>
              Brand Rules
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Drafts
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {overview?.total_submissions || 0}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Review
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{inReviewCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Changes Requested
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{changesCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Approved Copy
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{approvedCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">Governance Guard</h3>
              <p className="text-xs text-slate-400">Rule Engine &amp; Claim Auditing</p>
            </div>
          </div>
          <p className="text-sm text-slate-300 mb-4">
            Total rule triggers &amp; potential mismatches recorded across active drafts:
          </p>
          <div className="text-3xl font-bold text-white mb-2">
            {overview?.total_findings || 0}
          </div>
          <div className="text-xs text-slate-400">
            {overview?.total_resolved_findings || 0} resolved before publication
          </div>
        </Card>

        {/* Recent Submissions */}
        <Card
          className="md:col-span-2"
          title="Recent Submissions"
          subtitle="Content submissions in this workspace"
          action={
            <Link to="/submissions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {submissions.length === 0 ? (
            <EmptyState
              title="No submissions yet"
              description="Create your first content submission to check it against your brand rules."
              actionLabel="Create Submission"
              onAction={() => navigate('/submissions/new')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3">Title</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Revision</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.slice(0, 5).map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-medium text-slate-900 truncate max-w-xs">
                        {sub.title}
                      </td>
                      <td className="py-3 text-slate-500 text-xs capitalize">
                        {sub.content_type.replace('_', ' ')}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="py-3 text-slate-500 text-xs">Rev {sub.current_revision_number}</td>
                      <td className="py-3 text-right">
                        <Link to={`/submissions/${sub.id}`}>
                          <Button size="sm" variant="outline">
                            Review
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
