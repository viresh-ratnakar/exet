/*
MIT License

Copyright (c) 2020 Viresh Ratnakar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

The latest code and documentation for Exet can be found at:
https://github.com/viresh-ratnakar/exet

Current version: v1.03, December 26, 2025
*/

function ExetModals() {
  this.modal = null;
  document.addEventListener('click', this.handleClick.bind(this));
  document.addEventListener('keydown', this.handleClick.bind(this));
};

ExetModals.prototype.handleClick = function(e) {
  if (!this.modal) {
    return
  }
  if (!this.modal.contains(e.target) || e.key == "Escape") {
    this.hide()
  }
}

// If caller calls this in response to a click event e, then caller should also
// call e.stopPropagation().
ExetModals.prototype.showModal = function(elt) {
  this.hide();
  if (!elt) {
    return;
  }
  this.modal = elt;
  this.modal.style.display = 'block';
}

ExetModals.prototype.hide = function() {
  if (!this.modal) {
    return
  }
  if (exet.postscript && this.modal.id == 'xet-other-sections') {
    exet.postscript.style.display = 'none';
  }
  this.modal.style.display = 'none'
  this.modal = null;
}

function Exet() {
  this.version = 'v1.03, December 26, 2025';
  this.puz = null;
  this.prefix = '';
  this.suffix = '';
  this.exolveOtherSec = '';
  this.preflex = [];
  this.preflexSet = {};
  this.preflexHash = null;
  this.preflexInUse = {};
  this.unpreflex = [];
  this.unpreflexSet = {};
  this.unpreflexHash = null;
  this.noProperNouns = false;
  this.requireEnums = true;
  this.noStemDupes = exetLexicon.hasOwnProperty('stems');
  this.asymOK = false;
  this.tryReversals = false;
  this.lightRegexps = {};
  this.lightRegexpsC = {};
  this.DEFAULT_MINPOP = exetConfig.defaultPopularity;
  this.setMinPop(this.DEFAULT_MINPOP)
  this.DRAFT = '[DRAFT]';
  this.CLUE_NOT_SET = 'Set clue and clear draft marker...';
  this.MENU_SEPARATOR = '<option disabled>' +
    '&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;' +
    '&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;' +
    '&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;&#9472;' +
     '</option>'; 
  this.TOP_CLEARANCE = 36;
  this.formatTags = {
    clear: {inClue: [true, false]},
    def: {open: '~{', close: '}~', inClue: [true]},
    i: {open: '<i>', close: '</i>', inClue: [true, false]},
    b: {open: '<b>', close: '</b>', inClue: [false]},
    u: {open: '<u>', close: '</u>', inClue: [false]},
    s: {open: '<s>', close: '</s>', inClue: [false]},
    caps: {inClue: [false]},
    alt: {inClue: [false]},
  }

  /**
   * Max lengths of preferred/disallowed word lists.
   */
  this.MAX_PREFLEX = 50000;

  // Start in the Exet tab
  this.currTab = "exet"
  this.savedIndsSelect = ""

  // State for throttled handlers
  this.throttledGridTimer = null;
  this.throttledPreflexTimer = null;
  this.throttledUnpreflexTimer = null;
  this.throttledClueTimer = null;
  this.throttledMetadataTimer = null;
  this.throttledCharadeTimer = null;
  this.viabilityUpdateTimer = null;
  this.throttledLightRegexpTimer = null;
  this.inputLagMS = 400;
  this.longInputLagMS = 2000;
  this.sweepMS = 500;

  // Params for light choices shown.
  this.sweepMaxChoices = 5000;
  this.sweepMaxChoicesSmall = 4;
  this.shownLightChoices = 200;

  /**
   * Local storage usage. Filled by the first call to checkStorage().
   */
  this.lsUsed = -1;
  this.lsUsedAtStart = -1;
  this.lsLeftAtStart = -1;
  this.lsLeftIsAmple = true;

  this.tipsList = [
    `If you want to allow enum mismatches, then add the line
     <blockquote>exolve-option: ignore-enum-mismatch</blockquote>
     using
     <i>Edit &gt; Add/Edit special sections: &gt; Other Exolve sections</i>.`,
    `You can specify up to ${this.MAX_PREFLEX} desired words to fill, using
     the <span style="color:green">"Set preferred fills"</span> button near
     the bottom. These words will be prioritized in autofill as well
     as in the suggested fills list.`,
    `In a cryptic clue, you can specify a part of the clue to be the definition
     part using Ctrl-d after selecting it. This part gets underlined when
     the solution is revealed.`,
    `When looking at any list of indicators through the "Lists" tab, you
     can type a topic word that describes the clue surface that you're
     trying to craft (in the blank provided near the top-right corner), and
     hit Enter, to highlight all words that might be related to that topic.`,
    `The "Analysis" button shows useful information about the grid, the
     grid-fill, and the clues. You can use it to check for issues such
     as: grids that are not fully connected, consecutive unchecked cells,
     too many long clues, too many uncommon entries, etc.`,
    `When setting a crossword with ninas, enter the nina letters first
     and mark them using <i>Edit &gt; Mark grid cell: &gt; Toggle nina ($)</i>.
     While you fill the rest of the grid, clearing lights will not
     erase any nina cells.`,
    `You can add a preamble to the crossword (e.g., some special instructions)
     using
     <i>Edit &gt; Add/Edit special sections: &gt; Preamble</i>.`,
    `Wordplay tabs such as "Charades" and "Anagrams" show candidate wordplays
     for the currently selected entry. However, you can edit the fodder text
     directly in the tab to experiment with alternatives.`,
    `Saving the crossword as HTML (Exolve format) with solutions included
     can be done using the keyboard shortcut Ctrl-s (Cmd-s on Mac). Exet
     overrides the browser's default "save" functionality.`,
    `You can use autofill to create pangrams, and even <i>constrained</i>
     pangrams, where all the letters in the alphabet get used over some
     specified cells, such as circled cells and unchecked cells.`,
    `You can specify a regular expression that constrains fill-choices
     shown for a light (for example, forcing a palindrome, or a specific
     substring) using the "Regexp constraint" option in the hamburger menu above
     the current clue.`,
    `You can create a <i>3-D</i> crossword using
     <i>Open &gt; New 3-D grid:</i>. You can also reverse some lights with
     <i>Edit &gt; Reverse current light</i>. You can let autofill suggest
     reversals using the "Try reversals: [ ]" option on the main Exet tab.
     Reversed lights are often seen in 3-D crosswords.`,
  ];
  this.tipIdx = -1;
  this.TIP_ENUM_MISMATCH = 0;
  this.TIP_ANALYSIS = 3;
  this.lastTipShownTime = 0;
};


Exet.prototype.renderPreview = function(spec, eltId) {
  try {
    let newPuz = new Exolve(spec, eltId, null, false, 0, 400, false)
    document.getElementById(
        `${newPuz.prefix}-controls-etc`).style.display = 'none';
    document.getElementById(
        `${newPuz.prefix}-clear-area`).style.display = 'none'
    newPuz.revealAll(false)
  } catch (err) {
    console.log(err);
  }
}

Exet.prototype.setMinPop = function(m) {
  if (m < 0) {
    m = 0;
  }
  if (m > 100) {
    m = 100;
  }
  this.minpop = m;
  this.indexMinPop = Math.max(
      1, Math.floor(exetLexicon.startLen * (100 - m) / 100));
}

Exet.prototype.startNav = function(dir='A', row=0, col=0) {
  if (!this.puz) return;
  if (row < 0 || row >= this.puz.gridHeight ||
      col < 0 || col >= this.puz.gridWidth) {
    row = 0
    col = 0
  }
  if (dir != 'A' && dir != 'D' && dir != 'Z') {
    dir = 'A'
    let gridCell = this.puz.grid[row][col]
    if (gridCell.isLight && !gridCell.acrossClueLabel) {
      if (gridCell.downClueLabel) {
        dir = 'D'
      } else if (gridCell.z3dClueLabel) {
        dir = 'Z'
      }
    }
  }
  this.puz.currRow = row
  this.puz.currCol = col
  this.puz.currDir = dir
  if (this.puz.grid[row][col].isLight) {
    this.puz.activateCell(row, col)
  } else {
    this.navDarkness(row, col)
  }
}

Exet.prototype.hideExolveElement = function(suffix) {
  const elt = document.getElementById(this.puz.prefix + '-' + suffix);
  if (elt) {
    elt.style.display = 'none';
  }
}

Exet.prototype.setPuzzle = function(puz) {
  if (puz.hasDgmlessCells) {
    alert('Diagramless cells are not supported');
    return;
  }
  if (puz.hasNodirClues) {
    alert('Nodir clues not yet supported');
    return;
  }
  if (puz.hasRebusCells) {
    alert('Rebus cells are not supported');
    return;
  }
  if (puz.offNumClueIndices.length > 0) {
    alert('Non-numeric clues not yet supported');
    return;
  }
  if ((puz.language && puz.language != exetLexicon.language) ||
      (!puz.language && 'en' != exetLexicon.language) ||
      (puz.languageScript && puz.languageScript != exetLexicon.script) ||
      (!puz.languageScript && 'Latin' != exetLexicon.script)) {
    alert('The lexicon is in ' +
          exetLexicon.language + ' (' + exetLexicon.script + ') but the ' +
          'puzzle has ' + puz.language + ' (' + puz.languageScript + ')');
    return;
  }
  if (puz.langMaxCharCodes != exetLexicon.maxCharCodes) {
    alert('Lexicon has MaxCharCodes = ' + exetLexicon.maxCharCodes +
          ' but the puzzle has ' + puz.langMaxCharCodes);
    return;
  }
  if (puz.columnarLayout) {
    puz.columnarLayout = false;
    puz.gridcluesContainer.className = 'xlv-grid-and-clues-flex';
    puz.cluesContainer.className = 'xlv-clues xlv-clues-flex';
  }
  let gridFillChanges = false;
  for (let i = 0; i < puz.gridHeight; i++) {
    for (let j = 0; j < puz.gridWidth; j++) {
      const gridCell = puz.grid[i][j];
      if (!gridCell.isLight) continue;
      if (gridCell.skipNum) {
        alert('Skipped-number cells not yet supported');
        return;
      }
      if (gridCell.solution == '0') {
        gridCell.solution = '?';
        gridFillChanges = true;
      }
      if (gridCell.solution != '?' &&
          !exetLexicon.letterSet[gridCell.solution]) {
        alert('Entry ' + gridCell.solution + ' in grid[' + i + '][' + j +
              '] is not present in the lexicon');
        return;
      }
    }
  }
  this.puz = puz;
  puz.useWebifi = false;
  puz.hltOverwrittenMillis = 0;
  puz.revealAll(false);

  if (!this.prefix && !this.suffix) {
    this.prefix = '' +
        '<!DOCTYPE html>\n' +
        '<html lang="en">\n' +
        '<head>\n' +
        '<meta charset="utf-8"/>\n' +
        '<meta name="viewport" ' +
            'content="width=device-width, initial-scale=1"/>\n' +
        '<link rel="stylesheet" type="text/css" href="' +
            exetState.exolveUrl + 'exolve-m.css"/>\n' +
        '<script src="' + exetState.exolveUrl + 'exolve-m.js"><\/script>\n' +
        '<\/head>\n' +
        '<body>\n' +
        '<script>\n' +
        'createExolve(`'
    this.suffix = '' +
        '`);\n' +
        '<\/script>\n' +
        '<\/body>\n' +
        '<\/html>\n'
  }
  this.exolveOtherSec = '';

  const sectionsToSkip = ['begin', 'grid', 'width', 'height', 'id', 'title',
                          'setter', 'copyright', 'nina', 'colour', 'color',
                          'question', 'across', 'down', '3d', '3d-across',
                          '3d-away', '3d-down', 'prelude', 'preamble',
                          'explanations', 'maker', 'reversals', 'language'];
  const rangesToSkip = [];
  for (let sec of sectionsToSkip) {
    if (this.puz.sectionLines[sec]) {
      rangesToSkip.push(this.puz.sectionLines[sec]);
    }
  }

  for (let l = 0; l < puz.numLines; l++) {
    const line = puz.specLines[l].trim();
    if (line.startsWith('exolve-end')) {
      break
    }
    let shouldSkip = false;
    for (let section of sectionsToSkip) {
      if (line.startsWith('exolve-' + section)) {
        shouldSkip = true;
        break;
      }
    }
    if (shouldSkip) {
      continue;
    }
    for (let range of rangesToSkip) {
      if (l >= range[0] && l <= range[1]) {
        shouldSkip = true;
        break;
      }
    }
    if (shouldSkip) {
      continue;
    }
    this.exolveOtherSec = this.exolveOtherSec + puz.specLines[l] + '\n';
  }
  this.exolveOtherSec = this.exolveOtherSec.trim();

  if (gridFillChanges) {
    this.updatePuzzle(exetRevManager.REV_GRIDFILL_CHANGE)
    return;
  }

  let clueChanges = false;
  let numA = 0;
  let numD = 0;
  let numZ = 0;
  for (let idx in puz.clues) {
    let clue = puz.clues[idx];
    if (clue.dir == 'A') numA++;
    else if (clue.dir == 'D') numD++;
    else if (clue.dir == 'Z') numZ++;
    if (!clue.clue) {
      clue.clue = this.draftClue(idx);
      clueChanges = true;
      continue;
    }
    const parseEnum = this.puz.parseEnum(clue.clue);
    if (!parseEnum.enumStr && clue.enumStr) {
      // Restore enum hidden by *
      clue.clue += ' ' + clue.enumStr;
      clueChanges = true;
      continue;
    }
    this.renderClue(clue);
  }
  if (clueChanges) {
    this.updatePuzzle(exetRevManager.REV_CLUE_CHANGE)
    return;
  }

  // No more updatePuzzle() calls below inside this function: we're
  // satisfied with what we have and do not need to tweak it.

  puz.gridInput.addEventListener('keydown', this.handleKeyDown.bind(this));
  puz.gridInput.addEventListener('input', this.throttledGridInput.bind(this));

  const firstFewTabs = [
    {
      id: "exet",
      display: "Exet",
      hover: "Main Exet functions: load, save, grid-fill, edit, etc.",
      sections: [],
      url: "",
    },
    {
      id: "research",
      display: "Research",
      hover: "Research tools for the current word and clue",
      sections: [],
    },
    {
      id: "wordplay1",
      display: "Anagrams/()",
      hover: "Anagrams, composite anagrams, containments",
      sections: [
        {id: "xet-companag", maker: this.makeCAParam,
         title: "Anagrams, composite/extended anagrams",},
        {id: "xet-containments", maker: this.makeCharadeParam,
         title: "Containments"},
      ],
    },
    {
      id: "wordplay2",
      display: "Charades/-",
      hover: "Charades, anagrammed deletions",
      sections: [
        {id: "xet-charades", maker: this.makeCharadeParam,
         title: "Charades, anagrammed deletions"},
      ],
    },
    {
      id: "wordplay3",
      display: "Edits, Sounds",
      hover: "Edits (small substitutions, insertions, deletions), " +
             "Homophones, Spoonerisms",
      sections: [
        {id: "xet-edits", maker: this.makeCharadeParam,
         title: "Edits (deletions, insertions, and substitutions)"},
        {id: "xet-sounds", maker: this.makeSoundsParam,
         title: "&#x1F56A; Homophones~ and &#x1F50A; Spoonerisms&lrhar;"},
      ]
    },
  ];
  const lastFewTabs = [
    {
      id: "inds",
      display: "Lists",
      hover: "Cryptic indicators and abbreviations lists",
      sections: [],
    },
  ];

  this.tabs = {};
  for (let tab of firstFewTabs) {
    this.tabs[tab.id] = tab;
  }
  for (let tab of exetConfig.extraTabs) {
    if (tab.sections.length > 0) {
      for (let section of tab.sections) {
        if (typeof section.maker == 'string') {
          section.maker = this.getNamedMaker(section.maker);
        }
      }
    }
    this.tabs[tab.id] = tab;
  }
  for (let tab of lastFewTabs) {
    this.tabs[tab.id] = tab;
  }

  this.replaceHandlers()
  this.hideExolveElement('controls');
  this.hideExolveElement('saving');
  this.hideExolveElement('tools-link');
  this.hideExolveElement('print');
  this.hideExolveElement('webifi');
  this.hideExolveElement('notes');
  this.hideExolveElement('jotter');
  this.hideExolveElement('report-bug');
  this.hideExolveElement('exolve-link');
  this.hideExolveElement('postscript');

  this.copyright = document.getElementById(`${this.puz.prefix}-copyright`);
  this.copyright.innerHTML = `<span class="xet-action">Edit optional
      copyright notice: Ⓒ &nbsp;</span><span
      class="xet-editable"
      id="xet-copyright" contenteditable=true spellcheck=false
      oninput="exet.updateMetadata()">${this.puz.copyright}</span>`;
  this.copyright.style.display = '';
  this.xetCopyright = document.getElementById('xet-copyright');
  this.xetCopyright.title = 'Click to edit copyright';

  this.title = document.getElementById(`${this.puz.prefix}-title`);
  this.title.innerHTML = `<span class="xet-action">Edit optional
      title:</span><span
      class="xet-editable"
      id="xet-title" contenteditable=true spellcheck=false
      oninput="exet.updateMetadata()">${this.puz.title}</span>`;
  this.title.style.display = '';
  this.xetTitle = document.getElementById('xet-title');
  this.xetTitle.title = 'Click to edit title';

  this.setter = document.getElementById(`${this.puz.prefix}-setter`);
  this.setter.innerHTML = `<span class="xet-action">Edit optional
      setter(s):</span><span
      class="xet-editable"
      id="xet-setter" contenteditable=true spellcheck=false
      oninput="exet.updateMetadata()">${this.puz.setter}</span>`;
  this.setter.style.display = '';
  this.xetSetter = document.getElementById('xet-setter');
  this.xetSetter.title = 'Click to edit setter';

  this.preamble = document.getElementById(`${this.puz.prefix}-preamble`);
  this.explanations = document.getElementById(`${this.puz.prefix}-explanations`);

  // Make clues-box divs wider
  const cbs = document.getElementsByClassName('xlv-clues-box');
  for (let x = 0; x < cbs.length; x++) {
    cbs[x].style.width = '600px';
  }

  const aLabel = document.getElementById(`${this.puz.prefix}-across-label`);
  aLabel.insertAdjacentHTML('beforeend', ` (${numA} clues)`);
  const dLabel = document.getElementById(`${this.puz.prefix}-down-label`);
  dLabel.insertAdjacentHTML('beforeend', ` (${numD} clues)`);
  const zLabel = document.getElementById(`${this.puz.prefix}-z3d-label`);
  zLabel.insertAdjacentHTML('beforeend', ` (${numZ} clues)`);

  this.frame = document.createElement('div');
  this.frame.className = 'xet-frame';
  this.frame.id = 'xet-frame';
  this.puz.gridPanel.after(this.frame);

  delete this.shownChoicesHash;
  this.populateFrame();

  // Make current cell closer to white (so nina/colour can be seen better
  // when overlapping).
  this.puz.colorScheme['input'] = '#ffc6c4';

  // No special printing from this page.
  this.puz.printAsIs = true;

  // Add darkness and viability indicators ("viablots").
  for (let i = 0; i < puz.gridHeight; i++) {
    for (let j = 0; j < puz.gridWidth; j++) {
      const gridCell = puz.grid[i][j]
      if (gridCell.isLight && gridCell.solution == '?') {
        const viablot =
            document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        viablot.setAttributeNS(
            null, 'cx', puz.cellLeftPos(j, puz.circleR + puz.GRIDLINE +
                                           (puz.cellW/2 - puz.circleR)));
        viablot.setAttributeNS(
            null, 'cy', puz.cellTopPos(i, puz.circleR + puz.GRIDLINE +
                                          (puz.cellH/2 - puz.circleR)));
        viablot.setAttributeNS(null, 'class', 'xlv-cell-circle');
        viablot.style.fill = 'transparent';
        viablot.setAttributeNS(null, 'r', puz.circleR * 0.1);
        gridCell.viablot = viablot;
        gridCell.cellGroup.appendChild(viablot);
        viablot.addEventListener('click', puz.cellActivator.bind(puz, i, j));
      } else if (!gridCell.isLight) {
        const border = 4;
        const darkness =
          document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        darkness.setAttributeNS(null, 'x', this.puz.cellLeftPos(
            j, this.puz.GRIDLINE + border));
        darkness.setAttributeNS(null, 'y', this.puz.cellTopPos(
            i, this.puz.GRIDLINE + border));
        darkness.setAttributeNS(null, 'width',
                                this.puz.cellW - (2 * border));
        darkness.setAttributeNS(null, 'height',
                                this.puz.cellH - (2 * border));
        darkness.style.fill = 'transparent';
        if (!gridCell.cellGroup) {
          gridCell.cellGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          this.puz.svg.appendChild(gridCell.cellGroup);
        }
        gridCell.cellGroup.appendChild(darkness);
        gridCell.darkness = darkness;
        gridCell.cellGroup.addEventListener('click', this.navDarkness.bind(this, i, j));
      }
    }
  }

  // Display lexicon info
  const status = document.getElementById(`${this.puz.prefix}-status`);
  status.insertAdjacentHTML(
      'beforeend',
      `<span> Lexicon: ${exetLexicon.id} ${exetLexicon.language}
          ${exetLexicon.script}${exetLexicon.maxCharCodes > 1 ? ' [' + exetLexicon.maxCharCodes + ']' : ''}.</span>`);
  // Make the puzzle ID visible. But in a div, saving vspace.
  const idPara = document.getElementById(this.puz.prefix + '-id');
  if (idPara) {
    status.insertAdjacentHTML(
        'beforebegin', `<div class="xlv-metadata">${idPara.innerHTML}</div>`);
  }

  // Display sweeping activity indicator
  const gridParent = document.getElementById(`${this.puz.prefix}-grid-parent`);
  gridParent.insertAdjacentHTML('beforeend',
    `<div class="xet-sweeping-box"
       title="When there is a flashing red circle here, Exet is ` +
       'autofilling and/or pruning away non-viable grid-fill suggestions ' +
       'in the background"> ' +
       '<div class="xet-sweeping" id="xet-sweeping"></div></div>');
  this.sweepIndicator = document.getElementById('xet-sweeping');

  this.fillState = new ExetFillState(this.puz);
  this.resetViability();

  this.autofill = new ExetAutofill();

  this.updateSweepInd();
  this.reposition();
}

Exet.prototype.makeExetTab = function() {
  let exetTab = this.tabs["exet"]
  exetTab.content.innerHTML = `
<div class="xet-controls-col">
  <div class="xet-menu">
    <ul>
      <li class="xet-dropdown">
        <div class="xet-dropbtn"
            title="Click to create a new puzzle">New</div>
        <div class="xet-dropdown-content">
          <div class="xet-dropdown-div">
            <div style="font-style:italic">
              <label for="xet-w">Width:</label>
              <input id="xet-w" name="xet-w" value="${exetConfig.defaultDimension}"
                type="text" size="3" maxlength="3" placeholder="W">
              </input>
              &times;
              <label for="xet-h">Height:</label>
              <input id="xet-h" name="xet-h" value="${exetConfig.defaultDimension}"
                type="text" size="3" maxlength="3" placeholder="H">
              </input>
              Unique ID:
              <input id="xet-id" name="xet-id"
                value="xet-${Math.random().toString(36).substring(2, 8)}"
                title="Please change to a meaningful alphanumeric id (beginning with a letter) to identify easily later"
                type="text" size="15" maxlength="30" placeholder="alphanumeric unique id">
              </input>
            </div>
          </div>
          <hr>
          <div class="xet-dropdown-div" style="padding-bottom:0"
              title="Chequered grid with already added blocks that you can modify as needed">
            New blocked lattice grid (with blocks added):
            <div class="xet-controls-row">
              <div class="xet-dropdown-item"
                   title="Blocked with no top/left unches"
                onclick="exetBlank(document.getElementById('xet-w').value, ` +
                    `document.getElementById('xet-h').value, 1, ` +
                    `document.getElementById('xet-id').value, ` +
                    `true, true, false, false);">
                <img class="xet-icon" src="no-unches.png"/>
              </div>
              <div class="xet-dropdown-item"
                   title="Blocked with top but not left unches"
                onclick="exetBlank(document.getElementById('xet-w').value, ` +
                    `document.getElementById('xet-h').value, 1, ` +
                    `document.getElementById('xet-id').value, ` +
                    `true, true, true, false);">
                <img class="xet-icon" src="t-unches.png"/>
              </div>
              <div class="xet-dropdown-item"
                   title="Blocked with left but not top unches"
                onclick="exetBlank(document.getElementById('xet-w').value, ` +
                    `document.getElementById('xet-h').value, 1, ` +
                    `document.getElementById('xet-id').value, ` +
                    `true, true, false, true);">
                <img class="xet-icon" src="l-unches.png"/>
              </div>
              <div class="xet-dropdown-item"
                   title="Blocked with top/left unches"
                onclick="exetBlank(document.getElementById('xet-w').value, ` +
                    `document.getElementById('xet-h').value, 1, ` +
                    `document.getElementById('xet-id').value, ` +
                    `true, true, true, true);">
                <img class="xet-icon" src="tl-unches.png"/>
              </div>
            </div>
          </div>
          <hr>
          <div class="xet-dropdown-div" style="padding-bottom:0"
              title="Starting point for a chequered grid to which you will manually add blocks">
            New blocked lattice grid (no added blocks):
            <div class="xet-controls-row">
              <div class="xet-dropdown-item"
                   title="Blocked with no top/left unches"
                onclick="exetBlank(document.getElementById('xet-w').value, ` +
                    `document.getElementById('xet-h').value, 1, ` +
                    `document.getElementById('xet-id').value, ` +
                    `false, true, false, false);">
                <img class="xet-icon" src="no-unches.png"/>
              </div>
              <div class="xet-dropdown-item"
                   title="Blocked with top but not left unches"
                onclick="exetBlank(document.getElementById('xet-w').value, ` +
                    `document.getElementById('xet-h').value, 1, ` +
                    `document.getElementById('xet-id').value, ` +
                    `false, true, true, false);">
                <img class="xet-icon" src="t-unches.png"/>
              </div>
              <div class="xet-dropdown-item"
                   title="Blocked with left but not top unches"
                onclick="exetBlank(document.getElementById('xet-w').value, ` +
                    `document.getElementById('xet-h').value, 1, ` +
                    `document.getElementById('xet-id').value, ` +
                    `false, true, false, true);">
                <img class="xet-icon" src="l-unches.png"/>
              </div>
              <div class="xet-dropdown-item"
                   title="Blocked with top/left unches"
                onclick="exetBlank(document.getElementById('xet-w').value, ` +
                    `document.getElementById('xet-h').value, 1, ` +
                    `document.getElementById('xet-id').value, ` +
                    `false, true, true, true);">
                <img class="xet-icon" src="tl-unches.png"/>
              </div>
            </div>
          </div>
          <hr>
          <div class="xet-dropdown-item"
              title="Doubly checked U.S.-style blocked grid with already added blocks that you can modify as needed"
                onclick="exetBlank(document.getElementById('xet-w').value, ` +
                  `document.getElementById('xet-h').value, 1, ` +
                  `document.getElementById('xet-id').value, ` +
                  `true, false, false, false, false);">
              New U.S.-style doubly-checked grid (with blocks added)
          </div>
          <hr>
          <div class="xet-dropdown-item"
              title="Blank starting-point-grid for a blocked or barred grid to which you will manually add blocks/bars">
            New blank grid (add blocks/bars later), choose style:
            <div class="xet-dropdown-submenu">
              <div class="xet-dropdown-subitem"
                  onclick="exetBlank(document.getElementById('xet-w').value, ` +
                    `document.getElementById('xet-h').value, 1, ` +
                    `document.getElementById('xet-id').value, ` +
                    `false, false, false, false, true);">
                With enums
              </div>
              <div class="xet-dropdown-subitem"
                  onclick="exetBlank(document.getElementById('xet-w').value, ` +
                    `document.getElementById('xet-h').value, 1, ` +
                    `document.getElementById('xet-id').value, ` +
                    `false, false, false, false, false);">
                Without enums (U.S.-style)
              </div>
            </div>
          </div>
          <hr>
          <hr>
          <div class="xet-dropdown-item">
            New 3-D grid:
            <div class="xet-dropdown-submenu">
              <div style="padding:4px;text-align:center">
                <div>
                  <label for="xet-3d-w">Width:</label>
                  <input id="xet-3d-w" name="xet-3d-w" value="7"
                    type="text" size="3" maxlength="3" placeholder="W">
                  </input>
                  &times;
                  <label for="xet-3d-h">Height:</label>
                  <input id="xet-3d-h" name="xet-3d-h" value="5"
                    type="text" size="3" maxlength="3" placeholder="H">
                  </input>
                </div>
                <br>
                <div>
                  &times;
                  <label for="xet-3d-d">Depth:</label>
                  <input id="xet-3d-d" name="xet-3d-d" value="5"
                    type="text" size="3" maxlength="3" placeholder="D">
                  </input>
                </div>
                <br>
                <div>
                  Unique ID:
                  <input id="xet-3d-id" name="xet-3d-id"
                    value="xet-${Math.random().toString(36).substring(2, 8)}"
                    title="Please change to a meaningful alphanumeric id (beginning with a letter) to identify easily later"
                    type="text" size="15" maxlength="30" placeholder="alphanumeric unique id">
                  </input>
                </div>
              </div>
              <hr/>
              <div class="xet-dropdown-subitem"
                  onclick="exetBlank3D(document.getElementById('xet-3d-w').value, ` +
                    `document.getElementById('xet-3d-h').value, ` +
                    `document.getElementById('xet-3d-d').value, ` +
                    `document.getElementById('xet-3d-id').value);">
                Create new 3-D grid!
              </div>
            </div>
          </div>
        </div>
      </li>
      <li class="xet-dropdown">
        <div class="xet-dropbtn"
            title="Click to open a puzzle file or a previously saved puzzle">Open</div>
        <div class="xet-dropdown-content">
          <div class="xet-dropdown-item" id="xet-show-puz-chooser">
            Choose a puzzle previously opened with Exet
          </div>
          <div class="xet-dropdown-item" id="xet-show-rev-chooser">
            Go back to a specific revision of the current puzzle
          </div>
          <div class="xet-dropdown-item">
            Open Exolve or .puz or .ipuz file: <input id="xet-file"
                onchange="exetLoadFile();" type="file"></input>
          </div>
        </div>
      </li>
      <li class="xet-dropdown">
        <div class="xet-dropbtn"
            title="Click to make grid and other changes (please ` +
            `also note the listed keyboard shortcuts)">Edit</div>
        <div class="xet-dropdown-content">

          <div title="Toggle whether the current cell is a block or not" ` +
              `class="xet-dropdown-item" onclick="exet.handleKeyDown('.')">
            Toggle block (.)
          </div>
          <div title="Try to autmatically add random blocks while ` +
              `maintaining a valid grid"
              class="xet-dropdown-item" onclick="exet.handleKeyDown('#')">
            Add automagic blocks (#)
          </div>
          <div class="xet-dropdown-item">
            Toggle barred cell:
            <div class="xet-dropdown-submenu">
              <div class="xet-dropdown-subitem"
                  title="Toggle bar after this cell"
                  onclick="exet.handleKeyDown('|')">
                Toggle bar-after (|)
              </div>
              <div class="xet-dropdown-subitem"
                  title="Toggle bar under this cell"
                  onclick="exet.handleKeyDown('_')">
                Toggle bar-under (_)
              </div>
            </div>
          </div>

          <hr>
          <div title="Try to autofill the remaining grid"
            class="xet-dropdown-item" id="xet-autofill">Autofill:
            <div id="xet-autofill-active"><span id="xet-autofill-active-msg"></span>
                &#9654;</div>
            <div class="xet-dropdown-submenu xet-autofill-panel">
              <div>
                <button id="xet-autofill-startstop"
                    class="xlv-button">Start</button>
                <button id="xet-autofill-accept" style="float:right"
                  title="Accept autofill suggestions"
                  class="xlv-button">Accept</button>
                <button id="xet-autofill-clear" style="float:right"
                  title="Stop the autofill and clear all its suggestions"
                  class="xlv-button">Clear</button>
              </div>
              <hr>
              <div title="Increasing this may make the algorithm slower but may improve its success rate"
                  style="padding:4px">
                Beam search width:
                <input id="xet-autofill-max-beam"
                    name="xet-autofill-max-beam"
                    value="64" type="text" size="4" maxlength="4"
                    style="padding:0;margin:0">
                </input>
              </div>
              <div style="padding:4px">
                Try to find a pangram:
                <input id="xet-autofill-boost-pangram"
                    name="xet-autofill-boost-pangram" value="pangram"
                    type="checkbox">
                </input>
                &nbsp;
                <span title="Keep looping until the desired pangram is found (or until failure)">
                  <span class="xet-small">Loop until pangram?</span>
                  <input id="xet-autofill-pangram-loop"
                      name="xet-autofill-pangram-loop" value="pangram-loop"
                      type="checkbox">
                  </input>
                </span>
              </div>
              <div style="padding:4px">
                <details id="xet-autofill-pangram-details">
                  <summary>Try to constrain the pangram to these cells:</summary>
                  <table>
                    <tr>
                      <td>
                        <input id="xet-autofill-pangram-all"
                            name="xet-autofill-pangram-all"
                            value="pangram-all" type="checkbox">
                        </input>
                        All
                      </td>
                      <td>&nbsp;</td>
                      <td>
                        <input id="xet-autofill-pangram-checked"
                            name="xet-autofill-pangram-checked"
                            value="pangram-checked" type="checkbox">
                        </input>
                        Checked
                      </td>
                      <td>&nbsp;</td>
                      <td>
                        <input id="xet-autofill-pangram-unchecked"
                            name="xet-autofill-pangram-unchecked"
                            value="pangram-unchecked" type="checkbox">
                        </input>
                        Unchecked
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <input id="xet-autofill-pangram-circled"
                            name="xet-autofill-pangram-circled"
                            value="pangram-circled" type="checkbox">
                        </input>
                        Circled
                      </td>
                      <td>&nbsp;</td>
                      <td>
                        <input id="xet-autofill-pangram-firsts"
                            name="xet-autofill-pangram-firsts"
                            value="pangram-firsts" type="checkbox">
                        </input>
                        Starts
                      </td>
                      <td>&nbsp;</td>
                      <td>
                        <input id="xet-autofill-pangram-lasts"
                            name="xet-autofill-pangram-lasts"
                            value="pangram-lasts" type="checkbox">
                        </input>
                        Ends
                      </td>
                    </tr>
                  </table>
                </details>
              </div>
              <hr>
              <div style="padding:4px" title="You can edit the list of ` +
                  `preferred fills by clicking on the 'Set preferred ` +
                  `fills' button">
                Preferred fills used: <span
                  id="xet-autofill-preflex-used">0</span> of <span
                  id="xet-autofill-preflex-total"
                  >${this.preflex.length}</span>
              </div>
              <div title="You can edit the list of undesired fills, ` +
                `restrict fills by a popularity cutoff, and allow/` +
                `disallow proper nouns by clicking on the 'Set fill ` +
                `exclusions' button">
                <div style="padding:4px">
                  Min popularity: <span
                      id="xet-autofill-minpop">${this.minpop}</span> %ile
                  (<span id="xet-autofill-index-minpop">${Number(
                        this.indexMinPop - 1).toLocaleString()}` +
                  `</span> entries)
                </div>
                <div style="padding:4px" title="You can edit the list ` +
                    `of undesired fills by clicking on the 'Set fill ` +
                    `exclusions' button. You can restrict fills by a ` +
                    `popularity cutoff, and allow/disallow proper ` +
                    `nouns, stem-dupes, and reversals from the Exet tab.">
                  Proper nouns: <span
                    id="xet-autofill-proper-nouns">${this.noProperNouns ?
                          "disallowed" : "allowed"}</span>&nbsp;
                  <div style="padding:4px"></div>
                  Stem dupes: <span
                    id="xet-autofill-stem-dupes">${this.noStemDupes ?
                          "disallowed" : "allowed"}</span>&nbsp;
                  <div style="padding:4px"></div>
                  Undesired fills: <span
                      id="xet-autofill-unpreflex-total">${this.unpreflex.length}</span>
                  <div style="padding:4px"></div>
                  Trying reversals: <span
                    id="xet-autofill-try-reversals">${this.tryReversals ?
                          "allowed" : "disallowed"}</span>
                  (<span id="xet-autofill-reversals">0</span> reversed)
                </div>
              </div>
              <div style="padding:4px">
                Letters used: <span id="xet-autofill-letters">0</span>
                <span id="xet-autofill-pangram-cletters">(0 in pangram cells)</span>
                of ${exetLexicon.letters.length}
              </div>
              <hr>
              <div style="padding:4px">
                Step: <span id="xet-autofill-step"></span>
              </div>
              <div style="padding:4px">
                Score: <span id="xet-autofill-score">0.00</span>
                <span style="font-size:12px">
                (<span id="xet-autofill-score-v">0.00</span> viab + 
                <span id="xet-autofill-score-p">0.00</span> popu + 
                <span id="xet-autofill-score-f">0.00</span> full)
                </span>
              </div>
              <div style="padding:4px">
                Time taken: <span id="xet-autofill-time">--</span> ms
                (<span id="xet-autofill-speed">--</span> ms/step)
              </div>
              <div style="padding:4px">
                Beam size: <span id="xet-autofill-curr-beam"></span>
                 &nbsp;
              </div>
              <div style="padding:4px">
                Last status: <span id="xet-autofill-status"></span>
              </div>
              <hr>
              <div style="padding:4px" class="xet-blue" id="xet-is-pangram"
                  style="display:none">
                Pangram!
              </div>
            </div>
          </div>

          <div title="Accept all current autofilled entries"
              class="xet-dropdown-item" onclick="exet.acceptAll()">
            Accept autofilled entries (=)
          </div>
          <hr>

          <div class="xet-dropdown-item">
            Mark grid cell:
            <div class="xet-dropdown-submenu">
              <div class="xet-dropdown-subitem"
                title="Toggle encircling of cell"
                onclick="exet.handleKeyDown('@')">
                Toggle encircling (@)
              </div>
              <div class="xet-dropdown-subitem"
                title="Toggle marking cell prefilled"
                onclick="exet.handleKeyDown('!')">
                Toggle marking prefilled (!)
              </div>
              <div class="xet-dropdown-subitem" id="xet-toggle-nina"
                  title="Toggle marking cell/light as part of a nina">
                Toggle nina ($)
              </div>
              <div class="xet-dropdown-subitem"
                  id = "xet-toggle-colour" title="Toggle colouring cell/light">
                Toggle colouring (^)
              </div>
              <div class="xet-dropdown-subitem"
                  onclick="exet.clearAllMarkings()"
                  id = "xet-clear-all-markings"
                  title="Clear all circles, prefills, colours, ninas">
                Clear all markings!
              </div>
            </div>
          </div>

          <div class="xet-dropdown-item"
              title="Will not ask for confirmation before clearing."
              onclick="exet.puz.clearCurr()">
             Clear current light (Ctrl-q)
          </div>

          <div class="xet-dropdown-item"
              title="Will ask for confirmation before clearing."
              onclick="exet.puz.clearAll()">
             Clear all the lights! (Ctrl-Q)
          </div>

          <div class="xet-dropdown-item"
               title="Reverse the orientation of the currently active light (will ask for confirmation). If it's part of a linked group of clues, the linked group will get broken up."
               onclick="exet.reverseLight()">
             Reverse current light
          </div>

          <hr>

          <div class="xet-dropdown-item">
            Add/edit special sections:
            <div class="xet-dropdown-submenu">
              <div class="xet-dropdown-subitem" id="xet-edit-preamble"
                   title="Add or edit the 'preamble' section">
               Preamble
              </div>
              <div class="xet-dropdown-subitem" id="xet-edit-explanations"
                   title="Add or edit the 'explanations' section">
               Explanations
              </div>
              <div class="xet-dropdown-subitem" id="xet-edit-questions"
                   title="Add or edit the 'questions' section">
               Questions
              </div>
              <div class="xet-dropdown-subitem" id="xet-edit-other-sections"
                   title="Add or edit other Exolve sections">
               Other Exolve sections
              </div>
            </div>
          </div>

          <div class="xet-dropdown-item">
            Preferences:
            <div class="xet-dropdown-submenu">
              <div class="xet-dropdown-subitem">
                <input type="checkbox" id="xet-spellcheck"></input>
                Spellcheck clues/annos
              </div>
              <div style="padding:10px"
                  title="If you check this, then 'Toggle block/bar' ` +
                  `will not automatically enforce symmetry for this crossword">
                <input id="xet-asymmetry-ok" name="xet-asymmetry-ok"
                  value="asymmetric" type="checkbox">
                </input>
                <i>Allow asymmetry</i>
              </div>
            </div>
          </div>

        </div>
      </li>
      <li class="xet-dropdown">
        <div class="xet-dropbtn" title="Click to see analyses of the ` +
            `crossword (grid, grid-fill, clues)">Analysis</div>
        <div class="xet-dropdown-content xet-analysis" id="xet-analysis">
        </div>
      </li>
      <li class="xet-dropdown">
        <div class="xet-dropbtn" title="Click to save, with some formatting options">Save</div>
        <div class="xet-dropdown-content" id="xet-save">
          <div class="xet-dropdown-div">
            <b>Settings:</b>
            <div title="Change this to your own URL prefix for exolve-m.js ` +
              `and exolve-m.css. Only used when saving as Exolve if the ` +
              `Exolve data did not already have these URLs. Press Esc after ` +
              `clicking in the box to revert to default.">
              Exolve URL prefix:<br>
              <input id="xet-xlv-url-prefix" name="xet-xlv-url-prefix"
                value="${exetState.exolveUrl}"
                placeholder="Press Esc after clicking in the box to revert ` +
                  `to default" type="text" size="40" maxlength="100">
              </input>
            </div>
          </div>
          <hr>
          <div id="xet-save-warnings" class="xet-dropdown-div xet-red"></div>
          <hr>
          <div class="xet-dropdown-item">
            Download Exolve HTML file...
            <div class="xet-dropdown-submenu">
              <div class="xet-dropdown-subitem" onclick="exet.download(true)">
                With solutions (Ctrl-s)<br>
                (exet-exolve-<span class="xet-filetitle"></span>.html)
              </div>
              <div class="xet-dropdown-subitem" onclick="exet.download(false)">
                Without solutions<br>
                (exet-exolve-<span class="xet-filetitle"></span>-sans-solutions.html)
              </div>
            </div>
          </div>
          <div class="xet-dropdown-item">
            Print or download PDF file...
            <div class="xet-dropdown-submenu">
              <div class="xet-dropdown-subitem" onclick="exet.print(true)">
                With solutions
              </div>
              <div class="xet-dropdown-subitem" onclick="exet.print(false)">
                Without solutions
              </div>
            </div>
          </div>
          <div class="xet-dropdown-item" onclick="exet.downloadDotPuz()">
              Download PUZ file<br>
              (exet-<span class="xet-filetitle"></span>.puz)
          </div>
          <div class="xet-dropdown-item" onclick="exet.downloadIPuz()">
              Download IPUZ file<br>
              (exet-<span class="xet-filetitle"></span>.ipuz)
          </div>
          <div class="xet-dropdown-item">
            Download grid image SVG file...
            <div class="xet-dropdown-submenu">
              <div class="xet-dropdown-subitem" onclick="exet.saveGridSvg(true)">
                With solutions<br>
                (exet-<span class="xet-filetitle"></span>-solution-grid.svg)
              </div>
              <div class="xet-dropdown-subitem" onclick="exet.saveGridSvg(false)">
                Without solutions<br>
                (exet-<span class="xet-filetitle"></span>-blank-grid.svg)
              </div>
            </div>
          </div>
          <div class="xet-dropdown-item">
            Copy Exolve HTML widget code...
            <div class="xet-dropdown-submenu">
              <div class="xet-dropdown-div">
                <textarea rows="15" cols="32" id="xet-xlv-widget">
                </textarea>
              </div>
              <div class="xet-dropdown-subitem"
                  onclick="exet.toClipboard(true, 'xet-xlv-widget')">
                With solutions &#128203;
              </div>
              <div class="xet-dropdown-subitem"
                  onclick="exet.toClipboard(false, 'xet-xlv-widget')">
                Without solutions &#128203;
              </div>
            </div>
          </div>
          <hr>
          <div id="xet-xst-show-panel" class="xet-dropdown-item">
            Upload for hosting at Exost
          </div>
        </div>
      </li>
      <li class="xet-dropdown">
        <div class="xet-dropbtn" id="xet-storage-heading">Storage</div>
        <div class="xet-dropdown-content" id="xet-storage">
          <div class="xet-dropdown-item" onclick="exetRevManager.autofree()"
              title="Back up all current crosswords to exet-backup-[timestamp].json and then purge every other old revision (keeping latest 25 and latest hour's revisions untouched). A convenient combination of the next two menu choices."
              id="xet-auto-free-space">
            <span class="xet-green">Auto-Free!</span>: Save back-up file, then purge some old revisions
          </div>
          <div class="xet-dropdown-item" id="xet-manage-storage">
            Manage local storage (Used =
                <span id="xet-local-storage-used"></span> MB,
            Available &asymp; 
              <span id="xet-local-storage-free"></span> MB)
          </div>
          <div class="xet-dropdown-item"
             onclick="exetRevManager.saveAllRevisions()">
            Back up all current crosswords to exet-backup-<i>timestamp</i>.json
            <br></br>
            <span id="xet-last-backup">Last backed up at:
              <span id="xet-last-backup-time"></span></span>
          </div>
          <div class="xet-dropdown-item">
            Merge saved back-ups file:
            <input id="xet-merge-revs-file"
               onchange="exetRevManager.mergeRevisionsFile()" type="file"
               accept=".json"></input><br>
            <input id="xet-merge-only-latest-revs"
               name="xet-merge-only-latest-revs"
              checked=true value="merge-only-latest-revs" type="checkbox">
            </input>
            Take only the latest revision per crossword
          </div>
          <hr>
          <hr>
        </div>
      </li>
      <li class="xet-dropdown" style="float:right;">
        <div class="xet-dropbtn" id="xet-about" title="Click to see notes, ` +
            `notices, and pointers about Exet...">About <span
            id='xet-outdated' style='display:none'>&#9888;</span></div>
        <div class="xet-dropdown-content"
            style="right:0;width:90ch;padding:8px;">
          <div id="xet-outdated-message" style="display:none"></div>
          <iframe id="xet-about-iframe" class="xet-about"
              src="about-exet.html">
          </iframe>
        </div>
      </li>
      <li class="xet-dropdown" style="float:right">
        <div class="xet-dropbtn"
            title="Review usage tips">Tips</div>
        <div class="xet-dropdown-content xet-tips" id="xet-tips"
            style="right:0">
          <button id="xet-prev-tip" title="See previous tip"
              onclick="exet.navTip(-1)"
              class="xlv-small-button">Prev</button>
          <button id="xet-random-tip" title="See another tip"
              onclick="exet.setRandomTip()"
              class="xlv-small-button">Random</button>
          <button id="xet-next-tip" title="See next tip"
              onclick="exet.navTip(1)"
              class="xlv-small-button">Next</button>
          <div class="xet-tip" id="xet-tip">
          </div>
        </div>
      </li>
    </ul>
    <div id="xet-rev-chooser" class="xet-rev-chooser" style="display:none">
    </div>
  </div>
  <hr class="xet-full-width"/>
  <div id="xet-temp" style="display:none">
  </div>

  <div class="xet-controls-row xet-panel xet-high-tall-box">
    <div class="xet-controls-col" style="position:relative">
      <span class="xet-light-regexp-icon"
          title="This light has a regexp constraint, click to view/edit."
          id="xet-light-regexp-icon">&#128279;</span>
      <div class="xet-fills-heading">
        <span style="font-weight:bold" title="Click on a suggestion below to ` +
            `select it.">Choose grid-fill:</span>
        <button class="xlv-small-button" style="padding:5px 4px;color:black"
            title="Click to see grid-fill possibilities from web sources of words and phrases"
            id="xet-show-web-fills">Web sources
          <div class="xet-web-fills-panel"
              title="Click anywhere outside this box to dismiss it"
              id="xet-web-fills-panel" style="display:none">
          </div>
        </button>
      </div>
      <div class="xet-choices-box" id="xet-light-choices-box">
        <table id="xet-light-choices"
          title="Click to choose this entry (green if in the preferred fills list)"
          class="xet-choices">
        </table>
        <table id="xet-light-rejects"
          title="Click to choose this entry that matches the letters filled so far, but does not seem viable towards a complete grid-fill (green if in the preferred fills list)"
          class="xet-choices">
        </table>
      </div>
      <div title="You can provide up to ${this.MAX_PREFLEX} preferred words/phrases to try ` +
          `and use in the grid-fill" class="xet-long-button">
        <button class="xlv-small-button" style="padding:5px 4px"
          id="xet-edit-preflex">Set preferred fills</button>
        <span class="xet-smaller-text">
          <span id="xet-preflex-used">0</span>/<span id="xet-preflex-size">${this.preflex.length}</span> used
        </span>
      </div>
      <div title="You can provide words/phrases to exclude from the ` +
        `grid-fill, set a minimum popularity, and include/exclude proper nouns"
          class="xet-long-button">
        <button class="xlv-small-button"
            style="padding:5px 4px;color:chocolate"
            id="xet-edit-unpreflex">Set fill exclusions</button>
        <span class="xet-smaller-text">
          <span id="xet-unpreflex-size">${this.unpreflex.length}</span> set
        </span>
      </div>
      <div class="xet-text-editor"
          title="Click anywhere outside this box to dismiss it"
          id="xet-preflex-editor" style="display:none">
        <div>
          List of preferred words/phrases (up to ${this.MAX_PREFLEX}):
          <span class="xet-processing" style="display:none"
              id="xet-preflex-processing">
            (processing...)
          </span>
        </div>
        <div class="xet-choices-box xet-mid-tall-box">
          <div style="height:100ch;width:30ch" id="xet-preflex-input"
            contenteditable="true" class="xet-preflex-entry"
            oninput="exet.throttledUpdatePreflex()"></div>
        </div>
      </div>
      <div class="xet-text-editor"
          title="Click anywhere outside this box to dismiss it"
          id="xet-unpreflex-editor" style="display:none">
        <div>
           List of words/phrases that you do not want as fills:
        </div>
        <div class="xet-choices-box xet-mid-tall-box">
          <textarea rows="100" cols="25" id="xet-unpreflex-input"
            class="xet-unpreflex-entry"
            oninput="exet.throttledUpdateUnpreflex()"></textarea>
        </div>
      </div>
    </div>
    <div class="xet-controls-col">
      <div class="xet-controls-row xet-clues-box">
        <div class="xet-fill-settings">
          <div>
            <table>
            <tr>
              <td colspan="2">
                <b title="Limit fill suggestions to words/phrases above this ` +
                  `percentile threshold of popularity. Set this to 100 to use ` +
                  `only the preferred fills list.">Minimum popularity score:</b>
                <input id="xet-minpop" name="xet-minpop" class="xlv-answer"
                  size="4" maxlength="4" type="text"></input> %ile
              </td>
            </tr>
            <tr>
              <td>
                <b title="If checked, this excludes proper nouns from ` +
                    `fill suggestions">No proper nouns:</b>
                <input id="xet-no-proper-nouns" name="xet-no-proper-nouns"
                    value="no-proper-nouns" type="checkbox">
                </input>
              </td>
              <td>
                <b title="If checked, this allows trying reversals of unfilled ` +
                    `lights, when finding fill suggestions">Try reversals:</b>
                <input id="xet-try-reversals" name="xet-try-reversals"
                    value="try-reversals" type="checkbox">
                </input>
              </td>
            </tr>
            <tr>
              <td>
                <b title="If checked, this excludes word choices that have ` +
                    `the same stemmed forms as any other entries (e.g., if ` +
                    `SWIM is picked, then SWIMS will not be considered)">` +
                    `No stem-dupes:</b>
                <input id="xet-no-stem-dupes" name="xet-no-stem-dupes"
                    value="no-stem-dupes" type="checkbox">
                </input>
              </td>
              <td>
              </td>
            </tr>
            <tr>
              <td colspan="2">
                <div class="xet-fill-settings-summary"
                    title="Note that the number of lexicon entries indicated here could include some already counted in preferred fills, if there is overlap.">
                  Using <span id="xet-preflex-size-fill-settings"></span> preferred fills, and
                  <br>
                  top <span id="xet-minpop-incl">${Number(
                      this.indexMinPop - 1).toLocaleString()}</span> of
                  ${Number(exetLexicon.startLen - 1).toLocaleString()} lexicon words/phrases
                </div>
              </td>
            </tr>
            </table>
          </div>
        </div>
        <div id="xet-scratch-pad" class="xet-scratch-pad">
        </div>
      </div>
    </div>
  </div>
</div>
<div id="xet-preamble" class="xet-text-editor" style="display:none">
  <div style="padding:6px">
    <b>Edit the contents of the optional "preamble" section:</b><br>
    The preamble is shown at the top of the crossword, and includes any special
    instructions or notes that the setter might want to provide to solvers.
    HTML tags may be used in this section.
  </div>
  <div class="xet-choices-box xet-mid-tall-box">
     <textarea rows="100" cols="55" wrap="hard" id="xet-preamble-text">
     </textarea>
  </div>
</div>
<div id="xet-explanations" class="xet-text-editor" style="display:none">
  <div style="padding:6px">
    <b>Edit the contents of the optional "explanations" section:</b><br>
    The explanations section is shown under the crossword, after a fully
    correct solution is checked or the full solution is revealed. It might
    include notes from the setter about any special theme or features that
    the setter might want to share with solvers.
    HTML tags may be used in this section.
  </div>
  <div class="xet-choices-box xet-mid-tall-box">
     <textarea rows="100" cols="55" wrap="hard" id="xet-explanations-text">
     </textarea>
  </div>
</div>
<div id="xet-questions" class="xet-text-editor" style="display:none">
</div>
<div id="xet-tweak-colour-nina" class="xet-text-editor"
  style="display:none">
</div>
<div id="xet-other-sections" class="xet-text-editor" style="display:none">
  <div style="padding:6px">
    <b>Edit these additional Exolve sections here, if desired:</b><br>
    <ul>
    <li><a href="https://github.com/viresh-ratnakar/exolve#exolve-credits">exolve-credits</a></li>
    <li><a href="https://github.com/viresh-ratnakar/exolve#exolve-force-hyphen-right-exolve-force-hyphen-below-exolve-force-bar-right-exolve-force-bar-below">exolve-force-{bar,hyphen}-{below,right}</a></li>
    <li><a href="https://github.com/viresh-ratnakar/exolve#exolve-option">exolve-option</a></li>
    <li><a href="https://github.com/viresh-ratnakar/exolve#exolve-postscript">exolve-postscript</a></li>
    <li><a href="https://github.com/viresh-ratnakar/exolve#exolve-relabel">exolve-relabel</a></li>
    <li><a href="https://github.com/viresh-ratnakar/exolve#exolve-submit">exolve-submit</a></li>
    </ul>
    If there are any problems in parsing the text, then the error will be shown in red below and
    the text will not be used until the error is fixed.
  </div>
  <div id="xet-other-sections-error" style="min-height:20px" class="xet-red">
  </div>
  <div class="xet-choices-box xet-mid-tall-box">
     <textarea rows="100" cols="55" wrap="hard" id="xet-other-sections-text">
     </textarea>
  </div>
</div>
  `;
  // Set up menu click handling
  const menuButtons = exetTab.content.getElementsByClassName('xet-dropbtn');
  for (let i = 0; i < menuButtons.length; i++) {
    let menuPanel = menuButtons[i].nextElementSibling;
    menuButtons[i].addEventListener('click', e => {
      if (menuPanel.id && menuPanel.id == "xet-analysis") {
        exet.updateAnalysis(menuPanel);
      } else if (menuPanel.id && menuPanel.id == "xet-save") {
        exet.updateSavePanel(menuPanel);
      }
      exetModals.showModal(menuPanel);
      e.stopPropagation();
    });
    menuButtons[i].addEventListener('mouseenter', e => {
      if (!exetModals.modal ||
          !exetModals.modal.classList.contains('xet-dropdown-content')) {
        return;
      }
      exetModals.hide();
    });
  }
  this.tips = document.getElementById("xet-tips");
  this.tip = document.getElementById("xet-tip");
  this.setRandomTip();

  this.lChoices = document.getElementById("xet-light-choices");
  this.lRejects = document.getElementById("xet-light-rejects");
  this.webFillsPanel = document.getElementById("xet-web-fills-panel");
  this.showWebFillsButton = document.getElementById("xet-show-web-fills");
  if (!exetConfig.webFills || exetConfig.webFills.length == 0) {
    this.showWebFillsButton.style.display = 'none';
  } else {
    this.showWebFillsButton.addEventListener('click', e=> {
      exet.showWebFills();
      e.stopPropagation();
    });
  }

  this.minpopInclSpan = document.getElementById("xet-minpop-incl");
  this.minpopInput = document.getElementById("xet-minpop");
  this.minpopInput.value = this.minpop;
  this.renderMinPop();
  this.minpopInput.addEventListener('change', e => {
    if (isNaN(this.minpopInput.value) ||
        this.minpopInput.value < 0 || this.minpopInput.value > 100) {
      this.minpopInput.value = this.minpop;
      return;
    }
    this.setMinPop(this.minpopInput.value);
    this.renderMinPop();
    this.resetViability();
    exetRevManager.throttledSaveRev(exetRevManager.REV_FILL_OPTIONS_CHANGE);
  });
  this.noProperNounsInput = document.getElementById("xet-no-proper-nouns");
  this.noProperNounsInput.checked = this.noProperNouns;
  this.noProperNounsInput.addEventListener('change', e => {
    this.noProperNouns = this.noProperNounsInput.checked;
    this.resetViability();
    exetRevManager.throttledSaveRev(exetRevManager.REV_FILL_OPTIONS_CHANGE);
  });
  this.noStemDupesInput = document.getElementById("xet-no-stem-dupes");
  this.noStemDupesInput.checked = this.noStemDupes;
  if (exetLexicon.hasOwnProperty('stems')) {
    this.noStemDupesInput.addEventListener('change', e => {
      this.noStemDupes = this.noStemDupesInput.checked;
      this.resetViability();
      exetRevManager.throttledSaveRev(exetRevManager.REV_FILL_OPTIONS_CHANGE);
    });
  } else {
    this.noStemDupesInput.disabled = true;
    this.noStemDupesInput.title = 'We do not yet have stemming data for this language';
  }
  if (exetLexicon.script != 'Latin') {
    this.noProperNounsInput.disabled = true;
    this.noProperNounsInput.title = 'Proper-noun filtering is only available for Latin currently';
  }
  this.tryReversalsInput = document.getElementById("xet-try-reversals");
  this.tryReversalsInput.checked = this.tryReversals;
  this.tryReversalsInput.addEventListener('change', e => {
    this.tryReversals = this.tryReversalsInput.checked;
    this.resetViability();
    exetRevManager.throttledSaveRev(exetRevManager.REV_OPTIONS_CHANGE);
  });

  this.lightRegexpIcon = document.getElementById("xet-light-regexp-icon");
  this.lightRegexpIcon.style.display = 'none';
  this.lightRegexpIcon.addEventListener('click', this.showLightRegexpPanel.bind(this));

  this.preflexUsed = document.getElementById("xet-preflex-used");
  this.preflexSize = document.getElementById("xet-preflex-size");
  this.preflexSize2 = document.getElementById("xet-preflex-size-fill-settings");
  this.preflexEditor = document.getElementById("xet-preflex-editor");
  this.preflexInput = document.getElementById("xet-preflex-input");
  this.preflexWait = document.getElementById("xet-preflex-processing");
  this.renderPreflex();
  document.getElementById("xet-edit-preflex").addEventListener('click', e=> {
    exet.renderPreflex();
    exetModals.showModal(exet.preflexEditor);
    e.stopPropagation();
  });
  this.unpreflexSize = document.getElementById("xet-unpreflex-size");
  this.unpreflexEditor = document.getElementById("xet-unpreflex-editor");
  this.unpreflexInput = document.getElementById("xet-unpreflex-input");
  this.renderUnpreflex();
  document.getElementById("xet-edit-unpreflex").addEventListener('click', e=> {
    exetModals.showModal(exet.unpreflexEditor);
    e.stopPropagation();
  });

  this.revChooser = document.getElementById("xet-rev-chooser");
  let showPuzChooser = document.getElementById("xet-show-puz-chooser");
  showPuzChooser.addEventListener('click', e => {
    exetRevManager.choosePuzRev({
        elt: exet.revChooser,
        callback: exetFromHistory,
        sortBy: 'timestamp',
        sortOrder: 'decreasing'
    });
    exetModals.showModal(exet.revChooser);
    e.stopPropagation();
  })
  const showRevChooser = document.getElementById("xet-show-rev-chooser");
  showRevChooser.addEventListener('click', e => {
    exetRevManager.choosePuzRev({
        onlyPuz: this.puz,
        elt: exet.revChooser,
        callback: exetFromHistory,
    });
    exetModals.showModal(exet.revChooser);
    e.stopPropagation();
  })
  const manageStorage = document.getElementById("xet-manage-storage");
  this.lsUsedSpan = document.getElementById("xet-local-storage-used");
  this.lsFreeSpan = document.getElementById("xet-local-storage-free");
  this.storageHeading = document.getElementById("xet-storage-heading");
  manageStorage.addEventListener('click', e => {
    exetRevManager.choosePuzRev({
        forStorage: true,
        elt: exet.revChooser,
        sortBy: 'space',
        sortOrder: 'decreasing'
    });
    exetModals.showModal(exet.revChooser);
    e.stopPropagation();
  });

  // Saving options
  const exolveUrl = document.getElementById("xet-xlv-url-prefix")
  exolveUrl.addEventListener('change', e => {
    exolveUrl.value = exolveUrl.value.trim();
    if (exolveUrl.value.length > 0 &&
        exolveUrl.value[exolveUrl.value.length - 1] != '/') {
      exolveUrl.value = exolveUrl.value + '/';
    }
    exetState.exolveUrl = exolveUrl.value;
    exetRevManager.saveLocal(exetRevManager.SPECIAL_KEY, JSON.stringify(exetState));
  });
  exolveUrl.addEventListener('keyup', e => {
    if (e.key == "Escape") {
      exolveUrl.value = "https://viresh-ratnakar.github.io/";
      exetState.exolveUrl = exolveUrl.value;
      exetRevManager.saveLocal(exetRevManager.SPECIAL_KEY, JSON.stringify(exetState));
    }
  });

  // Editing options
  const asymOKButton = document.getElementById("xet-asymmetry-ok")
  asymOKButton.checked = this.asymOK;
  asymOKButton.addEventListener('change', e => {
    exet.asymOK = asymOKButton.checked ? true : false;
    exetRevManager.throttledSaveRev(exetRevManager.REV_OPTIONS_CHANGE);
  });

  const preamble = document.getElementById("xet-preamble")
  this.preambleText = document.getElementById("xet-preamble-text")
  this.preambleText.value = this.preamble.innerHTML;
  this.preambleText.addEventListener('input', e => {
    const text = exet.preambleText.value.trim();
    this.preamble.innerHTML = text;
    this.preamble.style.display = text ? '' : 'none';
    exetRevManager.throttledSaveRev(exetRevManager.REV_METADATA_CHANGE);
  });
  document.getElementById("xet-edit-preamble").addEventListener('click', e => {
    this.puz.deactivator();
    exetModals.showModal(preamble)
    e.stopPropagation();
  })
  document.getElementById("xet-toggle-nina").addEventListener('click', e => {
    this.toggleNina(e);
    e.stopPropagation();
  })
  document.getElementById("xet-toggle-colour").addEventListener('click', e => {
    this.toggleColour(e);
    e.stopPropagation();
  })

  const explanations = document.getElementById("xet-explanations")
  const explanationsText = document.getElementById("xet-explanations-text")
  explanationsText.value = this.explanations.innerHTML;
  explanationsText.addEventListener('input', e => {
    const text = explanationsText.value.trim()
    this.explanations.innerHTML = text
    this.explanations.style.display = text ? '' : 'none'
    exetRevManager.throttledSaveRev(exetRevManager.REV_METADATA_CHANGE);
  });
  document.getElementById("xet-edit-explanations").addEventListener(
      'click', e => {
    exetModals.showModal(explanations)
    e.stopPropagation();
  })

  const questions = document.getElementById("xet-questions");
  document.getElementById("xet-edit-questions").addEventListener('click', e => {
    this.populateQuestions(questions);
    exetModals.showModal(questions)
    e.stopPropagation();
  });

  document.getElementById("xet-xst-show-panel").addEventListener(
      'click', e => {
    this.showExostPanel();
    e.stopPropagation();
  });

  this.tweakColourNina = document.getElementById("xet-tweak-colour-nina")
  this.tweakColourNina.style.left = "100%";
  document.getElementById(this.puz.prefix + '-grid-parent').appendChild(
      this.tweakColourNina);

  this.otherSecPanel = document.getElementById("xet-other-sections")
  this.otherSecText = document.getElementById("xet-other-sections-text")
  this.otherSecError = document.getElementById("xet-other-sections-error")
  this.otherSecText.spellcheck = false;
  this.otherSecText.addEventListener(
      'input', this.updateOtherSections.bind(this));
  document.getElementById("xet-edit-other-sections").addEventListener(
      'click', e => {
    this.puz.deactivator();
    if (this.postscript) {
      this.postscript.style.display = '';
    }
    this.otherSecText.value = this.exolveOtherSec;
    this.otherSecError.innerText = '';
    exetModals.showModal(this.otherSecPanel)
    e.stopPropagation();
  })

  const spellcheck = document.getElementById("xet-spellcheck");
  spellcheck.checked = exetState.spellcheck;
  spellcheck.addEventListener('change', e => {
    this.puz.deactivator();
    exetState.spellcheck = spellcheck.checked ? true : false;
    if (this.puz.currCellIsValid()) {
      const row = this.puz.currRow;
      const col = this.puz.currCol;
      if (this.puz.grid[row][col].isLight) {
        this.puz.activateCell(row, col)
      }
    }
    exetRevManager.saveLocal(exetRevManager.SPECIAL_KEY, JSON.stringify(exetState));
  });

  // Move the scratch pad over to here.
  const scratchP = document.getElementById("xet-scratch-pad")
  this.puz.scratchPad.rows = "3"
  this.puz.scratchPad.cols = "32"
  const scratchPLabel = document.getElementById(this.puz.prefix + '-shuffle')
  scratchPLabel.style.padding = '8px 0'
  scratchPLabel.style.fontWeight = 'bold'
  scratchP.appendChild(scratchPLabel)
  scratchP.appendChild(this.puz.scratchPad)

  // Pull in the clues.
  this.cluesPanel = document.createElement('div')
  this.cluesPanel.id = 'xet-clues'
  this.cluesPanel.className = 'xet-panel xet-clues-panel xet-clues-box'
  this.cluesPanel.title = 'You can edit the current clue as shown above ' +
                          'the grid by clicking on it.'
  scratchP.after(this.cluesPanel)
  this.cluesPanel.appendChild(document.getElementById(
        `${this.puz.prefix}-clues`))
}

Exet.prototype.stripInputLF = function(inp) {
  if (!inp) return
  if (inp.innerText.indexOf('\n') < 0) return
  inp.innerText = inp.innerText.replace(/\n/g, ' ')
}

Exet.prototype.addStat = function(dict, stat, details) {
  if (!dict[stat]) {
    dict[stat] = {
      count: 0,
      details: ''
    }
  }
  dict[stat].count++
  if (details) {
    if (dict[stat].details) dict[stat].details += ', '
    dict[stat].details += details
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
        this.addStat(dInfo.letters, gridCell.solution, rowcol);
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
  if (analysis.unchequeredOK(false)) {
    html += '<li>Every light cell is checked</li>';
  } else  if (analysis.chequeredOK(false, false)) {
    html += '<li>No consecutive unches</li>';
    if (!analysis.chequeredOK(false, true)) {
      html += '<li class="xet-red"><i>Some lights shorter than 9 letters have &gt;50% unches</i></li>';
    }
  } else {
    html += '<li class="xet-red"><i>Has consecutive unches</i></li>';
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
    html += `<td style="text-align:right">${ct}</td><td>`;
    html += numeric ? 'of' : '&times;';
    html += `</td><td>${key}</td>`;
    html += `<td><div class="xet-plotbar"
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

Exet.prototype.updateMetadata = function() {
  if (!this.puz) {
    return
  }
  if (this.throttledMetadataTimer) {
    clearTimeout(this.throttledMetadataTimer);
  }
  this.throttledMetadataTimer = setTimeout(() => {
    this.saveCursor()
    if (this.xetTitle) {
      this.stripInputLF(this.xetTitle)
      this.puz.title = this.xetTitle.innerText
    }
    if (this.xetSetter) {
      this.stripInputLF(this.xetSetter)
      this.puz.setter = this.xetSetter.innerText
    }
    if (this.xetCopyright) {
      this.stripInputLF(this.xetCopyright)
      this.puz.copyright = this.xetCopyright.innerText
    }
    this.restoreCursor()
    this.throttledMetadataTimer = null;
    exetRevManager.throttledSaveRev(exetRevManager.REV_METADATA_CHANGE);
  }, 2000);
}

Exet.prototype.updateOtherSections = function() {
  if (!this.puz) {
    return
  }
  const ALLOWED_SECTIONS = {
    'exolve-credits': true,
    'exolve-email': true,
    'exolve-postscript': true,
    'exolve-submit': true,
    'exolve-option': true,
    'exolve-relabel': true,
    'exolve-no-rebus': true,
    'exolve-force-hyphen-right': true,
    'exolve-force-hyphen-below': true,
    'exolve-force-bar-right': true,
    'exolve-force-bar-below': true,
    'exolve-cell-decorator': true,
  }
  this.otherSecError.innerText = '';
  if (this.throttledOtherSecTimer) {
    clearTimeout(this.throttledOtherSecTimer);
  }
  this.throttledOtherSecTimer = setTimeout(() => {
    this.throttledOtherSecTimer = null;
    const text = this.otherSecText.value;
    const matches = text.match(/exolve-[a-zA-Z0-9-]+/g);
    for (let i = 0; matches && i < matches.length; i++) {
      m = matches[i];
      if (!ALLOWED_SECTIONS[m]) {
        this.otherSecError.innerText = m + ' is not allowed here';
        return;
      }
    }
    const saved = this.exolveOtherSec;
    this.exolveOtherSec = text;
    const tempId = this.puz.id + '-temp'
    const specs = this.getExolve(tempId, true);
    let specsOK = true;
    const xetTemp = document.getElementById("xet-temp");
    xetTemp.innerHTML = ''
    try {
      const oldalert = window.alert;
      window.alert = function() {};
      const newPuz = new Exolve(specs, "xet-temp", null, false, 0, 0, false);
      window.alert = oldalert;
    } catch (err) {
      specsOK = false;
      this.otherSecError.innerText = '' + err;
    }
    xetTemp.innerHTML = ''
    if (exolvePuzzles[tempId]) {
      exolvePuzzles[tempId].destroy();
    }
    if (specsOK) {
      this.updatePuzzle(exetRevManager.REV_METADATA_CHANGE);
      if (this.postscript) {
        this.postscript.style.display = '';
      }
    } else {
      this.exolveOtherSec = saved;
    }
  }, 2000);
}

Exet.prototype.uploadToExost = function(solved=true) {
  const exolve = this.getExolve('', false, solved);
  this.exost.uploadExolve(exolve, this.puz);
}

Exet.prototype.exostUploadCallback = function(result) {
  /** Can't use "this" as we detach this function before use */
  if (result.error) {
    console.log('Exost upload failed: ' + result.error);
    return;
  }
  if (result.url) {
    exet.exostState.url = result.url;
    exet.exostState.urlElt.href = result.url;
    exet.exostState.urlElt.innerText = result.url;
    exet.exostState.urlRow.style.display = '';
  }
}

Exet.prototype.showExostPanel = function() {
  /**
   * We reuse an Exost panel across multiple crosswords so that the user's
   * email address and password fields are retained.
   */
  if (!this.exostState) {
    this.exostState = {id: ''};
    this.exostState.panel = document.createElement('div');
    this.exostState.panel.className = 'xet-xst-panel';
    this.exostState.panel.style.display = 'none';
    this.exostState.panel.innerHTML = `
      <p>
        <b>Upload/update at <a target="_blank"
           href="https://xlufz.ratnakar.org/exost.html">Exost</a>
           crossword hosting</b>
      </p>
      <table>
        <tr>
          <td colspan="2">
            <label for="xet-xst-email">Email: </label>
            <input type="email" class="xlv-answer" id="xet-xst-email" size="32" placeholder="your@email.address">
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <label for="xet-xst-pwd">Password: </label>
            <input type="password" class="xlv-answer" id="xet-xst-pwd" size="28" placeholder="Retrievable via email">
          </td>
        </tr>
        <tr>
          <td>
            Get your password emailed to you:
          </td>
          <td>
            <button class="xlv-small-button" onclick="exet.exost.requestPwd()">Request</button>
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <span class="xet-xst-status" id="xet-xst-pwd-status"></span>
          </td>
        </tr>
        <tr>
          <td>
            Upload/update Exost-hosted version:
          </td>
          <td>
            <button class="xlv-small-button" onclick="exet.uploadToExost(true)">With solutions</button>
            <button class="xlv-small-button" onclick="exet.uploadToExost(false)">Sans solutions</button>
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <span class="xet-xst-status" id="xet-xst-upload-status"></span>
          </td>
        </tr>
        <tr id="xet-xst-url-row">
          <td colspan="2">
            Exost URL: <a class="xet-xst-status" target="_blank" id="xet-xst-url"></a>
            <button id="xet-xst-cpurl-u" onclick="exet.exost.copyURL(exet.exostState.url, false, 'xet-xst-cpurl-u')"
              title="Copy Exost URL">&#128279;</button>
            <button id="xet-xst-cpurl-e" onclick="exet.exost.copyURL(exet.exostState.url, true, 'xet-xst-cpurl-e')"
              title="Copy Exost iframe embed code">&lt;/&gt;</button>
          </td>
        </tr>
      </table>
      <p style="font-size:90%;font-style:italic">
        You can view the list of all your uploaded crosswords (and delete any,
        if you wish to) at the <a target="_blank"
          href="https://xlufz.ratnakar.org/exost.html">Exost</a> site. Please
        note that by uploading your crossword, you're agreeing to the simple
        terms and conditions listed on the Exost site. In particular, please
        note that if you've opened someone else's crossword on this page, you
        shouldn't be uploading it for hosting anywhere unless you've received
        explicit permission from them.
      </p>
    `;
  }
  this.frame.appendChild(this.exostState.panel);

  this.exost = new ExolveExost({
    exostURL: 'https://xlufz.ratnakar.org/exost.html',
    apiServer: 'https://xlufz.ratnakar.org/exost.php',
    emailEltId: 'xet-xst-email',
    pwdEltId: 'xet-xst-pwd',
    pwdStatusEltId: 'xet-xst-pwd-status',
    uploadStatusEltId: 'xet-xst-upload-status',
    uploadCallback: exet.exostUploadCallback
  });
  this.exostState.urlRow = document.getElementById('xet-xst-url-row');
  this.exostState.urlElt = document.getElementById('xet-xst-url');
  this.exostState.uploadStatus = document.getElementById('xet-xst-upload-status');
  if (this.exostState.id != this.puz.id) {
    this.exostState.id = this.puz.id;
    this.exostState.url = '';
    this.exostState.urlRow.style.display = 'none';
    this.exostState.uploadStatus.innerHTML = '';
  }
  exetModals.showModal(this.exostState.panel);
}

Exet.prototype.trimUrl = function(url) {
  if (url.length < 100) return url;
  return url.substr(0, 97) + '...';
}

Exet.prototype.loadIframe = function(iframe, url, urlElt) {
  const trimmedUrl = this.trimUrl(url);
  urlElt.innerText = trimmedUrl;
  urlElt.insertAdjacentHTML(
      'beforeend',
      ' <span class="xet-iframe-loading">Loading...</span>');
  urlElt.href = url;
  iframe.src = url;
  iframe.onload = () => {
    urlElt.innerText = trimmedUrl;
  };
}

Exet.prototype.indsTabNav = function() {
  let url = this.indsSelect.value;
  if (!url) {
    return;
  }
  this.indsKeyword.value = this.indsKeyword.value.trim();
  if (this.indsKeyword.value && this.indsHighlight.value == 'none') {
    this.indsHighlight.value = 'ml=';
  }
  if (this.indsKeyword.value) {
    let datamuseParam = this.indsKeyword.value;
    if (this.indsHighlight.value) {
      datamuseParam = this.indsHighlight.value +
                      encodeURIComponent(this.indsKeyword.value);
    }
    url = 'https://xlufz.ratnakar.org/xlufz.php?srcurl=' +
          encodeURIComponent(url) + '&max=1000&' + datamuseParam;
  }
  if (this.indsIframe.src == url) {
    return;
  }
  this.loadIframe(this.indsIframe, url, this.indsUrl);
}

Exet.prototype.makeIndsTab = function() {
  const inds = [
    {name: "Please select:", url: ""},
    {name: "separator"},
  ].concat(exetConfig.listsLinks);
  const highlighters = [
    {name: "Optional: Using a keyword, choose a type of words to highlight:", key: "none"},
    {name: "Highlight words related to:", key: "ml="},
    {name: "Highlight words that often precede:", key: "rel_bgb="},
    {name: "Highlight words that often follow:", key: "rel_bga="},
    {name: "Highlight words using Datamuse words API parameters:", key: ""},
  ];
  const indsTab = this.tabs["inds"];
  let html = `
  <div>
  <select name="xet-inds-select" id="xet-inds-select"
    onchange="exet.indsTabNav()">`
  for (let ind of inds) {
    if (ind.name == "separator") {
      html += this.MENU_SEPARATOR;
      continue;
    }
    html += `
    <option value="${ind.url}">${ind.name}</option>`
  }
  html += '</select>';
  html += `
  &nbsp;<select name="xet-inds-highlight" class="xet-small"
       title="If a highlighting option is selected, it will use the word entered to the right as its keyword"
       id="xet-inds-highlight" onchange="exet.indsTabNav()">`;
  for (let hlt of highlighters) {
    const title = (hlt.key == 'none') ? '' : ' title="Datamuse words API ' + ((hlt.key == '') ?
                  '[param=value[&amp;p2=v2...]] directly specified in keyword' :
                  ('param ' + hlt.key + '[keyword]')) + '"';
    html += `
    <option value="${hlt.key}"${title}>${hlt.name}</option>`
  }
  html += `</select>
  <input type="text" class="xlv-answer" size="15"
    placeholder="no keyword"
    title="Enter a keyword and choose a highlighting category to the left"
    onchange="exet.indsTabNav()"
    id='xet-inds-keyword'></input>`;
  html += '</div>';

  html += `
  <a href="" target="_blank" id="xet-inds-choice-url"
      class="xet-blue xet-small"></a><br>
  <iframe id="xet-inds-iframe" class="xet-iframe xet-section" src="">
  </iframe>
  `;
  indsTab.content.innerHTML = html;
  this.indsIframe = document.getElementById('xet-inds-iframe');
  this.indsSelect = document.getElementById('xet-inds-select');
  this.indsSelect.value = this.savedIndsSelect;
  this.indsHighlight = document.getElementById('xet-inds-highlight');
  this.indsKeyword = document.getElementById('xet-inds-keyword');
  this.indsUrl = document.getElementById('xet-inds-choice-url');
}

Exet.prototype.researchNeedsClueWords = function() {
  const researchTab = this.tabs['research'];
  const rc = researchTab.currChoice;
  if (rc < 0 || rc >= researchTab.choices.length) {
    return false;
  }
  return researchTab.choices[rc].needsClueWords || false;
}

Exet.prototype.researchTabNav = function() {
  const researchTab = this.tabs['research'];
  const choiceIndex = this.researchSelect.value;
  if (choiceIndex < 0 ||
      choiceIndex >= researchTab.choices.length) {
    return;
  }
  const choice = researchTab.choices[choiceIndex];
  let words = choice.needsClueWords ?
              this.currClueWordsList() : researchTab.words;
  if (choice.noPunct) {
    words = exetLexicon.lcLetterString(words);
  }
  if (choiceIndex == researchTab.currChoice &&
      researchTab.savedWords == words) {
    return;
  }
  const url = choice.url + words + (choice.suffix || '');
  if (choice.newTab) {
    this.researchSelect.value = researchTab.currChoice;
    window.open(url, '_blank');
    return;
  }
  researchTab.currChoice = choiceIndex;
  researchTab.savedWords = words;
  this.loadIframe(this.researchIframe, url, this.researchUrl);
}

Exet.prototype.makeResearchTab = function() {
  const researchTab = this.tabs["research"];
  researchTab.choices = exetConfig.researchTools;
  researchTab.currChoice = -1;  /** set by researchTabNav() */
  researchTab.savedWords = null;
  let html = `
  <div>
  <select name="xet-research-select" id="xet-research-select" value="0"
    onchange="exet.researchTabNav()">`
  for (let rc = 0; rc < researchTab.choices.length; rc++) {
    const choice = researchTab.choices[rc];
    if (choice.name == "separator") {
      html = html + this.MENU_SEPARATOR
      continue;
    }
    html = html + `
    <option value="${rc}">${choice.name + (choice.newTab ? ' (opens in new tab)' : '')}</option>`
  }
  html = html + '</select></div><br>'
  html = html + `
  <a href="" target="_blank" id="xet-research-choice-url"
      class="xet-blue xet-small"></a><br>
  <iframe id="xet-research-iframe" class="xet-iframe xet-section" src="">
  </iframe>
  `;
  researchTab.content.innerHTML = html;
  this.researchIframe = document.getElementById('xet-research-iframe')
  this.researchSelect = document.getElementById('xet-research-select')
  this.researchUrl = document.getElementById('xet-research-choice-url')
}

Exet.prototype.makeWebFillsPanel = function() {
  const webFills = exetConfig.webFills;
  if (!webFills || webFills.length == 0) {
    return;
  }
  const names = [];
  let html = `
    <div>
      <b>Web grid-fill source:</b> <select id="xet-web-fills-menu"></select>
      <div class="xet-web-fills-caveat">
        Caveat: Some web sources are more likely to include weird
        fill choices that would generally be considered unacceptable.
      </div>
    </div>
    <br>
    <div id="xet-web-fills-content">
  `;
  for (const wf of webFills) {
    names.push(wf.name);
    html += `
      <div id="xet-web-fill-${wf.id}-frame" style="display:none">
        <a href="" target="_blank" id="xet-web-fill-${wf.id}-url"
          class="xet-blue xet-small"></a><br>
        <iframe class="xet-web-fills-iframe" id="xet-web-fill-${wf.id}-content">
        </iframe>
      </div>
    `;
  }
  html += '<div>';
  this.webFillsPanel.innerHTML = html;
  this.showWebFillsButton.title += ': ' + names.join(', ');

  this.webFillsMenu = document.getElementById('xet-web-fills-menu');
  this.webFillsChoice = 0;
  let index = 0;

  for (const wf of webFills) {
    wf.frame = document.getElementById(`xet-web-fill-${wf.id}-frame`)
    wf.content = document.getElementById(`xet-web-fill-${wf.id}-content`)
    wf.urldisp = document.getElementById(`xet-web-fill-${wf.id}-url`)
    if (typeof wf.maker == 'string') {
      wf.maker = this.getNamedMaker(wf.maker);
    }
    this.webFillsMenu.insertAdjacentHTML('beforeend', `
        <option value="${index}">${wf.name}</option>`);
    index++;
  }
  this.webFillsMenu.addEventListener(
      'change', this.webFillsMenuSelect.bind(this));
}

Exet.prototype.webFillsMenuSelect = function() {
  const webFills = exetConfig.webFills;
  const newChoice = this.webFillsMenu.value;
  if (newChoice != this.webFillsChoice) {
    const wf = webFills[this.webFillsChoice];
    wf.frame.style.display = 'none';
    this.webFillsChoice = newChoice;
  }
  const wf = webFills[this.webFillsChoice];
  wf.frame.style.display = '';
  let theClue = this.currClue();
  const words = theClue ? theClue.solution : '';
  const wordParam = wf.maker.call(this, words);
  if (!wf.param || wf.param != wordParam) {
    wf.param = wordParam;
    const url = wf.url + wordParam;
    this.loadIframe(wf.content, url, wf.urldisp);
  }
}

Exet.prototype.showWebFills = function() {
  const webFills = exetConfig.webFills;
  if (!webFills || webFills.length == 0) {
    return;
  }
  this.webFillsMenuSelect();
  exetModals.showModal(exet.webFillsPanel)
}

/**
 * Returns an array of all possible splits of the sequence of letters in
 * fodder into k parts. Each split is an array of length k, with each
 * element being a string.
 * @param {!Array<string>} fodder
 * @param {number> k
 * @return {!Array<!Array<string>>}
 */
Exet.prototype.getAllSplits = function(fodder, k) {
  let n = fodder.length;
  if (n < 1 || k < 1 || k > n ) {
    return [];
  }
  if (k == 1) {
    return [[fodder.join('')]];
  }
  if (k == n) {
    return [fodder];
  }
  const splits = []
  // For long fodders, skip some splits.
  for (let last_span = (n > 10 ? n - 9 : 1);
       last_span <= n - k + 1; last_span++) {
    const last_piece = fodder.slice(n - last_span).join('');
    const prefix = fodder.slice(0, n - last_span);
    const subsplits = this.getAllSplits(prefix, k - 1)
    for (let subsplit of subsplits) {
      subsplit.push(last_piece);
      splits.push(subsplit);
    }
  }
  return splits;
}

Exet.prototype.pushCharadeCandidate = function(elements) {
  if (!elements || elements.length == 0) {
    return
  }
  let charade = ''
  let score = 0;
  let i = 0;
  let numScores = elements.length;
  while (i < elements.length) {
    let x = elements[i];
    if (!x.possible) {
      return;
    }
    if (charade) charade = charade + '<span class="xet-blue"> + </span>';
    charade = charade + x.possible;
    score += x.score;
    i++;
    if (x.container) {
      contents = '';
      while (i < x.container) {
        let y = elements[i];
        if (!y.possible) {
          return;
        }
        if (contents) contents = contents + ' ';
        contents = contents + y.possible;
        score += y.score;
        i++;
      }
      charade = charade + ' <span class="xet-blue">around (</span>' +
                contents + '<span class="xet-blue">)</span>';
      i++;
      numScores = elements.length - 1;
    }
  }
  score = score / numScores
  if (charade) {
    this.charadeCandidates.push({
      charade: charade,
      score: score
    });
  }
}

Exet.prototype.updateCharades = function(fodder) {
  if (this.throttledCharadeTimer) {
    clearTimeout(this.throttledCharadeTimer);
  }
  this.throttledCharadeTimer = null;
  this.charadeCandidates = [];
  this.charadeParts = 2;  /* 1-part is already seen in Anagrams */
  this.charadeSplits = null;
  this.charadeSplitIndex = 0;
  this.charadeDeletionsAdded = false;
  this.charadeFodder = exetLexicon.lettersOf(fodder);
  this.charadeMax = Math.min(this.charadeFodder.length, 4);
  this.updateCharadesPartial();
}

Exet.prototype.addDeletionCharades = function() {
  const wordsMinuses = exetLexicon.getSupersetAnagrams(
      this.charadeFodder, 1000, 6, 2);
  const words = [];
  const minuses = [];
  const scores = [];
  for (const wm of wordsMinuses) {
    const word = exetLexicon.lexicon[wm[0]];
    words.push(word);
    const dispDiffAnags = exetLexicon.displayAnagrams(wm[1], wm[2]);
    let diffAnagsStr = dispDiffAnags.join(', ');
    if (dispDiffAnags.length > 1) {
      diffAnagsStr = '<span class="xet-blue">[</span>' + diffAnagsStr +
                     '<span class="xet-blue">]</span>';
    }
    minuses.push(diffAnagsStr);
    /**
     * High score to put all deletions on top of other charades, for
     * convenience. Shorter deletions are shown first.
     */
    scores.push(100 - wm[1].length);
  }
  for (let i = 0; i < words.length; i++) {
    const charadeStruct = {
      charade: '<span class="xet-blue">*</span>(' + words[i] +
               ' <span class="xet-blue">minus</span> ' +
               minuses[i] + ')',
      score: scores[i],
    }
    this.charadeCandidates.push(charadeStruct);
  }
  this.charadeDeletionsAdded = true;
}

Exet.prototype.updateCharadesPartial = function(work=100, sleep=50) {
  const startTS = Date.now()
  if (!this.charadeDeletionsAdded) {
    this.addDeletionCharades();
  }
  while (this.charadeParts <= this.charadeMax) {
    if (!this.charadeSplits) {
      this.charadeSplits = this.getAllSplits(
          this.charadeFodder, this.charadeParts)
      this.charadeSplitIndex = 0
    }
    while (this.charadeSplitIndex < this.charadeSplits.length) {
      let split = this.charadeSplits[this.charadeSplitIndex];
      let viable = [];
      for (let part of split) {
        let possible = '';
        let score = 0;
        const choices = exetLexicon.displayAnagrams(
            part, exetLexicon.getAnagrams(part, 6, false));
        if (choices.length > 0) {
          possible = choices.join(', ');
          const partLetters = exetLexicon.lettersOf(part);
          score = partLetters.length;
          if (choices.length > 1) {
            possible = '<span class="xet-blue">[</span>' + possible +
                       '<span class="xet-blue">]</span>';
          }
        }
        viable.push({possible: possible, score: score});
      }
      if (viable.length < this.charadeParts) {
        continue;
      }
      this.pushCharadeCandidate(viable);
      /**
       * The Containments tab already shows full containments.
       * Here, we show containments that begin after the beginning or
       * end before the ending.
       */
      for (let c1 = 0; c1 < this.charadeParts - 2; c1++) {
        for (let c2 = c1 + 2; c2 < this.charadeParts; c2++) {
          if (c1 == 0 && c2 == (this.charadeParts - 1)) {
            continue;
          }
          // Everything else must be viable
          let ok = true;
          for (let i = 0; i < this.charadeParts; i++) {
            if (i != c1 && i != c2 && !viable[i].possible) {
              ok = false;
              break;
            }
          }
          if (!ok) {
            continue;
          }
          const container = split[c1] + (split[c2]);
          const choices = exetLexicon.displayAnagrams(
              container, exetLexicon.getAnagrams(container, 5, true));
          if (choices.length > 0) {
            let possible = choices.join(', ');
            const containerParts = exetLexicon.lettersOf(container);
            if (choices.length > 1) {
              possible = '<span class="xet-blue">[</span>' + possible +
                         '<span class="xet-blue">]</span>';
            }
            let vcopy = viable.slice();
            vcopy[c1] = {};
            vcopy[c1].possible = possible;
            vcopy[c1].score = containerParts.length;
            vcopy[c1].container = c2;
            this.pushCharadeCandidate(vcopy);
          }
        }
      }
      this.charadeSplitIndex++;
      if (Date.now() - startTS >= work) {
        break;
      }
    }
    if (this.charadeSplitIndex == this.charadeSplits.length) {
      this.charadeSplits = null;
      this.charadeParts++;
    }
    if (Date.now() - startTS >= work) {
      break;
    }
  }
  let candidates = this.charadeCandidates.sort((a, b) => b.score - a.score);
  let html = '<table class="xet-wordplay-choices xet-gray-bordered-rows">'
  for (let candidate of candidates) {
    html = html + `
      <tr>
        <td>${candidate.charade}</td>
      </tr>`;
  }
  html = html + '</table>';
  this.charades.innerHTML = html;
  if (this.charadeParts <= this.charadeMax) {
    this.throttledCharadeTimer = setTimeout(() => {
      this.updateCharadesPartial(work, sleep);
    }, sleep);
  }
}

/**
 * Find the longest common substring between strings a and b. Use dp as the
 * preallocated buffer for the dynamic program.
 * Return [index_in_a, index_in_b, length]
 */
Exet.prototype.lcs = function(a, b, dp) {
  // dp is already an (n+1)x(m+1) array.
  // dp[i][j] = length of longest common subseq. of a[0..i-1], j[0..j-1].
  const n = a.length;
  const m = b.length;
  if (n == 0 || m == 0) return [0, 0, 0];
  let besti = 0, bestj = 0, best = 0;
  for (let i = 0; i <= n; i++) dp[i][0] = 0;
  for (let j = 0; j <= m; j++) dp[0][j] = 0;
  for (let i = 1; i <= n; i++) {
    const achar = a[i - 1];
    for (let j = 1; j <= m; j++) {
      const bchar = b[j - 1];
      if (achar != bchar) {
        dp[i][j] = 0;
        continue;
      }
      dp[i][j] = 1 + dp[i-1][j-1];
      if (dp[i][j] > best) {
        best = dp[i][j];
        besti = i;
        bestj = j;
      }
    }
  }
  return [besti - best, bestj - best, best];
}

/**
 * Add del/ins/sub candidates for wordplay for "fodder" to candidates. For
 * each potential candidate phrase, we find the LCS (longest common substring)
 * and then find the LCS between the prefix parts and the suffix parts.
 */
Exet.prototype.editsMatch = function(fodder, phrase, dp,
                                     match_thresh, delta_thresh, candidates) {
  const phrase_norm = this.makeCharadeParam(phrase);
  const match = this.lcs(fodder, phrase_norm, dp);
  if (match[2] < match_thresh) {
    return;
  }
  const prefix_f = fodder.substr(0, match[0]);
  const prefix_p = phrase_norm.substr(0, match[1]);
  const prefix_match = this.lcs(prefix_f, prefix_p, dp);
  const suffix_f = fodder.substr(match[0] + match[2]);
  const suffix_p = phrase_norm.substr(match[1] + match[2]);
  const suffix_match = this.lcs(suffix_f, suffix_p, dp);

  const n = fodder.length;
  const m = phrase_norm.length;
  const delta = n + m - 2 * (match[2] + prefix_match[2] + suffix_match[2]);
  if (delta > delta_thresh) {
    return;
  }

  const corresp = [];
  let j = -1;
  const phrase_lc = phrase.toLowerCase();
  for (let i = 0; i < m; i++) {
    j++;
    while (phrase_norm[i] != phrase_lc[j]) {
      j++;
    }
    corresp.push(j);
  }
  corresp.push(j + 1);

  // fodder and phrase_norm have both been segmented into seven parts:
  // UMUMUMU (unmatched/matched).
  const p1 = phrase.substring(corresp[0], corresp[prefix_match[1]]);
  const p1_l = prefix_match[1];
  const p2 = phrase.substring(
      corresp[prefix_match[1]], corresp[prefix_match[1] + prefix_match[2]]);
  const p3 = phrase.substring(corresp[prefix_match[1] + prefix_match[2]],
                              corresp[match[1]]);
  const p3_l = match[1] - (prefix_match[1] + prefix_match[2]);
  const offset = match[1] + match[2];
  const p4 = phrase.substring(corresp[match[1]], corresp[offset])
  const p5 = phrase.substring(corresp[offset],
                              corresp[offset + suffix_match[1]]);
  const p5_l = suffix_match[1];
  const p6 = phrase.substring(
      corresp[offset + suffix_match[1]],
      corresp[offset + suffix_match[1] + suffix_match[2]]);
  const p7 = phrase.substring(
      corresp[offset + suffix_match[1] + suffix_match[2]], corresp[m]);
  const p7_l = m - (offset + suffix_match[1] + suffix_match[2]);

  const f1 = prefix_f.substr(0, prefix_match[0]);
  const f3 = prefix_f.substr(prefix_match[0] + prefix_match[2]);
  const f5 = suffix_f.substr(0, suffix_match[0]);
  const f7 = suffix_f.substr(suffix_match[0] + suffix_match[2]);

  // We sort candidates in order of increasing diff. A substitution counts
  // for a diff of the max of the length of the  plus and minus terms.
  const diff = Math.max(p1_l, f1.length) +
               Math.max(p3_l, f3.length) +
               Math.max(p5_l, f5.length) +
               Math.max(p7_l, f7.length);

  candidate = phrase + ' &rarr; ';
  if (p1) candidate += `<span class="xet-red">${p1}</span>`;
  if (f1) candidate += `<span class="xet-blue">(+${f1})</span>`;
  if (p2) candidate += p2;
  if (p3) candidate += `<span class="xet-red">${p3}</span>`;
  if (f3) candidate += `<span class="xet-blue">(+${f3})</span>`;
  if (p4) candidate += p4;
  if (p5) candidate += `<span class="xet-red">${p5}</span>`;
  if (f5) candidate += `<span class="xet-blue">(+${f5})</span>`;
  if (p6) candidate += p6;
  if (p7) candidate += `<span class="xet-red">${p7}</span>`;
  if (f7) candidate += `<span class="xet-blue">(+${f7})</span>`;

  candidates.push([candidate, diff]);
}

Exet.prototype.updateEdits = function(fodder) {
  const n = fodder.length;
  const maxl = Math.min(n + 5, n * 2);
  const dp = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    dp[i] = new Array(maxl + 1);
  }
  const candidates = [];

  const match_thresh = Math.max(3, Math.floor(n / 2));
  for (let len = n; len <= maxl; len++) {
    const delta_thresh = Math.floor(len / 2);
    const key = '?'.repeat(len);
    if (!exetLexicon.index[key]) break;
    const indices = exetLexicon.index[key];
    for (let idx of indices) {
      const phrase = exetLexicon.getLex(idx);
      this.editsMatch(fodder, phrase, dp,
                      match_thresh, delta_thresh, candidates);
    }
  }
  candidates.sort((a, b) => a[1] - b[1]);

  let html = '<table class="xet-wordplay-choices">';
  for (let candidate of candidates) {
    html = html + `
      <tr><td>${candidate[0]}</td></tr>`
  }
  html = html + '</table>'
  this.edits.innerHTML = html;
}

Exet.prototype.updateSounds = function(fodder) {
  let html = '<table id="xet-sounds-choices">';
  const phones = exetLexicon.getPhones(fodder);
  const homophones = exetLexicon.getHomophonesInner(fodder, phones); 
  const hpSet = {};
  for (let hp of homophones) {
    hpSet[this.makeCharadeParam(hp)] = true;
    html = html + `
      <tr title="Homophone of ${hp}"><td>&#x1F56A;
        <span class="xet-blue">~</span> ${hp}</td></tr>`
  }
  const spoonerisms = exetLexicon.getSpoonerismsInner(fodder, phones);
  hpSet[this.makeCharadeParam(fodder)] = true;
  for (let sp of spoonerisms) {
    if (hpSet[this.makeCharadeParam(sp[0] + sp[1])]) {
      // Not really a Spoonerism.
      continue;
    }
    html = html + `
      <tr title="Spoonerism of ${sp[0]} + ${sp[1]}">
        <td>&#x1F50A; ${sp[0]} <span class="xet-blue">&lrhar;</span>
            ${sp[1]}</td></tr>`
  }
  html = html + '</table>'
  this.sounds.innerHTML = html;
}

Exet.prototype.updateCA = function() {
  const fodderLetters = exetLexicon.lettersOf(this.caFodder.value);
  const fodderHist = exetLexicon.letterHist(fodderLetters);
  const anagramLetters = exetLexicon.lettersOf(this.caAnagram.value);
  const anagramHist = exetLexicon.letterHist(anagramLetters);

  const faHist = exetLexicon.letterHistSub(fodderHist, anagramHist, false);
  const afHist = exetLexicon.letterHistSub(anagramHist, fodderHist, false);

  const unused = exetLexicon.lettersXHist(fodderLetters, faHist);
  const unusedS = unused.join('');
  const extra = exetLexicon.lettersXHist(anagramLetters, afHist);
  const extraS = extra.join('');
  this.caUnused.innerText = unusedS;
  this.caExtra.innerText = extraS;

  let html = '<table>\n';
  let maxAnags = extra.length < 8 ? 400 : (extra.length < 10 ? 200 : 100);
  const extraAnags = exetLexicon.displayAnagrams(
      extraS, exetLexicon.getAnagrams(extraS, maxAnags));
  for (const choice of extraAnags) {
    html += `
      <tr><td>${choice}</td></tr>`;
  }
  html += '\n</table>';
  this.caExtraAnags.innerHTML = html;

  html = '<table>\n';
  maxAnags = unused.length < 8 ? 400 : (unused.length < 10 ? 200 : 100);
  const unusedAnags = exetLexicon.displayAnagrams(
      unusedS, exetLexicon.getAnagrams(unusedS, maxAnags));
  for (const choice of unusedAnags) {
    html += `
      <tr><td>${choice}</td></tr>`;
  }
  html += '\n</table>';
  this.caUnusedAnags.innerHTML = html;
}

Exet.prototype.updateContainments = function(fodder) {
  const fodderLetters = exetLexicon.lettersOf(fodder);
  const splits = this.getAllSplits(fodderLetters, 3);
  /* Sort the splits to bring more even balance up top */
  splits.sort((a, b) =>
      Math.abs(a[0].length + a[2].length - a[1].length) -
      Math.abs(b[0].length + b[2].length - b[1].length));

  const results = [];
  let html = `
    <table class="xet-wordplay-choices xet-table-midline">
  `;
  let num = 0;
  for (const split of splits) {
    const outer = split[0] + split[2];
    const outerAnagrams = exetLexicon.displayAnagrams(
        outer, exetLexicon.getAnagrams(outer, 10 + outer.length, true));
    if (outerAnagrams.length == 0) continue;
    const inner = split[1];
    const innerAnagrams = exetLexicon.displayAnagrams(
        inner, exetLexicon.getAnagrams(inner, 10 + inner.length, true));
    if (innerAnagrams.length == 0) continue;

    if (num > 0) {
      html += '\n<tr><td colspan="3"><hr></td></tr>';
    }
    num++;
    const min = Math.min(outerAnagrams.length, innerAnagrams.length);
    const max = Math.max(outerAnagrams.length, innerAnagrams.length);
    for (let i = 0; i < min; i++) {
      html += `
        <tr><td>${outerAnagrams[i]}</td>
        <td>${(i == 0) ? '<span class="xet-blue">around</span>' : ''}</td>
        <td>${innerAnagrams[i]}</td></tr>`;
    }
    for (let i = min; i < outerAnagrams.length; i++) {
      html += `
        <tr><td>${outerAnagrams[i]}</td><td></td><td></td></tr>`;
    }
    for (let i = min; i < innerAnagrams.length; i++) {
      html += `
        <tr><td></td><td></td><td>${innerAnagrams[i]}</td></tr>`;
    }
  }
  html += '</table>';
  this.containments.innerHTML = html;
}

Exet.prototype.populateCompanag = function() {
  const ca = document.getElementById('xet-companag-box');
  ca.innerHTML = `
  <div>
    <table class="xet-table-midline">
      <tr>
        <td><div style="min-width:100px"></div></td>
        <td class="xet-td xet-cah">Draft anagram:
          <br>
          <input type="text"
            title="Enter a phrase that's only roughly an anagram of ` +
            `some of the letters in the fodder"
          class="xlv-answer xet-companag-text" id='xet-ca-anagram'></input>
        </td>
      </tr>
        <td class="xet-td"><u><span id="xet-ca-unused"></span></u></td>
        <td class="xet-td"><u><span id="xet-ca-extra"></span></u></td>
      <tr>
      </tr>
      <tr>
        <td class="xet-td">
          <div id="xet-ca-unused-anags"></div>
        </td>
        <td class="xet-td" >
          <div>
            <div id="xet-ca-extra-anags">
            </div>
            <div class="xet-anag-help">
              <details>
                <summary>Help</summary>
                <ul>
                <li>When the "Draft anagram" field is left blank, you can
                see anagrams of the fodder in the first column.
                </li>
                <li>
                If you enter something in the "Draft anagram" field, then
                anagrams of fodder <i>excluding</i> the letters in
                "Draft anagram" are shown in the first column.
                </li>
                <li>
                Anagrams of any extra letters in "Draft anagram" (that are
                not there in the fodder) are shown in this second column.
                </li>
                </ul>
              </details>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>`;
  this.caFodder = document.getElementById('xet-companag-param');
  this.caAnagram = document.getElementById('xet-ca-anagram');
  this.caAnagram.addEventListener('input', this.updateCA.bind(this));
  this.caUnused = document.getElementById('xet-ca-unused');
  this.caUnusedAnags = document.getElementById('xet-ca-unused-anags');
  this.caExtraAnags = document.getElementById('xet-ca-extra-anags');
  this.caExtra = document.getElementById('xet-ca-extra');
}

Exet.prototype.populateFrame = function() {
  let frameHTML = '';
  frameHTML = frameHTML + '<div class="xet-tab">';
  for (let id in this.tabs) {
    let tab = this.tabs[id];
    frameHTML = frameHTML +
        `<button id="xet-${id}">${tab.display}</button>`;
  }
  frameHTML = frameHTML + '</div>';

  for (let id in this.tabs) {
    let tab = this.tabs[id];
    frameHTML = frameHTML + `<div class="xet-tab-content" id="xet-${id}-frame">`
    if (tab.sections.length > 0) {
      console.assert(tab.sections.length <= 2);
      const sectionClass = tab.sections.length > 1 ? 'xet-half-section' : 'xet-section';
      frameHTML += `<div id="xet-${id}-sections"><table class="xet-sections"><tr>`;
      for (let i = 0; i < tab.sections.length; i++) {
        let section = tab.sections[i];
        frameHTML = frameHTML + '<td class="xet-td">';
        const titleHover = section.hover ? `title="${section.hover} "` : '';
        if (section.url) {
          frameHTML = frameHTML + `
            <div ${titleHover}class="xet-bold">${section.title || ''}</div>
            <a href="" target="_blank" id="xet-${id}-url-${i}"
                class="xet-blue xet-small"></a><br>
            <iframe class="xet-iframe ${sectionClass}" id="xet-${id}-content-${i}">
            </iframe>`;
        } else {
          const paramHtml = `
            <br>
            <input id="${section.id}-param" class="xlv-answer"
              size="32" type="text"
              title="Press <Esc> to reset from grid"
              placeholder="Press <Esc> to reset from grid">
            </input>
            `;
          frameHTML = frameHTML + `
            <div ${titleHover}class="xet-bold">${section.title || ''}</div>
            ${paramHtml}
            <div id="${section.id}">
              <div id="${section.id}-box"
                class="xet-in-tab-scrollable ${sectionClass}">
              </div>
            </div>`
        }
        frameHTML = frameHTML + '</td>';
      }
      frameHTML = frameHTML + `
        </tr>
        </table>
        </div>`;
    } else {
      frameHTML = frameHTML + `
        <div id="xet-${id}-content"></div>`
    }
    frameHTML = frameHTML + '</div>'
  }
  this.frame.innerHTML = frameHTML

  this.charades = document.getElementById('xet-charades-box')
  this.edits = document.getElementById('xet-edits-box');
  this.sounds = document.getElementById('xet-sounds-box')
  this.containments = document.getElementById('xet-containments-box')

  this.populateCompanag()

  for (let id in this.tabs) {
    let tab = this.tabs[id]
    tab.button = document.getElementById(`xet-${id}`)
    tab.button.title = tab.hover
    const handler = this.handleTabClick.bind(this, id);
    tab.button.addEventListener('click', handler);
    tab.frame = document.getElementById(`xet-${id}-frame`)
    if (tab.sections.length > 0) {
      for (let i = 0; i < tab.sections.length; i++) {
        let section = tab.sections[i]
        if (!section.url) {
          section.paramInput = document.getElementById(`${section.id}-param`)
          if (section.paramInput) {
            section.paramInput.addEventListener('input', handler);
            section.paramInput.addEventListener('keyup', e => {
              if (e.key == "Escape") {
                exet.restoreParam(id, section);
              }
            });
          }
          section.content = document.getElementById(`${section.id}-box`)
          continue;
        }
        section.content = document.getElementById(`xet-${id}-content-${i}`)
        section.urldisp = document.getElementById(`xet-${id}-url-${i}`)
      }
    } else {
      tab.content = document.getElementById(`xet-${id}-content`)
    }
  }

  this.makeExetTab();
  this.makeIndsTab();
  this.makeResearchTab();
  this.makeWebFillsPanel();
}

Exet.prototype.fileTitle = function() {
  const fname = this.puz.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return fname || 'crossword';
}

Exet.prototype.updateSavePanel = function() {
  const filetitle = this.fileTitle();
  const tlist = document.getElementsByClassName('xet-filetitle');
  for (let i = 0; i < tlist.length; i++) {
    tlist[i].innerText = filetitle;
  }
  const w = document.getElementById('xet-save-warnings');
  let warnings = '';
  const info = this.getLightInfos()['All'];
  const numUnfilled = info.lights - info.ischild - info.filled;
  if (numUnfilled == 1) {
    warnings += 'There is 1 unfilled entry!<br>';
  } else if (numUnfilled > 1) {
    warnings += 'There are ' + numUnfilled +
                ' unfilled entries!<br>';
  }
  const numDraft = info.lights - info.ischild - info.set;
  if (numDraft == 1) {
    warnings += `There is 1 clue marked ${this.DRAFT}!<br>`;
  } else if (numDraft > 1) {
    warnings += `There are ${numDraft} clues ` +
                `marked ${this.DRAFT}!<br>`;
  }
  w.innerHTML = warnings;
  w.style.display = warnings ? '' : 'none';
}

/**
 * Use this to surface a relevant tip when the user takes some action for
 * which the tip may have been useful advice.
 */
Exet.prototype.showTip = function(tipIdx) {
  tipIdx = tipIdx % this.tipsList.length;
  const ts = Date.now();
  if (ts < this.lastTipShownTime + 300000 && tipIdx == this.tipIdx) {
    /* less than 5 minutes have passed since this same tip was shown */
    return;
  }
  this.lastTipShownTime = ts;
  this.tipIdx = tipIdx;
  this.tip.innerHTML = this.tipsList[this.tipIdx];
  exetModals.showModal(this.tips);
}

Exet.prototype.setRandomTip = function() {
  let idx = Math.floor(Math.random() * this.tipsList.length);
  if (idx == this.tipIdx) {
    idx = (idx + 1) % this.tipsList.length;
  }
  this.tipIdx = idx;
  this.tip.innerHTML = this.tipsList[idx];
}

Exet.prototype.navTip = function(delta) {
  this.tipIdx = (this.tipIdx + delta +
                 this.tipsList.length) % this.tipsList.length;
  this.tip.innerHTML = this.tipsList[this.tipIdx];
}            

Exet.prototype.download = function(solved=true) {
  const html = this.getHTML(solved);

  const fileName = "exet-exolve-" + this.fileTitle() +
                   (solved ? ".html" : "-sans-solutions.html");
  Exolve.prototype.fileDownload(html, "text/html", fileName);
  exetModals.hide()
}

/**
 * actionScript should be single-line JS terminated with semicolon.
 * It should use single quotes for strings. It can use the variable
 * "pxlv" to access the Exolve puzzle.
 */
Exet.prototype.printWindower = function(actionScript, solved) {
  const tempId = `tmp-xlv-${Math.random().toString(36).substring(2, 8)}`;
  const revealer = (solved ?
      'pxlv.revealAll(false);' : 'pxlv.clearAll(false);') +
      'pxlv.deactivator();';
  const html = '' +
        '<!DOCTYPE html>\n' +
        '<html lang="en">\n' +
        '<head>\n' +
        '<meta charset="utf-8"/>\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=1"/>\n' +
        '<link rel="stylesheet" type="text/css" href="exolve-m.css"/>\n' +
        '<script src="exolve-m.js"><\/script>\n' +
        '<\/head>\n' +
        '<body ' +
        'onload="' +
        revealer +
        actionScript +
        'pxlv.destroy(true);window.close();">\n' +
        '<script>\n' +
        'const pxlv = createExolve(`' +  '\n' +
        this.getExolve(tempId, false, solved) +
        '`);\n' +
        '<\/script>\n' +
        '<\/body>\n' +
        '<\/html>\n'
  const pwin = window.open('', '', 'left=0,top=0,width=1000,height=1500');
  pwin.document.write(html);
  pwin.document.close();
  pwin.focus();
}

Exet.prototype.saveGridSvg = function(solved=true) {
  const fileName = "exet-" + this.fileTitle() +
                   (solved ? "-solution-grid.svg" : "-blank-grid.svg");
  const actionScript = `pxlv.saveGridSvgFile('${fileName}');`;
  this.printWindower(actionScript, solved);
  exetModals.hide()
}

Exet.prototype.print = function(solved=true) {
  /**
   * Using 'window.print();' directly does not work because of some bug
   * in Windows (Chrome/Edge).
   */
  const actionScript = 'document.execCommand(\'print\');';
  this.printWindower(actionScript, solved);
  exetModals.hide()
}

Exet.prototype.toClipboard = function(solved=true, inpid) {
  const inp = document.getElementById(inpid);
  const id = `exolve-div-${Math.random().toString(36).substring(2, 8)}`;
  let prefix = '' +
      '<link rel="stylesheet" type="text/css" href="' + exetState.exolveUrl +
          'exolve-m.css"/>\n' +
      '<script src="' + exetState.exolveUrl + 'exolve-m.js">\n' +
      '<\/script>\n\n' +
      '<div id="' + id + '">\n' +
      '<\/div>\n\n' +
      '<script>\n' +
      'createExolve(`\n';
  let suffix = '' +
      '  `, "' + id + '");\n' +
      '<\/script>\n'
  inp.value = prefix + this.getExolve('', false, solved) +
              suffix;

  inp.select();
  inp.setSelectionRange(0, 99999);
  document.execCommand("copy");
  setTimeout(() => {
    inp.value = ''
    exetModals.hide()
    alert('Exolve widget code has been copied to clipboard')
  }, 1000);
}

Exet.prototype.downloadDotPuz = function() {
  const dotPuz = exolveToPuz(this.puz);
  if (!dotPuz) {
    exetModals.hide();
    return;
  }
  const fileName = "exet-" + this.fileTitle() + ".puz";
  this.puz.fileDownload(dotPuz, "application/x-crossword", fileName);
  exetModals.hide()
}

Exet.prototype.downloadIPuz = function() {
  const ipuz = exolveToIpuz(this.puz);
  if (!ipuz) {
    exetModals.hide();
    return;
  }
  const fileName = "exet-" + this.fileTitle() + ".ipuz";
  this.puz.fileDownload(ipuz, "application/x-crossword", fileName);
  exetModals.hide()
}

/**
 * Return a SQL-usable list of words and ngrams in the curr clue.
 */
Exet.prototype.currClueWordsList = function() {
  const theClue = this.currClue();
  let clue = theClue ? theClue.clue : '';
  if (clue.startsWith(this.DRAFT)) {
    clue = clue.substr(this.DRAFT.length).trim();
  }
  if (clue.startsWith(this.CLUE_NOT_SET)) {
    clue = clue.substr(this.CLUE_NOT_SET.length).trim();
  }
  clue = clue.toLowerCase().replace(/[^a-z'-]/g, ' ').replace(
      /\s+/g, ' ').trim();
  const words = clue.split(' ');
  const wordsSet = {};
  for (let w of words) {
    if (['a', 'an', 'the'].includes(w)) continue;
    wordsSet[w] = true;
  }
  // ngrams: only bigrams for now
  for (let n of [2]) {
    for (let i = 0; i + n <= words.length; i++) {
      let ngram = '';
      for (let j = 0; j < n; j++) {
        if (ngram) ngram += ' ';
        ngram += words[i + j];
      }
      wordsSet[ngram] = true;
    }
  }
  let ret = '';
  for (let w in wordsSet) {
    if (ret) ret += ',';
    ret += '"' + w + '"';
  }
  return '[' + ret + ']';
}

Exet.prototype.makeWordParam = function(s) {
  return s.toLowerCase();
}

Exet.prototype.makeSoundsParam = function(s) {
  return s.toLowerCase().replace(/\?/g, '');
}

Exet.prototype.makeCharadeParam = function(s) {
  return exetLexicon.lcLetterString(s);
}

Exet.prototype.makeCAParam = function(s) {
  return s.toLowerCase().replace(/\?/g, '');
}

/** Nutrimatic-specific maker */
Exet.prototype.nutrAlternationParam = function(s) {
  const sL = exetLexicon.lcLettersOf(s);
  let out = 'A%3F';
  for (let c of sL) {
    out = out + c + 'A';
  }
  return out + '%3F';
}

/** Nutrimatic-specific maker */
Exet.prototype.nutrRevAlternationParam = function(s) {
  const sL = exetLexicon.lcLettersOf(s);
  sL.reverse();
  let out = 'A%3F';
  for (let c of sL) {
    out = out + c + 'A';
  }
  return out + '%3F';
}

/** Nutrimatic-specific maker */
Exet.prototype.nutrHiddenParam = function(s) {
  const sL = exetLexicon.lcLettersOf(s);
  if (sL.length < 2) return s;
  const last = sL.length - 1;
  return 'A*"A' + sL[0] + '"' + sL.slice(1, last).join('') +
         '"' + sL[last] + 'A"A*';
}

/** Nutrimatic-specific maker */
Exet.prototype.nutrRevHiddenParam = function(s) {
  const sL = exetLexicon.lcLettersOf(s);
  if (sL.length < 2) return s;
  sL.reverse();
  const last = sL.length - 1;
  return 'A*"A' + sL[0] + '"' + sL.slice(1, last).join('') +
         '"' + sL[last] + 'A"A*';
}

/** Nutrimatic-specific maker for finding grid-fills */
Exet.prototype.nutrFillParam = function(s) {
  return s.toLowerCase().replace(/\?/g, 'A');
}

/** Qat-specific maker for finding grid-fills */
Exet.prototype.qatFillParam = function(s) {
  return s.toLowerCase().replace(/\?/g, '.');
}

/** Onelook-specific maker for finding grid-fills */
Exet.prototype.onelookFillParam = function(s) {
  return s.toLowerCase();
}

Exet.prototype.getNamedMaker = function(name) {
  if (!name) {
    return this.makeCAParam;
  } else if (name == 'Nutrimatic-Hidden') {
    return this.nutrHiddenParam;
  } else if (name == 'Nutrimatic-RevHidden') {
    return this.nutrRevHiddenParam;
  } else if (name == 'Nutrimatic-Alternation') {
    return this.nutrAlternationParam;
  } else if (name == 'Nutrimatic-RevAlternation') {
    return this.nutrRevAlternationParam;
  } else if (name == 'Nutrimatic-Fill') {
    return this.nutrFillParam;
  } else if (name == 'Qat-Fill') {
    return this.qatFillParam;
  } else if (name == 'Onelook-Fill') {
    return this.onelookFillParam;
  } else {
    console.log('Unknown parameter function maker name: ' + name);
    return this.makeCAParam;
  }
}

Exet.prototype.currClueIndex = function() {
  return this.puz.clueOrParentIndex(this.puz.currClueIndex);
}
Exet.prototype.currClue = function() {
  const ci = this.currClueIndex();
  if (!ci) return null;
  return this.puz.clues[ci];
}
Exet.prototype.currLight = function() {
  /* Do not follow to the parent */
  const ci = this.puz.currClueIndex;
  if (!ci) return null;
  return this.puz.clues[ci];
}

Exet.prototype.draftClue = function(ci) {
  const clue = this.puz.clues[ci]
  if (!clue) {
    return '';
  }
  if (clue.parentClueIndex) {
    const parent = this.puz.clues[clue.parentClueIndex];
    return 'See ' + this.puz.clueLabelDisp(parent);
  }
  let ret = this.DRAFT + ' ' + this.CLUE_NOT_SET;
  let cells = this.puz.getAllCells(ci);
  if (cells.length > 0 && this.requireEnums) {
    ret += ' (' + cells.length + ')';
  }
  return ret;
}

Exet.prototype.handleTabClick = function(id) {
  let tab = this.tabs[id]
  if (!tab) {
    return
  }
  this.currTab = id
  for (let x in this.tabs) {
    let xtab = this.tabs[x]
    xtab.frame.style.display = "none"
    xtab.button.className = xtab.button.className.replace(" active", "");
  }

  tab.frame.style.display = "block";
  tab.button.className += " active";

  if (id == "exet") {
    return;
  }
  if (id == "inds") {
    this.indsTabNav();
    return;
  }

  let theClue = this.currClue();
  let words = theClue ? theClue.solution : '';
  if (id == "research") {
    tab.words = this.makeWordParam(words);
    this.researchTabNav();
    return;
  }
  for (let i = 0; i < tab.sections.length; i++) {
    let section = tab.sections[i]
    let wordParam = section.maker ? section.maker.call(this, words) :
                    this.makeWordParam(words)
    if (section.url) {
      if (!section.param || section.param != wordParam) {
        section.param = wordParam;
        const url = section.url + wordParam;
        this.loadIframe(section.content, url, section.urldisp);
      }
      continue;
    }
    let newLight = true;
    if (section.param == wordParam) {
      newLight = false;
      if (section.paramInput && section.paramInput.value != wordParam) {
        wordParam = section.paramInput.value;
      } else {
        continue;
      }
    } else {
      section.param = wordParam;
      if (section.paramInput) {
        section.paramInput.value = wordParam;
      }
    }

    if (section.id == 'xet-charades') {
      this.updateCharades(wordParam);
    } else if (section.id == 'xet-edits') {
      this.updateEdits(wordParam);
    } else if (section.id == 'xet-sounds') {
      this.updateSounds(wordParam);
    } else if (section.id == 'xet-containments') {
      this.updateContainments(wordParam);
    } else if (section.id == 'xet-companag') {
      if (newLight) {
        this.caAnagram.value = '';
      }
      this.updateCA();
    }
  }
}

Exet.prototype.restoreParam = function(id, section) {
  section.paramInput.value = section.param;
  section.param = section.param + '_';  // forced to be different.
  this.handleTabClick(id);
}

Exet.prototype.navDarkness = function(row, col, ev=null) {
  const darkness = this.puz.grid[row][col].darkness;
  if (!darkness) {
    return;
  }
  if (ev) ev.stopPropagation();
  this.puz.deactivateCurrCell();
  this.puz.currRow = row;
  this.puz.currCol = col;

  darkness.style.fill = this.puz.colorScheme['caret'];

  let cellLeft = this.puz.cellLeftPos(col, this.puz.GRIDLINE);
  let cellTop = this.puz.cellTopPos(row, this.puz.GRIDLINE);
  this.puz.gridInputWrapper.style.left = '' + cellLeft + 'px';
  this.puz.gridInputWrapper.style.top = '' + cellTop + 'px';
  this.puz.gridInput.value = '';
  this.puz.gridInputRarr.style.display = 'none';
  this.puz.gridInputDarr.style.display = 'none';
  this.puz.gridInputLarr.style.display = 'none';
  this.puz.gridInputUarr.style.display = 'none';
  if (this.puz.layers3d > 1) {
    const li = row % this.puz.h3dLayer;
    const offset = (this.puz.h3dLayer - li) * this.puz.offset3d;
    this.puz.gridInputWrapper.style.transformOrigin = 'top left';
    const transform = `skewX(${this.puz.angle3d - 90}deg) ` +
                      `translate(${offset}px)`;
    this.puz.gridInputWrapper.style.transform = transform;
  }

  this.puz.gridInputWrapper.style.display = '';
  this.puz.gridInput.focus();
}

Exet.prototype.arrowNav = function(key) {
  let row = this.puz.currRow
  let col = this.puz.currCol
  let useSaved = false
  if (key == 39) {
    // right arrow
    col = col + 1
    if (col >= this.puz.gridWidth) {
      useSaved = true
    }
  } else if (key == 37) {
    // left arrow
    col = col - 1
    if (col < 0) {
      useSaved = true
    }
  } else if (key == 40) {
    // down arrow
    row = row + 1
    if (row >= this.puz.gridHeight) {
      useSaved = true
    }
  } else if (key == 38) {
    // up arrow
    row = row - 1
    if (row < 0) {
      useSaved = true
    }
  }
  if (useSaved || this.puz.grid[row][col].isLight) {
    return this.hkuiSaved.apply(exet.puz, arguments);
  }
  this.navDarkness(row, col)
  return true
}

Exet.prototype.scrollCluesIfNeeded = function() {
  let clue = this.puz.clues[this.currClueIndex()];
  if (!clue) return;
  let elt = clue.clueTR;
  if (!elt) return;
  const parPos = this.cluesPanel.getBoundingClientRect();
  if (parPos.bottom < 0) {
    return;
  }
  let windowH = this.puz.getViewportHeight()
  if (!windowH || windowH <= 0) {
    return;
  }
  if (parPos.top >= windowH) {
    return;
  }
  const pos = elt.getBoundingClientRect();
  let ref = this.cluesPanel.firstElementChild;
  if (pos.bottom < 0 || pos.bottom < parPos.top || pos.top >= windowH ||
      pos.top < parPos.top || pos.top >= parPos.bottom) {
    this.cluesPanel.scrollTop = pos.top - ref.getBoundingClientRect().top;
  }
}

Exet.prototype.finishClueChanges = function() {
  if (!this.throttledClueTimer) {
    return;
  }
  clearTimeout(this.throttledClueTimer);
  this.handleClueChange()
  this.throttledClueTimer = null;
}

Exet.prototype.replaceHandlers = function() {
  this.puz.clearCurr = (function() {
    exet.clearCurrSaved = exet.puz.clearCurr;
    return function() {
      exet.markNinasAsPrefilled();
      exet.clearCurrSaved.apply(exet.puz, arguments);
      exet.unmarkNinasAsPrefilled();
      const theClue = exet.currClue()
      theClue.clue = exet.draftClue(exet.currClueIndex());
      theClue.solution = ''
      exet.puz.setClueSolution(exet.currClueIndex());
      theClue.anno = ''
      exet.updatePuzzle(exetRevManager.REV_GRIDFILL_CHANGE);
    };
  })();
  this.puz.clearAll = (function() {
    exet.clearAllSaved = exet.puz.clearAll;
    return function() {
      exet.markNinasAsPrefilled();
      if (exet.clearAllSaved.apply(exet.puz, arguments)) {
        for (let ci in exet.puz.clues) {
          exet.puz.clues[ci].clue = exet.draftClue(ci);
          exet.puz.clues[ci].solution = '';
          exet.puz.setClueSolution(ci);
          exet.puz.clues[ci].anno = '';
        }
        exet.unmarkNinasAsPrefilled();
        exet.updatePuzzle(exetRevManager.REV_GRIDFILL_CHANGE);
      } else {
        exet.unmarkNinasAsPrefilled();
      }
    };
  })();
  this.puz.cnavToInner = (function() {
    exet.cnavToInnerSaved = exet.puz.cnavToInner;
    return function() {
      exet.finishClueChanges();
      let ret = exet.cnavToInnerSaved.apply(exet.puz, arguments);
      exet.scrollCluesIfNeeded();
      exet.makeClueEditable();
      exet.reposition();
      exet.renderClue();
      exet.updateFillChoices();
      exet.startDeadendSweep(exet.currClueIndex());
      exet.handleTabClick(exet.currTab);
      return ret;
    };
  })();
  this.puz.activateCell = (function() {
    exet.activateCellSaved = exet.puz.activateCell;
    return function() {
      let ret = exet.activateCellSaved.apply(exet.puz, arguments);
      let gridCell = exet.puz.currCell()
      if (gridCell && !gridCell.isLight && gridCell.darkness) {
        exet.navDarkness(exet.puz.currRow, exet.puz.currCol);
      }
      return ret;
    };
  })();
  this.puz.deactivateCurrCell = (function() {
    exet.dccSaved = exet.puz.deactivateCurrCell;
    return function() {
      let gridCell = exet.puz.currCell();
      if (gridCell && gridCell.darkness) {
        gridCell.darkness.style.fill = 'transparent';
      }
      exet.dccSaved.apply(exet.puz);
    };
  })();
  this.puz.deactivateCurrClue = (function() {
    exet.dcclueSaved = exet.puz.deactivateCurrClue;
    return function() {
      exet.finishClueChanges();
      exet.dcclueSaved.apply(exet.puz);
      exet.reposition();
    };
  })();
  this.puz.handleKeyUpInner = (function() {
    exet.hkuiSaved = exet.puz.handleKeyUpInner;
    return function(key, shift=false) {
      if (key >= 37 && key <= 40) {
        return exet.arrowNav(key);
      }
      return exet.hkuiSaved.apply(exet.puz, arguments);
    };
  })();
  this.puz.updateAndSaveState = (function() {
    exet.uassSaved = exet.puz.updateAndSaveState;
    return function() {
      exet.uassSaved.apply(exet.puz);
      exet.throttledGridInput(null);
    };
  })();
}

Exet.prototype.isDraftClue = function(clueText) {
  return clueText.trim().startsWith(this.DRAFT)
}
Exet.prototype.renderClue = function(theClue=null) {
  if (!theClue) {
    theClue = exet.currClue();
  }
  if (!theClue || !theClue.clueSpan || theClue.parentClueIndex) {
    return;
  }
  const c = theClue.clue;
  let modC = c;
  if (this.isDraftClue(c)) {
    modC = '<span class="xet-draft-marker">' +
      this.DRAFT + '</span> ' + c.substr(this.DRAFT.length).trim();
    theClue.clueTR.className = "xet-draft";
  } else {
    theClue.clueTR.className = "xlv-solved";
  }
  theClue.clue = modC;
  this.puz.renderClueSpan(theClue, theClue.clueSpan);
  this.puz.revealClueAnno(theClue.index);
  theClue.clue = c;
}

Exet.prototype.setDraftToggler = function() {
  const xetClue = document.getElementById("xet-clue")
  if (!xetClue) return
  const xetClueStat = document.getElementById("xet-clue-stat")
  if (this.currClueIsDraft) {
    xetClueStat.innerHTML = `<span
      class="xet-draft-marker">${this.DRAFT}</span>`
    xetClueStat.title = `Click to remove the ${this.DRAFT} marker from the clue`
  } else {
    xetClueStat.innerHTML = `<span class="xet-done-marker">${this.DRAFT}</span>`
    xetClueStat.title = `Click to add the ${this.DRAFT} marker back to the clue`
  }
}

Exet.prototype.isInTag = function(prefix, suffix, open, close) {
  let px = prefix.lastIndexOf(open)
  if (px < 0 || prefix.lastIndexOf(close) > px) return null
  let sx = suffix.indexOf(close)
  let sx2 = suffix.indexOf(open)
  if (sx < 0 || (sx2 >= 0 && sx2 < sx)) return null
  return [px, sx]
}

/**
 * Remove HTML tags (only that have matching closes) from s. Also
 * remove any matching ~{...}~ if inClue.
 */
Exet.prototype.deTag = function(s, inClue) {
  const reHTML = new RegExp('(<([^<> ]+)(>| [^>]*>))(.*)(</\\2>)')
  let match
  while ((match = s.match(reHTML)) && match.length > 5) {
    const idx = s.indexOf(match[0])
    console.assert(idx >= 0, s, match)
    // There may be a closing tag prior to the matched one
    const cStart = idx + match[1].length
    const end = s.indexOf(match[5], cStart)
    s = s.substr(0, idx) + s.substring(cStart, end) +
        s.substr(end + match[5].length);
  }
  if (!inClue) {
    return s
  }
  return this.puz.deDefMarkers(s);
}

Exet.prototype.renderDefTags = function(s) {
  s = s.replace(/~\{/g, '<span class="xlv-definition">')
  return s.replace(/\}~/g, '</span>')
}
Exet.prototype.hideDefTags = function(s) {
  s = s.replace(/~\{/g, '')
  return s.replace(/\}~/g, '')
}

Exet.prototype.adjustSavedCursor = function(deltaStart, deltaEnd) {
  this.savedCursorStart += deltaStart;
  if (this.savedCursorStart < 0) {
    this.savedCursorStart = 0;
  }
  this.savedCursorEnd += deltaEnd;
  if (this.savedCursorEnd < 0) {
    this.savedCursorEnd = 0;
  }
}

Exet.prototype.updateFormat = function(inClue, text, modText,
                                       deltaStart, deltaEnd) {
  const elt = this.savedCursorElt;
  if (!elt) return;
  elt.focus();
  elt.innerText = modText;
  this.adjustSavedCursor(deltaStart, deltaEnd);
  this.restoreCursor();
  this.handleClueChange();
}

/**
 * Resize the RHS, consisting of various iframes and the Exet panel,
 * maximizing the use of the available height.
 */
Exet.prototype.resizeRHS = function() {
  if (!this.customStyles) {
    this.customStyles = document.createElement('style');
    document.body.insertAdjacentElement('afterbegin', this.customStyles);
  }
  const windowH = this.puz.getViewportHeight();
  const extraH = Math.max(0, windowH - 740);
  const style = `
    .xet-about,
    .xet-analysis {
      height: ${440 + extraH}px;
    }
    .xet-in-tab-scrollable {
      max-height: ${435 + extraH}px;
    }
    .xet-high-tall-box {
      height: ${460 + extraH}px;
    }
    .xet-half-section,
    .xet-section {
      height: ${450 + extraH}px;
    }
    #xet-light-choices-box {
      height: ${340 + extraH}px;
    }
    .xet-clues-panel,
    .xet-mid-tall-box {
      height: ${325 + extraH}px;
    }
    .xet-tab-content {
      height: ${500 + extraH}px;
    }
  `;
  this.customStyles.innerHTML = style;
}

Exet.prototype.reposition = function() {
  /**
   * We choose to not resize the grid for now, because that needs to take care
   * of re-adding viablots and forcedLetters to the reborn gridCell.cellGroup.
   */
  this.title.className = 'xlv-title';
  this.setter.className = 'xlv-setter';
  this.preamble.className = 'xlv-preamble';
  this.title.title = '';
  this.setter.title = '';
  this.preamble.title = '';
  const clueBox = this.puz.currClue.getBoundingClientRect();
  if (this.puz.currClueIndex && clueBox.top > 0) {
    const top = clueBox.top - this.TOP_CLEARANCE;
    const right = clueBox.right;
    for (let elt of [this.title, this.setter, this.preamble]) {
      const box = elt.firstElementChild ?
        elt.firstElementChild.getBoundingClientRect() :
        elt.getBoundingClientRect();
      if (box.bottom >= top && box.left <= right) {
        elt.className += ' xet-blur';
        elt.title = 'Click to make visible';
      }
    }
  }
  if (this.xetCurrClue) {
    this.xetCurrClue.style.maxHeight = this.puz.currClue.style.maxHeight;
  }

  const clearAreaBox = this.puz.clearArea.getBoundingClientRect();

  const colourNinaWidth = Math.min(300, (clearAreaBox.width - clueBox.width) / 2);
  this.tweakColourNina.style.width = colourNinaWidth + 'px';

  const xetFormat = document.getElementById('xet-format');
  if (xetFormat) {
    const previewWidth = Math.min(480, (clearAreaBox.width - clueBox.width) / 2);
    for (let tag of Object.keys(this.formatTags)) {
      const preview = document.getElementById('xet-format-' + tag + '-preview');
      preview.style.width = previewWidth + 'px';
    }
  }

  this.resizeRHS();
}

Exet.prototype.lastTagOpener = function(s) {
  let mark = s.lastIndexOf('<');
  while (mark > 0 && s.charAt(mark - 1) == '<') {
    mark = s.substr(0, mark - 1).lastIndexOf('<');
  }
  return mark;
}

Exet.prototype.maybeShowFormat = function() {
  const xetFormat = document.getElementById('xet-format');
  if (!xetFormat) {
    return;
  }
  xetFormat.style.display = 'none';
  this.saveCursor();
  if (!this.savedCursorElt ||
      this.savedCursorId != 'xet-clue' && this.savedCursorId != 'xet-anno') {
    return;
  }
  const inClue = (this.savedCursorId == 'xet-clue')
  let text = this.savedCursorElt.innerText;
  let start = this.savedCursorStart;
  let end = this.savedCursorEnd;
  let reversed = false;
  if (start > end) {
    let temp = start;
    start = end;
    end = temp;
    reversed = true;
  }
  const sub = text.substring(start, end);
  const prefix = text.substr(0, start);
  const lprefix = prefix.toLowerCase();
  const suffix = text.substr(end);
  const lsuffix = suffix.toLowerCase();
  if (!sub.trim()) {
    return;
  }
  if (inClue) {
    const enumStart = text.lastIndexOf('(');
    if (enumStart >= 0 && end > enumStart) {
      return;
    }
  }
  const prevMark = this.lastTagOpener(prefix);
  if (prevMark >= 0 && prevMark >= prefix.lastIndexOf('>')) {
    return;
  }

  let onlyClear = sub.indexOf('<') >= 0 || sub.indexOf('>') >= 0 ||
    (inClue &&
      (sub.indexOf('~') >= 0 ||
       sub.indexOf('{') >= 0 || sub.indexOf('}') >= 0));

  numActive = 0;
  for (let tag of Object.keys(this.formatTags)) {
    const opt = document.getElementById('xet-format-' + tag);
    opt.style.display = 'none';
    const props = this.formatTags[tag];
    if (!props.inClue.includes(inClue)) continue;
    let modText = text;
    let modPrefix = prefix;
    let modSub = sub;
    let modSuffix = suffix;
    let heading = '';
    let deltaStart = 0;
    let deltaEnd = 0;
    if (tag == 'clear') {
      if (!onlyClear) continue;
      heading = 'Clear paired format tags within selection:';
      modSub = this.deTag(sub, inClue);
    } else if (tag == 'caps') {
      if (onlyClear) continue;
      heading = 'Toggle letter capitalizaton in selection:';
      modSub = '';
      for (let c of sub) {
        const uc = c.toUpperCase();
        const lc = c.toLowerCase();
        if (c == uc) modSub += lc;
        else modSub += uc;
      }
    } else if (tag == 'alt') {
      if (onlyClear) continue;
      if (this.isInTag(lprefix, lsuffix, '<b>', '</b>')) continue;
      heading = 'Make alternate letters in selection bold and in upper case:';
      modSub = '';
      let odd = true;
      for (let c of sub) {
        const lc = c.toLowerCase();
        if (lc >= 'a' && lc <= 'z') {
          if (odd) modSub += '<b>' + c.toUpperCase() + '</b>';
          else modSub += c;
          odd = !odd;
        } else {
          modSub += c;
        }
      }
    } else {
      if (onlyClear) continue;
      const inTag = this.isInTag(lprefix, lsuffix, props.open, props.close);
      if (inTag) {
        heading = 'Clear selection\'s enclosing "' + tag + '" tag:';
        opt.className = 'xet-format-option-active';
        modPrefix = prefix.substr(0, inTag[0]) +
          prefix.substr(inTag[0] + props.open.length);
        modSuffix = suffix.substr(0, inTag[1]) +
          suffix.substr(inTag[1] + props.close.length);
      } else {
        heading = 'Wrap selection in "' + tag + '" tag:';
        opt.className = 'xet-format-option';
        modPrefix = prefix + props.open;
        modSuffix = props.close + suffix;
      }
    }
    modText = modPrefix + modSub + modSuffix;
    if (modText == text) continue;
    deltaStart = modPrefix.length - prefix.length;
    deltaEnd = (modPrefix.length + modSub.length) -
               (prefix.length + sub.length);
    const preview = document.getElementById('xet-format-' + tag + '-preview');
    const ph = preview.getElementsByClassName('xet-placeholder');
    ph[0].innerText = heading;
    ph[1].innerText = prefix;
    ph[2].innerText = sub;
    ph[3].innerText = suffix;
    ph[4].innerText = modPrefix;
    ph[5].innerText = modSub;
    ph[6].innerText = modSuffix;
    const rendered = inClue ? this.hideDefTags(modText) : modText;
    ph[7].innerHTML = rendered;
    ph[8].style.display = 'none';
    if (inClue) {
      const revRendered = this.renderDefTags(modText);
      if (revRendered != rendered) {
        ph[8].style.display = '';
        ph[9].innerHTML = revRendered;
      }
    }
    const b = opt.firstElementChild;
    if (reversed) {
      let temp = deltaStart;
      deltaStart = deltaEnd;
      deltaEnd = temp;
    }
    b.setAttribute('onclick',
        `exet.updateFormat(${inClue}, ` +
        `"${text.replace(/"/g, '\\"')}", "${modText.replace(/"/g, '\\"')}", ` +
        `${deltaStart}, ${deltaEnd})`);
    opt.style.display = '';
    numActive++;
  }
  if (numActive > 0) {
    xetFormat.style.display = '';
  }
}

Exet.prototype.getLightRegexp = function(ci) {
  if (!this.lightRegexps.hasOwnProperty(ci)) {
    return '';
  }
  return this.lightRegexps[ci];
}

Exet.prototype.getLightRegexpC = function(ci) {
  if (!this.lightRegexpsC.hasOwnProperty(ci)) {
    return null;
  }
  return this.lightRegexpsC[ci];
}

Exet.prototype.compileLightRegexps = function() {
  this.lightRegexpsC = {};
  const keys = Object.keys(this.lightRegexps);
  for (const ci of keys) {
    this.setLightRegexp(ci, this.lightRegexps[ci]);
  }
}

/**
 * Returns triple in array: [isValid, changed, reStrUsed]
 */
Exet.prototype.setLightRegexp = function(ci, reStr) {
  const oldStr = this.lightRegexps.hasOwnProperty(ci) ?
    this.lightRegexps[ci] : '';
  let rePart = reStr;
  let flagsPart = '';
  let re = null;
  try {
    const reForSlashFormat = /^\/([^/]*)\/([^/]*)/;
    const slashMatch = reForSlashFormat.exec(reStr);
    if (slashMatch) {
      rePart = slashMatch[1];
      flagsPart = slashMatch[2];
    }
    re = rePart ? new RegExp(rePart, flagsPart) : null;
  } catch (err) {
    return [false, false, oldStr];
  }
  if (!re) {
    if (this.lightRegexps.hasOwnProperty(ci)) {
      delete this.lightRegexps[ci];
      delete this.lightRegexpsC[ci];
    }
  } else {
    this.lightRegexpsC[ci] = re;
    this.lightRegexps[ci] = reStr;
  }
  const newStr = this.lightRegexps.hasOwnProperty(ci) ?
    this.lightRegexps[ci] : '';
  return [true, newStr != oldStr, newStr];
}

Exet.prototype.handleLightRegexpEntry = function() {
  const ci = this.currClueIndex();
  if (!this.lightRegexpEntry || !ci) {
    return;
  }
  const res = this.setLightRegexp(ci, this.lightRegexpEntry.value.trim());
  const valid = res[0];
  const changed = res[1];
  const reStr = res[2];
  if (changed) {
    this.lightRegexpIcon.style.display = reStr ? '' : 'none';
    this.resetViability();
    exetRevManager.throttledSaveRev(exetRevManager.REV_FILL_OPTIONS_CHANGE);
  }
  if (valid) {
    this.lightRegexpInvalid.style.color = 'transparent';
    this.lightRegexpRevert.innerHTML = '';
  } else {
    this.lightRegexpInvalid.style.color = 'gray';
    this.lightRegexpRevert.innerHTML = reStr;
  }
}

Exet.prototype.throttledLightRegexpEntry = function(evt) {
  this.lightRegexpInvalid.style.color = 'transparent';
  if (this.throttledLightRegexpTimer) {
    clearTimeout(this.throttledLightRegexpTimer);
  }
  this.throttledLightRegexpTimer = setTimeout(() => {
    this.handleLightRegexpEntry();
    this.throttledLightRegexpTimer = null;
  }, this.longInputLagMS);
}

Exet.prototype.makeLightRegexpPanel = function(theClue) {
  const old = document.getElementById('xet-light-regexp-panel');
  if (old) {
    old.remove();
  }
  const label = this.puz.clueLabelDisp(theClue);
  this.lightRegexpPanel = document.createElement('div');
  this.lightRegexpPanel.id = 'xet-light-regexp-panel';
  this.lightRegexpPanel.className = 'xet-above-clue-panel';
  this.lightRegexpPanel.title = 'Specify a regexp constraining the entry in ' + label + '. Press Escape or click anywhere outside to dismiss.';
  this.lightRegexpPanel.innerHTML = `
    <div style="padding:6px">
      &#128279; ${label}:
      <input id="xet-light-regexp" name="xet-light-regexp"
        class="xlv-answer" size="40" placeholder="Enter regular expression to match ${label}."
        type="text"></input>
      <div id="xet-light-regexp-invalid" style="margin-bottom:4px">
        Invalid regexp, will revert to:
        [<span id="xet-light-regexp-revert"></span>]
      </div>
      <div>
        Regexp constraints are descibed in this <a target="_blank"
        href="https://github.com/viresh-ratnakar/exet/blob/master/README.md#light-specific-menu">Exet README section</a>.
      </div>
    </div>
  `;
  this.lightRegexpPanel.style.display = 'none';
  this.puz.currClue.appendChild(this.lightRegexpPanel);
  this.lightRegexpEntry = document.getElementById('xet-light-regexp');
  this.lightRegexpInvalid = document.getElementById('xet-light-regexp-invalid');
  this.lightRegexpInvalid.style.color = 'transparent';
  this.lightRegexpRevert = document.getElementById('xet-light-regexp-revert');
  const re = this.getLightRegexp(theClue.index);
  this.lightRegexpEntry.value = re;
  this.lightRegexpIcon.style.display = re ? '' : 'none';
  this.lightRegexpEntry.addEventListener('input', this.throttledLightRegexpEntry.bind(this));
}

Exet.prototype.showLightRegexpPanel = function(evt) {
  const theClue = this.currClue();
  if (!theClue) {
    return;
  }
  if (!this.lightRegexpPanel) {
    console.log('showLightRegexpPanel() called prematurely!');
    return;
  }
  exetModals.showModal(this.lightRegexpPanel);
  evt.stopPropagation();
  this.lightRegexpEntry.focus();
}

Exet.prototype.makeLinkingPanel = function() {
  const oldLinking = document.getElementById('xet-linking');
  if (oldLinking) {
    oldLinking.remove();
  }
  this.linking = document.createElement('div');
  this.linking.id = 'xet-linking';
  this.linking.className = 'xet-above-clue-panel';
  this.linking.title = 'Press the "Add" button after entering the clue to link to. Press Escape or click anywhere outside to dismiss.';
  this.linking.innerHTML = `
    <button id="xet-add-linked" class="xlv-small-button">Add</button>
    <input id="xet-add-linked-num" name="xet-add-linked-num"
      title="Enter a clue number followed by a direction suffix"
          class="xlv-answer" size="8" placeholder="[N][a/d]" type="text"></input>
      as a linked clue.  &nbsp;
    <button class="xlv-small-button" id="xet-unlink" style="color:red">
    Break linked clues
    `;
  this.linking.style.display = 'none';
  this.puz.currClue.appendChild(this.linking);
  document.getElementById("xet-add-linked").addEventListener(
      'click', this.addLinkedClue.bind(this));
  this.unlink = document.getElementById("xet-unlink");
  this.unlink.addEventListener('click', this.unlinkCurrClue.bind(this));
}

Exet.prototype.makeFormatPanel = function() {
  const previewPanel = `
    <div class="xet-action xet-placeholder"></div>
    <div class="xet-format-preview">
      <span class="xet-placeholder"></span><span
        class="xet-format-selection xet-placeholder"></span><span
        class="xet-placeholder"></span>
    </div>
    <div class="xet-action">To:</div>
    <div class="xet-format-preview">
      <span class="xet-placeholder"></span><span
        class="xet-format-selection xet-placeholder"></span><span
        class="xet-placeholder"></span>
    </div>
    <hr>
    <div class="xet-action">Preview:</div>
    <div class="xet-format-preview xet-placeholder"></div>
    <div class="xet-placeholder" style="display:none">
      <hr>
      <div class="xet-action">Preview with "def"s revealed:</div>
      <div class="xet-format-preview xet-placeholder"></div>
    </div>`;

  const oldFormat = document.getElementById('xet-format');
  if (oldFormat) {
    oldFormat.remove();
  }
  const format = document.createElement('div');
  format.id = 'xet-format';
  format.className = 'xet-format';
  // Divs of class xet-placeholder will get populated based
  // upon the current selection.
  format.innerHTML = `
    <div class="xet-format-label">
      <span class="xet-format-option" style="display:none" id="xet-format-clear">
        <button class="xlv-small-button">
          <s style="text-decoration-color:red;text-decoration-thickness:1.5px">
            <i><b>T</b></i>
          </s>
          <div class="xet-format-panel" id="xet-format-clear-preview">
            ${previewPanel}
          </div>
        </button>
      </span>
      <span class="xet-format-option" style="display:none" id="xet-format-alt">
        <button class="xlv-small-button"><b>A</b>l<b>T</b>s
          <div class="xet-format-panel" id="xet-format-alt-preview">
            ${previewPanel}
          </div>
        </button>
      </span>
      <span class="xet-format-option" style="display:none" id="xet-format-caps">
        <button class="xlv-small-button">CAPs
          <div class="xet-format-panel" id="xet-format-caps-preview">
            ${previewPanel}
          </div>
        </button>
      </span>
      <span class="xet-format-option" style="display:none" id="xet-format-b">
        <button class="xlv-small-button"><b>B</b>
          <div class="xet-format-panel" id="xet-format-b-preview">
            ${previewPanel}
            <div class="xet-small-action">
              Keyboard shortcut: Ctrl-b
            </div>
          </div>
        </button>
      </span>
      <span class="xet-format-option" style="display:none" id="xet-format-i">
        <button class="xlv-small-button"><i>I</i>
          <div class="xet-format-panel" id="xet-format-i-preview">
            ${previewPanel}
            <div class="xet-small-action">
              Keyboard shortcut: Ctrl-i
            </div>
          </div>
        </button>
      </span>
      <span class="xet-format-option" style="display:none" id="xet-format-u">
        <button class="xlv-small-button"><u>U</u>
          <div class="xet-format-panel" id="xet-format-u-preview">
            ${previewPanel}
            <div class="xet-small-action">
              Keyboard shortcut: Ctrl-u
            </div>
          </div>
        </button>
      </span>
      <span class="xet-format-option" style="display:none" id="xet-format-s">
        <button class="xlv-small-button"><s>S</s>
          <div class="xet-format-panel" id="xet-format-s-preview">
            ${previewPanel}
            <div class="xet-small-action">
              Keyboard shortcut: Ctrl-s
            </div>
          </div>
        </button>
      </span>
      <span class="xet-format-option" style="display:none" id="xet-format-def">
        <button class="xlv-small-button"><u>Def</u>
          <div class="xet-format-panel" id="xet-format-def-preview">
            ${previewPanel}
            <div class="xet-small-action">
              Keyboard shortcut: Ctrl-d
            </div>
          </div>
        </button>
      </span>
    </div>`;
  this.puz.currClue.appendChild(format);
}

Exet.prototype.makeClueEditable = function() {
  const theClue = this.currClue();
  if (!theClue) {
    return;
  }
  /**
   * Wrap xlv-curr-clue's children in a new div of class xet-curr-clue.
   * xet-curr-clue will copy max-height from Exolve's settings
   * of xlv-curr-clue, and it will have overflow-y=auto. But xlv-curr-clue
   * itself will have overflow=visible, so that the "linking" and "format"
   * floating elements will get shown.
   */
  this.xetCurrClue = document.createElement('div');
  this.xetCurrClue.className = 'xet-curr-clue';
  this.xetCurrClue.id = 'xet-curr-clue';
  this.xetCurrClue.style.width = this.puz.currClue.style.width;
  this.xetCurrClue.style.maxHeight = this.puz.currClue.style.maxHeight;
  const currClueInner = this.puz.currClueInner ?? this.puz.currClue;
  while (currClueInner.children.length > 0) {
    this.xetCurrClue.appendChild(currClueInner.children[0]);
  }
  currClueInner.appendChild(this.xetCurrClue);

  const nextprevOld = document.getElementById('xet-nextprev-span');
  if (nextprevOld) {
    nextprevOld.remove();
  }
  const nextprevSpan = document.getElementById(
      `${exet.puz.prefix}-nextprev-span`);
  nextprevSpan.id = 'xet-nextprev-span';
  this.puz.currClue.appendChild(nextprevSpan);
  nextprevSpan.insertAdjacentHTML('afterbegin',
      `<button id="xet-clue-menu-button"
          style="padding: 1px 4px"
          title="Click to see more options for ${this.puz.clueLabelDisp(theClue)}."
          class="xlv-small-button xlv-nextprev">&#9776;<div
            id="xet-clue-menu" class="xet-clue-menu">
        <div class="xet-clue-menu-item" id="xet-clue-menu-linking"
          title="Click to create or break a linked group of clues. Also accessible by clicking the clue number to the left of 'Edit clue: ...'.">
        Link/Unlink
        </div>
        <div class="xet-clue-menu-item" id="xet-clue-menu-regexp"
          title="Click to add or edit a regexp constraint on the grid-fill in this light.">
        &#128279; Regexp constraint
        </div>
        <div class="xet-clue-menu-item" id="xet-clue-menu-clear"
          onclick="exet.puz.clearCurr()"
          title="Click to clear the current light (will not ask for confirmation).">
        Clear (Ctrl-q)
        </div>
        <div class="xet-clue-menu-item" id="xet-clue-menu-reverse"
          onclick="exet.reverseLight()"
          title="Click to reverse the current light (will ask for confirmation). Will also break any linked groups this light is a part of.">
        Reverse
        </div>
      </div></button>`);
  this.clueMenuButton = document.getElementById('xet-clue-menu-button');
  this.clueMenu = document.getElementById('xet-clue-menu');
  this.clueMenuButton.addEventListener('click', e => {
    exetModals.showModal(this.clueMenu);
    e.stopPropagation();
  });
  const clueMenuLinking = document.getElementById('xet-clue-menu-linking');
  const clueMenuRegexp = document.getElementById('xet-clue-menu-regexp');
  this.makeLightRegexpPanel(theClue);
  clueMenuRegexp.addEventListener('click', this.showLightRegexpPanel.bind(this));

  const currClueText = document.getElementById(
      `${exet.puz.prefix}-curr-clue-text`);
  currClueText.innerHTML = `<span class="xet-action">Edit clue: </span><span
    id="xet-clue-stat" class="xet-clue-stat"></span><span
    contenteditable="true" class="xet-editable" id="xet-clue"></span>`;
  this.currClueIsDraft = this.isDraftClue(theClue.clue);
  // We make the raw clue text editable here, including any tags or
  // in-clue-anno markers (~{...}~).
  const xetClue = document.getElementById("xet-clue");
  xetClue.spellcheck = exetState.spellcheck;
  xetClue.innerText = this.currClueIsDraft ?
    theClue.clue.substr(this.DRAFT.length).trim() : theClue.clue;
  const handler = this.throttledClueChange.bind(this);
  xetClue.addEventListener('input', handler);
  this.setDraftToggler();
  const xetClueStat = document.getElementById("xet-clue-stat");
  xetClueStat.addEventListener('click', e => {
    e.stopPropagation();
    exet.currClueIsDraft = !exet.currClueIsDraft;
    exet.setDraftToggler();
    exet.handleClueChange();
  });

  const spacer = document.createElement('span');
  spacer.innerHTML = `<br><span class="xet-action">Edit
      optional anno:&nbsp;</span>`;
  this.xetCurrClue.appendChild(spacer);

  const xetAnno = document.createElement('span');
  xetAnno.className = 'xet-anno xet-editable';
  xetAnno.id = 'xet-anno';
  xetAnno.contentEditable = true;
  xetAnno.spellcheck = exetState.spellcheck;
  xetAnno.innerText = theClue.anno;
  this.xetCurrClue.appendChild(xetAnno);
  xetAnno.addEventListener('input', handler);

  this.makeLinkingPanel();
  if (theClue.childrenClueIndices && theClue.childrenClueIndices.length > 0) {
    this.unlink.style.display = '';
  } else {
    this.unlink.style.display = 'none';
  }

  const ccLabel = document.getElementById(`${this.puz.prefix}-curr-clue-label`);
  ccLabel.title = 'Click to add or break up linked clues';
  const linkingShower = e => {
    exetModals.showModal(this.linking);
    e.stopPropagation();
  };
  ccLabel.addEventListener('click', linkingShower);
  clueMenuLinking.addEventListener('click', linkingShower);

  this.makeFormatPanel();
  const formatShortcut = (e) => {
    if (!e.ctrlKey && !e.metaKey) return true;
    const tag = (e.key == 'd') ? 'def' : e.key.toLowerCase();
    if (tag != 'b' && tag != 'i' && tag != 'u' && tag != 's' && tag != 'def') {
      return true;
    }
    e.stopPropagation();
    e.preventDefault();
    const opt = document.getElementById('xet-format-' + tag);
    if (!opt || opt.style.display == 'none') {
      return false;
    }
    b = opt.firstElementChild;
    if (typeof b.onclick == "function") {
      b.onclick.apply(b);
    }
    return false;
  };
  xetClue.addEventListener('keydown', formatShortcut);
  xetAnno.addEventListener('keydown', formatShortcut);

  this.puz.resizeCurrClueAndControls();
  this.reposition();
}

Exet.prototype.throttledClueChange = function() {
  if (this.throttledClueTimer) {
    clearTimeout(this.throttledClueTimer);
  }
  this.maybeShowFormat();
  this.throttledClueTimer = setTimeout(() => {
    this.handleClueChange();
    this.throttledClueTimer = null;
  }, this.longInputLagMS);
}

Exet.prototype.handleClueChange = function() {
  let ci = this.currClueIndex();
  if (!ci) {
    return;
  }
  let currClueText = document.getElementById('xet-clue');
  if (!currClueText) {
    return;
  }
  let theClue = this.puz.clues[ci];
  if (!theClue) {
    return;
  }
  let clueTR = theClue.clueTR;
  if (!clueTR) {
    return;
  }
  let clueSpan = theClue.clueSpan;
  if (!clueSpan) {
    return;
  }

  let currClueAnno = document.getElementById('xet-anno');
  if (!currClueAnno) {
    return;
  }
  if (!theClue.annoSpan) {
    return;
  }

  this.saveCursor();

  const expEnumLen = this.puz.getAllCells(ci).length;
  console.assert(expEnumLen > 0, ci);
  this.stripInputLF(currClueText);
  let clue = currClueText.innerText;
  const savedClue = clue;
  clue = clue.trim();
  const oldEnumParse = this.puz.parseEnum(theClue.clue);
  let enumParse = this.puz.parseEnum(clue);

  /**
   * If !requireEnums, we allow any enum-like thing in the
   * clue, even with mismatched length. Otherwise, we enforce
   * the required length, unless ignoreEnumMismatch is set.
   */
  if (this.requireEnums) {
    const clueSansEnum = clue.substr(0, enumParse.afterClue).trim();
    /**
     * Revert to the old enum if the new one isn't an
     * enum or if the new one says a length that is different
     * from what the light says.
     */
    if (enumParse.enumLen == 0 ||
        (enumParse.enumLen != expEnumLen && !this.puz.ignoreEnumMismatch)) {
      if (enumParse.enumLen > 0) {
        this.showTip(this.TIP_ENUM_MISMATCH);
      }
      clue = clueSansEnum + ' ' +
             (oldEnumParse.enumStr || ('(' + expEnumLen + ')'));
    } else {
      clue = clueSansEnum + ' ' + enumParse.enumStr;
    }
    enumParse = this.puz.parseEnum(clue);
  }
  if (clue != savedClue) {
    let delta = clue.length - savedClue.length;
    if (delta < 0) {
      this.adjustSavedCursor(delta, delta);
    }
    currClueText.innerText = clue;
  }
  if (this.currClueIsDraft) {
    clue = this.DRAFT + ' ' + clue;
  }
  this.setDraftToggler();

  theClue.clue = clue;
  this.puz.parseInClueAnnos(theClue);

  this.stripInputLF(currClueAnno);
  theClue.anno = currClueAnno.innerText;
  if (theClue.annoSpan.lastElementChild) {
    theClue.annoSpan.lastElementChild.innerHTML = theClue.anno;
  }
  this.renderClue(theClue);

  this.puz.resizeCurrClueAndControls();
  this.reposition();

  this.restoreCursor();

  if (this.currTab == "research" &&
      this.researchNeedsClueWords()) {
    this.researchTabNav();
  }
  if (!this.currClueIsDraft &&
      exetLexicon.depunct(clue).split(' ').length > 12) {
    this.showTip(this.TIP_ANALYSIS);
  }
  if (oldEnumParse.enumStr != enumParse.enumStr) {
    if (this.handleGridInput()) {
      // throttledSaveRev() got called already
      return;
    }
  }
  exetRevManager.throttledSaveRev(exetRevManager.REV_CLUE_CHANGE);
}

/**
 * Return < 0 if !noSkipping and randomness suggests picking nothing.
 */
Exet.prototype.randomIndex = function(candidates, noSkipping) {
  if (candidates.length <= 0 || (!noSkipping && (Math.random() > 0.98))) {
    return -1;
  }
  if (candidates.length == 1) {
    return 0;
  }
  return Math.floor(Math.random() * candidates.length);
}

Exet.prototype.shuffle = function(arr) {
  // Fisher-Yates shuffle of arr[]
  for (let i = arr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

Exet.prototype.automagicBlocksInner = function(chequered, targetNumClues, showAlerts=true) {
  const minSpan = chequered ? 4 : 3;
  const grid = this.puz.grid;
  const w = this.puz.gridWidth;
  const wby2 = Math.ceil(w / 2);
  const h = this.puz.gridHeight;
  const hby2 = Math.ceil(h / 2);
  const layers3d = this.puz.layers3d;

  const analysis = new ExetAnalysis(grid, w, h, layers3d);
  const minwhby2 = Math.min(wby2, hby2);

  const rowcols = [];
  for (let x = 0; x < minwhby2; x++) {
    rowcols.push(["row", x]);
    rowcols.push(["col", x]);
  }
  for (let i = minwhby2; i < hby2; i++) {
    rowcols.push(["row", i]);
  }
  for (let j = minwhby2; j < wby2; j++) {
    rowcols.push(["col", j]);
  }
  /**
   * Randomize the order of rowcols.
   */
  this.shuffle(rowcols);

  let totalChanges = 0;
  let numClues = Object.keys(this.puz.clues).length;
  /**
   * Add a maxLoops limit because technically, the randomness couuld
   * lead to a no-op in every loop. Also, loop at least once even if
   * targetNumClues <= numClues.
   */
  const maxLoops = Math.max(1, (targetNumClues - numClues));
  let loop = 0;
  while (numClues < targetNumClues && (loop++ < maxLoops)) {
    let numChanges = 0;
    let numCandidates = 0;
    for (rc of rowcols) {
      let k1 = rc[1];
      let isRow = (rc[0] == "row");
      let symk1 = w - 1 - k1;
      if (isRow) {
        symk1 = h - 1 - k1;
      }
      const spans = isRow ? analysis.acrossSpans(k1) : analysis.downSpans(k1);
      const candidates = [];
      for (let span of spans) {
        for (let x = minSpan; x < span[1] - minSpan; x++) {
          let k2 = span[0] + x;
          let symk2 = h - 1 - k2;
          if (isRow) {
            symk2 = w - 1 - k2;
          }
          const gridCell = isRow ? grid[k1][k2] : grid[k2][k1];
          const gridSymCell = isRow ? grid[symk1][symk2] : grid[symk2][symk1];
          if (gridCell.solution != '?' || gridSymCell.solution != '?') {
            continue;
          }
          gridCell.isLight = false;
          gridSymCell.isLight = false;
          if (analysis.isConnected() &&
              ((chequered && analysis.chequeredOK()) ||
               (!chequered && analysis.unchequeredOK())) &&
              analysis.throughCutsBigEnough()) {
            candidates.push(k2);
          }
          gridCell.isLight = true;
          gridSymCell.isLight = true;
        }
      }
      if (candidates.length == 0) {
        continue;
      }
      numCandidates += candidates.length;
      /**
       * If there was only one span, and we're not doing a chequered grid, then
       * do not skip breaking it up.
       */
      const noSkipping = !chequered && (spans.length == 1);
      let randIndex = this.randomIndex(candidates, noSkipping);
      if (randIndex < 0) {
        /** We randomly chose not to make a change */
        continue;
      }
      let k2 = candidates[randIndex];
      let symk2 = h - 1 - k2;
      if (isRow) {
        symk2 = w - 1 - k2;
      }
      const gridCell = isRow ? grid[k1][k2] : grid[k2][k1];
      const gridSymCell = isRow ? grid[symk1][symk2] : grid[symk2][symk1];
      gridCell.isLight = false;
      gridSymCell.isLight = false;
      numChanges += 2;
      numClues = this.killInvalidatedClues();
      if (numClues >= targetNumClues) {
        break;
      }
    }
    totalChanges += numChanges;
    if (numCandidates == 0) {
      break;
    }
 }
  if (totalChanges == 0) {
    if (showAlerts) {
      alert('Add automagic blocks: found no further candidate cells ' +
            'for turning into blocks');
    }
  }
  return totalChanges > 0;
}

Exet.prototype.automagicBlocks = function(noTarget=true) {
  const grid = this.puz.grid;
  const w = this.puz.gridWidth;
  const h = this.puz.gridHeight;
  const layers3d = this.puz.layers3d;
  const analysis = new ExetAnalysis(grid, w, h, layers3d);
  if (analysis.numBars() > 0) {
    alert('Cannot add automagic blocks when the grid has barred cells');
    return false;
  }
  if (this.puz.layers3d > 1) {
    alert('Cannot add automagic blocks when the crossword has lights other than across/down');
    return false;
  }
  if (!analysis.isConnected()) {
    alert('Cannot add automagic blocks when the grid cells are not ' +
          'fully connected');
    return false;
  }
  if (!analysis.isSymmetric()) {
    alert('Cannot add automagic blocks when the grid is not fully symmetric');
    return false;
  }
  const showAlerts = noTarget;
  if (analysis.unchequeredOK()) {
    const target = noTarget ? w*h : Math.ceil(2*w*h/5.8);
    return this.automagicBlocksInner(false, target, showAlerts);
  } else  if (analysis.chequeredOK()) {
    const lightRows = Math.floor(h/2) + (((h % 2) == 1 && grid[0][0].isLight) ? 1 : 0);
    const lightCols = Math.floor(w/2) + (((w % 2) == 1 && grid[0][0].isLight) ? 1 : 0);
    const target = noTarget ? w*h : Math.floor((lightRows * (w/7.5)) + (lightCols * (h/7.5)));
    return this.automagicBlocksInner(true, target, showAlerts);
  } else {
    if (showAlerts) alert('Cannot add automagic blocks to the current grid');
    return false;
  }
  return false;
}

// Can be called with e as an event or as a key directly
Exet.prototype.handleKeyDown = function(e) {
  let key = e.key || e;
  if (key == '=') {
    this.acceptAll();
    return;
  }
  let gridCell = this.puz.currCell();
  if (!gridCell) {
    return;
  }

  if (key == '$') {
    this.toggleNina(e);
    return;
  } else if (key == '^') {
    this.toggleColour(e);
    return;
  }

  let row = this.puz.currRow;
  let col = this.puz.currCol;

  let revType = exetRevManager.REV_GRID_CHANGE;

  if (key == '!' && gridCell.solution != '?') {
    revType = exetRevManager.REV_METADATA_CHANGE;
    gridCell.prefill = !gridCell.prefill;
  } else if (key == '@') {
    revType = exetRevManager.REV_METADATA_CHANGE;
    gridCell.hasCircle = !gridCell.hasCircle;
  } else if (key == '.') {
    gridCell.isLight = !gridCell.isLight;
    if (!this.asymOK) {
      const symRow = this.puz.gridHeight - 1 - row;
      const symCol = this.puz.gridWidth - 1 - col;
      const symCell = this.puz.grid[symRow][symCol];
      symCell.isLight = gridCell.isLight;
    }
    this.killInvalidatedClues();
  } else if (key == '|') {
    if (col >= this.gridWidth - 1) {
      return;
    }
    gridCell.hasBarAfter = !gridCell.hasBarAfter;
    if (!this.asymOK) {
      const symRow = this.puz.gridHeight - 1 - row;
      const symCol = this.puz.gridWidth - 2 - col;
      const symCell = this.puz.grid[symRow][symCol];
      symCell.hasBarAfter = gridCell.hasBarAfter;
    }
    this.killInvalidatedClues();
  } else if (key == '_') {
    if (row >= this.gridHeight - 1) {
      return;
    }
    gridCell.hasBarUnder = !gridCell.hasBarUnder;
    if (!this.asymOK) {
      const symRow = this.puz.gridHeight - 2 - row;
      const symCol = this.puz.gridWidth - 1 - col;
      const symCell = this.puz.grid[symRow][symCol];
      symCell.hasBarUnder = gridCell.hasBarUnder;
    }
    this.killInvalidatedClues();
  } else if (key == '#') {
    if (!this.automagicBlocks()) {
      return;
    }
  } else {
    return;
  }
  this.updatePuzzle(revType);
}

Exet.prototype.throttledGridInput = function(e) {
  if (this.throttledGridTimer) {
    clearTimeout(this.throttledGridTimer);
  }
  this.throttledGridTimer = setTimeout(() => {
    this.handleGridInput();
    this.throttledGridTimer = null;
  }, this.inputLagMS);
}

// Thie will be called after Exolve's handleGridInput has done its thing.
Exet.prototype.handleGridInput = function(revType=null) {
  let needsUpdate = false
  for (let row = 0; row < this.puz.gridHeight; row++) {
    for (let col = 0; col < this.puz.gridWidth; col++) {
      let gridCell = this.puz.grid[row][col]
      if (!gridCell.isLight) {
        continue;
      }
      let newSol = (gridCell.currLetter != '0' ?  gridCell.currLetter : '?');
      if (gridCell.solution != newSol) {
        gridCell.solution = newSol;
        needsUpdate = true;
      }
      if (gridCell.currLetter != '0' && gridCell.currLetter != '?' &&
          gridCell.viablot) {
        gridCell.viablot.style.fill = 'transparent';
      }
    }
  }
  for (let ci in this.puz.clues) {
    let theClue = this.puz.clues[ci];
    let oldPH = theClue.placeholder;
    let oldSol = theClue.solution;
    theClue.placeholder = '';
    theClue.solution = '';
    let enumPos = theClue.clue.lastIndexOf('(');
    if (enumPos >= 0) {
      theClue.placeholder = this.puz.parseEnum(
          theClue.clue.substr(enumPos)).placeholder;
    }
    this.puz.setClueSolution(ci);
    if (theClue.placeholder != oldPH || theClue.solution != oldSol) {
      needsUpdate = true;
    }
  }
  if (needsUpdate) {
    if (!revType) revType = exetRevManager.REV_GRIDFILL_CHANGE;
    this.updatePuzzle(revType);
  }
  return needsUpdate;
}

Exet.prototype.remapDisplayLabel = function(displayLabel, dir, newLabels) {
  let s = 0;
  let mapped = '';
  while (s < displayLabel.length) {
    const parse = this.puz.parseClueLabel(displayLabel.substr(s), false);
    if (parse.notLabel || !parse.skip || !parse.label) {
      mapped += displayLabel.charAt(s);
      s++;
      continue;
    }
    const index = (parse.dir ? parse.dir : dir) + parse.label;
    let changed = newLabels[index];
    if (changed && !parse.dir) {
      // Strip away the direction from changed, if it's natural.
      const newParse = this.puz.parseClueLabel(changed);
      if (!newParse.reversed) {
        changed = newParse.label;
      }
    }
    mapped += parse.leadSpace + (changed || parse.dirStr);
    s += parse.skip;
  }
  return mapped;
}

Exet.prototype.updateColourNinaLights = function(nOrCList, fullNewLabels) {
  const old = nOrCList.slice();
  nOrCList.splice(0);  // empty it out.
  for (let nOrC of old) {
    const list = nOrC.list;
    nOrC.list = [];
    for (let cccc of list) {
      if (!cccc.isLight) {
        nOrC.list.push(cccc);
        continue;
      }
      const clue = this.puz.clueFromLabel(cccc.str);
      if (!clue) {
        console.log('Old colour/nina light ' + cccc.str + ' was invalid!');
        continue;
      }
      if (!fullNewLabels[clue.index]) {
        console.log('Old colour/nina light ' + cccc.str + ' no longer exists!');
        continue;
      }
      cccc.str = fullNewLabels[clue.index];
      nOrC.list.push(cccc);
    }
    if (nOrC.list.length > 0) {
      nOrCList.push(nOrC);
    }
  }
}

/**
 * Returns the number of clues in the updated puzzle.
 */
Exet.prototype.killInvalidatedClues = function() {
  const tempId = this.puz.id + '-temp';
  // New puzzle, but no clues/ninas/colours (these may contain invalid entries).
  const specs = this.getExolve(
      tempId, true /*skipClues*/, false /* solved */,
      false /* showColoursNinas */);
  const xetTemp = document.getElementById("xet-temp");
  xetTemp.innerHTML = '';
  const newPuz = new Exolve(specs, "xet-temp", null, false, 0, 0, false);
  // First build a map of cell-lists to new-clue-index
  const cellsToIndex = {};
  for (let ci in newPuz.clues) {
    const ckey = JSON.stringify(newPuz.clues[ci].cells);
    cellsToIndex[ckey] = ci;
  }

  // Keys are clue indices from the old grid:
  const getsRelocated = {};
  const fullNewLabels = {};

  // Keys are clue indices from the new grid:
  const isRelocated = {};
  const isReversed = {};

  for (let ci in this.puz.clues) {
    let ckey = JSON.stringify(this.puz.clues[ci].cells);
    let reversed = false;
    if (!cellsToIndex[ckey]) {
      const rcells = this.puz.clues[ci].cells.slice().reverse();
      ckey = JSON.stringify(rcells);
      reversed = true;
    }
    if (!cellsToIndex[ckey]) {
      continue;
    }
    const newCi = cellsToIndex[ckey];
    getsRelocated[ci] = newCi;
    fullNewLabels[ci] = newPuz.clueLabelDisp(newPuz.clues[newCi]);
    isRelocated[newCi] = Object.assign({}, this.puz.clues[ci]);
    isReversed[newCi] = reversed;
  }
  // Preserve linked clues, if possible
  for (let ci in this.puz.clues) {
    const oldClue = this.puz.clues[ci];
    if (!oldClue.childrenClueIndices ||
        !oldClue.childrenClueIndices.length) {
      continue;
    }
    const oldList = this.puz.getLinkedClues(ci);
    console.assert(oldList.length > 1 && oldList[0] == ci, oldList);
    let allMatch = true;
    for (let cci of oldList) {
      if (!getsRelocated[cci]) {
        allMatch = false;
        break;
      }
    }
    if (!allMatch) {
      for (let cci of oldList) {
        if (!getsRelocated[cci]) {
          continue;
        }
        const newCi = getsRelocated[cci];
        delete getsRelocated[cci];
        delete fullNewLabels[cci];
        delete isRelocated[newCi];
        delete isReversed[newCi];
      }
    }
  }
  for (let ci in this.puz.clues) {
    if (!getsRelocated[ci] && !this.isDraftClue(this.puz.clues[ci].clue)) {
      console.log('Non-draft clue ' + ci + ' got deleted: ' +
                  this.puz.clues[ci].clue);
    }
  }
  this.updateColourNinaLights(this.puz.colourfuls, fullNewLabels);;
  this.updateColourNinaLights(this.puz.ninas, fullNewLabels);;

  this.puz.clues = {};
  for (let newCi in isRelocated) {
    this.puz.clues[newCi] = this.puz.newClue(newCi);
    const theClue = this.puz.clues[newCi];
    const oldClue = isRelocated[newCi];
    theClue.displayLabel = this.remapDisplayLabel(
        oldClue.displayLabel, oldClue.dir, fullNewLabels);
    theClue.clue = oldClue.clue;
    theClue.anno = oldClue.anno;
    theClue.placeholder = oldClue.placeholder;
    theClue.reversed = oldClue.reversed;
    if (isReversed[newCi]) {
      theClue.reversed = !theClue.reversed;
      theClue.solution = '';  // will be recomputed by updatePuzzle().
    }
    if (oldClue.parentClueIndex) {
      console.assert(getsRelocated[oldClue.parentClueIndex], oldClue);
      theClue.parentClueIndex = getsRelocated[oldClue.parentClueIndex];
      // Update "See XX"
      theClue.clue = this.remapDisplayLabel(
          oldClue.clue, oldClue.dir, fullNewLabels);
    }
  }

  const newLightRegexps = {};
  for (const oldCi in getsRelocated) {
    if (!this.lightRegexps.hasOwnProperty(oldCi)) {
      continue;
    }
    newLightRegexps[getsRelocated[oldCi]] = this.lightRegexps[oldCi];
  }
  this.lightRegexps = newLightRegexps;
  this.compileLightRegexps();

  xetTemp.innerHTML = '';
  newPuz.destroy();
  return Object.keys(cellsToIndex).length;
}

Exet.prototype.unlinkClue = function(ci) {
  let theClue = this.puz.clues[ci];
  if (!theClue || !theClue.childrenClueIndices ||
      theClue.childrenClueIndices.length == 0) {
    return;
  }
  for (let cci of theClue.childrenClueIndices) {
    const cClue = this.puz.clues[cci];
    delete cClue.parentClueIndex;
    cClue.linkedOffset = 0;
    cClue.solution = '';
    cClue.anno = '';
    cClue.clue = this.draftClue(cci);
  }
  theClue.childrenClueIndices = [];
  theClue.displayLabel = theClue.label;
  this.maybeAdjustEnum(ci);
  theClue.solution = ''
  theClue.anno = ''
}

Exet.prototype.unlinkCurrClue = function() {
  if (!this.puz) return
  let ci = this.currClueIndex()
  this.unlinkClue(ci);
  this.updatePuzzle(exetRevManager.REV_GRIDFILL_CHANGE);
}

Exet.prototype.maybeAdjustEnum = function(ci) {
  const theClue = this.puz.clues[ci]
  if (!theClue) {
    return
  }
  const expEnumLen = this.puz.getAllCells(ci).length
  const enumPos = theClue.clue.lastIndexOf('(')
  if (enumPos >= 0) {
    const oldEnum = theClue.clue.substr(enumPos).trim()
    const enumParse = this.puz.parseEnum(oldEnum)
    if (enumParse.enumLen == expEnumLen) {
      return;
    }
    theClue.clue = theClue.clue.substr(0, enumPos).trim();
  }
  theClue.clue = theClue.clue +
                 ((expEnumLen > 0) ? ' (' + expEnumLen + ')' : '');
}

Exet.prototype.addLinkedClue = function() {
  if (!this.puz) return;
  let ci = this.currClueIndex();
  let theClue = this.puz.clues[ci];
  if (!theClue) return;
  const num = document.getElementById("xet-add-linked-num");
  if (!num) return;
  const clueLabel = num.value.trim();
  const parsed = this.puz.parseClueLabel(clueLabel);
  if (!parsed.label || parsed.notLabel || !parsed.dir || !parsed.dirStr ||
      parsed.dirIsPrefix || parsed.skip != clueLabel.length) {
    alert('Please provide a clue number and direction suffix ' +
          '(a/d/b/u for 2-D, ac/aw/dn/ba/to/up for 3-D) and nothing else');
    return;
  }
  const cci = this.puz.getDirClueIndex(parsed.dir, parsed.label);
  if (cci == ci) {
    alert('Cannot link a clue to itself');
    return;
  }
  const cClue = this.puz.clues[cci];
  if (!cClue) {
    alert(parsed.label + parsed.dirStr + ' is not a valid clue to link to');
    return;
  }
  if (parsed.reversed != cClue.reversed) {
    alert(parsed.label + parsed.dirStr + ' does not have the current light ' +
          'orientation: reversed should be ' + cClue.reversed);
    return;
  }
  if (cClue.parentClueIndex) {
    alert(parsed.label + parsed.dirStr +
          ' is already part of another linked clue');
    return;
  }
  if (cClue.childrenClueIndices && cClue.childrenClueIndices.length > 0) {
    alert(parsed.label + parsed.dirStr + ' is itself a linked clue');
    return;
  } 
  const oldParentCells = this.puz.getAllCells(ci);
  const childCells = this.puz.getAllCells(cci);
  cClue.parentClueIndex = ci;
  cClue.clue = this.draftClue(cci);
  cClue.solution = '';
  cClue.anno = '';
  cClue.linkedOffset = 0;
  if (childCells.length > 0 && oldParentCells.length > 0) {
    const lastParentCell = oldParentCells[oldParentCells.length - 1];
    const firstChildCell = childCells[0];
    if (lastParentCell[0] == firstChildCell[0] &&
        lastParentCell[1] == firstChildCell[1]) {
      cClue.linkedOffset = 1;
    }
  }
  theClue.childrenClueIndices.push(cci);
  theClue.displayLabel = theClue.displayLabel + ', ' + parsed.label + parsed.dirStr;
  // update enum of clue
  this.maybeAdjustEnum(ci);
  theClue.solution = '';
  theClue.anno = '';
  this.updatePuzzle(exetRevManager.REV_GRIDFILL_CHANGE);
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

// TODO: deal with question hints
Exet.prototype.killQuestion = function(idx, e) {
  this.puz.questionTexts = this.puz.questionTexts.slice(0, idx).concat(
      this.puz.questionTexts.slice(idx + 1));
  this.remakeQuestionsList();
  this.puz.redisplayQuestions();
  this.puz.revealAll(false)
  e.stopPropagation();
  exetRevManager.throttledSaveRev(exetRevManager.REV_METADATA_CHANGE);
}

Exet.prototype.updateQuestion = function(idx, e) {
  this.puz.questionTexts[idx] = 
    document.getElementById("xet-question-" + idx).value;
  this.puz.redisplayQuestions();
  for (let a of this.puz.answersList) {
    if (a.ans && a.isq) {
      a.input.value = a.ans
    }
  }
  e.stopPropagation();
  exetRevManager.throttledSaveRev(exetRevManager.REV_METADATA_CHANGE);
}

Exet.prototype.remakeQuestionsList = function() {
  const qlist = document.getElementById("xet-questions-list");
  if (!qlist) return;
  let html = '';
  for (let i = 0; i < this.puz.questionTexts.length; i++) {
    const len = Math.max(80, this.puz.questionTexts[i].length);
    html += `
      <tr><td>
      <button class="xlv-small-button" id="xet-del-question-${i}">
      &times;
      </button>
      </td>
      <td>
      <input id="xet-question-${i}" class="xlv-answer"
          size="${len}" type="text">
      </input>
      </td>
      </tr>
    `
  }
  qlist.innerHTML = html;
  for (let i = 0; i < this.puz.questionTexts.length; i++) {
    const del = document.getElementById("xet-del-question-" + i);
    del.addEventListener('click', this.killQuestion.bind(this, i));
    const q = document.getElementById("xet-question-" + i);
    q.value = this.puz.questionTexts[i];
    q.addEventListener('input', this.updateQuestion.bind(this, i));
  }
}

Exet.prototype.populateQuestions = function(questions) {
  questions.innerHTML = `
  <p class="xet-action">
  Edit/delete existing questions or add new questions.
  </p>
    <p>
  Examples:
    <ul style="font-size:x-small">
    <li> Is this a simple question?</li>
    <li> Is this a simple question with an expected enum shown? (3,2)</li>
    <li> Is this a long-answer question with the enum only used for sizing? (200)* [lowercase-ok]</li>
    <li> Is this simple question with an answer that will get shown upon "Reveal all"? (10) ABSOLUTELY</li>
    </ul>
  Please refer to
    <a href="https://github.com/viresh-ratnakar/exolve#exolve-question">the
  relevant Exolve documentation</a> for further question-formatting details.
  </p>
  <div class="xet-choices-box xet-mid-tall-box">
    <button class="xlv-small-button" style="margin:6px" id="xet-add-question">
      Add new question
    </button>
    <table id="xet-questions-list">
    </table>
  </div>`
  document.getElementById("xet-add-question").addEventListener('click', e => {
    this.puz.questionTexts.push(
        "Does this question need editing? (3) YES");
    this.remakeQuestionsList();
    this.puz.redisplayQuestions();
    for (let a of this.puz.answersList) {
      if (a.ans && a.isq) {
        a.input.value = a.ans
      }
    }
    exetRevManager.throttledSaveRev(exetRevManager.REV_METADATA_CHANGE);
  });
  this.remakeQuestionsList();
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

Exet.prototype.parentWithId = function(elt) {
  while (elt && !elt.id) {
    elt = elt.parentNode;
  }
  return elt;
}

Exet.prototype.saveCursor = function() {
  this.savedCursorStart = 0;
  this.savedCursorEnd = 0;
  this.savedCursorId = '';
  this.savedCursorAtEnd = false;
  this.savedCursorElt = null;
  let sel = window.getSelection();
  if (!sel || !sel.focusNode || !sel.rangeCount) {
    return;
  }
  let parent = this.parentWithId(sel.focusNode.parentNode);
  if (!parent) {
    return;
  }
  if (!parent.isContentEditable) {
    return;
  }
  /**
   * range.toString() does not count trailing newlines.
   * sel.toString(0) does, but modifying the selection (to
   * extend it to the start) seems to trigger a selectionchange
   * event, leading to a sad infinite loop. We just live
   * with this imperfection, except for the common case
   * when the cursor is at the end.
   */
  const range = sel.getRangeAt(0);
  const rangeStr = range.toString();
  const extRange = range.cloneRange();
  extRange.setStart(parent, 0);
  const extRangeStr = extRange.toString();
  if (!extRangeStr.endsWith(rangeStr)) {
    console.log('Weird selection in element ' + parent.id + ': extRange: [' +
                extRangeStr + '], range: [' + rangeStr + ']');
    return;
  }
  this.savedCursorId = parent.id;
  this.savedCursorElt = parent;
  this.savedCursorEnd = extRangeStr.length;
  this.savedCursorStart = extRangeStr.length - rangeStr.length;
  if (rangeStr.length == 0) {
    const parentText = parent.innerText;
    const parentTextTrim = parentText.replace(/[\n\r]/g, '').trim();
    const extRangeTrim = extRangeStr.replace(/[\n\r]/g, '').trim();
    if (parentTextTrim == extRangeTrim) {
      /* handle special case of being at the end */
      this.savedCursorAtEnd = true;
      this.savedCursorEnd = parentText.length;
      this.savedCursorStart = this.savedCursorEnd;
    }
  }
}

Exet.prototype.getTextNodeAtPosition = function(elt, index) {
  const NODE_TYPE = NodeFilter.SHOW_TEXT;
  const treeWalker = document.createTreeWalker(
      elt, NODE_TYPE, function next(elem) {
    if (index > elem.textContent.length){
      index -= elem.textContent.length;
      return NodeFilter.FILTER_REJECT
    }
    return NodeFilter.FILTER_ACCEPT;
  });
  const c = treeWalker.nextNode();
  return {
    node: c ? c : elt,
    position: index
  };
}

Exet.prototype.restoreCursor = function() {
  if (this.savedCursorId) {
    const elt = document.getElementById(this.savedCursorId);
    if (elt && elt.firstChild) {
      try {
        if (this.savedCursorAtEnd) {
          this.savedCursorStart = this.savedCursorEnd = elt.innerText.length;
        }
        const sel = window.getSelection();
        const posStart = this.getTextNodeAtPosition(elt, this.savedCursorStart);
        const posEnd = this.getTextNodeAtPosition(elt, this.savedCursorEnd);
        sel.removeAllRanges();
        const range = new Range();
        range.setStart(posStart.node, posStart.position);
        range.setEnd(posEnd.node, posEnd.position);
        sel.addRange(range);
      } catch (err) {
      }
    }
  }
  this.savedCursorEnd = 0;
  this.savedCursorId = '';
}

Exet.prototype.makeExolve = function(specs) {
  let xlvFrame = document.getElementById('xet-xlv-frame')
  xlvFrame.innerHTML = ''
  if (this.puz) {
    this.puz.destroy();
  }
  this.puz = null;
  try {
    let ptemp = new Exolve(specs, 'xet-xlv-frame', this.setPuzzle.bind(this),
                           false /** provideStateUrl */,
                           this.TOP_CLEARANCE /** visTop */,
                           0 /** maxDim */,
                           false /** notTemp */)
  } catch (err) {
    this.puz = null
    console.log('Could not parse Exolve specs:')
    console.log(specs)
    console.log('Error thrown was:')
    console.log(err)
  }

  if (!this.puz) {
    return;
  }
  this.checkLocalStorage();

  this.handleTabClick(this.currTab);
  exetState.lastId = this.puz.id
  exetRevManager.saveLocal(exetRevManager.SPECIAL_KEY, JSON.stringify(exetState));
}

Exet.prototype.updatePuzzle = function(revType=0) {
  if (revType <= exetRevManager.REV_GRIDFILL_CHANGE &&
      revType != exetRevManager.REV_AUTOFILL_GRIDFILL_CHANGE) {
    this.autofill.reset('Aborted');
  }
  const row = this.puz.currRow
  const col = this.puz.currCol
  const dir = this.puz.currDir
  const scratch = this.puz.scratchPad.value
  this.savedIndsSelect = this.indsSelect ? this.indsSelect.value : ''
  this.saveCursor()
  const editingOtherSections = (exetModals.modal &&
               exetModals.modal.id == 'xet-other-sections');

  const oldPuz = this.puz;
  let exolve = this.getExolve();
  this.makeExolve(exolve);
  if (!this.puz) {
    alert('Update failed in makeExolve()! Best to reload.');
    return;
  }

  this.puz.currDir = dir
  this.puz.currRow = row
  this.puz.currCol = col
  this.puz.scratchPad.value = scratch
  if (editingOtherSections) {
    if (this.postscript) {
      this.postscript.style.display = '';
    }
    this.otherSecText.value = this.exolveOtherSec;
    exetModals.showModal(this.otherSecPanel);
    this.otherSecText.focus();
  } else if (this.puz.currCellIsValid()) {
    this.restoreCursor()
    if (this.puz.grid[row][col].isLight) {
      this.puz.activateCell(row, col)
    } else {
      this.navDarkness(row, col)
    }
  }
  if (revType > 0) {
    exetRevManager.throttledSaveRev(revType);
  }
}

Exet.prototype.getGrid = function(solved=true) {
  if (!this.puz) {
    return '';
  }
  const ENTRY_WIDTH = 3 + this.puz.langMaxCharCodes;
  let grid = '';
  for (let i = 0; i < this.puz.gridHeight; i++) {
    let gridRow = '    ';
    for (let j = 0; j < this.puz.gridWidth; j++) {
      let gridCell = this.puz.grid[i][j]
      let entry = '.';
      if (gridCell.isLight) {
        entry = (gridCell.currLetter != '0' ?
               ((solved || gridCell.prefill) ?
                     gridCell.currLetter : '0') : '?');
        if (gridCell.hasCircle) entry += '@';
        if (gridCell.prefill) entry += '!';
        entry += (gridCell.hasBarAfter && gridCell.hasBarUnder ?
                              '+' : (gridCell.hasBarAfter ?
                              '|' : (gridCell.hasBarUnder ? '_' : '')));
      }
      while (entry.length < ENTRY_WIDTH) entry += ' ';
      gridRow += entry;
    }
    grid = grid + '\n' + gridRow;
  }
  return grid;
}

Exet.prototype.getClues = function(dir, solved=true) {
  if (!this.puz) {
    return ''
  }
  const cluePtrs = [];
  for (let ci in this.puz.clues) {
    let clue = this.puz.clues[ci]
    if (clue.dir == dir) {
      cluePtrs.push(clue);
    }
  }
  cluePtrs.sort((c1, c2) => parseInt(c1.label) - parseInt(c2.label));
  let clues = ''
  for (let clue of cluePtrs) {
    const thisClue = this.puz.formatClue(clue.clue, true, true, solved);
    const label = clue.displayLabel || clue.label;
    clues = clues + '\n  ' + label + ' ' + thisClue;
    if (!solved || clue.parentClueIndex) {
      continue
    }
    const parsedEnum = this.puz.parseEnum(thisClue);
    if (!parsedEnum.enumStr && !parsedEnum.hasEmptyBracs &&
        (clue.solution || clue.anno)) {
      /** Allow appending solution/anno. */
      clues += ' []';
    }
    if (clue.solution) {
      clues = clues + ' [' + clue.solution + ']';
    }
    if (clue.anno) {
      clues = clues + ' ' + clue.anno;
    }
  }
  return clues;
}

Exet.prototype.cellCode = function(r, c) {
  return 'r' + (this.puz.gridHeight - r) +
         'c' + (c + 1);
}
Exet.prototype.lightCode = function(ci) {
  const clue = this.puz.clues[ci];
  if (!clue) return ''; 
  return this.puz.clueLabelDisp(clue);
}

Exet.prototype.getExolveColours = function() {
  let ret = ''
  for (let c of this.puz.colourfuls) {
    let list = '';
    for (let cccc of c.list) {
      list += ' ' + cccc.str;
    }
    list = list.trim();
    if (!list) continue;
    ret += `
  exolve-colour: ${c.colour} ${list}`
  }
  return ret;
}
Exet.prototype.getExolveNinas = function() {
  let ret = ''
  for (let nina of this.puz.ninas) {
    let list = '';
    for (let cccc of nina.list) {
      list += ' ' + cccc.str;
    }
    list = list.trim();
    if (!list) continue;
    const clr = nina.colour ? ' ' + nina.colour : '';
    ret += `
  exolve-nina:${clr} ${list}`
  }
  return ret;
}
Exet.prototype.getExolveQuestions = function(solved) {
  let ret = '';
  for (let q of this.puz.questionTexts) {
    let tq = q;
    if (!solved) {
      let enumParse = this.puz.parseEnum(q);
      tq = q.substr(0, enumParse.afterEnum);
      if (q.substr(enumParse.afterEnum).indexOf('[lowercase-ok]') >= 0) {
        tq = tq + ' [lowercase-ok]';
      }
    }
    ret = ret + `
  exolve-question: ${tq}`;
  }
  return ret;
}

Exet.prototype.getExolve = function(id='', skipClues=false, solved=true,
                                    showColoursNinas=true) {
  const maker = `
    Software: <a target="_blank" href="https://exet.app">Exet</a><br>
    Version: ${this.version}<br>
    Lexicon: ${exetLexicon.id}<br>
    Timestamp: ${(new Date()).toString()}<br>`
  let exolve = `exolve-begin
  exolve-id: ${(id ? id : this.puz.id)}
  exolve-width: ${this.puz.gridWidth}
  exolve-height: ${this.puz.gridHeight}` +
  (this.puz.layers3d > 1 ? `
  exolve-3d: ${this.puz.layers3d}` : '') +
  (this.puz.title ? `
  exolve-title: ${this.puz.title}` : '') +
  (this.puz.setter ? `
  exolve-setter: ${this.puz.setter}` : '') +
  (this.puz.copyright ? `
  exolve-copyright: ${this.puz.copyright}` : '') + `
  exolve-maker: ${maker}`

  if (this.puz.language || this.puz.languageScript ||
      this.puz.langMaxCharCodes > 1) {
    exolve += `
  exolve-language: ${exetLexicon.language} ${exetLexicon.script} ${exetLexicon.maxCharCodes}`
  }
  if (showColoursNinas) {
    exolve += this.getExolveColours();
    if (solved) {
      exolve += this.getExolveNinas();
    }
  }

  const preamble = document.getElementById(
      this.puz.prefix + '-preamble').innerHTML.trim()
  if (preamble) {
    exolve += `
  exolve-preamble:
    ${preamble}`
  }

  exolve += this.getExolveQuestions(solved);

  const explanations = !solved ? '' : document.getElementById(
      this.puz.prefix + '-explanations').innerHTML.trim()
  if (explanations) {
    exolve += `
  exolve-explanations:
    ${explanations}`
  }
  if (this.exolveOtherSec) {
    exolve += `
    ${this.exolveOtherSec}`;
  }

  let reversals = '';
  for (let k in this.puz.usedReversals) {
    if (reversals) reversals += ' ';
    reversals += this.puz.usedReversals[k];
  }
  if (reversals) {
    exolve += `
  exolve-reversals: ${reversals}`;
  }

  exolve += `
  exolve-grid: ${this.getGrid(solved)}` +
  (!skipClues ? `
  ${this.puz.layers3d > 1 ? 'exolve-3d-across' :
      'exolve-across'}: ${this.getClues('A', solved)}
  ${this.puz.layers3d > 1 ? 'exolve-3d-away' :
      'exolve-down'}: ${this.getClues('D', solved)}` : '') +
  (!skipClues && this.puz.layers3d > 1 ? `
  exolve-3d-down: ${this.getClues('Z', solved)}` : '') + `
exolve-end
`
  return exolve;
}

Exet.prototype.getHTML = function(solved=true) {
  return this.prefix + '\n' + this.getExolve('', false, solved) +
         '\n' + this.suffix;
}

Exet.prototype.IntersectChoices = function(set1, set2) {
  let result = {}
  for (let x in set2) {
    if (set1[x]) result[x] = true
  }
  return result
}

Exet.prototype.Set2Trims = function(set1, set2) {
  for (let x in set1) {
    if (!set2[x]) return true
  }
  return false
}

Exet.prototype.addToDontReuse = function(p, dontReuse) {
  if (this.noStemDupes) {
    const stemGroup = exetLexicon.stemGroup(p);
    for (const sp of stemGroup) {
      dontReuse[sp] = true;
    }
  } else {
    dontReuse[p] = true;
  }
}

/**
 * Looking at limit (all if 0) fill choices for each light, determine
 * additional constraints on letter choices for unfilled cells. Apply
 * these constraints to weed out choices for subseqeuent lights in the
 * loop going over all lights.
 */
Exet.prototype.refineLightChoices = function(fillState, limit=0) {
  fillState.preflexUsed = {};
  const dontReuse = {};
  for (const ci in fillState.clues) {
    const theClue = fillState.clues[ci];
    if (theClue.parentClueIndex) {
      continue;
    }
    if (theClue.solution.indexOf('?') >= 0) {
      continue;
    }
    const choices = exetLexicon.getLexChoices(theClue.solution, 1, dontReuse,
        this.noProperNouns,
        this.indexMinPop,
        false, this.preflexByLen, this.unpreflexSet,
        this.getLightRegexpC(ci));
    if (choices.length > 0) {
      let p = choices[0];
      console.assert(p > 0, p);
      this.addToDontReuse(p, dontReuse);
      if (this.preflexSet[p]) {
        fillState.preflexUsed[p] = true;
      }
    }
  }
  let changes = 0;
  for (const ci in fillState.clues) {
    const theClue = fillState.clues[ci];
    if (theClue.parentClueIndex ||
        !theClue.solution || theClue.solution.indexOf('?') < 0) {
      continue;
    }
    const cells = this.puz.getAllCells(ci);
    const toConsider = (limit <= 0) ? theClue.lChoices.length :
        Math.min(limit, theClue.lChoices.length);
    const choices = theClue.lChoices.slice(0, toConsider);
    const remChoices = theClue.lChoices.slice(toConsider);
    theClue.lChoices = [];
    const cellChoiceSets = [];
    for (const cell of cells) {
      cellChoiceSets.push({});
    }
    for (const lchoice of choices) {
      if (dontReuse[Math.abs(lchoice)]) {
        changes++;
        continue;
      }
      const key = exetLexicon.lexkey(exetLexicon.getLex(lchoice));
      if (lchoice < 0) key.reverse();
      let viable = true;
      for (let i = 0; i < key.length; i++) {
        const cell = cells[i];
        console.assert(cell && cell.length == 2, ci, i);
        const gridCell = fillState.grid[cell[0]][cell[1]];
        if (gridCell.solution == '?' && !gridCell.cChoices[key[i]]) {
          viable = false;
          break;
        }
      }
      if (viable) {
        theClue.lChoices.push(lchoice);
        for (let i = 0; i < key.length; i++) {
          cellChoiceSets[i][key[i]] = true;
        }
      } else {
        this.noteNonViableChoice(theClue, lchoice);
        changes++;
      }
    }
    let isForced = true;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const gridCell = fillState.grid[cell[0]][cell[1]];
      if (gridCell.solution != '?') {
        continue;
      }
      gridCell.cChoices = this.IntersectChoices(
          gridCell.cChoices, cellChoiceSets[i]);
      const choices = Object.keys(gridCell.cChoices);
      if (choices.length > 1) {
        isForced = false;
      }
    }
    if (isForced) {
      for (const x of theClue.lChoices) {
        const p = Math.abs(x);
        this.addToDontReuse(p, dontReuse);
        if (this.preflexSet[p]) fillState.preflexUsed[p] = true;
      }
    }
    if (!isForced && remChoices.length > 0) {
      theClue.lChoices = theClue.lChoices.concat(remChoices);
    } else {
      this.noteNonViableChoices(theClue, remChoices);
    }
  }
  fillState.numPreflexUsed = Object.keys(fillState.preflexUsed).length;
  for (let i = 0; i < fillState.gridHeight; i++) {
    for (let j = 0; j < fillState.gridWidth; j++) {
      const gridCell = fillState.grid[i][j];
      if (!gridCell.isLight || gridCell.solution != '?') {
        continue;
      }
      const choices = Object.keys(gridCell.cChoices);
      if (choices.length == 0) {
        fillState.viable = false;
      }
      gridCell.viability = this.viability(choices.length);
    }
  }
  return changes;
}

Exet.prototype.findDeadendsByCell = function(fillState) {
  return this.refineLightChoices(fillState, this.sweepMaxChoices);
}

Exet.prototype.updateViablots = function() {
  const fillState = this.fillState;
  let dead = 0;
  for (let i = 0; i < fillState.gridHeight; i++) {
    for (let j = 0; j < fillState.gridWidth; j++) {
      const gridCell = this.puz.grid[i][j];
      if (!gridCell.isLight || gridCell.solution != '?') {
        continue;
      }
      const fillStateCell = fillState.grid[i][j];
      const choices = Object.keys(fillStateCell.cChoices);
      const viablot = gridCell.viablot;
      const opacity = dead > 3 ? 0.1 : (dead == 0 ? 0.6 : 0.3);
      viablot.style.fill = (fillStateCell.viability >= 5) ?
        'transparent' :
        (fillStateCell.viability == 0 ? `rgba(255,0,255,${opacity})` :
          `rgba(255,0,0,${opacity})`);
      viablot.setAttributeNS(
          null, 'r', this.puz.circleR * 0.1 * (5 - fillStateCell.viability));
      if (fillStateCell.viability == 0) {
        dead++;
      }
      if (choices.length == 1) {
        if (!gridCell.forcedLetter) {
          const cellText =
            document.createElementNS('http://www.w3.org/2000/svg', 'text');
          cellText.setAttributeNS(
            null, 'x', this.puz.cellLeftPos(j, this.puz.lightStartX));
          cellText.setAttributeNS(
            null, 'y', this.puz.cellTopPos(i, this.puz.lightStartY));
          cellText.setAttributeNS(null, 'text-anchor', 'middle');
          cellText.setAttributeNS(null, 'editable', 'simple');
          const cellClass = 'xlv-cell-text';
          cellText.style.fill = 'gray';
          cellText.style.fontSize = this.puz.letterSize + 'px';
          cellText.setAttributeNS(null, 'class', cellClass);
          cellText.addEventListener(
              'click', this.puz.cellActivator.bind(this.puz, i, j));

          const text = document.createTextNode(choices[0]);
          cellText.appendChild(text);
          gridCell.cellGroup.appendChild(cellText);
          gridCell.forcedLetter = text;
        }
        gridCell.forcedLetter.nodeValue = choices[0];
        viablot.style.fill = 'transparent';
      } else {
        if (gridCell.forcedLetter) {
          gridCell.forcedLetter.nodeValue = '';
        }
      }
    }
  }
}

Exet.prototype.acceptAll = function() {
  if (this.autofill.running) {
    alert('Wait while autofill is running, as partial solutions may ' +
          'turn out to be non-viable')
    return;
  }
  let changed = false;
  for (let i = 0; i < this.fillState.gridHeight; i++) {
    for (let j = 0; j < this.fillState.gridWidth; j++) {
      let gridCell = this.fillState.grid[i][j]
      if (!gridCell.isLight || gridCell.solution != '?') {
        continue
      }
      let choices = Object.keys(gridCell.cChoices)
      if (choices.length == 1) {
        this.puz.grid[i][j].currLetter = choices[0]
        changed = true
      }
    }
  }
  // Now do it by clue, to get hyphens/word-breaks/reversals.
  const toFill = [];
  for (let ci in this.fillState.clues) {
    let theClue = this.fillState.clues[ci]
    console.assert(theClue, ci, this.fillState);
    if (!theClue.solution || theClue.solution.indexOf('?') < 0) {
      continue
    }
    if (theClue.parentClueIndex) {
      continue;
    }
    let choices = theClue.lChoices
    if (choices.length != 1) {
      continue
    }
    toFill.push([theClue, choices[0]]);
    changed = true
  }
  for (let fill of toFill) {
    const clue = fill[0];
    const choice = fill[1];
    this.fillLight(choice, clue, exetRevManager.REV_AUTOFILL_GRIDFILL_CHANGE);
  }
  if (changed) {
    this.handleGridInput(exetRevManager.REV_AUTOFILL_GRIDFILL_CHANGE);
  }
}

// Finds a clue that becomes non-viable when it previously was viable.
// Return true if such a clue can be found.
Exet.prototype.someClueTurnsNonViable = function(tempFillState) {
  let changes = 1;
  let tempClues = {};
  for (let ci in tempFillState.clues) {
    tempClues[ci] = {};
    let theClue = tempFillState.clues[ci];
    if (theClue.lChoices) {
      tempClues[ci].lChoices = theClue.lChoices.slice();
    }
  }
  let count = 0;
  while (changes > 0 && count < 1) {
    count++;
    changes = 0;
    for (let ci in tempFillState.clues) {
      let theClue = tempFillState.clues[ci];
      if (theClue.parentClueIndex ||
          !theClue.solution || theClue.solution.indexOf('?') < 0) {
        continue;
      }
      let cells = this.puz.getAllCells(ci);
      let cellChoiceSets = [];
      for (let cell of cells) {
        cellChoiceSets.push({});
      }
      let tempClue = tempClues[ci];
      let limit = Math.min(this.shownLightChoices, tempClue.lChoices.length);
      for (let i = 0; i < limit; i++) {
        let lchoice = tempClue.lChoices[i];
        let key = exetLexicon.lexkey(exetLexicon.getLex(lchoice));
        if (lchoice < 0) key.reverse();
        console.assert(key.length = cells.length, key.length, cells.length);
        for (let k = 0; k < key.length; k++) {
          cellChoiceSets[k][key[k]] = true;
        }
      }
      for (let i = 0; i < cells.length; i++) {
        let cell = cells[i];
        let gridCell = tempFillState.grid[cell[0]][cell[1]];
        if (gridCell.solution != '?') {
          continue;
        }
        gridCell.cChoices = this.IntersectChoices(
            gridCell.cChoices, cellChoiceSets[i]);
      }
    }
    for (let ci in tempFillState.clues) {
      let theClue = tempFillState.clues[ci];
      if (theClue.parentClueIndex ||
          !theClue.solution || theClue.solution.indexOf('?') < 0) {
        continue;
      }
      let cells = this.puz.getAllCells(ci);
      let tempClue = tempClues[ci];
      if (tempClue.lChoices.length > this.sweepMaxChoicesSmall) {
        continue;
      }
      let choices = tempClue.lChoices.slice();
      tempClue.lChoices = [];
      for (let i = 0; i < choices.length; i++) {
        let lchoice = choices[i];
        let key = exetLexicon.lexkey(exetLexicon.getLex(lchoice))
        if (lchoice < 0) key.reverse();
        let viable = true;
        for (let j = 0; j < key.length; j++) {
          let cell = cells[j];
          let gridCell = tempFillState.grid[cell[0]][cell[1]];
          if (gridCell.solution != '?') {
            continue;
          }
          if (!gridCell.cChoices[key[j]]) {
            viable = false;
            break;
          }
        }
        if (viable) {
          tempClue.lChoices.push(lchoice);
        } else {
          changes++;
        }
      }
      if (choices.length > 0 && tempClue.lChoices.length == 0) {
        return true;
      }
    }
  }
  return false;
}

Exet.prototype.noteNonViableChoice = function(clue, lchoice) {
  if (!clue.lRejects) clue.lRejects = [];
  if (clue.lRejects.length >= 1000) return;
  clue.lRejects.push(lchoice);
}
Exet.prototype.noteNonViableChoices = function(clue, lchoices) {
  if (!clue.lRejects) clue.lRejects = [];
  const toTake = Math.min(1000 - clue.lRejects.length, lchoices.length);
  if (toTake <= 0) return;
  clue.lRejects = clue.lRejects.concat(lchoices.slice(0, toTake));
}

// Returns true if should be called again
Exet.prototype.findDeadendsByClue = function() {
  let ci = this.deadendClueCheck;
  if (!ci) {
    return false;
  }
  let theClue = this.fillState.clues[ci];
  if (!theClue) {
    return false;
  }
  if (theClue.parentClueIndex ||
      !theClue.solution || theClue.solution.indexOf('?') < 0) {
    return false;
  }
  let cells = this.puz.getAllCells(ci);
  if (this.deadendClueLightCheck >= theClue.lChoices.length ||
      cells.length == 0) {
    return false;
  }
  if (this.deadendClueLightCheck >= this.shownLightChoices) {
    return false;
  }
  const CHOICES_TO_CHECK = 3;
  let prefix = theClue.lChoices.slice(0, this.deadendClueLightCheck);
  let choices = theClue.lChoices.slice(
      this.deadendClueLightCheck, this.deadendClueLightCheck + CHOICES_TO_CHECK);
  const viableChoices = [];
  let suffix = theClue.lChoices.slice(
      this.deadendClueLightCheck + CHOICES_TO_CHECK);
  let oldLen = theClue.lChoices.length;
  for (let lchoice of choices) {
    let key = exetLexicon.lexkey(exetLexicon.getLex(lchoice));
    if (lchoice < 0) key.reverse();
    console.assert(key.length = cells.length, key.length, cells.length);
    let tempFillState = new ExetFillState(this.fillState);
    for (let i = 0; i < cells.length; i++) {
      let cell = cells[i];
      let tempGridCell = tempFillState.grid[cell[0]][cell[1]];
      tempGridCell.cChoices = {};
      tempGridCell.cChoices[key[i]] = true;
    }
    if (!this.someClueTurnsNonViable(tempFillState)) {
      viableChoices.push(lchoice);
    } else {
      this.noteNonViableChoice(theClue, lchoice);
    }
  }
  theClue.lChoices = prefix.concat(viableChoices, suffix);
  this.deadendClueCheckChanges += (oldLen - theClue.lChoices.length);
  this.deadendClueLightCheck +=  viableChoices.length;
  return this.deadendClueLightCheck < theClue.lChoices.length;
}

Exet.prototype.startDeadendSweep = function(ci='') {
  if (this.viabilityUpdateTimer) {
    clearTimeout(this.viabilityUpdateTimer);
  }
  this.viabilityUpdateTimer = null;
  if (!this.puz || this.puz.numCellsFilled >= this.puz.numCellsToFill) {
    return
  }
  if (this.autofill && this.autofill.running) {
    return
  }
  this.deadendsGridSweep = true
  this.sweepIndicator.className = 'xet-sweeping-animated'
  this.viabilityUpdateTimer = setTimeout(() => {
    this.findAllDeadendFills(ci)
  }, this.sweepMS);
}

Exet.prototype.getClueToCheckDeadends = function(ci=null) {
  if (ci) {
    let theClue = this.puz.clues[ci];
    if (theClue.parentClueIndex) {
      ci = theClue.parentClueIndex;
      theClue = this.puz.clues[ci];
    }
    if (!theClue.solution || theClue.solution.indexOf('?') < 0) {
      return '';
    }
    return ci;
  }
  // Find most constrained unsolved and still-viable clue
  let res = '';
  let resChoices = exetLexicon.lexicon.length;
  for (ci in this.fillState.clues) {
    let theClue = this.fillState.clues[ci];
    if (theClue.parentClueIndex) continue;
    if (!theClue.solution || theClue.solution.indexOf('?') < 0) continue;
    if (theClue.lChoices.length > 0 && theClue.lChoices.length < resChoices) {
      resChoices = theClue.lChoices.length;
      res = ci;
    }
  }
  return res;
}

Exet.prototype.updateSweepInd = function() {
  this.sweepIndicator.className =
      (this.viabilityUpdateTimer || this.autofill.running) ?
      'xet-sweeping-animated' : 'xet-sweeping';
}

Exet.prototype.findAllDeadendFills = function(ci) {
  if (this.viabilityUpdateTimer) {
    clearTimeout(this.viabilityUpdateTimer);
  }
  this.viabilityUpdateTimer = null;
  if (this.deadendsGridSweep) {
    let changes = this.findDeadendsByCell(this.fillState)
    this.updateViablots()
    if (changes > 0) {
      this.updateFillChoices()
      this.viabilityUpdateTimer = setTimeout(() => {
        this.findAllDeadendFills(ci)
      }, this.sweepMS);
    } else {
      // Start the clue-sweep
      this.deadendsGridSweep = false
      this.deadendClueLightCheck = 0;
      this.deadendClueCheckChanges = 0;
      this.deadendClueCheck = this.getClueToCheckDeadends(ci);
      if (!this.deadendClueCheck) {
        this.updateSweepInd();
        return;
      }
      this.viabilityUpdateTimer = setTimeout(() => {
        this.findAllDeadendFills();
      }, this.sweepMS);
    }
  } else {
    const doMore = this.findDeadendsByClue();
    if (this.deadendClueCheckChanges > 0) {
      this.updateFillChoices();
    }
    if (!doMore) {
      this.deadendsGridSweep = true;
      if (this.deadendClueCheckChanges > 0) {
        // Repeat the grid-sweep
        this.viabilityUpdateTimer = setTimeout(() => {
          this.findAllDeadendFills();
        }, this.sweepMS);
      } else {
        this.updateSweepInd();
      }
    } else {
      this.viabilityUpdateTimer = setTimeout(() => {
        this.findAllDeadendFills();
      }, this.sweepMS);
    }
  }
}

Exet.prototype.viability = function(len) {
  const log2 = 0.6931471805599453;
  return len == 0 ? 0 : (len >= 16 ? 5 : (1 + (Math.log(len) / log2)));
}

Exet.prototype.initViability = function() {
  this.fillState.viable = true;
  for (let i = 0; i < this.fillState.gridHeight; i++) {
    for (let j = 0; j < this.fillState.gridWidth; j++) {
      const fillCell = this.fillState.grid[i][j]
      if (!fillCell.isLight) {
        continue;
      }
      if (fillCell.solution != '?') {
        fillCell.cChoices = {};
        fillCell.cChoices[fillCell.solution] = true;
        fillCell.viability = 1.0;
      } else {
        fillCell.cChoices = exetLexicon.letterSet;
        fillCell.viability = 5.0;
      }
    }
  }
}

/**
 * Fills cChoices and lChoices in exet.fillState.
 */
Exet.prototype.resetViability = function() {
  if (this.autofill) {
    this.autofill.reset('Aborted');
  }
  this.initViability();
  const dontReuse = {};
  this.preflexInUse = {};
  this.fillState.preflexUsed = this.preflexInUse;
  this.fillState.numPreflexUsed = 0;
  for (const ci in this.puz.clues) {
    const theClue = this.puz.clues[ci];
    if (!theClue.solution || theClue.solution.indexOf('?') >= 0) {
      continue;
    }
    const choices = exetLexicon.getLexChoices(theClue.solution, 1, dontReuse,
        this.noProperNouns,
        this.indexMinPop,
        false, this.preflexByLen, this.unpreflexSet,
        this.getLightRegexpC(ci));
    this.fillState.clues[ci].lChoices = choices;
    this.fillState.clues[ci].lRejects = [];
    if (choices.length > 0) {
      const p = choices[0];
      console.assert(p > 0, p);
      this.addToDontReuse(p, dontReuse);
      if (this.preflexSet[p]) {
        this.preflexInUse[p] = true;
        this.fillState.numPreflexUsed++;
      }
    }
  }
  if (this.preflexUsed) {
    this.preflexUsed.innerHTML = (this.fillState.numPreflexUsed > 0) ?
      ('<b>' + this.fillState.numPreflexUsed + '</b>') :
      ('' + this.fillState.numPreflexUsed);
  }
  for (const ci in this.fillState.clues) {
    const theClue = this.fillState.clues[ci];
    if (!theClue.solution || theClue.solution.indexOf('?') < 0) {
      continue;
    }
    theClue.lChoices = exetLexicon.getLexChoices(theClue.solution, 0, dontReuse,
        this.noProperNouns,
        this.indexMinPop,
        this.tryReversals, this.preflexByLen, this.unpreflexSet,
        this.getLightRegexpC(ci));
    theClue.lRejects = [];
  }
  this.updateFillChoices();
  this.updateViablots();
  this.startDeadendSweep();
}

// Helper for fillLight when it needs to do a reversal of a linked
// group. This *only* reverses the order of the lights, not the
// lights themselves.
Exet.prototype.reverseLinkedOrder = function(theClue) {
  const clueAndChildren = [theClue];
  if (!theClue.childrenClueIndices || !theClue.childrenClueIndices.length) {
    return clueAndChildren;
  }
  let newParent = null;
  for (let cci of theClue.childrenClueIndices) {
    newParent = this.puz.clues[cci];
    clueAndChildren.push(newParent);
  }
  console.assert(newParent, theClue);

  newParent.clue = theClue.clue;
  newParent.anno = theClue.anno;
  newParent.parentClueIndex = null;
  const newCh = theClue.childrenClueIndices;
  newCh.pop();
  newCh.reverse();
  newCh.push(theClue.index);
  newParent.childrenClueIndices = newCh;
  newParent.enumLen = theClue.enumLen;
  newParent.fullDisplayLabel = this.puz.clueLabelDisp(newParent);
  newParent.displayLabel = !newParent.reversed ? newParent.label :
                           newParent.fullDisplayLabel;
  for (let i = clueAndChildren.length - 2; i >= 0; i--) {
    const child = clueAndChildren[i];
    child.enumLen = 0;
    child.childrenClueIndices = [];
    child.parentClueIndex = newParent.index;
    child.clue = this.draftClue(child.index);
    child.fullDisplayLabel = this.puz.clueLabelDisp(child);
    child.displayLabel = !child.reversed ? child.label :
                         child.fullDisplayLabel;
    newParent.displayLabel = newParent.displayLabel + ', ' +
        ((child.dir == newParent.dir) && !child.reversed ?
         child.label : child.fullDisplayLabel);
    newParent.fullDisplayLabel = newParent.fullDisplayLabel + ', ' +
                                 child.fullDisplayLabel;
  }
  return clueAndChildren;
}

// ci is normally a light index or empty, but can also be a clue object
// (for the case when clue number may have changed).
Exet.prototype.fillLight = function(idx, ci='', revType=null) {
  let updateIfChanged = false;
  if (!ci && this.puz) {
    ci = this.currClueIndex();
    updateIfChanged = true;
  }
  if (ci instanceof Object) {
    const dir = ci.dir;
    const cells = ci.cells;
    if (!dir || !cells || cells.length < 2) {
      return;
    }
    ci = dir + this.puz.grid[cells[0][0]][cells[0][1]].startsClueLabel;
  }
  if (!ci) {
    return;
  }
  let solution = exetLexicon.getLex(idx);
  let theClue = this.puz.clues[ci];
  let cells = this.puz.getAllCells(ci);
  if (!theClue || !solution ||
      theClue.parentClueIndex ||
      exetLexicon.lexkey(solution).length != cells.length) {
    return;
  }
  // All checks passed!
  let changed = false;
  if (idx < 0) {
    // Need to reverse
    changed = true;
    const clueAndChildren = this.reverseLinkedOrder(theClue);
    for (let c of clueAndChildren) {
      ci = this.reverseLightInner(c);
    }
    // ci is the last one, the new parent.
    theClue = this.puz.clues[ci];
    console.assert(theClue, ci);
    cells = this.puz.getAllCells(ci);
  }
  solution = solution.toUpperCase();
  if (theClue.solution != solution) {
    theClue.solution = solution;
    changed = true;
  }
  let enumStr = '';
  let enumPart = 0;
  let solIndex = 0;
  const solParts = exetLexicon.partsOf(solution);
  for (let i = 0; i < solParts.length; i++) {
    let c = solParts[i];
    if (enumPart > 0 && (c == ' ' || c == '-' || c == '\'')) {
      enumStr += ('' + enumPart + (c == ' ' ? ',' : c));
      enumPart = 0;
    }
    if (exetLexicon.letterSet[c]) {
      enumPart++;
      let cell = cells[solIndex++];
      let gridCell = this.puz.grid[cell[0]][cell[1]];
      if (gridCell.currLetter != c || gridCell.solution != c) {
        gridCell.currLetter = c;
        changed = true;
      }
    }
  }
  if (enumPart > 0) {
    enumStr = enumStr + enumPart;
  }
  if (enumStr) {
    enumStr = '(' + enumStr + ')';
  }
  if (this.requireEnums) {
    const parsedEnum = this.puz.parseEnum(theClue.clue);
    if (parsedEnum.enumStr != enumStr) {
      theClue.clue = theClue.clue.substr(0, parsedEnum.afterClue).trim() +
        ' ' + enumStr;
      changed = true;
    }
  }
  if (changed && updateIfChanged) {
    this.handleGridInput(revType);
  }
}

Exet.prototype.renderMinPop = function() {
  this.minpopInclSpan.innerText = Number(this.indexMinPop - 1).toLocaleString();
  if (this.autofill) {
    this.autofill.reshowSettings();
  }
}

Exet.prototype.renderPreflex = function() {
  /* populate with existing preflex */
  let preflexText = '';
  for (let p of this.preflex) {
    preflexText += '\n';
    preflexText += p;
  }

  /** update various displays */
  if (this.preflexSize) {
    this.preflexSize.innerText = this.preflex.length;
  }
  if (this.preflexSize2) {
    this.preflexSize2.innerText = this.preflex.length;
  }
  if (this.autofill && this.autofill.preflexTotalSpan) {
    this.autofill.preflexTotalSpan.innerText = this.preflex.length;
  }

  /** Apply bolding for preflexInUse */
  const pidOf = {};
  for (let pid in this.preflexSet) {
    pidOf[this.preflexSet[pid]] = pid;
  }
  let preflexHtml = '';
  let preflexTextLen = 0;
  for (let ptext of this.preflex) {
    if (this.preflexInUse[pidOf[ptext]]) {
      preflexHtml += '<b>' + ptext + '</b>\n';
    } else {
      preflexHtml += ptext + '\n';
    }
    preflexTextLen += ptext.length + 1;
  }
  if (preflexHtml != this.preflexInput.innerHTML) {
    delta = preflexTextLen - this.preflexInput.innerText.length;
    this.saveCursor();
    if (delta < 0) {
      this.adjustSavedCursor(delta, delta);
    }
    this.preflexInput.innerHTML = preflexHtml;
    this.restoreCursor();
  }
}

/**
 * Convert preflex texts to lexicon indices in this.preflexSet[].
 * Add unknown words to the lexicon.
 */
Exet.prototype.setPreflex = function(preflex) {
  this.preflex = preflex;
  this.preflexHash = exetRevManager.hashPrefUnpref(preflex);
  this.preflexSet = {};

  while (exetLexicon.lexicon.length > exetLexicon.startLen) {
    exetLexicon.lexicon.pop();
  }
  this.preflexByLen = {};
  for (let ptext of this.preflex) {
    let len = exetLexicon.lexkey(ptext).length;
    let inLexicon = exetLexicon.getLexChoices(ptext, 1, {},
        false, // no proper nouns
        0,  // no index limit
        false, this.preflexByLen, this.unpreflexSet);
    let p = 0;
    if (inLexicon.length > 0) {
      p = inLexicon[0];
    } else  {
      exetLexicon.lexicon.push(ptext);
      p = exetLexicon.lexicon.length - 1;
    }
    if (!this.preflexByLen[len]) this.preflexByLen[len] = [];
    this.preflexByLen[len].push(p);
    this.preflexSet[p] = ptext;
  }
}

Exet.prototype.throttledUpdatePreflex = function() {
  if (this.throttledPreflexTimer) {
    clearTimeout(this.throttledPreflexTimer);
  }
  this.throttledPreflexTimer = setTimeout(() => {
    this.startUpdatePreflex();
    this.throttledPreflexTimer = null;
  }, this.longInputLagMS);
}

/**
 * Clean preflex entries, delete any dupes, then call call
 * updatePreflexStep()
 */
Exet.prototype.startUpdatePreflex = function() {
  this.updatePreflexState = {
    preflexes: this.preflexInput.innerText.trim().split('\n'),
    preflex: [],
    seen: {},
    ctr: 0,
    step: 200,
    waitMS: 200,
    timer: null,
  };
  this.preflexWait.style.display = '';
  this.updatePreflexStep();
}

/**
 * Clean preflex entries, delete any dupes, then call setPreflex()
 * and resetViability(), and update preflex display.
 */
Exet.prototype.updatePreflexStep = function() {
  if (!this.updatePreflexState) {
    return;
  }
  const state = this.updatePreflexState;
  const limit = Math.min(state.preflexes.length, state.ctr + state.step);

  while (state.ctr < limit) {
    const ptext = state.preflexes[state.ctr++].trim();
    if (!ptext || ptext.startsWith('#')) continue;
    const hash = exetLexicon.javaHash(ptext.toLowerCase());
    if (state.seen[hash]) continue;
    state.seen[hash] = true;
    state.preflex.push(ptext);
    if (state.preflex.length >= this.MAX_PREFLEX) {
      state.ctr = state.preflexes.length;
      break;
    }
  }
  if (state.ctr >= state.preflexes.length) {
    this.finishUpdatePreflex();
  } else {
    state.timer = setTimeout(() => {
      this.updatePreflexStep();
    }, state.waitMS);
  }
}

Exet.prototype.dismissPreflexWait = function() {
  this.preflexWait.style.display = 'none';
}

/**
 * Call setPreflex() and resetViability(), update preflex display,
 * save state.
 */
Exet.prototype.finishUpdatePreflex = function() {
  this.setPreflex(this.updatePreflexState.preflex);
  this.resetViability();
  this.renderPreflex();
  this.dismissPreflexWait();
  this.updatePreflexState = null;
  exetRevManager.throttledSaveRev(exetRevManager.REV_PREFLEX_CHANGE);
}

Exet.prototype.throttledUpdateUnpreflex = function() {
  if (this.throttledUnpreflexTimer) {
    clearTimeout(this.throttledUnpreflexTimer);
  }
  this.throttledUnpreflexTimer = setTimeout(() => {
    this.updateUnpreflex()
    this.throttledUnpreflexTimer = null;
  }, this.longInputLagMS);
}

Exet.prototype.renderUnpreflex = function() {
  let unpreflexText = '';
  for (let w of this.unpreflex) {
    if (unpreflexText) unpreflexText += '\n';
    unpreflexText += w;
  }
  if (this.unpreflexInput.value != unpreflexText) {
    this.saveCursor();
    this.unpreflexInput.value = unpreflexText;
    this.restoreCursor();
  }
  this.unpreflexSize.innerText = this.unpreflex.length;
}

/**
 * The input is an array of strings.
 */
Exet.prototype.setUnpreflex = function(unpreflex) {
  const cleanedUnpreflex = [];
  const unpreflexSet = {};
  for (const uw of unpreflex) {
    const w = uw.trim();
    if (!w || w.startsWith('#')) continue;
    const wClean = exetLexicon.depunct(w);
    if (!wClean) continue;

    cleanedUnpreflex.push(w);
    const inLexicon = exetLexicon.getLexChoices(wClean, 1, {},
        false,  // no proper nouns
        0,  // no index limit
        false, this.preflexByLen);
    if (inLexicon.length != 1) {
      continue;
    }
    unpreflexSet[inLexicon[0]] = true;
  }
  if (JSON.stringify(this.unpreflex) == JSON.stringify(cleanedUnpreflex)) {
    return;
  }
  this.unpreflex = cleanedUnpreflex;
  this.unpreflexSet = unpreflexSet;
  this.unpreflexHash = exetRevManager.hashPrefUnpref(this.unpreflex);
}

Exet.prototype.updateUnpreflex = function() {
  const unpreflex = this.unpreflexInput.value.trim().split('\n');
  this.setUnpreflex(unpreflex);
  this.unpreflexSize.innerText = this.unpreflex.length;
  this.resetViability();
  exetRevManager.throttledSaveRev(exetRevManager.REV_PREFLEX_CHANGE);
}

Exet.prototype.numEnumPunctMatches = function(p, e) {
  let num = 0;
  let minl = Math.min(p.length, e.length);
  for (let i = 0; i < minl; i++) {
    if (p[i] != '?' && p[i] == e[i]) num++;
    if (p[i] == '?' && !exetLexicon.letterSet[e[i].toUpperCase()]) num--;
  }
  return num;
}

Exet.prototype.enumMatchSorter = function(p, k1, k2) {
  const entry1 = exetLexicon.getLex(k1);
  const entry2 = exetLexicon.getLex(k2);
  return this.numEnumPunctMatches(p, entry2) -
         this.numEnumPunctMatches(p, entry1);
}

Exet.prototype.choiceDisplayHTML = function(choice) {
  const absC = Math.abs(choice);
  const cls = this.preflexSet[absC] ? ' class="xet-preflex-entry"' : '';
  const rev = (choice < 0) ? '&lArr; ' : '';
  return `
    <tr><td${cls}>${rev}${exetLexicon.getLex(choice)}</td></tr>`;
}

Exet.prototype.updateFillChoices = function() {
  let ci = this.currClueIndex();
  if (!ci) {
    return
  }
  let gridClue = this.puz.clues[ci]
  let theClue = this.fillState.clues[ci]
  console.assert(theClue && theClue.lChoices, ci)

  let html = ''
  if (theClue.lChoices.length == 0) {
    // Maybe the light was filled from outside the lexicon
    if (gridClue.solution.indexOf('?') < 0) {
      html = `<tr><td>${gridClue.solution}</td></tr>`
    }
  }

  let lChoices = theClue.lChoices;
  let lRejects = theClue.lRejects;
  if (gridClue.placeholder && gridClue.enumLen &&
      gridClue.placeholder.length > gridClue.enumLen) {
    // Move up choices that match the specified enum
    lChoices = theClue.lChoices.slice(0, theClue.lChoices.length);
    lChoices.sort(this.enumMatchSorter.bind(this, gridClue.placeholder));
    lRejects = theClue.lRejects.slice(0, theClue.lRejects.length);
    lRejects.sort(this.enumMatchSorter.bind(this, gridClue.placeholder));
  }

  let numShown = 0
  for (const choice of lChoices) {
    html += this.choiceDisplayHTML(choice);
    numShown++;
    if (numShown >= this.shownLightChoices) break;
  }

  let htmlRej = ''
  let numRejects = 0
  for (const choice of lRejects) {
    htmlRej += this.choiceDisplayHTML(choice);
    numRejects++;
    if (numRejects >= this.shownLightChoices) break;
  }

  const htmlHash = exetLexicon.javaHash(html + htmlRej + ci);
  if (this.shownChoicesHash && this.shownChoicesHash == htmlHash) {
    return;
  }
  this.shownChoicesHash = htmlHash;
  this.lChoices.innerHTML = html;
  this.lRejects.innerHTML = htmlRej;
  let trs = this.lChoices.getElementsByTagName('tr');
  let lim = Math.min(lChoices.length, trs.length);
  for (let i = 0; i < lim; i++) {
    trs[i].addEventListener(
    'click', this.fillLight.bind(this, lChoices[i], '',
                                 exetRevManager.REV_GRIDFILL_CHANGE));
  }
  trs = this.lRejects.getElementsByTagName('tr');
  lim = Math.min(lRejects.length, trs.length);
  for (let i = 0; i < lim; i++) {
    trs[i].addEventListener(
    'click', this.fillLight.bind(this, lRejects[i], '',
                                 exetRevManager.REV_GRIDFILL_CHANGE));
  }
}

Exet.prototype.warnVersion = function(ver) {
  const about = document.getElementById("xet-about");
  about.style.color = "red";
  about.title = 'Please reload to update to ' + ver;
  const warnMsg = document.getElementById("xet-outdated-message");
  warnMsg.innerHTML = 'Please <a href=' +
    '"javascript:window.location.reload(true)">reload</a> to update to ' + ver;
  warnMsg.style.display = '';
  const warnIcon = document.getElementById("xet-outdated");
  warnIcon.style.display = '';
}

Exet.prototype.checkVersion = function() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4) {
      let now = (new Date()).toLocaleString()
      if (this.status < 200 || this.status > 299) {
        console.log(now + ": Version check request failed")
        return
      }
      let ver = this.responseText.trim()
      if (!exet.versionText) {
        exet.versionText = ver
        console.log(now + ": Initialized Exet version to " + ver)
      } else if (ver != exet.versionText) {
        exet.warnVersion(ver)
        console.log(now + ": Exet version: " + exet.versionText +
                    " needs update to: " + ver)
      } else {
        console.log(now + ": Exet version verified to be current: " + ver)
      }
    }
  };
  xhttp.open("GET", "exet-version.txt", true);
  xhttp.send();
}

Exet.prototype.getLocalStorageUsed = function() {
  let s = 0;
  for (let idx = 0; idx < window.localStorage.length; idx++) {
    const id = window.localStorage.key(idx);
    s += window.localStorage.getItem(id).length;
  }
  return s;
}

Exet.prototype.getLocalStorageLeft = function() {
  let k500 = '1234567812345678';
  while (k500.length < 500000) {
    k500 = k500 + k500;
  }
  const tempKey = '42-exet-cap-42-';
  const limit = 20;
  let s = 0;
  for (let i = 0; i < limit; i++) {
    // Only count up to 10 MB
    try {
      window.localStorage.setItem(tempKey + i, k500);
      s += k500.length;
    } catch (err) {
      break;
    }
  }
  for (let i = 0; i < limit; i++) {
    window.localStorage.removeItem(tempKey + i);
  }
  return s;
}

Exet.prototype.inMB = function(num) {
  return (num / 1000000).toFixed(2)
}

Exet.prototype.checkLocalStorage = function() {
  this.lsUsed = this.getLocalStorageUsed();
  if (this.lsUsedAtStart < 0) {
    this.lsUsedAtStart = this.lsUsed;
    this.lsLeftAtStart = this.getLocalStorageLeft();
  }
  const lsFree = this.lsUsedAtStart + this.lsLeftAtStart - this.lsUsed;
  this.lsUsedSpan.innerText = this.inMB(this.lsUsed);
  this.lsFreeSpan.innerText = this.inMB(lsFree);
  const oldWasAmple = this.lsLeftIsAmple;
  this.lsLeftIsAmple = (lsFree > 50000);
  this.lsFreeSpan.style.color = this.lsLeftIsAmple ? 'inherit' : 'red';
  if (this.lsLeftIsAmple && !oldWasAmple) {
    exetRevManager.saveRev(exetRevManager.REV_RESAVE);
  }
  return this.lsLeftIsAmple;
}

Exet.prototype.checkBackup = function() {
  const backupTime = document.getElementById("xet-last-backup-time");
  backupTime.innerHTML = (new Date(exetState.lastBackup)).toLocaleString();
  /** 7 days check */
  const isRecent = ((Date.now() - exetState.lastBackup) <= (7 * 86400000));
  const backupElem = document.getElementById("xet-last-backup");
  backupElem.style.color = isRecent ? 'inherit' : 'red';
  return isRecent;
}

/**
 * Returns the status from checkLocalStorage()
 */
Exet.prototype.checkStorage = function() {
  const warnings = [];
  const backupOK = this.checkBackup();
  if (!backupOK) {
    warnings.push('Last back-up is quite stale, please save a new one.');
  }
  const lsOK = this.checkLocalStorage();
  if (!lsOK) {
    warnings.push('Local Storage is running low, please delete some older puzzle revisions.');
  }
  if (warnings.length > 0) {
    this.storageHeading.style.color = 'red';
    this.storageHeading.title = warnings.join(' ');
  } else {
    this.storageHeading.style.color = 'inherit';
    this.storageHeading.title = 'Manage local storage, back up crosswords to file.';
  }
  return lsOK;
}

Exet.prototype.periodicChecks = function() {
  if (window.location.protocol != "file:") {
    this.checkVersion();
  }
  this.checkStorage();
}

Exet.prototype.finishSetup = function() {
  this.versionText = '';
  this.periodicChecks();
  /** Check every 10 minutes */
  setInterval(this.periodicChecks.bind(this), 10 * 60 * 1000);

  window.addEventListener('scroll', this.reposition.bind(this));
  window.addEventListener('resize', this.reposition.bind(this));

  const formatRevealer = this.maybeShowFormat.bind(this);
  document.addEventListener('selectionchange', formatRevealer);

  /**
   * Override the browser's Save function.
   */
  document.addEventListener("keydown", function(e) {
    if ((e.metaKey || e.ctrlKey) && e.code === "KeyS") {
      e.preventDefault();
      exet.download(true);
    }
  });
}

function exetFromHistory(exetRev) {
  exet.prefix = exetRev.prefix;
  exet.suffix = exetRev.suffix;
  exetRevManager.retrievePrefUnpref(exetRev);
  exet.setMinPop(exetRev.minpop || 0);
  exet.noProperNouns = exetRev.noProperNouns || false;
  exet.asymOK = exetRev.asymOK || false;
  exet.tryReversals = exetRev.tryReversals || false;
  exet.lightRegexps = exetRev.lightRegexps || {};
  exet.compileLightRegexps();
  exet.makeExolve(exetRev.exolve);
  if (!exet.puz) {
    alert('Could not load puzzle from history, reverting to a new blank puzzle');
    exetBlank(exetConfig.defaultDimension, exetConfig.defaultDimension);
    return;
  }
  exet.requireEnums = !exetRev.hasOwnProperty('requireEnums') ?
      exet.puz.allCluesHaveEnums : exetRev.requireEnums;
  if (exetRev.navState) {
    exet.startNav(exetRev.navState[0],
                  exetRev.navState[1], exetRev.navState[2])
  } else {
    exet.startNav()
  }
  if (exetRev.scratchPad && exet.puz.scratchPad) {
    exet.puz.scratchPad.value = exetRev.scratchPad
  }
  if (exetRev.revNum < exetRev.maxRevNum) {
    exetRevManager.throttledSaveRev(exetRevManager.REV_JUMPED_TO_REV,
                                    '' + exetRev.revNum);
  }
}

function exetBlank(w, h, layers3d=1, id='', automagic=false,
                   chequered=true, topUnches=false, leftUnches=false,
                   requireEnums=true) {
  if (!w || !h || w <= 0 || h <= 0 || w > 100 || h > 100) {
    alert('Width and height must be specified in the range, 1-100');
    return;
  }
  if (!id) {
    id = `xet-${Math.random().toString(36).substring(2, 8)}`;
  }

  let gridRow = ['', ''];
  for (let j = 0; j < w; j++) {
    if (chequered) {
      if (!topUnches && !leftUnches) {
        gridRow[0] = gridRow[0] + '? ';
        gridRow[1] = gridRow[1] + (j % 2 == 0 ? '? ' : '. ');
      } else if (!topUnches && leftUnches) {
        gridRow[0] = gridRow[0] + '? ';
        gridRow[1] = gridRow[1] + (j % 2 == 0 ? '. ' : '? ');
      } else if (topUnches && !leftUnches) {
        gridRow[0] = gridRow[0] + (j % 2 == 0 ? '? ' : '. ');
        gridRow[1] = gridRow[1] + '?';
      } else if (topUnches && leftUnches) {
        gridRow[0] = gridRow[0] + (j % 2 == 0 ? '. ' : '? ');
        gridRow[1] = gridRow[1] + '? ';
      }
    } else {
      gridRow[0] = gridRow[0] + '? ';
      gridRow[1] = gridRow[1] + '? ';
    }
  }

  let grid = '';
  let thirdDSpec = '';
  let acrossLine = 'exolve-across:';
  let downLine = 'exolve-down:';
  if (layers3d == 1) {
    for (let i = 0; i < h; i++) {
      grid = grid + '\n  ' + gridRow[i % 2];
    }
  } else {
    if (layers3d <= 0 || h % layers3d != 0) {
      alert("#layers in 3-D crosswords must be a positive divisor of height");
      return;
    }
    acrossLine = 'exolve-3d-across:';
    downLine = 'exolve-3d-away:';
    thirdDSpec = `\n    exolve-3d-down:\n    exolve-3d: ${layers3d}`;
    let darkRow = '';
    for (let j = 0; j < w; j++) darkRow += '. ';
    const lh = h / layers3d;
    for (let i = 0; i < h; i++) {
      const l = Math.floor(i / lh);
      const li = (lh - 1) - (i % lh);
      if (l % 2 == 0) {
        grid = grid + '\n  ' + gridRow[li % 2];
      } else {
        if (li % 2 == 0) {
          grid = grid + '\n  ' + gridRow[1];
        } else {
          grid = grid + '\n  ' + darkRow;
        }
      }
    }
  }

  let specs = `exolve-begin
    exolve-id: ${id}
    exolve-title: Crossword
    exolve-setter: Exetter
    exolve-language: ${exetLexicon.language} ${exetLexicon.script} ${exetLexicon.maxCharCodes}
    exolve-width: ${w}
    exolve-height: ${h}
    exolve-grid: ${grid}
    ${acrossLine}
    ${downLine}
    ${thirdDSpec}
  exolve-end
  `;
  exet.prefix = '';
  exet.suffix = '';
  exet.setPreflex([]);
  exet.setUnpreflex([]);
  exet.setMinPop(exet.DEFAULT_MINPOP);
  exet.noProperNouns = false;
  exet.asymOK = false;
  exet.requireEnums = requireEnums;
  exet.tryReversals = layers3d > 1 ? true : false;
  exet.lightRegexps = {};
  exet.compileLightRegexps();
  exet.makeExolve(specs);
  if (!exet.puz) {
    alert('Failed to create a blank crossword, unfortunately! Perhaps the ' +
          'JavaScript console may have logged some error messages.');
    return;
  }
  exet.startNav();

  if (automagic && exet.automagicBlocks(false)) {
    exet.updatePuzzle(exetRevManager.REV_CREATED_AUTOBLOCK);
    return;
  }
  exetRevManager.throttledSaveRev(exetRevManager.REV_CREATED_BLANK);
}

function exetBlank3D(w3d, h3d, d3d, id='') {
  if (w3d <= 0 || h3d <= 0 || d3d <= 0 ||
      w3d % 2 != 1 || h3d % 2 != 1 || d3d % 2 != 1) {
    alert("All dimensions in 3-D crosswords should be positive odd numbers");
    return
  }
  return exetBlank(w3d, h3d * d3d, h3d, id);
}

function exetLoadFile() {
  let fr = new FileReader(); 
  fr.onload = function(){ 
    const buffer = fr.result;
    const utf8decoder = new TextDecoder();
    const decodedBuffer = utf8decoder.decode(buffer);
    let exolve = decodedBuffer;
    let start = exolve.indexOf('exolve-begin');
    if (start < 0) {
      /* Try parsing as .puz */
      exolve = exolveFromPuz(buffer, exet.exolveFile);
      start = exolve.indexOf('exolve-begin');
    }
    if (start < 0) {
      /* Try parsing as .ipuz */
      try {
        const ipuz = JSON.parse(decodedBuffer);
        exolve = exolveFromIpuz(ipuz, exet.exolveFile);
      } catch (err) {
      }
      start = exolve.indexOf('exolve-begin');
    }
    let end = exolve.indexOf('exolve-end');
    if (start < 0 || end < 0 || start >= end) {
      alert('Invalid Exolve/.puz/.ipuz specifications');
      return;
    }
    end += 'exolve-end'.length;
    exet.prefix = exolve.substring(0, start).trim();
    exet.suffix = exolve.substring(end).trim();
    exet.exolveOtherSec = '';
    let specs = exolve.substring(start, end);
    exet.setPreflex([]);
    exet.setUnpreflex([]);
    exet.setMinPop(0);  // Do not presume: there may be filled entries!
    exet.noProperNouns = false;
    exet.asymOK = false;
    exet.tryReversals = false;
    exet.lightRegexps = {};
    exet.compileLightRegexps();
    exet.makeExolve(specs);
    if (!exet.puz) {
      alert('Could not load Exolve puzzle from file, reverting to a new blank puzzle');
        exetBlank(exetConfig.defaultDimension, exetConfig.defaultDimension);
      return;
    }
    exet.requireEnums = exet.puz.allCluesHaveEnums;
    exet.startNav();
    let stored = window.localStorage.getItem(exet.puz.id);
    if (stored) {
      stored = JSON.parse(stored);
      if (stored.revs.length > 0) {
        const lastRev = stored.revs[stored.revs.length - 1];
        exetRevManager.retrievePrefUnpref(lastRev);
        exet.setMinPop(lastRev.minpop || 0);
        exet.noProperNouns = lastRev.noProperNouns || false;
        exet.asymOK = lastRev.asymOK || false;
        exet.tryReversals = lastRev.tryReversals || false;
        exet.lightRegexps = lastRev.lightRegexps || {};
        exet.compileLightRegexps();
      }
    } else {
      if (exet.puz.layers3d > 1) {
        exet.tryReversals = true;
      }
    }
    exetRevManager.throttledSaveRev(
        exetRevManager.REV_LOADED_FROM_FILE, exet.exolveFile);
  } 
  let f = document.getElementById('xet-file').files[0];
  exet.exolveFile = f.name;
  fr.readAsArrayBuffer(f);
}

let exetRevManager;
let exetModals;
let exetState;
let exet;

document.addEventListener('DOMContentLoaded', () => {
  const xetLoading = document.getElementById('xet-loading');
  if (!exetLexicon) {
    xetLoading.innerHTML = '<div class="xet-red"><h3>Failed to load the lexicon :-(</h3></div>';
    throw "No lexicon has been loaded!"
  }
  xetLoading.remove();

  exetLexiconInit();

  exetRevManager = new ExetRevManager();
  exetModals = new ExetModals();
  if (!window.localStorage) {
    throw "localStorage is not available!"
  }

  exet = new Exet();

  exetState = window.localStorage.getItem(exetRevManager.SPECIAL_KEY);
  if (exetState) {
    exetState = JSON.parse(exetState)
  } else {
    exetState = {};
  }
  if (!exetState.hasOwnProperty('exolveUrl')) {
    exetState.exolveUrl = 'https://viresh-ratnakar.github.io/'
  }
  if (!exetState.hasOwnProperty('spellcheck')) {
    exetState.spellcheck = false;
  }
  if (!exetState.hasOwnProperty('lastBackup')) {
    exetState.lastBackup = Date.now();
  }
  if (exetState.lastId) {
    let saved = window.localStorage.getItem(exetState.lastId);
    if (saved) {
      saved = JSON.parse(saved);
      if (saved.revs.length > 0) {
        exetFromHistory(saved.revs[saved.revs.length - 1]);
      }
    }
  }
  if (!exet.puz) {
    let url = new URL(location.href)
    let newgrid = url.searchParams.get('newgrid')
    if (newgrid == 'blank') {
      exetBlank(exetConfig.defaultDimension, exetConfig.defaultDimension, 1, '', false, false)
    } else {
      exetBlank(exetConfig.defaultDimension, exetConfig.defaultDimension, 1, '', true, true)
    }
  }
  exet.finishSetup()
});
