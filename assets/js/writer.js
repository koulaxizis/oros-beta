/* ============================================
   orOS Writer — Complete Application v2.3.1
   Bug Fixes: 50+ systematic corrections
   New: Page sizes, custom templates, DB export,
   track changes, comments fix, stats arrow,
   session centering, exit reading position,
   export dropdown fix, single-row toolbar
   Author: Christos Koulaxizis | orOS Ecosystem
   ============================================ */

(function() {
  'use strict';

  // ===== CONFIGURATION =====
  var CONFIG = {
    APP_NAME: 'orOS Writer',
    VERSION: '2.3.1',
    CHANNEL: 'STABLE',
    STORAGE_PREFIX: 'oros_writer_',
    MAX_HISTORY: 50,
    CUSTOM_TEMPLATES_KEY: 'oros_writer_custom_templates'
  };

  // ===== STATE VARIABLES =====
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
  var trackChangesBar = null;
  var stylesSelect = null;
  var footnoteArea = null;
  var metadataPanel = null;
  var outlinePanel = null;
  var outlineList = null;
  var wordFreqPanel = null;
  var wordFreqList = null;
  var wordFreqSummary = null;
  var commentsPanel = null;
  var tocPanel = null;
  var tocList = null;
  var versionPanel = null;
  var versionList = null;
  var metaTitle = null;
  var metaAuthor = null;
  var metaTags = null;
  var metaCategory = null;
  var metaCreated = null;
  var metaModified = null;
  var exportDropdown = null;
  var goalTargetInput = null;
  var goalUnitSelect = null;
  var goalLockCheckbox = null;
  var findInput = null;
  var replaceInput = null;
  var frResults = null;
  var findFormatFilter = null;

  var initialized = false;
  var beforeInstallPrompt = null;
  var typingTimer = null;
  var isTyping = false;
  var smartPasteEnabled = true;
  var smartTypographyEnabled = true;
  var typewriterSoundEnabled = false;
  var focusModeEnabled = false;
  var readingProgressEnabled = true;
  var currentLang = 'en';
  var toastContainer = null;
  var goalBarContent = null;
  var goalBarFill = null;
  var windowResizeDebounce = null;
  var hideStats = false;
  var AUTO_SAVE_INTERVAL_MS = 300000;
  var sessionInterval = null;
  var sessionStartTime = null;
  var sessionSeconds = 0;
  var trackingChanges = false;
  var trackChangesObserver = null;
  var savedCommentRange = null;
  var customTemplates = [];
  var undoStack = [];
  var redoStack = [];
  var maxUndoStack = CONFIG.MAX_HISTORY;

  // ===== TEMPLATE DATA =====
  var TEMPLATES = [
    { id: 'blank', title: 'Blank', icon: 'fa-file-o', desc: 'Empty document', content: '<p><br></p>' },
    { id: 'essay', title: 'Essay', icon: 'fa-file-text-o', desc: 'Academic essay structure', content: '<h1>Essay Title</h1><p><br></p><h2>Introduction</h2><p><br></p><h2>Body</h2><p><br></p><h2>Conclusion</h2><p><br></p>' },
    { id: 'letter', title: 'Formal Letter', icon: 'fa-envelope-o', desc: 'Business letter format', content: '<p>Your Name<br>Your Address<br>Date</p><p><br></p><p>Recipient Name<br>Recipient Address</p><p><br></p><p>Dear [Name],</p><p><br></p><p>[Body text]</p><p><br></p><p>Sincerely,<br>Your Name</p>' },
    { id: 'novel', title: 'Novel Chapter', icon: 'fa-book', desc: 'Chapter structure', content: '<h1>Chapter 1</h1><p><br></p>' },
    { id: 'screenplay', title: 'Screenplay', icon: 'fa-film', desc: 'Film script format', content: '<h1>Scene Heading</h1><p><br></p><p style="text-transform:uppercase;text-align:center;"><strong>CHARACTER NAME</strong></p><p style="margin-left:25%;">Dialogue goes here...</p>' },
    { id: 'poem', title: 'Poem', icon: 'fa-music', desc: 'Centered verse format', content: '<h1>Poem Title</h1><p style="text-align:center;"><br>Line one<br>Line two<br>Line three<br></p>' },
    { id: 'meeting', title: 'Meeting Notes', icon: 'fa-users', desc: 'Agenda and notes', content: '<h1>Meeting Notes</h1><p><strong>Date:</strong> [Date]<br><strong>Attendees:</strong> [Names]</p><p><br></p><h2>Agenda</h2><ol><li>Topic 1</li><li>Topic 2</li></ol><p><br></p><h2>Notes</h2><p><br></p><h2>Action Items</h2><ul><li>Item 1 — Owner</li></ul>' }
  ];

  // ===== SPECIAL CHARACTER DATA =====
  var SPECIAL_CHARS = {
    greek: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''),
    math: '+-*/=<>~'.split(''),
    arrows: '-><-^v'.split(''),
    currency: '$EUR GBP JPY RUB INR'.split(' '),
    punctuation: '"""\'\'!?.:;,()[]{}'.split(''),
    symbols: '©®™°#*@'.split('')
  };
  // Override with proper Unicode characters after safe parse
  SPECIAL_CHARS.greek = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψωάέήίόύώϊϋΐΰ'.split('');
  SPECIAL_CHARS.math = ['\u00B1','\u00D7','\u00F7','\u2260','\u2248','\u2264','\u2265','\u221E','\u222B','\u2211','\u221A','\u2202','\u2207','\u220F','\u2234','\u2235','\u221D','\u2208','\u2209','\u222A','\u2229','\u2282','\u2283','\u2286','\u2287','\u2295','\u2297','\u2299','\u226A','\u226B','\u00AC','\u2227','\u2228','\u2200','\u2203'];
  SPECIAL_CHARS.arrows = ['\u2190','\u2191','\u2192','\u2193','\u2194','\u2195','\u21D0','\u21D1','\u21D2','\u21D3','\u21D4','\u21D5','\u2197','\u2198','\u2199','\u2196','\u21B0','\u21B1','\u21B2','\u21B3'];
  SPECIAL_CHARS.currency = ['\u20AC','$','\u00A3','\u00A5','\u20BD','\u00A2','\u20B9','\u20A9','\u20AA','\u20AB','\u20B4','\u20B8','\u20BA','\u20B1','\u0E3F','\u20A1','\u20A8','\u20AE'];
  SPECIAL_CHARS.punctuation = ['\u00AB','\u00BB','\u2039','\u203A','\u201E','\u201C','\u201D','\u2018','\u2019','\u201A','\u201B','\u201F','\u00A1','\u00BF','\u00B7','\u2022','\u25E6','\u00A7','\u00B6','\u2030','\u2020','\u2021'];
  SPECIAL_CHARS.symbols = ['\u00A9','\u00AE','\u2122','\u00B0','\u2116','\u266A','\u266B','\u266C','\u266F','\u266D','\u266E','\u2611','\u2612','\u2610','\u2713','\u2717','\u2605','\u2606','\u261E','\u261C','\u261D','\u261F','\u2690','\u2691','\u2693','\u2694','\u2696','\u2697','\u2699','\u26A0'];

  // ===== TABS MODULE =====
  var tabsModule = {
    STORAGE_TABS: 'oros_writer_tabs',
    STORAGE_ACTIVE: 'oros_writer_active_tab',
    OLD_STORAGE_CONTENT: 'oros_writer_content',
    OLD_STORAGE_METADATA: 'oros_writer_metadata',

    tabBar: null,
    listeners: { switch: [], create: [], close: [] },
    tabs: [],
    activeId: null,
    initialized: false,

    persist: function() {
      try {
        localStorage.setItem(this.STORAGE_TABS, JSON.stringify(this.tabs));
        if (this.activeId) localStorage.setItem(this.STORAGE_ACTIVE, this.activeId);
      } catch(e) { console.warn('Tab persist failed:', e); }
    },

    load: function() {
      try {
        var raw = localStorage.getItem(this.STORAGE_TABS);
        if (raw) {
          this.tabs = JSON.parse(raw);
          for (var i = 0; i < this.tabs.length; i++) {
            if (!this.tabs[i].hasOwnProperty('lastSaved')) this.tabs[i].lastSaved = null;
            if (!this.tabs[i].hasOwnProperty('versions')) this.tabs[i].versions = [];
          }
          this.activeId = localStorage.getItem(this.STORAGE_ACTIVE);
          if (!this.activeId || !this.getActive()) {
            this.activeId = this.tabs.length > 0 ? this.tabs[0].id : null;
          }
          if (this.tabs.length > 0) { this.persist(); return; }
        }
      } catch(e) { console.warn('Tab load failed:', e); this.tabs = []; }

      var oldContent = localStorage.getItem(this.OLD_STORAGE_CONTENT);
      var oldMetadata = {};
      try { var rawMeta = localStorage.getItem(this.OLD_STORAGE_METADATA); if (rawMeta) oldMetadata = JSON.parse(rawMeta); } catch(e) {}

      var tab = this.createObject(oldContent ? this.deriveTitle(oldContent) : null, oldContent || '', oldMetadata);
      this.tabs.push(tab);
      this.activeId = tab.id;
      this.persist();
    },

    createObject: function(title, content, metadata) {
      return {
        id: 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        title: title || 'Untitled',
        content: content || '',
        metadata: metadata || {},
        lastSaved: null,
        versions: []
      };
    },

    deriveTitle: function(html) {
      if (!html) return 'Untitled';
      var temp = document.createElement('div');
      temp.innerHTML = html;
      var h1 = temp.querySelector('h1');
      if (h1 && h1.textContent.trim()) return h1.textContent.trim().substring(0, 40);
      var h2 = temp.querySelector('h2');
      if (h2 && h2.textContent.trim()) return h2.textContent.trim().substring(0, 40);
      var p = temp.querySelector('p');
      if (p && p.textContent.trim()) return p.textContent.trim().substring(0, 40);
      var text = temp.textContent.trim();
      if (text) return text.substring(0, 40);
      return 'Untitled';
    },

    escapeHtml: function(str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    getAll: function() { return this.tabs; },
    getActiveId: function() { return this.activeId; },
    getActive: function() {
      for (var i = 0; i < this.tabs.length; i++) { if (this.tabs[i].id === this.activeId) return this.tabs[i]; }
      return null;
    },
    getContent: function() { var tab = this.getActive(); return tab ? tab.content : ''; },
    getMetadata: function() { var tab = this.getActive(); return tab ? (tab.metadata || {}) : {}; },
    getTimestamp: function() { var tab = this.getActive(); return tab ? tab.lastSaved : null; },

    setContent: function(html) {
      var tab = this.getActive();
      if (!tab) return;
      tab.content = html;
      var newTitle = this.deriveTitle(html);
      if (newTitle !== tab.title) { tab.title = newTitle; this.persist(); this.render(); } else { this.persist(); }
    },
    setMetadata: function(meta) { var tab = this.getActive(); if (!tab) return; tab.metadata = meta || {}; this.persist(); },
    setTimestamp: function(ts) { var tab = this.getActive(); if (!tab) return; tab.lastSaved = ts; this.persist(); },

    create: function(opts) {
      opts = opts || {};
      var tab = this.createObject(opts.title || null, opts.content || '', opts.metadata || {});
      this.tabs.push(tab);
      this.activeId = tab.id;
      this.persist();
      this.render();
      this.fireEvent('create', tab);
      this.fireEvent('switch', tab);
      return tab;
    },

    close: function(id) {
      var idx = -1;
      for (var i = 0; i < this.tabs.length; i++) { if (this.tabs[i].id === id) { idx = i; break; } }
      if (idx === -1) return;
      var tab = this.tabs[idx];
      if (this.tabs.length <= 1) {
        tab.content = ''; tab.title = 'Untitled'; tab.metadata = {}; tab.lastSaved = null; tab.versions = [];
        this.persist(); this.render(); this.fireEvent('switch', tab); return;
      }
      this.tabs.splice(idx, 1);
      if (this.activeId === id) { var newIdx = Math.min(idx, this.tabs.length - 1); this.activeId = this.tabs[newIdx].id; }
      this.persist(); this.render();
      this.fireEvent('close', tab);
      this.fireEvent('switch', this.getActive());
    },

    switchTo: function(id) {
      if (id === this.activeId) return;
      var exists = false;
      for (var i = 0; i < this.tabs.length; i++) { if (this.tabs[i].id === id) { exists = true; break; } }
      if (!exists) return;
      this.activeId = id;
      localStorage.setItem(this.STORAGE_ACTIVE, this.activeId);
      this.render();
      this.fireEvent('switch', this.getActive());
    },

    fireEvent: function(event, data) {
      var callbacks = this.listeners[event] || [];
      for (var i = 0; i < callbacks.length; i++) { try { callbacks[i](data); } catch(e) { console.warn('Tab event error:', e); } }
    },
    on: function(event, callback) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(callback); },

    render: function() {
      if (!this.tabBar) { console.warn('render called before tabBar initialized'); return; }
      var lang = localStorage.getItem('oros-language') || 'en';
      var html = '';
      for (var i = 0; i < this.tabs.length; i++) {
        var t = this.tabs[i];
        var isActive = t.id === this.activeId;
        html += '<div class="tab' + (isActive ? ' active' : '') + '" data-tab-id="' + t.id + '">' +
          '<span class="tab-label">' + this.escapeHtml(t.title) + '</span>' +
          '<button class="tab-close" data-close-id="' + t.id + '" title="' +
          (lang === 'el' ? 'Κλείσιμο' : 'Close') + '"><i class="fa fa-times"></i></button></div>';
      }
      html += '<button class="tab-new" id="btn-new-tab" title="' +
        (lang === 'el' ? 'Νέο Tab' : 'New Tab') + '"><i class="fa fa-plus"></i></button>';
      this.tabBar.innerHTML = html;

      var tabEls = this.tabBar.querySelectorAll('.tab');
      for (var j = 0; j < tabEls.length; j++) {
        (function(el) {
          el.addEventListener('click', function(e) {
            if (e.target.closest('.tab-close')) return;
            if (e.detail === 2) {
              e.preventDefault();
              e.stopPropagation();
              tabsModule.rename(el.getAttribute('data-tab-id'));
              return;
            }
            tabsModule.switchTo(el.getAttribute('data-tab-id'));
          });
        })(tabEls[j]);
      }

      var closeBtns = this.tabBar.querySelectorAll('.tab-close');
      for (var k = 0; k < closeBtns.length; k++) {
        (function(btn) {
          btn.addEventListener('click', function(e) { e.stopPropagation(); tabsModule.close(btn.getAttribute('data-close-id')); });
        })(closeBtns[k]);
      }

      var newBtn = document.getElementById('btn-new-tab');
      if (newBtn) {
        newBtn.addEventListener('click', function() {
          tabsModule.create({ content: '<p><br></p>', metadata: {} });
          setTimeout(function() { if (richEditor) richEditor.focus(); }, 50);
        });
      }
    },

    rename: function(id) {
      var tab = null;
      for (var i = 0; i < this.tabs.length; i++) { if (this.tabs[i].id === id) { tab = this.tabs[i]; break; } }
      if (!tab) return;
      var el = this.tabBar.querySelector('[data-tab-id="' + id + '"] .tab-label');
      if (!el) return;

      var input = document.createElement('input');
      input.type = 'text';
      input.value = tab.title;
      input.className = 'tab-label-input';
      el.parentNode.replaceChild(input, el);
      input.focus();
      input.select();

      function finalize(save) {
        var newTitle = input.value.trim() || 'Untitled';
        if (save) { tab.title = newTitle; tabsModule.persist(); }
        tabsModule.render();
      }

      input.addEventListener('blur', function() { finalize(true); });
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        else if (e.key === 'Escape') { e.preventDefault(); finalize(false); }
      });
    },

    init: function(containerSelector) {
      if (this.initialized) return;
      this.tabBar = document.querySelector(containerSelector);
      if (!this.tabBar) { console.warn('Tabs module: tabBar not found'); return; }
      this.initialized = true;
      this.load();
      this.render();
    }
  };

  // ===== HELPER FUNCTIONS =====
  function bindClick(id, fn) {
    var el = document.getElementById(id);
    if (el) { var clone = el.cloneNode(true); el.parentNode.replaceChild(clone, el); clone.addEventListener('click', fn); }
  }

  function getCurrentLang() {
    var saved = localStorage.getItem('oros-language');
    if (saved) return saved;
    return document.documentElement.lang || (navigator.language || 'en').split('-')[0];
  }

  function getTrans(key) {
    var lang = getCurrentLang();
    if (!window.OROS_TRANSLATIONS || !window.OROS_TRANSLATIONS[lang]) {
      if (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS['en']) lang = 'en';
      else return key;
    }
    var trans = window.OROS_TRANSLATIONS[lang];
    return trans[key] || (window.OROS_TRANSLATIONS['en'] && window.OROS_TRANSLATIONS['en'][key]) || key;
  }

  function showToast(message, duration) {
    if (!toastContainer) {
      toastContainer = document.getElementById('zentool-toast');
      if (!toastContainer) {
        toastContainer = document.querySelector('.zentool-toast');
        if (!toastContainer) {
          toastContainer = document.createElement('div');
          toastContainer.className = 'zentool-toast';
          toastContainer.id = 'zentool-toast';
          document.body.appendChild(toastContainer);
        }
      }
    }
    toastContainer.textContent = message;
    toastContainer.classList.add('visible');
    clearTimeout(toastContainer._timer);
    toastContainer._timer = setTimeout(function() { toastContainer.classList.remove('visible'); }, duration || 2500);
  }

  function saveCurrentTabContent() {
    if (tabsModule && tabsModule.getActive() && richEditor) {
      tabsModule.setContent(richEditor.innerHTML);
      tabsModule.setTimestamp(new Date().toISOString());
      updateSaveIndicator('saved');
      updateStats();
    }
  }

  function updateSaveIndicator(state) {
    if (!saveIndicator) return;
    if (hideStats || localStorage.getItem('oros_hide_save_indicator') === 'true') {
      saveIndicator.style.visibility = 'hidden';
      return;
    }
    var now = new Date();
    var timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    if (state === 'saving') saveIndicator.textContent = 'Saving...';
    else if (state === 'saved') saveIndicator.textContent = 'Saved ' + timeStr;
    else if (state === 'unsaved') saveIndicator.textContent = 'Unsaved changes';
    saveIndicator.style.visibility = 'visible';
  }

  function updateStats() {
    if (!richEditor) return;
    var text = richEditor.innerText || '';
    var words = text.trim() ? text.trim().split(/\s+/).length : 0;
    var chars = text.length;
    var charNoSpaces = text.replace(/\s/g, '').length;
    var sentences = (text.match(/[.!?…]+/g) || []).length;
    var paragraphs = richEditor.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li').length;
    var readingTime = words > 0 ? Math.max(1, Math.ceil(words / 200)) : 0;
    var speakingTime = words > 0 ? Math.max(1, Math.ceil(words / 130)) : 0;

    if (statsDefaultEl) {
      statsDefaultEl.innerHTML = words + ' words · ' + readingTime + ' min <span class="stats-up-arrow">\u25B2</span>';
      statsDefaultEl.style.cursor = 'pointer';
    }

    if (statsDetailed) {
      var rows = statsDetailed.querySelectorAll('.stat-row span:last-child');
      if (rows.length >= 7) {
        rows[0].textContent = words;
        rows[1].textContent = chars;
        rows[2].textContent = charNoSpaces;
        rows[3].textContent = sentences;
        rows[4].textContent = paragraphs;
        rows[5].textContent = readingTime + ' min';
        rows[6].textContent = speakingTime + ' min';
      }
    }

    if (statsGoalEl) {
      var goal = parseInt(localStorage.getItem('oros_writer_goal'), 10) || 0;
      var unit = localStorage.getItem('oros_writer_goal_unit') || 'words';
      if (goal > 0) {
        var current = (unit === 'chars') ? chars : words;
        var pct = Math.round((current / goal) * 100);
        if (pct >= 100) { statsGoalEl.textContent = '\uD83C\uDF89 ' + pct + '%'; statsGoalEl.style.color = 'var(--success)'; }
        else { statsGoalEl.textContent = pct + '%'; statsGoalEl.style.color = ''; }
        statsGoalEl.style.display = '';
      } else { statsGoalEl.style.display = 'none'; }
    }

    updateReadingProgress();
    updateOutline();
    updateGoalBar();
  }

  function setupStatsToggle() {
    if (!statsDefaultEl || !statsDetailed) return;
    statsDefaultEl.addEventListener('click', function(e) {
      e.stopPropagation();
      statsDetailed.classList.toggle('visible');
    });
    document.addEventListener('click', function(e) {
      if (statsDetailed && !e.target.closest('.stats-overlay')) {
        statsDetailed.classList.remove('visible');
      }
    });
  }

  function updateReadingProgress() {
    if (!readingProgressEnabled || !richEditor) return;
    var container = document.querySelector('.reading-progress-bar');
    if (!container) return;
    var totalHeight = richEditor.scrollHeight - richEditor.clientHeight;
    if (totalHeight <= 0) { container.style.width = '0%'; return; }
    var scrollTop = richEditor.scrollTop;
    var pct = Math.min(100, (scrollTop / totalHeight) * 100);
    container.style.width = pct + '%';
  }

  function updateOutline() {
    if (!outlineList || !richEditor) return;
    var heads = richEditor.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (heads.length === 0) { outlineList.innerHTML = '<div class="outline-empty">' + (getTrans('outline_empty') !== 'outline_empty' ? getTrans('outline_empty') : 'No headings found') + '</div>'; return; }
    var html = '';
    for (var i = 0; i < heads.length; i++) {
      var tag = heads[i].tagName.toLowerCase();
      var text = heads[i].textContent.trim() || '(empty)';
      html += '<div class="outline-item outline-item-' + tag + '" data-heading-index="' + i + '">' + escapeHtml(text) + '</div>';
    }
    outlineList.innerHTML = html;
    var items = outlineList.querySelectorAll('.outline-item');
    for (var j = 0; j < items.length; j++) {
      (function(item, idx) {
        item.addEventListener('click', function() {
          var heading = richEditor.querySelectorAll('h1, h2, h3, h4, h5, h6')[idx];
          if (heading) {
            heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
            heading.classList.add('outline-flash');
            setTimeout(function() { heading.classList.remove('outline-flash'); }, 1200);
          }
        });
      })(items[j], j);
    }
  }

  function escapeHtml(str) { var div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

  // ===== SETTINGS =====
  function loadSettings() {
    try {
      var raw = localStorage.getItem(CONFIG.STORAGE_PREFIX + 'settings');
      if (!raw) return {};
      var s = JSON.parse(raw);
      smartPasteEnabled = s.smartPaste !== false;
      smartTypographyEnabled = s.smartTypography !== false;
      typewriterSoundEnabled = s.typewriterSound === true;
      focusModeEnabled = s.focusMode === true;
      readingProgressEnabled = s.readingProgress !== false;
      hideStats = s.hideStats === true;
      return s;
    } catch(e) { return {}; }
  }

  function saveSettings() {
    var s = {
      smartPaste: smartPasteEnabled, smartTypography: smartTypographyEnabled,
      typewriterSound: typewriterSoundEnabled, focusMode: focusModeEnabled,
      readingProgress: readingProgressEnabled, hideStats: hideStats
    };
    var set = function(id, prop) { var el = document.getElementById(id); if (el) s[prop] = el.checked; };
    set('toggle-smart-paste', 'smartPaste'); set('toggle-smart-typography', 'smartTypography');
    set('toggle-typewriter-sound', 'typewriterSound'); set('toggle-reading-progress', 'readingProgress');
    set('toggle-hide-stats', 'hideStats');
    var toolbarPrefs = {};
    var checkboxes = document.querySelectorAll('.toolbar-vis-cb');
    for (var i = 0; i < checkboxes.length; i++) toolbarPrefs[checkboxes[i].getAttribute('data-toolbar')] = checkboxes[i].checked;
    s.toolbarVisibility = toolbarPrefs;
    try { localStorage.setItem(CONFIG.STORAGE_PREFIX + 'settings', JSON.stringify(s)); } catch(e) {}
    smartPasteEnabled = s.smartPaste !== false; smartTypographyEnabled = s.smartTypography !== false;
    typewriterSoundEnabled = s.typewriterSound === true; readingProgressEnabled = s.readingProgress !== false;
    hideStats = s.hideStats === true;
    applyToolbarVisibilityPrefs();
    showToast(getTrans('btn_save') !== 'btn_save' ? getTrans('btn_save') : 'Settings saved');
  }

  function loadSettingsValues() {
    var set = function(id, val) { var el = document.getElementById(id); if (el) el.checked = val; };
    set('toggle-hide-save-indicator', localStorage.getItem('oros_hide_save_indicator') === 'true');
    set('toggle-hide-stats', hideStats);
    set('toggle-reading-progress', readingProgressEnabled);
    set('toggle-smart-typography', smartTypographyEnabled);
    set('toggle-typewriter-sound', typewriterSoundEnabled);
    set('toggle-smart-paste', smartPasteEnabled);
    set('toggle-focus-mode', focusModeEnabled);
    applyToolbarVisibilityPrefs();
  }

  function applyToolbarVisibilityPrefs() {
    try {
      var raw = localStorage.getItem(CONFIG.STORAGE_PREFIX + 'settings');
      if (!raw) return;
      var s = JSON.parse(raw);
      if (!s.toolbarVisibility) return;
      for (var key in s.toolbarVisibility) {
        if (s.toolbarVisibility.hasOwnProperty(key)) {
          var el = document.getElementById('toolbar-' + key);
          if (el) el.style.display = s.toolbarVisibility[key] ? '' : 'none';
        }
      }
    } catch(e) {}
  }

  // ===== THEME =====
  function applyTheme() {
    var saved = localStorage.getItem('oros-theme') || 'dark';
    if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
  }

  // ===== LANGUAGE =====
  var activeTranslations = null;

  function loadTranslations() {
    if (window.OROS_TRANSLATIONS && typeof window.OROS_TRANSLATIONS === 'object') {
      activeTranslations = window.OROS_TRANSLATIONS;
      return true;
    }
    var stored = localStorage.getItem('oros-translations');
    if (stored) {
      try { activeTranslations = JSON.parse(stored); return true; } catch(e) { console.warn('Stored translations parse error:', e); }
    }
    return false;
  }

  function applyLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    var translatable = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < translatable.length; i++) {
      var key = translatable[i].getAttribute('data-i18n');
      var val = getTrans(key);
      if (val && val !== key) translatable[i].textContent = val;
    }
    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < placeholders.length; j++) {
      var phKey = placeholders[j].getAttribute('data-i18n-placeholder');
      var phVal = getTrans(phKey);
      if (phVal && phVal !== phKey) { placeholders[j].setAttribute('placeholder', phVal); placeholders[j].setAttribute('data-placeholder', phVal); }
    }
    var tooltips = document.querySelectorAll('[data-i18n-tooltip]');
    for (var t = 0; t < tooltips.length; t++) {
      var ttKey = tooltips[t].getAttribute('data-i18n-tooltip');
      var ttVal = getTrans(ttKey);
      if (ttVal && ttVal !== ttKey) tooltips[t].title = ttVal;
    }
    if (tabsModule && tabsModule.initialized) tabsModule.render();
  }

  // ===== PAGE SETTINGS =====
  function applyPageSize(size) {
    if (!richEditor) return;
    var validSizes = ['a4', 'letter', 'legal', 'a3', 'a5', 'b5', 'full-width'];
    if (validSizes.indexOf(size) === -1) size = 'a4';
    richEditor.setAttribute('data-page-size', size);
  }

  function applyPageSettings() {
    var fontSize = localStorage.getItem('oros_writer_font_size') || '16';
    if (richEditor) richEditor.style.fontSize = fontSize + 'px';
    var fontFamily = localStorage.getItem('oros_writer_font_family');
    if (fontFamily && richEditor) richEditor.style.fontFamily = fontFamily;
    var lineHeight = localStorage.getItem('oros_writer_line_height') || '1.8';
    if (richEditor) richEditor.style.lineHeight = lineHeight;
    var maxWidth = localStorage.getItem('oros_writer_max_width') || '900';
    if (richEditor) richEditor.style.maxWidth = maxWidth + 'px';
    var meta = tabsModule.getMetadata ? tabsModule.getMetadata() : {};
    applyPageSize(meta.pageSize || 'a4');
  }

  function savePageSettings() {
    var pageSize = document.getElementById('page-size-select');
    var marginTop = document.getElementById('margin-top');
    var marginBottom = document.getElementById('margin-bottom');
    var marginLeft = document.getElementById('margin-left');
    var marginRight = document.getElementById('margin-right');
    var headerText = document.getElementById('header-text');
    var footerText = document.getElementById('footer-text');
    var footerPageNum = document.getElementById('footer-page-num');

    var meta = tabsModule.getMetadata();
    if (pageSize) { meta.pageSize = pageSize.value; applyPageSize(pageSize.value); }
    if (marginTop) meta.marginTop = marginTop.value;
    if (marginBottom) meta.marginBottom = marginBottom.value;
    if (marginLeft) meta.marginLeft = marginLeft.value;
    if (marginRight) meta.marginRight = marginRight.value;
    if (headerText) meta.headerText = headerText.value;
    if (footerText) meta.footerText = footerText.value;
    if (footerPageNum) meta.footerPageNum = footerPageNum.checked;
    meta.modified = new Date().toISOString();
    tabsModule.setMetadata(meta);
    if (metaModified) metaModified.textContent = meta.modified;
  }

  function loadPageSettingsFields() {
    var meta = tabsModule.getMetadata();
    var setVal = function(id, val, fallback) { var el = document.getElementById(id); if (el) el.value = val || fallback; };
    setVal('page-size-select', meta.pageSize, 'a4');
    setVal('margin-top', meta.marginTop, '2.54');
    setVal('margin-bottom', meta.marginBottom, '2.54');
    setVal('margin-left', meta.marginLeft, '2.54');
    setVal('margin-right', meta.marginRight, '2.54');
    setVal('header-text', meta.headerText, '');
    setVal('footer-text', meta.footerText, '');
    var fpn = document.getElementById('footer-page-num');
    if (fpn) fpn.checked = meta.footerPageNum !== false;
    applyPageSize(meta.pageSize || 'a4');
  }

    function clampToViewport() {
    if (!richEditor) return;
    var headerH = 0;
    var footerH = 0;
    var headerEl = document.getElementById('oros-header');
    var footerEl = document.getElementById('oros-footer');
    if (headerEl) headerH = headerEl.offsetHeight || 56;
    if (footerEl) footerH = footerEl.offsetHeight || 48;
    var toolbarH = 40 + 36; /* tab-bar + main-toolbar approximate */
    var availHeight = window.innerHeight - headerH - footerH - toolbarH - 40;
    if (window.innerWidth <= 768) availHeight -= 20;
    if (availHeight < 200) availHeight = 200;
    richEditor.style.minHeight = availHeight + 'px';
  }

  function autoSaveCheck() { if (!richEditor) return; saveCurrentTabContent(); }

  var typewriterAudioCtx = null;
  function initTypewriterSound() {}
  function playTypewriterSound() {
    if (!typewriterSoundEnabled) return;
    try {
      if (!typewriterAudioCtx) typewriterAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = typewriterAudioCtx.createOscillator();
      var gain = typewriterAudioCtx.createGain();
      osc.connect(gain); gain.connect(typewriterAudioCtx.destination);
      osc.frequency.value = 1200 + Math.random() * 400; osc.type = 'square';
      gain.gain.setValueAtTime(0.08, typewriterAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, typewriterAudioCtx.currentTime + 0.05);
      osc.start(); osc.stop(typewriterAudioCtx.currentTime + 0.05);
    } catch(e) {}
  }

  // ===== AUTOCORRECT =====
  var DEFAULT_AUTOCORRECT = {
    'dont': "don't", 'cant': "can't", 'wont': "won't", 'isnt': "isn't",
    'wasnt': "wasn't", 'havent': "haven't", 'didnt': "didn't",
    'wouldnt': "wouldn't", 'couldnt': "couldn't", 'shouldnt': "shouldn't",
    'im': "I'm", 'ive': "I've", 'ill': "I'll", 'id': "I'd",
    'teh': 'the', 'recieve': 'receive', 'seperate': 'separate',
    'definately': 'definitely', 'occured': 'occurred', 'untill': 'until',
    'thier': 'their', 'freind': 'friend', 'wich': 'which',
    'alot': 'a lot',
    'den einai': '\u03B4\u03B5\u03BD \u03B5\u03AF\u03BD\u03B1\u03B9', 'miso': '\u03BC\u03B9\u03C3\u03CC', 'duo': '\u03B4\u03CD\u03BF', 'itan': '\u03B7\u03C4\u03B1\u03BD'
  };
  var autocorrectRules = {};

  function loadAutoCorrections() {
    try {
      var raw = localStorage.getItem(CONFIG.STORAGE_PREFIX + 'autocorrect');
      if (raw) { autocorrectRules = JSON.parse(raw); }
      else { autocorrectRules = Object.assign({}, DEFAULT_AUTOCORRECT); saveAutoCorrections(); }
    } catch(e) { autocorrectRules = Object.assign({}, DEFAULT_AUTOCORRECT); }
  }

  function saveAutoCorrections() {
    try { localStorage.setItem(CONFIG.STORAGE_PREFIX + 'autocorrect', JSON.stringify(autocorrectRules)); } catch(e) {}
  }

  function applyAutocorrect(text) {
    if (!text) return text;
    var words = text.split(/\b/);
    for (var i = 0; i < words.length; i++) {
      var lower = words[i].toLowerCase();
      if (autocorrectRules[lower]) words[i] = autocorrectRules[lower];
    }
    return words.join('');
  }

  function renderAutocorrectRules() {
    var list = document.getElementById('autocorrect-rules-list');
    if (!list) return;
    var keys = Object.keys(autocorrectRules).sort();
    if (keys.length === 0) { list.innerHTML = '<div class="autocorrect-empty">No rules yet. Add one below.</div>'; return; }
    var html = '';
    for (var i = 0; i < keys.length; i++) {
      var trigger = keys[i];
      var replacement = autocorrectRules[trigger];
      var isDefault = DEFAULT_AUTOCORRECT.hasOwnProperty(trigger);
      html += '<div class="autocorrect-rule-row">' +
        '<input type="text" class="ac-trigger" value="' + escapeHtml(trigger) + '" data-original="' + escapeHtml(trigger) + '">' +
        '<span class="ac-arrow">\u2192</span>' +
        '<input type="text" class="ac-replacement" value="' + escapeHtml(replacement) + '" data-trigger="' + escapeHtml(trigger) + '">' +
        '<button class="ac-delete" data-trigger="' + escapeHtml(trigger) + '" title="Remove"><i class="fa fa-times"></i></button>' +
        (isDefault ? '<span class="ac-badge">default</span>' : '') +
        '</div>';
    }
    list.innerHTML = html;

    var delBtns = list.querySelectorAll('.ac-delete');
    for (var d = 0; d < delBtns.length; d++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var trig = btn.getAttribute('data-trigger');
          delete autocorrectRules[trig];
          saveAutoCorrections();
          renderAutocorrectRules();
          showToast('Rule removed');
        });
      })(delBtns[d]);
    }

    var triggerInputs = list.querySelectorAll('.ac-trigger');
    for (var t = 0; t < triggerInputs.length; t++) {
      (function(inp) {
        inp.addEventListener('change', function() {
          var original = inp.getAttribute('data-original');
          var newVal = inp.value.trim().toLowerCase();
          if (!newVal || newVal === original) return;
          var replacement = autocorrectRules[original];
          delete autocorrectRules[original];
          autocorrectRules[newVal] = replacement;
          saveAutoCorrections();
          renderAutocorrectRules();
        });
      })(triggerInputs[t]);
    }

    var replacementInputs = list.querySelectorAll('.ac-replacement');
    for (var r = 0; r < replacementInputs.length; r++) {
      (function(inp) {
        inp.addEventListener('change', function() {
          var trig = inp.getAttribute('data-trigger');
          autocorrectRules[trig] = inp.value;
          saveAutoCorrections();
        });
      })(replacementInputs[r]);
    }
  }

  function addAutocorrectRule() {
    var triggerInput = document.getElementById('ac-new-trigger');
    var replacementInput = document.getElementById('ac-new-replacement');
    if (!triggerInput || !replacementInput) return;
    var trigger = triggerInput.value.trim().toLowerCase();
    var replacement = replacementInput.value.trim();
    if (!trigger) { showToast('Enter a trigger word'); return; }
    if (!replacement) { showToast('Enter a replacement'); return; }
    autocorrectRules[trigger] = replacement;
    saveAutoCorrections();
    triggerInput.value = '';
    replacementInput.value = '';
    renderAutocorrectRules();
    showToast('Rule added');
  }

  function resetAutocorrectRules() {
    autocorrectRules = Object.assign({}, DEFAULT_AUTOCORRECT);
    saveAutoCorrections();
    renderAutocorrectRules();
    showToast('Rules reset to defaults');
  }

  // ===== CUSTOM TEMPLATES =====
  function loadCustomTemplates() {
    try {
      var raw = localStorage.getItem(CONFIG.CUSTOM_TEMPLATES_KEY);
      if (raw) customTemplates = JSON.parse(raw);
    } catch(e) { customTemplates = []; }
  }

  function saveCustomTemplates() {
    try { localStorage.setItem(CONFIG.CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates)); } catch(e) {}
  }

  function getAllTemplates() {
    return TEMPLATES.concat(customTemplates);
  }

  function saveCurrentAsTemplate() {
    if (!richEditor) return;
    var content = richEditor.innerHTML;
    var title = tabsModule.deriveTitle(content);
    var name = prompt('Template name:', title);
    if (!name || !name.trim()) return;
    var tpl = {
      id: 'custom_' + Date.now(),
      title: name.trim(),
      icon: 'fa-bookmark',
      desc: 'Custom template',
      content: content,
      custom: true
    };
    customTemplates.push(tpl);
    saveCustomTemplates();
    renderTemplates();
    showToast('Template saved: ' + name.trim());
  }

  function deleteCustomTemplate(id) {
    for (var i = 0; i < customTemplates.length; i++) {
      if (customTemplates[i].id === id) { customTemplates.splice(i, 1); break; }
    }
    saveCustomTemplates();
    renderTemplates();
    showToast('Template deleted');
  }

  function exportTemplatesJson() {
    var data = JSON.stringify({ templates: customTemplates, exported: new Date().toISOString() }, null, 2);
    downloadBlob(data, 'oros-templates.json', 'application/json');
    showToast('Templates exported');
  }

  function importTemplatesJson(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        if (data.templates && Array.isArray(data.templates)) {
          for (var i = 0; i < data.templates.length; i++) {
            var t = data.templates[i];
            if (t.title && t.content) {
              if (!t.id) t.id = 'custom_' + Date.now() + '_' + i;
              if (!t.icon) t.icon = 'fa-bookmark';
              if (!t.desc) t.desc = 'Imported template';
              t.custom = true;
              customTemplates.push(t);
            }
          }
          saveCustomTemplates();
          renderTemplates();
          showToast(data.templates.length + ' templates imported');
        } else { showToast('Invalid template file'); }
      } catch(err) { showToast('Failed to parse template file'); }
    };
    reader.readAsText(file);
  }

  // ===== FULL DATABASE EXPORT =====
  function exportFullDatabase() {
    var db = {
      app: 'orOS Writer',
      version: CONFIG.VERSION,
      exported: new Date().toISOString(),
      settings: {},
      tabs: [],
      autocorrect: {},
      customTemplates: [],
      localStorage: {}
    };
    try {
      db.settings = JSON.parse(localStorage.getItem(CONFIG.STORAGE_PREFIX + 'settings') || '{}');
    } catch(e) {}
    try {
      db.tabs = JSON.parse(localStorage.getItem(tabsModule.STORAGE_TABS) || '[]');
    } catch(e) {}
    try {
      db.autocorrect = JSON.parse(localStorage.getItem(CONFIG.STORAGE_PREFIX + 'autocorrect') || '{}');
    } catch(e) {}
    try {
      db.customTemplates = JSON.parse(localStorage.getItem(CONFIG.CUSTOM_TEMPLATES_KEY) || '[]');
    } catch(e) {}
    var orosKeys = ['oros-theme', 'oros-language', 'oros_hide_save_indicator',
      'oros_writer_goal', 'oros_writer_goal_unit', 'oros_writer_font_size',
      'oros_writer_font_family', 'oros_writer_line_height', 'oros_writer_max_width',
      'oros_writer_session_target', 'oros_translations'];
    for (var i = 0; i < orosKeys.length; i++) {
      var val = localStorage.getItem(orosKeys[i]);
      if (val !== null) {
        try { db.localStorage[orosKeys[i]] = JSON.parse(val); }
        catch(e) { db.localStorage[orosKeys[i]] = val; }
      }
    }
    var json = JSON.stringify(db, null, 2);
    downloadBlob(json, 'oros-writer-backup-' + new Date().toISOString().slice(0,10) + '.json', 'application/json');
    showToast('Full database exported');
  }

  // ===== SMART TYPOGRAPHY (FIX #6: add (c), (r), (tm)) =====
  function applySmartTypography(text) {
    if (!smartTypographyEnabled || !text) return text;
    text = text.replace(/\(c\)/gi, '\u00A9');
    text = text.replace(/\(r\)/gi, '\u00AE');
    text = text.replace(/\(tm\)/gi, '\u2122');
    text = text.replace(/(^|[\s(])"/g, '$1\u201C');
    text = text.replace(/"/g, '\u201D');
    text = text.replace(/(^|[\s(])'/g, '$1\u2018');
    text = text.replace(/'/g, '\u2019');
    text = text.replace(/--/g, '\u2014');
    text = text.replace(/ - /g, ' \u2013 ');
    text = text.replace(/\.\.\./g, '\u2026');
    return text;
  }

  // ===== EDITOR INPUT =====
  function setupEditorInput() {
    if (!richEditor) return;
    richEditor.addEventListener('input', function() {
      isTyping = true;
      clearTimeout(typingTimer);
      updateSaveIndicator('unsaved');
      updateStats();
      if (smartTypographyEnabled) {
        var sel = window.getSelection();
        if (sel && sel.anchorNode && sel.anchorNode.nodeType === Node.TEXT_NODE) {
          var node = sel.anchorNode;
          var text = node.textContent;
          var transformed = applySmartTypography(text);
          if (transformed !== text) {
            var offset = sel.anchorOffset;
            node.textContent = transformed;
            var range = document.createRange();
            range.setStart(node, Math.min(offset, transformed.length));
            range.collapse(true);
            sel.removeAllRanges(); sel.addRange(range);
          }
        }
      }
      playTypewriterSound();
      typingTimer = setTimeout(function() { isTyping = false; saveCurrentTabContent(); }, 800);
    });

    richEditor.addEventListener('paste', function(e) {
      if (smartPasteEnabled) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData('text/plain');
        text = applyAutocorrect(text);
        document.execCommand('insertHTML', false, escapeHtml(text).replace(/\n/g, '<br>'));
        saveCurrentTabContent();
      }
    });

    richEditor.addEventListener('scroll', function() { updateReadingProgress(); });
    richEditor.addEventListener('keyup', function() { setTimeout(updateToolbarStates, 10); });
    richEditor.addEventListener('mouseup', function() { setTimeout(updateToolbarStates, 10); });

    if (tabsModule) {
      tabsModule.on('switch', function(tab) {
        if (!richEditor || !tab) return;
        richEditor.innerHTML = tab.content || '<p><br></p>';
        loadPageSettingsFields();
        updateStats();
        updateSaveIndicator('saved');
        richEditor.focus();
        clampToViewport();
      });
    }
  }
  
    // ===== KEYBOARD SHORTCUTS =====
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      var ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'b' && !e.shiftKey) { e.preventDefault(); document.execCommand('bold'); saveCurrentTabContent(); setTimeout(updateToolbarStates, 10); return; }
      if (ctrl && e.key === 'i' && !e.shiftKey) { e.preventDefault(); document.execCommand('italic'); saveCurrentTabContent(); setTimeout(updateToolbarStates, 10); return; }
      if (ctrl && e.key === 'u' && !e.shiftKey) { e.preventDefault(); document.execCommand('underline'); saveCurrentTabContent(); setTimeout(updateToolbarStates, 10); return; }
      if (ctrl && e.key === 's') { e.preventDefault(); saveCurrentTabContent(); showToast(getTrans('text_saved') !== 'text_saved' ? getTrans('text_saved') : 'Saved'); return; }
      if (ctrl && e.key === 'f') { e.preventDefault(); toggleFindBar(); return; }
      if (ctrl && e.key === 'g') { e.preventDefault(); toggleGoalBar(); return; }
      if (ctrl && e.key === 'n' && !e.shiftKey) { e.preventDefault(); tabsModule.create({ content: '<p><br></p>', metadata: {} }); return; }
      if (ctrl && e.key === 'w') { e.preventDefault(); var aid = tabsModule.getActiveId(); if (aid) tabsModule.close(aid); return; }
      if (ctrl && e.shiftKey && (e.key === 'N' || e.key === 'n')) { e.preventDefault(); toggleZenMode(); return; }

      if (e.key === 'F9') { e.preventDefault(); toggleZenMode(); return; }
      if (e.key === 'F11') { e.preventDefault(); toggleFocusMode(); return; }

      if (e.key === 'Escape') {
        e.isHandledByWriter = true;
        document.querySelectorAll('.side-panel').forEach(function(p) { if (p.style.display === 'flex') p.style.display = 'none'; });
        document.querySelectorAll('.dialog-overlay').forEach(function(d) { if (d.style.display === 'flex') d.style.display = 'none'; });
        var sm = document.querySelector('.settings-modal.visible');
        if (sm) sm.classList.remove('visible');
        if (document.body.classList.contains('reading-mode')) { toggleReadingMode(); }
      }
    });
  }

  // ===== TOOLBAR STATES =====
  function updateToolbarStates() {
    if (!richEditor) return;
    var cmds = ['bold', 'italic', 'underline', 'strikeThrough'];
    for (var i = 0; i < cmds.length; i++) {
      try {
        var isActive = document.queryCommandState(cmds[i]);
        var btn = document.getElementById('btn-' + cmds[i].toLowerCase());
        if (btn) { if (isActive) btn.classList.add('active'); else btn.classList.remove('active'); }
      } catch(e) {}
    }
    if (stylesSelect) {
      try {
        var block = document.queryCommandValue('formatBlock');
        if (block) {
          var map = { 'h1': 'h1', 'h2': 'h2', 'h3': 'h3', 'p': 'normal', 'blockquote': 'quote', 'pre': 'code' };
          stylesSelect.value = map[block.toLowerCase()] || 'normal';
        }
      } catch(e) {}
    }
  }

  // ===== NAMED STYLE =====
  function applyNamedStyle(style) {
    if (!richEditor) return;
    switch(style) {
      case 'h1': document.execCommand('formatBlock', false, 'h1'); break;
      case 'h2': document.execCommand('formatBlock', false, 'h2'); break;
      case 'h3': document.execCommand('formatBlock', false, 'h3'); break;
      case 'h4': document.execCommand('formatBlock', false, 'h4'); break;
      case 'quote': document.execCommand('formatBlock', false, 'blockquote'); break;
      case 'code': document.execCommand('formatBlock', false, 'pre'); break;
      case 'normal': document.execCommand('formatBlock', false, 'p'); break;
      default: break;
    }
    saveCurrentTabContent();
    setTimeout(updateToolbarStates, 10);
  }

  // ===== GOAL BAR =====
  function toggleGoalBar() {
    if (!goalBar) goalBar = document.getElementById('goal-bar');
    if (!goalBar) return;
    goalBar.style.display = (goalBar.style.display === 'flex') ? 'none' : 'flex';
    if (goalBar.style.display === 'flex') {
      goalTargetInput = document.getElementById('goal-target-input');
      goalUnitSelect = document.getElementById('goal-unit-select');
      if (goalTargetInput) {
        var existing = localStorage.getItem('oros_writer_goal') || '';
        goalTargetInput.value = existing;
        goalTargetInput.focus();
      }
    }
  }

  function setGoal() {
    goalTargetInput = document.getElementById('goal-target-input');
    goalUnitSelect = document.getElementById('goal-unit-select');
    if (!goalTargetInput) return;
    var goal = parseInt(goalTargetInput.value, 10);
    var unit = goalUnitSelect ? goalUnitSelect.value : 'words';
    if (goal > 0) {
      localStorage.setItem('oros_writer_goal', String(goal));
      localStorage.setItem('oros_writer_goal_unit', unit);
      showToast(getTrans('text_goal_set') !== 'text_goal_set' ? getTrans('text_goal_set') : 'Goal set: ' + goal + ' ' + unit);
      updateStats();
      if (goalBar) goalBar.style.display = 'none';
    }
  }

  function clearGoal() {
    localStorage.removeItem('oros_writer_goal');
    localStorage.removeItem('oros_writer_goal_unit');
    if (statsGoalEl) statsGoalEl.textContent = '';
    showToast(getTrans('text_goal_cleared') !== 'text_goal_cleared' ? getTrans('text_goal_cleared') : 'Goal cleared');
    if (goalBar) goalBar.style.display = 'none';
  }

  function updateGoalBar() {
    if (!goalBar || goalBar.style.display !== 'flex') return;
    var goal = parseInt(localStorage.getItem('oros_writer_goal'), 10) || 0;
    var unit = localStorage.getItem('oros_writer_goal_unit') || 'words';
    if (goal <= 0) return;
    var text = richEditor ? richEditor.innerText : '';
    var words = text.trim() ? text.trim().split(/\s+/).length : 0;
    var chars = text.length;
    var current = (unit === 'chars') ? chars : words;
    var pct = Math.min(100, Math.round((current / goal) * 100));
    if (!goalBarFill) goalBarFill = document.getElementById('goal-bar-fill');
    if (goalBarFill) goalBarFill.style.width = pct + '%';
  }

  // ===== FIND & REPLACE =====
  function toggleFindBar() {
    if (!findBar) findBar = document.getElementById('find-replace-bar');
    if (!findBar) return;
    findBar.style.display = (findBar.style.display === 'flex') ? 'none' : 'flex';
    if (findBar.style.display === 'flex') {
      findInput = document.getElementById('find-input');
      replaceInput = document.getElementById('replace-input');
      frResults = document.getElementById('fr-results');
      findFormatFilter = document.getElementById('find-format-filter');
      if (findInput) { findInput.focus(); findInput.select(); }
    } else { clearHighlights(); }
  }

  var findMatches = [];
  var currentMatchIdx = -1;

  function performFind() {
    if (!findInput || !richEditor) return;
    var query = findInput.value.trim();
    clearHighlights();
    if (!query) { if (frResults) frResults.textContent = ''; return; }
    var flags = 'gi';
    var pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (findFormatFilter && findFormatFilter.value === 'whole-word') pattern = '\\b' + pattern + '\\b';
    var regex;
    try { regex = new RegExp(pattern, flags); } catch(e) { if (frResults) frResults.textContent = 'Invalid pattern'; return; }
    findMatches = [];
    var walker = document.createTreeWalker(richEditor, NodeFilter.SHOW_TEXT, null, false);
    var nodes = []; var node;
    while ((node = walker.nextNode())) nodes.push(node);
    for (var i = 0; i < nodes.length; i++) {
      var textNode = nodes[i];
      var text = textNode.textContent;
      regex.lastIndex = 0;
      var match;
      while ((match = regex.exec(text)) !== null) {
        if (match[0].length === 0) { regex.lastIndex++; continue; }
        findMatches.push({ node: textNode, start: match.index, end: match.index + match[0].length, text: match[0] });
      }
    }
    for (var j = findMatches.length - 1; j >= 0; j--) {
      var m = findMatches[j];
      var range = document.createRange();
      range.setStart(m.node, m.start); range.setEnd(m.node, m.end);
      var mark = document.createElement('mark');
      mark.className = 'find-match';
      range.surroundContents(mark);
    }
    currentMatchIdx = -1;
    if (findMatches.length > 0) navigateMatch(1);
    if (frResults) frResults.textContent = findMatches.length + ' match' + (findMatches.length !== 1 ? 'es' : '');
  }

  function navigateMatch(direction) {
    if (findMatches.length === 0) return;
    var currentMarks = richEditor.querySelectorAll('mark.find-match.current');
    for (var i = 0; i < currentMarks.length; i++) currentMarks[i].classList.remove('current');
    currentMatchIdx += direction;
    if (currentMatchIdx >= findMatches.length) currentMatchIdx = 0;
    if (currentMatchIdx < 0) currentMatchIdx = findMatches.length - 1;
    var marks = richEditor.querySelectorAll('mark.find-match');
    if (marks[currentMatchIdx]) {
      marks[currentMatchIdx].classList.add('current');
      marks[currentMatchIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (frResults) frResults.textContent = (currentMatchIdx + 1) + '/' + findMatches.length;
  }

  function doReplace(replaceAll) {
    if (!replaceInput || findMatches.length === 0) return;
    var replaceText = replaceInput.value;
    if (replaceAll) {
      var marks = richEditor.querySelectorAll('mark.find-match');
      for (var i = marks.length - 1; i >= 0; i--) {
        var txt = document.createTextNode(replaceText);
        var parent = marks[i].parentNode;
        parent.replaceChild(txt, marks[i]);
        parent.normalize();
      }
      clearHighlights(); performFind();
      showToast(getTrans('text_replaced_all') !== 'text_replaced_all' ? getTrans('text_replaced_all') : 'Replaced all');
    } else {
      if (currentMatchIdx >= 0 && currentMatchIdx < findMatches.length) {
        var marks2 = richEditor.querySelectorAll('mark.find-match');
        if (marks2[currentMatchIdx]) {
          var txt2 = document.createTextNode(replaceText);
          var parent2 = marks2[currentMatchIdx].parentNode;
          parent2.replaceChild(txt2, marks2[currentMatchIdx]);
          parent2.normalize();
        }
      }
      clearHighlights(); performFind();
    }
    saveCurrentTabContent();
  }

  function clearHighlights() {
    if (!richEditor) return;
    var marks = richEditor.querySelectorAll('mark.find-match');
    for (var i = marks.length - 1; i >= 0; i--) {
      var parent = marks[i].parentNode;
      var txt = document.createTextNode(marks[i].textContent);
      parent.replaceChild(txt, marks[i]);
      parent.normalize();
    }
    findMatches = []; currentMatchIdx = -1;
  }

  // ===== SESSION TIMER =====
  function toggleSessionBar() {
    if (!sessionBar) sessionBar = document.getElementById('session-bar');
    if (!sessionBar) return;
    sessionBar.style.display = (sessionBar.style.display === 'flex') ? 'none' : 'flex';
    if (sessionBar.style.display === 'flex') sessionDisplay = document.getElementById('session-display');
  }

  function startSession() {
    sessionStartTime = Date.now(); sessionSeconds = 0;
    if (sessionInterval) clearInterval(sessionInterval);
    sessionInterval = setInterval(function() {
      sessionSeconds++;
      if (sessionDisplay) {
        var mins = Math.floor(sessionSeconds / 60);
        var secs = sessionSeconds % 60;
        sessionDisplay.textContent = mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
      }
    }, 1000);
    var stopBtn = document.getElementById('btn-stop-session');
    var startBtn = document.getElementById('btn-start-session');
    if (stopBtn) stopBtn.style.display = '';
    if (startBtn) startBtn.style.display = 'none';
  }

  function stopSession() {
    if (sessionInterval) { clearInterval(sessionInterval); sessionInterval = null; }
    var mins = Math.floor(sessionSeconds / 60);
    var targetMin = parseInt(localStorage.getItem('oros_writer_session_target') || '0', 10);
    if (sessionDisplay) {
      sessionDisplay.classList.remove('complete', 'warning');
      if (targetMin > 0 && mins >= targetMin) sessionDisplay.classList.add('complete');
      else if (targetMin > 0 && mins >= targetMin * 0.8) sessionDisplay.classList.add('warning');
    }
    var stopBtn = document.getElementById('btn-stop-session');
    var startBtn = document.getElementById('btn-start-session');
    if (stopBtn) stopBtn.style.display = 'none';
    if (startBtn) startBtn.style.display = '';
  }

  // ===== TRACK CHANGES =====
  function toggleTrackChanges() {
    trackingChanges = !trackingChanges;
    var tcBtn = document.getElementById('btn-track-changes');
    if (trackChangesBar) trackChangesBar = document.getElementById('track-changes-bar');
    if (trackChangesBar) trackChangesBar.style.display = trackingChanges ? 'flex' : 'none';
    if (tcBtn) {
      if (trackingChanges) tcBtn.classList.add('active');
      else tcBtn.classList.remove('active');
    }

    if (trackingChanges) {
      if (!trackChangesObserver) {
        trackChangesObserver = new MutationObserver(function(mutations) {
          if (!trackingChanges) return;
          for (var i = 0; i < mutations.length; i++) {
            var mut = mutations[i];
            if (mut.type === 'childList') {
              for (var j = 0; j < mut.addedNodes.length; j++) {
                var node = mut.addedNodes[j];
                if (node.nodeType === Node.TEXT_NODE &&
                    node.textContent.length > 0 &&
                    !(node.parentElement && node.parentElement.classList.contains('tracker-insert'))) {
                  var span = document.createElement('span');
                  span.className = 'tracker-insert';
                  node.parentNode.insertBefore(span, node);
                  span.appendChild(node);
                }
              }
            }
          }
        });
        trackChangesObserver.observe(richEditor, { childList: true, characterData: true, subtree: true });
      }
      richEditor.addEventListener('keydown', trackChangesKeyHandler);
    } else {
      if (trackChangesObserver) { trackChangesObserver.disconnect(); }
      richEditor.removeEventListener('keydown', trackChangesKeyHandler);
    }

    showToast(trackingChanges ? (getTrans('text_track_on') !== 'text_track_on' ? getTrans('text_track_on') : 'Track changes ON') : (getTrans('text_track_off') !== 'text_track_off' ? getTrans('text_track_off') : 'Track changes OFF'));
  }

  function trackChangesKeyHandler(e) {
    if (!trackingChanges) return;
    if (e.key === 'Backspace' || e.key === 'Delete') {
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      var range = sel.getRangeAt(0);
      if (range.collapsed) {
        e.preventDefault();
        var node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE && node.textContent.length > 0) {
          var offset = range.startOffset;
          if (e.key === 'Backspace' && offset > 0) {
            var deletedChar = node.textContent[offset - 1];
            var delSpan = document.createElement('span');
            delSpan.className = 'tracker-delete';
            delSpan.textContent = deletedChar;
            node.textContent = node.textContent.slice(0, offset - 1) + node.textContent.slice(offset);
            range.setStart(node, offset - 1);
            range.insertNode(delSpan);
            range.setStart(node, offset);
            range.collapse(true);
            sel.removeAllRanges(); sel.addRange(range);
          } else if (e.key === 'Delete' && offset < node.textContent.length) {
            var deletedChar2 = node.textContent[offset];
            var delSpan2 = document.createElement('span');
            delSpan2.className = 'tracker-delete';
            delSpan2.textContent = deletedChar2;
            node.textContent = node.textContent.slice(0, offset) + node.textContent.slice(offset + 1);
            range.insertNode(delSpan2);
            range.setStart(node, offset);
            range.collapse(true);
            sel.removeAllRanges(); sel.addRange(range);
          }
        }
      } else {
        e.preventDefault();
        var fragment = range.extractContents();
        var delSpan3 = document.createElement('span');
        delSpan3.className = 'tracker-delete';
        delSpan3.appendChild(fragment);
        range.insertNode(delSpan3);
        sel.removeAllRanges();
      }
      saveCurrentTabContent();
    }
  }

  function acceptAllChanges() {
    if (!richEditor) return;
    var inserts = richEditor.querySelectorAll('.tracker-insert');
    for (var i = 0; i < inserts.length; i++) {
      var parent = inserts[i].parentNode;
      while (inserts[i].firstChild) parent.insertBefore(inserts[i].firstChild, inserts[i]);
      parent.removeChild(inserts[i]);
      parent.normalize();
    }
    var deletes = richEditor.querySelectorAll('.tracker-delete');
    for (var j = deletes.length - 1; j >= 0; j--) deletes[j].remove();
    saveCurrentTabContent();
    showToast(getTrans('text_changes_accepted') !== 'text_changes_accepted' ? getTrans('text_changes_accepted') : 'All changes accepted');
  }

  function rejectAllChanges() {
    if (!richEditor) return;
    var inserts = richEditor.querySelectorAll('.tracker-insert');
    for (var i = inserts.length - 1; i >= 0; i--) inserts[i].remove();
    var deletes = richEditor.querySelectorAll('.tracker-delete');
    for (var j = 0; j < deletes.length; j++) {
      var parent = deletes[j].parentNode;
      while (deletes[j].firstChild) parent.insertBefore(deletes[j].firstChild, deletes[j]);
      parent.removeChild(deletes[j]);
      parent.normalize();
    }
    saveCurrentTabContent();
    showToast(getTrans('text_changes_rejected') !== 'text_changes_rejected' ? getTrans('text_changes_rejected') : 'All changes rejected');
  }

  // ===== ZEN MODE =====
  function toggleZenMode() {
    var isZen = document.body.dataset.zen === 'true';
    document.body.dataset.zen = isZen ? 'false' : 'true';
    document.body.classList.toggle('zen-mode');
    if (!isZen && richEditor) richEditor.focus();
    showToast(!isZen ? (getTrans('text_zen_on') !== 'text_zen_on' ? getTrans('text_zen_on') : 'Zen mode ON') : (getTrans('text_zen_off') !== 'text_zen_off' ? getTrans('text_zen_off') : 'Zen mode OFF'));
  }

  // ===== FOCUS MODE =====
  function toggleFocusMode() {
    focusModeEnabled = !focusModeEnabled;
    document.body.classList.toggle('focus-mode', focusModeEnabled);
    if (focusModeEnabled && richEditor) {
      updateFocusedParagraph();
      var handler = updateFocusedParagraph;
      richEditor._focusHandler = handler;
      richEditor.addEventListener('keyup', handler);
      richEditor.addEventListener('click', handler);
    } else {
      if (richEditor) {
        var focused = richEditor.querySelectorAll('.is-focused');
        for (var i = 0; i < focused.length; i++) focused[i].classList.remove('is-focused');
        if (richEditor._focusHandler) {
          richEditor.removeEventListener('keyup', richEditor._focusHandler);
          richEditor.removeEventListener('click', richEditor._focusHandler);
        }
      }
    }
    showToast(focusModeEnabled ? (getTrans('text_focus_on') !== 'text_focus_on' ? getTrans('text_focus_on') : 'Focus mode ON') : (getTrans('text_focus_off') !== 'text_focus_off' ? getTrans('text_focus_off') : 'Focus mode OFF'));
  }

  function updateFocusedParagraph() {
    if (!richEditor) return;
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    var node = sel.anchorNode;
    if (!node) return;
    var block = (node.nodeType === Node.TEXT_NODE) ? node.parentElement : node;
    var blockTags = 'P H1 H2 H3 H4 H5 H6 BLOCKQUOTE PRE UL OL DIV'.split(' ');
    while (block && block !== richEditor && blockTags.indexOf(block.tagName) === -1) block = block.parentElement;
    if (!block || block === richEditor) return;
    var all = richEditor.querySelectorAll('.is-focused');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('is-focused');
    block.classList.add('is-focused');
  }

  // ===== READING MODE =====
  function toggleReadingMode() {
    document.body.classList.toggle('reading-mode');
    var isReading = document.body.classList.contains('reading-mode');
    var exitBtn = document.getElementById('btn-exit-reading-mode');
    if (exitBtn) exitBtn.style.display = isReading ? 'inline-flex' : 'none';
    if (isReading && richEditor) richEditor.setAttribute('contenteditable', 'false');
    else if (richEditor) { richEditor.setAttribute('contenteditable', 'true'); richEditor.focus(); }
    showToast(isReading ? (getTrans('text_reading_on') !== 'text_reading_on' ? getTrans('text_reading_on') : 'Reading mode ON') : (getTrans('text_reading_off') !== 'text_reading_off' ? getTrans('text_reading_off') : 'Reading mode OFF'));
  }

  // ===== WORD FREQUENCY =====
  function toggleWordFreqPanel() {
    if (!wordFreqPanel) wordFreqPanel = document.getElementById('wordfreq-panel');
    if (!wordFreqPanel) return;
    wordFreqPanel.style.display = (wordFreqPanel.style.display === 'flex') ? 'none' : 'flex';
    if (wordFreqPanel.style.display === 'flex') {
      wordFreqList = document.getElementById('wordfreq-list');
      wordFreqSummary = document.getElementById('wordfreq-summary');
      updateWordFrequency();
    }
  }

  function updateWordFrequency() {
    if (!wordFreqList || !richEditor) return;
    var text = richEditor.innerText.toLowerCase();
    var stopWords = { 'the':1,'a':1,'an':1,'and':1,'or':1,'but':1,'in':1,'on':1,'at':1,'to':1,'for':1,'of':1,'with':1,'by':1,'from':1,'is':1,'was':1,'are':1,'were':1,'be':1,'been':1,'being':1,'have':1,'has':1,'had':1,'do':1,'does':1,'did':1,'will':1,'would':1,'could':1,'should':1,'may':1,'might':1,'must':1,'can':1,'this':1,'that':1,'these':1,'those':1,'i':1,'you':1,'he':1,'she':1,'it':1,'we':1,'they':1,'what':1,'which':1,'who':1,'when':1,'where':1,'why':1,'how':1,'all':1,'each':1,'every':1,'both':1,'few':1,'more':1,'most':1,'other':1,'some':1,'such':1,'no':1,'nor':1,'not':1,'only':1,'own':1,'same':1,'so':1,'than':1,'too':1,'very':1,'just':1,'as':1,'if':1,'then':1,'else':1,'about':1,'into':1,'through':1,'during':1,'before':1,'after':1,'above':1,'below':1,'up':1,'down':1,'out':1,'off':1,'over':1,'under':1,'again':1,'further':1,'once':1,'here':1,'there':1 };
    var words = text.match(/\b[a-zA-Z\u03B1-\u03C9\u03AC-\u03CE\u0388-\u03CE]+(?:'[a-z]{1,2})?\b/g) || [];
    var freq = {};
    for (var i = 0; i < words.length; i++) {
      var w = words[i].toLowerCase();
      if (stopWords[w] || w.length < 3) continue;
      freq[w] = (freq[w] || 0) + 1;
    }
    var sorted = Object.keys(freq).sort(function(a, b) { return freq[b] - freq[a]; });
    var top = sorted.slice(0, 25);
    if (top.length === 0) { wordFreqList.innerHTML = '<div class="wordfreq-empty">' + (getTrans('text_no_words') !== 'text_no_words' ? getTrans('text_no_words') : 'No words found') + '</div>'; return; }
    var maxCount = freq[top[0]];
    var totalUnique = sorted.length;
    var totalWords = words.length;
    if (wordFreqSummary) {
      wordFreqSummary.innerHTML = '<div class="stat-row"><span>' + (getTrans('text_total_words') !== 'text_total_words' ? getTrans('text_total_words') : 'Total words:') + '</span><span>' + totalWords + '</span></div><div class="stat-row"><span>' + (getTrans('text_unique_words') !== 'text_unique_words' ? getTrans('text_unique_words') : 'Unique words:') + '</span><span>' + totalUnique + '</span></div>';
    }
    var html = '';
    for (var j = 0; j < top.length; j++) {
      var word = top[j];
      var count = freq[word];
      var pct = Math.round((count / maxCount) * 100);
      var cls = count > 5 ? ' overused' : '';
      html += '<div class="wordfreq-item' + cls + '">' +
        '<span class="wf-word">' + escapeHtml(word) + '</span>' +
        '<div class="wordfreq-bar"><div class="wordfreq-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="wordfreq-count">' + count + '</span></div>';
    }
    wordFreqList.innerHTML = html;
  }

  // ===== OUTLINE PANEL =====
  function toggleOutline() {
    if (!outlinePanel) outlinePanel = document.getElementById('outline-panel');
    if (!outlinePanel) return;
    outlinePanel.style.display = (outlinePanel.style.display === 'flex') ? 'none' : 'flex';
    if (outlinePanel.style.display === 'flex') { outlineList = document.getElementById('outline-list'); updateOutline(); }
  }

  // ===== METADATA PANEL =====
  function toggleMetadataPanel() {
    if (!metadataPanel) metadataPanel = document.getElementById('metadata-panel');
    if (!metadataPanel) return;
    metadataPanel.style.display = (metadataPanel.style.display === 'flex') ? 'none' : 'flex';
    if (metadataPanel.style.display === 'flex') { loadMetadataFields(); loadPageSettingsFields(); }
  }

  function loadMetadataFields() {
    var meta = tabsModule.getMetadata();
    if (metaTitle) metaTitle.value = meta.title || '';
    if (metaAuthor) metaAuthor.value = meta.author || '';
    if (metaTags) metaTags.value = meta.tags || '';
    if (metaCategory) metaCategory.value = meta.category || '';
    if (metaCreated) metaCreated.textContent = meta.created || '\u2014';
    if (metaModified) metaModified.textContent = meta.modified || '\u2014';
  }

  function saveMetadataFromFields() {
    var meta = tabsModule.getMetadata();
    if (metaTitle) meta.title = metaTitle.value;
    if (metaAuthor) meta.author = metaAuthor.value;
    if (metaTags) meta.tags = metaTags.value;
    if (metaCategory) meta.category = metaCategory.value;
    meta.modified = new Date().toISOString();
    tabsModule.setMetadata(meta);
    if (metaModified) metaModified.textContent = meta.modified;
  }

  // ===== COMMENTS =====
  function toggleCommentsPanel() {
    if (!commentsPanel) commentsPanel = document.getElementById('comments-panel');
    if (!commentsPanel) return;
    commentsPanel.style.display = (commentsPanel.style.display === 'flex') ? 'none' : 'flex';
  }

  function addComment() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) {
      showToast(getTrans('text_select_first') !== 'text_select_first' ? getTrans('text_select_first') : 'Select text first');
      return;
    }
    var range = sel.getRangeAt(0);
    savedCommentRange = range.cloneRange();

    var highlight = document.createElement('span');
    highlight.className = 'comment-highlight';
    try { range.surroundContents(highlight); }
    catch(e) {
      showToast('Cannot comment across multiple elements');
      return;
    }

    var list = document.getElementById('comments-list');
    if (!list) return;
    var quoted = highlight.textContent.substring(0, 80);
    var item = document.createElement('div');
    item.className = 'comment-item';
    item.innerHTML =
      '<div class="comment-header"><span class="comment-author">You</span>' +
      '<span class="comment-timestamp">' + new Date().toLocaleTimeString() + '</span></div>' +
      '<div class="comment-text"><textarea placeholder="' +
      (getTrans('text_comment_ph') !== 'text_comment_ph' ? getTrans('text_comment_ph') : 'Write a comment...') +
      '"></textarea></div>' +
      '<div class="comment-quoted">' + escapeHtml(quoted) + '</div>' +
      '<div class="comment-actions">' +
      '<button class="btn-resolve">' + (getTrans('text_resolve') !== 'text_resolve' ? getTrans('text_resolve') : 'Resolve') + '</button>' +
      '<button class="btn-delete">' + (getTrans('text_delete') !== 'text_delete' ? getTrans('text_delete') : 'Delete') + '</button>' +
      '</div>';
    list.appendChild(item);

    var ta = item.querySelector('textarea');
    if (ta) ta.focus();

    var commentIdx = list.querySelectorAll('.comment-item').length - 1;
    highlight.setAttribute('data-comment-idx', commentIdx);
    highlight.addEventListener('mouseenter', function() {
      item.classList.add('highlighted');
    });
    highlight.addEventListener('mouseleave', function() {
      item.classList.remove('highlighted');
    });

    item.querySelector('.btn-resolve').addEventListener('click', function() {
      item.classList.add('comment-resolved');
      highlight.classList.add('resolved');
    });

    item.querySelector('.btn-delete').addEventListener('click', function() {
      item.remove();
      if (highlight.parentNode) {
        var txt = document.createTextNode(highlight.textContent);
        highlight.parentNode.replaceChild(txt, highlight);
        highlight.parentNode.normalize();
      }
    });

    saveCurrentTabContent();
  }
  
    // ===== TABLE OF CONTENTS =====
  function toggleToCPanel() {
    if (!tocPanel) tocPanel = document.getElementById('toc-panel');
    if (!tocPanel) return;
    tocPanel.style.display = (tocPanel.style.display === 'flex') ? 'none' : 'flex';
    if (tocPanel.style.display === 'flex') { tocList = document.getElementById('toc-list'); updateToC(); }
  }

  function updateToC() {
    if (!tocList || !richEditor) return;
    var heads = richEditor.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (heads.length === 0) { tocList.innerHTML = '<div class="outline-empty">No headings found</div>'; return; }
    var html = ''; var counters = [0, 0, 0, 0, 0, 0];
    for (var i = 0; i < heads.length; i++) {
      var level = parseInt(heads[i].tagName.charAt(1), 10);
      counters[level - 1]++; for (var l = level; l < 6; l++) counters[l] = 0;
      var num = ''; for (var n = 0; n < level; n++) num += (n > 0 ? '.' : '') + counters[n];
      var text = heads[i].textContent.trim() || '(empty)';
      html += '<div class="toc-item toc-level-' + level + '" data-toc-index="' + i + '">' +
        '<span class="toc-num">' + num + '</span><span>' + escapeHtml(text) + '</span></div>';
    }
    tocList.innerHTML = html;
    var items = tocList.querySelectorAll('.toc-item');
    for (var j = 0; j < items.length; j++) {
      (function(item, idx) {
        item.addEventListener('click', function() {
          var heading = richEditor.querySelectorAll('h1, h2, h3, h4, h5, h6')[idx];
          if (heading) heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      })(items[j], j);
    }
  }

  function insertToCIntoDocument() {
    if (!richEditor) return;
    var heads = richEditor.querySelectorAll('h1, h2, h3, h4, h5, h6');
    var html = '<h2>Table of Contents</h2><ul>';
    var counters = [0, 0, 0, 0, 0, 0];
    for (var i = 0; i < heads.length; i++) {
      var level = parseInt(heads[i].tagName.charAt(1), 10);
      counters[level - 1]++; for (var l = level; l < 6; l++) counters[l] = 0;
      var num = ''; for (var n = 0; n < level; n++) num += (n > 0 ? '.' : '') + counters[n];
      var text = heads[i].textContent.trim();
      html += '<li class="toc-level-' + level + '">' + num + ' ' + escapeHtml(text) + '</li>';
    }
    html += '</ul>';
    document.execCommand('insertHTML', false, html);
    saveCurrentTabContent();
    showToast(getTrans('text_toc_inserted') !== 'text_toc_inserted' ? getTrans('text_toc_inserted') : 'Table of Contents inserted');
  }

  // ===== VERSION HISTORY =====
  function toggleVersionPanel() {
    if (!versionPanel) versionPanel = document.getElementById('version-history-panel');
    if (!versionPanel) return;
    versionPanel.style.display = (versionPanel.style.display === 'flex') ? 'none' : 'flex';
    if (versionPanel.style.display === 'flex') { versionList = document.getElementById('version-list'); renderVersions(); }
  }

  function addVersionSnapshot() {
    if (!richEditor) return;
    var tab = tabsModule.getActive(); if (!tab) return;
    if (!tab.versions) tab.versions = [];

    showToast(getTrans('text_snapshot_saved') !== 'text_snapshot_saved' ? getTrans('text_snapshot_saved') : 'Snapshot saved');

    var snapshot = {
      id: 'ver_' + Date.now(),
      content: richEditor.innerHTML,
      timestamp: new Date().toISOString(),
      words: (richEditor.innerText.trim().split(/\s+/).length || 0)
    };
    tab.versions.unshift(snapshot);
    if (tab.versions.length > 20) tab.versions.length = 20;
    tabsModule.persist();

    setTimeout(function() {
      if (versionPanel && versionPanel.style.display === 'flex') renderVersions();
    }, 0);
  }

  function renderVersions() {
    if (!versionList) return;
    var tab = tabsModule.getActive();
    if (!tab || !tab.versions || tab.versions.length === 0) { versionList.innerHTML = '<div class="outline-empty">No snapshots yet</div>'; return; }
    var html = '';
    for (var i = 0; i < tab.versions.length; i++) {
      var v = tab.versions[i];
      var date = new Date(v.timestamp);
      var timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      var isCurrent = i === 0;
      html += '<div class="version-item' + (isCurrent ? ' current' : '') + '" data-ver-id="' + v.id + '">' +
        '<div class="version-header"><span class="version-time">' + escapeHtml(timeStr) + '</span>' +
        (isCurrent ? '<span class="version-badge">CURRENT</span>' : '') + '</div>' +
        '<div class="version-words">' + v.words + ' words</div>' +
        '<div class="version-actions"><button class="btn-restore">Restore</button><button class="btn-delete">Delete</button></div></div>';
    }
    versionList.innerHTML = html;
    var items = versionList.querySelectorAll('.version-item');
    for (var j = 0; j < items.length; j++) {
      (function(item, idx) {
        var verId = item.getAttribute('data-ver-id');
        item.querySelector('.btn-restore').addEventListener('click', function() { restoreVersion(verId); });
        item.querySelector('.btn-delete').addEventListener('click', function() {
          var tab2 = tabsModule.getActive();
          if (!tab2 || !tab2.versions) return;
          tab2.versions.splice(idx, 1); tabsModule.persist(); renderVersions();
        });
      })(items[j], j);
    }
  }

  function restoreVersion(verId) {
    var tab = tabsModule.getActive();
    if (!tab || !tab.versions) return;
    for (var i = 0; i < tab.versions.length; i++) {
      if (tab.versions[i].id === verId) {
        if (richEditor) { richEditor.innerHTML = tab.versions[i].content; saveCurrentTabContent(); updateStats(); }
        showToast(getTrans('text_version_restored') !== 'text_version_restored' ? getTrans('text_version_restored') : 'Version restored');
        return;
      }
    }
  }

  // ===== FOOTNOTE DIALOG =====
  function toggleFootnoteDialog() {
    var dlg = document.getElementById('footnote-dialog-overlay');
    if (dlg) {
      dlg.style.display = (dlg.style.display === 'flex') ? 'none' : 'flex';
      var ta = document.getElementById('footnote-text-input');
      if (ta && dlg.style.display === 'flex') ta.focus();
    }
  }

  var footnoteCounter = 0;
  function insertFootnote() {
    var ta = document.getElementById('footnote-text-input');
    if (!ta || !ta.value.trim()) { showToast(getTrans('text_enter_footnote') !== 'text_enter_footnote' ? getTrans('text_enter_footnote') : 'Enter footnote text'); return; }
    footnoteCounter++; var num = footnoteCounter; var text = ta.value.trim(); ta.value = '';
    var ref = document.createElement('sup'); ref.className = 'footnote-ref';
    ref.textContent = '[' + num + ']'; ref.setAttribute('data-footnote-id', num);
    document.execCommand('insertHTML', false, ref.outerHTML);
    if (!footnoteArea) footnoteArea = document.getElementById('footnote-area');
    if (footnoteArea) {
      footnoteArea.style.display = 'block';
      var item = document.createElement('div'); item.className = 'footnote-item';
      item.innerHTML = '<span class="footnote-item-num">[' + num + ']</span><span>' + escapeHtml(text) + '</span>';
      footnoteArea.appendChild(item);
    }
    var dlg = document.getElementById('footnote-dialog-overlay');
    if (dlg) dlg.style.display = 'none';
    saveCurrentTabContent();
  }

  // ===== LINK DIALOG =====
  function toggleLinkDialog() {
    var dlg = document.getElementById('link-dialog-overlay');
    if (!dlg) return;
    dlg.style.display = (dlg.style.display === 'flex') ? 'none' : 'flex';
    if (dlg.style.display === 'flex') {
      var urlInput = document.getElementById('link-url-input');
      var textInput = document.getElementById('link-text-input');
      if (textInput) { var sel = window.getSelection(); if (sel && !sel.isCollapsed) textInput.value = sel.toString(); }
      if (urlInput) urlInput.focus();
    }
  }

  function insertOrUpdateLink() {
    var urlInput = document.getElementById('link-url-input');
    var textInput = document.getElementById('link-text-input');
    if (!urlInput || !urlInput.value.trim()) { showToast(getTrans('text_enter_url') !== 'text_enter_url' ? getTrans('text_enter_url') : 'Enter a URL'); return; }
    var url = urlInput.value.trim(); if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    var text = (textInput && textInput.value.trim()) ? textInput.value.trim() : url;
    var html = '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(text) + '</a>';
    var sel = window.getSelection();
    if (sel && !sel.isCollapsed) document.execCommand('createLink', false, url);
    else document.execCommand('insertHTML', false, html);
    urlInput.value = ''; if (textInput) textInput.value = '';
    var dlg = document.getElementById('link-dialog-overlay');
    if (dlg) dlg.style.display = 'none';
    saveCurrentTabContent();
  }

  // ===== IMAGE DIALOG =====
  function toggleImageDialog() {
    var dlg = document.getElementById('image-dialog-overlay');
    if (dlg) dlg.style.display = (dlg.style.display === 'flex') ? 'none' : 'flex';
  }

  function insertImageFromUpload() {
    var input = document.getElementById('image-file-input');
    if (!input) return;
    input.onchange = function(e) {
      var file = e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var html = '<img src="' + ev.target.result + '" class="editor-image" alt="' + escapeHtml(file.name) + '">';
        document.execCommand('insertHTML', false, html);
        saveCurrentTabContent();
      };
      reader.readAsDataURL(file);
      input.value = '';
      var dlg = document.getElementById('image-dialog-overlay');
      if (dlg) dlg.style.display = 'none';
    };
    input.click();
  }

  function insertImageFromUrl() {
    var urlInput = document.getElementById('image-url-input');
    if (!urlInput || !urlInput.value.trim()) { showToast(getTrans('text_enter_image_url') !== 'text_enter_image_url' ? getTrans('text_enter_image_url') : 'Enter image URL'); return; }
    var url = urlInput.value.trim();
    var altInput = document.getElementById('image-caption-input');
    var alt = (altInput && altInput.value.trim()) ? altInput.value.trim() : '';
    var html = '<img src="' + escapeHtml(url) + '" class="editor-image" alt="' + escapeHtml(alt) + '">';
    document.execCommand('insertHTML', false, html);
    urlInput.value = ''; if (altInput) altInput.value = '';
    var dlg = document.getElementById('image-dialog-overlay');
    if (dlg) dlg.style.display = 'none';
    saveCurrentTabContent();
  }

  // ===== TABLE DIALOG =====
  function toggleTableDialog() {
    var dlg = document.getElementById('table-dialog-overlay');
    if (dlg) dlg.style.display = (dlg.style.display === 'flex') ? 'none' : 'flex';
  }

  function createTable() {
    var rowsInput = document.getElementById('table-rows-select');
    var colsInput = document.getElementById('table-cols-select');
    var rows = rowsInput ? parseInt(rowsInput.value, 10) || 3 : 3;
    var cols = colsInput ? parseInt(colsInput.value, 10) || 3 : 3;
    var html = '<table class="custom-table"><thead><tr>';
    for (var c = 0; c < cols; c++) html += '<th>Header ' + (c + 1) + '</th>';
    html += '</tr></thead><tbody>';
    for (var r = 0; r < rows - 1; r++) { html += '<tr>'; for (var c2 = 0; c2 < cols; c2++) html += '<td>&nbsp;</td>'; html += '</tr>'; }
    html += '</tbody></table><p><br></p>';
    document.execCommand('insertHTML', false, html);
    var dlg = document.getElementById('table-dialog-overlay');
    if (dlg) dlg.style.display = 'none';
    saveCurrentTabContent();
  }

  // ===== PAGE BREAK =====
  function insertPageBreak() {
    var html = '<div class="page-break-marker" contenteditable="false"></div><p><br></p>';
    document.execCommand('insertHTML', false, html);
    saveCurrentTabContent();
  }

  // ===== LOREM IPSUM =====
  function insertLoremIpsum() {
    var lorem = '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p><p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>';
    document.execCommand('insertHTML', false, lorem);
    saveCurrentTabContent();
  }

  // ===== CLEAR CONTENT =====
  function clearContent() {
    if (!richEditor) return;
    if (confirm(getTrans('text_confirm_clear') !== 'text_confirm_clear' ? getTrans('text_confirm_clear') : 'Clear all content?')) {
      richEditor.innerHTML = '<p><br></p>';
      saveCurrentTabContent(); richEditor.focus();
      showToast(getTrans('text_cleared') !== 'text_cleared' ? getTrans('text_cleared') : 'Content cleared');
    }
  }

  // ===== TEMPLATES DIALOG =====
  function toggleTemplatesDialog() {
    var dlg = document.getElementById('templates-dialog-overlay');
    if (!dlg) return;
    dlg.style.display = (dlg.style.display === 'flex') ? 'none' : 'flex';
    if (dlg.style.display === 'flex') renderTemplates();
  }

  function renderTemplates() {
    var list = document.getElementById('templates-grid');
    if (!list) return;
    var all = getAllTemplates();
    var html = '';
    for (var i = 0; i < all.length; i++) {
      var t = all[i];
      var isCustom = !!t.custom;
      var titleTranslated = (getTrans('tpl_' + t.id) !== ('tpl_' + t.id) ? getTrans('tpl_' + t.id) : t.title);
      var descTranslated = (getTrans('desc_' + t.id) !== ('desc_' + t.id) ? getTrans('desc_' + t.id) : t.desc);
      html += '<div class="template-card' + (isCustom ? ' custom-template' : '') + '" data-template-id="' + t.id + '">' +
        '<i class="fa ' + t.icon + '"></i>' +
        '<h4>' + escapeHtml(titleTranslated) + '</h4>' +
        '<p>' + escapeHtml(descTranslated) + '</p>';
      if (isCustom) {
        html += '<div class="custom-template-actions">' +
          '<button class="btn-delete-template" data-template-id="' + t.id + '" title="Delete"><i class="fa fa-trash-o"></i></button>' +
          '</div>';
      }
      html += '</div>';
    }
    list.innerHTML = html;

    var cards = list.querySelectorAll('.template-card');
    for (var j = 0; j < cards.length; j++) {
      (function(card) {
        var tplId = card.getAttribute('data-template-id');
        card.addEventListener('click', function(e) {
          if (e.target.closest('.btn-delete-template')) return;
          var allTpls = getAllTemplates();
          for (var k = 0; k < allTpls.length; k++) {
            if (allTpls[k].id === tplId) { applyTemplate(allTpls[k].content); break; }
          }
        });
      })(cards[j]);
    }

    var delBtns = list.querySelectorAll('.btn-delete-template');
    for (var d = 0; d < delBtns.length; d++) {
      (function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          deleteCustomTemplate(btn.getAttribute('data-template-id'));
        });
      })(delBtns[d]);
    }
  }

  function applyTemplate(content) {
    if (!richEditor) return;
    if (confirm(getTrans('text_replace_content') !== 'text_replace_content' ? getTrans('text_replace_content') : 'Replace current content with template?')) {
      richEditor.innerHTML = content;
      saveCurrentTabContent(); updateStats();
      var dlg = document.getElementById('templates-dialog-overlay');
      if (dlg) dlg.style.display = 'none';
      showToast(getTrans('text_template_applied') !== 'text_template_applied' ? getTrans('text_template_applied') : 'Template applied');
    }
  }

  // ===== SPECIAL CHARS DIALOG =====
  function toggleSpecialCharsDialog() {
    var dlg = document.getElementById('special-chars-dialog-overlay');
    if (!dlg) return;
    dlg.style.display = (dlg.style.display === 'flex') ? 'none' : 'flex';
    if (dlg.style.display === 'flex') renderSpecialChars('greek');
  }

  function renderSpecialChars(category) {
    var list = document.getElementById('special-chars-grid');
    if (!list) return;
    var tabs = document.querySelectorAll('.sc-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-cat') === category);
    }
    var chars = SPECIAL_CHARS[category] || [];
    var html = '';
    for (var j = 0; j < chars.length; j++) {
      html += '<div class="sc-char" data-char="' + escapeHtml(chars[j]) + '">' + chars[j] + '</div>';
    }
    list.innerHTML = html;
    var charDivs = list.querySelectorAll('.sc-char');
    for (var k = 0; k < charDivs.length; k++) {
      (function(charDiv) {
        charDiv.addEventListener('click', function() {
          var ch = charDiv.getAttribute('data-char');
          document.execCommand('insertText', false, ch);
          saveCurrentTabContent();
        });
      })(charDivs[k]);
    }
  }

  // ===== HELP DIALOG =====
  function toggleHelpDialog() {
    var dlg = document.getElementById('help-dialog-overlay');
    if (dlg) dlg.style.display = (dlg.style.display === 'flex') ? 'none' : 'flex';
  }

  // ===== SETTINGS MODAL =====
  function toggleSettingsModal() {
    var modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.toggle('visible');
    if (modal.classList.contains('visible')) loadSettingsValues();
  }

  // ===== OPEN FILE =====
      // ===== OPEN FILE =====
  function openFile(file) {
    if (!file) return;
    var ext = file.name.split('.').pop().toLowerCase();

    // Binary ZIP-based formats — use JSZip
    if (ext === 'docx' || ext === 'odt') {
      openDocxOdt(file, ext);
      return;
    }

    // Text-based formats
    var reader = new FileReader();
    reader.onload = function(e) {
      var content = e.target.result;
      if (ext === 'html') {
        richEditor.innerHTML = content;
      } else if (ext === 'rtf') {
        richEditor.innerHTML = rtfToHtml(content);
      } else if (ext === 'md' || ext === 'txt') {
        var html = content.split(/\n\n+/).map(function(p) {
          return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
        }).join('');
        richEditor.innerHTML = html;
      } else {
        richEditor.innerHTML = '<pre>' + escapeHtml(content) + '</pre>';
      }
      saveCurrentTabContent();
      updateStats();
      showToast(getTrans('text_file_opened') !== 'text_file_opened' ? getTrans('text_file_opened') : 'File opened');
    };
    reader.readAsText(file);
  }

    // ===== OPEN DOCX / ODT =====
  function openDocxOdt(file, ext) {
    // DOCX — use Mammoth.js (already loaded)
    if (ext === 'docx' && typeof mammoth !== 'undefined') {
      var reader = new FileReader();
      reader.onload = function(e) {
        mammoth.convertToHtml({ arrayBuffer: e.target.result })
          .then(function(result) {
            richEditor.innerHTML = result.value || '<p><br></p>';
            saveCurrentTabContent();
            updateStats();
            showToast(getTrans('text_file_opened') !== 'text_file_opened' ? getTrans('text_file_opened') : 'DOCX file opened');
          })
          .catch(function(err) {
            console.error('Mammoth DOCX import failed:', err);
            showToast('DOCX import failed: ' + (err.message || 'unknown error'));
          });
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // ODT — use JSZip
    if (typeof JSZip === 'undefined') {
      showToast(ext.toUpperCase() + ' import requires JSZip library');
      return;
    }

    var reader2 = new FileReader();
    reader2.onload = function(e) {
      JSZip.loadAsync(e.target.result).then(function(zip) {
        var xmlPath = 'content.xml';
        return zip.file(xmlPath).async('string');
      }).then(function(xmlText) {
        var html = odtXmlToHtml(xmlText);
        richEditor.innerHTML = html;
        saveCurrentTabContent();
        updateStats();
        showToast(getTrans('text_file_opened') !== 'text_file_opened' ? getTrans('text_file_opened') : 'ODT file opened');
      }).catch(function(err) {
        console.error('ODT import failed:', err);
        showToast('ODT import failed: ' + (err.message || 'unknown error'));
      });
    };
    reader2.readAsArrayBuffer(file);
  }

  // ===== DOCX XML TO HTML =====
  function docxXmlToHtml(xml) {
    if (!xml) return '<p><br></p>';
    var parser = new DOMParser();
    var doc = parser.parseFromString(xml, 'text/xml');
    var body = doc.getElementsByTagName('w:body')[0] || doc.getElementsByTagName('body')[0];
    if (!body) return '<p><br></p>';

    var html = '';
    var paragraphs = body.getElementsByTagName('w:p');

    for (var i = 0; i < paragraphs.length; i++) {
      var p = paragraphs[i];
      if (isDirectChild(p, body)) {
        html += docxParagraphToHtml(p);
      }
    }

    if (!html.trim()) html = '<p><br></p>';
    return html;
  }

  function isDirectChild(node, parent) {
    var p = node.parentNode;
    while (p) {
      if (p === parent) return true;
      if (p.tagName && (p.tagName.toLowerCase().indexOf('w:') === 0 || p.tagName.toLowerCase().indexOf('p:') === 0)) {
        // Still within the namespace, keep checking
      }
      p = p.parentNode;
    }
    return false;
  }

  function docxParagraphToHtml(pNode) {
    var html = '';
    var styleAttr = '';

    // Check paragraph alignment
    var pPr = pNode.getElementsByTagName('w:pPr')[0];
    if (pPr) {
      var jc = pPr.getElementsByTagName('w:jc')[0];
      if (jc) {
        var align = jc.getAttribute('w:val');
        if (align === 'center') styleAttr = ' style="text-align:center;"';
        else if (align === 'right') styleAttr = ' style="text-align:right;"';
        else if (align === 'both') styleAttr = ' style="text-align:justify;"';
      }

      // Check for heading style
      var pStyle = pPr.getElementsByTagName('w:pStyle')[0];
      if (pStyle) {
        var styleVal = pStyle.getAttribute('w:val') || '';
        if (/^[Hh]eading|^[Tt]itle|^Title/i.test(styleVal)) {
          var match = styleVal.match(/\d/);
          var level = match ? parseInt(match[0], 10) : 1;
          level = Math.min(Math.max(level, 1), 6);
          var runs = docxRunsToHtml(pNode);
          return '<h' + level + styleAttr + '>' + runs + '</h' + level + '>';
        }
      }
    }

    var runs = docxRunsToHtml(pNode);
    return '<p' + styleAttr + '>' + runs + '</p>';
  }

  function docxRunsToHtml(pNode) {
    var html = '';
    var runs = pNode.getElementsByTagName('w:r');

    for (var r = 0; r < runs.length; r++) {
      if (!isDirectChild(runs[r], pNode)) continue;

      var run = runs[r];
      var rPr = run.getElementsByTagName('w:rPr')[0];
      var isBold = false, isItalic = false, isUnderline = false, isStrike = false;
      var isSuper = false, isSub = false;

      if (rPr) {
        if (rPr.getElementsByTagName('w:b').length > 0) {
          var bEl = rPr.getElementsByTagName('w:b')[0];
          if (bEl.getAttribute('w:val') !== '0' && bEl.getAttribute('w:val') !== 'false') isBold = true;
        }
        if (rPr.getElementsByTagName('w:i').length > 0) {
          var iEl = rPr.getElementsByTagName('w:i')[0];
          if (iEl.getAttribute('w:val') !== '0' && iEl.getAttribute('w:val') !== 'false') isItalic = true;
        }
        if (rPr.getElementsByTagName('w:u').length > 0) isUnderline = true;
        if (rPr.getElementsByTagName('w:strike').length > 0) isStrike = true;
        if (rPr.getElementsByTagName('w:vertAlign').length > 0) {
          var va = rPr.getElementsByTagName('w:vertAlign')[0];
          var vaVal = va.getAttribute('w:val');
          if (vaVal === 'superscript') isSuper = true;
          else if (vaVal === 'subscript') isSub = true;
        }
      }

      // Collect text from w:t elements
      var textEls = run.getElementsByTagName('w:t');
      var text = '';
      for (var t = 0; t < textEls.length; t++) {
        if (isDirectChild(textEls[t], run)) text += textEls[t].textContent;
      }

      // Check for breaks
      var breaks = run.getElementsByTagName('w:br');
      var hasBreak = breaks.length > 0;

      // Also check for tabs
      var tabs = run.getElementsByTagName('w:tab');
      if (tabs.length > 0) text = '\u00A0\u00A0\u00A0\u00A0' + text;

      if (!text && !hasBreak) continue;

      var prefix = '';
      var suffix = '';
      if (isBold) { prefix += '<b>'; suffix = '</b>' + suffix; }
      if (isItalic) { prefix += '<i>'; suffix = '</i>' + suffix; }
      if (isUnderline) { prefix += '<u>'; suffix = '</u>' + suffix; }
      if (isStrike) { prefix += '<s>'; suffix = '</s>' + suffix; }
      if (isSuper) { prefix += '<sup>'; suffix = '</sup>' + suffix; }
      if (isSub) { prefix += '<sub>'; suffix = '</sub>' + suffix; }

      html += prefix + escapeHtml(text) + suffix;

      if (hasBreak) html += '<br>';
    }

    // Check for hyperlinks
    var hyperlinks = pNode.getElementsByTagName('w:hyperlink');
    for (var h = 0; h < hyperlinks.length; h++) {
      if (!isDirectChild(hyperlinks[h], pNode)) continue;
      var anchor = hyperlinks[h].getAttribute('w:anchor') || '';
      var rid = hyperlinks[h].getAttribute('r:id') || '';
      var linkText = '';
      var hlRuns = hyperlinks[h].getElementsByTagName('w:r');
      for (var hr = 0; hr < hlRuns.length; hr++) {
        var htEls = hlRuns[hr].getElementsByTagName('w:t');
        for (var ht = 0; ht < htEls.length; ht++) linkText += htEls[ht].textContent;
      }
      if (linkText) {
        if (anchor) html += '<a href="#' + escapeHtml(anchor) + '">' + escapeHtml(linkText) + '</a>';
        else html += '<a href="#" rel="noopener">' + escapeHtml(linkText) + '</a>';
      }
    }

    return html || '';
  }

  // ===== ODT XML TO HTML =====
  function odtXmlToHtml(xml) {
    if (!xml) return '<p><br></p>';
    var parser = new DOMParser();
    var doc = parser.parseFromString(xml, 'text/xml');

    // ODT uses office:text as the body container
    var body = doc.getElementsByTagName('office:text')[0];
    if (!body) {
      // Fallback: try without namespace
      body = doc.getElementsByTagName('text')[0];
    }
    if (!body) return '<p><br></p>';

    var html = '';
    var children = body.childNodes;

    for (var i = 0; i < children.length; i++) {
      var node = children[i];
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      var tag = node.tagName.toLowerCase();
      // Remove namespace prefix if present
      var localName = tag.split(':').pop();

      switch (localName) {
        case 'p':
          html += odtParagraphToHtml(node, 'p');
          break;
        case 'h':
          var level = node.getAttribute('text:outline-level') || '1';
          level = Math.min(Math.max(parseInt(level, 10) || 1, 1), 6);
          html += odtParagraphToHtml(node, 'h' + level);
          break;
        case 'list':
        case 'unordered-list':
          html += odtListToHtml(node, 'ul');
          break;
        case 'ordered-list':
          html += odtListToHtml(node, 'ol');
          break;
        case 'list-item':
          // Standalone list-item — wrap in ul
          html += '<ul><li>' + odtNodeTextToHtml(node) + '</li></ul>';
          break;
        case 'soft-page-break':
        case 'page-break':
          html += '<div class="page-break-marker" contenteditable="false"></div>';
          break;
        case 'section':
          html += odtNodeTextToHtml(node);
          break;
        default:
          // Try to extract text content
          var text = node.textContent;
          if (text && text.trim()) html += '<p>' + escapeHtml(text.trim()) + '</p>';
          break;
      }
    }

    if (!html.trim()) html = '<p><br></p>';
    return html;
  }

  function odtParagraphToHtml(node, tag) {
    var styleAttr = '';
    var styleName = node.getAttribute('text:style-name') || '';

    if (/center/i.test(styleName)) styleAttr = ' style="text-align:center;"';
    else if (/right/i.test(styleName)) styleAttr = ' style="text-align:right;"';
    else if (/justif/i.test(styleName)) styleAttr = ' style="text-align:justify;"';

    var content = odtNodeTextToHtml(node);
    return '<' + tag + styleAttr + '>' + content + '</' + tag + '>';
  }

  function odtListToHtml(listNode, listTag) {
    var html = '<' + listTag + '>';
    var items = listNode.childNodes;
    for (var i = 0; i < items.length; i++) {
      var node = items[i];
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      var localName = node.tagName.toLowerCase().split(':').pop();
      if (localName === 'list-item' || localName === 'list-header') {
        // Get content — could be paragraphs or nested lists
        var itemContent = '';
        var itemChildren = node.childNodes;
        for (var j = 0; j < itemChildren.length; j++) {
          var child = itemChildren[j];
          if (child.nodeType !== Node.ELEMENT_NODE) continue;
          var childName = child.tagName.toLowerCase().split(':').pop();
          if (childName === 'p') {
            itemContent += odtNodeTextToHtml(child);
          } else if (childName === 'list' || childName === 'unordered-list') {
            itemContent += odtListToHtml(child, 'ul');
          } else if (childName === 'ordered-list') {
            itemContent += odtListToHtml(child, 'ol');
          }
        }
        if (!itemContent) itemContent = '&nbsp;';
        html += '<li>' + itemContent + '</li>';
      }
    }
    html += '</' + listTag + '>';
    return html;
  }

  function odtNodeTextToHtml(node) {
    var html = '';
    var children = node.childNodes;

    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.nodeType === Node.TEXT_NODE) {
        html += escapeHtml(child.textContent);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        var localName = child.tagName.toLowerCase().split(':').pop();
        switch (localName) {
          case 'span':
            // Check for formatting from style
            var spanText = odtNodeTextToHtml(child);
            var styleName = child.getAttribute('text:style-name') || '';
            if (/bold/i.test(styleName)) spanText = '<b>' + spanText + '</b>';
            if (/italic/i.test(styleName)) spanText = '<i>' + spanText + '</i>';
            if (/under/i.test(styleName)) spanText = '<u>' + spanText + '</u>';
            html += spanText;
            break;
          case 'tab':
            html += '\u00A0\u00A0\u00A0\u00A0';
            break;
          case 'line-break':
            html += '<br>';
            break;
          case 's':
            // Spaces
            var count = parseInt(child.getAttribute('text:c') || '1', 10);
            for (var s = 0; s < count; s++) html += '&nbsp;';
            break;
          case 'a':
            var href = child.getAttribute('xlink:href') || '#';
            html += '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener">' + odtNodeTextToHtml(child) + '</a>';
            break;
          default:
            html += odtNodeTextToHtml(child);
            break;
        }
      }
    }

    return html;
  }

  // ===== EXPORT FUNCTIONS =====
  function exportTxt() { var text = richEditor.innerText; downloadBlob(text, 'document.txt', 'text/plain'); }

  function exportMarkdown() { if (!richEditor) return; var md = htmlToMarkdown(richEditor); downloadBlob(md, 'document.md', 'text/markdown'); }

  function exportRtf() {
    if (!richEditor) return;
    var rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Nunito;}}'; rtf += '\\f0\\fs24 ';
    var html = richEditor.innerHTML;
    var temp = document.createElement('div'); temp.innerHTML = html;
    rtf += textToRtf(temp.innerText); rtf += '}}';
    downloadBlob(rtf, 'document.rtf', 'application/rtf');
  }

  function textToRtf(text) {
    return text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\par\n');
  }

  function exportDocx() {
    if (!richEditor) return;
    if (typeof JSZip === 'undefined') { showToast('JSZip library not loaded'); return; }
    try {
      var zip = new JSZip();
      var content = richEditor.innerHTML;
      var text = richEditor.innerText;
      var meta = tabsModule.getMetadata();
      var docXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body>';
      var temp = document.createElement('div');
      temp.innerHTML = content;
      var blocks = temp.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
      if (blocks.length === 0) {
        docXml += '<w:p><w:r><w:t xml:space="preserve">' + escapeHtml(text) + '</w:t></w:r></w:p>';
      } else {
        for (var i = 0; i < blocks.length; i++) {
          var tag = blocks[i].tagName.toLowerCase();
          var sz = '24';
          if (tag === 'h1') sz = '48';
          else if (tag === 'h2') sz = '36';
          else if (tag === 'h3') sz = '30';
          else if (tag === 'h4') sz = '26';
          var blockText = blocks[i].textContent;
          docXml += '<w:p><w:pPr><w:rPr><w:sz w:val="' + sz + '"/></w:rPr></w:pPr>' +
            '<w:r><w:rPr><w:sz w:val="' + sz + '"/></w:rPr><w:t xml:space="preserve">' + escapeHtml(blockText) + '</w:t></w:r></w:p>';
        }
      }
      if (meta.title || meta.author || meta.tags) {
        docXml = docXml.replace('<w:body>',
          '<w:body>' +
          (meta.title ? '<w:p><w:pPr><w:rPr><w:i/></w:rPr></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="20"/><w:color w:val="666666"/></w:rPr><w:t xml:space="preserve">Title: ' + escapeHtml(meta.title) + '</w:t></w:r></w:p>' : '') +
          (meta.author ? '<w:p><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="666666"/></w:rPr><w:t xml:space="preserve">Author: ' + escapeHtml(meta.author) + '</w:t></w:r></w:p>' : '') +
          (meta.tags ? '<w:p><w:r><w:rPr><w:sz w:val="20"/><w:color w:val="666666"/></w:rPr><w:t xml:space="preserve">Tags: ' + escapeHtml(meta.tags) + '</w:t></w:r></w:p>' : '')
        );
      }
      docXml += '</w:body></w:document>';
      zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>');
      zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>');
      zip.file('word/document.xml', docXml);
      zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
        .then(function(blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a'); a.href = url; a.download = (meta.title || 'document') + '.docx';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
    } catch(e) { console.error('DOCX export failed:', e); showToast('DOCX export failed'); }
  }

  function exportPdf() {
    if (!richEditor) return;
    window.print();
  }

  function exportEpub() {
    if (!richEditor) return;
    if (typeof JSZip === 'undefined') { showToast('JSZip library not loaded'); return; }
    try {
      var zip = new JSZip();
      var content = richEditor.innerHTML;
      var meta = tabsModule.getMetadata();
      var title = meta.title || 'Untitled';
      var author = meta.author || 'Unknown';
      var text = richEditor.innerText;

      zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
      zip.folder('META-INF').file('container.xml',
        '<?xml version="1.0"?>' +
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
        '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>' +
        '</container>');

      zip.folder('OEBPS').file('content.opf',
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">' +
        '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
        '<dc:title>' + escapeHtml(title) + '</dc:title>' +
        '<dc:creator>' + escapeHtml(author) + '</dc:creator>' +
        '<dc:identifier id="BookId" opf:scheme="UUID">orOS-' + Date.now() + '</dc:identifier>' +
        '<dc:language>en</dc:language>' +
        (meta.category ? '<dc:subject>' + escapeHtml(meta.category) + '</dc:subject>' : '') +
        '</metadata>' +
        '<manifest>' +
        '<item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>' +
        '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>' +
        '</manifest>' +
        '<spine toc="ncx"><itemref idref="chapter1"/></spine>' +
        '</package>');

      zip.folder('OEBPS').file('chapter1.xhtml',
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<!DOCTYPE html>' +
        '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>' + escapeHtml(title) + '</title></head>' +
        '<body>' + content + '</body></html>');

      zip.folder('OEBPS').file('toc.ncx',
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">' +
        '<head><meta name="dtb:uid" content="orOS-' + Date.now() + '"/></head>' +
        '<docTitle><text>' + escapeHtml(title) + '</text></docTitle>' +
        '<navMap><navPoint id="np1" playOrder="1"><navLabel><text>' + escapeHtml(title) + '</text></navLabel>' +
        '<content src="chapter1.xhtml"/></navPoint></navMap></ncx>');

      zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
        .then(function(blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a'); a.href = url; a.download = title + '.epub';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
    } catch(e) { console.error('EPUB export failed:', e); showToast('EPUB export failed'); }
  }

  function htmlToMarkdown(element) {
    var md = '';
    for (var i = 0; i < element.childNodes.length; i++) {
      var node = element.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE) md += node.textContent;
      else if (node.nodeType === Node.ELEMENT_NODE) {
        var tag = node.tagName.toLowerCase(); var inner = htmlToMarkdown(node);
        switch(tag) {
          case 'h1': md += '# ' + inner + '\n\n'; break;
          case 'h2': md += '## ' + inner + '\n\n'; break;
          case 'h3': md += '### ' + inner + '\n\n'; break;
          case 'h4': md += '#### ' + inner + '\n\n'; break;
          case 'p': md += inner + '\n\n'; break;
          case 'strong': case 'b': md += '**' + inner + '**'; break;
          case 'em': case 'i': md += '*' + inner + '*'; break;
          case 'u': md += '__' + inner + '__'; break;
          case 'code': md += '`' + inner + '`'; break;
          case 'pre': md += '```\n' + inner + '\n```\n\n'; break;
          case 'blockquote': md += '> ' + inner + '\n\n'; break;
          case 'a': md += '[' + inner + '](' + node.getAttribute('href') + ')'; break;
          case 'img': md += '![' + (node.alt || '') + '](' + node.src + ')'; break;
          case 'hr': md += '---\n\n'; break;
          case 'br': md += '\n'; break;
          case 'li': md += '- ' + inner + '\n'; break;
          case 'ul': case 'ol': md += inner + '\n'; break;
          default: md += inner;
        }
      }
    }
    return md;
  }

  function downloadBlob(content, filename, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExport(format) {
    switch(format) {
      case 'txt': exportTxt(); break;
      case 'md': exportMarkdown(); break;
      case 'rtf': exportRtf(); break;
      case 'docx': exportDocx(); break;
      case 'epub': exportEpub(); break;
      case 'pdf': exportPdf(); break;
      case 'print': window.print(); break;
      default: showToast('Unknown format: ' + format);
    }
  }

  // ===== PANEL TOGGLES =====
  function setupPanelToggles() {
    bindClick('btn-comments', toggleCommentsPanel);
    bindClick('btn-toc', toggleToCPanel);
    bindClick('btn-outline', toggleOutline);
    bindClick('btn-wordfreq', toggleWordFreqPanel);
    bindClick('btn-metadata', toggleMetadataPanel);
    bindClick('btn-version-history', toggleVersionPanel);

    bindClick('btn-close-metadata', function() { if (metadataPanel) metadataPanel.style.display = 'none'; });
    bindClick('btn-close-outline', function() { if (outlinePanel) outlinePanel.style.display = 'none'; });
    bindClick('btn-close-comments', function() { if (commentsPanel) commentsPanel.style.display = 'none'; });
    bindClick('btn-close-toc', function() { if (tocPanel) tocPanel.style.display = 'none'; });
    bindClick('btn-close-wordfreq', function() { if (wordFreqPanel) wordFreqPanel.style.display = 'none'; });
    bindClick('btn-close-version', function() { if (versionPanel) versionPanel.style.display = 'none'; });

    var metaFields = ['meta-title', 'meta-author', 'meta-tags', 'meta-category'];
    for (var i = 0; i < metaFields.length; i++) {
      var el = document.getElementById(metaFields[i]);
      if (el) { el.addEventListener('change', saveMetadataFromFields); el.addEventListener('blur', saveMetadataFromFields); }
    }
    var pageFields = ['page-size-select', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'header-text', 'footer-text', 'footer-page-num'];
    for (var p = 0; p < pageFields.length; p++) {
      var pel = document.getElementById(pageFields[p]);
      if (pel) { pel.addEventListener('change', savePageSettings); pel.addEventListener('blur', savePageSettings); }
    }
  }

  // ===== DIALOG HANDLERS =====
  function setupDialogHandlers() {
    bindClick('btn-close-link-dialog', function() { var d = document.getElementById('link-dialog-overlay'); if (d) d.style.display = 'none'; });
    bindClick('btn-ok-link', insertOrUpdateLink);
    bindClick('btn-cancel-link', function() { var d = document.getElementById('link-dialog-overlay'); if (d) d.style.display = 'none'; });
    bindClick('btn-link', toggleLinkDialog);

    bindClick('btn-close-table-dialog', function() { var d = document.getElementById('table-dialog-overlay'); if (d) d.style.display = 'none'; });
    bindClick('btn-create-table', createTable);
    bindClick('btn-cancel-table', function() { var d = document.getElementById('table-dialog-overlay'); if (d) d.style.display = 'none'; });
    bindClick('btn-table', toggleTableDialog);

    bindClick('btn-close-image-dialog', function() { var d = document.getElementById('image-dialog-overlay'); if (d) d.style.display = 'none'; });
    bindClick('btn-image-confirm', function() {
      var sourceType = document.getElementById('image-source-type');
      if (sourceType && sourceType.value === 'upload') insertImageFromUpload();
      else insertImageFromUrl();
    });
    bindClick('btn-cancel-image', function() { var d = document.getElementById('image-dialog-overlay'); if (d) d.style.display = 'none'; });
    bindClick('btn-image', toggleImageDialog);

    var imgSrcSelect = document.getElementById('image-source-type');
    if (imgSrcSelect) {
      imgSrcSelect.addEventListener('change', function() {
        var uploadField = document.getElementById('image-upload-field');
        var urlField = document.getElementById('image-url-field');
        if (this.value === 'upload') {
          if (uploadField) uploadField.style.display = '';
          if (urlField) urlField.style.display = 'none';
        } else {
          if (uploadField) uploadField.style.display = 'none';
          if (urlField) urlField.style.display = '';
        }
      });
    }

    bindClick('btn-close-templates', function() { var d = document.getElementById('templates-dialog-overlay'); if (d) d.style.display = 'none'; });
    bindClick('btn-cancel-templates', function() { var d = document.getElementById('templates-dialog-overlay'); if (d) d.style.display = 'none'; });
    bindClick('btn-templates', toggleTemplatesDialog);

    bindClick('btn-save-as-template', saveCurrentAsTemplate);
    bindClick('btn-export-templates', exportTemplatesJson);
    var importInput = document.getElementById('templates-import-input');
    if (importInput) {
      importInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) importTemplatesJson(e.target.files[0]);
      });
    }
    var importBtn = document.getElementById('btn-import-templates');
    if (importBtn) {
      importBtn.addEventListener('click', function() {
        if (importInput) importInput.click();
      });
    }

    bindClick('btn-close-special-chars', function() { var d = document.getElementById('special-chars-dialog-overlay'); if (d) d.style.display = 'none'; });
    bindClick('btn-close-special-chars-ok', function() { var d = document.getElementById('special-chars-dialog-overlay'); if (d) d.style.display = 'none'; });
    bindClick('btn-special-chars', toggleSpecialCharsDialog);

    bindClick('btn-close-footnote-dialog', function() { var d = document.getElementById('footnote-dialog-overlay'); if (d) d.style.display = 'none'; });
    bindClick('btn-insert-footnote', insertFootnote);
    bindClick('btn-cancel-footnote', function() { var d = document.getElementById('footnote-dialog-overlay'); if (d) d.style.display = 'none'; });
    bindClick('btn-footnote', toggleFootnoteDialog);

    bindClick('btn-close-help', function() { var d = document.getElementById('help-dialog-overlay'); if (d) d.style.display = 'none'; });
    bindClick('btn-close-help-ok', function() { var d = document.getElementById('help-dialog-overlay'); if (d) d.style.display = 'none'; });
    bindClick('btn-help', toggleHelpDialog);

    bindClick('btn-close-footnotes', function() { if (footnoteArea) footnoteArea.style.display = 'none'; });

    var overlays = document.querySelectorAll('.dialog-overlay');
    for (var i = 0; i < overlays.length; i++) {
      overlays[i].addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });
    }

    bindClick('btn-exit-reading-mode', toggleReadingMode);
  }

    // ===== SETTINGS HANDLERS =====
  function setupSettingsHandlers() {
    bindClick('btn-close-settings', function() { var m = document.getElementById('settings-modal'); if (m) m.classList.remove('visible'); });
    bindClick('btn-close-settings-footer', function() { var m = document.getElementById('settings-modal'); if (m) m.classList.remove('visible'); });
    bindClick('btn-save-settings', function() { saveSettings(); var m = document.getElementById('settings-modal'); if (m) m.classList.remove('visible'); });

    bindClick('btn-add-autocorrect', addAutocorrectRule);
    bindClick('btn-reset-autocorrect', resetAutocorrectRules);
    var acNewTrigger = document.getElementById('ac-new-trigger');
    var acNewReplacement = document.getElementById('ac-new-replacement');
    if (acNewTrigger && acNewReplacement) {
      var acAddOnEnter = function(e) { if (e.key === 'Enter') { e.preventDefault(); addAutocorrectRule(); } };
      acNewTrigger.addEventListener('keydown', acAddOnEnter);
      acNewReplacement.addEventListener('keydown', acAddOnEnter);
    }

    bindClick('btn-export-database', exportFullDatabase);

    var tabBtns = document.querySelectorAll('.settings-nav .tab-btn');
    for (var i = 0; i < tabBtns.length; i++) {
      tabBtns[i].addEventListener('click', function() {
        for (var j = 0; j < tabBtns.length; j++) tabBtns[j].classList.remove('active');
        this.classList.add('active');
        var tabId = this.getAttribute('data-tab');
        var panels = document.querySelectorAll('.tab-panel');
        for (var k = 0; k < panels.length; k++) panels[k].style.display = 'none';
        var panel = document.getElementById(tabId);
        if (panel) panel.style.display = 'flex';
      });
    }

    var installBtn = document.getElementById('btn-install');
    if (installBtn) {
      installBtn.onclick = function() {
        if (beforeInstallPrompt) {
          beforeInstallPrompt.prompt();
          beforeInstallPrompt.userChoice.then(function(choiceResult) {
            if (choiceResult.outcome === 'accepted') showToast(getTrans('text_installed') !== 'text_installed' ? getTrans('text_installed') : 'App installed');
            beforeInstallPrompt = null; installBtn.style.display = 'none';
          });
        }
      };
    }

    bindClick('btn-set-goal', setGoal);
    bindClick('btn-clear-goal', clearGoal);
    bindClick('btn-close-goal', function() { if (goalBar) goalBar.style.display = 'none'; });
    bindClick('btn-goal', toggleGoalBar);

    bindClick('btn-start-session', startSession);
    bindClick('btn-stop-session', stopSession);
    bindClick('btn-close-session', function() { if (sessionBar) sessionBar.style.display = 'none'; });
    bindClick('btn-session', toggleSessionBar);

    bindClick('btn-find-prev', function() { navigateMatch(-1); });
    bindClick('btn-find-next', function() { navigateMatch(1); });
    bindClick('btn-replace', function() { doReplace(false); });
    bindClick('btn-replace-all', function() { doReplace(true); });
    bindClick('btn-close-find', function() { if (findBar) findBar.style.display = 'none'; clearHighlights(); });
    bindClick('btn-find', toggleFindBar);

    bindClick('btn-accept-all-changes', acceptAllChanges);
    bindClick('btn-reject-all-changes', rejectAllChanges);
    bindClick('btn-track-changes-toggle', toggleTrackChanges);
    bindClick('btn-track-changes', toggleTrackChanges);

        // FIX #13: Export dropdown — direct style manipulation (CSS-independent)
    var exportBtn = document.getElementById('btn-export');
    var exportDd = document.getElementById('export-dropdown');
    if (exportBtn && exportDd) {
      exportDd.style.display = 'none';

      exportBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        exportDd.style.display = (exportDd.style.display === 'block') ? 'none' : 'block';
      });

      var exportItems = exportDd.querySelectorAll('[data-format]');
      for (var eb = 0; eb < exportItems.length; eb++) {
        exportItems[eb].addEventListener('click', function(ev) {
          ev.preventDefault();
          var format = this.getAttribute('data-format');
          exportDd.style.display = 'none';
          handleExport(format);
        });
      }

      document.addEventListener('click', function(e) {
        if (!e.target.closest('#export-dropdown') &&
            !e.target.closest('#export-dropdown-container') &&
            !e.target.closest('#btn-export')) {
          exportDd.style.display = 'none';
        }
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && exportDd.style.display === 'block') {
          exportDd.style.display = 'none';
        }
      });
    }

    if (stylesSelect) { stylesSelect.addEventListener('change', function() { applyNamedStyle(this.value); }); }

    bindClick('btn-open', function() { var fi = document.getElementById('file-input-hidden'); if (fi) fi.click(); });
    var fileInput = document.getElementById('file-input-hidden');
    if (fileInput) { fileInput.addEventListener('change', function(e) { if (e.target.files && e.target.files[0]) openFile(e.target.files[0]); }); }

    bindClick('btn-clear', clearContent);

    bindClick('btn-bold', function() { document.execCommand('bold'); saveCurrentTabContent(); setTimeout(updateToolbarStates, 10); });
    bindClick('btn-italic', function() { document.execCommand('italic'); saveCurrentTabContent(); setTimeout(updateToolbarStates, 10); });
    bindClick('btn-underline', function() { document.execCommand('underline'); saveCurrentTabContent(); setTimeout(updateToolbarStates, 10); });
    bindClick('btn-strikethrough', function() { document.execCommand('strikeThrough'); saveCurrentTabContent(); setTimeout(updateToolbarStates, 10); });
    bindClick('btn-subscript', function() { document.execCommand('subscript'); saveCurrentTabContent(); });
    bindClick('btn-superscript', function() { document.execCommand('superscript'); saveCurrentTabContent(); });
    bindClick('btn-bullets', function() { document.execCommand('insertUnorderedList'); saveCurrentTabContent(); updateStats(); });
    bindClick('btn-numbers', function() { document.execCommand('insertOrderedList'); saveCurrentTabContent(); updateStats(); });
    bindClick('btn-align-left', function() { document.execCommand('justifyLeft'); saveCurrentTabContent(); });
    bindClick('btn-align-center', function() { document.execCommand('justifyCenter'); saveCurrentTabContent(); });
    bindClick('btn-align-right', function() { document.execCommand('justifyRight'); saveCurrentTabContent(); });
    bindClick('btn-align-justify', function() { document.execCommand('justifyFull'); saveCurrentTabContent(); });
    bindClick('btn-indent', function() { document.execCommand('indent'); saveCurrentTabContent(); });
    bindClick('btn-outdent', function() { document.execCommand('outdent'); saveCurrentTabContent(); });
    bindClick('btn-hr', function() { document.execCommand('insertHorizontalRule'); saveCurrentTabContent(); });
    bindClick('btn-page-break', insertPageBreak);
    bindClick('btn-lorem', insertLoremIpsum);
    bindClick('btn-reading-mode', toggleReadingMode);
    bindClick('btn-add-comment', addComment);
    bindClick('btn-toc-refresh', updateToC);
    bindClick('btn-toc-insert', insertToCIntoDocument);
    bindClick('btn-add-version', addVersionSnapshot);

    if (findInput) {
      findInput.addEventListener('input', function() { clearTimeout(typingTimer); typingTimer = setTimeout(performFind, 300); });
      findInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); navigateMatch(e.shiftKey ? -1 : 1); } });
    }

    if (replaceInput) {
      replaceInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); doReplace(e.shiftKey); } });
    }

    window.addEventListener('resize', function() {
      clearTimeout(windowResizeDebounce);
      windowResizeDebounce = setTimeout(function() { clampToViewport(); updateReadingProgress(); }, 150);
    });

    // FIX: PWA — preventDefault then store event for later prompt()
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      beforeInstallPrompt = e;
      var btn = document.getElementById('btn-install');
      if (btn) { btn.disabled = false; btn.style.display = ''; }
    });

    window.addEventListener('beforeunload', function(e) { if (isTyping) { e.preventDefault(); e.returnValue = ''; } });

    var scTabs = document.querySelectorAll('.sc-tab');
    for (var i2 = 0; i2 < scTabs.length; i2++) {
      (function(tab) { tab.addEventListener('click', function() { renderSpecialChars(this.getAttribute('data-cat')); }); })(scTabs[i2]);
    }
  }

  // ===== FORMAT BUTTONS =====
  function setupFormatButtons() {
    // All formatting buttons are wired in setupSettingsHandlers
  }

  // ===== GET TABS API =====
  function getTabsApi() {
    return {
      getTabs: function() { return tabsModule.getAll(); },
      getActiveId: function() { return tabsModule.getActiveId(); },
      getActiveTab: function() { return tabsModule.getActive(); },
      getActiveContent: function() { return tabsModule.getContent(); },
      saveActiveContent: function(html) { tabsModule.setContent(html); },
      getActiveMetadata: function() { return tabsModule.getMetadata(); },
      saveActiveMetadata: function(meta) { tabsModule.setMetadata(meta); },
      getActiveTimestamp: function() { return tabsModule.getTimestamp(); },
      saveActiveTimestamp: function(ts) { tabsModule.setTimestamp(ts); },
      createTab: function(opts) { return tabsModule.create(opts); },
      closeTab: function(id) { tabsModule.close(id); },
      switchTab: function(id) { tabsModule.switchTo(id); },
      on: function(event, cb) { tabsModule.on(event, cb); },
      deriveTitle: function(html) { return tabsModule.deriveTitle(html); }
    };
  }

  // ===== SETUP TABS UI =====
  function setupTabsUI() {
    tabsModule.init('#tab-bar');
    if (!tabsModule.tabBar) { console.warn('setupTabsUI: #tab-bar not found'); return; }
    if (typeof tabsModule.on === 'function') {
      tabsModule.on('switch', function(tab) {
        if (!richEditor || !tab) return;
        richEditor.innerHTML = tab.content || '<p><br></p>';
        loadPageSettingsFields();
        updateStats(); updateSaveIndicator('saved'); richEditor.focus(); clampToViewport();
      });
    }
    if (tabsModule.getAll().length === 0) tabsModule.create({ content: '<p><br></p>', metadata: {} });
    else {
      var active = tabsModule.getActive();
      if (active && richEditor) {
        richEditor.innerHTML = active.content || '<p><br></p>';
        loadPageSettingsFields();
        updateStats();
      }
    }
  }

  // ===== QUICK FORMAT MENU (Alt + Right-Click) =====
  var quickFormatMenu = null;

  function createQuickFormatMenu(x, y) {
    if (quickFormatMenu) quickFormatMenu.remove();

    var menu = document.createElement('div');
    menu.className = 'quick-format-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    var buttons = [
      { label: 'Bold', icon: 'fa-bold', action: function() { document.execCommand('bold'); } },
      { label: 'Italic', icon: 'fa-italic', action: function() { document.execCommand('italic'); } },
      { label: 'Underline', icon: 'fa-underline', action: function() { document.execCommand('underline'); } },
      { label: 'Strikethrough', icon: 'fa-strikethrough', action: function() { document.execCommand('strikeThrough'); } },
      { label: 'divider', icon: null, action: null },
      { label: 'Heading 1', icon: 'fa-header', action: function() { document.execCommand('formatBlock', false, 'h1'); } },
      { label: 'Heading 2', icon: 'fa-header', action: function() { document.execCommand('formatBlock', false, 'h2'); } },
      { label: 'Heading 3', icon: 'fa-header', action: function() { document.execCommand('formatBlock', false, 'h3'); } },
      { label: 'Paragraph', icon: 'fa-paragraph', action: function() { document.execCommand('formatBlock', false, 'p'); } },
      { label: 'divider', icon: null, action: null },
      { label: 'Quote', icon: 'fa-quote-left', action: function() { document.execCommand('formatBlock', false, 'blockquote'); } },
      { label: 'Code', icon: 'fa-code', action: function() { document.execCommand('formatBlock', false, 'pre'); } },
      { label: 'divider', icon: null, action: null },
      { label: 'Bullets', icon: 'fa-list-ul', action: function() { document.execCommand('insertUnorderedList'); } },
      { label: 'Numbers', icon: 'fa-list-ol', action: function() { document.execCommand('insertOrderedList'); } },
      { label: 'divider', icon: null, action: null },
      { label: 'Align Left', icon: 'fa-align-left', action: function() { document.execCommand('justifyLeft'); } },
      { label: 'Align Center', icon: 'fa-align-center', action: function() { document.execCommand('justifyCenter'); } },
      { label: 'Align Right', icon: 'fa-align-right', action: function() { document.execCommand('justifyRight'); } },
      { label: 'Justify', icon: 'fa-align-justify', action: function() { document.execCommand('justifyFull'); } },
      { label: 'divider', icon: null, action: null },
      { label: 'Text Color', icon: 'fa-font', action: function() { showColorPicker('forecolor'); } },
      { label: 'Highlight', icon: 'fa-pencil', action: function() { showColorPicker('hiliteColor'); } }
    ];

    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (btn.icon === null) {
        var div = document.createElement('div');
        div.className = 'qfm-divider';
        menu.appendChild(div);
      } else {
        var b = document.createElement('button');
        b.className = 'qfm-btn';
        b.innerHTML = '<i class="fa ' + btn.icon + '"></i>';
        b.title = btn.label;
        (function(action) {
          b.addEventListener('click', function() {
            if (action) action();
            saveCurrentTabContent();
            setTimeout(updateToolbarStates, 10);
            if (quickFormatMenu) { quickFormatMenu.remove(); quickFormatMenu = null; }
          });
        })(btn.action);
        menu.appendChild(b);
      }
    }

    document.body.appendChild(menu);
    quickFormatMenu = menu;

    var rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = (window.innerHeight - rect.height - 8) + 'px';
    }

    setTimeout(function() {
      document.addEventListener('mousedown', dismissQuickFormatMenu, true);
    }, 0);
  }

  function dismissQuickFormatMenu() {
    if (quickFormatMenu) { quickFormatMenu.remove(); quickFormatMenu = null; }
    document.removeEventListener('mousedown', dismissQuickFormatMenu, true);
  }

  function showColorPicker(command) {
    var input = document.createElement('input');
    input.type = 'color';
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function() {
      document.execCommand(command, false, input.value);
      saveCurrentTabContent();
      document.body.removeChild(input);
    });
    input.click();
  }

  function setupQuickFormatMenu() {
    if (!richEditor) return;
    richEditor.addEventListener('contextmenu', function(e) {
      if (e.altKey) {
        e.preventDefault();
        createQuickFormatMenu(e.clientX, e.clientY);
      }
    });
  }

  // ===== PRINT =====
  function setupPrint() {
    var mediaQueryList = window.matchMedia('print');
    var handlePrint = function(mql) {
      if (mql.matches) {
        var printContainer = document.getElementById('print-area');
        if (printContainer && richEditor) {
          printContainer.innerHTML = richEditor.innerHTML;
          var meta = tabsModule.getMetadata();
          var pageSize = meta.pageSize || 'a4';
          printContainer.setAttribute('data-page-size', pageSize);
        }
      } else {
        var pc = document.getElementById('print-area');
        if (pc) pc.innerHTML = '';
      }
    };
    if (mediaQueryList.addEventListener) mediaQueryList.addEventListener('change', handlePrint);
    else mediaQueryList.addListener(handlePrint);
    handlePrint(mediaQueryList);
  }

  // ===== WINDOW CLOSE WARNING =====
  function setupCloseWarning() {
    window.addEventListener('beforeunload', function(e) {
      if (isTyping) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
  }

  // ===== PWA INSTALL =====
  function setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      beforeInstallPrompt = e;
      var btn = document.getElementById('btn-install');
      if (btn) { btn.disabled = false; btn.style.display = ''; }
    });

    window.addEventListener('appinstalled', function() {
      beforeInstallPrompt = null;
      var btn = document.getElementById('btn-install');
      if (btn) { btn.style.display = 'none'; }
      showToast(getTrans('text_installed') !== 'text_installed' ? getTrans('text_installed') : 'App installed');
    });
  }

  // ===== INITIALIZATION =====
  function init() {
    if (initialized) return;

    richEditor = document.getElementById('rich-editor');
    richWrapper = document.getElementById('rich-wrapper');
    tabBar = document.getElementById('tab-bar');
    saveIndicator = document.getElementById('save-indicator');
    statsOverlay = document.getElementById('stats-overlay');
    statsDefaultEl = document.getElementById('stats-default');
    statsGoalEl = document.getElementById('stats-goal');
    statsDetailed = document.getElementById('stats-detailed');
    goalBar = document.getElementById('goal-bar');
    goalBarContent = document.getElementById('goal-bar-content');
    goalBarFill = document.getElementById('goal-bar-fill');
    sessionBar = document.getElementById('session-bar');
    sessionDisplay = document.getElementById('session-display');
    findBar = document.getElementById('find-replace-bar');
    findInput = document.getElementById('find-input');
    replaceInput = document.getElementById('replace-input');
    frResults = document.getElementById('fr-results');
    findFormatFilter = document.getElementById('find-format-filter');
    trackChangesBar = document.getElementById('track-changes-bar');
    stylesSelect = document.getElementById('styles-select');
    footnoteArea = document.getElementById('footnote-area');
    metadataPanel = document.getElementById('metadata-panel');
    outlinePanel = document.getElementById('outline-panel');
    outlineList = document.getElementById('outline-list');
    wordFreqPanel = document.getElementById('wordfreq-panel');
    wordFreqList = document.getElementById('wordfreq-list');
    wordFreqSummary = document.getElementById('wordfreq-summary');
    commentsPanel = document.getElementById('comments-panel');
    tocPanel = document.getElementById('toc-panel');
    tocList = document.getElementById('toc-list');
    versionPanel = document.getElementById('version-history-panel');
    versionList = document.getElementById('version-list');
    metaTitle = document.getElementById('meta-title');
    metaAuthor = document.getElementById('meta-author');
    metaTags = document.getElementById('meta-tags');
    metaCategory = document.getElementById('meta-category');
    metaCreated = document.getElementById('meta-created');
    metaModified = document.getElementById('meta-modified');
    exportDropdown = document.getElementById('export-dropdown');

    if (!richEditor) {
      console.warn('orOS Writer: rich-editor element not found, retrying...');
      setTimeout(init, 100);
      return;
    }

    var attempts = 0;
    var maxAttempts = 50;

    function waitForTranslations() {
      attempts++;
      if (window.OROS_TRANSLATIONS && typeof window.OROS_TRANSLATIONS === 'object') {
        startApp();
      } else if (attempts < maxAttempts) {
        setTimeout(waitForTranslations, 100);
      } else {
        console.warn('orOS Writer: Translations timeout, starting with fallback');
        startApp();
      }
    }

    function startApp() {
      loadSettings();
      loadAutoCorrections();
      loadCustomTemplates();
      applyTheme();
      applyLanguage(getCurrentLang());
      applyPageSettings();
      loadSettingsValues();

      setupTabsUI();
      setupEditorInput();
      setupKeyboardShortcuts();
      setupQuickFormatMenu();
      setupPanelToggles();
      setupDialogHandlers();
      setupSettingsHandlers();
      setupFormatButtons();
      setupPrint();
      setupCloseWarning();
      setupPWAInstall();
      setupStatsToggle();
      clampToViewport();

      var active = tabsModule.getActive();
      if (active && richEditor) {
        richEditor.innerHTML = active.content || '<p><br></p>';
        loadPageSettingsFields();
      }

      renderAutocorrectRules();
      updateStats();
      updateSaveIndicator('saved');

      setInterval(autoSaveCheck, AUTO_SAVE_INTERVAL_MS);

      setTimeout(function() { if (richEditor) richEditor.focus(); }, 100);

      initialized = true;

      setTimeout(function() {
        showToast(getTrans('text_welcome') !== 'text_welcome' ? getTrans('text_welcome') : 'Welcome to orOS Writer');
      }, 500);

      console.log('%corOS Writer v' + CONFIG.VERSION + ' initialized \u2713', 'color:#6d4aff;font-weight:bold;');
    }

    waitForTranslations();
  }

  // ===== PUBLIC API =====
  window.orOSWriter = {
    init: init,
    getEditor: function() { return richEditor; },
    getConfig: function() { return CONFIG; },
    tabs: function() { return getTabsApi(); },
    getContent: function() { return richEditor ? richEditor.innerHTML : ''; },
    setContent: function(html) { if (richEditor) { richEditor.innerHTML = html; saveCurrentTabContent(); updateStats(); } },
    getText: function() { return richEditor ? richEditor.innerText : ''; },
    clearContent: clearContent,
    getStats: function() {
      if (!richEditor) return null;
      var text = richEditor.innerText || '';
      var words = text.trim() ? text.trim().split(/\s+/).length : 0;
      var chars = text.length;
      var charNoSpaces = text.replace(/\s/g, '').length;
      var sentences = (text.match(/[.!?\u2026]+/g) || []).length;
      var paragraphs = richEditor.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li').length;
      var readingTime = words > 0 ? Math.max(1, Math.ceil(words / 200)) : 0;
      var speakingTime = words > 0 ? Math.max(1, Math.ceil(words / 130)) : 0;
      return { words: words, chars: chars, charNoSpaces: charNoSpaces, sentences: sentences, paragraphs: paragraphs, readingTime: readingTime, speakingTime: speakingTime };
    },
    updateStats: updateStats,
    getSettings: function() { return loadSettings(); },
    saveSettings: saveSettings,
    getLanguage: function() { return getCurrentLang(); },
    setLanguage: function(lang) { applyLanguage(lang); },
    translate: getTrans,
    applyTheme: applyTheme,
    exportFormat: handleExport,
    exportFullDatabase: exportFullDatabase,
    getTemplates: getAllTemplates,
    getCustomTemplates: function() { return customTemplates; },
    saveCurrentAsTemplate: saveCurrentAsTemplate,
    deleteCustomTemplate: deleteCustomTemplate,
    exportTemplates: exportTemplatesJson,
    importTemplates: importTemplatesJson,
    getAutocorrectRules: function() { return autocorrectRules; },
    addAutocorrectRule: function(trigger, replacement) { autocorrectRules[trigger.toLowerCase()] = replacement; saveAutoCorrections(); },
    removeAutocorrectRule: function(trigger) { delete autocorrectRules[trigger.toLowerCase()]; saveAutoCorrections(); },
    resetAutocorrectRules: resetAutocorrectRules,
    addSnapshot: addVersionSnapshot,
    getVersions: function() { var t = tabsModule.getActive(); return t ? (t.versions || []) : []; },
    restoreVersion: restoreVersion,
    toggleTrackChanges: toggleTrackChanges,
    acceptAllChanges: acceptAllChanges,
    rejectAllChanges: rejectAllChanges,
    isTrackingChanges: function() { return trackingChanges; },
    toggleZenMode: toggleZenMode,
    toggleFocusMode: toggleFocusMode,
    toggleReadingMode: toggleReadingMode,
    toggleOutline: toggleOutline,
    toggleMetadata: toggleMetadataPanel,
    toggleComments: toggleCommentsPanel,
    toggleToC: toggleToCPanel,
    toggleWordFreq: toggleWordFreqPanel,
    toggleVersionHistory: toggleVersionPanel,
    toggleSettings: toggleSettingsModal,
    toggleFind: toggleFindBar,
    toggleGoalBar: toggleGoalBar,
    toggleSessionBar: toggleSessionBar,
    toggleTemplatesDialog: toggleTemplatesDialog,
    showToast: showToast,
    showQuickFormatMenu: createQuickFormatMenu,
    applyPageSize: applyPageSize,
    applyPageSettings: applyPageSettings,
    saveContent: saveCurrentTabContent,
    isInitialized: function() { return initialized; }
  };

  // ===== DOMContentLoaded / Auto-init =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();