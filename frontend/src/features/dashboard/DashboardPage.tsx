import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { submissionsApi } from '../../api/submissions';
import { analyticsApi } from '../../api/analytics';
import { ContentSubmission, AnalyticsOverview } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Plus, ArrowUpRight } from 'lucide-react';

const statusDot: Record<string, string> = {
  in_review: 'bg-blue-500',
  changes_requested: 'bg-amber-500',
  approved: 'bg-emerald-500',
  draft: 'bg-stone-400',
};

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
    return <LoadingSpinner message="Loading dashboard…" />;
  }

  const countFor = (status: string) =>
    overview?.submissions_by_status.find((s) => s.status === status)?.count || 0;

  const stats = [
    { label: 'Submissions', value: overview?.total_submissions || 0, dot: statusDot.draft },
    { label: 'In review', value: countFor('in_review'), dot: statusDot.in_review },
    {
      label: 'Changes requested',
      value: countFor('changes_requested'),
      dot: statusDot.changes_requested,
    },
    { label: 'Approved', value: countFor('approved'), dot: statusDot.approved },
  ];

  const totalFindings = overview?.total_findings || 0;
  const resolvedFindings = overview?.total_resolved_findings || 0;
  const resolutionPct =
    totalFindings > 0 ? Math.round((resolvedFindings / totalFindings) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-teal-700 font-mono mb-1.5">
            Overview
          </p>
          <h2 className="text-[1.6rem] font-semibold text-stone-900 tracking-tight leading-tight">
            Dashboard
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Activity across <span className="font-medium text-stone-700">{currentWorkspace?.name}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/brand-knowledge')}>
            Brand rules
          </Button>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/submissions/new')}>
            New submission
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <Card className="p-0" bodyClassName="p-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-stone-200 divide-x-0 lg:divide-x [&>*]:p-5">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
                  {s.label}
                </span>
              </div>
              <div className="mt-2 text-[1.75rem] font-semibold tabular-nums tracking-tight text-stone-900 leading-none">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          className="lg:col-span-2"
          bodyClassName="p-0"
          title="Recent submissions"
          action={
            <button
              onClick={() => navigate('/submissions')}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 cursor-pointer"
            >
              View all
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          {submissions.length === 0 ? (
            <EmptyState
              title="No submissions yet"
              description="Create your first submission to check it against your brand rules."
              actionLabel="Create submission"
              onAction={() => navigate('/submissions/new')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                    <th className="py-2.5 pl-5 pr-4">Title</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Rev</th>
                    <th className="py-2.5 px-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {submissions.slice(0, 6).map((sub) => (
                    <tr
                      key={sub.id}
                      onClick={() => navigate(`/submissions/${sub.id}`)}
                      className="hover:bg-stone-50/70 cursor-pointer transition-colors"
                    >
                      <td className="py-3 pl-5 pr-4 font-medium text-stone-900 max-w-[18rem] truncate">
                        {sub.title}
                      </td>
                      <td className="py-3 px-4 text-stone-500 text-xs capitalize whitespace-nowrap">
                        {sub.content_type.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="py-3 px-4 text-stone-400 text-xs font-mono">
                        R{sub.current_revision_number}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <span className="text-xs font-medium text-teal-700">Open</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Findings */}
        <Card
          title="Audit findings"
          action={
            <button
              onClick={() => navigate('/analytics')}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 cursor-pointer"
            >
              Analytics
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="text-[1.75rem] font-semibold tabular-nums tracking-tight text-stone-900 leading-none">
            {totalFindings}
          </div>
          <p className="text-[13px] text-stone-500 mt-1.5">
            {totalFindings === 0
              ? 'No rule triggers recorded yet.'
              : 'issues caught by rule checks'}
          </p>

          {totalFindings > 0 && (
            <>
              <div className="mt-4 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-600 transition-all duration-500"
                  style={{ width: `${resolutionPct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-stone-500">
                <span className="font-medium text-stone-700 tabular-nums">
                  {resolvedFindings} resolved
                </span>
                <span className="tabular-nums">{totalFindings - resolvedFindings} open</span>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};
