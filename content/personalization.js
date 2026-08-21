window.eminus = window.eminus || {};

var em = window.eminus;

em.DEFAULT_COURSE_COLOR = "#6c5ce7";
em.COURSE_COLOR_PALETTE = ["#6c5ce7", "#0984e3", "#00a86b", "#e17055", "#d63031", "#e84393", "#8e44ad", "#b7791f"];
em.PERSONAL_SYMBOLS = ["", "★", "✦", "☕", "♡", "✓"];
em.DEFAULT_NOTIFICATION_PREFERENCES = {
  newTasks: true,
  newContent: true,
  overdue: true,
  reminders: true
};

em.normalizeProfile = function (profile) {
  const nickname = String(profile?.nickname || "").replace(/\s+/g, " ").trim().slice(0, 32);
  const panelName = String(profile?.panelName || "").replace(/\s+/g, " ").trim().slice(0, 32);
  const symbol = em.PERSONAL_SYMBOLS.includes(profile?.symbol) ? profile.symbol : "";
  const emptyMessage = String(profile?.emptyMessage || "").replace(/\s+/g, " ").trim().slice(0, 100);
  return { nickname, panelName, symbol, emptyMessage };
};

em.normalizeNotificationPreferences = function (raw) {
  const defaults = em.DEFAULT_NOTIFICATION_PREFERENCES;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...defaults };
  return Object.keys(defaults).reduce((preferences, key) => {
    preferences[key] = raw[key] !== false;
    return preferences;
  }, {});
};

em.normalizeTodayOrder = function (value) {
  const order = String(value || "");
  return ["smart", "deadline", "course"].includes(order) ? order : "smart";
};

em.normalizeCoursePreferences = function (raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const hex = /^#[0-9a-f]{6}$/i;
  const normalized = {};
  Object.entries(raw).slice(0, 100).forEach(([key, preference]) => {
    const safeKey = String(key || "").slice(0, 120);
    if (!safeKey || !preference || typeof preference !== "object") return;
    normalized[safeKey] = {
      favorite: preference.favorite === true,
      color: hex.test(preference.color || "") ? preference.color : em.DEFAULT_COURSE_COLOR
    };
  });
  return normalized;
};

em.getCourseKey = function (item) {
  const courseId = String(item?.courseId || "").trim();
  if (courseId) return "id:" + courseId;
  return "name:" + String(item?.course || "").trim();
};

em.getCoursePreference = function (itemOrKey) {
  const key = typeof itemOrKey === "string" ? itemOrKey : em.getCourseKey(itemOrKey);
  return em.state.coursePreferences?.[key] || null;
};

em.getDefaultCourseColor = function (itemOrKey) {
  const key = typeof itemOrKey === "string" ? itemOrKey : em.getCourseKey(itemOrKey);
  const hash = Array.from(String(key || "")).reduce((total, char) => total + char.charCodeAt(0), 0);
  return em.COURSE_COLOR_PALETTE[hash % em.COURSE_COLOR_PALETTE.length];
};

em.getCourseDisplayColor = function (itemOrKey) {
  return em.getCoursePreference(itemOrKey)?.color || em.getDefaultCourseColor(itemOrKey);
};

em.isFavoriteCourse = function (item) {
  return em.getCoursePreference(item)?.favorite === true;
};

em.renderCourseLabel = function (item) {
  const preference = em.getCoursePreference(item);
  const favorite = preference?.favorite ? `<span class="ep-course-favorite" title="Materia favorita">★</span>` : "";
  const color = em.getCourseDisplayColor(item);
  const marker = `<span class="ep-course-color-dot" style="--ep-course-color:${em.escapeHtml(color)}"></span>`;
  return `${marker}${favorite}${em.escapeHtml(item?.course || "")}`;
};

em.getCourseCardClass = function (item) {
  return item?.course ? " ep-has-course-color" : "";
};

em.getCourseCardStyle = function (item) {
  const color = em.getCourseDisplayColor(item);
  return item?.course ? ` style="--ep-course-color:${em.escapeHtml(color)}"` : "";
};

em.updatePersonalIdentity = function () {
  const nickname = em.state.profile?.nickname || "";
  const panelName = em.state.profile?.panelName || "";
  const symbol = em.state.profile?.symbol || "";
  if (em.panelEls?.personalGreeting) {
    em.panelEls.personalGreeting.textContent = nickname ? em.t("profile_greeting").replace("{name}", nickname) : "";
    em.panelEls.personalGreeting.classList.toggle("ep-hidden", !nickname);
  }
  if (em.panelEls?.title) {
    em.panelEls.title.textContent = panelName || em.t("title");
  }
  if (em.panelEls?.personalSymbol) {
    em.panelEls.personalSymbol.textContent = symbol;
    em.panelEls.personalSymbol.classList.toggle("ep-hidden", !symbol);
  }
};

em.updatePersonalGreeting = function () {
  em.updatePersonalIdentity();
};

em.setNickname = async function (nickname) {
  em.state.profile = em.normalizeProfile({ ...em.state.profile, nickname });
  if (em.panelEls?.nicknameInput) {
    em.panelEls.nicknameInput.value = em.state.profile.nickname;
  }
  em.updatePersonalIdentity();
  const payload = {};
  payload[em.STORAGE_KEYS.PROFILE] = em.state.profile;
  await em.preferencesSet(payload);
};

em.setPanelName = async function (panelName) {
  em.state.profile = em.normalizeProfile({ ...em.state.profile, panelName });
  if (em.panelEls?.panelNameInput) em.panelEls.panelNameInput.value = em.state.profile.panelName;
  em.updatePersonalIdentity();
  const payload = {};
  payload[em.STORAGE_KEYS.PROFILE] = em.state.profile;
  await em.preferencesSet(payload);
};

em.setPersonalSymbol = async function (symbol) {
  em.state.profile = em.normalizeProfile({ ...em.state.profile, symbol });
  if (em.panelEls?.personalSymbolSelect) em.panelEls.personalSymbolSelect.value = em.state.profile.symbol;
  em.updatePersonalIdentity();
  const payload = {};
  payload[em.STORAGE_KEYS.PROFILE] = em.state.profile;
  await em.preferencesSet(payload);
};

em.setEmptyMessage = async function (emptyMessage) {
  em.state.profile = em.normalizeProfile({ ...em.state.profile, emptyMessage });
  if (em.panelEls?.emptyMessageInput) em.panelEls.emptyMessageInput.value = em.state.profile.emptyMessage;
  const payload = {};
  payload[em.STORAGE_KEYS.PROFILE] = em.state.profile;
  await em.preferencesSet(payload);
  em.renderPending(em.state.pending);
};

em.getPersonalEmptyMessage = function (fallback) {
  return em.state.profile?.emptyMessage || fallback;
};

em.setNotificationPreference = async function (key, enabled) {
  if (!Object.prototype.hasOwnProperty.call(em.DEFAULT_NOTIFICATION_PREFERENCES, key)) return;
  em.state.notificationPreferences = em.normalizeNotificationPreferences({
    ...em.state.notificationPreferences,
    [key]: enabled
  });
  const payload = {};
  payload[em.STORAGE_KEYS.NOTIFICATION_PREFERENCES] = em.state.notificationPreferences;
  await em.preferencesSet(payload);
};

em.isNotificationEnabled = function (key) {
  return em.state.notificationPreferences?.[key] !== false;
};

em.setTodayOrder = async function (order) {
  em.state.todayOrder = em.normalizeTodayOrder(order);
  if (em.panelEls?.todayOrderSelect) {
    em.panelEls.todayOrderSelect.value = em.state.todayOrder;
  }
  const payload = {};
  payload[em.STORAGE_KEYS.TODAY_ORDER] = em.state.todayOrder;
  await em.preferencesSet(payload);
  em.renderPending(em.state.pending);
};

em.sortTodayItems = function (items) {
  const order = em.normalizeTodayOrder(em.state.todayOrder);
  return (Array.isArray(items) ? items.slice() : []).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (order === "smart" && em.isFavoriteCourse(a) !== em.isFavoriteCourse(b)) {
      return em.isFavoriteCourse(a) ? -1 : 1;
    }
    if (order === "smart") {
      return em.getUrgencyRank(a.urgency) - em.getUrgencyRank(b.urgency) || em.compareDeadlines(a, b);
    }
    if (order === "course") {
      return String(a.course || "").localeCompare(String(b.course || "")) || em.compareDeadlines(a, b);
    }
    return em.compareDeadlines(a, b);
  });
};

em.updateCoursePreference = async function (key, changes) {
  const safeKey = String(key || "").slice(0, 120);
  if (!safeKey) return;
  const current = em.state.coursePreferences[safeKey] || { color: em.getDefaultCourseColor(safeKey) };
  const next = em.normalizeCoursePreferences({
    ...em.state.coursePreferences,
    [safeKey]: { ...current, ...changes }
  });
  em.state.coursePreferences = next;
  const payload = {};
  payload[em.STORAGE_KEYS.COURSE_PREFERENCES] = next;
  await em.preferencesSet(payload);
  em.renderPending(em.state.pending);
};

em.renderCoursePreferences = function () {
  if (!em.panelEls?.coursePreferencesList) return;
  const coursesByKey = new Map();
  (em.state.pending || []).forEach((item) => {
    const key = em.getCourseKey(item);
    if (key && item?.course && !coursesByKey.has(key)) {
      coursesByKey.set(key, item.course);
    }
  });
  const courses = Array.from(coursesByKey.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  if (!courses.length) {
    em.panelEls.coursePreferencesList.innerHTML = `<div class="ep-personal-empty">${em.escapeHtml(em.t("profile_courses_empty"))}</div>`;
    return;
  }
  em.panelEls.coursePreferencesList.innerHTML = courses.map(([key, name]) => {
    const preference = em.state.coursePreferences[key] || {};
    const color = preference.color || em.getDefaultCourseColor(key);
    return `
      <div class="ep-course-preference">
        <label class="ep-course-preference-name">
          <input type="checkbox" data-course-favorite="${em.escapeHtml(key)}"${preference.favorite ? " checked" : ""} />
          <span title="Marcar como favorita">★</span>
          <span>${em.escapeHtml(name)}</span>
        </label>
        <input type="color" data-course-color="${em.escapeHtml(key)}" value="${em.escapeHtml(color)}" title="Color de la materia" />
      </div>
    `;
  }).join("");
  em.panelEls.coursePreferencesList.querySelectorAll("[data-course-favorite]").forEach((input) => {
    input.addEventListener("change", () => {
      em.updateCoursePreference(input.getAttribute("data-course-favorite"), { favorite: input.checked });
    });
  });
  em.panelEls.coursePreferencesList.querySelectorAll("[data-course-color]").forEach((input) => {
    input.addEventListener("change", () => {
      em.updateCoursePreference(input.getAttribute("data-course-color"), { color: input.value });
    });
  });
};

em.hydratePersonalization = async function (storedData) {
  const data = storedData || await em.preferencesGet(em.PREFERENCE_STORAGE_KEYS);
  em.state.profile = em.normalizeProfile(data[em.STORAGE_KEYS.PROFILE]);
  em.state.coursePreferences = em.normalizeCoursePreferences(data[em.STORAGE_KEYS.COURSE_PREFERENCES]);
  em.state.todayOrder = em.normalizeTodayOrder(data[em.STORAGE_KEYS.TODAY_ORDER]);
  em.state.notificationPreferences = em.normalizeNotificationPreferences(data[em.STORAGE_KEYS.NOTIFICATION_PREFERENCES]);
  if (em.panelEls?.nicknameInput) em.panelEls.nicknameInput.value = em.state.profile.nickname;
  if (em.panelEls?.panelNameInput) em.panelEls.panelNameInput.value = em.state.profile.panelName;
  if (em.panelEls?.personalSymbolSelect) em.panelEls.personalSymbolSelect.value = em.state.profile.symbol;
  if (em.panelEls?.emptyMessageInput) em.panelEls.emptyMessageInput.value = em.state.profile.emptyMessage;
  if (em.panelEls?.todayOrderSelect) em.panelEls.todayOrderSelect.value = em.state.todayOrder;
  if (em.panelEls?.notificationPreferenceInputs) {
    Object.entries(em.panelEls.notificationPreferenceInputs).forEach(([key, input]) => {
      if (input) input.checked = em.state.notificationPreferences[key] !== false;
    });
  }
  em.updatePersonalIdentity();
};

em.resetPersonalization = function () {
  em.state.profile = { nickname: "", panelName: "", symbol: "", emptyMessage: "" };
  em.state.coursePreferences = {};
  em.state.todayOrder = "smart";
  em.state.notificationPreferences = { ...em.DEFAULT_NOTIFICATION_PREFERENCES };
  if (em.panelEls?.nicknameInput) em.panelEls.nicknameInput.value = "";
  if (em.panelEls?.panelNameInput) em.panelEls.panelNameInput.value = "";
  if (em.panelEls?.personalSymbolSelect) em.panelEls.personalSymbolSelect.value = "";
  if (em.panelEls?.emptyMessageInput) em.panelEls.emptyMessageInput.value = "";
  if (em.panelEls?.todayOrderSelect) em.panelEls.todayOrderSelect.value = "smart";
  if (em.panelEls?.notificationPreferenceInputs) {
    Object.values(em.panelEls.notificationPreferenceInputs).forEach((input) => {
      if (input) input.checked = true;
    });
  }
  em.updatePersonalIdentity();
  em.renderCoursePreferences();
};
