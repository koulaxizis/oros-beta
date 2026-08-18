// ============================================
// orOS Universal Translation Console
// Works with any project via URL parameters
// ============================================

(function() {
  'use strict';

  // --- Config from URL ---
  var params = new URLSearchParams(window.location.search);
  var ROOT = params.get('root') || '../assets/translations/';
  var SOURCE_LANG = params.get('source') || 'en';
  var TARGET_LANG = params.get('target') || '';
  var PROJECT_NAME = params.get('project') || '';

  var SUPPORTED_LANGS = {
    'en': 'English',
    'el': 'Ελληνικά',
    'es': 'Español',
    'it': 'Italiano',
    'fr': 'Français',
    'de': 'Deutsch'
  };

  // --- State ---
  var sourceData = {};
  var targetData = {};
  var modifiedKeys = {};
  var filteredKeys = [];
  var localStorageKey = '';

  // --- DOM ---
  var sourceSelect = document.getElementById('source-lang');
  var targetSelect = document.getElementById('target-lang');
  var btnLoad = document.getElementById('btn-load');
  var btnExport = document.getElementById('btn-export');
  var btnImport = document.getElementById('btn-import');
  var btnSaveLocal = document.getElementById('btn-save-local');
  var importFile = document.getElementById('import-file');
  var searchFilter = document.getElementById('search-filter');
  var showMissingOnly = document.getElementById('show-missing-only');
  var showModifiedOnly = document.getElementById('show-modified-only');
  var tbody = document.getElementById('translation-rows');
  var emptyState = document.getElementById('translator-empty');
  var tableWrapper = document.querySelector('.translator-table-wrapper');

  // --- Init ---
  function init() {
    // Populate language selects
    Object.keys(SUPPORTED_LANGS).forEach(function(code) {
      var opt1 = document.createElement('option');
      opt1.value = code;
      opt1.textContent = SUPPORTED_LANGS[code];
      sourceSelect.appendChild(opt1);

      if (code !== SOURCE_LANG) {
        var opt2 = document.createElement('option');
        opt2.value = code;
        opt2.textContent = SUPPORTED_LANGS[code];
        targetSelect.appendChild(opt2);
      }
    });

    sourceSelect.value = SOURCE_LANG;
    if (TARGET_LANG) targetSelect.value = TARGET_LANG;

    // Project name
    if (PROJECT_NAME) {
      document.getElementById('project-title').textContent = PROJECT_NAME + ' Translation Console';
    }

    // Update subtitle with root path
    document.getElementById('project-subtitle').textContent = ROOT;

    // Auto-load if target is specified
    if (TARGET_LANG) {
      loadTranslations();
    } else {
      emptyState.style.display = 'flex';
      tableWrapper.style.display = 'none';
    }

    bindEvents();
  }

  // --- Fetch JSON ---
  function fetchJSON(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try { callback(JSON.parse(xhr.responseText)); }
        catch(e) { callback({}); }
      } else {
        callback({});
      }
    };
    xhr.onerror = function() { callback({}); };
    xhr.send();
  }

  // --- Load ---
  function loadTranslations() {
    var srcLang = sourceSelect.value;
    var tgtLang = targetSelect.value;

    if (!tgtLang) {
      alert('Please select a target language.');
      return;
    }

    localStorageKey = 'translator_' + PROJECT_NAME + '_' + srcLang + '_to_' + tgtLang;

    var srcUrl = ROOT + srcLang + '.json';
    var tgtUrl = ROOT + tgtLang + '.json';

    // Try localStorage first for target
    var localSaved = null;
    try { localSaved = JSON.parse(localStorage.getItem(localStorageKey)); }
    catch(e) {}

    fetchJSON(srcUrl, function(src) {
      sourceData = src || {};
      if (localSaved) {
        targetData = localSaved;
        modifiedKeys = loadModifiedKeys();
        renderTable();
      } else {
        fetchJSON(tgtUrl, function(tgt) {
          targetData = tgt || {};
          modifiedKeys = {};
          renderTable();
        });
      }
    });
  }

  // --- Render Table ---
  function renderTable() {
    var allKeys = Object.keys(sourceData);
    filteredKeys = allKeys.slice();

    applyFilters();

    emptyState.style.display = 'none';
    tableWrapper.style.display = 'block';

    updateStats(allKeys);
  }

  function applyFilters() {
    var search = (searchFilter.value || '').toLowerCase();
    var missingOnly = showMissingOnly.checked;
    var modifiedOnly = showModifiedOnly.checked;

    filteredKeys = Object.keys(sourceData).filter(function(key) {
      var srcVal = sourceData[key] || '';
      var tgtVal = targetData[key] || '';

      if (missingOnly && tgtVal.trim()) return false;
      if (modifiedOnly && !modifiedKeys[key]) return false;

      if (search) {
        return key.toLowerCase().indexOf(search) !== -1 ||
               srcVal.toLowerCase().indexOf(search) !== -1 ||
               tgtVal.toLowerCase().indexOf(search) !== -1;
      }

      return true;
    });

    renderRows();
  }

  function renderRows() {
    tbody.innerHTML = '';

    if (filteredKeys.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted);">No matching keys</td></tr>';
      return;
    }

    filteredKeys.forEach(function(key) {
      var srcVal = sourceData[key] || '';
      var tgtVal = targetData[key] || '';
      var isModified = !!modifiedKeys[key];
      var isMissing = !tgtVal.trim();

      var tr = document.createElement('tr');
      if (isMissing) tr.className = 'row-missing';
      else if (isModified) tr.className = 'row-modified';

      // Key cell
      var tdKey = document.createElement('td');
      tdKey.className = 'col-key';
      tdKey.textContent = key;
      tdKey.title = key;
      tr.appendChild(tdKey);

      // Source cell
      var tdSrc = document.createElement('td');
      tdSrc.className = 'col-source';
      tdSrc.textContent = srcVal;
      tr.appendChild(tdSrc);

      // Target cell (editable)
      var tdTgt = document.createElement('td');
      tdTgt.className = 'col-target';

      var textarea = document.createElement('textarea');
      textarea.value = tgtVal;
      textarea.placeholder = 'Translate: "' + (srcVal.length > 40 ? srcVal.substring(0, 40) + '...' : srcVal) + '"';
      textarea.rows = Math.max(1, Math.ceil(srcVal.length / 50));

      textarea.addEventListener('input', function() {
        targetData[key] = this.value;
        modifiedKeys[key] = true;

        // Update row class
        if (this.value.trim()) {
          tr.classList.remove('row-missing');
          tr.classList.add('row-modified');
        } else {
          tr.classList.add('row-missing');
          tr.classList.remove('row-modified');
        }

        updateStats(Object.keys(sourceData));
      });

      tdTgt.appendChild(textarea);
      tr.appendChild(tdTgt);

      // Status cell
      var tdStatus = document.createElement('td');
      tdStatus.className = 'col-status';

      var badge = document.createElement('span');
      badge.className = 'status-badge';
      if (isMissing) {
        badge.classList.add('badge-missing');
        badge.textContent = 'Missing';
      } else if (isModified) {
        badge.classList.add('badge-modified');
        badge.textContent = 'Modified';
      } else {
        badge.classList.add('badge-done');
        badge.textContent = 'Done';
      }
      tdStatus.appendChild(badge);
      tr.appendChild(tdStatus);

      tbody.appendChild(tr);
    });
  }

  // --- Stats ---
  function updateStats(allKeys) {
    var total = allKeys.length;
    var translated = 0;

    allKeys.forEach(function(key) {
      if (targetData[key] && targetData[key].trim()) translated++;
    });

    var missing = total - translated;
    var progress = total > 0 ? Math.round((translated / total) * 100) : 0;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-translated').textContent = translated;
    document.getElementById('stat-missing').textContent = missing;
    document.getElementById('stat-progress').textContent = progress + '%';

    var fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = progress + '%';
  }

  // --- Export ---
  function exportJSON() {
    var tgtLang = targetSelect.value;
    if (!tgtLang) return;

    var sorted = {};
    Object.keys(sourceData).sort().forEach(function(key) {
      sorted[key] = targetData[key] || '';
    });

    var blob = new Blob([JSON.stringify(sorted, null, 2) + '\n'], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = tgtLang + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Import ---
  function importJSON(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        Object.keys(data).forEach(function(key) {
          targetData[key] = data[key];
          if (sourceData[key] !== undefined) {
            modifiedKeys[key] = true;
          }
        });
        renderTable();
      } catch(err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  }

  // --- Save Local ---
  function saveLocal() {
    if (!localStorageKey) return;
    localStorage.setItem(localStorageKey, JSON.stringify(targetData));
    saveModifiedKeys();
    showToast('Saved locally');
  }

  function saveModifiedKeys() {
    if (!localStorageKey) return;
    localStorage.setItem(localStorageKey + '_modified', JSON.stringify(modifiedKeys));
  }

  function loadModifiedKeys() {
    try {
      return JSON.parse(localStorage.getItem(localStorageKey + '_modified')) || {};
    } catch(e) {
      return {};
    }
  }

  // --- Toast ---
  function showToast(msg) {
    var toast = document.createElement('div');
    toast.className = 'translator-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.classList.add('show');
    }, 10);
    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() { document.body.removeChild(toast); }, 300);
    }, 2000);
  }

  // --- Events ---
  function bindEvents() {
    btnLoad.addEventListener('click', loadTranslations);
    btnExport.addEventListener('click', exportJSON);
    btnSaveLocal.addEventListener('click', saveLocal);

    btnImport.addEventListener('click', function() { importFile.click(); });
    importFile.addEventListener('change', function() {
      if (this.files && this.files[0]) importJSON(this.files[0]);
      this.value = '';
    });

    searchFilter.addEventListener('input', applyFilters);
    showMissingOnly.addEventListener('change', applyFilters);
    showModifiedOnly.addEventListener('change', applyFilters);

    targetSelect.addEventListener('change', function() {
      // Update URL
      var newParams = new URLSearchParams(window.location.search);
      newParams.set('target', this.value);
      window.history.replaceState({}, '', '?' + newParams.toString());
    });

    sourceSelect.addEventListener('change', function() {
      // Clear target data when source changes
      targetData = {};
      modifiedKeys = {};
      tbody.innerHTML = '';
    });
  }

  // --- Go ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();