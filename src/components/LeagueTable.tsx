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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 text-xs uppercase tracking-wider">
            <th className="text-left pb-2 pl-2 w-8">#</th>
            <th className="text-left pb-2">Team</th>
            <th className="pb-2 text-right">P</th>
            <th className="pb-2 text-right">W</th>
            <th className="pb-2 text-right">D</th>
            <th className="pb-2 text-right">L</th>
            <th className="pb-2 text-right">GD</th>
            <th className="pb-2 text-right pr-2">Pts</th>
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
                className={`border-t border-surface-700 ${isManaged ? 'bg-pitch-600/10' : 'hover:bg-surface-700/50'} transition-colors`}
              >
                <td className="py-2.5 pl-2 text-slate-400 font-mono w-8">{i + 1}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Badge team={team} size="sm" />
                    <span className={`font-medium ${isManaged ? 'text-pitch-400' : 'text-slate-200'}`}>
                      {team.name}
                      {isManaged && <span className="ml-1.5 text-xs text-pitch-500">(You)</span>}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 text-right text-slate-300">{row.played}</td>
                <td className="py-2.5 text-right text-slate-300">{row.won}</td>
                <td className="py-2.5 text-right text-slate-300">{row.drawn}</td>
                <td className="py-2.5 text-right text-slate-300">{row.lost}</td>
                <td className={`py-2.5 text-right ${gd > 0 ? 'text-pitch-400' : gd < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  {gd > 0 ? `+${gd}` : gd}
                </td>
                <td className="py-2.5 text-right pr-2 font-bold text-white">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
