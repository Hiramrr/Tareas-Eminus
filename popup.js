async function getState() {
  const data = await chrome.storage.local.get(["eminusLastSnapshot"]);
  return data.eminusLastSnapshot || null;
}

function fmtTime(iso) {
  if (!iso) return "Sin lectura";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "Sin lectura";
  return `Última lectura: ${dt.toLocaleString()}`;
}

async function render() {
  const snapshot = await getState();
  const countEl = document.getElementById("count");
  const checkEl = document.getElementById("lastCheck");
  const newEl = document.getElementById("newCount");
  const overdueEl = document.getElementById("overdueCount");

  if (!snapshot) {
    countEl.textContent = "0";
    checkEl.textContent = "Sin lectura";
    newEl.textContent = "";
    overdueEl.textContent = "";
    return;
  }

  countEl.textContent = String(snapshot.pendingCount || 0);
  checkEl.textContent = fmtTime(snapshot.updatedAt);

  const newCount = Number(snapshot.newCount || 0);
  const overdueCount = Number(snapshot.overdueCount || 0);

  newEl.textContent = newCount > 0 ? `[ ${newCount} nueva${newCount === 1 ? "" : "s"} ]` : "";
  overdueEl.textContent = overdueCount > 0 ? `[ ${overdueCount} vencida${overdueCount === 1 ? "" : "s"} ]` : "";
}

async function openPanelAndRefresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  await chrome.tabs.sendMessage(tab.id, { type: "OPEN_AND_REFRESH_PANEL" });
  setTimeout(render, 300);
}

document.getElementById("openPanel").addEventListener("click", openPanelAndRefresh);
render();
