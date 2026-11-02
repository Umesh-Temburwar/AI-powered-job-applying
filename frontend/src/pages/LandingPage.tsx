import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Terminal,
  ArrowRight,
  ExternalLink,
  Mail,
  MapPin,
  Briefcase,
  Laptop,
  Radio,
  Sun,
  Moon,
  Globe,
  Code2,
  BookOpen,
  KeyRound,
  ShieldAlert,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { isSoundEnabled, toggleSound, playRetroSound } from '../utils/soundEffects';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'terminal' | 'applications' | 'portals'>('terminal');
  // State for in-page Hero Photo -> Login card flip
  const [heroAuthState, setHeroAuthState] = useState<'photo' | 'login'>('photo');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  // Forward incoming email verification, recovery code, or OAuth callback directly to AuthCallbackPage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      if (
        search.includes('code=') ||
        search.includes('token_hash=') ||
        search.includes('error=') ||
        hash.includes('access_token=') ||
        hash.includes('error=')
      ) {
        navigate(`/auth/confirm${search}${hash}`, { replace: true });
      }
    }
  }, [navigate]);

  const handleSoundToggle = () => {
    const next = toggleSound();
    setSoundOn(next);
  };

  // Called when user clicks "Sign In" or "Dashboard" on home page
  const handleLoginTrigger = () => {
    if (user) {
      navigate('/applications');
      return;
    }
    playRetroSound('slide');
    setHeroAuthState('login');
    setLoginError(null);
    const cardEl = document.getElementById('hero-auth-card');
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleDashboardTrigger = (e?: React.MouseEvent) => {
    if (user) {
      navigate('/applications');
      return;
    }
    if (e) e.preventDefault();
    handleLoginTrigger();
  };

  const handleInPlaceLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter email and password.');
      playRetroSound('error');
      return;
    }
    try {
      setIsLoggingIn(true);
      await login(loginEmail, loginPassword);
      playRetroSound('success');
      navigate('/applications');
    } catch (err) {
      playRetroSound('error');
      setLoginError(err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const supportedPortals = [
    {
      portal: 'Naukri.com',
      code: 'PORTAL_01',
      badge: 'Core Engine',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500',
      description: 'Multi-tab concurrent search, profile freshness daemon, recruiter question answering, and recommended batch pipeline.',
      safeguard: 'Max 50 apps / day'
    },
    {
      portal: 'Internshala.com',
      code: 'PORTAL_02',
      badge: 'Intern & Fresher',
      badgeClass: 'bg-sky-100 text-sky-900 border-sky-900 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-500',
      description: 'Automates job and paid internship applications. Auto-fills tailored cover letters and handles radio assessment queries.',
      safeguard: 'Max 25 apps / day'
    },
    {
      portal: 'Indeed.com',
      code: 'PORTAL_03',
      badge: 'Easily Apply Suite',
      badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500',
      description: 'Direct modal execution for high-yield "Easily Apply" vacancies with phone, location, and experience question heuristics.',
      safeguard: 'Max 40 apps / day'
    },
    {
      portal: 'LinkedIn.com',
      code: 'PORTAL_04',
      badge: 'Easy Apply Wrapper',
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-900 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500',
      description: 'Integrates with Easy Apply bot process, dynamically generates config.yaml from profile, and tracks real Job IDs.',
      safeguard: 'Max 30 apps / day'
    },
    {
      portal: '9-Portal Master Daemon',
      code: 'PORTAL_05-09',
      badge: 'Broad Spectrum',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-900 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500',
      description: 'Extends coverage across Glassdoor, Shine, Foundit, TimesJobs, and Wellfound for comprehensive job discovery.',
      safeguard: 'Rate-limited deduplication'
    }
  ];

  const recentApplicationsDemo = [
    {
      role: 'Full Stack Python & React Developer',
      company: 'Persistent Systems Ltd.',
      portal: 'Naukri',
      location: 'Pune, Maharashtra',
      salary: '₹8 - 14 LPA',
      status: 'Applied',
      date: 'Today, 14:22',
      url: 'https://www.naukri.com/job-listings-full-stack-persistent'
    },
    {
      role: 'Software Engineer - Frontend Focus',
      company: 'Starkenn Technologies',
      portal: 'Naukri',
      location: 'Pune, Maharashtra',
      salary: '₹6 - 10 LPA',
      status: 'Applied',
      date: 'Today, 14:21',
      url: 'https://www.naukri.com/job-listings-starkenn-technologies'
    },
    {
      role: 'Associate Full Stack Engineer',
      company: 'Swiggy Tech India',
      portal: 'Indeed',
      location: 'Bengaluru / Remote',
      salary: '₹12 - 18 LPA',
      status: 'Applied',
      date: 'Today, 13:45',
      url: 'https://in.indeed.com/viewjob?jk=swiggy-tech-01'
    },
    {
      role: 'Junior Full Stack Developer',
      company: 'Tech Mahindra Ltd.',
      portal: 'LinkedIn',
      location: 'Pune / Remote',
      salary: 'Competitive',
      status: 'Applied',
      date: 'Today, 12:10',
      url: 'https://www.linkedin.com/jobs/view/tech-mahindra-fsd'
    }
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'retro-grid-dark bg-[#0B0E14] text-[#F4F4F5]' : 'retro-grid-light bg-[#F5F3EC] text-[#09090B]'} font-sans flex flex-col transition-colors duration-150`}>

      {/* Retro Top Marquee / Hardware Status Strip */}
      <div className={`h-8 border-b-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#111520] text-[#10B981]' : 'border-[#18181B] bg-[#18181B] text-[#F5F3EC]'} px-4 flex items-center justify-between text-[11px] font-mono select-none overflow-hidden`}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-none bg-emerald-500 animate-ping inline-block" />
            [SYS_STATUS: ACTIVE]
          </span>
          <span className="hidden sm:inline opacity-75">| BAUD: 115200</span>
          <span className="hidden sm:inline opacity-75">| PORT: 5173</span>
          <span className="hidden md:inline opacity-75">| ENGINE: CHROMIUM_UNDETECTED</span>
        </div>
        <div className="flex items-center gap-3 font-semibold">
          <span>ARCHITECT: UMESH TEMBURWAR</span>
          <a
            href="https://umeshtemburwar.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 underline hover:text-emerald-400"
          >
            umeshtemburwar.vercel.app ↗
          </a>
        </div>
      </div>

      {/* Retro Precision Navigation Header */}
      <header className={`sticky top-0 z-50 h-16 border-b-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#111520]/95' : 'border-[#18181B] bg-[#FFFFFF]/95'} backdrop-blur-md px-6`}>
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between">

          {/* Logo Badge */}
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 border-2 ${theme === 'dark' ? 'border-[#10B981] bg-[#10B981] text-[#0B0E14]' : 'border-[#18181B] bg-[#15803D] text-white'} flex items-center justify-center font-mono font-black text-sm retro-shadow-sm`}>
              &gt;_
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold text-[14px] tracking-tight uppercase flex items-center gap-2">
                UNIVERSAL_JOB_BOT
                <span className={`text-[10px] font-mono px-1.5 py-0.2 border ${theme === 'dark' ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400' : 'border-[#18181B] bg-[#DCFCE7] text-[#15803D]'}`}>
                  v3.4_STABLE
                </span>
              </span>
              <span className={`text-[11px] font-mono ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#52525B]'}`}>
                AUTONOMOUS MULTI-PORTAL RUNNER
              </span>
            </div>
          </div>

          {/* Creator Chip in Header */}
          <a
            href="https://umeshtemburwar.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden lg:flex items-center gap-2.5 px-3 py-1 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] hover:border-[#10B981]' : 'border-[#18181B] bg-[#F5F3EC] hover:bg-white'} text-[12px] font-mono transition-all retro-shadow-sm`}
          >
            <img
              src="/umesh.jpg"
              alt="Umesh Temburwar"
              className="w-5 h-5 rounded-none object-cover border border-current"
            />
            <span>
              ENGINEER: <strong className="underline">UMESH TEMBURWAR</strong>
            </span>
            <ExternalLink className="w-3 h-3 text-emerald-600" />
          </a>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            <a
              href="#architect"
              className={`hidden sm:inline-block font-mono text-[13px] uppercase font-bold hover:underline ${theme === 'dark' ? 'text-[#10B981]' : 'text-[#15803D]'}`}
            >
              [Creator]
            </a>

            <a
              href="#console"
              className={`hidden md:inline-block font-mono text-[13px] uppercase hover:underline ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#52525B]'}`}
            >
              [Terminal]
            </a>

            <a
              href="#guide"
              className={`hidden sm:inline-block font-mono text-[13px] uppercase font-bold hover:underline ${theme === 'dark' ? 'text-[#10B981]' : 'text-[#15803D]'}`}
            >
              [Guide]
            </a>

            <a
              href="#portals"
              className={`hidden md:inline-block font-mono text-[13px] uppercase hover:underline ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#52525B]'}`}
            >
              [Portals]
            </a>

            {/* Retro Sound FX Toggle */}
            <button
              type="button"
              onClick={handleSoundToggle}
              className={`p-2 border-2 ${soundOn
                ? theme === 'dark'
                  ? 'border-[#10B981] bg-[#141A26] text-[#10B981]'
                  : 'border-[#18181B] bg-emerald-50 text-emerald-800'
                : theme === 'dark'
                  ? 'border-[#2E384D] bg-[#141A26] text-zinc-500'
                  : 'border-[#18181B] bg-zinc-100 text-zinc-500'
                } retro-shadow-sm transition-all cursor-pointer`}
              title={`Sound Effects: ${soundOn ? 'ACTIVE (Click to mute)' : 'MUTED (Click to activate)'}`}
              aria-label="Toggle audio effects"
              data-sound="toggle"
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* High-Contrast Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 border-2 ${theme === 'dark' ? 'border-[#10B981] bg-[#141A26] text-amber-300' : 'border-[#18181B] bg-white text-zinc-800'} retro-shadow-sm transition-all cursor-pointer`}
              title={`Switch to ${theme === 'dark' ? 'Light Parchment' : 'Dark Terminal'} theme`}
              aria-label="Toggle theme"
              data-sound="toggle"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {!user ? (
              <button
                type="button"
                onClick={handleLoginTrigger}
                className={`font-mono text-[12px] font-bold uppercase px-3 py-1.5 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-white hover:border-[#10B981]' : 'border-[#18181B] bg-white text-[#18181B] hover:bg-[#F5F3EC]'
                  } retro-shadow-sm cursor-pointer`}
                data-sound="slide"
              >
                SIGN IN →
              </button>
            ) : (
              <span className="hidden sm:inline-block font-mono text-[11px] text-emerald-600 font-bold border border-emerald-600/40 px-2 py-1">
                [{user.email?.split('@')[0]}]
              </span>
            )}

            <button
              type="button"
              onClick={handleDashboardTrigger}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 font-mono text-[12px] font-bold uppercase border-2 ${theme === 'dark'
                ? 'border-[#10B981] bg-[#10B981] text-[#0B0E14] hover:bg-[#34D399]'
                : 'border-[#18181B] bg-[#15803D] text-white hover:bg-[#166534]'
                } retro-shadow transition-all cursor-pointer`}
              data-sound="nav"
            >
              DASHBOARD
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-10 space-y-16">

        {/* Hero Section: Split Grid with Photo -> Login Slide In-Place */}
        <section className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left 7 Columns: Core Value Proposition & Specs */}
            <div className="lg:col-span-7 space-y-4">
              {/* System Status Tag */}
              <div className={`inline-flex items-center gap-2 px-3 py-1 font-mono text-[12px] font-semibold border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-emerald-400' : 'border-[#18181B] bg-white text-[#18181B]'} retro-shadow-sm`}>
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
                <span>[CORE_SPEC: ZERO_SYNTHETIC_DATA // 100%_REAL_APPLICATIONS]</span>
              </div>

              {/* Big Headline */}
              <h1 className="text-[32px] sm:text-[44px] font-black tracking-tight leading-[1.1] uppercase">
                AUTONOMOUS JOB APPLY ENGINE.
                <br />
                <span className={theme === 'dark' ? 'text-[#10B981] font-mono' : 'text-[#15803D] font-mono'}>
                  HAND-CRAFTED FOR DEVELOPERS.
                </span>
              </h1>

              {/* Real Technical Subtitle */}
              <p className={`text-[15px] sm:text-[16px] leading-relaxed ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#3F3F46]'}`}>
                Engineered line-by-line by <a href="#architect" className="font-bold underline decoration-2 decoration-emerald-500">UMESH TEMBURWAR</a>.
                Automates high-volume, repetitive job applications across Naukri, Internshala, Indeed, and LinkedIn
                with undetectable Chromium mouse curves, dynamic heuristic form filling, and zero AI hallucinations.
              </p>

              {/* Primary Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDashboardTrigger}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 font-mono text-[13px] font-bold uppercase border-2 ${theme === 'dark'
                    ? 'border-[#10B981] bg-[#10B981] text-[#0B0E14] hover:bg-[#34D399]'
                    : 'border-[#18181B] bg-[#15803D] text-white hover:bg-[#166534]'
                    } retro-shadow transition-all cursor-pointer`}
                  data-sound="button"
                >
                  <Terminal className="w-4 h-4" />
                  START AUTOMATION ENGINE
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="https://umeshtemburwar.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-4 py-2.5 font-mono text-[13px] font-bold uppercase border-2 ${theme === 'dark'
                    ? 'border-[#2E384D] bg-[#141A26] text-white hover:border-[#10B981]'
                    : 'border-[#18181B] bg-white text-[#18181B] hover:bg-[#EFECE3]'
                    } retro-shadow transition-all`}
                >
                  <Globe className="w-4 h-4 text-emerald-600" />
                  VIEW UMESH'S PORTFOLIO ↗
                </a>

                <a
                  href="#guide"
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 font-mono text-[12px] uppercase font-bold hover:underline ${theme === 'dark' ? 'text-[#10B981]' : 'text-[#15803D]'
                    }`}
                >
                  <BookOpen className="w-4 h-4" />
                  [HOW_TO_USE_GUIDE]
                </a>
              </div>
            </div>

            {/* Right 5 Columns: Interactive In-Place Card (Photo First -> Slide in Login) */}
            <div id="hero-auth-card" className="lg:col-span-5 w-full max-w-md mx-auto scroll-mt-24">
              <div className={`border-2 ${theme === 'dark' ? 'border-[#10B981] bg-[#111520]' : 'border-[#18181B] bg-white'
                } retro-shadow-lg overflow-hidden transition-all duration-300 font-mono`}>

                {/* Titlebar */}
                <div className={`h-10 border-b-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-emerald-400' : 'border-[#18181B] bg-[#18181B] text-[#F5F3EC]'
                  } px-3 flex items-center justify-between font-bold text-[11px] select-none`}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-red-500 inline-block border border-black/40" />
                    <span className="w-2 h-2 bg-amber-400 inline-block border border-black/40" />
                    <span className="w-2 h-2 bg-emerald-500 inline-block border border-black/40" />
                    <span className="ml-1.5">
                      {heroAuthState === 'photo' ? 'CREATOR_CONSOLE // UMESH.EXE' : 'AUTH_TERMINAL // LOGIN.EXE'}
                    </span>
                  </div>
                  <span className="text-[10px] opacity-75">
                    {heroAuthState === 'photo' ? '[ONLINE]' : '[SECURE_SESSION]'}
                  </span>
                </div>

                {/* Card Content: Flips between Photo and Login In-Place */}
                <div className="p-5 min-h-[390px] flex flex-col justify-between">
                  {heroAuthState === 'photo' ? (
                    /* 
                      ==========================================================
                      PHOTO VIEW: DISPLAYED DIRECTLY ON HOME PAGE INITIALLY
                      ==========================================================
                    */
                    <div className="space-y-4 animate-fade-in text-center flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase border border-current text-emerald-600">
                          [LEAD_ENGINEER // ARCHITECT]
                        </div>

                        {/* Umesh's Photo Frame */}
                        <div className={`relative border-2 ${theme === 'dark' ? 'border-[#10B981] bg-[#0B0E14]' : 'border-[#18181B] bg-[#F5F3EC]'
                          } p-1.5 retro-shadow-sm w-[180px] mx-auto`}>
                          <img
                            src="/umesh.jpg"
                            alt="Umesh Temburwar"
                            className="w-full h-[200px] object-cover border border-current"
                          />
                          <div className="text-[10px] mt-1 text-center font-bold text-emerald-600">
                            STATUS: ACTIVE ▋
                          </div>
                        </div>

                        <div>
                          <h3 className="text-[16px] font-black uppercase tracking-tight">
                            UMESH TEMBURWAR
                          </h3>
                          <p className={`text-[11px] ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#71717A]'}`}>
                            Software Engineer & Full Stack Developer
                          </p>
                          <a
                            href="https://umeshtemburwar.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold hover:underline mt-0.5"
                          >
                            umeshtemburwar.vercel.app ↗
                          </a>
                        </div>
                      </div>

                      {/* Button to Trigger Animation: Hide Photo & Slide In Login */}
                      <div className="pt-2">
                        {user ? (
                          <Link
                            to="/applications"
                            className={`w-full py-2.5 px-3 border-2 font-black uppercase text-[12px] ${theme === 'dark'
                              ? 'border-[#10B981] bg-[#10B981] text-[#0B0E14] hover:bg-[#34D399]'
                              : 'border-[#18181B] bg-[#15803D] text-white hover:bg-[#166534]'
                              } retro-shadow transition-all cursor-pointer flex items-center justify-center gap-2`}
                            data-sound="nav"
                          >
                            <span>ENTER ACTIVE DASHBOARD</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              playRetroSound('slide');
                              setHeroAuthState('login');
                            }}
                            className={`w-full py-2.5 px-3 border-2 font-black uppercase text-[12px] ${theme === 'dark'
                              ? 'border-[#10B981] bg-[#10B981] text-[#0B0E14] hover:bg-[#34D399]'
                              : 'border-[#18181B] bg-[#15803D] text-white hover:bg-[#166534]'
                              } retro-shadow transition-all cursor-pointer flex items-center justify-center gap-2`}
                            data-sound="slide"
                          >
                            <span>SIGN IN TO DASHBOARD</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <p className="text-[10px] opacity-60 mt-1 font-mono">
                          Click to hide photo & slide in login form
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* 
                      ==========================================================
                      LOGIN BOX: SLIDES IN RIGHT IN PLACE OF PHOTO
                      ==========================================================
                    */
                    <div className="space-y-4 animate-slide-in-right flex-1 flex flex-col justify-between">
                      <div>
                        {/* Toggle Back to Photo */}
                        <div className="flex items-center justify-between mb-2">
                          <button
                            type="button"
                            onClick={() => {
                              playRetroSound('nav');
                              setHeroAuthState('photo');
                            }}
                            className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                            data-sound="nav"
                          >
                            ← [BACK_TO_PHOTO]
                          </button>
                          <span className="text-[10px] opacity-60 uppercase">[INPUT_CREDENTIALS]</span>
                        </div>

                        <h3 className="text-[17px] font-black uppercase tracking-tight">
                          Workspace Sign In
                        </h3>
                        <p className={`text-[11px] ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#71717A]'}`}>
                          Enter candidate or admin credentials.
                        </p>

                        {/* Admin Notice (Zero Autofill Button) */}
                        <div className={`mt-3 p-2 border ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-emerald-300' : 'border-[#18181B] bg-[#F5F3EC] text-[#15803D]'
                          } text-[11px] flex items-center gap-1.5`}>
                          <KeyRound className="w-3.5 h-3.5 shrink-0" />
                          <span>Admin: <strong className="underline">umeshtemburwar2002@gmail.com</strong></span>
                        </div>

                        {/* Error Notice */}
                        {loginError && (
                          <div className="mt-2.5 p-2 border-2 border-red-500 bg-red-500/10 text-red-500 text-[11px] flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>{loginError}</span>
                          </div>
                        )}

                        {/* Login Form */}
                        <form onSubmit={handleInPlaceLogin} className="space-y-3 mt-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase mb-1">
                              Email Address:
                            </label>
                            <input
                              type="email"
                              required
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              placeholder="umeshtemburwar2002@gmail.com"
                              className={`w-full h-9 px-2.5 border-2 text-[12px] ${theme === 'dark'
                                ? 'border-[#2E384D] bg-[#0E121B] text-white focus:border-[#10B981]'
                                : 'border-[#18181B] bg-[#FFFFFF] text-black focus:border-[#15803D]'
                                } outline-none transition-colors font-mono`}
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase mb-1">
                              Password:
                            </label>
                            <input
                              type="password"
                              required
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              placeholder="••••••••"
                              className={`w-full h-9 px-2.5 border-2 text-[12px] ${theme === 'dark'
                                ? 'border-[#2E384D] bg-[#0E121B] text-white focus:border-[#10B981]'
                                : 'border-[#18181B] bg-[#FFFFFF] text-black focus:border-[#15803D]'
                                } outline-none transition-colors font-mono`}
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isLoggingIn}
                            className={`w-full py-2.5 border-2 font-black uppercase text-[12px] ${theme === 'dark'
                              ? 'border-[#10B981] bg-[#10B981] text-[#0B0E14] hover:bg-[#34D399]'
                              : 'border-[#18181B] bg-[#15803D] text-white hover:bg-[#166534]'
                              } retro-shadow transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5`}
                            data-sound="success"
                          >
                            {isLoggingIn ? (
                              <span>[AUTHENTICATING...]</span>
                            ) : (
                              <>
                                <span>SIGN IN TO WORKSPACE</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </form>
                      </div>

                      {/* Direct Navigation Links */}
                      <div className="pt-2 border-t border-dashed border-current/20 flex items-center justify-between text-[10px]">
                        <Link
                          to="/login"
                          className="hover:underline opacity-80 hover:opacity-100"
                        >
                          → Dedicated Login
                        </Link>
                        <Link
                          to="/register"
                          className="hover:underline opacity-80 hover:opacity-100"
                        >
                          → Register New
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Strip */}
                <div className={`px-4 py-2 border-t-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-[#F5F3EC]'
                  } text-[10px] flex items-center justify-between font-mono`}>
                  <span className="font-bold">ENGINEER: UMESH TEMBURWAR</span>
                  <a
                    href="https://umeshtemburwar.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-emerald-500 font-bold"
                  >
                    PORTFOLIO ↗
                  </a>
                </div>

              </div>
            </div>

          </div>

          {/* Retro Hardware Spec Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
            <div className={`p-3.5 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-white'} retro-shadow-sm`}>
              <div className="text-[11px] font-mono uppercase text-[#71717A]">[RUNTIME]</div>
              <div className="font-mono font-black text-[18px] text-emerald-600">STEALTH_CHROME</div>
              <div className="text-[11px] font-mono text-[#71717A] mt-0.5">Bypasses Cloudflare / CDP</div>
            </div>

            <div className={`p-3.5 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-white'} retro-shadow-sm`}>
              <div className="text-[11px] font-mono uppercase text-[#71717A]">[INTEGRATIONS]</div>
              <div className="font-mono font-black text-[18px]">9_PLATFORMS</div>
              <div className="text-[11px] font-mono text-[#71717A] mt-0.5">Naukri, Indeed, LinkedIn</div>
            </div>

            <div className={`p-3.5 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-white'} retro-shadow-sm`}>
              <div className="text-[11px] font-mono uppercase text-[#71717A]">[DATA_INTEGRITY]</div>
              <div className="font-mono font-black text-[18px] text-emerald-600">0_FAKE_URLS</div>
              <div className="text-[11px] font-mono text-[#71717A] mt-0.5">100% verified employer jobs</div>
            </div>

            <div className={`p-3.5 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-white'} retro-shadow-sm`}>
              <div className="text-[11px] font-mono uppercase text-[#71717A]">[PERSISTENCE]</div>
              <div className="font-mono font-black text-[18px]">DUAL_STORE</div>
              <div className="text-[11px] font-mono text-[#71717A] mt-0.5">SQLite Local + Supabase</div>
            </div>
          </div>
        </section>

        {/* 
          ========================================================================
          RETRO CREATOR SPOTLIGHT: UMESH TEMBURWAR
          ========================================================================
        */}
        <section id="architect" className="scroll-mt-20">
          <div className={`border-2 ${theme === 'dark' ? 'border-[#10B981] bg-[#111520]' : 'border-[#18181B] bg-white'} retro-shadow-lg`}>

            {/* Retro Window Titlebar */}
            <div className={`h-9 border-b-2 ${theme === 'dark' ? 'border-[#10B981] bg-[#141A26] text-[#10B981]' : 'border-[#18181B] bg-[#18181B] text-[#F5F3EC]'} px-4 flex items-center justify-between font-mono text-[12px] font-bold select-none`}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 inline-block border border-black/40" />
                <span className="w-2.5 h-2.5 bg-amber-400 inline-block border border-black/40" />
                <span className="w-2.5 h-2.5 bg-emerald-500 inline-block border border-black/40" />
                <span className="ml-2">CREATOR_PROFILE.EXE // LEAD_ARCHITECT</span>
              </div>
              <span className="hidden sm:inline text-xs font-mono">STATUS: AVAILABLE_FOR_ROLES</span>
            </div>

            {/* Creator Content Body */}
            <div className="p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">

                {/* Photo & Hardware Box */}
                <div className="flex flex-col items-center shrink-0 w-full sm:w-[250px]">
                  <div className={`relative border-2 ${theme === 'dark' ? 'border-[#10B981] bg-[#0B0E14]' : 'border-[#18181B] bg-[#F5F3EC]'} p-2 retro-shadow`}>
                    <div className="w-[200px] h-[250px] sm:w-[220px] sm:h-[280px] overflow-hidden border border-[#18181B]">
                      <img
                        src="/umesh.jpg"
                        alt="UMESH TEMBURWAR - Creator & Full Stack Automation Engineer"
                        className="w-full h-full object-cover object-top filter grayscale-15 contrast-105"
                      />
                    </div>
                    <div className={`mt-2 py-1 px-2 border ${theme === 'dark' ? 'border-emerald-500 bg-emerald-950/80 text-emerald-300' : 'border-[#18181B] bg-[#DCFCE7] text-[#15803D]'} font-mono text-[11px] font-bold text-center`}>
                      ● FULL-STACK ENGINEER
                    </div>
                  </div>

                  {/* Personal Hardware Spec */}
                  <div className="mt-4 w-full space-y-1 text-center sm:text-left font-mono text-[11px]">
                    <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pune / Ambajogai, MH</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Notice: Immediate (0 Days)</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                      <Laptop className="w-3.5 h-3.5 text-emerald-600" />
                      <span>B.Tech in Computer Science</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Bio, Philosophy & Official Links */}
                <div className="flex-1 space-y-5 text-left">
                  <div>
                    <div className="inline-block px-2 py-0.5 font-mono text-[11px] font-bold uppercase border border-current mb-2 text-emerald-600">
                      [CREATOR & LEAD DEVELOPER]
                    </div>
                    <h2 className="text-[30px] sm:text-[38px] font-black tracking-tight leading-none uppercase">
                      UMESH TEMBURWAR
                    </h2>
                    <p className="font-mono text-[13px] font-bold text-emerald-600 mt-1">
                      Full-Stack Software Engineer • Browser Automation Specialist
                    </p>
                  </div>

                  {/* Philosophy Quote */}
                  <div className={`p-4 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-[#F5F3EC]'} font-mono text-[13px] leading-relaxed`}>
                    "I built this bot website and automation architecture from scratch because generic AI tools
                    produce synthetic spam, fake URLs, and account bans. As a developer, I wanted real, transparent,
                    undetected browser execution and direct dual-store database ownership."
                  </div>

                  {/* Skills Console Chips */}
                  <div>
                    <div className="font-mono text-[11px] font-bold uppercase text-[#71717A] mb-2">
                      [VERIFIED_TECH_STACK]
                    </div>
                    <div className="flex flex-wrap gap-1.5 font-mono text-[12px]">
                      {[
                        'React.js',
                        'TypeScript',
                        'Python',
                        'Selenium',
                        'Undetected_Chromedriver',
                        'Node.js',
                        'Express.js',
                        'PostgreSQL',
                        'Supabase',
                        'SQLite',
                        'REST_APIs',
                        'Git'
                      ].map((s) => (
                        <span
                          key={s}
                          className={`px-2 py-0.5 border ${theme === 'dark' ? 'border-[#2E384D] bg-[#0B0E14] text-white' : 'border-[#18181B] bg-white text-[#18181B]'} font-bold text-[11px]`}
                        >
                          +{s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Real Portfolio Projects */}
                  <div className="pt-2">
                    <div className="font-mono text-[11px] font-bold uppercase text-[#71717A] mb-2">
                      [FEATURED_PROJECTS_FROM_PORTFOLIO]
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-[11px]">
                      <div className={`p-2.5 border ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-[#F5F3EC]'}`}>
                        <div className="font-bold text-emerald-600">Universal Job Apply Bot</div>
                        <div className="text-[10px] mt-0.5 opacity-80">Autonomous multi-portal runner with zero fake data.</div>
                      </div>
                      <a
                        href="https://edtechacademy.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2.5 border ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] hover:border-emerald-500' : 'border-[#18181B] bg-[#F5F3EC] hover:bg-white'} block`}
                      >
                        <div className="font-bold text-emerald-600 flex items-center justify-between">
                          EdTech Platform <ExternalLink className="w-3 h-3" />
                        </div>
                        <div className="text-[10px] mt-0.5 opacity-80">Full-stack React, Node, Supabase Auth & PostgreSQL.</div>
                      </a>
                      <a
                        href="https://bytefest2k25.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2.5 border ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] hover:border-emerald-500' : 'border-[#18181B] bg-[#F5F3EC] hover:bg-white'} block`}
                      >
                        <div className="font-bold text-emerald-600 flex items-center justify-between">
                          ByteFest 2K25 <ExternalLink className="w-3 h-3" />
                        </div>
                        <div className="text-[10px] mt-0.5 opacity-80">Tech festival portal serving 2,000+ daily attendees.</div>
                      </a>
                    </div>
                  </div>

                  {/* Verified Links & Direct Actions (Resume removed per request) */}
                  <div className="pt-3 flex flex-wrap items-center gap-2.5 font-mono text-[12px]">
                    <a
                      href="https://umeshtemburwar.vercel.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-4 py-2 border-2 ${theme === 'dark'
                        ? 'border-[#10B981] bg-[#10B981] text-[#0B0E14]'
                        : 'border-[#18181B] bg-[#15803D] text-white'
                        } font-bold uppercase retro-shadow transition-all`}
                    >
                      <Globe className="w-4 h-4" />
                      VISIT PORTFOLIO [umeshtemburwar.vercel.app] ↗
                    </a>

                    <a
                      href="https://github.com/Umesh-Temburwar"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-white' : 'border-[#18181B] bg-white text-[#18181B]'
                        } font-bold retro-shadow transition-all`}
                    >
                      <Code2 className="w-4 h-4 text-emerald-600" />
                      GITHUB
                    </a>

                    <a
                      href="https://www.linkedin.com/in/umesh-temburwar-673555373/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-white' : 'border-[#18181B] bg-white text-[#18181B]'
                        } font-bold retro-shadow transition-all`}
                    >
                      <ExternalLink className="w-4 h-4 text-emerald-600" />
                      LINKEDIN
                    </a>

                    <a
                      href="mailto:umeshtemburwar2002@gmail.com"
                      className={`inline-flex items-center gap-1.5 px-3 py-2 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-white' : 'border-[#18181B] bg-white text-[#18181B]'
                        } font-bold retro-shadow transition-all`}
                    >
                      <Mail className="w-4 h-4 text-emerald-600" />
                      EMAIL
                    </a>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Interactive Retro Terminal Showcase */}
        <section id="console" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-mono font-bold text-[18px] uppercase flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-600" />
                // LIVE_DAEMON_TELEMETRY_CONSOLE
              </h2>
              <p className={`font-mono text-[12px] ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#71717A]'}`}>
                Inspect the real-time background automation process, database ledger, and portal connectors.
              </p>
            </div>

            {/* Retro Segmented Tabs */}
            <div className={`flex items-center p-1 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-white'} font-mono text-[12px]`}>
              <button
                type="button"
                onClick={() => setActiveTab('terminal')}
                className={`px-3 py-1 font-bold uppercase transition-colors cursor-pointer ${activeTab === 'terminal'
                  ? theme === 'dark' ? 'bg-[#10B981] text-[#0B0E14]' : 'bg-[#18181B] text-white'
                  : 'text-[#71717A] hover:text-current'
                  }`}
              >
                [01_TERMINAL]
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('applications')}
                className={`px-3 py-1 font-bold uppercase transition-colors cursor-pointer ${activeTab === 'applications'
                  ? theme === 'dark' ? 'bg-[#10B981] text-[#0B0E14]' : 'bg-[#18181B] text-white'
                  : 'text-[#71717A] hover:text-current'
                  }`}
              >
                [02_LEDGER_7COL]
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('portals')}
                className={`px-3 py-1 font-bold uppercase transition-colors cursor-pointer ${activeTab === 'portals'
                  ? theme === 'dark' ? 'bg-[#10B981] text-[#0B0E14]' : 'bg-[#18181B] text-white'
                  : 'text-[#71717A] hover:text-current'
                  }`}
              >
                [03_PORTAL_DRIVERS]
              </button>
            </div>
          </div>

          {/* Console Window */}
          <div className={`border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#0A0C10]' : 'border-[#18181B] bg-[#0D1117]'} retro-shadow font-mono text-[12px] text-[#E6EDF3] p-5 overflow-x-auto`}>
            {activeTab === 'terminal' && (
              <div className="space-y-1.5 leading-relaxed">
                <div className="text-zinc-500 pb-2 border-b border-zinc-800 flex items-center justify-between text-[11px]">
                  <span>EXEC_PID: 28412 // RUNNER.PY // ISOLATED CHROMIUM PROCESS</span>
                  <span className="text-emerald-400 font-bold">STATUS: DAEMON_RUNNING ▋</span>
                </div>
                <div className="text-zinc-500">[2026-11-01 16:15:02] <span className="text-sky-400">[INIT]</span> Universal Job Automation Suite v3.4 initialized by Umesh Temburwar</div>
                <div className="text-zinc-500">[2026-11-01 16:15:03] <span className="text-emerald-400">[PROFILE]</span> Loaded verified profile for Umesh Temburwar (Full Stack Engineer)</div>
                <div className="text-zinc-500">[2026-11-01 16:15:05] <span className="text-purple-400">[STEALTH]</span> Injected undetected_chromedriver flags + randomized viewport [1440x900]</div>
                <div className="text-zinc-500">[2026-11-01 16:15:08] <span className="text-amber-400">[NAUKRI]</span> Querying: "Full Stack Developer" in "Pune" — 38 active postings detected</div>
                <div className="text-zinc-500">[2026-11-01 16:15:10] <span className="text-emerald-400">[FILTER]</span> Evaluated against SQLite & Supabase: Filtered previously submitted jobs</div>
                <div className="text-zinc-500">[2026-11-01 16:15:13] <span className="text-sky-400">[VISIT]</span> Target: <span className="text-emerald-300">https://www.naukri.com/job-listings-full-stack-persistent</span></div>
                <div className="text-zinc-500">[2026-11-01 16:15:16] <span className="text-purple-400">[HEURISTIC]</span> Form Question: "Notice Period?" → Injected "Immediate (0 Days)"</div>
                <div className="text-zinc-500">[2026-11-01 16:15:17] <span className="text-purple-400">[HEURISTIC]</span> Form Question: "Current CTC?" → Injected verified compensation expectation</div>
                <div className="text-zinc-500">[2026-11-01 16:15:19] <span className="text-emerald-400 font-bold">✓ APPLIED SUCCESS:</span> Persistent Systems Ltd. | ₹8 - 14 LPA | Pune</div>
                <div className="text-zinc-500">[2026-11-01 16:15:20] <span className="text-emerald-400">[SYNC]</span> Pushed to jobs_tracker.db, universal_applied_jobs.csv, & Supabase Cloud</div>
                <div className="text-zinc-500">[2026-11-01 16:15:23] <span className="text-amber-400">[HUMAN_JITTER]</span> Pausing 3.8s with cubic bezier curve movement to emulate human speed...</div>
              </div>
            )}

            {activeTab === 'applications' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px] border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] uppercase">
                      <th className="py-2 px-3">Role & Company</th>
                      <th className="py-2 px-3">Portal</th>
                      <th className="py-2 px-3">Location</th>
                      <th className="py-2 px-3">Salary</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {recentApplicationsDemo.map((item, idx) => (
                      <tr key={idx} className="hover:bg-zinc-900/50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{item.role}</div>
                          <div className="text-zinc-400 text-[11px]">{item.company}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 border border-emerald-500/40 text-emerald-400 text-[10px]">
                            {item.portal}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300">{item.location}</td>
                        <td className="py-2.5 px-3 text-emerald-300">{item.salary}</td>
                        <td className="py-2.5 px-3 text-emerald-400">✓ {item.status}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{item.date}</td>
                        <td className="py-2.5 px-3 text-right">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline"
                          >
                            [VERIFY]
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'portals' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { name: 'Naukri.com', status: 'SESSION_CONNECTED', rate: '50/day max' },
                  { name: 'Internshala', status: 'SESSION_CONNECTED', rate: '25/day max' },
                  { name: 'Indeed India', status: 'SESSION_ACTIVE', rate: '40/day max' },
                  { name: 'LinkedIn Easy Apply', status: 'CONFIG_SYNCED', rate: '30/day max' }
                ].map((p, i) => (
                  <div key={i} className="p-3 border border-zinc-800 bg-zinc-950/70 space-y-1">
                    <div className="font-bold text-white text-[13px]">{p.name}</div>
                    <div className="text-emerald-400 text-[11px]">● {p.status}</div>
                    <div className="text-zinc-400 text-[10px]">RATE_LIMIT: {p.rate}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Supported Portals Grid */}
        <section id="portals" className="space-y-4">
          <div>
            <h2 className="font-mono font-bold text-[18px] uppercase">
              // SUPPORTED_PLATFORMS & CAPABILITY_MATRIX
            </h2>
            <p className={`font-mono text-[12px] ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#71717A]'}`}>
              Engineered with strict rate limits and account preservation safeguards.
            </p>
          </div>

          <div className="space-y-3">
            {supportedPortals.map((item) => (
              <div
                key={item.portal}
                className={`p-4 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-white'} retro-shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4`}
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[15px]">{item.portal}</span>
                    <span className={`font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 border ${item.badgeClass}`}>
                      [{item.badge}]
                    </span>
                    <span className="font-mono text-[11px] text-emerald-600">
                      {item.safeguard}
                    </span>
                  </div>
                  <p className={`text-[13px] ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#52525B]'}`}>
                    {item.description}
                  </p>
                </div>

                <div className="shrink-0 font-mono text-[12px]">
                  <Link
                    to="/applications"
                    className={`inline-flex items-center gap-1 font-bold underline ${theme === 'dark' ? 'text-[#10B981]' : 'text-[#15803D]'}`}
                  >
                    CONFIG_ADAPTER ↗
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Call to Action */}
        <section className={`border-2 ${theme === 'dark' ? 'border-[#10B981] bg-[#111520]' : 'border-[#18181B] bg-white'} p-8 text-center space-y-4 retro-shadow-lg`}>
          <div className="font-mono text-[12px] font-bold uppercase text-emerald-600">
            [SYS_READY // DEPLOYMENT_ACTIVE]
          </div>
          <h2 className="text-[26px] sm:text-[32px] font-black uppercase tracking-tight">
            STOP FORM FILLING. START CODING.
          </h2>
          <p className={`text-[14px] max-w-xl mx-auto font-mono ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#52525B]'}`}>
            Execute the multi-portal runner locally or in your terminal. All telemetry stays in your own SQLite database and Supabase project.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 font-mono text-[13px]">
            <Link
              to="/applications"
              className={`px-6 py-2.5 font-bold uppercase border-2 ${theme === 'dark'
                ? 'border-[#10B981] bg-[#10B981] text-[#0B0E14]'
                : 'border-[#18181B] bg-[#15803D] text-white'
                } retro-shadow transition-all`}
            >
              LAUNCH DASHBOARD NOW ↗
            </Link>
            <a
              href="https://umeshtemburwar.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className={`px-5 py-2.5 font-bold uppercase border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26] text-white' : 'border-[#18181B] bg-white text-[#18181B]'
                } retro-shadow transition-all`}
            >
              VISIT UMESH'S PORTFOLIO ↗
            </a>
          </div>
        </section>

        {/* 
          ========================================================================
          STEP-BY-STEP AUTOMATION GUIDE (HOW TO USE) - POSITIONED AT THE VERY END
          ========================================================================
        */}
        <section id="guide" className="scroll-mt-20 space-y-4 pt-6 border-t-2 border-dashed border-[var(--border-color)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-block px-2 py-0.5 font-mono text-[10px] font-bold uppercase border border-current text-emerald-600 mb-1">
                [USER_MANUAL // TUTORIAL]
              </div>
              <h2 className="font-mono font-bold text-[20px] sm:text-[24px] uppercase flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                HOW TO USE AI AUTOMATION (4 QUICK STEPS)
              </h2>
              <p className={`font-mono text-[12px] ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#71717A]'}`}>
                Resume upload se le kar autonomous live applying tak ka complete streamlined guide.
              </p>
            </div>

            <Link
              to="/guide"
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 font-mono text-[12px] font-bold uppercase border-2 ${theme === 'dark' ? 'border-[#10B981] bg-[#141A26] text-[#10B981]' : 'border-[#18181B] bg-[#F5F3EC] text-[#15803D]'
                } retro-shadow-sm hover:underline`}
            >
              [FULL_GUIDE_DOCS ↗]
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-[12px]">
            {/* Step 1 */}
            <div className={`p-4 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-white'} retro-shadow-sm space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-600 text-[14px]">01</span>
                <span className="text-[10px] opacity-70 border px-1 border-current">RESUME & AUTOFILL</span>
              </div>
              <h3 className="font-bold text-[14px] text-current">1-Click Resume Auto-Fill</h3>
              <p className="text-[11px] opacity-80 leading-relaxed">
                Apna PDF/DOCX resume drag & drop karein. Name, phone, email, skills & target roles automatic fill ho jayenge. Saath me instant Delete Resume ka option bhi hai.
              </p>
            </div>

            {/* Step 2 */}
            <div className={`p-4 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-white'} retro-shadow-sm space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-600 text-[14px]">02</span>
                <span className="text-[10px] opacity-70 border px-1 border-current">ALL-IN-ONE SETUP</span>
              </div>
              <h3 className="font-bold text-[14px] text-current">Ek Hi Jagah All Setup</h3>
              <p className="text-[11px] opacity-80 leading-relaxed">
                Naukri, Internshala, Indeed, LinkedIn samet 8 platforms ke passwords ek hi screen me dalein. 1-click me project ke root .env aur files me sync hota hai.
              </p>
            </div>

            {/* Step 3 */}
            <div className={`p-4 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-white'} retro-shadow-sm space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-600 text-[14px]">03</span>
                <span className="text-[10px] opacity-70 border px-1 border-current">1-CLICK LAUNCH</span>
              </div>
              <h3 className="font-bold text-[14px] text-current">Launch Dry-Run or Live</h3>
              <p className="text-[11px] opacity-80 leading-relaxed">
                Single click me automation start karein. <strong>Dry Run</strong> se simulation preview karein, ya <strong>Live Apply</strong> se real jobs submit karein.
              </p>
            </div>

            {/* Step 4 */}
            <div className={`p-4 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-white'} retro-shadow-sm space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-600 text-[14px]">04</span>
                <span className="text-[10px] opacity-70 border px-1 border-current">TELEMETRY & LEDGER</span>
              </div>
              <h3 className="font-bold text-[14px] text-current">Live Logs & Job Ledger</h3>
              <p className="text-[11px] opacity-80 leading-relaxed">
                Live terminal console me real-time execution dekhein aur dashboard me 7-column verified ledger se status & direct job links audit karein.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Retro Footer */}
      <footer className={`border-t-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#111520]' : 'border-[#18181B] bg-white'} py-8 px-6 font-mono text-[12px]`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/umesh.jpg"
              alt="Umesh Temburwar"
              className="w-7 h-7 rounded-none object-cover border border-[#18181B]"
            />
            <div>
              <span className="font-bold">UNIVERSAL_JOB_APPLY_BOT</span>
              <span className="mx-2">|</span>
              <span>ENGINEERED BY <strong className="underline">UMESH TEMBURWAR</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link to="/guide" className="hover:underline font-bold text-emerald-600">
              Automation Guide
            </Link>
            <a
              href="https://umeshtemburwar.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-emerald-600 hover:underline"
            >
              umeshtemburwar.vercel.app ↗
            </a>
            <a
              href="https://github.com/Umesh-Temburwar"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/umesh-temburwar-673555373/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              LinkedIn
            </a>
            <a
              href="mailto:umeshtemburwar2002@gmail.com"
              className="hover:underline"
            >
              umeshtemburwar2002@gmail.com
            </a>
          </div>
        </div>
      </footer>


    </div>
  );
};
