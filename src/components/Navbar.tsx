import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Overview', path: '/', delay: '100ms' },
    { label: 'Projects & Bounties', path: '/projects', delay: '150ms' },
    { label: 'Leaderboard', path: '/leaderboard', delay: '200ms' },
    { label: 'Certificates', path: '/certificates', delay: '250ms' },
  ];

  return (
    <header className="w-full flex items-center justify-between px-4 sm:px-6 md:px-12 py-3 sm:py-4 md:py-6 relative z-50">
      {/* Brand Logo / Home -> / (Delay 0ms) */}
      <div
        className="animate-blur-fade-up flex items-center h-8 md:h-10 shrink-0"
        style={{ animationDelay: '0ms' }}
      >
        <Link
          to="/"
          className="text-xl md:text-2xl font-bold tracking-[0.15em] text-white hover:opacity-90 transition-opacity uppercase flex items-center gap-2"
        >
          <span>CAREERFORGE</span>
        </Link>
      </div>

      {/* Center Desktop Navigation Links */}
      <nav className="hidden lg:flex items-center gap-8">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `text-sm font-medium transition-colors animate-blur-fade-up ${
                isActive
                  ? 'text-white border-b-2 border-white pb-0.5'
                  : 'text-white/80 hover:text-white'
              }`
            }
            style={{ animationDelay: item.delay }}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Mobile Hamburger Toggle (visible only below lg, pinned to far right) */}
      <div className="lg:hidden flex items-center ml-auto">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="relative w-10 h-10 rounded-full liquid-glass flex items-center justify-center text-white animate-blur-fade-up cursor-pointer"
          style={{ animationDelay: '350ms' }}
          aria-label="Toggle Menu"
        >
          <Menu
            size={18}
            className={`transition-all duration-500 ease-out ${
              isMobileMenuOpen
                ? 'rotate-180 opacity-0 scale-50'
                : 'rotate-0 opacity-100 scale-100'
            }`}
          />
          <X
            size={18}
            className={`absolute transition-all duration-500 ease-out ${
              isMobileMenuOpen
                ? 'rotate-0 opacity-100 scale-100'
                : '-rotate-180 opacity-0 scale-50'
            }`}
          />
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-md transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Navigation Dropdown */}
      <div
        className={`lg:hidden fixed top-[72px] left-4 right-4 sm:left-6 sm:right-6 md:left-12 md:right-12 z-40 liquid-glass backdrop-blur-2xl bg-black/80 border border-white/15 shadow-2xl rounded-2xl p-5 transition-all duration-300 ease-out transform ${
          isMobileMenuOpen
            ? 'translate-y-0 opacity-100 pointer-events-auto scale-100'
            : '-translate-y-4 opacity-0 pointer-events-none scale-95'
        }`}
      >
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item, index) => (
            <NavLink
              key={`mobile-${item.path}`}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `py-3 px-4 rounded-xl font-medium text-base transition-all block ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold border border-white/20 shadow-md'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                } ${isMobileMenuOpen ? 'animate-slide-in' : ''}`
              }
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
