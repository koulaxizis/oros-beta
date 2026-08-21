// ============================================
// orOS Prompter — Writing Prompts App
// 100 prompts · 10 techniques · Bilingual
// ============================================

(function() {
  'use strict';

  var STORAGE_FAVS = 'oros_prompter_favorites';
  var STORAGE_HIDE_RANDOM = 'oros_hide_random_btn';
  var STORAGE_HIDE_FILTER = 'oros_hide_filter_bar';
  var STORAGE_HIDE_FAV_TOGGLE = 'oros_hide_fav_toggle';

  var promptsGrid = document.getElementById('prompts-grid');
  var promptsEmpty = document.getElementById('prompts-empty');
  var filterChips = document.getElementById('filter-chips');
  var searchInput = document.getElementById('prompt-search');
  var randomBtn = document.getElementById('btn-random-prompt');
  var randomDisplay = document.getElementById('random-prompt-display');
  var randomText = document.getElementById('random-prompt-text');
  var randomCategoryBadge = document.getElementById('random-category-badge');
  var btnReroll = document.getElementById('btn-reroll');
  var btnRandomCopy = document.getElementById('btn-random-copy');
  var btnRandomClose = document.getElementById('btn-random-close');
  var btnOpenInWriter = document.getElementById('btn-open-in-writer');
  var favToggle = document.getElementById('btn-favorites-toggle');

  var promptsData = null;
  var currentFilter = 'all';
  var currentSearch = '';
  var favoritesOnly = false;
  var favorites = loadFavorites();
  var currentRandomPrompt = null;

  // ========== HELPERS ==========
  function getLang() { return localStorage.getItem('oros-language') || 'en'; }

  function getTrans(key) {
    var lang = getLang();
    var t = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[lang]) || {};
    return t[key] || key;
  }

  function showToast(message) {
    var toast = document.getElementById('zen-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'zen-toast';
      toast.className = 'zentool-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = '';
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() {
      toast.classList.remove('visible');
    }, 3000);
  }

  // ========== FAVORITES ==========
  function loadFavorites() {
    try {
      var raw = localStorage.getItem(STORAGE_FAVS);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function saveFavorites() {
    localStorage.setItem(STORAGE_FAVS, JSON.stringify(favorites));
  }

  function toggleFavorite(id) {
    var idx = favorites.indexOf(id);
    if (idx === -1) {
      favorites.push(id);
    } else {
      favorites.splice(idx, 1);
    }
    saveFavorites();
  }

  function isFavorite(id) {
    return favorites.indexOf(id) !== -1;
  }

  // ========== DATA LOADING ==========
  function loadPrompts() {
    fetch('assets/js/prompts.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        promptsData = data;
        renderFilterChips();
        renderPrompts();
      })
      .catch(function(e) {
        console.error('Failed to load prompts:', e);
        if (promptsGrid) {
          promptsGrid.innerHTML = '<div class="prompts-empty"><p>Error loading prompts.</p></div>';
        }
      });
  }

  // ========== FILTER CHIPS ==========
  function renderFilterChips() {
    if (!filterChips || !promptsData) return;
    var lang = getLang();
    var html = '<button class="chip active" data-filter="all">' +
      '<i class="fa fa-list-ul"></i>' +
      (lang === 'el' ? 'Όλα' : 'All') + '</button>';

    for (var i = 0; i < promptsData.categories.length; i++) {
      var cat = promptsData.categories[i];
      html += '<button class="chip" data-filter="' + cat.id + '">' +
        '<i class="fa ' + cat.icon + '"></i>' +
        (cat.name[lang] || cat.name.en) + '</button>';
    }

    filterChips.innerHTML = html;

    var chips = filterChips.querySelectorAll('.chip');
    for (var j = 0; j < chips.length; j++) {
      (function(chip) {
        chip.addEventListener('click', function() {
          chips.forEach(function(c) { c.classList.remove('active'); });
          chip.classList.add('active');
          currentFilter = chip.getAttribute('data-filter');
          renderPrompts();
        });
      })(chips[j]);
    }
  }

  // ========== RENDER PROMPTS ==========
  function getCategoryById(catId) {
    if (!promptsData) return null;
    for (var i = 0; i < promptsData.categories.length; i++) {
      if (promptsData.categories[i].id === catId) return promptsData.categories[i];
    }
    return null;
  }

  function getFilteredPrompts() {
    if (!promptsData) return [];
    var lang = getLang();
    var filtered = promptsData.prompts.filter(function(p) {
      if (currentFilter !== 'all' && p.category !== currentFilter) return false;
      if (favoritesOnly && !isFavorite(p.id)) return false;
      if (currentSearch) {
        var text = (p.text[lang] || p.text.en).toLowerCase();
        if (text.indexOf(currentSearch.toLowerCase()) === -1) return false;
      }
      return true;
    });
    return filtered;
  }

  function renderPrompts() {
    if (!promptsGrid || !promptsData) return;
    var lang = getLang();
    var filtered = getFilteredPrompts();

    if (filtered.length === 0) {
      promptsGrid.style.display = 'none';
      promptsEmpty.style.display = 'block';
      return;
    }

    promptsGrid.style.display = 'grid';
    promptsEmpty.style.display = 'none';

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var p = filtered[i];
      var cat = getCategoryById(p.category);
      var catName = cat ? (cat.name[lang] || cat.name.en) : p.category;
      var catIcon = cat ? cat.icon : 'fa-pencil';
      var text = p.text[lang] || p.text.en;
      var isFav = isFavorite(p.id);

      html += '<div class="prompt-card" data-id="' + p.id + '">' +
        '<div class="prompt-card-header">' +
          '<span class="prompt-card-category"><i class="fa ' + catIcon + '"></i>' + catName + '</span>' +
          '<span class="prompt-card-number">#' + p.id + '</span>' +
        '</div>' +
        '<p class="prompt-card-text">' + escapeHtml(text) + '</p>' +
        '<div class="prompt-card-actions">' +
          '<button class="mini-btn fav-btn' + (isFav ? ' active' : '') + '" data-action="fav" data-id="' + p.id + '" title="Favorite"><i class="fa ' + (isFav ? 'fa-star' : 'fa-star-o') + '"></i></button>' +
          '<button class="mini-btn" data-action="copy" data-id="' + p.id + '" title="Copy"><i class="fa fa-clipboard"></i></button>' +
          '<button class="mini-btn" data-action="writer" data-id="' + p.id + '" title="Open in Writer"><i class="fa fa-pencil"></i></button>' +
        '</div>' +
      '</div>';
    }

    promptsGrid.innerHTML = html;

    var cards = promptsGrid.querySelectorAll('.prompt-card');
    for (var j = 0; j < cards.length; j++) {
      (function(card) {
        var btns = card.querySelectorAll('[data-action]');
        for (var k = 0; k < btns.length; k++) {
          (function(btn) {
            btn.addEventListener('click', function(e) {
              e.stopPropagation();
              var action = btn.getAttribute('data-action');
              var id = parseInt(btn.getAttribute('data-id'));
              handleCardAction(action, id, btn);
            });
          })(btns[k]);
        }
      })(cards[j]);
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== CARD ACTIONS ==========
  function handleCardAction(action, id, btn) {
    var prompt = findPromptById(id);
    if (!prompt) return;
    var lang = getLang();
    var text = prompt.text[lang] || prompt.text.en;

    if (action === 'fav') {
      toggleFavorite(id);
      var isFav = isFavorite(id);
      btn.classList.toggle('active', isFav);
      var icon = btn.querySelector('i');
      if (icon) icon.className = isFav ? 'fa fa-star' : 'fa fa-star-o';
      if (favoritesOnly) renderPrompts();
    } else if (action === 'copy') {
      copyToClipboard(text);
      showToast(getTrans('toast_copied') || 'Copied!');
    } else if (action === 'writer') {
      openInWriter(text);
    }
  }

  function findPromptById(id) {
    if (!promptsData) return null;
    for (var i = 0; i < promptsData.prompts.length; i++) {
      if (promptsData.prompts[i].id === id) return promptsData.prompts[i];
    }
    return null;
  }

  // ========== RANDOM PROMPT ==========
  function showRandomPrompt() {
    if (!promptsData) return;
    var pool = getFilteredPrompts();
    if (pool.length === 0) {
      showToast(getTrans('prompter_no_results') || 'No prompts found');
      return;
    }
    var randomIdx = Math.floor(Math.random() * pool.length);
    currentRandomPrompt = pool[randomIdx];
    displayRandomPrompt(currentRandomPrompt);
  }

  function displayRandomPrompt(prompt) {
    if (!prompt || !randomDisplay) return;
    var lang = getLang();
    var cat = getCategoryById(prompt.category);
    var catName = cat ? (cat.name[lang] || cat.name.en) : prompt.category;
    var text = prompt.text[lang] || prompt.text.en;

    randomCategoryBadge.textContent = catName;
    randomText.textContent = text;
    randomDisplay.style.display = 'block';
    randomDisplay.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ========== COPY TO CLIPBOARD ==========
  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(function() {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(textarea);
  }

  // ========== OPEN IN WRITER ==========
  function openInWriter(text) {
    localStorage.setItem('oros_prompter_to_writer', text);
    window.location.href = 'editor.html';
  }

  // ========== SETTINGS VISIBILITY ==========
  function applySettingsVisibility() {
    var hideRandom = localStorage.getItem(STORAGE_HIDE_RANDOM) === 'true';
    var hideFilter = localStorage.getItem(STORAGE_HIDE_FILTER) === 'true';
    var hideFavToggle = localStorage.getItem(STORAGE_HIDE_FAV_TOGGLE) === 'true';

    var hero = document.querySelector('.prompter-hero');
    if (hideRandom && hero) {
      var rBtn = hero.querySelector('.random-prompt-btn');
      if (rBtn) rBtn.style.display = 'none';
    } else {
      var rBtn2 = hero && hero.querySelector('.random-prompt-btn');
      if (rBtn2) rBtn2.style.display = '';
    }

    var controls = document.querySelector('.prompter-controls');
    if (controls) controls.style.display = hideFilter ? 'none' : '';

    if (hideFavToggle && favToggle) favToggle.style.display = 'none';
    else if (favToggle) favToggle.style.display = '';
  }

  // ========== SETTINGS TOGGLES ==========
  function setupSettingsToggles() {
    var hideRandomToggle = document.getElementById('toggle-hide-random-btn');
    if (hideRandomToggle) {
      hideRandomToggle.checked = localStorage.getItem(STORAGE_HIDE_RANDOM) === 'true';
      hideRandomToggle.addEventListener('change', function() {
        localStorage.setItem(STORAGE_HIDE_RANDOM, this.checked ? 'true' : 'false');
        applySettingsVisibility();
      });
    }

    var hideFilterToggle = document.getElementById('toggle-hide-filter-bar');
    if (hideFilterToggle) {
      hideFilterToggle.checked = localStorage.getItem(STORAGE_HIDE_FILTER) === 'true';
      hideFilterToggle.addEventListener('change', function() {
        localStorage.setItem(STORAGE_HIDE_FILTER, this.checked ? 'true' : 'false');
        applySettingsVisibility();
      });
    }

    var hideFavToggleSetting = document.getElementById('toggle-hide-fav-toggle');
    if (hideFavToggleSetting) {
      hideFavToggleSetting.checked = localStorage.getItem(STORAGE_HIDE_FAV_TOGGLE) === 'true';
      hideFavToggleSetting.addEventListener('change', function() {
        localStorage.setItem(STORAGE_HIDE_FAV_TOGGLE, this.checked ? 'true' : 'false');
        applySettingsVisibility();
      });
    }
  }

  // ========== KEYBOARD SHORTCUTS ==========
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      showRandomPrompt();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      favoritesOnly = !favoritesOnly;
      if (favToggle) favToggle.classList.toggle('active', favoritesOnly);
      renderPrompts();
    } else if (e.key === 'Escape') {
      if (randomDisplay && randomDisplay.style.display !== 'none') {
        randomDisplay.style.display = 'none';
        currentRandomPrompt = null;
      }
    }
  });

  // ========== EVENT LISTENERS ==========
  if (randomBtn) randomBtn.addEventListener('click', showRandomPrompt);

  if (btnReroll) btnReroll.addEventListener('click', showRandomPrompt);

  if (btnRandomCopy) btnRandomCopy.addEventListener('click', function() {
    if (!currentRandomPrompt) return;
    var lang = getLang();
    var text = currentRandomPrompt.text[lang] || currentRandomPrompt.text.en;
    copyToClipboard(text);
    showToast(getTrans('toast_copied') || 'Copied!');
  });

  if (btnRandomClose) btnRandomClose.addEventListener('click', function() {
    randomDisplay.style.display = 'none';
    currentRandomPrompt = null;
  });

  if (btnOpenInWriter) btnOpenInWriter.addEventListener('click', function() {
    if (!currentRandomPrompt) return;
    var lang = getLang();
    var text = currentRandomPrompt.text[lang] || currentRandomPrompt.text.en;
    openInWriter(text);
  });

  if (searchInput) {
    searchInput.addEventListener('input', function() {
      currentSearch = this.value;
      renderPrompts();
    });
  }

  if (favToggle) {
    favToggle.addEventListener('click', function() {
      favoritesOnly = !favoritesOnly;
      favToggle.classList.toggle('active', favoritesOnly);
      var icon = favToggle.querySelector('i');
      if (icon) icon.className = favoritesOnly ? 'fa fa-star' : 'fa fa-star-o';
      renderPrompts();
    });
  }

  // ========== LANGUAGE CHANGE ==========
  window.addEventListener('oros-language-changed', function() {
    renderFilterChips();
    renderPrompts();
    if (currentRandomPrompt) displayRandomPrompt(currentRandomPrompt);
  });

  // ========== INITIALIZE ==========
  loadPrompts();
  setupSettingsToggles();
  applySettingsVisibility();

})();