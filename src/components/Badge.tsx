import type { Team } from '../types/game';

interface Props {
  team: Team;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' };

export function Badge({ team, size = 'md' }: Props) {
  const initials = team.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ backgroundColor: team.color, boxShadow: `0 0 12px ${team.color}55` }}
    >
      {initials}
    </div>
  );
}
