import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';
import { TICKET_TYPES, TICKET_PRICE_PRESETS, FOOD_REVENUE_PER_MATCH, MERCH_REVENUE_PER_MATCH } from '../data/finances';

type DeskTab = 'desk' | 'personnel' | 'cash-season' | 'cash-week';

const CARD = { background: '#161b27', border: '1px solid #28314a', borderRadius: '8px' } as const;

export function Desk() {
  const { managerName, currentMatchday, balance, financeHistory, priceLevel, foodEnabled, merchandiseEnabled, setPriceLevel, setFoodEnabled, setMerchandiseEnabled, rosters, managedTeamId } = useGameStore();
  const [tab, setTab] = useState<DeskTab>('desk');

  const prices = TICKET_PRICE_PRESETS[priceLevel];
  const recent = [...financeHistory].reverse().slice(0, 20);
  const weekEntries = [...financeHistory].reverse().slice(0, 5);

  const personnel = (rosters[managedTeamId] ?? []).filter(p => p.injuredFor > 0 || p.suspended);
  const injured = personnel.filter(p => p.injuredFor > 0);
  const suspended = personnel.filter(p => p.suspended);

  return (
    <Layout>
      <div style={{ background: '#0d1117', minHeight: 'calc(100vh - 28px)', fontFamily: 'Arial, system-ui', fontSize: '13px' }}>

        {/* Desk image header */}
        <div style={{ position: 'relative', overflow: 'hidden', height: '130px' }}>
          <img src={img('sekretba.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} alt="" />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '8px 12px' }}>
            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}>Manager: {managerName}</span>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', padding: '10px 10px 0', gap: '4px', borderBottom: '1px solid #1e2535' }}>
          {(['desk', 'personnel', 'cash-season', 'cash-week'] as DeskTab[]).map(t => {
            const labels = { desk: 'Desk', personnel: 'Personnel', 'cash-season': 'Cash Season', 'cash-week': 'Cash Week' };
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 14px', fontSize: '11px',
                fontWeight: active ? 'bold' : 'normal',
                background: active ? '#161b27' : 'transparent',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: active ? '#28314a' : 'transparent',
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
          {tab === 'desk' && (
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <div style={{ ...CARD, padding: '14px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#e2e8f0' }}>Ticket Pricing</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {(['low', 'medium', 'high'] as const).map(level => (
                    <button key={level} onClick={() => setPriceLevel(level)} style={{
                      background: priceLevel === level ? '#1e40af' : '#0d1117',
                      border: `1px solid ${priceLevel === level ? '#3b82f6' : '#28314a'}`,
                      borderRadius: '6px',
                      color: priceLevel === level ? '#ffffff' : '#94a3b8',
                      padding: '6px 18px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize',
                    }}>{level}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {TICKET_TYPES.map((t, i) => (
                    <div key={t.name} style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {t.name}: <strong style={{ color: '#4ade80' }}>£{prices[i]}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...CARD, padding: '14px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#e2e8f0' }}>Stadium Revenue</div>
                <ToggleRow label="Food Stand" sub={`+£${(FOOD_REVENUE_PER_MATCH / 1000).toFixed(0)}K per home match`} value={foodEnabled} onChange={setFoodEnabled} />
                <ToggleRow label="Club Shop" sub={`+£${(MERCH_REVENUE_PER_MATCH / 1000).toFixed(0)}K per home match`} value={merchandiseEnabled} onChange={setMerchandiseEnabled} />
              </div>
            </div>
          )}

          {tab === 'personnel' && (
            <div style={{ ...CARD, padding: '14px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#e2e8f0' }}>Squad Status</div>
              {injured.length === 0 && suspended.length === 0 ? (
                <div style={{ color: '#4ade80', fontSize: '13px' }}>✓ All players available</div>
              ) : (
                <>
                  {injured.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ color: '#f87171', fontWeight: 'bold', marginBottom: '6px', fontSize: '12px' }}>INJURED</div>
                      {injured.map(p => (
                        <div key={p.id} style={{ fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #1e2535', color: '#e2e8f0' }}>
                          {p.name} <span style={{ color: '#94a3b8' }}>— out for {p.injuredFor} matchday{p.injuredFor > 1 ? 's' : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {suspended.length > 0 && (
                    <div>
                      <div style={{ color: '#f59e0b', fontWeight: 'bold', marginBottom: '6px', fontSize: '12px' }}>SUSPENDED</div>
                      {suspended.map(p => (
                        <div key={p.id} style={{ fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #1e2535', color: '#e2e8f0' }}>
                          {p.name}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'cash-season' && (
            <div style={{ background: '#0a0028', border: '1px solid #1a0060', borderRadius: '8px', padding: '14px', color: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontWeight: 'bold', color: '#88ff88' }}>EARNINGS</div>
                <div style={{ fontWeight: 'bold', color: '#ff8888' }}>COSTS</div>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  {recent.filter(e => e.amount > 0).slice(0, 8).map((e, i) => (
                    <div key={i} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ color: '#aaccff' }}>MD{e.matchday} {e.description.slice(0, 18)}</span>
                      <span style={{ color: '#88ff88' }}>£{e.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  {recent.filter(e => e.amount < 0).slice(0, 8).map((e, i) => (
                    <div key={i} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ color: '#aaccff' }}>MD{e.matchday} {e.description.slice(0, 18)}</span>
                      <span style={{ color: '#ff8888' }}>£{Math.abs(e.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span style={{ color: '#aaccff' }}>BALANCE (MD {currentMatchday})</span>
                <span style={{ color: balance >= 0 ? '#88ff88' : '#ff8888' }}>£{balance.toLocaleString()}</span>
              </div>
            </div>
          )}

          {tab === 'cash-week' && (
            <div style={{ background: '#0a0028', border: '1px solid #1a0060', borderRadius: '8px', padding: '14px', color: '#ffffff' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#aaccff' }}>RECENT TRANSACTIONS</div>
              {weekEntries.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '12px' }}>No transactions yet.</div>
              ) : (
                weekEntries.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '10px', color: '#aaccff', width: '30px' }}>MD{e.matchday}</span>
                    <span style={{ flex: 1, fontSize: '11px', color: '#e0e0ff' }}>{e.description}</span>
                    <span style={{ fontWeight: 'bold', fontSize: '12px', color: e.amount >= 0 ? '#88ff88' : '#ff8888' }}>
                      {e.amount >= 0 ? '+' : ''}£{e.amount.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '10px', color: '#7777aa' }}>→£{e.running.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ToggleRow({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#e2e8f0' }}>{label}</div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>{sub}</div>
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: '48px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative',
        background: value ? '#15803d' : '#1e2535', border: `1px solid ${value ? '#16a34a' : '#28314a'}`,
      }}>
        <div style={{ position: 'absolute', top: '3px', width: '16px', height: '16px', background: '#fff', borderRadius: '50%', transition: 'left 0.15s', left: value ? '27px' : '3px' }} />
      </button>
    </div>
  );
}
