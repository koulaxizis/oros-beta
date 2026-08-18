// ============================================
// orOS Auto-Sync via File System Access API
// Works with Syncthing, Dropbox, rsync, etc.
// ============================================

(function() {
  'use strict';

  var SYNC_KEY = 'oros_sync_config';
  var dirHandle = null;

  // --- Public API ---
  window.OROS_SYNC = {
    isSupported: isSupported,
    isConnected: isConnected,
    connect: connect,
    disconnect: disconnect,
    save: saveToSync,
    load: loadFromSync,
    getInfo: getInfo
  };

  function isSupported() {
    return 'showDirectoryPicker' in window;
  }

  function isConnected() {
    return dirHandle !== null || getStoredConfig() !== null;
  }

  async function getStoredConfig() {
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem(SYNC_KEY)); } catch(e) {}
    if (!stored) return null;
    return stored;
  }

  function getInfo() {
    if (!dirHandle) return null;
    return {
      folderName: dirHandle.name,
      path: dirHandle.name
    };
  }

  // --- Connect: User picks sync folder ---
  async function connect() {
    if (!isSupported()) {
      alert('File System Access API not supported in this browser. Use Chrome or Edge.');
      return false;
    }

    try {
      dirHandle = await window.showDirectoryPicker({
        id: 'oros-sync',
        mode: 'readwrite',
        startIn: 'documents'
      });

      var config = { folderName: dirHandle.name };
      localStorage.setItem(SYNC_KEY, JSON.stringify(config));
      return true;
    } catch(e) {
      return false;
    }
  }

  // --- Reconnect on page load ---
  async function reconnect() {
    if (!isSupported()) return;

    try {
      dirHandle = await window.showDirectoryPicker({
        id: 'oros-sync',
        mode: 'readwrite',
        startIn: 'documents'
      });
    } catch(e) {
      // Silent fail — user hasn't granted permission yet this session
    }
  }

  // --- Save data to sync folder ---
  async function saveToSync(filename, xmlContent) {
    if (!dirHandle) return false;

    try {
      var fileHandle = await dirHandle.getFileHandle(filename, { create: true });
      var writable = await fileHandle.createWritable();
      await writable.write(xmlContent);
      await writable.close();
      return true;
    } catch(e) {
      console.warn('Sync save failed:', e);
      return false;
    }
  }

  // --- Load data from sync folder ---
  async function loadFromSync(filename) {
    if (!dirHandle) return null;

    try {
      var fileHandle = await dirHandle.getFileHandle(filename);
      var file = await fileHandle.getFile();
      var text = await file.text();
      return text;
    } catch(e) {
      return null;
    }
  }

  // --- Check if remote file is newer than local ---
  async function checkRemoteNewer(filename, localTimestamp) {
    if (!dirHandle) return false;

    try {
      var fileHandle = await dirHandle.getFileHandle(filename);
      var file = await fileHandle.getFile();
      return file.lastModified > localTimestamp;
    } catch(e) {
      return false;
    }
  }

  // --- Attempt silent reconnect on load ---
  if (isSupported() && localStorage.getItem(SYNC_KEY)) {
    // Request permission silently
    navigator.permissions.query({ name: 'readwrite' }).then(async function(status) {
      if (status.state === 'granted') {
        await reconnect();
      }
    }).catch(function() {
      // Permission API not supported — skip silent reconnect
    });
  }

})();