(function() {
  'use strict';

  // ===== CONSTANTS =====
  var TABS_STORAGE_KEY = 'oros_writer_tabs_v2';
  var VERSION_HISTORY_KEY = 'oros_writer_versions';
  var MAX_TABS = 15;
  var MAX_VERSIONS_PER_TAB = 20;
  var AUTO_SNAPSHOT_INTERVAL = 300000;

  // ===== DOM ELEMENTS =====
  var richEditor = null;
  var richWrapper = null;
  var tabBar = null;
  var saveIndicator = null;
  var statsOverlay = null;
  var statsDefaultEl = null;
  var statsGoalEl = null;
  var statsDetailed = null;
  var goalBar = null;
  var sessionBar = null;
  var sessionDisplay = null;
  var findBar = null;
  var findInput = null;
  var replaceInput = null;
  var frResults = null;
  var findFormatFilter = null;
  var trackChangesBar = null;
  var metadataPanel = null;
  var outlinePanel = null;
  var outlineList = null;
  var wordFreqPanel = null;
  var wordFreqList = null;
  var wordFreqSummary = null;
  var commentsPanel = null;
  var tocPanel = null;
  var versionPanel = null;
  var footnoteArea = null;
  var readingProgressBar = null;
  var exportDropdown = null;
  var stylesSelect = null;
  var metaTitle = null;
  var metaAuthor = null;
  var metaTags = null;
  var metaCategory = null;
  var metaCreated = null;
  var metaModified = null;
  var goalTargetInput = null;
  var goalUnitSelect = null;
  var goalLockCheckbox = null;

  // ===== STATE =====
  var tabsState = [];
  var activeTabId = null;
  var tabSwitchListeners = [];
  var currentMetadata = {};
  var isSwitching = false;
  var goalTarget = null;
  var goalUnit = 'words';
  var goalLockEnabled = false;
  var goalReachedShown = false;
  var goalLockTriggered = false;
  var currentMatchIndex = -1;
  var matchMarks = [];
  var statsExpanded = false;
  var sessionRunning = false;
  var sessionInterval = null;
  var sessionRemaining = 0;
  var sessionWordsTarget = 500;
  var sessionWordsStart = 0;
  var trackingChanges = false;
  var autoCorrections = [];
  var shortcutOverrides = {};
  var readingModeEnabled = false;
  var focusModeEnabled = false;
  var smartTypographyEnabled = true;
  var typewriterSoundEnabled = false;
  var smartPasteEnabled = true;
  var isReplacing = false;
  var wordFreqDebounce = null;
  var outlineDebounceTimer = null;
  var selectionTimer = null;
  var findDebounceTimer = null;
  var toastElement = null;
  var toastTimeout = null;
  var typewriterAudioCtx = null;
  var typewriterAudioBuffer = null;
  var commentsData = [];
  var activeCommentId = null;
  var writerInitialized = false;

  // ===== HELPERS =====
  function getCurrentLang() {
    return localStorage.getItem('oros-language') || 'en';
  }

  function getTrans(key) {
    try {
      var lang = getCurrentLang();
      var t = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[lang]) || {};
      return t[key] || key;
    } catch(e) { return key; }
  }

  function formatNumber(num) {
    return num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num.toString();
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeXml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function formatDate(d) {
    if (isNaN(d.getTime())) return '\u2014';
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear();
    var time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return day + '/' + month + '/' + year + ' ' + time;
  }

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

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
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
    var title = (currentMetadata && currentMetadata.title) ? currentMetadata.title : '';
    var safeName = title.replace(/[^a-zA-Z0-9\u0370-\u03FF\-_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    return (safeName || 'document') + '.' + ext;
  }

  function bindClick(id, handler) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

    // ===== TABS SYSTEM =====
  function generateTabId() {
    return 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 8);
  }

  function getActiveTab() {
    for (var i = 0; i < tabsState.length; i++) {
      if (tabsState[i].id === activeTabId) return tabsState[i];
    }
    return null;
  }

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
      getActiveTab: function() { return getActiveTab(); },
      getActiveId: function() { return activeTabId; },
      createTab: function(opts) { createTab(opts); },
      closeTab: function(id) { closeTabById(id); },
      getAllTabs: function() { return tabsState.slice(); },
      setActiveTab: function(id) { switchTab(id); },
      on: function(event, callback) {
        if (event === 'switch' || event === 'create') tabSwitchListeners.push(callback);
      },
      addVersionSnapshot: function(tabId) { addVersionSnapshot(tabId); },
      getVersions: function(tabId) { return getVersionsForTab(tabId); }
    };
  }

  function persistTabs() {
    try {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabsState));
      updateSaveIndicator();
    } catch(e) {
      console.warn('Failed to persist tabs:', e);
      showToast('Warning: Could not save. Storage may be full.');
    }
  }

  function loadTabs() {
    try {
      var raw = localStorage.getItem(TABS_STORAGE_KEY);
      if (raw) {
        tabsState = JSON.parse(raw);
        if (!Array.isArray(tabsState)) tabsState = [];
      }
    } catch(e) { tabsState = []; }

    if (tabsState.length === 0) {
      tabsState.push({
        id: generateTabId(), title: '', content: '', metadata: {}, timestamp: Date.now(), versions: []
      });
    }
    // Ensure each tab has versions array
    for (var i = 0; i < tabsState.length; i++) {
      if (!tabsState[i].versions) tabsState[i].versions = [];
    }
    activeTabId = tabsState[0].id;
    renderTabs();
  }

  function createTab(opts) {
    if (tabsState.length >= MAX_TABS) { showToast('Maximum tabs reached (' + MAX_TABS + ')'); return; }
    opts = opts || {};
    var newTab = {
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
    var idx = tabsState.findIndex(function(t) { return t.id === id; });
    if (idx === -1) return;
    var closingTab = tabsState[idx];
    var contentPreview = closingTab.content.replace(/<[^>]*>/g, '').trim().substring(0, 50);
    if (contentPreview.length > 0 && !confirm('Close "' + (closingTab.metadata.title || 'Untitled') + '"?')) return;
    tabsState.splice(idx, 1);
    if (tabsState.length === 0) {
      var fresh = { id: generateTabId(), title: '', content: '', metadata: {}, timestamp: Date.now(), versions: [] };
      tabsState.push(fresh);
      activeTabId = fresh.id;
    } else if (activeTabId === id) {
      activeTabId = tabsState[Math.max(0, idx - 1)].id;
    }
    persistTabs();
    renderTabs();
    notifySwitch(getActiveTab());
  }

  function switchTab(id) {
    if (id === activeTabId) return;
    saveCurrentTabContent();
    activeTabId = id;
    renderTabs();
    notifySwitch(getActiveTab());
  }

  function notifySwitch(tab) {
    for (var i = 0; i < tabSwitchListeners.length; i++) {
      try { tabSwitchListeners[i](tab); } catch(e) {}
    }
  }

  function renderTabs() {
    if (!tabBar) return;
    tabBar.innerHTML = '';
    for (var i = 0; i < tabsState.length; i++) {
      (function(tab, idx) {
        var el = document.createElement('div');
        el.className = 'tab' + (tab.id === activeTabId ? ' active' : '');
        var label = document.createElement('span');
        label.className = 'tab-label';
        var title = (tab.metadata && tab.metadata.title) ? tab.metadata.title : '';
        label.textContent = title || (getTrans('editor_name') || 'Writer') + ' ' + (idx + 1);
        label.title = title || '';
        label.addEventListener('dblclick', function(e) { e.stopPropagation(); startTabRename(el, tab); });
        var closeBtn = document.createElement('span');
        closeBtn.className = 'tab-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.title = getTrans('tab_close');
        closeBtn.addEventListener('click', function(e) { e.stopPropagation(); closeTabById(tab.id); });
        el.appendChild(label);
        el.appendChild(closeBtn);
        el.addEventListener('click', function() { switchTab(tab.id); });
        tabBar.appendChild(el);
      })(tabsState[i], i);
    }
    if (tabsState.length < MAX_TABS) {
      var newBtn = document.createElement('div');
      newBtn.className = 'tab-new';
      newBtn.innerHTML = '+';
      newBtn.title = getTrans('tab_new');
      newBtn.addEventListener('click', function() { createTab({ content: '', metadata: {} }); });
      tabBar.appendChild(newBtn);
    }
  }

  function startTabRename(tabEl, tab) {
    var label = tabEl.querySelector('.tab-label');
    var originalText = label.textContent;
    var input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'editing';
    input.style.cssText = 'background:#1a1a2e;color:#ccc;border:1px solid #c8a96e;padding:2px 4px;width:100%;font-family:inherit;font-size:inherit;';
    label.textContent = '';
    label.appendChild(input);
    input.focus();
    input.select();
    function finishRename() {
      var newName = input.value.trim();
      label.removeChild(input);
      if (newName && newName !== originalText) {
        tab.metadata.title = newName;
        persistTabs();
        renderTabs();
        saveCurrentTabMetadata(false);
      } else {
        var title = tab.metadata.title ? tab.metadata.title : '';
        label.textContent = title || (getTrans('editor_name') || 'Writer');
      }
    }
    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      else if (e.key === 'Escape') { input.value = originalText; finishRename(); }
    });
  }

  // ===== SAVE / CONTENT =====
  function saveCurrentTabContent() {
    if (isSwitching || !richEditor) return;
    var tab = getActiveTab();
    if (!tab) return;
    tab.content = richEditor.innerHTML;
    tab.timestamp = Date.now();
    persistTabs();
  }

  function saveCurrentTabMetadata(triggerSaveIndicator) {
    if (isSwitching) return;
    if (metaTitle) currentMetadata.title = metaTitle.value || '';
    if (metaAuthor) currentMetadata.author = metaAuthor.value || '';
    if (metaTags) currentMetadata.tags = metaTags.value || '';
    if (metaCategory) currentMetadata.category = metaCategory.value || '';
    if (!currentMetadata.created) currentMetadata.created = new Date().toISOString();
    currentMetadata.modified = new Date().toISOString();
    var tab = getActiveTab();
    if (tab) { tab.metadata = currentMetadata; tab.timestamp = Date.now(); persistTabs(); }
    renderMetaDates();
    if (triggerSaveIndicator) { updateSaveIndicator(); }
  }

  function onTabSwitch(tab) {
    if (!tab) return;
    isSwitching = true;
    if (richEditor) richEditor.innerHTML = tab.content || '';
    currentMetadata = tab.metadata || {};
    if (metaTitle) metaTitle.value = currentMetadata.title || '';
    if (metaAuthor) metaAuthor.value = currentMetadata.author || '';
    if (metaTags) metaTags.value = currentMetadata.tags || '';
    if (metaCategory) metaCategory.value = currentMetadata.category || '';
    renderMetaDates();
    goalReachedShown = false;
    goalLockTriggered = false;
    if (richEditor) richEditor.contentEditable = 'true';
    updateStats();
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
    applyPageSettings();
    isSwitching = false;
    if (richEditor) richEditor.focus();
  }

  function updateSaveIndicator() {
    if (!saveIndicator) return;
    saveIndicator.style.visibility = hasSaveIndicatorHidden() ? 'hidden' : 'visible';
    var api = getTabsApi();
    var lastSavedTime = api ? api.getActiveTimestamp() : null;
    if (!lastSavedTime) {
      saveIndicator.textContent = getTrans('text_not_saved') || '\u2014';
      return;
    }
    var diff = Math.floor((Date.now() - lastSavedTime) / 1000);
    if (diff < 60) {
      saveIndicator.textContent = getTrans('text_saved_just_now') || 'Saved just now';
    } else if (diff < 3600) {
      var mins = Math.floor(diff / 60);
      saveIndicator.textContent = (getTrans('text_saved_minutes_ago') || '{n}m ago').replace('{n}', mins);
    } else {
      var hours = Math.floor(diff / 3600);
      saveIndicator.textContent = (getTrans('text_saved_hours_ago') || '{n}h ago').replace('{n}', hours);
    }
  }

  function hasSaveIndicatorHidden() {
    return localStorage.getItem('oros_hide_save_indicator') === 'true';
  }

  // ===== STATS =====
  function getTextContent() {
    var text = richEditor.innerText || '';
    return text.replace(/\n$/, '');
  }

  function updateStats() {
    if (!richEditor) return;
    var text = getTextContent();
    var chars = text.length;
    var charsNoSpaces = text.replace(/\s/g, '').length;
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    var sentences = text.split(/[.!?...]+(?:\s|$)/).filter(function(s) { return s.trim().length > 0; }).length;
    var readMin = Math.ceil(words / 225) || 0;
    var speakMin = Math.ceil(words / 170) || 0;

    if (statsDefaultEl) {
      var arrow = statsExpanded ? ' \u25B2' : ' \u25BC';
      statsDefaultEl.textContent = formatNumber(words) + ' ' + getTrans('text_words') +
        ' \u00B7 ' + formatNumber(chars) + ' ' + getTrans('text_chars') + arrow;
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

  // ===== GOAL =====
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
      ' ' + getGoalUnitLabel() + ' \u00B7 ' + pct + '%';
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

  function setGoal() {
    var target = parseInt(goalTargetInput.value);
    if (!target || target < 1) return;
    goalTarget = target;
    goalUnit = goalUnitSelect.value;
    goalLockEnabled = goalLockCheckbox ? goalLockCheckbox.checked : false;
    goalReachedShown = false;
    goalLockTriggered = false;
    if (richEditor) richEditor.contentEditable = 'true';
    localStorage.setItem('oros_goal_target', target.toString());
    localStorage.setItem('oros_goal_unit', goalUnit);
    localStorage.setItem('oros_goal_lock', goalLockEnabled ? 'true' : 'false');
    if (statsDefaultEl) statsDefaultEl.style.display = 'none';
    if (statsGoalEl) statsGoalEl.style.display = '';
    updateGoalProgress();
    if (goalBar) goalBar.style.display = 'none';
    showToast(getTrans('text_goal_set') + ': ' + goalTarget + ' ' + getGoalUnitLabel());
  }

  function clearGoal() {
    goalTarget = null;
    goalUnit = 'words';
    goalLockEnabled = false;
    goalReachedShown = false;
    goalLockTriggered = false;
    if (richEditor) richEditor.contentEditable = 'true';
    localStorage.removeItem('oros_goal_target');
    localStorage.removeItem('oros_goal_unit');
    localStorage.removeItem('oros_goal_lock');
    var hideStats = localStorage.getItem('oros_hide_stats') === 'true';
    if (statsDefaultEl) statsDefaultEl.style.display = hideStats ? 'none' : '';
    if (statsGoalEl) statsGoalEl.style.display = 'none';
    if (goalBar) goalBar.style.display = 'none';
    if (goalTargetInput) goalTargetInput.value = '';
    if (goalLockCheckbox) goalLockCheckbox.checked = false;
    showToast(getTrans('text_goal_cleared'));
  }

  function triggerGoalLock() {
    if (!goalLockEnabled || goalLockTriggered) return;
    goalLockTriggered = true;
    if (richEditor) richEditor.contentEditable = 'false';
    showToast(getTrans('text_goal_locked'));
  }

  function toggleGoalBar() {
    if (!goalBar) return;
    if (goalBar.style.display === 'flex') {
      saveCurrentTabMetadata(true);
      goalBar.style.display = 'none';
    } else {
      if (goalTargetInput) goalTargetInput.value = goalTarget ? goalTarget.toString() : '500';
      if (goalUnitSelect) goalUnitSelect.value = goalUnit || 'words';
      if (goalLockCheckbox) goalLockCheckbox.checked = goalLockEnabled;
      goalBar.style.display = 'flex';
      if (goalTargetInput) goalTargetInput.focus();
    }
  }
  
    // ===== FIND & REPLACE =====
  function clearHighlights() {
    if (!richEditor) return;
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
    var formatFilter = findFormatFilter ? findFormatFilter.value : '';
    if (!searchTerm) {
      if (frResults) frResults.textContent = getTrans('fr_no_matches');
      return;
    }
    var walker = document.createTreeWalker(richEditor, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        var parentTag = node.parentElement ? node.parentElement.tagName.toLowerCase() : '';
        if (formatFilter) {
          if (formatFilter === 'bold' && parentTag !== 'strong' && parentTag !== 'b') return NodeFilter.FILTER_REJECT;
          if (formatFilter === 'italic' && parentTag !== 'em' && parentTag !== 'i') return NodeFilter.FILTER_REJECT;
          if (formatFilter === 'underline' && parentTag !== 'u') return NodeFilter.FILTER_REJECT;
          if (formatFilter === 'h1' && parentTag !== 'h1') return NodeFilter.FILTER_REJECT;
          if (formatFilter === 'h2' && parentTag !== 'h2') return NodeFilter.FILTER_REJECT;
          if (formatFilter === 'h3' && parentTag !== 'h3') return NodeFilter.FILTER_REJECT;
        }
        if (!node.nodeValue.toLowerCase().includes(searchTerm.toLowerCase())) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }, false);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
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
    if (frResults) frResults.textContent = matchMarks.length + ' ' + getTrans('fr_results_matches');
    if (matchMarks.length > 0) {
      currentMatchIndex = 0;
      navigateMatchToMark(0);
    }
  }

  function navigateMatchToMark(index) {
    if (index < 0 || index >= matchMarks.length) return;
    if (currentMatchIndex >= 0 && matchMarks[currentMatchIndex]) {
      matchMarks[currentMatchIndex].classList.remove('current');
    }
    currentMatchIndex = index;
    var mark = matchMarks[index];
    mark.classList.add('current');
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (frResults) frResults.textContent = (index + 1) + '/' + matchMarks.length + ' ' + getTrans('fr_results_matches');
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
      var walker = document.createTreeWalker(richEditor, NodeFilter.SHOW_TEXT, null, false);
      var allMatches = [];
      while (walker.nextNode()) {
        var node = walker.currentNode;
        var text = node.nodeValue;
        var searchLower = searchTerm.toLowerCase();
        var pos = 0;
        while ((pos = text.toLowerCase().indexOf(searchLower, pos)) !== -1) {
          allMatches.push({ node: node, start: pos, end: pos + searchTerm.length });
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
      while (walker2.nextNode()) orderedNodes.push(walker2.currentNode);
      for (var n = orderedNodes.length - 1; n >= 0; n--) {
        var currentNode = orderedNodes[n];
        var nodeMatches = matchesByNode[currentNode];
        if (!nodeMatches || nodeMatches.length === 0) continue;
        nodeMatches.sort(function(a, b) { return b.start - a.start; });
        for (var mi = 0; mi < nodeMatches.length; mi++) {
          var match = nodeMatches[mi];
          var text2 = currentNode.nodeValue;
          var before = text2.substring(0, match.start);
          var after = text2.substring(match.end);
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

  // ===== FILE OPEN =====
  function openFile(file) {
    var extension = file.name.split('.').pop().toLowerCase();
    if (extension === 'doc') { showToast(getTrans('format_not_supported') || 'Format not supported: .doc'); return; }
    var reader = new FileReader();
    reader.onload = function(e) {
      var content = e.target.result;
      if (extension === 'docx' && typeof mammoth !== 'undefined') {
        mammoth.convertToHtml({ arrayBuffer: e.target.result }).then(function(result) {
          richEditor.innerHTML = result.value;
          saveCurrentTabContent();
          updateStats();
          showToast(getTrans('toast_opened'));
        }).catch(function(err) {
          console.error('DOCX conversion error:', err);
          showToast('Error converting DOCX');
        });
      } else if (extension === 'rtf' && typeof parseRTF !== 'undefined') {
        try {
          richEditor.innerHTML = parseRTF(content);
          saveCurrentTabContent();
          updateStats();
          showToast(getTrans('toast_opened'));
        } catch(err) {
          richEditor.innerHTML = content.replace(/\n/g, '<br>');
          saveCurrentTabContent();
          updateStats();
        }
      } else {
        richEditor.innerHTML = content.replace(/\n/g, '<br>');
        saveCurrentTabContent();
        updateStats();
        showToast(getTrans('toast_opened'));
      }
    };
    reader.onerror = function() { showToast('Error reading file'); };
    if (extension === 'docx' && typeof mammoth !== 'undefined') reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  }

  // ===== COMMENTS =====
  function loadComments() {
    var tab = getActiveTab();
    if (!tab) { commentsData = []; return; }
    commentsData = (tab.metadata && tab.metadata.comments) ? tab.metadata.comments : [];
    renderComments();
  }

  function saveComments() {
    var tab = getActiveTab();
    if (!tab) return;
    if (!tab.metadata) tab.metadata = {};
    tab.metadata.comments = commentsData;
    persistTabs();
  }

  function renderComments() {
    var listEl = document.getElementById('comments-list');
    var addArea = document.getElementById('comment-add-area');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (commentsData.length === 0) {
      listEl.innerHTML = '<div class="wordfreq-empty">' + getTrans('comments_empty') + '</div>';
      if (addArea) addArea.style.display = 'none';
      return;
    }
    for (var i = 0; i < commentsData.length; i++) {
      (function(c, ci) {
        var item = document.createElement('div');
        item.className = 'comment-item' + (c.resolved ? ' comment-resolved' : '') + (c.id === activeCommentId ? ' highlighted' : '');
        var header = document.createElement('div');
        header.className = 'comment-header';
        var author = document.createElement('span');
        author.className = 'comment-author';
        author.textContent = c.author || 'User';
        var timestamp = document.createElement('span');
        timestamp.className = 'comment-timestamp';
        timestamp.textContent = formatDate(new Date(c.timestamp));
        header.appendChild(author);
        header.appendChild(timestamp);
        var quoted = document.createElement('div');
        quoted.className = 'comment-quoted';
        quoted.textContent = '"' + (c.quotedText || '').substring(0, 80) + '..."';
        var text = document.createElement('div');
        text.className = 'comment-text';
        text.textContent = c.text;
        var actions = document.createElement('div');
        actions.className = 'comment-actions';
        var resolveBtn = document.createElement('button');
        resolveBtn.textContent = c.resolved ? 'Unresolve' : 'Resolve';
        resolveBtn.addEventListener('click', function() { c.resolved = !c.resolved; saveComments(); renderComments(); });
        var deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', function() { removeCommentHighlight(c.id); commentsData.splice(ci, 1); saveComments(); renderComments(); });
        actions.appendChild(resolveBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(header);
        item.appendChild(quoted);
        item.appendChild(text);
        item.appendChild(actions);
        item.addEventListener('click', function() { activeCommentId = c.id; scrollToComment(c.id); renderComments(); });
        listEl.appendChild(item);
      })(commentsData[i], i);
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
    var input = document.getElementById('comment-input');
    if (!input || !input.value.trim()) return;
    var sel = window.getSelection();
    var quotedText = '';
    var range = null;
    if (sel.rangeCount > 0 && !sel.isCollapsed && richEditor.contains(sel.anchorNode)) {
      range = sel.getRangeAt(0).cloneRange();
      quotedText = sel.toString();
    }
    var commentId = 'comment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    commentsData.push({
      id: commentId, text: input.value.trim(), author: currentMetadata.author || '',
      timestamp: new Date().toISOString(), quotedText: quotedText, resolved: false
    });
    if (range && !sel.isCollapsed) {
      try {
        var mark = document.createElement('span');
        mark.className = 'comment-highlight';
        mark.setAttribute('data-comment-id', commentId);
        range.surroundContents(mark);
      } catch(e) {}
    }
    saveComments();
    input.value = '';
    renderComments();
    saveCurrentTabContent();
  }

  function scrollToComment(commentId) {
    if (!richEditor) return;
    var highlight = richEditor.querySelector('[data-comment-id="' + commentId + '"]');
    if (highlight) {
      highlight.classList.add('active');
      highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function() { highlight.classList.remove('active'); }, 2000);
    }
  }

  function removeCommentHighlight(commentId) {
    if (!commentId || !richEditor) return;
    var highlights = richEditor.querySelectorAll('[data-comment-id="' + commentId + '"]');
    for (var i = 0; i < highlights.length; i++) {
      var h = highlights[i];
      var parent = h.parentNode;
      while (h.firstChild) parent.insertBefore(h.firstChild, h);
      parent.removeChild(h);
      parent.normalize();
    }
  }

  // ===== FOOTNOTES =====
  function updateFootnoteArea() {
    if (!footnoteArea || !richEditor) return;
    var footnotes = richEditor.querySelectorAll('.footnote-ref');
    if (footnotes.length === 0) { footnoteArea.style.display = 'none'; return; }
    footnoteArea.style.display = '';
    var list = document.getElementById('footnote-list');
    if (!list) return;
    list.innerHTML = '';
    for (var i = 0; i < footnotes.length; i++) {
      var ref = footnotes[i];
      var num = i + 1;
      ref.textContent = num;
      ref.setAttribute('data-footnote-num', num);
      var item = document.createElement('div');
      item.className = 'footnote-item';
      var numEl = document.createElement('span');
      numEl.className = 'footnote-item-num';
      numEl.textContent = num + '.';
      var textEl = document.createElement('span');
      textEl.textContent = ref.getAttribute('data-footnote-text') || '';
      item.appendChild(numEl);
      item.appendChild(textEl);
      list.appendChild(item);
    }
  }

  function toggleFootnoteDialog() {
    var dialog = document.getElementById('footnote-dialog-overlay');
    if (!dialog) return;
    var input = document.getElementById('footnote-text-input');
    if (input) input.value = '';
    dialog.style.display = 'flex';
    if (input) setTimeout(function() { input.focus(); }, 50);
  }

  function insertFootnote() {
    var input = document.getElementById('footnote-text-input');
    var dialog = document.getElementById('footnote-dialog-overlay');
    if (!input || !input.value.trim()) { if (dialog) dialog.style.display = 'none'; return; }
    var text = input.value.trim();
    var ref = document.createElement('sup');
    ref.className = 'footnote-ref';
    ref.setAttribute('data-footnote-text', text);
    ref.setAttribute('contenteditable', 'false');
    ref.textContent = '?';
    document.execCommand('insertHTML', false, ref.outerHTML);
    dialog.style.display = 'none';
    saveCurrentTabContent();
    updateFootnoteArea();
  }

  // ===== PAGE BREAK =====
  function insertPageBreak() {
    var marker = '<div class="page-break-marker" contenteditable="false"></div><p><br></p>';
    document.execCommand('insertHTML', false, marker);
    saveCurrentTabContent();
    showToast(getTrans('toast_page_break') || 'Page break inserted');
  }

  // ===== TOC =====
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
    var list = document.getElementById('toc-list');
    if (!list || !richEditor) return;
    var headings = richEditor.querySelectorAll('h1, h2, h3, h4, h5, h6');
    list.innerHTML = '';
    if (headings.length === 0) {
      list.innerHTML = '<div class="wordfreq-empty">' + getTrans('toc_empty') + '</div>';
      return;
    }
    for (var i = 0; i < headings.length; i++) {
      (function(h, idx) {
        if (!h.id) h.id = 'toc-heading-' + idx;
        var level = parseInt(h.tagName.charAt(1));
        var item = document.createElement('div');
        item.className = 'toc-item toc-level-' + level;
        item.innerHTML = '<span class="toc-num">' + (idx + 1) + '.</span><span>' + (h.textContent || '(empty)') + '</span>';
        item.addEventListener('click', function() {
          h.scrollIntoView({ behavior: 'smooth', block: 'start' });
          h.classList.add('outline-flash');
          setTimeout(function() { h.classList.remove('outline-flash'); }, 1200);
        });
        list.appendChild(item);
      })(headings[i], i);
    }
  }

  function insertToCIntoDocument() {
    if (!richEditor) return;
    var headings = richEditor.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) { showToast(getTrans('toc_empty')); return; }
    var tocHtml = '<div class="toc-document"><h2>' + getTrans('toc_title') + '</h2><ul>';
    for (var i = 0; i < headings.length; i++) {
      var h = headings[i];
      if (!h.id) h.id = 'toc-heading-' + i;
      var level = parseInt(h.tagName.charAt(1));
      var indent = ' style="margin-left:' + ((level - 1) * 20) + 'px;"';
      tocHtml += '<li' + indent + '><a href="#' + h.id + '">' + (h.textContent || '(empty)') + '</a></li>';
    }
    tocHtml += '</ul></div><p><br></p>';
    var sel = window.getSelection();
    if (sel.rangeCount > 0 && richEditor.contains(sel.anchorNode)) {
      document.execCommand('insertHTML', false, tocHtml);
    } else {
      richEditor.innerHTML = tocHtml + richEditor.innerHTML;
    }
    saveCurrentTabContent();
    showToast(getTrans('toc_inserted') || 'Table of contents inserted');
  }

  // ===== TRACK CHANGES =====
  function toggleTrackChanges() {
    trackingChanges = !trackingChanges;
    var btn = document.getElementById('btn-track-changes');
    if (btn) btn.classList.toggle('active', trackingChanges);
    if (trackChangesBar) trackChangesBar.style.display = trackingChanges ? 'flex' : 'none';
    showToast(trackingChanges ? getTrans('track_changes_on') : getTrans('track_changes_off'));
  }

  function acceptAllChanges() {
    if (!richEditor) return;
    var deletes = richEditor.querySelectorAll('.tracker-delete');
    for (var i = 0; i < deletes.length; i++) deletes[i].remove();
    var inserts = richEditor.querySelectorAll('.tracker-insert');
    for (var j = 0; j < inserts.length; j++) {
      var parent = inserts[j].parentNode;
      while (inserts[j].firstChild) parent.insertBefore(inserts[j].firstChild, inserts[j]);
      parent.removeChild(inserts[j]);
    }
    saveCurrentTabContent();
    showToast(getTrans('track_changes_accepted') || 'All changes accepted');
  }

  function rejectAllChanges() {
    if (!richEditor) return;
    var inserts = richEditor.querySelectorAll('.tracker-insert');
    for (var i = 0; i < inserts.length; i++) inserts[i].remove();
    var deletes = richEditor.querySelectorAll('.tracker-delete');
    for (var j = 0; j < deletes.length; j++) {
      var parent = deletes[j].parentNode;
      while (deletes[j].firstChild) parent.insertBefore(deletes[j].firstChild, deletes[j]);
      parent.removeChild(deletes[j]);
    }
    saveCurrentTabContent();
    showToast(getTrans('track_changes_rejected') || 'All changes rejected');
  }

  // ===== VERSION HISTORY =====
  function addVersionSnapshot(tabId) {
    var tab = tabsState.find(function(t) { return t.id === tabId; });
    if (!tab || !richEditor) return;
    if (!tab.versions) tab.versions = [];
    var words = (richEditor.innerText || '').trim().split(/\s+/).filter(Boolean).length;
    tab.versions.push({
      id: 'v-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      timestamp: Date.now(), content: richEditor.innerHTML, wordCount: words
    });
    if (tab.versions.length > MAX_VERSIONS_PER_TAB) tab.versions.shift();
    persistTabs();
  }

  function getVersionsForTab(tabId) {
    var tab = tabsState.find(function(t) { return t.id === tabId; });
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
    var list = document.getElementById('version-list');
    if (!list) return;
    list.innerHTML = '';
    var versions = getVersionsForTab(activeTabId);
    if (versions.length === 0) {
      list.innerHTML = '<div class="wordfreq-empty">' + getTrans('version_empty') + '</div>';
      return;
    }
    for (var i = versions.length - 1; i >= 0; i--) {
      (function(v, vi, isLatest) {
        var item = document.createElement('div');
        item.className = 'version-item' + (isLatest ? ' current' : '');
        var header = document.createElement('div');
        header.className = 'version-header';
        var time = document.createElement('span');
        time.className = 'version-time';
        time.textContent = formatDate(new Date(v.timestamp));
        var badge = document.createElement('span');
        badge.className = 'version-badge';
        badge.textContent = isLatest ? getTrans('version_current') : ('v' + (vi + 1));
        header.appendChild(time);
        header.appendChild(badge);
        var words = document.createElement('div');
        words.className = 'version-words';
        words.textContent = v.wordCount + ' ' + getTrans('text_words');
        var actions = document.createElement('div');
        actions.className = 'version-actions';
        var previewBtn = document.createElement('button');
        previewBtn.textContent = getTrans('version_preview') || 'Preview';
        previewBtn.addEventListener('click', function() { previewVersion(v); });
        var restoreBtn = document.createElement('button');
        restoreBtn.textContent = getTrans('version_restore') || 'Restore';
        restoreBtn.addEventListener('click', function() { restoreVersion(v); });
        actions.appendChild(previewBtn);
        actions.appendChild(restoreBtn);
        item.appendChild(header);
        item.appendChild(words);
        item.appendChild(actions);
        list.appendChild(item);
      })(versions[i], i, i === versions.length - 1);
    }
  }

  function previewVersion(version) {
    var overlay = document.getElementById('version-preview-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'version-preview-overlay';
      overlay.className = 'dialog-overlay';
      overlay.innerHTML =
        '<div class="dialog dialog-large" style="width:80vw;height:85vh;">' +
          '<div class="dialog-header"><h3>' + getTrans('version_preview') + '</h3>' +
          '<button class="dialog-close" id="btn-close-version-preview"><i class="fa fa-times"></i></button></div>' +
          '<div class="dialog-body" style="flex:1;overflow-y:auto;">' +
          '<div id="version-preview-content" class="rich-editor" style="padding:20px;"></div></div>' +
          '<div class="dialog-actions"><button class="btn-cancel" id="btn-close-version-preview-ok">' + getTrans('btn_ok') + '</button></div>' +
        '</div>';
      document.body.appendChild(overlay);
      document.getElementById('btn-close-version-preview').addEventListener('click', function() { overlay.style.display = 'none'; });
      document.getElementById('btn-close-version-preview-ok').addEventListener('click', function() { overlay.style.display = 'none'; });
    }
    overlay.style.display = 'flex';
    document.getElementById('version-preview-content').innerHTML = version.content;
  }

  function restoreVersion(version) {
    if (!confirm(getTrans('version_confirm_restore') || 'Restore this version? Current content will be replaced.')) return;
    addVersionSnapshot(activeTabId);
    richEditor.innerHTML = version.content;
    saveCurrentTabContent();
    updateStats();
    renderVersions();
    showToast(getTrans('version_restored') || 'Version restored');
  }

  // ===== METADATA =====
  function renderMetaDates() {
    if (metaCreated) metaCreated.textContent = getTrans('meta_label_created') + ' ' + formatDate(new Date(currentMetadata.created));
    if (metaModified) metaModified.textContent = getTrans('meta_label_modified') + ' ' + formatDate(new Date(currentMetadata.modified));
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

  function applyPageSettings() {
    var tab = getActiveTab();
    if (!tab) return;
    var size = (tab.metadata && tab.metadata.pageSize) || 'a4';
    var sizeMap = { a4: '210mm 297mm', letter: '216mm 279mm', legal: '216mm 356mm' };
    document.documentElement.style.setProperty('--page-size', sizeMap[size] || sizeMap.a4);
  }

  // ===== LOREM IPSUM =====
  function insertLoremIpsum() {
    if (!richEditor) return;
    var lang = getCurrentLang();
    var templates = {
      en: '<h1>Document Title</h1><p>This is the <strong>first paragraph</strong> with various formatting. Lorem ipsum dolor sit amet.</p><ul><li>First bullet point</li><li>Second bullet point</li></ul><h2>Section Subheading</h2><blockquote>"Art is a lie that makes us realize the truth."</blockquote><p>The <em>final paragraph</em> wraps up the sample content.</p>',
      el: '<h1>\u03A4\u03AF\u03C4\u03BB\u03BF\u03C2 \u0395\u03B3\u03B3\u03C1\u03AC\u03C6\u03BF\u03C5</h1><p>\u0391\u03C5\u03C4\u03AE \u03B5\u03AF\u03BD\u03B1\u03B9 \u03B7 <strong>\u03C0\u03C1\u03CE\u03C4\u03B7 \u03C0\u03B1\u03C1\u03AC\u03B3\u03C1\u03B1\u03C6\u03BF\u03C2</strong>.</p><ul><li>\u03A0\u03C1\u03CE\u03C4\u03BF \u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03BF</li></ul><h2>\u03A5\u03C0\u03CC\u03C4\u03B9\u03C4\u03BB\u03BF\u03C2</h2><blockquote>"\u0397 \u03C4\u03AD\u03C7\u03BD\u03B7 \u03B5\u03AF\u03BD\u03B1\u03B9 \u03AD\u03BD\u03B1 \u03C8\u03AD\u03BC\u03B1."</blockquote><p>\u03A4\u03B5\u03BB\u03B9\u03BA\u03AE \u03C0\u03B1\u03C1\u03AC\u03B3\u03C1\u03B1\u03C6\u03BF\u03C2.</p>'
    };
    var sep = richEditor.innerHTML.trim() ? '<p><br></p>' : '';
    richEditor.innerHTML += sep + (templates[lang] || templates.en);
    saveCurrentTabContent();
    updateStats();
    showToast(getTrans('toast_lorem_inserted') || 'Sample text inserted');
  }

    // ===== FOCUS MODE =====
  function toggleFocusMode() {
    focusModeEnabled = !focusModeEnabled;
    document.body.classList.toggle('focus-mode', focusModeEnabled);
    if (!focusModeEnabled && richEditor) {
      var focused = richEditor.querySelectorAll('.is-focused');
      for (var i = 0; i < focused.length; i++) focused[i].classList.remove('is-focused');
    } else {
      highlightFocusedParagraph();
    }
    showToast(focusModeEnabled ? 'Focus mode on' : 'Focus mode off');
  }

  function highlightFocusedParagraph() {
    if (!focusModeEnabled || !richEditor || !richWrapper) return;
    var sel = window.getSelection();
    var currentPara = null;
    if (sel.rangeCount > 0) {
      var node = sel.getRangeAt(0).startContainer;
      while (node && node !== richEditor) {
        if (node.nodeType === 1 && ['P','H1','H2','H3','H4','H5','H6','BLOCKQUOTE','PRE','UL','OL'].indexOf(node.tagName) !== -1) {
          currentPara = node;
          break;
        }
        node = node.parentNode;
      }
    }
    if (!currentPara) {
      var blocks = richEditor.querySelectorAll('p, h1, h2, h3, h4, h5, h6, blockquote, pre, ul, ol');
      var scrollTop = richWrapper.scrollTop;
      var viewportMid = scrollTop + richWrapper.clientHeight / 2;
      var closestDist = Infinity;
      for (var i = 0; i < blocks.length; i++) {
        var rect = blocks[i].getBoundingClientRect();
        var blockMid = rect.top + scrollTop + rect.height / 2;
        var dist = Math.abs(blockMid - viewportMid);
        if (dist < closestDist) { closestDist = dist; currentPara = blocks[i]; }
      }
    }
    var focused = richEditor.querySelectorAll('.is-focused');
    for (var j = 0; j < focused.length; j++) focused[j].classList.remove('is-focused');
    if (currentPara) currentPara.classList.add('is-focused');
  }

  // ===== READING MODE =====
  function toggleReadingMode() {
    readingModeEnabled = !readingModeEnabled;
    document.body.classList.toggle('reading-mode', readingModeEnabled);
    if (readingModeEnabled) {
      if (!document.getElementById('reading-mode-exit')) {
        var exitBtn = document.createElement('button');
        exitBtn.id = 'reading-mode-exit';
        exitBtn.className = 'action-btn';
        exitBtn.innerHTML = '<i class="fa fa-times"></i>';
        exitBtn.title = 'Exit reading mode';
        exitBtn.addEventListener('click', toggleReadingMode);
        document.body.appendChild(exitBtn);
      }
      document.getElementById('reading-mode-exit').style.display = '';
    } else {
      var exitBtn2 = document.getElementById('reading-mode-exit');
      if (exitBtn2) exitBtn2.style.display = 'none';
    }
    showToast(readingModeEnabled ? 'Reading mode on' : 'Reading mode off');
  }

  // ===== AUTO-CORRECTION =====
  function loadAutoCorrections() {
    try {
      var raw = localStorage.getItem('oros_autocorrect_rules');
      autoCorrections = raw ? JSON.parse(raw) : [];
    } catch(e) { autoCorrections = []; }
    var defaults = [
      { pattern: '-->', replacement: '\u2192' }, { pattern: '<--', replacement: '\u2190' },
      { pattern: '<->', replacement: '\u2194' }, { pattern: '!=', replacement: '\u2260' },
      { pattern: '<=', replacement: '\u2264' }, { pattern: '>=', replacement: '\u2265' },
      { pattern: '1/2', replacement: '\u00BD' }, { pattern: '1/3', replacement: '\u2153' },
      { pattern: '2/3', replacement: '\u2154' }, { pattern: '1/4', replacement: '\u00BC' },
      { pattern: '3/4', replacement: '\u00BE' }, { pattern: '+-', replacement: '\u00B1' },
      { pattern: '...', replacement: '\u2026' }
    ];
    for (var i = 0; i < defaults.length; i++) {
      var exists = autoCorrections.find(function(r) { return r.pattern === defaults[i].pattern; });
      if (!exists) autoCorrections.push(defaults[i]);
    }
  }

  function saveAutoCorrections() {
    try { localStorage.setItem('oros_autocorrect_rules', JSON.stringify(autoCorrections)); } catch(e) {}
  }

  function applyAutoCorrections() {
    if (isReplacing || goalLockTriggered || autoCorrections.length === 0 || !richEditor) return;
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    if (!range.collapsed || !richEditor.contains(range.endContainer)) return;
    var preRange = range.cloneRange();
    preRange.selectNodeContents(richEditor);
    preRange.setEnd(range.endContainer, range.endOffset);
    var before = preRange.toString();
    if (!before) return;
    for (var i = 0; i < autoCorrections.length; i++) {
      var rule = autoCorrections[i];
      if (!rule.pattern || !rule.replacement) continue;
      if (before.endsWith(rule.pattern)) {
        isReplacing = true;
        for (var j = 0; j < rule.pattern.length; j++) document.execCommand('delete', false);
        document.execCommand('insertText', false, rule.replacement);
        isReplacing = false;
        break;
      }
    }
  }

  // ===== TYPEWRITER SOUND =====
  function initTypewriterSound() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      typewriterAudioCtx = new AC();
      var sr = typewriterAudioCtx.sampleRate;
      var dur = 0.04;
      var ns = Math.floor(sr * dur);
      var buf = typewriterAudioCtx.createBuffer(1, ns, sr);
      var data = buf.getChannelData(0);
      for (var i = 0; i < ns; i++) {
        var t = i / sr;
        var env = Math.exp(-t * 80);
        var noise = (Math.random() * 2 - 1) * 0.3;
        var click = Math.sin(2 * Math.PI * 2000 * t) * 0.15;
        data[i] = (noise + click) * env * 0.5;
      }
      typewriterAudioBuffer = buf;
    } catch(e) { typewriterAudioCtx = null; }
  }

  // ===== IMAGE INSERTION =====
  function toggleImageDialog() {
    var dialog = document.getElementById('image-dialog-overlay');
    if (!dialog) return;
    if (dialog.style.display === 'flex') { dialog.style.display = 'none'; return; }
    var fi = document.getElementById('image-file-input');
    var ui = document.getElementById('image-url-input');
    var ci = document.getElementById('image-caption-input');
    var si = document.getElementById('image-source-type');
    if (fi) fi.value = '';
    if (ui) ui.value = '';
    if (ci) ci.value = '';
    if (si) si.value = 'upload';
    var uf = document.getElementById('image-upload-field');
    var urlf = document.getElementById('image-url-field');
    if (uf) uf.style.display = '';
    if (urlf) urlf.style.display = 'none';
    dialog.style.display = 'flex';
  }

  function insertImageFromUpload() {
    var fi = document.getElementById('image-file-input');
    var ci = document.getElementById('image-caption-input');
    if (!fi || !fi.files || fi.files.length === 0) return;
    var file = fi.files[0];
    if (file.size > 5 * 1024 * 1024) { showToast('Image too large (max 5MB)'); return; }
    var reader = new FileReader();
    reader.onload = function(e) {
      insertImage(e.target.result, ci ? ci.value.trim() : '');
      var d = document.getElementById('image-dialog-overlay');
      if (d) d.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  function insertImageFromUrl() {
    var ui = document.getElementById('image-url-input');
    var ci = document.getElementById('image-caption-input');
    if (!ui || !ui.value.trim()) return;
    var src = ui.value.trim();
    if (!/^https?:\/\//i.test(src)) { showToast('URL must start with http:// or https://'); return; }
    insertImage(src, ci ? ci.value.trim() : '');
    var d = document.getElementById('image-dialog-overlay');
    if (d) d.style.display = 'none';
  }

  function insertImage(src, caption) {
    var cap = caption ? '<br><span style="font-size:0.9em;color:#666;">' + caption + '</span>' : '';
    document.execCommand('insertHTML', false, '<figure class="editor-figure"><img src="' + src + '" alt="' + (caption || 'Image') + '" class="editor-image"/>' + cap + '</figure>');
    saveCurrentTabContent();
    updateStats();
    if (richEditor) richEditor.focus();
  }

  // ===== TABLE BUILDER =====
  function toggleTableDialog() {
    var dialog = document.getElementById('table-dialog-overlay');
    if (!dialog) return;
    if (dialog.style.display === 'flex') { dialog.style.display = 'none'; return; }
    dialog.style.display = 'flex';
  }

  function createTable() {
    var rows = parseInt(document.getElementById('table-rows-select').value) || 3;
    var cols = parseInt(document.getElementById('table-cols-select').value) || 3;
    var html = '<table class="custom-table"><tbody>';
    for (var r = 0; r < rows; r++) {
      html += '<tr>';
      for (var c = 0; c < cols; c++) {
        var th = r === 0;
        html += '<' + (th ? 'th' : 'td') + '>' + (th ? '' : '<br>') + '</' + (th ? 'th' : 'td') + '>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    document.execCommand('insertHTML', false, html);
    saveCurrentTabContent();
    updateStats();
    var d = document.getElementById('table-dialog-overlay');
    if (d) d.style.display = 'none';
    if (richEditor) richEditor.focus();
  }

  // ===== LINK DIALOG =====
  function toggleLinkDialog() {
    var dialog = document.getElementById('link-dialog-overlay');
    if (!dialog) return;
    if (dialog.style.display === 'flex') { dialog.style.display = 'none'; return; }
    var urlInput = document.getElementById('link-url-input');
    var textInput = document.getElementById('link-text-input');
    var sel = window.getSelection();
    var selectedText = '';
    var currentHref = '';
    if (sel.rangeCount > 0 && !sel.isCollapsed && richEditor.contains(sel.anchorNode)) {
      selectedText = sel.toString();
    } else if (sel.rangeCount > 0) {
      var node = sel.getRangeAt(0).startContainer;
      var parent = node.nodeType === 3 ? node.parentNode : node;
      while (parent && parent !== richEditor && parent.tagName !== 'A') parent = parent.parentNode;
      if (parent && parent.tagName === 'A') {
        currentHref = parent.getAttribute('href') || '';
        selectedText = parent.textContent;
        parent.setAttribute('data-editing-link', 'true');
      }
    }
    if (urlInput) urlInput.value = currentHref;
    if (textInput) textInput.value = selectedText || '';
    dialog.style.display = 'flex';
    if (urlInput) setTimeout(function() { urlInput.focus(); urlInput.select(); }, 50);
  }

  function insertOrUpdateLink() {
    var urlInput = document.getElementById('link-url-input');
    var textInput = document.getElementById('link-text-input');
    var dialog = document.getElementById('link-dialog-overlay');
    if (!urlInput || !urlInput.value.trim()) {
      document.execCommand('unlink', false);
      if (dialog) dialog.style.display = 'none';
      if (richEditor) richEditor.focus();
      return;
    }
    var url = urlInput.value.trim();
    if (!/^https?:\/\//i.test(url)) { showToast('URL must start with http:// or https://'); return; }
    var text = textInput ? textInput.value.trim() : '';
    var editingLink = richEditor.querySelector('a[data-editing-link="true"]');
    if (editingLink) {
      editingLink.removeAttribute('data-editing-link');
      editingLink.href = url;
      if (text && text !== editingLink.textContent) editingLink.textContent = text;
    } else {
      var a = document.createElement('a');
      a.href = url;
      a.textContent = text || url;
      document.execCommand('insertHTML', false, a.outerHTML);
    }
    if (dialog) dialog.style.display = 'none';
    saveCurrentTabContent();
    if (richEditor) richEditor.focus();
  }

  // ===== SPECIAL CHARACTERS =====
  var SPECIAL_CHAR_CATEGORIES = {
    'greek': { label: 'Greek', chars: ['\u0391','\u0392','\u0393','\u0394','\u0395','\u0396','\u0397','\u0398','\u0399','\u039A','\u039B','\u039C','\u039D','\u039E','\u039F','\u03A0','\u03A1','\u03A3','\u03A4','\u03A5','\u03A6','\u03A7','\u03A8','\u03A9','\u03B1','\u03B2','\u03B3','\u03B4','\u03B5','\u03B6','\u03B7','\u03B8','\u03B9','\u03BA','\u03BB','\u03BC','\u03BD','\u03BE','\u03BF','\u03C0','\u03C1','\u03C3','\u03C4','\u03C5','\u03C6','\u03C7','\u03C8','\u03C9','\u0386','\u0388','\u0389','\u038A','\u038C','\u038E','\u038F','\u0390','\u03B0','\u03AA','\u03AB','\u03C2'] },
    'math': { label: 'Math', chars: ['\u00B1','\u00F7','\u00D7','\u221E','\u221A','\u2211','\u220F','\u222B','\u2202','\u2207','\u2248','\u2260','\u2264','\u2265','\u221D','\u2208','\u2209','\u2229','\u222A','\u2282','\u2283','\u2286','\u2287','\u2295','\u2297','\u22A5','\u2220','\u00B0','\u2032','\u2033','\u03C0','\u0192','\u2115','\u2124','\u211A','\u211D','\u2102','\u2200','\u2203','\u00AC','\u2227','\u2228','\u21D2','\u21D4','\u2192','\u2190','\u2194'] },
    'arrows': { label: 'Arrows', chars: ['\u2191','\u2193','\u2190','\u2192','\u2194','\u2195','\u2197','\u2198','\u2199','\u2196','\u21D1','\u21D3','\u21D0','\u21D2','\u21D4','\u21D5','\u21D7','\u21D8','\u21D9','\u21D6','\u279C','\u27A1','\u2B06','\u2B07','\u2B05','\u2B22','\u2B21','\u25B6','\u25C0','\u25B2','\u25BC','\u25BA','\u25C4'] },
    'currency': { label: 'Currency', chars: ['\u20AC','$','\u00A3','\u00A5','\u20BF','\u00A2','\u00A4','\u20A9','\u20B9','\u20BD','\u20BA','\u20B4'] },
    'punctuation': { label: 'Punctuation', chars: ['\u00AB','\u00BB','\u2039','\u203A','\u201E','\u201C','\u201D','\u2018','\u2019','\u201A','\u201B','\u00A1','\u00BF','\u00A7','\u00B6','\u2020','\u2021','\u2022','\u00B7','\u2026','\u2030','\u203B'] },
    'symbols': { label: 'Symbols', chars: ['\u00A9','\u00AE','\u2122','\u2117','\u2120','\u00B0','\u2116','\u2669','\u266A','\u266B','\u266C','\u266D','\u266E','\u266F','\u2713','\u2714','\u2717','\u2718','\u2726','\u2727','\u2605','\u2606','\u2698','\u2620'] },
    'subsup': { label: 'Sub/Superscript', chars: ['\u2070','\u00B9','\u00B2','\u00B3','\u2074','\u2075','\u2076','\u2077','\u2078','\u2079','\u2080','\u2081','\u2082','\u2083','\u2084','\u2085','\u2086','\u2087','\u2088','\u2089','\u207A','\u207B','\u207C','\u208A','\u208B','\u208C'] }
  };

  function toggleSpecialCharsDialog() {
    var dialog = document.getElementById('special-chars-dialog-overlay');
    if (!dialog) return;
    if (dialog.style.display === 'flex') { dialog.style.display = 'none'; return; }
    dialog.style.display = 'flex';
    renderSpecialChars('greek');
  }

  function renderSpecialChars(category) {
    var grid = document.getElementById('special-chars-grid');
    var tabsEl = document.getElementById('special-chars-tabs');
    if (!grid || !tabsEl) return;
    tabsEl.innerHTML = '';
    var cats = Object.keys(SPECIAL_CHAR_CATEGORIES);
    for (var i = 0; i < cats.length; i++) {
      (function(cat) {
        var tab = document.createElement('button');
        tab.className = 'sc-tab' + (cat === category ? ' active' : '');
        tab.textContent = SPECIAL_CHAR_CATEGORIES[cat].label;
        tab.addEventListener('click', function() { renderSpecialChars(cat); });
        tabsEl.appendChild(tab);
      })(cats[i]);
    }
    var data = SPECIAL_CHAR_CATEGORIES[category];
    grid.innerHTML = '';
    for (var j = 0; j < data.chars.length; j++) {
      (function(ch) {
        var btn = document.createElement('button');
        btn.className = 'sc-char';
        btn.textContent = ch;
        btn.addEventListener('click', function() {
          document.execCommand('insertText', false, ch);
          saveCurrentTabContent();
          updateStats();
          if (richEditor) richEditor.focus();
        });
        grid.appendChild(btn);
      })(data.chars[j]);
    }
  }

  // ===== TEMPLATES =====
  var TEMPLATES = {
    'essay': { icon: 'fa-graduation-cap', title: 'Essay', description: 'Academic essay structure',
      generate: function(lang) {
        if (lang === 'el') return '<h1>[\u03A4\u03AF\u03C4\u03BB\u03BF\u03C2 \u0394\u03BF\u03BA\u03B9\u03BC\u03AF\u03BF\u03C5]</h1><p><em>\u03A3\u03C5\u03B3\u03B3\u03C1\u03B1\u03C6\u03AD\u03B1\u03C2: [\u038C\u03BD\u03BF\u03BC\u03B1]</em></p><h2>\u0395\u03B9\u03C3\u03B1\u03B3\u03C9\u03B3\u03AE</h2><p>[\u03A0\u03C1\u03BF\u03C3\u03B4\u03B9\u03BF\u03C1\u03AF\u03C3\u03C4\u03B5 \u03C4\u03BF \u03B8\u03AD\u03BC\u03B1 \u03BA\u03B1\u03B9 \u03C4\u03B7 \u03B8\u03AD\u03C3\u03B7 \u03C3\u03B1\u03C2 \u03B5\u03B4\u03CE.]</p><h2>\u039A\u03CD\u03C1\u03B9\u03BF \u039C\u03AD\u03C1\u03BF\u03C2</h2><h3>\u03A0\u03C1\u03CE\u03C4\u03BF \u03A3\u03B7\u03BC\u03B5\u03AF\u03BF</h3><p>[\u03A0\u03B1\u03C1\u03BF\u03C5\u03C3\u03B9\u03AC\u03C3\u03C4\u03B5 \u03C4\u03BF \u03C0\u03C1\u03CE\u03C4\u03BF \u03B5\u03C0\u03B9\u03C7\u03B5\u03AF\u03C1\u03B7\u03BC\u03B1.]</p><h2>\u03A3\u03C5\u03BC\u03C0\u03AD\u03C1\u03B1\u03C3\u03BC\u03B1</h2><p>[\u03A3\u03C5\u03BD\u03BF\u03C8\u03AF\u03C3\u03C4\u03B5 \u03C4\u03B1 \u03B2\u03B1\u03C3\u03B9\u03BA\u03AC \u03C3\u03B7\u03BC\u03B5\u03AF\u03B1.]</p>';
        return '<h1>[Essay Title]</h1><p><em>Author: [Name]</em></p><h2>Introduction</h2><p>[Define the topic and your thesis here.]</p><h2>Main Body</h2><h3>First Point</h3><p>[Present your first argument with supporting evidence.]</p><h3>Second Point</h3><p>[Develop your second argument with examples.]</p><h2>Conclusion</h2><p>[Summarize key points and restate your thesis.]</p>';
      }
    },
    'letter': { icon: 'fa-envelope', title: 'Letter', description: 'Formal letter format',
      generate: function(lang) {
        if (lang === 'el') return '<p style="text-align:right;">[\u038C\u03BD\u03BF\u03BC\u03B1 \u0391\u03C0\u03BF\u03C3\u03C4\u03BF\u03BB\u03AD\u03B1]<br>[\u0394\u03B9\u03B5\u03CD\u03B8\u03C5\u03BD\u03C3\u03B7]</p><p style="text-align:left;">[\u038C\u03BD\u03BF\u03BC\u03B1 \u03A0\u03B1\u03C1\u03B1\u03BB\u03AE\u03C0\u03C4\u03B7]</p><p><strong>\u0398\u03AD\u03BC\u03B1: [\u0398\u03AD\u03BC\u03B1 \u0395\u03C0\u03B9\u03C3\u03C4\u03BF\u03BB\u03AE\u03C2]</strong></p><p>\u0391\u03BE\u03B9\u03CC\u03C4\u03B9\u03BC\u03B5/\u03B5 \u03BA\u03CD\u03C1\u03B9\u03B5/\u03B1,</p><p>[\u039A\u03CD\u03C1\u03B9\u03BF \u03BA\u03B5\u03AF\u03BC\u03B5\u03BD\u03BF \u03C4\u03B7\u03C2 \u03B5\u03C0\u03B9\u03C3\u03C4\u03BF\u03BB\u03AE\u03C2.]</p><p>\u039C\u03B5 \u03B5\u03BA\u03C4\u03AF\u03BC\u03B7\u03C3\u03B7,</p><p><br>[\u03A5\u03C0\u03BF\u03B3\u03C1\u03B1\u03C6\u03AE]<br>[\u038C\u03BD\u03BF\u03BC\u03B1 \u0391\u03C0\u03BF\u03C3\u03C4\u03BF\u03BB\u03AD\u03B1]</p>';
        return '<p style="text-align:right;">[Sender Name]<br>[Address]</p><p style="text-align:left;">[Recipient Name]<br>[Recipient Address]</p><p><strong>Subject: [Letter Subject]</strong></p><p>Dear Mr./Ms. [Last Name],</p><p>[Main body of the letter.]</p><p>Sincerely,</p><p><br>[Signature]<br>[Sender Name]</p>';
      }
    },
    'resume': { icon: 'fa-file-text', title: 'Resume', description: 'Professional resume template',
      generate: function(lang) {
        if (lang === 'el') return '<h1>[\u039F\u03BD\u03BF\u03BC\u03B1\u03C4\u03B5\u03C0\u03CE\u03BD\u03C5\u03BC\u03BF]</h1><p>[\u03A4\u03B7\u03BB\u03AD\u03C6\u03C9\u03BD\u03BF] | [Email] | [LinkedIn]</p><hr><h2>\u0395\u03C0\u03B1\u03B3\u03B3\u03B5\u03BB\u03BC\u03B1\u03C4\u03B9\u03BA\u03AE \u03A3\u03CD\u03BD\u03BF\u03C8\u03B7</h2><p>[\u03A3\u03CD\u03BD\u03C4\u03BF\u03BC\u03B7 \u03C0\u03B5\u03C1\u03B9\u03B3\u03C1\u03B1\u03C6\u03AE.]</p><h2>\u0395\u03C0\u03B1\u03B3\u03B3\u03B5\u03BB\u03BC\u03B1\u03C4\u03B9\u03BA\u03AE \u0395\u03BC\u03C0\u03B5\u03B9\u03C1\u03AF\u03B1</h2><p><strong>[\u0398\u03AD\u03C3\u03B7]</strong> | [\u0395\u03C4\u03B1\u03B9\u03C1\u03B5\u03AF\u03B1]</p><ul><li>[\u0391\u03C1\u03BC\u03BF\u03B4\u03B9\u03CC\u03C4\u03B7\u03C4\u03B1 1]</li></ul><h2>\u0395\u03BA\u03C0\u03B1\u03AF\u03B4\u03B5\u03C5\u03C3\u03B7</h2><p><strong>[\u03A0\u03C4\u03C5\u03C7\u03AF\u03BF]</strong> | [\u038A\u03B4\u03C1\u03C5\u03BC\u03B1]</p>';
        return '<h1>[Full Name]</h1><p>[Phone] | [Email] | [LinkedIn]</p><hr><h2>Professional Summary</h2><p>[Brief description of your experience and skills.]</p><h2>Work Experience</h2><p><strong>[Position]</strong> | [Company]</p><ul><li>[Responsibility 1]</li><li>[Responsibility 2]</li></ul><h2>Education</h2><p><strong>[Degree]</strong> | [Institution] | [Year]</p><h2>Skills</h2><p>[Skill 1], [Skill 2], [Skill 3]</p>';
      }
    },
    'meeting': { icon: 'fa-users', title: 'Meeting Notes', description: 'Structured meeting notes',
      generate: function(lang) {
        if (lang === 'el') return '<h1>\u03A0\u03C1\u03B1\u03BA\u03C4\u03B9\u03BA\u03AC \u03A3\u03C5\u03BD\u03AC\u03BD\u03C4\u03B7\u03C3\u03B7\u03C2</h1><p><strong>\u0397\u03BC\u03B5\u03C1\u03BF\u03BC\u03B7\u03BD\u03AF\u03B1:</strong> [\u0397\u03BC\u03B5\u03C1\u03BF\u03BC\u03B7\u03BD\u03AF\u03B1]</p><h2>\u0391\u03C4\u03B6\u03AD\u03BD\u03C4\u03B1</h2><ol><li>[\u0398\u03AD\u03BC\u03B1 1]</li><li>[\u0398\u03AD\u03BC\u03B1 2]</li></ol><h2>\u03A3\u03C5\u03B6\u03AE\u03C4\u03B7\u03C3\u03B7</h2><p>[\u03A3\u03CD\u03BD\u03BF\u03C8\u03B7.]</p><h2>\u0395\u03BD\u03AD\u03C1\u03B3\u03B5\u03B9\u03B5\u03C2</h2><table class="custom-table"><tr><th>\u0395\u03BD\u03AD\u03C1\u03B3\u03B5\u03B9\u03B1</th><th>\u03A5\u03C0\u03B5\u03CD\u03B8\u03C5\u03BD\u03BF\u03C2</th><th>\u03A0\u03C1\u03BF\u03B8\u03B5\u03C3\u03BC\u03AF\u03B1</th></tr><tr><td>[\u0395\u03BD\u03AD\u03C1\u03B3\u03B5\u03B9\u03B1]</td><td>[\u038C\u03BD\u03BF\u03BC\u03B1]</td><td>[\u0397\u03BC\u03B5\u03C1\u03BF\u03BC\u03B7\u03BD\u03AF\u03B1]</td></tr></table>';
        return '<h1>Meeting Minutes</h1><p><strong>Date:</strong> [Date]<br><strong>Attendees:</strong> [Names]</p><h2>Agenda</h2><ol><li>[Topic 1]</li><li>[Topic 2]</li></ol><h2>Discussion & Decisions</h2><p>[Summary of discussion and decision.]</p><h2>Action Items</h2><table class="custom-table"><tr><th>Action</th><th>Owner</th><th>Deadline</th></tr><tr><td>[Action 1]</td><td>[Name]</td><td>[Date]</td></tr></table>';
      }
    },
    'blank': { icon: 'fa-file-o', title: 'Blank', description: 'Empty document', generate: function() { return '<p><br></p>'; } }
  };

  function toggleTemplatesDialog() {
    var dialog = document.getElementById('templates-dialog-overlay');
    if (!dialog) return;
    if (dialog.style.display === 'flex') { dialog.style.display = 'none'; return; }
    dialog.style.display = 'flex';
    renderTemplatesGrid();
  }

  function renderTemplatesGrid() {
    var grid = document.getElementById('templates-grid');
    if (!grid) return;
    grid.innerHTML = '';
    var keys = Object.keys(TEMPLATES);
    for (var i = 0; i < keys.length; i++) {
      (function(key) {
        var tpl = TEMPLATES[key];
        var card = document.createElement('div');
        card.className = 'template-card';
        card.innerHTML = '<i class="fa ' + tpl.icon + '"></i><h4>' + tpl.title + '</h4><p>' + tpl.description + '</p>';
        card.addEventListener('click', function() { loadTemplate(key); });
        grid.appendChild(card);
      })(keys[i]);
    }
  }

  function loadTemplate(templateKey) {
    var tpl = TEMPLATES[templateKey];
    if (!tpl || !richEditor) return;
    var content = tpl.generate(getCurrentLang());
    var hasContent = richEditor.innerHTML.trim().length > 0 && richEditor.innerHTML !== '<p><br></p>';
    if (hasContent && !confirm(getTrans('template_replace_confirm') || 'Replace current document content with this template?')) return;
    richEditor.innerHTML = content;
    saveCurrentTabContent();
    updateStats();
    var d = document.getElementById('templates-dialog-overlay');
    if (d) d.style.display = 'none';
    showToast(getTrans('template_loaded') || 'Template loaded');
    if (richEditor) richEditor.focus();
  }

  // ===== NAMED STYLES =====
  var NAMED_STYLES = {
    'normal': { tag: 'p' }, 'h1': { tag: 'h1' }, 'h2': { tag: 'h2' }, 'h3': { tag: 'h3' }, 'h4': { tag: 'h4' },
    'quote': { tag: 'blockquote' }, 'code': { tag: 'pre' }, 'list-bullet': { tag: 'ul' }, 'list-number': { tag: 'ol' }
  };

  function applyNamedStyle(styleKey) {
    var style = NAMED_STYLES[styleKey];
    if (!style || !richEditor) return;
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    var block = sel.getRangeAt(0).startContainer;
    while (block && block !== richEditor && ['P','H1','H2','H3','H4','H5','H6','BLOCKQUOTE','PRE'].indexOf(block.tagName) === -1) {
      block = block.parentNode;
    }
    if (!block || block === richEditor) return;
    var newTag = style.tag;
    var newEl = document.createElement(newTag);
    if (newTag === 'ul' || newTag === 'ol') {
      var li = document.createElement('li');
      li.innerHTML = block.innerHTML;
      newEl.appendChild(li);
      block.parentNode.replaceChild(newEl, block);
    } else if (block.tagName === 'UL' || block.tagName === 'OL') {
      var items = block.querySelectorAll('li');
      if (items.length > 0) {
        newEl.innerHTML = items[0].innerHTML;
        block.parentNode.replaceChild(newEl, block);
        for (var i = 1; i < items.length; i++) {
          var extra = document.createElement(newTag);
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
  }

  function detectCurrentStyle() {
    if (!stylesSelect || !richEditor) return;
    var sel = window.getSelection();
    if (!sel.rangeCount) { stylesSelect.value = 'normal'; return; }
    var node = sel.getRangeAt(0).startContainer;
    while (node && node !== richEditor) {
      if (node.tagName) {
        var tag = node.tagName.toLowerCase();
        if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'blockquote' || tag === 'pre' || tag === 'ul' || tag === 'ol' || tag === 'p') {
          stylesSelect.value = (tag === 'blockquote') ? 'quote' : (tag === 'pre') ? 'code' : (tag === 'ul') ? 'list-bullet' : (tag === 'ol') ? 'list-number' : tag;
          return;
        }
      }
      node = node.parentNode;
    }
    stylesSelect.value = 'normal';
  }

  // ===== EXPORT: TXT =====
  function exportTxt() {
    var temp = document.createElement('div');
    temp.innerHTML = richEditor.innerHTML;
    var brs = temp.querySelectorAll('br');
    for (var i = 0; i < brs.length; i++) brs[i].replaceWith('\n');
    var blocks = temp.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, tr, blockquote, pre');
    for (var j = 0; j < blocks.length; j++) blocks[j].appendChild(document.createTextNode('\n'));
    var text = temp.textContent || '';
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), getFileName('txt'));
    showToast(getTrans('toast_exported') || 'Exported');
  }

  // ===== EXPORT: MARKDOWN =====
function exportMarkdown() {
    var md = '';
    var blocks = richEditor.children;
    function procInline(node) {
        var r = '';
        if (!node || !node.childNodes) return r;
        for (var i = 0; i < node.childNodes.length; i++) {
            var c = node.childNodes[i];
            if (c.nodeType === 3) { 
                r += c.textContent; 
            } else if (c.nodeType === 1) {
                var ct = c.tagName.toLowerCase();
                if (ct === 'strong' || ct === 'b') r += '**' + procInline(c) + '**';
                else if (ct === 'em' || ct === 'i') r += '*' + procInline(c) + '*';
                else if (ct === 's' || ct === 'del') r += '~~' + procInline(c) + '~~';
                else if (ct === 'code') r += '`' + c.textContent + '`';
                else if (ct === 'sub') r += '~' + procInline(c) + '~';
                else if (ct === 'sup') r += '^' + procInline(c) + '^';
                else if (ct === 'a') r += '[' + c.textContent + '](' + (c.getAttribute('href')||'') + ')';
                else if (ct === 'br') r += '\n';
                else if (ct === 'img') r += '![' + (c.getAttribute('alt')||'') + '](' + (c.getAttribute('src')||'') + ')';
                else r += procInline(c);
            }
        }
        return r;
    }
    for (var i = 0; i < blocks.length; i++) {
        var n = blocks[i], tag = n.tagName ? n.tagName.toLowerCase() : '';
        if (tag === 'h1') md += '# ' + (n.textContent || '').trim() + '\n\n';
        else if (tag === 'h2') md += '## ' + (n.textContent || '').trim() + '\n\n';
        else if (tag === 'h3') md += '### ' + (n.textContent || '').trim() + '\n\n';
        else if (tag === 'h4') md += '#### ' + (n.textContent || '').trim() + '\n\n';
        else if (tag === 'blockquote') md += '> ' + (n.textContent || '').replace(/\n/g, '\n> ') + '\n\n';
        else if (tag === 'pre') md += '```\n' + (n.textContent || '') + '\n```\n\n';
        else if (tag === 'ul') {
            var items = n.querySelectorAll(':scope > li');
            for (var u = 0; u < items.length; u++) md += '- ' + procInline(items[u]).replace(/\n/g, ' ') + '\n';
            md += '\n';
        }
        else if (tag === 'ol') {
            var items2 = n.querySelectorAll(':scope > li');
            for (var o = 0; o < items2.length; o++) md += (o+1) + '. ' + procInline(items2[o]).replace(/\n/g, ' ') + '\n';
            md += '\n';
        }
        else if (tag === 'table' && n.classList.contains('custom-table')) {
            var rows = n.querySelectorAll('tr');
            if (rows.length > 0) {
                var hc = rows[0].querySelectorAll('th, td');
                md += '| ' + Array.from(hc).map(function(cell){return cell.textContent.trim();}).join(' | ') + ' |\n';
                md += '|' + Array.from(hc).map(function(){return '---';}).join('|') + '|\n';
                for (var ri = 1; ri < rows.length; ri++) {
                    var cells = rows[ri].querySelectorAll('td, th');
                    md += '| ' + Array.from(cells).map(function(cell){return cell.textContent.trim();}).join(' | ') + ' |\n';
                }
                md += '\n';
            }
        }
        else if (tag === 'div' && n.classList.contains('page-break-marker')) md += '\n---\n\n';
        else if (tag === 'hr') md += '\n---\n\n';
        else if (tag === 'img') md += '![' + (n.getAttribute('alt')||'') + '](' + (n.getAttribute('src')||'') + ')\n\n';
        else md += procInline(n).replace(/\n/g, ' ').trim() + '\n\n';
    }
    downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), getFileName('md'));
    showToast(getTrans('toast_exported') || 'Exported');
}

  // ===== EXPORT: RTF =====
  function exportRtf() {
    var rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}{\\f1 Courier New;}}\n';
    function esc(text) { return text.replace(/\\/g,'\\\\').replace(/\{/g,'\\{').replace(/\}/g,'\\}').replace(/\n/g,'\\line\n'); }
    function procInline(node) {
      var r = '';
      for (var i = 0; i < node.childNodes.length; i++) {
        var c = node.childNodes[i];
        if (c.nodeType === 3) r += esc(c.textContent);
        else if (c.nodeType === 1) {
          var ct = c.tagName.toLowerCase();
          if (ct === 'strong' || ct === 'b') r += '{\\b ' + procInline(c) + '}';
          else if (ct === 'em' || ct === 'i') r += '{\\i ' + procInline(c) + '}';
          else if (ct === 'u') r += '{\\ul ' + procInline(c) + '}';
          else if (ct === 's' || ct === 'strike') r += '{\\strike ' + procInline(c) + '}';
          else if (ct === 'sub') r += '{\\sub ' + procInline(c) + '}';
          else if (ct === 'sup') r += '{\\super ' + procInline(c) + '}';
          else if (ct === 'code') r += '{\\f1 ' + esc(c.textContent) + '}';
          else if (ct === 'br') r += '\\line\n';
          else r += procInline(c);
        }
      }
      return r;
    }
    var blocks = richEditor.children;
    for (var i = 0; i < blocks.length; i++) {
      var n = blocks[i], tag = n.tagName ? n.tagName.toLowerCase() : '';
      if (tag === 'h1') rtf += '{\\b\\fs48 ' + esc(n.textContent) + '}\\par\n';
      else if (tag === 'h2') rtf += '{\\b\\fs40 ' + esc(n.textContent) + '}\\par\n';
      else if (tag === 'h3') rtf += '{\\b\\fs36 ' + esc(n.textContent) + '}\\par\n';
      else if (tag === 'h4') rtf += '{\\b\\fs32 ' + esc(n.textContent) + '}\\par\n';
      else if (tag === 'blockquote') rtf += '{\\i\\fi720 ' + procInline(n) + '}\\par\n';
      else if (tag === 'pre') rtf += '{\\f1 ' + esc(n.textContent) + '}\\par\n';
      else if (tag === 'ul') {
        var items = n.querySelectorAll(':scope > li');
        for (var u = 0; u < items.length; u++) rtf += '{\\pntext\\bullet\\tab ' + procInline(items[u]) + '}\\par\n';
      }
      else if (tag === 'ol') {
        var items2 = n.querySelectorAll(':scope > li');
        for (var o = 0; o < items2.length; o++) rtf += '{\\pntext ' + (o+1) + '.\\tab ' + procInline(items2[o]) + '}\\par\n';
      }
      else if (tag === 'div' && n.classList.contains('page-break-marker')) rtf += '\\page\n';
      else if (tag === 'table' && n.classList.contains('custom-table')) {
        var rows = n.querySelectorAll('tr');
        for (var r = 0; r < rows.length; r++) {
          var cells = rows[r].querySelectorAll('td, th');
          for (var cc = 0; cc < cells.length; cc++) {
            rtf += (cells[cc].tagName === 'TH' ? '{\\b ' : '') + esc(cells[cc].textContent) + (cells[cc].tagName === 'TH' ? '}' : '') + '\\cell ';
          }
          rtf += '\\row\n';
        }
      }
      else if (tag === 'hr') rtf += '\\brdrb\\brdrs\\brdrw10\\par\n';
      else rtf += procInline(n) + '\\par\n';
    }
    rtf += '}';
    downloadBlob(new Blob([rtf], { type: 'application/rtf' }), getFileName('rtf'));
    showToast(getTrans('toast_exported') || 'Exported');
  }

  // ===== EXPORT: DOCX =====
  function exportDocx() {
    if (typeof JSZip === 'undefined') { showToast('JSZip library not found. Place jszip.min.js in assets/js/lib/'); return; }
    var zip = new JSZip();
    var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>';
    var coreXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + escapeXml(currentMetadata.title||'') + '</dc:title><dc:creator>' + escapeXml(currentMetadata.author||'') + '</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + (currentMetadata.created||new Date().toISOString()) + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + new Date().toISOString() + '</dcterms:modified></cp:coreProperties>';
    var appXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>orOS Writer</Application></Properties>';
    var docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>';

    function procDocxInline(node) {
      var r = '';
      for (var i = 0; i < node.childNodes.length; i++) {
        var c = node.childNodes[i];
        if (c.nodeType === 3) {
          var esc = escapeXml(c.textContent);
          r += '<w:r><w:t xml:space="preserve">' + esc + '</w:t></w:r>';
        } else if (c.nodeType === 1) {
          var ct = c.tagName.toLowerCase();
          if (ct === 'strong' || ct === 'b') r += '<w:r><w:rPr><w:b/></w:rPr>' + procDocxInline(c) + '</w:r>';
          else if (ct === 'em' || ct === 'i') r += '<w:r><w:rPr><w:i/></w:rPr>' + procDocxInline(c) + '</w:r>';
          else if (ct === 'u') r += '<w:r><w:rPr><w:u w:val="single"/></w:rPr>' + procDocxInline(c) + '</w:r>';
          else if (ct === 's' || ct === 'strike' || ct === 'del') r += '<w:r><w:rPr><w:strike/></w:rPr>' + procDocxInline(c) + '</w:r>';
          else if (ct === 'sub') r += '<w:r><w:rPr><w:vertAlign w:val="subscript"/></w:rPr>' + procDocxInline(c) + '</w:r>';
          else if (ct === 'sup') r += '<w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr>' + procDocxInline(c) + '</w:r>';
          else if (ct === 'br') r += '<w:r><w:br/></w:r>';
          else if (ct === 'code') r += '<w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/></w:rPr><w:t xml:space="preserve">' + escapeXml(c.textContent) + '</w:t></w:r>';
          else if (ct === 'mark') r += '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr>' + procDocxInline(c) + '</w:r>';
          else r += procDocxInline(c);
        }
      }
      return r || '<w:r><w:t></w:t></w:r>';
    }

    var docBody = '';
    var blocks = richEditor.children;
    for (var i = 0; i < blocks.length; i++) {
      var n = blocks[i], tag = n.tagName ? n.tagName.toLowerCase() : '';
      if (tag === 'h1') docBody += '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>' + procDocxInline(n) + '</w:p>';
      else if (tag === 'h2') docBody += '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>' + procDocxInline(n) + '</w:p>';
      else if (tag === 'h3') docBody += '<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr>' + procDocxInline(n) + '</w:p>';
      else if (tag === 'h4'||tag==='h5'||tag==='h6') docBody += '<w:p><w:pPr><w:pStyle w:val="Heading4"/></w:pPr>' + procDocxInline(n) + '</w:p>';
      else if (tag === 'blockquote') docBody += '<w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr>' + procDocxInline(n) + '</w:p>';
      else if (tag === 'pre') {
        var lines = (n.textContent||'').split('\n');
        for (var l = 0; l < lines.length; l++) {
          docBody += '<w:p><w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/></w:rPr><w:t xml:space="preserve">' + escapeXml(lines[l]) + '</w:t></w:r></w:p>';
        }
      }
      else if (tag === 'ul') {
        var items = n.querySelectorAll(':scope > li');
        for (var u = 0; u < items.length; u++) docBody += '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>' + procDocxInline(items[u]) + '</w:p>';
      }
      else if (tag === 'ol') {
        var items2 = n.querySelectorAll(':scope > li');
        for (var o = 0; o < items2.length; o++) docBody += '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>' + procDocxInline(items2[o]) + '</w:p>';
      }
      else if (tag === 'div' && n.classList.contains('page-break-marker')) docBody += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      else if (tag === 'table' && n.classList.contains('custom-table')) {
        var rows = n.querySelectorAll('tr');
        docBody += '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr>';
        for (var r = 0; r < rows.length; r++) {
          var cells = rows[r].querySelectorAll('td, th');
          docBody += '<w:tr>';
          for (var cc = 0; cc < cells.length; cc++) {
            docBody += '<w:tc><w:tcPr><w:tcW w:w="2500" w:type="dxa"/></w:tcPr><w:p>' + (cells[cc].tagName==='TH'?'<w:rPr><w:b/></w:rPr>':'') + procDocxInline(cells[cc]) + '</w:p></w:tc>';
          }
          docBody += '</w:tr>';
        }
        docBody += '</w:tbl><w:p/>';
      }
      else if (tag === 'hr') docBody += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>';
      else if (tag === 'img') docBody += '<w:p><w:r><w:t xml:space="preserve">[Image]</w:t></w:r></w:p>';
      else docBody += '<w:p>' + procDocxInline(n) + '</w:p>';
    }

    var documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>' + docBody + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>';
    var numberingXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\u2022"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>';
    var stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:i/></w:rPr></w:style></w:styles>';

    zip.file('[Content_Types].xml', contentTypes);
    zip.file('_rels/.rels', rels);
    zip.file('word/document.xml', documentXml);
    zip.file('word/styles.xml', stylesXml);
    zip.file('word/numbering.xml', numberingXml);
    zip.file('word/_rels/document.xml.rels', docRels);
    zip.file('docProps/core.xml', coreXml);
    zip.file('docProps/app.xml', appXml);
    zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      .then(function(blob) { downloadBlob(blob, getFileName('docx')); showToast(getTrans('toast_exported') || 'Exported as DOCX'); })
      .catch(function(err) { console.error('DOCX export error:', err); showToast('Error generating DOCX'); });
  }

  // ===== EXPORT: EPUB =====
  function exportEpub() {
    if (typeof JSZip === 'undefined') { showToast('JSZip library not found'); return; }
    var zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
    var containerXml = '<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>';
    var title = escapeXml(currentMetadata.title || 'Untitled');
    var author = escapeXml(currentMetadata.author || 'Unknown Author');
    var bookId = 'oros-writer-' + Date.now();
    var blocks = richEditor.children;
    var chapters = [];
    var currentHtml = '';
    function finalizeChapter() {
      if (currentHtml.trim().length > 0) {
        chapters.push({ title: 'Chapter', html: currentHtml });
      }
      currentHtml = '';
    }
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].tagName === 'H1') {
        finalizeChapter();
        chapters.push({ title: blocks[i].textContent || 'Chapter', html: '<h1>' + escapeXml(blocks[i].textContent) + '</h1>' });
      } else {
        currentHtml += blocks[i].outerHTML || '';
      }
    }
    finalizeChapter();
    if (chapters.length === 0) chapters.push({ title: title, html: richEditor.innerHTML });
    var manifestItems = '', spineItems = '', navItems = '';
    for (var j = 0; j < chapters.length; j++) {
      var fn = 'chapter' + (j+1) + '.xhtml';
      var cleaned = chapters[j].html.replace(/contenteditable="[^"]*"/g, '').replace(/data-[a-z-]+="[^"]*"/g, '');
      zip.file('OEBPS/' + fn, '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>' + escapeXml(chapters[j].title) + '</title><link rel="stylesheet" href="style.css" type="text/css"/></head><body>' + cleaned + '</body></html>');
      manifestItems += '<item id="chap' + (j+1) + '" href="' + fn + '" media-type="application/xhtml+xml"/>';
      spineItems += '<itemref idref="chap' + (j+1) + '"/>';
      navItems += '<li><a href="' + fn + '">' + escapeXml(chapters[j].title) + '</a></li>';
    }
    var opfXml = '<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf"><dc:identifier id="BookId">urn:uuid:' + bookId + '</dc:identifier><dc:title>' + title + '</dc:title><dc:creator>' + author + '</dc:creator><dc:language>' + (getCurrentLang()==='el'?'el':'en') + '</dc:language></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/>' + manifestItems + '</manifest><spine>' + spineItems + '</spine></package>';
    var navXhtml = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Table of Contents</title></head><body><nav epub:type="toc"><h1>Table of Contents</h1><ol>' + navItems + '</ol></nav></body></html>';
    var css = 'body{font-family:Georgia,serif;line-height:1.6;margin:1em;}h1{font-size:1.8em;}h2{font-size:1.4em;}blockquote{margin-left:1em;font-style:italic;border-left:3px solid #ccc;padding-left:1em;}pre{font-family:monospace;}table{border-collapse:collapse;}td,th{border:1px solid #ccc;padding:0.3em;}';
    zip.file('META-INF/container.xml', containerXml);
    zip.file('OEBPS/content.opf', opfXml);
    zip.file('OEBPS/nav.xhtml', navXhtml);
    zip.file('OEBPS/style.css', css);
    zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
      .then(function(blob) { downloadBlob(blob, getFileName('epub')); showToast(getTrans('toast_exported') || 'Exported as EPUB'); })
      .catch(function(err) { console.error('EPUB export error:', err); showToast('Error generating EPUB'); });
  }

  function handleExport(format) {
    switch (format) {
      case 'txt': exportTxt(); break;
      case 'md': exportMarkdown(); break;
      case 'rtf': exportRtf(); break;
      case 'docx': exportDocx(); break;
      case 'epub': exportEpub(); break;
      case 'pdf': window.print(); break;
    }
  }

  // ===== CLEAR CONTENT =====
  function clearContent() {
    if (!richEditor) return;
    if (richEditor.innerHTML.trim() && !confirm(getTrans('confirm_clear') || 'Clear all content?')) return;
    richEditor.innerHTML = '<p><br></p>';
    saveCurrentTabContent();
    updateStats();
    showToast(getTrans('toast_cleared') || 'Content cleared');
  }

  // ===== SETTINGS MODAL =====
  function toggleSettingsModal() {
    var modal = document.getElementById('settings-modal');
    if (!modal) return;
    if (modal.classList.contains('active')) {
      modal.classList.remove('active');
    } else {
      modal.classList.add('active');
      loadSettingsValues();
    }
  }

  function loadSettingsValues() {
    var set = function(id, val) { var el = document.getElementById(id); if (el) el.checked = val; };
    set('toggle-hide-save-indicator', hasSaveIndicatorHidden());
    set('toggle-hide-stats', localStorage.getItem('oros_hide_stats') === 'true');
    set('toggle-reading-progress', localStorage.getItem('oros_reading_progress') !== 'false');
    set('toggle-smart-typography', smartTypographyEnabled);
    set('toggle-typewriter-sound', typewriterSoundEnabled);
    set('toggle-smart-paste', smartPasteEnabled);
    set('toggle-focus-mode', focusModeEnabled);
    // Hide/show toolbar buttons based on stored prefs
    applyToolbarVisibilityPrefs();
  }

  function applyToolbarVisibilityPrefs() {
    var map = {
      'btn-goal': 'oros_hide_goal_btn',
      'btn-outline': 'oros_hide_outline_btn',
      'btn-metadata': 'oros_hide_metadata_btn',
      'btn-find': 'oros_hide_find_btn',
      'btn-wordfreq': 'oros_hide_wordfreq_btn',
      'btn-lorem': 'oros_hide_lorem_btn'
    };
    for (var id in map) {
      var btn = document.getElementById(id);
      if (btn) btn.style.display = localStorage.getItem(map[id]) === 'true' ? 'none' : '';
    }
  }

  function saveSettings() {
    var get = function(id) { var el = document.getElementById(id); return el ? el.checked : false; };
    localStorage.setItem('oros_hide_save_indicator', get('toggle-hide-save-indicator') ? 'true' : 'false');
    localStorage.setItem('oros_hide_stats', get('toggle-hide-stats') ? 'true' : 'false');
    localStorage.setItem('oros_reading_progress', get('toggle-reading-progress') ? 'true' : 'false');
    localStorage.setItem('oros_hide_goal_btn', get('toggle-hide-goal-btn') ? 'true' : 'false');
    localStorage.setItem('oros_hide_outline_btn', get('toggle-hide-outline-btn') ? 'true' : 'false');
    localStorage.setItem('oros_hide_metadata_btn', get('toggle-hide-metadata-btn') ? 'true' : 'false');
    localStorage.setItem('oros_hide_find_btn', get('toggle-hide-find-btn') ? 'true' : 'false');
    localStorage.setItem('oros_hide_wordfreq_btn', get('toggle-hide-wordfreq-btn') ? 'true' : 'false');
    localStorage.setItem('oros_hide_lorem_btn', get('toggle-hide-lorem-btn') ? 'true' : 'false');
    smartTypographyEnabled = get('toggle-smart-typography'); localStorage.setItem('oros_smart_typography', smartTypographyEnabled ? 'true' : ''');
    smartPasteEnabled = get('toggle-smart-paste'); localStorage.setItem('oros_smart_paste', smartPasteEnabled ? 'true' : 'false');
    
    // Page size setting
    var pageSizeSelect = document.getElementById('setting-page-size');
    if (pageSizeSelect) {
      var ps = pageSizeSelect.value;
      var tab = getActiveTab();
      if (tab) {
        if (!tab.metadata) tab.metadata = {};
        tab.metadata.pageSize = ps;
        persistTabs();
        applyPageSettings();
      }
    }
    
    applyToolbarVisibilityPrefs();
    showToast(getTrans('settings_saved') || 'Settings saved');
  }

  // ===== HELP DIALOG =====
  function toggleHelpDialog() {
    var dialog = document.getElementById('help-dialog-overlay');
    if (!dialog) return;
    if (dialog.style.display === 'flex') { dialog.style.display = 'none'; return; }
    dialog.style.display = 'flex';
    renderHelpShortcuts();
  }

  function renderHelpShortcuts() {
    var list = document.getElementById('shortcuts-list');
    if (!list) return;
    var lang = getCurrentLang();
    var shortcuts = [
      { k: 'Ctrl+S', d: lang === 'el' ? 'Αποθήκευση' : 'Save' },
      { k: 'Ctrl+N', d: lang === 'el' ? 'Νέο εγγραφο' : 'New document' },
      { k: 'Ctrl+W', d: lang === 'el' ? 'Κλείσιμο καρτέλας' : 'Close tab' },
      { k: 'Ctrl+B', d: 'Bold' },
      { k: 'Ctrl+I', d: 'Italic' },
      { k: 'Ctrl+U', d: 'Underline' },
      { k: 'Ctrl+Shift+X', d: lang === 'el' ? 'Διαγραμμίωση' : 'Strikethrough' },
      { k: 'Ctrl+F', d: lang === 'el' ? 'Εύρεση' : 'Find' },
      { k: 'Ctrl+G', d: lang === 'el' ? 'Στόχος λέξεων' : 'Word goal' },
      { k: 'Ctrl+K', d: lang === 'el' ? 'Εισαγωγή συνδέσμου' : 'Insert link' },
      { k: 'Ctrl+,', d: lang === 'el' ? 'Κάτω δείκτης' : 'Subscript' },
      { k: 'Ctrl+.', d: lang === 'el' ? 'Πάνω δείκτης' : 'Superscript' },
      { k: 'F9', d: lang === 'el' ? 'Λειτουργία ανάγνωσης' : 'Reading mode' },
      { k: 'Double-click tab', d: lang === 'el' ? 'Μετονομασία καρτέλας' : 'Rename tab' }
    ];
    var html = '';
    for (var i = 0; i < shortcuts.length; i++) {
      html += '<div class="shortcut-row"><kbd>' + shortcuts[i].k + '</kbd><span>' + shortcuts[i].d + '</span></div>';
    }
    list.innerHTML = html;
  }

  // ===== UTILITIES =====
  function downloadBlob(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 100);
  }

  function getFileName(extension) {
    var base = (currentMetadata.title || 'untitled').replace(/[^a-zA-Z0-9\u0370-\u03FF\s\-_]/g, '').trim().replace(/\s+/g, '_');
    return base + '.' + extension;
  }

  function escapeXml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function formatDate(date) {
    if (!date || !(date instanceof Date)) return '';
    var day = String(date.getDate()).padStart(2, '0');
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var year = date.getFullYear();
    var hour = String(date.getHours()).padStart(2, '0');
    var min = String(date.getMinutes()).padStart(2, '0');
    return day + '/' + month + '/' + year + ' ' + hour + ':' + min;
  }

  function formatNumber(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function showToast(message) {
    if (!toastContainer) return;
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(function() {
      toast.classList.add('show');
      setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { toastContainer.removeChild(toast); }, 300);
      }, 3000);
    }, 50);
  }

  function getCurrentLang() {
    return (localStorage.getItem('oros_lang') || 'en').substring(0, 2);
  }

  // ===== DOM BINDING =====
  function bindDOMElements() {
    richEditor = document.getElementById('rich-editor');
    richWrapper = document.getElementById('rich-wrapper');
    tabBar = document.getElementById('tab-bar');
    metaTitle = document.getElementById('meta-title');
    metaAuthor = document.getElementById('meta-author');
    metaTags = document.getElementById('meta-tags');
    metaCategory = document.getElementById('meta-category');
    metaCreated = document.getElementById('meta-created');
    metaModified = document.getElementById('meta-modified');
    saveIndicator = document.getElementById('save-indicator');
    goalTarget = null;
    goalUnit = localStorage.getItem('oros_goal_unit') || 'words';
    goalLockEnabled = localStorage.getItem('oros_goal_lock') === 'true';
    goalTargetInput = document.getElementById('goal-target-input');
    goalUnitSelect = document.getElementById('goal-unit-select');
    goalLockCheckbox = document.getElementById('goal-lock-checkbox');
    statsDefaultEl = document.getElementById('stats-default');
    statsGoalEl = document.getElementById('stats-goal');
    statsDetailed = document.getElementById('stats-detailed');
    goalBar = document.getElementById('goal-bar');
    goalBarContent = document.getElementById('goal-bar-content');
    goalBarFill = document.getElementById('goal-bar-fill');
    sessionDisplay = document.getElementById('session-display');
    readingProgressBar = document.getElementById('reading-progress-bar');
    outlinePanel = document.getElementById('outline-panel');
    outlineList = document.getElementById('outline-list');
    wordFreqPanel = document.getElementById('word-freq-panel');
    wordFreqList = document.getElementById('word-freq-list');
    wordFreqSummary = document.getElementById('word-freq-summary');
    commentsPanel = document.getElementById('comments-panel');
    footnoteArea = document.getElementById('footnote-area');
    tocPanel = document.getElementById('toc-panel');
    tocList = document.getElementById('toc-list');
    versionPanel = document.getElementById('version-panel');
    metadataPanel = document.getElementById('metadata-panel');
    findBar = document.getElementById('find-bar');
    findInput = document.getElementById('find-input');
    replaceInput = document.getElementById('replace-input');
    frResults = document.getElementById('fr-results');
    trackChangesBar = document.getElementById('track-changes-bar');
    versionPanel = document.getElementById('version-panel');
    stylesSelect = document.getElementById('styles-select');
    toastContainer = document.getElementById('toast-container');
    
    var btns = [
      'btn-bold','btn-italic','btn-underline','btn-strikethrough','btn-subscript','btn-superscript',
      'btn-h1','btn-h2','btn-h3','btn-bullets','btn-numbers','btn-align-left','btn-align-center','btn-align-right',
      'btn-quote','btn-code','btn-hr','btn-undo','btn-redo','btn-link','btn-image','btn-table','btn-special',
      'btn-template','btn-track-changes','btn-outline','btn-metadata','btn-comments','btn-toc','btn-wordfreq','btn-version','btn-find',
      'btn-goalse','btn-session','btn-zen','btn-focus','btn-reading'
    ];
    for (var i = 0; i < btns.length; i++) {
      var b = document.getElementById(btns[i]);
      if (b) { /* buttons exist */ }
    }
  }

  // ===== INITIALIZATION =====
  function init() {
    loadTranslations();
    applyLanguage(localStorage.getItem('oros_lang') || 'en');
    loadAutoCorrections();
    bindDOMElements();
    setupFormatButtons();
    setupEditorInput();
    setupKeyboardShortcuts();
    loadTabs();
    onTabSwitch(getActiveTab());
    if (smartTypographyEnabled) document.addEventListener('keyup', function(e) {
      if (!isReplacing && !goalLockTriggered) handleSmartTypography();
    });
    if (typewriterSoundEnabled && typewriterAudioCtx) document.addEventListener('keypress', function(e) {
      if (document.activeElement === richEditor && !e.ctrlKey && !e.altKey && e.key.length === 1 && /[a-zA-Z0-9\u03B1-\u03C9\s]/.test(e.key)) {
        playTypewriterSound();
      }
    });
    loadSettingsValues();
    initWindowResize();
    
    // ===== PWA INSTALL HANDLING =====
if (window.addEventListener) {
    window.addEventListener('beforeinstallprompt', function(e) {
        // Prevent Chrome 67+ from showing mini install banner
        e.preventDefault();
        
        // Store the deferred prompt for later use
        window.deferredPrompt = e;
        
        // Show custom install button if it exists
        var installBtn = document.getElementById('btn-install-app');
        if (installBtn) {
            installBtn.style.display = '';
            installBtn.onclick = function() {
                if (window.deferredPrompt) {
                    window.deferredPrompt.prompt();
                    window.deferredPrompt.userChoice.then(function(choiceResult) {
                        window.deferredPrompt = null;
                        installBtn.style.display = 'none';
                    });
                }
            };
        }
    });
}

    window.addEventListener('load', function() {
      updateStats();
      updateReadingProgress();
      updateToolbarStates();
      applyPageSettings();
    });

    window.addEventListener('resize', function() {
      clearTimeout(windowResizeDebounce);
      windowResizeDebounce = setTimeout(function() {
        updateReadingProgress();
        highlightFocusedParagraph();
      }, 100);
    });

    setInterval(updateSaveIndicator, 10000);
    
    var confirmUnload = function(e) {
      if (activeTabId && activeTabId !== 'index-home') {
        e.preventDefault();
        e.returnValue = getTrans('confirm_leave') || 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', confirmUnload);

    console.log('orOS Writer initialized successfully');
    orOSWriter.ready = true;
  }

  function playTypewriterSound() {
    if (!typewriterAudioBuffer) return;
    if (!typewriterAudioCtx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) typewriterAudioCtx = new AC();
      } catch(e) { return; }
    }
    var src = typewriterAudioCtx.createBufferSource();
    src.buffer = typewriterAudioBuffer;
    var gain = typewriterAudioCtx.createGain();
    gain.gain.value = 0.05;
    src.connect(gain);
    gain.connect(typewriterAudioCtx.destination);
    src.start(0);
  }

  function initWindowResize() {
    var resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && richWrapper) {
      resizeObserver = new ResizeObserver(function(entries) {
        updateReadingProgress();
        highlightFocusedParagraph();
      });
      resizeObserver.observe(richWrapper);
    }
  }

  // ===== PUBLIC API =====
  orOSWriter = {
    init: init,
    tabs: getTabsApi(),
    settings: {
      save: saveSettings,
      load: loadSettingsValues
    },
    export: handleExport,
    insertLoremIpsum: insertLoremIpsum,
    clearContent: clearContent,
    addComment: addComment,
    toggleFocusMode: toggleFocusMode,
    toggleReadingMode: toggleReadingMode,
    getActiveTab: getActiveTab,
    createTab: createTab,
    closeTab: closeTabById,
    switchTab: switchTab
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();