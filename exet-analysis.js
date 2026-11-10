/*
MIT License

Copyright (c) 2022 Viresh Ratnakar

See the full Exet license notice in exet.js.
*/

/**
 * An implementation of the set-union-find-wih-rank-compression algorithm,
 * used in ExetAnalysis to find small "through cuts" in grids.
 */
class ExetUnionFind {
  constructor(dim) {
    this.n = 0;
    this.dim = dim;
    this.parent = [];
    this.rank = [];
    /**
     * Each set root tracks the "extent" of the set it represents, across
     * both dimensions 0 and 1.
     *   dimspans[i][d][0] is the min value of dimension d.
     *   dimspans[i][d][1] is the max value of dimension d.
     */
    this.dimspans = [];
  }
  /**
   * @param {!Array<!Array<number>>} dimspan indexed by dimension and then is
   *     a pair of min/max values. To add a new cell [r,c], pass dimspan
   *     as [[r,r], [c,c]].
   */
  add(dimspan) {
    console.assert(dimspan.length == this.dim, dimspan.length, this.dim);
    const dimspanCopy = new Array(this.dim);
    for (let d = 0; d < this.dim; d++) {
      dimspanCopy[d] = dimspan[d].slice();
    }
    this.dimspans.push(dimspanCopy);
    this.parent.push(this.n);
    this.rank.push(0);
    this.n++;
  }
  clone() {
    const uf = new ExetUnionFind(this.dim);
    for (const dimspan of this.dimspans) {
      uf.add(dimspan);
    }
    uf.parent = this.parent.slice();
    uf.rank = this.rank.slice();
    return uf;
  }
  find(x) {
    if (this.parent[x] != x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }
  union(x, y) {
    const px = this.find(x);
    const py = this.find(y);
    if (px == py) return;
    if (this.rank[px] < this.rank[py]) {
      this.parent[px] = py;
      this.dimspanMerge(py, px);
    } else if (this.rank[px] > this.rank[py]) {
      this.parent[py] = px;
      this.dimspanMerge(px, py);
    } else {
      this.parent[py] = px;
      this.rank[px] += 1;
      this.dimspanMerge(px, py);
    }
  }
  /**
   * Merge dimspan of y into that of x.
   */
  dimspanMerge(x, y) {
    const xSpan = this.dimspans[x];
    const ySpan = this.dimspans[y];
    for (let d = 0; d < this.dim; d++) {
      xSpan[d][0] = Math.min(xSpan[d][0], ySpan[d][0]);
      xSpan[d][1] = Math.max(xSpan[d][1], ySpan[d][1]);
    }
  }
}

/**
 * A utility class for doing various grid analyses, such as symmetry and
 * connectivity.
 */
class ExetAnalysis {
  constructor(grid, w, h, layers3d) {
    this.grid = grid;
    this.w = w;
    this.h = h;
    this.layers3d = layers3d;
    this.crossers = new Array(h);
    for (let i = 0; i < h; i++) {
      this.crossers[i] = new Array(w);
      for (let j = 0; j < w; j++) {
        this.crossers[i][j] = 0;
      }
    }
  }

  setCrossers() {
    for (let i = 0; i < this.h; i++) {
      for (let j = 0; j < this.w; j++) {
        this.crossers[i][j] = 0;
        if (!this.grid[i][j].isLight) {
          continue;
        }
        if ((j > 0 && this.grid[i][j-1].isLight &&
             !this.grid[i][j-1].hasBarAfter) ||
            (j < this.w - 1 && this.grid[i][j+1].isLight &&
             !this.grid[i][j].hasBarAfter)) {
          this.crossers[i][j]++;
        }
        if ((i > 0 && this.grid[i-1][j].isLight &&
             !this.grid[i-1][j].hasBarUnder) ||
            (i < this.h - 1 && this.grid[i+1][j].isLight &&
             !this.grid[i][j].hasBarUnder)) {
          this.crossers[i][j]++;
        }
      }
    }
  }

  isConnected() {
    const cells = [];
    const visited = new Array(this.h);
    for (let i = 0; i < this.h; i++) {
      visited[i] = new Array(this.w);
      for (let j = 0; j < this.w; j++) {
        visited[i][j] = false;
        if (this.grid[i][j].isLight) {
          cells.push([i,j]);
        }
      }
    }
    if (cells.length == 0) return false;
    let reachable = [cells[0]];
    visited[cells[0][0]][cells[0][1]] = true;
    let x = 0;
    const lh = this.h / this.layers3d;
    while (x < reachable.length) {
      let r = reachable[x][0];
      let c = reachable[x][1];
      x++;
      if (c > 0 && this.grid[r][c-1].isLight && !this.grid[r][c-1].hasBarAfter &&
          !visited[r][c-1]) {
        visited[r][c-1] = true;
        reachable.push([r,c-1]);
      }
      if (c < this.w - 1 && this.grid[r][c+1].isLight && !this.grid[r][c].hasBarAfter &&
          !visited[r][c+1]) {
        visited[r][c+1] = true;
        reachable.push([r,c+1]);
      }
      if (r > 0 && this.grid[r-1][c].isLight && !this.grid[r-1][c].hasBarUnder &&
          !visited[r-1][c]) {
        visited[r-1][c] = true;
        reachable.push([r-1,c]);
      }
      if (r < this.h - 1 && this.grid[r+1][c].isLight && !this.grid[r][c].hasBarUnder &&
          !visited[r+1][c]) {
        visited[r+1][c] = true;
        reachable.push([r+1,c]);
      }
      if (this.layers3d > 1) {
        const prevR = r - lh;
        if (prevR >= 0 && this.grid[prevR][c].isLight && !visited[prevR][c]) {
          visited[prevR][c] = true;
          reachable.push([prevR,c]);
        }
        const nextR = r + lh;
        if (nextR < this.h && this.grid[nextR][c].isLight && !visited[nextR][c]) {
          visited[nextR][c] = true;
          reachable.push([nextR,c]);
        }
      }
    }
    return reachable.length == cells.length;
  }

  /**
   * Common helper for acrossSpans() and downSpans().
   */
  lineSpans(k1, isRow) {
    const spans = [];
    let start = -1, len = 0, label = '';
    const limit = isRow ? this.w : this.h;
    const barProp = isRow ? 'hasBarAfter' : 'hasBarUnder';
    const suffix = isRow ? 'a' : 'd';
    for (let k2 = 0; k2 < limit; k2++) {
      const gridCell = isRow ? this.grid[k1][k2] : this.grid[k2][k1];
      const prevCell = k2 > 0 ? (isRow ? this.grid[k1][k2 - 1] : this.grid[k2 - 1][k1]) : null;
      if (gridCell.isLight) {
        if (start >= 0 && prevCell && prevCell.isLight && !prevCell[barProp]) {
          len++;
        } else {
          if (len > 1) spans.push([start, len, label]);
          start = k2;
          len = 1;
          label = '' + gridCell.startsClueLabel + suffix;
        }
      } else {
        if (len > 1) spans.push([start, len, label]);
        start = -1;
        len = 0;
        label = '';
      }
    }
    if (len > 1) spans.push([start, len, label]);
    return spans;
  }

  /**
   * Return horizontal spans of cells for the given row. The returned array has
   * [<column-index>, <num-cells>, <label>] entries.
   * @param {number} row
   */
  acrossSpans(row) {
    return this.lineSpans(row, true);
  }
  
  /**
   * Return vertical spans of cells for the given column. The returned array has
   * [<row-index>, <num-cells>, <label>] entries.
   * @param {number} col
   */
  downSpans(col) {
    return this.lineSpans(col, false);
  }

  /**
   * Should only be called for chequered grids. Sets parityHasLight{Row,Col}[0/1]
   * to true iff there is any row/col with that parity that has a light.
   */
  getChequeredParity(parityHasLightRow, parityHasLightCol) {
    parityHasLightRow[0] = false;
    parityHasLightRow[1] = false;
    for (let i = 0; i < this.h; i++) {
      const spans = this.acrossSpans(i);
      if (spans.length > 0) {
        parityHasLightRow[i % 2] = true;
        break;
      }
    }
    parityHasLightCol[0] = false;
    parityHasLightCol[1] = false;
    for (let i = 0; i < this.w; i++) {
      const spans = this.downSpans(i);
      if (spans.length > 0) {
        parityHasLightCol[i % 2] = true;
        break;
      }
    }
  }
  
  isSymmetric() {
    for (let i = 0; i < this.h; i++) {
      for (let j = 0; j < this.w; j++) {
        let symi = this.h - 1 - i;
        let symj = this.w - 1 - j;
        if (this.grid[i][j].isLight != this.grid[symi][symj].isLight) {
          return false;
        }
        if (!this.grid[i][j].isLight) continue
        if (symj > 0 &&
            this.grid[i][j].hasBarAfter != this.grid[symi][symj - 1].hasBarAfter) {
          return false;
        }
        if (symi > 0 &&
            this.grid[i][j].hasBarUnder != this.grid[symi - 1][symj].hasBarUnder) {
          return false;
        }
      }
    }
    return true;
  }
  
  numBlocks() {
    let count = 0;
    for (let i = 0; i < this.h; i++) {
      for (let j = 0; j < this.w; j++) {
        if (!this.grid[i][j].isLight) {
          count++;
        }
      }
    }
    return count;
  }
  
  numBars() {
    let count = 0;
    for (let i = 0; i < this.h; i++) {
      for (let j = 0; j < this.w; j++) {
        const gridCell = this.grid[i][j];
        if (!gridCell.isLight) {
          continue
        }
        if (j < this.w - 1 && gridCell.hasBarAfter) {
          count++;
        }
        if (i < this.h - 1 && gridCell.hasBarUnder) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Checks a barred grid against "WSJ" unches specs:
   * len <= 5 at most 1
   * len >= 6 <= 7 at most 2
   * len >= 8 <= 9 at most 3
   * len >= 10 <= 12 at most 4
   * extended to len > 12 at most ceil(len/3)
   */
  barredUnchesOK(len, unches) {
    if (len <= 5) return unches <= 1;
    else if (len <= 7) return unches <= 2;
    else if (len <= 9) return unches <= 3;
    else if (len <= 12) return unches <= 4;
    else return unches <= Math.ceil(len / 3);;
  }

  barredGridUnchesOK() {
    const spanUnches = this.getSpanUnches();
    for (const spanUnch of spanUnches) {
      if (!spanUnch[4]) return false;
    }
    return true;
  }

  /**
   * Return the longest # of consecutive collinear blocks/bars, horizontal or vertical
   */
  maxCollinear(horizontal, useBlocks) {
    let max = 0;
    const endoff = useBlocks ? 0 : 1;
    const imax = horizontal ? this.h - endoff : this.w - endoff;
    const jmax = horizontal ? this.w : this.h;
    const barProp = horizontal ? 'hasBarUnder' : 'hasBarAfter';
    const inStretch = (c) => {
      return useBlocks ? (!c.isLight) : (c.isLight && c[barProp]);
    };
    for (let i = 0; i < imax; i++) {
      let start = -1;
      for (let j = 0; j < jmax; j++) {
        const gridCell = horizontal ? this.grid[i][j] : this.grid[j][i];
        if (inStretch(gridCell)) {
          if (start < 0) start = j;
          const span = j - start + 1;
          if (span > max) max = span;
        } else {
          start = -1;
        }
      }
    }
    return max;
  }

  /**
   * Returns true if both maxCollinear(h/v, false) are <= 2.
   */
  maxCollinearBarsOK() {
    return ((this.maxCollinear(true, false) <= 2) &&
            (this.maxCollinear(false, false) <= 2));
  }

  /**
   * Returns true if both maxCollinear(h/v, true) are <= 4.
   */
  maxCollinearBlocksOK() {
    return ((this.maxCollinear(true, true) <= 4) &&
            (this.maxCollinear(false, true) <= 4));
  }

  /**
   * Returns an array where each entry is: [span-length, unches, checked, label, barredUnchesOK]
   */
  getSpanUnches() {
    this.setCrossers();
    const spanUnches = [];
    for (let i = 0; i < this.h; i++) {
      const spans = this.acrossSpans(i);
      for (const span of spans) {
        let numChecked = 0;
        let numUnches = 0;
        for (let j = span[0]; j < span[0] + span[1]; j++) {
          if (this.crossers[i][j] < 2) numUnches++;
          else numChecked++;
        }
        const len = numUnches + numChecked;
        spanUnches.push([len, numUnches, numChecked, span[2],
                         this.barredUnchesOK(len, numUnches)]);
      }
    }
    for (let j = 0; j < this.w; j++) {
      const spans = this.downSpans(j);
      for (let span of spans) {
        let numChecked = 0;
        let numUnches = 0;
        for (let i = span[0]; i < span[0] + span[1]; i++) {
          if (this.crossers[i][j] < 2) numUnches++;
          else numChecked++;
        }
        const len = numUnches + numChecked;
        spanUnches.push([len, numUnches, numChecked, span[2],
                         this.barredUnchesOK(len, numUnches)]);
      }
    }
    return spanUnches;
  }
  
  /**
   * Returns true if the grid is OK as a chequered or barred UK-style grid:
   * - No consecitive unches
   * - No lights shorter than 4 (only if checkSpanLen is passed as true)
   * - No short lights with more unches than checked cells (only if
   *   checkUnchFrac is passed as true)
   * - Allows barred grids
   */
  unchesOK(checkSpanLen=true, checkUnchFrac=true) {
    this.setCrossers();
    for (let i = 0; i < this.h; i++) {
      for (let j = 0; j < this.w; j++) {
        const gridCell = this.grid[i][j];
        if (!gridCell.isLight) {
          continue;
        }
        if (this.crossers[i][j] == 1 &&
            ((j > 0 && this.crossers[i][j-1] == 1 &&
              !this.grid[i][j-1].hasBarAfter) ||
             (i > 0 && this.crossers[i-1][j] == 1 &&
              !this.grid[i-1][j].hasBarUnder))) {
          return false;
        }
      }
    }
    const minSpan = 4;
    const spanUnches = this.getSpanUnches();
    for (const spanUnch of spanUnches) {
      const len = spanUnch[0];
      if (checkSpanLen && len < minSpan) {
        return false;
      }
      const numUnches = spanUnch[1];
      const numChecked = spanUnch[2];
      if (numUnches > numChecked + 1) {
        return false;
      }
      if (checkUnchFrac && numUnches == numChecked + 1 && numUnches < 5) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Returns true if the grid is OK as an doubly-checked, US-style grid:
   * - Each light cell is doubly checked
   * - No lights shorter than 3 (only if checkSpanLen is passed as true)
   * - No bars.
   */
  doublyCheckedOK(checkSpanLen=true) {
    this.setCrossers();
    for (let i = 0; i < this.h; i++) {
      for (let j = 0; j < this.w; j++) {
        const gridCell = this.grid[i][j];
        if (!gridCell.isLight) {
          continue;
        }
        if (this.crossers[i][j] < 2) {
          return false;
        }
        if (gridCell.hasBarAfter || gridCell.hasBarUnder) {
          return false;
        }
      }
    }
    if (!checkSpanLen) {
      return true;
    }
    const minSpan = 3;
    for (let i = 0; i < this.h; i++) {
      const spans = this.acrossSpans(i);
      for (const span of spans) {
        if (span[1] < minSpan) {
          return false;
        }
      }
    }
    for (let j = 0; j < this.w; j++) {
      const spans = this.downSpans(j);
      for (const span of spans) {
        if (span[1] < minSpan) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * For 2-d grids, the algorithm starts with merging all mergeable (touching)
   * "darkness". Then, separately along the horizontal and vertical directions,
   * it greedily finds the least number of white cells to be turned dark, so as
   * to cut through completely along that dimension. When picking among light
   * cells greedily, the cell that expands the darkness the most is picked. When
   * there are ties, cells closer to the central axis are picked. It returns both
   * the cuts in an array.
   * @return {!Array<!Array<!Array<number>>>}
   */
  minThroughCuts() {
    if (this.layers3d > 1) {
      /**
       * I may get around to implementing this for 3-d grids later. The idea
       * would be similar: for each of the 3 2-dimension combinations, greedily
       * find the min cut that goes all the way through those two dimensions.
       */
      return [[[]]];
    }
    const whites = [];
    const darks = [];
    const locators = new Array(this.h);
    for (let i = 0; i < this.h; i++) {
      locators[i] = new Array(this.w);
      const iRange = [Math.max(0, i - 1), Math.min(this.h - 1, i + 1)];
      for (let j = 0; j < this.w; j++) {
        const cell = [i, j];
        const gridCell = this.grid[i][j];
        let where = 'white';
        let index = whites.length;
        if (gridCell.isLight) {
          whites.push(cell);
        } else {
          where = 'dark';
          index = darks.length;
          darks.push(cell);
        }
        locators[i][j] = {
          where: where,
          index: index,
          nbrs: [],
        };
        const jRange = [Math.max(0, j - 1), Math.min(this.w - 1, j + 1)];
        for (let i2 = iRange[0]; i2 <= iRange[1]; i2++) {
          for (let j2 = jRange[0]; j2 <= jRange[1]; j2++) {
            if (i == i2 && j == j2) {
              continue;
            }
            locators[i][j].nbrs.push([i2, j2]);
          }
        }
      }
    }
    const baseDarkness = new ExetUnionFind(2);
    for (const dark of darks) {
      const dimspan = [[dark[0], dark[0]], [dark[1], dark[1]]];
      baseDarkness.add(dimspan);
    }
    for (let x = 0; x < darks.length; x++) {
      const dark = darks[x];
      const nbrs = locators[dark[0]][dark[1]].nbrs;
      for (const nbr of nbrs) {
        const nbrLocator = locators[nbr[0]][nbr[1]];
        if (nbrLocator.where != 'dark') {
          continue;
        }
        baseDarkness.union(x, nbrLocator.index);
      }
    }
    /** baseDarkness now has all the sets of connected dark cells. */
    const darknesses = [baseDarkness, baseDarkness.clone()];
    const minCuts = [[], []];
    for (let d = 0; d < 2; d++) {
      const darkness = darknesses[d];
      const extent = (d == 0) ? this.h : this.w;
      const otherExtent = (d == 0) ? this.w : this.h;
      let bestDarkGirth = 0;
      for (let x = 0; x < darks.length; x++) {
        if (darkness.parent[x] != x) {
          continue;
        }
        const dimspan = darkness.dimspans[x][d];
        const darkGirth = dimspan[1] - dimspan[0] + 1;
        if (bestDarkGirth < darkGirth) {
          bestDarkGirth = darkGirth;
        }
      }
      if (bestDarkGirth == 0) {
        /** No dark cells at all. */
        const median = Math.floor(otherExtent / 2);
        for (let i = 0; i < extent; i++) {
          minCuts[d].push((d == 0) ? [i, median] : [median, i]);
        }
        continue;
      }
      const cut = new Set;
      /**
       * For whites[x], if x is in the "cut" set, then cutMember[x] is its index
       * in darkness (i.e., in darkness.{parent,rank,dimspans} arrays).
       */
      const cutMemberIndex = new Array(whites.length);
      const uncut = new Set;
      for (let x = 0; x < whites.length; x++) {
        uncut.add(x);
      }
      /**
       * Repeatedly greedily pick a cell from uncut that maximally increases
       * darkness along dimension d. When there are ties, prefer the cell
       * closer to the central axis.
       */
      while ((bestDarkGirth < extent) && (cut.size < whites.length)) {
        let chosen = -1;
        let bestDistFromCentre = otherExtent;
        let nextBestDarkGirth = 0;
        let nbrsOfChosen = null;
        for (const x of uncut) {
          const white = whites[x];
          const newspan = [white[d], white[d]];
          const nbrs = locators[white[0]][white[1]].nbrs;
          const nbrSet = new Set;
          for (const nbr of nbrs) {
            const nbrLocator = locators[nbr[0]][nbr[1]];
            let nbrIndexInDarkness = -1;
            if (nbrLocator.where == 'dark') {
              nbrIndexInDarkness = nbrLocator.index;
            } else {
              if (!cut.has(nbrLocator.index)) {
                continue;
              }
              nbrIndexInDarkness = cutMemberIndex[nbrLocator.index];
            }
            const darknessRoot = darkness.find(nbrIndexInDarkness);
            if (!nbrSet.has(darknessRoot)) {
              const dimspan = darkness.dimspans[darknessRoot][d];
              newspan[0] = Math.min(newspan[0], dimspan[0]);
              newspan[1] = Math.max(newspan[1], dimspan[1]);
              nbrSet.add(darknessRoot);
            }
          }
          const distFromCentre = Math.abs(white[1 - d] - (otherExtent / 2));
          const darkGirth = newspan[1] - newspan[0] + 1;
          if (darkGirth > nextBestDarkGirth ||
              (darkGirth == nextBestDarkGirth &&
               distFromCentre < bestDistFromCentre)) {
            nextBestDarkGirth = darkGirth;
            chosen = x;
            bestDistFromCentre = distFromCentre;
            nbrsOfChosen = nbrSet;
          }
        }
        console.assert(chosen >= 0);
        uncut.delete(chosen);
        cut.add(chosen);
        const indexInDarkness = darkness.n;
        cutMemberIndex[chosen] = indexInDarkness;
        const white = whites[chosen];
        darkness.add([[white[0], white[0]], [white[1], white[1]]]);
        for (const nbr of nbrsOfChosen) {
          darkness.union(indexInDarkness, nbr);
        }
        bestDarkGirth = Math.max(bestDarkGirth, nextBestDarkGirth);
      }
      console.assert(bestDarkGirth == extent, bestDarkGirth, extent);
      for (const x of cut) {
        minCuts[d].push(whites[x]);
      }
      minCuts[d].sort(
          (l1, l2) => (l1[d] == l2[d]) ? (l1[1-d] - l2[1-d]) : (l1[d] - l2[d]));
    }
    return minCuts;
  }

  /**
   * Finds minThroughCuts() along both dimensions and returns true iff both
   * are at least as big as one-fourth of the size along that dimension.
   */
  throughCutsBigEnough() {
    if (this.layers3d > 1 || this.numBars() > 0) {
      return true;
    }
    const throughCuts = this.minThroughCuts();
    for (let d = 0; d < 2; d++) {
      const dim = (d == 0) ? this.h : this.w;
      if (throughCuts[d].length < Math.ceil(dim / 4)) {
        return false;
      }
    }
    return true;
  }
}

function ExetLightInfo() {
  this.lights = 0
  this.filled = 0
  this.lengths = {}
  this.clueLengths = {}
  this.substrings = {}
  this.popularities = {}
  this.letters = {}
  for (let c of exetLexicon.letters) {
    this.letters[c] = {count: 0, details: ''}
  }
  this.ischild = 0
  this.set = 0
  this.annos = 0
  this.words = {}
  this.annotations = {}
}

/**
 * Analysis-related Exet functions.
 */

Exet.prototype.addStat = function(dict, stat, details, bad=false) {
  if (!dict[stat]) {
    dict[stat] = {
      count: 0,
      details: ''
    };
  }
  dict[stat].count++;
  if (details) {
    if (dict[stat].details) dict[stat].details += ', ';
    dict[stat].details += details;
  }
  if (bad) {
    dict[stat].bad = true;
  }
}

Exet.prototype.essenceOfAnno = function(s) {
  let out = '';
  for (let c of s) {
    if (c == '*') {
      out += ' anagram ';
    } else if (c == '.' || c == '!' || c == '?' || c == '+' || c == ':') {
      out += ' ';
    } else {
      out += c;
    }
  }
  out = out.replace(/ [ ]*/g, ' ').trim();
  // Remove words containing {}
  out = out.replace(/[^ ]*{[^}]*}[^ ]*/g, ' ');
  // Remove words containing ()
  out = out.replace(/[^ ]*\([^)]*\)[^ ]*/g, ' ');
  // Remove words containing []
  out = out.replace(/[^ ]*\[[^\]]*\][^ ]*/g, ' ');
  // Remove parens
  out = out.replace(/[\[\]}){(]/g, '');
  // Remove ".."
  out = out.replace(/"[^"]*"/g, ' ');
  // Remove '..'
  out = out.replace(/'[^']*'/g, ' ');
  // Remove words with 2 or more uppercase letters
  out = out.replace(/[a-zA-Z'-]*[A-Z][a-zA-Z'-]*[A-Z][a-zA-Z'-]*/g, ' ');
  // Remove words containing <>
  out = out.replace(/[^ ]*<[^ ]*>[^ ]*/g, ' ');
  // Remove words starting with -
  out = out.replace(/ -[^ ]*/g, ' ');
  // Remove single-letter words
  out = out.replace(/( [A-Za-z])+ /g, ' ');
  out = out.replace(/^([A-Za-z] )+/g, ' ');
  out = out.replace(/( [A-Za-z])+$/g, ' ');

  if (s.match(/-[^ ]\+/) || s.match(/\+[^ ]-/)) {
    out += ' substitution';
  }
  out = out.replace(/ [ ]*/g, ' ').trim().toLowerCase();
  if (!out) {
    out = 'charade or other';
  }
  return out;
}

Exet.prototype.getSubstrings = function(s) {
  const letters = exetLexicon.letterString(s);
  const substrings = new Set;
  for (let len = 3; len <= letters.length; len++) {
    const end = letters.length - len;
    for (let start = 0; start <= end; start++) {
      substrings.add(letters.substr(start, len));
    }
  }
  return substrings;
}

/**
 * Remove "subsumed" substrings from the histogram.
 */
Exet.prototype.trimSubsumedSubstrings = function(substrings) {
  const toDelete = [];
  const keys = Object.keys(substrings);
  for (const sub of keys) {
    let subsumed = false;
    for (const sup of keys) {
      if (sup.length <= sub.length ||
          substrings[sub].count != substrings[sup].count ||
          sup.indexOf(sub) < 0) {
        continue;
      }
      subsumed = true;
      break;
    }
    if (subsumed) {
      toDelete.push(sub);
      continue;
    }
  }
  for (const sub of toDelete) {
    delete substrings[sub];
  }
}

Exet.prototype.getLightInfos = function() {
  const infos = {
    All: new ExetLightInfo(),
    Across: new ExetLightInfo(),
    Down: new ExetLightInfo(),
    Other: new ExetLightInfo(),
  };
  const allInfo = infos['All'];
  const aInfo = infos['Across'];
  const dInfo = infos['Down'];
  const oInfo = infos['Other'];
  for (const ci in this.puz.clues) {
    const theClue = this.puz.clues[ci];
    const dirInfo = theClue.dir == 'A' ?
      aInfo : (theClue.dir == 'D' ?  dInfo : oInfo);
    allInfo.lights++;
    dirInfo.lights++;
    if (theClue.parentClueIndex) {
      allInfo.ischild++;
      dirInfo.ischild++;
      continue;
    }
    let label = theClue.label + theClue.dir.toLowerCase();
    if (theClue.solution && theClue.solution.indexOf('?') < 0) {
      allInfo.filled += 1;
      dirInfo.filled += 1;
      const lexl = exetLexicon.lexicon.length;
      let index = lexl;
      let solText = theClue.solution;
      const fillClue = this.fillState.clues[ci];
      if (fillClue && fillClue.lChoices.length == 1) {
        index = fillClue.lChoices[0];
        solText = exetLexicon.getLex(index);
      }
      const pop = 5 * Math.round(20 * (lexl - index) / lexl);
      label += ': ' + solText;
      this.addStat(allInfo.popularities, pop, label);
      this.addStat(dirInfo.popularities, pop, label);
      const substrings = this.getSubstrings(solText);
      for (const substring of substrings) {
        this.addStat(allInfo.substrings, substring, label);
        this.addStat(dirInfo.substrings, substring, label);
      }
      /**
       * Include filled entries in reporting stem-dupes in clues.
       */
      const depunctSol = exetLexicon.depunct(solText, true /* forDeduping */);
      const words = depunctSol.split(' ');
      for (const word of words) {
        const stem = exetLexicon.stem(word).toLowerCase();
        this.addStat(allInfo.words, stem, label);
        this.addStat(dirInfo.words, stem, label);
      }
    }
    this.addStat(allInfo.lengths, theClue.enumLen, label);
    this.addStat(dirInfo.lengths, theClue.enumLen, label);
    const depunctClue = exetLexicon.depunct(theClue.clue, true /* forDeduping */);
    if (depunctClue && !this.isDraftClue(theClue.clue)) {
      allInfo.set += 1;
      dirInfo.set += 1;
      const labelAndClue = label + ' [' + depunctClue + ']';
      const words = depunctClue.split(' ');
      for (const word of words) {
        const stem = exetLexicon.stem(word).toLowerCase();
        this.addStat(allInfo.words, stem, labelAndClue);
        this.addStat(dirInfo.words, stem, labelAndClue);
      }
      this.addStat(allInfo.clueLengths, words.length, label);
      this.addStat(dirInfo.clueLengths, words.length, label);
    }
    if (theClue.anno) {
      allInfo.annos += 1;
      dirInfo.annos += 1;
      const anno = this.essenceOfAnno(theClue.anno);
      if (anno) {
        this.addStat(allInfo.annotations, anno, label);
        this.addStat(dirInfo.annotations, anno, label);
      }
    }
  }
  // In *.words and *.substrings, retain only those that have count > 1
  for (const key of Object.keys(infos)) {
    const info = infos[key]
    for (const word of Object.keys(info.words)) {
      if (info.words[word].count <= 1) {
        delete info.words[word];
      }
    }
    for (const substring of Object.keys(info.substrings)) {
      if (info.substrings[substring].count <= 1) {
        delete info.substrings[substring];
      }
    }
    this.trimSubsumedSubstrings(info.substrings);
  }
  const grid = this.puz.grid;
  const w = this.puz.gridWidth;
  const h = this.puz.gridHeight;
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      const gridCell = grid[i][j];
      if (!gridCell.isLight || gridCell.solution == '?') continue;
      const rowcol = 'row-' + (h - i) + ',' + 'col-' + (j + 1);
      this.addStat(allInfo.letters, gridCell.solution, rowcol);
      if (gridCell.acrossClueLabel) {
        this.addStat(aInfo.letters, gridCell.solution, rowcol);
      }
      if (gridCell.downClueLabel) {
        this.addStat(dInfo.letters, gridCell.solution, rowcol);
      }
      if (gridCell.z3dClueLabel) {
        this.addStat(oInfo.letters, gridCell.solution, rowcol);
      }
    }
  }
  if (oInfo.lights == 0) {
    delete infos['Other'];
  }
  return infos;
}

Exet.prototype.updateAnalysis = function(elt) {
  const grid = this.puz.grid;
  const w = this.puz.gridWidth;
  const h = this.puz.gridHeight;
  const layers3d = this.puz.layers3d;

  const analysis = new ExetAnalysis(grid, w, h, layers3d);

  let html = '<p><b>Grid</b></p><p><ul>';
  html = html + `<li>${w*h} cells, dimensions: ${w} &times; ${h}</li>`;

  const isConnected = analysis.isConnected();
  if (!isConnected) {
    html += '<li class="xet-red"><i>Does not have all light cells connected</i></li>';
  } else {
    html += '<li>All light cells are connected</li>';
  }
  if (!analysis.isSymmetric()) {
    html += '<li class="xet-red"><i>Not symmetric</i></li>';
  } else {
    html += '<li>Symmetric</li>';
  }
  let numBlocks = analysis.numBlocks();
  if (numBlocks > 0) {
    html += `<li>${numBlocks} (${(numBlocks * 100 /
          (w * h)).toFixed(2)}%) blocked cells</li>`;
  } else {
    html += '<li>No blocked cells</li>';
  }
  let numBars = analysis.numBars();
  if (numBars > 0) {
    html += `<li>${numBars} bars</li>`;
  } else {
    html += '<li>No bars</li>';
  }
  let spanUnches = null;
  if (analysis.doublyCheckedOK(false)) {
    html += '<li>Every light cell is checked</li>';
  } else  if (analysis.unchesOK(false, false)) {
    html += '<li>No consecutive unches</li>';
    if (!analysis.unchesOK(false, true)) {
      html += '<li class="xet-red"><i>Some lights shorter than 9 letters have &gt;50% unches</i></li>';
    }
    if (layers3d == 1) {
      for (useBlocks of [true, false]) {
        const limit = useBlocks ? 5 : 3;
        if (useBlocks && analysis.numBlocks() < limit) continue;
        if (!useBlocks && analysis.numBars() < limit) continue;
        const name = useBlocks ? 'blocks' : 'bars';
        for (const horiz of [true, false]) {
          const span = analysis.maxCollinear(horiz, useBlocks);
          if (span >= limit) {
            html += `<li class="xet-red"><i>Too many (${span}) consecutive collinear ${horiz ? "horizontal" : "vertical"} ${name}</i></li>`;
          }
        }
      }
      if (analysis.numBars() > 0) {
        spanUnches = analysis.getSpanUnches();
      }
    }
  } else {
    html += '<li class="xet-red"><i>Has consecutive unches</i></li>';
  }

  if (spanUnches) {
    /** We get here only for barred grids with non-consecutive unches */
    const stats = {};
    let someBad = false;
    for (const spanUnch of spanUnches) {
      const key = `Unches: ${String(spanUnch[1]).padStart(2, '0')}, length: ${String(spanUnch[0]).padStart(2, '0')}`;
      const details = spanUnch[3];
      const bad = !spanUnch[4];
      if (bad) someBad = true;
      this.addStat(stats, key, details, bad);
    }
    html += `<li><span${someBad ? ' class="xet-red"' : ''}>Num-unches + light-lengths distribution</span>:<br>${this.plotStats(stats)}</li>`;
  }

  const throughCuts = analysis.minThroughCuts();
  if (numBars == 0 && isConnected && layers3d == 1) {
    /** Display through-cut sizes */
    html += '<li>Smallest "through cuts" found (hover over the lists to see ' +
            'the squares highlighted in the grid):\n<ul>\n';
    for (let d = 0; d < 2; d++) {
      const cells = throughCuts[d];
      const  orientation = (d == 0) ? 'Vertical' : 'Horizontal';
      const cellNames = [];
      for (const cell of cells) {
        cellNames.push(`r${h - cell[0]}c${cell[1] + 1}`);
      }
      html += '<li class="xet-through-cut" id="xet-through-cut-' + d + '">' +
              orientation + ': (' + cells.length + ' squares): [' +
              cellNames.join(' ') + ']</li>\n';
    }
    html += '</ul></li>\n';
  }

  html += '</ul></p>';

  let lightInfos = this.getLightInfos()
  html += `<p><select name="xet-analysis-select"
          id="xet-analysis-select" style="font-weight:bold" value="All"
    onchange="exet.selectAnalysis()">`
  for (let key in lightInfos) {
    html = html + `
      <option value="${key}">${key}</option>`
  }
  html += '</select> <b>Grid-fill and Clues</b></p>'
  for (let key in lightInfos) {
    html += `<div id="xet-analysis-${key}" class="xet-analysis-choices"
            style="display:none"><table>`
    let info = lightInfos[key];
    html += `<tr><td colspan="2"><b>Number of lights</b>:
              ${info.lights}</td></tr>`;
    let unparented = info.lights - info.ischild;
    html += `<tr><td colspan="2"
              title="Same as # lights if there are no linked clues">
                <b>Number of entries</b>: ${unparented}</td></tr>`;
    html += `<tr><td colspan="2"><b>Filled entries</b>: ${info.filled} (${(
                    info.lights > 0 ?
                      100*info.filled/info.lights : 0).toFixed(2)}%)</td></tr>`;
    html += `<tr><td colspan="2"><b>Set clues (i.e., not ${this.DRAFT})</b>: ${info.set} (${(
                    unparented > 0 ? 100*info.set/unparented : 0).toFixed(2)}%)</td></tr>`;
    html += '<tr><td colspan="2" class="xet-small"><br><i>Hover on the blue bars to see details</i></td></tr>';
    html += `<tr><td class="xet-td"><div><b>Entry lengths</b>:<br>${this.plotStats(
                  info.lengths)}</div>`;
    html += `<div><span title="Popularity, when available in the lexicon, is ` +
      `the percentile by occurrence count over a large corpus such ` +
      `as Wikipedia"><b>Entry word/phrase popularity percentiles</b></span>:<br>${
                  this.plotStats(info.popularities, 5)}</div</td>`;
    html += `<td class="xet-td"><b>Letters used</b>:<br>
              ${this.plotStats(info.letters)}</td></tr>`;
    html += `<tr><td class="xet-td"><div
               title="The most popular word form is shown for the words that have a common stem"><b>Word
               stems repeated in set clues</b>:<br>${this.plotStats(
        info.words)}</di>`;
    html += `<div><b>Substrings repeated in solution entries</b>:<br>${this.plotStats(
        info.substrings)}</div></td>`;
    html += `<td class="xet-td"><div><b>Word-lengths of set clues</b>:<br>${this.plotStats(
        info.clueLengths)}</div>`;
    html += `<div><b>Annotations provided in clues</b>: ${info.annos} (${(
          unparented > 0 ? 100*info.annos/unparented : 0).toFixed(2)}%)
              ${this.plotStats(info.annotations)}</div></td></tr>`;
    html += '</table></div>';
  }
  elt.innerHTML = html;

  /** Set up highlighting of through cuts */
  for (let d = 0; d < 2; d++) {
    const elt = document.getElementById('xet-through-cut-' + d);
    if (!elt) continue;
    elt.addEventListener('mouseover', (e) => {
      for (const cell of throughCuts[d]) {
        const div = this.puz.makeCellDiv(cell[0], cell[1], 'purple');
        div.classList.add('xet-through-cut-cell');
        this.puz.gridParent.appendChild(div);
        const scissors = this.puz.addCellText(
            cell[0], cell[1], '&#9988;', 16, 10, false);
        scissors.classList.add('xet-through-cut-cell');
      }
      this.puz.colourGroup.style.display = 'none';
      this.puz.ninaGroup.style.display = 'none';
    });
    elt.addEventListener('mouseout', (e) => {
      const elts = this.puz.gridParent.getElementsByClassName(
          'xet-through-cut-cell');
      const nonLiveList = [];
      for (let i = 0; i < elts.length; i++) {
        nonLiveList.push(elts[i]);
      }
      for (const elt of nonLiveList) {
        elt.remove();
      }
      this.puz.colourGroup.style.display = '';
      this.puz.ninaGroup.style.display = '';
    });
  }
  this.selectAnalysis();
}

Exet.prototype.plotStats = function(stats) {
  let keys = Object.keys(stats);
  let numeric = true;
  let totalCount = 0;
  for (let key of keys) {
    if (isNaN(key)) {
      numeric = false;
    }
    totalCount += stats[key].count;
  }
  if (numeric) {
    keys.sort((a, b) => a - b);
  } else {
    keys.sort((a, b) => stats[b].count - stats[a].count);
  }
  let min = Number.MAX_VALUE;
  let max = Number.MIN_VALUE;
  let count = 0;
  let distinct = 0;
  let sum = 0;
  let median = 0;
  let medianFound = false;
  let html = '<p>';
  let maxv = 1;
  for (let key of keys) {
    let v = stats[key].count;
    count += v;
    if (v > 0) distinct++;
    if (v > maxv) maxv = v;
    if (numeric) {
      key = Number(key);
      if (key > max) max = key;
      if (key < min) min = key;
      sum += (key * v)
      if (!medianFound && count >= (totalCount / 2)) {
        median = key;
        medianFound = true;
      }
    }
  }
  if (numeric) {
    keys = Object.keys(stats);
    keys.sort((a, b) => a - b);
  }
  html += '<table class="xet-stats-table">';
  const BARMAX = 150;
  for (let key of keys) {
    html += '<tr>';
    const ct = stats[key].count;
    const cls = stats[key].bad ? 'xet-plotbar-red' : 'xet-plotbar';
    html += `<td style="text-align:right">${ct}</td><td>`;
    html += numeric ? 'of' : '&times;';
    html += `</td><td>${key}</td>`;
    html += `<td><div class="${cls}"
            style="width:${BARMAX * stats[key].count / maxv}px"`;
    if (stats[key].details) {
      html += ` title="${stats[key].details}"`;
    }
    html += '></div></td>';
    html += '</tr>';
  }
  html += '</table>';
  html += '</p>';
  html += `<p class="xet-indent">Distinct values: ${distinct}`;
  if (numeric && count > 0) {
    html += `
      <br>Range: ${min} - ${max}
      <br>Average: ${(sum / count).toFixed(1)}
      <br>Median: ${median}`;
  }
  html += '</p>';
  return html;
}

Exet.prototype.selectAnalysis = function() {
  let picker = document.getElementById('xet-analysis-select')
  if (!picker) return
  let id = 'xet-analysis-' + picker.value
  let choices = document.getElementsByClassName('xet-analysis-choices')
  for (let i = 0; i < choices.length; i++) {
    choices[i].style.display = (choices[i].id == id ? '' : 'none')
  }
}

