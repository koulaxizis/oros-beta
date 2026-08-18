// ============================================
// orOS Prompter
// Creative writing prompt generator
// ============================================

(function() {
  'use strict';

  // --- Config ---
  var DATA_PATH = 'assets/data/prompts-en.json';
  var DATA_PATH_EL = 'assets/data/prompts-el.json';
  var STORAGE_KEY = 'prompter_progress';

  // --- State ---
  var categories = [];
  var currentIndex = 0;
  var currentCategory = 'all';
  var progress = {}; // { categoryId: [completed indices] }
  var currentPromptText = '';

  // --- DOM Elements ---
  var searchInput = document.getElementById('prompter-search');
  var btnRandom = document.getElementById('btn-random-prompt');
  var btnMarkComplete = document.getElementById('btn-mark-complete');
  var btnExport = document.getElementById('btn-export-writing');
  var categoriesContainer = document.getElementById('prompter-categories');
  var grid = document.getElementById('prompter-grid');
  var detail = document.getElementById('prompter-detail');
  var writingArea = document.getElementById('prompter-writing');
  var writingTextarea = writingArea.querySelector('textarea');
  var wordCountDisplay = document.getElementById('prompter-word-count');

  // --- Init ---
  function init() {
    loadProgress();
    detectLanguage();
    bindEvents();
  }

  function detectLanguage() {
    var lang = localStorage.getItem('oros-language') || 'en';
    var url = (lang === 'el') ? DATA_PATH_EL : DATA_PATH;

    fetchJSON(url, function(data) {
      categories = data.categories || [];
      renderCategories();
      renderGrid(categories.map(function(cat) {
        return {
          id: cat.id,
          name: cat.name,
          prompts: cat.prompts
        };
      }).reduce(function(acc, cat) {
        cat.prompts.forEach(function(prompt, idx) {
          acc.push({
            categoryId: cat.id,
            categoryName: cat.name,
            number: acc.length + 1,
            text: prompt
          });
        });
        return acc;
      }, []));
    });
  }

  function fetchJSON(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try { callback(JSON.parse(xhr.responseText)); }
        catch(e) { callback({}); }
      } else {
        callback({});
      }
    };
    xhr.onerror = function() { callback({}); };
    xhr.send();
  }

  function loadProgress() {
    try {
      progress = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch(e) {
      progress = {};
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  // --- Render Categories ---
  function renderCategories() {
    categoriesContainer.innerHTML = '';

    var allTab = document.createElement('button');
    allTab.className = 'category-tab' + (currentCategory === 'all' ? ' active' : '');
    allTab.textContent = 'All';
    allTab.dataset.category = 'all';
    allTab.addEventListener('click', function() {
      setCurrentCategory('all');
    });
    categoriesContainer.appendChild(allTab);

    categories.forEach(function(cat) {
      var tab = document.createElement('button');
      tab.className = 'category-tab' + (currentCategory === cat.id ? ' active' : '');
      tab.textContent = cat.name;
      tab.dataset.category = cat.id;
      tab.addEventListener('click', function() {
        setCurrentCategory(cat.id);
      });
      categoriesContainer.appendChild(tab);
    });
  }

  function setCurrentCategory(categoryId) {
    currentCategory = categoryId;
    document.querySelectorAll('.category-tab').forEach(function(tab) {
      tab.classList.toggle('active', tab.dataset.category === categoryId);
    });
    filterAndRenderGrid();
  }

  // --- Render Grid ---
  function renderGrid(prompts) {
    grid.innerHTML = '';

    if (prompts.length === 0) {
      grid.innerHTML = '<div class="prompter-empty"><i class="fa fa-search"></i><p>No prompts found</p></div>';
      return;
    }

    prompts.forEach(function(item, idx) {
      var card = document.createElement('div');
      card.className = 'prompt-card' + (isCompleted(item.categoryId, idx) ? ' completed' : '');
      card.dataset.index = idx;
      card.dataset.categoryId = item.categoryId;

      card.innerHTML =
        '<div class="prompt-card-header">' +
          '<span class="prompt-number">#' + item.number + '</span>' +
          '<span class="prompt-status' + (isCompleted(item.categoryId, idx) ? ' complete' : '') + '">' +
            (isCompleted(item.categoryId, idx) ? 'Complete' : 'Pending') +
          '</span>' +
        '</div>' +
        '<div class="prompt-card-body">' + truncateText(item.text, 120) + '</div>' +
        '<div class="prompt-card-actions">' +
          '<button class="mini-btn btn-view"><i class="fa fa-eye"></i> View</button>' +
          '<button class="mini-btn btn-complete">' + (isCompleted(item.categoryId, idx) ? '✓ Done' : '○ Mark') + '</button>' +
        '</div>';

      card.addEventListener('click', function(e) {
        if (e.target.closest('.btn-view')) {
          showDetail(idx, item);
        } else if (e.target.closest('.btn-complete')) {
          toggleComplete(item.categoryId, idx);
        }
      });

      grid.appendChild(card);
    });
  }

  function truncateText(text, maxLen) {
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  }

  function isCompleted(categoryId, globalIndex) {
    var catProgress = progress[categoryId] || [];
    return catProgress.indexOf(globalIndex) !== -1;
  }

  function toggleComplete(categoryId, globalIndex) {
    if (!progress[categoryId]) progress[categoryId] = [];
    var idx = progress[categoryId].indexOf(globalIndex);
    if (idx !== -1) {
      progress[categoryId].splice(idx, 1);
    } else {
      progress[categoryId].push(globalIndex);
    }
    saveProgress();
    filterAndRenderGrid();
  }

  // --- Filter & Render ---
  function filterAndRenderGrid() {
    var search = (searchInput.value || '').toLowerCase();
    var prompts = [];

    if (currentCategory === 'all') {
      categories.forEach(function(cat) {
        cat.prompts.forEach(function(prompt, idx) {
          prompts.push({
            categoryId: cat.id,
            categoryName: cat.name,
            number: prompts.length + 1,
            text: prompt
          });
        });
      });
    } else {
      var category = categories.find(function(c) { return c.id === currentCategory; });
      if (category) {
        category.prompts.forEach(function(prompt, idx) {
          prompts.push({
            categoryId: category.id,
            categoryName: category.name,
            number: prompts.length + 1,
            text: prompt
          });
        });
      }
    }

    if (search) {
      prompts = prompts.filter(function(p) {
        return p.text.toLowerCase().indexOf(search) !== -1 ||
               p.categoryName.toLowerCase().indexOf(search) !== -1;
      });
    }

    renderGrid(prompts);
  }

  // --- Show Detail ---
  function showDetail(index, item) {
    currentIndex = index;
    currentPromptText = item.text;

    var html =
      '<div class="detail-header">' +
        '<div>' +
          '<span class="detail-category">' + item.categoryName + '</span>' +
          '<span class="detail-number">#' + item.number + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="detail-prompt">' + item.text + '</div>' +
      '<div class="detail-instructions">' +
        '<p>• Click "Write" to start composing your piece</p>' +
        '<p>• Your writing is saved automatically as you type</p>' +
        '<p>• Use "Mark Complete" when you finish</p>' +
      '</div>';

    detail.innerHTML = html;
    detail.classList.add('show');

    // Add write button
    var writeBtn = document.createElement('button');
    writeBtn.className = 'action-btn';
    writeBtn.innerHTML = '<i class="fa fa-pencil"></i> Write';
    writeBtn.style.marginTop = '16px';
    writeBtn.addEventListener('click', function() {
      startWriting();
    });
    detail.querySelector('.detail-instructions').appendChild(writeBtn);

    // Add mark complete button
    var markBtn = document.createElement('button');
    markBtn.className = 'action-btn';
    markBtn.innerHTML = '<i class="fa fa-check"></i> Mark Complete';
    markBtn.style.marginTop = '12px';
    markBtn.style.marginLeft = '8px';
    markBtn.addEventListener('click', function() {
      toggleComplete(item.categoryId, currentIndex);
      detail.querySelector('.btn-complete').click();
    });
    detail.querySelector('.detail-instructions').appendChild(markBtn);
  }

  function startWriting() {
    writingArea.classList.add('active');
    var saved = localStorage.getItem('prompter_writing');
    writingTextarea.value = saved || '';
    writingTextarea.focus();
    updateWordCount();

    // Update word count on input
    writingTextarea.addEventListener('input', function() {
      localStorage.setItem('prompter_writing', this.value);
      updateWordCount();
    });
  }

  function updateWordCount() {
    var text = writingTextarea.value.trim();
    var count = text ? text.split(/\s+/).length : 0;
    wordCountDisplay.textContent = count + ' word' + (count !== 1 ? 's' : '');
  }

  function hideWriting() {
    writingArea.classList.remove('active');
  }

  // --- Random Prompt ---
  function showRandomPrompt() {
    var allPrompts = [];
    categories.forEach(function(cat) {
      cat.prompts.forEach(function(prompt) {
        allPrompts.push({
          categoryId: cat.id,
          categoryName: cat.name,
          text: prompt
        });
      });
    });

    if (allPrompts.length === 0) return;

    var randomIndex = Math.floor(Math.random() * allPrompts.length);
    var item = allPrompts[randomIndex];
    var promptNumber = 0;

    categories.forEach(function(cat) {
      if (cat.id === item.categoryId) {
        promptNumber = cat.prompts.indexOf(item.text) + 1;
      }
    });

    currentIndex = promptNumber - 1;
    currentPromptText = item.text;

    var html =
      '<div class="detail-header">' +
        '<div>' +
          '<span class="detail-category">' + item.categoryName + '</span>' +
          '<span class="detail-number">#RND</span>' +
        '</div>' +
      '</div>' +
      '<div class="detail-prompt">' + item.text + '</div>' +
      '<div class="detail-instructions">' +
        '<p>• Click "Write" to start composing your piece</p>' +
        '<p>• Your writing is saved automatically as you type</p>' +
        '<p>• Use "Mark Complete" when you finish</p>' +
      '</div>';

    detail.innerHTML = html;
    detail.classList.add('show');

    var writeBtn = document.createElement('button');
    writeBtn.className = 'action-btn';
    writeBtn.innerHTML = '<i class="fa fa-pencil"></i> Write';
    writeBtn.style.marginTop = '16px';
    writeBtn.addEventListener('click', startWriting);
    detail.querySelector('.detail-instructions').appendChild(writeBtn);

    var markBtn = document.createElement('button');
    markBtn.className = 'action-btn';
    markBtn.innerHTML = '<i class="fa fa-check"></i> Mark Complete';
    markBtn.style.marginTop = '12px';
    markBtn.style.marginLeft = '8px';
    markBtn.addEventListener('click', function() {
      toggleComplete(item.categoryId, currentIndex);
    });
    detail.querySelector('.detail-instructions').appendChild(markBtn);
  }

  // --- Export Writing ---
  function exportWriting() {
    var text = writingTextarea.value;
    if (!text.trim()) {
      alert('Nothing to export yet.');
      return;
    }

    var filename = 'prompter-' + new Date().toISOString().split('T')[0] + '.txt';
    var blob = new Blob([text], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Events ---
  function bindEvents() {
    searchInput.addEventListener('input', filterAndRenderGrid);
    btnRandom.addEventListener('click', showRandomPrompt);
    btnExport.addEventListener('click', exportWriting);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (writingArea.classList.contains('active')) {
          hideWriting();
        } else if (detail.classList.contains('show')) {
          detail.classList.remove('show');
        }
      }
    });
  }

  // --- Go ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();