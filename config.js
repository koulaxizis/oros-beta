// ============================================
// orOS Global Configuration
// ============================================

var OROS_CONFIG = {
  version: '1.0.1',
  channel: 'beta',
  domain: 'https://koulaxizis.github.io/oros-beta',
  baseHref: (function() {
    var path = window.location.pathname;
    var base = path.substring(0, path.lastIndexOf('/') + 1);
    return base || '/';
  })(),
  author: 'Christos Koulaxizis',
  website: 'https://koulaxizis.gr',
  github: 'https://github.com/koulaxizis/oros-beta',
  license: 'MIT',
  languages: ['en', 'el'],
  defaultLanguage: 'en'
};