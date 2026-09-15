"use client";
import { Fragment, useEffect, useMemo, useRef } from "react";
import { slotToUtc, SLOT_MINUTES, SLOTS_PER_DAY } from "@/lib/time";

type Person = { id: string; name: string; color: string; slotsUtc: Set<string> };

interface Props {
  candidateDates: string[];
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  mySlots: Set<string>;
  onChangeMySlots: (next: Set<string>) => void;
  others: Person[];
  mode: "mine" | "heatmap";
  onModeChange: (m: "mine" | "heatmap") => void;
  readOnly?: boolean;
  onConfirm?: (startUtc: string, endUtc: string) => void;
  confirming?: boolean;
  confirmedStartUtc?: string | null;
}

const TIMEZONES = [
  "Asia/Singapore", "Asia/Shanghai", "Asia/Tokyo", "Europe/London",
  "America/New_York", "America/Los_Angeles", "Australia/Sydney",
];
const WEEKDAY = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function dayLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return { name: WEEKDAY[d.getUTCDay()], date: `${d.getUTCMonth() + 1}/${d.getUTCDate()}` };
}
function slotClock(si: number) {
  const hh = String(Math.floor(si / 4)).padStart(2, "0");
  const mm = String((si % 4) * 15).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function AvailabilityGrid({
  candidateDates, timezone, onTimezoneChange, mySlots, onChangeMySlots,
  others, mode, onModeChange, readOnly, onConfirm, confirming, confirmedStartUtc,
}: Props) {
  const isPaintingRef = useRef(false);
  const paintAddRef = useRef(true);

  useEffect(() => {
    const end = () => { isPaintingRef.current = false; };
    window.addEventListener("pointerup", end);
    return () => window.removeEventListener("pointerup", end);
  }, []);

  // The UTC instant for every (day, slot) cell, under the *currently
  // selected* timezone. Recomputes whenever the viewer switches timezone —
  // that recompute is the entire mechanism behind "the grid shifts when you
  // change timezone" (see lib/time.ts for why).
  const keys = useMemo(
    () =>
      candidateDates.map((date) =>
        Array.from({ length: SLOTS_PER_DAY }, (_, si) => slotToUtc(date, si, timezone).toISOString())
      ),
    [candidateDates, timezone]
  );

  const best = useMemo(() => {
    let top: { di: number; si: number; count: number } | null = null;
    for (let di = 0; di < candidateDates.length; di++) {
      for (let si = 0; si < SLOTS_PER_DAY; si++) {
        const key = keys[di][si];
        let count = mySlots.has(key) ? 1 : 0;
        for (const p of others) if (p.slotsUtc.has(key)) count++;
        if (!top || count > top.count) top = { di, si, count };
      }
    }
    return top;
  }, [keys, mySlots, others, candidateDates.length]);

  function toggle(key: string, add: boolean) {
    const next = new Set(mySlots);
    if (add) next.add(key); else next.delete(key);
    onChangeMySlots(next);
  }
  function handleDown(key: string) {
    if (readOnly || mode !== "mine") return;
    const willAdd = !mySlots.has(key);
    paintAddRef.current = willAdd;
    isPaintingRef.current = true;
    toggle(key, willAdd);
  }
  function handleEnter(key: string) {
    if (!isPaintingRef.current || readOnly || mode !== "mine") return;
    toggle(key, paintAddRef.current);
  }
  function toggleDay(di: number) {
    if (readOnly) return;
    const dayKeys = keys[di];
    const full = dayKeys.every((k) => mySlots.has(k));
    const next = new Set(mySlots);
    dayKeys.forEach((k) => (full ? next.delete(k) : next.add(k)));
    onChangeMySlots(next);
  }

  const totalPeople = others.length + 1;

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3">
        <div className="flex flex-wrap gap-3.5">
          <span className="flex items-center gap-1.5 text-xs text-text-2">
            <span className="w-2 h-2 rounded-full" style={{ background: "#0071E3" }} />你
          </span>
          {others.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 text-xs text-text-2">
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />{p.name}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            className="text-xs bg-surface2 border border-border rounded-md px-2 py-1.5"
          >
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
          <div className="flex bg-[#EFEFED] rounded-md p-0.5 gap-0.5">
            <button
              onClick={() => onModeChange("mine")}
              className={`text-xs px-3 py-1.5 rounded ${mode === "mine" ? "bg-white shadow-sm text-text" : "text-text-2"}`}
            >
              我的可用时间
            </button>
            <button
              onClick={() => onModeChange("heatmap")}
              className={`text-xs px-3 py-1.5 rounded ${mode === "heatmap" ? "bg-white shadow-sm text-text" : "text-text-2"}`}
            >
              群组热力图
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-auto border-t border-border" style={{ maxHeight: 520 }}>
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: `54px repeat(${candidateDates.length}, minmax(48px,1fr))`,
            gridTemplateRows: "46px",
            gridAutoRows: 14,
            minWidth: 540,
          }}
        >
          <div className="sticky top-0 left-0 z-[4] bg-white border-b border-r border-border" />
          {candidateDates.map((date, di) => {
            const { name, date: d } = dayLabel(date);
            const full = keys[di].every((k) => mySlots.has(k));
            return (
              <div
                key={date}
                className="sticky top-0 z-[3] bg-white border-b border-l border-border px-2 py-1.5 flex flex-col justify-center gap-0.5 group"
              >
                <div className="flex items-center justify-between text-[12.5px] font-semibold">
                  <span>{name}</span>
                  <button
                    onClick={() => toggleDay(di)}
                    className="text-[10px] font-medium text-accent opacity-0 group-hover:opacity-100"
                  >
                    {full ? "清空" : "全选"}
                  </button>
                </div>
                <div className="text-[11px] text-text-3 font-mono">{d}</div>
              </div>
            );
          })}

          {Array.from({ length: SLOTS_PER_DAY }, (_, si) => {
            const hourLine = si % 4 === 0;
            return (
              <Fragment key={si}>
                <div className={`sticky left-0 z-[2] bg-white border-r border-border relative ${hourLine ? "border-t border-border" : ""}`}>
                  {hourLine && (
                    <span className="absolute right-2 -translate-y-1.5 text-[10px] text-text-3 font-mono bg-white pl-0.5">
                      {slotClock(si)}
                    </span>
                  )}
                </div>
                {candidateDates.map((date, di) => {
                  const key = keys[di][si];
                  const mine = mySlots.has(key);

                  if (mode === "mine") {
                    const present = mine ? [] : others.filter((p) => p.slotsUtc.has(key));
                    return (
                      <div
                        key={date}
                        onPointerDown={() => handleDown(key)}
                        onPointerEnter={() => handleEnter(key)}
                        className={`relative border-l border-border ${readOnly ? "" : "cursor-pointer hover:bg-accent/5"} ${hourLine ? "border-t border-border" : ""}`}
                        style={{ background: mine ? "#0071E3" : "transparent", touchAction: "none" }}
                      >
                        {present.length > 0 && (
                          <div className="absolute left-0 right-0 bottom-0.5 flex justify-center gap-0.5">
                            {present.map((p) => (
                              <span key={p.id} className="w-[3px] h-[3px] rounded-full" style={{ background: p.color }} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const present = others.filter((p) => p.slotsUtc.has(key));
                  const layers = [...present.map((p) => p.color), ...(mine ? ["#0071E3"] : [])];
                  return (
                    <div
                      key={date}
                      className={`relative border-l border-border ${hourLine ? "border-t border-border" : ""}`}
                      title={`${layers.length}/${totalPeople} 人有空`}
                    >
                      {layers.map((c, i) => (
                        <div key={i} className="absolute inset-0" style={{ background: c, opacity: 0.5, mixBlendMode: "multiply" }} />
                      ))}
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-t border-border">
        {confirmedStartUtc ? (
          <span className="text-sm text-[#1AAE7A] font-medium">
            ✓ 已确认：
            {new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(
              new Date(confirmedStartUtc)
            )}
          </span>
        ) : best && best.count > 0 ? (
          <span className="text-sm">
            最佳时间：
            <b className="font-mono">
              {dayLabel(candidateDates[best.di]).name} {dayLabel(candidateDates[best.di]).date} {slotClock(best.si)}
            </b>{" "}
            · {best.count}/{totalPeople} 人有空
          </span>
        ) : (
          <span className="text-sm text-text-2">涂出你的空闲时间，看看和大家的交集</span>
        )}

        {onConfirm && !confirmedStartUtc && (
          <button
            disabled={!best || best.count === 0 || confirming}
            onClick={() => {
              if (!best) return;
              const startUtc = keys[best.di][best.si];
              const endUtc = new Date(new Date(startUtc).getTime() + SLOT_MINUTES * 60000).toISOString();
              onConfirm(startUtc, endUtc);
            }}
            className="bg-accent text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            {confirming ? "确认中…" : "确认这个时间"}
          </button>
        )}
      </div>
    </div>
  );
}
