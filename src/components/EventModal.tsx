import type { GameEvent } from '../types/game';

interface Props {
  event: GameEvent;
  onClose: () => void;
}

const TYPE_CONFIG = {
  good:    { c: '#c8f53d', band: 'linear-gradient(90deg, rgba(200,245,61,0.14), transparent 70%)',    kicker: 'GOOD NEWS',   icon: 'trophy' },
  bad:     { c: '#7fb2ff', band: 'linear-gradient(90deg, rgba(127,178,255,0.14), transparent 70%)',   kicker: 'BAD NEWS',    icon: 'board' },
  neutral: { c: '#7fb2ff', band: 'linear-gradient(90deg, rgba(127,178,255,0.14), transparent 70%)',   kicker: 'NEWS',        icon: 'board' },
  funny:   { c: '#f5c76b', band: 'linear-gradient(90deg, rgba(245,199,107,0.16), transparent 70%)',   kicker: 'MEANWHILE...', icon: 'fun' },
};

const ICONS: Record<string, JSX.Element> = {
  trophy: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8"/><path d="M12 17v4"/>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z"/>
      <path d="M17 5h3v2a3 3 0 0 1-3 3"/><path d="M7 5H4v2a3 3 0 0 0 3 3"/>
    </svg>
  ),
  coins: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="6" rx="7" ry="3"/>
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/>
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>
    </svg>
  ),
  fun: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>
      <path d="M12 8v4"/><path d="M12 15.5v.5"/>
    </svg>
  ),
  board: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2"/>
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
      <path d="M3 13h18"/>
    </svg>
  ),
};

function fmtMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `£${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000)     return `£${(abs / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 0)}K`;
  return `£${abs}`;
}

export function EventModal({ event, onClose }: Props) {
  const cfg = TYPE_CONFIG[event.kind];

  const fx: Array<{ v: string; label: string; bg: string; fg: string }> = [];
  if (event.moneyEffect !== 0) {
    const pos = event.moneyEffect > 0;
    fx.push({
      v: (pos ? '+' : '−') + fmtMoney(event.moneyEffect),
      label: pos ? 'income' : 'cost',
      bg: pos ? 'rgba(95,212,154,0.12)' : 'rgba(255,122,107,0.12)',
      fg: pos ? '#5fd49a' : '#ff7a6b',
    });
  }
  if (event.pointsEffect !== 0) {
    const pos = event.pointsEffect > 0;
    fx.push({
      v: (pos ? '+' : '') + event.pointsEffect,
      label: 'pts',
      bg: pos ? 'rgba(200,245,61,0.12)' : 'rgba(255,122,107,0.12)',
      fg: pos ? '#c8f53d' : '#ff7a6b',
    });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* blurred game background */}
      <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', opacity: 0.9 }} />
      {/* dark tint */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,6,12,0.62)' }} />

      <div role="dialog" aria-modal="true" aria-label="Event" style={{
        position: 'relative',
        width: 560,
        borderRadius: 20,
        overflow: 'hidden',
        background: '#0f1628',
        border: '1px solid #2a3656',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        fontFamily: "Barlow, 'Segoe UI', sans-serif",
        color: '#e8edf7',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '22px 26px',
          background: cfg.band,
          borderBottom: '1px solid #1c2640',
        }}>
          <div style={{
            width: 52, height: 52, flexShrink: 0,
            borderRadius: 14,
            background: cfg.c,
            color: '#070b16',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {ICONS[cfg.icon]}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{
              fontSize: 12, fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: cfg.c,
            }}>{cfg.kicker}</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '24px 26px' }}>
          <div style={{ fontSize: 19, lineHeight: 1.55, color: '#e8edf7' }}>{event.text}</div>

          {fx.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {fx.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 14px', borderRadius: 8,
                  background: f.bg, color: f.fg,
                  fontSize: 14, fontWeight: 600,
                }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{f.v}</span>
                  {f.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 26px 24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              height: 48, minWidth: 160, padding: '0 22px',
              borderRadius: 12, border: 0,
              background: '#c8f53d', color: '#070b16',
              fontFamily: "'Big Shoulders Display', Impact, sans-serif",
              fontWeight: 900, fontSize: 22,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  );
}
