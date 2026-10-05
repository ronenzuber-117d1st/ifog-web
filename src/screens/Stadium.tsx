import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';
import { LEAGUE_TEAMS } from '../data/teams';
import { FOOD_REVENUE_PER_MATCH, MERCH_REVENUE_PER_MATCH, TICKET_PRICE_PRESETS, calcDemand, calcTicketSalesByDemand } from '../data/finances';

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
    stadium, balance, upgradeStadium,
    staff, currentMatchday, fixtures, managedTeamId,
    mediaDeal, signMediaDeal, cancelMediaDeal, table, priceLevel,
  } = useGameStore();

  const [tab, setTab] = useState<StadiumTab>('stadium');
  const [fishItem,  setFishItem]  = useState(0);
  const [fishQty,   setFishQty]   = useState<number | ''>('');
  const [fishStock, setFishStock] = useState(() => FISH_ITEMS.map(() => 800));
  const [shopItem,  setShopItem]  = useState(0);
  const [shopQty,   setShopQty]   = useState<number | ''>('');
  const [shopStock, setShopStock] = useState(() => SHOP_ITEMS.map(() => 40));

  const pitchLevel  = stadium.pitch      as 1 | 2 | 3;
  const seatsLevel  = stadium.seats      as 1 | 2 | 3;
  const facilLevel  = stadium.facilities as 1 | 2 | 3;
  const lightsLevel = stadium.lights     as 1 | 2 | 3;

  // Next fixture info (for Magazine)
  const nextFix   = fixtures.find(f => f.matchday === currentMatchday && (f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId) && f.homeGoals === undefined);
  const isHome    = nextFix?.homeTeamId === managedTeamId;
  const myTeam    = LEAGUE_TEAMS.find(t => t.id === managedTeamId)!;
  const oppTeamId = isHome ? nextFix?.awayTeamId : nextFix?.homeTeamId;
  const oppTeam   = LEAGUE_TEAMS.find(t => t.id === oppTeamId);
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
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '39.9%', display: 'flex' }}>
                  <img src={img(`stli${lightsLevel}.png`)}  style={{ width: '29.5%',  height: '100%', objectFit: 'fill', imageRendering: 'pixelated', flexShrink: 0 }} alt="" />
                  <img src={img(`anzeig${facilLevel}.png`)} style={{ flex: 1,         height: '100%', objectFit: 'fill', imageRendering: 'pixelated' }} alt="" />
                  <img src={img(`stre${lightsLevel}.png`)}  style={{ width: '34.25%', height: '100%', objectFit: 'fill', imageRendering: 'pixelated', flexShrink: 0 }} alt="" />
                </div>
                {/* pillar-align: left: seatsLevel >= 2 ? '-2%' : 0, width: seatsLevel >= 2 ? '102%' : '100%' */}
                <img src={img(`trib${seatsLevel}.png`)} style={{
                  position: 'absolute', top: '39.9%', left: 0, width: '100%', height: '21.1%',
                  objectFit: 'fill', imageRendering: 'pixelated',
                }} alt="" />
                <img src={img(`felda${pitchLevel}.png`)} style={{
                  position: 'absolute', bottom: 0, left: 0, width: '100%', height: '39%',
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
                  onUpgrade={() => upgradeStadium('seats')}          style={{ top: '47%', left: '50%', transform: 'translateX(-50%)' }} />
                <UpgradeChip label="Pitch"      current={pitchLevel}  cost={UPGRADE_COSTS.pitch[pitchLevel]}
                  desc={UPGRADE_LABELS.pitch[pitchLevel - 1]}        canAfford={balance >= UPGRADE_COSTS.pitch[pitchLevel]}
                  onUpgrade={() => upgradeStadium('pitch')}          style={{ top: '68%', left: '5%' }} />
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
                    <img src={img(`${teamPortrait(oppTeamId ?? managedTeamId)}.png`)} alt="" style={{ width: '130px', imageRendering: 'pixelated' }} />
                    <div style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>The President</div>
                    <div style={{ fontSize: '18px', fontStyle: 'italic', lineHeight: '1.6' }}>
                      {myShare >= oppShare ? "Nobody beats our Manager!" : "We must do better!"}
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
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
              {staff.cheerleader > 0 ? (
                <img src={img(`cheer${staff.cheerleader}.png`)} alt="Cheerleader"
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
              ) : (
                <div style={{ color: '#64748b', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>💃</div>
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
                    <div style={{ flexShrink: 0, display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #ccc' }}>
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
                        disabled={!fishQty || balance < FISH_ITEMS[fishItem].price * fishQty}
                        onClick={() => {
                          const cost = FISH_ITEMS[fishItem].price * (fishQty || 0);
                          if (!fishQty || balance < cost) return;
                          setFishStock(prev => prev.map((s, i) => i === fishItem ? s + (fishQty || 0) : s));
                          useGameStore.setState(s => ({
                            balance: s.balance - cost,
                            financeHistory: [...s.financeHistory, {
                              matchday: currentMatchday,
                              description: `Fish&Chips: ${FISH_ITEMS[fishItem].name} ×${fishQty}`,
                              amount: -cost,
                              running: s.balance - cost,
                            }],
                          }));
                        }}
                        style={{ padding: '4px 10px', border: '1px solid #888', fontSize: '14px', cursor: balance >= FISH_ITEMS[fishItem].price * fishQty ? 'pointer' : 'default', background: balance >= FISH_ITEMS[fishItem].price * fishQty ? '#ddd' : '#c8c8c8' }}>
                        BUY &gt;&gt;
                      </button>
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
                              <td style={{ textAlign: 'right', padding: '2px 6px' }}>{fishStock[i]}</td>
                              <td style={{ textAlign: 'right', padding: '2px 6px' }}>{item.price.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', padding: '2px 6px', whiteSpace: 'nowrap' }}>400 Pieces</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Profit footer */}
                    {(() => {
                      const TIER_COSTS = [0, 250, 750, 1500];
                      const profit = FOOD_REVENUE_PER_MATCH - TIER_COSTS[staff.fishChips];
                      return (
                        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'baseline', borderTop: '1px solid #aaa', paddingTop: '6px', marginTop: '6px' }}>
                          <span style={{ fontSize: '14px' }}>Revenue £{FOOD_REVENUE_PER_MATCH.toLocaleString()} − staff £{TIER_COSTS[staff.fishChips].toLocaleString()} =</span>
                          <span style={{ fontWeight: 'bold', fontSize: '20px' }}>£{profit.toLocaleString()}/match</span>
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
                    <div style={{ flexShrink: 0, display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #ccc' }}>
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
                        disabled={!shopQty || balance < SHOP_ITEMS[shopItem].price * (shopQty || 0)}
                        onClick={() => {
                          const cost = SHOP_ITEMS[shopItem].price * (shopQty || 0);
                          if (!shopQty || balance < cost) return;
                          setShopStock(prev => prev.map((s, i) => i === shopItem ? s + (shopQty || 0) : s));
                          useGameStore.setState(s => ({
                            balance: s.balance - cost,
                            financeHistory: [...s.financeHistory, {
                              matchday: currentMatchday,
                              description: `Fan Shop: ${SHOP_ITEMS[shopItem].name} ×${shopQty}`,
                              amount: -cost,
                              running: s.balance - cost,
                            }],
                          }));
                        }}
                        style={{ padding: '4px 10px', border: '1px solid #888', fontSize: '14px', cursor: shopQty && balance >= SHOP_ITEMS[shopItem].price * (shopQty || 0) ? 'pointer' : 'default', background: shopQty && balance >= SHOP_ITEMS[shopItem].price * (shopQty || 0) ? '#ddd' : '#c8c8c8' }}>
                        BUY &gt;&gt;
                      </button>
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
                              <td style={{ textAlign: 'right', padding: '2px 6px' }}>{shopStock[i]}</td>
                              <td style={{ textAlign: 'right', padding: '2px 6px' }}>{item.price.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', padding: '2px 6px', whiteSpace: 'nowrap' }}>20 Pieces</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Revenue footer */}
                    {(() => {
                      const TIER_COSTS = [0, 250, 750, 1500];
                      const profit = MERCH_REVENUE_PER_MATCH - TIER_COSTS[staff.fanShop];
                      return (
                        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'baseline', borderTop: '1px solid #aaa', paddingTop: '6px', marginTop: '6px' }}>
                          <span style={{ fontSize: '14px' }}>Revenue £{MERCH_REVENUE_PER_MATCH.toLocaleString()} − staff £{TIER_COSTS[staff.fanShop].toLocaleString()} =</span>
                          <span style={{ fontWeight: 'bold', fontSize: '20px' }}>£{profit.toLocaleString()}/match</span>
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
          {tab === 'viplounge' && (
            <div style={{ height: '100%', overflow: 'hidden', padding: '16px', background: '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              <div style={{ background: '#fff8f0', borderRadius: '2px', padding: '28px 36px', width: '900px', flexShrink: 0, color: '#000', fontFamily: 'serif', boxShadow: '6px 6px 20px rgba(0,0,0,0.6)' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #8b6914', paddingBottom: '12px' }}>
                  <div style={{ fontSize: '14px', letterSpacing: '4px', color: '#8b6914', textTransform: 'uppercase', marginBottom: '6px' }}>Exclusive</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', letterSpacing: '3px' }}>VIP LOUNGE</div>
                </div>
                {/* Image */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <img src={img(`vip${seatsLevel}.png`)} alt="VIP Lounge"
                    style={{ maxWidth: '100%', imageRendering: 'pixelated', display: 'block' }} />
                </div>
                {/* Info columns */}
                <div style={{ display: 'flex', borderTop: '1px solid #c8a84b', paddingTop: '20px', gap: '0' }}>
                  <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #c8a84b', paddingRight: '20px' }}>
                    <div style={{ fontSize: '16px', color: '#8b6914', letterSpacing: '1px', marginBottom: '8px' }}>LOUNGE LEVEL</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{'★'.repeat(seatsLevel)}{'☆'.repeat(3 - seatsLevel)}</div>
                    <div style={{ fontSize: '18px', color: '#555', marginTop: '6px' }}>
                      {seatsLevel === 1 ? 'Standard Suite' : seatsLevel === 2 ? 'Premium Suite' : 'Platinum Suite'}
                    </div>
                  </div>
                  {(() => {
                    const vipSeats = ticketSales[7];
                    const vipPrice = TICKET_PRICE_PRESETS[priceLevel][7];
                    const vipRevenue = vipSeats * vipPrice;
                    return (<>
                      <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #c8a84b', padding: '0 20px' }}>
                        <div style={{ fontSize: '16px', color: '#8b6914', letterSpacing: '1px', marginBottom: '8px' }}>VIP SEATS</div>
                        <div style={{ fontSize: '36px', fontWeight: 'bold', fontFamily: 'monospace' }}>{vipSeats}</div>
                        <div style={{ fontSize: '18px', color: '#555', marginTop: '6px' }}>£{vipPrice.toLocaleString()} / ticket</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', paddingLeft: '20px' }}>
                        <div style={{ fontSize: '16px', color: '#8b6914', letterSpacing: '1px', marginBottom: '8px' }}>REVENUE / MATCH</div>
                        <div style={{ fontSize: '36px', fontWeight: 'bold', fontFamily: 'monospace' }}>£{vipRevenue.toLocaleString()}</div>
                        <div style={{ fontSize: '18px', color: '#555', marginTop: '6px' }}>home matches only</div>
                      </div>
                    </>);
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ═══ RADIO AND TV ═══ */}
          {tab === 'radiotv' && (() => {
            const pos = table.findIndex(r => r.teamId === managedTeamId) + 1 || 20;
            const MEDIA_DEALS = [
              { name: 'Local Radio',       revenuePerMatch: 20_000,  matchdays: 5,  maxPos: 20, desc: 'Community coverage' },
              { name: 'National Radio',    revenuePerMatch: 45_000,  matchdays: 7,  maxPos: 15, desc: 'Top 15 only' },
              { name: 'TV Package',        revenuePerMatch: 75_000,  matchdays: 8,  maxPos: 10, desc: 'Top 10 only' },
              { name: 'Premium Broadcast', revenuePerMatch: 120_000, matchdays: 10, maxPos: 5,  desc: 'Top 5 only' },
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
                            const available = pos <= deal.maxPos;
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
                                  {available ? 'SIGN DEAL' : `Top ${deal.maxPos} only`}
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
