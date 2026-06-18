"use client";

import { useEffect, useState, type ReactNode } from "react";
import { defaultRiskMapData, type LifePlanRiskMapData } from "../LifePlanRiskMapClient";

function lines(value: string, fallback = "-") {
  const items = value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : [fallback];
}

function InfoCard({
  number,
  title,
  children,
  red,
}: {
  number: string;
  title: string;
  children: ReactNode;
  red?: boolean;
}) {
  return (
    <section className="h-[255px] rounded-[10px] border-[3px] border-[#082a61] bg-white p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-[#082a61] text-[20px] font-black text-white">
          {number}
        </div>
        <h2 className="text-[21px] font-black leading-tight text-[#082a61]">{title}</h2>
      </div>
      <div className={`space-y-2 text-[19px] font-bold leading-tight ${red ? "text-[#d71920]" : "text-[#111827]"}`}>
        {children}
      </div>
    </section>
  );
}

function BulletText({ text, red }: { text: string; red?: boolean }) {
  return (
    <>
      {lines(text).slice(0, 6).map((line, index) => (
        <p key={index} className={red ? "text-[#d71920]" : ""}>
          ・{line}
        </p>
      ))}
    </>
  );
}

function FamilyIllustration({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-end">
      <div className="relative h-[235px] w-[245px]">
        <div className="absolute left-[34px] top-[12px] h-[78px] w-[76px] rounded-full bg-[#6f4a35]" />
        <div className="absolute left-[40px] top-[52px] h-[62px] w-[64px] rounded-b-full bg-[#ffe3c7]" />
        <div className="absolute left-[58px] top-[76px] h-2 w-2 rounded-full bg-[#0f172a]" />
        <div className="absolute left-[88px] top-[76px] h-2 w-2 rounded-full bg-[#0f172a]" />
        <div className="absolute left-[65px] top-[97px] h-[3px] w-9 rounded-full bg-[#0f172a]" />
        <div className="absolute left-[10px] top-[118px] h-[112px] w-[96px] rounded-t-[44px] border-[3px] border-[#082a61] bg-[#fff4e8]" />

        <div className="absolute left-[122px] top-[8px] h-[84px] w-[76px] rounded-full bg-[#3d2a22]" />
        <div className="absolute left-[128px] top-[55px] h-[64px] w-[66px] rounded-b-full bg-[#ffe3c7]" />
        <div className="absolute left-[145px] top-[78px] h-2 w-2 rounded-full bg-[#0f172a]" />
        <div className="absolute left-[175px] top-[78px] h-2 w-2 rounded-full bg-[#0f172a]" />
        <div className="absolute left-[151px] top-[100px] h-[3px] w-10 rounded-full bg-[#0f172a]" />
        <div className="absolute left-[96px] top-[119px] h-[112px] w-[120px] rounded-t-[44px] border-[3px] border-[#082a61] bg-[#e8eef7]" />
        <div className="absolute left-[136px] top-[150px] h-0 w-0 border-l-[22px] border-r-[22px] border-t-[62px] border-l-transparent border-r-transparent border-t-[#082a61]" />
      </div>
      <div className="flex h-[46px] w-full items-center justify-center rounded-md bg-[#082a61] px-3 text-center text-[22px] font-black leading-tight text-white">
        {label}
      </div>
    </div>
  );
}

export function RiskMapEmbedClient() {
  const [data, setData] = useState<LifePlanRiskMapData>(defaultRiskMapData);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "life-plan-risk-map:update") return;
      setData(event.data.payload);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <main className="min-h-screen bg-[#eef2f7] p-4 font-sans text-[#111827]">
      <div className="mx-auto h-[970px] w-[1800px] overflow-hidden border border-slate-300 bg-white px-3 py-2 shadow-sm">
        <header className="relative h-[88px]">
          <h1 className="text-center text-[47px] font-black leading-none tracking-normal text-[#082a61]">
            {data.clientName}のライフプラン整理
          </h1>
          <p className="mt-2 text-center text-[22px] font-black text-[#111827]">
            今の生活費だけでは見えにくい、将来必要なお金の見える化（概算）
          </p>
        </header>

        <section className="grid grid-cols-[245px_repeat(7,minmax(0,1fr))] gap-2">
          <FamilyIllustration label={data.familyImageLabel} />
          <InfoCard number="1" title="現在の状況" red>
            <BulletText text={data.currentStatus} />
            <p className="pt-2 text-[18px] font-black text-[#d71920]">
              今の積立があっても、将来必要額全体では十分と言い切れない
            </p>
          </InfoCard>
          <InfoCard number="2" title="収入と今の支出" red>
            <BulletText text={data.incomeExpense} />
          </InfoCard>
          <InfoCard number="3" title="理想の未来">
            <BulletText text={data.idealFuture} />
          </InfoCard>
          <InfoCard number="4" title="教育費の目安" red>
            <div className="pt-2 text-center text-[33px] font-black leading-tight">
              {lines(data.education).map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </InfoCard>
          <InfoCard number="5" title="老後の不足額" red>
            <BulletText text={data.retirementGap} red />
          </InfoCard>
          <InfoCard number="6" title="老後資金の準備目安">
            <BulletText text={data.retirementPlan} />
            <p className="pt-2 text-[17px] font-black text-[#d71920]">
              現在の積立との差分を見える化することが大切
            </p>
          </InfoCard>
          <InfoCard number="7" title="将来の準備テーマ" red>
            <BulletText text={data.themes} />
          </InfoCard>
        </section>

        <section className="mt-2 grid grid-cols-[300px_1fr_1fr_1fr] gap-2">
          <div className="flex h-[48px] items-center justify-center rounded-md bg-[#082a61] text-[25px] font-black text-white">
            家計が苦しくなりやすい時期
          </div>
          <div className="flex h-[48px] items-center justify-center rounded border-2 border-[#f59e0b] bg-[#fff7ed] text-[28px] font-black text-[#d71920]">
            30代前半：結婚・新生活・住宅準備
          </div>
          <div className="flex h-[48px] items-center justify-center rounded border-2 border-[#f59e0b] bg-[#fffbeb] text-[28px] font-black">
            40代後半〜50代前半：教育費ピーク
          </div>
          <div className="flex h-[48px] items-center justify-center rounded border-2 border-[#f59e0b] bg-[#fff7ed] text-[28px] font-black text-[#d71920]">
            65歳以降：毎月不足の老後
          </div>
        </section>

        <section className="mt-2 grid grid-cols-[1fr_420px] gap-3">
          <table className="h-[390px] w-full table-fixed border-collapse text-[19px] font-bold">
            <thead>
              <tr className="bg-[#082a61] text-white">
                {["年", "本人年齢", "子ども年齢", "ライフイベント", "年間必要額", "将来不足額", "累計不足額", "危険ポイント"].map((head) => (
                  <th key={head} className="border-2 border-[#082a61] px-2 py-2 text-center">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.tableRows.map((row, index) => (
                <tr
                  key={index}
                  className={
                    row.highlight === "red"
                      ? "bg-[#d71920] text-white"
                      : row.highlight === "yellow"
                        ? "bg-[#fde68a]"
                        : "bg-white"
                  }
                >
                  <td className="border-2 border-[#082a61] px-2 py-1 text-center">{row.year}</td>
                  <td className="border-2 border-[#082a61] px-2 py-1 text-center">{row.age}</td>
                  <td className="border-2 border-[#082a61] px-2 py-1 text-center">{row.childAge}</td>
                  <td className="border-2 border-[#082a61] px-2 py-1">{row.event}</td>
                  <td className="border-2 border-[#082a61] px-2 py-1 text-center">{row.needed}</td>
                  <td className={`border-2 border-[#082a61] px-2 py-1 text-center font-black ${row.highlight === "red" ? "text-white" : "text-[#d71920]"}`}>{row.shortage}</td>
                  <td className={`border-2 border-[#082a61] px-2 py-1 text-center font-black ${row.highlight === "red" ? "text-white" : "text-[#d71920]"}`}>{row.cumulative}</td>
                  <td className="border-2 border-[#082a61] px-2 py-1 text-[17px] leading-tight">{row.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <aside className="h-[390px] rounded-[10px] border-[3px] border-[#082a61] bg-white">
            <div className="flex h-[54px] items-center justify-center rounded-t-[6px] bg-[#082a61] text-[25px] font-black text-white">
              一般的な必要額との比較
            </div>
            <div className="space-y-4 px-8 py-7 text-[24px] font-black leading-tight">
              {lines(data.comparison).map((line, index) => (
                <p key={index} className={line.includes("老後") || line.includes("不足") ? "text-[#d71920]" : ""}>
                  {line}
                </p>
              ))}
            </div>
          </aside>
        </section>

        <footer className="mt-4 grid h-[104px] grid-cols-[310px_1fr_100px] items-center rounded-[16px] bg-[#082a61] px-3">
          <div className="flex h-[72px] items-center justify-center rounded-[50%] bg-white text-[43px] font-black text-[#d71920]">
            {data.footerLead}
          </div>
          <p className="px-8 text-[28px] font-black leading-tight text-white">
            <span className="text-[#facc15]">{data.footerBody.split("。")[0]}。</span>
            <br />
            {data.footerBody.split("。").slice(1).join("。")}
          </p>
          <div className="relative mx-auto h-0 w-0 border-b-[68px] border-l-[46px] border-r-[46px] border-b-[#facc15] border-l-transparent border-r-transparent">
            <span className="absolute -bottom-[65px] left-[-8px] text-[54px] font-black text-[#111827]">!</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
