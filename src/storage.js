import { SAMPLE_ITEMS } from "./constants.js";
import { cleanText } from "./utils.js";

export function loadState(storageKey) {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return {
      anniversaries: normalizeItems(raw.anniversaries),
      darkMode: !!raw.darkMode,
      themeMode: normalizeThemeMode(raw.themeMode, raw.darkMode),
      presentingId: "",
      onboardingDone: !!raw.onboardingDone,
      usage: normalizeUsage(raw.usage),
      view: normalizeView(raw.view)
    };
  } catch {
    return {
      anniversaries: structuredClone(SAMPLE_ITEMS),
      darkMode: false,
      themeMode: "auto",
      presentingId: "",
      onboardingDone: false,
      usage: { openedDates: [] },
      view: { sortType: "nearest", filterType: "all" }
    };
  }
}

export function persistState(storageKey, state) {
  const payload = {
    anniversaries: state.anniversaries,
    darkMode: state.darkMode,
    themeMode: state.themeMode,
    onboardingDone: state.onboardingDone,
    usage: state.usage,
    view: state.view
  };
  localStorage.setItem(storageKey, JSON.stringify(payload));
}

function normalizeItems(list) {
  if (!Array.isArray(list) || !list.length) return structuredClone(SAMPLE_ITEMS);
  return list
    .filter((item) => item && item.id && item.date)
    .map((item) => ({
      id: item.id,
      title: cleanText(item.title, 40),
      date: item.date,
      message: cleanText(item.message, 120),
      theme: ["simple", "romantic", "pop"].includes(item.theme) ? item.theme : "simple",
      createdAt: item.createdAt || new Date().toISOString()
    }));
}

function normalizeUsage(usage) {
  if (!usage || !Array.isArray(usage.openedDates)) return { openedDates: [] };
  return { openedDates: usage.openedDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) };
}

function normalizeView(view) {
  const sortType = ["nearest", "dateAsc", "titleAsc"].includes(view?.sortType) ? view.sortType : "nearest";
  const filterType = ["all", "past", "today", "future"].includes(view?.filterType) ? view.filterType : "all";
  return { sortType, filterType };
}

function normalizeThemeMode(mode, darkMode) {
  if (["auto", "light", "dark"].includes(mode)) return mode;
  return darkMode ? "dark" : "auto";
}
