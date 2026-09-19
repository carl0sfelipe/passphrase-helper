(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PassphraseCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const CASE_KEEPING = new Set(["as-typed"]);
  const CASE_FORCING_UPPER = new Set(["scream", "upper-space"]);

  function cap(word) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  function isUpperLetter(ch) {
    return ch !== ch.toLowerCase();
  }

  function isLowerLetter(ch) {
    return ch !== ch.toUpperCase();
  }

  function letterFlags(typed) {
    const flags = [];
    for (const ch of typed) {
      if (isUpperLetter(ch)) flags.push("U");
      else if (isLowerLetter(ch)) flags.push("L");
    }
    return flags;
  }

  function paintCase(typed, dictLower) {
    const flags = letterFlags(typed);
    if (!flags.length) return dictLower;
    if (flags.every((f) => f === "U")) return dictLower.toUpperCase();
    if (flags.every((f) => f === "L")) return dictLower;

    let fi = 0;
    let out = "";
    for (const ch of dictLower) {
      const upper = ch.toUpperCase();
      const lower = ch.toLowerCase();
      if (upper === lower) {
        out += ch;
        continue;
      }
      if (fi < flags.length) {
        out += flags[fi] === "U" ? upper : lower;
        fi += 1;
      } else {
        out += lower;
      }
    }
    return out;
  }

  function completePreserving(typed, dictWord) {
    const dictLower = String(dictWord).toLowerCase();
    const q = String(typed).toLowerCase();
    if (dictLower === q) return String(typed);
    if (dictLower.startsWith(q)) {
      const rest = dictLower.slice(String(typed).length);
      const flags = letterFlags(typed);
      const allUpper = flags.length > 0 && flags.every((f) => f === "U");
      return String(typed) + (allUpper ? rest.toUpperCase() : rest);
    }
    return paintCase(typed, dictLower);
  }

  function format(tokens, style) {
    if (!tokens.length) return "";
    const lower = tokens.map((w) => String(w).toLowerCase());
    switch (style) {
      case "as-typed":
        return tokens.join(" ");
      case "lower-space":
        return lower.join(" ");
      case "title":
        return tokens.map(cap).join(" ");
      case "sentence":
        return [cap(tokens[0]), ...lower.slice(1)].join(" ");
      case "camel":
        return lower[0] + tokens.slice(1).map(cap).join("");
      case "pascal":
        return tokens.map(cap).join("");
      case "snake":
        return lower.join("_");
      case "kebab":
        return lower.join("-");
      case "scream":
        return tokens.map((w) => String(w).toUpperCase()).join("_");
      case "upper-space":
        return tokens.map((w) => String(w).toUpperCase()).join(" ");
      case "none":
        return lower.join("");
      default:
        return tokens.join(" ");
    }
  }

  function formatChangesTyped(tokens, style) {
    if (!tokens.length) return false;
    if (CASE_KEEPING.has(style) || !style) return false;
    return format(tokens, style) !== tokens.join(" ");
  }

  function formatDestroysUserCase(tokens, style) {
    if (!tokens.length) return false;
    if (CASE_KEEPING.has(style) || !style) return false;
    if (CASE_FORCING_UPPER.has(style)) return tokens.some((t) => /[a-z]/.test(t));
    const typed = tokens.join(" ");
    const letters = typed.replace(/[^A-Za-zÀ-ÿ]/g, "");
    if (!letters) return false;
    const mixedOrUpper = /[A-ZÀ-Ý]/.test(letters);
    return mixedOrUpper && style !== "as-typed";
  }

  function splitDraft(value) {
    if (!value || !String(value).trim()) return { accepted: [], current: "" };
    const trailingSpace = /\s$/.test(value);
    const parts = String(value).trim().split(/\s+/);
    if (trailingSpace) return { accepted: parts, current: "" };
    return { accepted: parts.slice(0, -1), current: parts[parts.length - 1] };
  }

  function tokensFromDraft(value) {
    const { accepted, current } = splitDraft(value);
    return current ? accepted.concat(current) : accepted;
  }

  function outputText(draft, style) {
    return format(tokensFromDraft(draft), style || "as-typed");
  }

  function copyPayload(draft, style) {
    const text = outputText(draft, style || "as-typed");
    return text;
  }

  function copyNoteFor(text, style, tokens) {
    if (!text) return "";
    const warn = formatDestroysUserCase(tokens || tokensFromDraft(text), style);
    if (warn) return `Copiado (formato alterou o case): ${text}`;
    return `Copiado exatamente: ${text}`;
  }

  function damerau(a, b) {
    a = String(a);
    b = String(b);
    if (Math.abs(a.length - b.length) > 2) return 99;
    const al = a.length;
    const bl = b.length;
    const prev2 = new Uint8Array(bl + 1);
    const prev = new Uint8Array(bl + 1);
    const cur = new Uint8Array(bl + 1);
    for (let j = 0; j <= bl; j++) prev[j] = j;
    for (let i = 1; i <= al; i++) {
      cur[0] = i;
      let rowMin = cur[0];
      const ca = a.charCodeAt(i - 1);
      const ca2 = i > 1 ? a.charCodeAt(i - 2) : 0;
      for (let j = 1; j <= bl; j++) {
        const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
        let val = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (i > 1 && j > 1 && ca === b.charCodeAt(j - 2) && ca2 === b.charCodeAt(j - 1)) {
          val = Math.min(val, prev2[j - 2] + 1);
        }
        cur[j] = val;
        if (val < rowMin) rowMin = val;
      }
      if (rowMin > 2) return 99;
      prev2.set(prev);
      prev.set(cur);
    }
    return prev[bl];
  }

  function createIndex(words, uniquePrefix) {
    const list = Array.isArray(words) ? words.slice() : [];
    const byLower = new Map(list.map((w) => [w.toLowerCase(), w]));
    const prefix2 = new Map();
    const prefixUnique = new Map();
    const n = uniquePrefix || 0;
    const counts = n ? new Map() : null;
    for (const word of list) {
      const lower = word.toLowerCase();
      const two = lower.slice(0, 2);
      if (!prefix2.has(two)) prefix2.set(two, []);
      prefix2.get(two).push(word);
      if (counts) {
        const prefix = lower.slice(0, n);
        counts.set(prefix, (counts.get(prefix) || 0) + 1);
      }
    }
    if (counts) {
      for (const word of list) {
        const prefix = word.slice(0, n).toLowerCase();
        if (counts.get(prefix) === 1) prefixUnique.set(prefix, word);
      }
    }
    return { words: list, byLower, prefix2, prefixUnique, uniquePrefix: n };
  }

  function candidates(index, query) {
    const q = String(query).toLowerCase();
    if (q.length >= 2) return index.prefix2.get(q.slice(0, 2)) || [];
    if (!q) return [];
    const out = [];
    for (const [key, arr] of index.prefix2) {
      if (key.startsWith(q[0])) out.push(...arr);
    }
    return out;
  }

  function rank(query, index, opts) {
    const q = String(query).toLowerCase();
    if (!q) return [];
    opts = opts || {};
    const starts = [];
    const contains = [];
    const near = [];
    const uniqueLen = index.uniquePrefix || 0;
    const pool = candidates(index, q);
    const listSets = opts.listSets || {};
    const preferred = opts.preferred || [];
    const activeId = opts.activeId || "";
    const sourceTag = opts.sourceTag || (() => "");

    for (const word of pool) {
      const w = word.toLowerCase();
      if (w === q || w.startsWith(q)) {
        starts.push(word);
        continue;
      }
      if (q.length >= 3 && w.includes(q)) contains.push(word);
    }

    if (!starts.length && q.length >= 3) {
      const maxDistance = q.length >= 4 ? 2 : 1;
      for (const word of index.words) {
        const w = word.toLowerCase();
        if (w === q || w.startsWith(q)) continue;
        if (Math.abs(w.length - q.length) > maxDistance) continue;
        const d = damerau(q, w);
        if (d > 0 && d <= maxDistance) near.push({ word, d });
      }
    }

    const popularity = (word) => {
      const key = word.toLowerCase();
      for (const id of preferred) {
        if (listSets[id] && listSets[id].has(key)) return 0;
      }
      return 1;
    };
    starts.sort((a, b) => {
      const exactA = a.toLowerCase() === q ? 0 : 1;
      const exactB = b.toLowerCase() === q ? 0 : 1;
      return exactA - exactB || popularity(a) - popularity(b) || a.length - b.length || a.localeCompare(b);
    });
    contains.sort((a, b) => {
      const ia = a.toLowerCase().indexOf(q);
      const ib = b.toLowerCase().indexOf(q);
      return ia - ib || a.localeCompare(b);
    });
    near.sort((a, b) => a.d - b.d || a.word.localeCompare(b.word));

    const out = [];
    const seen = new Set();
    const push = (word, tag, kind) => {
      const key = word.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        word,
        tag,
        kind,
        display: completePreserving(query, word),
      });
    };

    for (const word of starts) {
      const unique =
        uniqueLen &&
        q.length >= uniqueLen &&
        index.prefixUnique.get(q.slice(0, uniqueLen)) === word;
      let tag = "começa com";
      if (word.toLowerCase() === q) tag = "exata";
      else if (unique) tag = "prefixo único";
      else if (activeId === "all") tag = sourceTag(word) || tag;
      push(word, tag, "prefix");
    }

    if (!starts.length) {
      for (const word of contains) {
        push(word, activeId === "all" ? sourceTag(word) || "contém" : "contém", "contains");
      }
      for (const item of near) {
        push(item.word, item.d === 1 ? "typo 1" : "typo 2", "typo");
      }
    }

    return out.slice(0, opts.limit || 8);
  }

  function shouldInterceptTab(suggestionCount) {
    return Number(suggestionCount) > 0;
  }

  function uniqueReady(current, suggestions, uniquePrefix) {
    if (!current || !uniquePrefix || String(current).length < uniquePrefix) return false;
    return Boolean(suggestions && suggestions[0] && suggestions[0].tag === "prefixo único");
  }

  function undoLastAccept(draft) {
    const value = String(draft || "");
    if (!value.trim()) return "";
    if (/\s$/.test(value)) {
      const parts = value.trim().split(/\s+/);
      if (parts.length <= 1) return parts[0] || "";
      return `${parts.slice(0, -1).join(" ")} `;
    }
    const { accepted } = splitDraft(value);
    if (accepted.length) return `${accepted.join(" ")} `;
    return "";
  }

  function ghostParts(typed, dictWord) {
    const display = completePreserving(typed, dictWord);
    const keep = String(typed);
    if (display.length >= keep.length && display.slice(0, keep.length) === keep) {
      return { keep, add: display.slice(keep.length), display };
    }
    return { keep: "", add: display, display };
  }

  function applyAccept(draft, dictWord) {
    const { accepted, current } = splitDraft(draft);
    const filled = completePreserving(current, dictWord);
    return `${[...accepted, filled].join(" ")} `;
  }

  return {
    cap,
    isUpperLetter,
    isLowerLetter,
    letterFlags,
    paintCase,
    completePreserving,
    format,
    formatChangesTyped,
    formatDestroysUserCase,
    splitDraft,
    tokensFromDraft,
    outputText,
    copyPayload,
    copyNoteFor,
    damerau,
    createIndex,
    candidates,
    rank,
    shouldInterceptTab,
    uniqueReady,
    undoLastAccept,
    ghostParts,
    applyAccept,
    CASE_KEEPING,
  };
});
