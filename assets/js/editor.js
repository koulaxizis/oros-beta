// ============================================
// orOS Writer — Unified Rich Text Editor
// Fixes: Alignment, Typewriter Sound, Focus Mode, Hide Stats, Main Toolbar Buttons
// Quick Format Toolbar toggle controls .toolbar-center
// Lorem Ipsum expanded with detailed feature descriptions
// Panel positioning adjusted for bars overlay
// ============================================

(function() {
  'use strict';

  var STORAGE_KEY = 'oros_writer_content';
  var STORAGE_HIDE_STATS = 'oros_hide_stats';
  var STORAGE_FOCUS_MODE = 'oros_focus_mode';
  var STORAGE_READING_PROGRESS = 'oros_reading_progress';
  var STORAGE_SMART_TYPOGRAPHY = 'oros_smart_typography';
  var STORAGE_LAST_SAVED = 'oros_writer_last_saved';
  var STORAGE_GOAL_TARGET = 'oros_goal_target';
  var STORAGE_GOAL_UNIT = 'oros_goal_unit';
  var STORAGE_GOAL_LOCK = 'oros_goal_lock';
  var STORAGE_HIDE_GOAL_BTN = 'oros_hide_goal_btn';
  var STORAGE_HIDE_OUTLINE_BTN = 'oros_hide_outline_btn';
  var STORAGE_HIDE_METADATA_BTN = 'oros_hide_metadata_btn';
  var STORAGE_HIDE_FIND_BTN = 'oros_hide_find_btn';
  var STORAGE_HIDE_WORDFREQ_BTN = 'oros_hide_wordfreq_btn';
  var STORAGE_HIDE_SAVE_INDICATOR = 'oros_hide_save_indicator';
  var STORAGE_HIDE_LOREM_BTN = 'oros_hide_lorem_btn';
  var STORAGE_TYPEWRITER_SOUND = 'oros_typewriter_sound';
  var STORAGE_METADATA = 'oros_writer_metadata';

  var richEditor = document.getElementById('rich-editor');
  var richWrapper = document.getElementById('rich-wrapper');
  var findBar = document.getElementById('find-replace-bar');
  var findInput = document.getElementById('find-find');
  var replaceInput = document.getElementById('find-replace');
  var frResults = document.getElementById('fr_results');
  var btnSave = document.getElementById('btn-save');
  var btnOpen = document.getElementById('btn-open');
  var btnClear = document.getElementById('btn-clear');
  var btnExport = document.getElementById('btn-export');
  var btnLorem = document.getElementById('btn-lorem');
  var exportDropdown = document.getElementById('export-dropdown');
  var fileInput = document.getElementById('file-input');
  var statsOverlay = document.getElementById('stats-overlay');
  var statsDefaultEl = document.getElementById('stats-default');
  var statsGoalEl = document.getElementById('stats-goal');
  var statsDetailed = document.getElementById('stats-detailed');
  var toolbarCenter = document.querySelector('.toolbar-center');
  var outlinePanel = document.getElementById('outline-panel');
  var outlineList = document.getElementById('outline-list');
  var btnOutline = document.getElementById('btn-outline');
  var btnCloseOutline = document.getElementById('btn-close-outline');
  var progressBar = document.getElementById('reading-progress-bar');
  var goalBar = document.getElementById('goal-bar');
  var goalUnitSelect = document.getElementById('goal-unit');
  var goalTargetInput = document.getElementById('goal-target-input');
  var goalLockCheckbox = document.getElementById('goal-lock');
  var btnGoal = document.getElementById('btn-goal');
  var btnSetGoal = document.getElementById('btn-set-goal');
  var btnClearGoal = document.getElementById('btn-clear-goal');
  var btnCloseGoal = document.getElementById('btn-close-goal');
  var btnFind = document.getElementById('btn-find');
  var btnCloseFR = document.getElementById('btn-close-fr');
  var metadataPanel = document.getElementById('metadata-panel');
  var btnMetadata = document.getElementById('btn-metadata');
  var btnCloseMetadata = document.getElementById('btn-close-metadata');
  var metaTitle = document.getElementById('meta-title');
  var metaAuthor = document.getElementById('meta-author');
  var metaTags = document.getElementById('meta-tags');
  var metaCategory = document.getElementById('meta-category');
  var metaCreated = document.getElementById('meta-created');
  var metaModified = document.getElementById('meta-modified');
  var btnWordFreq = document.getElementById('btn-wordfreq');
  var btnCloseWordFreq = document.getElementById('btn-close-wordfreq');
  var wordFreqPanel = document.getElementById('wordfreq-panel');
  var wordFreqSummary = document.getElementById('wordfreq-summary');
  var wordFreqList = document.getElementById('wordfreq-list');
  var saveIndicator = document.getElementById('save-indicator');

  var hideStats = localStorage.getItem(STORAGE_HIDE_STATS) === 'true';
  var quickTbarShow = localStorage.getItem('oros_quick_tbar_show') !== 'false';
  var focusModeEnabled = (localStorage.getItem(STORAGE_FOCUS_MODE) === 'true');
  var readingProgressEnabled = localStorage.getItem(STORAGE_READING_PROGRESS) !== 'false';
  var smartTypographyEnabled = localStorage.getItem(STORAGE_SMART_TYPOGRAPHY) !== 'false';
  var lastSavedTime = parseInt(localStorage.getItem(STORAGE_LAST_SAVED)) || null;
  var goalTarget = parseInt(localStorage.getItem(STORAGE_GOAL_TARGET)) || null;
  var goalUnit = localStorage.getItem(STORAGE_GOAL_UNIT) || 'words';
  var goalLockEnabled = localStorage.getItem(STORAGE_GOAL_LOCK) === 'true';
  var hideGoalBtn = localStorage.getItem(STORAGE_HIDE_GOAL_BTN) === 'true';
  var hideOutlineBtn = localStorage.getItem(STORAGE_HIDE_OUTLINE_BTN) === 'true';
  var hideMetadataBtn = localStorage.getItem(STORAGE_HIDE_METADATA_BTN) === 'true';
  var hideFindBtn = localStorage.getItem(STORAGE_HIDE_FIND_BTN) === 'true';
  var hideWordFreqBtn = localStorage.getItem(STORAGE_HIDE_WORDFREQ_BTN) === 'true';
  var hideSaveIndicator = localStorage.getItem(STORAGE_HIDE_SAVE_INDICATOR) === 'true';
  var hideLoremBtn = localStorage.getItem(STORAGE_HIDE_LOREM_BTN) === 'true';
  var typewriterSoundEnabled = localStorage.getItem(STORAGE_TYPEWRITER_SOUND) === 'true';
  var goalReachedShown = false;
  var goalLockTriggered = false;
  var currentMatchIndex = -1;
  var matchRanges = [];
  var statsExpanded = false;
  var wordFreqDebounce = null;
  var outlineDebounceTimer = null;

  // ========== TYPEWRITER SOUND (Web Audio API) ==========
  var typewriterAudioCtx = null;
  var typewriterAudioBuffer = null;

  function initTypewriterSound() {
    try {
      typewriterAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var sampleRate = typewriterAudioCtx.sampleRate;
      var duration = 0.04;
      var numSamples = Math.floor(sampleRate * duration);
      var buffer = typewriterAudioCtx.createBuffer(1, numSamples, sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < numSamples; i++) {
        var t = i / sampleRate;
        var envelope = Math.exp(-t * 80);
        var noise = (Math.random() * 2 - 1) * 0.3;
        var click = Math.sin(2 * Math.PI * 2000 * t) * 0.15;
        data[i] = (noise + click) * envelope * 0.5;
      }
      typewriterAudioBuffer = buffer;
    } catch(e) {
      typewriterAudioCtx = null;
    }
  }

  function playTypewriterSound() {
    if (!typewriterSoundEnabled || !typewriterAudioCtx || !typewriterAudioBuffer) return;
    try {
      var source = typewriterAudioCtx.createBufferSource();
      source.buffer = typewriterAudioBuffer;
      var gainNode = typewriterAudioCtx.createGain();
      gainNode.gain.value = 0.08;
      source.connect(gainNode);
      gainNode.connect(typewriterAudioCtx.destination);
      source.start(0);
    } catch(e) {}
  }

  window.addEventListener('oros-typewriter-sound-changed', function(e) {
    typewriterSoundEnabled = e.detail.enabled;
    if (typewriterSoundEnabled && !typewriterAudioCtx) {
      initTypewriterSound();
    }
  });

  // ========== HELPERS ==========
  function getCurrentLang() { return localStorage.getItem('oros-language') || 'en'; }
  function getTrans(key) {
    var lang = getCurrentLang();
    var t = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[lang]) || {};
    return t[key] || key;
  }
  function formatNumber(num) {
    return num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num.toString();
  }
  function getTextContent() {
    var text = richEditor.innerText || '';
    return text.replace(/\n$/, '');
  }

  // ========== PANE TOP OFFSET CALCULATION ==========
  function getPanelTopOffset() {
    var offset = 0;
    var header = document.getElementById('oros-header');
    if (header) offset += header.offsetHeight;
    var toolbar = document.getElementById('main-toolbar');
    if (toolbar) offset += toolbar.offsetHeight;
    if (goalBar && goalBar.style.display === 'flex') offset += goalBar.offsetHeight;
    if (findBar && findBar.style.display === 'flex') offset += findBar.offsetHeight;
    return offset + 'px';
  }

  // ========== LOREM IPSUM GENERATOR ==========
  function generateLoremIpsum() {
    var lang = getCurrentLang();
    var templates = {
      en: '<h1>Document Title</h1>' +
          '<p>Welcome to <strong>orOS Writer</strong>, a privacy-first rich text editor that works entirely offline. ' +
          'This sample text demonstrates <em>various formatting options</em> available in the editor, ' +
          'including <u>underlined text</u>, <strong>bold text</strong>, and <em>italic text</em>. ' +
          'All content is saved locally in your browser — no account, no server, no tracking.</p>' +
          '<ul><li>Bold, italic, and underline formatting</li>' +
          '<li>Headings (H1, H2, H3) for document structure</li>' +
          '<li>Bullet and numbered lists</li>' +
          '<li>Text alignment: left, center, right, justify</li>' +
          '<li>Blockquotes for emphasis</li></ul>' +
          '<h2>Smart Typography</h2>' +
          '<p>The editor features <strong>Smart Typography</strong>, which automatically converts common ' +
          'shortcuts into proper typographic characters as you type:</p>' +
          '<ul><li>Double hyphens (--) become an em dash (\u2014)</li>' +
          '<li>Three dots (...) become an ellipsis (\u2026)</li>' +
          '<li>Straight quotes become curly quotes (\u201C \u201D) and smart apostrophes (\u2018 \u2019)</li>' +
          '<li>(c) becomes \u00A9, (r) becomes \u00AE, and (tm) becomes \u2122</li></ul>' +
          '<p>Try typing these shortcuts yourself — just enable Smart Typography in Settings if it is not already on.</p>' +
          '<blockquote>Writing is easy. All you do is stare at a blank sheet of paper until drops of blood form on your forehead. — Gene Fowler</blockquote>' +
          '<h2>Editor Features</h2>' +
          '<p>orOS Writer includes a range of tools designed for writers, journalists, and bloggers:</p>' +
          '<ol><li>Automatic saving — your work is preserved after every keystroke</li>' +
          '<li>Export to Markdown, Plain Text, RTF, Word, or PDF</li>' +
          '<li>Document outline panel for navigating headings</li>' +
          '<li>Word frequency analysis to spot repetition and overused words</li>' +
          '<li>Document metadata for title, author, tags, and category</li>' +
          '<li>Writing goals with optional lock when the target is reached</li>' +
          '<li>Find and replace functionality</li>' +
          '<li>Reading progress bar and detailed statistics</li></ol>' +
          '<h2>Privacy First</h2>' +
          '<p>Everything happens in your browser. Your text never leaves your device. ' +
          'There are no analytics, no telemetry, no advertisements, and no accounts required. ' +
          'This is open-source software built with respect for your personal data.</p>' +
          '<h2>Offline Operation</h2>' +
          '<p>Once loaded, orOS Writer continues to work even without an internet connection. ' +
          'The application caches all resources using a service worker, enabling true offline capability. ' +
          'You can install it as a Progressive Web App (PWA) for even better integration with your device.</p>' +
          '<p>This is the <em>final paragraph</em> of the sample content. ' +
          'You can clear it anytime with the trash button, or start editing right away. ' +
          'The editor remembers your work between sessions, so feel free to close and return later. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>',
      el: '<h1>Τίτλος Εγγράφου</h1>' +
          '<p>Καλώς ήρθες στο <strong>orOS Writer</strong>, έναν επεξεργαστή κειμένου που σέβεται το απόρρητο ' +
          'και λειτουργεί εξ ολοκλήρου offline. Αυτό το δοκιμαστικό κείμενο επιδεικνύει ' +
          '<em>διάφορες επιλογές μορφοποίησης</em> του editor, συμπεριλαμβανομένου ' +
          '<u>υπογεγραμμένου κειμένου</u>, <strong>έντονου κειμένου</strong>, ' +
          'και <em>πλάγιου κειμένου</em>. ' +
          'Όλο το περιεχόμενο αποθηκεύεται τοπικά στον browser — χωρίς λογαριασμό, χωρίς server, χωρίς παρακολούθηση.</p>' +
          '<ul><li>Μορφοποίηση έντονα, πλάγια, υπογράμμιση</li>' +
          '<li>Τίτλοι (H1, H2, H3) για δομή εγγράφου</li>' +
          '<li>Λίστες κουκκίδων και αριθμημένες</li>' +
          '<li>Στοίχιση κειμένου: αριστερά, κέντρο, δεξιά, πλήρης</li>' +
          '<li>Αποσπάσματα για έμφαση</li></ul>' +
          '<h2>Έξυπνη Τυπογραφία</h2>' +
          '<p>Ο editor διαθέτει <strong>Έξυπνη Τυπογραφία</strong>, που μετατρέπει αυτόματα ' +
          'συνηθισμένες συντομογραφίες σε σωστούς τυπογραφικούς χαρακτήρες καθώς πληκτρολογείς:</p>' +
          '<ul><li>Διπλές παύλες (--) γίνονται μακρά παύλα (\u2014)</li>' +
          '<li>Τρεις τελείες (...) γίνονται αποσιωπητικά (\u2026)</li>' +
          '<li>Απλά εισαγωγικά γίνονται καμπύλα εισαγωγικά (\u201C \u201D) και έξυπνα αποστόφια (\u2018 \u2019)</li>' +
          '<li>(c) γίνεται \u00A9, (r) γίνεται \u00AE, και (tm) γίνεται \u2122</li></ul>' +
          '<p>Δοκίμασε να πληκτρολογήσεις αυτές τις συντομογραφίες μόνος σου — ' +
          'απλά ενεργοποίησε την Έξυπνη Τυπογραφία στις Ρυθμίσεις αν δεν είναι ήδη ενεργή.</p>' +
          '<blockquote>Η γραφή είναι εύκολη. Απλά κοιτάς ένα λευκό φύλλο χαρτιού μέχρι να σταλάξεις σταγόνες αίματος στο μέτωπό σου. — Gene Fowler</blockquote>' +
          '<h2>Λειτουργίες Editor</h2>' +
          '<p>Ο orOS Writer περιλαμβάνει μια σειρά εργαλείων σχεδιασμένων για συγγραφείς, δημοσιογράφους και bloggers:</p>' +
          '<ol><li>Αυτόματη αποθήκευση — η δουλειά σου σώζεται μετά από κάθε πληκτρολόγηση</li>' +
          '<li>Εξαγωγή σε Markdown, Απλό Κείμενο, RTF, Word ή PDF</li>' +
          '<li>Πίνακας δομής εγγράφου για πλοήγηση στους τίτλους</li>' +
          '<li>Ανάλυση συχνότητας λέξεων για εντοπισμό επαναλήψεων</li>' +
          '<li>Μεταδεδομένα εγγράφου για τίτλο, συγγραφέα, ετικέτες και κατηγορία</li>' +
          '<li>Στόχοι γραφής με προαιρετικό κλείδωμα όταν επιτυγχάνονται</li>' +
          '<li>Εύρεση και αντικατάσταση κειμένου</li>' +
          '<li>Μπάρα προόδου ανάγνωσης και αναλυτικά στατιστικά</li></ol>' +
          '<h2>Απόρρητο Πρώτα</h2>' +
          '<p>Όλα συμβαίνουν στον browser σου. Το κείμενό σου δεν φεύγει ποτέ από τη συσκευή σου. ' +
          'Δεν υπάρχουν αναλυτικά στοιχεία, τηλεμετρία, διαφημίσεις, ή λογαριασμοί. ' +
          'Αυτό είναι λογισμικό ανοιχτού κώδικα, φτιαγμένο με σεβασμό για τα προσωπικά σου δεδομένα.</p>' +
          '<h2>Λειτουργία Offline</h2>' +
          '<p>Μόλις φορτώσει, ο orOS Writer συνεχίζει να λειτουργεί ακόμα και χωρίς σύνδεση στο ίντερνετ. ' +
          'Η εφαρμογή αποθηκεύει όλους τους πόρους χρησιμοποιώντας service worker, επιτρέποντας πραγματική offline δυνατότητα. ' +
          'Μπορείς να την εγκαταστήσεις ως Progressive Web App (PWA) για ακόμα καλύτερη ολοκλήρωση με τη συσκευή σου.</p>' +
          '<p>Αυτή είναι η <em>τελευταία παράγραφος</em> του δοκιμαστικού κειμένου. ' +
          'Μπορείς να την καθαρίσεις ανά πάσα στιγμή με το κουμπί διαγραφής, ή να ξεκινήσεις να επεξεργάζεσαι αμέσως. ' +
          'Ο editor θυμάται τη δουλειά σου μεταξύ των συνεδριών, οπότε μπορείς να κλείσεις και να επιστρέψεις αργότερα. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>',
      es: '<h1>Título del Documento</h1>' +
          '<p>Bienvenido a <strong>orOS Writer</strong>, un editor de texto que respeta tu privacidad y funciona completamente sin conexión. ' +
          'Este texto de muestra demuestra <em>varias opciones de formato</em> disponibles en el editor, ' +
          'incluyendo <u>texto subrayado</u>, <strong>texto en negrita</strong>, y <em>texto en cursiva</em>. ' +
          'Todo el contenido se guarda localmente en tu navegador — sin cuenta, sin servidor, sin rastreo.</p>' +
          '<ul><li>Formato negrita, cursiva y subrayado</li>' +
          '<li>Encabezados (H1, H2, H3) para estructura</li>' +
          '<li>Listas de viñetas y numeradas</li>' +
          '<li>Opciones de alineación de texto</li>' +
          '<li>Citas para énfasis</li></ul>' +
          '<h2>Tipografía Inteligente</h2>' +
          '<p>El editor incluye <strong>Tipografía Inteligente</strong>, que convierte automáticamente ' +
          'atajos comunes en caracteres tipográficos correctos mientras escribes:</p>' +
          '<ul><li>Dobles guiones (--) se convierten en guion largo (\u2014)</li>' +
          '<li>Tres puntos (...) se convierten en puntos suspensivos (\u2026)</li>' +
          '<li>Comillas rectas se convierten en comillas tipográficas (\u201C \u201D) y apóstrofos inteligentes (\u2018 \u2019)</li>' +
          '<li>(c) se convierte en \u00A9, (r) en \u00AE, y (tm) en \u2122</li></ul>' +
          '<p>Prueba a escribir estos atajos tú mismo — solo activa la Tipografía Inteligente en Configuración si aún no está activada.</p>' +
          '<blockquote>Escribir es fácil. Solo miras una hoja de papel en blanco hasta que gotas de sangre se forman en tu frente. — Gene Fowler</blockquote>' +
          '<h2>Funciones del Editor</h2>' +
          '<p>orOS Writer incluye una gama de herramientas diseñadas para escritores, periodistas y bloggers:</p>' +
          '<ol><li>Guardado automático — tu trabajo se preserva tras cada pulsación</li>' +
          '<li>Exportar a Markdown, Texto Plano, RTF, Word o PDF</li>' +
          '<li>Panel de esquema del documento para navegar por los encabezados</li>' +
          '<li>Análisis de frecuencia de palabras para detectar repeticiones</li>' +
          '<li>Metadatos del documento para título, autor, etiquetas y categoría</li>' +
          '<li>Objetivos de escritura con bloqueo opcional al alcanzar la meta</li>' +
          '<li>Función de buscar y reemplazar</li>' +
          '<li>Barra de progreso de lectura y estadísticas detalladas</li></ol>' +
          '<h2>Privacidad Primero</h2>' +
          '<p>Todo ocurre en tu navegador. Tu texto nunca sale de tu dispositivo. ' +
          'No hay analíticas, ni telemetría, ni anuncios, ni cuentas requeridas. ' +
          'Esto es software de código abierto, creado con respeto por tus datos personales.</p>' +
          '<h2>Operación Sin Conexión</h2>' +
          '<p>Una vez cargado, orOS Writer sigue funcionando incluso sin conexión a Internet. ' +
          'La aplicación almacena todos los recursos usando un service worker, permitiendo verdadera capacidad offline. ' +
          'Puedes instalarla como Progressive Web App (PWA) para mejor integración con tu dispositivo.</p>' +
          '<p>Este es el <em>párrafo final</em> del contenido de muestra. ' +
          'Puedes borrarlo en cualquier momento con el botón de papelera, o empezar a editar de inmediato. ' +
          'El editor recuerda tu trabajo entre sesiones, así que siéntete libre de cerrar y volver más tarde. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>',
      it: '<h1>Titolo del Documento</h1>' +
          '<p>Benvenuto in <strong>orOS Writer</strong>, un editor di testo che rispetta la tua privacy e funziona completamente offline. ' +
          'Questo testo di esempio dimostra <em>varie opzioni di formattazione</em> disponibili nell\'editor, ' +
          'inclusi <u>testo sottolineato</u>, <strong>testo in grassetto</strong>, e <em>testo in corsivo</em>. ' +
          'Tutti i contenuti vengono salvati localmente nel tuo browser — nessun account, nessun server, nessun tracciamento.</p>' +
          '<ul><li>Formattazione grassetto, corsivo e sottolineato</li>' +
          '<li>Intestazioni (H1, H2, H3) per la struttura</li>' +
          '<li>Elenchi puntati e numerati</li>' +
          '<li>Opzioni di allineamento del testo</li>' +
          '<li>Citazioni per enfasi</li></ul>' +
          '<h2>Tipografia Intelligente</h2>' +
          '<p>L\'editor include la <strong>Tipografia Intelligente</strong>, che converte automaticamente ' +
          'scorciatoie comuni in caratteri tipografici corretti mentre scrivi:</p>' +
          '<ul><li>Doppi trattini (--) diventano un trattino lungo (\u2014)</li>' +
          '<li>Tre punti (...) diventano puntini di sospensione (\u2026)</li>' +
          '<li>Le virgolette dritte diventano virgolette tipografiche (\u201C \u201D) e apostrofi intelligenti (\u2018 \u2019)</li>' +
          '<li>(c) diventa \u00A9, (r) diventa \u00AE, e (tm) diventa \u2122</li></ul>' +
          '<p>Prova a digitare queste scorciatoie tu stesso — basta attivare la Tipografia Intelligente nelle Impostazioni se non è già attiva.</p>' +
          '<blockquote>Scrivere è facile. Devi solo fissare un foglio di carta bianca finché non ti si formano gocce di sangue sulla fronte. — Gene Fowler</blockquote>' +
          '<h2>Funzioni dell\'Editor</h2>' +
          '<p>orOS Writer include una gamma di strumenti progettati per scrittori, giornalisti e blogger:</p>' +
          '<ol><li>Salvataggio automatico — il tuo lavoro viene preservato dopo ogni battitura</li>' +
          '<li>Esportazione in Markdown, Testo Semplice, RTF, Word o PDF</li>' +
          '<li>Pannello struttura del documento per navigare tra le intestazioni</li>' +
          '<li>Analisi della frequenza delle parole per individuare ripetizioni</li>' +
          '<li>Metadati del documento per titolo, autore, tag e categoria</li>' +
          '<li>Obiettivi di scrittura con blocco opzionale al raggiungimento della meta</li>' +
          '<li>Funzione di trova e sostituisci</li>' +
          '<li>Barra di avanzamento della lettura e statistiche dettagliate</li></ol>' +
          '<h2>Prima la Privacy</h2>' +
          '<p>Tutto avviene nel tuo browser. Il tuo testo non lascia mai il tuo dispositivo. ' +
          'Non ci sono analitiche, telemetria, pubblicità, né account richiesti. ' +
          'Questo è software open source, creato con rispetto per i tuoi dati personali.</p>' +
          '<h2>Operatività Offline</h2>' +
          '<p>Una volta caricato, orOS Writer continua a funzionare anche senza connessione a Internet. ' +
          'L\'applicazione memorizza tutte le risorse utilizzando un service worker, consentendo vera capacità offline. ' +
          'Puoi installarla come Progressive Web App (PWA) per migliore integrazione con il tuo dispositivo.</p>' +
          '<p>Questo è il <em>paragrafo finale</em> del contenuto di esempio. ' +
          'Puoi cancellarlo in qualsiasi momento con il pulsante del cestino, o iniziare a modificare subito. ' +
          'L\'editor ricorda il tuo lavoro tra le sessioni, quindi sentiti libero di chiudere e tornare più tardi. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>',
      fr: '<h1>Titre du Document</h1>' +
          '<p>Bienvenue dans <strong>orOS Writer</strong>, un éditeur de texte qui respecte votre vie privée et fonctionne entièrement hors ligne. ' +
          'Ce texte d\'exemple démontre <em>diverses options de mise en forme</em> disponibles dans l\'éditeur, ' +
          'y compris du <u>texte souligné</u>, du <strong>texte en gras</strong>, et du <em>texte en italique</em>. ' +
          'Tout le contenu est sauvegardé localement dans votre navigateur — sans compte, sans serveur, sans suivi.</p>' +
          '<ul><li>Formatage gras, italique et souligné</li>' +
          '<li>Titres (H1, H2, H3) pour la structure</li>' +
          '<li>Listes à puces et numérotées</li>' +
          '<li>Options d\'alignement du texte</li>' +
          '<li>Citations pour mettre en évidence</li></ul>' +
          '<h2>Typographie Intelligente</h2>' +
          '<p>L\'éditeur inclut la <strong>Typographie Intelligente</strong>, qui convertit automatiquement ' +
          'les raccourcis courants en caractères typographiques corrects pendant que vous tapez :</p>' +
          '<ul><li>Les doubles tirets (--) deviennent un tiret long (\u2014)</li>' +
          '<li>Trois points (...) deviennent des points de suspension (\u2026)</li>' +
          '<li>Les guillemets droits deviennent des guillemets typographiques (\u201C \u201D) et apostrophes intelligentes (\u2018 \u2019)</li>' +
          '<li>(c) devient \u00A9, (r) devient \u00AE, et (tm) devient \u2122</li></ul>' +
          '<p>Essayez de taper ces raccourcis vous-même — activez simplement la Typographie Intelligente dans les Paramètres si elle n\'est pas déjà activée.</p>' +
          '<blockquote>Écrire est facile. Vous fixez simplement une feuille de papier blanc jusqu\'à ce que des gouttes de sang se forment sur votre front. — Gene Fowler</blockquote>' +
          '<h2>Fonctions de l\'Éditeur</h2>' +
          '<p>orOS Writer comprend une gamme d\'outils conçus pour les écrivains, journalistes et blogueurs :</p>' +
          '<ol><li>Sauvegarde automatique — votre travail est préservé après chaque frappe</li>' +
          '<li>Exportation en Markdown, Texte Brut, RTF, Word ou PDF</li>' +
          '<li>Panneau de plan du document pour naviguer entre les titres</li>' +
          '<li>Analyse de fréquence des mots pour repérer les répétitions</li>' +
          '<li>Métadonnées du document pour titre, auteur, tags et catégorie</li>' +
          '<li>Objectifs d\'écriture avec verrouillage facultatif à l\'atteinte de l\'objectif</li>' +
          '<li>Fonction de recherche et remplacement</li>' +
          '<li>Barre de progression de lecture et statistiques détaillées</li></ol>' +
          '<h2>Vie Privée D\'abord</h2>' +
          '<p>Tout se passe dans votre navigateur. Votre texte ne quitte jamais votre appareil. ' +
          'Il n\'y a pas d\'analytique, ni télémétrie, ni publicités, ni comptes requis. ' +
          'Ceci est un logiciel open source, créé dans le respect de vos données personnelles.</p>' +
          '<h2>Fonctionnement Hors Ligne</h2>' +
          '<p>Une fois chargé, orOS Writer continue de fonctionner même sans connexion Internet. ' +
          'L\'application met en cache toutes les ressources en utilisant un service worker, permettant une véritable capacité hors ligne. ' +
          'Vous pouvez l\'installer comme Progressive Web App (PWA) pour une meilleure intégration avec votre appareil.</p>' +
          '<p>Ceci est le <em>paragraphe final</em> du contenu d\'exemple. ' +
          'Vous pouvez l\'effacer à tout moment avec le bouton de corbeille, ou commencer à éditer immédiatement. ' +
          'L\'éditeur se souvient de votre travail entre les sessions, donc n\'hésitez pas à fermer et revenir plus tard. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>',
      de: '<h1>Dokumenttitel</h1>' +
          '<p>Willkommen bei <strong>orOS Writer</strong>, einem Texteditor, der Ihre Privatsphäre respektiert und vollständig offline funktioniert. ' +
          'Dieser Beispieltext demonstriert <em>verschiedene Formatierungsoptionen</em> im Editor, ' +
          'einschließlich <u>unterstrichenem Text</u>, <strong>Fetttext</strong>, und <em>Kursivtext</em>. ' +
          'Alle Inhalte werden lokal in Ihrem Browser gespeichert — kein Konto, kein Server, kein Tracking.</p>' +
          '<ul><li>Formatierung Fett, Kursiv und Unterstrichen</li>' +
          '<li>Überschriften (H1, H2, H3) für Struktur</li>' +
          '<li>Aufzählungslisten und nummerierte Listen</li>' +
          '<li>Textausrichtungsoptionen</li>' +
          '<li>Zitate zur Hervorhebung</li></ul>' +
          '<h2>Intelligente Typografie</h2>' +
          '<p>Der Editor bietet <strong>Intelligente Typografie</strong>, die häufige Tastenkürzel ' +
          'automatisch in korrekte typografische Zeichen umwandelt, während Sie tippen:</p>' +
          '<ul><li>Doppelte Bindestriche (--) werden zu Gedankenstrich (\u2014)</li>' +
          '<li>Drei Punkte (...) werden zu Auslassungspunkten (\u2026)</li>' +
          '<li>Gerade Anführungszeichen werden zu typografischen Anführungszeichen (\u201C \u201D) und intelligenten Apostrophen (\u2018 \u2019)</li>' +
          '<li>(c) wird zu \u00A9, (r) wird zu \u00AE, und (tm) wird zu \u2122</li></ul>' +
          '<p>Versuchen Sie, diese Kürzel selbst einzugeben — aktivieren Sie einfach die Intelligente Typografie in den Einstellungen, falls sie noch nicht aktiv ist.</p>' +
          '<blockquote>Schreiben ist einfach. Sie starren nur auf ein leeres Blatt Papier, bis sich Blutstropfen auf Ihrer Stirn bilden. — Gene Fowler</blockquote>' +
          '<h2>Editor-Funktionen</h2>' +
          '<p>orOS Writer umfasst eine Reihe von Werkzeugen, die für Schriftsteller, Journalisten und Blogger entwickelt wurden:</p>' +
          '<ol><li>Automatisches Speichern — Ihre Arbeit wird nach jedem Tastenanschlag gespeichert</li>' +
          '<li>Export als Markdown, Klartext, RTF, Word oder PDF</li>' +
          '<li>Dokumentgliederungspanel zur Navigation zwischen Überschriften</li>' +
          '<li>Worthäufigkeitsanalyse zur Erkennung von Wiederholungen</li>' +
          '<li>Dokumentmetadaten für Titel, Autor, Tags und Kategorie</li>' +
          '<li>Schreibziele mit optionaler Sperre beim Erreichen des Ziels</li>' +
          '<li>Suchen-und-Ersetzen-Funktion</li>' +
          '<li>Lese fortschrittsbalken und detaillierte Statistiken</li></ol>' +
          '<h2>Datenschutz Zuerst</h2>' +
          '<p>Alles passiert in Ihrem Browser. Ihr Text verlässt nie Ihr Gerät. ' +
          'Es gibt keine Analytik, keine Telemetrie, keine Werbung und keine Kontopflicht. ' +
          'Dies ist Open-Source-Software, die mit Respekt für Ihre persönlichen Daten erstellt wurde.</p>' +
          '<h2>Offline-Betrieb</h2>' +
          '<p>Sobald geladen, funktioniert orOS Writer auch ohne Internetverbindung weiter. ' +
          'Die Anwendung cacht alle Ressourcen über einen Service Worker, was echte Offline-Fähigkeit ermöglicht. ' +
          'Sie können es als Progressive Web App (PWA) installieren für bessere Integration mit Ihrem Gerät.</p>' +
          '<p>Dies ist der <em>letzte Absatz</em> des Beispielinhalts. ' +
          'Sie können ihn jederzeit mit dem Mülleimer-Button löschen oder sofort mit dem Bearbeiten beginnen. ' +
          'Der Editor merkt sich Ihre Arbeit zwischen den Sitzungen, also zögern Sie nicht, zu schließen und später zurückzukehren. ' +
          'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p>'
    };
    return templates[lang] || templates.en;
  }

  function insertLoremIpsum() {
    if (!richEditor) return;
    var html = generateLoremIpsum();
    richEditor.innerHTML = html;
    saveContent();
    updateStats();
    showToast(getTrans('toast_lorem_inserted') || 'Sample text inserted');
  }

  // ========== SAVE INDICATOR UPDATE ==========
  function updateSaveIndicator() {
    if (!saveIndicator) return;
    if (hideSaveIndicator) {
      saveIndicator.style.visibility = 'hidden';
      return;
    }
    saveIndicator.style.visibility = 'visible';
    var trans = (window.OROS_TRANSLATIONS && window.OROS_TRANSLATIONS[getCurrentLang()]) || {};
    if (!lastSavedTime) {
      saveIndicator.textContent = trans.text_not_saved || '—';
      return;
    }
    var diff = Math.floor((Date.now() - lastSavedTime) / 1000);
    if (diff < 60) {
      saveIndicator.textContent = trans.text_saved_just_now || 'Saved just now';
    } else if (diff < 3600) {
      var mins = Math.floor(diff / 60);
      saveIndicator.textContent = (trans.text_saved_minutes_ago || '{n}m ago').replace('{n}', mins);
    } else {
      var hours = Math.floor(diff / 3600);
      saveIndicator.textContent = (trans.text_saved_hours_ago || '{n}h ago').replace('{n}', hours);
    }
  }

  // ========== TOAST ==========
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

  // ========== CONTENT PERSISTENCE ==========
  function saveContent() {
    localStorage.setItem(STORAGE_KEY, richEditor.innerHTML);
    lastSavedTime = Date.now();
    localStorage.setItem(STORAGE_LAST_SAVED, lastSavedTime.toString());
    updateSaveIndicator();
  }

  function loadContent() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      richEditor.innerHTML = saved;
    }
    updateSaveIndicator();
  }

  if (richEditor) {
    richEditor.addEventListener('input', function() {
      saveContent();
      updateStats();
      if (outlinePanel && outlinePanel.style.display !== 'none') {
        clearTimeout(outlineDebounceTimer);
        outlineDebounceTimer = setTimeout(updateOutline, 300);
      }
      if (wordFreqPanel && wordFreqPanel.style.display !== 'none') {
        clearTimeout(wordFreqDebounce);
        wordFreqDebounce = setTimeout(updateWordFrequency, 800);
      }
    });
  }

  // ========== METADATA ==========
  var metadata = loadMetadata();

  function loadMetadata() {
    try { return JSON.parse(localStorage.getItem(STORAGE_METADATA)) || {}; }
    catch(e) { return {}; }
  }

  function saveMetadata(triggerSaveIndicator) {
    metadata.title = metaTitle ? metaTitle.value || '' : '';
    metadata.author = metaAuthor ? metaAuthor.value || '' : '';
    metadata.tags = metaTags ? metaTags.value || '' : '';
    metadata.category = metaCategory ? metaCategory.value || '' : '';
    if (!metadata.created) {
      metadata.created = new Date().toISOString();
    }
    metadata.modified = new Date().toISOString();
    localStorage.setItem(STORAGE_METADATA, JSON.stringify(metadata));
    renderMetaDates();
    if (triggerSaveIndicator) {
      lastSavedTime = Date.now();
      localStorage.setItem(STORAGE_LAST_SAVED, lastSavedTime.toString());
      updateSaveIndicator();
    }
  }

  function parseFrontmatter(content) {
    var fmRegex = /^---\n([\s\S]*?)\n---\n/;
    var match = content.match(fmRegex);
    if (!match) return null;
    var fmLines = match[1].split('\n');
    var parsed = {};
    for (var i = 0; i < fmLines.length; i++) {
      var line = fmLines[i].trim();
      if (!line) continue;
      var colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      var key = line.substring(0, colonIdx).trim();
      var value = line.substring(colonIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      if (key === 'tags' && value.startsWith('[') && value.endsWith(']')) {
        var tagStr = value.substring(1, value.length - 1);
        var tags = tagStr.split(',').map(function(t) {
          return t.trim().replace(/["']/g, '');
        }).filter(Boolean);
        value = tags.join(', ');
      }
      parsed[key] = value;
    }
    return parsed;
  }

  function importFrontmatter(content) {
    var parsed = parseFrontmatter(content);
    if (!parsed) return content;
    if (parsed.title && metaTitle) metaTitle.value = parsed.title;
    if (parsed.author && metaAuthor) metaAuthor.value = parsed.author;
    if (parsed.tags && metaTags) metaTags.value = parsed.tags;
    if (parsed.category && metaCategory) metaCategory.value = parsed.category;
    if (parsed.created) metadata.created = parsed.created;
    if (parsed.modified) metadata.modified = parsed.modified;
    metadata.title = parsed.title || '';
    metadata.author = parsed.author || '';
    metadata.tags = parsed.tags || '';
    metadata.category = parsed.category || '';
    localStorage.setItem(STORAGE_METADATA, JSON.stringify(metadata));
    renderMetaDates();
    var fmRegex = /^---\n[\s\S]*?\n---\n/;
    return content.replace(fmRegex, '');
  }

  function buildFrontmatter() {
    var fm = '---\n';
    if (metadata.title) fm += 'title: "' + metadata.title.replace(/"/g, '\\"') + '"\n';
    if (metadata.author) fm += 'author: "' + metadata.author.replace(/"/g, '\\"') + '"\n';
    if (metadata.tags) {
      var tagArr = metadata.tags.split(',').map(function(t) { return t.trim(); }).filter(Boolean);
      fm += 'tags: [' + tagArr.map(function(t) { return '"' + t + '"'; }).join(', ') + ']\n';
    }
    if (metadata.category) fm += 'category: "' + metadata.category.replace(/"/g, '\\"') + '"\n';
    if (metadata.created) fm += 'created: ' + metadata.created + '\n';
    if (metadata.modified) fm += 'modified: ' + metadata.modified + '\n';
    fm += '---\n\n';
    return fm;
  }

  function renderMetaDates() {
    var createdLabel = getTrans('meta_label_created');
    var modifiedLabel = getTrans('meta_label_modified');
    if (metaCreated) {
      if (metadata.created) {
        metaCreated.textContent = createdLabel + ' ' + formatDate(new Date(metadata.created));
      } else {
        metaCreated.textContent = createdLabel + ' —';
      }
    }
    if (metaModified) {
      if (metadata.modified) {
        metaModified.textContent = modifiedLabel + ' ' + formatDate(new Date(metadata.modified));
      } else {
        metaModified.textContent = modifiedLabel + ' —';
      }
    }
  }

  function formatDate(d) {
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear();
    var time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return day + '/' + month + '/' + year + ' ' + time;
  }

  function toggleMetadataPanel() {
    if (!metadataPanel) return;
    if (metadataPanel.style.display === 'none' || !metadataPanel.style.display) {
      metadataPanel.style.display = 'flex';
      metadataPanel.style.flexDirection = 'column';
      metadataPanel.style.top = getPanelTopOffset();
      if (metaTitle) metaTitle.value = metadata.title || '';
      if (metaAuthor) metaAuthor.value = metadata.author || '';
      if (metaTags) metaTags.value = metadata.tags || '';
      if (metaCategory) metaCategory.value = metadata.category || '';
      renderMetaDates();
    } else {
      saveMetadata(false);
      metadataPanel.style.display = 'none';
    }
  }

  function setupMetadataHandlers() {
    var inputs = [metaTitle, metaAuthor, metaTags, metaCategory];
    for (var i = 0; i < inputs.length; i++) {
      (function(input) {
        if (!input) return;
        input.addEventListener('blur', function() { saveMetadata(true); });
        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveMetadata(true);
            if (input === metaTitle && metaAuthor) metaAuthor.focus();
            else if (input === metaAuthor && metaCategory) metaCategory.focus();
            else if (input === metaCategory && metaTags) metaTags.focus();
            else if (input === metaTags && metaTitle) metaTitle.focus();
          }
        });
      })(inputs[i]);
    }
  }

  // ========== STATS ==========
  function updateStats() {
    if (!richEditor) return;
    var text = getTextContent();
    var chars = text.length;
    var charsNoSpaces = text.replace(/\s/g, '').length;
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    var sentences = text.split(/[.!?…]+(?:\s|$)/).filter(function(s) {
      return s.trim().length > 0;
    }).length;
    var readMin = Math.ceil(words / 225) || 0;
    var speakMin = Math.ceil(words / 140) || 0;

    if (statsDefaultEl) {
      var arrow = statsExpanded ? ' ▲' : ' ▼';
      statsDefaultEl.textContent = formatNumber(words) + ' ' + getTrans('text_words') +
        ' · ' + formatNumber(chars) + ' ' + getTrans('text_chars') + arrow;
    }

    if (statsDetailed) {
      var t = function(k) { return getTrans(k); };
      statsDetailed.innerHTML =
        '<div class="stat-row"><span>' + t('stats_chars_with_spaces') + '</span><span>' + chars.toLocaleString() + '</span></div>' +
        '<div class="stat-row"><span>' + t('stats_chars_no_spaces') + '</span><span>' + charsNoSpaces.toLocaleString() + '</span></div>' +
        '<div class="stat-row"><span>' + t('stats_sentences') + '</span><span>' + sentences + '</span></div>' +
        '<div class="stat-row"><span>' + t('stats_reading_time') + '</span><span>' + readMin + ' ' + t('stats_min') + '</span></div>' +
        '<div class="stat-row"><span>' + t('stats_speaking_time') + '</span><span>' + speakMin + ' ' + t('stats_min') + '</span></div>';
      statsDetailed.style.display = statsExpanded ? 'flex' : 'none';
    }

    if (statsDefaultEl) {
      statsDefaultEl.onclick = function(e) {
        e.stopPropagation();
        statsExpanded = !statsExpanded;
        updateStats();
      };
    }

    if (goalTarget) updateGoalProgress();
  }

  // ========== GOAL TRACKER ==========
  function getParagraphCount() {
    var text = richEditor.innerText.trim();
    if (!text) return 0;
    return text.split(/\n/).filter(function(l) { return l.trim(); }).length;
  }

  function getGoalCount() {
    var text = getTextContent();
    if (goalUnit === 'words') return text.trim().split(/\s+/).filter(Boolean).length;
    if (goalUnit === 'chars') return text.length;
    return getParagraphCount();
  }

  function getGoalUnitLabel() {
    if (goalUnit === 'words') return getTrans('text_words');
    if (goalUnit === 'chars') return getTrans('text_chars');
    return getTrans('text_paras');
  }

  function updateGoalProgress() {
    if (!goalTarget || !statsGoalEl || !statsDefaultEl) return;
    var count = getGoalCount();
    var pct = Math.min(100, Math.round((count / goalTarget) * 100));
    statsGoalEl.textContent = formatNumber(count) + ' / ' + formatNumber(goalTarget) +
      ' ' + getGoalUnitLabel() + ' · ' + pct + '%';
    if (count >= goalTarget && !goalReachedShown) {
      goalReachedShown = true;
      var msg = getTrans('text_goal_reached');
      if (goalLockEnabled) {
        msg += ' ' + getTrans('text_goal_locked');
        triggerGoalLock();
      }
      showToast(msg);
    } else if (count < goalTarget) {
      if (goalLockTriggered) {
        goalLockTriggered = false;
        richEditor.contentEditable = 'true';
      }
      goalReachedShown = false;
    }
  }

  function toggleGoalBar() {
    if (!goalBar) return;
    if (goalBar.style.display === 'flex') {
      goalBar.style.display = 'none';
    } else {
      goalBar.style.display = 'flex';
      if (goalTarget) goalTargetInput.value = goalTarget;
      goalUnitSelect.value = goalUnit;
      goalLockCheckbox.checked = goalLockEnabled;
      goalTargetInput.focus();
    }
  }

  function setGoal() {
    var target = parseInt(goalTargetInput.value);
    if (!target || target < 1) return;
    goalTarget = target;
    goalUnit = goalUnitSelect.value;
    goalLockEnabled = goalLockCheckbox.checked;
    goalReachedShown = false;
    goalLockTriggered = false;
    richEditor.contentEditable = 'true';
    localStorage.setItem(STORAGE_GOAL_TARGET, target.toString());
    localStorage.setItem(STORAGE_GOAL_UNIT, goalUnit);
    localStorage.setItem(STORAGE_GOAL_LOCK, goalLockEnabled ? 'true' : 'false');
    if (statsDefaultEl) statsDefaultEl.style.display = 'none';
    if (statsGoalEl) statsGoalEl.style.display = '';
    updateGoalProgress();
    goalBar.style.display = 'none';
    showToast(getTrans('text_goal_set') + ': ' + goalTarget + ' ' + getGoalUnitLabel());
  }

  function clearGoal() {
    goalTarget = null;
    goalUnit = 'words';
    goalLockEnabled = false;
    goalReachedShown = false;
    goalLockTriggered = false;
    richEditor.contentEditable = 'true';
    localStorage.removeItem(STORAGE_GOAL_TARGET);
    localStorage.removeItem(STORAGE_GOAL_UNIT);
    localStorage.removeItem(STORAGE_GOAL_LOCK);
    if (statsDefaultEl) statsDefaultEl.style.display = '';
    if (statsGoalEl) statsGoalEl.style.display = 'none';
    goalBar.style.display = 'none';
    goalTargetInput.value = '';
    goalLockCheckbox.checked = false;
    showToast(getTrans('text_goal_cleared'));
  }

  function triggerGoalLock() {
    if (!goalLockEnabled || goalLockTriggered) return;
    goalLockTriggered = true;
    richEditor.contentEditable = 'false';
  }

  function updateGoalUnitLabels() {
    if (!goalUnitSelect) return;
    var opts = goalUnitSelect.querySelectorAll('option');
    if (opts.length >= 3) {
      opts[0].textContent = getTrans('goal_unit_words');
      opts[1].textContent = getTrans('goal_unit_chars');
      opts[2].textContent = getTrans('goal_unit_paras');
    }
  }

  // ========== DOCUMENT OUTLINE ==========
  function toggleOutline() {
    if (!outlinePanel) return;
    if (outlinePanel.style.display === 'none' || !outlinePanel.style.display) {
      outlinePanel.style.display = 'flex';
      outlinePanel.style.flexDirection = 'column';
      outlinePanel.style.top = getPanelTopOffset();
      updateOutline();
    } else {
      outlinePanel.style.display = 'none';
    }
  }

  function updateOutline() {
    if (!outlineList || !outlinePanel || outlinePanel.style.display === 'none') return;
    var headings = richEditor.querySelectorAll('h1, h2, h3');
    if (headings.length === 0) {
      outlineList.innerHTML = '<div class="outline-empty">' + getTrans('outline_empty') + '</div>';
      return;
    }
    outlineList.innerHTML = '';
    for (var i = 0; i < headings.length; i++) {
      (function(h) {
        var item = document.createElement('div');
        item.className = 'outline-item outline-item-' + h.tagName.toLowerCase();
        item.textContent = h.textContent || '(empty)';
        item.onclick = function() {
          h.scrollIntoView({ behavior: 'smooth', block: 'center' });
          h.classList.add('outline-flash');
          setTimeout(function() { h.classList.remove('outline-flash'); }, 1200);
          richEditor.focus();
        };
        outlineList.appendChild(item);
      })(headings[i]);
    }
  }

  // ========== READING PROGRESS ==========
  function updateReadingProgress() {
    if (!progressBar) return;
    if (readingProgressEnabled) {
      progressBar.style.display = '';
      var max = richEditor.scrollHeight - richEditor.clientHeight;
      if (max <= 0) { progressBar.style.width = '0%'; return; }
      var pct = (richEditor.scrollTop / max) * 100;
      progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    } else {
      progressBar.style.display = 'none';
    }
  }
  if (richEditor) {
    richEditor.addEventListener('scroll', updateReadingProgress, { passive: true });
  }
  window.addEventListener('oros-reading-progress-changed', function(e) {
    readingProgressEnabled = e.detail.enabled;
    updateReadingProgress();
  });

  // ========== SMART TYPOGRAPHY ==========
  var isReplacing = false;
  function handleSmartTypography() {
    if (!smartTypographyEnabled || isReplacing || goalLockTriggered) return;
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    if (!range.collapsed) return;
    if (!richEditor.contains(range.endContainer)) return;
    var preRange = range.cloneRange();
    preRange.selectNodeContents(richEditor);
    preRange.setEnd(range.endContainer, range.endOffset);
    var before = preRange.toString();
    if (!before) return;
    var deleteLen = 0;
    var insert = '';
    var last4 = before.slice(-4);
    var last3 = before.slice(-3);
    var last2 = before.slice(-2);
    var last1 = before.slice(-1);
    if (last4 === '(tm)') { deleteLen = 4; insert = '\u2122'; }
    else if (last3 === '(c)') { deleteLen = 3; insert = '\u00A9'; }
    else if (last3 === '(r)') { deleteLen = 3; insert = '\u00AE'; }
    else if (last3 === '...') { deleteLen = 3; insert = '\u2026'; }
    else if (last2 === '--') { deleteLen = 2; insert = '\u2014'; }
    else if (last1 === '"') {
      var pc = before.length > 1 ? before[before.length - 2] : ' ';
      insert = /\w/.test(pc) ? '\u201D' : '\u201C';
      deleteLen = 1;
    }
    else if (last1 === "'") {
      var pc2 = before.length > 1 ? before[before.length - 2] : ' ';
      insert = /\w/.test(pc2) ? '\u2019' : '\u2018';
      deleteLen = 1;
    }
    else return;
    isReplacing = true;
    for (var i = 0; i < deleteLen; i++) { document.execCommand('delete', false); }
    document.execCommand('insertText', false, insert);
    isReplacing = false;
  }
  window.addEventListener('oros-smart-typography-changed', function(e) { smartTypographyEnabled = e.detail.enabled; });

  // ========== SMART PASTE ==========
  function handleSmartPaste(e) {
    e.preventDefault();
    var clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;
    var html = clipboardData.getData('text/html');
    var text = clipboardData.getData('text/plain');
    if (html) {
      var temp = document.createElement('div');
      temp.innerHTML = html;
      var allowed = ['P','H1','H2','H3','H4','H5','H6','UL','OL','LI','STRONG','EM','B','I','U','A','CODE','PRE','BLOCKQUOTE','BR','SPAN'];
      var all = temp.querySelectorAll('*');
      for (var i = all.length - 1; i >= 0; i--) {
        var el = all[i];
        if (allowed.indexOf(el.tagName) === -1) {
          var txt = document.createTextNode(el.textContent + ' ');
          el.parentNode.replaceChild(txt, el);
        } else {
          while (el.attributes.length > 0) {
            var attr = el.attributes[0];
            if (!(el.tagName === 'A' && attr.name === 'href')) {
              el.removeAttribute(attr.name);
            }
          }
        }
      }
      document.execCommand('insertHTML', false, temp.innerHTML);
    } else if (text) {
      document.execCommand('insertText', false, text);
    }
    saveContent();
    updateStats();
  }

  // ========== WORD FREQUENCY ==========
  function toggleWordFreqPanel() {
    if (!wordFreqPanel) return;
    if (wordFreqPanel.style.display === 'none' || !wordFreqPanel.style.display) {
      wordFreqPanel.style.display = 'flex';
      wordFreqPanel.style.flexDirection = 'column';
      wordFreqPanel.style.top = getPanelTopOffset();
      updateWordFrequency();
    } else {
      wordFreqPanel.style.display = 'none';
    }
  }

  function updateWordFrequency() {
    if (!wordFreqList || !wordFreqPanel || wordFreqPanel.style.display === 'none' || !richEditor) return;
    var text = getTextContent().toLowerCase().replace(/[^\w\s\u0370-\u03FF]/g, '').trim();
    if (!text) {
      wordFreqList.innerHTML = '<div class="wordfreq-empty">' + getTrans('word_freq_empty') + '</div>';
      if (wordFreqSummary) wordFreqSummary.innerHTML = '';
      return;
    }
    var words = text.split(/\s+/).filter(Boolean);
    var total = words.length;
    var freq_map = {};
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      freq_map[w] = (freq_map[w] || 0) + 1;
    }
    var unique = Object.keys(freq_map).length;
    var diversity = total > 0 ? (unique / total * 100).toFixed(1) : 0;
    var sorted = Object.keys(freq_map).sort(function(a,b) {
      return freq_map[b] - freq_map[a];
    }).slice(0, 20);
    var maxFreq = sorted.length > 0 ? freq_map[sorted[0]] : 1;

    if (wordFreqSummary) {
      wordFreqSummary.innerHTML =
        '<div class="stat-row"><span>' + getTrans('word_freq_unique') + '</span><span>' + unique + '</span></div>' +
        '<div class="stat-row"><span>' + getTrans('word_freq_total') + '</span><span>' + total + '</span></div>' +
        '<div class="stat-row"><span>' + getTrans('word_freq_diversity') + '</span><span>' + diversity + '%</span></div>';
    }

    var listHtml = '';
    for (var j = 0; j < sorted.length; j++) {
      var word = sorted[j];
      var count = freq_map[word];
      var pct = (count / maxFreq * 100).toFixed(0);
      var isOverused = count >= 5 && (count / total * 100) > 2;
      listHtml += '<div class="wordfreq-item' + (isOverused ? ' overused' : '') + '">' +
        '<span class="wf-word">' + word + '</span>' +
        '<div class="wordfreq-bar"><div class="wordfreq-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="wordfreq-count">' + count + '</span>' +
      '</div>';
    }
    wordFreqList.innerHTML = listHtml;
  }

  // ========== FOCUS MODE (highlights current paragraph) ==========
  var focusDebounceTimer = null;

  function initFocusMode() {
    if (!richEditor) return;
    if (focusModeEnabled) {
      document.addEventListener('selectionchange', handleSelectionChange);
      richEditor.addEventListener('scroll', function() {
        if (document.getElementById('focus-spotlight')) clearFocusMode();
      });
    }
  }

  function handleSelectionChange() {
    if (!focusModeEnabled) {
      clearFocusMode();
      return;
    }
    clearTimeout(focusDebounceTimer);
    focusDebounceTimer = setTimeout(function() {
      var selection = window.getSelection();
      if (!selection.rangeCount) { clearFocusMode(); return; }
      var range = selection.getRangeAt(0);
      if (!richEditor.contains(range.commonAncestorContainer)) { clearFocusMode(); return; }

      var node = range.startContainer;
      // Try to find a text node or paragraph
      if (node.nodeType === 3) node = node.parentNode;
      if (node === richEditor) { clearFocusMode(); return; }
      if (!node || !richEditor.contains(node)) { clearFocusMode(); return; }

      clearFocusMode();
      var rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) { clearFocusMode(); return; }
      
      var wrapperRect = richWrapper.getBoundingClientRect();
      var spotlight = document.createElement('div');
      spotlight.id = 'focus-spotlight';
      spotlight.className = 'focus-spotlight';
      spotlight.style.top = (rect.top - wrapperRect.top) + 'px';
      spotlight.style.left = (rect.left - wrapperRect.left) + 'px';
      spotlight.style.width = rect.width + 'px';
      spotlight.style.height = rect.height + 'px';
      richWrapper.appendChild(spotlight);
    }, 150);
  }

  function clearFocusMode() {
    var spotlight = document.getElementById('focus-spotlight');
    if (spotlight) spotlight.remove();
  }

  window.addEventListener('oros-focus-mode-changed', function(e) {
    focusModeEnabled = e.detail.enabled;
    if (focusModeEnabled) {
      initFocusMode();
    } else {
      clearFocusMode();
    }
  });

  // ========== CONTEXT MENU ==========
  var contextMenu = null;

  function showContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (contextMenu) {
      contextMenu.remove();
      contextMenu = null;
    }

    var menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = '' +
      '<div class="cm-item" data-cmd="bold"><i class="fa fa-bold cm-icon"></i>Bold</div>' +
      '<div class="cm-item" data-cmd="italic"><i class="fa fa-italic cm-icon"></i>Italic</div>' +
      '<div class="cm-item" data-cmd="underline"><i class="fa fa-underline cm-icon"></i>Underline</div>' +
      '<div class="cm-divider"></div>' +
      '<div class="cm-item" data-cmd="strikeThrough"><i class="fa fa-strikethrough cm-icon"></i>Strike</div>' +
      '<div class="cm-item" data-cmd="formatBlock;H1"><i class="fa fa-header cm-icon"></i>H1</div>' +
      '<div class="cm-item" data-cmd="formatBlock;H2"><i class="fa fa-header cm-icon"></i>H2</div>' +
      '<div class="cm-item" data-cmd="formatBlock;H3"><i class="fa fa-header cm-icon"></i>H3</div>' +
      '<div class="cm-divider"></div>' +
      '<div class="cm-item" data-cmd="justifyLeft"><i class="fa fa-align-left cm-icon"></i>Align Left</div>' +
      '<div class="cm-item" data-cmd="justifyCenter"><i class="fa fa-align-center cm-icon"></i>Align Center</div>' +
      '<div class="cm-item" data-cmd="justifyRight"><i class="fa fa-align-right cm-icon"></i>Align Right</div>' +
      '<div class="cm-item" data-cmd="justifyFull"><i class="fa fa-align-justify cm-icon"></i>Justify</div>' +
      '<div class="cm-divider"></div>' +
      '<div class="cm-item" data-cmd="insertUnorderedList"><i class="fa fa-bars cm-icon"></i>Bullets</div>' +
      '<div class="cm-item" data-cmd="insertOrderedList"><i class="fa fa-list-ol cm-icon"></i>Numbers</div>' +
      '<div class="cm-divider"></div>' +
      '<div class="cm-item" data-cmd="undo"><i class="fa fa-undo cm-icon"></i>Undo</div>' +
      '<div class="cm-item" data-cmd="redo"><i class="fa fa-repeat cm-icon"></i>Redo</div>';

    menu.style.position = 'fixed';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';

    menu.addEventListener('click', function(ev) { ev.stopPropagation(); });
    menu.addEventListener('contextmenu', function(ev) { ev.preventDefault(); ev.stopPropagation(); });
    menu.addEventListener('mousedown', function(ev) { ev.stopPropagation(); });

    var items = menu.querySelectorAll('.cm-item');
    for (var i = 0; i < items.length; i++) {
      (function(item) {
        item.onclick = function(ev) {
          ev.stopPropagation();
          var cmdData = item.getAttribute('data-cmd');
          var parts = cmdData.split(';');
          var cmd = parts[0];
          var val = parts[1] || null;
          document.execCommand(cmd, false, val);
          if (contextMenu) { contextMenu.remove(); contextMenu = null; }
          removeCloseListeners();
          richEditor.focus();
          saveContent();
          updateStats();
        };
      })(items[i]);
    }

    document.body.appendChild(menu);
    contextMenu = menu;

    setTimeout(function() {
      document.addEventListener('mousedown', closeOnOutsideClick);
      document.addEventListener('keydown', closeOnKeydown);
    }, 0);
  }

  function closeOnOutsideClick(ev) {
    if (contextMenu && !contextMenu.contains(ev.target)) {
      contextMenu.remove();
      contextMenu = null;
      removeCloseListeners();
    }
  }

  function closeOnKeydown(ev) {
    if (contextMenu) {
      contextMenu.remove();
      contextMenu = null;
      removeCloseListeners();
    }
  }

  function removeCloseListeners() {
    document.removeEventListener('mousedown', closeOnOutsideClick);
    document.removeEventListener('keydown', closeOnKeydown);
  }

  // ========== MAIN TOOLBAR FORMATTING BUTTONS ==========
  function setupMainToolbarButtons() {
    if (!richEditor) return;
    var fmtBtns = document.querySelectorAll('.main-toolbar .fmt-text-btn, .main-toolbar .action-btn[data-cmd]');
    for (var i = 0; i < fmtBtns.length; i++) {
      (function(btn) {
        if (!btn.getAttribute('data-cmd')) return;
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          var cmd = btn.getAttribute('data-cmd');
          var block = btn.getAttribute('data-block');
          if (block) {
            document.execCommand('formatBlock', false, block);
          } else {
            document.execCommand(cmd, false);
          }
          saveContent();
          updateStats();
          richEditor.focus();
        });
      })(fmtBtns[i]);
    }
  }

  // ========== FILE OPEN ==========
  function openFile(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var content = e.target.result;
      if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        content = importFrontmatter(content);
      }
      richEditor.innerHTML = content;
      saveContent();
      updateStats();
      showToast(getTrans('toast_opened'));
    };
    reader.onerror = function() { showToast('Error reading file'); };
    reader.readAsText(file);
  }

  // ========== EXPORT ==========
  function downloadFile(format) {
    var content = richEditor.innerHTML;
    var textContent = richEditor.innerText;
    var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    var filenamePrefix = timestamp;
    var ext = '';
    var mime = 'text/plain;charset=utf-8';
    var data = '';

    switch (format) {
      case 'md':
        var hasMetadata = metadata.title || metadata.author || metadata.tags || metadata.category;
        data = hasMetadata ? buildFrontmatter() : '';
        data += convertHTMLtoMarkdown(content);
        ext = '.md';
        mime = 'text/markdown;charset=utf-8';
        break;
      case 'txt':
        data = textContent;
        ext = '.txt';
        break;
      case 'rtf':
        data = convertToRTF(textContent);
        ext = '.rtf';
        mime = 'application/rtf;charset=utf-8';
        break;
      case 'pdf':
        window.print();
        return;
      case 'doc':
        data = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>' + content + '</body></html>';
        ext = '.doc';
        mime = 'application/msword;charset=utf-8';
        break;
    }

    var blob = new Blob([data], { type: mime });
    triggerDownload(blob, filenamePrefix + ext);
    showToast(getTrans('toast_downloaded'));
  }

  function convertHTMLtoMarkdown(html) {
    var temp = document.createElement('div');
    temp.innerHTML = html;
    return htmlToMd(temp);
  }

  function htmlToMd(node) {
    var md = '';
    var children = node.childNodes;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.nodeType === 3) {
        md += child.textContent;
      } else if (child.nodeType === 1) {
        var tag = child.tagName.toLowerCase();
        switch (tag) {
          case 'h1': md += '\n# ' + child.textContent + '\n\n'; break;
          case 'h2': md += '\n## ' + child.textContent + '\n\n'; break;
          case 'h3': md += '\n### ' + child.textContent + '\n\n'; break;
          case 'h4': md += '\n#### ' + child.textContent + '\n\n'; break;
          case 'h5': md += '\n##### ' + child.textContent + '\n\n'; break;
          case 'h6': md += '\n###### ' + child.textContent + '\n\n'; break;
          case 'p': md += '\n' + htmlToMd(child) + '\n\n'; break;
          case 'br': md += '\n'; break;
          case 'strong': case 'b': md += '**' + htmlToMd(child) + '**'; break;
          case 'em': case 'i': md += '*' + htmlToMd(child) + '*'; break;
          case 'u': md += '__' + htmlToMd(child) + '__'; break;
          case 'code': md += '`' + child.textContent + '`'; break;
          case 'pre': md += '\n```\n' + child.textContent + '\n```\n\n'; break;
          case 'blockquote': md += '\n> ' + htmlToMd(child).replace(/\n/g, '\n> ') + '\n\n'; break;
          case 'ul':
            var ulItems = child.querySelectorAll(':scope > li');
            for (var j = 0; j < ulItems.length; j++) { md += '- ' + htmlToMd(ulItems[j]).trim() + '\n'; }
            md += '\n';
            break;
          case 'ol':
            var olItems = child.querySelectorAll(':scope > li');
            for (var k = 0; k < olItems.length; k++) { md += (k + 1) + '. ' + htmlToMd(olItems[k]).trim() + '\n'; }
            md += '\n';
            break;
          case 'li': md += htmlToMd(child); break;
          case 'a': md += '[' + child.textContent + '](' + child.getAttribute('href') + ')'; break;
          case 'span': md += child.textContent; break;
          case 'div': md += htmlToMd(child) + '\n'; break;
          default: md += child.textContent || ''; break;
        }
      }
    }
    return md;
  }

  function convertToRTF(text) {
    var escaped = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/{/g, '\\{').replace(/}/g, '\\}');
    return "{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033{\\fonttbl{\\f0\\fnil\\fcharset0 Nunito;}}\\f0\\fs24 " + escaped + "}";
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ========== FIND & REPLACE ==========
  function toggleFindBar() {
    if (!findBar || !findInput) return;
    if (findBar.style.display === 'flex') {
      findBar.style.display = 'none';
      if (findInput) findInput.value = '';
      if (replaceInput) replaceInput.value = '';
      currentMatchIndex = -1;
      matchRanges = [];
    } else {
      findBar.style.display = 'flex';
      if (findInput) findInput.focus();
      highlightMatches();
    }
  }

  function highlightMatches() {
    if (!findInput || !richEditor) return;
    var searchTerm = findInput.value.toLowerCase();
    if (!searchTerm) {
      if (frResults) frResults.textContent = getTrans('fr_no_matches');
      return;
    }
    var content = richEditor.innerText.toLowerCase();
    var matches = 0;
    var idx = content.indexOf(searchTerm);
    while (idx !== -1) {
      matches++;
      idx = content.indexOf(searchTerm, idx + 1);
    }
    if (frResults) {
      frResults.textContent = matches > 0
        ? matches + ' ' + getTrans('fr_results_matches')
        : getTrans('fr_no_matches');
    }
  }

  function doReplace(isAll) {
    if (!findInput || !replaceInput || !richEditor) return;
    var searchTerm = findInput.value;
    var replaceTerm = replaceInput.value;
    if (!searchTerm) return;
    var content = richEditor.innerHTML;
    var escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp(escaped, 'gi');
    richEditor.innerHTML = content.replace(regex, replaceTerm);
    saveContent();
    updateStats();
    showToast(getTrans('text_saved'));
  }

  // ========== KEYBOARD SHORTCUTS ==========
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveContent();
      saveMetadata(true);
      showToast(getTrans('text_saved'));
    }
    else if (e.ctrlKey && e.key === 'g') {
      e.preventDefault();
      toggleGoalBar();
    }
    else if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      toggleFindBar();
    }
    else if (e.key === 'Escape') {
      if (metadataPanel && metadataPanel.style.display !== 'none') {
        saveMetadata(false);
        metadataPanel.style.display = 'none';
      }
      if (outlinePanel && outlinePanel.style.display !== 'none') {
        outlinePanel.style.display = 'none';
      }
      if (wordFreqPanel && wordFreqPanel.style.display !== 'none') {
        wordFreqPanel.style.display = 'none';
      }
      if (findBar && findBar.style.display === 'flex') {
        findBar.style.display = 'none';
      }
      if (goalBar && goalBar.style.display === 'flex') {
        goalBar.style.display = 'none';
      }
      if (statsExpanded) {
        statsExpanded = false;
        updateStats();
      }
      if (contextMenu) {
        contextMenu.remove();
        contextMenu = null;
        removeCloseListeners();
      }
    }
  });

  // ========== VISIBILITY INIT ==========
  if (hideStats && statsOverlay) statsOverlay.style.display = 'none';
  if (toolbarCenter) toolbarCenter.style.display = quickTbarShow ? 'flex' : 'none';
  if (!readingProgressEnabled && progressBar) progressBar.style.display = 'none';
  if (hideGoalBtn && btnGoal) btnGoal.style.display = 'none';
  if (hideOutlineBtn && btnOutline) btnOutline.style.display = 'none';
  if (hideMetadataBtn && btnMetadata) btnMetadata.style.display = 'none';
  if (hideFindBtn && btnFind) btnFind.style.display = 'none';
  if (hideWordFreqBtn && btnWordFreq) btnWordFreq.style.display = 'none';
  if (hideSaveIndicator && saveIndicator) saveIndicator.style.visibility = 'hidden';
  if (hideLoremBtn && btnLorem) btnLorem.style.display = 'none';

  // ========== CUSTOM EVENTS ==========
  window.addEventListener('oros-hide-stats-changed', function(e) {
    hideStats = e.detail.hidden;
    if (statsOverlay) statsOverlay.style.display = hideStats ? 'none' : '';
  });
  window.addEventListener('oros-hide-goal-btn-changed', function(e) {
    hideGoalBtn = e.detail.hidden;
    if (btnGoal) btnGoal.style.display = hideGoalBtn ? 'none' : '';
  });
  window.addEventListener('oros-hide-outline-btn-changed', function(e) {
    hideOutlineBtn = e.detail.hidden;
    if (btnOutline) btnOutline.style.display = hideOutlineBtn ? 'none' : '';
  });
  window.addEventListener('oros-hide-metadata-btn-changed', function(e) {
    hideMetadataBtn = e.detail.hidden;
    if (btnMetadata) btnMetadata.style.display = hideMetadataBtn ? 'none' : '';
  });
  window.addEventListener('oros-hide-find-btn-changed', function(e) {
    hideFindBtn = e.detail.hidden;
    if (btnFind) btnFind.style.display = hideFindBtn ? 'none' : '';
  });
  window.addEventListener('oros-hide-wordfreq-btn-changed', function(e) {
    hideWordFreqBtn = e.detail.hidden;
    if (btnWordFreq) btnWordFreq.style.display = hideWordFreqBtn ? 'none' : '';
  });
  window.addEventListener('oros-hide-save-indicator-changed', function(e) {
    hideSaveIndicator = e.detail.hidden;
    updateSaveIndicator();
  });
  window.addEventListener('oros-quick-tbar-changed', function(e) {
    quickTbarShow = e.detail.show;
    if (toolbarCenter) toolbarCenter.style.display = quickTbarShow ? 'flex' : 'none';
  });
  window.addEventListener('oros-hide-lorem-btn-changed', function(e) {
    hideLoremBtn = e.detail.hidden;
    if (btnLorem) btnLorem.style.display = hideLoremBtn ? 'none' : '';
  });
  window.addEventListener('oros-language-changed', function(e) {
    updateStats();
    renderMetaDates();
    updateGoalUnitLabels();
    updateSaveIndicator();
  });

  // ========== EVENT LISTENERS ==========
  if (btnSave) btnSave.addEventListener('click', function() {
    saveContent();
    saveMetadata(true);
    showToast(getTrans('text_saved'));
  });

  if (btnMetadata) btnMetadata.addEventListener('click', toggleMetadataPanel);
  if (btnCloseMetadata) btnCloseMetadata.addEventListener('click', function() {
    saveMetadata(false);
    metadataPanel.style.display = 'none';
  });

  if (btnOutline) btnOutline.addEventListener('click', toggleOutline);
  if (btnCloseOutline) btnCloseOutline.addEventListener('click', function() {
    outlinePanel.style.display = 'none';
  });

  if (btnWordFreq) btnWordFreq.addEventListener('click', toggleWordFreqPanel);
  if (btnCloseWordFreq) btnCloseWordFreq.addEventListener('click', function() {
    wordFreqPanel.style.display = 'none';
  });

  if (btnGoal) btnGoal.addEventListener('click', toggleGoalBar);
  if (btnSetGoal) btnSetGoal.addEventListener('click', setGoal);
  if (btnClearGoal) btnClearGoal.addEventListener('click', clearGoal);
  if (btnCloseGoal) btnCloseGoal.addEventListener('click', function() {
    goalBar.style.display = 'none';
  });

  if (btnFind) btnFind.addEventListener('click', toggleFindBar);
  if (findBar) {
    if (findInput) findInput.addEventListener('input', highlightMatches);
    var btnFrReplace = document.getElementById('btn-fr-replace');
    var btnFrReplaceAll = document.getElementById('btn-fr-replace-all');
    if (btnFrReplace) btnFrReplace.addEventListener('click', function() { doReplace(false); });
    if (btnFrReplaceAll) btnFrReplaceAll.addEventListener('click', function() { doReplace(true); });
    if (btnCloseFR) btnCloseFR.addEventListener('click', function() {
      findBar.style.display = 'none';
      if (findInput) findInput.value = '';
      if (replaceInput) replaceInput.value = '';
      currentMatchIndex = -1;
      matchRanges = [];
    });
  }

  if (btnOpen) btnOpen.addEventListener('click', function() {
    if (fileInput) fileInput.click();
  });
  if (fileInput) fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
      openFile(this.files[0]);
      this.value = '';
    }
  });

  if (btnClear) btnClear.addEventListener('click', function() {
    var msg = getCurrentLang() === 'el'
      ? 'Σίγουρα; Όλο το περιεχόμενο θα χαθεί.'
      : 'Are you sure? All content will be lost.';
    if (confirm(msg)) {
      richEditor.innerHTML = '';
      saveContent();
      updateStats();
      showToast(getTrans('toast_cleared'));
    }
  });

  if (btnLorem) btnLorem.addEventListener('click', insertLoremIpsum);

  if (btnExport) {
    btnExport.addEventListener('click', function(e) {
      e.stopPropagation();
      if (exportDropdown) exportDropdown.classList.toggle('visible');
    });
  }
  document.addEventListener('click', function() {
    if (exportDropdown) exportDropdown.classList.remove('visible');
  });
  if (exportDropdown) {
    var expBtns = exportDropdown.querySelectorAll('button');
    for (var j = 0; j < expBtns.length; j++) {
      (function(btn) {
        btn.addEventListener('click', function() {
          var fmt = btn.getAttribute('data-format');
          downloadFile(fmt);
        });
      })(expBtns[j]);
    }
  }

  if (richEditor) {
    richEditor.addEventListener('click', function(e) {
      if (contextMenu) {
        contextMenu.remove();
        contextMenu = null;
        removeCloseListeners();
      }
    });
    richEditor.addEventListener('contextmenu', function(e) {
      if (e.altKey) {
        showContextMenu(e);
      }
    });
    richEditor.addEventListener('keyup', function() {
      handleSmartTypography();
      playTypewriterSound();
    });
    richEditor.addEventListener('paste', handleSmartPaste);
  }

  // ========== SAVE INDICATOR LIVE TICK ==========
  setInterval(updateSaveIndicator, 30000);

  // ========== INITIALIZE ==========
  initTypewriterSound();
  setupMainToolbarButtons();
  loadContent();
  loadMetadata();
  renderMetaDates();
  setupMetadataHandlers();
  initFocusMode();
  updateStats();
  updateGoalUnitLabels();
  updateReadingProgress();
  
  console.log('[FOCUS DEBUG] focusModeEnabled:', focusModeEnabled);
console.log('[FOCUS DEBUG] richEditor exists:', !!richEditor);

})();