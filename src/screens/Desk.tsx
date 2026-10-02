import { useState, useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';
import { TICKET_TYPES, TICKET_PRICE_PRESETS, FOOD_REVENUE_PER_MATCH, MERCH_REVENUE_PER_MATCH, calcTicketRevenue, calcDemand } from '../data/finances';
import { LEAGUE_TEAMS } from '../data/teams';

type DeskTab = 'desk' | 'personnel' | 'cash-season' | 'cash-week' | 'bets' | 'memo';
type PersonnelSub = 'fishChips' | 'fanShop' | 'ticketSales' | 'cheerleader' | 'coach';
type MemoFilter = 'all' | 'money' | 'squad' | 'club';

const STAFF_COSTS: Record<string, number[]> = {
  fishChips:   [0, 250, 750, 1_500],
  fanShop:     [0, 250, 750, 1_500],
  ticketSales: [0, 250, 750, 1_500],
  cheerleader: [0, 5_000, 10_000, 20_000],
};

const COACHES = [
  { id: 1, img: 'cotrai3', name: 'Bob Robinson',   heritage: 'Kent',       starSign: 'Taurus',      ideology: 'Chaotic',      salary: 5000, effect: 'Wild card — match results swing ±1 goal randomly' },
  { id: 2, img: 'cotrai5', name: 'Diana Dancer',   heritage: 'Middlesex',  starSign: 'Libra',       ideology: 'Flower Power', salary: 5000, effect: 'Reduces injury risk: starters 5%, bench 1%' },
  { id: 3, img: 'cotrai4', name: 'Kelvin Kneegan', heritage: 'Highlands',  starSign: 'Sagittarius', ideology: 'Liberal',      salary: 5000, effect: 'Squad trains 4% more effectively each matchday' },
  { id: 4, img: 'cotrai6', name: 'Mag Catcher',    heritage: 'Lands End',  starSign: 'Gemini',      ideology: 'Torry',        salary: 5000, effect: 'Saves £10,000 off the wage bill each matchday' },
];

const STAFF_LIST = [
  { key: 'fishChips'   as const, sub: 'fishChips'   as PersonnelSub, label: 'Fish & Chips'  },
  { key: 'fanShop'     as const, sub: 'fanShop'     as PersonnelSub, label: 'Fan Shop'      },
  { key: 'ticketSales' as const, sub: 'ticketSales' as PersonnelSub, label: 'Ticket Sales'  },
  { key: 'cheerleader' as const, sub: 'cheerleader' as PersonnelSub, label: 'Cheerleader'   },
];

const TAB_LABELS: Record<DeskTab, string> = {
  desk: 'Desk', personnel: 'Personnel', 'cash-season': 'Cash Season',
  'cash-week': 'Cash Week', bets: 'Bets', memo: 'Memo',
};

const EARN_CATS = ['Ticket sales', 'Advertising', 'Food stand', 'Radio & TV', 'Club shop', 'VIP lounge'];
const COST_CATS = ['Stadium', 'Player purchase', 'Team wages', 'Bits & pieces', 'Personnel'];

function finCat(desc: string): string {
  for (const c of [...EARN_CATS, ...COST_CATS]) {
    if (desc.toLowerCase().includes(c.toLowerCase())) return c;
  }
  return 'Other';
}

function memoKind(text: string): 'money' | 'squad' | 'club' {
  const t = text.toLowerCase();
  if (t.includes('injur') || t.includes('suspen') || t.includes('card') || t.includes('booking') || t.includes('signing') || t.includes('joins')) return 'squad';
  if (t.includes('stadium') || t.includes('wage') || t.includes('purchase') || t.includes('transfer') || t.includes('£') || t.includes('upgrade') || t.includes('personnel')) return 'money';
  return 'club';
}

function computeOdds(homeBase: number, awayBase: number): [number, number] {
  const h = homeBase + 3;
  const total = h + awayBase;
  const hs = Math.round((h / total) * 34);
  return [hs, 34 - hs];
}

export function Desk() {
  const {
    managerName, currentMatchday, totalMatchdays, balance, financeHistory,
    priceLevel, setPriceLevel, mediaDeal,
    rosters, managedTeamId, fixtures, table, stadium,
    staff, pendingBet, eventLog,
    setStaff, setCoach, placeBet, cancelBet,
  } = useGameStore();

  const [tab, setTab]                 = useState<DeskTab>('desk');
  const [personnelSub, setPersonnelSub] = useState<PersonnelSub>('fishChips');
  const [memoFilter, setMemoFilter]   = useState<MemoFilter>('all');
  const [betStake, setBetStake]       = useState(0);
  const [cashWeekDay, setCashWeekDay] = useState(Math.max(1, currentMatchday - 1));

  const prices  = TICKET_PRICE_PRESETS[priceLevel];
  const myTeam  = LEAGUE_TEAMS.find(t => t.id === managedTeamId)!;
  const position = table.findIndex(r => r.teamId === managedTeamId) + 1;

  /* Squad */
  const allPlayers = rosters[managedTeamId] ?? [];
  const injured    = allPlayers.filter(p => p.injuredFor > 0);
  const suspended  = allPlayers.filter(p => p.suspended);

  /* Next fixture */
  const nextFix = fixtures.find(
    f => f.matchday === currentMatchday &&
      (f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId) &&
      f.homeGoals === undefined,
  );
  const isHome   = nextFix?.homeTeamId === managedTeamId;
  const oppTeamId = isHome ? nextFix?.awayTeamId : nextFix?.homeTeamId;
  const oppTeam  = LEAGUE_TEAMS.find(t => t.id === oppTeamId);
  const [myOdds, oppOdds] = nextFix
    ? computeOdds(isHome ? myTeam.baseSkill : (oppTeam?.baseSkill ?? 55), isHome ? (oppTeam?.baseSkill ?? 55) : myTeam.baseSkill)
    : [17, 17];
  const myShareOdds = isHome ? myOdds : oppOdds;
  const winMultiplier = +(34 / myShareOdds).toFixed(2);

  /* All matchday fixtures for list */
  const matchdayFixtures = fixtures.filter(
    f => f.matchday === currentMatchday && f.homeGoals === undefined,
  );

  /* Finance aggregation */
  const seasonFinance = useMemo(() => {
    const earn: Record<string, number> = {};
    const cost: Record<string, number> = {};
    EARN_CATS.forEach(c => { earn[c] = 0; });
    COST_CATS.forEach(c => { cost[c] = 0; });
    let totalEarn = 0, totalCost = 0;
    for (const e of financeHistory) {
      if (e.matchday === 0) continue;
      const cat = finCat(e.description);
      if (e.amount > 0) { earn[cat] = (earn[cat] ?? 0) + e.amount; totalEarn += e.amount; }
      else { cost[cat] = (cost[cat] ?? 0) + Math.abs(e.amount); totalCost += Math.abs(e.amount); }
    }
    const opening = financeHistory.length > 0 ? financeHistory[0].running - financeHistory[0].amount : 0;
    return { earn, cost, totalEarn, totalCost, opening };
  }, [financeHistory]);

  const weekFinance = useMemo(() => {
    const earn: Record<string, number> = {};
    const cost: Record<string, number> = {};
    EARN_CATS.forEach(c => { earn[c] = 0; });
    COST_CATS.forEach(c => { cost[c] = 0; });
    let totalEarn = 0, totalCost = 0;
    for (const e of financeHistory.filter(e => e.matchday === cashWeekDay)) {
      const cat = finCat(e.description);
      if (e.amount > 0) { earn[cat] = (earn[cat] ?? 0) + e.amount; totalEarn += e.amount; }
      else { cost[cat] = (cost[cat] ?? 0) + Math.abs(e.amount); totalCost += Math.abs(e.amount); }
    }
    return { earn, cost, totalEarn, totalCost };
  }, [financeHistory, cashWeekDay]);

  /* Last week net */
  const lastWeekNet = financeHistory.filter(e => e.matchday === currentMatchday - 1).reduce((s, e) => s + e.amount, 0);
  const seasonNet   = financeHistory.reduce((s, e) => s + e.amount, 0);

  /* Staff cost per match */
  const staffCostPerMatch = STAFF_LIST.reduce((s, x) => s + STAFF_COSTS[x.key][staff[x.key] as number], 0);

  /* Personnel image logic — keep existing logic */
  function staffImg(sub: PersonnelSub): string | undefined {
    if (sub === 'fishChips') {
      const t = staff.fishChips as number;
      return t === 0 ? img('pommes0.png') : img(`pommes${(t - 1) * 2 + 1 + (currentMatchday % 2)}.png`);
    }
    if (sub === 'fanShop') {
      const t = staff.fanShop as number;
      return t === 0 ? img('fanbude0.png') : img(`fanbude${(t - 1) * 2 + 1 + (currentMatchday % 2)}.png`);
    }
    if (sub === 'ticketSales') {
      const t = staff.ticketSales as number;
      return t === 0 ? img('ticket0.png') : img(`ticket${(t - 1) * 2 + 1 + (currentMatchday % 2)}.png`);
    }
    if (sub === 'cheerleader') return (staff.cheerleader as number) > 0 ? img(`cheer${staff.cheerleader}.png`) : undefined;
    return undefined;
  }

  return (
    <Layout>
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '360px 1fr', background: '#070b16', fontFamily: "'Barlow', system-ui, sans-serif", color: '#e8edf7', overflow: 'hidden' }}>

        {/* ── Left sidebar ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 0 20px 28px', overflow: 'hidden', minHeight: 0 }}>
          {/* Office card */}
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', flexShrink: 0 }}>
            <img src={img('office.png')} alt="" style={{ width: '100%', height: 260, objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '50px 18px 16px', background: 'linear-gradient(0deg, rgba(7,11,22,0.96), transparent)' }}>
              <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1 }}>{managerName}'s Office</div>
              <div style={{ fontSize: 13, color: '#8d99b5', marginTop: 4 }}>{myTeam.name} · Season 1994/95</div>
            </div>
          </div>

          {/* Balance card */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 20px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', overflow: 'hidden' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Balance</div>
            <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 40, lineHeight: 1, color: balance >= 0 ? '#c8f53d' : '#ff7a6b' }}>£{balance.toLocaleString()}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #1c2640', paddingTop: 14 }}>
              {([
                { label: 'Matchday',      value: `${currentMatchday} / ${totalMatchdays ?? 38}`,     color: undefined },
                { label: 'Last week',     value: lastWeekNet === 0 ? '—' : `${lastWeekNet >= 0 ? '+' : ''}£${lastWeekNet.toLocaleString()}`,  color: lastWeekNet < 0 ? '#ff7a6b' : '#5fd49a' },
                { label: 'Season so far', value: seasonNet === 0 ? '—' : `${seasonNet >= 0 ? '+' : ''}£${seasonNet.toLocaleString()}`,         color: seasonNet < 0 ? '#ff7a6b' : '#5fd49a' },
              ] as { label: string; value: string; color?: string }[]).map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 13, color: '#8d99b5' }}>{label}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 13, color: color ?? '#e8edf7' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Right: tabs + content ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {/* Sub-tab bar */}
          <div style={{ flexShrink: 0, height: 52, display: 'flex', alignItems: 'stretch', gap: 4, padding: '0 28px', borderBottom: '1px solid #1c2640', background: '#0a0f1d' }}>
            {(Object.keys(TAB_LABELS) as DeskTab[]).map(t => {
              const active = tab === t;
              return (
                <button key={t} onClick={() => setTab(t)} style={{ display: 'flex', alignItems: 'center', padding: '0 14px', background: 'transparent', border: 'none', boxShadow: active ? 'inset 0 -3px 0 #c8f53d' : 'none', color: active ? '#ffffff' : '#8d99b5', fontWeight: active ? 700 : 600, fontSize: 14, cursor: 'pointer', fontFamily: "'Barlow', system-ui, sans-serif", whiteSpace: 'nowrap' }}>
                  {TAB_LABELS[t]}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 28px 16px' }}>

            {/* ══ DESK ══ */}
            {tab === 'desk' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
                {/* Squad status bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 12, background: '#0f1628', border: '1px solid #1c2640', flexWrap: 'wrap', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600, flexShrink: 0 }}>Squad Status</div>
                  {injured.length === 0 && suspended.length === 0 ? (
                    <Pill color="#5fd49a" bg="rgba(95,212,154,0.12)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg>
                      All players available
                    </Pill>
                  ) : (
                    <>
                      {injured.map(p => (
                        <Pill key={p.id} color="#ff7a6b" bg="rgba(232,72,77,0.14)">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                          {injured.length} injured · {p.name}
                        </Pill>
                      ))}
                      {suspended.map(p => (
                        <Pill key={p.id} color="#f5c76b" bg="rgba(245,185,74,0.14)">
                          <div style={{ width: 7, height: 10, background: '#f5c76b', borderRadius: 1, flexShrink: 0 }} />
                          2 booked · {p.name}
                        </Pill>
                      ))}
                    </>
                  )}
                  <div style={{ flexGrow: 1 }} />
                  <button style={{ fontSize: 13, color: '#c8f53d', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Barlow', system-ui, sans-serif", fontWeight: 600 }}>View squad →</button>
                </div>

                {/* Ticket pricing + Revenue side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1, minHeight: 0 }}>

                  {/* Ticket pricing */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 18px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ticket Pricing</div>
                        <div style={{ fontSize: 12, color: '#8d99b5', marginTop: 2 }}>Applies from the next home match</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['low', 'medium', 'high'] as const).map(level => (
                          <button key={level} onClick={() => setPriceLevel(level)} style={{ height: 32, padding: '0 14px', borderRadius: 8, background: priceLevel === level ? '#c8f53d' : 'transparent', border: `1px solid ${priceLevel === level ? '#c8f53d' : '#2a3656'}`, color: priceLevel === level ? '#070b16' : '#a9b3cb', fontWeight: priceLevel === level ? 700 : 600, fontSize: 13, cursor: 'pointer', fontFamily: "'Barlow', system-ui, sans-serif", textTransform: 'capitalize' }}>{level}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
                      {TICKET_TYPES.map((t, i) => (
                        <div key={t.name} style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 12px', borderRadius: 10, background: '#131c33', border: '1px solid #1c2640' }}>
                          <div style={{ fontSize: 12, color: '#8d99b5' }}>{t.name}</div>
                          <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 22, color: '#e8edf7' }}>£{prices[i]}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Revenue breakdown */}
                  {(() => {
                    const myRow    = table.find(r => r.teamId === managedTeamId);
                    const ppg      = myRow && myRow.played > 0 ? myRow.points / myRow.played : 1.5;
                    const demand   = calcDemand(position > 0 ? position : 10, ppg);
                    const ticketRev = Math.round(calcTicketRevenue(priceLevel, demand, stadium.seats));
                    const foodRev   = (staff.fishChips as number) > 0 ? FOOD_REVENUE_PER_MATCH : 0;
                    const shopRev   = (staff.fanShop   as number) > 0 ? MERCH_REVENUE_PER_MATCH : 0;
                    const mediaRev  = mediaDeal ? mediaDeal.revenuePerMatch : 0;
                    const totalRev  = ticketRev + foodRev + shopRev + mediaRev;
                    const rows: { label: string; amount: number; note: string }[] = [
                      { label: 'Tickets',    amount: ticketRev, note: priceLevel },
                      { label: 'Food stand', amount: foodRev,   note: (staff.fishChips as number) > 0 ? `Tier ${staff.fishChips} hired` : 'No staff hired' },
                      { label: 'Fan shop',   amount: shopRev,   note: (staff.fanShop   as number) > 0 ? `Tier ${staff.fanShop} hired`   : 'No staff hired' },
                      { label: 'Media deal', amount: mediaRev,  note: mediaDeal ? mediaDeal.name : 'No deal active' },
                    ];
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 18px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                          <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Revenue / Match</div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, color: '#5fd49a' }}>£{totalRev.toLocaleString()}</div>
                        </div>
                        {rows.map(({ label, amount, note }) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #1c2640' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                              <div style={{ fontSize: 12, color: amount > 0 ? '#8d99b5' : '#3d4f72', marginTop: 1, textTransform: 'capitalize' }}>{note}</div>
                            </div>
                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: amount > 0 ? '#e8edf7' : '#3d4f72' }}>
                              {amount > 0 ? `£${amount.toLocaleString()}` : '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ══ PERSONNEL ══ */}
            {tab === 'personnel' && (
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, minHeight: '100%' }}>
                {/* Staff list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600, padding: '0 4px 10px' }}>Staff</div>
                  {STAFF_LIST.map(s => {
                    const tier = staff[s.key] as number;
                    const active = personnelSub === s.sub;
                    return (
                      <button key={s.sub} onClick={() => setPersonnelSub(s.sub)} style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 14px', borderRadius: 10, border: `1px solid ${active ? '#c8f53d' : '#1c2640'}`, background: active ? 'rgba(200,245,61,0.06)' : 'transparent', color: '#e8edf7', textAlign: 'left', cursor: 'pointer', fontFamily: "'Barlow', system-ui, sans-serif" }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
                        <div style={{ fontSize: 12, color: tier > 0 ? '#c8f53d' : '#6b7797' }}>{tier > 0 ? `Tier ${tier} hired` : 'Not hired'}</div>
                      </button>
                    );
                  })}
                  <button onClick={() => setPersonnelSub('coach')} style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 14px', borderRadius: 10, border: `1px solid ${personnelSub === 'coach' ? '#c8f53d' : '#1c2640'}`, background: personnelSub === 'coach' ? 'rgba(200,245,61,0.06)' : 'transparent', color: '#e8edf7', textAlign: 'left', cursor: 'pointer', fontFamily: "'Barlow', system-ui, sans-serif" }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Assistant Coach</div>
                    <div style={{ fontSize: 12, color: (staff.coach as number) > 0 ? '#c8f53d' : '#6b7797' }}>{(staff.coach as number) > 0 ? 'Hired' : 'Not hired'}</div>
                  </button>
                  <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #1c2640' }}>
                    <div style={{ fontSize: 12, color: '#8d99b5' }}>Staff costs per match</div>
                    <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 30, color: '#f5c76b', marginTop: 4 }}>£{staffCostPerMatch.toLocaleString()}</div>
                  </div>
                </div>

                {/* Detail panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {personnelSub !== 'coach' ? (() => {
                    const s = STAFF_LIST.find(x => x.sub === personnelSub)!;
                    const src = staffImg(personnelSub);
                    const tier = staff[s.key] as number;
                    const costs = STAFF_COSTS[s.key];
                    return (
                      <>
                        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#131c33', height: 290, flexShrink: 0 }}>
                          {src && <img src={src} alt={s.label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', imageRendering: 'pixelated', display: 'block' }} />}
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '60px 20px 16px', background: 'linear-gradient(0deg, rgba(7,11,22,0.92), transparent)' }}>
                            <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 38, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1 }}>{s.label}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Choose staffing level</div>
                            <div style={{ fontSize: 12, color: '#6b7797' }}>Charged every match day</div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
                            {([0, 1, 2, 3] as const).map(t => {
                              const active = tier === t;
                              return (
                                <button key={t} onClick={() => setStaff(s.key, t)} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 16px', borderRadius: 12, border: `2px solid ${active ? '#c8f53d' : '#1c2640'}`, background: active ? 'rgba(200,245,61,0.08)' : '#131c33', color: '#e8edf7', textAlign: 'left', cursor: 'pointer', fontFamily: "'Barlow', system-ui, sans-serif" }}>
                                  {active && (
                                    <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', background: '#c8f53d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#070b16" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg>
                                    </div>
                                  )}
                                  <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 17, textTransform: 'uppercase', color: active ? '#c8f53d' : '#8d99b5' }}>{t === 0 ? 'None' : `Tier ${t}`}</div>
                                  <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 26, color: '#e8edf7' }}>£{costs[t].toLocaleString()}</div>
                                  <div style={{ fontSize: 12, color: '#6b7797' }}>{t === 0 ? 'No staff hired' : 'per match'}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })() : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {(staff.coach as number) > 0 && (() => {
                        const c = COACHES.find(c => c.id === staff.coach)!;
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 18px', borderRadius: 12, background: '#0f1628', border: '1px solid #1c2640' }}>
                            <div style={{ display: 'flex', gap: 24 }}>
                            {([
                              { label: 'Heritage',  value: c.heritage },
                              { label: 'Star sign', value: c.starSign },
                              { label: 'Ideology',  value: c.ideology },
                              { label: 'Salary',    value: `£${c.salary.toLocaleString()}/match`, color: '#5fd49a' as string },
                            ]).map(({ label, value, color }) => (
                              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div style={{ fontSize: 11, color: '#8d99b5', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: color ?? '#e8edf7' }}>{value}</div>
                              </div>
                            ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(200,245,61,0.07)', border: '1px solid rgba(200,245,61,0.18)' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8f53d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                              <div style={{ fontSize: 13, color: '#c8f53d', fontWeight: 600 }}>{c.effect}</div>
                            </div>
                          </div>
                        );
                      })()}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14 }}>
                        {COACHES.map(c => {
                          const selected = staff.coach === c.id;
                          return (
                            <button key={c.id} onClick={() => setCoach(selected ? 0 : c.id)} style={{ display: 'flex', flexDirection: 'column', padding: 0, borderRadius: 12, border: `2px solid ${selected ? '#c8f53d' : '#1c2640'}`, background: 'transparent', cursor: 'pointer', overflow: 'hidden', textAlign: 'left' }}>
                              <img src={img(`${c.img}.png`)} alt={c.name} style={{ width: '100%', height: 160, objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} />
                              <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: selected ? '#c8f53d' : '#e8edf7', fontFamily: "'Barlow', system-ui, sans-serif" }}>{c.name}</div>
                                <div style={{ fontSize: 12, color: '#8d99b5', fontFamily: "'Barlow', system-ui, sans-serif" }}>£{c.salary.toLocaleString()}/match</div>
                                <div style={{ fontSize: 11, color: '#6b7797', fontFamily: "'Barlow', system-ui, sans-serif", marginTop: 2 }}>{c.effect}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ CASH SEASON ══ */}
            {tab === 'cash-season' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14 }}>
                  {([
                    { label: 'Opening Balance', v: `£${seasonFinance.opening.toLocaleString()}`,       color: '#e8edf7' },
                    { label: 'Earnings',         v: `+£${seasonFinance.totalEarn.toLocaleString()}`,   color: '#5fd49a' },
                    { label: 'Costs',            v: `-£${seasonFinance.totalCost.toLocaleString()}`,   color: '#ff7a6b' },
                    { label: 'Balance Now',      v: `£${balance.toLocaleString()}`,                    color: '#c8f53d' },
                  ]).map(({ label, v, color }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 18px', borderRadius: 14, background: '#0f1628', border: '1px solid #1c2640' }}>
                      <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>{label}</div>
                      <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 30, lineHeight: 1, color }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FinancePanel title="Earnings" color="#5fd49a" sign="+" entries={EARN_CATS.map(c => ({ label: c, amount: seasonFinance.earn[c] ?? 0 }))} />
                  <FinancePanel title="Costs"    color="#ff7a6b" sign="-" entries={COST_CATS.map(c => ({ label: c, amount: seasonFinance.cost[c] ?? 0 }))} />
                </div>
              </div>
            )}

            {/* ══ CASH WEEK ══ */}
            {tab === 'cash-week' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 14, alignItems: 'stretch' }}>
                  {(() => {
                    const net = weekFinance.totalEarn - weekFinance.totalCost;
                    return ([
                      { label: 'Earnings',      v: `+£${weekFinance.totalEarn.toLocaleString()}`, color: '#5fd49a' },
                      { label: 'Costs',         v: `-£${weekFinance.totalCost.toLocaleString()}`, color: '#ff7a6b' },
                      { label: 'Net This Week', v: `${net >= 0 ? '+' : '-'}£${Math.abs(net).toLocaleString()}`, color: net >= 0 ? '#5fd49a' : '#ff7a6b' },
                    ] as { label: string; v: string; color: string }[]).map(({ label, v, color }) => (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 18px', borderRadius: 14, background: '#0f1628', border: '1px solid #1c2640' }}>
                        <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>{label}</div>
                        <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 30, lineHeight: 1, color }}>{v}</div>
                      </div>
                    ));
                  })()}
                  {/* Matchday nav */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 14, background: '#0f1628', border: '1px solid #1c2640' }}>
                    <button onClick={() => setCashWeekDay(d => Math.max(1, d - 1))} disabled={cashWeekDay <= 1} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #2a3656', background: '#131c33', color: cashWeekDay <= 1 ? '#3d4f72' : '#e8edf7', cursor: cashWeekDay <= 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
                    </button>
                    <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 18, textTransform: 'uppercase', minWidth: 110, textAlign: 'center' }}>Matchday {cashWeekDay}</div>
                    <button onClick={() => setCashWeekDay(d => Math.min(currentMatchday - 1, d + 1))} disabled={cashWeekDay >= currentMatchday - 1} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #2a3656', background: '#131c33', color: cashWeekDay >= currentMatchday - 1 ? '#3d4f72' : '#e8edf7', cursor: cashWeekDay >= currentMatchday - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FinancePanel title="Earnings" color="#5fd49a" sign="+" entries={EARN_CATS.map(c => ({ label: c, amount: weekFinance.earn[c] ?? 0 }))} />
                  <FinancePanel title="Costs"    color="#ff7a6b" sign="-" entries={COST_CATS.map(c => ({ label: c, amount: weekFinance.cost[c] ?? 0 }))} />
                </div>
              </div>
            )}

            {/* ══ BETS ══ */}
            {tab === 'bets' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 20 }}>
                {/* Match list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Matchday {currentMatchday} · Quotes</div>
                    <div style={{ fontSize: 13, color: '#6b7797' }}>Pick a match</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {matchdayFixtures.map(f => {
                      const home = LEAGUE_TEAMS.find(t => t.id === f.homeTeamId)!;
                      const away = LEAGUE_TEAMS.find(t => t.id === f.awayTeamId)!;
                      const [h, a] = computeOdds(home.baseSkill, away.baseSkill);
                      const isMyMatch = f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId;
                      const isSel = nextFix?.id === f.id;
                      return (
                        <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, padding: '11px 16px', borderRadius: 10, border: `1px solid ${isSel ? '#c8f53d' : '#1c2640'}`, background: isSel ? '#131c33' : '#0f1628' }}>
                          <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 14, color: isSel ? '#e8edf7' : '#a9b3cb' }}>{home.name}</div>
                          <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 20, color: isSel ? '#c8f53d' : '#f5c76b', letterSpacing: '0.04em', minWidth: 60, textAlign: 'center' }}>{h}:{a}</div>
                          <div style={{ textAlign: 'left', fontWeight: 600, fontSize: 14, color: isSel ? (isMyMatch ? '#c8f53d' : '#e8edf7') : '#a9b3cb' }}>{away.name}</div>
                        </div>
                      );
                    })}
                    {matchdayFixtures.length === 0 && <div style={{ color: '#6b7797', fontSize: 14 }}>No fixtures this matchday.</div>}
                  </div>
                </div>

                {/* Bet panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {nextFix ? (
                    <>
                      {/* Quote */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 22px', borderRadius: 14, background: '#0f1628', border: '1px solid #1c2640' }}>
                        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Quote</div>
                        <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 56, lineHeight: 1, color: '#f5c76b', letterSpacing: '0.04em' }}>{myOdds}:{oppOdds}</div>
                        <div style={{ fontSize: 13, color: '#8d99b5' }}>{isHome ? myTeam.name : oppTeam?.name} v {isHome ? oppTeam?.name : myTeam.name}</div>
                      </div>
                      {/* Stake controls */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px', borderRadius: 14, background: '#0f1628', border: '1px solid #1c2640' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Your Stake</div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16 }}>£{betStake.toLocaleString()}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[10_000, 50_000, 100_000].map(amt => (
                            <button key={amt} onClick={() => setBetStake(s => s + amt)} style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid #2a3656', background: '#131c33', color: '#e8edf7', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>+£{amt / 1000}K</button>
                          ))}
                          <button onClick={() => setBetStake(0)} style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid #2a3656', background: '#131c33', color: '#8d99b5', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: "'Barlow', system-ui, sans-serif" }}>Clear</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {[
                            { label: 'Betting total', v: betStake > 0 ? `£${betStake.toLocaleString()}` : '£0', color: betStake > 0 ? '#f5c76b' : '#6b7797' },
                            { label: 'Possible win',  v: betStake > 0 ? `£${Math.round(betStake * (winMultiplier - 1)).toLocaleString()}` : '—', color: betStake > 0 ? '#5fd49a' : '#6b7797' },
                          ].map(({ label, v, color }) => (
                            <div key={label} style={{ padding: '10px 12px', borderRadius: 10, background: '#131c33', border: '1px solid #1c2640' }}>
                              <div style={{ fontSize: 11, color: '#8d99b5', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 17, color, marginTop: 4 }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => { if (betStake > 0) { placeBet(betStake, winMultiplier); setBetStake(0); } }}
                          style={{ height: 52, borderRadius: 12, border: 0, background: betStake > 0 ? '#c8f53d' : '#1f2945', color: betStake > 0 ? '#070b16' : '#3d4f72', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: betStake > 0 ? 'pointer' : 'default' }}
                        >Place Bet</button>
                      </div>
                      {/* Existing bets */}
                      <div style={{ padding: '14px 18px', borderRadius: 14, background: '#0f1628', border: '1px solid #1c2640' }}>
                        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600, marginBottom: 10 }}>Your Bets</div>
                        {pendingBet ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 13, color: '#e8edf7' }}>£{pendingBet.amount.toLocaleString()} at ×{pendingBet.winMultiplier.toFixed(2)}</div>
                            <button onClick={cancelBet} style={{ fontSize: 12, color: '#ff7a6b', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Barlow', system-ui, sans-serif", fontWeight: 600 }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: '#6b7797' }}>No bets placed this matchday.</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#6b7797', fontSize: 14, padding: '20px 0' }}>No match this matchday.</div>
                  )}
                </div>
              </div>
            )}

            {/* ══ MEMO ══ */}
            {tab === 'memo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 28, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Memo</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['all', 'money', 'squad', 'club'] as MemoFilter[]).map(f => (
                      <button key={f} onClick={() => setMemoFilter(f)} style={{ height: 34, padding: '0 16px', borderRadius: 17, border: `1px solid ${memoFilter === f ? '#c8f53d' : '#2a3656'}`, background: memoFilter === f ? '#c8f53d' : 'transparent', color: memoFilter === f ? '#070b16' : '#a9b3cb', fontWeight: memoFilter === f ? 700 : 600, fontSize: 13, cursor: 'pointer', fontFamily: "'Barlow', system-ui, sans-serif", textTransform: 'capitalize' }}>{f}</button>
                    ))}
                  </div>
                </div>
                {eventLog.length === 0 ? (
                  <div style={{ color: '#6b7797', fontSize: 14 }}>No events yet.</div>
                ) : (() => {
                  const groups: Record<number, typeof eventLog> = {};
                  for (const e of [...eventLog].reverse()) {
                    if (!groups[e.matchday]) groups[e.matchday] = [];
                    groups[e.matchday].push(e);
                  }
                  return Object.keys(groups).map(Number).sort((a, b) => b - a).map(md => {
                    const entries = groups[md].filter(e => memoFilter === 'all' || memoKind(e.text) === memoFilter);
                    if (entries.length === 0) return null;
                    return (
                      <div key={md}>
                        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f5c76b', fontWeight: 700, marginBottom: 10 }}>Matchday {md}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {entries.map((e, i) => {
                            const kind = memoKind(e.text);
                            const cfg = kind === 'money'
                              ? { icon: '£', bg: 'rgba(95,212,154,0.14)', color: '#5fd49a' }
                              : kind === 'squad'
                              ? { icon: '+', bg: 'rgba(232,72,77,0.16)', color: '#ff9d97' }
                              : { icon: 'C', bg: 'rgba(127,178,255,0.14)', color: '#9cc4ff' };
                            const dot = e.text.indexOf('. ');
                            const title = dot > 0 ? e.text.slice(0, dot) : e.text;
                            const body  = dot > 0 ? e.text.slice(dot + 2) : '';
                            return (
                              <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 10, background: '#0f1628', border: '1px solid #1c2640' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: cfg.color, flexShrink: 0 }}>{cfg.icon}</div>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
                                  {body && <div style={{ fontSize: 13, color: '#8d99b5', marginTop: 2 }}>{body}</div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

          </main>
        </div>
      </div>
    </Layout>
  );
}

/* ── Sub-components ── */

function Pill({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: bg, color, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
      {children}
    </div>
  );
}

function ToggleRow({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderTop: '1px solid #1c2640' }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{label}</div>
        <div style={{ fontSize: 13, color: '#5fd49a', marginTop: 2 }}>{sub}</div>
      </div>
      <button onClick={() => onChange(!value)} style={{ position: 'relative', width: 52, height: 28, borderRadius: 14, cursor: 'pointer', background: value ? '#16a34a' : '#1c2640', border: `1px solid ${value ? '#22c55e' : '#2a3656'}` }}>
        <div style={{ position: 'absolute', top: 4, width: 18, height: 18, background: '#fff', borderRadius: '50%', transition: 'left 0.15s', left: value ? '28px' : '4px' }} />
      </button>
    </div>
  );
}

function FinancePanel({ title, color, sign, entries }: { title: string; color: string; sign: string; entries: { label: string; amount: number }[] }) {
  const active = entries.filter(e => e.amount > 0);
  const max = Math.max(...active.map(e => e.amount), 1);
  const total = active.reduce((s, e) => s + e.amount, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 20px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.06em', color }}>{title}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, color }}>{sign}£{total.toLocaleString()}</div>
      </div>
      {active.map(({ label, amount }) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 14, color: '#c2cbe0' }}>{label}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: '#e8edf7' }}>£{amount.toLocaleString()}</div>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: '#1f2945', overflow: 'hidden' }}>
            <div style={{ height: 4, width: `${(amount / max) * 100}%`, background: color, borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
