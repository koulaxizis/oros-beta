// ============================================
// orOS — Central Config 
// ============================================

var OROS_CONFIG = {
  baseHref: '/oros-beta/',
  version: '0.7.4',
  channel: 'beta',
  domain: 'https://koulaxizis.github.io/oros-beta',
  cacheName: 'oros-v0.7.4'
};

if (typeof window !== 'undefined') {
  window.OROS_CONFIG = OROS_CONFIG;
}