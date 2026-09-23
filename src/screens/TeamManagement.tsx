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

const RAISED = { border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff' } as const;
const SUNKEN = { border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080' } as const;

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

  return (
    <Layout>
      <div style={{ background: '#c0c0c0', minHeight: 'calc(100vh - 28px)', fontFamily: 'Arial, system-ui', fontSize: '13px' }}>

        {/* Top section tabs */}
        <div style={{ display: 'flex', paddingTop: '4px', paddingLeft: '4px', borderBottom: '2px solid #808080', background: '#c0c0c0' }}>
          {['Team', 'Training', 'Statistics', 'Team Photo'].map(t => {
            const active = t === 'Training';
            return (
              <div key={t} style={{
                padding: '3px 14px',
                fontSize: '12px',
                background: '#c0c0c0',
                border: '2px solid',
                borderColor: '#ffffff #808080 ' + (active ? '#c0c0c0' : '#808080') + ' #ffffff',
                borderBottom: active ? '2px solid #c0c0c0' : undefined,
                fontWeight: active ? 'bold' : 'normal',
                marginRight: '2px',
                marginBottom: active ? '-2px' : '0',
                cursor: 'default',
                zIndex: active ? 1 : 0,
                position: 'relative',
                color: '#000000',
              }}>
                {t}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ display: 'flex', gap: '8px', padding: '8px' }}>

          {/* LEFT: sub-tabs + image + sliders */}
          <div style={{ width: '340px', flexShrink: 0 }}>

            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: '3px', marginBottom: '6px' }}>
              {(['massage', 'skills', 'shape'] as TrainingTab[]).map(tab => {
                const active = activeTab === tab;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: '12px',
                    fontWeight: active ? 'bold' : 'normal',
                    background: '#c0c0c0',
                    border: '2px solid',
                    borderColor: active ? '#808080 #ffffff #ffffff #808080' : '#ffffff #808080 #808080 #ffffff',
                    cursor: 'pointer',
                    color: '#000',
                  }}>
                    {TAB_LABELS[tab]}
                  </button>
                );
              })}
            </div>

            {/* Training image */}
            <div style={{ ...SUNKEN, overflow: 'hidden', marginBottom: '8px', height: '200px', background: '#004488' }}>
              <img
                key={currentImage}
                src={img(currentImage)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }}
                alt=""
              />
            </div>

            {/* Sliders + side box */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ flex: 1 }}>
                {(['massage', 'skills', 'shape'] as TrainingTab[]).map(type => (
                  <SliderRow
                    key={type}
                    label={type === 'massage' ? 'Massage and Relaxation' : type === 'skills' ? 'Skills and Scoring' : 'Shape'}
                    value={values[type]}
                    max={10}
                    remaining={remaining}
                    onDec={() => adjust(type, -1)}
                    onInc={() => adjust(type, +1)}
                  />
                ))}
              </div>
              <div style={{ width: '80px', ...SUNKEN, background: '#c0c0c0' }} />
            </div>

            {/* Remaining units */}
            <div style={{ marginTop: '8px', ...RAISED, background: '#c0c0c0', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '20px', fontWeight: 'bold' }}>
              <span style={{ color: '#006600', fontSize: '26px' }}>↺</span>
              <span>{remaining}</span>
            </div>
          </div>

          {/* RIGHT: stat bars + training units */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>

            {/* Stat bars */}
            <div style={{ ...RAISED, background: '#c0c0c0', padding: '10px', display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'flex-end', minHeight: '180px' }}>
              <StatBar label="Motivation" value={motivation} color="#22c55e" />
              <StatBar label="Skills" value={skillStat} color="#3b82f6" />
              <StatBar label="Shape" value={shapeStat} color="#ef4444" />
              <StatBar label="Overall" value={overall} color="#991b1b" />
            </div>

            {/* Training Units panel */}
            <div style={{ ...RAISED, background: '#c0c0c0', padding: '4px', flex: 1, minHeight: '220px' }}>
              <div style={{ background: '#808080', color: '#ffffff', fontSize: '11px', textAlign: 'center', padding: '2px 4px', marginBottom: '4px' }}>
                Training Units
              </div>
              <div style={{ ...SUNKEN, background: '#0044aa', overflow: 'hidden', height: '160px', marginBottom: '4px' }}>
                <img src={img('spieler0.png')} style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} alt="" />
              </div>
              <div style={{ ...SUNKEN, overflow: 'hidden', height: '56px' }}>
                <img src={img('felda1.png')} style={{ width: '100%', height: '80%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} alt="" />
                <div style={{ background: '#c0c0c0', fontSize: '10px', textAlign: 'center', padding: '1px' }}>Practice Match</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SliderRow({ label, value, max, remaining, onDec, onInc }: {
  label: string; value: number; max: number; remaining: number;
  onDec: () => void; onInc: () => void;
}) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '11px', marginBottom: '3px', color: '#000' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        <button onClick={onDec} disabled={value <= 0} style={{
          width: '22px', height: '20px', fontSize: '11px', background: '#c0c0c0', cursor: value > 0 ? 'pointer' : 'default',
          border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{'<'}</button>
        <button onClick={onInc} disabled={remaining <= 0 || value >= max} style={{
          width: '22px', height: '20px', fontSize: '11px', background: '#c0c0c0', cursor: (remaining > 0 && value < max) ? 'pointer' : 'default',
          border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{'>'}</button>
        <div style={{ flex: 1, height: '16px', ...SUNKEN, background: '#c0c0c0', position: 'relative', cursor: 'default' }}>
          <div style={{
            position: 'absolute', top: '50%', left: `${Math.round((value / max) * 90)}%`,
            transform: 'translate(-50%, -50%)',
            width: '10px', height: '20px', background: '#c0c0c0',
            border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff',
          }} />
        </div>
        <span style={{ fontSize: '12px', fontWeight: 'bold', minWidth: '18px', textAlign: 'right', color: '#000' }}>{value}</span>
      </div>
    </div>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const SUNKEN2 = { border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080' } as const;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{ ...SUNKEN2, background: '#ffffff', width: '26px', height: '110px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${value}%`, background: color }} />
      </div>
      <div style={{
        fontSize: '9px', writingMode: 'vertical-rl', transform: 'rotate(180deg)',
        color: '#000', letterSpacing: '0.5px', lineHeight: 1.2,
      }}>
        {label}
      </div>
      <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#000' }}>{value}%</div>
    </div>
  );
}
