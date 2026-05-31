/* ══════════════════════════════════════════
   STATE & ARCHIVE/PIN NORMALIZATION HELPERS
   ══════════════════════════════════════════ */

window.eminus = window.eminus || {};

var em = window.eminus;

em.state = {
  isCollapsed: true,
  activeTab: "pending",
  pending: [],
  logs: [],
  archivedIds: new Set(),
  pinnedIds: new Set(),
  contentExpandedIds: new Set(),
  contentFileLocationCache: new Map(),
  notifiedUpcomingIds: new Set(),
  lastUpdatedAt: null,
  isArchiveView: false,
  lastTabBeforeArchive: "pending",
  reminderMode: "staggered",
  quietHours: { start: "", end: "" },
  lang: "es",
  isLogTabVisible: true,
  filters: {
    query: "",
    course: "all",
    urgency: "all",
    dateRange: "all",
    sort: "deadline"
  },
  contentFilters: {
    type: "all",
    module: "all",
    sort: "newest"
  },
  customTheme: {
    bg: "#ffffff",
    text: "#111111",
    border: "#111111",
    accent: "#6c5ce7",
    overdue: "#e74c3c",
    imminent: "#f1c40f",
    urgent: "#e67e22"
  },
  panelSize: "normal",
  deliveryAnimation: "cycle",
  profile: { nickname: "", panelName: "", symbol: "", emptyMessage: "" },
  coursePreferences: {},
  todayOrder: "smart",
  notificationPreferences: {
    newTasks: true,
    newContent: true,
    overdue: true,
    reminders: true
  },
  isFiltersCompact: false,
  isScanning: false
};

em.routeObserverStarted = false;
em.detailForceTimer = null;
em.dragState = null;
em.autoRefreshTimer = null;
em.autoRefreshMinutes = 0;
em.panelEls = null;
em.panelUiStatePersistTimer = null;

em.normalizeNotifiedUpcomingIds = function (raw) {
  if (!Array.isArray(raw)) return new Set();
  const ids = raw.map((id) => String(id)).filter((id) => id);
  return new Set(ids);
};

em.normalizeArchivedIds = function (raw) {
  if (!Array.isArray(raw)) return new Set();
  const ids = raw.map((id) => String(id)).filter((id) => id);
  return new Set(ids);
};

em.normalizePinnedIds = function (raw) {
  if (!Array.isArray(raw)) return new Set();
  const ids = raw.map((id) => String(id)).filter((id) => id);
  return new Set(ids);
};

em.applyArchivedState = function (items, archivedSet) {
  if (!Array.isArray(items)) return [];
  items.forEach((item) => {
    if (!item || !item.id) return;
    item.archived = archivedSet.has(item.id);
  });
  return items;
};

em.pruneArchivedIds = function (items, archivedSet) {
  const next = new Set();
  if (!Array.isArray(items)) return next;
  items.forEach((item) => {
    if (item && item.id && archivedSet.has(item.id)) {
      next.add(item.id);
    }
  });
  return next;
};

em.applyPinnedState = function (items, pinnedSet) {
  if (!Array.isArray(items)) return [];
  items.forEach((item) => {
    if (!item || !item.id) return;
    item.pinned = pinnedSet.has(item.id);
  });
  return items;
};

em.prunePinnedIds = function (items, pinnedSet) {
  const next = new Set();
  if (!Array.isArray(items)) return next;
  items.forEach((item) => {
    if (item && item.id && pinnedSet.has(item.id)) {
      next.add(item.id);
    }
  });
  return next;
};

em.isContentItem = function (item) {
  return item && item.kind === "content";
};

em.getActivityItems = function (items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item && !em.isContentItem(item));
};

em.getContentItems = function (items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => em.isContentItem(item));
};

em.getVisiblePending = function (items) {
  if (!Array.isArray(items)) return [];
  return em.getActivityItems(items).filter((item) => !item.archived);
};

em.getVisiblePendingCount = function (items) {
  return em.getVisiblePending(items).length;
};

em.getVisibleContent = function (items) {
  return em.getContentItems(items).filter((item) => !item.archived);
};

em.isSameDay = function (a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

em.applyAdvancedFilters = function (items, options) {
  if (!Array.isArray(items)) return [];
  const filters = options || em.state.filters || {};
  const query = String(filters.query || "").trim().toLowerCase();
  const selectedCourse = String(filters.course || "all");
  const selectedUrgency = String(filters.urgency || "all");
  const selectedDateRange = String(filters.dateRange || "all");

  const now = new Date();
  const nowMs = now.getTime();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const filtered = items.filter((item) => {
    if (!item) return false;

    if (selectedCourse !== "all" && item.course !== selectedCourse) return false;
    if (selectedUrgency !== "all" && item.urgency !== selectedUrgency) return false;

    if (query) {
      const haystack = (
        String(item.course || "") + " " +
        String(item.title || "") + " " +
        String(item.contentTypeLabel || "") + " " +
        String(item.unitName || "") + " " +
        String(item.description || "")
      ).toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (selectedDateRange !== "all") {
      if (selectedDateRange === "nodate") {
        return !item.deadlineRaw;
      }
      if (!item.deadlineRaw) return false;
      const deadline = new Date(item.deadlineRaw);
      const deadlineMs = deadline.getTime();
      if (Number.isNaN(deadlineMs)) return false;

      if (selectedDateRange === "today") {
        if (!em.isSameDay(deadline, now)) return false;
      } else if (selectedDateRange === "3d") {
        if (deadlineMs < nowMs || deadlineMs > nowMs + 3 * dayMs) return false;
      } else if (selectedDateRange === "7d") {
        if (deadlineMs < nowMs || deadlineMs > nowMs + 7 * dayMs) return false;
      } else if (selectedDateRange === "30d") {
        if (deadlineMs < nowMs || deadlineMs > nowMs + 30 * dayMs) return false;
      } else if (selectedDateRange === "overdue") {
        if (deadlineMs >= startToday) return false;
      }
    }

    return true;
  });

  return em.sortActivityItems ? em.sortActivityItems(filtered, filters.sort) : filtered;
};

em.applyContentFilters = function (items, options) {
  if (!Array.isArray(items)) return [];
  const filters = options || em.state.filters || {};
  const contentFilters = em.state.contentFilters || {};
  const query = String(filters.query || "").trim().toLowerCase();
  const selectedCourse = String(filters.course || "all");
  const selectedType = String(contentFilters.type || "all");
  const selectedModule = String(contentFilters.module || "all");
  const selectedSort = String(contentFilters.sort || "newest");

  const filtered = items.filter((item) => {
    if (!item) return false;
    if (selectedCourse !== "all" && item.course !== selectedCourse) return false;
    if (selectedType !== "all") {
      const mayContainLazyFiles = selectedType === "files" && !item.fileLocationLoaded && (item.contentType === "unit" || item.contentType === "element");
      if (item.contentType !== selectedType && !mayContainLazyFiles) return false;
    }
    const moduleKey = String(item.courseId || "") + ":" + String(item.unitId || "");
    if (selectedModule !== "all" && moduleKey !== selectedModule) return false;
    if (!query) return true;
    const haystack = (
      String(item.course || "") + " " +
      String(item.title || "") + " " +
      String(item.contentTypeLabel || "") + " " +
      String(item.unitName || "") + " " +
      String(item.description || "")
    ).toLowerCase();
    return haystack.includes(query);
  });

  filtered.sort((a, b) => {
    if (selectedSort === "course") {
      return String(a.course || "").localeCompare(String(b.course || "")) || String(a.unitName || "").localeCompare(String(b.unitName || "")) || String(a.title || "").localeCompare(String(b.title || ""));
    }
    if (selectedSort === "module") {
      return String(a.unitName || "").localeCompare(String(b.unitName || "")) || String(a.title || "").localeCompare(String(b.title || ""));
    }
    if (selectedSort === "title") {
      return String(a.title || "").localeCompare(String(b.title || ""));
    }
    const aTime = a.publishedRaw ? new Date(a.publishedRaw).getTime() : 0;
    const bTime = b.publishedRaw ? new Date(b.publishedRaw).getTime() : 0;
    return selectedSort === "oldest" ? aTime - bTime : bTime - aTime;
  });

  return filtered;
};
