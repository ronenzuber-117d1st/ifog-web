import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';

const CARD = { background: '#161b27', border: '1px solid #28314a', borderRadius: '8px' } as const;

const UPGRADES = [
  {
    type: 'pitch' as const,
    label: 'Pitch Quality',
    desc: ['Basic grass', 'Good turf', 'Premium surface'],
    costs: [0, 200_000, 500_000],
    effect: 'Improves home team performance',
    images: ['grassl.png', 'grassm.png', 'grasss.png'],
    accentColor: '#4ade80',
  },
  {
    type: 'seats' as const,
    label: 'Stadium Capacity',
    desc: ['15,000 seats', '25,000 seats', '40,000 seats'],
    costs: [0, 400_000, 800_000],
    effect: 'Increases gate revenue',
    images: ['stli1.png', 'stli2.png', 'stli3.png'],
    accentColor: '#60a5fa',
  },
  {
    type: 'facilities' as const,
    label: 'Fan Facilities',
    desc: ['Basic amenities', 'Good facilities', 'Premium facilities'],
    costs: [0, 100_000, 250_000],
    effect: 'Improves atmosphere and morale',
    images: ['trib1.png', 'trib2.png', 'trib3.png'],
    accentColor: '#f59e0b',
  },
];

export function Stadium() {
  const { stadium, balance, upgradeStadium } = useGameStore();

  const overallLevel = stadium.pitch + stadium.seats + stadium.facilities; // 3-9
  const bgImage = overallLevel >= 7 ? 'zuschau.png' : 'zuschau1.png';

  return (
    <Layout>
      <div style={{ background: '#0d1117', minHeight: 'calc(100vh - 28px)', fontFamily: 'Arial, system-ui', fontSize: '13px' }}>

        {/* Dynamic stadium composite header */}
        <div style={{ position: 'relative', height: '160px', overflow: 'hidden', background: '#001' }}>
          {/* Base background */}
          <img
            src={img(bgImage)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', opacity: 0.5 }}
            alt=""
          />
          {/* Current level images as panels */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            <img
              src={img(UPGRADES[0].images[stadium.pitch - 1])}
              style={{ flex: 1, objectFit: 'cover', imageRendering: 'pixelated', opacity: 0.85, borderRight: '1px solid rgba(255,255,255,0.1)' }}
              alt=""
            />
            <img
              src={img(UPGRADES[1].images[stadium.seats - 1])}
              style={{ flex: 1, objectFit: 'cover', imageRendering: 'pixelated', opacity: 0.85, borderRight: '1px solid rgba(255,255,255,0.1)' }}
              alt=""
            />
            <img
              src={img(UPGRADES[2].images[stadium.facilities - 1])}
              style={{ flex: 1, objectFit: 'cover', imageRendering: 'pixelated', opacity: 0.85 }}
              alt=""
            />
          </div>
          {/* Gradient overlay + title */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,20,0.85))', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px 14px' }}>
            <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px', letterSpacing: '2px' }}>STADIUM DEVELOPMENT</div>
            <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
              Pitch: {'★'.repeat(stadium.pitch)}{'☆'.repeat(3 - stadium.pitch)} &nbsp;·&nbsp;
              Seats: {'★'.repeat(stadium.seats)}{'☆'.repeat(3 - stadium.seats)} &nbsp;·&nbsp;
              Facilities: {'★'.repeat(stadium.facilities)}{'☆'.repeat(3 - stadium.facilities)}
            </div>
          </div>
        </div>

        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Current status bar */}
          <div style={{ ...CARD, padding: '12px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            {UPGRADES.map(({ type, label, accentColor }) => (
              <StatusItem key={type} label={label} level={stadium[type]} color={accentColor} />
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Available funds</div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: balance >= 0 ? '#4ade80' : '#f87171' }}>
                £{(balance / 1_000_000).toFixed(3)}M
              </div>
            </div>
          </div>

          {/* Upgrade cards */}
          {UPGRADES.map(({ type, label, desc, costs, effect, images, accentColor }) => {
            const current = stadium[type];
            const canUpgrade = current < 3;
            const cost = canUpgrade ? costs[current] : 0;
            const canAfford = balance >= cost;

            return (
              <div key={type} style={{ ...CARD, padding: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>

                {/* Images strip — current level image is highlighted */}
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {images.map((imgName, i) => (
                    <div key={i} style={{
                      width: '72px', height: '64px', overflow: 'hidden', borderRadius: '6px',
                      opacity: i + 1 <= current ? 1 : 0.25,
                      border: `2px solid ${i + 1 === current ? accentColor : 'transparent'}`,
                      background: '#001',
                      boxShadow: i + 1 === current ? `0 0 8px ${accentColor}44` : 'none',
                    }}>
                      <img src={img(imgName)} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
                    </div>
                  ))}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: '#e2e8f0' }}>{label}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                    Current: <strong style={{ color: '#ffffff' }}>{desc[current - 1]}</strong>
                    {canUpgrade && <> → Next: <strong style={{ color: accentColor }}>{desc[current]}</strong></>}
                    {!canUpgrade && <span style={{ color: '#4ade80' }}> ✓ Maximum level</span>}
                  </div>

                  {/* Level bar */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    {[1, 2, 3].map(l => (
                      <div key={l} style={{
                        flex: 1, height: '6px', borderRadius: '3px',
                        background: l <= current ? accentColor : '#1e2535',
                      }} />
                    ))}
                  </div>

                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '8px' }}>⚡ {effect}</div>

                  {canUpgrade && (
                    <button
                      disabled={!canAfford}
                      onClick={() => upgradeStadium(type)}
                      style={{
                        background: canAfford ? '#1e40af' : '#1a1a2a',
                        border: `1px solid ${canAfford ? '#3b82f6' : '#2a2a3a'}`,
                        borderRadius: '6px',
                        color: canAfford ? '#ffffff' : '#4a4a6a',
                        padding: '6px 16px', fontSize: '12px',
                        fontWeight: 'bold', cursor: canAfford ? 'pointer' : 'default',
                      }}
                    >
                      Upgrade — £{cost.toLocaleString()}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function StatusItem({ label, level, color }: { label: string; level: number; color: string }) {
  const stars = ['★', '★★', '★★★'][level - 1] || '★';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '18px', color, letterSpacing: '2px' }}>{stars}</div>
      <div style={{ fontSize: '10px', color: '#94a3b8' }}>Lv {level}/3</div>
    </div>
  );
}
