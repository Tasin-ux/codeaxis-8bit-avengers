import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { factsApi, FactCreatePayload } from '../../api/facts';
import { ApprovedFact } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/Alert';
import { Plus, Trash2, Edit2, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react';

export const FactsPage: React.FC = () => {
  const { currentWorkspace, membership } = useAuth();
  const [facts, setFacts] = useState<ApprovedFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [sourceType, setSourceType] = useState('datasheet');
  const [sourceUrl, setSourceUrl] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<
    'verified' | 'unverified' | 'expired'
  >('verified');
  const [productOrCampaign, setProductOrCampaign] = useState('');

  const canManage = membership?.role === 'admin' || membership?.role === 'manager';

  const loadFacts = async () => {
    if (!currentWorkspace) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await factsApi.list(currentWorkspace.id);
      setFacts(data);
    } catch {
      setError('Failed to load approved facts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacts();
  }, [currentWorkspace]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle('');
    setStatement('');
    setSourceReference('');
    setSourceType('datasheet');
    setSourceUrl('');
    setVerificationStatus('verified');
    setProductOrCampaign('');
    setModalOpen(true);
  };

  const handleOpenEdit = (f: ApprovedFact) => {
    setEditingId(f.id);
    setTitle(f.title);
    setStatement(f.statement);
    setSourceReference(f.source_reference);
    setSourceType(f.source_type);
    setSourceUrl(f.source_url || '');
    setVerificationStatus(f.verification_status);
    setProductOrCampaign(f.product_or_campaign || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setError(null);

    try {
      if (editingId) {
        await factsApi.update(editingId, {
          title,
          statement,
          source_reference: sourceReference,
          source_type: sourceType,
          source_url: sourceUrl || null,
          verification_status: verificationStatus,
          product_or_campaign: productOrCampaign || null,
        });
      } else {
        const payload: FactCreatePayload = {
          workspace_id: currentWorkspace.id,
          title,
          statement,
          source_reference: sourceReference,
          source_type: sourceType,
          source_url: sourceUrl || null,
          verification_status: verificationStatus,
          product_or_campaign: productOrCampaign || null,
        };
        await factsApi.create(payload);
      }
      setModalOpen(false);
      await loadFacts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this approved fact?')) return;
    try {
      await factsApi.delete(id);
      await loadFacts();
    } catch {
      setError('Failed to delete fact');
    }
  };

  if (loading) return <LoadingSpinner message="Loading approved facts..." />;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="emerald">Verified</Badge>;
      case 'expired':
        return <Badge variant="red">Expired</Badge>;
      case 'unverified':
      default:
        return <Badge variant="amber">Unverified</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Approved Product Facts
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Auditable knowledge base of verified product claims, SLAs, certifications, and sources.
          </p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} icon={<Plus className="w-4 h-4" />}>
            Add Approved Fact
          </Button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {facts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle className="w-8 h-8 text-slate-400" />}
            title="No approved facts configured"
            description="Add auditable factual claims to support content verification."
            actionLabel={canManage ? 'Add Approved Fact' : undefined}
            onAction={canManage ? handleOpenCreate : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {facts.map((f) => (
            <Card key={f.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 capitalize">
                      {f.source_type.replace('_', ' ')}
                    </span>
                  </div>
                  {getStatusBadge(f.verification_status)}
                </div>

                <h3 className="text-base font-semibold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-700 mb-3">{f.statement}</p>

                <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-600">Source:</span>{' '}
                    {f.source_reference}
                  </div>
                  {f.product_or_campaign && (
                    <div>
                      <span className="font-semibold text-slate-600">Scope:</span>{' '}
                      {f.product_or_campaign}
                    </div>
                  )}
                  {f.source_url && (
                    <div>
                      <a
                        href={f.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 font-medium"
                      >
                        Source Link <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit2 className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenEdit(f)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => handleDelete(f.id)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Approved Fact' : 'Add Approved Fact'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Fact Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. SOC 2 Type II Certification"
            required
          />

          <Textarea
            label="Fact Statement (Exact Claim)"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="e.g. Acme Cloud Platform is SOC 2 Type II certified as of January 2026."
            rows={3}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Source Reference / Audit Report"
              value={sourceReference}
              onChange={(e) => setSourceReference(e.target.value)}
              placeholder="e.g. Audit Report 2026 v1.2"
              required
            />

            <Select
              label="Source Type"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              options={[
                { value: 'datasheet', label: 'Datasheet' },
                { value: 'audit_report', label: 'Audit Report' },
                { value: 'legal', label: 'Legal Agreement / SLA' },
                { value: 'release_notes', label: 'Release Notes' },
                { value: 'whitepaper', label: 'Whitepaper' },
                { value: 'specifications', label: 'Technical Specifications' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Source URL (optional)"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />

            <Select
              label="Verification Status"
              value={verificationStatus}
              onChange={(e) => setVerificationStatus(e.target.value as any)}
              options={[
                { value: 'verified', label: 'Verified' },
                { value: 'unverified', label: 'Unverified' },
                { value: 'expired', label: 'Expired' },
              ]}
            />
          </div>

          <Input
            label="Product or Campaign Scope (optional)"
            value={productOrCampaign}
            onChange={(e) => setProductOrCampaign(e.target.value)}
            placeholder="e.g. Acme Cloud Platform"
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingId ? 'Save Changes' : 'Create Fact'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
