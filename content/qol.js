/* ══════════════════════════════════════════
   DAILY QUALITY OF LIFE HELPERS
   ══════════════════════════════════════════ */

window.eminus = window.eminus || {};

var em = window.eminus;

em.REMINDER_PRESETS = {
  off: [],
  staggered: [48, 24, 6, 1],
  "single-1": [1],
  "single-3": [3],
  "single-6": [6],
  "single-12": [12],
  "single-24": [24],
  "single-48": [48]
};

em.normalizeReminderMode = function (value) {
  const raw = String(value ?? "").trim();
  if (em.REMINDER_PRESETS[raw]) return raw;
  const legacyHours = Number(raw);
  if (legacyHours === 0) return "off";
  if ([1, 3, 6, 12, 24, 48].includes(legacyHours)) return "single-" + legacyHours;
  return "staggered";
};

em.getReminderThresholds = function () {
  return em.REMINDER_PRESETS[em.normalizeReminderMode(em.state.reminderMode)] || [];
};

em.normalizeQuietHour = function (value) {
  const raw = String(value ?? "").trim();
  if (raw === "") return "";
  const hour = Number(raw);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? String(hour) : "";
};

em.isQuietHoursNow = function (date) {
  const start = em.normalizeQuietHour(em.state.quietHours?.start);
  const end = em.normalizeQuietHour(em.state.quietHours?.end);
  if (start === "" || end === "" || start === end) return false;
  const hour = (date || new Date()).getHours();
  const startHour = Number(start);
  const endHour = Number(end);
  return startHour < endHour
    ? hour >= startHour && hour < endHour
    : hour >= startHour || hour < endHour;
};

em.getReminderNotificationKey = function (itemId, threshold) {
  return String(itemId || "") + "::" + String(threshold || "");
};

em.pruneNotifiedUpcomingIds = function (items, notifiedSet) {
  const itemIds = new Set((Array.isArray(items) ? items : []).map((item) => item?.id).filter(Boolean));
  return new Set(Array.from(notifiedSet || []).filter((key) => itemIds.has(String(key).split("::")[0])));
};

em.getUrgencyRank = function (urgency) {
  return { overdue: 0, imminent: 1, urgent: 2, normal: 3 }[urgency] ?? 4;
};

em.sortActivityItems = function (items, sortKey) {
  const selectedSort = String(sortKey || em.state.filters?.sort || "deadline");
  return (Array.isArray(items) ? items.slice() : []).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (selectedSort === "urgency") {
      return em.getUrgencyRank(a.urgency) - em.getUrgencyRank(b.urgency) ||
        em.compareDeadlines(a, b);
    }
    if (selectedSort === "course") {
      return String(a.course || "").localeCompare(String(b.course || "")) ||
        em.compareDeadlines(a, b);
    }
    if (selectedSort === "title") {
      return String(a.title || "").localeCompare(String(b.title || ""));
    }
    return em.compareDeadlines(a, b);
  });
};

em.compareDeadlines = function (a, b) {
  if (!a.deadlineRaw && !b.deadlineRaw) return String(a.title || "").localeCompare(String(b.title || ""));
  if (!a.deadlineRaw) return 1;
  if (!b.deadlineRaw) return -1;
  return new Date(a.deadlineRaw).getTime() - new Date(b.deadlineRaw).getTime();
};

em.getTodayItems = function (items) {
  const now = Date.now();
  const limit = now + 48 * 60 * 60 * 1000;
  const todayItems = (Array.isArray(items) ? items : []).filter((item) => {
    if (!item || item.archived) return false;
    if (item.pinned || item.urgency === "overdue") return true;
    if (!item.deadlineRaw) return false;
    const deadline = new Date(item.deadlineRaw).getTime();
    return Number.isFinite(deadline) && deadline >= now && deadline <= limit;
  });
  return em.sortTodayItems ? em.sortTodayItems(todayItems) : em.sortActivityItems(todayItems);
};

em.escapeCalendarText = function (value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
};

em.toCalendarUtc = function (date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
};

em.exportWeekCalendar = function () {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const activities = em.getVisiblePending(em.state.pending).filter((item) => {
    if (!item.deadlineRaw) return false;
    const deadline = new Date(item.deadlineRaw);
    return !Number.isNaN(deadline.getTime()) && deadline >= start && deadline < end;
  });
  if (!activities.length) {
    em.setStatus(em.t("status_calendar_empty"));
    return;
  }
  const createdAt = em.toCalendarUtc(new Date());
  const events = activities.map((item) => {
    const deadline = new Date(item.deadlineRaw);
    return [
      "BEGIN:VEVENT",
      "UID:" + em.escapeCalendarText(item.id) + "@miyu-eminus",
      "DTSTAMP:" + createdAt,
      "DTSTART:" + em.toCalendarUtc(deadline),
      "DTEND:" + em.toCalendarUtc(new Date(deadline.getTime() + 30 * 60 * 1000)),
      "SUMMARY:" + em.escapeCalendarText(item.title),
      "DESCRIPTION:" + em.escapeCalendarText(item.course + " - " + em.t("due") + " " + (item.deadlineStr || "")),
      "END:VEVENT"
    ].join("\r\n");
  });
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Miyu Eminus//Pendientes//ES",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR"
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([calendar], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "miyu-pendientes-semana.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  em.setStatus(em.t("status_calendar_exported").replace("{n}", activities.length));
};

em.setQuietHours = async function (start, end) {
  em.state.quietHours = {
    start: em.normalizeQuietHour(start),
    end: em.normalizeQuietHour(end)
  };
  const payload = {};
  payload[em.STORAGE_KEYS.QUIET_HOURS] = em.state.quietHours;
  await em.preferencesSet(payload);
};

em.setReminderMode = async function (mode) {
  em.state.reminderMode = em.normalizeReminderMode(mode);
  if (em.panelEls && em.panelEls.reminderSelect) {
    em.panelEls.reminderSelect.value = em.state.reminderMode === "off"
      ? "0"
      : em.state.reminderMode === "staggered"
        ? "staggered"
        : em.state.reminderMode.replace("single-", "");
  }
  const payload = {};
  payload[em.STORAGE_KEYS.REMINDER_MODE] = em.state.reminderMode;
  await em.preferencesSet(payload);
};
