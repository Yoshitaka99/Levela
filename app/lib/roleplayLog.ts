export const roleplayScopeOptions = [
  { value: "full", label: "すべて実施" },
  { value: "selfIntroFrom", label: "自己紹介から" },
  { value: "selfIntroOnly", label: "自己紹介のみ" },
  { value: "authorityFrom", label: "権威性から" },
  { value: "authorityOnly", label: "権威性のみ" },
  { value: "hearingFrom", label: "ヒアリングから" },
  { value: "hearingUntil", label: "ヒアリングまで" },
  { value: "hearing", label: "ヒアリングのみ" },
  { value: "accountProposal", label: "アカウント提案まで" },
  { value: "accountProposalOnly", label: "アカウント提案のみ" },
  { value: "priceProposal", label: "料金提案まで" },
  { value: "closingOnly", label: "クロージングのみ" },
  { value: "contractWork", label: "契約作業まで" },
  { value: "contractOnly", label: "契約作業のみ" },
] as const;

export type RoleplayScope = (typeof roleplayScopeOptions)[number]["value"];

export type RoleplayPairDirection = "single" | "primary" | "reversed";

export type RoleplayRecord = {
  id: string;
  submittedAt: string;
  sessionDate: string;
  sellerName: string;
  customerName: string;
  scope: string;
  scopeLabel: string;
  scopes: RoleplayScope[];
  scopeLabels: string[];
  note: string;
  pairSessionId: string;
  pairDirection: RoleplayPairDirection;
};

const rawRoleplayMembers = [
  "苙隼人",
  "田仲由敬",
  "河上まちこ",
  "折原加純",
  "佐々木爽",
  "長谷川小夏",
  "関口愛里",
  "鈴木里果",
  "杉山ふうか",
  "中島絵美",
  "高橋礼菜",
  "高橋健太",
  "和佐田舞緒",
  "大谷みくに",
  "栗原日向子",
  "木原桃香",
  "小牟田早智",
  "木村知代",
  "遠藤羽琉",
  "加藤陸",
  "水野王羅",
  "藤田吉陽",
  "坂口武蔵",
  "久田翔太",
  "佐々木将城",
  "杉井友紀",
  "稲波杏奈",
  "西岡駿",
  "横山英輝",
  "橋口陽香里",
  "上村勇人",
  "岡崎未来代",
  "仲戸茶子",
  "須見浩人",
  "野嶋一樹",
  "三浦拓迪",
  "笠松佑衣",
  "持木玲那",
  "持木紀哉",
  "田中悠喜",
  "野中碧",
  "五十嵐凌大",
  "田口亮太",
  "早川大貴",
  "佐藤ひなた",
  "根本義暉",
  "小室瑠生",
  "木村麻那",
  "石田竜一",
  "星野譲治",
  "深見美幸",
];

export const roleplayMembers = Array.from(
  new Set(rawRoleplayMembers.map((name) => normalizeRoleplayMemberName(name))),
);

export function normalizeRoleplayMemberName(value: string) {
  return value.replace(/\s+/g, "").trim();
}

export function isRoleplayMember(value: string) {
  const normalized = normalizeRoleplayMemberName(value);
  return roleplayMembers.includes(normalized);
}

export function isRoleplayScope(value: string): value is RoleplayScope {
  return roleplayScopeOptions.some((option) => option.value === value);
}

export function getRoleplayScopeLabel(value: RoleplayScope) {
  return roleplayScopeOptions.find((option) => option.value === value)?.label ?? value;
}

export function normalizeRoleplayScopes(value: unknown): RoleplayScope[] {
  const values = Array.isArray(value)
    ? value
    : String(value ?? "")
        .split(",")
        .map((item) => item.trim());

  return Array.from(new Set(values.filter((item): item is RoleplayScope => isRoleplayScope(String(item)))));
}

export function getRoleplayScopeLabels(values: RoleplayScope[]) {
  return values.map((value) => getRoleplayScopeLabel(value));
}

export function getRoleplayScopeText(values: RoleplayScope[]) {
  return getRoleplayScopeLabels(values).join(" / ");
}
