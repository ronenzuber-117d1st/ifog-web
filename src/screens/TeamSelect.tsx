import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import type { Difficulty } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { Badge } from '../components/Badge';
import { img } from '../utils/images';

type Step = 'difficulty' | 'team' | 'portrait' | 'name';

const MALE_PORTRAITS   = ['manag1', 'manag2', 'manag3', 'manag4', 'manag5'];
const FEMALE_PORTRAITS = ['manag6', 'manak2', 'manak4'];
const N    = LEAGUE_TEAMS.length;
const HALF = Math.floor(N / 2);

const SLOT_TX      = [0,   210,  370,  490];
const SLOT_RY      = [0,   48,   63,   72 ];
const SLOT_SCALE   = [1.0, 0.82, 0.64, 0.55];
const SLOT_OPACITY = [1.0, 0.72, 0.42, 0.0];
const SLOT_Z       = [10,  8,    6,    4  ];

function slotStyle(dist: number) {
  const d   = Math.min(Math.abs(dist), 3);
  const sgn = dist < 0 ? -1 : 1;
  return { tx: sgn * SLOT_TX[d], ry: -sgn * SLOT_RY[d], scale: SLOT_SCALE[d], opacity: SLOT_OPACITY[d], zIndex: SLOT_Z[d] };
}

const DIFFICULTY_OPTIONS: { key: Difficulty; label: string; img: string; balance: string; desc: string; color: string }[] = [
  { key: 'beginner',     label: 'Beginner',     img: 'mannsch1.png', balance: '£3,000,000', desc: "More funds, easier opponents.", color: '#4ade80' },
  { key: 'intermediate', label: 'Intermediate', img: 'mannsch2.png', balance: '£2,000,000', desc: 'Balanced challenge for seasoned managers.',   color: '#60a5fa' },
  { key: 'expert',       label: 'Expert',       img: 'mannsch3.png', balance: '£750,000',   desc: 'Tight budget. Only the best survive.',       color: '#f87171' },
];

const STEPS: Step[] = ['difficulty', 'team', 'portrait', 'name'];
const STEP_LABELS: Record<Step, string> = { difficulty: 'Level', team: 'Club', portrait: 'Manager', name: 'Name' };

const BTN_PRIMARY: React.CSSProperties = {
  height: 44, padding: '0 22px', borderRadius: 10, border: 0,
  background: '#c8f53d', color: '#070b16',
  fontFamily: "'Big Shoulders Display', Impact, sans-serif",
  fontWeight: 800, fontSize: 15, letterSpacing: '0.06em', textTransform: 'uppercase',
  cursor: 'pointer', whiteSpace: 'nowrap',
};
const BTN_PRIMARY_DISABLED: React.CSSProperties = {
  ...BTN_PRIMARY, background: '#2a3656', color: '#4b5675', cursor: 'default',
};

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
  const currentStepIdx = STEPS.indexOf(step);

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

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#070b16', overflow: 'hidden', fontFamily: "'Barlow', system-ui, sans-serif", color: '#e8edf7' }}>

      {/* ── Left: map ── */}
      <div style={{ position: 'relative', flexShrink: 0, height: '100%', overflow: 'hidden' }}>
        <img src="/images/mainmenu.jpg" alt="" style={{ height: '100%', width: 'auto', display: 'block' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 160, background: 'linear-gradient(90deg, transparent, #070b16)' }} />
      </div>

      {/* ── Right: content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

        {/* Background glow */}
        <div style={{ position: 'absolute', right: -160, top: -200, width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,245,61,0.08), transparent 65%)', pointerEvents: 'none' }} />

        {/* Header: back + progress */}
        <div style={{ flexShrink: 0, padding: '20px 40px 16px', display: 'flex', alignItems: 'center', gap: 24, borderBottom: '1px solid #1c2640' }}>
          <button
            onClick={handleBack}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: '#8d99b5', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '6px 0', fontFamily: "'Barlow', system-ui, sans-serif", flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/></svg>
            Back
          </button>

          {/* Step progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {STEPS.map((s, i) => {
              const done = i < currentStepIdx, active = step === s;
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: active ? '#c8f53d' : done ? 'rgba(200,245,61,0.2)' : '#1c2640',
                      color: active ? '#070b16' : done ? '#c8f53d' : '#8d99b5',
                    }}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#ffffff' : done ? '#c8f53d' : '#8d99b5' }}>
                      {STEP_LABELS[s]}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 28, height: 1, background: i < currentStepIdx ? '#c8f53d44' : '#1c2640', margin: '0 10px' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px 40px 20px', overflow: 'hidden' }}>

          {/* ── DIFFICULTY ── */}
          {step === 'difficulty' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', justifyContent: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 36, letterSpacing: '0.02em', color: '#fff' }}>Choose Your Level</h2>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#8d99b5' }}>This affects your starting budget and opponent strength.</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {DIFFICULTY_OPTIONS.map(opt => {
                  const selected = difficulty === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setDifficulty(opt.key)}
                      style={{
                        flex: 1, background: selected ? `${opt.color}10` : '#0f1628',
                        border: `2px solid ${selected ? opt.color : '#1c2640'}`,
                        borderRadius: 14, padding: 0, cursor: 'pointer',
                        boxShadow: selected ? `0 0 24px ${opt.color}33` : 'none',
                        overflow: 'hidden', textAlign: 'left',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <div style={{ height: 240, background: '#070b16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={img(opt.img)} style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated', display: 'block' }} alt={opt.label} />
                      </div>
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: opt.color, marginBottom: 4 }}>{opt.label}</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color: '#fff', marginBottom: 6 }}>{opt.balance}</div>
                        <div style={{ fontSize: 12, color: '#8d99b5', lineHeight: 1.5 }}>{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  style={difficulty ? BTN_PRIMARY : BTN_PRIMARY_DISABLED}
                  disabled={!difficulty}
                  onClick={() => { if (difficulty) setStep('team'); }}
                >
                  Next: Choose Club →
                </button>
              </div>
            </div>
          )}

          {/* ── TEAM COVERFLOW ── */}
          {step === 'team' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', justifyContent: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 36, letterSpacing: '0.02em', color: '#fff' }}>Choose Your Club</h2>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#8d99b5' }}>Browse all {N} clubs.</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => go(-1)} style={{ flexShrink: 0, width: 44, height: 44, borderRadius: '50%', background: '#0f1628', border: '1px solid #1c2640', color: '#cbd5e1', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ position: 'relative', height: 220 }}>
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
                            position: 'absolute', top: 0, left: '50%', marginLeft: '-110px',
                            width: 220,
                            transform: `perspective(900px) translateX(${tx}px) rotateY(${ry}deg) scale(${scale})`,
                            opacity, zIndex,
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

                <button onClick={() => go(1)} style={{ flexShrink: 0, width: 44, height: 44, borderRadius: '50%', background: '#0f1628', border: '1px solid #1c2640', color: '#cbd5e1', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
              </div>

              {/* Dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 5 }}>
                {LEAGUE_TEAMS.map((_, i) => (
                  <button key={i} onClick={() => setCenterIdx(i)} style={{ width: i === centerIdx ? 18 : 6, height: 6, borderRadius: 3, border: 'none', padding: 0, cursor: 'pointer', background: i === centerIdx ? '#c8f53d' : '#1c2640', transition: 'width 0.2s ease, background 0.2s ease' }} />
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#8d99b5' }}>{centerIdx + 1} of {N}</span>
                <button style={BTN_PRIMARY} onClick={() => { setSelectedPortrait(`manag${((selectedTeam.id - 1) % 5) + 1}`); setStep('portrait'); }}>
                  Select {selectedTeam.name} →
                </button>
              </div>
            </div>
          )}

          {/* ── PORTRAIT ── */}
          {step === 'portrait' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', justifyContent: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 36, letterSpacing: '0.02em', color: '#fff' }}>Choose Your Manager</h2>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#8d99b5' }}>Who's in the dugout?</p>
              </div>

              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8d99b5', marginBottom: 10 }}>Male Managers</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {MALE_PORTRAITS.map(p => <PortraitCard key={p} portraitKey={p} selected={selectedPortrait === p} onSelect={setSelectedPortrait} />)}
                  </div>
                </div>
                <div style={{ width: 1, background: '#1c2640', alignSelf: 'stretch', marginTop: 24 }} />
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8d99b5', marginBottom: 10 }}>Female Managers</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {FEMALE_PORTRAITS.map(p => <PortraitCard key={p} portraitKey={p} selected={selectedPortrait === p} onSelect={setSelectedPortrait} />)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16 }}>
                <button style={BTN_PRIMARY} onClick={() => setStep('name')}>Next: Enter Name →</button>
              </div>
            </div>
          )}

          {/* ── NAME ── */}
          {step === 'name' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, height: '100%' }}>
              <div style={{ width: 110, height: 110, borderRadius: 14, overflow: 'hidden', border: '2px solid #1c2640', background: '#0f1628' }}>
                <img src={img(`${selectedPortrait}_1.png`)} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
              </div>
              <Badge team={selectedTeam} size="xl" />
              <h2 style={{ margin: 0, fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 30, color: '#fff', letterSpacing: '0.02em' }}>{selectedTeam.name}</h2>
              <p style={{ margin: 0, fontSize: 14, color: '#8d99b5' }}>Enter your name as the new manager.</p>
              <input
                type="text"
                placeholder="Your name"
                value={managerName}
                maxLength={24}
                onChange={e => setManagerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                style={{
                  width: 300, padding: '11px 16px', background: '#0f1628', border: '1px solid #1c2640',
                  borderRadius: 10, color: '#ffffff', fontSize: 17, textAlign: 'center',
                  outline: 'none', fontFamily: "'Barlow', system-ui, sans-serif",
                }}
              />
              <button
                style={managerName.trim() ? BTN_PRIMARY : BTN_PRIMARY_DISABLED}
                disabled={!managerName.trim()}
                onClick={handleStart}
              >
                Start Season →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function TeamCoverCard({ team, active }: { team: typeof LEAGUE_TEAMS[0]; active: boolean }) {
  const strength = Math.round(((team.baseSkill - 40) / 40) * 100);
  return (
    <div style={{
      width: 220, height: 220,
      background: active ? '#0f1628' : '#0a0e1a',
      border: `2px solid ${active ? '#c8f53d' : '#1c2640'}`,
      borderRadius: 16, padding: '18px 16px', textAlign: 'center',
      boxShadow: active ? '0 8px 32px rgba(200,245,61,0.18), 0 2px 8px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: "'Barlow', system-ui, sans-serif",
    }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Badge team={team} size="xl" />
      </div>
      <div style={{ width: '100%' }}>
        <div style={{ fontSize: active ? 16 : 14, fontWeight: 700, color: active ? '#fff' : '#8d99b5', marginBottom: 2, lineHeight: 1.3 }}>{team.name}</div>
        <div style={{ fontSize: 11, color: '#4b5675', marginBottom: 10 }}>{team.managerName}</div>
        <div style={{ height: 5, borderRadius: 3, background: '#1c2640', overflow: 'hidden', marginBottom: 3 }}>
          <div style={{ height: '100%', width: `${strength}%`, background: active ? '#c8f53d' : '#3a4768', borderRadius: 3 }} />
        </div>
        <div style={{ fontSize: 10, color: active ? '#c8f53d' : '#4b5675', letterSpacing: '0.08em' }}>Strength {strength}%</div>
      </div>
    </div>
  );
}

function PortraitCard({ portraitKey, selected, onSelect }: { portraitKey: string; selected: boolean; onSelect: (k: string) => void }) {
  return (
    <button
      onClick={() => onSelect(portraitKey)}
      style={{
        width: 100, height: 100, borderRadius: 12, overflow: 'hidden', padding: 0,
        border: `2px solid ${selected ? '#c8f53d' : '#1c2640'}`,
        background: '#0f1628', cursor: 'pointer',
        boxShadow: selected ? '0 0 16px rgba(200,245,61,0.35)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <img src={img(`${portraitKey}_1.png`)} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} alt={portraitKey} />
    </button>
  );
}
