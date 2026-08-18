// ============================================
// orOS Wiki Notes — Full Implementation v3
// FIXES: checklist support, note actions,
// tags editor, i18n, pinned notes, backlinks,
// multi-format import (md/txt/html/enex/json/xml)
// ============================================

(function() {
  'use strict';

  // ========== STORAGE KEYS ==========
  var STORAGE_KEY = 'oros_wiki_notes';
  var SETTINGS_KEY = 'oros_wiki_settings';

  // ========== STATE ==========
  var notes = {};
  var noteOrder = [];
  var settings = { activeNoteId: null, viewMode: 'split', sidebarWidth: 280 };
  var activeTagFilter = null;
  var saveTimer = null;
  var graphNodes = [];
  var graphEdges = [];
  var graphDragNode = null;
  var graphOffset = { x: 0, y: 0 };
  var graphZoom = 1;
  var graphPanStart = null;
  var graphAnimFrame = null;
  var deferredInstallPrompt = null;

  // ========== DOM ==========
  var noteListEl = document.getElementById('wiki-note-list');
  var sidebarTagsEl = document.getElementById('wiki-sidebar-tags');
  var searchInput = document.getElementById('wiki-search');
  var titleInput = document.getElementById('wiki-note-title');
  var editorTextarea = document.getElementById('wiki-editor');
  var previewContent = document.getElementById('wiki-preview-content');
  var splitPane = document.getElementById('wiki-split-pane');
  var emptyState = document.getElementById('wiki-empty');
  var editorView = document.getElementById('wiki-editor-view');
  var backlinksList = document.getElementById('wiki-backlinks-list');
  var tagsEditorEl = document.getElementById('wiki-tags-editor');
  var wordCountEl = document.getElementById('wiki-word-count');
  var modifiedDateEl = document.getElementById('wiki-modified-date');
  var saveStatusEl = document.getElementById('wiki-save-status');
  var graphOverlay = document.getElementById('wiki-graph-overlay');
  var graphCanvas = document.getElementById('wiki-graph-canvas');
  var noteActionsEl = document.getElementById('wiki-note-actions');

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
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var now = new Date();
    var diffMs = now - d;
    var diffMin = Math.floor(diffMs / 60000);
    var diffHr = Math.floor(diffMin / 60);
    var diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    if (diffHr < 24) return diffHr + 'h ago';
    if (diffDay < 7) return diffDay + 'd ago';

    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    return day + '/' + month + '/' + d.getFullYear();
  }

  function countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(function(w) { return w.length > 0; }).length;
  }

  function extractPreview(content) {
    if (!content) return '';
    var stripped = content
      .replace(/^#+\s+/gm, '')
      .replace(/\[\[.+?\]\]/g, function(m) { return m.slice(2, -2); })
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/[`*_~>#-]/g, '')
      .trim();
    return stripped.substring(0, 80);
  }

  // ========== TRANSLATE UI ==========
  function translateUI() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var val = getTrans(key);
      if (val && val !== key) el.textContent = val;
    });

    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-title');
      var val = getTrans(key);
      if (val && val !== key) el.title = val;
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-ph');
      var val = getTrans(key);
      if (val && val !== key) el.placeholder = val;
    });

    renderNoteList();
    renderSidebarTags();
    renderPreview();
    renderBacklinks();
    renderTagsEditor();
    updateStatusBar();
  }

  // ========== MARKDOWN PARSER (with checklist support) ==========
  function renderMarkdown(content) {
    if (!content) return '';

    var html = escapeHtml(content);

    // Code blocks (fenced)
    html = html.replace(/```([\s\S]*?)```/g, function(match, code) {
      return '\n<pre><code>' + code.trim() + '</code></pre>\n';
    });

    // Checklist items — BEFORE regular list processing
    html = html.replace(/^[\-*]\s+\[( |x|X)\]\s+(.+)$/gm, function(match, check, text) {
      var checked = check.toLowerCase() === 'x';
      var cb = checked ? 'checked' : '';
      return '<li class="task-list-item"><input type="checkbox" class="task-list-checkbox" ' + cb + ' disabled> ' + text + '</li>';
    });

    // Regular unordered list items (not checklists)
    html = html.replace(/^[\-*]\s+(?!\[)(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li(?:\s+class="task-list-item")?>.*<\/li>\n?)+/g, function(match) {
      var hasTask = match.indexOf('task-list-item') !== -1;
      var cls = hasTask ? ' class="contains-task-list"' : '';
      return '<ul' + cls + '>' + match + '</ul>';
    });

    // Ordered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li-num>$1</li-num>');
    html = html.replace(/(<li-num>.*<\/li-num>\n?)+/g, function(match) {
      return '<ol>' + match.replace(/<li-num>/g, '<li>').replace(/<\/li-num>/g, '</li>') + '</ol>';
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, function(match, code) {
      return '<code>' + code + '</code>';
    });

    // Headers
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Horizontal rule
    html = html.replace(/^---+$/gm, '<hr>');

    // Blockquote
    html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Wiki links [[Note Title]]
    html = html.replace(/\[\[(.+?)\]\]/g, function(match, link) {
      var note = findNoteByTitle(link.trim());
      if (note) {
        return '<a class="wiki-link" data-note-id="' + note.id + '">' + escapeHtml(link.trim()) + '</a>';
      }
      return '<a class="wiki-link unlinked" data-create-title="' + escapeHtml(link.trim()) + '">' + escapeHtml(link.trim()) + '</a>';
    });

    // Regular links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(match, text, url) {
      return '<a href="' + url + '" target="_blank" rel="noopener">' + text + '</a>';
    });

    // Images ![alt](url)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(match, alt, url) {
      return '<img src="' + url + '" alt="' + alt + '">';
    });

    // Tables
    html = html.replace(/^\|(.+)\|$/gm, function(match, cells) {
      var trimmed = cells.trim();
      if (trimmed.indexOf('---') !== -1) return '';
      var cellArr = trimmed.split('|').map(function(c) { return c.trim(); });
      if (!cellArr[cellArr.length - 1]) cellArr.pop();
      if (!cellArr[0]) cellArr.shift();
      var tds = cellArr.map(function(c) { return '<td>' + c + '</td>'; }).join('');
      return '<tr>' + tds + '</tr>';
    });
    html = html.replace(/(<tr>.*<\/tr>\n?)+/g, function(match) {
      return '<table>' + match + '</table>';
    });

    // Paragraphs
    html = html.split('\n\n').map(function(block) {
      if (block.trim() === '') return '';
      if (/^<(h[1-6]|ul|ol|pre|blockquote|hr|table)/.test(block.trim())) return block;
      return '<p>' + block.trim().replace(/\n/g, '<br>') + '</p>';
    }).join('\n');

    return html;
  }

  // ========== PERSISTENCE ==========
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes: notes, order: noteOrder }));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function load() {
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data && data.notes) notes = data.notes;
      if (data && data.order) noteOrder = data.order;
    } catch(e) {
      notes = {};
      noteOrder = [];
    }

    try {
      var s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      if (s) {
        if (s.activeNoteId) settings.activeNoteId = s.activeNoteId;
        if (s.viewMode) settings.viewMode = s.viewMode;
        if (s.sidebarWidth) settings.sidebarWidth = s.sidebarWidth;
      }
    } catch(e) {}

    var noteIds = Object.keys(notes);
    for (var i = 0; i < noteIds.length; i++) {
      if (noteOrder.indexOf(noteIds[i]) === -1) {
        noteOrder.push(noteIds[i]);
      }
    }
    noteOrder = noteOrder.filter(function(id) { return notes[id]; });

    if (noteOrder.length === 0) {
      createWelcomeNote();
    }
    if (!settings.activeNoteId || !notes[settings.activeNoteId]) {
      settings.activeNoteId = noteOrder[0] || null;
    }
  }

  function createWelcomeNote() {
    var id = uid();
    notes[id] = {
      id: id,
      title: 'Welcome to orOS Wiki',
      content: [
        '# Welcome to orOS Wiki Notes!',
        '',
        'This is your **privacy-first** wiki notebook.',
        '',
        '## Features',
        '',
        '- Full Markdown support',
        '- Bidirectional `[[wiki links]]`',
        '- Live preview pane',
        '- Tag organization',
        '- Connection graph view',
        '- XML import/export',
        '- Everything stays in your browser',
        '',
        '## Checklists',
        '',
        '- [ ] Try checking this box',
        '- [x] This one is done',
        '- [ ] Add your own tasks',
        '',
        '## Getting Started',
        '',
        'Try creating a new note and linking to it with [[brackets]].',
        'Click on an unlinked title to create that note instantly.',
        '',
        'Use the tag editor below to add tags.',
        'Use the pin button to pin important notes.',
        '',
        '---',
        '',
        'Designed by Christos Koulaxizis'
      ].join('\n'),
      tags: ['welcome', 'tutorial'],
      pinned: false,
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };
    noteOrder.push(id);
    settings.activeNoteId = id;
    save();
  }

  // ========== DATA ACCESSORS ==========
  function getActiveNote() {
    return notes[settings.activeNoteId] || null;
  }

  function findNoteByTitle(title) {
    var lower = title.toLowerCase();
    var ids = Object.keys(notes);
    for (var i = 0; i < ids.length; i++) {
      if (notes[ids[i]].title.toLowerCase() === lower) return notes[ids[i]];
    }
    return null;
  }

  function getBacklinks(noteId) {
    var note = notes[noteId];
    if (!note) return [];
    var backlinks = [];
    var ids = Object.keys(notes);
    for (var i = 0; i < ids.length; i++) {
      if (ids[i] === noteId) continue;
      var other = notes[ids[i]];
      var pattern = '\\[\\[' + note.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\]\\]';
      var regex = new RegExp(pattern, 'i');
      if (regex.test(other.content)) {
        backlinks.push(other);
      }
    }
    return backlinks;
  }

  function getAllTags() {
    var tagSet = {};
    var ids = Object.keys(notes);
    for (var i = 0; i < ids.length; i++) {
      var note = notes[ids[i]];
      if (note.tags) {
        for (var j = 0; j < note.tags.length; j++) {
          tagSet[note.tags[j]] = (tagSet[note.tags[j]] || 0) + 1;
        }
      }
    }
    return tagSet;
  }

  // ========== RENDERING ==========
  function renderNoteList() {
    noteOrder.sort(function(a, b) {
      var na = notes[a] || {};
      var nb = notes[b] || {};
      if (na.pinned && !nb.pinned) return -1;
      if (!na.pinned && nb.pinned) return 1;
      var ma = new Date(na.modified || 0).getTime();
      var mb = new Date(nb.modified || 0).getTime();
      return mb - ma;
    });

    noteListEl.innerHTML = '';

    var searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    var filtered = noteOrder.filter(function(id) {
      var note = notes[id];
      if (!note) return false;
      if (activeTagFilter && (!note.tags || note.tags.indexOf(activeTagFilter) === -1)) return false;
      if (searchQuery) {
        var matches = note.title.toLowerCase().indexOf(searchQuery) !== -1 ||
                      note.content.toLowerCase().indexOf(searchQuery) !== -1;
        if (!matches) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      noteListEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;font-style:italic;">' +
        getTrans('wiki_no_notes') + '</div>';
      return;
    }

    for (var i = 0; i < filtered.length; i++) {
      (function(noteId) {
        var note = notes[noteId];
        var item = document.createElement('div');
        item.className = 'note-item' + (noteId === settings.activeNoteId ? ' active' : '');
        if (note.pinned) item.classList.add('pinned');

        var title = document.createElement('div');
        title.className = 'note-item-title';
        title.textContent = note.title || getTrans('wiki_untitled');

        var preview = document.createElement('div');
        preview.className = 'note-item-preview';
        preview.textContent = extractPreview(note.content);

        var dateEl = document.createElement('div');
        dateEl.className = 'note-item-date';
        dateEl.textContent = formatDate(note.modified);

        item.appendChild(title);
        item.appendChild(preview);
        item.appendChild(dateEl);

        item.addEventListener('click', function() {
          selectNote(noteId);
        });

        item.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          if (confirm(getTrans('wiki_confirm_delete_note'))) {
            deleteNote(noteId);
          }
        });

        noteListEl.appendChild(item);
      })(filtered[i]);
    }
  }

  function renderSidebarTags() {
    var tags = getAllTags();
    var tagArr = Object.keys(tags).sort();
    sidebarTagsEl.innerHTML = '';

    if (tagArr.length === 0) return;

    var allBtn = document.createElement('span');
    allBtn.className = 'tag-filter' + (!activeTagFilter ? ' active' : '');
    allBtn.textContent = 'All';
    allBtn.addEventListener('click', function() {
      activeTagFilter = null;
      renderSidebarTags();
      renderNoteList();
    });
    sidebarTagsEl.appendChild(allBtn);

    for (var i = 0; i < tagArr.length; i++) {
      (function(tag) {
        var el = document.createElement('span');
        el.className = 'tag-filter' + (activeTagFilter === tag ? ' active' : '');
        el.textContent = tag + ' (' + tags[tag] + ')';
        el.addEventListener('click', function() {
          activeTagFilter = activeTagFilter === tag ? null : tag;
          renderSidebarTags();
          renderNoteList();
        });
        sidebarTagsEl.appendChild(el);
      })(tagArr[i]);
    }
  }

  function selectNote(noteId) {
    flushSave();

    settings.activeNoteId = noteId;
    save();

    var note = notes[noteId];
    if (!note) return;

    titleInput.value = note.title;
    editorTextarea.value = note.content;

    emptyState.style.display = 'none';
    editorView.style.display = 'flex';

    if (noteActionsEl) noteActionsEl.style.display = 'flex';

    setViewMode(settings.viewMode);
    renderPreview();
    renderBacklinks();
    renderTagsEditor();
    updateStatusBar();

    renderNoteList();
  }

  function setViewMode(mode) {
    settings.viewMode = mode;
    splitPane.dataset.mode = mode;

    var btns = document.querySelectorAll('.view-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].dataset.view === mode);
    }

    save();
  }

  function renderPreview() {
    var content = editorTextarea.value;
    var html = renderMarkdown(content);
    previewContent.innerHTML = html;

    var links = previewContent.querySelectorAll('.wiki-link');
    for (var i = 0; i < links.length; i++) {
      (function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          var noteId = link.dataset.noteId;
          var createTitle = link.dataset.createTitle;

          if (noteId && notes[noteId]) {
            selectNote(noteId);
          } else if (createTitle) {
            var newId = createNote(createTitle);
            selectNote(newId);
            renderSidebarTags();
            renderNoteList();
          }
        });
      })(links[i]);
    }
  }

  function renderBacklinks() {
    var note = getActiveNote();
    if (!note) {
      backlinksList.innerHTML = '';
      return;
    }

    var links = getBacklinks(note.id);
    backlinksList.innerHTML = '';

    if (links.length === 0) {
      backlinksList.innerHTML = '<div style="font-size:11px;color:var(--text-muted);font-style:italic;padding:4px 0;">\u2014</div>';
      return;
    }

    for (var i = 0; i < links.length; i++) {
      (function(bl) {
        var item = document.createElement('div');
        item.className = 'backlink-item';
        item.textContent = bl.title || getTrans('wiki_untitled');
        item.addEventListener('click', function() {
          selectNote(bl.id);
        });
        backlinksList.appendChild(item);
      })(links[i]);
    }
  }

  function renderTagsEditor() {
    var note = getActiveNote();
    if (!note || !tagsEditorEl) return;

    tagsEditorEl.innerHTML = '';

    if (note.tags) {
      for (var i = 0; i < note.tags.length; i++) {
        (function(tag, idx) {
          var chip = document.createElement('span');
          chip.className = 'wiki-tag-chip';
          chip.innerHTML = tag + ' <span class="wiki-tag-chip-remove">\u00d7</span>';
          chip.querySelector('.wiki-tag-chip-remove').addEventListener('click', function() {
            note.tags.splice(idx, 1);
            note.modified = new Date().toISOString();
            scheduleSave();
            renderTagsEditor();
            renderSidebarTags();
            renderNoteList();
          });
          tagsEditorEl.appendChild(chip);
        })(note.tags[i], i);
      }
    }

    var input = document.createElement('input');
    input.className = 'wiki-tag-input';
    input.placeholder = '+ tag';
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        var val = input.value.trim();
        if (val) {
          if (!note.tags) note.tags = [];
          if (note.tags.indexOf(val) === -1) {
            note.tags.push(val);
            note.modified = new Date().toISOString();
            scheduleSave();
            renderTagsEditor();
            renderSidebarTags();
            renderNoteList();
          }
          input.value = '';
        }
      }
    });
    tagsEditorEl.appendChild(input);
  }

  function updateStatusBar() {
    var note = getActiveNote();
    if (!note) return;
    wordCountEl.textContent = countWords(note.content) + ' ' + getTrans('wiki_word_count').toLowerCase();
    modifiedDateEl.textContent = getTrans('wiki_modified') + ': ' + formatDate(note.modified);
  }

  // ========== NOTE OPERATIONS ==========
  function createNote(title, content) {
    var id = uid();
    notes[id] = {
      id: id,
      title: title || getTrans('wiki_untitled'),
      content: content || '',
      tags: [],
      pinned: false,
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };
    noteOrder.unshift(id);
    save();
    return id;
  }

  function deleteNote(noteId) {
    delete notes[noteId];
    noteOrder = noteOrder.filter(function(id) { return id !== noteId; });
    if (settings.activeNoteId === noteId) {
      settings.activeNoteId = noteOrder[0] || null;
    }
    if (noteOrder.length === 0) {
      createWelcomeNote();
    }
    save();
    renderNoteList();
    renderSidebarTags();
    if (settings.activeNoteId) {
      selectNote(settings.activeNoteId);
    } else {
      emptyState.style.display = 'flex';
      editorView.style.display = 'none';
      if (noteActionsEl) noteActionsEl.style.display = 'none';
    }
    showToast(getTrans('toast_cleared'));
  }

  // ========== SAVE LOGIC ==========
  function scheduleSave() {
    saveStatusEl.textContent = getTrans('wiki_unsaved_changes') + '...';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 800);
  }

  function flushSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    var note = getActiveNote();
    if (!note) return;

    note.title = titleInput.value.trim() || getTrans('wiki_untitled');
    note.content = editorTextarea.value;
    note.modified = new Date().toISOString();

    save();
    saveStatusEl.textContent = getTrans('text_saved');
    updateStatusBar();
  }

  // ========== MULTI-FORMAT IMPORT ==========
  function importFromFile(file) {
    var ext = file.name.split('.').pop().toLowerCase();

    switch(ext) {
      case 'md':
      case 'markdown':
        importMarkdown(file);
        break;
      case 'txt':
        importPlainText(file);
        break;
      case 'html':
      case 'htm':
        importHTML(file);
        break;
      case 'enex':
        importEvernote(file);
        break;
      case 'json':
        importJSONNotes(file);
        break;
      case 'xml':
        importXML(file);
        break;
      default:
        showToast(getTrans('wiki_unsupported_format') || 'Unsupported format: ' + ext);
    }
  }

  // --- Markdown Import ---
  function importMarkdown(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var content = e.target.result;
      var title = file.name.replace(/\.(md|markdown)$/i, '');
      var tags = [];
      var body = content;

      // Parse YAML frontmatter (Obsidian/Jekyll style)
      var fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
      if (fmMatch) {
        var fm = fmMatch[1];
        var titleMatch = fm.match(/^title:\s*(.+)$/m);
        if (titleMatch) title = titleMatch[1].replace(/^["']|["']$/g, '').trim();
        var tagsMatch = fm.match(/^tags:\s*\[(.+)\]/m);
        if (tagsMatch) {
          tags = tagsMatch[1].split(',').map(function(t) {
            return t.trim().replace(/^["']|["']$/g, '');
          }).filter(Boolean);
        } else {
          var tagSection = fm.match(/^tags:\n((?:\s+-\s+.+\n?)+)/m);
          if (tagSection) {
            tags = tagSection[1].match(/-\s+(.+)/g).map(function(t) {
              return t.replace(/^-\s+/, '').trim().replace(/^["']|["']$/g, '');
            });
          }
        }
        body = content.slice(fmMatch[0].length);
      }

      var id = createNote(title, body);
      notes[id].tags = tags;
      notes[id].modified = new Date().toISOString();
      save();
      selectNote(id);
      renderNoteList();
      renderSidebarTags();
      showToast(getTrans('wiki_import_success') || 'Note imported');
    };
    reader.readAsText(file);
  }

  // --- Plain Text ---
  function importPlainText(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var title = file.name.replace(/\.txt$/i, '');
      var content = e.target.result;
      var id = createNote(title, content);
      save();
      selectNote(id);
      renderNoteList();
      showToast(getTrans('wiki_import_success') || 'Note imported');
    };
    reader.readAsText(file);
  }

  // --- HTML Import ---
  function importHTML(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var temp = document.createElement('div');
      temp.innerHTML = e.target.result;

      var titleEl = temp.querySelector('title');
      var title = titleEl ? titleEl.textContent : file.name.replace(/\.html?$/i, '');

      var markdown = htmlToMarkdownWiki(temp);
      var id = createNote(title, markdown);
      save();
      selectNote(id);
      renderNoteList();
      showToast(getTrans('wiki_import_success') || 'Note imported');
    };
    reader.readAsText(file);
  }

  function htmlToMarkdownWiki(container) {
    var md = '';
    var children = container.childNodes;

    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.nodeType === 3) {
        md += child.textContent;
      } else if (child.nodeType === 1) {
        var tag = child.tagName.toLowerCase();
        switch(tag) {
          case 'h1': md += '\n# ' + child.textContent + '\n\n'; break;
          case 'h2': md += '\n## ' + child.textContent + '\n\n'; break;
          case 'h3': md += '\n### ' + child.textContent + '\n\n'; break;
          case 'p': md += '\n' + htmlToMarkdownWiki(child) + '\n\n'; break;
          case 'br': md += '\n'; break;
          case 'strong': case 'b': md += '**' + child.textContent + '**'; break;
          case 'em': case 'i': md += '*' + child.textContent + '*'; break;
          case 'u': md += '__' + child.textContent + '__'; break;
          case 'code': md += '`' + child.textContent + '`'; break;
          case 'pre': md += '\n```\n' + child.textContent + '\n```\n\n'; break;
          case 'blockquote': md += '\n> ' + child.textContent + '\n\n'; break;
          case 'ul':
            var ulItems = child.querySelectorAll(':scope > li');
            for (var j = 0; j < ulItems.length; j++) {
              md += '- ' + ulItems[j].textContent + '\n';
            }
            md += '\n';
            break;
          case 'ol':
            var olItems = child.querySelectorAll(':scope > li');
            for (var k = 0; k < olItems.length; k++) {
              md += (k + 1) + '. ' + olItems[k].textContent + '\n';
            }
            md += '\n';
            break;
          case 'a': md += '[' + child.textContent + '](' + child.getAttribute('href') + ')'; break;
          case 'img': md += '![' + (child.alt || '') + '](' + child.src + ')'; break;
          case 'hr': md += '\n---\n\n'; break;
          case 'table': md += convertTableToMd(child); break;
          default: md += child.textContent || ''; break;
        }
      }
    }
    return md;
  }

  function convertTableToMd(table) {
    var rows = table.querySelectorAll('tr');
    if (rows.length === 0) return '';
    var md = '\n';
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll('td, th');
      var rowText = '|';
      for (var j = 0; j < cells.length; j++) {
        rowText += ' ' + cells[j].textContent.trim() + ' |';
      }
      md += rowText + '\n';
      if (i === 0) {
        var sep = '|';
        for (var j = 0; j < cells.length; j++) sep += ' --- |';
        md += sep + '\n';
      }
    }
    md += '\n';
    return md;
  }

  // --- Evernote ENEX Import ---
  function importEvernote(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var parser = new DOMParser();
        var doc = parser.parseFromString(e.target.result, 'text/xml');
        var noteEls = doc.querySelectorAll('note');
        var imported = 0;

        for (var i = 0; i < noteEls.length; i++) {
          var noteEl = noteEls[i];
          var title = (noteEl.querySelector('title') || {}).textContent || 'Untitled';
          var created = (noteEl.querySelector('created') || {}).textContent || '';
          var contentEl = noteEl.querySelector('content');
          var content = contentEl ? contentEl.textContent : '';

          if (content) {
            var temp = document.createElement('div');
            temp.innerHTML = content;
            content = htmlToMarkdownWiki(temp);
          }

          var id = createNote(title, content);
          if (created) notes[id].created = created;
          notes[id].modified = new Date().toISOString();
          imported++;
        }

        save();
        renderNoteList();
        renderSidebarTags();
        if (imported > 0) selectNote(noteOrder[0]);
        showToast(imported + ' notes imported from Evernote');
      } catch(err) {
        showToast('Evernote import error: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // --- JSON Import (Obsidian / generic) ---
  function importJSONNotes(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        var imported = 0;

        var notesArr = Array.isArray(data) ? data : (data.notes || [data]);

        for (var i = 0; i < notesArr.length; i++) {
          var item = notesArr[i];
          var title = item.title || item.name || 'Untitled';
          var content = item.content || item.body || item.text || '';
          var tags = item.tags || [];

          var id = createNote(title, content);
          if (Array.isArray(tags)) {
            notes[id].tags = tags;
          } else if (typeof tags === 'string') {
            notes[id].tags = tags.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
          }
          notes[id].modified = new Date().toISOString();
          imported++;
        }

        save();
        renderNoteList();
        renderSidebarTags();
        if (imported > 0) selectNote(noteOrder[0]);
        showToast(imported + ' notes imported');
      } catch(err) {
        showToast('JSON import error: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // ========== XML IMPORT / EXPORT ==========
  function exportXML() {
    var ids = Object.keys(notes);
    if (ids.length === 0) {
      showToast('No notes to export');
      return;
    }

    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<wiki-notes version="1.0" exported="' + new Date().toISOString() + '">\n';
    xml += '  <metadata>\n';
    xml += '    <author>Christos Koulaxizis</author>\n';
    xml += '    <total_notes>' + ids.length + '</total_notes>\n';
    xml += '  </metadata>\n\n';
    xml += '  <notes>\n';

    for (var i = 0; i < noteOrder.length; i++) {
      var note = notes[noteOrder[i]];
      if (!note) continue;

      xml += '    <note id="' + note.id + '" ';
      xml += 'created="' + (note.created || '') + '" ';
      xml += 'modified="' + (note.modified || '') + '"';
      if (note.pinned) xml += ' pinned="true"';
      xml += '>\n';
      xml += '      <title>' + escapeXml(note.title) + '</title>\n';

      if (note.tags && note.tags.length > 0) {
        xml += '      <tags>' + note.tags.map(function(t) { return escapeXml(t); }).join(', ') + '</tags>\n';
      }

      xml += '      <content markdown="true"><![CDATA[\n';
      xml += note.content;
      xml += '\n      ]]></content>\n';
      xml += '    </note>\n';
    }

    xml += '  </notes>\n';
    xml += '</wiki-notes>';

    var blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'oros_wiki_' + new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-') + '.xml';
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

        var root = doc.querySelector('wiki-notes');
        if (!root) {
          showToast('Invalid XML: missing wiki-notes root');
          return;
        }

        var noteEls = root.querySelectorAll('notes > note');
        var importedCount = 0;

        for (var i = 0; i < noteEls.length; i++) {
          var noteEl = noteEls[i];
          var id = noteEl.getAttribute('id') || uid();

          if (notes[id]) id = uid();

          var titleEl = noteEl.querySelector('title');
          var tagsEl = noteEl.querySelector('tags');
          var contentEl = noteEl.querySelector('content');

          var note = {
            id: id,
            title: titleEl ? titleEl.textContent : getTrans('wiki_untitled'),
            content: contentEl ? contentEl.textContent : '',
            tags: [],
            pinned: noteEl.getAttribute('pinned') === 'true',
            created: noteEl.getAttribute('created') || new Date().toISOString(),
            modified: noteEl.getAttribute('modified') || new Date().toISOString()
          };

          if (tagsEl && tagsEl.textContent) {
            note.tags = tagsEl.textContent.split(',').map(function(t) {
              return t.trim();
            }).filter(Boolean);
          }

          notes[id] = note;
          noteOrder.unshift(id);
          importedCount++;
        }

        save();
        renderNoteList();
        renderSidebarTags();
        if (importedCount > 0) {
          selectNote(noteOrder[0]);
        }
        showToast(importedCount + ' notes imported');
      } catch(err) {
        showToast('Import error: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // ========== GRAPH VIEW ==========
  function buildGraphData() {
    graphNodes = [];
    graphEdges = [];

    var ids = Object.keys(notes);
    for (var i = 0; i < ids.length; i++) {
      graphNodes.push({
        id: ids[i],
        title: notes[ids[i]].title,
        x: Math.cos(i * 2.4) * 150 + 250,
        y: Math.sin(i * 2.4) * 150 + 200,
        radius: 6 + Math.min(12, (notes[ids[i]].content || '').length / 200),
        vx: 0,
        vy: 0
      });
    }

    for (var i = 0; i < ids.length; i++) {
      var note = notes[ids[i]];
      var matches = note.content.match(/\[\[(.+?)\]\]/g) || [];
      for (var j = 0; j < matches.length; j++) {
        var linkTitle = matches[j].slice(2, -2).trim();
        var target = findNoteByTitle(linkTitle);
        if (target && target.id !== note.id) {
          var exists = false;
          for (var k = 0; k < graphEdges.length; k++) {
            if ((graphEdges[k].source === ids[i] && graphEdges[k].target === target.id) ||
                (graphEdges[k].source === target.id && graphEdges[k].target === ids[i])) {
              exists = true;
              break;
            }
          }
          if (!exists) {
            graphEdges.push({ source: ids[i], target: target.id });
          }
        }
      }
    }
  }

  function renderGraph() {
    var canvas = graphCanvas;
    var ctx = canvas.getContext('2d');

    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(graphOffset.x, graphOffset.y);
    ctx.scale(graphZoom, graphZoom);

    ctx.strokeStyle = 'rgba(200, 169, 110, 0.25)';
    ctx.lineWidth = 1;
    for (var i = 0; i < graphEdges.length; i++) {
      var source = graphNodes.find(function(n) { return n.id === graphEdges[i].source; });
      var target = graphNodes.find(function(n) { return n.id === graphEdges[i].target; });
      if (!source || !target) continue;
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }

    for (var i = 0; i < graphNodes.length; i++) {
      var node = graphNodes[i];
      var isActive = node.id === settings.activeNoteId;

      if (isActive) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 169, 110, 0.2)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? '#c8a96e' : 'rgba(200, 169, 110, 0.5)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 169, 110, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = '11px Nunito, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'center';
      ctx.fillText(node.title.substring(0, 20), node.x, node.y + node.radius + 14);
    }

    ctx.restore();
  }

  function startGraphSimulation() {
    function tick() {
      var rect = graphCanvas.getBoundingClientRect();
      var cx = rect.width / 2;
      var cy = rect.height / 2;

      for (var i = 0; i < graphNodes.length; i++) {
        for (var j = i + 1; j < graphNodes.length; j++) {
          var dx = graphNodes[i].x - graphNodes[j].x;
          var dy = graphNodes[i].y - graphNodes[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;
          var force = 800 / (dist * dist);
          graphNodes[i].vx += (dx / dist) * force;
          graphNodes[i].vy += (dy / dist) * force;
          graphNodes[j].vx -= (dx / dist) * force;
          graphNodes[j].vy -= (dy / dist) * force;
        }
      }

      for (var i = 0; i < graphEdges.length; i++) {
        var source = graphNodes.find(function(n) { return n.id === graphEdges[i].source; });
        var target = graphNodes.find(function(n) { return n.id === graphEdges[i].target; });
        if (!source || !target) continue;
        var dx = target.x - source.x;
        var dy = target.y - source.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var force = (dist - 120) * 0.01;
        source.vx += (dx / dist) * force;
        source.vy += (dy / dist) * force;
        target.vx -= (dx / dist) * force;
        target.vy -= (dy / dist) * force;
      }

      for (var i = 0; i < graphNodes.length; i++) {
        graphNodes[i].vx += (cx - graphNodes[i].x) * 0.001;
        graphNodes[i].vy += (cy - graphNodes[i].y) * 0.001;
      }

      for (var i = 0; i < graphNodes.length; i++) {
        if (graphNodes[i] === graphDragNode) continue;
        graphNodes[i].vx *= 0.85;
        graphNodes[i].vy *= 0.85;
        graphNodes[i].x += graphNodes[i].vx;
        graphNodes[i].y += graphNodes[i].vy;
      }

      renderGraph();
      graphAnimFrame = requestAnimationFrame(tick);
    }

    tick();
  }

  function openGraphView() {
    graphOverlay.style.display = 'flex';
    buildGraphData();
    cancelAnimationFrame(graphAnimFrame);
    startGraphSimulation();
    setTimeout(function() {
      cancelAnimationFrame(graphAnimFrame);
      renderGraph();
    }, 3000);
  }

  function closeGraphView() {
    graphOverlay.style.display = 'none';
    cancelAnimationFrame(graphAnimFrame);
  }

  // ========== GRAPH INTERACTION ==========
  function setupGraphInteraction() {
    graphCanvas.addEventListener('mousedown', function(e) {
      var rect = graphCanvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left - graphOffset.x) / graphZoom;
      var my = (e.clientY - rect.top - graphOffset.y) / graphZoom;

      for (var i = 0; i < graphNodes.length; i++) {
        var dx = mx - graphNodes[i].x;
        var dy = my - graphNodes[i].y;
        if (Math.sqrt(dx * dx + dy * dy) < graphNodes[i].radius + 4) {
          graphDragNode = graphNodes[i];
          return;
        }
      }

      graphPanStart = { x: e.clientX - graphOffset.x, y: e.clientY - graphOffset.y };
    });

    graphCanvas.addEventListener('mousemove', function(e) {
      var rect = graphCanvas.getBoundingClientRect();

      if (graphDragNode) {
        graphDragNode.x = (e.clientX - rect.left - graphOffset.x) / graphZoom;
        graphDragNode.y = (e.clientY - rect.top - graphOffset.y) / graphZoom;
        renderGraph();
      } else if (graphPanStart) {
        graphOffset.x = e.clientX - graphPanStart.x;
        graphOffset.y = e.clientY - graphPanStart.y;
        renderGraph();
      }
    });

    graphCanvas.addEventListener('mouseup', function() {
      graphDragNode = null;
      graphPanStart = null;
    });

    graphCanvas.addEventListener('wheel', function(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? 0.9 : 1.1;
      graphZoom = Math.max(0.3, Math.min(3, graphZoom * delta));
      renderGraph();
    });

    graphCanvas.addEventListener('click', function(e) {
      if (graphDragNode) return;
      var rect = graphCanvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left - graphOffset.x) / graphZoom;
      var my = (e.clientY - rect.top - graphOffset.y) / graphZoom;

      for (var i = 0; i < graphNodes.length; i++) {
        var dx = mx - graphNodes[i].x;
        var dy = my - graphNodes[i].y;
        if (Math.sqrt(dx * dx + dy * dy) < graphNodes[i].radius + 4) {
          selectNote(graphNodes[i].id);
          closeGraphView();
          return;
        }
      }
    });
  }

  // ========== SIDEBAR RESIZE ==========
  function setupSidebarResize() {
    var handle = document.getElementById('wiki-resize-handle');
    var sidebar = document.getElementById('wiki-sidebar');
    var isResizing = false;

    handle.addEventListener('mousedown', function(e) {
      isResizing = true;
      handle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!isResizing) return;
      var wrapperRect = document.getElementById('wiki-wrapper').getBoundingClientRect();
      var newWidth = e.clientX - wrapperRect.left;
      newWidth = Math.max(200, Math.min(450, newWidth));
      sidebar.style.width = newWidth + 'px';
      sidebar.style.minWidth = newWidth + 'px';
      settings.sidebarWidth = newWidth;
    });

    document.addEventListener('mouseup', function() {
      if (isResizing) {
        isResizing = false;
        handle.classList.remove('dragging');
        document.body.style.cursor = '';
        save();
      }
    });
  }

  // ========== INSTALL PROMPT ==========
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
            showToast(getTrans('install_app') + ' \u2713');
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

  // ========== NOTE ACTIONS ==========
  function setupNoteActions() {
    var deleteBtn = document.getElementById('btn-wiki-delete-note');
    var dupBtn = document.getElementById('btn-wiki-duplicate-note');
    var pinBtn = document.getElementById('btn-wiki-toggle-pin');

    if (deleteBtn) {
      deleteBtn.addEventListener('click', function() {
        var note = getActiveNote();
        if (!note) return;
        if (confirm(getTrans('wiki_confirm_delete_note'))) {
          deleteNote(note.id);
        }
      });
    }

    if (dupBtn) {
      dupBtn.addEventListener('click', function() {
        var note = getActiveNote();
        if (!note) return;
        flushSave();
        var id = createNote(note.title + ' (copy)', note.content);
        if (note.tags) {
          notes[id].tags = note.tags.slice();
        }
        notes[id].modified = new Date().toISOString();
        save();
        selectNote(id);
        renderNoteList();
        renderSidebarTags();
        showToast('Note duplicated');
      });
    }

    if (pinBtn) {
      pinBtn.addEventListener('click', function() {
        var note = getActiveNote();
        if (!note) return;
        note.pinned = !note.pinned;
        note.modified = new Date().toISOString();
        scheduleSave();
        renderNoteList();
        showToast(note.pinned ? 'Note pinned' : 'Note unpinned');
      });
    }
  }

  // ========== SETTINGS TAB SWITCHING ==========
  function setupSettingsTabs() {
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-panel').forEach(function(p) { p.style.display = 'none'; });
        btn.classList.add('active');
        var panel = document.getElementById(btn.dataset.tab);
        if (panel) panel.style.display = 'flex';
      });
    });

    document.querySelectorAll('.settings-close, .settings-modal-overlay').forEach(function(el) {
      el.addEventListener('click', function() {
        document.querySelector('.settings-modal').classList.remove('visible');
      });
    });
  }

  // ========== EVENT LISTENERS ==========
  function setupEventListeners() {
    // New note button
    var btnNewNote = document.getElementById('btn-new-note');
    if (btnNewNote) {
      btnNewNote.addEventListener('click', function() {
        flushSave();
        var id = createNote('');
        selectNote(id);
        titleInput.focus();
        titleInput.select();
        renderNoteList();
        renderSidebarTags();
      });
    }

    // Search
    if (searchInput) {
      searchInput.addEventListener('input', renderNoteList);
    }

    // Title input
    if (titleInput) {
      titleInput.addEventListener('input', function() {
        var note = getActiveNote();
        if (!note) return;
        note.title = titleInput.value.trim() || getTrans('wiki_untitled');
        note.modified = new Date().toISOString();
        scheduleSave();
        renderNoteList();
      });
    }

    // Editor textarea
    if (editorTextarea) {
      editorTextarea.addEventListener('input', function() {
        var note = getActiveNote();
        if (!note) return;
        note.content = editorTextarea.value;
        note.modified = new Date().toISOString();
        scheduleSave();
        renderPreview();
        updateStatusBar();

        clearTimeout(editorTextarea._refreshTimer);
        editorTextarea._refreshTimer = setTimeout(function() {
          renderBacklinks();
          renderNoteList();
        }, 600);
      });

      editorTextarea.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
          e.preventDefault();
          var start = editorTextarea.selectionStart;
          var end = editorTextarea.selectionEnd;
          editorTextarea.value = editorTextarea.value.substring(0, start) + '  ' + editorTextarea.value.substring(end);
          editorTextarea.selectionStart = editorTextarea.selectionEnd = start + 2;
        }
      });
    }

    // View toggle buttons
    var viewBtns = document.querySelectorAll('.view-btn');
    for (var i = 0; i < viewBtns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          setViewMode(btn.dataset.view);
        });
      })(viewBtns[i]);
    }

    // Import/Export
    var btnImport = document.getElementById('btn-wiki-import');
    var fileInput = document.getElementById('wiki-file-input');
    if (btnImport && fileInput) {
      btnImport.addEventListener('click', function() { fileInput.click(); });
      fileInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
          // Multi-format import with staggered loading
          for (var i = 0; i < this.files.length; i++) {
            (function(f, delay) {
              setTimeout(function() { importFromFile(f); }, delay);
            })(this.files[i], i * 200);
          }
          this.value = '';
        }
      });
    }

    var btnExport = document.getElementById('btn-wiki-export');
    if (btnExport) {
      btnExport.addEventListener('click', exportXML);
    }

    // Graph view
    var btnGraphToggle = document.getElementById('btn-graph-toggle');
    if (btnGraphToggle) {
      btnGraphToggle.addEventListener('click', openGraphView);
    }

    var btnGraphClose = document.getElementById('btn-graph-close');
    if (btnGraphClose) {
      btnGraphClose.addEventListener('click', closeGraphView);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        flushSave();
        showToast(getTrans('text_saved'));
      }

      if (e.key === 'Escape') {
        if (graphOverlay.style.display !== 'none') {
          closeGraphView();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        flushSave();
        var id = createNote('');
        selectNote(id);
        titleInput.focus();
        titleInput.select();
        renderNoteList();
        renderSidebarTags();
      }

      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        var activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          e.preventDefault();
          openGraphView();
        }
      }
    });

    // Sidebar resize
    setupSidebarResize();

    // Graph interaction
    setupGraphInteraction();

    // Install prompt
    setupInstallPrompt();

    // Note actions
    setupNoteActions();

    // Settings tabs
    setupSettingsTabs();

    // Language change
    document.addEventListener('change', function(e) {
      if (e.target && e.target.id === 'language-select') {
        var lang = e.target.value;
        localStorage.setItem('oros-language', lang);
        translateUI();
        window.dispatchEvent(new CustomEvent('oros-language-changed', { detail: { lang: lang } }));
      }
    });

    window.addEventListener('oros-language-changed', function() {
      translateUI();
    });
  }

  // ========== INIT ==========
  function init() {
    load();

    if (settings.sidebarWidth) {
      var sidebar = document.getElementById('wiki-sidebar');
      if (sidebar) {
        sidebar.style.width = settings.sidebarWidth + 'px';
        sidebar.style.minWidth = settings.sidebarWidth + 'px';
      }
    }

    renderNoteList();
    renderSidebarTags();

    if (settings.activeNoteId && notes[settings.activeNoteId]) {
      selectNote(settings.activeNoteId);
    }

    setupEventListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 100);
    });
  } else {
    setTimeout(init, 100);
  }
})();