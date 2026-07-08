(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var footerEl = document.getElementById('oros-footer');
    if (!footerEl) return;

    var version = (window.OROS_CONFIG && window.OROS_CONFIG.version) || '0.6.2';
	var channel = (window.OROS_CONFIG && window.OROS_CONFIG.channel) || 'beta';

    footerEl.innerHTML =
      '<footer class="footer">' +
        '<div class="footer-content">' +
          '<div class="footer-left">' +
            '<span class="footer-credits">\u00A9 2026 <a href="https://koulaxizis.gr" target="_blank" rel="noopener" class="footer-link">Christos Koulaxizis</a></span>' +
          '</div>' +
          '<div class="footer-right">' +
            '<span class="footer-badge" data-i18n="footer_privacy_badge">Open Source \u00B7 No Tracking \u00B7 No Ads \u00B7 Privacy First</span>' +
          '</div>' +
        '</div>' +
      '</footer>';
  });
})();