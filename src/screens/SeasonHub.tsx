import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { LeagueTable } from '../components/LeagueTable';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { EventModal } from '../components/EventModal';
import { Layout } from '../components/Layout';
import { Calendar, MessageSquare } from 'lucide-react';

export function SeasonHub() {
  const navigate = useNavigate();
  const {
    managedTeamId, currentMatchday, totalMatchdays, table, fixtures,
    balance, chairmanMessage, pendingEvent, dismissEvent, phase,
  } = useGameStore();

  const myTeam = LEAGUE_TEAMS.find(t => t.id === managedTeamId)!;
  const myRow = table.find(r => r.teamId === managedTeamId);
  const position = table.findIndex(r => r.teamId === managedTeamId) + 1;

  const nextFixture = fixtures.find(f =>
    f.matchday === currentMatchday && (f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId)
  );
  const isHome = nextFixture?.homeTeamId === managedTeamId;
  const opponentId = isHome ? nextFixture?.awayTeamId : nextFixture?.homeTeamId;
  const opponent = opponentId ? LEAGUE_TEAMS.find(t => t.id === opponentId) : null;

  const recentResults = fixtures
    .filter(f =>
      (f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId) &&
      f.homeGoals !== undefined
    )
    .slice(-5)
    .reverse();

  const seasonOver = currentMatchday > totalMatchdays;

  return (
    <Layout>
      {pendingEvent && phase === 'result' && (
        <EventModal event={pendingEvent} onClose={dismissEvent} />
      )}

      <div className="space-y-6">
        {/* Season over banner */}
        {seasonOver && (
          <div className="card p-6 bg-pitch-700/20 border-pitch-600 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <h2 className="text-xl font-bold text-white mb-1">Season Complete!</h2>
            <p className="text-slate-300">
              You finished <span className="font-bold text-pitch-400">{position}{ordinal(position)}</span> in the league.
            </p>
            <button className="btn-primary mt-4" onClick={() => navigate('/')}>Main Menu</button>
          </div>
        )}

        {/* Chairman message */}
        <div className="card p-4 flex items-start gap-3">
          <MessageSquare size={18} className="text-pitch-500 mt-0.5 flex-shrink-0" />
          <p className="text-slate-300 text-sm italic">"{chairmanMessage}"</p>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Position" value={`${position}${ordinal(position)}`} sub="in the league" accent />
          <StatCard label="Points" value={myRow?.points ?? 0} sub={`${myRow?.played ?? 0} played`} />
          <StatCard label="Balance" value={`£${(balance / 1_000_000).toFixed(2)}M`} sub={balance >= 0 ? 'in the black' : 'in the red'} accent={balance >= 0} />
          <StatCard label="Matchday" value={`${currentMatchday} / ${totalMatchdays}`} sub="this season" />
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Next fixture */}
          {!seasonOver && nextFixture && opponent && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-pitch-500" />
                <span className="text-sm font-semibold text-slate-300">Next Match — Matchday {currentMatchday}</span>
              </div>
              <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <Badge team={myTeam} size="md" />
                  <div>
                    <div className="font-semibold text-white">{myTeam.name}</div>
                    <div className="text-xs text-pitch-400">{isHome ? 'HOME' : 'AWAY'}</div>
                  </div>
                </div>
                <span className="text-xl font-bold text-slate-500">vs</span>
                <div className="flex items-center gap-3 flex-row-reverse">
                  <Badge team={opponent} size="md" />
                  <div className="text-right">
                    <div className="font-semibold text-white">{opponent.name}</div>
                    <div className="text-xs text-slate-500">{isHome ? 'AWAY' : 'HOME'}</div>
                  </div>
                </div>
              </div>
              <button className="btn-primary w-full" onClick={() => navigate('/match')}>
                Play Matchday {currentMatchday} →
              </button>
            </div>
          )}

          {/* Recent results */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Recent Results</h3>
            {recentResults.length === 0 && (
              <p className="text-slate-500 text-sm">No results yet.</p>
            )}
            <div className="space-y-2">
              {recentResults.map(f => {
                const isHomeResult = f.homeTeamId === managedTeamId;
                const myGoals = isHomeResult ? f.homeGoals! : f.awayGoals!;
                const theirGoals = isHomeResult ? f.awayGoals! : f.homeGoals!;
                const opp = LEAGUE_TEAMS.find(t => t.id === (isHomeResult ? f.awayTeamId : f.homeTeamId))!;
                const w = myGoals > theirGoals;
                const d = myGoals === theirGoals;
                return (
                  <div key={f.id} className="flex items-center gap-3 text-sm">
                    <span className={`tag ${w ? 'bg-pitch-700/40 text-pitch-400' : d ? 'bg-blue-900/40 text-blue-400' : 'bg-red-900/30 text-red-400'}`}>
                      {w ? 'W' : d ? 'D' : 'L'}
                    </span>
                    <span className="text-slate-400 text-xs">{isHomeResult ? 'H' : 'A'}</span>
                    <span className="text-slate-300 flex-1">{opp.name}</span>
                    <span className="font-mono font-semibold text-white">{myGoals}–{theirGoals}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* League table */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">League Table</h3>
          <LeagueTable table={table} managedTeamId={managedTeamId} />
        </div>
      </div>
    </Layout>
  );
}

function ordinal(n: number) {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  if (n % 10 === 1) return 'st';
  if (n % 10 === 2) return 'nd';
  if (n % 10 === 3) return 'rd';
  return 'th';
}
