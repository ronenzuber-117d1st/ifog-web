import type { TableRow } from '../types/game';
import { LEAGUE_TEAMS } from '../data/teams';
import { Badge } from './Badge';

interface Props {
  table: TableRow[];
  managedTeamId?: number;
  compact?: boolean;
}

export function LeagueTable({ table, managedTeamId, compact }: Props) {
  const rows = compact ? table.slice(0, 10) : table;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', fontFamily: "'Barlow', system-ui, sans-serif" }}>
        <thead>
          <tr style={{ color: '#8d99b5', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <th style={{ textAlign: 'left', paddingBottom: 8, paddingLeft: 6, width: 28 }}>#</th>
            <th style={{ textAlign: 'left', paddingBottom: 8 }}>Team</th>
            <th style={{ textAlign: 'right', paddingBottom: 8 }}>P</th>
            <th style={{ textAlign: 'right', paddingBottom: 8 }}>W</th>
            <th style={{ textAlign: 'right', paddingBottom: 8 }}>D</th>
            <th style={{ textAlign: 'right', paddingBottom: 8 }}>L</th>
            <th style={{ textAlign: 'right', paddingBottom: 8 }}>GD</th>
            <th style={{ textAlign: 'right', paddingBottom: 8, paddingRight: 6 }}>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const team = LEAGUE_TEAMS.find(t => t.id === row.teamId);
            if (!team) return null;
            const isManaged = row.teamId === managedTeamId;
            const gd = row.goalsFor - row.goalsAgainst;
            return (
              <tr
                key={row.teamId}
                style={{
                  borderTop: '1px solid #1c2640',
                  background: isManaged ? 'rgba(200,245,61,0.06)' : 'transparent',
                }}
              >
                <td style={{ padding: '7px 0 7px 6px', color: '#8d99b5', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, width: 28 }}>{i + 1}</td>
                <td style={{ padding: '7px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge team={team} size="sm" />
                    <span style={{ fontWeight: 500, color: isManaged ? '#c8f53d' : '#e8edf7' }}>
                      {team.name}
                      {isManaged && <span style={{ marginLeft: 6, fontSize: 10, color: '#8d99b5' }}>(You)</span>}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '7px 0', textAlign: 'right', color: '#94a3b8' }}>{row.played}</td>
                <td style={{ padding: '7px 0', textAlign: 'right', color: '#94a3b8' }}>{row.won}</td>
                <td style={{ padding: '7px 0', textAlign: 'right', color: '#94a3b8' }}>{row.drawn}</td>
                <td style={{ padding: '7px 0', textAlign: 'right', color: '#94a3b8' }}>{row.lost}</td>
                <td style={{ padding: '7px 0', textAlign: 'right', color: gd > 0 ? '#c8f53d' : gd < 0 ? '#f87171' : '#8d99b5' }}>
                  {gd > 0 ? `+${gd}` : gd}
                </td>
                <td style={{ padding: '7px 6px 7px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#ffffff', fontSize: 13 }}>{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
