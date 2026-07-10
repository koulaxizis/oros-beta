// ============================================================================
// metronome.js — ΔΙΟΡΘΩΜΕΝΗ (fetch path με baseHref)
// ============================================================================

(function() {
  'use strict';

  /* ===== STATE ===== */
  var bpm = 120;
  var isPlaying = false;
  var timeSignature = '4/4';
  var beatInBar = 0;
  var tapTimes = [];
  var tapTimer = null;
  var countdownBeats = 4;
  var currentBeat = -1;
  var volume = 0.7;
  var countdownEnabled = true;

  var audioContext = null;

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
      })
      .catch(function(e) {
        console.warn('Failed to load translations:', e);
      });
  }

  function t(key) {
    var langData = translations[currentLang] || translations['en'] || {};
    return langData[key] || key;
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

  /* ===== AUDIO INITIALIZATION ===== */

  function initAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  /* ===== PLAY TONE ===== */

  function playTone(beatNumber, totalBeats) {
    initAudio();

    var osc = audioContext.createOscillator();
    var gainNode = audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    var now = audioContext.currentTime;

    if (beatNumber === 0) {
      osc.frequency.setValueAtTime(880, now);
      gainNode.gain.setValueAtTime(volume, now);
    } else {
      osc.frequency.setValueAtTime(440, now);
      gainNode.gain.setValueAtTime(volume * 0.6, now);
    }

    osc.start(now);

    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.stop(now + 0.1);
  }

  /* ===== METRONOME TIMER ===== */

  var nextNoteTime = 0;
  var lookahead = 25.0;
  var scheduleAheadTime = 0.1;

  function nextNote() {
    var secondsPerBeat = 60.0 / bpm;
    nextNoteTime += secondsPerBeat;
    beatInBar++;
    if (beatInBar >= getTotalBeatsPerBar()) {
      beatInBar = 0;
    }
  }

  function getTotalBeatsPerBar() {
    if (timeSignature === '6/8') return 6;
    return parseInt(timeSignature.split('/')[0]);
  }

  function scheduler() {
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
      scheduleNote(beatInBar, nextNoteTime);
      nextNote();
    }
  }

  var timerID = null;

  function scheduleNote(beatNumber, time) {
    playTone(beatNumber, getTotalBeatsPerBar());

    var drawTime = (time - audioContext.currentTime) * 1000;
    setTimeout(function() {
      updateVisualBeat(beatNumber);
    }, drawTime);
  }

  function updateVisualBeat(beatNumber) {
    var display = document.getElementById('metro-beat-display');
    if (!display) return;

    if (beatNumber === 0) {
      display.innerHTML = '<span class="metro-beat-strong">●</span>';
    } else {
      display.innerHTML = '<span class="metro-beat-weak">○</span>';
    }

    display.classList.remove('metro-beat-active');
    void display.offsetWidth;
    display.classList.add('metro-beat-active');
  }

  function startMetronome() {
    initAudio();
    isPlaying = true;
    beatInBar = 0;
    nextNoteTime = audioContext.currentTime;

    timerID = setInterval(scheduler, lookahead);

    updatePlayButton();
  }

  function stopMetronome() {
    isPlaying = false;
    clearInterval(timerID);
    timerID = null;

    var display = document.getElementById('metro-beat-display');
    if (display) {
      display.innerHTML = '●';
      display.classList.remove('metro-beat-active');
    }

    updatePlayButton();
  }

  function toggleMetronome() {
    if (isPlaying) {
      stopMetronome();
    } else {
      if (countdownEnabled) {
        countdownAndStart();
      } else {
        startMetronome();
      }
    }
  }

  function countdownAndStart() {
    isPlaying = true;
    var display = document.getElementById('metro-beat-display');
    var countdown = 4;
    currentBeat = -1;

    var countInterval = setInterval(function() {
      if (countdown > 0) {
        display.innerHTML = countdown;
        currentBeat = countdown;
        countdown--;
      } else {
        clearInterval(countInterval);
        display.innerHTML = '●';
        currentBeat = 0;
        startMetronome();
      }
    }, 1000);
  }

  /* ===== UI UPDATES ===== */

  function updateBPMDisplay() {
    var display = document.getElementById('metro-bpm-display');
    if (display) display.textContent = bpm + ' BPM';
  }

  function updatePlayButton() {
    var btn = document.getElementById('metro-toggle');
    var icon = document.getElementById('metro-play-icon');
    if (!btn || !icon) return;

    if (isPlaying) {
      btn.querySelector('span').textContent = t('metronome_stop') || 'Stop';
      icon.className = 'fa fa-stop';
    } else {
      btn.querySelector('span').textContent = t('metronome_start') || 'Start';
      icon.className = 'fa fa-play';
    }
  }

  /* ===== BEAT INDICATOR STYLING ===== */

  function setupBeatIndicatorStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '.metro-beat-display { ',
      '  font-size: 48px; ',
      '  font-weight: 700; ',
      '  color: var(--accent-gold); ',
      '  text-align: center; ',
      '  margin-bottom: 20px; ',
      '  transition: all 50ms ease; ',
      '} ',
      '.metro-beat-strong { ',
      '  color: var(--accent-gold-light); ',
      '  text-shadow: 0 0 20px rgba(200,169,110,0.6); ',
      '} ',
      '.metro-beat-weak { ',
      '  color: var(--accent-gold-dim); ',
      '} ',
      '.metro-beat-active { ',
      '  transform: scale(1.2); ',
      '} '
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ===== EVENT LISTENERS ===== */

  function setupListeners() {
    var bpmSlider = document.getElementById('metro-bpm-slider');
    var decreaseBtn = document.getElementById('metro-decrease');
    var increaseBtn = document.getElementById('metro-increase');
    var toggleBtn = document.getElementById('metro-toggle');
    var tapBtn = document.getElementById('metro-tap-btn');
    var tsButtons = document.querySelectorAll('.metro-ts-btn');
    var volumeSlider = document.getElementById('metro-volume');
    var countdownChk = document.getElementById('metro-countdown');

    if (bpmSlider) {
      bpmSlider.addEventListener('input', function(e) {
        setBPM(parseInt(e.target.value));
      });
    }

    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', function() {
        setBPM(Math.max(30, bpm - 1));
      });
    }

    if (increaseBtn) {
      increaseBtn.addEventListener('click', function() {
        setBPM(Math.min(240, bpm + 1));
      });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        toggleMetronome();
      });
    }

    if (tapBtn) {
      tapBtn.addEventListener('click', function() {
        recordTap();
      });
    }

    for (var i = 0; i < tsButtons.length; i++) {
      tsButtons[i].addEventListener('click', function(e) {
        for (var j = 0; j < tsButtons.length; j++) {
          tsButtons[j].classList.remove('active');
        }
        e.currentTarget.classList.add('active');
        timeSignature = e.currentTarget.getAttribute('data-ts');
        beatInBar = 0;
      });
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', function(e) {
        volume = parseInt(e.target.value) / 100;
      });
    }

    if (countdownChk) {
      countdownChk.addEventListener('change', function(e) {
        countdownEnabled = e.target.checked;
      });
    }

    document.addEventListener('keydown', function(e) {
      if (e.code === 'Space') {
        e.preventDefault();
        toggleMetronome();
      }
    });
  }

  function setBPM(newBPM) {
    bpm = Math.max(30, Math.min(240, newBPM));
    var slider = document.getElementById('metro-bpm-slider');
    if (slider) slider.value = bpm;
    updateBPMDisplay();
  }

  /* ===== TAP TEMPO ===== */

  function recordTap() {
    var now = Date.now();
    tapTimes.push(now);

    tapTimes = tapTimes.filter(function(t) {
      return (now - t) < 2000;
    });

    if (tapTimes.length < 2) {
      return;
    }

    var intervals = [];
    for (var i = 1; i < tapTimes.length; i++) {
      intervals.push(tapTimes[i] - tapTimes[i - 1]);
    }

    var totalInterval = intervals.reduce(function(a, b) { return a + b; }, 0);
    var avgInterval = totalInterval / intervals.length;

    var calculatedBPM = Math.round(60000 / avgInterval);

    calculatedBPM = Math.max(30, Math.min(240, calculatedBPM));

    setBPM(calculatedBPM);

    clearTimeout(tapTimer);
    tapTimer = setTimeout(function() {
      tapTimes = [];
    }, 1000);
  }

  /* ===== INIT ===== */

  function init() {
    loadTranslations();
    setupBeatIndicatorStyles();
    setupListeners();
    updateBPMDisplay();
    updatePlayButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();