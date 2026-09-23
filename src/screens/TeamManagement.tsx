import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';

type TrainingTab = 'massage' | 'skills' | 'shape';

const TAB_IMAGES: Record<TrainingTab, [string, string, string]> = {
  massage: ['massage1.png', 'massage2.png', 'massage3.png'],
  skills:  ['mittelf1.png', 'mittelf2.png', 'mittelf4.png'],
  shape:   ['kondi1.png',   'kondi2.png',   'superm3.png'],
};

function lvl(v: number): 0 | 1 | 2 {
  if (v <= 1) return 0;
  if (v <= 4) return 1;
  return 2;
}

const CARD = { background: '#161b27', border: '1px solid #28314a', borderRadius: '8px' } as const;

export function TeamManagement() {
  const { trainingMassage, trainingSkills, trainingShape, setTraining } = useGameStore();
  const [activeTab, setActiveTab] = useState<TrainingTab>('massage');

  const values = { massage: trainingMassage, skills: trainingSkills, shape: trainingShape };
  const total = trainingMassage + trainingSkills + trainingShape;
  const remaining = 10 - total;

  const currentImage = TAB_IMAGES[activeTab][lvl(values[activeTab])];

  const adjust = (type: TrainingTab, delta: number) => {
    const cur = values[type];
    const next = Math.max(0, Math.min(10, cur + delta));
    if (delta > 0 && remaining <= 0) return;
    setTraining(type, next);
  };

  const motivation = Math.min(100, Math.round(50 + trainingMassage * 5));
  const skillStat  = Math.min(100, Math.round(50 + trainingSkills * 5));
  const shapeStat  = Math.min(100, Math.round(50 + trainingShape * 5));
  const overall    = Math.round((motivation + skillStat + shapeStat) / 3);

  const TAB_LABELS: Record<TrainingTab, string> = {
    massage: 'Massage',
    skills: 'Skills',
    shape: 'Shape',
  };

  const TAB_COLORS: Record<TrainingTab, string> = {
    massage: '#4ade80',
    skills: '#60a5fa',
    shape: '#f59e0b',
  };

  return (
    <Layout>
      <div style={{ background: '#0d1117', minHeight: 'calc(100vh - 28px)', fontFamily: 'Arial, system-ui', fontSize: '13px' }}>

        {/* Top section tabs */}
        <div style={{ display: 'flex', padding: '10px 10px 0', gap: '4px', borderBottom: '1px solid #1e2535' }}>
          {['Team', 'Training', 'Statistics', 'Team Photo'].map(t => {
            const active = t === 'Training';
            return (
              <div key={t} style={{
                padding: '6px 14px',
                fontSize: '12px',
                background: active ? '#161b27' : 'transparent',
                border: '1px solid',
                borderColor: active ? '#28314a' : 'transparent',
                borderRadius: '6px 6px 0 0',
                fontWeight: active ? 'bold' : 'normal',
                marginBottom: active ? '-1px' : '0',
                cursor: 'default',
                zIndex: active ? 1 : 0,
                position: 'relative',
                color: active ? '#ffffff' : '#64748b',
              }}>
                {t}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ display: 'flex', gap: '10px', padding: '10px' }}>

          {/* LEFT: sub-tabs + image + sliders */}
          <div style={{ width: '340px', flexShrink: 0 }}>

            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              {(['massage', 'skills', 'shape'] as TrainingTab[]).map(tab => {
                const active = activeTab === tab;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    flex: 1,
                    padding: '6px 6px',
                    fontSize: '12px',
                    fontWeight: active ? 'bold' : 'normal',
                    background: active ? '#161b27' : 'transparent',
                    border: `1px solid ${active ? TAB_COLORS[tab] + '66' : '#28314a'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: active ? TAB_COLORS[tab] : '#94a3b8',
                  }}>
                    {TAB_LABELS[tab]}
                  </button>
                );
              })}
            </div>

            {/* Training image */}
            <div style={{ ...CARD, overflow: 'hidden', marginBottom: '10px', height: '200px' }}>
              <img
                key={currentImage}
                src={img(currentImage)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }}
                alt=""
              />
            </div>

            {/* Sliders + side box */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                {(['massage', 'skills', 'shape'] as TrainingTab[]).map(type => (
                  <SliderRow
                    key={type}
                    label={type === 'massage' ? 'Massage and Relaxation' : type === 'skills' ? 'Skills and Scoring' : 'Shape'}
                    value={values[type]}
                    max={10}
                    remaining={remaining}
                    color={TAB_COLORS[type]}
                    onDec={() => adjust(type, -1)}
                    onInc={() => adjust(type, +1)}
                  />
                ))}
              </div>
              <div style={{ width: '80px', ...CARD }} />
            </div>

            {/* Remaining units */}
            <div style={{ marginTop: '10px', ...CARD, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#4ade80', fontSize: '24px' }}>↺</span>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: remaining > 0 ? '#4ade80' : '#64748b' }}>{remaining}</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>remaining</span>
            </div>
          </div>

          {/* RIGHT: stat bars + training units */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Stat bars */}
            <div style={{ ...CARD, padding: '14px', display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'flex-start', minHeight: '180px' }}>
              <StatBar label="Motivation" value={motivation} color="#4ade80" />
              <StatBar label="Skills" value={skillStat} color="#60a5fa" />
              <StatBar label="Shape" value={shapeStat} color="#f59e0b" />
              <StatBar label="Overall" value={overall} color="#c084fc" />
            </div>

            {/* Training Units panel */}
            <div style={{ ...CARD, padding: '10px', flex: 1, minHeight: '220px' }}>
              <div style={{ color: '#94a3b8', fontSize: '10px', textAlign: 'center', marginBottom: '8px' }}>
                TRAINING UNITS
              </div>
              <div style={{ borderRadius: '6px', overflow: 'hidden', height: '160px', marginBottom: '8px', border: '1px solid #1e2535' }}>
                <img src={img('spieler0.png')} style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} alt="" />
              </div>
              <div style={{ borderRadius: '6px', overflow: 'hidden', height: '56px', border: '1px solid #1e2535' }}>
                <img src={img('felda1.png')} style={{ width: '100%', height: '80%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} alt="" />
                <div style={{ background: '#161b27', fontSize: '10px', textAlign: 'center', padding: '2px', color: '#64748b' }}>Practice Match</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SliderRow({ label, value, max, remaining, color, onDec, onInc }: {
  label: string; value: number; max: number; remaining: number; color: string;
  onDec: () => void; onInc: () => void;
}) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', marginBottom: '4px', color: '#94a3b8' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button onClick={onDec} disabled={value <= 0} style={{
          width: '24px', height: '24px', fontSize: '12px',
          background: value > 0 ? '#161b27' : '#0d1117',
          border: '1px solid #28314a', borderRadius: '4px',
          cursor: value > 0 ? 'pointer' : 'default',
          color: value > 0 ? '#ffffff' : '#374151',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }}>{'‹'}</button>
        <button onClick={onInc} disabled={remaining <= 0 || value >= max} style={{
          width: '24px', height: '24px', fontSize: '12px',
          background: (remaining > 0 && value < max) ? '#161b27' : '#0d1117',
          border: '1px solid #28314a', borderRadius: '4px',
          cursor: (remaining > 0 && value < max) ? 'pointer' : 'default',
          color: (remaining > 0 && value < max) ? '#ffffff' : '#374151',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }}>{'›'}</button>
        {/* Slider track */}
        <div style={{ flex: 1, height: '16px', background: '#0d1117', borderRadius: '8px', border: '1px solid #1e2535', position: 'relative', cursor: 'default' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            width: `${(value / max) * 100}%`,
            background: `${color}44`,
            borderRadius: '8px',
          }} />
          <div style={{
            position: 'absolute', top: '50%',
            left: `${Math.round((value / max) * 90)}%`,
            transform: 'translate(-50%, -50%)',
            width: '10px', height: '20px',
            background: color,
            borderRadius: '3px',
            boxShadow: `0 0 6px ${color}88`,
          }} />
        </div>
        <span style={{ fontSize: '12px', fontWeight: 'bold', minWidth: '18px', textAlign: 'right', color }}>{value}</span>
      </div>
    </div>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{ background: '#0d1117', border: `1px solid ${color}44`, borderRadius: '4px', width: '26px', height: '110px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${value}%`, background: `linear-gradient(to top, ${color}, ${color}88)`, borderRadius: '3px' }} />
      </div>
      <div style={{
        fontSize: '9px', writingMode: 'vertical-rl', transform: 'rotate(180deg)',
        color: '#64748b', letterSpacing: '0.5px', lineHeight: 1.2,
      }}>
        {label}
      </div>
      <div style={{ fontSize: '10px', fontWeight: 'bold', color }}>{value}%</div>
    </div>
  );
}
