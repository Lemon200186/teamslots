"use client";
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type HistoryItem = {
  id: string; title: string; confirmedStartUtc: string | null; participantCount: number;
};

export default function HistoryPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (session?.user) fetch("/api/history").then((r) => r.json()).then(setItems);
  }, [session]);

  if (!session?.user) {
    return (
      <div className="max-w-[460px] mx-auto px-6 py-10">
        <button onClick={() => signIn("google")} className="bg-accent text-white rounded-md px-4 py-2.5 text-sm font-medium">
          登录查看历史记录
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-1">历史记录</h1>
      <p className="text-sm text-text-2 mb-5">已确认的会议都会归档在这里。</p>
      <div className="rounded-2xl border border-border bg-white divide-y divide-border">
        {items.length === 0 && <div className="p-5 text-sm text-text-2">还没有历史记录。</div>}
        {items.map((h) => (
          <div key={h.id} className="flex items-center justify-between px-4 py-3.5">
            <div>
              <div className="text-sm font-semibold">{h.title}</div>
              <div className="text-xs text-text-2 mt-1 font-mono">
                {h.confirmedStartUtc &&
                  new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(h.confirmedStartUtc))}
              </div>
            </div>
            <span className="text-xs font-mono bg-accent/10 text-accent rounded-full px-2.5 py-1">
              {h.participantCount} 人参与
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
