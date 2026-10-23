export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_by: string;
  created_at: string;
}

export interface WorkspaceMembership {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'creator' | 'external';
  joined_at: string;
  user?: User;
}

export interface Brand {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface BrandGuideline {
  id: string;
  workspace_id: string;
  brand_id: string | null;
  title: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovedTerminology {
  id: string;
  workspace_id: string;
  preferred_term: string;
  disallowed_term: string;
  explanation: string | null;
  case_sensitive: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ProhibitedPhrase {
  id: string;
  workspace_id: string;
  phrase: string;
  reason: string | null;
  severity: string;
  suggested_alternative: string | null;
  case_sensitive: boolean;
  whole_word: boolean;
  is_active: boolean;
  created_at: string;
}

export interface RequiredDisclaimer {
  id: string;
  workspace_id: string;
  text: string;
  content_category: string;
  severity: string;
  is_active: boolean;
  created_at: string;
}

export interface ApprovedFact {
  id: string;
  workspace_id: string;
  title: string;
  statement: string;
  source_reference: string;
  source_type: string;
  source_url: string | null;
  verification_status: 'verified' | 'unverified' | 'expired';
  product_or_campaign: string | null;
  last_verified_date: string | null;
  expiration_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ContentSubmission {
  id: string;
  workspace_id: string;
  brand_id: string | null;
  author_id: string;
  title: string;
  content: string;
  content_type: string;
  status: 'draft' | 'in_review' | 'changes_requested' | 'approved';
  current_revision_number: number;
  created_at: string;
  updated_at: string;
  author?: User;
  brand?: Brand;
}

export interface SubmissionRevision {
  id: string;
  submission_id: string;
  revision_number: number;
  content: string;
  summary: string | null;
  author_id: string;
  status_at_creation: string;
  created_at: string;
}

export interface ReviewFinding {
  id: string;
  submission_id: string;
  revision_number: number;
  category: string;
  title: string;
  description: string;
  matched_text: string | null;
  char_start: number | null;
  char_end: number | null;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: 'rule_violation' | 'potential_mismatch' | 'unsupported_claim';
  explanation: string | null;
  suggestion: string | null;
  rule_id: string | null;
  rule_type: string | null;
  evidence_status: 'supported' | 'contradicted' | 'insufficient' | 'not_applicable';
  referenced_fact_id: string | null;
  source: 'deterministic' | 'ai';
  is_resolved: boolean;
  created_at: string;
}

export interface ReviewDecision {
  id: string;
  submission_id: string;
  reviewer_id: string;
  decision: 'approved' | 'changes_requested';
  comment: string | null;
  revision_number: number;
  created_at: string;
  reviewer?: User;
}

export interface ReviewComment {
  id: string;
  submission_id: string;
  author_id: string;
  text: string;
  revision_number: number | null;
  finding_id: string | null;
  created_at: string;
  author?: User;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface AnalyticsOverview {
  total_submissions: number;
  submissions_by_status: StatusCount[];
  total_findings: number;
  total_resolved_findings: number;
}
