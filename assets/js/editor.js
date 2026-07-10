// ============================================
// orOS Writer — Unified Rich Text Editor
// v0.6-BETA — ALL CORRECTIONS APPLIED
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
  var focusDebounceTimer = null;
  var currentSpotlight = null;
  var contextMenu = null;

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

  // FIXED: Panel offset calculation includes BOTH goal bar AND find bar
  function getPanelTopOffset() {
    var offset = 0;
    var headerInner = document.querySelector('.header');
    if (headerInner) offset += headerInner.offsetHeight;
    else offset += 56;
    var toolbar = document.getElementById('main-toolbar');
    if (toolbar) offset += toolbar.offsetHeight;
    // Include BOTH bars independently
    if (goalBar && goalBar.style.display === 'flex') offset += goalBar.offsetHeight;
    if (findBar && findBar.style.display === 'flex') offset += findBar.offsetHeight;
    return offset + 'px';
  }
  
    // CORRECTED: Extended Lorem Ipsum with 2-3 extra paragraphs in each language
  function generateLoremIpsum() {
    var lang = getCurrentLang();
    
    if (lang === 'el') {
      return '<h1>Τίτλος Εγγράφου</h1>' +
          '<p>Καλώς ήρθεις στο <strong>orOS Writer</strong>, έναν επεξεργαστή κειμένου που σέβεται το απόρρητό σου και λειτουργεί πλήρως offline.</p>' +
          '<p>Αυτό το δοκιμαστικό κείμενο επιδεικνύει διάφορες επιλογές μορφοποίησης του editor, συμπεριλαμβανομένων έντονου, πλάγιου, υπογραμμισμένου κειμένου, τίτλων (H1, H2, H3), λιστών με κουκκίδες και αριθμημένων λιστών.</p>' +
          '<p>Με το orOS Writer μπορείς να γράψεις άνετα χωρίς φόβο απώλειας δεδομένων, καθώς η αυτόματη αποθήκευση ενεργοποιείται μετά από κάθε πληκτρολόγηση. Όλο το περιεχόμενο αποθηκεύεται τοπικά στον browser σου, χωρίς server, χωρίς tracking, χωρίς λογαριασμό.</p>' +
          '<p>Ο editor διαθέτει Έξυπνη Τυπογραφία για αυτόματες μετατροπές συμβόλων κατά τη διάρκεια της πληκτρολόγησης, καθώς και έξυπνη επικόλληση που διατηρεί μόνο τις βασικές μορφοποιήσεις.</p>' +
          '<ul><li>Μορφοποίηση: έντονα, πλάγια, υπογράμμιση, διέγραψε</li>' +
          '<li>Τίτλοι (H1, H2, H3) για δομή εγγράφου</li>' +
          '<li>Λίστες με κουκκίδες και αριθμημένες λίστες</li>' +
          '<li>Εναρμόνιση κειμένου (αριστερά, κέντρο, δεξιά, justify)</li>' +
          '<li>Παράθεση για σημαντικές παραγράφους</li></ul>' +
          '<h2>Λειτουργίες & Εργαλεία</h2>' +
          '<p>Ο orOS Writer περιλαμβάνει ένα ευρύ φάσμα εργαλείων σχεδιασμένα για συγγραφείς, δημοσιογράφους, bloggers και καλλιτέχνες.</p>' +
          '<ol><li>Αυτόματη αποθήκευση μετά από κάθε πληκτρολόγηση</li>' +
          '<li>Εξαγωγή σε Markdown, Κείμενο, RTF, Word ή PDF</li>' +
          '<li>Πάνελ δομής εγγράφου για πλοήγηση μεταξύ τίτλων</li>' +
          '<li>Ανάλυση συχνότητας λέξεων για εντοπισμό επαναλήψεων</li>' +
          '<li>Μεταδεδομένα εγγράφου για τίτλο, συγγραφέα, tags, κατηγορία</li>' +
          '<li>Στόχοι γραφής με προαιρετικό κλείδωμα κατά επίτευξη</li>' +
          '<li>Λειτουργία εύρεσης και αντικατάστασης</li>' +
          '<li>Μπάρα προόδου ανάγνωσης και λεπτομερή στατιστικά</li></ol>' +
          '<h2>Δοκίμασε Τώρα</h2>' +
          '<p>Αυτό το κείμενο είναι αρκετά μεγάλο ώστε να επιδεικνύει τη μπάρα προόδου ανάγνωσης στην κορυφή, ειδικά σε μεγάλες οθόνες όπου μπορείς να scrollάρεις.</p>' +
          '<p>Χρησιμοποίησε το μενού εξαγωγής για να κατεβάσεις το έργο σου σε διάφορες μορφές, ή ξεκίνα με καθαρό έλεγχο πατώντας το κουμπί καθαρισμού.</p>' +
          '<p>Το orOS Writer είναι ανοικτού κώδικα, φτιαγμένο με σεβασμό στα προσωπικά σου δεδομένα. Δεν υπάρχουν διαφημίσεις, δεν υπάρχει telemetria, δεν απαιτείται εγγραφή.</p>' +
          '<p>Μπορείς να το εγκαταστήσεις ως Progressive Web App (PWA) για καλύτερη ενσωμάτωση με τη συσκευή σου.</p>' +
          '<blockquote>«Η γραφή είναι εύκολη. Αρκεί να κοιτάς αδιάκοπα μια λευκή σελίδα μέχρι να εμφανιστούν σταγόνες αίματος στο μέτωπό σου.» — Gene Fowler</blockquote>' +
          '<p>Αυτή είναι η τελευταία παράγραφος του δοκιμαστικού κειμένου. Μπορείς να το διαγράψεις οποιαδήποτε στιγμή ή να αρχίσεις να γράφεις το δικό σου περιεχόμενο αμέσως.</p>';
    }
    
    if (lang === 'es') {
      return '<h1>Título del Documento</h1>' +
          '<p>Bienvenido a <strong>orOS Writer</strong>, un editor que respeta tu privacidad y funciona completamente offline.</p>' +
          '<p>Este texto demuestra varias opciones de formato en el editor, incluyendo negrita, cursiva, subrayado, títulos (H1, H2, H3), listas con viñetas y numeradas.</p>' +
          '<p>Con orOS Writer puedes escribir sin miedo de pérdida de datos, ya que el guardado automático se activa después de cada tecleo. Todo el contenido se almacena localmente en tu navegador, sin servidor, sin tracking, sin cuenta.</p>' +
          '<p>El editor incluye Tipografía Inteligente para conversión automática de símbolos mientras escribes, así como pegado inteligente que preserva solo formateo esencial.</p>' +
          '<ul><li>Formateo: negrita, cursiva, subrayado, tachado</li>' +
          '<li>Títulos (H1, H2, H3) para estructura del documento</li>' +
          '<li>Listas con viñetas y listas numeradas</li>' +
          '<li>Alineación de texto (izquierda, centro, derecha, justificado)</li>' +
          '<li>Citas para pasajes importantes</li></ul>' +
          '<h2>Características & Herramientas</h2>' +
          '<p>orOS Writer incluye una amplia gama de herramientas diseñadas para escritores, periodistas, bloggers y artistas.</p>' +
          '<ol><li>Guardado automático después de cada tecleo</li>' +
          '<li>Exportar a Markdown, Texto Plano, RTF, Word o PDF</li>' +
          '<li>Panel de esquema del documento para navegar entre títulos</li>' +
          '<li>Análisis de frecuencia de palabras para detectar repeticiones</li>' +
          '<li>Metadatos del documento para título, autor, etiquetas, categoría</li>' +
          '<li>Objetivos de escritura con bloqueo opcional al alcanzar objetivo</li>' +
          '<li>Funcionalidad Buscar y Reemplazar</li>' +
          '<li>Barra de progreso de lectura y estadísticas detalladas</li></ol>' +
          '<h2>Pruébalo Ahora</h2>' +
          '<p>Este texto es lo suficientemente grande para demostrar la barra de progreso de lectura en la parte superior, especialmente en pantallas grandes donde puedes hacer scroll.</p>' +
          '<p>Usa el menú de exportación para descargar tu trabajo en varios formatos, o comienza fresco presionando el botón borrar.</p>' +
          '<p>orOS Writer es código abierto, construido con respeto por tus datos personales. No hay anuncios, no hay telemetría, no se requiere cuenta.</p>' +
          '<p>Puedes instalarlo como Progressive Web App (PWA) para mejor integración con tu dispositivo.</p>' +
          '<blockquote>"Escribir es fácil. Solo mira fijamente una hoja en blanco hasta que gotas de sangre se formen en tu frente." — Gene Fowler</blockquote>' +
          '<p>Este es el último párrafo del contenido de muestra. Puedes eliminarlo cualquier momento o comenzar a escribir tu propio contenido inmediatamente.</p>';
    }
    
    if (lang === 'it') {
      return '<h1>Titolo del Documento</h1>' +
          '<p>Benvenuto in <strong>orOS Writer</strong>, un editor che rispetta la tua privacy e funziona completamente offline.</p>' +
          '<p>Questo testo dimostra varie opzioni di formattazione nell\'editor, incluso grassetto, corsivo, sottolineato, titoli (H1, H2, H3), liste puntata e numerata.</p>' +
          '<p>Con orOS Writer puoi scrivere senza paura di perdere dati, poiché il salvataggio automatico si attiva dopo ogni digitazione. Tutto il contenuto viene memorizzato localmente nel tuo browser, senza server, senza tracciamento, senza account.</p>' +
          '<p>L\'editor include Tipografia Intelligente per conversione automatica dei simboli mentre scrivi, nonché incollaggio intelligente che preserva solo formattazione essenziale.</p>' +
          '<ul><li>Formattazione: grassetto, corsivo, sottolineato, barrato</li>' +
          '<li>Intestazioni (H1, H2, H3) per struttura del documento</li>' +
          '<li>Elenco puntato ed elenco numerato</li>' +
          '<li>Allineamento del testo (sinistra, centro, destra, giustificato)</li>' +
          '<li>Citazioni per passaggi importanti</li></ul>' +
          '<h2>Funzionalità & Strumenti</h2>' +
          '<p>orOS Writer include una vasta gamma di strumenti progettati per scrittori, giornalisti, blogger e artisti.</p>' +
          '<ol><li>Salvataggio automatico dopo ogni digitazione</li>' +
          '<li>Esporta in Markdown, Testo Semplice, RTF, Word o PDF</li>' +
          '<li>Pannello schema del documento per navigare tra le intestazioni</li>' +
          '<li>Analisi frequenza parole per individuare ripetizioni</li>' +
          '<li>Metadati del documento per titolo, autore, tag, categoria</li>' +
          '<li>Obiettivi di scrittura con blocco opzionale al raggiungimento dell\'obiettivo</li>' +
          '<li>Funzione Trova e Sostituisci</li>' +
          '<li>Barra di avanzamento lettura e statistiche dettagliate</li></ol>' +
          '<h2>Provalo Ora</h2>' +
          '<p>Questo testo è abbastanza grande da mostrare la barra di avanzamento della lettura nella parte superiore, specialmente su schermi grandi dove puoi scorrere.</p>' +
          '<p>Usa il menu esportazione per scaricare il tuo lavoro in vari formati, oppure inizia pulito premendo il pulsante cancella.</p>' +
          '<p>orOS Writer è open source, costruito con rispetto per i tuoi dati personali. Non ci sono pubblicità, nessuna telemetria, nessun account richiesto.</p>' +
          '<p>Puoi installarlo come Progressive Web App (PWA) per migliore integrazione con il tuo dispositivo.</p>' +
          '<blockquote>"Scrivere è facile. Basta fissare un foglio bianco finché non si formano gocce di sangue sulla fronte." — Gene Fowler</blockquote>' +
          '<p>Questo è il paragrafo finale del contenuto di esempio. Puoi cancellarlo in qualsiasi momento o iniziare a scrivere il tuo contenuto immediatamente.</p>';
    }
    
    if (lang === 'fr') {
      return '<h1>Titre du Document</h1>' +
          '<p>Bienvenue dans <strong>orOS Writer</strong>, un éditeur respectueux de votre vie privée qui fonctionne entièrement hors ligne.</p>' +
          '<p>Ce texte démontre diverses options de mise en forme dans l\'éditeur, y compris gras, italique, souligné, titres (H1, H2, H3), listes à puces et numérotées.</p>' +
          '<p>Avec orOS Writer, vous pouvez écrire sans crainte de perte de données, car la sauvegarde automatique se déclenche après chaque frappe. Tout le contenu est stocké localement dans votre navigateur, sans serveur, sans suivi, sans compte.</p>' +
          '<p>L\'éditeur comprend la Typographie Intelligente pour la conversion automatique des symboles pendant la frappe, ainsi qu\'un collage intelligent qui préserve uniquement la mise en forme essentielle.</p>' +
          '<ul><li>Mise en forme: gras, italique, souligné, barré</li>' +
          '<li>Titres (H1, H2, H3) pour la structure du document</li>' +
          '<li>Listes à puces et listes numérotées</li>' +
          '<li>Alignement du texte (gauche, centre, droite, justifié)</li>' +
          '<li>Citations pour les passages importants</li></ul>' +
          '<h2>Fonctionnalités & Outils</h2>' +
          '<p>orOS Writer comprend un large éventail d\'outils conçus pour les écrivains, journalistes, bloggers et artistes.</p>' +
          '<ol><li>Sauvegarde automatique après chaque frappe</li>' +
          '<li>Exporter vers Markdown, Texte Brut, RTF, Word ou PDF</li>' +
          '<li>Plan du document pour naviguer entre les titres</li>' +
          '<li>Analyse de fréquence des mots pour repérer les répétitions</li>' +
          '<li>Métadonnées du document pour titre, auteur, tags, catégorie</li>' +
          '<li>Objectifs d\'écriture avec verrouillage facultatif à l\'atteinte de l\'objectif</li>' +
          '<li>Fonction Rechercher et Remplacer</li>' +
          '<li>Barre de progression de lecture et statistiques détaillées</li></ol>' +
          '<h2>Essayez-le Maintenant</h2>' +
          '<p>Ce texte est suffisamment grand pour démontrer la barre de progression de lecture en haut, surtout sur grands écrans où vous pouvez faire défiler.</p>' +
          '<p>Utilisez le menu d\'exportation pour télécharger votre travail dans divers formats, ou commencez frais en appuyant sur le bouton effacer.</p>' +
          '<p>orOS Writer est open source, créé avec respect pour vos données personnelles. Pas de publicité, pas de télémétrie, pas de compte requis.</p>' +
          '<p>Vous pouvez l\'installer comme Progressive Web App (PWA) pour une meilleure intégration avec votre appareil.</p>' +
          '<blockquote>"Écrire est facile. Il suffit de fixer une feuille de papier blanc jusqu\'à ce que des gouttes de sang se forment sur votre front." — Gene Fowler</blockquote>' +
          '<p>Ceci est le dernier paragraphe du contenu d\'exemple. Vous pouvez le supprimer à tout moment ou commencer à écrire votre propre contenu immédiatement.</p>';
    }
    
    if (lang === 'de') {
      return '<h1>Dokumenttitel</h1>' +
          '<p>Willkommen bei <strong>orOS Writer</strong>, einem datenschutzfreundlichen Editor, der vollständig offline funktioniert.</p>' +
          '<p>Dieser Text demonstriert verschiedene Formatierungsoptionen im Editor, einschließlich Fettdruck, Kursivschrift, Unterstrichen, Überschriften (H1, H2, H3), Aufzählungslisten und nummerierten Listen.</p>' +
          '<p>Mit orOS Writer können Sie schreiben ohne Angst vor Datenverlust, da automatische Speicherung nach jeder Eingabe ausgelöst wird. Alle Inhalte werden lokal in Ihrem Browser gespeichert, ohne Server, ohne Tracking, ohne Konto.</p>' +
          '<p>Der Editor bietet Intelligente Typografie zur automatischen Zeichenumwandlung während des Tippens sowie intelligentes Einfügen, das nur wesentliche Formatierung bewahrt.</p>' +
          '<ul><li>Formatierung: fett, kursiv, unterstrichen, durchgestrichen</li>' +
          '<li>Überschriften (H1, H2, H3) für Dokumentstruktur</li>' +
          '<li>Aufzählungslisten und nummerierte Listen</li>' +
          '<li>Textausrichtung (links, zentriert, rechts, Blocksatz)</li>' +
          '<li>Zitate für wichtige Abschnitte</li></ul>' +
          '<h2>Features & Werkzeuge</h2>' +
          '<p>orOS Writer enthält eine Vielzahl von Werkzeugen für Schriftsteller, Journalisten, Blogger und Künstler.</p>' +
          '<ol><li>Automatische Speicherung nach jeder Eingabe</li>' +
          '<li>Export nach Markdown, Klartext, RTF, Word oder PDF</li>' +
          '<li>Dokumentskelett zum Navigieren zwischen Überschriften</li>' +
          '<li>Wortfrequenzanalyse zur Erkennung von Wiederholungen</li>' +
          '<li>Dokumentmetadaten für Titel, Autor, Tags, Kategorie</li>' +
          '<li>Schreibziele mit optionalem Sperrmodus beim Erreichen des Ziels</li>' +
          '<li>Suchen-und-Ersetzen-Funktionalität</li>' +
          '<li>Lese-Fortschrittsbalken und detaillierte Statistiken</li></ol>' +
          '<h2>Probieren Sie es aus</h2>' +
          '<p>Dieser Text ist groß genug, um den Lesefortschrittsbalken oben zu zeigen, besonders auf großen Bildschirmen, wo Sie scrollen können.</p>' +
          '<p>Verwenden Sie das Exportmenü, um Ihre Arbeit in verschiedenen Formaten herunterzuladen, oder starten Sie frisch, indem Sie auf die Löschen-Taste drücken.</p>' +
          '<p>orOS Writer ist Open Source, erstellt mit Respekt für Ihre persönlichen Daten. Keine Werbung, keine Fernwartung, kein Konto erforderlich.</p>' +
          '<p>Sie können es als Progressive Web App (PWA) installieren für bessere Integration mit Ihrem Gerät.</p>' +
          '<blockquote>"Schreiben ist leicht. Man muss nur auf ein weißes Blatt Papier starren, bis Blutstropfen auf der Stirn erscheinen." — Gene Fowler</blockquote>' +
          '<p>Dies ist der letzte Absatz des Beispielinhalts. Sie können ihn jederzeit löschen oder sofort mit dem Schreiben Ihres eigenen Inhalts beginnen.</p>';
    }
    
    // Default English with extended content
    return '<h1>Document Title</h1>' +
        '<p>Welcome to <strong>orOS Writer</strong>, a privacy-first rich text editor that respects your privacy and works fully offline.</p>' +
        '<p>This sample text demonstrates various formatting options in the editor, including bold, italic, underline, strikethrough, headings (H1, H2, H3), bullet lists, and numbered lists.</p>' +
        '<p>With orOS Writer you can write without fear of data loss, as auto-save triggers after every keystroke. All content is stored locally in your browser, without servers, without tracking, without accounts.</p>' +
        '<p>The editor includes Smart Typography for automatic symbol conversion while typing, as well as smart paste that preserves only essential formatting.</p>' +
        '<ul><li>Formatting: bold, italic, underline, strikethrough</li>' +
        '<li>Headings (H1, H2, H3) for document structure</li>' +
        '<li>Bullet lists and numbered lists</li>' +
        '<li>Text alignment (left, center, right, justify)</li>' +
        '<li>Blockquotes for important passages</li></ul>' +
        '<h2>Features & Tools</h2>' +
        '<p>orOS Writer includes a wide range of tools designed for writers, journalists, bloggers, and artists.</p>' +
        '<ol><li>Auto-save after every keystroke</li>' +
        '<li>Export to Markdown, Plain Text, RTF, Word, or PDF</li>' +
        '<li>Document outline panel for navigating between headings</li>' +
        '<li>Word frequency analysis to spot repetitions</li>' +
        '<li>Document metadata for title, author, tags, category</li>' +
        '<li>Writing goals with optional lock upon reaching target</li>' +
        '<li>Find and Replace functionality</li>' +
        '<li>Reading progress bar and detailed statistics</li></ol>' +
        '<h2>Try It Now</h2>' +
        '<p>This text is large enough to demonstrate the reading progress bar at the top, especially on large screens where you can scroll.</p>' +
        '<p>Use the export menu to download your work in various formats, or start fresh by pressing the clear button.</p>' +
        '<p>orOS Writer is open source, built with respect for your personal data. There are no ads, no telemetry, no account required.</p>' +
        '<p>You can install it as a Progressive Web App (PWA) for better integration with your device.</p>' +
        '<blockquote>"Writing is easy. Just stare at a blank sheet of paper until drops of blood form on your forehead." — Gene Fowler</blockquote>' +
        '<p>This is the final paragraph of the sample content. You can delete it anytime or begin writing your own content immediately.</p>';
  }

  function insertLoremIpsum() {
    if (!richEditor) return;
    var html = generateLoremIpsum();
    richEditor.innerHTML = html;
    saveContent();
    updateStats();
    showToast(getTrans('toast_lorem_inserted') || 'Sample text inserted');
  }
  
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

  function setupMetadataHandlers() {
    var inputs = [metaTitle, metaAuthor, metaTags, metaCategory];
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i]) {
        inputs[i].addEventListener('input', function() {
          saveMetadata(false);
        });
      }
    }
  }

  function toggleMetadataPanel() {
    if (!metadataPanel) return;
    if (metadataPanel.style.display === 'none' || !metadataPanel.style.display) {
      metadataPanel.style.display = 'flex';
      metadataPanel.style.flexDirection = 'column';
      var topPx = getPanelTopOffset();
      var topNum = parseInt(topPx);
      metadataPanel.style.top = topPx;
      metadataPanel.style.maxHeight = 'calc(100vh - ' + (topNum + 56) + 'px)';
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

  function toggleOutline() {
    if (!outlinePanel) return;
    if (outlinePanel.style.display === 'none' || !outlinePanel.style.display) {
      outlinePanel.style.display = 'flex';
      outlinePanel.style.flexDirection = 'column';
      var topPx = getPanelTopOffset();
      var topNum = parseInt(topPx);
      outlinePanel.style.top = topPx;
      outlinePanel.style.maxHeight = 'calc(100vh - ' + (topNum + 56) + 'px)';
      updateOutline();
    } else {
      outlinePanel.style.display = 'none';
    }
  }

  function toggleWordFreqPanel() {
    if (!wordFreqPanel) return;
    if (wordFreqPanel.style.display === 'none' || !wordFreqPanel.style.display) {
      wordFreqPanel.style.display = 'flex';
      wordFreqPanel.style.flexDirection = 'column';
      var topPx = getPanelTopOffset();
      var topNum = parseInt(topPx);
      wordFreqPanel.style.top = topPx;
      wordFreqPanel.style.maxHeight = 'calc(100vh - ' + (topNum + 56) + 'px)';
      updateWordFrequency();
    } else {
      wordFreqPanel.style.display = 'none';
    }
  }

  function updateStats() {
    if (!richEditor) return;
    var text = getTextContent();
    var chars = text.length;
    var charsNoSpaces = text.replace(/\s/g, '').length;
    var words = text.trim().split(/\s+/).filter(Boolean).length;
    var sentences = text.split(/[.!?]+(?:\s|$)/).filter(function(s) {
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

  // CORRECTED: Focus Mode with proper positioning relative to wrapper
  function initFocusMode() {
    if (!richEditor || !richWrapper) return;
    if (focusModeEnabled) {
      document.removeEventListener('selectionchange', handleSelectionChange);
      richEditor.removeEventListener('scroll', handleScrollForFocus);
      document.addEventListener('selectionchange', handleSelectionChange);
      richEditor.addEventListener('scroll', handleScrollForFocus);
    }
  }

  function handleScrollForFocus() {
    if (!focusModeEnabled) return;
    clearFocusMode();
  }

    function handleSelectionChange() {
    if (!focusModeEnabled || !richWrapper || !richEditor) {
      clearFocusMode();
      return;
    }
    
    clearTimeout(focusDebounceTimer);
    focusDebounceTimer = setTimeout(function() {
      var selection = window.getSelection();
      if (!selection.rangeCount || selection.isCollapsed) {
        clearFocusMode();
        return;
      }
      
      var range = selection.getRangeAt(0);
      if (!richEditor.contains(range.commonAncestorContainer)) {
        clearFocusMode();
        return;
      }
      
      clearFocusMode();
      
      // Get the bounding rect of the ACTUAL selected text (not parent node)
      var selectedRect = range.getBoundingClientRect();
      var wrapperRect = richWrapper.getBoundingClientRect();
      
      // Check if selection is valid
      if (selectedRect.width === 0 || selectedRect.height === 0) {
        clearFocusMode();
        return;
      }
      
      // Calculate position relative to wrapper (accounting for scroll)
      var scrollTop = richWrapper.scrollTop || richEditor.scrollTop || 0;
      var topPos = (selectedRect.top - wrapperRect.top) + scrollTop;
      var leftPos = (selectedRect.left - wrapperRect.left);
      
      // Create spotlight for exact selected area
      currentSpotlight = document.createElement('div');
      currentSpotlight.id = 'focus-spotlight';
      currentSpotlight.className = 'focus-spotlight';
      currentSpotlight.style.position = 'absolute';
      currentSpotlight.style.top = topPos + 'px';
      currentSpotlight.style.left = leftPos + 'px';
      currentSpotlight.style.width = selectedRect.width + 'px';
      currentSpotlight.style.height = selectedRect.height + 'px';
      currentSpotlight.style.pointerEvents = 'none';
      currentSpotlight.style.zIndex = '1';
      
      richWrapper.insertBefore(currentSpotlight, richEditor);
      
    }, 100);
  }

  function clearFocusMode() {
    if (currentSpotlight) {
      currentSpotlight.remove();
      currentSpotlight = null;
    }
  }

  window.addEventListener('oros-focus-mode-changed', function(e) {
    focusModeEnabled = e.detail.enabled;
    if (focusModeEnabled) {
      initFocusMode();
      handleSelectionChange();
    } else {
      clearFocusMode();
      document.removeEventListener('selectionchange', handleSelectionChange);
      richEditor.removeEventListener('scroll', handleScrollForFocus);
    }
  });
  
    // CORRECTED: Context Menu with capture phase listeners and zIndex
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
      '<div class="cm-item" data-cmd="insertUnorderedList"><i class="fa fa-list-ul cm-icon"></i>Bullets</div>' +
      '<div class="cm-item" data-cmd="insertOrderedList"><i class="fa fa-list-ol cm-icon"></i>Numbers</div>' +
      '<div class="cm-divider"></div>' +
      '<div class="cm-item" data-cmd="undo"><i class="fa fa-undo cm-icon"></i>Undo</div>' +
      '<div class="cm-item" data-cmd="redo"><i class="fa fa-repeat cm-icon"></i>Redo</div>';
    
    menu.style.position = 'fixed';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.style.zIndex = '9999';
    
    menu.addEventListener('click', function(ev) { ev.stopPropagation(); }, true);
    menu.addEventListener('contextmenu', function(ev) { ev.preventDefault(); ev.stopPropagation(); }, true);
    menu.addEventListener('mousedown', function(ev) { ev.stopPropagation(); }, true);
    
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
      document.addEventListener('mousedown', closeOnOutsideClick, true);
      document.addEventListener('contextmenu', closeOnContext, true);
      document.addEventListener('keydown', closeOnKeydown, true);
    }, 10);
  }

  function closeOnOutsideClick(ev) {
    if (contextMenu && !contextMenu.contains(ev.target)) {
      contextMenu.remove();
      contextMenu = null;
      removeCloseListeners();
    }
  }

  function closeOnContext(ev) {
    if (contextMenu) {
      contextMenu.remove();
      contextMenu = null;
      removeCloseListeners();
      ev.preventDefault();
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
    document.removeEventListener('mousedown', closeOnOutsideClick, true);
    document.removeEventListener('contextmenu', closeOnContext, true);
    document.removeEventListener('keydown', closeOnKeydown, true);
  }

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
          case 'pre': md += '\n```\n' + child.textContent + '\n```\n\n';           break;
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

  window.addEventListener('oros-hide-stats-changed', function(e) {
    hideStats = e.detail.hidden;
    if (statsOverlay) statsOverlay.style.display = hideStats ? 'none' : '';
  });
  window.addEventListener('oros-hide-goal-btn-changed', function(e) {
    hideGoalBtn = e.detail.hidden;
    if (btnGoal) btnGoal.style.display = hideGoalBtn ? 'none' : '';
  });
  window.addEventListener('oros-hide-outline-changed', function(e) {
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
  window.addEventListener('oros-language-changed', function() {
    updateStats();
    renderMetaDates();
    updateGoalUnitLabels();
    updateSaveIndicator();
  });

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
    richEditor.addEventListener('click', function() {
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

  setInterval(updateSaveIndicator, 30000);

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

})();