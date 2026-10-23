import api from './client';
import { AnalyticsOverview } from '../types';

export interface CategoryCount {
  category: string;
  count: number;
}

export interface SeverityCount {
  severity: string;
  count: number;
}

export interface RuleHit {
  rule_id: string | null;
  rule_type: string | null;
  title: string;
  hit_count: number;
}

export interface FindingAnalytics {
  total_findings: number;
  by_category: CategoryCount[];
  by_severity: SeverityCount[];
}

export interface RuleAnalytics {
  most_triggered: RuleHit[];
}

export interface FlagFeedbackPayload {
  rule_id: string;
  rule_type: string;
  feedback_type: 'unclear' | 'too_strict' | 'too_lenient' | 'incorrect';
  comment?: string;
}

export const analyticsApi = {
  getOverview: async (workspaceId: string): Promise<AnalyticsOverview> => {
    const res = await api.get<AnalyticsOverview>(`/analytics/overview?workspace_id=${workspaceId}`);
    return res.data;
  },

  getFindings: async (workspaceId: string): Promise<FindingAnalytics> => {
    const res = await api.get<FindingAnalytics>(`/analytics/findings?workspace_id=${workspaceId}`);
    return res.data;
  },

  getRules: async (workspaceId: string): Promise<RuleAnalytics> => {
    const res = await api.get<RuleAnalytics>(`/analytics/rules?workspace_id=${workspaceId}`);
    return res.data;
  },

  flagFindingUnclear: async (
    findingId: string,
    payload: FlagFeedbackPayload
  ): Promise<{ status: string; id: string }> => {
    const res = await api.post<{ status: string; id: string }>(
      `/analytics/findings/${findingId}/flag-unclear`,
      payload
    );
    return res.data;
  },
};
