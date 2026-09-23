import type { GameEvent } from '../types/game';

interface Props {
  event: GameEvent;
  onClose: () => void;
}

const kindStyles = {
  good:    { border: 'border-pitch-600', icon: '🎉', label: 'Good News', labelColor: 'text-pitch-400' },
  bad:     { border: 'border-red-700',   icon: '⚠️', label: 'Bad News',  labelColor: 'text-red-400' },
  neutral: { border: 'border-blue-700',  icon: 'ℹ️', label: 'News',      labelColor: 'text-blue-400' },
  funny:   { border: 'border-yellow-600',icon: '😅', label: 'Meanwhile...', labelColor: 'text-yellow-400' },
};

export function EventModal({ event, onClose }: Props) {
  const style = kindStyles[event.kind];
  const fmt = (n: number) => `£${Math.abs(n).toLocaleString()}`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`card max-w-md w-full p-6 border-2 ${style.border} shadow-2xl`}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{style.icon}</span>
          <span className={`text-sm font-semibold uppercase tracking-wider ${style.labelColor}`}>
            {style.label}
          </span>
        </div>

        <p className="text-slate-200 text-base leading-relaxed mb-5">{event.text}</p>

        {event.moneyEffect !== 0 && (
          <div className={`flex items-center gap-2 mb-5 p-3 rounded-lg ${event.moneyEffect > 0 ? 'bg-pitch-600/10 border border-pitch-700' : 'bg-red-900/20 border border-red-800/50'}`}>
            <span className={`text-xl font-bold ${event.moneyEffect > 0 ? 'text-pitch-400' : 'text-red-400'}`}>
              {event.moneyEffect > 0 ? '+' : '-'}{fmt(event.moneyEffect)}
            </span>
          </div>
        )}
        {event.pointsEffect !== 0 && (
          <div className="flex items-center gap-2 mb-5 p-3 rounded-lg bg-red-900/20 border border-red-800/50">
            <span className="text-xl font-bold text-red-400">{event.pointsEffect} pts</span>
          </div>
        )}

        <button className="btn-primary w-full" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}
