// ============================================
// orOS Format Converter — converter.js
// Vanilla JS, no dependencies
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  'use strict';

  // ========== ELEMENTS ==========
  var inputArea = document.getElementById('input-area');
  var outputArea = document.getElementById('output-area');
  var inputFormat = document.getElementById('input-format');
  var outputFormat = document.getElementById('output-format');
  var btnConvert = document.getElementById('btn-convert');
  var btnSwap = document.getElementById('btn-swap');
  var btnCopy = document.getElementById('btn-copy');
  var btnOpen = document.getElementById('btn-open');
  var btnSave = document.getElementById('btn-save');
  var btnClear = document.getElementById('btn-clear');
  var btnStats = document.getElementById('btn-stats');
  var btnOptions = document.getElementById('btn-options');
  var fileInput = document.getElementById('file-input');
  var optionsDropdown = document.getElementById('options-dropdown');
  var statsPanel = document.getElementById('stats-panel');

  // Option checkboxes
  var optLive = document.getElementById('opt-live');
  var optJsonBeautify = document.getElementById('opt-json-beautify');
  var optCsvHeader = document.getElementById('opt-csv-header');
  var optMdGfm = document.getElementById('opt-md-gfm');
  var optHexPrefix = document.getElementById('opt-hex-prefix');
  var optBinarySpace = document.getElementById('opt-binary-space');
  var optSlugLower = document.getElementById('opt-slug-lower');

  // Stats elements
  var statCharsIn = document.getElementById('stat-chars-in');
  var statCharsOut = document.getElementById('stat-chars-out');
  var statLines = document.getElementById('stat-lines');
  var statStatus = document.getElementById('stat-status');

  // ========== OPTIONS DROPDOWN ==========
  if (btnOptions && optionsDropdown) {
    btnOptions.addEventListener('click', function(e) {
      e.stopPropagation();
      optionsDropdown.classList.toggle('visible');
      btnOptions.parentElement.classList.toggle('open');
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.options-dropdown')) {
        optionsDropdown.classList.remove('visible');
        btnOptions.parentElement.classList.remove('open');
      }
    });
  }

  // ========== STATS PANEL TOGGLE ==========
  if (btnStats && statsPanel) {
    btnStats.addEventListener('click', function() {
      statsPanel.classList.toggle('visible');
    });
  }

  // ========== UPDATE STATS ==========
  function updateStats(status) {
    if (!statCharsIn) return;
    statCharsIn.textContent = (inputArea.value || '').length;
    statCharsOut.textContent = (outputArea.value || '').length;
    statLines.textContent = (inputArea.value || '').split('\n').length;
    statStatus.textContent = status || 'Ready';
    statStatus.style.color = status === 'Error' ? '#e74c3c' : 'var(--accent-gold)';
  }

  // ========== CONVERSION FUNCTIONS ==========

  // --- Markdown → HTML ---
  function mdToHtml(md) {
    var html = md;

    // GFM Tables
    if (optMdGfm && optMdGfm.checked) {
      html = convertGfmTables(html);
    }

    // Headers
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
               .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
               .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
               .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
               .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
               .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Bold / Italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
               .replace(/__(.+?)__/g, '<strong>$1</strong>')
               .replace(/\*(.+?)\*/g, '<em>$1</em>')
               .replace(/_(.+?)_/g, '<em>$1</em>');

    // Code blocks (fenced)
    html = html.replace(/```([\s\S]*?)```/g, function(m, code) {
      return '<pre><code>' + escapeHtml(code.trim()) + '</code></pre>';
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Images ![alt](url)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // Blockquotes
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rule
    html = html.replace(/^---+$/gm, '<hr>');

    // Lists — unordered
    html = html.replace(/^(?:- |\* )(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, function(m) {
      return '<ul>\n' + m + '</ul>\n';
    });

    // Lists — ordered
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+(?!<\/ul>)/g, function(m) {
      if (m.indexOf('<ul>') === 0) return m;
      return '<ol>\n' + m + '</ol>\n';
    });

    // Paragraphs (lines that aren't HTML tags)
    html = html.split('\n').map(function(line) {
      var trimmed = line.trim();
      if (trimmed === '') return '';
      if (/^<[^>]+>/.test(trimmed)) return line;
      if (trimmed === '<hr>' || trimmed === '<hr/>') return line;
      return '<p>' + trimmed + '</p>';
    }).join('\n');

    return html.trim();
  }

  function convertGfmTables(text) {
    var lines = text.split('\n');
    var result = [];
    var i = 0;
    while (i < lines.length) {
      if (i + 1 < lines.length && lines[i].indexOf('|') !== -1 && /^\|?[\s\-:|]+\|?$/.test(lines[i + 1])) {
        var headerCells = parseTableRow(lines[i]);
        var aligns = parseTableAligns(lines[i + 1]);
        var bodyRows = [];
        i += 2;
        while (i < lines.length && lines[i].indexOf('|') !== -1 && lines[i].trim() !== '') {
          bodyRows.push(parseTableRow(lines[i]));
          i++;
        }
        var table = '<table>\n<thead>\n<tr>\n';
        headerCells.forEach(function(cell, idx) {
          var align = aligns[idx] ? ' style="text-align:' + aligns[idx] + '"' : '';
          table += '<th' + align + '>' + cell.trim() + '</th>\n';
        });
        table += '</tr>\n</thead>\n<tbody>\n';
        bodyRows.forEach(function(row) {
          table += '<tr>\n';
          row.forEach(function(cell, idx) {
            var align = aligns[idx] ? ' style="text-align:' + aligns[idx] + '"' : '';
            table += '<td' + align + '>' + cell.trim() + '</td>\n';
          });
          table += '</tr>\n';
        });
        table += '</tbody>\n</table>\n';
        result.push(table);
      } else {
        result.push(lines[i]);
        i++;
      }
    }
    return result.join('\n');
  }

  function parseTableRow(line) {
    return line.replace(/^\||\|$/g, '').split('|').map(function(c) { return c.trim(); });
  }

  function parseTableAligns(line) {
    return line.replace(/^\||\|$/g, '').split('|').map(function(c) {
      c = c.trim();
      if (/^:/.test(c) && /:$/.test(c)) return 'center';
      if (/:$/.test(c)) return 'right';
      if (/^:/.test(c)) return 'left';
      return null;
    });
  }

  // --- HTML → Markdown ---
  function htmlToMd(html) {
    var md = html;

    // Code blocks
    md = md.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, function(m, code) {
      return '\n```\n' + unescapeHtml(code) + '\n```\n';
    });

    // Headers
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
           .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
           .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
           .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n')
           .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n')
           .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n');

    // Bold / Italic
    md = md.replace(/<(?:strong|b)>(.*?)<\/(?:strong|b)>/gi, '**$1**')
           .replace(/<(?:em|i)>(.*?)<\/(?:em|i)>/gi, '*$1*');

    // Inline code
    md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');

    // Links
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

    // Images
    md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
           .replace(/<img[^>]*src="([^"]*)"[^>]*/gi, '![]($1)');

    // Blockquotes
    md = md.replace(/<blockquote>(.*?)<\/blockquote>/gis, function(m, text) {
      return text.trim().split('\n').map(function(l) { return '> ' + l; }).join('\n') + '\n';
    });

    // Horizontal rule
    md = md.replace(/<hr\s*\/?>/gi, '\n---\n');

    // Lists
    md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, function(m, content) {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    });
    md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, function(m, content) {
      var idx = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, function(match, item) {
        return idx++ + '. ' + item + '\n';
      });
    });

    // GFM Tables
    md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, function(m, table) {
      var headers = [];
      var rows = [];
      var headerMatch = /<thead[^>]*>([\s\S]*?)<\/thead>/i.exec(table);
      if (headerMatch) {
        headers = (headerMatch[1].match(/<th[^>]*>(.*?)<\/th>/gi) || []).map(function(c) {
          return c.replace(/<\/?th[^>]*>/gi, '').trim();
        });
      }
      var bodyMatch = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i.exec(table);
      if (bodyMatch) {
        var trMatches = bodyMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        trMatches.forEach(function(tr) {
          var cells = (tr.match(/<td[^>]*>(.*?)<\/td>/gi) || []).map(function(c) {
            return c.replace(/<\/?td[^>]*>/gi, '').trim();
          });
          rows.push(cells);
        });
      }
      if (headers.length === 0) return table;
      var result = '| ' + headers.join(' | ') + ' |\n';
      result += '|' + headers.map(function() { return '---'; }).join('|') + '|\n';
      rows.forEach(function(row) {
        result += '| ' + row.join(' | ') + ' |\n';
      });
      return '\n' + result + '\n';
    });

    // Paragraphs
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

    // Line breaks
    md = md.replace(/<br\s*\/?>/gi, '\n');

    // Strip remaining tags
    md = md.replace(/<[^>]+>/g, '');

    // Decode entities
    md = unescapeHtml(md);

    // Clean up excessive whitespace
    md = md.replace(/\n{3,}/g, '\n\n').trim();

    return md;
  }

  // --- HTML → Plain Text ---
  function htmlToText(html) {
    var text = html;
    // Replace block elements with newlines
    text = text.replace(/<\/?(p|div|h1|h2|h3|h4|h5|h6|br|hr|li|tr)[^>]*>/gi, '\n');
    // Replace table cells with tab
    text = text.replace(/<\/?(td|th)[^>]*>/gi, '\t');
    // Remove scripts and styles
    text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
    // Strip remaining tags
    text = text.replace(/<[^>]+>/g, '');
    // Decode entities
    text = unescapeHtml(text);
    // Collapse whitespace
    text = text.replace(/\t/g, '    ');
    text = text.replace(/[ \t]+$/gm, '');
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
  }

  // --- Markdown → Plain Text ---
  function mdToText(md) {
    var text = md;
    // Remove code fences but keep content
    text = text.replace(/```[\s\S]*?```/g, function(m) {
      return m.replace(/```\w*\n?/g, '').replace(/```/g, '');
    });
    // Remove inline code backticks
    text = text.replace(/`([^`]+)`/g, '$1');
    // Remove bold/italic markers
    text = text.replace(/\*\*(.+?)\*\*/g, '$1')
               .replace(/__(.+?)__/g, '$1')
               .replace(/\*(.+?)\*/g, '$1')
               .replace(/_(.+?)_/g, '$1');
    // Headers
    text = text.replace(/^#{1,6}\s+/gm, '');
    // Links → text (url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
    // Images → alt
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1');
    // Blockquote markers
    text = text.replace(/^>\s+/gm, '');
    // Horizontal rules
    text = text.replace(/^---+$/gm, '');
    // List markers
    text = text.replace(/^[-*]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');
    // Table pipes
    text = text.replace(/^\|?[\s\-:|]+\|?$/gm, '');
    text = text.replace(/\|/g, '\t');
    return text.trim();
  }

  // --- JSON ↔ CSV ---
  function jsonToCsv(jsonStr) {
    var data;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error('Invalid JSON: ' + e.message);
    }
    if (!Array.isArray(data)) data = [data];
    if (data.length === 0) return '';

    var headers;
    var headerRow = optCsvHeader && optCsvHeader.checked;

    if (headerRow) {
      // Collect all unique keys from first object
      headers = Object.keys(data.reduce(function(acc, obj) {
        if (obj && typeof obj === 'object') {
          Object.keys(obj).forEach(function(k) { acc[k] = true; });
        }
        return acc;
      }, {}));
    } else {
      headers = data[0] && typeof data[0] === 'object' ? Object.keys(data[0]) : [];
    }

    var rows = [];
    if (headerRow) {
      rows.push(headers.map(csvEscape).join(','));
    }
    data.forEach(function(obj) {
      if (obj && typeof obj === 'object') {
        rows.push(headers.map(function(h) {
          var val = obj[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return csvEscape(JSON.stringify(val));
          return csvEscape(String(val));
        }).join(','));
      }
    });
    return rows.join('\n');
  }

  function csvToJson(csvStr) {
    var rows = parseCsv(csvStr);
    if (rows.length === 0) return '[]';

    var headerRow = optCsvHeader && optCsvHeader.checked;
    var headers;
    var startIdx = 0;

    if (headerRow) {
      headers = rows[0];
      startIdx = 1;
    } else {
      headers = rows[0].map(function(_, i) { return 'col' + (i + 1); });
    }

    var result = [];
    for (var i = startIdx; i < rows.length; i++) {
      if (rows[i].length === 1 && rows[i][0] === '') continue;
      var obj = {};
      headers.forEach(function(h, idx) {
        var val = rows[i][idx] || '';
        // Try to parse numbers
        var numVal = parseFloat(val);
        if (!isNaN(numVal) && String(numVal) === val.trim()) {
          obj[h] = numVal;
        } else if (val === 'true') {
          obj[h] = true;
        } else if (val === 'false') {
          obj[h] = false;
        } else if (val === 'null') {
          obj[h] = null;
        } else {
          obj[h] = val;
        }
      });
      result.push(obj);
    }
    return JSON.stringify(result, null, optJsonBeautify && optJsonBeautify.checked ? 2 : 0);
  }

  function parseCsv(csvStr) {
    var rows = [];
    var current = [];
    var field = '';
    var inQuotes = false;

    for (var i = 0; i < csvStr.length; i++) {
      var ch = csvStr[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < csvStr.length && csvStr[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          current.push(field);
          field = '';
        } else if (ch === '\n') {
          current.push(field);
          rows.push(current);
          current = [];
          field = '';
        } else if (ch === '\r') {
          // skip
        } else {
          field += ch;
        }
      }
    }
    if (field !== '' || current.length > 0) {
      current.push(field);
      rows.push(current);
    }
    return rows;
  }

  function csvEscape(value) {
    if (/[",\n\r]/.test(value)) {
      return '"' + String(value).replace(/"/g, '""') + '"';
    }
    return value;
  }

  // --- JSON Beautify / Minify ---
  function beautifyJson(str) {
    var data;
    try {
      data = JSON.parse(str);
    } catch (e) {
      throw new Error('Invalid JSON: ' + e.message);
    }
    return JSON.stringify(data, null, 2);
  }

  function minifyJson(str) {
    var data;
    try {
      data = JSON.parse(str);
    } catch (e) {
      throw new Error('Invalid JSON: ' + e.message);
    }
    return JSON.stringify(data);
  }

  // --- Base64 ---
  function encodeBase64(str) {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      throw new Error('Base64 encode failed: ' + e.message);
    }
  }

  function decodeBase64(str) {
    try {
      return decodeURIComponent(escape(atob(str.trim())));
    } catch (e) {
      throw new Error('Invalid Base64: ' + e.message);
    }
  }

  // --- URL Encode/Decode ---
  function urlEncode(str) {
    return encodeURIComponent(str);
  }

  function urlDecode(str) {
    try {
      return decodeURIComponent(str);
    } catch (e) {
      throw new Error('Invalid URL encoding: ' + e.message);
    }
  }

  // --- HTML Entities ---
  function encodeEntities(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
  }

  function decodeEntities(str) {
    var txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  }

  function unescapeHtml(str) {
    return str.replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#0?39;/g, "'")
              .replace(/&amp;/g, '&');
  }

  // --- Hex ---
  function strToHex(str) {
    var prefix = optHexPrefix && optHexPrefix.checked ? '0x' : '';
    var hex = '';
    for (var i = 0; i < str.length; i++) {
      hex += (i > 0 ? ' ' : '') + str.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return prefix + hex;
  }

  function hexToStr(hex) {
    var cleaned = hex.replace(/^0x/i, '').replace(/[\s,]/g, '');
    var str = '';
    for (var i = 0; i < cleaned.length; i += 2) {
      var chunk = cleaned.substr(i, 2);
      if (chunk.length === 2) {
        str += String.fromCharCode(parseInt(chunk, 16));
      }
    }
    return str;
  }

  // --- Binary ---
  function strToBinary(str) {
    var useSpace = optBinarySpace && optBinarySpace.checked;
    var bin = '';
    for (var i = 0; i < str.length; i++) {
      if (i > 0 && useSpace) bin += ' ';
      bin += str.charCodeAt(i).toString(2).padStart(8, '0');
    }
    return bin;
  }

  function binaryToStr(bin) {
    var cleaned = bin.replace(/[\s,]/g, '');
    var str = '';
    for (var i = 0; i < cleaned.length; i += 8) {
      var byte = cleaned.substr(i, 8);
      if (byte.length === 8) {
        str += String.fromCharCode(parseInt(byte, 2));
      }
    }
    return str;
  }

  // --- Slugify ---
  function slugify(str) {
    var result = str.toString();
    var lower = !optSlugLower || optSlugLower.checked;

    if (lower) result = result.toLowerCase();

    // Normalize Greek letters to Latin
    result = result.replace(/Ά/g, 'A').replace(/ά/g, 'a')
                   .replace(/Έ/g, 'E').replace(/έ/g, 'e')
                   .replace(/Ή/g, 'I').replace(/ή/g, 'i')
                   .replace(/Ί/g, 'I').replace(/ί/g, 'i').replace(/ϊ/g, 'i').replace(/ΐ/g, 'i')
                   .replace(/Ό/g, 'O').replace(/ό/g, 'o')
                   .replace(/Ύ/g, 'Y').replace(/ύ/g, 'y').replace(/ϋ/g, 'y').replace(/ΰ/g, 'y')
                   .replace(/Ώ/g, 'O').replace(/ώ/g, 'o')
                   .replace(/Α/g, 'A').replace(/α/g, 'a')
                   .replace(/Β/g, 'B').replace(/β/g, 'b')
                   .replace(/Γ/g, 'G').replace(/γ/g, 'g')
                   .replace(/Δ/g, 'D').replace(/δ/g, 'd')
                   .replace(/Ε/g, 'E').replace(/ε/g, 'e')
                   .replace(/Ζ/g, 'Z').replace(/ζ/g, 'z')
                   .replace(/Η/g, 'I').replace(/η/g, 'i')
                   .replace(/Θ/g, 'Th').replace(/θ/g, 'th')
                   .replace(/Ι/g, 'I').replace(/ι/g, 'i')
                   .replace(/Κ/g, 'K').replace(/κ/g, 'k')
                   .replace(/Λ/g, 'L').replace(/λ/g, 'l')
                   .replace(/Μ/g, 'M').replace(/μ/g, 'm')
                   .replace(/Ν/g, 'N').replace(/ν/g, 'n')
                   .replace(/Ξ/g, 'X').replace(/ξ/g, 'x')
                   .replace(/Ο/g, 'O').replace(/ο/g, 'o')
                   .replace(/Π/g, 'P').replace(/π/g, 'p')
                   .replace(/Ρ/g, 'R').replace(/ρ/g, 'r')
                   .replace(/Σ/g, 'S').replace(/σ/g, 's').replace(/ς/g, 's')
                   .replace(/Τ/g, 'T').replace(/τ/g, 't')
                   .replace(/Υ/g, 'Y').replace(/υ/g, 'y')
                   .replace(/Φ/g, 'F').replace(/φ/g, 'f')
                   .replace(/Χ/g, 'Ch').replace(/χ/g, 'ch')
                   .replace(/Ψ/g, 'Ps').replace(/ψ/g, 'ps')
                   .replace(/Ω/g, 'O').replace(/ω/g, 'o');

    // Remove accents
    result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Replace spaces and special chars
    result = result.replace(/[^a-zA-Z0-9\s-]/g, '')
                   .replace(/\s+/g, '-')
                   .replace(/-+/g, '-')
                   .replace(/^-|-$/g, '');

    return result;
  }

  // ========== ROUTER ==========
  function convert(input, from, to) {
    var text = input || '';

    // Same format — no conversion
    if (from === to) return text;

    // Route to intermediate representation
    // Strategy: normalize input to a common form, then convert to output

    // === ENCODING FORMATS (these go directly to/from text) ===

    if (from === 'base64' && to === 'plaintext') return decodeBase64(text);
    if (from === 'plaintext' && to === 'base64') return encodeBase64(text);
    if (from === 'base64' && to !== 'base64') text = decodeBase64(text), from = 'plaintext';
    if (to === 'base64' && from !== 'base64') return encodeBase64(convert(text, from, 'plaintext'));

    if (from === 'url' && to === 'plaintext') return urlDecode(text);
    if (from === 'plaintext' && to === 'url') return urlEncode(text);
    if (from === 'url' && to !== 'url') text = urlDecode(text), from = 'plaintext';
    if (to === 'url' && from !== 'url') return urlEncode(convert(text, from, 'plaintext'));

    if (from === 'hex' && to === 'plaintext') return hexToStr(text);
    if (from === 'plaintext' && to === 'hex') return strToHex(text);
    if (from === 'hex' && to !== 'hex') text = hexToStr(text), from = 'plaintext';
    if (to === 'hex' && from !== 'hex') return strToHex(convert(text, from, 'plaintext'));

    if (from === 'binary' && to === 'plaintext') return binaryToStr(text);
    if (from === 'plaintext' && to === 'binary') return strToBinary(text);
    if (from === 'binary' && to !== 'binary') text = binaryToStr(text), from = 'plaintext';
    if (to === 'binary' && from !== 'binary') return strToBinary(convert(text, from, 'plaintext'));

    if (from === 'entities' && to === 'plaintext') return decodeEntities(text);
    if (from === 'plaintext' && to === 'entities') return encodeEntities(text);
    if (from === 'entities' && to !== 'entities') text = decodeEntities(text), from = 'plaintext';
    if (to === 'entities' && from !== 'entities') return encodeEntities(convert(text, from, 'plaintext'));

    if (from === 'slugify' && to !== 'slugify') return convert(slugify(text), 'plaintext', to);
    if (to === 'slugify' && from !== 'slugify') return slugify(convert(text, from, 'plaintext'));

    // === TEXT FORMAT CONVERSIONS ===

    if (from === 'markdown' && to === 'html') return mdToHtml(text);
    if (from === 'html' && to === 'markdown') return htmlToMd(text);
    if (from === 'markdown' && to === 'plaintext') return mdToText(text);
    if (from === 'plaintext' && to === 'markdown') return text;
    if (from === 'html' && to === 'plaintext') return htmlToText(text);
    if (from === 'plaintext' && to === 'html') return escapeHtml(text).replace(/\n/g, '<br>\n');

    // Markdown → plaintext (already handled)
    // plaintext → html (already handled)

    // === DATA FORMAT CONVERSIONS ===

    if (from === 'json' && to === 'csv') return jsonToCsv(text);
    if (from === 'csv' && to === 'json') return csvToJson(text);

    if (from === 'json' && to === 'plaintext') {
      return optJsonBeautify && optJsonBeautify.checked ? beautifyJson(text) : minifyJson(text);
    }
    if (from === 'plaintext' && to === 'json') {
      // Try to parse and re-stringify
      try {
        return JSON.stringify(JSON.parse(text), null, optJsonBeautify && optJsonBeautify.checked ? 2 : 0);
      } catch (e) {
        return JSON.stringify({ text: text }, null, 2);
      }
    }
    if (from === 'json' && to === 'html') {
      return '<pre><code>' + escapeHtml(beautifyJson(text)) + '</code></pre>';
    }
    if (from === 'csv' && to === 'plaintext') return text;
    if (from === 'csv' && to === 'html') {
      return csvToHtml(text);
    }
    if (from === 'json' && to === 'markdown') {
      return '```json\n' + beautifyJson(text) + '\n```';
    }

    // Fallback — no supported path
    throw new Error('Conversion ' + from + ' → ' + to + ' is not supported');
  }

  function csvToHtml(csvStr) {
    var rows = parseCsv(csvStr);
    if (rows.length === 0) return '';
    var headerRow = optCsvHeader && optCsvHeader.checked;
    var html = '<table>\n';
    if (headerRow) {
      html += '<thead>\n<tr>\n';
      rows[0].forEach(function(cell) {
        html += '<th>' + escapeHtml(cell) + '</th>\n';
      });
      html += '</tr>\n</thead>\n<tbody>\n';
      rows.slice(1).forEach(function(row) {
        html += '<tr>\n';
        row.forEach(function(cell) {
          html += '<td>' + escapeHtml(cell) + '</td>\n';
        });
        html += '</tr>\n';
      });
    } else {
      rows.forEach(function(row) {
        html += '<tr>\n';
        row.forEach(function(cell) {
          html += '<td>' + escapeHtml(cell) + '</td>\n';
        });
        html += '</tr>\n';
      });
    }
    html += '</tbody>\n</table>\n';
    return html;
  }

  // ========== DO CONVERT ==========
  var convertTimer = null;

  function doConvert(manual) {
    var isLive = optLive && optLive.checked;
    if (!manual && !isLive) return;

    var input = inputArea.value;
    if (!input.trim()) {
      outputArea.value = '';
      updateStats('Ready');
      return;
    }

    var from = inputFormat.value;
    var to = outputFormat.value;

    try {
      outputArea.value = convert(input, from, to);
      updateStats('Done');
    } catch (e) {
      outputArea.value = '';
      updateStats('Error');
      console.error('Conversion error:', e.message);
    }
  }

  // Debounce for live mode
  function debouncedConvert() {
    clearTimeout(convertTimer);
    convertTimer = setTimeout(function() { doConvert(false); }, 300);
  }

  // ========== EVENT LISTENERS ==========

  // Live input
  if (inputArea) {
    inputArea.addEventListener('input', debouncedConvert);
  }

  // Format change
  if (inputFormat) {
    inputFormat.addEventListener('change', function() { doConvert(true); });
  }
  if (outputFormat) {
    outputFormat.addEventListener('change', function() { doConvert(true); });
  }

  // Options change
  [optLive, optJsonBeautify, optCsvHeader, optMdGfm, optHexPrefix, optBinarySpace, optSlugLower].forEach(function(opt) {
    if (opt) opt.addEventListener('change', function() { doConvert(true); });
  });

  // Manual convert
  if (btnConvert) {
    btnConvert.addEventListener('click', function() { doConvert(true); });
  }

  // Swap
  if (btnSwap) {
    btnSwap.addEventListener('click', function() {
      var inputValue = inputArea.value;
      var outputValue = outputArea.value;
      var fromFmt = inputFormat.value;
      var toFmt = outputFormat.value;

      inputArea.value = outputValue;
      outputArea.value = inputValue;
      inputFormat.value = toFmt;
      outputFormat.value = fromFmt;

      doConvert(true);
    });
  }

  // Copy
  if (btnCopy) {
    btnCopy.addEventListener('click', function() {
      outputArea.select();
      try {
        document.execCommand('copy');
        showToast('Copied to clipboard');
      } catch (e) {
        outputArea.focus();
      }
    });
  }

  // Open file
  if (btnOpen) {
    btnOpen.addEventListener('click', function() {
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        inputArea.value = ev.target.result;
        doConvert(true);
        showToast('File loaded: ' + file.name);
      };
      reader.readAsText(file);
      fileInput.value = '';
    });
  }

  // Save
  if (btnSave) {
    btnSave.addEventListener('click', function() {
      var blob = new Blob([outputArea.value], { type: 'text/plain' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'converted-' + Date.now() + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Saved');
    });
  }

  // Clear
  if (btnClear) {
    btnClear.addEventListener('click', function() {
      inputArea.value = '';
      outputArea.value = '';
      updateStats('Ready');
      inputArea.focus();
    });
  }

  // ========== KEYBOARD SHORTCUTS ==========
  document.addEventListener('keydown', function(e) {
    // Ctrl+Enter — Convert
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      doConvert(true);
    }
    // Ctrl+Shift+S — Swap
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      if (btnSwap) btnSwap.click();
    }
  });

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
    }, 2500);
  }

  // ========== SETTINGS TOGGLES (Converter) ==========
  var converterToggles = [
    { id: 'toggle-hide-copy-btn', key: 'oros_hide_converter_copy_btn', element: 'btn-copy' },
    { id: 'toggle-hide-save-btn', key: 'oros_hide_converter_save_btn', element: 'btn-save' },
    { id: 'toggle-hide-open-btn', key: 'oros_hide_converter_open_btn', element: 'btn-open' },
    { id: 'toggle-hide-clear-btn', key: 'oros_hide_converter_clear_btn', element: 'btn-clear' },
    { id: 'toggle-hide-options', key: 'oros_hide_converter_options', element: 'btn-options' },
    { id: 'toggle-hide-stats-btn', key: 'oros_hide_converter_stats_btn', element: 'btn-stats' }
  ];

  converterToggles.forEach(function(toggle) {
    var el = document.getElementById(toggle.id);
    if (el) {
      el.checked = localStorage.getItem(toggle.key) === 'true';
      el.addEventListener('change', function() {
        var hidden = this.checked;
        localStorage.setItem(toggle.key, hidden ? 'true' : 'false');
        var target = document.getElementById(toggle.element);
        if (target) {
          target.style.display = hidden ? 'none' : '';
        }
      });
      // Apply on load
      if (el.checked) {
        var target = document.getElementById(toggle.element);
        if (target) target.style.display = 'none';
      }
    }
  });

  // ========== INIT ==========
  doConvert(true);
});