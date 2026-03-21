const STORAGE_KEY = "anniversary-counter-v2";
const CATEGORY_OPTIONS = ["デート", "旅行", "はじめて", "プレゼント", "その他"];
const SOON_DAYS = 7;

const todayLabel = document.getElementById("today-label");
const jumpToFormButton = document.getElementById("jump-to-form-button");
const emptyDashboard = document.getElementById("empty-dashboard");
const dashboardContent = document.getElementById("dashboard-content");
const celebrationBanner = document.getElementById("celebration-banner");
const celebrationMessage = document.getElementById("celebration-message");
const coupleTitle = document.getElementById("couple-title");
const relationshipDateText = document.getElementById("relationship-date-text");
const daysTogether = document.getElementById("days-together");
const monthlyCountdown = document.getElementById("monthly-countdown");
const monthlyNote = document.getElementById("monthly-note");
const yearlyCountdown = document.getElementById("yearly-countdown");
const yearlyNote = document.getElementById("yearly-note");
const highlightBadge = document.getElementById("highlight-badge");
const highlightTitle = document.getElementById("highlight-title");
const highlightDate = document.getElementById("highlight-date");
const highlightNote = document.getElementById("highlight-note");

const settingsForm = document.getElementById("settings-form");
const personOneNameInput = document.getElementById("person-one-name");
const personTwoNameInput = document.getElementById("person-two-name");
const relationshipDateInput = document.getElementById("relationship-date");
const settingsError = document.getElementById("settings-error");
const settingsSuccess = document.getElementById("settings-success");

const anniversaryForm = document.getElementById("anniversary-form");
const anniversaryIdInput = document.getElementById("anniversary-id");
const anniversaryNameInput = document.getElementById("anniversary-name");
const anniversaryDateInput = document.getElementById("anniversary-date");
const anniversaryCategoryInput = document.getElementById("anniversary-category");
const anniversaryMemoInput = document.getElementById("anniversary-memo");
const anniversaryError = document.getElementById("anniversary-error");
const anniversarySuccess = document.getElementById("anniversary-success");
const saveAnniversaryButton = document.getElementById("save-anniversary-button");
const cancelEditButton = document.getElementById("cancel-edit-button");

const anniversaryCount = document.getElementById("anniversary-count");
const anniversaryListEmpty = document.getElementById("anniversary-list-empty");
const anniversaryList = document.getElementById("anniversary-list");

let appState = loadAppState();

initializeApp();

function initializeApp() {
  renderTodayLabel();
  fillSettingsForm();
  renderDashboard();
  renderAnniversaryList();

  settingsForm.addEventListener("submit", handleSettingsSubmit);
  anniversaryForm.addEventListener("submit", handleAnniversarySubmit);
  cancelEditButton.addEventListener("click", resetAnniversaryForm);
  anniversaryList.addEventListener("click", handleAnniversaryAction);
  jumpToFormButton.addEventListener("click", () => {
    settingsForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function createDefaultState() {
  return {
    version: 2,
    settings: {
      personOneName: "",
      personTwoName: "",
      relationshipDate: ""
    },
    anniversaries: []
  };
}

function loadAppState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return createDefaultState();
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (error) {
    return createDefaultState();
  }
}

function normalizeState(data) {
  const defaultState = createDefaultState();
  const settings = data && typeof data === "object" ? data.settings : null;
  const anniversaries = Array.isArray(data?.anniversaries) ? data.anniversaries : [];

  return {
    version: 2,
    settings: {
      personOneName: typeof settings?.personOneName === "string" ? settings.personOneName : "",
      personTwoName: typeof settings?.personTwoName === "string" ? settings.personTwoName : "",
      relationshipDate: typeof settings?.relationshipDate === "string" ? settings.relationshipDate : ""
    },
    anniversaries: anniversaries.map(normalizeAnniversary).filter(Boolean) || defaultState.anniversaries
  };
}

function normalizeAnniversary(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const category = typeof item.category === "string" ? item.category : "その他";

  return {
    id: typeof item.id === "string" ? item.id : createId(),
    name: typeof item.name === "string" ? item.name : "",
    date: typeof item.date === "string" ? item.date : "",
    category: CATEGORY_OPTIONS.includes(category) ? category : "その他",
    memo: typeof item.memo === "string" ? item.memo : ""
  };
}

function saveAppState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function fillSettingsForm() {
  personOneNameInput.value = appState.settings.personOneName;
  personTwoNameInput.value = appState.settings.personTwoName;
  relationshipDateInput.value = appState.settings.relationshipDate;
}

function renderTodayLabel() {
  const today = getToday();
  todayLabel.textContent = `${today.getMonth() + 1}/${today.getDate()}`;
}

function handleSettingsSubmit(event) {
  event.preventDefault();
  clearMessages();

  const personOneName = personOneNameInput.value.trim();
  const personTwoName = personTwoNameInput.value.trim();
  const relationshipDate = relationshipDateInput.value;

  if (!personOneName || !personTwoName) {
    settingsError.textContent = "2人の名前を両方入力してください。";
    return;
  }

  if (!relationshipDate) {
    settingsError.textContent = "付き合った日を入力してください。";
    return;
  }

  const parsedRelationshipDate = parseLocalDate(relationshipDate);
  const today = getToday();

  if (!parsedRelationshipDate) {
    settingsError.textContent = "付き合った日の日付形式を確認してください。";
    return;
  }

  if (parsedRelationshipDate > today) {
    settingsError.textContent = "付き合った日に未来の日付は設定できません。";
    return;
  }

  appState.settings = {
    personOneName,
    personTwoName,
    relationshipDate
  };

  saveAppState();
  renderDashboard();
  settingsSuccess.textContent = "基本設定を保存しました。ダッシュボードを更新しています。";
}

function handleAnniversarySubmit(event) {
  event.preventDefault();
  anniversaryError.textContent = "";
  anniversarySuccess.textContent = "";

  const formData = {
    id: anniversaryIdInput.value,
    name: anniversaryNameInput.value.trim(),
    date: anniversaryDateInput.value,
    category: anniversaryCategoryInput.value,
    memo: anniversaryMemoInput.value.trim()
  };

  const validationMessage = validateAnniversaryForm(formData);
  if (validationMessage) {
    anniversaryError.textContent = validationMessage;
    return;
  }

  const anniversaryItem = {
    id: formData.id || createId(),
    name: formData.name,
    date: formData.date,
    category: formData.category,
    memo: formData.memo
  };

  const editIndex = appState.anniversaries.findIndex((item) => item.id === anniversaryItem.id);

  if (editIndex >= 0) {
    appState.anniversaries[editIndex] = anniversaryItem;
    anniversarySuccess.textContent = "記念日を更新しました。";
  } else {
    appState.anniversaries.push(anniversaryItem);
    anniversarySuccess.textContent = "記念日を追加しました。";
  }

  saveAppState();
  renderDashboard();
  renderAnniversaryList();
  resetAnniversaryForm();
}

function validateAnniversaryForm(formData) {
  if (!appState.settings.relationshipDate) {
    return "先に基本設定を保存してください。";
  }

  if (!formData.name) {
    return "記念日の名前を入力してください。";
  }

  if (!formData.date) {
    return "記念日の日付を入力してください。";
  }

  if (!parseLocalDate(formData.date)) {
    return "記念日の日付形式を確認してください。";
  }

  if (!CATEGORY_OPTIONS.includes(formData.category)) {
    return "カテゴリを選択してください。";
  }

  return "";
}

function handleAnniversaryAction(event) {
  const editButton = event.target.closest("[data-edit-id]");
  const deleteButton = event.target.closest("[data-delete-id]");

  if (editButton) {
    startEditAnniversary(editButton.dataset.editId);
    return;
  }

  if (deleteButton) {
    deleteAnniversary(deleteButton.dataset.deleteId);
  }
}

function startEditAnniversary(targetId) {
  const targetItem = appState.anniversaries.find((item) => item.id === targetId);

  if (!targetItem) {
    return;
  }

  anniversaryIdInput.value = targetItem.id;
  anniversaryNameInput.value = targetItem.name;
  anniversaryDateInput.value = targetItem.date;
  anniversaryCategoryInput.value = targetItem.category;
  anniversaryMemoInput.value = targetItem.memo;
  saveAnniversaryButton.textContent = "記念日を更新";
  cancelEditButton.classList.remove("hidden");
  anniversarySuccess.textContent = "編集モードです。内容を更新して保存してください。";
  anniversaryError.textContent = "";
  anniversaryForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetAnniversaryForm() {
  anniversaryForm.reset();
  anniversaryIdInput.value = "";
  saveAnniversaryButton.textContent = "記念日を追加";
  cancelEditButton.classList.add("hidden");
}

function deleteAnniversary(targetId) {
  const targetItem = appState.anniversaries.find((item) => item.id === targetId);

  if (!targetItem) {
    return;
  }

  const confirmed = window.confirm(`「${targetItem.name}」を削除しますか？`);
  if (!confirmed) {
    return;
  }

  appState.anniversaries = appState.anniversaries.filter((item) => item.id !== targetId);
  saveAppState();
  renderDashboard();
  renderAnniversaryList();
  anniversarySuccess.textContent = "記念日を削除しました。";

  if (anniversaryIdInput.value === targetId) {
    resetAnniversaryForm();
  }
}

function renderDashboard() {
  const settings = appState.settings;

  if (!settings.personOneName || !settings.personTwoName || !settings.relationshipDate) {
    emptyDashboard.classList.remove("hidden");
    dashboardContent.classList.add("hidden");
    celebrationBanner.classList.add("hidden");
    renderHighlightCard(null);
    return;
  }

  const relationshipDate = parseLocalDate(settings.relationshipDate);
  const today = getToday();

  if (!relationshipDate || relationshipDate > today) {
    emptyDashboard.classList.remove("hidden");
    dashboardContent.classList.add("hidden");
    celebrationBanner.classList.add("hidden");
    return;
  }

  emptyDashboard.classList.add("hidden");
  dashboardContent.classList.remove("hidden");

  const totalDays = getDaysBetween(relationshipDate, today) + 1;
  const nextMonthlyDate = getNextMonthlyAnniversary(relationshipDate, today);
  const nextYearlyDate = getNextYearlyAnniversary(relationshipDate, today);
  const monthlyRemainingDays = getDaysBetween(today, nextMonthlyDate);
  const yearlyRemainingDays = getDaysBetween(today, nextYearlyDate);

  coupleTitle.textContent = `${settings.personOneName} と ${settings.personTwoName}`;
  relationshipDateText.textContent = `${formatDateForDisplay(settings.relationshipDate)}からスタート`;
  daysTogether.textContent = `${totalDays}日`;
  monthlyCountdown.textContent = formatRemainingDays(monthlyRemainingDays);
  yearlyCountdown.textContent = formatRemainingDays(yearlyRemainingDays);
  monthlyNote.textContent = buildRelationshipAnniversaryText(monthlyRemainingDays, nextMonthlyDate, "月記念日");
  yearlyNote.textContent = buildRelationshipAnniversaryText(yearlyRemainingDays, nextYearlyDate, "年記念日");

  const todayEvents = getTodayEvents();
  renderCelebration(todayEvents, monthlyRemainingDays, yearlyRemainingDays, settings);
  renderHighlightCard(getNearestAnniversary());
}

function renderCelebration(todayEvents, monthlyRemainingDays, yearlyRemainingDays, settings) {
  const messages = [];

  if (monthlyRemainingDays === 0) {
    messages.push("今日は月記念日です");
  }

  if (yearlyRemainingDays === 0) {
    messages.push("今日は年記念日です");
  }

  if (todayEvents.length > 0) {
    messages.push(`今日は「${todayEvents[0].name}」の日です`);
  }

  if (messages.length === 0) {
    celebrationBanner.classList.add("hidden");
    return;
  }

  celebrationMessage.textContent = `${settings.personOneName}さんと${settings.personTwoName}さん、おめでとうございます。${messages.join("。") }。`;
  celebrationBanner.classList.remove("hidden");
}

function renderHighlightCard(item) {
  if (!item) {
    highlightBadge.textContent = "準備中";
    highlightBadge.className = "badge";
    highlightTitle.textContent = "記念日を登録するとここに表示されます。";
    highlightDate.textContent = "次に近い任意記念日を自動でピックアップします。";
    highlightNote.textContent = "カテゴリやメモもあわせて見返せます。";
    return;
  }

  const relativeText = item.isToday
    ? "今日の記念日です。"
    : item.daysUntil <= SOON_DAYS
      ? `あと${item.daysUntil}日でやってきます。`
      : `あと${item.daysUntil}日です。`;

  highlightBadge.textContent = item.isToday ? "今日" : item.daysUntil <= SOON_DAYS ? "まもなく" : item.category;
  highlightBadge.className = `badge ${item.isToday ? "badge--today" : item.daysUntil <= SOON_DAYS ? "badge--soon" : "badge--accent"}`;
  highlightTitle.textContent = item.name;
  highlightDate.textContent = `${formatDateForDisplay(item.date)} ・ ${item.category}`;
  highlightNote.textContent = item.memo ? `${relativeText} メモ：${item.memo}` : relativeText;
}

function renderAnniversaryList() {
  const sortedItems = getSortedAnniversaries();
  anniversaryList.innerHTML = "";
  anniversaryCount.textContent = `${sortedItems.length}件`;

  if (sortedItems.length === 0) {
    anniversaryListEmpty.classList.remove("hidden");
    return;
  }

  anniversaryListEmpty.classList.add("hidden");

  sortedItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "memory-card";

    const top = document.createElement("div");
    top.className = "memory-card__top";

    const left = document.createElement("div");
    const category = document.createElement("p");
    category.className = "memory-card__category";
    category.textContent = item.category;

    const title = document.createElement("h3");
    title.className = "memory-card__title";
    title.textContent = item.name;

    left.append(category, title);

    const right = document.createElement("div");
    right.className = "memory-card__date-wrap";

    const dateLabel = document.createElement("p");
    dateLabel.className = "memory-card__date-label";
    dateLabel.textContent = "Date";

    const date = document.createElement("div");
    date.className = "memory-card__date";
    date.textContent = formatDateForDisplay(item.date);

    right.append(dateLabel, date);
    top.append(left, right);

    const meta = document.createElement("p");
    meta.className = "memory-card__meta";
    meta.textContent = buildAnniversaryMeta(item);

    const badgeRow = document.createElement("div");
    badgeRow.className = "hero-tags";
    badgeRow.appendChild(createStatusBadge(item));

    if (item.memo) {
      const memo = document.createElement("p");
      memo.className = "memory-card__memo";
      memo.textContent = `メモ：${item.memo}`;
      card.append(top, badgeRow, meta, memo, createActionRow(item.id));
    } else {
      card.append(top, badgeRow, meta, createActionRow(item.id));
    }

    anniversaryList.appendChild(card);
  });
}

function createStatusBadge(item) {
  const status = document.createElement("span");
  status.className = "badge";

  if (item.isToday) {
    status.classList.add("badge--today");
    status.textContent = "今日";
    return status;
  }

  if (item.daysUntil <= SOON_DAYS) {
    status.classList.add("badge--soon");
    status.textContent = "まもなく";
    return status;
  }

  status.textContent = `あと${item.daysUntil}日`;
  return status;
}

function createActionRow(itemId) {
  const row = document.createElement("div");
  row.className = "memory-card__actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "icon-button";
  editButton.dataset.editId = itemId;
  editButton.textContent = "編集";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-button icon-button--danger";
  deleteButton.dataset.deleteId = itemId;
  deleteButton.textContent = "削除";

  row.append(editButton, deleteButton);
  return row;
}

function getSortedAnniversaries() {
  const today = getToday();

  return [...appState.anniversaries]
    .map((item) => {
      const nextDate = getNextOccurrence(parseLocalDate(item.date), today);
      const daysUntil = getDaysBetween(today, nextDate);

      return {
        ...item,
        nextDate,
        daysUntil,
        isToday: daysUntil === 0
      };
    })
    .sort((a, b) => {
      if (a.daysUntil !== b.daysUntil) {
        return a.daysUntil - b.daysUntil;
      }
      return a.name.localeCompare(b.name, "ja");
    });
}

function getNearestAnniversary() {
  const sorted = getSortedAnniversaries();
  return sorted[0] || null;
}

function getTodayEvents() {
  return getSortedAnniversaries().filter((item) => item.isToday);
}

function buildRelationshipAnniversaryText(daysRemaining, targetDate, label) {
  if (daysRemaining === 0) {
    return `今日は${label}です。`;
  }

  return `${formatDateForDisplay(formatDateToInputValue(targetDate))}です。`;
}

function buildAnniversaryMeta(item) {
  if (item.isToday) {
    return "今日はこの記念日当日です。";
  }

  return `次は${formatDateForDisplay(formatDateToInputValue(item.nextDate))}で、あと${item.daysUntil}日です。`;
}

function clearMessages() {
  settingsError.textContent = "";
  settingsSuccess.textContent = "";
}

function formatRemainingDays(days) {
  return days === 0 ? "今日です" : `あと${days}日`;
}

function getNextMonthlyAnniversary(baseDate, today) {
  const candidate = createAdjustedDate(today.getFullYear(), today.getMonth(), baseDate.getDate());
  if (candidate >= today) {
    return candidate;
  }
  return createAdjustedDate(today.getFullYear(), today.getMonth() + 1, baseDate.getDate());
}

function getNextYearlyAnniversary(baseDate, today) {
  const candidate = createAdjustedDate(today.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  if (candidate >= today) {
    return candidate;
  }
  return createAdjustedDate(today.getFullYear() + 1, baseDate.getMonth(), baseDate.getDate());
}

function getNextOccurrence(originalDate, today) {
  if (!originalDate) {
    return today;
  }

  const candidate = createAdjustedDate(today.getFullYear(), originalDate.getMonth(), originalDate.getDate());
  if (candidate >= today) {
    return candidate;
  }
  return createAdjustedDate(today.getFullYear() + 1, originalDate.getMonth(), originalDate.getDate());
}

function createAdjustedDate(year, monthIndex, day) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, lastDay));
}

function parseLocalDate(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getDaysBetween(startDate, endDate) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((endDate - startDate) / oneDay);
}

function formatDateForDisplay(value) {
  const date = value instanceof Date ? value : parseLocalDate(value);
  if (!date) {
    return "-";
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatDateToInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
