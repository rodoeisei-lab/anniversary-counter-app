export const STORAGE_KEY = "anniv.share.v3";

export const THEMES = {
  simple: {
    label: "シンプル",
    className: "theme-simple",
    gradient: ["#5f73ff", "#73b8ff"]
  },
  romantic: {
    label: "ロマンチック",
    className: "theme-romantic",
    gradient: ["#f04f7d", "#ff9f9f"]
  },
  pop: {
    label: "ポップ",
    className: "theme-pop",
    gradient: ["#ff8c2e", "#ffdf4b"]
  }
};

export const MILESTONE_DAYS = [100, 200, 300, 365, 500, 730, 1000, 1460, 1825, 2000, 3000];

export const SAMPLE_ITEMS = [
  {
    id: uid(),
    title: "付き合った日",
    date: "2024-06-01",
    message: "毎日1つずつ思い出を増やそう",
    theme: "romantic",
    createdAt: nowIso()
  },
  {
    id: uid(),
    title: "初めての旅行",
    date: "2025-04-13",
    message: "次はどこへ行こう？",
    theme: "pop",
    createdAt: nowIso()
  }
];

export function uid() {
  return `ann_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso() {
  return new Date().toISOString();
}
