export function cleanText(value, max = 100) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function notify(el, text, type = "success") {
  el.textContent = text;
  el.classList.remove("is-success", "is-error");
  el.classList.add(type === "error" ? "is-error" : "is-success");
  el.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => el.classList.remove("show"), 1800);
}
