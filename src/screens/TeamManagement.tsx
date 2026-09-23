import { useGameStore } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { Layout } from '../components/Layout';
import { Badge } from '../components/Badge';
import { Dumbbell, AlertCircle } from 'lucide-react';

const POS_LABEL: Record<string, string> = { T: 'GK', V: 'DEF', M: 'MID', S: 'FWD' };
const POS_ORDER: Record<string, number> = { T: 0, V: 1, M: 2, S: 3 };
const POS_COLOR: Record<string, string> = {
  T: 'bg-yellow-500/20 text-yellow-400 border-yellow-700/50',
  V: 'bg-blue-500/20 text-blue-400 border-blue-700/50',
  M: 'bg-pitch-500/20 text-pitch-400 border-pitch-700/50',
  S: 'bg-red-500/20 text-red-400 border-red-700/50',
};

export function TeamManagement() {
  const { managedTeamId, rosters, balance, trainPlayer } = useGameStore();
  const myTeam = LEAGUE_TEAMS.find(t => t.id === managedTeamId)!;
  const players = (rosters[managedTeamId] ?? []).slice().sort((a, b) => POS_ORDER[a.position] - POS_ORDER[b.position]);

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Badge team={myTeam} size="md" />
          <div>
            <h2 className="text-xl font-bold text-white">{myTeam.name}</h2>
            <p className="text-sm text-slate-400">Squad Management</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3 text-sm text-slate-300">
          <Dumbbell size={16} className="text-pitch-500" />
          <span>Training a player costs <span className="text-pitch-400 font-semibold">£10,000</span> per session. After 5 sessions their skill increases by 1.</span>
        </div>

        <div className="space-y-2">
          {players.map(p => {
            const unavailable = p.injuredFor > 0 || p.suspended;
            return (
              <div
                key={p.id}
                className={`card p-4 flex items-center gap-4 ${unavailable ? 'opacity-60' : ''}`}
              >
                <span className={`tag border ${POS_COLOR[p.position]} w-10 text-center flex-shrink-0`}>
                  {POS_LABEL[p.position]}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{p.name}</span>
                    {unavailable && (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <AlertCircle size={11} />
                        {p.injuredFor > 0 ? `injured (${p.injuredFor}md)` : 'suspended'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500">Age {p.age}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(9)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-sm ${i < p.skill ? 'bg-pitch-500' : 'bg-surface-600'}`}
                        />
                      ))}
                      <span className="text-xs text-slate-400 ml-1">{p.skill}/9</span>
                    </div>
                  </div>
                  {p.trainingProgress > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-3 h-1 rounded-full ${i < p.trainingProgress ? 'bg-pitch-500' : 'bg-surface-600'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-slate-500">{p.trainingProgress}/5 to next skill</span>
                    </div>
                  )}
                </div>

                <button
                  className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0 flex items-center gap-1"
                  disabled={unavailable || balance < 10_000 || p.skill >= 9}
                  onClick={() => trainPlayer(p.id)}
                  title={p.skill >= 9 ? 'Max skill reached' : `Train (+£10,000)`}
                >
                  <Dumbbell size={12} />
                  Train
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
