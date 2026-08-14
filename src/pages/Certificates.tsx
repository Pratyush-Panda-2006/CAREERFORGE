import { Lock } from 'lucide-react';

export default function Certificates() {
  return (
    <div className="px-4 sm:px-6 md:px-12 py-16 max-w-5xl mx-auto w-full relative z-10 flex items-center justify-center min-h-[65vh]">
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
      </div>
    </div>
  );
}

