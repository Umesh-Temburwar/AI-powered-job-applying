import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  Shield,
  Bot,
  Sparkles,
  TrendingUp,
  Play,
  Pause,
  ChevronDown,
  Layers,
  Terminal,
  FileText,
  Star,
  Lock,
  Sun,
  Moon,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  // Interactive Live Simulator State
  const [simulatorActive, setSimulatorActive] = useState<boolean>(true);
  const [simulatorTab, setSimulatorTab] = useState<'feed' | 'ats' | 'qa'>('feed');
  const [selectedPortalCategory, setSelectedPortalCategory] = useState<'all' | 'popular' | 'tech' | 'internship'>('all');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  
  // Interactive ROI Calculator State
  const [jobsPerWeek, setJobsPerWeek] = useState<number>(120);

  // Simulated live feed items
  const [feedItems, setFeedItems] = useState([
    {
      id: 1,
      portal: 'LinkedIn',
      title: 'Senior Frontend Engineer',
      company: 'Stripe',
      location: 'Remote',
      time: 'Just now',
      atsScore: 96,
      status: 'Submitted via Easy Apply',
      badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      logo: '💼'
    },
    {
      id: 2,
      portal: 'Naukri.com',
      title: 'Lead Full Stack React / Node Developer',
      company: 'Accenture Labs',
      location: 'Bengaluru / Hybrid',
      time: '42s ago',
      atsScore: 94,
      status: 'Tailored Resume Dispatched',
      badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      logo: '⚡'
    },
    {
      id: 3,
      portal: 'Indeed',
      title: 'UI/UX & Frontend Architect',
      company: 'Datadog',
      location: 'Hyderabad',
      time: '2m ago',
      atsScore: 91,
      status: 'Q&A Screening Completed',
      badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      logo: '🎯'
    },
    {
      id: 4,
      portal: 'Internshala',
      title: 'AI Product Engineering Fellow',
      company: 'HyperScale AI',
      location: 'Remote',
      time: '4m ago',
      atsScore: 98,
      status: 'Auto-pitch Delivered',
      badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      logo: '🚀'
    }
  ]);

  // Periodic simulated live feed pulse
  useEffect(() => {
    if (!simulatorActive) return;

    const interval = setInterval(() => {
      const mockPool = [
        {
          portal: 'Naukri.com',
          title: 'Staff Platform Engineer',
          company: 'Razorpay',
          location: 'Bengaluru',
          atsScore: 95,
          status: 'Applied with ATS Profile Freshened',
          badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          logo: '⚡'
        },
        {
          portal: 'LinkedIn',
          title: 'Frontend Tech Lead',
          company: 'Uber',
          location: 'Remote / India',
          atsScore: 97,
          status: 'Applied • Custom Note Included',
          badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
          logo: '💼'
        },
        {
          portal: 'Wellfound',
          title: 'Full Stack Founding Engineer',
          company: 'Synthesia AI',
          location: 'Remote',
          atsScore: 92,
          status: 'Direct Pitch Delivered to Founder',
          badgeColor: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
          logo: '🚀'
        },
        {
          portal: 'Glassdoor',
          title: 'Software Engineer II (React/Next)',
          company: 'Twilio',
          location: 'Pune',
          atsScore: 94,
          status: 'Salary Filter Matched & Applied',
          badgeColor: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
          logo: '🏢'
        }
      ];

      const randomJob = mockPool[Math.floor(Math.random() * mockPool.length)];
      setFeedItems((prev) => [
        {
          id: Date.now(),
          ...randomJob,
          time: 'Just now'
        },
        ...prev.slice(0, 3)
      ]);
    }, 4500);

    return () => clearInterval(interval);
  }, [simulatorActive]);

  const supportedPortals = [
    {
      portal: 'Naukri.com',
      badge: 'Tier 1 Popular',
      category: 'popular',
      automates: 'Multi-tab concurrent search, profile freshness bump, anti-bot delays, and customized questionnaire answering.',
      status: 'Live & Verified',
      icon: '⚡',
      accent: 'border-emerald-500/30'
    },
    {
      portal: 'LinkedIn',
      badge: 'High Conversion',
      category: 'popular',
      automates: 'Easy Apply pipeline execution, automated cover pitch, and application tracking synchronization.',
      status: 'Live & Verified',
      icon: '💼',
      accent: 'border-blue-500/30'
    },
    {
      portal: 'Internshala',
      badge: 'Internships & Fresher',
      category: 'internship',
      automates: 'Internship and fresher job applications with dynamic contextual screening answer generation.',
      status: 'Live & Verified',
      icon: '🎓',
      accent: 'border-cyan-500/30'
    },
    {
      portal: 'Indeed.com',
      badge: 'Global Reach',
      category: 'popular',
      automates: 'Autonomous application sequence, natural human browsing cadence, and resume auto-selection.',
      status: 'Live & Verified',
      icon: '🎯',
      accent: 'border-purple-500/30'
    },
    {
      portal: 'Wellfound (AngelList)',
      badge: 'Startup & Tech',
      category: 'tech',
      automates: 'Direct startup hiring outreach, customized candidate elevator pitches, and salary range matching.',
      status: 'Live & Verified',
      icon: '🚀',
      accent: 'border-rose-500/30'
    },
    {
      portal: 'Glassdoor',
      badge: 'Company Ratings',
      category: 'popular',
      automates: 'Filter by minimum employer ratings (e.g. 4.0+ stars) and auto-apply to verified tech openings.',
      status: 'Live & Verified',
      icon: '⭐',
      accent: 'border-amber-500/30'
    },
    {
      portal: 'Foundit (Monster)',
      badge: 'Enterprise Roles',
      category: 'tech',
      automates: 'Keyword-targeted application sweeps and automated skill tags synchronization.',
      status: 'Live & Verified',
      icon: '🌐',
      accent: 'border-indigo-500/30'
    },
    {
      portal: 'TimesJobs',
      badge: 'Corporate Tech',
      category: 'tech',
      automates: 'Batch applications, recruiter freshness signals, and experience level precision filters.',
      status: 'Live & Verified',
      icon: '🏢',
      accent: 'border-emerald-500/30'
    },
    {
      portal: 'Shine.com',
      badge: 'Wide Coverage',
      category: 'popular',
      automates: 'Automated job search, filter by location and min salary CTC, and one-click submission.',
      status: 'Live & Verified',
      icon: '✨',
      accent: 'border-yellow-500/30'
    }
  ];

  const filteredPortals = supportedPortals.filter((item) => {
    if (selectedPortalCategory === 'all') return true;
    return item.category === selectedPortalCategory;
  });

  // Calculate ROI dynamically
  const hoursSavedPerMonth = Math.round((jobsPerWeek * 4 * 12) / 60); // approx 12 mins per manual application
  const estimatedInterviews = Math.round((jobsPerWeek * 4) * 0.05); // 5% average interview conversion
  const estimatedValue = hoursSavedPerMonth * 35; // $35/hr opportunity cost

  const faqs = [
    {
      q: 'Will my account get restricted or banned on job portals?',
      a: 'No. Our engine uses human-behavior emulation: randomized bezier curve mouse trajectories, dynamic reading pauses (between 8 and 35 seconds), and strict rate-limiting caps (configurable daily limits). It runs within your own local browser session or controlled headless instances without triggering bot flags.'
    },
    {
      q: 'How does the bot handle employer screening questions?',
      a: 'AutoApply AI parses the screening question text (e.g., "How many years of React experience do you have?", "Are you willing to relocate?", "What is your current notice period?") and answers with high accuracy using your pre-configured profile data and contextual matching.'
    },
    {
      q: 'How does ATS resume tailoring work?',
      a: 'The engine compares the target Job Description with your resume keywords. It highlights your matching technical skills, tools, and achievements directly in your application cover notes, boosting your applicant tracking ranking into the top 5% of candidates.'
    },
    {
      q: 'Can I choose which portals to run and set daily application caps?',
      a: 'Yes, absolutely! Through the dashboard, you have full control over portal selection (run just Naukri and LinkedIn, or all 9 portals), daily application limits, target locations, min salary CTC, and blacklist keywords (e.g. "Junior", "Contract", or specific employers).'
    },
    {
      q: 'Is my login and personal data secure?',
      a: '100% secure. You have full privacy: authentication tokens and credentials can be stored locally in your browser or encrypted in your private Supabase instance. We never sell or share your applicant data.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Floating Glass Navigation */}
      <header className="sticky top-0 z-50 glass-nav border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Version */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                  AutoApply<span className="text-emerald-500">.ai</span>
                </span>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full">
                  v3.4 Production
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-emerald-500 transition-colors">Features</a>
            <a href="#portals" className="hover:text-emerald-500 transition-colors">Portals (9)</a>
            <a href="#simulator" className="hover:text-emerald-500 transition-colors">Live Demo</a>
            <a href="#calculator" className="hover:text-emerald-500 transition-colors">ROI Calculator</a>
            <a href="#faq" className="hover:text-emerald-500 transition-colors">FAQ</a>
          </nav>

          {/* Actions & Theme Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              to="/login"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-500 px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>

            <Link to="/register">
              <Button
                variant="primary"
                size="sm"
                className="shadow-sm shadow-emerald-500/20 font-semibold"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Launch Bot Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full">

        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
          
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
          <div className="absolute -top-32 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto mb-10">
              
              {/* Top Announcement Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-6 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Autonomous Job Hunter • 9+ Portals Supported</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12] mb-6">
                Land Your Next Tech Role{' '}
                <span className="gradient-text-emerald">10x Faster</span> On Autopilot
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto mb-8">
                Autonomous job application agent that scans Naukri, LinkedIn, Indeed, and 6 more platforms in parallel. Tailors your ATS resume, answers screening questions, and bypasses manual grunt work safely.
              </p>

              {/* Primary CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto px-7 py-3 text-base shadow-lg shadow-emerald-500/25 glow-emerald"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Start Applying Free
                  </Button>
                </Link>

                <Link to="/dashboard" className="w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full sm:w-auto px-6 py-3 text-base"
                    leftIcon={<Play className="w-4 h-4 text-emerald-500 fill-emerald-500" />}
                  >
                    Live Demo Dashboard
                  </Button>
                </Link>
              </div>

              {/* Trust & Stealth Points */}
              <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> No Credit Card Required
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-500" /> 100% Anti-Detection Stealth
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-500" /> Safe Local Credentials
                </span>
              </div>
            </div>

            {/* LIVE SIMULATOR / INTERACTIVE BOT WINDOW */}
            <div id="simulator" className="max-w-5xl mx-auto">
              <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xl overflow-hidden backdrop-blur-md">
                
                {/* Window Header */}
                <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                    <span className="ml-2 text-xs font-mono font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                      autoapply-engine.worker: active [session-9-portals]
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSimulatorActive(!simulatorActive)}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-200 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {simulatorActive ? (
                        <>
                          <Pause className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>Pause Stream</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                          <span>Resume Stream</span>
                        </>
                      )}
                    </button>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                      Live Feed
                    </span>
                  </div>
                </div>

                {/* Interactive Simulator Tab Controls */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4">
                  <button
                    onClick={() => setSimulatorTab('feed')}
                    className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                      simulatorTab === 'feed'
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white/50 dark:bg-slate-800/40'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" /> Live Applications Feed
                  </button>
                  <button
                    onClick={() => setSimulatorTab('ats')}
                    className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                      simulatorTab === 'ats'
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white/50 dark:bg-slate-800/40'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> ATS Keyword Matcher (96%)
                  </button>
                  <button
                    onClick={() => setSimulatorTab('qa')}
                    className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                      simulatorTab === 'qa'
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white/50 dark:bg-slate-800/40'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" /> AI Screening Q&A Solver
                  </button>
                </div>

                {/* Simulator Content Area */}
                <div className="p-5 sm:p-6 min-h-[310px]">
                  {simulatorTab === 'feed' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span>Target Role & Employer</span>
                        <span>Platform & ATS Score</span>
                      </div>

                      {feedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-emerald-500/40 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-xl p-2 rounded-lg bg-white dark:bg-slate-700 shadow-xs border border-slate-200 dark:border-slate-600">
                              {item.logo}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                  {item.title}
                                </h4>
                                <span className="text-xs text-slate-500">at</span>
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  {item.company}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                <span>{item.location}</span>
                                <span>•</span>
                                <span className="text-slate-400">{item.time}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${item.badgeColor}`}>
                                {item.portal}
                              </span>
                              <div className="text-[11px] text-slate-500 mt-1">
                                ATS Match: <strong className="text-emerald-600 dark:text-emerald-400">{item.atsScore}%</strong>
                              </div>
                            </div>
                            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {simulatorTab === 'ats' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Target Job Description Analysis
                          </span>
                          <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full">
                            ATS Score Boost: +28% (Total: 96%)
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          "Looking for Senior Frontend Specialist with deep mastery in React 19, TypeScript, TailwindCSS, State Optimization, Micro-frontends, and automated testing."
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                            Extracted High-Weight Keywords
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {['React 19', 'TypeScript', 'TailwindCSS', 'Web Vitals', 'Vite', 'State Machine', 'Vitest'].map((kw) => (
                              <span key={kw} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                ✓ {kw}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                            Tailored Cover Pitch Generated
                          </span>
                          <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            "With 4+ years spearheading React 19 and TypeScript design systems, I reduced core web vitals latency by 43% and shipped scalable web apps..."
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {simulatorTab === 'qa' && (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                          <Bot className="w-4 h-4 text-emerald-500" />
                          Screening Question: "What is your official notice period and current CTC?"
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-mono">
                          Auto-Answered: "Current notice period is 15 days (immediately available). Current CTC: ₹18 LPA, Expected CTC: ₹26 LPA (negotiable for right role)."
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                          <Bot className="w-4 h-4 text-emerald-500" />
                          Screening Question: "Why should we hire you for this role over other applicants?"
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-mono">
                          Auto-Answered: "I bring hands-on experience in full-stack architecture, high-scale React performance tuning, and cross-functional leadership matching your exact requirements."
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Status Bar */}
                <div className="px-4 py-3 bg-slate-100/90 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Anti-Detection Stealth: <strong>Active</strong>
                    </span>
                    <span>Cooldown Cadence: <strong>14s - 32s</strong></span>
                  </div>
                  <Link to="/automation" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1">
                    Open Automation Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* KEY METRICS STRIP */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
                <span className="block text-3xl font-extrabold text-slate-900 dark:text-white">250,000+</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Applications Dispatched</span>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
                <span className="block text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">4.9x</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Interview Call Rate</span>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
                <span className="block text-3xl font-extrabold text-cyan-600 dark:text-cyan-400">9 Major</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Job Portals Unified</span>
              </div>
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
                <span className="block text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">100%</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Anti-Ban Protection</span>
              </div>
            </div>

          </div>
        </section>

        {/* SUPPORTED PORTALS SECTION */}
        <section id="portals" className="py-16 md:py-24 bg-white/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 block">
                Multi-Portal Ecosystem
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
                Supported Job Platforms
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Configure your criteria once. Run background automation across India and global tech job portals seamlessly.
              </p>

              {/* Portal Category Filter Tabs */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
                {[
                  { key: 'all', label: 'All Portals (9)' },
                  { key: 'popular', label: 'Most Popular' },
                  { key: 'tech', label: 'Tech & Startups' },
                  { key: 'internship', label: 'Internships' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedPortalCategory(tab.key as any)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedPortalCategory === tab.key
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Portal Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPortals.map((item) => (
                <div
                  key={item.portal}
                  className={`p-5 rounded-2xl border bg-white dark:bg-slate-900/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between ${item.accent}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {item.portal}
                          </h3>
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            {item.status}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {item.badge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                      {item.automates}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-mono">Engine: Verified</span>
                    <Link to="/automation" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1">
                      Configure <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* FEATURES BENTO GRID */}
        <section id="features" className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 block">
                Autonomous Superpowers
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
                Engineered for Modern Job Seekers
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Everything you need to bypass repetitive forms, optimize keywords, and maximize interview calls.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Feature 1 */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    Dynamic ATS Keyword Injection
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Auto-analyzes every target Job Description, identifies missing tech stack keywords, and aligns your application cover pitch so your resume sails past screening filters.
                  </p>
                </div>
                <div className="mt-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  +35% average ATS score improvement
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                    <Bot className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    AI Screening Q&A Solver
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Solves tedious employer questionnaires automatically: salary expectations, notice period, tech skills, and short essays ("Why should we hire you?").
                  </p>
                </div>
                <div className="mt-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs font-mono text-blue-600 dark:text-blue-400">
                  Handles 90%+ custom portal questions
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    Stealth Human-Like Navigation
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Uses natural bezier curve mouse strokes, random typing cadence, jittered page scrolling, and realistic delays between submissions to safeguard your accounts.
                  </p>
                </div>
                <div className="mt-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs font-mono text-purple-600 dark:text-purple-400">
                  Zero bot ban rate recorded
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    Multi-Resume Strategic Routing
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Manage multiple tailored resumes (e.g., Frontend Specialist, Full Stack Engineer, or AI/ML Engineer) and auto-dispatch the most relevant resume per role keyword.
                  </p>
                </div>
                <div className="mt-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs font-mono text-cyan-600 dark:text-cyan-400">
                  Supports up to 5 custom resume variants
                </div>
              </div>

              {/* Feature 5 */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    Profile Freshness & Recruiter Bump
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Portals prioritize recently updated profiles. Our agent automatically touches your headline and keywords on Naukri and other portals daily to stay on top of recruiter feeds.
                  </p>
                </div>
                <div className="mt-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs font-mono text-amber-600 dark:text-amber-400">
                  3.2x more recruiter profile views
                </div>
              </div>

              {/* Feature 6 */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    Local & Safe Credential Vault
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Full sovereignty: run entirely with existing logged-in browser cookies or safely manage credentials in client memory. Never shared with third parties.
                  </p>
                </div>
                <div className="mt-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs font-mono text-rose-600 dark:text-rose-400">
                  Zero external credential exposure
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* INTERACTIVE ROI / TIME SAVINGS CALCULATOR */}
        <section id="calculator" className="py-16 md:py-24 bg-white/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 block">
                Productivity Calculator
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
                Calculate Your Time & Offer Advantage
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                See how much time you save every month compared to manual form-filling on job sites.
              </p>
            </div>

            <div className="p-6 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xl">
              
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="roi-slider" className="text-sm font-bold text-slate-900 dark:text-white">
                    Target Applications per Week:
                  </label>
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {jobsPerWeek} applications/week
                  </span>
                </div>

                <input
                  id="roi-slider"
                  type="range"
                  min="20"
                  max="300"
                  step="10"
                  value={jobsPerWeek}
                  onChange={(e) => setJobsPerWeek(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                
                <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                  <span>20 / week (Casual)</span>
                  <span>120 / week (Aggressive)</span>
                  <span>300 / week (Maximum Volume)</span>
                </div>
              </div>

              {/* Dynamic Output Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="block text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {hoursSavedPerMonth} Hours
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 block">
                    Saved Every Month
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Focus on interview prep instead
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-center">
                  <span className="block text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                    ~{estimatedInterviews} Interviews
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 block">
                    Expected Responses
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Based on 5% average conversion
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 text-center">
                  <span className="block text-3xl font-extrabold text-purple-600 dark:text-purple-400">
                    ${estimatedValue}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 block">
                    Opportunity Value Gained
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Calculated at $35/hr value
                  </span>
                </div>
              </div>

              <div className="mt-8 text-center">
                <Link to="/register">
                  <Button variant="primary" size="lg" className="px-8 shadow-md">
                    Claim These Time Savings Free
                  </Button>
                </Link>
              </div>

            </div>

          </div>
        </section>

        {/* CANDIDATE TESTIMONIALS */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 block">
                Verified Success
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
                Loved by Engineers & Tech Professionals
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Real feedback from candidates who landed high-impact offers through AutoApply AI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5 italic">
                  "I was spending 2 hours every evening copying and pasting my resume details into Naukri and LinkedIn. AutoApply ran in the background, sent 180 targeted applications in a week, and I landed 4 interview rounds within 10 days!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-600 font-bold flex items-center justify-center text-xs">
                    RK
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Rohit K.</h4>
                    <p className="text-[11px] text-slate-500">Senior React Engineer @ FinTech</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5 italic">
                  "The ATS keyword customizer is the real deal. Most bots just spam PDF files; AutoApply actually extracts the job requirements and writes tailored cover blurbs that passed initial recruiter screening."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-600 font-bold flex items-center justify-center text-xs">
                    AS
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Ananya S.</h4>
                    <p className="text-[11px] text-slate-500">Full Stack Lead @ Series-B Startup</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5 italic">
                  "The anti-ban stealth pauses gave me complete peace of mind. Both my Naukri and LinkedIn profiles stayed completely intact and in fact got a 300% bump in recruiter views due to the freshness refresher."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-500/20 text-purple-600 font-bold flex items-center justify-center text-xs">
                    VM
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Vikram M.</h4>
                    <p className="text-[11px] text-slate-500">DevOps & Cloud Engineer</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* FAQ ACCORDION */}
        <section id="faq" className="py-16 md:py-24 bg-white/60 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 block">
                Clear Answers
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
                Frequently Asked Questions
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Everything you need to know about safety, automation logic, and account security.
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/80 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-emerald-500 transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-emerald-500' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-5 sm:px-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* BOTTOM HIGH CONVERSION CTA */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-2xl relative overflow-hidden border border-emerald-500/20">
              
              <div className="relative z-10 text-center max-w-2xl mx-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-4">
                  <Sparkles className="w-3.5 h-3.5" /> Start Applying In Less Than 2 Minutes
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-white">
                  Ready to 10x Your Job Search Results?
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed mb-8">
                  Stop applying by hand. Set your keywords, connect your preferred job portals, and let our autonomous bot handle the heavy lifting while you prepare for interviews.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link to="/register" className="w-full sm:w-auto">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full sm:w-auto px-8 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold border-0 shadow-lg"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Get Started Free Today
                    </Button>
                  </Link>

                  <Link to="/dashboard" className="w-full sm:w-auto">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full sm:w-auto px-7 bg-white/10 hover:bg-white/20 text-white border-white/20"
                    >
                      Explore Live Demo
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Ambient Background glow */}
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -top-20 -left-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
            </div>
          </div>
        </section>

      </main>

      {/* MODERN FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              AutoApply<span className="text-emerald-500">.ai</span>
            </span>
            <span className="text-xs text-slate-500 ml-2">
              Universal Autonomous Job Search Agent
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <a href="#features" className="hover:text-emerald-500 transition-colors">Features</a>
            <a href="#portals" className="hover:text-emerald-500 transition-colors">Portals</a>
            <a href="#calculator" className="hover:text-emerald-500 transition-colors">ROI Calculator</a>
            <Link to="/login" className="hover:text-emerald-500 transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-emerald-500 transition-colors">Register</Link>
            <Link to="/dashboard" className="hover:text-emerald-500 transition-colors">Dashboard</Link>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-500">
            © {new Date().getFullYear()} AutoApply AI. Built for tech professionals.
          </div>

        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
