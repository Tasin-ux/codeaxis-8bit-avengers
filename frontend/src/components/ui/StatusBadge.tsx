import React from 'react';
import { Badge } from './Badge';
import { Clock, CheckCircle2, AlertCircle, FileEdit } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const norm = status?.toLowerCase() || 'draft';

  switch (norm) {
    case 'approved':
      return (
        <Badge variant="emerald" className="gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Approved
        </Badge>
      );
    case 'in_review':
      return (
        <Badge variant="blue" className="gap-1">
          <Clock className="w-3 h-3 text-blue-600" />
          In Review
        </Badge>
      );
    case 'changes_requested':
      return (
        <Badge variant="amber" className="gap-1">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          Changes Requested
        </Badge>
      );
    case 'draft':
    default:
      return (
        <Badge variant="gray" className="gap-1">
          <FileEdit className="w-3 h-3 text-slate-500" />
          Draft
        </Badge>
      );
  }
};
