const STORAGE_KEY = "anniversary-counter-habit-v1";
const THEME_OPTIONS = ["peach", "mint", "lavender"];
const REMINDER_DAYS = [7, 3, 1, 0];
const DAILY_HINTS = [
  "今日は最近の写真を1枚だけ見返してみよう。",
  "次の記念日に向けて、小さな計画を立ててみませんか。",
  "忙しい日ほど、短いメモを残すだけでも十分です。",
  "思い出は積み重ねるほど、あとで宝物になります。",
  "今日の一言をメモに足してみるのもおすすめです。",
  "次に行きたい場所を2人でひとつ決めてみよう。",
  "最近のうれしかったことを思い出してみましょう。",
  "今日は相手の好きなものを1つ思い出してみよう。",
  "たまには最初の頃の気持ちを振り返る日に。",
  "次の予定がなくても、記録を見返すだけで十分前進です。",
  "記念日は準備して待つ時間も楽しい思い出になります。",
  "今日もアプリを開いたこと自体が、2人を大切にしている証拠です。"
];

const elements = {
  todayLabel: document.getElementById("today-label"),
  notificationArea: document.getElementById("notification-area"),
  dailyMessage: document.getElementById("daily-message"),
  streakCount: document.getElementById("streak-count"),
  monthlyOpenCount: document.getElementById("monthly-open-count"),
  emptyState: document.getElementById("empty-state"),
  emptyCta: document.getElementById("empty-cta"),
  summaryContent: document.getElementById("summary-content"),
  pairNames: document.getElementById("pair-names"),
  relationshipDateLabel: document.getElementById("relationship-date-label"),
  daysTogether: document.getElementById("days-together"),
  nextAnniversaryCount: document.getElementById("next-anniversary-count"),
  nextAnniversaryLabel: document.getElementById("next-anniversary-label"),
  timelineList: document.getElementById("timeline-list"),
  timelineEmpty: document.getElementById("timeline-empty"),
  anniversaryForm: document.getElementById("anniversary-form"),
  editingId: document.getElementById("editing-id"),
  anniversaryName: document.getElementById("anniversary-name"),
  anniversaryDate: document.getElementById("anniversary-date"),
  anniversaryNote: document.getElementById("anniversary-note"),
  anniversaryNameError: document.getElementById("anniversary-name-error"),
  anniversaryDateError: document.getElementById("anniversary-date-error"),
  cancelEdit: document.getElementById("cancel-edit"),
  formMessage: document.getElementById("form-message"),
  settingsForm: document.getElementById("settings-form"),
  personOne: document.getElementById("person-one"),
  personTwo: document.getElementById("person-two"),
  relationshipDate: document.getElementById("relationship-date"),
  personOneError: document.getElementById("person-one-error"),
  personTwoError: document.getElementById("person-two-error"),
  relationshipDateError: document.getElementById("relationship-date-error"),
  notificationEnabled: document.getElementById("notification-enabled"),
  settingsMessage: document.getElementById("settings-message"),
  navButtons: Array.from(document.querySelectorAll("[data-nav-target]")),
  bottomNavItems: Array.from(document.querySelectorAll(".bottom-nav__item")),
  themeRadios: Array.from(document.querySelectorAll('input[name="theme-color"]')),
  quickButtons: Array.from(document.querySelectorAll(".chip-button"))
};

let appState = loadState();
registerOpen();
init();

function init() {
  applyTheme(appState.settings.themeColor);
  fillSettingsForm();
  bindEvents();
  render();
}

function createDefaultState() {
  return {
    version: 1,
    settings: {
      personOne: "",
      personTwo: "",
      relationshipDate: "",
      notificationsEnabled: true,
      themeColor: "peach"
    },
    data: {
      anniversaries: []
    },
    stats: {
      lastOpenedDate: "",
      streak: 0,
      openedDates: []
    }
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createDefaultState();
      persist(initial);
      return initial;
    }

    const parsed = JSON.parse(raw);
    const normalized = normalizeState(parsed);
    persist(normalized);
    return normalized;
  } catch (_error) {
    const fallback = createDefaultState();
    persist(fallback);
    return fallback;
  }
}

function normalizeState(source) {
  const base = createDefaultState();
  const candidate = source && typeof source === "object" ? source : {};
  const settings = candidate.settings && typeof candidate.settings === "object" ? candidate.settings : {};
  const data = candidate.data && typeof candidate.data === "object" ? candidate.data : {};
  const stats = candidate.stats && typeof candidate.stats === "object" ? candidate.stats : {};

  return {
    version: 1,
    settings: {
      personOne: sanitizeText(settings.personOne, 20),
      personTwo: sanitizeText(settings.personTwo, 20),
      relationshipDate: isIsoDate(settings.relationshipDate) ? settings.relationshipDate : "",
      notificationsEnabled: typeof settings.notificationsEnabled === "boolean" ? settings.notificationsEnabled : true,
      themeColor: THEME_OPTIONS.includes(settings.themeColor) ? settings.themeColor : base.settings.themeColor
    },
    data: {
      anniversaries: Array.isArray(data.anniversaries) ? data.anniversaries.map(normalizeAnniversary).filter(Boolean) : []
    },
    stats: normalizeStats(stats)
  };
}

function normalizeAnniversary(item) {
  if (!item || typeof item !== "object") return null;

  const title = sanitizeText(item.title, 40);
  const date = isIsoDate(item.date) ? item.date : "";
  if (!title || !date) return null;

  return {
    id: typeof item.id === "string" && item.id ? item.id : createId(),
    title,
    date,
    note: sanitizeText(item.note, 120),
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
  };
}

function normalizeStats(stats) {
  const openedDates = Array.isArray(stats.openedDates) ? stats.openedDates.filter(isIsoDate) : [];
  const uniqueDates = [...new Set(openedDates)].sort();

  return {
    lastOpenedDate: isIsoDate(stats.lastOpenedDate) ? stats.lastOpenedDate : "",
    streak: Number.isInteger(stats.streak) && stats.streak >= 0 ? stats.streak : 0,
    openedDates: uniqueDates
  };
}

function persist(state = appState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_error) {
    // localStorage が利用できない環境でも画面表示は継続する
  }
}

function registerOpen() {
  const today = todayIso();
  const stats = appState.stats;

  if (!stats.openedDates.includes(today)) {
    stats.openedDates.push(today);
    stats.openedDates.sort();
  }

  if (stats.lastOpenedDate !== today) {
    const yesterday = shiftIso(today, -1);
    stats.streak = stats.lastOpenedDate === yesterday ? stats.streak + 1 : 1;
    stats.lastOpenedDate = today;
    persist();
  }
}

function bindEvents() {
  elements.settingsForm.addEventListener("submit", handleSettingsSubmit);
  elements.anniversaryForm.addEventListener("submit", handleAnniversarySubmit);
  elements.cancelEdit.addEventListener("click", resetAnniversaryForm);
  elements.timelineList.addEventListener("click", handleTimelineAction);
  elements.quickButtons.forEach((button) => {
    button.addEventListener("click", () => {
      elements.anniversaryName.value = button.dataset.quickName || "";
      elements.anniversaryDate.focus();
    });
  });
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => navigateTo(button.dataset.navTarget || "home"));
  });
  elements.emptyCta.addEventListener("click", () => navigateTo("add"));
  elements.themeRadios.forEach((radio) => {
    radio.addEventListener("change", () => applyTheme(radio.value));
  });
}

function handleSettingsSubmit(event) {
  event.preventDefault();
  clearSettingsErrors();
  const settings = {
    personOne: sanitizeText(elements.personOne.value, 20),
    personTwo: sanitizeText(elements.personTwo.value, 20),
    relationshipDate: elements.relationshipDate.value,
    notificationsEnabled: elements.notificationEnabled.checked,
    themeColor: getSelectedTheme()
  };

  const errors = {};
  if (!settings.personOne) errors.personOne = "1人目の名前を入力してください。";
  if (!settings.personTwo) errors.personTwo = "2人目の名前を入力してください。";
  if (!isIsoDate(settings.relationshipDate)) errors.relationshipDate = "正しい日付を入力してください。";
  if (settings.relationshipDate && settings.relationshipDate > todayIso()) {
    errors.relationshipDate = "未来の日付は設定できません。";
  }

  if (Object.keys(errors).length > 0) {
    elements.personOneError.textContent = errors.personOne || "";
    elements.personTwoError.textContent = errors.personTwo || "";
    elements.relationshipDateError.textContent = errors.relationshipDate || "";
    elements.settingsMessage.textContent = "設定内容を確認してください。";
    elements.settingsMessage.style.color = "var(--danger)";
    return;
  }

  appState.settings = settings;
  applyTheme(settings.themeColor);
  persist();
  elements.settingsMessage.textContent = "設定を保存しました。";
  elements.settingsMessage.style.color = "var(--success)";
  render();
}

function handleAnniversarySubmit(event) {
  event.preventDefault();
  elements.anniversaryNameError.textContent = "";
  elements.anniversaryDateError.textContent = "";
  elements.formMessage.textContent = "";

  const payload = {
    id: elements.editingId.value,
    title: sanitizeText(elements.anniversaryName.value, 40),
    date: elements.anniversaryDate.value,
    note: sanitizeText(elements.anniversaryNote.value, 120)
  };

  const errors = {};
  if (!payload.title) errors.title = "名前を入力してください。";
  if (!isIsoDate(payload.date)) errors.date = "日付を入力してください。";

  if (Object.keys(errors).length > 0) {
    elements.anniversaryNameError.textContent = errors.title || "";
    elements.anniversaryDateError.textContent = errors.date || "";
    elements.formMessage.textContent = "入力内容を確認してください。";
    elements.formMessage.style.color = "var(--danger)";
    return;
  }

  if (payload.id) {
    appState.data.anniversaries = appState.data.anniversaries.map((item) =>
      item.id === payload.id ? { ...item, title: payload.title, date: payload.date, note: payload.note } : item
    );
    elements.formMessage.textContent = "記念日を更新しました。";
  } else {
    appState.data.anniversaries.unshift({
      id: createId(),
      title: payload.title,
      date: payload.date,
      note: payload.note,
      createdAt: new Date().toISOString()
    });
    elements.formMessage.textContent = "記念日を追加しました。";
  }

  elements.formMessage.style.color = "var(--success)";
  persist();
  resetAnniversaryForm();
  render();
}

function handleTimelineAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  const target = appState.data.anniversaries.find((item) => item.id === id);
  if (!target) return;

  if (action === "edit") {
    elements.editingId.value = target.id;
    elements.anniversaryName.value = target.title;
    elements.anniversaryDate.value = target.date;
    elements.anniversaryNote.value = target.note;
    elements.cancelEdit.classList.remove("hidden");
    navigateTo("add");
    return;
  }

  if (action === "delete") {
    appState.data.anniversaries = appState.data.anniversaries.filter((item) => item.id !== id);
    persist();
    render();
  }
}

function resetAnniversaryForm() {
  elements.anniversaryForm.reset();
  elements.editingId.value = "";
  elements.cancelEdit.classList.add("hidden");
  elements.anniversaryNameError.textContent = "";
  elements.anniversaryDateError.textContent = "";
}

function render() {
  const today = new Date();
  elements.todayLabel.textContent = formatDateLabel(todayIso());
  renderSummary();
  renderNotifications();
  renderDailyMessage();
  renderStats();
  renderTimeline();
}

function renderSummary() {
  const hasBase = Boolean(appState.settings.personOne && appState.settings.personTwo && appState.settings.relationshipDate);
  const hasData = hasBase || appState.data.anniversaries.length > 0;

  elements.emptyState.classList.toggle("hidden", hasData);
  elements.summaryContent.classList.toggle("hidden", !hasBase);

  if (!hasBase) return;

  const names = `${appState.settings.personOne} & ${appState.settings.personTwo}`;
  const totalDays = diffDays(appState.settings.relationshipDate, todayIso()) + 1;
  const next = getNextUpcoming();

  elements.pairNames.textContent = names;
  elements.relationshipDateLabel.textContent = `${formatDateLabel(appState.settings.relationshipDate)}からスタート`;
  elements.daysTogether.textContent = `出会って${Math.max(totalDays, 1)}日目`;
  elements.nextAnniversaryCount.textContent = next ? `あと${next.daysUntil}日` : "未登録";
  elements.nextAnniversaryLabel.textContent = next ? `${next.title}（${formatDateLabel(next.date)}）` : "次の記念日を追加してみましょう";
}

function renderNotifications() {
  elements.notificationArea.innerHTML = "";
  if (!appState.settings.notificationsEnabled) return;

  const notifications = getReminderNotifications();
  notifications.forEach((item) => {
    const card = document.createElement("article");
    card.className = "notification-card";
    card.innerHTML = `
      <div class="notification-card__icon">🔔</div>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.message)}</p>
      </div>
    `;
    elements.notificationArea.appendChild(card);
  });
}

function renderDailyMessage() {
  const messages = [];
  if (appState.settings.relationshipDate) {
    const days = diffDays(appState.settings.relationshipDate, todayIso()) + 1;
    messages.push(`今日は出会って${Math.max(days, 1)}日目です。`);
  }

  const next = getNextUpcoming();
  if (next) {
    messages.push(`次の記念日「${next.title}」まであと${next.daysUntil}日です。`);
  }

  const index = getDateSeed() % DAILY_HINTS.length;
  messages.push(DAILY_HINTS[index]);
  elements.dailyMessage.textContent = messages[getDateSeed() % messages.length];
}

function renderStats() {
  elements.streakCount.textContent = `連続${appState.stats.streak}日`;
  elements.monthlyOpenCount.textContent = `${countMonthlyOpens()}回`;
}

function renderTimeline() {
  const items = [...appState.data.anniversaries].sort((a, b) => a.date.localeCompare(b.date));
  elements.timelineList.innerHTML = "";
  elements.timelineEmpty.classList.toggle("hidden", items.length > 0);

  items.forEach((item) => {
    const daysUntil = diffDays(todayIso(), item.date);
    const card = document.createElement("article");
    card.className = "timeline-card";
    card.innerHTML = `
      <div class="timeline-card__row">
        <span class="timeline-card__tag">記念日</span>
        <span class="timeline-card__days">${formatDistance(daysUntil)}</span>
      </div>
      <h3 class="timeline-card__title">${escapeHtml(item.title)}</h3>
      <p class="timeline-card__meta">${formatDateLabel(item.date)}${item.note ? ` ・ ${escapeHtml(item.note)}` : ""}</p>
      <div class="timeline-card__actions">
        <button class="icon-button" type="button" data-action="edit" data-id="${item.id}">編集</button>
        <button class="icon-button" type="button" data-action="delete" data-id="${item.id}">削除</button>
      </div>
    `;
    elements.timelineList.appendChild(card);
  });
}

function getReminderNotifications() {
  const nextItems = getUpcomingItems();
  return nextItems
    .filter((item) => REMINDER_DAYS.includes(item.daysUntil))
    .slice(0, 3)
    .map((item) => ({
      title: item.title,
      message: item.daysUntil === 0 ? `${item.title}は今日です。` : `${item.title}まであと${item.daysUntil}日です。`
    }));
}

function getUpcomingItems() {
  return appState.data.anniversaries
    .map((item) => ({ ...item, daysUntil: diffDays(todayIso(), item.date) }))
    .filter((item) => item.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

function getNextUpcoming() {
  return getUpcomingItems()[0] || null;
}

function navigateTo(targetId) {
  const target = document.getElementById(targetId);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  elements.bottomNavItems.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.navTarget === targetId);
  });
}

function fillSettingsForm() {
  elements.personOne.value = appState.settings.personOne;
  elements.personTwo.value = appState.settings.personTwo;
  elements.relationshipDate.value = appState.settings.relationshipDate;
  elements.notificationEnabled.checked = appState.settings.notificationsEnabled;
  elements.themeRadios.forEach((radio) => {
    radio.checked = radio.value === appState.settings.themeColor;
  });
}

function clearSettingsErrors() {
  elements.personOneError.textContent = "";
  elements.personTwoError.textContent = "";
  elements.relationshipDateError.textContent = "";
}

function getSelectedTheme() {
  const selected = elements.themeRadios.find((radio) => radio.checked);
  return selected ? selected.value : "peach";
}

function applyTheme(theme) {
  const safeTheme = THEME_OPTIONS.includes(theme) ? theme : "peach";
  document.documentElement.dataset.theme = safeTheme;
}

function countMonthlyOpens() {
  const monthKey = todayIso().slice(0, 7);
  return appState.stats.openedDates.filter((date) => date.startsWith(monthKey)).length;
}

function formatDistance(daysUntil) {
  if (daysUntil === 0) return "今日";
  if (daysUntil > 0) return `あと${daysUntil}日`;
  return `${Math.abs(daysUntil)}日前`;
}

function sanitizeText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function shiftIso(iso, offsetDays) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function diffDays(fromIso, toIso) {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  return Math.round((to - from) / 86400000);
}

function formatDateLabel(iso) {
  const date = new Date(`${iso}T00:00:00`);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function getDateSeed() {
  return Number(todayIso().replace(/-/g, ""));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
