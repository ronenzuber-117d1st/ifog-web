import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';
import { TICKET_TYPES, TICKET_PRICE_PRESETS, FOOD_REVENUE_PER_MATCH, MERCH_REVENUE_PER_MATCH } from '../data/finances';
import { LEAGUE_TEAMS } from '../data/teams';

type DeskTab = 'desk' | 'personnel' | 'cash-season' | 'cash-week' | 'bets' | 'memo';
type PersonnelSub = 'fishchips' | 'fanshop' | 'ticketsales' | 'cheerleader' | 'coach';

const STAFF_COSTS = {
  fishChips:   [0, 250, 750, 1_500],
  fanShop:     [0, 250, 750, 1_500],
  ticketSales: [0, 250, 750, 1_500],
  cheerleader: [0, 5_000, 10_000, 20_000],
};

const COACHES = [
  { id: 1, img: 'cotrai3', name: 'Bob Robinson',   heritage: 'Middlesex',  starSign: 'Libra',       ideology: 'Flower Power', salary: 5000 },
  { id: 2, img: 'cotrai4', name: 'Diana Dancer',   heritage: 'Lands End',  starSign: 'Gemini',      ideology: 'Torry',        salary: 5000 },
  { id: 3, img: 'cotrai5', name: 'Kelvin Kneegan', heritage: 'Kent',       starSign: 'Taurus',      ideology: 'Chaotic',      salary: 5000 },
  { id: 4, img: 'cotrai6', name: 'Mag Catcher',    heritage: 'Highlands',  starSign: 'Sagittarius', ideology: 'Liberal',      salary: 5000 },
];

const CARD = { background: '#161b27', border: '1px solid #28314a', borderRadius: '8px' } as const;

const TAB_LABELS: Record<DeskTab, string> = {
  desk: 'Desk',
  personnel: 'Personnel',
  'cash-season': 'Cash Season',
  'cash-week': 'Cash Week',
  bets: 'Bets',
  memo: 'Memo',
};

export function Desk() {
  const {
    managerName, currentMatchday, balance, financeHistory,
    priceLevel, foodEnabled, merchandiseEnabled, setPriceLevel, setFoodEnabled, setMerchandiseEnabled,
    rosters, managedTeamId, fixtures,
    staff, pendingBet, eventLog,
    setStaff, setCoach, placeBet, cancelBet,
  } = useGameStore();

  const [tab, setTab] = useState<DeskTab>('desk');
  const [personnelSub, setPersonnelSub] = useState<PersonnelSub>('fishchips');
  const [betInput, setBetInput] = useState('');

  const prices = TICKET_PRICE_PRESETS[priceLevel];
  const recent = [...financeHistory].reverse().slice(0, 20);
  const weekEntries = [...financeHistory].reverse().slice(0, 5);

  const squadPersonnel = (rosters[managedTeamId] ?? []).filter(p => p.injuredFor > 0 || p.suspended);
  const injured = squadPersonnel.filter(p => p.injuredFor > 0);
  const suspended = squadPersonnel.filter(p => p.suspended);

  // Bets: find next fixture
  const nextFix = fixtures.find(
    f => f.matchday === currentMatchday &&
      (f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId) &&
      f.homeGoals === undefined,
  );
  const isHome = nextFix?.homeTeamId === managedTeamId;
  const myTeam = LEAGUE_TEAMS.find(t => t.id === managedTeamId)!;
  const oppTeamId = isHome ? nextFix?.awayTeamId : nextFix?.homeTeamId;
  const oppTeam = LEAGUE_TEAMS.find(t => t.id === oppTeamId);
  const mySkill = (myTeam?.baseSkill ?? 55) + (isHome ? 3 : 0);
  const oppSkill = (oppTeam?.baseSkill ?? 55) + (!isHome ? 3 : 0);
  const total = mySkill + oppSkill;
  const myShare = Math.round((mySkill / total) * 34);
  const oppShare = 34 - myShare;
  const winMultiplier = +(34 / myShare).toFixed(2);

  return (
    <Layout>
      <div style={{ background: '#0d1117', minHeight: 'calc(100vh - 28px)', fontFamily: 'Arial, system-ui', fontSize: '13px' }}>

        {/* Header image */}
        <div style={{ position: 'relative', overflow: 'hidden', height: '160px' }}>
          <img src={img('office.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} alt="" />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', padding: '10px 14px' }}>
            <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>Manager: {managerName}</div>
            <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>Match Day {currentMatchday} · Balance: <span style={{ color: balance >= 0 ? '#4ade80' : '#f87171' }}>£{balance.toLocaleString()}</span></div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', padding: '8px 10px 0', gap: '4px', borderBottom: '1px solid #1e2535' }}>
          {(Object.keys(TAB_LABELS) as DeskTab[]).map(t => {
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '8px 18px', fontSize: '13px',
                fontWeight: active ? 'bold' : 'normal',
                background: active ? '#161b27' : 'transparent',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: active ? '#28314a' : 'transparent',
                borderRadius: '6px 6px 0 0',
                marginBottom: active ? '-1px' : '0',
                position: 'relative', zIndex: active ? 1 : 0,
                color: active ? '#ffffff' : '#64748b',
                whiteSpace: 'nowrap',
              }}>
                {TAB_LABELS[t]}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '10px' }}>

          {/* ── DESK TAB ── */}
          {tab === 'desk' && (
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              {/* Squad status */}
              <div style={{ ...CARD, padding: '14px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#e2e8f0' }}>Squad Status</div>
                {injured.length === 0 && suspended.length === 0 ? (
                  <div style={{ color: '#4ade80', fontSize: '13px' }}>✓ All players available</div>
                ) : (
                  <>
                    {injured.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ color: '#f87171', fontWeight: 'bold', marginBottom: '6px', fontSize: '12px' }}>INJURED</div>
                        {injured.map(p => (
                          <div key={p.id} style={{ fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #1e2535', color: '#e2e8f0' }}>
                            {p.name} <span style={{ color: '#94a3b8' }}>— out for {p.injuredFor} matchday{p.injuredFor > 1 ? 's' : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {suspended.length > 0 && (
                      <div>
                        <div style={{ color: '#f59e0b', fontWeight: 'bold', marginBottom: '6px', fontSize: '12px' }}>SUSPENDED</div>
                        {suspended.map(p => (
                          <div key={p.id} style={{ fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #1e2535', color: '#e2e8f0' }}>
                            {p.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              {/* Ticket pricing */}
              <div style={{ ...CARD, padding: '14px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#e2e8f0' }}>Ticket Pricing</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {(['low', 'medium', 'high'] as const).map(level => (
                    <button key={level} onClick={() => setPriceLevel(level)} style={{
                      background: priceLevel === level ? '#1e40af' : '#0d1117',
                      border: `1px solid ${priceLevel === level ? '#3b82f6' : '#28314a'}`,
                      borderRadius: '6px',
                      color: priceLevel === level ? '#ffffff' : '#94a3b8',
                      padding: '6px 18px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize',
                    }}>{level}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {TICKET_TYPES.map((t, i) => (
                    <div key={t.name} style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {t.name}: <strong style={{ color: '#4ade80' }}>£{prices[i]}</strong>
                    </div>
                  ))}
                </div>
              </div>
              {/* Stadium revenue */}
              <div style={{ ...CARD, padding: '14px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#e2e8f0' }}>Stadium Revenue</div>
                <ToggleRow label="Food Stand" sub={`+£${(FOOD_REVENUE_PER_MATCH / 1000).toFixed(0)}K per home match`} value={foodEnabled} onChange={setFoodEnabled} />
                <ToggleRow label="Club Shop" sub={`+£${(MERCH_REVENUE_PER_MATCH / 1000).toFixed(0)}K per home match`} value={merchandiseEnabled} onChange={setMerchandiseEnabled} />
              </div>
            </div>
          )}

          {/* ── PERSONNEL TAB ── */}
          {tab === 'personnel' && (
            <div>
              {/* Marble header */}
              <div style={{ position: 'relative', height: '80px', marginBottom: '10px', overflow: 'hidden', borderRadius: '8px' }}>
                <img src={img('tapestrm.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} alt="" />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                  <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '22px', letterSpacing: '6px', textShadow: '2px 2px 8px #000, 0 0 20px rgba(0,0,0,0.8)' }}>PERSONNEL</span>
                </div>
              </div>

              {/* Sub-tab row (single row) */}
              {(() => {
                const allSubs: PersonnelSub[] = ['fishchips', 'fanshop', 'ticketsales', 'cheerleader', 'coach'];
                const labels: Record<PersonnelSub, string> = { fishchips: 'Fish & Chips', fanshop: 'Fan Shop', ticketsales: 'Ticket Sales', cheerleader: 'Cheerleader', coach: 'Assistant Coach' };
                return (
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    {allSubs.map(sub => {
                      const active = personnelSub === sub;
                      return (
                        <button key={sub} onClick={() => setPersonnelSub(sub)} style={{
                          flex: 1, padding: '8px 6px', fontSize: '13px', cursor: 'pointer',
                          fontWeight: active ? 'bold' : 'normal',
                          background: active ? '#161b27' : '#0d1117',
                          border: `1px solid ${active ? '#3b82f6' : '#1e2535'}`,
                          borderRadius: '6px 6px 0 0',
                          color: active ? '#ffffff' : '#64748b',
                          whiteSpace: 'nowrap',
                        }}>{labels[sub]}</button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Sub-tab content */}
              <div style={{ ...CARD, padding: '14px' }}>
                {personnelSub === 'fishchips' && (
                  <StaffTierPanel
                    label="Fish & Chips"
                    imageSrc={img(`pommes${staff.fishChips === 0 ? 0 : (staff.fishChips - 1) * 2 + 1 + (currentMatchday % 2)}.png`)}
                    currentTier={staff.fishChips}
                    costs={STAFF_COSTS.fishChips}
                    onSelect={tier => setStaff('fishChips', tier)}
                  />
                )}
                {personnelSub === 'fanshop' && (
                  <StaffTierPanel
                    label="Fan Shop"
                    imageSrc={img(`fanbude${staff.fanShop === 0 ? 0 : (staff.fanShop - 1) * 2 + 1 + (currentMatchday % 2)}.png`)}
                    currentTier={staff.fanShop}
                    costs={STAFF_COSTS.fanShop}
                    onSelect={tier => setStaff('fanShop', tier)}
                  />
                )}
                {personnelSub === 'ticketsales' && (
                  <StaffTierPanel
                    label="Ticket Sales"
                    imageSrc={img('verkauf.png')}
                    currentTier={staff.ticketSales}
                    costs={STAFF_COSTS.ticketSales}
                    onSelect={tier => setStaff('ticketSales', tier)}
                  />
                )}
                {personnelSub === 'cheerleader' && (
                  <StaffTierPanel
                    label="Cheerleader"
                    imageSrc={staff.cheerleader > 0 ? img(`cheer${staff.cheerleader}.png`) : undefined}
                    currentTier={staff.cheerleader}
                    costs={STAFF_COSTS.cheerleader}
                    onSelect={tier => setStaff('cheerleader', tier)}
                  />
                )}
                {personnelSub === 'coach' && (
                  <div>
                    {/* Info panel */}
                    {staff.coach > 0 ? (() => {
                      const c = COACHES.find(c => c.id === staff.coach)!;
                      return (
                        <div style={{ marginBottom: '14px', padding: '10px', background: '#0d1117', borderRadius: '6px', fontSize: '12px', color: '#aaccff' }}>
                          <span style={{ marginRight: '12px' }}>Heritage: <strong style={{ color: '#ffffff' }}>{c.heritage}</strong></span>
                          <span style={{ marginRight: '12px' }}>Star sign: <strong style={{ color: '#ffffff' }}>{c.starSign}</strong></span>
                          <span style={{ marginRight: '12px' }}>Ideology: <strong style={{ color: '#ffffff' }}>{c.ideology}</strong></span>
                          <span>Salary: <strong style={{ color: '#4ade80' }}>£{c.salary.toLocaleString()}</strong></span>
                        </div>
                      );
                    })() : (
                      <div style={{ marginBottom: '14px', padding: '10px', background: '#0d1117', borderRadius: '6px', fontSize: '12px', color: '#64748b' }}>
                        No assistant coach hired
                      </div>
                    )}
                    {/* Coach portraits */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      {COACHES.map(c => {
                        const selected = staff.coach === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setCoach(selected ? 0 : c.id)}
                            style={{ textAlign: 'center', cursor: 'pointer' }}
                          >
                            <div style={{ border: `2px solid ${selected ? '#22c55e' : '#374151'}`, borderRadius: '6px', overflow: 'hidden', width: '80px' }}>
                              <img src={img(`${c.img}.png`)} alt={c.name} style={{ width: '80px', display: 'block', imageRendering: 'pixelated' }} />
                            </div>
                            <div style={{ fontSize: '10px', color: selected ? '#22c55e' : '#94a3b8', marginTop: '4px', maxWidth: '80px' }}>{c.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CASH SEASON TAB ── */}
          {tab === 'cash-season' && (
            <div style={{ background: '#0a0028', border: '1px solid #1a0060', borderRadius: '8px', padding: '14px', color: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontWeight: 'bold', color: '#88ff88' }}>EARNINGS</div>
                <div style={{ fontWeight: 'bold', color: '#ff8888' }}>COSTS</div>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  {recent.filter(e => e.amount > 0).slice(0, 8).map((e, i) => (
                    <div key={i} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ color: '#aaccff' }}>MD{e.matchday} {e.description.slice(0, 18)}</span>
                      <span style={{ color: '#88ff88' }}>£{e.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  {recent.filter(e => e.amount < 0).slice(0, 8).map((e, i) => (
                    <div key={i} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ color: '#aaccff' }}>MD{e.matchday} {e.description.slice(0, 18)}</span>
                      <span style={{ color: '#ff8888' }}>£{Math.abs(e.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span style={{ color: '#aaccff' }}>BALANCE (MD {currentMatchday})</span>
                <span style={{ color: balance >= 0 ? '#88ff88' : '#ff8888' }}>£{balance.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* ── CASH WEEK TAB ── */}
          {tab === 'cash-week' && (
            <div style={{ background: '#0a0028', border: '1px solid #1a0060', borderRadius: '8px', padding: '14px', color: '#ffffff' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#aaccff' }}>RECENT TRANSACTIONS</div>
              {weekEntries.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '12px' }}>No transactions yet.</div>
              ) : (
                weekEntries.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '10px', color: '#aaccff', width: '30px' }}>MD{e.matchday}</span>
                    <span style={{ flex: 1, fontSize: '11px', color: '#e0e0ff' }}>{e.description}</span>
                    <span style={{ fontWeight: 'bold', fontSize: '12px', color: e.amount >= 0 ? '#88ff88' : '#ff8888' }}>
                      {e.amount >= 0 ? '+' : ''}£{e.amount.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '10px', color: '#7777aa' }}>→£{e.running.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── BETS TAB ── */}
          {tab === 'bets' && (
            <div style={{ ...CARD, padding: '14px' }}>
              {!nextFix ? (
                <div style={{ color: '#64748b', fontSize: '13px' }}>No match this matchday.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Quote box */}
                  <div style={{ background: '#0a0028', border: '1px solid #1a0060', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ color: '#aaccff', fontSize: '11px', marginBottom: '6px', letterSpacing: '1px' }}>QUOTE</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '32px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '4px' }}>
                      {myShare}:{oppShare}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '6px' }}>
                      {myTeam?.name ?? 'Your Team'} vs {oppTeam?.name ?? 'Opponent'}
                    </div>
                  </div>

                  {/* Bet input row */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ color: '#aaccff', fontSize: '12px', whiteSpace: 'nowrap' }}>Bet £</label>
                    <input
                      type="number"
                      min={0}
                      value={betInput}
                      onChange={e => setBetInput(e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', background: '#0d1117', border: '1px solid #28314a', borderRadius: '6px', color: '#ffffff', fontSize: '13px' }}
                      placeholder="Enter amount..."
                    />
                    <button
                      onClick={() => {
                        const amount = Number(betInput);
                        if (amount > 0) { placeBet(amount, winMultiplier); setBetInput(''); }
                      }}
                      style={{ padding: '6px 18px', background: '#1e40af', border: '1px solid #3b82f6', borderRadius: '6px', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                    >
                      OK
                    </button>
                    {pendingBet && (
                      <button
                        onClick={cancelBet}
                        style={{ padding: '6px 18px', background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: '6px', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Totals */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, background: '#0a0028', border: '1px solid #1a0060', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ color: '#aaccff', fontSize: '10px', marginBottom: '4px', letterSpacing: '1px' }}>BETTING TOTAL</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', color: pendingBet ? '#facc15' : '#64748b' }}>
                        {pendingBet ? `£${pendingBet.amount.toLocaleString()}` : '—'}
                      </div>
                    </div>
                    <div style={{ flex: 1, background: '#0a0028', border: '1px solid #1a0060', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ color: '#aaccff', fontSize: '10px', marginBottom: '4px', letterSpacing: '1px' }}>POSSIBLE WIN</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', color: pendingBet ? '#4ade80' : '#64748b' }}>
                        {pendingBet ? `£${Math.round(pendingBet.amount * (pendingBet.winMultiplier - 1)).toLocaleString()}` : '—'}
                      </div>
                    </div>
                  </div>

                  {pendingBet && (
                    <div style={{ color: '#facc15', fontSize: '11px', textAlign: 'center' }}>
                      Bet placed: £{pendingBet.amount.toLocaleString()} at ×{pendingBet.winMultiplier.toFixed(2)} — resolves after next match.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── MEMO TAB ── */}
          {tab === 'memo' && (
            <div style={{ background: '#0a0028', border: '1px solid #1a0060', borderRadius: '8px', padding: '14px', color: '#ffffff' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#aaccff' }}>EVENT LOG</div>
              {eventLog.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '12px' }}>No events yet.</div>
              ) : (
                [...eventLog].reverse().map((entry, i) => (
                  <div key={i}>
                    <div style={{ color: '#aaccff', fontWeight: 'bold', marginBottom: '4px' }}>
                      --{entry.matchday}. Match Day--
                    </div>
                    <div style={{ color: '#e0e0ff', fontSize: '12px', marginBottom: '12px' }}>
                      {entry.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}

// ── Helpers ──

function ToggleRow({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#e2e8f0' }}>{label}</div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>{sub}</div>
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: '48px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative',
        background: value ? '#15803d' : '#1e2535', border: `1px solid ${value ? '#16a34a' : '#28314a'}`,
      }}>
        <div style={{ position: 'absolute', top: '3px', width: '16px', height: '16px', background: '#fff', borderRadius: '50%', transition: 'left 0.15s', left: value ? '27px' : '3px' }} />
      </button>
    </div>
  );
}

function StaffTierPanel({
  label, imageSrc, currentTier, costs, onSelect,
}: {
  label: string;
  imageSrc: string | undefined;
  currentTier: number;
  costs: number[];
  onSelect: (tier: number) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      {/* Staff image — half the panel width */}
      <div style={{ flex: 1, height: '220px', background: '#111827', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {imageSrc ? (
          <img src={imageSrc} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
        ) : (
          <span style={{ color: '#374151', fontSize: '11px' }}>No image</span>
        )}
      </div>

      {/* Right side: tiers + status */}
      <div style={{ flex: 1 }}>
        <div style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '13px', marginBottom: '16px' }}>{label} Staff</div>

        {/* Tier options — compact width */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {[1, 2, 3].map(tier => {
            const active = currentTier === tier;
            return (
              <button
                key={tier}
                onClick={() => onSelect(active ? 0 : tier)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 12px', fontSize: '12px', cursor: 'pointer', textAlign: 'left',
                  width: 'fit-content', gap: '20px',
                  background: active ? '#1e3a5f' : '#0d1117',
                  border: `1px solid ${active ? '#3b82f6' : '#28314a'}`,
                  borderRadius: '6px',
                  color: active ? '#ffffff' : '#94a3b8',
                }}
              >
                <span>Tier {tier}</span>
                <span style={{ fontWeight: 'bold', color: active ? '#60a5fa' : '#64748b' }}>£{costs[tier].toLocaleString()}/match</span>
              </button>
            );
          })}
        </div>

        {/* Status */}
        <div style={{ fontSize: '11px', padding: '8px 10px', borderRadius: '6px', background: '#0a0a18', border: '1px solid #1e2535', color: currentTier > 0 ? '#4ade80' : '#64748b', width: 'fit-content' }}>
          {currentTier > 0
            ? `✓ ${label} hired — £${costs[currentTier].toLocaleString()} per match day`
            : '— No staff hired'}
        </div>
      </div>
    </div>
  );
}
