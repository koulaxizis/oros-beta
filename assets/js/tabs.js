// ============================================
// orOS Editor — Tabbed Documents Module
// Manages multiple documents via tab bar
// Loaded BEFORE editor.js (both deferred)
// ============================================

(function() {
  'use strict';

  var STORAGE_TABS = 'oros_writer_tabs';
  var STORAGE_ACTIVE = 'oros_writer_active_tab';
  var OLD_STORAGE_CONTENT = 'oros_writer_content';
  var OLD_STORAGE_METADATA = 'oros_writer_metadata';

  var tabBar = null;
  var listeners = { switch: [], create: [], close: [] };
  var tabs = [];
  var activeId = null;
  var initialized = false;

  // ===== STORAGE =====

  function persist() {
    try {
      localStorage.setItem(STORAGE_TABS, JSON.stringify(tabs));
      if (activeId) localStorage.setItem(STORAGE_ACTIVE, activeId);
    } catch(e) {
      console.warn('Tab persist failed:', e);
    }
  }

  function loadTabs() {
    try {
      var raw = localStorage.getItem(STORAGE_TABS);
      if (raw) {
        tabs = JSON.parse(raw);
        activeId = localStorage.getItem(STORAGE_ACTIVE);
        if (!activeId || !getActiveTab()) {
          activeId = tabs.length > 0 ? tabs[0].id : null;
        }
        if (tabs.length > 0) {
          persist();
          return;
        }
      }
    } catch(e) {
      console.warn('Tab load failed, starting fresh:', e);
      tabs = [];
    }

    // Migration from old single-document model
    var oldContent = localStorage.getItem(OLD_STORAGE_CONTENT);
    var oldMetadata = {};
    try {
      var rawMeta = localStorage.getItem(OLD_STORAGE_METADATA);
      if (rawMeta) oldMetadata = JSON.parse(rawMeta);
    } catch(e) {}

    var tab = createTabObject(oldContent ? deriveTitle(oldContent) : null, oldContent || '', oldMetadata);
    tabs.push(tab);
    activeId = tab.id;
    persist();
  }

  // ===== TAB OBJECTS =====

  function createTabObject(title, content, metadata) {
    return {
      id: 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      title: title || 'Untitled',
      content: content || '',
      metadata: metadata || {}
    };
  }

  function deriveTitle(html) {
    if (!html) return 'Untitled';
    var temp = document.createElement('div');
    temp.innerHTML = html;
    var h1 = temp.querySelector('h1');
    if (h1 && h1.textContent.trim()) return h1.textContent.trim().substring(0, 40);
    var h2 = temp.querySelector('h2');
    if (h2 && h2.textContent.trim()) return h2.textContent.trim().substring(0, 40);
    var p = temp.querySelector('p');
    if (p && p.textContent.trim()) return p.textContent.trim().substring(0, 40);
    var text = temp.textContent.trim();
    if (text) return text.substring(0, 40);
    return 'Untitled';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== GETTERS =====

  function getTabs() { return tabs; }

  function getActiveId() { return activeId; }

  function getActiveTab() {
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === activeId) return tabs[i];
    }
    return null;
  }

  function getActiveContent() {
    var tab = getActiveTab();
    return tab ? tab.content : '';
  }

  function getActiveMetadata() {
    var tab = getActiveTab();
    return tab ? (tab.metadata || {}) : {};
  }

  // ===== SETTERS =====

  function saveActiveContent(html) {
    var tab = getActiveTab();
    if (!tab) return;
    tab.content = html;
    var newTitle = deriveTitle(html);
    if (newTitle !== tab.title) {
      tab.title = newTitle;
      persist();
      renderTabs();
    } else {
      persist();
    }
  }

  function saveActiveMetadata(meta) {
    var tab = getActiveTab();
    if (!tab) return;
    tab.metadata = meta || {};
    persist();
  }

  // ===== TAB OPERATIONS =====

  function createTab(opts) {
    opts = opts || {};
    var tab = createTabObject(
      opts.title || null,
      opts.content || '',
      opts.metadata || {}
    );
    tabs.push(tab);
    activeId = tab.id;
    persist();
    renderTabs();
    fireEvent('create', tab);
    fireEvent('switch', tab);
    return tab;
  }

  function closeTab(id) {
    var idx = -1;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;

    var tab = tabs[idx];

    if (tabs.length <= 1) {
      // Last tab — clear it instead of removing
      tab.content = '';
      tab.title = 'Untitled';
      tab.metadata = {};
      persist();
      renderTabs();
      fireEvent('switch', tab);
      return;
    }

    tabs.splice(idx, 1);

    if (activeId === id) {
      var newIdx = Math.min(idx, tabs.length - 1);
      activeId = tabs[newIdx].id;
    }

    persist();
    renderTabs();
    fireEvent('close', tab);
    fireEvent('switch', getActiveTab());
  }

  function switchTab(id) {
    if (id === activeId) return;
    var exists = false;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].id === id) { exists = true; break; }
    }
    if (!exists) return;
    activeId = id;
    localStorage.setItem(STORAGE_ACTIVE, activeId);
    renderTabs();
    fireEvent('switch', getActiveTab());
  }

  // ===== EVENTS =====

  function fireEvent(event, data) {
    var callbacks = listeners[event] || [];
    for (var i = 0; i < callbacks.length; i++) {
      try { callbacks[i](data); } catch(e) { console.warn('Tab event error:', e); }
    }
  }

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  }

  // ===== RENDERING =====

  function renderTabs() {
    if (!tabBar) return;

    var html = '';
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      var isActive = t.id === activeId;
      html += '<div class="doc-tab' + (isActive ? ' active' : '') + '" data-tab-id="' + t.id + '">' +
        '<span class="tab-title">' + escapeHtml(t.title) + '</span>' +
        '<button class="tab-close" data-close-id="' + t.id + '" title="' +
        (document.documentElement.lang === 'el' ? 'Κλείσιμο' : 'Close') + '">' +
        '<i class="fa fa-times"></i></button>' +
        '</div>';
    }
    html += '<button class="tab-new" id="btn-new-tab" title="' +
      (document.documentElement.lang === 'el' ? 'Νέο Tab' : 'New Tab') + '">' +
      '<i class="fa fa-plus"></i></button>';

    tabBar.innerHTML = html;

    // Attach click handlers to tabs
    var tabEls = tabBar.querySelectorAll('.doc-tab');
    for (var j = 0; j < tabEls.length; j++) {
      (function(el) {
        el.addEventListener('click', function(e) {
          if (e.target.closest('.tab-close')) return;
          switchTab(el.getAttribute('data-tab-id'));
        });
      })(tabEls[j]);
    }

    // Close buttons
    var closeBtns = tabBar.querySelectorAll('.tab-close');
    for (var k = 0; k < closeBtns.length; k++) {
      (function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          closeTab(btn.getAttribute('data-close-id'));
        });
      })(closeBtns[k]);
    }

    // New tab button
    var newBtn = document.getElementById('btn-new-tab');
    if (newBtn) {
      newBtn.addEventListener('click', function() {
        createTab({ content: '', metadata: {} });
      });
    }
  }

  // ===== INIT =====

  function init(containerSelector) {
    if (initialized) return;
    tabBar = document.querySelector(containerSelector);
    if (!tabBar) return;
    initialized = true;
    loadTabs();
    renderTabs();
  }

  // ===== AUTO-INIT (defer ensures DOM is parsed) =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      init('#tab-bar');
    });
  } else {
    init('#tab-bar');
  }

  // ===== PUBLIC API =====
  window.OROS_TABS = {
    init: init,
    getTabs: getTabs,
    getActiveId: getActiveId,
    getActiveTab: getActiveTab,
    getActiveContent: getActiveContent,
    saveActiveContent: saveActiveContent,
    getActiveMetadata: getActiveMetadata,
    saveActiveMetadata: saveActiveMetadata,
    createTab: createTab,
    closeTab: closeTab,
    switchTab: switchTab,
    on: on,
    deriveTitle: deriveTitle
  };

})();