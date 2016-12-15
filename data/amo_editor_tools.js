/* globals ZipInfo */
'use strict';
// en-US, en-GB, etc.
const path = /^\/(?:[^\/]+)\/editors\/(.*)/i.exec(location.pathname)[1];
// Cache up to CACHE_LENGTH items in localStorage[CACHE_STORAGE_KEY]
const CACHE_LENGTH = 500;
const CACHE_STORAGE_KEY = 'robsAmoEditorToolsCache';

if (path.startsWith('queue/')) {
  expandQueueTable();
}

function getSlug(url) {
  let m = /\/editors\/review\/([^\/?#]+)/.exec(url);
  return m && m[1];
}

// cached is sorted by access time - last accessed at front.
function getSlugCache(slug) {
  let cached = localStorage[CACHE_STORAGE_KEY] || '[]';
  try {
    cached = JSON.parse(cached);
  } catch (e) {
  }
  if (!Array.isArray(cached)) {
    cached = [];
  }
  let index = cached.findIndex(o => o.s === slug);
  return [cached, index];
}

function saveForSlug(slug, version, data) {
  let [cached, index] = getSlugCache(slug);
  let item = {s: slug, v: version, d: data};
  if (index === -1) {
    if (cached.length > CACHE_LENGTH) {
      cached.length = CACHE_LENGTH;
    }
  } else {
    cached.splice(index, 1);
  }
  cached.unshift(item);
  localStorage[CACHE_STORAGE_KEY] = JSON.stringify(cached);
}

function readForSlug(slug, version) {
  let [cached, index] = getSlugCache(slug);
  if (index >= 0) {
    let item = cached[index];
    if (item.v === version) {
      return item.d;
    }
  }
}

function formatByteSize(fileSize) {
  // Assume parameter fileSize to be a number
  fileSize = (fileSize+'').replace(/\d(?=(\d{3})+(?!\d))/g, '$&,');
  return fileSize;
}

function fetchAddonInfo(slug, onResult) {
  // For logic of URL, see https://github.com/Rob--W/crxviewer/blob/fb91e4a37de2a4ee36c925076473e5044c982915/src/cws_pattern.js#L36-L62
  let platformIds = [
    3, // Mac
    2, // Linux
    5, // Windows
    7, // Android
  ];
  
  doFetch();
  function doFetch() {
    let platformId = platformIds.shift();
    if (platformId === undefined) {
      onResult(-1, 'Not a zip file');
      return;
    }
    let xpiUrl = `https://addons.mozilla.org/firefox/downloads/latest/${slug}/platform:${platformId}/${slug}.xpi`;
    ZipInfo.getRemoteEntries(xpiUrl, function(entries) {
      if (entries.length === 1) {
        doFetch(); // Invalid zip.
        return;
      }
      let jsSize = 0;       // JS, JSM
      let jsLibSize = 0;    // Known library **names**
      let markupSize = 0;   // HTML, XUL
      let resourceSize = 0; // Images, fonts, CSS
      let miscSize = 0;     // All other things.
      let miscExtSizes = Object.create(null);
      for (let {filename, uncompressedSize} of entries.filter(entry => !entry.directory)) {
        let ext = filename.split('.').pop().toLowerCase();
        // If no extension, use the base name
        ext = ext.split('/').pop();
        if (['js', 'jsm'].includes(ext)) {
          jsSize += uncompressedSize;
          // Some of the files are listed at https://github.com/mozilla/amo-validator/blob/master/validator/testcases/hashes-allowed.txt
          // bootstrap.js is ambiguous: Either bootstrapped add-ons or Twitter Bootstrap.
          if (/jquery|angular|bootstrap|react|backbone|underscore|moment/i.test(filename) && filename !== 'bootstrap.js') {
            jsLibSize += uncompressedSize;
          }
        } else if (['html', 'htm', 'xhtml', 'xul', 'dtd', 'xml'].includes(ext)) {
          markupSize += uncompressedSize;
        } else if ([
          // Images (note: svg is also a font).
          'png', 'jpeg', 'jpg', 'gif', 'bmp', 'ico', 'svg',
          // Fonts
          'woff', 'woff2', 'ttf', 'eot', 'otf',
          // CSS
          'css',
        ].includes(ext)) {
          resourceSize += uncompressedSize;
        } else {
          miscSize += uncompressedSize;
          miscExtSizes[ext] = (miscExtSizes[ext] + uncompressedSize) || uncompressedSize;
        }
      }
      // Sort by extensions, biggest size first.
      let sortedMiscExts = Object.keys(miscExtSizes).sort((extA, extB) => miscExtSizes[extB] - miscExtSizes[extA]);
      let relevantSize = jsSize - jsLibSize;
      let title = [
        'JS (no libraries):  ' + formatByteSize(relevantSize),
        'JS libraries only:  ' + formatByteSize(jsLibSize),
        'Markup (HTML/XUL):  ' + formatByteSize(markupSize),
        'Fonts/img/CSS/...:  ' + formatByteSize(resourceSize),
        'Other file sizes:   ' + formatByteSize(miscSize),
        'Other extensions =  ' + sortedMiscExts.join(', '),
      ].join('\n');
      onResult(relevantSize, title);
    });
  }
}

function expandQueueTable() {
  // First remove existing additions if the add-on was reloaded:
  unpinThis();
  for (let cell of document.querySelectorAll('.robs-amo-editor-tools-cell')) {
    cell.remove();
  }

  let table = document.getElementById('addon-queue');
  let extraHeaderCell = table.tHead.rows[0].insertCell(-1);
  extraHeaderCell.className = 'robs-amo-editor-tools-cell';
  extraHeaderCell.textContent = 'Size';
  let {rows} = table.tBodies[0];
  [].forEach.call(rows, row => {
    let reviewLink = row.querySelector('a[href*="/editors/review/"]');
    let version = reviewLink.querySelector('em').textContent.trim();
    let slug = getSlug(reviewLink.href);
    if (!slug) {
      throw new Error('Slug not found: ' + reviewLink.href);
    }
    let onResult = (relevantSize, title) => {
      // Always save, so that the latest read value is revived and
      // is not deleted when the LRU queue is full.
      saveForSlug(slug, version, {relevantSize, title});
      // Insert before last cell, which seems always empty (styling?).
      let cell = row.insertCell(row.cells.length - 1);
      cell.className = 'robs-amo-editor-tools-cell';
      cell.style.textAlign = 'right';
      cell.style.width = '9ch';
      cell.textContent = formatByteSize(relevantSize);
      var details = document.createElement('div');
      details.className = 'robs-amo-editor-tools-cell-details';
      details.textContent = title;
      cell.appendChild(details);
      cell.onclick = pinThis;
    };
    let cached = readForSlug(slug, version);
    if (cached) {
      onResult(cached.relevantSize, cached.title);
    } else {
      fetchAddonInfo(slug, onResult);
    }
  });

  /* jshint validthis:true */
  function pinThis() {
    // at capture, so this click handler always runs before the cell's click
    // handler.
    document.body.addEventListener('click', unpinThis, true);
    this.classList.add('rob-pinned-this');
  }
  function unpinThis() {
    var pinnedDetails = document.querySelector('.rob-pinned-this');
    if (pinnedDetails) {
      pinnedDetails.classList.remove('rob-pinned-this');
    }
    document.body.removeEventListener('click', unpinThis, true);
  }
}
