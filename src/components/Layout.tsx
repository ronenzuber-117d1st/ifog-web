import { Link, useLocation } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { Trophy, Users, TrendingUp, DollarSign, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface Props { children: React.ReactNode }

const NAV = [
  { to: '/season',    icon: Trophy,      label: 'Season'      },
  { to: '/match',     icon: TrendingUp,  label: 'Match Day'   },
  { to: '/team',      icon: Users,       label: 'Squad'       },
  { to: '/finances',  icon: DollarSign,  label: 'Finances'    },
];

export function Layout({ children }: Props) {
  const { managedTeamId, managerName, currentMatchday, totalMatchdays, balance } = useGameStore();
  const team = LEAGUE_TEAMS.find(t => t.id === managedTeamId);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      {/* Top bar */}
      <header className="bg-surface-900 border-b border-surface-700 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex-shrink-0"
              style={{ backgroundColor: team?.color, boxShadow: `0 0 8px ${team?.color}88` }}
            />
            <div>
              <div className="text-xs text-slate-400 leading-none">Manager</div>
              <div className="text-sm font-semibold text-white leading-tight">{managerName}</div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-slate-400 text-xs">Matchday</div>
              <div className="font-bold text-white">{currentMatchday} / {totalMatchdays}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-xs">Balance</div>
              <div className={`font-bold ${balance >= 0 ? 'text-pitch-400' : 'text-red-400'}`}>
                £{(balance / 1_000_000).toFixed(2)}M
              </div>
            </div>
          </div>

          <button className="sm:hidden p-1.5 text-slate-400" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 max-w-5xl mx-auto w-full">
        {/* Sidebar nav */}
        <nav className={`${menuOpen ? 'flex' : 'hidden'} sm:flex flex-col w-52 bg-surface-900 border-r border-surface-700 p-4 gap-1 shrink-0`}>
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  active
                    ? 'bg-pitch-600/20 text-pitch-400 border border-pitch-700/50'
                    : 'text-slate-400 hover:text-white hover:bg-surface-700'
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
