# Changelog

### Version: Exet v0.90, December 5, 2023

- In the "Analysis" panel, also show a histogram of duplicated substrings
  of length 3 or longer in solution entries.

### Version: Exet v0.89, November 25, 2023

- Make the RHS of the UI responsive, adapting to the available height.
- This is done by making a few containers inside the RHS (such as for the
  clues, the anagrams, the light choices, etc.) grow to utilize the available
  space.

### Minor update: Exet v0.88.2 November 14, 2023

- Disallow Exolve puzzles that have the `rebus-cells` option set.

### Minor update: Exet v0.88.1 October 20, 2023

- Vertically-top-align the text in various "plot stats" tables on the
  Analysis tab.

### Version: Exet v0.88 October 7, 2023

- Updated lufz-en-lexicon.js. Somehow, the previous update to it did not
  pick up some changes in Lufz/English. Specifically, accented characters were
  present in the Lexicon, and they were creating incorrect anagram suggestions.

### Minor update: Exet v0.87.3 September 15, 2023

- Bug fix: Exolve has renamed resizeCurrClue() to resizeCurrClueAndControls().
- Prepare for next Exolve release: use currClueInner if available.

### Minor update: Exet v0.87.2 September 14, 2023

- Limit the width of the Exolve scratchpad container (to
  deal with Exolve v1.52).

### Minor update: Exet v0.87.1 August 30, 2023

- Hide the new Exolve element, "Jotter"

### Version: Exet v0.87 July 15, 2023

- Move the "Tips" menu to the RHS.
- Move the "asymmetry" setting to Preferences.
- If there is a preamble, do save it in the Notes section in .puz files.

### Minor update: Exet v0.86.1 July 1, 2023

- Update the URL for the "Mythic beasts" abbreviations list.

### Version: Exet v0.86 May 13, 2023

- Major expansion of English wordlist (now 268,740 entries instead of 250,192).
- Addition of support for Hindi (exet-hindi.html) and Portuguese-Brazilian
  (exet-brazilian.html).
- The above changes required some code tweaks:
  - Add support for IPA as phonetic language (in addition to ARPAbet used
    in CMUdict),
  - The lexicon code files (lufz-en-lexicon.js, lufz-hi-lexicon.js,
    lufz-pt-br-lexicon.js) are updated versions created using
    [Lufz v0.06](https://github.com/viresh-ratnakar/lufz).
  - Disable upper-case-start-based proper-noun detection for non-Latin
    languages.
  - Fix JavaHash implementation for UTF8: encode to UTF8 and convert bytes
    to signed ints.
  - Lexicon indexing keys now use uppercase letters.
  - Use the vector-of-letters representation wherever possible, instead
    of doing redundant conversions.
  - Factor out language-specific configurations (resources, links, default
    dimension, default popularity threshold, etc.) into an exetConfig
    dictionary that we set in exet\*.html.
- Minor CSS tweaks/fixes.

### Version: Exet v0.85 May 3, 2023

- In creating embeddable Exolve, use a new, random div ID everytime.
- Towards creating language-specific Exets:
  - Refactor, moving all language-specific tabs and tools into configurable
    lists of objects that are set in the language-specific exet\*.html file.
  - Remove Nutrimatic anagrams. Exet's own anagrams are pretty much equally
    good now and will work for all languages.
  - Reorganize the anagrams tab a bit. When no draft anagram is entered,
    we show a simplified view. Move the tab to go before Charades.
- Chambers does not allow embedding in iframes any more. Create links that open
  in new tabs. Add Wiktionary as a (nice!) research resource.

### Version: Exet v0.84 April 3, 2023

- Bug fix: setting colour/nina at the "light" level was buggy for linked clues.
- Feature added: can import .puz files now.
- Use https: link to Exet in exolve-maker.

### Version: Exet v0.83 March 24, 2023

- Oops, quick bug fix. Had accidentally commented out a couple of lines,
  and that led to rampant attempts to repeatedly save, leading to quick
  runs on local storage!

### Version: Exet v0.82 March 24, 2023

- More refactoring about supporting more languages and scripts.
- Rename makeLexKey() to lexkey() and make it return an array of letters
  instead of a string now. Its use involves comparing to letters in
  candidates that have to be turned into arrays (to account for multi-char
  letters), so this is more convenient.
- The special key used in local storage for saving Exet state is now
  qualified by lang/script/maxCarCodes if any of them has a non-default
  value.
- When loading an Exolve puzzle, reject if it has a solution letter not in
  the lexicon.
- Bug fix: a negative lexicon index was not (in a couple of places) abs()'d
  before looking up its entry.
- Bug fix: when a cell letter is forced (as there is only one possible
  choice, this now enters all the implied entry choices into dontReuse{}.
  Note that there could be more than one as the same letter sequence can have
  two or more entries.
- When makeExolve() fails, fall back to a new blank puzzle (except when it
  somehow fails while creating a blank puzzle!).
- Always create Exolve grid specs with enough spaces around cell letters.

### Version: Exet v0.81 March 20, 2023

- Some refactoring towards getting non-English/Latin to work (including
  compound-letter languages such as Hindi): Make all iterations over letters
  in a string behave correctly for `maxCharCodes > 1`. Do this by confining them
  to be within the `ExetLexicon` functions `partsOf()`, `lettersOf()`,
  `letterString()`. For the `maxCharCodes == 1` case, the implementations are
  fast, making use of `for (let ch of str)`.

### Version: Exet v0.80 March 16, 2023

- Bug fix: letterHist() function was not counting As at all after the last
  version!
- Start noting maxCharCodes in the lexicon.

### Version: Exet v0.79 March 13, 2023

- Refactor, moving css/js into separate files, leaving a slim exet.html.
  This will be useful to create exet-<lang>.html versions for other
  languages.
- Fix minor bug in getAnagramKey() (it was not stripping dashes etc.).
- Remove links to Highlights Press as they seem to have taken down
  their indicator list pages.

### Version: Exet v0.78.1 January 27, 2023

- Reduce textarea cols for Preamble/Explanations/Other Sections editables
  to 55 from 80. Also make horizontal scrollbars appear to when needed.

### Version: Exet v0.78 January 16, 2023

- Reduce the cursor-jumping-around behaviour when editing the list of
  preferred words.

### Version: Exet v0.77 November 12, 2022

- Bug fix: when replacing within exolve spec to paste in the preview id, do
  not assume the old restrictions on what letters the id may have.
- Make selection saving/restoring more robust:
  - Save locations using string lengths of selection range and the selection
    range adjusted to start at the beginning.
  - Go up as much as needed to find a parent element with an ID.
  - Only save selection if this parent element isContentEditable.
  - For restoring, locate and use the appropriate internal nodes if any.

### Minor update: Exet v0.76.4 October 29, 2022

- Use Exolve's destroy() to clean up preview versions of puzzles.

### Minor update: Exet v0.76.3 October 2, 2022

- Allow exolve-email as an editable section.

### Minor update: Exet v0.76.2 September 22, 2022

- Make the upcoming Notes link in Exolve hidden. Refactor
  to use a function for all such hiding, including an existence check.

### Minor update: Exet v0.76.1 September 15, 2022

- Set .hltOverwrittenMillis to 0 in Exolve, to avoid activating its
  new feature of briefly highlighting overwritten letters.

### Version: Exet v0.76 September 7, 2022

- Bugfix: do not keep adding duplicate selectionChange listeners.

### Version: Unnumbered minor tweak August 19, 2022

- Reduce the height of the Autofill panel in the constrained pangram
  options part.

### Version: Exet v0.75 August 19, 2022

- Use a contenteditable div to display "Preferred fills" instead of a textarea.
- Show the currently used preferred fills in bold (the previous change was
  needed for this).
- Lots of improvements to Autofill:
  - Use multiple (2 for now) refinement sweeps for each step, which results
    in a more reliable viability score.
  - This allows us to simplify the code by making doubly-checked and
    chequered cases more similar (eg, equal progressBoost, no special-case
    for pangrams for doubly-checked).
  - Add a "popularity score" component to the score. This makes us now
    prefer more popular entries.
  - Handle preferred fills better: seed the beam with a few states, each
    one containing a random subset of preferred fills placed in the grid.
  - Keep track of hashes of candidate fills, to avoid cycling.

### Version: Unnumbered minor tweak July 30, 2022

- For indicator queries on cryptics.georgeho.org, get 1000 rows by default.
  While slightly slower, a more comprehensive list is more useful, and it
  also works better with highlighting.
- Add alternation indicators from cryptics.georgeho.org.

### Version: Unnumbered minor tweak July 29, 2022

- Simplify the highlighting menu wording and add tooltips with details.

### Version: Unnumbered minor tweak July 29, 2022

- When the Lists url is empty, just return without trying to highlight,
  even if a highlighting keyword is present.

### Version: Unnumbered minor tweak July 29, 2022

- Allow fiddling with the highlighting menu even when highlighting keyword is
  not set.

### Version: Exet v0.74 July 28, 2022

- On the Lists tab, add a feature that lets you highlight words related
  to a keyword using any of the options provided by the
  [Datamuse words API](https://www.datamuse.com/api/). This is powered by the
  [Xlufz web service](https://github.com/viresh-ratnakar/xlufz)
  that I host at [xlufz.ratnakar.org](https://xlufz.ratnakar.org).

### Version: Unnumbered minor tweak July 26, 2022

- Say 'count of' not 'counts of' when the count is 1 (in Analysis).

### Version: Exet v0.73 July 26, 2022

- Add stats on word-lengths of non-draft clues to Analysis.
- Reorganize Analysis tabs, using two columns to save some vertical space.
- Automatically showTip() about Analysis if a long clue is entered.
- Suppress a showTip() identical to the last one, if within 5 mins of it.

### Version: Exet v0.72 June 21, 2022

- When an edited enum does not specify a length, do not revert to previous enum.
- Add a set of "Tips" and a menu button to show them, with Next/Prev/Random
  buttons. Allow relevant tips to be surfaces through showTip().
- When exolve-option: ignore-enum-mismatch is used, allow enum mismatches when
  editing enums.
- Use showTip() to show a Tip about ignore-enum-mismatch when an enum is
  reverted.

### Version: Exet v0.71 June 12, 2022

- Exolve v1.38 removes xlv-curr-clue-parent (as it now make xlv-curr-clue have
  CSS "position: sticky"). Deal with that, esp for xet-linking and xet-format.

### Version: Minor tweak and typo fixes, May 13, 2022

- Link to a consolidated table of indicators from `cryptics.georgeho.org` in
  the "Lists" tab.

### Version: Minor tweak and typo fixes, May 8, 2022

- Link to Onelook with a more useful URL.
- Minor doc typo-fixes.

### Version: Unnumbered minor tweak May 8, 2022

- Add Merriam-Webster dictionary and thesaurus to the Research tab

### Version: Exet v0.70 February 24, 2022

- Add "Loading..." messages for all iframe loads of external URLs.
- Update dictionaryapi.dev URL to v2, and correct its name from Google
  Dictionary to DictionaryAPI.
- Refactor lexicon related code into exet-lexicon.js (for reuse by other
  apps).
- Load the bulky exetLexicon object using "defer". Show a 'loading lexicon'
  message until it loads.

### Version: Exet v0.69 February 14, 2022

- Before moving away from the current clue, finish processing any buffered
  pending edits to the clue.

### Version: Exet v0.68 February 12, 2022

- When creating or breaking a linked clue, preserve any
  clue text that's already there, only adjust the enum.

### Version: Exet v0.67 February 6, 2022

- s/cryptics.eigenfoo.xyz/cryptics.georgeho.org/g

### Version: Unnumbered minor tweak January 31, 2022

- Continued fine-tuning of #anagrams: make it length-dependent.

### Version: Unnumbered minor tweak January 30, 2022

- Reduce #anagrams from 500 to 100 to make the Anagrams panel faster

### Version: Unnumbered minor tweak January 29, 2022

- Sort multi-word anagrams by ascending #words first.
- In the multi-word anagram algo, vary more common letter counts in
  inner loops, to get a better distributed mix for them in the early
  anagrams.

### Version: Exet v0.66 January 28, 2022

- Add support for multi-word anagrams. This required some fun algorithms as
  the anagram index cannot be extended (within memory constraints) to include
  multiple words. The details are described in a comment in exet.html (look
  for "Multi-word anagrams". A limit on the #anagrams is used to limit
  computation.
- Now that our anagram implementation doesn't have the old "single-word-only"
  limitation, make it the first column in the Anagrams tab, relegating
  Nutrimatic (slower and requires Internet connectivity) to the second column.
- In the Charades tab too, include multi-word anagrams. But use a small limit
  for #anagrams, and disallow substrings (only enforced for 2-word anagrams)
  as they are convered by other charade possibilities.
- When reading an Exolve file, set minpop to 0 (as there may already be
  entries below the default popularity threshold).

### Version: Exet v0.65 December 15, 2021

- Make the "Do not force symmetry" option sticky. Previously, it applied
  to just the next bar/block change. If someone's likely to break symmetry,
  they are likely to do that across a puzzle rather than just at a few cells,
  so for them the old way was painful. Make this option stick with the specific
  crossword (so that for a new crossword we default to enforcing symmetry).
- Use a new revision type (for the above option, for example) called
  REV_OPTIONS_CHANGE.

### Version: Unnumbered minor bug-fix December 10, 2021

- Increase the lag tolerance for input when looking at clues. Especially
  enum changes need more time than 400 ms!

### Version: Unnumbered minor bug-fix November 30, 2021

- Each exolve-question needs to include any specified enum (bug-fix).

### Version: Exet v0.64 November 22 2021

- Add support for trying to get constrained pangrams (pangrams over
  a subset of cells).
- Tweak Autofill/Pangram algorithm/scoring.
- Add option to "Loop till pangram"
- Bug-fix: saving as Exolve without solutions was not clearing out
  definition markers.
- Tweak "proper-noun" hack to exclude words like X-ray that begin with
  a capital letter but have a hyphen right after it.
- Do not carry over autofill-pangram settings across puzzles.

### Version: Exet v0.63 November 9 2021

- Add an option to "try reversals" for grid-fills and autofill.
- The option is set to false by default for 2-D grids and true for 3-D grids.
- In auto-fill, when "try reversals" is true, show the number of lights
  reversed.
- Implement reversals by using negative lexicon indices (this required
  a minor update to Lufz, to ensure the entry at lexicon[0] is a useless
  empty string.
- Reversed fills are placed in priority *after* all unreversed ones.
- Some tricky code to get light-filling and grid-fill-suggesting and reversals
  behave correctly in the presence of linked clues, including those where some
  last-cell == next-first-cell-hence-skipped, and "snake"s ending on the same
  cell.
- When accepting a reversed grid-fill for a linked group, for example, you
  have to first reverse the order of the linked group, and then reverse
  each light in the group.
- Bug-fix: updating displayed clue lables when reversing has to take dir
  suffixes into accoung, can't just map numbers.
- Bug-fix: in the clue lists, sort clues by number.


### Version: Exet v0.62 November 7 2021

- Bug-fix: Setting/removing light-level colours/ninas was broken.
- Bug-fix: Grid changes and light reversals were not dealing properly
  with light-level colours/ninas.
- Avoid saving state when there is an error.

### Version: Exet v0.61 November 5 2021

- When a light is reversed, its existing clue is lost. Update the README to
  say this (instead of the misleading statement that was previously present,
  saying "reverse of reverse = original"). Add confirmation for reversals
  when a light has already been filled or when the light is part of a linked
  group.

### Version: Exet v0.60 November 3 2021

- Add support for creating 3-D crosswords.
- Add support for reversing lights.
- Bug-fix: viablots and darkness were not getting centered in non-square cells.
- Add the 3-d vertical direction to the connectivity-checking algorithm.
- Bug-fix: in 3-D, when the "darkness" square sits atop a dark background
  cell-square (as opposed to a large grid-sized background), stop the click
  event from propagating.
- Simplify the code for linked-clue creation by always requiring the direction
  suffix explicitly.
- Show a helpful message when auto-fill fails, suggesting reducing constraints.

### Version: Unnumbered quick-fix

- The "stop after 5 reloads" was not really doing what it intended, removed.

### Version: Exet v0.59 October 31 2021

- Add support for 3-D crosswords. Right now, the support only is for loading
  already drafted puzzles. Will add better and lots more support soon.
- When there is a bug that leads exet to reload repeatedly, it's hard to
  debug. Stop after 5 reloads now.
- Minor bug-fix for the research tab (reload the indicators research link
  when the clue has changed, even in some corner cases that were missed).

### Version: Exet v0.58 October 18 2021

- If you modify the enum part in the clue to something that indicates a
  multi-word phrase (for example, by changing "(10)" to "(4,6)") then the
  grid-fill suggestions will now be reordered to prefer entries that match the
  implied punctuation, i.e., the presence of interword space/dash/apostrophe
  characters.
- Ditto for the list of rejected entries shown in purple.

### Version: Exet v0.57 October 8 2021

- Disable Exolve's fancy printing (as it does not work on the Exet screen).
- Add "pulished crosswords" (cryptics.eigenfoo.xyz) resources:
  - indicator lists
  - look up definitions that other setters may have used
  - look up cryptic indicators (from your clues) that other setters may
    have used.

### Version: Exet v0.56 September 16 2021

- Grid-fill suggestions that are seemingly not viable were simply not
  shown earlier. With this change, they get shown, but below the viable
  suggestions, and with a distinctive purple background. This is to
  help the use-case of setters designing the grid and doing the grid-fill
  simultaneously (as they can potentially modify the grid to turn a
  non-viable entry that they really like into a viable entry).
- Show tool-tips in addition to the distinctive backgrounds to identify
  viable and non-viable entries.
- Do not stop pruning fill suggestions after the current state is determined
  to be non-viable.

### Unnumbered minor tweak

- Make saved file names actually be \*-with-solutions.html and
  \*-sans-solutions.html (as had already been intended from v0.54).

### Version: Exet v0.55 September 9 2021

- Deal with missing/hidden annos in loaded Exolve files properly.
- When patching up clues formats for an exolve file, do all of them
  together.

### Version: Exet v0.54 August 25 2021

- Make clues and clue linkages survive grid changes (with renumbering
  as needed) if their constituent cells have remained intact.
- Rename tab to 'Edits, Sounds' to avoid the speaker emoji.
- Allow creating .PUZ even when there are linked clues.
- Rename '-solved.html' and '-unsolved.html' to '-with-solutions.html'
  and '-sans-solutions.html' respectively.
- Show grid warnings in red in Analysis.
- Add a grid warning in Analysis if there are lights that have too
  many unches in a blocked grid.

### Version: Exet v0.53 August 21 2021

- When getting pronunciations, even if you've found something, still
  look for alternatives by splitting on space/hyphen.
- Hide the postscript section if present, but show it while
  "Other Exolve sections" is being edited.
- Show some space between rows of alternatives in xet-edits, unifying
  with xet-charades.

### Version: Exet v0.52 August 10 2021

- Bugfix: make the param input area in charades/edits/homophones/Spoonerisms
  show wordplay candidates for manually entered phrases even when there is
  currently active light in the grid.

### Version: Exet v0.51 August 10 2021

- Bugfix: in getPhones() don't limit getLexChoices() to one result
  (but still have a limit of 5, guarding against wanton use of wildcard ?s
  in user-entered phrases in the UI).
- Bugfix: set noProperNouns to false in getPhones() and in checking
  preflex/unpreflex.

### Version: Exet v0.50 August 9 2021

- When getting pronunciations of a phrase, split of hyphen if present,
  if there is no space in the phrase.
- Call getPhones() only once when we have to get both homophones and
  Spoonerisms.
- Create Spoonerisms from non-vowel spans beyond the second one too!
- Minor tweak to Spoonerisms: after you have lists of Spoonerisms as
  well as homophones, delete any Spoonerisms that are also homophones
  (this can happen with the swapped parts in the Spoonerism have
  the same sound).

### Version: Exet v0.49 August 7 2021

- Update the lexicon to a new version, adding CMUdict pronunciations.
- Add Homophones and Spoonerisms!
- Rename the "Del+subs" tab to "Edits + &#x1F56A;" and make it show
  both edits (substitutions, insertions, deletions) as well as homophones
  and Spoonerisms.
- To the tops of charades, edits, and homophones/spoonerisms sections,
  add a text input field where you can make changes to the entry, possibly
  to try out alternatives. Hitting escape in the field will restore the
  value taken from the grid.
- Sort the Edits results by a form of edit distance (substitutions count
  for max(plus-length, minus-length)).
- Minor code-cleanup (more semicolons, mostly).

### Version: Exet v0.48 August 1 2021

- Add deletion/insertion/substitution wordplay candidates in a new tab.

### Version: Exet v0.47 July 9 2021

- Bug-fix: When setting preferred/not-preferred words, look everywhere
  in the lexicon, not just beyond the current popularity threshold.
- Respect "no enums" when saving as .puz.
- Minor css tweak.

### Version: Exet v0.46 June 15 2021

- Bug-fix: When showing a question for editing, quotes in the question
  were dealt with badly.

### Version: Exet v0.45 June 1 2021

- Bug-fix: Marking the def-part (or any other special formatting) in a clue
  was broken when the clue contained quotes.

### Version: Exet v0.44 May 14 2021

- Bug-fix: Ctrl-q/Q should not clear nina cells.

### Version: Exet v0.43 May 12 2021

- Expurgated some crap from the lexicon.
- Split words on "—" too when analyzing annos.

### Version: Exet v0.42 April 26 2021

- Bug fix: when detecting whether selection is part of the insides of an HTML
  tag take into account the possibility of "<<" (often used in annos).

### Version: Exet v0.41 April 23 2021

- Bug-fix: for non-square grids, automagic block-creation had a bug (was
  swapping  w/h incorrectly).

### Version: Exet v0.40 April 13 2021

- Bug-fix: The clue linking/unlinking panel had become invisible with some
  recent changes.
- Make some of the other Exolve sections (exolve-option, for one) available
  through a new Edit menu option. Make this feature check the added sections
  thoroughly by parsing them into a temp puzzle and reporting any errors found.
- Add an Edit -> Preferences menu option, and add the option there to
  enable/disable spellchecks in clues/annos.

### Version: Exet v0.39 April 11 2021

- Allow adding/editing the following sections/features: preamble, explanations,
  question, nina, colour.
- For nina and colour, show a panel where you can modify the following: whether
  the cell or the light is added, which colour to use.
- Also add an edit menu option to clear all cell markings (circles, prefills,
  ninas, colours).
- Modify the Edit menu to accomodate all the above options, using grouped
  submenus.
- For preamble, explanations, question, you edit in a separate panel, but you
  can see the results in the appropriate section rendered as you type (which
  is useful if you're using HTML tags).
- Make the border of all the "modal" panels be green (chocolate in the case
  of fill entries to avoid). Make the text in preferred/avoidable fill choices
  be green/chocolate respectively.
- Make the modal panels get dismissed if the Esc key is pressed inside them
  (in addition to clicks/typing anywhere outside).
- Make "clear this" and "clear all" not clear ninas.
- In the background sweep to weed out light-fill choices using autofill,
  look at more candidates per light (we were too pessimistically determining
  that no fill choices were possible, in some cases). Haven't really noticed
  any reduction in UI responsiveness with this, but that is the concern, as
  this examination locks up the CPU in spurts.

### Version: Exet v0.38 April 4 2021

- Bugfix: update the storage available/free numbers on the "Open" menu after
  deleting any old revisions through "Manage local storage."
- When extracting indicator words from annotations (for clue analysis),
  ignore words containing HTML tags (as they are likely to be fodder).
- Add a call to maybeShowFormat() when there is any input in the clue/anno.
  Just relying on selectionchange is apparently not enough for some corner
  cases.
- Sometimes there is no selected text (in the clue or anno) in some corner
  cases, where there is an active cursor, but there is still a separation
  between the anchor and focus offsets. Use selection.type != 'Range' to
  catch this case (and not show formatting buttons).

### Version: Exet v0.37 March 29 2021

- Make "try to get a pangram" *actually* work. Now it does, most of the time.
  - Use letter rarities (in addition to cell viabilities) to decide which cell
    to fill next, when looking to get a pangram.
  - Add a score boost for rare letters, when looking to get a pangram.
- When Autofill finds a pangram, declare that boldly, on the Autofill panel.
- Make beam search faster by using a heap instead of an array, for storing the
  current beam. The "double heap" needed for top-k-with-extract-max is
  implemented in the ExetDher class.
- Show Autofill progress in terms of individual cells as well (in addition to
  fully filled lights).
- Set default min-popularity down to 80%ile instead of 85.

### Version: Exet v0.36 March 22 2021

- Slight tweaks to how title/setter/preamble get blurred when overlapping the
  current clue:
  - Make the blur colour closer to white.
  - Turn off spellcheck on title/setter/preamble (also clue/anno/copyright,
    while we're at it), so they don't show a squiggly underline for the
    inevitably out-of-dictionary words making up setter/title etc.
  - Make overlap detection take into account the possibility  of format buttons
    appearing atop the clue.
  - Add hover-text to blurred elements ('Click to make visible').

### Version: Exet v0.35 March 21 2021

- Follow-up tweaks/fixes to the new formatting UI.
- Fixes for narrow layouts:
  - Limit the width of the format preview panel so that it does not get cut.
  - Exolve v1.09 has already made long clue+anno panels get a vertical scroll
    bar.
  - When the clue panel overlaps with title/setter/preamble, colour them
    gray to reduce clutter. Clicking on them will restore them (as it
    would hide the current clue, a change pushed out in Exolve v1.09 for
    setter/preamble -- was already the case for title).
- After smart-formatting, continue to show the selection as highlighted (this
  requires a bit of book-keeping to track changes needed to the selection after
  formatting, now implemented).
- Since this continues to activate the smart-editing buttons, order the buttons
  so that the same type is likely to show up in the same spot. Specifically,
  for b/i/u/s/def, the do/undo buttons now show up in the same spot.
- In the format preview panel, show the selected text highlighted.

### Version: Exet v0.34 March 19 2021

- Add some convenient "rich" formatting UI for clue/anno. When you
  select some text in the clue/anno, you get format buttons as well as
  keyboard shortcuts that let you set/unset the following:
  - Clue: def, italic, clear
  - Anno: italic, bold, underline, strikethrough, toggle-case,
    alternates, clear
- The implementation has some minor idiosyncrasies, noted in README.md.
- Bug-fix: show changes to anno HTML immediately in the clues list.
- Do not allow adding junk text after the enum in the clue.

### Version: Exet v0.33 March 13 2021

- Move the min popularity score threshold setting to a more prominent
  place (along with the "disallow proper nouns" setting), above the
  clues table (reduce the width of the rarely-used scratch pad to
  accommodate).
- Set default min popularity to 85%ile instead of 0.
- Clean up the code, limiting exet.html to 80 columns.

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


