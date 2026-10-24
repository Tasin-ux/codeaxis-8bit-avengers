import React from 'react';
import { Badge } from './Badge';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface SeverityBadgeProps {
  severity: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const norm = severity?.toLowerCase() || 'medium';

  switch (norm) {
    case 'critical':
      return (
        <Badge variant="red" className="gap-1">
          <AlertCircle className="w-3 h-3 text-red-600" />
          Critical
        </Badge>
      );
    case 'high':
      return (
        <Badge variant="orange" className="gap-1">
          <AlertTriangle className="w-3 h-3 text-orange-600" />
          High
        </Badge>
      );
    case 'medium':
      return (
        <Badge variant="amber" className="gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Medium
        </Badge>
      );
    case 'low':
      return (
        <Badge variant="blue" className="gap-1">
          <Info className="w-3 h-3 text-blue-600" />
          Low
        </Badge>
      );
    default:
      return (
        <Badge variant="gray" className="gap-1">
          <Info className="w-3 h-3 text-stone-500" />
          Info
        </Badge>
      );
  }
};
