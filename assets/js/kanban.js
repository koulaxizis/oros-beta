// ============================================
// orOS Kanban — Full Implementation v2
// FIXES: duplicate cards, i18n, install prompt,
// settings tab, pomodoro time, archive view
// ============================================

(function() {
  'use strict';

  // ========== STORAGE KEYS ==========
  var STORAGE_KEY = 'oros_kanban_data';
  var SETTINGS_KEY = 'oros_kanban_settings';

  // ========== LABEL COLOR PALETTE ==========
  var LABEL_COLORS = [
    '#c8a96e', '#81c784', '#64b5f6', '#ba68c8',
    '#ffb74d', '#4db6ac', '#f06292', '#7986cb',
    '#a1887f', '#90a4ae'
  ];

  // ========== STATE ==========
  var boards = [];
  var settings = { activeBoardId: null, pomodoroDuration: 25, pomodoroBreak: 5 };
  var draggedCard = null;
  var draggedCardFromList = null;
  var draggedList = null;
  var editingCardId = null;
  var editingCardListId = null;
  var editingBoardId = null;
  var showArchiveView = false;
  var deferredInstallPrompt = null;

  // Pomodoro state
  var pomoInterval = null;
  var pomoSecondsLeft = 25 * 60;
  var pomoRunning = false;
  var pomoIsBreak = false;
  var pomoCardRef = null;

  // ========== DOM ==========
  var boardEl = document.getElementById('kanban-board');
  var boardTabsEl = document.getElementById('board-tabs');
  var searchInput = document.getElementById('kanban-search');

  // ========== HELPERS ==========
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

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
    }, 3000);
  }

  function escapeXml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getLabelColor(text) {
    var hash = 0;
    for (var i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
  }

  function formatDate(dueDate) {
    if (!dueDate) return '';
    var d = new Date(dueDate);
    var now = new Date();
    var diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    var label;
    if (diffDays < 0) label = 'overdue';
    else if (diffDays <= 2) label = 'soon';
    else label = '';
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    return { text: day + '/' + month, cls: label };
  }

  // ========== TRANSLATE STATIC UI ==========
  function translateUI() {
    var lang = getCurrentLang();

    // Translate data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var val = getTrans(key);
      if (val && val !== key) el.textContent = val;
    });

    // Translate titles
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-title');
      var val = getTrans(key);
      if (val && val !== key) el.title = val;
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-ph');
      var val = getTrans(key);
      if (val && val !== key) el.placeholder = val;
    });

    // Translate select options
    document.querySelectorAll('option[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var val = getTrans(key);
      if (val && val !== key) el.textContent = val;
    });

    // Re-render board to pick up translated text
    renderBoardTabs();
    renderBoard();
    if (showArchiveView) renderArchiveView();
  }

  // ========== PERSISTENCE ==========
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function load() {
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(data)) boards = data;
    } catch(e) { boards = []; }

    try {
      var s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      if (s) {
        if (s.activeBoardId) settings.activeBoardId = s.activeBoardId;
        if (s.pomodoroDuration) settings.pomodoroDuration = s.pomodoroDuration;
        if (s.pomodoroBreak) settings.pomodoroBreak = s.pomodoroBreak;
      }
    } catch(e) {}

    if (boards.length === 0) {
      createDefaultBoard();
    }
    if (!settings.activeBoardId || !getBoard(settings.activeBoardId)) {
      settings.activeBoardId = boards[0].id;
    }
  }

  function createDefaultBoard() {
    var board = {
      id: uid(),
      title: 'My Board',
      lists: [
        { id: uid(), title: 'To Do', cards: [] },
        { id: uid(), title: 'In Progress', cards: [] },
        { id: uid(), title: 'Done', cards: [] }
      ]
    };
    boards.push(board);
    settings.activeBoardId = board.id;
    save();
  }

  // ========== DATA ACCESSORS ==========
  function getActiveBoard() { return getBoard(settings.activeBoardId); }

  function getBoard(id) {
    for (var i = 0; i < boards.length; i++) {
      if (boards[i].id === id) return boards[i];
    }
    return null;
  }

  function getList(board, listId) {
    for (var i = 0; i < board.lists.length; i++) {
      if (board.lists[i].id === listId) return board.lists[i];
    }
    return null;
  }

  function getCard(list, cardId) {
    for (var i = 0; i < list.cards.length; i++) {
      if (list.cards[i].id === cardId) return list.cards[i];
    }
    return null;
  }

  function findCard(cardId) {
    var board = getActiveBoard();
    if (!board) return null;
    for (var i = 0; i < board.lists.length; i++) {
      var card = getCard(board.lists[i], cardId);
      if (card) return { card: card, list: board.lists[i] };
    }
    return null;
  }

  function getAllArchivedCards() {
    var board = getActiveBoard();
    if (!board) return [];
    var result = [];
    for (var i = 0; i < board.lists.length; i++) {
      for (var j = 0; j < board.lists[i].cards.length; j++) {
        if (board.lists[i].cards[j].archived) {
          result.push({ card: board.lists[i].cards[j], list: board.lists[i] });
        }
      }
    }
    return result;
  }

  // ========== RENDERING — BOARD TABS ==========
  function renderBoardTabs() {
    boardTabsEl.innerHTML = '';
    for (var i = 0; i < boards.length; i++) {
      (function(b) {
        var tab = document.createElement('div');
        tab.className = 'board-tab' + (b.id === settings.activeBoardId ? ' active' : '');
        tab.innerHTML = '<span>' + escapeHtml(b.title) + '</span>';

        var delBtn = document.createElement('span');
        delBtn.className = 'board-tab-delete';
        delBtn.innerHTML = '×';
        delBtn.title = getTrans('kanban_delete');
        delBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          deleteBoard(b.id);
        });

        tab.appendChild(delBtn);
        tab.addEventListener('click', function() {
          settings.activeBoardId = b.id;
          save();
          renderBoardTabs();
          renderBoard();
        });

        tab.addEventListener('dblclick', function() {
          var newName = prompt(getTrans('kanban_add_board') + ':', b.title);
          if (newName && newName.trim()) {
            b.title = newName.trim();
            save();
            renderBoardTabs();
          }
        });

        boardTabsEl.appendChild(tab);
      })(boards[i]);
    }
  }

  // ========== RENDERING — BOARD ==========
  function renderBoard() {
    if (showArchiveView) {
      boardEl.style.display = 'none';
      renderArchiveView();
      return;
    }

    boardEl.style.display = '';
    var archiveView = document.getElementById('kanban-archive-view');
    if (archiveView) archiveView.style.display = 'none';

    var board = getActiveBoard();
    if (!board || board.lists.length === 0) {
      boardEl.innerHTML = '<div class="kanban-empty"><i class="fa fa-list"></i><p>' + getTrans('kanban_empty') + '</p></div>';
      return;
    }

    boardEl.innerHTML = '';

    for (var i = 0; i < board.lists.length; i++) {
      boardEl.appendChild(renderList(board.lists[i]));
    }

    // Add list placeholder
    var addListEl = document.createElement('div');
    addListEl.className = 'kanban-list';
    addListEl.style.background = 'transparent';
    addListEl.style.border = '1px dashed var(--border-color)';
    addListEl.style.display = 'flex';
    addListEl.style.alignItems = 'center';
    addListEl.style.justifyContent = 'center';
    addListEl.style.cursor = 'pointer';
    addListEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:16px;"><i class="fa fa-plus"></i>&nbsp; ' + getTrans('kanban_add_list') + '</div>';
    addListEl.addEventListener('click', addList);
    boardEl.appendChild(addListEl);
  }

  function renderList(list) {
    var listEl = document.createElement('div');
    listEl.className = 'kanban-list';
    listEl.dataset.listId = list.id;

    // Header
    var header = document.createElement('div');
    header.className = 'kanban-list-header';
    header.draggable = true;

    var titleEl = document.createElement('div');
    titleEl.className = 'kanban-list-title';
    titleEl.textContent = list.title;
    titleEl.contentEditable = 'true';
    titleEl.spellcheck = false;

    titleEl.addEventListener('focus', function() { titleEl.classList.add('editing'); });
    titleEl.addEventListener('blur', function() {
      titleEl.classList.remove('editing');
      var newTitle = titleEl.textContent.trim();
      if (newTitle && newTitle !== list.title) {
        list.title = newTitle;
        save();
      } else {
        titleEl.textContent = list.title;
      }
    });
    titleEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
    });

    var countEl = document.createElement('span');
    countEl.className = 'kanban-list-count';
    var visibleCards = list.cards.filter(function(c) { return !c.archived; });
    countEl.textContent = visibleCards.length;

    var actionsEl = document.createElement('div');
    actionsEl.className = 'kanban-list-actions';

    var addCardBtn = document.createElement('button');
    addCardBtn.className = 'mini-btn';
    addCardBtn.title = getTrans('kanban_add_card');
    addCardBtn.innerHTML = '<i class="fa fa-plus"></i>';
    addCardBtn.addEventListener('click', function(e) { e.stopPropagation(); addCardInput(list, cardsContainer); });

    var deleteListBtn = document.createElement('button');
    deleteListBtn.className = 'mini-btn';
    deleteListBtn.title = getTrans('kanban_delete');
    deleteListBtn.innerHTML = '<i class="fa fa-trash-o"></i>';
    deleteListBtn.addEventListener('click', function(e) { e.stopPropagation(); deleteList(list.id); });

    actionsEl.appendChild(addCardBtn);
    actionsEl.appendChild(deleteListBtn);
    header.appendChild(titleEl);
    header.appendChild(countEl);
    header.appendChild(actionsEl);

    header.addEventListener('dragstart', function(e) {
      draggedList = list;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'list:' + list.id);
    });
    header.addEventListener('dragend', function() { draggedList = null; });

    listEl.appendChild(header);

    // Cards container
    var cardsContainer = document.createElement('div');
    cardsContainer.className = 'kanban-cards';
    cardsContainer.dataset.listId = list.id;

    cardsContainer.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      listEl.classList.add('drag-over');
    });
    cardsContainer.addEventListener('dragleave', function(e) {
      if (e.relatedTarget && !listEl.contains(e.relatedTarget)) listEl.classList.remove('drag-over');
    });
    cardsContainer.addEventListener('drop', function(e) {
      e.preventDefault();
      listEl.classList.remove('drag-over');
      handleCardDrop(list, cardsContainer, e);
    });

    // Render cards
    var searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    for (var i = 0; i < list.cards.length; i++) {
      var card = list.cards[i];
      if (card.archived) continue;
      if (searchQuery) {
        var matches = card.title.toLowerCase().indexOf(searchQuery) !== -1 ||
                      (card.description && card.description.toLowerCase().indexOf(searchQuery) !== -1);
        if (!matches) continue;
      }
      cardsContainer.appendChild(renderCard(card, list));
    }

    listEl.appendChild(cardsContainer);

    // Add card button at bottom
    var addCardFooter = document.createElement('div');
    addCardFooter.className = 'kanban-add-card';
    addCardFooter.innerHTML = '<i class="fa fa-plus"></i>&nbsp; ' + getTrans('kanban_add_card');
    addCardFooter.addEventListener('click', function() { addCardInput(list, cardsContainer); });
    listEl.appendChild(addCardFooter);

    return listEl;
  }

  function renderCard(card, list) {
    var cardEl = document.createElement('div');
    cardEl.className = 'kanban-card priority-' + (card.priority || 'medium');
    if (card.archived) cardEl.classList.add('archived');
    cardEl.draggable = true;
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.listId = list.id;

    var titleDiv = document.createElement('div');
    titleDiv.className = 'kanban-card-title';
    titleDiv.textContent = card.title;
    cardEl.appendChild(titleDiv);

    if (card.description) {
      var descPreview = document.createElement('div');
      descPreview.className = 'kanban-card-desc-preview';
      descPreview.textContent = card.description;
      cardEl.appendChild(descPreview);
    }

    var meta = document.createElement('div');
    meta.className = 'kanban-card-meta';

    if (card.labels && card.labels.length > 0) {
      for (var i = 0; i < card.labels.length; i++) {
        var label = document.createElement('span');
        label.className = 'kanban-card-label';
        label.style.backgroundColor = card.labels[i].color;
        label.textContent = card.labels[i].text;
        meta.appendChild(label);
      }
    }

    if (card.dueDate) {
      var fd = formatDate(card.dueDate);
      var dueEl = document.createElement('span');
      dueEl.className = 'kanban-card-due' + (fd.cls ? ' ' + fd.cls : '');
      dueEl.innerHTML = '<i class="fa fa-calendar"></i>&nbsp;' + fd.text;
      meta.appendChild(dueEl);
    }

    if (card.timeSpent && card.timeSpent > 0) {
      var timeEl = document.createElement('span');
      timeEl.className = 'kanban-card-time';
      var mins = card.timeSpent;
      var display = mins >= 60 ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : mins + 'm';
      timeEl.innerHTML = '<i class="fa fa-clock-o"></i>&nbsp;' + display;
      meta.appendChild(timeEl);
    }

    if (meta.children.length > 0) cardEl.appendChild(meta);

    cardEl.addEventListener('dragstart', function(e) {
      draggedCard = card;
      draggedCardFromList = list;
      cardEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'card:' + card.id);
    });
    cardEl.addEventListener('dragend', function() {
      cardEl.classList.remove('dragging');
      draggedCard = null;
      draggedCardFromList = null;
    });

    cardEl.addEventListener('click', function(e) {
      if (e.target.closest('.kanban-card-label')) return;
      openCardDetail(card.id, list.id);
    });

    return cardEl;
  }

  // ========== ARCHIVE VIEW ==========
  function renderArchiveView() {
    var archiveContainer = document.getElementById('kanban-archive-view');
    var cardsList = document.getElementById('archive-cards-list');
    if (!archiveContainer || !cardsList) return;

    boardEl.style.display = 'none';
    archiveContainer.style.display = '';

    var archived = getAllArchivedCards();
    cardsList.innerHTML = '';

    if (archived.length === 0) {
      cardsList.innerHTML = '<div class="archive-empty">' + getTrans('kanban_archive') + ': —</div>';
      return;
    }

    for (var i = 0; i < archived.length; i++) {
      (function(item) {
        var card = item.card;
        var list = item.list;

        var cardEl = document.createElement('div');
        cardEl.className = 'archive-card-item';

        var info = document.createElement('div');
        info.className = 'archive-card-info';

        var title = document.createElement('div');
        title.className = 'archive-card-title';
        title.textContent = card.title;

        var listName = document.createElement('div');
        listName.className = 'archive-card-list-name';
        listName.textContent = list.title;

        info.appendChild(title);
        info.appendChild(listName);

        var actions = document.createElement('div');
        actions.className = 'archive-card-actions';

        var restoreBtn = document.createElement('button');
        restoreBtn.className = 'mini-btn';
        restoreBtn.title = getTrans('kanban_card_restored');
        restoreBtn.innerHTML = '<i class="fa fa-undo"></i>';
        restoreBtn.addEventListener('click', function() {
          card.archived = false;
          save();
          renderArchiveView();
          showToast(getTrans('kanban_card_restored'));
        });

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'mini-btn';
        deleteBtn.title = getTrans('kanban_delete');
        deleteBtn.innerHTML = '<i class="fa fa-trash-o"></i>';
        deleteBtn.style.color = 'var(--danger)';
        deleteBtn.addEventListener('click', function() {
          if (confirm(getTrans('kanban_confirm_delete_card'))) {
            var idx = list.cards.indexOf(card);
            if (idx !== -1) list.cards.splice(idx, 1);
            save();
            renderArchiveView();
          }
        });

        actions.appendChild(restoreBtn);
        actions.appendChild(deleteBtn);
        cardEl.appendChild(info);
        cardEl.appendChild(actions);
        cardsList.appendChild(cardEl);
      })(archived[i]);
    }
  }

  function toggleArchiveView() {
    showArchiveView = !showArchiveView;
    var btn = document.getElementById('btn-show-archived');
    if (btn) btn.classList.toggle('active-toggle', showArchiveView);
    renderBoard();
  }

  // ========== DRAG & DROP ==========
  function handleCardDrop(targetList, cardsContainer, e) {
    if (!draggedCard) return;
    var board = getActiveBoard();
    if (!board) return;

    if (draggedCardFromList) {
      var idx = draggedCardFromList.cards.indexOf(draggedCard);
      if (idx !== -1) draggedCardFromList.cards.splice(idx, 1);
    }

    var afterCard = null;
    var cardEls = cardsContainer.querySelectorAll('.kanban-card:not(.dragging)');
    for (var i = 0; i < cardEls.length; i++) {
      var rect = cardEls[i].getBoundingClientRect();
      var midY = rect.top + rect.height / 2;
      if (e.clientY < midY) { afterCard = cardEls[i].dataset.cardId; break; }
    }

    var insertIdx;
    if (afterCard) {
      for (var j = 0; j < targetList.cards.length; j++) {
        if (targetList.cards[j].id === afterCard) { insertIdx = j; break; }
      }
    } else {
      insertIdx = targetList.cards.length;
    }

    targetList.cards.splice(insertIdx, 0, draggedCard);
    save();
    renderBoard();
  }

  boardEl.addEventListener('dragover', function(e) {
    if (!draggedList) return;
    e.preventDefault();
  });

  boardEl.addEventListener('drop', function(e) {
    if (!draggedList) return;
    e.preventDefault();
    var board = getActiveBoard();
    if (!board) return;

    var targetListEl = e.target.closest('.kanban-list');
    if (!targetListEl || targetListEl.dataset.listId === draggedList.id) return;

    var targetListId = targetListEl.dataset.listId;
    var fromIdx = board.lists.indexOf(draggedList);
    var toIdx = -1;

    for (var i = 0; i < board.lists.length; i++) {
      if (board.lists[i].id === targetListId) { toIdx = i; break; }
    }

    if (fromIdx !== -1 && toIdx !== -1) {
      board.lists.splice(fromIdx, 1);
      board.lists.splice(toIdx, 0, draggedList);
      save();
      renderBoard();
    }
  });

  // ========== ADD / DELETE LIST ==========
  function addList() {
    var board = getActiveBoard();
    if (!board) return;
    var newList = { id: uid(), title: getTrans('kanban_add_list'), cards: [] };
    board.lists.push(newList);
    save();
    renderBoard();

    setTimeout(function() {
      var listEl = boardEl.querySelector('[data-list-id="' + newList.id + '"]');
      if (listEl) {
        var titleEl = listEl.querySelector('.kanban-list-title');
        if (titleEl) {
          titleEl.focus();
          var range = document.createRange();
          range.selectNodeContents(titleEl);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }, 50);
  }

  function deleteList(listId) {
    if (!confirm(getTrans('kanban_confirm_delete_list'))) return;
    var board = getActiveBoard();
    if (!board) return;
    board.lists = board.lists.filter(function(l) { return l.id !== listId; });
    save();
    renderBoard();
    showToast(getTrans('toast_cleared'));
  }

  // ========== ADD CARD INPUT — FIX #1: Duplicate prevention ==========
  function addCardInput(list, cardsContainer) {
    var existing = cardsContainer.parentElement.querySelector('.kanban-add-card-input');
    if (existing) { existing.focus(); return; }

    var footer = cardsContainer.parentElement.querySelector('.kanban-add-card');
    if (footer) footer.style.display = 'none';

    var input = document.createElement('textarea');
    input.className = 'kanban-add-card-input';
    input.placeholder = getTrans('kanban_card_title');
    input.rows = 1;

    cardsContainer.parentElement.insertBefore(input, cardsContainer.nextSibling);
    input.focus();

    // FIX: Guard against double-commit (Enter triggers commit, then blur triggers again)
    var committed = false;

    function commit() {
      if (committed) return;
      committed = true;

      var title = input.value.trim();
      if (title) {
        var newCard = {
          id: uid(),
          title: title,
          description: '',
          priority: 'medium',
          dueDate: null,
          labels: [],
          timeSpent: 0,
          archived: false,
          created: new Date().toISOString()
        };
        list.cards.push(newCard);
        save();
      }
      if (footer) footer.style.display = '';
      input.remove();
      renderBoard();
    }

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        committed = true; // prevent blur from committing
        if (footer) footer.style.display = '';
        input.remove();
      }
    });

    // FIX: Only commit on blur if not already committed AND input has real content
    input.addEventListener('blur', function() {
      if (!committed) {
        committed = true;
        var title = input.value.trim();
        if (title) {
          var newCard = {
            id: uid(),
            title: title,
            description: '',
            priority: 'medium',
            dueDate: null,
            labels: [],
            timeSpent: 0,
            archived: false,
            created: new Date().toISOString()
          };
          list.cards.push(newCard);
          save();
        }
        if (footer) footer.style.display = '';
        input.remove();
        renderBoard();
      }
    });
  }

  // ========== DELETE BOARD ==========
  function deleteBoard(boardId) {
    if (!confirm(getTrans('kanban_confirm_delete_board'))) return;
    boards = boards.filter(function(b) { return b.id !== boardId; });
    if (settings.activeBoardId === boardId) {
      settings.activeBoardId = boards.length > 0 ? boards[0].id : null;
    }
    if (boards.length === 0) createDefaultBoard();
    save();
    renderBoardTabs();
    renderBoard();
    showToast(getTrans('toast_cleared'));
  }

    // ========== CARD DETAIL MODAL ==========
  function openCardDetail(cardId, listId) {
    var board = getActiveBoard();
    if (!board) return;
    var list = getList(board, listId);
    if (!list) return;
    var card = getCard(list, cardId);
    if (!card) return;

    editingCardId = cardId;
    editingCardListId = listId;
    editingBoardId = board.id;

    var modal = document.getElementById('card-detail-modal');
    var titleInput = document.getElementById('card-detail-title');
    var descInput = document.getElementById('card-detail-description');
    var dueInput = document.getElementById('card-detail-due');
    var prioritySelect = document.getElementById('card-detail-priority');
    var labelsContainer = document.getElementById('card-detail-labels');
    var timeDisplay = document.getElementById('card-detail-time');

    titleInput.value = card.title;
    descInput.value = card.description || '';
    dueInput.value = card.dueDate || '';
    prioritySelect.value = card.priority || 'medium';

    var mins = card.timeSpent || 0;
    timeDisplay.textContent = mins >= 60
      ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm'
      : mins + 'm';

    // Render labels
    labelsContainer.innerHTML = '';
    if (card.labels) {
      for (var i = 0; i < card.labels.length; i++) {
        (function(label, idx) {
          var chip = document.createElement('span');
          chip.className = 'label-chip';
          chip.style.backgroundColor = label.color;
          chip.innerHTML = label.text + ' <span class="label-chip-remove">×</span>';
          chip.querySelector('.label-chip-remove').addEventListener('click', function() {
            card.labels.splice(idx, 1);
            save();
            openCardDetail(cardId, listId);
          });
          labelsContainer.appendChild(chip);
        })(card.labels[i], i);
      }
    }

    // Label add input
    var labelInput = document.createElement('input');
    labelInput.className = 'label-add-input';
    labelInput.placeholder = getTrans('kanban_labels') + '...';
    labelInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var text = labelInput.value.trim();
        if (text) {
          if (!card.labels) card.labels = [];
          card.labels.push({ text: text, color: getLabelColor(text) });
          save();
          openCardDetail(cardId, listId);
        }
      }
    });
    labelsContainer.appendChild(labelInput);

    modal.classList.add('visible');
  }

  function closeCardDetail() {
    var modal = document.getElementById('card-detail-modal');
    modal.classList.remove('visible');

    // Save changes
    if (editingCardId) {
      var board = getBoard(editingBoardId);
      if (board) {
        var list = getList(board, editingCardListId);
        if (list) {
          var card = getCard(list, editingCardId);
          if (card) {
            card.title = document.getElementById('card-detail-title').value.trim() || card.title;
            card.description = document.getElementById('card-detail-description').value;
            card.dueDate = document.getElementById('card-detail-due').value || null;
            card.priority = document.getElementById('card-detail-priority').value;
            save();
          }
        }
      }
    }

    editingCardId = null;
    editingCardListId = null;
    editingBoardId = null;
    renderBoard();
  }

  // ========== POMODORO TIMER — FIX #5: Time tracking ==========
  function startPomodoro(cardId, listId) {
    var board = getActiveBoard();
    if (!board) return;
    var list = getList(board, listId);
    if (!list) return;
    var card = getCard(list, cardId);
    if (!card) return;

    pomoCardRef = { card: card, listId: listId, boardId: board.id };

    var widget = document.getElementById('pomodoro-widget');
    var titleEl = document.getElementById('pomodoro-card-title');

    widget.style.display = 'flex';
    titleEl.textContent = card.title;

    pomoIsBreak = false;
    pomoSecondsLeft = settings.pomodoroDuration * 60;
    updatePomoDisplay();

    if (!pomoRunning) {
      togglePomodoro();
    }
  }

  function togglePomodoro() {
    var btn = document.getElementById('btn-pomo-toggle');
    if (pomoRunning) {
      clearInterval(pomoInterval);
      pomoRunning = false;
      btn.innerHTML = '<i class="fa fa-play"></i>';
    } else {
      pomoRunning = true;
      btn.innerHTML = '<i class="fa fa-pause"></i>';

      // FIX: Record start time to track exact elapsed minutes
      var pomoStartTime = Date.now();

      pomoInterval = setInterval(function() {
        pomoSecondsLeft--;

        if (pomoSecondsLeft <= 0) {
          clearInterval(pomoInterval);
          pomoRunning = false;
          btn.innerHTML = '<i class="fa fa-play"></i>';

          if (!pomoIsBreak && pomoCardRef) {
            // FIX: Calculate actual elapsed minutes from start time
            var elapsedMs = Date.now() - pomoStartTime;
            var elapsedMinutes = Math.round(elapsedMs / 60000);
            // Use at least 1 minute, fall back to setting duration
            var minutesToAdd = Math.max(1, elapsedMinutes);

            pomoCardRef.card.timeSpent = (pomoCardRef.card.timeSpent || 0) + minutesToAdd;
            save();

            // Re-open card detail if open to reflect updated time
            if (editingCardId === pomoCardRef.card.id) {
              var timeDisplay = document.getElementById('card-detail-time');
              if (timeDisplay) {
                var mins = pomoCardRef.card.timeSpent;
                timeDisplay.textContent = mins >= 60
                  ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm'
                  : mins + 'm';
              }
            }

            showToast(getTrans('kanban_pomodoro_complete') + ' +' + minutesToAdd + 'm');

            // Start break
            pomoIsBreak = true;
            pomoSecondsLeft = settings.pomodoroBreak * 60;
            updatePomoDisplay();
            showToast(getTrans('kanban_pomodoro_break') + '!');
          } else if (pomoIsBreak) {
            pomoIsBreak = false;
            pomoSecondsLeft = settings.pomodoroDuration * 60;
            updatePomoDisplay();
            showToast(getTrans('kanban_pomodoro_complete') + '!');
          }
        }
        updatePomoDisplay();
      }, 1000);
    }
  }

  function resetPomodoro() {
    clearInterval(pomoInterval);
    pomoRunning = false;
    pomoIsBreak = false;
    pomoSecondsLeft = settings.pomodoroDuration * 60;
    var btn = document.getElementById('btn-pomo-toggle');
    if (btn) btn.innerHTML = '<i class="fa fa-play"></i>';
    updatePomoDisplay();
  }

  function closePomodoro() {
    clearInterval(pomoInterval);
    pomoRunning = false;
    pomoCardRef = null;
    document.getElementById('pomodoro-widget').style.display = 'none';
  }

  function updatePomoDisplay() {
    var display = document.getElementById('pomodoro-display');
    if (!display) return;
    var m = Math.floor(pomoSecondsLeft / 60);
    var s = pomoSecondsLeft % 60;
    display.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    display.style.color = pomoIsBreak ? 'var(--success)' : 'var(--accent-gold)';
  }

  // ========== XML IMPORT / EXPORT ==========
  function exportXML() {
    var board = getActiveBoard();
    if (!board) return;

    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<kanban-board version="1.0" exported="' + new Date().toISOString() + '">\n';
    xml += '  <metadata>\n';
    xml += '    <title>' + escapeXml(board.title) + '</title>\n';
    xml += '    <board_id>' + board.id + '</board_id>\n';
    xml += '  </metadata>\n\n';
    xml += '  <lists>\n';

    for (var i = 0; i < board.lists.length; i++) {
      var list = board.lists[i];
      xml += '    <list id="' + list.id + '">\n';
      xml += '      <title>' + escapeXml(list.title) + '</title>\n';
      xml += '      <cards>\n';

      for (var j = 0; j < list.cards.length; j++) {
        var card = list.cards[j];
        xml += '        <card id="' + card.id + '" priority="' + (card.priority || 'medium') + '"';
        if (card.dueDate) xml += ' due_date="' + card.dueDate + '"';
        if (card.archived) xml += ' archived="true"';
        xml += '>\n';
        xml += '          <title>' + escapeXml(card.title) + '</title>\n';
        if (card.description) {
          xml += '          <description><![CDATA[' + card.description + ']]></description>\n';
        }
        if (card.labels && card.labels.length > 0) {
          xml += '          <labels>\n';
          for (var k = 0; k < card.labels.length; k++) {
            xml += '            <label color="' + card.labels[k].color + '">' + escapeXml(card.labels[k].text) + '</label>\n';
          }
          xml += '          </labels>\n';
        }
        if (card.timeSpent && card.timeSpent > 0) {
          xml += '          <time_spent unit="minutes">' + card.timeSpent + '</time_spent>\n';
        }
        if (card.created) {
          xml += '          <created>' + card.created + '</created>\n';
        }
        xml += '        </card>\n';
      }

      xml += '      </cards>\n';
      xml += '    </list>\n';
    }

    xml += '  </lists>\n';
    xml += '</kanban-board>';

    var blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'oros_kanban_' + new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-') + '.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(getTrans('toast_downloaded'));
  }

  function importXML(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var parser = new DOMParser();
        var doc = parser.parseFromString(e.target.result, 'text/xml');

        var root = doc.querySelector('kanban-board');
        if (!root) {
          showToast('Invalid XML: missing kanban-board root');
          return;
        }

        var metaTitle = root.querySelector('metadata > title');
        var board = {
          id: uid(),
          title: metaTitle ? metaTitle.textContent : 'Imported Board',
          lists: []
        };

        var listEls = root.querySelectorAll('lists > list');
        for (var i = 0; i < listEls.length; i++) {
          var listEl = listEls[i];
          var list = {
            id: listEl.getAttribute('id') || uid(),
            title: (listEl.querySelector('title') || {}).textContent || 'Untitled',
            cards: []
          };

          var cardEls = listEl.querySelectorAll('cards > card');
          for (var j = 0; j < cardEls.length; j++) {
            var cardEl = cardEls[j];
            var card = {
              id: cardEl.getAttribute('id') || uid(),
              title: (cardEl.querySelector('title') || {}).textContent || 'Untitled',
              description: '',
              priority: cardEl.getAttribute('priority') || 'medium',
              dueDate: cardEl.getAttribute('due_date') || null,
              archived: cardEl.getAttribute('archived') === 'true',
              labels: [],
              timeSpent: 0,
              created: new Date().toISOString()
            };

            var descEl = cardEl.querySelector('description');
            if (descEl) card.description = descEl.textContent;

            var timeEl = cardEl.querySelector('time_spent');
            if (timeEl) card.timeSpent = parseInt(timeEl.textContent) || 0;

            var createdEl = cardEl.querySelector('created');
            if (createdEl) card.created = createdEl.textContent;

            var labelEls = cardEl.querySelectorAll('labels > label');
            for (var k = 0; k < labelEls.length; k++) {
              card.labels.push({
                text: labelEls[k].textContent,
                color: labelEls[k].getAttribute('color') || getLabelColor(labelEls[k].textContent)
              });
            }

            list.cards.push(card);
          }

          board.lists.push(list);
        }

        boards.push(board);
        settings.activeBoardId = board.id;
        save();
        renderBoardTabs();
        renderBoard();
        showToast(getTrans('toast_opened'));
      } catch(err) {
        showToast('Import error: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // ========== KANBAN SETTINGS — FIX #4 ==========
  function setupKanbanSettings() {
    var pomoWorkInput = document.getElementById('setting-pomo-work');
    var pomoBreakInput = document.getElementById('setting-pomo-break');

    if (pomoWorkInput) {
      pomoWorkInput.value = settings.pomodoroDuration;
      pomoWorkInput.addEventListener('change', function() {
        var val = parseInt(this.value) || 25;
        val = Math.max(1, Math.min(60, val));
        settings.pomodoroDuration = val;
        this.value = val;
        save();
        if (!pomoRunning) {
          pomoSecondsLeft = val * 60;
          updatePomoDisplay();
        }
        showToast(getTrans('text_saved'));
      });
    }

    if (pomoBreakInput) {
      pomoBreakInput.value = settings.pomodoroBreak;
      pomoBreakInput.addEventListener('change', function() {
        var val = parseInt(this.value) || 5;
        val = Math.max(1, Math.min(30, val));
        settings.pomodoroBreak = val;
        this.value = val;
        save();
        showToast(getTrans('text_saved'));
      });
    }
  }

  // ========== INSTALL PROMPT — FIX #3 ==========
  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      deferredInstallPrompt = e;
      var btn = document.getElementById('btn-install');
      if (btn) btn.disabled = false;
    });

    var btn = document.getElementById('btn-install');
    if (btn) {
      btn.addEventListener('click', function() {
        if (!deferredInstallPrompt) {
          showToast(getTrans('install_app') + ': N/A');
          return;
        }
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(function(choice) {
          if (choice.outcome === 'accepted') {
            showToast(getTrans('install_app') + ' ✓');
          }
          deferredInstallPrompt = null;
          btn.disabled = true;
        });
      });
    }

    window.addEventListener('appinstalled', function() {
      var btn = document.getElementById('btn-install');
      if (btn) btn.disabled = true;
      deferredInstallPrompt = null;
    });
  }

  // ========== KEYBOARD SHORTCUTS ==========
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        save();
        showToast(getTrans('text_saved'));
      }

      if (e.key === 'Escape') {
        var modal = document.getElementById('card-detail-modal');
        if (modal.classList.contains('visible')) {
          closeCardDetail();
        }
      }

      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        var activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && !document.activeElement.isContentEditable) {
          e.preventDefault();
          var board = getActiveBoard();
          if (board && board.lists.length > 0) {
            var firstList = board.lists[0];
            var cardsContainer = boardEl.querySelector('[data-list-id="' + firstList.id + '"] .kanban-cards');
            if (cardsContainer) {
              addCardInput(firstList, cardsContainer);
            }
          }
        }
      }
    });
  }

  // ========== SETUP EVENT LISTENERS ==========
  function setupEventListeners() {
    // Add board button
    var btnAddBoard = document.getElementById('btn-add-board');
    if (btnAddBoard) {
      btnAddBoard.addEventListener('click', function() {
        var board = {
          id: uid(),
          title: 'New Board',
          lists: [
            { id: uid(), title: 'To Do', cards: [] },
            { id: uid(), title: 'In Progress', cards: [] },
            { id: uid(), title: 'Done', cards: [] }
          ]
        };
        boards.push(board);
        settings.activeBoardId = board.id;
        save();
        renderBoardTabs();
        renderBoard();
      });
    }

    // Add list button
    var btnAddList = document.getElementById('btn-add-list');
    if (btnAddList) btnAddList.addEventListener('click', addList);

    // Show archived button — FIX #6
    var btnShowArchived = document.getElementById('btn-show-archived');
    if (btnShowArchived) btnShowArchived.addEventListener('click', toggleArchiveView);

    // Close archive
    var btnCloseArchive = document.getElementById('btn-close-archive');
    if (btnCloseArchive) {
      btnCloseArchive.addEventListener('click', function() {
        showArchiveView = false;
        var btn = document.getElementById('btn-show-archived');
        if (btn) btn.classList.remove('active-toggle');
        renderBoard();
      });
    }

    // Import
    var btnImport = document.getElementById('btn-import');
    var fileInput = document.getElementById('file-input');
    if (btnImport && fileInput) {
      btnImport.addEventListener('click', function() { fileInput.click(); });
      fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
          importXML(this.files[0]);
          this.value = '';
        }
      });
    }

    // Export
    var btnExport = document.getElementById('btn-export');
    if (btnExport) btnExport.addEventListener('click', exportXML);

    // Search
    if (searchInput) {
      searchInput.addEventListener('input', function() { renderBoard(); });
    }

    // Card detail modal
    var btnCardClose = document.getElementById('btn-card-close');
    if (btnCardClose) btnCardClose.addEventListener('click', closeCardDetail);

    var cardOverlay = document.querySelector('.card-detail-overlay');
    if (cardOverlay) cardOverlay.addEventListener('click', closeCardDetail);

    // Card detail — auto-save on input
    var detailTitle = document.getElementById('card-detail-title');
    var detailDesc = document.getElementById('card-detail-description');
    var detailDue = document.getElementById('card-detail-due');
    var detailPriority = document.getElementById('card-detail-priority');

    function autoSaveCard() {
      if (!editingCardId) return;
      var board = getBoard(editingBoardId);
      if (!board) return;
      var list = getList(board, editingCardListId);
      if (!list) return;
      var card = getCard(list, editingCardId);
      if (!card) return;
      card.title = detailTitle.value.trim() || card.title;
      card.description = detailDesc.value;
      card.dueDate = detailDue.value || null;
      card.priority = detailPriority.value;
      save();
    }

    [detailTitle, detailDesc, detailDue, detailPriority].forEach(function(el) {
      if (el) el.addEventListener('input', autoSaveCard);
    });

    // Card detail buttons
    var btnCardPomodoro = document.getElementById('btn-card-pomodoro');
    if (btnCardPomodoro) {
      btnCardPomodoro.addEventListener('click', function() {
        if (editingCardId && editingCardListId) {
          startPomodoro(editingCardId, editingCardListId);
        }
      });
    }

    var btnCardArchive = document.getElementById('btn-card-archive');
    if (btnCardArchive) {
      btnCardArchive.addEventListener('click', function() {
        if (!editingCardId) return;
        var board = getBoard(editingBoardId);
        if (!board) return;
        var list = getList(board, editingCardListId);
        if (!list) return;
        var card = getCard(list, editingCardId);
        if (!card) return;
        card.archived = !card.archived;
        save();
        closeCardDetail();
        showToast(card.archived ? getTrans('kanban_card_archived') : getTrans('kanban_card_restored'));
      });
    }

    var btnCardDelete = document.getElementById('btn-card-delete');
    if (btnCardDelete) {
      btnCardDelete.addEventListener('click', function() {
        if (!editingCardId) return;
        if (!confirm(getTrans('kanban_confirm_delete_card'))) return;
        var board = getBoard(editingBoardId);
        if (!board) return;
        var list = getList(board, editingCardListId);
        if (!list) return;
        list.cards = list.cards.filter(function(c) { return c.id !== editingCardId; });
        save();
        closeCardDetail();
        showToast(getTrans('toast_cleared'));
      });
    }

    // Pomodoro controls
    var btnPomoToggle = document.getElementById('btn-pomo-toggle');
    if (btnPomoToggle) btnPomoToggle.addEventListener('click', togglePomodoro);
    var btnPomoReset = document.getElementById('btn-pomo-reset');
    if (btnPomoReset) btnPomoReset.addEventListener('click', resetPomodoro);
    var btnPomoClose = document.getElementById('btn-pomo-close');
    if (btnPomoClose) btnPomoClose.addEventListener('click', closePomodoro);

    // Settings tab switching — include Kanban tab
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-panel').forEach(function(p) { p.style.display = 'none'; });
        btn.classList.add('active');
        var panel = document.getElementById(btn.dataset.tab);
        if (panel) panel.style.display = 'flex';
      });
    });

    // Settings modal open/close
    document.querySelectorAll('.settings-close, .settings-modal-overlay').forEach(function(el) {
      el.addEventListener('click', function() {
        document.querySelector('.settings-modal').classList.remove('visible');
      });
    });
  }

  // ========== INIT ==========
  function init() {
    load();
    setupKanbanSettings();
    setupInstallPrompt();
    translateUI();
    renderBoardTabs();
    renderBoard();
    setupEventListeners();
    setupKeyboardShortcuts();

    // Re-translate on language change — FIX #2
    window.addEventListener('oros-language-changed', function() {
      translateUI();
    });

    // Also listen for header language dropdown changes
    document.addEventListener('change', function(e) {
      if (e.target && e.target.id === 'language-select') {
        var lang = e.target.value;
        localStorage.setItem('oros-language', lang);
        translateUI();
        // Notify other components
        window.dispatchEvent(new CustomEvent('oros-language-changed', { detail: { lang: lang } }));
      }
    });
  }

  // Wait for DOM and shared scripts
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // Small delay to let header.js populate
      setTimeout(init, 100);
    });
  } else {
    setTimeout(init, 100);
  }
})();