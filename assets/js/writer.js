/* ============================================
   orOS Writer — Complete Application v2.3.2
   Phase 1+2: Dead code cleanup, duplicate removal,
              bug fixes, PWA delegation
   Author: Christos Koulaxizis | orOS Ecosystem
   ============================================ */

(function() {
  'use strict';

  // ===== CONFIGURATION =====
  var CONFIG = {
    APP_NAME: 'orOS Writer',
    VERSION: '2.3.2',
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
  var customTemplates = [];

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
          '<span class="tab-label">' + escapeHtml(t.title) + '</span>' +
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

  function getTabTitle() {
    var tab = tabsModule.getActive();
    return (tab && tab.title) ? tab.title : 'document';
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
      smartTypographyEnabled = s.smartTypography !== false;
      typewriterSoundEnabled = s.typewriterSound === true;
      readingProgressEnabled = s.readingProgress !== false;
      hideStats = s.hideStats === true;
      return s;
    } catch(e) { return {}; }
  }

  function saveSettings() {
    var s = {
      smartTypography: smartTypographyEnabled,
      typewriterSound: typewriterSoundEnabled,
      readingProgress: readingProgressEnabled,
      hideStats: hideStats
    };
    var set = function(id, prop) { var el = document.getElementById(id); if (el) s[prop] = el.checked; };
    set('toggle-smart-typography', 'smartTypography');
    set('toggle-typewriter-sound', 'typewriterSound');
    set('toggle-reading-progress', 'readingProgress');
    set('toggle-hide-stats', 'hideStats');
    try { localStorage.setItem(CONFIG.STORAGE_PREFIX + 'settings', JSON.stringify(s)); } catch(e) {}
    smartTypographyEnabled = s.smartTypography !== false;
    typewriterSoundEnabled = s.typewriterSound === true;
    readingProgressEnabled = s.readingProgress !== false;
    hideStats = s.hideStats === true;
    showToast(getTrans('btn_save') !== 'btn_save' ? getTrans('btn_save') : 'Settings saved');
  }

  function loadSettingsValues() {
    var set = function(id, val) { var el = document.getElementById(id); if (el) el.checked = val; };
    set('toggle-hide-save-indicator', localStorage.getItem('oros_hide_save_indicator') === 'true');
    set('toggle-hide-stats', hideStats);
    set('toggle-reading-progress', readingProgressEnabled);
    set('toggle-smart-typography', smartTypographyEnabled);
    set('toggle-typewriter-sound', typewriterSoundEnabled);
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
    var toolbarH = 40 + 36;
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

  function renderCustomTemplates() {
    var list = document.getElementById('custom-templates-list');
    if (!list) return;
    if (customTemplates.length === 0) {
      list.innerHTML = '<div class="template-empty">' + (getTrans('no_custom_templates') !== 'no_custom_templates' ? getTrans('no_custom_templates') : 'No custom templates yet') + '</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < customTemplates.length; i++) {
      var t = customTemplates[i];
      html += '<div class="template-item" data-id="' + t.id + '">' +
        '<i class="fa fa-file-o template-icon"></i>' +
        '<div class="template-info"><strong>' + escapeHtml(t.title) + '</strong>' +
        '<small>' + escapeHtml(t.desc || '') + '</small></div>' +
        '<button class="template-action template-edit" data-id="' + t.id + '" title="' + (getTrans('edit') !== 'edit' ? getTrans('edit') : 'Edit') + '"><i class="fa fa-pencil"></i></button>' +
        '<button class="template-action template-delete" data-id="' + t.id + '" title="' + (getTrans('delete') !== 'delete' ? getTrans('delete') : 'Delete') + '"><i class="fa fa-trash"></i></button></div>';
    }
    list.innerHTML = html;

    var deleteBtns = list.querySelectorAll('.template-delete');
    for (var d = 0; d < deleteBtns.length; d++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.getAttribute('data-id');
          customTemplates = customTemplates.filter(function(ct) { return ct.id !== id; });
          saveCustomTemplates();
          renderCustomTemplates();
          renderTemplateSelect();
          showToast('Template deleted');
        });
      })(deleteBtns[d]);
    }

    var editBtns = list.querySelectorAll('.template-edit');
    for (var e = 0; e < editBtns.length; e++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var id = btn.getAttribute('data-id');
          var t = customTemplates.find(function(ct) { return ct.id === id; });
          if (!t) return;
          openTemplateEditor(t);
        });
      })(editBtns[e]);
    }
  }

  function renderTemplateSelect() {
    var select = document.getElementById('template-select');
    if (!select) return;
    var lang = getCurrentLang();
    select.innerHTML = '<option value="" disabled selected>' + (getTrans('select_template') !== 'select_template' ? getTrans('select_template') : 'Select a template') + '</option><optgroup label="' + (getTrans('built_in') !== 'built_in' ? getTrans('built_in') : 'Built-in') + '"></optgroup>';
    var builtinGroup = select.querySelector('optgroup:first-child');
    for (var i = 0; i < TEMPLATES.length; i++) {
      var t = TEMPLATES[i];
      builtinGroup.innerHTML += '<option value="' + t.id + '">' + escapeHtml(t.title) + '</option>';
    }
    if (customTemplates.length > 0) {
      var customGroup = document.createElement('optgroup');
      customGroup.label = lang === 'el' ? 'Προσαρμοσμένα' : 'Custom';
      for (var j = 0; j < customTemplates.length; j++) {
        var ct = customTemplates[j];
        customGroup.innerHTML += '<option value="custom_' + ct.id + '">' + escapeHtml(ct.title) + '</option>';
      }
      select.appendChild(customGroup);
    }
  }

  function openTemplateEditor(existing) {
    var modal = document.querySelector('#template-editor-modal');
    if (!modal) return;
    var titleInp = document.getElementById('template-title-input');
    var descInp = document.getElementById('template-desc-input');
    var contentInp = document.getElementById('template-content-input');
    if (existing) {
      titleInp.value = existing.title;
      descInp.value = existing.desc || '';
      contentInp.value = existing.content || '';
    } else {
      titleInp.value = '';
      descInp.value = '';
      contentInp.value = '';
    }
    modal.classList.add('visible');

    var saveHandler = function() {
      var title = titleInp.value.trim() || 'Untitled';
      var desc = descInp.value.trim();
      var content = contentInp.value;
      var id = existing ? existing.id : 'tpl_' + Date.now();
      var tpl = { id: id, title: title, desc: desc, content: content };
      if (existing) {
        var idx = customTemplates.findIndex(function(ct) { return ct.id === existing.id; });
        if (idx >= 0) customTemplates[idx] = tpl;
      } else {
        customTemplates.push(tpl);
      }
      saveCustomTemplates();
      renderCustomTemplates();
      renderTemplateSelect();
      modal.classList.remove('visible');
      showToast(existing ? 'Template updated' : 'Template created');
    };

    var cancelHandler = function() { modal.classList.remove('visible'); };

    var saveBtn = modal.querySelector('.template-editor-save');
    var cancelBtn = modal.querySelector('.template-editor-cancel');
    if (saveBtn) saveBtn.onclick = saveHandler;
    if (cancelBtn) cancelBtn.onclick = cancelHandler;
  }

  // ===== FIND & REPLACE =====
  var findTypingTimer = null;
  var replaceTypingTimer = null;
  var findHistory = [];
  var findHistoryIndex = -1;

  function setupFindReplace() {
    if (!findInput) return;
    findInput.addEventListener('keyup', function() {
      clearTimeout(findTypingTimer);
      findTypingTimer = setTimeout(findInDocument, 300);
    });
    bindClick('btn-find-prev', findPrevious);
    bindClick('btn-find-next', findNext);
    bindClick('btn-replace', replaceMatch);
    bindClick('btn-replace-all', replaceAll);
    bindClick('btn-find-close', function() { if (findBar) findBar.classList.remove('active'); hideSearchHighlights(); });
  }

  function findInDocument() {
    hideSearchHighlights();
    var term = findInput.value.trim();
    if (!term) { if (frResults) frResults.textContent = '0/0'; return; }
    var count = 0;
    var nodes = [];
    var walker = document.createTreeWalker(richEditor, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) { nodes.push(walker.currentNode); }
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var text = node.textContent;
      var pos = 0;
      while ((pos = text.toLowerCase().indexOf(term.toLowerCase(), pos)) !== -1) {
        var fragment = document.createDocumentFragment();
        var before = document.createTextNode(text.substring(0, pos));
        var highlight = document.createElement('span');
        highlight.className = 'search-match';
        highlight.textContent = text.substring(pos, pos + term.length);
        var after = document.createTextNode(text.substring(pos + term.length));
        fragment.appendChild(before); fragment.appendChild(highlight); fragment.appendChild(after);
        node.parentNode.replaceChild(fragment, node);
        count++;
        node = after;
        pos += term.length;
      }
    }
    if (frResults) frResults.textContent = count + '/' + count;
  }

  function hideSearchHighlights() {
    var matches = richEditor.querySelectorAll('.search-match');
    for (var i = 0; i < matches.length; i++) {
      var parent = matches[i].parentNode;
      parent.replaceChild(document.createTextNode(matches[i].textContent), matches[i]);
      parent.normalize();
    }
    if (frResults) frResults.textContent = '0/0';
  }

  function findNext() { findNavigate(1); }
  function findPrevious() { findNavigate(-1); }

  function findNavigate(dir) {
    var term = findInput.value.trim();
    if (!term) return;
    var matches = richEditor.querySelectorAll('.search-match');
    if (matches.length === 0) {
      findInDocument();
      matches = richEditor.querySelectorAll('.search-match');
    }
    if (matches.length === 0) return;
    var sel = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(matches[0]);
    sel.removeAllRanges();
    sel.addRange(range);
    matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function replaceMatch() {
    var sel = window.getSelection();
    if (sel.rangeCount === 0) return;
    var range = sel.getRangeAt(0);
    var selected = range.toString();
    var replaceWith = replaceInput ? replaceInput.value : '';
    if (!selected) { findNext(); return; }
    range.deleteContents();
    range.insertNode(document.createTextNode(replaceWith));
    findNext();
  }

  function replaceAll() {
    var term = findInput.value.trim();
    if (!term) { showToast('Enter find text'); return; }
    var replacement = replaceInput ? replaceInput.value : '';
    var regex = new RegExp(escapeRegex(term), 'gi');
    richEditor.innerHTML = richEditor.innerHTML.replace(regex, function(match) { return replacement; });
    hideSearchHighlights();
    updateStats();
    showToast('Replaced all occurrences');
  }

  function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // ===== WORD FREQUENCY =====
  function setupWordFrequency() {
    bindClick('btn-wordfreq', toggleWordFreq);
  }

  function toggleWordFreq() {
    if (!wordFreqPanel) return;
    if (wordFreqPanel.classList.contains('active')) { wordFreqPanel.classList.remove('active'); return; }
    calculateWordFrequency();
    wordFreqPanel.classList.add('active');
  }

  function calculateWordFrequency() {
    var text = richEditor.innerText || '';
    text = text.toLowerCase().replace(/[.,!?;:"'()\[\]{}]/g, '').trim();
    var words = text.split(/\s+/).filter(function(w) { return w && w.length > 2; });
    var freq = {};
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      freq[w] = (freq[w] || 0) + 1;
    }
    var arr = Object.keys(freq).map(function(k) { return { word: k, count: freq[k] }; });
    arr.sort(function(a, b) { return b.count - a.count; });
    arr = arr.slice(0, 50);
    var html = '';
    for (var j = 0; j < arr.length; j++) { html += '<div class="word-row"><span class="word">' + escapeHtml(arr[j].word) + '</span><span class="count">' + arr[j].count + '</span></div>'; }
    if (wordFreqList) wordFreqList.innerHTML = html || '<div class="empty-msg">Type to analyze</div>';
    if (wordFreqSummary && arr.length > 0) {
      var unique = arr.length;
      var total = words.length;
      var topPct = Math.round((arr[0].count / total) * 100);
      wordFreqSummary.textContent = unique + ' unique words · Top "' + arr[0].word + '" ' + topPct + '%';
    }
  }
  
    // ===== TRACK CHANGES =====
  function setupTrackChanges() {
    bindClick('btn-track-changes', toggleTrackChanges);
    bindClick('btn-accept-all', acceptAllChanges);
    bindClick('btn-reject-all', rejectAllChanges);
  }

  function toggleTrackChanges() {
    trackingChanges = !trackingChanges;
    var btn = document.getElementById('btn-track-changes');
    if (btn) {
      btn.classList.toggle('active', trackingChanges);
      btn.setAttribute('title', trackingChanges ? (getTrans('track_changes_off') || 'Track changes OFF') : (getTrans('track_changes_on') || 'Track changes ON'));
    }
    if (trackChangesBar) trackChangesBar.style.display = trackingChanges ? '' : 'none';
    if (trackChangesObserver) { trackChangesObserver.disconnect(); trackChangesObserver = null; }
    if (trackingChanges) {
      trackChangesObserver = new MutationObserver(handleTrackChangesMutation);
      trackChangesObserver.observe(richEditor, { childList: true, subtree: true });
    }
    showToast(trackingChanges ? 'Track Changes ON' : 'Track Changes OFF');
  }

  function handleTrackChangesMutation(mutations) {
    if (!trackingChanges) return;
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        for (var j = 0; j < m.addedNodes.length; j++) {
          var node = m.addedNodes[j];
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (!node.hasAttribute('data-change-id')) {
              node.setAttribute('data-change-id', 'ins_' + Date.now());
              node.classList.add('track-insertion');
            }
          }
        }
      }
    }
  }

  function acceptAllChanges() {
    var inserts = richEditor.querySelectorAll('.track-insertion');
    for (var i = 0; i < inserts.length; i++) {
      var parent = inserts[i].parentNode;
      parent.replaceChild(document.createTextNode(inserts[i].textContent), inserts[i]);
      parent.normalize();
    }
    var deletes = richEditor.querySelectorAll('.track-deletion');
    for (var d = 0; d < deletes.length; d++) {
      var pNode = deletes[d].parentNode;
      pNode.removeChild(deletes[d]);
      pNode.normalize();
    }
    if (trackChangesObserver) { trackChangesObserver.disconnect(); trackChangesObserver = null; }
    trackingChanges = false;
    var btn = document.getElementById('btn-track-changes');
    if (btn) btn.classList.remove('active');
    if (trackChangesBar) trackChangesBar.style.display = 'none';
    showToast('All changes accepted');
  }

  function rejectAllChanges() {
    var inserts = richEditor.querySelectorAll('.track-insertion');
    for (var i = 0; i < inserts.length; i++) {
      var parent = inserts[i].parentNode;
      parent.removeChild(inserts[i]);
      parent.normalize();
    }
    var deletes = richEditor.querySelectorAll('.track-deletion');
    for (var d = 0; d < deletes.length; d++) {
      var pNode = deletes[d].parentNode;
      pNode.replaceChild(document.createTextNode(deletes[d].textContent), deletes[d]);
      pNode.normalize();
    }
    if (trackChangesObserver) { trackChangesObserver.disconnect(); trackChangesObserver = null; }
    trackingChanges = false;
    var btn = document.getElementById('btn-track-changes');
    if (btn) btn.classList.remove('active');
    if (trackChangesBar) trackChangesBar.style.display = 'none';
    showToast('All changes rejected');
  }

  // ===== COMMENTS =====
  function setupComments() {
    bindClick('btn-comments', toggleCommentsPanel);
    bindClick('btn-add-comment', addCommentFromPanel);
    loadAndRestoreComments();
  }

  function toggleCommentsPanel() {
    if (!commentsPanel) return;
    commentsPanel.classList.toggle('active');
    var btn = document.getElementById('btn-comments');
    if (btn) btn.classList.toggle('active', commentsPanel.classList.contains('active'));
    if (commentsPanel.classList.contains('active')) refreshCommentsList();
  }

  function loadAndRestoreComments() {
    var tab = tabsModule.getActive();
    if (!tab || !tab.metadata || !tab.metadata.comments) return;
    var comments = tab.metadata.comments || [];
    for (var i = 0; i < comments.length; i++) {
      var c = comments[i];
      var highlights = richEditor.querySelectorAll('[data-comment-id="' + c.id + '"]');
      for (var j = 0; j < highlights.length; j++) {
        highlights[j].classList.add('comment-highlight');
        highlights[j].setAttribute('data-author', c.author || 'Anonymous');
      }
    }
  }

  function saveComments() {
    var tab = tabsModule.getActive();
    if (!tab) return;
    var highlights = richEditor.querySelectorAll('.comment-highlight');
    var comments = [];
    var seenIds = {};
    for (var i = 0; i < highlights.length; i++) {
      var id = highlights[i].getAttribute('data-comment-id');
      if (!id || seenIds[id]) continue;
      seenIds[id] = true;
      var author = highlights[i].getAttribute('data-author') || 'Anonymous';
      var text = highlights[i].getAttribute('data-text') || '';
      var timestamp = highlights[i].getAttribute('data-timestamp') || new Date().toISOString();
      comments.push({ id: id, author: author, text: text, timestamp: timestamp });
    }
    var meta = tabsModule.getMetadata();
    meta.comments = comments;
    tabsModule.setMetadata(meta);
    return comments;
  }

  function refreshCommentsList() {
    if (!commentsPanel) return;
    var list = commentsPanel.querySelector('.comments-list');
    if (!list) return;
    var tab = tabsModule.getActive();
    var comments = (tab && tab.metadata && tab.metadata.comments) || [];
    if (comments.length === 0) {
      list.innerHTML = '<div class="comments-empty">' + (getTrans('no_comments') !== 'no_comments' ? getTrans('no_comments') : 'No comments yet') + '</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < comments.length; i++) {
      var c = comments[i];
      var date = new Date(c.timestamp).toLocaleDateString(currentLang === 'el' ? 'el-GR' : 'en-US');
      html += '<div class="comment-item" data-id="' + c.id + '"><div class="comment-meta"><span class="comment-author">' + escapeHtml(c.author) + '</span><span class="comment-date">' + date + '</span></div><div class="comment-text">' + escapeHtml(c.text) + '</div></div>';
    }
    list.innerHTML = html;
  }

  function addCommentFromPanel() {
    var textarea = document.getElementById('comment-text-input');
    if (!textarea || !textarea.value.trim()) { showToast('Enter comment text'); return; }
    var selectedText = window.getSelection().toString().trim();
    if (!selectedText) { showToast('Select text to comment'); return; }
    createComment(textarea.value.trim(), selectedText);
    textarea.value = '';
    refreshCommentsList();
    saveComments();
    showToast('Comment added');
  }

  function createComment(commentText, quotedText) {
    var id = 'comm_' + Date.now();
    var author = 'Anonymous';
    var timestamp = new Date().toISOString();
    var highlight = document.createElement('span');
    highlight.className = 'comment-highlight';
    highlight.setAttribute('data-comment-id', id);
    highlight.setAttribute('data-author', author);
    highlight.setAttribute('data-text', commentText);
    highlight.setAttribute('data-timestamp', timestamp);
    highlight.textContent = quotedText;

    var sel = window.getSelection();
    if (sel.rangeCount === 0) return;
    var range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(highlight);

    var tab = tabsModule.getActive();
    if (!tab) return;
    var comments = tab.metadata.comments || [];
    comments.push({ id: id, author: author, text: commentText, timestamp: timestamp });
    var meta = tabsModule.getMetadata();
    meta.comments = comments;
    tabsModule.setMetadata(meta);
  }

  // ===== FOOTNOTES =====
  var footnoteCounter = 0;

  function setupFootnotes() {
    bindClick('btn-footnote', insertFootnote);
  }

  function insertFootnote() {
    var selectedText = window.getSelection().toString().trim();
    footnoteCounter++;
    var refId = 'fn_ref_' + footnoteCounter;
    var fnId = 'fn_' + footnoteCounter;
    var sup = document.createElement('sup');
    sup.innerHTML = '<a href="#' + fnId + '" id="' + refId + '" class="footnote-ref">[' + footnoteCounter + ']</a>';
    var sel = window.getSelection();
    if (sel.rangeCount === 0) return;
    var range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(sup);

    var fnArea = document.getElementById('footnote-area');
    if (fnArea) {
      var fnEntry = document.createElement('div');
      fnEntry.id = fnId;
      fnEntry.className = 'footnote-entry';
      fnEntry.innerHTML = '<a href="#' + refId + '" class="footnote-back">\u2191</a> <span class="footnote-text">' + escapeHtml(selectedText || 'Footnote text') + '</span>';
      fnArea.appendChild(fnEntry);
      fnArea.scrollIntoView({ behavior: 'smooth' });
    }

    var tab = tabsModule.getActive();
    if (tab) {
      var footnotes = tab.metadata.footnotes || [];
      footnotes.push({ refId: refId, fnId: fnId, number: footnoteCounter, text: selectedText || 'Footnote text' });
      var meta = tabsModule.getMetadata();
      meta.footnotes = footnotes;
      tabsModule.setMetadata(meta);
    }
  }

  function restoreFootnotes() {
    var tab = tabsModule.getActive();
    if (!tab || !tab.metadata || !tab.metadata.footnotes) return;
    var fnArea = document.getElementById('footnote-area');
    if (!fnArea) return;
    var footnotes = tab.metadata.footnotes;
    footnoteCounter = 0;
    for (var i = 0; i < footnotes.length; i++) {
      var f = footnotes[i];
      var entry = document.createElement('div');
      entry.id = f.fnId;
      entry.className = 'footnote-entry';
      entry.innerHTML = '<a href="#' + f.refId + '" class="footnote-back">\u2191</a> <span class="footnote-text">' + escapeHtml(f.text) + '</span>';
      fnArea.appendChild(entry);
      footnoteCounter = Math.max(footnoteCounter, f.number);
    }
  }
  
    // ===== VERSION HISTORY =====
  var versionHistoryInterval = null;

  function setupVersionHistory() {
    bindClick('btn-versions', toggleVersionsPanel);
    startVersionSnapshots();
  }

  function toggleVersionsPanel() {
    if (!versionPanel) return;
    versionPanel.classList.toggle('active');
    var btn = document.getElementById('btn-versions');
    if (btn) btn.classList.toggle('active', versionPanel.classList.contains('active'));
    if (versionPanel.classList.contains('active')) refreshVersionList();
  }

  function startVersionSnapshots() {
    if (versionHistoryInterval) clearInterval(versionHistoryInterval);
    versionHistoryInterval = setInterval(function() {
      var tab = tabsModule.getActive();
      if (!tab) return;
      var content = richEditor ? richEditor.innerHTML : '';
      var hash = simpleHash(content);
      tab.versions = tab.versions || [];
      var lastVersion = tab.versions[tab.versions.length - 1];
      if (lastVersion && lastVersion.hash === hash) return;
      tab.versions.push({ hash: hash, timestamp: new Date().toISOString(), snapshot: content });
      if (tab.versions.length > 20) tab.versions.shift();
      tabsModule.persist();
    }, 30000);
  }

  function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
    return hash.toString();
  }

  function refreshVersionList() {
    var tab = tabsModule.getActive();
    if (!versionList || !tab || !tab.versions) { if (versionList) versionList.innerHTML = '<div class="empty-msg">No versions</div>'; return; }
    var versions = tab.versions;
    var html = '';
    for (var i = versions.length - 1; i >= 0; i--) {
      var v = versions[i];
      var date = new Date(v.timestamp).toLocaleString(currentLang === 'el' ? 'el-GR' : 'en-US');
      html += '<div class="version-item" data-index="' + i + '"><span class="version-date">' + date + '</span><button class="version-restore" data-index="' + i + '">Restore</button></div>';
    }
    versionList.innerHTML = html;
    var restoreBtns = versionList.querySelectorAll('.version-restore');
    for (var r = 0; r < restoreBtns.length; r++) {
      (function(btn, idx) {
        btn.addEventListener('click', function() {
          if (!confirm('Restore this version? Unsaved changes will be lost.')) return;
          richEditor.innerHTML = versions[idx].snapshot;
          tabsModule.setContent(richEditor.innerHTML);
          showToast('Version restored');
        });
      })(restoreBtns[r], r);
    }
  }

  // ===== ZEN MODE =====
  function setupZenMode() {
    var zenBtn = document.getElementById('btn-zen');
    if (zenBtn) {
      zenBtn.addEventListener('click', function() {
        var body = document.body;
        var isZen = body.hasAttribute('data-zen');
        if (isZen) body.removeAttribute('data-zen');
        else body.setAttribute('data-zen', 'true');
        localStorage.setItem('oros_zen_mode', !isZen ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('oros-zen-mode-changed', { detail: { enabled: !isZen } }));
        showToast(!isZen ? (getTrans('zen_mode_on') || 'Zen Mode ON') : (getTrans('zen_mode_off') || 'Zen Mode OFF'));
      });
    }
  }

  // ===== GOAL BAR =====
  function setupGoalBar() {
    bindClick('btn-goal', toggleGoalSettings);
    goalTargetInput = document.getElementById('goal-target-input');
    goalUnitSelect = document.getElementById('goal-unit-select');
    goalLockCheckbox = document.getElementById('goal-lock-checkbox');
    if (goalTargetInput) goalTargetInput.addEventListener('change', saveGoal);
    if (goalUnitSelect) goalUnitSelect.addEventListener('change', saveGoal);
    if (goalLockCheckbox) goalLockCheckbox.addEventListener('change', saveGoal);
    loadGoal();
  }

  function toggleGoalSettings() {
    if (!goalBar) return;
    goalBar.classList.toggle('active');
    var btn = document.getElementById('btn-goal');
    if (btn) btn.classList.toggle('active', goalBar.classList.contains('active'));
  }

  function saveGoal() {
    if (goalTargetInput) localStorage.setItem('oros_writer_goal', goalTargetInput.value || 0);
    if (goalUnitSelect) localStorage.setItem('oros_writer_goal_unit', goalUnitSelect.value);
    updateStats();
  }

  function loadGoal() {
    if (goalTargetInput) {
      var saved = localStorage.getItem('oros_writer_goal');
      goalTargetInput.value = saved || 1000;
    }
    if (goalUnitSelect) {
      var savedUnit = localStorage.getItem('oros_writer_goal_unit');
      goalUnitSelect.value = savedUnit || 'words';
    }
    updateGoalBar();
  }

  function updateGoalBar() {
    if (!goalBar || !goalBarContent || !goalBarFill) return;
    var goal = parseInt(localStorage.getItem('oros_writer_goal'), 10) || 0;
    if (goal <= 0) { goalBar.style.display = 'none'; return; }
    goalBar.style.display = '';
    var unit = localStorage.getItem('oros_writer_goal_unit') || 'words';
    var current = 0;
    if (richEditor) {
      if (unit === 'chars') current = richEditor.innerText.length;
      else current = (richEditor.innerText.trim() || '').split(/\s+/).length;
    }
    var pct = Math.min(100, Math.round((current / goal) * 100));
    goalBarFill.style.width = pct + '%';
    var remaining = Math.max(0, goal - current);
    goalBarContent.textContent = remaining + (unit === 'chars' ? ' chars' : ' words') + ' left';
  }

  // ===== SESSION TIMER =====
  function setupSessionTimer() {
    if (!sessionBar) return;
    sessionBar.addEventListener('mouseenter', function() { if (sessionDisplay) sessionDisplay.style.visibility = 'visible'; });
    sessionBar.addEventListener('mouseleave', function() { if (sessionDisplay) sessionDisplay.style.visibility = 'hidden'; });
    bindClick('btn-start-session', startSession);
    bindClick('btn-stop-session', stopSession);
    bindClick('btn-reset-session', resetSession);
    loadSessionTarget();
  }

  function startSession() {
    if (sessionInterval) clearInterval(sessionInterval);
    sessionStartTime = Date.now();
    sessionSeconds = 0;
    var targetMinutes = localStorage.getItem('oros_writer_session_time');
    sessionInterval = setInterval(function() {
      sessionSeconds++;
      if (sessionDisplay) {
        var mins = Math.floor(sessionSeconds / 60);
        var secs = sessionSeconds % 60;
        sessionDisplay.textContent = mins + ':' + secs.toString().padStart(2, '0');
      }
      if (targetMinutes && sessionSeconds >= parseInt(targetMinutes, 10) * 60) {
        showToast(getTrans('session_complete') || 'Session complete!');
        stopSession();
      }
    }, 1000);
    showToast(getTrans('session_started') || 'Session started');
  }

  function stopSession() {
    if (sessionInterval) clearInterval(sessionInterval);
    sessionInterval = null;
    if (sessionDisplay) sessionDisplay.textContent = '--:--';
    showToast(getTrans('session_stopped') || 'Session stopped');
  }

  function resetSession() {
    stopSession();
    sessionSeconds = 0;
    if (sessionDisplay) sessionDisplay.textContent = '--:--';
  }

  function loadSessionTarget() {
    var targetW = localStorage.getItem('oros_writer_session_words');
    var targetM = localStorage.getItem('oros_writer_session_time');
    var wInp = document.getElementById('session-word-target');
    var mInp = document.getElementById('session-time-target');
    if (wInp) wInp.value = targetW || 500;
    if (mInp) mInp.value = targetM || 25;
  }

  // ===== EXPORT / IMPORT =====
  function setupExportImport() {
    bindClick('btn-export', showExportOptions);
    bindClick('btn-import', showImportOptions);
    bindClick('btn-export-txt', exportTxt);
    bindClick('btn-export-md', exportMd);
    bindClick('btn-export-html', exportHtml);
    bindClick('btn-export-pdf', exportPdf);
    bindClick('btn-export-docx', exportDocx);
    bindClick('btn-export-rtf', exportRtf);
    bindClick('btn-export-json', exportJson);
    bindClick('btn-import-txt', importTxt);
    bindClick('btn-close-export', hideExportOptions);
    bindClick('btn-close-import', hideImportOptions);
    setupFileImport();
  }

  function showExportOptions() { var el = document.getElementById('export-dropdown'); if (el) el.classList.add('active'); }
  function hideExportOptions() { var el = document.getElementById('export-dropdown'); if (el) el.classList.remove('active'); }
  function showImportOptions() { var el = document.getElementById('import-dropdown'); if (el) el.classList.add('active'); }
  function hideImportOptions() { var el = document.getElementById('import-dropdown'); if (el) el.classList.remove('active'); }

  function exportTxt() {
    var blob = new Blob([richEditor.innerText], { type: 'text/plain' });
    downloadBlob(blob, getTabTitle() + '.txt');
  }

  function exportMd() {
    var blob = new Blob([richEditor.innerText], { type: 'text/markdown' });
    downloadBlob(blob, getTabTitle() + '.md');
  }

  function exportHtml() {
    var blob = new Blob(['<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' + richEditor.innerHTML + '</body></html>'], { type: 'text/html' });
    downloadBlob(blob, getTabTitle() + '.html');
  }

  function exportPdf() {
    window.print();
  }

  function exportDocx() {
    try {
      if (!window.JSZip) { showToast('JSZip not loaded'); return; }
      var zip = new JSZip();
      zip.file('document.txt', richEditor.innerText);
      zip.generateAsync({ type: 'blob' }).then(function(blob) {
        downloadBlob(blob, getTabTitle() + '.docx');
        showToast('DOCX exported');
      }).catch(function(e) { showToast('Export failed: ' + e.message); });
    } catch(e) { showToast('Export failed: ' + e.message); }
  }

  function exportRtf() {
    try {
      var text = richEditor.innerText.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');
      var rtf = '{\\rtf1\\ansi ' + text + '}';
      var blob = new Blob([rtf], { type: 'application/rtf' });
      downloadBlob(blob, getTabTitle() + '.rtf');
      showToast('RTF exported');
    } catch(e) { showToast('Export failed: ' + e.message); }
  }

  function exportJson() {
    var tab = tabsModule.getActive();
    var blob = new Blob([JSON.stringify(tab, null, 2)], { type: 'application/json' });
    downloadBlob(blob, getTabTitle() + '.json');
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

    function importTxt() {
    showImportOptions();
  }

  function setupFileImport() {
    var fileInput = document.getElementById('file-import-input');
    if (!fileInput) return;
    fileInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var content = ev.target.result;
        if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
          richEditor.innerHTML = content;
        } else if (file.name.endsWith('.rtf')) {
          var html = (typeof window.parseRTF === 'function')
            ? window.parseRTF(content)
            : '<p>' + escapeHtml(content).replace(/\n/g, '<br>') + '</p>';
          richEditor.innerHTML = html;
        } else {
          richEditor.innerHTML = '<p>' + escapeHtml(content).replace(/\n/g, '<br>') + '</p>';
        }
        tabsModule.setContent(richEditor.innerHTML);
        tabsModule.setMetadata({ modified: new Date().toISOString() });
        hideImportOptions();
        showToast('File imported');
        updateStats();
      };
      reader.readAsText(file);
      fileInput.value = '';
    });
  }

  // ===== STYLE SELECTOR =====
  function setupStyleSelector() {
    stylesSelect = document.getElementById('styles-select');
    if (!stylesSelect) return;
    stylesSelect.addEventListener('change', function() {
      var style = this.value;
      if (!style) return;
      execCmd('formatBlock', style);
      this.value = '';
    });
  }

    // ===== KEYBOARD SHORTCUTS =====
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Z — Undo
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); execCmd('undo'); }
        // Ctrl+Y or Ctrl+Shift+Z — Redo
        else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); execCmd('redo'); }
        // Ctrl+B — Bold
        else if (e.key === 'b') { e.preventDefault(); execCmd('bold'); }
        // Ctrl+I — Italic
        else if (e.key === 'i') { e.preventDefault(); execCmd('italic'); }
        // Ctrl+U — Underline
        else if (e.key === 'u') { e.preventDefault(); execCmd('underline'); }
        // Ctrl+S — Save
        else if (e.key === 's') { e.preventDefault(); e.stopPropagation(); saveCurrentTabContent(); showToast(getTrans('autosave') || 'Saved'); }
        // Ctrl+F — Find
        else if (e.key === 'f' && !e.shiftKey) { e.preventDefault(); if (findBar) findBar.classList.toggle('active'); }
        // Ctrl+Shift+F — Insert footnote
        else if (e.key === 'f' && e.shiftKey) { e.preventDefault(); insertFootnote(); }
        // Ctrl+K — Insert link
        else if (e.key === 'k') { e.preventDefault(); var btn = document.getElementById('btn-link'); if (btn) btn.click(); }
        // Ctrl+, — Subscript
        else if (e.key === ',') { e.preventDefault(); execCmd('subscript'); }
        // Ctrl+. — Superscript
        else if (e.key === '.') { e.preventDefault(); execCmd('superscript'); }
        // Ctrl+Enter — Page break
        else if (e.key === 'Enter') {
          e.preventDefault();
          var pb = document.createElement('div');
          pb.className = 'page-break';
          pb.style.pageBreakAfter = 'always';
          pb.innerHTML = '<hr style="border:none;border-top:1px dashed #ccc;margin:1em 0;">';
          richEditor.focus();
          document.execCommand('insertHTML', false, pb.outerHTML + '<p><br></p>');
        }
        // Ctrl+O — Open file
        else if (e.key === 'o') {
          e.preventDefault();
          var fileInput = document.getElementById('file-input-hidden');
          if (fileInput) fileInput.click();
        }
        // Ctrl+Shift+C — Add comment
        else if (e.key === 'c' && e.shiftKey) {
          e.preventDefault();
          if (commentsPanel) {
            if (!commentsPanel.classList.contains('active')) {
              commentsPanel.classList.add('active');
              var btn = document.getElementById('btn-comments');
              if (btn) btn.classList.add('active');
            }
            refreshCommentsList();
            var addArea = document.getElementById('comment-add-area');
            if (addArea) addArea.style.display = '';
            var input = document.getElementById('comment-input');
            if (input) input.focus();
          }
        }
        // Ctrl+G — Goal toggle
        else if (e.key === 'g') { e.preventDefault(); toggleGoalSettings(); }
        // Ctrl+N — New tab
        else if (e.key === 'n') {
          e.preventDefault();
          tabsModule.create({ content: '<p><br></p>', metadata: {} });
          setTimeout(function() { if (richEditor) richEditor.focus(); }, 50);
        }
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        e.isHandledByWriter = true;
        var zen = document.body.hasAttribute('data-zen');
        if (zen) { document.body.removeAttribute('data-zen'); localStorage.setItem('oros_zen_mode', 'false'); }
        else {
          var panels = ['comments-panel', 'versions-panel', 'wordfreq-panel', 'metadata-panel', 'outline-panel', 'toc-panel', 'find-replace-bar'];
          for (var i = 0; i < panels.length; i++) {
            var p = document.getElementById(panels[i]);
            if (p && p.style.display !== 'none') { p.style.display = 'none'; return; }
          }
          var exp = document.getElementById('export-dropdown');
          if (exp && exp.classList.contains('active')) { exp.classList.remove('active'); return; }
          e.isHandledByWriter = false;
        }
      }
    });
  }

  // ===== COMMAND EXECUTION =====
  function execCmd(command, value) {
    if (command === 'insertImage' && value) {
      var img = document.createElement('img');
      img.src = value;
      richEditor.focus();
      document.execCommand('insertHTML', false, img.outerHTML);
      return;
    }
    richEditor.focus();
    document.execCommand(command, false, value);
  }

  // ===== TOOLBAR BINDINGS =====
  function setupToolbarBindings() {
    bindClick('btn-bold', function() { execCmd('bold'); });
    bindClick('btn-italic', function() { execCmd('italic'); });
    bindClick('btn-underline', function() { execCmd('underline'); });
    bindClick('btn-strikethrough', function() { execCmd('strikethrough'); });
    bindClick('btn-superscript', function() { execCmd('superscript'); });
    bindClick('btn-subscript', function() { execCmd('subscript'); });
    bindClick('btn-align-left', function() { execCmd('justifyLeft'); });
    bindClick('btn-align-center', function() { execCmd('justifyCenter'); });
    bindClick('btn-align-right', function() { execCmd('justifyRight'); });
    bindClick('btn-align-justify', function() { execCmd('justifyFull'); });
    bindClick('btn-orderedList', function() { execCmd('insertOrderedList'); });
    bindClick('btn-unorderedList', function() { execCmd('insertUnorderedList'); });
    bindClick('btn-indent', function() { execCmd('indent'); });
    bindClick('btn-outdent', function() { execCmd('outdent'); });
    bindClick('btn-link', function() {
      var url = prompt('Enter URL:');
      if (url) execCmd('createLink', url);
    });
    bindClick('btn-image', function() {
      var url = prompt('Enter image URL:');
      if (url) execCmd('insertImage', url);
    });
    bindClick('btn-code', function() { execCmd('formatBlock', 'pre'); });
    bindClick('btn-quote', function() { execCmd('formatBlock', 'blockquote'); });
    bindClick('btn-clear-formatting', function() { execCmd('removeFormat'); });
    bindClick('btn-undo', function() { execCmd('undo'); });
    bindClick('btn-redo', function() { execCmd('redo'); });
  }

  // ===== EDITOR INPUT =====
  function setupEditorInput() {
    if (!richEditor) return;

    richEditor.addEventListener('input', function() {
      playTypewriterSound();
      isTyping = true;
      clearTimeout(typingTimer);
      typingTimer = setTimeout(function() {
        if (isTyping) { saveCurrentTabContent(); isTyping = false; }
      }, 10000);
      updateStats();
      updateReadingProgress();
    });

    richEditor.addEventListener('paste', function(e) {
      if (!smartPasteEnabled) return;
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });

    richEditor.addEventListener('scroll', updateReadingProgress);

    richEditor.addEventListener('focus', function() {
      if (richEditor.innerHTML === '') richEditor.innerHTML = '<p><br></p>';
    });

    tabsModule.on('switch', function(tab) {
      if (!richEditor || !tab) return;
      richEditor.innerHTML = tab.content || '<p><br></p>';
      loadPageSettingsFields();
      loadMetadataFields();
      restoreFootnotes();
      loadAndRestoreComments();
      updateStats();
      updateSaveIndicator('saved');
      if (footnoteArea) {
        var existingEntries = footnoteArea.querySelectorAll('.footnote-entry');
        for (var i = 0; i < existingEntries.length; i++) existingEntries[i].remove();
        restoreFootnotes();
      }
    });
  }

  // ===== WINDOW RESIZE =====
  function setupWindowResize() {
    window.addEventListener('resize', function() {
      clearTimeout(windowResizeDebounce);
      windowResizeDebounce = setTimeout(function() {
        clampToViewport();
        if (tabsModule.initialized) tabsModule.render();
      }, 200);
    });
  }

  // ===== CLOSE WARNING =====
  function setupCloseWarning() {
    var warned = false;
    window.addEventListener('beforeunload', function(e) {
      if (warned) return;
      warned = true;
      setTimeout(function() { warned = false; }, 2000);
    });
  }

  // ===== PWA INSTALL BUTTON (Settings Modal) =====
  function setupPWAInstallButton() {
    var btn = document.getElementById('btn-install-pwa');
    if (!btn) return;
    btn.disabled = true;
    btn.addEventListener('click', function() {
      if (typeof window.orosShowInstallPrompt === 'function') {
        window.orosShowInstallPrompt(function() {
          btn.disabled = true;
          btn.style.display = 'none';
        });
      }
    });
  }

  // ===== METADATA PANEL =====
  function setupMetadataPanel() {
    bindClick('btn-metadata', toggleMetadataPanel);
    if (metaTitle) metaTitle.addEventListener('blur', saveMetadataField);
    if (metaAuthor) metaAuthor.addEventListener('blur', saveMetadataField);
    if (metaTags) metaTags.addEventListener('blur', saveMetadataField);
    if (metaCategory) metaCategory.addEventListener('blur', saveMetadataField);
    loadMetadataFields();
  }

  function toggleMetadataPanel() {
    if (!metadataPanel) return;
    metadataPanel.classList.toggle('active');
    var btn = document.getElementById('btn-metadata');
    if (btn) btn.classList.toggle('active', metadataPanel.classList.contains('active'));
  }

  function saveMetadataField() {
    var meta = tabsModule.getMetadata();
    if (metaTitle) meta.title = metaTitle.value;
    if (metaAuthor) meta.author = metaAuthor.value;
    if (metaTags) meta.tags = metaTags.value;
    if (metaCategory) meta.category = metaCategory.value;
    meta.modified = new Date().toISOString();
    tabsModule.setMetadata(meta);
    updateSaveIndicator('saved');
  }

  function loadMetadataFields() {
    var meta = tabsModule.getMetadata();
    if (metaTitle) metaTitle.value = meta.title || '';
    if (metaAuthor) metaAuthor.value = meta.author || '';
    if (metaTags) metaTags.value = meta.tags || '';
    if (metaCategory) metaCategory.value = meta.category || '';
    if (metaCreated) metaCreated.textContent = meta.created || '-';
    if (metaModified) metaModified.textContent = meta.modified || '-';
  }

  // ===== OUTLINE PANEL =====
  function setupOutlinePanel() {
    bindClick('btn-outline', toggleOutlinePanel);
  }

  function toggleOutlinePanel() {
    if (!outlinePanel) return;
    outlinePanel.classList.toggle('active');
    var btn = document.getElementById('btn-outline');
    if (btn) btn.classList.toggle('active', outlinePanel.classList.contains('active'));
    if (outlinePanel.classList.contains('active')) updateOutline();
  }

  // ===== TABLE OF CONTENTS =====
  function setupTableOfContents() {
    bindClick('btn-toc', toggleTocPanel);
  }

  function toggleTocPanel() {
    if (!tocPanel) return;
    tocPanel.classList.toggle('active');
    var btn = document.getElementById('btn-toc');
    if (btn) btn.classList.toggle('active', tocPanel.classList.contains('active'));
    if (tocPanel.classList.contains('active')) {
      if (tocList && outlineList) tocList.innerHTML = outlineList.innerHTML;
    }
  }

  // ===== LOREM IPSUM =====
  function setupLoremIpsum() {
    bindClick('btn-lorem', insertLorem);
  }

  function insertLorem() {
    var lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
    richEditor.focus();
    document.execCommand('insertText', false, lorem);
    updateStats();
  }

  // ===== INITIALIZATION =====
  function waitForTranslations(callback) {
    var attempts = 0;
    function check() {
      if (loadTranslations()) { callback(); return; }
      attempts++;
      if (attempts >= 50) { callback(); return; }
      setTimeout(check, 100);
    }
    check();
  }

  function startApp() {
    applyTheme();
    waitForTranslations(function() {
      currentLang = getCurrentLang();
      applyLanguage(currentLang);
      initializeElements();
      loadSettings();
      loadSettingsValues();
      loadAutoCorrections();
      loadCustomTemplates();
      loadGoal();
      loadSessionTarget();

      tabsModule.init('#tab-bar');
      setupStatsToggle();
      setupFindReplace();
      setupWordFrequency();
      setupComments();
      setupFootnotes();
      setupVersionHistory();
      setupZenMode();
      setupGoalBar();
      setupSessionTimer();
      setupExportImport();
      setupStyleSelector();
      setupKeyboardShortcuts();
      setupToolbarBindings();
      setupEditorInput();
      setupWindowResize();
      setupCloseWarning();
      setupPWAInstallButton();
      setupMetadataPanel();
      setupOutlinePanel();
      setupTableOfContents();
      setupTrackChanges();
      setupLoremIpsum();
      applyPageSettings();
      clampToViewport();

      var tab = tabsModule.getActive();
      if (tab && richEditor) {
        richEditor.innerHTML = tab.content || '<p><br></p>';
        restoreFootnotes();
        loadAndRestoreComments();
        updateStats();
      }

      renderTemplateSelect();
      renderCustomTemplates();
      renderAutocorrectRules();
      initialized = true;

      window.addEventListener('oros-language-changed', function(e) {
        applyLanguage(e.detail.lang);
        loadGoal();
      });

      window.addEventListener('oros-zen-mode-changed', function(e) {
        if (e.detail.enabled) document.body.setAttribute('data-zen', 'true');
        else document.body.removeAttribute('data-zen');
      });

      var welcomeMsg = getTrans('app_welcome');
showToast(welcomeMsg === 'app_welcome' ? 'Welcome to orOS Writer!' : welcomeMsg);
    });
  }

  function initializeElements() {
    richEditor = document.getElementById('rich-editor');
    richWrapper = document.querySelector('.rich-editor-wrapper');
    tabBar = document.querySelector('#tab-bar');
    saveIndicator = document.getElementById('save-indicator');
    statsOverlay = document.querySelector('.stats-overlay');
    statsDefaultEl = document.querySelector('.stats-default');
    statsGoalEl = document.querySelector('.stats-goal');
    statsDetailed = document.getElementById('stats-detailed');
    goalBar = document.querySelector('.goal-bar');
    goalBarContent = document.querySelector('.goal-bar-content');
    goalBarFill = document.querySelector('.goal-bar-fill');
    sessionBar = document.querySelector('.session-bar');
    sessionDisplay = document.getElementById('session-display');
    findBar = document.getElementById('find-bar');
    trackChangesBar = document.getElementById('track-changes-bar');
    stylesSelect = document.getElementById('styles-select');
    footnoteArea = document.getElementById('footnote-area');
    metadataPanel = document.getElementById('metadata-panel');
    outlinePanel = document.getElementById('outline-panel');
    outlineList = document.getElementById('outline-list');
    wordFreqPanel = document.getElementById('word-freq-panel');
    wordFreqList = document.getElementById('word-freq-list');
    wordFreqSummary = document.getElementById('word-freq-summary');
    commentsPanel = document.getElementById('comments-panel');
    tocPanel = document.getElementById('toc-panel');
    tocList = document.getElementById('toc-list');
    versionPanel = document.getElementById('versions-panel');
    versionList = document.getElementById('version-list');
    metaTitle = document.getElementById('meta-title');
    metaAuthor = document.getElementById('meta-author');
    metaTags = document.getElementById('meta-tags');
    metaCategory = document.getElementById('meta-category');
    metaCreated = document.getElementById('meta-created');
    metaModified = document.getElementById('meta-modified');
    exportDropdown = document.getElementById('export-dropdown');
    findInput = document.getElementById('find-input');
    replaceInput = document.getElementById('replace-input');
    frResults = document.getElementById('fr-results');
    findFormatFilter = document.getElementById('find-format-filter');
  }

  document.addEventListener('DOMContentLoaded', startApp);

  // Expose for external access
  window.orosWriter = {
    getTabContent: function() { return tabsModule.getContent(); },
    setTabContent: function(html) { tabsModule.setContent(html); },
    getMetadata: function() { return tabsModule.getMetadata(); },
    setMetadata: function(meta) { tabsModule.setMetadata(meta); },
    createTab: function(opts) { return tabsModule.create(opts); },
    switchTab: function(id) { tabsModule.switchTo(id); },
    closeTab: function(id) { tabsModule.close(id); }
  };

})();