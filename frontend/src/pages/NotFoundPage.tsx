import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/ui';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-theme-accent-muted border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] mb-6 shadow-xl">
        <Bot className="w-8 h-8" />
      </div>

      <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-2">
        Error 404
      </span>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-theme-primary mb-3">
        Page Not Found
      </h1>
      <p className="text-sm text-theme-secondary max-w-md mb-8">
        The destination you requested does not exist or has been relocated within the Universal Job Bot platform.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to="/dashboard">
          <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
            Go to Dashboard
          </Button>
        </Link>
        <Link to="/">
          <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Landing Page
          </Button>
        </Link>
      </div>
    </div>
  );
};
