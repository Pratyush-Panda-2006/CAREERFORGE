import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Compass,
  Code2,
  Trophy,
  Award,
  ChevronRight,
  GitBranch,
  ExternalLink,
  Shield,
  Scale,
} from 'lucide-react';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    {
      label: 'Overview',
      path: '/',
      description: 'Platform mission & ecosystem overview',
      icon: Compass,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10 border-amber-400/25',
      badge: null,
    },
    {
      label: 'Projects & Bounties',
      path: '/projects',
      description: '40 production-grade showcase templates',
      icon: Code2,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/10 border-cyan-400/25',
      badge: '40 APPS',
    },
    {
      label: 'Leaderboard',
      path: '/leaderboard',
      description: 'Live rankings by verified merged PRs',
      icon: Trophy,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10 border-emerald-400/25',
      badge: 'LIVE',
    },
    {
      label: 'Certificates',
      path: '/certificates',
      description: 'Verifiable open-source skill credentials',
      icon: Award,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10 border-purple-400/25',
      badge: 'VERIFIED',
    },
  ];

  // Automatically close mobile menu upon navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="w-full relative z-50">
      <div className="max-w-7xl mx-auto relative flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 sm:py-3.5">
        {/* Brand Logo on the Left */}
        <Link
          to="/"
          className="flex items-center transition-transform hover:scale-105 active:scale-95 duration-200 z-10 flex-shrink-0"
        >
          <img
            src="/logo-silver.png"
            alt="CARRERFORGE Logo"
            className="h-8 xs:h-9 sm:h-11 md:h-12 w-auto max-w-[150px] xs:max-w-[180px] sm:max-w-none object-contain drop-shadow-[0_2px_14px_rgba(255,255,255,0.18)]"
          />
        </Link>

        {/* Center Desktop Navigation Links (Visible on Large Screens) */}
        <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8 absolute left-1/2 -translate-x-1/2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `text-sm transition-all cursor-pointer py-1 whitespace-nowrap ${
                  isActive
                    ? 'text-white font-medium border-b-2 border-white pb-0.5'
                    : 'text-white/75 hover:text-white pb-0.5 border-b-2 border-transparent'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right side container (Mobile & Tablet Hamburger Toggle) */}
        <div className="flex items-center z-10">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden relative w-10 h-10 rounded-full liquid-glass flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-90 ${
              isMobileMenuOpen
                ? 'bg-white/20 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                : 'text-white/90 hover:text-white hover:border-white/25'
            }`}
            aria-label="Toggle Menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-xl transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile & Tablet Navigation Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed top-16 sm:top-18 left-3 right-3 sm:left-6 sm:right-6 z-50 liquid-glass backdrop-blur-3xl bg-black/95 border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] rounded-3xl p-4 sm:p-5 transition-all duration-300 ease-out animate-fade-rise"
          style={{ position: 'fixed' }}
        >
          {/* Drawer Header with Logo & Live Status */}
          <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
                Sprint Active • 60 Days
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              NAVIGATION
            </span>
          </div>

          {/* Navigation Items with rich design */}
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={`mobile-${item.path}`}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all duration-200 border ${
                      isActive
                        ? 'bg-white/15 border-white/30 text-white shadow-lg shadow-black/40'
                        : 'bg-white/[0.03] border-white/5 text-zinc-300 hover:bg-white/10 hover:border-white/15 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border flex-shrink-0 transition-transform group-hover:scale-105 ${item.bgColor}`}>
                          <Icon size={18} className={item.color} />
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold tracking-tight ${isActive ? 'text-white font-bold' : 'text-zinc-100 group-hover:text-white'}`}>
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300 border border-white/15">
                              {item.badge}
                            </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-light">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-zinc-500 group-hover:text-white transition-colors flex-shrink-0 pl-2">
                        <ChevronRight size={16} className="transform transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Quick Action & Community Links */}
          <div className="pt-3 mt-2.5 border-t border-white/10 flex flex-col gap-2">
            <a
              href="https://github.com/Pratyush-Panda-2006/CAREERFORGE"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-200 transition-all group"
            >
              <div className="flex items-center gap-2">
                <GitBranch size={14} className="text-emerald-400" />
                <span>Contribute on GitHub</span>
              </div>
              <ExternalLink size={12} className="text-zinc-400 group-hover:text-white transition-colors" />
            </a>

            {/* Quick Legal Links */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-400 pt-0.5">
              <Link
                to="/privacy"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors flex items-center justify-center gap-1.5 border border-white/5"
              >
                <Shield size={12} className="text-amber-400" />
                <span>Privacy</span>
              </Link>
              <Link
                to="/terms"
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded-lg hover:bg-white/5 hover:text-white transition-colors flex items-center justify-center gap-1.5 border border-white/5"
              >
                <Scale size={12} className="text-cyan-400" />
                <span>Terms</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
