// ============================================
// orOS Main Scripts — Global Components
// Theme toggle, Language selector, Settings, PWA Install
// ============================================

(function() {
  'use strict';

  // ========== THEME TOGGLE (FIXED ICON SWITCHING) ==========
  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      var current = document.documentElement.getAttribute('data-theme') || localStorage.getItem('oros-theme') || 'dark';
      var newTheme = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('oros-theme', newTheme);

      var icon = themeToggle.querySelector('i');
      if (icon) {
        icon.className = newTheme === 'light' ? 'fa fa-moon-o' : 'fa fa-sun-o';
      }
    });
  }

  // ========== LANGUAGE SELECTOR ==========
  var langSelect = document.getElementById('language-select');
  var storedLang = localStorage.getItem('oros-language') || 'el';
  
  if (langSelect) {
    ['el', 'en', 'es', 'it', 'fr', 'de'].forEach(function(code) {
      var opt = document.createElement('option');
      opt.value = code;
      opt.textContent = code.toUpperCase();
      if (code === storedLang) opt.selected = true;
      langSelect.appendChild(opt);
    });

    langSelect.addEventListener('change', function() {
      var lang = this.value;
      localStorage.setItem('oros-language', lang);
      
      document.dispatchEvent(new CustomEvent('oros-language-changed', { detail: { lang: lang } }));
      
      translatePage();
    });
  }

  function translatePage() {
    var lang = localStorage.getItem('oros-language') || 'el';
    var translations = window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[lang];
    
    if (!translations) return;

    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (translations[key]) el.textContent = translations[key];
    });

    document.querySelectorAll('[data-i18n-tooltip]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-tooltip');
      if (translations[key]) el.title = translations[key];
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-aria');
      if (translations[key]) el.setAttribute('aria-label', translations[key]);
    });
  }

  // Load translations
  fetch('assets/js/translations.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      window.OROS_TRANSLATIONS = data;
      translatePage();
    })
    .catch(function(e) { console.error('Failed to load translations:', e); });

  // ========== ZEN MODE ==========
  var zenBtn = document.getElementById('btn-zen');
  if (zenBtn) {
    zenBtn.addEventListener('click', function() {
      var body = document.body;
      var isZen = body.hasAttribute('data-zen');
      
      if (isZen) {
        body.removeAttribute('data-zen');
      } else {
        body.setAttribute('data-zen', 'true');
      }

      localStorage.setItem('oros-zen-mode', isZen ? 'false' : 'true');
      
      document.dispatchEvent(new CustomEvent('oros-zen-mode-changed', {
        detail: { enabled: !isZen }
      }));
    });
  }

  // Keyboard shortcut for Zen Mode
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F9') {
      e.preventDefault();
      if (zenBtn) zenBtn.click();
    }
  });

  // ========== SETTINGS MODAL ==========
  var settingsBtn = document.getElementById('btn-settings');
  var settingsModal = document.querySelector('.settings-modal');
  
  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', function() {
      settingsModal.classList.add('visible');
    });

    settingsModal.querySelector('.settings-close').addEventListener('click', function() {
      settingsModal.classList.remove('visible');
    });

    settingsModal.querySelector('.modal-backdrop').addEventListener('click', function() {
      settingsModal.classList.remove('visible');
    });

    // Tab navigation
    var tabBtns = settingsModal.querySelectorAll('.tab-btn');
    var tabPanels = settingsModal.querySelectorAll('.tab-panel');

    tabBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        tabBtns.forEach(function(b) { b.classList.remove('active'); });
        tabPanels.forEach(function(p) { p.style.display = 'none'; });
        
        this.classList.add('active');
        var panelId = this.getAttribute('data-tab');
        var panel = settingsModal.querySelector('#' + panelId);
        if (panel) panel.style.display = 'flex';
      });
    });
  }

  // ========== SETTINGS TOGGLES ==========
  
  // Reading Progress
  var readingProgressToggle = document.getElementById('toggle-reading-progress');
  if (readingProgressToggle) {
    readingProgressToggle.checked = localStorage.getItem('oros_reading_progress') !== 'false';
    readingProgressToggle.addEventListener('change', function() {
      var enabled = this.checked;
      localStorage.setItem('oros_reading_progress', enabled ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('oros-reading-progress-changed', {
        detail: { enabled: enabled }
      }));
    });
  }

  // Smart Typography
  var smartTypoToggle = document.getElementById('toggle-smart-typography');
  if (smartTypoToggle) {
    smartTypoToggle.checked = localStorage.getItem('oros_smart_typography') !== 'false';
    smartTypoToggle.addEventListener('change', function() {
      var enabled = this.checked;
      localStorage.setItem('oros_smart_typography', enabled ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('oros-smart-typography-changed', {
        detail: { enabled: enabled }
      }));
    });
  }

  // Focus Mode
  var focusModeToggle = document.getElementById('toggle-focus-mode');
  if (focusModeToggle) {
    focusModeToggle.checked = localStorage.getItem('oros_focus_mode') !== 'false';
    focusModeToggle.addEventListener('change', function() {
      var enabled = this.checked;
      localStorage.setItem('oros_focus_mode', enabled ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('oros-focus-mode-changed', {
        detail: { enabled: enabled }
      }));
    });
  }

  // Hide Stats
  var hideStatsToggle = document.getElementById('toggle-hide-stats');
  if (hideStatsToggle) {
    hideStatsToggle.checked = localStorage.getItem('oros_hide_stats') === 'true';
    hideStatsToggle.addEventListener('change', function() {
      var hidden = this.checked;
      localStorage.setItem('oros_hide_stats', hidden ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('oros-hide-stats-changed', {
        detail: { hidden: hidden }
      }));
    });
  }

  // Hide Save Indicator
  var hideSaveIndicatorToggle = document.getElementById('toggle-hide-save-indicator');
  if (hideSaveIndicatorToggle) {
    hideSaveIndicatorToggle.checked = localStorage.getItem('oros_hide_save_indicator') === 'true';
    hideSaveIndicatorToggle.addEventListener('change', function() {
      var hidden = this.checked;
      localStorage.setItem('oros_hide_save_indicator', hidden ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('oros-hide-save-indicator-changed', {
        detail: { hidden: hidden }
      }));
    });
  }

  // Hide Goal Button
  var hideGoalBtnToggle = document.getElementById('toggle-hide-goal-btn');
  if (hideGoalBtnToggle) {
    hideGoalBtnToggle.checked = localStorage.getItem('oros_hide_goal_btn') === 'true';
    hideGoalBtnToggle.addEventListener('change', function() {
      var hidden = this.checked;
      localStorage.setItem('oros_hide_goal_btn', hidden ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('oros-hide-goal-btn-changed', {
        detail: { hidden: hidden }
      }));
    });
  }

  // Hide Outline Button
  var hideOutlineBtnToggle = document.getElementById('toggle-hide-outline-btn');
  if (hideOutlineBtnToggle) {
    hideOutlineBtnToggle.checked = localStorage.getItem('oros_hide_outline_btn') === 'true';
    hideOutlineBtnToggle.addEventListener('change', function() {
      var hidden = this.checked;
      localStorage.setItem('oros_hide_outline_btn', hidden ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('oros-hide-outline-btn-changed', {
        detail: { hidden: hidden }
      }));
    });
  }

  // Hide Metadata Button
  var hideMetadataBtnToggle = document.getElementById('toggle-hide-metadata-btn');
  if (hideMetadataBtnToggle) {
    hideMetadataBtnToggle.checked = localStorage.getItem('oros_hide_metadata_btn') === 'true';
    hideMetadataBtnToggle.addEventListener('change', function() {
      var hidden = this.checked;
      localStorage.setItem('oros_hide_metadata_btn', hidden ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('oros-hide-metadata-btn-changed', {
        detail: { hidden: hidden }
      }));
    });
  }

  // Hide Find Button
  var hideFindBtnToggle = document.getElementById('toggle-hide-find-btn');
  if (hideFindBtnToggle) {
    hideFindBtnToggle.checked = localStorage.getItem('oros_hide_find_btn') === 'true';
    hideFindBtnToggle.addEventListener('change', function() {
      var hidden = this.checked;
      localStorage.setItem('oros_hide_find_btn', hidden ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('oros-hide-find-btn-changed', {
        detail: { hidden: hidden }
      }));
    });
  }

  // Hide Word Frequency Button
  var hideWordFreqBtnToggle = document.getElementById('toggle-hide-wordfreq-btn');
  if (hideWordFreqBtnToggle) {
    hideWordFreqBtnToggle.checked = localStorage.getItem('oros_hide_wordfreq_btn') === 'true';
    hideWordFreqBtnToggle.addEventListener('change', function() {
      var hidden = this.checked;
      localStorage.setItem('oros_hide_wordfreq_btn', hidden ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('oros-hide-wordfreq-btn-changed', {
        detail: { hidden: hidden }
      }));
    });
  }

  // Quick Format Toolbar (FIXED)
  var quickTbarToggle = document.getElementById('toggle-quick-tbar');
  if (quickTbarToggle) {
    quickTbarToggle.checked = localStorage.getItem('oros_hide_quick_tbar') === 'true';
    quickTbarToggle.addEventListener('change', function() {
      var hidden = this.checked;
      localStorage.setItem('oros_hide_quick_tbar', hidden ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('oros-hide-quick-tbar-changed', {
        detail: { hidden: hidden }
      }));
    });
  }

  // ========== PWA INSTALL PROMPT ==========
  var installBtn = document.getElementById('btn-install');
  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.disabled = false;
  });

  if (installBtn) {
    installBtn.addEventListener('click', function() {
      if (!deferredPrompt) return;
      
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function(result) {
        if (result.outcome === 'accepted') {
          console.log('User accepted install');
        }
        deferredPrompt = null;
      });
    });
  }

  // ========== INITIALIZE ==========
  translatePage();
})();