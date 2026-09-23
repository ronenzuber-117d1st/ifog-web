interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  className?: string;
}

export function StatCard({ label, value, sub, accent, className = '' }: Props) {
  return (
    <div className={`card p-4 flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${accent ? 'text-pitch-500' : 'text-white'}`}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}
