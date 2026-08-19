// ============================================
// orOS Kanban — Full Implementation
// Privacy-first, offline, vanilla JavaScript
// Features: Multi-board, DnD cards/columns,
// labels, due dates, assignments, search, filters,
// import/export, auto-save, persistent settings
// ============================================

(function() {
  'use strict';

  // ========== STORAGE KEYS ==========
  var STORAGE_KEY = 'oros_kanban_data';
  var SETTINGS_KEY = 'oros_kanban_settings';

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
    settings: {
      autoSave: false,
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

  // ========== ID GENERATOR ==========
  function genId(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // ========== HELPER: i18n ==========
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

    // Load settings
    try {
      var settingsRaw = localStorage.getItem(SETTINGS_KEY);
      if (settingsRaw) {
        state.settings = Object.assign({}, state.settings, JSON.parse(settingsRaw));
      }
    } catch(e) {}

    // Ensure default labels exist
    if (state.labels.length === 0) {
      state.labels = DEFAULT_LABELS.slice();
    }

    // Trigger i18n after load
    setTimeout(function() {
      triggerI18n();
    }, 100);
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        boards: state.boards,
        labels: state.labels
      }));
      
      // Auto-save to file if enabled
      if (state.settings.autoSave) {
        scheduleAutoSave();
      }
    } catch(e) {
      showToast('Storage limit reached. Try exporting and deleting old boards.');
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch(e) {}
  }

  // ========== AUTO-SAVE ==========
  var autoSaveTimer = null;
  
  function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(function() {
      doAutoSave();
    }, 5000); // 5 seconds delay after changes
  }

  function doAutoSave() {
    var board = getCurrentBoard();
    if (!board) return;
    
    var exportObj = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      board: board,
      labels: state.labels
    };
    
    var jsonStr = JSON.stringify(exportObj, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json' });
    
    // Store blob URL for quick download
    if (state.settings.lastExportUrl) {
      URL.revokeObjectURL(state.settings.lastExportUrl);
    }
    state.settings.lastExportUrl = URL.createObjectURL(blob);
    saveSettings();
    
    // Optionally show subtle indicator
    var btn = document.getElementById('btn-autosave');
    if (btn) {
      btn.classList.add('autosave-active');
      setTimeout(function() { btn.classList.remove('autosave-active'); }, 500);
    }
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

  function createBoard(title) {
    var board = {
      id: genId('board'),
      title: title || 'Untitled Board',
      order: state.boards.length,
      columns: []
    };

    // Default template: 3 columns
    board.columns.push({
      id: genId('col'),
      title: 'To Do',
      order: 0,
      cards: []
    });
    board.columns.push({
      id: genId('col'),
      title: 'Doing',
      order: 1,
      cards: []
    });
    board.columns.push({
      id: genId('col'),
      title: 'Done',
      order: 2,
      cards: []
    });

    state.boards.push(board);
    state.currentBoardId = board.id;
    saveData();
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

    // Re-order remaining
    state.boards.forEach(function(b, i) { b.order = i; });

    // Switch to next board
    if (state.currentBoardId === boardId) {
      state.currentBoardId = state.boards.length > 0 ? state.boards[0].id : null;
    }

    saveData();
    renderAll();
    showToast(getCurrentLang() === 'el' ? 'Το board διαγράφηκε' : 'Board deleted');
  }

  function renameBoard(boardId, newTitle) {
    var board = state.boards.find(function(b) { return b.id === boardId; });
    if (board) {
      board.title = newTitle;
      saveData();
      renderAll();
    }
  }

  function switchBoard(boardId) {
    state.currentBoardId = boardId;
    renderAll();
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

    // Re-order
    board.columns.forEach(function(c, i) { c.order = i; });

    saveData();
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
      dueDate: null,
      created: Date.now(),
      modified: Date.now(),
      order: col.cards.length
    };

    col.cards.push(card);
    saveData();
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
  }

  function moveCard(cardId, fromColId, toColId, toIndex) {
    var board = getCurrentBoard();
    if (!board) return;
    var fromCol = getColumn(board, fromColId);
    var toCol = getColumn(board, toColId);
    if (!fromCol || !toCol) return;

    var card = fromCol.cards.find(function(c) { return c.id === cardId; });
    if (!card) return;

    // Remove from source
    var fromIdx = fromCol.cards.indexOf(card);
    fromCol.cards.splice(fromIdx, 1);

    // Insert into target
    if (toIndex === undefined || toIndex === null) {
      toIndex = toCol.cards.length;
    }
    toCol.cards.splice(toIndex, 0, card);

    // Re-order both columns
    fromCol.cards.forEach(function(c, i) { c.order = i; });
    toCol.cards.forEach(function(c, i) { c.order = i; });

    saveData();
  }

  // ========== ASSIGNMENT OPERATIONS ==========
  function addAssignment(cardId, type, value) {
    var result = getCard(cardId);
    if (!result) return;
    var card = result.card;
    
    var assignment = {
      id: genId('asn'),
      type: type,
      value: value
    };
    
    card.assignments = card.assignments || [];
    card.assignments.push(assignment);
    saveData();
  }

  function updateAssignment(cardId, asnId, updates) {
    var result = getCard(cardId);
    if (!result) return;
    var card = result.card;
    if (!card.assignments) return;
    
    var asn = card.assignments.find(function(a) { return a.id === asnId; });
    if (asn) {
      for (var key in updates) {
        asn[key] = updates[key];
      }
      saveData();
    }
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
    var label = {
      id: genId('lbl'),
      color: color || '#6d4aff',
      text: text || 'label'
    };
    state.labels.push(label);
    saveData();
    return label;
  }

  function deleteLabel(labelId) {
    var idx = state.labels.findIndex(function(l) { return l.id === labelId; });
    if (idx === -1) return;
    state.labels.splice(idx, 1);

    // Remove from all cards
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
      // Update all cards with this label
      state.boards.forEach(function(board) {
        board.columns.forEach(function(col) {
          col.cards.forEach(function(card) {
            var cardLbl = card.labels.find(function(l) { return l.id === labelId; });
            if (cardLbl) {
              cardLbl.text = newText;
            }
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
      if (label) {
        card.labels.push({ id: label.id, color: label.color, text: label.text });
      }
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
      nameEl.textContent = getTrans('kanban_empty_title');
      return;
    }

    boards.forEach(function(board) {
      var item = document.createElement('div');
      item.className = 'board-list-item';
      if (board.id === state.currentBoardId) item.classList.add('active');

      var totalCards = board.columns.reduce(function(sum, col) {
        return sum + col.cards.length;
      }, 0);

      item.innerHTML =
        '<span class="board-list-item-name" title="' + escapeHtml(board.title) + '">' +
          escapeHtml(board.title) +
        '</span>' +
        '<span class="board-list-item-count">' + totalCards + '</span>' +
        '<button class="board-list-item-delete" title="Delete">' +
          '<i class="fa fa-trash-o"></i>' +
        '</button>';

      item.addEventListener('click', function(e) {
        if (e.target.closest('.board-list-item-delete')) return;
        switchBoard(board.id);
        closeBoardSelector();
      });

      var delBtn = item.querySelector('.board-list-item-delete');
      if (delBtn) {
        delBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          deleteBoard(board.id);
        });
      }

      dropdown.appendChild(item);
    });

    var current = getCurrentBoard();
    if (current) {
      nameEl.textContent = current.title;
    }
  }

  function renderBoard() {
    var container = document.getElementById('kanban-columns');
    if (!container) return;

    var board = getCurrentBoard();

    if (!board || board.columns.length === 0) {
      container.innerHTML = '';
      if (board) {
        var placeholder = document.createElement('div');
        placeholder.className = 'add-column-placeholder';
        placeholder.innerHTML = '<i class="fa fa-plus"></i> ' + getTrans('kanban_add_column');
        placeholder.addEventListener('click', function() {
          createColumn('New Column');
        });
        container.appendChild(placeholder);
      }
      return;
    }

    board.columns.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    container.innerHTML = '';

    board.columns.forEach(function(col) {
      container.appendChild(renderColumn(col));
    });

    var addPlaceholder = document.createElement('div');
    addPlaceholder.className = 'add-column-placeholder';
    addPlaceholder.innerHTML = '<i class="fa fa-plus"></i> ' + getTrans('kanban_add_column');
    addPlaceholder.addEventListener('click', function() {
      createColumn('New Column');
    });
    container.appendChild(addPlaceholder);

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

    var countEl = document.createElement('span');
    countEl.className = 'column-card-count';
    countEl.textContent = col.cards.length;

    var actions = document.createElement('div');
    actions.className = 'column-actions';

    var addBtn = document.createElement('button');
    addBtn.className = 'column-action-btn add';
    addBtn.innerHTML = '<i class="fa fa-plus"></i>';
    addBtn.title = 'Add card';

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'column-action-btn delete';
    deleteBtn.innerHTML = '<i class="fa fa-trash-o"></i>';
    deleteBtn.title = 'Delete column';

    actions.appendChild(addBtn);
    actions.appendChild(deleteBtn);

    header.appendChild(titleEl);
    header.appendChild(countEl);
    header.appendChild(actions);

    var cardsEl = document.createElement('div');
    cardsEl.className = 'column-cards';
    cardsEl.dataset.colId = col.id;

    col.cards.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    col.cards.forEach(function(card) {
      cardsEl.appendChild(renderCard(card, col.id));
    });

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

    var addCardBtnArea = document.createElement('div');
    addCardBtnArea.className = 'column-add-card';

    var addCardBtn = document.createElement('button');
    addCardBtn.className = 'btn-add-card';
    addCardBtn.innerHTML = '<i class="fa fa-plus"></i> ' + (getTrans('kanban_add_card') || 'Add Card');

    addCardBtnArea.appendChild(addCardBtn);

    colEl.appendChild(header);
    colEl.appendChild(cardsEl);
    colEl.appendChild(addCardBtnArea);
    colEl.appendChild(addCardArea);

    // ===== EVENT LISTENERS =====

    titleEl.addEventListener('click', function() {
      var rect = titleEl.getBoundingClientRect();
      var editInput = document.getElementById('column-title-edit');
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
        if (newTitle && newTitle !== col.title) {
          renameColumn(col.id, newTitle);
        }
        editInput.style.display = 'none';
        editInput.removeEventListener('blur', finishEdit);
        editInput.removeEventListener('keydown', onKeydown);
        state.editingColumnId = null;
      }

      function onKeydown(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          finishEdit();
        } else if (e.key === 'Escape') {
          editInput.style.display = 'none';
          editInput.removeEventListener('blur', finishEdit);
          editInput.removeEventListener('keydown', onKeydown);
          state.editingColumnId = null;
        }
      }

      editInput.addEventListener('blur', finishEdit);
      editInput.addEventListener('keydown', onKeydown);
    });

    addBtn.addEventListener('click', function() {
      toggleAddCardInput(addCardBtnArea, addCardArea, addCardInput);
    });

    addCardBtn.addEventListener('click', function() {
      toggleAddCardInput(addCardBtnArea, addCardArea, addCardInput);
    });

    confirmBtn.addEventListener('click', function() {
      var title = addCardInput.value.trim();
      if (title) {
        createCard(col.id, title);
      }
      addCardInput.value = '';
      addCardInput.focus();
    });

    cancelBtn.addEventListener('click', function() {
      addCardInput.value = '';
      addCardArea.classList.remove('visible');
      addCardBtnArea.style.display = 'block';
    });

    addCardInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        confirmBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    });

    addCardInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.max(36, this.scrollHeight) + 'px';
    });

    deleteBtn.addEventListener('click', function() {
      deleteColumn(col.id);
    });

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
      document.querySelectorAll('.kanban-column.drop-target').forEach(function(el) {
        el.classList.remove('drop-target');
      });
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
        var midX = rect.left + rect.width / 2;
        var placeAfter = e.clientX > midX;

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
        if (!placeholder) {
          placeholder = document.createElement('div');
          placeholder.className = 'drag-placeholder';
        }

        if (afterEl == null) {
          cardsEl.appendChild(placeholder);
        } else {
          cardsEl.insertBefore(placeholder, afterEl);
        }
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
        if (afterEl == null) {
          toIndex = col.cards.length;
        } else {
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

        if (fromColId) {
          moveCard(cardId, fromColId, toColId, toIndex);
          renderBoard();
        }
      }
    });

    return colEl;
  }

  function renderCard(card, colId) {
    var cardEl = document.createElement('div');
    cardEl.className = 'kanban-card';
    cardEl.dataset.cardId = card.id;
    cardEl.draggable = true;

    var inner = '';

    // Body content (title, due date, description)
    var bodyContent = '<div class="card-body-content">';
    bodyContent += '<div class="card-title">' + escapeHtml(card.title) + '</div>';

    // Due date
    if (card.dueDate) {
      var dueClass = '';
      var dueText = formatDate(card.dueDate);
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var due = new Date(card.dueDate);
      due.setHours(0, 0, 0, 0);

      if (due < today) {
        dueClass = ' overdue';
        dueText += ' (overdue)';
      } else if (due.getTime() === today.getTime()) {
        dueClass = ' today';
      }

      bodyContent += '<div class="card-due-date' + dueClass + '"><i class="fa fa-calendar"></i> ' + dueText + '</div>';
    }

    // Description indicator
    if (card.description) {
      bodyContent += '<div class="card-description-indicator"><i class="fa fa-align-left"></i></div>';
    }

    // Assignments (NEW)
    if (card.assignments && card.assignments.length > 0) {
      bodyContent += '<div class="card-assignments">';
      card.assignments.forEach(function(asn) {
        bodyContent += '<div class="card-assignment">';
        bodyContent += '<span class="assignment-type">' + escapeHtml(asn.type) + ':</span>';
        bodyContent += '<span class="assignment-value">' + escapeHtml(asn.value) + '</span>';
        bodyContent += '</div>';
      });
      bodyContent += '</div>';
    }

    bodyContent += '</div>';
    inner += bodyContent;

    // Labels at bottom
    if (card.labels && card.labels.length > 0) {
      inner += '<div class="card-labels">';
      card.labels.forEach(function(lbl) {
        inner += '<span class="card-label" style="background:' + lbl.color + '">' + escapeHtml(lbl.text) + '</span>';
      });
      inner += '</div>';
    }

    cardEl.innerHTML = inner;

    // ===== CARD EVENTS =====
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
      document.querySelectorAll('.column-cards.drop-target').forEach(function(el) {
        el.classList.remove('drop-target');
      });
    });

    return cardEl;
  }

  function getCardAfter(container, y) {
    var cards = [...container.querySelectorAll('.kanban-card:not(.dragging)')];

    return cards.reduce(function(closest, child) {
      var box = child.getBoundingClientRect();
      var offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
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

    var modal = document.getElementById('card-modal');
    var titleInput = document.getElementById('card-edit-title');
    var descInput = document.getElementById('card-edit-description');
    var dueInput = document.getElementById('card-edit-due-date');
    var labelsContainer = document.getElementById('card-edit-labels');
    var assignmentsContainer = document.getElementById('card-edit-assignments');
    var metaCreated = document.getElementById('card-meta-created');

    titleInput.value = card.title;
    descInput.value = card.description || '';
    dueInput.value = card.dueDate || '';
    metaCreated.textContent = 'Created: ' + new Date(card.created).toLocaleDateString();

    renderCardEditLabels(card);
    renderCardEditAssignments(card);

    modal.classList.add('visible');

    setTimeout(function() { titleInput.focus(); }, 50);
  }

  function closeCardModal() {
    var modal = document.getElementById('card-modal');
    modal.classList.remove('visible');
    state.editingCardId = null;

    var picker = document.getElementById('label-picker');
    if (picker) picker.style.display = 'none';
    state.labelPickerOpen = false;

    renderBoard();
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

    // ========== ASSIGNMENTS UI ==========
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
      typeInput.type = 'text';
      typeInput.className = 'assignment-input';
      typeInput.value = asn.type || '';
      typeInput.placeholder = 'Type (e.g. Illustration)';
      typeInput.dataset.field = 'type';

      var valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.className = 'assignment-input';
      valueInput.value = asn.value || '';
      valueInput.placeholder = 'Value (e.g. John Doe)';
      valueInput.dataset.field = 'value';

      var removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove-assignment';
      removeBtn.innerHTML = '<i class="fa fa-times"></i>';
      removeBtn.title = 'Remove assignment';

      // Save on blur
      typeInput.addEventListener('blur', function() {
        updateAssignment(state.editingCardId, asn.id, { type: this.value.trim() });
      });
      valueInput.addEventListener('blur', function() {
        updateAssignment(state.editingCardId, asn.id, { value: this.value.trim() });
      });

      // Enter key moves to next field
      typeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); valueInput.focus(); }
      });
      valueInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
      });

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
            if ((asn.type || '').toLowerCase().includes(query) ||
                (asn.value || '').toLowerCase().includes(query)) {
              asnMatch = true;
            }
          });
        }
        matchesSearch = titleMatch || descMatch || asnMatch;
      }

      if (state.activeFilters.length > 0) {
        matchesFilter = card.labels.some(function(lbl) {
          return state.activeFilters.includes(lbl.id);
        });
      }

      if (matchesSearch && matchesFilter) {
        cardEl.classList.remove('filtered-out');
      } else {
        cardEl.classList.add('filtered-out');
      }
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
        if (this.checked) {
          if (!state.activeFilters.includes(lbl.id)) {
            state.activeFilters.push(lbl.id);
          }
        } else {
          state.activeFilters = state.activeFilters.filter(function(id) { return id !== lbl.id; });
        }
        applySearchFilter();
        updateFilterBtnState();
      });

      item.appendChild(dot);
      item.appendChild(text);
      item.appendChild(checkbox);
      container.appendChild(item);
    });

    updateFilterBtnState();
  }

  function updateFilterBtnState() {
    var btn = document.getElementById('filter-btn');
    if (!btn) return;
    if (state.activeFilters.length > 0) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
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
        // Update all cards with this label
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
        if (newText && newText !== lbl.text) {
          renameLabel(lbl.id, newText);
          renderBoard();
          renderFilterDropdown();
        }
      });
      textInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') this.blur();
      });

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'label-manage-delete';
      deleteBtn.innerHTML = '<i class="fa fa-trash-o"></i>';
      deleteBtn.title = 'Delete label';
      deleteBtn.addEventListener('click', function() {
        var msg = getCurrentLang() === 'el'
          ? 'Διαγραφή ετικέτας "' + lbl.text + '";'
          : 'Delete label "' + lbl.text + '"?';
        if (confirm(msg)) {
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

  // ========== IMPORT / EXPORT ==========
  function exportData() {
    var board = getCurrentBoard();
    if (!board) {
      showToast(getTrans('kanban_no_board') || 'No board to export');
      return;
    }

    var exportObj = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      board: board,
      labels: state.labels
    };

    var blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'kanban_' + board.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' +
                 new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Remember export action
    state.settings.lastExportPath = a.download;
    saveSettings();

    showToast(getTrans('toast_downloaded') || 'Exported');
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);

        // Support our own format (with "board" key) or generic board (direct object)
        var boardData = null;
        var labelsData = null;

        if (data.board && data.board.id) {
          boardData = data.board;
          labelsData = data.labels;
        } else if (data.id && data.columns) {
          boardData = data;
          labelsData = data.labels || [];
        } else if (data.boards && Array.isArray(data.boards)) {
          // Bulk import multiple boards
          data.boards.forEach(function(b) {
            var existingB = state.boards.find(function(ex) { return ex.id === b.id; });
            if (existingB) b.id = genId('board');
            b.order = state.boards.length;
            state.boards.push(b);
          });
          if (data.labels) {
            data.labels.forEach(function(lbl) {
              var exists = state.labels.find(function(l) {
                return l.text === lbl.text && l.color === lbl.color;
              });
              if (!exists) {
                state.labels.push({ id: genId('lbl'), color: lbl.color, text: lbl.text });
              }
            });
          }
          state.currentBoardId = state.boards.length > 0 ? state.boards[state.boards.length - 1].id : null;
          saveData();
          renderAll();
          showToast((getTrans('notes_imported') || 'Imported') + ' (' + data.boards.length + ' boards)');
          return;
        } else {
          showToast(getTrans('notes_invalid_file') || 'Invalid file');
          return;
        }

        if (!boardData || !boardData.id) {
          showToast(getTrans('notes_invalid_file') || 'Invalid file');
          return;
        }

        // Check for duplicate ID
        var existing = state.boards.find(function(b) { return b.id === boardData.id; });
        if (existing) {
          boardData.id = genId('board');
        }

        boardData.order = state.boards.length;

        // Merge labels
        if (labelsData) {
          labelsData.forEach(function(lbl) {
            var exists = state.labels.find(function(l) {
              return l.text === lbl.text && l.color === lbl.color;
            });
            if (!exists) {
              state.labels.push({ id: genId('lbl'), color: lbl.color, text: lbl.text });
            }
          });
        }

        state.boards.push(boardData);
        state.currentBoardId = boardData.id;
        saveData();
        renderAll();
        showToast(getTrans('toast_opened') || 'Board imported');
      } catch(err) {
        showToast(getTrans('notes_import_failed') || 'Failed to import');
      }
    };
    reader.readAsText(file);
  }

  // ========== EMPTY STATE ==========
  function toggleEmptyState() {
    var emptyState = document.getElementById('kanban-empty-state');
    var boardArea = document.getElementById('kanban-board-area');
    var toolbar = document.getElementById('kanban-toolbar');

    if (state.boards.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      if (boardArea) boardArea.style.display = 'none';
      if (toolbar) toolbar.style.display = 'none';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      if (boardArea) boardArea.style.display = '';
      if (toolbar) toolbar.style.display = '';
    }
  }

  // ========== UTILITY ==========
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[d.getMonth()] + ' ' + d.getDate();
  }

  function closeBoardSelector() {
    var dropdown = document.getElementById('board-selector-dropdown');
    if (dropdown) dropdown.classList.remove('visible');
  }

  function triggerI18n() {
    // Dispatch event so global i18n system re-applies translations
    window.dispatchEvent(new CustomEvent('oros-language-changed'));
    // Also manually translate any data-i18n attributes in kanban
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var val = getTrans(key);
      if (val && val !== key) {
        el.textContent = val;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var val = getTrans(key);
      if (val && val !== key) {
        el.setAttribute('placeholder', val);
      }
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-aria');
      var val = getTrans(key);
      if (val && val !== key) {
        el.setAttribute('aria-label', val);
      }
    });
  }

  // ========== SETUP ==========
  function setup() {

    // ===== Board Selector =====
    var boardBtn = document.getElementById('board-selector-btn');
    var boardDropdown = document.getElementById('board-selector-dropdown');

    if (boardBtn && boardDropdown) {
      boardBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        boardDropdown.classList.toggle('visible');
      });

      document.addEventListener('click', function() {
        boardDropdown.classList.remove('visible');
      });

      boardDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    }

    // Add board from dropdown
    var addBoardDropdownBtn = document.getElementById('btn-add-board-dropdown');
    if (addBoardDropdownBtn) {
      addBoardDropdownBtn.addEventListener('click', function() {
        var name = prompt(getTrans('kanban_board_name') || 'Board name:', 'My Board');
        if (name && name.trim()) {
          createBoard(name.trim());
          closeBoardSelector();
        }
      });
    }

    // ===== Add Column =====
    var addColBtn = document.getElementById('btn-add-column');
    if (addColBtn) {
      addColBtn.addEventListener('click', function() {
        var name = prompt(getTrans('kanban_column_name') || 'Column name:', 'New Column');
        if (name && name.trim()) {
          createColumn(name.trim());
        }
      });
    }

    // ===== Auto-save toggle =====
    var autoSaveBtn = document.getElementById('btn-autosave');
    if (autoSaveBtn) {
      // Restore active state
      if (state.settings.autoSave) {
        autoSaveBtn.classList.add('autosave-active');
      }
      autoSaveBtn.addEventListener('click', function() {
        state.settings.autoSave = !state.settings.autoSave;
        saveSettings();
        if (state.settings.autoSave) {
          autoSaveBtn.classList.add('autosave-active');
          showToast(getCurrentLang() === 'el' ? 'Αυτόματη αποθήκευση ενεργή' : 'Auto-save enabled');
          doAutoSave();
        } else {
          autoSaveBtn.classList.remove('autosave-active');
          showToast(getCurrentLang() === 'el' ? 'Αυτόματη αποθήκευση ανενεργή' : 'Auto-save disabled');
        }
      });
    }

    // ===== Import =====
    var importBtn = document.getElementById('btn-import');
    var importInput = document.getElementById('import-file-input');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', function() {
        importInput.click();
      });
      importInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
          importData(this.files[0]);
          state.settings.lastImportPath = this.files[0].name;
          saveSettings();
          this.value = '';
        }
      });
    }

    // ===== Export =====
    var exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportData);
    }

    // ===== Search =====
    var searchInput = document.getElementById('kanban-search');
    var searchClear = document.getElementById('kanban-search-clear');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        state.searchQuery = this.value;
        if (searchClear) {
          searchClear.style.display = this.value ? 'block' : 'none';
        }
        applySearchFilter();
      });
    }
    if (searchClear) {
      searchClear.addEventListener('click', function() {
        if (searchInput) {
          searchInput.value = '';
          state.searchQuery = '';
          searchClear.style.display = 'none';
          applySearchFilter();
          searchInput.focus();
        }
      });
    }

    // ===== Filter Dropdown =====
    var filterBtn = document.getElementById('filter-btn');
    var filterDropdown = document.getElementById('filter-dropdown-content');
    if (filterBtn && filterDropdown) {
      filterBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        renderFilterDropdown();
        filterDropdown.classList.toggle('visible');
      });

      document.addEventListener('click', function() {
        filterDropdown.classList.remove('visible');
      });

      filterDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    }

    // ===== Card Modal =====
    var modalOverlay = document.getElementById('card-modal-overlay');
    var modalClose = document.getElementById('card-modal-close');
    var btnSaveCard = document.getElementById('btn-save-card');
    var btnDeleteCard = document.getElementById('btn-delete-card');

    if (modalOverlay) modalOverlay.addEventListener('click', closeCardModal);
    if (modalClose) modalClose.addEventListener('click', closeCardModal);

    if (btnSaveCard) {
      btnSaveCard.addEventListener('click', function() {
        if (!state.editingCardId) return;

        var titleInput = document.getElementById('card-edit-title');
        var descInput = document.getElementById('card-edit-description');
        var dueInput = document.getElementById('card-edit-due-date');

        // Gather assignments from DOM
        var result = getCard(state.editingCardId);
        if (result) {
          var card = result.card;
          card.assignments = [];
          var rows = document.querySelectorAll('#card-edit-assignments .assignment-row');
          rows.forEach(function(row) {
            var asnId = row.dataset.asnId;
            var typeVal = row.querySelector('[data-field="type"]').value.trim();
            var valVal = row.querySelector('[data-field="value"]').value.trim();
            if (typeVal || valVal) {
              card.assignments.push({ id: asnId, type: typeVal, value: valVal });
            }
          });
        }

        updateCard(state.editingCardId, {
          title: titleInput.value.trim() || 'Untitled Card',
          description: descInput.value.trim(),
          dueDate: dueInput.value || null
        });

        closeCardModal();
        showToast(getTrans('text_saved') || 'Saved');
      });
    }

    if (btnDeleteCard) {
      btnDeleteCard.addEventListener('click', function() {
        if (!state.editingCardId) return;
        var msg = getCurrentLang() === 'el' ? 'Διαγραφή κάρτας;' : 'Delete this card?';
        if (confirm(msg)) {
          deleteCard(state.editingCardId);
          closeCardModal();
          showToast(getCurrentLang() === 'el' ? 'Η κάρτα διαγράφηκε' : 'Card deleted');
        }
      });
    }

    // ===== Assignments: Add button =====
    var btnAddAssignment = document.getElementById('btn-add-assignment');
    if (btnAddAssignment) {
      btnAddAssignment.addEventListener('click', function() {
        if (!state.editingCardId) return;
        addAssignment(state.editingCardId, '', '');
        var result = getCard(state.editingCardId);
        if (result) renderCardEditAssignments(result.card);
        // Focus the type input of the new row
        var container = document.getElementById('card-edit-assignments');
        var lastRow = container.querySelector('.assignment-row:last-child [data-field="type"]');
        if (lastRow) lastRow.focus();
      });
    }

    // ===== Label Picker =====
    var btnAddLabel = document.getElementById('btn-add-label');
    var labelPicker = document.getElementById('label-picker');

    if (btnAddLabel && labelPicker) {
      btnAddLabel.addEventListener('click', function(e) {
        e.stopPropagation();
        if (!state.editingCardId) return;

        if (state.labelPickerOpen) {
          labelPicker.style.display = 'none';
          state.labelPickerOpen = false;
        } else {
          renderLabelPicker(state.editingCardId);
          labelPicker.style.display = 'block';
          state.labelPickerOpen = true;
        }
      });

      document.addEventListener('click', function(e) {
        if (state.labelPickerOpen && !labelPicker.contains(e.target) && !btnAddLabel.contains(e.target)) {
          labelPicker.style.display = 'none';
          state.labelPickerOpen = false;
        }
      });
    }

    // New label creation in picker
    var labelPickerAdd = document.getElementById('label-picker-add');
    var labelPickerNew = document.getElementById('label-picker-new');
    var newLabelSave = document.getElementById('new-label-save');

    if (labelPickerAdd && labelPickerNew) {
      labelPickerAdd.addEventListener('click', function(e) {
        e.stopPropagation();
        labelPickerNew.style.display = labelPickerNew.style.display === 'none' ? 'flex' : 'none';
      });
    }

    if (newLabelSave) {
      newLabelSave.addEventListener('click', function() {
        var textInput = document.getElementById('new-label-text');
        var colorInput = document.getElementById('new-label-color');
        var text = textInput.value.trim();
        var color = colorInput.value;

        if (text) {
          createLabel(text, color);
          renderLabelPicker(state.editingCardId);
          renderFilterDropdown();
          textInput.value = '';
          labelPickerNew.style.display = 'none';
        }
      });

      var newLabelText = document.getElementById('new-label-text');
      if (newLabelText) {
        newLabelText.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            newLabelSave.click();
          }
        });
      }
    }

    // ===== Label Management Modal =====
    var labelModalOverlay = document.getElementById('label-modal-overlay');
    var labelModalClose = document.getElementById('label-modal-close');
    var btnAddLabelModal = document.getElementById('btn-add-label-modal');

    if (labelModalOverlay) labelModalOverlay.addEventListener('click', closeLabelModal);
    if (labelModalClose) labelModalClose.addEventListener('click', closeLabelModal);

    if (btnAddLabelModal) {
      btnAddLabelModal.addEventListener('click', function() {
        var text = prompt(getTrans('kanban_new_label') || 'New label name:', '');
        if (text && text.trim()) {
          createLabel(text.trim(), '#6d4aff');
          renderLabelManageList();
          renderFilterDropdown();
        }
      });
    }

    // ===== Create First Board =====
    var createFirstBtn = document.getElementById('btn-create-first-board');
    if (createFirstBtn) {
      createFirstBtn.addEventListener('click', function() {
        var name = prompt(getTrans('kanban_board_name') || 'Board name:', 'My Board');
        if (name && name.trim()) {
          createBoard(name.trim());
        } else {
          createBoard('My Board');
        }
      });
    }

    // ===== Keyboard Shortcuts =====
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        var modal = document.getElementById('card-modal');
        if (modal && modal.classList.contains('visible')) {
          closeCardModal();
          return;
        }
        var labelModal = document.getElementById('label-modal');
        if (labelModal && labelModal.classList.contains('visible')) {
          closeLabelModal();
          return;
        }
        closeBoardSelector();
        var filterDropdown = document.getElementById('filter-dropdown-content');
        if (filterDropdown) filterDropdown.classList.remove('visible');
        if (state.labelPickerOpen) {
          var picker = document.getElementById('label-picker');
          if (picker) picker.style.display = 'none';
          state.labelPickerOpen = false;
        }
      }

      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        exportData();
      }

      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        var name = prompt(getTrans('kanban_board_name') || 'Board name:', 'My Board');
        if (name && name.trim()) {
          createBoard(name.trim());
        }
      }
    });

    // ===== Language Change Listener =====
    window.addEventListener('oros-language-changed', function() {
      renderAll();
      renderFilterDropdown();
      // Re-translate static elements
      triggerI18n();
    });
  }

  // ========== INIT ==========
  function init() {
    loadData();
    setup();

    if (state.boards.length === 0) {
      toggleEmptyState();
    } else {
      state.currentBoardId = state.boards[0].id;
      renderAll();
    }

    // Apply saved auto-save state
    if (state.settings.autoSave) {
      var btn = document.getElementById('btn-autosave');
      if (btn) btn.classList.add('autosave-active');
    }
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();