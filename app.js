(() => {
  const lists = window.WORDLISTS && typeof window.WORDLISTS === "object" ? window.WORDLISTS : {};
  const meta = Array.isArray(window.WORDLIST_META) ? window.WORDLIST_META : [];

  const draftEl = document.getElementById("draft");
  const suggestEl = document.getElementById("suggest");
  const hintEl = document.getElementById("suggest-hint");
  const listEl = document.getElementById("suggest-list");
  const resultEl = document.getElementById("result");
  const statusEl = document.getElementById("status");
  const copyBtn = document.getElementById("copy");
  const clearBtn = document.getElementById("clear");
  const hideBtn = document.getElementById("hide");
  const copyNote = document.getElementById("copy-note");
  const styleInputs = document.querySelectorAll('input[name="style"]');
  const listSelect = document.getElementById("wordlist");
  const kickerEl = document.getElementById("kicker");
  const listHitEl = document.getElementById("list-hit");
  const useListBtn = document.getElementById("use-list");

  const listSets = {};
  for (const [id, arr] of Object.entries(lists)) {
    listSets[id] = new Set(arr.map((w) => w.toLowerCase()));
  }

  const catalog = {};
  const all = [];
  const allSeen = new Set();
  for (const item of meta) {
    if (item.id === "all") continue;
    const arr = lists[item.id] || [];
    catalog[item.id] = arr;
    for (const word of arr) {
      const key = word.toLowerCase();
      if (allSeen.has(key)) continue;
      allSeen.add(key);
      all.push(word);
    }
  }
  catalog.all = all;

  let activeId = "eff_large";
  let words = [];
  let byLower = new Map();
  let prefixUnique = new Map();
  let prefix2 = new Map();
  let suggestions = [];
  let selected = 0;
  let hidden = false;

  function currentMeta() {
    return meta.find((item) => item.id === activeId) || { id: activeId, label: activeId, uniquePrefix: 0 };
  }

  function sourceTag(word) {
    const key = word.toLowerCase();
    for (const item of meta) {
      if (item.id === "all") continue;
      if (listSets[item.id]?.has(key)) return item.short;
    }
    return "";
  }

  function indexActive() {
    words = catalog[activeId] || [];
    byLower = new Map(words.map((w) => [w.toLowerCase(), w]));
    prefixUnique = new Map();
    prefix2 = new Map();
    const n = currentMeta().uniquePrefix || 0;
    const counts = n ? new Map() : null;
    for (const word of words) {
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
      for (const word of words) {
        const prefix = word.slice(0, n).toLowerCase();
        if (counts.get(prefix) === 1) prefixUnique.set(prefix, word);
      }
    }
  }

  function candidates(query) {
    const q = query.toLowerCase();
    if (q.length >= 2) return prefix2.get(q.slice(0, 2)) || [];
    if (!q) return [];
    const out = [];
    for (const [key, arr] of prefix2) {
      if (key.startsWith(q[0])) out.push(...arr);
    }
    return out;
  }

  function updateKicker() {
    const item = currentMeta();
    const count = words.length.toLocaleString("pt-BR");
    kickerEl.textContent =
      item.id === "all"
        ? `todas as listas · ${count} palavras únicas`
        : `${item.label} · ${count} palavras`;
  }

  function cap(word) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  function format(tokens, style) {
    if (!tokens.length) return "";
    const lower = tokens.map((w) => w.toLowerCase());
    switch (style) {
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
        return tokens.map((w) => w.toUpperCase()).join("_");
      case "upper-space":
        return tokens.map((w) => w.toUpperCase()).join(" ");
      case "none":
        return lower.join("");
      default:
        return lower.join(" ");
    }
  }

  function splitDraft(value) {
    if (!value.trim()) return { accepted: [], current: "" };
    const trailingSpace = /\s$/.test(value);
    const parts = value.trim().split(/\s+/);
    if (trailingSpace) return { accepted: parts, current: "" };
    return { accepted: parts.slice(0, -1), current: parts[parts.length - 1] };
  }

  function levenshtein(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 99;
    const rows = a.length + 1;
    const cols = b.length + 1;
    const prev = new Uint8Array(cols);
    const cur = new Uint8Array(cols);
    for (let j = 0; j < cols; j++) prev[j] = j;
    for (let i = 1; i < rows; i++) {
      cur[0] = i;
      let min = cur[0];
      const ca = a.charCodeAt(i - 1);
      for (let j = 1; j < cols; j++) {
        const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
        const val = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        cur[j] = val;
        if (val < min) min = val;
      }
      if (min > 2) return 99;
      prev.set(cur);
    }
    return prev[b.length];
  }

  function rank(query) {
    const q = query.toLowerCase();
    if (!q) return [];

    const starts = [];
    const contains = [];
    const near = [];
    const uniqueLen = currentMeta().uniquePrefix || 0;
    const pool = candidates(q);

    for (const word of pool) {
      const w = word.toLowerCase();
      if (w === q || w.startsWith(q)) {
        starts.push(word);
        continue;
      }
      if (q.length >= 3 && w.includes(q)) {
        contains.push(word);
        continue;
      }
      const maxDistance = q.length >= 4 ? 2 : q.length === 3 ? 1 : 0;
      if (!maxDistance) continue;
      const d = levenshtein(q, w);
      if (d <= maxDistance) near.push({ word, d });
    }

    const preferred = ["eff_large", "bip39_en", "onepassword", "english10k", "slip39", "monero_en", "diceware"];
    const popularity = (word) => {
      const key = word.toLowerCase();
      for (const id of preferred) {
        if (listSets[id]?.has(key)) return 0;
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
    const push = (word, tag) => {
      const key = word.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ word, tag });
    };

    for (const word of starts) {
      const unique =
        uniqueLen &&
        q.length >= uniqueLen &&
        prefixUnique.get(q.slice(0, uniqueLen)) === word;
      let tag = "começa com";
      if (word.toLowerCase() === q) tag = "exata";
      else if (unique) tag = "prefixo único";
      else if (activeId === "all") tag = sourceTag(word) || tag;
      push(word, tag);
    }

    if (!starts.length) {
      for (const word of contains) {
        push(word, activeId === "all" ? sourceTag(word) || "contém" : "contém");
      }
      for (const item of near) {
        push(item.word, "perto");
      }
    }

    return out.slice(0, 8);
  }

  function currentStyle() {
    const checked = document.querySelector('input[name="style"]:checked');
    return checked ? checked.value : "lower-space";
  }

  function unknown(tokens) {
    return tokens.filter((t) => !byLower.has(t.toLowerCase()));
  }

  function listsContaining(tokens) {
    const keys = tokens.map((t) => t.toLowerCase()).filter(Boolean);
    if (!keys.length) return [];
    return meta.filter((item) => {
      if (item.id === "all") return false;
      const set = listSets[item.id];
      return set && keys.every((key) => set.has(key));
    });
  }

  function outputText() {
    const { accepted, current } = splitDraft(draftEl.value);
    const tokens = current ? accepted.concat(current) : accepted;
    return format(tokens, currentStyle());
  }

  function renderSuggestions() {
    const { current } = splitDraft(draftEl.value);
    suggestions = current ? rank(current) : [];
    selected = Math.min(selected, Math.max(0, suggestions.length - 1));

    if (!suggestions.length) {
      suggestEl.hidden = true;
      listEl.replaceChildren();
      return;
    }

    const uniqueHit = suggestions[0]?.tag === "prefixo único";
    const n = currentMeta().uniquePrefix;
    hintEl.textContent = uniqueHit
      ? `${n} letras já fecham esta palavra — Tab completa`
      : `${suggestions.length} na lista`;

    listEl.replaceChildren(
      ...suggestions.map((item, i) => {
        const li = document.createElement("li");
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", i === selected ? "true" : "false");
        li.dataset.index = String(i);
        const name = document.createElement("span");
        name.textContent = item.word;
        const metaEl = document.createElement("span");
        metaEl.className = "meta";
        metaEl.textContent = item.tag;
        li.append(name, metaEl);
        return li;
      })
    );
    suggestEl.hidden = false;
  }

  function renderResult() {
    const { accepted, current } = splitDraft(draftEl.value);
    const tokens = current ? accepted.concat(current) : accepted;
    resultEl.textContent = format(tokens, currentStyle());
    resultEl.classList.toggle("is-hidden", hidden);

    const count = words.length.toLocaleString("pt-BR");
    if (!tokens.length) {
      statusEl.textContent = `${count} palavras na lista`;
      statusEl.className = "status";
      return;
    }

    const finishedUnknown = unknown(accepted);
    const stuckUnknown =
      current && !byLower.has(current.toLowerCase()) && suggestions.length === 0
        ? [current]
        : [];
    const allBad = finishedUnknown.concat(stuckUnknown);

    const knownTokens = tokens.filter((t) => allSeen.has(t.toLowerCase()));
    const homes = listsContaining(knownTokens);
    if (homes.length === 1) {
      listHitEl.hidden = false;
      listHitEl.textContent = `estas palavras só cabem na ${homes[0].label}`;
      useListBtn.hidden = activeId === homes[0].id;
      useListBtn.dataset.listId = homes[0].id;
    } else if (homes.length > 1 && homes.length <= 4) {
      listHitEl.hidden = false;
      listHitEl.textContent = `cabem em: ${homes.map((item) => item.short).join(", ")}`;
      useListBtn.hidden = true;
    } else {
      listHitEl.hidden = true;
      useListBtn.hidden = true;
    }

    if (allBad.length) {
      statusEl.textContent = `${tokens.length} · fora da lista: ${allBad.join(", ")}`;
      statusEl.className = "status warn";
    } else if (current && !byLower.has(current.toLowerCase())) {
      statusEl.textContent = `${accepted.length} confirmadas · escrevendo…`;
      statusEl.className = "status";
    } else {
      statusEl.textContent = `${tokens.length} · todas na lista`;
      statusEl.className = "status ok";
    }
  }

  function render() {
    renderSuggestions();
    renderResult();
  }

  function accept(word) {
    const { accepted } = splitDraft(draftEl.value);
    draftEl.value = `${[...accepted, word].join(" ")} `;
    selected = 0;
    copyNote.hidden = true;
    render();
  }

  function acceptSelected() {
    if (!suggestions.length) return false;
    accept(suggestions[selected].word);
    return true;
  }

  function setList(id) {
    activeId = catalog[id] ? id : "all";
    if (listSelect && listSelect.value !== activeId) listSelect.value = activeId;
    indexActive();
    updateKicker();
    selected = 0;
    render();
  }

  function buildListSelect() {
    if (!meta.length || !listSelect) return;
    const groups = new Map();
    for (const item of meta) {
      const name = item.group || "Outras";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(item);
    }
    listSelect.replaceChildren();
    for (const [name, items] of groups) {
      const group = document.createElement("optgroup");
      group.label = name;
      for (const item of items) {
        const option = document.createElement("option");
        option.value = item.id;
        const count = (catalog[item.id] || []).length.toLocaleString("pt-BR");
        option.textContent = `${item.label} · ${count}`;
        if (item.id === "eff_large") option.selected = true;
        group.append(option);
      }
      listSelect.append(group);
    }
    listSelect.addEventListener("change", () => setList(listSelect.value));
  }

  draftEl.addEventListener("input", () => {
    selected = 0;
    copyNote.hidden = true;
    render();
  });

  draftEl.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      acceptSelected();
      return;
    }
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      selected = (selected + 1) % suggestions.length;
      renderSuggestions();
      return;
    }
    if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      selected = (selected - 1 + suggestions.length) % suggestions.length;
      renderSuggestions();
      return;
    }
    if (event.key === "Escape") {
      suggestEl.hidden = true;
      return;
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      copyOutput();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (!acceptSelected()) copyOutput();
    }
  });

  listEl.addEventListener("mousedown", (event) => {
    const li = event.target.closest("li");
    if (!li) return;
    event.preventDefault();
    selected = Number(li.dataset.index);
    acceptSelected();
    draftEl.focus();
  });

  for (const input of styleInputs) input.addEventListener("change", renderResult);

  async function copyOutput() {
    const text = outputText();
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.append(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      copyNote.hidden = false;
      copyNote.textContent = "Copiado. A área de transferência é do seu sistema, não desta página.";
    } catch {
      copyNote.hidden = false;
      copyNote.textContent = "Não deu para copiar automaticamente. Selecione a saída e copie à mão.";
    }
  }

  copyBtn.addEventListener("click", copyOutput);
  clearBtn.addEventListener("click", () => {
    draftEl.value = "";
    selected = 0;
    copyNote.hidden = true;
    render();
    draftEl.focus();
  });
  useListBtn.addEventListener("click", () => {
    if (useListBtn.dataset.listId) setList(useListBtn.dataset.listId);
    draftEl.focus();
  });
  hideBtn.addEventListener("click", () => {
    hidden = !hidden;
    hideBtn.setAttribute("aria-pressed", hidden ? "true" : "false");
    hideBtn.textContent = hidden ? "Mostrar saída" : "Ocultar saída";
    renderResult();
  });

  if (!all.length) {
    statusEl.textContent = "Lista de palavras não carregou (words.js).";
    statusEl.className = "status warn";
    return;
  }

  buildListSelect();
  setList("eff_large");
})();
