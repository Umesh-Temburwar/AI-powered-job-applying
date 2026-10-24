import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, ArrowLeft, Home, Sparkles } from 'lucide-react';
import { Button } from '../components/ui';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center transition-colors duration-200 relative overflow-hidden">
      
      {/* Background radial glow */}
      <div className="absolute w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 shadow-2xl backdrop-blur-md">
        
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-md shadow-emerald-500/20">
          <Bot className="w-8 h-8" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Error 404
        </span>

        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">
          Destination Not Found
        </h1>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
          The requested page route doesn't exist or has been shifted in the AutoApply AI portal.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/dashboard" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full" leftIcon={<Home className="w-4 h-4" />}>
              Go to Dashboard
            </Button>
          </Link>
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Landing Page
            </Button>
          </Link>
        </div>

      </div>

    </div>
  );
};

export default NotFoundPage;
