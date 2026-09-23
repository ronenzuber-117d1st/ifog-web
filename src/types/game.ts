export type Position = 'T' | 'V' | 'M' | 'S';
export type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '5-3-2' | '4-5-1';
export type GamePhase = 'menu' | 'select' | 'setup' | 'season' | 'matchday' | 'result';

export interface Player {
  id: string;
  name: string;
  position: Position;
  skill: number;
  age: number;
  injuredFor: number;   // matchdays remaining injured
  suspended: boolean;
  trainingProgress: number; // 0-5, resets on skill gain
}

export interface Team {
  id: number;
  name: string;
  managerName: string;
  baseSkill: number;
  color: string;
}

export interface TableRow {
  teamId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface Fixture {
  id: string;
  matchday: number;
  homeTeamId: number;
  awayTeamId: number;
  homeGoals?: number;
  awayGoals?: number;
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow' | 'red' | 'save';
  teamId: number;
  playerName: string;
}

export interface MatchReport {
  fixture: Fixture;
  events: MatchEvent[];
  manOfMatch: string;
}

export interface GameEvent {
  id: number;
  text: string;
  moneyEffect: number;
  pointsEffect: number;
  kind: 'good' | 'bad' | 'neutral' | 'funny';
}

export interface FinanceEntry {
  matchday: number;
  description: string;
  amount: number;
  running: number;
}
