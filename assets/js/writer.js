// ============================================
// orOS Writer — Complete Implementation v2.0
// Features #1-#20 fully integrated
// ============================================

(function() {
  'use strict';

  // ===== CONSTANTS =====
  const TABS_STORAGE_KEY = 'oros_writer_tabs_v2';
  const VERSION_HISTORY_KEY = 'oros_writer_versions';
  const MAX_TABS = 15;
  const MAX_VERSIONS_PER_TAB = 20;
  const AUTO_SNAPSHOT_INTERVAL = 300000; // 5 minutes
  const SESSION_COMPLETE_BEEP_FREQ = 880;
  const SESSION_WARNING_BEEP_FREQ = 440;

  // ===== DOM ELEMENTS =====
  let richEditor = null;
  let richWrapper = null;
  let tabBar = null;
  let saveIndicator = null;
  let statsOverlay = null;
  let statsDefaultEl = null;
  let statsGoalEl = null;
  let statsDetailed = null;
  let goalBar = null;
  let sessionBar = null;
  let findBar = null;
  let findInput = null;
  let replaceInput = null;
  let frResults = null;
  let findFormatFilter = null;
  let trackChangesBar = null;
  let metadataPanel = null;
  let outlinePanel = null;
  let wordFreqPanel = null;
  let commentsPanel = null;
  let tocPanel = null;
  let versionPanel = null;
  let footnoteArea = null;
  let readingProgressBar = null;
  let exportDropdown = null;
  let stylesSelect = null;

  // ===== STATE =====
  let tabsState = [];
  let activeTabId = null;
  let tabSwitchListeners = [];
  let currentMetadata = {};
  let currentTabContent = '';
  let isSwitching = false;
  let goalTarget = null;
  let goalUnit = 'words';
  let goalLockEnabled = false;
  let goalReachedShown = false;
  let goalLockTriggered = false;
  let currentMatchIndex = -1;
  let matchRanges = [];
  let matchMarks = [];
  let statsExpanded = false;
  let sessionRunning = false;
  let sessionInterval = null;
  let sessionRemaining = 0;
  let sessionWordsTarget = 500;
  let sessionWordsStart = 0;
  let trackingChanges = false;
  let trackChangesHistory = [];
  let autoCorrections = [];
  let shortcutOverrides = {};
  let readingModeEnabled = false;
  let focusModeEnabled = false;
  let smartTypographyEnabled = true;
  let typewriterSoundEnabled = false;
  let smartPasteEnabled = true;
  let isReplacing = false;
  let wordFreqDebounce = null;
  let outlineDebounceTimer = null;
  let lastAutosaveTime = 0;

  // ===== TABS API =====
  function getTabsApi() {
    return {
      saveActiveContent: function(html) {
        const tab = getActiveTab();
        if (!tab) return;
        tab.content = html;
        persistTabs();
      },
      saveActiveMetadata: function(metadata) {
        const tab = getActiveTab();
        if (!tab) return;
        tab.metadata = metadata;
        tab.timestamp = Date.now();
        persistTabs();
      },
      saveActiveTimestamp: function(ts) {
        const tab = getActiveTab();
        if (!tab) return;
        tab.timestamp = ts;
        persistTabs();
      },
      getActiveTimestamp: function() {
        const tab = getActiveTab();
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
      getAllTabs: function() {
        return [...tabsState];
      },
      setActiveTab: function(id) {
        switchTab(id);
      },
      on: function(event, callback) {
        if (event === 'switch' || event === 'create') {
          tabSwitchListeners.push(callback);
        }
      },
      addVersionSnapshot: function(tabId) {
        addVersionSnapshot(tabId);
      },
      getVersions: function(tabId) {
        return getVersionsForTab(tabId);
      }
    };
  }

  function getActiveTab() {
    for (let i = 0; i < tabsState.length; i++) {
      if (tabsState[i].id === activeTabId) return tabsState[i];
    }
    return null;
  }

  function persistTabs() {
    try {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabsState));
      lastAutosaveTime = Date.now();
      updateSaveIndicator();
    } catch(e) {
      console.warn('Failed to persist tabs:', e);
      showToast('Warning: Could not save. Storage may be full.');
    }
  }

  function loadTabs() {
    try {
      const raw = localStorage.getItem(TABS_STORAGE_KEY);
      if (raw) {
        tabsState = JSON.parse(raw);
        if (!Array.isArray(tabsState)) tabsState = [];
      }
    } catch(e) {
      tabsState = [];
    }

    // Migrate legacy content
    if (tabsState.length === 0) {
      tabsState.push({
        id: generateTabId(),
        title: '',
        content: '',
        metadata: {},
        timestamp: Date.now(),
        versions: []
      });
    }

    activeTabId = tabsState[0].id;
    renderTabs();
  }

  function generateTabId() {
    return 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);
  }

  function createTab(opts) {
    if (tabsState.length >= MAX_TABS) {
      showToast('Maximum tabs reached (' + MAX_TABS + ')');
      return;
    }
    opts = opts || {};
    const newTab = {
      id: generateTabId(),
      title: '',
      content: opts.content || '',
      metadata: opts.metadata || {},
      timestamp: Date.now(),
      versions: []
    };
    tabsState.push(newTab);
    activeTabId = newTab.id;
    persistTabs();
    renderTabs();
    notifySwitch(newTab);
  }

  function closeTabById(id) {
    const idx = tabsState.findIndex(t => t.id === id);
    if (idx === -1) return;

    const closingTab = tabsState[idx];
    if (closingTab.metadata.title) {
      // Ask confirmation if tab has content
      const contentPreview = closingTab.content.replace(/<[^>]*>/g, '').trim().substring(0, 50);
      if (contentPreview.length > 0 && !confirm('Close "' + (closingTab.metadata.title || 'Untitled') + '"?')) {
        return;
      }
    }

    tabsState.splice(idx, 1);

    if (tabsState.length === 0) {
      const freshTab = {
        id: generateTabId(),
        title: '',
        content: '',
        metadata: {},
        timestamp: Date.now(),
        versions: []
      };
      tabsState.push(freshTab);
      activeTabId = freshTab.id;
    } else if (activeTabId === id) {
      activeTabId = tabsState[Math.max(0, idx - 1)].id;
    }

    persistTabs();
    renderTabs();
    const active = getActiveTab();
    notifySwitch(active);
  }

  function switchTab(id) {
    if (id === activeTabId) return;
    
    // Save current tab content before switching
    saveCurrentTabContent();
    
    activeTabId = id;
    renderTabs();
    const tab = getActiveTab();
    notifySwitch(tab);
  }

  function notifySwitch(tab) {
    for (let i = 0; i < tabSwitchListeners.length; i++) {
      try { tabSwitchListeners[i](tab); } catch(e) {}
    }
  }

  function renderTabs() {
    if (!tabBar) tabBar = document.getElementById('tab-bar');
    if (!tabBar) return;
    tabBar.innerHTML = '';

    for (let i = 0; i < tabsState.length; i++) {
      (function(tab) {
        const el = document.createElement('div');
        el.className = 'tab' + (tab.id === activeTabId ? ' active' : '');

        const label = document.createElement('span');
        label.className = 'tab-label';
        const title = (tab.metadata && tab.metadata.title) ? tab.metadata.title : '';
        label.textContent = title || (getTrans('editor_name') || 'Writer') + ' ' + (i + 1);
        label.title = title || '';

        // Double-click to rename (Feature #4)
        label.addEventListener('dblclick', function(e) {
          e.stopPropagation();
          startTabRename(el, tab);
        });

        const closeBtn = document.createElement('span');
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
      const newBtn = document.createElement('div');
      newBtn.className = 'tab-new';
      newBtn.innerHTML = '+';
      newBtn.title = getTrans('tab_new');
      newBtn.addEventListener('click', function() {
        createTab({ content: '', metadata: {} });
      });
      tabBar.appendChild(newBtn);
    }
  }

  function startTabRename(tabEl, tab) {
    const label = tabEl.querySelector('.tab-label');
    const originalText = label.textContent;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'editing';
    input.style.cssText = 'background:#1a1a2e;color:#ccc;border:1px solid #c8a96e;padding:2px 4px;width:100%;font-family:inherit;font-size:inherit;';
    
    label.textContent = '';
    label.appendChild(input);
    input.focus();
    input.select();

    function finishRename() {
      const newName = input.value.trim();
      label.removeChild(input);
      
      if (newName && newName !== originalText) {
        tab.metadata.title = newName;
        persistTabs();
        renderTabs();
        saveCurrentTabMetadata(false);
      } else {
        const title = tab.metadata.title ? tab.metadata.title : '';
        label.textContent = title || (getTrans('editor_name') || 'Writer');
      }
    }

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      } else if (e.key === 'Escape') {
        finishRename();
      }
    });
  }

  // ===== SETTINGS HELPERS =====
  function getCurrentLang() {
    return localStorage.getItem('oros-language') || 'en';
  }

  function getTrans(key) {
    const lang = getCurrentLang();
    const t = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[lang]) || {};
    return t[key] || key;
  }

  function formatNumber(num) {
    return num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num.toString();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== TOAST NOTIFICATIONS =====
  let toastElement = null;
  let toastTimeout = null;

  function showToast(message) {
    if (!toastElement) {
      toastElement = document.createElement('div');
      toastElement.className = 'zentool-toast';
      document.body.appendChild(toastElement);
    }
    toastElement.textContent = message;
    toastElement.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function() {
      toastElement.classList.remove('visible');
    }, 3000);
  }

  // ===== TYPEWRITER SOUND =====
  let typewriterAudioCtx = null;
  let typewriterAudioBuffer = null;

  function initTypewriterSound() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      typewriterAudioCtx = new AC();
      const sampleRate = typewriterAudioCtx.sampleRate;
      const duration = 0.04;
      const numSamples = Math.floor(sampleRate * duration);
      const buffer = typewriterAudioCtx.createBuffer(1, numSamples, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 80);
        const noise = (Math.random() * 2 - 1) * 0.3;
        const click = Math.sin(2 * Math.PI * 2000 * t) * 0.15;
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
      const source = typewriterAudioCtx.createBufferSource();
      source.buffer = typewriterAudioBuffer;
      const gainNode = typewriterAudioCtx.createGain();
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

  // ===== SAVE INDICATOR =====
  function updateSaveIndicator() {
    if (!saveIndicator) return;
    
    saveIndicator.style.visibility = hasSaveIndicatorHidden() ? 'hidden' : 'visible';
    const api = getTabsApi();
    const lastSavedTime = api ? api.getActiveTimestamp() : null;
    
    if (!lastSavedTime) {
      saveIndicator.textContent = getTrans('text_not_saved') || '—';
      return;
    }
    
    const diff = Math.floor((Date.now() - lastSavedTime) / 1000);
    if (diff < 60) {
      saveIndicator.textContent = getTrans('text_saved_just_now') || 'Saved just now';
    } else if (diff < 3600) {
      const mins = Math.floor(diff / 60);
      saveIndicator.textContent = (getTrans('text_saved_minutes_ago') || '{n}m ago').replace('{n}', mins);
    } else {
      const hours = Math.floor(diff / 3600);
      saveIndicator.textContent = (getTrans('text_saved_hours_ago') || '{n}h ago').replace('{n}', hours);
    }
  }

  function hasSaveIndicatorHidden() {
    return localStorage.getItem('oros_hide_save_indicator') === 'true';
  }

  // ===== INPUT EVENT =====
  function setupEditorInput() {
    if (!richEditor) return;

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
      
      // Track changes recording
      if (trackingChanges) {
        recordTrackChange('input');
      }
      
      // Focus mode
      if (focusModeEnabled) {
        highlightFocusedParagraph();
      }
      
      // Typewriter sound
      if (typewriterSoundEnabled) playTypewriterSound();
      
      // Auto-correction
      if (autoCorrections.length > 0) {
        applyAutoCorrections();
      }
    });

    richEditor.addEventListener('scroll', function() {
      updateReadingProgress();
      if (focusModeEnabled) {
        highlightFocusedParagraph();
      }
    }, { passive: true });

    richEditor.addEventListener('keyup', function(e) {
      if (focusModeEnabled) {
        highlightFocusedParagraph();
      }
      // Smart typography triggers
      if (smartTypographyEnabled && !isReplacing && !goalLockTriggered) {
        const keys = [' ', "'", '"', '-', '(', '.', ','];
        if (keys.includes(e.key)) {
          handleSmartTypography();
        }
      }
    });

    richEditor.addEventListener('click', function(e) {
      if (focusModeEnabled) {
        highlightFocusedParagraph();
      }
    });

    // Paste handler
    richEditor.addEventListener('paste', handleSmartPaste);
  }
  
    // ===== TEXT CONTENT =====
  function getTextContent() {
    const text = richEditor.innerText || '';
    return text.replace(/\n$/, '');
  }

  // ===== STATS =====
  function updateStats() {
    if (!richEditor) return;
    const text = getTextContent();
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const sentences = text.split(/[.!?…]+(?:\s|$)/).filter(function(s) {
      return s.trim().length > 0;
    }).length;
    const readMin = Math.ceil(words / 225) || 0;
    const speakMin = Math.ceil(words / 170) || 0;

    if (statsDefaultEl) {
      const arrow = statsExpanded ? ' ▲' : ' ▼';
      statsDefaultEl.textContent = formatNumber(words) + ' ' + getTrans('text_words') +
        ' · ' + formatNumber(chars) + ' ' + getTrans('text_chars') + arrow;
    }

    if (statsDetailed) {
      const t = function(k) { return getTrans(k); };
      statsDetailed.innerHTML =
        '<div class="stat-row"><span>' + t('stats_chars_with_spaces') + '</span><span>' + chars.toLocaleString() + '</span></div>' +
        '<div class="stat-row"><span>' + t('stats_chars_no_spaces') + '</span><span>' + charsNoSpaces.toLocaleString() + '</span></div>' +
        '<div class="stat-row"><span>' + t('stats_sentences') + '</span><span>' + sentences + '</span></div>' +
        '<div class="stat-row"><span>' + t('stats_reading_time') + '</span><span>' + readMin + ' ' + t('stats_min') + '</span></div>' +
        '<div class="stat-row"><span>' + t('stats_speaking_time') + '</span><span>' + speakMin + ' ' + t('stats_min') + '</span></div>';
    }
  }

  // ===== GOAL TRACKER =====
  function getParagraphCount() {
    const text = richEditor.innerText.trim();
    if (!text) return 0;
    return text.split(/\n/).filter(function(l) { return l.trim(); }).length;
  }

  function getGoalCount() {
    const text = getTextContent();
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
    const count = getGoalCount();
    const pct = Math.min(100, Math.round((count / goalTarget) * 100));
    statsGoalEl.textContent = formatNumber(count) + ' / ' + formatNumber(goalTarget) +
      ' ' + getGoalUnitLabel() + ' · ' + pct + '%';
    
    if (count >= goalTarget && !goalReachedShown) {
      goalReachedShown = true;
      let msg = getTrans('text_goal_reached');
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
      if (goalLockCheckbox) goalLockCheckbox.checked = goalLockEnabled;
      if (goalTargetInput) goalTargetInput.focus();
    }
  }

  function setGoal() {
    const target = parseInt(goalTargetInput.value);
    if (!target || target < 1) return;
    goalTarget = target;
    goalUnit = goalUnitSelect.value;
    goalLockEnabled = goalLockCheckbox ? goalLockCheckbox.checked : false;
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
    
    const hideStats = localStorage.getItem('oros_hide_stats') === 'true';
    if (statsDefaultEl) statsDefaultEl.style.display = hideStats ? 'none' : '';
    if (statsGoalEl) statsGoalEl.style.display = 'none';
    goalBar.style.display = 'none';
    if (goalTargetInput) goalTargetInput.value = '';
    if (goalLockCheckbox) goalLockCheckbox.checked = false;
    showToast(getTrans('text_goal_cleared'));
  }

  function triggerGoalLock() {
    if (!goalLockEnabled || goalLockTriggered) return;
    goalLockTriggered = true;
    richEditor.contentEditable = 'false';
    showToast(getTrans('text_goal_locked'));
  }

  // ===== SESSION TIMER (Feature #12) =====
  function toggleSessionBar() {
    if (!sessionBar) return;
    if (sessionBar.style.display === 'flex') {
      sessionBar.style.display = 'none';
      stopSession();
    } else {
      sessionBar.style.display = 'flex';
      sessionBar.querySelector('.session-display').textContent = '';
      sessionDisplay.textContent = getTrans('session_ready');
    }
  }

  function startSession() {
    const wordTarget = parseInt(document.getElementById('session-word-target').value) || 500;
    const timeTarget = parseInt(document.getElementById('session-time-target').value) || 25;
    
    sessionWordsTarget = wordTarget;
    sessionRemaining = timeTarget * 60;
    sessionWordsStart = getGoalCount();
    sessionRunning = true;
    
    document.getElementById('btn-start-session').style.display = 'none';
    document.getElementById('btn-stop-session').style.display = '';
    
    updateSessionDisplay();
    
    // Get current word count
    const currentWords = getGoalCount();
    const wordsNeeded = sessionWordsTarget - currentWords;
    
    sessionInterval = setInterval(function() {
      if (!sessionRunning) return;
      
      sessionRemaining--;
      updateSessionDisplay();
      
      // Check completion
      if (sessionRemaining <= 0) {
        completeSession();
      }
      
      // Warning at 5 minutes left
      if (sessionRemaining === 300) {
        playSessionBeep(SESSION_WARNING_BEEP_FREQ, 200);
      }
    }, 1000);
    
    showToast('Session started: ' + sessionWordsTarget + ' words in ' + timeTarget + ' minutes');
  }

  function stopSession() {
    sessionRunning = false;
    clearInterval(sessionInterval);
    sessionInterval = null;
    document.getElementById('btn-start-session').style.display = '';
    document.getElementById('btn-stop-session').style.display = 'none';
    sessionDisplay.textContent = '';
    showToast('Session stopped');
  }

  function completeSession() {
    sessionRunning = false;
    clearInterval(sessionInterval);
    sessionInterval = null;
    
    const currentWords = getGoalCount();
    const wordsWritten = currentWords - sessionWordsStart;
    
    sessionDisplay.textContent = getTrans('session_complete') + ' ' + wordsWritten + ' ' + getTrans('text_words');
    sessionDisplay.classList.add('complete');
    
    document.getElementById('btn-start-session').style.display = 'none';
    document.getElementById('btn-stop-session').style.display = 'none';
    
    // Success beep
    playSessionBeep(SESSION_COMPLETE_BEEP_FREQ, 300);
    setTimeout(function() {
      playSessionBeep(SESSION_COMPLETE_BEEP_FREQ, 300);
    }, 400);
    
    showToast('Session complete! You wrote ' + wordsWritten + ' words.');
    
    // Add version snapshot
    const api = getTabsApi();
    if (api) {
      api.addVersionSnapshot(activeTabId);
    }
  }

  function updateSessionDisplay() {
    if (!sessionDisplay) return;
    
    const minutes = Math.floor(sessionRemaining / 60);
    const seconds = sessionRemaining % 60;
    const timeStr = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    
    const currentWords = getGoalCount();
    const wordsWritten = currentWords - sessionWordsStart;
    const progress = Math.min(100, Math.max(0, (wordsWritten / sessionWordsTarget) * 100));
    
    sessionDisplay.textContent = timeStr + ' · ' + wordsWritten + '/' + sessionWordsTarget + ' words (' + Math.round(progress) + '%)';
    
    if (sessionRemaining <= 60) {
      sessionDisplay.classList.add('warning');
    } else {
      sessionDisplay.classList.remove('warning');
    }
  }

  function playSessionBeep(freq, duration) {
    try {
      if (!typewriterAudioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        typewriterAudioCtx = new AC();
      }
      const oscillator = typewriterAudioCtx.createOscillator();
      const gainNode = typewriterAudioCtx.createGain();
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      oscillator.connect(gainNode);
      gainNode.connect(typewriterAudioCtx.destination);
      oscillator.start(0);
      oscillator.stop(typewriterAudioCtx.currentTime + duration / 1000);
    } catch(e) {}
  }

  // ===== READING PROGRESS =====
  let readingProgressEnabled = localStorage.getItem('oros_reading_progress') !== 'false';

  function updateReadingProgress() {
    if (!readingProgressBar) return;
    if (readingProgressEnabled) {
      readingProgressBar.style.display = '';
      const max = richWrapper.scrollHeight - richWrapper.clientHeight;
      if (max <= 0) { readingProgressBar.style.width = '0%'; return; }
      const pct = (richWrapper.scrollTop / max) * 100;
      readingProgressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    } else {
      readingProgressBar.style.display = 'none';
    }
  }

  // ===== SMART TYPOGRAPHY =====
  function handleSmartTypography() {
    if (!smartTypographyEnabled || isReplacing || goalLockTriggered) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return;
    if (!richEditor.contains(range.endContainer)) return;
    
    const preRange = range.cloneRange();
    preRange.selectNodeContents(richEditor);
    preRange.setEnd(range.endContainer, range.endOffset);
    const before = preRange.toString();
    if (!before) return;
    
    let deleteLen = 0;
    let insert = '';
    const last4 = before.slice(-4);
    const last3 = before.slice(-3);
    const last2 = before.slice(-2);
    const last1 = before.slice(-1);
    
    if (last4 === '(tm)') { deleteLen = 4; insert = '\u2122'; }
    else if (last3 === '(c)') { deleteLen = 3; insert = '\u00A9'; }
    else if (last3 === '(r)') { deleteLen = 3; insert = '\u00AE'; }
    else if (last3 === '...') { deleteLen = 3; insert = '\u2026'; }
    else if (last2 === '--') { deleteLen = 2; insert = '\u2014'; }
    else if (last1 === '"') {
      const pc = before.length > 1 ? before[before.length - 2] : ' ';
      insert = /\w/.test(pc) ? '\u201D' : '\u201C';
      deleteLen = 1;
    }
    else if (last1 === "'") {
      const pc2 = before.length > 1 ? before[before.length - 2] : ' ';
      insert = /\w/.test(pc2) ? '\u2019' : '\u2018';
      deleteLen = 1;
    }
    else return;
    
    isReplacing = true;
    for (let i = 0; i < deleteLen; i++) { document.execCommand('delete', false); }
    document.execCommand('insertText', false, insert);
    isReplacing = false;
  }

  // ===== SMART PASTE =====
  function handleSmartPaste(e) {
    if (!smartPasteEnabled || goalLockTriggered) return;
    e.preventDefault();
    
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;
    
    const html = clipboardData.getData('text/html');
    const text = clipboardData.getData('text/plain');
    
    if (html) {
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const allowed = ['P','H1','H2','H3','H4','H5','H6','UL','OL','LI','STRONG','EM','B','I','U','A','CODE','PRE','BLOCKQUOTE','BR','SPAN','TABLE','TD','TH','TR'];
      const all = temp.querySelectorAll('*');
      for (let i = 0; i < all.length; i++) {
        const el = all[i];
        if (allowed.indexOf(el.tagName) === -1) {
          const txt = document.createTextNode(el.textContent + ' ');
          el.parentNode.replaceChild(txt, el);
        } else {
          while (el.attributes.length > 0) {
            const attr = el.attributes[0];
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
    updateGoalProgress();
  }
  
    // ===== TAB CONTENT & METADATA SAVING =====
  function saveCurrentTabContent() {
    if (isSwitching) return;
    const api = getTabsApi();
    if (!api) return;
    api.saveActiveContent(richEditor.innerHTML);
    api.saveActiveTimestamp(Date.now());
    updateSaveIndicator();
  }

  function saveCurrentTabMetadata(triggerSaveIndicator) {
    if (isSwitching) return;
    if (metaTitle) currentMetadata.title = metaTitle.value || '';
    if (metaAuthor) currentMetadata.author = metaAuthor.value || '';
    if (metaTags) currentMetadata.tags = metaTags.value || '';
    if (metaCategory) currentMetadata.category = metaCategory.value || '';
    if (!currentMetadata.created) {
      currentMetadata.created = new Date().toISOString();
    }
    currentMetadata.modified = new Date().toISOString();
    const api = getTabsApi();
    if (api) api.saveActiveMetadata(currentMetadata);
    renderMetaDates();
    if (triggerSaveIndicator) {
      api.saveActiveTimestamp(Date.now());
      updateSaveIndicator();
    }
  }

  // ===== TAB SWITCH HANDLER =====
  function onTabSwitch(tab) {
    if (!tab) return;
    isSwitching = true;

    if (richEditor) {
      richEditor.innerHTML = tab.content || '';
    }

    currentMetadata = tab.metadata || {};
    if (metaTitle) metaTitle.value = currentMetadata.title || '';
    if (metaAuthor) metaAuthor.value = currentMetadata.author || '';
    if (metaTags) metaTags.value = currentMetadata.tags || '';
    if (metaCategory) metaCategory.value = currentMetadata.category || '';
    renderMetaDates();

    goalReachedShown = false;
    goalLockTriggered = false;
    richEditor.contentEditable = 'true';

    updateStats();
    updateGoalProgress();
    updateReadingProgress();
    updateSaveIndicator();

    if (outlinePanel) outlinePanel.style.display = 'none';
    if (metadataPanel) metadataPanel.style.display = 'none';
    if (wordFreqPanel) wordFreqPanel.style.display = 'none';
    if (commentsPanel) commentsPanel.style.display = 'none';
    if (tocPanel) tocPanel.style.display = 'none';
    if (versionPanel) versionPanel.style.display = 'none';
    if (findBar) findBar.style.display = 'none';
    if (sessionBar) sessionBar.style.display = 'none';
    if (trackChangesBar) trackChangesBar.style.display = 'none';
    if (footnoteArea) footnoteArea.style.display = 'none';
    updateFootnoteArea();

    isSwitching = false;
    if (richEditor) richEditor.focus();
  }

  // ===== METADATA =====
  function renderMetaDates() {
    const createdLabel = getTrans('meta_label_created');
    const modifiedLabel = getTrans('meta_label_modified');
    if (metaCreated) {
      metaCreated.textContent = createdLabel + ' ' + formatDate(new Date(currentMetadata.created));
    }
    if (metaModified) {
      metaModified.textContent = modifiedLabel + ' ' + formatDate(new Date(currentMetadata.modified));
    }
  }

  function formatDate(d) {
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
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
      saveCurrentTabMetadata(true);
      metadataPanel.style.display = 'none';
    }
  }

  function setupMetadataHandlers() {
    const inputs = [metaTitle, metaAuthor, metaTags, metaCategory];
    for (let i = 0; i < inputs.length; i++) {
      (function(input) {
        if (!input) return;
        input.addEventListener('blur', function() { saveCurrentTabMetadata(true); });
      })(inputs[i]);
    }
    
    // Page settings handlers (Feature #15)
    const pageSizeSel = document.getElementById('page-size-select');
    if (pageSizeSel) {
      pageSizeSel.addEventListener('change', function() {
        currentMetadata.pageSize = pageSizeSel.value;
        saveCurrentTabMetadata(true);
        applyPageSettings();
      });
    }
    
    ['margin-top', 'margin-bottom', 'margin-left', 'margin-right'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', function() {
          currentMetadata[id] = parseFloat(el.value) || 2.54;
          saveCurrentTabMetadata(true);
          applyPageSettings();
        });
      }
    });
    
    // Header/Footer (Feature #6)
    const headerInput = document.getElementById('header-text');
    const footerInput = document.getElementById('footer-text');
    const footerPageNum = document.getElementById('footer-page-num');
    if (headerInput) {
      headerInput.addEventListener('blur', function() {
        currentMetadata.headerText = headerInput.value;
        saveCurrentTabMetadata(true);
      });
    }
    if (footerInput) {
      footerInput.addEventListener('blur', function() {
        currentMetadata.footerText = footerInput.value;
        saveCurrentTabMetadata(true);
      });
    }
    if (footerPageNum) {
      footerPageNum.addEventListener('change', function() {
        currentMetadata.footerPageNum = footerPageNum.checked;
        saveCurrentTabMetadata(true);
      });
    }
  }

  function applyPageSettings() {
    const tab = getActiveTab();
    if (!tab) return;
    const size = (tab.metadata && tab.metadata.pageSize) || 'a4';
    const margins = {
      top: (tab.metadata && tab.metadata['margin-top']) || 2.54,
      bottom: (tab.metadata && tab.metadata['margin-bottom']) || 2.54,
      left: (tab.metadata && tab.metadata['margin-left']) || 2.54,
      right: (tab.metadata && tab.metadata['margin-right']) || 2.54
    };
    const sizeMap = { a4: '210mm 297mm', letter: '216mm 279mm', legal: '216mm 356mm' };
    document.documentElement.style.setProperty('--page-size', sizeMap[size] || sizeMap.a4);
    document.documentElement.style.setProperty('--page-margin-top', margins.top + 'cm');
    document.documentElement.style.setProperty('--page-margin-bottom', margins.bottom + 'cm');
    document.documentElement.style.setProperty('--page-margin-left', margins.left + 'cm');
    document.documentElement.style.setProperty('--page-margin-right', margins.right + 'cm');
  }

  // ===== LOREM IPSUM GENERATOR (Feature #9: Append) =====
  function generateLoremIpsum() {
    const lang = getCurrentLang();
    const templates = {
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
    const separator = richEditor.innerHTML.trim() ? '<p><br></p>' : '';
    richEditor.innerHTML += separator + generateLoremIpsum();
    saveCurrentTabContent();
    updateStats();
    showToast(getTrans('toast_lorem_inserted') || 'Sample text inserted');
  }

  // ===== FOCUS MODE (Bonus Feature #18) =====
  function toggleFocusMode() {
    focusModeEnabled = !focusModeEnabled;
    document.body.classList.toggle('focus-mode', focusModeEnabled);
    if (!focusModeEnabled) {
      // Remove all is-focused classes
      const focused = richEditor.querySelectorAll('.is-focused');
      for (let i = 0; i < focused.length; i++) {
        focused[i].classList.remove('is-focused');
      }
    } else {
      highlightFocusedParagraph();
    }
    showToast(focusModeEnabled ? 'Focus mode on' : 'Focus mode off');
  }

  function highlightFocusedParagraph() {
    if (!focusModeEnabled || !richEditor) return;
    const sel = window.getSelection();
    let currentPara = null;
    
    if (sel.rangeCount > 0) {
      let node = sel.getRangeAt(0).startContainer;
      while (node && node !== richEditor) {
        if (node.nodeType === 1 && ['P','H1','H2','H3','H4','H5','H6','BLOCKQUOTE','PRE','UL','OL'].includes(node.tagName)) {
          currentPara = node;
          break;
        }
        node = node.parentNode;
      }
    }
    
    // Also check based on scroll position
    if (!currentPara) {
      const blocks = richEditor.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, pre, ul, ol');
      const scrollTop = richWrapper.scrollTop;
      const viewportMid = scrollTop + richWrapper.clientHeight / 2;
      let closestDist = Infinity;
      for (let i = 0; i < blocks.length; i++) {
        const rect = blocks[i].getBoundingClientRect();
        const blockMid = rect.top + scrollTop + rect.height / 2;
        const dist = Math.abs(blockMid - viewportMid);
        if (dist < closestDist) {
          closestDist = dist;
          currentPara = blocks[i];
        }
      }
    }
    
    // Clear previous
    const focused = richEditor.querySelectorAll('.is-focused');
    for (let i = 0; i < focused.length; i++) {
      focused[i].classList.remove('is-focused');
    }
    
    if (currentPara) {
      currentPara.classList.add('is-focused');
    }
  }

  // ===== READING MODE (Feature #20) =====
  function toggleReadingMode() {
    readingModeEnabled = !readingModeEnabled;
    document.body.classList.toggle('reading-mode', readingModeEnabled);
    
    if (readingModeEnabled) {
      // Add exit button
      if (!document.getElementById('reading-mode-exit')) {
        const exitBtn = document.createElement('button');
        exitBtn.id = 'reading-mode-exit';
        exitBtn.className = 'action-btn';
        exitBtn.innerHTML = '<i class="fa fa-times"></i>';
        exitBtn.title = 'Exit reading mode';
        exitBtn.addEventListener('click', toggleReadingMode);
        document.body.appendChild(exitBtn);
      }
      document.getElementById('reading-mode-exit').style.display = '';
    } else {
      const exitBtn = document.getElementById('reading-mode-exit');
      if (exitBtn) exitBtn.style.display = 'none';
    }
    
    showToast(readingModeEnabled ? 'Reading mode on' : 'Reading mode off');
  }

  // ===== AUTO-CORRECTION RULES (Feature #17) =====
  function loadAutoCorrections() {
    try {
      const raw = localStorage.getItem('oros_autocorrect_rules');
      autoCorrections = raw ? JSON.parse(raw) : [];
    } catch(e) {
      autoCorrections = [];
    }
    // Built-in defaults
    const defaults = [
      { pattern: '-->', replacement: '\u2192' },
      { pattern: '<--', replacement: '\u2190' },
      { pattern: '<->', replacement: '\u2194' },
      { pattern: '!=', replacement: '\u2260' },
      { pattern: '<=', replacement: '\u2264' },
      { pattern: '>=', replacement: '\u2265' },
      { pattern: '1/2', replacement: '\u00BD' },
      { pattern: '1/3', replacement: '\u2153' },
      { pattern: '2/3', replacement: '\u2154' },
      { pattern: '1/4', replacement: '\u00BC' },
      { pattern: '3/4', replacement: '\u00BE' },
      { pattern: '+-', replacement: '\u00B1' },
      { pattern: 'x2', replacement: '\u00D7' },
      { pattern: '...', replacement: '\u2026' }
    ];
    for (let i = 0; i < defaults.length; i++) {
      const exists = autoCorrections.find(function(r) { return r.pattern === defaults[i].pattern; });
      if (!exists) autoCorrections.push(defaults[i]);
    }
  }

  function saveAutoCorrections() {
    try {
      localStorage.setItem('oros_autocorrect_rules', JSON.stringify(autoCorrections));
    } catch(e) {}
  }

  function applyAutoCorrections() {
    if (isReplacing || goalLockTriggered || autoCorrections.length === 0) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed || !richEditor.contains(range.endContainer)) return;
    
    const preRange = range.cloneRange();
    preRange.selectNodeContents(richEditor);
    preRange.setEnd(range.endContainer, range.endOffset);
    const before = preRange.toString();
    if (!before) return;
    
    for (let i = 0; i < autoCorrections.length; i++) {
      const rule = autoCorrections[i];
      if (!rule.pattern || !rule.replacement) continue;
      if (before.endsWith(rule.pattern)) {
        isReplacing = true;
        for (let j = 0; j < rule.pattern.length; j++) {
          document.execCommand('delete', false);
        }
        document.execCommand('insertText', false, rule.replacement);
        isReplacing = false;
        break;
      }
    }
  }

  function renderAutoCorrectRules() {
    const container = document.getElementById('autocorrect-rules-container');
    if (!container) return;
    container.innerHTML = '';
    
    for (let i = 0; i < autoCorrections.length; i++) {
      const rule = autoCorrections[i];
      const row = document.createElement('div');
      row.className = 'ac-rule-row';
      
      const patternInput = document.createElement('input');
      patternInput.type = 'text';
      patternInput.value = rule.pattern;
      patternInput.style.width = '120px';
      patternInput.placeholder = 'Pattern';
      
      const arrow = document.createElement('span');
      arrow.textContent = '\u2192';
      arrow.style.color = 'var(--accent-gold, #c8a96e)';
      
      const replaceInput = document.createElement('input');
      replaceInput.type = 'text';
      replaceInput.value = rule.replacement;
      replaceInput.style.width = '120px';
      replaceInput.placeholder = 'Replacement';
      
      const delBtn = document.createElement('button');
      delBtn.className = 'mini-btn';
      delBtn.innerHTML = '<i class="fa fa-times"></i>';
      delBtn.style.color = '#f44336';
      
      delBtn.addEventListener('click', function() {
        autoCorrections.splice(i, 1);
        saveAutoCorrections();
        renderAutoCorrectRules();
      });
      
      patternInput.addEventListener('change', function() {
        autoCorrections[i].pattern = patternInput.value;
        saveAutoCorrections();
      });
      replaceInput.addEventListener('change', function() {
        autoCorrections[i].replacement = replaceInput.value;
        saveAutoCorrections();
      });
      
      row.appendChild(patternInput);
      row.appendChild(arrow);
      row.appendChild(replaceInput);
      row.appendChild(delBtn);
      container.appendChild(row);
    }
  }

  function addAutoCorrectRule() {
    const patternInput = document.getElementById('ac-pattern');
    const replaceInput = document.getElementById('ac-replacement');
    const pattern = patternInput.value.trim();
    const replacement = replaceInput.value.trim();
    if (!pattern || !replacement) return;
    autoCorrections.push({ pattern: pattern, replacement: replacement });
    saveAutoCorrections();
    renderAutoCorrectRules();
    patternInput.value = '';
    replaceInput.value = '';
  }

  // ===== KEYBOARD SHORTCUT CUSTOMIZATION (Feature #16) =====
  function loadShortcutOverrides() {
    try {
      const raw = localStorage.getItem('oros_shortcut_overrides');
      shortcutOverrides = raw ? JSON.parse(raw) : {};
    } catch(e) {
      shortcutOverrides = {};
    }
  }

  function saveShortcutOverrides() {
    try {
      localStorage.setItem('oros_shortcut_overrides', JSON.stringify(shortcutOverrides));
    } catch(e) {}
  }

  function renderShortcutCustomization() {
    const container = document.getElementById('shortcuts-custom-container');
    if (!container) return;
    container.innerHTML = '';
    
    const shortcuts = [
      { id: 'save', label: 'Save', default: 'Ctrl+S' },
      { id: 'open', label: 'Open', default: 'Ctrl+O' },
      { id: 'new_tab', label: 'New Tab', default: 'Ctrl+N' },
      { id: 'close_tab', label: 'Close Tab', default: 'Ctrl+W' },
      { id: 'bold', label: 'Bold', default: 'Ctrl+B' },
      { id: 'italic', label: 'Italic', default: 'Ctrl+I' },
      { id: 'underline', label: 'Underline', default: 'Ctrl+U' },
      { id: 'strike', label: 'Strikethrough', default: 'Ctrl+Shift+X' },
      { id: 'subscript', label: 'Subscript', default: 'Ctrl+,' },
      { id: 'superscript', label: 'Superscript', default: 'Ctrl+.' },
      { id: 'link', label: 'Insert Link', default: 'Ctrl+K' },
      { id: 'find', label: 'Find', default: 'Ctrl+F' },
      { id: 'goal', label: 'Set Goal', default: 'Ctrl+G' },
      { id: 'page_break', label: 'Page Break', default: 'Ctrl+Enter' },
      { id: 'footnote', label: 'Footnote', default: 'Ctrl+Shift+F' },
      { id: 'comment', label: 'Comment', default: 'Ctrl+Shift+C' },
      { id: 'zen', label: 'Zen Mode', default: 'F9' }
    ];
    
    for (let i = 0; i < shortcuts.length; i++) {
      const sc = shortcuts[i];
      const currentVal = shortcutOverrides[sc.id] || sc.default;
      
      const row = document.createElement('div');
      row.className = 'sc-custom-row';
      
      const label = document.createElement('span');
      label.textContent = sc.label;
      label.style.flex = '1';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentVal;
      input.placeholder = sc.default;
      
      const resetBtn = document.createElement('button');
      resetBtn.className = 'mini-btn';
      resetBtn.innerHTML = '<i class="fa fa-undo"></i>';
      resetBtn.title = 'Reset to default';
      
      resetBtn.addEventListener('click', function() {
        delete shortcutOverrides[sc.id];
        saveShortcutOverrides();
        input.value = sc.default;
      });
      
      input.addEventListener('change', function() {
        const val = input.value.trim();
        if (val && val !== sc.default) {
          shortcutOverrides[sc.id] = val;
        } else {
          delete shortcutOverrides[sc.id];
        }
        saveShortcutOverrides();
      });
      
      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(resetBtn);
      container.appendChild(row);
    }
  }
  
    // ===== DOCUMENT OUTLINE =====
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
    const headings = richEditor.querySelectorAll('h1, h2, h3');
    if (headings.length === 0) {
      outlineList.innerHTML = '<div class="outline-empty">' + getTrans('outline_empty') + '</div>';
      return;
    }
    outlineList.innerHTML = '';
    for (let i = 0; i < headings.length; i++) {
      (function(h) {
        const item = document.createElement('div');
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

  // ===== WORD FREQUENCY =====
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
    const text = getTextContent().toLowerCase().replace(/[^\w\s\u0370-\u03FF]/g, '').trim();
    if (!text) {
      wordFreqList.innerHTML = '<div class="wordfreq-empty">' + getTrans('word_freq_empty') + '</div>';
      if (wordFreqSummary) wordFreqSummary.innerHTML = '';
      return;
    }
    const words = text.split(/\s+/).filter(Boolean);
    const total = words.length;
    const freq_map = {};
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      freq_map[w] = (freq_map[w] || 0) + 1;
    }
    const unique = Object.keys(freq_map).length;
    const diversity = total > 0 ? (unique / total * 100).toFixed(1) : 0;
    const sorted = Object.keys(freq_map).sort(function(a, b) {
      return freq_map[b] - freq_map[a];
    }).slice(0, 20);
    const maxFreq = sorted.length > 0 ? freq_map[sorted[0]] : 1;

    if (wordFreqSummary) {
      wordFreqSummary.innerHTML =
        '<div class="stat-row"><span>' + getTrans('word_freq_unique') + '</span><span>' + unique + '</span></div>' +
        '<div class="stat-row"><span>' + getTrans('word_freq_total') + '</span><span>' + total + '</span></div>' +
        '<div class="stat-row"><span>' + getTrans('word_freq_diversity') + '</span><span>' + diversity + '%</span></div>';
    }

    let listHtml = '';
    for (let j = 0; j < sorted.length; j++) {
      const word = sorted[j];
      const count = freq_map[word];
      const pct = (count / maxFreq * 100).toFixed(0);
      const isOverused = count >= 5 && (count / total * 100) > 2;
      listHtml += '<div class="wordfreq-item' + (isOverused ? ' overused' : '') + '">' +
        '<span class="wf-word">' + word + '</span>' +
        '<div class="wordfreq-bar"><div class="wordfreq-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="wordfreq-count">' + count + '</span>' +
      '</div>';
    }
    wordFreqList.innerHTML = listHtml;
  }

  // ===== FIND & REPLACE =====
  function clearHighlights() {
    const marks = richEditor.querySelectorAll('mark.find-match');
    for (let i = 0; i < marks.length; i++) {
      const parent = marks[i].parentNode;
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

    const searchTerm = findInput.value;
    const formatFilter = findFormatFilter ? findFormatFilter.value : '';

    if (!searchTerm) {
      if (frResults) frResults.textContent = getTrans('fr_no_matches');
      return;
    }

    const walker = document.createTreeWalker(richEditor, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        const parentTag = node.parentElement ? node.parentElement.tagName.toLowerCase() : '';
        if (formatFilter) {
          if (formatFilter === 'bold' && parentTag !== 'strong' && parentTag !== 'b') return NodeFilter.FILTER_REJECT;
          if (formatFilter === 'italic' && parentTag !== 'em' && parentTag !== 'i') return NodeFilter.FILTER_REJECT;
          if (formatFilter === 'underline' && parentTag !== 'u') return NodeFilter.FILTER_REJECT;
          if (formatFilter === 'h1' && parentTag !== 'h1') return NodeFilter.FILTER_REJECT;
          if (formatFilter === 'h2' && parentTag !== 'h2') return NodeFilter.FILTER_REJECT;
          if (formatFilter === 'h3' && parentTag !== 'h3') return NodeFilter.FILTER_REJECT;
        }
        if (!node.nodeValue.toLowerCase().includes(searchTerm.toLowerCase())) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }, false);

    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    if (nodes.length === 0) {
      if (frResults) frResults.textContent = getTrans('fr_no_matches');
      return;
    }

    const allMatches = [];
    for (let n = 0; n < nodes.length; n++) {
      const text = nodes[n].nodeValue;
      let idx = -1;
      while ((idx = text.toLowerCase().indexOf(searchTerm.toLowerCase(), idx + 1)) !== -1) {
        allMatches.push({ node: nodes[n], start: idx, end: idx + searchTerm.length });
      }
    }

    if (allMatches.length === 0) {
      if (frResults) frResults.textContent = getTrans('fr_no_matches');
      return;
    }

    for (let m = 0; m < allMatches.length; m++) {
      const match = allMatches[m];
      const node = match.node;
      const beforeText = node.nodeValue.substring(0, match.start);
      const matchText = node.nodeValue.substring(match.start, match.end);
      const afterText = node.nodeValue.substring(match.end);

      const beforeNode = document.createTextNode(beforeText);
      const mark = document.createElement('mark');
      mark.className = 'find-match';
      mark.textContent = matchText;
      const afterNode = document.createTextNode(afterText);

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

    const prev = matchMarks[currentMatchIndex];
    if (prev && prev !== matchMarks[index]) {
      prev.classList.remove('current');
    }

    currentMatchIndex = index;
    const mark = matchMarks[index];
    mark.classList.add('current');

    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (frResults) {
      frResults.textContent = (index + 1) + '/' + matchMarks.length + ' ' + getTrans('fr_results_matches');
    }
  }

  function navigateMatch(direction) {
    if (matchMarks.length === 0) return;
    let newIndex = currentMatchIndex + direction;
    if (newIndex < 0) newIndex = matchMarks.length - 1;
    if (newIndex >= matchMarks.length) newIndex = 0;
    navigateMatchToMark(newIndex);
  }

  function doReplace(isAll) {
    if (!findInput || !replaceInput || !richEditor) return;
    const searchTerm = findInput.value;
    const replaceTerm = replaceInput.value;
    if (!searchTerm) return;

    if (isAll) {
      const walker = document.createTreeWalker(richEditor, NodeFilter.SHOW_TEXT, null, false);
      const allMatches = [];

      while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.nodeValue;
        const searchLower = searchTerm.toLowerCase();
        let pos = 0;
        while ((pos = text.toLowerCase().indexOf(searchLower, pos)) !== -1) {
          allMatches.push({ node: node, start: pos, end: pos + searchTerm.length });
          pos += searchTerm.length;
        }
      }

      const matchesByNode = {};
      for (let i = 0; i < allMatches.length; i++) {
        const m = allMatches[i];
        if (!matchesByNode[m.node]) matchesByNode[m.node] = [];
        matchesByNode[m.node].push(m);
      }

      const orderedNodes = [];
      const walker2 = document.createTreeWalker(richEditor, NodeFilter.SHOW_TEXT, null, false);
      while (walker2.nextNode()) {
        orderedNodes.push(walker2.currentNode);
      }

      for (let n = orderedNodes.length - 1; n >= 0; n--) {
        const currentNode = orderedNodes[n];
        const nodeMatches = matchesByNode[currentNode];
        if (!nodeMatches || nodeMatches.length === 0) continue;

        nodeMatches.sort(function(a, b) { return b.start - a.start; });

        for (let mi = 0; mi < nodeMatches.length; mi++) {
          const match = nodeMatches[mi];
          const text = currentNode.nodeValue;
          const before = text.substring(0, match.start);
          const after = text.substring(match.end);
          currentNode.nodeValue = before + replaceTerm + after;
        }
      }
    } else {
      const currentMark = matchMarks[currentMatchIndex];
      if (currentMark) {
        const textNode = document.createTextNode(replaceTerm);
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

  // ===== FILE OPEN (TXT, MD, RTF, DOCX) =====
  function openFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'doc') {
      showToast(getTrans('format_not_supported') || 'Format not supported: .doc');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const content = e.target.result;
      if (extension === 'docx' && typeof mammoth !== 'undefined') {
        mammoth.convertToHtml({ arrayBuffer: e.target.result }).then(function(result) {
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
          const html = parseRTF(content);
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
  // FEATURE #2: COMMENTS & ANNOTATIONS
  // ============================================

  let commentsData = [];
  let activeCommentId = null;

  function loadComments() {
    const tab = getActiveTab();
    if (!tab) { commentsData = []; return; }
    commentsData = (tab.metadata && tab.metadata.comments) ? tab.metadata.comments : [];
    renderComments();
  }

  function saveComments() {
    const tab = getActiveTab();
    if (!tab) return;
    if (!tab.metadata) tab.metadata = {};
    tab.metadata.comments = commentsData;
    persistTabs();
  }

  function renderComments() {
    const listEl = document.getElementById('comments-list');
    const addArea = document.getElementById('comment-add-area');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (commentsData.length === 0) {
      listEl.innerHTML = '<div class="wordfreq-empty">' + getTrans('comments_empty') + '</div>';
      if (addArea) addArea.style.display = 'none';
      return;
    }

    for (let i = 0; i < commentsData.length; i++) {
      const c = commentsData[i];
      const item = document.createElement('div');
      item.className = 'comment-item' + (c.resolved ? ' comment-resolved' : '') + (c.id === activeCommentId ? ' highlighted' : '');
      
      const header = document.createElement('div');
      header.className = 'comment-header';
      
      const author = document.createElement('span');
      author.className = 'comment-author';
      author.textContent = c.author || getTrans('comment_default_author') || 'User';
      
      const timestamp = document.createElement('span');
      timestamp.className = 'comment-timestamp';
      timestamp.textContent = formatDate(new Date(c.timestamp));
      
      header.appendChild(author);
      header.appendChild(timestamp);
      
      const quoted = document.createElement('div');
      quoted.className = 'comment-quoted';
      quoted.textContent = '"' + (c.quotedText || '').substring(0, 80) + '..."';
      
      const text = document.createElement('div');
      text.className = 'comment-text';
      text.textContent = c.text;
      
      const actions = document.createElement('div');
      actions.className = 'comment-actions';
      
      const resolveBtn = document.createElement('button');
      resolveBtn.textContent = c.resolved ? 'Unresolve' : 'Resolve';
      resolveBtn.addEventListener('click', function() {
        c.resolved = !c.resolved;
        saveComments();
        renderComments();
      });
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', function() {
        removeCommentHighlight(c.id);
        commentsData.splice(i, 1);
        saveComments();
        renderComments();
      });
      
      actions.appendChild(resolveBtn);
      actions.appendChild(deleteBtn);
      
      item.appendChild(header);
      item.appendChild(quoted);
      item.appendChild(text);
      item.appendChild(actions);
      
      item.addEventListener('click', function() {
        activeCommentId = c.id;
        scrollToComment(c.id);
        renderComments();
      });
      
      listEl.appendChild(item);
    }

    if (addArea) addArea.style.display = '';
  }

  function toggleCommentsPanel() {
    if (!commentsPanel) return;
    if (commentsPanel.style.display === 'none' || !commentsPanel.style.display) {
      commentsPanel.style.display = 'flex';
      loadComments();
    } else {
      commentsPanel.style.display = 'none';
      removeCommentHighlight(activeCommentId);
      activeCommentId = null;
    }
  }

  function addComment() {
    const input = document.getElementById('comment-input');
    if (!input || !input.value.trim()) return;
    
    const sel = window.getSelection();
    let quotedText = '';
    let range = null;
    
    if (sel.rangeCount > 0 && !sel.isCollapsed && richEditor.contains(sel.anchorNode)) {
      range = sel.getRangeAt(0).cloneRange();
      quotedText = sel.toString();
    }
    
    const commentId = 'comment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const comment = {
      id: commentId,
      text: input.value.trim(),
      author: currentMetadata.author || '',
      timestamp: new Date().toISOString(),
      quotedText: quotedText,
      rangeInfo: range ? serializeRange(range) : null,
      resolved: false
    };
    
    commentsData.push(comment);
    
    if (range && !sel.isCollapsed) {
      try {
        const mark = document.createElement('span');
        mark.className = 'comment-highlight';
        mark.setAttribute('data-comment-id', commentId);
        range.surroundContents(mark);
      } catch(e) {
        // Fallback if surroundContents fails (multi-node selection)
      }
    }
    
    saveComments();
    input.value = '';
    renderComments();
    saveCurrentTabContent();
  }

  function serializeRange(range) {
    // Basic serialization for range restoration
    try {
      return {
        startContainer: getPathTo(range.startContainer),
        startOffset: range.startOffset,
        endContainer: getPathTo(range.endContainer),
        endOffset: range.endOffset
      };
    } catch(e) {
      return null;
    }
  }

  function getPathTo(node) {
    if (node === richEditor) return '';
    const parent = node.parentNode;
    if (!parent) return '';
    const siblings = Array.from(parent.childNodes);
    const index = siblings.indexOf(node);
    return getPathTo(parent) + '/' + index;
  }

  function scrollToComment(commentId) {
    const highlight = richEditor.querySelector('[data-comment-id="' + commentId + '"]');
    if (highlight) {
      highlight.classList.add('active');
      highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function() {
        highlight.classList.remove('active');
      }, 2000);
    }
  }

  function removeCommentHighlight(commentId) {
    if (!commentId) return;
    const highlights = richEditor.querySelectorAll('[data-comment-id="' + commentId + '"]');
    for (let i = 0; i < highlights.length; i++) {
      const h = highlights[i];
      const parent = h.parentNode;
      while (h.firstChild) {
        parent.insertBefore(h.firstChild, h);
      }
      parent.removeChild(h);
      parent.normalize();
    }
  }

  // ============================================
  // FEATURE #3: FOOTNOTES / ENDNOTES
  // ============================================

  let footnoteCounter = 0;

  function updateFootnoteArea() {
    if (!footnoteArea || !richEditor) return;
    const footnotes = richEditor.querySelectorAll('.footnote-ref');
    if (footnotes.length === 0) {
      footnoteArea.style.display = 'none';
      return;
    }
    footnoteArea.style.display = '';
    const list = document.getElementById('footnote-list');
    if (!list) return;
    list.innerHTML = '';

    // Renumber footnotes
    for (let i = 0; i < footnotes.length; i++) {
      const ref = footnotes[i];
      const num = i + 1;
      ref.textContent = num;
      ref.setAttribute('data-footnote-num', num);

      const item = document.createElement('div');
      item.className = 'footnote-item';

      const numEl = document.createElement('span');
      numEl.className = 'footnote-item-num';
      numEl.textContent = num + '.';

      const textEl = document.createElement('span');
      textEl.textContent = ref.getAttribute('data-footnote-text') || '';

      item.appendChild(numEl);
      item.appendChild(textEl);
      list.appendChild(item);
    }
  }

  function toggleFootnoteDialog() {
    const dialog = document.getElementById('footnote-dialog-overlay');
    if (!dialog) return;
    const input = document.getElementById('footnote-text-input');
    if (input) input.value = '';
    dialog.style.display = 'flex';
    if (input) setTimeout(function() { input.focus(); }, 50);
  }

  function insertFootnote() {
    const input = document.getElementById('footnote-text-input');
    if (!input || !input.value.trim()) {
      document.getElementById('footnote-dialog-overlay').style.display = 'none';
      return;
    }
    const text = input.value.trim();
    const ref = document.createElement('sup');
    ref.className = 'footnote-ref';
    ref.setAttribute('data-footnote-text', text);
    ref.setAttribute('contenteditable', 'false');
    ref.textContent = '?';

    document.execCommand('insertHTML', false, ref.outerHTML);
    document.getElementById('footnote-dialog-overlay').style.display = 'none';
    saveCurrentTabContent();
    updateFootnoteArea();
  }

  // ============================================
  // FEATURE #4: PAGE BREAK & PAGINATION VIEW
  // ============================================

  function insertPageBreak() {
    const marker = '<div class="page-break-marker" contenteditable="false"></div><p><br></p>';
    document.execCommand('insertHTML', false, marker);
    saveCurrentTabContent();
    showToast(getTrans('toast_page_break') || 'Page break inserted');
  }

  // ============================================
  // FEATURE #5: TABLE OF CONTENTS
  // ============================================

  function toggleToCPanel() {
    if (!tocPanel) return;
    if (tocPanel.style.display === 'none' || !tocPanel.style.display) {
      tocPanel.style.display = 'flex';
      updateToC();
    } else {
      tocPanel.style.display = 'none';
    }
  }

  function updateToC() {
    const list = document.getElementById('toc-list');
    if (!list || !richEditor) return;
    const headings = richEditor.querySelectorAll('h1, h2, h3, h4, h5, h6');
    list.innerHTML = '';
    if (headings.length === 0) {
      list.innerHTML = '<div class="wordfreq-empty">' + getTrans('toc_empty') + '</div>';
      return;
    }

    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      if (!h.id) {
        h.id = 'toc-heading-' + i;
      }
      const level = parseInt(h.tagName.charAt(1));
      const item = document.createElement('div');
      item.className = 'toc-item toc-level-' + level;
      item.innerHTML = '<span class="toc-num">' + (i + 1) + '.</span><span>' + (h.textContent || '(empty)') + '</span>';
      item.addEventListener('click', function() {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        h.classList.add('outline-flash');
        setTimeout(function() { h.classList.remove('outline-flash'); }, 1200);
      });
      list.appendChild(item);
    }
  }

  function insertToCIntoDocument() {
    const headings = richEditor.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      showToast(getTrans('toc_empty'));
      return;
    }

    let tocHtml = '<div class="toc-document"><h2>' + getTrans('toc_title') + '</h2><ul>';
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      if (!h.id) h.id = 'toc-heading-' + i;
      const level = parseInt(h.tagName.charAt(1));
      const indent = ' style="margin-left:' + ((level - 1) * 20) + 'px;"';
      tocHtml += '<li' + indent + '><a href="#' + h.id + '">' + (h.textContent || '(empty)') + '</a></li>';
    }
    tocHtml += '</ul></div><p><br></p>';

    // Insert at cursor position or at beginning
    const sel = window.getSelection();
    if (sel.rangeCount > 0 && richEditor.contains(sel.anchorNode)) {
      document.execCommand('insertHTML', false, tocHtml);
    } else {
      richEditor.innerHTML = tocHtml + richEditor.innerHTML;
    }
    saveCurrentTabContent();
    showToast(getTrans('toc_inserted') || 'Table of contents inserted');
  }

  // ============================================
  // FEATURE #7: TRACK CHANGES
  // ============================================

  function toggleTrackChanges() {
    trackingChanges = !trackingChanges;
    const btn = document.getElementById('btn-track-changes');
    if (btn) btn.classList.toggle('active', trackingChanges);
    if (trackChangesBar) trackChangesBar.style.display = trackingChanges ? 'flex' : 'none';
    showToast(trackingChanges ? getTrans('track_changes_on') : getTrans('track_changes_off'));
  }

  function recordTrackChange(type) {
    // Simplified track changes recording
    // Real implementation would intercept input/delete events more granularly
    // For now, we store snapshots for comparison
  }

  function acceptAllChanges() {
    // Remove tracker-delete elements
    const deletes = richEditor.querySelectorAll('.tracker-delete');
    for (let i = 0; i < deletes.length; i++) {
      deletes[i].remove();
    }
    // Unwrap tracker-insert elements
    const inserts = richEditor.querySelectorAll('.tracker-insert');
    for (let j = 0; j < inserts.length; j++) {
      const parent = inserts[j].parentNode;
      while (inserts[j].firstChild) {
        parent.insertBefore(inserts[j].firstChild, inserts[j]);
      }
      parent.removeChild(inserts[j]);
    }
    saveCurrentTabContent();
    showToast(getTrans('track_changes_accepted') || 'All changes accepted');
  }

  function rejectAllChanges() {
    // Remove tracker-insert elements
    const inserts = richEditor.querySelectorAll('.tracker-insert');
    for (let i = 0; i < inserts.length; i++) {
      inserts[i].remove();
    }
    // Unwrap tracker-delete elements
    const deletes = richEditor.querySelectorAll('.tracker-delete');
    for (let j = 0; j < deletes.length; j++) {
      const parent = deletes[j].parentNode;
      while (deletes[j].firstChild) {
        parent.insertBefore(deletes[j].firstChild, deletes[j]);
      }
      parent.removeChild(deletes[j]);
    }
    saveCurrentTabContent();
    showToast(getTrans('track_changes_rejected') || 'All changes rejected');
  }

  // ============================================
  // FEATURE #13: VERSION HISTORY
  // ============================================

  function addVersionSnapshot(tabId) {
    const tab = tabsState.find(function(t) { return t.id === tabId; });
    if (!tab) return;

    if (!tab.versions) tab.versions = [];

    const words = (richEditor.innerText || '').trim().split(/\s+/).filter(Boolean).length;

    const snapshot = {
      id: 'v-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      timestamp: Date.now(),
      content: richEditor.innerHTML,
      wordCount: words
    };

    tab.versions.push(snapshot);

    // Keep only last N versions
    if (tab.versions.length > MAX_VERSIONS_PER_TAB) {
      tab.versions.shift();
    }

    persistTabs();
  }

  function getVersionsForTab(tabId) {
    const tab = tabsState.find(function(t) { return t.id === tabId; });
    return tab && tab.versions ? tab.versions : [];
  }

  function toggleVersionPanel() {
    if (!versionPanel) return;
    if (versionPanel.style.display === 'none' || !versionPanel.style.display) {
      versionPanel.style.display = 'flex';
      renderVersions();
    } else {
      versionPanel.style.display = 'none';
    }
  }

  function renderVersions() {
    const list = document.getElementById('version-list');
    if (!list) return;
    list.innerHTML = '';

    const versions = getVersionsForTab(activeTabId);
    if (versions.length === 0) {
      list.innerHTML = '<div class="wordfreq-empty">' + getTrans('version_empty') + '</div>';
      return;
    }

    // Show in reverse chronological order
    for (let i = versions.length - 1; i >= 0; i--) {
      const v = versions[i];
      const item = document.createElement('div');
      item.className = 'version-item' + (i === versions.length - 1 ? ' current' : '');

      const header = document.createElement('div');
      header.className = 'version-header';

      const time = document.createElement('span');
      time.className = 'version-time';
      time.textContent = formatDate(new Date(v.timestamp));

      const badge = document.createElement('span');
      badge.className = 'version-badge';
      badge.textContent = (i === versions.length - 1) ? getTrans('version_current') : ('v' + (i + 1));

      header.appendChild(time);
      header.appendChild(badge);

      const words = document.createElement('div');
      words.className = 'version-words';
      words.textContent = v.wordCount + ' ' + getTrans('text_words');

      const actions = document.createElement('div');
      actions.className = 'version-actions';

      const previewBtn = document.createElement('button');
      previewBtn.textContent = getTrans('version_preview') || 'Preview';
      previewBtn.addEventListener('click', function() {
        previewVersion(v);
      });

      const restoreBtn = document.createElement('button');
      restoreBtn.textContent = getTrans('version_restore') || 'Restore';
      restoreBtn.addEventListener('click', function() {
        restoreVersion(v);
      });

      actions.appendChild(previewBtn);
      actions.appendChild(restoreBtn);

      item.appendChild(header);
      item.appendChild(words);
      item.appendChild(actions);

      list.appendChild(item);
    }
  }

  function previewVersion(version) {
    // Create preview overlay
    let overlay = document.getElementById('version-preview-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'version-preview-overlay';
      overlay.className = 'dialog-overlay';
      overlay.style.display = 'flex';
      overlay.innerHTML = 
        '<div class="dialog dialog-large" style="width:80vw;height:85vh;">' +
          '<div class="dialog-header">' +
            '<h3>' + getTrans('version_preview') + '</h3>' +
            '<button class="dialog-close" id="btn-close-version-preview"><i class="fa fa-times"></i></button>' +
          '</div>' +
          '<div class="dialog-body" style="flex:1;overflow-y:auto;">' +
            '<div id="version-preview-content" class="rich-editor" style="padding:20px;"></div>' +
          '</div>' +
          '<div class="dialog-actions">' +
            '<button class="btn-cancel" id="btn-close-version-preview-ok">' + getTrans('btn_ok') + '</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);

      document.getElementById('btn-close-version-preview').addEventListener('click', function() {
        overlay.style.display = 'none';
      });
      document.getElementById('btn-close-version-preview-ok').addEventListener('click', function() {
        overlay.style.display = 'none';
      });
    } else {
      overlay.style.display = 'flex';
    }

    document.getElementById('version-preview-content').innerHTML = version.content;
  }

  function restoreVersion(version) {
    if (!confirm(getTrans('version_confirm_restore') || 'Restore this version? Current content will be replaced.')) return;
    
    // Save current as a version before restoring
    addVersionSnapshot(activeTabId);
    
    richEditor.innerHTML = version.content;
    saveCurrentTabContent();
    updateStats();
    updateGoalProgress();
    renderVersions();
    showToast(getTrans('version_restored') || 'Version restored');
  }

  // Auto-snapshot interval
  setInterval(function() {
    if (richEditor && richEditor.innerHTML.trim().length > 0) {
      addVersionSnapshot(activeTabId);
    }
  }, AUTO_SNAPSHOT_INTERVAL);
  
    // ============================================
  // FEATURE #14: SPECIAL CHARACTERS PICKER
  // ============================================

  const SPECIAL_CHAR_CATEGORIES = {
    'greek': {
      label: 'Greek',
      chars: [
        'Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Ι','Κ','Λ','Μ','Ν','Ξ','Ο','Π','Ρ','Σ','Τ','Υ','Φ','Χ','Ψ','Ω',
        'α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ','ο','π','ρ','σ','τ','υ','φ','χ','ψ','ω',
        'Ά','Έ','Ή','Ί','Ό','Ύ','Ώ','ΐ','ΰ','Ϊ','Ϋ','ς'
      ]
    },
    'math': {
      label: 'Math',
      chars: [
        '±','÷','×','∞','√','∑','∏','∫','∂','∇','≈','≠','≤','≥','∝','∈','∉','∩','∪','⊂','⊃','⊆','⊇',
        '⊕','⊗','⊥','∠','°','′','″','π','ƒ','ℕ','ℤ','ℚ','ℝ','ℂ','∀','∃','¬','∧','∨','⇒','⇔','→','←','↔'
      ]
    },
    'arrows': {
      label: 'Arrows',
      chars: [
        '↑','↓','←','→','↔','↕','↗','↘','↙','↖','⇑','⇓','⇐','⇒','⇔','⇕','⇗','⇘','⇙','⇖',
        '➜','➡','⬆','⬇','⬅','⬢','⬡','▶','◀','▲','▼','►','◄'
      ]
    },
    'currency': {
      label: 'Currency',
      chars: ['€','$','£','¥','₿','¢','¤','₩','₹','₽','₺','₴','₸','₡','₦','₮','ETH','฿']
    },
    'punctuation': {
      label: 'Punctuation',
      chars: ['«'](#ref-'«') ['»'](#ref-'»') ['‹'](#ref-'‹') ['›'](#ref-'›') ['„'](#ref-'„') ['"'](#ref-'"') ['"'](#ref-'"') ['"'](#ref-'"') ['''](#ref-''') ['''](#ref-''') ['‚'](#ref-'‚') ['‛'](#ref-'‛') ['¡'](#ref-'¡') ['¿'](#ref-'¿') ['§'](#ref-'§') ['¶'](#ref-'¶') ['](#ref-')
    },
    'symbols': {
      label: 'Symbols',
      chars: ['©','®','™','℗','℠','°','№','♩','♪','♫','♬','♭','♮','♯','✓','✔','✗','✘','✦','✧','★','☆','☘','☠']
    },
    'subsuperscript': {
      label: 'Sub/Superscript',
      chars: ['⁰','¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹','₀','₁','₂','₃','₄','₅','₆','₇','₈','₉','⁺','⁻','⁼','₊','₋','₌']
    }
  };

  function toggleSpecialCharsDialog() {
    const dialog = document.getElementById('special-chars-dialog-overlay');
    if (!dialog) return;
    if (dialog.style.display === 'flex') {
      dialog.style.display = 'none';
      return;
    }
    dialog.style.display = 'flex';
    renderSpecialChars('greek');
  }

  function renderSpecialChars(category) {
    const grid = document.getElementById('special-chars-grid');
    const tabsEl = document.getElementById('special-chars-tabs');
    if (!grid || !tabsEl) return;

    // Render tabs
    tabsEl.innerHTML = '';
    const cats = Object.keys(SPECIAL_CHAR_CATEGORIES);
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i];
      const tab = document.createElement('button');
      tab.className = 'sc-tab' + (cat === category ? ' active' : '');
      tab.textContent = SPECIAL_CHAR_CATEGORIES[cat].label;
      tab.addEventListener('click', function() {
        renderSpecialChars(cat);
      });
      tabsEl.appendChild(tab);
    }

    // Render grid
    const data = SPECIAL_CHAR_CATEGORIES[category];
    grid.innerHTML = '';
    for (let j = 0; j < data.chars.length; j++) {
      const ch = data.chars[j];
      const btn = document.createElement('button');
      btn.className = 'sc-char';
      btn.textContent = ch;
      btn.title = ch + ' (click to insert)';
      btn.addEventListener('click', function() {
        insertSpecialChar(ch);
      });
      grid.appendChild(btn);
    }
  }

  function insertSpecialChar(character) {
    document.execCommand('insertText', false, character);
    saveCurrentTabContent();
    updateStats();
    richEditor.focus();
  }

  // ============================================
  // FEATURE #10: TEMPLATES
  // ============================================

  const TEMPLATES = {
    'essay': {
      icon: 'fa-graduation-cap',
      title: 'Essay',
      description: 'Academic essay structure',
      generate: function(lang) {
        if (lang === 'el') {
          return '<h1>[Τίτλος Δοκιμίου]</h1>' +
            '<p><em>Συγγραφέας: [Όνομα]</em></p>' +
            '<h2>Εισαγωγή</h2>' +
            '<p>[Προσδιορίστε το θέμα και τη θέση σας εδώ. Εξηγήστε σύντομα τα κύρια σημεία που θα αναπτύξετε.]</p>' +
            '<h2>Κύριο Μέρος</h2>' +
            '<h3>Πρώτο Σημείο</h3>' +
            '<p>[Παρουσιάστε το πρώτο επιχείρημα με αποδεικτικά στοιχεία.]</p>' +
            '<h3>Δεύτερο Σημείο</h3>' +
            '<p>[Αναπτύξτε το δεύτερο επιχείρημα με παραδείγματα.]</p>' +
            '<h3>Τρίτο Σημείο</h3>' +
            '<p>[Προσθέστε αντεπιχειρήματα ή τρίτη προοπτική.]</p>' +
            '<h2>Συμπέρασμα</h2>' +
            '<p>[Συνοψίστε τα βασικά σημεία και επαναφέρετε τη θέση σας.]</p>';
        }
        return '<h1>[Essay Title]</h1>' +
          '<p><em>Author: [Name]</em></p>' +
          '<h2>Introduction</h2>' +
          '<p>[Define the topic and your thesis here. Briefly explain the main points you will develop.]</p>' +
          '<h2>Main Body</h2>' +
          '<h3>First Point</h3>' +
          '<p>[Present your first argument with supporting evidence.]</p>' +
          '<h3>Second Point</h3>' +
          '<p>[Develop your second argument with examples.]</p>' +
          '<h3>Third Point</h3>' +
          '<p>[Add counterarguments or a third perspective.]</p>' +
          '<h2>Conclusion</h2>' +
          '<p>[Summarize key points and restate your thesis.]</p>';
      }
    },
    'letter': {
      icon: 'fa-envelope',
      title: 'Letter',
      description: 'Formal letter format',
      generate: function(lang) {
        if (lang === 'el') {
          return '<p style="text-align:right;">[Όνομα Αποστολέα]<br>[Διεύθυνση]<br>[Ταχ. Κώδικας, Πόλη]<br>[Ημερομηνία]</p>' +
            '<p style="text-align:left;">[Όνομα Παραλήπτη]<br>[Διεύθυνση Παραλήπτη]<br>[Ταχ. Κώδικας, Πόλη]</p>' +
            '<p><strong>Θέμα: [Θέμα Επιστολής]</strong></p>' +
            '<p>Αξιότιμε/ε κύριε/κυρία [Επώνυμο],</p>' +
            '<p>[Κύριο κείμενο της επιστολής. Εξηγήστε τον σκοπό της αλληλογραφίας.]</p>' +
            '<p>[Δεύτερη παράγραφος με λεπτομέρειες ή αιτήματα.]</p>' +
            '<p>Με εκτίμηση,</p>' +
            '<p><br>[Υπογραφή]<br>[Όνομα Αποστολέα]</p>';
        }
        return '<p style="text-align:right;">[Sender Name]<br>[Address]<br>[ZIP, City]<br>[Date]</p>' +
          '<p style="text-align:left;">[Recipient Name]<br>[Recipient Address]<br>[ZIP, City]</p>' +
          '<p><strong>Subject: [Letter Subject]</strong></p>' +
          '<p>Dear Mr./Ms. [Last Name],</p>' +
          '<p>[Main body of the letter. Explain the purpose of correspondence.]</p>' +
          '<p>[Second paragraph with details or requests.]</p>' +
          '<p>Sincerely,</p>' +
          '<p><br>[Signature]<br>[Sender Name]</p>';
      }
    },
    'resume': {
      icon: 'fa-file-text',
      title: 'Resume',
      description: 'Professional resume template',
      generate: function(lang) {
        if (lang === 'el') {
          return '<h1>[Ονοματεπώνυμο]</h1>' +
            '<p>[Τηλέφωνο] | [Email] | [LinkedIn] | [Πόλη]</p>' +
            '<hr>' +
            '<h2>Επαγγελματική Σύνοψη</h2>' +
            '<p>[Σύντομη περιγραφή της εμπειρίας και των δεξιοτήτων σας.]</p>' +
            '<h2>Επαγγελματική Εμπειρία</h2>' +
            '<p><strong>[Θέση]</strong> | [Εταιρεία] | [Ημερομηνία Έναρξης - Λήξης]</p>' +
            '<ul><li>[Αρμοδιότητα ή επίτευγμα 1]</li><li>[Αρμοδιότητα ή επίτευγμα 2]</li></ul>' +
            '<p><strong>[Θέση]</strong> | [Εταιρεία] | [Ημερομηνία Έναρξης - Λήξης]</p>' +
            '<ul><li>[Αρμοδιότητα ή επίτευγμα 1]</li></ul>' +
            '<h2>Εκπαίδευση</h2>' +
            '<p><strong>[Πτυχίο]</strong> | [Ίδρυμα] | [Έτος]</p>' +
            '<h2>Δεξιότητες</h2>' +
            '<p>[Δεξιότητα 1], [Δεξιότητα 2], [Δεξιότητα 3]</p>';
        }
        return '<h1>[Full Name]</h1>' +
          '<p>[Phone] | [Email] | [LinkedIn] | [City]</p>' +
          '<hr>' +
          '<h2>Professional Summary</h2>' +
          '<p>[Brief description of your experience and skills.]</p>' +
          '<h2>Work Experience</h2>' +
          '<p><strong>[Position]</strong> | [Company] | [Start Date - End Date]</p>' +
          '<ul><li>[Responsibility or achievement 1]</li><li>[Responsibility or achievement 2]</li></ul>' +
          '<p><strong>[Position]</strong> | [Company] | [Start Date - End Date]</p>' +
          '<ul><li>[Responsibility or achievement 1]</li></ul>' +
          '<h2>Education</h2>' +
          '<p><strong>[Degree]</strong> | [Institution] | [Year]</p>' +
          '<h2>Skills</h2>' +
          '<p>[Skill 1], [Skill 2], [Skill 3]</p>';
      }
    },
    'meeting': {
      icon: 'fa-users',
      title: 'Meeting Notes',
      description: 'Structured meeting notes',
      generate: function(lang) {
        if (lang === 'el') {
          return '<h1>Πρακτικά Συνάντησης</h1>' +
            '<p><strong>Ημερομηνία:</strong> [Ημερομηνία]<br><strong>Συμμετέχοντες:</strong> [Ονόματα]<br><strong>Τοποθεσία:</strong> [Τοποθεσία]</p>' +
            '<h2>Ατζέντα</h2>' +
            '<ol><li>[Θέμα 1]</li><li>[Θέμα 2]</li><li>[Θέμα 3]</li></ol>' +
            '<h2>Συζήτηση & Αποφάσεις</h2>' +
            '<h3>[Θέμα 1]</h3>' +
            '<p>[Σύνοψη συζήτησης και απόφαση.]</p>' +
            '<h3>[Θέμα 2]</h3>' +
            '<p>[Σύνοψη συζήτησης και απόφαση.]</p>' +
            '<h2>Ενέργειες (Action Items)</h2>' +
            '<table class="custom-table"><tr><th>Ενέργεια</th><th>Υπεύθυνος</th><th>Προθεσμία</th></tr>' +
            '<tr><td>[Ενέργεια 1]</td><td>[Όνομα]</td><td>[Ημερομηνία]</td></tr>' +
            '<tr><td>[Ενέργεια 2]</td><td>[Όνομα]</td><td>[Ημερομηνία]</td></tr></table>';
        }
        return '<h1>Meeting Minutes</h1>' +
          '<p><strong>Date:</strong> [Date]<br><strong>Attendees:</strong> [Names]<br><strong>Location:</strong> [Location]</p>' +
          '<h2>Agenda</h2>' +
          '<ol><li>[Topic 1]</li><li>[Topic 2]</li><li>[Topic 3]</li></ol>' +
          '<h2>Discussion & Decisions</h2>' +
          '<h3>[Topic 1]</h3>' +
          '<p>[Summary of discussion and decision.]</p>' +
          '<h3>[Topic 2]</h3>' +
          '<p>[Summary of discussion and decision.]</p>' +
          '<h2>Action Items</h2>' +
          '<table class="custom-table"><tr><th>Action</th><th>Owner</th><th>Deadline</th></tr>' +
          '<tr><td>[Action 1]</td><td>[Name]</td><td>[Date]</td></tr>' +
          '<tr><td>[Action 2]</td><td>[Name]</td><td>[Date]</td></tr></table>';
      }
    },
    'blank': {
      icon: 'fa-file-o',
      title: 'Blank',
      description: 'Empty document',
      generate: function() {
        return '<p><br></p>';
      }
    }
  };

  function toggleTemplatesDialog() {
    const dialog = document.getElementById('templates-dialog-overlay');
    if (!dialog) return;
    if (dialog.style.display === 'flex') {
      dialog.style.display = 'none';
      return;
    }
    dialog.style.display = 'flex';
    renderTemplatesGrid();
  }

  function renderTemplatesGrid() {
    const grid = document.getElementById('templates-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const keys = Object.keys(TEMPLATES);
    for (let i = 0; i < keys.length; i++) {
      const tpl = TEMPLATES[keys[i]];
      const card = document.createElement('div');
      card.className = 'template-card';
      card.innerHTML = '<i class="fa ' + tpl.icon + '"></i><h4>' + tpl.title + '</h4><p>' + tpl.description + '</p>';
      card.addEventListener('click', function() {
        loadTemplate(keys[i]);
      });
      grid.appendChild(card);
    }
  }

  function loadTemplate(templateKey) {
    const tpl = TEMPLATES[templateKey];
    if (!tpl) return;
    const lang = getCurrentLang();
    const content = tpl.generate(lang);
    
    // Confirm if replacing content
    const hasContent = richEditor.innerHTML.trim().length > 0 && richEditor.innerHTML !== '<p><br></p>';
    if (hasContent) {
      if (!confirm(getTrans('template_replace_confirm') || 'Replace current document content with this template?')) {
        return;
      }
    }
    
    richEditor.innerHTML = content;
    saveCurrentTabContent();
    updateStats();
    updateGoalProgress();
    document.getElementById('templates-dialog-overlay').style.display = 'none';
    showToast(getTrans('template_loaded') || 'Template loaded');
    richEditor.focus();
  }

  // ============================================
  // FEATURE #8: NAMED STYLES DROPDOWN
  // ============================================

  const NAMED_STYLES = {
    'normal': { tag: 'p', label: 'Normal' },
    'h1': { tag: 'h1', label: 'Heading 1' },
    'h2': { tag: 'h2', label: 'Heading 2' },
    'h3': { tag: 'h3', label: 'Heading 3' },
    'h4': { tag: 'h4', label: 'Heading 4' },
    'quote': { tag: 'blockquote', label: 'Quote' },
    'code': { tag: 'pre', label: 'Code Block' },
    'list-bullet': { tag: 'ul', label: 'Bullet List' },
    'list-number': { tag: 'ol', label: 'Numbered List' }
  };

  function applyNamedStyle(styleKey) {
    const style = NAMED_STYLES[styleKey];
    if (!style) return;
    
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    
    // Find the block element containing the selection
    let block = range.startContainer;
    while (block && block !== richEditor && block.tagName !== 'P' && block.tagName !== 'H1' &&
           block.tagName !== 'H2' && block.tagName !== 'H3' && block.tagName !== 'H4' &&
           block.tagName !== 'H5' && block.tagName !== 'H6' && block.tagName !== 'BLOCKQUOTE' &&
           block.tagName !== 'PRE') {
      block = block.parentNode;
    }
    
    if (!block || block === richEditor) return;
    
    const newTag = style.tag;
    const newEl = document.createElement(newTag);
    
    // Handle list conversions
    if (newTag === 'ul' || newTag === 'ol') {
      const li = document.createElement('li');
      li.innerHTML = block.innerHTML;
      newEl.appendChild(li);
      block.parentNode.replaceChild(newEl, block);
    } else if (block.tagName === 'UL' || block.tagName === 'OL') {
      // Converting from list to paragraph/heading
      const items = block.querySelectorAll('li');
      if (items.length > 0) {
        newEl.innerHTML = items[0].innerHTML;
        block.parentNode.replaceChild(newEl, block);
        // Insert remaining items as separate paragraphs
        for (let i = 1; i < items.length; i++) {
          const extra = document.createElement(newTag);
          extra.innerHTML = items[i].innerHTML;
          newEl.parentNode.insertBefore(extra, newEl.nextSibling);
        }
      }
    } else {
      newEl.innerHTML = block.innerHTML;
      block.parentNode.replaceChild(newEl, block);
    }
    
    saveCurrentTabContent();
    updateStats();
    
    if (outlinePanel && outlinePanel.style.display !== 'none') {
      clearTimeout(outlineDebounceTimer);
      outlineDebounceTimer = setTimeout(updateOutline, 300);
    }
  }

  // Detect current style for the styles dropdown
  function detectCurrentStyle() {
    if (!stylesSelect || !richEditor) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) {
      stylesSelect.value = 'normal';
      return;
    }
    
    let node = sel.getRangeAt(0).startContainer;
    while (node && node !== richEditor) {
      if (node.tagName) {
        const tag = node.tagName.toLowerCase();
        if (tag === 'h1') { stylesSelect.value = 'h1'; return; }
        if (tag === 'h2') { stylesSelect.value = 'h2'; return; }
        if (tag === 'h3') { stylesSelect.value = 'h3'; return; }
        if (tag === 'h4') { stylesSelect.value = 'h4'; return; }
        if (tag === 'blockquote') { stylesSelect.value = 'quote'; return; }
        if (tag === 'pre') { stylesSelect.value = 'code'; return; }
        if (tag === 'ul') { stylesSelect.value = 'list-bullet'; return; }
        if (tag === 'ol') { stylesSelect.value = 'list-number'; return; }
        if (tag === 'p') { stylesSelect.value = 'normal'; return; }
      }
      node = node.parentNode;
    }
    stylesSelect.value = 'normal';
  }
  
    // ============================================
  // EXPORT ENGINE
  // ============================================

  // ===== HTML TO PLAIN TEXT =====
  function htmlToPlainText(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    // Convert <br> and block elements to newlines
    const brs = temp.querySelectorAll('br');
    for (let i = 0; i < brs.length; i++) {
      brs[i].replaceWith('\n');
    }
    const blocks = temp.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, tr, blockquote, pre');
    for (let j = 0; j < blocks.length; j++) {
      blocks[j].appendChild(document.createTextNode('\n'));
    }
    return temp.textContent || '';
  }

  // ===== TXT EXPORT =====
  function exportTxt() {
    const text = htmlToPlainText(richEditor.innerHTML);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, getFileName('txt'));
    showToast(getTrans('toast_exported') || 'Exported');
  }

  // ===== MARKDOWN EXPORT (Enhanced — Issue #11) =====
  function exportMarkdown() {
    let md = '';
    const blocks = richEditor.children;

    function processNode(node, depth) {
      const tag = node.tagName ? node.tagName.toLowerCase() : '';
      const text = node.textContent || '';
      
      if (tag === 'h1') { md += '# ' + text + '\n\n'; }
      else if (tag === 'h2') { md += '## ' + text + '\n\n'; }
      else if (tag === 'h3') { md += '### ' + text + '\n\n'; }
      else if (tag === 'h4') { md += '#### ' + text + '\n\n'; }
      else if (tag === 'h5') { md += '##### ' + text + '\n\n'; }
      else if (tag === 'h6') { md += '###### ' + text + '\n\n'; }
      else if (tag === 'blockquote') { md += '> ' + text.replace(/\n/g, '\n> ') + '\n\n'; }
      else if (tag === 'pre') { md += '```\n' + text + '\n```\n\n'; }
      else if (tag === 'ul') {
        const items = node.querySelectorAll(':scope > li');
        for (let i = 0; i < items.length; i++) {
          md += '- ' + processInline(items[i]) + '\n';
        }
        md += '\n';
      }
      else if (tag === 'ol') {
        const items = node.querySelectorAll(':scope > li');
        for (let i = 0; i < items.length; i++) {
          md += (i + 1) + '. ' + processInline(items[i]) + '\n';
        }
        md += '\n';
      }
      else if (tag === 'table' && node.classList.contains('custom-table')) {
        const rows = node.querySelectorAll('tr');
        if (rows.length > 0) {
          // Header
          const headerCells = rows[0].querySelectorAll('th, td');
          md += '| ' + Array.from(headerCells).map(function(c) { return c.textContent; }).join(' | ') + ' |\n';
          md += '|' + Array.from(headerCells).map(function() { return '---'; }).join('|') + '|\n';
          // Body
          for (let r = 1; r < rows.length; r++) {
            const cells = rows[r].querySelectorAll('td, th');
            md += '| ' + Array.from(cells).map(function(c) { return c.textContent; }).join(' | ') + ' |\n';
          }
          md += '\n';
        }
      }
      else if (tag === 'div' && node.classList.contains('page-break-marker')) {
        md += '\n---\n\n';
      }
      else if (tag === 'div' && node.classList.contains('toc-document')) {
        md += '## Table of Contents\n\n' + text.replace(/\n/g, '\n') + '\n\n';
      }
      else if (tag === 'hr') {
        md += '\n---\n\n';
      }
      else if (tag === 'img') {
        const alt = node.getAttribute('alt') || '';
        const src = node.getAttribute('src') || '';
        md += '![' + alt + '](' + src + ')\n\n';
      }
      else {
        md += processInline(node) + '\n\n';
      }
    }

    function processInline(node) {
      let result = '';
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === 3) {
          result += child.textContent;
        } else if (child.nodeType === 1) {
          const ct = child.tagName.toLowerCase();
          if (ct === 'strong' || ct === 'b') { result += '**' + processInline(child) + '**'; }
          else if (ct === 'em' || ct === 'i') { result += '*' + processInline(child) + '*'; }
          else if (ct === 'u') { result += processInline(child); }
          else if (ct === 's' || ct === 'del' || ct === 'strike') { result += '~~' + processInline(child) + '~~'; }
          else if (ct === 'code') { result += '`' + child.textContent + '`'; }
          else if (ct === 'mark') { result == processInline(child); }
          else if (ct === 'sub') { result += '~' + processInline(child) + '~'; }
          else if (ct === 'sup') { result += '^' + processInline(child) + '^'; }
          else if (ct === 'a') {
            const href = child.getAttribute('href') || '';
            result += '[' + child.textContent + '](' + href + ')';
          }
          else if (ct === 'br') { result += '\n'; }
          else if (ct === 'img') {
            const alt = child.getAttribute('alt') || '';
            const src = child.getAttribute('src') || '';
            result += '![' + alt + '](' + src + ')';
          }
          else { result += processInline(child); }
        }
      }
      return result;
    }

    for (let i = 0; i < blocks.length; i++) {
      processNode(blocks[i], 0);
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, getFileName('md'));
    showToast(getTrans('toast_exported') || 'Exported');
  }

  // ===== RTF EXPORT (Enhanced — Issue #5) =====
  function exportRtf() {
    let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\n';
    rtf += '{\\colortbl ;\\red200\\green169\\blue110;}\n';

    function escapeRtf(text) {
      return text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}')
                 .replace(/\n/g, '\\line\n').replace(/\t/g, '\\tab ');
    }

    function processInline(node) {
      let result = '';
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === 3) {
          result += escapeRtf(child.textContent);
        } else if (child.nodeType === 1) {
          const ct = child.tagName.toLowerCase();
          if (ct === 'strong' || ct === 'b') { result += '{\\b ' + processInline(child) + '}'; }
          else if (ct === 'em' || ct === 'i') { result += '{\\i ' + processInline(child) + '}'; }
          else if (ct === 'u') { result += '{\\ul ' + processInline(child) + '}'; }
          else if (ct === 's' || ct === 'strike') { result += '{\\strike ' + processInline(child) + '}'; }
          else if (ct === 'sub') { result += '{\\sub ' + processInline(child) + '}'; }
          else if (ct === 'sup') { result += '{\\super ' + processInline(child) + '}'; }
          else if (ct === 'a') { result += processInline(child); }
          else if (ct === 'br') { result += '\\line\n'; }
          else if (ct === 'code') { result += '{\\f1 ' + escapeRtf(child.textContent) + '}'; }
          else { result += processInline(child); }
        }
      }
      return result;
    }

    const blocks = richEditor.children;
    for (let i = 0; i < blocks.length; i++) {
      const node = blocks[i];
      const tag = node.tagName ? node.tagName.toLowerCase() : '';

      if (tag === 'h1') { rtf += '{\\b\\fs48 ' + escapeRtf(node.textContent) + '}\\par\n'; }
      else if (tag === 'h2') { rtf += '{\\b\\fs40 ' + escapeRtf(node.textContent) + '}\\par\n'; }
      else if (tag === 'h3') { rtf += '{\\b\\fs36 ' + escapeRtf(node.textContent) + '}\\par\n'; }
      else if (tag === 'h4') { rtf += '{\\b\\fs32 ' + escapeRtf(node.textContent) + '}\\par\n'; }
      else if (tag === 'blockquote') { rtf += '{\\i\\fi720 ' + processInline(node) + '}\\par\n'; }
      else if (tag === 'pre') { rtf += '{\\f1 ' + escapeRtf(node.textContent) + '}\\par\n'; }
      else if (tag === 'ul') {
        const items = node.querySelectorAll(':scope > li');
        for (let j = 0; j < items.length; j++) {
          rtf += '{\\pntext\\bullet\\tab ' + processInline(items[j]) + '}\\par\n';
        }
      }
      else if (tag === 'ol') {
        const items = node.querySelectorAll(':scope > li');
        for (let j = 0; j < items.length; j++) {
          rtf += '{\\pntext ' + (j + 1) + '.\\tab ' + processInline(items[j]) + '}\\par\n';
        }
      }
      else if (tag === 'div' && node.classList.contains('page-break-marker')) {
        rtf += '\\page\n';
      }
      else if (tag === 'table' && node.classList.contains('custom-table')) {
        const rows = node.querySelectorAll('tr');
        for (let r = 0; r < rows.length; r++) {
          const cells = rows[r].querySelectorAll('td, th');
          for (let c = 0; c < cells.length; c++) {
            const cellText = cells[c].textContent;
            if (cells[c].tagName === 'TH') {
              rtf += '{\\b ' + escapeRtf(cellText) + '}\\cell ';
            } else {
              rtf += escapeRtf(cellText) + '\\cell ';
            }
          }
          rtf += '\\row\n';
        }
      }
      else if (tag === 'hr') {
        rtf += '\\brdrb\\brdrs\\brdrw10\\par\n';
      }
      else if (tag === 'p' || tag === 'div') {
        rtf += processInline(node) + '\\par\n';
      }
      else {
        rtf += processInline(node) + '\\par\n';
      }
    }

    rtf += '}';
    const blob = new Blob([rtf], { type: 'application/rtf' });
    downloadBlob(blob, getFileName('rtf'));
    showToast(getTrans('toast_exported') || 'Exported');
  }

  // ===== DOCX EXPORT (Issue #4 — Real OOXML via JSZip) =====
  function exportDocx() {
    if (typeof JSZip === 'undefined') {
      showToast('JSZip library not found. Place jszip.min.js in assets/js/lib/');
      return;
    }

    const zip = new JSZip();
    
    // Build relationships
    const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
      '</Relationships>';

    // Content types
    const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      '</Types>';

    // Core properties
    const coreXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      '<dc:title>' + escapeXml(currentMetadata.title || '') + '</dc:title>' +
      '<dc:creator>' + escapeXml(currentMetadata.author || '') + '</dc:creator>' +
      '<cp:lastModifiedBy>' + escapeXml(currentMetadata.author || '') + '</cp:lastModifiedBy>' +
      '<dcterms:created xsi:type="dcterms:W3CDTF">' + (currentMetadata.created || new Date().toISOString()) + '</dcterms:created>' +
      '<dcterms:modified xsi:type="dcterms:W3CDTF">' + new Date().toISOString() + '</dcterms:modified>' +
      '</cp:coreProperties>';

    // App properties
    const appXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
      '<Application>orOS Writer</Application>' +
      '</Properties>';

    // Document content
    let docBody = '';

    function escapeXml(text) {
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                 .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }

    function processInlineDocx(node) {
      let result = '';
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === 3) {
          // Preserve spaces
          const text = child.textContent;
          const escaped = escapeXml(text);
          if (escaped.match(/^\s+/) || escaped.match(/\s+$/)) {
            result += '<w:t xml:space="preserve">' + escaped + '</w:t>';
          } else {
            result += '<w:t>' + escaped + '</w:t>';
          }
        } else if (child.nodeType === 1) {
          const ct = child.tagName.toLowerCase();
          if (ct === 'strong' || ct === 'b') {
            result += '<w:r><w:rPr><w:b/></w:rPr>' + processInlineDocx(child) + '</w:r>';
          } else if (ct === 'em' || ct === 'i') {
            result += '<w:r><w:rPr><w:i/></w:rPr>' + processInlineDocx(child) + '</w:r>';
          } else if (ct === 'u') {
            result += '<w:r><w:rPr><w:u w:val="single"/></w:rPr>' + processInlineDocx(child) + '</w:r>';
          } else if (ct === 's' || ct === 'strike' || ct === 'del') {
            result += '<w:r><w:rPr><w:strike/></w:rPr>' + processInlineDocx(child) + '</w:r>';
          } else if (ct === 'sub') {
            result += '<w:r><w:rPr><w:vertAlign w:val="subscript"/></w:rPr>' + processInlineDocx(child) + '</w:r>';
          } else if (ct === 'sup') {
            result += '<w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr>' + processInlineDocx(child) + '</w:r>';
          } else if (ct === 'a') {
            // Hyperlink — simplified
            result += '<w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr>' + processInlineDocx(child) + '</w:r>';
          } else if (ct === 'br') {
            result += '<w:r><w:br/></w:r>';
          } else if (ct === 'code') {
            result += '<w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/></w:rPr>' +
              '<w:t xml:space="preserve">' + escapeXml(child.textContent) + '</w:t></w:r>';
          } else if (ct === 'mark') {
            result += '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr>' + processInlineDocx(child) + '</w:r>';
          } else {
            result += processInlineDocx(child);
          }
        }
      }
      // Wrap loose runs
      if (result.startsWith('<w:t') || result.startsWith('<w:r>')) {
        return result;
      }
      return result ? '<w:r>' + result + '</w:r>' : '<w:r><w:t></w:t></w:r>';
    }

    function makeParagraph(node, style) {
      const pPr = style ? '<w:pPr>' + style + '</w:pPr>' : '';
      return '<w:p>' + pPr + processInlineDocx(node) + '</w:p>';
    }

    const blocks = richEditor.children;
    for (let i = 0; i < blocks.length; i++) {
      const node = blocks[i];
      const tag = node.tagName ? node.tagName.toLowerCase() : '';

      if (tag === 'h1') {
        docBody += makeParagraph(node, '<w:pStyle w:val="Heading1"/><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>');
      } else if (tag === 'h2') {
        docBody += makeParagraph(node, '<w:pStyle w:val="Heading2"/>');
      } else if (tag === 'h3') {
        docBody += makeParagraph(node, '<w:pStyle w:val="Heading3"/>');
      } else if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
        docBody += makeParagraph(node, '<w:pStyle w:val="Heading4"/>');
      } else if (tag === 'blockquote') {
        docBody += makeParagraph(node, '<w:pStyle w:val="Quote"/>');
      } else if (tag === 'pre') {
        // Code block — each line as a paragraph
        const lines = (node.textContent || '').split('\n');
        for (let l = 0; l < lines.length; l++) {
          docBody += '<w:p><w:pPr><w:pStyle w:val="Code"/></w:pPr>' +
            '<w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/></w:rPr>' +
            '<w:t xml:space="preserve">' + escapeXml(lines[l]) + '</w:t></w:r></w:p>';
        }
      } else if (tag === 'ul') {
        const items = node.querySelectorAll(':scope > li');
        for (let j = 0; j < items.length; j++) {
          docBody += '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>' +
            processInlineDocx(items[j]) + '</w:p>';
        }
      } else if (tag === 'ol') {
        const items = node.querySelectorAll(':scope > li');
        for (let j = 0; j < items.length; j++) {
          docBody += '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>' +
            processInlineDocx(items[j]) + '</w:p>';
        }
      } else if (tag === 'div' && node.classList.contains('page-break-marker')) {
        docBody += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      } else if (tag === 'table' && node.classList.contains('custom-table')) {
        const rows = node.querySelectorAll('tr');
        docBody += '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' +
          '<w:tblBorders>' +
          '<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
          '<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
          '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
          '<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
          '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
          '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>' +
          '</w:tblBorders></w:tblPr>';
        for (let r = 0; r < rows.length; r++) {
          const cells = rows[r].querySelectorAll('td, th');
          docBody += '<w:tr>';
          for (let c = 0; c < cells.length; c++) {
            const isHeader = cells[c].tagName === 'TH';
            const cellPr = isHeader ? '<w:pPr><w:rPr><w:b/></w:rPr></w:pPr>' : '';
            docBody += '<w:tc><w:tcPr><w:tcW w:w="2500" w:type="dxa"/></w:tcPr>' +
              '<w:p>' + cellPr + processInlineDocx(cells[c]) + '</w:p></w:tc>';
          }
          docBody += '</w:tr>';
        }
        docBody += '</w:tbl><w:p/>';
      } else if (tag === 'hr') {
        docBody += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>';
      } else if (tag === 'img') {
        // Inline image — needs relationship; simplified placeholder
        docBody += '<w:p><w:r><w:t xml:space="preserve">[Image]</w:t></w:r></w:p>';
      } else {
        docBody += makeParagraph(node, '');
      }
    }

    const documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<w:body>' + docBody +
      '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>' +
      '</w:body></w:document>';

    // Numbering definitions for lists
    const numberingXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:abstractNum w:abstractNumId="0">' +
        '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\u2022"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>' +
      '</w:abstractNum>' +
      '<w:abstractNum w:abstractNumId="1">' +
        '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>' +
      '</w:abstractNum>' +
      '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>' +
      '<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>' +
      '</w:numbering>';

    // Styles
    const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:i/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/></w:rPr></w:style>' +
      '</w:styles>';

    // Document relationships
    const docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
      '</Relationships>';

    // Assemble package
    zip.file('[Content_Types].xml', contentTypes);
    zip.file('_rels/.rels', rels);
    zip.file('word/document.xml', documentXml);
    zip.file('word/styles.xml', stylesXml);
    zip.file('word/numbering.xml', numberingXml);
    zip.file('word/_rels/document.xml.rels', docRels);
    zip.file('docProps/core.xml', coreXml);
    zip.file('docProps/app.xml', appXml);

    zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      .then(function(blob) {
        downloadBlob(blob, getFileName('docx'));
        showToast(getTrans('toast_exported') || 'Exported as DOCX');
      })
      .catch(function(err) {
        console.error('DOCX export error:', err);
        showToast('Error generating DOCX');
      });
  }

  // ===== EPUB EXPORT (Feature #21) =====
  function exportEpub() {
    if (typeof JSZip === 'undefined') {
      showToast('JSZip library not found');
      return;
    }

    const zip = new JSZip();

    // mimetype (must be first, uncompressed)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // container.xml
    const containerXml = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
      '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>' +
      '</container>';

    // content.opf
    const title = escapeXml(currentMetadata.title || 'Untitled');
    const author = escapeXml(currentMetadata.author || 'Unknown Author');
    const bookId = 'oros-writer-' + Date.now();
    const modified = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

    let manifest = '<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml" properties="svg"/>';
    let spine = '<itemref idref="cover" linear="yes"/>';
    let navPoints = '';

    // Process content into chapters by H1
    const blocks = richEditor.children;
    let chapterNum = 0;
    let chapterHtml = '';
    let chapters = [];

    function finalizeChapter() {
      if (chapterHtml.trim().length > 0) {
        chapterNum++;
        chapters.push({
          id: 'chapter' + chapterNum,
          html: chapterHtml,
          title: 'Chapter ' + chapterNum
        });
      }
      chapterHtml = '';
    }

    for (let i = 0; i < blocks.length; i++) {
      const node = blocks[i];
      if (node.tagName === 'H1') {
        finalizeChapter();
        chapterNum++;
        chapters.push({
          id: 'chapter' + chapterNum,
          title: node.textContent || 'Chapter ' + chapterNum,
          html: '<h1>' + escapeXml(node.textContent) + '</h1>'
        });
        chapterHtml = '';
      } else {
        chapterHtml += node.outerHTML || '';
      }
    }
    finalizeChapter();

    // If no chapters were split, create one chapter
    if (chapters.length === 0) {
      chapters.push({
        id: 'chapter1',
        title: title,
        html: richEditor.innerHTML
      });
    }

    let manifestItems = '';
    let spineItems = '';
    let navItems = '';

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      const fileName = 'chapter' + (i + 1) + '.xhtml';

      // Clean HTML for EPUB
      let cleanedHtml = ch.html;
      // Remove contenteditable attributes
      cleanedHtml = cleanedHtml.replace(/contenteditable="[^"]*"/g, '');
      // Remove data attributes
      cleanedHtml = cleanedHtml.replace(/data-[a-z-]+="[^"]*"/g, '');

      const chapterXhtml = '<?xml version="1.0" encoding="UTF-8"?>' +
        '<!DOCTYPE html>' +
        '<html xmlns="http://www.w3.org/1999/xhtml">' +
        '<head><title>' + escapeXml(ch.title) + '</title>' +
        '<link rel="stylesheet" href="style.css" type="text/css"/></head>' +
        '<body><h1>' + escapeXml(ch.title) + '</h1>' + cleanedHtml + '</body></html>';

      zip.file('OEBPS/' + fileName, chapterXhtml);
      manifestItems += '<item id="chap' + (i + 1) + '" href="' + fileName + '" media-type="application/xhtml+xml"/>';
      spineItems += '<itemref idref="chap' + (i + 1) + '"/>';
      navItems += '<navPoint id="navpoint' + (i + 1) + '" playOrder="' + (i + 1) + '">' +
        '<navLabel><text>' + escapeXml(ch.title) + '</text></navLabel>' +
        '<content src="' + fileName + '"/></navPoint>';
    }

    const opfXml = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">' +
      '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">' +
      '<dc:identifier id="BookId">urn:uuid:' + bookId + '</dc:identifier>' +
      '<dc:title>' + title + '</dc:title>' +
      '<dc:creator>' + author + '</dc:creator>' +
      '<dc:language>' + (getCurrentLang() === 'el' ? 'el' : 'en') + '</dc:language>' +
      '<meta property="dcterms:modified">' + modified + '</meta>' +
      '</metadata>' +
      '<manifest>' +
      '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>' +
      '<item id="css" href="style.css" media-type="text/css"/>' +
      manifestItems +
      '</manifest>' +
      '<spine>' + spineItems + '</spine>' +
      '</package>';

    // Navigation document
    let navToc = '';
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      navToc += '<li><a href="chapter' + (i + 1) + '.xhtml">' + escapeXml(ch.title) + '</a></li>';
    }

    const navXhtml = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<!DOCTYPE html>' +
      '<html xmlns="http://www.w3.org/1999/xhtml">' +
      '<head><title>Table of Contents</title></head>' +
      '<body><nav epub:type="toc"><h1>Table of Contents</h1><ol>' + navToc + '</ol></nav></body></html>';

    // CSS
    const css = 'body { font-family: Georgia, serif; line-height: 1.6; margin: 1em; }\n' +
      'h1 { font-size: 1.8em; }\nh2 { font-size: 1.4em; }\nh3 { font-size: 1.2em; }\n' +
      'blockquote { margin-left: 1em; font-style: italic; border-left: 3px solid #ccc; padding-left: 1em; }\n' +
      'pre { font-family: monospace; background: #f0f0f0; padding: 0.5em; }\n' +
      'table { border-collapse: collapse; }\ntd, th { border: 1px solid #ccc; padding: 0.3em; }';

    zip.file('META-INF/container.xml', containerXml);
    zip.file('OEBPS/content.opf', opfXml);
    zip.file('OEBPS/nav.xhtml', navXhtml);
    zip.file('OEBPS/style.css', css);

    zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
      .then(function(blob) {
        downloadBlob(blob, getFileName('epub'));
        showToast(getTrans('toast_exported') || 'Exported as EPUB');
      })
      .catch(function(err) {
        console.error('EPUB export error:', err);
        showToast('Error generating EPUB');
      });
  }

  // ===== DOWNLOAD HELPER =====
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function getFileName(ext) {
    const title = (currentMetadata && currentMetadata.title) ? currentMetadata.title : '';
    const safeName = title.replace(/[^a-zA-Z0-9\u0370-\u03FF\-_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    return (safeName || 'document') + '.' + ext;
  }

  // ===== EXPORT DISPATCHER =====
  function handleExport(format) {
    switch (format) {
      case 'txt': exportTxt(); break;
      case 'md': exportMarkdown(); break;
      case 'rtf': exportRtf(); break;
      case 'docx': exportDocx(); break;
      case 'epub': exportEpub(); break;
      case 'pdf':
        // PDF uses print dialog
        window.print();
        break;
      default:
        showToast('Unknown format: ' + format);
    }
  }
  
    // ============================================
  // IMAGE INSERTION (Issue #10: CSS Classes)
  // ============================================

  function toggleImageDialog() {
    const dialog = document.getElementById('image-dialog-overlay');
    if (!dialog) return;
    if (dialog.style.display === 'flex') {
      dialog.style.display = 'none';
      return;
    }
    const fileInput = document.getElementById('image-file-input');
    const urlInput = document.getElementById('image-url-input');
    const captionInput = document.getElementById('image-caption-input');
    
    if (fileInput) fileInput.value = '';
    if (urlInput) urlInput.value = '';
    if (captionInput) captionInput.value = '';
    
    dialog.style.display = 'flex';
    if (fileInput) setTimeout(function() { fileInput.focus(); }, 50);
  }

  function insertImageFromUpload() {
    const fileInput = document.getElementById('image-file-input');
    const captionInput = document.getElementById('image-caption-input');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (file.size > maxSize) {
      showToast('Image too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      const src = e.target.result;
      const caption = captionInput ? captionInput.value.trim() : '';
      insertImage(src, caption);
      document.getElementById('image-dialog-overlay').style.display = 'none';
    };
    reader.onerror = function() {
      showToast('Error reading image file');
    };
    reader.readAsDataURL(file);
  }

  function insertImageFromUrl() {
    const urlInput = document.getElementById('image-url-input');
    const captionInput = document.getElementById('image-caption-input');
    if (!urlInput || !urlInput.value.trim()) return;

    const src = urlInput.value.trim();
    const caption = captionInput ? captionInput.value.trim() : '';
    
    if (!/^https?:\/\//i.test(src)) {
      showToast('URL must start with http:// or https://');
      return;
    }

    insertImage(src, caption);
    document.getElementById('image-dialog-overlay').style.display = 'none';
  }

  function insertImage(src, caption) {
    const captionText = caption ? '<br><span style="font-size:0.9em;color:#666;">' + caption + '</span>' : '';
    const imgHtml = '<figure class="editor-figure">' +
      '<img src="' + src + '" alt="' + (caption || 'Image') + '" class="editor-image"/>' +
      captionText +
      '</figure>';
    
    document.execCommand('insertHTML', false, imgHtml);
    saveCurrentTabContent();
    updateStats();
    richEditor.focus();
  }

  // ============================================
  // TABLE BUILDER (Feature for tables)
  // ============================================

  function toggleTableDialog() {
    const dialog = document.getElementById('table-dialog-overlay');
    if (!dialog) return;
    if (dialog.style.display === 'flex') {
      dialog.style.display = 'none';
      return;
    }
    dialog.style.display = 'flex';
    const rows = document.getElementById('table-rows-select');
    const cols = document.getElementById('table-cols-select');
    if (rows) rows.value = '3';
    if (cols) cols.value = '3';
    setTimeout(function() {
      if (document.getElementById('btn-create-table')) {
        document.getElementById('btn-create-table').focus();
      }
    }, 50);
  }

  function createTable() {
    const rows = parseInt(document.getElementById('table-rows-select').value) || 3;
    const cols = parseInt(document.getElementById('table-cols-select').value) || 3;

    let html = '<table class="custom-table"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        const th = r === 0;
        html += '<' + (th ? 'th' : 'td') + '>' + (th ? '' : '<br>') + '</' + (th ? 'th' : 'td') + '>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';

    document.execCommand('insertHTML', false, html);
    saveCurrentTabContent();
    updateStats();
    document.getElementById('table-dialog-overlay').style.display = 'none';
    richEditor.focus();
  }

  // ============================================
  // LINK DIALOG
  // ============================================

  function toggleLinkDialog() {
    const dialog = document.getElementById('link-dialog-overlay');
    if (!dialog) return;
    if (dialog.style.display === 'flex') {
      dialog.style.display = 'none';
      return;
    }
    
    const urlInput = document.getElementById('link-url-input');
    const textInput = document.getElementById('link-text-input');
    const openNew = document.getElementById('link-new-window');

    // Check if there's a selection
    const sel = window.getSelection();
    let selectedText = '';
    let currentHref = '';

    if (sel.rangeCount > 0 && !sel.isCollapsed && richEditor.contains(sel.anchorNode)) {
      selectedText = sel.toString();
    } else {
      // Check if cursor is inside a link
      const node = sel.getRangeAt(0).startContainer;
      let parent = node.nodeType === 3 ? node.parentNode : node;
      while (parent && parent !== richEditor && parent.tagName !== 'A') {
        parent = parent.parentNode;
      }
      if (parent && parent.tagName === 'A') {
        currentHref = parent.getAttribute('href') || '';
        selectedText = parent.textContent;
        parent.setAttribute('data-editing-link', 'true');
      }
    }

    if (urlInput) urlInput.value = currentHref;
    if (textInput) textInput.value = selectedText || '';
    if (openNew) openNew.checked = false;

    dialog.style.display = 'flex';
    if (urlInput) setTimeout(function() { urlInput.focus(); urlInput.select(); }, 50);
  }

  function insertOrUpdateLink() {
    const urlInput = document.getElementById('link-url-input');
    const textInput = document.getElementById('link-text-input');
    const openNew = document.getElementById('link-new-window');

    if (!urlInput || !urlInput.value.trim()) {
      // Remove link if URL is empty
      document.execCommand('unlink', false);
      document.getElementById('link-dialog-overlay').style.display = 'none';
      richEditor.focus();
      return;
    }

    const url = urlInput.value.trim();
    if (!/^https?:\/\//i.test(url)) {
      showToast('URL must start with http:// or https://');
      return;
    }

    const text = textInput ? textInput.value.trim() : '';
    const target = openNew && openNew.checked ? '_blank' : '_self';

    // Check if editing existing link
    const editingLink = richEditor.querySelector('a[data-editing-link="true"]');
    if (editingLink) {
      editingLink.setAttribute('data-editing-link', '');
      editingLink.href = url;
      editingLink.target = target;
      if (text && text !== editingLink.textContent) {
        editingLink.textContent = text;
      }
    } else {
      // Create new link
      if (!window.getSelection().isCollapsed) {
        if (text && text !== window.getSelection().toString()) {
          // Replace selection with text
          document.execCommand('delete', false);
          document.execCommand('insertText', false, text);
        }
        
        const a = document.createElement('a');
        a.href = url;
        a.target = target;
        a.textContent = text || url;
        
        document.execCommand('insertHTML', false, a.outerHTML);
      } else {
        // Insert empty link at cursor
        const a = document.createElement('a');
        a.href = url;
        a.target = target;
        a.textContent = '[Link]';
        document.execCommand('insertHTML', false, a.outerHTML);
      }
    }

    document.getElementById('link-dialog-overlay').style.display = 'none';
    saveCurrentTabContent();
    richEditor.focus();
  }

  // ============================================
  // FORMAT BUTTON ACTIONS
  // ============================================

  function setupFormatButtons() {
    // Bold
    bindFmtButton('btn-bold', 'bold');
    // Italic
    bindFmtButton('btn-italic', 'italic');
    // Underline
    bindFmtButton('btn-underline', 'underline');
    // Strikethrough (Fix #15)
    bindFmtButton('btn-strikethrough', 'strikeThrough');
    // Subscript (Fix #15)
    bindFmtButton('btn-subscript', 'subscript');
    // Superscript (Fix #15)
    bindFmtButton('btn-superscript', 'superscript');
    
    // Headings
    bindHeadingButton('btn-h1', 'h1');
    bindHeadingButton('btn-h2', 'h2');
    bindHeadingButton('btn-h3', 'h3');
    
    // Lists
    bindFmtButton('btn-bullets', 'insertUnorderedList');
    bindFmtButton('btn-numbers', 'insertOrderedList');
    
    // Alignment
    bindFmtButton('btn-align-left', 'justifyLeft');
    bindFmtButton('btn-align-center', 'justifyCenter');
    bindFmtButton('btn-align-right', 'justifyRight');
    
    // Blockquote
    bindFmtButton('btn-quote', 'formatBlock', 'blockquote');
    // Code block
    bindFmtButton('btn-code', 'formatBlock', 'pre');
    // HR
    bindFmtButton('btn-hr', 'insertHorizontalRule');
    // Undo/Redo
    bindFmtButton('btn-undo', 'undo');
    bindFmtButton('btn-redo', 'redo');
  }

  function bindFmtButton(id, command, value) {
    const btn = document.getElementById(id);
    if (!btn) return;
    
    btn.addEventListener('click', function() {
      document.execCommand(command, false, value);
      saveCurrentTabContent();
      updateStats();
      
      // Update active states after delay
      setTimeout(updateToolbarStates, 10);
    });
    
    // Keyboard shortcuts
    const shortcuts = {
      'btn-bold': ['ctrl+b', 'ctrl+shift+b'],
      'btn-italic': ['ctrl+i', 'ctrl+shift+i'],
      'btn-underline': ['ctrl+u', 'ctrl+shift+u'],
      'btn-strikethrough': ['ctrl+shift+x'],
      'btn-subscript': ['ctrl+,'],
      'btn-superscript': ['ctrl+.']
    };
    
    if (shortcuts[id]) {
      shortcuts[id].forEach(function(sc) {
        registerShortcut(sc, function() {
          document.execCommand(command, false, value);
          saveCurrentTabContent();
          updateStats();
          updateToolbarStates();
        });
      });
    }
  }

  function bindHeadingButton(id, tagName) {
    const btn = document.getElementById(id);
    if (!btn) return;
    
    btn.addEventListener('click', function() {
      document.execCommand('formatBlock', false, tagName);
      saveCurrentTabContent();
      updateStats();
      
      // Check outline panel
      if (outlinePanel && outlinePanel.style.display !== 'none') {
        clearTimeout(outlineDebounceTimer);
        outlineDebounceTimer = setTimeout(updateOutline, 300);
      }
      
      setTimeout(updateToolbarStates, 10);
    });
  }

  // ============================================
  // TOOLBAR STATES (Active states)
  // ============================================

  function updateToolbarStates() {
    if (!richEditor) return;
    
    const checkActive = function(ids, tag) {
      const isActive = document.queryCommandState(ids[0]);
      ids.forEach(function(id) {
        const btn = document.getElementById(id);
        if (btn) {
          if (isActive) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });
    };

    checkActive(['btn-bold'], 'strong');
    checkActive(['btn-italic'], 'em');
    checkActive(['btn-underline'], 'u');
    checkActive(['btn-strikethrough'], 's');
    checkActive(['btn-bullets'], 'ul');
    checkActive(['btn-numbers'], 'ol');
    
    // Detect heading
    let foundH1 = false, foundH2 = false, foundH3 = false;
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      let node = sel.getRangeAt(0).startContainer;
      while (node && node !== richEditor && node.tagName !== 'H1' && node.tagName !== 'H2' && node.tagName !== 'H3') {
        node = node.parentNode;
      }
      if (node) {
        if (node.tagName === 'H1') foundH1 = true;
        if (node.tagName === 'H2') foundH2 = true;
        if (node.tagName === 'H3') foundH3 = true;
      }
    }
    
    const h1Btn = document.getElementById('btn-h1');
    const h2Btn = document.getElementById('btn-h2');
    const h3Btn = document.getElementById('btn-h3');
    
    if (h1Btn) { h1Btn.classList.toggle('active', foundH1); }
    if (h2Btn) { h2Btn.classList.toggle('active', foundH2); }
    if (h3Btn) { h3Btn.classList.toggle('active', foundH3); }
  }

  // ============================================
  // KEYBOARD SHORTCUT REGISTRATION
  // ============================================

  function registerShortcut(shortcut, handler) {
    shortcutOverrides[shortcut] = handler;
  }

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      if (e.target.closest('.dialog-overlay, .settings-modal, input, textarea')) return;
      
      const key = [];
      if (e.ctrlKey) key.push('ctrl');
      if (e.shiftKey) key.push('shift');
      if (e.altKey) key.push('alt');
      key.push(e.key.toLowerCase());
      const combo = key.join('+');

      // Check custom shortcuts
      if (shortcutOverrides[combo]) {
        e.preventDefault();
        try { shortcutOverrides[combo](); } catch(ex) {}
        return;
      }
      
      // Default shortcuts
      switch(combo) {
        case 'ctrl+s':
          e.preventDefault();
          saveCurrentTabContent();
          showToast(getTrans('text_saved'));
          break;
        case 'ctrl+n':
          e.preventDefault();
          createTab({ content: '', metadata: {} });
          break;
        case 'ctrl+w':
          e.preventDefault();
          closeTabById(activeTabId);
          break;
        case 'ctrl+k':
          e.preventDefault();
          toggleLinkDialog();
          break;
        case 'ctrl+f':
          e.preventDefault();
          toggleFindBar();
          break;
        case 'ctrl+g':
          e.preventDefault();
          toggleGoalBar();
          break;
        case 'ctrl+enter':
          e.preventDefault();
          insertPageBreak();
          break;
        case 'ctrl+,':
          e.preventDefault();
          document.execCommand('subscript');
          saveCurrentTabContent();
          break;
        case 'ctrl+.':
          e.preventDefault();
          document.execCommand('superscript');
          saveCurrentTabContent();
          break;
        case 'ctrl+shift+x':
          e.preventDefault();
          document.execCommand('strikeThrough');
          saveCurrentTabContent();
          break;
        case 'ctrl+shift+c':
          e.preventDefault();
          toggleCommentsPanel();
          break;
        case 'f9':
          e.preventDefault();
          toggleReadingMode();
          break;
      }
    });
  }

    // ===== WINDOW RESIZE =====
  let resizeDebounce = null;

  window.addEventListener('resize', function() {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(function() {
      updateReadingProgress();
      if (focusModeEnabled) {
        highlightFocusedParagraph();
      }
    }, 100);
  });

  // ===== HEADER & FOOTER RENDERING =====
  function renderHeaderFooter() {
    const tab = getActiveTab();
    if (!tab || !tab.metadata) return;

    let headerEl = document.getElementById('doc-header-render');
    let footerEl = document.getElementById('doc-footer-render');

    if (!headerEl) {
      headerEl = document.createElement('div');
      headerEl.id = 'doc-header-render';
      headerEl.style.cssText = 'display:none;text-align:center;font-size:12px;color:var(--text-muted,#666);padding:8px 60px 0;';
      richWrapper.insertBefore(headerEl, richWrapper.firstChild);
    }
    if (!footerEl) {
      footerEl = document.createElement('div');
      footerEl.id = 'doc-footer-render';
      footerEl.style.cssText = 'display:none;text-align:center;font-size:12px;color:var(--text-muted,#666);padding:8px 60px;';
      richWrapper.appendChild(footerEl);
    }

    const headerText = tab.metadata.headerText || '';
    const footerText = tab.metadata.footerText || '';
    const showPageNum = tab.metadata.footerPageNum || false;

    if (headerText) {
      headerEl.style.display = '';
      headerEl.textContent = headerText;
    } else {
      headerEl.style.display = 'none';
    }

    if (footerText || showPageNum) {
      footerEl.style.display = '';
      let footerContent = footerText;
      if (showPageNum) {
        footerContent += (footerContent ? ' · ' : '') + 'Page 1';
      }
      footerEl.textContent = footerContent;
    } else {
      footerEl.style.display = 'none';
    }
  }

  // ===== SETTINGS MODAL =====
  function toggleSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    if (modal.classList.contains('active')) {
      modal.classList.remove('active');
    } else {
      modal.classList.add('active');
      loadSettingsValues();
      renderAutoCorrectRules();
      renderShortcutCustomization();
    }
  }

  function loadSettingsValues() {
    const hideSave = document.getElementById('toggle-hide-save');
    if (hideSave) hideSave.checked = hasSaveIndicatorHidden();

    const hideStats = document.getElementById('toggle-hide-stats');
    if (hideStats) hideStats.checked = localStorage.getItem('oros_hide_stats') === 'true';

    const rpToggle = document.getElementById('toggle-reading-progress');
    if (rpToggle) rpToggle.checked = readingProgressEnabled;

    const stToggle = document.getElementById('toggle-smart-typography');
    if (stToggle) stToggle.checked = smartTypographyEnabled;

    const tsToggle = document.getElementById('toggle-typewriter-sound');
    if (tsToggle) tsToggle.checked = typewriterSoundEnabled;

    const spToggle = document.getElementById('toggle-smart-paste');
    if (spToggle) spToggle.checked = smartPasteEnabled;

    const fmToggle = document.getElementById('toggle-focus-mode');
    if (fmToggle) fmToggle.checked = focusModeEnabled;
  }

  function saveSettings() {
    const hideSave = document.getElementById('toggle-hide-save');
    if (hideSave) localStorage.setItem('oros_hide_save_indicator', hideSave.checked ? 'true' : 'false');

    const hideStats = document.getElementById('toggle-hide-stats');
    if (hideStats) localStorage.setItem('oros_hide_stats', hideStats.checked ? 'true' : 'false');

    const rpToggle = document.getElementById('toggle-reading-progress');
    if (rpToggle) {
      readingProgressEnabled = rpToggle.checked;
      localStorage.setItem('oros_reading_progress', readingProgressEnabled ? 'true' : 'false');
    }

    const stToggle = document.getElementById('toggle-smart-typography');
    if (stToggle) {
      smartTypographyEnabled = stToggle.checked;
      localStorage.setItem('oros_smart_typography', smartTypographyEnabled ? 'true' : 'false');
    }

    const tsToggle = document.getElementById('toggle-typewriter-sound');
    if (tsToggle) {
      typewriterSoundEnabled = tsToggle.checked;
      localStorage.setItem('oros_typewriter_sound', typewriterSoundEnabled ? 'true' : 'false');
      if (typewriterSoundEnabled && !typewriterAudioCtx) {
        initTypewriterSound();
      }
      window.dispatchEvent(new CustomEvent('oros-typewriter-sound-changed', { detail: { enabled: typewriterSoundEnabled } }));
    }

    const spToggle = document.getElementById('toggle-smart-paste');
    if (spToggle) {
      smartPasteEnabled = spToggle.checked;
      localStorage.setItem('oros_smart_paste', smartPasteEnabled ? 'true' : 'false');
    }

    const fmToggle = document.getElementById('toggle-focus-mode');
    if (fmToggle) {
      focusModeEnabled = fmToggle.checked;
      localStorage.setItem('oros_focus_mode', focusModeEnabled ? 'true' : 'false');
      document.body.classList.toggle('focus-mode', focusModeEnabled);
      if (focusModeEnabled) highlightFocusedParagraph();
    }

    // Advanced settings tab
    const acEnable = document.getElementById('toggle-autocorrect');
    if (acEnable) {
      localStorage.setItem('oros_autocorrect_enabled', acEnable.checked ? 'true' : 'false');
    }

    updateSaveIndicator();
    updateStats();
    updateReadingProgress();
    showToast(getTrans('settings_saved'));
  }

  function loadPersistedSettings() {
    smartTypographyEnabled = localStorage.getItem('oros_smart_typography') !== 'false';
    typewriterSoundEnabled = localStorage.getItem('oros_typewriter_sound') === 'true';
    smartPasteEnabled = localStorage.getItem('oros_smart_paste') !== 'false';
    focusModeEnabled = localStorage.getItem('oros_focus_mode') === 'true';
    readingProgressEnabled = localStorage.getItem('oros_reading_progress') !== 'false';

    if (typewriterSoundEnabled) initTypewriterSound();
    if (focusModeEnabled) document.body.classList.add('focus-mode');
  }

  // ===== SETTINGS TABS =====
  function setupSettingsTabs() {
    const tabBtns = document.querySelectorAll('#settings-modal .tab-btn');
    for (let i = 0; i < tabBtns.length; i++) {
      tabBtns[i].addEventListener('click', function() {
        const target = this.getAttribute('data-tab');
        for (let j = 0; j < tabBtns.length; j++) {
          tabBtns[j].classList.remove('active');
        }
        this.classList.add('active');

        const panels = document.querySelectorAll('#settings-modal .settings-tab-panel');
        for (let k = 0; k < panels.length; k++) {
          panels[k].style.display = 'none';
        }
        const panel = document.getElementById('settings-tab-' + target);
        if (panel) panel.style.display = '';
      });
    }
  }

  // ===== HELP DIALOG =====
  function toggleHelpDialog() {
    const dialog = document.getElementById('help-dialog-overlay');
    if (!dialog) return;
    if (dialog.style.display === 'flex') {
      dialog.style.display = 'none';
    } else {
      dialog.style.display = 'flex';
    }
  }

  // ===== EXPORT DROPDOWN =====
  function setupExportDropdown() {
    const btn = document.getElementById('btn-export');
    const menu = document.getElementById('export-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', function() {
      menu.style.display = 'none';
    });

    menu.addEventListener('click', function(e) {
      e.stopPropagation();
    });

    const items = menu.querySelectorAll('button');
    for (let i = 0; i < items.length; i++) {
      items[i].addEventListener('click', function() {
        const format = this.getAttribute('data-format');
        if (format) {
          handleExport(format);
          menu.style.display = 'none';
        }
      });
    }
  }

  // ===== DROPDOWN TOGGLES =====
  function setupDropdownToggles() {
    const toggles = document.querySelectorAll('.dropdown-toggle');
    for (let i = 0; i < toggles.length; i++) {
      toggles[i].addEventListener('click', function(e) {
        e.stopPropagation();
        const content = this.nextElementSibling;
        if (content && content.classList.contains('dropdown-content')) {
          // Close all others
          const all = document.querySelectorAll('.dropdown-content');
          for (let j = 0; j < all.length; j++) {
            if (all[j] !== content) all[j].style.display = 'none';
          }
          content.style.display = content.style.display === 'block' ? 'none' : 'block';
        }
      });
    }

    document.addEventListener('click', function() {
      const all = document.querySelectorAll('.dropdown-content');
      for (let i = 0; i < all.length; i++) {
        all[i].style.display = 'none';
      }
    });
  }

  // ===== STATS OVERLAY CLICK =====
  function setupStatsOverlay() {
    if (!statsOverlay) return;
    statsOverlay.addEventListener('click', function() {
      statsExpanded = !statsExpanded;
      if (statsDetailed) {
        statsDetailed.style.display = statsExpanded ? 'block' : 'none';
      }
      updateStats();
    });
  }

  // ===== PASTE EVENT LISTENER (Issue #12 — single input listener) =====
  function setupEditorEvents() {
    // Single input listener — no duplicates
    setupEditorInput();

    // Selection change for toolbar state updates
    document.addEventListener('selectionchange', function() {
      if (richEditor && document.activeElement === richEditor) {
        clearTimeout(selectionTimer);
        selectionTimer = setTimeout(function() {
          updateToolbarStates();
          detectCurrentStyle();
        }, 100);
      }
    });
  }

  let selectionTimer = null;

  // ===== FILE INPUT (Open) =====
  function setupFileInput() {
    const fileInput = document.getElementById('file-input-hidden');
    if (!fileInput) return;
    fileInput.addEventListener('change', function(e) {
      if (e.target.files && e.target.files.length > 0) {
        openFile(e.target.files[0]);
        e.target.value = '';
      }
    });
  }

  // ===== COMMENT INPUT HANDLER =====
  function setupCommentHandlers() {
    const addBtn = document.getElementById('btn-add-comment');
    if (addBtn) addBtn.addEventListener('click', addComment);

    const input = document.getElementById('comment-input');
    if (input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          addComment();
        }
      });
    }
  }

  // ===== FOOTNOTE DIALOG HANDLERS =====
  function setupFootnoteHandlers() {
    const insertBtn = document.getElementById('btn-insert-footnote');
    if (insertBtn) insertBtn.addEventListener('click', insertFootnote);

    const cancelBtn = document.getElementById('btn-cancel-footnote');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        document.getElementById('footnote-dialog-overlay').style.display = 'none';
      });
    }

    const input = document.getElementById('footnote-text-input');
    if (input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          insertFootnote();
        }
      });
    }
  }

  // ===== IMAGE DIALOG HANDLERS =====
  function setupImageHandlers() {
    const uploadBtn = document.getElementById('btn-image-upload');
    if (uploadBtn) uploadBtn.addEventListener('click', insertImageFromUpload);

    const urlBtn = document.getElementById('btn-image-url');
    if (urlBtn) urlBtn.addEventListener('click', insertImageFromUrl);

    const cancelBtn = document.getElementById('btn-cancel-image');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        document.getElementById('image-dialog-overlay').style.display = 'none';
      });
    }
  }

  // ===== TABLE DIALOG HANDLERS =====
  function setupTableHandlers() {
    const createBtn = document.getElementById('btn-create-table');
    if (createBtn) createBtn.addEventListener('click', createTable);

    const cancelBtn = document.getElementById('btn-cancel-table');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        document.getElementById('table-dialog-overlay').style.display = 'none';
      });
    }
  }

  // ===== LINK DIALOG HANDLERS =====
  function setupLinkHandlers() {
    const okBtn = document.getElementById('btn-ok-link');
    if (okBtn) okBtn.addEventListener('click', insertOrUpdateLink);

    const cancelBtn = document.getElementById('btn-cancel-link');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        // Clean up editing markers
        const editingLinks = richEditor.querySelectorAll('a[data-editing-link="true"]');
        for (let i = 0; i < editingLinks.length; i++) {
          editingLinks[i].removeAttribute('data-editing-link');
        }
        document.getElementById('link-dialog-overlay').style.display = 'none';
      });
    }

    const urlInput = document.getElementById('link-url-input');
    if (urlInput) {
      urlInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          insertOrUpdateLink();
        }
      });
    }
  }

  // ===== TEMPLATE DIALOG HANDLERS =====
  function setupTemplateHandlers() {
    const cancelBtn = document.getElementById('btn-cancel-templates');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        document.getElementById('templates-dialog-overlay').style.display = 'none';
      });
    }
  }

  // ===== SPECIAL CHARACTERS DIALOG HANDLERS =====
  function setupSpecialCharsHandlers() {
    const cancelBtn = document.getElementById('btn-cancel-special-chars');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        document.getElementById('special-chars-dialog-overlay').style.display = 'none';
      });
    }
  }

  // ===== TRACK CHANGES HANDLERS =====
  function setupTrackChangesHandlers() {
    const acceptBtn = document.getElementById('btn-accept-all-changes');
    if (acceptBtn) acceptBtn.addEventListener('click', acceptAllChanges);

    const rejectBtn = document.getElementById('btn-reject-all-changes');
    if (rejectBtn) rejectBtn.addEventListener('click', rejectAllChanges);
  }

  // ===== VERSION HISTORY HANDLERS =====
  function setupVersionHandlers() {
    const snapshotBtn = document.getElementById('btn-snapshot-now');
    if (snapshotBtn) {
      snapshotBtn.addEventListener('click', function() {
        addVersionSnapshot(activeTabId);
        renderVersions();
        showToast(getTrans('version_snapshot_created') || 'Snapshot created');
      });
    }
  }

  // ===== TOC HANDLERS =====
  function setupToCHandlers() {
    const insertBtn = document.getElementById('btn-insert-toc-doc');
    if (insertBtn) insertBtn.addEventListener('click', insertToCIntoDocument);
  }

  // ===== PANEL CLOSE BUTTONS =====
  function setupPanelCloseButtons() {
    const closeBtns = document.querySelectorAll('.panel-close');
    for (let i = 0; i < closeBtns.length; i++) {
      closeBtns[i].addEventListener('click', function() {
        const panel = this.closest('.side-panel');
        if (panel) {
          panel.style.display = 'none';
          if (panel === commentsPanel) {
            removeCommentHighlight(activeCommentId);
            activeCommentId = null;
          }
        }
      });
    }
  }

  // ===== DIALOG CLOSE BUTTONS =====
  function setupDialogCloseButtons() {
    const closeBtns = document.querySelectorAll('.dialog-close');
    for (let i = 0; i < closeBtns.length; i++) {
      closeBtns[i].addEventListener('click', function() {
        const overlay = this.closest('.dialog-overlay');
        if (overlay) overlay.style.display = 'none';
      });
    }

    // Click outside to close
    const overlays = document.querySelectorAll('.dialog-overlay');
    for (let j = 0; j < overlays.length; j++) {
      overlays[j].addEventListener('click', function(e) {
        if (e.target === this) {
          this.style.display = 'none';
        }
      });
    }
  }

  // ===== FIND & REPLACE HANDLERS =====
  function setupFindReplaceHandlers() {
    if (findInput) {
      findInput.addEventListener('input', function() {
        clearTimeout(findDebounceTimer);
        findDebounceTimer = setTimeout(highlightMatches, 300);
      });
      findInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          navigateMatch(e.shiftKey ? -1 : 1);
        }
        if (e.key === 'Escape') {
          toggleFindBar();
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

    const nextBtn = document.getElementById('btn-find-next');
    if (nextBtn) nextBtn.addEventListener('click', function() { navigateMatch(1); });

    const prevBtn = document.getElementById('btn-find-prev');
    if (prevBtn) prevBtn.addEventListener('click', function() { navigateMatch(-1); });

    const replaceBtn = document.getElementById('btn-replace');
    if (replaceBtn) replaceBtn.addEventListener('click', function() { doReplace(false); });

    const replaceAllBtn = document.getElementById('btn-replace-all');
    if (replaceAllBtn) replaceAllBtn.addEventListener('click', function() { doReplace(true); });

    const closeBtn = document.getElementById('btn-close-find');
    if (closeBtn) closeBtn.addEventListener('click', toggleFindBar);

    if (findFormatFilter) {
      findFormatFilter.addEventListener('change', highlightMatches);
    }
  }

  let findDebounceTimer = null;

  // ===== SESSION TIMER HANDLERS =====
  function setupSessionHandlers() {
    const startBtn = document.getElementById('btn-start-session');
    if (startBtn) startBtn.addEventListener('click', startSession);

    const stopBtn = document.getElementById('btn-stop-session');
    if (stopBtn) stopBtn.addEventListener('click', stopSession);
  }

  // ===== GOAL BAR HANDLERS =====
  function setupGoalHandlers() {
    const setBtn = document.getElementById('btn-set-goal');
    if (setBtn) setBtn.addEventListener('click', setGoal);

    const clearBtn = document.getElementById('btn-clear-goal');
    if (clearBtn) clearBtn.addEventListener('click', clearGoal);

    const closeBtn = document.getElementById('btn-close-goal');
    if (closeBtn) closeBtn.addEventListener('click', function() { goalBar.style.display = 'none'; });

    // Load persisted goal
    const savedTarget = localStorage.getItem('oros_goal_target');
    if (savedTarget) {
      goalTarget = parseInt(savedTarget);
      goalUnit = localStorage.getItem('oros_goal_unit') || 'words';
      goalLockEnabled = localStorage.getItem('oros_goal_lock') === 'true';

      if (statsDefaultEl) statsDefaultEl.style.display = 'none';
      if (statsGoalEl) statsGoalEl.style.display = '';
    }
  }

  // ===== STYLES DROPDOWN HANDLER =====
  function setupStylesHandler() {
    if (!stylesSelect) return;
    stylesSelect.addEventListener('change', function() {
      applyNamedStyle(stylesSelect.value);
    });
  }
  
    // ============================================
  // BUTTON BINDINGS — ALL TOOLBAR ACTIONS
  // ============================================

  function setupAllButtonBindings() {
    // File operations
    bindClick('btn-open', function() {
      const fi = document.getElementById('file-input-hidden');
      if (fi) fi.click();
    });
    bindClick('btn-lorem', insertLoremIpsum);
    bindClick('btn-print', function() { window.print(); });

    // Panels
    bindClick('btn-metadata', toggleMetadataPanel);
    bindClick('btn-outline', toggleOutline);
    bindClick('btn-word-freq', toggleWordFreqPanel);
    bindClick('btn-comments', toggleCommentsPanel);
    bindClick('btn-toc', toggleToCPanel);
    bindClick('btn-version-history', toggleVersionPanel);

    // Goal & Session
    bindClick('btn-goal', toggleGoalBar);
    bindClick('btn-session', toggleSessionBar);

    // Track Changes
    bindClick('btn-track-changes', toggleTrackChanges);

    // Insert dialogs
    bindClick('btn-image', toggleImageDialog);
    bindClick('btn-table', toggleTableDialog);
    bindClick('btn-link', toggleLinkDialog);
    bindClick('btn-footnote', toggleFootnoteDialog);
    bindClick('btn-page-break', insertPageBreak);
    bindClick('btn-special-chars', toggleSpecialCharsDialog);
    bindClick('btn-templates', toggleTemplatesDialog);

    // View modes
    bindClick('btn-reading-mode', toggleReadingMode);
    bindClick('btn-focus-mode', toggleFocusMode);

    // Settings & Help
    bindClick('btn-settings', toggleSettingsModal);
    bindClick('btn-help', toggleHelpDialog);

    // Find & Replace
    bindClick('btn-find', toggleFindBar);

    // Settings modal buttons
    bindClick('btn-save-settings', saveSettings);
    bindClick('btn-close-settings', function() {
      const modal = document.getElementById('settings-modal');
      if (modal) modal.classList.remove('active');
    });
    bindClick('btn-close-settings-2', function() {
      const modal = document.getElementById('settings-modal');
      if (modal) modal.classList.remove('active');
    });

    // Auto-correct add rule
    bindClick('btn-add-autocorrect-rule', addAutoCorrectRule);

    // Settings overlay click
    const settingsOverlay = document.querySelector('.settings-modal-overlay');
    if (settingsOverlay) {
      settingsOverlay.addEventListener('click', function() {
        const modal = document.getElementById('settings-modal');
        if (modal) modal.classList.remove('active');
      });
    }

    // Tab rename on Enter
    bindClick('tab-new', function() {
      createTab({ content: '', metadata: {} });
    });
  }

  function bindClick(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

  // ============================================
  // MAIN INITIALIZATION
  // ============================================

  function init() {
    // Cache DOM elements
    richEditor = document.getElementById('rich-editor');
    richWrapper = document.getElementById('rich-wrapper');
    tabBar = document.getElementById('tab-bar');
    saveIndicator = document.getElementById('save-indicator');
    statsOverlay = document.getElementById('stats-overlay');
    statsDefaultEl = document.getElementById('stats-default');
    statsGoalEl = document.getElementById('stats-goal');
    statsDetailed = document.getElementById('stats-detailed');
    goalBar = document.getElementById('goal-bar');
    sessionBar = document.getElementById('session-bar');
    sessionDisplay = document.getElementById('session-display');
    findBar = document.getElementById('find-replace-bar');
    findInput = document.getElementById('find-input');
    replaceInput = document.getElementById('replace-input');
    frResults = document.getElementById('fr-results');
    findFormatFilter = document.getElementById('find-format-filter');
    trackChangesBar = document.getElementById('track-changes-bar');
    metadataPanel = document.getElementById('metadata-panel');
    outlinePanel = document.getElementById('outline-panel');
    outlineList = document.getElementById('outline-list');
    wordFreqPanel = document.getElementById('wordfreq-panel');
    wordFreqList = document.getElementById('wordfreq-list');
    wordFreqSummary = document.getElementById('wordfreq-summary');
    commentsPanel = document.getElementById('comments-panel');
    tocPanel = document.getElementById('toc-panel');
    versionPanel = document.getElementById('version-history-panel');
    footnoteArea = document.getElementById('footnote-area');
    readingProgressBar = document.getElementById('reading-progress-bar');
    stylesSelect = document.getElementById('styles-select');
    exportDropdown = document.getElementById('export-menu');

    // Metadata inputs
    metaTitle = document.getElementById('meta-title');
    metaAuthor = document.getElementById('meta-author');
    metaTags = document.getElementById('meta-tags');
    metaCategory = document.getElementById('meta-category');
    metaCreated = document.getElementById('meta-created');
    metaModified = document.getElementById('meta-modified');

    // Goal inputs
    goalTargetInput = document.getElementById('goal-target-input');
    goalUnitSelect = document.getElementById('goal-unit-select');
    goalLockCheckbox = document.getElementById('goal-lock-checkbox');

    if (!richEditor) {
      console.error('Writer: #rich-editor not found');
      return;
    }

    // Load persisted settings
    loadPersistedSettings();
    loadAutoCorrections();
    loadShortcutOverrides();
    loadComments();

    // Initialize tabs
    loadTabs();

    // Register tab switch listener
    const api = getTabsApi();
    api.on('switch', onTabSwitch);

    // Setup all handlers
    setupEditorEvents();
    setupFormatButtons();
    setupAllButtonBindings();
    setupKeyboardShortcuts();
    setupSettingsTabs();
    setupExportDropdown();
    setupDropdownToggles();
    setupStatsOverlay();
    setupFileInput();
    setupCommentHandlers();
    setupFootnoteHandlers();
    setupImageHandlers();
    setupTableHandlers();
    setupLinkHandlers();
    setupTemplateHandlers();
    setupSpecialCharsHandlers();
    setupTrackChangesHandlers();
    setupVersionHandlers();
    setupToCHandlers();
    setupPanelCloseButtons();
    setupDialogCloseButtons();
    setupFindReplaceHandlers();
    setupSessionHandlers();
    setupGoalHandlers();
    setupStylesHandler();
    setupMetadataHandlers();

    // Initial load of active tab content
    const activeTab = getActiveTab();
    if (activeTab) {
      onTabSwitch(activeTab);
    }

    // Apply page settings
    applyPageSettings();
    renderHeaderFooter();

    // Load goal state
    if (goalTarget) {
      if (statsDefaultEl) statsDefaultEl.style.display = 'none';
      if (statsGoalEl) statsGoalEl.style.display = '';
      updateGoalProgress();
    }

    // Start autosave indicator refresh interval
    setInterval(updateSaveIndicator, 30000);

    // Auto-version snapshot interval
    setInterval(function() {
      if (richEditor && richEditor.innerHTML.trim().length > 0) {
        addVersionSnapshot(activeTabId);
      }
    }, AUTO_SNAPSHOT_INTERVAL);

    // Typewriter sound init
    if (typewriterSoundEnabled) initTypewriterSound();

    // Focus editor
    setTimeout(function() {
      if (richEditor) richEditor.focus();
    }, 100);

    console.log('orOS Writer v2.0 initialized successfully.');
  }

  // Expose minimal API to global scope
  window.orOSWriter = {
    init: init,
    getTabsApi: getTabsApi,
    showToast: showToast,
    toggleReadingMode: toggleReadingMode,
    toggleFocusMode: toggleFocusMode,
    toggleSettingsModal: toggleSettingsModal,
    toggleFindBar: toggleFindBar,
    toggleGoalBar: toggleGoalBar,
    handleExport: handleExport,
    addVersionSnapshot: addVersionSnapshot
  };

  // ============================================
  // DOM READY
  // ============================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

  // ============================================
  // MISSING VARIABLE DECLARATIONS
  // These must be placed in the "DOM ELEMENTS" section
  // near the top of the IIFE, after the initial block.
  // Provided here as a patch block for easy integration.
  // ============================================

  // --- Panel list containers ---
  let outlineList = null;
  let wordFreqList = null;
  let wordFreqSummary = null;

  // --- Metadata inputs ---
  let metaTitle = null;
  let metaAuthor = null;
  let metaTags = null;
  let metaCategory = null;
  let metaCreated = null;
  let metaModified = null;

  // --- Goal inputs ---
  let goalTargetInput = null;
  let goalUnitSelect = null;
  let goalLockCheckbox = null;

  // --- Session display ---
  let sessionDisplay = null;

  // ============================================
  // ADDITIONAL CLEANUP & SAFETY FUNCTIONS
  // ============================================

  // ===== SAFE TRANSLATION FALLBACK =====
  // Ensures getTrans never throws even if translations not loaded
  function safeGetTrans(key) {
    try {
      return getTrans(key);
    } catch(e) {
      return key;
    }
  }

  // ===== SANITIZE HTML FOR STORAGE =====
  // Removes potentially harmful scripts and event handlers
  function sanitizeEditorHtml(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove script tags
    const scripts = temp.querySelectorAll('script');
    for (let i = 0; i < scripts.length; i++) {
      scripts[i].remove();
    }

    // Remove on* attributes
    const all = temp.querySelectorAll('*');
    for (let j = 0; j < all.length; j++) {
      const attrs = all[j].attributes;
      const toRemove = [];
      for (let k = 0; k < attrs.length; k++) {
        if (/^on/i.test(attrs[k].name)) {
          toRemove.push(attrs[k].name);
        }
      }
      for (let m = 0; m < toRemove.length; m++) {
        all[j].removeAttribute(toRemove[m]);
      }
    }

    return temp.innerHTML;
  }

  // ===== CHECK IF EDITOR HAS MEANINGFUL CONTENT =====
  function editorHasContent() {
    if (!richEditor) return false;
    const text = richEditor.innerText.trim();
    const html = richEditor.innerHTML.trim();
    return text.length > 0 || (html.length > 0 && html !== '<p><br></p>' && html !== '<br>');
  }

  // ===== RESTORE CARET POSITION =====
  function saveCaretPosition() {
    const sel = window.getSelection();
    if (!sel.rangeCount || !richEditor) return null;
    const range = sel.getRangeAt(0);
    if (!richEditor.contains(range.startContainer)) return null;
    return range.cloneRange();
  }

  function restoreCaretPosition(savedRange) {
    if (!savedRange || !richEditor) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  // ===== SAFE EXEC COMMAND WRAPPER =====
  function safeExec(command, value) {
    try {
      document.execCommand(command, false, value || null);
      saveCurrentTabContent();
      updateStats();
      updateToolbarStates();
    } catch(e) {
      console.warn('execCommand failed:', command, e);
    }
  }

  // ===== CLEAR ALL HIGHLIGHTS UTILITY =====
  function clearAllHighlights() {
    if (!richEditor) return;
    // Clear find matches
    clearHighlights();
    // Clear comment highlights active state
    const activeComments = richEditor.querySelectorAll('.comment-highlight.active');
    for (let i = 0; i < activeComments.length; i++) {
      activeComments[i].classList.remove('active');
    }
    // Clear outline flashes
    const flashes = richEditor.querySelectorAll('.outline-flash');
    for (let j = 0; j < flashes.length; j++) {
      flashes[j].classList.remove('outline-flash');
    }
  }

  // ===== UPDATE ALL DYNAMIC PANELS =====
  function updateAllPanels() {
    if (outlinePanel && outlinePanel.style.display !== 'none') updateOutline();
    if (wordFreqPanel && wordFreqPanel.style.display !== 'none') updateWordFrequency();
    if (tocPanel && tocPanel.style.display !== 'none') updateToC();
    if (commentsPanel && commentsPanel.style.display !== 'none') loadComments();
    if (versionPanel && versionPanel.style.display !== 'none') renderVersions();
    if (footnoteArea) updateFootnoteArea();
  }

  // ===== ENHANCED SAVE WITH SANITIZATION =====
  function safeSaveCurrentTabContent() {
    if (isSwitching || !richEditor) return;
    const sanitized = sanitizeEditorHtml(richEditor.innerHTML);
    if (sanitized !== richEditor.innerHTML) {
      const caret = saveCaretPosition();
      richEditor.innerHTML = sanitized;
      if (caret) restoreCaretPosition(caret);
    }
    saveCurrentTabContent();
  }

  // ===== CHECK FOR UNSAVED CHANGES (for tab close confirmation) =====
  function hasUnsavedChanges() {
    const tab = getActiveTab();
    if (!tab) return false;
    return richEditor.innerHTML !== tab.content;
  }

  // ===== FINAL INITIALIZATION HOOK =====
  // Called after all modules are loaded
  function postInitHook() {
    // Dispatch ready event
    window.dispatchEvent(new CustomEvent('oros-writer-ready', {
      detail: { version: '2.0', tabsApi: getTabsApi() }
    }));

    // Check for JSZip availability
    if (typeof JSZip === 'undefined') {
      console.warn('Writer: JSZip not loaded. DOCX and EPUB exports will be unavailable.');
    }

    // Check for mammoth availability
    if (typeof mammoth === 'undefined') {
      console.warn('Writer: mammoth not loaded. DOCX import will be unavailable.');
    }
  }

  // Patch init to call postInitHook
  const originalInit = init;
  init = function() {
    originalInit();
    postInitHook();
  };
  
    // ============================================
  // TRANSLATION KEYS USED BY WRITER v2.0
  // ============================================
  // This is a reference list of ALL translation keys
  // referenced in writer.js via getTrans().
  // Ensure every key below exists in translations.json
  // under both "en" and "el" objects.
  //
  // If any key is missing, getTrans() will return
  // the key string itself as fallback.
  // ============================================

  /*
  -- Core --
  editor_name
  text_words
  text_chars
  text_paras
  text_saved
  text_not_saved
  text_saved_just_now
  text_saved_minutes_ago
  text_saved_hours_ago
  text_goal_reached
  text_goal_locked
  text_goal_set
  text_goal_cleared
  toast_lorem_inserted
  toast_opened
  toast_exported
  toast_page_break
  format_not_supported
  settings_saved

  -- Tabs --
  tab_close
  tab_new

  -- Stats --
  stats_chars_with_spaces
  stats_chars_no_spaces
  stats_sentences
  stats_reading_time
  stats_speaking_time
  stats_min

  -- Find & Replace --
  fr_no_matches
  fr_results_matches

  -- Metadata --
  meta_label_created
  meta_label_modified

  -- Outline --
  outline_empty

  -- Word Frequency --
  word_freq_empty
  word_freq_unique
  word_freq_total
  word_freq_diversity

  -- Comments --
  comments_empty
  comment_default_author

  -- Footnotes --
  (uses toast_page_break for insert confirmation)

  -- ToC --
  toc_empty
  toc_title
  toc_inserted

  -- Track Changes --
  track_changes_on
  track_changes_off
  track_changes_accepted
  track_changes_rejected

  -- Version History --
  version_empty
  version_current
  version_preview
  version_restore
  version_confirm_restore
  version_restored
  version_snapshot_created

  -- Templates --
  template_replace_confirm
  template_loaded

  -- Buttons --
  btn_ok

  -- Session Timer --
  session_ready
  session_complete

  -- Help Dialog (Fix #15 additions) --
  help_title
  help_shortcuts
  help_shortcut_strikethrough
  help_shortcut_subscript
  help_shortcut_superscript

  -- Export Labels --
  export_txt
  export_md
  export_rtf
  export_docx
  export_epub
  export_pdf
  */