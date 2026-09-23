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

function generateShirtOffer(matchday: number, teamId: number): SponsorDeal {
  const rng = lcg(matchday * 1337 + teamId * 7);
  return {
    name: SHIRT_COMPANIES[Math.floor(rng() * SHIRT_COMPANIES.length)],
    amount: Math.round((rng() * 900_000 + 200_000) / 50_000) * 50_000,
    matchdays: 38,
    matchdaysLeft: 38,
  };
}

function generateBorderOffer(matchday: number, teamId: number): SponsorDeal {
  const rng = lcg(matchday * 2673 + teamId * 13);
  const md = Math.floor(rng() * 5) + 4; // 4-8 matchdays max
  return {
    name: BORDER_COMPANIES[Math.floor(rng() * BORDER_COMPANIES.length)],
    amount: Math.round((rng() * 55_000 + 15_000) / 5_000) * 5_000,
    matchdays: md,
    matchdaysLeft: md,
  };
}

const HIRE_NAMES = {
  T: ['Brickwall','Ironpalms','Safehands','Flapper','Reflexo'],
  V: ['Blockade','Granite','Stopper','Slab','Ironwood'],
  M: ['Dribbles','Playmaker','Trickster','Zippy','Grafter'],
  S: ['Finisher','Marksman','Poacher','Topgun','Netbuster'],
};

function generateHirePlayers(matchday: number, teamId: number): Player[] {
  const rng = lcg(matchday * 9181 + teamId * 29);
  const positions: Position[] = ['T', 'V', 'V', 'M', 'M', 'S'];
  return positions.map((pos, i) => {
    const names = HIRE_NAMES[pos];
    const name = names[Math.floor(rng() * names.length)] + ' ' + String.fromCharCode(65 + Math.floor(rng() * 26)) + '.';
    const skill = Math.floor(rng() * 4) + 4;
    const age = Math.floor(rng() * 12) + 20;
    return {
      id: `hire-${matchday}-${i}`,
      name,
      position: pos,
      skill,
      age,
      injuredFor: 0,
      suspended: false,
      trainingProgress: 0,
    };
  });
}

const POS_LABEL: Record<string, string> = { T: 'GK', V: 'DEF', M: 'MID', S: 'FWD' };

const CARD = { background: '#161b27', border: '1px solid #28314a', borderRadius: '8px' } as const;

export function Finances() {
  const { managedTeamId, currentMatchday, balance, shirtSponsor, borderSponsors, rosters, transfersUsed, acceptShirtSponsor, acceptBorderDeal, hirePlayer, sellPlayer } = useGameStore();
  const [tab, setTab] = useState<Tab>('shirt');

  const shirtOffer = useMemo(() => generateShirtOffer(currentMatchday, managedTeamId), [currentMatchday, managedTeamId]);
  const borderOffer = useMemo(() => generateBorderOffer(currentMatchday, managedTeamId), [currentMatchday, managedTeamId]);
  const hirePlayers = useMemo(() => generateHirePlayers(currentMatchday, managedTeamId), [currentMatchday, managedTeamId]);

  const myPlayers = rosters[managedTeamId] ?? [];
  const transfersLeft = 3 - transfersUsed;
  const canAcceptBorder = borderSponsors.length < 3;

  return (
    <Layout>
      <div style={{ background: '#0d1117', minHeight: 'calc(100vh - 28px)', fontFamily: 'Arial, system-ui', fontSize: '13px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '10px 10px 0', gap: '4px', borderBottom: '1px solid #1e2535' }}>
          {(['shirt', 'borders', 'transfer'] as Tab[]).map(t => {
            const labels = { shirt: 'Shirt', borders: `Borders${borderSponsors.length > 0 ? ` (${borderSponsors.length})` : ''}`, transfer: 'Transfer' };
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 20px', fontSize: '12px',
                fontWeight: active ? 'bold' : 'normal',
                background: active ? '#161b27' : 'transparent',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: active ? '#28314a' : 'transparent',
                borderBottom: active ? '1px solid #161b27' : '1px solid transparent',
                borderRadius: '6px 6px 0 0',
                marginBottom: active ? '-1px' : '0',
                position: 'relative', zIndex: active ? 1 : 0,
                color: active ? '#ffffff' : '#64748b',
              }}>
                {labels[t]}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '10px' }}>
          {tab === 'shirt' && (
            <ShirtTab
              shirtSponsor={shirtSponsor}
              shirtOffer={shirtOffer}
              onAccept={() => acceptShirtSponsor(shirtOffer)}
              balance={balance}
            />
          )}
          {tab === 'borders' && (
            <BordersTab
              borderSponsors={borderSponsors}
              borderOffer={borderOffer}
              canAccept={canAcceptBorder}
              onAccept={() => acceptBorderDeal({ ...borderOffer, matchdaysLeft: borderOffer.matchdays })}
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
      border: '1px solid',
      borderColor: disabled ? '#2a3a2a' : '#16a34a',
      borderRadius: '6px',
      color: disabled ? '#4a6a4a' : '#ffffff',
      padding: '8px 16px', cursor: disabled ? 'default' : 'pointer',
      fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <span style={{ fontSize: '16px' }}>✓</span> Yeahh!!!
    </button>
  );
}

function ForgetButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: '#1a0a0a',
      border: '1px solid #4a1a1a',
      borderRadius: '6px',
      color: '#f87171',
      padding: '8px 16px', cursor: 'pointer',
      fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <span style={{ fontSize: '16px' }}>✗</span> Forget It!
    </button>
  );
}

function ShirtTab({ shirtSponsor, shirtOffer, onAccept, balance: _balance }: {
  shirtSponsor: SponsorDeal | null;
  shirtOffer: SponsorDeal;
  onAccept: () => void;
  balance: number;
}) {
  const [declined, setDeclined] = useState(false);
  const alreadyHave = !!shirtSponsor;

  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      {/* Left panel */}
      <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {!alreadyHave && !declined && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <YeahButton onClick={onAccept} />
            <ForgetButton onClick={() => setDeclined(true)} />
          </div>
        )}
        <div style={{ ...CARD, padding: '14px', fontSize: '13px', textAlign: 'center' }}>
          {shirtSponsor ? (
            <>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px' }}>MAIN SPONSOR</div>
              <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>{shirtSponsor.name}</div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>pays</div>
              <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '22px', margin: '4px 0' }}>£{shirtSponsor.amount.toLocaleString()}</div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>until end of season</div>
            </>
          ) : declined ? (
            <div style={{ color: '#64748b' }}>No shirt sponsor<br />this season</div>
          ) : (
            <>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px' }}>NEW OFFER</div>
              <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>{shirtOffer.name}</div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>offers</div>
              <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '22px', margin: '4px 0' }}>£{shirtOffer.amount.toLocaleString()}</div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>for the season</div>
            </>
          )}
        </div>
      </div>

      {/* Right: player wearing shirt */}
      <div style={{ flex: 1, ...CARD, overflow: 'hidden', minHeight: '300px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          src={img('superm0.png')}
          style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
          alt=""
        />
        {shirtSponsor && (
          <div style={{
            position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,128,0.85)', color: '#fff', padding: '6px 14px',
            fontSize: '13px', fontWeight: 'bold', textAlign: 'center',
            border: '1px solid #3b82f6', borderRadius: '4px',
          }}>
            {shirtSponsor.name}
          </div>
        )}
      </div>
    </div>
  );
}

function BordersTab({ borderSponsors, borderOffer, canAccept, onAccept }: {
  borderSponsors: SponsorDeal[];
  borderOffer: SponsorDeal;
  canAccept: boolean;
  onAccept: () => void;
}) {
  const [declined, setDeclined] = useState(false);

  return (
    <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
      {/* Banner */}
      <div style={{ ...CARD, overflow: 'hidden', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0010' }}>
        {borderSponsors.length > 0 ? (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {borderSponsors.map((d, i) => (
              <div key={i} style={{ color: '#cc0000', fontSize: Math.max(20, 36 - borderSponsors.length * 4) + 'px', fontWeight: '900', letterSpacing: '3px', textShadow: '3px 3px 6px rgba(0,0,0,0.8)', fontFamily: 'Impact, Arial Black' }}>
                {d.name}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#ff4400', fontSize: '36px', fontWeight: '900', letterSpacing: '4px', textShadow: '3px 3px 6px rgba(0,0,0,0.8)', fontFamily: 'Impact, Arial Black', opacity: 0.5 }}>
            {borderOffer.name}
          </div>
        )}
      </div>

      {/* Active deals */}
      {borderSponsors.length > 0 && (
        <div>
          <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px' }}>ACTIVE DEALS ({borderSponsors.length}/3)</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {borderSponsors.map((d, i) => (
              <div key={i} style={{ ...CARD, padding: '12px 16px', minWidth: '160px', textAlign: 'center' }}>
                <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{d.name}</div>
                <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '18px' }}>£{d.amount.toLocaleString()}<span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>/match</span></div>
                <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>{d.matchdaysLeft} matchday{d.matchdaysLeft !== 1 ? 's' : ''} left</div>
                <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '6px' }}>
                  {Array.from({ length: d.matchdays }).map((_, j) => (
                    <div key={j} style={{ width: '8px', height: '4px', borderRadius: '2px', background: j < d.matchdaysLeft ? '#3b82f6' : '#1e2535' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New offer */}
      <div>
        <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px' }}>
          {canAccept ? 'NEW OFFER' : 'MAX DEALS REACHED (3/3)'}
        </div>
        {!declined && canAccept ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ ...CARD, padding: '16px', minWidth: '200px', textAlign: 'center' }}>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px' }}>BORDER DEAL</div>
              <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '15px', marginBottom: '8px' }}>{borderOffer.name}</div>
              <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>for <strong style={{ color: '#ffffff' }}>{borderOffer.matchdays} matchdays</strong></div>
              <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '22px', margin: '6px 0' }}>£{borderOffer.amount.toLocaleString()}</div>
              <div style={{ color: '#64748b', fontSize: '10px', marginBottom: '14px' }}>per matchday</div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <YeahButton onClick={onAccept} />
                <ForgetButton onClick={() => setDeclined(true)} />
              </div>
            </div>
            <div style={{ ...CARD, flex: 1, minHeight: '140px', overflow: 'hidden' }}>
              <img src={img('zuschau1.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
            </div>
          </div>
        ) : declined ? (
          <div style={{ ...CARD, padding: '16px', color: '#64748b', fontSize: '12px' }}>No new border deal accepted this matchday.</div>
        ) : (
          <div style={{ ...CARD, padding: '16px', color: '#64748b', fontSize: '12px' }}>
            You already have 3 active border deals. Wait for one to expire before adding more.
          </div>
        )}
      </div>
    </div>
  );
}

function TransferTab({ hirePlayers, myPlayers, balance, transfersLeft, onHire, onSell }: {
  hirePlayers: Player[];
  myPlayers: Player[];
  balance: number;
  transfersLeft: number;
  onHire: (p: Player) => void;
  onSell: (id: string) => void;
}) {
  const [mode, setMode] = useState<'hire' | 'sell'>('hire');
  const [selectedHire, setSelectedHire] = useState<Player | null>(null);
  const [selectedSell, setSelectedSell] = useState<string | null>(null);

  const hireCost = (p: Player) => p.skill * 75_000;
  const sellPrice = (p: Player) => p.skill * 75_000;

  return (
    <div>
      <div style={{ ...CARD, textAlign: 'center', padding: '8px', fontSize: '12px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <span style={{ color: '#94a3b8' }}>PLAYER TRANSFER</span>
        <span style={{ color: transfersLeft > 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
          {transfersLeft}/3 transfers remaining
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        {/* Player Hire panel */}
        <div
          style={{ flex: 1, borderRadius: '8px', background: '#1a1a40', position: 'relative', overflow: 'hidden', minHeight: '180px', cursor: 'pointer', border: `2px solid ${mode === 'hire' ? '#3b82f6' : '#1e2535'}` }}
          onClick={() => setMode('hire')}>
          <img src={img('pommes1.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
          <div style={{
            position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
            color: mode === 'hire' ? '#60a5fa' : '#ffffff', fontWeight: 'bold', fontSize: '18px',
            textShadow: '2px 2px 4px #000', textAlign: 'center',
          }}>
            Player<br />Hire
          </div>
        </div>

        {/* Centre pitch thumbnail */}
        <div style={{ width: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #1e2535' }}>
          <img src={img('felda1.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
        </div>

        {/* Player Sell panel */}
        <div
          style={{ flex: 1, borderRadius: '8px', background: '#401a1a', position: 'relative', overflow: 'hidden', minHeight: '180px', cursor: 'pointer', border: `2px solid ${mode === 'sell' ? '#ef4444' : '#1e2535'}` }}
          onClick={() => setMode('sell')}>
          <img src={img('verkauf.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
          <div style={{
            position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
            color: mode === 'sell' ? '#f87171' : '#ffffff', fontWeight: 'bold', fontSize: '18px',
            textShadow: '2px 2px 4px #000', textAlign: 'center',
          }}>
            Player<br />Sell
          </div>
        </div>
      </div>

      {/* Player lists */}
      {mode === 'hire' && (
        <div style={{ ...CARD, padding: '10px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>Available players — max 3 transfers per matchday</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {hirePlayers.map(p => {
              const cost = hireCost(p);
              const canAfford = balance >= cost;
              const selected = selectedHire?.id === p.id;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: selected ? '#1e3a5f' : '#0d1117',
                  padding: '6px 10px', cursor: 'pointer',
                  border: `1px solid ${selected ? '#3b82f6' : '#1e2535'}`,
                  borderRadius: '6px',
                  opacity: !canAfford || transfersLeft <= 0 ? 0.5 : 1,
                }} onClick={() => setSelectedHire(selected ? null : p)}>
                  <span style={{ fontWeight: 'bold', fontSize: '10px', width: '28px', color: '#60a5fa' }}>{POS_LABEL[p.position]}</span>
                  <span style={{ flex: 1, fontSize: '12px', color: '#e2e8f0' }}>{p.name}</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Age {p.age}</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#e2e8f0' }}>Skill {p.skill}</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: canAfford ? '#4ade80' : '#f87171' }}>£{(cost / 1000).toFixed(0)}K</span>
                </div>
              );
            })}
          </div>
          {selectedHire && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <YeahButton onClick={() => { onHire(selectedHire); setSelectedHire(null); }} disabled={balance < hireCost(selectedHire) || transfersLeft <= 0} />
              <ForgetButton onClick={() => setSelectedHire(null)} />
            </div>
          )}
        </div>
      )}

      {mode === 'sell' && (
        <div style={{ ...CARD, padding: '10px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>Your squad — select a player to sell</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
            {myPlayers.map(p => {
              const price = sellPrice(p);
              const selected = selectedSell === p.id;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: selected ? '#1e3a5f' : '#0d1117',
                  padding: '6px 10px', cursor: 'pointer',
                  border: `1px solid ${selected ? '#3b82f6' : '#1e2535'}`,
                  borderRadius: '6px',
                }} onClick={() => setSelectedSell(selected ? null : p.id)}>
                  <span style={{ fontWeight: 'bold', fontSize: '10px', width: '28px', color: '#60a5fa' }}>{POS_LABEL[p.position]}</span>
                  <span style={{ flex: 1, fontSize: '12px', color: '#e2e8f0' }}>{p.name}</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>Skill {p.skill}</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#4ade80' }}>£{(price / 1000).toFixed(0)}K</span>
                </div>
              );
            })}
          </div>
          {selectedSell && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <YeahButton onClick={() => { onSell(selectedSell); setSelectedSell(null); }} disabled={transfersLeft <= 0} />
              <ForgetButton onClick={() => setSelectedSell(null)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
