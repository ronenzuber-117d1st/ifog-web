import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';
import { getTeamById } from '../data/teams';
import { TICKET_PRICE_PRESETS, calcDemand, calcTicketSalesByDemand, calcFoodSales, calcMerchSales, calcTotalAttendance } from '../data/finances';

type StadiumTab = 'stadium' | 'magazine' | 'tickets' | 'cheerleader' | 'fishchips' | 'fanshop' | 'viplounge' | 'radiotv';

const UPGRADE_COSTS: Record<string, number[]> = {
  pitch:      [0, 200_000, 500_000],
  seats:      [0, 400_000, 800_000],
  facilities: [0, 100_000, 250_000],
  lights:     [0, 150_000, 350_000],
};

const UPGRADE_LABELS: Record<string, string[]> = {
  pitch:      ['Basic Grass', 'Good Turf', 'Premium Surface'],
  seats:      ['15,000 Seats', '25,000 Seats', '40,000 Seats'],
  facilities: ['Basic Board', 'HD Board', 'Premium Board'],
  lights:     ['Dim Lights', 'Bright Lights', 'Floodlit'],
};

const TAB_ROW1: StadiumTab[] = ['stadium', 'magazine', 'tickets', 'fishchips', 'fanshop'];
const TAB_ROW2: StadiumTab[] = ['cheerleader', 'viplounge', 'radiotv'];
const TAB_LABELS: Record<StadiumTab, string> = {
  stadium: 'Stadium', magazine: 'Magazine', tickets: 'Tickets',
  cheerleader: 'Cheerleader', fishchips: 'Fish & Chips',
  fanshop: 'Fan Shop', viplounge: 'VIP Lounge', radiotv: 'Radio and TV',
};

const TICKET_CATEGORIES = [
  { name: 'Reduced Seats',     price: 5    },
  { name: 'Club Members',      price: 10   },
  { name: 'Stand',             price: 18   },
  { name: 'Terrace',           price: 25   },
  { name: 'Season Members',    price: 150  },
  { name: 'Season Stand',      price: 250  },
  { name: 'Season Terrace',    price: 350  },
  { name: 'VIP Lounge',        price: 1000 },
];

const FISH_ITEMS = [
  { name: 'Bubble Gum', price: 1.00 },
  { name: 'Fries',      price: 3.00 },
  { name: 'Water',      price: 2.00 },
  { name: 'Coke',       price: 4.00 },
  { name: 'Beer',       price: 5.00 },
  { name: 'Sc.Longbread', price: 5.00 },
  { name: 'Beef Burger', price: 4.00 },
  { name: "Fish'n Chips", price: 8.00 },
  { name: 'Hamburger',  price: 10.00 },
  { name: '½ Chicken',  price: 8.00 },
];

const SHOP_ITEMS = [
  { name: 'Balls',        price: 40.00  },
  { name: 'Posters',      price: 10.00  },
  { name: 'Shirts',       price: 100.00 },
  { name: 'Glassware',    price: 50.00  },
  { name: 'Flags',        price: 100.00 },
  { name: 'Caps',         price: 40.00  },
  { name: 'Stickers',     price: 10.00  },
  { name: 'Autographs',   price: 10.00  },
  { name: 'Pillows',      price: 100.00 },
  { name: 'Computergames', price: 40.00 },
];


// One portrait per team (20 teams, 20 distinct portraits)
const TEAM_PORTRAITS = [
  'manag1_1','manag2_1','manag3_1','manag4_1','manag5_1',
  'manag6_1','manak1_1','manak2_1','manak3_1','manak4_1',
  'manag1_2','manag2_2','manag3_2','manag4_2','manag5_2',
  'manag6_2','manak1_2','manak2_2','manak3_2','manak4_2',
];
const teamPortrait = (teamId: number) => TEAM_PORTRAITS[(teamId - 1) % TEAM_PORTRAITS.length];

export function Stadium() {
  const {
    stadium, balance, upgradeStadium, buyVipLounge,
    staff, currentMatchday, fixtures, managedTeamId,
    mediaDeal, signMediaDeal, cancelMediaDeal, table, priceLevel,
    foodStock, shopStock, chairmanPortraitIdx, lastMatch,
  } = useGameStore();

  const [tab, setTab] = useState<StadiumTab>('stadium');
  const [fishItem, setFishItem] = useState(0);
  const [fishQty,  setFishQty]  = useState<number | ''>('');
  const [shopItem, setShopItem] = useState(0);
  const [shopQty,  setShopQty]  = useState<number | ''>('');

  // President quote — context-aware
  const sortedTable = [...table].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
  const myPos = sortedTable.findIndex(r => r.teamId === managedTeamId) + 1;
  const totalTeams = table.length;
  const inRelegation = myPos > totalTeams - 3;
  const inTopHalf = myPos <= totalTeams / 2;
  const lmHome = lastMatch?.fixture.homeTeamId === managedTeamId;
  const lmMyGoals = lastMatch ? (lmHome ? lastMatch.fixture.homeGoals : lastMatch.fixture.awayGoals) : null;
  const lmOppGoals = lastMatch ? (lmHome ? lastMatch.fixture.awayGoals : lastMatch.fixture.homeGoals) : null;
  const lastResult = lmMyGoals === null ? null : lmMyGoals > lmOppGoals! ? 'win' : lmMyGoals < lmOppGoals! ? 'loss' : 'draw';
  const presidentQuote = (() => {
    if (!lastResult) return "Full confidence in our Manager. Let's have a great season!";
    if (lastResult === 'win') {
      if (myPos === 1) return "Top of the table! Nobody beats our Manager!";
      if (myPos <= 3)  return "Excellent! We're right in the title race!";
      if (inTopHalf)   return "That's the spirit! Keep those wins coming!";
      return "A much-needed win! Now let's build on this!";
    }
    if (lastResult === 'loss') {
      if (inRelegation) return "This is a crisis! We must not go down!";
      if (!inTopHalf)   return "We simply cannot lose matches like that.";
      return "Disappointing. I expect much better from this squad.";
    }
    // draw
    if (myPos <= 3)   return "We need to be winning these games, not drawing!";
    if (inRelegation) return "A point helps, but we desperately need wins!";
    return "A point is a point, I suppose. We push on.";
  })();

  const pitchLevel  = stadium.pitch      as 1 | 2 | 3;
  const seatsLevel  = stadium.seats      as 1 | 2 | 3;
  const facilLevel  = stadium.facilities as 1 | 2 | 3;
  const lightsLevel = stadium.lights     as 1 | 2 | 3;

  // Next fixture info (for Magazine)
  const nextFix   = fixtures.find(f => f.matchday === currentMatchday && (f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId) && f.homeGoals === undefined);
  const isHome    = nextFix?.homeTeamId === managedTeamId;
  const myTeam    = getTeamById(managedTeamId)!;
  const oppTeamId = isHome ? nextFix?.awayTeamId : nextFix?.homeTeamId;
  const oppTeam   = getTeamById(oppTeamId);
  const mySkill   = (myTeam?.baseSkill ?? 55) + (isHome ? 3 : 0);
  const oppSkill  = (oppTeam?.baseSkill  ?? 55) + (!isHome ? 3 : 0);
  const total     = mySkill + oppSkill;
  const myShare   = Math.round((mySkill / total) * 34);
  const oppShare  = 34 - myShare;

  const myTableRow  = table.find(r => r.teamId === managedTeamId);
  const myPosition  = table.findIndex(r => r.teamId === managedTeamId) + 1;
  const ppg         = myTableRow && myTableRow.played > 0 ? myTableRow.points / myTableRow.played : 1.5;
  const demand      = calcDemand(myPosition > 0 ? myPosition : 10, ppg);
  const ticketSales = calcTicketSalesByDemand(demand, priceLevel, seatsLevel);
  const attendance  = calcTotalAttendance(demand, priceLevel, seatsLevel);

  const tabBtn = (t: StadiumTab) => {
    const active = tab === t;
    return (
      <button key={t} onClick={() => setTab(t)} style={{
        padding: '7px 16px', fontSize: '13px', cursor: 'pointer',
        fontWeight: active ? 700 : 600,
        background: 'transparent',
        border: 'none',
        borderBottom: `3px solid ${active ? '#c8f53d' : 'transparent'}`,
        marginBottom: '-1px',
        color: active ? '#ffffff' : '#8d99b5',
        whiteSpace: 'nowrap',
      }}>{TAB_LABELS[t]}</button>
    );
  };

  return (
    <Layout>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#070b16', fontFamily: "'Barlow', system-ui, sans-serif", color: '#e8edf7' }}>

        {/* ── Tab bar (single row) ── */}
        <div style={{ flexShrink: 0, padding: '8px 12px 0', background: '#0a0f1d', borderBottom: '1px solid #1c2640' }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            {[...TAB_ROW1, ...TAB_ROW2].map(tabBtn)}
          </div>
        </div>

        {/* ── Content area ── */}
        <div style={{ flex: 1, minHeight: 0 }}>

          {/* ═══ STADIUM ═══ */}
          {tab === 'stadium' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: '#001428' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '41%', display: 'flex' }}>
                  <img src={img(`stli${lightsLevel}.png`)}  style={{ width: '29.5%',  height: '100%', objectFit: 'fill', imageRendering: 'pixelated', flexShrink: 0 }} alt="" />
                  <img src={img(`anzeig${facilLevel}.png`)} style={{ flex: 1,         height: '100%', objectFit: 'fill', imageRendering: 'pixelated' }} alt="" />
                  <img src={img(`stre${lightsLevel}.png`)}  style={{ width: '34.25%', height: '100%', objectFit: 'fill', imageRendering: 'pixelated', flexShrink: 0 }} alt="" />
                </div>
                {/* pillar-align: left: seatsLevel >= 2 ? '-2%' : 0, width: seatsLevel >= 2 ? '102%' : '100%' */}
                <img src={img(`trib${seatsLevel}.png`)} style={{
                  position: 'absolute', top: '41%', left: 0, width: '100%', height: '23%',
                  objectFit: 'fill', imageRendering: 'pixelated',
                }} alt="" />
                <img src={img(`felda${pitchLevel}.png`)} style={{
                  position: 'absolute', bottom: 0, left: 0, width: '100%', height: '36%',
                  objectFit: 'fill', imageRendering: 'pixelated',
                }} alt="" />

                <UpgradeChip label="Lights"     current={lightsLevel} cost={UPGRADE_COSTS.lights[lightsLevel]}
                  desc={UPGRADE_LABELS.lights[lightsLevel - 1]}     canAfford={balance >= UPGRADE_COSTS.lights[lightsLevel]}
                  onUpgrade={() => upgradeStadium('lights')}         style={{ top: '5%', left: '2%' }} />
                <UpgradeChip label="Scoring Board" current={facilLevel}  cost={UPGRADE_COSTS.facilities[facilLevel]}
                  desc={UPGRADE_LABELS.facilities[facilLevel - 1]}   canAfford={balance >= UPGRADE_COSTS.facilities[facilLevel]}
                  onUpgrade={() => upgradeStadium('facilities')}     style={{ top: '5%', left: '50%', transform: 'translateX(-50%)' }} />
                <UpgradeChip label="Seats"      current={seatsLevel}  cost={UPGRADE_COSTS.seats[seatsLevel]}
                  desc={UPGRADE_LABELS.seats[seatsLevel - 1]}        canAfford={balance >= UPGRADE_COSTS.seats[seatsLevel]}
                  onUpgrade={() => upgradeStadium('seats')}          style={{ top: '50%', left: '50%', transform: 'translateX(-50%)' }} />
                <UpgradeChip label="Pitch"      current={pitchLevel}  cost={UPGRADE_COSTS.pitch[pitchLevel]}
                  desc={UPGRADE_LABELS.pitch[pitchLevel - 1]}        canAfford={balance >= UPGRADE_COSTS.pitch[pitchLevel]}
                  onUpgrade={() => upgradeStadium('pitch')}          style={{ top: '72%', left: '5%' }} />
              </div>
              <div style={{ flexShrink: 0, background: '#0a0f1d', borderTop: '1px solid #1c2640', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  {(['pitch', 'seats', 'facilities', 'lights'] as const).map(t => (
                    <div key={t} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>{t}</div>
                      <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px', letterSpacing: '2px' }}>{'★'.repeat(stadium[t])}{'☆'.repeat(3 - stadium[t])}</div>
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>BALANCE</div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: balance >= 0 ? '#4ade80' : '#f87171' }}>£{balance.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ MAGAZINE ═══ */}
          {tab === 'magazine' && (
            <div style={{ height: '100%', overflow: 'auto', padding: '16px', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              <div style={{ background: '#fff', borderRadius: '2px', padding: '18px 22px 30px', width: '760px', flexShrink: 0, position: 'relative', color: '#000', fontFamily: 'serif', boxShadow: '6px 6px 20px rgba(0,0,0,0.6)' }}>

                {/* Top row: Ball logo (absolute) + NEXT MATCH centered on full width */}
                <div style={{ position: 'relative', marginBottom: '18px', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, background: '#8b00cc', color: '#fff', fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: '36px', padding: '6px 18px', letterSpacing: '2px' }}>Ball</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '26px', letterSpacing: '4px', borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '10px' }}>NEXT MATCH</div>
                    <div style={{ fontSize: '20px' }}>{isHome ? myTeam.name : (oppTeam?.name ?? '?')}</div>
                    <div style={{ fontSize: '20px' }}>{isHome ? (oppTeam?.name ?? '?') : myTeam.name}</div>
                  </div>
                </div>

                {/* Three columns */}
                <div style={{ display: 'flex', borderTop: '2px solid #ccc', paddingTop: '16px' }}>
                  {/* Expert Ronnie Rumor */}
                  <div style={{ flex: 1, textAlign: 'center', paddingRight: '14px', borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'Georgia, serif', lineHeight: '1.3' }}>Expert<br />Ronnie Rumor</div>
                    <div style={{ fontSize: '40px', fontWeight: 'bold', letterSpacing: '3px', fontFamily: 'monospace' }}>
                      {Math.max(0, Math.round(myShare / 9))} : {Math.max(0, Math.round(oppShare / 11))}
                    </div>
                  </div>

                  {/* The President — opponent team's manager */}
                  <div style={{ flex: 1, textAlign: 'center', padding: '0 14px', borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <img src={img(`${TEAM_PORTRAITS[chairmanPortraitIdx]}.png`)} alt="" style={{ width: '130px', imageRendering: 'pixelated' }} />
                    <div style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>The President</div>
                    <div style={{ fontSize: '18px', fontStyle: 'italic', lineHeight: '1.6' }}>
                      {presidentQuote}
                    </div>
                  </div>

                  {/* Football betting */}
                  <div style={{ flex: 1, textAlign: 'center', paddingLeft: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'Georgia, serif', lineHeight: '1.3' }}>Football<br />betting</div>
                    <div style={{ fontSize: '20px' }}>Quote</div>
                    <div style={{ fontSize: '40px', fontWeight: 'bold', letterSpacing: '3px', fontFamily: 'monospace' }}>{myShare} : {oppShare}</div>
                  </div>
                </div>

                {/* Page curl */}
                <div style={{ position: 'absolute', bottom: '8px', right: '8px' }}>
                  <img src={img('curl.png')} alt="" style={{ width: '50px', imageRendering: 'pixelated' }} />
                </div>
              </div>
            </div>
          )}

          {/* ═══ TICKETS ═══ */}
          {tab === 'tickets' && (
            <div style={{ height: '100%', overflow: 'hidden', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
              <div style={{ width: '620px', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '6px 6px 20px rgba(0,0,0,0.6)' }}>
                <div style={{ flex: '0 0 40%', overflow: 'hidden' }}>
                  <img src={img(`ticket${staff.ticketSales === 0 ? 0 : (staff.ticketSales - 1) * 2 + 1 + (currentMatchday % 2)}.png`)} alt="Tickets" style={{ width: '100%', height: '100%', objectFit: 'fill', imageRendering: 'pixelated' }} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden', background: '#f0f0f0', color: '#000', fontFamily: 'monospace', fontSize: '15px', padding: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px', height: '100%' }}>
                    <div style={{ flex: 1, border: '1px solid #aaa', padding: '10px', overflow: 'hidden' }}>
                      <div style={{ fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #aaa', paddingBottom: '5px', marginBottom: '6px', fontSize: '17px' }}>Ticket prices</div>
                      {TICKET_CATEGORIES.map((cat, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 2px' }}>
                          <span>{cat.name}</span>
                          <span style={{ textAlign: 'center', minWidth: '60px' }}>{TICKET_PRICE_PRESETS[priceLevel][i].toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ width: '170px', border: '1px solid #aaa', padding: '10px', overflow: 'hidden' }}>
                      <div style={{ fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #aaa', paddingBottom: '5px', marginBottom: '6px', fontSize: '17px' }}>Est. / Match</div>
                      {ticketSales.map((s, i) => (
                        <div key={i} style={{ textAlign: 'center', padding: '3px 2px' }}>{s.toLocaleString()}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ CHEERLEADER ═══ */}
          {tab === 'cheerleader' && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', padding: '16px', boxSizing: 'border-box' }}>
              {staff.cheerleader > 0 ? (
                <img src={img(`cheer${staff.cheerleader}.png`)} alt="Cheerleader"
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
              ) : (
                <div style={{ color: '#64748b', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px' }}>No cheerleader hired</div>
                  <div style={{ fontSize: '11px', color: '#374151', marginTop: '6px' }}>Hire from Desk → Personnel → Cheerleader</div>
                </div>
              )}
            </div>
          )}

          {/* ═══ FISH & CHIPS ═══ */}
          {tab === 'fishchips' && (
            <div style={{ height: '100%', overflow: 'hidden', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
              <div style={{ width: '620px', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '6px 6px 20px rgba(0,0,0,0.6)' }}>
                <div style={{ flex: '0 0 40%', overflow: 'hidden' }}>
                  <img src={img(`pommes${staff.fishChips === 0 ? 0 : (staff.fishChips - 1) * 2 + 1 + (currentMatchday % 2)}.png`)} alt="Fish & Chips"
                    style={{ width: '100%', height: '100%', objectFit: 'fill', imageRendering: 'pixelated' }} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '10px 14px', background: '#f0f0f0', color: '#000', fontFamily: 'monospace', fontSize: '15px' }}>
                  {staff.fishChips > 0 ? (<>
                    {/* Purchase bar */}
                    <div style={{ flexShrink: 0, marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #ccc' }}>
                      {/* Per-item row */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '6px' }}>
                        <div>
                          <div style={{ fontSize: '12px', marginBottom: '2px' }}>Item</div>
                          <select value={fishItem} onChange={e => setFishItem(Number(e.target.value))}
                            style={{ fontSize: '14px', border: '1px solid #888', padding: '3px 4px' }}>
                            {FISH_ITEMS.map((item, i) => <option key={i} value={i}>{item.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', marginBottom: '2px' }}>Qty</div>
                          <input type="number" min={1} value={fishQty}
                            onChange={e => setFishQty(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                            onFocus={e => e.target.select()}
                            style={{ width: '55px', border: '1px solid #888', padding: '3px 4px', fontSize: '14px' }} />
                        </div>
                        <div style={{ fontSize: '14px', paddingBottom: '3px' }}>
                          Cost: <strong>£{(FISH_ITEMS[fishItem].price * (fishQty || 0)).toFixed(2)}</strong>
                        </div>
                        <button
                          disabled={!fishQty}
                          onClick={() => {
                            const cost = FISH_ITEMS[fishItem].price * (fishQty || 0);
                            if (!fishQty) return;
                            useGameStore.setState(s => ({
                              balance: s.balance - cost,
                              foodStock: s.foodStock.map((n, i) => i === fishItem ? n + (fishQty as number) : n),
                              financeHistory: [...s.financeHistory, {
                                matchday: currentMatchday,
                                description: `Fish&Chips: ${FISH_ITEMS[fishItem].name} ×${fishQty}`,
                                amount: -cost,
                                running: s.balance - cost,
                              }],
                            }));
                            setFishQty('');
                          }}
                          style={{ padding: '4px 10px', border: '1px solid #888', fontSize: '14px', cursor: fishQty ? 'pointer' : 'default', background: fishQty ? '#ddd' : '#c8c8c8' }}>
                          BUY &gt;&gt;
                        </button>
                      </div>
                      {/* Fill-to-demand row */}
                      {(() => {
                        const demand = calcFoodSales(attendance, staff.fishChips).unitsSold;
                        const shortfall = demand.map((qty, i) => Math.max(0, qty - foodStock[i]));
                        const restockCost = shortfall.reduce((sum, qty, i) => sum + qty * FISH_ITEMS[i].price, 0);
                        const nothingNeeded = restockCost === 0;
                        return (
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#555' }}>Fill to match demand:</span>
                            <span style={{ fontSize: '13px' }}>
                              Cost: <strong>£{restockCost.toLocaleString()}</strong>
                            </span>
                            <button
                              disabled={nothingNeeded}
                              onClick={() => {
                                useGameStore.setState(s => {
                                  const d = calcFoodSales(attendance, staff.fishChips).unitsSold;
                                  const sf = d.map((qty, i) => Math.max(0, qty - s.foodStock[i]));
                                  const cost = sf.reduce((sum, qty, i) => sum + qty * FISH_ITEMS[i].price, 0);
                                  if (cost <= 0) return s;
                                  return {
                                    balance: s.balance - cost,
                                    foodStock: s.foodStock.map((qty, i) => qty + sf[i]),
                                    financeHistory: [...s.financeHistory, {
                                      matchday: currentMatchday,
                                      description: 'Fish&Chips: Restock all',
                                      amount: -cost,
                                      running: s.balance - cost,
                                    }],
                                  };
                                });
                              }}
                              style={{ padding: '4px 10px', border: '1px solid #888', fontSize: '14px', cursor: !nothingNeeded ? 'pointer' : 'default', background: nothingNeeded ? '#e8e8e8' : '#ddd', color: nothingNeeded ? '#999' : '#000' }}>
                              {nothingNeeded ? 'Fully stocked' : 'RESTOCK ALL >>'}
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Table — only this part scrolls */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #aaa' }}>
                            <th style={{ textAlign: 'left',  padding: '2px 6px', fontSize: '16px' }}>Item</th>
                            <th style={{ textAlign: 'right', padding: '2px 6px', fontSize: '16px' }}>Stock</th>
                            <th style={{ textAlign: 'right', padding: '2px 6px', fontSize: '16px' }}>Price</th>
                            <th style={{ textAlign: 'right', padding: '2px 6px', fontSize: '16px' }}>Sales</th>
                          </tr>
                        </thead>
                        <tbody>
                          {FISH_ITEMS.map((item, i) => (
                            <tr key={i}>
                              <td style={{ padding: '2px 6px' }}>{item.name}</td>
                              <td style={{ textAlign: 'right', padding: '2px 6px' }}>{foodStock[i] ?? 0}</td>
                              <td style={{ textAlign: 'right', padding: '2px 6px' }}>{item.price.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', padding: '2px 6px', whiteSpace: 'nowrap' }}>—</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Profit footer */}
                    {(() => {
                      const TIER_COSTS = [0, 250, 750, 1500];
                      const fs = calcFoodSales(attendance, staff.fishChips);
                      const actualSold = fs.unitsSold.map((qty, i) => Math.min(qty, foodStock[i] ?? 0));
                      const revenue = actualSold.reduce((sum, qty, i) => sum + qty * FISH_ITEMS[i].price, 0);
                      const staffCost = TIER_COSTS[staff.fishChips];
                      return (
                        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'baseline', borderTop: '1px solid #aaa', paddingTop: '6px', marginTop: '6px' }}>
                          <span style={{ fontSize: '14px' }}>Est. sales £{revenue.toLocaleString()} − staff £{staffCost.toLocaleString()} =</span>
                          <span style={{ fontWeight: 'bold', fontSize: '20px' }}>£{(revenue - staffCost).toLocaleString()}/match</span>
                        </div>
                      );
                    })()}
                  </>) : (
                    <div style={{ color: '#555', textAlign: 'center', paddingTop: '30px', fontSize: '20px' }}>
                      No Fish &amp; Chips stall hired<br />
                      <span style={{ fontSize: '16px', color: '#777' }}>Hire from Desk → Personnel</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ FAN SHOP ═══ */}
          {tab === 'fanshop' && (
            <div style={{ height: '100%', overflow: 'hidden', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
              <div style={{ width: '620px', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '6px 6px 20px rgba(0,0,0,0.6)' }}>
                <div style={{ flex: '0 0 40%', overflow: 'hidden' }}>
                  <img src={img(`fanbude${staff.fanShop === 0 ? 0 : (staff.fanShop - 1) * 2 + 1 + (currentMatchday % 2)}.png`)} alt="Fan Shop"
                    style={{ width: '100%', height: '100%', objectFit: 'fill', imageRendering: 'pixelated' }} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '10px 14px', background: '#f0f0f0', color: '#000', fontFamily: 'monospace', fontSize: '15px' }}>
                  {staff.fanShop > 0 ? (<>
                    {/* Purchase bar */}
                    <div style={{ flexShrink: 0, marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #ccc' }}>
                      {/* Per-item row */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '6px' }}>
                        <div>
                          <div style={{ fontSize: '12px', marginBottom: '2px' }}>Item</div>
                          <select value={shopItem} onChange={e => setShopItem(Number(e.target.value))}
                            style={{ fontSize: '14px', border: '1px solid #888', padding: '3px 4px' }}>
                            {SHOP_ITEMS.map((item, i) => <option key={i} value={i}>{item.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', marginBottom: '2px' }}>Qty</div>
                          <input type="number" min={1} value={shopQty}
                            onChange={e => setShopQty(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                            onFocus={e => e.target.select()}
                            style={{ width: '55px', border: '1px solid #888', padding: '3px 4px', fontSize: '14px' }} />
                        </div>
                        <div style={{ fontSize: '14px', paddingBottom: '3px' }}>
                          Cost: <strong>£{(SHOP_ITEMS[shopItem].price * (shopQty || 0)).toFixed(2)}</strong>
                        </div>
                        <button
                          disabled={!shopQty}
                          onClick={() => {
                            const cost = SHOP_ITEMS[shopItem].price * (shopQty || 0);
                            if (!shopQty) return;
                            useGameStore.setState(s => ({
                              balance: s.balance - cost,
                              shopStock: s.shopStock.map((n, i) => i === shopItem ? n + (shopQty as number) : n),
                              financeHistory: [...s.financeHistory, {
                                matchday: currentMatchday,
                                description: `Fan Shop: ${SHOP_ITEMS[shopItem].name} ×${shopQty}`,
                                amount: -cost,
                                running: s.balance - cost,
                              }],
                            }));
                            setShopQty('');
                          }}
                          style={{ padding: '4px 10px', border: '1px solid #888', fontSize: '14px', cursor: shopQty ? 'pointer' : 'default', background: shopQty ? '#ddd' : '#c8c8c8' }}>
                          BUY &gt;&gt;
                        </button>
                      </div>
                      {/* Fill-to-demand row */}
                      {(() => {
                        const demand = calcMerchSales(attendance, staff.fanShop).unitsSold;
                        const shortfall = demand.map((qty, i) => Math.max(0, qty - shopStock[i]));
                        const restockCost = shortfall.reduce((sum, qty, i) => sum + qty * SHOP_ITEMS[i].price, 0);
                        const nothingNeeded = restockCost === 0;
                        return (
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: '#555' }}>Fill to match demand:</span>
                            <span style={{ fontSize: '13px' }}>
                              Cost: <strong>£{restockCost.toLocaleString()}</strong>
                            </span>
                            <button
                              disabled={nothingNeeded}
                              onClick={() => {
                                useGameStore.setState(s => {
                                  const d = calcMerchSales(attendance, staff.fanShop).unitsSold;
                                  const sf = d.map((qty, i) => Math.max(0, qty - s.shopStock[i]));
                                  const cost = sf.reduce((sum, qty, i) => sum + qty * SHOP_ITEMS[i].price, 0);
                                  if (cost <= 0) return s;
                                  return {
                                    balance: s.balance - cost,
                                    shopStock: s.shopStock.map((qty, i) => qty + sf[i]),
                                    financeHistory: [...s.financeHistory, {
                                      matchday: currentMatchday,
                                      description: 'Fan Shop: Restock all',
                                      amount: -cost,
                                      running: s.balance - cost,
                                    }],
                                  };
                                });
                              }}
                              style={{ padding: '4px 10px', border: '1px solid #888', fontSize: '14px', cursor: !nothingNeeded ? 'pointer' : 'default', background: nothingNeeded ? '#e8e8e8' : '#ddd', color: nothingNeeded ? '#999' : '#000' }}>
                              {nothingNeeded ? 'Fully stocked' : 'RESTOCK ALL >>'}
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Table — only rows scroll */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #aaa' }}>
                            <th style={{ textAlign: 'left',  padding: '2px 6px', fontSize: '16px' }}>Item</th>
                            <th style={{ textAlign: 'right', padding: '2px 6px', fontSize: '16px' }}>Stock</th>
                            <th style={{ textAlign: 'right', padding: '2px 6px', fontSize: '16px' }}>Price</th>
                            <th style={{ textAlign: 'right', padding: '2px 6px', fontSize: '16px' }}>Sales</th>
                          </tr>
                        </thead>
                        <tbody>
                          {SHOP_ITEMS.map((item, i) => (
                            <tr key={i}>
                              <td style={{ padding: '2px 6px' }}>{item.name}</td>
                              <td style={{ textAlign: 'right', padding: '2px 6px' }}>{shopStock[i] ?? 0}</td>
                              <td style={{ textAlign: 'right', padding: '2px 6px' }}>{item.price.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', padding: '2px 6px', whiteSpace: 'nowrap' }}>—</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Revenue footer */}
                    {(() => {
                      const TIER_COSTS = [0, 250, 750, 1500];
                      const ms = calcMerchSales(attendance, staff.fanShop);
                      const actualSold = ms.unitsSold.map((qty, i) => Math.min(qty, shopStock[i] ?? 0));
                      const revenue = actualSold.reduce((sum, qty, i) => sum + qty * SHOP_ITEMS[i].price, 0);
                      const staffCost = TIER_COSTS[staff.fanShop];
                      return (
                        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'baseline', borderTop: '1px solid #aaa', paddingTop: '6px', marginTop: '6px' }}>
                          <span style={{ fontSize: '14px' }}>Est. sales £{revenue.toLocaleString()} − staff £{staffCost.toLocaleString()} =</span>
                          <span style={{ fontWeight: 'bold', fontSize: '20px' }}>£{(revenue - staffCost).toLocaleString()}/match</span>
                        </div>
                      );
                    })()}
                  </>) : (
                    <div style={{ color: '#555', textAlign: 'center', paddingTop: '30px', fontSize: '20px' }}>
                      No Fan Shop hired<br />
                      <span style={{ fontSize: '16px', color: '#777' }}>Hire from Desk → Personnel</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ VIP LOUNGE ═══ */}
          {tab === 'viplounge' && (() => {
            const vipLevel = stadium.vipLounge;
            const VIP_COSTS = [0, 150_000, 350_000, 700_000];
            const VIP_NAMES = ['', 'Standard Suite', 'Premium Suite', 'Platinum Suite'];
            const nextLevel = vipLevel + 1;
            const canUpgrade = nextLevel <= 3 && nextLevel <= seatsLevel;
            const upgradeCost = nextLevel <= 3 ? VIP_COSTS[nextLevel] : 0;
            const canAffordUpgrade = balance >= upgradeCost;
            const needsSeats = nextLevel <= 3 && nextLevel > seatsLevel;
            const vipSeats = ticketSales[7];
            const vipPrice = TICKET_PRICE_PRESETS[priceLevel][7];
            const vipRevenue = vipSeats * vipPrice;
            return (
              <div style={{ height: '100%', overflow: 'hidden', padding: '16px', background: '#2a1a00', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                <div style={{ width: '900px', height: '100%', display: 'flex', flexDirection: 'column', background: '#fff8f0', color: '#000', fontFamily: 'serif', boxShadow: '6px 6px 20px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ flexShrink: 0, textAlign: 'center', padding: '10px 28px 8px', borderBottom: '2px solid #8b6914' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '4px', color: '#8b6914', textTransform: 'uppercase', marginBottom: '2px' }}>Exclusive</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '3px' }}>VIP LOUNGE</div>
                  </div>
                  {/* Image */}
                  <div style={{ flex: '0 0 45%', overflow: 'hidden', background: '#1a0800', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <img src={img(`vip${Math.max(1, vipLevel)}.png`)} alt="VIP Lounge"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', imageRendering: 'pixelated', filter: vipLevel === 0 ? 'grayscale(1) brightness(0.35)' : 'none' }} />
                    {vipLevel === 0 && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center', color: '#c8a84b' }}>
                          <div style={{ fontSize: '48px', lineHeight: 1 }}>🔒</div>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '3px', textTransform: 'uppercase', marginTop: '8px', fontFamily: 'sans-serif' }}>Not Built</div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Info columns */}
                  <div style={{ flex: 1, display: 'flex', padding: '0 20px', borderTop: '1px solid #c8a84b', alignItems: 'center' }}>
                    {/* Column 1: Level */}
                    <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #c8a84b', paddingRight: '20px' }}>
                      <div style={{ fontSize: '13px', color: '#8b6914', letterSpacing: '1px', marginBottom: '6px' }}>LOUNGE LEVEL</div>
                      <div style={{ fontSize: '26px', fontWeight: 'bold' }}>{'★'.repeat(vipLevel)}{'☆'.repeat(3 - vipLevel)}</div>
                      <div style={{ fontSize: '15px', color: vipLevel > 0 ? '#555' : '#aaa', marginTop: '4px' }}>
                        {vipLevel > 0 ? VIP_NAMES[vipLevel] : 'Not Built'}
                      </div>
                    </div>
                    {/* Column 2: Revenue */}
                    <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #c8a84b', padding: '0 20px' }}>
                      <div style={{ fontSize: '13px', color: '#8b6914', letterSpacing: '1px', marginBottom: '6px' }}>VIP SEATS</div>
                      {vipLevel > 0 ? (<>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', fontFamily: 'monospace' }}>{vipSeats}</div>
                        <div style={{ fontSize: '15px', color: '#555', marginTop: '4px' }}>£{vipPrice.toLocaleString()} / ticket</div>
                      </>) : (<>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace', color: '#bbb' }}>—</div>
                        <div style={{ fontSize: '13px', color: '#aaa', marginTop: '4px' }}>build to unlock</div>
                      </>)}
                    </div>
                    {/* Column 3: Revenue / Upgrade */}
                    <div style={{ flex: 1, textAlign: 'center', paddingLeft: '20px' }}>
                      {vipLevel > 0 && vipLevel < 3 ? (<>
                        <div style={{ fontSize: '13px', color: '#8b6914', letterSpacing: '1px', marginBottom: '6px' }}>REVENUE / MATCH</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'monospace' }}>£{vipRevenue.toLocaleString()}</div>
                        <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>home matches only</div>
                      </>) : vipLevel === 3 ? (<>
                        <div style={{ fontSize: '13px', color: '#8b6914', letterSpacing: '1px', marginBottom: '6px' }}>REVENUE / MATCH</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'monospace' }}>£{vipRevenue.toLocaleString()}</div>
                        <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>home matches only</div>
                      </>) : null}
                      {vipLevel === 0 && (
                        <div style={{ fontSize: '13px', color: '#8b6914', letterSpacing: '1px', marginBottom: '6px' }}>REVENUE / MATCH</div>
                      )}
                      {vipLevel === 0 && (
                        <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace', color: '#bbb' }}>—</div>
                      )}
                    </div>
                  </div>
                  {/* Upgrade footer */}
                  <div style={{ flexShrink: 0, borderTop: '1px solid #c8a84b', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fdf3dc' }}>
                    <div>
                      {vipLevel < 3 ? (<>
                        <div style={{ fontSize: '11px', color: '#8b6914', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
                          {vipLevel === 0 ? 'Build VIP Lounge' : `Upgrade to ${VIP_NAMES[nextLevel]}`}
                        </div>
                        <div style={{ fontSize: '13px', color: needsSeats ? '#999' : '#555' }}>
                          {needsSeats
                            ? `Requires Seats Level ${nextLevel} — upgrade your stadium first`
                            : `Cost: £${upgradeCost.toLocaleString()}`}
                        </div>
                      </>) : (
                        <div>
                          <div style={{ fontSize: '11px', color: '#8b6914', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>Platinum Suite</div>
                          <div style={{ fontSize: '13px', color: '#555' }}>Maximum level reached</div>
                        </div>
                      )}
                    </div>
                    {vipLevel < 3 && (
                      <button
                        disabled={!canUpgrade || !canAffordUpgrade}
                        onClick={buyVipLounge}
                        style={{
                          padding: '8px 24px', fontSize: '14px', fontWeight: 'bold', fontFamily: 'sans-serif',
                          letterSpacing: '1px', textTransform: 'uppercase',
                          background: canUpgrade && canAffordUpgrade ? '#8b6914' : '#ccc',
                          color: canUpgrade && canAffordUpgrade ? '#fff8f0' : '#888',
                          border: 'none', cursor: canUpgrade && canAffordUpgrade ? 'pointer' : 'default',
                          borderRadius: '4px',
                        }}
                      >
                        {needsSeats ? '🔒 Locked' : canAffordUpgrade ? `▶ Build` : 'Insufficient funds'}
                      </button>
                    )}
                    {vipLevel === 3 && (
                      <div style={{ fontSize: '22px', color: '#8b6914', fontWeight: 'bold' }}>★★★ MAX ✓</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ═══ RADIO AND TV ═══ */}
          {tab === 'radiotv' && (() => {
            const myRow = table.find(r => r.teamId === managedTeamId);
            const pos = table.findIndex(r => r.teamId === managedTeamId) + 1 || 20;
            const played = myRow?.played ?? 0;
            const MEDIA_DEALS = [
              { name: 'Local Radio',       revenuePerMatch: 20_000,  matchdays: 5,  maxPos: 20, minPlayed: 3,  desc: 'Community coverage' },
              { name: 'National Radio',    revenuePerMatch: 45_000,  matchdays: 7,  maxPos: 15, minPlayed: 8,  desc: 'Top 15 only' },
              { name: 'TV Package',        revenuePerMatch: 75_000,  matchdays: 8,  maxPos: 10, minPlayed: 15, desc: 'Top 10 only' },
              { name: 'Premium Broadcast', revenuePerMatch: 120_000, matchdays: 10, maxPos: 5,  minPlayed: 20, desc: 'Top 5 only' },
            ];
            return (
              <div style={{ height: '100%', overflow: 'hidden', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
                <div style={{ width: '760px', height: '100%', display: 'flex', flexDirection: 'column', background: '#f4f4f4', color: '#000', fontFamily: 'sans-serif', boxShadow: '6px 6px 20px rgba(0,0,0,0.6)', overflow: 'hidden' }}>

                  {/* Header */}
                  <div style={{ flexShrink: 0, textAlign: 'center', padding: '10px 28px 8px', borderBottom: '2px solid #1a1a2e' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '4px', color: '#1a1a2e', textTransform: 'uppercase', marginBottom: '2px' }}>Broadcast Rights</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '2px', fontFamily: 'serif' }}>RADIO AND TV</div>
                  </div>

                  {/* Image */}
                  <div style={{ flex: '0 0 45%', overflow: 'hidden', background: '#2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={img(mediaDeal ? 'medien.png' : 'medienm.png')} alt="Radio and TV"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, overflow: 'hidden', padding: '12px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {mediaDeal ? (
                      <div style={{ display: 'flex', gap: '0', borderTop: '1px solid #aaa', paddingTop: '12px' }}>
                        <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #aaa', paddingRight: '12px' }}>
                          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' }}>Status</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>● ON AIR</div>
                          <div style={{ fontSize: '13px', color: '#555', marginTop: '3px' }}>{mediaDeal.name}</div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #aaa', padding: '0 12px' }}>
                          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' }}>Matchdays Left</div>
                          <div style={{ fontSize: '26px', fontWeight: 'bold', fontFamily: 'monospace' }}>{mediaDeal.matchdaysLeft}</div>
                          <div style={{ fontSize: '12px', color: '#555' }}>of {mediaDeal.matchdays}</div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #aaa', padding: '0 12px' }}>
                          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' }}>Revenue / Home Match</div>
                          <div style={{ fontSize: '26px', fontWeight: 'bold', fontFamily: 'monospace' }}>£{mediaDeal.revenuePerMatch.toLocaleString()}</div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', paddingLeft: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <button onClick={cancelMediaDeal} style={{ padding: '7px 14px', background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', borderRadius: '4px' }}>
                            Cancel Deal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#555', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Available Deals — Your position: #{pos}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {MEDIA_DEALS.map(deal => {
                            const posOk    = pos <= deal.maxPos;
                            const playedOk = played >= deal.minPlayed;
                            const available = posOk && playedOk;
                            const btnLabel = available ? 'SIGN DEAL'
                              : !playedOk ? `From MD ${deal.minPlayed}`
                              : `Top ${deal.maxPos} only`;
                            return (
                              <div key={deal.name} style={{ flex: 1, border: `1px solid ${available ? '#1a1a2e' : '#ccc'}`, borderRadius: '4px', padding: '10px 8px', textAlign: 'center', background: available ? '#fff' : '#ebebeb', opacity: available ? 1 : 0.55 }}>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '3px' }}>{deal.name}</div>
                                <div style={{ fontSize: '11px', color: '#777', marginBottom: '6px' }}>{deal.desc}</div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: '1px' }}>£{deal.revenuePerMatch.toLocaleString()}</div>
                                <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px' }}>/match · {deal.matchdays} matchdays</div>
                                <button
                                  disabled={!available}
                                  onClick={() => signMediaDeal({ name: deal.name, revenuePerMatch: deal.revenuePerMatch, matchdays: deal.matchdays, matchdaysLeft: deal.matchdays })}
                                  style={{ padding: '5px 10px', background: available ? '#1a1a2e' : '#ccc', color: available ? '#fff' : '#888', border: 'none', borderRadius: '4px', cursor: available ? 'pointer' : 'default', fontSize: '12px', fontWeight: 'bold', width: '100%' }}>
                                  {btnLabel}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </Layout>
  );
}

function UpgradeChip({ label, current, cost, desc, canAfford, onUpgrade, style }: {
  label: string; current: 1 | 2 | 3; cost: number; desc: string;
  canAfford: boolean; onUpgrade: () => void; style: React.CSSProperties;
}) {
  const maxed = current >= 3;
  return (
    <div style={{
      position: 'absolute', zIndex: 10,
      background: 'rgba(0,0,20,0.82)', border: '1px solid #556', borderRadius: '4px',
      padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '8px', ...style,
    }}>
      <div>
        <div style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>{desc}</div>
        <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
          {[1, 2, 3].map(l => (
            <div key={l} style={{ width: '18px', height: '4px', borderRadius: '2px', background: l <= current ? '#c8f53d' : '#1c2640' }} />
          ))}
        </div>
      </div>
      {!maxed ? (
        <button disabled={!canAfford} onClick={onUpgrade} style={{
          background: canAfford ? '#1e40af' : '#111827',
          border: `1px solid ${canAfford ? '#3b82f6' : '#374151'}`,
          borderRadius: '4px', color: canAfford ? '#fff' : '#4b5563',
          padding: '4px 8px', fontSize: '10px', fontWeight: 'bold',
          cursor: canAfford ? 'pointer' : 'default', whiteSpace: 'nowrap',
        }}>▶ £{cost.toLocaleString()}</button>
      ) : (
        <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: 'bold' }}>MAX ✓</div>
      )}
    </div>
  );
}
