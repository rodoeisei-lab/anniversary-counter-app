import { THEMES } from "./constants.js";
import { daysFromToday, formatCountLabel, ymdToJp } from "./date-utils.js";

export async function shareCard(item, canvas, notify) {
  if (!item) return notify("共有する記念日がありません");
  const payload = buildSharePayload(item);

  try {
    if (navigator.share) {
      await navigator.share(payload);
      notify("共有シートを開きました");
      return;
    }

    if (!navigator.clipboard?.writeText) {
      notify("この端末では共有・コピーに未対応です", "error");
      return;
    }

    await navigator.clipboard.writeText(payload.text);
    notify("コピーしました");
  } catch {
    notify("共有に失敗しました", "error");
  }
}

export async function saveCardAsImage(item, canvas, notify) {
  if (!item) return notify("保存する記念日がありません");
  const blob = await generateCardBlob(item, canvas);
  await saveBlob(blob, `anniversary-${item.id}.png`);
  notify("画像を保存しました");
}

async function generateCardBlob(item, canvas) {
  const ctx = canvas.getContext("2d");
  const theme = THEMES[item.theme] || THEMES.simple;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, theme.gradient[0]);
  grad.addColorStop(1, theme.gradient[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const textColor = item.theme === "pop" ? "#2e2500" : "#ffffff";
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(860, 170, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = textColor;
  ctx.font = "700 44px sans-serif";
  ctx.fillText("ふたりカウント", 86, 120);

  ctx.font = "800 84px sans-serif";
  fillWrapped(ctx, item.title, 86, 250, 900, 104);

  ctx.font = "900 190px sans-serif";
  ctx.fillText(formatCountLabel(daysFromToday(item.date)), 86, 620);

  ctx.font = "600 44px sans-serif";
  ctx.fillText(ymdToJp(item.date), 86, 730);

  ctx.font = "500 54px sans-serif";
  fillWrapped(ctx, item.message || "Special Message", 86, 860, 900, 74);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
}

function buildSharePayload(item) {
  const diff = daysFromToday(item.date);
  const countLabel = formatCountLabel(diff);
  const title = `${item.title} | ふたりカウント`;
  const text = [
    `📅 ${item.title}`,
    `日付: ${ymdToJp(item.date)}`,
    `カウント: ${countLabel}`,
    `${item.title}まで${countLabel}！`
  ].join("\n");
  return { title, text };
}

function fillWrapped(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = String(text || "").split("");
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

async function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
