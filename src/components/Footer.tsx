import { Link } from 'react-router-dom';
import { GitBranch, ExternalLink } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 w-full border-t border-white/10 mt-auto bg-black/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-zinc-400">
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <Link
            to="/"
            className="text-white font-bold tracking-widest uppercase hover:opacity-90 transition-opacity"
          >
            CAREERFORGE
          </Link>
          <span className="hidden sm:inline text-white/20">•</span>
          <span className="text-xs font-mono text-zinc-400">
            Open Source Contribution Ecosystem &copy; {currentYear}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono">
          <Link to="/projects" className="hover:text-white transition-colors">
            Projects
          </Link>
          <Link to="/leaderboard" className="hover:text-white transition-colors">
            Leaderboard
          </Link>
          <Link to="/certificates" className="hover:text-white transition-colors">
            Certificates
          </Link>
          <a
            href="https://github.com/Pratyush-Panda-2006/CAREERFORGE"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors"
          >
            <GitBranch size={14} className="text-emerald-400" />
            <span>GitHub</span>
            <ExternalLink size={12} className="text-zinc-500" />
          </a>
        </div>
      </div>
    </footer>
  );
}
