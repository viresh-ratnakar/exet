/*
MIT License

Copyright (c) 2022 Viresh Ratnakar

See the full Exet license notice in exet.js.

Current version: v1.01, November 14, 2025
*/

/**
 * ExetDher is an implementation of a double heap that stores the top k
 * candidates in terms of descending scores. A min-heap lets us retain
 * the top-k elements, while a max-heap lets us extract the max element.
 * The candidate objects stored in this (via add()) should have a "score" field.
 * Objects stored in this get a property named "dher" attached to them, for
 * storing some book-keping info.
 */
class ExetDher {
  constructor(lim) {
    this.maxelts = [];
    this.minelts = [];
    this.lim = lim;
    console.assert(lim > 0, lim);
  }
  relimit(lim) {
    console.assert(lim > 0, lim);
    const extra = this.minelts.length - lim;
    for (let i = 0; i < extra; i++) {
      this.pop(false, 0);
    }
    this.lim = lim;
  }
  size() {
    return this.maxelts.length;
  }
  limit() {
    return this.lim;
  }
  parent(idx) {
    return idx == 0 ? 0 : (idx - 1) >> 1;
  }
  heapifyUp(inMax, idx) {
    let elts = inMax ? this.maxelts : this.minelts;
    console.assert(idx >= 0 && idx < elts.length, idx, elts.length);
    while (idx > 0) {
      let parent = this.parent(idx);
      if (inMax) {
        if (elts[parent].score >= elts[idx].score) {
          return;
        }
      } else {
        if (elts[parent].score <= elts[idx].score) {
          return;
        }
      }
      const temp = elts[idx];
      elts[idx] = elts[parent];
      elts[parent] = temp;
      elts[idx].dher[inMax] = idx;
      elts[parent].dher[inMax] = parent;
      idx = parent;
    }
  }
  heapifyDown(inMax, idx) {
    let elts = inMax ? this.maxelts : this.minelts;
    console.assert(idx >= 0 && idx < elts.length, idx, elts.length);
    while (idx < elts.length) {
      let lchild = (idx << 1) + 1;
      if (lchild >= elts.length) return;
      let child = lchild;
      let rchild = lchild + 1;
      if (inMax) {
        if (rchild < elts.length &&
            elts[rchild].score > elts[lchild].score) {
          child = rchild;
        }
        if (elts[idx].score >= elts[child].score) return;
      } else {
        if (rchild < elts.length &&
            elts[rchild].score < elts[lchild].score) {
          child = rchild;
        }
        if (elts[idx].score <= elts[child].score) return;
      }
      let temp = elts[idx];
      elts[idx] = elts[child];
      elts[child] = temp;
      elts[idx].dher[inMax] = idx;
      elts[child].dher[inMax] = child;
      idx = child;
    }
  }
  add(candidate) {
    let num = this.minelts.length;
    if (num == this.lim) {
      let worst = this.minelts[0];
      if (candidate.score < worst.score) {
        return;
      }
      if (candidate.score == worst.score) {
        if (Math.random() < 0.5) {
          return;
        }
      }
      this.pop(false);
      num--;
    }
    candidate.dher = {};
    candidate.dher[true] = num;
    candidate.dher[false] = num;
    this.maxelts.push(candidate);
    this.minelts.push(candidate);
    this.heapifyUp(true, num);
    this.heapifyUp(false, num);
  }
  popInner(inMax, idx) {
    const elts = inMax ? this.maxelts : this.minelts;
    const len = elts.length;
    console.assert(len > 0, len);
    const last = elts.pop();
    if (len == 1 || idx >= len - 1) {
      return last;
    }
    /* len > 1 && idx < len - 1 */
    const ret = elts[idx];
    elts[idx] = last;
    last.dher[inMax] = idx;
    const parent = this.parent(idx);
    if (idx > 0 &&
        ((inMax && last.score > elts[parent].score) ||
         (!inMax && last.score < elts[parent].score))) {
      this.heapifyUp(inMax, idx);
    } else {
      this.heapifyDown(inMax, idx);
    }
    return ret;
  }
  pop(inMax, idx=0) {
    const elts = inMax ? this.maxelts : this.minelts;
    if (idx < 0 || idx >= elts.length) return null;
    const otherIdx = elts[idx].dher[!inMax];
    this.popInner(!inMax, otherIdx);
    return this.popInner(inMax, idx);
  }
  peep(inMax, idx=0) {
    const elts = inMax ? this.maxelts : this.minelts;
    if (idx < 0 || idx >= elts.length) return null;
    return elts[idx];
  }
}

/**
 * A data structure encapsulating clues and a grid, along with available fill
 * choices. Used for figuring out viability, weeding out non-viable choices,
 * and doing autofill. Note that you can initialize this from exet.puz as well
 * as from another ExetFillState.
 */
function ExetFillState(obj) {
  this.gridWidth = obj.gridWidth;
  this.gridHeight = obj.gridHeight;
  this.grid = new Array(this.gridHeight);
  this.viable = obj.viable ?? true;
  for (let i = 0; i < this.gridHeight; i++) {
    this.grid[i] = new Array(this.gridWidth);
    for (let j = 0; j < this.gridWidth; j++) {
      const gridCell = obj.grid[i][j];
      this.grid[i][j] = { ...gridCell };
      const thisCell = this.grid[i][j];
      for (const prop in thisCell) {
        if (thisCell[prop] instanceof Node) {
          delete thisCell[prop];
        }
      }
      if (!thisCell.isLight) {
        continue;
      }
      if (!thisCell.cChoices) {
        thisCell.cChoices = {};
      }
    }
  }
  this.clues = {};
  for (let ci in obj.clues) {
    const theClue = obj.clues[ci];
    this.clues[ci] = { ...theClue };
    const thisClue = this.clues[ci];
    for (const prop in thisClue) {
      if (thisClue[prop] instanceof Node) {
        delete thisClue[prop];
      }
    }
    if (!thisClue.childrenClueIndices) {
      thisClue.childrenClueIndices = [];
    }
    if (!thisClue.lChoices) {
      thisClue.lChoices = [];
    }
    if (!thisClue.lRejects) {
      thisClue.lRejects = [];
    }
  }
  this.delta = [];

  /** preflexUsed and numPreflexUsed are updated in exet.refineLightChoices() */
  this.preflexUsed = obj.preflexUsed || {};
  this.numPreflexUsed = obj.numPreflexUsed || 0;
}

ExetFillState.prototype.markClueEnds = function() {
  for (let r = 0; r < this.gridHeight; r++) {
    for (let c = 0; c < this.gridWidth; c++) {
      const gridCell = this.grid[r][c];
      if (!gridCell.isLight) {
        continue;
      }
      if (gridCell.startsAcrossClue) {
        const last =
            gridCell.startsAcrossClue[gridCell.startsAcrossClue.length - 1];
        const lastCell = this.grid[last[0]][last[1]];
        lastCell.endsAcrossClue = gridCell.startsClueLabel;
      }
      if (gridCell.startsDownClue) {
        const last =
            gridCell.startsDownClue[gridCell.startsDownClue.length - 1];
        const lastCell = this.grid[last[0]][last[1]];
        lastCell.endsDownClue = gridCell.startsClueLabel;
      }
      if (gridCell.startsZ3dClue) {
        const last =
            gridCell.startsZ3dClue[gridCell.startsZ3dClue.length - 1];
        const lastCell = this.grid[last[0]][last[1]];
        lastCell.endsZ3dClue = gridCell.startsClueLabel;
      }
    }
  }
}

/**
 * autofill should be an ExetAutofill object.
 */
ExetFillState.prototype.setScore = function(autofill) {
  this.scoreF = 0;  /* fullness */
  this.scoreV = 0;  /* viability */
  this.scoreP = 0;  /* popularity */
  this.score = 0;

  this.unfilled = [];
  this.lettersUsed = {};
  this.constrLetters = {};
  this.reversals = 0;
  let numEntries = 0;
  for (const ci in this.clues) {
    const theClue = this.clues[ci];
    if (theClue.lChoices.length == 1 && theClue.lChoices[0] < 0) {
      this.reversals++;
    }
    if (!theClue.parentClueIndex) {
      let scoreP = 0;
      /* we use popularity of the first choice */
      if (theClue.lChoices.length > 0) {
        let pindex = theClue.lChoices[0];
        if (pindex < 0) pindex = 0 - pindex;
        if (pindex >= exetLexicon.startLen) {
          /* we really prefer preflex entries */
          pindex = 0;
        }
        scoreP = (exetLexicon.startLen - pindex) / exetLexicon.startLen;
      }
      ++numEntries;
      this.scoreP += scoreP;
    }
  }
  if (numEntries > 0) {
    this.scoreP /= numEntries;
  }
  this.score += this.scoreP;
  let numLightCells = 0;
  for (let i = 0; i < this.gridHeight; i++) {
    for (let j = 0; j < this.gridWidth; j++) {
      const fillCell = this.grid[i][j];
      if (!fillCell.isLight) {
        continue
      }
      numLightCells++;
      if (fillCell.solution != '?' || fillCell.currLetter != '?') {
        let c = fillCell.solution;
        if (c == '?') {
          c = fillCell.currLetter;
        }
        console.assert(c, i, j, fillCell);
        this.lettersUsed[c] = true;
        if (this.pangramCell(i, j, autofill)) {
          this.constrLetters[c] = true;
        }
        continue;
      }
      if (fillCell.viability <= 0) {
        this.unfilled.push([i, j, fillCell.viability]);
        this.scoreV = - Number.MAX_VALUE;
        this.score = this.scoreV;
        this.viable = false;
        return;
      }
      this.scoreV += Math.log(fillCell.viability);
      this.unfilled.push([i, j, fillCell.viability]);
    }
  }
  this.numLettersUsed = Object.keys(this.lettersUsed).length;
  const constrUsed = Object.keys(this.constrLetters);
  this.numConstrLetters = constrUsed.length;
  if (numLightCells == 0) {
    return;
  }
  let boost = 0
  if (autofill.boostPangram) {
    for (const c of constrUsed) {
      boost += exetLexicon.letterRarity(c);
    }
  }
  if (autofill.boostPangram &&
      constrUsed.length < exetLexicon.letters.length) {
    // Sort this.unfilled by ascending frequency of unused letter choices,
    // then by ascending viability. But add a little random salt to the rarity,
    // to avoid favouring low-numbered cells.
    for (const x of this.unfilled) {
      if (!this.pangramCell(x[0], x[1], autofill)){
        x.push(0);
        continue;
      }
      const cell = this.grid[x[0]][x[1]];
      const choices = Object.keys(cell.cChoices);
      let maxRarity = 0;
      for (let c of choices) {
        if (this.constrLetters[c]) {
          continue;
        }
        const rarity = exetLexicon.letterRarity(c);
        if (rarity > maxRarity) maxRarity = rarity;
      }
      x.push(maxRarity > 0 ? (maxRarity + 0.1 * Math.random()) : 0);
    }
    this.unfilled.sort((a, b) => a[3] == b[3] ? a[2] - b[2] : b[3] - a[3]);
  } else {
    this.unfilled.sort((a, b) => a[2] - b[2]);
  }
  this.scoreV /= 100;
  this.score += this.scoreV;

  const f = numLightCells - this.unfilled.length;
  const progressWeight = 30;
  this.scoreF = progressWeight * (f + boost) / 100;
  this.score += this.scoreF;
}

/**
 * Is [r,c] a cell to be counted for a constrained pangram?
 * autofill should be an ExetAutofill object.
 */
ExetFillState.prototype.pangramCell = function(r, c, autofill) {
  const gridCell = this.grid[r][c];
  if (!gridCell.isLight) {
    return false;
  }

  if (autofill.pangramAll) {
    return true;
  }
  if (autofill.pangramCircled && gridCell.hasCircle) {
    return true;
  }
  let numLights = 0;
  if (gridCell.acrossClueLabel) numLights++;
  if (gridCell.downClueLabel) numLights++;
  if (gridCell.z3dClueLabel) numLights++;
  if (autofill.pangramChecked && numLights > 1) {
    return true;
  }
  if (autofill.pangramUnchecked && numLights == 1) {
    return true;
  }
  if (!autofill.pangramFirsts && !autofill.pangramLasts) {
    return false;
  }

  const firsts = [];
  if (gridCell.startsAcrossClue) firsts.push('A' + gridCell.startsClueLabel);
  if (gridCell.startsDownClue) firsts.push('D' + gridCell.startsClueLabel);
  if (gridCell.startsZ3dClue) firsts.push('Z' + gridCell.startsClueLabel);
  const lasts = [];
  if (autofill.pangramLasts || exet.tryReversals) {
    if (gridCell.endsAcrossClue) lasts.push('A' + gridCell.endsAcrossClue);
    if (gridCell.endsDownClue) lasts.push('D' + gridCell.endsDownClue);
    if (gridCell.endsZ3dClue) lasts.push('Z' + gridCell.endsZ3dClue);
  }
  if (exet.tryReversals &&
      (!autofill.pangramFirsts || !autofill.pangramLasts)) {
    const realFirsts = [];
    const revFirsts = [];
    for (const ci of firsts) {
      const clue = this.clues[ci];
      if (clue && clue.lChoices.length == 1 && clue.lChoices[0] < 0) {
        revFirsts.push(ci);
      } else {
        realFirsts.push(ci);
      }
    }
    const realLasts = [];
    const revLasts = [];
    for (const ci of lasts) {
      const clue = this.clues[ci];
      if (clue && clue.lChoices.length == 1 && clue.lChoices[0] < 0) {
        revLasts.push(ci);
      } else {
        realLasts.push(ci);
      }
    }
    firsts = realFirsts.concat(revLasts);
    lasts = realLasts.concat(revFirsts);
  }
  if (autofill.pangramFirsts && firsts.length > 0) {
    return true;
  }
  if (autofill.pangramLasts && lasts.length > 0) {
    return true;
  }
  return false;
}

ExetFillState.prototype.isFull = function() {
  return this.unfilled.length == 0;
}

ExetFillState.prototype.hash = function() {
  let fills = '';
  for (let i = 0; i < this.gridHeight; i++) {
    for (let j = 0; j < this.gridWidth; j++) {
      const gridCell = this.grid[i][j];
      if (!gridCell.isLight) continue;
      fills += gridCell.currLetter || '?';
    }
  }
  this.fills = fills;
  return exetLexicon.javaHash(fills);
}

ExetFillState.prototype.getCurrEntry = function(ci) {
  const cells = exet.puz.getAllCells(ci, this.clues);
  let entry = '';
  for (const cell of cells) {
    const gridCell = this.grid[cell[0]][cell[1]];
    entry += gridCell.currLetter;
  }
  return entry;
}

ExetFillState.prototype.hasPatternOfDeath = function() {
  for (let i = 0; i < this.gridHeight; i++) {
    for (let j = 0; j < this.gridWidth; j++) {
      const gridCell = this.grid[i][j];
      if (!gridCell.isLight) continue;
      if (gridCell.currLetter != '?') continue;
      if (!gridCell.acrossClueLabel || !gridCell.downClueLabel) continue;
      let aci = exet.puz.getDirClueIndex('A', gridCell.acrossClueLabel);
      let dci = exet.puz.getDirClueIndex('D', gridCell.downClueLabel);
      console.assert(aci && dci, aci, dci);
      let ac = this.clues[aci];
      if (ac.parentClueIndex) {
        aci = ac.parentClueIndex;
        ac = this.clues[aci];
      }
      let dc = this.clues[dci];
      if (dc.parentClueIndex) {
        dci = dc.parentClueIndex;
        dc = this.clues[dci];
      }
      if (ac.solution != dc.solution) {
        continue;
      }
      const acEntry = this.getCurrEntry(aci);
      const dcEntry = this.getCurrEntry(dci);
      if (acEntry != dcEntry) {
        continue;
      }
      const loc = acEntry.indexOf('?');
      console.assert(loc >= 0, acEntry);
      if (acEntry.substr(0, loc).indexOf('?') >= 0 ||
          acEntry.substr(loc + 1).indexOf('?') >= 0) {
        continue;
      }
      /* Across and down solutions are identical, and have the
       * current cell as the only unfilled cell. This is not
       * fillable!
       */
      return true;
    }
  }
  return false;
}

/**
 * Only set cChoice and lChoice in exet.fillState, so that
 * picked suggesstions can be shown in gray.
 */
ExetFillState.prototype.updateExetFill = function() {
  // Show light-fill suggestions from full lights.
  for (const ci in this.clues) {
    const lChoices = this.clues[ci].lChoices;
    if (lChoices.length != 1) {
      continue;
    }
    const theClue = exet.fillState.clues[ci];
    console.assert(theClue, ci);
    theClue.lChoices = lChoices.slice();
    theClue.lRejects = this.clues[ci].lRejects.slice();
  }
  // Show grid-cell suggestions. 
  for (let row = 0; row < this.gridHeight; row++) {
    for (let col = 0; col < this.gridWidth; col++) {
      const gCell = this.grid[row][col];
      if (!gCell.isLight) {
        continue;
      }
      const choices = gCell.cChoices;
      if (Object.keys(choices).length == 1) {
        exet.fillState.grid[row][col].cChoices = { ...choices };
      }
    }
  }
  exet.updateViablots();
}

/**
 * Use the global "exet" to access the Exet object from ExetAutofill.
 */
function ExetAutofill() {
  this.id = exet.puz.id;
  this.candidates = [];
  this.beamWidth = 64;
  this.beam = new ExetDher(64);
  this.step = 0;
  this.numCells = exet.puz.gridWidth * exet.puz.gridHeight * exet.puz.layers3d;
  this.running = false;
  this.throttledTimer = null;
  this.lag = 200;
  this.msUsed = 0;
  this.status = 'None';
  this.boostPangram = false;
  this.loopForPangram = false;
  this.pangramAll = true;
  this.pangramCircled = false;
  this.pangramChecked = false;
  this.pangramUnchecked = false;
  this.pangramFirsts = false;
  this.pangramLasts = false;
  this.triedHashes = {};

  const analysis = new ExetAnalysis(
      exet.puz.grid, exet.puz.gridWidth, exet.puz.gridHeight, exet.puz.layers3d);
  this.barred = analysis.numBars() > 0;
  this.doublyChecked = analysis.unchequeredOK(false);

  this.accept = document.getElementById("xet-autofill-accept");
  this.clear = document.getElementById("xet-autofill-clear");
  this.startstopButton = document.getElementById("xet-autofill-startstop");

  this.activeDiv = document.getElementById('xet-autofill-active');
  this.activeDivMsg = document.getElementById('xet-autofill-active-msg');

  this.clear.disabled = true;
  this.clear.addEventListener('click', e => {
    this.accept.disabled = true;
    this.clear.disabled = true;
    this.reset('Cleared');
    exet.resetViability();
    this.refreshDisplay();
    this.activeDiv.style.display = 'none';
  })
  this.accept.disabled = true;
  this.accept.addEventListener('click', e => {
    this.accept.disabled = true;
    this.clear.disabled = true;
    exet.acceptAll();
    this.activeDiv.style.display = 'none';
  })
  if (this.running) {
    this.startstopButton.innerText = 'Pause';
    this.startstopButton.className = 'xlv-button xet-pink-button';
  }
  this.startstopButton.addEventListener(
      'click', this.startstop.bind(this));

  this.beamWidthInp = document.getElementById(
      'xet-autofill-max-beam');
  this.beamWidthInp.value = this.beamWidth;

  this.pangramInp = document.getElementById(
      'xet-autofill-boost-pangram');
  this.pangramInp.checked = this.boostPangram;
  this.pangramLoopInp = document.getElementById(
      'xet-autofill-pangram-loop');
  this.pangramLoopInp.checked = this.loopForPangram;

  this.pangramDetails = document.getElementById(
      'xet-autofill-pangram-details');
  this.pangramAllInp = document.getElementById(
      'xet-autofill-pangram-all');
  this.pangramAllInp.checked = this.pangramAll;
  this.pangramCircledInp = document.getElementById(
      'xet-autofill-pangram-circled');
  this.pangramCircledInp.checked = this.pangramCircled;
  this.pangramCheckedInp = document.getElementById(
      'xet-autofill-pangram-checked');
  this.pangramCheckedInp.checked = this.pangramChecked;
  this.pangramUncheckedInp = document.getElementById(
      'xet-autofill-pangram-unchecked');
  this.pangramUncheckedInp.checked = this.pangramUnchecked;
  this.pangramFirstsInp = document.getElementById(
      'xet-autofill-pangram-firsts');
  this.pangramFirstsInp.checked = this.pangramFirsts;
  this.pangramLastsInp = document.getElementById(
      'xet-autofill-pangram-lasts');
  this.pangramLastsInp.checked = this.pangramLasts;
  const pangramOptionsSanitizer = (e) => {
    this.pangramAllInp.checked = 
        (!this.pangramCircledInp.checked &&
         !this.pangramCheckedInp.checked &&
         !this.pangramUncheckedInp.checked &&
         !this.pangramFirstsInp.checked &&
         !this.pangramLastsInp.checked) ||
        (this.pangramCheckedInp.checked &&
         this.pangramUncheckedInp.checked);
  };
  for (const elt of [this.pangramCircledInp,
                   this.pangramCheckedInp,
                   this.pangramUncheckedInp,
                   this.pangramFirstsInp,
                   this.pangramLastsInp]) {
    elt.addEventListener('change', pangramOptionsSanitizer);
  }
  this.pangramAllInp.addEventListener('change', (e) => {
    if (this.pangramAllInp.checked) {
      this.pangramCircledInp.checked = false;
      this.pangramCheckedInp.checked = false;
      this.pangramUncheckedInp.checked = false;
      this.pangramFirstsInp.checked = false;
      this.pangramLastsInp.checked = false;
    } else {
      this.pangramAllInp.checked = 
          (!this.pangramCircledInp.checked &&
           !this.pangramCheckedInp.checked &&
           !this.pangramUncheckedInp.checked &&
           !this.pangramFirstsInp.checked &&
           !this.pangramLastsInp.checked) ||
          (this.pangramCheckedInp.checked &&
           this.pangramUncheckedInp.checked);
    }
  });

  this.stepSpan = document.getElementById('xet-autofill-step');
  this.stepSpan.innerText = this.step;

  this.statusSpan = document.getElementById('xet-autofill-status');
  this.statusSpan.innerHTML = this.status;

  this.timeSpan = document.getElementById('xet-autofill-time');
  this.speedSpan = document.getElementById('xet-autofill-speed');

  this.currBeamSpan = document.getElementById('xet-autofill-curr-beam');
  this.currBeamSpan.innerText = this.beam.limit();

  this.scoreSpan = document.getElementById('xet-autofill-score');
  this.scoreVSpan = document.getElementById('xet-autofill-score-v');
  this.scorePSpan = document.getElementById('xet-autofill-score-p');
  this.scoreFSpan = document.getElementById('xet-autofill-score-f');

  this.reversalsSpan = document.getElementById('xet-autofill-reversals');

  this.preflexTotalSpan = document.getElementById(
      'xet-autofill-preflex-total');
  this.preflexUsedSpan = document.getElementById(
      'xet-autofill-preflex-used');
  this.unpreflexTotalSpan = document.getElementById(
      'xet-autofill-unpreflex-total');
  this.minpopSpan = document.getElementById('xet-autofill-minpop');
  this.indexMinPopSpan = document.getElementById(
      'xet-autofill-index-minpop');
  this.properNounsSpan = document.getElementById(
      'xet-autofill-proper-nouns');
  this.stemDupesSpan = document.getElementById(
      'xet-autofill-stem-dupes');
  this.tryReversalsSpan = document.getElementById(
      'xet-autofill-try-reversals');
  this.pangramSpan = document.getElementById('xet-autofill-letters');
  this.pangramConstrSpan = document.getElementById(
      'xet-autofill-pangram-cletters');
  this.pangramConstrSpan.style.display = 'none';
  this.isPangram = document.getElementById('xet-is-pangram');

  this.refreshDisplay();
}

ExetAutofill.prototype.reset = function(status, longStatus='') {
  this.beam = new ExetDher(this.beamWidth);
  this.step = 0;
  this.msUsed = 0;
  this.triedHashes = {};
  if (!this.running) {
    return;
  }
  if (this.throttledTimer) {
    clearTimeout(this.throttledTimer);
    this.throttledTimer = null;
  }
  this.status = status;
  this.statusSpan.innerHTML = longStatus || status;
  this.activeDivMsg.innerHTML = status;
  this.running = false;
  exet.updateSweepInd();
  this.startstopButton.innerText = 'Start';
  this.startstopButton.className = 'xlv-button';
}

ExetAutofill.prototype.startstop = function() {
  if (!this.running) {
    if (exet.puz.numCellsToFill == exet.puz.numCellsFilled) {
      alert('The grid is already full');
      return;
    }
    const beamWidth = parseInt(this.beamWidthInp.value);
    if (isNaN(beamWidth) || beamWidth <= 0) {
      this.beamWidthInp.value = this.beamWidth;
    } else {
      this.beamWidth = beamWidth;
      this.beam.relimit(beamWidth);
    }
    if (this.beam.size() == 0) {
      const candidate = new ExetFillState(exet.fillState);
      candidate.setScore(this);
      if (!candidate.viable) {
        alert('Autofill will not work on the current grid. Perhaps retry ' +
              'after clearing some constraining lights or modifying the grid?');
        return;
      }
      this.priorityClues = this.getPriorityClues(candidate);
      this.priorityLoop = 0;
      this.beam.add(candidate);
      this.currBeamSpan.innerText = this.beam.size()
    }

    if (exet.viabilityUpdateTimer) {
      clearTimeout(exet.viabilityUpdateTimer);
      exet.viabilityUpdateTimer = null;
    }

    this.reshowSettings();
    this.running = true;
    this.status = 'Running';
    this.accept.disabled = true;
    this.clear.disabled = true;
    exet.sweepIndicator.className = 'xet-sweeping-animated';
    this.startstopButton.innerText = 'Pause';
    this.startstopButton.className = 'xlv-button xet-pink-button';
    this.boostPangram = this.pangramInp.checked;
    this.loopForPangram = this.pangramLoopInp.checked;
    this.pangramAll = this.pangramAllInp.checked;
    this.pangramCircled = this.pangramCircledInp.checked;
    this.pangramChecked = this.pangramCheckedInp.checked;
    this.pangramUnchecked = this.pangramUncheckedInp.checked;
    this.pangramFirsts = this.pangramFirstsInp.checked;
    this.pangramLasts = this.pangramLastsInp.checked;

    if ((this.pangramFirsts && exet.tryReversals) ||
        this.pangramLasts) {
      this.markClueEnds();
    }
    if (this.throttledTimer) {
      clearTimeout(this.throttledTimer);
    }
    this.throttledTimer = setTimeout(() => {
      this.beamSearchStep();
    }, this.lag);
  } else {
    this.running = false;
    exet.updateSweepInd();
    this.startstopButton.innerText = 'Start';
    this.startstopButton.className = 'xlv-button';
    this.status = 'Paused';
    this.accept.disabled = false;
    this.clear.disabled = false;
    clearTimeout(this.throttledTimer);
    this.throttledTimer = null;
  }
  this.statusSpan.innerHTML = this.status;
  this.activeDivMsg.innerHTML = this.status;
  this.activeDiv.style.display = 'block';
}

ExetAutofill.prototype.reshowSettings = function() {
  this.preflexTotalSpan.innerText = exet.preflex.length;
  this.unpreflexTotalSpan.innerText = exet.unpreflex.length;
  this.minpopSpan.innerText = exet.minpop;
  this.indexMinPopSpan.innerText = Number(
      exet.indexMinPop - 1).toLocaleString();
  this.properNounsSpan.innerText = exet.noProperNouns ?
      "disallowed" : "allowed";
  this.stemDupesSpan.innerText = exet.noStemDupes ?
      "disallowed" : "allowed";
  this.tryReversalsSpan.innerText = exet.tryReversals ?
      "allowed" : "disallowed";
}

ExetAutofill.prototype.refreshDisplay = function() {
  this.pangramConstrSpan.style.display =
      this.pangramAll ? 'none' : '';
  this.isPangram.style.display = 'none';

  let candidate = this.beam.peep(true);
  if (!candidate) {
    candidate = new ExetFillState(exet.fillState);
    candidate.setScore(this);
  }
  this.pangramDetails.open = this.boostPangram && !this.pangramAll;
  this.preflexUsedSpan.innerText = candidate.numPreflexUsed;
  this.pangramSpan.innerText = candidate.numLettersUsed;
  this.pangramConstrSpan.innerText =
      `(${candidate.numConstrLetters} in pangram cells)`;
  if (candidate.numLettersUsed == exetLexicon.letters.length) {
    let isPangram = 'Pangram!';
    if (!this.pangramAll &&
        candidate.numConstrLetters == exetLexicon.letters.length) {
      isPangram = 'Pangram <i>with</i> constraints!';;
    }
    this.isPangram.innerHTML = isPangram;
    this.isPangram.style.display = '';
  }
  this.scoreSpan.innerText = candidate.score.toFixed(2);
  this.scoreVSpan.innerText = candidate.scoreV.toFixed(2);
  this.scorePSpan.innerText = candidate.scoreP.toFixed(2);
  this.scoreFSpan.innerText = candidate.scoreF.toFixed(2);
  this.reversalsSpan.innerText = candidate.reversals;
}

ExetAutofill.prototype.getPriorityClues = function(fillState) {
  const pclues = [];
  if (exet.preflex.length == 0) {
    return pclues;
  }
  for (const ci in fillState.clues) {
    const theClue = fillState.clues[ci];
    if (theClue.solution.indexOf('?') < 0) continue;
    if (exet.preflexByLen[theClue.enumLen]) {
      const toTry = {};
      for (const idx of exet.preflexByLen[theClue.enumLen]) {
        toTry[idx] = true;
      }
      pclues.push([ci, toTry]);
    }
  }
  exet.shuffle(pclues);
  return pclues;
}

ExetAutofill.prototype.maybeAddCandidate = function(candidate) {
  if (!candidate.viable) return false;
  const h = candidate.hash();
  if (this.triedHashes[h]) {
    return false;
  }
  this.triedHashes[h] = true;
  if (candidate.hasPatternOfDeath()) {
    return false;
  }
  this.beam.add(candidate);
  return true;
}

ExetAutofill.prototype.addChildren = function() {
  /** How many light choices do we consider for each light: */
  const constrainerLimit = 2000;
  /** How many iterations of refineLightChoices to vet: */
  const refinementSweeps = 2;

  const priorityLoops = 20;
  if (this.priorityClues.length > 0 &&
      this.priorityLoop < priorityLoops) {
    /**
     * We're still doing the first phase of trying to fit the
     * preflex entries.
     */
    this.autofillPriorityClues(refinementSweeps, constrainerLimit);
    ++this.priorityLoop;
    return;
  }
  if (this.beam.size() == 0) {
    return;
  }
  const candidate = this.beam.pop(true);
  if (!candidate || !candidate.unfilled || candidate.unfilled.length == 0) {
    return;
  }

  // Try filling up to "toAdd" cells from the top few
  let toAdd = 1;
  const cellChoices = [];
  if (this.boostPangram &&
      candidate.numConstrLetters < exetLexicon.letters.length) {
    /** prioritize the pangram, pick the top-priority cell */
    cellChoices.push(0);
    toAdd = 0;
  }
  const cellIndexLimit = Math.min(candidate.unfilled.length, 4);
  for (let i = 0; i < toAdd; i++) {
    let cellIndex = Math.floor(Math.random() * cellIndexLimit);
    if (!cellChoices.includes(cellIndex)) {
      cellChoices.push(cellIndex);
    }
  }
  let numChildren = 0;
  const maxChildren = 50;
  for (let cellIndex of cellChoices) {
    const row = candidate.unfilled[cellIndex][0];
    const col = candidate.unfilled[cellIndex][1];
    const cell = candidate.grid[row][col];
    const choices = Object.keys(cell.cChoices);
    for (let c of choices) {
      const child = new ExetFillState(candidate);
      const childCell = child.grid[row][col];
      childCell.cChoices = {};
      childCell.cChoices[c] = true;
      childCell.currLetter = c;
      child.delta = candidate.delta.slice();
      child.delta.push([row, col, c]);
      for (let s = 0; s < refinementSweeps && child.viable; s++) {
        if (!exet.refineLightChoices(child, constrainerLimit)) break;
      }
      if (child.viable) {;
        child.setScore(this);
        if (this.maybeAddCandidate(child)) {
          if (++numChildren >= maxChildren) {
            break;
          }
        }
      }
    }
    if (numChildren >= maxChildren) {
      break;
    }
  }
}

/**
 * Add a candidate to the beam that starts with the base and
 * adds as many preflexes as possible, in random order.
 */
ExetAutofill.prototype.autofillPriorityClues = function(refinementSweeps, constrainerLimit) {
  if (this.priorityClues.length == 0) {
    return;
  }
  const usedP = {};
  const child = new ExetFillState(exet.fillState);
  child.delta = exet.fillState.delta.slice();
  const priClueIndices = {};
  for (let i = 0; i < this.priorityClues.length; i++) {
    priClueIndices[i] = true;
  }
  while (child.viable) {
    const rem = Object.keys(priClueIndices);
    if (rem.length == 0) {
      break;
    }
    const ki = Math.floor(Math.random() * rem.length);
    const idx = rem[ki];
    delete priClueIndices[idx];
    const ciToTry = this.priorityClues[idx];
    const ci = ciToTry[0];
    const theClue = child.clues[ci];
    if (!theClue || !theClue.lChoices || !theClue.lChoices.length) {
      continue;
    }
    const numChoices = theClue.lChoices.length;
    const toTry = ciToTry[1];
    const numToTry = Object.keys(toTry).length;
    for (let i = 0; i < numChoices; i++) {
      const p = theClue.lChoices[i];
      if (toTry[p] && !usedP[p]) {
        const cells = exet.puz.getAllCells(ci, child.clues);
        const entry = exetLexicon.getLex(p);
        let key = exetLexicon.lexkey(entry);
        if (p < 0) key.reverse();
        child.clues[ci].lChoices = [p];
        child.clues[ci].lRejects = [];
        for (let j = 0; j < cells.length; j++) {
          const row = cells[j][0];
          const col = cells[j][1];
          const childCell = child.grid[row][col];
          const c = key[j];
          childCell.cChoices = {};
          childCell.cChoices[c] = true;
          childCell.currLetter = c;
          child.delta.push([row, col, c]);
        }
        usedP[p] = true;
        for (let s = 0; s < refinementSweeps && child.viable; s++) {
          if (!exet.refineLightChoices(child, constrainerLimit)) break;
        }
        break;
      }
    }
  }
  for (let s = 0; s < refinementSweeps && child.viable; s++) {
    if (!exet.refineLightChoices(child, constrainerLimit)) break;
  }
  if (child.viable) {
    child.setScore(this);
    this.maybeAddCandidate(child);
  }
}

ExetAutofill.prototype.beamSearchStep = function() {
  if (this.throttledTimer) {
    clearTimeout(this.throttledTimer);
  }
  if (this.beam.size() == 0) {
    return;
  }
  const startTS = Date.now();
  this.throttledTimer = null;
  this.step++;
  this.stepSpan.innerText = this.step;
  this.addChildren();
  this.currBeamSpan.innerText = this.beam.size();

  this.msUsed += (Date.now()- startTS);
  this.timeSpan.innerText = this.msUsed;
  this.speedSpan.innerText = (this.msUsed / this.step).toFixed(0);
  this.refreshDisplay();

  const best = (this.step > (this.numCells * 3)) ? null : this.beam.peep(true);
  if (best) {
    best.updateExetFill();
    if (best.isFull()) {
      if (this.boostPangram &&
          best.numConstrLetters != exetLexicon.letters.length &&
          this.loopForPangram) {
        this.accept.disabled = true;
        this.clear.disabled = true;
        this.reset('Running', 'Looping for pangram');
        exet.resetViability();
        this.startstop();
      } else {
        this.accept.disabled = false;
        this.clear.disabled = false;
        this.reset('Succeeded!');
      }
    } else {
      this.throttledTimer = setTimeout(() => {
        exet.autofill.beamSearchStep();
      }, this.lag);
    }
  } else {
    this.accept.disabled = true;
    this.clear.disabled = true;
    this.reset('Failed',
               '<span class="xet-red">Failed.</span> ' +
               '<span class="xet-small-action">Do try again; if failure ' +
               'persists, try lowering min popularity score or ' +
               'increasing beam width</span>');
    exet.resetViability();
    this.refreshDisplay();
  }
}

