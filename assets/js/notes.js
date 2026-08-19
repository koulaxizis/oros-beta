// ============================================
// orOS Notes — Full Implementation
// Privacy-first, offline, vanilla JavaScript
// Features: Folders, [[Wikilinks]], Markdown,
// search, import/export JSON, tree hierarchy
// ============================================

(function() {
  'use strict';

  // ========== STORAGE KEYS ==========
  var STORAGE_KEY = 'oros_notes_data';
  var ACTIVE_NOTE_ID = 'oros_notes_active_id';
  var VIEW_MODE = 'oros_notes_view_mode';
  var SIDEBAR_COLLAPSED = 'oros_notes_sidebar_collapsed';

  // ========== STATE ==========
  var state = {
    nodes: [], // tree structure: { id, type: 'folder'|'note', parentId, title, children?, content?, modified? }
    activeNodeId: null,
    searchQuery: '',
    expandedFolders: {},
    contextTargetId: null,
    pendingLinkId: null // for link picker modal
  };

  // ========== ID GENERATOR ==========
  function genId(type) {
    return (type || 'node') + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
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
        state.nodes = JSON.parse(raw);
      }
    } catch(e) {
      state.nodes = [];
    }

    // Restore active note
    var savedActive = localStorage.getItem(ACTIVE_NOTE_ID);
    if (savedActive) {
      state.activeNodeId = savedActive;
    }

    // View mode
    var savedMode = localStorage.getItem(VIEW_MODE);
    if (savedMode) {
      applyViewMode(savedMode);
    }

    // Sidebar collapsed state
    var sidebarCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED) === 'true';
    if (sidebarCollapsed) {
      var sidebar = document.getElementById('notes-sidebar');
      if (sidebar) sidebar.classList.add('collapsed');
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.nodes));
      localStorage.setItem(ACTIVE_NOTE_ID, state.activeNodeId || '');
      localStorage.setItem(SIDEBAR_COLLAPSED, document.getElementById('notes-sidebar').classList.contains('collapsed') ? 'true' : 'false');
    } catch(e) {
      showToast('Storage limit reached. Export and delete old notes.');
    }
  }

  // ========== NODE OPERATIONS ==========
  function getNode(id) {
    return findNodeById(id, state.nodes);
  }

  function findNodeById(id, nodes) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return nodes[i];
      if (nodes[i].children) {
        var found = findNodeById(id, nodes[i].children);
        if (found) return found;
      }
    }
    return null;
  }

  function getParentNode(id) {
    return findParent(id, state.nodes, null);
  }

  function findParent(id, nodes, parent) {
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return parent;
      if (nodes[i].children) {
        var found = findParent(id, nodes[i].children, nodes[i]);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }

  function getAllNodes() {
    var result = [];
    flattenNodes(state.nodes, result);
    return result;
  }

  function flattenNodes(nodes, result) {
    for (var i = 0; i < nodes.length; i++) {
      result.push(nodes[i]);
      if (nodes[i].children) {
        flattenNodes(nodes[i].children, result);
      }
    }
  }

  function getNotes() {
    return getAllNodes().filter(function(n) { return n.type === 'note'; });
  }

  function createFolder(parentId, title) {
    var folder = {
      id: genId('folder'),
      type: 'folder',
      parentId: parentId || null,
      title: title || 'Untitled Folder',
      children: [],
      expanded: false,
      created: Date.now(),
      modified: Date.now()
    };

    if (parentId) {
      var parent = getNode(parentId);
      if (parent && parent.children) {
        parent.children.push(folder);
        parent.expanded = true;
        parent.modified = Date.now();
      }
    } else {
      state.nodes.push(folder);
    }

    saveData();
    renderTree();
    return folder;
  }

  function createNote(parentId, title) {
    var note = {
      id: genId('note'),
      type: 'note',
      parentId: parentId || null,
      title: title || 'Untitled Note',
      content: '',
      created: Date.now(),
      modified: Date.now()
    };

    if (parentId) {
      var parent = getNode(parentId);
      if (parent && parent.children) {
        parent.children.push(note);
        parent.modified = Date.now();
      }
    } else {
      state.nodes.push(note);
    }

    state.activeNodeId = note.id;
    saveData();
    renderAll();
    return note;
  }

  function renameNode(id, newTitle) {
    var node = getNode(id);
    if (node) {
      node.title = newTitle;
      node.modified = Date.now();
      saveData();
      renderAll();
    }
  }

  function deleteNode(id) {
    var node = getNode(id);
    if (!node) return;

    var msg = node.type === 'folder'
      ? getTrans('notes_confirm_delete_folder') || 'Delete folder and all contents?'
      : getTrans('notes_confirm_delete_note') || 'Delete this note?';
    if (!confirm(msg)) return;

    deleteNodeRecursive(id);

    if (state.activeNodeId === id) {
      state.activeNodeId = null;
      renderEditorPanel();
    }

    saveData();
    renderAll();
    showToast(node.type === 'folder' ? getTrans('notes_deleted_folder') || 'Folder deleted' : getTrans('notes_deleted_note') || 'Note deleted');
  }

  function deleteNodeRecursive(id) {
    var parent = getParentNode(id);
    if (parent && parent.children) {
      var idx = parent.children.findIndex(function(c) { return c.id === id; });
      if (idx !== -1) parent.children.splice(idx, 1);
    } else {
      var idx = state.nodes.findIndex(function(n) { return n.id === id; });
      if (idx !== -1) state.nodes.splice(idx, 1);
    }
  }

  function updateNoteContent(content) {
    var note = getNode(state.activeNodeId);
    if (note) {
      note.content = content;
      note.modified = Date.now();
      saveData();
      updateMetaInfo();
      updateLinkCount();
    }
  }

  // ========== RENDERING ==========
  function renderAll() {
    renderTree();
    renderEditorPanel();
    toggleEmptyState();
  }

  function renderTree() {
    var container = document.getElementById('sidebar-tree');
    if (!container) return;

    container.innerHTML = '';
    state.nodes.forEach(function(node) {
      container.appendChild(renderTreeNode(node, 0));
    });

    // Apply search filter
    applySearchFilter();
  }

  function renderTreeNode(node, depth) {
    var itemEl = document.createElement('div');
    itemEl.className = 'tree-node';

    var el = document.createElement('div');
    el.className = 'tree-item ' + node.type;
    el.setAttribute('data-id', node.id); // FIX: Add data-id for highlighting
    if (node.id === state.activeNodeId) el.classList.add('active');
    if (node.modified > node.created && !node.isNew) el.classList.add('modified');

    // Expand toggle (folders only)
    var expand = document.createElement('span');
    expand.className = 'tree-expand';
    expand.innerHTML = '<i class="fa fa-chevron-right"></i>';

    // Icon
    var icon = document.createElement('i');
    icon.className = 'tree-icon fa ' + (node.type === 'folder' ? 'fa-folder-o' : 'fa-file-text-o');
    if (node.type === 'folder' && node.expanded) {
      icon.className = 'tree-icon fa fa-folder-open-o';
    }

    // Title
    var title = document.createElement('span');
    title.className = 'tree-title';
    title.textContent = node.title;
    title.title = node.title;

    el.appendChild(expand);
    el.appendChild(icon);
    el.appendChild(title);

    // Children container (folders only)
    var childrenEl = document.createElement('div');
    childrenEl.className = 'tree-children';
    if (node.expanded) el.classList.add('tree-expanded');

    if (node.type === 'folder' && node.children) {
      node.children.forEach(function(child) {
        childrenEl.appendChild(renderTreeNode(child, depth + 1));
      });
    }

    itemEl.appendChild(el);
    itemEl.appendChild(childrenEl);

    // ===== EVENTS =====
    if (node.type === 'folder') {
      // Toggle expand
      el.addEventListener('click', function(e) {
        if (e.target.closest('.tree-expand')) {
          node.expanded = !node.expanded;
          el.classList.toggle('tree-expanded');
          icon.className = 'tree-icon fa ' + (node.expanded ? 'fa-folder-open-o' : 'fa-folder-o');
          saveData();
        }
      });

      // Click folder selects it (doesn't open)
      title.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    } else {
      // Note click opens editor
      el.addEventListener('click', function() {
        selectNote(node.id);
      });
    }

    // Right-click context menu
    el.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu(e.pageX, e.pageY, node.id);
    });

    // Double-click to rename (notes and folders)
    el.addEventListener('dblclick', function() {
      openRenameModal(node.id);
    });

    return itemEl;
  }

  function renderEditorPanel() {
    var emptyState = document.getElementById('notes-empty-state');
    var editorPanel = document.getElementById('notes-editor-panel');
    var editorTitle = document.getElementById('note-title-input');
    var editorContent = document.getElementById('note-editor');
    var editorPreview = document.getElementById('note-preview');

    var note = getNode(state.activeNodeId);

    if (!note || note.type !== 'note') {
      if (emptyState) emptyState.style.display = 'flex';
      if (editorPanel) editorPanel.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (editorPanel) editorPanel.style.display = 'flex';

    // Populate fields
    editorTitle.value = note.title;
    editorContent.value = note.content || '';

    // Sync editor/preview
    syncPreview(editorContent.value);
    updateMetaInfo();
    updateLinkCount();

    // Save active ID
    localStorage.setItem(ACTIVE_NOTE_ID, note.id);
  }

  function selectNote(id) {
    // Auto-save current if active
    var currentNote = getNode(state.activeNodeId);
    if (currentNote && currentNote.content) {
      updateNoteContent(document.getElementById('note-editor').value);
    }

    state.activeNodeId = id;

    // Update tree highlight
    document.querySelectorAll('.tree-item.active').forEach(function(el) {
      el.classList.remove('active');
    });
    var activeEl = document.querySelector('.tree-item[data-id="' + id + '"]');
    if (activeEl) activeEl.classList.add('active');

    renderEditorPanel();
  }

  // ========== MARKDOWN & WIKILINKS ==========
  function parseMarkdown(text) {
    var html = escapeHtml(text);

    // Code blocks (must be before other patterns)
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr>');

    // Unordered lists
    html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, function(m) {
      return '<ul>' + m + '</ul>';
    });

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<ol_start><li>$1</li>');
    html = html.replace(/<ol_start>(<li>.*<\/li>\n?)+/g, function(m) {
      return '<ol>' + m.replace(/<ol_start>/g, '') + '</ol>';
    });

    // Line breaks (non-header lines)
    html = html.replace(/^(?!<[hopu]|<blockquote|<hr|<pre|<li|<\/)[^\n]+$/gm, function(m) {
      if (m.trim()) return '<p>' + m + '</p>';
      return m;
    });

    // Consolidate multiple paragraph tags
    html = html.replace(/(<p>.*?<\/p>\s*)+/g, function(m) {
      return m.replace(/\s*<\/p>\s*<p>\s*/g, '</p><p>');
    });

    return html;
  }

  function processWikilinks(html) {
    // [[Note Name]] → clickable link
    return html.replace(/\[\[(.+?)\]\]/g, function(match, noteName) {
      var trimmed = noteName.trim();
      var matchingNote = findNoteByTitle(trimmed);
      
      if (matchingNote) {
        return '<span class="wikilink" data-note-id="' + matchingNote.id + '">' + escapeHtml(trimmed) + '</span>';
      } else {
        return '<span class="wikilink broken" data-note-name="' + escapeHtml(trimmed) + '">' + escapeHtml(trimmed) + '</span>';
      }
    });
  }

  function findNoteByTitle(title) {
    var notes = getNotes();
    return notes.find(function(n) {
      return n.title.toLowerCase() === title.toLowerCase();
    }) || null;
  }

  function syncPreview(content) {
    var editor = document.getElementById('note-editor');
    var preview = document.getElementById('note-preview');

    if (!editor || !preview) return;

    // Parse markdown
    var html = parseMarkdown(content);

    // Process wikilinks
    html = processWikilinks(html);

    preview.innerHTML = html;

    // Attach click listeners to wikilinks
    preview.querySelectorAll('.wikilink').forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        var noteId = link.dataset.noteId;
        var noteName = link.dataset.noteName;

        if (noteId) {
          // Existing note
          selectNote(noteId);
        } else if (noteName) {
          // Broken link - offer to create
          openLinkPickerModal(noteName);
        }
      });
    });
  }

  function updateMetaInfo() {
    var modifiedEl = document.getElementById('note-modified');
    var wordsEl = document.getElementById('note-words');
    var linksEl = document.getElementById('note-links');

    var note = getNode(state.activeNodeId);
    if (!note) return;

    // Modified time
    if (modifiedEl && note.modified) {
      var date = new Date(note.modified);
      modifiedEl.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Word count
    if (wordsEl && note.content) {
      var words = note.content.trim().split(/\s+/).filter(function(w) { return w.length > 0; }).length;
      wordsEl.textContent = words + ' ' + getTrans('text_words') || 'words';
    }

    // Link count
    if (linksEl && note.content) {
      var linkCount = (note.content.match(/\[\[.+?\]\]/g) || []).length;
      linksEl.textContent = linkCount + ' ' + (getTrans('notes_links') || 'links');
    }
  }

  function updateLinkCount() {
    var note = getNode(state.activeNodeId);
    if (note && note.content) {
      var linkCount = (note.content.match(/\[\[.+?\]\]/g) || []).length;
      var el = document.getElementById('note-links');
      if (el) el.textContent = linkCount + ' ' + (getTrans('notes_links') || 'links');
    }
  }

  // ========== SEARCH ==========
  function applySearchFilter() {
    var query = state.searchQuery.toLowerCase().trim();
    var items = document.querySelectorAll('.tree-item');

    items.forEach(function(item) {
      var titleEl = item.querySelector('.tree-title');
      if (!titleEl) return;

      var title = titleEl.textContent.toLowerCase();
      var visible = !query || title.includes(query);

      if (visible) {
        item.parentElement.style.display = '';
        item.style.opacity = '';
        item.style.backgroundColor = '';
      } else {
        item.parentElement.style.display = 'none';
      }
    });
  }

  // ========== IMPORT / EXPORT ==========
  function exportData() {
    var data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes: state.nodes
    };

    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'notes_' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(getTrans('toast_downloaded') || 'Exported');
  }

  function exportSingleNote() {
    var note = getNode(state.activeNodeId);
    if (!note) return;

    var format = prompt(getTrans('notes_export_format') || 'Export format (txt/md):', 'md');
    var ext = format === 'txt' ? 'txt' : 'md';
    var content = format === 'txt' ? note.content : '# ' + note.title + '\n\n' + note.content;

    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.' + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(getTrans('toast_downloaded') || 'Note exported');
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);

        if (!data.nodes || !Array.isArray(data.nodes)) {
          showToast(getTrans('notes_invalid_file') || 'Invalid notes file');
          return;
        }

        // Merge with existing (avoid duplicates by checking titles)
        var existingTitles = getAllNodes().map(function(n) { return n.title.toLowerCase(); });
        var importedCount = 0;

        function mergeNodes(nodes, parent) {
          nodes.forEach(function(node) {
            if (!existingTitles.includes(node.title.toLowerCase())) {
              // Clone and assign new ID
              var newNode = JSON.parse(JSON.stringify(node));
              newNode.id = genId(node.type);
              newNode.isNew = true;

              if (parent) {
                if (!parent.children) parent.children = [];
                parent.children.push(newNode);
              } else {
                state.nodes.push(newNode);
              }

              importedCount++;

              if (newNode.children && newNode.children.length > 0) {
                mergeNodes(newNode.children, newNode);
              }
            }
          });
        }

        mergeNodes(data.nodes, null);
        saveData();
        renderAll();
        showToast((getTrans('notes_imported') || 'Imported') + ': ' + importedCount + ' ' + (getTrans('notes_items') || 'items'));
      } catch(err) {
        showToast(getTrans('notes_import_failed') || 'Failed to import');
      }
    };
    reader.readAsText(file);
  }

    // ========== TOGGLE / VIEW ==========
  function toggleSidebar() {
    var sidebar = document.getElementById('notes-sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
    localStorage.setItem(SIDEBAR_COLLAPSED, sidebar.classList.contains('collapsed') ? 'true' : 'false');
  }

  function applyViewMode(mode) {
    var container = document.getElementById('notes-main');
    var editorBody = document.querySelector('.editor-body');
    var editorTextarea = document.getElementById('note-editor');
    var previewDiv = document.getElementById('note-preview');
    var tabWrite = document.getElementById('tab-write');
    var tabPreview = document.getElementById('tab-preview');

    if (!container || !editorBody) return;

    // Reset classes
    container.classList.remove('view-editor-only', 'view-preview-only');
    editorBody.classList.remove('full-width');

    switch(mode) {
      case 'editor':
        container.classList.add('view-editor-only');
        if (editorTextarea) editorTextarea.style.display = '';
        if (previewDiv) previewDiv.style.display = 'none';
        if (tabWrite) tabWrite.classList.add('active');
        if (tabPreview) tabPreview.classList.remove('active');
        break;
      case 'preview':
        container.classList.add('view-preview-only');
        editorBody.classList.add('full-width');
        if (editorTextarea) editorTextarea.style.display = 'none';
        if (previewDiv) { previewDiv.style.display = 'block'; previewDiv.classList.add('visible'); }
        if (tabWrite) tabWrite.classList.remove('active');
        if (tabPreview) tabPreview.classList.add('active');
        break;
      default: // 'split'
        if (editorTextarea) editorTextarea.style.display = '';
        if (previewDiv) { previewDiv.style.display = 'block'; previewDiv.classList.add('visible'); }
        if (tabWrite) tabWrite.classList.add('active');
        if (tabPreview) tabPreview.classList.remove('active');
    }

    localStorage.setItem(VIEW_MODE, mode);
  }

  function toggleMarkdownPreview() {
    var editorBody = document.querySelector('.editor-body');
    if (!editorBody) return;

    if (editorBody.classList.contains('full-width')) {
      // From preview back to split
      applyViewMode('split');
    } else {
      // From split to preview
      applyViewMode('preview');
    }
  }

  function switchTab(tabName) {
    var tabWrite = document.getElementById('tab-write');
    var tabPreview = document.getElementById('tab-preview');
    var editorTextarea = document.getElementById('note-editor');
    var previewDiv = document.getElementById('note-preview');
    var editorBody = document.querySelector('.editor-body');

    if (tabWrite) tabWrite.classList.remove('active');
    if (tabPreview) tabPreview.classList.remove('active');

    if (tabName === 'write') {
      if (tabWrite) tabWrite.classList.add('active');
      if (editorTextarea) editorTextarea.style.display = '';
      if (previewDiv) previewDiv.style.display = 'none';
      if (editorBody) editorBody.classList.remove('full-width');
      if (editorTextarea) editorTextarea.focus();
    } else if (tabName === 'preview') {
      if (tabPreview) tabPreview.classList.add('active');
      if (editorTextarea) editorTextarea.style.display = 'none';
      if (previewDiv) { previewDiv.style.display = 'block'; previewDiv.classList.add('visible'); }
      if (editorBody) editorBody.classList.add('full-width');

      // Re-render preview
      var content = editorTextarea ? editorTextarea.value : '';
      syncPreview(content);
    }
  }

  // ========== CONTEXT MENU ==========
  function showContextMenu(x, y, nodeId) {
    state.contextTargetId = nodeId;
    var menu = document.getElementById('context-menu');
    if (!menu) return;

    // Position menu
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.add('visible');

    // Adjust if out of viewport
    var rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = (window.innerWidth - rect.width - 10) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = (window.innerHeight - rect.height - 10) + 'px';
    }
  }

  function hideContextMenu() {
    var menu = document.getElementById('context-menu');
    if (menu) menu.classList.remove('visible');
    state.contextTargetId = null;
  }

  // ========== RENAME MODAL ==========
  var renameCallback = null;

  function openRenameModal(nodeId) {
    var node = getNode(nodeId);
    if (!node) return;

    var modal = document.getElementById('rename-modal');
    var input = document.getElementById('rename-input');
    if (!modal || !input) return;

    input.value = node.title;
    modal.classList.add('visible');

    setTimeout(function() {
      input.focus();
      input.select();
    }, 50);

    renameCallback = function(newTitle) {
      if (newTitle && newTitle.trim() && newTitle.trim() !== node.title) {
        renameNode(nodeId, newTitle.trim());
      }
    };
  }

  function closeRenameModal() {
    var modal = document.getElementById('rename-modal');
    if (modal) modal.classList.remove('visible');
    renameCallback = null;
  }

  function confirmRename() {
    var input = document.getElementById('rename-input');
    if (!input) return;

    if (renameCallback) {
      renameCallback(input.value);
    }

    closeRenameModal();
  }

  // ========== LINK PICKER MODAL ==========
  function openLinkPickerModal(noteName) {
    var modal = document.getElementById('link-picker-modal');
    var input = document.getElementById('link-picker-target');
    var results = document.getElementById('note-list-results');
    if (!modal || !input) return;

    input.value = noteName;
    state.pendingLinkId = noteName;
    modal.style.display = 'flex';

    // Populate results with existing notes
    renderNoteResults(noteName);

    setTimeout(function() {
      input.focus();
      input.select();
    }, 50);
  }

  function closeLinkPickerModal() {
    var modal = document.getElementById('link-picker-modal');
    if (modal) modal.style.display = 'none';
    state.pendingLinkId = null;
  }

  function renderNoteResults(query) {
    var container = document.getElementById('note-list-results');
    if (!container) return;
    container.innerHTML = '';

    var notes = getNotes();
    var lowerQuery = (query || '').toLowerCase();

    // Filter matching notes
    var matching = notes.filter(function(n) {
      return n.title.toLowerCase().includes(lowerQuery);
    });

    if (matching.length === 0) {
      container.innerHTML = '<div class="note-result-item" style="cursor:default;color:var(--text-muted,#8a8474);font-style:italic;">No matching notes found</div>';
      return;
    }

    matching.forEach(function(note) {
      var item = document.createElement('div');
      item.className = 'note-result-item';
      item.textContent = note.title;
      item.addEventListener('click', function() {
        // Navigate to existing note
        selectNote(note.id);
        closeLinkPickerModal();
      });
      container.appendChild(item);
    });
  }

  function confirmLinkPickerCreate() {
    var input = document.getElementById('link-picker-target');
    var noteName = input ? input.value.trim() : '';
    if (!noteName) {
      closeLinkPickerModal();
      return;
    }

    // Check if note already exists
    var existing = findNoteByTitle(noteName);
    if (existing) {
      selectNote(existing.id);
    } else {
      // Create new note with that title
      var newNote = createNote(null, noteName);
      // The createNote already sets active and renders
    }

    closeLinkPickerModal();
  }

  // ========== EMPTY STATE (FIXED) ==========
  function toggleEmptyState() {
    var emptyState = document.getElementById('notes-empty-state');
    var editorPanel = document.getElementById('notes-editor-panel');
    var toolbar = document.getElementById('notes-toolbar');
    var container = document.getElementById('notes-container');
    var sidebar = document.getElementById('notes-sidebar');

    var hasNotes = getNotes().length > 0;

    if (!hasNotes) {
      if (emptyState) emptyState.style.display = 'flex';
      if (editorPanel) editorPanel.style.display = 'none';
      if (toolbar) toolbar.style.display = 'none';
      if (sidebar) sidebar.style.display = 'none';
      // DO NOT hide container — empty state is inside it!
      if (container) container.style.display = 'flex';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      if (toolbar) toolbar.style.display = '';
      if (sidebar) sidebar.style.display = '';
      if (container) container.style.display = '';
      var note = getNode(state.activeNodeId);
      if (!note || note.type !== 'note') {
        if (editorPanel) editorPanel.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
      } else {
        if (editorPanel) editorPanel.style.display = 'flex';
        if (emptyState) emptyState.style.display = 'none';
      }
    }
  }

  // ========== UTILITY ==========
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== SETUP ==========
  function setup() {

    // ===== New Note / New Folder =====
    var btnNewNote = document.getElementById('btn-new-note');
    var btnNewFolder = document.getElementById('btn-new-folder');

    if (btnNewNote) {
      btnNewNote.addEventListener('click', function() {
        // Create at root or inside active folder
        var activeNode = getNode(state.activeNodeId);
        var parentId = (activeNode && activeNode.type === 'folder') ? activeNode.id : null;
        createNote(parentId);
      });
    }

    if (btnNewFolder) {
      btnNewFolder.addEventListener('click', function() {
        var name = prompt(getTrans('notes_folder_name') || 'Folder name:', 'New Folder');
        if (name && name.trim()) {
          var activeNode = getNode(state.activeNodeId);
          var parentId = (activeNode && activeNode.type === 'folder') ? activeNode.id : null;
          createFolder(parentId, name.trim());
        }
      });
    }

    // ===== Create First Note =====
    var btnCreateFirst = document.getElementById('btn-create-first-note');
    if (btnCreateFirst) {
      btnCreateFirst.addEventListener('click', function() {
        createNote(null, 'Welcome Note');
      });
    }

    // ===== Toggle Sidebar =====
    var btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', toggleSidebar);
    }

    // ===== Search =====
    var searchInput = document.getElementById('notes-search');
    var searchClear = document.getElementById('notes-search-clear');

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

    // ===== View Toggle Buttons =====
    var btnViewSplit = document.getElementById('btn-view-split');
    var btnViewEditor = document.getElementById('btn-view-editor');
    var btnViewPreview = document.getElementById('btn-view-preview');

    if (btnViewSplit) {
      btnViewSplit.addEventListener('click', function() {
        setActiveViewButton(this);
        applyViewMode('split');
      });
    }

    if (btnViewEditor) {
      btnViewEditor.addEventListener('click', function() {
        setActiveViewButton(this);
        applyViewMode('editor');
      });
    }

    if (btnViewPreview) {
      btnViewPreview.addEventListener('click', function() {
        setActiveViewButton(this);
        applyViewMode('preview');
      });
    }

    // ===== Editor Tabs =====
    var tabWrite = document.getElementById('tab-write');
    var tabPreview = document.getElementById('tab-preview');

    if (tabWrite) {
      tabWrite.addEventListener('click', function() {
        switchTab('write');
      });
    }

    if (tabPreview) {
      tabPreview.addEventListener('click', function() {
        switchTab('preview');
      });
    }

    // ===== Markdown Toggle Button =====
    var btnMdToggle = document.getElementById('btn-markdown-toggle');
    if (btnMdToggle) {
      btnMdToggle.addEventListener('click', toggleMarkdownPreview);
    }

    // ===== Import / Export =====
    var btnImport = document.getElementById('btn-import');
    var importInput = document.getElementById('import-file-input');
    var btnExport = document.getElementById('btn-export');
    var btnExportNote = document.getElementById('btn-export-note');

    if (btnImport && importInput) {
      btnImport.addEventListener('click', function() {
        importInput.click();
      });
      importInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
          importData(this.files[0]);
          this.value = '';
        }
      });
    }

    if (btnExport) {
      btnExport.addEventListener('click', exportData);
    }

    if (btnExportNote) {
      btnExportNote.addEventListener('click', exportSingleNote);
    }

    // ===== Delete Note =====
    var btnDeleteNote = document.getElementById('btn-delete-note');
    if (btnDeleteNote) {
      btnDeleteNote.addEventListener('click', function() {
        if (state.activeNodeId) {
          deleteNode(state.activeNodeId);
        }
      });
    }

    // ===== Editor Input Listeners =====
    var noteTitleInput = document.getElementById('note-title-input');
    var noteEditor = document.getElementById('note-editor');

    if (noteTitleInput) {
      noteTitleInput.addEventListener('input', function() {
        var note = getNode(state.activeNodeId);
        if (note) {
          note.title = this.value;
          note.modified = Date.now();
          saveData();
          // Update tree title without full re-render
          var treeTitle = document.querySelector('.tree-item.active .tree-title');
          if (treeTitle) treeTitle.textContent = this.value;
        }
      });
    }

    if (noteEditor) {
      var debounceTimer = null;
      noteEditor.addEventListener('input', function() {
        var content = this.value;

        // Debounce save
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
          updateNoteContent(content);
        }, 500);

        // Live preview update (if visible)
        var preview = document.getElementById('note-preview');
        if (preview && preview.style.display !== 'none') {
          syncPreview(content);
        }

        // Update word count live
        var wordsEl = document.getElementById('note-words');
        if (wordsEl) {
          var words = content.trim().split(/\s+/).filter(function(w) { return w.length > 0; }).length;
          wordsEl.textContent = words + ' ' + (getTrans('text_words') || 'words');
        }
      });
    }

    // ===== Context Menu =====
    var contextMenu = document.getElementById('context-menu');

    document.addEventListener('click', function(e) {
      if (contextMenu && contextMenu.classList.contains('visible')) {
        if (!contextMenu.contains(e.target)) {
          hideContextMenu();
        }
      }
    });

    document.addEventListener('contextmenu', function(e) {
      // Only handle right-clicks outside tree items (tree items have their own handler)
      if (!e.target.closest('.tree-item')) {
        hideContextMenu();
      }
    });

    if (contextMenu) {
      var items = contextMenu.querySelectorAll('.context-item');
      items.forEach(function(item) {
        item.addEventListener('click', function() {
          var action = this.dataset.action;
          var nodeId = state.contextTargetId;
          if (!nodeId) { hideContextMenu(); return; }

          switch(action) {
            case 'rename':
              openRenameModal(nodeId);
              break;
            case 'delete':
              deleteNode(nodeId);
              break;
            case 'cut':
              // Placeholder for future cut functionality
              showToast('Cut coming soon');
              break;
            case 'paste':
              showToast('Paste coming soon');
              break;
          }
          hideContextMenu();
        });
      });
    }

    // ===== Rename Modal =====
    var renameModal = document.getElementById('rename-modal');
    var renameOverlay = document.getElementById('rename-modal-overlay');
    var renameClose = document.getElementById('rename-modal-close');
    var renameCancel = document.getElementById('rename-cancel');
    var renameConfirm = document.getElementById('rename-confirm');
    var renameInput = document.getElementById('rename-input');

    if (renameOverlay) renameOverlay.addEventListener('click', closeRenameModal);
    if (renameClose) renameClose.addEventListener('click', closeRenameModal);
    if (renameCancel) renameCancel.addEventListener('click', closeRenameModal);
    if (renameConfirm) renameConfirm.addEventListener('click', confirmRename);

    if (renameInput) {
      renameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmRename();
        } else if (e.key === 'Escape') {
          closeRenameModal();
        }
      });
    }

    // ===== Link Picker Modal =====
    var lpModal = document.getElementById('link-picker-modal');
    var lpOverlay = document.getElementById('link-picker-modal-overlay');
    var lpClose = document.getElementById('link-picker-modal-close');
    var lpCancel = document.getElementById('link-picker-cancel');
    var lpCreate = document.getElementById('link-picker-create');
    var lpInput = document.getElementById('link-picker-target');

    if (lpOverlay) lpOverlay.addEventListener('click', closeLinkPickerModal);
    if (lpClose) lpClose.addEventListener('click', closeLinkPickerModal);
    if (lpCancel) lpCancel.addEventListener('click', closeLinkPickerModal);
    if (lpCreate) lpCreate.addEventListener('click', confirmLinkPickerCreate);

    if (lpInput) {
      lpInput.addEventListener('input', function() {
        renderNoteResults(this.value);
      });

      lpInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmLinkPickerCreate();
        } else if (e.key === 'Escape') {
          closeLinkPickerModal();
        }
      });
    }

    // ===== Keyboard Shortcuts =====
    document.addEventListener('keydown', function(e) {
      var inModal = document.querySelector('.modal.visible') ||
                   (document.getElementById('link-picker-modal') &&
                    document.getElementById('link-picker-modal').style.display === 'flex');
      if (inModal) return;

      // Escape
      if (e.key === 'Escape') {
        hideContextMenu();
        // Close any open dropdown
        var dropdowns = document.querySelectorAll('.dropdown-content.visible');
        dropdowns.forEach(function(d) { d.classList.remove('visible'); });
      }

      // Ctrl+S export all
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        exportData();
      }

      // Ctrl+N new note
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        var activeNode = getNode(state.activeNodeId);
        var parentId = (activeNode && activeNode.type === 'folder') ? activeNode.id : null;
        createNote(parentId);
      }

      // Ctrl+E export single note
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        exportSingleNote();
      }

      // Ctrl+Shift+F focus search
      if (e.ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        var search = document.getElementById('notes-search');
        if (search) search.focus();
      }
    });

    // ===== Language Change Listener =====
    window.addEventListener('oros-language-changed', function() {
      renderAll();
    });

    // ===== Window Resize =====
    window.addEventListener('resize', function() {
      // Hide context menu on resize
      hideContextMenu();
    });
  }

  function setActiveViewButton(btn) {
    var buttons = document.querySelectorAll('.view-btn');
    buttons.forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  }

  // ========== INIT ==========
  function init() {
    loadData();
    setup();
    renderAll();

    // Apply saved view mode
    var savedMode = localStorage.getItem(VIEW_MODE) || 'split';
    applyViewMode(savedMode);

    // Set active view button
    var viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(function(btn) {
      btn.classList.remove('active');
      if ((savedMode === 'split' && btn.id === 'btn-view-split') ||
          (savedMode === 'editor' && btn.id === 'btn-view-editor') ||
          (savedMode === 'preview' && btn.id === 'btn-view-preview')) {
        btn.classList.add('active');
      }
    });
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();