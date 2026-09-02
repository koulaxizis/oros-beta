/* ============================================================
   oros-sync.js v1.1 — Shared Cloud Sync Module (orOS Ecosystem)
   Author: Christos Koulaxizis | orOS Ecosystem
   ============================================================
   CHANGELOG v1.1 (cleanup, no behavior/API change):
   - Removed duplicate definitions: loadBackup, collectShared,
     updateStatus, updateDirDisplay, _restoreSharedHandle
   - Removed broken first writeToFile + arguments.length hack
   - Removed duplicate `var lTime` in checkRemoteUpdate
   - Fixed: S.toast no longer nulled to undefined by default
   - Removed dead `registry` variable
   ============================================================
   Usage (inside each app, e.g. kanban.js):

     var sync = window.orosSync.create({
       id: 'kanban',
       prefixes: ['oros_kanban_'],
       ui: {
         status: 'cloud-sync-status',
         last: 'cloud-sync-last',
         dir: 'sync-dir-display',
         dirName: 'sync-dir-name',
         connect: 'btn-cloud-connect',
         disconnect: 'btn-cloud-disconnect'
       }
     });
     window.orosSync.register(sync);
     sync.init();

   Or register your OWN object (Writer does this):
     window.orosSync.register(cloudSync);

   Each app writes its own file: oros-<id>-sync.json
   Shared theme/language live in oros-shared-settings.json
   ============================================================ */

(function() {
  'use strict';

  var SHARED_DB_NAME = 'oros_sync_shared';
  var DIR_HANDLE_KEY = 'dir_handle';
  var SHARED_FILE = 'oros-shared-settings.json';
  var SHARED_KEYS = ['oros-theme', 'oros-language', 'oros-zen-mode'];

  var instances = {};
  var activeId = null;
  var sharedDirHandle = null;
  var sharedDB = null;

  function isFSA() { return typeof window.showDirectoryPicker === 'function'; }
    function tr(key, fallback) {
    var T = window.OROS_TRANSLATIONS;
    var lang = localStorage.getItem('oros-language') || 'en';
    var dict = (T && (T[lang] || T.en)) || null;
    var val = dict ? dict[key] : undefined;
    return (val === undefined || val === null) ? fallback : val;
  }

  // ---------- tiny IndexedDB helpers ----------
  function idbOpen(name) {
    return new Promise(function(resolve, reject) {
      if (!('indexedDB' in window)) { reject(new Error('No IndexedDB')); return; }
      var req = indexedDB.open(name, 1);
      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      };
      req.onsuccess = function(e) { resolve(e.target.result); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  function idbPut(db, key, value) {
    return new Promise(function(resolve, reject) {
      if (!db) { reject(new Error('IDB not ready')); return; }
      var tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function(e) { reject(e.target.error); };
    });
  }

  function idbGet(db, key) {
    return new Promise(function(resolve, reject) {
      if (!db) { reject(new Error('IDB not ready')); return; }
      var tx = db.transaction('kv', 'readonly');
      var req = tx.objectStore('kv').get(key);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  function idbDel(db, key) {
    return new Promise(function(resolve, reject) {
      if (!db) { reject(new Error('IDB not ready')); return; }
      var tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').delete(key);
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function(e) { reject(e.target.error); };
    });
  }

  function writableWrite(writable, data) {
    return writable.write(JSON.stringify(data, null, 2))
      .then(function() { return writable.close(); });
  }

  // ---------- Shared IndexedDB (directory handle) ----------
  function ensureSharedDB() {
    if (sharedDB) return Promise.resolve(sharedDB);
    return idbOpen(SHARED_DB_NAME).then(function(db) {
      sharedDB = db;
      return db;
    });
  }

  // ---------- Factory ----------
  function create(cfg) {
    if (!cfg || !cfg.id) throw new Error('orosSync.create: id required');

    var S = {
      id: cfg.id,
      APP_NAME: 'orOS ' + cfg.id.charAt(0).toUpperCase() + cfg.id.slice(1),
      PREFIXES: cfg.prefixes || ['oros_' + cfg.id + '_'],
      FILE_NAME: 'oros-' + cfg.id + '-sync.json',
      LAST_SYNC_KEY: 'backup_latest',
      LAST_SYNC_LOCAL: 'oros_' + cfg.id + '_last_sync',
      DB_NAME: 'oros_' + cfg.id + '_sync',
      AUTO_INTERVAL_MS: (cfg.intervalMinutes || 5) * 60000,
      STATUS_LABELS: {
        'idle': '● Not configured',
        'synced': '✓ Synced',
        'syncing': '⟳ Syncing…',
        'error': '⚠ Sync error',
        'unsupported': '● IndexedDB only'
      },
      db: null,
      dirHandle: null,
      autoTimer: null,
      ui: cfg.ui || {}
    };

    // Default toast — overridable at any time (Writer sets its own after create)
    S.toast = cfg.toast || function(msg) { console.log('[oros-sync]', msg); };

    // ----- Instance IDB -----
    S.initIDB = function() {
      return idbOpen(S.DB_NAME).then(function(db) { S.db = db; });
    };
    S.put = function(key, val) { return idbPut(S.db, key, val); };
    S.get = function(key) { return idbGet(S.db, key); };
    S.del = function(key) {
      return idbDel(S.db, key).catch(function() { return null; });
    };

    // ----- Collect / Apply -----
    S.collectDatabase = function() {
      var data = {
        _meta: { app: S.APP_NAME, exportedAt: new Date().toISOString(), type: 'app-database', keyCount: 0 },
        localStorage: {}
      };
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key) continue;
        for (var p = 0; p < S.PREFIXES.length; p++) {
          if (key.indexOf(S.PREFIXES[p]) === 0) { data.localStorage[key] = localStorage.getItem(key); break; }
        }
      }
      data._meta.keyCount = Object.keys(data.localStorage).length;
      return data;
    };

    S.collectShared = function() {
      var out = { _meta: { app: 'orOS', type: 'shared-settings', exportedAt: new Date().toISOString() }, settings: {} };
      for (var i = 0; i < SHARED_KEYS.length; i++) {
        var k = SHARED_KEYS[i];
        var v = localStorage.getItem(k);
        if (v !== null) out.settings[k] = v;
      }
      return out;
    };

    S.applyRestoredData = function(data) {
      if (!data || !data._meta || data._meta.type !== 'app-database') return false;
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k) continue;
        for (var p = 0; p < S.PREFIXES.length; p++) {
          if (k.indexOf(S.PREFIXES[p]) === 0) { toRemove.push(k); break; }
        }
      }
      for (var r = 0; r < toRemove.length; r++) localStorage.removeItem(toRemove[r]);
      Object.keys(data.localStorage).forEach(function(key) { localStorage.setItem(key, data.localStorage[key]); });
      return true;
    };

    // ----- File System Access (shared folder across apps) -----
    S.isSupported = isFSA;

    S.pickDirectory = function() {
      if (!isFSA()) { S.toast('File System Access API not available.'); return Promise.resolve(null); }
      return window.showDirectoryPicker({ mode: 'readwrite' }).then(function(handle) {
        sharedDirHandle = handle;
        S.dirHandle = handle;
        return ensureSharedDB().then(function(db) {
          return idbPut(db, DIR_HANDLE_KEY, handle);
        }).then(function() { return handle; });
      });
    };

    S._restoreSharedHandle = function() {
      if (sharedDirHandle) { S.dirHandle = sharedDirHandle; return Promise.resolve(sharedDirHandle); }
      return ensureSharedDB().then(function(db) {
        return idbGet(db, DIR_HANDLE_KEY).then(function(handle) {
          if (!handle) return null;
          var apply = function(h) { sharedDirHandle = h; S.dirHandle = h; return h; };
          if (!handle.queryPermission) return apply(handle);
          return handle.queryPermission({ mode: 'readwrite' }).then(function(perms) {
            if (perms === 'granted') return apply(handle);
            return handle.requestPermission({ mode: 'readwrite' }).then(function(rp) {
              return rp === 'granted' ? apply(handle) : null;
            }).catch(function() { return null; });
          });
        });
      }).catch(function() { return null; });
    };
	
	    // Re-request permission for the persisted directory handle.
    // Called from a user gesture (Connect button click) when the browser
    // dropped readwrite permission after a restart — avoids re-picking
    // the folder from scratch.
    S.reauthorizeDirHandle = function() {
      return S._restoreSharedHandle().then(function(handle) {
        if (handle) {
          S.updateStatus('synced', localStorage.getItem(S.LAST_SYNC_LOCAL));
          S.updateDirDisplay();
        }
        return handle;
      });
    };

    S.writeToFile = function(data, fileName) {
      if (!S.dirHandle) return Promise.reject(new Error('No directory handle'));
      var name = fileName || S.FILE_NAME;
      return S.dirHandle.getFileHandle(name, { create: true })
        .then(function(fh) { return fh.createWritable(); })
        .then(function(w) { return writableWrite(w, data); });
    };

    S.readFromFile = function(fileName) {
      if (!S.dirHandle) return Promise.reject(new Error('No directory handle'));
      return S.dirHandle.getFileHandle(fileName || S.FILE_NAME)
        .then(function(fh) { return fh.getFile(); })
        .then(function(file) { return file.text(); })
        .then(function(text) { return JSON.parse(text); });
    };

    // ----- Backup -----
        S.saveBackup = function() {
      // Guard: init() is async — re-enter once IDB is ready to avoid
      // spurious "IDB not ready" rejections from debounced pushes.
      if (!S.db) return S.initIDB().then(function() { return S.saveBackup(); });

      var data = S.collectDatabase();
      var jobs = [idbPut(S.db, S.LAST_SYNC_KEY, data)];
      var fileWritten = false;

      if (S.dirHandle) {
        jobs.push(
          S.writeToFile(data)
            .then(function() { fileWritten = true; })
            .catch(function(e) { console.warn('[oros-sync] file write failed:', e); })
        );
        // Shared settings (theme/language/zen) — harmless if written by multiple apps
        jobs.push(
          S.dirHandle.getFileHandle(SHARED_FILE, { create: true })
            .then(function(fh) { return fh.createWritable(); })
            .then(function(w) { return writableWrite(w, S.collectShared()); })
            .catch(function() {})
        );
      }

      return Promise.all(jobs).then(function() {
        // Only a SUCCESSFUL file write counts as a sync. IDB-only saves
        // must NOT update the "last sync" timestamp or show "✓ Synced".
        if (fileWritten) {
          var now = new Date().toISOString();
          localStorage.setItem(S.LAST_SYNC_LOCAL, now);
          S.updateStatus('synced', now);
        } else {
          S.updateStatus(isFSA() ? 'idle' : 'unsupported', null);
        }
        S.updateDirDisplay();
        return fileWritten;
      });
    };

    S.loadBackup = function() {
      return idbGet(S.db, S.LAST_SYNC_KEY).then(function(idbData) {
        if (!S.dirHandle) return idbData;
        return S.readFromFile().then(function(fileData) {
          var fTime = fileData && fileData._meta ? new Date(fileData._meta.exportedAt).getTime() : 0;
          var iTime = idbData && idbData._meta ? new Date(idbData._meta.exportedAt).getTime() : 0;
          return fTime >= iTime ? fileData : idbData;
        }).catch(function() { return idbData; });
      });
    };

    // ----- Auto-sync -----
    S.startAutoSync = function() {
      S.stopAutoSync();
      S.autoTimer = setInterval(function() {
        S.saveBackup().catch(function(e) { console.warn('[oros-sync] auto failed:', e); });
      }, S.AUTO_INTERVAL_MS);
    };
    S.stopAutoSync = function() {
      if (S.autoTimer) { clearInterval(S.autoTimer); S.autoTimer = null; }
    };

    // ----- UI hooks -----
    S.updateStatus = function(status, timestamp) {
      var el = S.ui.status ? document.getElementById(S.ui.status) : null;
      if (el) {
        el.className = 'sync-status sync-' + status;
        el.textContent = S.STATUS_LABELS[status] || status;
      }
      var lastEl = S.ui.last ? document.getElementById(S.ui.last) : null;
      if (lastEl) {
        var saved = timestamp || localStorage.getItem(S.LAST_SYNC_LOCAL);
        lastEl.textContent = saved ? new Date(saved).toLocaleString() : '';
      }
    };

    S.updateDirDisplay = function() {
      var display = S.ui.dir ? document.getElementById(S.ui.dir) : null;
      var nameEl = S.ui.dirName ? document.getElementById(S.ui.dirName) : null;
      var conn = S.ui.connect ? document.getElementById(S.ui.connect) : null;
      var disc = S.ui.disconnect ? document.getElementById(S.ui.disconnect) : null;
      if (S.dirHandle && display && nameEl) {
        nameEl.textContent = S.dirHandle.name || 'Unknown folder';
        display.style.display = '';
        if (conn) conn.style.display = 'none';
        if (disc) disc.style.display = '';
      } else {
        if (display) display.style.display = 'none';
        if (conn) conn.style.display = '';
        if (disc) disc.style.display = 'none';
      }
    };

    // ----- Actions -----
        S.syncNow = function() {
      // Guard: no folder configured → honest failure, NO success toast
      if (!S.dirHandle) {
        var st = isFSA() ? 'idle' : 'unsupported';
        S.updateStatus(st, null);
        S.toast(tr('sync_not_configured',
          'Sync is not configured — choose a folder first.'));
        return Promise.resolve(false);
      }
      S.updateStatus('syncing', null);
      return S.saveBackup().then(function(ok) {
        if (ok) {
          S.toast(tr('sync_complete', 'Sync complete'));
        } else {
          S.updateStatus('error', null);
          S.toast(tr('sync_failed', 'Sync failed:') + ' file write error');
        }
        return ok;
      }).catch(function(e) {
        S.updateStatus('error', null);
        S.toast(tr('sync_failed', 'Sync failed:') + ' ' + (e.message || e));
      });
    };

    S.disconnect = function() {
      S.dirHandle = null;
      if (sharedDirHandle && instances) {
        // Detach from every registered instance sharing this handle
        Object.keys(instances).forEach(function(id) {
          if (instances[id].dirHandle === sharedDirHandle) instances[id].dirHandle = null;
        });
      }
      sharedDirHandle = null;
      ensureSharedDB().then(function(db) { return idbDel(db, DIR_HANDLE_KEY); }).then(function() {
        S.updateStatus('idle', null);
        S.updateDirDisplay();
        S.toast('Sync disconnected.');
      }).catch(function(e) {
        console.warn('[oros-sync] disconnect failed:', e);
        S.updateStatus('idle', null);
        S.updateDirDisplay();
      });
    };

    S.restoreFromIDB = function() {
      idbGet(S.db, S.LAST_SYNC_KEY).then(function(data) {
        if (!data || !data._meta) { S.toast('No IndexedDB backup found'); return; }
        var d = new Date(data._meta.exportedAt).toLocaleString();
        if (!confirm('Restore from backup (' + d + ')?\n\nReplaces current app data.')) return;
        S.applyRestoredData(data);
        S.toast('Restored. Reloading…');
        setTimeout(function() { location.reload(); }, 800);
      });
    };

    S.restoreFromCloud = function() {
      if (!S.dirHandle) { S.toast('No sync folder connected'); return; }
      S.readFromFile().then(function(data) {
        if (!data || !data._meta) { S.toast('No sync file found'); return; }
        var d = new Date(data._meta.exportedAt).toLocaleString();
        if (!confirm('Restore from cloud file (' + d + ')?\n\nReplaces current app data.')) return;
        S.applyRestoredData(data);
        localStorage.setItem(S.LAST_SYNC_LOCAL, new Date().toISOString());
        S.toast('Restored. Reloading…');
        setTimeout(function() { location.reload(); }, 800);
      }).catch(function() { S.toast('Read error / no sync file'); });
    };

    S.checkRemoteUpdate = function() {
      if (!S.dirHandle) return;
      S.readFromFile().then(function(fileData) {
        if (!fileData || !fileData._meta) return;
        var fTime = new Date(fileData._meta.exportedAt).getTime();
        var saved = localStorage.getItem(S.LAST_SYNC_LOCAL);
        var lTime = saved ? new Date(saved).getTime() : 0;
        if (fTime > lTime) {
          var ds = new Date(fTime).toLocaleString();
          if (confirm('Newer sync file found (' + ds + ').\n\nRestore data from cloud?')) {
            S.applyRestoredData(fileData);
            localStorage.setItem(S.LAST_SYNC_LOCAL, new Date().toISOString());
            setTimeout(function() { location.reload(); }, 800);
          }
        }
      }).catch(function() {});
    };

    // ----- Init -----
    S.init = function() {
      if (!('indexedDB' in window)) { S.updateStatus('error', null); return Promise.resolve(); }
      return idbOpen(S.DB_NAME).then(function(db) {
        S.db = db;
        return S._restoreSharedHandle();
      }).then(function(handle) {
        if (handle) {
          S.updateStatus('synced', localStorage.getItem(S.LAST_SYNC_LOCAL));
          S.updateDirDisplay();
          S.checkRemoteUpdate();
        } else {
          S.updateStatus(isFSA() ? 'idle' : 'unsupported', null);
          S.updateDirDisplay();
        }
        S.startAutoSync();
      }).catch(function(e) {
        console.warn('[oros-sync] init failed:', e);
        S.updateStatus('error', null);
      });
    };

    return S;
  }

  // ---------- Registry ----------
  window.orosSync = {
    create: create,
    isSupported: isFSA,

    register: function(instance) {
      if (!instance || !instance.id) return instance;
      instances[instance.id] = instance;
      if (!activeId) activeId = instance.id;
      document.dispatchEvent(new CustomEvent('oros-sync-ready', { detail: { appId: instance.id } }));
      return instance;
    },

    use: function(id) { if (instances[id]) activeId = id; },

    get: function(id) {
      if (id) return instances[id] || null;
      return activeId ? instances[activeId] : null;
    },

    syncNow: function() {
      var inst = window.orosSync.get();
      if (inst && typeof inst.syncNow === 'function') inst.syncNow();
    }
  };
})();