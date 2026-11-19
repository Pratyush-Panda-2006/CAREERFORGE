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
    name: 'AdityaNarayanPadhi',
    handle: '@AdityaNarayanPadhi',
    avatar: 'AN',
    mergedPRs: 633,
  },
  {
    rank: 2,
    name: 'souravranjanmirdha-sudo',
    handle: '@souravranjanmirdha-sudo',
    avatar: 'SR',
    mergedPRs: 407,
  },
  {
    rank: 3,
    name: 'Harshit214713',
    handle: '@Harshit214713',
    avatar: 'HB',
    mergedPRs: 107,
  },
  {
    rank: 4,
    name: 'divyanshAgarwal123',
    handle: '@divyanshAgarwal123',
    avatar: 'DA',
    mergedPRs: 42,
  },
  {
    rank: 5,
    name: 'Sarbajit-Sengupta',
    handle: '@Sarbajit-Sengupta',
    avatar: 'SS',
    mergedPRs: 35,
  },
  {
    rank: 6,
    name: 'Anshuu2004',
    handle: '@Anshuu2004',
    avatar: 'AC',
    mergedPRs: 33,
  },
  {
    rank: 7,
    name: 'SwatiManjari',
    handle: '@SwatiManjari',
    avatar: 'SM',
    mergedPRs: 27,
  },
  {
    rank: 8,
    name: 'chanchall26',
    handle: '@chanchall26',
    avatar: 'C2',
    mergedPRs: 14,
  },
  {
    rank: 9,
    name: 'aush5895',
    handle: '@aush5895',
    avatar: 'AG',
    mergedPRs: 11,
  },
  {
    rank: 10,
    name: 'kunal-yelgate',
    handle: '@kunal-yelgate',
    avatar: 'KY',
    mergedPRs: 5,
  },
  {
    rank: 11,
    name: 'jay23606',
    handle: '@jay23606',
    avatar: 'J2',
    mergedPRs: 4,
  },
  {
    rank: 12,
    name: 'Aaqibhafeezkhan',
    handle: '@Aaqibhafeezkhan',
    avatar: 'AK',
    mergedPRs: 4,
  },
  {
    rank: 13,
    name: 'Akanksha7Dixit',
    handle: '@Akanksha7Dixit',
    avatar: 'AD',
    mergedPRs: 3,
  },
  {
    rank: 14,
    name: 'bhavyasingh-sa',
    handle: '@bhavyasingh-sa',
    avatar: 'BS',
    mergedPRs: 2,
  },
  {
    rank: 15,
    name: 'yash-sharmaji',
    handle: '@yash-sharmaji',
    avatar: 'YS',
    mergedPRs: 1,
  },
  {
    rank: 16,
    name: 'mohdmunis161',
    handle: '@mohdmunis161',
    avatar: 'MM',
    mergedPRs: 1,
  },
  {
    rank: 17,
    name: 'Pallav-Biyala',
    handle: '@Pallav-Biyala',
    avatar: 'PB',
    mergedPRs: 1,
  },
];

export default function Leaderboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contributors, setContributors] = useState<Contributor[]>(fallbackContributors);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/leaderboard.json?t=${Date.now()}`, { cache: 'no-store' })
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
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10 animate-blur-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-center gap-2 text-xs font-mono text-amber-400 mb-2 uppercase tracking-wider">
          <Trophy size={14} />
          <span>// HALL OF FAME</span>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-3 break-words">
          Global Contributor Leaderboard
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm md:text-base leading-relaxed font-light px-2 sm:px-0">
          Rankings are dynamically updated based on merged pull requests across CAREERFORGE public repositories.
          {lastUpdated && (
            <span className="block mt-1 text-xs font-mono text-amber-400/80">
              Last Synced: {new Date(lastUpdated).toLocaleString()}
            </span>
          )}
        </p>
      </div>

      {/* Podium Section for Top 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-12 items-end max-w-4xl mx-auto animate-blur-fade-up" style={{ animationDelay: '200ms' }}>
        {/* Rank 2 (Silver) */}
        {rank2 && (
          <div className="liquid-glass rounded-2xl p-5 sm:p-6 text-center border border-gray-400/30 relative flex flex-col items-center order-2 sm:order-1">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-gray-400/20 text-gray-200 border border-gray-400/40 mb-3 sm:mb-4">
              RANK #2
            </span>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-600 flex items-center justify-center text-lg sm:text-xl font-bold text-black mb-3 shadow-lg">
              {rank2.avatar}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-0.5 truncate max-w-[200px]">{rank2.name}</h3>
            <p className="text-xs font-mono text-gray-400 mb-2.5 truncate max-w-[200px]">{rank2.handle}</p>
            <div className="text-xs sm:text-sm font-mono text-gray-300 font-medium flex items-center gap-1.5">
              <GitPullRequest size={14} className="text-emerald-400" />
              <span>{rank2.mergedPRs} Merged PRs</span>
            </div>
          </div>
        )}

        {/* Rank 1 (Gold) */}
        {rank1 && (
          <div className="liquid-glass rounded-2xl p-6 sm:p-7 text-center border border-amber-400/50 relative flex flex-col items-center order-1 sm:order-2 transform sm:-translate-y-4 shadow-2xl shadow-amber-500/10">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 mb-3 sm:mb-4 flex items-center gap-1">
              <Crown size={14} className="text-amber-400" />
              RANK #1
            </span>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center text-xl sm:text-2xl font-extrabold text-black mb-3 shadow-xl ring-4 ring-amber-400/30">
              {rank1.avatar}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-amber-300 mb-0.5 truncate max-w-[220px]">{rank1.name}</h3>
            <p className="text-xs font-mono text-amber-400/80 mb-2.5 truncate max-w-[220px]">{rank1.handle}</p>
            <div className="text-xs sm:text-sm font-mono text-amber-300 font-semibold flex items-center gap-1.5">
              <GitPullRequest size={14} className="text-emerald-400" />
              <span>{rank1.mergedPRs} Merged PRs</span>
            </div>
          </div>
        )}

        {/* Rank 3 (Bronze) */}
        {rank3 && (
          <div className="liquid-glass rounded-2xl p-5 sm:p-6 text-center border border-amber-700/30 relative flex flex-col items-center order-3">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-800/30 text-amber-400 border border-amber-700/40 mb-3 sm:mb-4">
              RANK #3
            </span>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center text-lg sm:text-xl font-bold text-white mb-3 shadow-lg">
              {rank3.avatar}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-0.5 truncate max-w-[200px]">{rank3.name}</h3>
            <p className="text-xs font-mono text-gray-400 mb-2.5 truncate max-w-[200px]">{rank3.handle}</p>
            <div className="text-xs sm:text-sm font-mono text-gray-300 font-medium flex items-center gap-1.5">
              <GitPullRequest size={14} className="text-emerald-400" />
              <span>{rank3.mergedPRs} Merged PRs</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="mb-6 animate-blur-fade-up" style={{ animationDelay: '300ms' }}>
        <div className="relative max-w-full sm:max-w-md">
          <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contributor by name or handle..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30 backdrop-blur-md transition-colors min-h-[42px]"
          />
        </div>
      </div>

      {/* Leaderboard Table Container */}
      <div className="liquid-glass rounded-2xl border border-white/10 overflow-hidden mb-12 animate-blur-fade-up" style={{ animationDelay: '400ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[320px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[11px] sm:text-xs font-mono text-gray-400 uppercase tracking-wider">
                <th className="py-3 sm:py-4 px-3 sm:px-6">Rank</th>
                <th className="py-3 sm:py-4 px-3 sm:px-6">Contributor</th>
                <th className="py-3 sm:py-4 px-3 sm:px-6 text-right sm:text-left">Merged PRs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
              {filteredContributors.map((c, index) => {
                const rankNumber = index + 1;
                return (
                  <tr key={c.handle} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3 sm:py-4 px-3 sm:px-6 font-mono font-bold whitespace-nowrap">
                      {rankNumber === 1 && <span className="text-amber-400">#1</span>}
                      {rankNumber === 2 && <span className="text-gray-300">#2</span>}
                      {rankNumber === 3 && <span className="text-amber-600">#3</span>}
                      {rankNumber > 3 && <span className="text-gray-500">#{rankNumber}</span>}
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold font-mono border flex-shrink-0 ${
                          rankNumber === 1 ? 'bg-amber-500/20 text-amber-300 border-amber-400' : 'bg-white/10 text-white border-white/20'
                        }`}>
                          {c.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white group-hover:text-amber-300 transition-colors truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
                            {c.name}
                          </div>
                          <div className="text-[11px] sm:text-xs font-mono text-gray-400 truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">{c.handle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-6 font-mono text-gray-300 whitespace-nowrap text-right sm:text-left">
                      <div className="inline-flex items-center gap-1.5 font-bold">
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
