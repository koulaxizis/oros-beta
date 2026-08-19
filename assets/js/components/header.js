// ============================================
// orOS Header Component
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

  function langLabel(code) {
    var labels = {
      'el': 'Ελληνικά', 'en': 'English', 'es': 'Español',
      'it': 'Italiano', 'fr': 'Français', 'de': 'Deutsch'
    };
    return labels[code] || code;
  }

  function renderHeader() {
    var container = document.getElementById('oros-header');
    if (!container) return;

    container.innerHTML =
      '<header class="orus-header">' +
        '<div class="header-main">' +
          '<div class="brand-section">' +
            '<a href="index.html" class="brand-logo">' +
              '<div class="logo-icon">' +
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">' +
                  '<rect width="512" height="512" rx="96" fill="#1b1a18"/>' +
                  '<path d="M256 104 L460 408 L52 408 Z M256 104 L342 246 L388 176 L460 408" ' +
                  'stroke="#c8a96e" stroke-width="20" stroke-linecap="round" ' +
                  'stroke-linejoin="miter" stroke-miterlimit="3" fill="none"/>' +
                '</svg>' +
              '</div>' +
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
                '<span id="current-lang-label">' + langLabel(getCurrentLang()) + '</span>' +
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
            '<button class="action-btn" id="btn-zen" title="Zen Mode" data-i18n-title="toggle_zen">' +
              '<i class="fa fa-arrows-alt"></i>' +
            '</button>' +
            '<button class="action-btn" id="btn-settings" title="Settings" data-i18n-title="settings">' +
              '<i class="fa fa-cog"></i>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</header>';

    // --- Language dropdown ---
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
          e.preventDefault();
          var lang = e.target.dataset.lang;
          // FIX: Set localStorage AND dispatch event for _loader.js + main.js
          localStorage.setItem('oros-language', lang);
          label.textContent = langLabel(lang);
          dropdown.classList.remove('visible');
          window.dispatchEvent(new CustomEvent('oros-language-changed', {
            detail: { lang: lang }
          }));
        }
        e.stopPropagation();
      });
    }

    // --- Zen mode (FIX: use data-zen attribute + oros_zen_mode key, matching main.js) ---
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
        localStorage.setItem('oros_zen_mode', isZen ? 'false' : 'true');
        window.dispatchEvent(new CustomEvent('oros-zen-mode-changed', {
          detail: { enabled: !isZen }
        }));
      });

      // Restore saved zen mode
      if (localStorage.getItem('oros_zen_mode') === 'true') {
        document.body.setAttribute('data-zen', 'true');
      }
    }

    // --- Settings button ---
    var settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function() {
        var modal = document.querySelector('.settings-modal');
        if (modal) {
          modal.classList.add('visible');
        }
      });
    }

    // --- Apply translations ---
    document.querySelectorAll('[data-i18n]').forEach(function(elem) {
      var key = elem.getAttribute('data-i18n');
      var val = getTrans(key);
      if (val && val !== key) elem.textContent = val;
    });
  }

  // --- Event listeners ---
  window.addEventListener('oros-language-changed', function() {
    renderHeader();
  });

  window.addEventListener('oros-translations-ready', function() {
    renderHeader();
  });

  // --- Init ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      renderHeader();
    });
  } else {
    renderHeader();
  }
})();