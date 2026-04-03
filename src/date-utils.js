import { MILESTONE_DAYS } from "./constants.js";

const DAY_MS = 86400000;

export function toDateOnly(input) {
  const base = input ? new Date(input) : new Date();
  return new Date(base.getFullYear(), base.getMonth(), base.getDate());
}

export function daysBetween(from, to) {
  const d0 = toDateOnly(from).getTime();
  const d1 = toDateOnly(to).getTime();
  return Math.round((d1 - d0) / DAY_MS);
}

export function daysFromToday(targetYmd, baseDate = new Date()) {
  return daysBetween(baseDate, `${targetYmd}T00:00:00`);
}

export function elapsedDaysFrom(targetYmd, baseDate = new Date()) {
  return daysBetween(`${targetYmd}T00:00:00`, baseDate);
}

export function addDays(ymd, days) {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

export function toYmd(d) {
  const date = toDateOnly(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ymdToJp(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

export function formatCountLabel(diff) {
  if (diff === 0) return "今日";
  return diff > 0 ? `あと${diff}日` : `${Math.abs(diff)}日経過`;
}

export function getNearestAnniversary(items) {
  if (!items.length) return null;
  return [...items].sort((a, b) => Math.abs(daysFromToday(a.date)) - Math.abs(daysFromToday(b.date)))[0];
}

export function getMilestoneInfo(item, today = new Date()) {
  const elapsed = elapsedDaysFrom(item.date, today);
  const next = MILESTONE_DAYS.find((d) => d > elapsed) || MILESTONE_DAYS[MILESTONE_DAYS.length - 1];
  const previous = [...MILESTONE_DAYS].reverse().find((d) => d <= elapsed) || 0;
  const progressed = Math.max(0, elapsed - previous);
  const total = Math.max(1, next - previous);
  const progressRate = Math.min(100, Math.max(0, Math.round((progressed / total) * 100)));

  return {
    elapsed,
    previous,
    next,
    nextDate: addDays(item.date, next),
    previousDate: previous ? addDays(item.date, previous) : item.date,
    progressRate
  };
}

export function getNextAnnualDate(ymd, baseDate = new Date()) {
  const source = new Date(`${ymd}T00:00:00`);
  const today = toDateOnly(baseDate);
  let year = today.getFullYear();
  let candidate = new Date(year, source.getMonth(), source.getDate());
  if (candidate < today) candidate = new Date(year + 1, source.getMonth(), source.getDate());
  return toYmd(candidate);
}

export function getPseudoNotifications(item, baseDate = new Date()) {
  const target = getNextAnnualDate(item.date, baseDate);
  return [
    { label: "7日前", date: addDays(target, -7) },
    { label: "前日", date: addDays(target, -1) },
    { label: "当日", date: target }
  ];
}

export function getDailyDeltaLabel(item, today = new Date()) {
  const elapsedToday = elapsedDaysFrom(item.date, today);
  const yesterday = new Date(toDateOnly(today).getTime() - DAY_MS);
  const elapsedYesterday = elapsedDaysFrom(item.date, yesterday);
  const delta = elapsedToday - elapsedYesterday;
  return `昨日より${delta >= 0 ? "+" : ""}${delta}日`;
}
