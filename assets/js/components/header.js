// ============================================
// orOS Header Component
// Updated for Productivity Suite branding
// FIXED: relative links, zen key, event name typo
// ============================================

(function() {
  'use strict';

  function getCurrentLang() {
    return localStorage.getItem('oros-language') || 'en';
  }

  function getTrans(key) {
    var lang = getCurrentLang();
    var t = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[lang]) || {};
    return t[key] || key;
  }

  function renderHeader() {
    var container = document.getElementById('oros-header');
    if (!container) return;

    container.innerHTML =
      '<header class="orus-header">' +
        '<div class="header-main">' +
          '<div class="brand-section">' +
            '<a href="index.html" class="brand-logo">' +
              '<div class="logo-icon"><svg viewBox="0 0 32 32"><path fill="currentColor" d="M16 2L4 8v16l12 6 12-6V8L16 2zm0 3.5l9 4.5-9 4.5-9-4.5 9-4.5zM6.5 10l8.5 4.25v11.5L6.5 21.5V10zm19 0v11.5L17 25.75v-11.5L25.5 10z"/></svg></div>' +
              '<div class="brand-text">' +
                '<span class="brand-name">orOS</span>' +
                '<span class="brand-tagline">' + getTrans('suite_productivity') + '</span>' +
              '</div>' +
            '</a>' +
          '</div>' +
          '<nav class="nav-section">' +
            '<a href="index.html" class="nav-link" data-i18n="nav_home">Home</a>' +
            '<a href="editor.html" class="nav-link" data-i18n="nav_writer">Writer</a>' +
            '<a href="kanban.html" class="nav-link" data-i18n="nav_kanban">Kanban</a>' +
            '<a href="wiki.html" class="nav-link" data-i18n="nav_wiki">Wiki Notes</a>' +
            '<a href="case.html" class="nav-link" data-i18n="nav_case">Case</a>' +
            '<a href="converter.html" class="nav-link" data-i18n="nav_converter">Convert</a>' +
            '<a href="prompter.html" class="nav-link" data-i18n="nav_prompter">Prompter</a>' +
          '</nav>' +
          '<div class="header-actions">' +
            '<div class="language-dropdown">' +
              '<button class="lang-btn" id="language-select-btn" aria-label="Select Language">' +
                '<i class="fa fa-globe"></i>' +
                '<span id="current-lang-label">' + (getCurrentLang() === 'el' ? 'Ελληνικά' : 'English') + '</span>' +
              '</button>' +
              '<div class="lang-dropdown" id="language-dropdown">' +
                '<a href="#" class="lang-item" data-lang="el">Ελληνικά</a>' +
                '<a href="#" class="lang-item" data-lang="en">English</a>' +
                '<a href="#" class="lang-item" data-lang="es">Español</a>' +
                '<a href="#" class="lang-item" data-lang="it">Italiano</a>' +
                '<a href="#" class="lang-item" data-lang="fr">Français</a>' +
                '<a href="#" class="lang-item" data-lang="de">Deutsch</a>' +
              '</div>' +
            '</div>' +
            '<button class="action-btn zen-mode-toggle" id="zen-mode-btn" title="Zen Mode" data-i18n-title="toggle_zen">' +
              '<i class="fa fa-arrows-alt"></i>' +
            '</button>' +
            '<button class="action-btn settings-btn" id="settings-btn" title="Settings" data-i18n-title="settings">' +
              '<i class="fa fa-cog"></i>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</header>';

    // Language dropdown handler
    var btn = document.getElementById('language-select-btn');
    var dropdown = document.getElementById('language-dropdown');
    var label = document.getElementById('current-lang-label');

    if (btn && dropdown && label) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('visible');
      });

      document.addEventListener('click', function() {
        dropdown.classList.remove('visible');
      });

      dropdown.addEventListener('click', function(e) {
        if (e.target.classList.contains('lang-item')) {
          var lang = e.target.dataset.lang;
          if (window.OROS_I18N && window.OROS_I18N.setLang) {
            window.OROS_I18N.setLang(lang);
          } else {
            localStorage.setItem('oros-language', lang);
          }
          label.textContent = lang === 'el' ? 'Ελληνικά' : (lang === 'en' ? 'English' :
            lang === 'es' ? 'Español' : lang === 'it' ? 'Italiano' :
            lang === 'fr' ? 'Français' : 'Deutsch');
          dropdown.classList.remove('visible');
        }
        e.stopPropagation();
      });
    }

    // Zen mode toggle
    var zenBtn = document.getElementById('zen-mode-btn');
    if (zenBtn) {
      zenBtn.addEventListener('click', function() {
        document.body.classList.toggle('zen-mode');
        var zenEnabled = document.body.classList.contains('zen-mode');
        // FIXED: use oros_zen_mode (underscore) to match main.js
        localStorage.setItem('oros_zen_mode', zenEnabled ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('oros-zen-mode-changed', {
          detail: { enabled: zenEnabled }
        }));
      });

      // Restore saved zen mode
      // FIXED: use oros_zen_mode (underscore) to match main.js
      var savedZen = localStorage.getItem('oros_zen_mode') === 'true';
      if (savedZen) {
        document.body.classList.add('zen-mode');
      }
    }

    // Settings button
    var settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function() {
        var modal = document.querySelector('.settings-modal');
        if (modal) {
          modal.classList.add('visible');
        }
      });
    }

    // Translate static UI elements after rendering
    translateStaticElements();
  }

  function translateStaticElements() {
    // Apply translations to all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(function(elem) {
      var key = elem.getAttribute('data-i18n');
      var val = getTrans(key);
      if (val && val !== key) elem.textContent = val;
    });
  }

  // Re-render on language change
  // FIXED: typo was 'oras-language-changed' → 'oros-language-changed'
  window.addEventListener('oros-language-changed', function() {
    renderHeader();
  });

  // Also re-render when translations are first loaded
  window.addEventListener('oros-translations-ready', function() {
    renderHeader();
  });

  // Initial render
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(renderHeader, 100);
    });
  } else {
    setTimeout(renderHeader, 100);
  }
})();