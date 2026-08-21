window.eminus = window.eminus || {};

window.eminus.API_BASE = "https://eminus.uv.mx/eminusapi8/api";

window.eminus.STORAGE_KEYS = {
  LOG: "eminusPendingLog",
  SNAPSHOT: "eminusLastSnapshot",
  KNOWN_IDS: "eminusKnownPendingIds",
  PANEL_POSITION: "eminusPanelPosition",
  THEME: "eminusPanelTheme",
  ACCOUNT_ID: "eminusAccountId",
  ARCHIVED: "eminusArchivedPendingIds",
  PINNED: "eminusPinnedPendingIds",
  AUTO_REFRESH: "eminusAutoRefreshMinutes",
  REMINDER_HOURS: "eminusReminderHours",
  REMINDER_MODE: "eminusReminderMode",
  QUIET_HOURS: "eminusQuietHours",
  NOTIFIED_UPCOMING: "eminusNotifiedUpcomingIds",
  LAST_URGENCY_BY_ID: "eminusLastUrgencyById",
  FONT: "eminusPanelFont",
  LANG: "eminusLanguage",
  LOG_TAB_VISIBLE: "eminusLogTabVisible",
  FILTERS_COMPACT: "eminusFiltersCompact",
  CUSTOM_THEME: "eminusCustomTheme",
  PANEL_SIZE: "eminusPanelSize",
  DELIVERY_ANIMATION: "eminusDeliveryAnimation",
  PANEL_UI_STATE: "eminusPanelUiState",
  PROFILE: "eminusPersonalProfile",
  COURSE_PREFERENCES: "eminusCoursePreferences",
  TODAY_ORDER: "eminusTodayOrder",
  NOTIFICATION_PREFERENCES: "eminusNotificationPreferences",
  READ_CONTENT_IDS: "eminusReadContentIds"
};

window.eminus.PREFERENCE_STORAGE_KEYS = [
  window.eminus.STORAGE_KEYS.THEME,
  window.eminus.STORAGE_KEYS.AUTO_REFRESH,
  window.eminus.STORAGE_KEYS.REMINDER_MODE,
  window.eminus.STORAGE_KEYS.QUIET_HOURS,
  window.eminus.STORAGE_KEYS.FONT,
  window.eminus.STORAGE_KEYS.LANG,
  window.eminus.STORAGE_KEYS.LOG_TAB_VISIBLE,
  window.eminus.STORAGE_KEYS.FILTERS_COMPACT,
  window.eminus.STORAGE_KEYS.CUSTOM_THEME,
  window.eminus.STORAGE_KEYS.PANEL_SIZE,
  window.eminus.STORAGE_KEYS.DELIVERY_ANIMATION,
  window.eminus.STORAGE_KEYS.PROFILE,
  window.eminus.STORAGE_KEYS.COURSE_PREFERENCES,
  window.eminus.STORAGE_KEYS.TODAY_ORDER,
  window.eminus.STORAGE_KEYS.NOTIFICATION_PREFERENCES
];

window.eminus.NAV_KEYS = {
  ACTIVITY_ID: "ep_target_activity_id",
  COURSE_ID: "ep_target_course_id",
  TITLE: "ep_target_activity_title",
  TS: "ep_target_activity_ts",
  STEP: "ep_target_step"
};

window.eminus.ARCHIVE_ICON_SVG = `
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="18" height="16" fill="none" stroke="currentColor" stroke-width="1.5"></rect>
      <path d="M3 10h18" fill="none" stroke="currentColor" stroke-width="1.5"></path>
      <rect x="8" y="13" width="8" height="3" fill="none" stroke="currentColor" stroke-width="1.5"></rect>
    </svg>
  `;

window.eminus.ARCHIVE_BUTTON_HTML = `
    <span class="ep-bracket">[</span>
    <span class="ep-archive-icon">${window.eminus.ARCHIVE_ICON_SVG}</span>
    <span class="ep-bracket">]</span>
  `;

window.eminus.ARCHIVE_BACK_HTML = `
    <span class="ep-bracket">[</span>
    <span class="ep-archive-back">←</span>
    <span class="ep-bracket">]</span>
  `;
