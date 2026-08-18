// ============================================
// orOS Sync Manager
// Orchestrates auto-export + auto-import
// ============================================

(function() {
  'use strict';

  var LAST_FILE_KEY = 'oros_last_file';
  var LAST_SYNC_KEY = 'oros_last_sync_time';
  var SYNC_INTERVAL = 30000; // 30 seconds

  var syncButton = null;
  var syncInterval = null;

  function init() {
    setupSyncButton();
    setupAutoOpen();
    startPolling();
  }

  // --- Sync Button in UI ---
  function setupSyncButton() {
    // Look for existing toolbar to inject sync button
    var waitForToolbar = setInterval(function() {
      var toolbar = document.querySelector('.kanban-toolbar, .wiki-status-bar');
      if (!toolbar) return;
      clearInterval(waitForToolbar);

      if (!window.OROS_SYNC.isSupported()) return;

      var btn = document.createElement('button');
      btn.className = 'mini-btn sync-btn';
      btn.id = 'btn-sync-folder';
      btn.title = 'Connect sync folder (Syncthing/Dropbox)';
      btn.innerHTML = '<i class="fa fa-refresh"></i> Sync';
      btn.style.marginLeft = '8px';

      btn.addEventListener('click', toggleSync);

      toolbar.appendChild(btn);
      syncButton = btn;
      updateSyncButtonState();
    }, 500);
  }

  function updateSyncButtonState() {
    if (!syncButton) return;
    if (window.OROS_SYNC.isConnected()) {
      syncButton.classList.add('connected');
      syncButton.title = 'Sync connected — click to sync now';
      syncButton.innerHTML = '<i class="fa fa-check-circle"></i> Sync';
    } else {
      syncButton.classList.remove('connected');
      syncButton.title = 'Connect sync folder (Syncthing/Dropbox)';
      syncButton.innerHTML = '<i class="fa fa-refresh"></i> Sync';
    }
  }

  async function toggleSync() {
    if (window.OROS_SYNC.isConnected()) {
      // Sync now
      await performSync();
    } else {
      // Connect
      var success = await window.OROS_SYNC.connect();
      if (success) {
        updateSyncButtonState();
        showToast('Sync folder connected');
        await performSync();
      }
    }
  }

  // --- Perform Sync ---
  async function performSync() {
    if (!window.OROS_SYNC.isConnected()) return;

    var page = detectPage();
    var filename = page + '-data.xml';
    var now = Date.now();
    var lastSync = parseInt(localStorage.getItem(LAST_SYNC_KEY) || '0');

    // 1. Try to load remote file (might be newer from another device)
    var remoteData = await window.OROS_SYNC.load(filename);

    if (remoteData) {
      var remoteTime = parseTimestampFromXML(remoteData);

      if (remoteTime > lastSync) {
        // Remote is newer — import it
        importXMLString(remoteData, page);
        localStorage.setItem(LAST_SYNC_KEY, remoteTime.toString());
        showToast('Synced from another device');
      }
    }

    // 2. Export local data to sync folder
    var localData = exportLocalData(page);
    if (localData) {
      var success = await window.OROS_SYNC.save(filename, localData);
      if (success) {
        localStorage.setItem(LAST_SYNC_KEY, now.toString());
        localStorage.setItem(LAST_FILE_KEY, filename);
      }
    }
  }

  // --- Auto-Open Last File ---
  function setupAutoOpen() {
    var lastFile = localStorage.getItem(LAST_FILE_KEY);
    if (!lastFile) return;

    // Small delay to let the app initialize
    setTimeout(async function() {
      if (!window.OROS_SYNC.isConnected()) return;

      var page = detectPage();
      var filename = lastFile;

      var remoteData = await window.OROS_SYNC.load(filename);
      if (remoteData) {
        var remoteTime = parseTimestampFromXML(remoteData);
        var localTime = getLocalDataTimestamp(page);

        if (remoteTime > localTime) {
          importXMLString(remoteData, page);
          showToast('Loaded latest data from sync folder');
        }
      }
    }, 1500);
  }

  // --- Polling ---
  function startPolling() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(async function() {
      if (window.OROS_SYNC.isConnected() && navigator.onLine) {
        await performSync();
      }
    }, SYNC_INTERVAL);
  }

  // --- Helpers ---
  function detectPage() {
    if (document.body.classList.contains('dashboard-page')) return null;
    if (window.location.pathname.includes('kanban')) return 'kanban';
    if (window.location.pathname.includes('wiki')) return 'wiki';
    return null;
  }

  function parseTimestampFromXML(xml) {
    try {
      var doc = new DOMParser().parseFromString(xml, 'text/xml');
      var ts = doc.querySelector('timestamp');
      return ts ? parseInt(ts.textContent) : 0;
    } catch(e) {
      return 0;
    }
  }

  function getLocalDataTimestamp(page) {
    if (page === 'kanban') {
      var data = localStorage.getItem('oros-kanban-data');
      if (!data) return 0;
      try {
        var parsed = JSON.parse(data);
        return parsed.lastModified || 0;
      } catch(e) { return 0; }
    }
    if (page === 'wiki') {
      var notes = localStorage.getItem('oros-wiki-notes');
      if (!notes) return 0;
      try {
        var parsed = JSON.parse(notes);
        var latest = 0;
        Object.values(parsed).forEach(function(note) {
          var mod = new Date(note.modified).getTime();
          if (mod > latest) latest = mod;
        });
        return latest;
      } catch(e) { return 0; }
    }
    return 0;
  }

  function exportLocalData(page) {
    if (page === 'kanban' && typeof exportKanbanXML === 'function') {
      return exportKanbanXML();
    }
    if (page === 'wiki' && typeof exportWikiXML === 'function') {
      return exportWikiXML();
    }
    return null;
  }

  function importXMLString(xml, page) {
    if (page === 'kanban' && typeof importKanbanXMLString === 'function') {
      importKanbanXMLString(xml);
    } else if (page === 'wiki' && typeof importWikiXMLString === 'function') {
      importWikiXMLString(xml);
    } else {
      // Fallback: trigger the existing file input with a Blob
      var blob = new Blob([xml], { type: 'text/xml' });
      var file = new File([blob], page + '-data.xml', { type: 'text/xml' });
      var fileInput = document.getElementById('file-input') ||
                      document.getElementById('wiki-file-input');
      if (fileInput) {
        var dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change'));
      }
    }
  }

  function showToast(msg) {
    var toast = document.createElement('div');
    toast.className = 'oros-toast sync-toast';
    toast.textContent = msg;
    toast.style.cssText =
      'position:fixed;bottom:24px;right:24px;' +
      'background:#c8a96e;color:#161618;' +
      'padding:10px 20px;border-radius:8px;' +
      'font-size:13px;font-weight:700;' +
      'opacity:0;transform:translateY(10px);' +
      'transition:all 0.3s ease;z-index:9999;';
    document.body.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(function() { document.body.removeChild(toast); }, 300);
    }, 2500);
  }

  // --- Go ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();