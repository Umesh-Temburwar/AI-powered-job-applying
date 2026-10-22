import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  PlayCircle,
  FileText,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';

export const LandingPage: React.FC = () => {
  const supportedPlatforms = [
    {
      name: 'Naukri.com',
      badge: 'Supported by existing CLI',
      desc: 'Multi-tab search, auto-apply, profile freshness & keyword refreshes.',
      status: 'cli-ready',
    },
    {
      name: 'Internshala.com',
      badge: 'Supported by existing CLI',
      desc: 'Full-stack internship and job applications with resume question answering.',
      status: 'cli-ready',
    },
    {
      name: 'Indeed.com',
      badge: 'Supported by existing CLI',
      desc: 'Easily Apply automated job application sequence with anti-detection pauses.',
      status: 'cli-ready',
    },
    {
      name: 'LinkedIn.com',
      badge: 'Supported by existing CLI',
      desc: 'Easy Apply engine wrapper with YAML credential generation and tracker sync.',
      status: 'cli-ready',
    },
    {
      name: '9-Portal Engine',
      badge: 'Supported by existing CLI',
      desc: 'Glassdoor, Shine, Foundit, TimesJobs, and Wellfound multi-portal integration.',
      status: 'cli-ready',
    },
  ];

  const features = [
    {
      icon: <Layers className="w-6 h-6 text-[var(--accent)]" />,
      title: 'Unified Multi-Portal Automation',
      desc: 'Consolidates 5 major job ecosystem engines into a single automated control center.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      title: 'Isolated Ephemeral Sandboxing',
      desc: 'Each task launches in an isolated browser profile ensuring complete privacy and multi-user safety.',
    },
    {
      icon: <CheckCircle2 className="w-6 h-6 text-sky-400" />,
      title: 'Anti-Duplicate Engine',
      desc: 'Enforces database-level constraints on job URLs and IDs so you never apply twice to the same job.',
    },
    {
      icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
      title: 'Human-in-the-Loop Review Mode',
      desc: 'Pauses safely when screening questions or CAPTCHAs appear, never attempting unsafe bypasses.',
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Upload Resume & Profile',
      desc: 'Store your master profile and standard PDF resume in private, encrypted cloud storage.',
      icon: FileText,
    },
    {
      step: '02',
      title: 'Define Job Criteria',
      desc: 'Specify targeted titles, locations, experience level, salary range, and platform daily limits.',
      icon: Sliders,
    },
    {
      step: '03',
      title: 'Review & Launch',
      desc: 'Trigger background worker tasks with live progress streaming and manual confirmation checkpoints.',
      icon: PlayCircle,
    },
    {
      step: '04',
      title: 'Track Across Platforms',
      desc: 'Review unified status tables, filter by portal, view error details, and export application logs.',
      icon: Bot,
    },
  ];

  return (
    <div className="min-h-screen bg-theme-base text-theme-primary flex flex-col selection:bg-[var(--accent)] selection:text-slate-950">
      {/* Navigation Header */}
      <header className="h-20 border-b border-theme bg-theme-base/80 backdrop-blur-md sticky top-0 z-40 px-6 lg:px-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-theme-accent-muted border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] group-hover:scale-105 transition-transform">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-theme-primary block">
              Universal Job Apply Bot
            </span>
            <span className="text-[10px] text-theme-muted uppercase tracking-wider block">
              Multi-User Platform
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-6 lg:px-12 max-w-6xl mx-auto text-center overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--accent)]/30 bg-theme-accent-muted text-xs font-semibold text-[var(--accent)] mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Phase 2 UI Architecture — Multi-Portal Automation Platform
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-theme-primary leading-[1.1] mb-6">
          Automate Job Applications Across{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-sky-400">
            Naukri, Internshala, Indeed & LinkedIn
          </span>
        </h1>

        <p className="text-base sm:text-lg text-theme-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          The all-in-one candidate automation suite. Powered by isolated background workers, smart
          screening answer matching, and strict rate-limiting to protect your candidate reputation.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/register">
            <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Get Started Free
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="secondary" size="lg">
              Explore Live Demo Dashboard
            </Button>
          </Link>
        </div>

        {/* Hero banner screenshot preview placeholder */}
        <div className="mt-14 p-2.5 rounded-2xl border border-theme bg-theme-surface/60 shadow-2xl backdrop-blur-xs max-w-4xl mx-auto">
          <div className="rounded-xl border border-theme bg-theme-card p-6 text-left">
            <div className="flex items-center justify-between border-b border-theme pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs text-theme-muted font-mono ml-2">universal-bot-dashboard</span>
              </div>
              <Badge variant="cyan" size="sm">
                CLI Automation Synchronized
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-theme-surface rounded-lg">
                <p className="text-xs text-theme-muted">Total Processed</p>
                <p className="text-xl font-bold text-theme-primary mt-1">128</p>
              </div>
              <div className="p-3 bg-theme-surface rounded-lg">
                <p className="text-xs text-theme-muted">Submitted</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">114</p>
              </div>
              <div className="p-3 bg-theme-surface rounded-lg">
                <p className="text-xs text-theme-muted">Review Required</p>
                <p className="text-xl font-bold text-amber-400 mt-1">8</p>
              </div>
              <div className="p-3 bg-theme-surface rounded-lg">
                <p className="text-xs text-theme-muted">Daily Limit</p>
                <p className="text-xl font-bold text-sky-400 mt-1">25 / day</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Platforms Section */}
      <section className="py-16 px-6 lg:px-12 bg-theme-surface/50 border-y border-theme">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-2 block">
              Supported Portals
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-theme-primary">
              Multi-Platform Ecosystem
            </h2>
            <p className="text-sm text-theme-secondary mt-2">
              Integrated directly with the existing tested Python automation scripts in this repository.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {supportedPlatforms.map((plat) => (
              <Card key={plat.name} hoverable className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-lg font-bold text-theme-primary">{plat.name}</h3>
                    <Badge variant="cyan" size="sm">
                      {plat.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-theme-secondary leading-relaxed">{plat.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-theme flex items-center justify-between text-[11px] text-theme-muted">
                  <span>Engine: Selenium WebDriver</span>
                  <span className="text-emerald-400 font-medium">Ready</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Terms & Availability Notice */}
          <div className="mt-10 p-4 rounded-xl border border-amber-500/30 bg-amber-950/30 text-amber-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-300 mb-0.5">
                Platform Rules & Rate Limiting Notice
              </span>
              <span>
                Job platform availability and successful submission strictly depend on each portal's
                individual terms of service, active session validity, and rate limits. This software
                does <strong>not</strong> bypass CAPTCHAs, OTPs, or multi-factor security verification.
                When a security challenge appears, the system pauses safely and alerts the user.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-20 px-6 lg:px-12 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-2 block">
            Core Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-theme-primary">
            Built for Reliability & Safety
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <Card key={i} className="p-6 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-theme-surface border border-theme shrink-0">
                {f.icon}
              </div>
              <div>
                <h3 className="text-base font-bold text-theme-primary mb-1.5">{f.title}</h3>
                <p className="text-xs sm:text-sm text-theme-secondary leading-relaxed">{f.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* How it Works Workflow */}
      <section className="py-20 px-6 lg:px-12 bg-theme-surface/30 border-t border-theme">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent)] mb-2 block">
              Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-theme-primary">
              How the Platform Operates
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="p-6 rounded-2xl bg-theme-card border border-theme relative">
                  <span className="text-3xl font-black text-theme-muted/40 block mb-3 font-mono">
                    {step.step}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-theme-accent-muted text-[var(--accent)] flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-theme-primary mb-1.5">{step.title}</h3>
                  <p className="text-xs text-theme-secondary leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-10 px-6 lg:px-12 border-t border-theme bg-theme-surface text-center sm:text-left">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-theme-accent-muted border border-[var(--accent)] flex items-center justify-center text-[var(--accent)]">
              <Bot className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-theme-primary">
              Universal Job Apply Bot Platform
            </span>
          </div>

          <p className="text-xs text-theme-muted">
            Designed for professional job seekers. CLI automation preserved &amp; synchronized.
          </p>

          <div className="flex items-center gap-4 text-xs text-theme-secondary">
            <Link to="/login" className="hover:text-theme-primary">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-theme-primary">
              Register
            </Link>
            <Link to="/dashboard" className="text-[var(--accent)] hover:underline">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
