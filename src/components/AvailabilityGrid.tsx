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
  durationMinutes: number;
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
  others, mode, onModeChange, readOnly, onConfirm, confirming, confirmedStartUtc, durationMinutes,
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

  const slotsNeeded = Math.max(1, Math.round(durationMinutes / SLOT_MINUTES));

  // Ranked list of candidate meeting windows — each is a *continuous* block
  // of `slotsNeeded` slots (not a single 15-min cell), since a lone
  // overlapping slot is close to meaningless once there are more than a
  // couple of people: it almost never survives into an actual meeting
  // length. We also drop any candidate that overlaps a higher-ranked one on
  // the same day, so the list doesn't just show five shifted-by-15-minutes
  // versions of the same window.
  const candidates = useMemo(() => {
    type Candidate = { di: number; si: number; count: number };
    const raw: Candidate[] = [];
    for (let di = 0; di < candidateDates.length; di++) {
      for (let si = 0; si + slotsNeeded <= SLOTS_PER_DAY; si++) {
        let count = 0;
        let mineOk = true;
        for (let k = si; k < si + slotsNeeded; k++) {
          if (!mySlots.has(keys[di][k])) { mineOk = false; break; }
        }
        if (mineOk) count++;
        for (const p of others) {
          let ok = true;
          for (let k = si; k < si + slotsNeeded; k++) {
            if (!p.slotsUtc.has(keys[di][k])) { ok = false; break; }
          }
          if (ok) count++;
        }
        if (count > 0) raw.push({ di, si, count });
      }
    }
    raw.sort((a, b) => b.count - a.count || a.di - b.di || a.si - b.si);
    const picked: Candidate[] = [];
    for (const c of raw) {
      const overlaps = picked.some(
        (p) => p.di === c.di && c.si < p.si + slotsNeeded && p.si < c.si + slotsNeeded
      );
      if (!overlaps) picked.push(c);
      if (picked.length >= 5) break;
    }
    return picked;
  }, [keys, mySlots, others, candidateDates.length, slotsNeeded]);

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

      <div className="px-4 py-3.5 border-t border-border">
        {confirmedStartUtc ? (
          <span className="text-sm text-[#1AAE7A] font-medium">
            ✓ 已确认：
            {new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(
              new Date(confirmedStartUtc)
            )}
          </span>
        ) : candidates.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="text-xs text-text-2 font-medium">
              推荐时间 · 按 {durationMinutes} 分钟会议时长找连续空档，按重合人数排序
            </div>
            <div className="flex flex-col gap-1.5">
              {candidates.map((c, i) => {
                const startLabel = `${dayLabel(candidateDates[c.di]).name} ${dayLabel(candidateDates[c.di]).date} ${slotClock(c.si)}`;
                const endSi = c.si + slotsNeeded;
                const endLabel = endSi >= SLOTS_PER_DAY ? "24:00" : slotClock(endSi);
                const startUtc = keys[c.di][c.si];
                const endUtc = new Date(new Date(startUtc).getTime() + durationMinutes * 60000).toISOString();
                return (
                  <div
                    key={`${c.di}-${c.si}`}
                    className="flex items-center justify-between gap-3 rounded-md bg-surface2 px-3 py-2"
                  >
                    <span className="text-sm">
                      <span className="text-text-3 font-mono mr-2">#{i + 1}</span>
                      <b className="font-mono">{startLabel}–{endLabel}</b>
                      <span className="text-text-2"> · {c.count}/{totalPeople} 人有空</span>
                    </span>
                    {onConfirm && (
                      <button
                        disabled={confirming}
                        onClick={() => {
                          if (!window.confirm(`确定要把会议时间锁定为 ${startLabel}–${endLabel} 吗？这个操作会立刻通知所有参与者，且无法撤销。`)) return;
                          onConfirm(startUtc, endUtc);
                        }}
                        className="shrink-0 border border-[#E0A100] text-[#8A6200] bg-[#FFF8E6] rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-[#FFF1CC]"
                      >
                        {confirming ? "确认中…" : "确认这个时间"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <span className="text-sm text-text-2">涂出你的空闲时间，看看和大家的交集</span>
        )}
      </div>
    </div>
  );
}
