import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import type { TableRow, EuropeanCupState, MatchReport, Fixture } from '../types/game';

function makeTable(myId: number, myPos: number): TableRow[] {
  const ids = LEAGUE_TEAMS.map(t => t.id);
  const rows: TableRow[] = ids.map((id, i) => ({
    teamId: id,
    played: 38,
    won: 20 - i,
    drawn: 3,
    lost: 15 + i,
    goalsFor: 60 - i * 2,
    goalsAgainst: 30 + i * 2,
    points: 63 - i * 3,
  }));
  const myIdx = rows.findIndex(r => r.teamId === myId);
  const targetIdx = myPos - 1;
  if (myIdx !== targetIdx) {
    const tmp = rows[myIdx];
    rows[myIdx] = { ...rows[targetIdx], teamId: rows[myIdx].teamId };
    rows[targetIdx] = { ...tmp, teamId: myId };
  }
  return rows;
}

function fakeCupReport(myId: number, oppId: number, myGoals: number, oppGoals: number): MatchReport {
  const fixture: Fixture = { id: 'euro-semi', matchday: 0, homeTeamId: myId, awayTeamId: oppId, homeGoals: myGoals, awayGoals: oppGoals };
  const events = myGoals > 0 ? [{ minute: 23, type: 'goal' as const, teamId: myId, playerName: 'Kite' }] : [];
  return { fixture, events, manOfMatch: 'Kite' };
}

export function DevPanel() {
  if (!import.meta.env.DEV) return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const navigate = useNavigate();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [open, setOpen] = useState(false);

  const seed = (overrides: object) => {
    useGameStore.setState({
      phase: 'season',
      managerName: 'Dev Manager',
      managedTeamId: 1,
      portrait: 'manag1',
      difficulty: 'intermediate',
      division: 1,
      seasonsInDivision: 1,
      balance: 1_500_000,
      table: makeTable(1, 2),
      rosters: {},
      startingXI: [],
      fixtures: [],
      financeHistory: [],
      currentMatchday: 38,
      totalMatchdays: 38,
      pendingEvent: null,
      lastMatch: null,
      europeanCup: null,
      ...overrides,
    } as any);
  };

  const buttons: { label: string; action: () => void }[] = [
    { label: 'Season End — Champion',   action: () => { seed({ table: makeTable(1, 1) }); navigate('/season-end'); } },
    { label: 'Season End — Top 4',      action: () => { seed({ table: makeTable(1, 2) }); navigate('/season-end'); } },
    { label: 'Season End — Relegated',  action: () => { seed({ table: makeTable(1, 18) }); navigate('/season-end'); } },
    {
      label: 'Euro Cup — Semi (ready)',
      action: () => {
        const cup: EuropeanCupState = { round: 'semi', semiOpponentId: 41, finalOpponentId: 42, otherSemiIds: [43, 44], semiResult: null, finalResult: null, lastMatchReport: null };
        seed({ europeanCup: cup });
        navigate('/european-cup');
      },
    },
    {
      label: 'Euro Cup — Semi won',
      action: () => {
        // finalOpponentId (43=Stuttgart) is from otherSemiIds [43,44]
        const cup: EuropeanCupState = { round: 'final', semiOpponentId: 41, finalOpponentId: 43, otherSemiIds: [43, 44], semiResult: 'win', finalResult: null, lastMatchReport: fakeCupReport(1, 41, 2, 1) };
        seed({ europeanCup: cup });
        navigate('/european-cup');
      },
    },
    {
      label: 'Euro Cup — Semi lost',
      action: () => {
        const cup: EuropeanCupState = { round: 'done', semiOpponentId: 41, finalOpponentId: 43, otherSemiIds: [43, 44], semiResult: 'loss', finalResult: null, lastMatchReport: fakeCupReport(1, 41, 0, 1) };
        seed({ europeanCup: cup });
        navigate('/european-cup');
      },
    },
    {
      label: 'Euro Cup — Won!',
      action: () => {
        const cup: EuropeanCupState = { round: 'done', semiOpponentId: 41, finalOpponentId: 43, otherSemiIds: [43, 44], semiResult: 'win', finalResult: 'win', lastMatchReport: fakeCupReport(1, 43, 3, 1) };
        seed({ europeanCup: cup });
        navigate('/european-cup');
      },
    },
    {
      label: 'Euro Cup — Runner-up',
      action: () => {
        const cup: EuropeanCupState = { round: 'done', semiOpponentId: 41, finalOpponentId: 43, otherSemiIds: [43, 44], semiResult: 'win', finalResult: 'loss', lastMatchReport: fakeCupReport(1, 43, 1, 2) };
        seed({ europeanCup: cup });
        navigate('/european-cup');
      },
    },
  ];

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, fontFamily: 'monospace', fontSize: 12 }}>
      {open && (
        <div style={{
          marginBottom: 8, background: '#0f1628', border: '1px solid #1c2640',
          borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 240,
        }}>
          {buttons.map(b => (
            <button key={b.label} onClick={() => { b.action(); setOpen(false); }} style={{
              padding: '6px 10px', borderRadius: 6, border: '1px solid #1c2640',
              background: '#070b16', color: '#c8f53d', cursor: 'pointer',
              fontSize: 11, textAlign: 'left',
            }}>
              {b.label}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} style={{
        padding: '5px 10px', borderRadius: 6, border: '1px solid #1c2640',
        background: '#0f1628', color: '#8d99b5', cursor: 'pointer', fontSize: 11,
      }}>
        {open ? '✕ DEV' : 'DEV'}
      </button>
    </div>
  );
}
