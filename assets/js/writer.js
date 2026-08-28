/* ============================================
   orOS Writer — Complete Application v2.4.0
   All bugs fixed, event delegation, full dialog support
   Author: Christos Koulaxizis | orOS Ecosystem
   ============================================ */

(function() {
  'use strict';

  // ===== CONFIGURATION =====
  var CONFIG = {
    APP_NAME: 'orOS Writer',
    VERSION: '2.4.0',
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
  var goalTargetInput = null;
  var goalUnitSelect = null;
  var goalLockCheckbox = null;
  var goalTimeInput = null;
  var goalProgressDisplay = null;
  var goalInterval = null;
  var goalNotified = false;
  var goalTotalSeconds = 0;
  var goalElapsedSeconds = 0;
  var findBar = null;
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
    var readingProgressEnabled = true; // Always on — toggle removed
  var currentLang = 'en';
  var toastContainer = null;
  var windowResizeDebounce = null;
  var AUTO_SAVE_INTERVAL_MS = 300000;
  var trackChangesObserver = null;
  var customTemplates = [];
  var clickHandlers = {};

  // ===== TEMPLATE DATA =====
    var TEMPLATES = [
    { id: 'blank', title: 'Blank', icon: 'fa-file-o', desc: 'Empty document', content: '<p><br></p>' },
    {
      id: 'essay',
      title: 'Essay',
      icon: 'fa-file-text-o',
      desc: 'Academic essay structure',
      content: '<h1 style="text-align:center;">[Essay Title]</h1>' +
        '<p style="text-align:center;color:var(--text-muted,#888);font-size:0.9em;">[Author Name] · [Course / Institution] · [Date]</p>' +
        '<p><br></p>' +
        '<h2>Abstract</h2>' +
        '<p>[A brief summary of the essay\'s main argument, key points, and conclusion. Aim for 150–250 words.]</p>' +
        '<p><br></p>' +
        '<h2>1. Introduction</h2>' +
        '<p>[Introduce the topic, provide background context, and state the thesis clearly. Outline the structure of the essay for the reader.]</p>' +
        '<p><br></p>' +
        '<h2>2. Background</h2>' +
        '<p>[Review relevant literature, establish the theoretical framework, and define key terms.]</p>' +
        '<p><br></p>' +
        '<h2>3. Main Argument</h2>' +
        '<p>[Present the primary argument with supporting evidence. Address counterarguments where appropriate.]</p>' +
        '<p><br></p>' +
        '<h3>3.1 [Sub-argument One]</h3>' +
        '<p>[Supporting point with evidence or analysis.]</p>' +
        '<p><br></p>' +
        '<h3>3.2 [Sub-argument Two]</h3>' +
        '<p>[Supporting point with evidence or analysis.]</p>' +
        '<p><br></p>' +
        '<h2>4. Discussion</h2>' +
        '<p>[Interpret the findings, discuss implications, and connect back to the thesis statement.]</p>' +
        '<p><br></p>' +
        '<h2>5. Conclusion</h2>' +
        '<p>[Restate the thesis in light of the evidence presented. Summarize key findings and suggest directions for further research.]</p>' +
        '<p><br></p>' +
        '<p style="color:var(--text-muted,#888);font-size:0.85em;"><strong>Keywords:</strong> [keyword one, keyword two, keyword three]</p>'
    },
    {
      id: 'letter',
      title: 'Formal Letter',
      icon: 'fa-envelope',
      desc: 'Business letter format',
      content: '<p style="text-align:right;">[Your Name]<br>[Street Address]<br>[City, Postal Code]<br>[Email] · [Phone]</p>' +
        '<p><br></p>' +
        '<p style="text-align:right;">[Date]</p>' +
        '<p><br></p>' +
        '<p>[Recipient Name]<br>[Recipient Title]<br>[Company / Organization]<br>[Street Address]<br>[City, Postal Code]</p>' +
        '<p><br></p>' +
        '<p><strong>Subject: [Brief description of the letter\'s purpose]</strong></p>' +
        '<p><br></p>' +
        '<p>Dear [Mr./Ms./Dr. Last Name],</p>' +
        '<p><br></p>' +
        '<p>[Opening paragraph — State the purpose of the letter clearly and concisely.]</p>' +
        '<p><br></p>' +
        '<p>[Body paragraph(s) — Provide supporting details, context, or arguments. Keep each paragraph focused on a single point.]</p>' +
        '<p><br></p>' +
        '<p>[Closing paragraph — Summarize the key message, state any expected action or response, and thank the recipient for their time.]</p>' +
        '<p><br></p>' +
        '<p>Sincerely,</p>' +
        '<p><br></p>' +
        '<p><br></p>' +
        '<p>[Your Name]<br>[Your Title, if applicable]</p>'
    },
    {
      id: 'novel',
      title: 'Novel Chapter',
      icon: 'fa-book',
      desc: 'Chapter structure with scene breaks',
      content: '<h1 style="text-align:center;">Chapter [One]</h1>' +
        '<p style="text-align:center;color:var(--text-muted,#888);font-style:italic;">[Optional chapter epigraph or quotation]</p>' +
        '<p><br></p>' +
        '<p>[Opening paragraph — Set the scene: time, place, atmosphere. Engage the reader with sensory detail or an inciting moment.]</p>' +
        '<p><br></p>' +
        '<p>[Continue the narrative. Develop character voice, advance the plot, and maintain tension or emotional engagement.]</p>' +
        '<p><br></p>' +
        '<p>[Build toward a turning point or revelation within the scene.]</p>' +
        '<p><br></p>' +
        '<p style="text-align:center;color:var(--text-muted,#888);">✦ ✦ ✦</p>' +
        '<p><br></p>' +
        '<p>[New scene — Shift in time, location, or perspective. Continue developing the narrative arc.]</p>' +
        '<p><br></p>' +
        '<p>[Close the chapter with a hook, emotional beat, or cliffhanger that compels the reader forward.]</p>'
    },
    {
      id: 'screenplay',
      title: 'Screenplay',
      icon: 'fa-video-camera',
      desc: 'Film script format',
      content: '<h1>[SCRIPT TITLE]</h1>' +
        '<p style="text-align:center;color:var(--text-muted,#888);">Written by [Author Name]</p>' +
        '<p><br></p>' +
        '<p style="text-transform:uppercase;font-weight:bold;">INT. [LOCATION] — [TIME OF DAY]</p>' +
        '<p><br></p>' +
        '<p>[Action description — Describe what the camera sees. Keep it present tense, visual, and concise. Only describe what can be seen or heard on screen.]</p>' +
        '<p><br></p>' +
        '<p style="text-transform:uppercase;text-align:center;font-weight:bold;">[CHARACTER NAME]</p>' +
        '<p style="margin-left:25%;">[Dialogue — What the character says. Parentheticals like (quietly) go on their own line above the dialogue.]</p>' +
        '<p><br></p>' +
        '<p style="text-transform:uppercase;text-align:center;font-weight:bold;">[SECOND CHARACTER]</p>' +
        '<p style="margin-left:25%;">[Response dialogue.]</p>' +
        '<p><br></p>' +
        '<p>[More action or transition. Use CUT TO: or FADE OUT. to end scenes.]</p>' +
        '<p><br></p>' +
        '<p style="text-transform:uppercase;text-align:right;">CUT TO:</p>' +
        '<p><br></p>' +
        '<p style="text-transform:uppercase;font-weight:bold;">EXT. [NEW LOCATION] — [TIME OF DAY]</p>' +
        '<p><br></p>' +
        '<p>[Continue the scene...]</p>'
    },
    {
      id: 'poem',
      title: 'Poem',
      icon: 'fa-music',
      desc: 'Centered verse with stanzas',
      content: '<h1 style="text-align:center;">[Poem Title]</h1>' +
        '<p style="text-align:center;color:var(--text-muted,#888);font-style:italic;">[for someone, or inspired by something]</p>' +
        '<p><br></p>' +
        '<p style="text-align:center;">[First line of the opening stanza]<br>[Second line]<br>[Third line]<br>[Fourth line]</p>' +
        '<p><br></p>' +
        '<p style="text-align:center;">[First line of the second stanza]<br>[Second line]<br>[Third line]<br>[Fourth line]</p>' +
        '<p><br></p>' +
        '<p style="text-align:center;">[First line of the closing stanza]<br>[Second line]<br>[Third line]<br>[Fourth line — the line that lingers]</p>'
    },
    {
      id: 'meeting',
      title: 'Meeting Notes',
      icon: 'fa-users',
      desc: 'Agenda, notes, and action items',
      content: '<h1>Meeting Notes</h1>' +
        '<p><strong>Date:</strong> [YYYY-MM-DD] · <strong>Time:</strong> [HH:MM]<br>' +
        '<strong>Location:</strong> [Room / Virtual link]<br>' +
        '<strong>F facilitator:</strong> [Name] · <strong>Note-taker:</strong> [Name]</p>' +
        '<p><br></p>' +
        '<h2>Attendees</h2>' +
        '<ul><li>[Name — Role]</li><li>[Name — Role]</li><li>[Name — Role]</li></ul>' +
        '<p><br></p>' +
        '<h2>Agenda</h2>' +
        '<ol>' +
        '<li>[Topic one — presenter, estimated time]</li>' +
        '<li>[Topic two — presenter, estimated time]</li>' +
        '<li>[Topic three — presenter, estimated time]</li>' +
        '<li>Any other business (AOB)</li>' +
        '</ol>' +
        '<p><br></p>' +
        '<h2>Discussion Notes</h2>' +
        '<h3>1. [Topic One]</h3>' +
        '<p>[Key points discussed, decisions made, concerns raised.]</p>' +
        '<p><br></p>' +
        '<h3>2. [Topic Two]</h3>' +
        '<p>[Key points discussed, decisions made, concerns raised.]</p>' +
        '<p><br></p>' +
        '<h3>3. [Topic Three]</h3>' +
        '<p>[Key points discussed, decisions made, concerns raised.]</p>' +
        '<p><br></p>' +
        '<h2>Action Items</h2>' +
        '<table class="custom-table"><thead><tr><th>Task</th><th>Owner</th><th>Due Date</th></tr></thead><tbody>' +
        '<tr><td>[Specific task description]</td><td>[Name]</td><td>[YYYY-MM-DD]</td></tr>' +
        '<tr><td>[Specific task description]</td><td>[Name]</td><td>[YYYY-MM-DD]</td></tr>' +
        '<tr><td>[Specific task description]</td><td>[Name]</td><td>[YYYY-MM-DD]</td></tr>' +
        '</tbody></table>' +
        '<p><br></p>' +
        '<h2>Next Meeting</h2>' +
        '<p><strong>Date:</strong> [YYYY-MM-DD] · <strong>Time:</strong> [HH:MM] · <strong>Location:</strong> [Room / Virtual link]</p>'
    }
  ];
  
    // ===== SPECIAL CHARACTER DATA =====
  var SPECIAL_CHARS = {
    greek: 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψωάέήίόύώϊϋΐΰ'.split(''),
    math: ['\u00B1','\u00D7','\u00F7','\u2260','\u2248','\u2264','\u2265','\u221E','\u222B','\u2211','\u221A','\u2202','\u2207','\u220F','\u2234','\u2235','\u221D','\u2208','\u2209','\u222A','\u2229','\u2282','\u2283','\u2286','\u2287','\u2295','\u2297','\u2299','\u226A','\u226B','\u00AC','\u2227','\u2228','\u2200','\u2203'],
    arrows: ['\u2190','\u2191','\u2192','\u2193','\u2194','\u2195','\u21D0','\u21D1','\u21D2','\u21D3','\u21D4','\u21D5','\u2197','\u2198','\u2199','\u2196','\u261D\uFE0E','\u261C\uFE0E','\u261E\uFE0E','\u261F\uFE0E'],
    currency: ['\u20AC','$','\u00A3','\u00A5','\u20BD','\u00A2','\u20B9','\u20A9','\u20AA','\u20AB','\u20B4','\u20B8','\u20BA','\u20B1','\u0E3F','\u20A1','\u20A8','\u20AE'],
    punctuation: ['\u00AB','\u00BB','\u2039','\u203A','\u201E','\u201C','\u201D','\u2018','\u2019','\u201A','\u201B','\u201F','\u00A1','\u00BF','\u00B7','\u2022','\u25E6','\u00A7','\u00B6','\u2030','\u2020','\u2021'],
    symbols: ['\u00A9','\u00AE','\u2122','\u00B0','\u2116','\u266A','\u266B','\u266C','\u266F','\u266D','\u266E','\u2611\uFE0E','\u2612\uFE0E','\u2610\uFE0E','\u2713','\u2717','\u2605','\u2606','\u261E\uFE0E','\u261C\uFE0E','\u261D\uFE0E','\u261F\uFE0E','\u2690','\u2691','\u2693','\u2694\uFE0E','\u2696\uFE0E','\u2697','\u2699\uFE0E','\u26A0\uFE0E'],
	emoji: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','👍','👎','👊','✊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✌️','🤞','🤟','🤘','👌','🤌','🤏','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤙','💪','🦾','🙏','👀','👁️','👅','👄','🧠','🗣️','👤','👥','🫂','👶','👧','👦','👩','👨','👩‍🦰','👨‍🦰','👩‍🦱','👨‍🦱','👩‍🦳','👨‍🦳','👩‍🦲','👨‍🦲','👵','👴','👲','👳‍♀️','👳‍♂️','🧕','👮‍♀️','👮‍♂️','👷‍♀️','👷‍♂️','💂‍♀️','💂‍♂️','🕵️‍♀️','🕵️‍♂️','👩‍⚕️','👨‍⚕️','👩‍🌾','👨‍🌾','👩‍🍳','👨‍🍳','👩‍🎓','👨‍🎓','👩‍🎤','👨‍🎤','👩‍🏫','👨‍🏫','👩‍🏭','👨‍🏭','👩‍💻','👨‍💻','👩‍💼','👨‍💼','👩‍🔧','👨‍🔧','👩‍🔬','👨‍🔬','👩‍🎨','👨‍🎨','👩‍🚒','👨‍🚒','✍️','📝','💻','⌨️','🖥️','🖨️','🖱️','💾','💿','📀','📷','📸','📹','🎥','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🗑️','🛢️','💸','💵','💴','💶','💷','💰','💳','💎','⚖️','🔧','🔨','⚒️','🛠️','⚙️','🔗','⛓️','🧰','🧲','🔬','🔭','📡','💉','💊','🚪','🛏️','🛋️','🚽','🚿','🛁','🧴','🧷','🧹','🧺','🧻','🧼','🧽','🧯','🛒',' cigarette','🚬','⚰️','⚱️','🗿','⚠️','🚸',' ⛔','🚫','🚷','🔞','☢️','☣️','⬆️','↗️','➡️','↘️','⬇️','↙️','⬅️','↖️','↕️','↔️','↩️','↪️','⤴️','⤵️','🔀','🔁','🔂','🔄','🔃','🎵','🎶','〰️','➕','➖','➗','✖️','💲','💱','™️','©️','®️','〽️','‼️','⁉️','❓','❔','❕','❗','〰️','♻️','✅','🆚','💯','❌','⭕','🛑','🔥','🌟','💥','💫','💦','💨','🕳️','💣','💬','👁️‍🗨️','🗨️','🗯️','💭','💤']
  };

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
      try { var rawMeta = localStorage.getItem(this.OLD_STORAGE_METADATA); if (rawMeta) oldMetadata = JSON.parse(rawMeta); } catch(e2) {}

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
    clickHandlers[id] = fn;
  }

  // Delegated click handler — survives DOM re-rendering
  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el !== document) {
      if (el.id && clickHandlers[el.id]) {
        clickHandlers[el.id].call(el, e);
        return;
      }
      el = el.parentNode;
    }
  });

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

  function cloneObject(obj) {
    var clone = {};
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) { clone[keys[i]] = obj[keys[i]]; }
    return clone;
  }

  function escapeHtml(str) { var div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

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

    updateReadingProgress();
    updateOutline();
       updateGoalProgress();;
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

  // ===== SETTINGS =====
  function loadSettings() {
    try {
      var raw = localStorage.getItem(CONFIG.STORAGE_PREFIX + 'settings');
      if (!raw) return {};
      var s = JSON.parse(raw);
      smartTypographyEnabled = s.smartTypography !== false;
      typewriterSoundEnabled = s.typewriterSound === true;
            readingProgressEnabled = true;
      return s;
    } catch(e) { return {}; }
  }

  function saveSettings() {
    var s = {
      smartTypography: smartTypographyEnabled,
      typewriterSound: typewriterSoundEnabled,
    };
    var set = function(id, prop) { var el = document.getElementById(id); if (el) s[prop] = el.checked; };
    set('toggle-smart-typography', 'smartTypography');
    set('toggle-typewriter-sound', 'typewriterSound');
    try { localStorage.setItem(CONFIG.STORAGE_PREFIX + 'settings', JSON.stringify(s)); } catch(e) {}
    smartTypographyEnabled = s.smartTypography !== false;
    typewriterSoundEnabled = s.typewriterSound === true;
    readingProgressEnabled = s.readingProgress !== false;
    showToast(getTrans('btn_save') !== 'btn_save' ? getTrans('btn_save') : 'Settings saved');
  }

  function loadSettingsValues() {
    var set = function(id, val) { var el = document.getElementById(id); if (el) el.checked = val; };
    set('toggle-smart-typography', smartTypographyEnabled);
    set('toggle-typewriter-sound', typewriterSoundEnabled);
  }
  
    function setupSettingToggles() {
    var stToggle = document.getElementById('toggle-smart-typography');
    if (stToggle) {
      stToggle.checked = smartTypographyEnabled;
      stToggle.addEventListener('change', function() {
        smartTypographyEnabled = this.checked;
        var s = {};
        try { s = JSON.parse(localStorage.getItem(CONFIG.STORAGE_PREFIX + 'settings') || '{}'); } catch(e) {}
        s.smartTypography = smartTypographyEnabled;
        try { localStorage.setItem(CONFIG.STORAGE_PREFIX + 'settings', JSON.stringify(s)); } catch(e) {}
        showToast(this.checked ? 'Smart Typography ON' : 'Smart Typography OFF');
      });
    }

    var twToggle = document.getElementById('toggle-typewriter-sound');
    if (twToggle) {
      twToggle.checked = typewriterSoundEnabled;
      twToggle.addEventListener('change', function() {
        typewriterSoundEnabled = this.checked;
        var s = {};
        try { s = JSON.parse(localStorage.getItem(CONFIG.STORAGE_PREFIX + 'settings') || '{}'); } catch(e) {}
        s.typewriterSound = typewriterSoundEnabled;
        try { localStorage.setItem(CONFIG.STORAGE_PREFIX + 'settings', JSON.stringify(s)); } catch(e) {}
        showToast(this.checked ? 'Typewriter Sound ON' : 'Typewriter Sound OFF');
      });
    }
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

  var typewriterAudioCtx = null;
  function initTypewriterSound() {}
    function playTypewriterSound() {
    if (!typewriterSoundEnabled) return;
    try {
      if (!typewriterAudioCtx) typewriterAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var ctx = typewriterAudioCtx;
      var now = ctx.currentTime;

      // 1. Mechanical clack — filtered noise burst
      var noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
      var data = noiseBuf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.5);
      var noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;

      var noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1800 + Math.random() * 400;
      noiseFilter.Q.value = 1.2;

      var noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.04);

      // 2. Key strike — short tonal body
      var osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280 + Math.random() * 60, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.03);

      var oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.22, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(oscGain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);

      // 3. Subtle carriage plink — delayed faint high tick
      var osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 900 + Math.random() * 200;

      var osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(0, now + 0.018);
      osc2Gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
      osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc2.connect(osc2Gain).connect(ctx.destination);
      osc2.start(now + 0.018);
      osc2.stop(now + 0.045);
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
      else { autocorrectRules = cloneObject(DEFAULT_AUTOCORRECT); saveAutoCorrections(); }
    } catch(e) { autocorrectRules = cloneObject(DEFAULT_AUTOCORRECT); }
  }

  function saveAutoCorrections() {
    try { localStorage.setItem(CONFIG.STORAGE_PREFIX + 'autocorrect', JSON.stringify(autocorrectRules)); } catch(e) {}
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
    autocorrectRules = cloneObject(DEFAULT_AUTOCORRECT);
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
          var t = null;
          for (var j = 0; j < customTemplates.length; j++) { if (customTemplates[j].id === id) { t = customTemplates[j]; break; } }
          if (!t) return;
          openTemplateEditor(t);
        });
      })(editBtns[e]);
    }
  }
  
  
      function renderTemplatesGrid() {
    var grid = document.getElementById('templates-grid');
    if (!grid) return;
    var html = '';
    for (var i = 0; i < TEMPLATES.length; i++) {
      var t = TEMPLATES[i];
      html += '<div class="template-card" data-template-id="' + t.id + '">' +
        '<i class="fa ' + t.icon + ' template-icon"></i>' +
        '<div class="template-info"><strong>' + escapeHtml(t.title) + '</strong>' +
        '<small>' + escapeHtml(t.desc) + '</small></div></div>';
    }
    if (customTemplates.length > 0) {
      html += '<div class="template-section-divider"><span>Custom Templates</span></div>';
      for (var j = 0; j < customTemplates.length; j++) {
        var ct = customTemplates[j];
        html += '<div class="template-card" data-custom-id="' + ct.id + '">' +
          '<i class="fa fa-file-o template-icon"></i>' +
          '<div class="template-info"><strong>' + escapeHtml(ct.title) + '</strong>' +
          '<small>' + escapeHtml(ct.desc || '') + '</small></div>' +
          '<button class="template-edit-btn" data-edit-id="' + ct.id + '" title="Edit"><i class="fa fa-pencil"></i></button>' +
          '<button class="template-delete-btn" data-delete-id="' + ct.id + '" title="Delete"><i class="fa fa-trash"></i></button></div>';
      }
    }
    grid.innerHTML = html;

    var cards = grid.querySelectorAll('.template-card');
    for (var k = 0; k < cards.length; k++) {
      (function(card) {
        card.addEventListener('mouseenter', function() {
          var eb = card.querySelector('.template-edit-btn');
          if (eb) eb.style.opacity = '1';
        });
        card.addEventListener('mouseleave', function() {
          var eb = card.querySelector('.template-edit-btn');
          if (eb) eb.style.opacity = '0';
        });
        card.addEventListener('click', function(e) {
          if (e.target.closest('.template-delete-btn')) return;
          if (e.target.closest('.template-edit-btn')) return;
          var tplId = card.getAttribute('data-template-id');
          var customId = card.getAttribute('data-custom-id');
          var content = '';
          if (tplId) {
            for (var i = 0; i < TEMPLATES.length; i++) { if (TEMPLATES[i].id === tplId) { content = TEMPLATES[i].content; break; } }
          } else if (customId) {
            for (var j = 0; j < customTemplates.length; j++) { if (customTemplates[j].id === customId) { content = customTemplates[j].content; break; } }
          }
          if (!content) return;
          if (richEditor) {
            richEditor.innerHTML = content;
            saveCurrentTabContent();
            updateStats();
          }
          var dlg = document.getElementById('templates-dialog-overlay');
          if (dlg) dlg.style.display = 'none';
          showToast('Template applied');
        });
      })(cards[k]);
    }

    var delBtns = grid.querySelectorAll('.template-delete-btn');
    for (var d = 0; d < delBtns.length; d++) {
      (function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var id = btn.getAttribute('data-delete-id');
          customTemplates = customTemplates.filter(function(ct) { return ct.id !== id; });
          saveCustomTemplates();
          renderTemplatesGrid();
          showToast('Template deleted');
        });
      })(delBtns[d]);
    }

    var editBtns = grid.querySelectorAll('.template-edit-btn');
    for (var e = 0; e < editBtns.length; e++) {
      (function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var id = btn.getAttribute('data-edit-id');
          var tpl = null;
          for (var i = 0; i < customTemplates.length; i++) { if (customTemplates[i].id === id) { tpl = customTemplates[i]; break; } }
          if (!tpl) return;
          var newTitle = prompt('Template title:', tpl.title);
          if (newTitle === null) return;
          var newDesc = prompt('Description:', tpl.desc || '');
          if (newDesc === null) return;
          tpl.title = newTitle.trim() || 'Untitled';
          tpl.desc = newDesc.trim();
          saveCustomTemplates();
          renderTemplatesGrid();
          showToast('Template updated');
        });
      })(editBtns[e]);
    }
  }

  // ===== FIND & REPLACE =====
  var findTypingTimer = null;
  var replaceTypingTimer = null;
  var findHistory = [];
  var findHistoryIndex = -1;

  function setupFindReplace() {
    if (findInput) {
      findInput.addEventListener('keyup', function() {
        clearTimeout(findTypingTimer);
        findTypingTimer = setTimeout(findInDocument, 300);
      });
    }
    bindClick('btn-find-prev', findPrevious);
    bindClick('btn-find-next', findNext);
    bindClick('btn-replace', replaceMatch);
    bindClick('btn-replace-all', replaceAll);
    bindClick('btn-close-find', function() {
      if (findBar) findBar.style.display = 'none';
      var fbtn = document.getElementById('btn-find');
      if (fbtn) fbtn.classList.remove('active');
      hideSearchHighlights();
    });
  }

  function findInDocument() {
    hideSearchHighlights();
    if (!findInput || !richEditor) return;
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
    if (!richEditor) return;
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
    if (!findInput || !richEditor) return;
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
    if (!findInput || !richEditor) return;
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
    var isVisible = wordFreqPanel.style.display !== 'none';
    wordFreqPanel.style.display = isVisible ? 'none' : '';
    if (!isVisible) calculateWordFrequency();
  }

  function calculateWordFrequency() {
    if (!richEditor) return;
    var text = richEditor.innerText || '';
    text = text.toLowerCase().replace(/[.,!?;:"'()\[\]{}]/g, '').trim();
    var words = text.split(/\s+/).filter(function(w) { return w && w.length > 2; });
    var freq = {};
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      freq[w] = (freq[w] || 0) + 1;
    }
    var arr = [];
    var keys = Object.keys(freq);
    for (var k = 0; k < keys.length; k++) { arr.push({ word: keys[k], count: freq[keys[k]] }); }
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

    // ===== COMMENTS =====
  function setupComments() {
    bindClick('btn-comments', toggleCommentsPanel);
    bindClick('btn-add-comment', addCommentFromPanel);
    loadAndRestoreComments();

    // selectionchange listener
    document.addEventListener('selectionchange', function() {
      if (!commentsPanel || commentsPanel.style.display === 'none') return;
      var sel = window.getSelection();
      if (sel.rangeCount > 0 && richEditor && richEditor.contains(sel.anchorNode)) {
        var range = sel.getRangeAt(0);
        if (!range.collapsed) {
          savedCommentRange = range.cloneRange();
          var addArea = document.getElementById('comment-add-area');
          if (addArea) addArea.style.display = '';
          var ci = document.getElementById('comment-input');
          if (ci) ci.placeholder = '"' + range.toString().substring(0, 40) + (range.toString().length > 40 ? '…' : '') + '"';
        }
      }
    });

    // Click on commented text → highlight card (independent listener)
    if (richEditor) {
      richEditor.addEventListener('click', function(e) {
        var highlight = e.target.closest ? e.target.closest('.comment-highlight') : null;
        if (!highlight && e.target.classList && e.target.classList.contains('comment-highlight')) {
          highlight = e.target;
        }
        if (!highlight) return;

        var cid = highlight.getAttribute('data-comment-id');
        if (!cid || !commentsPanel) return;

        var cards = commentsPanel.querySelectorAll('.comment-item.card-active');
        for (var c = 0; c < cards.length; c++) cards[c].classList.remove('card-active');

        var card = commentsPanel.querySelector('.comment-item[data-comment-id="' + cid + '"]');
        if (card) {
          card.classList.add('card-active');
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (card._cardTimeout) clearTimeout(card._cardTimeout);
          card._cardTimeout = setTimeout(function() { card.classList.remove('card-active'); }, 2500);
        }
      });
    }
  }

    function toggleCommentsPanel() {
    if (!commentsPanel) return;
    
    var btn = document.getElementById('btn-comments');
    var isVisible = commentsPanel.style.display !== 'none' && commentsPanel.style.display !== '';
    
    if (!isVisible) {
      // Open panel
      var sel = window.getSelection();
      if (sel.rangeCount > 0 && richEditor && richEditor.contains(sel.anchorNode)) {
        savedCommentRange = sel.getRangeAt(0).cloneRange();
      } else {
        savedCommentRange = null;
      }
      var addArea = document.getElementById('comment-add-area');
      if (addArea) addArea.style.display = '';
      var ci = document.getElementById('comment-input');
            if (ci) { ci.value = ''; }
      
      commentsPanel.style.display = '';
      if (btn) btn.classList.add('active');
      refreshCommentsList();
    } else {
      // Close panel
      commentsPanel.style.display = 'none';
      if (btn) btn.classList.remove('active');
    }
  }

    function loadAndRestoreComments() {
    if (!richEditor) return;
    var tab = tabsModule.getActive();
    if (!tab || !tab.metadata || !tab.metadata.comments) return;
    var comments = tab.metadata.comments || [];
    for (var i = 0; i < comments.length; i++) {
      var c = comments[i];
      var highlights = richEditor.querySelectorAll('[data-comment-id="' + c.id + '"]');
      for (var j = 0; j < highlights.length; j++) {
        highlights[j].classList.add('comment-highlight');
      }
    }
  }

    function saveComments() {
    if (!richEditor) return [];
    var tab = tabsModule.getActive();
    if (!tab) return [];
    var highlights = richEditor.querySelectorAll('.comment-highlight');
    var comments = [];
    var seenIds = {};
    for (var i = 0; i < highlights.length; i++) {
      var id = highlights[i].getAttribute('data-comment-id');
      if (!id || seenIds[id]) continue;
      seenIds[id] = true;
      var text = highlights[i].getAttribute('data-text') || '';
      var timestamp = highlights[i].getAttribute('data-timestamp') || new Date().toISOString();
      var quoted = highlights[i].getAttribute('data-quoted') || highlights[i].textContent || '';
      comments.push({ id: id, text: text, timestamp: timestamp, quoted: quoted });
    }
    var meta = tabsModule.getMetadata();
    meta.comments = comments;
    tabsModule.setMetadata(meta);
    return comments;
  }

    function refreshCommentsList() {
    if (!commentsPanel) return;
    var list = commentsPanel.querySelector('#comments-list');
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
      var date = new Date(c.timestamp).toLocaleString(currentLang === 'el' ? 'el-GR' : 'en-US');
      html += '<div class="comment-item" data-comment-id="' + c.id + '">' +
        '<div class="comment-meta">' +
          '<span class="comment-date">' + date + '</span>' +
          '<button class="comment-delete" data-id="' + c.id + '" title="' + (getTrans('delete') !== 'delete' ? getTrans('delete') : 'Delete') + '"><i class="fa fa-trash"></i></button>' +
        '</div>' +
        '<div class="comment-text">' + escapeHtml(c.text) + '</div>' +
        '<div class="comment-quoted" data-id="' + c.id + '">' + (c.quoted ? escapeHtml(c.quoted) : '') + '</div>' +
      '</div>';
    }
    list.innerHTML = html;
    
    // Add click handlers for highlighting + delete
    var deleteBtns = list.querySelectorAll('.comment-delete');
    for (var d = 0; d < deleteBtns.length; d++) {
      (function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var cid = btn.getAttribute('data-id');
          if (confirm('Delete this comment?')) {
            deleteCommentById(cid);
          }
        });
      })(deleteBtns[d]);
    }
    
        // Hover on comment card → highlight text in editor
    var items = list.querySelectorAll('.comment-item');
    for (var ci = 0; ci < items.length; ci++) {
      (function(item) {
        var cid = item.getAttribute('data-comment-id');
        item.addEventListener('mouseenter', function() {
          highlightCommentInTextPersistent(cid);
        });
        item.addEventListener('mouseleave', function() {
          clearCommentHighlight();
        });
      })(items[ci]);
    }
  }

  function highlightCommentInTextPersistent(commentId) {
    clearCommentHighlight();
    if (!richEditor) return;
    var highlights = richEditor.querySelectorAll('[data-comment-id="' + commentId + '"]');
    for (var h = 0; h < highlights.length; h++) {
      highlights[h].classList.add('comment-active');
      highlights[h].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
    function addCommentFromPanel() {
    var textarea = document.getElementById('comment-input');
    if (!textarea || !textarea.value.trim()) { showToast('Enter comment text'); return; }

    if (!savedCommentRange || savedCommentRange.collapsed) {
      showToast('Select text to comment on first');
      return;
    }

    var selectedText = savedCommentRange.toString().trim();
    if (!selectedText) { showToast('Select text to comment on first'); return; }

    if (richEditor) {
      richEditor.focus();
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedCommentRange);
    }

    createComment(textarea.value.trim(), selectedText);
    textarea.value = '';
    savedCommentRange = null;
    refreshCommentsList();
    showToast('Comment added');
  }

    function createComment(commentText, quotedText) {
    var id = 'comm_' + Date.now();
    var timestamp = new Date().toISOString();
    var highlight = document.createElement('span');
    highlight.className = 'comment-highlight';
    highlight.setAttribute('data-comment-id', id);
    highlight.setAttribute('data-text', commentText);      // ← ΠΡΟΣΘΕΣΕ ΑΥΤΗ ΤΗ ΓΡΑΜΜΗ
    highlight.setAttribute('data-quoted', quotedText);
    highlight.setAttribute('data-timestamp', timestamp);
    highlight.textContent = quotedText;

    var sel = window.getSelection();
    if (sel.rangeCount === 0) return;
    var range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(highlight);

    var newRange = document.createRange();
    newRange.setStartAfter(highlight);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    var tab = tabsModule.getActive();
    if (!tab) return;
    var meta = tabsModule.getMetadata();
    var comments = meta.comments || [];
    comments.push({
      id: id,
      text: commentText,
      timestamp: timestamp,
      quoted: quotedText
    });
    meta.comments = comments;
    tabsModule.setMetadata(meta);
    saveCurrentTabContent();
  }
  
      // ===== FOOTNOTES =====
  var footnoteCounter = 0;
    var savedFootnoteRange = null;
  var savedCommentRange = null;
  var savedLinkRange = null;      
  var savedImageRange = null;    
  var savedTableRange = null;     

  function setupFootnotes() {
    bindClick('btn-footnote', insertFootnote);
    bindClick('btn-insert-footnote', insertFootnoteFromDialog);
    bindClick('btn-close-footnotes', function() { if (footnoteArea) footnoteArea.style.display = 'none'; });
    setupFootnoteCleanup();
  }
  
   /* ===== COMMENT CLEANUP ON DELETE ===== */
  var commentCleanupObserver = null;
  var commentCleanupTimer = null;

  function setupCommentCleanup() {
    if (!richEditor || commentCleanupObserver) return;
    commentCleanupObserver = new MutationObserver(function() {
      clearTimeout(commentCleanupTimer);
      commentCleanupTimer = setTimeout(checkAndRemoveOrphanComments, 200);
    });
    commentCleanupObserver.observe(richEditor, { childList: true, subtree: true, characterData: true });
  }

  function checkAndRemoveOrphanComments() {
    var tab = tabsModule.getActive();
    if (!tab || !tab.metadata || !tab.metadata.comments) return;
    var comments = tab.metadata.comments;
    var orphaned = [];

    for (var i = 0; i < comments.length; i++) {
      var id = comments[i].id;
      var highlight = richEditor.querySelector('[data-comment-id="' + id + '"]');
      if (!highlight || !highlight.textContent.trim()) {
        orphaned.push(id);
      }
    }

    if (orphaned.length === 0) return;

    for (var o = 0; o < orphaned.length; o++) {
      var els = richEditor.querySelectorAll('[data-comment-id="' + orphaned[o] + '"]');
      for (var e = 0; e < els.length; e++) {
        var parent = els[e].parentNode;
        parent.replaceChild(document.createTextNode(els[e].textContent), els[e]);
        parent.normalize();
      }
    }

    tab.metadata.comments = comments.filter(function(c) {
      return orphaned.indexOf(c.id) === -1;
    });
    tabsModule.setMetadata(tab.metadata);
    saveCurrentTabContent();
    refreshCommentsList();
  }

  function deleteCommentsByIds(commIds) {
    var tab = tabsModule.getActive();
    if (!tab || !tab.metadata || !tab.metadata.comments) return;

    for (var i = 0; i < commIds.length; i++) {
      var els = richEditor.querySelectorAll('[data-comment-id="' + commIds[i] + '"]');
      for (var e = 0; e < els.length; e++) {
        var parent = els[e].parentNode;
        parent.replaceChild(document.createTextNode(els[e].textContent), els[e]);
        parent.normalize();
      }
    }

    tab.metadata.comments = tab.metadata.comments.filter(function(c) {
      return commIds.indexOf(c.id) === -1;
    });
    tabsModule.setMetadata(tab.metadata);
    saveCurrentTabContent();
    refreshCommentsList();
  }

  function deleteCommentById(id) {
    var tab = tabsModule.getActive();
    if (!tab || !tab.metadata || !tab.metadata.comments) return;

    var highlights = richEditor.querySelectorAll('[data-comment-id="' + id + '"]');
    for (var h = 0; h < highlights.length; h++) {
      var parent = highlights[h].parentNode;
      parent.replaceChild(document.createTextNode(highlights[h].textContent), highlights[h]);
      parent.normalize();
    }

    tab.metadata.comments = tab.metadata.comments.filter(function(c) { return c.id !== id; });
    tabsModule.setMetadata(tab.metadata);
    saveCurrentTabContent();
    refreshCommentsList();
    showToast('Comment deleted');
  }

  function highlightCommentInText(commentId) {
    clearCommentHighlight();
    var highlights = richEditor.querySelectorAll('[data-comment-id="' + commentId + '"]');
    for (var h = 0; h < highlights.length; h++) {
      highlights[h].classList.add('comment-flash');
      highlights[h].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(function() {
      var flashes = richEditor.querySelectorAll('.comment-flash');
      for (var f = 0; f < flashes.length; f++) flashes[f].classList.remove('comment-flash');
    }, 1500);
  }

    function clearCommentHighlight() {
    if (!richEditor) return;
    var highlights = richEditor.querySelectorAll('.comment-flash, .comment-active');
    for (var h = 0; h < highlights.length; h++) {
      highlights[h].classList.remove('comment-flash');
      highlights[h].classList.remove('comment-active');
    }
  }

  function insertFootnote() {
    var sel = window.getSelection();
    if (sel.rangeCount > 0 && richEditor && richEditor.contains(sel.anchorNode)) {
      savedFootnoteRange = sel.getRangeAt(0).cloneRange();
    } else {
      savedFootnoteRange = null;
    }

    var dlg = document.getElementById('footnote-dialog-overlay');
    if (dlg) {
      dlg.style.display = 'flex';
      var txtInput = document.getElementById('footnote-text-input');
      if (txtInput) {
        txtInput.value = (savedFootnoteRange && !savedFootnoteRange.collapsed) ? savedFootnoteRange.toString() : '';
        setTimeout(function() { txtInput.focus(); }, 50);
      }
    }
  }

  function insertFootnoteFromDialog() {
    var txtInput = document.getElementById('footnote-text-input');
    var text = txtInput ? txtInput.value.trim() : '';
    if (!text) { showToast('Enter footnote text'); return; }

    var dlg = document.getElementById('footnote-dialog-overlay');
    if (dlg) dlg.style.display = 'none';

    footnoteCounter++;
    var refId = 'fn_ref_' + footnoteCounter;
    var fnId = 'fn_' + footnoteCounter;
    var sup = document.createElement('sup');
    sup.innerHTML = '<a href="#' + fnId + '" id="' + refId + '" class="footnote-ref" data-fn-id="' + fnId + '">[' + footnoteCounter + ']</a>';

    var range;
    if (savedFootnoteRange) {
      range = savedFootnoteRange;
    } else if (richEditor) {
      richEditor.focus();
      var sel = window.getSelection();
      if (sel.rangeCount > 0 && richEditor.contains(sel.anchorNode)) {
        range = sel.getRangeAt(0);
      } else {
        range = document.createRange();
        range.selectNodeContents(richEditor);
        range.collapse(false);
      }
    } else {
      showToast('Click in the editor first');
      return;
    }

    savedFootnoteRange = null;

    try {
      range.deleteContents();
      range.insertNode(sup);

      var newRange = document.createRange();
      newRange.setStartAfter(sup);
      newRange.collapse(true);
      var newSel = window.getSelection();
      newSel.removeAllRanges();
      newSel.addRange(newRange);
    } catch(e) {
      showToast('Could not insert footnote at cursor');
      return;
    }

    var fnArea = document.getElementById('footnote-area');
    if (fnArea) {
      fnArea.style.display = '';
      var fnEntry = document.createElement('div');
      fnEntry.id = fnId;
      fnEntry.className = 'footnote-entry';
      fnEntry.innerHTML = '<a href="#' + refId + '" class="footnote-back" data-ref-id="' + refId + '">[' + footnoteCounter + ']</a> <span class="footnote-text">' + escapeHtml(text) + '</span>';
      fnArea.appendChild(fnEntry);
      setupFootnoteLinkHandler(fnEntry.querySelector('.footnote-back'));
      fnArea.scrollIntoView({ behavior: 'smooth' });
    }

    var tab = tabsModule.getActive();
    if (tab) {
      var meta = tabsModule.getMetadata();
      var footnotes = meta.footnotes || [];
      footnotes.push({ refId: refId, fnId: fnId, number: footnoteCounter, text: text });
      meta.footnotes = footnotes;
      tabsModule.setMetadata(meta);
    }

    if (txtInput) txtInput.value = '';
    renumberFootnotes();
    showToast('Footnote added');
  }

  function setupFootnoteLinkHandler(link) {
    if (!link) return;
    link.addEventListener('click', function(e) {
      e.preventDefault();
      var refId = link.getAttribute('data-ref-id') || link.getAttribute('href').substring(1);
      var refEl = document.getElementById(refId);
      if (refEl) {
        refEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        refEl.classList.remove('outline-flash');
        void refEl.offsetWidth;
        refEl.classList.add('outline-flash');
        setTimeout(function() { refEl.classList.remove('outline-flash'); }, 1200);
      }
    });
  }

    function _handleFootnoteRefClick(e) {
    var link = e.target.closest ? e.target.closest('.footnote-ref') : null;
    if (!link) return;

    e.preventDefault();
    e.stopPropagation();

    var fnId = link.getAttribute('data-fn-id');
    if (!fnId) return;

    var fnEl = document.getElementById(fnId);
    if (!fnEl) { console.warn('Footnote entry not found:', fnId); return; }

    fnEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    var allHighlights = document.querySelectorAll('.footnote-entry.flash-highlight');
    for (var i = 0; i < allHighlights.length; i++) {
      allHighlights[i].classList.remove('flash-highlight');
    }

    void fnEl.offsetWidth;
    fnEl.classList.add('flash-highlight');
    fnEl.style.cssText += ';background-color: rgba(109,76,255,0.35) !important;transition: background-color 0.3s ease;';

    if (fnEl._flashTimeout) clearTimeout(fnEl._flashTimeout);
    fnEl._flashTimeout = setTimeout(function() {
      fnEl.classList.remove('flash-highlight');
      fnEl.style.backgroundColor = '';
      delete fnEl._flashTimeout;
    }, 1500);
  }

  function bindForwardRefClicks() {
    if (!richEditor) return;
    richEditor.removeEventListener('click', _handleFootnoteRefClick);
    richEditor.addEventListener('click', _handleFootnoteRefClick);
  }

  function restoreFootnotes() {
    var tab = tabsModule.getActive();
    var fnArea = document.getElementById('footnote-area');
    if (!fnArea) return;

    fnArea.innerHTML = '';
    footnoteCounter = 0;

    if (!tab || !tab.metadata || !tab.metadata.footnotes || tab.metadata.footnotes.length === 0) {
      fnArea.style.display = 'none';
      return;
    }

    var footnotes = tab.metadata.footnotes;
    for (var i = 0; i < footnotes.length; i++) {
      var f = footnotes[i];
      var entry = document.createElement('div');
      entry.id = f.fnId;
      entry.className = 'footnote-entry';
      entry.innerHTML = '<a href="#' + f.refId + '" class="footnote-back" data-ref-id="' + f.refId + '">[' + f.number + ']</a> <span class="footnote-text">' + escapeHtml(f.text) + '</span>';
      fnArea.appendChild(entry);
      setupFootnoteLinkHandler(entry.querySelector('.footnote-back'));
      footnoteCounter = Math.max(footnoteCounter, f.number);
    }
    fnArea.style.display = '';

    // Renumber all footnotes sequentially after restore
    renumberFootnotes();
  }

      function renumberFootnotes() {
    if (!richEditor) return;

    var refs = richEditor.querySelectorAll('.footnote-ref');
    if (refs.length === 0) {
      footnoteCounter = 0;
      return;
    }

    var tab = tabsModule.getActive();
    var footnotes = (tab && tab.metadata && tab.metadata.footnotes) || [];
    var fnArea = document.getElementById('footnote-area');

    var entryMap = {};
    if (fnArea) {
      var entries = fnArea.querySelectorAll('.footnote-entry');
      for (var e = 0; e < entries.length; e++) {
        entryMap[entries[e].id] = entries[e];
      }
    }

    var metaMap = {};
    for (var m = 0; m < footnotes.length; m++) {
      metaMap[footnotes[m].fnId] = footnotes[m];
    }

    for (var i = 0; i < refs.length; i++) {
      var newNum = i + 1;
      var newFnId = 'fn_' + newNum;
      var newRefId = 'fn_ref_' + newNum;
      var oldFnId = refs[i].getAttribute('data-fn-id');

      refs[i].href = '#' + newFnId;
      refs[i].id = newRefId;
      refs[i].setAttribute('data-fn-id', newFnId);
      refs[i].innerHTML = '[' + newNum + ']';

      var entry = entryMap[oldFnId];
      if (entry) {
        entry.id = newFnId;
        var backLink = entry.querySelector('.footnote-back');
        if (backLink) {
          var newBackLink = backLink.cloneNode(true);
          newBackLink.href = '#' + newRefId;
          newBackLink.setAttribute('data-ref-id', newRefId);
          newBackLink.innerHTML = '[' + newNum + ']';
          backLink.parentNode.replaceChild(newBackLink, backLink);
          setupFootnoteLinkHandler(newBackLink);
        }
      }

      var metaFn = metaMap[oldFnId];
      if (metaFn) {
        metaFn.refId = newRefId;
        metaFn.fnId = newFnId;
        metaFn.number = newNum;
      }
    }

    footnotes.sort(function(a, b) { return a.number - b.number; });
    if (tab) {
      tab.metadata.footnotes = footnotes;
      tabsModule.setMetadata(tab.metadata);
    }

    // Re-order footnote entries in DOM to match editor order
    if (fnArea) {
      for (var ri = 0; ri < refs.length; ri++) {
        var refFnId = refs[ri].getAttribute('data-fn-id');
        var matchingEntry = fnArea.querySelector('#' + refFnId);
        if (matchingEntry) fnArea.appendChild(matchingEntry);
      }
    }

    footnoteCounter = refs.length;
    bindForwardRefClicks();
    saveCurrentTabContent();
  }

  /* ===== FOOTNOTE CLEANUP ON DELETE ===== */
  var footnoteCleanupObserver = null;

  function setupFootnoteCleanup() {
    if (!richEditor || footnoteCleanupObserver) return;
    footnoteCleanupObserver = new MutationObserver(function(mutations) {
      for (var m = 0; m < mutations.length; m++) {
        var mutation = mutations[m];
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          checkAndRemoveOrphanFootnotes(mutation.removedNodes);
        }
      }
    });
    footnoteCleanupObserver.observe(richEditor, { childList: true, subtree: true });
  }

  function checkAndRemoveOrphanFootnotes(removedNodes) {
    var removedRefs = [];
    for (var i = 0; i < removedNodes.length; i++) {
      var node = removedNodes[i];
      if (node.nodeType === Node.ELEMENT_NODE) {
        var refs = node.querySelectorAll ? node.querySelectorAll('.footnote-ref') : [];
        for (var r = 0; r < refs.length; r++) {
          var fnId = refs[r].getAttribute('data-fn-id');
          if (fnId && removedRefs.indexOf(fnId) === -1) removedRefs.push(fnId);
        }
      }
    }
    if (removedRefs.length > 0) removeFootnotesByIds(removedRefs);
  }

  function removeFootnotesByIds(fnIds) {
    var tab = tabsModule.getActive();
    if (!tab || !tab.metadata || !tab.metadata.footnotes) return;
    tab.metadata.footnotes = tab.metadata.footnotes.filter(function(f) {
      return fnIds.indexOf(f.fnId) === -1;
    });
    restoreFootnotes();
    tabsModule.setMetadata(tab.metadata);
    updateSaveIndicator('saved');
  }
  
  // ===== VERSION HISTORY =====
  var versionHistoryInterval = null;
  var MAX_AUTO_VERSIONS = 8;

  function setupVersionHistory() {
    bindClick('btn-version-history', toggleVersionsPanel);
    bindClick('btn-add-version', addManualSnapshot);
    startVersionSnapshots();
  }

  function toggleVersionsPanel() {
    if (!versionPanel) return;
    var isVisible = versionPanel.style.display !== 'none';
    versionPanel.style.display = isVisible ? 'none' : '';
    var btn = document.getElementById('btn-version-history');
    if (btn) btn.classList.toggle('active', !isVisible);
    if (!isVisible) refreshVersionList();
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

      tab.versions.push({
        hash: hash,
        timestamp: new Date().toISOString(),
        snapshot: content,
        type: 'auto',
        metadata: cloneObject(tab.metadata || {})
      });

      trimAutoVersions(tab);
      tabsModule.persist();
    }, 30000);
  }

  function trimAutoVersions(tab) {
    var autoIndices = [];
    for (var i = 0; i < tab.versions.length; i++) {
      if (tab.versions[i].type === 'auto' || !tab.versions[i].type) {
        autoIndices.push(i);
      }
    }
    while (autoIndices.length > MAX_AUTO_VERSIONS) {
      tab.versions.splice(autoIndices.shift(), 1);
      autoIndices = [];
      for (var j = 0; j < tab.versions.length; j++) {
        if (tab.versions[j].type === 'auto' || !tab.versions[j].type) {
          autoIndices.push(j);
        }
      }
    }
  }

  function addManualSnapshot() {
    var tab = tabsModule.getActive();
    if (!tab || !richEditor) return;
    var content = richEditor.innerHTML;
    tab.versions = tab.versions || [];

    tab.versions.push({
      hash: simpleHash(content),
      timestamp: new Date().toISOString(),
      snapshot: content,
      type: 'manual',
      metadata: cloneObject(tab.metadata || {})
    });
    tabsModule.persist();
    refreshVersionList();
    showToast('Manual snapshot saved');
  }

  function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
    return hash.toString();
  }

  function refreshVersionList() {
    if (!versionList) return;
    var tab = tabsModule.getActive();
    if (!tab || !tab.versions || tab.versions.length === 0) {
      versionList.innerHTML = '<div class="empty-msg">No versions</div>';
      return;
    }
    var versions = tab.versions;
    var html = '';
    for (var i = versions.length - 1; i >= 0; i--) {
      var v = versions[i];
      var date = new Date(v.timestamp).toLocaleString(currentLang === 'el' ? 'el-GR' : 'en-US');
      var isManual = v.type === 'manual';
      var badge = isManual
        ? '<span class="version-badge manual-badge">Manual</span>'
        : '<span class="version-badge auto-badge">Auto</span>';
      var deleteBtn = isManual
        ? '<button class="version-delete" data-index="' + i + '" title="Delete"><i class="fa fa-trash"></i></button>'
        : '';
      html += '<div class="version-item' + (isManual ? ' manual-version' : '') + '" data-index="' + i + '">' +
        '<div class="version-item-row">' +
          '<span class="version-date">' + date + '</span>' +
          badge +
        '</div>' +
        '<div class="version-item-actions">' +
          '<button class="version-restore" data-index="' + i + '">Restore</button>' +
          deleteBtn +
        '</div>' +
      '</div>';
    }
    versionList.innerHTML = html;

    var restoreBtns = versionList.querySelectorAll('.version-restore');
    for (var r = 0; r < restoreBtns.length; r++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var idx = parseInt(btn.getAttribute('data-index'), 10);
          if (isNaN(idx) || !versions[idx]) return;
          if (!confirm('Restore this version? Unsaved changes will be lost.')) return;

          richEditor.innerHTML = versions[idx].snapshot;
          tabsModule.setContent(richEditor.innerHTML);

          if (versions[idx].metadata) {
            tabsModule.setMetadata(cloneObject(versions[idx].metadata));
          }

          restoreFootnotes();
          refreshCommentsList();
          loadMetadataFields();
          updateStats();
          updateSaveIndicator('saved');

          showToast('Version restored');
        });
      })(restoreBtns[r]);
    }

    var deleteBtns = versionList.querySelectorAll('.version-delete');
    for (var d = 0; d < deleteBtns.length; d++) {
      (function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var idx = parseInt(btn.getAttribute('data-index'), 10);
          if (isNaN(idx) || !tab.versions[idx]) return;
          if (!confirm('Delete this manual snapshot?')) return;

          tab.versions.splice(idx, 1);
          tabsModule.persist();
          refreshVersionList();
          showToast('Snapshot deleted');
        });
      })(deleteBtns[d]);
    }
  }

  // ===== ZEN MODE =====
  function setupZenMode() {
    bindClick('btn-zen', toggleZenMode);

    document.addEventListener('click', function(e) {
      var target = e.target.closest ? e.target.closest('#btn-zen') : null;
      if (target) {
        e.stopPropagation();
        e.preventDefault();
        toggleZenMode();
      }
    }, true);

    var zenToggle = document.getElementById('toggle-zen-mode');
    if (zenToggle) {
      zenToggle.addEventListener('change', function() {
        setZenMode(this.checked);
      });
    }
  }

  function toggleZenMode() {
    var isZen = document.body.hasAttribute('data-zen');
    setZenMode(!isZen);
  }

  function setZenMode(enabled) {
    if (enabled) {
      document.body.setAttribute('data-zen', 'true');
      localStorage.setItem('oros_zen_mode', 'true');
    } else {
      document.body.removeAttribute('data-zen');
      localStorage.setItem('oros_zen_mode', 'false');
    }
    var zenToggle = document.getElementById('toggle-zen-mode');
    if (zenToggle) zenToggle.checked = enabled;
    window.dispatchEvent(new CustomEvent('oros-zen-mode-changed', { detail: { enabled: enabled } }));
    showToast(enabled ? 'Zen Mode ON' : 'Zen Mode OFF');
    clampToViewport();
  }

  // ===== GOAL BAR =====
      function setupGoalBar() {
    bindClick('btn-goal', toggleGoalSettings);
    goalTargetInput = document.getElementById('goal-target-input');
    goalUnitSelect = document.getElementById('goal-unit-select');
    goalLockCheckbox = document.getElementById('goal-lock-checkbox');
    goalTimeInput = document.getElementById('goal-time-input');
    goalProgressDisplay = document.getElementById('goal-bar-progress');

    if (goalLockCheckbox) goalLockCheckbox.addEventListener('change', function() {
      var locked = goalLockCheckbox.checked;
      if (goalTargetInput) goalTargetInput.disabled = locked;
      if (goalUnitSelect) goalUnitSelect.disabled = locked;
      if (goalTimeInput) goalTimeInput.disabled = locked;
      saveGoal();
    });

    bindClick('btn-set-goal', saveGoal);
    bindClick('btn-clear-goal', clearGoal);
    bindClick('btn-close-goal', function() {
      if (goalBar) goalBar.style.display = 'none';
      stopGoalTimer();
      var gbtn = document.getElementById('btn-goal');
      if (gbtn) gbtn.classList.remove('active');
    });

    loadGoal();
  }

  function toggleGoalSettings() {
    if (!goalBar) return;
    var isVisible = goalBar.style.display !== 'none';
    goalBar.style.display = isVisible ? 'none' : 'flex';
    var btn = document.getElementById('btn-goal');
    if (btn) btn.classList.toggle('active', !isVisible);
  }
  
    function countWordsFiltered(text) {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(function(w) {
      return /[a-zA-Z0-9\u0370-\u03FF\u1F00-\u1FFF]/.test(w);
    }).length;
  }

  function getCurrentGoalCount() {
    if (!richEditor) return 0;
    var unit = localStorage.getItem('oros_writer_goal_unit') || 'words';
    var text = richEditor.innerText.trim() || '';
    if (unit === 'chars') return text.replace(/\s/g, '').length;
    if (unit === 'paras') return richEditor.querySelectorAll('p').length;
    return countWordsFiltered(text);
  }

  function saveGoal() {
    var target = parseInt(goalTargetInput ? goalTargetInput.value : 0, 10) || 0;
    var unit = goalUnitSelect ? goalUnitSelect.value : 'words';
    var timeMin = parseInt(goalTimeInput ? goalTimeInput.value : 0, 10) || 0;

    localStorage.setItem('oros_writer_goal', target);
    localStorage.setItem('oros_writer_goal_unit', unit);
    localStorage.setItem('oros_writer_goal_time', timeMin);
    if (goalLockCheckbox) localStorage.setItem('oros_writer_goal_lock', goalLockCheckbox.checked ? '1' : '0');

    stopGoalTimer();
    goalNotified = false;

    if (target > 0 && timeMin > 0) {
      startGoalTimer(timeMin);
    }

    updateGoalProgress();
    showToast('Goal saved');
  }

  function startGoalTimer(minutes) {
    stopGoalTimer();
    goalTotalSeconds = minutes * 60;
    goalElapsedSeconds = 0;

    goalInterval = setInterval(function() {
      goalElapsedSeconds++;
      updateGoalProgress();

      if (goalElapsedSeconds >= goalTotalSeconds) {
        var current = getCurrentGoalCount();
        var goal = parseInt(localStorage.getItem('oros_writer_goal'), 10) || 0;
              var unitLabel = unit === 'chars' ? 'characters' : (unit === 'paras' ? 'paragraphs' : 'words');
      if (current < goal) {
        showToast('⏰ Time is up! ' + current + '/' + goal + ' ' + unitLabel);
      } else {
        showToast('🎉 Success! ' + unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1) + ' goal reached');
      }
        stopGoalTimer();
      }
    }, 1000);
  }

  function stopGoalTimer() {
    if (goalInterval) {
      clearInterval(goalInterval);
      goalInterval = null;
    }
  }

    function clearGoal() {
    stopGoalTimer();
    goalNotified = false;
    localStorage.removeItem('oros_writer_goal');
    localStorage.removeItem('oros_writer_goal_time');
    if (goalTargetInput) goalTargetInput.value = '';
    if (goalTimeInput) goalTimeInput.value = '';
    if (goalProgressDisplay) goalProgressDisplay.textContent = '';
    showToast('Goal cleared');
  }

  function updateGoalProgress() {
    var goal = parseInt(localStorage.getItem('oros_writer_goal'), 10) || 0;
    if (goal <= 0) return;

    var unit = localStorage.getItem('oros_writer_goal_unit') || 'words';
    var current = getCurrentGoalCount();
    var pct = Math.min(100, Math.round((current / goal) * 100));

    var progressText = current + '/' + goal + ' ' + unit + ' (' + pct + '%)';

    if (goalInterval && goalTotalSeconds > 0) {
      var timeLeft = goalTotalSeconds - goalElapsedSeconds;
      var mins = Math.floor(timeLeft / 60);
      var secs = timeLeft % 60;
      progressText += ' · ⏱ ' + mins + ':' + secs.toString().padStart(2, '0');
    }

    if (goalProgressDisplay) goalProgressDisplay.textContent = progressText;

    if (current >= goal) {
      if (!goalNotified) {
        var unitLabel = unit === 'chars' ? 'characters' : (unit === 'paras' ? 'paragraphs' : 'words');
        showToast('🎉 Success! ' + unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1) + ' goal reached');
        goalNotified = true;
      }
      if (goalInterval) stopGoalTimer();
    } else {
      goalNotified = false;
    }
  }

  function loadGoal() {
    var saved = localStorage.getItem('oros_writer_goal');
    if (saved && goalTargetInput) goalTargetInput.value = saved;
    var savedUnit = localStorage.getItem('oros_writer_goal_unit');
    if (savedUnit && goalUnitSelect) goalUnitSelect.value = savedUnit;
    var savedTime = localStorage.getItem('oros_writer_goal_time');
    if (savedTime && goalTimeInput) goalTimeInput.value = savedTime;
    if (goalLockCheckbox) {
      goalLockCheckbox.checked = localStorage.getItem('oros_writer_goal_lock') === '1';
      if (goalLockCheckbox.checked) {
        if (goalTargetInput) goalTargetInput.disabled = true;
        if (goalUnitSelect) goalUnitSelect.disabled = true;
        if (goalTimeInput) goalTimeInput.disabled = true;
      }
    }
    updateGoalProgress();
  }

  // ===== EXPORT / IMPORT =====
  function setupExportImport() {
    bindClick('btn-export', function(e) {
      e.stopPropagation();
      var dd = document.getElementById('export-dropdown');
      if (dd) dd.classList.toggle('active');
    });
    bindClick('btn-import', function(e) {
      e.stopPropagation();
      var dd = document.getElementById('import-dropdown');
      if (dd) dd.classList.toggle('active');
    });

    var exportItems = document.querySelectorAll('#export-dropdown button[data-format]');
    for (var i = 0; i < exportItems.length; i++) {
      (function(btn) {
        var fmt = btn.getAttribute('data-format');
        bindClick('btn-export-' + fmt, function() {
          if (fmt === 'txt') exportTxt();
          else if (fmt === 'md') exportMd();
          else if (fmt === 'html') exportHtml();
          else if (fmt === 'pdf') exportPdf();
          else if (fmt === 'docx') exportDocx();
          else if (fmt === 'rtf') exportRtf();
          else if (fmt === 'json') exportJson();
          else if (fmt === 'epub') exportEpub();
          var dd = document.getElementById('export-dropdown');
          if (dd) dd.classList.remove('active');
        });
      })(exportItems[i]);
    }

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
    if (!richEditor) return;
    var blob = new Blob([richEditor.innerText], { type: 'text/plain' });
    downloadBlob(blob, getTabTitle() + '.txt');
  }

  function exportMd() {
    if (!richEditor) return;
    var blob = new Blob([richEditor.innerText], { type: 'text/markdown' });
    downloadBlob(blob, getTabTitle() + '.md');
  }

  function exportHtml() {
    if (!richEditor) return;
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
      zip.file('document.txt', richEditor ? richEditor.innerText : '');
      zip.generateAsync({ type: 'blob' }).then(function(blob) {
        downloadBlob(blob, getTabTitle() + '.docx');
        showToast('DOCX exported');
      }).catch(function(e) { showToast('Export failed: ' + e.message); });
    } catch(e) { showToast('Export failed: ' + e.message); }
  }

  function exportRtf() {
    try {
      var text = richEditor ? richEditor.innerText : '';
      text = text.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');
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

  function exportEpub() {
    showToast('EPUB export coming soon');
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
    var fileInput = document.getElementById('file-input-hidden');
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
      var tag = (style === 'normal') ? 'p' : (style === 'quote') ? 'blockquote' : (style === 'code') ? 'pre' : style;
      execCmd('formatBlock', tag);
    });
    if (richEditor) {
      richEditor.addEventListener('keyup', updateStyleSelector);
      richEditor.addEventListener('click', updateStyleSelector);
    }
  }

  function updateStyleSelector() {
    if (!stylesSelect || !richEditor) return;
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    var node = sel.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    while (node && node !== richEditor && node.nodeType === Node.ELEMENT_NODE) {
      var tag = node.tagName.toLowerCase();
      if (tag === 'p') { stylesSelect.value = 'normal'; return; }
      if (tag === 'blockquote') { stylesSelect.value = 'quote'; return; }
      if (tag === 'pre') { stylesSelect.value = 'code'; return; }
      if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') { stylesSelect.value = tag; return; }
      node = node.parentElement;
    }
  }

  // ===== KEYBOARD SHORTCUTS =====
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); execCmd('undo'); }
        else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); execCmd('redo'); }
        else if (e.key === 'b') { e.preventDefault(); execCmd('bold'); }
        else if (e.key === 'i') { e.preventDefault(); execCmd('italic'); }
        else if (e.key === 'u') { e.preventDefault(); execCmd('underline'); }
        else if (e.key === 's') { e.preventDefault(); e.stopPropagation(); saveCurrentTabContent(); showToast(getTrans('autosave') || 'Saved'); }
        else if (e.key === 'f' && !e.shiftKey) { e.preventDefault(); if (findBar) { findBar.style.display = findBar.style.display === 'none' ? 'flex' : 'none'; if (findBar.style.display !== 'none' && findInput) findInput.focus(); } }
        else if (e.key === 'f' && e.shiftKey) { e.preventDefault(); insertFootnote(); }
        else if (e.key === 'k') { e.preventDefault(); var btn = document.getElementById('btn-link'); if (btn) btn.click(); }
        else if (e.key === ',') { e.preventDefault(); execCmd('subscript'); }
        else if (e.key === '.') { e.preventDefault(); execCmd('superscript'); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          var pb = document.createElement('div');
          pb.className = 'page-break';
          pb.style.pageBreakAfter = 'always';
          pb.innerHTML = '<hr style="border:none;border-top:1px dashed #ccc;margin:1em 0;">';
          richEditor.focus();
          document.execCommand('insertHTML', false, pb.outerHTML + '<p><br></p>');
        }
        else if (e.key === 'o') {
          e.preventDefault();
          var fi = document.getElementById('file-input-hidden');
          if (fi) fi.click();
        }
        else if (e.key === 'c' && e.shiftKey) {
          e.preventDefault();
          if (commentsPanel) {
            if (commentsPanel.style.display === 'none') {
              commentsPanel.style.display = '';
              var cbtn = document.getElementById('btn-comments');
              if (cbtn) cbtn.classList.add('active');
            }
            refreshCommentsList();
            var addArea = document.getElementById('comment-add-area');
            if (addArea) addArea.style.display = '';
            var ci = document.getElementById('comment-input');
            if (ci) ci.focus();
          }
        }
        else if (e.key === 'g') { e.preventDefault(); toggleGoalSettings(); }
        else if (e.key === 'n') {
          e.preventDefault();
          tabsModule.create({ content: '<p><br></p>', metadata: {} });
          setTimeout(function() { if (richEditor) richEditor.focus(); }, 50);
        }
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'F9') {
        e.preventDefault();
        e.stopPropagation();
        toggleZenMode();
      }
    }, true);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (qfmMenu && qfmMenu.style.display !== 'none') { qfmMenu.style.display = 'none'; return; }
        var dialogs = ['link-dialog-overlay', 'table-dialog-overlay', 'image-dialog-overlay',
                       'templates-dialog-overlay', 'special-chars-dialog-overlay',
                       'footnote-dialog-overlay', 'help-dialog-overlay'];
        for (var di = 0; di < dialogs.length; di++) {
          var dlg = document.getElementById(dialogs[di]);
          if (dlg && dlg.style.display !== 'none') { dlg.style.display = 'none'; return; }
        }
        var panels = [
  { id: 'comments-panel', btn: 'btn-comments' },
  { id: 'version-history-panel', btn: 'btn-version-history' },
  { id: 'wordfreq-panel', btn: 'btn-wordfreq' },
  { id: 'metadata-panel', btn: 'btn-metadata' },
  { id: 'outline-panel', btn: 'btn-outline' },
  { id: 'toc-panel', btn: 'btn-toc' },
  { id: 'find-replace-bar', btn: 'btn-find' },
  { id: 'goal-bar', btn: 'btn-goal' }
];
for (var i = 0; i < panels.length; i++) {
  var p = document.getElementById(panels[i].id);
  if (p && p.style.display !== 'none') {
    p.style.display = 'none';
    var pbtn = document.getElementById(panels[i].btn);
    if (pbtn) pbtn.classList.remove('active');
    return;
  }
}
        var exp = document.getElementById('export-dropdown');
        if (exp && exp.classList.contains('active')) { exp.classList.remove('active'); return; }
        var isZen = document.body.hasAttribute('data-zen');
        if (isZen) { document.body.removeAttribute('data-zen'); localStorage.setItem('oros_zen_mode', 'false'); }
      }
    });
  }

  // ===== COMMAND EXECUTION =====
  function execCmd(command, value) {
    if (!richEditor) return;
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
    bindClick('btn-numbers', function() { execCmd('insertOrderedList'); });
    bindClick('btn-bullets', function() { execCmd('insertUnorderedList'); });
    bindClick('btn-indent', function() {
      if (!richEditor) return;
      richEditor.focus();
      var sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      var node = sel.getRangeAt(0).startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      while (node && node !== richEditor) {
        var tag = node.tagName;
        if (/^(P|H1|H2|H3|H4|H5|H6|LI|DIV)$/.test(tag)) {
          var ml = parseInt(node.style.marginLeft || '0', 10);
          node.style.marginLeft = (ml + 40) + 'px';
          break;
        }
        node = node.parentElement;
      }
    });
    bindClick('btn-outdent', function() {
      if (!richEditor) return;
      richEditor.focus();
      var sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      var node = sel.getRangeAt(0).startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      while (node && node !== richEditor) {
        var tag = node.tagName;
        if (/^(P|H1|H2|H3|H4|H5|H6|LI|DIV)$/.test(tag)) {
          var ml = parseInt(node.style.marginLeft || '0', 10);
          node.style.marginLeft = Math.max(0, ml - 40) + 'px';
          break;
        }
        node = node.parentElement;
      }
    });
        bindClick('btn-link', function() {
      var dlg = document.getElementById('link-dialog-overlay');
      if (!dlg) return;
      
      var sel = window.getSelection();
      var selectedText = '';
      if (sel.rangeCount > 0 && richEditor && richEditor.contains(sel.anchorNode)) {
        selectedText = sel.toString().trim();
        savedLinkRange = sel.getRangeAt(0).cloneRange();
      } else {
        savedLinkRange = null;
      }
      
      dlg.style.display = 'flex';
      var urlInput = document.getElementById('link-url-input');
      var textInput = document.getElementById('link-text-input');
      if (urlInput) urlInput.value = '';
      if (textInput) textInput.value = selectedText;
      setTimeout(function() { if (urlInput) urlInput.focus(); }, 50);
    });
    bindClick('btn-image', function() {
      var dlg = document.getElementById('image-dialog-overlay');
      if (dlg) dlg.style.display = 'flex';
    });
    bindClick('btn-code', function() { execCmd('formatBlock', 'pre'); });
    bindClick('btn-quote', function() { execCmd('formatBlock', 'blockquote'); });
    bindClick('btn-clear', function() {
      if (!confirm('Clear all content?')) return;
      if (richEditor) richEditor.innerHTML = '<p><br></p>';
      saveCurrentTabContent();
      updateStats();
    });
    bindClick('btn-clear-formatting', function() { execCmd('removeFormat'); });
    bindClick('btn-undo', function() { execCmd('undo'); });
    bindClick('btn-redo', function() { execCmd('redo'); });
    bindClick('btn-hr', function() {
      if (!richEditor) return;
      richEditor.focus();
      document.execCommand('insertHorizontalRule');
    });
    bindClick('btn-page-break', function() {
      if (!richEditor) return;
      var pb = document.createElement('div');
      pb.className = 'page-break';
      pb.style.pageBreakAfter = 'always';
      pb.innerHTML = '<hr style="border:none;border-top:1px dashed #ccc;margin:1em 0;">';
      richEditor.focus();
      document.execCommand('insertHTML', false, pb.outerHTML + '<p><br></p>');
    });
    bindClick('btn-open', function() {
      var fi = document.getElementById('file-input-hidden');
      if (fi) fi.click();
    });
    bindClick('btn-templates', function() {
      var dlg = document.getElementById('templates-dialog-overlay');
      if (dlg) { dlg.style.display = 'flex'; renderTemplatesGrid(); }
    });
     bindClick('btn-special-chars', function() {
      var dlg = document.getElementById('special-chars-dialog-overlay');
      if (dlg) dlg.style.display = 'flex';
    });
     bindClick('btn-table', function() {
      var dlg = document.getElementById('table-dialog-overlay');
      if (dlg) dlg.style.display = 'flex';
    });
    bindClick('btn-find', function() {
      if (findBar) {
        findBar.style.display = findBar.style.display === 'none' ? 'flex' : 'none';
        if (findBar.style.display !== 'none' && findInput) findInput.focus();
      }
    });
  }

  
    // ===== DIALOG INSERT HANDLERS =====
  function setupDialogInsertHandlers() {
    // --- LINK ---
    bindClick('btn-insert-link', function() {
      var urlInput = document.getElementById('link-url-input');
      var textInput = document.getElementById('link-text-input');
      var url = urlInput ? urlInput.value.trim() : '';
      var text = textInput ? textInput.value.trim() : '';
      if (!url) { showToast('Enter a URL'); return; }
      if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) url = 'https://' + url;

      var dlg = document.getElementById('link-dialog-overlay');
      if (dlg) dlg.style.display = 'none';

      if (richEditor) {
        richEditor.focus();
        var sel = window.getSelection();
        var range;
        if (savedLinkRange) {
          range = savedLinkRange;
          sel.removeAllRanges();
          sel.addRange(range);
        } else if (sel.rangeCount > 0) {
          range = sel.getRangeAt(0);
        } else {
          range = document.createRange();
          range.selectNodeContents(richEditor);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }

        var link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = text || url;

        range.deleteContents();
        range.insertNode(link);

        var newRange = document.createRange();
        newRange.setStartAfter(link);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }

      if (urlInput) urlInput.value = '';
      if (textInput) textInput.value = '';
      savedLinkRange = null;
      saveCurrentTabContent();
      showToast('Link inserted');
    });

    bindClick('btn-cancel-link', function() {
      var dlg = document.getElementById('link-dialog-overlay');
      if (dlg) dlg.style.display = 'none';
    });

    var btnLink = document.getElementById('btn-link');
    if (btnLink) {
      btnLink.addEventListener('mousedown', function() {
        var sel = window.getSelection();
        if (sel.rangeCount > 0 && richEditor && richEditor.contains(sel.anchorNode)) {
          savedLinkRange = sel.getRangeAt(0).cloneRange();
        }
      });
    }

    // --- TABLE ---
    bindClick('btn-create-table', function() {
      var rowsInput = document.getElementById('table-rows-select');
      var colsInput = document.getElementById('table-cols-select');
      var rows = parseInt(rowsInput ? rowsInput.value : '3', 10) || 3;
      var cols = parseInt(colsInput ? colsInput.value : '3', 10) || 3;
      if (rows < 1) rows = 1; if (rows > 20) rows = 20;
      if (cols < 1) cols = 1; if (cols > 10) cols = 10;

      var dlg = document.getElementById('table-dialog-overlay');
      if (dlg) dlg.style.display = 'none';

      if (!richEditor) return;
      richEditor.focus();

      var sel = window.getSelection();
      var range;
      if (sel.rangeCount > 0 && richEditor.contains(sel.anchorNode)) {
        range = sel.getRangeAt(0);
      } else {
        range = document.createRange();
        range.selectNodeContents(richEditor);
        range.collapse(false);
      }

      var tableHtml = '<table class="custom-table"><thead><tr>';
      for (var c = 0; c < cols; c++) {
        tableHtml += '<th>Header ' + (c + 1) + '</th>';
      }
      tableHtml += '</tr></thead><tbody>';
      for (var r = 0; r < rows; r++) {
        tableHtml += '<tr>';
        for (var c2 = 0; c2 < cols; c2++) {
          tableHtml += '<td>&nbsp;</td>';
        }
        tableHtml += '</tr>';
      }
      tableHtml += '</tbody></table><p><br></p>';

      var tempDiv = document.createElement('div');
      tempDiv.innerHTML = tableHtml;
      var table = tempDiv.firstChild;

      range.deleteContents();
      range.insertNode(table);

      var firstCell = table.querySelector('td');
      if (firstCell) {
        var cellRange = document.createRange();
        cellRange.selectNodeContents(firstCell);
        cellRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(cellRange);
      }

      saveCurrentTabContent();
      updateStats();
      showToast('Table inserted');
    });

    // --- IMAGE ---
    var sourceType = document.getElementById('image-source-type');
    var uploadField = document.getElementById('image-upload-field');
    var urlField = document.getElementById('image-url-field');

    if (sourceType) {
      sourceType.addEventListener('change', function() {
        if (this.value === 'upload') {
          if (uploadField) uploadField.style.display = '';
          if (urlField) urlField.style.display = 'none';
        } else {
          if (uploadField) uploadField.style.display = 'none';
          if (urlField) urlField.style.display = '';
        }
      });
    }

    var btnImg = document.getElementById('btn-image');
    if (btnImg) {
      btnImg.addEventListener('mousedown', function() {
        var sel = window.getSelection();
        if (sel.rangeCount > 0 && richEditor && richEditor.contains(sel.anchorNode)) {
          savedImageRange = sel.getRangeAt(0).cloneRange();
        }
      });
    }

    bindClick('btn-image-confirm', function() {
      var srcType = sourceType ? sourceType.value : 'url';
      var urlInput = document.getElementById('image-url-input');
      var fileInput = document.getElementById('image-file-input');
      var captionInput = document.getElementById('image-caption-input');
      var caption = captionInput ? captionInput.value.trim() : '';

      var dlg = document.getElementById('image-dialog-overlay');
      if (dlg) dlg.style.display = 'none';

      function insertImage(src) {
        if (!richEditor) return;
        richEditor.focus();

        var sel = window.getSelection();
        var range;
        if (savedImageRange) {
          range = savedImageRange;
          sel.removeAllRanges();
          sel.addRange(range);
        } else if (sel.rangeCount > 0) {
          range = sel.getRangeAt(0);
        } else {
          range = document.createRange();
          range.selectNodeContents(richEditor);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }

        var img = document.createElement('img');
        img.src = src;
        img.className = 'editor-image';
        if (caption) img.alt = caption;

        range.deleteContents();
        range.insertNode(img);

        if (caption) {
          var captionEl = document.createElement('p');
          captionEl.style.cssText = 'text-align:center;color:var(--text-muted,#888);font-size:0.85em;font-style:italic;';
          captionEl.textContent = caption;
          range.insertNode(captionEl);
        }

        var newRange = document.createRange();
        newRange.setStartAfter(caption ? img.nextSibling : img);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);

        savedImageRange = null;
        saveCurrentTabContent();
        updateStats();
        showToast('Image inserted');
      }

      if (srcType === 'upload' && fileInput && fileInput.files && fileInput.files[0]) {
        var file = fileInput.files[0];
        var reader = new FileReader();
        reader.onload = function(ev) { insertImage(ev.target.result); };
        reader.readAsDataURL(file);
      } else if (srcType === 'url' && urlInput && urlInput.value.trim()) {
        insertImage(urlInput.value.trim());
      } else {
        showToast('Select an image first');
        if (dlg) dlg.style.display = 'flex';
        return;
      }

      if (urlInput) urlInput.value = '';
      if (fileInput) fileInput.value = '';
      if (captionInput) captionInput.value = '';
    });

    // --- SPECIAL CHARACTERS ---
    setupSpecialCharsGrid();

    var btnImage2 = document.getElementById('btn-image');
    if (btnImage2) {
      btnImage2.addEventListener('click', function() {
        if (sourceType) sourceType.value = 'upload';
        if (uploadField) uploadField.style.display = '';
        if (urlField) urlField.style.display = 'none';
      });
    }
  }

  function setupSpecialCharsGrid() {
    var grid = document.getElementById('special-chars-grid');
    var tabsContainer = document.getElementById('special-chars-tabs');
    if (!grid || !tabsContainer) return;

    var currentCategory = 'greek';

    function renderGrid(cat) {
      currentCategory = cat;
      var chars = SPECIAL_CHARS[cat] || [];
      var html = '';
      for (var i = 0; i < chars.length; i++) {
        html += '<div class="sc-char" data-char="' + escapeHtml(chars[i]) + '">' + chars[i] + '</div>';
      }
      grid.innerHTML = html;

      var charEls = grid.querySelectorAll('.sc-char');
      for (var j = 0; j < charEls.length; j++) {
        (function(el) {
          el.addEventListener('click', function() {
            var ch = el.getAttribute('data-char');
            if (!richEditor || !ch) return;
            richEditor.focus();
            document.execCommand('insertText', false, ch);
            updateStats();
          });
        })(charEls[j]);
      }
    }

    var tabs = tabsContainer.querySelectorAll('.sc-tab');
    for (var t = 0; t < tabs.length; t++) {
      (function(tab) {
        tab.addEventListener('click', function() {
          for (var k = 0; k < tabs.length; k++) tabs[k].classList.remove('active');
          tab.classList.add('active');
          renderGrid(tab.getAttribute('data-cat'));
        });
      })(tabs[t]);
    }

    renderGrid('greek');
  }

  // ===== SMART TYPOGRAPHY =====
  var smartTypoPatterns = [
    { re: /\(c\)$/i,    rep: '\u00A9' },
    { re: /\(tm\)$/i,   rep: '\u2122' },
    { re: /\(r\)$/i,    rep: '\u00AE' },
    { re: /\+\/-$/i,    rep: '\u00B1' },
    { re: /->$/,         rep: '\u2192' },
    { re: /<-$/,         rep: '\u2190' },
    { re: /=>$/,         rep: '\u21D2' },
    { re: /1\/2$/,       rep: '\u00BD' },
    { re: /1\/4$/,       rep: '\u00BC' },
    { re: /3\/4$/,       rep: '\u00BE' },
    { re: /\.\.\.$/,     rep: '\u2026' },
    { re: /---$/,        rep: '\u2014' },
    { re: /--$/,         rep: '\u2013' },
    { re: /=\/=$/,       rep: '\u2261' }
  ];

  function applySmartTypography() {
    if (!smartTypographyEnabled) return;
    try {
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      var range = sel.getRangeAt(0);
      var node = range.startContainer;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      var offset = range.startOffset;
      if (offset < 1) return;
      var text = node.textContent;
      var before = text.substring(0, offset);
      var after = text.substring(offset);

      if (before.charAt(offset - 1) === '"') {
        var openQ = (before.substring(0, offset - 1).match(/\u201C/g) || []).length;
        var closeQ = (before.substring(0, offset - 1).match(/\u201D/g) || []).length;
        var rq = openQ > closeQ ? '\u201D' : '\u201C';
        node.textContent = before.substring(0, offset - 1) + rq + after;
        range.setStart(node, offset);
        range.setEnd(node, offset);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }

      if (before.charAt(offset - 1) === "'") {
        var prev = before.charAt(offset - 2);
        var rs = (prev && /\w/.test(prev)) ? '\u2019' : '\u2018';
        node.textContent = before.substring(0, offset - 1) + rs + after;
        range.setStart(node, offset);
        range.setEnd(node, offset);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }

      for (var i = 0; i < smartTypoPatterns.length; i++) {
        var p = smartTypoPatterns[i];
        var m = before.match(p.re);
        if (m) {
          var matchedLen = m[0].length;
          var newBefore = before.substring(0, before.length - matchedLen) + p.rep;
          node.textContent = newBefore + after;
          var newOffset = newBefore.length;
          range.setStart(node, newOffset);
          range.setEnd(node, newOffset);
          sel.removeAllRanges();
          sel.addRange(range);
          return;
        }
      }
    } catch(e) {}
  }

  // ===== AUTO-CORRECT =====
  function applyAutoCorrect() {
    try {
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      var range = sel.getRangeAt(0);
      var node = range.startContainer;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      var offset = range.startOffset;
      if (offset < 3) return;
      var text = node.textContent;
      var lastChar = text.charAt(offset - 1);
      if (lastChar !== ' ' && lastChar !== '\u00A0' && lastChar !== '\t') return;

      var beforeSpace = text.substring(0, offset - 1);
      var match = beforeSpace.match(/(\S+)$/);
      if (!match) return;
      var word = match[1];
      var lower = word.toLowerCase();

      if (autocorrectRules[lower]) {
        var replacement = autocorrectRules[lower];
        var wordStart = offset - 1 - word.length;
        node.textContent = text.substring(0, wordStart) + replacement + text.substring(offset - 1);
        var newOffset = wordStart + replacement.length + 1;
        range.setStart(node, newOffset);
        range.setEnd(node, newOffset);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch(e) {}
  }

  // ===== EDITOR INPUT =====
  function setupEditorInput() {
    if (!richEditor) return;
	
	    richEditor.addEventListener('keydown', function(e) {
      if (!goalLockCheckbox || !goalLockCheckbox.checked) return;
      var goal = parseInt(localStorage.getItem('oros_writer_goal'), 10) || 0;
      if (goal <= 0) return;

      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var navKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Tab', 'Escape'];
      if (navKeys.indexOf(e.key) !== -1) return;

      var current = getCurrentGoalCount();
      if (current >= goal) {
        e.preventDefault();
        showToast('🔒 Goal limit reached. Unlock to continue.');
      }
    });

    richEditor.addEventListener('input', function() {
      playTypewriterSound();
      applyAutoCorrect();
      applySmartTypography();
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

  // ===== PWA INSTALL BUTTON =====
  function setupPWAInstallButton() {
    var btn = document.getElementById('btn-install');
    if (!btn) return;
    btn.disabled = true;

    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      window.deferredPrompt = e;
      btn.disabled = false;
      btn.style.display = '';
    });

    btn.addEventListener('click', function() {
      if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        window.deferredPrompt.userChoice.then(function(choiceResult) {
          if (choiceResult.outcome === 'accepted') {
            showToast('App installed');
          }
          window.deferredPrompt = null;
          btn.disabled = true;
          btn.style.display = 'none';
        }).catch(function() {});
      } else {
        showToast('Install not available in this browser');
      }
    });
  }

  // ===== LINK CLICK HANDLER =====
  function setupLinkClickHandler() {
    if (!richEditor) return;
    richEditor.addEventListener('click', function(e) {
      var link = e.target.closest ? e.target.closest('a') : null;
      if (!link && e.target.tagName === 'A') link = e.target;
      if (link && link.getAttribute('href')) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          window.open(link.href, '_blank');
        }
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
    var isVisible = metadataPanel.style.display !== 'none';
    metadataPanel.style.display = isVisible ? 'none' : '';
    var btn = document.getElementById('btn-metadata');
    if (btn) btn.classList.toggle('active', !isVisible);
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
    if (metadataPanel && metadataPanel.style.display !== 'none') {
      if (metaModified) metaModified.textContent = meta.modified || '-';
    }
  }

  // ===== OUTLINE PANEL =====
  function setupOutlinePanel() {
    bindClick('btn-outline', toggleOutlinePanel);
  }

  function toggleOutlinePanel() {
    if (!outlinePanel) return;
    var isVisible = outlinePanel.style.display !== 'none';
    outlinePanel.style.display = isVisible ? 'none' : '';
    var btn = document.getElementById('btn-outline');
    if (btn) btn.classList.toggle('active', !isVisible);
    if (!isVisible) updateOutline();
  }

  // ===== TABLE OF CONTENTS =====
  function setupTableOfContents() {
    bindClick('btn-toc', toggleTocPanel);

    bindClick('btn-toc-insert', function() {
      if (!richEditor) return;
      var heads = richEditor.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (heads.length === 0) { showToast('No headings found'); return; }

      var html = '<h2>Table of Contents</h2><ul style="list-style:none;padding-left:0;">';
      for (var i = 0; i < heads.length; i++) {
        var tag = heads[i].tagName.toLowerCase();
        var text = heads[i].textContent.trim() || '(empty)';
        var indent = '';
        if (tag === 'h2') indent = 'padding-left:1.5em;';
        else if (tag === 'h3') indent = 'padding-left:3em;';
        else if (tag === 'h4') indent = 'padding-left:4.5em;';
        else if (tag === 'h5') indent = 'padding-left:6em;';
        else if (tag === 'h6') indent = 'padding-left:7.5em;';
        html += '<li style="' + indent + '"><a href="#toc-' + i + '" class="toc-link" style="color:var(--accent-gold-light);text-decoration:none;">' + escapeHtml(text) + '</a></li>';
        heads[i].id = 'toc-' + i;
      }
      html += '</ul><p><br></p>';

      richEditor.focus();
      var sel = window.getSelection();
      var range;
      if (sel.rangeCount > 0 && richEditor.contains(sel.anchorNode)) {
        range = sel.getRangeAt(0);
      } else {
        range = document.createRange();
        range.selectNodeContents(richEditor);
        range.collapse(true);
      }
      range.deleteContents();

      var tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      var fragment = document.createDocumentFragment();
      while (tempDiv.firstChild) fragment.appendChild(tempDiv.firstChild);
      range.insertNode(fragment);

      var newRange = document.createRange();
      newRange.setStartAfter(fragment.lastChild || richEditor.firstChild);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      saveCurrentTabContent();
	  
	  var tocLinks = richEditor.querySelectorAll('.toc-link');
    for (var tl = 0; tl < tocLinks.length; tl++) {
      (function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          var targetId = link.getAttribute('href').substring(1);
          var target = document.getElementById(targetId);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('outline-flash');
            setTimeout(function() { target.classList.remove('outline-flash'); }, 1200);
          }
        });
      })(tocLinks[tl]);
    }
	
      updateStats();
      showToast('Table of Contents inserted');
    });
  }

  function toggleTocPanel() {
    if (!tocPanel) return;
    var isVisible = tocPanel.style.display !== 'none';
    tocPanel.style.display = isVisible ? 'none' : '';
    var btn = document.getElementById('btn-toc');
    if (btn) btn.classList.toggle('active', !isVisible);
    if (!isVisible && tocList && outlineList) tocList.innerHTML = outlineList.innerHTML;
  }

  // ===== LOREM IPSUM =====
  function setupLoremIpsum() {
    bindClick('btn-lorem', insertLorem);
  }

  function insertLorem() {
    var lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
    if (!richEditor) return;
    richEditor.focus();
    document.execCommand('insertText', false, lorem);
    updateStats();
  }

  // ===== QUICK FORMAT MENU (Alt + Right-click) =====
  var qfmEnabled = true;
  var qfmMenu = null;
  var savedRange = null;

  function setupQuickFormatMenu() {
    qfmMenu = document.createElement('div');
    qfmMenu.className = 'quick-format-menu';
    qfmMenu.style.cssText =
      'position:fixed;display:none;z-index:10000;' +
      'background:var(--bg-panel,#1e1e2e);' +
      'border:1px solid var(--border-color,#333);' +
      'border-radius:6px;padding:4px 0;box-shadow:0 4px 16px rgba(0,0,0,0.4);' +
      'font-size:0.85rem;min-width:160px;';
    document.body.appendChild(qfmMenu);

    var items = [
      { label: 'Bold',          icon: 'fa-bold',          cmd: 'bold' },
      { label: 'Italic',        icon: 'fa-italic',        cmd: 'italic' },
      { label: 'Underline',     icon: 'fa-underline',     cmd: 'underline' },
      { label: 'Strikethrough', icon: 'fa-strikethrough', cmd: 'strikethrough' },
      { sep: true },
      { label: 'Subscript',     icon: 'fa-subscript',     cmd: 'subscript' },
      { label: 'Superscript',   icon: 'fa-superscript',   cmd: 'superscript' },
      { sep: true },
      { label: 'Heading 1',     icon: 'fa-header',        cmd: 'h1' },
      { label: 'Heading 2',     icon: 'fa-header',        cmd: 'h2' },
      { label: 'Normal',        icon: 'fa-font',          cmd: 'normal' },
      { sep: true },
      { label: 'Bullet List',   icon: 'fa-list-ul',       cmd: 'insertUnorderedList' },
      { label: 'Numbered List', icon: 'fa-list-ol',       cmd: 'insertOrderedList' },
      { sep: true },
      { label: 'Insert Link',   icon: 'fa-link',          action: 'link' },
      { label: 'Insert Comment',icon: 'fa-comment-o',    action: 'comment' }
    ];

    items.forEach(function(item) {
      if (item.sep) {
        var sep = document.createElement('div');
        sep.style.cssText = 'height:1px;background:var(--border-color,#333);margin:4px 0;';
        qfmMenu.appendChild(sep);
        return;
      }
      var btn = document.createElement('button');
      btn.style.cssText =
        'display:flex;align-items:center;gap:8px;width:100%;' +
        'padding:6px 14px;background:none;border:none;' +
        'color:var(--text-primary,#e0e0e0);cursor:pointer;text-align:left;' +
        'font-size:inherit;font-family:inherit;';
      btn.innerHTML = '<i class="fa ' + item.icon + '" style="width:16px;"></i> ' + item.label;

      btn.addEventListener('mouseenter', function() {
        btn.style.background = 'var(--bg-hover,#2a2a3e)';
      });
      btn.addEventListener('mouseleave', function() {
        btn.style.background = 'none';
      });

      btn.addEventListener('click', function() {
        qfmMenu.style.display = 'none';
        if (!richEditor) return;
        richEditor.focus();
        if (item.cmd) {
          if (item.cmd === 'h1' || item.cmd === 'h2' || item.cmd === 'normal') {
            restoreSelection();
            document.execCommand('formatBlock', false,
              item.cmd === 'normal' ? 'p' : item.cmd.toUpperCase());
          } else {
            restoreSelection();
            document.execCommand(item.cmd, false, null);
          }
        } else if (item.action === 'link') {
          var linkBtn = document.getElementById('btn-link');
          if (linkBtn) linkBtn.click();
        } else if (item.action === 'comment') {
          var cmtBtn = document.getElementById('btn-comments');
          if (cmtBtn) cmtBtn.click();
        }
      });

      qfmMenu.appendChild(btn);
    });

    if (richEditor) {
      richEditor.addEventListener('contextmenu', function(e) {
        if (!qfmEnabled) return;
        if (e.altKey) {
          e.preventDefault();
          saveSelection();

          var x = e.clientX;
          var y = e.clientY;
          qfmMenu.style.left = x + 'px';
          qfmMenu.style.top = y + 'px';
          qfmMenu.style.display = 'block';

          setTimeout(function() {
            var rect = qfmMenu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
              qfmMenu.style.left = (window.innerWidth - rect.width - 8) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
              qfmMenu.style.top = (window.innerHeight - rect.height - 8) + 'px';
            }
          }, 0);
        }
      });
    }

    document.addEventListener('click', function(e) {
      if (qfmMenu && qfmMenu.style.display !== 'none') {
        if (!qfmMenu.contains(e.target)) {
          qfmMenu.style.display = 'none';
        }
      }
    });
  }

  function saveSelection() {
    var sel = window.getSelection();
    if (sel.rangeCount > 0) {
      savedRange = sel.getRangeAt(0);
    }
  }

  function restoreSelection() {
    if (savedRange) {
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
  }

  window.addEventListener('oros-quick-tbar-changed', function() {
    qfmEnabled = localStorage.getItem('oros_quick_tbar_show') !== 'false';
  });

  // ===== HELP BUTTON =====
  document.addEventListener('click', function(e) {
    var target = e.target.closest ? e.target.closest('#btn-help') : null;
    if (target) {
      e.stopPropagation();
      e.preventDefault();
      var dlg = document.getElementById('help-dialog-overlay');
      if (dlg) dlg.style.display = 'flex';
    }
  }, true);

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

    if (localStorage.getItem('oros_zen_mode') === 'true') {
      document.body.setAttribute('data-zen', 'true');
    }
    var zenToggle = document.getElementById('toggle-zen-mode');
    if (zenToggle) zenToggle.checked = localStorage.getItem('oros_zen_mode') === 'true';

    waitForTranslations(function() {
      currentLang = getCurrentLang();
      applyLanguage(currentLang);
      initializeElements();
      loadSettings();
      loadSettingsValues();
      setupSettingToggles();
      loadAutoCorrections();
      loadCustomTemplates();
      loadGoal();

      tabsModule.init('#tab-bar');
      setupStatsToggle();
      setupFindReplace();
      setupWordFrequency();
      setupComments();
      setupFootnotes();
	  setupCommentCleanup();
      setupVersionHistory();
      setupZenMode();
      setupGoalBar();
      setupExportImport();
      setupStyleSelector();
      setupKeyboardShortcuts();
      setupToolbarBindings();
      setupDialogInsertHandlers();
      setupLinkClickHandler();
      setupEditorInput();
      setupWindowResize();
      setupCloseWarning();
      setupPWAInstallButton();
      setupMetadataPanel();
      setupOutlinePanel();
      setupTableOfContents();
      setupLoremIpsum();
      setupQuickFormatMenu();
      applyPageSettings();
      clampToViewport();

      var tab = tabsModule.getActive();
      if (tab && richEditor) {
        richEditor.innerHTML = tab.content || '<p><br></p>';
        restoreFootnotes();
        loadAndRestoreComments();
        updateStats();
      }

      // ===== PANEL & DIALOG CLOSE HANDLERS =====
      bindClick('btn-close-outline', function() {
        if (outlinePanel) outlinePanel.style.display = 'none';
        var obtn = document.getElementById('btn-outline');
        if (obtn) obtn.classList.remove('active');
      });
      bindClick('btn-close-wordfreq', function() {
        if (wordFreqPanel) wordFreqPanel.style.display = 'none';
        var wfbtn = document.getElementById('btn-wordfreq');
        if (wfbtn) wfbtn.classList.remove('active');
      });
      bindClick('btn-close-comments', function() {
        if (commentsPanel) commentsPanel.style.display = 'none';
        var cbtn = document.getElementById('btn-comments');
        if (cbtn) cbtn.classList.remove('active');
      });
      bindClick('btn-close-toc', function() {
        if (tocPanel) tocPanel.style.display = 'none';
        var tbtn = document.getElementById('btn-toc');
        if (tbtn) tbtn.classList.remove('active');
      });
      bindClick('btn-close-version', function() {
        if (versionPanel) versionPanel.style.display = 'none';
        var vbtn = document.getElementById('btn-version-history');
        if (vbtn) vbtn.classList.remove('active');
      });
      bindClick('btn-close-metadata', function() {
        if (metadataPanel) metadataPanel.style.display = 'none';
        var mbtn = document.getElementById('btn-metadata');
        if (mbtn) mbtn.classList.remove('active');
      });
      bindClick('btn-close-goal', function() {
        if (goalBar) goalBar.style.display = 'none';
        var gbtn = document.getElementById('btn-goal');
        if (gbtn) gbtn.classList.remove('active');
      });
      bindClick('btn-close-footnotes', function() { if (footnoteArea) footnoteArea.style.display = 'none'; });

      bindClick('btn-close-templates', function() { var d = document.getElementById('templates-dialog-overlay'); if (d) d.style.display = 'none'; });
      bindClick('btn-cancel-templates', function() { var d = document.getElementById('templates-dialog-overlay'); if (d) d.style.display = 'none'; });
      bindClick('btn-save-as-template', function() {
        var title = getTabTitle() || 'Custom Template';
        var content = richEditor ? richEditor.innerHTML : '<p><br></p>';
        var tpl = { id: 'tpl_' + Date.now(), title: title, desc: 'User template', content: content };
        customTemplates.push(tpl);
        saveCustomTemplates();
        renderTemplatesGrid();
        showToast('Template saved');
      });

      bindClick('btn-import-templates', function() {
        var input = document.getElementById('templates-import-input');
        if (input) input.click();
      });

      bindClick('btn-export-templates', function() {
        if (customTemplates.length === 0) { showToast('No custom templates to export'); return; }
        var blob = new Blob([JSON.stringify(customTemplates, null, 2)], { type: 'application/json' });
        downloadBlob(blob, 'oros-writer-templates.json');
        showToast('Templates exported');
      });

      var tplImportInput = document.getElementById('templates-import-input');
      if (tplImportInput) {
        tplImportInput.addEventListener('change', function(e) {
          var file = e.target.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function(ev) {
            try {
              var imported = JSON.parse(ev.target.result);
              if (Array.isArray(imported)) {
                for (var i = 0; i < imported.length; i++) {
                  if (imported[i].title && imported[i].content) {
                    imported[i].id = 'tpl_' + Date.now() + '_' + i;
                    customTemplates.push(imported[i]);
                  }
                }
                saveCustomTemplates();
                renderTemplatesGrid();
                showToast('Templates imported');
              } else { showToast('Invalid template file'); }
            } catch(err) { showToast('Import failed'); }
          };
          reader.readAsText(file);
          tplImportInput.value = '';
        });
      }

      bindClick('btn-close-special-chars', function() { var d = document.getElementById('special-chars-dialog-overlay'); if (d) d.style.display = 'none'; });
      bindClick('btn-close-special-chars-ok', function() { var d = document.getElementById('special-chars-dialog-overlay'); if (d) d.style.display = 'none'; });

      bindClick('btn-close-help', function() { var d = document.getElementById('help-dialog-overlay'); if (d) d.style.display = 'none'; });
      bindClick('btn-close-help-ok', function() { var d = document.getElementById('help-dialog-overlay'); if (d) d.style.display = 'none'; });
      bindClick('btn-help', function() { var d = document.getElementById('help-dialog-overlay'); if (d) d.style.display = 'flex'; });

      bindClick('btn-close-link-dialog', function() { var d = document.getElementById('link-dialog-overlay'); if (d) d.style.display = 'none'; });

      bindClick('btn-close-table-dialog', function() { var d = document.getElementById('table-dialog-overlay'); if (d) d.style.display = 'none'; });
      bindClick('btn-cancel-table', function() { var d = document.getElementById('table-dialog-overlay'); if (d) d.style.display = 'none'; });

      bindClick('btn-close-image-dialog', function() { var d = document.getElementById('image-dialog-overlay'); if (d) d.style.display = 'none'; });
      bindClick('btn-cancel-image', function() { var d = document.getElementById('image-dialog-overlay'); if (d) d.style.display = 'none'; });

      bindClick('btn-close-footnote-dialog', function() { var d = document.getElementById('footnote-dialog-overlay'); if (d) d.style.display = 'none'; });
      bindClick('btn-cancel-footnote', function() { var d = document.getElementById('footnote-dialog-overlay'); if (d) d.style.display = 'none'; });

      bindClick('btn-set-goal', saveGoal);
      bindClick('btn-clear-goal', function() {
        localStorage.removeItem('oros_writer_goal');
        if (goalTargetInput) goalTargetInput.value = '';
           updateGoalProgress();;
      });

      bindClick('btn-add-autocorrect', addAutocorrectRule);
      bindClick('btn-reset-autocorrect', resetAutocorrectRules);

      bindClick('btn-toc-refresh', function() { if (tocList && outlineList) tocList.innerHTML = outlineList.innerHTML; });

      bindClick('btn-export-database', function() {
        var data = {
          settings: JSON.parse(localStorage.getItem(CONFIG.STORAGE_PREFIX + 'settings') || '{}'),
          tabs: JSON.parse(localStorage.getItem(tabsModule.STORAGE_TABS) || '[]'),
          customTemplates: customTemplates,
          autocorrectRules: autocorrectRules,
          goal: localStorage.getItem('oros_writer_goal'),
          goalUnit: localStorage.getItem('oros_writer_goal_unit')
        };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, 'oros-writer-database.json');
      });

      setTimeout(function() {
        renderAutocorrectRules();
        renderTemplatesGrid();
      }, 200);

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
    richWrapper = document.querySelector('.rich-wrapper');
    tabBar = document.querySelector('#tab-bar');
    saveIndicator = document.getElementById('save-indicator');
    statsOverlay = document.querySelector('.stats-overlay');
    statsDefaultEl = document.querySelector('.stats-default');
    statsGoalEl = document.querySelector('.stats-goal');
    statsDetailed = document.getElementById('stats-detailed');
    goalBar = document.getElementById('goal-bar') || document.querySelector('.goal-bar');
    findBar = document.getElementById('find-replace-bar') || document.querySelector('.find-replace-bar');
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
    closeTab: function(id) { tabsModule.close(id); },
    init: startApp
  };

})();