import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import {
  BookOpen,
  SpellCheck,
  Ban,
  FileWarning,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

export const BrandKnowledgePage: React.FC = () => {
  const sections = [
    {
      title: 'Brand Voice Guidelines',
      description:
        'Define core tone, style, and messaging standards across marketing and communications.',
      icon: BookOpen,
      to: '/brand-knowledge/guidelines',
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Approved Terminology',
      description:
        'Specify preferred terminology and disallowed alternatives (e.g. "customer" vs "consumer").',
      icon: SpellCheck,
      to: '/brand-knowledge/terminology',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Prohibited Phrases',
      description:
        'Maintain a list of strictly banned claims, slogans, or unapproved promotional assertions.',
      icon: Ban,
      to: '/brand-knowledge/prohibited-phrases',
      color: 'bg-red-50 text-red-600',
    },
    {
      title: 'Required Disclaimers',
      description:
        'Enforce mandatory legal notices and regional disclaimers by content category.',
      icon: FileWarning,
      to: '/brand-knowledge/disclaimers',
      color: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'Approved Product Facts',
      description:
        'Audit-ready repository of verified facts, SLA statistics, certifications, and sources.',
      icon: CheckCircle,
      to: '/brand-knowledge/facts',
      color: 'bg-emerald-50 text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Brand Knowledge Base
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage the single source of truth for all brand voice, terminology, legal disclaimers,
          and auditable product facts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((sec) => (
          <Link key={sec.title} to={sec.to} className="group">
            <Card className="h-full hover:border-indigo-300 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${sec.color}`}>
                  <sec.icon className="w-6 h-6" />
                </div>
                <div className="p-1 rounded-full text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{sec.title}</h3>
              <p className="text-sm text-slate-500">{sec.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
