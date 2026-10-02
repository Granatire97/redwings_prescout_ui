export type Confidence = "high" | "medium" | "low";
export type KeyStatUnit = "pct" | "count" | "signed" | "seconds" | "per60";

/** Percentage values stored in Stat objects are decimals from 0 to 1. */
export interface Stat<T> {
  value: T;
  sampleSize: number;
  confidence: Confidence;
  isEstimate?: boolean;
}

export interface Team {
  teamId: number;
  code: string;
  name: string;
}

export interface Player {
  playerId: number;
  name: string;
  position: string;
}

export interface RinkPoint {
  x: number;
  y: number;
  xg: number;
}

export interface TrendPoint {
  label: string;
  value: Stat<number>;
}

export interface PlayerLineupEntry {
  player: Player;
  /** Seconds. */
  toiLast5: number;
  /** Seconds. */
  toiSeason: number;
}

export interface SummaryData {
  record: { wins: number; losses: number; otLosses: number };
  lastTen: { wins: number; losses: number; otLosses: number };
  restDays: number;
  backToBack: boolean;
  keys: Array<{
    title: string;
    insight: string;
    stat: Stat<number> & {
      label: string;
      unit: KeyStatUnit;
    };
  }>;
  forwardLines: PlayerLineupEntry[][];
  defensePairs: PlayerLineupEntry[][];
  goalie: {
    player: Player;
    savePct: Stat<number>;
    lastTenSavePct: Stat<number>;
    startConfidence: "confirmed" | "likely" | "uncertain";
    isEstimate?: boolean;
  };
  powerPlay: Stat<number>;
  powerPlayRank: number;
  penaltyKill: Stat<number>;
  penaltyKillRank: number;
  videoChecks: string[];
}

export interface SpecialTeamsData {
  powerPlayUnits: Array<{ name: string; players: Player[] }>;
  shotMap: RinkPoint[];
  zoneTimePct: Stat<number>;
  leagueZoneTimePct: Stat<number>;
  penalties: Array<{
    player: Player;
    taken: number;
    drawn: number;
    byPeriod: { p1: number; p2: number; p3: number; ot: number };
  }>;
  videoChecks: string[];
}

export interface FaceoffsData {
  centers: Array<{
    player: Player;
    overall: Stat<number>;
    offensiveZone: Stat<number>;
    neutralZone: Stat<number>;
    defensiveZone: Stat<number>;
    evenStrength: Stat<number>;
    powerPlay: Stat<number>;
    penaltyKill: Stat<number>;
  }>;
  detroitCenters: Player[];
  matchupMatrix: Array<{
    opponentPlayerId: number;
    detroitPlayerId: number;
    winPct: Stat<number>;
  }>;
  postWinShotAttempts: Stat<number>;
  videoChecks: string[];
}

export type GoalieZoneId = "high_danger" | "mid_range" | "long_range";

export interface GoalieData {
  player: Player;
  zones: Array<{ zoneId: GoalieZoneId; savePct: Stat<number> }>;
  lastTen: TrendPoint[];
  shotTypes: Array<{ type: string; savePct: Stat<number> }>;
  videoChecks: string[];
}

export interface GameStateData {
  shotRates: Array<{
    state: "leading" | "tied" | "trailing";
    for: Stat<number>;
    against: Stat<number>;
  }>;
  goalsByPeriod: Array<{
    period: "p1" | "p2" | "p3" | "ot";
    for: number;
    against: number;
  }>;
  /** Seconds remaining in regulation. */
  emptyNetPull: number;
  /** Seconds remaining in regulation. */
  leagueEmptyNetPull: number;
  videoChecks: string[];
}

export interface PlayerTargetsData {
  pressure: Array<{
    player: Player;
    giveaways: number;
    forecheckNote: string;
  }>;
  watch: Array<{
    player: Player;
    /** Miles per hour. */
    topSpeed: number;
    /** Miles per hour. */
    shotSpeed: number;
    threatNote: string;
  }>;
  videoChecks: string[];
}

export interface GmSummaryData {
  sustainability: {
    shootingPct: Stat<number>;
    expectedShootingPct: Stat<number>;
    savePct: Stat<number>;
    expectedSavePct: Stat<number>;
    pdo: Stat<number>;
    expectedPdo: Stat<number>;
    regressionFlag: "positive" | "neutral" | "negative";
  };
  videoChecks: string[];
}

export interface RosterChangesData {
  changes: Array<{
    date: string;
    player: Player;
    change: "in" | "out";
    detail: string;
    status: "healthy_scratch" | "injury_inferred" | "call_up" | "trade" | "unknown";
    isEstimate?: boolean;
  }>;
}

export interface StandingsData {
  pointsPace: number;
  pointsPaceIsEstimate?: boolean;
  playoffGap: number;
  opponentMeaning: string;
  detroitMeaning: string;
}

export interface HeadToHeadData {
  meetings: Array<{
    season: string;
    date: string;
    result: string;
    shots: { opponent: number; detroit: number };
    expectedGoals: { opponent: number; detroit: number; isEstimate?: boolean };
    specialTeams: {
      opponentGoals: number;
      opponentOpportunities: number;
      detroitGoals: number;
      detroitOpportunities: number;
    };
  }>;
}

export interface GmPlayer {
  player: Player;
  age: number;
  toi: {
    /** Seconds. */
    evenStrength: number;
    /** Seconds. */
    powerPlay: number;
    /** Seconds. */
    penaltyKill: number;
  };
  zoneStarts: Stat<number>;
  onIceGoalsPct: Stat<number>;
  onIceExpectedGoalsPct: Stat<number>;
  /** Miles per hour. */
  topSpeed: number;
  /** Miles per hour. */
  shotSpeed: number;
  shotMap: RinkPoint[];
  notes: string;
}

export interface PrescoutData {
  meta: {
    schemaVersion: "1.0.0";
    generatedAt: string;
    team: Team;
    opponent: Team;
    gameDate: string;
    homeAway: "home" | "away";
    dataThroughDate: string;
  };
  coach: {
    summary: SummaryData | null;
    specialTeams: SpecialTeamsData | null;
    faceoffs: FaceoffsData | null;
    goalie: GoalieData | null;
    gameState: GameStateData | null;
    playerTargets: PlayerTargetsData | null;
  };
  gm: {
    summary: GmSummaryData | null;
    rosterChanges: RosterChangesData | null;
    standings: StandingsData | null;
    headToHead: HeadToHeadData | null;
    players: GmPlayer[] | null;
  };
}
