(() => {
  const words = Array.isArray(window.WORDLIST) ? window.WORDLIST : [];
  const byLower = new Map(words.map((w) => [w.toLowerCase(), w]));
  const prefix3 = new Map();
  for (const w of words) prefix3.set(w.slice(0, 3).toLowerCase(), w);

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

  let suggestions = [];
  let selected = 0;
  let hidden = false;

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

    for (const word of words) {
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

    starts.sort((a, b) => a.length - b.length || a.localeCompare(b));
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
      const unique = q.length >= 3 && prefix3.get(q.slice(0, 3)) === word;
      push(
        word,
        word.toLowerCase() === q ? "exata" : unique ? "prefixo único" : "começa com"
      );
    }

    if (!starts.length) {
      for (const word of contains) push(word, "contém");
      for (const item of near) push(item.word, "perto");
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
    hintEl.textContent = uniqueHit
      ? "3 letras já fecham esta palavra — Tab completa"
      : `${suggestions.length} na lista`;

    listEl.replaceChildren(
      ...suggestions.map((item, i) => {
        const li = document.createElement("li");
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", i === selected ? "true" : "false");
        li.dataset.index = String(i);
        const name = document.createElement("span");
        name.textContent = item.word;
        const meta = document.createElement("span");
        meta.className = "meta";
        meta.textContent = item.tag;
        li.append(name, meta);
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

    if (!tokens.length) {
      statusEl.textContent = `${words.length} palavras na lista`;
      statusEl.className = "status";
      return;
    }

    const finishedUnknown = unknown(accepted);
    const stuckUnknown =
      current && !byLower.has(current.toLowerCase()) && suggestions.length === 0
        ? [current]
        : [];
    const allBad = finishedUnknown.concat(stuckUnknown);

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
  hideBtn.addEventListener("click", () => {
    hidden = !hidden;
    hideBtn.setAttribute("aria-pressed", hidden ? "true" : "false");
    hideBtn.textContent = hidden ? "Mostrar saída" : "Ocultar saída";
    renderResult();
  });

  if (!words.length) {
    statusEl.textContent = "Lista de palavras não carregou (words.js).";
    statusEl.className = "status warn";
    return;
  }

  render();
})();
