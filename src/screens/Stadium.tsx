import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';

const UPGRADE_COSTS: Record<string, number[]> = {
  pitch:      [0, 200_000, 500_000],
  seats:      [0, 400_000, 800_000],
  facilities: [0, 100_000, 250_000],
  lights:     [0, 150_000, 350_000],
};

const UPGRADE_LABELS: Record<string, string[]> = {
  pitch:      ['Basic Grass', 'Good Turf', 'Premium Surface'],
  seats:      ['15,000 Seats', '25,000 Seats', '40,000 Seats'],
  facilities: ['Basic', 'Good', 'Premium'],
  lights:     ['Dim Lights', 'Bright Lights', 'Floodlit'],
};

export function Stadium() {
  const { stadium, balance, upgradeStadium } = useGameStore();

  const pitchLevel  = stadium.pitch      as 1 | 2 | 3;
  const seatsLevel  = stadium.seats      as 1 | 2 | 3;
  const facilLevel  = stadium.facilities as 1 | 2 | 3;
  const lightsLevel = stadium.lights     as 1 | 2 | 3;

  return (
    <Layout>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117', fontFamily: 'Arial, system-ui' }}>

        {/* ── Stadium image (same composition as match screen) ── */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: '#001428' }}>

          {/* Top row: stli | anzeig | stre  — 123/308 = 39.9% of canvas */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '39.9%', display: 'flex' }}>
            <img src={img(`stli${lightsLevel}.png`)}  style={{ width: '29.5%',  height: '100%', objectFit: 'fill', imageRendering: 'pixelated', flexShrink: 0 }} alt="" />
            <img src={img(`anzeig${facilLevel}.png`)} style={{ flex: 1,         height: '100%', objectFit: 'fill', imageRendering: 'pixelated' }} alt="" />
            <img src={img(`stre${lightsLevel}.png`)}  style={{ width: '34.25%', height: '100%', objectFit: 'fill', imageRendering: 'pixelated', flexShrink: 0 }} alt="" />
          </div>

          {/* Tribune / stands — 65/308 = 21.1%, sits between top row and pitch */}
          {/* pillar-align: left: seatsLevel >= 2 ? '-2%' : 0, width: seatsLevel >= 2 ? '102%' : '100%' */}
          <img src={img(`trib${seatsLevel}.png`)} style={{
            position: 'absolute', top: '39.9%', left: 0, width: '100%', height: '21.1%',
            objectFit: 'fill', imageRendering: 'pixelated',
          }} alt="" />

          {/* Pitch — 120/308 = 39%, anchored to bottom */}
          <img src={img(`felda${pitchLevel}.png`)} style={{
            position: 'absolute', bottom: 0, left: 0, width: '100%', height: '39%',
            objectFit: 'fill', imageRendering: 'pixelated',
          }} alt="" />

          {/* ── Upgrade overlays ── */}

          {/* Lights — over the left floodlight tower */}
          <UpgradeChip
            label="Lights"
            current={lightsLevel}
            cost={UPGRADE_COSTS.lights[lightsLevel]}
            desc={UPGRADE_LABELS.lights[lightsLevel - 1]}
            canAfford={balance >= UPGRADE_COSTS.lights[lightsLevel]}
            onUpgrade={() => upgradeStadium('lights')}
            style={{ top: '5%', left: '2%' }}
          />

          {/* Facilities — over the anzeig / scoreboard area */}
          <UpgradeChip
            label="Facilities"
            current={facilLevel}
            cost={UPGRADE_COSTS.facilities[facilLevel]}
            desc={UPGRADE_LABELS.facilities[facilLevel - 1]}
            canAfford={balance >= UPGRADE_COSTS.facilities[facilLevel]}
            onUpgrade={() => upgradeStadium('facilities')}
            style={{ top: '5%', left: '50%', transform: 'translateX(-50%)' }}
          />

          {/* Seats / capacity — over the tribune strip */}
          <UpgradeChip
            label="Seats"
            current={seatsLevel}
            cost={UPGRADE_COSTS.seats[seatsLevel]}
            desc={UPGRADE_LABELS.seats[seatsLevel - 1]}
            canAfford={balance >= UPGRADE_COSTS.seats[seatsLevel]}
            onUpgrade={() => upgradeStadium('seats')}
            style={{ top: '47%', left: '50%', transform: 'translateX(-50%)' }}
          />

          {/* Pitch quality — over the felda / playing surface */}
          <UpgradeChip
            label="Pitch"
            current={pitchLevel}
            cost={UPGRADE_COSTS.pitch[pitchLevel]}
            desc={UPGRADE_LABELS.pitch[pitchLevel - 1]}
            canAfford={balance >= UPGRADE_COSTS.pitch[pitchLevel]}
            onUpgrade={() => upgradeStadium('pitch')}
            style={{ top: '68%', left: '5%' }}
          />
        </div>

        {/* ── Bottom bar ── */}
        <div style={{
          flexShrink: 0, background: '#0d1117', borderTop: '1px solid #1e2535',
          padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '12px',
        }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            {(['pitch', 'seats', 'facilities', 'lights'] as const).map(t => (
              <div key={t} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>{t}</div>
                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px', letterSpacing: '2px' }}>
                  {'★'.repeat(stadium[t])}{'☆'.repeat(3 - stadium[t])}
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#64748b' }}>BALANCE</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: balance >= 0 ? '#4ade80' : '#f87171' }}>
              £{balance.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function UpgradeChip({ label, current, cost, desc, canAfford, onUpgrade, style }: {
  label: string;
  current: 1 | 2 | 3;
  cost: number;
  desc: string;
  canAfford: boolean;
  onUpgrade: () => void;
  style: React.CSSProperties;
}) {
  const maxed = current >= 3;

  return (
    <div style={{
      position: 'absolute', zIndex: 10,
      background: 'rgba(0,0,20,0.82)',
      border: '1px solid #556',
      borderRadius: '4px',
      padding: '5px 8px',
      display: 'flex', alignItems: 'center', gap: '8px',
      ...style,
    }}>
      <div>
        <div style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>{desc}</div>
        <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
          {[1, 2, 3].map(l => (
            <div key={l} style={{
              width: '18px', height: '4px', borderRadius: '2px',
              background: l <= current ? '#4ade80' : '#1e2535',
            }} />
          ))}
        </div>
      </div>
      {!maxed ? (
        <button
          disabled={!canAfford}
          onClick={onUpgrade}
          style={{
            background: canAfford ? '#1e40af' : '#111827',
            border: `1px solid ${canAfford ? '#3b82f6' : '#374151'}`,
            borderRadius: '4px',
            color: canAfford ? '#fff' : '#4b5563',
            padding: '4px 8px',
            fontSize: '10px', fontWeight: 'bold',
            cursor: canAfford ? 'pointer' : 'default',
            whiteSpace: 'nowrap',
          }}
        >
          ▶ £{cost.toLocaleString()}
        </button>
      ) : (
        <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: 'bold' }}>MAX ✓</div>
      )}
    </div>
  );
}
