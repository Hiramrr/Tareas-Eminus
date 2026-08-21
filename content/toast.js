window.eminus = window.eminus || {};

var em = window.eminus;

em.MAX_TOASTS = 3;
em.TOAST_DEFAULT_MS = 4000;
em.TOAST_ACTION_MS = 8000;

em.getToastStack = function () {
  if (!em.panelEls || !em.panelEls.root) return null;
  let stack = em.panelEls.root.querySelector(".ep-toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "ep-toast-stack";
    em.panelEls.root.appendChild(stack);
  }
  return stack;
};

em.showToast = function (message, type, options) {
  type = type || "info";
  const stack = em.getToastStack();
  if (!stack) return;

  while (stack.children.length >= em.MAX_TOASTS) {
    stack.firstElementChild?.remove();
  }

  const toast = document.createElement("div");
  toast.className = "ep-toast ep-toast-" + type;
  toast.setAttribute("role", "status");

  const text = document.createElement("span");
  text.className = "ep-toast-text";
  text.textContent = message;
  toast.appendChild(text);

  let actionTimer = null;
  if (options && options.action && typeof options.action.onClick === "function") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ep-toast-action";
    button.textContent = options.action.label || em.t("undo");
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      window.clearTimeout(actionTimer);
      dismiss();
      options.action.onClick();
    });
    toast.appendChild(button);
  }

  const dismiss = () => {
    toast.classList.remove("ep-toast-visible");
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 250);
  };

  stack.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("ep-toast-visible");
  });

  const duration = Number(options?.duration) || (options?.action ? em.TOAST_ACTION_MS : em.TOAST_DEFAULT_MS);
  setTimeout(dismiss, duration);
};

em.getActivityNotificationTarget = function (item) {
  if (!item || item.kind === "content") return null;
  const activityId = em.normalizePositiveId(item.activityId);
  const courseId = em.normalizePositiveId(item.courseId);
  if (!activityId) return null;
  return { kind: "activity", activityId, courseId };
};

em.notifyUser = async function (title, body, target, options) {
  if (!em.hasRuntimeApi) return;
  try {
    await chrome.runtime.sendMessage({
      type: "SHOW_NOTIFICATION",
      title,
      body,
      target: target || null,
      snoozeMinutes: Number(options?.snoozeMinutes || 0),
      snoozeLabel: String(options?.snoozeLabel || "")
    });
  } catch (_) {
    console.debug("No se pudo enviar notificación");
  }
};

em.syncBadge = async function (count, newCount, overdueCount) {
  if (!em.hasRuntimeApi) return;
  newCount = Number(newCount || 0);
  overdueCount = Number(overdueCount || 0);
  count = Number(count || 0);
  try {
    await chrome.runtime.sendMessage({ type: "UPDATE_BADGE", count, newCount, overdueCount });
  } catch (_) {
    console.debug("No se pudo actualizar badge");
  }
};
