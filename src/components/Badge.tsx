import type { Team } from '../types/game';

interface Props {
  team: Team;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm:  'w-8 h-8',
  md:  'w-12 h-12',
  lg:  'w-16 h-16',
  xl:  'w-24 h-24',
};

export function Badge({ team, size = 'md' }: Props) {
  const src = `/images/wappen${String(team.id).padStart(2, '0')}.png`;
  const initials = team.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className={`${sizes[size]} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center`}
      style={{ backgroundColor: `${team.color}33`, border: `2px solid ${team.color}66` }}
    >
      <img
        src={src}
        alt={team.name}
        className="w-full h-full object-contain p-0.5"
        onError={e => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
          (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
        }}
      />
      <span
        className="hidden w-full h-full items-center justify-center text-white font-bold text-xs"
        style={{ backgroundColor: team.color }}
      >
        {initials}
      </span>
    </div>
  );
}
