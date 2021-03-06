# Changelog

### Version: Exet v0.32 March 6 2021

- Keep track of clues in [DRAFT] mode, which is the default for a new grid
  or a cleared light. A [DRAFT] button is shown when editing the current
  clue, and it can be clicked to toggle draft mode for that clue. Clues in
  draft mode also get their clue number shown in gray in the list of clues. 
- The "Save" menu shows warnings when the crossword has unfilled lights or
  has clues still in draft mode.
- Some other minor tweaks.

### Version: Exet v0.31 February 26 2021

- Add menu entries to (1) save entire local storage revision history to a file,
  and (2) merge revision history from a file saved like this. Useful for
  back-up as well as transferring to a different computer.
- Make puzzle id visible under the grid.
- Add exolve-maker sections to puzzles saved as Exolve.
- Recover enums from loaded Exolve files where enums have been suppressed using
  asterisks.
- Bug-fix: revision wasn't getting saved after fillLight()'s grid-fill change.
- Bug-fix: when reading an exolve file with missing clues/enums, updatePuzzle()
  was getting too soon—before `otherSections` had been set.
- Add several new reference lists as well as the Onelook dictionary.

### Version: Exet v0.30 February 15 2021

- A recent Chrome update makes the cursor jump to the start after a
  clue span's innerText is set. Work around that by saving the cursor
  position and restoring it.
- Bug fix: new blank puzzles were getting prefix/suffix carried over
  from the last exolve file loaded. Reset them to blank.

### Version: Exet v0.29 February 11 2021

- CSS tweaks to get things to look OK in Firefox.

### Version: Exet v0.28 February 10 2021

- Add support for printing/saving as PDF.
- Minor CSS tweaks.

### Version: Exet v0.27 January 22 2021

- Add support for linked clues. You can create linked clues and you can
  break up an existing group of linked clues. The interface for these actions
  is brought up by clicking on the clue number of the current clue above the
  grid.

### Version: Exet v0.26 January 20 2021

- Allow individual "Toggle block/bar" actions to temporarily suspend symmetry
  enforcement.
- Do not clutter up Exolve's local storage by saving state there (Exet
  revisions anyway save state).
- Slightly increase the weight of grid fullness in autofill.

### Version: Exet v0.25 December 18 2020

- Actually use iso-8859-1 encoding (as required by the format) for .puz files.

### Version: Exet v0.24 December 15 2020

- Bug fix in saving .puz: circles section header (GEXT) wasn't getting written.
- Avoid fancy quotes/emdash/ellipsis when saving as .puz.
- Saving options added:
  - Skip enums
  - Specify URL prefix for exolve files.

### Version: Exet v0.23 November 19 2020

- Add an Exet > Analysis tab. Clicking on this shows an analysis of the
  grid, the grid-fill, and the clues.
  - The analysis catches things like consecutive unches in the grid,
    repetitions of words in clues, etc. It can be sliced by All/Across/Down
    clues.
  - The "anno" stats try to enmerate various clue types. Unfortunately,
    there's no widely accepted  standard for specifying annos that I know of.
    So, these stats are biased towards parsing how *I* specify annos, for now.
    If you want this to be useful, please mimic my anno style :-) or give me
    better ideas.
  - Stats are shown as bar graphs. Hovering over the bars shows details
    (for example, the specific clue numbers that have that stat value).
- Alert instead of console.log(), on unsupported grids such as diagramless ones.
- Consolidate dictionaries under a single tab. Add Chambers.
- Move anagrams and alternations to separate tabs. And to the alternations tab,
  add reversed alternations as well.
- Show an alert confirming that widget code has been copied to the clipboard,
  when the user clicks on the menu options for that.
- Add the puzzle title to downloaded file names.
- Slightly reduce the probability of automagic blocking not adding a block at
  all to a row/col span.
- When creating the very first grid (or otherwise having no previous grid to
  load), add automagic blocks to chequered templates.
- Change default puzzle title to just "Crossword" instead of "Exet Crossword."

### Version: Exet v0.22 October 23 2020

- Argh, roll-back the cache-busting in v0.21. Had jumped the gun because
  v0.20 version-check was seemingly not working, but had never actually
  pushed it to serving!

### Version: Exet v0.21 October 23 2020

- Add a cache-busting random query string to the version-check request.
- Reduce version-checking frequencey from 10min to 30min

### Version: Exet v0.20 October 23 2020

- Minor style changes (avoid red/blue text in preflex panels, color the Pause
  button reddish in the autofill panel, etc.).
- Allow restricting to top k words by popularity.
- Correctly set preflex settings in the autofill panel, after they change.
- After clicking 'Start' in autofill, let UI update before starting
  computations.

### Version: Exet v0.19 October 20 2020

- Bugfix: unpreflex update was buggy.

### Version: Exet v0.18 October 19 2020

- Improve beamsearch scoring: essentially use sum of log probs, treating
  each cell viability as an independent probability. But add a heavy boost
  for completed fraction.
- With the improved scoring, preflex fills is working much better now,
  after some more changes in this version: use a preliminary phase where
  we just try to place each preflex entry somewhere.
- "Try to get a pangram" is not really working. Take it out of scoring
  and just move to using some heuristics. Will try to improve later.
- Add a file called exet-version.txt and enable periodic version checking,
  along with a prompt to reload to update older versions.

### Version: Exet v0.17 October 19 2020

- Turn off chosing entire lights in the autofill beam search for now.
  It works much better like this for American-style grids and for
  barred grids.

### Version: Exet v0.16 October 18 2020

- Add autofill using beam search.
  - Current best candidate is displayed as we go along
  - Alternate between making choices for lights vs cells (lights every
    4th step)
  - Try to prefer any "preferred words/phrases" provided by having an
    initial phase where we try to make choices for lights compatible
    with some preferred words. Note that preferred words appear ahead
    of other in computed lists of choices.
- Add "undesired fills"
- Add option to allow/disallow proper nouns.
- Apart from passing "clear curr" and "clear all" to Exolve, also
  take the implied actions in Exet.

### Version: Exet v0.15 September 30 2020

- In "add automagic blocks", NYT-style grids created were mostly leaving
  long full-length column lights with no blocks in the 2nd and 3rd
  columns. Made a couple of changes to reduce that (increased probability
  of creating a block when there is only one choice in a row/col, and
  alternate between rows and cols).

### Version: Exet v0.14 September 29 2020

- Add the ability to specify a set of words/phrases (up to 100) to prefer
  for filling the grid (referred to below as "preflex").
- The preflex is saved in the revisions. If you save to an exolve file and
  you load that file later, the preflex is taken from the last revision.
- The preflex can be modified at any time. A status message shows how many
  words it has and how many of those are used in the grid.
- Remove words already used in the grid from suggestions for other lights.
- When editing the enum, if you make a mistake and provide an enum that
  does not add up to the right number of cells, the previous buggy behaviour
  was to reset it to "(#)" (with # being the total number of cells). Now
  fixed to reset it to whatever it was, before getting mangled (so, we do
  not turn something like "(1,8)" into "(9)" when we accidentally edit it.

### Version: Exet v0.13 September 26 2020

- Add options to "add automagic blocks" (with randomization). This can be
  checked/unchecked when creating a new blank puzzle (checked by defualt) and
  can also be invoked at any time from the Edit menu.
- If the starting point is an American-style blocked grid (every white
  square is checked across as well as down), then that property is maintained.
- Else if the starting point is a British-style blocked grid (chequered,
  and no consecutive unchecked cells), then that property is maintained.
- Display across and down clue counts.

### Version: Exet v0.12 September 24 2020

- Add "Manage storage" menu option.
- When selecting puzzle IDs and revisions, fix the non-intuitive behaviour
  that we had where you could select a row and still hovering over another
  row would highlight it in green.
- Show sizes used for all puzzles as well as total storage used/free.

### Version: Exet v0.11 September 20 2020

- Do not show "deadend" light choices in magenta anymore. We now load
  all possible light choices and weed them out, so the deadends list
  might become too long.
- Show a flashing viablot-like indicator at the bottom right just under
  the grid when Exet is doing a sweep to weed out non-viable grid-fill
  suggestions.
- Show puzzle titles in the dialog to open a previous crossword.
- Use a grid-cell-based viability value directly, using the # of possible
  letter choices, instead of deriving it from a light-based scheme.
- If light choices for a light are exactly the same as its last set,
  after some part of the background sweep, do not change the innerHTML
  of the light choices box (to avoid losing clicks).
- Display the current lexicon id.
- When an unfilled grid cell has exactly one possible choice, show
  that forced letter in gray.
- Add a control ('=', also in the Edit menu) to accept all forced letters
  shown.
- Lots of changes to the background sweep to compute viability and to
  update grid-fill suggestions:
  - Do some look-ahead in the current clue.
  - Chunk all the work better to make the UI responsive.
  - Do not consider filled cells/lights (they might have been filled
    out-of-lexicon).
  - Limit the # of light choices looked at.
  - End the sweep when some unfillable cells are found (rather than
    continuing and marking all remaining cells unfilled).

### Version: Exet v0.10 September 19 2020

- Mainly CSS changes, make the panels not move around, limit scroll bars, etc.
- Scroll to the current clue in the clues list.

### Version: Exet v0.09 September 18 2020

- Bug-fix: strip any newlines entered in clue/anno/title/setter/copyright.

### Version: Exet v0.08 September 17 2020

- Remember what was open in the "inds" tab when updating the puzzle,
  and return to that if the inds tab is the current tab.

### Version: Exet v0.07 September 17 2020

- Handle searching for anagrams natively now. So, charades also include
  anagrams and the composite anagram panel now does not use Nutrimatic.

### Version: Exet v0.06 September 17 2020

- Added a tab to show candidate charades and containers. Had to make it
  do its work in throttled chunks.

### Version: Exet v0.05 September 16 2020

- Replace the Composite Anagrams iframe with a more native
  implementation similar to http://martindemello.net/wgn.html (except
  with added Nutrimatic anagrams of the unused and extra parts).

### Version: Exet v0.04 September 15 2020

- Add a url param called newgrid. If set to 'blank' and there is no
  previous grid, start with a blank 15x15 grid instead of a blocked one.
  the exet.html?newgrid=blank URL will be useful for new users who might
  look to create US-style (non-"chequered") blocked grids.

### Version: Exet v0.03 September 15 2020

- Persist scratchpad contents across edits.
- Don't reload a tabbed iframe if the param does not change.
- Make the displayed URLd for tabbed iframes be links that
  open in a new tab.

### Version: Exet v0.02 September 14 2020

- Use icons for new blank grid templates.
- Add a "composite anagram" link, but pack it into the anagrams/alternations
  tab. Also generalize the tabs to allow packing more links.
- Add target="\_blank" to all links in about-exet.html (as it is shown in
  an iframe).

### Version: Exet v0.01 September 13 2020

- localStorage might contain junk for a website (as I discovered when I
  hosted on my github site). Need to parse the stored value to check if
  it's an Exet saved revision.

### Version: Exet v0.00 September 13 2020

- First check-in. Exet aims to be a state-of-the-art free open source
  web app for creating crosswords.


