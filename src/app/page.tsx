"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useLocale } from "@/components/LocaleProvider";

const DURATIONS = [15, 30, 45, 60, 90, 120];

export default function HomePage() {
  const { data: session } = useSession();
  const { t } = useLocale();
  const [title, setTitle] = useState("Q3 增长复盘同步会");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function createEvent() {
    setLoading(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, durationMinutes }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.id) router.push(`/e/${data.id}`);
  }

  return (
    <div className="max-w-[460px] mx-auto px-6 py-10 flex flex-col gap-5">
      <div className="flex gap-1.5">
        {["#0071E3", "#FF6B5B", "#F0A400", "#14B8A6", "#8B7FE8"].map((c) => (
          <div key={c} className="w-[15px] h-[15px] rounded-full" style={{ background: c }} />
        ))}
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("home.title")}</h1>
        <p className="text-sm text-text-2 mt-1.5 leading-relaxed">{t("home.subtitle")}</p>
      </div>

      {!session?.user ? (
        <button
          onClick={() => signIn("google")}
          className="bg-accent text-white rounded-md px-4 py-2.5 text-sm font-medium"
        >
          {t("home.signinCta")}
        </button>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-2 font-medium">{t("home.titleLabel")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("home.titlePlaceholder")}
              className="border border-border-strong rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>
          <div className="bg-surface2 border border-border rounded-md px-3 py-2.5 text-sm text-text-2">
            {t("home.dateRange")}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-2 font-medium">{t("home.durationLabel")}</label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="border border-border-strong rounded-md px-3 py-2.5 text-sm bg-white"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {t("home.durationOption", { n: d })}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={createEvent}
            disabled={loading}
            className="bg-accent text-white rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-40"
          >
            {loading ? t("home.creating") : t("home.createBtn")}
          </button>
        </>
      )}
    </div>
  );
}
