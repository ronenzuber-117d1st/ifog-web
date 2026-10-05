export interface BoardStyle {
  bg: string; fg: string; ac: string;
  font: string; fw: number; ls: string; tt: string; fi: string;
  pre: string; text: string; post: string;
}

export const BOARD_STYLES: Record<string, BoardStyle> = {
  'FootballHub':      { bg: '#1d4ed8', fg: '#ffffff', ac: '#facc15', font: "'Russo One', sans-serif", fw: 400, ls: '0.12em', tt: 'uppercase', fi: 'normal', pre: '●', text: 'FootballHub', post: '' },
  'SportsBet Pro':    { bg: 'repeating-linear-gradient(135deg, #0b0b0b 0 14px, #1d1d1d 14px 28px)', fg: '#facc15', ac: '#ffffff', font: "'Big Shoulders Display', Impact, sans-serif", fw: 900, ls: '0.06em', tt: 'uppercase', fi: 'italic', pre: '', text: 'SportsBet Pro', post: 'BET SMART' },
  'Grub Club':        { bg: '#f97316', fg: '#1c0a00', ac: '#ffffff', font: "'Bangers', cursive", fw: 400, ls: '0.08em', tt: 'uppercase', fi: 'normal', pre: '', text: 'Grub Club', post: 'EAT UP!' },
  'Turbo Tyres':      { bg: 'linear-gradient(90deg, #0b0b0b 0 16px, #dc2626 16px calc(100% - 16px), #0b0b0b calc(100% - 16px))', fg: '#ffffff', ac: '#0b0b0b', font: "'Russo One', sans-serif", fw: 400, ls: '0.04em', tt: 'uppercase', fi: 'italic', pre: '»»', text: 'Turbo Tyres', post: '' },
  'Lucky Duck Bingo': { bg: '#fde047', fg: '#be185d', ac: '#be185d', font: "'Pacifico', cursive", fw: 400, ls: '0', tt: 'none', fi: 'normal', pre: '★', text: 'Lucky Duck Bingo', post: '' },
  'Mega Mop':         { bg: '#0d9488', fg: '#ffffff', ac: '#99f6e4', font: "'Bungee', sans-serif", fw: 400, ls: '0.04em', tt: 'uppercase', fi: 'normal', pre: '', text: 'Mega Mop', post: 'SQUEAKY CLEAN' },
  'Fizzle Pop':       { bg: 'radial-gradient(circle, rgba(255,255,255,0.28) 2px, transparent 3px) 0 0 / 18px 18px, #7c3aed', fg: '#ffffff', ac: '#fde047', font: "'Bangers', cursive", fw: 400, ls: '0.1em', tt: 'uppercase', fi: 'normal', pre: '', text: 'Fizzle Pop!', post: '' },
};

export const BOARD_EMPTY: BoardStyle = {
  bg: 'repeating-linear-gradient(135deg, #141a2a 0 10px, #181f31 10px 20px)',
  fg: 'rgba(255,255,255,0.35)', ac: 'transparent',
  font: "'JetBrains Mono', monospace", fi: 'normal', fw: 700, ls: '0.2em', tt: 'uppercase',
  pre: '', text: 'Your ad here', post: '',
};

export const BORDER_COMPANIES = Object.keys(BOARD_STYLES);
