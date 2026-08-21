export type ReasonCount = {
  label: string;
  count: number;
  rate?: number;
  answerDates?: string[];
};

export type TrafficFilter = "all" | "ad" | "exclude_ad";
export type AdSourceFilter = string;
export type DateBasis = "seminar" | "appointment" | "calendar";

export type StatusCount = {
  label: string;
  count: number;
  rate: number;
};

export type TeamMemberKpi = {
  memberKey: string;
  name: string;
  team: string;
  leads: number;
  futureAppointments: number;
  reservationSlots: number;
  seated: number;
  seatRate: number;
  closed: number;
  tokushinClosed: number;
  basicClosed: number;
  closeRate: number;
  pending: number;
  projected: number;
  projectedRate: number;
  hold: number;
  holdClosed: number;
  holdLost: number;
  holdConversionRate: number;
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

export type MemberWeeklyKpis = {
  memberKey: string;
  name: string;
  team: string;
  weeklyKpis: WeeklyKpi[];
  appointmentWeeklyKpis: WeeklyKpi[];
};

export type CustomerManagementRow = {
  member: string;
  team: string;
  seminar: string;
  appointmentDate: string;
  trafficRoute: string;
  inflow: string;
  seat: string;
  status: string;
  holdAnswerDate: string;
  paymentDate: string;
  contractPlan: string;
  lostReason: string;
  holdReason: string;
};

export type TeamSalesDashboardData = {
  updatedAt: string;
  source: "sheet" | "fallback";
  selectedSeminar: string;
  selectedTeam: string;
  selectedTraffic: TrafficFilter;
  selectedAdSource: AdSourceFilter;
  selectedDateBasis: DateBasis;
  selectedStartDate: string;
  selectedEndDate: string;
  seminars: string[];
  teams: string[];
  members: TeamMemberKpi[];
  lostReasons: ReasonCount[];
  holdReasons: ReasonCount[];
  statusMix: StatusCount[];
  weeklyKpis: WeeklyKpi[];
  appointmentWeeklyKpis: WeeklyKpi[];
  memberWeeklyKpis: MemberWeeklyKpis[];
  customerRows: CustomerManagementRow[];
  calendarRows: CustomerManagementRow[];
};

export const defaultTeamSalesDashboardData: TeamSalesDashboardData = {
  updatedAt: new Date().toISOString(),
  source: "fallback",
  selectedSeminar: "5月セミナー",
  selectedTeam: "全チーム",
  selectedTraffic: "all",
  selectedAdSource: "all",
  selectedDateBasis: "seminar",
  selectedStartDate: "",
  selectedEndDate: "",
  seminars: ["全期間", "5月セミナー"],
  teams: ["全チーム"],
  members: [],
  lostReasons: [],
  holdReasons: [],
  statusMix: [],
  weeklyKpis: [],
  appointmentWeeklyKpis: [],
  memberWeeklyKpis: [],
  customerRows: [],
  calendarRows: [],
};
