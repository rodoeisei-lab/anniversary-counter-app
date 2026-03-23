const STORAGE_KEY = "anniversary-counter-app-v2";
const CATEGORY_OPTIONS = ["デート", "旅行", "はじめて", "プレゼント", "その他"];
const THEMES = [
  { value: "blue", label: "やさしい青" },
  { value: "pink", label: "ピンク" },
  { value: "lavender", label: "ラベンダー" }
];

const defaultState = () => ({
  version: 2,
  settings: {
    personOne: "",
    personTwo: "",
    relationshipDate: "",
    theme: "blue"
  },
  anniversaries: [],
  ui: {
    lastScreen: "home"
  }
});

const elements = {
  screens: Array.from(document.querySelectorAll(".screen")),
  navButtons: Array.from(document.querySelectorAll("[data-nav]")),
  headerAddButton: document.getElementById("header-add-button"),
  todayLabel: document.getElementById("today-label"),
  homePairNames: document.getElementById("home-pair-names"),
  homeDateLabel: document.getElementById("home-date-label"),
  homeEmptyState: document.getElementById("home-empty-state"),
  homeContent: document.getElementById("home-content"),
  emptyGoSettings: document.getElementById("empty-go-settings"),
  emptyGoAdd: document.getElementById("empty-go-add"),
  daysTogether: document.getElementById("days-together"),
  nextMonthlyCount: document.getElementById("next-monthly-count"),
  nextMonthlyDate: document.getElementById("next-monthly-date"),
  nextYearlyCount: document.getElementById("next-yearly-count"),
  nextYearlyDate: document.getElementById("next-yearly-date"),
  specialMessageCard: document.getElementById("special-message-card"),
  specialMessageTitle: document.getElementById("special-message-title"),
  specialMessageBody: document.getElementById("special-message-body"),
  homeNextAnniversary: document.getElementById("home-next-anniversary"),
  searchInput: document.getElementById("search-input"),
  categoryFilter: document.getElementById("category-filter"),
  anniversaryList: document.getElementById("anniversary-list"),
  listEmptyState: document.getElementById("list-empty-state"),
  listGoAdd: document.getElementById("list-go-add"),
  anniversaryForm: document.getElementById("anniversary-form"),
  editingId: document.getElementById("editing-id"),
  editorTitle: document.getElementById("editor-title"),
  anniversaryName: document.getElementById("anniversary-name"),
  anniversaryDate: document.getElementById("anniversary-date"),
  anniversaryCategory: document.getElementById("anniversary-category"),
  anniversaryNote: document.getElementById("anniversary-note"),
  anniversaryNameError: document.getElementById("anniversary-name-error"),
  anniversaryDateError: document.getElementById("anniversary-date-error"),
  anniversaryCategoryError: document.getElementById("anniversary-category-error"),
  editorMessage: document.getElementById("editor-message"),
  cancelEditButton: document.getElementById("cancel-edit-button"),
  saveAndHomeButton: document.getElementById("save-and-home-button"),
  settingsForm: document.getElementById("settings-form"),
  personOne: document.getElementById("person-one"),
  personTwo: document.getElementById("person-two"),
  relationshipDate: document.getElementById("relationship-date"),
  personOneError: document.getElementById("person-one-error"),
  personTwoError: document.getElementById("person-two-error"),
  relationshipDateError: document.getElementById("relationship-date-error"),
  settingsMessage: document.getElementById("settings-message"),
  themeOptions: document.getElementById("theme-options"),
  exportButton: document.getElementById("export-button"),
  importInput: document.getElementById("import-input"),
  backupMessage: document.getElementById("backup-message"),
  toast: document.getElementById("toast"),
  confirmDialog: document.getElementById("confirm-dialog"),
  confirmDialogText: document.getElementById("confirm-dialog-text"),
  confirmDeleteButton: document.getElementById("confirm-delete-button")
};

let state = loadState();
let activeScreen = state.ui.lastScreen || "home";
let deleteTargetId = "";
let afterSaveDestination = "list";
let toastTimer = null;

init();

function init() {
  setupStaticOptions();
  bindEvents();
  fillSettingsForm();
  resetEditor();
  navigate(activeScreen, false);
  render();
}

function setupStaticOptions() {
  elements.anniversaryCategory.innerHTML = CATEGORY_OPTIONS.map(
    (category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
  ).join("");

  elements.categoryFilter.innerHTML = [
    '<option value="all">すべて</option>',
    ...CATEGORY_OPTIONS.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
  ].join("");

  elements.themeOptions.innerHTML = THEMES.map(
    (theme) => `
      <button class="theme-chip${state.settings.theme === theme.value ? " is-active" : ""}" type="button" data-theme="${theme.value}">
        ${theme.label}
      </button>
    `
  ).join("");

  applyTheme(state.settings.theme);
}

function bindEvents() {
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.nav || "home"));
  });

  elements.headerAddButton.addEventListener("click", () => {
    resetEditor();
    navigate("editor");
  });
  elements.emptyGoSettings.addEventListener("click", () => navigate("settings"));
  elements.emptyGoAdd.addEventListener("click", () => navigate("editor"));
  elements.listGoAdd.addEventListener("click", () => {
    resetEditor();
    navigate("editor");
  });

  elements.searchInput.addEventListener("input", renderList);
  elements.categoryFilter.addEventListener("change", renderList);
  elements.anniversaryForm.addEventListener("submit", (event) => handleAnniversarySubmit(event, afterSaveDestination));
  elements.saveAndHomeButton.addEventListener("click", () => {
    afterSaveDestination = "home";
    elements.anniversaryForm.requestSubmit();
  });
  elements.cancelEditButton.addEventListener("click", resetEditor);
  elements.settingsForm.addEventListener("submit", handleSettingsSubmit);
  elements.exportButton.addEventListener("click", exportBackup);
  elements.importInput.addEventListener("change", importBackup);
  elements.themeOptions.addEventListener("click", handleThemeSelect);
  elements.anniversaryList.addEventListener("click", handleListAction);
  elements.confirmDeleteButton.addEventListener("click", confirmDeletion);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch (_error) {
    return defaultState();
  }
}

function normalizeState(source) {
  const base = defaultState();
  const incoming = source && typeof source === "object" ? source : {};
  const settings = incoming.settings && typeof incoming.settings === "object" ? incoming.settings : {};
  const anniversaries = Array.isArray(incoming.anniversaries)
    ? incoming.anniversaries.map(normalizeAnniversary).filter(Boolean)
    : [];

  return {
    version: 2,
    settings: {
      personOne: sanitizeText(settings.personOne, 20),
      personTwo: sanitizeText(settings.personTwo, 20),
      relationshipDate: isValidDateString(settings.relationshipDate) ? settings.relationshipDate : "",
      theme: THEMES.some((theme) => theme.value === settings.theme) ? settings.theme : base.settings.theme
    },
    anniversaries,
    ui: {
      lastScreen: ["home", "list", "editor", "settings"].includes(incoming.ui?.lastScreen)
        ? incoming.ui.lastScreen
        : "home"
    }
  };
}

function normalizeAnniversary(item) {
  if (!item || typeof item !== "object") return null;
  const title = sanitizeText(item.title, 40);
  const date = isValidDateString(item.date) ? item.date : "";
  const category = CATEGORY_OPTIONS.includes(item.category) ? item.category : "その他";
  if (!title || !date) return null;

  return {
    id: typeof item.id === "string" && item.id ? item.id : createId(),
    title,
    date,
    category,
    note: sanitizeText(item.note, 160),
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
  };
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function navigate(screen, save = true) {
  activeScreen = ["home", "list", "editor", "settings"].includes(screen) ? screen : "home";
  elements.screens.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.screen === activeScreen);
  });
  elements.navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.nav === activeScreen);
  });

  if (save) {
    state.ui.lastScreen = activeScreen;
    persist();
  }
}

function render() {
  elements.todayLabel.textContent = formatTodayLabel();
  renderHome();
  renderList();
  fillSettingsForm();
  syncThemeButtons();
}

function renderHome() {
  const hasSettings = Boolean(state.settings.personOne && state.settings.personTwo && state.settings.relationshipDate);
  const hasAnniversaries = state.anniversaries.length > 0;

  elements.homePairNames.textContent = hasSettings
    ? `${state.settings.personOne} × ${state.settings.personTwo}`
    : "名前を設定してください";
  elements.homeDateLabel.textContent = hasSettings
    ? `付き合った日：${formatJapaneseDate(state.settings.relationshipDate)}`
    : "設定画面から付き合った日を登録できます。";

  elements.homeEmptyState.classList.toggle("hidden", hasSettings && hasAnniversaries);
  elements.homeContent.classList.toggle("hidden", !(hasSettings || hasAnniversaries));

  if (hasSettings) {
    const relationship = getRelationshipSummary(state.settings.relationshipDate);
    elements.daysTogether.textContent = `${relationship.daysTogether}日`;
    elements.nextMonthlyCount.textContent = relationship.monthly.daysUntil === 0 ? "今日" : `あと${relationship.monthly.daysUntil}日`;
    elements.nextMonthlyDate.textContent = `${formatJapaneseDate(relationship.monthly.date)} ・ ${relationship.monthly.label}`;
    elements.nextYearlyCount.textContent = relationship.yearly.daysUntil === 0 ? "今日" : `あと${relationship.yearly.daysUntil}日`;
    elements.nextYearlyDate.textContent = `${formatJapaneseDate(relationship.yearly.date)} ・ ${relationship.yearly.label}`;
    renderSpecialMessage(relationship);
  } else {
    elements.daysTogether.textContent = "--";
    elements.nextMonthlyCount.textContent = "あと--日";
    elements.nextMonthlyDate.textContent = "設定後に表示されます";
    elements.nextYearlyCount.textContent = "あと--日";
    elements.nextYearlyDate.textContent = "設定後に表示されます";
    elements.specialMessageCard.classList.add("hidden");
  }

  renderHomeNextAnniversary();
}

function renderSpecialMessage(relationship) {
  const messages = [];
  if (relationship.monthly.daysUntil === 0) {
    messages.push(`今日は${relationship.monthly.label}です。小さなお祝いでも十分に特別な日です。`);
  }
  if (relationship.yearly.daysUntil === 0) {
    messages.push(`今日は${relationship.yearly.label}です。節目の1日をゆっくり楽しみましょう。`);
  }

  if (messages.length === 0) {
    elements.specialMessageCard.classList.add("hidden");
    return;
  }

  elements.specialMessageTitle.textContent = "今日は特別な日です";
  elements.specialMessageBody.textContent = messages.join(" ");
  elements.specialMessageCard.classList.remove("hidden");
}

function renderHomeNextAnniversary() {
  const upcoming = getFilteredAnniversaries();
  const nextItem = upcoming[0];

  if (!nextItem) {
    elements.homeNextAnniversary.innerHTML = `
      <div class="next-card">
        <p class="next-card__title">まだ記念日がありません</p>
        <p class="muted-text">追加タブから、初デートや旅行などを登録してみましょう。</p>
      </div>
    `;
    return;
  }

  const status = getBadgeInfo(nextItem.daysUntil);
  elements.homeNextAnniversary.innerHTML = `
    <div class="next-card">
      <div class="next-card__top">
        <div>
          <p class="next-card__title">${escapeHtml(nextItem.title)}</p>
          <p class="list-card__meta">${escapeHtml(nextItem.category)} ・ ${formatJapaneseDate(nextItem.date)}</p>
        </div>
        <span class="count-pill">${nextItem.daysUntil === 0 ? "今日" : `あと${nextItem.daysUntil}日`}</span>
      </div>
      <p class="muted-text">${escapeHtml(nextItem.note || "メモはまだありません。")}</p>
      ${status ? `<span class="badge ${status.className}">${status.label}</span>` : ""}
    </div>
  `;
}

function renderList() {
  const query = sanitizeText(elements.searchInput.value, 80).toLowerCase();
  const filter = elements.categoryFilter.value || "all";
  const items = getFilteredAnniversaries().filter((item) => {
    const matchedQuery = !query || [item.title, item.note, item.category].join(" ").toLowerCase().includes(query);
    const matchedCategory = filter === "all" || item.category === filter;
    return matchedQuery && matchedCategory;
  });

  elements.listEmptyState.classList.toggle("hidden", state.anniversaries.length > 0);

  if (items.length === 0) {
    elements.anniversaryList.innerHTML = state.anniversaries.length
      ? `
        <section class="empty-state card">
          <h3>条件に合う記念日が見つかりません</h3>
          <p>検索語やカテゴリを変えてみてください。</p>
        </section>
      `
      : "";
    return;
  }

  elements.anniversaryList.innerHTML = items
    .map((item) => {
      const badge = getBadgeInfo(item.daysUntil);
      return `
        <details class="list-card card" ${item.daysUntil <= 7 ? "open" : ""}>
          <summary class="list-card__summary">
            <div class="list-card__top">
              <div>
                <p class="list-card__title">${escapeHtml(item.title)}</p>
                <p class="list-card__meta">${formatJapaneseDate(item.date)} ・ ${escapeHtml(item.category)}</p>
              </div>
              <div>
                <span class="count-pill">${item.daysUntil === 0 ? "今日" : `あと${item.daysUntil}日`}</span>
                ${badge ? `<span class="badge ${badge.className}">${badge.label}</span>` : ""}
              </div>
            </div>
          </summary>
          <div class="list-card__details">
            <p class="detail-row">次回表示基準: ${formatJapaneseDate(item.nextDate)}</p>
            <p class="detail-row">メモ: ${escapeHtml(item.note || "未入力")}</p>
            <div class="list-card__actions">
              <button class="text-button text-button--edit" type="button" data-action="edit" data-id="${item.id}">編集</button>
              <button class="text-button text-button--delete" type="button" data-action="delete" data-id="${item.id}">削除</button>
            </div>
          </div>
        </details>
      `;
    })
    .join("");
}

function handleAnniversarySubmit(event, destination) {
  event.preventDefault();
  clearEditorErrors();

  const payload = {
    id: elements.editingId.value,
    title: sanitizeText(elements.anniversaryName.value, 40),
    date: elements.anniversaryDate.value,
    category: elements.anniversaryCategory.value,
    note: sanitizeText(elements.anniversaryNote.value, 160)
  };

  const errors = {};
  if (!payload.title) errors.title = "記念日名を入力してください。";
  if (!isValidDateString(payload.date)) errors.date = "日付を選択してください。";
  if (!CATEGORY_OPTIONS.includes(payload.category)) errors.category = "カテゴリを選んでください。";

  if (Object.keys(errors).length > 0) {
    elements.anniversaryNameError.textContent = errors.title || "";
    elements.anniversaryDateError.textContent = errors.date || "";
    elements.anniversaryCategoryError.textContent = errors.category || "";
    elements.editorMessage.textContent = "入力内容を確認してください。";
    return;
  }

  if (payload.id) {
    state.anniversaries = state.anniversaries.map((item) =>
      item.id === payload.id ? { ...item, title: payload.title, date: payload.date, category: payload.category, note: payload.note } : item
    );
    showToast("記念日を更新しました。");
  } else {
    state.anniversaries.unshift({
      id: createId(),
      title: payload.title,
      date: payload.date,
      category: payload.category,
      note: payload.note,
      createdAt: new Date().toISOString()
    });
    showToast("記念日を追加しました。");
  }

  persist();
  resetEditor();
  render();
  navigate(destination || "list");
  afterSaveDestination = "list";
}

function handleSettingsSubmit(event) {
  event.preventDefault();
  clearSettingsErrors();

  const payload = {
    personOne: sanitizeText(elements.personOne.value, 20),
    personTwo: sanitizeText(elements.personTwo.value, 20),
    relationshipDate: elements.relationshipDate.value
  };

  const errors = {};
  if (!payload.personOne) errors.personOne = "1人目の名前を入力してください。";
  if (!payload.personTwo) errors.personTwo = "2人目の名前を入力してください。";
  if (!isValidDateString(payload.relationshipDate)) errors.relationshipDate = "付き合った日を入力してください。";
  if (payload.relationshipDate && payload.relationshipDate > todayIso()) {
    errors.relationshipDate = "未来の日付は設定できません。";
  }

  if (Object.keys(errors).length > 0) {
    elements.personOneError.textContent = errors.personOne || "";
    elements.personTwoError.textContent = errors.personTwo || "";
    elements.relationshipDateError.textContent = errors.relationshipDate || "";
    elements.settingsMessage.textContent = "設定内容を確認してください。";
    return;
  }

  state.settings = {
    ...state.settings,
    ...payload
  };
  persist();
  render();
  showToast("基本設定を保存しました。");
  elements.settingsMessage.textContent = "保存しました。";
}

function handleThemeSelect(event) {
  const button = event.target.closest("[data-theme]");
  if (!button) return;
  state.settings.theme = button.dataset.theme;
  applyTheme(state.settings.theme);
  syncThemeButtons();
  persist();
  showToast("テーマを変更しました。");
}

function handleListAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const target = state.anniversaries.find((item) => item.id === button.dataset.id);
  if (!target) return;

  if (button.dataset.action === "edit") {
    openEditor(target);
    return;
  }

  if (button.dataset.action === "delete") {
    requestDelete(target);
  }
}

function openEditor(item) {
  elements.editingId.value = item.id;
  elements.anniversaryName.value = item.title;
  elements.anniversaryDate.value = item.date;
  elements.anniversaryCategory.value = item.category;
  elements.anniversaryNote.value = item.note;
  elements.editorTitle.textContent = "記念日を編集";
  elements.cancelEditButton.classList.remove("hidden");
  elements.editorMessage.textContent = "";
  navigate("editor");
}

function resetEditor() {
  elements.anniversaryForm.reset();
  elements.editingId.value = "";
  elements.editorTitle.textContent = "新しい記念日を追加";
  elements.cancelEditButton.classList.add("hidden");
  elements.anniversaryCategory.value = CATEGORY_OPTIONS[0];
  clearEditorErrors();
  elements.editorMessage.textContent = "";
  afterSaveDestination = "list";
}

function fillSettingsForm() {
  elements.personOne.value = state.settings.personOne;
  elements.personTwo.value = state.settings.personTwo;
  elements.relationshipDate.value = state.settings.relationshipDate;
}

function clearEditorErrors() {
  elements.anniversaryNameError.textContent = "";
  elements.anniversaryDateError.textContent = "";
  elements.anniversaryCategoryError.textContent = "";
}

function clearSettingsErrors() {
  elements.personOneError.textContent = "";
  elements.personTwoError.textContent = "";
  elements.relationshipDateError.textContent = "";
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `anniversary-backup-${todayIso()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  elements.backupMessage.textContent = "JSONバックアップを書き出しました。";
  showToast("JSONバックアップを書き出しました。");
}

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = normalizeState(JSON.parse(String(reader.result || "{}")));
      state = imported;
      persist();
      fillSettingsForm();
      resetEditor();
      render();
      navigate(state.ui.lastScreen || "home");
      elements.backupMessage.textContent = "JSONバックアップを復元しました。";
      showToast("JSONバックアップを復元しました。");
    } catch (_error) {
      elements.backupMessage.textContent = "JSONの読み込みに失敗しました。";
    } finally {
      elements.importInput.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

function requestDelete(item) {
  deleteTargetId = item.id;
  elements.confirmDialogText.textContent = `「${item.title}」を削除します。削除すると元に戻せません。`;
  if (typeof elements.confirmDialog.showModal === "function") {
    elements.confirmDialog.showModal();
  } else if (window.confirm(`「${item.title}」を削除しますか？`)) {
    confirmDeletion();
  }
}

function confirmDeletion() {
  if (!deleteTargetId) return;
  state.anniversaries = state.anniversaries.filter((item) => item.id !== deleteTargetId);
  deleteTargetId = "";
  persist();
  render();
  if (elements.confirmDialog.open) {
    elements.confirmDialog.close();
  }
  showToast("記念日を削除しました。");
}

function syncThemeButtons() {
  Array.from(elements.themeOptions.querySelectorAll("[data-theme]")).forEach((button) => {
    button.classList.toggle("is-active", button.dataset.theme === state.settings.theme);
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "blue" ? "" : theme;
  if (theme === "blue") {
    document.documentElement.removeAttribute("data-theme");
  }
}

function getFilteredAnniversaries() {
  const today = stripTime(new Date());
  return state.anniversaries
    .map((item) => {
      const nextDate = getNextOccurrence(item.date, today);
      const daysUntil = diffDays(today, nextDate);
      return { ...item, nextDate: formatIso(nextDate), daysUntil };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil || a.title.localeCompare(b.title, "ja"));
}

function getRelationshipSummary(relationshipDate) {
  const start = parseLocalDate(relationshipDate);
  const today = stripTime(new Date());
  const daysTogether = diffDays(start, today) + 1;
  const monthlyDate = getNextMonthlyAnniversary(start, today);
  const yearlyDate = getNextYearlyAnniversary(start, today);

  return {
    daysTogether,
    monthly: {
      date: formatIso(monthlyDate),
      daysUntil: diffDays(today, monthlyDate),
      label: `${monthDiff(start, monthlyDate)}か月記念日`
    },
    yearly: {
      date: formatIso(yearlyDate),
      daysUntil: diffDays(today, yearlyDate),
      label: `${yearlyDate.getFullYear() - start.getFullYear()}周年`
    }
  };
}

function getNextMonthlyAnniversary(start, today) {
  let monthOffset = monthDiff(start, today);
  let candidate = buildMonthAnniversary(start, monthOffset);
  if (candidate < today) {
    monthOffset += 1;
    candidate = buildMonthAnniversary(start, monthOffset);
  }
  return candidate;
}

function getNextYearlyAnniversary(start, today) {
  let year = today.getFullYear();
  let candidate = new Date(year, start.getMonth(), Math.min(start.getDate(), daysInMonth(year, start.getMonth())));
  if (candidate < today) {
    year += 1;
    candidate = new Date(year, start.getMonth(), Math.min(start.getDate(), daysInMonth(year, start.getMonth())));
  }
  return stripTime(candidate);
}

function getNextOccurrence(dateString, referenceDate) {
  const original = parseLocalDate(dateString);
  let candidate = new Date(
    referenceDate.getFullYear(),
    original.getMonth(),
    Math.min(original.getDate(), daysInMonth(referenceDate.getFullYear(), original.getMonth()))
  );

  if (candidate < referenceDate) {
    candidate = new Date(
      referenceDate.getFullYear() + 1,
      original.getMonth(),
      Math.min(original.getDate(), daysInMonth(referenceDate.getFullYear() + 1, original.getMonth()))
    );
  }

  return stripTime(candidate);
}

function buildMonthAnniversary(start, monthOffset) {
  const year = start.getFullYear() + Math.floor((start.getMonth() + monthOffset) / 12);
  const month = (start.getMonth() + monthOffset) % 12;
  return stripTime(new Date(year, month, Math.min(start.getDate(), daysInMonth(year, month))));
}

function monthDiff(start, end) {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function getBadgeInfo(daysUntil) {
  if (daysUntil === 0) return { label: "今日", className: "badge--today" };
  if (daysUntil <= 7) return { label: "まもなく", className: "badge--soon" };
  return null;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2200);
}

function formatTodayLabel() {
  const date = new Date();
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatJapaneseDate(dateString) {
  const date = parseLocalDate(dateString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return stripTime(new Date(year, month - 1, day));
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffDays(from, to) {
  return Math.round((stripTime(to) - stripTime(from)) / 86400000);
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function todayIso() {
  return formatIso(new Date());
}

function formatIso(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function sanitizeText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = parseLocalDate(value);
  return formatIso(date) === value;
}

function createId() {
  return `anv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
