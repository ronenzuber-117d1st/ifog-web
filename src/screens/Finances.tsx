import { useState, useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';
import type { Player, Position } from '../types/game';
import type { SponsorDeal } from '../store/useGameStore';

type Tab = 'shirt' | 'borders' | 'transfer';

const RAISED = { border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff' } as const;
const SUNKEN = { border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080' } as const;

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
  const md = Math.floor(rng() * 10) + 5;
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
    const skill = Math.floor(rng() * 4) + 4; // 4-7
    const age = Math.floor(rng() * 12) + 20; // 20-31
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

export function Finances() {
  const { managedTeamId, currentMatchday, balance, shirtSponsor, borderSponsor, rosters, transfersUsed, acceptShirtSponsor, acceptBorderDeal, hirePlayer, sellPlayer } = useGameStore();
  const [tab, setTab] = useState<Tab>('shirt');

  const shirtOffer = useMemo(() => generateShirtOffer(currentMatchday, managedTeamId), [currentMatchday, managedTeamId]);
  const borderOffer = useMemo(() => generateBorderOffer(currentMatchday, managedTeamId), [currentMatchday, managedTeamId]);
  const hirePlayers = useMemo(() => generateHirePlayers(currentMatchday, managedTeamId), [currentMatchday, managedTeamId]);

  const myPlayers = rosters[managedTeamId] ?? [];
  const transfersLeft = 3 - transfersUsed;

  return (
    <Layout>
      <div style={{ background: '#c0c0c0', minHeight: 'calc(100vh - 28px)', fontFamily: 'Arial, system-ui', fontSize: '13px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', paddingTop: '4px', paddingLeft: '4px', borderBottom: '2px solid #808080', background: '#c0c0c0' }}>
          {(['shirt', 'borders', 'transfer'] as Tab[]).map(t => {
            const labels = { shirt: 'Shirt', borders: 'Borders', transfer: 'Transfer' };
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '3px 20px', fontSize: '12px',
                fontWeight: active ? 'bold' : 'normal',
                background: '#c0c0c0', cursor: 'pointer',
                border: '2px solid',
                borderColor: '#ffffff #808080 ' + (active ? '#c0c0c0' : '#808080') + ' #ffffff',
                borderBottom: active ? '2px solid #c0c0c0' : undefined,
                marginRight: '3px', marginBottom: active ? '-2px' : '0',
                position: 'relative', zIndex: active ? 1 : 0, color: '#000',
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
              borderSponsor={borderSponsor}
              borderOffer={borderOffer}
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
      ...RAISED, background: '#c0c0c0', padding: '8px 16px', cursor: disabled ? 'default' : 'pointer',
      fontSize: '13px', fontWeight: 'bold', color: disabled ? '#888' : '#000', display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <span style={{ color: '#0000cc', fontSize: '16px' }}>✓</span> Yeahh!!!
    </button>
  );
}

function ForgetButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      ...RAISED, background: '#c0c0c0', padding: '8px 16px', cursor: 'pointer',
      fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <span style={{ color: '#cc0000', fontSize: '16px' }}>✗</span> Forget It!
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
    <div style={{ display: 'flex', gap: '10px' }}>
      {/* Left panel */}
      <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {!alreadyHave && !declined && (
          <>
            <YeahButton onClick={onAccept} />
            <ForgetButton onClick={() => setDeclined(true)} />
          </>
        )}
        <div style={{ ...RAISED, background: '#c0c0c0', padding: '12px', marginTop: '6px', fontSize: '12px', textAlign: 'center' }}>
          {shirtSponsor ? (
            <>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>MAIN SPONSOR</div>
              <div style={{ color: '#0000aa', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>{shirtSponsor.name}</div>
              <div>offers</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>£{shirtSponsor.amount.toLocaleString()}</div>
              <div style={{ color: '#444', fontSize: '11px', marginTop: '4px' }}>until end of season</div>
            </>
          ) : declined ? (
            <div style={{ color: '#888' }}>No shirt sponsor<br />this season</div>
          ) : (
            <>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>NEW OFFER</div>
              <div style={{ color: '#0000aa', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>{shirtOffer.name}</div>
              <div>offers</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>£{shirtOffer.amount.toLocaleString()}</div>
              <div style={{ color: '#444', fontSize: '11px', marginTop: '4px' }}>for the season</div>
            </>
          )}
        </div>
      </div>

      {/* Right: player wearing shirt */}
      <div style={{ flex: 1, ...SUNKEN, background: '#808080', overflow: 'hidden', minHeight: '300px', position: 'relative' }}>
        <img src={img('superm2.png')} style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} alt="" />
        {shirtSponsor && (
          <div style={{
            position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '4px 10px',
            fontSize: '11px', fontWeight: 'bold', textAlign: 'center', border: '1px solid #fff',
          }}>
            {shirtSponsor.name}
          </div>
        )}
      </div>
    </div>
  );
}

function BordersTab({ borderSponsor, borderOffer, onAccept }: {
  borderSponsor: SponsorDeal | null;
  borderOffer: SponsorDeal;
  onAccept: () => void;
}) {
  const [declined, setDeclined] = useState(false);
  const alreadyHave = !!borderSponsor && borderSponsor.matchdaysLeft > 0;

  return (
    <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
      {/* Banner */}
      <div style={{ ...SUNKEN, background: '#000', overflow: 'hidden', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {borderSponsor && borderSponsor.matchdaysLeft > 0 ? (
          <div style={{ color: '#cc0000', fontSize: '40px', fontWeight: '900', letterSpacing: '4px', textShadow: '3px 3px 6px rgba(0,0,0,0.8)', fontFamily: 'Impact, Arial Black' }}>
            {borderSponsor.name}
          </div>
        ) : (
          <div style={{ color: '#ff4400', fontSize: '36px', fontWeight: '900', letterSpacing: '4px', textShadow: '3px 3px 6px rgba(0,0,0,0.8)', fontFamily: 'Impact, Arial Black' }}>
            {borderOffer.name}
          </div>
        )}
      </div>

      {/* Ad strips */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {['SportoBet', 'ChampTracker', 'GoalAlert', 'KickStats'].map(s => (
          <div key={s} style={{ background: '#cc0000', color: '#ffffff', padding: '3px 8px', fontSize: '10px', fontWeight: 'bold' }}>{s}</div>
        ))}
      </div>

      {/* Offer panel */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <div style={{ ...RAISED, background: '#c0c0c0', padding: '16px', minWidth: '180px', textAlign: 'center' }}>
          {alreadyHave ? (
            <>
              <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>ACTIVE DEAL</div>
              <div style={{ color: '#0000aa', fontWeight: 'bold' }}>{borderSponsor!.name}</div>
              <div style={{ fontSize: '12px', margin: '8px 0' }}>{borderSponsor!.matchdaysLeft} matchdays left</div>
              <div style={{ fontWeight: 'bold', fontSize: '18px' }}>£{borderSponsor!.amount.toLocaleString()}<span style={{ fontSize: '11px', fontWeight: 'normal' }}>/match</span></div>
            </>
          ) : declined ? (
            <div style={{ color: '#888', fontSize: '12px' }}>No border deal<br />at the moment</div>
          ) : (
            <>
              <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>BORDER</div>
              <div style={{ fontSize: '12px', marginBottom: '6px' }}>Offer for<br /><strong>{borderOffer.matchdays} Matchdays</strong></div>
              <div style={{ fontWeight: 'bold', fontSize: '20px' }}>£{borderOffer.amount.toLocaleString()}</div>
              <div style={{ fontSize: '10px', color: '#444', marginBottom: '10px' }}>per matchday</div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                <YeahButton onClick={onAccept} />
                <ForgetButton onClick={() => setDeclined(true)} />
              </div>
            </>
          )}
        </div>
        <div style={{ ...SUNKEN, background: '#808080', flex: 1, minHeight: '140px', overflow: 'hidden' }}>
          <img src={img('zuschau1.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
        </div>
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
      <div style={{ background: '#808080', color: '#fff', textAlign: 'center', padding: '4px', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
        PLAYER — TRANSFER &nbsp;|&nbsp; Transfers remaining: {transfersLeft}/3
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        {/* Player Hire panel */}
        <div style={{ flex: 1, ...SUNKEN, background: '#1a1a40', position: 'relative', overflow: 'hidden', minHeight: '180px', cursor: 'pointer' }}
          onClick={() => setMode('hire')}>
          <img src={img('pommes1.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
          <div style={{
            position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
            color: mode === 'hire' ? '#ffff00' : '#ffffff', fontWeight: 'bold', fontSize: '18px',
            textShadow: '2px 2px 4px #000', textAlign: 'center',
          }}>
            Player<br />Hire
          </div>
        </div>

        {/* Centre pitch thumbnail */}
        <div style={{ width: '80px', ...SUNKEN, overflow: 'hidden' }}>
          <img src={img('felda1.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
        </div>

        {/* Player Sell panel */}
        <div style={{ flex: 1, ...SUNKEN, background: '#401a1a', position: 'relative', overflow: 'hidden', minHeight: '180px', cursor: 'pointer' }}
          onClick={() => setMode('sell')}>
          <img src={img('verkauf.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
          <div style={{
            position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
            color: mode === 'sell' ? '#ffff00' : '#ffffff', fontWeight: 'bold', fontSize: '18px',
            textShadow: '2px 2px 4px #000', textAlign: 'center',
          }}>
            Player<br />Sell
          </div>
        </div>
      </div>

      {/* Player lists */}
      {mode === 'hire' && (
        <div style={{ ...RAISED, background: '#c0c0c0', padding: '8px' }}>
          <div style={{ fontSize: '11px', color: '#444', marginBottom: '6px' }}>Available players — click to hire (max 3 transfers per matchday)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {hirePlayers.map(p => {
              const cost = hireCost(p);
              const canAfford = balance >= cost;
              const selected = selectedHire?.id === p.id;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: selected ? '#000080' : '#d4d0c8',
                  color: selected ? '#fff' : '#000',
                  padding: '5px 8px', cursor: 'pointer',
                  border: '1px solid #808080',
                  opacity: !canAfford || transfersLeft <= 0 ? 0.5 : 1,
                }} onClick={() => setSelectedHire(selected ? null : p)}>
                  <span style={{ fontWeight: 'bold', fontSize: '10px', width: '28px', color: selected ? '#88ccff' : '#0000aa' }}>{POS_LABEL[p.position]}</span>
                  <span style={{ flex: 1, fontSize: '12px' }}>{p.name}</span>
                  <span style={{ fontSize: '10px', color: selected ? '#aaa' : '#444' }}>Age {p.age}</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Skill {p.skill}</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: canAfford ? (selected ? '#88ff88' : '#006600') : '#cc0000' }}>£{(cost / 1000).toFixed(0)}K</span>
                </div>
              );
            })}
          </div>
          {selectedHire && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <YeahButton onClick={() => { onHire(selectedHire); setSelectedHire(null); }} disabled={balance < hireCost(selectedHire) || transfersLeft <= 0} />
              <ForgetButton onClick={() => setSelectedHire(null)} />
            </div>
          )}
        </div>
      )}

      {mode === 'sell' && (
        <div style={{ ...RAISED, background: '#c0c0c0', padding: '8px' }}>
          <div style={{ fontSize: '11px', color: '#444', marginBottom: '6px' }}>Your squad — select a player to sell</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
            {myPlayers.map(p => {
              const price = sellPrice(p);
              const selected = selectedSell === p.id;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: selected ? '#000080' : '#d4d0c8',
                  color: selected ? '#fff' : '#000',
                  padding: '5px 8px', cursor: 'pointer',
                  border: '1px solid #808080',
                }} onClick={() => setSelectedSell(selected ? null : p.id)}>
                  <span style={{ fontWeight: 'bold', fontSize: '10px', width: '28px', color: selected ? '#88ccff' : '#0000aa' }}>{POS_LABEL[p.position]}</span>
                  <span style={{ flex: 1, fontSize: '12px' }}>{p.name}</span>
                  <span style={{ fontSize: '10px', color: selected ? '#aaa' : '#444' }}>Skill {p.skill}</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: selected ? '#88ff88' : '#006600' }}>£{(price / 1000).toFixed(0)}K</span>
                </div>
              );
            })}
          </div>
          {selectedSell && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <YeahButton onClick={() => { onSell(selectedSell); setSelectedSell(null); }} disabled={transfersLeft <= 0} />
              <ForgetButton onClick={() => setSelectedSell(null)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
