import { useState, useEffect } from 'react';
import { Search, Crown, Trophy, GitPullRequest } from 'lucide-react';

interface Contributor {
  rank: number;
  name: string;
  handle: string;
  avatar: string;
  mergedPRs: number;
}

const fallbackContributors: Contributor[] = [
  {
    rank: 1,
    name: 'Alex Rivera',
    handle: '@arivera_os',
    avatar: 'AR',
    mergedPRs: 34,
  },
  {
    rank: 2,
    name: 'Elena Rostova',
    handle: '@elena_dev',
    avatar: 'ER',
    mergedPRs: 22,
  },
  {
    rank: 3,
    name: 'Marcus Chen',
    handle: '@marcus_c',
    avatar: 'MC',
    mergedPRs: 18,
  },
  {
    rank: 4,
    name: 'Siddharth Kapoor',
    handle: '@sid_kapoor',
    avatar: 'SK',
    mergedPRs: 14,
  },
  {
    rank: 5,
    name: 'Sophia Nguyen',
    handle: '@sophia_code',
    avatar: 'SN',
    mergedPRs: 11,
  },
];

export default function Leaderboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contributors, setContributors] = useState<Contributor[]>(fallbackContributors);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    fetch('/leaderboard.json')
      .then((res) => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.contributors) && data.contributors.length > 0) {
          const parsed: Contributor[] = data.contributors.map((item: { rank?: number; username: string; merged_prs?: number }, idx: number) => ({
            rank: item.rank || idx + 1,
            name: item.username,
            handle: `@${item.username}`,
            avatar: item.username ? item.username.substring(0, 2).toUpperCase() : 'OS',
            mergedPRs: item.merged_prs || 0,
          }));
          setContributors(parsed);
          if (data.last_updated) setLastUpdated(data.last_updated);
        }
      })
      .catch(() => {
        // Fallback data remains active on fetch error
      });
  }, []);

  const sortedData = [...contributors].sort((a, b) => b.mergedPRs - a.mergedPRs);

  const filteredContributors = sortedData.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const top3 = sortedData.slice(0, 3);
  const rank1 = top3[0];
  const rank2 = top3[1];
  const rank3 = top3[2];

  return (
    <div className="px-4 sm:px-6 md:px-12 pt-4 sm:pt-8 pb-16 max-w-7xl mx-auto w-full relative z-10">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 animate-blur-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-center gap-2 text-xs font-mono text-amber-400 mb-2 uppercase tracking-wider">
          <Trophy size={14} />
          <span>// HALL OF FAME</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">
          Global Contributor Leaderboard
        </h1>
        <p className="text-gray-400 text-sm sm:text-base leading-relaxed font-light">
          Rankings are dynamically updated based on merged pull requests across CAREERFORGE public repositories.
          {lastUpdated && (
            <span className="block mt-1 text-xs font-mono text-amber-400/80">
              Last Synced: {new Date(lastUpdated).toLocaleString()}
            </span>
          )}
        </p>
      </div>

      {/* Podium Section for Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end max-w-4xl mx-auto animate-blur-fade-up" style={{ animationDelay: '200ms' }}>
        {/* Rank 2 (Silver) */}
        {rank2 && (
          <div className="liquid-glass rounded-2xl p-6 text-center border border-gray-400/30 relative flex flex-col items-center order-2 md:order-1">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-gray-400/20 text-gray-200 border border-gray-400/40 mb-4">
              RANK #2
            </span>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-600 flex items-center justify-center text-xl font-bold text-black mb-3 shadow-lg">
              {rank2.avatar}
            </div>
            <h3 className="text-lg font-bold text-white mb-0.5">{rank2.name}</h3>
            <p className="text-xs font-mono text-gray-400 mb-3">{rank2.handle}</p>
            <div className="text-sm font-mono text-gray-300 font-medium flex items-center gap-1.5">
              <GitPullRequest size={14} className="text-emerald-400" />
              <span>{rank2.mergedPRs} Merged PRs</span>
            </div>
          </div>
        )}

        {/* Rank 1 (Gold) */}
        {rank1 && (
          <div className="liquid-glass rounded-2xl p-6 text-center border border-amber-400/50 relative flex flex-col items-center order-1 md:order-2 transform md:-translate-y-4 shadow-2xl shadow-amber-500/10">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 mb-4 flex items-center gap-1">
              <Crown size={14} className="text-amber-400" />
              RANK #1
            </span>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center text-2xl font-extrabold text-black mb-3 shadow-xl ring-4 ring-amber-400/30">
              {rank1.avatar}
            </div>
            <h3 className="text-xl font-bold text-amber-300 mb-0.5">{rank1.name}</h3>
            <p className="text-xs font-mono text-amber-400/80 mb-3">{rank1.handle}</p>
            <div className="text-sm font-mono text-amber-300 font-semibold flex items-center gap-1.5">
              <GitPullRequest size={14} className="text-emerald-400" />
              <span>{rank1.mergedPRs} Merged PRs</span>
            </div>
          </div>
        )}

        {/* Rank 3 (Bronze) */}
        {rank3 && (
          <div className="liquid-glass rounded-2xl p-6 text-center border border-amber-700/30 relative flex flex-col items-center order-3">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-800/30 text-amber-400 border border-amber-700/40 mb-4">
              RANK #3
            </span>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center text-xl font-bold text-white mb-3 shadow-lg">
              {rank3.avatar}
            </div>
            <h3 className="text-lg font-bold text-white mb-0.5">{rank3.name}</h3>
            <p className="text-xs font-mono text-gray-400 mb-3">{rank3.handle}</p>
            <div className="text-sm font-mono text-gray-300 font-medium flex items-center gap-1.5">
              <GitPullRequest size={14} className="text-emerald-400" />
              <span>{rank3.mergedPRs} Merged PRs</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="mb-6 animate-blur-fade-up" style={{ animationDelay: '300ms' }}>
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contributor by name or handle..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30 backdrop-blur-md transition-colors"
          />
        </div>
      </div>

      {/* Leaderboard Table Container */}
      <div className="liquid-glass rounded-2xl border border-white/10 overflow-hidden mb-12 animate-blur-fade-up" style={{ animationDelay: '400ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-xs font-mono text-gray-400 uppercase tracking-wider">
                <th className="py-4 px-6">Rank</th>
                <th className="py-4 px-6">Contributor</th>
                <th className="py-4 px-6">Merged PRs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filteredContributors.map((c, index) => {
                const rankNumber = index + 1;
                return (
                  <tr key={c.handle} className="hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-6 font-mono font-bold">
                      {rankNumber === 1 && <span className="text-amber-400">#1</span>}
                      {rankNumber === 2 && <span className="text-gray-300">#2</span>}
                      {rankNumber === 3 && <span className="text-amber-600">#3</span>}
                      {rankNumber > 3 && <span className="text-gray-500">#{rankNumber}</span>}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold font-mono border ${
                          rankNumber === 1 ? 'bg-amber-500/20 text-amber-300 border-amber-400' : 'bg-white/10 text-white border-white/20'
                        }`}>
                          {c.avatar}
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-amber-300 transition-colors">
                            {c.name}
                          </div>
                          <div className="text-xs font-mono text-gray-400">{c.handle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-gray-300">
                      <div className="flex items-center gap-1.5 font-bold">
                        <GitPullRequest size={14} className="text-emerald-400" />
                        <span>{c.mergedPRs}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
