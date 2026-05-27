"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "trainee" | "trainer";

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isBench: boolean;
  active: boolean;
  assignedCount: number;
};

type Booking = {
  id: string;
  traineeName: string;
  traineeEmail: string;
  trainerName: string;
  trainerEmail: string;
  usedBench: boolean;
  start: string;
  end: string;
  title: string;
  calendarUrl: string;
  createdAt: string;
};

const STORAGE_MEMBERS = "orochi-roleplay-members-v1";
const STORAGE_BOOKINGS = "orochi-roleplay-bookings-v1";

const initialMembers: Member[] = [
  {
    id: "sample-trainer-1",
    name: "対応メンバーA",
    email: "trainer-a@example.com",
    role: "trainer",
    isBench: false,
    active: true,
    assignedCount: 0,
  },
  {
    id: "sample-bench-1",
    name: "ベンチメンバーB",
    email: "bench-b@example.com",
    role: "trainer",
    isBench: true,
    active: true,
    assignedCount: 0,
  },
  {
    id: "sample-trainee-1",
    name: "受けたいメンバーC",
    email: "trainee-c@example.com",
    role: "trainee",
    isBench: false,
    active: true,
    assignedCount: 0,
  },
];

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function addMinutes(value: string, minutes: number) {
  return toLocalInputValue(new Date(new Date(value).getTime() + minutes * 60_000));
}

function formatGoogleDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildGoogleCalendarUrl(params: {
  title: string;
  start: string;
  end: string;
  details: string;
  attendees: string[];
}) {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", params.title);
  url.searchParams.set("dates", `${formatGoogleDate(params.start)}/${formatGoogleDate(params.end)}`);
  url.searchParams.set("details", params.details);
  url.searchParams.set("add", params.attendees.join(","));
  return url.toString();
}

function guessName(email: string) {
  return email.split("@")[0]?.replace(/[._-]+/g, " ") || "メンバー";
}

function makeId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function RoleplayPage() {
  const [members, setMembers] = useState<Member[]>(() => {
    if (typeof window === "undefined") return initialMembers;
    const saved = window.localStorage.getItem(STORAGE_MEMBERS);
    return saved ? JSON.parse(saved) : initialMembers;
  });
  const [bookings, setBookings] = useState<Booking[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = window.localStorage.getItem(STORAGE_BOOKINGS);
    return saved ? JSON.parse(saved) : [];
  });
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkRole, setBulkRole] = useState<Role>("trainer");
  const [bulkBench, setBulkBench] = useState(false);
  const [traineeEmail, setTraineeEmail] = useState("trainee-c@example.com");
  const [traineeName, setTraineeName] = useState("受けたいメンバーC");
  const [start, setStart] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(10, 0, 0, 0);
    return toLocalInputValue(date);
  });
  const [duration, setDuration] = useState(30);
  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_MEMBERS, JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(STORAGE_BOOKINGS, JSON.stringify(bookings));
  }, [bookings]);

  const trainers = useMemo(
    () => members.filter((member) => member.active && member.role === "trainer"),
    [members]
  );

  const trainees = useMemo(
    () => members.filter((member) => member.active && member.role === "trainee"),
    [members]
  );

  const nextSlots = useMemo(() => {
    const slots: string[] = [];
    const now = new Date();
    for (let day = 0; day < 7; day += 1) {
      const base = new Date(now);
      base.setDate(now.getDate() + day);
      const weekday = base.getDay();
      if (weekday === 0 || weekday === 6) continue;
      for (const hour of [10, 11, 13, 14, 15, 16, 17]) {
        const slot = new Date(base);
        slot.setHours(hour, 0, 0, 0);
        if (slot > now) slots.push(toLocalInputValue(slot));
      }
    }
    return slots.slice(0, 18);
  }, []);

  function addBulkMembers() {
    const emails = bulkEmails
      .split(/[\n,\s]+/)
      .map((email) => email.trim().toLowerCase())
      .filter((email) => /.+@.+\..+/.test(email));

    if (emails.length === 0) {
      setMessage("有効なメールアドレスを入力してください。");
      return;
    }

    setMembers((current) => {
      const existing = new Set(current.map((member) => member.email.toLowerCase()));
      const additions = emails
        .filter((email) => !existing.has(email))
        .map<Member>((email) => ({
          id: makeId("member"),
          name: guessName(email),
          email,
          role: bulkRole,
          isBench: bulkRole === "trainer" ? bulkBench : false,
          active: true,
          assignedCount: 0,
        }));
      return [...current, ...additions];
    });

    setBulkEmails("");
    setMessage(`${emails.length}件のメールを読み込みました。重複は自動で除外します。`);
  }

  function updateMember(id: string, patch: Partial<Member>) {
    setMembers((current) => current.map((member) => (member.id === id ? { ...member, ...patch } : member)));
  }

  function removeMember(id: string) {
    setMembers((current) => current.filter((member) => member.id !== id));
  }

  function createBooking() {
    const available = trainers.filter((member) => member.email.toLowerCase() !== traineeEmail.toLowerCase());
    const normal = available.filter((member) => !member.isBench).sort((a, b) => a.assignedCount - b.assignedCount);
    const bench = available.filter((member) => member.isBench).sort((a, b) => a.assignedCount - b.assignedCount);
    const trainer = normal[0] ?? bench[0];

    if (!trainer) {
      setMessage("対応できるメンバーがいません。まず『受けれる側』を登録してください。");
      return;
    }

    const end = addMinutes(start, duration);
    const title = `ロープレ：${traineeName || guessName(traineeEmail)} × ${trainer.name}`;
    const details = [
      "オロチームのロープレ予約です。",
      `受けたい側：${traineeName || guessName(traineeEmail)} <${traineeEmail}>`,
      `対応側：${trainer.name} <${trainer.email}>`,
      trainer.isBench ? "ベンチメンバーから自動アサインされました。" : "通常対応メンバーから自動アサインされました。",
      "必要に応じてGoogle Meetを追加してください。",
    ].join("\n");

    const booking: Booking = {
      id: makeId("booking"),
      traineeName: traineeName || guessName(traineeEmail),
      traineeEmail,
      trainerName: trainer.name,
      trainerEmail: trainer.email,
      usedBench: trainer.isBench,
      start,
      end,
      title,
      details,
      calendarUrl: buildGoogleCalendarUrl({
        title,
        start,
        end,
        details,
        attendees: [traineeEmail, trainer.email],
      }),
      createdAt: new Date().toISOString(),
    } as Booking & { details: string };

    setBookings((current) => [booking, ...current]);
    setMembers((current) =>
      current.map((member) =>
        member.id === trainer.id ? { ...member, assignedCount: member.assignedCount + 1 } : member
      )
    );
    setMessage(`${trainer.name}さんを${trainer.isBench ? "ベンチから" : "通常枠から"}自動アサインしました。`);
    window.open(booking.calendarUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 pb-20 pt-24 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/15 via-white/[0.04] to-black p-6 shadow-2xl shadow-orange-950/30 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-3 inline-flex rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-200">
                オロチーム・ロープレ自動予約MVP
              </p>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                メールを登録して、ワンクリックでロープレ枠を作る
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 md:text-base">
                受けたい側・受けれる側・ベンチメンバーを分けて管理し、予約ボタンを押すと最適な対応者を自動選定します。現段階ではGoogleカレンダー作成リンクを開き、次段階でCalendar APIによる完全自動作成にできます。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="受けたい側" value={trainees.length} />
              <Stat label="受けれる側" value={trainers.filter((m) => !m.isBench).length} />
              <Stat label="ベンチ" value={trainers.filter((m) => m.isBench).length} />
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
            <h2 className="text-xl font-bold">1. メールアドレス登録</h2>
            <p className="mt-2 text-sm text-zinc-400">
              メールだけ貼り付ければOKです。名前はメール前半から仮作成し、あとで修正できます。
            </p>
            <textarea
              value={bulkEmails}
              onChange={(event) => setBulkEmails(event.target.value)}
              placeholder="例：
yamada@example.com
sato@example.com
bench@example.com"
              className="mt-4 h-32 w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-sm outline-none ring-orange-500/40 placeholder:text-zinc-600 focus:ring-2"
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={bulkRole}
                onChange={(event) => setBulkRole(event.target.value as Role)}
                className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"
              >
                <option value="trainer">受けれる側</option>
                <option value="trainee">受けたい側</option>
              </select>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={bulkBench}
                  disabled={bulkRole !== "trainer"}
                  onChange={(event) => setBulkBench(event.target.checked)}
                />
                ベンチメンバーとして登録
              </label>
              <button
                onClick={addBulkMembers}
                className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/40 transition hover:bg-orange-400"
              >
                登録する
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
            <h2 className="text-xl font-bold">2. 予約フォーム</h2>
            <p className="mt-2 text-sm text-zinc-400">
              受けたい人と時間を選んで押すだけで、通常対応者→ベンチの順で自動アサインします。
            </p>
            <div className="mt-4 grid gap-3">
              <input
                value={traineeName}
                onChange={(event) => setTraineeName(event.target.value)}
                placeholder="受けたい人の名前"
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none ring-orange-500/40 focus:ring-2"
              />
              <input
                value={traineeEmail}
                onChange={(event) => setTraineeEmail(event.target.value)}
                placeholder="受けたい人のメール"
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none ring-orange-500/40 focus:ring-2"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none ring-orange-500/40 focus:ring-2"
                />
                <select
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"
                >
                  <option value={15}>15分</option>
                  <option value={30}>30分</option>
                  <option value={45}>45分</option>
                  <option value={60}>60分</option>
                </select>
              </div>
              <button
                onClick={createBooking}
                className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-black transition hover:bg-orange-100"
              >
                最適メンバーでGoogleカレンダー予約を作る
              </button>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold text-zinc-400">共通スケジュール候補</p>
              <div className="flex flex-wrap gap-2">
                {nextSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setStart(slot)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:border-orange-400/50 hover:text-orange-100"
                  >
                    {new Date(slot).toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">メンバー管理</h2>
              <p className="mt-1 text-sm text-zinc-400">役割・ベンチ・稼働状態・名前をここで調整します。</p>
            </div>
            <button
              onClick={() => {
                setMembers(initialMembers);
                setBookings([]);
                setMessage("サンプル状態に戻しました。");
              }}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10"
            >
              リセット
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="px-3">名前</th>
                  <th className="px-3">メール</th>
                  <th className="px-3">役割</th>
                  <th className="px-3">ベンチ</th>
                  <th className="px-3">稼働</th>
                  <th className="px-3">担当数</th>
                  <th className="px-3"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="rounded-2xl bg-black/30">
                    <td className="rounded-l-2xl p-2">
                      <input
                        value={member.name}
                        onChange={(event) => updateMember(member.id, { name: event.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none"
                      />
                    </td>
                    <td className="p-2 text-zinc-300">{member.email}</td>
                    <td className="p-2">
                      <select
                        value={member.role}
                        onChange={(event) =>
                          updateMember(member.id, {
                            role: event.target.value as Role,
                            isBench: event.target.value === "trainer" ? member.isBench : false,
                          })
                        }
                        className="rounded-xl border border-white/10 bg-black px-3 py-2"
                      >
                        <option value="trainer">受けれる側</option>
                        <option value="trainee">受けたい側</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={member.isBench}
                        disabled={member.role !== "trainer"}
                        onChange={(event) => updateMember(member.id, { isBench: event.target.checked })}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={member.active}
                        onChange={(event) => updateMember(member.id, { active: event.target.checked })}
                      />
                    </td>
                    <td className="p-2 text-zinc-300">{member.assignedCount}</td>
                    <td className="rounded-r-2xl p-2 text-right">
                      <button onClick={() => removeMember(member.id)} className="rounded-lg px-3 py-2 text-xs text-red-300 hover:bg-red-500/10">
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-bold">予約履歴</h2>
            <div className="mt-4 space-y-3">
              {bookings.length === 0 ? (
                <p className="text-sm text-zinc-500">まだ予約はありません。</p>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{booking.title}</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {new Date(booking.start).toLocaleString("ja-JP")}〜 / {booking.usedBench ? "ベンチ使用" : "通常対応"}
                        </p>
                      </div>
                      <a
                        href={booking.calendarUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-400"
                      >
                        カレンダーを開く
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-bold">次に完全自動化する部分</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-zinc-300">
              <li>Google CloudでCalendar APIを有効化します。</li>
              <li>社内Google Workspaceならサービスアカウント＋ドメイン全体の委任で、共有カレンダーへ直接予定を作成します。</li>
              <li>共通カレンダー名は「オロチーム_ロープレ確定」などに固定します。</li>
              <li>この画面の予約ボタンをAPI連携に差し替えると、リンクを開かずに予定作成・招待メール送信まで自動化できます。</li>
            </ol>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
      <div className="text-2xl font-black text-orange-200">{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </div>
  );
}
