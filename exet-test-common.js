/*
MIT License

See the full Exet license notice in exet.js.
*/

/**
 * Shared helpers for the exet-test-*.html manual/semi-automated test pages.
 *
 * Load this FIRST (before exolve-m.js and exet.js), then call
 * ExetTest.setup({...}) in a following inline <script> to install a tiny
 * synthetic lexicon and exetConfig. Then register tests with ExetTest.add()
 * (in a script placed after the #xet-test-panel div) and call
 * ExetTest.start().
 *
 * What this gives you:
 *
 *  - An in-memory window.localStorage replacement, installed before Exet
 *    starts, so that running tests can never touch your real saved
 *    crosswords (add ?realstorage to the URL to disable this).
 *  - alert()/confirm() capture, so that a test that triggers an alert does
 *    not block the run. Each test gets the captured messages in t.alerts.
 *  - ExetTest.setup(): a synthetic lexicon builder (any word list, optionally
 *    with multi-character letters such as "CH").
 *  - ExetTest.loadSpecs(): loads an Exolve spec through Exet's real
 *    exetLoadFile() code path.
 *  - A tiny test runner/reporter (pass / FAIL / info rows).
 *  - Reporting of results to a parent window (see exet-test-all.html).
 *
 * Pages that only need the in-memory localStorage (no ExetTest.setup() or
 * tests of their own) can just include this file first.
 */
var ExetTest = (function() {
  const params = new URLSearchParams(window.location.search);

  /** ---------- In-memory localStorage ---------- */

  function MemStorage(quotaChars) {
    this.map = new Map();
    this.quotaChars = quotaChars;
  }
  MemStorage.prototype.used = function() {
    let n = 0;
    for (const [k, v] of this.map) n += k.length + v.length;
    return n;
  };
  Object.defineProperty(MemStorage.prototype, 'length', {
    get: function() { return this.map.size; }
  });
  MemStorage.prototype.key = function(i) {
    const keys = Array.from(this.map.keys());
    return (i >= 0 && i < keys.length) ? keys[i] : null;
  };
  MemStorage.prototype.getItem = function(k) {
    k = String(k);
    return this.map.has(k) ? this.map.get(k) : null;
  };
  MemStorage.prototype.setItem = function(k, v) {
    k = String(k);
    v = String(v);
    const old = this.map.has(k) ? (k.length + this.map.get(k).length) : 0;
    if (this.quotaChars && this.used() - old + k.length + v.length > this.quotaChars) {
      const err = new Error('QuotaExceededError (simulated by ExetTest)');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.map.set(k, v);
  };
  MemStorage.prototype.removeItem = function(k) {
    this.map.delete(String(k));
  };
  MemStorage.prototype.clear = function() {
    this.map.clear();
  };

  let usingMemStorage = false;
  if (!params.has('realstorage')) {
    try {
      Object.defineProperty(window, 'localStorage', {
        value: new MemStorage(5000000),
        configurable: true,
      });
      usingMemStorage = (window.localStorage instanceof MemStorage);
    } catch (err) {
      console.log('ExetTest: could not install in-memory localStorage: ' + err);
    }
  }

  /** ---------- Synthetic lexicon ---------- */

  /**
   * opts.words: array of UPPERCASE words, most popular first.
   * opts.multi: optional array of multi-character letters, e.g. ['CH', 'LL'].
   */
  function makeLexicon(words, multi) {
    multi = multi || [];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').concat(multi);
    const maxCharCodes = multi.reduce((m, x) => Math.max(m, x.length), 1);
    const letterSet = new Set(letters);
    const numLetters = (w) => {
      let n = 0;
      let i = 0;
      while (i < w.length) {
        let took = 1;
        for (let len = maxCharCodes; len >= 1; len--) {
          if (letterSet.has(w.substr(i, len))) { took = len; break; }
        }
        i += took;
        n++;
      }
      return n;
    };
    const lex = {
      id: 'exet-test-lexicon-v1',
      stemsId: 'exet-test-lexicon-v1',
      language: 'en',
      script: 'Latin',
      maxCharCodes: maxCharCodes,
      letters: letters,
      lexicon: [''],
      scores: [0],
      stems: [0],
      index: {},
      phones: [[]],
      phindex: [[]],
      anagrams: [[]],
    };
    const n = words.length;
    for (let i = 0; i < n; i++) {
      const idx = i + 1;
      lex.lexicon.push(words[i]);
      lex.scores.push(Math.max(1, 99.9 - i * (98 / Math.max(1, n))));
      lex.stems.push(idx);  /* Each word is its own stem group */
      lex.phones.push([]);
      const key = '?'.repeat(numLetters(words[i]));
      (lex.index[key] = lex.index[key] || []).push(idx);
      lex.anagrams[0].push(idx);
    }
    return lex;
  }

  function setup(opts) {
    opts = opts || {};
    const multi = opts.multi || [];
    const lex = makeLexicon(opts.words || [], multi);
    window.exetConfig = {
      language: 'en',
      script: 'Latin',
      maxCharCodes: lex.maxCharCodes,
      defaultDimension: opts.dim || 5,
      defaultPopularity: 0,
      researchTools: [],
      extraTabs: [],
      listsLinks: [],
    };
    window.exetLexicon = lex;
  }

  /** ---------- Small utilities ---------- */

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function until(pred, timeoutMs, what) {
    timeoutMs = timeoutMs || 3000;
    const t0 = Date.now();
    return new Promise((resolve, reject) => {
      const poll = () => {
        let ok = false;
        try { ok = pred(); } catch (e) { ok = false; }
        if (ok) {
          resolve();
        } else if (Date.now() - t0 > timeoutMs) {
          reject(new Error('Timed out waiting for: ' + (what || 'condition')));
        } else {
          setTimeout(poll, 25);
        }
      };
      poll();
    });
  }

  /**
   * True while Exet is running a background "frozen UI" job, such as the
   * automagic block placement that Exet runs when it starts with a new blank
   * grid. Such jobs rebuild the puzzle on timers, so tests must not start
   * (or continue) while one is running.
   */
  function busy() {
    return !!(exetModals && exetModals.freezeUnfreezeTimer);
  }

  /** Resolves once Exet has created its first puzzle and menus, and is idle. */
  function whenReady() {
    return until(
      () => exet && exet.puz && document.getElementById('xet-file') && !busy(),
      30000, 'Exet to initialize and become idle');
  }

  /**
   * Generates Exolve specs for an open (no blocks) w x h grid with all-light
   * unfilled cells, and placeholder clues with enums. Cells are numbered in
   * reading order: row-0 cells are 1..w (each starts a Down), and the
   * starts of Across lights in rows 1.. are w+1.. . Clue indices in Exet will
   * be A1, A(w+1)..., and D1..D(w).
   * opts.language: optional exolve-language value, e.g. 'en Latin 2'.
   * opts.gridRows: optional array of w-character strings (letters or '?'),
   * giving the pre-filled letters of each row.
   * opts.clueText: optional {'A1': 'Clue text (5) [SOLUTION] anno', ...}
   * overriding the text (after the label) of individual clues.
   */
  function openGridSpecs(id, w, h, opts) {
    opts = opts || {};
    let grid = '';
    for (let i = 0; i < h; i++) {
      const row = opts.gridRows && opts.gridRows[i];
      grid += '\n  ' + (row ? row.split('').join(' ') : '? '.repeat(w).trim());
    }
    const text = opts.clueText || {};
    let across = '';
    for (let r = 0; r < h; r++) {
      const label = (r == 0 ? 1 : w + r);
      across += `\n  ${label} ${text['A' + label] || `Across row ${r} (${w})`}`;
    }
    let down = '';
    for (let c = 0; c < w; c++) {
      down += `\n  ${c + 1} ${text['D' + (c + 1)] || `Down column ${c} (${h})`}`;
    }
    const lang = opts.language ? `\n  exolve-language: ${opts.language}` : '';
    return `exolve-begin
  exolve-id: ${id}
  exolve-title: ${opts.title || 'Test crossword'}
  exolve-setter: ExetTest${lang}
  exolve-width: ${w}
  exolve-height: ${h}
  exolve-grid: ${grid}
  exolve-across: ${across}
  exolve-down: ${down}
exolve-end
`;
  }

  /**
   * Loads Exolve specs through Exet's real exetLoadFile() path (the same
   * code that runs when you use Open > Open Exolve/.puz/.ipuz file).
   * Resolves when the puzzle with the id in the specs is current.
   */
  function loadSpecs(specs, fileName) {
    const m = /exolve-id:\s*(\S+)/.exec(specs);
    const id = m ? m[1] : null;
    const input = document.getElementById('xet-file');
    const file = new File([specs], fileName || 'exet-test.xlv',
                          {type: 'text/plain'});
    Object.defineProperty(input, 'files', {value: [file], configurable: true});
    exetLoadFile();
    return until(() => exet.puz && (!id || exet.puz.id == id), 5000,
                 'puzzle ' + id + ' to load');
  }

  /** Feeds a text/blob to the Open-file handler without waiting for a load. */
  function loadFileNoWait(text, fileName) {
    const input = document.getElementById('xet-file');
    const file = new File([text], fileName || 'exet-test.txt',
                          {type: 'text/plain'});
    Object.defineProperty(input, 'files', {value: [file], configurable: true});
    exetLoadFile();
    return sleep(300);
  }

  /** Makes the Open-file input look like the user cancelled the dialog. */
  function loadFileCancelled() {
    const input = document.getElementById('xet-file');
    Object.defineProperty(input, 'files', {value: [], configurable: true});
    exetLoadFile();
  }

  /** Sets the "merge revisions" file input to the given text and merges. */
  function mergeRevisionsText(text, onlyLatest) {
    const input = document.getElementById('xet-merge-revs-file');
    const file = new File([text], 'exet-backup.json', {type: 'text/json'});
    Object.defineProperty(input, 'files', {value: [file], configurable: true});
    document.getElementById('xet-merge-only-latest-revs').checked = !!onlyLatest;
    exetRevManager.mergeRevisionsFile();
    return sleep(300);
  }

  /** ---------- Test registry and runner ---------- */

  const tests = [];
  const results = [];

  function add(name, fn) {
    tests.push({name: name, fn: fn});
  }

  function makeT(alerts) {
    const t = {rows: [], alerts: alerts};
    t.ok = (cond, msg) => { t.rows.push({s: cond ? 'pass' : 'fail', msg: msg}); };
    t.eq = (actual, expected, msg) => {
      const a = JSON.stringify(actual);
      const e = JSON.stringify(expected);
      const ok = (a === e);
      t.rows.push({s: ok ? 'pass' : 'fail',
                   msg: msg + (ok ? '' : ` (expected ${e}, got ${a})`)});
    };
    t.info = (msg) => { t.rows.push({s: 'info', msg: msg}); };
    return t;
  }

  async function runOne(test) {
    const alerts = [];
    const oldAlert = window.alert;
    const oldConfirm = window.confirm;
    window.alert = (m) => { alerts.push(String(m)); };
    window.confirm = (m) => { alerts.push('[confirm] ' + String(m)); return true; };
    const t = makeT(alerts);
    try {
      await until(() => !busy(), 20000, 'Exet to be idle before the test');
      await test.fn(t);
    } catch (err) {
      t.rows.push({s: 'fail', msg: 'Threw: ' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err)});
    } finally {
      window.alert = oldAlert;
      window.confirm = oldConfirm;
    }
    return {name: test.name, rows: t.rows};
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render() {
    const out = document.getElementById('xet-test-results');
    if (!out) return;
    let pass = 0, fail = 0, info = 0;
    let html = '';
    for (const r of results) {
      const p = r.rows.filter(x => x.s == 'pass').length;
      const f = r.rows.filter(x => x.s == 'fail').length;
      const i = r.rows.filter(x => x.s == 'info').length;
      pass += p; fail += f; info += i;
      html += `<details ${f ? 'open' : ''}><summary style="cursor:pointer">` +
        `<b style="color:${f ? '#c00' : '#080'}">${f ? 'FAIL' : 'ok'}</b> ` +
        `${esc(r.name)} <span style="color:#666">(${p} passed, ${f} failed` +
        `${i ? ', ' + i + ' info' : ''})</span></summary><ul style="margin:2px 0 6px">`;
      for (const row of r.rows) {
        const color = row.s == 'pass' ? '#080' : (row.s == 'fail' ? '#c00' : '#06c');
        const label = row.s == 'pass' ? 'pass' : (row.s == 'fail' ? 'FAIL' : 'info');
        html += `<li><b style="color:${color}">${label}</b> ${esc(row.msg)}</li>`;
      }
      html += '</ul></details>';
    }
    out.innerHTML = html;
    const sum = document.getElementById('xet-test-summary');
    if (sum) {
      sum.innerHTML = `<b style="color:${fail ? '#c00' : '#080'}">` +
        `${pass} passed, ${fail} failed</b>` +
        (info ? `, ${info} informational` : '') +
        ` &nbsp;(${results.length} of ${tests.length} tests run)`;
    }
  }

  /**
   * When this page is running inside a frame (as it does under
   * exet-test-all.html), sends the results to the parent window. We use
   * postMessage because browsers do not let file:// pages read each other's
   * windows directly.
   */
  function report() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          source: 'exet-test',
          page: window.location.pathname.split('/').pop() + window.location.search,
          results: JSON.parse(JSON.stringify(results)),
        }, '*');
      }
    } catch (err) {
      console.log('ExetTest: could not report results to the parent window: ' + err);
    }
  }

  async function runAll() {
    results.length = 0;
    const btn = document.getElementById('xet-test-run');
    if (btn) btn.disabled = true;
    render();
    for (const test of tests) {
      results.push(await runOne(test));
      render();
    }
    if (btn) btn.disabled = false;
    ExetTest.done = true;
    report();
    return results;
  }

  const PAGES = [
    ['exet-test-all.html', 'run all tests'],
    ['exet-test-lexicon.html', 'lexicon'],
    ['exet-test-regexps.html', 'regexps'],
    ['exet-test-blank-grids.html', 'blank grids'],
    ['exet-test-blank-grids.html?multi=1', 'blank grids (multi-letter)'],
    ['exet-test-load-and-format.html', 'load/format'],
    ['exet-test-storage.html', 'storage'],
    ['exet-test-autofill.html', 'autofill'],
    ['exet-test-multichar.html', 'multichar'],
  ];

  /** Renders the header panel into #xet-test-panel. */
  function panel(title, introHtml) {
    const el = document.getElementById('xet-test-panel');
    if (!el) return;
    const links = PAGES.map(p => `<a href="${p[0]}">${p[1]}</a>`).join(' | ');
    el.style.cssText = 'background:#eef;padding:8px;margin-bottom:8px;' +
      'font-family:monospace;font-size:13px;border:1px solid #99c;' +
      'max-height:45vh;overflow:auto';
    el.innerHTML = `<b>${esc(title)}</b>
      <button id="xet-test-run" onclick="ExetTest.runAll()">Run automated checks</button>
      <span id="xet-test-summary" style="margin-left:10px"></span>
      <div style="color:#900">${usingMemStorage ?
        '(Using an in-memory localStorage: your real Exet data is not touched.)' :
        '<b>WARNING: using the REAL localStorage. Test puzzles have ids starting with "xet-test-".</b>'}</div>
      <div style="margin:4px 0">${introHtml || ''}</div>
      <div id="xet-test-results"></div>
      <div style="margin-top:4px;color:#555">Other test pages: ${links}</div>`;
  }

  /** Waits for Exet to be ready, draws the panel, optionally auto-runs. */
  async function start(title, introHtml) {
    panel(title, introHtml);
    await whenReady();
    if (params.has('autorun')) {
      await runAll();
    }
  }

  return {
    setup: setup,
    add: add,
    start: start,
    runAll: runAll,
    sleep: sleep,
    until: until,
    whenReady: whenReady,
    busy: busy,
    openGridSpecs: openGridSpecs,
    loadSpecs: loadSpecs,
    loadFileNoWait: loadFileNoWait,
    loadFileCancelled: loadFileCancelled,
    mergeRevisionsText: mergeRevisionsText,
    MemStorage: MemStorage,
    usingMemStorage: usingMemStorage,
    results: results,
    done: false,
  };
})();
