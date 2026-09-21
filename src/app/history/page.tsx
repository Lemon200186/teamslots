"use client";
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useLocale } from "@/components/LocaleProvider";

type HistoryItem = {
  id: string; title: string; confirmedStartUtc: string | null; participantCount: number;
};

export default function HistoryPage() {
  const { data: session } = useSession();
  const { t, dateLocale } = useLocale();
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (session?.user) fetch("/api/history").then((r) => r.json()).then(setItems);
  }, [session]);

  if (!session?.user) {
    return (
      <div className="max-w-[460px] mx-auto px-6 py-10">
        <button onClick={() => signIn("google")} className="bg-accent text-white rounded-md px-4 py-2.5 text-sm font-medium">
          {t("history.signinCta")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-1">{t("history.title")}</h1>
      <p className="text-sm text-text-2 mb-5">{t("history.subtitle")}</p>
      <div className="rounded-2xl border border-border bg-white divide-y divide-border">
        {items.length === 0 && <div className="p-5 text-sm text-text-2">{t("history.empty")}</div>}
        {items.map((h) => (
          <div key={h.id} className="flex items-center justify-between px-4 py-3.5">
            <div>
              <div className="text-sm font-semibold">{h.title}</div>
              <div className="text-xs text-text-2 mt-1 font-mono">
                {h.confirmedStartUtc &&
                  new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(h.confirmedStartUtc))}
              </div>
            </div>
            <span className="text-xs font-mono bg-accent/10 text-accent rounded-full px-2.5 py-1">
              {t("history.participants", { n: h.participantCount })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
