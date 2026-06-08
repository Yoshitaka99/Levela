"use client";

import { FormEvent, useState } from "react";

export function TeamAccessForm({ nextPath }: { nextPath: string }) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/team-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase, next: nextPath }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string; next?: string };

      if (!response.ok || !result.ok) {
        setError(result.error ?? "合い言葉を確認してください。");
        return;
      }

      window.location.assign(result.next ?? "/team");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07100f] px-4 py-8 text-slate-100">
      <section className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30">
          <div className="mb-6">
            <p className="text-sm font-semibold text-teal-200">チームセールス</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-white">合い言葉を入力</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              このブラウザで一度通過すると、しばらくはそのままチームダッシュボードを開けます。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-300">合い言葉</span>
              <input
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                type="password"
                autoFocus
                className="mt-2 h-11 w-full rounded-md border border-teal-300/25 bg-slate-950 px-3 text-base text-white outline-none transition focus:border-teal-300/70"
                placeholder=""
              />
            </label>

            {error ? (
              <p className="rounded-md border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-md bg-teal-300 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "確認中" : "入室する"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
