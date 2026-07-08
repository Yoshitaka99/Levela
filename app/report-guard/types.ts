export type CustomerRow = {
  rowIndex: number;
  rowKey: string;
  confirmed: boolean;
  diffConfirmed: boolean;
  customerName: string;
  staffName: string;
  seminar: string;
  appliedAt: string;
  interviewAt: string;
  interviewDate: string;
  seated: string;
  status: string;
  plan: string;
  confirmedStatus: string;
  currentStatus: string;
  changeDetected: boolean;
};

export type FalseReportRow = {
  rowIndex: number;
  rowKey: string;
  managementId: string;
  legacy: boolean;
  falseReport: string;
  correctReport: string;
  confirmedStatus: string;
  currentStatus: string;
  confirmedAt: string;
  detectedAt: string;
  memo: string;
  customerName: string;
  staffName: string;
  seminar: string;
  appliedAt: string;
  interviewAt: string;
  seated: string;
  status: string;
};

export type TriageState = "" | "ok" | "investigating" | "confirmed_false";

export type GuardAlert = {
  /** rowKey#rowIndex */
  id: string;
  rowKey: string;
  rowIndex: number;
  customerName: string;
  staffName: string;
  seminar: string;
  interviewAt: string;
  interviewDate: string;
  /** auto=master sheet difference / manual=diff checkbox */
  kind: "auto" | "manual";
  beforeStatus: string;
  afterStatus: string;
  confirmedAt: string;
  triage: TriageState;
  triageMemo: string;
};

export type ReportGuardData = {
  updatedAt: string;
  writeEnabled: boolean;
  alerts: GuardAlert[];
  customers: CustomerRow[];
  falseReports: FalseReportRow[];
};
