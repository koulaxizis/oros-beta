// ============================================
// orOS — Central Config
// ============================================

var OROS_CONFIG = {
  baseHref: '/oros-beta/',
  version: '0.8.0',
  channel: 'beta',
  domain: 'https://koulaxizis.github.io/oros-beta',
  cacheName: 'oros-v0.8.0',

  // SEO Configuration
  seo: {
    title: 'orOS Productivity Suite — Your Private Workspace',
    description: 'Privacy-first productivity suite: Writer, Kanban, Wiki Notes, Case Converter, Format Converter, Prompter. All work offline. No tracking. No cookies.',
    keywords: ['productivity suite', 'writer', 'kanban', 'wiki', 'notes', 'case converter', 'format converter', 'prompter', 'privacy', 'offline', 'open source'],
    author: 'Christos Koulaxizis',
    twitterHandle: '@koulaxizis',
    ogImage: '/og-image.png',
    twitterImage: '/twitter-card.png'
  }
};

if (typeof window !== 'undefined') {
  window.OROS_CONFIG = OROS_CONFIG;
}