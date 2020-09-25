# Changelog

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


