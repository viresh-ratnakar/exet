/*
MIT License

Copyright (c) 2022 Viresh Ratnakar

See the full Exet license notice in exet.js.

Current version: v0.93, June 17, 2024
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
   * Return horizontal spans of cells for the given row. The returned array has
   * [<column-index>, <num-cells>] entries.
   * @param {number} row
   * @return {!Array<!Array<number>>}
   */
  acrossSpans(row) {
    const spans = [];
    let start = -1;
    let len = 0;
    for (let j = 0; j < this.w; j++) {
      if (this.grid[row][j].isLight) {
        if (start >= 0 && j > 0 && this.grid[row][j-1].isLight &&
            !this.grid[row][j-1].hasBarAfter) {
          len++;
        } else {
          if (len > 1) {
            spans.push([start, len]);
          }
          start = j;
          len = 1;
        }
      } else {
        if (len > 1) {
          spans.push([start, len]);
        }
        start = -1;
        len = 0;
      }
    }
    if (len > 1) {
      spans.push([start, len]);
    }
    return spans;
  }
  
  /**
   * Return vertical spans of cells for the given column. The returned array has
   * [<row-index>, <num-cells>] entries.
   * @param {number} col
   * @return {!Array<!Array<number>>}
   */
  downSpans = function(col) {
    const spans = [];
    let start = -1;
    let len = 0;
    for (let i = 0; i < this.h; i++) {
      if (this.grid[i][col].isLight) {
        if (start >= 0 && i > 0 && this.grid[i-1][col].isLight &&
            !this.grid[i-1][col].hasBarUnder) {
          len++;
        } else {
          if (len > 1) {
            spans.push([start, len]);
          }
          start = i;
          len = 1;
        }
      } else {
        if (len > 1) {
          spans.push([start, len]);
        }
        start = -1;
        len = 0;
      }
    }
    if (len > 1) {
      spans.push([start, len]);
    }
    return spans;
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
        if (!this.grid[i][j].isLight) {
          continue
        }
        if (j < this.w - 1 && this.grid[i][j].hasBarAfter) {
          count++;
        }
        if (i < this.h - 1 && this.grid[i][j].hasBarUnder) {
          count++;
        }
      }
    }
    return count;
  }
  
  /**
   * Returns true if the grid is OK as a chequered, UK-style grid:
   * - No consecitive unches
   * - No lights shorter than 4 (only if checkSpanLen is passed as true)
   * - No short lights with more unches than checked cells (only if
   *   checkUnchFrac is passed as true)
   */
  chequeredOK(checkSpanLen=true, checkUnchFrac=true) {
    const crossers = new Array(this.h);
    for (let i = 0; i < this.h; i++) {
      crossers[i] = new Array(this.w);
      for (let j = 0; j < this.w; j++) {
        crossers[i][j] = 0;
        if (!this.grid[i][j].isLight) {
          continue;
        }
        if ((j > 0 && this.grid[i][j-1].isLight &&
             !this.grid[i][j-1].hasBarAfter) ||
            (j < this.w - 1 && this.grid[i][j+1].isLight &&
             !this.grid[i][j].hasBarAfter)) {
          crossers[i][j]++;
        }
        if ((i > 0 && this.grid[i-1][j].isLight &&
             !this.grid[i-1][j].hasBarUnder) ||
            (i < this.h - 1 && this.grid[i+1][j].isLight &&
             !this.grid[i][j].hasBarUnder)) {
          crossers[i][j]++;
        }
        if (crossers[i][j] == 1 &&
            ((j > 0 && crossers[i][j-1] == 1 &&
              !this.grid[i][j-1].hasBarAfter) ||
             (i > 0 && crossers[i-1][j] == 1 &&
              !this.grid[i-1][j].hasBarUnder))) {
          return false;
        }
      }
    }
    const minSpan = 4;
    for (let i = 0; i < this.h; i++) {
      const spans = this.acrossSpans(i);
      for (const span of spans) {
        if (checkSpanLen && span[1] < minSpan) {
          return false;
        }
        let numChecked = 0;
        let numUnches = 0;
        for (let j = span[0]; j < span[0] + span[1]; j++) {
          if (crossers[i][j] < 2) numUnches++;
          else numChecked++;
        }
        if (numUnches > numChecked + 1) {
          return false;
        }
        if (checkUnchFrac && numUnches == numChecked + 1 && numUnches < 5) {
          return false;
        }
      }
    }
    for (let j = 0; j < this.w; j++) {
      const spans = this.downSpans(j);
      for (let span of spans) {
        if (checkSpanLen && span[1] < minSpan) {
          return false;
        }
        let numChecked = 0;
        let numUnches = 0;
        for (let i = span[0]; i < span[0] + span[1]; i++) {
          if (crossers[i][j] < 2) numUnches++;
          else numChecked++;
        }
        if (numUnches > numChecked + 1) {
          return false;
        }
        if (checkUnchFrac && numUnches == numChecked + 1 && numUnches < 5) {
          return false;
        }
      }
    }
    return true;
  }
  
  /**
   * Returns true if the grid is OK as an unchequered, US-style grid:
   * - Each light cell is doubly checked
   * - No lights shorter than 3 (only if checkSpanLen is passed as true)
   */
  unchequeredOK(checkSpanLen=true) {
    const crossers = new Array(this.h);
    for (let i = 0; i < this.h; i++) {
      crossers[i] = new Array(this.w);
      for (let j = 0; j < this.w; j++) {
        crossers[i][j] = 0;
        if (!this.grid[i][j].isLight) {
          continue;
        }
        if ((j > 0 && this.grid[i][j-1].isLight &&
             !this.grid[i][j-1].hasBarAfter) ||
            (j < this.w - 1 && this.grid[i][j+1].isLight &&
             !this.grid[i][j].hasBarAfter)) {
          crossers[i][j]++;
        }
        if ((i > 0 && this.grid[i-1][j].isLight &&
             !this.grid[i-1][j].hasBarUnder) ||
            (i < this.h - 1 && this.grid[i+1][j].isLight &&
             !this.grid[i][j].hasBarUnder)) {
          crossers[i][j]++;
        }
        if (crossers[i][j] < 2) {
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
   * @param {!Array<!Array<!Object>>>} grid
   * @param {number} w
   * @param {number} h
   * @param {number} layers3d
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
   * Finds minThroughCuts() along both dimensions and returns truw iff both
   * are at least as big as one-fourth of the size along that dimension.
   */
  throughCutsBigEnough() {
    if (this.layers3d > 1) {
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
