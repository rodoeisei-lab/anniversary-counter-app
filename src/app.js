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

const INITIAL_RENDER_COUNT = 20;
const BATCH_RENDER_COUNT = 20;
const SCROLL_FALLBACK_THRESHOLD = 260;

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
  listState: document.getElementById("list-state"),
  renderModeToggle: document.getElementById("render-mode-toggle"),
  listLoading: document.getElementById("list-loading"),
  listMoreBtn: document.getElementById("list-more-btn"),
  listComplete: document.getElementById("list-complete"),
  listSentinel: document.getElementById("list-sentinel"),
  sortSelect: document.getElementById("sort-select"),
  filterToggle: document.getElementById("filter-toggle"),
  searchInput: document.getElementById("search-input"),
  categoryFilter: document.getElementById("category-filter"),
  form: document.getElementById("anniversary-form"),
  annId: document.getElementById("ann-id"),
  annTitle: document.getElementById("ann-title"),
  annDate: document.getElementById("ann-date"),
  annMessage: document.getElementById("ann-message"),
  annCategory: document.getElementById("ann-category"),
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
  quickAddFab: document.getElementById("quick-add-fab"),
  quickModal: document.getElementById("quick-modal"),
  quickOverlay: document.getElementById("quick-overlay"),
  quickClose: document.getElementById("quick-close"),
  quickForm: document.getElementById("quick-form"),
  quickTitle: document.getElementById("quick-title"),
  quickDate: document.getElementById("quick-date"),
  quickCategory: document.getElementById("quick-category"),
  quickError: document.getElementById("quick-error"),
  quickToDetail: document.getElementById("quick-to-detail"),
  presentMode: document.getElementById("present-mode"),
  presentCard: document.getElementById("present-card"),
  presentShare: document.getElementById("present-share"),
  presentSave: document.getElementById("present-save"),
  presentClose: document.getElementById("present-close"),
  backupExport: document.getElementById("backup-export"),
  backupImport: document.getElementById("backup-import"),
  backupFile: document.getElementById("backup-file"),
  backupLast: document.getElementById("backup-last"),
  backupPreview: document.getElementById("backup-preview"),
  importModeRadios: [...document.querySelectorAll('input[name="import-mode"]')],
  canvas: document.getElementById("share-canvas"),
  toast: document.getElementById("toast"),
  srStatus: document.getElementById("sr-status"),
  sections: [...document.querySelectorAll(".app-section")],
  navBtns: [...document.querySelectorAll(".nav-btn")],
  addSection: document.getElementById("add-section"),
  listSection: document.getElementById("list-section")
};

const listRuntime = {
  allItems: [],
  currentIndex: 0,
  chunkSize: BATCH_RENDER_COUNT,
  isAppending: false,
  hasMore: false,
  renderMode: "infinite",
  observer: null,
  fallbackBound: false
};

initViewStateFromQuery();
trackOpenToday();
bindEvents();
resetForm();
initSectionNav();
setupListRendering();
startLiveDateRefresh();

function bindEvents() {
  el.form.addEventListener("submit", onSubmit);
  el.quickForm.addEventListener("submit", onQuickSubmit);
  el.cancelEdit.addEventListener("click", resetForm);
  el.quickAddFab.addEventListener("click", openQuickModal);
  el.quickClose.addEventListener("click", closeQuickModal);
  el.quickOverlay.addEventListener("click", closeQuickModal);
  el.quickToDetail.addEventListener("click", () => {
    closeQuickModal();
    const details = el.addSection.querySelector("details");
    if (details) details.open = true;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && el.quickModal.classList.contains("open")) closeQuickModal();
  });
  bindKeyboardShortcuts();
  el.onboardingClose.addEventListener("click", () => {
    state.onboardingDone = true;
    persist();
    renderOnboarding();
  });

  el.sampleBtn.addEventListener("click", () => {
    state.anniversaries = structuredClone(SAMPLE_ITEMS);
    persist();
    render();
    announce("サンプル記念日を読み込みました");
  });

  el.sortSelect.addEventListener("change", () => {
    state.view.sortType = el.sortSelect.value;
    persist();
    renderCards();
  });

  el.filterToggle.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-filter]");
    if (!btn) return;
    state.view.filterType = btn.dataset.filter;
    persist();
    renderCards();
  });
  el.searchInput.addEventListener("input", () => {
    state.view.searchQuery = cleanText(el.searchInput.value, 40);
    persist();
    renderCards();
  });
  el.categoryFilter.addEventListener("change", () => {
    state.view.categoryFilter = el.categoryFilter.value;
    persist();
    renderCards();
  });
  el.renderModeToggle.addEventListener("click", onRenderModeClick);
  el.listMoreBtn.addEventListener("click", () => appendNextChunk());

  el.themeToggle.addEventListener("click", () => {
    state.themeMode = nextThemeMode(state.themeMode);
    state.darkMode = state.themeMode === "dark";
    persist();
    applyTheme();
    announce(`表示テーマを${THEME_MODE_LABEL[state.themeMode]}に切り替えました`);
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
      announce("記念日を削除しました");
      return;
    }
    if (btn.dataset.action === "present") return openPresent(item);
    if (btn.dataset.action === "save") return saveCardAsImage(item, el.canvas, (text) => announce(text));
    if (btn.dataset.action === "share") return shareCard(item, el.canvas, (text) => announce(text));
  });

  el.shareMain.addEventListener("click", () => shareCard(getFeatured(), el.canvas, (text) => announce(text)));
  el.downloadMain.addEventListener("click", () => saveCardAsImage(getFeatured(), el.canvas, (text) => announce(text)));
  el.presentMain.addEventListener("click", () => openPresent(getFeatured()));
  el.floatingShare.addEventListener("click", () => shareCard(getFeatured(), el.canvas, (text) => announce(text)));
  el.presentShare.addEventListener("click", () => shareCard(getPresentingOrFeatured(), el.canvas, (text) => announce(text)));
  el.presentSave.addEventListener("click", () => saveCardAsImage(getPresentingOrFeatured(), el.canvas, (text) => announce(text)));
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
    resetListRendering();
    return;
  }

  const diff = daysFromToday(featured.date);
  const milestone = getMilestoneInfo(featured);

  const countText = formatCountLabel(diff);
  el.todayValue.textContent = countText;
  el.todayValue.setAttribute("aria-label", `${featured.title}は${countText}`);
  el.todayCaption.textContent = `${featured.title}（${ymdToJp(featured.date)}）`;
  const deltaText = getDailyDeltaLabel(featured);
  el.deltaBadge.textContent = `今日の変化: ${deltaText}`;
  el.deltaBadge.setAttribute("aria-label", `昨日との差分は${deltaText}`);
  el.deltaBadge.classList.toggle("is-positive", true);

  el.summary.innerHTML = buildSummary(featured, milestone);
  el.milestonePanel.innerHTML = buildMilestonePanel(featured, milestone);
  el.notifyList.innerHTML = buildNotifyList(featured);
  el.checkinStats.textContent = `連続チェック ${getOpenStreak()} 日`;
  renderCards();
}

function renderCards() {
  syncOperationBar();
  const today = new Date();
  const list = getVisibleAnniversaries(today);
  listRuntime.allItems = list;
  listRuntime.currentIndex = 0;
  listRuntime.hasMore = list.length > 0;
  const labelParts = [FILTER_LABEL[state.view.filterType], SORT_LABEL[state.view.sortType]];
  if (state.view.categoryFilter !== "all") labelParts.push(`カテゴリ:${CATEGORY_LABEL[state.view.categoryFilter]}`);
  if (state.view.searchQuery) labelParts.push(`検索:${state.view.searchQuery}`);
  const currentLabel = labelParts.join("・");
  el.listState.textContent = `表示状態: ${currentLabel}（${list.length}件）`;

  el.list.textContent = "";
  hideLoading();
  el.listComplete.classList.add("hidden");

  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "該当なし";
    el.list.appendChild(empty);
    updateListFooter();
    return;
  }

  const initialCount = Math.min(INITIAL_RENDER_COUNT, list.length);
  appendNextChunk(initialCount);
  updateListFooter();
}

function setupListRendering() {
  if ("IntersectionObserver" in window) {
    listRuntime.observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((entry) => entry.isIntersecting);
        if (!hit || listRuntime.renderMode !== "infinite") return;
        appendNextChunk();
      },
      { root: null, rootMargin: "0px 0px 260px 0px", threshold: 0.01 }
    );
    listRuntime.observer.observe(el.listSentinel);
  } else {
    window.addEventListener("scroll", onScrollFallback, { passive: true });
    listRuntime.fallbackBound = true;
  }
  syncRenderModeButtons();
}

function resetListRendering() {
  listRuntime.allItems = [];
  listRuntime.currentIndex = 0;
  listRuntime.hasMore = false;
  listRuntime.isAppending = false;
  el.list.textContent = "";
  hideLoading();
  updateListFooter();
}

function onRenderModeClick(event) {
  const btn = event.target.closest("button[data-mode]");
  if (!btn) return;
  const mode = btn.dataset.mode;
  if (!["infinite", "paging"].includes(mode)) return;
  if (listRuntime.renderMode === mode) return;
  listRuntime.renderMode = mode;
  syncRenderModeButtons();
  updateListFooter();
  announce(`描画モードを${mode === "infinite" ? "自動読込" : "ページ送り"}に変更しました`);
  if (mode === "infinite") onScrollFallback();
}

function syncRenderModeButtons() {
  [...el.renderModeToggle.querySelectorAll(".mode-btn")].forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.mode === listRuntime.renderMode);
    btn.setAttribute("aria-pressed", String(btn.dataset.mode === listRuntime.renderMode));
  });
}

function onScrollFallback() {
  if (listRuntime.renderMode !== "infinite" || !listRuntime.hasMore || listRuntime.isAppending) return;
  const remained = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
  if (remained <= SCROLL_FALLBACK_THRESHOLD) appendNextChunk();
}

function appendNextChunk(forcedCount) {
  if (listRuntime.isAppending || !listRuntime.hasMore) return;
  listRuntime.isAppending = true;
  showLoading();

  const amount = Number.isInteger(forcedCount) ? forcedCount : listRuntime.chunkSize;
  const next = listRuntime.allItems.slice(listRuntime.currentIndex, listRuntime.currentIndex + amount);
  if (!next.length) {
    hideLoading();
    listRuntime.hasMore = false;
    listRuntime.isAppending = false;
    updateListFooter();
    return;
  }

  const fragment = document.createDocumentFragment();
  const today = new Date();
  next.forEach((item) => fragment.appendChild(buildAnniversaryCard(item, today)));
  el.list.appendChild(fragment);

  listRuntime.currentIndex += next.length;
  listRuntime.hasMore = listRuntime.currentIndex < listRuntime.allItems.length;
  listRuntime.isAppending = false;
  hideLoading();
  updateListFooter();
}

function buildAnniversaryCard(item, today = new Date()) {
  const theme = THEMES[item.theme] || THEMES.simple;
  const diff = daysFromToday(item.date, today);
  const milestone = getMilestoneInfo(item, today);
  const urgencyClass = getUrgencyClass(diff);
  const card = document.createElement("article");
  card.className = `ann-card ${theme.className} ${urgencyClass}`.trim();
  card.setAttribute("role", "article");
  card.setAttribute("aria-label", `${item.title}、${ymdToJp(item.date)}、${formatCountLabel(diff)}`);

  card.appendChild(buildShareIconButton(item));

  const title = document.createElement("p");
  title.className = "ann-title";
  title.textContent = item.title;
  card.appendChild(title);

  const days = document.createElement("p");
  days.className = "ann-days";
  days.textContent = formatCountLabel(diff);
  card.appendChild(days);

  const date = document.createElement("p");
  date.className = "ann-date";
  date.textContent = ymdToJp(item.date);
  card.appendChild(date);

  const message = document.createElement("p");
  message.className = "ann-msg";
  message.textContent = item.message || "特別メッセージを追加できます";
  card.appendChild(message);

  const categoryTag = document.createElement("p");
  categoryTag.className = "ann-tag";
  categoryTag.textContent = CATEGORY_LABEL[item.category] || CATEGORY_LABEL.anniversary;
  card.appendChild(categoryTag);

  const miniProgress = document.createElement("div");
  miniProgress.className = "mini-progress";
  const miniLabel = document.createElement("div");
  miniLabel.className = "mini-progress-label";
  miniLabel.textContent = `次の節目: ${milestone.next}日 (${ymdToJp(milestone.nextDate)})`;
  miniProgress.appendChild(miniLabel);
  const track = document.createElement("div");
  track.className = "progress-track";
  const fill = document.createElement("div");
  fill.className = "progress-fill";
  fill.style.width = `${milestone.progressRate}%`;
  track.appendChild(fill);
  miniProgress.appendChild(track);
  card.appendChild(miniProgress);

  const actions = document.createElement("div");
  actions.className = "ann-actions";
  actions.appendChild(buildActionButton("画像保存", "save", item.id));
  actions.appendChild(buildActionButton("全画面", "present", item.id));
  actions.appendChild(buildActionButton("編集", "edit", item.id));
  actions.appendChild(buildActionButton("削除", "delete", item.id));
  card.appendChild(actions);
  return card;
}

function buildShareIconButton(item) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ann-share-btn";
  btn.dataset.action = "share";
  btn.dataset.id = item.id;
  btn.textContent = "📤";
  btn.setAttribute("aria-label", `${item.title}を共有`);
  return btn;
}

function buildActionButton(label, action, id) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn";
  btn.dataset.action = action;
  btn.dataset.id = id;
  btn.textContent = label;
  btn.setAttribute("aria-label", `${label}：${id}`);
  return btn;
}

function showLoading() {
  el.listLoading.classList.remove("hidden");
  el.listLoading.setAttribute("aria-busy", "true");
  setBusy(el.listMoreBtn, true);
}

function hideLoading() {
  el.listLoading.classList.add("hidden");
  el.listLoading.setAttribute("aria-busy", "false");
  setBusy(el.listMoreBtn, false);
}

function updateListFooter() {
  const hasItems = listRuntime.allItems.length > 0;
  const completed = hasItems && !listRuntime.hasMore;
  el.listComplete.classList.toggle("hidden", !completed);

  const showMoreBtn = hasItems && listRuntime.renderMode === "paging" && listRuntime.hasMore;
  el.listMoreBtn.classList.toggle("hidden", !showMoreBtn);
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
  const createdAt = new Date().toISOString();
  const payload = {
    id: el.annId.value || uid(),
    title: cleanText(el.annTitle.value, 40),
    date: el.annDate.value,
    message: cleanText(el.annMessage.value, 120),
    category: el.annCategory.value,
    theme: el.annTheme.value,
    createdAt
  };
  const ok = saveAnniversary(payload, el.formError);
  if (!ok) return;
  resetForm();
  el.listSection.scrollIntoView({ behavior: "smooth", block: "start" });
  el.annTitle.focus();
}

function validate(item) {
  if (!item.title) return "タイトルを入力してください";
  if (!item.date) return "日付を選択してください";
  if (!CATEGORY_LABEL[item.category]) return "カテゴリが不正です";
  if (!THEMES[item.theme]) return "テーマが不正です";
  return "";
}

function fillForm(item) {
  el.annId.value = item.id;
  el.annTitle.value = item.title;
  el.annDate.value = item.date;
  el.annMessage.value = item.message || "";
  el.annCategory.value = item.category || "anniversary";
  el.annTheme.value = item.theme || "simple";
  el.formError.textContent = "";
  const details = el.addSection.querySelector("details");
  if (details) details.open = true;
  el.addSection.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => el.annTitle.focus(), 60);
}

function resetForm() {
  el.form.reset();
  el.annId.value = "";
  el.annDate.value = toYmd(new Date());
  el.formError.textContent = "";
}

function onQuickSubmit(event) {
  event.preventDefault();
  const payload = {
    id: uid(),
    title: cleanText(el.quickTitle.value, 40),
    date: el.quickDate.value,
    message: "",
    category: el.quickCategory.value,
    theme: "simple",
    createdAt: new Date().toISOString()
  };
  const ok = saveAnniversary(payload, el.quickError);
  if (!ok) return;
  closeQuickModal();
  el.listSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function saveAnniversary(payload, errorNode) {
  const err = validate(payload);
  if (err) {
    errorNode.textContent = err;
    announce(err, "error");
    return false;
  }
  errorNode.textContent = "";
  const idx = state.anniversaries.findIndex((i) => i.id === payload.id);
  if (idx >= 0) {
    payload.createdAt = state.anniversaries[idx].createdAt;
    state.anniversaries[idx] = payload;
    announce("記念日を更新しました");
  } else {
    state.anniversaries.push(payload);
    announce("記念日を追加しました");
  }
  persist();
  render();
  return true;
}

function openQuickModal() {
  el.quickModal.classList.remove("hidden");
  el.quickModal.classList.add("open");
  el.quickModal.setAttribute("aria-hidden", "false");
  el.quickForm.reset();
  el.quickDate.value = toYmd(new Date());
  el.quickError.textContent = "";
  setTimeout(() => el.quickTitle.focus(), 30);
}

function closeQuickModal() {
  el.quickModal.classList.remove("open");
  el.quickModal.setAttribute("aria-hidden", "true");
  setTimeout(() => el.quickModal.classList.add("hidden"), 220);
  el.quickAddFab.focus();
}

function applyTheme() {
  const mode = resolveThemeMode();
  const currentTheme = getCurrentTheme(mode);
  document.documentElement.dataset.theme = currentTheme;
  el.themeToggle.textContent = currentTheme === "dark" ? "☀️" : "🌙";
  el.themeToggle.setAttribute("aria-pressed", String(currentTheme === "dark"));
  el.themeToggle.setAttribute("aria-label", `表示テーマ切替（現在: ${THEME_MODE_LABEL[mode]}）`);
}

function renderOnboarding() {
  const shouldShow = !state.onboardingDone;
  el.onboarding.classList.toggle("hidden", !shouldShow);
}

function openPresent(item) {
  if (!item) return announce("共有する記念日がありません", "error");
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

const THEME_MODE_LABEL = {
  auto: "自動",
  light: "ライト",
  dark: "ダーク"
};

function nextThemeMode(mode) {
  if (mode === "auto") return "light";
  if (mode === "light") return "dark";
  return "auto";
}

function resolveThemeMode() {
  if (!state.themeMode) {
    state.themeMode = state.darkMode ? "dark" : "auto";
  }
  return state.themeMode;
}

function getCurrentTheme(mode) {
  if (mode === "light" || mode === "dark") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getPresentingOrFeatured() {
  return state.anniversaries.find((ann) => ann.id === state.presentingId) || getFeatured();
}

function getFeatured() {
  return getNearestAnniversary(state.anniversaries);
}

const SORT_LABEL = {
  nearest: "近い順",
  farthest: "遠い順",
  created: "登録順"
};

const FILTER_LABEL = {
  all: "すべて",
  within30: "30日以内",
  within7: "7日以内"
};

const CATEGORY_LABEL = {
  birthday: "誕生日",
  event: "イベント",
  anniversary: "記念日",
  other: "その他"
};

function initViewStateFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const queryFilter = params.get("filter");
  if (["all", "within30", "within7"].includes(queryFilter)) {
    state.view.filterType = queryFilter;
  }
}

function syncOperationBar() {
  el.sortSelect.value = state.view.sortType;
  el.searchInput.value = state.view.searchQuery || "";
  el.categoryFilter.value = state.view.categoryFilter || "all";
  [...el.filterToggle.querySelectorAll(".filter-btn")].forEach((btn) => {
    const active = btn.dataset.filter === state.view.filterType;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", String(active));
  });
}

function getVisibleAnniversaries(today = new Date()) {
  const copied = [...state.anniversaries];
  const filtered = copied.filter((item) => matchFilter(item, today));
  const sorted = sortItems(filtered, state.view.sortType, today);
  syncFilterQuery(state.view.filterType);
  return sorted;
}

function matchFilter(item, today = new Date()) {
  const diff = daysFromToday(item.date, today);
  if (state.view.filterType === "within7" && (diff < 0 || diff > 7)) return false;
  if (state.view.filterType === "within30" && (diff < 0 || diff > 30)) return false;
  if (state.view.categoryFilter !== "all" && item.category !== state.view.categoryFilter) return false;
  const q = (state.view.searchQuery || "").trim().toLowerCase();
  if (q) {
    const text = `${item.title} ${item.message || ""} ${CATEGORY_LABEL[item.category] || ""}`.toLowerCase();
    if (!text.includes(q)) return false;
  }
  return true;
}

function sortItems(list, sortType, today = new Date()) {
  if (sortType === "farthest") return sortByFarthest(list, today);
  if (sortType === "created") return sortByCreated(list);
  return sortByNearest(list, today);
}

function sortByNearest(list, today = new Date()) {
  return [...list].sort((a, b) => {
    const d0 = daysFromToday(a.date, today);
    const d1 = daysFromToday(b.date, today);
    if (d0 !== d1) return d0 - d1;
    return a.date.localeCompare(b.date);
  });
}

function sortByFarthest(list, today = new Date()) {
  return [...list].sort((a, b) => {
    const d0 = daysFromToday(a.date, today);
    const d1 = daysFromToday(b.date, today);
    if (d0 !== d1) return d1 - d0;
    return b.date.localeCompare(a.date);
  });
}

function sortByCreated(list) {
  return [...list].sort((a, b) => {
    const t0 = new Date(a.createdAt || 0).getTime();
    const t1 = new Date(b.createdAt || 0).getTime();
    if (t0 !== t1) return t0 - t1;
    return a.id.localeCompare(b.id);
  });
}

function getUrgencyClass(diff) {
  const abs = Math.abs(diff);
  if (abs <= 7) return "is-near";
  if (abs <= 30) return "is-mid";
  return "";
}

function syncFilterQuery(filterType) {
  const url = new URL(window.location.href);
  if (filterType === "all") {
    url.searchParams.delete("filter");
  } else {
    url.searchParams.set("filter", filterType);
  }
  window.history.replaceState({}, "", url);
}

function startLiveDateRefresh() {
  setInterval(() => render(), 60000);
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
    const appData = appRaw ? JSON.parse(appRaw) : {};
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      appData: {
        anniversaries: Array.isArray(appData.anniversaries) ? appData.anniversaries : [],
        darkMode: !!appData.darkMode,
        themeMode: appData.themeMode || "auto",
        onboardingDone: !!appData.onboardingDone,
        usage: appData.usage || { openedDates: [] },
        view: appData.view || { sortType: "nearest", filterType: "all", categoryFilter: "all", searchQuery: "" }
      }
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
    announce("バックアップを保存しました");
  } catch {
    announce("バックアップの作成に失敗しました", "error");
  }
}

async function importBackup(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) {
    announce("復元するファイルを選択してください", "error");
    return;
  }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const appData = validateBackupData(data);
    const mode = getImportMode();
    el.backupPreview.textContent = `復元前チェック: ${appData.anniversaries.length}件 読み込み可能`;
    const modeLabel = mode === "merge" ? "追加（マージ）" : "上書き";
    const ok = window.confirm(`${appData.anniversaries.length}件を${modeLabel}で復元します。よろしいですか？`);
    if (!ok) return;
    const next = mode === "merge" ? mergeImportData(appData) : appData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    announce(`復元が完了しました（${appData.anniversaries.length}件読み込み）`);
    setTimeout(() => window.location.reload(), 350);
  } catch (error) {
    el.backupPreview.textContent = "復元前チェック: エラーあり";
    announce(`復元に失敗しました: ${error.message || "JSON形式を確認してください"}`, "error");
  }
}

function validateBackupData(data) {
  if (!data || typeof data !== "object") throw new Error("JSONがオブジェクトではありません");
  const appData = data.appData;
  if (!appData || typeof appData !== "object") throw new Error("バックアップの必須キー(appData)がありません");
  if (!Array.isArray(appData.anniversaries)) throw new Error("anniversaries が見つかりません");
  const normalizedItems = appData.anniversaries.map((item, idx) => normalizeBackupItem(item, idx));
  const usage = appData.usage && Array.isArray(appData.usage.openedDates)
    ? { openedDates: appData.usage.openedDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) }
    : { openedDates: [] };
  const view = appData.view || {};
  return {
    anniversaries: normalizedItems,
    darkMode: !!appData.darkMode,
    themeMode: ["auto", "light", "dark"].includes(appData.themeMode) ? appData.themeMode : "auto",
    onboardingDone: !!appData.onboardingDone,
    usage,
    view: {
      sortType: ["nearest", "farthest", "created"].includes(view.sortType) ? view.sortType : "nearest",
      filterType: ["all", "within30", "within7"].includes(view.filterType) ? view.filterType : "all",
      categoryFilter: ["all", "birthday", "event", "anniversary", "other"].includes(view.categoryFilter) ? view.categoryFilter : "all",
      searchQuery: cleanText(view.searchQuery || "", 40)
    }
  };
}

function normalizeBackupItem(item, idx) {
  if (!item || typeof item !== "object") throw new Error(`${idx + 1}件目: データがオブジェクトではありません`);
  if (!item.id || typeof item.id !== "string") throw new Error(`${idx + 1}件目: id が不正です`);
  if (!item.title || typeof item.title !== "string") throw new Error(`${idx + 1}件目: title が不正です`);
  if (!item.date || typeof item.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
    throw new Error(`${idx + 1}件目: date は YYYY-MM-DD が必要です`);
  }
  return {
    id: item.id,
    title: cleanText(item.title, 40),
    date: item.date,
    message: cleanText(item.message || "", 120),
    category: ["birthday", "event", "anniversary", "other"].includes(item.category) ? item.category : "anniversary",
    theme: ["simple", "romantic", "pop"].includes(item.theme) ? item.theme : "simple",
    createdAt: item.createdAt || new Date().toISOString()
  };
}

function getImportMode() {
  const checked = el.importModeRadios.find((node) => node.checked);
  return checked?.value === "merge" ? "merge" : "overwrite";
}

function mergeImportData(imported) {
  const merged = new Map();
  state.anniversaries.forEach((item) => merged.set(item.id, item));
  imported.anniversaries.forEach((item) => {
    const key = merged.has(item.id) ? uid() : item.id;
    merged.set(key, { ...item, id: key });
  });
  return {
    ...state,
    ...imported,
    anniversaries: [...merged.values()]
  };
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

function bindKeyboardShortcuts() {
  const submitOnEnter = [el.annTitle, el.annDate, el.quickTitle, el.quickDate];
  submitOnEnter.forEach((node) => {
    node.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const form = node.closest("form");
      if (!form) return;
      event.preventDefault();
      form.requestSubmit();
    });
  });
}

function announce(text, type = "success") {
  notify(el.toast, text, type);
  if (el.srStatus) el.srStatus.textContent = text;
}

function setBusy(node, isBusy) {
  if (!node) return;
  node.disabled = isBusy;
  node.classList.toggle("is-loading", isBusy);
  node.setAttribute("aria-busy", String(isBusy));
}

render();
