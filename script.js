const STORAGE_KEY = "anniversary-counter-timeline-v3";
const CATEGORY_OPTIONS = ["記念日", "デート", "旅行", "はじめて", "プレゼント", "日常", "その他"];
const NOTICE_OPTIONS = [0, 3, 7, 14, 30];
const RANGE_LABELS = {
  all: "すべて",
  future: "未来のみ",
  past: "過去のみ"
};

const elements = {
  todayLabel: document.getElementById("today-label"),
  jumpToSettings: document.getElementById("jump-to-settings"),
  dashboardEmpty: document.getElementById("dashboard-empty"),
  dashboardContent: document.getElementById("dashboard-content"),
  specialDayBanner: document.getElementById("special-day-banner"),
  dashboardNames: document.getElementById("dashboard-names"),
  dashboardDate: document.getElementById("dashboard-date"),
  daysTogether: document.getElementById("days-together"),
  nextMonthly: document.getElementById("next-monthly"),
  nextMonthlyNote: document.getElementById("next-monthly-note"),
  nextYearly: document.getElementById("next-yearly"),
  nextYearlyNote: document.getElementById("next-yearly-note"),
  upcomingHighlightTitle: document.getElementById("upcoming-highlight-title"),
  upcomingHighlightMeta: document.getElementById("upcoming-highlight-meta"),
  upcomingList: document.getElementById("upcoming-list"),
  upcomingEmpty: document.getElementById("upcoming-empty"),
  settingsForm: document.getElementById("settings-form"),
  settingsMessage: document.getElementById("settings-message"),
  personOneName: document.getElementById("person-one-name"),
  personTwoName: document.getElementById("person-two-name"),
  relationshipDate: document.getElementById("relationship-date"),
  anniversaryForm: document.getElementById("anniversary-form"),
  anniversaryId: document.getElementById("anniversary-id"),
  anniversaryName: document.getElementById("anniversary-name"),
  anniversaryDate: document.getElementById("anniversary-date"),
  anniversaryCategory: document.getElementById("anniversary-category"),
  anniversaryNotice: document.getElementById("anniversary-notice"),
  anniversaryRepeat: document.getElementById("anniversary-repeat"),
  anniversaryMemo: document.getElementById("anniversary-memo"),
  anniversaryMessage: document.getElementById("anniversary-message"),
  anniversarySubmit: document.getElementById("anniversary-submit"),
  anniversaryCancel: document.getElementById("anniversary-cancel"),
  anniversaryEditState: document.getElementById("anniversary-edit-state"),
  timelineForm: document.getElementById("timeline-form"),
  timelineId: document.getElementById("timeline-id"),
  timelineTitle: document.getElementById("timeline-title"),
  timelineDate: document.getElementById("timeline-date"),
  timelineCategory: document.getElementById("timeline-category"),
  timelineEmoji: document.getElementById("timeline-emoji"),
  timelineMemo: document.getElementById("timeline-memo"),
  timelineMessage: document.getElementById("timeline-message"),
  timelineSubmit: document.getElementById("timeline-submit"),
  timelineCancel: document.getElementById("timeline-cancel"),
  timelineEditState: document.getElementById("timeline-edit-state"),
  searchKeyword: document.getElementById("search-keyword"),
  filterCategory: document.getElementById("filter-category"),
  filterRange: document.getElementById("filter-range"),
  timelineSort: document.getElementById("timeline-sort"),
  anniversarySort: document.getElementById("anniversary-sort"),
  anniversaryList: document.getElementById("anniversary-list"),
  anniversaryEmpty: document.getElementById("anniversary-empty"),
  anniversaryCount: document.getElementById("anniversary-count"),
  timelineList: document.getElementById("timeline-list"),
  timelineEmpty: document.getElementById("timeline-empty"),
  timelineCount: document.getElementById("timeline-count"),
  exportButton: document.getElementById("export-button"),
  importFile: document.getElementById("import-file"),
  backupMessage: document.getElementById("backup-message")
};

let appState = loadState();

init();

function init() {
  populateSelects();
  bindEvents();
  fillForms();
  renderAll();
}

function createDefaultState() {
  return {
    version: 3,
    updatedAt: "",
    settings: {
      personOneName: "",
      personTwoName: "",
      relationshipDate: ""
    },
    anniversaries: [],
    timelineEntries: []
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createDefaultState();

  try {
    return normalizeState(JSON.parse(raw));
  } catch (_error) {
    return createDefaultState();
  }
}

function normalizeState(data) {
  const defaultState = createDefaultState();
  const settings = data && typeof data === "object" ? data.settings : {};

  return {
    version: 3,
    updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : "",
    settings: {
      personOneName: typeof settings?.personOneName === "string" ? settings.personOneName.trim() : "",
      personTwoName: typeof settings?.personTwoName === "string" ? settings.personTwoName.trim() : "",
      relationshipDate: isIsoDate(settings?.relationshipDate) ? settings.relationshipDate : ""
    },
    anniversaries: Array.isArray(data?.anniversaries) ? data.anniversaries.map(normalizeAnniversary).filter(Boolean) : defaultState.anniversaries,
    timelineEntries: Array.isArray(data?.timelineEntries) ? data.timelineEntries.map(normalizeTimelineEntry).filter(Boolean) : defaultState.timelineEntries
  };
}

function normalizeAnniversary(item) {
  if (!item || typeof item !== "object") return null;
  const name = sanitizeText(item.name, 40);
  const date = isIsoDate(item.date) ? item.date : "";
  if (!name || !date) return null;

  return {
    id: typeof item.id === "string" && item.id ? item.id : createId(),
    name,
    date,
    category: CATEGORY_OPTIONS.includes(item.category) ? item.category : "その他",
    memo: sanitizeText(item.memo, 200),
    repeatYearly: Boolean(item.repeatYearly),
    noticeDays: NOTICE_OPTIONS.includes(Number(item.noticeDays)) ? Number(item.noticeDays) : 7
  };
}

function normalizeTimelineEntry(item) {
  if (!item || typeof item !== "object") return null;
  const title = sanitizeText(item.title, 40);
  const date = isIsoDate(item.date) ? item.date : "";
  const emoji = sanitizeEmoji(item.emoji);
  if (!title || !date || !emoji) return null;

  return {
    id: typeof item.id === "string" && item.id ? item.id : createId(),
    title,
    date,
    category: CATEGORY_OPTIONS.includes(item.category) ? item.category : "その他",
    memo: sanitizeText(item.memo, 220),
    emoji
  };
}

function saveState() {
  appState.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function bindEvents() {
  elements.jumpToSettings.addEventListener("click", () => elements.settingsForm.scrollIntoView({ behavior: "smooth", block: "start" }));
  elements.settingsForm.addEventListener("submit", handleSettingsSubmit);
  elements.anniversaryForm.addEventListener("submit", handleAnniversarySubmit);
  elements.anniversaryCancel.addEventListener("click", resetAnniversaryForm);
  elements.timelineForm.addEventListener("submit", handleTimelineSubmit);
  elements.timelineCancel.addEventListener("click", resetTimelineForm);
  elements.anniversaryList.addEventListener("click", handleAnniversaryListClick);
  elements.timelineList.addEventListener("click", handleTimelineListClick);
  elements.exportButton.addEventListener("click", exportJson);
  elements.importFile.addEventListener("change", importJson);
  [elements.searchKeyword, elements.filterCategory, elements.filterRange, elements.timelineSort, elements.anniversarySort].forEach((element) => {
    element.addEventListener("input", renderFilteredLists);
    element.addEventListener("change", renderFilteredLists);
  });
}

function populateSelects() {
  fillCategorySelect(elements.anniversaryCategory, true);
  fillCategorySelect(elements.timelineCategory, true);
  fillCategorySelect(elements.filterCategory, false, "すべての種別");
  elements.anniversaryNotice.innerHTML = NOTICE_OPTIONS.map((day) => `<option value="${day}">${day}日前から</option>`).join("");
}

function fillCategorySelect(select, includePlaceholder, placeholderText = "選択してください") {
  const options = CATEGORY_OPTIONS.map((category) => `<option value="${category}">${category}</option>`).join("");
  select.innerHTML = `${includePlaceholder ? `<option value="">${placeholderText}</option>` : `<option value="all">${placeholderText}</option>`}${options}`;
}

function fillForms() {
  elements.personOneName.value = appState.settings.personOneName;
  elements.personTwoName.value = appState.settings.personTwoName;
  elements.relationshipDate.value = appState.settings.relationshipDate;
  elements.anniversaryNotice.value = "7";
}

function renderAll() {
  elements.todayLabel.textContent = formatDateLabel(getToday());
  renderDashboard();
  renderUpcomingEvents();
  renderFilteredLists();
}

function handleSettingsSubmit(event) {
  event.preventDefault();
  clearFieldErrors(["person-one-name", "person-two-name", "relationship-date"]);
  clearMessages();

  const formData = {
    personOneName: sanitizeText(elements.personOneName.value, 20),
    personTwoName: sanitizeText(elements.personTwoName.value, 20),
    relationshipDate: elements.relationshipDate.value
  };

  const errors = {};
  if (!formData.personOneName) errors["person-one-name"] = "1人目の名前を入力してください。";
  if (!formData.personTwoName) errors["person-two-name"] = "2人目の名前を入力してください。";
  if (!formData.relationshipDate) errors["relationship-date"] = "付き合った日を入力してください。";

  const relationshipDate = parseDate(formData.relationshipDate);
  if (formData.relationshipDate && !relationshipDate) {
    errors["relationship-date"] = "正しい日付を入力してください。";
  }
  if (relationshipDate && relationshipDate > getToday()) {
    errors["relationship-date"] = "未来の日付は設定できません。";
  }

  if (Object.keys(errors).length) {
    showFieldErrors(errors);
    elements.settingsMessage.textContent = "入力内容を確認してください。";
    elements.settingsMessage.style.color = "var(--danger)";
    return;
  }

  appState.settings = formData;
  saveState();
  elements.settingsMessage.textContent = "基本設定を保存しました。";
  elements.settingsMessage.style.color = "var(--success)";
  renderAll();
}

function handleAnniversarySubmit(event) {
  event.preventDefault();
  clearFieldErrors(["anniversary-name", "anniversary-date", "anniversary-category", "anniversary-notice", "anniversary-memo"]);
  elements.anniversaryMessage.textContent = "";

  const formData = {
    id: elements.anniversaryId.value,
    name: sanitizeText(elements.anniversaryName.value, 40),
    date: elements.anniversaryDate.value,
    category: elements.anniversaryCategory.value,
    memo: sanitizeText(elements.anniversaryMemo.value, 200),
    repeatYearly: elements.anniversaryRepeat.checked,
    noticeDays: Number(elements.anniversaryNotice.value)
  };

  const errors = validateAnniversary(formData);
  if (Object.keys(errors).length) {
    showFieldErrors(errors);
    elements.anniversaryMessage.textContent = "入力内容を確認してください。";
    elements.anniversaryMessage.style.color = "var(--danger)";
    return;
  }

  const item = {
    ...formData,
    id: formData.id || createId()
  };

  const index = appState.anniversaries.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    appState.anniversaries[index] = item;
    elements.anniversaryMessage.textContent = "記念日を更新しました。";
  } else {
    appState.anniversaries.push(item);
    elements.anniversaryMessage.textContent = "記念日を保存しました。";
  }

  elements.anniversaryMessage.style.color = "var(--success)";
  saveState();
  resetAnniversaryForm(true);
  renderAll();
}

function validateAnniversary(formData) {
  const errors = {};
  if (!appState.settings.relationshipDate) {
    errors["anniversary-date"] = "先に基本設定を保存してください。";
    return errors;
  }
  if (!formData.name) errors["anniversary-name"] = "名前を入力してください。";
  if (!formData.date) errors["anniversary-date"] = "日付を入力してください。";
  if (formData.date && !parseDate(formData.date)) errors["anniversary-date"] = "正しい日付を入力してください。";
  if (!CATEGORY_OPTIONS.includes(formData.category)) errors["anniversary-category"] = "種別を選択してください。";
  if (!NOTICE_OPTIONS.includes(formData.noticeDays)) errors["anniversary-notice"] = "事前通知日数を選択してください。";
  if (formData.memo.length > 200) errors["anniversary-memo"] = "メモは200文字以内で入力してください。";

  const relationshipDate = parseDate(appState.settings.relationshipDate);
  const targetDate = parseDate(formData.date);
  if (relationshipDate && targetDate && !formData.repeatYearly && targetDate < relationshipDate) {
    errors["anniversary-date"] = "付き合った日以降の日付を入力してください。";
  }

  return errors;
}

function handleTimelineSubmit(event) {
  event.preventDefault();
  clearFieldErrors(["timeline-title", "timeline-date", "timeline-category", "timeline-emoji", "timeline-memo"]);
  elements.timelineMessage.textContent = "";

  const formData = {
    id: elements.timelineId.value,
    title: sanitizeText(elements.timelineTitle.value, 40),
    date: elements.timelineDate.value,
    category: elements.timelineCategory.value,
    emoji: sanitizeEmoji(elements.timelineEmoji.value),
    memo: sanitizeText(elements.timelineMemo.value, 220)
  };

  const errors = validateTimeline(formData);
  if (Object.keys(errors).length) {
    showFieldErrors(errors);
    elements.timelineMessage.textContent = "入力内容を確認してください。";
    elements.timelineMessage.style.color = "var(--danger)";
    return;
  }

  const item = { ...formData, id: formData.id || createId() };
  const index = appState.timelineEntries.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    appState.timelineEntries[index] = item;
    elements.timelineMessage.textContent = "タイムライン記録を更新しました。";
  } else {
    appState.timelineEntries.push(item);
    elements.timelineMessage.textContent = "タイムライン記録を保存しました。";
  }

  elements.timelineMessage.style.color = "var(--success)";
  saveState();
  resetTimelineForm(true);
  renderAll();
}

function validateTimeline(formData) {
  const errors = {};
  if (!formData.title) errors["timeline-title"] = "タイトルを入力してください。";
  if (!formData.date) errors["timeline-date"] = "日付を入力してください。";
  if (formData.date && !parseDate(formData.date)) errors["timeline-date"] = "正しい日付を入力してください。";
  if (!CATEGORY_OPTIONS.includes(formData.category)) errors["timeline-category"] = "種別を選択してください。";
  if (!formData.emoji) errors["timeline-emoji"] = "絵文字を入力してください。";
  if (formData.memo.length > 220) errors["timeline-memo"] = "メモは220文字以内で入力してください。";
  return errors;
}

function handleAnniversaryListClick(event) {
  const editButton = event.target.closest("[data-anniversary-edit]");
  const deleteButton = event.target.closest("[data-anniversary-delete]");
  if (editButton) startAnniversaryEdit(editButton.dataset.anniversaryEdit);
  if (deleteButton) deleteAnniversary(deleteButton.dataset.anniversaryDelete);
}

function handleTimelineListClick(event) {
  const editButton = event.target.closest("[data-timeline-edit]");
  const deleteButton = event.target.closest("[data-timeline-delete]");
  if (editButton) startTimelineEdit(editButton.dataset.timelineEdit);
  if (deleteButton) deleteTimelineEntry(deleteButton.dataset.timelineDelete);
}

function startAnniversaryEdit(id) {
  const item = appState.anniversaries.find((entry) => entry.id === id);
  if (!item) return;
  elements.anniversaryId.value = item.id;
  elements.anniversaryName.value = item.name;
  elements.anniversaryDate.value = item.date;
  elements.anniversaryCategory.value = item.category;
  elements.anniversaryNotice.value = String(item.noticeDays);
  elements.anniversaryRepeat.checked = item.repeatYearly;
  elements.anniversaryMemo.value = item.memo;
  elements.anniversarySubmit.textContent = "記念日を更新";
  elements.anniversaryCancel.classList.remove("hidden");
  elements.anniversaryEditState.classList.remove("hidden");
  elements.anniversaryMessage.textContent = "編集中です。保存するかキャンセルしてください。";
  elements.anniversaryMessage.style.color = "var(--success)";
  elements.anniversaryForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetAnniversaryForm(keepMessage = false) {
  elements.anniversaryForm.reset();
  elements.anniversaryId.value = "";
  elements.anniversarySubmit.textContent = "記念日を保存";
  elements.anniversaryCancel.classList.add("hidden");
  elements.anniversaryEditState.classList.add("hidden");
  elements.anniversaryNotice.value = "7";
  clearFieldErrors(["anniversary-name", "anniversary-date", "anniversary-category", "anniversary-notice", "anniversary-memo"]);
  if (!keepMessage) elements.anniversaryMessage.textContent = "";
}

function deleteAnniversary(id) {
  const item = appState.anniversaries.find((entry) => entry.id === id);
  if (!item) return;
  if (!window.confirm(`「${item.name}」を削除しますか？`)) return;
  appState.anniversaries = appState.anniversaries.filter((entry) => entry.id !== id);
  saveState();
  resetAnniversaryForm();
  renderAll();
  elements.anniversaryMessage.textContent = "記念日を削除しました。";
  elements.anniversaryMessage.style.color = "var(--success)";
}

function startTimelineEdit(id) {
  const item = appState.timelineEntries.find((entry) => entry.id === id);
  if (!item) return;
  elements.timelineId.value = item.id;
  elements.timelineTitle.value = item.title;
  elements.timelineDate.value = item.date;
  elements.timelineCategory.value = item.category;
  elements.timelineEmoji.value = item.emoji;
  elements.timelineMemo.value = item.memo;
  elements.timelineSubmit.textContent = "タイムラインを更新";
  elements.timelineCancel.classList.remove("hidden");
  elements.timelineEditState.classList.remove("hidden");
  elements.timelineMessage.textContent = "編集中です。保存するかキャンセルしてください。";
  elements.timelineMessage.style.color = "var(--success)";
  elements.timelineForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetTimelineForm(keepMessage = false) {
  elements.timelineForm.reset();
  elements.timelineId.value = "";
  elements.timelineSubmit.textContent = "タイムラインに保存";
  elements.timelineCancel.classList.add("hidden");
  elements.timelineEditState.classList.add("hidden");
  clearFieldErrors(["timeline-title", "timeline-date", "timeline-category", "timeline-emoji", "timeline-memo"]);
  if (!keepMessage) elements.timelineMessage.textContent = "";
}

function deleteTimelineEntry(id) {
  const item = appState.timelineEntries.find((entry) => entry.id === id);
  if (!item) return;
  if (!window.confirm(`「${item.title}」を削除しますか？`)) return;
  appState.timelineEntries = appState.timelineEntries.filter((entry) => entry.id !== id);
  saveState();
  resetTimelineForm();
  renderAll();
  elements.timelineMessage.textContent = "タイムライン記録を削除しました。";
  elements.timelineMessage.style.color = "var(--success)";
}

function renderDashboard() {
  const { personOneName, personTwoName, relationshipDate } = appState.settings;
  const hasSettings = personOneName && personTwoName && relationshipDate;
  elements.dashboardEmpty.classList.toggle("hidden", hasSettings);
  elements.dashboardContent.classList.toggle("hidden", !hasSettings);
  if (!hasSettings) return;

  const today = getToday();
  const startDate = parseDate(relationshipDate);
  const days = Math.max(0, diffDays(startDate, today) + 1);
  const monthly = getNextMonthlyAnniversary(startDate, today);
  const yearly = getNextYearlyAnniversary(startDate, today);
  const customEvents = getUpcomingCustomEvents();
  const nearest = customEvents[0];
  const specialMessages = getSpecialMessages(today, startDate);

  elements.dashboardNames.textContent = `${personOneName} と ${personTwoName}`;
  elements.dashboardDate.textContent = `付き合った日: ${formatFullDate(startDate)}`;
  elements.daysTogether.textContent = `${days}日`;
  elements.nextMonthly.textContent = `あと${monthly.diff}日`;
  elements.nextMonthlyNote.textContent = `${monthly.count}か月記念日 · ${formatFullDate(monthly.date)}`;
  elements.nextYearly.textContent = `あと${yearly.diff}日`;
  elements.nextYearlyNote.textContent = `${yearly.count}周年 · ${formatFullDate(yearly.date)}`;

  if (nearest) {
    elements.upcomingHighlightTitle.textContent = nearest.name;
    elements.upcomingHighlightMeta.textContent = `${nearest.category} · ${formatFullDate(nearest.nextDate)} · あと${nearest.daysUntil}日`;
  } else {
    elements.upcomingHighlightTitle.textContent = "まだありません";
    elements.upcomingHighlightMeta.textContent = "未来の日付の記録を追加すると表示されます。";
  }

  if (specialMessages.length) {
    elements.specialDayBanner.classList.remove("hidden");
    elements.specialDayBanner.textContent = specialMessages.join(" / ");
  } else {
    elements.specialDayBanner.classList.add("hidden");
    elements.specialDayBanner.textContent = "";
  }
}

function renderUpcomingEvents() {
  const events = getUpcomingEvents().slice(0, 5);
  elements.upcomingList.innerHTML = "";
  elements.upcomingEmpty.classList.toggle("hidden", events.length > 0);

  events.forEach((event) => {
    const card = document.createElement("article");
    card.className = "event-card";
    card.innerHTML = `
      <div class="event-card__top">
        <div>
          <span class="event-kind ${getTypeClass(event.category)}">${escapeHtml(event.kindLabel)}</span>
          <h3>${escapeHtml(event.name)}</h3>
          <p class="event-meta">${formatFullDate(event.date)} · ${escapeHtml(event.category)}</p>
        </div>
        <div class="event-card__days">${event.daysUntil === 0 ? "今日" : `あと${event.daysUntil}日`}</div>
      </div>
    `;
    elements.upcomingList.appendChild(card);
  });
}

function renderFilteredLists() {
  renderAnniversaryList();
  renderTimeline();
}

function renderAnniversaryList() {
  const items = getFilteredAnniversaries();
  elements.anniversaryCount.textContent = `${items.length}件`;
  elements.anniversaryList.innerHTML = "";
  elements.anniversaryEmpty.classList.toggle("hidden", items.length > 0);

  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "item-card";
    const nextDate = item.nextDate || parseDate(item.date);
    article.innerHTML = `
      <div class="item-card__top">
        <div>
          <span class="type-chip ${getTypeClass(item.category)}">${escapeHtml(item.category)}</span>
          <h3>${escapeHtml(item.name)}</h3>
        </div>
        <span class="date-chip">${formatFullDate(nextDate)}</span>
      </div>
      <div class="item-card__meta">
        ${item.daysUntil === 0 ? '<span class="timeline-badge timeline-badge--today">今日</span>' : ""}
        ${item.daysUntil > 0 && item.daysUntil <= item.noticeDays ? '<span class="timeline-badge timeline-badge--soon">まもなく</span>' : ""}
        <span>${escapeHtml(item.repeatYearly ? "毎年くり返し" : "単発")}</span>
        <span>${item.daysUntil >= 0 ? `あと${item.daysUntil}日` : `${Math.abs(item.daysUntil)}日前`}</span>
      </div>
      <p class="item-card__memo">${escapeHtml(item.memo || "メモはまだありません。")}</p>
      <div class="item-card__actions">
        <button type="button" class="button button--secondary" data-anniversary-edit="${item.id}">編集</button>
        <button type="button" class="button button--secondary" data-anniversary-delete="${item.id}">削除</button>
      </div>
    `;
    elements.anniversaryList.appendChild(article);
  });
}

function renderTimeline() {
  const items = getFilteredTimelineEntries();
  elements.timelineCount.textContent = `${items.length}件`;
  elements.timelineList.innerHTML = "";
  elements.timelineEmpty.classList.toggle("hidden", items.length > 0);
  if (!items.length) return;

  const grouped = groupTimelineByMonth(items);
  grouped.forEach((group) => {
    const wrapper = document.createElement("section");
    wrapper.className = "month-group";
    wrapper.innerHTML = `
      <div class="month-group__header">
        <div>
          <p class="eyebrow">Month</p>
          <h3 class="month-group__title">${escapeHtml(group.label)}</h3>
        </div>
        <span class="count-pill">${group.items.length}件</span>
      </div>
      <div class="month-group__items"></div>
    `;

    const list = wrapper.querySelector(".month-group__items");
    group.items.forEach((item) => {
      const article = document.createElement("article");
      article.className = "timeline-item";
      article.innerHTML = `
        <div class="timeline-item__emoji">${escapeHtml(item.emoji)}</div>
        <div class="timeline-item__top">
          <div>
            <span class="type-chip ${getTypeClass(item.category)}">${escapeHtml(item.category)}</span>
            <h3>${escapeHtml(item.title)}</h3>
          </div>
          <span class="date-chip">${formatFullDate(parseDate(item.date))}</span>
        </div>
        <div class="timeline-item__meta">
          ${isSameDate(parseDate(item.date), getToday()) ? '<span class="timeline-badge timeline-badge--today">今日</span>' : ""}
          ${getFutureDiff(item.date) > 0 && getFutureDiff(item.date) <= 7 ? '<span class="timeline-badge timeline-badge--soon">まもなく</span>' : ""}
        </div>
        <p class="timeline-item__memo">${escapeHtml(item.memo || "メモはまだありません。")}</p>
        <div class="timeline-item__actions">
          <button type="button" class="button button--secondary" data-timeline-edit="${item.id}">編集</button>
          <button type="button" class="button button--secondary" data-timeline-delete="${item.id}">削除</button>
        </div>
      `;
      list.appendChild(article);
    });

    elements.timelineList.appendChild(wrapper);
  });
}

function getUpcomingEvents() {
  const today = getToday();
  const events = [];
  const relationshipDate = parseDate(appState.settings.relationshipDate);

  if (relationshipDate) {
    const monthly = getNextMonthlyAnniversary(relationshipDate, today);
    const yearly = getNextYearlyAnniversary(relationshipDate, today);
    events.push({ name: `${monthly.count}か月記念日`, category: "記念日", kindLabel: "月記念日", date: monthly.date, daysUntil: monthly.diff });
    events.push({ name: `${yearly.count}周年`, category: "記念日", kindLabel: "年記念日", date: yearly.date, daysUntil: yearly.diff });
  }

  getUpcomingCustomEvents().forEach((event) => {
    events.push({ name: event.name, category: event.category, kindLabel: "任意記念日", date: event.nextDate, daysUntil: event.daysUntil });
  });

  return events
    .filter((item) => item.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.date - b.date);
}

function getUpcomingCustomEvents() {
  return appState.anniversaries
    .map((item) => ({ ...item, ...resolveAnniversarySchedule(item) }))
    .filter((item) => item.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.nextDate - b.nextDate);
}

function resolveAnniversarySchedule(item) {
  const today = getToday();
  const baseDate = parseDate(item.date);
  if (!baseDate) return { nextDate: today, daysUntil: Number.MAX_SAFE_INTEGER };
  if (item.repeatYearly) {
    const thisYear = new Date(today.getFullYear(), baseDate.getMonth(), Math.min(baseDate.getDate(), daysInMonth(today.getFullYear(), baseDate.getMonth())));
    const nextDate = startOfDay(thisYear >= today ? thisYear : new Date(today.getFullYear() + 1, baseDate.getMonth(), Math.min(baseDate.getDate(), daysInMonth(today.getFullYear() + 1, baseDate.getMonth()))));
    return { nextDate, daysUntil: diffDays(today, nextDate) };
  }
  return { nextDate: baseDate, daysUntil: diffDays(today, baseDate) };
}

function getSpecialMessages(today, relationshipDate) {
  const messages = [];
  const monthly = relationshipDate.getDate() === today.getDate();
  const yearly = relationshipDate.getDate() === today.getDate() && relationshipDate.getMonth() === today.getMonth();
  if (monthly) {
    const monthCount = countMonthsBetween(relationshipDate, today);
    messages.push(`今日は${monthCount}か月記念日です。おめでとうございます。`);
  }
  if (yearly) {
    const yearCount = today.getFullYear() - relationshipDate.getFullYear();
    messages.push(`今日は${yearCount}周年です。特別な一日を楽しんでください。`);
  }

  appState.anniversaries.forEach((item) => {
    const schedule = resolveAnniversarySchedule(item);
    if (schedule.daysUntil === 0) {
      messages.push(`今日は「${item.name}」の日です。`);
    }
  });

  return messages;
}

function getFilteredAnniversaries() {
  const keyword = elements.searchKeyword.value.trim().toLowerCase();
  const category = elements.filterCategory.value;
  const range = elements.filterRange.value;
  const sort = elements.anniversarySort.value;

  const items = appState.anniversaries
    .map((item) => ({ ...item, ...resolveAnniversarySchedule(item) }))
    .filter((item) => matchSearch(item.name, item.memo, keyword))
    .filter((item) => category === "all" || item.category === category)
    .filter((item) => matchRange(item.daysUntil, range));

  const sorter = {
    soon: (a, b) => Math.abs(a.daysUntil) - Math.abs(b.daysUntil) || a.nextDate - b.nextDate,
    "date-desc": (a, b) => parseDate(b.date) - parseDate(a.date),
    "date-asc": (a, b) => parseDate(a.date) - parseDate(b.date),
    name: (a, b) => a.name.localeCompare(b.name, "ja")
  }[sort];

  return items.sort(sorter);
}

function getFilteredTimelineEntries() {
  const keyword = elements.searchKeyword.value.trim().toLowerCase();
  const category = elements.filterCategory.value;
  const range = elements.filterRange.value;
  const sort = elements.timelineSort.value;

  return [...appState.timelineEntries]
    .filter((item) => matchSearch(item.title, item.memo, keyword))
    .filter((item) => category === "all" || item.category === category)
    .filter((item) => matchRange(getFutureDiff(item.date), range))
    .sort((a, b) => (sort === "desc" ? parseDate(b.date) - parseDate(a.date) : parseDate(a.date) - parseDate(b.date)));
}

function matchSearch(title, memo, keyword) {
  if (!keyword) return true;
  return `${title} ${memo}`.toLowerCase().includes(keyword);
}

function matchRange(diff, range) {
  if (range === "future") return diff >= 0;
  if (range === "past") return diff < 0;
  return true;
}

function groupTimelineByMonth(items) {
  const groups = new Map();
  items.forEach((item) => {
    const date = parseDate(item.date);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    if (!groups.has(key)) {
      groups.set(key, { label: `${date.getFullYear()}年${date.getMonth() + 1}月`, items: [] });
    }
    groups.get(key).items.push(item);
  });
  return [...groups.values()];
}

function exportJson() {
  clearMessages();
  const blob = new Blob([JSON.stringify(appState, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `anniversary-timeline-backup-${formatFileDate(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  elements.backupMessage.textContent = "JSONをエクスポートしました。";
  elements.backupMessage.style.color = "var(--success)";
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const normalized = normalizeState(parsed);
      if (!parsed || typeof parsed !== "object" || !("settings" in parsed) || !("anniversaries" in parsed) || !("timelineEntries" in parsed)) {
        throw new Error("形式が一致しません。");
      }
      if (!window.confirm("現在の保存内容を上書きして復元します。よろしいですか？")) {
        elements.importFile.value = "";
        return;
      }
      appState = normalized;
      saveState();
      fillForms();
      resetAnniversaryForm();
      resetTimelineForm();
      renderAll();
      elements.backupMessage.textContent = "JSONから復元しました。";
      elements.backupMessage.style.color = "var(--success)";
    } catch (error) {
      elements.backupMessage.textContent = `インポートに失敗しました: ${error.message || "不正なJSONです。"}`;
      elements.backupMessage.style.color = "var(--danger)";
    } finally {
      elements.importFile.value = "";
    }
  };

  reader.onerror = () => {
    elements.backupMessage.textContent = "ファイルの読み込みに失敗しました。";
    elements.backupMessage.style.color = "var(--danger)";
    elements.importFile.value = "";
  };

  reader.readAsText(file);
}

function clearMessages() {
  [elements.settingsMessage, elements.anniversaryMessage, elements.timelineMessage, elements.backupMessage].forEach((element) => {
    element.textContent = "";
  });
}

function showFieldErrors(errors) {
  Object.entries(errors).forEach(([key, value]) => {
    const target = document.getElementById(`${key}-error`);
    if (target) target.textContent = value;
  });
}

function clearFieldErrors(keys) {
  keys.forEach((key) => {
    const target = document.getElementById(`${key}-error`);
    if (target) target.textContent = "";
  });
}

function getNextMonthlyAnniversary(startDate, today) {
  const totalMonths = countMonthsBetween(startDate, today);
  const candidate = addMonthsClamped(startDate, totalMonths);
  const isTodayMonthly = isSameDate(candidate, today);
  const nextCount = isTodayMonthly ? totalMonths : totalMonths + 1;
  const nextDate = isTodayMonthly ? today : addMonthsClamped(startDate, nextCount);
  return { count: nextCount, date: nextDate, diff: diffDays(today, nextDate) };
}

function getNextYearlyAnniversary(startDate, today) {
  const thisYear = clampYearDate(startDate, today.getFullYear());
  const isCurrentOrFuture = thisYear >= today;
  const nextDate = isCurrentOrFuture ? thisYear : clampYearDate(startDate, today.getFullYear() + 1);
  const count = nextDate.getFullYear() - startDate.getFullYear();
  return { count, date: nextDate, diff: diffDays(today, nextDate) };
}

function clampYearDate(baseDate, year) {
  return startOfDay(new Date(year, baseDate.getMonth(), Math.min(baseDate.getDate(), daysInMonth(year, baseDate.getMonth()))));
}

function addMonthsClamped(date, months) {
  const year = date.getFullYear() + Math.floor((date.getMonth() + months) / 12);
  const month = (date.getMonth() + months) % 12;
  const normalizedMonth = month < 0 ? month + 12 : month;
  const normalizedYear = month < 0 ? year - 1 : year;
  return startOfDay(new Date(normalizedYear, normalizedMonth, Math.min(date.getDate(), daysInMonth(normalizedYear, normalizedMonth))));
}

function countMonthsBetween(startDate, endDate) {
  let months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
  const candidate = addMonthsClamped(startDate, months);
  if (candidate > endDate) months -= 1;
  return Math.max(0, months);
}

function getFutureDiff(dateString) {
  const date = parseDate(dateString);
  return diffDays(getToday(), date);
}

function getToday() {
  return startOfDay(new Date());
}

function parseDate(value) {
  if (!isIsoDate(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function diffDays(fromDate, toDate) {
  const ms = startOfDay(toDate) - startOfDay(fromDate);
  return Math.round(ms / 86400000);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDate(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function sanitizeText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function sanitizeEmoji(value) {
  return typeof value === "string" ? Array.from(value.trim())[0] || "" : "";
}

function createId() {
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function formatDateLabel(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatFullDate(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatFileDate(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function getTypeClass(category) {
  return {
    記念日: "type-anniversary",
    デート: "type-date",
    旅行: "type-trip",
    はじめて: "type-first",
    プレゼント: "type-gift",
    日常: "type-daily",
    その他: "type-other"
  }[category] || "type-other";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
