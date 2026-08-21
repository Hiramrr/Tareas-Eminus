window.eminus = window.eminus || {};

var em = window.eminus;

em.clampPanelPosition = function (left, top) {
  if (!em.panelEls || !em.panelEls.root) {
    return { left, top };
  }

  const panelRect = em.panelEls.root.getBoundingClientRect();
  const maxLeft = Math.max(8, window.innerWidth - panelRect.width - 8);
  const maxTop = Math.max(8, window.innerHeight - panelRect.height - 8);
  return {
    left: Math.min(Math.max(8, left), maxLeft),
    top: Math.min(Math.max(8, top), maxTop)
  };
};

em.applyPanelPosition = function (position) {
  if (!em.panelEls || !em.panelEls.root || !position) return;
  const next = em.clampPanelPosition(Number(position.left || 16), Number(position.top || 96));
  em.panelEls.root.style.left = next.left + "px";
  em.panelEls.root.style.top = next.top + "px";
  em.panelEls.root.style.right = "auto";
};

em.persistPanelPosition = async function () {
  if (!em.panelEls || !em.panelEls.root) return;
  const left = parseFloat(em.panelEls.root.style.left);
  const top = parseFloat(em.panelEls.root.style.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return;
  const payload = {};
  payload[em.STORAGE_KEYS.PANEL_POSITION] = { left, top };
  await em.storageSet(payload);
};

em.restorePanelPosition = async function () {
  const data = await em.storageGet([em.STORAGE_KEYS.PANEL_POSITION]);
  const saved = data[em.STORAGE_KEYS.PANEL_POSITION];
  if (saved && typeof saved === "object") {
    em.applyPanelPosition(saved);
  }
};

em.setupPanelDrag = function () {
  if (!em.panelEls || !em.panelEls.header || !em.panelEls.root) return;

  em.panelEls.header.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (target instanceof Element && (target.closest("button") || target.closest(".ep-theme-menu"))) {
      return;
    }

    const rect = em.panelEls.root.getBoundingClientRect();
    em.dragState = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      target: event.target
    };
    em.panelEls.root.classList.add("ep-dragging");
    em.panelEls.header.setPointerCapture(event.pointerId);
  });

  em.panelEls.header.addEventListener("pointermove", (event) => {
    if (!em.dragState) return;
    if (Math.abs(event.clientX - em.dragState.startX) > 3 || Math.abs(event.clientY - em.dragState.startY) > 3) {
      em.dragState.moved = true;
    }
    const next = em.clampPanelPosition(event.clientX - em.dragState.offsetX, event.clientY - em.dragState.offsetY);
    em.applyPanelPosition(next);
  });

  const finishDrag = async (event) => {
    if (!em.dragState) return;
    const wasMoved = em.dragState.moved;
    const originalTarget = em.dragState.target;
    em.dragState = null;
    em.panelEls.root.classList.remove("ep-dragging");
    await em.persistPanelPosition();

    if (!wasMoved) {
      const isCatClick = originalTarget instanceof HTMLElement && originalTarget.closest("#ep-seal-art");
      if (em.state.isCollapsed) {
        em.toggleCollapse();
      } else if (isCatClick) {
        em.toggleCollapse();
      }
    }
  };

  em.panelEls.header.addEventListener("pointerup", finishDrag);
  em.panelEls.header.addEventListener("pointercancel", finishDrag);
};
