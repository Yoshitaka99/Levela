export type ReasonCount = {
  label: string;
  count: number;
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
};

export const defaultTeamSalesDashboardData: TeamSalesDashboardData = {
  updatedAt: new Date().toISOString(),
  source: "fallback",
  selectedSeminar: "5月セミナー",
  selectedTeam: "全チーム",
  seminars: ["5月セミナー"],
  teams: ["全チーム"],
  members: [],
  lostReasons: [],
  holdReasons: [],
  statusMix: [],
};
