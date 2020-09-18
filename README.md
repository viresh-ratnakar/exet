# Exet

## A web app for crossword construction

#### Version: Exet v0.09 September 18 2020

#### Author: Viresh Ratnakar

Exet is free, open source software for setting crosswords.
You can use Exet from [my site](https://viresh-ratnakar.github.io/exet.html)
or you can download and use your own copy of the software from this
repository and a couple of files from
[Exolve](https://github.com/viresh-ratnakar/exolve).
These are all the files needed:
- [`exet.html`](https://raw.githubusercontent.com/viresh-ratnakar/exet/master/exet.html),
- [`about-exet.html`](https://raw.githubusercontent.com/viresh-ratnakar/exet/master/about-exet.html),
- [`lufz-en-lexicon.js.`](https://raw.githubusercontent.com/viresh-ratnakar/exet/master/lufz-en-lexicon.js),
- [`exolve-m.js`](https://raw.githubusercontent.com/viresh-ratnakar/exolve/master/exolve-m.js),
- [`exolve-m.css`](https://raw.githubusercontent.com/viresh-ratnakar/exolve/master/exolve-m.css),
- [`no-unches.png`](https://raw.githubusercontent.com/viresh-ratnakar/exet/master/no-unches.png),
  [`t-unches.png`](https://raw.githubusercontent.com/viresh-ratnakar/exet/master/t-unches.png),
  [`l-unches.png`](https://raw.githubusercontent.com/viresh-ratnakar/exet/master/l-unches.png),
  [`tl-unches.png`](https://raw.githubusercontent.com/viresh-ratnakar/exet/master/tl-unches.png),
  [`no-blocks.png`](https://raw.githubusercontent.com/viresh-ratnakar/exet/master/no-blocks.png).

Exet comes with a permissive MIT license. The full license notice is provided
in the [`LICENSE`](license) file.

Exet has no library/package/software dependencies. You should be able to use it
from any modern browser. The experience may not be great on smaller screens
like phones, though.

Exet saves all revisions of all crosswords that you work on, in the browser's
local storage.  Exet never sends your crosswords to wherever it is getting
served from.

You can download the crosswords that you create with Exet in the
[Exolve](https://github.com/viresh-ratnakar/exolve) format or in the .puz
format. You can also grab embeddable HTML code for adding your crossword to any
web site or blog, using Exolve (but see the
[known caveats in the Exolve
documentation](https://github.com/viresh-ratnakar/exolve#exolve-widget)).

As of September 2020, Exet only suggests English grid-fills (I'll add
support for other languages eventually).

I welcome [bug reports and feature
requests](https://github.com/viresh-ratnakar/exet/issues/new).
You may contact me via email too, at viresh at gmail dot com.

## Lexicon

The list of words used by Exet for providing grid-fill suggestions is a
modified version of the "UKACD" words list, which comes with its own
copyight notice that is reproduced below. I made the following modifications
to the UKACD words list:
- Removed a few swear words.
- Replaced all accented characters with non-accented ones.
- Deleted all punctuation characters other than spaces, hyphens, and apostrophes.
- Attached a popularity score to each word/phrase using a dump of all of Wikipedia's English-language articles.
- Created an index of the lexicon suitable for use by my JavaScript
  code. Source code for the last two steps is available in my
  [Lufz GitHub repository](https://github.com/viresh-ratnakar/lufz).


```
UKACD18
Copyright (c) 2009 J Ross Beresford
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the distribution.

3. The name of the author may not be used to endorse or promote products
   derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE AUTHOR "AS IS" AND ANY EXPRESS OR
IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT,
INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## Quick walk-through

To use Exet, you simply open a link to `exet.html`, such as [this one on
my site](https://viresh-ratnakar.github.io/exet.html), in a browser.

The first time you open Exet, it might take a while to load, as it fetches
a large (19 MB) lexicon file. I'll try to improve this in the future.

After it loads, your browser screen should look something like this:

![Screeshot of Exet upon starting up](starting-screenshot.png)

Normally, Exet would start with the last crossword that you were working
on. When you open it for the very first time, it creates a blank 15x15
blocked grid (you can pass a URL option to default to a blank unblocked
grid instead: exet.html?newgrid=blank).

There are three phases in crossword construction:

- Constructing the grid
- Filling the grid
- Providing the clues

Of course, setters often go back and forth and can overlap the phases
(and Exet certainly lets you do that). But a quick walk-through of
Exet is perhaps best done by separating out and describing these
phases.

### Constructing the grid

You can navigate to any cell using the arrow keys or by clicking on it
(including the dark, block cells). The following controls are all available
from the "Edit" menu (as well as through keyboard shortcuts listed below
and also shown in the menu):

- Toggle block (.)
- Toggle bar-after (|)
- Toggle bar-under (_)
- Toggle encircling (@)
- Toggle marking prefilled (!)

For the actions that modify the grid in non-cosmetic ways (.|_), symmetric
changes are automatically applied to the other end of the grid.

The "Open" menu allows you to start with blocked blank grids following a few
checkquered templates. You can also open any existing HTML file that
contains an puzzle in the Exolve format (when you save such a crossword
after editing it, the saved Exolve file will replicate whatever is there before
and after the Exolve part in the original HTML file that you opened).

### Filling the grid

You can fill any light by typing into its cells. You can also use grid-fill
suggestions shown to the right of the grid (in the "Exet" tab). These grid-fill
suggestions are ordered by their popularity in English Wikipedia articles.

The grid-fill suggestions include phrases and hyphenated words. When you pick
these, the clue enum is automatically adjusted. For example, for 1A, if you
pick "birds of a feather," then the enum will automatically change to
(5,2,1,7).

As you progress through filling the grid, the software will try to help by
showing viability indicators (I call them "viablots"). These are red circles
that appear in light cells that have only a few available grid-fill choices.
The bigger the size, the more constrained a cell is. If you find yourself
in a state where absolutely no viable grid-fill is possible for some cells
(at least from the lexicon the software is using), the viablots in such
cells will be large and coloured purple. Your best recourse at that point is
to back-track by clearing out some neighbouring grid-fills, or use some other
lexicon source to find a word/phrase that works.

The grid-fill suggestions shown for a light take into account a limited
amount of look-ahead. What that means is that the software evaluates
each candidate suggestion for a light (that matches its crossing letters)
by checking if the choice leads to a dead-end for any of the crossing
clues. Such suggestions are moved to the bottom of the list and shown in
purple colour. I will try to improve this feature over time by playing
out multiple steps in the background.

### Providing the clues

The clue for the current light is shown above the grid and can be edited in
place right there. You can navigate through the clues using standard
controls such as clicking on a cell or a clue, using the arrow keys, or
using the tab and shift-tab keys.

You can also edit the enum part of the clue (but the software will reset it
if it does not add up. For example, if a light spans 10 cells, and you edit
the anno to be "(5-4)," the software will reset it to "(10)."

You can optionally provide annotations for clues. These annotations are used
in cryptic crossword solutions, typically, to describe the cryptic wordplay.

When creating a clue for a word or a phrase, setters typically like to
look at the definition of the word/phrase, look at its synonyms, examples of
usage, pronunciation, and etymology. The following three tabs in Exet
let you do that by using reputed online resources:

- **TFD**: [thefreedictionary.com](https://thefreedictionary.com)
- **Google Dict**: [api.dictionaryapi.dev](https://api.dictionaryapi.dev/api/v1/entries/en/test)
- **Etym**: [www.etymonline.com](https://www.etymonline.com)

In each case, clicking on the tab will directly open the online resource for the
word/phrase in the current light.

For cryptic crosswords, these additional tabs might be of use to setters. These
are:

- **Charades...**: Shows candidate charade wordplays, including anagrams and
  containers, wordplays for the current light, sorted in decreasing order of
  the average length of wordplay components.
- **Anagrams...**: Uses [nutrimatic.org](https://nutrimatic.org) to show
  meaningful anagrams of the current light, as well as "alternation" wordplays
  for the current light. Setters can tweak the wordplay as they choose. The
  Nutrimatic anagrams may cover more possibilities than the anagrams shown in
  the Charades tab, as the anagrams shown in the Charades tab are restricted
  to words and phrases in the lexicon. Also shows a panel with possibilities for
  composite anagrams (can also be used for anagrams with deletions).
- **Hidden...**: Uses [nutrimatic.org](https://nutrimatic.org) to show meaningful
  "hidden word" and "reversed hidden word" wordplay ppossibilities for the
  current light. Setters can tweak the wordplay as they choose.
- **Lists**: This is not specific to the current light. This tab provides
  convenient links to curated lists of wordplay indicators (for wordplays of
  various types) and acceptable cryptic abbreviations. The source is
  mostly the [Crossword Unclued](https://www.crosswordunclued.com) blog
  (and Wikipedia).

### Final touches

Do give your crossword a meaningful title, and provide your name/pseudonym as
the setter. These fields can be seen at the top of the page and can be directly
edited. Similarly, you can edit the copyright notice for the puzzle. All three
of these editable fields are optional, and you can simply edit them to be
empty.

### Downloading Exolve or .puz files

The "Save" menu lets you download or grab the puzzle in various ways:

- **Download PUZ file (exet.puz)**: Download a .puz file. Note that .puz
  does not support many crossword features (afaik) such as barred grids.
  The software will alert you if it is not able to provide a .puz download.
- **Download Exolve file w/ solutions (exet-exolve-solved.html)**: Download an
  Exolve file that allows solvers to check/see solutions.
- **Download Exolve file w/o solutions (exet-exolve-unsolved.html)**: Download
  an Exolve file that does not allow solvers to check/see solutions.
- **Copy Exolve widget code w/ solutions 📋**: Copy (into the clipboard)
  embeddable Exolve widget HTML code (with solvers able to check/see solutions).
- **Copy Exolve widget code w/o solutions 📋**: Copy (into the clipboard)
  embeddable Exolve widget HTML code (with solvers not able to check/see
  solutions).

In the first three "download" variants, a file with the name shown will be
downloaded into the browser's Downloads directory/folder. If there already
exists a file with that name, the system will use a variant of the name
as per its usual conventions. You should copy/rename the file after
downloading to something more meaningful.

### Going back to older versions

The "Open" menu lets you pick any old revision of any crossword. It also shows
a preview of the puzzle revision that you select.

## Supported crossword features

### Annotations

### Hyphens and spaces

### Barred and blocked grids

### Circles and prefills

## Features easy to add with some post-editing

In the Exolve format, you can simply edit the downloaded file (which is in a
simple plain-text format described in detail in the
[Exolve README file](https://github.com/viresh-ratnakar/exolve/blob/master/README.md))
to add any of the following features.

- Ninas, preambles, explanations
- Diagramless puzzles
- Jigsaw puzzles

## Not yet supported features

### Linked clues

### Auto-fill

### Other languages and lexicons

## Notes and acknowledgements

- [Qxw](https://www.quinapalus.com/qxw.html) is excellent free software for
  crossword construction that I have been using extensively. I found myself
  jumping from Qxw to various online resources during the clue-setting phases
  of crossword construction, and have tried to make these resources
  readily accessible in-context within Exet.
- Qxw also provides [links to the original versions of many word
  lists](https://www.quinapalus.com/xwfaq.html), (including UKACD18, the one
  that I used).
- The "viablots" that I display in Exet are inspired by a similar construct
  in Qxw.
- I added Wikipedia-importance scores to the lexicon using code
  ([Lufz](https://github.com/viresh-ratnakar/lufz)) inspired by the the code
  used in the [Nutrimatic project](https://github.com/egnor/nutrimatic).
- I used this [.puz format
  documentation](https://code.google.com/archive/p/puz/wikis/FileFormat.wiki)
  to write code to create .puz-formatted output. This mostly worked, except
  that I had to fix a bug (the checksum computation needs to make sure that
  it does not overflow beyond 16 bits). I found the bug by looking at the
  [puzpy code](https://github.com/alexdej/puzpy).

