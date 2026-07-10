// color-lab.js — Αρχείο: assets/js/components/color-lab.js

(function() {
  'use strict';

  /* ===== STATE ===== */
  var baseColor = '#c8a96e';
  var harmonyType = 'complementary';
  var palette = [];

  /* ===== I18N LOADER ===== */
  var translations = {};
  var currentLang = localStorage.getItem('oros-lang') ||
    (navigator.language || navigator.userLanguage || 'en').split('-')[0];
  if (['el','en','es','it','fr','de'].indexOf(currentLang) === -1) currentLang = 'en';

  function loadTranslations() {
    fetch('translations.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        translations = data;
        applyTranslations();
      })
      .catch(function(e) {
        console.warn('Failed to load translations:', e);
      });
  }

  function t(key) {
    var langData = translations[currentLang] || translations['en'] || {};
    return langData[key] || key;
  }

  function applyTranslations() {
    document.documentElement.lang = currentLang;
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n');
      var val = t(key);
      if (val) els[i].textContent = val;
    }
  }

  /* ===== COLOR UTILITIES ===== */

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return {
      r: parseInt(hex.substr(0, 2), 16),
      g: parseInt(hex.substr(2, 2), 16),
      b: parseInt(hex.substr(4, 2), 16)
    };
  }

  function rgbToHex(r, g, b) {
    function toHex(n) {
      n = Math.max(0, Math.min(255, Math.round(n)));
      var s = n.toString(16);
      return s.length === 1 ? '0' + s : s;
    }
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      }
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
  }

  function hexToHsl(hex) {
    var rgb = hexToRgb(hex);
    return rgbToHsl(rgb.r, rgb.g, rgb.b);
  }

  function hslToHex(h, s, l) {
    var rgb = hslToRgb(h, s, l);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  function isValidHex(str) {
    return /^#[0-9A-Fa-f]{6}$/.test(str);
  }

  /* ===== HARMONY GENERATION ===== */

  function generatePalette(hex, type) {
    var hsl = hexToHsl(hex);
    var h = hsl.h;
    var s = hsl.s;
    var l = hsl.l;
    var result = [];

    switch (type) {
      case 'complementary':
        result = [
          { h: h, s: s, l: l },
          { h: h, s: s, l: Math.min(l + 15, 95) },
          { h: h, s: s, l: Math.max(l - 15, 5) },
          { h: (h + 180) % 360, s: s, l: l },
          { h: (h + 180) % 360, s: s, l: Math.min(l + 15, 95) }
        ];
        break;

      case 'analogous':
        result = [
          { h: (h + 330) % 360, s: s, l: l },
          { h: (h + 345) % 360, s: s, l: l },
          { h: h, s: s, l: l },
          { h: (h + 15) % 360, s: s, l: l },
          { h: (h + 30) % 360, s: s, l: l }
        ];
        break;

      case 'triadic':
        result = [
          { h: h, s: s, l: l },
          { h: (h + 120) % 360, s: s, l: l },
          { h: (h + 240) % 360, s: s, l: l },
          { h: h, s: s, l: Math.min(l + 20, 95) },
          { h: h, s: s, l: Math.max(l - 20, 5) }
        ];
        break;

      case 'tetradic':
        result = [
          { h: h, s: s, l: l },
          { h: (h + 90) % 360, s: s, l: l },
          { h: (h + 180) % 360, s: s, l: l },
          { h: (h + 270) % 360, s: s, l: l },
          { h: h, s: s, l: Math.max(l - 20, 5) }
        ];
        break;

      case 'monochromatic':
        result = [
          { h: h, s: s, l: Math.max(l - 30, 5) },
          { h: h, s: s, l: Math.max(l - 15, 5) },
          { h: h, s: s, l: l },
          { h: h, s: s, l: Math.min(l + 15, 95) },
          { h: h, s: s, l: Math.min(l + 30, 95) }
        ];
        break;
    }

    return result.map(function(c) {
      return hslToHex(c.h, c.s, c.l);
    });
  }

  /* ===== PALETTE RENDERING ===== */

  function renderPalette() {
    palette = generatePalette(baseColor, harmonyType);
    var container = document.getElementById('cl-palette');
    if (!container) return;
    container.innerHTML = '';

    palette.forEach(function(hex, i) {
      var swatch = document.createElement('div');
      swatch.className = 'cl-swatch';
      swatch.style.backgroundColor = hex;

      var rgb = hexToRgb(hex);
      var brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
      var textColor = brightness > 128 ? '#1b1a18' : '#e8e6e3';

      var hexLabel = document.createElement('span');
      hexLabel.className = 'cl-swatch-hex';
      hexLabel.textContent = hex.toUpperCase();
      hexLabel.style.color = textColor;

      var copyHint = document.createElement('span');
      copyHint.className = 'cl-swatch-hint';
      copyHint.textContent = t('colorlab_copy') || 'Click to copy';
      copyHint.style.color = textColor;
      copyHint.style.opacity = '0.7';

      swatch.appendChild(hexLabel);
      swatch.appendChild(copyHint);

      swatch.addEventListener('click', function() {
        copyToClipboard(hex.toUpperCase());
        copyHint.textContent = t('colorlab_copied') || 'Copied!';
        copyHint.style.opacity = '1';
        setTimeout(function() {
          copyHint.textContent = t('colorlab_copy') || 'Click to copy';
          copyHint.style.opacity = '0.7';
        }, 1500);
      });

      container.appendChild(swatch);
    });
  }

  /* ===== CLIPBOARD ===== */

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function() {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ===== RANDOM PALETTE ===== */

  function randomColor() {
    var h = Math.floor(Math.random() * 360);
    var s = 40 + Math.floor(Math.random() * 50);
    var l = 30 + Math.floor(Math.random() * 50);
    return hslToHex(h, s, l);
  }

  /* ===== EXPORT JSON ===== */

  function exportPalette() {
    var data = {
      baseColor: baseColor.toUpperCase(),
      harmony: harmonyType,
      palette: palette.map(function(h) { return h.toUpperCase(); }),
      generated: new Date().toISOString()
    };
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'oros-palette-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ===== EVENT LISTENERS ===== */

  function setupListeners() {
    var colorInput = document.getElementById('cl-base-color');
    var hexInput = document.getElementById('cl-hex-input');

    if (colorInput) {
      colorInput.addEventListener('input', function(e) {
        baseColor = e.target.value;
        if (hexInput) hexInput.value = baseColor.toUpperCase();
        renderPalette();
      });
    }

    if (hexInput) {
      hexInput.addEventListener('input', function(e) {
        var val = e.target.value;
        if (isValidHex(val)) {
          baseColor = val.toLowerCase();
          if (colorInput) colorInput.value = baseColor;
          renderPalette();
        }
      });
    }

    var harmonyBtns = document.querySelectorAll('.cl-harmony-btn');
    for (var i = 0; i < harmonyBtns.length; i++) {
      harmonyBtns[i].addEventListener('click', function(e) {
        for (var j = 0; j < harmonyBtns.length; j++) {
          harmonyBtns[j].classList.remove('active');
        }
        e.currentTarget.classList.add('active');
        harmonyType = e.currentTarget.getAttribute('data-harmony');
        renderPalette();
      });
    }

    var randomBtn = document.getElementById('cl-random');
    if (randomBtn) {
      randomBtn.addEventListener('click', function() {
        baseColor = randomColor();
        if (colorInput) colorInput.value = baseColor;
        if (hexInput) hexInput.value = baseColor.toUpperCase();
        renderPalette();
      });
    }

    var exportBtn = document.getElementById('cl-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportPalette);
    }
  }

  /* ===== INIT ===== */

  function init() {
    loadTranslations();
    setupListeners();
    renderPalette();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();