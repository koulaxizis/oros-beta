// ============================================
// orOS Writer — Clean Implementation
// Tabbed Rich Text Editor with Modern Features
// Fixes applied:
// #1  — frResults declared variable
// #2  — Replace All safe reverse-order
// #4  — Real DOCX export with JSZip (images supported)
// #5  — RTF export with basic formatting
// #6  — Removed beforeunload warning
// #7  — clearGoal respects hideStats setting
// #8  — Mobile height (CSS only)
// #9  — Lorem Ipsum appends instead of replacing
// #10 — Images use class instead of inline styles
// #11 — Full Markdown export (hr, img, table, del, sub, sup, mark)
// #12 — Removed duplicate input listener
// #13 — tabs.js integrated + i18n
// #15 — Help dialog shortcuts (handled in HTML)
// #16 — translations duplicate keys (handled in translations.json)
// #17 — export_docx key (handled in translations.json)
// ============================================

(function() {
  'use strict';

  // ============================================
  // TABS SYSTEM (integrated from tabs.js, fix #13)
  // ============================================

  var TABS_STORAGE_KEY = 'oros_writer_tabs';
  var MAX_TABS = 10;

  var tabBar = null;
  var tabsState = [];
  var activeTabId = null;
  var tabSwitchListeners = [];

  // ===== STORAGE KEYS =====
  var LEGACY_STORAGE_KEY = 'oros_writer_content';
  var LEGACY_STORAGE_METADATA = 'oros_writer_metadata';

  // ===== DOM ELEMENTS =====
  var richEditor = document.getElementById('rich-editor');
  var richWrapper = document.getElementById('rich-wrapper');
  var findBar = document.getElementById('find-replace-bar');
  var findInput = document.getElementById('find-find');
  var replaceInput = document.getElementById('find-replace');
  var frResults = document.getElementById('fr_results'); // FIX #1
  var btnOpen = document.getElementById('btn-open');
  var btnClear = document.getElementById('btn-clear');
  var btnExport = document.getElementById('btn-export');
  var btnLorem = document.getElementById('btn-lorem');
  var btnIndent = document.getElementById('btn-indent');
  var btnOutdent = document.getElementById('btn-outdent');
  var btnHr = document.getElementById('btn-hr');
  var btnTable = document.getElementById('btn-table');
  var btnLink = document.getElementById('btn-link');
  var btnImage = document.getElementById('btn-image');
  var exportDropdown = document.getElementById('export-dropdown');
  var fileInput = document.getElementById('file-input');
  var statsOverlay = document.getElementById('stats-overlay');
  var statsDefaultEl = document.getElementById('stats-default');
  var statsGoalEl = document.getElementById('stats-goal');
  var statsDetailed = document.getElementById('stats-detailed');
  var toolbarCenter = document.querySelector('.toolbar-center');
  var outlinePanel = document.getElementById('outline-panel');
  var outlineList = document.getElementById('outline-list');
  var btnOutline = document.getElementById('btn-outline');
  var btnCloseOutline = document.getElementById('btn-close-outline');
  var progressBar = document.getElementById('reading-progress-bar');
  var goalBar = document.getElementById('goal-bar');
  var goalUnitSelect = document.getElementById('goal-unit');
  var goalTargetInput = document.getElementById('goal-target-input');
  var goalLockCheckbox = document.getElementById('goal-lock');
  var btnGoal = document.getElementById('btn-goal');
  var btnSetGoal = document.getElementById('btn-set-goal');
  var btnClearGoal = document.getElementById('btn-clear-goal');
  var btnCloseGoal = document.getElementById('btn-close-goal');
  var btnFind = document.getElementById('btn-find');
  var btnCloseFR = document.getElementById('btn-close-fr');
  var metadataPanel = document.getElementById('metadata-panel');
  var btnMetadata = document.getElementById('btn-metadata');
  var btnCloseMetadata = document.getElementById('btn-close-metadata');
  var metaTitle = document.getElementById('meta-title');
  var metaAuthor = document.getElementById('meta-author');
  var metaTags = document.getElementById('meta-tags');
  var metaCategory = document.getElementById('meta-category');
  var metaCreated = document.getElementById('meta-created');
  var metaModified = document.getElementById('meta-modified');
  var btnWordFreq = document.getElementById('btn-wordfreq');
  var btnCloseWordFreq = document.getElementById('btn-close-wordfreq');
  var wordFreqPanel = document.getElementById('wordfreq-panel');
  var wordFreqSummary = document.getElementById('wordfreq-summary');
  var wordFreqList = document.getElementById('wordfreq-list');
  var saveIndicator = document.getElementById('save-indicator');

  // ===== DIALOGS =====
  var linkDialog = document.getElementById('link-dialog-overlay');
  var tableDialog = document.getElementById('table-dialog-overlay');
  var imageDialog = document.getElementById('image-dialog-overlay');
  var helpDialog = document.getElementById('help-dialog-overlay');

  // ===== STATE =====
  var goalTarget = parseInt(localStorage.getItem('oros_goal_target')) || null;
  var goalUnit = localStorage.getItem('oros_goal_unit') || 'words';
  var goalLockEnabled = localStorage.getItem('oros_goal_lock') === 'true';
  var goalReachedShown = false;
  var goalLockTriggered = false;
  var currentMatchIndex = -1;
  var matchRanges = [];
  var matchMarks = [];
  var statsExpanded = false;
  var wordFreqDebounce = null;
  var outlineDebounceTimer = null;
  var isSwitching = false;
  var currentMetadata = {};

  // ===== TRANSLATIONS HELPER =====
  function getCurrentLang() {
    return localStorage.getItem('oros-language') || 'en';
  }

  function getTrans(key) {
    var lang = getCurrentLang();
    var t = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[lang]) || {};
    return t[key] || key;
  }

  // ===== FORMAT NUMBER =====
  function formatNumber(num) {
    return num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num.toString();
  }

  // ===== TEXT CONTENT =====
  function getTextContent() {
    var text = richEditor.innerText || '';
    return text.replace(/\n$/, '');
  }

  // ============================================
  // TABS — INTERNAL API
  // ============================================

  function getTabsApi() {
    return {
      saveActiveContent: function(html) {
        var tab = getActiveTab();
        if (!tab) return;
        tab.content = html;
        persistTabs();
      },
      saveActiveMetadata: function(metadata) {
        var tab = getActiveTab();
        if (!tab) return;
        tab.metadata = metadata;
        tab.timestamp = Date.now();
        persistTabs();
      },
      saveActiveTimestamp: function(ts) {
        var tab = getActiveTab();
        if (!tab) return;
        tab.timestamp = ts;
        persistTabs();
      },
      getActiveTimestamp: function() {
        var tab = getActiveTab();
        return tab ? tab.timestamp : null;
      },
      getActiveTab: function() {
        return getActiveTab();
      },
      getActiveId: function() {
        return activeTabId;
      },
      createTab: function(opts) {
        createTab(opts);
      },
      closeTab: function(id) {
        closeTabById(id);
      },
      on: function(event, callback) {
        if (event === 'switch') tabSwitchListeners.push(callback);
        else if (event === 'create') tabSwitchListeners.push(callback);
      }
    };
  }

  function getActiveTab() {
    for (var i = 0; i < tabsState.length; i++) {
      if (tabsState[i].id === activeTabId) return tabsState[i];
    }
    return null;
  }

  function persistTabs() {
    try {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabsState));
    } catch(e) {
      console.warn('Failed to persist tabs:', e);
    }
  }

  function loadTabs() {
    try {
      var raw = localStorage.getItem(TABS_STORAGE_KEY);
      if (raw) {
        tabsState = JSON.parse(raw);
        if (!Array.isArray(tabsState)) tabsState = [];
      }
    } catch(e) {
      tabsState = [];
    }

    // Migrate legacy content
    if (tabsState.length === 0) {
      var legacyContent = localStorage.getItem(LEGACY_STORAGE_KEY);
      var legacyMeta = localStorage.getItem(LEGACY_STORAGE_METADATA);
      if (legacyContent) {
        var meta = {};
        try { meta = legacyMeta ? JSON.parse(legacyMeta) : {}; } catch(e) {}
        tabsState.push({
          id: generateTabId(),
          title: '',
          content: legacyContent,
          metadata: meta,
          timestamp: Date.now()
        });
      }
    }

    if (tabsState.length === 0) {
      tabsState.push({
        id: generateTabId(),
        title: '',
        content: '',
        metadata: {},
        timestamp: Date.now()
      });
    }

    activeTabId = tabsState[0].id;
    renderTabs();
  }

  function generateTabId() {
    return 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
  }

  function createTab(opts) {
    if (tabsState.length >= MAX_TABS) return;
    opts = opts || {};
    var newTab = {
      id: generateTabId(),
      title: '',
      content: opts.content || '',
      metadata: opts.metadata || {},
      timestamp: Date.now()
    };
    tabsState.push(newTab);
    activeTabId = newTab.id;
    persistTabs();
    renderTabs();
    notifySwitch(newTab);
  }

  function closeTabById(id) {
    var idx = -1;
    for (var i = 0; i < tabsState.length; i++) {
      if (tabsState[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;

    tabsState.splice(idx, 1);

    if (tabsState.length === 0) {
      var freshTab = {
        id: generateTabId(),
        title: '',
        content: '',
        metadata: {},
        timestamp: Date.now()
      };
      tabsState.push(freshTab);
      activeTabId = freshTab.id;
    } else if (activeTabId === id) {
      activeTabId = tabsState[Math.max(0, idx - 1)].id;
    }

    persistTabs();
    renderTabs();
    var active = getActiveTab();
    notifySwitch(active);
  }

  function switchTab(id) {
    if (id === activeTabId) return;
    activeTabId = id;
    renderTabs();
    var tab = getActiveTab();
    notifySwitch(tab);
  }

  function notifySwitch(tab) {
    for (var i = 0; i < tabSwitchListeners.length; i++) {
      try { tabSwitchListeners[i](tab); } catch(e) {}
    }
  }

  function renderTabs() {
    if (!tabBar) tabBar = document.getElementById('tab-bar');
    if (!tabBar) return;
    tabBar.innerHTML = '';

    for (var i = 0; i < tabsState.length; i++) {
      (function(tab) {
        var el = document.createElement('div');
        el.className = 'tab' + (tab.id === activeTabId ? ' active' : '');

        var label = document.createElement('span');
        label.className = 'tab-label';
        var title = (tab.metadata && tab.metadata.title) ? tab.metadata.title : '';
        label.textContent = title || (getTrans('editor_name') || 'Writer') + ' ' + (i + 1);
        label.title = title || '';

        var closeBtn = document.createElement('span');
        closeBtn.className = 'tab-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.title = getTrans('tab_close');

        closeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          closeTabById(tab.id);
        });

        el.appendChild(label);
        el.appendChild(closeBtn);

        el.addEventListener('click', function() {
          switchTab(tab.id);
        });

        tabBar.appendChild(el);
      })(tabsState[i]);
    }

    // New tab button
    if (tabsState.length < MAX_TABS) {
      var newBtn = document.createElement('div');
      newBtn.className = 'tab-new';
      newBtn.innerHTML = '+';
      newBtn.title = getTrans('tab_new');
      newBtn.addEventListener('click', function() {
        createTab({ content: '', metadata: {} });
      });
      tabBar.appendChild(newBtn);
    }
  }

  // ============================================
  // TABS INTEGRATION WITH WRITER
  // ============================================

  function saveCurrentTabContent() {
    if (isSwitching) return;
    var api = getTabsApi();
    if (!api) return;
    api.saveActiveContent(richEditor.innerHTML);
    api.saveActiveTimestamp(Date.now());
    updateSaveIndicator();
  }

  function saveCurrentTabMetadata(triggerSaveIndicator) {
    if (isSwitching) return;
    currentMetadata.title = metaTitle ? metaTitle.value || '' : '';
    currentMetadata.author = metaAuthor ? metaAuthor.value || '' : '';
    currentMetadata.tags = metaTags ? metaTags.value || '' : '';
    currentMetadata.category = metaCategory ? metaCategory.value || '' : '';
    if (!currentMetadata.created) {
      currentMetadata.created = new Date().toISOString();
    }
    currentMetadata.modified = new Date().toISOString();
    var api = getTabsApi();
    if (api) api.saveActiveMetadata(currentMetadata);
    renderMetaDates();
    if (triggerSaveIndicator) {
      api.saveActiveTimestamp(Date.now());
      updateSaveIndicator();
    }
  }
  
    // ============================================
  // TOAST NOTIFICATIONS
  // ============================================

  function showToast(message) {
    var toast = document.getElementById('zen-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'zen-toast';
      toast.className = 'zentool-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = '';
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() {
      toast.classList.remove('visible');
    }, 3000);
  }

  // ============================================
  // TYPEWRITER SOUND (Web Audio API)
  // ============================================

  var typewriterAudioCtx = null;
  var typewriterAudioBuffer = null;
  var typewriterSoundEnabled = localStorage.getItem('oros_typewriter_sound') === 'true';

  function initTypewriterSound() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      typewriterAudioCtx = new AC();
      var sampleRate = typewriterAudioCtx.sampleRate;
      var duration = 0.04;
      var numSamples = Math.floor(sampleRate * duration);
      var buffer = typewriterAudioCtx.createBuffer(1, numSamples, sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < numSamples; i++) {
        var t = i / sampleRate;
        var envelope = Math.exp(-t * 80);
        var noise = (Math.random() * 2 - 1) * 0.3;
        var click = Math.sin(2 * Math.PI * 2000 * t) * 0.15;
        data[i] = (noise + click) * envelope * 0.5;
      }
      typewriterAudioBuffer = buffer;
    } catch(e) {
      typewriterAudioCtx = null;
    }
  }

  function playTypewriterSound() {
    if (!typewriterSoundEnabled || !typewriterAudioCtx || !typewriterAudioBuffer) return;
    try {
      var source = typewriterAudioCtx.createBufferSource();
      source.buffer = typewriterAudioBuffer;
      var gainNode = typewriterAudioCtx.createGain();
      gainNode.gain.value = 0.08;
      source.connect(gainNode);
      gainNode.connect(typewriterAudioCtx.destination);
      source.start(0);
    } catch(e) {}
  }

  window.addEventListener('oros-typewriter-sound-changed', function(e) {
    typewriterSoundEnabled = e.detail.enabled;
    if (typewriterSoundEnabled && !typewriterAudioCtx) {
      initTypewriterSound();
    }
  });

  // ============================================
  // LOREM IPSUM GENERATOR — FIX #9: Append, not replace
  // ============================================

  function generateLoremIpsum() {
    var lang = getCurrentLang();
    var templates = {
      en: '<h1>Document Title</h1>' +
          '<p>This is the <strong>first paragraph</strong> with various formatting options. ' +
          'You can see <em>italic text</em>, <u>underlined text</u>, and <strong>bold text</strong>. ' +
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>' +
          '<ul><li>First bullet point item</li><li>Second bullet point item</li></ul>' +
          '<h2>Section Subheading</h2>' +
          '<blockquote>"Art is a lie that makes us realize the truth." — Pablo Picasso</blockquote>' +
          '<p>The <em>final paragraph</em> wraps up the sample content.</p>',
      el: '<h1>Τίτλος Εγγράφου</h1>' +
          '<p>Αυτή είναι η <strong>πρώτη παράγραφος</strong> με διάφορες επιλογές μορφοποίησης. ' +
          'Μπορείς να δεις <em>πλάγιο κείμενο</em>, <u>υπογεγραμμένο κείμενο</u>, ' +
          'και <strong>έντονο κείμενο</strong>.</p>' +
          '<ul><li>Πρώτο στοιχείο λίστας</li><li>Δεύτερο στοιχείο λίστας</li></ul>' +
          '<h2>Υπότιτλος Τμήματος</h2>' +
          '<blockquote>"Η τέχνη είναι ένα ψέμα που μας κάνει να συνειδητοποιούμε την αλήθεια."</blockquote>' +
          '<p>Η <em>τελευταία παράγραφος</em> κλείνει το δοκιμαστικό κείμενο.</p>'
    };
    return templates[lang] || templates.en;
  }

  function insertLoremIpsum() {
    if (!richEditor) return;
    // FIX #9: Append to end instead of replacing all content
    var separator = richEditor.innerHTML.trim() ? '<p>&nbsp;</p>' : '';
    richEditor.innerHTML += separator + generateLoremIpsum();
    saveCurrentTabContent();
    updateStats();
    showToast(getTrans('toast_lorem_inserted') || 'Sample text inserted');
  }

  // ============================================
  // SAVE INDICATOR
  // ============================================

  function updateSaveIndicator() {
    if (!saveIndicator) return;
    var t = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[getCurrentLang()]) || {};
    saveIndicator.style.visibility = hasSaveIndicatorHidden() ? 'hidden' : 'visible';
    var api = getTabsApi();
    var lastSavedTime = api ? api.getActiveTimestamp() : null;
    if (!lastSavedTime) {
      saveIndicator.textContent = t.text_not_saved || '—';
      return;
    }
    var diff = Math.floor((Date.now() - lastSavedTime) / 1000);
    if (diff < 60) {
      saveIndicator.textContent = t.text_saved_just_now || 'Saved just now';
    } else if (diff < 3600) {
      var mins = Math.floor(diff / 60);
      saveIndicator.textContent = (t.text_saved_minutes_ago || '{n}m ago').replace('{n}', mins);
    } else {
      var hours = Math.floor(diff / 3600);
      saveIndicator.textContent = (t.text_saved_hours_ago || '{n}h ago').replace('{n}', hours);
    }
  }

  function hasSaveIndicatorHidden() {
    return localStorage.getItem('oros_hide_save_indicator') === 'true';
  }

  // ===== INPUT EVENT (FIX #12: Single listener, no duplicates) =====
  if (richEditor) {
    richEditor.addEventListener('input', function() {
      saveCurrentTabContent();
      updateStats();
      if (outlinePanel && outlinePanel.style.display !== 'none') {
        clearTimeout(outlineDebounceTimer);
        outlineDebounceTimer = setTimeout(updateOutline, 300);
      }
      if (wordFreqPanel && wordFreqPanel.style.display !== 'none') {
        clearTimeout(wordFreqDebounce);
        wordFreqDebounce = setTimeout(updateWordFrequency, 810);
      }
      if (typewriterSoundEnabled) playTypewriterSound();
    });

    richEditor.addEventListener('scroll', function() {
      updateReadingProgress();
    }, { passive: true });
  }

  // ============================================
  // METADATA
  // ============================================

  function renderMetaDates() {
    var createdLabel = getTrans('meta_label_created');
    var modifiedLabel = getTrans('meta_label_modified');
    if (metaCreated) {
      metaCreated.textContent = createdLabel + ' ' + formatDate(new Date(currentMetadata.created));
    }
    if (metaModified) {
      metaModified.textContent = modifiedLabel + ' ' + formatDate(new Date(currentMetadata.modified));
    }
  }

  function formatDate(d) {
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear();
    var time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return day + '/' + month + '/' + year + ' ' + time;
  }

  function toggleMetadataPanel() {
    if (!metadataPanel) return;
    if (metadataPanel.style.display === 'none' || !metadataPanel.style.display) {
      metadataPanel.style.display = 'flex';
      if (metaTitle) metaTitle.value = currentMetadata.title || '';
      if (metaAuthor) metaAuthor.value = currentMetadata.author || '';
      if (metaTags) metaTags.value = currentMetadata.tags || '';
      if (metaCategory) metaCategory.value = currentMetadata.category || '';
      renderMetaDates();
    } else {
      saveCurrentTabMetadata(false);
      metadataPanel.style.display = 'none';
    }
  }

  function setupMetadataHandlers() {
    var inputs = [metaTitle, metaAuthor, metaTags, metaCategory];
    for (var i = 0; i < inputs.length; i++) {
      (function(input) {
        if (!input) return;
        input.addEventListener('blur', function() { saveCurrentTabMetadata(true); });
      })(inputs[i]);
    }
  }

  // ============================================
  // STATS
  // ============================================

  function updateStats() {
    if (!richEditor) return;
    var text = getTextContent();
    var chars = text.length;
    var charsNoSpaces = text.replace(/\s/g, '').length;
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    var sentences = text.split(/[.!?…]+(?:\s|$)/).filter(function(s) {
      return s.trim().length > 0;
    }).length;
    var readMin = Math.ceil(words / 225) || 0;
    var speakMin = Math.ceil(words / 170) || 0;

    if (statsDefaultEl) {
      var arrow = statsExpanded ? ' ▲' : ' ▼';
      statsDefaultEl.textContent = formatNumber(words) + ' ' + getTrans('text_words') +
        ' · ' + formatNumber(chars) + ' ' + getTrans('text_chars') + arrow;
    }

    if (statsDetailed) {
      var t = function(k) { return getTrans(k); };
      statsDetailed.innerHTML =
        '<div class="stat-row"><span>' + t('stats_chars_with_spaces') + '</span><span>' + chars.toLocaleString() + '</span></div>' +
        '<div class="stat-row"><span>' + t('stats_chars_no_spaces') + '</span><span>' + charsNoSpaces.toLocaleString() + '</span></div>' +
        '<div class="stat-row"><span>' + t('stats_sentences') + '</span><span>' + sentences + '</span></div>' +
        '<div class="stat-row"><span>' + t('stats_reading_time') + '</span><span>' + readMin + ' ' + t('stats_min') + '</span></div>' +
        '<div class="stat-row"><span>' + t('stats_speaking_time') + '</span><span>' + speakMin + ' ' + t('stats_min') + '</span></div>';
    }
  }

  // ============================================
  // GOAL TRACKER — FIX #7: clearGoal respects hideStats
  // ============================================

  function getParagraphCount() {
    var text = richEditor.innerText.trim();
    if (!text) return 0;
    return text.split(/\n/).filter(function(l) { return l.trim(); }).length;
  }

  function getGoalCount() {
    var text = getTextContent();
    if (goalUnit === 'words') return text.trim().split(/\s+/).filter(Boolean).length;
    if (goalUnit === 'chars') return text.length;
    return getParagraphCount();
  }

  function getGoalUnitLabel() {
    if (goalUnit === 'words') return getTrans('text_words');
    if (goalUnit === 'chars') return getTrans('text_chars');
    return getTrans('text_paras');
  }

  function updateGoalProgress() {
    if (!goalTarget || !statsGoalEl || !statsDefaultEl) return;
    var count = getGoalCount();
    var pct = Math.min(100, Math.round((count / goalTarget) * 100));
    statsGoalEl.textContent = formatNumber(count) + ' / ' + formatNumber(goalTarget) +
      ' ' + getGoalUnitLabel() + ' · ' + pct + '%';
    if (count >= goalTarget && !goalReachedShown) {
      goalReachedShown = true;
      var msg = getTrans('text_goal_reached');
      if (goalLockEnabled) {
        msg += ' ' + getTrans('text_goal_locked');
        triggerGoalLock();
      }
      showToast(msg);
    } else if (count < goalTarget) {
      goalLockTriggered = false;
      goalReachedShown = false;
    }
  }

  function toggleGoalBar() {
    if (!goalBar) return;
    if (goalBar.style.display === 'flex') {
      goalBar.style.display = 'none';
    } else {
      goalBar.style.display = 'flex';
      if (goalTarget) goalTargetInput.value = goalTarget;
      goalUnitSelect.value = goalUnit;
      goalLockCheckbox.checked = goalLockEnabled;
      goalTargetInput.focus();
    }
  }

  function setGoal() {
    var target = parseInt(goalTargetInput.value);
    if (!target || target < 1) return;
    goalTarget = target;
    goalUnit = goalUnitSelect.value;
    goalLockEnabled = goalLockCheckbox.checked;
    goalReachedShown = false;
    goalLockTriggered = false;
    richEditor.contentEditable = 'true';
    localStorage.setItem('oros_goal_target', target.toString());
    localStorage.setItem('oros_goal_unit', goalUnit);
    localStorage.setItem('oros_goal_lock', goalLockEnabled ? 'true' : 'false');
    if (statsDefaultEl) statsDefaultEl.style.display = 'none';
    if (statsGoalEl) statsGoalEl.style.display = '';
    updateGoalProgress();
    goalBar.style.display = 'none';
    showToast(getTrans('text_goal_set') + ': ' + goalTarget + ' ' + getGoalUnitLabel());
  }

  function clearGoal() {
    goalTarget = null;
    goalUnit = 'words';
    goalLockEnabled = false;
    goalReachedShown = false;
    goalLockTriggered = false;
    richEditor.contentEditable = 'true';
    localStorage.removeItem('oros_goal_target');
    localStorage.removeItem('oros_goal_unit');
    localStorage.removeItem('oros_goal_lock');
    // FIX #7: Respect hideStats setting instead of blindly restoring display
    var hideStats = localStorage.getItem('oros_hide_stats') === 'true';
    if (statsDefaultEl) statsDefaultEl.style.display = hideStats ? 'none' : '';
    if (statsGoalEl) statsGoalEl.style.display = 'none';
    goalBar.style.display = 'none';
    goalTargetInput.value = '';
    goalLockCheckbox.checked = false;
    showToast(getTrans('text_goal_cleared'));
  }

  function triggerGoalLock() {
    if (!goalLockEnabled || goalLockTriggered) return;
    goalLockTriggered = true;
    richEditor.contentEditable = 'false';
  }

  // ============================================
  // DOCUMENT OUTLINE
  // ============================================

  function toggleOutline() {
    if (!outlinePanel) return;
    if (outlinePanel.style.display === 'none' || !outlinePanel.style.display) {
      outlinePanel.style.display = 'flex';
      updateOutline();
    } else {
      outlinePanel.style.display = 'none';
    }
  }

  function updateOutline() {
    if (!outlineList || !outlinePanel || outlinePanel.style.display === 'none') return;
    var headings = richEditor.querySelectorAll('h1, h2, h3');
    if (headings.length === 0) {
      outlineList.innerHTML = '<div class="outline-empty">' + getTrans('outline_empty') + '</div>';
      return;
    }
    outlineList.innerHTML = '';
    for (var i = 0; i < headings.length; i++) {
      (function(h) {
        var item = document.createElement('div');
        item.className = 'outline-item outline-item-' + h.tagName.toLowerCase();
        item.textContent = h.textContent || '(empty)';
        item.onclick = function() {
          h.scrollIntoView({ behavior: 'smooth', block: 'center' });
          h.classList.add('outline-flash');
          setTimeout(function() { h.classList.remove('outline-flash'); }, 1200);
          richEditor.focus();
        };
        outlineList.appendChild(item);
      })(headings[i]);
    }
  }

  // ============================================
  // READING PROGRESS
  // ============================================

  var readingProgressEnabled = localStorage.getItem('oros_reading_progress') !== 'false';

  function updateReadingProgress() {
    if (!progressBar) return;
    if (readingProgressEnabled) {
      progressBar.style.display = '';
      var max = richEditor.scrollHeight - richEditor.clientHeight;
      if (max <= 0) { progressBar.style.width = '0%'; return; }
      var pct = (richEditor.scrollTop / max) * 100;
      progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    } else {
      progressBar.style.display = 'none';
    }
  }

  window.addEventListener('oros-reading-progress-changed', function(e) {
    readingProgressEnabled = e.detail.enabled;
    updateReadingProgress();
  });

  // ============================================
  // SMART TYPOGRAPHY
  // ============================================

  var smartTypographyEnabled = localStorage.getItem('oros_smart_typography') !== 'false';
  var isReplacing = false;

  function handleSmartTypography() {
    if (!smartTypographyEnabled || isReplacing || goalLockTriggered) return;
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    if (!range.collapsed) return;
    if (!richEditor.contains(range.endContainer)) return;
    var preRange = range.cloneRange();
    preRange.selectNodeContents(richEditor);
    preRange.setEnd(range.endContainer, range.endOffset);
    var before = preRange.toString();
    if (!before) return;
    var deleteLen = 0;
    var insert = '';
    var last4 = before.slice(-4);
    var last3 = before.slice(-3);
    var last2 = before.slice(-2);
    var last1 = before.slice(-1);
    if (last4 === '(tm)') { deleteLen = 4; insert = '\u2122'; }
    else if (last3 === '(c)') { deleteLen = 3; insert = '\u00A9'; }
    else if (last3 === '(r)') { deleteLen = 3; insert = '\u00AE'; }
    else if (last3 === '...') { deleteLen = 3; insert = '\u2026'; }
    else if (last2 === '--') { deleteLen = 2; insert = '\u2014'; }
    else if (last1 === '"') {
      var pc = before.length > 1 ? before[before.length - 2] : ' ';
      insert = /\w/.test(pc) ? '\u201D' : '\u201C';
      deleteLen = 1;
    }
    else if (last1 === "'") {
      var pc2 = before.length > 1 ? before[before.length - 2] : ' ';
      insert = /\w/.test(pc2) ? '\u2019' : '\u2018';
      deleteLen = 1;
    }
    else return;
    isReplacing = true;
    for (var i = 0; i < deleteLen; i++) { document.execCommand('delete', false); }
    document.execCommand('insertText', false, insert);
    isReplacing = false;
  }

  window.addEventListener('oros-smart-typography-changed', function(e) {
    smartTypographyEnabled = e.detail.enabled;
  });

  // ============================================
  // SMART PASTE
  // ============================================

  function handleSmartPaste(e) {
    e.preventDefault();
    var clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;
    var html = clipboardData.getData('text/html');
    var text = clipboardData.getData('text/plain');
    if (html) {
      var temp = document.createElement('div');
      temp.innerHTML = html;
      var allowed = ['P','H1','H2','H3','H4','H5','H6','UL','OL','LI','STRONG','EM','B','I','U','A','CODE','PRE','BLOCKQUOTE','BR','SPAN'];
      var all = temp.querySelectorAll('*');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (allowed.indexOf(el.tagName) === -1) {
          var txt = document.createTextNode(el.textContent + ' ');
          el.parentNode.replaceChild(txt, el);
        } else {
          while (el.attributes.length > 0) {
            var attr = el.attributes[0];
            if (!(el.tagName === 'A' && attr.name === 'href')) {
              el.removeAttribute(attr.name);
            }
          }
        }
      }
      document.execCommand('insertHTML', false, temp.innerHTML);
    } else if (text) {
      document.execCommand('insertText', false, text);
    }
    saveCurrentTabContent();
    updateStats();
  }
  
    // ============================================
  // NEW FEATURES: LINK, TABLE, IMAGE, HR
  // ============================================

  function toggleLinkDialog() {
    if (!linkDialog) return;
    if (linkDialog.style.display === 'none' || !linkDialog.style.display) {
      var selectedText = window.getSelection().toString();
      var linkUrl = document.getElementById('link-url');
      var linkTextEl = document.getElementById('link-text');
      linkUrl.value = '';
      linkTextEl.value = selectedText;
      linkDialog.style.display = 'flex';
    } else {
      linkDialog.style.display = 'none';
    }
  }

  function insertLink() {
    var url = document.getElementById('link-url').value;
    var text = document.getElementById('link-text').value || document.getElementById('link-url').value;
    if (!url) { linkDialog.style.display = 'none'; return; }
    var html = '<a href="' + escapeHtml(url) + '">' + escapeHtml(text) + '</a>';
    document.execCommand('insertHTML', false, html);
    linkDialog.style.display = 'none';
    saveCurrentTabContent();
    updateStats();
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function toggleTableDialog() {
    if (!tableDialog) return;
    if (tableDialog.style.display === 'none' || !tableDialog.style.display) {
      tableDialog.style.display = 'flex';
    } else {
      tableDialog.style.display = 'none';
    }
  }

  function insertTable() {
    var rows = parseInt(document.getElementById('table-rows').value) || 3;
    var cols = parseInt(document.getElementById('table-cols').value) || 3;
    var tableHtml = '<table class="custom-table"><tbody>';
    for (var r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (var c = 0; c < cols; c++) {
        tableHtml += '<td>&nbsp;</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p>&nbsp;</p>';
    document.execCommand('insertHTML', false, tableHtml);
    tableDialog.style.display = 'none';
    saveCurrentTabContent();
    updateStats();
  }

  function toggleImageDialog() {
    if (!imageDialog) return;
    if (imageDialog.style.display === 'none' || !imageDialog.style.display) {
      document.getElementById('image-source-type').value = 'upload';
      document.getElementById('image-upload-field').style.display = '';
      document.getElementById('image-url-field').style.display = 'none';
      imageDialog.style.display = 'flex';
    } else {
      imageDialog.style.display = 'none';
    }
  }

  // FIX #10: Use class instead of inline styles
  function insertImageFromUpload(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var imgHtml = '<p><img src="' + e.target.result + '" class="editor-image" /></p>';
      document.execCommand('insertHTML', false, imgHtml);
      saveCurrentTabContent();
      updateStats();
    };
    reader.onerror = function() { showToast('Error loading image'); };
    reader.readAsDataURL(file);
  }

  // FIX #10: Use class instead of inline styles
  function insertImageUrl(url) {
    var imgHtml = '<p><img src="' + escapeHtml(url) + '" class="editor-image" /></p>';
    document.execCommand('insertHTML', false, imgHtml);
    saveCurrentTabContent();
    updateStats();
  }

  function handleImageInsert() {
    var sourceType = document.getElementById('image-source-type').value;
    if (sourceType === 'upload') {
      var imgFileInput = document.getElementById('image-file');
      if (imgFileInput.files && imgFileInput.files[0]) {
        insertImageFromUpload(imgFileInput.files[0]);
      }
    } else {
      var url = document.getElementById('image-url').value;
      if (url) insertImageUrl(url);
    }
    imageDialog.style.display = 'none';
  }

  // ============================================
  // WORD FREQUENCY
  // ============================================

  function toggleWordFreqPanel() {
    if (!wordFreqPanel) return;
    if (wordFreqPanel.style.display === 'none' || !wordFreqPanel.style.display) {
      wordFreqPanel.style.display = 'flex';
      updateWordFrequency();
    } else {
      wordFreqPanel.style.display = 'none';
    }
  }

  function updateWordFrequency() {
    if (!wordFreqList || !wordFreqPanel || wordFreqPanel.style.display === 'none' || !richEditor) return;
    var text = getTextContent().toLowerCase().replace(/[^\w\s\u0370-\u03FF]/g, '').trim();
    if (!text) {
      wordFreqList.innerHTML = '<div class="wordfreq-empty">' + getTrans('word_freq_empty') + '</div>';
      if (wordFreqSummary) wordFreqSummary.innerHTML = '';
      return;
    }
    var words = text.split(/\s+/).filter(Boolean);
    var total = words.length;
    var freq_map = {};
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      freq_map[w] = (freq_map[w] || 0) + 1;
    }
    var unique = Object.keys(freq_map).length;
    var diversity = total > 0 ? (unique / total * 100).toFixed(1) : 0;
    var sorted = Object.keys(freq_map).sort(function(a,b) {
      return freq_map[b] - freq_map[a];
    }).slice(0, 20);
    var maxFreq = sorted.length > 0 ? freq_map[sorted[0]] : 1;

    if (wordFreqSummary) {
      wordFreqSummary.innerHTML =
        '<div class="stat-row"><span>' + getTrans('word_freq_unique') + '</span><span>' + unique + '</span></div>' +
        '<div class="stat-row"><span>' + getTrans('word_freq_total') + '</span><span>' + total + '</span></div>' +
        '<div class="stat-row"><span>' + getTrans('word_freq_diversity') + '</span><span>' + diversity + '%</span></div>';
    }

    var listHtml = '';
    for (var j = 0; j < sorted.length; j++) {
      var word = sorted[j];
      var count = freq_map[word];
      var pct = (count / maxFreq * 100).toFixed(0);
      var isOverused = count >= 5 && (count / total * 100) > 2;
      listHtml += '<div class="wordfreq-item' + (isOverused ? ' overused' : '') + '">' +
        '<span class="wf-word">' + word + '</span>' +
        '<div class="wordfreq-bar"><div class="wordfreq-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="wordfreq-count">' + count + '</span>' +
      '</div>';
    }
    wordFreqList.innerHTML = listHtml;
  }

  // ============================================
  // FIND & REPLACE — SAFE IMPLEMENTATION
  // Fix #1: frResults declared variable
  // Fix #2: Replace All uses reverse-order to avoid infinite loops
  // ============================================

  function clearHighlights() {
    var marks = richEditor.querySelectorAll('mark.find-match');
    for (var i = 0; i < marks.length; i++) {
      var parent = marks[i].parentNode;
      parent.insertBefore(document.createTextNode(marks[i].textContent), marks[i]);
      parent.removeChild(marks[i]);
      parent.normalize();
    }
    matchMarks = [];
    currentMatchIndex = -1;
  }

  function highlightMatches() {
    if (!findInput || !richEditor) return;
    clearHighlights();

    var searchTerm = findInput.value;
    if (!searchTerm) {
      if (frResults) frResults.textContent = getTrans('fr_no_matches');
      return;
    }

    var walker = document.createTreeWalker(richEditor, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        if (!node.nodeValue || !node.nodeValue.toLowerCase().includes(searchTerm.toLowerCase())) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }, false);

    var nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    if (nodes.length === 0) {
      if (frResults) frResults.textContent = getTrans('fr_no_matches');
      return;
    }

    var allMatches = [];
    for (var n = 0; n < nodes.length; n++) {
      var text = nodes[n].nodeValue;
      var idx = -1;
      while ((idx = text.toLowerCase().indexOf(searchTerm.toLowerCase(), idx + 1)) !== -1) {
        allMatches.push({ node: nodes[n], start: idx, end: idx + searchTerm.length });
      }
    }

    if (allMatches.length === 0) {
      if (frResults) frResults.textContent = getTrans('fr_no_matches');
      return;
    }

    for (var m = 0; m < allMatches.length; m++) {
      var match = allMatches[m];
      var node = match.node;
      var beforeText = node.nodeValue.substring(0, match.start);
      var matchText = node.nodeValue.substring(match.start, match.end);
      var afterText = node.nodeValue.substring(match.end);

      var beforeNode = document.createTextNode(beforeText);
      var mark = document.createElement('mark');
      mark.className = 'find-match';
      mark.textContent = matchText;
      var afterNode = document.createTextNode(afterText);

      node.parentNode.insertBefore(beforeNode, node);
      node.parentNode.insertBefore(mark, node);
      node.parentNode.insertBefore(afterNode, node);
      node.parentNode.removeChild(node);

      matchMarks.push(mark);
    }

    if (frResults) {
      frResults.textContent = matchMarks.length + ' ' + getTrans('fr_results_matches');
    }

    if (matchMarks.length > 0) {
      currentMatchIndex = 0;
      navigateMatchToMark(0);
    }
  }

  function navigateMatchToMark(index) {
    if (index < 0 || index >= matchMarks.length) return;

    var prev = matchMarks[currentMatchIndex];
    if (prev && prev !== matchMarks[index]) {
      prev.classList.remove('current');
    }

    currentMatchIndex = index;
    var mark = matchMarks[index];
    mark.classList.add('current');

    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (frResults) {
      frResults.textContent = (index + 1) + '/' + matchMarks.length + ' ' + getTrans('fr_results_matches');
    }
  }

  function navigateMatch(direction) {
    if (matchMarks.length === 0) return;
    var newIndex = currentMatchIndex + direction;
    if (newIndex < 0) newIndex = matchMarks.length - 1;
    if (newIndex >= matchMarks.length) newIndex = 0;
    navigateMatchToMark(newIndex);
  }

  function doReplace(isAll) {
    if (!findInput || !replaceInput || !richEditor) return;
    var searchTerm = findInput.value;
    var replaceTerm = replaceInput.value;
    if (!searchTerm) return;

    if (isAll) {
      // FIX #2: Collect all matches first, then replace from end to start
      var walker = document.createTreeWalker(richEditor, NodeFilter.SHOW_TEXT, null, false);
      var allMatches = [];

      while (walker.nextNode()) {
        var node = walker.currentNode;
        var text = node.nodeValue;
        var searchLower = searchTerm.toLowerCase();
        var pos = 0;
        while ((pos = text.toLowerCase().indexOf(searchLower, pos)) !== -1) {
          allMatches.push({
            node: node,
            start: pos,
            end: pos + searchTerm.length
          });
          pos += searchTerm.length;
        }
      }

      var matchesByNode = {};
      for (var i = 0; i < allMatches.length; i++) {
        var m = allMatches[i];
        if (!matchesByNode[m.node]) matchesByNode[m.node] = [];
        matchesByNode[m.node].push(m);
      }

      var orderedNodes = [];
      var walker2 = document.createTreeWalker(richEditor, NodeFilter.SHOW_TEXT, null, false);
      while (walker2.nextNode()) {
        orderedNodes.push(walker2.currentNode);
      }

      for (var n = orderedNodes.length - 1; n >= 0; n--) {
        var currentNode = orderedNodes[n];
        var nodeMatches = matchesByNode[currentNode];
        if (!nodeMatches || nodeMatches.length === 0) continue;

        nodeMatches.sort(function(a, b) { return b.start - a.start; });

        for (var mi = 0; mi < nodeMatches.length; mi++) {
          var match = nodeMatches[mi];
          var text = currentNode.nodeValue;
          var before = text.substring(0, match.start);
          var after = text.substring(match.end);
          currentNode.nodeValue = before + replaceTerm + after;
        }
      }
    } else {
      var currentMark = matchMarks[currentMatchIndex];
      if (currentMark) {
        var textNode = document.createTextNode(replaceTerm);
        currentMark.parentNode.replaceChild(textNode, currentMark);
        clearHighlights();
      }
    }

    saveCurrentTabContent();
    updateStats();
    showToast(getTrans('text_saved'));
    highlightMatches();
  }

  function toggleFindBar() {
    if (!findBar || !findInput) return;
    if (findBar.style.display === 'flex') {
      findBar.style.display = 'none';
      clearHighlights();
      if (findInput) findInput.value = '';
      if (replaceInput) replaceInput.value = '';
      currentMatchIndex = -1;
    } else {
      findBar.style.display = 'flex';
      findInput.focus();
      highlightMatches();
    }
  }

  // ============================================
  // FILE OPEN (TXT, MD, RTF, DOCX) — .doc BLOCKED
  // ============================================

  function openFile(file) {
    var extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'doc') {
      showToast(getTrans('format_not_supported') || 'Format not supported: .doc');
      return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
      var content = e.target.result;
      if (extension === 'docx' && typeof mammoth !== 'undefined') {
        mammoth.convertToHtml({arrayBuffer: e.target.result}).then(function(result) {
          richEditor.innerHTML = result.value;
          saveCurrentTabContent();
          updateStats();
          updateGoalProgress();
          showToast(getTrans('toast_opened'));
        }).catch(function(err) {
          console.error('DOCX conversion error:', err);
          showToast('Error converting DOCX');
        });
      } else if (extension === 'rtf' && typeof parseRTF !== 'undefined') {
        try {
          var html = parseRTF(content);
          richEditor.innerHTML = html;
          saveCurrentTabContent();
          updateStats();
          updateGoalProgress();
          showToast(getTrans('toast_opened'));
        } catch(err) {
          console.error('RTF parsing error:', err);
          richEditor.innerHTML = content.replace(/\n/g, '<br>');
          saveCurrentTabContent();
          updateStats();
          updateGoalProgress();
          showToast(getTrans('toast_opened'));
        }
      } else {
        richEditor.innerHTML = content.replace(/\n/g, '<br>');
        saveCurrentTabContent();
        updateStats();
        updateGoalProgress();
        showToast(getTrans('toast_opened'));
      }
    };
    reader.onerror = function() { showToast('Error reading file'); };

    if (extension === 'docx' && typeof mammoth !== 'undefined') {
      reader.readAsArrayBuffer(file);
    } else if (extension === 'rtf' && typeof parseRTF !== 'undefined') {
      reader.readAsText(file);
    } else {
      reader.readAsText(file);
    }
  }
  
    // ============================================
  // EXPORT (MD, TXT, RTF, PDF, DOCX)
  // Fix #4: Real DOCX export with JSZip + image support
  // Fix #5: RTF export with basic formatting
  // Fix #11: Full Markdown export (hr, img, table, del, sub, sup, mark)
  // ============================================

  function downloadFile(format) {
    var content = richEditor.innerHTML;
    var textContent = richEditor.innerText;
    var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    var filenamePrefix = timestamp;
    var ext = '';
    var mime = 'text/plain;charset=utf-8';
    var data = '';

    switch (format) {
      case 'md':
        data = convertHTMLtoMarkdown(content);
        ext = '.md';
        mime = 'text/markdown;charset=utf-8';
        break;
      case 'txt':
        data = textContent;
        ext = '.txt';
        break;
      case 'rtf':
        data = convertToRTF(content);
        ext = '.rtf';
        mime = 'application/rtf;charset=utf-8';
        break;
      case 'pdf':
        window.print();
        return;
      case 'docx':
        if (typeof JSZip === 'undefined') {
          showToast('JSZip library not loaded. Cannot export DOCX.');
          return;
        }
        var docxResult = buildDocxBlob(content);
        if (docxResult) {
          docxResult.blob.then(function(blob) {
            triggerDownload(blob, filenamePrefix + '.docx');
            showToast(getTrans('toast_downloaded'));
          }).catch(function(err) {
            console.error('DOCX generation error:', err);
            showToast('DOCX export failed');
          });
        } else {
          showToast('DOCX export failed');
        }
        return;
    }

    var blob = new Blob([data], { type: mime });
    triggerDownload(blob, filenamePrefix + ext);
    showToast(getTrans('toast_downloaded'));
  }

  // ============================================
  // DOCX EXPORT — HTML → OOXML CONVERSION
  // ============================================

  function convertHTMLtoDocx(html) {
    var temp = document.createElement('div');
    temp.innerHTML = html;

    var relationships = [];
    var relIdCounter = 0;
    var numberingDefs = [];

    function escapeXml(str) {
      return str.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
    }

    function cloneFmt(fmt) {
      return {
        bold: fmt.bold || false,
        italic: fmt.italic || false,
        underline: fmt.underline || false,
        strike: fmt.strike || false,
        subscript: fmt.subscript || false,
        superscript: fmt.superscript || false,
        code: fmt.code || false,
        link: fmt.link || false
      };
    }

    function buildRunProps(fmt) {
      var props = '';
      if (fmt.bold) props += '<w:b/>';
      if (fmt.italic) props += '<w:i/>';
      if (fmt.underline) props += '<w:u w:val="single"/>';
      if (fmt.strike) props += '<w:strike/>';
      if (fmt.subscript) props += '<w:vertAlign w:val="subscript"/>';
      if (fmt.superscript) props += '<w:vertAlign w:val="superscript"/>';
      if (fmt.code) props += '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>';
      if (fmt.link) {
        props += '<w:rStyle w:val="Hyperlink"/>';
        if (!fmt.underline) props += '<w:u w:val="single"/>';
      }
      if (props) return '<w:rPr>' + props + '</w:rPr>';
      return '';
    }

    function processInline(node, fmt) {
      var runs = '';
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (child.nodeType === 3) {
          var text = child.nodeValue;
          if (text) {
            runs += '<w:r>' + buildRunProps(fmt) +
              '<w:t xml:space="preserve">' + escapeXml(text) + '</w:t></w:r>';
          }
        } else if (child.nodeType === 1) {
          var tag = child.tagName.toLowerCase();
          var newFmt = cloneFmt(fmt);

          switch (tag) {
            case 'strong': case 'b':
              newFmt.bold = true;
              break;
            case 'em': case 'i':
              newFmt.italic = true;
              break;
            case 'u':
              newFmt.underline = true;
              break;
            case 's': case 'del': case 'strike':
              newFmt.strike = true;
              break;
            case 'sub':
              newFmt.subscript = true;
              break;
            case 'sup':
              newFmt.superscript = true;
              break;
            case 'code':
              newFmt.code = true;
              break;
            case 'br':
              runs += '<w:r><w:br/></w:r>';
              continue;
            case 'a':
              var href = child.getAttribute('href') || '';
              var linkRelId = 'rId' + (++relIdCounter);
              newFmt.link = true;
              var linkRuns = processInline(child, newFmt);
              runs += '<w:hyperlink r:id="' + linkRelId + '">' + linkRuns + '</w:hyperlink>';
              relationships.push({ type: 'link', relId: linkRelId, target: href });
              continue;
            case 'span':
              break;
            case 'img':
              var src = child.getAttribute('src') || '';
              var w = child.naturalWidth || child.width || 600;
              var h = child.naturalHeight || child.height || 400;
              var imgRelId = 'rId' + (++relIdCounter);
              var displayW = Math.min(w, 600);
              var ratio = w > 0 ? displayW / w : 1;
              var displayH = Math.round(h * ratio);
              var emuW = displayW * 9525;
              var emuH = displayH * 9525;
              runs += '<w:r><w:drawing>' +
                '<wp:inline distT="0" distB="0" distL="0" distR="0">' +
                '<wp:extent cx="' + emuW + '" cy="' + emuH + '"/>' +
                '<wp:effectExtent l="0" t="0" r="0" b="0"/>' +
                '<wp:docPr id="' + relIdCounter + '" name="Image ' + relIdCounter + '"/>' +
                '<a:graphic>' +
                '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
                '<pic:pic>' +
                '<pic:nvPicPr>' +
                '<pic:cNvPr id="' + relIdCounter + '" name="Image ' + relIdCounter + '"/>' +
                '<pic:cNvPicPr/>' +
                '</pic:nvPicPr>' +
                '<pic:blipFill>' +
                '<a:blip r:embed="' + imgRelId + '"/>' +
                '<a:stretch><a:fillRect/></a:stretch>' +
                '</pic:blipFill>' +
                '<pic:spPr>' +
                '<a:xfrm><a:off x="0" y="0"/><a:ext cx="' + emuW + '" cy="' + emuH + '"/></a:xfrm>' +
                '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' +
                '</pic:spPr>' +
                '</pic:pic>' +
                '</a:graphicData>' +
                '</a:graphic>' +
                '</wp:inline>' +
                '</w:drawing></w:r>';
              relationships.push({ type: 'image', relId: imgRelId, src: src, width: w, height: h });
              continue;
            default:
              break;
          }
          runs += processInline(child, newFmt);
        }
      }
      return runs;
    }

    function processList(listNode, type, levelNum) {
      var xml = '';
      var numId = numberingDefs.length + 1;
      if (type === 'bullet') {
        numberingDefs.push({ numId: numId, format: 'bullet', text: '\u2022' });
      } else {
        numberingDefs.push({ numId: numId, format: 'decimal', text: '%1.' });
      }
      var items = listNode.children;
      for (var i = 0; i < items.length; i++) {
        var li = items[i];
        if (li.tagName.toLowerCase() !== 'li') continue;
        var tempLi = document.createElement('div');
        for (var k = 0; k < li.childNodes.length; k++) {
          var lc = li.childNodes[k];
          if (lc.nodeType === 1) {
            var lct = lc.tagName.toLowerCase();
            if (lct !== 'ul' && lct !== 'ol') tempLi.appendChild(lc.cloneNode(true));
          } else if (lc.nodeType === 3) {
            tempLi.appendChild(lc.cloneNode(true));
          }
        }
        var liContent = processInline(tempLi, {});
        xml += '<w:p><w:pPr><w:numPr><w:ilvl w:val="' + levelNum + '"/><w:numId w:val="' + numId + '"/></w:numPr>' +
          '<w:ind w:left="' + (720 + levelNum * 360) + '" w:hanging="360"/></w:pPr>' + liContent + '</w:p>';
        for (var m = 0; m < li.children.length; m++) {
          var nested = li.children[m];
          var ntag = nested.tagName.toLowerCase();
          if (ntag === 'ul') xml += processList(nested, 'bullet', levelNum + 1);
          else if (ntag === 'ol') xml += processList(nested, 'decimal', levelNum + 1);
        }
      }
      return xml;
    }

    function processTable(tableNode) {
      var xml = '<w:tbl>';
      xml += '<w:tblPr>' +
        '<w:tblW w:w="5000" w:type="pct"/>' +
        '<w:tblBorders>' +
        '<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
        '</w:tblBorders>' +
        '</w:tblPr>';

      var tbody = tableNode.querySelector(':scope > tbody') || tableNode;
      var rows = tbody.querySelectorAll(':scope > tr');
      if (rows.length === 0) rows = tableNode.querySelectorAll('tr');

      for (var r = 0; r < rows.length; r++) {
        xml += '<w:tr>';
        var cells = rows[r].children;
        for (var c = 0; c < cells.length; c++) {
          var cell = cells[c];
          var ctag = cell.tagName.toLowerCase();
          if (ctag !== 'td' && ctag !== 'th') continue;
          var cellFmt = ctag === 'th' ? { bold: true } : {};
          xml += '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>';
          var cellContent = processInline(cell, cellFmt);
          xml += '<w:p>' + (cellContent || '<w:r><w:t></w:t></w:r>') + '</w:p>';
          xml += '</w:tc>';
        }
        xml += '</w:tr>';
      }
      xml += '</w:tbl><w:p/>';
      return xml;
    }

    function processBlocks(node) {
      var xml = '';
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (child.nodeType !== 1) {
          if (child.nodeType === 3 && child.nodeValue.trim()) {
            xml += '<w:p><w:r><w:t xml:space="preserve">' + escapeXml(child.nodeValue) + '</w:t></w:r></w:p>';
          }
          continue;
        }
        var tag = child.tagName.toLowerCase();

        switch (tag) {
          case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
            var hLevel = tag.charAt(1);
            xml += '<w:p><w:pPr><w:pStyle w:val="Heading' + hLevel + '"/></w:pPr>' +
              processInline(child, {}) + '</w:p>';
            break;
          case 'p':
            xml += '<w:p>' + processInline(child, {}) + '</w:p>';
            break;
          case 'blockquote':
            xml += '<w:p><w:pPr><w:ind w:left="720" w:right="720"/><w:spacing w:after="240"/></w:pPr>' +
              processInline(child, { italic: true }) + '</w:p>';
            break;
          case 'ul':
            xml += processList(child, 'bullet', 0);
            break;
          case 'ol':
            xml += processList(child, 'decimal', 0);
            break;
          case 'li':
            xml += '<w:p>' + processInline(child, {}) + '</w:p>';
            break;
          case 'pre':
            var codeText = child.textContent || '';
            xml += '<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F0F0F0"/><w:spacing w:after="120"/></w:pPr>' +
              '<w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:sz w:val="20"/></w:rPr>' +
              '<w:t xml:space="preserve">' + escapeXml(codeText) + '</w:t></w:r></w:p>';
            break;
          case 'hr':
            xml += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr/></w:pPr></w:p>';
            break;
          case 'table':
            xml += processTable(child);
            break;
          case 'br':
            xml += '<w:p><w:r><w:br/></w:r></w:p>';
            break;
          case 'div':
            xml += processBlocks(child);
            break;
          case 'img':
            xml += '<w:p>' + processInline(child, {}) + '</w:p>';
            break;
          default:
            xml += processBlocks(child);
            break;
        }
      }
      return xml;
    }

    var bodyXml = processBlocks(temp);

    return {
      bodyXml: bodyXml,
      relationships: relationships,
      numberingDefs: numberingDefs
    };
  }

  // ============================================
  // DOCX — BUILD ZIP BLOB
  // ============================================

  function buildDocxBlob(html) {
    try {
      var result = convertHTMLtoDocx(html);
      var zip = new JSZip();

      var mediaFolder = zip.folder('word/media');
      var imageExtensions = {};

      for (var i = 0; i < result.relationships.length; i++) {
        var rel = result.relationships[i];
        if (rel.type === 'image') {
          var base64Data = '';
          var ext = 'png';

          if (rel.src.indexOf('data:') === 0) {
            var commaIdx = rel.src.indexOf(',');
            var header = rel.src.substring(0, commaIdx);
            base64Data = rel.src.substring(commaIdx + 1);

            var mimeMatch = header.match(/data:image\/(\w+)/);
            if (mimeMatch) {
              ext = mimeMatch[1] === 'jpeg' ? 'jpg' : mimeMatch[1];
            }
          } else {
            continue;
          }

          var imageName = 'image' + (i + 1) + '.' + ext;
          imageExtensions[rel.relId] = ext;
          mediaFolder.file(imageName, base64Data, { base64: true });
          rel.mediaFile = 'media/' + imageName;
        }
      }

      // Build numbering.xml
      var numberingXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">';

      for (var n = 0; n < result.numberingDefs.length; n++) {
        var nd = result.numberingDefs[n];
        var abstractNumId = n;
        numberingXml +=
          '<w:abstractNum w:abstractNumId="' + abstractNumId + '">' +
            '<w:multiLevelType w:val="hybridMultilevel"/>';
        for (var lvl = 0; lvl < 3; lvl++) {
          numberingXml +=
            '<w:lvl w:ilvl="' + lvl + '">' +
              '<w:start w:val="1"/>' +
              '<w:numFmt w:val="' + (nd.format === 'bullet' ? 'bullet' : 'decimal') + '"/>' +
              '<w:lvlText w:val="' + (nd.format === 'bullet' ? '\u2022' : '%' + (lvl + 1) + '.') + '"/>' +
              '<w:lvlJc w:val="left"/>' +
              '<w:pPr><w:ind w:left="' + (720 + lvl * 360) + '" w:hanging="360"/></w:pPr>' +
            '</w:lvl>';
        }
        numberingXml += '</w:abstractNum>';
        numberingXml +=
          '<w:num w:numId="' + nd.numId + '">' +
            '<w:abstractNumId w:val="' + abstractNumId + '"/>' +
          '</w:num>';
      }
      numberingXml += '</w:numbering>';

      zip.file('word/numbering.xml', numberingXml);

      // Build document.xml
      var docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
        'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
        'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
        '<w:body>' + result.bodyXml +
        '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>' +
        '</w:body></w:document>';

      zip.file('word/document.xml', docXml);

      // Build document.xml.rels
      var relsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
      for (var r = 0; r < result.relationships.length; r++) {
        var relEntry = result.relationships[r];
        if (relEntry.type === 'link') {
          relsXml += '<Relationship Id="' + relEntry.relId + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' + escapeXml(relEntry.target) + '" TargetMode="External"/>';
        } else if (relEntry.type === 'image' && relEntry.mediaFile) {
          relsXml += '<Relationship Id="' + relEntry.relId + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="' + relEntry.mediaFile + '"/>';
        }
      }
      relsXml += '<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>';
      relsXml += '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
      relsXml += '</Relationships>';

      zip.file('word/_rels/document.xml.rels', relsXml);

      // Build styles.xml
      var stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>' +
        '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>' +
        '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="200" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>' +
        '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style>' +
        '<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:pPr><w:spacing w:before="120" w:after="60"/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>' +
        '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>' +
        '</w:styles>';

      zip.file('word/styles.xml', stylesXml);

      // Build [Content_Types].xml
      var contentTypesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>';

      var addedExts = {};
      for (var key in imageExtensions) {
        var imgExt = imageExtensions[key];
        if (!addedExts[imgExt]) {
          var ct = 'image/' + (imgExt === 'jpg' ? 'jpeg' : imgExt);
          contentTypesXml += '<Default Extension="' + imgExt + '" ContentType="' + ct + '"/>';
          addedExts[imgExt] = true;
        }
      }

      contentTypesXml +=
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
        '</Types>';

      zip.file('[Content_Types].xml', contentTypesXml);

      // Build _rels/.rels
      var rootRelsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>';

      zip.file('_rels/.rels', rootRelsXml);

      // Generate blob (async)
      var blobPromise = zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      return { blob: blobPromise };
    } catch(err) {
      console.error('DOCX build error:', err);
      return null;
    }
  }

  // ============================================
  // MARKDOWN EXPORT — FIX #11: Full element support
  // ============================================

  function convertHTMLtoMarkdown(html) {
    var temp = document.createElement('div');
    temp.innerHTML = html;
    return htmlToMd(temp);
  }

  function htmlToMd(node) {
    var md = '';
    var children = node.childNodes;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.nodeType === 3) {
        md += child.textContent;
      } else if (child.nodeType === 1) {
        var tag = child.tagName.toLowerCase();
        switch (tag) {
          case 'h1': md += '\n# ' + child.textContent + '\n\n'; break;
          case 'h2': md += '\n## ' + child.textContent + '\n\n'; break;
          case 'h3': md += '\n### ' + child.textContent + '\n\n'; break;
          case 'h4': md += '\n#### ' + child.textContent + '\n\n'; break;
          case 'h5': md += '\n##### ' + child.textContent + '\n\n'; break;
          case 'h6': md += '\n###### ' + child.textContent + '\n\n'; break;
          case 'p': md += '\n' + htmlToMd(child) + '\n\n'; break;
          case 'br': md += '  \n'; break;
          case 'strong': case 'b': md += '**' + htmlToMd(child) + '**'; break;
          case 'em': case 'i': md += '*' + htmlToMd(child) + '*'; break;
          case 'u': md += '__' + htmlToMd(child) + '__'; break;
          // FIX #11: Strikethrough support
          case 's': case 'del': case 'strike': md += '~~' + htmlToMd(child) + '~~'; break;
          // FIX #11: Subscript support
          case 'sub': md += '~' + htmlToMd(child) + '~'; break;
          // FIX #11: Superscript support
          case 'sup': md += '^' + htmlToMd(child) + '^'; break;
          // FIX #11: Mark/highlight support
          case 'mark': md += '==' + htmlToMd(child) + '=='; break;
          case 'code': md += '`' + child.textContent + '`'; break;
          case 'pre': md += '\n```\n' + child.textContent + '\n```\n\n'; break;
          case 'blockquote': md += '\n> ' + htmlToMd(child).replace(/\n/g, '\n> ') + '\n\n'; break;
          case 'ul':
            var ulItems = child.querySelectorAll(':scope > li');
            for (var j = 0; j < ulItems.length; j++) { md += '- ' + htmlToMd(ulItems[j]).trim() + '\n'; }
            md += '\n';
            break;
          case 'ol':
            var olItems = child.querySelectorAll(':scope > li');
            for (var k = 0; k < olItems.length; k++) { md += (k + 1) + '. ' + htmlToMd(olItems[k]).trim() + '\n'; }
            md += '\n';
            break;
          case 'li': md += htmlToMd(child); break;
          case 'a': md += '[' + child.textContent + '](' + (child.getAttribute('href') || '#') + ')'; break;
          // FIX #11: Image support
          case 'img': md += '![' + (child.getAttribute('alt') || '') + '](' + (child.getAttribute('src') || '') + ')'; break;
          // FIX #11: Horizontal rule support
          case 'hr': md += '\n---\n\n'; break;
          // FIX #11: Table support
          case 'table':
            var tblRows = child.querySelectorAll('tr');
            if (tblRows.length > 0) {
              var firstRow = tblRows[0];
              var headerCells = firstRow.querySelectorAll('th, td');
              md += '\n';
              for (var hc = 0; hc < headerCells.length; hc++) {
                md += '| ' + headerCells[hc].textContent + ' ';
              }
              md += '|\n';
              for (var hr = 0; hr < headerCells.length; hr++) { md += '| --- '; }
              md += '|\n';
              for (var tr = 1; tr < tblRows.length; tr++) {
                var cells = tblRows[tr].querySelectorAll('th, td');
                for (var tc = 0; tc < cells.length; tc++) {
                  md += '| ' + cells[tc].textContent + ' ';
                }
                md += '|\n';
              }
              md += '\n';
            }
            break;
          case 'span': md += child.textContent; break;
          case 'div': md += htmlToMd(child) + '\n'; break;
          default: md += child.textContent || ''; break;
        }
      }
    }
    return md;
  }

  // ============================================
  // RTF EXPORT — FIX #5: Basic formatting support
  // ============================================

  function convertToRTF(html) {
    var temp = document.createElement('div');
    temp.innerHTML = html;

    var rtfHeader = '{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033' +
      '{\\fonttbl{\\f0\\fnil\\fcharset0 Nunito;}{\\f1\\fnil\\fcharset0 Courier New;}}' +
      '{\\colortbl;\\red255\\green0\\blue0;\\red0\\green0\\blue255;}';

    function escapeRtf(str) {
      return str.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
    }

    function processInlineRtf(node, fmt) {
      var rtf = '';
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (child.nodeType === 3) {
          var text = escapeRtf(child.nodeValue);
          if (!text) continue;
          var pre = '';
          if (fmt.bold) pre += '\\b ';
          if (fmt.italic) pre += '\\i ';
          if (fmt.underline) pre += '\\ul ';
          if (fmt.strike) pre += '\\strike ';
          if (fmt.code) pre += '\\f1 ';
          var post = '';
          if (fmt.bold) post += '\\b0 ';
          if (fmt.italic) post += '\\i0 ';
          if (fmt.underline) post += '\\ul0 ';
          if (fmt.strike) post += '\\strike0 ';
          if (fmt.code) post += '\\f0 ';
          rtf += pre + text + post;
        } else if (child.nodeType === 1) {
          var tag = child.tagName.toLowerCase();
          var newFmt = {
            bold: fmt.bold || false,
            italic: fmt.italic || false,
            underline: fmt.underline || false,
            strike: fmt.strike || false,
            code: fmt.code || false
          };
          switch (tag) {
            case 'strong': case 'b': newFmt.bold = true; break;
            case 'em': case 'i': newFmt.italic = true; break;
            case 'u': newFmt.underline = true; break;
            case 's': case 'del': case 'strike': newFmt.strike = true; break;
            case 'code': newFmt.code = true; break;
            case 'br': rtf += '\\line '; continue;
            case 'a': break; // Just output text, no hyperlink in basic RTF
            case 'span': break;
            default: break;
          }
          rtf += processInlineRtf(child, newFmt);
        }
      }
      return rtf;
    }

    function processBlocksRtf(node) {
      var rtf = '';
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (child.nodeType === 3) {
          var text = escapeRtf(child.nodeValue);
          if (text.trim()) rtf += '\\pard\\fs24 ' + text + '\\par ';
          continue;
        }
        if (child.nodeType !== 1) continue;
        var tag = child.tagName.toLowerCase();

        switch (tag) {
          case 'h1':
            rtf += '\\pard\\fs48\\b ' + escapeRtf(child.textContent) + '\\b0\\fs24\\par ';
            break;
          case 'h2':
            rtf += '\\pard\\fs36\\b ' + escapeRtf(child.textContent) + '\\b0\\fs24\\par ';
            break;
          case 'h3':
            rtf += '\\pard\\fs28\\b ' + escapeRtf(child.textContent) + '\\b0\\fs24\\par ';
            break;
          case 'h4': case 'h5': case 'h6':
            rtf += '\\pard\\fs24\\b ' + escapeRtf(child.textContent) + '\\b0\\par ';
            break;
          case 'p':
            rtf += '\\pard\\fs24 ' + processInlineRtf(child, {}) + '\\par ';
            break;
          case 'blockquote':
            rtf += '\\pard\\li720\\ri720\\fs24\\i ' + processInlineRtf(child, { italic: true }) + '\\i0\\li0\\ri0\\par ';
            break;
          case 'ul':
            var ulItems = child.querySelectorAll(':scope > li');
            for (var u = 0; u < ulItems.length; u++) {
              rtf += '\\pard\\li720\\fs24 \\u8226\\~ ' + processInlineRtf(ulItems[u], {}) + '\\par ';
            }
            break;
          case 'ol':
            var olItems = child.querySelectorAll(':scope > li');
            for (var o = 0; o < olItems.length; o++) {
              rtf += '\\pard\\li720\\fs24 ' + (o + 1) + '. ' + processInlineRtf(olItems[o], {}) + '\\par ';
            }
            break;
          case 'pre':
            rtf += '\\pard\\f1\\fs20 ' + escapeRtf(child.textContent) + '\\f0\\fs24\\par ';
            break;
          case 'hr':
            rtf += '\\pard\\brdrb\\brdrs\\brdrw30\\brsp20\\fs24\\par ';
            break;
          case 'table':
            var tblRows = child.querySelectorAll('tr');
            for (var tr = 0; tr < tblRows.length; tr++) {
              var cells = tblRows[tr].querySelectorAll('th, td');
              for (var tc = 0; tc < cells.length; tc++) {
                var cellFmt = tblRows[tr].children[tc].tagName.toLowerCase() === 'th' ? { bold: true } : {};
                rtf += '\\pard\\fs24\\intbl ' + processInlineRtf(cells[tc], cellFmt) + '\\cell ';
              }
              rtf += '\\row ';
            }
            rtf += '\\pard\\fs24\\par ';
            break;
          case 'br':
            rtf += '\\line ';
            break;
          case 'div':
            rtf += processBlocksRtf(child);
            break;
          default:
            rtf += processBlocksRtf(child);
            break;
        }
      }
      return rtf;
    }

    var rtfBody = processBlocksRtf(temp);
    return rtfHeader + rtfBody + '}';
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
    // ============================================
  // TOOLBAR BUTTON HANDLERS
  // ============================================

  function setupToolbarButtons() {
    // Format buttons (bold, italic, underline, etc.)
    var fmtBtns = document.querySelectorAll('.fmt-text-btn[data-cmd]');
    for (var i = 0; i < fmtBtns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          if (goalLockTriggered) return;
          var cmd = btn.getAttribute('data-cmd');
          if (cmd) {
            document.execCommand(cmd, false, null);
            saveCurrentTabContent();
            updateStats();
            updateGoalProgress();
            richEditor.focus();
          }
        });
      })(fmtBtns[i]);
    }

    // Heading buttons
    var headBtns = document.querySelectorAll('.fmt-text-btn[data-block]');
    for (var j = 0; j < headBtns.length; j++) {
      (function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          if (goalLockTriggered) return;
          var blockTag = btn.getAttribute('data-block');
          document.execCommand('formatBlock', false, '<' + blockTag + '>');
          saveCurrentTabContent();
          updateStats();
          richEditor.focus();
        });
      })(headBtns[j]);
    }

    // Generic execCommand buttons (alignment, lists, indent, etc.)
    var cmdBtns = document.querySelectorAll('.action-btn[data-cmd]');
    for (var k = 0; k < cmdBtns.length; k++) {
      (function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          if (goalLockTriggered) return;
          var cmd = btn.getAttribute('data-cmd');
          if (cmd === 'indent' || cmd === 'outdent') {
            document.execCommand(cmd, false, null);
          } else if (cmd === 'subscript' || cmd === 'superscript') {
            document.execCommand(cmd, false, null);
          } else {
            document.execCommand(cmd, false, null);
          }
          saveCurrentTabContent();
          updateStats();
          richEditor.focus();
        });
      })(cmdBtns[k]);
    }
  }

  // ============================================
  // SETTINGS — READ & APPLY
  // ============================================

  function applySettings() {
    // Reading progress
    readingProgressEnabled = localStorage.getItem('oros_reading_progress') !== 'false';
    var rpToggle = document.getElementById('toggle-reading-progress');
    if (rpToggle) rpToggle.checked = readingProgressEnabled;
    updateReadingProgress();

    // Smart typography
    smartTypographyEnabled = localStorage.getItem('oros_smart_typography') !== 'false';
    var stToggle = document.getElementById('toggle-smart-typography');
    if (stToggle) stToggle.checked = smartTypographyEnabled;

    // Typewriter sound
    typewriterSoundEnabled = localStorage.getItem('oros_typewriter_sound') === 'true';
    var tsToggle = document.getElementById('toggle-typewriter-sound');
    if (tsToggle) tsToggle.checked = typewriterSoundEnabled;
    if (typewriterSoundEnabled && !typewriterAudioCtx) initTypewriterSound();

    // Hide stats
    var hideStats = localStorage.getItem('oros_hide_stats') === 'true';
    var hsToggle = document.getElementById('toggle-hide-stats');
    if (hsToggle) hsToggle.checked = hideStats;
    if (hideStats && statsOverlay) statsOverlay.style.display = 'none';

    // Hide save indicator
    var hideSaveInd = localStorage.getItem('oros_hide_save_indicator') === 'true';
    var siToggle = document.getElementById('toggle-hide-save-indicator');
    if (siToggle) siToggle.checked = hideSaveInd;

    // Hide buttons
    var btnHideMap = [
      ['oros_hide_goal_btn', 'toggle-hide-goal-btn', btnGoal],
      ['oros_hide_outline_btn', 'toggle-hide-outline-btn', btnOutline],
      ['oros_hide_metadata_btn', 'toggle-hide-metadata-btn', btnMetadata],
      ['oros_hide_find_btn', 'toggle-hide-find-btn', btnFind],
      ['oros_hide_wordfreq_btn', 'toggle-hide-wordfreq-btn', btnWordFreq],
      ['oros_hide_lorem_btn', 'toggle-hide-lorem-btn', btnLorem]
    ];
    for (var i = 0; i < btnHideMap.length; i++) {
      var key = btnHideMap[i][0];
      var toggleId = btnHideMap[i][1];
      var btn = btnHideMap[i][2];
      var hidden = localStorage.getItem(key) === 'true';
      var toggle = document.getElementById(toggleId);
      if (toggle) toggle.checked = hidden;
      if (btn) btn.style.display = hidden ? 'none' : '';
    }

    updateSaveIndicator();
  }

  function setupSettingsListeners() {
    // Reading progress toggle
    var rpToggle = document.getElementById('toggle-reading-progress');
    if (rpToggle) {
      rpToggle.addEventListener('change', function() {
        var enabled = rpToggle.checked;
        localStorage.setItem('oros_reading_progress', enabled ? 'true' : 'false');
        readingProgressEnabled = enabled;
        updateReadingProgress();
      });
    }

    // Smart typography toggle
    var stToggle = document.getElementById('toggle-smart-typography');
    if (stToggle) {
      stToggle.addEventListener('change', function() {
        var enabled = stToggle.checked;
        localStorage.setItem('oros_smart_typography', enabled ? 'true' : 'false');
        smartTypographyEnabled = enabled;
      });
    }

    // Typewriter sound toggle
    var tsToggle = document.getElementById('toggle-typewriter-sound');
    if (tsToggle) {
      tsToggle.addEventListener('change', function() {
        var enabled = tsToggle.checked;
        localStorage.setItem('oros_typewriter_sound', enabled ? 'true' : 'false');
        typewriterSoundEnabled = enabled;
        if (enabled && !typewriterAudioCtx) initTypewriterSound();
        window.dispatchEvent(new CustomEvent('oros-typewriter-sound-changed', { detail: { enabled: enabled } }));
      });
    }

    // Hide stats toggle
    var hsToggle = document.getElementById('toggle-hide-stats');
    if (hsToggle) {
      hsToggle.addEventListener('change', function() {
        var hidden = hsToggle.checked;
        localStorage.setItem('oros_hide_stats', hidden ? 'true' : 'false');
        if (statsOverlay) statsOverlay.style.display = hidden ? 'none' : '';
        if (hidden && statsGoalEl) statsGoalEl.style.display = 'none';
        if (!hidden && goalTarget) {
          if (statsDefaultEl) statsDefaultEl.style.display = 'none';
          if (statsGoalEl) statsGoalEl.style.display = '';
          updateGoalProgress();
        }
      });
    }

    // Hide save indicator toggle
    var siToggle = document.getElementById('toggle-hide-save-indicator');
    if (siToggle) {
      siToggle.addEventListener('change', function() {
        var hidden = siToggle.checked;
        localStorage.setItem('oros_hide_save_indicator', hidden ? 'true' : 'false');
        updateSaveIndicator();
      });
    }

    // Button visibility toggles
    var btnToggleMap = [
      ['oros_hide_goal_btn', 'toggle-hide-goal-btn', btnGoal],
      ['oros_hide_outline_btn', 'toggle-hide-outline-btn', btnOutline],
      ['oros_hide_metadata_btn', 'toggle-hide-metadata-btn', btnMetadata],
      ['oros_hide_find_btn', 'toggle-hide-find-btn', btnFind],
      ['oros_hide_wordfreq_btn', 'toggle-hide-wordfreq-btn', btnWordFreq],
      ['oros_hide_lorem_btn', 'toggle-hide-lorem-btn', btnLorem]
    ];
    for (var i = 0; i < btnToggleMap.length; i++) {
      (function(item) {
        var key = item[0], toggleId = item[1], btn = item[2];
        var toggle = document.getElementById(toggleId);
        if (!toggle || !btn) return;
        toggle.addEventListener('change', function() {
          var hidden = toggle.checked;
          localStorage.setItem(key, hidden ? 'true' : 'false');
          btn.style.display = hidden ? 'none' : '';
        });
      })(btnToggleMap[i]);
    }
  }

  // ============================================
  // EXPORT DROPDOWN
  // ============================================

  function setupExportDropdown() {
    if (!btnExport) return;
    btnExport.addEventListener('click', function(e) {
      e.stopPropagation();
      if (exportDropdown) {
        exportDropdown.style.display = exportDropdown.style.display === 'block' ? 'none' : 'block';
      }
    });
    document.addEventListener('click', function(e) {
      if (exportDropdown && exportDropdown.style.display === 'block') {
        if (!e.target.closest('#export-dropdown-container')) {
          exportDropdown.style.display = 'none';
        }
      }
    });
    if (exportDropdown) {
      var buttons = exportDropdown.querySelectorAll('button[data-format]');
      for (var i = 0; i < buttons.length; i++) {
        (function(btn) {
          btn.addEventListener('click', function() {
            var format = btn.getAttribute('data-format');
            exportDropdown.style.display = 'none';
            downloadFile(format);
          });
        })(buttons[i]);
      }
    }
  }

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      var ctrl = e.ctrlKey || e.metaKey;
      var target = e.target || document.activeElement;

      // Ctrl+S — Save metadata (prevent browser save)
      if (ctrl && e.key === 's') {
        e.preventDefault();
        saveCurrentTabMetadata(true);
        showToast(getTrans('toast_saved') || 'Saved');
        return;
      }

      // Ctrl+O — Open file
      if (ctrl && e.key === 'o') {
        e.preventDefault();
        if (fileInput) fileInput.click();
        return;
      }

      // Ctrl+W — Close tab
      if (ctrl && e.key === 'w') {
        e.preventDefault();
        var api = getTabsApi();
        var activeId = api.getActiveId();
        if (activeId) api.closeTab(activeId);
        return;
      }

      // Ctrl+N — New tab
      if (ctrl && e.key === 'n') {
        e.preventDefault();
        createTab({ content: '', metadata: {} });
        return;
      }

      // Ctrl+K — Insert link
      if (ctrl && e.key === 'k') {
        e.preventDefault();
        toggleLinkDialog();
        return;
      }

      // Ctrl+F — Find
      if (ctrl && e.key === 'f') {
        e.preventDefault();
        toggleFindBar();
        return;
      }

      // Ctrl+G — Goal
      if (ctrl && e.key === 'g') {
        e.preventDefault();
        toggleGoalBar();
        return;
      }

      // Ctrl+Shift+X — Strikethrough
      if (ctrl && e.shiftKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        if (!goalLockTriggered) {
          document.execCommand('strikeThrough', false, null);
          saveCurrentTabContent();
          updateStats();
        }
        return;
      }

      // Ctrl+, — Subscript
      if (ctrl && e.key === ',') {
        e.preventDefault();
        if (!goalLockTriggered) {
          document.execCommand('subscript', false, null);
          saveCurrentTabContent();
          updateStats();
        }
        return;
      }

      // Ctrl+. — Superscript
      if (ctrl && e.key === '.') {
        e.preventDefault();
        if (!goalLockTriggered) {
          document.execCommand('superscript', false, null);
          saveCurrentTabContent();
          updateStats();
        }
        return;
      }

      // F9 — Zen Mode
      if (e.key === 'F9') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('oros-toggle-zen'));
        return;
      }

      // Esc — Close panels/dialogs
      if (e.key === 'Escape') {
        var closedSomething = false;

        if (linkDialog && linkDialog.style.display === 'flex') {
          linkDialog.style.display = 'none';
          closedSomething = true;
        }
        if (tableDialog && tableDialog.style.display === 'flex') {
          tableDialog.style.display = 'none';
          closedSomething = true;
        }
        if (imageDialog && imageDialog.style.display === 'flex') {
          imageDialog.style.display = 'none';
          closedSomething = true;
        }
        if (helpDialog && helpDialog.style.display === 'flex') {
          helpDialog.style.display = 'none';
          closedSomething = true;
        }
        if (findBar && findBar.style.display === 'flex') {
          findBar.style.display = 'none';
          clearHighlights();
          closedSomething = true;
        }
        if (goalBar && goalBar.style.display === 'flex') {
          goalBar.style.display = 'none';
          closedSomething = true;
        }
        if (outlinePanel && outlinePanel.style.display === 'flex') {
          outlinePanel.style.display = 'none';
          closedSomething = true;
        }
        if (metadataPanel && metadataPanel.style.display === 'flex') {
          metadataPanel.style.display = 'none';
          closedSomething = true;
        }
        if (wordFreqPanel && wordFreqPanel.style.display === 'flex') {
          wordFreqPanel.style.display = 'none';
          closedSomething = true;
        }
        if (exportDropdown && exportDropdown.style.display === 'block') {
          exportDropdown.style.display = 'none';
          closedSomething = true;
        }
        if (closedSomething) {
          e.stopPropagation();
        }
      }
    });
  }

  // ============================================
  // STATS OVERLAY CLICK (expand/collapse)
  // ============================================

  function setupStatsToggle() {
    if (!statsOverlay) return;
    statsOverlay.addEventListener('click', function() {
      if (!statsDefaultEl) return;
      statsExpanded = !statsExpanded;
      if (statsDetailed) statsDetailed.style.display = statsExpanded ? 'block' : 'none';
      updateStats();
    });
  }

  // ============================================
  // TAB SWITCH HANDLER
  // ============================================

  function onTabSwitch(tab) {
    if (!tab) return;
    isSwitching = true;

    // Load content
    if (richEditor) {
      richEditor.innerHTML = tab.content || '';
    }

    // Load metadata
    currentMetadata = tab.metadata || {};
    if (metaTitle) metaTitle.value = currentMetadata.title || '';
    if (metaAuthor) metaAuthor.value = currentMetadata.author || '';
    if (metaTags) metaTags.value = currentMetadata.tags || '';
    if (metaCategory) metaCategory.value = currentMetadata.category || '';
    renderMetaDates();

    // Reset goal state for new tab
    goalReachedShown = false;
    goalLockTriggered = false;
    richEditor.contentEditable = 'true';

    // Update UI
    updateStats();
    updateGoalProgress();
    updateReadingProgress();
    updateSaveIndicator();

    // Close panels
    if (outlinePanel) outlinePanel.style.display = 'none';
    if (metadataPanel) metadataPanel.style.display = 'none';
    if (wordFreqPanel) wordFreqPanel.style.display = 'none';
    if (findBar) findBar.style.display = 'none';

    isSwitching = false;
    richEditor.focus();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function init() {
    // Load tabs
    loadTabs();
    getTabsApi().on('switch', onTabSwitch);

    // Apply first tab content
    var firstTab = getActiveTab();
    if (firstTab && richEditor) {
      richEditor.innerHTML = firstTab.content || '';
      currentMetadata = firstTab.metadata || {};
      if (metaTitle) metaTitle.value = currentMetadata.title || '';
      if (metaAuthor) metaAuthor.value = currentMetadata.author || '';
      if (metaTags) metaTags.value = currentMetadata.tags || '';
      if (metaCategory) metaCategory.value = currentMetadata.category || '';
      renderMetaDates();
    }

    // Setup typewriter sound
    if (typewriterSoundEnabled) initTypewriterSound();

    // Toolbar buttons
    setupToolbarButtons();

    // Export dropdown
    setupExportDropdown();

    // Keyboard shortcuts
    setupKeyboardShortcuts();

    // Stats toggle
    setupStatsToggle();

    // Metadata handlers
    setupMetadataHandlers();

    // Settings
    applySettings();
    setupSettingsListeners();

    // FIX #6: No beforeunload warning — autosave handles everything

    // Button bindings
    if (btnOpen) {
      btnOpen.addEventListener('click', function() {
        if (fileInput) fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', function() {
        if (fileInput.files && fileInput.files[0]) {
          openFile(fileInput.files[0]);
          fileInput.value = '';
        }
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', function() {
        if (richEditor) richEditor.innerHTML = '';
        saveCurrentTabContent();
        updateStats();
        updateGoalProgress();
        showToast(getTrans('toast_cleared') || 'Cleared');
      });
    }

    if (btnLorem) {
      btnLorem.addEventListener('click', insertLoremIpsum);
    }

    if (btnHr) {
      btnHr.addEventListener('click', function() {
        document.execCommand('insertHorizontalRule', false, null);
        saveCurrentTabContent();
        updateStats();
      });
    }

    if (btnLink) {
      btnLink.addEventListener('click', toggleLinkDialog);
    }
    var btnCloseLinkDialog = document.getElementById('btn-close-link-dialog');
    var btnCancelLink = document.getElementById('btn-cancel-link');
    var btnInsertLink = document.getElementById('btn-insert-link');
    if (btnCloseLinkDialog) btnCloseLinkDialog.addEventListener('click', function() { linkDialog.style.display = 'none'; });
    if (btnCancelLink) btnCancelLink.addEventListener('click', function() { linkDialog.style.display = 'none'; });
    if (btnInsertLink) btnInsertLink.addEventListener('click', insertLink);

    if (btnTable) {
      btnTable.addEventListener('click', toggleTableDialog);
    }
    var btnCloseTableDialog = document.getElementById('btn-close-table-dialog');
    var btnCancelTable = document.getElementById('btn-cancel-table');
    var btnInsertTable = document.getElementById('btn-insert-table');
    if (btnCloseTableDialog) btnCloseTableDialog.addEventListener('click', function() { tableDialog.style.display = 'none'; });
    if (btnCancelTable) btnCancelTable.addEventListener('click', function() { tableDialog.style.display = 'none'; });
    if (btnInsertTable) btnInsertTable.addEventListener('click', insertTable);

    if (btnImage) {
      btnImage.addEventListener('click', toggleImageDialog);
    }
    var btnCloseImageDialog = document.getElementById('btn-close-image-dialog');
    var btnCancelImage = document.getElementById('btn-cancel-image');
    var btnInsertImage = document.getElementById('btn-insert-image');
    var imageSourceType = document.getElementById('image-source-type');
    if (btnCloseImageDialog) btnCloseImageDialog.addEventListener('click', function() { imageDialog.style.display = 'none'; });
    if (btnCancelImage) btnCancelImage.addEventListener('click', function() { imageDialog.style.display = 'none'; });
    if (btnInsertImage) btnInsertImage.addEventListener('click', handleImageInsert);
    if (imageSourceType) {
      imageSourceType.addEventListener('change', function() {
        var isUpload = imageSourceType.value === 'upload';
        document.getElementById('image-upload-field').style.display = isUpload ? '' : 'none';
        document.getElementById('image-url-field').style.display = isUpload ? 'none' : '';
      });
    }

    if (btnGoal) {
      btnGoal.addEventListener('click', toggleGoalBar);
    }
    if (btnSetGoal) {
      btnSetGoal.addEventListener('click', setGoal);
    }
    if (btnClearGoal) {
      btnClearGoal.addEventListener('click', clearGoal);
    }
    if (btnCloseGoal) {
      btnCloseGoal.addEventListener('click', function() { goalBar.style.display = 'none'; });
    }
    if (goalTargetInput) {
      goalTargetInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); setGoal(); }
      });
    }

    if (btnFind) {
      btnFind.addEventListener('click', toggleFindBar);
    }
    if (btnCloseFR) {
      btnCloseFR.addEventListener('click', toggleFindBar);
    }
    if (findInput) {
      findInput.addEventListener('input', function() {
        clearTimeout(findInput._debounce);
        findInput._debounce = setTimeout(highlightMatches, 250);
      });
      findInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          navigateMatch(e.shiftKey ? -1 : 1);
        }
      });
    }
    if (replaceInput) {
      replaceInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          doReplace(false);
        }
      });
    }
    var btnFrPrev = document.getElementById('btn-fr-prev');
    var btnFrNext = document.getElementById('btn-fr-next');
    var btnFrReplace = document.getElementById('btn-fr-replace');
    var btnFrReplaceAll = document.getElementById('btn-fr-replace-all');
    if (btnFrPrev) btnFrPrev.addEventListener('click', function() { navigateMatch(-1); });
    if (btnFrNext) btnFrNext.addEventListener('click', function() { navigateMatch(1); });
    if (btnFrReplace) btnFrReplace.addEventListener('click', function() { doReplace(false); });
    if (btnFrReplaceAll) btnFrReplaceAll.addEventListener('click', function() { doReplace(true); });

    if (btnOutline) {
      btnOutline.addEventListener('click', toggleOutline);
    }
    if (btnCloseOutline) {
      btnCloseOutline.addEventListener('click', function() { outlinePanel.style.display = 'none'; });
    }

    if (btnMetadata) {
      btnMetadata.addEventListener('click', toggleMetadataPanel);
    }
    if (btnCloseMetadata) {
      btnCloseMetadata.addEventListener('click', function() {
        saveCurrentTabMetadata(true);
        metadataPanel.style.display = 'none';
      });
    }

    if (btnWordFreq) {
      btnWordFreq.addEventListener('click', toggleWordFreqPanel);
    }
    if (btnCloseWordFreq) {
      btnCloseWordFreq.addEventListener('click', function() { wordFreqPanel.style.display = 'none'; });
    }

    // Help dialog
    var btnCloseHelp = document.getElementById('btn-close-help');
    var btnCloseHelpOk = document.getElementById('btn-close-help-ok');
    var helpBtn = document.querySelector('.action-btn[data-i18n-tooltip="tooltip_help"]');
    if (helpBtn) {
      helpBtn.addEventListener('click', function() {
        if (helpDialog) helpDialog.style.display = 'flex';
      });
    }
    if (btnCloseHelp) btnCloseHelp.addEventListener('click', function() { helpDialog.style.display = 'none'; });
    if (btnCloseHelpOk) btnCloseHelpOk.addEventListener('click', function() { helpDialog.style.display = 'none'; });

    // Smart paste
    if (richEditor) {
      richEditor.addEventListener('paste', handleSmartPaste);
    }

    // Smart typography keypress
    if (richEditor) {
      richEditor.addEventListener('keyup', function(e) {
        if (e.key === ' ' || e.key === "'" || e.key === '"' || e.key === '-') {
          handleSmartTypography();
        }
      });
    }

    // Initial UI update
    updateStats();
    if (goalTarget) {
      if (statsDefaultEl) statsDefaultEl.style.display = 'none';
      if (statsGoalEl) statsGoalEl.style.display = '';
      updateGoalProgress();
    }
    updateReadingProgress();
    updateSaveIndicator();

    // Periodic save indicator refresh
    setInterval(updateSaveIndicator, 30000);

    // Listen for global language change
    window.addEventListener('oros-language-changed', function() {
      renderTabs();
      updateStats();
      updateSaveIndicator();
    });

    console.log('%c[orOS Writer]', 'color:#c8a96e;font-weight:bold', 'Initialized successfully.');
  }

  // ============================================
  // BOOT
  // ============================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();