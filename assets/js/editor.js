// ============================================
// orOS Writer — Unified Rich Text Editor
// v0.5-BETA | All Fixes: Focus Mode, Panel Positioning, Icons, Lorem Ipsum
// ============================================

(function() {
  'use strict';

  var STORAGE_KEY = 'oros_writer_content';
  var STORAGE_HIDE_STATS = 'oros_hide_stats';
  var STORAGE_FOCUS_MODE = 'oros_focus_mode';
  var STORAGE_READING_PROGRESS = 'oros_reading_progress';
  var STORAGE_SMART_TYPOGRAPHY = 'oros_smart_typography';
  var STORAGE_LAST_SAVED = 'oros_writer_last_saved';
  var STORAGE_GOAL_TARGET = 'oros_goal_target';
  var STORAGE_GOAL_UNIT = 'oros_goal_unit';
  var STORAGE_GOAL_LOCK = 'oros_goal_lock';
  var STORAGE_HIDE_GOAL_BTN = 'oros_hide_goal_btn';
  var STORAGE_HIDE_OUTLINE_BTN = 'oros_hide_outline_btn';
  var STORAGE_HIDE_METADATA_BTN = 'oros_hide_metadata_btn';
  var STORAGE_HIDE_FIND_BTN = 'oros_hide_find_btn';
  var STORAGE_HIDE_WORDFREQ_BTN = 'oros_hide_wordfreq_btn';
  var STORAGE_HIDE_SAVE_INDICATOR = 'oros_hide_save_indicator';
  var STORAGE_HIDE_LOREM_BTN = 'oros_hide_lorem_btn';
  var STORAGE_TYPEWRITER_SOUND = 'oros_typewriter_sound';
  var STORAGE_METADATA = 'oros_writer_metadata';

  var richEditor = document.getElementById('rich-editor');
  var richWrapper = document.getElementById('rich-wrapper');
  var findBar = document.getElementById('find-replace-bar');
  var findInput = document.getElementById('find-find');
  var replaceInput = document.getElementById('find-replace');
  var frResults = document.getElementById('fr_results');
  var btnSave = document.getElementById('btn-save');
  var btnOpen = document.getElementById('btn-open');
  var btnClear = document.getElementById('btn-clear');
  var btnExport = document.getElementById('btn-export');
  var btnLorem = document.getElementById('btn-lorem');
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

  var hideStats = localStorage.getItem(STORAGE_HIDE_STATS) === 'true';
  var quickTbarShow = localStorage.getItem('oros_quick_tbar_show') !== 'false';
  var focusModeEnabled = (localStorage.getItem(STORAGE_FOCUS_MODE) === 'true');
  var readingProgressEnabled = localStorage.getItem(STORAGE_READING_PROGRESS) !== 'false';
  var smartTypographyEnabled = localStorage.getItem(STORAGE_SMART_TYPOGRAPHY) !== 'false';
  var lastSavedTime = parseInt(localStorage.getItem(STORAGE_LAST_SAVED)) || null;
  var goalTarget = parseInt(localStorage.getItem(STORAGE_GOAL_TARGET)) || null;
  var goalUnit = localStorage.getItem(STORAGE_GOAL_UNIT) || 'words';
  var goalLockEnabled = localStorage.getItem(STORAGE_GOAL_LOCK) === 'true';
  var hideGoalBtn = localStorage.getItem(STORAGE_HIDE_GOAL_BTN) === 'true';
  var hideOutlineBtn = localStorage.getItem(STORAGE_HIDE_OUTLINE_BTN) === 'true';
  var hideMetadataBtn = localStorage.getItem(STORAGE_HIDE_METADATA_BTN) === 'true';
  var hideFindBtn = localStorage.getItem(STORAGE_HIDE_FIND_BTN) === 'true';
  var hideWordFreqBtn = localStorage.getItem(STORAGE_HIDE_WORDFREQ_BTN) === 'true';
  var hideSaveIndicator = localStorage.getItem(STORAGE_HIDE_SAVE_INDICATOR) === 'true';
  var hideLoremBtn = localStorage.getItem(STORAGE_HIDE_LOREM_BTN) === 'true';
  var typewriterSoundEnabled = localStorage.getItem(STORAGE_TYPEWRITER_SOUND) === 'true';
  var goalReachedShown = false;
  var goalLockTriggered = false;
  var currentMatchIndex = -1;
  var matchRanges = [];
  var statsExpanded = false;
  var wordFreqDebounce = null;
  var outlineDebounceTimer = null;
  var focusDebounceTimer = null;

  // ========== TYPEWRITER SOUND (Web Audio API) ==========
  var typewriterAudioCtx = null;
  var typewriterAudioBuffer = null;

  function initTypewriterSound() {
    try {
      typewriterAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

  // ========== HELPERS ==========
  function getCurrentLang() { return localStorage.getItem('oros-language') || 'en'; }
  function getTrans(key) {
    var lang = getCurrentLang();
    var t = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[lang]) || {};
    return t[key] || key;
  }
  function formatNumber(num) {
    return num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num.toString();
  }
  function getTextContent() {
    var text = richEditor.innerText || '';
    return text.replace(/\n$/, '');
  }

  // ========== PANE TOP OFFSET CALCULATION (FIXED) ==========
  function getPanelTopOffset() {
    var offset = 0;
    var headerInner = document.querySelector('.header');
    if (headerInner) offset += headerInner.offsetHeight;
    else offset += 56;
    var toolbar = document.getElementById('main-toolbar');
    if (toolbar) offset += toolbar.offsetHeight;
    if (goalBar && goalBar.style.display === 'flex') offset += goalBar.offsetHeight;
    if (findBar && findBar.style.display === 'flex') offset += findBar.offsetHeight;
    return offset + 'px';
  }

  // ========== LOREM IPSUM GENERATOR (ALL UNICODE ESCAPED) ==========
  function generateLoremIpsum() {
    var lang = getCurrentLang();
    var templates = {
      en: '<h1>Document Title</h1>' +
          '<p>Welcome to <strong>orOS Writer</strong>, a privacy-first rich text editor that works entirely offline. ' +
          'This sample text demonstrates <em>various formatting options</em> available in the editor, ' +
          'including <u>underlined text</u>, <strong>bold text</strong>, and <em>italic text</em>. ' +
          'All content is saved locally in your browser \u2014 no account, no server, no tracking.</p>' +
          '<ul><li>Bold, italic, and underline formatting</li>' +
          '<li>Headings (H1, H2, H3) for document structure</li>' +
          '<li>Bullet and numbered lists</li>' +
          '<li>Text alignment: left, center, right, justify</li>' +
          '<li>Blockquotes for emphasis</li></ul>' +
          '<h2>Smart Typography</h2>' +
          '<p>The editor features <strong>Smart Typography</strong>, which automatically converts common ' +
          'shortcuts into proper typographic characters as you type:</p>' +
          '<ul><li>Double hyphens (--) become an em dash (\u2014)</li>' +
          '<li>Three dots (...) become an ellipsis (\u2026)</li>' +
          '<li>Straight quotes become curly quotes (\u201C \u201D) and smart apostrophes (\u2018 \u2019)</li>' +
          '<li>(c) becomes \u00A9, (r) becomes \u00AE, and (tm) becomes \u2122</li></ul>' +
          '<p>Try typing these shortcuts yourself \u2014 just enable Smart Typography in Settings if it is not already on.</p>' +
          '<blockquote>Writing is easy. All you do is stare at a blank sheet of paper until drops of blood form on your forehead. \u2014 Gene Fowler</blockquote>' +
          '<h2>Editor Features</h2>' +
          '<p>orOS Writer includes a range of tools designed for writers, journalists, and bloggers:</p>' +
          '<ol><li>Automatic saving \u2014 your work is preserved after every keystroke</li>' +
          '<li>Export to Markdown, Plain Text, RTF, Word, or PDF</li>' +
          '<li>Document outline panel for navigating headings</li>' +
          '<li>Word frequency analysis to spot repetition and overused words</li>' +
          '<li>Document metadata for title, author, tags, and category</li>' +
          '<li>Writing goals with optional lock when the target is reached</li>' +
          '<li>Find and replace functionality</li>' +
          '<li>Reading progress bar and detailed statistics</li></ol>' +
          '<h2>Privacy First</h2>' +
          '<p>Everything happens in your browser. Your text never leaves your device. ' +
          'There are no analytics, no telemetry, no advertisements, and no accounts required. ' +
          'This is open-source software built with respect for your personal data.</p>' +
          '<h2>Offline Operation</h2>' +
          '<p>Once loaded, orOS Writer continues to work even without an internet connection. ' +
          'The application caches all resources using a service worker, enabling true offline capability. ' +
          'You can install it as a Progressive Web App (PWA) for even better integration with your device.</p>' +
          '<p>This is the <em>final paragraph</em> of the sample content. ' +
          'You can clear it anytime with the trash button, or start editing right away. ' +
          'The editor remembers your work between sessions, so feel free to close and return later. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>',
      el: '<h1>\u03A4\u03AF\u03C4\u03BB\u03BF\u03C2 \u0395\u03B3\u03B3\u03C1\u03AC\u03C6\u03BF\u03C5</h1>' +
          '<p>\u039A\u03B1\u03BB\u03CE\u03C2 \u03AE\u03C1\u03B8\u03B5\u03C2 \u03C3\u03C4\u03BF <strong>orOS Writer</strong>, ' +
          '\u03AD\u03BD\u03B1\u03BD \u03B5\u03C0\u03B5\u03BE\u03B5\u03C1\u03B3\u03B1\u03C3\u03C4\u03AE \u03BA\u03B5\u03B9\u03BC\u03AD\u03BD\u03BF\u03C5 \u03C0\u03BF\u03C5 \u03C3\u03B5\u03B2\u03B5\u03C4\u03B1\u03B9 \u03C4\u03BF \u03B1\u03C0\u03CC\u03C1\u03C1\u03B7\u03C4\u03BF ' +
          '\u03BA\u03B1\u03B9 \u03BB\u03B5\u03B9\u03C4\u03BF\u03C5\u03C1\u03B3\u03B5\u03AF \u03B5\u03BE \u03BF\u03BB\u03BF\u03BA\u03BB\u03AE\u03C1\u03BF\u03C5 offline. ' +
          '\u0391\u03C5\u03C4\u03CC \u03C4\u03BF \u03B4\u03BF\u03BA\u03B9\u03BC\u03B1\u03C3\u03C4\u03B9\u03BA\u03CC \u03BA\u03B5\u03AF\u03BC\u03B5\u03BD\u03BF \u03B5\u03C0\u03B9\u03B4\u03B5\u03B9\u03BA\u03BD\u03CD\u03B5\u03B9 ' +
          '<em>\u03B4\u03B9\u03AC\u03C6\u03BF\u03C1\u03B5\u03C2 \u03B5\u03C0\u03B9\u03BB\u03BF\u03B3\u03AD\u03C2 \u03BC\u03BF\u03C1\u03C6\u03BF\u03C0\u03BF\u03AF\u03B7\u03C3\u03B7\u03C2</em> \u03C4\u03BF\u03C5 editor, ' +
          '\u03C3\u03C5\u03BC\u03C0\u03B5\u03C1\u03B9\u03BB\u03B1\u03BC\u03B2\u03B1\u03BD\u03BF\u03BC\u03AD\u03BD\u03BF\u03C5 ' +
          '<u>\u03C5\u03C0\u03BF\u03B3\u03B5\u03B3\u03C1\u03B1\u03BC\u03BC\u03AD\u03BD\u03BF\u03C5 \u03BA\u03B5\u03B9\u03BC\u03AD\u03BD\u03BF\u03C5</u>, ' +
          '<strong>\u03AD\u03BD\u03C4\u03BF\u03BD\u03BF\u03C5 \u03BA\u03B5\u03B9\u03BC\u03AD\u03BD\u03BF\u03C5</strong>, ' +
          '\u03BA\u03B1\u03B9 <em>\u03C0\u03BB\u03AC\u03B3\u03B9\u03BF\u03C5 \u03BA\u03B5\u03B9\u03BC\u03AD\u03BD\u03BF\u03C5</em>. ' +
          '\u038C\u03BB\u03BF \u03C4\u03BF \u03C0\u03B5\u03C1\u03B9\u03B5\u03C7\u03CC\u03BC\u03B5\u03BD\u03BF \u03B1\u03C0\u03BF\u03B8\u03B7\u03BA\u03B5\u03CD\u03B5\u03C4\u03B1\u03B9 \u03C4\u03BF\u03C0\u03B9\u03BA\u03AC \u03C3\u03C4\u03BF\u03BD browser \u2014 ' +
          '\u03C7\u03C9\u03C1\u03AF\u03C2 \u03BB\u03BF\u03B3\u03B1\u03C1\u03B9\u03B1\u03C3\u03BC\u03CC, \u03C7\u03C9\u03C1\u03AF\u03C2 server, \u03C7\u03C9\u03C1\u03AF\u03C2 \u03C0\u03B1\u03C1\u03B1\u03BA\u03BF\u03BB\u03BF\u03CD\u03B8\u03B7\u03C3\u03B7.</p>' +
          '<ul><li>\u039C\u03BF\u03C1\u03C6\u03BF\u03C0\u03BF\u03AF\u03B7\u03C3\u03B7 \u03AD\u03BD\u03C4\u03BF\u03BD\u03B1, \u03C0\u03BB\u03AC\u03B3\u03B9\u03B1, \u03C5\u03C0\u03BF\u03B3\u03C1\u03AC\u03BC\u03BC\u03B9\u03C3\u03B7</li>' +
          '<li>\u03A4\u03AF\u03C4\u03BB\u03BF\u03B9 (H1, H2, H3) \u03B3\u03B9\u03B1 \u03B4\u03BF\u03BC\u03AE \u03B5\u03B3\u03B3\u03C1\u03AC\u03C6\u03BF\u03C5</li>' +
          '<li>\u039B\u03AF\u03C3\u03C4\u03B5\u03C2 \u03BA\u03BF\u03C5\u03BA\u03BA\u03AF\u03B4\u03C9\u03BD \u03BA\u03B1\u03B9 \u03B1\u03C1\u03B9\u03B8\u03BC\u03B7\u03BC\u03AD\u03BD\u03B5\u03C2</li>' +
          '<li>\u03A3\u03C4\u03BF\u03AF\u03C7\u03B9\u03C3\u03B7 \u03BA\u03B5\u03B9\u03BC\u03AD\u03BD\u03BF\u03C5: \u03B1\u03C1\u03B9\u03C3\u03C4\u03B5\u03C1\u03AC, \u03BA\u03AD\u03BD\u03C4\u03C1\u03BF, \u03B4\u03B5\u03BE\u03B9\u03AC, \u03C0\u03BB\u03B7\u03C1\u03AE\u03C2</li>' +
          '<li>\u0391\u03C0\u03BF\u03C3\u03C0\u03AC\u03C3\u03BC\u03B1\u03C4\u03B1 \u03B3\u03B9\u03B1 \u03AD\u03BC\u03C6\u03B1\u03C3\u03B7</li></ul>' +
          '<h2>\u0388\u03BE\u03C5\u03C0\u03BD\u03B7 \u03A4\u03C5\u03C0\u03BF\u03B3\u03C1\u03B1\u03C6\u03AF\u03B1</h2>' +
          '<p>\u039F editor \u03B4\u03B9\u03B1\u03B8\u03AD\u03C4\u03B5\u03B9 <strong>\u0388\u03BE\u03C5\u03C0\u03BD\u03B7 \u03A4\u03C5\u03C0\u03BF\u03B3\u03C1\u03B1\u03C6\u03AF\u03B1</strong>, ' +
          '\u03C0\u03BF\u03C5 \u03BC\u03B5\u03C4\u03B1\u03C4\u03C1\u03AD\u03C0\u03B5\u03B9 \u03B1\u03C5\u03C4\u03CC\u03BC\u03B1\u03C4\u03B1 ' +
          '\u03C3\u03C5\u03BD\u03B7\u03B8\u03B9\u03C3\u03BC\u03AD\u03BD\u03B5\u03C2 \u03C3\u03C5\u03BD\u03C4\u03BF\u03BC\u03BF\u03B3\u03C1\u03B1\u03C6\u03AF\u03B5\u03C2 \u03C3\u03B5 \u03C3\u03C9\u03C3\u03C4\u03BF\u03CD\u03C2 ' +
          '\u03C4\u03C5\u03C0\u03BF\u03B3\u03C1\u03B1\u03C6\u03B9\u03BA\u03BF\u03CD\u03C2 \u03C7\u03B1\u03C1\u03B1\u03BA\u03C4\u03AE\u03C1\u03B5\u03C2 \u03BA\u03B1\u03B8\u03CE\u03C2 \u03C0\u03BB\u03B7\u03BA\u03C4\u03C1\u03BF\u03BB\u03BF\u03B3\u03B5\u03AF\u03C2:</p>' +
          '<ul><li>\u0394\u03B9\u03C0\u03BB\u03AD\u03C2 \u03C0\u03B1\u03CD\u03BB\u03B5\u03C2 (--) \u03B3\u03AF\u03BD\u03BF\u03BD\u03C4\u03B1\u03B9 \u03BC\u03B1\u03BA\u03C1\u03AC \u03C0\u03B1\u03CD\u03BB\u03B1 (\u2014)</li>' +
          '<li>\u03A4\u03C1\u03B5\u03B9\u03C2 \u03C4\u03B5\u03BB\u03B5\u03AF\u03B5\u03C2 (...) \u03B3\u03AF\u03BD\u03BF\u03BD\u03C4\u03B1\u03B9 \u03B1\u03C0\u03BF\u03C3\u03B9\u03C9\u03C0\u03B7\u03C4\u03B9\u03BA\u03AC (\u2026)</li>' +
          '<li>\u0391\u03C0\u03BB\u03AC \u03B5\u03B9\u03C3\u03B1\u03B3\u03C9\u03B3\u03B9\u03BA\u03AC \u03B3\u03AF\u03BD\u03BF\u03BD\u03C4\u03B1\u03B9 \u03BA\u03B1\u03BC\u03C0\u03CD\u03BB\u03B1 \u03B5\u03B9\u03C3\u03B1\u03B3\u03C9\u03B3\u03B9\u03BA\u03AC (\u201C \u201D) ' +
          '\u03BA\u03B1\u03B9 \u03AD\u03BE\u03C5\u03C0\u03BD\u03B1 \u03B1\u03C0\u03BF\u03C3\u03C4\u03CC\u03C6\u03B9\u03B1 (\u2018 \u2019)</li>' +
          '<li>(c) \u03B3\u03AF\u03BD\u03B5\u03C4\u03B1\u03B9 \u00A9, (r) \u03B3\u03AF\u03BD\u03B5\u03C4\u03B1\u03B9 \u00AE, \u03BA\u03B1\u03B9 (tm) \u03B3\u03AF\u03BD\u03B5\u03C4\u03B1\u03B9 \u2122</li></ul>' +
          '<p>\u0394\u03BF\u03BA\u03AF\u03BC\u03B1\u03C3\u03B5 \u03BD\u03B1 \u03C0\u03BB\u03B7\u03BA\u03C4\u03C1\u03BF\u03BB\u03BF\u03B3\u03AE\u03C3\u03B5\u03B9\u03C2 \u03B1\u03C5\u03C4\u03AD\u03C2 \u03C4\u03B9\u03C2 \u03C3\u03C5\u03BD\u03C4\u03BF\u03BC\u03BF\u03B3\u03C1\u03B1\u03C6\u03AF\u03B5\u03C2 \u03BC\u03CC\u03BD\u03BF\u03C2 \u03C3\u03BF\u03C5 \u2014 ' +
          '\u03B1\u03C0\u03BB\u03AC \u03B5\u03BD\u03B5\u03C1\u03B3\u03BF\u03C0\u03BF\u03AF\u03B7\u03C3\u03B5 \u03C4\u03B7\u03BD \u0388\u03BE\u03C5\u03C0\u03BD\u03B7 \u03A4\u03C5\u03C0\u03BF\u03B3\u03C1\u03B1\u03C6\u03AF\u03B1 \u03C3\u03C4\u03B9\u03C2 \u03A1\u03C5\u03B8\u03BC\u03AF\u03C3\u03B5\u03B9\u03C2 ' +
          '\u03B1\u03BD \u03B4\u03B5\u03BD \u03B5\u03AF\u03BD\u03B1\u03B9 \u03AE\u03B4\u03B7 \u03B5\u03BD\u03B5\u03C1\u03B3\u03AE.</p>' +
          '<blockquote>\u0397 \u03B3\u03C1\u03B1\u03C6\u03AE \u03B5\u03AF\u03BD\u03B1\u03B9 \u03B5\u03CD\u03BA\u03BF\u03BB\u03B7. \u0391\u03C0\u03BB\u03AC \u03BA\u03BF\u03B9\u03C4\u03AC\u03C2 \u03AD\u03BD\u03B1 ' +
          '\u03BB\u03B5\u03C5\u03BA\u03CC \u03C6\u03CD\u03BB\u03BB\u03BF \u03C7\u03B1\u03C1\u03C4\u03B9\u03BF\u03CD \u03BC\u03AD\u03C7\u03C1\u03B9 \u03BD\u03B1 \u03C3\u03C4\u03B1\u03BB\u03AC\u03BE\u03B5\u03B9\u03C2 \u03C3\u03C4\u03B1\u03B3\u03CC\u03BD\u03B5\u03C2 ' +
          '\u03B1\u03AF\u03BC\u03B1\u03C4\u03BF\u03C2 \u03C3\u03C4\u03BF \u03BC\u03AD\u03C4\u03C9\u03C0\u03CC \u03C3\u03BF\u03C5. \u2014 Gene Fowler</blockquote>' +
          '<h2>\u039B\u03B5\u03B9\u03C4\u03BF\u03C5\u03C1\u03B3\u03AF\u03B5\u03C2 Editor</h2>' +
          '<p>\u039F orOS Writer \u03C0\u03B5\u03C1\u03B9\u03BB\u03B1\u03BC\u03B2\u03AC\u03BD\u03B5\u03B9 \u03BC\u03B9\u03B1 \u03C3\u03B5\u03B9\u03C1\u03AC \u03B5\u03C1\u03B3\u03B1\u03BB\u03B5\u03AF\u03C9\u03BD ' +
          '\u03C3\u03C7\u03B5\u03B4\u03B9\u03B1\u03C3\u03BC\u03AD\u03BD\u03C9\u03BD \u03B3\u03B9\u03B1 \u03C3\u03C5\u03B3\u03B3\u03C1\u03B1\u03C6\u03B5\u03AF\u03C2, \u03B4\u03B7\u03BC\u03BF\u03C3\u03B9\u03BF\u03B3\u03C1\u03AC\u03C6\u03BF\u03C5\u03C2 \u03BA\u03B1\u03B9 bloggers:</p>' +
          '<ol><li>\u0391\u03C5\u03C4\u03CC\u03BC\u03B1\u03C4\u03B7 \u03B1\u03C0\u03BF\u03B8\u03AE\u03BA\u03B5\u03C5\u03C3\u03B7 \u2014 \u03B7 \u03B4\u03BF\u03C5\u03BB\u03B5\u03B9\u03AC \u03C3\u03BF\u03C5 ' +
          '\u03C3\u03CE\u03B6\u03B5\u03C4\u03B1\u03B9 \u03BC\u03B5\u03C4\u03AC \u03B1\u03C0\u03CC \u03BA\u03AC\u03B8\u03B5 \u03C0\u03BB\u03B7\u03BA\u03C4\u03C1\u03BF\u03BB\u03CC\u03B3\u03B7\u03C3\u03B7</li>' +
          '<li>\u0395\u03BE\u03B1\u03B3\u03C9\u03B3\u03AE \u03C3\u03B5 Markdown, \u0391\u03C0\u03BB\u03CC \u039A\u03B5\u03AF\u03BC\u03B5\u03BD\u03BF, RTF, Word \u03AE PDF</li>' +
          '<li>\u03A0\u03AF\u03BD\u03B1\u03BA\u03B1\u03C2 \u03B4\u03BF\u03BC\u03AE\u03C2 \u03B5\u03B3\u03B3\u03C1\u03AC\u03C6\u03BF\u03C5 \u03B3\u03B9\u03B1 \u03C0\u03BB\u03BF\u03B9\u03B3\u03B7\u03C3\u03B7 \u03C3\u03C4\u03BF\u03C5\u03C2 \u03C4\u03AF\u03C4\u03BB\u03BF\u03C5\u03C2</li>' +
          '<li>\u0391\u03BD\u03AC\u03BB\u03C5\u03C3\u03B7 \u03C3\u03C5\u03C7\u03BD\u03CC\u03C4\u03B7\u03C4\u03B1\u03C2 \u03BB\u03AD\u03BE\u03B5\u03C9\u03BD \u03B3\u03B9\u03B1 \u03B5\u03BD\u03C4\u03BF\u03C0\u03B9\u03C3\u03BC\u03CC \u03B5\u03C0\u03B1\u03BD\u03B1\u03BB\u03AE\u03C8\u03B5\u03C9\u03BD</li>' +
          '<li>\u039C\u03B5\u03C4\u03B1\u03B4\u03B5\u03B4\u03BF\u03BC\u03AD\u03BD\u03B1 \u03B5\u03B3\u03B3\u03C1\u03AC\u03C6\u03BF\u03C5 \u03B3\u03B9\u03B1 \u03C4\u03AF\u03C4\u03BB\u03BF, ' +
          '\u03C3\u03C5\u03B3\u03B3\u03C1\u03B1\u03C6\u03AD\u03B1, \u03B5\u03C4\u03B9\u03BA\u03AD\u03C4\u03B5\u03C2 \u03BA\u03B1\u03B9 \u03BA\u03B1\u03C4\u03B7\u03B3\u03BF\u03C1\u03AF\u03B1</li>' +
          '<li>\u03A3\u03C4\u03CC\u03C7\u03BF\u03B9 \u03B3\u03C1\u03B1\u03C6\u03AE\u03C2 \u03BC\u03B5 \u03C0\u03C1\u03BF\u03B1\u03B9\u03C1\u03B5\u03C4\u03B9\u03BA\u03CC \u03BA\u03BB\u03B5\u03AF\u03B4\u03C9\u03BC\u03B1 ' +
          '\u03CC\u03C4\u03B1\u03BD \u03B5\u03C0\u03B9\u03C4\u03C5\u03B3\u03C7\u03AC\u03BD\u03BF\u03BD\u03C4\u03B1\u03B9</li>' +
          '<li>\u0395\u03CD\u03C1\u03B5\u03C3\u03B7 \u03BA\u03B1\u03B9 \u03B1\u03BD\u03C4\u03B9\u03BA\u03B1\u03C4\u03AC\u03C3\u03C4\u03B1\u03C3\u03B7 \u03BA\u03B5\u03B9\u03BC\u03AD\u03BD\u03BF\u03C5</li>' +
          '<li>\u039C\u03C0\u03AC\u03C1\u03B1 \u03C0\u03C1\u03BF\u03CC\u03B4\u03BF\u03C5 \u03B1\u03BD\u03AC\u03B3\u03BD\u03C9\u03C3\u03B7\u03C2 \u03BA\u03B1\u03B9 \u03B1\u03BD\u03B1\u03BB\u03C5\u03C4\u03B9\u03BA\u03AC \u03C3\u03C4\u03B1\u03C4\u03B9\u03C3\u03C4\u03B9\u03BA\u03AC</li></ol>' +
          '<h2>\u0391\u03C0\u03CC\u03C1\u03C1\u03B7\u03C4\u03BF \u03A0\u03C1\u03CE\u03C4\u03B1</h2>' +
          '<p>\u038C\u03BB\u03B1 \u03C3\u03C5\u03BC\u03B2\u03B1\u03AF\u03BD\u03BF\u03C5\u03BD \u03C3\u03C4\u03BF\u03BD browser \u03C3\u03BF\u03C5. \u03A4\u03BF \u03BA\u03B5\u03AF\u03BC\u03B5\u03BD\u03CC \u03C3\u03BF\u03C5 ' +
          '\u03B4\u03B5\u03BD \u03C6\u03B5\u03CD\u03B3\u03B5\u03B9 \u03C0\u03BF\u03C4\u03AD \u03B1\u03C0\u03CC \u03C4\u03B7 \u03C3\u03C5\u03C3\u03BA\u03B5\u03C5\u03AE \u03C3\u03BF\u03C5. ' +
          '\u0394\u03B5\u03BD \u03C5\u03C0\u03AC\u03C1\u03C7\u03BF\u03C5\u03BD \u03B1\u03BD\u03B1\u03BB\u03C5\u03C4\u03B9\u03BA\u03AC \u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1, \u03C4\u03B7\u03BB\u03B5\u03BC\u03B5\u03C4\u03C1\u03AF\u03B1, ' +
          '\u03B4\u03B9\u03B1\u03C6\u03B7\u03BC\u03AF\u03C3\u03B5\u03B9\u03C2, \u03AE \u03BB\u03BF\u03B3\u03B1\u03C1\u03B9\u03B1\u03C3\u03BC\u03BF\u03AF. ' +
          '\u0391\u03C5\u03C4\u03CC \u03B5\u03AF\u03BD\u03B1\u03B9 \u03BB\u03BF\u03B3\u03B9\u03C3\u03BC\u03B9\u03BA\u03CC \u03B1\u03BD\u03BF\u03B9\u03BA\u03C4\u03BF\u03CD \u03BA\u03CE\u03B4\u03B9\u03BA\u03B1, ' +
          '\u03C6\u03C4\u03B9\u03B1\u03B3\u03BC\u03AD\u03BD\u03BF \u03BC\u03B5 \u03C3\u03B5\u03B2\u03B1\u03C3\u03BC\u03CC \u03B3\u03B9\u03B1 \u03C4\u03B1 \u03C0\u03C1\u03BF\u03C3\u03C9\u03C0\u03B9\u03BA\u03AC \u03C3\u03BF\u03C5 \u03B4\u03B5\u03B4\u03BF\u03BC\u03AD\u03BD\u03B1.</p>' +
          '<h2>\u039B\u03B5\u03B9\u03C4\u03BF\u03C5\u03C1\u03B3\u03AF\u03B1 Offline</h2>' +
          '<p>\u039C\u03CC\u03BB\u03B9\u03C2 \u03C6\u03BF\u03C1\u03C4\u03CE\u03C3\u03B5\u03B9, \u03BF orOS Writer \u03C3\u03C5\u03BD\u03B5\u03C7\u03AF\u03B6\u03B5\u03B9 \u03BD\u03B1 \u03BB\u03B5\u03B9\u03C4\u03BF\u03C5\u03C1\u03B3\u03B5\u03AF ' +
          '\u03B1\u03BA\u03CC\u03BC\u03B1 \u03BA\u03B1\u03B9 \u03C7\u03C9\u03C1\u03AF\u03C2 \u03C3\u03CD\u03BD\u03B4\u03B5\u03C3\u03B7 \u03C3\u03C4\u03BF \u03AF\u03BD\u03C4\u03B5\u03C1\u03BD\u03B5\u03C4. ' +
          '\u0397 \u03B5\u03C6\u03B1\u03C1\u03BC\u03BF\u03B3\u03AE \u03B1\u03C0\u03BF\u03B8\u03B7\u03BA\u03B5\u03CD\u03B5\u03B9 \u03CC\u03BB\u03BF\u03C5\u03C2 \u03C4\u03BF\u03C5\u03C2 \u03C0\u03CC\u03C1\u03BF\u03C5\u03C2 ' +
          '\u03C7\u03C1\u03B7\u03C3\u03B9\u03BC\u03BF\u03C0\u03BF\u03B9\u03CE\u03BD\u03C4\u03B1\u03C2 service worker, \u03B5\u03C0\u03B9\u03C4\u03C1\u03AD\u03C0\u03BF\u03BD\u03C4\u03B1\u03C2 ' +
          '\u03C0\u03C1\u03B1\u03B3\u03BC\u03B1\u03C4\u03B9\u03BA\u03AE offline \u03B4\u03C5\u03BD\u03B1\u03C4\u03CC\u03C4\u03B7\u03C4\u03B1. ' +
          '\u039C\u03C0\u03BF\u03C1\u03B5\u03AF\u03C2 \u03BD\u03B1 \u03C4\u03B7\u03BD \u03B5\u03B3\u03BA\u03B1\u03C4\u03B1\u03C3\u03C4\u03AE\u03C3\u03B5\u03B9\u03C2 \u03C9\u03C2 ' +
          'Progressive Web App (PWA) \u03B3\u03B9\u03B1 \u03B1\u03BA\u03CC\u03BC\u03B1 \u03BA\u03B1\u03BB\u03CD\u03C4\u03B5\u03C1\u03B7 ' +
          '\u03BF\u03BB\u03BF\u03BA\u03BB\u03AE\u03C1\u03C9\u03C3\u03B7 \u03BC\u03B5 \u03C4\u03B7 \u03C3\u03C5\u03C3\u03BA\u03B5\u03C5\u03AE \u03C3\u03BF\u03C5.</p>' +
          '<p>\u0391\u03C5\u03C4\u03AE \u03B5\u03AF\u03BD\u03B1\u03B9 \u03B7 <em>\u03C4\u03B5\u03BB\u03B5\u03C5\u03C4\u03B1\u03AF\u03B1 \u03C0\u03B1\u03C1\u03AC\u03B3\u03C1\u03B1\u03C6\u03BF\u03C2</em> ' +
          '\u03C4\u03BF\u03C5 \u03B4\u03BF\u03BA\u03B9\u03BC\u03B1\u03C3\u03C4\u03B9\u03BA\u03BF\u03CD \u03BA\u03B5\u03B9\u03BC\u03AD\u03BD\u03BF\u03C5. ' +
          '\u039C\u03C0\u03BF\u03C1\u03B5\u03B9\u03C2 \u03BD\u03B1 \u03C4\u03B7\u03BD \u03BA\u03B1\u03B8\u03B1\u03C1\u03AF\u03C3\u03B5\u03B9\u03C2 \u03B1\u03BD\u03AC \u03C0\u03AC\u03C3\u03B1 \u03C3\u03C4\u03B9\u03B3\u03BC\u03AE ' +
          '\u03BC\u03B5 \u03C4\u03BF \u03BA\u03BF\u03C5\u03BC\u03C0\u03AF \u03B4\u03B9\u03B1\u03B3\u03C1\u03B1\u03C6\u03AE\u03C2, \u03AE \u03BD\u03B1 \u03BE\u03B5\u03BA\u03B9\u03BD\u03AE\u03C3\u03B5\u03B9\u03C2 ' +
          '\u03BD\u03B1 \u03B5\u03C0\u03B5\u03BE\u03B5\u03C1\u03B3\u03AC\u03B6\u03B5\u03C3\u03B1\u03B9 \u03B1\u03BC\u03AD\u03C3\u03C9\u03C2. ' +
          '\u039F editor \u03B8\u03C5\u03BC\u03AC\u03C4\u03B1\u03B9 \u03C4\u03B7 \u03B4\u03BF\u03C5\u03BB\u03B5\u03B9\u03AC \u03C3\u03BF\u03C5 \u03BC\u03B5\u03C4\u03B1\u03BE\u03CD \u03C4\u03C9\u03BD \u03C3\u03C5\u03BD\u03B5\u03B4\u03C1\u03B9\u03CE\u03BD, ' +
          '\u03BF\u03C0\u03CC\u03C4\u03B5 \u039C\u03C0\u03BF\u03C1\u03B5\u03B9\u03C2 \u03BD\u03B1 \u03BA\u03BB\u03B5\u03AF\u03C3\u03B5\u03B9\u03C2 \u03BA\u03B1\u03B9 \u03BD\u03B1 \u03B5\u03C0\u03B9\u03C3\u03C4\u03C1\u03AD\u03C8\u03B5\u03B9\u03C2 \u03B1\u03C1\u03B3\u03CC\u03C4\u03B5\u03C1\u03B1. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>',
      es: '<h1>T\u00edtulo del Documento</h1>' +
          '<p>Bienvenido a <strong>orOS Writer</strong>, un editor de texto que respeta tu privacidad ' +
          'y funciona completamente sin conexi\u00f3n. Este texto de muestra demuestra ' +
          '<em>varias opciones de formato</em> disponibles en el editor, ' +
          'incluyendo <u>texto subrayado</u>, <strong>texto en negrita</strong>, ' +
          'y <em>texto en cursiva</em>. ' +
          'Todo el contenido se guarda localmente en tu navegador \u2014 ' +
          'sin cuenta, sin servidor, sin rastreo.</p>' +
          '<ul><li>Formato negrita, cursiva y subrayado</li>' +
          '<li>Encabezados (H1, H2, H3) para estructura</li>' +
          '<li>Listas de vi\u00f1etas y numeradas</li>' +
          '<li>Opciones de alineaci\u00f3n de texto</li>' +
          '<li>Citas para \u00e9nfasis</li></ul>' +
          '<h2>Tipograf\u00eda Inteligente</h2>' +
          '<p>El editor incluye <strong>Tipograf\u00eda Inteligente</strong>, que convierte autom\u00e1ticamente ' +
          'atajos comunes en caracteres tipogr\u00e1ficos correctos mientras escribes:</p>' +
          '<ul><li>Dobles guiones (--) se convierten en guion largo (\u2014)</li>' +
          '<li>Tres puntos (...) se convierten en puntos suspensivos (\u2026)</li>' +
          '<li>Comillas rectas se convierten en comillas tipogr\u00e1ficas (\u201C \u201D) y ap\u00f3strofos inteligentes (\u2018 \u2019)</li>' +
          '<li>(c) se convierte en \u00A9, (r) en \u00AE, y (tm) en \u2122</li></ul>' +
          '<p>Prueba a escribir estos atajos t\u00fa mismo \u2014 solo activa la Tipograf\u00eda Inteligente en Configuraci\u00f3n si a\u00fan no est\u00e1 activada.</p>' +
          '<blockquote>Escribir es f\u00e1cil. Solo miras una hoja de papel en blanco hasta que gotas de sangre se forman en tu frente. \u2014 Gene Fowler</blockquote>' +
          '<h2>Funciones del Editor</h2>' +
          '<p>orOS Writer incluye una gama de herramientas dise\u00f1adas para escritores, periodistas y bloggers:</p>' +
          '<ol><li>Guardado autom\u00e1tico \u2014 tu trabajo se preserva tras cada pulsaci\u00f3n</li>' +
          '<li>Exportar a Markdown, Texto Plano, RTF, Word o PDF</li>' +
          '<li>Panel de esquema del documento para navegar por los encabezados</li>' +
          '<li>An\u00e1lisis de frecuencia de palabras para detectar repeticiones</li>' +
          '<li>Metadatos del documento para t\u00edtulo, autor, etiquetas y categor\u00eda</li>' +
          '<li>Objetivos de escritura con bloqueo opcional al alcanzar la meta</li>' +
          '<li>Funci\u00f3n de buscar y reemplazar</li>' +
          '<li>Barra de progreso de lectura y estad\u00edsticas detalladas</li></ol>' +
          '<h2>Privacidad Primero</h2>' +
          '<p>Todo ocurre en tu navegador. Tu texto nunca sale de tu dispositivo. ' +
          'No hay anal\u00edticas, ni telemetr\u00eda, ni anuncios, ni cuentas requeridas. ' +
          'Esto es software de c\u00f3digo abierto, creado con respeto por tus datos personales.</p>' +
          '<h2>Operaci\u00f3n Sin Conexi\u00f3n</h2>' +
          '<p>Una vez cargado, orOS Writer sigue funcionando incluso sin conexi\u00f3n a Internet. ' +
          'La aplicaci\u00f3n almacena todos los recursos usando un service worker, permitiendo verdadera capacidad offline. ' +
          'Puedes instalarla como Progressive Web App (PWA) para mejor integraci\u00f3n con tu dispositivo.</p>' +
          '<p>Este es el <em>p\u00e1rrafo final</em> del contenido de muestra. ' +
          'Puedes borrarlo en cualquier momento con el bot\u00f3n de papelera, o empezar a editar de inmediato. ' +
          'El editor recuerda tu trabajo entre sesiones, as\u00ed que si\u00e9ntete libre de cerrar y volver m\u00e1s tarde. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>',
      it: '<h1>Titolo del Documento</h1>' +
          '<p>Benvenuto in <strong>orOS Writer</strong>, un editor di testo che rispetta la tua privacy ' +
          'e funziona completamente offline. Questo testo di esempio dimostra ' +
          '<em>varie opzioni di formattazione</em> disponibili nell\'editor, ' +
          'inclusi <u>testo sottolineato</u>, <strong>testo in grassetto</strong>, ' +
          'e <em>testo in corsivo</em>. ' +
          'Tutti i contenuti vengono salvati localmente nel tuo browser \u2014 ' +
          'nessun account, nessun server, nessun tracciamento.</p>' +
          '<ul><li>Formattazione grassetto, corsivo e sottolineato</li>' +
          '<li>Intestazioni (H1, H2, H3) per la struttura</li>' +
          '<li>Elenchi puntati e numerati</li>' +
          '<li>Opzioni di allineamento del testo</li>' +
          '<li>Citazioni per enfasi</li></ul>' +
          '<h2>Tipografia Intelligente</h2>' +
          '<p>L\'editor include la <strong>Tipografia Intelligente</strong>, che converte automaticamente ' +
          'scorciatoie comuni in caratteri tipografici corretti mentre scrivi:</p>' +
          '<ul><li>Doppi trattini (--) diventano un trattino lungo (\u2014)</li>' +
          '<li>Tre punti (...) diventano puntini di sospensione (\u2026)</li>' +
          '<li>Le virgolette dritte diventano virgolette tipografiche (\u201C \u201D) e apostrofi intelligenti (\u2018 \u2019)</li>' +
          '<li>(c) diventa \u00A9, (r) diventa \u00AE, e (tm) diventa \u2122</li></ul>' +
          '<p>Prova a digitare queste scorciatoie tu stesso \u2014 basta attivare la Tipografia Intelligente nelle Impostazioni se non \u00e8 gi\u00e0 attiva.</p>' +
          '<blockquote>Scrivere \u00e8 facile. Devi solo fissare un foglio di carta bianca finch\u00e9 non ti si formano gocce di sangue sulla fronte. \u2014 Gene Fowler</blockquote>' +
          '<h2>Funzioni dell\'Editor</h2>' +
          '<p>orOS Writer include una gamma di strumenti progettati per scrittori, giornalisti e blogger:</p>' +
          '<ol><li>Salvataggio automatico \u2014 il tuo lavoro viene preservato dopo ogni battitura</li>' +
          '<li>Esportazione in Markdown, Testo Semplice, RTF, Word o PDF</li>' +
          '<li>Pannello struttura del documento per navigare tra le intestazioni</li>' +
          '<li>Analisi della frequenza delle parole per individuare ripetizioni</li>' +
          '<li>Metadati del documento per titolo, autore, tag e categoria</li>' +
          '<li>Obiettivi di scrittura con blocco opzionale al raggiungimento della meta</li>' +
          '<li>Funzione di trova e sostituisci</li>' +
          '<li>Barra di avanzamento della lettura e statistiche dettagliate</li></ol>' +
          '<h2>Prima la Privacy</h2>' +
          '<p>Tutto avviene nel tuo browser. Il tuo testo non lascia mai il tuo dispositivo. ' +
          'Non ci sono analitiche, telemetria, pubblicit\u00e0, n\u00e9 account richiesti. ' +
          'Questo \u00e8 software open source, creato con rispetto per i tuoi dati personali.</p>' +
          '<h2>Operativit\u00e0 Offline</h2>' +
          '<p>Una volta caricato, orOS Writer continua di funzionare anche senza connessione a Internet. ' +
          'L\'applicazione memorizza tutte le risorse utilizzando un service worker, consentendo vera capacit\u00e0 offline. ' +
          'Puoi installarla come Progressive Web App (PWA) per migliore integrazione con il tuo dispositivo.</p>' +
          '<p>Questo \u00e8 il <em>paragrafo finale</em> del contenuto di esempio. ' +
          'Puoi cancellarlo in qualsiasi momento con il pulsante del cestino, o iniziare a modificare subito. ' +
          'L\'editor ricorda il tuo lavoro tra le sessioni, quindi sentiti libero di chiudere e tornare pi\u00f9 tardi. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>',
      fr: '<h1>Titre du Document</h1>' +
          '<p>Bienvenue dans <strong>orOS Writer</strong>, un \u00e9diteur de texte qui respecte votre vie priv\u00e9e ' +
          'et fonctionne enti\u00e8rement hors ligne. Ce texte d\'exemple d\u00e9montre ' +
          '<em>diverses options de mise en forme</em> disponibles dans l\'\u00e9diteur, ' +
          'y compris du <u>texte soulign\u00e9</u>, du <strong>texte en gras</strong>, ' +
          'et du <em>texte en italique</em>. ' +
          'Tout le contenu est sauvegard\u00e9 localement dans votre navigateur \u2014 ' +
          'sans compte, sans serveur, sans suivi.</p>' +
          '<ul><li>Formatage gras, italique et soulign\u00e9</li>' +
          '<li>Titres (H1, H2, H3) pour la structure</li>' +
          '<li>Listes \u00e0 puces et num\u00e9rot\u00e9es</li>' +
          '<li>Options d\'alignement du texte</li>' +
          '<li>Citations pour mettre en \u00e9vidence// ============================================
// orOS Writer — Unified Rich Text Editor
// v0.5-BETA | All Fixes: Focus Mode, Panel Positioning, Icons, Lorem Ipsum
// ============================================

(function() {
  'use strict';

  var STORAGE_KEY = 'oros_writer_content';
  var STORAGE_HIDE_STATS = 'oros_hide_stats';
  var STORAGE_FOCUS_MODE = 'oros_focus_mode';
  var STORAGE_READING_PROGRESS = 'oros_reading_progress';
  var STORAGE_SMART_TYPOGRAPHY = 'oros_smart_typography';
  var STORAGE_LAST_SAVED = 'oros_writer_last_saved';
  var STORAGE_GOAL_TARGET = 'oros_goal_target';
  var STORAGE_GOAL_UNIT = 'oros_goal_unit';
  var STORAGE_GOAL_LOCK = 'oros_goal_lock';
  var STORAGE_HIDE_GOAL_BTN = 'oros_hide_goal_btn';
  var STORAGE_HIDE_OUTLINE_BTN = 'oros_hide_outline_btn';
  var STORAGE_HIDE_METADATA_BTN = 'oros_hide_metadata_btn';
  var STORAGE_HIDE_FIND_BTN = 'oros_hide_find_btn';
  var STORAGE_HIDE_WORDFREQ_BTN = 'oros_hide_wordfreq_btn';
  var STORAGE_HIDE_SAVE_INDICATOR = 'oros_hide_save_indicator';
  var STORAGE_HIDE_LOREM_BTN = 'oros_hide_lorem_btn';
  var STORAGE_TYPEWRITER_SOUND = 'oros_typewriter_sound';
  var STORAGE_METADATA = 'oros_writer_metadata';

  var richEditor = document.getElementById('rich-editor');
  var richWrapper = document.getElementById('rich-wrapper');
  var findBar = document.getElementById('find-replace-bar');
  var findInput = document.getElementById('find-find');
  var replaceInput = document.getElementById('find-replace');
  var frResults = document.getElementById('fr_results');
  var btnSave = document.getElementById('btn-save');
  var btnOpen = document.getElementById('btn-open');
  var btnClear = document.getElementById('btn-clear');
  var btnExport = document.getElementById('btn-export');
  var btnLorem = document.getElementById('btn-lorem');
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

  var hideStats = localStorage.getItem(STORAGE_HIDE_STATS) === 'true';
  var quickTbarShow = localStorage.getItem('oros_quick_tbar_show') !== 'false';
  var focusModeEnabled = (localStorage.getItem(STORAGE_FOCUS_MODE) === 'true');
  var readingProgressEnabled = localStorage.getItem(STORAGE_READING_PROGRESS) !== 'false';
  var smartTypographyEnabled = localStorage.getItem(STORAGE_SMART_TYPOGRAPHY) !== 'false';
  var lastSavedTime = parseInt(localStorage.getItem(STORAGE_LAST_SAVED)) || null;
  var goalTarget = parseInt(localStorage.getItem(STORAGE_GOAL_TARGET)) || null;
  var goalUnit = localStorage.getItem(STORAGE_GOAL_UNIT) || 'words';
  var goalLockEnabled = localStorage.getItem(STORAGE_GOAL_LOCK) === 'true';
  var hideGoalBtn = localStorage.getItem(STORAGE_HIDE_GOAL_BTN) === 'true';
  var hideOutlineBtn = localStorage.getItem(STORAGE_HIDE_OUTLINE_BTN) === 'true';
  var hideMetadataBtn = localStorage.getItem(STORAGE_HIDE_METADATA_BTN) === 'true';
  var hideFindBtn = localStorage.getItem(STORAGE_HIDE_FIND_BTN) === 'true';
  var hideWordFreqBtn = localStorage.getItem(STORAGE_HIDE_WORDFREQ_BTN) === 'true';
  var hideSaveIndicator = localStorage.getItem(STORAGE_HIDE_SAVE_INDICATOR) === 'true';
  var hideLoremBtn = localStorage.getItem(STORAGE_HIDE_LOREM_BTN) === 'true';
  var typewriterSoundEnabled = localStorage.getItem(STORAGE_TYPEWRITER_SOUND) === 'true';
  var goalReachedShown = false;
  var goalLockTriggered = false;
  var currentMatchIndex = -1;
  var matchRanges = [];
  var statsExpanded = false;
  var wordFreqDebounce = null;
  var outlineDebounceTimer = null;
  var focusDebounceTimer = null;

  // ========== TYPEWRITER SOUND (Web Audio API) ==========
  var typewriterAudioCtx = null;
  var typewriterAudioBuffer = null;

  function initTypewriterSound() {
    try {
      typewriterAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

  // ========== HELPERS ==========
  function getCurrentLang() { return localStorage.getItem('oros-language') || 'en'; }
  function getTrans(key) {
    var lang = getCurrentLang();
    var t = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[lang]) || {};
    return t[key] || key;
  }
  function formatNumber(num) {
    return num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num.toString();
  }
  function getTextContent() {
    var text = richEditor.innerText || '';
    return text.replace(/\n$/, '');
  }

  // ========== PANE TOP OFFSET CALCULATION (FIXED) ==========
  function getPanelTopOffset() {
    var offset = 0;
    var headerInner = document.querySelector('.header');
    if (headerInner) offset += headerInner.offsetHeight;
    else offset += 56;
    var toolbar = document.getElementById('main-toolbar');
    if (toolbar) offset += toolbar.offsetHeight;
    if (goalBar && goalBar.style.display === 'flex') offset += goalBar.offsetHeight;
    if (findBar && findBar.style.display === 'flex') offset += findBar.offsetHeight;
    return offset + 'px';
  }

  // ========== LOREM IPSUM GENERATOR (ALL UNICODE ESCAPED) ==========
  function generateLoremIpsum() {
    var lang = getCurrentLang();
    var templates = {
      en: '<h1>Document Title</h1>' +
          '<p>Welcome to <strong>orOS Writer</strong>, a privacy-first rich text editor that works entirely offline. ' +
          'This sample text demonstrates <em>various formatting options</em> available in the editor, ' +
          'including <u>underlined text</u>, <strong>bold text</strong>, and <em>italic text</em>. ' +
          'All content is saved locally in your browser \u2014 no account, no server, no tracking.</p>' +
          '<ul><li>Bold, italic, and underline formatting</li>' +
          '<li>Headings (H1, H2, H3) for document structure</li>' +
          '<li>Bullet and numbered lists</li>' +
          '<li>Text alignment: left, center, right, justify</li>' +
          '<li>Blockquotes for emphasis</li></ul>' +
          '<h2>Smart Typography</h2>' +
          '<p>The editor features <strong>Smart Typography</strong>, which automatically converts common ' +
          'shortcuts into proper typographic characters as you type:</p>' +
          '<ul><li>Double hyphens (--) become an em dash (\u2014)</li>' +
          '<li>Three dots (...) become an ellipsis (\u2026)</li>' +
          '<li>Straight quotes become curly quotes (\u201C \u201D) and smart apostrophes (\u2018 \u2019)</li>' +
          '<li>(c) becomes \u00A9, (r) becomes \u00AE, and (tm) becomes \u2122</li></ul>' +
          '<p>Try typing these shortcuts yourself \u2014 just enable Smart Typography in Settings if it is not already on.</p>' +
          '<blockquote>Writing is easy. All you do is stare at a blank sheet of paper until drops of blood form on your forehead. \u2014 Gene Fowler</blockquote>' +
          '<h2>Editor Features</h2>' +
          '<p>orOS Writer includes a range of tools designed for writers, journalists, and bloggers:</p>' +
          '<ol><li>Automatic saving \u2014 your work is preserved after every keystroke</li>' +
          '<li>Export to Markdown, Plain Text, RTF, Word, or PDF</li>' +
          '<li>Document outline panel for navigating headings</li>' +
          '<li>Word frequency analysis to spot repetition and overused words</li>' +
          '<li>Document metadata for title, author, tags, and category</li>' +
          '<li>Writing goals with optional lock when the target is reached</li>' +
          '<li>Find and replace functionality</li>' +
          '<li>Reading progress bar and detailed statistics</li></ol>' +
          '<h2>Privacy First</h2>' +
          '<p>Everything happens in your browser. Your text never leaves your device. ' +
          'There are no analytics, no telemetry, no advertisements, and no accounts required. ' +
          'This is open-source software built with respect for your personal data.</p>' +
          '<h2>Offline Operation</h2>' +
          '<p>Once loaded, orOS Writer continues to work even without an internet connection. ' +
          'The application caches all resources using a service worker, enabling true offline capability. ' +
          'You can install it as a Progressive Web App (PWA) for even better integration with your device.</p>' +
          '<p>This is the <em>final paragraph</em> of the sample content. ' +
          'You can clear it anytime with the trash button, or start editing right away. ' +
          'The editor remembers your work between sessions, so feel free to close and return later. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>',
      el: '<h1>\u03A4\u03AF\u03C4\u03BB\u03BF\u03C2 \u0395\u03B3\u03B3\u03C1\u03AC\u03C6\u03BF\u03C5</h1>' +
          '<p>\u039A\u03B1\u03BB\u03CE\u03C2 \u03AE\u03C1\u03B8\u03B5\u03C2 \u03C3\u03C4\u03BF <strong>orOS Writer</strong>, ' +
          '\u03AD\u03BD\u03B1\u03BD \u03B5\u03C0\u03B5\u03BE\u03B5\u03C1\u03B3\u03B1\u03C3\u03C4\u03AE \u03BA\u03B5\u03B9\u03BC\u03AD\u03BD\u03BF\u03C5 \u03C0\u03BF\u03C5 \u03C3\u03B5\u03B2\u03B5\u03C4\u03B1\u03B9 \u03C4\u03BF \u03B1\u03C0\u03CC\u03C1\u03C1\u03B7\u03C4\u03BF ' +
          '\u03BA\u03B1\u03B9 \u03BB\u03B5\u03B9\u03C4\u03BF\u03C5\u03C1\u03B3\u03B5\u03AF \u03B5\u03BE \u03BF\u03BB\u03BF\u03BA\u03BB\u03AE\u03C1\u03BF\u03C5 offline. ' +
          '\u0391\u03C5\u03C4\u03CC \u03C4\u03BF \u03B4\u03BF\u03BA\u03B9\u03BC\u03B1\u03C3\u03C4\u03B9\u03BA\u03CC \u03BA\u03B5\u03AF\u03BC\u03B5\u03BD\u03BF \u03B5\u03C0\u03B9\u03B4\u03B5\u03B9\u03BA\u03BD\u03CD\u03B5\u03B9 ' +
          '<em>\u03B4\u03B9\u03AC\u03C6\u03BF\u03C1\u03B5\u03C2 \u03B5\u03C0\u03B9\u03BB\u03BF\u03B3\u03AD\u03C2 \u03BC\u03BF\u03C1\u03C6\u03BF\u03C0\u03BF\u03AF\u03B7\u03C3\u03B7\u03C2</em> \u03C4\u03BF\u03C5 editor, ' +
          '\u03C3\u03C5\u03BC\u03C0\u03B5\u03C1\u03B9\u03BB\u03B1\u03BC\u03B2\u03B1\u03BD\u03BF\u03BC\u03AD\u03BD\u03BF\u03C5 ' +
          '<u>\u03C5\u03C0\u03BF\u03B3\u03B5\u03B3\u03C1\u03B1\u03BC\u03BC\u03AD\u03BD\u03BF\u03C5 \u03BA\u03B5\u03B9\u03BC\u03AD\u03BD\u03BF\u03C5</u>, ' +
          '<strong>\u03AD\u03BD\u03C4\u03BF\u03BD\u03BF\u03C5 \u03BA\u03B5\u03B9\u03BC\u03AD\u03BD\u03BF\u03C5</strong>, ' +
          '\u03BA\u03B1\u03B9 <em>\u03C0\u03BB\u03AC\u03B3\u03B9\u03BF\u03C5 \u03BA\u03B5\u03B9\u03BC\u03AD\u03BD\u03BF\u03C5</em>. ' +
          '\u038C\u03BB\u03BF \u03C4\u03BF \u03C0\u03B5\u03C1\u03B9\u03B5\u03C7\u03CC\u03BC\u03B5\u03BD\u03BF \u03B1\u03C0\u03BF\u03B8\u03B7\u03BA\u03B5\u03CD\u03B5\u03C4\u03B1\u03B9 \u03C4\u03BF\u03C0\u03B9\u03BA\u03AC \u03C3\u03C4\u03BF\u03BD browser \u2014 ' +
          '\u03C7\u03C9\u03C1\u03AF\u03C2 \u03BB\u03BF\u03B3\u03B1\u03C1\u03B9\u03B1\u03C3\u03BC\u03CC, \u03C7\u03C9\u03C1\u03AF\u03C2 server, \u03C7\u03C9\u03C1\u03AF\u03C2 \u03C0\u03B1\u03C1\u03B1\u03BA\u03BF\u03BB\u03BF\u03CD\u03B8\u03B7\u03C3\u03B7.</p>' +
          '<ul><li>\u039C\u03BF\u03C1\u03C6\u03BF\u03C0\u03BF\u03AF\u03B7\u03C3\u03B7 \u03AD\u03BD\u03C4\u03BF\u03BD\u03B1, \u03C0\u03BB\u03AC\u03B3\u03B9\u03B1, \u03C5\u03C0\u03BF\u03B3\u03C1\u03AC\u03BC\u03BC\u03B9\u03C3\u03B7</li>' +
          '<li>\u03A4\u03AF\u03C4\u03BB\u03BF\u03B9 (H1, H2, H3) \u03B3\u03B9\u03B1 \u03B4\u03BF\u03BC\u03AE \u03B5\u03B3\u03B3\u03C1\u03AC\u03C6\u03BF\u03C5</li>' +
          '<li>\u039B\u03AF\u03C3\u03C4\u03B5\u03C2 \u03BA\u03BF\u03C5\u03BA\u03BA\u03AF\u03B4\u03C9\u03BD \u03BA\u03B1\u03B9 \u03B1\u03C1\u03B9\u03B8\u03BC\u03B7\u03BC\u03AD\u03BD\u03B5\u03C2</li>' +
          '<li>\u03A3\u03C4\u03BF\u03AF\u03C7\u03B9\u03C3\u03B7 \u03BA\u03B5\u03B9\u03BC\u03AD\u03BD\u03BF\u03C5: \u03B1\u03C1\u03B9\u03C3\u03C4\u03B5\u03C1\u03AC, \u03BA\u03AD\u03BD\u03C4\u03C1\u03BF, \u03B4\u03B5\u03BE\u03B9\u03AC, \u03C0\u03BB\u03B7\u03C1\u03AE\u03C2</li>' +
          '<li>\u0391\u03C0\u03BF\u03C3\u03C0\u03AC\u03C3\u03BC\u03B1\u03C4\u03B1 \u03B3\u03B9\u03B1 \u03AD\u03BC\u03C6\u03B1\u03C3\u03B7</li></ul>' +
          '<h2>\u0388\u03BE\u03C5\u03C0\u03BD\u03B7 \u03A4\u03C5\u03C0\u03BF\u03B3\u03C1\u03B1\u03C6\u03AF\u03B1</h2>' +
          '<p>\u039F editor \u03B4\u03B9\u03B1\u03B8\u03AD\u03C4\u03B5\u03B9 <strong>\u0388\u03BE\u03C5\u03C0\u03BD\u03B7 \u03A4\u03C5\u03C0\u03BF\u03B3\u03C1\u03B1\u03C6\u03AF\u03B1</strong>, ' +
          '\u03C0\u03BF\u03C5 \u03BC\u03B5\u03C4\u03B1\u03C4\u03C1\u03AD\u03C0\u03B5\u03B9 \u03B1\u03C5\u03C4\u03CC\u03BC\u03B1\u03C4\u03B1 ' +
          '\u03C3\u03C5\u03BD\u03B7\u03B8\u03B9\u03C3\u03BC\u03AD\u03BD\u03B5\u03C2 \u03C3\u03C5\u03BD\u03C4\u03BF\u03BC\u03BF\u03B3\u03C1\u03B1\u03C6\u03AF\u03B5\u03C2 \u03C3\u03B5 \u03C3\u03C9\u03C3\u03C4\u03BF\u03CD\u03C2 ' +
          '\u03C4\u03C5\u03C0\u03BF\u03B3\u03C1\u03B1\u03C6\u03B9\u03BA\u03BF\u03CD\u03C2 \u03C7\u03B1\u03C1\u03B1\u03BA\u03C4\u03AE\u03C1\u03B5\u03C2 \u03BA\u03B1\u03B8\u03CE\u03C2 \u03C0\u03BB\u03B7\u03BA\u03C4\u03C1\u03BF\u03BB\u03BF\u03B3\u03B5\u03AF\u03C2:</p>' +
          '<ul><li>\u0394\u03B9\u03C0\u03BB\u03AD\u03C2 \u03C0\u03B1\u03CD\u03BB\u03B5\u03C2 (--) \u03B3\u03AF\u03BD\u03BF\u03BD\u03C4\u03B1\u03B9 \u03BC\u03B1\u03BA\u03C1\u03AC \u03C0\u03B1\u03CD\u03BB\u03B1 (\u2014)</li>' +
          '<li>\u03A4\u03C1\u03B5\u03B9\u03C2 \u03C4\u03B5\u03BB\u03B5\u03AF\u03B5\u03C2 (...) \u03B3\u03AF\u03BD\u03BF\u03BD\u03C4\u03B1\u03B9 \u03B1\u03C0\u03BF\u03C3\u03B9\u03C9\u03C0\u03B7\u03C4\u03B9\u03BA\u03AC (\u2026)</li>' +
          '<li>\u0391\u03C0\u03BB\u03AC \u03B5\u03B9\u03C3\u03B1\u03B3\u03C9\u03B3\u03B9\u03BA\u03AC \u03B3\u03AF\u03BD\u03BF\u03BD\u03C4\u03B1\u03B9 \u03BA\u03B1\u03BC\u03C0\u03CD\u03BB\u03B1 \u03B5\u03B9\u03C3\u03B1\u03B3\u03C9\u03B3\u03B9\u03BA\u03AC (\u201C \u201D) ' +
          '\u03BA\u03B1\u03B9 \u03AD\u03BE\u03C5\u03C0\u03BD\u03B1 \u03B1\u03C0\u03BF\u03C3\u03C4\u03CC\u03C6\u03B9\u03B1 (\u2018 \u2019)</li>' +
          '<li>(c) \u03B3\u03AF\u03BD\u03B5\u03C4\u03B1\u03B9 \u00A9, (r) \u03B3\u03AF\u03BD\u03B5\u03C4\u03B1\u03B9 \u00AE, \u03BA\u03B1\u03B9 (tm) \u03B3\u03AF\u03BD\u03B5\u03C4\u03B1\u03B9 \u2122</li></ul>' +
          '<p>\u0394\u03BF\u03BA\u03AF\u03BC\u03B1\u03C3\u03B5 \u03BD\u03B1 \u03C0\u03BB\u03B7\u03BA\u03C4\u03C1\u03BF\u03BB\u03BF\u03B3\u03AE\u03C3\u03B5\u03B9\u03C2 \u03B1\u03C5\u03C4\u03AD\u03C2 \u03C4\u03B9\u03C2 \u03C3\u03C5\u03BD\u03C4\u03BF\u03BC\u03BF\u03B3\u03C1\u03B1\u03C6\u03AF\u03B5\u03C2 \u03BC\u03CC\u03BD\u03BF\u03C2 \u03C3\u03BF\u03C5 \u2014 ' +
          '\u03B1\u03C0\u03BB\u03AC \u03B5\u03BD\u03B5\u03C1\u03B3\u03BF\u03C0\u03BF\u03AF\u03B7\u03C3\u03B5 \u03C4\u03B7\u03BD \u0388\u03BE\u03C5\u03C0\u03BD\u03B7 \u03A4\u03C5\u03C0\u03BF\u03B3\u03C1\u03B1\u03C6\u03AF\u03B1 \u03C3\u03C4\u03B9\u03C2 \u03A1\u03C5\u03B8\u03BC\u03AF\u03C3\u03B5\u03B9\u03C2 ' +
          '\u03B1\u03BD \u03B4\u03B5\u03BD \u03B5\u03AF\u03BD\u03B1\u03B9 \u03AE\u03B4\u03B7 \u03B5\u03BD\u03B5\u03C1\u03B3\u03AE.</p>' +
          '<blockquote>\u0397 \u03B3\u03C1\u03B1\u03C6\u03AE \u03B5\u03AF\u03BD\u03B1\u03B9 \u03B5\u03CD\u03BA\u03BF\u03BB\u03B7. \u0391\u03C0\u03BB\u03AC \u03BA\u03BF\u03B9\u03C4\u03AC\u03C2 \u03AD\u03BD\u03B1 ' +
          '\u03BB\u03B5\u03C5\u03BA\u03CC \u03C6\u03CD\u03BB\u03BB\u03BF \u03C7\u03B1\u03C1\u03C4\u03B9\u03BF\u03CD \u03BC\u03AD\u03C7\u03C1\u03B9 \u03BD\u03B1 \u03C3\u03C4\u03B1\u03BB\u03AC\u03BE\u03B5\u03B9\u03C2 \u03C3\u03C4\u03B1\u03B3\u03CC\u03BD\u03B5\u03C2 ' +
          '\u03B1\u03AF\u03BC\u03B1\u03C4\u03BF\u03C2 \u03C3\u03C4\u03BF \u03BC\u03AD\u03C4\u03C9\u03C0\u03CC \u03C3\u03BF\u03C5. \u2014 Gene Fowler</blockquote>' +
          '<h2>\u039B\u03B5\u03B9\u03C4\u03BF\u03C5\u03C1\u03B3\u03AF\u03B5\u03C2 Editor</h2>' +
          '<p>\u039F orOS Writer \u03C0\u03B5\u03C1\u03B9\u03BB\u03B1\u03BC\u03B2\u03AC\u03BD\u03B5\u03B9 \u03BC\u03B9\u03B1 \u03C3\u03B5\u03B9\u03C1\u03AC \u03B5\u03C1\u03B3\u03B1\u03BB\u03B5\u03AF\u03C9\u03BD ' +
          '\u03C3\u03C7\u03B5\u03B4\u03B9\u03B1\u03C3\u03BC\u03AD\u03BD\u03C9\u03BD \u03B3\u03B9\u03B1 \u03C3\u03C5\u03B3\u03B3\u03C1\u03B1\u03C6\u03B5\u03AF\u03C2, \u03B4\u03B7\u03BC\u03BF\u03C3\u03B9\u03BF\u03B3\u03C1\u03AC\u03C6\u03BF\u03C5\u03C2 \u03BA\u03B1\u03B9 bloggers:</p>' +
          '<ol><li>\u0391\u03C5\u03C4\u03CC\u03BC\u03B1\u03C4\u03B7 \u03B1\u03C0\u03BF\u03B8\u03AE\u03BA\u03B5\u03C5\u03C3\u03B7 \u2014 \u03B7 \u03B4\u03BF\u03C5\u03BB\u03B5\u03B9\u03AC \u03C3\u03BF\u03C5 ' +
          '\u03C3\u03CE\u03B6\u03B5\u03C4\u03B1\u03B9 \u03BC\u03B5\u03C4\u03AC \u03B1\u03C0\u03CC \u03BA\u03AC\u03B8\u03B5 \u03C0\u03BB\u03B7\u03BA\u03C4\u03C1\u03BF\u03BB\u03CC\u03B3\u03B7\u03C3\u03B7</li>' +
          '<li>\u0395\u03BE\u03B1\u03B3\u03C9\u03B3\u03AE \u03C3\u03B5 Markdown, \u0391\u03C0\u03BB\u03CC \u039A\u03B5\u03AF\u03BC\u03B5\u03BD\u03BF, RTF, Word \u03AE PDF</li>' +
          '<li>\u03A0\u03AF\u03BD\u03B1\u03BA\u03B1\u03C2 \u03B4\u03BF\u03BC\u03AE\u03C2 \u03B5\u03B3\u03B3\u03C1\u03AC\u03C6\u03BF\u03C5 \u03B3\u03B9\u03B1 \u03C0\u03BB\u03BF\u03B9\u03B3\u03B7\u03C3\u03B7 \u03C3\u03C4\u03BF\u03C5\u03C2 \u03C4\u03AF\u03C4\u03BB\u03BF\u03C5\u03C2</li>' +
          '<li>\u0391\u03BD\u03AC\u03BB\u03C5\u03C3\u03B7 \u03C3\u03C5\u03C7\u03BD\u03CC\u03C4\u03B7\u03C4\u03B1\u03C2 \u03BB\u03AD\u03BE\u03B5\u03C9\u03BD \u03B3\u03B9\u03B1 \u03B5\u03BD\u03C4\u03BF\u03C0\u03B9\u03C3\u03BC\u03CC \u03B5\u03C0\u03B1\u03BD\u03B1\u03BB\u03AE\u03C8\u03B5\u03C9\u03BD</li>' +
          '<li>\u039C\u03B5\u03C4\u03B1\u03B4\u03B5\u03B4\u03BF\u03BC\u03AD\u03BD\u03B1 \u03B5\u03B3\u03B3\u03C1\u03AC\u03C6\u03BF\u03C5 \u03B3\u03B9\u03B1 \u03C4\u03AF\u03C4\u03BB\u03BF, ' +
          '\u03C3\u03C5\u03B3\u03B3\u03C1\u03B1\u03C6\u03AD\u03B1, \u03B5\u03C4\u03B9\u03BA\u03AD\u03C4\u03B5\u03C2 \u03BA\u03B1\u03B9 \u03BA\u03B1\u03C4\u03B7\u03B3\u03BF\u03C1\u03AF\u03B1</li>' +
          '<li>\u03A3\u03C4\u03CC\u03C7\u03BF\u03B9 \u03B3\u03C1\u03B1\u03C6\u03AE\u03C2 \u03BC\u03B5 \u03C0\u03C1\u03BF\u03B1\u03B9\u03C1\u03B5\u03C4\u03B9\u03BA\u03CC \u03BA\u03BB\u03B5\u03AF\u03B4\u03C9\u03BC\u03B1 ' +
          '\u03CC\u03C4\u03B1\u03BD \u03B5\u03C0\u03B9\u03C4\u03C5\u03B3\u03C7\u03AC\u03BD\u03BF\u03BD\u03C4\u03B1\u03B9</li>' +
          '<li>\u0395\u03CD\u03C1\u03B5\u03C3\u03B7 \u03BA\u03B1\u03B9 \u03B1\u03BD\u03C4\u03B9\u03BA\u03B1\u03C4\u03AC\u03C3\u03C4\u03B1\u03C3\u03B7 \u03BA\u03B5\u03B9\u03BC\u03AD\u03BD\u03BF\u03C5</li>' +
          '<li>\u039C\u03C0\u03AC\u03C1\u03B1 \u03C0\u03C1\u03BF\u03CC\u03B4\u03BF\u03C5 \u03B1\u03BD\u03AC\u03B3\u03BD\u03C9\u03C3\u03B7\u03C2 \u03BA\u03B1\u03B9 \u03B1\u03BD\u03B1\u03BB\u03C5\u03C4\u03B9\u03BA\u03AC \u03C3\u03C4\u03B1\u03C4\u03B9\u03C3\u03C4\u03B9\u03BA\u03AC</li></ol>' +
          '<h2>\u0391\u03C0\u03CC\u03C1\u03C1\u03B7\u03C4\u03BF \u03A0\u03C1\u03CE\u03C4\u03B1</h2>' +
          '<p>\u038C\u03BB\u03B1 \u03C3\u03C5\u03BC\u03B2\u03B1\u03AF\u03BD\u03BF\u03C5\u03BD \u03C3\u03C4\u03BF\u03BD browser \u03C3\u03BF\u03C5. \u03A4\u03BF \u03BA\u03B5\u03AF\u03BC\u03B5\u03BD\u03CC \u03C3\u03BF\u03C5 ' +
          '\u03B4\u03B5\u03BD \u03C6\u03B5\u03CD\u03B3\u03B5\u03B9 \u03C0\u03BF\u03C4\u03AD \u03B1\u03C0\u03CC \u03C4\u03B7 \u03C3\u03C5\u03C3\u03BA\u03B5\u03C5\u03AE \u03C3\u03BF\u03C5. ' +
          '\u0394\u03B5\u03BD \u03C5\u03C0\u03AC\u03C1\u03C7\u03BF\u03C5\u03BD \u03B1\u03BD\u03B1\u03BB\u03C5\u03C4\u03B9\u03BA\u03AC \u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1, \u03C4\u03B7\u03BB\u03B5\u03BC\u03B5\u03C4\u03C1\u03AF\u03B1, ' +
          '\u03B4\u03B9\u03B1\u03C6\u03B7\u03BC\u03AF\u03C3\u03B5\u03B9\u03C2, \u03AE \u03BB\u03BF\u03B3\u03B1\u03C1\u03B9\u03B1\u03C3\u03BC\u03BF\u03AF. ' +
          '\u0391\u03C5\u03C4\u03CC \u03B5\u03AF\u03BD\u03B1\u03B9 \u03BB\u03BF\u03B3\u03B9\u03C3\u03BC\u03B9\u03BA\u03CC \u03B1\u03BD\u03BF\u03B9\u03BA\u03C4\u03BF\u03CD \u03BA\u03CE\u03B4\u03B9\u03BA\u03B1, ' +
          '\u03C6\u03C4\u03B9\u03B1\u03B3\u03BC\u03AD\u03BD\u03BF \u03BC\u03B5 \u03C3\u03B5\u03B2\u03B1\u03C3\u03BC\u03CC \u03B3\u03B9\u03B1 \u03C4\u03B1 \u03C0\u03C1\u03BF\u03C3\u03C9\u03C0\u03B9\u03BA\u03AC \u03C3\u03BF\u03C5 \u03B4\u03B5\u03B4\u03BF\u03BC\u03AD\u03BD\u03B1.</p>' +
          '<h2>\u039B\u03B5\u03B9\u03C4\u03BF\u03C5\u03C1\u03B3\u03AF\u03B1 Offline</h2>' +
          '<p>\u039C\u03CC\u03BB\u03B9\u03C2 \u03C6\u03BF\u03C1\u03C4\u03CE\u03C3\u03B5\u03B9, \u03BF orOS Writer \u03C3\u03C5\u03BD\u03B5\u03C7\u03AF\u03B6\u03B5\u03B9 \u03BD\u03B1 \u03BB\u03B5\u03B9\u03C4\u03BF\u03C5\u03C1\u03B3\u03B5\u03AF ' +
          '\u03B1\u03BA\u03CC\u03BC\u03B1 \u03BA\u03B1\u03B9 \u03C7\u03C9\u03C1\u03AF\u03C2 \u03C3\u03CD\u03BD\u03B4\u03B5\u03C3\u03B7 \u03C3\u03C4\u03BF \u03AF\u03BD\u03C4\u03B5\u03C1\u03BD\u03B5\u03C4. ' +
          '\u0397 \u03B5\u03C6\u03B1\u03C1\u03BC\u03BF\u03B3\u03AE \u03B1\u03C0\u03BF\u03B8\u03B7\u03BA\u03B5\u03CD\u03B5\u03B9 \u03CC\u03BB\u03BF\u03C5\u03C2 \u03C4\u03BF\u03C5\u03C2 \u03C0\u03CC\u03C1\u03BF\u03C5\u03C2 ' +
          '\u03C7\u03C1\u03B7\u03C3\u03B9\u03BC\u03BF\u03C0\u03BF\u03B9\u03CE\u03BD\u03C4\u03B1\u03C2 service worker, \u03B5\u03C0\u03B9\u03C4\u03C1\u03AD\u03C0\u03BF\u03BD\u03C4\u03B1\u03C2 ' +
          '\u03C0\u03C1\u03B1\u03B3\u03BC\u03B1\u03C4\u03B9\u03BA\u03AE offline \u03B4\u03C5\u03BD\u03B1\u03C4\u03CC\u03C4\u03B7\u03C4\u03B1. ' +
          '\u039C\u03C0\u03BF\u03C1\u03B5\u03AF\u03C2 \u03BD\u03B1 \u03C4\u03B7\u03BD \u03B5\u03B3\u03BA\u03B1\u03C4\u03B1\u03C3\u03C4\u03AE\u03C3\u03B5\u03B9\u03C2 \u03C9\u03C2 ' +
          'Progressive Web App (PWA) \u03B3\u03B9\u03B1 \u03B1\u03BA\u03CC\u03BC\u03B1 \u03BA\u03B1\u03BB\u03CD\u03C4\u03B5\u03C1\u03B7 ' +
          '\u03BF\u03BB\u03BF\u03BA\u03BB\u03AE\u03C1\u03C9\u03C3\u03B7 \u03BC\u03B5 \u03C4\u03B7 \u03C3\u03C5\u03C3\u03BA\u03B5\u03C5\u03AE \u03C3\u03BF\u03C5.</p>' +
          '<p>\u0391\u03C5\u03C4\u03AE \u03B5\u03AF\u03BD\u03B1\u03B9 \u03B7 <em>\u03C4\u03B5\u03BB\u03B5\u03C5\u03C4\u03B1\u03AF\u03B1 \u03C0\u03B1\u03C1\u03AC\u03B3\u03C1\u03B1\u03C6\u03BF\u03C2</em> ' +
          '\u03C4\u03BF\u03C5 \u03B4\u03BF\u03BA\u03B9\u03BC\u03B1\u03C3\u03C4\u03B9\u03BA\u03BF\u03CD \u03BA\u03B5\u03B9\u03BC\u03AD\u03BD\u03BF\u03C5. ' +
          '\u039C\u03C0\u03BF\u03C1\u03B5\u03B9\u03C2 \u03BD\u03B1 \u03C4\u03B7\u03BD \u03BA\u03B1\u03B8\u03B1\u03C1\u03AF\u03C3\u03B5\u03B9\u03C2 \u03B1\u03BD\u03AC \u03C0\u03AC\u03C3\u03B1 \u03C3\u03C4\u03B9\u03B3\u03BC\u03AE ' +
          '\u03BC\u03B5 \u03C4\u03BF \u03BA\u03BF\u03C5\u03BC\u03C0\u03AF \u03B4\u03B9\u03B1\u03B3\u03C1\u03B1\u03C6\u03AE\u03C2, \u03AE \u03BD\u03B1 \u03BE\u03B5\u03BA\u03B9\u03BD\u03AE\u03C3\u03B5\u03B9\u03C2 ' +
          '\u03BD\u03B1 \u03B5\u03C0\u03B5\u03BE\u03B5\u03C1\u03B3\u03AC\u03B6\u03B5\u03C3\u03B1\u03B9 \u03B1\u03BC\u03AD\u03C3\u03C9\u03C2. ' +
          '\u039F editor \u03B8\u03C5\u03BC\u03AC\u03C4\u03B1\u03B9 \u03C4\u03B7 \u03B4\u03BF\u03C5\u03BB\u03B5\u03B9\u03AC \u03C3\u03BF\u03C5 \u03BC\u03B5\u03C4\u03B1\u03BE\u03CD \u03C4\u03C9\u03BD \u03C3\u03C5\u03BD\u03B5\u03B4\u03C1\u03B9\u03CE\u03BD, ' +
          '\u03BF\u03C0\u03CC\u03C4\u03B5 \u039C\u03C0\u03BF\u03C1\u03B5\u03B9\u03C2 \u03BD\u03B1 \u03BA\u03BB\u03B5\u03AF\u03C3\u03B5\u03B9\u03C2 \u03BA\u03B1\u03B9 \u03BD\u03B1 \u03B5\u03C0\u03B9\u03C3\u03C4\u03C1\u03AD\u03C8\u03B5\u03B9\u03C2 \u03B1\u03C1\u03B3\u03CC\u03C4\u03B5\u03C1\u03B1. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>',
      es: '<h1>T\u00edtulo del Documento</h1>' +
          '<p>Bienvenido a <strong>orOS Writer</strong>, un editor de texto que respeta tu privacidad ' +
          'y funciona completamente sin conexi\u00f3n. Este texto de muestra demuestra ' +
          '<em>varias opciones de formato</em> disponibles en el editor, ' +
          'incluyendo <u>texto subrayado</u>, <strong>texto en negrita</strong>, ' +
          'y <em>texto en cursiva</em>. ' +
          'Todo el contenido se guarda localmente en tu navegador \u2014 ' +
          'sin cuenta, sin servidor, sin rastreo.</p>' +
          '<ul><li>Formato negrita, cursiva y subrayado</li>' +
          '<li>Encabezados (H1, H2, H3) para estructura</li>' +
          '<li>Listas de vi\u00f1etas y numeradas</li>' +
          '<li>Opciones de alineaci\u00f3n de texto</li>' +
          '<li>Citas para \u00e9nfasis</li></ul>' +
          '<h2>Tipograf\u00eda Inteligente</h2>' +
          '<p>El editor incluye <strong>Tipograf\u00eda Inteligente</strong>, que convierte autom\u00e1ticamente ' +
          'atajos comunes en caracteres tipogr\u00e1ficos correctos mientras escribes:</p>' +
          '<ul><li>Dobles guiones (--) se convierten en guion largo (\u2014)</li>' +
          '<li>Tres puntos (...) se convierten en puntos suspensivos (\u2026)</li>' +
          '<li>Comillas rectas se convierten en comillas tipogr\u00e1ficas (\u201C \u201D) y ap\u00f3strofos inteligentes (\u2018 \u2019)</li>' +
          '<li>(c) se convierte en \u00A9, (r) en \u00AE, y (tm) en \u2122</li></ul>' +
          '<p>Prueba a escribir estos atajos t\u00fa mismo \u2014 solo activa la Tipograf\u00eda Inteligente en Configuraci\u00f3n si a\u00fan no est\u00e1 activada.</p>' +
          '<blockquote>Escribir es f\u00e1cil. Solo miras una hoja de papel en blanco hasta que gotas de sangre se forman en tu frente. \u2014 Gene Fowler</blockquote>' +
          '<h2>Funciones del Editor</h2>' +
          '<p>orOS Writer incluye una gama de herramientas dise\u00f1adas para escritores, periodistas y bloggers:</p>' +
          '<ol><li>Guardado autom\u00e1tico \u2014 tu trabajo se preserva tras cada pulsaci\u00f3n</li>' +
          '<li>Exportar a Markdown, Texto Plano, RTF, Word o PDF</li>' +
          '<li>Panel de esquema del documento para navegar por los encabezados</li>' +
          '<li>An\u00e1lisis de frecuencia de palabras para detectar repeticiones</li>' +
          '<li>Metadatos del documento para t\u00edtulo, autor, etiquetas y categor\u00eda</li>' +
          '<li>Objetivos de escritura con bloqueo opcional al alcanzar la meta</li>' +
          '<li>Funci\u00f3n de buscar y reemplazar</li>' +
          '<li>Barra de progreso de lectura y estad\u00edsticas detalladas</li></ol>' +
          '<h2>Privacidad Primero</h2>' +
          '<p>Todo ocurre en tu navegador. Tu texto nunca sale de tu dispositivo. ' +
          'No hay anal\u00edticas, ni telemetr\u00eda, ni anuncios, ni cuentas requeridas. ' +
          'Esto es software de c\u00f3digo abierto, creado con respeto por tus datos personales.</p>' +
          '<h2>Operaci\u00f3n Sin Conexi\u00f3n</h2>' +
          '<p>Una vez cargado, orOS Writer sigue funcionando incluso sin conexi\u00f3n a Internet. ' +
          'La aplicaci\u00f3n almacena todos los recursos usando un service worker, permitiendo verdadera capacidad offline. ' +
          'Puedes instalarla como Progressive Web App (PWA) para mejor integraci\u00f3n con tu dispositivo.</p>' +
          '<p>Este es el <em>p\u00e1rrafo final</em> del contenido de muestra. ' +
          'Puedes borrarlo en cualquier momento con el bot\u00f3n de papelera, o empezar a editar de inmediato. ' +
          'El editor recuerda tu trabajo entre sesiones, as\u00ed que si\u00e9ntete libre de cerrar y volver m\u00e1s tarde. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>',
      it: '<h1>Titolo del Documento</h1>' +
          '<p>Benvenuto in <strong>orOS Writer</strong>, un editor di testo che rispetta la tua privacy ' +
          'e funziona completamente offline. Questo testo di esempio dimostra ' +
          '<em>varie opzioni di formattazione</em> disponibili nell\'editor, ' +
          'inclusi <u>testo sottolineato</u>, <strong>testo in grassetto</strong>, ' +
          'e <em>testo in corsivo</em>. ' +
          'Tutti i contenuti vengono salvati localmente nel tuo browser \u2014 ' +
          'nessun account, nessun server, nessun tracciamento.</p>' +
          '<ul><li>Formattazione grassetto, corsivo e sottolineato</li>' +
          '<li>Intestazioni (H1, H2, H3) per la struttura</li>' +
          '<li>Elenchi puntati e numerati</li>' +
          '<li>Opzioni di allineamento del testo</li>' +
          '<li>Citazioni per enfasi</li></ul>' +
          '<h2>Tipografia Intelligente</h2>' +
          '<p>L\'editor include la <strong>Tipografia Intelligente</strong>, che converte automaticamente ' +
          'scorciatoie comuni in caratteri tipografici corretti mentre scrivi:</p>' +
          '<ul><li>Doppi trattini (--) diventano un trattino lungo (\u2014)</li>' +
          '<li>Tre punti (...) diventano puntini di sospensione (\u2026)</li>' +
          '<li>Le virgolette dritte diventano virgolette tipografiche (\u201C \u201D) e apostrofi intelligenti (\u2018 \u2019)</li>' +
          '<li>(c) diventa \u00A9, (r) diventa \u00AE, e (tm) diventa \u2122</li></ul>' +
          '<p>Prova a digitare queste scorciatoie tu stesso \u2014 basta attivare la Tipografia Intelligente nelle Impostazioni se non \u00e8 gi\u00e0 attiva.</p>' +
          '<blockquote>Scrivere \u00e8 facile. Devi solo fissare un foglio di carta bianca finch\u00e9 non ti si formano gocce di sangue sulla fronte. \u2014 Gene Fowler</blockquote>' +
          '<h2>Funzioni dell\'Editor</h2>' +
          '<p>orOS Writer include una gamma di strumenti progettati per scrittori, giornalisti e blogger:</p>' +
          '<ol><li>Salvataggio automatico \u2014 il tuo lavoro viene preservato dopo ogni battitura</li>' +
          '<li>Esportazione in Markdown, Testo Semplice, RTF, Word o PDF</li>' +
          '<li>Pannello struttura del documento per navigare tra le intestazioni</li>' +
          '<li>Analisi della frequenza delle parole per individuare ripetizioni</li>' +
          '<li>Metadati del documento per titolo, autore, tag e categoria</li>' +
          '<li>Obiettivi di scrittura con blocco opzionale al raggiungimento della meta</li>' +
          '<li>Funzione di trova e sostituisci</li>' +
          '<li>Barra di avanzamento della lettura e statistiche dettagliate</li></ol>' +
          '<h2>Prima la Privacy</h2>' +
          '<p>Tutto avviene nel tuo browser. Il tuo testo non lascia mai il tuo dispositivo. ' +
          'Non ci sono analitiche, telemetria, pubblicit\u00e0, n\u00e9 account richiesti. ' +
          'Questo \u00e8 software open source, creato con rispetto per i tuoi dati personali.</p>' +
          '<h2>Operativit\u00e0 Offline</h2>' +
          '<p>Una volta caricato, orOS Writer continua di funzionare anche senza connessione a Internet. ' +
          'L\'applicazione memorizza tutte le risorse utilizzando un service worker, consentendo vera capacit\u00e0 offline. ' +
          'Puoi installarla come Progressive Web App (PWA) per migliore integrazione con il tuo dispositivo.</p>' +
          '<p>Questo \u00e8 il <em>paragrafo finale</em> del contenuto di esempio. ' +
          'Puoi cancellarlo in qualsiasi momento con il pulsante del cestino, o iniziare a modificare subito. ' +
          'L\'editor ricorda il tuo lavoro tra le sessioni, quindi sentiti libero di chiudere e tornare pi\u00f9 tardi. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>',
      fr: '<h1>Titre du Document</h1>' +
          '<p>Bienvenue dans <strong>orOS Writer</strong>, un \u00e9diteur de texte qui respecte votre vie priv\u00e9e ' +
          'et fonctionne enti\u00e8rement hors ligne. Ce texte d\'exemple d\u00e9montre ' +
          '<em>diverses options de mise en forme</em> disponibles dans l\'\u00e9diteur, ' +
          'y compris du <u>texte soulign\u00e9</u>, du <strong>texte en gras</strong>, ' +
          'et du <em>texte en italique</em>. ' +
          'Tout le contenu est sauvegard\u00e9 localement dans votre navigateur \u2014 ' +
          'sans compte, sans serveur, sans suivi.</p>' +
          '<ul><li>Formatage gras, italique et soulign\u00e9</li>' +
          '<li>Titres (H1, H2, H3) pour la structure</li>' +
          '<li>Listes \u00e0 puces et num\u00e9rot\u00e9es</li>' +
          '<li>Options d\'alignement du texte</li>' +
          '<li>Citations pour mettre en \u00e9vidence          '</li></ul>' +
          '<h2>Typographie Intelligente</h2>' +
          '<p>L\'\u00e9diteur inclut la <strong>Typographie Intelligente</strong>, qui convertit automatiquement ' +
          'les raccourcis courants en caract\u00e8res typographiques corrects pendant que vous tapez :</p>' +
          '<ul><li>Les doubles tirets (--) deviennent un tiret long (\u2014)</li>' +
          '<li>Trois points (...) deviennent des points de suspension (\u2026)</li>' +
          '<li>Les guillemets droits deviennent des guillemets typographiques (\u201C \u201D) et apostrophes intelligentes (\u2018 \u2019)</li>' +
          '<li>(c) devient \u00A9, (r) devient \u00AE, et (tm) devient \u2122</li></ul>' +
          '<p>Essayez de taper ces raccourcis vous-m\u00eame \u2014 activez simplement la Typographie Intelligente dans les Param\u00e8tres si elle n\'est pas d\u00e9j\u00e0 activ\u00e9e.</p>' +
          '<blockquote>\u00c9crire est facile. Vous fixez simplement une feuille de papier blanc jusqu\'\u00e0 ce que des gouttes de sang se forment sur votre front. \u2014 Gene Fowler</blockquote>' +
          '<h2>Fonctions de l\'\u00c9diteur</h2>' +
          '<p>orOS Writer comprend une gamme d\'outils con\u00e7us pour les \u00e9crivains, journalistes et blogueurs :</p>' +
          '<ol><li>Sauvegarde automatique \u2014 votre travail est pr\u00e9serv\u00e9 apr\u00e8s chaque frappe</li>' +
          '<li>Exportation en Markdown, Texte Brut, RTF, Word ou PDF</li>' +
          '<li>Panneau de plan du document pour naviguer entre les titres</li>' +
          '<li>Analyse de fr\u00e9quence des mots pour rep\u00e9rer les r\u00e9p\u00e9titions</li>' +
          '<li>M\u00e9tadonn\u00e9es du document pour titre, auteur, tags et cat\u00e9gorie</li>' +
          '<li>Objectifs d\'\u00e9criture avec verrouillage facultatif \u00e0 l\'atteinte de l\'objectif</li>' +
          '<li>Fonction de recherche et remplacement</li>' +
          '<li>Barre de progression de lecture et statistiques d\u00e9taill\u00e9es</li></ol>' +
          '<h2>Vie Priv\u00e9e D\'abord</h2>' +
          '<p>Tout se passe dans votre navigateur. Votre texte ne quitte jamais votre appareil. ' +
          'Il n\'y a pas d\'analytique, ni t\u00e9l\u00e9m\u00e9trie, ni publicit\u00e9s, ni comptes requis. ' +
          'Ceci est un logiciel open source, cr\u00e9\u00e9 dans le respect de vos donn\u00e9es personnelles.</p>' +
          '<h2>Fonctionnement Hors Ligne</h2>' +
          '<p>Une fois charg\u00e9, orOS Writer continue de fonctionner m\u00eame sans connexion Internet. ' +
          'L\'application met en cache toutes les ressources en utilisant un service worker, permettant une v\u00e9ritable capacit\u00e9 hors ligne. ' +
          'Vous pouvez l\'installer comme Progressive Web App (PWA) pour une meilleure int\u00e9gration avec votre appareil.</p>' +
          '<p>Ceci est le <em>paragraphe final</em> du contenu d\'exemple. ' +
          'Vous pouvez l\'effacer \u00e0 tout moment avec le bouton de corbeille, ou commencer \u00e0 \u00e9diter imm\u00e9diatement. ' +
          'L\'\u00e9diteur se souvient de votre travail entre les sessions, donc n\'h\u00e9sitez pas \u00e0 fermer et revenir plus tard. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>',
      de: '<h1>Dokumenttitel</h1>' +
          '<p>Willkommen bei <strong>orOS Writer</strong>, einem Texteditor, der Ihre Privatsph\u00e4re respektiert ' +
          'und vollst\u00e4ndig offline funktioniert. Dieser Beispieltext demonstriert ' +
          '<em>verschiedene Formatierungsoptionen</em> im Editor, ' +
          'einschlie\u00dflich <u>unterstrichenem Text</u>, <strong>Fetttext</strong>, ' +
          'und <em>Kursivtext</em>. ' +
          'Alle Inhalte werden lokal in Ihrem Browser gespeichert \u2014 ' +
          'kein Konto, kein Server, kein Tracking.</p>' +
          '<ul><li>Formatierung Fett, Kursiv und Unterstrichen</li>' +
          '<li>\u00dcberschriften (H1, H2, H3) f\u00fcr Struktur</li>' +
          '<li>Aufz\u00e4hlungslisten und nummerierte Listen</li>' +
          '<li>Textausrichtungsoptionen</li>' +
          '<li>Zitate zur Hervorhebung</li></ul>' +
          '<h2>Intelligente Typografie</h2>' +
          '<p>Der Editor bietet <strong>Intelligente Typografie</strong>, die h\u00e4ufige Tastenk\u00fcrzel ' +
          'automatisch in korrekte typografische Zeichen umwandelt, w\u00e4hrend Sie tippen:</p>' +
          '<ul><li>Doppelte Bindestriche (--) werden zu Gedankenstrich (\u2014)</li>' +
          '<li>Drei Punkte (...) werden zu Auslassungspunkten (\u2026)</li>' +
          '<li>Gerade Anf\u00fchrungszeichen werden zu typografischen Anf\u00fchrungszeichen (\u201C \u201D) und intelligenten Apostrophen (\u2018 \u2019)</li>' +
          '<li>(c) wird zu \u00A9, (r) wird zu \u00AE, und (tm) wird zu \u2122</li></ul>' +
          '<p>Versuchen Sie, diese K\u00fcrzel selbst einzugeben \u2014 aktivieren Sie einfach die Intelligente Typografie in den Einstellungen, falls sie noch nicht aktiv ist.</p>' +
          '<blockquote>Schreiben ist einfach. Sie starren nur auf ein leeres Blatt Papier, bis sich Blutstropfen auf Ihrer Stirn bilden. \u2014 Gene Fowler</blockquote>' +
          '<h2>Editor-Funktionen</h2>' +
          '<p>orOS Writer umfasst eine Reihe von Werkzeugen, die f\u00fcr Schriftsteller, Journalisten und Blogger entwickelt wurden:</p>' +
          '<ol><li>Automatisches Speichern \u2014 Ihre Arbeit wird nach jedem Tastenanschlag gespeichert</li>' +
          '<li>Export als Markdown, Klartext, RTF, Word oder PDF</li>' +
          '<li>Dokumentgliederungspanel zur Navigation zwischen \u00dcberschriften</li>' +
          '<li>Worth\u00e4ufigkeitsanalyse zur Erkennung von Wiederholungen</li>' +
          '<li>Dokumentmetadaten f\u00fcr Titel, Autor, Tags und Kategorie</li>' +
          '<li>Schreibziele mit optionaler Sperre beim Erreichen des Ziels</li>' +
          '<li>Suchen-und-Ersetzen-Funktion</li>' +
          '<li>Lese-Fortschrittsbalken und detaillierte Statistiken</li></ol>' +
          '<h2>Datenschutz Zuerst</h2>' +
          '<p>Alles passiert in Ihrem Browser. Ihr Text verl\u00e4sst nie Ihr Ger\u00e4t. ' +
          'Es gibt keine Analytik, keine Telemetrie, keine Werbung und keine Kontopflicht. ' +
          'Dies ist Open-Source-Software, die mit Respekt f\u00fcr Ihre pers\u00f6nlichen Daten erstellt wurde.</p>' +
          '<h2>Offline-Betrieb</h2>' +
          '<p>Sobald geladen, funktioniert orOS Writer auch ohne Internetverbindung weiter. ' +
          'Die Anwendung cacht alle Ressourcen \u00fcber einen Service Worker, was echte Offline-F\u00e4higkeit erm\u00f6glicht. ' +
          'Sie k\u00f6nnen es als Progressive Web App (PWA) installieren f\u00fcr bessere Integration mit Ihrem Ger\u00e4t.</p>' +
          '<p>Dies ist der <em>letzte Absatz</em> des Beispielinhalts. ' +
          'Sie k\u00f6nnen ihn jederzeit mit dem M\u00fclleimer-Button l\u00f6schen oder sofort mit dem Bearbeiten beginnen. ' +
          'Der Editor merkt sich Ihre Arbeit zwischen den Sitzungen, also z\u00f6gern Sie nicht, zu schlie\u00dfen und sp\u00e4ter zur\u00fcckzukehren. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>'
    };
    return templates[lang] || templates.en;
  }

  function insertLoremIpsum() {
    if (!richEditor) return;
    var html = generateLoremIpsum();
    richEditor.innerHTML = html;
    saveContent();
    updateStats();
    showToast(getTrans('toast_lorem_inserted') || 'Sample text inserted');
  }

  // ========== SAVE INDICATOR UPDATE ==========
  function updateSaveIndicator() {
    if (!saveIndicator) return;
    if (hideSaveIndicator) {
      saveIndicator.style.visibility = 'hidden';
      return;
    }
    saveIndicator.style.visibility = 'visible';
    var trans = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[getCurrentLang()]) || {};
    if (!lastSavedTime) {
      saveIndicator.textContent = trans.text_not_saved || '\u2014';
      return;
    }
    var diff = Math.floor((Date.now() - lastSavedTime) / 1000);
    if (diff < 60) {
      saveIndicator.textContent = trans.text_saved_just_now || 'Saved just now';
    } else if (diff < 3600) {
      var mins = Math.floor(diff / 60);
      saveIndicator.textContent = (trans.text_saved_minutes_ago || '{n}m ago').replace('{n}', mins);
    } else {
      var hours = Math.floor(diff / 3600);
      saveIndicator.textContent = (trans.text_saved_hours_ago || '{n}h ago').replace('{n}', hours);
    }
  }

  // ========== TOAST ==========
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

  // ========== CONTENT PERSISTENCE ==========
  function saveContent() {
    localStorage.setItem(STORAGE_KEY, richEditor.innerHTML);
    lastSavedTime = Date.now();
    localStorage.setItem(STORAGE_LAST_SAVED, lastSavedTime.toString());
    updateSaveIndicator();
  }

  function loadContent() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      richEditor.innerHTML = saved;
    }
    updateSaveIndicator();
  }

  if (richEditor) {
    richEditor.addEventListener('input', function() {
      saveContent();
      updateStats();
      if (outlinePanel && outlinePanel.style.display !== 'none') {
        clearTimeout(outlineDebounceTimer);
        outlineDebounceTimer = setTimeout(updateOutline, 300);
      }
      if (wordFreqPanel && wordFreqPanel.style.display !== 'none') {
        clearTimeout(wordFreqDebounce);
        wordFreqDebounce = setTimeout(updateWordFrequency, 800);
      }
    });
  }

  // ========== METADATA ==========
  var metadata = loadMetadata();

  function loadMetadata() {
    try { return JSON.parse(localStorage.getItem(STORAGE_METADATA)) || {}; }
    catch(e) { return {}; }
  }

  function saveMetadata(triggerSaveIndicator) {
    metadata.title = metaTitle ? metaTitle.value || '' : '';
    metadata.author = metaAuthor ? metaAuthor.value || '' : '';
    metadata.tags = metaTags ? metaTags.value || '' : '';
    metadata.category = metaCategory ? metaCategory.value || '' : '';
    if (!metadata.created) {
      metadata.created = new Date().toISOString();
    }
    metadata.modified = new Date().toISOString();
    localStorage.setItem(STORAGE_METADATA, JSON.stringify(metadata));
    renderMetaDates();
    if (triggerSaveIndicator) {
      lastSavedTime = Date.now();
      localStorage.setItem(STORAGE_LAST_SAVED, lastSavedTime.toString());
      updateSaveIndicator();
    }
  }

  function parseFrontmatter(content) {
    var fmRegex = /^---\n([\s\S]*?)\n---\n/;
    var match = content.match(fmRegex);
    if (!match) return null;
    var fmLines = match[1].split('\n');
    var parsed = {};
    for (var i = 0; i < fmLines.length; i++) {
      var line = fmLines[i].trim();
      if (!line) continue;
      var colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      var key = line.substring(0, colonIdx).trim();
      var value = line.substring(colonIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      if (key === 'tags' && value.startsWith('[') && value.endsWith(']')) {
        var tagStr = value.substring(1, value.length - 1);
        var tags = tagStr.split(',').map(function(t) {
          return t.trim().replace(/["']/g, '');
        }).filter(Boolean);
        value = tags.join(', ');
      }
      parsed[key] = value;
    }
    return parsed;
  }

  function importFrontmatter(content) {
    var parsed = parseFrontmatter(content);
    if (!parsed) return content;
    if (parsed.title && metaTitle) metaTitle.value = parsed.title;
    if (parsed.author && metaAuthor) metaAuthor.value = parsed.author;
    if (parsed.tags && metaTags) metaTags.value = parsed.tags;
    if (parsed.category && metaCategory) metaCategory.value = parsed.category;
    if (parsed.created) metadata.created = parsed.created;
    if (parsed.modified) metadata.modified = parsed.modified;
    metadata.title = parsed.title || '';
    metadata.author = parsed.author || '';
    metadata.tags = parsed.tags || '';
    metadata.category = parsed.category || '';
    localStorage.setItem(STORAGE_METADATA, JSON.stringify(metadata));
    renderMetaDates();
    var fmRegex = /^---\n[\s\S]*?\n---\n/;
    return content.replace(fmRegex, '');
  }

  function buildFrontmatter() {
    var fm = '---\n';
    if (metadata.title) fm += 'title: "' + metadata.title.replace(/"/g, '\\"') + '"\n';
    if (metadata.author) fm += 'author: "' + metadata.author.replace(/"/g, '\\"') + '"\n';
    if (metadata.tags) {
      var tagArr = metadata.tags.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
      fm += 'tags: [' + tagArr.map(function(t) { return '"' + t + '"'; }).join(', ') + ']\n';
    }
    if (metadata.category) fm += 'category: "' + metadata.category.replace(/"/g, '\\"') + '"\n';
    if (metadata.created) fm += 'created: ' + metadata.created + '\n';
    if (metadata.modified) fm += 'modified: ' + metadata.modified + '\n';
    fm += '---\n\n';
    return fm;
  }

  function renderMetaDates() {
    var createdLabel = getTrans('meta_label_created');
    var modifiedLabel = getTrans('meta_label_modified');
    if (metaCreated) {
      if (metadata.created) {
        metaCreated.textContent = createdLabel + ' ' + formatDate(new Date(metadata.created));
      } else {
        metaCreated.textContent = createdLabel + ' \u2014';
      }
    }
    if (metaModified) {
      if (metadata.modified) {
        metaModified.textContent = modifiedLabel + ' ' + formatDate(new Date(metadata.modified));
      } else {
        metaModified.textContent = modifiedLabel + ' \u2014';
      }
    }
  }

  function formatDate(d) {
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear();
    var time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return day + '/' + month + '/' + year + ' ' + time;
  }

  function setupMetadataHandlers() {
    var inputs = [metaTitle, metaAuthor, metaTags, metaCategory];
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i]) {
        inputs[i].addEventListener('input', function() {
          saveMetadata(false);
        });
      }
    }
  }

  // ========== PANEL FUNCTIONS WITH MAXHEIGHT FIX ==========
  function toggleMetadataPanel() {
    if (!metadataPanel) return;
    if (metadataPanel.style.display === 'none' || !metadataPanel.style.display) {
      metadataPanel.style.display = 'flex';
      metadataPanel.style.flexDirection = 'column';
      var topPx = getPanelTopOffset();
      var topNum = parseInt(topPx);
      metadataPanel.style.top = topPx;
      metadataPanel.style.maxHeight = 'calc(100vh - ' + (topNum + 56) + 'px)';
      if (metaTitle) metaTitle.value = metadata.title || '';
      if (metaAuthor) metaAuthor.value = metadata.author || '';
      if (metaTags) metaTags.value = metadata.tags || '';
      if (metaCategory) metaCategory.value = metadata.category || '';
      renderMetaDates();
    } else {
      saveMetadata(false);
      metadataPanel.style.display = 'none';
    }
  }

  function toggleOutline() {
    if (!outlinePanel) return;
    if (outlinePanel.style.display === 'none' || !outlinePanel.style.display) {
      outlinePanel.style.display = 'flex';
      outlinePanel.style.flexDirection = 'column';
      var topPx = getPanelTopOffset();
      var topNum = parseInt(topPx);
      outlinePanel.style.top = topPx;
      outlinePanel.style.maxHeight = 'calc(100vh - ' + (topNum + 56) + 'px)';
      updateOutline();
    } else {
      outlinePanel.style.display = 'none';
    }
  }

  function toggleWordFreqPanel() {
    if (!wordFreqPanel) return;
    if (wordFreqPanel.style.display === 'none' || !wordFreqPanel.style.display) {
      wordFreqPanel.style.display = 'flex';
      wordFreqPanel.style.flexDirection = 'column';
      var topPx = getPanelTopOffset();
      var topNum = parseInt(topPx);
      wordFreqPanel.style.top = topPx;
      wordFreqPanel.style.maxHeight = 'calc(100vh - ' + (topNum + 56) + 'px)';
      updateWordFrequency();
    } else {
      wordFreqPanel.style.display = 'none';
    }
  }

  // ========== STATS ==========
  function updateStats() {
    if (!richEditor) return;
    var text = getTextContent();
    var chars = text.length;
    var charsNoSpaces = text.replace(/\s/g, '').length;
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    var sentences = text.split(/[.!?..]+(?:\s|$)/).filter(function(s) {
      return s.trim().length > 0;
    }).length;
    var readMin = Math.ceil(words / 225) || 0;
    var speakMin = Math.ceil(words / 140) || 0;

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
      statsDetailed.style.display = statsExpanded ? 'flex' : 'none';
    }

    if (statsDefaultEl) {
      statsDefaultEl.onclick = function(e) {
        e.stopPropagation();
        statsExpanded = !statsExpanded;
        updateStats();
      };
    }

    if (goalTarget) updateGoalProgress();
  }

  // ========== GOAL TRACKER ==========
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
      if (goalLockTriggered) {
        goalLockTriggered = false;
        richEditor.contentEditable = 'true';
      }
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
    localStorage.setItem(STORAGE_GOAL_TARGET, target.toString());
    localStorage.setItem(STORAGE_GOAL_UNIT, goalUnit);
    localStorage.setItem(STORAGE_GOAL_LOCK, goalLockEnabled ? 'true' : 'false');
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
    localStorage.removeItem(STORAGE_GOAL_TARGET);
    localStorage.removeItem(STORAGE_GOAL_UNIT);
    localStorage.removeItem(STORAGE_GOAL_LOCK);
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

  function updateGoalUnitLabels() {
    if (!goalUnitSelect) return;
    var opts = goalUnitSelect.querySelectorAll('option');
    if (opts.length >= 3) {
      opts[0].textContent = getTrans('goal_unit_words');
      opts[1].textContent = getTrans('goal_unit_chars');
      opts[2].textContent = getTrans('goal_unit_paras');
    }
  }

  // ========== DOCUMENT OUTLINE ==========
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

  // ========== READING PROGRESS ==========
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
  if (richEditor) {
    richEditor.addEventListener('scroll', updateReadingProgress, { passive: true });
  }
  window.addEventListener('oros-reading-progress-changed', function(e) {
    readingProgressEnabled = e.detail.enabled;
    updateReadingProgress();
  });

  // ========== SMART TYPOGRAPHY ==========
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
  window.addEventListener('oros-smart-typography-changed', function(e) { smartTypographyEnabled = e.detail.enabled; });

  // ========== SMART PASTE ==========
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
      for (var i = all.length - 1; i >= 0; i--) {
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
    saveContent();
    updateStats();
  }

  // ========== WORD FREQUENCY ==========
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

  // ========== FOCUS MODE ==========
  var focusDebounceTimer = null;

  function initFocusMode() {
    if (!richEditor || !richWrapper) return;
    if (focusModeEnabled) {
      document.addEventListener('selectionchange', handleSelectionChange);
      richEditor.addEventListener('scroll', function() {
        clearFocusMode();
      });
    }
  }

  function handleSelectionChange() {
    if (!focusModeEnabled || !richWrapper) {
      clearFocusMode();
      return;
    }
    clearTimeout(focusDebounceTimer);
    focusDebounceTimer = setTimeout(function() {
      var selection = window.getSelection();
      if (!selection.rangeCount) { clearFocusMode(); return; }
      var range = selection.getRangeAt(0);
      if (!richEditor.contains(range.commonAncestorContainer)) { clearFocusMode(); return; }

      var node = range.startContainer;
      if (node.nodeType === 3) node = node.parentNode;
      if (node === richEditor) { clearFocusMode(); return; }
      if (!node || !richEditor.contains(node)) { clearFocusMode(); return; }

      clearFocusMode();
      var rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) { clearFocusMode(); return; }

      var wrapperRect = richWrapper.getBoundingClientRect();
      var spotlight = document.createElement('div');
      spotlight.id = 'focus-spotlight';
      spotlight.className = 'focus-spotlight';
      spotlight.style.top = (rect.top - wrapperRect.top) + 'px';
      spotlight.style.left = (rect.left - wrapperRect.left) + 'px';
      spotlight.style.width = rect.width + 'px';
      spotlight.style.height = rect.height + 'px';
      richWrapper.appendChild(spotlight);
    }, 150);
  }

  function clearFocusMode() {
    var spotlight = document.getElementById('focus-spotlight');
    if (spotlight) spotlight.remove();
  }

  window.addEventListener('oros-focus-mode-changed', function(e) {
    focusModeEnabled = e.detail.enabled;
    if (focusModeEnabled) {
      initFocusMode();
    } else {
      clearFocusMode();
    }
  });

  // ========== CONTEXT MENU ==========
  var contextMenu = null;

  function showContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (contextMenu) {
      contextMenu.remove();
      contextMenu = null;
    }

    var menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = '' +
      '<div class="cm-item" data-cmd="bold"><i class="fa fa-bold cm-icon"></i>Bold</div>' +
      '<div class="cm-item" data-cmd="italic"><i class="fa fa-italic cm-icon"></i>Italic</div>' +
      '<div class="cm-item" data-cmd="underline"><i class="fa fa-underline cm-icon"></i>Underline</div>' +
      '<div class="cm-divider"></div>' +
      '<div class="cm-item" data-cmd="strikeThrough"><i class="fa fa-strikethrough cm-icon"></i>Strike</div>' +
      '<div class="cm-item" data-cmd="formatBlock;H1"><i class="fa fa-header cm-icon"></i>H1</div>' +
      '<div class="cm-item" data-cmd="formatBlock;H2"><i class="fa fa-header cm-icon"></i>H2</div>' +
      '<div class="cm-item" data-cmd="formatBlock;H3"><i class="fa fa-header cm-icon"></i>H3</div>' +
      '<div class="cm-divider"></div>' +
      '<div class="cm-item" data-cmd="justifyLeft"><i class="fa fa-align-left cm-icon"></i>Align Left</div>' +
      '<div class="cm-item" data-cmd="justifyCenter"><i class="fa fa-align-center cm-icon"></i>Align Center</div>' +
      '<div class="cm-item" data-cmd="justifyRight"><i class="fa fa-align-right cm-icon"></i>Align Right</div>' +
      '<div class="cm-item" data-cmd="justifyFull"><i class="fa fa-align-justify cm-icon"></i>Justify</div>' +
      '<div class="cm-divider"></div>' +
      '<div class="cm-item" data-cmd="insertUnorderedList"><i class="fa fa-list-ul cm-icon"></i>Bullets</div>' +
      '<div class="cm-item" data-cmd="insertOrderedList"><i class="fa fa-list-ol cm-icon"></i>Numbers</div>' +
      '<div class="cm-divider"></div>' +
      '<div class="cm-item" data-cmd="undo"><i class="fa fa-undo cm-icon"></i>Undo</div>' +
      '<div class="cm-item" data-cmd="redo"><i class="fa fa-repeat cm-icon"></i>Redo</div>';

    menu.style.position = 'fixed';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';

    menu.addEventListener('click', function(ev) { ev.stopPropagation(); });
    menu.addEventListener('contextmenu', function(ev) { ev.preventDefault(); ev.stopPropagation(); });
    menu.addEventListener('mousedown', function(ev) { ev.stopPropagation(); });

    var items = menu.querySelectorAll('.cm-item');
    for (var i = 0; i < items.length; i++) {
      (function(item) {
        item.onclick = function(ev) {
          ev.stopPropagation();
          var cmdData = item.getAttribute('data-cmd');
          var parts = cmdData.split(';');
          var cmd = parts[0];
          var val = parts[1] || null;
          document.execCommand(cmd, false, val);
          if (contextMenu) { contextMenu.remove(); contextMenu = null; }
          removeCloseListeners();
          richEditor.focus();
          saveContent();
          updateStats();
        };
      })(items[i]);
    }

    document.body.appendChild(menu);
    contextMenu = menu;

    setTimeout(function() {
      document.addEventListener('mousedown', closeOnOutsideClick);
      document.addEventListener('keydown', closeOnKeydown);
    }, 0);
  }

  function closeOnOutsideClick(ev) {
    if (contextMenu && !contextMenu.contains(ev.target)) {
      contextMenu.remove();
      contextMenu = null;
      removeCloseListeners();
    }
  }

  function closeOnKeydown(ev) {
    if (contextMenu) {
      contextMenu.remove();
      contextMenu = null;
      removeCloseListeners();
    }
  }

  function removeCloseListeners() {
    document.removeEventListener('mousedown', closeOnOutsideClick);
    document.removeEventListener('keydown', closeOnKeydown);
  }

  // ========== MAIN TOOLBAR FORMATTING BUTTONS ==========
  function setupMainToolbarButtons() {
    if (!richEditor) return;
    var fmtBtns = document.querySelectorAll('.main-toolbar .fmt-text-btn, .main-toolbar .action-btn[data-cmd]');
    for (var i = 0; i < fmtBtns.length; i++) {
      (function(btn) {
        if (!btn.getAttribute('data-cmd')) return;
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          var cmd = btn.getAttribute('data-cmd');
          var block = btn.getAttribute('data-block');
          if (block) {
            document.execCommand('formatBlock', false, block);
          } else {
            document.execCommand(cmd, false);
          }
          saveContent();
          updateStats();
          richEditor.focus();
        });
      })(fmtBtns[i]);
    }
  }

  // ========== FILE OPEN ==========
  function openFile(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var content = e.target.result;
      if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        content = importFrontmatter(content);
      }
      richEditor.innerHTML = content;
      saveContent();
      updateStats();
      showToast(getTrans('toast_opened'));
    };
    reader.onerror = function() { showToast('Error reading file'); };
    reader.readAsText(file);
  }

  // ========== EXPORT ==========
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
        var hasMetadata = metadata.title || metadata.author || metadata.tags || metadata.category;
        data = hasMetadata ? buildFrontmatter() : '';
        data += convertHTMLtoMarkdown(content);
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
      case 'doc':
        data = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>' + content + '</body></html>';
        ext = '.doc';
        mime = 'application/msword;charset=utf-8';
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
          case 'h4': md += '\n#### ' + child.textContent + '\n\n'; break;
          case 'h5': md += '\n##### ' + child.textContent + '\n\n'; break;
          case 'h6': md += '\n###### ' + child.textContent + '\n\n'; break;
          case 'p': md += '\n' + htmlToMd(child) + '\n\n'; break;
          case 'br': md += '\n'; break;
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
          case 'a': md += '[' + child.textContent + '](' + child.getAttribute('href') + ')'; break;
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

  // ========== FIND & REPLACE ==========
  function toggleFindBar() {
    if (!findBar || !findInput) return;
    if (findBar.style.display === 'flex') {
      findBar.style.display = 'none';
      if (findInput) findInput.value = '';
      if (replaceInput) replaceInput.value = '';
      currentMatchIndex = -1;
      matchRanges = [];
    } else {
      findBar.style.display = 'flex';
      if (findInput) findInput.focus();
      highlightMatches();
    }
  }

  function highlightMatches() {
    if (!findInput || !richEditor) return;
    var searchTerm = findInput.value.toLowerCase();
    if (!searchTerm) {
      if (frResults) frResults.textContent = getTrans('fr_no_matches');
      return;
    }
    var content = richEditor.innerText.toLowerCase();
    var matches = 0;
    var idx = content.indexOf(searchTerm);
    while (idx !== -1) {
      matches++;
      idx = content.indexOf(searchTerm, idx + 1);
    }
    if (frResults) {
      frResults.textContent = matches > 0
        ? matches + ' ' + getTrans('fr_results_matches')
        : getTrans('fr_no_matches');
    }
  }

  function doReplace(isAll) {
    if (!findInput || !replaceInput || !richEditor) return;
    var searchTerm = findInput.value;
    var replaceTerm = replaceInput.value;
    if (!searchTerm) return;
    var content = richEditor.innerHTML;
    var escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp(escaped, 'gi');
    richEditor.innerHTML = content.replace(regex, replaceTerm);
    saveContent();
    updateStats();
    showToast(getTrans('text_saved'));
  }

  // ========== KEYBOARD SHORTCUTS ==========
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveContent();
      saveMetadata(true);
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
    else if (e.key === 'Escape') {
      if (metadataPanel && metadataPanel.style.display !== 'none') {
        saveMetadata(false);
        metadataPanel.style.display = 'none';
      }
      if (outlinePanel && outlinePanel.style.display !== 'none') {
        outlinePanel.style.display = 'none';
      }
      if (wordFreqPanel && wordFreqPanel.style.display !== 'none') {
        wordFreqPanel.style.display = 'none';
      }
      if (findBar && findBar.style.display === 'flex') {
        findBar.style.display = 'none';
      }
      if (goalBar && goalBar.style.display === 'flex') {
        goalBar.style.display = 'none';
      }
      if (statsExpanded) {
        statsExpanded = false;
        updateStats();
      }
      if (contextMenu) {
        contextMenu.remove();
        contextMenu = null;
        removeCloseListeners();
      }
    }
  });

  // ========== VISIBILITY INIT ==========
  if (hideStats && statsOverlay) statsOverlay.style.display = 'none';
  if (toolbarCenter) toolbarCenter.style.display = quickTbarShow ? 'flex' : 'none';
  if (!readingProgressEnabled && progressBar) progressBar.style.display = 'none';
  if (hideGoalBtn && btnGoal) btnGoal.style.display = 'none';
  if (hideOutlineBtn && btnOutline) btnOutline.style.display = 'none';
  if (hideMetadataBtn && btnMetadata) btnMetadata.style.display = 'none';
  if (hideFindBtn && btnFind) btnFind.style.display = 'none';
  if (hideWordFreqBtn && btnWordFreq) btnWordFreq.style.display = 'none';
  if (hideSaveIndicator && saveIndicator) saveIndicator.style.visibility = 'hidden';
  if (hideLoremBtn && btnLorem) btnLorem.style.display = 'none';

  // ========== CUSTOM EVENTS ==========
  window.addEventListener('oros-hide-stats-changed', function(e) {
    hideStats = e.detail.hidden;
    if (statsOverlay) statsOverlay.style.display = hideStats ? 'none' : '';
  });
  window.addEventListener('oros-hide-goal-btn-changed', function(e) {
    hideGoalBtn = e.detail.hidden;
    if (btnGoal) btnGoal.style.display = hideGoalBtn ? 'none' : '';
  });
  window.addEventListener('oros-hide-outline-btn-changed', function(e) {
    hideOutlineBtn = e.detail.hidden;
    if (btnOutline) btnOutline.style.display = hideOutlineBtn ? 'none' : '';
  });
  window.addEventListener('oros-hide-metadata-btn-changed', function(e) {
    hideMetadataBtn = e.detail.hidden;
    if (btnMetadata) btnMetadata.style.display = hideMetadataBtn ? 'none' : '';
  });
  window.addEventListener('oros-hide-find-btn-changed', function(e) {
    hideFindBtn = e.detail.hidden;
    if (btnFind) btnFind.style.display = hideFindBtn ? 'none' : '';
  });
  window.addEventListener('oros-hide-wordfreq-btn-changed', function(e) {
    hideWordFreqBtn = e.detail.hidden;
    if (btnWordFreq) btnWordFreq.style.display = hideWordFreqBtn ? 'none' : '';
  });
  window.addEventListener('oros-hide-save-indicator-changed', function(e) {
    hideSaveIndicator = e.detail.hidden;
    updateSaveIndicator();
  });
  window.addEventListener('oros-quick-tbar-changed', function(e) {
    quickTbarShow = e.detail.show;
    if (toolbarCenter) toolbarCenter.style.display = quickTbarShow ? 'flex' : 'none';
  });
  window.addEventListener('oros-hide-lorem-btn-changed', function(e) {
    hideLoremBtn = e.detail.hidden;
    if (btnLorem) btnLorem.style.display = hideLoremBtn ? 'none' : '';
  });
  window.addEventListener('oros-language-changed', function() {
    updateStats();
    renderMetaDates();
    updateGoalUnitLabels();
    updateSaveIndicator();
  });

  // ========== EVENT LISTENERS ==========
  if (btnSave) btnSave.addEventListener('click', function() {
    saveContent();
    saveMetadata(true);
    showToast(getTrans('text_saved'));
  });

  if (btnMetadata) btnMetadata.addEventListener('click', toggleMetadataPanel);
  if (btnCloseMetadata) btnCloseMetadata.addEventListener('click', function() {
    saveMetadata(false);
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
    if (findInput) findInput.addEventListener('input', highlightMatches);
    var btnFrReplace = document.getElementById('btn-fr-replace');
    var btnFrReplaceAll = document.getElementById('btn-fr-replace-all');
    if (btnFrReplace) btnFrReplace.addEventListener('click', function() { doReplace(false); });
    if (btnFrReplaceAll) btnFrReplaceAll.addEventListener('click', function() { doReplace(true); });
    if (btnCloseFR) btnCloseFR.addEventListener('click', function() {
      findBar.style.display = 'none';
      if (findInput) findInput.value = '';
      if (replaceInput) replaceInput.value = '';
      currentMatchIndex = -1;
      matchRanges = [];
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
      ? '\u03A3\u03AF\u03B3\u03BF\u03C5\u03C1\u03B1; \u038C\u03BB\u03BF \u03C4\u03BF \u03C0\u03B5\u03C1\u03B9\u03B5\u03C7\u03CC\u03BC\u03B5\u03BD\u03BF \u03B8\u03B1 \u03C7\u03B1\u03B8\u03B5\u03AF.'
      : 'Are you sure? All content will be lost.';
    if (confirm(msg)) {
      richEditor.innerHTML = '';
      saveContent();
      updateStats();
      showToast(getTrans('toast_cleared'));
    }
  });

  if (btnLorem) btnLorem.addEventListener('click', insertLoremIpsum);

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
    richEditor.addEventListener('click', function() {
      if (contextMenu) {
        contextMenu.remove();
        contextMenu = null;
        removeCloseListeners();
      }
    });
    richEditor.addEventListener('contextmenu', function(e) {
      if (e.altKey) {
        showContextMenu(e);
      }
    });
    richEditor.addEventListener('keyup', function() {
      handleSmartTypography();
      playTypewriterSound();
    });
    richEditor.addEventListener('paste', handleSmartPaste);
  }

  // ========== SAVE INDICATOR LIVE TICK ==========
  setInterval(updateSaveIndicator, 30000);

  // ========== INITIALIZE ==========
  initTypewriterSound();
  setupMainToolbarButtons();
  loadContent();
  loadMetadata();
  renderMetaDates();
  setupMetadataHandlers();
  initFocusMode();
  updateStats();
  updateGoalUnitLabels();
  updateReadingProgress();

})();