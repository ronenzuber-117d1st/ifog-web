import { useState, useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';
import type { Player, Position } from '../types/game';
import type { SponsorDeal } from '../store/useGameStore';

type Tab = 'shirt' | 'borders' | 'transfer';

// ─── Shirt sponsors ───────────────────────────────────────────────────────────
const SHIRT_COMPANIES = [
  { name: 'SportoMax',              pitch: 'Big club, big shirt, big money. Sign here.' },
  { name: 'Fizzle Pop',             pitch: 'Fizzy drinks for fizzy football.' },
  { name: 'Dunmore Motors',         pitch: 'We sell cars. You sell goals. Deal?' },
  { name: 'Crunchy Crisps Co.',     pitch: 'Half-time snack partner of champions.' },
  { name: 'Pigeon Post Insurance',  pitch: 'Covering everything except your defence.' },
  { name: 'PowerFit',               pitch: 'The kit of champions, worn by winners.' },
  { name: 'VeloSport',              pitch: 'Speed on the pitch, speed in the deal.' },
  { name: 'TurboKit',               pitch: 'Maximum performance. Maximum exposure.' },
  { name: 'GoalPro',                pitch: 'We back the team, the team delivers goals.' },
  { name: 'KickKing',               pitch: "Kings of the pitch. Let's make it official." },
];

// ─── Board brands ─────────────────────────────────────────────────────────────
interface BoardStyle {
  bg: string; fg: string; ac: string;
  font: string; fw: number; ls: string; tt: string; fi: string;
  pre: string; text: string; post: string;
}

const BOARD_STYLES: Record<string, BoardStyle> = {
  'FootballHub':      { bg: '#1d4ed8', fg: '#ffffff', ac: '#facc15', font: "'Russo One', sans-serif", fw: 400, ls: '0.12em', tt: 'uppercase', fi: 'normal', pre: '●', text: 'FootballHub', post: '' },
  'SportsBet Pro':    { bg: 'repeating-linear-gradient(135deg, #0b0b0b 0 14px, #1d1d1d 14px 28px)', fg: '#facc15', ac: '#ffffff', font: "'Big Shoulders Display', Impact, sans-serif", fw: 900, ls: '0.06em', tt: 'uppercase', fi: 'italic', pre: '', text: 'SportsBet Pro', post: 'BET SMART' },
  'Grub Club':        { bg: '#f97316', fg: '#1c0a00', ac: '#ffffff', font: "'Bangers', cursive", fw: 400, ls: '0.08em', tt: 'uppercase', fi: 'normal', pre: '', text: 'Grub Club', post: 'EAT UP!' },
  'Turbo Tyres':      { bg: 'linear-gradient(90deg, #0b0b0b 0 16px, #dc2626 16px calc(100% - 16px), #0b0b0b calc(100% - 16px))', fg: '#ffffff', ac: '#0b0b0b', font: "'Russo One', sans-serif", fw: 400, ls: '0.04em', tt: 'uppercase', fi: 'italic', pre: '»»', text: 'Turbo Tyres', post: '' },
  'Lucky Duck Bingo': { bg: '#fde047', fg: '#be185d', ac: '#be185d', font: "'Pacifico', cursive", fw: 400, ls: '0', tt: 'none', fi: 'normal', pre: '★', text: 'Lucky Duck Bingo', post: '' },
  'Mega Mop':         { bg: '#0d9488', fg: '#ffffff', ac: '#99f6e4', font: "'Bungee', sans-serif", fw: 400, ls: '0.04em', tt: 'uppercase', fi: 'normal', pre: '', text: 'Mega Mop', post: 'SQUEAKY CLEAN' },
  'Fizzle Pop':       { bg: 'radial-gradient(circle, rgba(255,255,255,0.28) 2px, transparent 3px) 0 0 / 18px 18px, #7c3aed', fg: '#ffffff', ac: '#fde047', font: "'Bangers', cursive", fw: 400, ls: '0.1em', tt: 'uppercase', fi: 'normal', pre: '', text: 'Fizzle Pop!', post: '' },
};

const BOARD_EMPTY: BoardStyle = {
  bg: 'repeating-linear-gradient(135deg, #141a2a 0 10px, #181f31 10px 20px)',
  fg: 'rgba(255,255,255,0.35)', ac: 'transparent',
  font: "'JetBrains Mono', monospace", fi: 'normal', fw: 700, ls: '0.2em', tt: 'uppercase',
  pre: '', text: 'Your ad here', post: '',
};

const BORDER_COMPANIES = Object.keys(BOARD_STYLES);

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function lcg(seed: number) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => { s = ((s * 1664525) + 1013904223) >>> 0; return s / 0xffffffff; };
}

// ─── Offer generators ─────────────────────────────────────────────────────────
interface ShirtOffer extends SponsorDeal { pitch: string; }

function generateShirtOffers(matchday: number, teamId: number): ShirtOffer[] {
  const rng = lcg(matchday * 1337 + teamId * 7);
  const pool = [...SHIRT_COMPANIES];
  const picked: typeof SHIRT_COMPANIES = [];
  for (let i = 0; i < 5 && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.map((co, slot) => {
    const r = lcg(matchday * 1337 + teamId * 7 + (slot + 1) * 883);
    return {
      name: co.name,
      amount: Math.round((r() * 900_000 + 200_000) / 50_000) * 50_000,
      matchdays: 38, matchdaysLeft: 38,
      pitch: co.pitch,
    };
  });
}

interface BorderOffer { name: string; amt: number; len: number; }

function generateBorderOffers(matchday: number, teamId: number): BorderOffer[] {
  const rng = lcg(matchday * 2673 + teamId * 13);
  const pool = [...BORDER_COMPANIES];
  const picked: string[] = [];
  for (let i = 0; i < 5 && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.map((name, slot) => {
    const r = lcg(matchday * 2673 + teamId * 13 + (slot + 1) * 997);
    return { name, amt: Math.round((r() * 55_000 + 15_000) / 5_000) * 5_000, len: Math.floor(r() * 5) + 4 };
  });
}

const HIRE_NAMES: Record<string, string[]> = {
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
    return { id: `hire-${matchday}-${i}`, name, position: pos, skill: Math.floor(rng() * 4) + 4, age: Math.floor(rng() * 12) + 20, injuredFor: 0, suspended: false, trainingProgress: 0 };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const POS_LABEL: Record<string, string> = { T: 'GK', V: 'DEF', M: 'MID', S: 'FWD' };
const POS_COLOR: Record<string, string> = { T: '#f5b94a', V: '#7fb2ff', M: '#5fd49a', S: '#ff7a6b' };
const money = (n: number) => '£' + n.toLocaleString('en-GB');

function YeahhBtn({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ flex: 1, height: 42, borderRadius: 10, border: 0, background: disabled ? '#1a2a1a' : '#c8f53d', color: disabled ? '#4a6a4a' : '#070b16', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: disabled ? 'default' : 'pointer' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
      Yeahh!!!
    </button>
  );
}

function ForgetBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ flex: 1, height: 42, borderRadius: 10, border: '1px solid #e8484d', background: 'rgba(232,72,77,0.08)', color: '#ff8a83', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
      Forget it!
    </button>
  );
}

function Board({ s, sz }: { s: BoardStyle; sz: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: '100%', background: s.bg, color: s.fg, fontFamily: s.font, fontStyle: s.fi, fontWeight: s.fw, letterSpacing: s.ls, fontSize: sz, textTransform: s.tt as 'uppercase' | 'lowercase' | 'none' | 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1 }}>
      {s.pre && <span style={{ color: s.ac }}>{s.pre}</span>}
      <span>{s.text}</span>
      {s.post && <span style={{ color: s.ac, fontSize: '0.6em' }}>{s.post}</span>}
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export function Finances() {
  const { managedTeamId, currentMatchday, balance, shirtSponsor, borderSponsors, rosters, transfersUsed, acceptShirtSponsor, acceptBorderDeal, hirePlayer, sellPlayer } = useGameStore();
  const [tab, setTab] = useState<Tab>('shirt');

  const shirtOffers = useMemo(() => generateShirtOffers(currentMatchday, managedTeamId), [currentMatchday, managedTeamId]);
  const borderOffers = useMemo(() => generateBorderOffers(currentMatchday, managedTeamId), [currentMatchday, managedTeamId]);
  const hirePlayers = useMemo(() => generateHirePlayers(currentMatchday, managedTeamId), [currentMatchday, managedTeamId]);
  const myPlayers = rosters[managedTeamId] ?? [];
  const transfersLeft = 3 - transfersUsed;

  return (
    <Layout>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#070b16', fontFamily: "'Barlow', system-ui, sans-serif", color: '#e8edf7' }}>

        {/* Sub-tabs */}
        <div style={{ flexShrink: 0, height: 52, display: 'flex', alignItems: 'stretch', gap: 4, padding: '0 28px', background: '#0a0f1d', borderBottom: '1px solid #1c2640' }}>
          {(['shirt', 'borders', 'transfer'] as Tab[]).map(t => {
            const active = tab === t;
            const label = t === 'shirt' ? 'Shirt' : t === 'borders' ? 'Borders' : 'Transfer';
            return (
              <button key={t} onClick={() => setTab(t)} style={{ display: 'flex', alignItems: 'center', padding: '0 18px', color: active ? '#ffffff' : '#8d99b5', fontWeight: active ? 700 : 600, fontSize: 15, background: 'transparent', border: 'none', borderBottom: active ? '3px solid #c8f53d' : '3px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {tab === 'shirt' && (
            <ShirtTab shirtSponsor={shirtSponsor} shirtOffers={shirtOffers} onAccept={offer => acceptShirtSponsor(offer)} />
          )}
          {tab === 'borders' && (
            <BordersTab borderSponsors={borderSponsors} borderOffers={borderOffers} onAccept={offer => acceptBorderDeal({ name: offer.name, amount: offer.amt, matchdays: offer.len, matchdaysLeft: offer.len })} />
          )}
          {tab === 'transfer' && (
            <TransferTab hirePlayers={hirePlayers} myPlayers={myPlayers} balance={balance} transfersLeft={transfersLeft} onHire={p => hirePlayer(p)} onSell={id => sellPlayer(id)} />
          )}
        </div>
      </div>
    </Layout>
  );
}

// ─── Shirt tab ────────────────────────────────────────────────────────────────
function ShirtTab({ shirtSponsor, shirtOffers, onAccept }: {
  shirtSponsor: SponsorDeal | null;
  shirtOffers: ShirtOffer[];
  onAccept: (o: ShirtOffer) => void;
}) {
  const [offerIdx, setOfferIdx] = useState(0);
  const signed = !!shirtSponsor;
  const empty = !signed && offerIdx >= shirtOffers.length;
  const cur = shirtOffers[offerIdx] ?? null;
  const activeName = signed ? shirtSponsor!.name : (cur?.name ?? null);
  const chestSz = activeName && activeName.length > 12 ? 28 : 38;

  const statusOf = (k: number): [string, string, string] => {
    if (signed) return ['—', 'transparent', '#3a4768'];
    if (k < offerIdx) return ['DECLINED', '#1f2945', '#8d99b5'];
    if (k === offerIdx) return ['ON THE TABLE', 'rgba(245,199,107,0.16)', '#f5c76b'];
    return ['—', 'transparent', '#3a4768'];
  };

  const stageLabel = signed ? 'OFFICIAL KIT' : empty ? 'NO SPONSOR' : 'PREVIEW';

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '400px minmax(0,1fr) 340px', gap: 20, padding: '18px 28px 22px', boxSizing: 'border-box' }}>

      {/* Left: offer card */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 22, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>
              {signed ? 'Shirt deal' : empty ? 'Offers' : `Offer ${offerIdx + 1} of ${shirtOffers.length}`}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {shirtOffers.map((_, k) => (
                <span key={k} style={{ width: 22, height: 6, borderRadius: 3, background: signed ? '#3a4768' : k < offerIdx ? '#3a4768' : k === offerIdx ? '#f5c76b' : '#1f2945', display: 'block' }} />
              ))}
            </div>
          </div>

          {/* Active offer */}
          {!signed && !empty && cur && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 14, color: '#8d99b5' }}>Main shirt sponsor</div>
                <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 44, lineHeight: 1, textTransform: 'uppercase' }}>{cur.name}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '16px 18px', borderRadius: 12, background: '#131c33' }}>
                <div style={{ fontSize: 13, color: '#8d99b5' }}>Offers for the season</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 34, color: '#5fd49a' }}>{money(cur.amount)}</div>
                <div style={{ fontSize: 13, color: '#8d99b5' }}>≈ {money(Math.round(cur.amount / 38))} per matchday</div>
              </div>
              <div style={{ fontSize: 15, color: '#c2cbe0', fontStyle: 'italic', lineHeight: 1.45 }}>"{cur.pitch}"</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <YeahhBtn onClick={() => { onAccept(cur); }} />
                <ForgetBtn onClick={() => setOfferIdx(i => i + 1)} />
              </div>
            </div>
          )}

          {/* Signed */}
          {signed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 12, background: 'rgba(200,245,61,0.1)', border: '1px solid rgba(200,245,61,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#c8f53d', fontWeight: 700, fontSize: 16 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
                Deal signed
              </div>
              <div style={{ fontSize: 15, color: '#c2cbe0', lineHeight: 1.45 }}>{shirtSponsor!.name} is on the shirt for the rest of the season.</div>
            </div>
          )}

          {/* Empty */}
          {empty && !signed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 12, background: '#131c33' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>No more offers this season</div>
              <div style={{ fontSize: 15, color: '#a9b3cb', lineHeight: 1.45 }}>You turned them all down. The shirt stays blank until next season.</div>
            </div>
          )}
        </div>
      </section>

      {/* Center: player image */}
      <section style={{ position: 'relative', borderRadius: 16, background: 'radial-gradient(ellipse 60% 70% at 50% 40%, #2a3350, #0f1628 75%)', border: '1px solid #1c2640', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: '65%', height: '95%' }}>
          <img
            src={img('superm0.png')}
            alt="Player modelling the club shirt"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated', display: 'block' }}
          />
          {activeName ? (
            <div style={{ position: 'absolute', left: '50%', top: '36%', width: 230, transform: 'translateX(-50%) rotate(-3deg)', textAlign: 'center', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: chestSz, lineHeight: 0.95, textTransform: 'uppercase', color: '#d9264a', letterSpacing: '0.02em', pointerEvents: 'none' }}>
              {activeName}
            </div>
          ) : (
            <div style={{ position: 'absolute', left: '50%', top: '34%', width: 200, height: 72, transform: 'translateX(-50%)', border: '2px dashed rgba(7,11,22,0.35)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(7,11,22,0.5)', pointerEvents: 'none' }}>
              SPONSOR HERE
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', left: 20, top: 18, padding: '6px 12px', borderRadius: 8, background: 'rgba(7,11,22,0.75)', fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', color: '#c2cbe0' }}>
          {stageLabel}
        </div>
      </section>

      {/* Right: current sponsor + offer history */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 20, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Current sponsor</div>
          <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 30, textTransform: 'uppercase', lineHeight: 1.1, color: signed ? '#ffffff' : '#6b7797' }}>
            {signed ? shirtSponsor!.name : 'None yet'}
          </div>
          {signed && <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16, color: '#5fd49a' }}>{money(shirtSponsor!.amount)} this season</div>}
        </div>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: '18px 20px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600, paddingBottom: 8 }}>This season's offers</div>
          {shirtOffers.map((o, k) => {
            const [label, bg, fg] = statusOf(k);
            return (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 46, borderTop: '1px solid #1c2640' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: k <= offerIdx || signed ? '#e8edf7' : '#6b7797' }}>{o.name}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#8d99b5' }}>{money(o.amount)}</span>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 5, background: bg, color: fg, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>{label}</span>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

// ─── Borders tab ──────────────────────────────────────────────────────────────
function BordersTab({ borderSponsors, borderOffers, onAccept }: {
  borderSponsors: SponsorDeal[];
  borderOffers: BorderOffer[];
  onAccept: (o: BorderOffer) => void;
}) {
  const [offerIdx, setOfferIdx] = useState(0);
  const cur = offerIdx < borderOffers.length ? borderOffers[offerIdx] : null;
  const empty = !cur;
  const full = borderSponsors.length >= 4;
  const perMatch = borderSponsors.reduce((t, d) => t + d.amount, 0);

  // 4 board slots in display order
  const slots = [0, 1, 2, 3].map(k => {
    const deal = borderSponsors[k];
    return deal ? (BOARD_STYLES[deal.name] ?? BOARD_EMPTY) : BOARD_EMPTY;
  });

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateRows: 'min(280px, 45%) minmax(0, 1fr)', gap: 16, padding: '18px 28px 22px', boxSizing: 'border-box' }}>

      {/* Stadium preview with boards */}
      <section style={{ position: 'relative', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', overflow: 'hidden' }}>
        {/* Stadium photo — cover fills any width; 72% vertical anchors crowd→pitch boundary at boards */}
        <img src={img('stadium_boards.jpg')} alt="Stadium" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 72%', display: 'block' }} />
        {/* Pitch-side boards strip */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: '44%', height: 42, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 3, background: '#05070b', boxShadow: '0 8px 16px rgba(0,0,0,0.55)' }}>
          {slots.map((s, k) => (
            <Board key={k} s={s} sz={22} />
          ))}
        </div>
        <div style={{ position: 'absolute', left: 18, top: 16, padding: '6px 12px', borderRadius: 8, background: 'rgba(7,11,22,0.78)', fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', color: '#c2cbe0' }}>
          PITCH-SIDE BOARDS · LIVE PREVIEW
        </div>
        <div style={{ position: 'absolute', right: 18, top: 16, padding: '6px 12px', borderRadius: 8, background: 'rgba(7,11,22,0.78)', fontSize: 13, color: '#c2cbe0' }}>
          Earning <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#5fd49a' }}>{money(perMatch)}</span> per match
        </div>
      </section>

      {/* Bottom: offer + boards — flex so height propagates to children */}
      <div style={{ display: 'flex', gap: 16, minHeight: 0, overflow: 'hidden' }}>

        {/* Offer panel — buttons pinned to bottom */}
        <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '14px 18px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>
              {empty ? 'Offers' : `Board offer ${offerIdx + 1} of ${borderOffers.length}`}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {borderOffers.map((_, k) => (
                <span key={k} style={{ width: 22, height: 6, borderRadius: 3, background: k < offerIdx ? '#3a4768' : k === offerIdx ? '#f5c76b' : '#1f2945', display: 'block' }} />
              ))}
            </div>
          </div>

          {!empty && cur && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                <div style={{ fontSize: 13, color: '#8d99b5' }}>{cur.name} wants this board:</div>
                <div style={{ height: 44, borderRadius: 6, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                  <Board s={BOARD_STYLES[cur.name] ?? BOARD_EMPTY} sz={30} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '7px 12px', borderRadius: 10, background: '#131c33' }}>
                  <div style={{ fontSize: 12, color: '#8d99b5' }}>Per match</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color: '#5fd49a' }}>{money(cur.amt)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '7px 12px', borderRadius: 10, background: '#131c33' }}>
                  <div style={{ fontSize: 12, color: '#8d99b5' }}>Runs for</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18 }}>{cur.len} matchdays</div>
                </div>
              </div>
              {full && (
                <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(245,185,74,0.12)', color: '#f5c76b', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  All 4 boards are taken. Let a deal run out, or turn this one down.
                </div>
              )}
              {!full && (
                <div style={{ fontSize: 13, color: '#8d99b5', marginBottom: 8 }}>
                  Worth <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#e8edf7' }}>{money(cur.amt * cur.len)}</span> over the deal
                </div>
              )}
              {/* Buttons pinned to bottom */}
              <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
                <YeahhBtn onClick={() => { if (!full) { onAccept(cur); setOfferIdx(i => i + 1); } }} disabled={full} />
                <ForgetBtn onClick={() => setOfferIdx(i => i + 1)} />
              </div>
            </>
          )}

          {empty && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 12, background: '#131c33' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>No more offers this matchday</div>
            </div>
          )}
        </div>

        {/* Your boards */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 22px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 26, textTransform: 'uppercase', lineHeight: 1 }}>Your Boards</div>
            <div style={{ fontSize: 14, color: '#8d99b5' }}>{borderSponsors.length} of 4 sold</div>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, overflow: 'hidden' }}>
            {[0, 1, 2, 3].map(k => {
              const deal = borderSponsors[k];
              const s = deal ? (BOARD_STYLES[deal.name] ?? BOARD_EMPTY) : BOARD_EMPTY;
              return (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 12, background: deal ? '#131c33' : 'transparent', border: `1px ${deal ? 'solid #2a3656' : 'dashed #3a4768'}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: '#8d99b5' }}>BOARD {k + 1}</div>
                  <div style={{ height: 40, borderRadius: 4, overflow: 'hidden' }}>
                    <Board s={s} sz={17} />
                  </div>
                  {deal ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{deal.name}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, color: '#5fd49a' }}>
                        {money(deal.amount)}<span style={{ fontSize: 12, color: '#8d99b5', fontWeight: 400 }}> /match</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0,1fr))', gap: 3 }}>
                        {Array.from({ length: 8 }, (_, j) => (
                          <span key={j} style={{ height: 6, borderRadius: 2, background: j < deal.matchdaysLeft ? '#7fb2ff' : '#1f2945', display: 'block' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 12, color: '#8d99b5' }}>{deal.matchdaysLeft} matchdays left</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#a9b3cb' }}>Free board</div>
                      <div style={{ fontSize: 13, color: '#6b7797', lineHeight: 1.4 }}>Say "Yeahh!!!" to an offer to fill it.</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Transfer tab ─────────────────────────────────────────────────────────────
function TransferTab({ hirePlayers, myPlayers, balance, transfersLeft, onHire, onSell }: {
  hirePlayers: Player[]; myPlayers: Player[]; balance: number;
  transfersLeft: number; onHire: (p: Player) => void; onSell: (id: string) => void;
}) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [done, setDone] = useState<Record<string, boolean>>({});

  const hireCost = (p: Player) => p.skill * 75_000;
  const sellPrice = (p: Player) => p.skill * 75_000;

  const isBuy = mode === 'buy';
  const rows = isBuy ? hirePlayers : myPlayers;

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '280px minmax(0,1fr)', gap: 20, padding: '18px 28px 22px', boxSizing: 'border-box' }}>

      {/* Mode selector */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
        {[
          { id: 'buy' as const,  label: 'Player Hire', sub: `${hirePlayers.length} on the market`, src: 'kauf.png' },
          { id: 'sell' as const, label: 'Player Sell', sub: `${myPlayers.length} in your squad`,   src: 'verkauf.png' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setDone({}); }}
            style={{ flex: 1, minHeight: 0, padding: 0, borderRadius: 16, overflow: 'hidden', border: `3px solid ${mode === m.id ? '#c8f53d' : '#1c2640'}`, background: '#000', opacity: mode === m.id ? 1 : 0.6, cursor: 'pointer', position: 'relative' }}
          >
            <img src={img(m.src)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 16px', background: 'linear-gradient(180deg, rgba(7,11,22,0), rgba(7,11,22,0.95))', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 30, textTransform: 'uppercase', lineHeight: 1, color: '#ffffff' }}>{m.label}</span>
              <span style={{ fontSize: 13, color: '#c2cbe0' }}>{m.sub}</span>
            </div>
          </button>
        ))}
      </aside>

      {/* Right: stats + table */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14, flexShrink: 0 }}>
          {[
            { label: 'Transfers left this matchday', val: `${transfersLeft}/3`, valC: transfersLeft > 0 ? '#ffffff' : '#ff8a83', extra: (
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2].map(k => <span key={k} style={{ width: 26, height: 8, borderRadius: 3, background: k < transfersLeft ? '#c8f53d' : '#1f2945', display: 'block' }} />)}
              </div>
            )},
            { label: 'Cash', val: money(balance), valC: '#c8f53d' },
            { label: 'Squad size', val: String(myPlayers.length), valC: '#ffffff' },
          ].map(c => (
            <div key={c.label} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 18px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
              <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>{c.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 32, lineHeight: 1, color: c.valC }}>{c.val}</div>
                {c.extra}
              </div>
            </div>
          ))}
        </div>

        {/* Player table */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6, padding: '16px 18px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 6px 6px', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 26, textTransform: 'uppercase', lineHeight: 1 }}>
              {isBuy ? 'Transfer Market' : 'Sell a Player'}
            </div>
            <div style={{ fontSize: 13, color: '#8d99b5' }}>
              {isBuy ? 'Max 3 transfers per matchday' : 'Offers based on skill'}
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr) 60px 150px 60px 120px 110px', gap: 12, alignItems: 'center', height: 26, padding: '0 10px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7797', borderBottom: '1px solid #1c2640', flexShrink: 0 }}>
            <div /><div>Player</div><div>Pos</div><div>Skill</div><div style={{ textAlign: 'right' }}>Age</div><div style={{ textAlign: 'right' }}>{isBuy ? 'Price' : 'Offer'}</div><div />
          </div>

          {/* Rows */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rows.map(p => {
              const pr = isBuy ? hireCost(p) : sellPrice(p);
              const isDone = !!done[p.id];
              const noTransfers = !isDone && transfersLeft <= 0;
              const noMoney = !isDone && isBuy && pr > balance;
              const blocked = noTransfers || noMoney;
              const why = noTransfers ? 'No transfers left' : noMoney ? 'Not enough cash' : '';
              const ini = p.name.slice(0, 1).toUpperCase();
              const posC = POS_COLOR[p.position] ?? '#8d99b5';

              return (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '34px minmax(0,1fr) 60px 150px 60px 120px 110px', gap: 12, alignItems: 'center', height: 42, padding: '0 10px', borderRadius: 8, background: isDone ? 'rgba(200,245,61,0.08)' : 'transparent', opacity: blocked ? 0.55 : 1 }}>
                  <div style={{ width: 34, height: 30, borderRadius: 6, background: '#1a2440', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: posC, flexShrink: 0 }}>{ini}</div>
                  <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden' }}>{p.name}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: posC }}>{POS_LABEL[p.position]}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 20px', gap: 8, alignItems: 'center' }}>
                    <div style={{ height: 6, borderRadius: 3, background: '#1f2945', overflow: 'hidden' }}>
                      <div style={{ height: 6, width: `${p.skill * 10}%`, background: posC, borderRadius: 3 }} />
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13 }}>{p.skill}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#c2cbe0' }}>{p.age}</div>
                  <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: isBuy ? '#e8edf7' : '#5fd49a' }}>{money(pr)}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {isDone ? (
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#c8f53d' }}>{isBuy ? 'Signed ✓' : 'Sold ✓'}</span>
                    ) : blocked ? (
                      <span style={{ fontSize: 12, color: '#6b7797' }}>{why}</span>
                    ) : (
                      <button
                        onClick={() => {
                          if (isBuy) onHire(p); else onSell(p.id);
                          setDone(d => ({ ...d, [p.id]: true }));
                        }}
                        style={{ height: 34, padding: '0 16px', borderRadius: 8, border: 0, background: isBuy ? '#c8f53d' : '#f5c76b', color: '#070b16', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                      >
                        {isBuy ? 'Buy' : 'Sell'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
