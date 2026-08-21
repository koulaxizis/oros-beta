/* ============================================
   orOS Kanban — Part 3/3 (FINAL)
   Export/Import, Stats, Help, Keyboard Shortcuts, Init
   ============================================ */

  // ===== EXPORT / IMPORT =====
  function exportData() {
    var board = state.getCurrentBoard();
    if (!board) {
      showToast(getTrans('kanban_no_board_to_export') || 'No board to export');
      return;
    }

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
    a.download = 'kanban-backup-' + formatDate(Date.now()).replace(/\s/g, '_') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(getTrans('kanban_exported') || 'Board exported');
  }

  function exportCSV() {
    var board = state.getCurrentBoard();
    if (!board || !board.columns) {
      showToast(getTrans('kanban_no_board_to_export') || 'No board to export');
      return;
    }

    var csv = 'Column,Card Title,Description,Due Date,Priority,Labels,Subtasks\n';
    
    board.columns.forEach(function(col) {
      if (col.cards) {
        col.cards.forEach(function(card) {
          if (card.archived) return;
          
          var labels = card.labels ? (board.labels || []).filter(function(l) {
            return card.labels.indexOf(l.id) !== -1;
          }).map(function(l) { return l.name; }).join('; ') : '';
          
          var subtasks = card.subtasks ? card.subtasks.map(function(s) {
            return (s.completed ? '[x]' : '[ ]') + ' ' + s.text;
          }).join('\\n') : '';
          
          var row = [
            escapeCsv(col.title),
            escapeCsv(card.title),
            escapeCsv(card.description || ''),
            card.dueDate || '',
            card.priority || 0,
            escapeCsv(labels),
            escapeCsv(subtasks)
          ].join(',');
          
          csv += row + '\n';
        });
      }
    });

    var blob = new Blob([csv], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    
    var a = document.createElement('a');
    a.href = url;
    a.download = 'kanban-export-' + formatDate(Date.now()).replace(/\s/g, '_') + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(getTrans('kanban_csv_exported') || 'CSV exported');
  }

  function escapeCsv(str) {
    if (typeof str !== 'string') return '';
    str = str.replace(/"/g, '""');
    if (str.indexOf(',') !== -1 || str.indexOf('\n') !== -1) {
      return '"' + str + '"';
    }
    return str;
  }

  // ===== STATISTICS =====
  function showStatsModal() {
    var board = state.getCurrentBoard();
    if (!board) return;

    var modal = document.getElementById('stats-modal');
    var overlay = document.getElementById('stats-modal-overlay');
    var body = document.getElementById('stats-modal-body');
    
    if (modal) modal.classList.add('visible');
    if (overlay) overlay.classList.add('visible');

    if (!body) return;

      // ===== STATISTICS =====
  function showStatsModal() {
    var board = state.getCurrentBoard();
    if (!board) return;

    var modal = document.getElementById('stats-modal');
    var overlay = document.getElementById('stats-modal-overlay');
    var body = document.getElementById('stats-modal-body');

    if (modal) modal.classList.add('visible');
    if (overlay) overlay.classList.add('visible');
    if (!body) return;

    // Calculate stats
    var totalCards = 0;
    var archivedCards = 0;
    var cardsByStatus = {};
    var cardsByPriority = { 0: 0, 1: 0, 2: 0, 3: 0 };
    var overdueCount = 0;
    var todayCount = 0;
    var totalSubtasks = 0;
    var completedSubtasks = 0;
    var totalAssignments = 0;

    var now = new Date();
    now.setHours(0, 0, 0, 0);

    board.columns.forEach(function(col) {
      cardsByStatus[col.title] = 0;
      if (col.cards) {
        col.cards.forEach(function(card) {
          if (card.archived) {
            archivedCards++;
            return;
          }

          totalCards++;
          cardsByStatus[col.title]++;

          var prio = card.priority || 0;
          if (cardsByPriority[prio] !== undefined) {
            cardsByPriority[prio]++;
          }

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

          if (card.assignments) {
            totalAssignments += card.assignments.length;
          }
        });
      }
    });

    // Build HTML
    var html = '';

    // Summary cards
    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-value">' + totalCards + '</div><div class="stat-label">Total Cards</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + archivedCards + '</div><div class="stat-label">Archived</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + board.columns.length + '</div><div class="stat-label">Columns</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + (board.labels ? board.labels.length : 0) + '</div><div class="stat-label">Labels</div></div>';
    html += '</div>';

    // Overdue / Today
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

    // Cards by column (bar chart)
    html += '<div class="stats-section-title">Cards by Column</div>';
    var maxColCount = 1;
    Object.keys(cardsByStatus).forEach(function(k) {
      if (cardsByStatus[k] > maxColCount) maxColCount = cardsByStatus[k];
    });

    Object.keys(cardsByStatus).forEach(function(k) {
      var pct = Math.round(cardsByStatus[k] / maxColCount * 100);
      html += '<div class="stats-bar-row">';
      html += '<span class="stats-bar-label" title="' + escapeHtml(k) + '">' + escapeHtml(k) + '</span>';
      html += '<div class="stats-bar-track"><div class="stats-bar-fill" style="width:' + pct + '%; background: var(--accent-gold);"></div></div>';
      html += '<span class="stats-bar-value">' + cardsByStatus[k] + '</span>';
      html += '</div>';
    });

    // Cards by priority
    var prioLabels = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High' };
    var prioColors = { 0: 'var(--text-muted)', 1: '#4caf50', 2: '#ff9800', 3: '#f44336' };
    var maxPrioCount = 1;
    Object.keys(cardsByPriority).forEach(function(k) {
      if (cardsByPriority[k] > maxPrioCount) maxPrioCount = cardsByPriority[k];
    });

    html += '<div class="stats-section-title">Cards by Priority</div>';
    Object.keys(cardsByPriority).forEach(function(k) {
      var pct = Math.round(cardsByPriority[k] / maxPrioCount * 100);
      html += '<div class="stats-bar-row">';
      html += '<span class="stats-bar-label">' + prioLabels[k] + '</span>';
      html += '<div class="stats-bar-track"><div class="stats-bar-fill" style="width:' + pct + '%; background: ' + prioColors[k] + ';"></div></div>';
      html += '<span class="stats-bar-value">' + cardsByPriority[k] + '</span>';
      html += '</div>';
    });

    body.innerHTML = html;

    // Close handlers
    var closeBtn = document.getElementById('btn-close-stats');
    if (closeBtn) {
      closeBtn.onclick = function() {
        if (modal) modal.classList.remove('visible');
        if (overlay) overlay.classList.remove('visible');
      };
    }
    if (overlay) {
      overlay.onclick = function() {
        if (modal) modal.classList.remove('visible');
        if (overlay) overlay.classList.remove('visible');
      };
    }
  }

  // ===== HELP =====
  function showHelp() {
    var shortcuts = [
      { action: 'Save / Export board', key: 'Ctrl+S' },
      { action: 'Export menu', key: 'Ctrl+B' },
      { action: 'New card', key: 'Click "+" in column' },
      { action: 'Edit card', key: 'Click card' },
      { action: 'Rename column', key: 'Double-click title' },
      { action: 'Move card', key: 'Drag & drop' },
      { action: 'Move column', key: 'Drag & drop column header' },
      { action: 'Close modal', key: 'Escape' },
      { action: 'Save card (modal open)', key: 'Ctrl+Enter / Ctrl+S' },
      { action: 'Delete card (modal open)', key: 'Ctrl+Delete' }
    ];

    var html = '<div class="stats-section-title">Keyboard Shortcuts</div>';
    html += '<div class="shortcut-list">';
    shortcuts.forEach(function(s) {
      html += '<div class="stats-bar-row">';
      html += '<span class="stats-bar-label">' + escapeHtml(s.action) + '</span>';
      html += '<span class="stats-bar-value" style="text-align:left; width:auto; font-family:monospace; font-size:12px;">' + escapeHtml(s.key) + '</span>';
      html += '</div>';
    });
    html += '</div>';

    // Reuse stats modal for help
    var modal = document.getElementById('stats-modal');
    var overlay = document.getElementById('stats-modal-overlay');
    var body = document.getElementById('stats-modal-body');
    var header = modal ? modal.querySelector('.stats-modal-header h3') : null;

    if (header) header.textContent = 'Keyboard Shortcuts';
    if (body) body.innerHTML = html;
    if (modal) modal.classList.add('visible');
    if (overlay) overlay.classList.add('visible');

    if (overlay) {
      overlay.onclick = function() {
        if (modal) modal.classList.remove('visible');
        if (overlay) overlay.classList.remove('visible');
        if (header) header.textContent = 'Board Statistics';
      };
    }

    var closeBtn = document.getElementById('btn-close-stats');
    if (closeBtn) {
      closeBtn.onclick = function() {
        if (modal) modal.classList.remove('visible');
        if (overlay) overlay.classList.remove('visible');
        if (header) header.textContent = 'Board Statistics';
      };
    }
  }

  // ===== KEYBOARD SHORTCUTS =====
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      // Escape closes any modal
      if (e.key === 'Escape') {
        var cardModal = document.getElementById('card-modal');
        var labelModal = document.getElementById('label-modal');
        var statsModal = document.getElementById('stats-modal');

        if (cardModal && cardModal.classList.contains('visible')) {
          closeCardModal();
          return;
        }
        if (labelModal && labelModal.classList.contains('visible')) {
          closeLabelManagement();
          return;
        }
        if (statsModal && statsModal.classList.contains('visible')) {
          statsModal.classList.remove('visible');
          var statsOverlay = document.getElementById('stats-modal-overlay');
          if (statsOverlay) statsOverlay.classList.remove('visible');
          return;
        }

        // Close dropdowns
        var bl = document.getElementById('board-list');
        if (bl) bl.classList.remove('visible');
        var fd = document.getElementById('filter-dropdown-content');
        if (fd) fd.classList.remove('visible');
        var eo = document.getElementById('export-options');
        if (eo) eo.style.display = 'none';
        return;
      }

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          // FIX: If card modal is open, save the card instead of exporting
          if (state.editingCardId !== null) {
            saveCard();
          } else {
            exportData();
          }
          return;
        }
        if (e.key === 'b') {
          e.preventDefault();
          var exportBtn = document.getElementById('btn-export');
          if (exportBtn) exportBtn.click();
          return;
        }
        // FIX: Ctrl+Enter saves card when modal is open
        if (e.key === 'Enter' && state.editingCardId !== null) {
          e.preventDefault();
          saveCard();
          return;
        }
        // FIX: Ctrl+Delete deletes card when modal is open
        if ((e.key === 'Delete' || e.key === 'Backspace') && state.editingCardId !== null) {
          e.preventDefault();
          if (confirm(getTrans('kanban_confirm_delete_card') || 'Delete this card?')) {
            deleteCard(state.editingCardId);
            closeCardModal();
            renderBoard();
            showToast(getTrans('kanban_deleted') || 'Card deleted');
          }
          return;
        }
      }
    });
  }

  // ===== COLUMN INLINE EDIT =====
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

    var board = state.getCurrentBoard();
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

  // ===== LABEL MODAL EVENTS =====
  function setupLabelModalEvents() {
    var closeBtn = document.getElementById('label-modal-close');
    if (closeBtn) {
      closeBtn.onclick = function() {
        closeLabelManagement();
      };
    }

    var overlay = document.getElementById('label-modal-overlay');
    if (overlay) {
      overlay.onclick = function() {
        closeLabelManagement();
      };
    }

    var addBtn = document.getElementById('btn-add-label-modal');
    if (addBtn) {
      addBtn.onclick = function() {
        addNewLabel();
      };
    }
  }

  // ===== CARD MODAL OVERLAY CLICK =====
  function setupOverlayEvents() {
    var cardOverlay = document.getElementById('card-modal-overlay');
    if (cardOverlay) {
      cardOverlay.onclick = function() {
        closeCardModal();
      };
    }

    var labelOverlay = document.getElementById('label-modal-overlay');
    if (labelOverlay) {
      labelOverlay.onclick = function() {
        closeLabelManagement();
      };
    }

    var statsOverlay = document.getElementById('stats-modal-overlay');
    if (statsOverlay) {
      statsOverlay.onclick = function() {
        var modal = document.getElementById('stats-modal');
        if (modal) modal.classList.remove('visible');
        statsOverlay.classList.remove('visible');
      };
    }
  }

  // ===== AUTO-SAVE TOGGLE =====
  function setupAutoSaveToggle() {
    // Check if toggle exists in settings
    var toggle = document.getElementById('kanban-auto-save-toggle');
    if (toggle) {
      state.autoSaveEnabled = localStorage.getItem('oros_kanban_autosave') !== 'false';
      toggle.checked = state.autoSaveEnabled;
      toggle.addEventListener('change', function() {
        state.autoSaveEnabled = this.checked;
        localStorage.setItem('oros_kanban_autosave', this.checked ? 'true' : 'false');
        if (this.checked) saveToStorage();
        showToast(this.checked ? 'Auto-save enabled' : 'Auto-save disabled');
      });
    }
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

  // ===== THEME INITIALIZATION =====
  function setupTheme() {
    var savedTheme = localStorage.getItem('oros-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.body.classList.toggle('light-mode', savedTheme === 'light');
    document.body.classList.toggle('dark-mode', savedTheme === 'dark');
  }

  // Toggle theme
  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.body.classList.toggle('light-mode', next === 'light');
    document.body.classList.toggle('dark-mode', next === 'dark');
    localStorage.setItem('oros-theme', next);
  }

  // ===== WINDOW RESIZE HANDLER =====
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      // Recalculate layout if needed
      var columns = document.getElementById('kanban-columns');
      if (columns) {
        // Trigger reflow
        columns.style.display = 'none';
        columns.offsetHeight; // force reflow
        columns.style.display = '';
      }
    }, 150);
  });

  // ===== BEFORE UNLOAD WARNING =====
  window.addEventListener('beforeunload', function(e) {
    if (state.editingCardId !== null) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ===== EXPORT GLOBAL API =====
  global.KanbanApp = {
    init: init,
    createNewBoard: createNewBoard,
    deleteBoard: deleteBoard,
    switchBoard: switchBoard,
    addColumn: addColumn,
    deleteColumn: deleteColumn,
    renameColumn: renameColumn,
    moveColumn: moveColumn,
    addCard: function(colId, title) {
      var board = state.getCurrentBoard();
      if (!board) return;
      var col = board.columns.find(function(c) { return c.id === colId; });
      if (!col) return;
      var card = {
        id: generateId(),
        title: sanitizeText(title) || 'Untitled',
        description: '',
        dueDate: '',
        priority: 0,
        color: '',
        labels: [],
        subtasks: [],
        assignments: [],
        createdAt: Date.now(),
        modifiedAt: Date.now()
      };
      col.cards.push(card);
      pushUndo();
      saveToStorage();
      renderBoard();
      return card;
    },
    deleteCard: deleteCard,
    moveCard: moveCard,
    exportData: exportData,
    exportCSV: exportCSV,
    toggleTheme: toggleTheme,
    setLanguage: setLanguage,
    undo: undo,
    getState: function() { return state; }
  };

  // ===== DOMContentLoaded INIT =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      init();
      setupLabelModalEvents();
      setupOverlayEvents();
      setupAutoSaveToggle();
      setupKanbanSettingsToggles();
    });
  } else {
    init();
    setupLabelModalEvents();
    setupOverlayEvents();
    setupAutoSaveToggle();
    setupKanbanSettingsToggles();
  }

})(window);