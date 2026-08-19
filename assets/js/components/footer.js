// ============================================
// orOS Footer Component
// ============================================

(function() {
  'use strict';

  function getCurrentLang() {
    return localStorage.getItem('oros-language') || 'en';
  }

  function renderFooter() {
    var container = document.getElementById('oros-footer');
    if (!container) return;

    var lang = getCurrentLang();
    var credit = 'Designed by Christos Koulaxizis';
    var privacy = '';
    var opensource = '';

    if (lang === 'el') {
      privacy = 'Ιδιωτικότητα Πρώτα · Χωρίς Cookies · Χωρίς Παρακολούθηση';
      opensource = 'Ανοιχτός Κώδικας';
    } else {
      privacy = 'Privacy First · No Cookies · No Tracking';
      opensource = 'Open Source';
    }

    container.innerHTML =
      '<footer class="orus-footer">' +
        '<div class="footer-content">' +
          '<div class="footer-section">' +
            '<p class="footer-credit">' + credit + '</p>' +
            '<span class="footer-separator">•</span>' +
            '<p class="footer-privacy">' + privacy + '</p>' +
          '</div>' +
          '<div class="footer-section">' +
            '<a href="https://github.com/koulaxizis/oros-beta" target="_blank" rel="noopener" class="footer-link">GitHub</a>' +
            '<span class="footer-separator">•</span>' +
            '<span class="footer-open-source">' + opensource + '</span>' +
          '</div>' +
        '</div>' +
      '</footer>';
  }

  window.addEventListener('oros-language-changed', function() {
    renderFooter();
  });

  window.addEventListener('oros-translations-ready', function() {
    renderFooter();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(renderFooter, 100);
    });
  } else {
    setTimeout(renderFooter, 100);
  }
})();