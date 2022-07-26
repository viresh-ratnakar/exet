/*
MIT License

Copyright (c) 2022 Viresh Ratnakar

See the full Exet license notice in exet.html.

Current version: v0.73 July 26, 2022
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

  // Set of all letters in the lexicon and their frequencies.
  exetLexicon.allLetters = {}
  exetLexicon.letterFrequencies = {}
  for (let c of exetLexicon.letters) {
    const cu = c.toUpperCase();
    exetLexicon.allLetters[cu] = true;
    exetLexicon.letterFrequencies[cu] = 0;
  }
  for (let w of exetLexicon.lexicon) {
    for (let c of w) {
      const cu = c.toUpperCase();
      if (!exetLexicon.allLetters[cu]) continue;
      exetLexicon.letterFrequencies[cu] += 1;
    }
  }
  let maxFreq = 0;
  let minFreq = Number.MAX_VALUE;
  for (let c in exetLexicon.letterFrequencies) {
    if (exetLexicon.letterFrequencies[c] > maxFreq) maxFreq = exetLexicon.letterFrequencies[c];
    if (exetLexicon.letterFrequencies[c] < minFreq) minFreq = exetLexicon.letterFrequencies[c];
  }
  exetLexicon.letterRarities = {}
  for (let c in exetLexicon.letterFrequencies) {
    let x = 1.0 - ((exetLexicon.letterFrequencies[c] - minFreq) /
                   (maxFreq - minFreq));
    if (x < 0.7) x = 0.7;
    exetLexicon.letterRarities[c] = 1.0 + (1.5 * (x - 0.7) / 0.3);
  }
  exetLexicon.vowelPhonemes = {
    'AA': true, 'AE': true, 'AH': true, 'AO': true, 'AW': true, 'AY': true,
    'EH': true, 'ER': true, 'EY': true, 'IH': true, 'IY': true, 'OW': true,
    'OY': true, 'UH': true, 'UW': true,
  };

  /**
   * Remove all punctuation, normalize spaces, only retain
   * letters and dashes and quotes and spaces.
   */
  exetLexicon.depunct = function(s) {
    let out = ''
    for (let c of s) {
      if (c == ' ' || c == '-' || c == "'" ||
          this.allLetters[c.toUpperCase()]) {
        out += c
      } else if (c == '—') {
        out += ' '
      }
    }
    return out.replace(/\s+/g, ' ').toLowerCase().trim()
  }

  /**
   * Sequence of just the letters of s, lowercased.
   */
  exetLexicon.lcLettersOf = function(s) {
    const sl = s.toLowerCase();
    let out = '';
    for (let c of sl) {
      if (this.allLetters[c.toUpperCase()]) {
        out += c;
      }
    }
    return out;
  }

  exetLexicon.letterRarity = function(c) {
    const cu = c.toUpperCase()
    return this.letterRarities[cu] || 0;
  }

  exetLexicon.makeLexKey = function(partialSol) {
    let key = ''
    if (!partialSol) return key;
    let lowerSol = partialSol.toLowerCase()
    for (let i = 0; i < partialSol.length; ++i) {
      let c = lowerSol.charAt(i);
      if ((c >= 'a' && c <= 'z') || c == '?') {
        key = key + c;
      }
    }
    return key;
  }
  
  exetLexicon.generalizeKey = function(key) {
    for (let i = key.length - 1; i >= 0; --i) {
      if (key.charAt(i) != '?') {
        return key.substr(0, i) + '?' + key.substr(i + 1);
      }
    }
    return key;
  }
  
  exetLexicon.keyMatchesPhrase = function(key, phrase) {
    let phraseKey = this.makeLexKey(phrase)
    if (phraseKey.length != key.length) {
      return false;
    }
    for (let i = 0; i < key.length; i++) {
      if (key.charAt(i) != '?' &&
          key.charAt(i) != phraseKey.charAt(i)) {
        return false;
      }
    }
    return true
  }
  
  exetLexicon.isProperNoun = function(s) {
    const first = s.charAt(0);
    return first.toUpperCase() == first && s.charAt(1) != '-';
  }

  exetLexicon.getLex = function(idx) {
    return this.lexicon[Math.abs(idx)];
  }

  exetLexicon.reverse = function(s) {
    return s.split("").reverse().join("");
  }
  
  /**
   * partialSol can contain letters, question-marks, spaces, hyphens.
   * limit=0 for all matches, else return at most limit matches.
   * dontReuse should be an object with dontReuse[idx] set to true for lexicon indices that have already been used. It will get updated.
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
    let choices = []
    const key = this.makeLexKey(partialSol);
    if (!key) return choices
    const rkey = tryRev ? this.reverse(key) : '';
    // First look at preferred choices (these may have idx >= indexLimit)
    let seen = {}
    if (preflexByLen[key.length]) {
      for (idx of preflexByLen[key.length]) {
        if (dontReuse[idx]) continue
        let phrase = this.lexicon[idx]
        if (this.keyMatchesPhrase(key, phrase)) {
          choices.push(idx)
          seen[idx] = true
        }
        if (tryRev && this.keyMatchesPhrase(rkey, phrase)) {
          const ridx = 0 - idx;
          choices.push(ridx)
          seen[ridx] = true
        }
      }
    }
    const loops = tryRev ? 2 : 1;
    for (let i = 0; (i < loops) && (limit <= 0 || choices.length < limit); i++) {
      const loopKey = (i == 0) ? key : rkey;
      let gkey = loopKey;
      while (!this.index[gkey]) {
        const ngkey = this.generalizeKey(gkey)
        if (ngkey == gkey) return choices
        gkey = ngkey;
      }
      let indices = this.index[gkey];
      for (let idx of indices) {
        if (idx >= indexLimit) break
        if (dontReuse[idx]) continue
        if (unpreflex[idx]) continue
        let phrase = this.lexicon[idx]
        if (noProperNouns && this.isProperNoun(phrase)) {
          continue
        }
        const loopIdx = (i == 0) ? idx : 0 - idx;
        if (this.keyMatchesPhrase(loopKey, phrase) && !seen[loopIdx]) {
          choices.push(loopIdx)
          if (limit > 0 && choices.length >= limit) break
        }
      }
    }
    return choices;
  }
  
  exetLexicon.javaHash = function(key) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      let c = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + c;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
  
  exetLexicon.makeAnagramKey = function(phrase) {
    return phrase.toLowerCase().replace(/ /g, '').split('').sort().join('')
  }

  exetLexicon.getAnagrams1 = function(phrase, limit=0, getIndices=false) {
    const key = this.makeAnagramKey(phrase);
    const NUM_SHARDS = this.anagrams.length
    let shard = this.javaHash(key) % NUM_SHARDS
    if (shard < 0) shard += NUM_SHARDS
    const anagrams = []
    for (let idx of this.anagrams[shard]) {
      let candidate = this.lexicon[idx]
      if (this.makeAnagramKey(candidate) == key) {
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
    const anagrams1 = this.getAnagrams1(phrase, limit);
    const phraseLen = phrase.length;
    if (phraseLen < 4 || (limit > 0 && anagrams1.length >= limit)) {
      return anagrams1;
    }
    const multiK = (phraseLen <= 7) ? 2 : ((phraseLen <= 10) ? 3 : 4);
    if (limit > 0) {
      limit -= anagrams1.length;
    }
    const anagramsK = this.getAnagramsK(phrase, limit, multiK, seqOK);
    return anagrams1.concat(anagramsK);
  }
  
  /**
   * Multi-word anagrams of phrases.
   *
   * Simply using the letter-histogram as the key doesn't work, as we cannot
   * index all possible k-word phrases even for k=2. We can try looking at
   * some subset of the letters first. But, for an n-letter phrase, the
   * number of subsets to look at is 2^n (or something like that, depending
   * on repetitions). So, we use "salient letter key"s (slKey). From letter
   * frequencies in words, the most common 8 letters are [eisarnto]. We
   * build a histogram key of the phrase using only these letters. This leads
   * to an index where the key 'ae' has the biggest mass, at around 1000
   * lexicon words. Next, we limit the subsets to examine as follows. For
   * each salient letter in the phrase, limit its possible counts (in the
   * subset to examine) so that the total number of possibilities is <= 1000.
   * For each subset, we go through all possible candidate words that have
   * that specific slKey (< 1000), and for each candidate, we check if its
   * full letter histogram is subsumed by the full letter histogram of the phrase.
   */
  
  exetLexicon.getSubsetAnagrams = function(phrase, seqOK) {
    const slk = this.slKey(phrase);
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
    const fullHist = this.letterHist(phrase);
    const subkey = [0,0,0,0,0,0,0,0];
    const anagrams = [];
    const phraseSeq = seqOK ? '' : this.lcLettersOf(phrase);
  
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
                      const word = this.lexicon[wordIndex];
                      const wordHist = this.letterHist(word);
                      const diffHist = this.letterHistSub(fullHist, wordHist);
                      if (!diffHist) continue;
                      if (!seqOK &&
                          phraseSeq.includes(this.lcLettersOf(word))) {
                        continue;
                      }
                      anagrams.push([wordIndex, diffHist]);
    } } } } } } } } }
    return anagrams;
  }

  exetLexicon.letterHist = function(phrase) {
    const hist = [
      0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0];
    for (let l of phrase) {
      const lc = l.toLowerCase().charCodeAt() - 97;
      if (lc < 0 || lc > 25) continue;
      hist[lc]++;
    }
    return hist;
  }
  
  /**
   * Returns null if h2 is not a strict subset of h1. Otherwise returns h1-h2.
   */
  exetLexicon.letterHistSub = function(h1, h2) {
    const ret = h1.slice();
    let allZeros = true;
    for (let i = 0; i < 26; i++) {
      ret[i] = ret[i] - h2[i];
      if (ret[i] < 0) return null;
      if (ret[i] > 0) allZeros = false;
    }
    if (allZeros) return null;
    return ret;
  }
  
  exetLexicon.slKey = function(phrase) {
    const hist = [0,0,0,0,0,0,0,0];
    for (let l of phrase) {
      const idx = this.SLK_CODES.indexOf(l.toLowerCase().charCodeAt());
      if (idx < 0) continue;
      hist[idx]++;
    }
    return hist;
  }
  
  /**
   * Initialize anagram-related indices.
   */
  exetLexicon.initAnagrammer = function() {
    this.SLK_LETTERS = 'eisarnto';
    console.assert(this.SLK_LETTERS.length == 8, this.SLK_LETTERS);
    this.SLK_CODES = [];
    for (let l of this.SLK_LETTERS) {
      this.SLK_CODES.push(l.charCodeAt());
    }
    this.slkIndex = {};
    for (let idx = 1; idx < this.lexicon.length; idx++) {
      const entry = this.lexicon[idx];
      const k = this.slKey(entry);
      if (!this.slkIndex[k]) this.slkIndex[k] = [];
      this.slkIndex[k].push(idx);
    }
  }
  exetLexicon.initAnagrammer();
  
  exetLexicon.lettersFromHist = function(h) {
    let ret = '';
    for (let i = 0; i < 26; i++) {
      const c = String.fromCharCode(97 + i).repeat(h[i]);
      ret = ret + c;
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
  
  exetLexicon.getAnagramsK = function(phrase, limit, k, seqOK) {
    return this.lexToSortedWords(
        this.getAnagramsKIndices(phrase, limit, k, seqOK));
  }
  
  exetLexicon.getAnagramsKIndices = function(phrase, limit, k, seqOK) {
    console.assert(k > 1, k);
    console.assert(limit >= 0, limit);
    const anagrams = [];
    const seenAnagrams = {};
    const partials = this.getSubsetAnagrams(phrase, seqOK);
    const phraseSeq = seqOK ? '' : this.lcLettersOf(phrase);
    for (let partial of partials) {
      const delta = this.lettersFromHist(partial[1]);
      if (!delta) continue;
      const deltaAnagrams = this.getAnagrams1(delta, limit, true);
      for (let deltaAnagram of deltaAnagrams) {
        if (!seqOK &&
            phraseSeq.includes(this.lcLettersOf(
                this.lexicon[deltaAnagram]))) {
          continue;
        }
        candidate = [partial[0], deltaAnagram].sort((a, b) => a - b);
        if (!seenAnagrams[candidate]) {
          seenAnagrams[candidate] = true;
          anagrams.push(candidate);
          if (limit > 0) {
            limit--;
            if (limit == 0) return anagrams;
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
      if (!delta) continue;
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
  
  /**
   * End of code for multi-word anagrams.
   */

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
            phones.push(p1 + ' ' + p2);
          }
        }
      }
    }
    return this.dedupe(phones);
  }
  
  exetLexicon.getSpoonerismsInner = function(phrase, phones) {
    const spoons = [];
    const nphrase = this.lcLettersOf(phrase);
    const NUM_SHARDS = this.phindex.length;
  
    for (let phone of phones) {
      const pparts = phone.split(' ');
      const nonVowelSpans = [];
      let currSpan = [-1, -1];
      for (let i = 0; i < pparts.length; i++) {
        if (!this.vowelPhonemes[pparts[i]]) {
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
        currSpan[1] = pparts.length;
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
              const phone1_arr = pparts.slice(start2, last2 + 1).concat(
                  pparts.slice(last1 + 1, start2));
              if (phone1_arr.length == 0) continue;
              const phone2_arr = pparts.slice(0, last1 + 1).concat(
                  pparts.slice(last2 + 1));
              if (phone2_arr.length == 0) continue;
  
              const phone1 = phone1_arr.join(' ');
              let shard = this.javaHash(phone1) % NUM_SHARDS;
              if (shard < 0) shard += NUM_SHARDS;
              const q1list = [];
              for (let q1 of this.phindex[shard]) {
                if (!this.phones[q1] ||
                    !this.phones[q1].includes(phone1)) continue;
                q1list.push(this.lexicon[q1]);
              }
  
              if (q1list.length == 0) continue;
  
              const phone2 = phone2_arr.join(' ');
              shard = this.javaHash(phone2) % NUM_SHARDS;
              if (shard < 0) shard += NUM_SHARDS;
              const q2list = [];
              for (let q2 of this.phindex[shard]) {
                if (!this.phones[q2] ||
                    !this.phones[q2].includes(phone2)) continue;
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
    const nphrase = this.lcLettersOf(phrase);
    const NUM_SHARDS = this.phindex.length;
  
    for (let phone of phones) {
      let shard = this.javaHash(phone) % NUM_SHARDS;
      if (shard < 0) shard += NUM_SHARDS;
      for (let q of this.phindex[shard]) {
        if (!this.phones[q] ||
            !this.phones[q].includes(phone)) continue;
        const qphrase = this.lexicon[q];
        if (nphrase == this.lcLettersOf(qphrase)) {
          continue;
        }
        hp.push(qphrase);
      }
  
      // Now try splitting phone into two parts.
      const pparts = phone.split(' ');
      for (let i = 1; i <= pparts.length - 1; i++) {
        const phone1 = pparts.slice(0, i).join(' ');
        shard = this.javaHash(phone1) % NUM_SHARDS;
        if (shard < 0) shard += NUM_SHARDS;
        const q1list = [];
        for (let q1 of this.phindex[shard]) {
          if (!this.phones[q1] ||
              !this.phones[q1].includes(phone1)) continue;
          q1list.push(this.lexicon[q1]);
        }
  
        if (q1list.length == 0) continue;
  
        const phone2 = pparts.slice(i).join(' ');
        shard = this.javaHash(phone2) % NUM_SHARDS;
        if (shard < 0) shard += NUM_SHARDS;
        const q2list = [];
        for (let q2 of this.phindex[shard]) {
          if (!this.phones[q2] ||
              !this.phones[q2].includes(phone2)) continue;
          q2list.push(this.lexicon[q2]);
        }
  
        if (q2list.length == 0) continue;
  
        for (let q1 of q1list) {
          for (let q2 of q2list) {
            const candidate = q1 + ' ' + q2;
            if (nphrase == this.lcLettersOf(candidate)) continue;
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
