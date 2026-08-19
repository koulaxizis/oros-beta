// ============================================
// orOS Translation Loader
// Dynamically loads translations from JSON
// ============================================

(function() {
  'use strict';

  var lang = localStorage.getItem('oros-language') || 'en';
  var path = 'assets/translations/' + lang + '.json';

  fetch(path)
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      window.OROS_TRANSLATIONS = {};
      window.OROS_TRANSLATIONS[lang] = data;
      
      // Dispatch event so other scripts know translations are ready
      window.dispatchEvent(new CustomEvent('oros-translations-ready', {
        detail: { lang: lang }
      }));
    })
    .catch(function(e) {
      console.error('Translation load failed:', e);
      // Fallback: empty translations
      window.OROS_TRANSLATIONS = {};
      window.OROS_TRANSLATIONS[lang] = {};
      window.dispatchEvent(new CustomEvent('oros-translations-ready', {
        detail: { lang: lang }
      }));
    });

  // Listen for language changes
  window.addEventListener('oros-language-changed', function(e) {
    var newLang = e.detail.lang;
    path = 'assets/translations/' + newLang + '.json';
    
    fetch(path)
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) {
        window.OROS_TRANSLATIONS[newLang] = data;
        window.dispatchEvent(new CustomEvent('oros-translations-ready', {
          detail: { lang: newLang }
        }));
      })
      .catch(function(e) {
        console.error('Translation reload failed:', e);
        window.OROS_TRANSLATIONS[newLang] = {};
        window.dispatchEvent(new CustomEvent('oros-translations-ready', {
          detail: { lang: newLang }
        }));
      });
  });

})();