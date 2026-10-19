- [ ] Bolding in preflex has disappeared??
- [ ] Copy preflex to the next revision if it doesn't have it. Encode preflex incremetally to save space.
- [ ] Option to limit "s"-ending entries.
- [ ] Better support for US-style enum-free puzzles. Remove the "show enums" save option (use xlv.hasEnums)
- [ ] Use tentative (gray) entries in all wordplay and research (can be useful to judge whether to accept or not).
- [ ] Detect through-cuts for each quadrant too
- [ ] Custom lexicons
    - Store each one in indexedDB, also store the default lufz lexicon. What gets stored
      is basically all the info in lufz\*.js.
    - To compute this stuff, we use a background Worker thread
    - So, before we can read a new custom lexicon from a file, we need the Worker to
      be ready. It is told to load the default and then it signals when it has it
      loaded. Meanwhile, the main thread stores the unindexed lexicon and scores in
      the indexedDB. Then it tells the worker thread. Finally, the worker thread
      communicates back to the main thread that it has stored the full data.
    - Then (and in general, to load a lexicon that is fully baked in indexedDB),
      the main thread simply reads it and calls exetLexiconInit().
    - Before starting the worker thread, the main thread stores the default lexicon
      into the db if the version there is stale.
- [ ] Code docs/cleanups
  - [ ] Move all styling to CSS
  - [ ] Make README.md more complete
- [ ] Option for US dictionary
- [ ] "Smart-delete" to purge excessive revisions: save revisions and keep just last 5 of each
- [ ] exetLexicon: add feature to constrain certain letters to be the same, when matching a pattern. Use this when a linked clue crosses itself.
- [ ] make about-exet.html link use the base of exet.js
- [x] Stricter grid connectivity checks
- [x] Improve autofill
- [x] Highlight preferred fills that get picked
- [x] Clue length analysis
- [x] ClueBox/clueparentbox difference review
- [x] Nina dialog position is weird now
- [x] Linking block does not show up: it's attached to earlu to cur-clue which gets changed later. need to attach it to a more stable parent
- [x] Slowness in "add block"
- [x] Pick previous version not working
- [x] When the clue has an enum like (4-3), prefer fill choices consistent with that: so, (2-2-3) will also OK, and for (9), (4,5) will also be OK.
- [x] Show unches distribution [Instead, done: Show warning in analysis]
- [x] Reassign clue numbers, preserving clues if possible
- [x] Intercept ctrl-q/Q before they reach Exolve
- [x] Bulk-save
- [x] Check why * after enum disappears when a file with enums hidden is loaded
- [x] Is enum hiding working in print/pdf?
- [x] Don't use cookie-saved state
- [x] Track used words
- [x] Auto-fill
- [x] For filled lights, make sure the filled entry is shown in the choices panel (perhaps distinguishing out-of-lexicon entries, preflex entries)
- [x] Reset light-fill suggestions shown when you go to a filled light
- [x] Add preferred words
- [x] When restoring an accidentally mangled enum, go back to what it was (so, (2,3) instead of (5), if (2,3) was in place).
- [x] Persist scratchpad contents
- [x] Write .puz
- [x] Copy widget html
- [x] Save w/o solutions
- [x] Edit metadata
- [x] Specify id for new puzzles
- [x] Tabular choosers
- [x] Controls for grid changes
- [x] Enum change check
- [x] Clear-all should clear hyphens etc. [unnecessary, now that enum-editing works and fillLight() does the right thing]
- [x] Open menus only with clicks, not with hovers
- [x] Load the most recent puzzle on start-up
- [x] When a particular choice leads to purples, move it to deadends
- [x] Let users manage local storage used
  - [x] Delete specific revisions
