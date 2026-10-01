import { useState, useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';
import type { Formation, Position } from '../types/game';

type MainTab = 'team' | 'training' | 'statistics' | 'photo';

/* ─── constants ─────────────────────────────────────── */
const FORMATIONS: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '5-3-2', '4-5-1'];
const STYLES = ['Cautious', 'Balanced', 'Aggressive'];
const POS_LABEL: Record<Position, string> = { T: 'GK', V: 'DEF', M: 'MID', S: 'FWD' };
const POS_COLOR: Record<Position, string> = { T: '#f5b94a', V: '#7fb2ff', M: '#5fd49a', S: '#ff7a6b' };
const POS_ORDER: Position[] = ['T', 'V', 'M', 'S'];
const POS_Y: Record<string, number> = { GK: 90, DEF: 70, MID: 47, FWD: 23 };

const FOCUS_CFG = [
  { label: 'Massage', title: 'Massage & Relaxation', color: '#5fd49a', desc: 'Keeps morale up and tired legs fresh. Lifts motivation.', base: 'massage' },
  { label: 'Skills',  title: 'Skills & Scoring',     color: '#7fb2ff', desc: 'Drills in front of goal. Lifts skills.',                  base: 'technik' },
  { label: 'Shape',   title: 'Shape',                 color: '#f5b94a', desc: 'Running, weights, the works. Lifts fitness and shape.',   base: 'kondi' },
];
function focusImg(base: string, units: number) {
  return `${base}${units <= 3 ? 1 : units <= 6 ? 2 : 3}.png`;
}

function getPlayerSprite(position: Position, idx: number): string {
  if (position === 'T') return `torwart${(idx % 4) + 1}.png`;
  if (position === 'V') return `vertei${(idx % 4) + 1}.png`;
  if (position === 'M') return `mittelf${(idx % 4) + 1}.png`;
  if (position === 'S') return `sturm${(idx % 4) + 1}.png`;
  return 'spieler0.png';
}
function fitColor(v: number) { return v >= 85 ? '#5fd49a' : v >= 75 ? '#f5c76b' : '#ff7a6b'; }
function ordinal(n: number) {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  const s = ['th','st','nd','rd'];
  return s[n % 10] ?? 'th';
}

/* ─── component ─────────────────────────────────────── */
export function TeamManagement() {
  const {
    managedTeamId, rosters, formation, setFormation, table,
    trainingMassage, trainingSkills, trainingShape, setTraining,
    startingXI, setStartingXI,
  } = useGameStore();

  const [mainTab, setMainTab]   = useState<MainTab>('team');
  const [styleIdx, setStyleIdx] = useState(2); // Aggressive default
  const [focusIdx, setFocusIdx] = useState(0);
  const [statsPos, setStatsPos] = useState<string>('All');
  const [sortKey, setSortKey]   = useState<string>('idx');
  const [sortDir, setSortDir]   = useState<1 | -1>(1);
  const [confirmed, setConfirmed] = useState(false);

  const players = rosters[managedTeamId] ?? [];
  const tablePos = table.findIndex(r => r.teamId === managedTeamId) + 1;

  /* ── XI (auto-computed per formation) ── */
  const formLines = formation.split('-').map(Number);
  const formNeed: Record<string, number> = { GK: 1, DEF: formLines[0], MID: formLines[1], FWD: formLines[2] };

  const sel = new Set(startingXI ?? []);

  const toggle = (id: string, injured: boolean) => {
    if (injured) return;
    const next = sel.has(id)
      ? startingXI.filter(i => i !== id)
      : [...startingXI, id];
    setStartingXI(next);
  };

  const groups = POS_ORDER.map(pos => {
    const label = POS_LABEL[pos];
    const ps = players.filter(p => p.position === pos);
    const picked = ps.filter(p => sel.has(p.id)).length;
    return { pos, label, color: POS_COLOR[pos], need: formNeed[label], picked, players: ps };
  });

  const xiCount = sel.size;
  const badGroups = groups.filter(g => g.picked !== g.need);
  const xiOk = xiCount === 11 && badGroups.length === 0;
  const xiWarn = xiCount !== 11
    ? `${xiCount}/11 selected — pick exactly 11`
    : `${formation} needs ${badGroups.map(g => `${g.need} ${g.label}`).join(', ')}`;

  /* XI pitch dots */
  const xiDots = useMemo(() => {
    const dots: { n: string; s: number; num: number; x: number; y: number }[] = [];
    groups.forEach(g => {
      const chosen = g.players.filter(p => sel.has(p.id));
      chosen.forEach((p, i) => {
        dots.push({ n: p.name, s: p.skill, num: p.shirtNumber ?? 0, x: ((i + 1) / (chosen.length + 1)) * 100, y: POS_Y[g.label] });
      });
    });
    return dots;
  }, [sel, groups]);

  /* ── Training ── */
  const tv = { massage: trainingMassage, skills: trainingSkills, shape: trainingShape };
  const used = trainingMassage + trainingSkills + trainingShape;
  const remaining = 7 - used;

  const motivation = Math.min(100, Math.round(50 + trainingMassage * 5));
  const skillStat  = Math.min(100, Math.round(50 + trainingSkills * 5));
  const shapeStat  = Math.min(100, Math.round(50 + trainingShape * 5));
  const overall    = Math.round((motivation + skillStat + shapeStat) / 3);
  const condBars = [{ label: 'Motivation', v: motivation, color: '#5fd49a' }, { label: 'Skills', v: skillStat, color: '#7fb2ff' }, { label: 'Shape', v: shapeStat, color: '#f5b94a' }];

  const adjustTraining = (key: 'massage' | 'skills' | 'shape', delta: number) => {
    const cur = tv[key];
    const next = Math.max(0, Math.min(7, cur + delta));
    if (delta > 0 && remaining <= 0) return;
    setTraining(key, next);
    setConfirmed(false);
  };

  /* ── Statistics ── */
  const salary = (skill: number) => Math.round(skill * 800 + 5000);
  const POS_SORT: Record<Position, number> = { T: 0, V: 1, M: 2, S: 3 };
  const allStats = players.map((p, i) => ({
    idx: i, ...p, sal: salary(p.skill), fit: Math.min(100, Math.round(50 + trainingShape * 5)),
    goals: p.goals ?? 0,
    posOrder: POS_SORT[p.position],
  }));
  const filteredStats = allStats.filter(p => statsPos === 'All' || POS_LABEL[p.position] === statsPos);
  const sortedStats = [...filteredStats].sort((a: any, b: any) => {
    const av = a[sortKey], bv = b[sortKey];
    return (av > bv ? 1 : av < bv ? -1 : 0) * sortDir;
  });
  const totalWages = allStats.reduce((s, p) => s + p.sal, 0);
  const avgAge = (allStats.reduce((s, p) => s + p.age, 0) / (allStats.length || 1)).toFixed(1);
  const topScorer = [...allStats].sort((a, b) => b.goals - a.goals)[0];
  const injured = allStats.filter(p => p.injuredFor > 0);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(key === 'n' || key === 'idx' ? 1 : -1); }
  };

  /* ── Photo ── */
  const photoSrc  = tablePos <= 6 ? 'teamphoto_expert.png' : tablePos <= 13 ? 'teamphoto_intermediate.png' : 'teamphoto_beginner.png';
  const photoLevel = tablePos <= 6 ? 2 : tablePos <= 13 ? 1 : 0;
  const levelNames = ['Beginner', 'Intermediate', 'Expert'];
  const levelColors = ['#a9b3cb', '#f5c76b', '#c8f53d'];
  const photoDesc = tablePos <= 6 ? 'Top of the table — this squad is flying.' : tablePos <= 13 ? 'Mid-table. Plenty of season left to climb.' : 'Struggling — the fans are worried.';

  /* ── formation nav ── */
  const formIdx = FORMATIONS.indexOf(formation);
  const prevForm = () => setFormation(FORMATIONS[(formIdx - 1 + FORMATIONS.length) % FORMATIONS.length]);
  const nextForm = () => setFormation(FORMATIONS[(formIdx + 1) % FORMATIONS.length]);

  const MAIN_TABS: { key: MainTab; label: string }[] = [
    { key: 'team', label: 'Team' }, { key: 'training', label: 'Training' },
    { key: 'statistics', label: 'Statistics' }, { key: 'photo', label: 'Team Photo' },
  ];

  return (
    <Layout>
      <div style={{ height: '100%', background: '#070b16', fontFamily: "'Barlow', system-ui, sans-serif", color: '#e8edf7', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Sub-tab bar */}
        <div style={{ flexShrink: 0, height: 52, display: 'flex', alignItems: 'stretch', gap: 4, padding: '0 28px', borderBottom: '1px solid #1c2640', background: '#0a0f1d' }}>
          {MAIN_TABS.map(({ key, label }) => {
            const active = mainTab === key;
            return (
              <button key={key} onClick={() => setMainTab(key)} style={{ display: 'flex', alignItems: 'center', padding: '0 18px', background: 'transparent', border: 'none', boxShadow: active ? 'inset 0 -3px 0 #c8f53d' : 'none', color: active ? '#ffffff' : '#8d99b5', fontWeight: active ? 700 : 600, fontSize: 15, cursor: 'pointer', fontFamily: "'Barlow', system-ui, sans-serif" }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* ══════════ TEAM TAB ══════════ */}
        {mainTab === 'team' && (
          <main style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 20, padding: '18px 28px 22px', overflow: 'hidden' }}>

            {/* Left: controls + player grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>

              {/* Control bar */}
              <div style={{ height: 60, flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 36, padding: '0 20px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
                {/* Formation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Formation</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <NavBtn onClick={prevForm}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg></NavBtn>
                    <div style={{ minWidth: 72, textAlign: 'center', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 28, color: '#c8f53d' }}>{formation}</div>
                    <NavBtn onClick={nextForm}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg></NavBtn>
                  </div>
                </div>
                {/* Style */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Style</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <NavBtn onClick={() => setStyleIdx(i => (i - 1 + 3) % 3)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg></NavBtn>
                    <div style={{ minWidth: 96, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{STYLES[styleIdx]}</div>
                    <NavBtn onClick={() => setStyleIdx(i => (i + 1) % 3)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg></NavBtn>
                  </div>
                </div>
                <div style={{ flexGrow: 1 }} />
                {/* XI status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 10, background: xiOk ? 'rgba(200,245,61,0.12)' : 'rgba(245,185,74,0.14)', color: xiOk ? '#c8f53d' : '#f5c76b', fontWeight: 700, fontSize: 14 }}>
                  {xiOk
                    ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg>Starting XI ready · {xiCount}/11</>
                    : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v5"/><path d="M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg>{xiWarn}</>
                  }
                </div>
              </div>

              {/* Player grid */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                {groups.map(g => (
                  <div key={g.pos} style={{ display: 'grid', gridTemplateColumns: '64px minmax(0,1fr)', gap: 12, alignItems: 'stretch' }}>
                    {/* Position label */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, paddingLeft: 4 }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: g.color }}>{g.label}</div>
                      <div style={{ fontSize: 12, color: '#8d99b5' }}>{g.picked}/{g.need}</div>
                    </div>
                    {/* Cards */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {g.players.map((player, idx) => {
                        const inXI = sel.has(player.id);
                        const injured = (player.injuredFor ?? 0) > 0;
                        const suspended = player.suspended ?? false;
                        const unavailable = injured || suspended;
                        const fit = Math.min(100, Math.round(50 + trainingShape * 5));
                        return (
                          <button
                            key={player.id}
                            onClick={() => toggle(player.id, unavailable)}
                            style={{ position: 'relative', display: 'flex', flexDirection: 'column', padding: 0, borderRadius: 12, overflow: 'hidden', border: `2px solid ${inXI ? '#c8f53d' : '#1c2640'}`, background: '#0f1628', color: '#e8edf7', textAlign: 'left', opacity: inXI ? 1 : (unavailable ? 0.7 : 0.62), cursor: unavailable ? 'default' : 'pointer', width: 136, flexShrink: 0 }}
                          >
                            {/* Image area */}
                            <div style={{ position: 'relative', width: '100%', height: 72, background: '#1040f8' }}>
                              <img src={img(getPlayerSprite(player.position, idx))} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated', display: 'block' }} />
                              {/* Fitness badge */}
                              <div style={{ position: 'absolute', left: 6, top: 6, padding: '1px 6px', borderRadius: 5, background: 'rgba(7,11,22,0.85)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: fitColor(fit) }}>{fit}%</div>
                              {/* XI check */}
                              {inXI && !unavailable && <div style={{ position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: '50%', background: '#c8f53d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#070b16" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg></div>}
                              {/* Yellow card pips */}
                              {(player.yellowCards ?? 0) > 0 && !unavailable && (
                                <div style={{ position: 'absolute', right: 6, bottom: 6, display: 'flex', gap: 3 }}>
                                  {Array.from({ length: player.yellowCards ?? 0 }).map((_, i) => (
                                    <div key={i} style={{ width: 8, height: 11, borderRadius: 1, background: '#f5c76b', border: '1px solid rgba(0,0,0,0.4)' }} />
                                  ))}
                                </div>
                              )}
                              {/* Injured overlay */}
                              {injured && <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,11,22,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: '#e8484d', color: '#fff', fontSize: 12, fontWeight: 700 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>Injured</div></div>}
                              {/* Suspended overlay */}
                              {suspended && <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,11,22,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: '#e8484d', color: '#fff', fontSize: 12, fontWeight: 700 }}><div style={{ width: 8, height: 11, borderRadius: 1, background: '#fff', border: '1px solid rgba(0,0,0,0.3)', flexShrink: 0 }} />Suspended</div></div>}
                            </div>
                            {/* Name + skill */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4, padding: '7px 8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 11, color: g.color, flexShrink: 0 }}>{player.shirtNumber ?? '—'}</div>
                                <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                                <span style={{ fontSize: 10, color: '#f5c76b' }}>★</span>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: '#f5c76b' }}>{player.skill}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right sidebar */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
              {/* Team condition */}
              <ConditionCard condBars={condBars} overall={overall} />
              {/* Starting XI pitch */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: '18px 20px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Starting XI</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: '#c8f53d' }}>{formation}</div>
                </div>
                <Pitch dots={xiDots} />
              </div>
            </aside>
          </main>
        )}

        {/* ══════════ TRAINING TAB ══════════ */}
        {mainTab === 'training' && (
          <main style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '460px minmax(0,1fr) 380px', gridTemplateRows: '1fr 52px', columnGap: 20, rowGap: 12, padding: '18px 28px 22px', overflow: 'hidden' }}>

            {/* Left: focus selector + image + title — spans both rows */}
            <div style={{ gridColumn: 1, gridRow: '1 / 3', display: 'flex', flexDirection: 'column', gap: 14, padding: 18, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', overflow: 'hidden' }}>
              {/* Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6, padding: 4, borderRadius: 12, background: '#0a0f1d', flexShrink: 0 }}>
                {FOCUS_CFG.map((f, i) => (
                  <button key={i} onClick={() => setFocusIdx(i)} style={{ height: 44, borderRadius: 9, border: 0, background: focusIdx === i ? f.color : 'transparent', color: focusIdx === i ? '#070b16' : '#a9b3cb', fontWeight: focusIdx === i ? 700 : 600, fontSize: 15, cursor: 'pointer', fontFamily: "'Barlow', system-ui, sans-serif" }}>
                    {f.label}
                  </button>
                ))}
              </div>
              {/* Image */}
              <div style={{ position: 'relative', height: 200, borderRadius: 12, overflow: 'hidden', background: '#131c33', flexShrink: 0 }}>
                <img src={img(focusImg(FOCUS_CFG[focusIdx].base, tv[(['massage', 'skills', 'shape'] as const)[focusIdx]]))} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} />
              </div>
              {/* Title + desc */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 28, textTransform: 'uppercase', lineHeight: 1, color: FOCUS_CFG[focusIdx].color }}>{FOCUS_CFG[focusIdx].title}</div>
                <div style={{ fontSize: 15, color: '#a9b3cb', lineHeight: 1.45 }}>{FOCUS_CFG[focusIdx].desc}</div>
              </div>
            </div>

            {/* Center: allocation — row 1 */}
            <div style={{ gridColumn: 2, gridRow: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 20px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', overflow: 'hidden', minHeight: 0 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Training units</div>
                  <div style={{ fontSize: 14, color: '#8d99b5' }}>Split this week's 7 units across the three areas.</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 56, lineHeight: 0.9, color: remaining === 0 ? '#c8f53d' : '#f5c76b' }}>{remaining}</div>
                    <div style={{ fontSize: 13, color: '#8d99b5' }}>left</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#3d4f72' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
                    7 / 10 max · upgrade facilities to unlock more
                  </div>
                </div>
              </div>
              {/* Rows */}
              {([
                { key: 'massage' as const, label: 'Massage & relaxation', color: '#5fd49a', fi: 0 },
                { key: 'skills'  as const, label: 'Skills & scoring',     color: '#7fb2ff', fi: 1 },
                { key: 'shape'   as const, label: 'Shape',                color: '#f5b94a', fi: 2 },
              ]).map(({ key, label, color, fi }) => {
                const v = tv[key];
                const focused = focusIdx === fi;
                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 12, background: focused ? '#131c33' : 'transparent', border: `1px solid ${focused ? color : '#1c2640'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{label}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color }}>{v}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) 44px', gap: 12, alignItems: 'center' }}>
                      <TrainBtn onClick={() => { adjustTraining(key, -1); setFocusIdx(fi); }} disabled={v <= 0}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12h14"/></svg></TrainBtn>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 4 }}>
                        {Array.from({ length: 7 }, (_, k) => (
                          <div key={k} style={{ height: 14, borderRadius: 3, background: k < v ? color : '#1f2945' }} />
                        ))}
                      </div>
                      <TrainBtn onClick={() => { adjustTraining(key, 1); setFocusIdx(fi); }} disabled={remaining <= 0 || v >= 7}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg></TrainBtn>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Confirm Training button — row 2, col 2 */}
            <button
              onClick={() => setConfirmed(true)}
              style={{ gridColumn: 2, gridRow: 2, borderRadius: 12, border: '2px solid transparent', background: confirmed ? '#8d99b5' : '#c8f53d', color: '#070b16', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {confirmed ? '✓ Training confirmed' : 'Confirm training'}
            </button>

            {/* Right: condition + practice match — row 1 */}
            <aside style={{ gridColumn: 3, gridRow: 1, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, overflow: 'hidden' }}>
              <ConditionCard condBars={condBars} overall={overall} />
              {/* Practice match card — no button here */}
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', overflow: 'hidden', minHeight: 0 }}>
                <div style={{ position: 'relative', height: 170, flexShrink: 0 }}>
                  <img src={img('freund.png')} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated', display: 'block' }} />
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 70, background: 'linear-gradient(180deg, rgba(15,22,40,0), #0f1628)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 20px 16px', flexGrow: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 26, textTransform: 'uppercase', lineHeight: 1 }}>Practice Match</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16, color: '#f5c76b' }}>£87,300</div>
                  </div>
                  <div style={{ fontSize: 14, color: '#a9b3cb', lineHeight: 1.45 }}>A friendly at your ground. Costs cash, gets the lads match-sharp.</div>
                </div>
              </div>
            </aside>

            {/* Book Practice Match button — row 2, col 3 */}
            <button
              style={{ gridColumn: 3, gridRow: 2, borderRadius: 12, border: '2px solid #c8f53d', background: 'transparent', color: '#c8f53d', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Book practice match
            </button>

          </main>
        )}

        {/* ══════════ STATISTICS TAB ══════════ */}
        {mainTab === 'statistics' && (
          <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16, padding: '18px 28px 22px', overflow: 'hidden' }}>
            {/* Stat tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, flexShrink: 0 }}>
              {[
                { label: 'Squad', v: String(players.length), sub: `${injured.length} injured`, color: '#ffffff', subColor: injured.length > 0 ? '#ff7a6b' : '#6b7797' },
                { label: 'Average Age', v: avgAge, sub: 'years', color: '#ffffff' },
                { label: 'Wage Bill', v: `£${totalWages.toLocaleString()}`, sub: 'total salaries', color: '#c8f53d' },
                { label: 'Top Scorer', v: (topScorer?.goals ?? 0) > 0 ? (topScorer?.name ?? '—') : '—', sub: (topScorer?.goals ?? 0) > 0 ? `${topScorer!.goals} goal${topScorer!.goals !== 1 ? 's' : ''}` : 'No goals yet', color: '#ff8a83' },
              ].map((t: any) => (
                <div key={t.label} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 18px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
                  <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>{t.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 32, lineHeight: 1, color: t.color }}>{t.v}</div>
                    <div style={{ fontSize: 13, color: t.subColor ?? '#8d99b5' }}>{t.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Table */}
            <section style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 18px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', overflow: 'hidden' }}>
              {/* Filter chips */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {['All', 'GK', 'DEF', 'MID', 'FWD'].map(k => {
                  const on = statsPos === k;
                  return (
                    <button key={k} onClick={() => setStatsPos(k)} style={{ height: 36, padding: '0 16px', borderRadius: 18, border: `1px solid ${on ? '#e8edf7' : '#2a3656'}`, background: on ? '#e8edf7' : 'transparent', color: on ? '#070b16' : '#a9b3cb', fontWeight: on ? 700 : 600, fontSize: 13, cursor: 'pointer', fontFamily: "'Barlow', system-ui, sans-serif" }}>
                      {k}
                    </button>
                  );
                })}
                <div style={{ flexGrow: 1 }} />
                <div style={{ fontSize: 12, color: '#6b7797' }}>Click a column to sort</div>
              </div>
              {/* Col headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) 70px 170px 120px 70px 70px 110px', gap: 12, padding: '0 12px', height: 30, alignItems: 'center', borderBottom: '1px solid #1c2640', flexShrink: 0 }}>
                {[
                  { label: '', key: '', al: 'left' },
                  { label: 'Player', key: 'name', al: 'left' },
                  { label: 'Pos', key: 'posOrder', al: 'left' },
                  { label: 'Skill', key: 'skill', al: 'left' },
                  { label: 'Fitness', key: 'fit', al: 'right' },
                  { label: 'Age', key: 'age', al: 'right' },
                  { label: 'Goals', key: 'goals', al: 'right' },
                  { label: 'Salary', key: 'sal', al: 'right' },
                ].map((h, i) => (
                  <button key={i} onClick={() => h.key && handleSort(h.key)} style={{ height: 30, padding: 0, border: 0, background: 'transparent', color: (h.key && sortKey === h.key) ? '#c8f53d' : '#6b7797', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: h.al as any, cursor: h.key ? 'pointer' : 'default', fontFamily: "'Barlow', system-ui, sans-serif" }}>
                    {h.label}{h.key && sortKey === h.key ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                  </button>
                ))}
              </div>
              {/* Rows */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sortedStats.map((p, i) => {
                  const posLabel = POS_LABEL[p.position];
                  const posColor = POS_COLOR[p.position];
                  return (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) 70px 170px 120px 70px 70px 110px', gap: 12, alignItems: 'center', height: 31, padding: '0 12px', borderRadius: 6, background: i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                      <div style={{ width: 30, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, color: posColor }}>{p.shirtNumber ?? '—'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {p.name}
                        {p.injuredFor > 0 && <span style={{ padding: '0 6px', borderRadius: 4, background: '#e8484d', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', lineHeight: '16px' }}>INJ</span>}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: posColor }}>{posLabel}</div>
                      {/* Skill bar */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 20px', gap: 8, alignItems: 'center' }}>
                        <div style={{ height: 6, borderRadius: 3, background: '#1f2945', overflow: 'hidden' }}>
                          <div style={{ height: 6, width: `${p.skill * 10}%`, background: posColor, borderRadius: 3 }} />
                        </div>
                        <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13 }}>{p.skill}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: fitColor(p.fit) }}>{p.fit}%</div>
                      <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#c2cbe0' }}>{p.age}</div>
                      <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: p.goals ? 700 : 400, color: p.goals ? '#ffffff' : '#6b7797' }}>{p.goals}</div>
                      <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#c8f53d' }}>£{p.sal.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          </main>
        )}

        {/* ══════════ TEAM PHOTO TAB ══════════ */}
        {mainTab === 'photo' && (
          <main style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 400px', gap: 20, padding: '18px 28px 22px', overflow: 'hidden' }}>
            {/* Photo */}
            <section style={{ position: 'relative', borderRadius: 16, background: '#0a0f1d', border: '1px solid #1c2640', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 60% at 50% 45%, rgba(200,245,61,0.08), transparent 70%)' }} />
              <figure style={{ position: 'relative', margin: 0, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', height: '100%', boxSizing: 'border-box', minHeight: 0 }}>
                <div style={{ flex: 1, minHeight: 0, borderRadius: 14, overflow: 'hidden', border: '6px solid #e8edf7', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', transform: 'rotate(-1deg)' }}>
                  <img src={img(photoSrc)} alt="Team photo" style={{ width: 'auto', height: '100%', maxWidth: '100%', objectFit: 'contain', imageRendering: 'pixelated', display: 'block' }} />
                </div>
                <figcaption style={{ fontSize: 14, color: '#8d99b5', flexShrink: 0 }}>
                  {useGameStore.getState().rosters[managedTeamId] ? (useGameStore.getState() as any).managerName : ''} · Season 1994/95
                </figcaption>
              </figure>
            </section>

            {/* Right sidebar */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* League position */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 22, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
                <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>League position</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 72, lineHeight: 0.9 }}>{tablePos}<span style={{ fontSize: 36 }}>{ordinal(tablePos)}</span></div>
                  <div style={{ fontSize: 15, color: '#a9b3cb' }}>of 20</div>
                </div>
                <div style={{ fontSize: 15, color: '#c2cbe0' }}>{photoDesc}</div>
              </div>
              {/* Club level */}
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: 22, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
                <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Club level</div>
                <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 40, textTransform: 'uppercase', lineHeight: 1, color: levelColors[photoLevel] }}>{levelNames[photoLevel]}</div>
                <div style={{ fontSize: 14, color: '#8d99b5', lineHeight: 1.45 }}>Your team photo changes as the club moves up a level.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 6 }}>
                  {levelNames.map((name, i) => {
                    const done = photoLevel > i;
                    const current = photoLevel === i;
                    const locked = photoLevel < i;
                    const color = done ? '#5fd49a' : current ? levelColors[i] : '#2a3656';
                    return (
                      <div key={i}>
                        <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,1fr)', gap: 14, alignItems: 'center', minHeight: 56 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? '#5fd49a' : current ? levelColors[i] : 'transparent', border: locked ? '2px solid #2a3656' : 'none', boxShadow: current ? `0 0 0 5px ${levelColors[i]}33` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', color: locked ? '#6b7797' : 'transparent' }}>
                            {done && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#070b16" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg>}
                            {locked && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ fontWeight: 700, fontSize: 16, color: locked ? '#6b7797' : '#ffffff' }}>{name}</div>
                            <div style={{ fontSize: 12, color: done ? '#6b7797' : current ? levelColors[i] : '#6b7797' }}>{done ? 'Completed' : current ? 'Current level' : 'Locked'}</div>
                          </div>
                        </div>
                        {i < levelNames.length - 1 && <div style={{ marginLeft: 13, width: 2, height: 16, background: '#2a3656' }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          </main>
        )}
      </div>
    </Layout>
  );
}

/* ─── sub-components ────────────────────────────────── */
function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #2a3656', background: '#131c33', color: '#e8edf7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      {children}
    </button>
  );
}

function TrainBtn({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid #2a3656', background: '#131c33', color: disabled ? '#3a4768' : '#e8edf7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'default' : 'pointer' }}>
      {children}
    </button>
  );
}

function ConditionCard({ condBars, overall }: { condBars: { label: string; v: number; color: string }[]; overall: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 20px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Team condition</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 22, color: '#c8f53d' }}>{overall}%</div>
      </div>
      {condBars.map(c => (
        <div key={c.label} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0,1fr) 44px', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: 14, color: '#c2cbe0', fontWeight: 600 }}>{c.label}</div>
          <div style={{ height: 10, borderRadius: 5, background: '#1f2945', overflow: 'hidden' }}>
            <div style={{ height: 10, width: `${c.v}%`, background: c.color, borderRadius: 5 }} />
          </div>
          <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{c.v}%</div>
        </div>
      ))}
    </div>
  );
}

function Pitch({ dots }: { dots: { n: string; s: number; num: number; x: number; y: number }[] }) {
  return (
    <div style={{ flex: 1, position: 'relative', borderRadius: 12, overflow: 'hidden', background: 'repeating-linear-gradient(180deg, #16502f 0 40px, #185935 40px 80px)', border: '1px solid #23704a' }}>
      {/* Pitch markings */}
      <div style={{ position: 'absolute', inset: 12, border: '2px solid rgba(255,255,255,0.32)', borderRadius: 4 }} />
      <div style={{ position: 'absolute', left: 12, right: 12, top: '50%', borderTop: '2px solid rgba(255,255,255,0.32)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 72, height: 72, marginLeft: -36, marginTop: -36, border: '2px solid rgba(255,255,255,0.32)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', left: '50%', bottom: 12, width: 140, height: 54, marginLeft: -70, border: '2px solid rgba(255,255,255,0.32)', borderBottom: 'none' }} />
      <div style={{ position: 'absolute', left: '50%', top: 12, width: 140, height: 54, marginLeft: -70, border: '2px solid rgba(255,255,255,0.32)', borderTop: 'none' }} />
      {/* Player dots */}
      {dots.map((d, i) => (
        <div key={i} style={{ position: 'absolute', left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 76 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#e8484d', border: '2px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 11, color: '#ffffff' }}>{d.num}</div>
          <div style={{ padding: '0 5px', borderRadius: 4, background: 'rgba(7,11,22,0.78)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{d.n}</div>
        </div>
      ))}
    </div>
  );
}
