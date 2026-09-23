import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { Badge } from '../components/Badge';
import { ArrowLeft } from 'lucide-react';

export function TeamSelect() {
  const navigate = useNavigate();
  const { startNewGame } = useGameStore();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [managerName, setManagerName] = useState('');
  const [step, setStep] = useState<'team' | 'name'>('team');

  const handleStart = () => {
    if (!selectedTeamId || !managerName.trim()) return;
    startNewGame(managerName.trim(), selectedTeamId);
    navigate('/season');
  };

  const selectedTeam = LEAGUE_TEAMS.find(t => t.id === selectedTeamId);

  return (
    <div className="min-h-screen bg-surface-950 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <button
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm transition-colors"
          onClick={() => step === 'name' ? setStep('team') : navigate('/')}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {step === 'team' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-1">Choose Your Club</h2>
            <p className="text-slate-400 mb-6">Select the team you'll manage this season.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {LEAGUE_TEAMS.map(team => {
                const selected = team.id === selectedTeamId;
                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`card p-4 flex flex-col items-center gap-2 transition-all hover:border-pitch-700 ${
                      selected ? 'border-pitch-500 bg-pitch-600/10' : ''
                    }`}
                  >
                    <Badge team={team} size="lg" />
                    <div className="text-center">
                      <div className={`font-semibold text-sm ${selected ? 'text-pitch-400' : 'text-white'}`}>
                        {team.name}
                      </div>
                      <div className="text-xs text-slate-500">{team.managerName}</div>
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <div className="h-1 rounded-full bg-surface-600 w-16 overflow-hidden">
                          <div
                            className="h-full bg-pitch-500 rounded-full"
                            style={{ width: `${((team.baseSkill - 40) / 40) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{team.baseSkill}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                className="btn-primary"
                disabled={!selectedTeamId}
                onClick={() => setStep('name')}
              >
                Select Team →
              </button>
            </div>
          </>
        )}

        {step === 'name' && selectedTeam && (
          <div className="max-w-sm mx-auto text-center">
            <Badge team={selectedTeam} size="lg" />
            <h2 className="text-2xl font-bold text-white mt-4 mb-1">{selectedTeam.name}</h2>
            <p className="text-slate-400 text-sm mb-8">Enter your name as the new manager.</p>

            <input
              type="text"
              placeholder="Your name"
              value={managerName}
              maxLength={24}
              onChange={e => setManagerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              className="w-full bg-surface-800 border border-surface-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-pitch-500 text-lg text-center"
            />

            <button
              className="btn-primary w-full mt-4 py-3 text-base"
              disabled={!managerName.trim()}
              onClick={handleStart}
            >
              Start Season 🏆
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
