const STORAGE_KEYS = {
  settings: "anniv.settings.v1",
  anniversaries: "anniv.anniversaries.v1",
  plans: "anniv.plans.v1",
  memories: "anniv.memories.v1",
  uiState: "anniv.uiState.v1"
};

const ANN_TYPES = ["初デート", "告白", "誕生日", "旅行", "記念日ディナー", "その他"];
const PLAN_TYPES = ["デート", "ごはん", "旅行", "プレゼント", "連絡", "その他"];
const MEMORY_TAGS = ["うれしかった", "デート", "会話", "プレゼント", "ごはん", "旅行", "何気ない日"];

const state = {
  settings: safeLoad(STORAGE_KEYS.settings, { personOne: "", personTwo: "", relationshipDate: "", notify: { enabled: false } }),
  anniversaries: safeLoad(STORAGE_KEYS.anniversaries, []),
  plans: safeLoad(STORAGE_KEYS.plans, []),
  memories: safeLoad(STORAGE_KEYS.memories, []),
  uiState: safeLoad(STORAGE_KEYS.uiState, { screen: "home", listTab: "anniversary", addMode: "quick" })
};

const el = {
  screens: [...document.querySelectorAll(".screen")],
  navBtns: [...document.querySelectorAll(".nav-btn")],
  todayDate: document.getElementById("today-date"),
  daysTogether: document.getElementById("days-together"),
  statusCopy: document.getElementById("status-copy"),
  monthlyLeft: document.getElementById("monthly-left"),
  yearlyLeft: document.getElementById("yearly-left"),
  todayMessage: document.getElementById("today-message"),
  todayActions: document.getElementById("today-actions"),
  nearPlan: document.getElementById("near-plan"),
  recentAnniversary: document.getElementById("recent-anniversary"),
  homeMemory: document.getElementById("home-memory"),
  homeEmpty: document.getElementById("home-empty"),
  listTabs: [...document.querySelectorAll("[data-list-tab]")],
  searchInput: document.getElementById("search-input"),
  sortFilter: document.getElementById("sort-filter"),
  timeFilter: document.getElementById("time-filter"),
  favoriteFilter: document.getElementById("favorite-filter"),
  typeFilter: document.getElementById("type-filter"),
  tagFilter: document.getElementById("tag-filter"),
  listContainer: document.getElementById("list-container"),
  listEmpty: document.getElementById("list-empty"),
  reflectionSummary: document.getElementById("reflection-summary"),
  favoriteMemories: document.getElementById("favorite-memories"),
  recentMemories: document.getElementById("recent-memories"),
  pastAnniversaries: document.getElementById("past-anniversaries"),
  pastPlans: document.getElementById("past-plans"),
  addModeBtns: [...document.querySelectorAll("[data-add-mode]")],
  quickAdd: document.getElementById("quick-add"),
  anniversaryForm: document.getElementById("anniversary-form"),
  planForm: document.getElementById("plan-form"),
  memoryForm: document.getElementById("memory-form"),
  annId: document.getElementById("ann-id"),
  annTitle: document.getElementById("ann-title"),
  annDate: document.getElementById("ann-date"),
  annType: document.getElementById("ann-type"),
  annMemo: document.getElementById("ann-memo"),
  annTitleError: document.getElementById("ann-title-error"),
  annDateError: document.getElementById("ann-date-error"),
  planId: document.getElementById("plan-id"),
  planTitle: document.getElementById("plan-title"),
  planDate: document.getElementById("plan-date"),
  planType: document.getElementById("plan-type"),
  planPlace: document.getElementById("plan-place"),
  planMemo: document.getElementById("plan-memo"),
  planTitleError: document.getElementById("plan-title-error"),
  planDateError: document.getElementById("plan-date-error"),
  memoryId: document.getElementById("memory-id"),
  memoryBody: document.getElementById("memory-body"),
  memoryDate: document.getElementById("memory-date"),
  memoryTag: document.getElementById("memory-tag"),
  memoryAnniversary: document.getElementById("memory-anniversary"),
  memoryFavorite: document.getElementById("memory-favorite"),
  memoryBodyError: document.getElementById("memory-body-error"),
  settingsForm: document.getElementById("settings-form"),
  personOne: document.getElementById("person-one"),
  personTwo: document.getElementById("person-two"),
  relationshipDate: document.getElementById("relationship-date"),
  exportBtn: document.getElementById("export-btn"),
  importInput: document.getElementById("import-input"),
  sampleBtn: document.getElementById("sample-btn"),
  backupMessage: document.getElementById("backup-message"),
  toast: document.getElementById("toast"),
  dialog: document.getElementById("confirm-dialog"),
  dialogText: document.getElementById("confirm-text"),
  dialogOk: document.getElementById("confirm-ok"),
  dialogCancel: document.getElementById("confirm-cancel")
};

let pendingAction = null;
let toastTimer = null;

init();

function init() {
  normalizeAll();
  fillStaticOptions();
  fillForms();
  bindEvents();
  switchScreen(state.uiState.screen);
  switchListTab(state.uiState.listTab);
  switchAddMode(state.uiState.addMode);
  renderAll();
}

function bindEvents() {
  el.navBtns.forEach((btn) => btn.addEventListener("click", () => switchScreen(btn.dataset.nav)));
  el.listTabs.forEach((btn) => btn.addEventListener("click", () => switchListTab(btn.dataset.listTab)));
  el.addModeBtns.forEach((btn) => btn.addEventListener("click", () => switchAddMode(btn.dataset.addMode)));
  [el.searchInput, el.sortFilter, el.timeFilter, el.favoriteFilter, el.typeFilter, el.tagFilter].forEach((node) => {
    node.addEventListener("input", renderList);
    node.addEventListener("change", renderList);
  });
  el.listContainer.addEventListener("click", handleListAction);
  el.quickAdd.addEventListener("click", handleQuickAdd);
  el.todayActions.addEventListener("click", handleRecommendation);
  el.anniversaryForm.addEventListener("submit", submitAnniversary);
  el.planForm.addEventListener("submit", submitPlan);
  el.memoryForm.addEventListener("submit", submitMemory);
  el.settingsForm.addEventListener("submit", saveSettings);
  el.exportBtn.addEventListener("click", exportAll);
  el.importInput.addEventListener("change", importAll);
  el.sampleBtn.addEventListener("click", loadSample);
  el.dialogOk.addEventListener("click", () => {
    if (pendingAction) pendingAction();
    pendingAction = null;
    el.dialog.close();
  });
  el.dialogCancel.addEventListener("click", () => el.dialog.close());
}

function renderAll() {
  el.todayDate.textContent = formatDate(today());
  renderHome();
  refreshFilterOptions();
  renderList();
  renderReflection();
  renderQuickAdd();
}

function renderHome() {
  const rel = relationshipSummary(state.settings.relationshipDate);
  el.daysTogether.textContent = rel.days ? `${rel.days}日` : "--日";
  el.monthlyLeft.textContent = rel.monthly == null ? "あと--日" : rel.monthly === 0 ? "今日です" : `あと${rel.monthly}日`;
  el.yearlyLeft.textContent = rel.yearly == null ? "あと--日" : rel.yearly === 0 ? "今日です" : `あと${rel.yearly}日`;

  el.statusCopy.textContent = buildStatusCopy(rel);
  el.todayMessage.textContent = pickTodayMessage(rel);

  const recommendations = buildRecommendations();
  el.todayActions.innerHTML = `
    <p class="eyebrow">今日のおすすめアクション</p>
    ${recommendations
      .map((item) => `<button type="button" class="btn secondary" data-jump="${item.jump}">${esc(item.text)}</button>`)
      .join("")}
  `;

  const nearestPlan = getNearestUpcoming(state.plans);
  el.nearPlan.innerHTML = nearestPlan
    ? `<p class="eyebrow">最近近い予定</p><p class="item-title">${esc(nearestPlan.title)}</p><p class="meta">${formatDate(
        nearestPlan.date
      )} / あと${dayDiff(today(), nearestPlan.date)}日</p>`
    : `<p class="eyebrow">最近近い予定</p><p class="empty">予定がありません。次に会う日を1件入れておくと安心です。</p>`;

  const newestAnniv = [...state.anniversaries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  el.recentAnniversary.innerHTML = newestAnniv
    ? `<p class="eyebrow">最近追加した記念日</p><p class="item-title">${esc(newestAnniv.title)}</p><p class="meta">${formatDate(
        newestAnniv.date
      )}</p>`
    : `<p class="eyebrow">最近追加した記念日</p><p class="empty">まだ記念日がありません。まずは付き合った日を登録しましょう。</p>`;

  const memory = state.memories.find((m) => m.favorite) || [...state.memories].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  el.homeMemory.innerHTML = memory
    ? `<p class="eyebrow">思い出メモ</p><p>${esc(memory.body)}</p><p class="meta">${formatDate(memory.date)} / ${esc(memory.tag)}</p>`
    : `<p class="eyebrow">思い出メモ</p><p class="empty">一言だけでも残しておくと、あとで見返したくなります。</p>`;

  const showEmpty = !state.settings.relationshipDate || (!state.anniversaries.length && !state.plans.length && !state.memories.length);
  el.homeEmpty.classList.toggle("hidden", !showEmpty);
  if (showEmpty) el.homeEmpty.textContent = "まずは『追加』から、付き合った日・予定・思い出メモのどれか1つを登録してみましょう。";
}

function renderList() {
  const tab = state.uiState.listTab;
  const query = clean(el.searchInput.value, 60).toLowerCase();
  const typeFilter = el.typeFilter.value || "all";
  const tagFilter = el.tagFilter.value || "all";
  const timeFilter = el.timeFilter.value;
  const favFilter = el.favoriteFilter.value;
  const sort = el.sortFilter.value;

  let source = tab === "anniversary" ? state.anniversaries : tab === "plan" ? state.plans : state.memories;
  source = source.filter((item) => {
    const text = JSON.stringify(item).toLowerCase();
    if (query && !text.includes(query)) return false;
    if (typeFilter !== "all" && (item.type || item.tag) !== typeFilter) return false;
    if (tagFilter !== "all" && item.tag !== tagFilter) return false;
    const diff = dayDiff(today(), item.date);
    if (timeFilter === "future" && diff < 0) return false;
    if (timeFilter === "past" && diff >= 0) return false;
    if (favFilter === "favorite" && !item.favorite) return false;
    return true;
  });

  source.sort((a, b) => {
    if (tab === "memory") return sort === "far" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt);
    return sort === "far" ? dayDiff(today(), b.date) - dayDiff(today(), a.date) : dayDiff(today(), a.date) - dayDiff(today(), b.date);
  });

  el.listContainer.innerHTML = source.map((item) => renderListItem(item, tab)).join("");
  el.listEmpty.classList.toggle("hidden", source.length > 0);
  if (!source.length) el.listEmpty.innerHTML = `<p>${emptyMessage(tab)}</p><div class="actions"><button class="btn secondary" type="button" data-jump="add">追加へ移動</button></div>`;
}

function renderListItem(item, tab) {
  const diff = dayDiff(today(), item.date);
  const left = diff === 0 ? "今日" : diff > 0 ? `あと${diff}日` : `${Math.abs(diff)}日前`;
  return `
  <article class="item" data-id="${item.id}" data-tab="${tab}">
    <div class="item-head">
      <div><p class="item-title">${esc(item.title || item.body)}</p><p class="meta">${formatDate(item.date)} / ${esc(item.type || item.tag || "-")}</p></div>
      <strong>${tab === "memory" ? esc(item.favorite ? "★" : "") : left}</strong>
    </div>
    <div class="badges">
      ${item.favorite ? '<span class="badge favorite">お気に入り</span>' : ""}
      ${diff === 0 ? '<span class="badge today">今日</span>' : ""}
    </div>
    <div class="actions">
      <button class="btn secondary" data-action="toggle" type="button">詳細</button>
      <button class="btn secondary" data-action="edit" type="button">編集</button>
      <button class="btn secondary" data-action="delete" type="button">削除</button>
    </div>
    <div class="details">
      <p class="meta">${esc(item.memo || item.body || "メモなし")}</p>
      ${item.place ? `<p class="meta">場所: ${esc(item.place)}</p>` : ""}
      ${item.relatedAnniversaryId ? `<p class="meta">関連記念日: ${esc(findAnniversary(item.relatedAnniversaryId)?.title || "")}</p>` : ""}
    </div>
  </article>`;
}

function renderReflection() {
  const monthCount = state.memories.filter((m) => m.date.slice(0, 7) === today().slice(0, 7)).length;
  const allDates = [...state.anniversaries, ...state.plans, ...state.memories].map((i) => i.updatedAt || i.createdAt).filter(Boolean).sort();
  const lastRecorded = allDates[allDates.length - 1];

  el.reflectionSummary.innerHTML = `
    <li>今月のふりかえり件数: ${monthCount}件</li>
    <li>最後に記録した日: ${lastRecorded ? formatDate(lastRecorded.slice(0, 10)) : "まだありません"}</li>
    <li>記念日: ${state.anniversaries.length}件 / 予定: ${state.plans.length}件 / 思い出メモ: ${state.memories.length}件</li>
  `;

  renderBlockList(el.favoriteMemories, "お気に入りメモ", state.memories.filter((m) => m.favorite).slice(0, 5), (m) => `${m.body} (${formatDate(m.date)})`);
  renderBlockList(el.recentMemories, "最近の思い出メモ", [...state.memories].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), (m) => `${m.body} (${m.tag})`);
  renderBlockList(el.pastAnniversaries, "過去の記念日", state.anniversaries.filter((a) => dayDiff(today(), a.date) < 0).slice(-5).reverse(), (a) => `${a.title} (${formatDate(a.date)})`);
  renderBlockList(el.pastPlans, "過去の予定", state.plans.filter((p) => dayDiff(today(), p.date) < 0).slice(-5).reverse(), (p) => `${p.title} (${formatDate(p.date)})`);
}

function renderBlockList(node, title, items, formatter) {
  node.innerHTML = `<p class="eyebrow">${title}</p>${items.length ? `<ul>${items.map((i) => `<li class="meta">${esc(formatter(i))}</li>`).join("")}</ul>` : '<p class="empty">まだありません。</p>'}`;
}

function renderQuickAdd() {
  const templates = ["初デート", "告白", "誕生日", "旅行", "プレゼント購入", "記念日ディナー", "会いたいことを伝える", "次のデート候補を考える"];
  const showQuick = state.uiState.addMode === "quick";
  el.quickAdd.classList.toggle("hidden", !showQuick);
  el.anniversaryForm.classList.toggle("hidden", showQuick);
  el.planForm.classList.toggle("hidden", showQuick);
  el.memoryForm.classList.toggle("hidden", showQuick);
  if (!showQuick) return;

  el.quickAdd.innerHTML = `
    <p class="eyebrow">すぐ追加</p>
    <div class="actions">
      <button class="btn" type="button" data-quick="memory">思い出メモを1件追加</button>
      <button class="btn secondary" type="button" data-quick="plan">次の予定を1件追加</button>
    </div>
    <p class="meta">テンプレート</p>
    <div class="actions">${templates.map((t) => `<button class="btn secondary" type="button" data-template="${esc(t)}">${esc(t)}</button>`).join("")}</div>
  `;
}

function switchScreen(screen) {
  const safe = ["home", "list", "reflection", "add"].includes(screen) ? screen : "home";
  state.uiState.screen = safe;
  el.screens.forEach((s) => s.classList.toggle("active", s.dataset.screen === safe));
  el.navBtns.forEach((n) => n.classList.toggle("active", n.dataset.nav === safe));
  saveUI();
  renderAll();
}

function switchListTab(tab) {
  state.uiState.listTab = ["anniversary", "plan", "memory"].includes(tab) ? tab : "anniversary";
  el.listTabs.forEach((b) => b.classList.toggle("active", b.dataset.listTab === state.uiState.listTab));
  refreshFilterOptions();
  saveUI();
  renderList();
}

function switchAddMode(mode) {
  state.uiState.addMode = mode === "full" ? "full" : "quick";
  el.addModeBtns.forEach((b) => b.classList.toggle("active", b.dataset.addMode === state.uiState.addMode));
  renderQuickAdd();
  saveUI();
}

function handleRecommendation(event) {
  const btn = event.target.closest("[data-jump]");
  if (!btn) return;
  switchScreen(btn.dataset.jump);
  if (btn.dataset.jump === "add") switchAddMode("quick");
}

function handleQuickAdd(event) {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.quick === "memory") {
    switchAddMode("full");
    el.memoryForm.classList.remove("hidden");
    el.anniversaryForm.classList.add("hidden");
    el.planForm.classList.add("hidden");
    el.memoryBody.focus();
  }
  if (target.dataset.quick === "plan") {
    switchAddMode("full");
    el.planForm.classList.remove("hidden");
    el.memoryForm.classList.add("hidden");
    el.anniversaryForm.classList.add("hidden");
    el.planTitle.focus();
  }
  if (target.dataset.template) {
    switchAddMode("full");
    const t = target.dataset.template;
    if (["初デート", "告白", "誕生日", "旅行"].includes(t)) {
      el.anniversaryForm.classList.remove("hidden");
      el.planForm.classList.add("hidden");
      el.memoryForm.classList.add("hidden");
      el.annTitle.value = t;
    } else {
      el.planForm.classList.remove("hidden");
      el.anniversaryForm.classList.add("hidden");
      el.memoryForm.classList.add("hidden");
      el.planTitle.value = t;
    }
  }
}

function handleListAction(event) {
  const btn = event.target.closest("button");
  if (!btn) return;
  if (btn.dataset.jump === "add") return switchScreen("add");

  const card = event.target.closest("[data-id]");
  if (!card) return;
  const tab = card.dataset.tab;
  const id = card.dataset.id;

  if (btn.dataset.action === "toggle") {
    card.querySelector(".details")?.classList.toggle("open");
    return;
  }

  if (btn.dataset.action === "edit") {
    toast("今回は削除せず、同内容を追加して更新する運用を想定しています。");
    return;
  }

  if (btn.dataset.action === "delete") {
    askConfirm("削除しますか？", () => {
      if (tab === "anniversary") state.anniversaries = state.anniversaries.filter((x) => x.id !== id);
      if (tab === "plan") state.plans = state.plans.filter((x) => x.id !== id);
      if (tab === "memory") state.memories = state.memories.filter((x) => x.id !== id);
      persistAll();
      renderAll();
      toast("削除しました");
    });
  }
}

function submitAnniversary(event) {
  event.preventDefault();
  el.annTitleError.textContent = "";
  el.annDateError.textContent = "";
  const title = clean(el.annTitle.value, 40);
  const date = el.annDate.value;
  if (!title) el.annTitleError.textContent = "タイトルを入力してください";
  if (!validDate(date)) el.annDateError.textContent = "日付を確認してください";
  if (el.annTitleError.textContent || el.annDateError.textContent) return;

  state.anniversaries.push(withAudit({
    id: uid("ann"),
    title,
    date,
    type: clean(el.annType.value, 20) || "その他",
    memo: clean(el.annMemo.value, 220)
  }));
  persistAll();
  event.target.reset();
  toast("記念日を保存しました");
  renderAll();
}

function submitPlan(event) {
  event.preventDefault();
  el.planTitleError.textContent = "";
  el.planDateError.textContent = "";
  const title = clean(el.planTitle.value, 40);
  const date = el.planDate.value;
  if (!title) el.planTitleError.textContent = "タイトルを入力してください";
  if (!validDate(date)) el.planDateError.textContent = "日付を確認してください";
  if (el.planTitleError.textContent || el.planDateError.textContent) return;

  state.plans.push(withAudit({
    id: uid("plan"),
    title,
    date,
    type: clean(el.planType.value, 20) || "その他",
    place: clean(el.planPlace.value, 40),
    memo: clean(el.planMemo.value, 220)
  }));
  persistAll();
  event.target.reset();
  toast("予定を保存しました");
  renderAll();
}

function submitMemory(event) {
  event.preventDefault();
  el.memoryBodyError.textContent = "";
  const body = clean(el.memoryBody.value, 300);
  if (!body) {
    el.memoryBodyError.textContent = "本文を入力してください";
    return;
  }

  state.memories.push(withAudit({
    id: uid("mem"),
    body,
    title: body.slice(0, 18),
    date: validDate(el.memoryDate.value) ? el.memoryDate.value : today(),
    tag: clean(el.memoryTag.value, 20) || "何気ない日",
    relatedAnniversaryId: el.memoryAnniversary.value || "",
    favorite: el.memoryFavorite.checked
  }));
  persistAll();
  event.target.reset();
  toast("思い出メモを保存しました");
  renderAll();
}

function saveSettings(event) {
  event.preventDefault();
  state.settings.personOne = clean(el.personOne.value, 20);
  state.settings.personTwo = clean(el.personTwo.value, 20);
  state.settings.relationshipDate = validDate(el.relationshipDate.value) ? el.relationshipDate.value : "";
  persistAll();
  toast("設定を保存しました");
  renderHome();
}

function fillForms() {
  el.personOne.value = state.settings.personOne;
  el.personTwo.value = state.settings.personTwo;
  el.relationshipDate.value = state.settings.relationshipDate;
  el.memoryDate.value = today();
}

function fillStaticOptions() {
  el.annType.innerHTML = ANN_TYPES.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  el.planType.innerHTML = PLAN_TYPES.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  el.memoryTag.innerHTML = MEMORY_TAGS.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
}

function refreshFilterOptions() {
  const tab = state.uiState.listTab;
  const typeList = tab === "anniversary" ? ANN_TYPES : tab === "plan" ? PLAN_TYPES : MEMORY_TAGS;
  el.typeFilter.innerHTML = `<option value="all">すべて</option>${typeList.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}`;
  el.tagFilter.innerHTML = `<option value="all">タグすべて</option>${MEMORY_TAGS.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}`;
  el.tagFilter.disabled = tab !== "memory";
  el.memoryAnniversary.innerHTML = `<option value="">未選択</option>${state.anniversaries.map((a) => `<option value="${a.id}">${esc(a.title)}</option>`).join("")}`;
}

function buildStatusCopy(rel) {
  if (!rel.days) return "付き合った日を設定すると、今日どんな日かすぐ分かります。";
  if (rel.yearly === 0 || rel.monthly === 0) return "今日は記念日当日です。少し特別な過ごし方にしてみましょう。";
  if (rel.monthly <= 3) return `今日は月記念日の${rel.monthly}日前です。軽く予定を確認しておくと安心です。`;
  return "何もない日も、ふたりにとっては積み重ねの日です。";
}

function pickTodayMessage(rel) {
  const upcomingPlan = getNearestUpcoming(state.plans);
  const pool = [];
  if (rel.monthly != null && rel.monthly <= 2) pool.push("もうすぐ特別な日です。予定を確認しておきましょう。");
  if (rel.monthly === 0 || rel.yearly === 0) pool.push("今日は大切な日です。少し特別に過ごしてみましょう。");
  if (upcomingPlan && dayDiff(today(), upcomingPlan.date) <= 2) pool.push("近いうちに予定があります。準備を見直しておくと安心です。");
  pool.push("何もない日も、ふたりにとっては積み重ねの日です。", "短いメッセージ1つでも、ちゃんと気持ちは届きます。", "今日の終わりに、よかったことを1行だけ残してみましょう。");
  const seed = Number(today().replace(/-/g, "")) + state.memories.length;
  return pool[seed % pool.length];
}

function buildRecommendations() {
  const items = [];
  if (!state.plans.length) items.push({ text: "次の予定を決める", jump: "add" });
  if (!state.memories.length) items.push({ text: "思い出を1行だけ残す", jump: "add" });
  if (state.memories.length > 0) items.push({ text: "写真やメモを見返す", jump: "reflection" });
  items.push({ text: "短いメッセージを送る", jump: "home" });
  return items.slice(0, 3);
}

function relationshipSummary(dateStr) {
  if (!validDate(dateStr)) return { days: null, monthly: null, yearly: null };
  const days = Math.max(1, dayDiff(dateStr, today()) + 1);
  return { days, monthly: daysUntilNextMonthly(dateStr), yearly: daysUntilNextYearly(dateStr) };
}

function daysUntilNextMonthly(startDate) {
  const start = toDate(startDate);
  const t = toDate(today());
  const candidate = new Date(t.getFullYear(), t.getMonth(), start.getDate());
  if (candidate < t) candidate.setMonth(candidate.getMonth() + 1);
  return dayDiff(today(), toISO(candidate));
}

function daysUntilNextYearly(startDate) {
  const s = toDate(startDate);
  const t = toDate(today());
  const candidate = new Date(t.getFullYear(), s.getMonth(), s.getDate());
  if (candidate < t) candidate.setFullYear(candidate.getFullYear() + 1);
  return dayDiff(today(), toISO(candidate));
}

function getNearestUpcoming(list) {
  return [...list].filter((i) => dayDiff(today(), i.date) >= 0).sort((a, b) => dayDiff(today(), a.date) - dayDiff(today(), b.date))[0] || null;
}

function findAnniversary(id) {
  return state.anniversaries.find((a) => a.id === id);
}

function emptyMessage(tab) {
  if (tab === "anniversary") return "まだ記念日がありません。まずは付き合った日や初デートを登録しましょう。";
  if (tab === "plan") return "予定がありません。次に会う日や食事予定を入れておくと便利です。";
  return "思い出メモがありません。一言だけでも残しておくと後で見返せます。";
}

function exportAll() {
  const bundle = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    anniversaries: state.anniversaries,
    plans: state.plans,
    memories: state.memories,
    uiState: state.uiState
  };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `futari-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  el.backupMessage.textContent = "バックアップを書き出しました。";
}

async function importAll(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    if (!isBackupSchema(raw)) throw new Error("schema");
    if (!confirm("復元すると現在のデータを上書きします。続行しますか？")) return;
    state.settings = normalizeSettings(raw.settings);
    state.anniversaries = normalizeCollection(raw.anniversaries, "anniversary");
    state.plans = normalizeCollection(raw.plans, "plan");
    state.memories = normalizeCollection(raw.memories, "memory");
    state.uiState = normalizeUI(raw.uiState);
    persistAll();
    fillForms();
    renderAll();
    el.backupMessage.textContent = "復元に成功しました。";
    toast("復元が完了しました");
  } catch (_err) {
    el.backupMessage.textContent = "JSONの形式が正しくありません。";
  } finally {
    el.importInput.value = "";
  }
}

function loadSample() {
  const todayDate = today();
  state.settings = { personOne: "りな", personTwo: "こうた", relationshipDate: shiftDate(todayDate, -180), notify: { enabled: false } };
  state.anniversaries = [withAudit({ id: uid("ann"), title: "初デート", date: shiftDate(todayDate, -170), type: "初デート", memo: "駅前のカフェ" })];
  state.plans = [withAudit({ id: uid("plan"), title: "記念日ディナー", date: shiftDate(todayDate, 5), type: "ごはん", place: "渋谷", memo: "予約する" })];
  state.memories = [withAudit({ id: uid("mem"), body: "帰り道の会話がすごくよかった", title: "帰り道の会話", date: shiftDate(todayDate, -2), tag: "会話", relatedAnniversaryId: "", favorite: true })];
  persistAll();
  fillForms();
  renderAll();
  toast("サンプルデータを読み込みました");
}

function isBackupSchema(data) {
  return data && typeof data === "object" && Array.isArray(data.anniversaries) && Array.isArray(data.plans) && Array.isArray(data.memories) && typeof data.settings === "object";
}

function normalizeAll() {
  state.settings = normalizeSettings(state.settings);
  state.anniversaries = normalizeCollection(state.anniversaries, "anniversary");
  state.plans = normalizeCollection(state.plans, "plan");
  state.memories = normalizeCollection(state.memories, "memory");
  state.uiState = normalizeUI(state.uiState);
}

function normalizeSettings(src) {
  return {
    personOne: clean(src?.personOne, 20),
    personTwo: clean(src?.personTwo, 20),
    relationshipDate: validDate(src?.relationshipDate) ? src.relationshipDate : "",
    notify: { enabled: Boolean(src?.notify?.enabled) }
  };
}

function normalizeCollection(list, kind) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      const base = {
        id: typeof item.id === "string" ? item.id : uid(kind.slice(0, 3)),
        createdAt: validTimestamp(item.createdAt) ? item.createdAt : new Date().toISOString(),
        updatedAt: validTimestamp(item.updatedAt) ? item.updatedAt : new Date().toISOString(),
        date: validDate(item.date) ? item.date : today()
      };
      if (kind === "anniversary") return { ...base, title: clean(item.title, 40), type: clean(item.type, 20) || "その他", memo: clean(item.memo, 220), favorite: Boolean(item.favorite) };
      if (kind === "plan") return { ...base, title: clean(item.title, 40), type: clean(item.type, 20) || "その他", place: clean(item.place, 40), memo: clean(item.memo, 220), favorite: Boolean(item.favorite) };
      return { ...base, body: clean(item.body, 300), title: clean(item.title, 30), tag: clean(item.tag, 20) || "何気ない日", relatedAnniversaryId: clean(item.relatedAnniversaryId, 30), favorite: Boolean(item.favorite) };
    })
    .filter((item) => item.title || item.body);
}

function normalizeUI(src) {
  return {
    screen: ["home", "list", "reflection", "add"].includes(src?.screen) ? src.screen : "home",
    listTab: ["anniversary", "plan", "memory"].includes(src?.listTab) ? src.listTab : "anniversary",
    addMode: ["quick", "full"].includes(src?.addMode) ? src.addMode : "quick"
  };
}

function persistAll() {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
  localStorage.setItem(STORAGE_KEYS.anniversaries, JSON.stringify(state.anniversaries));
  localStorage.setItem(STORAGE_KEYS.plans, JSON.stringify(state.plans));
  localStorage.setItem(STORAGE_KEYS.memories, JSON.stringify(state.memories));
  saveUI();
}

function saveUI() {
  localStorage.setItem(STORAGE_KEYS.uiState, JSON.stringify(state.uiState));
}

function safeLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (_err) {
    return fallback;
  }
}

function askConfirm(text, callback) {
  pendingAction = callback;
  el.dialogText.textContent = text;
  el.dialog.showModal();
}

function toast(message) {
  clearTimeout(toastTimer);
  el.toast.textContent = message;
  el.toast.classList.add("show");
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 1800);
}

function withAudit(item) {
  const now = new Date().toISOString();
  return { ...item, createdAt: now, updatedAt: now };
}

function today() {
  return toISO(new Date());
}

function dayDiff(from, to) {
  return Math.round((toDate(to) - toDate(from)) / 86400000);
}

function shiftDate(dateStr, diff) {
  const d = toDate(dateStr);
  d.setDate(d.getDate() + diff);
  return toISO(d);
}

function validDate(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && !Number.isNaN(toDate(v).getTime());
}

function validTimestamp(v) {
  return typeof v === "string" && !Number.isNaN(new Date(v).getTime());
}

function formatDate(v) {
  return new Date(`${v}T00:00:00`).toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" });
}

function toDate(v) {
  return new Date(`${v}T00:00:00`);
}

function toISO(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function clean(value, max = 999) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function esc(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
