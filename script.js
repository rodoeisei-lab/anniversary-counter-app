const STORAGE_KEY = "anniversary-counter-v21";
const CATEGORY_OPTIONS = ["デート", "旅行", "はじめて", "プレゼント", "その他"];
const SOON_DAYS = 7;

const todayLabel = document.getElementById("today-label");
const jumpToSettingsButton = document.getElementById("jump-to-settings-button");
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

const exportButton = document.getElementById("export-button");
const importFileInput = document.getElementById("import-file");
const backupMessage = document.getElementById("backup-message");

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
  jumpToSettingsButton.addEventListener("click", () => {
    settingsForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  exportButton.addEventListener("click", exportBackup);
  importFileInput.addEventListener("change", importBackup);
}

function createDefaultState() {
  return {
    version: 2.1,
    updatedAt: "",
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
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    return createDefaultState();
  }
}

function normalizeState(data) {
  const defaultState = createDefaultState();
  const settings = data && typeof data === "object" ? data.settings : null;
  const anniversaries = Array.isArray(data?.anniversaries) ? data.anniversaries : [];

  return {
    version: 2.1,
    updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : "",
    settings: {
      personOneName: typeof settings?.personOneName === "string" ? settings.personOneName.trim() : "",
      personTwoName: typeof settings?.personTwoName === "string" ? settings.personTwoName.trim() : "",
      relationshipDate: isIsoDateString(settings?.relationshipDate) ? settings.relationshipDate : ""
    },
    anniversaries: anniversaries.map(normalizeAnniversary).filter(Boolean) || defaultState.anniversaries
  };
}

function normalizeAnniversary(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const category = CATEGORY_OPTIONS.includes(item.category) ? item.category : "その他";
  const date = isIsoDateString(item.date) ? item.date : "";
  const name = typeof item.name === "string" ? item.name.trim() : "";

  if (!name || !date) {
    return null;
  }

  return {
    id: typeof item.id === "string" && item.id ? item.id : createId(),
    name,
    date,
    category,
    memo: typeof item.memo === "string" ? item.memo.trim() : ""
  };
}

function saveAppState() {
  appState.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function fillSettingsForm() {
  personOneNameInput.value = appState.settings.personOneName;
  personTwoNameInput.value = appState.settings.personTwoName;
  relationshipDateInput.value = appState.settings.relationshipDate;
}

function renderTodayLabel() {
  const today = getToday();
  todayLabel.textContent = formatMonthDay(today);
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

  if (personOneName.length > 20 || personTwoName.length > 20) {
    settingsError.textContent = "名前は20文字以内で入力してください。";
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
  renderAnniversaryList();
  settingsSuccess.textContent = "基本設定を保存しました。ダッシュボードを更新しました。";
}

function handleAnniversarySubmit(event) {
  event.preventDefault();
  anniversaryError.textContent = "";
  anniversarySuccess.textContent = "";
  backupMessage.textContent = "";

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
  resetAnniversaryForm({ preserveMessage: true });
}

function validateAnniversaryForm(formData) {
  if (!appState.settings.relationshipDate) {
    return "先に基本設定を保存してください。";
  }

  if (!formData.name) {
    return "記念日の名前を入力してください。";
  }

  if (formData.name.length > 40) {
    return "記念日の名前は40文字以内で入力してください。";
  }

  if (!formData.date) {
    return "記念日の日付を入力してください。";
  }

  const parsedDate = parseLocalDate(formData.date);
  if (!parsedDate) {
    return "記念日の日付形式を確認してください。";
  }

  const relationshipDate = parseLocalDate(appState.settings.relationshipDate);
  if (relationshipDate && parsedDate < relationshipDate) {
    return "任意記念日は付き合った日以降の日付を入力してください。";
  }

  if (!CATEGORY_OPTIONS.includes(formData.category)) {
    return "カテゴリを選択してください。";
  }

  if (formData.memo.length > 140) {
    return "メモは140文字以内で入力してください。";
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

function resetAnniversaryForm(options = {}) {
  const { preserveMessage = false } = options;
  anniversaryForm.reset();
  anniversaryIdInput.value = "";
  saveAnniversaryButton.textContent = "記念日を追加";
  cancelEditButton.classList.add("hidden");
  if (!preserveMessage) {
    anniversaryError.textContent = "";
    anniversarySuccess.textContent = "";
  }
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
    resetAnniversaryForm({ preserveMessage: true });
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

  const today = getToday();
  const relationshipDate = parseLocalDate(settings.relationshipDate);

  if (!relationshipDate) {
    emptyDashboard.classList.remove("hidden");
    dashboardContent.classList.add("hidden");
    return;
  }

  emptyDashboard.classList.add("hidden");
  dashboardContent.classList.remove("hidden");

  const togetherDays = calculateDayDifference(relationshipDate, today) + 1;
  const monthlyInfo = getNextMonthlyAnniversary(relationshipDate, today);
  const yearlyInfo = getNextYearlyAnniversary(relationshipDate, today);
  const nearestAnniversary = getNearestAnniversary(today);
  const celebrationTexts = [];

  coupleTitle.textContent = `${settings.personOneName}さん と ${settings.personTwoName}さん`;
  relationshipDateText.textContent = `${formatJapaneseDate(relationshipDate)}から歩んでいます。`;
  daysTogether.textContent = `${togetherDays}日`;

  monthlyCountdown.textContent = monthlyInfo.daysUntil === 0 ? "今日です" : `あと${monthlyInfo.daysUntil}日`;
  monthlyNote.textContent = `${monthlyInfo.monthCount}か月記念日 · ${formatJapaneseDate(monthlyInfo.date)}`;

  yearlyCountdown.textContent = yearlyInfo.daysUntil === 0 ? "今日です" : `あと${yearlyInfo.daysUntil}日`;
  yearlyNote.textContent = `${yearlyInfo.yearCount}周年 · ${formatJapaneseDate(yearlyInfo.date)}`;

  if (monthlyInfo.daysUntil === 0) {
    celebrationTexts.push(`${monthlyInfo.monthCount}か月記念日、おめでとうございます。`);
  }

  if (yearlyInfo.daysUntil === 0) {
    celebrationTexts.push(`${yearlyInfo.yearCount}周年、おめでとうございます。`);
  }

  if (celebrationTexts.length) {
    celebrationMessage.textContent = `${settings.personOneName}さんと${settings.personTwoName}さんへ。${celebrationTexts.join(" ")}`;
    celebrationBanner.classList.remove("hidden");
  } else {
    celebrationBanner.classList.add("hidden");
  }

  renderHighlightCard(nearestAnniversary);
}

function renderHighlightCard(item) {
  if (!item) {
    highlightBadge.textContent = "注目";
    highlightBadge.className = "badge badge--accent";
    highlightTitle.textContent = "記念日を登録するとここに表示されます。";
    highlightDate.textContent = "-";
    highlightNote.textContent = "次にやってくる任意記念日を目立つカードで表示します。";
    return;
  }

  const badgeType = getBadgeInfo(item.daysUntilNextOccurrence).type;
  highlightBadge.textContent = getBadgeInfo(item.daysUntilNextOccurrence).label;
  highlightBadge.className = `badge ${badgeType}`;
  highlightTitle.textContent = item.name;
  highlightDate.textContent = `${formatJapaneseDate(item.nextOccurrence)} · あと${item.daysUntilNextOccurrence}日`;
  highlightNote.textContent = `${item.category} · ${item.memo || "メモはありません。"}`;
}

function renderAnniversaryList() {
  const sortedAnniversaries = getSortedAnniversariesForList();
  anniversaryCount.textContent = `${sortedAnniversaries.length}件`;

  if (!sortedAnniversaries.length) {
    anniversaryListEmpty.classList.remove("hidden");
    anniversaryList.innerHTML = "";
    return;
  }

  anniversaryListEmpty.classList.add("hidden");
  anniversaryList.innerHTML = sortedAnniversaries.map(createAnniversaryCardMarkup).join("");
}

function createAnniversaryCardMarkup(item) {
  const badge = getBadgeInfo(item.daysUntilNextOccurrence);
  const memoText = item.memo || "メモはまだありません。";

  return `
    <article class="memory-card">
      <div class="memory-card__top">
        <div class="memory-card__title-wrap">
          <div class="memory-card__title-row">
            <h3>${escapeHtml(item.name)}</h3>
          </div>
          <div class="memory-card__badges">
            <span class="memory-card__date">${escapeHtml(formatJapaneseDate(item.originalDate))}</span>
            <span class="badge ${badge.type}">${badge.label}</span>
          </div>
        </div>
      </div>
      <div class="memory-card__meta-row">
        <p class="memory-card__meta"><span class="memory-card__category">${escapeHtml(item.category)}</span> · 次回 ${escapeHtml(formatJapaneseDate(item.nextOccurrence))}</p>
        <p class="memory-card__meta">あと${item.daysUntilNextOccurrence}日</p>
      </div>
      <p class="memory-card__memo">${escapeHtml(memoText)}</p>
      <div class="memory-card__actions">
        <button type="button" class="secondary-button" data-edit-id="${item.id}">編集</button>
        <button type="button" class="icon-button" data-delete-id="${item.id}">削除</button>
      </div>
    </article>
  `;
}

function exportBackup() {
  backupMessage.textContent = "";
  anniversaryError.textContent = "";
  anniversarySuccess.textContent = "";

  const data = JSON.stringify({
    ...appState,
    exportedAt: new Date().toISOString()
  }, null, 2);

  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const today = getToday();
  link.href = url;
  link.download = `anniversary-backup-${formatIsoDate(today)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  backupMessage.textContent = "JSONバックアップを書き出しました。ダウンロードフォルダをご確認ください。";
}

function importBackup(event) {
  backupMessage.textContent = "";
  const [file] = event.target.files || [];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      const normalized = normalizeState(parsed);

      if (!normalized.settings.relationshipDate && normalized.anniversaries.length === 0) {
        throw new Error("invalid");
      }

      appState = normalized;
      saveAppState();
      fillSettingsForm();
      resetAnniversaryForm();
      renderDashboard();
      renderAnniversaryList();
      backupMessage.textContent = "JSONバックアップを読み込んで復元しました。";
    } catch (error) {
      backupMessage.textContent = "JSONの読み込みに失敗しました。ファイル内容を確認してください。";
    } finally {
      importFileInput.value = "";
    }
  };

  reader.onerror = () => {
    backupMessage.textContent = "ファイルの読み込みに失敗しました。";
    importFileInput.value = "";
  };

  reader.readAsText(file, "utf-8");
}

function getSortedAnniversariesForList() {
  const today = getToday();

  return appState.anniversaries
    .map((item) => {
      const originalDate = parseLocalDate(item.date);
      const nextOccurrence = getNextOccurrence(originalDate, today);
      const daysUntilNextOccurrence = calculateDayDifference(today, nextOccurrence);

      return {
        ...item,
        originalDate,
        nextOccurrence,
        daysUntilNextOccurrence
      };
    })
    .filter((item) => item.originalDate && item.nextOccurrence)
    .sort((a, b) => {
      if (a.daysUntilNextOccurrence !== b.daysUntilNextOccurrence) {
        return a.daysUntilNextOccurrence - b.daysUntilNextOccurrence;
      }

      return a.originalDate - b.originalDate;
    });
}

function getNearestAnniversary(today) {
  const anniversaries = getSortedAnniversariesForList(today);
  return anniversaries[0] || null;
}

function getNextMonthlyAnniversary(startDate, today) {
  let monthCount = monthDiff(startDate, today);
  let candidate = addMonthsKeepingDay(startDate, monthCount);

  if (candidate < today) {
    monthCount += 1;
    candidate = addMonthsKeepingDay(startDate, monthCount);
  }

  return {
    monthCount,
    date: candidate,
    daysUntil: calculateDayDifference(today, candidate)
  };
}

function getNextYearlyAnniversary(startDate, today) {
  let yearCount = today.getFullYear() - startDate.getFullYear();
  let candidate = createSafeDate(today.getFullYear(), startDate.getMonth(), startDate.getDate());

  if (candidate < today) {
    yearCount += 1;
    candidate = createSafeDate(startDate.getFullYear() + yearCount, startDate.getMonth(), startDate.getDate());
  }

  if (yearCount <= 0) {
    yearCount = 1;
    candidate = createSafeDate(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
  }

  return {
    yearCount,
    date: candidate,
    daysUntil: calculateDayDifference(today, candidate)
  };
}

function getNextOccurrence(originalDate, today) {
  if (!(originalDate instanceof Date)) {
    return null;
  }

  let candidate = createSafeDate(today.getFullYear(), originalDate.getMonth(), originalDate.getDate());

  if (candidate < today) {
    candidate = createSafeDate(today.getFullYear() + 1, originalDate.getMonth(), originalDate.getDate());
  }

  return candidate;
}

function getBadgeInfo(daysUntil) {
  if (daysUntil === 0) {
    return { label: "今日", type: "badge--today" };
  }

  if (daysUntil <= SOON_DAYS) {
    return { label: "まもなく", type: "badge--soon" };
  }

  return { label: "予定", type: "badge--normal" };
}

function monthDiff(startDate, endDate) {
  let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
  months += endDate.getMonth() - startDate.getMonth();

  if (endDate.getDate() < startDate.getDate()) {
    months -= 1;
  }

  return Math.max(months, 1);
}

function addMonthsKeepingDay(baseDate, offsetMonths) {
  const year = baseDate.getFullYear() + Math.floor((baseDate.getMonth() + offsetMonths) / 12);
  const month = (baseDate.getMonth() + offsetMonths) % 12;
  return createSafeDate(year, month, baseDate.getDate());
}

function createSafeDate(year, month, day) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function calculateDayDifference(startDate, endDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.round((end - start) / msPerDay);
}

function parseLocalDate(value) {
  if (!isIsoDateString(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
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

function isIsoDateString(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatJapaneseDate(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatIsoDate(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function getToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clearMessages() {
  settingsError.textContent = "";
  settingsSuccess.textContent = "";
  anniversaryError.textContent = "";
  anniversarySuccess.textContent = "";
  backupMessage.textContent = "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
