export type ReasonCount = {
  label: string;
  count: number;
  answerDates?: string[];
};

export type StatusCount = {
  label: string;
  count: number;
  rate: number;
};

export type TeamMemberKpi = {
  name: string;
  team: string;
  leads: number;
  seated: number;
  seatRate: number;
  closed: number;
  closeRate: number;
  pending: number;
  projected: number;
  projectedRate: number;
  hold: number;
  alert: number;
  lostReasons: ReasonCount[];
  holdReasons: ReasonCount[];
};

export type WeeklyKpi = {
  key: string;
  seminar: string;
  label: string;
  leads: number;
  seated: number;
  closed: number;
  pending: number;
  hold: number;
  paid: number;
  seatRate: number;
  closeRate: number;
  projectedRate: number;
  holdRate: number;
  paidRate: number;
};

export type TeamSalesDashboardData = {
  updatedAt: string;
  source: "sheet" | "fallback";
  selectedSeminar: string;
  selectedTeam: string;
  seminars: string[];
  teams: string[];
  members: TeamMemberKpi[];
  lostReasons: ReasonCount[];
  holdReasons: ReasonCount[];
  statusMix: StatusCount[];
  weeklyKpis: WeeklyKpi[];
};

export const defaultTeamSalesDashboardData: TeamSalesDashboardData = {
  updatedAt: new Date().toISOString(),
  source: "fallback",
  selectedSeminar: "5月セミナー",
  selectedTeam: "全チーム",
  seminars: ["全期間", "5月セミナー"],
  teams: ["全チーム"],
  members: [],
  lostReasons: [],
  holdReasons: [],
  statusMix: [],
  weeklyKpis: [],
};
