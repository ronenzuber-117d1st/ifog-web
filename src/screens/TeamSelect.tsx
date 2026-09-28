import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import type { Difficulty } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { Badge } from '../components/Badge';
import { ArrowLeft } from 'lucide-react';
import { img } from '../utils/images';

type Step = 'difficulty' | 'team' | 'portrait' | 'name';

const MALE_PORTRAITS   = ['manag1', 'manag2', 'manag3', 'manag4', 'manag5'];
const FEMALE_PORTRAITS = ['manag6', 'manak2', 'manak4'];
const N    = LEAGUE_TEAMS.length;
const HALF = Math.floor(N / 2);

// Per-slot coverflow geometry (index = |distance from center|, capped at 3)
const SLOT_TX      = [0,   210,  370,  490 ];  // translateX (px)
const SLOT_RY      = [0,   48,   63,   72  ];  // rotateY (deg)
const SLOT_SCALE   = [1.0, 0.82, 0.64, 0.55];
const SLOT_OPACITY = [1.0, 0.72, 0.42, 0.0 ];
const SLOT_Z       = [10,  8,    6,    4   ];

function slotStyle(dist: number) {
  const d   = Math.min(Math.abs(dist), 3);
  const sgn = dist < 0 ? -1 : 1;
  return {
    tx:      sgn * SLOT_TX[d],
    ry:     -sgn * SLOT_RY[d],
    scale:   SLOT_SCALE[d],
    opacity: SLOT_OPACITY[d],
    zIndex:  SLOT_Z[d],
  };
}

const DIFFICULTY_OPTIONS: { key: Difficulty; label: string; img: string; balance: string; desc: string; color: string }[] = [
  { key: 'beginner',     label: 'BEGINNER',     img: 'mannsch1.png', balance: '£3,000,000', desc: "More funds, easier opponents. Perfect if you're new to the dugout.", color: '#4ade80' },
  { key: 'intermediate', label: 'INTERMEDIATE', img: 'mannsch2.png', balance: '£2,000,000', desc: 'The classic experience. Balanced challenge for seasoned managers.',   color: '#60a5fa' },
  { key: 'expert',       label: 'EXPERT',       img: 'mannsch3.png', balance: '£750,000',   desc: 'Tough opponents, tight budget. Only the best survive.',                color: '#f87171' },
];

export function TeamSelect() {
  const navigate = useNavigate();
  const { startNewGame } = useGameStore();

  const [step, setStep]             = useState<Step>('difficulty');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [centerIdx, setCenterIdx]   = useState(0);
  const [selectedPortrait, setSelectedPortrait] = useState('manag1');
  const [managerName, setManagerName]           = useState('');

  const selectedTeam = LEAGUE_TEAMS[centerIdx];
  const go = (dir: 1 | -1) => setCenterIdx(i => ((i + dir) % N + N) % N);

  const handleStart = () => {
    if (!managerName.trim() || !difficulty) return;
    startNewGame(managerName.trim(), selectedTeam.id, selectedPortrait, difficulty);
    navigate('/season');
  };

  const handleBack = () => {
    if (step === 'name') setStep('portrait');
    else if (step === 'portrait') setStep('team');
    else if (step === 'team') setStep('difficulty');
    else navigate('/');
  };

  const STEPS: Step[] = ['difficulty', 'team', 'portrait', 'name'];
  const STEP_LABELS: Record<Step, string> = { difficulty: 'Level', team: 'Club', portrait: 'Manager', name: 'Name' };
  const currentStepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-surface-950 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">

        <button
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
          style={{ fontSize: '15px' }}
          onClick={handleBack}
        >
          <ArrowLeft size={18} /> Back
        </button>

        {/* Progress indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {STEPS.map((s, i) => {
            const done = i < currentStepIdx, active = step === s;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: active ? '#fff' : done ? '#4ade80' : '#64748b', fontSize: '14px', fontWeight: active ? 'bold' : 'normal' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? '#1e40af' : done ? '#15803d' : '#1e2535', fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>
                    {done ? '✓' : i + 1}
                  </div>
                  {STEP_LABELS[s]}
                </div>
                {i < STEPS.length - 1 && <div style={{ width: '28px', height: '1px', background: '#1e2535', marginLeft: '2px' }} />}
              </div>
            );
          })}
        </div>

        {/* ── DIFFICULTY ── */}
        {step === 'difficulty' && (
          <>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>Choose Your Level</h2>
            <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '24px' }}>This affects your starting budget and opponent strength.</p>
            <div style={{ display: 'flex', gap: '14px' }}>
              {DIFFICULTY_OPTIONS.map(opt => {
                const selected = difficulty === opt.key;
                return (
                  <button key={opt.key} onClick={() => setDifficulty(opt.key)} style={{ flex: 1, background: selected ? `${opt.color}12` : '#161b27', border: `2px solid ${selected ? opt.color : '#28314a'}`, borderRadius: '12px', padding: 0, cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s', boxShadow: selected ? `0 0 20px ${opt.color}44` : 'none', overflow: 'hidden', textAlign: 'left' }}>
                    <div style={{ background: '#0d1117' }}>
                      <img src={img(opt.img)} style={{ width: '100%', height: 'auto', display: 'block', imageRendering: 'pixelated' }} alt={opt.label} />
                    </div>
                    <div style={{ padding: '14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '2px', color: opt.color, marginBottom: '6px' }}>{opt.label}</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>{opt.balance}</div>
                      <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" style={{ fontSize: '15px', padding: '10px 22px' }} disabled={!difficulty} onClick={() => { if (difficulty) setStep('team'); }}>
                Next: Choose Club →
              </button>
            </div>
          </>
        )}

        {/* ── TEAM COVERFLOW ── */}
        {step === 'team' && (
          <>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>Choose Your Club</h2>
            <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '24px' }}>Browse all {N} clubs — click a card to select it.</p>

            {/* Coverflow stage */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

              <button onClick={() => go(-1)} style={{ flexShrink: 0, width: '52px', height: '52px', borderRadius: '50%', background: '#161b27', border: '2px solid #28314a', color: '#cbd5e1', fontSize: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ‹
              </button>

              {/* Overflow clip */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {/* Relative stage — height matches card */}
                <div style={{ position: 'relative', height: '240px' }}>
                  {LEAGUE_TEAMS.map((team, i) => {
                    const raw  = i - centerIdx;
                    const dist = (((raw % N) + N + HALF) % N) - HALF;
                    const absD = Math.abs(dist);
                    if (absD > 3) return null;

                    const { tx, ry, scale, opacity, zIndex } = slotStyle(dist);
                    const isCenter = dist === 0;

                    return (
                      <div
                        key={team.id}
                        onClick={() => !isCenter && setCenterIdx(i)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: '50%',
                          marginLeft: '-120px',   // half of 240px card width
                          width: '240px',
                          transform: `perspective(900px) translateX(${tx}px) rotateY(${ry}deg) scale(${scale})`,
                          opacity,
                          zIndex,
                          transition: 'transform 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.42s ease',
                          cursor: isCenter ? 'default' : 'pointer',
                          pointerEvents: absD > 2 ? 'none' : 'auto',
                        }}
                      >
                        <TeamCoverCard team={team} active={isCenter} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <button onClick={() => go(1)} style={{ flexShrink: 0, width: '52px', height: '52px', borderRadius: '50%', background: '#161b27', border: '2px solid #28314a', color: '#cbd5e1', fontSize: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ›
              </button>
            </div>

            {/* Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
              {LEAGUE_TEAMS.map((_, i) => (
                <button key={i} onClick={() => setCenterIdx(i)} style={{ width: i === centerIdx ? '20px' : '8px', height: '8px', borderRadius: '4px', border: 'none', padding: 0, cursor: 'pointer', background: i === centerIdx ? '#3b82f6' : '#1e2535', transition: 'width 0.2s ease, background 0.2s ease' }} />
              ))}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>{centerIdx + 1} of {N}</span>
              <button className="btn-primary" style={{ fontSize: '15px', padding: '10px 22px' }} onClick={() => { setSelectedPortrait(`manag${((selectedTeam.id - 1) % 5) + 1}`); setStep('portrait'); }}>
                Select {selectedTeam.name} →
              </button>
            </div>
          </>
        )}

        {/* ── PORTRAIT ── */}
        {step === 'portrait' && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff', marginBottom: '6px' }}>Choose Your Manager</h2>
                <p style={{ fontSize: '16px', color: '#94a3b8' }}>Who's in the dugout?</p>
              </div>
              <button className="btn-primary" style={{ fontSize: '15px', padding: '10px 22px', flexShrink: 0 }} onClick={() => setStep('name')}>
                Next: Enter Name →
              </button>
            </div>
            <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px', letterSpacing: '1px' }}>MALE MANAGERS</div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {MALE_PORTRAITS.map(p => <PortraitCard key={p} portraitKey={p} selected={selectedPortrait === p} onSelect={setSelectedPortrait} />)}
                </div>
              </div>
              <div style={{ width: '1px', background: '#1e2535', alignSelf: 'stretch', marginTop: '28px' }} />
              <div>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px', letterSpacing: '1px' }}>FEMALE MANAGERS</div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {FEMALE_PORTRAITS.map(p => <PortraitCard key={p} portraitKey={p} selected={selectedPortrait === p} onSelect={setSelectedPortrait} />)}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── NAME ── */}
        {step === 'name' && (
          <div style={{ maxWidth: '360px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ width: '130px', height: '130px', margin: '0 auto 18px', borderRadius: '14px', overflow: 'hidden', border: '2px solid #3b82f6', background: '#1a1a3a' }}>
              <img src={img(`${selectedPortrait}_1.png`)} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
            </div>
            <Badge team={selectedTeam} size="xl" />
            <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: '#fff', marginTop: '16px', marginBottom: '6px' }}>{selectedTeam.name}</h2>
            <p style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '28px' }}>Enter your name as the new manager.</p>
            <input type="text" placeholder="Your name" value={managerName} maxLength={24} onChange={e => setManagerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleStart()} className="w-full bg-surface-800 border border-surface-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-pitch-500 text-center" style={{ fontSize: '18px' }} />
            <button className="btn-primary w-full mt-4" style={{ fontSize: '16px', padding: '12px' }} disabled={!managerName.trim()} onClick={handleStart}>
              Start Season 🏆
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function TeamCoverCard({ team, active }: { team: typeof LEAGUE_TEAMS[0]; active: boolean }) {
  const strength = Math.round(((team.baseSkill - 40) / 40) * 100);
  return (
    <div style={{
      width: '240px', height: '240px',
      background: active ? '#1a2035' : '#111827',
      border: `2px solid ${active ? '#3b82f6' : '#1e2535'}`,
      borderRadius: '16px',
      padding: '22px 20px',
      textAlign: 'center',
      boxShadow: active ? '0 8px 32px rgba(59,130,246,0.35), 0 2px 8px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Badge team={team} size="xl" />
      </div>
      <div>
        <div style={{ fontSize: active ? '17px' : '15px', fontWeight: 'bold', color: active ? '#fff' : '#94a3b8', marginBottom: '4px', lineHeight: 1.3 }}>
          {team.name}
        </div>
        <div style={{ fontSize: '12px', color: '#475569', marginBottom: '14px' }}>{team.managerName}</div>
        <div style={{ height: '6px', borderRadius: '3px', background: '#0d1117', overflow: 'hidden', marginBottom: '4px' }}>
          <div style={{ height: '100%', width: `${strength}%`, background: 'linear-gradient(to right, #15803d, #4ade80)', borderRadius: '3px' }} />
        </div>
        <div style={{ fontSize: '11px', color: active ? '#4ade80' : '#475569' }}>Strength {strength}%</div>
      </div>
    </div>
  );
}

function PortraitCard({ portraitKey, selected, onSelect }: { portraitKey: string; selected: boolean; onSelect: (k: string) => void }) {
  return (
    <button onClick={() => onSelect(portraitKey)} style={{ width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', padding: 0, border: `2px solid ${selected ? '#3b82f6' : '#1e2535'}`, background: '#1a1a3a', cursor: 'pointer', boxShadow: selected ? '0 0 18px #3b82f688' : 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}>
      <img src={img(`${portraitKey}_1.png`)} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} alt={portraitKey} />
    </button>
  );
}
