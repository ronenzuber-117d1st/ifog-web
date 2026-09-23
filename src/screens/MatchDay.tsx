import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { Badge } from '../components/Badge';
import { Layout } from '../components/Layout';
import type { Formation } from '../types/game';
import { Shield, Swords } from 'lucide-react';

const FORMATIONS: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '5-3-2', '4-5-1'];
const FORMATION_DESC: Record<Formation, string> = {
  '4-4-2': 'Balanced — classic shape',
  '4-3-3': 'Attacking — more strikers',
  '3-5-2': 'Midfield — dominate possession',
  '5-3-2': 'Defensive — protect the lead',
  '4-5-1': 'Ultra defensive — park the bus',
};

const POS_LABEL: Record<string, string> = { T: 'GK', V: 'DEF', M: 'MID', S: 'FWD' };
const POS_COLOR: Record<string, string> = {
  T: 'text-yellow-400', V: 'text-blue-400', M: 'text-pitch-400', S: 'text-red-400'
};

export function MatchDay() {
  const navigate = useNavigate();
  const {
    managedTeamId, currentMatchday, formation, fixtures, rosters,
    setFormation, playMatchday,
  } = useGameStore();

  const myTeam = LEAGUE_TEAMS.find(t => t.id === managedTeamId)!;
  const nextFixture = fixtures.find(f =>
    f.matchday === currentMatchday && (f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId)
  );
  const isHome = nextFixture?.homeTeamId === managedTeamId;
  const opponentId = isHome ? nextFixture?.awayTeamId : nextFixture?.homeTeamId;
  const opponent = opponentId ? LEAGUE_TEAMS.find(t => t.id === opponentId) : null;

  const myPlayers = (rosters[managedTeamId] ?? []).filter(p => !p.injuredFor && !p.suspended);
  const injuredPlayers = (rosters[managedTeamId] ?? []).filter(p => p.injuredFor > 0 || p.suspended);

  const handlePlay = () => {
    playMatchday();
    navigate('/season');
  };

  if (!nextFixture || !opponent) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-slate-400 text-lg">No match scheduled this matchday.</p>
          <button className="btn-secondary mt-4" onClick={() => navigate('/season')}>← Back</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Match header */}
        <div className="card p-6">
          <div className="text-xs text-slate-500 text-center mb-4">Matchday {currentMatchday}</div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center gap-2 flex-1">
              <Badge team={myTeam} size="lg" />
              <span className="font-bold text-white text-center">{myTeam.name}</span>
              <span className="text-xs text-pitch-400 font-semibold">{isHome ? 'HOME' : 'AWAY'}</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-600">VS</div>
            <div className="flex flex-col items-center gap-2 flex-1">
              <Badge team={opponent} size="lg" />
              <span className="font-bold text-white text-center">{opponent.name}</span>
              <span className="text-xs text-slate-500 font-semibold">{isHome ? 'AWAY' : 'HOME'}</span>
            </div>
          </div>
        </div>

        {/* Formation picker */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Tactical Setup</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FORMATIONS.map(f => (
              <button
                key={f}
                onClick={() => setFormation(f)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  formation === f
                    ? 'border-pitch-500 bg-pitch-600/15 text-pitch-400'
                    : 'border-surface-600 hover:border-surface-500 text-slate-300'
                }`}
              >
                <div className="font-bold text-base">{f}</div>
                <div className="text-xs text-slate-500 mt-0.5">{FORMATION_DESC[f]}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-3 text-sm text-slate-400">
            <div className="flex items-center gap-1.5">
              <Swords size={14} className="text-red-400" />
              <span>{formation === '4-3-3' ? 'High' : formation === '3-5-2' ? 'Normal' : formation === '4-4-2' ? 'Normal' : 'Low'} attack</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-blue-400" />
              <span>{formation === '5-3-2' || formation === '4-5-1' ? 'High' : 'Normal'} defence</span>
            </div>
          </div>
        </div>

        {/* Squad */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Available Squad ({myPlayers.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {myPlayers.map(p => (
              <div key={p.id} className="flex items-center gap-2 bg-surface-700/50 rounded-lg px-3 py-2">
                <span className={`text-xs font-bold w-8 ${POS_COLOR[p.position]}`}>{POS_LABEL[p.position]}</span>
                <span className="text-sm text-slate-200 flex-1 truncate">{p.name}</span>
                <span className="text-xs text-slate-500">{p.skill}</span>
              </div>
            ))}
          </div>
          {injuredPlayers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-surface-700">
              <p className="text-xs text-red-400 mb-2">Unavailable</p>
              <div className="flex flex-wrap gap-2">
                {injuredPlayers.map(p => (
                  <span key={p.id} className="text-xs text-red-400/70 line-through">
                    {p.name} {p.injuredFor > 0 ? `(${p.injuredFor}md)` : '(sus)'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="btn-primary w-full py-4 text-lg" onClick={handlePlay}>
          ⚽ Kick Off!
        </button>
      </div>
    </Layout>
  );
}
