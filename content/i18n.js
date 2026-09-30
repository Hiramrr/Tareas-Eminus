window.eminus = window.eminus || {};
var em = window.eminus;

// Los diccionarios viven en content/i18n/<idioma>.js y se cargan antes que
// este archivo (manifest, popup.html, tests/load.js y scripts/check-i18n.js).
em.i18n = em.i18n || {};

em.t = function(key) {
  const lang = em.state?.lang || 'es';
  const dictionary = em.i18n[lang] || em.i18n['es'];
  return dictionary[key] || em.i18n.es[key] || key;
};

em.applyTranslations = function() {
  if (!em.panelEls) return;
  const els = em.panelEls;
  
  const titleEl = els.root.querySelector('.ep-title');
  if (titleEl) titleEl.textContent = em.t('title');
  
  if (els.subtitle) {
    if (em.state.lastUpdatedAt) {
      els.subtitle.textContent = em.t("last_read") + ": " + em.formatDateTime(em.state.lastUpdatedAt);
      if (em.updateAutoRefreshLabel) em.updateAutoRefreshLabel(em.autoRefreshMinutes);
    } else {
      els.subtitle.textContent = em.t('unread');
    }
  }
  if (els.refreshBtn) {
    els.refreshBtn.textContent = em.t('refresh');
    els.refreshBtn.title = em.t('refresh_tooltip');
  }
  if (els.collapseBtn) {
    els.collapseBtn.title = em.state.isCollapsed ? em.t('expand_tooltip') : em.t('collapse_tooltip');
  }
  em.updateArchiveToggleButton(); // uses em.t internally now

  const tabSummary = els.root.querySelector('[data-tab="summary"]');
  if (tabSummary) tabSummary.textContent = em.t('tab_summary');
  const tabAgenda = els.root.querySelector('[data-tab="agenda"]');
  if (tabAgenda) tabAgenda.textContent = em.t('tab_agenda');
  const tabContent = els.root.querySelector('[data-tab="content"]');
  if (tabContent) tabContent.textContent = em.t('tab_content');
  const tabLog = els.root.querySelector('[data-tab="log"]');
  if (tabLog) tabLog.textContent = em.t('tab_log');
  const tabConfig = els.root.querySelector('[data-tab="config"]');
  if (tabConfig) tabConfig.textContent = em.t('tab_config');
  if (els.taskViewSelect && els.taskViewSelect.options.length >= 4) {
    els.taskViewSelect.setAttribute('aria-label', em.t('tab_pending'));
    els.taskViewSelect.options[0].textContent = em.t('tab_pending');
    els.taskViewSelect.options[1].textContent = em.t('task_view_all');
    els.taskViewSelect.options[2].textContent = em.t('tab_today');
    els.taskViewSelect.options[3].textContent = em.t('tab_overdue');
  }
  if (els.themeLabel) els.themeLabel.textContent = em.t('theme_label');
  if (els.configDailySummary) els.configDailySummary.textContent = em.t("config_daily");
  if (els.configPersonalSummary) els.configPersonalSummary.textContent = em.t("config_personal");
  if (els.configAppearanceSummary) els.configAppearanceSummary.textContent = em.t("config_appearance");
  if (els.configInterfaceSummary) els.configInterfaceSummary.textContent = em.t("config_interface");
  if (els.configDangerSummary) els.configDangerSummary.textContent = em.t("config_danger");
  if (els.configDailyHint) els.configDailyHint.textContent = em.t("config_daily_hint");
  if (els.configPersonalHint) els.configPersonalHint.textContent = em.t("config_personal_hint");
  if (els.configAppearanceHint) els.configAppearanceHint.textContent = em.t("config_appearance_hint");
  if (els.configInterfaceHint) els.configInterfaceHint.textContent = em.t("config_interface_hint");
  if (els.configDangerHint) els.configDangerHint.textContent = em.t("config_danger_hint");
  if (els.autorefreshLabel) els.autorefreshLabel.textContent = em.t('autorefresh_label');
  if (els.reminderLabel) els.reminderLabel.textContent = em.t('reminder_label');
  if (els.quietHoursLabel) els.quietHoursLabel.textContent = em.t("quiet_hours_label");
  if (els.fontLabel) els.fontLabel.textContent = em.t('font_label');
  if (els.logVisibilityLabel) els.logVisibilityLabel.textContent = em.t('log_visibility_label');
  if (els.langLabel) els.langLabel.textContent = em.t('lang_label');
  if (els.nicknameLabel) els.nicknameLabel.textContent = em.t("profile_nickname_label");
  if (els.nicknameInput) els.nicknameInput.placeholder = em.t("profile_nickname_placeholder");
  if (els.panelNameLabel) els.panelNameLabel.textContent = em.t("profile_panel_name_label");
  if (els.panelNameInput) els.panelNameInput.placeholder = em.t("profile_panel_name_placeholder");
  if (els.personalSymbolLabel) els.personalSymbolLabel.textContent = em.t("profile_symbol_label");
  if (els.personalSymbolSelect && els.personalSymbolSelect.options.length) {
    els.personalSymbolSelect.options[0].textContent = em.t("profile_symbol_none");
  }
  if (els.emptyMessageLabel) els.emptyMessageLabel.textContent = em.t("profile_empty_message_label");
  if (els.emptyMessageInput) els.emptyMessageInput.placeholder = em.t("profile_empty_message_placeholder");
  if (els.todayOrderLabel) els.todayOrderLabel.textContent = em.t("profile_today_order_label");
  if (els.coursePreferencesLabel) els.coursePreferencesLabel.textContent = em.t("profile_courses_label");
  if (els.notificationPreferencesLabel) els.notificationPreferencesLabel.textContent = em.t("notification_preferences_label");
  if (els.notificationPreferenceTexts) {
    Object.entries(els.notificationPreferenceTexts).forEach(([key, element]) => {
      if (element) element.textContent = em.t("notification_" + key.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase()));
    });
  }
  if (els.todayOrderSelect && els.todayOrderSelect.options.length >= 3) {
    els.todayOrderSelect.options[0].textContent = em.t("profile_today_order_smart");
    els.todayOrderSelect.options[1].textContent = em.t("profile_today_order_deadline");
    els.todayOrderSelect.options[2].textContent = em.t("profile_today_order_course");
  }
  if (em.updatePersonalGreeting) em.updatePersonalGreeting();
  if (em.renderCoursePreferences) em.renderCoursePreferences();
  
  if (els.autoRefreshSelect) {
    els.autoRefreshSelect.options[0].textContent = em.t('ar_off');
    els.autoRefreshSelect.options[1].textContent = em.t('ar_1m');
    els.autoRefreshSelect.options[2].textContent = em.t('ar_5m');
    els.autoRefreshSelect.options[3].textContent = em.t('ar_10m');
    els.autoRefreshSelect.options[4].textContent = em.t('ar_15m');
    els.autoRefreshSelect.options[5].textContent = em.t('ar_30m');
  }

  if (els.reminderSelect) {
    els.reminderSelect.options[0].textContent = em.t('rem_off');
    els.reminderSelect.options[1].textContent = em.t('rem_staggered');
    els.reminderSelect.options[2].textContent = em.t('rem_1h');
    els.reminderSelect.options[3].textContent = em.t('rem_3h');
    els.reminderSelect.options[4].textContent = em.t('rem_6h');
    els.reminderSelect.options[5].textContent = em.t('rem_12h');
    els.reminderSelect.options[6].textContent = em.t('rem_24h');
    els.reminderSelect.options[7].textContent = em.t('rem_48h');
  }
  if (els.quietStartSelect && els.quietStartSelect.options.length) {
    els.quietStartSelect.options[0].textContent = em.t("quiet_start_off");
  }
  if (els.quietEndSelect && els.quietEndSelect.options.length) {
    els.quietEndSelect.options[0].textContent = em.t("quiet_end_off");
  }

  if (els.logVisibilitySelect) {
    els.logVisibilitySelect.options[0].textContent = em.t('log_visibility_visible');
    els.logVisibilitySelect.options[1].textContent = em.t('log_visibility_removed');
  }
  
  if (els.langSelect) {
    els.langSelect.options[0].textContent = em.t('lang_es');
    els.langSelect.options[1].textContent = em.t('lang_en');
    els.langSelect.options[2].textContent = em.t('lang_fr');
    els.langSelect.options[3].textContent = em.t('lang_ja');
    els.langSelect.options[4].textContent = em.t('lang_ko');
    els.langSelect.options[5].textContent = em.t('lang_zh');
  }

  if (els.clearSnapshotBtn) {
    els.clearSnapshotBtn.textContent = em.t("config_clear_data_data");
  }
  if (els.clearAllBtn) {
    els.clearAllBtn.textContent = em.t("config_clear_data_all");
  }
  if (els.shortcutsHint) {
    els.shortcutsHint.innerHTML = em.t("shortcuts_hint");
  }

  if (els.filterQueryPlaceholder) {
    els.filterQueryPlaceholder.placeholder = em.t("filter_search_placeholder");
  }
  if (els.filterUrgencySelect && els.filterUrgencySelect.options.length >= 5) {
    els.filterUrgencySelect.options[0].textContent = em.t("filter_urgency_all");
    els.filterUrgencySelect.options[1].textContent = em.t("filter_urgency_overdue");
    els.filterUrgencySelect.options[2].textContent = em.t("filter_urgency_imminent");
    els.filterUrgencySelect.options[3].textContent = em.t("filter_urgency_urgent");
    els.filterUrgencySelect.options[4].textContent = em.t("filter_urgency_normal");
  }
  if (els.filterDateSelect && els.filterDateSelect.options.length >= 7) {
    els.filterDateSelect.options[0].textContent = em.t("filter_date_all");
    els.filterDateSelect.options[1].textContent = em.t("filter_date_today");
    els.filterDateSelect.options[2].textContent = em.t("filter_date_3d");
    els.filterDateSelect.options[3].textContent = em.t("filter_date_7d");
    els.filterDateSelect.options[4].textContent = em.t("filter_date_30d");
    els.filterDateSelect.options[5].textContent = em.t("filter_date_nodate");
    els.filterDateSelect.options[6].textContent = em.t("filter_date_overdue");
  }
  if (els.filterTaskSortSelect && els.filterTaskSortSelect.options.length >= 4) {
    els.filterTaskSortSelect.options[0].textContent = em.t("filter_sort_deadline");
    els.filterTaskSortSelect.options[1].textContent = em.t("filter_sort_urgency");
    els.filterTaskSortSelect.options[2].textContent = em.t("filter_sort_course");
    els.filterTaskSortSelect.options[3].textContent = em.t("filter_sort_title");
  }
  if (els.filterContentType && els.filterContentType.options.length >= 4) {
    els.filterContentType.options[0].textContent = em.t("filter_content_all");
    els.filterContentType.options[1].textContent = em.t("filter_content_units");
    els.filterContentType.options[2].textContent = em.t("filter_content_elements");
    els.filterContentType.options[3].textContent = em.t("filter_content_files");
  }
  if (els.filterContentModule && els.filterContentModule.options.length) {
    els.filterContentModule.options[0].textContent = em.t("filter_modules_all");
  }
  if (els.filterContentSort && els.filterContentSort.options.length >= 5) {
    els.filterContentSort.options[0].textContent = em.t("filter_content_sort_newest");
    els.filterContentSort.options[1].textContent = em.t("filter_content_sort_oldest");
    els.filterContentSort.options[2].textContent = em.t("filter_content_sort_course");
    els.filterContentSort.options[3].textContent = em.t("filter_content_sort_module");
    els.filterContentSort.options[4].textContent = em.t("filter_content_sort_title");
  }
  if (em.updateFiltersCompactButton) em.updateFiltersCompactButton();
  if (em.updateFilterClearButton) em.updateFilterClearButton();
  if (em.updateBulkActionButtons) em.updateBulkActionButtons();
  if (em.updateTabCounters) em.updateTabCounters();
  if (em.updateCollapsedSummary) em.updateCollapsedSummary();

  if (els.footer && (els.footer.textContent === "Listo" || els.footer.textContent === "Ready" || els.footer.textContent === "Prêt" || els.footer.textContent === "準備完了" || els.footer.textContent === "준비됨" || els.footer.textContent === "就绪" || els.footer.textContent === em.t('ready'))) {
    em.setStatus(em.t('ready'));
  }
};
