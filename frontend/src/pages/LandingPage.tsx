import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const LandingPage: React.FC = () => {
  const supportedPortals = [
    {
      portal: 'Naukri.com',
      automates: 'Multi-tab search, auto-apply, profile freshness, and keyword refreshes.',
    },
    {
      portal: 'Internshala.com',
      automates: 'Internship and job applications with resume question answering.',
    },
    {
      portal: 'Indeed.com',
      automates: 'Automated job application sequence with anti-detection pauses.',
    },
    {
      portal: 'LinkedIn.com',
      automates: 'Easy Apply engine wrapper and tracker sync.',
    },
    {
      portal: '9-Portal Engine',
      automates: 'Glassdoor, Shine, Foundit, TimesJobs, and Wellfound multi-portal integration.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] flex flex-col font-sans">
      {/* Top Bar */}
      <header className="h-14 border-b border-[#E5E5E5] bg-[#FFFFFF] px-6">
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between">
          <span className="font-bold text-[14px] text-[#111111]">
            Universal Job Apply Bot
          </span>
          <div className="flex items-center gap-5 text-[14px]">
            <Link
              to="/login"
              className="text-[#6B6B6B] hover:text-[#111111] transition-colors duration-150"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="text-[#166534] font-medium hover:underline transition-colors duration-150"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12">
        {/* Hero Section: Left-aligned */}
        <section className="mb-12">
          <h1 className="text-[28px] font-bold text-[#111111] tracking-tight leading-tight mb-3">
            Automate job applications across multiple portals
          </h1>
          <p className="text-[14px] text-[#6B6B6B] leading-relaxed max-w-2xl mb-6">
            Apply to open roles across major job platforms from a single interface. Configure your
            profile and search criteria once, then run background automation safely.
          </p>

          <div className="flex items-center gap-3">
            <Link to="/register">
              <Button variant="primary">Get Started</Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="secondary">Explore Live Demo Dashboard</Button>
            </Link>
            <Link
              to="/login"
              className="text-[14px] text-[#6B6B6B] hover:text-[#111111] transition-colors duration-150 ml-2"
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* Supported Portals Table */}
        <section className="mb-12">
          <h2 className="text-[16px] font-semibold text-[#111111] mb-3">
            Supported portals
          </h2>
          <div className="border border-[#E5E5E5] rounded-[6px] overflow-hidden bg-[#FFFFFF]">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                  <th className="py-2.5 px-4 font-medium text-[12px] text-[#6B6B6B] w-48">
                    Portal
                  </th>
                  <th className="py-2.5 px-4 font-medium text-[12px] text-[#6B6B6B]">
                    What it automates
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {supportedPortals.map((item) => (
                  <tr key={item.portal} className="hover:bg-[#FAFAFA] transition-colors duration-150">
                    <td className="py-2.5 px-4 font-medium text-[#111111]">
                      {item.portal}
                    </td>
                    <td className="py-2.5 px-4 text-[#6B6B6B]">
                      {item.automates}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-12">
          <h2 className="text-[16px] font-semibold text-[#111111] mb-3">
            How it works
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-[14px] text-[#6B6B6B]">
            <li>Add your resume and target job criteria.</li>
            <li>Select target portals and set daily application limits.</li>
            <li>Start a background automation run.</li>
            <li>Review status and responses in your dashboard.</li>
          </ol>
        </section>

        {/* Limits note in bordered box */}
        <section className="mb-12">
          <div className="border border-[#E5E5E5] rounded-[6px] p-4 bg-[#FFFFFF]">
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
              <strong className="text-[#111111] font-medium">Limits:</strong> CAPTCHA and OTP
              verifications are not bypassed. Each run follows rate limits of individual portals
              to keep accounts safe.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E5] bg-[#FFFFFF] py-4 px-6">
        <div className="max-w-5xl mx-auto text-[12px] text-[#6B6B6B]">
          Universal Job Apply Bot. Minimal automated job application tool.
        </div>
      </footer>
    </div>
  );
};
