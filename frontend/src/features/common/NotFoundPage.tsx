import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ShieldAlert } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-lg bg-stone-100 text-stone-400 flex items-center justify-center mb-5 ring-1 ring-inset ring-stone-200">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-teal-700 font-mono mb-2">
        404
      </p>
      <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Page not found</h1>
      <p className="text-sm text-stone-500 mt-2 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button className="mt-6" onClick={() => navigate('/')}>
        Back to dashboard
      </Button>
    </div>
  );
};
