import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';

const RAISED = { border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff' } as const;
const SUNKEN = { border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080' } as const;

const UPGRADES = [
  {
    type: 'pitch' as const,
    label: 'Pitch Quality',
    desc: ['Basic grass', 'Good turf', 'Premium surface'],
    costs: [0, 200_000, 500_000],
    effect: 'Improves home team performance',
    images: ['grassl.png', 'grassm.png', 'grasss.png'],
  },
  {
    type: 'seats' as const,
    label: 'Stadium Capacity',
    desc: ['15,000 seats', '25,000 seats', '40,000 seats'],
    costs: [0, 400_000, 800_000],
    effect: 'Increases gate revenue',
    images: ['stli1.png', 'stli2.png', 'stli3.png'],
  },
  {
    type: 'facilities' as const,
    label: 'Fan Facilities',
    desc: ['Basic amenities', 'Good facilities', 'Premium facilities'],
    costs: [0, 100_000, 250_000],
    effect: 'Improves atmosphere and morale',
    images: ['trib1.png', 'trib2.png', 'trib3.png'],
  },
];

export function Stadium() {
  const { stadium, balance, upgradeStadium } = useGameStore();

  return (
    <Layout>
      <div style={{ background: '#c0c0c0', minHeight: 'calc(100vh - 28px)', fontFamily: 'Arial, system-ui', fontSize: '13px' }}>

        {/* Stadium image header */}
        <div style={{ position: 'relative', overflow: 'hidden', height: '120px' }}>
          <img src={img('zuschau.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} alt="" />
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,40,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '18px', letterSpacing: '3px', textShadow: '2px 2px 4px #000' }}>
              STADIUM DEVELOPMENT
            </div>
          </div>
        </div>

        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Current status */}
          <div style={{ ...RAISED, background: '#c0c0c0', padding: '10px' }}>
            <div style={{ fontSize: '11px', color: '#444', marginBottom: '6px' }}>CURRENT STATUS</div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <StatusItem label="Pitch" level={stadium.pitch} />
              <StatusItem label="Seats" level={stadium.seats} />
              <StatusItem label="Facilities" level={stadium.facilities} />
              <div style={{ flex: 1 }} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#444' }}>Available funds</div>
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: balance >= 0 ? '#006600' : '#cc0000' }}>
                  £{(balance / 1_000_000).toFixed(3)}M
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade cards */}
          {UPGRADES.map(({ type, label, desc, costs, effect, images }) => {
            const current = stadium[type];
            const canUpgrade = current < 3;
            const cost = canUpgrade ? costs[current] : 0;
            const canAfford = balance >= cost;

            return (
              <div key={type} style={{ ...RAISED, background: '#c0c0c0', padding: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>

                {/* Images strip */}
                <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                  {images.map((imgName, i) => (
                    <div key={i} style={{
                      ...SUNKEN,
                      width: '70px', height: '60px', overflow: 'hidden',
                      opacity: i + 1 <= current ? 1 : 0.4,
                      background: '#004',
                    }}>
                      <img src={img(imgName)} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
                    </div>
                  ))}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '11px', color: '#444', marginBottom: '6px' }}>
                    Current: <strong>{desc[current - 1]}</strong>
                    {canUpgrade && <> → Next: <strong>{desc[current]}</strong></>}
                    {!canUpgrade && <span style={{ color: '#006600' }}> ✓ Maximum level</span>}
                  </div>

                  {/* Level dots */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                    {[1, 2, 3].map(l => (
                      <div key={l} style={{
                        width: '20px', height: '8px',
                        background: l <= current ? '#000080' : '#808080',
                        border: '1px solid #444',
                      }} />
                    ))}
                  </div>

                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px' }}>⚡ {effect}</div>

                  {canUpgrade && (
                    <button
                      disabled={!canAfford}
                      onClick={() => upgradeStadium(type)}
                      style={{
                        ...RAISED, background: canAfford ? '#000080' : '#808080',
                        color: '#ffffff', padding: '5px 14px', fontSize: '12px',
                        fontWeight: 'bold', cursor: canAfford ? 'pointer' : 'default',
                        border: '2px solid', borderColor: canAfford ? '#0000ff #000040 #000040 #0000ff' : '#a0a0a0 #606060 #606060 #a0a0a0',
                      }}
                    >
                      Upgrade — £{cost.toLocaleString()}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Stands images */}
          <div style={{ ...RAISED, background: '#c0c0c0', padding: '10px' }}>
            <div style={{ fontSize: '11px', color: '#444', marginBottom: '8px' }}>STADIUM OVERVIEW</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['stre1.png', 'stre2.png', 'stre3.png'].map((s, i) => (
                <div key={i} style={{ ...SUNKEN, flex: 1, overflow: 'hidden', height: '70px', background: '#004' }}>
                  <img src={img(s)} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatusItem({ label, level }: { label: string; level: number }) {
  const stars = ['★', '★★', '★★★'][level - 1] || '★';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '11px', color: '#444' }}>{label}</div>
      <div style={{ fontSize: '16px', color: '#cc8800', letterSpacing: '2px' }}>{stars}</div>
      <div style={{ fontSize: '10px', color: '#000' }}>Level {level}/3</div>
    </div>
  );
}
