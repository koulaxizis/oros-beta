// ============================================
// orOS Case Converter — Full Implementation
// All 27 Features — Offline, Privacy-First
// ============================================

(function() {
  'use strict';

  // Storage keys
  var STORAGE_INPUT = 'oros_converter_input';
  var STORAGE_OUTPUT = 'oros_converter_output';
  var STORAGE_OPTIONS = 'oros_converter_options';
  var HISTORY_KEY = 'oros_converter_history';
  var HISTORY_INDEX_KEY = 'oros_converter_history_index';

  // DOM elements
  var inputArea = document.getElementById('input-area');
  var outputArea = document.getElementById('output-area');
  var converterToolbar = document.getElementById('converter-toolbar');
  var statsPanel = document.getElementById('stats-panel');

  // History for undo/redo
  var history = [];
  var historyIndex = -1;

  // Options state
  var options = {
    sentencePreserve: false,
    wordPreserve: false,
    acronyms: false,
    roman: false,
    trim: false,
    collapse: false,
    removelinebreaks: false,
    removechars: false
  };

  // Greek letters map for proper case conversion
  var greekLowerToUpper = {
    'α': 'Α', 'β': 'Β', 'γ': 'Γ', 'δ': 'Δ', 'ε': 'Ε', 'ζ': 'Ζ', 'η': 'Η', 'θ': 'Θ',
    'ι': 'Ι', 'κ': 'Κ', 'λ': 'Λ', 'μ': 'Μ', 'ν': 'Ν', 'ξ': 'Ξ', 'ο': 'Ο', 'π': 'Π',
    'ρ': 'Ρ', 'σ': 'Σ', 'τ': 'Τ', 'υ': 'Υ', 'φ': 'Φ', 'χ': 'Χ', 'ψ': 'Ψ', 'ω': 'Ω',
    'α': 'Ά', 'έ': 'Έ', 'ή': 'Ή', 'ί': 'Ί', 'ό': 'Ό', 'ύ': 'Ύ', 'ώ': 'Ώ'
  };

  var greekToned = { 'ά': 'Ά', 'έ': 'Έ', 'ή': 'Ή', 'ί': 'Ί', 'ύ': 'Ϋ', 'ό': 'Ό', 'ώ': 'Ώ' };

  // Roman numeral patterns
  var romanNumerals = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];

  // ========== HELPER FUNCTIONS ==========

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

  function saveState() {
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    history.push({ input: inputArea.value, output: outputArea.value });
    if (history.length > 50) history.shift();
    else historyIndex++;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(HISTORY_INDEX_KEY, historyIndex.toString());
    localStorage.setItem(STORAGE_INPUT, inputArea.value);
    localStorage.setItem(STORAGE_OUTPUT, outputArea.value);
    updateStats();
  }

  function loadHistory() {
    try {
      var saved = localStorage.getItem(HISTORY_KEY);
      var idx = localStorage.getItem(HISTORY_INDEX_KEY);
      if (saved) {
        history = JSON.parse(saved);
        historyIndex = idx ? parseInt(idx) : history.length - 1;
      }
    } catch(e) { history = []; historyIndex = -1; }
  }

  function canUndo() { return historyIndex >= 0; }
  function canRedo() { return historyIndex < history.length - 1; }

  function undo() {
    if (!canUndo()) return;
    var state = history[historyIndex--];
    inputArea.value = state.input;
    outputArea.value = state.output;
    updateStats();
  }

  function redo() {
    if (!canRedo()) return;
    var state = history[++historyIndex];
    inputArea.value = state.input;
    outputArea.value = state.output;
    updateStats();
  }

  // ========== OPTIONS LOADING ==========

  function loadOptions() {
    try {
      var saved = localStorage.getItem(STORAGE_OPTIONS);
      if (saved) options = JSON.parse(saved);
    } catch(e) {}
    
    document.getElementById('opt-sentence-preserve').checked = options.sentencePreserve;
    document.getElementById('opt-word-preserve').checked = options.wordPreserve;
    document.getElementById('opt-acronyms').checked = options.acronyms;
    document.getElementById('opt-roman').checked = options.roman;
    document.getElementById('opt-trim').checked = options.trim;
    document.getElementById('opt-collapse').checked = options.collapse;
    document.getElementById('opt-removelinebreaks').checked = options.removelinebreaks;
    document.getElementById('opt-removechars').checked = options.removechars;
  }

  function saveOptions() {
    localStorage.setItem(STORAGE_OPTIONS, JSON.stringify(options));
  }

  function setupOptionListeners() {
    var opts = ['sentence-preserve', 'word-preserve', 'acronyms', 'roman', 'trim', 'collapse', 'removelinebreaks', 'removechars'];
    opts.forEach(function(id) {
      var el = document.getElementById('opt-' + id);
      if (el) {
        el.addEventListener('change', function() {
          options[id] = this.checked;
          saveOptions();
          if (inputArea.value) processConversion(getCurrentMode());
        });
      }
    });
  }

  // ========== TEXT PROCESSING PRE-FILTERS ==========

  function preProcess(text) {
    if (!text) return '';
    var processed = text;

    if (options.trim) {
      processed = processed.split('\n').map(function(line) { return line.trim(); }).join('\n');
    }

    if (options.collapse) {
      processed = processed.replace(/[ \t]+/g, ' ');
    }

    if (options.removelinebreaks) {
      processed = processed.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
    }

    if (options.removechars) {
      processed = processed.replace(/[^a-zA-Z0-9\u0370-\u03FF\s]/g, '');
    }

    return processed;
  }

  // ========== CASE CONVERSION FUNCTIONS ==========

  function isGreekLetter(char) {
    return /[\u0370-\u03FF]/.test(char);
  }

  function toGreekUpper(char) {
    if (greekToned[char]) return greekToned[char];
    return char.toUpperCase();
  }

  function isRomanNumeral(str) {
    var trimmed = str.trim();
    if (!trimmed) return false;
    return /^[MDCLXVI]+$/.test(trimmed) && trimmed.length <= 4;
  }

  function isAcronym(word) {
    if (word.length < 2) return false;
    var hasGreek = /[α-ωΑ-Ω]/i.test(word);
    if (hasGreek) return /^[α-ωΑ-Ω]+$/.test(word);
    return /^[A-Z0-9]+$/.test(word);
  }

  function uppercase(text) {
    var processed = preProcess(text);
    if (options.acronyms) {
      return processed.split(/\b/).map(function(part) {
        if (isAcronym(part)) return part;
        if (isGreekLetter(part[0])) {
          return part.split('').map(function(c) {
            return isGreekLetter(c) ? toGreekUpper(c) : c.toUpperCase();
          }).join('');
        }
        return part.toUpperCase();
      }).join('');
    }
    return processed.split('').map(function(c) {
      return isGreekLetter(c) ? toGreekUpper(c) : c.toUpperCase();
    }).join('');
  }

  function lowercase(text) {
    var processed = preProcess(text);
    if (options.sentencePreserve) {
      return processed.replace(/(^|[.!?…\s])([a-zA-Z\u0370-\u03FF])/g, function(m, sep, c) {
        return sep + c;
      });
    }
    if (options.wordPreserve) {
      return processed.replace(/\b([a-zA-Z\u0370-\u03FF])/g, function(m, c) {
        return c;
      });
    }
    return processed.toLowerCase();
  }

  function titleCase(text) {
    var processed = preProcess(text);
    var words = processed.split(/(\s+)/);
    return words.map(function(word) {
      if (/^\s+$/.test(word)) return word;
      if (options.acronyms && isAcronym(word)) return word;
      if (options.roman && isRomanNumeral(word)) return word;
      if (!word) return word;
      var first = word.charAt(0);
      var rest = word.slice(1);
      return (isGreekLetter(first) ? toGreekUpper(first) : first.toUpperCase()) + rest.toLowerCase();
    }).join('');
  }

  function sentenceCase(text) {
    var processed = preProcess(text);
    return processed.replace(/([.!?…]?\s*)([a-zA-Z\u0370-\u03FF])/g, function(m, sep, c) {
      return sep + (isGreekLetter(c) ? toGreekUpper(c) : c.toUpperCase());
    }).replace(/^([a-zA-Z\u0370-\u03FF])/g, function(m, c) {
      return isGreekLetter(c) ? toGreekUpper(c) : c.toUpperCase();
    });
  }

  function toggleCase(text) {
    var processed = preProcess(text);
    return processed.split('').map(function(c) {
      if (c === c.toUpperCase() && c !== c.toLowerCase()) {
        return c.toLowerCase();
      } else if (isGreekLetter(c) && c === c.toLowerCase()) {
        return toGreekUpper(c);
      } else {
        return c.toUpperCase();
      }
    }).join('');
  }

  // ========== PROGRAMMER CASE FUNCTIONS ==========

  function splitWords(text) {
    return text
      .replace(/[-_\s]+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function camelCase(text) {
    var processed = preProcess(text);
    var words = splitWords(processed);
    if (words.length === 0) return '';
    return words.reduce(function(acc, word, i) {
      var lower = word.toLowerCase();
      var first = lower.charAt(0);
      var rest = lower.slice(1);
      if (i === 0) {
        return acc + first.toLowerCase() + rest;
      } else {
        return acc + (isGreekLetter(first) ? toGreekUpper(first) : first.toUpperCase()) + rest;
      }
    }, '');
  }

  function pascalCase(text) {
    var processed = preProcess(text);
    var words = splitWords(processed);
    return words.map(function(word) {
      var lower = word.toLowerCase();
      var first = lower.charAt(0);
      var rest = lower.slice(1);
      return (isGreekLetter(first) ? toGreekUpper(first) : first.toUpperCase()) + rest;
    }).join('');
  }

  function snakeCase(text) {
    var processed = preProcess(text);
    var words = splitWords(processed);
    return words.join('_').toLowerCase();
  }

  function kebabCase(text) {
    var processed = preProcess(text);
    var words = splitWords(processed);
    return words.join('-').toLowerCase();
  }

  function constantCase(text) {
    var processed = preProcess(text);
    var words = splitWords(processed);
    return words.join('_').split('').map(function(c) {
      return isGreekLetter(c) ? toGreekUpper(c) : c.toUpperCase();
    }).join('');
  }

  // ========== MAIN CONVERSION ==========

  var currentMode = 'uppercase';

  function getCurrentMode() {
    return currentMode;
  }

  function processConversion(mode) {
    var text = inputArea.value;
    var result = '';

    switch(mode) {
      case 'uppercase': result = uppercase(text); break;
      case 'lowercase': result = lowercase(text); break;
      case 'title': result = titleCase(text); break;
      case 'sentence': result = sentenceCase(text); break;
      case 'toggle': result = toggleCase(text); break;
      case 'camel': result = camelCase(text); break;
      case 'pascal': result = pascalCase(text); break;
      case 'snake': result = snakeCase(text); break;
      case 'kebab': result = kebabCase(text); break;
      case 'constant': result = constantCase(text); break;
      default: result = text;
    }

    outputArea.value = result;
    saveState();
  }

  function setCurrentMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    if (inputArea.value) processConversion(mode);
  }

  function setupModeButtons() {
    document.querySelectorAll('.mode-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        setCurrentMode(this.dataset.mode);
      });
    });
    setCurrentMode('uppercase');
  }

  // ========== STATISTICS ==========

  function updateStats() {
    var text = outputArea.value;
    var chars = text.length;
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    var lines = text.split('\n').length;
    var sentences = text.split(/[.!?…]+/).filter(function(s) { return s.trim(); }).length;

    document.getElementById('stat-chars').textContent = chars.toLocaleString();
    document.getElementById('stat-words').textContent = words.toLocaleString();
    document.getElementById('stat-lines').textContent = lines.toLocaleString();
    document.getElementById('stat-sentences').textContent = sentences.toLocaleString();
  }

  function toggleStats() {
    statsPanel.style.display = statsPanel.style.display === 'none' ? 'flex' : 'none';
  }

  // ========== FILE OPERATIONS ==========

  function openFile(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      inputArea.value = e.target.result;
      processConversion(currentMode);
      showToast(getTrans('toast_opened'));
      saveState();
    };
    reader.readAsText(file);
  }

  function saveFile() {
    var text = outputArea.value;
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'converted_' + new Date().toISOString().slice(0,19).replace(/[:.]/g,'-') + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(getTrans('toast_downloaded'));
  }

  function copyToClipboard() {
    outputArea.select();
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    showToast(getTrans('toast_copied'));
  }

  function clearAll() {
    var lang = getCurrentLang();
    var msg = lang === 'el' ? 'Σίγουρα; Όλο το περιεχόμενο θα χαθεί.' : 'Are you sure? All content will be lost.';
    if (confirm(msg)) {
      inputArea.value = '';
      outputArea.value = '';
      history = [];
      historyIndex = -1;
      localStorage.removeItem(HISTORY_KEY);
      localStorage.removeItem(HISTORY_INDEX_KEY);
      localStorage.removeItem(STORAGE_INPUT);
      localStorage.removeItem(STORAGE_OUTPUT);
      updateStats();
      showToast(getTrans('toast_cleared'));
    }
  }

  function resetOriginal() {
    if (history.length > 0) {
      var original = history[0];
      inputArea.value = original.input;
      outputArea.value = original.output;
      processConversion(currentMode);
      showToast(getTrans('toast_reset'));
    }
  }

  // ========== KEYBOARD SHORTCUTS ==========

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveFile();
      } else if (e.ctrlKey && e.key === 'c' && document.activeElement === outputArea) {
        e.preventDefault();
        copyToClipboard();
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.ctrlKey && e.key === 'Delete') {
        e.preventDefault();
        clearAll();
      } else if (e.ctrlKey && e.shiftKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        setCurrentMode('uppercase');
      } else if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        setCurrentMode('lowercase');
      } else if (e.ctrlKey && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();
        setCurrentMode('title');
      }
    });
  }

  // ========== DROPDOWN HANDLING ==========

  function setupDropdown() {
    var btnOptions = document.getElementById('btn-options');
    var dropdown = document.getElementById('options-dropdown');
    var container = document.getElementById('options-dropdown-container');

    if (btnOptions && dropdown) {
      btnOptions.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('visible');
      });

      document.addEventListener('click', function() {
        dropdown.classList.remove('visible');
      });
    }
  }

  // ========== INPUT HANDLING ==========

  function setupInputHandler() {
    if (inputArea) {
      inputArea.addEventListener('input', function() {
        processConversion(currentMode);
      });
    }
  }

  // ========== INITIALIZATION ==========

  function loadSavedContent() {
    var savedInput = localStorage.getItem(STORAGE_INPUT);
    var savedOutput = localStorage.getItem(STORAGE_OUTPUT);
    if (savedInput) inputArea.value = savedInput;
    if (savedOutput) outputArea.value = savedOutput;
    if (savedInput) processConversion(currentMode);
  }

  function init() {
    loadHistory();
    loadOptions();
    loadSavedContent();
    setupModeButtons();
    setupOptionListeners();
    setupDropdown();
    setupInputHandler();
    setupKeyboardShortcuts();
    updateStats();

    // File input handlers
    var btnOpen = document.getElementById('btn-open');
    var fileInput = document.getElementById('file-input');
    if (btnOpen && fileInput) {
      btnOpen.addEventListener('click', function() { fileInput.click(); });
      fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
          openFile(this.files[0]);
          this.value = '';
        }
      });
    }

    // Toolbar buttons
    var btnSave = document.getElementById('btn-save');
    var btnCopy = document.getElementById('btn-copy');
    var btnClear = document.getElementById('btn-clear');
    var btnUndo = document.getElementById('btn-undo');
    var btnRedo = document.getElementById('btn-redo');
    var btnReset = document.getElementById('btn-reset');
    var btnStats = document.getElementById('btn-stats');

    if (btnSave) btnSave.addEventListener('click', saveFile);
    if (btnCopy) btnCopy.addEventListener('click', copyToClipboard);
    if (btnClear) btnClear.addEventListener('click', clearAll);
    if (btnUndo) btnUndo.addEventListener('click', undo);
    if (btnRedo) btnRedo.addEventListener('click', redo);
    if (btnReset) btnReset.addEventListener('click', resetOriginal);
    if (btnStats) btnStats.addEventListener('click', toggleStats);
  }

  document.addEventListener('DOMContentLoaded', init);
})();