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

// El ancla es la posición elegida al arrastrar. La posición visible se
// deriva de ella: si el panel abierto no cabe hacia abajo, se abre hacia
// arriba, y al minimizarlo vuelve exactamente al ancla.
em.layoutPanel = function () {
  if (!em.panelEls || !em.panelEls.root || !em.panelAnchor) return;
  const root = em.panelEls.root;
  const { left, top } = em.panelAnchor;
  const height = root.getBoundingClientRect().height;
  let nextTop = top;
  if (em.state.isCollapsed) {
    em.collapsedPanelHeight = height;
  } else if (top + height > window.innerHeight - 8) {
    nextTop = top + (em.collapsedPanelHeight || 0) - height;
  }
  const next = em.clampPanelPosition(left, nextTop);
  root.style.left = next.left + "px";
  root.style.top = next.top + "px";
  root.style.right = "auto";
};

em.applyPanelPosition = function (position) {
  if (!em.panelEls || !em.panelEls.root || !position) return;
  em.panelAnchor = { left: Number(position.left || 16), top: Number(position.top || 96) };
  em.layoutPanel();
};

em.persistPanelPosition = async function () {
  if (!em.panelAnchor) return;
  const { left, top } = em.panelAnchor;
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

  if (typeof window.ResizeObserver === "function") {
    new window.ResizeObserver(() => em.layoutPanel()).observe(em.panelEls.root);
  }

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
    if (!em.dragState.moved) return;
    const next = em.clampPanelPosition(event.clientX - em.dragState.offsetX, event.clientY - em.dragState.offsetY);
    em.applyPanelPosition(next);
  });

  const finishDrag = async (event) => {
    if (!em.dragState) return;
    const wasMoved = em.dragState.moved;
    const originalTarget = em.dragState.target;
    em.dragState = null;
    em.panelEls.root.classList.remove("ep-dragging");
    if (wasMoved) await em.persistPanelPosition();

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
