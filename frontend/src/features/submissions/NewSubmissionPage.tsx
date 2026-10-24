import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { submissionsApi, SubmissionCreatePayload } from '../../api/submissions';
import { brandsApi } from '../../api/brands';
import { Brand } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const NewSubmissionPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState('marketing_copy');
  const [brandId, setBrandId] = useState<string>('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentWorkspace) return;
    let cancelled = false;
    brandsApi
      .list(currentWorkspace.id)
      .then((b) => {
        if (cancelled) return;
        setBrands(b);
        if (b.length > 0) setBrandId(b[0].id);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load brands');
      });
    return () => {
      cancelled = true;
    };
  }, [currentWorkspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    setError(null);
    setLoading(true);

    try {
      const payload: SubmissionCreatePayload = {
        workspace_id: currentWorkspace.id,
        brand_id: brandId || null,
        title,
        content,
        content_type: contentType,
      };

      const created = await submissionsApi.create(payload);
      // Immediately run initial checks
      try {
        await submissionsApi.runReview(created.id);
      } catch {
        // ignore review error on initial save, will open review page
      }
      navigate(`/submissions/${created.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create submission');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleScenario = (scenario: 'compliant' | 'violations') => {
    if (scenario === 'compliant') {
      setTitle('Compliant Daily Productivity Copy');
      setContent(
        'Our application helps teams organise their daily work and manage project updates. Results may vary based on deployment configuration and network environment.'
      );
      setContentType('marketing_copy');
    } else {
      setTitle('High-Impact Social Ad (Violations Demo)');
      setContent(
        'Our application guarantees results for every customer. Download our new app today to get 100% fraud prevention and unlimited storage!'
      );
      setContentType('marketing_copy');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/submissions')}
          className="text-sm font-medium text-stone-500 hover:text-stone-800 flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to submissions
        </button>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleLoadSampleScenario('compliant')}
          >
            Load Compliant Sample
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleLoadSampleScenario('violations')}
          >
            Load Rule-Violation Sample
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-stone-900 tracking-tight">New Content Draft</h2>
        <p className="text-sm text-stone-500 mt-1">
          Draft marketing copy or paste text to audit against workspace brand guidelines and approved facts.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="space-y-5">
            <Input
              label="Submission Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q2 Product Announcement Email"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Content Type"
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                options={[
                  { value: 'marketing_copy', label: 'Marketing Copy' },
                  { value: 'product_description', label: 'Product Description' },
                  { value: 'social_media', label: 'Social Media' },
                  { value: 'email', label: 'Email' },
                  { value: 'advertisement', label: 'Advertisement' },
                  { value: 'presentation', label: 'Presentation' },
                ]}
              />

              <Select
                label="Associated Brand / Product"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                options={[
                  { value: '', label: 'General Brand Scope' },
                  ...brands.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </div>

            <Textarea
              label="Marketing Content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type or paste marketing copy here..."
              rows={12}
              required
            />

            <div className="flex items-center justify-between pt-4 border-t border-stone-100">
              <div className="text-xs text-stone-400">
                {content.length} characters • {content.trim().split(/\s+/).filter(Boolean).length} words
              </div>
              <Button type="submit" loading={loading} icon={<Sparkles className="w-4 h-4" />}>
                Save Draft &amp; Run Audit
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
};
