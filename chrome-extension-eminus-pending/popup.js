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

  if (!snapshot) {
    countEl.textContent = "0";
    checkEl.textContent = "Sin lectura";
    return;
  }

  countEl.textContent = String(snapshot.pendingCount || 0);
  checkEl.textContent = fmtTime(snapshot.updatedAt);
}

async function openPanelAndRefresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  await chrome.tabs.sendMessage(tab.id, { type: "OPEN_AND_REFRESH_PANEL" });
  setTimeout(render, 300);
}

document.getElementById("openPanel").addEventListener("click", openPanelAndRefresh);
render();
