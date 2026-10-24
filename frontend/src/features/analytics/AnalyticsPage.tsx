import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { analyticsApi, FindingAnalytics, RuleAnalytics } from '../../api/analytics';
import { AnalyticsOverview } from '../../types';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/Alert';
import { BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [findingStats, setFindingStats] = useState<FindingAnalytics | null>(null);
  const [ruleStats, setRuleStats] = useState<RuleAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentWorkspace) {
      setLoading(false);
      return;
    }
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const [ov, fStats, rStats] = await Promise.all([
          analyticsApi.getOverview(currentWorkspace.id),
          analyticsApi.getFindings(currentWorkspace.id),
          analyticsApi.getRules(currentWorkspace.id),
        ]);
        setOverview(ov);
        setFindingStats(fStats);
        setRuleStats(rStats);
      } catch {
        setError('Failed to load governance analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [currentWorkspace]);

  if (loading) return <LoadingSpinner message="Calculating governance analytics..." />;

  const severityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#3b82f6',
    info: '#64748b',
  };

  const categoryData =
    findingStats?.by_category.map((c) => ({
      name: c.category.replace('_', ' '),
      count: c.count,
    })) || [];

  const severityData =
    findingStats?.by_severity.map((s) => ({
      name: s.severity.toUpperCase(),
      value: s.count,
      color: severityColors[s.severity.toLowerCase()] || '#6366f1',
    })) || [];



  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
          Governance &amp; Compliance Analytics
        </h2>
        <p className="text-sm text-stone-500 mt-1">
          Historical compliance trends, violation breakdowns, and frequently triggered rules.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {overview?.total_submissions === 0 ? (
        <Card>
          <EmptyState
            icon={<BarChart3 className="w-8 h-8 text-stone-400" />}
            title="No analytics data available yet"
            description="Submit and review marketing content to populate compliance analytics."
          />
        </Card>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <p className="text-xs font-semibold text-stone-500 uppercase">Total Submissions</p>
              <h3 className="text-2xl font-bold text-stone-900 mt-1">
                {overview?.total_submissions || 0}
              </h3>
            </Card>

            <Card>
              <p className="text-xs font-semibold text-stone-500 uppercase">Violations Detected</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">
                {overview?.total_findings || 0}
              </h3>
            </Card>

            <Card>
              <p className="text-xs font-semibold text-stone-500 uppercase">Resolved Issues</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {overview?.total_resolved_findings || 0}
              </h3>
            </Card>

            <Card>
              <p className="text-xs font-semibold text-stone-500 uppercase">Active Brand Rules</p>
              <h3 className="text-2xl font-bold text-teal-600 mt-1">
                {ruleStats?.most_triggered.length || 0}
              </h3>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Bar Chart */}
            <Card title="Findings by Category" subtitle="Distribution of detected compliance issues">
              <div className="h-64 mt-2">
                {categoryData.length === 0 ? (
                  <p className="text-sm text-stone-400 italic text-center py-20">
                    No findings recorded.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Severity Distribution Pie Chart */}
            <Card title="Findings by Severity" subtitle="Severity risk profile of detected findings">
              <div className="h-64 mt-2">
                {severityData.length === 0 ? (
                  <p className="text-sm text-stone-400 italic text-center py-20">
                    No findings recorded.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend fontSize={12} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          {/* Most Triggered Rules Table */}
          <Card
            title="Frequently Triggered Rules"
            subtitle="Brand rules and prohibited phrases that authors question or trigger most often"
          >
            {ruleStats?.most_triggered.length === 0 ? (
              <p className="text-sm text-stone-400 italic text-center py-8">
                No rule triggers logged yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Rule Title / Trigger</th>
                      <th className="py-3 px-4">Rule Type</th>
                      <th className="py-3 px-4 text-right">Violations Logged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {ruleStats?.most_triggered.map((rule, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50">
                        <td className="py-3 px-4 font-semibold text-stone-900">
                          {rule.title}
                        </td>
                        <td className="py-3 px-4 text-xs capitalize text-stone-600">
                          {rule.rule_type?.replace('_', ' ') || 'General Rule'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-teal-600">
                          {rule.hit_count} hits
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
