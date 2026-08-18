// ============================================
// orOS Prompter — Creative Writing Prompts
// 100 prompts · 12 categories · Bilingual
// ============================================

(function() {
  'use strict';

  var STORAGE_KEY = 'oros_prompter_state';
  var LANG_KEY = 'oros-language';

  var prompts = [];
  var filteredPrompts = [];
  var activeCategory = 'all';
  var activePrompt = null;
  var state = {
    completed: [],
    favorites: [],
    currentWriting: ''
  };

  // ========== DOM ==========
  var categoryNav = document.getElementById('prompter-categories');
  var promptGrid = document.getElementById('prompter-grid');
  var promptDetail = document.getElementById('prompter-detail');
  var searchInput = document.getElementById('prompter-search');
  var writingArea = document.getElementById('prompter-writing');
  var wordCounter = document.getElementById('prompter-word-count');

  // ========== HELPERS ==========
  function getCurrentLang() {
    return localStorage.getItem(LANG_KEY) || 'en';
  }

  function getTrans(key) {
    var lang = getCurrentLang();
    var t = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[lang]) || {};
    return t[key] || key;
  }

  function showToast(msg) {
    var toast = document.getElementById('zen-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'zen-toast';
      toast.className = 'zentool-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = '';
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function() {
      toast.classList.remove('visible');
    }, 3000);
  }

  // ========== LOAD PROMPTS ==========
  function loadPrompts() {
    var lang = getCurrentLang();
    // Greek prompts for Greek UI, English for everything else
    var fileLang = lang === 'el' ? 'el' : 'en';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'assets/data/prompts-' + fileLang + '.json', true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          prompts = JSON.parse(xhr.responseText);
          loadState();
          renderCategories();
          renderPrompts();
        } catch(e) {
          promptGrid.innerHTML = '<div class="empty-state">Failed to load prompts.</div>';
        }
      }
    };
    xhr.onerror = function() {
      promptGrid.innerHTML = '<div class="empty-state">Failed to load prompts.</div>';
    };
    xhr.send();
  }

  // ========== STATE ==========
  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) {
        state.completed = saved.completed || [];
        state.favorites = saved.favorites || [];
        state.currentWriting = saved.currentWriting || '';
      }
    } catch(e) {}
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ========== CATEGORIES ==========
  var CATEGORIES = [
    { id: 'all',               icon: 'fa-th',              en: 'All',               el: 'Όλα' },
    { id: 'micro-fiction',     icon: 'fa-bolt',            en: 'Micro-Fiction',     el: 'Μικροδιήγημα' },
    { id: 'flash-fiction',     icon: 'fa-fire',            en: 'Flash Fiction',     el: 'Σύντομο Διήγημα' },
    { id: 'haiku',             icon: 'fa-leaf',            en: 'Haiku',             el: 'Χαϊκού' },
    { id: 'free-verse',        icon: 'fa-feather',         en: 'Free Verse',        el: 'Ελεύθερος Στίχος' },
    { id: 'metered-poetry',    icon: 'fa-music',           en: 'Metered Poetry',    el: 'Έμμετρο Ποίημα' },
    { id: 'song-lyrics',       icon: 'fa-headphones',      en: 'Song Lyrics',       el: 'Τραγούδι' },
    { id: 'aphorism',          icon: 'fa-quote-right',     en: 'Aphorism',          el: 'Γνωμικό' },
    { id: 'theater',           icon: 'fa-theater-masks',   en: 'Theater',           el: 'Θεατρικό' },
    { id: 'novel-excerpt',     icon: 'fa-book',            en: 'Novel Excerpt',     el: 'Μυθιστόρημα' },
    { id: 'monologue',         icon: 'fa-comment',         en: 'Monologue',         el: 'Μονόλογος' },
    { id: 'letter',            icon: 'fa-envelope',        en: 'Letter',            el: 'Επιστολή' }
  ];

  function renderCategories() {
    categoryNav.innerHTML = '';
    var lang = getCurrentLang();

    for (var i = 0; i < CATEGORIES.length; i++) {
      (function(cat) {
        var btn = document.createElement('button');
        btn.className = 'cat-btn' + (activeCategory === cat.id ? ' active' : '');
        btn.dataset.category = cat.id;
        btn.innerHTML = '<i class="fa ' + cat.icon + '"></i> ' +
          '<span>' + (lang === 'el' ? cat.el : cat.en) + '</span>';

        var count = cat.id === 'all'
          ? prompts.length
          : prompts.filter(function(p) { return p.category === cat.id; }).length;

        var badge = document.createElement('span');
        badge.className = 'cat-count';
        badge.textContent = count;
        btn.appendChild(badge);

        btn.addEventListener('click', function() {
          activeCategory = cat.id;
          renderCategories();
          renderPrompts();
        });

        categoryNav.appendChild(btn);
      })(CATEGORIES[i]);
    }
  }

  // ========== RENDER PROMPTS ==========
  function renderPrompts() {
    var searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    filteredPrompts = prompts.filter(function(p) {
      if (activeCategory !== 'all' && p.category !== activeCategory) return false;
      if (searchQuery) {
        return p.title.toLowerCase().indexOf(searchQuery) !== -1 ||
               p.prompt.toLowerCase().indexOf(searchQuery) !== -1;
      }
      return true;
    });

    promptGrid.innerHTML = '';

    if (filteredPrompts.length === 0) {
      promptGrid.innerHTML = '<div class="empty-state"><i class="fa fa-search"></i><p>No prompts found</p></div>';
      return;
    }

    for (var i = 0; i < filteredPrompts.length; i++) {
      (function(prompt) {
        var card = document.createElement('div');
        card.className = 'prompt-card';
        if (state.completed.indexOf(prompt.id) !== -1) card.classList.add('completed');
        if (state.favorites.indexOf(prompt.id) !== -1) card.classList.add('favorite');

        var catInfo = CATEGORIES.find(function(c) { return c.id === prompt.category; });
        var catLabel = catInfo ? (getCurrentLang() === 'el' ? catInfo.el : catInfo.en) : prompt.category;

        card.innerHTML =
          '<div class="prompt-card-header">' +
            '<span class="prompt-cat-badge">' + catLabel + '</span>' +
            '<button class="prompt-fav-btn" title="Favorite"><i class="fa fa-star' +
              (state.favorites.indexOf(prompt.id) !== -1 ? '' : '-o') + '"></i></button>' +
          '</div>' +
          '<h3 class="prompt-card-title">' + escapeHtml(prompt.title) + '</h3>' +
          '<p class="prompt-card-excerpt">' + escapeHtml(prompt.prompt.substring(0, 100)) + '...</p>' +
          '<div class="prompt-card-footer">' +
            '<span class="prompt-number">#' + prompt.id + '</span>' +
            (state.completed.indexOf(prompt.id) !== -1
              ? '<span class="prompt-done"><i class="fa fa-check"></i></span>'
              : '') +
          '</div>';

        card.addEventListener('click', function(e) {
          if (e.target.closest('.prompt-fav-btn')) {
            toggleFavorite(prompt.id);
            renderPrompts();
            return;
          }
          openPrompt(prompt);
        });

        promptGrid.appendChild(card);
      })(filteredPrompts[i]);
    }
  }

  // ========== PROMPT DETAIL ==========
  function openPrompt(prompt) {
    activePrompt = prompt;
    var lang = getCurrentLang();

    var catInfo = CATEGORIES.find(function(c) { return c.id === prompt.category; });
    var catLabel = catInfo ? (lang === 'el' ? catInfo.el : catInfo.en) : prompt.category;

    promptDetail.innerHTML =
      '<div class="prompt-detail-header">' +
        '<button class="mini-btn" id="btn-prompt-back" title="Back"><i class="fa fa-arrow-left"></i></button>' +
        '<span class="prompt-cat-badge">' + catLabel + '</span>' +
        '<button class="mini-btn" id="btn-prompt-fav" title="Favorite"><i class="fa fa-star' +
          (state.favorites.indexOf(prompt.id) !== -1 ? '' : '-o') + '"></i></button>' +
      '</div>' +
      '<h2 class="prompt-detail-title">' + escapeHtml(prompt.title) + '</h2>' +
      '<div class="prompt-detail-body">' +
        '<div class="prompt-section">' +
          '<h4>' + (lang === 'el' ? 'Θέμα' : 'Prompt') + '</h4>' +
          '<p>' + escapeHtml(prompt.prompt) + '</p>' +
        '</div>' +
        (prompt.constraints ?
          '<div class="prompt-section">' +
            '<h4>' + (lang === 'el' ? 'Περιορισμοί' : 'Constraints') + '</h4>' +
            '<p>' + escapeHtml(prompt.constraints) + '</p>' +
          '</div>' : '') +
        (prompt.technique ?
          '<div class="prompt-section technique-box">' +
            '<h4>' + (lang === 'el' ? 'Τεχνική' : 'Technique') + '</h4>' +
            '<p>' + escapeHtml(prompt.technique) + '</p>' +
          '</div>' : '') +
      '</div>';

    promptDetail.style.display = 'flex';
    promptGrid.style.display = 'none';

    // Writing area
    writingArea.style.display = 'flex';
    if (writingArea.querySelector('textarea')) {
      var ta = writingArea.querySelector('textarea');
      ta.value = state.currentWriting || '';
      updateWordCount();
    }

    // Mark as in-progress
    if (state.completed.indexOf(prompt.id) === -1 && !state.currentWriting) {
      // No writing saved for this prompt yet
    }

    // Wire up buttons
    document.getElementById('btn-prompt-back').addEventListener('click', closePrompt);
    document.getElementById('btn-prompt-fav').addEventListener('click', function() {
      toggleFavorite(prompt.id);
      openPrompt(prompt);
    });
  }

  function closePrompt() {
    activePrompt = null;
    promptDetail.style.display = 'none';
    promptGrid.style.display = '';
    writingArea.style.display = 'none';
    // Don't clear currentWriting — preserve across navigation
  }

  // ========== WRITING AREA ==========
  function setupWritingArea() {
    var ta = writingArea.querySelector('textarea');
    if (!ta) return;

    ta.addEventListener('input', function() {
      state.currentWriting = ta.value;
      saveState();
      updateWordCount();
    });
  }

  function updateWordCount() {
    var ta = writingArea.querySelector('textarea');
    if (!ta || !wordCounter) return;
    var words = ta.value.trim().split(/\s+/).filter(Boolean).length;
    wordCounter.textContent = words + ' ' + (getCurrentLang() === 'el' ? 'λέξεις' : 'words');
  }

  function markComplete() {
    if (!activePrompt) return;
    if (state.completed.indexOf(activePrompt.id) === -1) {
      state.completed.push(activePrompt.id);
      saveState();
      showToast(getCurrentLang() === 'el' ? 'Ολοκληρώθηκε!' : 'Marked complete!');
      renderPrompts();
    }
  }

  function toggleFavorite(id) {
    var idx = state.favorites.indexOf(id);
    if (idx === -1) {
      state.favorites.push(id);
    } else {
      state.favorites.splice(idx, 1);
    }
    saveState();
  }

  // ========== EXPORT WRITING ==========
  function exportWriting() {
    var ta = writingArea.querySelector('textarea');
    if (!ta || !ta.value) return;
    var title = activePrompt ? activePrompt.title : 'Writing';
    var blob = new Blob([ta.value], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = title.replace(/[^\w\u0370-\u03FF\s-]/g, '_').trim() + '_' +
      new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(getTrans('toast_downloaded'));
  }

  // ========== RANDOM PROMPT ==========
  function randomPrompt() {
    var pool = filteredPrompts.length > 0 ? filteredPrompts : prompts;
    var random = pool[Math.floor(Math.random() * pool.length)];
    openPrompt(random);
  }

  // ========== UTILS ==========
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== INIT ==========
  function init() {
    loadPrompts();
    setupWritingArea();

    if (searchInput) {
      searchInput.addEventListener('input', renderPrompts);
    }

    var btnRandom = document.getElementById('btn-random-prompt');
    if (btnRandom) btnRandom.addEventListener('click', randomPrompt);

    var btnComplete = document.getElementById('btn-mark-complete');
    if (btnComplete) btnComplete.addEventListener('click', markComplete);

    var btnExportWriting = document.getElementById('btn-export-writing');
    if (btnExportWriting) btnExportWriting.addEventListener('click', exportWriting);

    // Reload prompts when language changes
    window.addEventListener('oros-language-changed', function() {
      loadPrompts();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();