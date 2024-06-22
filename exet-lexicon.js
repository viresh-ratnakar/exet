/*
MIT License

Copyright (c) 2022 Viresh Ratnakar

See the full Exet license notice in exet.js.

Current version: v0.93, June 17, 2024
*/

/**
 * This function should be called only after lufz-en-lexicon.js has been
 * loaded. If that script is loaded using "defer" then exetLexiconInit()
 * should be called once the DOMContentLoaded event fires.
 */
function exetLexiconInit() {
  console.assert(exetLexicon,
    'The exetLexicon object must be initialized before this script can be ' +
    'used. This can be done by loading the script file lufz-en-lexicon.js.');

  exetLexicon.startLen = exetLexicon.lexicon.length;

  /**
   * Note that exetLexicon.letters is expected to be in upper-case,
   * as are the keys in letterSet and letterFreq.
   */
  exetLexicon.letterSet = {};
  exetLexicon.letterFreq = {};
  exetLexicon.letterIndex = {};
  exetLexicon.maxCharCodes = 1;
  exetLexicon.zeroHist = new Array(exetLexicon.letters.length);
  for (let i = 0; i < exetLexicon.letters.length; i++) {
    const c = exetLexicon.letters[i];
    console.assert(c.toUpperCase() == c, c);
    if (c.length > exetLexicon.maxCharCodes) {
      exetLexicon.maxCharCodes = c.length;
    }
    exetLexicon.letterIndex[c] = i;
    exetLexicon.zeroHist[i] = 0;
  }
  for (let c of exetLexicon.letters) {
    exetLexicon.letterSet[c] = true;
    exetLexicon.letterFreq[c] = 0;
  }

  /**
   * Word splitting functions. We override these when maxCharCodes > 1
   * (the overrides are slower, so we do not use them for the 1 case).
   */
  if (exetLexicon.maxCharCodes == 1) {
    exetLexicon.partsOf = function(s) {
      return s.split('');
    }
    exetLexicon.lettersOf = function(s) {
      const parts = s.toUpperCase().split('');
      const out = [];
      for (p of parts) {
        if (this.letterSet[p]) out.push(p);
      }
      return out;
    }
    /**
     * Sequence of just the letters of s, uppercased.
     */
    exetLexicon.letterString = function(s) {
      const sU = s.toUpperCase();
      let out = '';
      for (let c of sU) {
        if (this.letterSet[c]) {
          out += c;
        }
      }
      return out;
    }
  } else {
    exetLexicon.partsOf = function(s) {
      const rawParts = s.split('');
      const rawPartsU = s.toUpperCase().split('');
      const len = rawParts.length;
      let x = 0;
      const out = [];
      while (x < len) {
        let multi = 1;
        for (let m = this.maxCharCodes; m > 1; m--) {
          const ch = rawPartsU.slice(x, x + m).join('');
          if (this.letterSet[ch]) {
            multi = m;
            break;
          }
        }
        const part = (multi == 1) ? rawParts[x] :
                     rawParts.slice(x, x + multi).join('');
        out.push(part);
        x += multi;
      }
      return out;
    }
    exetLexicon.lettersOf = function(s) {
      const parts = this.partsOf(s.toUpperCase());
      const out = [];
      for (p of parts) {
        if (this.letterSet[p]) out.push(p);
      }
      return out;
    }
    /**
     * Sequence of just the letters of s, uppercased.
     */
    exetLexicon.letterString = function(s) {
      return this.lettersOf(s).join('')
    }
  }
  /**
   * Sequence of just the letters of s, lowercased.
   */
  exetLexicon.lcLettersOf = function(s) {
    const out = this.lettersOf(s);
    for (let i = 0; i < out.length; i++) {
      out[i] = out[i].toLowerCase();
    }
    return out;
  }
  /**
   * String of just the letters of s, lowercased.
   */
  exetLexicon.lcLetterString = function(s) {
    return this.letterString(s).toLowerCase();
  }

  for (let w of exetLexicon.lexicon) {
    const wLetters = exetLexicon.lettersOf(w);
    for (let c of wLetters) {
      exetLexicon.letterFreq[c] += 1;
    }
  }
  let maxFreq = 0;
  let minFreq = Number.MAX_VALUE;
  for (let c in exetLexicon.letterFreq) {
    if (exetLexicon.letterFreq[c] > maxFreq) maxFreq = exetLexicon.letterFreq[c];
    if (exetLexicon.letterFreq[c] < minFreq) minFreq = exetLexicon.letterFreq[c];
  }
  exetLexicon.letterRarities = {}
  for (let c in exetLexicon.letterFreq) {
    let x = 1.0 - ((exetLexicon.letterFreq[c] - minFreq) /
                   (maxFreq - minFreq));
    if (x < 0.7) x = 0.7;
    exetLexicon.letterRarities[c] = 1.0 + (1.5 * (x - 0.7) / 0.3);
  }
  exetLexicon.vowelPhonemes = {
    'AA': true, 'AE': true, 'AH': true, 'AO': true, 'AW': true, 'AY': true,
    'EH': true, 'ER': true, 'EY': true, 'IH': true, 'IY': true, 'OW': true,
    'OY': true, 'UH': true, 'UW': true,
    'i': true, 'y': true, 'ɨ': true, 'ʉ': true, 'ɯ': true, 'u': true, 'ɪ': true,
    'ʏ': true, 'ʊ': true, 'e': true, 'ø': true, 'ɘ': true, 'ɵ': true, 'ɤ': true,
    'o': true, 'e̞': true, 'ø̞': true, 'ə': true, 'ɤ̞': true, 'o̞': true, 'ɛ': true,
    'œ': true, 'ɜ': true, 'ɞ': true, 'ʌ': true, 'ɔ': true, 'æ': true, 'ɐ': true,
    'a': true, 'ɶ': true, 'ä': true, 'ɑ': true, 'ɒ': true,
  };

  /**
   * Remove all punctuation, normalize spaces, only retain
   * letters and dashes and quotes and spaces. Return in
   * lower case. Applied to clue texts, preferred/disallowed entries.
   */
  exetLexicon.depunct = function(s) {
    let out = '';
    const parts = this.partsOf(s);
    for (let c of parts) {
      if (c == ' ' || c == '-' || c == "'" ||
          this.letterSet[c.toUpperCase()]) {
        out += c;
      } else if (c == '—' || c == '/' || c == '&') {
        out += ' ';
      }
    }
    return out.replace(/\s+/g, ' ').toLowerCase().trim();
  }

  exetLexicon.letterRarity = function(c) {
    const cu = c.toUpperCase()
    return this.letterRarities[cu] || 0;
  }

  /**
   * Returns array of uppercase letters and ?s that
   * can be joined to form the lexicon index key.
   */
  exetLexicon.lexkey = function(partialSol) {
    const key = [];
    if (!partialSol) return key;
    const parts = this.partsOf(partialSol.toUpperCase());
    for (let c of parts) {
      if (this.letterSet[c] || c == '?') {
        key.push(c);
      }
    }
    return key;
  }
  
  /**
   * Generalizes lexkey string, turning the last non-? into ?.
   */
  exetLexicon.generalizeKey = function(key) {
    const parts = this.partsOf(key);
    for (let i = parts.length - 1; i >= 0; --i) {
      if (parts[i] != '?') {
        return parts.slice(0, i).join('') + '?' + parts.slice(i + 1).join('');
      }
    }
    return key;
  }
  
  exetLexicon.keyMatchesPhrase = function(key, phrase) {
    const phraseKey = this.lexkey(phrase)
    if (phraseKey.length != key.length) {
      return false;
    }
    for (let i = 0; i < key.length; i++) {
      const kc = key[i];
      if (kc != '?' && kc != phraseKey[i]) {
        return false;
      }
    }
    return true
  }
  
  exetLexicon.isProperNoun = function(s) {
    if (this.script != 'Latin') {
      return false;
    }
    const parts = this.partsOf(s);
    if (parts.length <= 1) {
      return false;
    }
    const first = parts[0];
    return first.toUpperCase() == first && parts[1] != '-';
  }

  exetLexicon.getLex = function(idx) {
    return this.lexicon[Math.abs(idx)];
  }

  /**
   * partialSol can contain letters, question-marks, spaces, hyphens.
   * limit=0 for all matches, else return at most limit matches.
   * dontReuse should be an object with dontReuse[idx] set to true for (+ve)
   *     lexicon indices that have already been used.
   * noProperNouns: disallow proper nouns
   * indexLimit: only consider lexicon indices less than this. 0 for no constraints.
   * tryRev: try reversals.
   * preflexByLen[len] should be an array of preferred lexicon indices of length len.
   * unpreflex should be an object where unpreflex[idx] is true if lexicon index idx should be avoided.
   */
  exetLexicon.getLexChoices = function(
      partialSol,
      limit=0,
      dontReuse={},
      noProperNouns=false,
      indexLimit=0,
      tryRev=false,
      preflexByLen=[],
      unpreflex={}) {
    if (indexLimit <= 0) {
      indexLimit = this.startLen;
    }
    let choices = [];
    const key = this.lexkey(partialSol);
    const keylen = key.length;
    if (!keylen) return choices;
    const rkey = tryRev ? key.slice().reverse() : [];
    // First look at preferred choices (these may have idx >= indexLimit)
    const seen = {};
    if (preflexByLen[keylen]) {
      for (idx of preflexByLen[keylen]) {
        if (dontReuse[idx]) continue;
        const phrase = this.lexicon[idx];
        if (this.keyMatchesPhrase(key, phrase)) {
          choices.push(idx);
          seen[idx] = true;
        }
        if (tryRev && this.keyMatchesPhrase(rkey, phrase)) {
          const ridx = 0 - idx;
          choices.push(ridx);
          seen[ridx] = true;
        }
      }
    }
    const loops = tryRev ? 2 : 1;
    for (let i = 0; (i < loops) && (limit <= 0 || choices.length < limit); i++) {
      const loopKey = (i == 0) ? key : rkey;
      let gkey = loopKey.join('');
      while (!this.index[gkey]) {
        const ngkey = this.generalizeKey(gkey);
        if (ngkey == gkey) return choices;
        gkey = ngkey;
      }
      const indices = this.index[gkey];
      for (let idx of indices) {
        if (idx >= indexLimit) break;
        if (dontReuse[idx]) continue;
        if (unpreflex[idx]) continue;
        const phrase = this.lexicon[idx];
        if (noProperNouns && this.isProperNoun(phrase)) {
          continue;
        }
        const loopIdx = (i == 0) ? idx : 0 - idx;
        if (this.keyMatchesPhrase(loopKey, phrase) && !seen[loopIdx]) {
          choices.push(loopIdx);
          if (limit > 0 && choices.length >= limit) break;
        }
      }
    }
    return choices;
  }
  
  exetLexicon.utf8Encoder = new TextEncoder();

  exetLexicon.javaHash = function(key) {
    let hash = 0;
    const keyBytes = this.utf8Encoder.encode(key);
    for (let i = 0; i < keyBytes.length; i++) {
      const c = (keyBytes[i] << 24) >> 24;  /** make int8 from unit8 */

      hash = ((hash << 5) - hash) + c;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
  
  exetLexicon.anagramKey = function(letters) {
    return letters.slice().sort().join('');
  }

  exetLexicon.anagramKeyStr = function(phrase) {
    const letters = this.lettersOf(phrase);
    return letters.sort().join('');
  }

  exetLexicon.getAnagrams1 = function(letters, limit=0, getIndices=false) {
    const key = this.anagramKey(letters);
    const NUM_SHARDS = this.anagrams.length;
    let shard = this.javaHash(key) % NUM_SHARDS;
    if (shard < 0) shard += NUM_SHARDS;
    const anagrams = [];
    for (let idx of this.anagrams[shard]) {
      const candidate = this.lexicon[idx];
      if (this.anagramKeyStr(candidate) == key) {
        anagrams.push(getIndices ? idx : candidate);
        if (limit > 0 && anagrams.length >= limit) {
          break;
        }
      }
    }
    return anagrams;
  }
  
  /**
   * limit: 0 if no limit.
   * seqOK: if false, avoid picking a string of consecutive letters for
   *   anagramming as one of the words in a multi-word anagram (only enforced
   *   for 2-word anagrams).
   */
  exetLexicon.getAnagrams = function(phrase, limit, seqOK=true) {
    const letters = this.lettersOf(phrase);
    const anagrams1 = this.getAnagrams1(letters, limit);
    const phraseLen = letters.length;
    if (phraseLen < 4 || (limit > 0 && anagrams1.length >= limit)) {
      return anagrams1;
    }
    const multiK = (phraseLen <= 7) ? 2 : ((phraseLen <= 10) ? 3 : 4);
    if (limit > 0) {
      limit -= anagrams1.length;
    }
    const anagramsK = this.getAnagramsK(letters, limit, multiK, seqOK);
    return anagrams1.concat(anagramsK);
  }
  
  /**
   * Dedupes the given list of anagrams, and returns it along with
   * "decorations":
   * - Each single letter is colored green
   * - Each substring is colored dark-green
   * - Each reversed substring is colored dark-green and suffixed with <<
   *   unless the whole anagram is a reversal
   * - The whole anagram is suffixed with << or * (or nothing if in-sequence)
   * - The whole anagram is wrapped in () before suffixing, if it has
   *   multiple parts
   * - Passing phrase as '' will just colour single letters, and will only
   *   do parenthesis-wrapping if needed, and will only append the anagram
   *   marker, *.
   */
  exetLexicon.displayAnagrams = function(phrase, anagrams) {
    const NONE = 0;
    const SINGLE = 1;
    const STRAIGHT = 2;
    const REVERSED = 3;
    const seen = new Set;
    const display = [];
    const letters = this.lettersOf(phrase);
    const phraseStr = letters.join('');
    letters.reverse();
    const phraseRevStr = letters.join('');
    for (const anagram of anagrams) {
      if (seen.has(anagram)) {
        continue;
      }
      seen.add(anagram);

      const parts = anagram.split(' ');

      const displayTags = [];
      let noNones = (phraseStr.length > 0);
      const partStrs = [];
      const partRevStrs = [];
      for (const part of parts) {
        const partLetters = this.lettersOf(part);
        if (partLetters.length == 1) {
          displayTags.push(SINGLE);
          partStrs.push(partLetters[0]);
          partRevStrs.push(partLetters[0]);
          continue;
        }
        const partStr = partLetters.join('');
        let tag = NONE;
        if (phraseStr.indexOf(partStr) >= 0) {
          tag = STRAIGHT;
        } else if (phraseRevStr.indexOf(partStr) >= 0) {
          tag = REVERSED;
        }
        if (tag == NONE) {
          noNones = false;
        } else if (noNones) {
          partStrs.push(partStr);
          partLetters.reverse();
          partRevStrs.push(partLetters.join(''));
        }
        displayTags.push(tag);
      }

      let op = '*';
      let charadeCombo = 0;
      if (noNones) {
        /**
         * Check if all the parts can be strung together as-is or reversed to
         * form phrase
         */
        console.assert(
            parts.length == partStrs.length && parts.length == partRevStrs.length,
            parts, partStrs, partRevStrs);
        const partCombos = 1 << parts.length;
        for (let combo = 0; combo < partCombos; combo++) {
          const charade = [];
          for (let i = 0; i < parts.length; i++) {
            if (combo & (1 << i)) charade.push(partRevStrs[i]);
            else charade.push(partStrs[i]);
          }
          if (combo == partCombos - 1 && phraseRevStr.length > 1) {
            const revCharade = charade.slice();
            revCharade.reverse();
            if (revCharade.join('') == phraseStr) {
              op = '<<';
              charadeCombo = combo;
              break;
            }
          }
          if (charade.join('') == phraseStr) {
            op = '';
            charadeCombo = combo;
            break;
          }
        }
      } else if (!phrase) {
        const anagramLetters = this.lettersOf(anagram);
        if (anagramLetters.length == 1) {
          op = '';
        }
      }

      for (let i = 0; i < parts.length; i++) {
        if (displayTags[i] == NONE) continue;
        const cls = (displayTags[i] == SINGLE) ? 'xet-green' : 'xet-darkgreen';
        parts[i] = `<span class="${cls}">${parts[i]}</span>`;
        if (op == '' && parts.length > 1 && (charadeCombo & (1 << i))) {
          parts[i] += '<span class="xet-blue"><<</span>';
        }
      }

      let joined = parts.join(' ');
      if (op != '' && parts.length > 1) {
        joined = '(' + joined + ')';
      }
      if (op) {
        joined += `<span class="xet-blue">${op}</span>`;
      }
      display.push(joined);
    }
    return display;
  }

  /**
   * Multi-word anagrams of phrases.
   *
   * Simply using the letter-histogram as the key doesn't work, as we cannot
   * index all possible k-word phrases even for k=2. We can try looking at
   * some subset of the letters first. But, for an n-letter phrase, the
   * number of subsets to look at is 2^n (or something like that, depending
   * on repetitions). So, we use "salient letter key"s (slKey). From letter
   * frequencies in words, the most common 8 letters (in English) are
   * [eisarnto]. We build a histogram key of the phrase using only these letters.
   * This leads to an index where the key 'ae' has the biggest mass, at around
   * 1000 lexicon words. Next, we limit the subsets to examine as follows. For
   * each salient letter in the phrase, limit its possible counts (in the
   * subset to examine) so that the total number of possibilities is <= 1000.
   * For each subset, we go through all possible candidate words that have
   * that specific slKey (< 1000), and for each candidate, we check if its
   * full letter histogram is subsumed by the full letter histogram of the phrase.
   */

  exetLexicon.getSubsetAnagrams = function(letters, seqOK) {
    const slk = this.slKey(letters);
    const slkLimits = slk.slice();
    let product = 1;
    for (let i = 0; i < 8; i++) {
      slkLimits[i] = Math.min(1, slkLimits[i]);
      product = product * (slkLimits[i] + 1);
    }
    let maxed = false;
    while (product < 1000 && !maxed) {
      maxed = true;
      for (let i = 0; i < 8 && product < 1000; i++) {
        if (slkLimits[i] < slk[i]) {
          maxed = false;
          slkLimits[i]++;
          product = product * (slkLimits[i] + 1) / slkLimits[i];
        }
      }
    }
    const fullHist = this.letterHist(letters);
    const subkey = [0,0,0,0,0,0,0,0];
    const anagrams = [];
    const phraseSeq = seqOK ? '' : letters.join('');
  
    // Vary the more common letters in the inner loops.
    for (let i7 = 0; i7 <= slkLimits[7]; i7++) {
      subkey[7] = i7;
      for (let i6 = 0; i6 <= slkLimits[6]; i6++) {
        subkey[6] = i6;
        for (let i5 = 0; i5 <= slkLimits[5]; i5++) {
          subkey[5] = i5;
          for (let i4 = 0; i4 <= slkLimits[4]; i4++) {
            subkey[4] = i4;
            for (let i3 = 0; i3 <= slkLimits[3]; i3++) {
              subkey[3] = i3;
              for (let i2 = 0; i2 <= slkLimits[2]; i2++) {
                subkey[2] = i2;
                for (let i1 = 0; i1 <= slkLimits[1]; i1++) {
                  subkey[1] = i1;
                  for (let i0 = 0; i0 <= slkLimits[0]; i0++) {
                    subkey[0] = i0;
                    const wordIndices = this.slkIndex[subkey];
                    if (!wordIndices) continue;
                    for (let wordIndex of wordIndices) {
                      const subLetters = this.lettersOf(this.lexicon[wordIndex]);
                      const subWordHist = this.letterHist(subLetters);
                      const diffHist = this.letterHistSub(fullHist, subWordHist);
                      if (!diffHist) continue;
                      if (!seqOK && phraseSeq.includes(subLetters.join(''))) {
                        continue;
                      }
                      anagrams.push([wordIndex, diffHist]);
    } } } } } } } } }
    return anagrams;
  }

  exetLexicon.letterHist = function(letters) {
    const hist = this.zeroHist.slice();
    for (let l of letters) {
      hist[this.letterIndex[l]]++;
    }
    return hist;
  }


  /* Intersect letters with histogram. */
  exetLexicon.lettersXHist = function(letters, hist) {
    const result = [];
    for (const l of letters) {
      const idx = this.letterIndex[l];
      if (hist[idx] > 0) {
        result.push(l);
        hist[idx]--;
      }
    }
    return result;
  }
  
  /**
   * Returns h1-h2.
   * If h2 is not a strict subset of h1, then:
   *   if strict=true, returns null
   *   otherwise zeros out the returned hist where h2 is bigger than h1.
   * Returns null if h2 is not a strict subset of h1. Otherwise returns h1-h2.
   */
  exetLexicon.letterHistSub = function(h1, h2, strict=true) {
    const ret = h1.slice();
    let allZeros = true;
    for (let i = 0; i < h1.length; i++) {
      ret[i] = ret[i] - h2[i];
      if (ret[i] < 0) {
        if (strict) return null;
        ret[i] = 0;
      }
      if (ret[i] > 0) allZeros = false;
    }
    if (allZeros && strict) return null;
    return ret;
  }
  
  exetLexicon.slKey = function(letters) {
    const hist = [0,0,0,0,0,0,0,0];
    for (let l of letters) {
      const idx = this.SLK_LETTERS.indexOf(l);
      if (idx < 0) continue;
      hist[idx]++;
    }
    return hist;
  }
  
  /**
   * Initialize anagram-related indices.
   */
  exetLexicon.initAnagrammer = function() {
    /**
     * Find the 8 most frequent letters.
     */
    this.SLK_LETTERS = ['', '', '', '', '', '', '', ''];
    const counts = [-1, -1, -1, -1, -1, -1, -1, -1];
    for (let l of this.letters) {
      const count = this.letterFreq[l];
      for (let x = 0; x < 8; x++) {
        if (count > counts[x]) {
          for (let y = 7; y > x; y--) {
            this.SLK_LETTERS[y] = this.SLK_LETTERS[y - 1];
            counts[y] = counts[y - 1];
          }
          this.SLK_LETTERS[x] = l;
          counts[x] = count;
          break;
        }
      }
    }
    this.slkIndex = {};
    for (let idx = 1; idx < this.lexicon.length; idx++) {
      const letters = this.lettersOf(this.lexicon[idx]);
      const k = this.slKey(letters);
      if (!this.slkIndex[k]) this.slkIndex[k] = [];
      this.slkIndex[k].push(idx);
    }
  }
  
  exetLexicon.lettersFromHist = function(h) {
    const ret = [];
    for (let i = 0; i < this.letters.length; i++) {
      if (!h[i]) continue;
      for (let j = 0; j < h[i]; j++) {
        ret.push(this.letters[i]);
      }
    }
    return ret;
  }
  
  exetLexicon.lexToSortedWords = function(list) {
    list.sort((a, b) => {
      const spaceDiff = a.length - b.length;
      return (spaceDiff == 0) ? Math.max( ...a ) - Math.max( ...b ) : spaceDiff;
    });
    const wordsList = [];
    for (let entry of list) {
      const words = [];
      for (let idx of entry) {
        words.push(this.lexicon[idx]);
      }
      wordsList.push(words.join(' '));
    }
    return wordsList;
  }
  
  /**
   * Returns k-word anagrams, sorted by increasing #words and then worsening
   * worst popularity
   */
  exetLexicon.getAnagramsK = function(letters, limit, k, seqOK) {
    return this.lexToSortedWords(
        this.getAnagramsKIndices(letters, limit, k, seqOK));
  }
  
  exetLexicon.getAnagramsKIndices = function(letters, limit, k, seqOK) {
    console.assert(k > 1, k);
    console.assert(limit >= 0, limit);
    const anagrams = [];
    const seenAnagrams = {};
    const partials = this.getSubsetAnagrams(letters, seqOK);
    const phraseSeq = seqOK ? '' : letters.join('');
    for (let partial of partials) {
      const delta = this.lettersFromHist(partial[1]);
      if (!delta.length) continue;
      const deltaAnagrams = this.getAnagrams1(delta, limit, true);
      for (let deltaAnagram of deltaAnagrams) {
        if (!seqOK &&
            phraseSeq.includes(this.letterString(
                this.lexicon[deltaAnagram]))) {
          continue;
        }
        candidate = [partial[0], deltaAnagram].sort((a, b) => a - b);
        if (!seenAnagrams[candidate]) {
          seenAnagrams[candidate] = true;
          anagrams.push(candidate);
          if (limit > 0) {
            limit--;
            if (limit == 0) {
              return anagrams;
            }
          }
        }
      }
    }
    if (k == 2) {
      return anagrams;
    }
    console.assert(limit >= 0, limit);
    for (let partial of partials) {
      const delta = this.lettersFromHist(partial[1]);
      if (!delta.length) continue;
      // Delta has sorted order, need to set seqOK to true for recursive call.
      const deltaAnagrams = this.getAnagramsKIndices(delta, limit, k - 1, true);
      for (let deltaAnagram of deltaAnagrams) {
        candidate = [partial[0]].concat(deltaAnagram).sort((a, b) => a - b);
        if (!seenAnagrams[candidate]) {
          seenAnagrams[candidate] = true;
          anagrams.push(candidate);
          if (limit > 0) {
            limit--;
            if (limit <= 0) return anagrams;
          }
        }
      }
    }
    return anagrams;
  }

  exetLexicon.dedupe = function(a) {
    const ret = [];
    const haves = {};
    for (let e of a) {
      if (haves[e]) continue;
      haves[e] = true;
      ret.push(e);
    }
    return ret;
  }

  exetLexicon.initAnagrammer();

  /**
   * End of code for multi-word anagrams.
   */

  /**
   * Get anagrams of words that contain all "letters"
   * letters: ordered array of phrase letters
   * limit: max results (set to 100 if passed as 0 or negative)
   * minusLimit: max number of anagrams of the subtracted part
   * maxSupFactor: starting word must be no longer than this times len(letters)
   * @return: array of triples [word, subtraction, subtractionAnagrams (array)]
   */
  exetLexicon.getSupersetAnagrams = function(letters, limit, minusLimit, maxSupFactor) {
    const lettersStr = letters.join('');
    const slk = this.slKey(letters);
    const slkMins = slk.slice();
    const slkMaxes = slk.slice();
    let product = 1;
    const bound = limit > 0 ? limit : 100;
    while (product < bound) {
      for (let i = 0; i < 8 && product < bound; i++) {
        const oldNum = slkMaxes[i] - slkMins[i] + 1;
        product = product * (oldNum + 1) / oldNum;
        if (product < bound) {
          slkMaxes[i]++;
        }
      }
    }
    const fullHist = this.letterHist(letters);
    const supkey = [0,0,0,0,0,0,0,0];
    const anagrams = [];
  
    let num = 0;
    // Vary the more common letters in the inner loops.
    for (let i7 = slkMins[7]; i7 <= slkMaxes[7]; i7++) {
      supkey[7] = i7;
      for (let i6 = slkMins[6]; i6 <= slkMaxes[6]; i6++) {
        supkey[6] = i6;
        for (let i5 = slkMins[5]; i5 <= slkMaxes[5]; i5++) {
          supkey[5] = i5;
          for (let i4 = slkMins[4]; i4 <= slkMaxes[4]; i4++) {
            supkey[4] = i4;
            for (let i3 = slkMins[3]; i3 <= slkMaxes[3]; i3++) {
              supkey[3] = i3;
              for (let i2 = slkMins[2]; i2 <= slkMaxes[2]; i2++) {
                supkey[2] = i2;
                for (let i1 = slkMins[1]; i1 <= slkMaxes[1]; i1++) {
                  supkey[1] = i1;
                  for (let i0 = slkMins[0]; i0 <= slkMaxes[0]; i0++) {
                    supkey[0] = i0;
                    const wordIndices = this.slkIndex[supkey];
                    if (!wordIndices) continue;
                    for (let wordIndex of wordIndices) {
                      const supLetters = this.lettersOf(this.lexicon[wordIndex]);
                      if (supLetters.join('').indexOf(lettersStr) >= 0) {
                        /* phrase is a substring, skip. */
                        continue;
                      }
                      if (supLetters.length > letters.length * maxSupFactor) {
                        continue;
                      }
                      const supWordHist = this.letterHist(supLetters);
                      const diffHist = this.letterHistSub(supWordHist, fullHist);
                      if (!diffHist) continue;
                      const diffStr = this.lettersXHist(supLetters, diffHist).join('');
                      const diffAnags = this.getAnagrams(diffStr, minusLimit);
                      if (diffAnags.length == 0) continue;
                      anagrams.push([wordIndex, diffStr, diffAnags]);
                      num += diffAnags.length;
                      if (num > limit) {
                        break;
                      }
    } } } } } } } } }
    return anagrams;
  }

  exetLexicon.containsPhone = function(index, phone_str) {
    const phones = this.phones[index];
    for (let ph of phones) {
      if (ph.join('') == phone_str) return true;
    }
    return false;
  }

  exetLexicon.getPhones = function(phrase) {
    const phones = [];
    let inLexicon = this.getLexChoices(phrase, 5);
    for (let p of inLexicon) {
      if (!this.phones[p]) continue;
      for (let phone of this.phones[p]) {
        phones.push(phone);
      }
    }
  
    // Try breaking into parts.
    let space = phrase.indexOf(' ');
    if (space < 0) {
      space = phrase.indexOf('-');
    }
    if (space > 0) {
      const part1 = phrase.substr(0, space);
      const part1_phones = this.getPhones(part1);
      if (part1_phones.length > 0) {
        const part2 = phrase.substr(space + 1);
        const part2_phones = this.getPhones(part2);
        for (let p2 of part2_phones) {
          for (let p1 of part1_phones) {
            phones.push(p1.concat(p2));
          }
        }
      }
    }
    return this.dedupe(phones);
  }
  
  exetLexicon.getSpoonerismsInner = function(phrase, phones) {
    const spoons = [];
    const nphrase = this.letterString(phrase);
    const NUM_SHARDS = this.phindex.length;
  
    for (let phone of phones) {
      const nonVowelSpans = [];
      let currSpan = [-1, -1];
      for (let i = 0; i < phone.length; i++) {
        if (!this.vowelPhonemes[phone[i]]) {
          if (currSpan[0] < 0) {
            currSpan[0] = i;
          }
        } else {
          if (currSpan[0] >= 0) {
            currSpan[1] = i;
            nonVowelSpans.push(currSpan);
            currSpan = [-1, -1];
          }
        }
      }
      if (currSpan[0] >= 0 && currSpan[1] < 0) {
        currSpan[1] = phone.length;
        nonVowelSpans.push(currSpan);
      }
      if (nonVowelSpans.length < 2) {
        continue;
      }
      if (nonVowelSpans[0][0] > 0) {
        // We do not deal with phrases that start with vowels.
        continue;
      }
      for (let last1 = nonVowelSpans[0][0]; last1 < nonVowelSpans[0][1]; last1++) {
        for (let second_span = 1; second_span < nonVowelSpans.length;
             second_span++) {
          for (let last2 = nonVowelSpans[second_span][0];
               last2 < nonVowelSpans[second_span][1]; last2++) {
            for (let start2 = nonVowelSpans[second_span][0];
                 start2 <= last2; start2++) {
              const phone1 = phone.slice(start2, last2 + 1).concat(
                  phone.slice(last1 + 1, start2));
              if (phone1.length == 0) continue;
              const phone2 = phone.slice(0, last1 + 1).concat(
                  phone.slice(last2 + 1));
              if (phone2.length == 0) continue;
  
              const phone1_str = phone1.join('');
              let shard = this.javaHash(phone1_str) % NUM_SHARDS;
              if (shard < 0) shard += NUM_SHARDS;
              const q1list = [];
              for (let q1 of this.phindex[shard]) {
                if (!this.containsPhone(q1, phone1_str)) continue;
                q1list.push(this.lexicon[q1]);
              }
  
              if (q1list.length == 0) continue;
  
              const phone2_str = phone2.join('');
              shard = this.javaHash(phone2_str) % NUM_SHARDS;
              if (shard < 0) shard += NUM_SHARDS;
              const q2list = [];
              for (let q2 of this.phindex[shard]) {
                if (!this.containsPhone(q2, phone2_str)) continue;
                q2list.push(this.lexicon[q2]);
              }
  
              if (q2list.length == 0) continue;
  
              for (let q1 of q1list) {
                for (let q2 of q2list) {
                  spoons.push([q1, q2]);
                }
              }
            }
          }
        }
      }
    }
    return this.dedupe(spoons);
  }
  
  exetLexicon.getSpoonerisms = function(phrase) {
    return this.getSpoonerismsInner(phrase, this.getPhones(phrase));
  }
  
  exetLexicon.getHomophonesInner = function(phrase, phones) {
    const hp = [];
    const nphrase = this.letterString(phrase);
    const NUM_SHARDS = this.phindex.length;
  
    for (let phone of phones) {
      const phone_str = phone.join('');
      let shard = this.javaHash(phone_str) % NUM_SHARDS;
      if (shard < 0) shard += NUM_SHARDS;
      for (let q of this.phindex[shard]) {
        if (!this.containsPhone(q, phone_str)) continue;
        const qphrase = this.lexicon[q];
        if (nphrase == this.letterString(qphrase)) {
          continue;
        }
        hp.push(qphrase);
      }
  
      // Now try splitting phone into two parts.
      for (let i = 1; i <= phone.length - 1; i++) {
        const phone1 = phone.slice(0, i);
        const phone1_str = phone1.join('');
        shard = this.javaHash(phone1_str) % NUM_SHARDS;
        if (shard < 0) shard += NUM_SHARDS;
        const q1list = [];
        for (let q1 of this.phindex[shard]) {
          if (!this.containsPhone(q1, phone1_str)) continue;
          q1list.push(this.lexicon[q1]);
        }
  
        if (q1list.length == 0) continue;
  
        const phone2 = phone.slice(i);
        const phone2_str = phone2.join('');
        shard = this.javaHash(phone2_str) % NUM_SHARDS;
        if (shard < 0) shard += NUM_SHARDS;
        const q2list = [];
        for (let q2 of this.phindex[shard]) {
          if (!this.containsPhone(q2, phone2_str)) continue;
          q2list.push(this.lexicon[q2]);
        }
  
        if (q2list.length == 0) continue;
  
        for (let q1 of q1list) {
          for (let q2 of q2list) {
            const candidate = q1 + ' ' + q2;
            if (nphrase == this.letterString(candidate)) continue;
            hp.push(candidate);
          }
        }
      }
    }
    return this.dedupe(hp);
  }
  
  exetLexicon.getHomophones = function(phrase) {
    return this.getHomophonesInner(phrase, this.getPhones(phrase));
  }
}
