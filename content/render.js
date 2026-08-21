window.eminus = window.eminus || {};

var em = window.eminus;

em.renderSetHtml = function (container, html) {
  if (!container) return;
  if (container.__eminusLastHtml === html) return;

  const activeElement = document.activeElement;
  const hadFocus = activeElement instanceof HTMLElement && container.contains(activeElement);
  let restoreSelector = "";
  if (hadFocus) {
    const parts = [];
    ["data-item-index", "data-file-index", "data-action", "data-summary-tab", "data-summary-item-index", "data-empty-action", "id"].forEach((attr) => {
      const value = activeElement.getAttribute(attr);
      if (value !== null && value !== "") {
        try {
          parts.push("[" + attr + "=\"" + CSS.escape(value) + "\"]");
        } catch (_) {
          parts.push("[" + attr + "=\"" + String(value).replace(/"/g, "") + "\"]");
        }
      }
    });
    if (parts.length) restoreSelector = activeElement.tagName.toLowerCase() + parts.join("");
  }

  const prevScrollTop = container.scrollTop;
  container.innerHTML = html;
  container.scrollTop = prevScrollTop;
  container.__eminusLastHtml = html;

  if (restoreSelector) {
    const target = container.querySelector(restoreSelector);
    if (target instanceof HTMLElement) target.focus();
  }
};

em.ensureContainerDelegation = function (container) {
  if (!container || container.__eminusDelegated) return;
  container.__eminusDelegated = true;

  const findItemByIndex = (index) => em.state.pending && Number.isInteger(index) ? em.state.pending[index] : null;

  const handleAction = async (btn) => {
    const index = Number(btn.getAttribute("data-item-index"));
    const action = btn.getAttribute("data-action");
    if (!action) return;
    if (action === "mark-all-content-read") {
      await em.markAllContentRead();
    } else if (action === "toggle-hidden-content") {
      em.state.showHiddenContent = !em.state.showHiddenContent;
      em.renderPending(em.state.pending);
    } else if (action === "restore-hidden-content-course") {
      await em.restoreHiddenContentByCourse(btn.getAttribute("data-course"));
    } else if (action === "archive") {
      const item = findItemByIndex(index);
      if (item?.kind === "content" && em.hideContentItemWithUndo) {
        await em.hideContentItemWithUndo(index);
      } else {
        await em.archiveItemByIndex(index);
      }
    } else if (action === "unarchive") {
      await em.unarchiveItemByIndex(index);
    } else if (action === "pin") {
      await em.pinItemByIndex(index);
    } else if (action === "unpin") {
      await em.unpinItemByIndex(index);
    } else if (action === "download-content-file") {
      const item = findItemByIndex(index);
      const fileIndex = Number(btn.getAttribute("data-file-index"));
      const attachment = item && Array.isArray(item.attachments) ? item.attachments[fileIndex] : null;
      await em.downloadContentAttachment(item, attachment);
    } else if (action === "open-content") {
      const item = findItemByIndex(index);
      if (item?.id && em.state.readContentIds) {
        em.state.readContentIds.add(item.id);
        await em.persistReadContentIds();
      }
      await em.navigateToContent(item);
    } else if (action === "mark-content-read") {
      await em.markContentReadByIndex(index, true);
    } else if (action === "mark-content-unread") {
      await em.markContentReadByIndex(index, false);
    } else if (action === "hide-content-course") {
      const select = btn.closest(".ep-content-toolbar")?.querySelector("[data-content-course-select]");
      await em.archiveContentByCourse(select ? select.value : "");
    }
  };

  container.addEventListener("click", (event) => {
    const miniBtn = event.target instanceof HTMLElement ? event.target.closest(".ep-mini-btn") : null;
    if (miniBtn) {
      event.preventDefault();
      event.stopPropagation();
      handleAction(miniBtn);
      return;
    }

    const emptyBtn = event.target instanceof HTMLElement ? event.target.closest("[data-empty-action]") : null;
    if (emptyBtn) {
      event.preventDefault();
      event.stopPropagation();
      const action = emptyBtn.getAttribute("data-empty-action");
      if (action === "refresh") em.scanPendingWhenTokenReady();
      else if (action === "open-eminus") window.location.assign("https://eminus.uv.mx/eminus4/page/course/list");
      else if (action === "clear-filters" && em.clearFilters) em.clearFilters();
      else if (action === "go-content" && em.setTab) em.setTab("content");
      else if (action === "go-agenda" && em.setTab) em.setTab("agenda");
      return;
    }

    const summaryNext = event.target instanceof HTMLElement ? event.target.closest("[data-summary-item-index]") : null;
    if (summaryNext) {
      const item = findItemByIndex(Number(summaryNext.getAttribute("data-summary-item-index")));
      if (item) em.navigateToActivity(item);
      return;
    }

    const summaryTab = event.target instanceof HTMLElement ? event.target.closest("[data-summary-tab]") : null;
    if (summaryTab && em.setTab) {
      em.setTab(summaryTab.getAttribute("data-summary-tab"));
      return;
    }

    const card = event.target instanceof HTMLElement ? event.target.closest(".ep-item-btn") : null;
    if (card) {
      const item = findItemByIndex(Number(card.getAttribute("data-item-index")));
      if (item) em.navigateToActivity(item);
    }
  });

  container.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target instanceof HTMLElement ? event.target.closest(".ep-item-btn") : null;
    if (!card) return;
    event.preventDefault();
    const item = findItemByIndex(Number(card.getAttribute("data-item-index")));
    if (item) em.navigateToActivity(item);
  });
};

em.renderSummary = function (items) {
  if (!em.panelEls || !em.panelEls.summaryBody) return;

  const activities = em.getVisiblePending(items);
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const overdue = activities.filter((item) => item.urgency === "overdue");
  const dueToday = activities.filter((item) => {
    if (!item.deadlineRaw) return false;
    const deadline = new Date(item.deadlineRaw);
    return !Number.isNaN(deadline.getTime()) && em.isSameDay(deadline, now);
  });
  const weekItems = activities.filter((item) => {
    if (!item.deadlineRaw) return false;
    const deadline = new Date(item.deadlineRaw);
    return !Number.isNaN(deadline.getTime()) && deadline >= now && deadline < weekEnd;
  });
  const next = activities
    .filter((item) => item.deadlineRaw && new Date(item.deadlineRaw).getTime() >= now.getTime())
    .sort(em.compareDeadlines)[0];
  const unreadContent = em.getUnreadContentCount ? em.getUnreadContentCount(items) : 0;
  const courseCounts = new Map();
  activities.forEach((item) => courseCounts.set(item.course, (courseCounts.get(item.course) || 0) + 1));
  const busiestCourse = Array.from(courseCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const weekPercent = activities.length ? Math.min(100, Math.round((weekItems.length / activities.length) * 100)) : 0;
  const nextIndex = next ? items.indexOf(next) : -1;

  const summaryHtml = `
    <div class="ep-summary-grid">
      <button class="ep-summary-stat" type="button" data-summary-tab="pending">
        <strong>${activities.length}</strong><span>${em.escapeHtml(em.t("summary_pending"))}</span>
      </button>
      <button class="ep-summary-stat" type="button" data-summary-tab="overdue">
        <strong>${overdue.length}</strong><span>${em.escapeHtml(em.t("summary_overdue"))}</span>
      </button>
      <button class="ep-summary-stat" type="button" data-summary-tab="today">
        <strong>${dueToday.length}</strong><span>${em.escapeHtml(em.t("summary_today"))}</span>
      </button>
      <button class="ep-summary-stat" type="button" data-summary-tab="content">
        <strong>${unreadContent}</strong><span>${em.escapeHtml(em.t("summary_unread_content"))}</span>
      </button>
    </div>
    <section class="ep-summary-section">
      <div class="ep-summary-label">${em.escapeHtml(em.t("summary_next_task"))}</div>
      ${next ? `
        <button class="ep-summary-next" type="button" data-summary-item-index="${nextIndex}">
          <span>${em.renderCourseLabel ? em.renderCourseLabel(next) : em.escapeHtml(next.course)}</span>
          <strong>${em.escapeHtml(next.title)}</strong>
          <small>${em.escapeHtml(em.t("due") + " " + (next.deadlineStr || em.t("due_nodate")) + " · " + em.getTimeRemaining(new Date(next.deadlineRaw)))}</small>
        </button>
      ` : `<div class="ep-summary-empty">${em.escapeHtml(em.t("summary_no_next"))}</div>`}
    </section>
    <section class="ep-summary-section">
      <div class="ep-summary-row">
        <div>
          <div class="ep-summary-label">${em.escapeHtml(em.t("summary_week_load"))}</div>
          <strong>${weekItems.length} ${em.escapeHtml(em.t("summary_deliveries"))}</strong>
        </div>
        <div class="ep-summary-course">
          <div class="ep-summary-label">${em.escapeHtml(em.t("summary_busiest_course"))}</div>
          <strong>${busiestCourse ? em.escapeHtml(busiestCourse[0]) + " · " + busiestCourse[1] : em.escapeHtml(em.t("summary_none"))}</strong>
        </div>
      </div>
      <div class="ep-summary-progress"><span style="width:${weekPercent}%"></span></div>
    </section>
    <div class="ep-summary-actions">
      <button class="ep-mini-btn" type="button" data-summary-tab="today">${em.escapeHtml(em.t("summary_open_today"))}</button>
      <button class="ep-mini-btn" type="button" data-summary-tab="agenda">${em.escapeHtml(em.t("summary_open_agenda"))}</button>
      <button class="ep-mini-btn" type="button" data-summary-tab="content">${em.escapeHtml(em.t("summary_open_content"))}</button>
    </div>
  `;
  em.renderSetHtml(em.panelEls.summaryBody, summaryHtml);
};

em.renderAgenda = function (items) {
  if (!em.panelEls || !em.panelEls.agendaBody) return;

  const visibleItems = items.filter((item) => !item.archived && item.kind !== "content");
  const overdueItems = visibleItems.filter((item) => item.urgency === "overdue");
  const noDateItems = visibleItems.filter((item) => !item.deadlineRaw && item.urgency !== "overdue");
  const datedItems = visibleItems.filter((item) => item.deadlineRaw && item.urgency !== "overdue");

  const groups = {};
  datedItems.forEach((item) => {
    const d = new Date(item.deadlineRaw);
    if (Number.isNaN(d.getTime())) return;
    const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(item);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = "";

  const buildMiniItem = (item) => {
    const urgencyClass = "ep-" + item.urgency;
    const originalIndex = items.indexOf(item);

    let timeStr = "";
    if (item.deadlineRaw) {
      const d = new Date(item.deadlineRaw);
      if (!Number.isNaN(d.getTime())) {
        timeStr = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      }
    }
    
    const pinIcon = item.pinned ? `<span style="margin-right:4px;opacity:0.9;">★</span>` : "";
    return `
        <div class="ep-item-btn" role="button" tabindex="0" data-item-index="${originalIndex}">
          <article class="ep-item ${urgencyClass} ep-agenda-item${em.getCourseCardClass ? em.getCourseCardClass(item) : ""}"${em.getCourseCardStyle ? em.getCourseCardStyle(item) : ""}>
            <div class="ep-meta-row" style="margin-bottom: 4px;">
              <div class="ep-course">${em.renderCourseLabel ? em.renderCourseLabel(item) : em.escapeHtml(item.course)}</div>
              ${timeStr ? `<div class="ep-meta" style="font-weight: 700;">${timeStr}</div>` : ""}
            </div>
            <div class="ep-title-task" style="font-size: 12px; margin-bottom: 0;">${pinIcon}<span class="ep-wave-text">${em.wrapTextSpans(item.title)}</span></div>
          </article>
        </div>
      `;
  };

  if (overdueItems.length > 0) {
    html += `<div class="ep-agenda-day">`;
    html += `<div class="ep-agenda-day-header ep-agenda-overdue">${em.escapeHtml(em.t("agenda_overdue"))}</div>`;
    overdueItems.forEach((item) => {
      html += buildMiniItem(item);
    });
    html += `</div>`;
  }

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const dayName = em.t("day_" + d.getDay());
    const dayLabel = i === 0 ? em.t("agenda_today") : i === 1 ? em.t("agenda_tomorrow") : `${dayName} ${d.getDate()}`;
    const dayItems = groups[dateStr] || [];

    html += `<div class="ep-agenda-day">`;
    html += `<div class="ep-agenda-day-header">${em.escapeHtml(dayLabel)}</div>`;
    if (dayItems.length === 0) {
      html += `<div class="ep-agenda-empty">${em.escapeHtml(em.t("agenda_free"))}</div>`;
    } else {
      dayItems.forEach((item) => {
        html += buildMiniItem(item);
      });
    }
    html += `</div>`;
  }

  const futureItems = datedItems.filter((item) => {
    const d = new Date(item.deadlineRaw);
    const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return dOnly.getTime() >= today.getTime() + 7 * 24 * 60 * 60 * 1000;
  });

  if (futureItems.length > 0) {
    html += `<div class="ep-agenda-day">`;
    html += `<div class="ep-agenda-day-header">${em.escapeHtml(em.t("agenda_later"))}</div>`;
      futureItems.forEach((item) => {
        const originalIndex = items.indexOf(item);
        const urgencyClass = "ep-" + item.urgency;
        const urgencyBadge = item.urgency && item.urgency !== "normal"
          ? `<span class="ep-urgency-badge">${em.t("urgency_badge_" + item.urgency)}</span>`
          : "";
        
        const dDate = item.deadlineRaw ? new Date(item.deadlineRaw) : null;
        const remaining = em.getTimeRemaining(dDate);
        const currentDeadlineLabel = remaining ? item.deadlineStr + " (" + remaining + ")" : item.deadlineStr;
        
        const pinIcon = item.pinned ? `<span style="margin-right:4px;opacity:0.9;">★</span>` : "";
        html += `
            <div class="ep-item-btn" role="button" tabindex="0" data-item-index="${originalIndex}">
              <article class="ep-item ${urgencyClass} ep-agenda-item${em.getCourseCardClass ? em.getCourseCardClass(item) : ""}"${em.getCourseCardStyle ? em.getCourseCardStyle(item) : ""}>
                <div class="ep-course">${em.renderCourseLabel ? em.renderCourseLabel(item) : em.escapeHtml(item.course)}</div>
                <div class="ep-title-task" style="font-size: 12px; margin-bottom: 4px;">${pinIcon}${em.escapeHtml(item.title)}</div>
                <div class="ep-meta">${em.escapeHtml(currentDeadlineLabel)}${urgencyBadge}</div>
              </article>
            </div>
          `;
      });
    html += `</div>`;
  }

  if (noDateItems.length > 0) {
    html += `<div class="ep-agenda-day">`;
    html += `<div class="ep-agenda-day-header">${em.escapeHtml(em.t("agenda_nodate"))}</div>`;
    noDateItems.forEach((item) => {
      html += buildMiniItem(item);
    });
    html += `</div>`;
  }

  em.renderSetHtml(em.panelEls.agendaBody, html);
};

em.renderPending = function (items) {
  if (!em.panelEls || !em.panelEls.pendingBody) return;
  if (!em.panelEls || !em.panelEls.overdueBody) return;

  const nonArchivedItems = items.filter((item) => !item.archived);
  const activityItems = em.getActivityItems(nonArchivedItems);
  const contentItems = em.applyContentFilters(em.getContentItems(nonArchivedItems));
  const filteredItems = em.applyAdvancedFilters(activityItems);
  const todayItems = em.getTodayItems(filteredItems);
  const pendingItems = filteredItems.filter((item) => item.urgency !== "overdue");
  const overdueItems = filteredItems.filter((item) => item.urgency === "overdue");
  const archivedItems = items.filter((item) => item.archived);
  const pendingEmptyMessage = activityItems.length === 0 && em.getPersonalEmptyMessage
    ? em.getPersonalEmptyMessage(em.t("empty_pending"))
    : em.t("empty_pending");

  if (em.panelEls && em.panelEls.filterCourse) {
    const previousValue = em.state.filters.course || em.panelEls.filterCourse.value || "all";
    const courses = Array.from(new Set(nonArchivedItems.map((item) => item.course).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const options = [`<option value="all">${em.escapeHtml(em.t("filter_courses_all"))}</option>`]
      .concat(courses.map((course) => `<option value="${em.escapeHtml(course)}">${em.escapeHtml(course)}</option>`));
    em.renderSetHtml(em.panelEls.filterCourse, options.join(""));
    em.panelEls.filterCourse.value = courses.includes(previousValue) || previousValue === "all" ? previousValue : "all";
    em.state.filters.course = em.panelEls.filterCourse.value;
  }

  if (em.panelEls && em.panelEls.filterContentModule) {
    const previousModule = em.state.contentFilters.module || em.panelEls.filterContentModule.value || "all";
    const modules = em.getContentItems(nonArchivedItems)
      .filter((item) => item.unitId && item.unitName)
      .map((item) => ({ id: String(item.unitId), key: String(item.courseId || "") + ":" + String(item.unitId), name: item.unitName, course: item.course }));
    const seenModules = new Set();
    const uniqueModules = modules
      .filter((module) => {
        if (seenModules.has(module.key)) return false;
        seenModules.add(module.key);
        return true;
      })
      .sort((a, b) => a.course.localeCompare(b.course) || a.name.localeCompare(b.name));
    const moduleOptions = [`<option value="all">${em.escapeHtml(em.t("filter_modules_all"))}</option>`]
      .concat(uniqueModules.map((module) => `<option value="${em.escapeHtml(module.key)}">${em.escapeHtml(module.course + " · " + module.name)}</option>`));
    em.renderSetHtml(em.panelEls.filterContentModule, moduleOptions.join(""));
    em.panelEls.filterContentModule.value = uniqueModules.some((module) => module.key === previousModule) || previousModule === "all" ? previousModule : "all";
    em.state.contentFilters.module = em.panelEls.filterContentModule.value;
  }

  const getEmptyVariant = (list, emptyMsg) => {
    const hasData = em.state.lastUpdatedAt || (Array.isArray(items) && items.length > 0);
    const isScanning = !!em.state.isScanning;
    const activeFilterCount = em.getActiveFilterCount ? em.getActiveFilterCount() : 0;
    const hasFilters = activeFilterCount > 0;
    if (isScanning) return hasData ? "scanning-refresh" : "scanning";
    if (!hasData) return "onboarding";
    if (hasFilters) return "filtered";
    if (emptyMsg === em.t("empty_pending") || emptyMsg === em.t("empty_today") || emptyMsg === em.t("empty_overdue")) return "success";
    return "empty";
  };

  const buildEmptyHtml = (emptyMsg, variant) => {
    const esc = em.escapeHtml;
    if (variant === "scanning" || variant === "scanning-refresh") {
      const isRefresh = variant === "scanning-refresh";
      const title = isRefresh ? esc(em.t("status_scanning_refresh")) : esc(em.t("status_scanning"));
      const desc = isRefresh ? esc(em.t("ep_scanning_refresh_desc")) : esc(em.t("ep_scanning_first"));
      return `<div class="ep-empty ep-empty--scanning">
        <div class="ep-empty-icon ep-empty-spinner" aria-hidden="true">◐</div>
        <div class="ep-empty-title">${title}</div>
        <div class="ep-empty-desc">${desc}</div>
        <div class="ep-empty-skeleton"><span></span><span></span><span></span></div>
      </div>`;
    }
    if (variant === "onboarding") {
      return `<div class="ep-empty ep-empty--onboarding">
        <div class="ep-empty-icon" aria-hidden="true">◐</div>
        <div class="ep-empty-title">${esc(em.t("ep_welcome_title"))}</div>
        <div class="ep-empty-desc">${esc(em.t("ep_welcome_desc"))}<br>1) ${em.t("ep_welcome_step1")} · 2) ${em.t("ep_welcome_step2")} · 3) ${em.t("ep_welcome_step3")}</div>
        <div class="ep-empty-actions">
          <button class="ep-mini-btn ep-empty-cta" type="button" data-empty-action="refresh">${esc(em.t("ep_cta_refresh"))}</button>
          <button class="ep-mini-btn" type="button" data-empty-action="open-eminus">${esc(em.t("ep_cta_open_eminus"))}</button>
        </div>
        <div class="ep-empty-hint">${em.t("shortcuts_hint")}</div>
        <small style="opacity:0.6; font-size:11px; margin-top:6px; display:block;">${esc(em.t("status_waiting_token"))}</small>
      </div>`;
    }
    if (variant === "filtered") {
      const hiddenCount = em.getVisiblePending ? em.getVisiblePending(items).length : activityItems.length;
      return `<div class="ep-empty ep-empty--filtered">
        <div class="ep-empty-icon" aria-hidden="true">◎</div>
        <div class="ep-empty-title">${esc(em.t("ep_filtered_title"))}</div>
        <div class="ep-empty-desc">${esc(emptyMsg)}<br>${esc(em.t("ep_filtered_desc").replace("{n}", String(hiddenCount)))}</div>
        <div class="ep-empty-actions">
          <button class="ep-mini-btn ep-empty-cta" type="button" data-empty-action="clear-filters">${esc(em.t("filter_clear"))}</button>
        </div>
      </div>`;
    }
    if (variant === "success") {
      const msg = em.getPersonalEmptyMessage ? em.getPersonalEmptyMessage(emptyMsg) : emptyMsg;
      return `<div class="ep-empty ep-empty--success">
        <div class="ep-empty-icon" aria-hidden="true">✓</div>
        <div class="ep-empty-title">${esc(em.t("ep_success_title"))}</div>
        <div class="ep-empty-desc">${esc(msg)}</div>
        <div class="ep-empty-actions">
          <button class="ep-mini-btn" type="button" data-empty-action="go-content">${esc(em.t("summary_open_content"))}</button>
          <button class="ep-mini-btn" type="button" data-empty-action="go-agenda">${esc(em.t("summary_open_agenda"))}</button>
        </div>
      </div>`;
    }
    return `<div class="ep-empty">${esc(emptyMsg)}</div>`;
  };

  const buildListHtml = (list, emptyMsg, actionConfig, showPin) => {
    actionConfig = actionConfig || null;
    showPin = showPin || false;
    if (!list.length) {
      const variant = getEmptyVariant(list, emptyMsg);
      return buildEmptyHtml(emptyMsg, variant);
    }
    return list
      .map((item) => {
        const urgencyClass = "ep-" + item.urgency;
        
        const dDate = item.deadlineRaw ? new Date(item.deadlineRaw) : null;
        const remaining = em.getTimeRemaining(dDate);
        const currentDeadlineLabel = remaining ? item.deadlineStr + " (" + remaining + ")" : (item.deadlineStr || em.t("due_nodate"));
        
        const urgencyBadge = item.urgency && item.urgency !== "normal"
          ? `<span class="ep-urgency-badge">${em.t("urgency_badge_" + item.urgency)}</span>`
          : "";

        const originalIndex = items.indexOf(item);
        const archivedClass = item.archived ? "ep-archived" : "";
        const pinLabel = item.pinned ? em.t("action_unpin") : em.t("action_pin");
        const pinAction = item.pinned ? "unpin" : "pin";
        const pinHtml = showPin
          ? `<button class="ep-mini-btn ep-pin-btn" type="button" data-action="${pinAction}" data-item-index="${originalIndex}" title="${em.escapeHtml(pinLabel)}">${item.pinned ? "★" : "☆"}</button>`
          : "";
        const actionHtml = actionConfig
          ? `<button class="ep-mini-btn" type="button" data-action="${actionConfig.action}" data-item-index="${originalIndex}">${em.escapeHtml(actionConfig.label)}</button>`
          : "";
        const buttonsHtml = [pinHtml, actionHtml].filter(Boolean).join("");
        const contentParts = [];
        if (item.kind === "content") {
          contentParts.push(item.contentTypeLabel || em.t("content_label"));
          if (item.unitName) contentParts.push(item.unitName);
          if (item.publishedLabel) contentParts.push(em.t("content_published") + " " + item.publishedLabel);
        }
        const metaText = item.kind === "content"
          ? contentParts.filter(Boolean).join(" · ")
          : em.t("due") + " " + currentDeadlineLabel;
        const metaHtml = buttonsHtml
          ? `<div class="ep-meta-row"><div class="ep-meta">${em.escapeHtml(metaText)}${urgencyBadge}</div><div style="display:flex;gap:6px;">${buttonsHtml}</div></div>`
          : `<div class="ep-meta">${em.escapeHtml(metaText)}${urgencyBadge}</div>`;
        return `
            <div class="ep-item-btn" role="button" tabindex="0" data-item-index="${originalIndex}">
              <article class="ep-item ${urgencyClass} ${archivedClass}${em.getCourseCardClass ? em.getCourseCardClass(item) : ""}"${em.getCourseCardStyle ? em.getCourseCardStyle(item) : ""}>
                <div class="ep-course">${em.renderCourseLabel ? em.renderCourseLabel(item) : em.escapeHtml(item.course)}</div>
                <div class="ep-title-task"><span class="ep-wave-text">${em.wrapTextSpans(item.title)}</span></div>
                ${metaHtml}
              </article>
            </div>
          `;
      })
      .join("");
  };

  const buildContentHtml = (list) => {
    const esc = em.escapeHtml;
    const showHidden = !!em.state.showHiddenContent;
    const sourceItems = Array.isArray(em.state.pending) ? em.state.pending : [];
    const hiddenContent = em.getContentItems(sourceItems)
      .filter((item) => item.archived)
      .slice()
      .sort((a, b) => {
        const aTime = a.publishedRaw ? new Date(a.publishedRaw).getTime() : 0;
        const bTime = b.publishedRaw ? new Date(b.publishedRaw).getTime() : 0;
        return bTime - aTime;
      });

    const renderContentCard = (item, restoreMode) => {
      const originalIndex = sourceItems.indexOf(item);
      const published = item.publishedLabel ? em.t("content_published") + " " + item.publishedLabel : item.contentTypeLabel || em.t("content_label");
      const metaParts = [item.contentTypeLabel || em.t("content_label"), item.unitName, published].filter(Boolean);
      const descriptionHtml = item.description
        ? `<div class="ep-content-description">${em.escapeHtml(item.description)}</div>`
        : "";
      const attachments = Array.isArray(item.attachments) ? item.attachments : [];
      const isOpen = !!(em.state.contentExpandedIds && em.state.contentExpandedIds.has(item.id));
      const isRead = em.isContentRead ? em.isContentRead(item) : false;
      const emptyFilesText = item.fileLocationLoading
        ? em.t("content_files_loading")
        : item.fileLocationError || (item.fileLocationLoaded ? em.t("content_files_empty") : em.t("content_files_expand"));
      const attachmentsHtml = attachments.length
        ? `<div class="ep-content-files">
            ${attachments.map((file, fileIndex) => `
              <button class="ep-mini-btn ep-content-download" type="button" data-action="download-content-file" data-item-index="${originalIndex}" data-file-index="${fileIndex}">
                ${em.escapeHtml(file.name)}${file.sizeLabel ? " · " + em.escapeHtml(file.sizeLabel) : ""}${file.modifiedLabel ? " · " + em.escapeHtml(file.modifiedLabel) : ""}${file.downloads !== "" && file.downloads !== undefined ? " · " + em.escapeHtml(file.downloads) + " " + em.escapeHtml(em.t("content_downloads")) : ""}
              </button>
            `).join("")}
          </div>`
        : `<div class="ep-empty ep-content-empty-files">${em.escapeHtml(emptyFilesText)}</div>`;
      return `
          <details class="ep-content-detail" data-item-index="${originalIndex}"${isOpen ? " open" : ""}>
            <summary class="ep-content-summary">
              <article class="ep-item ep-normal${!isRead && !restoreMode ? " ep-content-unread" : ""}${em.getCourseCardClass ? em.getCourseCardClass(item) : ""}"${em.getCourseCardStyle ? em.getCourseCardStyle(item) : ""}>
                <div class="ep-course">${em.renderCourseLabel ? em.renderCourseLabel(item) : em.escapeHtml(item.course)}</div>
                <div class="ep-title-task">${!isRead && !restoreMode ? `<span class="ep-content-unread-dot" title="${em.escapeHtml(em.t("content_unread"))}"></span>` : ""}<span class="ep-wave-text">${em.wrapTextSpans(item.title)}</span></div>
                <div class="ep-meta">${em.escapeHtml(metaParts.join(" · "))}</div>
              </article>
            </summary>
            <div class="ep-content-panel">
              ${descriptionHtml}
              ${attachmentsHtml}
              <button class="ep-mini-btn" type="button" data-action="${isRead ? "mark-content-unread" : "mark-content-read"}" data-item-index="${originalIndex}">${esc(em.t(isRead ? "content_mark_unread" : "content_mark_read"))}</button>
              <button class="ep-mini-btn" type="button" data-action="open-content" data-item-index="${originalIndex}">${esc(em.t("content_open"))}</button>
              ${restoreMode
                ? `<button class="ep-mini-btn ep-content-hide" type="button" data-action="unarchive" data-item-index="${originalIndex}" title="${esc(em.t("status_restored"))}">${esc(em.t("action_restore"))}</button>`
                : `<button class="ep-mini-btn ep-content-hide" type="button" data-action="archive" data-item-index="${originalIndex}" title="${esc(em.t("status_archived"))}">${esc(em.t("content_hide_item"))}</button>`}
            </div>
          </details>
        `;
    };

    if (showHidden) {
      let hiddenHtml = `
        <div class="ep-content-toolbar">
          <span>${esc(em.t("content_hidden_title"))}</span>
          <span class="ep-content-toolbar-actions">
            <button class="ep-mini-btn" type="button" data-action="toggle-hidden-content">${esc(em.t("content_back_to_content"))}</button>
          </span>
        </div>
      `;
      if (!hiddenContent.length) {
        return hiddenHtml + `<div class="ep-empty">${esc(em.t("empty_archived"))}</div>`;
      }
      const groups = new Map();
      hiddenContent.forEach((item) => {
        const courseKey = String(item.course || "").trim() || em.t("status_content");
        if (!groups.has(courseKey)) groups.set(courseKey, []);
        groups.get(courseKey).push(item);
      });
      groups.forEach((groupItems, courseKey) => {
        hiddenHtml += `
          <div class="ep-hidden-course">
            <div class="ep-hidden-course-header">
              <span class="ep-hidden-course-name">${esc(courseKey)} (${groupItems.length})</span>
              <button class="ep-mini-btn" type="button" data-action="restore-hidden-content-course" data-course="${esc(courseKey)}">${esc(em.t("content_restore_course"))}</button>
            </div>
            ${groupItems.map((item) => renderContentCard(item, true)).join("")}
          </div>
        `;
      });
      return hiddenHtml;
    }

    const unreadCount = em.getUnreadContentCount ? em.getUnreadContentCount(nonArchivedItems) : 0;
    const allVisibleContent = em.getContentItems(nonArchivedItems);
    const contentCourses = Array.from(new Set(allVisibleContent.map((item) => item.course).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const hideCourseControls = contentCourses.length
      ? `<select class="ep-config-select ep-content-course-select" data-content-course-select aria-label="${esc(em.t("content_hide_course"))}">
          <option value="">${esc(em.t("content_hide_course_placeholder"))}</option>
          ${contentCourses.map((course) => `<option value="${esc(course)}">${esc(course)}</option>`).join("")}
        </select>
        <button class="ep-mini-btn" type="button" data-action="hide-content-course">${esc(em.t("content_hide_course"))}</button>`
      : "";
    const toggleHiddenBtn = hiddenContent.length
      ? `<button class="ep-mini-btn" type="button" data-action="toggle-hidden-content">${esc(em.t("content_show_hidden").replace("{n}", hiddenContent.length))}</button>`
      : "";
    const toolbar = `
      <div class="ep-content-toolbar">
        <span>${unreadCount} ${esc(em.t("content_unread_count"))}</span>
        <span class="ep-content-toolbar-actions">
          ${hideCourseControls}
          <button class="ep-mini-btn" type="button" data-action="mark-all-content-read"${unreadCount ? "" : " disabled"}>${esc(em.t("content_mark_all_read"))}</button>
          ${toggleHiddenBtn}
        </span>
      </div>
    `;
    if (!list.length) {
      const hasData = em.state.lastUpdatedAt || (Array.isArray(items) && items.length > 0);
      const isScanning = !!em.state.isScanning;
      if (isScanning) {
        const isRefresh = !!hasData;
        const title = isRefresh ? esc(em.t("status_scanning_refresh")) : esc(em.t("status_scanning"));
        const desc = isRefresh ? esc(em.t("ep_scanning_refresh_desc")) : esc(em.t("ep_content_loading"));
        return toolbar + `<div class="ep-empty ep-empty--scanning"><div class="ep-empty-icon ep-empty-spinner">◐</div><div class="ep-empty-title">${title}</div><div class="ep-empty-desc">${desc}</div></div>`;
      }
      if (!hasData) {
        return toolbar + `<div class="ep-empty ep-empty--onboarding"><div class="ep-empty-icon">◐</div><div class="ep-empty-title">${esc(em.t("ep_content_empty_title"))}</div><div class="ep-empty-desc">${esc(em.t("ep_content_empty_desc"))}</div><div class="ep-empty-actions"><button class="ep-mini-btn ep-empty-cta" type="button" data-empty-action="refresh">${esc(em.t("ep_cta_refresh"))}</button></div></div>`;
      }
      const activeFilterCount = em.getActiveFilterCount ? em.getActiveFilterCount() : 0;
      if (activeFilterCount > 0) {
        return toolbar + `<div class="ep-empty ep-empty--filtered"><div class="ep-empty-icon">◎</div><div class="ep-empty-title">${esc(em.t("ep_content_filtered_title"))}</div><div class="ep-empty-desc">${esc(em.t("ep_content_filtered_desc"))}</div><div class="ep-empty-actions"><button class="ep-mini-btn" type="button" data-empty-action="clear-filters">${esc(em.t("filter_clear"))}</button></div></div>`;
      }
      return toolbar + `<div class="ep-empty">${esc(em.t("empty_content"))}</div>`;
    }

    return toolbar + list
      .map((item) => renderContentCard(item, false))
      .join("");
  };

  if (em.state.isArchiveView) {
    em.renderSetHtml(em.panelEls.pendingBody, buildListHtml(archivedItems, em.t("empty_archived"), { label: em.t("action_restore"), action: "unarchive" }, false));
    em.renderSetHtml(em.panelEls.todayBody, "");
    em.renderSetHtml(em.panelEls.overdueBody, "");
    em.renderSetHtml(em.panelEls.agendaBody, "");
    if (em.panelEls.contentBody) em.renderSetHtml(em.panelEls.contentBody, "");
  } else {
    em.renderSummary(items);
    em.renderSetHtml(em.panelEls.todayBody, buildListHtml(todayItems, em.t("empty_today"), null, true));
    em.renderSetHtml(em.panelEls.pendingBody, buildListHtml(pendingItems, pendingEmptyMessage, null, true));
    em.renderSetHtml(em.panelEls.overdueBody, buildListHtml(overdueItems, em.t("empty_overdue"), { label: em.t("action_archive"), action: "archive" }, true));
    if (em.panelEls.contentBody) em.renderSetHtml(em.panelEls.contentBody, buildContentHtml(contentItems));
    em.renderAgenda(filteredItems);
  }

  const addContentDetailListeners = (container) => {
    if (!container) return;
    container.querySelectorAll(".ep-content-detail").forEach((detail) => {
      detail.addEventListener("toggle", () => {
        const index = Number(detail.getAttribute("data-item-index"));
        const item = em.state.pending[index];
        if (!item) return;
        em.state.contentExpandedIds = em.state.contentExpandedIds || new Set();
        if (detail.open) {
          em.state.contentExpandedIds.add(item.id);
          if (!item.fileLocationLoaded && !item.fileLocationLoading && typeof em.loadContentFilesForItem === "function") {
            em.loadContentFilesForItem(index);
          }
        } else {
          em.state.contentExpandedIds.delete(item.id);
        }
      });
    });
  };

  const containers = [em.panelEls.summaryBody, em.panelEls.todayBody, em.panelEls.pendingBody, em.panelEls.overdueBody, em.panelEls.agendaBody, em.panelEls.contentBody];
  containers.forEach((container) => {
    em.ensureContainerDelegation(container);
    addContentDetailListeners(container);
  });
  if (em.updateCollapsedSummary) em.updateCollapsedSummary();
  if (em.updateFilterClearButton) em.updateFilterClearButton();
  if (em.updateBulkActionButtons) em.updateBulkActionButtons();
  if (em.renderCoursePreferences) em.renderCoursePreferences();
};

em.renderLogs = function (logs) {
  if (!em.panelEls || !em.panelEls.logBody) return;

  const safeLogs = Array.isArray(logs) ? logs.filter((entry) => entry && typeof entry === "object") : [];
  if (!safeLogs.length) {
    em.renderSetHtml(em.panelEls.logBody, `<div class="ep-empty">${em.escapeHtml(em.t("empty_log"))}</div>`);
    return;
  }

  let html = `<button id="ep-clear-log" class="ep-item-btn" style="margin-bottom: 16px; border: 1px dashed #000; padding: 6px; font-size: 11px; text-align: center; cursor: pointer; background: transparent; color: #000; font-family: inherit; width: 100%; box-sizing: border-box;">${em.escapeHtml(em.t("log_clear"))}</button>`;

  html += safeLogs
    .map((entry) => {
      const previewTitles = Array.isArray(entry.previewTitles) ? entry.previewTitles : [];
      const lines = previewTitles.length
        ? `<div class="ep-log-lines">${previewTitles.map((t) => `<div>• ${em.escapeHtml(t)}</div>`).join("")}</div>`
        : "";
      const pendingCount = Number(entry.pendingCount || 0);
      const newCount = Number(entry.newCount || 0);
      const newTaskCount = Number(entry.newTaskCount ?? newCount);
      const newContentCount = Number(entry.newContentCount || 0);
      const summaryParts = [
        pendingCount + " " + em.t("status_pending"),
        newTaskCount + " " + em.t("status_new")
      ];
      if (newContentCount > 0) {
        summaryParts.push(newContentCount + " " + em.t("status_content"));
      }
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      const changesHtml = changes.length
        ? `<div class="ep-log-changes">${changes.map((c) => {
            const label = c.type === "deadline" ? em.t("log_changed_date") : em.t("log_changed_state");
            return `<div class="ep-log-change">• ${em.escapeHtml(c.title)} ${label}: ${em.escapeHtml(c.from)} → ${em.escapeHtml(c.to)}</div>`;
          }).join("")}</div>`
        : "";

      return `
          <article class="ep-log-item">
            <div class="ep-log-time">${em.escapeHtml(em.formatDateTime(entry.timestamp))}</div>
            <div class="ep-log-summary">${em.escapeHtml(summaryParts.join(" · "))}</div>
            ${changesHtml}
            ${lines}
          </article>
        `;
    })
    .join("");

  em.renderSetHtml(em.panelEls.logBody, html);

  const clearBtn = em.panelEls.logBody.querySelector("#ep-clear-log");
  if (clearBtn) {
    clearBtn.addEventListener("click", async () => {
      em.state.logs = [];
      const payload = {};
      payload[em.STORAGE_KEYS.LOG] = [];
      await em.storageSet(payload);
      em.renderLogs([]);
    });
  }
};
