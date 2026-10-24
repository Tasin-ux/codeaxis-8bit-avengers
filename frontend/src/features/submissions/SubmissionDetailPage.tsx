import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { submissionsApi } from '../../api/submissions';
import { commentsApi } from '../../api/comments';
import { analyticsApi } from '../../api/analytics';
import {
  ContentSubmission,
  ReviewFinding,
  SubmissionRevision,
  ReviewComment,
} from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SeverityBadge } from '../../components/ui/SeverityBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import {
  ArrowLeft,
  Send,
  Save,
  CheckCircle,
  AlertCircle,
  History,
  MessageSquare,
  HelpCircle,
  Check,
  RefreshCw,
  FileCheck2,
} from 'lucide-react';
import { clsx } from 'clsx';

export const SubmissionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, membership } = useAuth();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<ContentSubmission | null>(null);
  const [findings, setFindings] = useState<ReviewFinding[]>([]);
  const [revisions, setRevisions] = useState<SubmissionRevision[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'revisions' | 'comments'>('editor');

  // Editor state
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Findings filter
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  // New comment
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Review decision modal (for managers)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'changes_requested'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [processingReview, setProcessingReview] = useState(false);

  // Flag unclear modal
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagFinding, setFlagFinding] = useState<ReviewFinding | null>(null);
  const [flagComment, setFlagComment] = useState('');
  const [flagType, setFlagType] = useState<'unclear' | 'too_strict' | 'too_lenient' | 'incorrect'>('unclear');

  const editorRef = useRef<HTMLTextAreaElement>(null);

  const isAuthor = submission?.author_id === user?.id;
  const isManagerOrAdmin = membership?.role === 'admin' || membership?.role === 'manager';
  const canEdit =
    (submission?.status === 'draft' || submission?.status === 'changes_requested') &&
    (isAuthor || isManagerOrAdmin);
  // Authors cannot review their own submissions (backend rejects self-review).
  const canReview = isManagerOrAdmin && !isAuthor && submission?.status === 'in_review';

  const loadData = async () => {
    if (!id) return;
    try {
      const [subData, findingsData, revisionsData, commentsData] = await Promise.all([
        submissionsApi.getById(id),
        submissionsApi.getFindings(id),
        submissionsApi.getRevisions(id),
        commentsApi.list(id),
      ]);
      setSubmission(subData);
      setContent(subData.content);
      setTitle(subData.title);
      setFindings(findingsData);
      setRevisions(revisionsData);
      setComments(commentsData);
      setIsDirty(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleRunReview = async () => {
    if (!id) return;
    setReviewing(true);
    setError(null);
    try {
      // Save current content if dirty first
      if (isDirty) {
        await submissionsApi.update(id, { content, title });
        setIsDirty(false);
      }
      const updatedFindings = await submissionsApi.runReview(id);
      setFindings(updatedFindings);
      setSuccessMsg('Compliance and factual audit completed.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to execute audit');
    } finally {
      setReviewing(false);
    }
  };

  const handleSaveDraft = async (): Promise<boolean> => {
    if (!id) return false;
    setSaving(true);
    setError(null);
    try {
      const updated = await submissionsApi.update(id, { content, title });
      setSubmission(updated);
      setIsDirty(false);
      setSuccessMsg('Draft revisions saved.');
      setTimeout(() => setSuccessMsg(null), 3000);
      const revs = await submissionsApi.getRevisions(id);
      setRevisions(revs);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save draft');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!id || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // Never submit with unsaved edits: a failed save must abort the submit.
      if (isDirty) {
        const saved = await handleSaveDraft();
        if (!saved) return;
      }
      const updated = await submissionsApi.submitForReview(id);
      setSubmission(updated);
      setSuccessMsg('Submission sent to review queue.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit for review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessReviewDecision = async () => {
    if (!id) return;
    setProcessingReview(true);
    try {
      let updated: ContentSubmission;
      if (reviewDecision === 'approved') {
        updated = await submissionsApi.approve(id, {
          decision: 'approved',
          comment: reviewComment,
        });
      } else {
        updated = await submissionsApi.requestChanges(id, {
          decision: 'changes_requested',
          comment: reviewComment,
        });
      }
      setSubmission(updated);
      setReviewModalOpen(false);
      setReviewComment('');
      setSuccessMsg(`Review decision recorded: ${reviewDecision.replace('_', ' ')}.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to record decision');
    } finally {
      setProcessingReview(false);
    }
  };

  /**
   * Extract the exact replacement text from a suggestion. The rule engine
   * formats suggestions as `Consider using: "..."` (prohibited phrases) or
   * `Replace with "..."` (terminology). AI suggestions are free-text advice
   * and have no single exact replacement.
   */
  const extractReplacement = (suggestion: string): string | null => {
    const match = suggestion.match(/(?:Consider using:|Replace with)\s*"([^"]+)"/);
    return match ? match[1] : null;
  };

  /** Whether the suggestion can be applied as a direct in-place edit. */
  const canApplySuggestion = (finding: ReviewFinding): boolean => {
    if (!finding.suggestion) return false;
    if (finding.category === 'disclaimer') return true; // appended, offset-independent
    return extractReplacement(finding.suggestion) !== null && !!finding.matched_text;
  };

  const handleApplySuggestion = async (finding: ReviewFinding) => {
    if (!finding.suggestion) return;

    if (finding.category === 'disclaimer') {
      // Missing disclaimer append (position-independent, safe at any time)
      const disclaimerMatch = finding.title.match(/Missing required disclaimer:\s*"([^"]+)"/);
      const textToAppend = disclaimerMatch
        ? `\n\n${disclaimerMatch[1]}`
        : `\n\n${extractReplacement(finding.suggestion) ?? ''}`;
      if (!textToAppend.trim()) return;
      setContent(content + textToAppend);
      setIsDirty(true);
      setSuccessMsg('Appended required disclaimer to draft.');
      setTimeout(() => setSuccessMsg(null), 3000);
      return;
    }

    const replacement = extractReplacement(finding.suggestion);
    if (replacement === null || !finding.matched_text) return;

    // Findings offsets refer to the last audited snapshot; after any manual
    // edit they are stale, so require a re-audit before applying.
    if (isDirty) {
      setError('Content has changed since the last audit. Run the audit again before applying suggestions.');
      return;
    }

    if (
      finding.char_start !== null &&
      finding.char_end !== null &&
      content.substring(finding.char_start, finding.char_end) === finding.matched_text
    ) {
      const newContent =
        content.substring(0, finding.char_start) +
        replacement +
        content.substring(finding.char_end);
      setContent(newContent);
      setIsDirty(true);
      setSuccessMsg(`Applied suggestion for "${finding.matched_text}".`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setError('This finding no longer matches the current draft. Run the audit again.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const created = await commentsApi.create(id, {
        text: commentText,
        revision_number: submission?.current_revision_number,
      });
      setComments([...comments, created]);
      setCommentText('');
    } catch {
      setError('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleFlagUnclearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagFinding) return;
    try {
      await analyticsApi.flagFindingUnclear(flagFinding.id, {
        rule_id: flagFinding.rule_id || flagFinding.id,
        rule_type: flagFinding.rule_type || flagFinding.category,
        feedback_type: flagType,
        comment: flagComment,
      });
      setFlagModalOpen(false);
      setFlagComment('');
      setSuccessMsg('Feedback recorded. Brand managers can review unclear guidelines.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setError('Failed to record rule feedback');
    }
  };

  if (loading) return <LoadingSpinner message="Loading content review workspace..." />;
  if (!submission) return <Alert type="error">Submission not found.</Alert>;

  const filteredFindings = findings.filter((f) => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/submissions')}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-stone-900">{submission.title}</h2>
              <StatusBadge status={submission.status} />
              <span className="text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-mono">
                Rev {submission.current_revision_number}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Category: <span className="capitalize">{submission.content_type.replace('_', ' ')}</span> •
              Created: {new Date(submission.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                loading={saving}
                disabled={!isDirty}
                onClick={handleSaveDraft}
                icon={<Save className="w-4 h-4" />}
              >
                Save Revision
              </Button>

              <Button
                variant="outline"
                size="sm"
                loading={reviewing}
                onClick={handleRunReview}
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Run Audit
              </Button>

              <Button
                size="sm"
                loading={submitting}
                onClick={handleSubmitForReview}
                icon={<Send className="w-4 h-4" />}
              >
                Submit for Review
              </Button>
            </>
          )}

          {canReview && (
            <Button
              size="sm"
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setReviewDecision('approved');
                setReviewModalOpen(true);
              }}
              icon={<FileCheck2 className="w-4 h-4" />}
            >
              Review Decision
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {successMsg && <Alert type="success">{successMsg}</Alert>}

      {/* Main Two-Column Review Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Editor & Tabs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex border-b border-stone-200 gap-6 text-sm font-medium">
            <button
              onClick={() => setActiveTab('editor')}
              className={clsx(
                'pb-2.5 flex items-center gap-2 cursor-pointer',
                activeTab === 'editor'
                  ? 'border-b-2 border-teal-600 text-teal-600 font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              )}
            >
              Content Editor
            </button>
            <button
              onClick={() => setActiveTab('revisions')}
              className={clsx(
                'pb-2.5 flex items-center gap-2 cursor-pointer',
                activeTab === 'revisions'
                  ? 'border-b-2 border-teal-600 text-teal-600 font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              )}
            >
              <History className="w-4 h-4" />
              Revisions ({revisions.length})
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={clsx(
                'pb-2.5 flex items-center gap-2 cursor-pointer',
                activeTab === 'comments'
                  ? 'border-b-2 border-teal-600 text-teal-600 font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Review Comments ({comments.length})
            </button>
          </div>

          {activeTab === 'editor' && (
            <Card className="p-0 overflow-hidden shadow-xs">
              <div className="bg-stone-50 px-4 py-2 border-b border-stone-200 flex items-center justify-between text-xs text-stone-500">
                <span>
                  {canEdit ? 'Editable Mode' : 'Read-Only Mode (Under Review or Approved)'}
                </span>
                <span>
                  {content.length} characters • {content.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea
                ref={editorRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setIsDirty(true);
                }}
                disabled={!canEdit}
                rows={16}
                className="w-full p-4 font-sans text-sm text-stone-800 leading-relaxed focus:outline-none resize-y border-0"
                placeholder="Draft copy..."
              />
            </Card>
          )}

          {activeTab === 'revisions' && (
            <Card title="Revision History" subtitle="Immutable snapshots of content changes">
              <div className="space-y-4">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl border border-stone-100 bg-stone-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-900 text-sm">
                        Revision #{rev.revision_number}
                      </span>
                      <span className="text-xs text-stone-500">
                        {new Date(rev.created_at).toLocaleString()}
                      </span>
                    </div>
                    {rev.summary && <p className="text-xs text-stone-600 italic">{rev.summary}</p>}
                    <p className="text-xs text-stone-700 bg-white p-3 rounded-lg border border-stone-100 font-mono whitespace-pre-wrap">
                      {rev.content}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'comments' && (
            <Card title="Review Discussion &amp; Feedback">
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-stone-500 italic text-center py-6">
                    No comments recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-stone-700">
                            {c.author_id === user?.id ? 'You' : 'Reviewer'}
                          </span>
                          <span className="text-2xs text-stone-400">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-stone-800">{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAddComment} className="mt-4 pt-4 border-t border-stone-100 flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment or change note..."
                    className="flex-1 rounded-lg border border-stone-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                  <Button type="submit" size="sm" loading={submittingComment}>
                    Comment
                  </Button>
                </form>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Findings Dashboard (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card
            title={`Audit Findings (${findings.length})`}
            subtitle="Deterministic rule checks & factual claim verifications"
            action={
              <Button
                variant="ghost"
                size="sm"
                loading={reviewing}
                onClick={handleRunReview}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Re-audit
              </Button>
            }
          >
            {/* Filters */}
            <div className="flex gap-2 mb-4 pb-3 border-b border-stone-100">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white text-stone-700"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white text-stone-700"
              >
                <option value="all">All Categories</option>
                <option value="prohibited_phrase">Prohibited Phrase</option>
                <option value="terminology">Terminology</option>
                <option value="disclaimer">Required Disclaimer</option>
                <option value="factual_claim">Factual Claim</option>
                <option value="tone">Tone &amp; Voice</option>
                <option value="guideline">Guideline</option>
              </select>
            </div>

            {/* Findings List */}
            {filteredFindings.length === 0 ? (
              <div className="text-center py-10 px-4">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-semibold text-stone-900 text-sm">No Compliance Violations</h4>
                <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                  {findings.length === 0
                    ? 'This draft complies with all active workspace rules.'
                    : 'No findings match the selected filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredFindings.map((f) => {
                  const isUnsupportedClaim = f.confidence === 'unsupported_claim';

                  return (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFindingId(f.id)}
                      className={clsx(
                        'p-4 rounded-xl border transition-all text-sm space-y-2.5',
                        selectedFindingId === f.id
                          ? 'border-teal-500 ring-2 ring-teal-50 bg-teal-50/20'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 capitalize">
                          {f.category.replace('_', ' ')}
                        </span>
                        <SeverityBadge severity={f.severity} />
                      </div>

                      <h4 className="font-semibold text-stone-900 text-sm leading-snug">
                        {f.title}
                      </h4>

                      {f.matched_text && (
                        <div className="text-xs bg-red-50 text-red-800 px-2.5 py-1.5 rounded-lg border border-red-100 font-mono">
                          Matched: &quot;{f.matched_text}&quot;
                        </div>
                      )}

                      {f.explanation && (
                        <p className="text-xs text-stone-600 leading-relaxed">
                          {f.explanation}
                        </p>
                      )}

                      {/* Evidence / Claim status distinction */}
                      {isUnsupportedClaim ? (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                          <div className="font-semibold flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            Unverified Claim
                          </div>
                          <p className="text-2xs text-amber-800">
                            Unverified — no supporting evidence was found in the approved brand knowledge base. Missing evidence does not prove a claim is false. Authorised human verification required.
                          </p>
                        </div>
                      ) : null}

                      {/* Suggestion box */}
                      {f.suggestion && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-900 space-y-1">
                          <span className="font-semibold text-2xs uppercase tracking-wider text-emerald-700">
                            Recommended Correction
                          </span>
                          <p className="font-medium text-emerald-950">{f.suggestion}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                        {canEdit && canApplySuggestion(f) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isDirty}
                            title={
                              isDirty
                                ? 'Content changed since the last audit — run the audit again to apply suggestions'
                                : undefined
                            }
                            onClick={() => handleApplySuggestion(f)}
                            icon={<Check className="w-3.5 h-3.5 text-emerald-600" />}
                          >
                            {isDirty ? 'Re-audit to Apply' : 'Apply Suggestion'}
                          </Button>
                        )}

                        <button
                          onClick={() => {
                            setFlagFinding(f);
                            setFlagModalOpen(true);
                          }}
                          className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <HelpCircle className="w-3.5 h-3.5" /> Flag unclear
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Review Decision Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Authorised Review Decision"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            As a brand manager or admin, review the content and record your governance decision.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setReviewDecision('approved')}
              className={clsx(
                'p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all',
                reviewDecision === 'approved'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200'
                  : 'border-stone-200 hover:bg-stone-50 text-stone-700'
              )}
            >
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Approve Content
            </button>

            <button
              type="button"
              onClick={() => setReviewDecision('changes_requested')}
              className={clsx(
                'p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all',
                reviewDecision === 'changes_requested'
                  ? 'border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-200'
                  : 'border-stone-200 hover:bg-stone-50 text-stone-700'
              )}
            >
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Request Changes
            </button>
          </div>

          <Textarea
            label="Review Comments / Guidance (Optional)"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Add specific instructions for the creator..."
            rows={3}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={processingReview}
              onClick={handleProcessReviewDecision}
              variant={reviewDecision === 'approved' ? 'primary' : 'danger'}
            >
              Confirm Decision
            </Button>
          </div>
        </div>
      </Modal>

      {/* Flag Unclear Modal */}
      <Modal
        isOpen={flagModalOpen}
        onClose={() => setFlagModalOpen(false)}
        title="Guideline Clarity Feedback"
      >
        <form onSubmit={handleFlagUnclearSubmit} className="space-y-4">
          <p className="text-sm text-stone-600">
            Report rules or findings that feel unclear, too strict, or inaccurate to help brand
            managers refine brand governance rules.
          </p>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Feedback Type</label>
            <select
              value={flagType}
              onChange={(e) => setFlagType(e.target.value as any)}
              className="w-full rounded-md border border-stone-300 p-2 text-sm text-stone-800"
            >
              <option value="unclear">Rule is unclear or ambiguous</option>
              <option value="too_strict">Rule is overly strict for this context</option>
              <option value="too_lenient">Rule is too lenient</option>
              <option value="incorrect">False positive / incorrect match</option>
            </select>
          </div>

          <Textarea
            label="Additional Explanation"
            value={flagComment}
            onChange={(e) => setFlagComment(e.target.value)}
            placeholder="Why does this rule need clarification?"
            rows={3}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setFlagModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Feedback</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
