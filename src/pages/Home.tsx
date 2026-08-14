import { Link } from 'react-router-dom';
import {
  Users,
  GitPullRequest,
  Award,
  Code2,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Star,
  ExternalLink,
  Flame,
  GitBranch,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="w-full relative z-10 flex flex-col gap-10 sm:gap-16 md:gap-24 px-4 sm:px-6 md:px-12 pt-2 sm:pt-6 pb-16">
      {/* SECTION 1: HERO SECTION */}
      <section className="pt-4 sm:pt-12 md:pt-16 lg:min-h-[65vh] flex flex-col justify-end">
        <div className="max-w-4xl">
          {/* Developer Metrics Row */}
          <div
            className="flex flex-wrap items-center gap-3 sm:gap-6 mb-6 md:mb-8 text-xs sm:text-sm text-white/90 animate-blur-fade-up font-mono"
            style={{ animationDelay: '300ms' }}
          >
            <div className="flex items-center gap-2 font-medium text-amber-300">
              <Users size={16} className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span>48+ Active Contributors</span>
            </div>
            <span className="text-white/30">•</span>
            <div className="flex items-center gap-2 text-gray-200">
              <GitPullRequest size={16} className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              <span>214 Merged PRs</span>
            </div>
            <span className="text-white/30">•</span>
            <div className="flex items-center gap-2 text-gray-200">
              <Award size={16} className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
              <span>18 Active Bounties</span>
            </div>
          </div>

          {/* Main Headline */}
          <h1
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-[-0.04em] mb-6 text-white leading-[1.05] animate-blur-fade-up"
            style={{ animationDelay: '400ms' }}
          >
            Step Through. Work Smarter.
          </h1>

          {/* Subtitle Copy */}
          <p
            className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 md:mb-12 max-w-3xl font-light leading-relaxed animate-blur-fade-up"
            style={{ animationDelay: '500ms' }}
          >
            Contribute to high-impact public repositories managed by CAREERFORGE. Earn points, climb the global leaderboard, and generate verifiable certificates.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 animate-blur-fade-up" style={{ animationDelay: '600ms' }}>
            <Link
              to="/projects"
              className="bg-white text-black rounded-full font-medium px-6 sm:px-8 py-3 sm:py-3.5 flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-lg active:scale-95 cursor-pointer text-sm sm:text-base"
            >
              <Code2 size={18} className="text-black" />
              <span>Browse Open Projects</span>
            </Link>

            <Link
              to="/leaderboard"
              className="rounded-full font-medium liquid-glass px-6 sm:px-8 py-3 sm:py-3.5 text-white flex items-center gap-2 hover:bg-white/10 transition-colors cursor-pointer text-sm sm:text-base"
            >
              <Trophy size={18} className="text-amber-400" />
              <span>View Leaderboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 2: FEATURED REPOSITORIES SPOTLIGHT */}
      <section className="max-w-7xl mx-auto w-full pt-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-mono text-amber-400 uppercase tracking-widest block mb-2">
              // FEATURED SHOWCASE TEMPLATES
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Featured Showcase Projects
            </h2>
          </div>
          <Link
            to="/projects"
            className="text-amber-400 hover:text-amber-300 text-sm font-medium flex items-center gap-1 transition-colors"
          >
            <span>View All 20 Showcase Templates</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: E-Commerce Storefront */}
          <div className="liquid-glass rounded-2xl p-6 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded text-xs font-mono bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  E-COMMERCE
                </span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  3 Active Issues
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">showcase/ecommerce-store</h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed font-light">
                Standalone glassmorphic tech gear e-commerce website template with interactive cart counter and product category filtering.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-gray-300 border border-white/10">HTML5</span>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-gray-300 border border-white/10">Vanilla CSS</span>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-gray-300 border border-white/10">JavaScript ES6</span>
              </div>
            </div>
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
              <a
                href="/showcase/ecommerce-store/index.html"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-1/2 bg-amber-400 hover:bg-amber-300 text-black text-center px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <span>View Live Preview</span>
                <ExternalLink size={14} />
              </a>
              <a
                href="https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-1/2 liquid-glass text-white hover:bg-white/10 text-center px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-white/10 active:scale-95 cursor-pointer"
              >
                <span>Contribute / Submit PR</span>
                <GitBranch size={14} className="text-amber-400" />
              </a>
            </div>
          </div>

          {/* Card 2: Agency & Creative Studio */}
          <div className="liquid-glass rounded-2xl p-6 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded text-xs font-mono bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                  AGENCY &amp; PORTFOLIO
                </span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  2 Active Issues
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">showcase/agency-studio</h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed font-light">
                Fluid design agency &amp; creative studio landing page with portfolio showcase grids, smooth scroll, and dark glassmorphism.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-gray-300 border border-white/10">HTML5</span>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-gray-300 border border-white/10">CSS Variables</span>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-gray-300 border border-white/10">JavaScript ES6</span>
              </div>
            </div>
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
              <a
                href="/showcase/agency-studio/index.html"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-1/2 bg-amber-400 hover:bg-amber-300 text-black text-center px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <span>View Live Preview</span>
                <ExternalLink size={14} />
              </a>
              <a
                href="https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-1/2 liquid-glass text-white hover:bg-white/10 text-center px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-white/10 active:scale-95 cursor-pointer"
              >
                <span>Contribute / Submit PR</span>
                <GitBranch size={14} className="text-amber-400" />
              </a>
            </div>
          </div>

          {/* Card 3: Cyber Festival Hub */}
          <div className="liquid-glass rounded-2xl p-6 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded text-xs font-mono bg-purple-400/10 text-purple-300 border border-purple-400/20">
                  EVENT &amp; FESTIVAL
                </span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  3 Active Issues
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">showcase/festival-hub</h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed font-light">
                Immersive electronic cyber festival hub with artist line-up grid, live countdown timer, and ticket tier cards.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-gray-300 border border-white/10">HTML5</span>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-gray-300 border border-white/10">Cyberpunk CSS</span>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-gray-300 border border-white/10">JS Countdown</span>
              </div>
            </div>
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
              <a
                href="/showcase/festival-hub/index.html"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-1/2 bg-amber-400 hover:bg-amber-300 text-black text-center px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <span>View Live Preview</span>
                <ExternalLink size={14} />
              </a>
              <a
                href="https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-1/2 liquid-glass text-white hover:bg-white/10 text-center px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-white/10 active:scale-95 cursor-pointer"
              >
                <span>Contribute / Submit PR</span>
                <GitBranch size={14} className="text-amber-400" />
              </a>
            </div>
          </div>

          {/* Card 4: SaaS Observability Launchpad */}
          <div className="liquid-glass rounded-2xl p-6 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded text-xs font-mono bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
                  SAAS LANDING
                </span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  4 Active Issues
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">showcase/saas-launchpad</h3>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed font-light">
                High-converting SaaS analytics landing page featuring observability metrics, pricing cards, and feature highlights.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-gray-300 border border-white/10">HTML5</span>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-gray-300 border border-white/10">Flexbox/Grid CSS</span>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-gray-300 border border-white/10">JavaScript</span>
              </div>
            </div>
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
              <a
                href="/showcase/saas-launchpad/index.html"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-1/2 bg-amber-400 hover:bg-amber-300 text-black text-center px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <span>View Live Preview</span>
                <ExternalLink size={14} />
              </a>
              <a
                href="https://github.com/Pratyush-Panda-2006/CAREERFORGE/issues"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-1/2 liquid-glass text-white hover:bg-white/10 text-center px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-white/10 active:scale-95 cursor-pointer"
              >
                <span>Contribute / Submit PR</span>
                <GitBranch size={14} className="text-amber-400" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: HIGHLIGHTS & CERTIFICATE CREDENTIALS */}
      <section className="max-w-7xl mx-auto w-full pt-4">
        <div className="liquid-glass rounded-3xl p-8 sm:p-12 border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-widest block mb-2">
              // VERIFIABLE CREDENTIALS
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight">
              Earn Verified Open Source Certificates
            </h2>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6 font-light">
              Every merged pull request and completed bounty accumulates toward official CAREERFORGE contributor credentials. Share your verified digital certificate on LinkedIn, GitHub, or your resume.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/certificates"
                className="bg-white text-black font-medium px-6 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-gray-200 transition-colors"
              >
                <ShieldCheck size={18} />
                <span>Verify a Certificate</span>
              </Link>
              <Link
                to="/leaderboard"
                className="liquid-glass text-white font-medium px-6 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-white/10 transition-colors"
              >
                <Flame size={18} className="text-amber-400" />
                <span>Hall of Fame</span>
              </Link>
            </div>
          </div>

          {/* Mini Preview Graphic */}
          <div className="w-full max-w-md bg-black/60 border border-amber-400/30 p-6 rounded-2xl text-center relative shadow-2xl">
            <div className="text-xs font-mono text-amber-400 uppercase tracking-widest mb-2">CAREERFORGE VERIFIED</div>
            <div className="text-xl font-bold text-white mb-1">Alex Rivera</div>
            <div className="text-xs text-gray-400 font-mono mb-4">Lead Project Contributor • 6,420 PTS</div>
            <div className="flex items-center justify-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded-full mx-auto w-fit">
              <Star size={14} className="fill-emerald-400" />
              <span>CAREERFORGE-CERT-2026-8942</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
