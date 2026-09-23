import { useGameStore } from '../store/useGameStore';
import { Layout } from '../components/Layout';
import { StatCard } from '../components/StatCard';
import { TICKET_TYPES, TICKET_PRICE_PRESETS, calcMatchRevenue, WAGES_PER_MATCHDAY, FOOD_REVENUE_PER_MATCH, MERCH_REVENUE_PER_MATCH } from '../data/finances';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function Finances() {
  const {
    balance, financeHistory, priceLevel, foodEnabled, merchandiseEnabled,
    setPriceLevel, setFoodEnabled, setMerchandiseEnabled,
  } = useGameStore();

  const homeRevenue = calcMatchRevenue(true, priceLevel, foodEnabled, merchandiseEnabled);
  const netHome = homeRevenue - WAGES_PER_MATCHDAY;
  const netAway = -WAGES_PER_MATCHDAY;
  const prices = TICKET_PRICE_PRESETS[priceLevel];

  const recent = [...financeHistory].reverse().slice(0, 10);

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-white">Finances</h2>

        {/* Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="Current Balance"
            value={`£${(balance / 1_000_000).toFixed(3)}M`}
            accent={balance >= 0}
            className="col-span-2 sm:col-span-1"
          />
          <StatCard label="Home Match Net" value={`${netHome >= 0 ? '+' : ''}£${(netHome / 1000).toFixed(0)}K`} accent={netHome >= 0} />
          <StatCard label="Away Match Net" value={`£${(netAway / 1000).toFixed(0)}K`} />
        </div>

        {/* Settings */}
        <div className="card p-5 space-y-5">
          <h3 className="font-semibold text-white">Revenue Settings</h3>

          {/* Ticket pricing */}
          <div>
            <div className="text-sm text-slate-400 mb-2">Ticket Pricing</div>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setPriceLevel(level)}
                  className={`py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                    priceLevel === level
                      ? 'border-pitch-500 bg-pitch-600/15 text-pitch-400'
                      : 'border-surface-600 text-slate-400 hover:border-surface-500'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1">
              {TICKET_TYPES.map((t, i) => (
                <div key={t.name} className="flex justify-between text-xs text-slate-400">
                  <span>{t.name}</span>
                  <span className="text-slate-300">£{prices[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <Toggle
              label="Food Stand"
              sub={`+£${(FOOD_REVENUE_PER_MATCH / 1000).toFixed(0)}K per home match`}
              enabled={foodEnabled}
              onChange={setFoodEnabled}
            />
            <Toggle
              label="Club Shop"
              sub={`+£${(MERCH_REVENUE_PER_MATCH / 1000).toFixed(0)}K per home match`}
              enabled={merchandiseEnabled}
              onChange={setMerchandiseEnabled}
            />
          </div>
        </div>

        {/* Estimated income */}
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-3">Estimated Home Match Revenue</h3>
          <div className="space-y-2 text-sm">
            <Line label="Ticket sales" value={calcMatchRevenue(true, priceLevel, false, false)} />
            {foodEnabled && <Line label="Food stand" value={FOOD_REVENUE_PER_MATCH} />}
            {merchandiseEnabled && <Line label="Club shop" value={MERCH_REVENUE_PER_MATCH} />}
            <div className="border-t border-surface-700 pt-2 flex justify-between font-semibold text-white">
              <span>Gross revenue</span>
              <span className="text-pitch-400">£{homeRevenue.toLocaleString()}</span>
            </div>
            <Line label="Player wages" value={-WAGES_PER_MATCHDAY} />
            <div className="border-t border-surface-700 pt-2 flex justify-between font-semibold">
              <span className="text-slate-300">Net per home match</span>
              <span className={netHome >= 0 ? 'text-pitch-400' : 'text-red-400'}>
                {netHome >= 0 ? '+' : ''}£{netHome.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* History */}
        {recent.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-3">Recent Transactions</h3>
            <div className="space-y-2">
              {recent.map((e, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${e.amount >= 0 ? 'bg-pitch-700/50' : 'bg-red-900/50'}`}>
                    {e.amount >= 0
                      ? <TrendingUp size={11} className="text-pitch-400" />
                      : <TrendingDown size={11} className="text-red-400" />}
                  </div>
                  <span className="text-slate-400 text-xs w-16">MD {e.matchday}</span>
                  <span className="text-slate-300 flex-1">{e.description}</span>
                  <span className={`font-mono font-semibold ${e.amount >= 0 ? 'text-pitch-400' : 'text-red-400'}`}>
                    {e.amount >= 0 ? '+' : ''}£{Math.abs(e.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Toggle({ label, sub, enabled, onChange }: { label: string; sub: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-slate-200">{label}</div>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-pitch-600' : 'bg-surface-600'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-slate-400">
      <span>{label}</span>
      <span className={value >= 0 ? 'text-slate-300' : 'text-red-400'}>
        {value >= 0 ? '' : '-'}£{Math.abs(value).toLocaleString()}
      </span>
    </div>
  );
}
