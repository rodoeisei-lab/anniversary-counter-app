import { STORAGE_KEYS, STORAGE_KEY, SAMPLE_ITEMS, THEMES, uid } from "./constants.js";
import {
  daysFromToday,
  formatCountLabel,
  getDailyDeltaLabel,
  getMilestoneInfo,
  getNearestAnniversary,
  getPseudoNotifications,
  toYmd,
  ymdToJp
} from "./date-utils.js";
import { loadState, persistState } from "./storage.js";
import { cleanText, escapeHtml, notify } from "./utils.js";
import { saveCardAsImage, shareCard } from "./share.js";

const state = loadState(STORAGE_KEY);
const el = {
  todayValue: document.getElementById("today-value"),
  todayCaption: document.getElementById("today-caption"),
  deltaBadge: document.getElementById("delta-badge"),
  summary: document.getElementById("today-summary"),
  milestonePanel: document.getElementById("milestone-panel"),
  notifyList: document.getElementById("notify-list"),
  checkinStats: document.getElementById("checkin-stats"),
  list: document.getElementById("anniversary-list"),
  form: document.getElementById("anniversary-form"),
  annId: document.getElementById("ann-id"),
  annTitle: document.getElementById("ann-title"),
  annDate: document.getElementById("ann-date"),
  annMessage: document.getElementById("ann-message"),
  annTheme: document.getElementById("ann-theme"),
  formError: document.getElementById("form-error"),
  cancelEdit: document.getElementById("cancel-edit"),
  sampleBtn: document.getElementById("sample-btn"),
  themeToggle: document.getElementById("theme-toggle"),
  onboarding: document.getElementById("onboarding"),
  onboardingClose: document.getElementById("onboarding-close"),
  shareMain: document.getElementById("share-main"),
  downloadMain: document.getElementById("download-main"),
  presentMain: document.getElementById("present-main"),
  floatingShare: document.getElementById("floating-share"),
  presentMode: document.getElementById("present-mode"),
  presentCard: document.getElementById("present-card"),
  presentShare: document.getElementById("present-share"),
  presentSave: document.getElementById("present-save"),
  presentClose: document.getElementById("present-close"),
  backupExport: document.getElementById("backup-export"),
  backupImport: document.getElementById("backup-import"),
  backupFile: document.getElementById("backup-file"),
  backupLast: document.getElementById("backup-last"),
  canvas: document.getElementById("share-canvas"),
  toast: document.getElementById("toast"),
  sections: [...document.querySelectorAll(".app-section")],
  navBtns: [...document.querySelectorAll(".nav-btn")],
  addSection: document.getElementById("add-section"),
  listSection: document.getElementById("list-section")
};

trackOpenToday();
bindEvents();
initSectionNav();
render();

function bindEvents() {
  el.form.addEventListener("submit", onSubmit);
  el.cancelEdit.addEventListener("click", resetForm);
  el.onboardingClose.addEventListener("click", () => {
    state.onboardingDone = true;
    persist();
    renderOnboarding();
  });

  el.sampleBtn.addEventListener("click", () => {
    state.anniversaries = structuredClone(SAMPLE_ITEMS);
    persist();
    render();
    notify(el.toast, "サンプル記念日を読み込みました");
  });

  el.themeToggle.addEventListener("click", () => {
    state.darkMode = !state.darkMode;
    persist();
    applyTheme();
  });

  el.list.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;

    const id = btn.dataset.id;
    const item = state.anniversaries.find((ann) => ann.id === id);
    if (!item) return;

    if (btn.dataset.action === "edit") return fillForm(item);
    if (btn.dataset.action === "delete") {
      state.anniversaries = state.anniversaries.filter((ann) => ann.id !== id);
      persist();
      render();
      return;
    }
    if (btn.dataset.action === "present") return openPresent(item);
    if (btn.dataset.action === "save") return saveCardAsImage(item, el.canvas, (text) => notify(el.toast, text));
    if (btn.dataset.action === "share") return shareCard(item, el.canvas, (text) => notify(el.toast, text));
  });

  el.shareMain.addEventListener("click", () => shareCard(getFeatured(), el.canvas, (text) => notify(el.toast, text)));
  el.downloadMain.addEventListener("click", () => saveCardAsImage(getFeatured(), el.canvas, (text) => notify(el.toast, text)));
  el.presentMain.addEventListener("click", () => openPresent(getFeatured()));
  el.floatingShare.addEventListener("click", () => shareCard(getFeatured(), el.canvas, (text) => notify(el.toast, text)));
  el.presentShare.addEventListener("click", () => shareCard(getPresentingOrFeatured(), el.canvas, (text) => notify(el.toast, text)));
  el.presentSave.addEventListener("click", () => saveCardAsImage(getPresentingOrFeatured(), el.canvas, (text) => notify(el.toast, text)));
  el.presentClose.addEventListener("click", closePresent);
  el.backupExport.addEventListener("click", exportBackup);
  el.backupImport.addEventListener("click", () => el.backupFile.click());
  el.backupFile.addEventListener("change", importBackup);
}

function initSectionNav() {
  el.navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      flashSection(target);
      updateActiveNav(target.id);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      const current = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!current) return;
      updateActiveNav(current.target.id);
    },
    {
      root: null,
      threshold: [0.35, 0.6, 0.8],
      rootMargin: "-15% 0px -45% 0px"
    }
  );

  el.sections.forEach((section) => observer.observe(section));
}

function updateActiveNav(sectionId) {
  el.navBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === sectionId);
  });
}

function flashSection(section) {
  section.classList.add("section-enter");
  setTimeout(() => section.classList.remove("section-enter"), 260);
}

function render() {
  applyTheme();
  renderOnboarding();
  renderBackupInfo();

  const featured = getFeatured();
  if (!featured) {
    el.todayValue.textContent = "--";
    el.todayCaption.textContent = "記念日を追加すると、今日のサマリーが表示されます。";
    el.summary.innerHTML = "";
    el.milestonePanel.innerHTML = "";
    el.notifyList.innerHTML = "";
    el.checkinStats.textContent = "連続チェック 0 日";
    el.list.innerHTML = "";
    return;
  }

  const diff = daysFromToday(featured.date);
  const milestone = getMilestoneInfo(featured);

  el.todayValue.textContent = formatCountLabel(diff);
  el.todayCaption.textContent = `${featured.title}（${ymdToJp(featured.date)}）`;
  el.deltaBadge.textContent = `今日の変化: ${getDailyDeltaLabel(featured)}`;
  el.deltaBadge.classList.toggle("is-positive", true);

  el.summary.innerHTML = buildSummary(featured, milestone);
  el.milestonePanel.innerHTML = buildMilestonePanel(featured, milestone);
  el.notifyList.innerHTML = buildNotifyList(featured);
  el.checkinStats.textContent = `連続チェック ${getOpenStreak()} 日`;
  renderCards();
}

function renderCards() {
  el.list.innerHTML = state.anniversaries
    .map((item) => {
      const theme = THEMES[item.theme] || THEMES.simple;
      const diff = daysFromToday(item.date);
      const milestone = getMilestoneInfo(item);
      return `
        <article class="ann-card ${theme.className}">
          <p class="ann-title">${escapeHtml(item.title)}</p>
          <p class="ann-days">${formatCountLabel(diff)}</p>
          <p class="ann-date">${ymdToJp(item.date)}</p>
          <p class="ann-msg">${escapeHtml(item.message || "特別メッセージを追加できます")}</p>
          <div class="mini-progress">
            <div class="mini-progress-label">次の節目: ${milestone.next}日 (${ymdToJp(milestone.nextDate)})</div>
            <div class="progress-track"><div class="progress-fill" style="width:${milestone.progressRate}%"></div></div>
          </div>
          <div class="ann-actions">
            <button class="btn" data-action="share" data-id="${item.id}" type="button">共有</button>
            <button class="btn" data-action="save" data-id="${item.id}" type="button">画像保存</button>
            <button class="btn" data-action="present" data-id="${item.id}" type="button">全画面</button>
            <button class="btn" data-action="edit" data-id="${item.id}" type="button">編集</button>
            <button class="btn" data-action="delete" data-id="${item.id}" type="button">削除</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function buildSummary(featured, milestone) {
  const nearest = getNearestAnniversary(state.anniversaries);
  const nextMilestoneIn = daysFromToday(milestone.nextDate);
  return `
    <article class="summary-item highlight pulse">
      <p class="summary-label">いちばん近い記念日</p>
      <p class="summary-main">${escapeHtml(nearest.title)}</p>
      <p class="summary-sub">${ymdToJp(nearest.date)} / ${formatCountLabel(daysFromToday(nearest.date))}</p>
    </article>
    <article class="summary-item">
      <p class="summary-label">次の節目</p>
      <p class="summary-main">${milestone.next}日目</p>
      <p class="summary-sub">${ymdToJp(milestone.nextDate)}（あと${Math.max(0, nextMilestoneIn)}日）</p>
    </article>
    <article class="summary-item">
      <p class="summary-label">今日の達成感</p>
      <p class="summary-main">${milestone.progressRate}%</p>
      <p class="summary-sub">前回節目 ${milestone.previous || 0}日 → 次の節目 ${milestone.next}日</p>
    </article>
  `;
}

function buildMilestonePanel(featured, milestone) {
  const milestones = [100, 200, 365, 500, 730]
    .map((day) => {
      const date = new Date(`${featured.date}T00:00:00`);
      date.setDate(date.getDate() + day);
      return `<li><strong>${day}日:</strong> ${ymdToJp(toYmd(date))}</li>`;
    })
    .join("");

  return `
    <div class="progress-wrap">
      <p class="progress-title">${escapeHtml(featured.title)} の進行度</p>
      <div class="progress-track large"><div class="progress-fill animated" style="width:${milestone.progressRate}%"></div></div>
      <p class="progress-caption">${milestone.previous}日目（${ymdToJp(milestone.previousDate)}）から ${milestone.next}日目（${ymdToJp(milestone.nextDate)}）へ</p>
    </div>
    <ul class="milestone-list">${milestones}</ul>
  `;
}

function buildNotifyList(featured) {
  const list = getPseudoNotifications(featured)
    .map((item) => `<li><span>${item.label}</span><strong>${ymdToJp(item.date)}</strong></li>`)
    .join("");
  return `<ul>${list}</ul>`;
}

function onSubmit(event) {
  event.preventDefault();
  const payload = {
    id: el.annId.value || uid(),
    title: cleanText(el.annTitle.value, 40),
    date: el.annDate.value,
    message: cleanText(el.annMessage.value, 120),
    theme: el.annTheme.value,
    createdAt: new Date().toISOString()
  };

  const err = validate(payload);
  if (err) {
    el.formError.textContent = err;
    return;
  }

  const idx = state.anniversaries.findIndex((i) => i.id === payload.id);
  if (idx >= 0) {
    payload.createdAt = state.anniversaries[idx].createdAt;
    state.anniversaries[idx] = payload;
    notify(el.toast, "記念日を更新しました");
  } else {
    state.anniversaries.push(payload);
    notify(el.toast, "記念日を追加しました");
  }

  persist();
  resetForm();
  render();
  el.listSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function validate(item) {
  if (!item.title) return "タイトルを入力してください";
  if (!item.date) return "日付を選択してください";
  if (!THEMES[item.theme]) return "テーマが不正です";
  return "";
}

function fillForm(item) {
  el.annId.value = item.id;
  el.annTitle.value = item.title;
  el.annDate.value = item.date;
  el.annMessage.value = item.message || "";
  el.annTheme.value = item.theme || "simple";
  el.formError.textContent = "";
  const details = el.addSection.querySelector("details");
  if (details) details.open = true;
  el.addSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  el.form.reset();
  el.annId.value = "";
  el.formError.textContent = "";
}

function applyTheme() {
  document.documentElement.dataset.theme = state.darkMode ? "dark" : "light";
  el.themeToggle.textContent = state.darkMode ? "☀️" : "🌙";
}

function renderOnboarding() {
  const shouldShow = !state.onboardingDone;
  el.onboarding.classList.toggle("hidden", !shouldShow);
}

function openPresent(item) {
  if (!item) return notify(el.toast, "共有する記念日がありません");
  state.presentingId = item.id;
  const theme = THEMES[item.theme] || THEMES.simple;
  const milestone = getMilestoneInfo(item);
  el.presentCard.className = `present-card ${theme.className}`;
  el.presentCard.innerHTML = `
    <p class="eyebrow">Today's Anniversary</p>
    <p class="ann-title">${escapeHtml(item.title)}</p>
    <p class="ann-days">${formatCountLabel(daysFromToday(item.date))}</p>
    <p class="ann-date">${ymdToJp(item.date)}</p>
    <p class="ann-msg">${escapeHtml(item.message || "")}</p>
    <p class="ann-msg">次の節目: ${milestone.next}日目（${ymdToJp(milestone.nextDate)}）</p>
  `;
  el.presentMode.classList.remove("hidden");
}

function closePresent() {
  state.presentingId = "";
  el.presentMode.classList.add("hidden");
}

function getPresentingOrFeatured() {
  return state.anniversaries.find((ann) => ann.id === state.presentingId) || getFeatured();
}

function getFeatured() {
  return getNearestAnniversary(state.anniversaries);
}

function trackOpenToday() {
  const today = toYmd(new Date());
  const set = new Set(state.usage.openedDates);
  set.add(today);
  state.usage.openedDates = [...set].sort();
  persist();
}

function renderBackupInfo() {
  const rawDate = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_AT);
  if (!rawDate) {
    el.backupLast.textContent = "最終バックアップ: まだありません";
    return;
  }
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    el.backupLast.textContent = "最終バックアップ: まだありません";
    return;
  }
  const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  el.backupLast.textContent = `最終バックアップ: ${formatted}`;
}

function exportBackup() {
  try {
    const appRaw = localStorage.getItem(STORAGE_KEY);
    const appData = appRaw ? JSON.parse(appRaw) : { anniversaries: [] };
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      appData
    };
    const text = JSON.stringify(payload, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const fileDate = toYmd(new Date()).replaceAll("-", "");
    const a = document.createElement("a");
    a.href = url;
    a.download = `anniversary-backup-${fileDate}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_AT, new Date().toISOString());
    renderBackupInfo();
    notify(el.toast, "バックアップを保存しました");
  } catch {
    notify(el.toast, "バックアップの作成に失敗しました");
  }
}

async function importBackup(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) {
    notify(el.toast, "復元するファイルを選択してください");
    return;
  }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const appData = validateBackupData(data);
    const ok = window.confirm("現在のデータを上書きして復元します。よろしいですか？");
    if (!ok) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    notify(el.toast, "復元が完了しました。画面を更新します。");
    setTimeout(() => window.location.reload(), 350);
  } catch (error) {
    notify(el.toast, `復元に失敗しました: ${error.message || "JSON形式を確認してください"}`);
  }
}

function validateBackupData(data) {
  if (!data || typeof data !== "object") throw new Error("JSONがオブジェクトではありません");
  const appData = data.appData;
  if (!appData || typeof appData !== "object") throw new Error("バックアップの必須キー(appData)がありません");
  if (!Array.isArray(appData.anniversaries)) throw new Error("anniversaries が見つかりません");
  if (!("usage" in appData)) throw new Error("usage が見つかりません");
  return appData;
}

function getOpenStreak() {
  if (!state.usage.openedDates.length) return 0;
  const set = new Set(state.usage.openedDates);
  let streak = 0;
  let cursor = new Date();
  while (set.has(toYmd(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function persist() {
  persistState(STORAGE_KEY, state);
}
