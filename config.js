// ============================================
// orOS — Channel Configuration
// ════════════════════════════════════════════
// Αυτό είναι το ΜΟΝΑΔΙΚΟ αρχείο που αλλάζεις
// όταν κάνεις switch μεταξύ beta και production.
// ============================================

window.OROS_CONFIG = {
  channel: 'beta',              // 'beta' ή 'prod'
  baseHref: '/oros-beta/',       // '/' για production
  isBeta: true,                 // false για production
  version: 'v0.5-BETA',         // 'v0.5' για production
  swCacheVersion: 'v5'          // ίδιο και για τα δύο κανάλια
};