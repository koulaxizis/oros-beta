// ============================================
// orOS Writer — Central Config 
// ============================================

var OROS_CONFIG = {
  baseHref: '/oros-beta/',
  version: '0.6.3',
  channel: 'beta',
  domain: 'https://koulaxizis.github.io/oros-beta',
  cacheName: 'oros-v06'
};

if (typeof window !== 'undefined') {
  window.OROS_CONFIG = OROS_CONFIG;
}

// var OROS_CONFIG = {
//  baseHref: '/',
//  version: '0.5-beta',
//  channel: 'stable',
//  domain: 'https://useoros.com',
//  cacheName: 'oros-v5'
//};