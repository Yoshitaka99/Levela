export type CustomerRow = {
  rowKey: string;
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
  confirmedStatus: string;
  currentStatus: string;
  changeDetected: boolean;
};

export type FalseReportRow = {
  rowIndex: number;
  rowKey: string;
  managementId: string;
  falseReport: string;
  correctReport: string;
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
