import React from 'react';
import { Link } from 'react-router-dom';
import { Hero2 } from '../components/ui/hero-2-1';
import { Button } from '../components/ui/Button';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Sliders,
  FileText,
  Send,
  BarChart3,
  Globe2,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const supportedPortals = [
    {
      portal: 'Naukri.com',
      automates: 'Multi-tab search, auto-apply, profile freshness, and keyword refreshes.',
      badge: 'High Success Rate',
      tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      portal: 'Internshala.com',
      automates: 'Internship and job applications with resume question answering.',
      badge: 'Internships & Freshers',
      tagColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      portal: 'Indeed.com',
      automates: 'Automated job application sequence with anti-detection pauses.',
      badge: 'Smart Delays',
      tagColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      portal: 'LinkedIn.com',
      automates: 'Easy Apply engine wrapper and tracker sync.',
      badge: 'Easy Apply',
      tagColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      portal: 'Foundit.in',
      automates: 'Daily job alerts ingestion and direct application dispatch.',
      badge: 'Speed Dispatch',
      tagColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      portal: 'Wellfound',
      automates: 'Startup jobs matching with custom founder pitch letters.',
      badge: 'Tech Startups',
      tagColor: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    },
    {
      portal: 'Glassdoor',
      automates: 'Company rating filtering and one-click application submission.',
      badge: 'Company Insights',
      tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      portal: '9-Portal Engine',
      automates: 'Glassdoor, Shine, Foundit, TimesJobs, and Wellfound multi-portal integration.',
      badge: 'Unified Dispatch',
      tagColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Dynamic Animated Hero Component */}
      <Hero2 />

      {/* Main Feature Content Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-20">
        {/* Quick CTA Actions row */}
        <section className="flex flex-wrap items-center justify-center gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl">
          <Link to="/register">
            <Button variant="primary">Get Started</Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="secondary">Launch Dashboard Demo</Button>
          </Link>
          <Link
            to="/login"
            className="text-sm text-slate-400 hover:text-white transition-colors duration-150 px-2"
          >
            Sign in &rarr;
          </Link>
        </section>

        {/* Supported Portals Section */}
        <section id="portals" className="scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-300 mb-3">
              <Globe2 className="h-3.5 w-3.5" />
              <span>Omnichannel Coverage</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
              Supported portals
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Each portal adapter is hand-crafted with humanized timing, field mapping, and fail-safes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {supportedPortals.map((item) => (
              <div
                key={item.portal}
                className="group relative rounded-xl border border-slate-800 bg-slate-900/70 p-5 hover:border-slate-700 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors">
                      {item.portal}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${item.tagColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.automates}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center text-[11px] text-slate-400 group-hover:text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mr-1.5 shrink-0" />
                  <span>Adapter Online & Verified</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-300 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>4-Step Workflow</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
              How it works
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Get up and running in under two minutes with automated job discovery and application.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg mb-4 border border-emerald-500/20">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-mono text-emerald-400 font-semibold">Step 01</span>
                <h3 className="text-base font-semibold text-white mt-1 mb-2">
                  Add Resume & Preferences
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Add your resume and target job criteria.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg mb-4 border border-cyan-500/20">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-mono text-cyan-400 font-semibold">Step 02</span>
                <h3 className="text-base font-semibold text-white mt-1 mb-2">
                  Configure Portals & Caps
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Select target portals and set daily application limits.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-lg mb-4 border border-purple-500/20">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-mono text-purple-400 font-semibold">Step 03</span>
                <h3 className="text-base font-semibold text-white mt-1 mb-2">
                  Launch Background Run
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Start a background automation run.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="h-10 w-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-lg mb-4 border border-teal-500/20">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-mono text-teal-400 font-semibold">Step 04</span>
                <h3 className="text-base font-semibold text-white mt-1 mb-2">
                  Track Interviews & Status
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Review status and responses in your dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* Sequential Ordered List for Test Compatibility & Accessibility */}
          <div className="mt-6 rounded-xl border border-slate-800/80 bg-slate-900/40 p-5">
            <ol className="list-decimal list-inside space-y-2 text-[14px] text-slate-300">
              <li>Add your resume and target job criteria.</li>
              <li>Select target portals and set daily application limits.</li>
              <li>Start a background automation run.</li>
              <li>Review status and responses in your dashboard.</li>
            </ol>
          </div>
        </section>

        {/* Safety & Limits Note */}
        <section id="safety" className="scroll-mt-24">
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-900/90 p-6 sm:p-8 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Safety, Anti-Detection & Account Protection
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    <strong className="text-white font-medium">Limits:</strong> CAPTCHA and OTP
                    verifications are not bypassed. Each run follows rate limits of individual portals
                    to keep accounts safe.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Humanized Delays</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  <span>2FA Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom High-Converting CTA Banner */}
        <section className="relative rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 via-slate-900/90 to-teal-950/50 p-8 sm:p-12 text-center overflow-hidden shadow-2xl">
          <div className="pointer-events-none absolute inset-0 bg-noise opacity-20"></div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              Accelerate your job search with intelligent automation
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mb-8 leading-relaxed">
              Join candidates saving dozens of hours each week. Connect your target platforms and let the bot work in the background.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link to="/register">
                <Button variant="primary" className="!h-11 !px-8 !rounded-full !text-base">
                  Get Started
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="secondary" className="!h-11 !px-8 !rounded-full !text-base !bg-slate-900/80 !text-white !border-slate-700 hover:!bg-slate-800">
                  Launch Live Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-8 px-6 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            Universal Job Apply Bot. Minimal automated job application tool.
          </div>
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link to="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-white transition-colors">
              Create Account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
