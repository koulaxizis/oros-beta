// ============================================
// orOS Global Settings Manager v2.2
// Single source of truth for ALL apps
// Common Settings Tabs (Global + Cloud Sync) — injected once, shared everywhere
// v2.2 CHANGES:
//   - onClick() now uses event delegation (works for dynamically
//     created buttons, e.g. toolbars built after DOMContentLoaded)
//   - oros-sync-ready routes engine toasts through window.orosShowToast
//   - bindSyncControls() delivered as one complete, verified block
// ============================================

(function() {
  'use strict';

  // ===== SETTINGS STATE =====
  var SETTINGS = {
    zenModeEnabled: false,
    readingProgressEnabled: true,
    focusModeEnabled: true,
    quickTbarShow: true,
    smartTypographyEnabled: true,
    typewriterSoundEnabled: false,
    hideStatsOverlay: false,
    hideSaveIndicator: false,

    hideGoalBtn: false,
    hideOutlineBtn: false,
    hideMetadataBtn: false,
    hideFindBtn: false,
    hideWordFreqBtn: false,
    hideLoremBtn: false,

    hideCopyBtn: false,
    hideSaveBtn: false,
    hideOpenBtn: false,
    hideClearBtn: false,
    hideUndoBtn: false,
    hideRedoBtn: false,
    hideResetBtn: false,
    hideOptionsDropdown: false,
    hideStatsPanelBtn: false
  };

  var STORAGE_PREFIX = 'oros_';

  var KEY_MAP = {
    'zen_mode': 'zenModeEnabled',
    'reading_progress': 'readingProgressEnabled',
    'focus_mode': 'focusModeEnabled',
    'quick_tbar_show': 'quickTbarShow',
    'smart_typography': 'smartTypographyEnabled',
    'typewriter_sound': 'typewriterSoundEnabled',
    'hide_stats': 'hideStatsOverlay',
    'hide_save_indicator': 'hideSaveIndicator',
    'hide_goal_btn': 'hideGoalBtn',
    'hide_outline_btn': 'hideOutlineBtn',
    'hide_metadata_btn': 'hideMetadataBtn',
    'hide_find_btn': 'hideFindBtn',
    'hide_wordfreq_btn': 'hideWordFreqBtn',
    'hide_lorem_btn': 'hideLoremBtn',
    'hide_converter_copy_btn': 'hideCopyBtn',
    'hide_converter_save_btn': 'hideSaveBtn',
    'hide_converter_open_btn': 'hideOpenBtn',
    'hide_converter_clear_btn': 'hideClearBtn',
    'hide_converter_undo_btn': 'hideUndoBtn',
    'hide_converter_redo_btn': 'hideRedoBtn',
    'hide_converter_reset_btn': 'hideResetBtn',
    'hide_converter_options': 'hideOptionsDropdown',
    'hide_converter_stats_btn': 'hideStatsPanelBtn'
  };

  // Event dispatchers for inter-app communication
  window.orosSettings = {
    getSetting: function(key) { return SETTINGS[key]; },
    setSetting: function(key, value) {
      if (SETTINGS.hasOwnProperty(key)) {
        SETTINGS[key] = value;
        localStorage.setItem(STORAGE_PREFIX + key, value ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('oros-setting-changed', {
          detail: { key: key, value: value }
        }));
      }
    }
  };

  // ========== INITIALIZATION ==========

  function init() {
    loadAllSettings();
    setupLocalStorageListener();
    setupLiveVisibilityListeners();

    if (window.orosAppElements) {
      applyVisibility();
    }
  }

  // ========== LIVE VISIBILITY LISTENERS ==========

  function setupLiveVisibilityListeners() {
    var VIS_EVENTS = [
      'oros-reading-progress-changed',
      'oros-smart-typography-changed',
      'oros-focus-mode-changed',
      'oros-hide-stats-changed',
      'oros-hide-save-indicator-changed',
      'oros-hide-goal-btn-changed',
      'oros-hide-outline-btn-changed',
      'oros-hide-metadata-btn-changed',
      'oros-hide-find-btn-changed',
      'oros-hide-wordfreq-btn-changed',
      'oros-hide-lorem-btn-changed',
      'oros-typewriter-sound-changed',
      'oros-zen-mode-changed'
    ];

    VIS_EVENTS.forEach(function(eventName) {
      window.addEventListener(eventName, function() {
        loadAllSettings();
        if (window.orosAppElements) {
          applyVisibility();
        }
      });
    });
  }

  // ========== LOAD SETTINGS ==========

  function loadAllSettings() {
    SETTINGS.zenModeEnabled = localStorage.getItem(STORAGE_PREFIX + 'zen_mode') === 'true';
    SETTINGS.readingProgressEnabled = localStorage.getItem(STORAGE_PREFIX + 'reading_progress') !== 'false';
    SETTINGS.focusModeEnabled = localStorage.getItem(STORAGE_PREFIX + 'focus_mode') !== 'false';
    SETTINGS.quickTbarShow = localStorage.getItem(STORAGE_PREFIX + 'quick_tbar_show') !== 'false';
    SETTINGS.smartTypographyEnabled = localStorage.getItem(STORAGE_PREFIX + 'smart_typography') !== 'false';
    SETTINGS.typewriterSoundEnabled = localStorage.getItem(STORAGE_PREFIX + 'typewriter_sound') === 'true';
    SETTINGS.hideStatsOverlay = localStorage.getItem(STORAGE_PREFIX + 'hide_stats') === 'true';
    SETTINGS.hideSaveIndicator = localStorage.getItem(STORAGE_PREFIX + 'hide_save_indicator') === 'true';

    SETTINGS.hideGoalBtn = localStorage.getItem(STORAGE_PREFIX + 'hide_goal_btn') === 'true';
    SETTINGS.hideOutlineBtn = localStorage.getItem(STORAGE_PREFIX + 'hide_outline_btn') === 'true';
    SETTINGS.hideMetadataBtn = localStorage.getItem(STORAGE_PREFIX + 'hide_metadata_btn') === 'true';
    SETTINGS.hideFindBtn = localStorage.getItem(STORAGE_PREFIX + 'hide_find_btn') === 'true';
    SETTINGS.hideWordFreqBtn = localStorage.getItem(STORAGE_PREFIX + 'hide_wordfreq_btn') === 'true';
    SETTINGS.hideLoremBtn = localStorage.getItem(STORAGE_PREFIX + 'hide_lorem_btn') === 'true';

    SETTINGS.hideCopyBtn = localStorage.getItem(STORAGE_PREFIX + 'hide_converter_copy_btn') === 'true';
    SETTINGS.hideSaveBtn = localStorage.getItem(STORAGE_PREFIX + 'hide_converter_save_btn') === 'true';
    SETTINGS.hideOpenBtn = localStorage.getItem(STORAGE_PREFIX + 'hide_converter_open_btn') === 'true';
    SETTINGS.hideClearBtn = localStorage.getItem(STORAGE_PREFIX + 'hide_converter_clear_btn') === 'true';
    SETTINGS.hideUndoBtn = localStorage.getItem(STORAGE_PREFIX + 'hide_converter_undo_btn') === 'true';
    SETTINGS.hideRedoBtn = localStorage.getItem(STORAGE_PREFIX + 'hide_converter_redo_btn') === 'true';
    SETTINGS.hideResetBtn = localStorage.getItem(STORAGE_PREFIX + 'hide_converter_reset_btn') === 'true';
    SETTINGS.hideOptionsDropdown = localStorage.getItem(STORAGE_PREFIX + 'hide_converter_options') === 'true';
    SETTINGS.hideStatsPanelBtn = localStorage.getItem(STORAGE_PREFIX + 'hide_converter_stats_btn') === 'true';
  }

  // ========== REAL-TIME SYNC ==========

  function setupLocalStorageListener() {
    window.addEventListener('storage', function(e) {
      var key = e.key;
      var value = e.newValue;

      if (!key || key.indexOf(STORAGE_PREFIX) !== 0) return;

      var strippedKey = key.replace(STORAGE_PREFIX, '');

      if (KEY_MAP[strippedKey]) {
        var settingProp = KEY_MAP[strippedKey];
        var defaultTrueKeys = [
          'reading_progress', 'focus_mode', 'quick_tbar_show', 'smart_typography'
        ];
        if (defaultTrueKeys.indexOf(strippedKey) !== -1) {
          SETTINGS[settingProp] = value !== 'false';
        } else {
          SETTINGS[settingProp] = value === 'true';
        }
      }

      window.dispatchEvent(new CustomEvent('oros-storage-sync', {
        detail: { key: strippedKey, value: value }
      }));

      if (window.orosAppElements) {
        applyVisibility();
      }
    });
  }

  // ========== VISIBILITY APPLICATION ==========

  function applyVisibility() {
    var btnGoal = document.getElementById('btn-goal');
    var btnOutline = document.getElementById('btn-outline');
    var btnMetadata = document.getElementById('btn-metadata');
    var btnFind = document.getElementById('btn-find');
    var btnWordFreq = document.getElementById('btn-wordfreq');
    var btnLorem = document.getElementById('btn-lorem');
    var progressBar = document.getElementById('reading-progress-bar');
    var statsOverlay = document.getElementById('stats-overlay');
    var saveIndicator = document.getElementById('save-indicator');

    if (btnGoal) btnGoal.style.display = SETTINGS.hideGoalBtn ? 'none' : '';
    if (btnOutline) btnOutline.style.display = SETTINGS.hideOutlineBtn ? 'none' : '';
    if (btnMetadata) btnMetadata.style.display = SETTINGS.hideMetadataBtn ? 'none' : '';
    if (btnFind) btnFind.style.display = SETTINGS.hideFindBtn ? 'none' : '';
    if (btnWordFreq) btnWordFreq.style.display = SETTINGS.hideWordFreqBtn ? 'none' : '';
    if (btnLorem) btnLorem.style.display = SETTINGS.hideLoremBtn ? 'none' : '';
    if (progressBar) progressBar.style.display = SETTINGS.readingProgressEnabled ? '' : 'none';
    if (statsOverlay) statsOverlay.style.display = SETTINGS.hideStatsOverlay ? 'none' : '';
    if (saveIndicator) saveIndicator.style.visibility = SETTINGS.hideSaveIndicator ? 'hidden' : 'visible';

    var btnCopy = document.getElementById('btn-conv-copy');
    var btnSaveConv = document.getElementById('btn-conv-save');
    var btnOpenConv = document.getElementById('btn-conv-open');
    var btnClearConv = document.getElementById('btn-conv-clear');
    var btnUndoConv = document.getElementById('btn-conv-undo');
    var btnRedoConv = document.getElementById('btn-conv-redo');
    var btnResetConv = document.getElementById('btn-conv-reset');
    var btnOptions = document.getElementById('btn-conv-options');
    var btnStatsConv = document.getElementById('btn-conv-stats');

    if (btnCopy) btnCopy.style.display = SETTINGS.hideCopyBtn ? 'none' : '';
    if (btnSaveConv) btnSaveConv.style.display = SETTINGS.hideSaveBtn ? 'none' : '';
    if (btnOpenConv) btnOpenConv.style.display = SETTINGS.hideOpenBtn ? 'none' : '';
    if (btnClearConv) btnClearConv.style.display = SETTINGS.hideClearBtn ? 'none' : '';
    if (btnUndoConv) btnUndoConv.style.display = SETTINGS.hideUndoBtn ? 'none' : '';
    if (btnRedoConv) btnRedoConv.style.display = SETTINGS.hideRedoBtn ? 'none' : '';
    if (btnResetConv) btnResetConv.style.display = SETTINGS.hideResetBtn ? 'none' : '';
    if (btnOptions) btnOptions.style.display = SETTINGS.hideOptionsDropdown ? 'none' : '';
    if (btnStatsConv) btnStatsConv.style.display = SETTINGS.hideStatsPanelBtn ? 'none' : '';
  }

  // ============================================================
  // ===== COMMON SETTINGS TABS (GLOBAL + CLOUD SYNC) ===========
  // ============================================================

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function tr(key, fallback) {
    var T = window.OROS_TRANSLATIONS;
    var lang = localStorage.getItem('oros-language') || 'en';
    var dict = (T && (T[lang] || T.en)) || null;
    var val = dict ? dict[key] : undefined;
    return (val === undefined || val === null) ? fallback : val;
  }

  function showToast(msg) {
    if (typeof window.orosShowToast === 'function') window.orosShowToast(msg);
    else console.log('[oros-global]', msg);
  }

  function syncInstance() {
    return (window.orosSync && typeof window.orosSync.get === 'function') ? window.orosSync.get() : null;
  }

  function isBetaChannel() {
    return typeof OROS_CONFIG !== 'undefined' && !!OROS_CONFIG.isBeta;
  }

  function pageHasApp() {
    // index page shows ONLY the Global tab (no app data to sync)
    return document.body ? !document.body.classList.contains('index-page') : false;
  }

  // ----- Markers of tabs this module owns -----
  function removeLegacyCommonTabs(modal) {
    // Strip the per-app copies of Global / Sync tabs so the shared ones take over.
    // Covers old naming variants: sync-settings (kanban), cloud-sync (writer)
    qsa('.tab-btn', modal).forEach(function(btn) {
      var t = btn.getAttribute('data-tab');
      if (t === 'global-settings' || t === 'sync-settings' || t === 'cloud-sync') {
        btn.remove();
      }
    });
    ['global-settings', 'sync-settings', 'cloud-sync'].forEach(function(pid) {
      var p = qs('#' + pid, modal);
      if (p) p.remove();
    });
  }

  function buildGlobalPanel() {
    var betaBlock = isBetaChannel() ? (
      '<div class="settings-divider"></div>' +
      '<div class="beta-section">' +
      '<div class="beta-header" data-i18n="beta_title">Beta Channel</div>' +
      '<p class="beta-warning" data-i18n="beta_warning">This is a beta version. Features may change.</p>' +
      '<div class="beta-links">' +
      '<a href="https://github.com/koulaxizis/oros-beta" target="_blank" rel="noopener" class="beta-btn" data-i18n="beta_repo_link">GitHub Repository</a>' +
      '<a href="https://koulaxizis.github.io/oros-beta/" target="_blank" rel="noopener" class="beta-btn" data-i18n="link_live_beta">Live Beta</a>' +
      '</div></div>'
    ) : '';

    var div = document.createElement('div');
    div.className = 'tab-panel active';
    div.id = 'global-settings';
    div.style.display = 'flex';
    div.innerHTML =
      '<div class="toggles-container">' +
      '<div class="toggle-row">' +
      '<span class="toggle-label" data-i18n="toggle_zen">Zen Mode</span>' +
      '<label class="switch"><input type="checkbox" id="toggle-zen-mode"><span class="slider"></span></label>' +
      '</div>' +
      '<div class="toggle-row">' +
      '<span class="toggle-label" data-i18n="install_app">Install as App</span>' +
      '<button class="btn-install" id="btn-install" disabled data-i18n="install_app">Install</button>' +
      '</div>' +
      '<div class="settings-divider"></div>' +
      '<div class="toggle-row">' +
      '<span class="toggle-label" data-i18n="kanban_theme">Theme</span>' +
      '<button id="btn-theme-toggle" class="btn-small" data-i18n="kanban_toggle_theme"><i class="fa fa-adjust"></i> Toggle</button>' +
      '</div>' +
      betaBlock +
      '</div>';
    return div;
  }

  function buildSyncPanel() {
    var div = document.createElement('div');
    div.className = 'tab-panel';
    div.id = 'cloud-sync';
    div.style.display = 'none';
    div.innerHTML =
      '<div class="toggles-container">' +
      '<div class="sync-status-box">' +
      '<div class="sync-status-row">' +
      '<span class="toggle-label" data-i18n="sync_status">Status</span>' +
      '<span id="cloud-sync-status" class="sync-status sync-idle">' + tr('sync_status_idle', '●') + '</span>' +
      '</div>' +
      '<div class="sync-status-row">' +
      '<span class="toggle-label" data-i18n="sync_folder">Folder</span>' +
      '<span id="sync-dir-display" style="display:none;"><i class="fa fa-folder-o"></i> <span id="sync-dir-name"></span></span>' +
      '</div>' +
      '<div class="sync-status-row">' +
      '<span class="toggle-label" data-i18n="sync_last">Last sync</span>' +
      '<span id="cloud-sync-last">—</span>' +
      '</div>' +
      '</div>' +
      '<div class="toggle-row">' +
      '<span class="toggle-label" data-i18n="sync_choose_folder">Choose Sync Folder</span>' +
      '<button id="btn-cloud-connect" class="btn-small"><i class="fa fa-plug"></i> ' + tr('sync_choose_folder', 'Choose') + '</button>' +
      '</div>' +
      '<div class="toggle-row">' +
      '<span class="toggle-label" data-i18n="sync_autosync">Auto-sync</span>' +
      '<label class="switch"><input type="checkbox" id="sync-auto-toggle" checked><span class="slider"></span></label>' +
      '</div>' +
      '<div class="toggle-row">' +
      '<span class="toggle-label" data-i18n="sync_now">Sync Now</span>' +
      '<button id="btn-cloud-sync-now" class="btn-small"><i class="fa fa-refresh"></i> ' + tr('sync_now', 'Sync') + '</button>' +
      '</div>' +
      '<div class="toggle-row">' +
      '<span class="toggle-label" data-i18n="sync_disable">Disable Sync</span>' +
      '<button id="btn-cloud-disconnect" class="btn-small" style="display:none;"><i class="fa fa-power-off"></i> ' + tr('sync_disable', 'Disable') + '</button>' +
      '</div>' +
      '<div class="settings-divider"></div>' +
      '<button id="btn-cloud-restore" class="btn-small" style="width:100%;"><i class="fa fa-cloud-download"></i> ' + tr('sync_restore_cloud', 'Restore from Cloud File') + '</button>' +
      '<button id="btn-idb-restore" class="btn-small" style="width:100%;margin-top:8px;"><i class="fa fa-database"></i> ' + tr('sync_restore_idb', 'Restore from IndexedDB') + '</button>' +
      '<p class="sync-explainer" data-i18n="sync_explainer">Sync stores each orOS app database as its own .json file inside a folder you pick (e.g. your Syncthing folder).</p>' +
      '<div class="sync-help" style="margin-top:12px;">' +
      '<table class="shortcut-table sync-help-table">' +
      '<thead><tr><th data-i18n="sync_help_col_browser">Browser</th><th data-i18n="sync_help_col_access">File Access</th></tr></thead>' +
      '<tbody>' +
      '<tr><td data-i18n="sync_help_br_chrome">Chrome / Edge / Brave (Desktop)</td><td data-i18n="sync_help_full">✓ Full</td></tr>' +
      '<tr><td data-i18n="sync_help_br_firefox">Firefox</td><td data-i18n="sync_help_idb_only">✗ IndexedDB only</td></tr>' +
      '<tr><td data-i18n="sync_help_br_android">All browsers (Android)</td><td data-i18n="sync_help_use_import">✗ Use Import / Export</td></tr>' +
      '</tbody></table>' +
      '</div>' +
      '</div>';
    return div;
  }

  function setupUniversalTabs(modal) {
    var nav = qs('.settings-nav', modal);
    if (!nav || nav.dataset.universalTabs === '1') return;
    nav.dataset.universalTabs = '1';

    nav.addEventListener('click', function(e) {
      var btn = e.target.closest ? e.target.closest('.tab-btn') : null;
      if (!btn) return;
      var targetId = btn.getAttribute('data-tab');
      var panel = qs('#' + targetId, modal);
      if (!panel) return;

      qsa('.tab-btn', modal).forEach(function(b) { b.classList.remove('active'); });
      qsa('.tab-panel', modal).forEach(function(p) {
        p.classList.remove('active');
        p.style.display = 'none';
      });

      btn.classList.add('active');
      panel.classList.add('active');
      panel.style.display = 'flex';
    });
  }

  function injectCommonTabs() {
    var modal = document.querySelector('.settings-modal');
    if (!modal) return;
    var nav = qs('.settings-nav', modal);
    var body = qs('.settings-body', modal);
    if (!nav || !body) return;

    removeLegacyCommonTabs(modal);

    // Global tab — always first
    var gBtn = document.createElement('button');
    gBtn.className = 'tab-btn active';
    gBtn.setAttribute('data-tab', 'global-settings');
    gBtn.setAttribute('data-i18n', 'tab_global');
    gBtn.textContent = tr('tab_global', 'Global');
    nav.insertBefore(gBtn, nav.firstChild);

    var gPanel = buildGlobalPanel();
    body.appendChild(gPanel);

    // Cloud Sync tab — app pages only (index shows Global only)
    if (pageHasApp()) {
      var sBtn = document.createElement('button');
      sBtn.className = 'tab-btn';
      sBtn.setAttribute('data-tab', 'cloud-sync');
      sBtn.setAttribute('data-i18n', 'tab_cloud_sync');
      sBtn.textContent = tr('tab_cloud_sync', 'Cloud Sync');
      nav.appendChild(sBtn);

      body.appendChild(buildSyncPanel());

      // Old app-specific first tab loses "active" (Global is default now)
      qsa('.tab-btn', nav).forEach(function(b) {
        if (b.getAttribute('data-tab') !== 'global-settings') b.classList.remove('active');
      });
      qsa('.tab-panel', body).forEach(function(p) {
        if (p.id !== 'global-settings') {
          p.classList.remove('active');
          p.style.display = 'none';
        }
      });
    }

    setupUniversalTabs(modal);
  }

  // ============================================================
  // ===== COMMON BINDINGS =====
  // ============================================================

  // v2.2: event delegation — works even if the button is created
  // AFTER this call (dynamic toolbars, late-injected panels)
  function onClick(id, handler) {
    document.addEventListener('click', function(e) {
      var el = e.target.closest ? e.target.closest('#' + id) : null;
      if (el) handler.call(el, e);
    });
  }

  function bindZenToggle() {
    var zenToggle = qs('#toggle-zen-mode');
    if (!zenToggle) return;
    zenToggle.checked = localStorage.getItem('oros_zen_mode') === 'true';
    zenToggle.addEventListener('change', function() {
      var enabled = this.checked;
      localStorage.setItem('oros_zen_mode', enabled ? 'true' : 'false');
      if (enabled) document.body.setAttribute('data-zen', 'true');
      else document.body.removeAttribute('data-zen');
      window.dispatchEvent(new CustomEvent('oros-zen-mode-changed', { detail: { enabled: enabled } }));
    });
  }

  function bindThemeToggle() {
    onClick('btn-theme-toggle', function() {
      var current = document.documentElement.getAttribute('data-theme') || localStorage.getItem('oros-theme') || 'dark';
      var next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('oros-theme', next);
      showToast(next === 'dark' ? tr('theme_dark', 'Dark mode') : tr('theme_light', 'Light mode'));
    });
  }

  function bindInstallButton() {
    var installBtn = document.getElementById('btn-install');
    if (!installBtn) return;
    // PWA deferredPrompt event handler lives in main.js; here we only mirror state.
    // ONE click owner, ONE state mirror — no duplicate prompt() anywhere.
    window.addEventListener('beforeinstallprompt', function() {
      installBtn.disabled = false;
    });
    window.addEventListener('appinstalled', function() {
      installBtn.disabled = true;
    });
  }

  // ----- Manual sync flow (shared by all buttons) -----
  function connectFlow(s) {
    if (!s) { showToast(tr('sync_not_ready', 'Sync not ready yet')); return; }
    if (!s.dirHandle && typeof s.reauthorizeDirHandle === 'function' && s.isSupported && s.isSupported()) {
      s.reauthorizeDirHandle().then(function(handle) {
        if (handle) {
          if (typeof s.updateDirDisplay === 'function') s.updateDirDisplay();
        }
      });
      return;
    }
    Promise.resolve(s.pickDirectory()).then(function(handle) {
      if (!handle) return;
      showToast(tr('sync_connected', 'Sync folder:') + ' ' + handle.name);
      if (typeof s.saveBackup === 'function') {
        Promise.resolve(s.saveBackup()).then(function() {
          if (typeof s.updateDirDisplay === 'function') s.updateDirDisplay();
        });
      }
    }).catch(function(e) {
      if (e && e.name !== 'AbortError') {
        showToast(tr('sync_failed', 'Sync failed:') + ' ' + ((e && (e.message || e.name)) || e));
      }
    });
  }

  // ----- Sync controls: bindings FLAT, delegated clicks, listener ONCE -----
  function bindSyncControls() {
    // Writer IDs (canonical, also used by the injected panel)
    onClick('btn-cloud-connect', function() { connectFlow(syncInstance()); });
    onClick('btn-cloud-sync-now', function() {
      var s = syncInstance();
      if (s && typeof s.syncNow === 'function') s.syncNow();
    });
    onClick('btn-cloud-disconnect', function() {
      var s = syncInstance();
      if (s && typeof s.disconnect === 'function') s.disconnect();
    });
    onClick('btn-cloud-restore', function() {
      var s = syncInstance();
      if (s && typeof s.restoreFromCloud === 'function') s.restoreFromCloud();
    });
    onClick('btn-idb-restore', function() {
      var s = syncInstance();
      if (s && typeof s.restoreFromIDB === 'function') s.restoreFromIDB();
    });

    // Kanban legacy aliases (kept so existing toolbars keep working)
    onClick('btn-choose-sync-folder', function() { connectFlow(syncInstance()); });
    onClick('btn-sync-now', function() {
      var s = syncInstance();
      if (s && typeof s.syncNow === 'function') s.syncNow();
    });
    onClick('btn-disable-sync', function() {
      var s = syncInstance();
      if (s && typeof s.disconnect === 'function') s.disconnect();
    });

    // Auto-sync toggle
    var autoToggle = document.getElementById('sync-auto-toggle');
    if (autoToggle) {
      autoToggle.checked = localStorage.getItem('oros_sync_auto') !== '0';
      autoToggle.addEventListener('change', function() {
        localStorage.setItem('oros_sync_auto', this.checked ? '1' : '0');
        var s = syncInstance();
        if (s) {
          if (this.checked) {
            if (typeof s.startAutoSync === 'function') s.startAutoSync();
          } else {
            if (typeof s.stopAutoSync === 'function') s.stopAutoSync();
          }
        }
        showToast(this.checked ? tr('sync_autosync_on', 'Auto-sync ON') : tr('sync_autosync_off', 'Auto-sync OFF'));
      });
    }

    // When an app registers its sync instance (later at DOMContentLoaded), refresh UI.
    // ONE listener — no nesting, no duplicates.
    document.addEventListener('oros-sync-ready', function() {
      var s = syncInstance();
      if (!s) return;

      // Route the engine's toasts through the shared toast system
      if (typeof window.orosShowToast === 'function') s.toast = window.orosShowToast;

      // Localize the engine's hardcoded English status labels
      if (typeof s.STATUS_LABELS === 'object') {
        s.STATUS_LABELS = {
          'idle': tr('sync_status_idle', '● Not configured'),
          'synced': tr('sync_status_synced', '✓ Synced'),
          'syncing': tr('sync_status_syncing', '⟳ Syncing…'),
          'error': tr('sync_status_error', '⚠ Sync error'),
          'unsupported': tr('sync_status_unsupported', '● IndexedDB only')
        };
      }
      if (typeof s.updateDirDisplay === 'function') s.updateDirDisplay();
      if (typeof s.updateStatus === 'function') {
        var saved = localStorage.getItem(s.LAST_SYNC_LOCAL || '');
        s.updateStatus(s.dirHandle ? 'synced' : (s.isSupported && s.isSupported() ? 'idle' : 'unsupported'), saved || null);
      }
      if (localStorage.getItem('oros_sync_auto') === '0' && typeof s.stopAutoSync === 'function') {
        s.stopAutoSync();
      }
    });
  }

  // ----- Auto-sync lifecycle (close tab / hide tab) -----
  function setupSyncLifecycle() {
    function bestEffortSync() {
      var s = syncInstance();
      if (!s || !s.dirHandle) return; // no misleading "success" when not configured
      if (typeof s.saveBackup === 'function') {
        Promise.resolve(s.saveBackup()).catch(function() {});
      }
    }

    window.addEventListener('beforeunload', function(e) {
      var s = syncInstance();
      var syncConfigured = !!(s && s.dirHandle);

      if (syncConfigured && localStorage.getItem('oros_sync_auto') !== '0') {
        // Configured + auto on → silent best-effort save, NO prompt
        bestEffortSync();
        return;
      }

      // Not configured (or auto off) → warn ONLY if there are unsaved changes
      if (!syncConfigured && s && typeof s.isDirty === 'function' && s.isDirty()) {
        e.preventDefault();
        e.returnValue = tr('unsaved_warning', 'You have unsaved changes.');
        return e.returnValue;
      }
    });

    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden' && localStorage.getItem('oros_sync_auto') !== '0') {
        bestEffortSync();
      }
    });
  }

  // ========== COMMON BINDINGS ENTRY POINT ==========
  function bindCommonControls() {
    bindZenToggle();
    bindThemeToggle();
    bindInstallButton();
    bindSyncControls();
    setupSyncLifecycle();
  }

  // ========== BOOTSTRAP ==========
  document.addEventListener('DOMContentLoaded', function() {
    window.orosAppElements = {};
    init();

    // Common tabs must be injected BEFORE main.js binds its tab handlers.
    // global-settings.js is loaded first and its DOMContentLoaded listener
    // therefore fires before main.js's (same event, FIFO order).
    injectCommonTabs();
    bindCommonControls();
  });

})();