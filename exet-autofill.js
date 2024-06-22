/*
MIT License

Copyright (c) 2022 Viresh Ratnakar

See the full Exet license notice in exet.js.

Current version: v0.93, June 17, 2024
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
  this.viable = obj.viable;
  for (let i = 0; i < this.gridHeight; i++) {
    this.grid[i] = new Array(this.gridWidth);
    for (let j = 0; j < this.gridWidth; j++) {
      let gridCell = obj.grid[i][j];
      this.grid[i][j] = {};
      let thisCell = this.grid[i][j];
      thisCell.isLight = gridCell.isLight;
      if (!thisCell.isLight) continue;
      thisCell.solution = gridCell.solution;
      thisCell.currLetter = gridCell.currLetter;
      thisCell.cChoices = gridCell.cChoices || {};
      thisCell.viability = gridCell.viability;
    }
  }
  this.clues = {};
  for (let ci in obj.clues) {
    let theClue = obj.clues[ci];
    this.clues[ci] = {};
    let thisClue = this.clues[ci];
    thisClue.solution = theClue.solution;
    thisClue.parentClueIndex = theClue.parentClueIndex || null;
    thisClue.childrenClueIndices = theClue.childrenClueIndices || [];
    thisClue.dir = theClue.dir;
    thisClue.index = theClue.index;
    thisClue.cells = theClue.cells;
    thisClue.enumLen = theClue.enumLen;
    thisClue.lChoices = theClue.lChoices || [];
    thisClue.lRejects = theClue.lRejects || [];
  }
}
