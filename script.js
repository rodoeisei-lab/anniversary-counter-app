const STORAGE_KEY = "anniv.share.v2";

const THEMES = {
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

const SAMPLE_ITEMS = [
  { id: uid(), title: "付き合った日", date: "2024-06-01", message: "これからもよろしく", theme: "romantic", createdAt: nowIso(), updatedAt: nowIso() },
  { id: uid(), title: "次の旅行", date: "2026-05-15", message: "思い出を増やそう", theme: "pop", createdAt: nowIso(), updatedAt: nowIso() }
];

const state = loadState();
const el = {
  daysTogether: document.getElementById("days-together"),
  heroCaption: document.getElementById("hero-caption"),
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
  shareMain: document.getElementById("share-main"),
  downloadMain: document.getElementById("download-main"),
  presentMain: document.getElementById("present-main"),
  floatingShare: document.getElementById("floating-share"),
  presentMode: document.getElementById("present-mode"),
  presentCard: document.getElementById("present-card"),
  presentShare: document.getElementById("present-share"),
  presentSave: document.getElementById("present-save"),
  presentClose: document.getElementById("present-close"),
  canvas: document.getElementById("share-canvas"),
  toast: document.getElementById("toast")
};

bindEvents();
render();

function bindEvents() {
  el.form.addEventListener("submit", onSubmit);
  el.cancelEdit.addEventListener("click", resetForm);
  el.sampleBtn.addEventListener("click", () => {
    state.anniversaries = structuredClone(SAMPLE_ITEMS);
    persist();
    render();
    notify("サンプル記念日を読み込みました");
  });
  el.themeToggle.addEventListener("click", () => {
    state.darkMode = !state.darkMode;
    persist();
    applyTheme();
  });

  el.list.addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const item = findItem(id);
    if (!item) return;

    if (btn.dataset.action === "edit") return fillForm(item);
    if (btn.dataset.action === "delete") {
      state.anniversaries = state.anniversaries.filter((ann) => ann.id !== id);
      persist();
      render();
      return;
    }
    if (btn.dataset.action === "present") return openPresent(item);
    if (btn.dataset.action === "save") return saveCardAsImage(item);
    if (btn.dataset.action === "share") return shareCard(item);
  });

  el.shareMain.addEventListener("click", () => shareCard(getFeatured()));
  el.downloadMain.addEventListener("click", () => saveCardAsImage(getFeatured()));
  el.presentMain.addEventListener("click", () => openPresent(getFeatured()));
  el.floatingShare.addEventListener("click", () => shareCard(getFeatured()));
  el.presentShare.addEventListener("click", () => shareCard(state.presentingId ? findItem(state.presentingId) : getFeatured()));
  el.presentSave.addEventListener("click", () => saveCardAsImage(state.presentingId ? findItem(state.presentingId) : getFeatured()));
  el.presentClose.addEventListener("click", closePresent);
}

function render() {
  applyTheme();
  normalize();

  const featured = getFeatured();
  if (featured) {
    const d = daysFromToday(featured.date);
    el.daysTogether.textContent = formatLeft(d);
    el.heroCaption.textContent = `${featured.title}（${ymdToJp(featured.date)}）`; 
  } else {
    el.daysTogether.textContent = "--日";
    el.heroCaption.textContent = "記念日を追加して共有カードを作りましょう。";
  }

  el.list.innerHTML = state.anniversaries
    .map((item) => {
      const theme = THEMES[item.theme] || THEMES.simple;
      const diff = daysFromToday(item.date);
      return `
        <article class="ann-card ${theme.className}">
          <p class="ann-title">${escapeHtml(item.title)}</p>
          <p class="ann-days">${formatLeft(diff)}</p>
          <p class="ann-date">${ymdToJp(item.date)}</p>
          <p class="ann-msg">${escapeHtml(item.message || "特別メッセージを追加できます")}</p>
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

function onSubmit(event) {
  event.preventDefault();
  const payload = {
    id: el.annId.value || uid(),
    title: clean(el.annTitle.value, 40),
    date: el.annDate.value,
    message: clean(el.annMessage.value, 120),
    theme: el.annTheme.value,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  const err = validate(payload);
  if (err) {
    el.formError.textContent = err;
    return;
  }

  const idx = state.anniversaries.findIndex((x) => x.id === payload.id);
  if (idx >= 0) {
    payload.createdAt = state.anniversaries[idx].createdAt;
    state.anniversaries[idx] = payload;
    notify("記念日を更新しました");
  } else {
    state.anniversaries.push(payload);
    notify("記念日を追加しました");
  }

  persist();
  resetForm();
  render();
}

function openPresent(item) {
  if (!item) return notify("共有する記念日がありません");
  state.presentingId = item.id;
  const theme = THEMES[item.theme] || THEMES.simple;
  el.presentCard.className = `present-card ${theme.className}`;
  el.presentCard.innerHTML = `
    <p class="eyebrow">Gift Mode</p>
    <p class="ann-title">${escapeHtml(item.title)}</p>
    <p class="ann-days">${formatLeft(daysFromToday(item.date))}</p>
    <p class="ann-date">${ymdToJp(item.date)}</p>
    <p class="ann-msg">${escapeHtml(item.message || "")}</p>
  `;
  el.presentMode.classList.remove("hidden");
}

function closePresent() {
  state.presentingId = "";
  el.presentMode.classList.add("hidden");
}

function fillForm(item) {
  el.annId.value = item.id;
  el.annTitle.value = item.title;
  el.annDate.value = item.date;
  el.annMessage.value = item.message || "";
  el.annTheme.value = item.theme || "simple";
  el.formError.textContent = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  el.form.reset();
  el.annId.value = "";
  el.formError.textContent = "";
}

async function shareCard(item) {
  if (!item) return notify("共有する記念日がありません");
  const blob = await generateCardBlob(item);
  const file = new File([blob], `anniversary-${item.id}.png`, { type: "image/png" });
  const text = `${item.title} ${formatLeft(daysFromToday(item.date))} #ふたりカウント`;

  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: item.title, text });
      notify("共有シートを開きました");
    } else {
      notify("この端末は直接共有に未対応です。画像保存をご利用ください");
      await saveBlob(blob, `anniversary-${item.id}.png`);
    }
  } catch {
    notify("共有をキャンセルしました");
  }
}

async function saveCardAsImage(item) {
  if (!item) return notify("保存する記念日がありません");
  const blob = await generateCardBlob(item);
  await saveBlob(blob, `anniversary-${item.id}.png`);
  notify("画像を保存しました");
}

async function generateCardBlob(item) {
  const ctx = el.canvas.getContext("2d");
  const theme = THEMES[item.theme] || THEMES.simple;

  const grad = ctx.createLinearGradient(0, 0, el.canvas.width, el.canvas.height);
  grad.addColorStop(0, theme.gradient[0]);
  grad.addColorStop(1, theme.gradient[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);

  const textColor = item.theme === "pop" ? "#2e2500" : "#ffffff";
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(850, 160, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = textColor;
  ctx.font = "700 44px sans-serif";
  ctx.fillText("ふたりカウント", 86, 120);

  ctx.font = "800 86px sans-serif";
  fillWrapped(ctx, item.title, 86, 260, 900, 110);

  ctx.font = "900 200px sans-serif";
  ctx.fillText(formatLeft(daysFromToday(item.date)), 86, 620);

  ctx.font = "600 44px sans-serif";
  ctx.fillText(ymdToJp(item.date), 86, 720);

  ctx.font = "500 54px sans-serif";
  fillWrapped(ctx, item.message || "Special Message", 86, 860, 900, 74);

  ctx.font = "500 36px sans-serif";
  ctx.globalAlpha = 0.8;
  ctx.fillText("#anniversary #gift #share", 86, 1240);
  ctx.globalAlpha = 1;

  return new Promise((resolve) => el.canvas.toBlob(resolve, "image/png", 1));
}

function fillWrapped(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = text.split("");
  let line = "";
  chars.forEach((ch) => {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = ch;
      y += lineHeight;
    } else {
      line = test;
    }
  });
  if (line) ctx.fillText(line, x, y);
}

function applyTheme() {
  document.documentElement.dataset.theme = state.darkMode ? "dark" : "light";
  el.themeToggle.textContent = state.darkMode ? "☀️" : "🌙";
}

function normalize() {
  state.anniversaries = state.anniversaries
    .filter((i) => i && i.id)
    .map((i) => ({
      id: i.id,
      title: clean(i.title, 40),
      date: i.date,
      message: clean(i.message, 120),
      theme: THEMES[i.theme] ? i.theme : "simple",
      createdAt: i.createdAt || nowIso(),
      updatedAt: nowIso()
    }))
    .sort((a, b) => Math.abs(daysFromToday(a.date)) - Math.abs(daysFromToday(b.date)));
  if (!state.anniversaries.length) state.anniversaries = structuredClone(SAMPLE_ITEMS);
}

function getFeatured() {
  return state.anniversaries[0] || null;
}

function findItem(id) {
  return state.anniversaries.find((ann) => ann.id === id);
}

function validate(item) {
  if (!item.title) return "タイトルを入力してください";
  if (!item.date) return "日付を選択してください";
  if (!THEMES[item.theme]) return "テーマが不正です";
  return "";
}

function formatLeft(diff) {
  if (diff === 0) return "今日";
  return diff > 0 ? `あと${diff}日` : `${Math.abs(diff)}日経過`;
}

function daysFromToday(target) {
  const base = new Date();
  const t = new Date(`${target}T00:00:00`);
  const d0 = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  const d1 = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  return Math.round((d1 - d0) / 86400000);
}

function ymdToJp(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

function notify(text) {
  el.toast.textContent = text;
  el.toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => el.toast.classList.remove("show"), 1800);
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ anniversaries: state.anniversaries, darkMode: state.darkMode }));
}

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { anniversaries: Array.isArray(raw.anniversaries) ? raw.anniversaries : [], darkMode: !!raw.darkMode, presentingId: "" };
  } catch {
    return { anniversaries: [], darkMode: false, presentingId: "" };
  }
}

function clean(value, max = 100) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function uid() {
  return `ann_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
