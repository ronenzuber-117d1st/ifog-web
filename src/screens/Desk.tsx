import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';
import { TICKET_TYPES, TICKET_PRICE_PRESETS, FOOD_REVENUE_PER_MATCH, MERCH_REVENUE_PER_MATCH } from '../data/finances';

type DeskTab = 'desk' | 'personnel' | 'cash-season' | 'cash-week';

const RAISED = { border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff' } as const;

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
      <div style={{ background: '#c0c0c0', minHeight: 'calc(100vh - 28px)', fontFamily: 'Arial, system-ui', fontSize: '13px' }}>

        {/* Desk image */}
        <div style={{ position: 'relative', overflow: 'hidden', height: '130px' }}>
          <img src={img('sekretba.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} alt="" />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.4)', padding: '4px 8px' }}>
            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '12px' }}>Manager: {managerName}</span>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', paddingLeft: '4px', borderBottom: '2px solid #808080', background: '#c0c0c0', paddingTop: '4px' }}>
          {(['desk', 'personnel', 'cash-season', 'cash-week'] as DeskTab[]).map(t => {
            const labels = { desk: 'Desk', personnel: 'Personnel', 'cash-season': 'Cash Season', 'cash-week': 'Cash Week' };
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '3px 12px', fontSize: '11px',
                fontWeight: active ? 'bold' : 'normal',
                background: '#c0c0c0', cursor: 'pointer',
                border: '2px solid',
                borderColor: '#ffffff #808080 ' + (active ? '#c0c0c0' : '#808080') + ' #ffffff',
                borderBottom: active ? '2px solid #c0c0c0' : undefined,
                marginRight: '2px', marginBottom: active ? '-2px' : '0',
                position: 'relative', zIndex: active ? 1 : 0, color: '#000',
              }}>
                {labels[t]}
              </button>
            );
          })}
        </div>

        <div style={{ padding: '10px' }}>
          {tab === 'desk' && (
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <div style={{ ...RAISED, background: '#c0c0c0', padding: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Ticket Pricing</div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  {(['low', 'medium', 'high'] as const).map(level => (
                    <button key={level} onClick={() => setPriceLevel(level)} style={{
                      ...RAISED, background: priceLevel === level ? '#000080' : '#c0c0c0',
                      color: priceLevel === level ? '#fff' : '#000',
                      padding: '5px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize',
                    }}>{level}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {TICKET_TYPES.map((t, i) => (
                    <div key={t.name} style={{ fontSize: '11px', color: '#444' }}>
                      {t.name}: <strong>£{prices[i]}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...RAISED, background: '#c0c0c0', padding: '12px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Stadium Revenue</div>
                <ToggleRow label="Food Stand" sub={`+£${(FOOD_REVENUE_PER_MATCH / 1000).toFixed(0)}K per home match`} value={foodEnabled} onChange={setFoodEnabled} />
                <ToggleRow label="Club Shop" sub={`+£${(MERCH_REVENUE_PER_MATCH / 1000).toFixed(0)}K per home match`} value={merchandiseEnabled} onChange={setMerchandiseEnabled} />
              </div>
            </div>
          )}

          {tab === 'personnel' && (
            <div style={{ ...RAISED, background: '#c0c0c0', padding: '12px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Squad Status</div>
              {injured.length === 0 && suspended.length === 0 ? (
                <div style={{ color: '#006600' }}>✓ All players available</div>
              ) : (
                <>
                  {injured.length > 0 && (
                    <div>
                      <div style={{ color: '#cc0000', fontWeight: 'bold', marginBottom: '4px' }}>Injured:</div>
                      {injured.map(p => (
                        <div key={p.id} style={{ fontSize: '12px', padding: '3px 0', borderBottom: '1px solid #ccc' }}>
                          {p.name} — out for {p.injuredFor} matchday{p.injuredFor > 1 ? 's' : ''}
                        </div>
                      ))}
                    </div>
                  )}
                  {suspended.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ color: '#cc8800', fontWeight: 'bold', marginBottom: '4px' }}>Suspended:</div>
                      {suspended.map(p => (
                        <div key={p.id} style={{ fontSize: '12px', padding: '3px 0', borderBottom: '1px solid #ccc' }}>
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
            <div style={{ ...RAISED, background: '#0000aa', padding: '12px', color: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontWeight: 'bold' }}>EARNINGS</div>
                <div style={{ fontWeight: 'bold' }}>COSTS</div>
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  {recent.filter(e => e.amount > 0).slice(0, 8).map((e, i) => (
                    <div key={i} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                      <span style={{ color: '#aaccff' }}>MD{e.matchday} {e.description.slice(0, 18)}</span>
                      <span style={{ color: '#88ff88' }}>£{e.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  {recent.filter(e => e.amount < 0).slice(0, 8).map((e, i) => (
                    <div key={i} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                      <span style={{ color: '#aaccff' }}>MD{e.matchday} {e.description.slice(0, 18)}</span>
                      <span style={{ color: '#ff8888' }}>£{Math.abs(e.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: '12px', borderTop: '2px solid rgba(255,255,255,0.4)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>BALANCE (MD {currentMatchday})</span>
                <span style={{ color: balance >= 0 ? '#88ff88' : '#ff8888' }}>£{balance.toLocaleString()}</span>
              </div>
            </div>
          )}

          {tab === 'cash-week' && (
            <div style={{ ...RAISED, background: '#0000aa', padding: '12px', color: '#ffffff' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>RECENT TRANSACTIONS</div>
              {weekEntries.length === 0 ? (
                <div style={{ color: '#aaa', fontSize: '12px' }}>No transactions yet.</div>
              ) : (
                weekEntries.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <span style={{ fontSize: '10px', color: '#aaccff', width: '30px' }}>MD{e.matchday}</span>
                    <span style={{ flex: 1, fontSize: '11px', color: '#e0e0ff' }}>{e.description}</span>
                    <span style={{ fontWeight: 'bold', fontSize: '12px', color: e.amount >= 0 ? '#88ff88' : '#ff8888' }}>
                      {e.amount >= 0 ? '+' : ''}£{e.amount.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '10px', color: '#aaa' }}>→£{e.running.toLocaleString()}</span>
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{label}</div>
        <div style={{ fontSize: '10px', color: '#666' }}>{sub}</div>
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: '48px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative',
        background: value ? '#006600' : '#808080', border: '2px solid #404040',
      }}>
        <div style={{ position: 'absolute', top: '2px', width: '16px', height: '16px', background: '#fff', borderRadius: '50%', transition: 'left 0.15s', left: value ? '26px' : '2px' }} />
      </button>
    </div>
  );
}
