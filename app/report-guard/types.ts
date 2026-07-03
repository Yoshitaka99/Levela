import type { CustomerRow, FalseReportRow } from "../false-report-checker/types";

export type { CustomerRow, FalseReportRow };

export type TriageState = "" | "ok" | "investigating" | "confirmed_false";

export type GuardAlert = {
  /** rowKey#rowIndex (行キーは重複予約で重複するため) */
  id: string;
  rowKey: string;
  rowIndex: number;
  customerName: string;
  staffName: string;
  seminar: string;
  interviewAt: string;
  interviewDate: string;
  /** auto=大元シート照合で検知 / manual=差分確認チェック */
  kind: "auto" | "manual";
  beforeStatus: string;
  afterStatus: string;
  /** 確認済みチェックが入った日時 (分かる場合のみ) */
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
