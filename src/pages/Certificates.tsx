import { Link } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';

export default function Certificates() {
  return (
    <div className="px-4 sm:px-6 md:px-12 pt-6 sm:pt-16 pb-16 max-w-5xl mx-auto w-full relative z-10 flex items-center justify-center min-h-[50vh] sm:min-h-[65vh]">
      <div className="liquid-glass p-8 md:p-12 rounded-2xl max-w-xl mx-auto text-center border border-white/10 shadow-2xl animate-blur-fade-up">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
          <Lock className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
        </div>

        {/* Badge / Tag */}
        <div className="text-xs font-mono text-cyan-400 mb-3 tracking-wider uppercase">
          // CREDENTIAL STATUS
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
          Certificates Locked
        </h1>

        {/* Message */}
        <p className="text-gray-300 text-sm sm:text-base leading-relaxed font-light">
          Certificates will be available and verifiable here after the 60-day contribution event officially concludes. Keep submitting PRs to qualify for excellence credentials!
        </p>

        {/* Action Links */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/projects"
            className="bg-white text-black font-medium px-6 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-gray-200 transition-colors"
          >
            <span>Explore Projects</span>
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/leaderboard"
            className="liquid-glass text-white font-medium px-6 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-white/10 transition-colors"
          >
            <span>Check Leaderboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

