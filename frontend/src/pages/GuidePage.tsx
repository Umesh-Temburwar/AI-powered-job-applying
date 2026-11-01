import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  AlertTriangle,
  Play,
  ShieldCheck,
  RefreshCw,
  Search
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const GuidePage: React.FC = () => {
  const { theme } = useTheme();
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      id: 1,
      title: '1-Click Resume Auto-Fill & Delete',
      tag: 'STEP_01',
      desc: 'Upload PDF/DOCX to auto-extract profile details, with instant physical file deletion option.'
    },
    {
      id: 2,
      title: 'Ek Hi Jagah All Setup (.env Sync)',
      tag: 'STEP_02',
      desc: 'Configure personal info, target roles, and credentials for all 8 platforms in one unified master screen.'
    },
    {
      id: 3,
      title: '1-Click Launch: Dry Run vs Live Auto-Apply',
      tag: 'STEP_03',
      desc: 'Verify job discovery with Dry Run simulation or execute live applications directly from the launcher.'
    },
    {
      id: 4,
      title: 'Anti-Detection & Rate Limits',
      tag: 'STEP_04',
      desc: 'Understand human bezier mouse curves, delays, and daily limits.'
    },
    {
      id: 5,
      title: 'Naukri Profile Freshness',
      tag: 'STEP_05',
      desc: 'Automate headline refresh to rank top 5% in recruiter search results.'
    },
    {
      id: 6,
      title: 'Application Ledger & Telemetry',
      tag: 'STEP_06',
      desc: 'Review verified applications across SQLite, CSV, and Supabase Cloud.'
    }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Top Banner */}
      <div className={`p-6 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#111520]' : 'border-[#18181B] bg-white'} retro-shadow`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-block px-2 py-0.5 font-mono text-[10px] font-bold uppercase border border-emerald-600 text-emerald-600 mb-1">
              [OFFICIAL_DOCUMENTATION // MANUAL]
            </div>
            <h1 className="text-[24px] sm:text-[28px] font-black uppercase tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-600" />
              AI Automation User Guide
            </h1>
            <p className={`font-mono text-[13px] ${theme === 'dark' ? 'text-[#A1A1AA]' : 'text-[#71717A]'}`}>
              Comprehensive manual: How to safely run autonomous job applications across all 4+ portals.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-[12px]">
            <Link
              to="/dashboard"
              className={`px-4 py-2 font-bold uppercase border-2 ${
                theme === 'dark'
                  ? 'border-[#10B981] bg-[#10B981] text-[#0B0E14]'
                  : 'border-[#18181B] bg-[#15803D] text-white'
              } retro-shadow transition-all`}
            >
              OPEN DASHBOARD ↗
            </Link>
          </div>
        </div>
      </div>

      {/* Step Navigation Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 font-mono text-[11px]">
        {steps.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveStep(s.id)}
            className={`p-2.5 text-left border-2 transition-all cursor-pointer ${
              activeStep === s.id
                ? theme === 'dark'
                  ? 'border-[#10B981] bg-[#141A26] text-[#10B981] retro-shadow-sm'
                  : 'border-[#18181B] bg-[#F5F3EC] text-[#15803D] retro-shadow-sm'
                : theme === 'dark'
                ? 'border-[#2E384D] bg-[#0B0E14] text-zinc-400 hover:text-white'
                : 'border-[#18181B] bg-white text-zinc-600 hover:bg-[#F5F3EC]'
            }`}
          >
            <div className="font-bold">{s.tag}</div>
            <div className="truncate font-semibold">{s.title.split(' ')[0]}...</div>
          </button>
        ))}
      </div>

      {/* Main Step Detail View */}
      <div className={`p-6 sm:p-8 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#111520]' : 'border-[#18181B] bg-white'} retro-shadow-lg space-y-6`}>
        
        {/* Step 1 */}
        {activeStep === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 border-b-2 border-current pb-3 font-mono">
              <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-xs">STEP 01</span>
              <h2 className="text-[20px] font-black uppercase">1-Click Resume Auto-Fill & File Management</h2>
            </div>

            <p className="text-[14px] leading-relaxed">
              Simply drag and drop your candidate resume (PDF or DOCX). The offline heuristic parser extracts your full name, contact numbers, primary email, technical skills, and target roles in under 1 second.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[12px]">
              <div className={`p-4 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-[#F5F3EC]'} space-y-2`}>
                <div className="font-bold text-emerald-600">[A] Target Keywords & Roles</div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  Go to <strong>Job Preferences</strong> tab. Enter your desired job titles (e.g. <code>Full Stack Developer, Software Engineer, Python Developer</code>). The bot searches these keywords sequentially across portals.
                </p>
              </div>

              <div className={`p-4 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-[#F5F3EC]'} space-y-2`}>
                <div className="font-bold text-emerald-600">[B] Location & Compensation</div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  Set your target cities (e.g. <code>Pune, Bangalore, Remote</code>), your expected CTC (e.g. <code>4.5 - 8 LPA</code>), and notice period (<code>Immediate / 0 Days</code>).
                </p>
              </div>
            </div>

            <div className="p-3 border border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono text-[12px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Heuristic Form Filling:</strong> When recruiters ask "What is your notice period?" or "Current CTC?", the bot automatically fills your configured values instead of halting.
              </span>
            </div>

            <div className="pt-2 flex justify-between font-mono text-[12px]">
              <Link to="/preferences" className="underline font-bold text-emerald-600">
                → Go to Job Preferences Page
              </Link>
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="font-bold underline cursor-pointer"
              >
                Next: Step 2 (Connect Portals) →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {activeStep === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 border-b-2 border-current pb-3 font-mono">
              <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-xs">STEP 02</span>
              <h2 className="text-[20px] font-black uppercase">Ek Hi Jagah All Setup (.env Direct Sync)</h2>
            </div>

            <p className="text-[14px] leading-relaxed">
              The bot operates directly on official job platforms. You need active sessions for each platform you want to automate:
            </p>

            <div className="space-y-3 font-mono text-[12px]">
              {[
                { name: 'Naukri.com', desc: 'Click "Connect" in Portal Connections on the Dashboard. It opens a browser window for official login. Once logged in, your session cookie is saved in user profile.' },
                { name: 'Internshala', desc: 'Authorize your Internshala account. The bot navigates to internship/job feeds, answers assessment questions, and auto-fills cover letters.' },
                { name: 'Indeed India', desc: 'Logs into Indeed to discover "Easily Apply" tagged listings. Session cookies keep you authenticated across automated runs.' },
                { name: 'LinkedIn', desc: 'Syncs credentials into config.yaml to power the Easy Apply automation wrapper with your targeted experience level.' }
              ].map((p, i) => (
                <div key={i} className={`p-3.5 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-[#F5F3EC]'}`}>
                  <div className="font-bold text-emerald-600 flex items-center justify-between">
                    <span>[{i+1}] {p.name}</span>
                    <span className="text-[10px] text-zinc-400">SESSION PERSISTENCE</span>
                  </div>
                  <p className="text-[11px] opacity-80 mt-1 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-3 border border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono text-[12px] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Password Safety:</strong> Your portal passwords are never saved on remote clouds. The automation uses isolated local browser sessions.
              </span>
            </div>

            <div className="pt-2 flex justify-between font-mono text-[12px]">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="font-bold underline cursor-pointer"
              >
                ← Back: Step 1
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="font-bold underline cursor-pointer"
              >
                Next: Step 3 (Dry Run vs Live) →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {activeStep === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 border-b-2 border-current pb-3 font-mono">
              <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-xs">STEP 03</span>
              <h2 className="text-[20px] font-black uppercase">Executing Dry Run vs Live Auto-Apply</h2>
            </div>

            <p className="text-[14px] leading-relaxed">
              When launching an automation run from the dashboard modal, you have two execution modes:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[12px]">
              <div className={`p-4 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-white'} space-y-2`}>
                <div className="font-bold text-sky-600 flex items-center gap-1.5">
                  <Search className="w-4 h-4" />
                  [MODE 1] Dry Run (Recommended First)
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  The bot searches all selected portals, finds genuine job matches, extracts company & salary details, and verifies form elements—<strong>without clicking final submit</strong>.
                </p>
                <div className="text-[10px] bg-sky-500/10 text-sky-600 p-2 border border-sky-500/30">
                  Status recorded as: <code>review_needed</code>. Perfect for testing keyword relevance.
                </div>
              </div>

              <div className={`p-4 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-white'} space-y-2`}>
                <div className="font-bold text-emerald-600 flex items-center gap-1.5">
                  <Play className="w-4 h-4" />
                  [MODE 2] Live Auto-Apply
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  The bot autonomously visits each verified vacancy, fills recruiter questions, attaches your resume, and completes the application.
                </p>
                <div className="text-[10px] bg-emerald-500/10 text-emerald-600 p-2 border border-emerald-500/30">
                  Status recorded as: <code>Applied</code>. Synced to SQLite, CSV, & Supabase.
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between font-mono text-[12px]">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="font-bold underline cursor-pointer"
              >
                ← Back: Step 2
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(4)}
                className="font-bold underline cursor-pointer"
              >
                Next: Step 4 (Anti-Detection) →
              </button>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {activeStep === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 border-b-2 border-current pb-3 font-mono">
              <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-xs">STEP 04</span>
              <h2 className="text-[20px] font-black uppercase">Anti-Detection & Safe Rate Limits</h2>
            </div>

            <p className="text-[14px] leading-relaxed">
              Unlike generic scrapers that spam thousands of requests and trigger account bans, this suite uses stealth human emulation designed by Umesh Temburwar:
            </p>

            <div className="space-y-2.5 font-mono text-[12px]">
              <div className={`p-3 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-[#F5F3EC]'}`}>
                <div className="font-bold text-emerald-600">[1] Cubic Bezier Mouse Curves</div>
                <div className="text-[11px] opacity-80 mt-0.5">Mouse movements do not snap directly. The bot generates realistic curved trajectories with randomized acceleration and deceleration.</div>
              </div>
              <div className={`p-3 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-[#F5F3EC]'}`}>
                <div className="font-bold text-emerald-600">[2] Undetected Driver Flags</div>
                <div className="text-[11px] opacity-80 mt-0.5">Masks <code>navigator.webdriver</code>, WebGL renderer signatures, and Chrome DevTools Protocol (CDP) markers.</div>
              </div>
              <div className={`p-3 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-[#F5F3EC]'}`}>
                <div className="font-bold text-emerald-600">[3] Strict Daily Application Limits</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  <strong>Naukri:</strong> 50 / day max | <strong>Internshala:</strong> 25 / day max | <strong>Indeed:</strong> 40 / day max | <strong>LinkedIn:</strong> 30 / day max.
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between font-mono text-[12px]">
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="font-bold underline cursor-pointer"
              >
                ← Back: Step 3
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(5)}
                className="font-bold underline cursor-pointer"
              >
                Next: Step 5 (Profile Freshness) →
              </button>
            </div>
          </div>
        )}

        {/* Step 5 */}
        {activeStep === 5 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 border-b-2 border-current pb-3 font-mono">
              <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-xs">STEP 05</span>
              <h2 className="text-[20px] font-black uppercase">Naukri Profile Freshness Daemon</h2>
            </div>

            <p className="text-[14px] leading-relaxed">
              Recruiters on Naukri sort candidates by <strong>"Recently Active / Profile Updated"</strong>. Candidates who updated their profile in the last 24 hours appear in the top 5% of searches.
            </p>

            <div className={`p-4 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-[#F5F3EC]'} font-mono text-[12px] space-y-2`}>
              <div className="font-bold text-emerald-600 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4" />
                How the Profile Freshness Daemon Works:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] opacity-80">
                <li>Bot launches an isolated headless session into your Naukri profile.</li>
                <li>Navigates to your resume headline and key skills section.</li>
                <li>Appends or toggles a minor punctuation/space or updates the timestamp.</li>
                <li>Saves the profile to refresh your recruiter freshness score.</li>
                <li>Can be triggered automatically or via CLI: <code>python Naukri-UpdateProfile.py</code>.</li>
              </ol>
            </div>

            <div className="pt-2 flex justify-between font-mono text-[12px]">
              <button
                type="button"
                onClick={() => setActiveStep(4)}
                className="font-bold underline cursor-pointer"
              >
                ← Back: Step 4
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(6)}
                className="font-bold underline cursor-pointer"
              >
                Next: Step 6 (Applications Ledger) →
              </button>
            </div>
          </div>
        )}

        {/* Step 6 */}
        {activeStep === 6 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 border-b-2 border-current pb-3 font-mono">
              <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold text-xs">STEP 06</span>
              <h2 className="text-[20px] font-black uppercase">Application Ledger & Telemetry (7 Columns)</h2>
            </div>

            <p className="text-[14px] leading-relaxed">
              Every single application submitted by the bot is stored with complete fidelity across three storage targets:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px]">
              <div className={`p-3 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-[#F5F3EC]'}`}>
                <div className="font-bold text-emerald-600">[A] SQLite Database</div>
                <div className="text-[10px] mt-1 opacity-80">Stored in <code>jobs_tracker.db</code> on your local disk. Never loses state offline.</div>
              </div>

              <div className={`p-3 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-[#F5F3EC]'}`}>
                <div className="font-bold text-emerald-600">[B] Universal CSV</div>
                <div className="text-[10px] mt-1 opacity-80">Exported to <code>universal_applied_jobs.csv</code> with 8 standardized columns.</div>
              </div>

              <div className={`p-3 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#141A26]' : 'border-[#18181B] bg-[#F5F3EC]'}`}>
                <div className="font-bold text-emerald-600">[C] Supabase Cloud</div>
                <div className="text-[10px] mt-1 opacity-80">Synchronized to <code>public.applications</code> for live web dashboard viewing.</div>
              </div>
            </div>

            <div className={`p-4 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#0A0C10]' : 'border-[#18181B] bg-[#F5F3EC]'} font-mono text-[11px]`}>
              <div className="font-bold mb-1">Standardized Ledger Columns:</div>
              <div className="text-emerald-600 font-bold">
                Role & Company | Portal | Location | Salary | Status | Date | Details
              </div>
              <div className="text-[10px] opacity-70 mt-1">
                Zero fake synthetic URLs. Every row has a real, clickable job link directly to the vacancy.
              </div>
            </div>

            <div className="pt-2 flex justify-between font-mono text-[12px]">
              <button
                type="button"
                onClick={() => setActiveStep(5)}
                className="font-bold underline cursor-pointer"
              >
                ← Back: Step 5
              </button>
              <Link to="/dashboard" className="font-bold underline text-emerald-600">
                Ready! Open Dashboard & Start Run →
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Troubleshooting Section */}
      <div className={`p-6 border-2 ${theme === 'dark' ? 'border-[#2E384D] bg-[#111520]' : 'border-[#18181B] bg-white'} retro-shadow font-mono text-[12px] space-y-3`}>
        <div className="font-bold text-[14px] uppercase text-amber-600 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" />
          // TROUBLESHOOTING & COMMON QUESTIONS
        </div>
        <div className="space-y-2 opacity-90 text-[11px]">
          <div>
            <strong>Q: What happens if a portal asks for OTP or CAPTCHA?</strong>
            <p className="opacity-80">A: The bot pauses execution and waits. You can solve the captcha in the open browser window, and the bot will automatically detect completion and resume applying.</p>
          </div>
          <div>
            <strong>Q: Does this bot create dummy/synthetic application links?</strong>
            <p className="opacity-80">A: No. The synthetic generator was completely purged. Only genuine job postings discovered during live search are recorded.</p>
          </div>
          <div>
            <strong>Q: Can I run this from CLI terminal as well as the web UI?</strong>
            <p className="opacity-80">A: Yes. You can run <code>python Universal_Job_Auto_Apply.py</code> in your terminal, or click "Start Run" on the Web Dashboard.</p>
          </div>
        </div>
      </div>

    </div>
  );
};
