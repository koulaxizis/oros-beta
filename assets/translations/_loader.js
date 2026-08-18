// ============================================
// orOS Internationalization Loader
// Dynamically loads translation files per language
// ============================================

(function() {
  'use strict';

  var CACHE_KEY = 'oros_translations_cache';
  var LANG_KEY = 'oros-language';
  var DEFAULT_LANG = 'en';
  var SUPPORTED_LANGS = ['en', 'el', 'es', 'it', 'fr', 'de'];

  window.OROS_TRANSLATIONS = window.OROS_TRANSLATIONS || {};

  function detectLang() {
    var stored = localStorage.getItem(LANG_KEY);
    if (stored) return stored;
    var browser = (navigator.language || 'en').slice(0, 2);
    return SUPPORTED_LANGS.indexOf(browser) !== -1 ? browser : DEFAULT_LANG;
  }

  function loadLang(lang, callback) {
    var cache = {};
    try { cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
    catch(e) {}

    if (cache[lang]) {
      window.OROS_TRANSLATIONS[lang] = cache[lang];
      if (callback) callback(cache[lang]);
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'assets/translations/' + lang + '.json', true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          window.OROS_TRANSLATIONS[lang] = data;
          cache[lang] = data;
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
          if (callback) callback(data);
        } catch(e) {
          if (callback) callback({});
        }
      } else {
        if (callback) callback({});
      }
    };
    xhr.onerror = function() {
      if (callback) callback({});
    };
    xhr.send();
  }

  // Initialize
  var lang = detectLang();
  localStorage.setItem(LANG_KEY, lang);

  loadLang(lang, function(translations) {
    window.OROS_TRANSLATIONS[lang] = translations;
    window.dispatchEvent(new CustomEvent('oros-translations-ready', {
      detail: { lang: lang }
    }));
  });

  // Public API
  window.OROS_I18N = {
    getLang: function() { return localStorage.getItem(LANG_KEY) || DEFAULT_LANG; },
    setLang: function(newLang) {
      if (SUPPORTED_LANGS.indexOf(newLang) === -1) return;
      localStorage.setItem(LANG_KEY, newLang);
      loadLang(newLang, function() {
        window.dispatchEvent(new CustomEvent('oros-language-changed', {
          detail: { lang: newLang }
        }));
      });
    },
    loadLang: loadLang
  };
})();