export type CustomerRow = {
  rowNumber: number;
  confirmed: boolean;
  diffReviewed: boolean;
  customerName: string;
  ownerName: string;
  seminar: string;
  applicationDate: string;
  meetingDate: string;
  source: string;
  seatStatus: string;
  secondStatus: string;
  confirmedSeatStatus: string;
  confirmedSecondStatus: string;
  currentSeatStatus: string;
  currentSecondStatus: string;
  changed: boolean;
  rowKey: string;
};

export type FalseReportRow = {
  rowNumber: number;
  falseReport: string;
  correctReport: string;
  detectedAt: string;
  confirmedAt: string;
  memo: string;
  customerName: string;
  ownerName: string;
  seminar: string;
  seatStatus: string;
  secondStatus: string;
};

export type ProblemOkRow = {
  rowNumber: number;
  falseReport: string;
  correctReport: string;
  reflectedAt: string;
  handler: string;
  memo: string;
  customerName: string;
  ownerName: string;
  seminar: string;
  seatStatus: string;
  secondStatus: string;
  sourceRowNumber: string;
};

export type ReplyRow = {
  rowNumber: number;
  customerName: string;
  ownerName: string;
  seminar: string;
  replyAt: string;
  memo: string;
  messageDone: boolean;
  contacted: boolean;
  seatStatus: string;
  contractStatus: string;
  contactMemo: string;
};

export type FalseReportStats = {
  totalCustomers: number;
  confirmedCustomers: number;
  changedCustomers: number;
  unreviewedChanges: number;
  falseReports: number;
  problemOk: number;
  replies: number;
};

export type FalseReportData = {
  updatedAt: string;
  writeReady: boolean;
  source: "apps-script" | "public-csv";
  sheetsUrl: string;
  customers: CustomerRow[];
  falseReports: FalseReportRow[];
  problemOk: ProblemOkRow[];
  replies: ReplyRow[];
  stats: FalseReportStats;
  warning?: string;
};

export type DiffDecision = {
  rowNumber: number;
  decision: "ok" | "ng";
};

export type FalseReportAction =
  | {
      action: "setConfirmed";
      rowNumber: number;
      checked: boolean;
    }
  | {
      action: "setDiffReviewed";
      rowNumber: number;
      checked: boolean;
    }
  | {
      action: "saveFalseReportMemo";
      rowNumber: number;
      memo: string;
    }
  | {
      action: "updateReply";
      rowNumber: number;
      field: "messageDone" | "contacted" | "seatStatus" | "contractStatus" | "contactMemo";
      value: string | boolean;
    }
  | {
      action: "applyDiffDecisions";
      handler: string;
      decisions: DiffDecision[];
    };
