const STORAGE_KEY = "anniversary-counter-app-v3";
const ANN_TYPES = ["デート", "旅行", "食事", "プレゼント", "相談", "誕生日", "その他"];
const PLAN_TYPES = ["デート", "旅行", "食事", "プレゼント", "相談", "その他"];
const ANN_TEMPLATES = ["初デート", "告白", "同棲開始", "入籍予定", "誕生日", "旅行"];
const PLAN_TEMPLATES = ["記念日ディナー", "プレゼント購入", "レストラン予約", "写真を撮る日", "お祝いメッセージ準備"];

const dailyMessages = [
  "短いメッセージでも、続くと特別になるよ。",
  "次の予定を1つ決めるだけで、今日が少し楽しくなる。",
  "ありがとうを1回伝える日にしよう。",
  "今週のふたり時間を10分だけ相談してみよう。",
  "思い出はメモに残すと、あとで嬉しさが増える。"
];

const defaultState = () => ({
  version: 3,
  settings: { personOne: "", personTwo: "", relationshipDate: "" },
  anniversaries: [],
  plans: [],
  notes: {},
  uiState: {
    screen: "home",
    listTab: "anniversary",
    addTab: "anniversary",
    guideClosed: false
  }
});

const el = {
  screens: [...document.querySelectorAll(".screen")],
  navBtns: [...document.querySelectorAll(".nav-btn")],
  todayLabel: document.getElementById("today-label"),
  firstGuide: document.getElementById("first-guide"),
  closeGuide: document.getElementById("close-guide"),
  daysTogether: document.getElementById("days-together"),
  nextMonthly: document.getElementById("next-monthly"),
  nextYearly: document.getElementById("next-yearly"),
  nextEventCard: document.getElementById("next-event-card"),
  dailyMessage: document.getElementById("daily-message"),
  todayTodos: document.getElementById("today-todos"),
  homeEmpty: document.getElementById("home-empty"),
  listTabs: [...document.querySelectorAll("[data-list-tab]")],
  addTabs: [...document.querySelectorAll("[data-add-tab]")],
  searchInput: document.getElementById("search-input"),
  typeFilter: document.getElementById("type-filter"),
  timeFilter: document.getElementById("time-filter"),
  sortFilter: document.getElementById("sort-filter"),
  listContainer: document.getElementById("list-container"),
  listEmpty: document.getElementById("list-empty"),
  quickTemplates: document.getElementById("quick-templates"),
  anniversaryForm: document.getElementById("anniversary-form"),
  anniversaryId: document.getElementById("anniversary-id"),
  annTitle: document.getElementById("ann-title"),
  annDate: document.getElementById("ann-date"),
  annType: document.getElementById("ann-type"),
  annMemo: document.getElementById("ann-memo"),
  annTitleError: document.getElementById("ann-title-error"),
  annDateError: document.getElementById("ann-date-error"),
  annCancel: document.getElementById("ann-cancel"),
  planForm: document.getElementById("plan-form"),
  planId: document.getElementById("plan-id"),
  planTitle: document.getElementById("plan-title"),
  planDate: document.getElementById("plan-date"),
  planType: document.getElementById("plan-type"),
  planPlace: document.getElementById("plan-place"),
  planMemo: document.getElementById("plan-memo"),
  planReady: document.getElementById("plan-ready"),
  planTitleError: document.getElementById("plan-title-error"),
  planDateError: document.getElementById("plan-date-error"),
  planCancel: document.getElementById("plan-cancel"),
  settingsForm: document.getElementById("settings-form"),
  personOne: document.getElementById("person-one"),
  personTwo: document.getElementById("person-two"),
  relationshipDate: document.getElementById("relationship-date"),
  exportBtn: document.getElementById("export-btn"),
  importInput: document.getElementById("import-input"),
  backupMessage: document.getElementById("backup-message"),
  toast: document.getElementById("toast"),
  confirmDialog: document.getElementById("confirm-dialog"),
  confirmText: document.getElementById("confirm-text"),
  confirmOk: document.getElementById("confirm-ok"),
  confirmCancel: document.getElementById("confirm-cancel")
};

let state = loadState();
let pendingAction = null;
let toastTimer = null;

init();

function init() {
  fillSelects();
  bindEvents();
  fillSettings();
  switchScreen(state.uiState.screen);
  switchListTab(state.uiState.listTab);
  switchAddTab(state.uiState.addTab);
  renderAll();
}

function bindEvents() {
  el.navBtns.forEach((btn) => btn.addEventListener("click", () => switchScreen(btn.dataset.nav)));
  el.closeGuide.addEventListener("click", () => {
    state.uiState.guideClosed = true;
    persist();
    renderHome();
  });

  el.listTabs.forEach((btn) => btn.addEventListener("click", () => switchListTab(btn.dataset.listTab)));
  el.addTabs.forEach((btn) => btn.addEventListener("click", () => switchAddTab(btn.dataset.addTab)));

  [el.searchInput, el.typeFilter, el.timeFilter, el.sortFilter].forEach((node) => {
    node.addEventListener("input", renderList);
    node.addEventListener("change", renderList);
  });

  el.anniversaryForm.addEventListener("submit", submitAnniversary);
  el.planForm.addEventListener("submit", submitPlan);
  el.annCancel.addEventListener("click", resetAnniversaryForm);
  el.planCancel.addEventListener("click", resetPlanForm);
  el.settingsForm.addEventListener("submit", submitSettings);
  el.exportBtn.addEventListener("click", exportJson);
  el.importInput.addEventListener("change", importJson);

  el.listContainer.addEventListener("click", handleListAction);
  el.quickTemplates.addEventListener("click", handleTemplateClick);
  el.confirmOk.addEventListener("click", runPendingAction);
  el.confirmCancel.addEventListener("click", () => el.confirmDialog.close());
}

function fillSelects() {
  el.annType.innerHTML = ANN_TYPES.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  el.planType.innerHTML = PLAN_TYPES.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
}

function switchScreen(screen) {
  const safe = ["home", "list", "add", "settings"].includes(screen) ? screen : "home";
  state.uiState.screen = safe;
  el.screens.forEach((s) => s.classList.toggle("active", s.dataset.screen === safe));
  el.navBtns.forEach((n) => n.classList.toggle("active", n.dataset.nav === safe));
  persist();
  renderAll();
}

function switchListTab(tab) {
  state.uiState.listTab = tab === "plan" ? "plan" : "anniversary";
  el.listTabs.forEach((b) => b.classList.toggle("active", b.dataset.listTab === state.uiState.listTab));
  el.typeFilter.innerHTML = buildTypeFilterOptions();
  persist();
  renderList();
}

function switchAddTab(tab) {
  state.uiState.addTab = tab === "plan" ? "plan" : "anniversary";
  el.addTabs.forEach((b) => b.classList.toggle("active", b.dataset.addTab === state.uiState.addTab));
  el.anniversaryForm.classList.toggle("hidden", state.uiState.addTab !== "anniversary");
  el.planForm.classList.toggle("hidden", state.uiState.addTab !== "plan");
  renderTemplates();
  persist();
}

function renderAll() {
  el.todayLabel.textContent = formatDate(new Date());
  renderHome();
  renderTemplates();
  renderList();
}

function renderHome() {
  const hasBase = state.settings.personOne && state.settings.personTwo && state.settings.relationshipDate;
  const hasData = state.anniversaries.length || state.plans.length;
  el.firstGuide.classList.toggle("hidden", state.uiState.guideClosed);

  if (!hasBase) {
    el.daysTogether.textContent = "--日";
    el.nextMonthly.textContent = "あと--日";
    el.nextYearly.textContent = "あと--日";
  } else {
    const rel = relationshipSummary(state.settings.relationshipDate);
    el.daysTogether.textContent = `${rel.days}日`;
    el.nextMonthly.textContent = rel.monthly === 0 ? "今日" : `あと${rel.monthly}日`;
    el.nextYearly.textContent = rel.yearly === 0 ? "今日" : `あと${rel.yearly}日`;
  }

  const nextEvent = getNextEvent();
  if (!nextEvent) {
    el.nextEventCard.innerHTML = `<p class="eyebrow">次に来るイベント</p><p>予定はまだありません</p><p class="meta">追加タブから1件入れるとここに表示されます。</p>`;
  } else {
    const left = dayDiff(todayStr(), nextEvent.date);
    el.nextEventCard.innerHTML = `
      <p class="eyebrow">次に来るイベント1件</p>
      <p class="item-title">${esc(nextEvent.title)}</p>
      <p class="meta">${nextEvent.kind === "plan" ? "予定" : "記念日"} / ${esc(nextEvent.type)} / ${formatDate(nextEvent.date)}</p>
      <div class="badges">
        <span class="badge">${left === 0 ? "今日" : left > 0 ? `あと${left}日` : `${Math.abs(left)}日前`}</span>
        ${left <= 3 && left >= 0 ? '<span class="badge soon">もうすぐ</span>' : ""}
      </div>
    `;
  }

  el.dailyMessage.textContent = pickDailyMessage();
  el.todayTodos.innerHTML = buildTodayTodos().map((t) => `<li>${esc(t)}</li>`).join("");

  const showEmpty = !hasBase || !hasData;
  el.homeEmpty.classList.toggle("hidden", !showEmpty);
  if (showEmpty) {
    el.homeEmpty.innerHTML = "<p>データが少ない状態です。設定で2人の情報を入れて、追加タブから記念日か予定を登録してみましょう。</p>";
  }
}

function buildTodayTodos() {
  const items = ["メッセージを1つ送る", "次の予定を1つ決める", "プレゼント候補を1つメモする"];
  const next = getNextEvent();
  if (next && next.kind === "plan") items.unshift(`「${next.title}」の準備を確認する`);
  return items.slice(0, 3);
}

function renderTemplates() {
  const tab = state.uiState.addTab;
  const templates = tab === "anniversary" ? ANN_TEMPLATES : PLAN_TEMPLATES;
  el.quickTemplates.innerHTML = `
    <p class="eyebrow">クイック追加</p>
    <h2>${tab === "anniversary" ? "記念日テンプレート" : "予定テンプレート"}</h2>
    <div class="actions">${templates
      .map((t) => `<button class="btn btn-secondary" data-template="${esc(t)}" type="button">${esc(t)}</button>`)
      .join("")}</div>
    <p class="meta">テンプレートを押すとタイトルと種別が入ります。日付だけ入れてすぐ保存できます。</p>
  `;
}

function renderList() {
  const tab = state.uiState.listTab;
  const query = el.searchInput.value.trim().toLowerCase();
  const typeFilter = el.typeFilter.value || "all";
  const timeFilter = el.timeFilter.value;
  const sort = el.sortFilter.value;

  const source = (tab === "anniversary" ? state.anniversaries : state.plans).map((i) => ({ ...i, kind: tab }));

  let items = source.filter((item) => {
    const target = `${item.title} ${item.memo || ""} ${item.type || ""} ${item.place || ""}`.toLowerCase();
    if (query && !target.includes(query)) return false;
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    const d = dayDiff(todayStr(), item.date);
    if (timeFilter === "future" && d < 0) return false;
    if (timeFilter === "past" && d >= 0) return false;
    return true;
  });

  items.sort((a, b) => {
    if (sort === "new") return (b.createdAt || "").localeCompare(a.createdAt || "");
    if (sort === "far") return dayDiff(todayStr(), b.date) - dayDiff(todayStr(), a.date);
    return Math.abs(dayDiff(todayStr(), a.date)) - Math.abs(dayDiff(todayStr(), b.date));
  });

  el.listEmpty.classList.toggle("hidden", items.length > 0);
  if (!items.length) {
    el.listEmpty.innerHTML = `<p>${tab === "anniversary" ? "記念日" : "予定"}が見つかりません。条件を変更するか新しく追加してください。</p>`;
  }

  el.listContainer.innerHTML = items.map((item) => renderListCard(item)).join("");
}

function renderListCard(item) {
  const diff = dayDiff(todayStr(), item.date);
  const badges = [];
  if (diff === 0) badges.push('<span class="badge today">今日</span>');
  if (diff >= 0 && diff <= 3) badges.push('<span class="badge soon">もうすぐ</span>');
  if (item.kind === "plan" && item.ready) badges.push('<span class="badge ready">準備済み</span>');

  const noteRows = item.kind === "anniversary" ? renderNotes(item.id) : "";

  return `
    <article class="item-card" data-item-id="${item.id}" data-kind="${item.kind}">
      <div class="item-head">
        <div>
          <p class="item-title">${esc(item.title)}</p>
          <p class="meta">${formatDate(item.date)} / ${esc(item.type || "その他")}</p>
        </div>
        <strong>${diff === 0 ? "今日" : diff > 0 ? `あと${diff}日` : `${Math.abs(diff)}日前`}</strong>
      </div>
      <div class="badges">${badges.join("")}</div>
      <div class="actions">
        <button class="btn btn-secondary" data-action="toggle">詳細</button>
        <button class="btn btn-secondary" data-action="edit">編集</button>
        <button class="btn btn-secondary" data-action="delete">削除</button>
      </div>
      <div class="details" data-role="details">
        ${item.place ? `<p class="meta">場所: ${esc(item.place)}</p>` : ""}
        <p class="meta">メモ: ${esc(item.memo || "なし")}</p>
        ${item.kind === "plan" ? `<label class="checkbox"><input data-action="ready" type="checkbox" ${item.ready ? "checked" : ""}/> 準備済み</label>` : ""}
        ${noteRows}
      </div>
    </article>
  `;
}

function renderNotes(annId) {
  const list = [...(state.notes[annId] || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return `
    <div class="notes">
      <p class="eyebrow">メモ履歴</p>
      <div class="actions">
        <input data-note-input="${annId}" placeholder="例: 来年は夜景を見に行く" maxlength="120" />
        <button class="btn btn-secondary" data-action="add-note">追加</button>
      </div>
      ${
        list.length
          ? list
              .map(
                (n) => `<div class="item-card"><p>${esc(n.body)}</p><p class="meta">${formatDateTime(n.createdAt)}</p><div class="actions"><button class="btn btn-secondary" data-action="edit-note" data-note-id="${n.id}">編集</button><button class="btn btn-secondary" data-action="delete-note" data-note-id="${n.id}">削除</button></div></div>`
              )
              .join("")
          : '<p class="meta">まだメモはありません。</p>'
      }
    </div>
  `;
}

function handleListAction(event) {
  const btn = event.target.closest("button, input[type='checkbox']");
  if (!btn) return;
  const card = event.target.closest("[data-item-id]");
  if (!card) return;
  const id = card.dataset.itemId;
  const kind = card.dataset.kind;

  if (btn.dataset.action === "toggle") {
    card.querySelector("[data-role='details']")?.classList.toggle("open");
    return;
  }

  if (btn.dataset.action === "edit") {
    if (kind === "anniversary") editAnniversary(id);
    else editPlan(id);
    return;
  }

  if (btn.dataset.action === "delete") {
    askConfirm("削除しますか？", () => {
      if (kind === "anniversary") {
        state.anniversaries = state.anniversaries.filter((i) => i.id !== id);
        delete state.notes[id];
      } else {
        state.plans = state.plans.filter((i) => i.id !== id);
      }
      persist();
      renderAll();
      toast("削除しました");
    });
    return;
  }

  if (btn.dataset.action === "ready" && kind === "plan") {
    const p = state.plans.find((x) => x.id === id);
    if (!p) return;
    p.ready = btn.checked;
    persist();
    renderList();
    return;
  }

  if (btn.dataset.action === "add-note" && kind === "anniversary") {
    const input = card.querySelector(`[data-note-input='${id}']`);
    const body = (input?.value || "").trim();
    if (!body) return toast("メモ内容を入力してください");
    const note = { id: uid("note"), body: clean(body, 120), createdAt: new Date().toISOString() };
    state.notes[id] = [note, ...(state.notes[id] || [])];
    persist();
    renderList();
    toast("メモを追加しました");
    return;
  }

  if (btn.dataset.action === "edit-note" && kind === "anniversary") {
    const text = prompt("メモを編集", findNote(id, btn.dataset.noteId)?.body || "");
    if (text === null) return;
    const note = findNote(id, btn.dataset.noteId);
    if (!note) return;
    note.body = clean(text, 120);
    persist();
    renderList();
    toast("メモを更新しました");
    return;
  }

  if (btn.dataset.action === "delete-note" && kind === "anniversary") {
    askConfirm("このメモを削除しますか？", () => {
      state.notes[id] = (state.notes[id] || []).filter((n) => n.id !== btn.dataset.noteId);
      persist();
      renderList();
      toast("メモを削除しました");
    });
  }
}

function findNote(annId, noteId) {
  return (state.notes[annId] || []).find((n) => n.id === noteId);
}

function handleTemplateClick(event) {
  const btn = event.target.closest("[data-template]");
  if (!btn) return;
  const value = btn.dataset.template;
  if (state.uiState.addTab === "anniversary") {
    el.annTitle.value = value;
    el.annType.value = ANN_TYPES.includes(value) ? value : guessType(value, ANN_TYPES);
  } else {
    el.planTitle.value = value;
    el.planType.value = PLAN_TYPES.includes(value) ? value : guessType(value, PLAN_TYPES);
  }
}

function submitAnniversary(event) {
  event.preventDefault();
  el.annTitleError.textContent = "";
  el.annDateError.textContent = "";

  const title = clean(el.annTitle.value, 40);
  const date = el.annDate.value;
  const type = el.annType.value;
  const memo = clean(el.annMemo.value, 220);

  let ok = true;
  if (!title) {
    el.annTitleError.textContent = "タイトルを入力してください";
    ok = false;
  }
  if (!validDate(date)) {
    el.annDateError.textContent = "正しい日付を入力してください";
    ok = false;
  }
  if (!ok) return;

  if (el.anniversaryId.value) {
    const target = state.anniversaries.find((i) => i.id === el.anniversaryId.value);
    if (!target) return;
    Object.assign(target, { title, date, type, memo });
    toast("記念日を更新しました");
  } else {
    state.anniversaries.push({ id: uid("ann"), title, date, type, memo, createdAt: new Date().toISOString() });
    toast("記念日を保存しました");
  }

  persist();
  resetAnniversaryForm();
  switchScreen("list");
}

function submitPlan(event) {
  event.preventDefault();
  el.planTitleError.textContent = "";
  el.planDateError.textContent = "";

  const title = clean(el.planTitle.value, 40);
  const date = el.planDate.value;
  const type = el.planType.value;
  const place = clean(el.planPlace.value, 40);
  const memo = clean(el.planMemo.value, 220);
  const ready = el.planReady.checked;

  let ok = true;
  if (!title) {
    el.planTitleError.textContent = "タイトルを入力してください";
    ok = false;
  }
  if (!validDate(date)) {
    el.planDateError.textContent = "正しい日付を入力してください";
    ok = false;
  }
  if (!ok) return;

  if (el.planId.value) {
    const target = state.plans.find((i) => i.id === el.planId.value);
    if (!target) return;
    Object.assign(target, { title, date, type, place, memo, ready });
    toast("予定を更新しました");
  } else {
    state.plans.push({ id: uid("plan"), title, date, type, place, memo, ready, createdAt: new Date().toISOString() });
    toast("予定を保存しました");
  }

  persist();
  resetPlanForm();
  switchScreen("list");
}

function submitSettings(event) {
  event.preventDefault();
  state.settings.personOne = clean(el.personOne.value, 20);
  state.settings.personTwo = clean(el.personTwo.value, 20);
  state.settings.relationshipDate = validDate(el.relationshipDate.value) ? el.relationshipDate.value : "";
  persist();
  renderAll();
  toast("設定を保存しました");
}

function editAnniversary(id) {
  const item = state.anniversaries.find((i) => i.id === id);
  if (!item) return;
  switchScreen("add");
  switchAddTab("anniversary");
  el.anniversaryId.value = item.id;
  el.annTitle.value = item.title;
  el.annDate.value = item.date;
  el.annType.value = item.type;
  el.annMemo.value = item.memo || "";
}

function editPlan(id) {
  const item = state.plans.find((i) => i.id === id);
  if (!item) return;
  switchScreen("add");
  switchAddTab("plan");
  el.planId.value = item.id;
  el.planTitle.value = item.title;
  el.planDate.value = item.date;
  el.planType.value = item.type;
  el.planPlace.value = item.place || "";
  el.planMemo.value = item.memo || "";
  el.planReady.checked = !!item.ready;
}

function resetAnniversaryForm() {
  el.anniversaryForm.reset();
  el.anniversaryId.value = "";
  el.annTitleError.textContent = "";
  el.annDateError.textContent = "";
}

function resetPlanForm() {
  el.planForm.reset();
  el.planId.value = "";
  el.planTitleError.textContent = "";
  el.planDateError.textContent = "";
}

function fillSettings() {
  el.personOne.value = state.settings.personOne;
  el.personTwo.value = state.settings.personTwo;
  el.relationshipDate.value = state.settings.relationshipDate;
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `anniversary-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  el.backupMessage.textContent = "JSONを書き出しました。";
}

async function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!confirm("復元すると現在データを上書きします。続行しますか？")) return;

    const normalized = normalizeState(data);
    if (!normalized) {
      el.backupMessage.textContent = "データ形式が不正です。";
      return;
    }

    state = normalized;
    persist();
    fillSettings();
    renderAll();
    el.backupMessage.textContent = "復元が完了しました。";
    toast("復元しました");
  } catch (_e) {
    el.backupMessage.textContent = "JSONの読み込みに失敗しました。";
  } finally {
    el.importInput.value = "";
  }
}

function buildTypeFilterOptions() {
  const list = state.uiState.listTab === "anniversary" ? ANN_TYPES : PLAN_TYPES;
  return ['<option value="all">すべて</option>', ...list.map((x) => `<option value="${esc(x)}">${esc(x)}</option>`)].join("");
}

function getNextEvent() {
  const all = [
    ...state.anniversaries.map((i) => ({ ...i, kind: "anniversary" })),
    ...state.plans.map((i) => ({ ...i, kind: "plan" }))
  ]
    .filter((i) => dayDiff(todayStr(), i.date) >= 0)
    .sort((a, b) => dayDiff(todayStr(), a.date) - dayDiff(todayStr(), b.date));
  return all[0] || null;
}

function relationshipSummary(startDate) {
  const days = Math.max(1, dayDiff(startDate, todayStr()) + 1);
  return {
    days,
    monthly: nextMonthly(startDate),
    yearly: nextYearly(startDate)
  };
}

function nextMonthly(startDate) {
  const start = toDate(startDate);
  const t = toDate(todayStr());
  const cand = new Date(t.getFullYear(), t.getMonth(), start.getDate());
  if (cand < t) cand.setMonth(cand.getMonth() + 1);
  return dayDiff(todayStr(), iso(cand));
}

function nextYearly(startDate) {
  const s = toDate(startDate);
  const t = toDate(todayStr());
  const cand = new Date(t.getFullYear(), s.getMonth(), s.getDate());
  if (cand < t) cand.setFullYear(cand.getFullYear() + 1);
  return dayDiff(todayStr(), iso(cand));
}

function askConfirm(text, action) {
  pendingAction = action;
  el.confirmText.textContent = text;
  el.confirmDialog.showModal();
}

function runPendingAction() {
  if (pendingAction) pendingAction();
  pendingAction = null;
  el.confirmDialog.close();
}

function toast(msg) {
  clearTimeout(toastTimer);
  el.toast.textContent = msg;
  el.toast.classList.add("show");
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 1900);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return normalizeState(parsed) || defaultState();
  } catch (_e) {
    return defaultState();
  }
}

function normalizeState(src) {
  if (!src || typeof src !== "object") return null;
  const base = defaultState();
  const safe = {
    version: 3,
    settings: {
      personOne: clean(src.settings?.personOne || "", 20),
      personTwo: clean(src.settings?.personTwo || "", 20),
      relationshipDate: validDate(src.settings?.relationshipDate) ? src.settings.relationshipDate : ""
    },
    anniversaries: normalizeItems(src.anniversaries, "anniversary"),
    plans: normalizeItems(src.plans, "plan"),
    notes: normalizeNotes(src.notes),
    uiState: {
      screen: ["home", "list", "add", "settings"].includes(src.uiState?.screen) ? src.uiState.screen : base.uiState.screen,
      listTab: ["anniversary", "plan"].includes(src.uiState?.listTab) ? src.uiState.listTab : base.uiState.listTab,
      addTab: ["anniversary", "plan"].includes(src.uiState?.addTab) ? src.uiState.addTab : base.uiState.addTab,
      guideClosed: Boolean(src.uiState?.guideClosed)
    }
  };

  if (!safe.plans.length && Array.isArray(src.anniversaries) && src.version === 2) {
    safe.anniversaries = normalizeItems(src.anniversaries, "anniversary");
  }

  return safe;
}

function normalizeItems(list, kind) {
  if (!Array.isArray(list)) return [];
  return list
    .map((x) => ({
      id: typeof x.id === "string" ? x.id : uid(kind === "plan" ? "plan" : "ann"),
      title: clean(x.title || "", 40),
      date: validDate(x.date) ? x.date : "",
      type: clean(x.type || x.category || "その他", 20),
      memo: clean(x.memo || x.note || "", 220),
      place: kind === "plan" ? clean(x.place || "", 40) : "",
      ready: kind === "plan" ? Boolean(x.ready) : false,
      createdAt: typeof x.createdAt === "string" ? x.createdAt : new Date().toISOString()
    }))
    .filter((x) => x.title && x.date);
}

function normalizeNotes(obj) {
  if (!obj || typeof obj !== "object") return {};
  const out = {};
  Object.keys(obj).forEach((k) => {
    if (!Array.isArray(obj[k])) return;
    out[k] = obj[k]
      .map((n) => ({
        id: typeof n.id === "string" ? n.id : uid("note"),
        body: clean(n.body || "", 120),
        createdAt: typeof n.createdAt === "string" ? n.createdAt : new Date().toISOString()
      }))
      .filter((n) => n.body);
  });
  return out;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clean(v, max) {
  return String(v || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function validDate(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && !Number.isNaN(new Date(`${v}T00:00:00`).getTime());
}

function formatDate(v) {
  return new Date(`${typeof v === "string" ? v : iso(v)}T00:00:00`).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
}

function formatDateTime(v) {
  const d = new Date(v);
  return d.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function todayStr() {
  return iso(new Date());
}

function dayDiff(from, to) {
  const a = toDate(from);
  const b = toDate(to);
  return Math.round((b - a) / 86400000);
}

function toDate(s) {
  return new Date(`${s}T00:00:00`);
}

function iso(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function pickDailyMessage() {
  const index = Number(todayStr().replace(/-/g, "")) % dailyMessages.length;
  return dailyMessages[index];
}

function guessType(text, options) {
  if (/旅行/.test(text)) return "旅行";
  if (/プレゼント/.test(text)) return "プレゼント";
  if (/食/.test(text) || /ディナー/.test(text)) return "食事";
  if (/相談/.test(text)) return "相談";
  if (/デート/.test(text)) return "デート";
  return options[0];
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function esc(v) {
  return String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
