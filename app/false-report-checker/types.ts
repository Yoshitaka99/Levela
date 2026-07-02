export type CustomerRow = {
  rowIndex: number;
  rowKey: string;
  managementId: string;
  confirmed: boolean;
  diffConfirmed: boolean;
  customerName: string;
  staffName: string;
  seminar: string;
  appliedAt: string;
  interviewAt: string;
  inflow: string;
  seated: string;
  status: string;
  plan: string;
  /** 確認済みチェック時点のステータス (チェック管理 > 確認済みタブ > 確認チェックタブの優先順) */
  confirmedStatus: string;
  /** 大元シートの現在ステータス (リアルタイム)。管理IDが無い行は軽量版の値 */
  currentStatus: string;
  /** 確認済みチェック後に大元シートのステータスが変わった (虚偽報告候補) */
  changeDetected: boolean;
};

export type FalseReportRow = {
  rowIndex: number;
  rowKey: string;
  managementId: string;
  falseReport: string;
  correctReport: string;
  /** 確認済みチェック時点のステータス (スナップショット結合) */
  confirmedStatus: string;
  /** 大元シートの現在ステータス (リアルタイム) */
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

export type ReplyRow = {
  rowIndex: number;
  appliedAt: string;
  appliedAtRaw: string;
  interviewDate: string;
  slot: string;
  customerName: string;
  salesman: string;
  hasMessage: boolean;
  contacted: boolean;
  status: string;
  contractStatus: string;
  memo: string;
};

export type FalseReportCheckerData = {
  updatedAt: string;
  writeEnabled: boolean;
  customers: CustomerRow[];
  falseReports: FalseReportRow[];
  replies: ReplyRow[];
};
