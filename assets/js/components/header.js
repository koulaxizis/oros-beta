// ============================================
// orOS Header Component
// Shared across all pages
// Includes: Brand, Nav, Language, Theme, Zen, Help, Settings
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

  function getPageType() {
    var path = window.location.pathname;
    var page = path.split('/').pop();
    var map = {
      'index.html': 'index',
      'writer.html': 'writer',
      'editor.html': 'writer',
      'converter.html': 'converter',
      'kanban.html': 'kanban',
      'notes.html': 'notes',
      'prompter.html': 'prompter',
      'characters.html': 'characters'
    };
    return map[page] || 'index';
  }

  function buildHeader() {
    var header = document.getElementById('oros-header');
    if (!header) return;

    var lang = getCurrentLang();
    var pageType = getPageType();
    var isAppPage = pageType !== 'index';

    var navLinks = '';
    var apps = [
      { href: 'writer.html', icon: 'fa-pencil', key: 'editor_name' },
      { href: 'converter.html', icon: 'fa-text-width', key: 'converter_name' },
      { href: 'kanban.html', icon: 'fa-list-ul', key: 'kanban_name' },
      { href: 'notes.html', icon: 'fa-sticky-note-o', key: 'notes_name' },
      { href: 'prompter.html', icon: 'fa-lightbulb-o', key: 'prompter_name' },
      { href: 'characters.html', icon: 'fa-users', key: 'characters_name' }
    ];

    for (var i = 0; i < apps.length; i++) {
      var a = apps[i];
      var isActive = pageType === a.href.replace('.html', '');
      navLinks += '<a href="' + a.href + '" class="nav-link' + (isActive ? ' active' : '') + '"' +
        ' data-i18n="' + a.key + '">' + getTrans(a.key) + '</a>';
    }

    var savedTheme = localStorage.getItem('oros-theme') || 'dark';
    var isDark = savedTheme === 'dark';

    var html = '';

    html += '<header class="header" id="oros-header-bar">';
    html += '  <div class="header-left">';
    html += '    <a href="index.html" class="header-brand">';
    html += '      <img src="favicon.svg" alt="orOS" class="header-logo" />';
    html += '      <span class="brand-text">orOS</span>';
    html += '    </a>';
    html += '  </div>';

    html += '  <div class="header-nav" id="header-nav">';
    html += navLinks;
    html += '  </div>';

    html += '  <div class="header-right">';

    // Language selector
    html += '    <div class="header-control">';
    html += '      <select class="lang-select" id="lang-select" aria-label="' + getTrans('aria_language') + '" title="' + getTrans('aria_language') + '">';
    html += '        <option value="en"' + (lang === 'en' ? ' selected' : '') + '>EN</option>';
    html += '        <option value="el"' + (lang === 'el' ? ' selected' : '') + '>EL</option>';
    html += '      </select>';
    html += '    </div>';

    // Theme toggle
    html += '    <button class="header-btn" id="btn-theme-toggle" aria-label="' + getTrans('aria_theme_toggle') + '" title="' + getTrans('aria_theme_toggle') + '">';
    html += '      <i class="fa ' + (isDark ? 'fa-sun-o' : 'fa-moon-o') + '"></i>';
    html += '    </button>';

    // Zen mode (only on app pages)
    if (isAppPage) {
      html += '    <button class="header-btn" id="btn-zen-mode" aria-label="' + getTrans('aria_zen') + '" title="' + getTrans('tooltip_zen') + '">';
      html += '      <i class="fa fa-circle-o"></i>';
      html += '    </button>';
    }

    // Help button (?) — only on app pages
    if (isAppPage) {
      html += '    <button class="header-btn" id="btn-help" aria-label="Help" title="Help">';
      html += '      <i class="fa fa-question-circle"></i>';
      html += '    </button>';
    }

    // Settings
    html += '    <button class="header-btn" id="btn-settings" aria-label="' + getTrans('aria_settings') + '" title="' + getTrans('tooltip_settings') + '">';
    html += '      <i class="fa fa-cog"></i>';
    html += '    </button>';

    // Mobile menu toggle
    html += '    <button class="header-btn header-menu-toggle" id="btn-menu-toggle" aria-label="Menu">';
    html += '      <i class="fa fa-bars"></i>';
    html += '    </button>';

    html += '  </div>';
    html += '</header>';

    header.innerHTML = html;

    applyTheme(savedTheme);
  }

  // ============================================
  // THEME MANAGEMENT
  // ============================================

  function applyTheme(theme) {
    var body = document.body;
    if (theme === 'light') {
      body.classList.add('theme-light');
      body.classList.remove('theme-dark');
    } else {
      body.classList.add('theme-dark');
      body.classList.remove('theme-light');
    }
    localStorage.setItem('oros-theme', theme);

    var btn = document.getElementById('btn-theme-toggle');
    if (btn) {
      var icon = btn.querySelector('i');
      if (icon) {
        icon.className = 'fa ' + (theme === 'dark' ? 'fa-sun-o' : 'fa-moon-o');
      }
    }

    window.dispatchEvent(new CustomEvent('oros-theme-changed', { detail: { theme: theme } }));
  }

  // ============================================
  // ZEN MODE
  // ============================================

  function toggleZenMode() {
    var body = document.body;
    var isZen = body.getAttribute('data-zen') === 'true';
    if (isZen) {
      body.removeAttribute('data-zen');
      body.classList.remove('zen-mode');
    } else {
      body.setAttribute('data-zen', 'true');
      body.classList.add('zen-mode');
    }

    var zenCheckbox = document.getElementById('toggle-zen-mode');
    if (zenCheckbox) {
      zenCheckbox.checked = !isZen;
    }

    var label = !isZen ? getTrans('toggle_zen') : getTrans('toggle_zen') + ' Off';
    showToast(label);

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new CustomEvent('oros-zen-changed', { detail: { enabled: !isZen } }));
  }

  // ============================================
  // SETTINGS MODAL
  // ============================================

  function toggleSettings() {
    var modal = document.querySelector('.settings-modal');
    if (!modal) return;
    var isVisible = modal.classList.contains('visible');
    if (isVisible) {
      modal.classList.remove('visible');
    } else {
      modal.classList.add('visible');
      syncSettingsToggles();
    }
  }

  function syncSettingsToggles() {
    var zenToggle = document.getElementById('toggle-zen-mode');
    if (zenToggle) {
      zenToggle.checked = document.body.getAttribute('data-zen') === 'true';
    }
  }

  function setupSettingsNav() {
    var tabBtns = document.querySelectorAll('.settings-modal .tab-btn');
    var panels = document.querySelectorAll('.settings-modal .tab-panel');

    for (var i = 0; i < tabBtns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          for (var j = 0; j < tabBtns.length; j++) {
            tabBtns[j].classList.remove('active');
          }
          for (var k = 0; k < panels.length; k++) {
            panels[k].style.display = 'none';
          }
          btn.classList.add('active');
          var targetId = btn.getAttribute('data-tab');
          var target = document.getElementById(targetId);
          if (target) target.style.display = 'flex';
        });
      })(tabBtns[i]);
    }

    var overlay = document.querySelector('.settings-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', toggleSettings);
    }

    var closeBtn = document.querySelector('.settings-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', toggleSettings);
    }

    var zenCheckbox = document.getElementById('toggle-zen-mode');
    if (zenCheckbox) {
      zenCheckbox.addEventListener('change', function() {
        toggleZenMode();
      });
    }
  }

  // ============================================
  // LANGUAGE SWITCHING
  // ============================================

  function changeLanguage(lang) {
    localStorage.setItem('oros-language', lang);
    document.documentElement.setAttribute('lang', lang);

    window.dispatchEvent(new CustomEvent('oros-language-changed', { detail: { lang: lang } }));
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: lang } }));

    window.location.reload();
  }

  // ============================================
  // MOBILE MENU
  // ============================================

  function toggleMobileMenu() {
    var nav = document.getElementById('header-nav');
    if (!nav) return;
    nav.classList.toggle('mobile-open');
  }

  // ============================================
  // TOAST
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
    }, 2500);
  }

  // ============================================
  // PWA INSTALL
  // ============================================

  var deferredInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', function(e) {
    deferredInstallPrompt = e;
    var installBtn = document.getElementById('btn-install');
    if (installBtn) {
      installBtn.disabled = false;
      installBtn.addEventListener('click', function() {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          deferredInstallPrompt.userChoice.then(function(choice) {
            if (choice.outcome === 'accepted') {
              installBtn.disabled = true;
            }
            deferredInstallPrompt = null;
          });
        }
      });
    }
  });

  // ============================================
  // KEYBOARD SHORTCUT (F9 for Zen)
  // ============================================

  document.addEventListener('keydown', function(e) {
    if (e.key === 'F9') {
      e.preventDefault();
      if (getPageType() !== 'index') {
        toggleZenMode();
      }
    }
  });

  // ============================================
  // INIT
  // ============================================

  function init() {
    buildHeader();

    var themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function() {
        var current = localStorage.getItem('oros-theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    }

    var zenBtn = document.getElementById('btn-zen-mode');
    if (zenBtn) {
      zenBtn.addEventListener('click', toggleZenMode);
    }

    var settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', toggleSettings);
    }

    var langSelect = document.getElementById('lang-select');
    if (langSelect) {
      langSelect.addEventListener('change', function() {
        changeLanguage(this.value);
      });
    }

    var menuToggle = document.getElementById('btn-menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', toggleMobileMenu);
    }

    setupSettingsNav();

    var navLinks = document.querySelectorAll('.nav-link');
    for (var i = 0; i < navLinks.length; i++) {
      navLinks[i].addEventListener('click', function() {
        var nav = document.getElementById('header-nav');
        if (nav) nav.classList.remove('mobile-open');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();