export type ReasonCount = {
  label: string;
  count: number;
};

export type StatusCount = {
  label: string;
  count: number;
  rate: number;
};

export type MemberKpi = {
  name: string;
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

export type SeminarDashboardData = {
  updatedAt: string;
  source: "sample" | "sheet" | "fallback";
  selectedSeminar: string;
  seminars: string[];
  members: MemberKpi[];
  lostReasons: ReasonCount[];
  holdReasons: ReasonCount[];
  statusMix: StatusCount[];
};

export const defaultDashboardData: SeminarDashboardData = {
  updatedAt: new Date().toISOString(),
  source: "sample",
  selectedSeminar: "26年5月セミナー",
  seminars: ["26年5月セミナー"],
  members: [
    {
      name: "和佐田舞緒",
      leads: 71,
      seated: 35,
      seatRate: 49.3,
      closed: 10,
      closeRate: 28.6,
      pending: 6,
      projected: 16,
      projectedRate: 45.7,
      hold: 9,
      alert: 1,
      lostReasons: [
        { label: "インスタ意欲あげれず", count: 5 },
        { label: "その他", count: 2 },
        { label: "金額アウト", count: 2 },
        { label: "他のスクール検討", count: 1 },
      ],
      holdReasons: [
        { label: "旦那相談", count: 4 },
        { label: "資金整理・入金時期待ち", count: 4 },
        { label: "開始時期を検討", count: 3 },
      ],
    },
    {
      name: "関口愛里",
      leads: 122,
      seated: 57,
      seatRate: 46.7,
      closed: 18,
      closeRate: 31.6,
      pending: 6,
      projected: 24,
      projectedRate: 42.1,
      hold: 5,
      alert: 2,
      lostReasons: [
        { label: "金額アウト", count: 9 },
        { label: "その他", count: 7 },
        { label: "第3者によるアウト", count: 6 },
        { label: "インスタ意欲あげれず", count: 2 },
        { label: "他のスクール検討", count: 2 },
      ],
      holdReasons: [
        { label: "旦那さんに相談", count: 4 },
        { label: "金額面で検討", count: 4 },
        { label: "会社の運用者に相談", count: 1 },
      ],
    },
    {
      name: "田仲由敬",
      leads: 96,
      seated: 52,
      seatRate: 54.2,
      closed: 19,
      closeRate: 36.5,
      pending: 0,
      projected: 19,
      projectedRate: 36.5,
      hold: 3,
      alert: 0,
      lostReasons: [
        { label: "金額アウト", count: 8 },
        { label: "その他", count: 5 },
        { label: "第3者によるアウト", count: 5 },
        { label: "SnsClubの良さ訴求できず", count: 3 },
        { label: "インスタ意欲あげれず", count: 3 },
      ],
      holdReasons: [
        { label: "再アポ・期日回答待ち", count: 5 },
        { label: "旦那/奥様相談", count: 3 },
        { label: "資金調達・支払い確認", count: 3 },
      ],
    },
    {
      name: "早川大貴",
      leads: 40,
      seated: 15,
      seatRate: 37.5,
      closed: 1,
      closeRate: 6.7,
      pending: 1,
      projected: 2,
      projectedRate: 13.3,
      hold: 0,
      alert: 1,
      lostReasons: [
        { label: "金額アウト", count: 5 },
        { label: "SnsClubの良さ訴求できず", count: 3 },
        { label: "インスタ意欲あげれず", count: 3 },
        { label: "その他", count: 2 },
      ],
      holdReasons: [
        { label: "他社面談予定", count: 1 },
        { label: "要旦那相談", count: 1 },
        { label: "契約書確認待ち", count: 1 },
      ],
    },
    {
      name: "河上まちこ",
      leads: 21,
      seated: 13,
      seatRate: 61.9,
      closed: 1,
      closeRate: 7.7,
      pending: 0,
      projected: 1,
      projectedRate: 7.7,
      hold: 2,
      alert: 0,
      lostReasons: [
        { label: "金額アウト", count: 5 },
        { label: "インスタ意欲あげれず", count: 2 },
        { label: "その他", count: 1 },
        { label: "カード枠足りない", count: 1 },
        { label: "第3者によるアウト", count: 1 },
      ],
      holdReasons: [
        { label: "開始時期を検討", count: 1 },
        { label: "支払い方法確認", count: 1 },
        { label: "回収見込みを確認", count: 1 },
      ],
    },
    {
      name: "加藤陸",
      leads: 51,
      seated: 31,
      seatRate: 60.8,
      closed: 6,
      closeRate: 19.4,
      pending: 0,
      projected: 6,
      projectedRate: 19.4,
      hold: 0,
      alert: 0,
      lostReasons: [
        { label: "インスタ意欲あげれず", count: 16 },
        { label: "SnsClubの良さ訴求できず", count: 4 },
        { label: "その他", count: 2 },
        { label: "金額アウト", count: 2 },
        { label: "第3者によるアウト", count: 1 },
      ],
      holdReasons: [{ label: "AI勉強会後に判断", count: 1 }],
    },
    {
      name: "持木玲那",
      leads: 0,
      seated: 0,
      seatRate: 0,
      closed: 0,
      closeRate: 0,
      pending: 0,
      projected: 0,
      projectedRate: 0,
      hold: 0,
      alert: 0,
      lostReasons: [],
      holdReasons: [],
    },
    {
      name: "笠松佑衣",
      leads: 43,
      seated: 23,
      seatRate: 53.5,
      closed: 9,
      closeRate: 39.1,
      pending: 0,
      projected: 9,
      projectedRate: 39.1,
      hold: 2,
      alert: 0,
      lostReasons: [
        { label: "インスタ意欲あげれず", count: 8 },
        { label: "その他", count: 3 },
        { label: "カード枠足りない", count: 1 },
      ],
      holdReasons: [
        { label: "即決はしたくない", count: 1 },
        { label: "彼女に相談", count: 1 },
      ],
    },
    {
      name: "五十嵐凌大",
      leads: 23,
      seated: 15,
      seatRate: 65.2,
      closed: 1,
      closeRate: 6.7,
      pending: 0,
      projected: 1,
      projectedRate: 6.7,
      hold: 1,
      alert: 0,
      lostReasons: [
        { label: "金額アウト", count: 6 },
        { label: "その他", count: 3 },
        { label: "第3者によるアウト", count: 2 },
        { label: "SnsClubの良さ訴求できず", count: 1 },
        { label: "インスタ意欲あげれず", count: 1 },
      ],
      holdReasons: [
        { label: "過去スクール経験で慎重", count: 2 },
        { label: "金額・支払い相談", count: 2 },
        { label: "再アポ/日程確認", count: 2 },
      ],
    },
    {
      name: "苙隼人",
      leads: 78,
      seated: 33,
      seatRate: 42.3,
      closed: 6,
      closeRate: 18.2,
      pending: 3,
      projected: 9,
      projectedRate: 27.3,
      hold: 5,
      alert: 1,
      lostReasons: [
        { label: "インスタ意欲あげれず", count: 11 },
        { label: "金額アウト", count: 5 },
        { label: "その他", count: 2 },
        { label: "第3者によるアウト", count: 1 },
      ],
      holdReasons: [
        { label: "期日回答待ち", count: 4 },
        { label: "旦那確認必須", count: 1 },
        { label: "過去スクール失敗で慎重", count: 1 },
      ],
    },
  ],
  lostReasons: [
    { label: "インスタ意欲あげれず", count: 51 },
    { label: "金額アウト", count: 42 },
    { label: "その他", count: 27 },
    { label: "第3者によるアウト", count: 16 },
    { label: "SnsClubの良さ訴求できず", count: 11 },
    { label: "他のスクール検討", count: 5 },
  ],
  holdReasons: [
    { label: "旦那/家族に相談", count: 13 },
    { label: "資金整理・支払い確認", count: 11 },
    { label: "再アポ・期日回答待ち", count: 10 },
    { label: "開始時期を検討", count: 5 },
    { label: "過去スクール経験で慎重", count: 3 },
  ],
  statusMix: [
    { label: "失注", count: 87, rate: 16.0 },
    { label: "保留→失注", count: 39, rate: 7.2 },
    { label: "成約", count: 32, rate: 5.9 },
    { label: "予定→成約", count: 31, rate: 5.7 },
    { label: "成約予定→失注", count: 29, rate: 5.3 },
    { label: "保留", count: 27, rate: 5.0 },
  ],
};
