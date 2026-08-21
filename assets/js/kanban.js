/* ============================================
   orOS Kanban — Complete JavaScript (v2.1 — FIXED)
   Single file, no splits needed
   FIX: Translations now use window.OROS_TRANSLATIONS (no fetch)
   ============================================ */

(function(global) {
  'use strict';

  // ===== GLOBAL STATE =====
  var state = {
    boards: [],
    currentBoardId: null,
    activeFilters: [],
    editingCardId: null,
    cardSourceColId: null,
    draggedItem: null,
    showArchived: false,
    undoStack: [],
    undoStackPos: -1,
    autoSaveEnabled: true
  };

  var translations = {};
  var currentLang = 'en';

  // ===== UTILITIES =====
  function safeAddListener(id, eventType, handler) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener(eventType, handler);
    } else {
      console.warn('kanban.js: Element "' + id + '" not found in DOM — skipping ' + eventType + ' listener.');
    }
  }

  function showToast(message) {
    var toast = document.querySelector('.zentool-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'zentool-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(function() { toast.classList.remove('visible'); }, 2500);
  }

     function getTrans(key) {
    var lang = localStorage.getItem('oros-language') || 'en';
    var t = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[lang]) || {};
    if (t[key]) return t[key];
    var tEn = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS.en) || {};
    return tEn[key] || key;
  }

  function setLanguage(lang) {
    localStorage.setItem('oros-language', lang);
    currentLang = lang;
    refreshTranslations();
    window.dispatchEvent(new CustomEvent('oros-language-changed', { detail: { lang: lang } }));
  }

  function refreshTranslations() {
    var elements = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var key = el.getAttribute('data-i18n');
      var translated = getTrans(key);
      if (translated && translated !== key) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          if (el.placeholder !== '') el.placeholder = translated;
        } else if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
          el.textContent = translated;
        }
      }
    }
    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < placeholders.length; j++) {
      var phEl = placeholders[j];
      var phKey = phEl.getAttribute('data-i18n-placeholder');
      var phValue = getTrans(phKey);
      if (phValue && phValue !== phKey) {
        phEl.setAttribute('placeholder', phValue);
      }
    }
  }

  function loadTranslations() {
    currentLang = localStorage.getItem('oros-language') || 'en';
    refreshTranslations();
    window.addEventListener('oros-language-changed', function() {
      currentLang = localStorage.getItem('oros-language') || 'en';
      refreshTranslations();
    });
    window.addEventListener('load', function() {
      refreshTranslations();
    });
  }
    // Also update placeholder attributes
    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    for (var j = 0; j < placeholders.length; j++) {
      var phEl = placeholders[j];
      var phKey = phEl.getAttribute('data-i18n-placeholder');
      var phValue = getTrans(phKey);
      if (phValue && phValue !== phKey) {
        phEl.setAttribute('placeholder', phValue);
      }
    }
  }

    function loadTranslations() {
    currentLang = localStorage.getItem('oros-language') || 'en';
    refreshTranslations();
    // Re-refresh after main.js has loaded (OROS_TRANSLATIONS may not be ready yet)
    window.addEventListener('load', function() {
      currentLang = localStorage.getItem('oros-language') || 'en';
      refreshTranslations();
    });
  }
      
      // Ensure we have fallback English
      if (!translations.en) {
        translations.en = {};
      }
      
      setLanguage(stored);
	      window.addEventListener('oros-language-changed', function() {
      currentLang = localStorage.getItem('oros-language') || 'en';
      refreshTranslations();
    });
      console.log('Kanban: Using OROS_TRANSLATIONS from main.js');
    } else {
      // Fallback: minimal English translations if OROS_TRANSLATIONS not available
      console.warn('Kanban: window.OROS_TRANSLATIONS not found, using fallback');
      translations = {
        en: {
          kanban_new_board: 'New Board',
          kanban_add_board: 'Board created',
          kanban_confirm_delete_board: 'Delete this board? This cannot be undone.',
          kanban_add_card: 'Add Card',
          kanban_add_column: 'Add Column',
          kanban_column_name: 'Column name:',
          kanban_imported: 'Board imported',
          tooltip_save: 'Save (Ctrl+S)',
          tooltip_open: 'Open file',
          tooltip_clear: 'Clear all content',
          toolbar_bold: 'Bold',
          toolbar_italic: 'Italic',
          toolbar_underline: 'Underline',
          toolbar_h1: 'Heading 1',
          toolbar_h2: 'Heading 2',
          toolbar_h3: 'Heading 3',
          toolbar_bullet_list: 'Bullet list',
          toolbar_number_list: 'Numbered list',
          toolbar_align_left: 'Align left',
          toolbar_align_center: 'Align center',
          toolbar_align_right: 'Align right',
          toolbar_align_justify: 'Justify',
          tooltip_goal: 'Writing goal tracker (Ctrl+G)',
          tooltip_outline: 'Document outline',
          tooltip_metadata: 'Document metadata',
          tooltip_find: 'Find and replace (Ctrl+F)',
          tooltip_word_freq: 'Word frequency',
          tooltip_lorem_ipsum: 'Insert sample text',
          tooltip_export: 'Export document',
          export_md: 'Markdown (.md)',
          export_txt: 'Plain Text (.txt)',
          export_rtf: 'Rich Text (.rtf)',
          export_doc: 'Microsoft Word (.doc)',
          export_pdf: 'PDF (.pdf)'
        }
      };
      var stored = localStorage.getItem('oros-language') || 'en';
      setLanguage(stored);
    }
  }

  function generateId() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  function deepClone(obj) {
    try { return JSON.parse(JSON.stringify(obj)); }
    catch (e) { return obj; }
  }

  function formatDate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var now = new Date();
    var diff = now - d;
    var mins = Math.floor(diff / 60000);
    var hours = Math.floor(mins / 60);
    var days = Math.floor(hours / 24);
    if (days > 0) return d.toLocaleDateString();
    if (hours > 0) return hours + 'h ago';
    if (mins > 0) return mins + 'm ago';
    return 'just Now';
  }

  function sanitizeText(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '').trim();
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeCsv(str) {
    if (typeof str !== 'string') return '';
    str = str.replace(/"/g, '""');
    if (str.indexOf(',') !== -1 || str.indexOf('\n') !== -1) {
      return '"' + str + '"';
    }
    return str;
  }

  function parseMarkdown(text) {
    if (!text) return '';
    var html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^- (.+)$/gm, '<ul><li>$1</li></ul>');
    html = html.replace(/<\/ul><ul>/g, '');
    return html;
  }

  function pushUndo() {
    var snapshot = deepClone(state.currentBoardId ? getBoard(state.currentBoardId) : null);
    state.undoStack = state.undoStack.slice(0, state.undoStackPos + 1);
    state.undoStack.push(snapshot);
    state.undoStackPos++;
    if (state.undoStack.length > 20) {
      state.undoStack.shift();
      state.undoStackPos--;
    }
  }

  function undo() {
    if (state.undoStackPos > 0) {
      state.undoStackPos--;
      var prev = state.undoStack[state.undoStackPos];
      if (prev && state.currentBoardId) {
        var board = getBoard(state.currentBoardId);
        if (board) Object.assign(board, prev);
        renderBoard();
        showToast('Undo');
      }
    }
  }

  // ===== STORAGE =====
  function getStorageKey() { return 'oros_kanban_data_v2'; }

  function saveToStorage() {
    if (!state.autoSaveEnabled) return;
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify({
        boards: state.boards,
        currentBoardId: state.currentBoardId
      }));
    } catch (e) {
      console.error('Kanban: Storage save failed:', e);
    }
  }

  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(getStorageKey());
      if (raw) {
        var data = JSON.parse(raw);
        if (data.boards && Array.isArray(data.boards)) {
          state.boards = data.boards;
          state.currentBoardId = data.currentBoardId;
        }
      }
    } catch (e) {
      console.error('Kanban: Storage load failed:', e);
    }
  }

  // ===== BOARD ACCESSORS =====
  function getBoard(id) {
    return state.boards.find(function(b) { return b.id === id; });
  }

  function getCurrentBoard() {
    return getBoard(state.currentBoardId);
  }

  // ===== THEME =====
  function setupTheme() {
    var savedTheme = localStorage.getItem('oros-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.body.classList.toggle('light-mode', savedTheme === 'light');
    document.body.classList.toggle('dark-mode', savedTheme === 'dark');
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.body.classList.toggle('light-mode', next === 'light');
    document.body.classList.toggle('dark-mode', next === 'dark');
    localStorage.setItem('oros-theme', next);
  }

  // ===== INITIALIZATION =====
  function init() {
    loadFromStorage();
    loadTranslations();
    setupTheme();

    if (state.boards.length === 0) {
      createNewBoard();
    }

    renderBoardSelector();
    renderBoard();
    setupEventListeners();
    setupKeyboardShortcuts();
    setupLabelModalEvents();
    setupOverlayEvents();
    setupAutoSaveToggle();
    setupKanbanSettingsToggles();

    setInterval(saveToStorage, 30000);
    console.log('orOS Kanban initialized successfully');
  }

  // ===== BOARD MANAGEMENT =====
  function createNewBoard(name) {
    var boardName = name || getTrans('kanban_new_board') || 'New Board';
    var newBoard = {
      id: generateId(),
      name: boardName,
      columns: [
        { id: generateId(), title: 'To Do', cards: [] },
        { id: generateId(), title: 'In Progress', cards: [] },
        { id: generateId(), title: 'Done', cards: [] }
      ],
      labels: [
        { id: generateId(), name: 'Bug', color: '#f44336' },
        { id: generateId(), name: 'Feature', color: '#4caf50' },
        { id: generateId(), name: 'Docs', color: '#2196f3' }
      ],
      createdAt: Date.now(),
      modifiedAt: Date.now()
    };
    state.boards.unshift(newBoard);
    state.currentBoardId = newBoard.id;
    pushUndo();
    saveToStorage();
    renderBoardSelector();
    renderBoard();
    showToast(getTrans('kanban_add_board') || 'Board created');
    return newBoard;
  }

  function deleteBoard(boardId) {
    if (!confirm(getTrans('kanban_confirm_delete_board') || 'Delete this board? This cannot be undone.')) return;
    var idx = state.boards.findIndex(function(b) { return b.id === boardId; });
    if (idx === -1) return;
    state.boards.splice(idx, 1);
    if (state.currentBoardId === boardId) {
      state.currentBoardId = state.boards.length > 0 ? state.boards[0].id : null;
    }
    pushUndo();
    saveToStorage();
    renderBoardSelector();
    renderBoard();
    showToast('Board deleted');
  }

  function renameBoard(boardId, newName) {
    var board = getBoard(boardId);
    if (!board) return;
    board.name = sanitizeText(newName) || 'Untitled';
    board.modifiedAt = Date.now();
    saveToStorage();
    renderBoardSelector();
  }

  function switchBoard(boardId) {
    var board = getBoard(boardId);
    if (!board) return;
    state.currentBoardId = boardId;
    saveToStorage();
    renderBoardSelector();
    renderBoard();
  }

  function moveBoard(boardId, direction) {
    var idx = state.boards.findIndex(function(b) { return b.id === boardId; });
    if (idx === -1) return;
    var newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= state.boards.length) return;
    var temp = state.boards[idx];
    state.boards[idx] = state.boards[newIdx];
    state.boards[newIdx] = temp;
    saveToStorage();
    renderBoardSelector();
  }

  // ===== BOARD SELECTOR RENDER =====
  function renderBoardSelector() {
    var container = document.querySelector('.board-list-items');
    if (!container) return;
    container.innerHTML = '';

    if (state.boards.length === 0) {
      container.innerHTML = '<div class="board-list-empty">No boards</div>';
      return;
    }

    // Update current board name in header
    var nameEl = document.getElementById('current-board-name');
    if (nameEl) {
      var cb = getCurrentBoard();
      nameEl.textContent = cb ? cb.name : 'No Board';
    }

    state.boards.forEach(function(board) {
      var item = document.createElement('div');
      item.className = 'board-list-item' + (board.id === state.currentBoardId ? ' active' : '');
      item.setAttribute('data-id', board.id);
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');

      var colCount = board.columns ? board.columns.length : 0;
      var cardCount = board.columns ? board.columns.reduce(function(sum, c) {
        return sum + (c.cards ? c.cards.length : 0);
      }, 0) : 0;

      item.innerHTML =
        '<i class="fa fa-folder-open"></i>' +
        '<span class="board-list-item-name">' + escapeHtml(board.name) + '</span>' +
        '<span class="board-list-item-count">' + colCount + '/' + cardCount + '</span>' +
        '<div class="board-list-item-controls">' +
          '<button class="board-reorder-btn" data-action="move-up" title="Move up"><i class="fa fa-arrow-up"></i></button>' +
          '<button class="board-reorder-btn" data-action="move-down" title="Move down"><i class="fa fa-arrow-down"></i></button>' +
          '<button class="board-rename-btn" data-action="rename" title="Rename"><i class="fa fa-pencil"></i></button>' +
          '<button class="board-list-item-delete" data-action="delete" title="Delete"><i class="fa fa-trash"></i></button>' +
        '</div>';

      item.addEventListener('click', function(e) {
        if (e.target.closest('.board-list-item-controls')) return;
        switchBoard(board.id);
        var dropdown = document.getElementById('board-list');
        if (dropdown) dropdown.classList.remove('visible');
      });

      var ctrlBtns = item.querySelectorAll('.board-list-item-controls button');
      for (var i = 0; i < ctrlBtns.length; i++) {
        ctrlBtns[i].addEventListener('click', function(e) {
          e.stopPropagation();
          var action = this.getAttribute('data-action');
          if (action === 'delete') deleteBoard(board.id);
          else if (action === 'rename') startBoardRename(board.id, item);
          else if (action === 'move-up') moveBoard(board.id, -1);
          else if (action === 'move-down') moveBoard(board.id, 1);
        });
      }

      container.appendChild(item);
    });
  }

  function startBoardRename(boardId, listItem) {
    var currentInput = document.querySelector('.board-rename-input');
    if (currentInput) currentInput.remove();

    var rect = listItem.getBoundingClientRect();
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'board-rename-input';
    input.value = getBoard(boardId).name;
    input.style.top = (rect.top + 4) + 'px';
    input.style.left = rect.left + 'px';
    input.style.width = (rect.width - 80) + 'px';

    document.body.appendChild(input);
    input.focus();
    input.select();

    var finish = function() {
      var newVal = input.value.trim();
      if (newVal) renameBoard(boardId, newVal);
      input.remove();
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') finish();
      if (e.key === 'Escape') input.remove();
    });
  }

  // ===== COLUMN MANAGEMENT =====
  function addColumn(title) {
    var board = getCurrentBoard();
    if (!board) return;
    board.columns.push({
      id: generateId(),
      title: sanitizeText(title) || 'New Column',
      cards: []
    });
    board.modifiedAt = Date.now();
    pushUndo();
    saveToStorage();
    renderBoard();
  }

  function deleteColumn(columnId) {
    var board = getCurrentBoard();
    if (!board) return;
    if (board.columns.length <= 1) {
      alert('Cannot delete the last column');
      return;
    }
    if (!confirm('Delete this column and all its cards?')) return;
    board.columns = board.columns.filter(function(c) { return c.id !== columnId; });
    board.modifiedAt = Date.now();
    pushUndo();
    saveToStorage();
    renderBoard();
  }

  function renameColumn(columnId, newTitle) {
    var board = getCurrentBoard();
    if (!board) return;
    var col = board.columns.find(function(c) { return c.id === columnId; });
    if (!col) return;
    col.title = sanitizeText(newTitle) || 'Untitled';
    board.modifiedAt = Date.now();
    saveToStorage();
    renderBoard();
  }

  function moveColumn(columnId, direction) {
    var board = getCurrentBoard();
    if (!board) return;
    var idx = board.columns.findIndex(function(c) { return c.id === columnId; });
    if (idx === -1) return;
    var newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= board.columns.length) return;
    var temp = board.columns[idx];
    board.columns[idx] = board.columns[newIdx];
    board.columns[newIdx] = temp;
    board.modifiedAt = Date.now();
    saveToStorage();
    renderBoard();
  }

  function startColumnEdit(colId, titleEl) {
    var rect = titleEl.getBoundingClientRect();
    var input = document.getElementById('column-title-edit');
    if (!input) {
      input = document.createElement('input');
      input.type = 'text';
      input.id = 'column-title-edit';
      input.className = 'column-title-edit';
      document.body.appendChild(input);
    }

    var board = getCurrentBoard();
    if (!board) return;
    var col = board.columns.find(function(c) { return c.id === colId; });
    if (!col) return;

    input.value = col.title;
    input.style.display = 'block';
    input.style.top = (rect.top + 2) + 'px';
    input.style.left = rect.left + 'px';
    input.style.width = (rect.width + 20) + 'px';
    input.style.height = (rect.height - 4) + 'px';

    titleEl.style.visibility = 'hidden';
    input.focus();
    input.select();

    var finish = function() {
      var newVal = input.value.trim();
      if (newVal) renameColumn(colId, newVal);
      input.style.display = 'none';
      titleEl.style.visibility = '';
    };

    input.onblur = finish;
    input.onkeydown = function(e) {
      if (e.key === 'Enter') { e.preventDefault(); finish(); }
      if (e.key === 'Escape') { input.style.display = 'none'; titleEl.style.visibility = ''; }
    };
  }

  // ===== RENDER BOARD =====
  function renderBoard() {
    var emptyState = document.getElementById('kanban-empty-state');
    var columnsContainer = document.getElementById('kanban-columns');
    if (!columnsContainer) return;

    var board = getCurrentBoard();

    if (!board || !board.columns || board.columns.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      columnsContainer.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    columnsContainer.innerHTML = '';

    // Update board name in header
    var nameEl = document.getElementById('current-board-name');
    if (nameEl) nameEl.textContent = board.name;

    board.columns.forEach(function(col, colIndex) {
      var colEl = document.createElement('div');
      colEl.className = 'kanban-column';
      colEl.setAttribute('data-col-id', col.id);
      colEl.setAttribute('data-col-index', colIndex);
      colEl.draggable = true;

      colEl.addEventListener('dragstart', handleColumnDragStart);
      colEl.addEventListener('dragend', handleColumnDragEnd);
      colEl.addEventListener('dragover', handleColumnDragOver);
      colEl.addEventListener('drop', handleColumnDrop);
      colEl.addEventListener('dragenter', handleColumnDragEnter);
      colEl.addEventListener('dragleave', handleColumnDragLeave);

      var header = document.createElement('div');
      header.className = 'column-header';
      header.innerHTML =
        '<span class="column-title" draggable="true">' + escapeHtml(col.title) + '</span>' +
        '<span class="column-card-count">' + (col.cards ? col.cards.length : 0) + '</span>' +
        '<div class="column-actions">' +
          '<button class="column-action-btn" data-action="move-left" title="Move left"><i class="fa fa-arrow-left"></i></button>' +
          '<button class="column-action-btn" data-action="move-right" title="Move right"><i class="fa fa-arrow-right"></i></button>' +
          '<button class="column-action-btn edit" data-action="edit" title="Edit"><i class="fa fa-pencil"></i></button>' +
          '<button class="column-action-btn delete" data-action="delete" title="Delete"><i class="fa fa-trash"></i></button>' +
        '</div>';

      var titleSpan = header.querySelector('.column-title');
      titleSpan.addEventListener('dblclick', function() {
        startColumnEdit(col.id, titleSpan);
      });

      var headerBtns = header.querySelectorAll('.column-action-btn');
      for (var i = 0; i < headerBtns.length; i++) {
        headerBtns[i].addEventListener('click', function(e) {
          e.stopPropagation();
          var action = this.getAttribute('data-action');
          if (action === 'delete') deleteColumn(col.id);
          else if (action === 'edit') startColumnEdit(col.id, titleSpan);
          else if (action === 'move-left') moveColumn(col.id, -1);
          else if (action === 'move-right') moveColumn(col.id, 1);
        });
      }

      colEl.appendChild(header);

      var cardsContainer = document.createElement('div');
      cardsContainer.className = 'column-cards';
      cardsContainer.setAttribute('data-col-id', col.id);

      cardsContainer.addEventListener('dragover', handleCardDragOver);
      cardsContainer.addEventListener('drop', handleCardDrop);
      cardsContainer.addEventListener('dragenter', handleCardDragEnter);
      cardsContainer.addEventListener('dragleave', handleCardDragLeave);

      if (col.cards) {
        col.cards.forEach(function(card) {
          if (card.archived && !state.showArchived) return;
          cardsContainer.appendChild(createCardElement(card, col.id));
        });
      }

      colEl.appendChild(cardsContainer);

      var addCardDiv = document.createElement('div');
      addCardDiv.className = 'column-add-card';
      addCardDiv.innerHTML = '<button class="btn-add-card"><i class="fa fa-plus"></i> ' +
        (getTrans('kanban_add_card') || 'Add Card') + '</button>';
      addCardDiv.querySelector('.btn-add-card').addEventListener('click', function() {
        openCardModal(null, col.id);
      });
      colEl.appendChild(addCardDiv);

      columnsContainer.appendChild(colEl);
    });

    var addColPlaceholder = document.createElement('div');
    addColPlaceholder.className = 'add-column-placeholder';
    addColPlaceholder.innerHTML = '<i class="fa fa-plus"></i> ' +
      (getTrans('kanban_add_column') || 'Add Column');
    addColPlaceholder.addEventListener('click', function() {
      var title = prompt(getTrans('kanban_column_name') || 'Column name:');
      if (title) addColumn(title);
    });
    columnsContainer.appendChild(addColPlaceholder);

    updateFilterDropdown();
  }

  function createCardElement(card, colId) {
    var el = document.createElement('div');
    el.className = 'kanban-card';
    if (card.color) {
      el.style.borderLeftColor = card.color;
      el.classList.add('has-color');
    }
    if (card.archived) el.classList.add('archived');
    el.setAttribute('data-card-id', card.id);
    el.setAttribute('data-col-id', colId);
    el.draggable = true;

    el.addEventListener('dragstart', handleCardDragStart);
    el.addEventListener('dragend', handleCardDragEnd);
    el.addEventListener('click', function() { openCardModal(card.id, colId); });

    var content = document.createElement('div');
    content.className = 'card-body-content';

    var title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = card.title;
    content.appendChild(title);

    if (card.priority && card.priority > 0) {
      var prioBadge = document.createElement('span');
      prioBadge.className = 'card-priority-badge p' + card.priority;
      var prioLabels = ['', 'L', 'M', 'H'];
      prioBadge.textContent = prioLabels[card.priority] || '';
      title.insertBefore(prioBadge, title.firstChild);
    }

    if (card.dueDate) {
      var dueDate = document.createElement('div');
      dueDate.className = 'card-due-date';
      var now = new Date();
      var due = new Date(card.dueDate);
      var diffDays = Math.ceil((due - now) / 86400000);
      if (diffDays < 0) dueDate.classList.add('overdue');
      else if (diffDays === 0) dueDate.classList.add('today');
      dueDate.innerHTML = '<i class="fa fa-calendar"></i> ' + due.toLocaleDateString();
      content.appendChild(dueDate);
    }

    if (card.description) {
      var descInd = document.createElement('div');
      descInd.className = 'card-description-indicator';
      descInd.innerHTML = '<i class="fa fa-align-left"></i>';
      content.appendChild(descInd);
    }

    if (card.subtasks && card.subtasks.length > 0) {
      var completed = card.subtasks.filter(function(s) { return s.completed; }).length;
      var total = card.subtasks.length;
      var pct = total > 0 ? Math.round(completed / total * 100) : 0;
      var subtaskInd = document.createElement('div');
      subtaskInd.className = 'card-subtask-indicator';
      subtaskInd.innerHTML = '<i class="fa fa-check-square-o"></i> ' + completed + '/' + total +
        '<div class="subtask-progress-bar"><div class="subtask-progress-fill" style="width:' + pct + '%"></div></div>';
      content.appendChild(subtaskInd);
    }

    if (card.assignments && card.assignments.length > 0) {
      var assignmentsDiv = document.createElement('div');
      assignmentsDiv.className = 'card-assignments';
      card.assignments.forEach(function(assgn) {
        var assgnRow = document.createElement('div');
        assgnRow.className = 'card-assignment';
        assgnRow.innerHTML =
          '<span class="assignment-type">' + escapeHtml(assgn.type) + ':</span>' +
          '<span class="assignment-value" title="' + escapeHtml(assgn.value) + '">' +
          escapeHtml(assgn.value) + '</span>';
        assignmentsDiv.appendChild(assgnRow);
      });
      content.appendChild(assignmentsDiv);
    }

    var board = getCurrentBoard();
    if (card.labels && card.labels.length > 0 && board && board.labels) {
      var labelsDiv = document.createElement('div');
      labelsDiv.className = 'card-labels';
      card.labels.forEach(function(labelId) {
        var label = board.labels.find(function(l) { return l.id === labelId; });
        if (label) {
          var labelEl = document.createElement('span');
          labelEl.className = 'card-label';
          labelEl.textContent = label.name;
          labelEl.style.backgroundColor = label.color;
          labelsDiv.appendChild(labelEl);
        }
      });
      content.appendChild(labelsDiv);
    }

    el.appendChild(content);
    return el;
  }

  // ===== CARD MODAL =====
  function openCardModal(cardId, colId) {
    var board = getCurrentBoard();
    if (!board) return;

    var card = null;
    var sourceColId = null;

    if (cardId) {
      board.columns.forEach(function(col) {
        var c = col.cards.find(function(x) { return x.id === cardId; });
        if (c) { card = c; sourceColId = col.id; }
      });
    }

    state.editingCardId = cardId;
    state.cardSourceColId = sourceColId || colId;

    var titleInput = document.getElementById('card-edit-title');
    var descTextarea = document.getElementById('card-edit-description');
    var dueDateInput = document.getElementById('card-edit-due-date');
    var priorityBtns = document.querySelectorAll('.priority-btn');
    var colorSwatches = document.querySelectorAll('.color-swatch');

    if (card) {
      if (titleInput) titleInput.value = card.title;
      if (descTextarea) descTextarea.value = card.description || '';
      if (dueDateInput) dueDateInput.value = card.dueDate || '';
      priorityBtns.forEach(function(btn) {
        btn.classList.toggle('active', parseInt(btn.getAttribute('data-priority')) === (card.priority || 0));
      });
      colorSwatches.forEach(function(swatch) {
        var swatchColor = swatch.getAttribute('data-color') || '';
        swatch.classList.toggle('active', swatchColor === (card.color || ''));
      });
    } else {
      if (titleInput) titleInput.value = '';
      if (descTextarea) descTextarea.value = '';
      if (dueDateInput) dueDateInput.value = '';
      priorityBtns.forEach(function(btn) { btn.classList.remove('active'); });
      colorSwatches.forEach(function(swatch) { swatch.classList.remove('active'); });
    }

    renderLabelPicker(card ? card.labels : []);
    renderSubtasks(card ? card.subtasks : []);
    renderAssignments(card ? card.assignments : []);

    var modal = document.getElementById('card-modal');
    var overlay = document.getElementById('card-modal-overlay');
    if (modal) modal.classList.add('visible');
    if (overlay) overlay.classList.add('visible');

    if (titleInput) setTimeout(function() { titleInput.focus(); }, 100);

    setupCardModalEvents(card);

    var mdPreview = document.getElementById('md-preview');
    if (mdPreview) { mdPreview.style.display = 'none'; mdPreview.innerHTML = ''; }
    var mdToggle = document.getElementById('md-toggle-btn');
    if (mdToggle) mdToggle.classList.remove('active');
  }

  function closeCardModal() {
    var modal = document.getElementById('card-modal');
    var overlay = document.getElementById('card-modal-overlay');
    if (modal) modal.classList.remove('visible');
    if (overlay) overlay.classList.remove('visible');
    state.editingCardId = null;
    state.cardSourceColId = null;
  }

  function setupCardModalEvents(card) {
    var saveBtn = document.getElementById('btn-save-card');
    if (saveBtn) saveBtn.onclick = function() { saveCard(); };

    var closeBtn = document.getElementById('card-modal-close');
    if (closeBtn) closeBtn.onclick = function(e) { e.preventDefault(); closeCardModal(); };

    var clearDueBtn = document.getElementById('btn-clear-due');
    if (clearDueBtn) clearDueBtn.onclick = function() {
      var input = document.getElementById('card-edit-due-date');
      if (input) input.value = '';
    };

    var prioBtns = document.querySelectorAll('.priority-btn');
    prioBtns.forEach(function(btn) {
      btn.onclick = function() {
        prioBtns.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
      };
    });

    var swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(function(swatch) {
      swatch.onclick = function() {
        swatches.forEach(function(s) { s.classList.remove('active'); });
        this.classList.add('active');
      };
    });

    var showLabelsBtn = document.getElementById('btn-show-labels');
    if (showLabelsBtn) showLabelsBtn.onclick = function() {
      openLabelManagement();
    };

    var addAssgnBtn = document.getElementById('btn-add-assignment');
    if (addAssgnBtn) addAssgnBtn.onclick = function() { addAssignmentRow(); };

    var addSubtaskBtn = document.getElementById('btn-add-subtask');
    if (addSubtaskBtn) addSubtaskBtn.onclick = function() {
      var input = document.getElementById('subtask-input');
      if (input && input.value.trim()) {
        addSubtask(input.value.trim());
        input.value = '';
      }
    };

    var archiveBtn = document.getElementById('btn-archive-card');
    if (archiveBtn && card) {
      archiveBtn.style.display = '';
      archiveBtn.onclick = function() {
        if (!confirm('Archive this card?')) return;
        card.archived = true;
        saveToStorage();
        closeCardModal();
        renderBoard();
        showToast('Card archived');
      };
    } else if (archiveBtn) {
      archiveBtn.style.display = 'none';
    }

    var dupBtn = document.getElementById('btn-duplicate-card');
    if (dupBtn && card) {
      dupBtn.style.display = '';
      dupBtn.onclick = function() { duplicateCard(card); closeCardModal(); };
    } else if (dupBtn) {
      dupBtn.style.display = 'none';
    }

    var deleteBtn = document.getElementById('card-delete-btn');
    if (deleteBtn && card) {
      deleteBtn.style.display = '';
      deleteBtn.onclick = function() {
        if (!confirm('Delete this card?')) return;
        deleteCard(card.id);
        closeCardModal();
        renderBoard();
        showToast('Card deleted');
      };
    } else if (deleteBtn) {
      deleteBtn.style.display = 'none';
    }

    var mdToggleBtn = document.getElementById('md-toggle-btn');
    var descTextarea = document.getElementById('card-edit-description');
    var mdPreview = document.getElementById('md-preview');

    if (mdToggleBtn && descTextarea && mdPreview) {
      mdToggleBtn.onclick = function() {
        this.classList.toggle('active');
        mdPreview.style.display = this.classList.contains('active') ? 'block' : 'none';
        mdPreview.innerHTML = parseMarkdown(descTextarea.value);
      };
      descTextarea.oninput = function() {
        if (mdToggleBtn.classList.contains('active')) {
          mdPreview.innerHTML = parseMarkdown(this.value);
        }
      };
    }

    setupSubtaskEvents();
  }

  function saveCard() {
    var board = getCurrentBoard();
    if (!board) return;

    var titleInput = document.getElementById('card-edit-title');
    var descTextarea = document.getElementById('card-edit-description');
    var dueDateInput = document.getElementById('card-edit-due-date');
    var title = titleInput ? titleInput.value.trim() : '';

    if (!title) {
      alert('Please enter a card title');
      return;
    }

    var priority = 0;
    document.querySelectorAll('.priority-btn.active').forEach(function(btn) {
      priority = parseInt(btn.getAttribute('data-priority'));
    });

    var color = '';
    document.querySelectorAll('.color-swatch.active').forEach(function(swatch) {
      color = swatch.getAttribute('data-color') || '';
    });

    var labels = [];
    document.querySelectorAll('.picker-label-item.selected').forEach(function(item) {
      labels.push(item.getAttribute('data-label-id'));
    });

    var subtasks = [];
    document.querySelectorAll('.subtask-item').forEach(function(item) {
      var textInput = item.querySelector('.subtask-text');
      var checkBox = item.querySelector('.subtask-checkbox');
      subtasks.push({
        id: item.getAttribute('data-subtask-id') || generateId(),
        text: textInput ? textInput.value.trim() : '',
        completed: checkBox ? checkBox.checked : false
      });
    });

    var assignments = [];
    document.querySelectorAll('.assignment-row').forEach(function(row) {
      var sel = row.querySelector('select');
      var inp = row.querySelector('.assignment-input');
      var type = sel ? sel.value : '';
      var value = inp ? inp.value.trim() : '';
      if (type && value) assignments.push({ type: type, value: value });
    });

    if (state.editingCardId) {
      var card = null;
      board.columns.forEach(function(col) {
        var c = col.cards.find(function(x) { return x.id === state.editingCardId; });
        if (c) card = c;
      });
      if (card) {
        card.title = title;
        card.description = descTextarea ? descTextarea.value : '';
        card.dueDate = dueDateInput ? dueDateInput.value : '';
        card.priority = priority;
        card.color = color;
        card.labels = labels;
        card.subtasks = subtasks;
        card.assignments = assignments;
        card.modifiedAt = Date.now();
        pushUndo();
        saveToStorage();
        renderBoard();
        closeCardModal();
        showToast('Card saved');
      }
    } else {
      var newCard = {
        id: generateId(),
        title: title,
        description: descTextarea ? descTextarea.value : '',
        dueDate: dueDateInput ? dueDateInput.value : '',
        priority: priority,
        color: color,
        labels: labels,
        subtasks: subtasks,
        assignments: assignments,
        createdAt: Date.now(),
        modifiedAt: Date.now()
      };
      var targetCol = board.columns.find(function(c) { return c.id === state.cardSourceColId; });
      if (!targetCol) targetCol = board.columns[0];
      if (targetCol) targetCol.cards.push(newCard);
      pushUndo();
      saveToStorage();
      renderBoard();
      closeCardModal();
      showToast('Card added');
    }
  }

  function deleteCard(cardId) {
    var board = getCurrentBoard();
    if (!board) return;
    board.columns.forEach(function(col) {
      col.cards = col.cards.filter(function(c) { return c.id !== cardId; });
    });
    board.modifiedAt = Date.now();
    pushUndo();
    saveToStorage();
  }

  function duplicateCard(card) {
    var board = getCurrentBoard();
    if (!board) return;
    var newCard = deepClone(card);
    newCard.id = generateId();
    newCard.title = card.title + ' (Copy)';
    newCard.createdAt = Date.now();
    newCard.modifiedAt = Date.now();
    board.columns.forEach(function(col) {
      if (col.cards.find(function(c) { return c.id === card.id; })) {
        col.cards.push(newCard);
      }
    });
    saveToStorage();
    renderBoard();
  }

  // ===== SUBTASKS =====
  function renderSubtasks(subtasks) {
    var list = document.getElementById('subtask-list');
    if (!list) return;
    list.innerHTML = '';
    if (!subtasks || subtasks.length === 0) return;

    subtasks.forEach(function(sub) {
      var item = document.createElement('div');
      item.className = 'subtask-item';
      item.setAttribute('data-subtask-id', sub.id);
      item.innerHTML =
        '<input type="checkbox" class="subtask-checkbox"' + (sub.completed ? ' checked' : '') + '>' +
        '<input type="text" class="subtask-text' + (sub.completed ? ' completed' : '') +
        '" value="' + escapeHtml(sub.text) + '">' +
        '<button class="subtask-delete"><i class="fa fa-times"></i></button>';
      list.appendChild(item);
    });
  }

  function setupSubtaskEvents() {
    var list = document.getElementById('subtask-list');
    if (!list) return;

    list.onchange = function(e) {
      if (e.target.classList.contains('subtask-checkbox')) {
        var item = e.target.closest('.subtask-item');
        var text = item.querySelector('.subtask-text');
        text.classList.toggle('completed', e.target.checked);
      }
    };

    list.onclick = function(e) {
      if (e.target.closest('.subtask-delete')) {
        e.target.closest('.subtask-item').remove();
      }
    };
  }

  function addSubtask(text) {
    var list = document.getElementById('subtask-list');
    if (!list) return;
    var item = document.createElement('div');
    item.className = 'subtask-item';
    item.setAttribute('data-subtask-id', generateId());
    item.innerHTML =
      '<input type="checkbox" class="subtask-checkbox">' +
      '<input type="text" class="subtask-text" value="' + escapeHtml(text) + '">' +
      '<button class="subtask-delete"><i class="fa fa-times"></i></button>';
    list.appendChild(item);
  }

  // ===== LABELS =====
  function renderLabelPicker(selectedLabels) {
    var list = document.getElementById('label-picker-list');
    if (!list) return;
    list.innerHTML = '';
    var board = getCurrentBoard();
    if (!board || !board.labels || board.labels.length === 0) return;

    board.labels.forEach(function(label) {
      var item = document.createElement('div');
      item.className = 'picker-label-item' +
        (selectedLabels && selectedLabels.indexOf(label.id) !== -1 ? ' selected' : '');
      item.setAttribute('data-label-id', label.id);
      item.style.backgroundColor = label.color;
      item.textContent = label.name;
      item.onclick = function() { this.classList.toggle('selected'); };
      list.appendChild(item);
    });
  }

  function openLabelManagement() {
    var modal = document.getElementById('label-modal');
    var overlay = document.getElementById('label-modal-overlay');
    if (modal) modal.classList.add('visible');
    if (overlay) overlay.classList.add('visible');
    renderLabelManagementList();
  }

  function closeLabelManagement() {
    var modal = document.getElementById('label-modal');
    var overlay = document.getElementById('label-modal-overlay');
    if (modal) modal.classList.remove('visible');
    if (overlay) overlay.classList.remove('visible');
  }

  function renderLabelManagementList() {
    var list = document.getElementById('label-modal-body');
    if (!list) return;
    list.innerHTML = '';
    var board = getCurrentBoard();
    if (!board || !board.labels || board.labels.length === 0) {
      list.innerHTML = '<div class="label-empty">No labels</div>';
      return;
    }

    board.labels.forEach(function(label) {
      var item = document.createElement('div');
      item.className = 'label-manage-item';
      item.setAttribute('data-label-id', label.id);
      item.innerHTML =
        '<input type="color" class="label-manage-color" value="' + label.color + '">' +
        '<input type="text" class="label-manage-text" value="' + escapeHtml(label.name) +
        '" placeholder="Label name...">' +
        '<button class="label-manage-delete"><i class="fa fa-trash"></i></button>';

      item.querySelector('.label-manage-color').onchange = function() {
        label.color = this.value;
        board.modifiedAt = Date.now();
        saveToStorage();
        renderBoard();
      };
      item.querySelector('.label-manage-text').onchange = function() {
        label.name = this.value.trim() || 'Untitled';
        board.modifiedAt = Date.now();
        saveToStorage();
        renderBoard();
      };
      item.querySelector('.label-manage-delete').onclick = function() {
        deleteLabel(label.id);
      };

      list.appendChild(item);
    });
  }

  function addNewLabel() {
    var board = getCurrentBoard();
    if (!board) return;
    board.labels.push({
      id: generateId(),
      name: 'New Label',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    });
    board.modifiedAt = Date.now();
    saveToStorage();
    renderLabelManagementList();
    renderBoard();
  }

  function deleteLabel(labelId) {
    var board = getCurrentBoard();
    if (!board) return;
    board.labels = board.labels.filter(function(l) { return l.id !== labelId; });
    board.columns.forEach(function(col) {
      col.cards.forEach(function(card) {
        if (card.labels) {
          card.labels = card.labels.filter(function(id) { return id !== labelId; });
        }
      });
    });
    board.modifiedAt = Date.now();
    saveToStorage();
    renderLabelManagementList();
    renderBoard();
  }

  // ===== ASSIGNMENTS =====
  function renderAssignments(assignments) {
    var list = document.getElementById('card-edit-assignments');
    if (!list) return;
    list.innerHTML = '';
    if (!assignments || assignments.length === 0) return;
    assignments.forEach(function(assgn) {
      addAssignmentRow(assgn.type, assgn.value);
    });
  }

  function addAssignmentRow(type, value) {
    var list = document.getElementById('card-edit-assignments');
    if (!list) return;
    var row = document.createElement('div');
    row.className = 'assignment-row';
    row.innerHTML =
      '<select class="assignment-select">' +
        '<option value="assignee">Assignee</option>' +
        '<option value="owner">Owner</option>' +
        '<option value="requester">Requester</option>' +
      '</select>' +
      '<input type="text" class="assignment-input" placeholder="Value"' +
      (value ? ' value="' + escapeHtml(value) + '"' : '') + '>' +
      '<button class="btn-remove-assignment"><i class="fa fa-times"></i></button>';

    if (type) row.querySelector('.assignment-select').value = type;
    row.querySelector('.btn-remove-assignment').onclick = function() { row.remove(); };
    list.appendChild(row);
  }

  // ===== FILTERS =====
  function updateFilterDropdown() {
    var board = getCurrentBoard();
    var container = document.getElementById('filter-dropdown-content');
    if (!container || !board || !board.labels) return;
    container.innerHTML = '';
    container.className = 'filter-content';

    board.labels.forEach(function(label) {
      var item = document.createElement('div');
      item.className = 'filter-item';
      item.innerHTML =
        '<input type="checkbox" class="filter-item-checkbox" data-label-id="' + label.id + '"' +
        (state.activeFilters.indexOf(label.id) !== -1 ? ' checked' : '') + '>' +
        '<span class="filter-color-dot" style="background:' + label.color + '"></span>' +
        '<span class="filter-item-text">' + escapeHtml(label.name) + '</span>';
      item.querySelector('input').onchange = function() {
        toggleFilter(label.id, this.checked);
      };
      container.appendChild(item);
    });
  }

  function toggleFilter(labelId, isActive) {
    var idx = state.activeFilters.indexOf(labelId);
    if (isActive && idx === -1) state.activeFilters.push(labelId);
    else if (!isActive && idx !== -1) state.activeFilters.splice(idx, 1);
    updateFilterBtnState();
    applyFilters();
  }

  function updateFilterBtnState() {
    var btn = document.getElementById('filter-btn');
    if (!btn) return;
    var toggle = btn.querySelector('.filter-toggle');
    if (toggle) toggle.classList.toggle('active', state.activeFilters.length > 0);
  }

  function applyFilters() {
    var board = getCurrentBoard();
    if (!board) return;

    var allCards = document.querySelectorAll('.kanban-card');
    allCards.forEach(function(cardEl) {
      var cardId = cardEl.getAttribute('data-card-id');
      var card = null;
      board.columns.forEach(function(col) {
        var c = col.cards.find(function(x) { return x.id === cardId; });
        if (c) card = c;
      });

      if (!card) return;

      var matchesLabel = true;
      if (state.activeFilters.length > 0) {
        matchesLabel = false;
        if (card.labels) {
          for (var i = 0; i < state.activeFilters.length; i++) {
            if (card.labels.indexOf(state.activeFilters[i]) !== -1) {
              matchesLabel = true;
              break;
            }
          }
        }
      }

      cardEl.classList.toggle('filtered-out', !matchesLabel);
    });
  }

  function filterCardsBySearch(query) {
    var allCards = document.querySelectorAll('.kanban-card');
    if (!query) {
      allCards.forEach(function(card) { card.classList.remove('filtered-out'); });
      applyFilters();
      return;
    }
    allCards.forEach(function(card) {
      var title = card.querySelector('.card-title');
      if (title && title.textContent.toLowerCase().indexOf(query) !== -1) {
        card.classList.remove('filtered-out');
      } else {
        card.classList.add('filtered-out');
      }
    });
  }

  // ===== DRAG AND DROP =====
  function handleCardDragStart(e) {
    var card = e.target.closest('.kanban-card');
    if (!card) return;
    state.draggedItem = {
      type: 'card',
      cardId: card.getAttribute('data-card-id'),
      colId: card.getAttribute('data-col-id')
    };
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('dragging');
  }

  function handleCardDragEnd(e) {
    var card = e.target.closest('.kanban-card');
    if (card) card.classList.remove('dragging');
    state.draggedItem = null;
  }

  function handleColumnDragStart(e) {
    var col = e.target.closest('.kanban-column');
    if (!col) return;
    state.draggedItem = { type: 'column', colId: col.getAttribute('data-col-id') };
    e.dataTransfer.effectAllowed = 'move';
    col.classList.add('dragging');
  }

  function handleColumnDragEnd(e) {
    var col = e.target.closest('.kanban-column');
    if (col) col.classList.remove('dragging');
    state.draggedItem = null;
  }

  function handleCardDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  function handleColumnDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }

  function handleCardDragEnter(e) {
    e.preventDefault();
    var container = e.target.closest('.column-cards');
    if (container) container.classList.add('drop-target');
  }

  function handleColumnDragEnter(e) {
    e.preventDefault();
    var col = e.target.closest('.kanban-column');
    if (col) col.classList.add('drop-target');
  }

  function handleCardDragLeave(e) {
    var container = e.target.closest('.column-cards');
    if (container) container.classList.remove('drop-target');
  }

  function handleColumnDragLeave(e) {
    var col = e.target.closest('.kanban-column');
    if (col) col.classList.remove('drop-target');
  }

  function handleCardDrop(e) {
    e.preventDefault();
    var container = e.target.closest('.column-cards');
    if (!container || !state.draggedItem || state.draggedItem.type !== 'card') return;
    container.classList.remove('drop-target');
    moveCard(state.draggedItem.cardId, state.draggedItem.colId, container.getAttribute('data-col-id'));
    state.draggedItem = null;
  }

  function handleColumnDrop(e) {
    e.preventDefault();
    var col = e.target.closest('.kanban-column');
    if (!col || !state.draggedItem || state.draggedItem.type !== 'column') return;
    col.classList.remove('drop-target');
    moveColumnToPosition(state.draggedItem.colId, col.getAttribute('data-col-id'));
    state.draggedItem = null;
  }

  function moveCard(cardId, fromColId, toColId) {
    var board = getCurrentBoard();
    if (!board) return;

    var card = null;
    var fromCol = null;
    board.columns.forEach(function(col) {
      var c = col.cards.find(function(x) { return x.id === cardId; });
      if (c) { card = c; fromCol = col; }
    });
    if (!card || !fromCol) return;

    fromCol.cards = fromCol.cards.filter(function(c) { return c.id !== cardId; });
    board.columns.forEach(function(col) {
      if (col.id === toColId) col.cards.push(card);
    });

    board.modifiedAt = Date.now();
    pushUndo();
    saveToStorage();
    renderBoard();
  }

  function moveColumnToPosition(origColId, destColId) {
    var board = getCurrentBoard();
    if (!board) return;
    var origIdx = board.columns.findIndex(function(c) { return c.id === origColId; });
    var destIdx = board.columns.findIndex(function(c) { return c.id === destColId; });
    if (origIdx === -1 || destIdx === -1 || origIdx === destIdx) return;
    var col = board.columns[origIdx];
    board.columns.splice(origIdx, 1);
    board.columns.splice(destIdx, 0, col);
    board.modifiedAt = Date.now();
    pushUndo();
    saveToStorage();
    renderBoard();
  }

  // ===== EXPORT / IMPORT =====
  function exportData() {
    var board = getCurrentBoard();
    if (!board) { showToast('No board to export'); return; }

    var data = {
      boards: state.boards,
      currentBoardId: state.currentBoardId,
      exportedAt: Date.now(),
      version: '2.1'
    };

    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'kanban-backup-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Board exported');
  }

  function exportCSV() {
    var board = getCurrentBoard();
    if (!board || !board.columns) { showToast('No board to export'); return; }

    var csv = 'Column,Card Title,Description,Due Date,Priority,Labels,Subtasks\n';
    board.columns.forEach(function(col) {
      if (col.cards) {
        col.cards.forEach(function(card) {
          if (card.archived) return;
          var labels = (card.labels && board.labels) ? board.labels.filter(function(l) {
            return card.labels.indexOf(l.id) !== -1;
          }).map(function(l) { return l.name; }).join('; ') : '';
          var subtasks = card.subtasks ? card.subtasks.map(function(s) {
            return (s.completed ? '[x]' : '[ ]') + ' ' + s.text;
          }).join('\\n') : '';
          csv += [
            escapeCsv(col.title), escapeCsv(card.title),
            escapeCsv(card.description || ''), card.dueDate || '',
            card.priority || 0, escapeCsv(labels), escapeCsv(subtasks)
          ].join(',') + '\n';
        });
      }
    });

    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'kanban-export-' + Date.now() + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV exported');
  }

  // ===== STATISTICS =====
  function showStatsModal() {
    var board = getCurrentBoard();
    if (!board) return;

    var modal = document.getElementById('stats-modal');
    var overlay = document.getElementById('stats-modal-overlay');
    var body = document.getElementById('stats-modal-body');
    var header = modal ? modal.querySelector('.stats-modal-header h3') : null;
    if (header) header.textContent = 'Board Statistics';
    if (modal) modal.classList.add('visible');
    if (overlay) overlay.classList.add('visible');
    if (!body) return;

    var totalCards = 0, archivedCards = 0;
    var cardsByStatus = {}, cardsByPriority = { 0: 0, 1: 0, 2: 0, 3: 0 };
    var overdueCount = 0, todayCount = 0;
    var totalSubtasks = 0, completedSubtasks = 0, totalAssignments = 0;
    var now = new Date();
    now.setHours(0, 0, 0, 0);

    board.columns.forEach(function(col) {
      cardsByStatus[col.title] = 0;
      if (col.cards) {
        col.cards.forEach(function(card) {
          if (card.archived) { archivedCards++; return; }
          totalCards++;
          cardsByStatus[col.title]++;
          var prio = card.priority || 0;
          if (cardsByPriority[prio] !== undefined) cardsByPriority[prio]++;
          if (card.dueDate) {
            var due = new Date(card.dueDate);
            due.setHours(0, 0, 0, 0);
            if (due < now) overdueCount++;
            else if (due.getTime() === now.getTime()) todayCount++;
          }
          if (card.subtasks) {
            totalSubtasks += card.subtasks.length;
            completedSubtasks += card.subtasks.filter(function(s) { return s.completed; }).length;
          }
          if (card.assignments) totalAssignments += card.assignments.length;
        });
      }
    });

    var html = '';
    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-value">' + totalCards + '</div><div class="stat-label">Total Cards</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + archivedCards + '</div><div class="stat-label">Archived</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + board.columns.length + '</div><div class="stat-label">Columns</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + (board.labels ? board.labels.length : 0) + '</div><div class="stat-label">Labels</div></div>';
    html += '</div>';

    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-value">' + overdueCount + '</div><div class="stat-label">Overdue</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + todayCount + '</div><div class="stat-label">Due Today</div></div>';
    if (totalSubtasks > 0) {
      var subPct = Math.round(completedSubtasks / totalSubtasks * 100);
      html += '<div class="stat-card"><div class="stat-value">' + completedSubtasks + '/' + totalSubtasks + '</div><div class="stat-label">Subtasks (' + subPct + '%)</div></div>';
    }
    if (totalAssignments > 0) {
      html += '<div class="stat-card"><div class="stat-value">' + totalAssignments + '</div><div class="stat-label">Assignments</div></div>';
    }
    html += '</div>';

    var maxColCount = 1;
    Object.keys(cardsByStatus).forEach(function(k) { if (cardsByStatus[k] > maxColCount) maxColCount = cardsByStatus[k]; });
    html += '<div class="stats-section-title">Cards by Column</div>';
    Object.keys(cardsByStatus).forEach(function(k) {
      var pct = Math.round(cardsByStatus[k] / maxColCount * 100);
      html += '<div class="stats-bar-row">';
      html += '<span class="stats-bar-label" title="' + escapeHtml(k) + '">' + escapeHtml(k) + '</span>';
      html += '<div class="stats-bar-track"><div class="stats-bar-fill" style="width:' + pct + '%;"></div></div>';
      html += '<span class="stats-bar-value">' + cardsByStatus[k] + '</span>';
      html += '</div>';
    });

    var prioLabels = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High' };
    var maxPrioCount = 1;
    Object.keys(cardsByPriority).forEach(function(k) { if (cardsByPriority[k] > maxPrioCount) maxPrioCount = cardsByPriority[k]; });
    html += '<div class="stats-section-title">Cards by Priority</div>';
    Object.keys(cardsByPriority).forEach(function(k) {
      var pct = Math.round(cardsByPriority[k] / maxPrioCount * 100);
      html += '<div class="stats-bar-row">';
      html += '<span class="stats-bar-label">' + prioLabels[k] + '</span>';
      html += '<div class="stats-bar-track"><div class="stats-bar-fill" style="width:' + pct + '%;"></div></div>';
      html += '<span class="stats-bar-value">' + cardsByPriority[k] + '</span>';
      html += '</div>';
    });

    body.innerHTML = html;

    var closeBtn = document.getElementById('btn-close-stats');
    if (closeBtn) closeBtn.onclick = function() {
      if (modal) modal.classList.remove('visible');
      if (overlay) overlay.classList.remove('visible');
    };
    if (overlay) overlay.onclick = function() {
      if (modal) modal.classList.remove('visible');
      if (overlay) overlay.classList.remove('visible');
    };
  }

  // ===== HELP =====
  function showHelp() {
    var modal = document.getElementById('stats-modal');
    var overlay = document.getElementById('stats-modal-overlay');
    var body = document.getElementById('stats-modal-body');
    var header = modal ? modal.querySelector('.stats-modal-header h3') : null;

    if (header) header.textContent = 'Keyboard Shortcuts';
    if (body) {
      var shortcuts = [
        { action: 'Save / Export board', key: 'Ctrl+S' },
        { action: 'Export menu', key: 'Ctrl+B' },
        { action: 'Save card (modal open)', key: 'Ctrl+Enter' },
        { action: 'Delete card (modal open)', key: 'Ctrl+Delete' },
        { action: 'Edit card', key: 'Click card' },
        { action: 'Rename column', key: 'Double-click title' },
        { action: 'Move card', key: 'Drag & drop' },
        { action: 'Move column', key: 'Drag column header' },
        { action: 'Close modal / dropdown', key: 'Escape' }
      ];
      var html = '<div class="stats-section-title">Keyboard Shortcuts</div>';
      shortcuts.forEach(function(s) {
        html += '<div class="stats-bar-row">';
        html += '<span class="stats-bar-label">' + escapeHtml(s.action) + '</span>';
        html += '<span class="stats-bar-value" style="text-align:left;width:auto;font-family:monospace;font-size:12px;">' + escapeHtml(s.key) + '</span>';
        html += '</div>';
      });
      body.innerHTML = html;
    }
    if (modal) modal.classList.add('visible');
    if (overlay) overlay.classList.add('visible');

    if (overlay) overlay.onclick = function() {
      if (modal) modal.classList.remove('visible');
      if (overlay) overlay.classList.remove('visible');
      if (header) header.textContent = 'Board Statistics';
    };
    var closeBtn = document.getElementById('btn-close-stats');
    if (closeBtn) closeBtn.onclick = function() {
      if (modal) modal.classList.remove('visible');
      if (overlay) overlay.classList.remove('visible');
      if (header) header.textContent = 'Board Statistics';
    };
  }

  // ===== KEYBOARD SHORTCUTS =====
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        var cardModal = document.getElementById('card-modal');
        var labelModal = document.getElementById('label-modal');
        var statsModal = document.getElementById('stats-modal');

        if (cardModal && cardModal.classList.contains('visible')) { closeCardModal(); return; }
        if (labelModal && labelModal.classList.contains('visible')) { closeLabelManagement(); return; }
        if (statsModal && statsModal.classList.contains('visible')) {
          statsModal.classList.remove('visible');
          var so = document.getElementById('stats-modal-overlay');
          if (so) so.classList.remove('visible');
          return;
        }

        var bl = document.getElementById('board-list');
        if (bl) bl.classList.remove('visible');
        var fd = document.getElementById('filter-dropdown-content');
        if (fd) fd.classList.remove('visible');
        var eo = document.getElementById('export-options');
        if (eo) eo.style.display = 'none';
        return;
      }

      if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
          e.preventDefault();
          if (state.editingCardId !== null) saveCard();
          else exportData();
          return;
        }
        if (e.key === 'b') {
          e.preventDefault();
          var exportBtn = document.getElementById('btn-export');
          if (exportBtn) exportBtn.click();
          return;
        }
        if (e.key === 'Enter' && state.editingCardId !== null) {
          e.preventDefault();
          saveCard();
          return;
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && state.editingCardId !== null) {
          e.preventDefault();
          if (confirm('Delete this card?')) {
            deleteCard(state.editingCardId);
            closeCardModal();
            renderBoard();
            showToast('Card deleted');
          }
          return;
        }
      }
    });
  }

  // ===== LABEL MODAL EVENTS =====
  function setupLabelModalEvents() {
    var closeBtn = document.getElementById('label-modal-close');
    if (closeBtn) closeBtn.onclick = function() { closeLabelManagement(); };

    var addBtn = document.getElementById('btn-add-label-modal');
    if (addBtn) addBtn.onclick = function() { addNewLabel(); };
  }

  // ===== OVERLAY EVENTS =====
  function setupOverlayEvents() {
    var cardOverlay = document.getElementById('card-modal-overlay');
    if (cardOverlay) cardOverlay.onclick = function() { closeCardModal(); };

    var labelOverlay = document.getElementById('label-modal-overlay');
    if (labelOverlay) labelOverlay.onclick = function() { closeLabelManagement(); };

    var statsOverlay = document.getElementById('stats-modal-overlay');
    if (statsOverlay) statsOverlay.onclick = function() {
      var modal = document.getElementById('stats-modal');
      if (modal) modal.classList.remove('visible');
      statsOverlay.classList.remove('visible');
    };
  }

  // ===== AUTO-SAVE TOGGLE =====
  function setupAutoSaveToggle() {
    var toggle = document.getElementById('kanban-auto-save-toggle');
    if (!toggle) return;
    state.autoSaveEnabled = localStorage.getItem('oros_kanban_autosave') !== 'false';
    toggle.checked = state.autoSaveEnabled;
    toggle.addEventListener('change', function() {
      state.autoSaveEnabled = this.checked;
      localStorage.setItem('oros_kanban_autosave', this.checked ? 'true' : 'false');
      if (this.checked) saveToStorage();
      showToast(this.checked ? 'Auto-save enabled' : 'Auto-save disabled');
    });
  }

  // ===== KANBAN SETTINGS TOGGLES =====
  function setupKanbanSettingsToggles() {
    var toggles = [
      { id: 'toggle-hide-add-column-btn', targetId: 'btn-add-column', storageKey: 'oros_kanban_hide_add_col' },
      { id: 'toggle-hide-import-btn', targetId: 'btn-import', storageKey: 'oros_kanban_hide_import' },
      { id: 'toggle-hide-export-btn', targetId: 'btn-export', storageKey: 'oros_kanban_hide_export' }
    ];

    toggles.forEach(function(t) {
      var toggle = document.getElementById(t.id);
      if (!toggle) return;
      var isHidden = localStorage.getItem(t.storageKey) === 'true';
      toggle.checked = isHidden;
      var target = document.getElementById(t.targetId);
      if (target && isHidden) target.style.display = 'none';
      toggle.addEventListener('change', function() {
        localStorage.setItem(t.storageKey, this.checked ? 'true' : 'false');
        if (target) target.style.display = this.checked ? 'none' : '';
      });
    });
  }

  // ===== EVENT LISTENERS =====
  function setupEventListeners() {
    safeAddListener('btn-new-board', 'click', function() { createNewBoard(); });
    safeAddListener('kanban-create-first-board', 'click', function() { createNewBoard(); });

    safeAddListener('board-selector-btn', 'click', function(e) {
      e.stopPropagation();
      var dropdown = document.getElementById('board-list');
      if (dropdown) dropdown.classList.toggle('visible');
    });

    safeAddListener('board-list', 'click', function(e) { e.stopPropagation(); });

    safeAddListener('filter-btn', 'click', function(e) {
      e.stopPropagation();
      var dropdown = document.getElementById('filter-dropdown-content');
      if (dropdown) dropdown.classList.toggle('visible');
    });

    var filterContent = document.getElementById('filter-dropdown-content');
    if (filterContent) {
      filterContent.addEventListener('click', function(e) { e.stopPropagation(); });
    }

    safeAddListener('btn-export', 'click', function(e) {
      e.stopPropagation();
      var menu = document.getElementById('export-options');
      var group = document.querySelector('.kanban-export-group');
      if (menu && group) {
        if (menu.style.display === 'block') {
          menu.style.display = 'none';
          group.classList.remove('open');
        } else {
          menu.style.display = 'block';
          group.classList.add('open');
        }
      }
    });

    safeAddListener('export-full', 'click', function() {
      exportData();
      var menu = document.getElementById('export-options');
      if (menu) menu.style.display = 'none';
    });

    safeAddListener('export-csv', 'click', function() {
      exportCSV();
      var menu = document.getElementById('export-options');
      if (menu) menu.style.display = 'none';
    });

    safeAddListener('btn-import', 'click', function() {
      var input = document.getElementById('import-file');
      if (input) input.click();
    });

    safeAddListener('import-file', 'change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var data = JSON.parse(ev.target.result);
          if (data.boards && Array.isArray(data.boards)) {
            state.boards = data.boards;
            state.currentBoardId = data.currentBoardId;
            saveToStorage();
            renderBoardSelector();
            renderBoard();
            showToast(getTrans('kanban_imported') || 'Board imported');
          } else {
            alert('Invalid import file');
          }
        } catch (err) {
          alert('Failed to import');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    safeAddListener('btn-archive-toggle', 'click', function() {
      state.showArchived = !state.showArchived;
      this.classList.toggle('archive-active', state.showArchived);
      renderBoard();
    });

    safeAddListener('btn-add-column', 'click', function() {
      var title = prompt(getTrans('kanban_column_name') || 'Column name:');
      if (title) addColumn(title);
    });

    safeAddListener('btn-stats', 'click', showStatsModal);
    safeAddListener('btn-labels', 'click', openLabelManagement);
    safeAddListener('btn-help', 'click', showHelp);

    // Global click: close menus
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.board-selector')) {
        var bl = document.getElementById('board-list');
        if (bl) bl.classList.remove('visible');
      }
      if (!e.target.closest('.kanban-filter-dropdown')) {
        var fd = document.getElementById('filter-dropdown-content');
        if (fd) fd.classList.remove('visible');
      }
      if (!e.target.closest('.kanban-export-group')) {
        var eo = document.getElementById('export-options');
        if (eo) eo.style.display = 'none';
      }
    });

    // Search
    var searchInput = document.querySelector('.kanban-search-input');
    if (searchInput) {
      var debounceTimer;
      searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        var self = this;
        debounceTimer = setTimeout(function() {
          var query = self.value.toLowerCase().trim();
          filterCardsBySearch(query);
        }, 200);
      });
    }

    var searchClear = document.querySelector('.kanban-search-clear');
    if (searchClear) {
      searchClear.addEventListener('click', function() {
        if (searchInput) {
          searchInput.value = '';
          filterCardsBySearch('');
        }
      });
    }
  }

  // ===== WINDOW RESIZE =====
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      var columns = document.getElementById('kanban-columns');
      if (columns) {
        columns.style.display = 'none';
        columns.offsetHeight; // force reflow
        columns.style.display = '';
      }
    }, 150);
  });

  // ===== BEFORE UNLOAD =====
  window.addEventListener('beforeunload', function(e) {
    if (state.editingCardId !== null) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ===== PUBLIC API =====
  global.KanbanApp = {
    init: init,
    createNewBoard: createNewBoard,
    deleteBoard: deleteBoard,
    switchBoard: switchBoard,
    addColumn: addColumn,
    deleteColumn: deleteColumn,
    renameColumn: renameColumn,
    moveColumn: moveColumn,
    deleteCard: deleteCard,
    moveCard: moveCard,
    exportData: exportData,
    exportCSV: exportCSV,
    toggleTheme: toggleTheme,
    setLanguage: setLanguage,
    undo: undo,
    getState: function() { return state; }
  };

  // ===== AUTO-INIT =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);