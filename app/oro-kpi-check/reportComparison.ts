import {
  COMPARED_METRIC_KEYS,
  METRIC_META,
  type MemberDifference,
  type MetricDifference,
  type OroKpiCheckData,
  type OroKpiMember,
} from "./data";

type ParsedMetrics = {
  reservations: number | null;
  seated: number | null;
  seatRate: number | null;
  closed: number | null;
  pending: number;
  closeRate: number | null;
};

type ReportSection = {
  heading: string;
  body: string;
};

function normalizeText(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

function normalizeName(value: string) {
  return value.replace(/[\s　]/g, "").replace(/髙/g, "高").trim();
}

function splitHeadingSections(text: string): ReportSection[] {
  const normalized = normalizeText(text);
  const matches = [...normalized.matchAll(/^##(?!#)\s*(.+?)\s*$/gm)];

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? normalized.length;
    return { heading: match[1], body: normalized.slice(start, end) };
  });
}

function findMemberSection(text: string, sections: ReportSection[], member: OroKpiMember, memberMentions: string[]) {
  const expectedNames = [member.displayName, member.fullName].map(normalizeName);
  const headingSection = sections.find((section) => {
    const heading = normalizeName(section.heading);
    return expectedNames.some((name) => heading === name || heading.includes(name)) || section.body.includes(member.discordMention);
  });
  if (headingSection) return headingSection.body;

  const normalized = normalizeText(text);
  const start = normalized.indexOf(member.discordMention);
  if (start < 0) return null;

  const nextMention = memberMentions.map((mention) => normalized.indexOf(mention, start + member.discordMention.length))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  return normalized.slice(start, nextMention ?? normalized.length);
}

function readNumber(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function parseMetrics(section: string): ParsedMetrics {
  const pendingExplicit = readNumber(section, /^\s*成約予定数\s*[:：]?\s*(-?[\d,]+(?:\.\d+)?)/m);
  const pendingInline = readNumber(section, /[（(]\s*(?:成約)?予定(?:数)?\s*[:：]?\s*(-?[\d,]+(?:\.\d+)?)/);

  return {
    reservations: readNumber(section, /^\s*予約数\s*[:：]?\s*(-?[\d,]+(?:\.\d+)?)/m),
    seated: readNumber(section, /^\s*着座数\s*[:：]?\s*(-?[\d,]+(?:\.\d+)?)/m),
    seatRate: readNumber(section, /^\s*着座率\s*[:：]?\s*(-?[\d,]+(?:\.\d+)?)/m),
    closed: readNumber(section, /^\s*成約数\s*[:：]?\s*(-?[\d,]+(?:\.\d+)?)/m),
    pending: pendingExplicit ?? pendingInline ?? 0,
    closeRate: readNumber(section, /^\s*成約率\s*[:：]?\s*(-?[\d,]+(?:\.\d+)?)/m),
  };
}

function roundDifference(value: number) {
  return Math.round(value * 10) / 10;
}

export function compareOroReport(data: OroKpiCheckData, reportText: string): MemberDifference[] {
  const sections = splitHeadingSections(reportText);
  const memberMentions = data.members.map((member) => member.discordMention);

  return data.members.reduce<MemberDifference[]>((membersWithDifferences, member) => {
    const section = findMemberSection(reportText, sections, member, memberMentions);
    if (!section) {
      membersWithDifferences.push({
        key: member.key,
        fullName: member.fullName,
        displayName: member.displayName,
        missingReport: true,
        differences: [],
      });
      return membersWithDifferences;
    }

    const reported = parseMetrics(section);
    const differences = COMPARED_METRIC_KEYS.reduce<MetricDifference[]>((mismatches, key) => {
      const expectedValue = member.metrics[key];
      const reportedValue = reported[key];
      if (reportedValue === null) {
        mismatches.push({
          key,
          label: METRIC_META[key].label,
          unit: METRIC_META[key].unit,
          expected: expectedValue,
          reported: null,
          difference: null,
        });
        return mismatches;
      }

      const difference = roundDifference(reportedValue - expectedValue);
      if (Math.abs(difference) < 0.05) return mismatches;
      mismatches.push({
        key,
        label: METRIC_META[key].label,
        unit: METRIC_META[key].unit,
        expected: expectedValue,
        reported: reportedValue,
        difference,
      });
      return mismatches;
    }, []);

    if (differences.length) {
      membersWithDifferences.push({
        key: member.key,
        fullName: member.fullName,
        displayName: member.displayName,
        missingReport: false,
        differences,
      });
    }
    return membersWithDifferences;
  }, []);
}
