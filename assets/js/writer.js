// ============================================
// orOS Writer — Clean Implementation
// Tabbed Rich Text Editor with Modern Features
// ============================================

(function() {
  'use strict';

  // ===== STORAGE KEYS =====
  var LEGACY_STORAGE_KEY = 'oros_writer_content';
  var LEGACY_STORAGE_METADATA = 'oros_writer_metadata';

  // ===== DOM ELEMENTS =====
  var richEditor = document.getElementById('rich-editor');
  var richWrapper = document.getElementById('rich-wrapper');
  var findBar = document.getElementById('find-replace-bar');
  var findInput = document.getElementById('find-find');
  var replaceInput = document.getElementById('find-replace');
  var btnPrev = document.getElementById('btn-fr-prev');
  var btnNext = document.getElementById('btn-fr-next');
  var frResults = document.getElementById('fr_results');
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
  var hasUnsavedChanges = false;

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
  // TABS INTEGRATION
  // ============================================

  function getTabsApi() {
    return window.OROS_TABS;
  }

  function syncFromActiveTab() {
    var api = getTabsApi();
    if (!api) return;
    var tab = api.getActiveTab();
    if (!tab) return;
    isSwitching = true;
    richEditor.innerHTML = tab.content || '';
    currentMetadata = tab.metadata || {};
    if (metaTitle) metaTitle.value = currentMetadata.title || '';
    if (metaAuthor) metaAuthor.value = currentMetadata.author || '';
    if (metaTags) metaTags.value = currentMetadata.tags || '';
    if (metaCategory) metaCategory.value = currentMetadata.category || '';
    renderMetaDates();
    updateStats();
    updateGoalProgress();
    hasUnsavedChanges = false;
    isSwitching = false;
  }

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
  // LOREM IPSUM GENERATOR
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
    richEditor.innerHTML = generateLoremIpsum();
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

  // ============================================
  // CONTENT HANDLING
  // ============================================

  if (richEditor) {
    richEditor.addEventListener('input', function() {
      saveCurrentTabContent();
      updateStats();
      hasUnsavedChanges = true;
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
  // GOAL TRACKER
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
    if (statsDefaultEl) statsDefaultEl.style.display = '';
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
    var tableHtml = '<table style="border-collapse:collapse; width:100%; margin: 1em 0;"><tbody>';
    for (var r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (var c = 0; c < cols; c++) {
        tableHtml += '<td style="border:1px solid #ccc; padding:8px; min-width:50px;">&nbsp;</td>';
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

  function insertImageFromUpload(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var imgHtml = '<p><img src="' + e.target.result + '" style="max-width:100%; height:auto;" /></p>';
      document.execCommand('insertHTML', false, imgHtml);
      saveCurrentTabContent();
      updateStats();
    };
    reader.onerror = function() { showToast('Error loading image'); };
    reader.readAsDataURL(file);
  }

  function insertImageUrl(url) {
    var imgHtml = '<p><img src="' + escapeHtml(url) + '" style="max-width:100%; height:auto;" /></p>';
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
  // FIND & REPLACE — FULL IMPLEMENTATION
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

    // Build ranges for all matches
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

    // Create mark elements for each match
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

    // Highlight first match
    if (matchMarks.length > 0) {
      currentMatchIndex = 0;
      navigateMatchToMark(0);
    }
  }

  function navigateMatchToMark(index) {
    if (index < 0 || index >= matchMarks.length) return;
    
    // Remove 'current' class from previous
    var prev = matchMarks[currentMatchIndex];
    if (prev && prev !== matchMarks[index]) {
      prev.classList.remove('current');
    }

    currentMatchIndex = index;
    var mark = matchMarks[index];
    mark.classList.add('current');

    // Scroll into view
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Update counter
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
      // Replace all
      var escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var regex = new RegExp(escaped, 'gi');
      richEditor.innerHTML = richEditor.innerHTML.replace(regex, function(match) {
        // Preserve any HTML tags around the match
        return replaceTerm;
      });
    } else {
      // Replace only current match
      var currentMark = matchMarks[currentMatchIndex];
      if (currentMark) {
        var textNode = document.createTextNode(replaceTerm);
        currentMark.parentNode.replaceChild(textNode, currentMark);
        // Clear highlights after replace
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
  // FILE OPEN (TXT, MD, RTF, DOCX) — .doc REMOVED
  // ============================================

  function openFile(file) {
    var extension = file.name.split('.').pop().toLowerCase();
    
    // Block .doc files
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
      showToast(getTrans('toast_opened'));
    }).catch(function(err) {
      console.error('DOCX conversion error:', err);
      showToast('Error converting DOCX');
    });
  } else if (extension === 'rtf' && typeof parseRTF !== 'undefined') {
    // Parse RTF to HTML using self-hosted RTF parser
    try {
      var html = parseRTF(content);
      richEditor.innerHTML = html;
      saveCurrentTabContent();
      updateStats();
      showToast(getTrans('toast_opened'));
    } catch(err) {
      console.error('RTF parsing error:', err);
      // Fallback to plain text
      richEditor.innerHTML = content.replace(/\n/g, '<br>');
      saveCurrentTabContent();
      updateStats();
      showToast(getTrans('toast_opened'));
    }
  } else {
    // For .txt, .md — treat as text
    richEditor.innerHTML = content.replace(/\n/g, '<br>');
    saveCurrentTabContent();
    updateStats();
    showToast(getTrans('toast_opened'));
  }
};
    reader.onerror = function() { showToast('Error reading file'); };
    
    if (extension === 'docx' && typeof mammoth !== 'undefined') {
  reader.readAsArrayBuffer(file);
} else if (extension === 'rtf' && typeof parseRTF !== 'undefined') {
  reader.readAsText(file);
} else {
  // For .txt, .md — treat as text
  reader.readAsText(file);
}
  }

  // ============================================
  // EXPORT (MD, TXT, RTF, DOCX, PDF) — .doc REMOVED
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
        data = convertToRTF(textContent);
        ext = '.rtf';
        mime = 'application/rtf;charset=utf-8';
        break;
      case 'pdf':
        window.print();
        return;
      case 'docx':
        data = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>' + content + '</body></html>';
        ext = '.docx';
        mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8';
        break;
    }

    var blob = new Blob([data], { type: mime });
    triggerDownload(blob, filenamePrefix + ext);
    showToast(getTrans('toast_downloaded'));
  }

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
          case 'p': md += '\n' + htmlToMd(child) + '\n\n'; break;
          case 'br': md += '  \n'; break;
          case 'strong': case 'b': md += '**' + htmlToMd(child) + '**'; break;
          case 'em': case 'i': md += '*' + htmlToMd(child) + '*'; break;
          case 'u': md += '__' + htmlToMd(child) + '__'; break;
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
          case 'span': md += child.textContent; break;
          case 'div': md += htmlToMd(child) + '\n'; break;
          default: md += child.textContent || ''; break;
        }
      }
    }
    return md;
  }

  function convertToRTF(text) {
    var escaped = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/{/g, '\\{').replace(/}/g, '\\}');
    return "{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033{\\fonttbl{\\f0\\fnil\\fcharset0 Nunito;}}\\f0\\fs24 " + escaped + "}";
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
  // KEYBOARD SHORTCUTS
  // ============================================

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    e.stopImmediatePropagation();
    saveCurrentTabMetadata(true);
    hasUnsavedChanges = false;
    showToast(getTrans('text_saved'));
}
    else if (e.ctrlKey && e.key === 'g') {
      e.preventDefault();
      toggleGoalBar();
    }
    else if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      toggleFindBar();
    }
    else if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      toggleLinkDialog();
    }
    else if (e.ctrlKey && e.key === 'o') {
      e.preventDefault();
      if (btnOpen) btnOpen.click();
    }
    else if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      var api = getTabsApi();
      if (api) api.closeTab(api.getActiveId());
    }
    else if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      var api2 = getTabsApi();
      if (api2) api2.createTab({ content: '', metadata: {} });
    }
    else if (e.ctrlKey && e.key === 'b') {
      document.execCommand('bold');
      saveCurrentTabContent();
    }
    else if (e.ctrlKey && e.key === 'i') {
      document.execCommand('italic');
      saveCurrentTabContent();
    }
    else if (e.ctrlKey && e.key === 'u') {
      document.execCommand('underline');
      saveCurrentTabContent();
    }
    else if (e.ctrlKey && e.shiftKey && e.key === 'X') {
      e.preventDefault();
      document.execCommand('strikeThrough');
      saveCurrentTabContent();
    }
    else if (e.ctrlKey && e.key === ',') {
      e.preventDefault();
      document.execCommand('subscript');
      saveCurrentTabContent();
    }
    else if (e.ctrlKey && e.key === '.') {
      e.preventDefault();
      document.execCommand('superscript');
      saveCurrentTabContent();
    }
    else if (e.key === 'Escape') {
      var handled = false;
      if (metadataPanel && metadataPanel.style.display !== 'none') {
        saveCurrentTabMetadata(false);
        metadataPanel.style.display = 'none';
        handled = true;
      }
      if (outlinePanel && outlinePanel.style.display !== 'none') {
        outlinePanel.style.display = 'none';
        handled = true;
      }
      if (wordFreqPanel && wordFreqPanel.style.display !== 'none') {
        wordFreqPanel.style.display = 'none';
        handled = true;
      }
      if (findBar && findBar.style.display === 'flex') {
        findBar.style.display = 'none';
        clearHighlights();
        handled = true;
      }
      if (goalBar && goalBar.style.display === 'flex') {
        goalBar.style.display = 'none';
        handled = true;
      }
      if (linkDialog && linkDialog.style.display === 'flex') {
        linkDialog.style.display = 'none';
        handled = true;
      }
      if (tableDialog && tableDialog.style.display === 'flex') {
        tableDialog.style.display = 'none';
        handled = true;
      }
      if (imageDialog && imageDialog.style.display === 'flex') {
        imageDialog.style.display = 'none';
        handled = true;
      }
      if (helpDialog && helpDialog.style.display === 'flex') {
        helpDialog.style.display = 'none';
        handled = true;
      }
      if (handled) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }
    else if (e.key === 'Enter' && findBar && findBar.style.display === 'flex') {
      var activeElement = document.activeElement;
      if (activeElement === findInput) {
        if (e.shiftKey) {
          navigateMatch(-1);
        } else {
          navigateMatch(1);
        }
        e.preventDefault();
      } else if (activeElement === replaceInput) {
        doReplace(false);
        e.preventDefault();
      }
    }
  });

  // ============================================
  // BEFOREUNLOAD WARNING (TAB CLOSE)
  // ============================================

  if (richEditor) {
    richEditor.addEventListener('input', function() {
      hasUnsavedChanges = true;
    });
  }

  window.addEventListener('beforeunload', function(e) {
    if (hasUnsavedChanges && window.location.pathname.indexOf('index.html') === -1) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });

  // ============================================
  // VISIBILITY INITIALIZATION
  // ============================================

  function applyInitialVisibility() {
    var hideStats = localStorage.getItem('oros_hide_stats') === 'true';
    var quickTbarShow = localStorage.getItem('oros_quick_tbar_show') !== 'false';
    var hideGoalBtn = localStorage.getItem('oros_hide_goal_btn') === 'true';
    var hideOutlineBtn = localStorage.getItem('oros_hide_outline_btn') === 'true';
    var hideMetadataBtn = localStorage.getItem('oros_hide_metadata_btn') === 'true';
    var hideFindBtn = localStorage.getItem('oros_hide_find_btn') === 'true';
    var hideWordFreqBtn = localStorage.getItem('oros_hide_wordfreq_btn') === 'true';
    var hideLoremBtn = localStorage.getItem('oros_hide_lorem_btn') === 'true';

    if (hideStats && statsOverlay) statsOverlay.style.display = 'none';
    if (toolbarCenter) toolbarCenter.style.display = quickTbarShow ? 'flex' : 'none';
    if (!readingProgressEnabled && progressBar) progressBar.style.display = 'none';
    if (hideGoalBtn && btnGoal) btnGoal.style.display = 'none';
    if (hideOutlineBtn && btnOutline) btnOutline.style.display = 'none';
    if (hideMetadataBtn && btnMetadata) btnMetadata.style.display = 'none';
    if (hideFindBtn && btnFind) btnFind.style.display = 'none';
    if (hideWordFreqBtn && btnWordFreq) btnWordFreq.style.display = 'none';
    if (hideLoremBtn && btnLorem) btnLorem.style.display = 'none';
  }

  // ============================================
  // VISIBILITY EVENT LISTENERS (REAL-TIME)
  // ============================================

  window.addEventListener('oros-quick-tbar-changed', function(e) {
    if (toolbarCenter) toolbarCenter.style.display = e.detail.show ? 'flex' : 'none';
  });

  window.addEventListener('oros-hide-stats-changed', function(e) {
    if (statsOverlay) statsOverlay.style.display = e.detail.hidden ? 'none' : '';
  });

  window.addEventListener('oros-hide-save-indicator-changed', function(e) {
    if (saveIndicator) saveIndicator.style.visibility = e.detail.hidden ? 'hidden' : 'visible';
  });

  window.addEventListener('oros-hide-goal-btn-changed', function(e) {
    if (btnGoal) btnGoal.style.display = e.detail.hidden ? 'none' : '';
  });

  window.addEventListener('oros-hide-outline-btn-changed', function(e) {
    if (btnOutline) btnOutline.style.display = e.detail.hidden ? 'none' : '';
  });

  window.addEventListener('oros-hide-metadata-btn-changed', function(e) {
    if (btnMetadata) btnMetadata.style.display = e.detail.hidden ? 'none' : '';
  });

  window.addEventListener('oros-hide-find-btn-changed', function(e) {
    if (btnFind) btnFind.style.display = e.detail.hidden ? 'none' : '';
  });

  window.addEventListener('oros-hide-wordfreq-btn-changed', function(e) {
    if (btnWordFreq) btnWordFreq.style.display = e.detail.hidden ? 'none' : '';
  });

  window.addEventListener('oros-hide-lorem-btn-changed', function(e) {
    if (btnLorem) btnLorem.style.display = e.detail.hidden ? 'none' : '';
  });

  // ============================================
  // EVENT LISTENERS
  // ============================================

  if (btnMetadata) btnMetadata.addEventListener('click', toggleMetadataPanel);
  if (btnCloseMetadata) btnCloseMetadata.addEventListener('click', function() {
    saveCurrentTabMetadata(false);
    metadataPanel.style.display = 'none';
  });

  if (btnOutline) btnOutline.addEventListener('click', toggleOutline);
  if (btnCloseOutline) btnCloseOutline.addEventListener('click', function() {
    outlinePanel.style.display = 'none';
  });

  if (btnWordFreq) btnWordFreq.addEventListener('click', toggleWordFreqPanel);
  if (btnCloseWordFreq) btnCloseWordFreq.addEventListener('click', function() {
    wordFreqPanel.style.display = 'none';
  });

  if (btnGoal) btnGoal.addEventListener('click', toggleGoalBar);
  if (btnSetGoal) btnSetGoal.addEventListener('click', setGoal);
  if (btnClearGoal) btnClearGoal.addEventListener('click', clearGoal);
  if (btnCloseGoal) btnCloseGoal.addEventListener('click', function() {
    goalBar.style.display = 'none';
  });

  if (btnFind) btnFind.addEventListener('click', toggleFindBar);
  if (findBar) {
    if (findInput) {
      findInput.addEventListener('input', highlightMatches);
      findInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          if (e.shiftKey) navigateMatch(-1);
          else navigateMatch(1);
          e.preventDefault();
        }
      });
    }
    if (replaceInput) {
      replaceInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          doReplace(false);
          e.preventDefault();
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
    if (btnCloseFR) btnCloseFR.addEventListener('click', function() {
      findBar.style.display = 'none';
      if (findInput) findInput.value = '';
      if (replaceInput) replaceInput.value = '';
      clearHighlights();
    });
  }

  if (btnOpen) btnOpen.addEventListener('click', function() {
    if (fileInput) fileInput.click();
  });
  if (fileInput) fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
      openFile(this.files[0]);
      this.value = '';
    }
  });

  if (btnClear) btnClear.addEventListener('click', function() {
    var msg = getCurrentLang() === 'el'
      ? 'Σίγουρα; Όλο το περιεχόμενο θα χαθεί.'
      : 'Are you sure? All content will be lost.';
    if (confirm(msg)) {
      richEditor.innerHTML = '';
      hasUnsavedChanges = false;
      saveCurrentTabContent();
      updateStats();
      showToast(getTrans('toast_cleared'));
    }
  });

  if (btnLorem) btnLorem.addEventListener('click', insertLoremIpsum);

  if (btnLink) btnLink.addEventListener('click', toggleLinkDialog);
  if (document.getElementById('btn-insert-link')) {
    document.getElementById('btn-insert-link').addEventListener('click', insertLink);
  }
  if (document.getElementById('btn-cancel-link')) {
    document.getElementById('btn-cancel-link').addEventListener('click', function() {
      linkDialog.style.display = 'none';
    });
  }
  if (document.getElementById('btn-close-link-dialog')) {
    document.getElementById('btn-close-link-dialog').addEventListener('click', function() {
      linkDialog.style.display = 'none';
    });
  }

  if (btnTable) btnTable.addEventListener('click', toggleTableDialog);
  if (document.getElementById('btn-insert-table')) {
    document.getElementById('btn-insert-table').addEventListener('click', insertTable);
  }
  if (document.getElementById('btn-cancel-table')) {
    document.getElementById('btn-cancel-table').addEventListener('click', function() {
      tableDialog.style.display = 'none';
    });
  }
  if (document.getElementById('btn-close-table-dialog')) {
    document.getElementById('btn-close-table-dialog').addEventListener('click', function() {
      tableDialog.style.display = 'none';
    });
  }

  if (btnImage) btnImage.addEventListener('click', toggleImageDialog);
  if (document.getElementById('btn-insert-image')) {
    document.getElementById('btn-insert-image').addEventListener('click', handleImageInsert);
  }
  if (document.getElementById('btn-cancel-image')) {
    document.getElementById('btn-cancel-image').addEventListener('click', function() {
      imageDialog.style.display = 'none';
    });
  }
  if (document.getElementById('btn-close-image-dialog')) {
    document.getElementById('btn-close-image-dialog').addEventListener('click', function() {
      imageDialog.style.display = 'none';
    });
  }
  if (document.getElementById('image-source-type')) {
    document.getElementById('image-source-type').addEventListener('change', function() {
      var type = this.value;
      if (type === 'upload') {
        document.getElementById('image-upload-field').style.display = '';
        document.getElementById('image-url-field').style.display = 'none';
      } else {
        document.getElementById('image-upload-field').style.display = 'none';
        document.getElementById('image-url-field').style.display = '';
      }
    });
  }

  if (btnHr) btnHr.addEventListener('click', function() {
    document.execCommand('insertHTML', false, '<hr /><p>&nbsp;</p>');
    saveCurrentTabContent();
  });

  if (btnIndent) btnIndent.addEventListener('click', function() {
    document.execCommand('indent');
    saveCurrentTabContent();
  });

  if (btnOutdent) btnOutdent.addEventListener('click', function() {
    document.execCommand('outdent');
    saveCurrentTabContent();
  });

  if (btnExport) {
    btnExport.addEventListener('click', function(e) {
      e.stopPropagation();
      if (exportDropdown) exportDropdown.classList.toggle('visible');
    });
  }
  document.addEventListener('click', function() {
    if (exportDropdown) exportDropdown.classList.remove('visible');
  });
  if (exportDropdown) {
    var expBtns = exportDropdown.querySelectorAll('button');
    for (var j = 0; j < expBtns.length; j++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var fmt = btn.getAttribute('data-format');
          downloadFile(fmt);
        });
      })(expBtns[j]);
    }
  }

  if (richEditor) {
    richEditor.addEventListener('paste', handleSmartPaste);
    richEditor.addEventListener('keyup', function() {
      handleSmartTypography();
    });
  }

  // ============================================
  // STATS EXPAND/COLLAPSE
  // ============================================

  if (statsDefaultEl) {
    statsDefaultEl.addEventListener('click', function() {
      statsExpanded = !statsExpanded;
      if (statsDetailed) statsDetailed.classList.toggle('visible', statsExpanded);
      updateStats();
    });
  }

  // ============================================
  // MAIN TOOLBAR BUTTONS
  // ============================================

  function setupMainToolbarButtons() {
    if (!richEditor) return;
    var fmtBtns = document.querySelectorAll('.main-toolbar .fmt-text-btn, .main-toolbar .action-btn[data-cmd]');
    for (var i = 0; i < fmtBtns.length; i++) {
      (function(btn) {
        var cmd = btn.getAttribute('data-cmd');
        if (!cmd) return;
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          var block = btn.getAttribute('data-block');
          if (block) {
            document.execCommand('formatBlock', false, block);
          } else {
            document.execCommand(cmd, false);
          }
          saveCurrentTabContent();
          updateStats();
          richEditor.focus();
        });
      })(fmtBtns[i]);
    }
  }

  // ============================================
  // TAB SWITCH LISTENER
  // ============================================

  if (window.OROS_TABS) {
    window.OROS_TABS.on('switch', function(tab) {
      if (!tab) return;
      isSwitching = true;
      richEditor.innerHTML = tab.content || '';
      currentMetadata = tab.metadata || {};
      if (metaTitle) metaTitle.value = currentMetadata.title || '';
      if (metaAuthor) metaAuthor.value = currentMetadata.author || '';
      if (metaTags) metaTags.value = currentMetadata.tags || '';
      if (metaCategory) metaCategory.value = currentMetadata.category || '';
      renderMetaDates();
      updateStats();
      updateGoalProgress();
      hasUnsavedChanges = false;
      isSwitching = false;
      richEditor.focus();
    });

    window.OROS_TABS.on('create', function(tab) {
      isSwitching = true;
      richEditor.innerHTML = '';
      currentMetadata = {};
      if (metaTitle) metaTitle.value = '';
      if (metaAuthor) metaAuthor.value = '';
      if (metaTags) metaTags.value = '';
      if (metaCategory) metaCategory.value = '';
      renderMetaDates();
      updateStats();
      hasUnsavedChanges = false;
      isSwitching = false;
      richEditor.focus();
    });
  }

  // ============================================
  // HELP DIALOG
  // ============================================

  var helpBtn = document.getElementById('btn-help');
  if (helpBtn && helpDialog) {
    helpBtn.addEventListener('click', function() {
      helpDialog.style.display = 'flex';
    });
  }
  if (document.getElementById('btn-close-help')) {
    document.getElementById('btn-close-help').addEventListener('click', function() {
      helpDialog.style.display = 'none';
    });
  }
  if (document.getElementById('btn-close-help-ok')) {
    document.getElementById('btn-close-help-ok').addEventListener('click', function() {
      helpDialog.style.display = 'none';
    });
  }

  // ============================================
  // INTERNATIONALIZATION EVENT
  // ============================================

  window.addEventListener('oros-language-changed', function(e) {
    updateStats();
    renderMetaDates();
    updateSaveIndicator();
    if (frResults) highlightMatches();
  });

  // ============================================
  // SAVE INDICATOR LIVE TICK
  // ============================================

  setInterval(updateSaveIndicator, 30000);

  // ============================================
  // LOAD INITIAL CONTENT
  // ============================================

  function loadContent() {
    var api = getTabsApi();
    if (api) {
      var tab = api.getActiveTab();
      if (tab && tab.content) {
        isSwitching = true;
        richEditor.innerHTML = tab.content;
        currentMetadata = tab.metadata || {};
        if (metaTitle) metaTitle.value = currentMetadata.title || '';
        if (metaAuthor) metaAuthor.value = currentMetadata.author || '';
        if (metaTags) metaTags.value = currentMetadata.tags || '';
        if (metaCategory) metaCategory.value = currentMetadata.category || '';
        renderMetaDates();
        isSwitching = false;
        return;
      }
    }
  }

  // ============================================
  // INITIALIZE
  // ============================================

  initTypewriterSound();
  setupMainToolbarButtons();
  loadContent();
  setupMetadataHandlers();
  updateStats();
  updateReadingProgress();
  renderMetaDates();
  applyInitialVisibility();

})();