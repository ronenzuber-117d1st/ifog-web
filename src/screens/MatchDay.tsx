import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { Badge } from '../components/Badge';
import { Layout } from '../components/Layout';
import type { Formation } from '../types/game';
import { img } from '../utils/images';

const FORMATIONS: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '5-3-2', '4-5-1'];
const FORMATION_DESC: Record<Formation, string> = {
  '4-4-2': 'Balanced',
  '4-3-3': 'Attacking',
  '3-5-2': 'Midfield dominance',
  '5-3-2': 'Defensive',
  '4-5-1': 'Ultra defensive',
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
      <div className="space-y-5 max-w-2xl mx-auto">

        {/* Stadium + match header */}
        <div className="card overflow-hidden">
          {/* Stadium background */}
          <div className="relative h-36 overflow-hidden">
            <img
              src={img('zuschau1.png')}
              alt="stadium"
              className="w-full h-full object-cover"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">Matchday {currentMatchday}</span>
            </div>
          </div>

          {/* Pitch */}
          <div className="relative">
            <img
              src={img('feld1.png')}
              alt="pitch"
              className="w-full object-cover"
              style={{ imageRendering: 'pixelated', maxHeight: '160px' }}
            />
            {/* Teams overlaid on pitch */}
            <div className="absolute inset-0 flex items-center justify-between px-8">
              <div className="flex flex-col items-center gap-1 drop-shadow-lg">
                <Badge team={myTeam} size="xl" />
                <span className="text-white font-bold text-sm drop-shadow">{myTeam.name}</span>
                <span className="text-pitch-400 text-xs font-bold">{isHome ? 'HOME' : 'AWAY'}</span>
              </div>

              {/* Scoreboard */}
              <div className="flex flex-col items-center">
                <img src={img('anzeig1.png')} alt="scoreboard" className="w-28 opacity-90" style={{ imageRendering: 'pixelated' }} />
                <span className="text-white font-extrabold text-2xl tracking-widest mt-1 drop-shadow">? - ?</span>
              </div>

              <div className="flex flex-col items-center gap-1 drop-shadow-lg">
                <Badge team={opponent} size="xl" />
                <span className="text-white font-bold text-sm drop-shadow">{opponent.name}</span>
                <span className="text-slate-300 text-xs font-bold">{isHome ? 'AWAY' : 'HOME'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Formation picker */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Tactical Setup</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {FORMATIONS.map(f => (
              <button
                key={f}
                onClick={() => setFormation(f)}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  formation === f
                    ? 'border-pitch-500 bg-pitch-600/15 text-pitch-400'
                    : 'border-surface-600 hover:border-surface-500 text-slate-300'
                }`}
              >
                <div className="font-bold text-sm">{f}</div>
                <div className="text-xs text-slate-500 mt-0.5">{FORMATION_DESC[f]}</div>
              </button>
            ))}
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

        <button className="btn-primary w-full py-4 text-lg font-bold" onClick={handlePlay}>
          ⚽ Kick Off!
        </button>
      </div>
    </Layout>
  );
}
