import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { Badge } from '../components/Badge';
import { ArrowLeft } from 'lucide-react';
import { img } from '../utils/images';

type Step = 'team' | 'portrait' | 'name';

const MALE_PORTRAITS = Array.from({ length: 6 }, (_, i) => `manag${i + 1}`);
const FEMALE_PORTRAITS = Array.from({ length: 4 }, (_, i) => `manak${i + 1}`);
const ALL_PORTRAITS = [...MALE_PORTRAITS, ...FEMALE_PORTRAITS];

export function TeamSelect() {
  const navigate = useNavigate();
  const { startNewGame } = useGameStore();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedPortrait, setSelectedPortrait] = useState<string>('manag1');
  const [managerName, setManagerName] = useState('');
  const [step, setStep] = useState<Step>('team');

  const handleStart = () => {
    if (!selectedTeamId || !managerName.trim()) return;
    startNewGame(managerName.trim(), selectedTeamId, selectedPortrait);
    navigate('/season');
  };

  const selectedTeam = LEAGUE_TEAMS.find(t => t.id === selectedTeamId);

  const handleBack = () => {
    if (step === 'name') setStep('portrait');
    else if (step === 'portrait') setStep('team');
    else navigate('/');
  };

  return (
    <div className="min-h-screen bg-surface-950 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <button
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm transition-colors"
          onClick={handleBack}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Progress indicator */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
          {(['team', 'portrait', 'name'] as Step[]).map((s, i) => {
            const labels = { team: 'Club', portrait: 'Manager', name: 'Name' };
            const done = step === 'portrait' ? s === 'team' : step === 'name' ? s !== 'name' : false;
            const active = step === s;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  color: active ? '#ffffff' : done ? '#4ade80' : '#64748b',
                  fontSize: '12px', fontWeight: active ? 'bold' : 'normal',
                }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? '#1e40af' : done ? '#15803d' : '#1e2535',
                    fontSize: '10px', fontWeight: 'bold', color: '#fff',
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                  {labels[s]}
                </div>
                {i < 2 && <div style={{ width: '24px', height: '1px', background: '#1e2535', marginLeft: '2px' }} />}
              </div>
            );
          })}
        </div>

        {step === 'team' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-1">Choose Your Club</h2>
            <p className="text-slate-400 mb-6">Select the team you'll manage this season.</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                      <div className="text-xs text-slate-500 mt-0.5">{team.managerName}</div>
                      <div className="mt-1.5 flex items-center justify-center gap-1">
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
                onClick={() => {
                  if (selectedTeamId) {
                    setSelectedPortrait(`manag${((selectedTeamId - 1) % 6) + 1}`);
                    setStep('portrait');
                  }
                }}
              >
                Next: Choose Manager →
              </button>
            </div>
          </>
        )}

        {step === 'portrait' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-1">Choose Your Manager</h2>
            <p className="text-slate-400 mb-6">Who's in the dugout?</p>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px', letterSpacing: '1px' }}>MALE MANAGERS</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {MALE_PORTRAITS.map(p => (
                  <PortraitCard key={p} portraitKey={p} selected={selectedPortrait === p} onSelect={setSelectedPortrait} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '8px', letterSpacing: '1px' }}>FEMALE MANAGERS</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {FEMALE_PORTRAITS.map(p => (
                  <PortraitCard key={p} portraitKey={p} selected={selectedPortrait === p} onSelect={setSelectedPortrait} />
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                className="btn-primary"
                onClick={() => setStep('name')}
              >
                Next: Enter Name →
              </button>
            </div>
          </>
        )}

        {step === 'name' && selectedTeam && (
          <div className="max-w-sm mx-auto text-center">
            {/* Selected portrait preview */}
            <div style={{
              width: '120px', height: '120px', margin: '0 auto 16px',
              borderRadius: '12px', overflow: 'hidden',
              border: '2px solid #3b82f6',
              background: '#1a1a3a',
            }}>
              <img
                src={img(`${selectedPortrait}_1.png`)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
                alt=""
              />
            </div>

            <Badge team={selectedTeam} size="xl" />
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

function PortraitCard({ portraitKey, selected, onSelect }: { portraitKey: string; selected: boolean; onSelect: (k: string) => void }) {
  return (
    <button
      onClick={() => onSelect(portraitKey)}
      style={{
        width: '80px', height: '80px',
        borderRadius: '8px', overflow: 'hidden', padding: 0,
        border: `2px solid ${selected ? '#3b82f6' : '#1e2535'}`,
        background: '#1a1a3a',
        cursor: 'pointer',
        boxShadow: selected ? '0 0 12px #3b82f688' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <img
        src={img(`${portraitKey}_1.png`)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }}
        alt={portraitKey}
      />
    </button>
  );
}
