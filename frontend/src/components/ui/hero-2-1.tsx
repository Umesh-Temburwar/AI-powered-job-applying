"use client";

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Menu,
  X,
  Zap,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Briefcase,
  Terminal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Hero2Props {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
}

export const Hero2: React.FC<Hero2Props> = ({
  title = "Automate Job Applications Across Top Portals Effortlessly",
  subtitle = "Apply to verified open roles across Naukri, Internshala, Indeed, LinkedIn, and more from a unified command center. Configure your preferences once, then run background automation safely.",
  badgeText = "Next-Gen Autonomous Job Applications",
  primaryCtaText = "Get Started Free",
  primaryCtaLink = "/register",
  secondaryCtaText = "Explore Live Demo Dashboard",
  secondaryCtaLink = "/dashboard",
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Dynamic gradient background glows */}
      <div className="pointer-events-none absolute -right-60 -top-10 z-0 flex flex-col items-end blur-2xl opacity-70">
        <div className="h-[12rem] w-[50rem] rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 blur-[5rem] opacity-60"></div>
        <div className="h-[14rem] w-[70rem] rounded-full bg-gradient-to-r from-indigo-700 via-purple-600 to-pink-600 blur-[6rem] opacity-40"></div>
        <div className="h-[10rem] w-[45rem] rounded-full bg-gradient-to-r from-cyan-600 to-emerald-500 blur-[5rem] opacity-50"></div>
      </div>
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>

      {/* Content container */}
      <div className="relative z-10 flex flex-col">
        {/* Navigation Bar */}
        <header className="container mx-auto px-4 sm:px-6 pt-6 pb-4">
          <nav className="flex items-center justify-between rounded-full border border-slate-800/80 bg-slate-900/60 px-5 py-3 backdrop-blur-xl shadow-lg shadow-black/20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 text-slate-950 font-black shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
                <Zap className="h-5 w-5 fill-slate-950 text-slate-950" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  Universal Job Apply Bot
                </span>
                <span className="text-[10px] text-slate-400 font-medium -mt-1 hidden sm:block">
                  Autonomous Multi-Portal Engine
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-7">
              <a
                href="#portals"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Supported Portals
              </a>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                How It Works
              </a>
              <a
                href="#safety"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Safety & Limits
              </a>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5"
              >
                <Briefcase className="h-4 w-4" />
                Live Dashboard
              </Link>
            </div>

            {/* Desktop Auth Actions */}
            <div className="hidden md:flex items-center space-x-3">
              <Link to="/login">
                <button
                  type="button"
                  className="rounded-full px-4 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Sign in
                </button>
              </Link>
              <Link to="/register">
                <button
                  type="button"
                  className="rounded-full bg-emerald-500 hover:bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition-all shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30"
                >
                  Get Started
                </button>
              </Link>
            </div>

            {/* Mobile menu hamburger button */}
            <button
              type="button"
              className="md:hidden p-2 text-slate-300 hover:text-white focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Menu className="h-6 w-6 text-white" />
              )}
            </button>
          </nav>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-4 top-20 z-50 rounded-2xl border border-slate-800 bg-slate-900/95 p-6 backdrop-blur-2xl shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-slate-950">
                    <Zap className="h-4 w-4 fill-slate-950 text-slate-950" />
                  </div>
                  <span className="font-semibold text-white">Universal Job Bot</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 flex flex-col space-y-4">
                <a
                  href="#portals"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-slate-200 hover:text-white text-base"
                >
                  <span>Supported Portals</span>
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                </a>
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-slate-200 hover:text-white text-base"
                >
                  <span>How It Works</span>
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                </a>
                <a
                  href="#safety"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-slate-200 hover:text-white text-base"
                >
                  <span>Safety & Compliance</span>
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                </a>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-emerald-400 hover:text-emerald-300 text-base font-medium"
                >
                  <span>Explore Live Dashboard</span>
                  <ArrowRight className="h-4 w-4 text-emerald-400" />
                </Link>

                <div className="pt-4 flex flex-col gap-2.5 border-t border-slate-800">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors font-medium text-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-colors text-sm shadow-md shadow-emerald-500/20"
                  >
                    Get Started Free
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Section Main Body */}
        <div className="container mx-auto mt-10 md:mt-16 px-4 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 backdrop-blur-md shadow-inner text-emerald-300 text-xs sm:text-sm font-medium mb-6"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{badgeText}</span>
            <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto max-w-4xl text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight text-white"
          >
            {title}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed font-normal"
          >
            {subtitle}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <Link to={primaryCtaLink} className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto h-12 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 px-8 text-base font-semibold text-slate-950 hover:from-emerald-400 hover:to-teal-300 transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>{primaryCtaText}</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link to={secondaryCtaLink} className="w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto h-12 rounded-full border border-slate-700 bg-slate-900/60 hover:bg-slate-800/80 px-8 text-base font-medium text-slate-200 hover:text-white transition-all backdrop-blur-md cursor-pointer"
              >
                {secondaryCtaText}
              </button>
            </Link>
          </motion.div>

          {/* Live System Preview Mockup Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative mx-auto mt-14 mb-16 w-full max-w-5xl text-left"
          >
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-purple-500/20 blur-xl opacity-75"></div>

            <div className="relative rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-2xl overflow-hidden">
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/70 px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono text-slate-400 flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                    universal-bot-daemon v2.4 — Live Automation Session
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-mono text-emerald-400 font-medium">RUNNING</span>
                </div>
              </div>

              {/* Window Body */}
              <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Portal Connectors */}
                <div className="lg:col-span-1 flex flex-col justify-between space-y-4 border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-6 lg:pb-0 lg:pr-6">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      Active Portal Connectors
                    </h3>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                          <span className="text-xs font-semibold text-white">Naukri</span>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          38 Applied
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                          <span className="text-xs font-semibold text-white">Internshala</span>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          24 Applied
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                          <span className="text-xs font-semibold text-white">Indeed</span>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          41 Applied
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                          <span className="text-xs font-semibold text-white">LinkedIn</span>
                        </div>
                        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                          19 Applied
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/20 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 font-medium">Daily Application Cap</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">122 / 150</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full w-[81%]"></div>
                    </div>
                  </div>
                </div>

                {/* Real-time Automation Activity Feed */}
                <div className="lg:col-span-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-cyan-400" />
                        Live Application Feed
                      </h3>
                      <span className="text-[11px] font-mono text-slate-500">Auto-refresh: 1s</span>
                    </div>

                    <div className="space-y-2 font-mono text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-slate-200">
                            <span className="text-emerald-400 font-semibold">[Naukri]</span> Applied to{" "}
                            <span className="text-white font-medium">Senior Software Engineer</span> at{" "}
                            <span className="text-slate-400">FinTech Labs (Bangalore)</span>
                          </p>
                          <span className="text-[10px] text-slate-500">24s ago • Matched 94% skills</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-slate-200">
                            <span className="text-emerald-400 font-semibold">[Indeed]</span> Multi-step application completed for{" "}
                            <span className="text-white font-medium">Full Stack Python Developer</span>
                          </p>
                          <span className="text-[10px] text-slate-500">1m ago • Answered experience questions</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5">
                        <Zap className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-slate-200">
                            <span className="text-cyan-400 font-semibold">[LinkedIn]</span> Easy Apply sent to{" "}
                            <span className="text-white font-medium">React / Node Tech Lead</span>
                          </p>
                          <span className="text-[10px] text-slate-500">3m ago • Remote / Hybrid</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/50 flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
                          Anti-detection cooldown active (28s random pause before next search)
                        </span>
                        <span className="font-semibold text-yellow-400">SAFE</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                      Encrypted credentials session verified
                    </span>
                    <Link
                      to="/dashboard"
                      className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                    >
                      Open Live Dashboard &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Hero2;
