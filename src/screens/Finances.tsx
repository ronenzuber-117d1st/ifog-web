import { useState, useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';
import type { Player, Position } from '../types/game';
import type { SponsorDeal } from '../store/useGameStore';

type Tab = 'shirt' | 'borders' | 'transfer';

const SHIRT_COMPANIES = ['SportoMax','PowerFit','ChampGear','VeloSport','TurboKit','GoalPro','KickKing','StrikerFuel','PitchMaster','FanZone'];
const BORDER_COMPANIES = ['SportsBet Pro','FootballHub','GoalZone','BallMaster','MatchFinder','CrownSport','TurfKing'];

function lcg(seed: number) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => { s = ((s * 1664525) + 1013904223) >>> 0; return s / 0xffffffff; };
}

function generateShirtOffers(matchday: number, teamId: number): SponsorDeal[] {
  return Array.from({ length: 5 }, (_, slot) => {
    const rng = lcg(matchday * 1337 + teamId * 7 + slot * 883);
    return {
      name: SHIRT_COMPANIES[Math.floor(rng() * SHIRT_COMPANIES.length)],
      amount: Math.round((rng() * 900_000 + 200_000) / 50_000) * 50_000,
      matchdays: 38,
      matchdaysLeft: 38,
    };
  });
}

function generateBorderOffers(matchday: number, teamId: number): SponsorDeal[] {
  return Array.from({ length: 5 }, (_, slot) => {
    const rng = lcg(matchday * 2673 + teamId * 13 + slot * 997);
    const md = Math.floor(rng() * 5) + 4;
    return {
      name: BORDER_COMPANIES[Math.floor(rng() * BORDER_COMPANIES.length)],
      amount: Math.round((rng() * 55_000 + 15_000) / 5_000) * 5_000,
      matchdays: md,
      matchdaysLeft: md,
    };
  });
}

const HIRE_NAMES = {
  T: ['Kopke','Iliushin','Kalvin','Napper','Sherman','Vickers','Cobben','Davis'],
  V: ['Amaretto','Cruff','Henman','Johnson','Moore','Vincent','Adams','Lawson','Peel','Reynolds','Thorn'],
  M: ['De Toto','Romarino','Allen','Campbell','Jones','Myers','Smith','Vine','Beesley','Foster','Newman'],
  S: ['Klinsman','Yuruba','Donaldson','Ellis','Lee','Osbourne','Quentin','Walters','Court','Evergreen'],
};

function generateHirePlayers(matchday: number, teamId: number): Player[] {
  const rng = lcg(matchday * 9181 + teamId * 29);
  const positions: Position[] = ['T', 'V', 'V', 'M', 'M', 'S'];
  return positions.map((pos, i) => {
    const names = HIRE_NAMES[pos];
    const name = names[Math.floor(rng() * names.length)] + ' ' + String.fromCharCode(65 + Math.floor(rng() * 26)) + '.';
    const skill = Math.floor(rng() * 4) + 4;
    const age = Math.floor(rng() * 12) + 20;
    return { id: `hire-${matchday}-${i}`, name, position: pos, skill, age, injuredFor: 0, suspended: false, trainingProgress: 0 };
  });
}

const POS_LABEL: Record<string, string> = { T: 'GK', V: 'DEF', M: 'MID', S: 'FWD' };
const CARD = { background: '#0f1628', border: '1px solid #1c2640', borderRadius: '12px' } as const;

export function Finances() {
  const { managedTeamId, currentMatchday, balance, shirtSponsor, borderSponsors, rosters, transfersUsed, acceptShirtSponsor, acceptBorderDeal, hirePlayer, sellPlayer } = useGameStore();
  const [tab, setTab] = useState<Tab>('shirt');

  const shirtOffers = useMemo(() => generateShirtOffers(currentMatchday, managedTeamId), [currentMatchday, managedTeamId]);
  const borderOffers = useMemo(() => generateBorderOffers(currentMatchday, managedTeamId), [currentMatchday, managedTeamId]);
  const hirePlayers = useMemo(() => generateHirePlayers(currentMatchday, managedTeamId), [currentMatchday, managedTeamId]);

  const myPlayers = rosters[managedTeamId] ?? [];
  const transfersLeft = 3 - transfersUsed;
  const canAcceptBorder = borderSponsors.length < 3;

  return (
    <Layout>
      {/* Full height flex column */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#070b16', fontFamily: "'Barlow', system-ui, sans-serif", fontSize: '13px', color: '#e8edf7' }}>

        {/* Tabs — fixed height */}
        <div style={{ flexShrink: 0, display: 'flex', padding: '10px 12px 0', gap: '4px', borderBottom: '1px solid #1c2640' }}>
          {(['shirt', 'borders', 'transfer'] as Tab[]).map(t => {
            const labels: Record<Tab, string> = {
              shirt: 'Shirt',
              borders: `Borders${borderSponsors.length > 0 ? ` (${borderSponsors.length})` : ''}`,
              transfer: 'Transfer',
            };
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '7px 20px', fontSize: '13px',
                fontWeight: active ? 700 : 600,
                background: 'transparent',
                cursor: 'pointer',
                border: 'none',
                borderBottom: `3px solid ${active ? '#c8f53d' : 'transparent'}`,
                marginBottom: '-1px',
                color: active ? '#ffffff' : '#8d99b5',
                whiteSpace: 'nowrap',
              }}>
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* Content — fills remaining height */}
        <div style={{ flex: 1, minHeight: 0, padding: '12px', display: 'flex', flexDirection: 'column' }}>
          {tab === 'shirt' && (
            <ShirtTab
              shirtSponsor={shirtSponsor}
              shirtOffers={shirtOffers}
              onAccept={(offer) => acceptShirtSponsor(offer)}
              balance={balance}
            />
          )}
          {tab === 'borders' && (
            <BordersTab
              borderSponsors={borderSponsors}
              borderOffers={borderOffers}
              canAccept={canAcceptBorder}
              onAccept={(offer) => acceptBorderDeal(offer)}
            />
          )}
          {tab === 'transfer' && (
            <TransferTab
              hirePlayers={hirePlayers}
              myPlayers={myPlayers}
              balance={balance}
              transfersLeft={transfersLeft}
              onHire={p => hirePlayer(p)}
              onSell={id => sellPlayer(id)}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}

function YeahButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? '#1a2a1a' : '#15803d',
      border: '1px solid', borderColor: disabled ? '#2a3a2a' : '#16a34a',
      borderRadius: '6px', color: disabled ? '#4a6a4a' : '#ffffff',
      padding: '6px 12px', cursor: disabled ? 'default' : 'pointer',
      fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px',
    }}>
      <span>✓</span> Yeahh!!!
    </button>
  );
}

function ForgetButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: '#1a0a0a', border: '1px solid #4a1a1a', borderRadius: '6px',
      color: '#f87171', padding: '6px 12px', cursor: 'pointer',
      fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px',
    }}>
      <span>✗</span> Forget It!
    </button>
  );
}

function ShirtTab({ shirtSponsor, shirtOffers, onAccept }: {
  shirtSponsor: SponsorDeal | null; shirtOffers: SponsorDeal[]; onAccept: (offer: SponsorDeal) => void; balance: number;
}) {
  const [offerIndex, setOfferIndex] = useState(0);
  const alreadyHave = !!shirtSponsor;
  const currentOffer = !alreadyHave ? shirtOffers[offerIndex] : null;

  return (
    <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>
      {/* Left panel */}
      <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {currentOffer && (
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <YeahButton onClick={() => { onAccept(currentOffer); setOfferIndex(shirtOffers.length); }} />
            <ForgetButton onClick={() => setOfferIndex(i => i + 1)} />
          </div>
        )}
        <div style={{ ...CARD, padding: '12px', fontSize: '12px', textAlign: 'center', flex: 1 }}>
          {shirtSponsor ? (
            <>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '6px' }}>MAIN SPONSOR</div>
              <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '15px', marginBottom: '6px' }}>{shirtSponsor.name}</div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>pays</div>
              <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '20px', margin: '4px 0' }}>£{shirtSponsor.amount.toLocaleString()}</div>
              <div style={{ color: '#64748b', fontSize: '10px' }}>until end of season</div>
            </>
          ) : currentOffer ? (
            <>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}>OFFER {offerIndex + 1} / {shirtOffers.length}</div>
              <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '15px', marginBottom: '6px' }}>{currentOffer.name}</div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>offers</div>
              <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '20px', margin: '4px 0' }}>£{currentOffer.amount.toLocaleString()}</div>
              <div style={{ color: '#64748b', fontSize: '10px' }}>for the season</div>
            </>
          ) : (
            <div style={{ color: '#64748b' }}>No more shirt<br />offers this matchday</div>
          )}
        </div>
      </div>

      {/* Player image fills remaining height */}
      <div style={{ flex: 1, ...CARD, overflow: 'hidden', position: 'relative' }}>
        <img
          src={img('superm0.png')}
          style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
          alt=""
        />
        {shirtSponsor && (
          <div style={{
            position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,128,0.85)', color: '#fff', padding: '5px 12px',
            fontSize: '13px', fontWeight: 'bold', border: '1px solid #3b82f6', borderRadius: '4px',
          }}>
            {shirtSponsor.name}
          </div>
        )}
      </div>
    </div>
  );
}

function BordersTab({ borderSponsors, borderOffers, canAccept, onAccept }: {
  borderSponsors: SponsorDeal[]; borderOffers: SponsorDeal[]; canAccept: boolean; onAccept: (offer: SponsorDeal) => void;
}) {
  const [offerIndex, setOfferIndex] = useState(0);
  const currentOffer = offerIndex < borderOffers.length ? borderOffers[offerIndex] : null;

  const handleAccept = () => {
    if (!currentOffer) return;
    onAccept(currentOffer);
    setOfferIndex(i => i + 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {/* Banner */}
      <div style={{ flexShrink: 0, ...CARD, overflow: 'hidden', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0010' }}>
        {borderSponsors.length > 0 ? (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {borderSponsors.map((d, i) => (
              <div key={i} style={{ color: '#cc0000', fontSize: Math.max(18, 32 - borderSponsors.length * 4) + 'px', fontWeight: '900', letterSpacing: '3px', textShadow: '3px 3px 6px rgba(0,0,0,0.8)', fontFamily: 'Impact, Arial Black' }}>
                {d.name}
              </div>
            ))}
          </div>
        ) : currentOffer ? (
          <div style={{ color: '#ff4400', fontSize: '32px', fontWeight: '900', letterSpacing: '4px', textShadow: '3px 3px 6px rgba(0,0,0,0.8)', fontFamily: 'Impact, Arial Black', opacity: 0.5 }}>
            {currentOffer.name}
          </div>
        ) : (
          <div style={{ color: '#444', fontSize: '14px', letterSpacing: '3px' }}>NO SPONSORS</div>
        )}
      </div>

      {/* Active deals */}
      {borderSponsors.length > 0 && (
        <div style={{ flexShrink: 0 }}>
          <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '6px' }}>ACTIVE DEALS ({borderSponsors.length}/3)</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {borderSponsors.map((d, i) => (
              <div key={i} style={{ ...CARD, padding: '10px 14px', minWidth: '140px', textAlign: 'center' }}>
                <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '13px', marginBottom: '3px' }}>{d.name}</div>
                <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '16px' }}>£{d.amount.toLocaleString()}<span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'normal' }}>/match</span></div>
                <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '3px' }}>{d.matchdaysLeft} matchday{d.matchdaysLeft !== 1 ? 's' : ''} left</div>
                <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '5px' }}>
                  {Array.from({ length: d.matchdays }).map((_, j) => (
                    <div key={j} style={{ width: '6px', height: '3px', borderRadius: '2px', background: j < d.matchdaysLeft ? '#3b82f6' : '#1c2640' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New offer */}
      <div style={{ flexShrink: 0 }}>
        {currentOffer ? (
          <>
            <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '6px' }}>
              OFFER {offerIndex + 1} / {borderOffers.length}{!canAccept ? ' — MAX DEALS REACHED (3/3)' : ''}
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
              <div style={{ ...CARD, padding: '14px', minWidth: '180px', textAlign: 'center', flexShrink: 0 }}>
                <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '6px' }}>BORDER DEAL</div>
                <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>{currentOffer.name}</div>
                <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '3px' }}>for <strong style={{ color: '#ffffff' }}>{currentOffer.matchdays} matchdays</strong></div>
                <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '20px', margin: '4px 0' }}>£{currentOffer.amount.toLocaleString()}</div>
                <div style={{ color: '#64748b', fontSize: '10px', marginBottom: '10px' }}>per matchday</div>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  <YeahButton onClick={handleAccept} disabled={!canAccept} />
                  <ForgetButton onClick={() => setOfferIndex(i => i + 1)} />
                </div>
              </div>
              <div style={{ ...CARD, flex: 1, overflow: 'hidden', minHeight: '120px' }}>
                <img src={img('zuschau1.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
              </div>
            </div>
          </>
        ) : (
          <div style={{ ...CARD, padding: '12px', color: '#64748b', fontSize: '12px' }}>
            {canAccept ? 'No more border offers this matchday.' : 'You already have 3 active border deals. Wait for one to expire.'}
          </div>
        )}
      </div>
    </div>
  );
}

function TransferTab({ hirePlayers, myPlayers, balance, transfersLeft, onHire, onSell }: {
  hirePlayers: Player[]; myPlayers: Player[]; balance: number;
  transfersLeft: number; onHire: (p: Player) => void; onSell: (id: string) => void;
}) {
  const [mode, setMode] = useState<'hire' | 'sell'>('hire');
  const [selectedHire, setSelectedHire] = useState<Player | null>(null);
  const [selectedSell, setSelectedSell] = useState<string | null>(null);

  const hireCost = (p: Player) => p.skill * 75_000;
  const sellPrice = (p: Player) => p.skill * 75_000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '8px' }}>

      {/* Header */}
      <div style={{ flexShrink: 0, ...CARD, textAlign: 'center', padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <span style={{ color: '#94a3b8' }}>PLAYER TRANSFER</span>
        <span style={{ color: transfersLeft > 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
          {transfersLeft}/3 remaining
        </span>
      </div>

      {/* Image panels — fixed height */}
      <div style={{ flexShrink: 0, display: 'flex', gap: '8px', height: '110px' }}>
        <div
          style={{ flex: 1, borderRadius: '8px', background: '#1a1a40', position: 'relative', overflow: 'hidden', cursor: 'pointer', border: `2px solid ${mode === 'hire' ? '#3b82f6' : '#1c2640'}` }}
          onClick={() => setMode('hire')}>
          <img src={img('pommes1.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
          <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', color: mode === 'hire' ? '#60a5fa' : '#ffffff', fontWeight: 'bold', fontSize: '15px', textShadow: '2px 2px 4px #000', textAlign: 'center' }}>
            Player Hire
          </div>
        </div>
        <div style={{ width: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #1c2640' }}>
          <img src={img('felda1.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
        </div>
        <div
          style={{ flex: 1, borderRadius: '8px', background: '#401a1a', position: 'relative', overflow: 'hidden', cursor: 'pointer', border: `2px solid ${mode === 'sell' ? '#ef4444' : '#1c2640'}` }}
          onClick={() => setMode('sell')}>
          <img src={img('verkauf.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
          <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', color: mode === 'sell' ? '#f87171' : '#ffffff', fontWeight: 'bold', fontSize: '15px', textShadow: '2px 2px 4px #000', textAlign: 'center' }}>
            Player Sell
          </div>
        </div>
      </div>

      {/* Player list — fills remaining space */}
      {mode === 'hire' && (
        <div style={{ flex: 1, minHeight: 0, ...CARD, padding: '8px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', flexShrink: 0 }}>Available — max 3 transfers per matchday</div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {hirePlayers.map(p => {
              const cost = hireCost(p);
              const canAfford = balance >= cost;
              const selected = selectedHire?.id === p.id;
              return (
                <div key={p.id} onClick={() => setSelectedHire(selected ? null : p)} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: selected ? '#1e3a5f' : '#070b16',
                  padding: '5px 8px', cursor: 'pointer',
                  border: `1px solid ${selected ? '#3b82f6' : '#1c2640'}`, borderRadius: '5px',
                  opacity: !canAfford || transfersLeft <= 0 ? 0.5 : 1,
                }}>
                  <span style={{ fontWeight: 'bold', fontSize: '10px', width: '26px', color: '#60a5fa' }}>{POS_LABEL[p.position]}</span>
                  <span style={{ flex: 1, fontSize: '11px', color: '#e2e8f0' }}>{p.name}</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Age {p.age}</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#e2e8f0' }}>Sk {p.skill}</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: canAfford ? '#4ade80' : '#f87171' }}>£{(cost / 1000).toFixed(0)}K</span>
                </div>
              );
            })}
          </div>
          {selectedHire && (
            <div style={{ flexShrink: 0, display: 'flex', gap: '8px', marginTop: '8px' }}>
              <YeahButton onClick={() => { onHire(selectedHire); setSelectedHire(null); }} disabled={balance < hireCost(selectedHire) || transfersLeft <= 0} />
              <ForgetButton onClick={() => setSelectedHire(null)} />
            </div>
          )}
        </div>
      )}

      {mode === 'sell' && (
        <div style={{ flex: 1, minHeight: 0, ...CARD, padding: '8px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', flexShrink: 0 }}>Your squad — select a player to sell</div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {myPlayers.map(p => {
              const price = sellPrice(p);
              const selected = selectedSell === p.id;
              return (
                <div key={p.id} onClick={() => setSelectedSell(selected ? null : p.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: selected ? '#1e3a5f' : '#070b16',
                  padding: '5px 8px', cursor: 'pointer',
                  border: `1px solid ${selected ? '#3b82f6' : '#1c2640'}`, borderRadius: '5px',
                }}>
                  <span style={{ fontWeight: 'bold', fontSize: '10px', width: '26px', color: '#60a5fa' }}>{POS_LABEL[p.position]}</span>
                  <span style={{ flex: 1, fontSize: '11px', color: '#e2e8f0' }}>{p.name}</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Sk {p.skill}</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#4ade80' }}>£{(price / 1000).toFixed(0)}K</span>
                </div>
              );
            })}
          </div>
          {selectedSell && (
            <div style={{ flexShrink: 0, display: 'flex', gap: '8px', marginTop: '8px' }}>
              <YeahButton onClick={() => { onSell(selectedSell); setSelectedSell(null); }} disabled={transfersLeft <= 0} />
              <ForgetButton onClick={() => setSelectedSell(null)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
