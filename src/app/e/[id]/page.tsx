"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AvailabilityGrid } from "@/components/AvailabilityGrid";
import { candidateDates } from "@/lib/time";
import { useLocale } from "@/components/LocaleProvider";

const PALETTE = ["#FF6B5B", "#F0A400", "#14B8A6", "#8B7FE8", "#EC4899", "#22C55E"];

type EventData = {
  id: string; title: string; ownerName: string; isOwner: boolean;
  startDate: string; dayCount: number; status: string; durationMinutes: number;
  confirmedStartUtc: string | null;
  myParticipantId: string | null; mySlotsUtc: string[]; myName: string; myEmail: string;
  participants: { id: string; name: string; slotsUtc: string[] }[];
};

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const [data, setData] = useState<EventData | null>(null);
  const [timezone, setTimezone] = useState("Asia/Singapore");
  const [mySlots, setMySlots] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"mine" | "heatmap">("mine");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wantsEmail, setWantsEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasLoadedMineRef = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/events/${id}`, { cache: "no-store" });
    if (!res.ok) return;
    const json: EventData = await res.json();
    setData(json);
    // Only seed "my" selections from the server on the very first load.
    // Later polls (every 6s, so we pick up other participants' picks
    // without a manual refresh) must NOT touch mySlots, or they'd wipe out
    // whatever the user has painted locally but not saved yet.
    if (!hasLoadedMineRef.current) {
      setMySlots(new Set(json.mySlotsUtc));
      hasLoadedMineRef.current = true;
    }
    setName((n) => n || json.myName || "");
    setEmail((e) => e || json.myEmail || "");
    if (json.myEmail) setWantsEmail(true);
  }, [id]);

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Singapore");
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 6000); // light polling so participants see each other's picks without a full refresh
    return () => clearInterval(t);
  }, [load]);

  async function saveAvailability() {
    setSaving(true);
    await fetch(`/api/events/${id}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || t("event.anonymous"),
        email: wantsEmail ? email : "",
        timezone,
        slotsUtc: Array.from(mySlots),
      }),
    });
    setSaving(false);
    load();
  }

  async function confirm(startUtc: string, endUtc: string) {
    setConfirming(true);
    await fetch(`/api/events/${id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startUtc, endUtc }),
    });
    setConfirming(false);
    load();
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); } catch { /* clipboard may be unavailable */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!data) return <div className="px-6 py-10 text-sm text-text-2">{t("event.loading")}</div>;

  const dates = candidateDates(data.startDate, data.dayCount);
  const others = data.participants.map((p, i) => ({
    id: p.id, name: p.name, color: PALETTE[i % PALETTE.length], slotsUtc: new Set(p.slotsUtc),
  }));

  return (
    <div className="max-w-[980px] mx-auto px-6 py-7">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold">{data.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-text-2">{t("event.ownerLabel")}{data.ownerName}</span>
            <button onClick={copyLink} className="text-xs text-text-2 hover:text-text border border-border rounded-md px-2 py-1">
              {copied ? t("event.copied") : t("event.copyLink")}
            </button>
          </div>
        </div>
        {!data.myParticipantId && data.status !== "confirmed" && (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("event.namePlaceholder")}
                className="border border-border-strong rounded-md px-3 py-1.5 text-sm w-28" />
              {wantsEmail && (
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("event.emailPlaceholder")}
                  className="border border-border-strong rounded-md px-3 py-1.5 text-sm w-56" />
              )}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-text-2 cursor-pointer">
              <input type="checkbox" checked={wantsEmail} onChange={(e) => setWantsEmail(e.target.checked)} />
              {t("event.emailOptIn")}
            </label>
          </div>
        )}
      </div>

      <AvailabilityGrid
        candidateDates={dates}
        timezone={timezone}
        onTimezoneChange={setTimezone}
        mySlots={mySlots}
        onChangeMySlots={setMySlots}
        others={others}
        mode={mode}
        onModeChange={setMode}
        readOnly={data.status === "confirmed"}
        onConfirm={data.isOwner ? confirm : undefined}
        confirming={confirming}
        confirmedStartUtc={data.confirmedStartUtc}
        durationMinutes={data.durationMinutes}
      />

      {data.status !== "confirmed" && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={saveAvailability}
            disabled={saving}
            className="bg-accent text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            {saving ? t("event.saving") : t("event.saveBtn")}
          </button>
        </div>
      )}
    </div>
  );
}
