// ============================================================================
// storyboard.js — ΔΙΟΡΘΩΜΕΝΗ (fetch path με baseHref + willReadFrequently)
// ============================================================================

(function() {
  'use strict';

  /* ===== STATE ===== */
  var currentTool = 'brush';
  var brushSize = 5;
  var brushColor = '#e8e6e3';
  var isDrawing = false;
  var lastX = 0;
  var lastY = 0;

  var frames = [];
  var currentFrameIndex = 0;

  var canvas, ctx;
  var canvasOverlay;

  var canvasRect;

  /* ===== I18N LOADER ===== */
  var translations = {};
  var currentLang = localStorage.getItem('oros-lang') ||
    (navigator.language || navigator.userLanguage || 'en').split('-')[0];
  if (['el','en','es','it','fr','de'].indexOf(currentLang) === -1) currentLang = 'en';

  function loadTranslations() {
    var baseUrl = window.OROS_CONFIG ? window.OROS_CONFIG.baseHref : '/';
    fetch(baseUrl + 'translations.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        translations = data;
        applyTranslations();
        updateAnnotationPlaceholder();
      })
      .catch(function(e) {
        console.warn('Failed to load translations:', e);
      });
  }

  function t(key) {
    var langData = translations[currentLang] || translations['en'] || {};
    if (typeof langData[key] !== 'string') return key;
    var val = langData[key];
    if (key === 'storyboard_frames_counter') {
      val = val.replace('{count}', frames.length);
    }
    return val || key;
  }

  function applyTranslations() {
    document.documentElement.lang = currentLang;
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-i18n');
      var val = t(key);
      if (val) els[i].textContent = val;
    }
  }

  function updateAnnotationPlaceholder() {
    var placeholderInput = document.getElementById('sb-annotation-input');
    if (placeholderInput) {
      placeholderInput.placeholder = t('storyboard_annotation_placeholder') || 'Add notes for this frame...';
    }
  }

  /* ===== INITIALIZATION ===== */

  function initCanvas() {
    canvas = document.getElementById('sb-canvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvasOverlay = document.getElementById('sb-canvas-overlay');
    canvasRect = canvas.getBoundingClientRect();

    ctx.fillStyle = '#1b1a18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    saveCurrentState();

    renderFramesStrip();
  }

  /* ===== DRAWING FUNCTIONS ===== */

  function getMousePos(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function startDrawing(e) {
    isDrawing = true;
    var pos = getMousePos(e);
    lastX = pos.x;
    lastY = pos.y;
    draw(e);
  }

  function stopDrawing() {
    if (isDrawing) {
      isDrawing = false;
      saveCurrentState();
    }
  }

  function draw(e) {
    if (!isDrawing) return;

    var pos = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    
    if (currentTool === 'eraser') {
      ctx.strokeStyle = '#1b1a18';
    } else {
      ctx.strokeStyle = brushColor;
    }
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastX = pos.x;
    lastY = pos.y;
  }

  /* ===== FRAME MANAGEMENT ===== */

  function saveCurrentState() {
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var annotation = '';
    var annInput = document.getElementById('sb-annotation-input');
    if (annInput) {
      annotation = annInput.value;
    }

    if (frames.length > currentFrameIndex) {
      frames[currentFrameIndex] = {
        imageData: imageData,
        annotation: annotation,
        thumbnail: null
      };
    }
  }

  function loadFrame(index) {
    if (index < 0 || index >= frames.length) return;

    saveCurrentState();

    currentFrameIndex = index;
    var frame = frames[index];

    if (frame && frame.imageData) {
      ctx.putImageData(frame.imageData, 0, 0);
    }

    var annInput = document.getElementById('sb-annotation-input');
    if (annInput && frame) {
      annInput.value = frame.annotation || '';
    }

    updateFrameSelection();
  }

  function addNewFrame() {
    saveCurrentState();

    var newFrame = {
      imageData: null,
      annotation: '',
      thumbnail: null
    };

    frames.push(newFrame);
    currentFrameIndex = frames.length - 1;

    clearCanvas();
    renderFramesStrip();
  }

  function deleteCurrentFrame() {
    if (frames.length <= 1) {
      showToast('storyboard_cannot_delete_last_frame', 'Cannot delete the last frame');
      return;
    }

    frames.splice(currentFrameIndex, 1);

    if (currentFrameIndex >= frames.length) {
      currentFrameIndex = frames.length - 1;
    }

    loadFrame(currentFrameIndex);
    renderFramesStrip();
  }

  function clearCanvas() {
    ctx.fillStyle = '#1b1a18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  /* ===== FRAMES STRIP ===== */

  function renderFramesStrip() {
    var container = document.getElementById('sb-frames-container');
    if (!container) return;

    container.innerHTML = '';

    frames.forEach(function(frame, idx) {
      var thumbWrapper = document.createElement('div');
      thumbWrapper.className = 'sb-thumb-wrapper' + (idx === currentFrameIndex ? ' active' : '');

      var thumbnail = document.createElement('canvas');
      thumbnail.className = 'sb-thumbnail';
      thumbnail.width = 160;
      thumbnail.height = 90;
      var tCtx = thumbnail.getContext('2d');

      tCtx.fillStyle = '#1b1a18';
      tCtx.fillRect(0, 0, thumbnail.width, thumbnail.height);

      if (frame.imageData) {
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d').putImageData(frame.imageData, 0, 0);
        
        tCtx.drawImage(tempCanvas, 0, 0, thumbnail.width, thumbnail.height);
      }

      var numBadge = document.createElement('span');
      numBadge.className = 'sb-frame-number';
      numBadge.textContent = idx + 1;
      thumbWrapper.appendChild(numBadge);

      thumbWrapper.appendChild(thumbnail);

      if (frame.annotation && frame.annotation.trim()) {
        var annIndicator = document.createElement('span');
        annIndicator.className = 'sb-has-annotation';
        annIndicator.innerHTML = '<i class="fa fa-comment"></i>';
        thumbWrapper.appendChild(annIndicator);
      }

      thumbWrapper.addEventListener('click', function() {
        loadFrame(idx);
      });

      container.appendChild(thumbWrapper);
    });

    updateFrameCount();
  }

  function updateFrameSelection() {
    var wrappers = document.querySelectorAll('.sb-thumb-wrapper');
    for (var i = 0; i < wrappers.length; i++) {
      if (i === currentFrameIndex) {
        wrappers[i].classList.add('active');
      } else {
        wrappers[i].classList.remove('active');
      }
    }
    updateFrameCount();
  }

  function updateFrameCount() {
    var title = document.querySelector('.sb-frames-strip .sb-frames-counter');
    if (title) {
      title.textContent = t('storyboard_frames_counter');
    }
  }

  /* ===== EXPORT FUNCTIONALITY ===== */

  function exportAsPNG() {
    var cols = 4;
    var rows = Math.ceil(frames.length / cols);
    var thumbW = 200;
    var thumbH = 112;
    var spacing = 10;

    var exportCanvas = document.createElement('canvas');
    exportCanvas.width = cols * thumbW + (cols + 1) * spacing;
    exportCanvas.height = rows * thumbH + (rows + 1) * spacing;

    var eCtx = exportCanvas.getContext('2d');
    eCtx.fillStyle = '#0f172a';
    eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    frames.forEach(function(frame, idx) {
      var col = idx % cols;
      var row = Math.floor(idx / cols);
      var x = spacing + col * (thumbW + spacing);
      var y = spacing + row * (thumbH + spacing);

      eCtx.fillStyle = '#1b1a18';
      eCtx.fillRect(x, y, thumbW, thumbH);

      if (frame.imageData) {
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d').putImageData(frame.imageData, 0, 0);
        eCtx.drawImage(tempCanvas, x, y, thumbW, thumbH);
      }

      eCtx.fillStyle = '#c8a96e';
      eCtx.font = 'bold 12px Nunito, sans-serif';
      eCtx.fillText((idx + 1).toString(), x + 8, y + 18);

      if (frame.annotation && frame.annotation.trim()) {
        var words = wrapText(eCtx, frame.annotation, thumbW - 16, 12);
        eCtx.fillStyle = '#e8e6e3';
        var textY = y + thumbH - 24;
        words.forEach(function(word, wIdx) {
          eCtx.fillText(word, x + 8, textY + wIdx * 14);
        });
      }
    });

    var link = document.createElement('a');
    link.download = 'orOS-storyboard-' + Date.now() + '.png';
    link.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('storyboard_export_success', 'Storyboard exported successfully!');
  }

  function wrapText(context, text, maxWidth, lineHeight) {
    var words = text.split(' ');
    var lines = [];
    var currentLine = '';

    words.forEach(function(word) {
      var testLine = currentLine ? currentLine + ' ' + word : word;
      var metrics = context.measureText(testLine);
      if (metrics.width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 2);
  }

  /* ===== TOAST NOTIFICATIONS ===== */

  function showToast(msgKey, defaultMessage) {
    var toast = document.createElement('div');
    toast.className = 'sb-toast';
    toast.textContent = t(msgKey) || defaultMessage || msgKey;
    document.body.appendChild(toast);

    setTimeout(function() {
      toast.classList.add('show');
    }, 10);

    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2500);
  }

  /* ===== LOCAL STORAGE SAVE/LOAD ===== */

  function saveToStorage() {
    saveCurrentState();

    try {
      var storeable = frames.map(function(f) {
        return {
          imageData: f.imageData ? arrayBufferToBase64(f.imageData.data.buffer) : null,
          annotation: f.annotation
        };
      });

      localStorage.setItem('oros-storyboard-data', JSON.stringify(storeable));
      localStorage.setItem('oros-storyboard-current', currentFrameIndex.toString());
    } catch (e) {
      console.warn('Could not save storyboard to localStorage:', e);
    }
  }

  function loadFromStorage() {
    try {
      var data = localStorage.getItem('oros-storyboard-data');
      var currentStr = localStorage.getItem('oros-storyboard-current');

      if (!data) return;

      var storeable = JSON.parse(data);
      var storeableCurrent = parseInt(currentStr) || 0;

      frames = storeable.map(function(f) {
        return {
          imageData: f.imageData ? base64ToArrayBuffer(f.imageData) : null,
          annotation: f.annotation || '',
          thumbnail: null
        };
      });

      if (frames.length > 0) {
        loadFrame(Math.min(storeableCurrent, frames.length - 1));
      }
    } catch (e) {
      console.warn('Could not load storyboard from localStorage:', e);
    }
  }

  function arrayBufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /* ===== EVENT LISTENERS ===== */

  function setupListeners() {
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var touch = e.touches[0];
      var mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    });

    canvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      var touch = e.touches[0];
      var mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    });

    canvas.addEventListener('touchend', function(e) {
      e.preventDefault();
      var mouseEvent = new MouseEvent('mouseup', {});
      canvas.dispatchEvent(mouseEvent);
    });

    var toolBtns = document.querySelectorAll('.sb-tool-btn');
    toolBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        toolBtns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentTool = btn.getAttribute('data-tool');
      });
    });

    var sizeSlider = document.getElementById('sb-brush-size');
    var sizeDisplay = document.getElementById('sb-size-value');
    if (sizeSlider) {
      sizeSlider.addEventListener('input', function(e) {
        brushSize = parseInt(e.target.value);
        if (sizeDisplay) sizeDisplay.textContent = brushSize + 'px';
      });
    }

    var colorPicker = document.getElementById('sb-brush-color');
    if (colorPicker) {
      colorPicker.addEventListener('input', function(e) {
        brushColor = e.target.value;
      });
    }

    var clearBtn = document.getElementById('sb-clear-canvas');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        if (confirm(t('storyboard_confirm_clear', 'Are you sure?'))) {
          clearCanvas();
          saveCurrentState();
        }
      });
    }

    var addFrameBtn = document.getElementById('sb-add-frame');
    if (addFrameBtn) {
      addFrameBtn.addEventListener('click', addNewFrame);
    }

    var deleteFrameBtn = document.getElementById('sb-delete-frame');
    if (deleteFrameBtn) {
      deleteFrameBtn.addEventListener('click', deleteCurrentFrame);
    }

    var exportBtn = document.getElementById('sb-export-png');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportAsPNG);
    }

    var annInput = document.getElementById('sb-annotation-input');
    if (annInput) {
      annInput.addEventListener('change', saveCurrentState);
      annInput.addEventListener('blur', saveCurrentState);
    }

    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          saveToStorage();
          showToast('storyboard_saved', 'Storyboard saved!');
        } else if (e.key === 'n') {
          e.preventDefault();
          addNewFrame();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement !== annInput) {
          e.preventDefault();
          deleteCurrentFrame();
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        loadFrame(Math.min(currentFrameIndex + 1, frames.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        loadFrame(Math.max(currentFrameIndex - 1, 0));
      }
    });

    setInterval(saveToStorage, 5000);
  }

  /* ===== INIT ===== */

  function init() {
    loadTranslations();
    initCanvas();
    setupListeners();

    if (!localStorage.getItem('oros-storyboard-data')) {
      saveCurrentState();
    } else {
      loadFromStorage();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();