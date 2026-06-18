import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_MEMO_LENGTH = 20000;

type LifePlanOrganizedForm = {
  family: string;
  income: string;
  expenses: string;
  assets: string;
  education: string;
  idealsBeforeRetirement: string;
  retirement: string;
  strengths: string;
};

const emptyForm: LifePlanOrganizedForm = {
  family: "",
  income: "",
  expenses: "",
  assets: "",
  education: "",
  idealsBeforeRetirement: "",
  retirement: "",
  strengths: "",
};

const formKeys = Object.keys(emptyForm) as Array<keyof LifePlanOrganizedForm>;

function textModel() {
  return process.env.OPENAI_LIFE_PLAN_TEXT_MODEL
    || process.env.OPENAI_TEXT_MODEL
    || "gpt-4.1-mini";
}

function appendLine(
  form: LifePlanOrganizedForm,
  key: keyof LifePlanOrganizedForm,
  line: string,
) {
  form[key] = [form[key], line].filter(Boolean).join("\n");
}

function organizeLocally(memo: string) {
  const form = { ...emptyForm };
  const lines = memo
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (/(本人|配偶者|夫|妻|奥さん|旦那|子ども|こども|名前|氏名|歳|才|家族)/.test(line)) {
      appendLine(form, "family", line);
      continue;
    }

    if (/(収入|月収|年収|給与|給料|ボーナス|副業|仕事|働き方)/.test(line)) {
      appendLine(form, "income", line);
      continue;
    }

    if (/(支出|生活費|家賃|住宅ローン|ローン|車|保険|通信費|固定費|食費)/.test(line)) {
      appendLine(form, "expenses", line);
      continue;
    }

    if (/(貯金|預金|資産|NISA|ニーサ|iDeCo|積立|投資)/i.test(line)) {
      appendLine(form, "assets", line);
      continue;
    }

    if (/(教育|学校|公立|私立|習い事|塾|留学|進学|大学)/.test(line)) {
      appendLine(form, "education", line);
      continue;
    }

    if (/(老後|年金|退職|65歳|生活費|介護|孫)/.test(line)) {
      appendLine(form, "retirement", line);
      continue;
    }

    if (/(旅行|趣味|理想|叶えたい|暮らし|家族時間|やりたい)/.test(line)) {
      appendLine(form, "idealsBeforeRetirement", line);
      continue;
    }

    if (/(強み|得意|好き|経験|悩み|相談|褒め|挑戦|発信|Instagram|インスタ)/i.test(line)) {
      appendLine(form, "strengths", line);
      continue;
    }

    appendLine(form, "family", line);
  }

  return form;
}

function sanitizeForm(value: unknown): LifePlanOrganizedForm {
  if (!value || typeof value !== "object") return { ...emptyForm };

  const source = value as Record<string, unknown>;
  const form = { ...emptyForm };

  for (const key of formKeys) {
    const item = source[key];
    form[key] = typeof item === "string" ? item.trim() : "";
  }

  return form;
}

function parseJsonObject(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

async function organizeWithOpenAI(memo: string) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model: textModel(),
    input: [
      "あなたは日本語のライフプラン相談メモを整理するアシスタントです。",
      "営業担当が雑に聞き取ったメモを、画像生成プロンプトに使いやすい8項目へ分類してください。",
      "誤字脱字、順番の乱れ、話し言葉は自然に補正してください。",
      "事実を勝手に増やさず、不明なところは空欄か「要確認」にしてください。",
      "出力はJSONのみ。説明文、Markdown、コードブロックは禁止です。",
      "",
      "JSON schema:",
      JSON.stringify(emptyForm),
      "",
      "分類ルール:",
      "- family: お名前、本人年齢、配偶者年齢、子ども、家族構成、出産予定",
      "- income: 本人収入、配偶者収入、ボーナス、副業、今後の働き方",
      "- expenses: 生活費、家賃、住宅ローン、車、保険、固定費",
      "- assets: 貯金、NISA、iDeCo、保険積立、毎月の積立",
      "- education: 教育方針、公立私立、習い事、留学、進学、教育費の不安",
      "- idealsBeforeRetirement: 老後までにしたい旅行、家族時間、趣味、叶えたい暮らし",
      "- retirement: 老後、年金、退職後生活費、介護、子や孫に残したいこと",
      "- strengths: 経験、好きなこと、得意なこと、褒められたこと、悩み、発信テーマ",
      "",
      "相談メモ:",
      memo,
    ].join("\n"),
  });

  return sanitizeForm(parseJsonObject(response.output_text));
}

export async function POST(request: NextRequest) {
  let payload: { memo?: unknown };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const memo = typeof payload.memo === "string" ? payload.memo.trim() : "";

  if (!memo) {
    return NextResponse.json({ error: "メモを入力してください。" }, { status: 400 });
  }

  if (memo.length > MAX_MEMO_LENGTH) {
    return NextResponse.json(
      { error: `メモが長すぎます。${MAX_MEMO_LENGTH}文字以内にしてください。` },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      form: organizeLocally(memo),
      mode: "local",
    });
  }

  try {
    return NextResponse.json({
      form: await organizeWithOpenAI(memo),
      mode: "openai",
      model: textModel(),
    });
  } catch (error) {
    console.error("Life plan memo organization failed", error);

    return NextResponse.json({
      form: organizeLocally(memo),
      mode: "local",
      warning: "AI整理に失敗したため、簡易整理で反映しました。",
    });
  }
}
