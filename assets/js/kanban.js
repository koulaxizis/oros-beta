// ============================================
// orOS Kanban — Full Implementation v2.0
// Features: Multi-format import (Trello/Brisqi/Kanri/CSV),
// board rename/reorder, subtasks, archive, priority,
// card colors, markdown, statistics, quick-add,
// duplicate, CSV export, activity log, context menu
// ============================================

(function() {
  'use strict';

  // ========== STORAGE KEYS ==========
  var STORAGE_KEY = 'oros_kanban_data';
  var SETTINGS_KEY = 'oros_kanban_settings';
  var ACTIVITY_KEY = 'oros_kanban_activity';

  // ========== STATE ==========
  var state = {
    boards: [],
    labels: [],
    currentBoardId: null,
    searchQuery: '',
    activeFilters: [],
    editingCardId: null,
    editingColumnId: null,
    draggingCard: null,
    draggingColumn: null,
    labelPickerOpen: false,
    showArchived: false,
    mdPreviewMode: false,
    selectedPriority: 0,
    selectedColor: '',
    settings: {
      lastImportPath: '',
      lastExportPath: ''
    }
  };

  // ========== DEFAULT LABELS ==========
  var DEFAULT_LABELS = [
    { id: 'lbl_green', color: '#4caf50', text: 'done' },
    { id: 'lbl_red', color: '#f44336', text: 'bug' },
    { id: 'lbl_blue', color: '#2196f3', text: 'feature' },
    { id: 'lbl_yellow', color: '#ff9800', text: 'review' },
    { id: 'lbl_purple', color: '#9c27b0', text: 'design' }
  ];

  // ========== BOARD TEMPLATES ==========
  var BOARD_TEMPLATES = {
    basic: ['To Do', 'Doing', 'Done'],
    scrum: ['Backlog', 'Sprint', 'In Review', 'Done'],
    personal: ['Ideas', 'Today', 'Done']
  };

  // ========== TRELLO COLOR MAP ==========
  var TRELLO_COLORS = {
    green: '#4caf50', yellow: '#ff9800', orange: '#ff5722',
    red: '#f44336', purple: '#9c27b0', blue: '#2196f3',
    sky: '#03a9f4', lime: '#cddc39', pink: '#e91e63',
    black: '#37474f', null: '#6d4aff'
  };

  // ========== ID GENERATOR ==========
  function genId(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // ========== HELPERS ==========
  function getCurrentLang() {
    return localStorage.getItem('oros-language') || 'en';
  }

  function getTrans(key) {
    var lang = getCurrentLang();
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
    }, 2500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate();
  }

  function formatDateTime(ts) {
    var d = new Date(ts);
    var now = new Date();
    var diff = now - d;
    if (diff < 60000) return 'just Now';
    if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff/86400000) + 'd ago';
    return d.toLocaleDateString();
  }

  // ========== MINI MARKDOWN PARSER ==========
  function parseMarkdown(text) {
    if (!text) return '';
    var html = escapeHtml(text);

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, function(m, code) {
      return '<pre><code>' + code + '</code></pre>';
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headings
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');

    // Bold, italic, strikethrough
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Lists
    var lines = html.split('\n');
    var inList = false;
    var result = [];

    lines.forEach(function(line) {
      if (/^\s*[-*] /.test(line)) {
        if (!inList) { result.push('<ul>'); inList = true; }
        result.push('<li>' + line.replace(/^\s*[-*] /, '') + '</li>');
      } else if (/^\s*\d+\. /.test(line)) {
        if (!inList) { result.push('<ul>'); inList = true; }
        result.push('<li>' + line.replace(/^\s*\d+\. /, '') + '</li>');
      } else {
        if (inList) { result.push('</ul>'); inList = false; }
        result.push(line);
      }
    });
    if (inList) result.push('</ul>');

    return result.join('\n');
  }

  // ========== ACTIVITY LOG ==========
  function logActivity(action, detail) {
    try {
      var logs = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '{}');
      var boardId = state.currentBoardId || 'global';
      if (!logs[boardId]) logs[boardId] = [];
      logs[boardId].unshift({
        action: action,
        detail: detail,
        ts: Date.now()
      });
      if (logs[boardId].length > 50) logs[boardId] = logs[boardId].slice(0, 50);
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(logs));
    } catch(e) {}
  }

  function getActivityLog(boardId) {
    try {
      var logs = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '{}');
      return logs[boardId] || [];
    } catch(e) { return []; }
  }

  // ========== DATA: LOAD / SAVE ==========
  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        state.boards = parsed.boards || [];
        state.labels = parsed.labels || [];
      }
    } catch(e) {
      state.boards = [];
      state.labels = [];
    }

    try {
      var settingsRaw = localStorage.getItem(SETTINGS_KEY);
      if (settingsRaw) {
        state.settings = Object.assign({}, state.settings, JSON.parse(settingsRaw));
      }
    } catch(e) {}

    if (state.labels.length === 0) {
      state.labels = DEFAULT_LABELS.slice();
    }

    setTimeout(function() {
      applyTranslations();
    }, 100);
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        boards: state.boards,
        labels: state.labels
      }));
    } catch(e) {
      showToast('Storage limit reached. Export and delete old boards.');
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch(e) {}
  }

  // ========== BOARD OPERATIONS ==========
  function getBoards() {
    return state.boards.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
  }

  function getCurrentBoard() {
    if (!state.currentBoardId && state.boards.length > 0) {
      state.currentBoardId = state.boards[0].id;
    }
    return state.boards.find(function(b) { return b.id === state.currentBoardId; });
  }

  function createBoard(title, template) {
    template = template || 'basic';
    var cols = BOARD_TEMPLATES[template] || BOARD_TEMPLATES.basic;

    var board = {
      id: genId('board'),
      title: title || 'Untitled Board',
      order: state.boards.length,
      columns: []
    };

    cols.forEach(function(colName, i) {
      board.columns.push({
        id: genId('col'),
        title: colName,
        order: i,
        cards: []
      });
    });

    state.boards.push(board);
    state.currentBoardId = board.id;
    saveData();
    logActivity('board_created', board.title);
    renderAll();
    return board;
  }

  function deleteBoard(boardId) {
    var board = state.boards.find(function(b) { return b.id === boardId; });
    if (!board) return;

    var msg = getCurrentLang() === 'el'
      ? 'Διαγραφή του board "' + board.title + '";'
      : 'Delete board "' + board.title + '"?';
    if (!confirm(msg)) return;

    var idx = state.boards.indexOf(board);
    state.boards.splice(idx, 1);
    state.boards.forEach(function(b, i) { b.order = i; });

    if (state.currentBoardId === boardId) {
      state.currentBoardId = state.boards.length > 0 ? state.boards[0].id : null;
    }

    saveData();
    logActivity('board_deleted', board.title);
    renderAll();
    showToast(getCurrentLang() === 'el' ? 'Το board διαγράφηκε' : 'Board deleted');
  }

  function renameBoard(boardId, newTitle) {
    var board = state.boards.find(function(b) { return b.id === boardId; });
    if (board) {
      var oldTitle = board.title;
      board.title = newTitle;
      saveData();
      logActivity('board_renamed', oldTitle + ' → ' + newTitle);
      renderAll();
    }
  }

  function switchBoard(boardId) {
    state.currentBoardId = boardId;
    state.showArchived = false;
    var btn = document.getElementById('btn-archive-toggle');
    if (btn) btn.classList.remove('archive-active');
    renderAll();
  }

  function reorderBoard(boardId, direction) {
    var boards = getBoards();
    var idx = boards.findIndex(function(b) { return b.id === boardId; });
    if (idx === -1) return;

    var swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= boards.length) return;

    var tmpOrder = boards[idx].order;
    boards[idx].order = boards[swapIdx].order;
    boards[swapIdx].order = tmpOrder;

    saveData();
    renderBoardSelector();
  }

  function duplicateBoard(boardId) {
    var board = state.boards.find(function(b) { return b.id === boardId; });
    if (!board) return;

    var copy = JSON.parse(JSON.stringify(board));
    copy.id = genId('board');
    copy.title = board.title + ' (copy)';
    copy.order = state.boards.length;

    copy.columns.forEach(function(col) {
      col.id = genId('col');
      col.cards.forEach(function(card) {
        card.id = genId('card');
        if (card.subtasks) card.subtasks.forEach(function(st) { st.id = genId('st'); });
        if (card.assignments) card.assignments.forEach(function(a) { a.id = genId('asn'); });
      });
    });

    state.boards.push(copy);
    state.currentBoardId = copy.id;
    saveData();
    logActivity('board_duplicated', copy.title);
    renderAll();
    showToast(getCurrentLang() === 'el' ? 'Το board αντιγράφηκε' : 'Board duplicated');
  }

  // ========== COLUMN OPERATIONS ==========
  function getColumn(board, colId) {
    return board.columns.find(function(c) { return c.id === colId; });
  }

  function createColumn(title) {
    var board = getCurrentBoard();
    if (!board) return;

    var col = {
      id: genId('col'),
      title: title || 'New Column',
      order: board.columns.length,
      cards: []
    };

    board.columns.push(col);
    saveData();
    logActivity('column_created', col.title);
    renderBoard();
    return col;
  }

  function deleteColumn(colId) {
    var board = getCurrentBoard();
    if (!board) return;
    var col = getColumn(board, colId);
    if (!col) return;

    var msg = getCurrentLang() === 'el'
      ? 'Διαγραφή της στήλης "' + col.title + '" με όλες τις κάρτες;'
      : 'Delete column "' + col.title + '" and all its cards?';
    if (!confirm(msg)) return;

    var idx = board.columns.indexOf(col);
    board.columns.splice(idx, 1);
    board.columns.forEach(function(c, i) { c.order = i; });

    saveData();
    logActivity('column_deleted', col.title);
    renderBoard();
    showToast(getCurrentLang() === 'el' ? 'Η στήλη διαγράφηκε' : 'Column deleted');
  }

  function renameColumn(colId, newTitle) {
    var board = getCurrentBoard();
    if (!board) return;
    var col = getColumn(board, colId);
    if (col) {
      col.title = newTitle;
      saveData();
      renderBoard();
    }
  }

  function duplicateColumn(colId) {
    var board = getCurrentBoard();
    if (!board) return;
    var col = getColumn(board, colId);
    if (!col) return;

    var copy = JSON.parse(JSON.stringify(col));
    copy.id = genId('col');
    copy.title = col.title + ' (copy)';
    copy.order = board.columns.length;
    copy.cards.forEach(function(card) {
      card.id = genId('card');
      if (card.subtasks) card.subtasks.forEach(function(st) { st.id = genId('st'); });
      if (card.assignments) card.assignments.forEach(function(a) { a.id = genId('asn'); });
    });

    board.columns.push(copy);
    saveData();
    logActivity('column_duplicated', copy.title);
    renderBoard();
    showToast(getCurrentLang() === 'el' ? 'Η στήλη αντιγράφηκε' : 'Column duplicated');
  }

  // ========== CARD OPERATIONS ==========
  function getCard(cardId) {
    var board = getCurrentBoard();
    if (!board) return null;
    for (var i = 0; i < board.columns.length; i++) {
      var card = board.columns[i].cards.find(function(c) { return c.id === cardId; });
      if (card) return { card: card, column: board.columns[i] };
    }
    return null;
  }

  function createCard(colId, title) {
    var board = getCurrentBoard();
    if (!board) return;
    var col = getColumn(board, colId);
    if (!col) return;

    var card = {
      id: genId('card'),
      title: title || 'Untitled Card',
      description: '',
      labels: [],
      assignments: [],
      subtasks: [],
      dueDate: null,
      priority: 0,
      color: '',
      archived: false,
      created: Date.now(),
      modified: Date.now(),
      order: col.cards.length
    };

    col.cards.push(card);
    saveData();
    logActivity('card_created', card.title);
    renderBoard();
    return card;
  }

  function updateCard(cardId, updates) {
    var result = getCard(cardId);
    if (!result) return;
    var card = result.card;
    for (var key in updates) {
      card[key] = updates[key];
    }
    card.modified = Date.now();
    saveData();
  }

  function deleteCard(cardId) {
    var result = getCard(cardId);
    if (!result) return;
    var col = result.column;
    var idx = col.cards.indexOf(result.card);
    col.cards.splice(idx, 1);
    col.cards.forEach(function(c, i) { c.order = i; });
    saveData();
    logActivity('card_deleted', result.card.title);
  }

  function moveCard(cardId, fromColId, toColId, toIndex) {
    var board = getCurrentBoard();
    if (!board) return;
    var fromCol = getColumn(board, fromColId);
    var toCol = getColumn(board, toColId);
    if (!fromCol || !toCol) return;

    var card = fromCol.cards.find(function(c) { return c.id === cardId; });
    if (!card) return;

    var fromIdx = fromCol.cards.indexOf(card);
    fromCol.cards.splice(fromIdx, 1);

    if (toIndex === undefined || toIndex === null) toIndex = toCol.cards.length;
    toCol.cards.splice(toIndex, 0, card);

    fromCol.cards.forEach(function(c, i) { c.order = i; });
    toCol.cards.forEach(function(c, i) { c.order = i; });

    saveData();
  }

  function archiveCard(cardId) {
    var result = getCard(cardId);
    if (!result) return;
    result.card.archived = true;
    saveData();
    logActivity('card_archived', result.card.title);
    closeCardModal();
    renderBoard();
    showToast(getCurrentLang() === 'el' ? 'Η κάρτα αρχειοθετήθηκε' : 'Card archived');
  }

  function unarchiveCard(cardId) {
    var result = getCard(cardId);
    if (!result) return;
    result.card.archived = false;
    saveData();
    logActivity('card_unarchived', result.card.title);
    renderBoard();
    showToast(getCurrentLang() === 'el' ? 'Η κάρτα επαναφέρθηκε' : 'Card restored');
  }

  function duplicateCard(cardId) {
    var result = getCard(cardId);
    if (!result) return;
    var card = result.card;
    var col = result.column;

    var copy = JSON.parse(JSON.stringify(card));
    copy.id = genId('card');
    copy.title = card.title + ' (copy)';
    copy.created = Date.now();
    copy.modified = Date.now();
    copy.order = col.cards.length;
    copy.archived = false;
    if (copy.subtasks) copy.subtasks.forEach(function(st) { st.id = genId('st'); st.completed = false; });
    if (copy.assignments) copy.assignments.forEach(function(a) { a.id = genId('asn'); });

    col.cards.push(copy);
    saveData();
    logActivity('card_duplicated', copy.title);
    renderBoard();
    showToast(getCurrentLang() === 'el' ? 'Η κάρτα αντιγράφηκε' : 'Card duplicated');
  }

  // ========== SUBTASK OPERATIONS ==========
  function addSubtask(cardId, text) {
    var result = getCard(cardId);
    if (!result) return;
    var card = result.card;
    card.subtasks = card.subtasks || [];
    card.subtasks.push({ id: genId('st'), text: text, completed: false });
    saveData();
  }

  function toggleSubtask(cardId, subtaskId) {
    var result = getCard(cardId);
    if (!result) return;
    var card = result.card;
    if (!card.subtasks) return;
    var st = card.subtasks.find(function(s) { return s.id === subtaskId; });
    if (st) { st.completed = !st.completed; saveData(); }
  }

  function deleteSubtask(cardId, subtaskId) {
    var result = getCard(cardId);
    if (!result) return;
    var card = result.card;
    if (!card.subtasks) return;
    card.subtasks = card.subtasks.filter(function(s) { return s.id !== subtaskId; });
    saveData();
  }

  function updateSubtaskText(cardId, subtaskId, text) {
    var result = getCard(cardId);
    if (!result) return;
    var card = result.card;
    if (!card.subtasks) return;
    var st = card.subtasks.find(function(s) { return s.id === subtaskId; });
    if (st) { st.text = text; saveData(); }
  }

  // ========== ASSIGNMENT OPERATIONS ==========
  function addAssignment(cardId, type, value) {
    var result = getCard(cardId);
    if (!result) return;
    var card = result.card;
    card.assignments = card.assignments || [];
    card.assignments.push({ id: genId('asn'), type: type, value: value });
    saveData();
  }

  function updateAssignment(cardId, asnId, updates) {
    var result = getCard(cardId);
    if (!result) return;
    var card = result.card;
    if (!card.assignments) return;
    var asn = card.assignments.find(function(a) { return a.id === asnId; });
    if (asn) { for (var key in updates) { asn[key] = updates[key]; } saveData(); }
  }

  function removeAssignment(cardId, asnId) {
    var result = getCard(cardId);
    if (!result) return;
    var card = result.card;
    if (!card.assignments) return;
    card.assignments = card.assignments.filter(function(a) { return a.id !== asnId; });
    saveData();
  }

  // ========== LABEL OPERATIONS ==========
  function createLabel(text, color) {
    var label = { id: genId('lbl'), color: color || '#6d4aff', text: text || 'label' };
    state.labels.push(label);
    saveData();
    return label;
  }

  function deleteLabel(labelId) {
    var idx = state.labels.findIndex(function(l) { return l.id === labelId; });
    if (idx === -1) return;
    state.labels.splice(idx, 1);
    state.boards.forEach(function(board) {
      board.columns.forEach(function(col) {
        col.cards.forEach(function(card) {
          card.labels = card.labels.filter(function(l) { return l.id !== labelId; });
        });
      });
    });
    saveData();
  }

  function renameLabel(labelId, newText) {
    var label = state.labels.find(function(l) { return l.id === labelId; });
    if (label) {
      label.text = newText;
      state.boards.forEach(function(board) {
        board.columns.forEach(function(col) {
          col.cards.forEach(function(card) {
            var cardLbl = card.labels.find(function(l) { return l.id === labelId; });
            if (cardLbl) cardLbl.text = newText;
          });
        });
      });
      saveData();
    }
  }

  function getLabelById(labelId) {
    return state.labels.find(function(l) { return l.id === labelId; });
  }

  function toggleCardLabel(cardId, labelId) {
    var result = getCard(cardId);
    if (!result) return;
    var card = result.card;
    var existing = card.labels.find(function(l) { return l.id === labelId; });
    if (existing) {
      card.labels = card.labels.filter(function(l) { return l.id !== labelId; });
    } else {
      var label = getLabelById(labelId);
      if (label) card.labels.push({ id: label.id, color: label.color, text: label.text });
    }
    saveData();
  }

  // ========== RENDERING ==========
  function renderAll() {
    renderBoardSelector();
    renderBoard();
    toggleEmptyState();
  }

  function renderBoardSelector() {
    var dropdown = document.getElementById('board-list');
    var nameEl = document.getElementById('current-board-name');
    if (!dropdown) return;

    var boards = getBoards();
    dropdown.innerHTML = '';

    if (boards.length === 0) {
      if (nameEl) nameEl.textContent = getTrans('kanban_empty_title');
      return;
    }

    boards.forEach(function(board, idx) {
      var item = document.createElement('div');
      item.className = 'board-list-item';
      if (board.id === state.currentBoardId) item.classList.add('active');

      var totalCards = board.columns.reduce(function(sum, col) {
        return sum + col.cards.filter(function(c) { return !c.archived; }).length;
      }, 0);

      item.innerHTML =
        '<span class="board-list-item-name" title="' + escapeHtml(board.title) + '">' +
          escapeHtml(board.title) +
        '</span>' +
        '<span class="board-list-item-count">' + totalCards + '</span>' +
        '<div class="board-list-item-controls">' +
          '<button class="board-reorder-btn up" title="Move up"><i class="fa fa-chevron-up"></i></button>' +
          '<button class="board-reorder-btn down" title="Move down"><i class="fa fa-chevron-down"></i></button>' +
          '<button class="board-rename-btn" title="Rename"><i class="fa fa-pencil"></i></button>' +
          '<button class="board-list-item-delete" title="Delete"><i class="fa fa-trash-o"></i></button>' +
        '</div>';

      // Click to switch
      item.addEventListener('click', function(e) {
        if (e.target.closest('.board-list-item-controls')) return;
        switchBoard(board.id);
        closeBoardSelector();
      });

      // Reorder up
      var upBtn = item.querySelector('.board-reorder-btn.up');
      if (upBtn) upBtn.addEventListener('click', function(e) { e.stopPropagation(); reorderBoard(board.id, 'up'); });

      // Reorder down
      var downBtn = item.querySelector('.board-reorder-btn.down');
      if (downBtn) downBtn.addEventListener('click', function(e) { e.stopPropagation(); reorderBoard(board.id, 'down'); });

      // Rename (pencil)
      var renameBtn = item.querySelector('.board-rename-btn');
      if (renameBtn) renameBtn.addEventListener('click', function(e) { e.stopPropagation(); startBoardRename(board, renameBtn); });

      // Double-click name
      var nameSpan = item.querySelector('.board-list-item-name');
      if (nameSpan) nameSpan.addEventListener('dblclick', function(e) { e.stopPropagation(); startBoardRename(board, nameSpan); });

      // Delete
      var delBtn = item.querySelector('.board-list-item-delete');
      if (delBtn) delBtn.addEventListener('click', function(e) { e.stopPropagation(); deleteBoard(board.id); });

      // Edge disable
      if (idx === 0) upBtn.style.visibility = 'hidden';
      if (idx === boards.length - 1) downBtn.style.visibility = 'hidden';

      dropdown.appendChild(item);
    });

    var current = getCurrentBoard();
    if (current && nameEl) nameEl.textContent = current.title;
  }

  function closeBoardSelector() {
    var dropdown = document.getElementById('board-list');
    if (dropdown) dropdown.classList.remove('visible');
  }

  function startBoardRename(board, anchorEl) {
    var input = document.getElementById('board-rename-input');
    if (!input) return;

    var rect = anchorEl.getBoundingClientRect();
    input.value = board.title;
    input.style.display = 'block';
    input.style.left = rect.left + 'px';
    input.style.top = rect.top + 'px';
    input.style.width = Math.max(120, rect.width) + 'px';
    input.focus();
    input.select();

    function finishEdit() {
      var newTitle = input.value.trim();
      if (newTitle && newTitle !== board.title) renameBoard(board.id, newTitle);
      input.style.display = 'none';
      input.removeEventListener('blur', finishEdit);
      input.removeEventListener('keydown', onKeydown);
    }

    function onKeydown(e) {
      if (e.key === 'Enter') { e.preventDefault(); finishEdit(); }
      else if (e.key === 'Escape') {
        input.style.display = 'none';
        input.removeEventListener('blur', finishEdit);
        input.removeEventListener('keydown', onKeydown);
      }
    }

    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', onKeydown);
  }

  function renderBoard() {
    var container = document.getElementById('kanban-columns');
    if (!container) return;

    var board = getCurrentBoard();
    container.innerHTML = '';

    if (state.showArchived && board) {
      var archiveBar = document.createElement('div');
      archiveBar.className = 'archive-bar';
      archiveBar.innerHTML = '<i class="fa fa-archive"></i> ' +
        (getCurrentLang() === 'el' ? 'Προβολή αρχειοθετημένων καρτών' : 'Showing archived cards');
      container.appendChild(archiveBar);
    }

    if (!board || board.columns.length === 0) {
      if (board) {
        var placeholder = document.createElement('div');
        placeholder.className = 'add-column-placeholder';
        placeholder.innerHTML = '<i class="fa fa-plus"></i> ' + getTrans('kanban_add_column');
        placeholder.addEventListener('click', function() { createColumn('New Column'); });
        container.appendChild(placeholder);
      }
      renderBoardSelector();
      return;
    }

    board.columns.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });

    board.columns.forEach(function(col) {
      container.appendChild(renderColumn(col));
    });

    var addPlaceholder = document.createElement('div');
    addPlaceholder.className = 'add-column-placeholder';
    addPlaceholder.innerHTML = '<i class="fa fa-plus"></i> ' + getTrans('kanban_add_column');
    addPlaceholder.addEventListener('click', function() { createColumn('New Column'); });
    container.appendChild(addPlaceholder);

    renderBoardSelector();
    applySearchFilter();
  }

  function renderColumn(col) {
    var colEl = document.createElement('div');
    colEl.className = 'kanban-column';
    colEl.dataset.colId = col.id;
    colEl.draggable = true;

    var header = document.createElement('div');
    header.className = 'column-header';

    var titleEl = document.createElement('div');
    titleEl.className = 'column-title';
    titleEl.textContent = col.title;

    var visibleCards = col.cards.filter(function(c) {
      return state.showArchived ? true : !c.archived;
    });

    var countEl = document.createElement('span');
    countEl.className = 'column-card-count';
    countEl.textContent = visibleCards.length;

    var actions = document.createElement('div');
    actions.className = 'column-actions';

    var addBtn = document.createElement('button');
    addBtn.className = 'column-action-btn add';
    addBtn.innerHTML = '<i class="fa fa-plus"></i>';
    addBtn.title = 'Add card';

    var dupBtn = document.createElement('button');
    dupBtn.className = 'column-action-btn';
    dupBtn.innerHTML = '<i class="fa fa-copy"></i>';
    dupBtn.title = 'Duplicate column';

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'column-action-btn delete';
    deleteBtn.innerHTML = '<i class="fa fa-trash-o"></i>';
    deleteBtn.title = 'Delete column';

    actions.appendChild(addBtn);
    actions.appendChild(dupBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(titleEl);
    header.appendChild(countEl);
    header.appendChild(actions);

    var cardsEl = document.createElement('div');
    cardsEl.className = 'column-cards';
    cardsEl.dataset.colId = col.id;

    visibleCards.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    visibleCards.forEach(function(card) {
      cardsEl.appendChild(renderCard(card, col.id));
    });

    var addCardBtnArea = document.createElement('div');
    addCardBtnArea.className = 'column-add-card';
    var addCardBtn = document.createElement('button');
    addCardBtn.className = 'btn-add-card';
    addCardBtn.innerHTML = '<i class="fa fa-plus"></i> ' + (getTrans('kanban_add_card') || 'Add Card');
    addCardBtnArea.appendChild(addCardBtn);

    var addCardArea = document.createElement('div');
    addCardArea.className = 'add-card-input-wrapper';
    var addCardInput = document.createElement('textarea');
    addCardInput.className = 'add-card-input';
    addCardInput.placeholder = getTrans('kanban_card_placeholder') || 'Enter card title...';
    addCardInput.rows = 1;
    var addCardActions = document.createElement('div');
    addCardActions.className = 'add-card-actions';
    var confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-confirm-add-card';
    confirmBtn.textContent = getTrans('kanban_add') || 'Add';
    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-cancel-add-card';
    cancelBtn.textContent = getTrans('kanban_cancel') || 'Cancel';
    addCardActions.appendChild(confirmBtn);
    addCardActions.appendChild(cancelBtn);
    addCardArea.appendChild(addCardInput);
    addCardArea.appendChild(addCardActions);

    colEl.appendChild(header);
    colEl.appendChild(cardsEl);
    colEl.appendChild(addCardBtnArea);
    colEl.appendChild(addCardArea);

    // ===== EVENTS =====
    titleEl.addEventListener('click', function() {
      var rect = titleEl.getBoundingClientRect();
      var editInput = document.getElementById('column-title-edit');
      if (!editInput) return;
      editInput.value = col.title;
      editInput.style.display = 'block';
      editInput.style.left = rect.left + 'px';
      editInput.style.top = rect.top + 'px';
      editInput.style.width = rect.width + 'px';
      editInput.style.height = rect.height + 'px';
      editInput.focus();
      editInput.select();
      state.editingColumnId = col.id;

      function finishEdit() {
        var newTitle = editInput.value.trim();
        if (newTitle && newTitle !== col.title) renameColumn(col.id, newTitle);
        editInput.style.display = 'none';
        editInput.removeEventListener('blur', finishEdit);
        editInput.removeEventListener('keydown', onKeydown);
        state.editingColumnId = null;
      }
      function onKeydown(e) {
        if (e.key === 'Enter') { e.preventDefault(); finishEdit(); }
        else if (e.key === 'Escape') {
          editInput.style.display = 'none';
          editInput.removeEventListener('blur', finishEdit);
          editInput.removeEventListener('keydown', onKeydown);
          state.editingColumnId = null;
        }
      }
      editInput.addEventListener('blur', finishEdit);
      editInput.addEventListener('keydown', onKeydown);
    });

    addBtn.addEventListener('click', function() { toggleAddCardInput(addCardBtnArea, addCardArea, addCardInput); });
    addCardBtn.addEventListener('click', function() { toggleAddCardInput(addCardBtnArea, addCardArea, addCardInput); });

    confirmBtn.addEventListener('click', function() {
      var title = addCardInput.value.trim();
      if (title) createCard(col.id, title);
      addCardInput.value = '';
      addCardInput.focus();
    });

    cancelBtn.addEventListener('click', function() {
      addCardInput.value = '';
      addCardArea.classList.remove('visible');
      addCardBtnArea.style.display = 'block';
    });

    addCardInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmBtn.click(); }
      else if (e.key === 'Escape') { cancelBtn.click(); }
    });

    addCardInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.max(36, this.scrollHeight) + 'px';
    });

    dupBtn.addEventListener('click', function() { duplicateColumn(col.id); });
    deleteBtn.addEventListener('click', function() { deleteColumn(col.id); });

    // ===== DRAG & DROP: COLUMN =====
    colEl.addEventListener('dragstart', function(e) {
      if (state.draggingCard) return;
      state.draggingColumn = col.id;
      colEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'column:' + col.id);
    });

    colEl.addEventListener('dragend', function() {
      colEl.classList.remove('dragging');
      state.draggingColumn = null;
      document.querySelectorAll('.kanban-column.drop-target').forEach(function(el) { el.classList.remove('drop-target'); });
    });

    colEl.addEventListener('dragover', function(e) {
      if (state.draggingColumn && state.draggingColumn !== col.id) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        colEl.classList.add('drop-target');
      }
    });

    colEl.addEventListener('dragleave', function(e) {
      if (e.relatedTarget && colEl.contains(e.relatedTarget)) return;
      colEl.classList.remove('drop-target');
    });

    colEl.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      colEl.classList.remove('drop-target');
      var data = e.dataTransfer.getData('text/plain');
      if (!data) return;

      if (data.startsWith('column:') && state.draggingColumn) {
        var draggedId = state.draggingColumn;
        var board = getCurrentBoard();
        if (!board) return;
        var draggedCol = getColumn(board, draggedId);
        var targetCol = getColumn(board, col.id);
        if (!draggedCol || !targetCol) return;

        var rect = colEl.getBoundingClientRect();
        var placeAfter = e.clientX > rect.left + rect.width / 2;
        var cols = board.columns.slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
        var draggedIdx = cols.indexOf(draggedCol);
        cols.splice(draggedIdx, 1);
        var targetIdx = cols.indexOf(targetCol);
        if (placeAfter) targetIdx++;
        cols.splice(targetIdx, 0, draggedCol);
        cols.forEach(function(c, i) { c.order = i; });
        board.columns = cols;
        saveData();
        renderBoard();
      }
    });

    // ===== DRAG & DROP: CARDS =====
    cardsEl.addEventListener('dragover', function(e) {
      if (state.draggingCard) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        cardsEl.classList.add('drop-target');
        var afterEl = getCardAfter(cardsEl, e.clientY);
        var placeholder = document.querySelector('.drag-placeholder');
        if (!placeholder) { placeholder = document.createElement('div'); placeholder.className = 'drag-placeholder'; }
        if (afterEl == null) cardsEl.appendChild(placeholder);
        else cardsEl.insertBefore(placeholder, afterEl);
      }
    });

    cardsEl.addEventListener('dragleave', function(e) {
      if (e.relatedTarget && cardsEl.contains(e.relatedTarget)) return;
      cardsEl.classList.remove('drop-target');
      var ph = cardsEl.querySelector('.drag-placeholder');
      if (ph) ph.remove();
    });

    cardsEl.addEventListener('drop', function(e) {
      e.preventDefault();
      e.stopPropagation();
      cardsEl.classList.remove('drop-target');
      var ph = cardsEl.querySelector('.drag-placeholder');
      if (ph) ph.remove();
      var data = e.dataTransfer.getData('text/plain');
      if (!data) return;

      if (data.startsWith('card:')) {
        var cardId = data.substring(5);
        var toColId = col.id;
        var afterEl = getCardAfter(cardsEl, e.clientY);
        var toIndex;
        if (afterEl == null) toIndex = col.cards.length;
        else {
          var afterCardId = afterEl.dataset.cardId;
          var afterCard = col.cards.find(function(c) { return c.id === afterCardId; });
          toIndex = afterCard ? col.cards.indexOf(afterCard) : col.cards.length;
        }
        var board = getCurrentBoard();
        if (!board) return;
        var fromColId = null;
        for (var i = 0; i < board.columns.length; i++) {
          if (board.columns[i].cards.find(function(c) { return c.id === cardId; })) {
            fromColId = board.columns[i].id;
            break;
          }
        }
        if (fromColId) { moveCard(cardId, fromColId, toColId, toIndex); renderBoard(); }
      }
    });

    return colEl;
  }

  function renderCard(card, colId) {
    var cardEl = document.createElement('div');
    cardEl.className = 'kanban-card';
    cardEl.dataset.cardId = card.id;
    cardEl.draggable = true;

    if (card.archived) cardEl.classList.add('archived');
    if (card.color) {
      cardEl.classList.add('has-color');
      cardEl.style.setProperty('--card-color', card.color);
    }

    var inner = '<div class="card-body-content">';

    // Priority badge
    if (card.priority && card.priority > 0) {
      var pLabel = card.priority === 1 ? 'L' : card.priority === 2 ? 'M' : 'H';
      inner += '<span class="card-priority-badge p' + card.priority + '">' + pLabel + '</span>';
    }

    inner += '<span class="card-title">' + escapeHtml(card.title) + '</span>';

    // Due date
    if (card.dueDate) {
      var dueClass = '';
      var dueText = formatDate(card.dueDate);
      var today = new Date(); today.setHours(0,0,0,0);
      var due = new Date(card.dueDate); due.setHours(0,0,0,0);
      if (due < today) { dueClass = ' overdue'; dueText += ' (overdue)'; }
      else if (due.getTime() === today.getTime()) { dueClass = ' today'; }
      inner += '<div class="card-due-date' + dueClass + '"><i class="fa fa-calendar"></i> ' + dueText + '</div>';
    }

    // Description indicator
    if (card.description) {
      inner += '<div class="card-description-indicator"><i class="fa fa-align-left"></i></div>';
    }

    // Subtask progress
    if (card.subtasks && card.subtasks.length > 0) {
      var done = card.subtasks.filter(function(s) { return s.completed; }).length;
      var total = card.subtasks.length;
      var pct = total > 0 ? Math.round((done / total) * 100) : 0;
      inner += '<div class="card-subtask-indicator"><i class="fa fa-check-square-o"></i> ' + done + '/' + total;
      inner += '<div class="subtask-progress-bar"><div class="subtask-progress-fill" style="width:' + pct + '%"></div></div>';
      inner += '</div>';
    }

    // Assignments
    if (card.assignments && card.assignments.length > 0) {
      inner += '<div class="card-assignments">';
      card.assignments.forEach(function(asn) {
        inner += '<div class="card-assignment">';
        inner += '<span class="assignment-type">' + escapeHtml(asn.type) + ':</span>';
        inner += '<span class="assignment-value">' + escapeHtml(asn.value) + '</span>';
        inner += '</div>';
      });
      inner += '</div>';
    }

    inner += '</div>';

    // Labels
    if (card.labels && card.labels.length > 0) {
      inner += '<div class="card-labels">';
      card.labels.forEach(function(lbl) {
        inner += '<span class="card-label" style="background:' + lbl.color + '">' + escapeHtml(lbl.text) + '</span>';
      });
      inner += '</div>';
    }

    cardEl.innerHTML = inner;

    cardEl.addEventListener('click', function(e) {
      if (cardEl.classList.contains('dragging')) return;
      openCardModal(card.id);
    });

    cardEl.addEventListener('dragstart', function(e) {
      state.draggingCard = card.id;
      cardEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'card:' + card.id);
      e.stopPropagation();
    });

    cardEl.addEventListener('dragend', function() {
      cardEl.classList.remove('dragging');
      state.draggingCard = null;
      document.querySelectorAll('.drag-placeholder').forEach(function(el) { el.remove(); });
      document.querySelectorAll('.column-cards.drop-target').forEach(function(el) { el.classList.remove('drop-target'); });
    });

    return cardEl;
  }

  function getCardAfter(container, y) {
    var cards = [].slice.call(container.querySelectorAll('.kanban-card:not(.dragging)'));
    return cards.reduce(function(closest, child) {
      var box = child.getBoundingClientRect();
      var offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
  }

  function toggleAddCardInput(btnArea, inputArea, input) {
    btnArea.style.display = 'none';
    inputArea.classList.add('visible');
    input.focus();
  }

  // ========== CARD MODAL ==========
  function openCardModal(cardId) {
    var result = getCard(cardId);
    if (!result) return;
    var card = result.card;
    state.editingCardId = cardId;
    state.selectedPriority = card.priority || 0;
    state.selectedColor = card.color || '';

    var modal = document.getElementById('card-modal');
    if (!modal) return;

    var titleEl = document.getElementById('card-edit-title');
    var descEl = document.getElementById('card-edit-description');
    var dueEl = document.getElementById('card-edit-due-date');
    var createdEl = document.getElementById('card-meta-created');

    if (titleEl) titleEl.value = card.title;
    if (descEl) descEl.value = card.description || '';
    if (dueEl) dueEl.value = card.dueDate || '';
    if (createdEl) createdEl.textContent =
      (getCurrentLang() === 'el' ? 'Δημιουργήθηκε: ' : 'Created: ') + new Date(card.created).toLocaleDateString();

    renderCardEditLabels(card);
    renderCardEditAssignments(card);
    renderSubtaskList(card);
    updatePrioritySelector();
    updateColorPicker();

    // Reset markdown preview
    state.mdPreviewMode = false;
    var mdPreview = document.getElementById('md-preview');
    var mdToggle = document.getElementById('md-toggle-btn');
    if (descEl) descEl.style.display = '';
    if (mdPreview) mdPreview.style.display = 'none';
    if (mdToggle) mdToggle.classList.remove('active');

    modal.classList.add('visible');
    if (titleEl) setTimeout(function() { titleEl.focus(); }, 50);
  }

  function closeCardModal() {
    var modal = document.getElementById('card-modal');
    if (modal) modal.classList.remove('visible');
    state.editingCardId = null;
    var picker = document.getElementById('label-picker');
    if (picker) picker.style.display = 'none';
    state.labelPickerOpen = false;
    renderBoard();
  }

  function renderSubtaskList(card) {
    var container = document.getElementById('subtask-list');
    if (!container) return;
    container.innerHTML = '';

    if (!card.subtasks || card.subtasks.length === 0) {
      var empty = document.createElement('em');
      empty.style.cssText = 'color:var(--text-muted,#8a8474); font-size:11px;';
      empty.textContent = 'No subtasks yet';
      container.appendChild(empty);
      return;
    }

    card.subtasks.forEach(function(st) {
      var item = document.createElement('div');
      item.className = 'subtask-item';

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'subtask-checkbox';
      checkbox.checked = st.completed;

      var textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.className = 'subtask-text' + (st.completed ? ' completed' : '');
      textInput.value = st.text;

      var delBtn = document.createElement('button');
      delBtn.className = 'subtask-delete';
      delBtn.innerHTML = '<i class="fa fa-times"></i>';

      checkbox.addEventListener('change', function() {
        toggleSubtask(state.editingCardId, st.id);
        textInput.classList.toggle('completed', checkbox.checked);
        var result = getCard(state.editingCardId);
        if (result) renderBoard();
      });

      textInput.addEventListener('blur', function() {
        updateSubtaskText(state.editingCardId, st.id, this.value.trim());
      });
      textInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
      });

      delBtn.addEventListener('click', function() {
        deleteSubtask(state.editingCardId, st.id);
        var result = getCard(state.editingCardId);
        if (result) renderSubtaskList(result.card);
      });

      item.appendChild(checkbox);
      item.appendChild(textInput);
      item.appendChild(delBtn);
      container.appendChild(item);
    });
  }

  function renderCardEditLabels(card) {
    var container = document.getElementById('card-edit-labels');
    if (!container) return;
    container.innerHTML = '';

    if (card.labels && card.labels.length > 0) {
      card.labels.forEach(function(lbl) {
        var el = document.createElement('span');
        el.className = 'card-label';
        el.style.background = lbl.color;
        el.textContent = lbl.text;
        el.title = 'Click to remove';
        el.addEventListener('click', function() {
          toggleCardLabel(card.id, lbl.id);
          renderCardEditLabels(getCard(card.id).card);
        });
        container.appendChild(el);
      });
    }
  }

  function renderLabelPicker(cardId) {
    var list = document.getElementById('label-picker-list');
    if (!list) return;
    list.innerHTML = '';

    var result = getCard(cardId);
    var cardLabels = result ? result.card.labels : [];

    state.labels.forEach(function(lbl) {
      var el = document.createElement('div');
      el.className = 'picker-label-item';
      el.style.background = lbl.color;
      el.textContent = lbl.text;
      var isSelected = cardLabels.some(function(cl) { return cl.id === lbl.id; });
      if (isSelected) el.classList.add('selected');
      el.addEventListener('click', function() {
        toggleCardLabel(cardId, lbl.id);
        renderLabelPicker(cardId);
        renderCardEditLabels(getCard(cardId).card);
      });
      list.appendChild(el);
    });
  }

  function renderCardEditAssignments(card) {
    var container = document.getElementById('card-edit-assignments');
    if (!container) return;
    container.innerHTML = '';

    if (!card.assignments || card.assignments.length === 0) {
      var empty = document.createElement('em');
      empty.style.cssText = 'color:var(--text-muted,#8a8474); font-size:11px;';
      empty.textContent = 'No assignments yet';
      container.appendChild(empty);
      return;
    }

    card.assignments.forEach(function(asn) {
      var row = document.createElement('div');
      row.className = 'assignment-row';
      row.dataset.asnId = asn.id;

      var typeInput = document.createElement('input');
      typeInput.type = 'text'; typeInput.className = 'assignment-input';
      typeInput.value = asn.type || ''; typeInput.placeholder = 'Type';
      typeInput.dataset.field = 'type';

      var valueInput = document.createElement('input');
      valueInput.type = 'text'; valueInput.className = 'assignment-input';
      valueInput.value = asn.value || ''; valueInput.placeholder = 'Value';
      valueInput.dataset.field = 'value';

      var removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove-assignment';
      removeBtn.innerHTML = '<i class="fa fa-times"></i>';

      typeInput.addEventListener('blur', function() { updateAssignment(state.editingCardId, asn.id, { type: this.value.trim() }); });
      valueInput.addEventListener('blur', function() { updateAssignment(state.editingCardId, asn.id, { value: this.value.trim() }); });
      typeInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); valueInput.focus(); } });
      valueInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); this.blur(); } });
      removeBtn.addEventListener('click', function() {
        removeAssignment(state.editingCardId, asn.id);
        var result = getCard(state.editingCardId);
        if (result) renderCardEditAssignments(result.card);
      });

      row.appendChild(typeInput);
      row.appendChild(valueInput);
      row.appendChild(removeBtn);
      container.appendChild(row);
    });
  }

  // ========== PRIORITY & COLOR SELECTORS ==========
  function updatePrioritySelector() {
    var btns = document.querySelectorAll('.priority-btn');
    btns.forEach(function(btn) {
      btn.classList.remove('active');
      if (parseInt(btn.dataset.priority) === state.selectedPriority) btn.classList.add('active');
    });
  }

  function updateColorPicker() {
    var swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(function(sw) {
      sw.classList.remove('active');
      if (sw.dataset.color === state.selectedColor) sw.classList.add('active');
    });
  }

  // ========== SEARCH & FILTER ==========
  function applySearchFilter() {
    var query = state.searchQuery.toLowerCase().trim();
    var cards = document.querySelectorAll('.kanban-card');
    cards.forEach(function(cardEl) {
      var cardId = cardEl.dataset.cardId;
      var result = getCard(cardId);
      if (!result) return;
      var card = result.card;
      var matchesSearch = true;
      var matchesFilter = true;

      if (query) {
        var titleMatch = card.title.toLowerCase().includes(query);
        var descMatch = (card.description || '').toLowerCase().includes(query);
        var asnMatch = false;
        if (card.assignments) {
          card.assignments.forEach(function(asn) {
            if ((asn.type||'').toLowerCase().includes(query) || (asn.value||'').toLowerCase().includes(query)) asnMatch = true;
          });
        }
        matchesSearch = titleMatch || descMatch || asnMatch;
      }

      if (state.activeFilters.length > 0) {
        matchesFilter = card.labels.some(function(lbl) { return state.activeFilters.includes(lbl.id); });
      }

      cardEl.classList.toggle('filtered-out', !(matchesSearch && matchesFilter));
    });
  }

  function renderFilterDropdown() {
    var container = document.getElementById('filter-dropdown-content');
    if (!container) return;
    container.innerHTML = '';

    state.labels.forEach(function(lbl) {
      var item = document.createElement('div');
      item.className = 'filter-item';
      var dot = document.createElement('div');
      dot.className = 'filter-color-dot';
      dot.style.background = lbl.color;
      var text = document.createElement('span');
      text.className = 'filter-item-text';
      text.textContent = lbl.text;
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'filter-item-checkbox';
      checkbox.checked = state.activeFilters.includes(lbl.id);
      checkbox.addEventListener('change', function() {
        if (this.checked) { if (!state.activeFilters.includes(lbl.id)) state.activeFilters.push(lbl.id); }
        else { state.activeFilters = state.activeFilters.filter(function(id) { return id !== lbl.id; }); }
        applySearchFilter();
        updateFilterBtnState();
      });
      item.appendChild(dot); item.appendChild(text); item.appendChild(checkbox);
      container.appendChild(item);
    });
    updateFilterBtnState();
  }

  function updateFilterBtnState() {
    var btn = document.getElementById('filter-btn');
    if (!btn) return;
    btn.classList.toggle('active', state.activeFilters.length > 0);
  }

  // ========== LABEL MANAGEMENT MODAL ==========
  function openLabelModal() {
    var modal = document.getElementById('label-modal');
    if (!modal) return;
    renderLabelManageList();
    modal.classList.add('visible');
  }

  function closeLabelModal() {
    var modal = document.getElementById('label-modal');
    if (modal) modal.classList.remove('visible');
  }

  function renderLabelManageList() {
    var body = document.getElementById('label-modal-body');
    if (!body) return;
    body.innerHTML = '';

    state.labels.forEach(function(lbl) {
      var item = document.createElement('div');
      item.className = 'label-manage-item';

      var colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'label-manage-color';
      colorInput.value = lbl.color;
      colorInput.addEventListener('change', function() {
        lbl.color = this.value;
        state.boards.forEach(function(board) {
          board.columns.forEach(function(col) {
            col.cards.forEach(function(card) {
              var cardLbl = card.labels.find(function(l) { return l.id === lbl.id; });
              if (cardLbl) cardLbl.color = lbl.color;
            });
          });
        });
        saveData();
        renderBoard();
      });

      var textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.className = 'label-manage-text';
      textInput.value = lbl.text;
      textInput.addEventListener('blur', function() {
        var newText = this.value.trim();
        if (newText && newText !== lbl.text) { renameLabel(lbl.id, newText); renderBoard(); renderFilterDropdown(); }
      });
      textInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') this.blur(); });

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'label-manage-delete';
      deleteBtn.innerHTML = '<i class="fa fa-trash-o"></i>';
      deleteBtn.addEventListener('click', function() {
        if (confirm('Delete label "' + lbl.text + '"?')) {
          deleteLabel(lbl.id);
          renderLabelManageList();
          renderBoard();
          renderFilterDropdown();
        }
      });

      item.appendChild(colorInput);
      item.appendChild(textInput);
      item.appendChild(deleteBtn);
      body.appendChild(item);
    });

    if (state.labels.length === 0) {
      var empty = document.createElement('p');
      empty.style.cssText = 'color:var(--text-muted,#8a8474); text-align:center; font-size:13px;';
      empty.textContent = 'No labels yet. Create one below.';
      body.appendChild(empty);
    }
  }

  // ========== STATISTICS ==========
  function openStatsModal() {
    var board = getCurrentBoard();
    if (!board) return;
    var modal = document.getElementById('stats-modal');
    if (!modal) return;

    var body = document.getElementById('stats-modal-body');
    if (!body) return;
    body.innerHTML = '';

    var totalCards = 0;
    var archivedCards = 0;
    var overdueCards = 0;
    var totalSubtasks = 0;
    var doneSubtasks = 0;
    var priorityCounts = [0, 0, 0, 0];
    var labelCounts = {};

    board.columns.forEach(function(col) {
      col.cards.forEach(function(card) {
        totalCards++;
        if (card.archived) archivedCards++;
        if (card.dueDate) {
          var due = new Date(card.dueDate); due.setHours(0,0,0,0);
          var today = new Date(); today.setHours(0,0,0,0);
          if (due < today && !card.archived) overdueCards++;
        }
        if (card.priority) priorityCounts[card.priority]++;
        if (card.subtasks) {
          totalSubtasks += card.subtasks.length;
          doneSubtasks += card.subtasks.filter(function(s) { return s.completed; }).length;
        }
        if (card.labels) {
          card.labels.forEach(function(lbl) {
            labelCounts[lbl.text] = (labelCounts[lbl.text] || 0) + 1;
          });
        }
      });
    });

    var activeCards = totalCards - archivedCards;

    var grid = document.createElement('div');
    grid.className = 'stats-grid';
    grid.innerHTML =
      '<div class="stat-card"><div class="stat-value">' + activeCards + '</div><div class="stat-label">Active Cards</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + board.columns.length + '</div><div class="stat-label">Columns</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + archivedCards + '</div><div class="stat-label">Archived</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + overdueCards + '</div><div class="stat-label">Overdue</div></div>';
    body.appendChild(grid);

    if (totalSubtasks > 0) {
      var stSection = document.createElement('div');
      stSection.innerHTML = '<div class="stats-section-title">Subtask Completion</div>';
      var stBar = document.createElement('div');
      stBar.className = 'stats-bar-row';
      var stPct = Math.round((doneSubtasks / totalSubtasks) * 100);
      stBar.innerHTML =
        '<div class="stats-bar-label">Completed</div>' +
        '<div class="stats-bar-track"><div class="stats-bar-fill" style="width:' + stPct + '%; background:var(--accent-gold);"></div></div>' +
        '<div class="stats-bar-value">' + doneSubtasks + '/' + totalSubtasks + '</div>';
      stSection.appendChild(stBar);
      body.appendChild(stSection);
    }

    var colSection = document.createElement('div');
    colSection.innerHTML = '<div class="stats-section-title">Cards per Column</div>';
    var maxCards = 1;
    board.columns.forEach(function(col) {
      var cnt = col.cards.filter(function(c) { return !c.archived; }).length;
      if (cnt > maxCards) maxCards = cnt;
    });
    board.columns.forEach(function(col) {
      var cnt = col.cards.filter(function(c) { return !c.archived; }).length;
      var pct = Math.round((cnt / maxCards) * 100);
      var row = document.createElement('div');
      row.className = 'stats-bar-row';
      row.innerHTML =
        '<div class="stats-bar-label">' + escapeHtml(col.title) + '</div>' +
        '<div class="stats-bar-track"><div class="stats-bar-fill" style="width:' + pct + '%; background:var(--accent-gold);"></div></div>' +
        '<div class="stats-bar-value">' + cnt + '</div>';
      colSection.appendChild(row);
    });
    body.appendChild(colSection);

    if (priorityCounts[1] + priorityCounts[2] + priorityCounts[3] > 0) {
      var priSection = document.createElement('div');
      priSection.innerHTML = '<div class="stats-section-title">Priority Distribution</div>';
      var priLabels = ['', 'Low', 'Medium', 'High'];
      var priColors = ['', '#4caf50', '#ff9800', '#f44336'];
      for (var p = 1; p <= 3; p++) {
        var cnt = priorityCounts[p];
        var pct = totalCards > 0 ? Math.round((cnt / totalCards) * 100) : 0;
        var row = document.createElement('div');
        row.className = 'stats-bar-row';
        row.innerHTML =
          '<div class="stats-bar-label">' + priLabels[p] + '</div>' +
          '<div class="stats-bar-track"><div class="stats-bar-fill" style="width:' + pct + '%; background:' + priColors[p] + ';"></div></div>' +
          '<div class="stats-bar-value">' + cnt + '</div>';
        priSection.appendChild(row);
      }
      body.appendChild(priSection);
    }

        var labelKeys = Object.keys(labelCounts);
    if (labelKeys.length > 0) {
      var lblSection = document.createElement('div');
      lblSection.innerHTML = '<div class="stats-section-title">Label Distribution</div>';
      var maxLbl = Math.max.apply(null, labelKeys.map(function(k) { return labelCounts[k]; }));
      labelKeys.forEach(function(key) {
        var cnt = labelCounts[key];
        var pct = Math.round((cnt / maxLbl) * 100);
        var row = document.createElement('div');
        row.className = 'stats-bar-row';
        row.innerHTML =
          '<div class="stats-bar-label">' + escapeHtml(key) + '</div>' +
          '<div class="stats-bar-track"><div class="stats-bar-fill" style="width:' + pct + '%; background:var(--accent-gold);"></div></div>' +
          '<div class="stats-bar-value">' + cnt + '</div>';
        lblSection.appendChild(row);
      });
      body.appendChild(lblSection);
    }

    var logs = getActivityLog(board.id);
    if (logs.length > 0) {
      var logSection = document.createElement('div');
      logSection.innerHTML = '<div class="stats-section-title">Recent Activity</div>';
      var logContainer = document.createElement('div');
      logContainer.className = 'activity-log';
      logs.slice(0, 15).forEach(function(entry) {
        var entryEl = document.createElement('div');
        entryEl.className = 'activity-entry';
        entryEl.innerHTML =
          '<span class="activity-time">' + formatDateTime(entry.ts) + '</span>' +
          '<span class="activity-text">' + escapeHtml(entry.action) + ': ' + escapeHtml(entry.detail || '') + '</span>';
        logContainer.appendChild(entryEl);
      });
      logSection.appendChild(logContainer);
      body.appendChild(logSection);
    }

    modal.classList.add('visible');
  }

  function closeStatsModal() {
    var modal = document.getElementById('stats-modal');
    if (modal) modal.classList.remove('visible');
  }

  // ========== EXPORT (FULL BACKUP) ==========
  function exportData() {
    if (state.boards.length === 0) {
      showToast(getTrans('kanban_no_board') || 'No data to export');
      return;
    }

    var exportObj = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      boards: state.boards,
      labels: state.labels,
      settings: state.settings,
      currentBoardId: state.currentBoardId
    };

    var blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'orOS_Kanban_Backup_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    state.settings.lastExportPath = a.download;
    saveSettings();
    showToast(getTrans('toast_downloaded') || 'Backup exported');
  }

  // ========== EXPORT CSV ==========
  function exportCSV() {
    var board = getCurrentBoard();
    if (!board) { showToast('No board to export'); return; }

    var rows = [['Board', 'Column', 'Card Title', 'Description', 'Due Date', 'Priority', 'Labels', 'Subtasks', 'Assignments', 'Archived']];

    board.columns.forEach(function(col) {
      col.cards.forEach(function(card) {
        var labels = (card.labels || []).map(function(l) { return l.text; }).join('; ');
        var subtasks = (card.subtasks || []).map(function(s) { return (s.completed ? '[x] ' : '[ ] ') + s.text; }).join('; ');
        var assignments = (card.assignments || []).map(function(a) { return a.type + ':' + a.value; }).join('; ');
        var priLabels = ['', 'Low', 'Medium', 'High'];
        rows.push([
          board.title,
          col.title,
          card.title,
          (card.description || '').replace(/\n/g, ' '),
          card.dueDate || '',
          priLabels[card.priority || 0],
          labels,
          subtasks,
          assignments,
          card.archived ? 'Yes' : 'No'
        ]);
      });
    });

    var csv = rows.map(function(row) {
      return row.map(function(cell) {
        var s = String(cell || '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(',');
    }).join('\n');

    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'orOS_Kanban_' + board.title.replace(/[^a-z0-9]/gi, '_') + '_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV exported');
  }

  // ========== IMPORT (MULTI-FORMAT) ==========
  function importData(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var content = e.target.result;

        if (file.name.endsWith('.json') || content.trim().startsWith('{') || content.trim().startsWith('[')) {
          var data = JSON.parse(content);

          if (data.boards && Array.isArray(data.boards)) {
            importNative(data);
          } else if (data.lists && Array.isArray(data.lists)) {
            importFromTrello(data);
          } else if (data.columns && Array.isArray(data.columns) && data.id) {
            importFromBrisqiOrKanri(data);
          } else if (data.board && data.board.id) {
            importNativeV1(data);
          } else if (data.id && data.columns) {
            importLegacyBoard(data);
          } else {
            showToast('Unrecognized JSON format');
          }
          return;
        }

        if (file.name.endsWith('.csv') || content.includes(',')) {
          importFromCSV(content);
          return;
        }

        showToast('Unrecognized file format');
      } catch(err) {
        showToast(getTrans('notes_import_failed') || 'Failed to import: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function importNative(data) {
    data.boards.forEach(function(b) {
      var existing = state.boards.find(function(ex) { return ex.id === b.id; });
      if (existing) b.id = genId('board');
      state.boards.push(b);
    });

    if (data.labels) {
      data.labels.forEach(function(lbl) {
        var exists = state.labels.find(function(l) { return l.text === lbl.text && l.color === lbl.color; });
        if (!exists) state.labels.push({ id: genId('lbl'), color: lbl.color, text: lbl.text });
      });
    }

    if (data.settings) state.settings = Object.assign({}, state.settings, data.settings);
    state.currentBoardId = state.boards.length > 0 ? state.boards[state.boards.length - 1].id : null;

    saveData(); saveSettings(); renderAll();
    showToast('Imported ' + data.boards.length + ' boards');
  }

  function importNativeV1(data) {
    var boardData = data.board;
    var existingB = state.boards.find(function(b) { return b.id === boardData.id; });
    if (existingB) boardData.id = genId('board');
    boardData.order = state.boards.length;

    if (data.labels) {
      data.labels.forEach(function(lbl) {
        var exists = state.labels.find(function(l) { return l.text === lbl.text && l.color === lbl.color; });
        if (!exists) state.labels.push({ id: genId('lbl'), color: lbl.color, text: lbl.text });
      });
    }

    state.boards.push(boardData);
    state.currentBoardId = boardData.id;
    saveData();
    renderAll();
    showToast(getTrans('toast_opened') || 'Board imported');
  }

  function importLegacyBoard(data) {
    data.order = state.boards.length;
    state.boards.push(data);
    state.currentBoardId = data.id;
    saveData();
    renderAll();
    showToast(getTrans('toast_opened') || 'Board imported');
  }

  // ========== IMPORT: TRELLO ==========
  function importFromTrello(data) {
    var board = {
      id: genId('board'),
      title: data.name || 'Imported Trello Board',
      order: state.boards.length,
      columns: []
    };

    var lists = (data.lists || []).filter(function(l) { return !l.closed; });
    lists.sort(function(a, b) { return (a.pos || 0) - (b.pos || 0); });

    lists.forEach(function(list, idx) {
      var col = { id: genId('col'), title: list.name || 'Column', order: idx, cards: [] };

      var trelloCards = (data.cards || []).filter(function(c) { return c.idList === list.id && !c.closed; });
      trelloCards.sort(function(a, b) { return (a.pos || 0) - (b.pos || 0); });

      trelloCards.forEach(function(tc, cardIdx) {
        var card = {
          id: genId('card'),
          title: tc.name || 'Untitled',
          description: tc.desc || '',
          labels: [],
          assignments: [],
          subtasks: [],
          dueDate: tc.due ? tc.due.split('T')[0] : null,
          priority: 0,
          color: '',
          archived: false,
          created: tc.dateLastActivity ? new Date(tc.dateLastActivity).getTime() : Date.now(),
          modified: Date.now(),
          order: cardIdx
        };

        if (tc.labels && tc.labels.length > 0) {
          tc.labels.forEach(function(tl) {
            var color = TRELLO_COLORS[tl.color] || '#6d4aff';
            var text = tl.name || tl.color || 'label';
            var existing = state.labels.find(function(l) { return l.text === text && l.color === color; });
            if (!existing) {
              existing = { id: genId('lbl'), color: color, text: text };
              state.labels.push(existing);
            }
            card.labels.push({ id: existing.id, color: existing.color, text: existing.text });
          });
        }

        if (data.checklists) {
          var cardChecklists = data.checklists.filter(function(ch) { return ch.idCard === tc.id; });
          cardChecklists.forEach(function(ch) {
            (ch.checkItems || []).forEach(function(ci) {
              card.subtasks.push({
                id: genId('st'),
                text: ci.name || '',
                completed: ci.state === 'complete'
              });
            });
          });
        }

        if (tc.idMembers && tc.idMembers.length > 0) {
          tc.idMembers.forEach(function(memId) {
            var member = (data.members || []).find(function(m) { return m.id === memId; });
            if (member) {
              card.assignments.push({
                id: genId('asn'),
                type: 'Member',
                value: member.fullName || member.username || memId
              });
            }
          });
        }

        col.cards.push(card);
      });

      board.columns.push(col);
    });

    state.boards.push(board);
    state.currentBoardId = board.id;
    saveData();
    renderAll();
    showToast('Trello board imported (' + lists.length + ' columns)');
  }

  // ========== IMPORT: BRISQI / KANRI ==========
  function importFromBrisqiOrKanri(data) {
    var board = {
      id: genId('board'),
      title: data.title || 'Imported Board',
      order: state.boards.length,
      columns: []
    };

    var columns = data.columns || [];
    columns.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });

    columns.forEach(function(colData, idx) {
      var col = {
        id: genId('col'),
        title: colData.title || 'Column',
        order: idx,
        cards: []
      };

      var cards = colData.cards || [];
      cards.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });

      cards.forEach(function(cd, cardIdx) {
        var card = {
          id: genId('card'),
          title: cd.title || 'Untitled',
          description: cd.description || '',
          labels: [],
          assignments: [],
          subtasks: [],
          dueDate: cd.dueDate || null,
          priority: cd.priority || 0,
          color: cd.color || '',
          archived: cd.archived || false,
          created: cd.created || Date.now(),
          modified: Date.now(),
          order: cardIdx
        };

        if (cd.labels) {
          cd.labels.forEach(function(lblData) {
            var existing = state.labels.find(function(l) { 
              return l.text === lblData.text && l.color === lblData.color; 
            });
            if (!existing) {
              existing = { id: genId('lbl'), color: lblData.color, text: lblData.text };
              state.labels.push(existing);
            }
            card.labels.push({ id: existing.id, color: existing.color, text: existing.text });
          });
        }

        if (cd.subtasks) {
          cd.subtasks.forEach(function(st) {
            card.subtasks.push({
              id: genId('st'),
              text: st.text || '',
              completed: st.completed || false
            });
          });
        }

        if (cd.assignments) {
          cd.assignments.forEach(function(asn) {
            card.assignments.push({
              id: genId('asn'),
              type: asn.type || 'Assignment',
              value: asn.value || ''
            });
          });
        }

        col.cards.push(card);
      });

      board.columns.push(col);
    });

    if (data.labels) {
      data.labels.forEach(function(lblData) {
        var exists = state.labels.find(function(l) {
          return l.text === lblData.text && l.color === lblData.color;
        });
        if (!exists) {
          state.labels.push({
            id: genId('lbl'),
            color: lblData.color || '#6d4aff',
            text: lblData.text || 'label'
          });
        }
      });
    }

    state.boards.push(board);
    state.currentBoardId = board.id;
    saveData();
    renderAll();
    showToast('Brisqi/Kanri board imported (' + columns.length + ' columns)');
  }

  // ========== IMPORT: CSV ==========
  function importFromCSV(content) {
    var lines = content.split('\n').filter(function(l) { return l.trim(); });
    if (lines.length < 2) { showToast('CSV too empty'); return; }

    var headers = parseCSVLine(lines[0]);
    var colIdx = null, titleIdx = -1, descIdx = -1, dueIdx = -1, priIdx = -1, labelsIdx = -1;

    headers.forEach(function(h, i) {
      var hl = h.toLowerCase().trim();
      if (hl === 'column' || hl === 'list' || hl === 'stack') colIdx = i;
      if (hl === 'title' || hl === 'name') titleIdx = i;
      if (hl === 'description' || hl === 'desc') descIdx = i;
      if (hl === 'due date' || hl === 'duedate' || hl === 'due') dueIdx = i;
      if (hl === 'priority' || hl === 'pri') priIdx = i;
      if (hl === 'labels' || hl === 'tags') labelsIdx = i;
    });

    if (titleIdx === -1) { showToast('No title column found in CSV'); return; }

    var board = {
      id: genId('board'),
      title: 'Imported from CSV',
      order: state.boards.length,
      columns: []
    };

    var colMap = {};
    var labelSet = {};

    for (var r = 1; r < lines.length; r++) {
      var vals = parseCSVLine(lines[r]);
      var colName = colIdx >= 0 ? vals[colIdx] : 'Default';
      if (!colName) colName = 'Default';
      
      if (!colMap[colName]) {
        colMap[colName] = { id: genId('col'), title: colName, order: Object.keys(colMap).length, cards: [] };
        board.columns.push(colMap[colName]);
      }

      var card = {
        id: genId('card'),
        title: titleIdx >= 0 ? vals[titleIdx] : 'Untitled',
        description: descIdx >= 0 ? (vals[descIdx] || '') : '',
        labels: [],
        assignments: [],
        subtasks: [],
        dueDate: dueIdx >= 0 ? vals[dueIdx] : null,
        priority: priIdx >= 0 ? parseInt(vals[priIdx]) || 0 : 0,
        color: '',
        archived: false,
        created: Date.now(),
        modified: Date.now(),
        order: colMap[colName].cards.length
      };

      if (labelsIdx >= 0 && vals[labelsIdx]) {
        vals[labelsIdx].split(';').forEach(function(lbl) {
          lbl = lbl.trim();
          if (!lbl) return;
          if (!labelSet[lbl]) {
            labelSet[lbl] = { id: genId('lbl'), color: '#6d4aff', text: lbl };
            state.labels.push(labelSet[lbl]);
          }
          card.labels.push({ id: labelSet[lbl].id, color: labelSet[lbl].color, text: labelSet[lbl].text });
        });
      }

      colMap[colName].cards.push(card);
    }

    state.boards.push(board);
    state.currentBoardId = board.id;
    saveData();
    renderAll();
    showToast('CSV imported (' + (r - 1) + ' cards, ' + Object.keys(colMap).length + ' columns)');
  }

  function parseCSVLine(line) {
    var result = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
      else current += ch;
    }
    result.push(current);
    return result.map(function(v) { return v.trim(); });
  }

  // ========== CONTEXT MENU ==========
  function showFormatMenu(x, y, inputElement) {
    hideAllMenus();

    var menu = document.createElement('div');
    menu.className = 'format-context-menu';
    menu.id = 'format-context-menu-temp';

    var cmds = [
      { icon: 'fa-bold', label: getTrans('toolbar_bold') || 'Bold', cmd: '**' },
      { icon: 'fa-italic', label: getTrans('toolbar_italic') || 'Italic', cmd: '*' },
      { icon: 'fa-strikethrough', label: 'Strikethrough', cmd: '~~' },
      { icon: 'fa-code', label: 'Code', cmd: '`' },
      { divider: true },
      { icon: 'fa-header', label: getTrans('toolbar_h3') || 'Heading', cmd: '### ' },
      { icon: 'fa-list-ul', label: getTrans('toolbar_bullet_list') || 'Bullet List', cmd: '- ' }
    ];

    cmds.forEach(function(c) {
      if (c.divider) {
        var div = document.createElement('div');
        div.className = 'format-divider';
        menu.appendChild(div);
      } else {
        var btn = document.createElement('button');
        btn.className = 'format-cmd';
        btn.innerHTML = '<i class="fa ' + c.icon + '"></i> ' + c.label;
        btn.addEventListener('mousedown', function(e) {
          e.preventDefault();
          e.stopPropagation();
          applyFormatting(inputElement, c.cmd);
          hideAllMenus();
        });
        menu.appendChild(btn);
      }
    });

    document.body.appendChild(menu);

    var rect = menu.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 10;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 10;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = '';

    setTimeout(function() {
      document.addEventListener('click', hideAllMenusOnce);
      window.addEventListener('scroll', hideAllMenusOnce);
    }, 0);
  }

  function hideAllMenus() {
    var temp = document.getElementById('format-context-menu-temp');
    if (temp) temp.remove();
    document.querySelectorAll('.board-selector-dropdown, .filter-dropdown-content, .kanban-export-menu').forEach(function(el) {
      el.classList.remove('visible');
    });
    state.labelPickerOpen = false;
    var picker = document.getElementById('label-picker');
    if (picker) picker.style.display = 'none';
  }

  function hideAllMenusOnce() {
    hideAllMenus();
    document.removeEventListener('click', hideAllMenusOnce);
    window.removeEventListener('scroll', hideAllMenusOnce);
  }

  function applyFormatting(inputEl, marker) {
    if (!inputEl || inputEl.tagName !== 'TEXTAREA') return;

    var start = inputEl.selectionStart;
    var end = inputEl.selectionEnd;
    var text = inputEl.value;

    var before = text.substring(0, start);
    var selected = text.substring(start, end);
    var after = text.substring(end);

    var newText;
    var newCursorPos;

    if (marker === '**' || marker === '*' || marker === '~~' || marker === '`') {
      if (selected.length > 0) {
        newText = before + marker + selected + marker + after;
        newCursorPos = end + marker.length * 2;
      } else {
        newText = before + marker + marker + after;
        newCursorPos = start + marker.length;
      }
    } else if (marker === '### ') {
      if (before.endsWith('\n') || before.length === 0) {
        newText = before + marker + after;
        newCursorPos = start + marker.length;
      } else {
        newText = before + '\n' + marker + after;
        newCursorPos = start + marker.length + 1;
      }
    } else if (marker === '- ') {
      if (before.endsWith('\n') || before.length === 0) {
        newText = before + marker + after;
        newCursorPos = start + marker.length;
      } else {
        newText = before + '\n' + marker + after;
        newCursorPos = start + marker.length + 1;
      }
    } else {
      return;
    }

    inputEl.value = newText;
    inputEl.focus();

    if (selected.length > 0) {
      inputEl.setSelectionRange(newCursorPos - marker.length * 2, newCursorPos);
    } else {
      inputEl.setSelectionRange(newCursorPos, newCursorPos);
    }

    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ========== KEYBOARD SHORTCUTS ==========
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        if (e.key === 'Escape') {
          closeCardModal();
          closeLabelModal();
          closeStatsModal();
          hideAllMenus();
        }
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          exportData();
        } else if (e.key === 'b') {
          e.preventDefault();
          var btn = document.getElementById('btn-export');
          if (btn) btn.click();
        }
        return;
      }

      if (state.editingCardId) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          var placeholder = document.querySelector('.add-column-placeholder');
          if (placeholder) placeholder.click();
          break;
        case '/':
          e.preventDefault();
          var search = document.querySelector('.kanban-search-input');
          if (search) search.focus();
          break;
        case '?':
          e.preventDefault();
          showToast('Shortcuts: N=New column, /=Search, Ctrl+S=Export, Ctrl+B=Export Menu');
          break;
      }
    });
  }

  // ========== INITIALIZATION ==========
  function safeAddListener(id, event, handler) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
    else console.warn('kanban.js: Element "' + id + '" not found in DOM — skipping ' + event + ' listener.');
  }

  function init() {
    loadData();

    var board = getCurrentBoard();
    if (!board) {
      createBoard(getTrans('kanban_default_title') || 'My First Board', 'basic');
    }

    renderAll();

    // ===== TOOLBAR BUTTONS =====
    safeAddListener('btn-new-board', 'click', function() {
      var name = prompt(getTrans('kanban_new_board_prompt') || 'Enter board name:');
      if (name && name.trim()) {
        var template = 'basic';
        if (name.toLowerCase().includes('scrum') || name.toLowerCase().includes('agile')) template = 'scrum';
        else if (name.toLowerCase().includes('personal')) template = 'personal';
        createBoard(name.trim(), template);
      }
    });

    safeAddListener('btn-export', 'click', function() {
      var menu = document.getElementById('export-options');
      if (menu) {
        if (menu.style.display === 'block') { menu.style.display = 'none'; }
        else { menu.style.display = 'block'; }
      }
    });

    safeAddListener('btn-import', 'click', function() {
      var input = document.getElementById('import-file');
      if (input) input.click();
    });

    safeAddListener('import-file', 'change', function(e) {
      if (e.target.files && e.target.files[0]) {
        importData(e.target.files[0]);
        e.target.value = '';
      }
    });

    safeAddListener('btn-stats', 'click', openStatsModal);

    safeAddListener('btn-archive-toggle', 'click', function() {
      state.showArchived = !state.showArchived;
      this.classList.toggle('archive-active', state.showArchived);
      renderBoard();
    });

    safeAddListener('btn-labels', 'click', function() {
      openLabelModal();
    });

    safeAddListener('btn-help', 'click', function() {
      showToast(getTrans('kanban_shortcuts_help') || 'Shortcuts: N=New, /=Search, Ctrl+S=Export, ?:Help');
    });

    // ===== BOARD SELECTOR =====
    safeAddListener('board-selector-btn', 'click', function(e) {
      e.stopPropagation();
      var dropdown = document.getElementById('board-list');
      if (dropdown) dropdown.classList.toggle('visible');
    });

    safeAddListener('board-selector-dropdown', 'click', function(e) {
      e.stopPropagation();
    });

    // ===== FILTER =====
    safeAddListener('filter-btn', 'click', function(e) {
      e.stopPropagation();
      var dropdown = document.getElementById('filter-dropdown-content');
      if (dropdown) dropdown.classList.toggle('visible');
    });

    safeAddListener('filter-dropdown-content', 'click', function(e) {
      e.stopPropagation();
    });

    // ===== ADD COLUMN =====
    safeAddListener('btn-add-column', 'click', function() {
      createColumn(getTrans('kanban_add_column') || 'New Column');
    });

    // ===== CARD MODAL =====
    safeAddListener('card-modal-close', 'click', closeCardModal);

    var cardOverlay = document.getElementById('card-modal-overlay');
    if (cardOverlay) cardOverlay.addEventListener('click', closeCardModal);

    safeAddListener('card-modal', 'click', function(e) {
      if (e.target.id === 'card-modal') closeCardModal();
    });

    var titleInput = document.getElementById('card-edit-title');
    if (titleInput) {
      titleInput.addEventListener('blur', function() {
        if (!state.editingCardId) return;
        var title = this.value.trim();
        if (title) updateCard(state.editingCardId, { title: title });
      });
      titleInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
      });
    }

    var descInput = document.getElementById('card-edit-description');
    if (descInput) {
      descInput.addEventListener('input', function() {
        if (!state.editingCardId) return;
        var desc = this.value;
        updateCard(state.editingCardId, { description: desc });
        if (state.mdPreviewMode) {
          var preview = document.getElementById('md-preview');
          if (preview) preview.innerHTML = parseMarkdown(desc);
        }
      });
      descInput.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        showFormatMenu(e.clientX, e.clientY, this);
      });
    }

    safeAddListener('md-toggle-btn', 'click', function() {
      state.mdPreviewMode = !state.mdPreviewMode;
      var dInput = document.getElementById('card-edit-description');
      var mdPreview = document.getElementById('md-preview');
      if (state.mdPreviewMode) {
        if (dInput) dInput.style.display = 'none';
        if (mdPreview) { mdPreview.style.display = ''; mdPreview.innerHTML = parseMarkdown(dInput ? dInput.value : ''); }
        this.classList.add('active');
      } else {
        if (dInput) dInput.style.display = '';
        if (mdPreview) mdPreview.style.display = 'none';
        this.classList.remove('active');
      }
    });

    safeAddListener('card-edit-due-date', 'change', function() {
      if (!state.editingCardId) return;
      updateCard(state.editingCardId, { dueDate: this.value || null });
      renderBoard();
    });

    safeAddListener('card-edit-due-date', 'keydown', function(e) {
      if (e.key === 'Enter') { this.blur(); }
    });

    safeAddListener('btn-clear-due', 'click', function() {
      var dueInput = document.getElementById('card-edit-due-date');
      if (dueInput) {
        dueInput.value = '';
        dueInput.dispatchEvent(new Event('change'));
      }
    });

    // ===== PRIORITY BUTTONS =====
    document.querySelectorAll('.priority-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var pri = parseInt(this.dataset.priority);
        state.selectedPriority = pri;
        updatePrioritySelector();
        if (state.editingCardId) {
          updateCard(state.editingCardId, { priority: pri });
          renderBoard();
        }
      });
    });

    // ===== COLOR SWATCHES =====
    document.querySelectorAll('.color-swatch').forEach(function(swatch) {
      swatch.addEventListener('click', function() {
        var color = this.dataset.color;
        state.selectedColor = color;
        updateColorPicker();
        if (state.editingCardId) {
          updateCard(state.editingCardId, { color: color || '' });
          renderBoard();
        }
      });
    });

    // ===== SUBTASKS =====
    safeAddListener('btn-add-subtask', 'click', function() {
      var input = document.getElementById('subtask-input');
      if (!input) return;
      var text = input.value.trim();
      if (text && state.editingCardId) {
        addSubtask(state.editingCardId, text);
        var result = getCard(state.editingCardId);
        if (result) renderSubtaskList(result.card);
        input.value = '';
        renderBoard();
      }
    });

    safeAddListener('subtask-input', 'keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var btn = document.getElementById('btn-add-subtask');
        if (btn) btn.click();
      }
    });

    // ===== ASSIGNMENTS =====
    safeAddListener('btn-add-assignment', 'click', function() {
      var typeInput = document.createElement('input');
      typeInput.type = 'text';
      typeInput.className = 'assignment-input';
      typeInput.placeholder = 'Type';

      var valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.className = 'assignment-input';
      valueInput.placeholder = 'Value';

      var removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove-assignment';
      removeBtn.innerHTML = '<i class="fa fa-times"></i>';

      var row = document.createElement('div');
      row.className = 'assignment-row';
      row.dataset.asnId = 'new';
      row.appendChild(typeInput);
      row.appendChild(valueInput);
      row.appendChild(removeBtn);

      var container = document.getElementById('card-edit-assignments');
      if (container) {
        container.appendChild(row);
        typeInput.focus();
      }

      var saveAssignment = function() {
        var typeVal = typeInput.value.trim();
        var valVal = valueInput.value.trim();
        if (typeVal && valVal && state.editingCardId) {
          addAssignment(state.editingCardId, typeVal, valVal);
          var result = getCard(state.editingCardId);
          if (result) renderCardEditAssignments(result.card);
          row.remove();
          renderBoard();
        }
      };

      typeInput.addEventListener('blur', function() { valueInput.focus(); });
      typeInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); valueInput.focus(); } });
      valueInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); saveAssignment(); } });
      removeBtn.addEventListener('click', function() { row.remove(); });
    });

    // ===== LABELS IN MODAL =====
    safeAddListener('btn-show-labels', 'click', function() {
      var picker = document.getElementById('label-picker');
      if (state.editingCardId && picker) {
        renderLabelPicker(state.editingCardId);
        if (picker.style.display === 'none' || !picker.style.display) {
          picker.style.display = 'block';
          state.labelPickerOpen = true;
        } else {
          picker.style.display = 'none';
          state.labelPickerOpen = false;
        }
      }
    });

    // ===== CARD MODAL FOOTER =====
    safeAddListener('card-delete-btn', 'click', function() {
      if (!state.editingCardId) return;
      var result = getCard(state.editingCardId);
      if (result && confirm(getTrans('kanban_delete_confirm') || 'Delete this card?')) {
        deleteCard(state.editingCardId);
        closeCardModal();
        showToast(getTrans('kanban_card_deleted') || 'Card deleted');
      }
    });

    safeAddListener('btn-archive-card', 'click', function() {
      if (state.editingCardId) {
        archiveCard(state.editingCardId);
      }
    });

    safeAddListener('btn-duplicate-card', 'click', function() {
      if (state.editingCardId) {
        duplicateCard(state.editingCardId);
      }
    });

    safeAddListener('btn-save-card', 'click', function() {
      closeCardModal();
      showToast(getTrans('kanban_save') || 'Card saved');
    });

    // ===== LABEL MODAL =====
    safeAddListener('label-modal-close', 'click', closeLabelModal);

    var labelOverlay = document.getElementById('label-modal-overlay');
    if (labelOverlay) labelOverlay.addEventListener('click', closeLabelModal);

    safeAddListener('label-modal', 'click', function(e) {
      if (e.target.id === 'label-modal') closeLabelModal();
    });

    safeAddListener('btn-add-label-modal', 'click', function() {
      var text = prompt(getTrans('kanban_label_name') || 'Label name:');
      if (text) {
        var color = prompt(getTrans('kanban_label_color') || 'Color (hex):', '#6d4aff');
        if (!color) color = '#6d4aff';
        createLabel(text, color);
        renderLabelManageList();
        renderFilterDropdown();
      }
    });

    // ===== STATS MODAL =====
    safeAddListener('btn-close-stats', 'click', closeStatsModal);

    safeAddListener('stats-modal', 'click', function(e) {
      if (e.target.id === 'stats-modal') closeStatsModal();
    });

    // ===== EXPORT OPTIONS =====
    safeAddListener('export-csv', 'click', exportCSV);
    safeAddListener('export-full', 'click', exportData);

    // ===== SEARCH =====
    var searchInput = document.querySelector('.kanban-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        state.searchQuery = this.value;
        applySearchFilter();
      });
    }

    var searchClear = document.querySelector('.kanban-search-clear');
    if (searchClear) {
      searchClear.addEventListener('click', function() {
        var sInput = document.querySelector('.kanban-search-input');
        if (sInput) {
          sInput.value = '';
          state.searchQuery = '';
          sInput.dispatchEvent(new Event('input'));
        }
      });
    }

    // ===== COLUMN TITLE EDIT =====
    safeAddListener('column-title-edit', 'keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
    });

    // ===== GLOBAL CLICK: CLOSE MENUS =====
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

    // ===== ESCAPE KEY (GLOBAL) =====
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeCardModal();
        closeLabelModal();
        closeStatsModal();
        hideAllMenus();
      }
    });

    // ===== INIT UI =====
    renderFilterDropdown();
    setupKeyboardShortcuts();
    toggleEmptyState();

    logActivity('app_loaded', 'Kanban app initialized');
  }

  function toggleEmptyState() {
    var empty = document.getElementById('kanban-empty-state');
    var area = document.getElementById('kanban-board-area');
    if (!empty || !area) return;

    if (state.boards.length === 0) {
      empty.style.display = '';
      area.style.display = 'none';
    } else {
      empty.style.display = 'none';
      area.style.display = '';
    }
  }

  function applyTranslations() {
    var lang = getCurrentLang();
    var t = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[lang]) || {};

    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.dataset.i18n;
      if (t[key]) el.textContent = t[key];
    });

    var btnAdd = document.querySelector('.btn-add-card');
    if (btnAdd) btnAdd.textContent = (t.kanban_add_card || 'Add Card');

    var placeholder = document.querySelector('.add-column-placeholder');
    if (placeholder) placeholder.innerHTML = '<i class="fa fa-plus"></i> ' + (t.kanban_add_column || 'Add Column');

    document.querySelectorAll('.btn-confirm-add-card').forEach(function(btn) {
      btn.textContent = t.kanban_add || 'Add';
    });
    document.querySelectorAll('.btn-cancel-add-card').forEach(function(btn) {
      btn.textContent = t.kanban_cancel || 'Cancel';
    });
  }

  window.kanbanApp = {
    init: init,
    exportData: exportData,
    importData: importData,
    openCardModal: openCardModal,
    closeCardModal: closeCardModal,
    openStatsModal: openStatsModal,
    createBoard: createBoard,
    createColumn: createColumn,
    createCard: createCard,
    getCurrentBoard: getCurrentBoard,
    getTrans: getTrans
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();