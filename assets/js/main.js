// ============================================
// orOS — Core Functionality v0.5
// Theme | Language | Zen Mode | Settings
// ============================================

(function() {
  var STORAGE_KEY = {
    THEME: 'oros-theme',
    LANGUAGE: 'oros-language',
    HIDE_STATS: 'oros_hide_stats',
    HIDE_QUICK_TBAR: 'oros_hide_quick_tbar',
    FOCUS_MODE: 'oros_focus_mode',
    READING_PROGRESS: 'oros_reading_progress',
    SMART_TYPOGRAPHY: 'oros_smart_typography',
    HIDE_GOAL_BTN: 'oros_hide_goal_btn',
    HIDE_OUTLINE_BTN: 'oros_hide_outline_btn',
    HIDE_METADATA_BTN: 'oros_hide_metadata_btn',
    HIDE_FIND_BTN: 'oros_hide_find_btn',
    HIDE_WORDFREQ_BTN: 'oros_hide_wordfreq_btn',
    HIDE_SAVE_INDICATOR: 'oros_hide_save_indicator'
  };

  var scriptEl = document.querySelector('script[src$="main.js"]');
  var baseUrl = scriptEl ? scriptEl.src.replace(/main\.js$/, '') : 'assets/js/';

  var translations = {};
  window.OROS_TRANSLATIONS = translations;

  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
  });

  async function loadTranslations() {
    try {
      var resp = await fetch(baseUrl + 'translations.json');
      translations = await resp.json();
      window.OROS_TRANSLATIONS = translations;
    } catch(e) {
      console.warn('Could not load translations:', e);
      translations = { en: {}, el: {}, es: {}, it: {}, fr: {}, de: {} };
      window.OROS_TRANSLATIONS = translations;
    }
  }

  document.addEventListener('DOMContentLoaded', async function() {
    await loadTranslations();
    initLanguage();
    initBackToTop();
    initZenMode();
    initSettings();
    applyTranslationsOnInit();
    updateFooterCredits();
    initThemeButtonOnly();
  });

  function getLang() {
    return localStorage.getItem(STORAGE_KEY.LANGUAGE) || 'en';
  }

  function getTrans(key) {
    var lang = getLang();
    var t = (translations[lang] || translations.en) || {};
    return t[key] || key;
  }

  function initThemeButtonOnly() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('oros-theme') || 'light';
    btn.innerHTML = currentTheme === 'dark' ? '\uD83C\uDF19' : '\u2600\uFE0F';
    btn.onclick = function() {
      var current = document.documentElement.getAttribute('data-theme') || localStorage.getItem('oros-theme') || 'light';
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('oros-theme', next);
      btn.innerHTML = next === 'dark' ? '\uD83C\uDF19' : '\u2600\uFE0F';
      var t = (translations[getLang()] || translations.en) || {};
      btn.title = next === 'dark' ? (t.theme_dark || 'Dark') : (t.theme_light || 'Light');
      btn.setAttribute('aria-label', next === 'dark' ? (t.theme_dark || 'Dark') : (t.theme_light || 'Light'));
    };
  }

  function initLanguage() {
    var savedLang = localStorage.getItem(STORAGE_KEY.LANGUAGE);
    var currentLang;
    if (savedLang && ['el', 'en', 'es', 'it', 'fr', 'de'].indexOf(savedLang) !== -1) {
      currentLang = savedLang;
    } else {
      var bl = navigator.language.split('-')[0].toLowerCase();
      currentLang = ['el', 'en', 'es', 'it', 'fr', 'de'].indexOf(bl) !== -1 ? bl : 'en';
    }
    applyLanguage(currentLang);
    renderLangSelector(currentLang);
  }

  function applyLanguage(lang) {
    var trans = translations[lang] || translations.en;
    translatePage(trans, lang);
    localStorage.setItem(STORAGE_KEY.LANGUAGE, lang);
    updateFooterCredits();
    updateSettingsModalLanguage(lang);
    initThemeButtonOnly();
    window.dispatchEvent(new CustomEvent('oros-language-changed', { detail: { lang: lang } }));
  }

  function translatePage(trans, lang) {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (trans[key]) el.textContent = trans[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (trans[key]) { el.placeholder = trans[key]; el.setAttribute('data-placeholder', trans[key]); }
    });
    document.querySelectorAll('[data-i18n-tooltip]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-tooltip');
      if (trans[key]) el.title = trans[key];
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-aria');
      if (trans[key]) el.setAttribute('aria-label', trans[key]);
    });
  }

  function applyTranslationsOnInit() {
    var lang = getLang();
    var trans = translations[lang] || translations.en;
    translatePage(trans, lang);
  }

  function renderLangSelector(currentLang) {
    var select = document.getElementById('language-select');
    if (!select) return;
    select.innerHTML = '';
    var opts = [
      {value:'en',label:'EN'},{value:'el',label:'EL'},
      {value:'es',label:'ES'},{value:'it',label:'IT'},
      {value:'fr',label:'FR'},{value:'de',label:'DE'}
    ];
    opts.forEach(function(opt) {
      var o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === currentLang) o.selected = true;
      select.appendChild(o);
    });
    select.onchange = function(e) { applyLanguage(e.target.value); };
  }

  function updateFooterCredits() {
    var trans = translations[getLang()] || translations.en;
    var creditEl = document.querySelector('.footer-credits');
    if (!creditEl) return;
    var linkText = trans.footer_credits_link || 'Christos Koulaxizis';
    var suffix = trans.footer_credits_suffix || '. Built with \u2665 for artists.';
    creditEl.innerHTML = '\u00A9 2026 <a href="https://koulaxizis.gr" target="_blank" rel="noopener" class="footer-link">' + linkText + '</a>' + suffix;
  }

  function initBackToTop() {
    var btn = document.getElementById('back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', function() {
      btn.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });
    btn.onclick = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };
  }

  var zenActive = false;

  function initZenMode() {
    var btn = document.getElementById('btn-zen');
    if (!btn) return;
    zenActive = localStorage.getItem('oros-zen') === 'true';
    if (zenActive) document.documentElement.setAttribute('data-zen', 'true');
    btn.onclick = toggleZenMode;
    document.addEventListener('keydown', function(e) {
      if (e.key === 'F9' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        toggleZenMode();
      }
      if (e.key === 'Escape' && zenActive) {
        toggleZenMode();
      }
    });
  }

  function toggleZenMode() {
    zenActive = !zenActive;
    if (zenActive) {
      document.documentElement.setAttribute('data-zen', 'true');
      localStorage.setItem('oros-zen', 'true');
      showZenToast();
    } else {
      document.documentElement.removeAttribute('data-zen');
      localStorage.removeItem('oros-zen');
      removeZenToast();
    }
  }

  window.toggleZenMode = toggleZenMode;

  function showZenToast() {
    removeZenToast();
    var msg = getLang() === 'el'
      ? '\uD83E\uDDD8 Zen Mode \u2014 \u03A0\u03AC\u03C4\u03B1 ESC \u03AE F9 \u03B3\u03B9\u03B1 \u03AD\u03BE\u03BF\u03B4\u03BF'
      : '\uD83E\uDDD8 Zen Mode \u2014 Press ESC or F9 to exit';
    var toast = document.createElement('div');
    toast.className = 'zentool-toast visible';
    toast.id = 'zen-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() {
      var t = document.getElementById('zen-toast');
      if (t) t.classList.remove('visible');
    }, 3500);
  }

  function removeZenToast() {
    var t = document.getElementById('zen-toast');
    if (t) t.remove();
  }

  function initSettings() {
    var btn = document.getElementById('btn-settings');
    if (!btn) return;
    btn.onclick = openSettingsModal;
  }

  function openSettingsModal() {
    var existing = document.querySelector('.settings-modal');
    if (existing) existing.remove();

    var lang = getLang();
    var isEditor = !!document.getElementById('rich-editor');

    var globalShortcuts, editorShortcuts;

    if (lang === 'el') {
      globalShortcuts = [['Zen Mode','F9'],['\u0388\u03BE\u03BF\u03B4\u03BF\u03C2 Zen','ESC']];
      editorShortcuts = [['\u0391\u03C0\u03BF\u03B8\u03AE\u03BA\u03B5\u03C5\u03C3\u03B7','Ctrl+S'],['\u0388\u03BD\u03C4\u03BF\u03BD\u03B1','Ctrl+B'],['\u03A0\u03BB\u03AC\u03B3\u03B9\u03B1','Ctrl+I'],['\u03A5\u03C0\u03BF\u03B3\u03C1\u03AC\u03BC\u03BC\u03B9\u03C3\u03B7','Ctrl+U'],['\u0391\u03BD\u03B1\u03AF\u03C1\u03B5\u03C3\u03B7','Ctrl+Z'],['\u0395\u03C0\u03B1\u03BD\u03B1\u03C6\u03BF\u03C1\u03AC','Ctrl+Y'],['\u0395\u03CD\u03C1\u03B5\u03C3\u03B7','Ctrl+F'],['\u039C\u03BF\u03C1\u03C6\u03BF\u03C0\u03BF\u03AF\u03B7\u03C3\u03B7','Alt + \u0394\u03B5\u03BE\u03AF click']];
    } else if (lang === 'es') {
      globalShortcuts = [['Modo Zen','F9'],['Salir Zen','ESC']];
      editorShortcuts = [['Guardar','Ctrl+S'],['Negrita','Ctrl+B'],['Cursiva','Ctrl+I'],['Subrayado','Ctrl+U'],['Deshacer','Ctrl+Z'],['Rehacer','Ctrl+Y'],['Buscar','Ctrl+F'],['Formato','Alt + Click derecho']];
    } else if (lang === 'it') {
      globalShortcuts = [['Modalit\u00E0 Zen','F9'],['Esci Zen','ESC']];
      editorShortcuts = [['Salva','Ctrl+S'],['Grassetto','Ctrl+B'],['Corsivo','Ctrl+I'],['Sottolinea','Ctrl+U'],['Annulla','Ctrl+Z'],['Ripeti','Ctrl+Y'],['Trova','Ctrl+F'],['Formattazione','Alt + Click destro']];
    } else if (lang === 'fr') {
      globalShortcuts = [['Mode Zen','F9'],['Quitter Zen','ESC']];
      editorShortcuts = [['Enregistrer','Ctrl+S'],['Gras','Ctrl+B'],['Italique','Ctrl+I'],['Souligner','Ctrl+U'],['Annuler','Ctrl+Z'],['R\u00E9tablir','Ctrl+Y'],['Rechercher','Ctrl+F'],['Format','Alt + Clic droit']];
    } else if (lang === 'de') {
      globalShortcuts = [['Zen-Modus','F9'],['Zen beenden','ESC']];
      editorShortcuts = [['Speichern','Strg+S'],['Fett','Strg+B'],['Kursiv','Strg+I'],['Unterstreichen','Strg+U'],['R\u00FCckg\u00E4ngig','Strg+Z'],['Wiederholen','Strg+Y'],['Suchen','Strg+F'],['Format','Alt + Rechtsklick']];
    } else {
      globalShortcuts = [['Zen Mode','F9'],['Exit Zen','ESC']];
      editorShortcuts = [['Save','Ctrl+S'],['Bold','Ctrl+B'],['Italic','Ctrl+I'],['Underline','Ctrl+U'],['Undo','Ctrl+Z'],['Redo','Ctrl+Y'],['Find','Ctrl+F'],['Format','Alt + Right-click']];
    }

    var colActionLabel = lang === 'el' ? '\u0395\u03BD\u03AD\u03C1\u03B3\u03B5\u03B9\u03B1' : lang === 'es' ? 'Acci\u00F3n' : lang === 'it' ? 'Azione' : lang === 'fr' ? 'Action' : lang === 'de' ? 'Aktion' : 'Action';
    var colKey = lang === 'el' ? '\u03A3\u03C5\u03BD\u03C4\u03CC\u03BC\u03B5\u03C5\u03C3\u03B7' : lang === 'es' ? 'Atajo' : lang === 'it' ? 'Scorciatoia' : lang === 'fr' ? 'Raccourci' : lang === 'de' ? 'Tastenk\u00FCrzel' : 'Shortcut';

    var globalShortcutsHtml = '';
    globalShortcuts.forEach(function(pair) {
      globalShortcutsHtml += '<tr><td>' + pair[0] + '</td><td><kbd>' + pair[1] + '</kbd></td></tr>';
    });

    var editorShortcutsHtml = '';
    editorShortcuts.forEach(function(pair) {
      editorShortcutsHtml += '<tr><td>' + pair[0] + '</td><td><kbd>' + pair[1] + '</kbd></td></tr>';
    });

    var zenActive = localStorage.getItem('oros-zen') === 'true';
    var navHtml = '<button class="tab-btn active" data-tab="global">' + getTrans('tab_global') + '</button>';
    if (isEditor) {
      navHtml += '<button class="tab-btn" data-tab="writer">' + getTrans('tab_writer') + '</button>';
    }

    var globalHtml = '' +
      '<div class="toggles-container">' +
        '<div class="toggle-row">' +
          '<span class="toggle-label">' + getTrans('toggle_zen') + '</span>' +
          '<label class="switch"><input type="checkbox" id="toggle-zen"' + (zenActive ? ' checked' : '') + '><span class="slider"></span></label>' +
        '</div>' +
      '</div>' +
      '<div class="settings-divider"></div>' +
      '<table class="shortcut-table">' +
        '<thead><tr><th>' + colActionLabel + '</th><th>' + colKey + '</th></tr></thead>' +
        '<tbody>' + globalShortcutsHtml + '</tbody>' +
      '</table>' +
      '<div class="install-section">' +
        '<button class="btn-install" id="btn-install-pwa">\u2B07 ' + getTrans('install_app') + '</button>' +
      '</div>' +
      '<div class="beta-section">' +
        '<div class="beta-header">' + getTrans('beta_title') + '</div>' +
        '<p class="beta-warning">' + getTrans('beta_warning') + '</p>' +
        '<div class="beta-links">' +
          '<a href="https://github.com/koulaxizis/oros-beta" target="_blank" rel="noopener" class="beta-btn">' + getTrans('beta_repo_link') + '</a>' +
          '<a href="https://koulaxizis.github.io/oros-beta/" target="_blank" rel="noopener" class="beta-btn">' + getTrans('beta_live_link') + '</a>' +
        '</div>' +
      '</div>';

    var panelsHtml = '<div class="tab-panel" id="panel-global">' + globalHtml + '</div>';

    if (isEditor) {
      var hideQuickTbar = localStorage.getItem(STORAGE_KEY.HIDE_QUICK_TBAR) === 'true';
      var hideStats = localStorage.getItem(STORAGE_KEY.HIDE_STATS) === 'true';
      var focusModeOn = localStorage.getItem(STORAGE_KEY.FOCUS_MODE) !== 'false';
      var readingProgressOn = localStorage.getItem(STORAGE_KEY.READING_PROGRESS) !== 'false';
      var smartTypographyOn = localStorage.getItem(STORAGE_KEY.SMART_TYPOGRAPHY) !== 'false';
      var hideGoalBtn = localStorage.getItem(STORAGE_KEY.HIDE_GOAL_BTN) === 'true';
      var hideOutlineBtn = localStorage.getItem(STORAGE_KEY.HIDE_OUTLINE_BTN) === 'true';
      var hideMetadataBtn = localStorage.getItem(STORAGE_KEY.HIDE_METADATA_BTN) === 'true';
      var hideFindBtn = localStorage.getItem(STORAGE_KEY.HIDE_FIND_BTN) === 'true';
      var hideWordFreqBtn = localStorage.getItem(STORAGE_KEY.HIDE_WORDFREQ_BTN) === 'true';
	        var hideSaveIndicator = localStorage.getItem(STORAGE_KEY.HIDE_SAVE_INDICATOR) === 'true';

      var infoNote = getTrans('shortcuts_info_note');

      panelsHtml +=
        '<div class="tab-panel" id="panel-writer" style="display:none;">' +
          '<div class="toggles-container">' +
            '<div class="toggle-row">' +
              '<span class="toggle-label">' + getTrans('toggle_quick_toolbar') + '</span>' +
              '<label class="switch"><input type="checkbox" id="toggle-quick-toolbar"' + (hideQuickTbar ? '' : ' checked') + '><span class="slider"></span></label>' +
            '</div>' +
            '<div class="toggle-row">' +
              '<span class="toggle-label">' + getTrans('toggle_stats') + '</span>' +
              '<label class="switch"><input type="checkbox" id="toggle-stats-overlay"' + (hideStats ? '' : ' checked') + '><span class="slider"></span></label>' +
            '</div>' +
            '<div class="toggle-row">' +
              '<span class="toggle-label">' + getTrans('toggle_focus_mode') + '</span>' +
              '<label class="switch"><input type="checkbox" id="toggle-focus-mode"' + (focusModeOn ? ' checked' : '') + '><span class="slider"></span></label>' +
            '</div>' +
            '<div class="toggle-row">' +
              '<span class="toggle-label">' + getTrans('toggle_reading_progress') + '</span>' +
              '<label class="switch"><input type="checkbox" id="toggle-reading-progress"' + (readingProgressOn ? ' checked' : '') + '><span class="slider"></span></label>' +
            '</div>' +
            '<div class="toggle-row">' +
              '<span class="toggle-label">' + getTrans('toggle_smart_typography') + '</span>' +
              '<label class="switch"><input type="checkbox" id="toggle-smart-typography"' + (smartTypographyOn ? ' checked' : '') + '><span class="slider"></span></label>' +
            '</div>' +
            '<div class="settings-subdivider"></div>' +
            '<div class="toggle-row">' +
              '<span class="toggle-label">' + getTrans('toggle_hide_goal_btn') + '</span>' +
              '<label class="switch"><input type="checkbox" id="toggle-hide-goal"' + (hideGoalBtn ? ' checked' : '') + '><span class="slider"></span></label>' +
            '</div>' +
            '<div class="toggle-row">' +
              '<span class="toggle-label">' + getTrans('toggle_hide_outline_btn') + '</span>' +
              '<label class="switch"><input type="checkbox" id="toggle-hide-outline"' + (hideOutlineBtn ? ' checked' : '') + '><span class="slider"></span></label>' +
            '</div>' +
            '<div class="toggle-row">' +
              '<span class="toggle-label">' + getTrans('toggle_hide_metadata_btn') + '</span>' +
              '<label class="switch"><input type="checkbox" id="toggle-hide-metadata"' + (hideMetadataBtn ? ' checked' : '') + '><span class="slider"></span></label>' +
            '</div>' +
            '<div class="toggle-row">' +
              '<span class="toggle-label">' + getTrans('toggle_hide_find_btn') + '</span>' +
              '<label class="switch"><input type="checkbox" id="toggle-hide-find"' + (hideFindBtn ? ' checked' : '') + '><span class="slider"></span></label>' +
            '</div>' +
            '<div class="toggle-row">' +
              '<span class="toggle-label">' + getTrans('toggle_hide_wordfreq_btn') + '</span>' +
              '<label class="switch"><input type="checkbox" id="toggle-hide-wordfreq"' + (hideWordFreqBtn ? ' checked' : '') + '><span class="slider"></span></label>' +
            '</div>' +
            '<div class="toggle-row">' +
              '<span class="toggle-label">' + getTrans('toggle_hide_save_indicator') + '</span>' +
              '<label class="switch"><input type="checkbox" id="toggle-hide-save-indicator"' + (hideSaveIndicator ? ' checked' : '') + '><span class="slider"></span></label>' +
            '</div>' +
          '</div>' +
          '<div class="settings-divider"></div>' +
          '<table class="shortcut-table">' +
            '<thead><tr><th>' + colActionLabel + '</th><th>' + colKey + '</th></tr></thead>' +
            '<tbody>' + editorShortcutsHtml + '</tbody>' +
          '</table>' +
          '<p class="settings-note">' + infoNote + '</p>' +
        '</div>';
    }

    var modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.innerHTML =
      '<div class="settings-modal-overlay"></div>' +
      '<div class="settings-modal-content">' +
        '<div class="settings-header">' +
          '<h2>' + getTrans('settings') + '</h2>' +
          '<button class="settings-close" id="settings-close">\u00D7</button>' +
        '</div>' +
        '<div class="settings-nav">' + navHtml + '</div>' +
        '<div class="settings-body">' + panelsHtml + '</div>' +
      '</div>';

    document.body.appendChild(modal);
    requestAnimationFrame(function() { modal.classList.add('visible'); });

    var closeBtn = modal.querySelector('#settings-close');
    var overlay = modal.querySelector('.settings-modal-overlay');

    function closeModal() {
      modal.classList.remove('visible');
      setTimeout(function() { modal.remove(); }, 300);
    }
    closeBtn.onclick = closeModal;
    overlay.onclick = closeModal;

    var tabBtns = modal.querySelectorAll('.tab-btn');
    tabBtns.forEach(function(btn) {
      btn.onclick = function() {
        tabBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var tab = btn.getAttribute('data-tab');
        modal.querySelectorAll('.tab-panel').forEach(function(panel) {
          panel.style.display = panel.id === 'panel-' + tab ? 'block' : 'none';
        });
      };
    });

    // --- Global: Zen toggle ---
    var zenToggle = modal.querySelector('#toggle-zen');
    if (zenToggle) {
      zenToggle.onchange = function() {
        if (zenToggle.checked) {
          if (!localStorage.getItem('oros-zen')) toggleZenMode();
        } else {
          if (localStorage.getItem('oros-zen')) toggleZenMode();
        }
      };
    }

    // --- Editor toggles ---
    if (isEditor) {
      var qtToggle = modal.querySelector('#toggle-quick-toolbar');
      if (qtToggle) {
        qtToggle.onchange = function() {
          var hidden = !qtToggle.checked;
          localStorage.setItem(STORAGE_KEY.HIDE_QUICK_TBAR, hidden ? 'true' : 'false');
          window.dispatchEvent(new CustomEvent('oros-hide-quick-tbar-changed', { detail: { hidden: hidden } }));
        };
      }

      var statsToggle = modal.querySelector('#toggle-stats-overlay');
      if (statsToggle) {
        statsToggle.onchange = function() {
          var hidden = !statsToggle.checked;
          localStorage.setItem(STORAGE_KEY.HIDE_STATS, hidden ? 'true' : 'false');
          var so = document.getElementById('stats-overlay');
          if (so) so.style.display = hidden ? 'none' : '';
        };
      }

      var fmToggle = modal.querySelector('#toggle-focus-mode');
      if (fmToggle) {
        fmToggle.onchange = function() {
          var enabled = fmToggle.checked;
          localStorage.setItem(STORAGE_KEY.FOCUS_MODE, enabled ? 'true' : 'false');
          window.dispatchEvent(new CustomEvent('oros-focus-mode-changed', { detail: { enabled: enabled } }));
        };
      }

      var rpToggle = modal.querySelector('#toggle-reading-progress');
      if (rpToggle) {
        rpToggle.onchange = function() {
          var enabled = rpToggle.checked;
          localStorage.setItem(STORAGE_KEY.READING_PROGRESS, enabled ? 'true' : 'false');
          window.dispatchEvent(new CustomEvent('oros-reading-progress-changed', { detail: { enabled: enabled } }));
        };
      }

      var stToggle = modal.querySelector('#toggle-smart-typography');
      if (stToggle) {
        stToggle.onchange = function() {
          var enabled = stToggle.checked;
          localStorage.setItem(STORAGE_KEY.SMART_TYPOGRAPHY, enabled ? 'true' : 'false');
          window.dispatchEvent(new CustomEvent('oros-smart-typography-changed', { detail: { enabled: enabled } }));
        };
      }

      var hgToggle = modal.querySelector('#toggle-hide-goal');
      if (hgToggle) {
        hgToggle.onchange = function() {
          var hidden = hgToggle.checked;
          localStorage.setItem(STORAGE_KEY.HIDE_GOAL_BTN, hidden ? 'true' : 'false');
          window.dispatchEvent(new CustomEvent('oros-hide-goal-btn-changed', { detail: { hidden: hidden } }));
        };
      }

      var hoToggle = modal.querySelector('#toggle-hide-outline');
      if (hoToggle) {
        hoToggle.onchange = function() {
          var hidden = hoToggle.checked;
          localStorage.setItem(STORAGE_KEY.HIDE_OUTLINE_BTN, hidden ? 'true' : 'false');
          window.dispatchEvent(new CustomEvent('oros-hide-outline-btn-changed', { detail: { hidden: hidden } }));
        };
      }

      var hmToggle = modal.querySelector('#toggle-hide-metadata');
      if (hmToggle) {
        hmToggle.onchange = function() {
          var hidden = hmToggle.checked;
          localStorage.setItem(STORAGE_KEY.HIDE_METADATA_BTN, hidden ? 'true' : 'false');
          window.dispatchEvent(new CustomEvent('oros-hide-metadata-btn-changed', { detail: { hidden: hidden } }));
        };
      }

      var hfToggle = modal.querySelector('#toggle-hide-find');
      if (hfToggle) {
        hfToggle.onchange = function() {
          var hidden = hfToggle.checked;
          localStorage.setItem(STORAGE_KEY.HIDE_FIND_BTN, hidden ? 'true' : 'false');
          window.dispatchEvent(new CustomEvent('oros-hide-find-btn-changed', { detail: { hidden: hidden } }));
        };
      }

      var hwToggle = modal.querySelector('#toggle-hide-wordfreq');
      if (hwToggle) {
        hwToggle.onchange = function() {
          var hidden = hwToggle.checked;
          localStorage.setItem(STORAGE_KEY.HIDE_WORDFREQ_BTN, hidden ? 'true' : 'false');
          window.dispatchEvent(new CustomEvent('oros-hide-wordfreq-btn-changed', { detail: { hidden: hidden } }));
        };
      }

      var hsToggle = modal.querySelector('#toggle-hide-save-indicator');
      if (hsToggle) {
        hsToggle.onchange = function() {
          var hidden = hsToggle.checked;
          localStorage.setItem(STORAGE_KEY.HIDE_SAVE_INDICATOR, hidden ? 'true' : 'false');
          window.dispatchEvent(new CustomEvent('oros-hide-save-indicator-changed', { detail: { hidden: hidden } }));
        };
      }
    }

    // --- Install PWA ---
    var installBtn = modal.querySelector('#btn-install-pwa');
    if (installBtn) {
      installBtn.onclick = function() {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(function(choice) {
            if (choice.outcome === 'accepted') {
              installBtn.textContent = '\u2713 ' + getTrans('install_installed');
              installBtn.disabled = true;
            }
            deferredPrompt = null;
          });
        } else {
          installBtn.textContent = getTrans('install_not_supported');
          installBtn.disabled = true;
        }
      };
    }
  }

  function updateSettingsModalLanguage(lang) {
    var modal = document.querySelector('.settings-modal');
    if (!modal) return;
    var trans = translations[lang] || translations.en;
    modal.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (trans[key]) el.textContent = trans[key];
    });
  }

  // Expose globally
  window.getTrans = getTrans;
  window.getLang = getLang;
  window.applyLanguage = applyLanguage;
  window.openSettingsModal = openSettingsModal;

})();