// translator.js
(function() {
  'use strict';

  var sourceLang = 'en';
  var targetLang = 'el';
  var sourceData = {};
  var targetData = {};
  var workingCopy = {};
  var filterQuery = '';
  var showMissingOnly = false;

  // ========== DOM ==========
  var sourceSelect = document.getElementById('source-lang');
  var targetSelect = document.getElementById('target-lang');
  var tbody = document.getElementById('translation-rows');
  var searchInput = document.getElementById('search-filter');
  var missingOnlyCheckbox = document.getElementById('show-missing-only');
  var importInput = document.getElementById('import-file');

  // ========== LOAD ==========
  function fetchJSON(path, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', path, true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try { callback(JSON.parse(xhr.responseText)); }
        catch(e) { callback({}); }
      } else { callback({}); }
    };
    xhr.onerror = function() { callback({}); };
    xhr.send();
  }

  function loadLanguages() {
    sourceLang = sourceSelect.value;
    targetLang = targetSelect.value;

    var basePath = '../assets/translations/';
    var loaded = 0;

    fetchJSON(basePath + sourceLang + '.json', function(data) {
      sourceData = data;
      loaded++;
      if (loaded === 2) initWorkingCopy();
    });

    fetchJSON(basePath + targetLang + '.json', function(data) {
      targetData = data;
      loaded++;
      if (loaded === 2) initWorkingCopy();
    });
  }

  function initWorkingCopy() {
    // Deep copy target data; fill missing keys with empty strings
    workingCopy = {};
    var keys = Object.keys(sourceData);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      workingCopy[k] = targetData[k] !== undefined ? targetData[k] : '';
    }
    renderTable();
    updateStats();
  }

  // ========== RENDER ==========
  function renderTable() {
    tbody.innerHTML = '';
    var keys = Object.keys(sourceData);
    var visibleCount = 0;

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var sourceVal = sourceData[key] || '';
      var targetVal = workingCopy[key] || '';
      var isMissing = !targetVal.trim();

      // Filter
      if (filterQuery) {
        var q = filterQuery.toLowerCase();
        if (key.toLowerCase().indexOf(q) === -1 &&
            sourceVal.toLowerCase().indexOf(q) === -1 &&
            targetVal.toLowerCase().indexOf(q) === -1) continue;
      }
      if (showMissingOnly && !isMissing) continue;

      var tr = document.createElement('tr');
      if (isMissing) tr.className = 'row-missing';

      // Key
      var tdKey = document.createElement('td');
      tdKey.className = 'col-key';
      tdKey.textContent = key;
      tdKey.title = key;
      tr.appendChild(tdKey);

      // Source
      var tdSrc = document.createElement('td');
      tdSrc.className = 'col-source';
      tdSrc.textContent = sourceVal;
      tr.appendChild(tdSrc);

      // Target (editable)
      var tdTgt = document.createElement('td');
      tdTgt.className = 'col-target';
      var textarea = document.createElement('textarea');
      textarea.value = targetVal;
      textarea.className = isMissing ? 'missing' : '';
      textarea.dataset.key = key;
      textarea.rows = 1;

      // Auto-grow
      (function(ta, val) {
        ta.style.height = 'auto';
        ta.style.height = Math.max(28, ta.scrollHeight) + 'px';
      })(textarea, targetVal);

      textarea.addEventListener('input', function() {
        var k = this.dataset.key;
        workingCopy[k] = this.value;
        var wasMissing = this.classList.contains('missing');
        var nowMissing = !this.value.trim();
        if (wasMissing && !nowMissing) {
          this.classList.remove('missing');
          this.closest('tr').classList.remove('row-missing');
        } else if (!wasMissing && nowMissing) {
          this.classList.add('missing');
          this.closest('tr').classList.add('row-missing');
        }
        this.style.height = 'auto';
        this.style.height = Math.max(28, this.scrollHeight) + 'px';
        updateStats();
      });

      tdTgt.appendChild(textarea);
      tr.appendChild(tdTgt);

      // Status
      var tdStatus = document.createElement('td');
      tdStatus.className = 'col-status';
      var dot = document.createElement('span');
      dot.className = 'status-dot ' + (isMissing ? 'missing' : 'complete');
      tdStatus.appendChild(dot);
      tr.appendChild(tdStatus);

      tbody.appendChild(tr);
      visibleCount++;
    }

    if (visibleCount === 0) {
      var emptyTr = document.createElement('tr');
      emptyTr.innerHTML = '<td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted,#888);">No matching keys</td>';
      tbody.appendChild(emptyTr);
    }
  }

  // ========== STATS ==========
  function updateStats() {
    var keys = Object.keys(sourceData);
    var total = keys.length;
    var translated = 0;
    for (var i = 0; i < keys.length; i++) {
      if (workingCopy[keys[i]] && workingCopy[keys[i]].trim()) translated++;
    }
    var missing = total - translated;
    var pct = total > 0 ? Math.round((translated / total) * 100) : 0;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-translated').textContent = translated;
    document.getElementById('stat-missing').textContent = missing;
    document.getElementById('stat-progress').textContent = pct + '%';
    document.getElementById('progress-fill').style.width = pct + '%';
  }

  // ========== EXPORT ==========
  function exportJSON() {
    // Sort keys alphabetically for consistency
    var sorted = {};
    var keys = Object.keys(workingCopy).sort();
    for (var i = 0; i < keys.length; i++) {
      sorted[keys[i]] = workingCopy[keys[i]];
    }

    var json = JSON.stringify(sorted, null, 2) + '\n';
    var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = targetLang + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ========== IMPORT ==========
  function importJSON(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        // Merge into working copy
        for (var key in data) {
          if (workingCopy.hasOwnProperty(key)) {
            workingCopy[key] = data[key];
          }
        }
        renderTable();
        updateStats();
      } catch(err) {
        alert('Invalid JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // ========== EVENTS ==========
  document.getElementById('btn-load').addEventListener('click', loadLanguages);
  document.getElementById('btn-export').addEventListener('click', exportJSON);
  document.getElementById('btn-import').addEventListener('click', function() {
    importInput.click();
  });
  importInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
      importJSON(this.files[0]);
      this.value = '';
    }
  });

  searchInput.addEventListener('input', function() {
    filterQuery = this.value;
    renderTable();
  });

  missingOnlyCheckbox.addEventListener('change', function() {
    showMissingOnly = this.checked;
    renderTable();
  });

  targetSelect.addEventListener('change', function() {
    // Ask before switching if there are unsaved changes
    loadLanguages();
  });

  // Auto-load on init
  loadLanguages();
})();