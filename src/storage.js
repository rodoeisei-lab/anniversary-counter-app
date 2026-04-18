import { SAMPLE_ITEMS } from "./constants.js";
import { cleanText } from "./utils.js";

export function loadData(storageKey) {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return {
      anniversaries: normalizeItems(raw.anniversaries),
      darkMode: !!raw.darkMode,
      themeMode: normalizeThemeMode(raw.themeMode, raw.darkMode),
      presentingId: "",
      onboardingDone: !!raw.onboardingDone,
      usage: normalizeUsage(raw.usage),
      view: normalizeView(raw.view),
      drafts: normalizeDrafts(raw.drafts)
    };
  } catch {
    return {
      anniversaries: structuredClone(SAMPLE_ITEMS),
      darkMode: false,
      themeMode: "auto",
      presentingId: "",
      onboardingDone: false,
      usage: { openedDates: [] },
      view: { sortType: "nearest", filterType: "all", categoryFilter: "all", searchQuery: "" },
      drafts: createEmptyDrafts()
    };
  }
}

export function saveData(storageKey, state, previousSerialized = "") {
  const payload = createPersistPayload(state);
  const serialized = JSON.stringify(payload);
  if (!hasChanged(previousSerialized, serialized)) {
    return { saved: false, serialized };
  }
  localStorage.setItem(storageKey, serialized);
  return { saved: true, serialized };
}

export function createPersistPayload(state) {
  return {
    anniversaries: state.anniversaries,
    darkMode: state.darkMode,
    themeMode: state.themeMode,
    onboardingDone: state.onboardingDone,
    usage: state.usage,
    view: state.view,
    drafts: normalizeDrafts(state.drafts)
  };
}

export function serializeState(state) {
  return JSON.stringify(createPersistPayload(state));
}

export function hasChanged(previousSerialized = "", nextSerialized = "") {
  return previousSerialized !== nextSerialized;
}

export const loadState = loadData;
export function persistState(storageKey, state) {
  return saveData(storageKey, state);
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
      category: normalizeCategory(item.category),
      theme: ["simple", "romantic", "pop"].includes(item.theme) ? item.theme : "simple",
      createdAt: item.createdAt || new Date().toISOString()
    }));
}

function normalizeUsage(usage) {
  if (!usage || !Array.isArray(usage.openedDates)) return { openedDates: [] };
  return { openedDates: usage.openedDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) };
}

function normalizeView(view) {
  const sortType = ["nearest", "created", "title"].includes(view?.sortType) ? view.sortType : "nearest";
  const filterType = ["all", "within30", "within7"].includes(view?.filterType) ? view.filterType : "all";
  const categoryFilter = ["all", "birthday", "event", "anniversary", "other"].includes(view?.categoryFilter)
    ? view.categoryFilter
    : "all";
  const searchQuery = cleanText(view?.searchQuery || "", 40);
  return { sortType, filterType, categoryFilter, searchQuery };
}

function normalizeThemeMode(mode, darkMode) {
  if (["auto", "light", "dark"].includes(mode)) return mode;
  return darkMode ? "dark" : "auto";
}

function normalizeDrafts(drafts) {
  const source = drafts && typeof drafts === "object" ? drafts : {};
  return {
    main: normalizeDraft(source.main),
    quick: normalizeQuickDraft(source.quick)
  };
}

function normalizeDraft(draft) {
  const source = draft && typeof draft === "object" ? draft : {};
  return {
    id: cleanText(source.id || "", 64),
    title: cleanText(source.title || "", 40),
    date: normalizeDate(source.date),
    message: cleanText(source.message || "", 120),
    category: normalizeCategory(source.category),
    theme: ["simple", "romantic", "pop"].includes(source.theme) ? source.theme : "simple"
  };
}

function normalizeQuickDraft(draft) {
  const source = draft && typeof draft === "object" ? draft : {};
  return {
    title: cleanText(source.title || "", 40),
    date: normalizeDate(source.date),
    category: normalizeCategory(source.category)
  };
}

function createEmptyDrafts() {
  return {
    main: normalizeDraft({}),
    quick: normalizeQuickDraft({})
  };
}

function normalizeDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date || "") ? date : "";
}

function normalizeCategory(category) {
  if (["birthday", "event", "anniversary", "other"].includes(category)) return category;
  return "anniversary";
}
