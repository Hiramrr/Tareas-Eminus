/* ══════════════════════════════════════════
   RENDERING
   ══════════════════════════════════════════ */

window.eminus = window.eminus || {};

var em = window.eminus;

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
    
    // Recalculate deadline label for current language
    const dDate = item.deadlineRaw ? new Date(item.deadlineRaw) : null;
    const remaining = em.getTimeRemaining(dDate);
    const timeMatch = remaining ? remaining.match(/(\d{1,2}:\d{2})/) : null; // This might be wrong if getTimeRemaining doesn't return time
    // Better: extract time from deadlineStr which is original from Eminus
    const timeMatch2 = item.deadlineStr ? item.deadlineStr.match(/(\d{1,2}:\d{2})/) : null;
    const timeStr = timeMatch2 ? timeMatch2[1] : "";
    
    const pinIcon = item.pinned ? `<span style="margin-right:4px;opacity:0.9;">★</span>` : "";
    return `
        <div class="ep-item-btn" role="button" tabindex="0" data-item-index="${originalIndex}">
          <article class="ep-item ${urgencyClass} ep-agenda-item">
            <div class="ep-meta-row" style="margin-bottom: 4px;">
              <div class="ep-course">${em.escapeHtml(item.course)}</div>
              ${timeStr ? `<div class="ep-meta" style="font-weight: 700;">${em.escapeHtml(timeStr)}</div>` : ""}
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
      
      const dDate = item.deadlineRaw ? new Date(item.deadlineRaw) : null;
      const remaining = em.getTimeRemaining(dDate);
      const currentDeadlineLabel = remaining ? item.deadlineStr + " (" + remaining + ")" : item.deadlineStr;
      
      const pinIcon = item.pinned ? `<span style="margin-right:4px;opacity:0.9;">★</span>` : "";
      html += `
          <div class="ep-item-btn" role="button" tabindex="0" data-item-index="${originalIndex}">
            <article class="ep-item ${urgencyClass} ep-agenda-item">
              <div class="ep-course">${em.escapeHtml(item.course)}</div>
              <div class="ep-title-task" style="font-size: 12px; margin-bottom: 4px;">${pinIcon}${em.escapeHtml(item.title)}</div>
              <div class="ep-meta">${em.escapeHtml(currentDeadlineLabel)}</div>
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

  em.panelEls.agendaBody.innerHTML = html;
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

  if (em.panelEls && em.panelEls.filterCourse) {
    const previousValue = em.state.filters.course || em.panelEls.filterCourse.value || "all";
    const courses = Array.from(new Set(nonArchivedItems.map((item) => item.course).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const options = [`<option value="all">${em.escapeHtml(em.t("filter_courses_all"))}</option>`]
      .concat(courses.map((course) => `<option value="${em.escapeHtml(course)}">${em.escapeHtml(course)}</option>`));
    em.panelEls.filterCourse.innerHTML = options.join("");
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
    em.panelEls.filterContentModule.innerHTML = moduleOptions.join("");
    em.panelEls.filterContentModule.value = uniqueModules.some((module) => module.key === previousModule) || previousModule === "all" ? previousModule : "all";
    em.state.contentFilters.module = em.panelEls.filterContentModule.value;
  }

  const buildListHtml = (list, emptyMsg, actionConfig, showPin) => {
    actionConfig = actionConfig || null;
    showPin = showPin || false;
    if (!list.length) {
      return `<div class="ep-empty">${emptyMsg}</div>`;
    }
    return list
      .map((item) => {
        const urgencyClass = "ep-" + item.urgency;
        
        // Recalculate deadline label for current language
        const dDate = item.deadlineRaw ? new Date(item.deadlineRaw) : null;
        const remaining = em.getTimeRemaining(dDate);
        const currentDeadlineLabel = remaining ? item.deadlineStr + " (" + remaining + ")" : (item.deadlineStr || em.t("due_nodate"));
        
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
          ? `<div class="ep-meta-row"><div class="ep-meta">${em.escapeHtml(metaText)}</div><div style="display:flex;gap:6px;">${buttonsHtml}</div></div>`
          : `<div class="ep-meta">${em.escapeHtml(metaText)}</div>`;
        return `
            <div class="ep-item-btn" role="button" tabindex="0" data-item-index="${originalIndex}">
              <article class="ep-item ${urgencyClass} ${archivedClass}">
                <div class="ep-course">${em.escapeHtml(item.course)}</div>
                <div class="ep-title-task"><span class="ep-wave-text">${em.wrapTextSpans(item.title)}</span></div>
                ${metaHtml}
              </article>
            </div>
          `;
      })
      .join("");
  };

  const buildContentHtml = (list) => {
    if (!list.length) {
      return `<div class="ep-empty">${em.escapeHtml(em.t("empty_content"))}</div>`;
    }

    return list
      .map((item) => {
        const originalIndex = items.indexOf(item);
        const published = item.publishedLabel ? em.t("content_published") + " " + item.publishedLabel : item.contentTypeLabel || em.t("content_label");
        const metaParts = [item.contentTypeLabel || em.t("content_label"), item.unitName, published].filter(Boolean);
        const descriptionHtml = item.description
          ? `<div class="ep-content-description">${em.escapeHtml(item.description)}</div>`
          : "";
        const attachments = Array.isArray(item.attachments) ? item.attachments : [];
        const isOpen = !!(em.state.contentExpandedIds && em.state.contentExpandedIds.has(item.id));
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
                <article class="ep-item ep-normal">
                  <div class="ep-course">${em.escapeHtml(item.course)}</div>
                  <div class="ep-title-task"><span class="ep-wave-text">${em.wrapTextSpans(item.title)}</span></div>
                  <div class="ep-meta">${em.escapeHtml(metaParts.join(" · "))}</div>
                </article>
              </summary>
              <div class="ep-content-panel">
                ${descriptionHtml}
                ${attachmentsHtml}
                <button class="ep-mini-btn" type="button" data-action="open-content" data-item-index="${originalIndex}">${em.escapeHtml(em.t("content_open"))}</button>
              </div>
            </details>
          `;
      })
      .join("");
  };

  if (em.state.isArchiveView) {
    em.panelEls.pendingBody.innerHTML = buildListHtml(archivedItems, em.t("empty_archived"), { label: em.t("action_restore"), action: "unarchive" }, false);
    em.panelEls.todayBody.innerHTML = "";
    em.panelEls.overdueBody.innerHTML = "";
    em.panelEls.agendaBody.innerHTML = "";
    if (em.panelEls.contentBody) em.panelEls.contentBody.innerHTML = "";
  } else {
    em.panelEls.todayBody.innerHTML = buildListHtml(todayItems, em.t("empty_today"), null, true);
    em.panelEls.pendingBody.innerHTML = buildListHtml(pendingItems, em.t("empty_pending"), null, true);
    em.panelEls.overdueBody.innerHTML = buildListHtml(overdueItems, em.t("empty_overdue"), { label: em.t("action_archive"), action: "archive" }, true);
    if (em.panelEls.contentBody) em.panelEls.contentBody.innerHTML = buildContentHtml(contentItems);
    em.renderAgenda(filteredItems);
  }

  const addItemListeners = (container) => {
    if (!container) return;
    container.querySelectorAll(".ep-item-btn").forEach((card) => {
      const openItem = () => {
        const index = Number(card.getAttribute("data-item-index"));
        const item = em.state.pending[index];
        if (item) {
          em.navigateToActivity(item);
        }
      };

      card.addEventListener("click", (event) => {
        if (event.target instanceof HTMLElement && event.target.closest(".ep-mini-btn")) {
          return;
        }
        openItem();
      });

      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openItem();
        }
      });
    });
  };

  const addActionListeners = (container) => {
    if (!container) return;
    container.querySelectorAll(".ep-mini-btn").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const index = Number(btn.getAttribute("data-item-index"));
        const action = btn.getAttribute("data-action");
        if (action === "archive") {
          await em.archiveItemByIndex(index);
        } else if (action === "unarchive") {
          await em.unarchiveItemByIndex(index);
        } else if (action === "pin") {
          await em.pinItemByIndex(index);
        } else if (action === "unpin") {
          await em.unpinItemByIndex(index);
        } else if (action === "download-content-file") {
          const item = em.state.pending[index];
          const fileIndex = Number(btn.getAttribute("data-file-index"));
          const attachment = item && Array.isArray(item.attachments) ? item.attachments[fileIndex] : null;
          await em.downloadContentAttachment(item, attachment);
        } else if (action === "open-content") {
          const item = em.state.pending[index];
          await em.navigateToContent(item);
        }
      });
    });
  };

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

  const containers = em.state.isArchiveView
    ? [em.panelEls.pendingBody]
    : [em.panelEls.todayBody, em.panelEls.pendingBody, em.panelEls.overdueBody, em.panelEls.agendaBody, em.panelEls.contentBody];

  containers.forEach((container) => {
    addItemListeners(container);
    addActionListeners(container);
    addContentDetailListeners(container);
  });
  if (em.updateCollapsedSummary) em.updateCollapsedSummary();
  if (em.updateFilterClearButton) em.updateFilterClearButton();
  if (em.updateBulkActionButtons) em.updateBulkActionButtons();
};

em.renderLogs = function (logs) {
  if (!em.panelEls || !em.panelEls.logBody) return;

  const safeLogs = Array.isArray(logs) ? logs.filter((entry) => entry && typeof entry === "object") : [];
  if (!safeLogs.length) {
    em.panelEls.logBody.innerHTML = `<div class="ep-empty">${em.escapeHtml(em.t("empty_log"))}</div>`;
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

  em.panelEls.logBody.innerHTML = html;

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
