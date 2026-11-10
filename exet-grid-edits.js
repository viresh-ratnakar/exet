/*
MIT License

Copyright (c) 2022 Viresh Ratnakar

See the full Exet license notice in exet.js.

Functions within the Exet class, related to grid edits (automagic
blocks/bars, mainly).
*/

/**
 * Returns array of pairs: ["row", i] or ["col", j]
 * Note that this only depends on grid dimensions and this.asymOK (so,
 * can be used for different block/bar pattterns for the same-sized
 * grid).
 * Shuffles the results before returning.
 */
Exet.prototype.getMutableRowCols = function() {
  console.assert(this.puz.layers3d == 1, this.puz.layers3d);
  const grid = this.puz.grid;
  const w = this.puz.gridWidth;
  const wLim = this.asymOK ? w : Math.ceil(w / 2);
  const h = this.puz.gridHeight;
  const hLim = this.asymOK ? h : Math.ceil(h / 2);

  const minwhLim = Math.min(wLim, hLim);
  const rowcols = [];
  for (let x = 0; x < minwhLim; x++) {
    rowcols.push(["row", x]);
    rowcols.push(["col", x]);
  }
  for (let i = minwhLim; i < hLim; i++) {
    rowcols.push(["row", i]);
  }
  for (let j = minwhLim; j < wLim; j++) {
    rowcols.push(["col", j]);
  }
  this.shuffle(rowcols);
  return rowcols;
}

/**
 * Returns true if adding a block/bar in the span, at [k1, k2] (or [k2, k1] if
 * !isRow) would create a consecutive set of filled cells that did not
 * previously exist.
 * span[0] = starting index in span, span[1] = #cells in span.
 */
Exet.prototype.createsFullSpan = function(isBlock, isRow, span, k1, k2) {
  const grid = this.puz.grid;
  const [rowStart, colStart] = isRow ? [k1, span[0]] : [span[0], k1];
  const [row, col] = isRow ? [k1, k2] : [k2, k1];
  /**
   * For the dimension that is changing, rowLim/colLim points to 1 past the
   * last cell in the span.
   */
  const [rowLim, colLim] = isRow ? [k1, span[0] + span[1]] : [span[0] + span[1], k1];
  const rIncr = isRow ? 0 : 1;
  const cIncr = isRow ? 1 : 0;
  const offBy1 = isBlock ? 0 : 1;
  const preLen = isRow ? (col - colStart + offBy1) : (row - rowStart + offBy1);
  console.assert(preLen >= offBy1, isBlock, rowStart, row, rowLim, colStart, col, colLim);
  const postLen = isRow ? (colLim - col - 1) : (rowLim - row - 1);
  console.assert(postLen >= offBy1, isBlock, rowStart, row, rowLim, colStart, col, colLim);
  for (const tryPre of [true, false]) {
    const len = tryPre ? preLen : postLen;
    if (len <= 1) continue;
    let full = true, fullSym = !this.asymOK;
    const [rLast, cLast] = tryPre ?
      (isBlock ? [row - rIncr, col - cIncr] : [row, col]) :
      [rowLim - rIncr, colLim - cIncr];
    for (let [r,c] = tryPre ? [rowStart, colStart] : [row + rIncr, col + cIncr];
         (r <= rLast && c <= cLast && (full || fullSym));
         r += rIncr, c += cIncr) {
      const gridCell = grid[r][c];
      if (gridCell.currLetter == '?') {
        full = false;
      }
      if (!this.asymOK) {
        /** For fullness, we have to use sym-loc with divider = '.' */
        const gridSymCell = this.getSymCell(grid, r, c, '.');
        if (gridSymCell.currLetter == '?') {
          fullSym = false;
        }
      }
    }
    if (full || fullSym) {
      return true;
    }
  }
  return false;
}

/**
 * Returns array of [i, j, divider, score] entries, sorted by descending scores.
 * rowcols should be the returned array from getMutableRowCols().
 * Does NOT modify fill.
 */
Exet.prototype.getMutableCells = function(
    fill, analysis, useBlocks, hasUnches, rowcols, limit=0) {
  const grid = fill.grid;
  const offBy1 = useBlocks ? 0 : 1;
  const candidates = new Set;
  const ruledOut = new Set;
  for (const rc of rowcols) {
    const isRow = (rc[0] == "row");
    const divider = useBlocks ? '.' : (isRow ? '|' : '_');
    const k1 = rc[1];
    const spans = isRow ? analysis.acrossSpans(k1) : analysis.downSpans(k1);
    this.shuffle(spans);
    /**
     * minSpan is just an optimization -- it can safely be set to 1 even for
     * useBlocks=true as both Analysis.unchesOK() and Analysis.doublyCheckedOK()
     * enforce the requirements (of min span 4 and 3, respectively).
     */
    const minSpan = useBlocks ? (hasUnches ? 4 : 3) : 1;
    for (const span of spans) {
      /**
       * x represents the offset beyond the start of the span of length L cells
       * where we consider adding a divider.
       * With blocks:
       *   must start at offset = minSpan as len([0,minSpan-1]) == minSpan
       * With bars:
       *   must start at offset = minSpan - 1 as len([0,minSpan-1]) == minSpan
       * With blocks as well as bars:
       *   must end at offset = L - minSpan - 1 as
       *     len([L - minSpan - 1 + 1, L - 1]) == minSpan
       */
      for (let x = minSpan - offBy1; x <= span[1] - minSpan - 1; x++) {
        const k2 = span[0] + x;
        const [row, col] = isRow ? [k1, k2] : [k2, k1];
        const key = JSON.stringify([row, col, divider]);
        if (ruledOut.has(key)) {
          continue;
        }
        const gridCell = grid[row][col];
        const gridSymCell = this.getSymCell(grid, row, col, divider);
        if ((useBlocks &&
              (gridCell.currLetter != '?' ||
                (!this.asymOK && gridSymCell.currLetter != '?'))) ||
            this.createsFullSpan(useBlocks, isRow, span, k1, k2)) {
          ruledOut.add(key);
          candidates.delete(key);
          continue;
        }
        candidates.add(key);
      }
    }
  }
  const mutables = [];
  for (const key of candidates) {
    const [row, col, divider] = JSON.parse(key);
    this.setBarOrBlock(grid, row, col, divider, 'set');
    if (analysis.isConnected() &&
        ((analysis.unchesOK() &&
          (!useBlocks || analysis.maxCollinearBlocksOK()) &&
          (useBlocks ||
            (analysis.barredGridUnchesOK() && analysis.maxCollinearBarsOK()))) ||
         (!hasUnches && analysis.doublyCheckedOK() &&
           analysis.maxCollinearBlocksOK())) &&
        analysis.throughCutsBigEnough()) {
      const child = new ExetFillState(fill);
      child.killInvalidatedClues();
      const score = child.getScoreForGridding();
      if (score > 0) {
        mutables.push([row, col, divider, score]);
      }
    }
    this.setBarOrBlock(grid, row, col, divider, 'unset');
    if (limit > 0 && mutables.length >= limit) {
      break;
    }
  }
  mutables.sort((a, b) => b[3] - a[3]);
  return mutables;
}

/**
 * Also updates puzzle.
 */
Exet.prototype.automagicGridInner = function(
    useBlocks, hasUnches, targetNumLights, targetNumDiv,
    startDivCount, fromEditMenu) {
  console.assert(this.puz.layers3d == 1, this.puz.layers3d);
  const rowcols = this.getMutableRowCols();
  const fill = new ExetFillState(this.puz);
  const analysis = new ExetAnalysis(fill.grid, fill.gridWidth, fill.gridHeight, 1);
  const candidates = this.getMutableCells(
      fill, analysis, useBlocks, hasUnches, rowcols,
      10 /* limit */);
  let numLights = 0;
  let rev = 0;
  let numAdded = 0;
  let row = -1, col = -1, divider = null, score = 0;
  if (candidates.length > 0) {
    /**
     * We look at the top 3 candidates only.
     */
    candidates.length = Math.min(3, candidates.length);
    let randIndex = this.randomIndex(candidates, true /*noSkipping*/);
    [row, col, divider, score] = candidates[randIndex];
    numAdded = this.setBarOrBlock(this.puz.grid, row, col, divider, 'set');
    numLights = this.killInvalidatedClues();
  } else {
    numLights = Object.keys(this.puz.clues).length;
  }
  const divCount = numAdded + (useBlocks ? analysis.numBlocks() : analysis.numBars());
  const done = (numLights >= targetNumLights) || (divCount >= targetNumDiv) ||
               (candidates.length == 0);
  if (done && fromEditMenu) {
    if (divCount == startDivCount) {
      alert('Add automagic blocks/bars: found no candidate cells ' +
            'for adding blocks/bars');
    }
  }
  rev = (fromEditMenu || (divCount > numAdded)) ?
            exetRevManager.REV_GRID_CHANGE :
            (useBlocks ? exetRevManager.REV_CREATED_AUTOBLOCK :
                         exetRevManager.REV_CREATED_AUTOBLOCK);
  this.updatePuzzle(rev);
  if (row >= 0 && col >= 0) {
    this.flashBarOrBlock(row, col, divider);
  }
  return done ? '' :
      ('' + numLights + ' lights, ' +
       divCount + (useBlocks ? ' blocks' : ' bars') +
       ' (+' + (divCount - startDivCount) + ')');
}

/**
 * useBlocks = true for blocks and false for bars.
 * Pass fromEditMenu=false when calling from exetBlank(). This prevents
 * "Cannot add more blocks" alerts and also sets a conservative #clues target.
 */
Exet.prototype.automagicGrid = function(useBlocks, fromEditMenu=true) {
  if (this.puz.layers3d > 1) {
    if (fromEditMenu) {
      alert('Cannot add automagic blocks/bars when the crossword has lights other than across/down');
    }
    return;
  }
  if (this.gridBuildingMode) {
    if (fromEditMenu) {
      alert('Cannot add automagic blocks/bars when using assistive grid-builder');
    }
    return;
  }
  const grid = this.puz.grid;
  const w = this.puz.gridWidth;
  const h = this.puz.gridHeight;
  const analysis = new ExetAnalysis(grid, w, h, 1);
  if (useBlocks && analysis.numBars() > 0) {
    if (fromEditMenu) {
      alert('Cannot add automagic blocks when the grid has barred cells');
    }
    return;
  }
  if (!useBlocks && analysis.numBlocks() > 0) {
    if (fromEditMenu) {
      alert('Cannot add automagic bars when the grid has blocked cells');
    }
    return;
  }
  if (!analysis.isConnected()) {
    if (fromEditMenu) {
      alert('Cannot add automagic blocks/bars when the grid cells are not ' +
            'fully connected');
    }
    return;
  }
  if (!analysis.isSymmetric() && !this.asymOK) {
    if (fromEditMenu) {
      alert('Cannot add automagic blocks/bars when the grid is not fully symmetric, without selecting the "all asymmetry" preference.');
    }
    return;
  }
  const numLights = Object.keys(this.puz.clues).length;
  let hasUnches = true;
  let targetLights = numLights;
  if (analysis.doublyCheckedOK() && useBlocks) {
    hasUnches = false;
    targetLights = Math.ceil(2*w*h/5.8);
  } else if (analysis.unchesOK()) {
    const lightRows = useBlocks ?
      (Math.floor(h/2) + (((h % 2) == 1 && grid[0][0].isLight) ? 1 : 0)) : h;
    const lightCols = useBlocks ?
      (Math.floor(w/2) + (((w % 2) == 1 && grid[0][0].isLight) ? 1 : 0)) : w;
    const factor = useBlocks ? 7.6 : 7.2;
    targetLights = Math.floor((lightRows * (w/factor)) + (lightCols * (h/factor)));
  } else {
    if (fromEditMenu) {
      alert('Cannot add automagic blocks/bars to the current grid');
    }
    return;
  }
  /**
   * The first time automagicGrid() is called, we keep targetDivs relatively
   * high, letting it run till targetLights is reached. Afterwards, mainly to
   * avoid the situation of adding a lot of bars without creating new lights
   * (which can happen), we add at most two more dividers per call.
   */
  let targetDivs = (w * 3) + (h * 3)
  const startDivCount = useBlocks ? analysis.numBlocks() : analysis.numBars();
  if (fromEditMenu && numLights >= targetLights) {
    /** The user wants to add more blocks/bars, let's give it a shot. */
    targetLights = numLights + 2;
    targetDivs = startDivCount + 2;
  }
  const func = this.automagicGridInner.bind(this);
  exetModals.freezeCallUnfreeze(
      'Adding blocks/bars, keeping a valid and fillable grid...',
      func, useBlocks, hasUnches, targetLights, targetDivs,
      startDivCount, fromEditMenu);
}

/**
 * bb should be ./|/_
 */
Exet.prototype.getSym = function(row, col, bb = '.') {
  if (bb == '.') {
    return [this.puz.gridHeight - 1 - row, this.puz.gridWidth - 1 - col];
  } else if (bb == '|') {
    return [this.puz.gridHeight - 1 - row, this.puz.gridWidth - 2 - col];
  } else if (bb == '_') {
    return [this.puz.gridHeight - 2 - row, this.puz.gridWidth - 1 - col];
  }
  return [-1, -1];
}

Exet.prototype.getSymCell = function(grid, row, col, bb = '.') {
  const [sr, sc] = this.getSym(row, col, bb);
  if (sr < 0 || sc < 0 || sr >= this.gridHeight || sc >= this.gridWidth) {
    return null;
  }
  return grid[sr][sc];
}

/**
 * Pass what as 'set', 'unset', or 'toggle'
 * Pass unset = true to unset instead of setting.
 * Returns number of blocks/bars touched (if they already had
 * the desired value, they are still counted).
 */
Exet.prototype.setBarOrBlock = function(grid, row, col, bb, what) {
  if (row < 0 || col < 0 || row >= this.gridHeight || col >= this.gridWidth) {
    return 0;
  }
  if (bb == '|' && (col == this.gridWidth - 1)) {
    return 0;
  }
  if (bb == '_' && (row == this.gridHeight - 1)) {
    return 0;
  }
  const cell = grid[row][col];
  const prop = (bb == '.') ? 'isLight' : (bb == '|' ? 'hasBarAfter' : 'hasBarUnder');
  const hasDivider = (bb == '.') ? !cell.isLight : cell[prop];
  const needsDivider = (what == 'set') ? true : ((what == 'unset') ? false : !hasDivider);
  const mutator = (c) => {
    if (bb == '.') c[prop] = !needsDivider;
    else c[prop] = needsDivider;
  };
  mutator(cell);
  let num = 1;
  if (!this.asymOK) {
    const symCell = this.getSymCell(grid, row, col, bb);
    console.assert(symCell, row, col);
    mutator(symCell);
    num++;
  }
  return num;
}

Exet.prototype.toggleBarOrBlock = function(grid, row, col, bb) {
  if (!this.setBarOrBlock(grid, row, col, bb, 'toggle')) {
    return false;
  }
  this.killInvalidatedClues();
  return true;
}

/**
 * Make "elt" stand out for a short while. Only
 * works for SVG elements that have a "fill" attribute.
 */
Exet.prototype.flashElt = function(elt) {
  if (!elt) return;
  elt.classList.add('xlv-overwritten');
  const endFlashing = () => {
    elt.classList.remove('xlv-overwritten');
  };
  setTimeout(endFlashing, 5000);
}

/**
 * Make automagically added block/bar stand out for a short while.
 */
Exet.prototype.flashBarOrBlock = function(row, col, bb) {
  const grid = this.puz.grid;
  const gridCell = grid[row][col];
  const symCell = this.asymOK ? null : this.getSymCell(grid, row, col, bb);
  let elt = null, symElt = null;
  if (bb == '.') {
    elt = gridCell.darkness;
    if (symCell) symElt = symCell.darkness;
  } else if (bb == '|') {
    elt = gridCell.barAfterRect;
    if (symCell) symElt = symCell.barAfterRect;
  } else if (bb == '_') {
    elt = gridCell.barUnderRect;
    if (symCell) symElt = symCell.barUnderRect;
  }
  this.flashElt(elt);
  this.flashElt(symElt);
}

Exet.prototype.displayBBChoices = function(candidates) {
  if (candidates.length == 0) return;
  const puz = this.puz;
  let maxScore = 0;
  let minScore = Number.MAX_VALUE;
  for (const [r, c, divider, score] of candidates) {
    maxScore = Math.max(score, maxScore);
    minScore = Math.min(score, minScore);
  }
  const getGreenShade = (score) => {
    const clampedScore = Math.max(0, Math.min(1, score));
    const minLightness = 35;
    const maxLightness = 95;
    const lightness = maxLightness - clampedScore * (maxLightness - minLightness);
    return `hsl(120, 75%, ${lightness}%)`;
  };
  console.assert(this.gridBuildingSuggestions);
  for (let i = candidates.length - 1; i >= 0; i--) {
    const [r, c, divider, score] = candidates[i];
    const gridCell = puz.grid[r][c];
    let left, top, w, h, setter;
    if (divider == '.') {
      left = gridCell.cellLeft + ((puz.cellW - puz.dgmlessBlockW) / 2);
      top = gridCell.cellTop + ((puz.cellH - puz.dgmlessBlockH) / 2);
      w = puz.dgmlessBlockW;
      h = puz.dgmlessBlockH;
    } else if (divider == '|') {
      left = puz.cellLeftPos(c + 1, puz.GRIDLINE - puz.BAR_WIDTH);
      top = puz.cellTopPos(r, puz.GRIDLINE);
      w = puz.BAR_WIDTH * 2;
      h = puz.cellH;
    } else {
      console.assert(divider == '_', divider, r, c);
      left = puz.cellLeftPos(c, puz.GRIDLINE);
      top = puz.cellTopPos(r + 1, puz.GRIDLINE - puz.BAR_WIDTH);
      w = puz.cellW;
      h = puz.BAR_WIDTH * 2;
    }
    const scale = (maxScore > minScore) ? (score - minScore) / (maxScore - minScore) : 1.0;
    const green = getGreenShade(scale);
    const rect = puz.makeRect(left, top, w, h, green);
    rect.classList.add('xet-suggestion');
    rect.addEventListener('click', (evt) => {
      exet.toggleBarOrBlock(exet.puz.grid, r, c, divider);
      exet.updatePuzzle(exetRevManager.REV_GRID_CHANGE);
    });
    this.gridBuildingSuggestions.appendChild(rect);
  }
}

Exet.prototype.showViableBBInner = function(fill, analysis, hasUnches) {
  const rowcols = this.getMutableRowCols();
  const numBars = analysis.numBars();
  const numBlocks = analysis.numBlocks();
  const numLights = Object.keys(this.puz.clues).length;
  this.gridBuildingPanel.innerHTML = `
  <center>
    <div class="xet-pdiv">
      <b>Assistive Grid Builder</b>
      <button class="xlv-small-button" style="width:8em" onclick="exet.exitGridBuildingMode()">Exit</button>
    </div>
    <i>Click on suggested blocks/bars to add (darker = more viable/fillable).</i>
    <br>
    <span class="xet-smaller-text">
    In the active cell, only normal controls for grid-editing or entering/clearing a letter work (navigate away from it first if you want to click on its suggested block/bar).
    </span>
    <br><br>
    Lights: ${numLights}, Blocks: ${numBlocks}, Bars: ${numBars}
    <br>
    <span class="xet-smaller-text">Click on Analysis from the Exet menu for more details.</span>
  </center>
  `;
  this.gridBuildingPanel.style.top = '' + top + 'px';
  const blockMutations = (numBlocks > 0 || numBars == 0) ?
    this.getMutableCells(fill, analysis, true, hasUnches, rowcols) : [];
  this.displayBBChoices(blockMutations);
  const barMutations = (numBars > 0 || numBlocks == 0) ?
    this.getMutableCells(fill, analysis, false, hasUnches, rowcols) : [];
  if (blockMutations.length == 0 && barMutations.length == 0) {
    alert('There are no more viable blocks/bars to suggest');
    this.exitGridBuildingMode();
    return '';
  }
  this.displayBBChoices(barMutations);
  return '';
}

Exet.prototype.enterGridBuildingMode = function() {
  exetModals.hide();
  if (this.puz.layers3d > 1) {
    alert('Cannot suggest blocks/bars when the crossword has lights other than across/down');
    this.exitGridBuildingMode();
    return;
  }
  const fill = this.fillState;
  const analysis = new ExetAnalysis(fill.grid, fill.gridWidth, fill.gridHeight, 1);
  if (!analysis.isConnected()) {
    alert('Cannot suggest blocks/bars when the grid cells are not ' +
          'fully connected');
    this.exitGridBuildingMode();
    return;
  }
  const hasUnches = !analysis.doublyCheckedOK();
  if (hasUnches && !analysis.unchesOK()) {
    alert('Cannot suggest blocks/bars when grid already has bad unches or too-short lights');
    this.exitGridBuildingMode();
    return;
  }
  this.gridBuildingMode = true;
  this.showGridBuildingPanel();
  const func = this.showViableBBInner.bind(this);
  exetModals.freezeCallUnfreeze(
      'Finding/revising good blocks/bars suggestions...',
      func, fill, analysis, hasUnches);
}

Exet.prototype.showGridBuildingPanel = function() {
  if (!this.gridBuildingPanel) {
    this.gridBuildingPanel = document.createElement('div');
    this.gridBuildingPanel.classList.add('xet-grid-building-panel');
  }
  this.gridBuildingPanel.innerHTML = `
  <center>
    <div class="xet-pdiv">
      <b>Assistive Grid Builder</b>
    </div>
    <i>Finding candidates...</i>
  </center>
  `;
  this.puz.gridParent.appendChild(this.gridBuildingPanel);
  const gridParentBox = this.puz.gridParent.getBoundingClientRect();
  const gridPanelBox = this.puz.gridPanel.getBoundingClientRect();
  const frameBox = this.puz.frame.getBoundingClientRect();
  const h = gridPanelBox.top - frameBox.top;
  const left = gridPanelBox.left - gridParentBox.left;
  const top = 0 - h;
  this.gridBuildingPanel.style.top = '' + top + 'px';
  this.gridBuildingPanel.style.left = '' + left + 'px';
  this.gridBuildingPanel.style.width = '' + gridPanelBox.width + 'px';
  this.gridBuildingPanel.style.height = '' + h + 'px';
  this.gridBuildingPanel.style.display = '';
  if (this.gridBuildingSuggestions) {
    this.gridBuildingSuggestions.remove();
  }
  this.gridBuildingSuggestions =
      document.createElementNS('http://www.w3.org/2000/svg', 'g');
  this.puz.svg.appendChild(this.gridBuildingSuggestions);
}

Exet.prototype.exitGridBuildingMode = function() {
  this.gridBuildingMode = false;
  if (this.gridBuildingPanel) {
    this.gridBuildingPanel.style.display = 'none';
  }
  if (this.gridBuildingSuggestions) {
    this.gridBuildingSuggestions.remove();
    this.gridBuildingSuggestions = null;
  }
}

/**
 * Returns the number of clues in the updated puzzle.
 */
Exet.prototype.killInvalidatedClues = function() {
  const fillState = new ExetFillState(this.puz);
  const maps = fillState.killInvalidatedClues();
  const cellsToIndex = maps[0];
  const fullNewLabels = maps[1];
  const getsRelocated = maps[2];

  this.updateColourNinaLights(this.puz.colourfuls, fullNewLabels);;
  this.updateColourNinaLights(this.puz.ninas, fullNewLabels);;

  this.puz.clues = fillState.clues;
  const newLightRegexps = {};
  for (const macro in this.lightRegexps) {
    if (!this.regexpIsMacro(macro)) continue;
    newLightRegexps[macro] = this.lightRegexps[macro];
  }
  for (const oldCi in getsRelocated) {
    if (!this.lightRegexps.hasOwnProperty(oldCi)) {
      continue;
    }
    newLightRegexps[getsRelocated[oldCi]] = this.lightRegexps[oldCi];
  }
  this.lightRegexps = newLightRegexps;
  this.processRegexps();
  return Object.keys(cellsToIndex).length;
}

Exet.prototype.reverseLightInner = function(clue) {
  const lastInd = clue.cells.length - 1;
  console.assert(lastInd >= 1, clue);
  const origCells = clue.reversed ? clue.cells.slice().reverse() : clue.cells;
  const lastR = clue.cells[lastInd][0];
  const lastC = clue.cells[lastInd][1];
  const dir = clue.dir;

  const key = this.puz.reversalKey(origCells);
  if (clue.reversed) {
    delete this.puz.usedReversals[key];
  } else {
    this.puz.usedReversals[key] =
        this.cellCode(origCells[0][0], origCells[0][1]) + '-' +
        this.cellCode(origCells[lastInd][0], origCells[lastInd][1]);
  }
  this.killInvalidatedClues();
  this.updatePuzzle(exetRevManager.REV_LIGHT_REVERSAL);
  const newIndex = dir + this.puz.grid[lastR][lastC].startsClueLabel;
  this.puz.setClueSolution(newIndex);
  return newIndex;
}

Exet.prototype.reverseLight = function() {
  if (!this.puz) return
  const ci = this.puz.currClueIndex;
  if (!ci) return;
  const clue = this.puz.clues[ci];
  if (!clue) return;
  if (clue.dir != 'A' && clue.dir != 'D' && clue.dir != 'Z') {
    console.log('Cannot reverse nodir light at ' + ci);
    return;
  }
  const lastInd = clue.cells.length - 1;
  if (clue.cells.length <= 1) {
    console.log('Cannot reverse light at ' + ci + ' with ' +
                clue.cells.length + ' cells');
    return;
  }
  const parent = clue.parentClueIndex ? this.puz.clues[clue.parentClueIndex] :
      clue;
  let msg = 'Are you sure you want to reverse this light?';
  if (parent.solution && parent.solution.indexOf('?') < 0) {
    msg = 'Are you sure you want to reverse this already-filled light?';
  }
  if (!confirm(msg)) {
    return;
  }
  this.reverseLightInner(clue);
}

Exet.prototype.populateColourNina = function(isNina, newColour) {
  // this.coloursInUse[] should have been set.
  const func = isNina ? 'exet.addNina' : 'exet.addColour';
  let html = `
    <p class="xet-action"><b>${isNina ? 'Nina' : 'Colour'} set!</b>
    You can modify it with these options:</p>
  <p>
    <input type="radio" name="xet-colour-type" id="xet-colour-cell"
      checked
      onclick="exet.colourToAddType = 'cell'; ${func}()" value="cell">
    <label for="xet-colour-cell">
      ${isNina ? 'Add the current <b>cell</b> to a nina' :
          'Set the colour of the current <b>cell</b>'}
    </label><br>
    <input type="radio" name="xet-colour-type" id="xet-colour-light"
      onclick="exet.colourToAddType = 'light'; ${func}()" value="light">
    <label for="xet-colour-light">
      ${isNina ? 'Add the current <b>light</b> to a nina' :
          'Set the colour of the current <b>light</b>'}
    </label>
    <hr>
  </p>`;

  const newColourLabel = `
    Use this colour:&nbsp;
    <input id="xet-colour-new-name" name="xet-colour-new-name"
       title="Change to any valid HTML colour name or #hex code or rgb() triple and press Enter"
       value="${newColour}"
       class="xlv-answer" size="16" type="text"></input>`
  for (let idx = 0; idx < this.coloursInUse.length; idx++) {
    const colour = this.coloursInUse[idx];
    html += `
    <div class="xet-colour-nina" id="xet-colour-nina-${idx}">
      <div class="xet-colour-sample xlv-coloured-cell"
          id="xet-colour-sample-${idx}" style="background:${colour}">
      </div>
      <div class="xet-colour-nina-radio">
        <input type="radio" name="xet-colour-name" id="xet-colour-${idx}"
           value="${colour}">
        <label for="xet-colour-${idx}">
          ${idx == this.coloursInUse.length - 1 ? newColourLabel : colour}
        </label>
      </div>
    </div>`;
  }

  this.tweakColourNina.innerHTML = html;

  for (let i = 0; i < this.coloursInUse.length; i++) {
    document.getElementById("xet-colour-nina-" + i).addEventListener('click',
      isNina ? this.addNina.bind(this, i) : this.addColour.bind(this, i));
  }

  const newSample = document.getElementById(
      "xet-colour-sample-" + (this.coloursInUse.length - 1));
  const newName = document.getElementById("xet-colour-new-name");
  newName.addEventListener('change', e => {
    const colour = newName.value.replace(/ /g, '').toLowerCase();
    const idx = this.coloursInUse.length - 1;
    if (!this.puz.isColour(colour)) {
      newName.value = this.coloursInUse[idx];
    } else {
      this.coloursInUse[idx] = colour;
      newSample.style.background = colour;
      if (isNina) {
        this.addNina(idx);
      } else {
        this.addColour(idx);
      }
    }
  });
  newName.addEventListener('click', e => {
    e.stopPropagation();
  });
}

Exet.prototype.removeNinaOrColour = function(nOrCList) {
  let index = -1;
  let lindex = -1;
  let doBreak = false;
  const light = this.currLight();
  const lightCells = (light && light.cells) ? JSON.stringify(light.cells) :
                     'NONE';
  for (let i = 0; !doBreak && i < nOrCList.length; i++) {
    const nOrC = nOrCList[i];
    for (let x = 0; x < nOrC.list.length; x++) {
      const cccc = nOrC.list[x];
      if (!cccc.cells || cccc.cells.length < 1) continue;
      if (!cccc.isLight) {
        // Note the first mention of cell, but continue to look for the light.
        if (index < 0 &&
            cccc.cells[0][0] == this.puz.currRow &&
            cccc.cells[0][1] == this.puz.currCol) {
          index = i;
          lindex = x;
        }
      } else {
        if (JSON.stringify(cccc.cells) == lightCells) {
          index = i;
          lindex = x;
          doBreak = true;
          break;
        }
      }
    }
  }
  if (index < 0) {
    return index;
  }
  nOrCList[index].list = nOrCList[index].list.slice(0, lindex).concat(
      nOrCList[index].list.slice(lindex + 1));
  return index;
}

Exet.prototype.removeNina = function() {
  const nindex = this.removeNinaOrColour(this.puz.ninas);
  if (nindex < 0) {
    return false;
  }
  if (this.puz.ninas[nindex].list.length == 0) {
    this.puz.ninas = this.puz.ninas.slice(0, nindex).concat(
        this.puz.ninas.slice(nindex + 1));
  }
  this.puz.redisplayNinas();
  this.puz.activateCell(this.puz.currRow, this.puz.currCol);
  return true;
}

Exet.prototype.addNina = function(index=-1) {
  if (this.tweakColourNina.style.display == 'none') {
    return
  }
  const light = this.currLight();
  if (this.colourToAddType == 'light' && !light) {
    return
  }
  this.removeNina();
  if (index < 0) {
    index = this.coloursInUseIndex;
  } else {
    this.coloursInUseIndex = index;
  }
  const colour = this.coloursInUse[index];
  let nindex = this.findOrAddColour(this.puz.ninas, colour);
  if (this.colourToAddType == 'cell') {
    this.puz.ninas[nindex].list.push({
      str: this.cellCode(this.puz.currRow, this.puz.currCol),
      cells: [[this.puz.currRow, this.puz.currCol]],
      isLight: false,
    });
  } else {
    this.puz.ninas[nindex].list.push({
      str: this.puz.clueLabelDisp(light),
      cells: light.cells,
      isLight: true,
    });
  }
  this.puz.redisplayNinas();
  document.getElementById("xet-colour-" + index).checked = true;
}

Exet.prototype.findOrAddColour = function(nOrCList, colour) {
  let index = -1;
  for (let i = 0; i < nOrCList.length; i++) {
    if (nOrCList[i].colour == colour) {
      index = i;
      break;
    }
  }
  if (index < 0) {
    index = nOrCList.length;
    nOrCList.push({
      colour: colour,
      list: [],
    });
  }
  return index;
}

Exet.prototype.toggleNina = function(evt) {
  const gridCell = exet.puz.currCell()
  if (!gridCell || !gridCell.isLight) {
    return;
  }
  if (this.removeNina()) {
    exetRevManager.throttledSaveRev(exetRevManager.REV_METADATA_CHANGE);
    return;
  }
  this.coloursInUse = [];
  this.colourToAddType = 'cell'
  for (let n of this.puz.ninas) {
    this.coloursInUse.push(n.colour);
  }
  this.coloursInUseIndex = this.coloursInUse.length - 1;
  const newColours = this.puz.NINA_COLORS;
  let cnum = 0;
  let newColour = '';
  while (cnum < newColours.length) {
    newColour = newColours[cnum++];
    if (!this.coloursInUse.includes(newColour)) {
      break;
    }
  }
  this.coloursInUse.push(newColour);
  if (this.coloursInUseIndex < 0) {
    this.coloursInUseIndex = 0;
  }

  this.populateColourNina(true, newColour);
  exetModals.showModal(this.tweakColourNina);
  evt.stopPropagation();
  this.addNina();
  exetRevManager.throttledSaveRev(exetRevManager.REV_METADATA_CHANGE);
}

Exet.prototype.removeColour = function() {
  const cindex = this.removeNinaOrColour(this.puz.colourfuls);
  if (cindex < 0) {
    return false;
  }
  if (this.puz.colourfuls[cindex].list.length == 0) {
    this.puz.colourfuls = this.puz.colourfuls.slice(0, cindex).concat(
        this.puz.colourfuls.slice(cindex + 1));
  }
  this.puz.recolourCells();
  this.puz.activateCell(this.puz.currRow, this.puz.currCol);
  return true;
}

Exet.prototype.addColour = function(index=-1) {
  if (this.tweakColourNina.style.display == 'none') {
    return
  }
  const light = this.currLight();
  if (this.colourToAddType == 'light' && !light) {
    return
  }
  this.removeColour();
  if (index < 0) {
    index = this.coloursInUseIndex;
  } else {
    this.coloursInUseIndex = index;
  }
  const colour = this.coloursInUse[index];
  let cindex = this.findOrAddColour(this.puz.colourfuls, colour);
  if (this.colourToAddType == 'cell') {
    this.puz.colourfuls[cindex].list.push({
      str: this.cellCode(this.puz.currRow, this.puz.currCol),
      cells: [[this.puz.currRow, this.puz.currCol]],
      isLight: false,
    });
  } else {
    this.puz.colourfuls[cindex].list.push({
      str: this.puz.clueLabelDisp(light),
      cells: light.cells,
      isLight: true,
    });
  }
  this.puz.recolourCells();
  document.getElementById("xet-colour-" + index).checked = true;
}

Exet.prototype.toggleColour = function(evt) {
  const gridCell = exet.puz.currCell()
  if (!gridCell || !gridCell.isLight) {
    return;
  }
  if (this.removeColour()) {
    exetRevManager.throttledSaveRev(exetRevManager.REV_METADATA_CHANGE);
    return;
  }
  this.coloursInUse = [];
  this.colourToAddType = 'cell'
  for (let c of this.puz.colourfuls) {
    if (this.coloursInUse.includes(c.colour)) {
      continue;
    }
    this.coloursInUse.push(c.colour)
  }
  this.coloursInUseIndex = this.coloursInUse.length - 1;
  const newColours = ['blue', 'green', 'red', 'cyan',
                      'magenta', 'orange', 'brown'];
  let cnum = 0;
  let newColour = '';
  while (cnum < newColours.length) {
    newColour = newColours[cnum++];
    if (!this.coloursInUse.includes(newColour)) {
      break;
    }
  }
  this.coloursInUse.push(newColour);
  if (this.coloursInUseIndex < 0) {
    this.coloursInUseIndex = 0;
  }

  this.populateColourNina(false, newColour);
  exetModals.showModal(this.tweakColourNina);
  evt.stopPropagation();
  this.addColour();
  exetRevManager.throttledSaveRev(exetRevManager.REV_METADATA_CHANGE);
}

Exet.prototype.markNinasAsPrefilled = function() {
  this.ninasMarkedAsPrefilled = [];
  let cells = []
  for (let nina of this.puz.ninas) {
    for (let cccc of nina.list) {
      if (!cccc.cells || cccc.cells.length < 1) continue;
      cells = cells.concat(cccc.cells)
    }
  }
  for (let cell of cells) {
    const gridCell = this.puz.grid[cell[0]][cell[1]];
    if (!gridCell.isLight || gridCell.prefill) continue;
    gridCell.prefill = true;
    this.ninasMarkedAsPrefilled.push(cell);
  }
}
Exet.prototype.unmarkNinasAsPrefilled = function() {
  for (let cell of this.ninasMarkedAsPrefilled) {
    const gridCell = this.puz.grid[cell[0]][cell[1]];
    if (!gridCell.isLight || !gridCell.prefill) continue;
    gridCell.prefill = false;
  }
}

Exet.prototype.clearAllMarkings = function() {
  if (!confirm('Are you sure you want to clear all circles, prefills, ' +
               'colours, and ninas?')) {
    return;
  }
  let changed = false;
  for (let i = 0; i < this.puz.gridHeight; i++) {
    for (let j = 0; j < this.puz.gridWidth; j++) {
      const gridCell = this.puz.grid[i][j];
      if (gridCell.hasCircle) {
        gridCell.hasCircle = false;
        changed = true;
      }
      if (gridCell.prefill) {
        gridCell.prefill = false;
        changed = true;
      }
    }
  }
  if (this.puz.ninas.length > 0) {
    this.puz.ninas = [];
    changed = true;
  }
  if (this.puz.colourfuls.length > 0) {
    this.puz.colourfuls = [];
    changed = true;
  }
  if (changed) {
    this.updatePuzzle(exetRevManager.REV_METADATA_CHANGE);
  }
}

