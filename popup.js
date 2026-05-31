const SNAPSHOT_KEY = "eminusLastSnapshot";
const READ_CONTENT_IDS_KEY = "eminusReadContentIds";
const EMINUS_URL = "https://eminus.uv.mx/eminus4/page/course/list";

function isActivity(item) {
  return item && item.kind !== "content" && !item.archived;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin fecha";
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function activityUrl(item) {
  if (!item?.activityId) return EMINUS_URL;
  const url = new URL("https://eminus.uv.mx/aplicativoEminus/actividad-detalle/" + encodeURIComponent(item.activityId));
  if (item.courseId) url.searchParams.set("courseId", item.courseId);
  return url.toString();
}

async function openEminus() {
  const tabs = await chrome.tabs.query({ url: ["https://eminus.uv.mx/eminus4/*"] });
  const tab = tabs.find((entry) => entry.id);
  if (tab?.id) {
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.sendMessage(tab.id, { type: "OPEN_AND_REFRESH_PANEL" }).catch(() => {});
  } else {
    await chrome.tabs.create({ url: EMINUS_URL });
  }
  window.close();
}

function renderTaskList(items) {
  const list = document.querySelector("#task-list");
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No hay entregas próximas con fecha.";
    list.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const button = document.createElement("button");
    const course = document.createElement("span");
    const title = document.createElement("strong");
    const due = document.createElement("small");
    button.className = "task";
    button.type = "button";
    course.textContent = item.course || "Eminus";
    title.textContent = item.title || "Actividad sin título";
    due.textContent = "vence: " + formatDate(item.deadlineRaw);
    button.append(course, title, due);
    button.addEventListener("click", async () => {
      await chrome.tabs.create({ url: activityUrl(item) });
      window.close();
    });
    list.appendChild(button);
  });
}

async function render() {
  const data = await chrome.storage.local.get([SNAPSHOT_KEY, READ_CONTENT_IDS_KEY]);
  const snapshot = data[SNAPSHOT_KEY] || {};
  const items = Array.isArray(snapshot.pending) ? snapshot.pending : [];
  const activities = items.filter(isActivity);
  const now = new Date();
  const readIds = new Set(Array.isArray(data[READ_CONTENT_IDS_KEY]) ? data[READ_CONTENT_IDS_KEY] : []);
  const upcoming = activities
    .filter((item) => item.deadlineRaw && new Date(item.deadlineRaw).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.deadlineRaw).getTime() - new Date(b.deadlineRaw).getTime())
    .slice(0, 3);

  document.querySelector("#pending-count").textContent = String(activities.length);
  document.querySelector("#today-count").textContent = String(activities.filter((item) => item.deadlineRaw && isSameDay(new Date(item.deadlineRaw), now)).length);
  document.querySelector("#overdue-count").textContent = String(activities.filter((item) => item.urgency === "overdue").length);
  document.querySelector("#content-count").textContent = String(items.filter((item) => item.kind === "content" && !item.archived && !readIds.has(item.id)).length);
  document.querySelector("#last-sync").textContent = snapshot.updatedAt
    ? "Última lectura: " + new Date(snapshot.updatedAt).toLocaleString("es-MX")
    : "Sin lectura guardada";
  renderTaskList(upcoming);
}

document.querySelector("#open-eminus").addEventListener("click", openEminus);
render();
