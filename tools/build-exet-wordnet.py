#!/usr/bin/env python3
"""Build exet-wordnet.js from Princeton WordNet dict data files.

Usage:
  # From a WordNet dict directory (data.noun, data.verb, data.adj, data.adv):
  python3 tools/build-exet-wordnet.py /path/to/dict

  # Or from the wordnet-db npm package contents:
  npm pack wordnet-db && tar -xzf wordnet-db-*.tgz
  python3 tools/build-exet-wordnet.py package/dict

Writes exet-wordnet.js in the repository root (or --out PATH).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

POS_FILES = {
    "n": "data.noun",
    "v": "data.verb",
    "a": "data.adj",
    "r": "data.adv",
}

WORD_LINE_RE = re.compile(r"^[0-9a-f]{8} ")

API_TEMPLATE = r"""/**
 * Client-side WordNet synonym lookup for Exet.
 * Data derived from Princeton WordNet 3.1 (via wordnet-db).
 * WordNet 3.0 Copyright 2006 by Princeton University. All rights reserved.
 * See about-exet.html for the full WordNet license notice.
 */
exetWordNet = (function() {
  const DATA = %DATA%;
  const POS_LABEL = {n: 'noun', v: 'verb', a: 'adj', r: 'adv'};

  function normalize(word) {
    if (!word) return '';
    return String(word)
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[_]+/g, ' ')
      .replace(/[-\u2013\u2014]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Simple morphological fallbacks when an exact lemma is missing. */
  function candidates(word) {
    const w = normalize(word);
    if (!w) return [];
    const out = [w];
    const add = (x) => { if (x && x !== w && out.indexOf(x) < 0) out.push(x); };
    add(w.replace(/[.!?]+$/g, ''));
    if (w.endsWith('ies') && w.length > 4) add(w.slice(0, -3) + 'y');
    if (w.endsWith('es') && w.length > 3) add(w.slice(0, -2));
    if (w.endsWith('s') && !w.endsWith('ss') && w.length > 2) add(w.slice(0, -1));
    if (w.endsWith('ied') && w.length > 4) add(w.slice(0, -3) + 'y');
    if (w.endsWith('ed') && w.length > 3) {
      add(w.slice(0, -2));
      add(w.slice(0, -1));
    }
    if (w.endsWith('ing') && w.length > 4) {
      add(w.slice(0, -3));
      add(w.slice(0, -3) + 'e');
    }
    if (w.endsWith('iest') && w.length > 5) add(w.slice(0, -4) + 'y');
    if (w.endsWith('er') && w.length > 3) add(w.slice(0, -2));
    if (w.endsWith('est') && w.length > 4) add(w.slice(0, -3));
    if (w.endsWith('ly') && w.length > 3) add(w.slice(0, -2));
    return out;
  }

  function lookUp(word) {
    if (!DATA || !DATA.i) return [];
    // Incomplete / wildcard answers are not looked up.
    if (/[?]/.test(word || '')) return [];
    const tried = candidates(word);
    for (let t = 0; t < tried.length; t++) {
      const key = tried[t];
      const idxs = DATA.i[key];
      if (!idxs || !idxs.length) continue;
      const results = [];
      const seen = {};
      for (let k = 0; k < idxs.length; k++) {
        const si = idxs[k];
        if (seen[si]) continue;
        seen[si] = true;
        const syn = DATA.s[si];
        if (!syn) continue;
        const pos = syn[0];
        const lemmas = syn[1] || [];
        const gloss = syn[2] || '';
        const synonyms = [];
        for (let j = 0; j < lemmas.length; j++) {
          if (lemmas[j] !== key) synonyms.push(lemmas[j]);
        }
        results.push({
          lemma: key,
          pos: pos,
          posLabel: POS_LABEL[pos] || pos,
          synonyms: synonyms,
          gloss: gloss,
          synsetWords: lemmas.slice(),
        });
      }
      return results;
    }
    return [];
  }

  /** Flat unique synonym list (excluding the matched lemma). */
  function getSynonyms(word) {
    const results = lookUp(word);
    const out = [];
    const seen = {};
    for (let i = 0; i < results.length; i++) {
      const syns = results[i].synonyms;
      for (let j = 0; j < syns.length; j++) {
        const s = syns[j];
        if (!seen[s]) {
          seen[s] = true;
          out.push(s);
        }
      }
    }
    return out;
  }

  return {
    version: DATA.version,
    lookUp: lookUp,
    getSynonyms: getSynonyms,
    normalize: normalize,
  };
})();
"""


def parse_dict(dict_dir: Path):
    synsets = []
    lemma_index = {}
    for pos, fname in POS_FILES.items():
        path = dict_dir / fname
        if not path.is_file():
            raise SystemExit(f"Missing WordNet data file: {path}")
        print(f"Parsing {path} ...", file=sys.stderr)
        with path.open("r", encoding="utf-8", errors="replace") as f:
            for line in f:
                if not WORD_LINE_RE.match(line):
                    continue
                if "|" in line:
                    body, gloss = line.split("|", 1)
                    gloss = gloss.strip()
                else:
                    body, gloss = line.rstrip(), ""
                parts = body.split()
                ss_type = parts[2]
                if ss_type == "s":
                    ss_type = "a"
                w_cnt = int(parts[3], 16)
                lemmas = []
                idx = 4
                for _ in range(w_cnt):
                    lemma = parts[idx].replace("_", " ").lower()
                    idx += 2
                    lemmas.append(lemma)
                syn_idx = len(synsets)
                synsets.append([ss_type, lemmas, gloss])
                for lemma in lemmas:
                    lemma_index.setdefault(lemma, []).append(syn_idx)
    return synsets, lemma_index


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("dict_dir", type=Path, help="Directory with WordNet data.* files")
    ap.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "exet-wordnet.js",
        help="Output JS path (default: repo-root/exet-wordnet.js)",
    )
    ap.add_argument("--version", default="3.1", help="WordNet version string to embed")
    args = ap.parse_args()

    synsets, lemma_index = parse_dict(args.dict_dir)
    print(f"Synsets: {len(synsets)}", file=sys.stderr)
    print(f"Lemmas: {len(lemma_index)}", file=sys.stderr)

    payload = {"version": args.version, "s": synsets, "i": lemma_index}
    data_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    js = API_TEMPLATE.replace("%DATA%", data_json)
    args.out.write_text(js, encoding="utf-8")
    print(f"Wrote {args.out} ({args.out.stat().st_size / (1024 * 1024):.2f} MiB)", file=sys.stderr)


if __name__ == "__main__":
    main()
