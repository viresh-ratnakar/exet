/*
MIT License

Copyright (c) 2022 Viresh Ratnakar

See the full Exet license notice in exet.js.

Current version: v0.97, September 16, 2024
*/

/**
 * Code related to managing localStorage and IndexedDB for Exet.
 * localStorage is stored for puzzle revisions state and IndexedDB
 * is used for custom lexicons (word lists).
 */

function ExetRev(id, title, revNum, revType, timestamp, details="") {
  this.id = id;
  this.title = title
  this.revNum = revNum;
  this.revType = revType;
  this.timestamp = timestamp;
  this.details = details;
  // prefix, suffix, exolve should be set directly.
};

function ExetRevManager() {
  this.REV_LOADED_FROM_FILE = 1;
  this.REV_CREATED_BLANK = 2;
  this.REV_CREATED_AUTOBLOCK = 3;
  this.REV_JUMPED_TO_REV = 10;
  this.REV_GRID_CHANGE = 20;
  this.REV_LIGHT_REVERSAL = 24;
  this.REV_AUTOFILL_GRIDFILL_CHANGE = 28;
  this.REV_GRIDFILL_CHANGE = 30;
  this.REV_ENUM_CHANGE = 40;
  this.REV_CLUE_CHANGE = 50;
  this.REV_METADATA_CHANGE = 60;
  this.REV_FILL_OPTIONS_CHANGE = 65;
  this.REV_PREFLEX_CHANGE = 70;
  this.REV_OPTIONS_CHANGE = 80;
  this.REV_RESAVE = 90;

  this.revMsgs = {};
  this.revMsgs[this.REV_LOADED_FROM_FILE] = "Loaded from a file";
  this.revMsgs[this.REV_CREATED_BLANK] = "Created a blank grid";
  this.revMsgs[this.REV_CREATED_AUTOBLOCK] = "Created a blank grid " +
      "with automagic blocks";
  this.revMsgs[this.REV_JUMPED_TO_REV] = "Jumped to a previous revision";
  this.revMsgs[this.REV_GRID_CHANGE] = "Grid change";
  this.revMsgs[this.REV_LIGHT_REVERSAL] = "Light reversal";
  this.revMsgs[this.REV_AUTOFILL_GRIDFILL_CHANGE] = "Autofilled grid-fill " +
      "change";
  this.revMsgs[this.REV_GRIDFILL_CHANGE] = "Grid-fill change";
  this.revMsgs[this.REV_ENUM_CHANGE] = "Enum change";
  this.revMsgs[this.REV_CLUE_CHANGE] = "Clue or anno change";
  this.revMsgs[this.REV_METADATA_CHANGE] = "Metadata change";
  this.revMsgs[this.REV_FILL_OPTIONS_CHANGE] = "Change in options " +
      "for suggested fills";
  this.revMsgs[this.REV_PREFLEX_CHANGE] = "Change in the list of or options " +
      "for preferred words";
  this.revMsgs[this.REV_OPTIONS_CHANGE] = "Crossword options change";
  this.revMsgs[this.REV_RESAVE] = "Resaved (to be safe) with local storage freed up";

  /* State for throttled revision-saving */
  this.throttleRevTimer = null;
  this.saveLagMS = 5000
  this.throttlingLastRev = 0;

  /**
   * Special localStorage key for storing preferences and state,
   * qualified by non-default lexicon properties.
   */
  this.SPECIAL_KEY_PREFIX = '42-exet-42';
  this.SPECIAL_KEY = this.SPECIAL_KEY_PREFIX;
  if ('en' != exetLexicon.language || 'Latin' != exetLexicon.script ||
      1 != exetLexicon.maxCharCodes) {
    this.SPECIAL_KEY += `-${exetLexicon.language}-${exetLexicon.script}` +
                        `-${exetLexicon.maxCharCodes}`;
  }

  /* Id for previews */
  this.previewId = `exet-preview-${Math.random().toString(36).substring(2, 8)}`;
};

ExetRevManager.prototype.skippableKey = function(id) {
  return (id.startsWith(this.SPECIAL_KEY_PREFIX) ||
          id.startsWith('xlvstate:') ||
          id == '42-xlvp-player-state');
}

ExetRevManager.prototype.sizeOfPrefUnpref = function(id) {
  let sz = 0;
  for (isPref of [true, false]) {
    const key = this.keyPrefUnpref(id, isPref);
    let data = window.localStorage.getItem(key);
    if (data) {
      sz += data.length;
    }
  }
  return sz;
}

ExetRevManager.prototype.choosePuzRev = function(manageStorage,
                                                 puz, elt, callback) {
  let choices = [];
  if (puz) {
    let stored = window.localStorage.getItem(puz.id);
    let lsUsed = stored.length + this.sizeOfPrefUnpref(puz.id);
    choices = [{id: puz.id, title: puz.title, space: lsUsed}];
  } else {
    for (let idx = 0; idx < window.localStorage.length; idx++) {
      const id = window.localStorage.key(idx);
      if (this.skippableKey(id)) {
        continue;
      }
      const storedJson = window.localStorage.getItem(id);
      let lsUsed = storedJson.length + this.sizeOfPrefUnpref(id);
      let stored = '';
      try {
        stored = JSON.parse(storedJson);
      } catch (err) {
        console.log('Unparseable stored item for id [' + id + ']:' + storedJson);
        continue;
      }
      if (!stored || !stored["id"] || !stored["revs"] || !stored["maxRevNum"]) {
        console.log('Weird stored item for id [' + id + ']:' + storedJson);
        continue;
      }
      let title = '';
      if (stored.revs.length > 0) {
        title = stored.revs[stored.revs.length - 1].title;
      }
      choices.push({id: stored.id, title: title, space: lsUsed});
    }
  }
  exet.checkStorage();
  let html = `
  <table>
    <tr>
      <td><i>Select puzzle ID/Title</i></td>
      <td>
        <i>Select revision</i>
      </td>
    </tr>
    <tr>
      <td>
        <div class="xet-choices-box" id="xet-choose-id">
          <table class="xet-choices" id="xet-id-choices">`
  for (let i = 0; i < choices.length; i++) {
    html = html + `
      <tr id="xet-id-choice-${i}">
        <td>${choices[i].id}</td>
        <td>${choices[i].title}</td>
        <td>${exet.inMB(choices[i].space)} MB</td></tr>`
  }
  html = html + `
          </table>
        </div>
      </td>
      <td>
        <div class="xet-choices-box" id="xet-choose-rev">
          <table class="xet-choices" id="xet-rev-choices">
          </table>
        </div>
      </td>
    </tr>
    <tr>
      <td colspan="2">
        <div>
          <span>Space used = ${exet.lsUsedSpan.innerText} MB</span>,
          <span>Space available &asymp;
            <span ${exet.lsLeftIsAmple ? '' :
              'class="xet-red"'}>${exet.lsFreeSpan.innerText}</span>
              MB</span>
          <button id="xet-puz-rev-deleter"
            style="float:right;margin: 0 16px; display: none"
            class="xlv-button">Delete rev</button>
          <button id="xet-puz-prior-deleter"
            style="float:right;margin: 0 16px; display: none"
            class="xlv-button">Delete older revs!</button>
          <button id="xet-puz-deleter"
            style="float:right;margin: 0 16px; display: none"
            class="xlv-button">Delete!</button>
          <button id="xet-puz-rev-selector"
            style="float:right;margin: 0 16px; display: none"
            class="xlv-button">Open</button>
        </div>
        <div id="xet-preview" class="xet-preview">
        </div>
      </td>
    </tr>
  </table>
  `;
  elt.innerHTML = html;
  this.idChoicesBox = document.getElementById('xet-choose-id');
  this.idChoicesBox.style.width = '270px';
  this.idChoicesBox.style.height = '200px';
  this.idChoices = document.getElementById('xet-id-choices');
  this.revChoicesBox = document.getElementById('xet-choose-rev');
  this.revChoicesBox.style.width = '500px';
  this.revChoicesBox.style.height = '200px';
  this.revChoices = document.getElementById('xet-rev-choices');
  this.preview = document.getElementById('xet-preview');
  this.idChoice = '';
  this.revChoice = -1;
  this.puzDeleter = document.getElementById('xet-puz-deleter');
  this.puzPriorDeleter = document.getElementById('xet-puz-prior-deleter');
  this.puzRevDeleter = document.getElementById('xet-puz-rev-deleter');
  this.puzRevSelector = document.getElementById('xet-puz-rev-selector');
  this.manageStorage = manageStorage;
  if (manageStorage) {
    this.puzDeleter.style.display = '';
    this.puzPriorDeleter.style.display = '';
    this.puzRevDeleter.style.display = '';
    this.puzDeleter.disabled = true;
    this.puzPriorDeleter.disabled = true;
    this.puzRevDeleter.disabled = true;
    const deleter = (types, e) => {
      if (!confirm('Are you sure you want to delete ' + types +
                   ' revision(s)?')) {
        return;
      }
      this.idChoices.className = 'xet-choices';
      this.revChoices.className = 'xet-choices';
      if (types == 'all') {
        window.localStorage.removeItem(this.idChoice);
        window.localStorage.removeItem(
            this.keyPrefUnpref(this.idChoice, true));
        window.localStorage.removeItem(
            this.keyPrefUnpref(this.idChoice, false));
      } else {
        if (this.revChoice < 0 || !this.storedRevs ||
            this.storedRevs.revs.length == 0 ||
            this.revChoice >= this.storedRevs.revs.length) {
          console.log('Weird, did not find revChoice/storedRevs to delete from');
          return;
        }
        let lastToDelete = this.revChoice;
        if (types == 'prior') lastToDelete--;
        let numToDelete = (types == 'prior' ? lastToDelete + 1 : 1);
        let newRevs = [];
        if (lastToDelete - numToDelete >= 0) {
          newRevs = this.storedRevs.revs.slice(
              0, lastToDelete - numToDelete + 1);
        }
        this.storedRevs.revs = newRevs.concat(
            this.storedRevs.revs.slice(lastToDelete + 1));
        this.saveLocal(this.idChoice, JSON.stringify(this.storedRevs));
        this.savePrefUnpref(this.idChoice, this.storedRevs.revs, true);
      }
      this.choosePuzRev(true, null, exet.revChooser, null);
      e.stopPropagation();
    }
    this.puzDeleter.addEventListener('click', deleter.bind(this, 'all'));
    this.puzPriorDeleter.addEventListener('click', deleter.bind(this, 'prior'));
    this.puzRevDeleter.addEventListener('click', deleter.bind(this, 'this'));
  } else {
    this.puzRevSelector.style.display = '';
    this.puzRevSelector.disabled = true;
    this.puzRevSelector.addEventListener('click', e => {
      if (this.revChoice < 0 || !this.storedRevs ||
          this.storedRevs.revs.length == 0 ||
          this.revChoice >= this.storedRevs.revs.length) {
        console.log('Hmm: bad selection! Check ExetRevManager:');
        console.log(this);
        return;
      }
      exetModals.hide();
      this.idSelectors = [];
      this.revSelectors = [];
      this.preview.innerHTML = '';
      if (exolvePuzzles[this.previewId]) {
        exolvePuzzles[this.previewId].destroy();
      }
      callback(this.storedRevs.revs[this.revChoice]);
    })
  }

  this.idSelectors = [];
  this.revSelectors = [];
  this.storedRevs = null;
  if (puz) {
    this.idChoice = puz.id;
    document.getElementById("xet-id-choice-0").className = 'xet-chosen';
    this.chooseRev();
    return;
  }
  for (let i = 0; i < choices.length; i++) {
    let selector = document.getElementById(`xet-id-choice-${i}`);
    this.idSelectors.push(selector);
    const id = choices[i].id;
    selector.addEventListener('click', e => {
      this.preview.innerHTML = '';
      if (exolvePuzzles[this.previewId]) {
        exolvePuzzles[this.previewId].destroy();
      }
      this.puzDeleter.disabled = true;
      this.puzPriorDeleter.disabled = true;
      this.puzRevDeleter.disabled = true;
      this.revChoices.innerHTML = '';
      this.revChoices.className = 'xet-choices';
      this.revChoice = -1;
      this.revSelectors = [];
      this.storedRevs = null;
      this.puzRevSelector.disabled = true;
      if (id == this.idChoice) {
        this.idChoice = null;
        selector.className = '';
        this.idChoices.className = 'xet-choices';
      } else {
        for (let j = 0; j < choices.length; j++) {
          if (j != i) {
            this.idSelectors[j].className = '';
          }
        }
        this.idChoice = id;
        this.puzDeleter.disabled = false;
        selector.className = 'xet-chosen';
        this.idChoices.className = 'xet-choices xet-picked';
        this.chooseRev();
      }
    })
  }
};

ExetRevManager.prototype.chooseRev = function() {
  let stored = window.localStorage.getItem(this.idChoice);
  if (!stored) {
    return;
  }
  this.storedRevs = JSON.parse(stored);
  let html = '';
  for (let idx = this.storedRevs.revs.length - 1; idx >= 0; idx--) {
    let rev = this.storedRevs.revs[idx];
    let revTime = new Date(rev.timestamp);
    html = html + `
      <tr id="xet-rev-choice-${idx}">
        <td>${rev.title}</td>
        <td>#${rev.revNum}</td>
        <td>${revTime.toLocaleString()}</td>
        <td>${exetRevManager.revMsgs[rev.revType]}</td>
        <td>${rev.details}</td>
      </tr>`;
  }
  this.revChoices.innerHTML = html;
  this.revSelectors = [];
  this.revChoice = -1;
  for (let i = 0; i < this.storedRevs.revs.length; i++) {
    let selector = document.getElementById(`xet-rev-choice-${i}`);
    this.revSelectors.push(selector);
    selector.addEventListener('click', e => {
      if (!this.storedRevs) {
        return;
      }
      this.puzPriorDeleter.disabled = true;
      this.puzRevDeleter.disabled = true;
      this.puzRevSelector.disabled = true;
      this.preview.innerHTML = '';
      if (exolvePuzzles[this.previewId]) {
        exolvePuzzles[this.previewId].destroy();
      }
      if (i == this.revChoice) {
        this.revChoice = -1;
        selector.className = '';
        this.revChoices.className = 'xet-choices';
      } else {
        for (let j = 0; j < this.revSelectors.length; j++) {
          if (j != i) {
            this.revSelectors[j].className = '';
          }
        }
        this.revChoice = i;
        selector.className = 'xet-chosen';
        this.revChoices.className = 'xet-choices xet-picked';
        let exolve = this.storedRevs.revs[i].exolve.replace(
            /exolve-id:[^\n]*/, `exolve-id: ${this.previewId}`);
        exet.renderPreview(exolve, "xet-preview");
        this.puzPriorDeleter.disabled = (i <= 0);
        this.puzRevDeleter.disabled = false;
        this.puzRevSelector.disabled = false;
      }
    });
  }
};

ExetRevManager.prototype.saveLocal = function(k, v) {
  try {
    window.localStorage.setItem(k, v);
  } catch (err) {
    this.checkStorage();
    alert('No available local storage left. Please use the ' +
          '"Manage local storage" menu option to free up some space.');
    console.log('Could not save value of length ' + v.length + ' for key: ' + k)
    return false;
  }
  return true;
}

ExetRevManager.prototype.keyPrefUnpref = function(id, isPref) {
  return this.SPECIAL_KEY_PREFIX +
         (isPref ? '-preflex-' : '-unpreflex-') + id;
}

ExetRevManager.prototype.hashPrefUnpref = function(arr) {
  if (!arr || arr.length == 0) {
    return null;
  }
  return exetLexicon.javaHash(JSON.stringify(arr));
}

ExetRevManager.prototype.savePrefUnpref = function(id, revs, doGC=false) {
  const isCurrPuz = (exet.puz && exet.puz.id && exet.puz.id == id);
  console.assert(doGC || isCurrPuz, doGC, isCurrPuz);
  for (isPref of [true, false]) {
    const hashName = isPref ? 'preflexHash' : 'unpreflexHash';
    if (!doGC && isCurrPuz && !exet[hashName]) {
      continue;
    }
    let changed = false;
    const key = this.keyPrefUnpref(id, isPref);
    let data = window.localStorage.getItem(key);
    if (data) {
      data = JSON.parse(data);
    } else {
      data = {};
    }
    if (isCurrPuz && exet[hashName] && !data.hasOwnProperty(exet[hashName])) {
      data[exet[hashName]] = isPref ? exet.preflex : exet.unpreflex;
      changed = true;
    }
    if (doGC) {
      /** Don't use a set for usedHashes to avoid int/str issue! */
      const usedHashes = {};
      if (isCurrPuz && exet[hashName]) {
        usedHashes[exet[hashName]] = true;
      }
      for (const rev of revs) {
        if (rev[hashName]) {
          usedHashes[rev[hashName]] = true;
        }
      }
      for (const hash in data) {
        if (!usedHashes.hasOwnProperty(hash)) {
          delete data[hash];
          changed = true;
        }
      }
    }
    if (changed) {
      if (Object.keys(data).length == 0) {
        window.localStorage.removeItem(key);
      } else {
        this.saveLocal(key, JSON.stringify(data));
      }
    }
  }
}

ExetRevManager.prototype.retrievePrefUnpref = function(rev) {
  for (isPref of [true, false]) {
    const hashName = isPref ? 'preflexHash' : 'unpreflexHash';
    const objName = isPref ? 'preflex' : 'unpreflex';
    let obj = null;
    if (rev[objName]) {
      /** old way */
      obj = rev[objName];
      if (!isPref) {
        const pList = Object.keys(obj);
        obj = [];
        for (const p of pList) {
          if (p < 0 || p >= exetLexicon.lexicon.length) {
            console.log('Skipping out-of-bounds old "unpreflex" entry: ' + p);
            continue;
          }
          obj.push(exetLexicon.getLex(p));
        }
      }
    } else if (rev[hashName]) {
      const key = this.keyPrefUnpref(rev.id, isPref);
      let data = window.localStorage.getItem(key);
      if (data) {
        data = JSON.parse(data);
      } else {
        data = {};
      }
      obj = data[rev[hashName]] || null;
      if (!obj) {
        console.log('Missing data for ' + hashName + ' = ' + rev[hashName]);
      }
    }
    if (!obj) {
      obj = [];
    }
    if (isPref) {
      exet.setPreflex(obj);
    } else {
      exet.setUnpreflex(obj);
    }
  }
}

/**
 * Compare exolve format strings after removing timestamps.
 */
ExetRevManager.prototype.equalExolves = function(x1, x2) {
  const r = /Timestamp: .*/g;
  const x1mod = x1.replaceAll(r, '');
  const x2mod = x2.replaceAll(r, '');
  return x1mod == x2mod;
}

ExetRevManager.prototype.saveRev = function(revType, details="") {
  if (!exet || !exet.puz || !exet.puz.id) {
    console.log('Cannot save revision when there is no puzzle!');
    return;
  }
  let stored = window.localStorage.getItem(exet.puz.id);
  if (!stored) {
    stored = {
      id: exet.puz.id,
      maxRevNum: 0,
      revs: []
    };
  } else {
    stored = JSON.parse(stored);
  }
  /**
   * Do garbage collection of unused pref/unpref data when saving,
   * to catch potentially unsaved versions or when saving preflex
   * data updates.
   */
  const doPrefUnprefGC = (revType == this.REV_RESAVE ||
                          revType == this.REV_PREFLEX_CHANGE);
  this.savePrefUnpref(exet.puz.id, stored.revs, doPrefUnprefGC);

  const exolve = exet.getExolve();
  if (stored.revs.length > 0) {
    const lastRev = stored.revs[stored.revs.length - 1];
    if (this.equalExolves(lastRev.exolve, exolve) &&
        lastRev.prefix == exet.prefix && lastRev.suffix == exet.suffix &&
        lastRev.scratchPad == exet.puz.scratchPad.value &&
        lastRev.hasOwnProperty('preflexHash') && lastRev.preflexHash == exet.preflexHash &&
        lastRev.hasOwnProperty('unpreflexHash') && lastRev.unpreflexHash == exet.unpreflexHash &&
        lastRev.noProperNouns == exet.noProperNouns &&
        lastRev.noStemDupes == exet.noStemDupes &&
        lastRev.tryReversals == exet.tryReversals &&
        lastRev.minpop == exet.minpop &&
        lastRev.hasOwnProperty('requireEnums') && lastRev.requireEnums == exet.requireEnums &&
        lastRev.asymOK == exet.asymOK) {
      return;
    }
  }
  stored.maxRevNum++;
  let exetRev = new ExetRev(exet.puz.id, (exet.puz.title ? exet.puz.title : ''),
                            stored.maxRevNum, revType, Date.now(), details);
  exetRev.maxRevNum = stored.maxRevNum;
  exetRev.prefix = exet.prefix;
  exetRev.suffix = exet.suffix;
  exetRev.exolve = exolve;
  exetRev.scratchPad = exet.puz.scratchPad.value;
  exetRev.navState = [exet.puz.currDir, exet.puz.currRow, exet.puz.currCol];
  exetRev.preflexHash = exet.preflexHash;
  exetRev.unpreflexHash = exet.unpreflexHash;
  exetRev.noProperNouns = exet.noProperNouns;
  exetRev.noStemDupes = exet.noStemDupes;
  exetRev.asymOK = exet.asymOK;
  exetRev.tryReversals = exet.tryReversals;
  exetRev.minpop = exet.minpop;
  exetRev.requireEnums = exet.requireEnums;
  stored.revs.push(exetRev);
  this.saveLocal(exet.puz.id, JSON.stringify(stored));
}

ExetRevManager.prototype.throttledSaveRev = function(revType, details="") {
  let urgent = revType <= 10;
  if (this.throttleRevTimer) {
    clearTimeout(this.throttleRevTimer);
    if (this.throttlingRevType > 0 && revType < this.throttlingRevType) {
      urgent = true
    }
  }
  this.throttleRevTimer = null;
  this.throttlingRevType = 0;
  if (urgent) {
    this.saveRev(revType, details)
    return
  }
  this.throttlingRevType = revType;
  this.throttleRevTimer = setTimeout(() => {
    this.saveRev(revType, details)
    this.throttleRevTimer = null;
    this.throttlingRevType = 0;
  }, this.saveLagMS);
}

ExetRevManager.prototype.saveAllRevisions = function() {
  const storage = {};
  for (let idx = 0; idx < window.localStorage.length; idx++) {
    const id = window.localStorage.key(idx);
    if (this.skippableKey(id)) {
      continue;
    }
    const storedJson = window.localStorage.getItem(id);
    let storedRevs = null;
    try {
      storedRevs = JSON.parse(storedJson);
    } catch (err) {
      console.log('Unparseable stored item for id [' + id + ']:' + storedJson);
      continue;
    }
    if (!storedRevs || !storedRevs['revs']) {
      console.log('Weird stored item for id [' + id + ']:' + storedJson);
      continue;
    }
    storage[id] = storedRevs;
    this.savePrefUnpref(id, storedRevs.revs, true);
    for (isPref of [true, false]) {
      const key = this.keyPrefUnpref(id, isPref);
      const data = window.localStorage.getItem(key);
      if (data) {
        storage[key] = JSON.parse(data);
      }
    }
  }
  const json = JSON.stringify(storage, null, 2);
  const filename = `exet-backup-${(new Date()).toISOString()}.json`;
  Exolve.prototype.fileDownload(json, "text/json", filename);

  exetState.lastBackup = Date.now();
  exetRevManager.saveLocal(exetRevManager.SPECIAL_KEY,
                           JSON.stringify(exetState));
  exet.checkStorage();
  exetModals.hide();
}

ExetRevManager.prototype.mergeRevisionsFile = function() {
  exetModals.hide();
  let fr = new FileReader(); 
  fr.onload = function(){ 
    let allSavedRevs = {}
    try {
      allSavedRevs = JSON.parse(fr.result);
    } catch (err) {
      alert('Could not parse the saved revisions file');
      return;
    }
    existingRevs = {};
    for (let idx = 0; idx < window.localStorage.length; idx++) {
      const id = window.localStorage.key(idx);
      if (exetRevManager.skippableKey(id)) {
        continue;
      }
      const storedJson = window.localStorage.getItem(id);
      let storedRevs = null;
      try {
        storedRevs = JSON.parse(storedJson);
      } catch (err) {
        console.log('Unparseable stored item for id [' + id + ']:' + storedJson);
        continue;
      }
      if (!storedRevs || !storedRevs['revs']) {
        console.log('Weird stored item for id [' + id + ']:' + storedJson);
        continue;
      }
      for (rev of storedRevs['revs']) {
        const revHash = exetLexicon.javaHash(JSON.stringify(rev));
        existingRevs[revHash] = true;
      }
    }
    let numRevs = 0;
    let numRevsMerged = 0;
    let numDupRevs = 0;
    let numNonLatest = 0;
    const mergeOnlyLatest = document.getElementById(
      'xet-merge-only-latest-revs').checked ? true : false;
    for (let id in allSavedRevs) {
      if (id.startsWith(this.SPECIAL_KEY_PREFIX)) {
        continue;
      }
      savedRevs = allSavedRevs[id]['revs'];
      if (!savedRevs || savedRevs.length == 0) {
        continue;
      }
      const start = mergeOnlyLatest ? savedRevs.length - 1 : 0;
      if (mergeOnlyLatest) {
        numNonLatest += savedRevs.length - 1;
      }
      revsToSplice = [];
      for (let i = start; i < savedRevs.length; i++) {
        numRevs++;
        const rev = savedRevs[i];
        const revHash = exetLexicon.javaHash(JSON.stringify(rev));
        if (existingRevs[revHash]) {
          numDupRevs++;
          continue;
        }
        revsToSplice.push(rev);
      }
      if (revsToSplice.length == 0) {
        continue;
      }
      let stored = window.localStorage.getItem(id);
      const prefKey = exetRevManager.keyPrefUnpref(id, true);
      let storedPref = window.localStorage.getItem(prefKey);
      const unprefKey = exetRevManager.keyPrefUnpref(id, true);
      let storedUnpref = window.localStorage.getItem(unprefKey);
      try {
        if (stored) {
          stored = JSON.parse(stored);
        }
        if (storedPref) {
          storedPref = JSON.parse(storedPref);
        }
        if (storedUnpref) {
          storedUnpref = JSON.parse(storedUnpref);
        }
      } catch (err) {
        console.log('Skipped id in merging as JSON.parse() failed, id: ' + id);
        continue;
      }
      if (!stored) {
        stored = { id: id, maxRevNum: 0, revs: [] };
      }
      if (!storedPref) {
        storedPref = {};
      }
      if (!storedUnpref) {
        storedUnpref = {};
      }
      let addedPref = false;
      let addedUnpref = false;
      for (rev of revsToSplice) {
        stored['revs'].push(rev);
        if (rev.preflexHash && allSavedRevs[prefKey] &&
            allSavedRevs[prefKey][rev.preflexHash]) {
          storedPref[rev.preflexHash] = allSavedRevs[prefKey][rev.preflexHash];
          addedPref = true;
        }
        if (rev.unpreflexHash && allSavedRevs[unprefKey] &&
            allSavedRevs[unprefKey][rev.unpreflexHash]) {
          storedUnpref[rev.unpreflexHash] = allSavedRevs[unprefKey][rev.unpreflexHash];
          addedUnpref = true;
        }
      }
      stored['revs'].sort((r1, r2) => r1.timestamp - r2.timestamp);
      for (rev of stored['revs']) {
        if (rev.revNum > stored.maxRevNum) {
          stored.maxRevNum = rev.revNum;
        }
      }
      if (!exetRevManager.saveLocal(id, JSON.stringify(stored))) {
        break;
      }
      if (addedPref &&
          !exetRevManager.saveLocal(prefKey, JSON.stringify(storedPref))) {
        break;
      }
      if (addedUnpref &&
          !exetRevManager.saveLocal(unprefKey, JSON.stringify(storedUnpref))) {
        break;
      }
      numRevsMerged += revsToSplice.length;
    }
    const ignored = (numNonLatest > 0) ?
        `Ignored ${numNonLatest} non-latest revisions.` : '';
    alert(`From ${numRevs} revisions considered across ` +
          `${Object.keys(allSavedRevs).length} crosswords, merged ` +
          `${numRevsMerged} revisions. There were ${numDupRevs} revisions ` +
          `that already existed. ${ignored}`);
  } 
  const f = document.getElementById('xet-merge-revs-file').files[0];
  fr.readAsText(f);
}

ExetRevManager.prototype.autofree = function() {
  this.saveAllRevisions();

  const SAVE_LAST_THESE_MANY = 25;
  const SAVE_LAST_THESE_MANY_HOURS = 1;

  const tsCutoffMillis =
    Date.now() - (SAVE_LAST_THESE_MANY_HOURS * 60 * 60 * 1000);

  let bytesUsed = 0;
  let itemsPurged = 0;
  for (let idx = 0; idx < window.localStorage.length; idx++) {
    const id = window.localStorage.key(idx);
    const storedJson = window.localStorage.getItem(id);
    bytesUsed += storedJson.length;
    if (this.skippableKey(id)) {
      continue;
    }
    let stored = '';
    try {
      stored = JSON.parse(storedJson);
    } catch (err) {
      console.log('Unparseable stored item for id [' + id + ']:' + storedJson);
      continue;
    }
    if (!stored || !stored["id"] || !stored["revs"] || !stored["maxRevNum"]) {
      console.log('Weird stored item for id [' + id + ']:' + storedJson);
      continue;
    }
    const revs = stored.revs;
    if (revs.length <= 0) {
      console.log('No revisions in crossword with id ' + id + ': should be deleted');
      continue;
    }
    const limit = revs.length - SAVE_LAST_THESE_MANY;
    const revsToKeep = [];
    for (let r = 0; r < revs.length; r++) {
      const rev = revs[r];
      revsToKeep.push(rev);
      if ((r < limit) &&
          ((r % 2) == 1) &&
          (rev.timestamp < tsCutoffMillis)) {
        revsToKeep.pop();
        itemsPurged++;
      }
    }
    if (revsToKeep.length < revs.length) {
      stored.revs = revsToKeep;
      this.saveLocal(id, JSON.stringify(stored));
      this.savePrefUnpref(id, stored.revs, true);
    }
  }
  /**
   * Call checkStorage() to update displayed numbers/warnings, and to
   * get the return value from checkLocalStorage().
   */
  const ampleLeft = exet.checkStorage();
  if (itemsPurged == 0 && !ampleLeft) {
    alert('Auto-Free could not find any old revisions to purge, and you ' +
          'are running very low on available storage. This probably means ' +
          'that you have excessively many active crosswords. Use the ' +
          '"Manage local storage" menu option to manually delete some old ' +
          'crosswords, perhaps.');
  }
}

