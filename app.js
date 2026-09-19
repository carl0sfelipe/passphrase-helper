(() => {
  const C = window.PassphraseCore;
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
  const formatWarnEl = document.getElementById("format-warn");
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
  let index = C.createIndex([], 0);
  let suggestions = [];
  let selected = 0;
  let hidden = false;
  let acceptStack = [];

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

  function updateKicker() {
    const item = currentMeta();
    const count = index.words.length.toLocaleString("pt-BR");
    kickerEl.textContent =
      item.id === "all"
        ? `todas as listas · ${count} palavras únicas`
        : `${item.label} · ${count} palavras`;
  }

  function currentStyle() {
    const checked = document.querySelector('input[name="style"]:checked');
    return checked ? checked.value : "as-typed";
  }

  function unknown(tokens) {
    return tokens.filter((t) => !index.byLower.has(t.toLowerCase()));
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
    return C.copyPayload(draftEl.value, currentStyle());
  }

  function replaceDraft(next) {
    draftEl.focus();
    const value = String(next);
    if (typeof draftEl.select === "function") draftEl.select();
    let ok = false;
    try {
      ok = document.execCommand("insertText", false, value);
    } catch {
      ok = false;
    }
    if (!ok || draftEl.value !== value) draftEl.value = value;
  }

  function renderSuggestions() {
    const { current } = C.splitDraft(draftEl.value);
    suggestions = current
      ? C.rank(current, index, {
          listSets,
          preferred: ["eff_large", "bip39_en", "onepassword", "english10k", "slip39", "monero_en", "diceware"],
          activeId,
          sourceTag,
        })
      : [];
    selected = Math.min(selected, Math.max(0, suggestions.length - 1));

    if (!suggestions.length) {
      suggestEl.hidden = true;
      listEl.replaceChildren();
      return;
    }

    const uniqueHit = suggestions[0]?.tag === "prefixo único";
    const typoHit = suggestions[0]?.kind === "typo";
    const n = currentMeta().uniquePrefix;
    const ghost = C.ghostParts(current, suggestions[0].word);
    hintEl.textContent = uniqueHit
      ? `${n} letras já fecham · Espaço ou Tab completa, seu case fica`
      : typoHit
        ? "nenhum prefixo · correção de typo — Tab aplica a certa no seu case"
        : ghost.add
          ? `Tab acrescenta “${ghost.add}” · o que você já escreveu não muda`
          : `${suggestions.length} na lista · Tab não altera o que você já escreveu`;

    listEl.replaceChildren(
      ...suggestions.map((item, i) => {
        const li = document.createElement("li");
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", i === selected ? "true" : "false");
        li.dataset.index = String(i);
        const name = document.createElement("span");
        const parts = C.ghostParts(current, item.word);
        if (parts.keep && parts.add) {
          const keepEl = document.createElement("span");
          keepEl.textContent = parts.keep;
          const addEl = document.createElement("span");
          addEl.className = "ghost-add";
          addEl.textContent = parts.add;
          name.append(keepEl, addEl);
        } else {
          name.textContent = item.display || item.word;
        }
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
    const tokens = C.tokensFromDraft(draftEl.value);
    const style = currentStyle();
    const text = C.format(tokens, style);
    resultEl.textContent = text;
    resultEl.classList.toggle("is-hidden", hidden);

    if (formatWarnEl) {
      if (C.formatDestroysUserCase(tokens, style)) {
        formatWarnEl.hidden = false;
        formatWarnEl.textContent =
          "Este formato altera maiúsculas/minúsculas. “como digitado” copia exatamente o que você escreveu.";
      } else {
        formatWarnEl.hidden = true;
        formatWarnEl.textContent = "";
      }
    }

    const count = index.words.length.toLocaleString("pt-BR");
    if (!tokens.length) {
      statusEl.textContent = `${count} palavras na lista`;
      statusEl.className = "status";
      listHitEl.hidden = true;
      useListBtn.hidden = true;
      return;
    }

    const { accepted, current } = C.splitDraft(draftEl.value);
    const finishedUnknown = unknown(accepted);
    const stuckUnknown =
      current && !index.byLower.has(current.toLowerCase()) && suggestions.length === 0
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
    } else if (current && !index.byLower.has(current.toLowerCase())) {
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
    acceptStack.push(draftEl.value);
    replaceDraft(C.applyAccept(draftEl.value, word));
    selected = 0;
    copyNote.hidden = true;
    render();
  }

  function acceptSelected() {
    if (!suggestions.length) return false;
    accept(suggestions[selected].word);
    return true;
  }

  function undoAccept() {
    if (acceptStack.length) {
      replaceDraft(acceptStack.pop());
      selected = 0;
      copyNote.hidden = true;
      render();
      return true;
    }
    const next = C.undoLastAccept(draftEl.value);
    if (next === draftEl.value) return false;
    replaceDraft(next);
    selected = 0;
    copyNote.hidden = true;
    render();
    return true;
  }

  function setList(id) {
    activeId = catalog[id] ? id : "eff_large";
    if (listSelect && listSelect.value !== activeId) listSelect.value = activeId;
    index = C.createIndex(catalog[activeId] || [], currentMeta().uniquePrefix || 0);
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

  draftEl.addEventListener("paste", () => {
    copyNote.hidden = true;
  });

  draftEl.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && event.shiftKey) {
      event.preventDefault();
      undoAccept();
      return;
    }
    if (event.key === "Tab") {
      if (!C.shouldInterceptTab(suggestions.length)) return;
      event.preventDefault();
      acceptSelected();
      return;
    }
    if (event.key === " " && C.uniqueReady(C.splitDraft(draftEl.value).current, suggestions, currentMeta().uniquePrefix)) {
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
    const tokens = C.tokensFromDraft(draftEl.value);
    const style = currentStyle();
    const text = C.copyPayload(draftEl.value, style);
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
      copyNote.textContent = C.copyNoteFor(text, style, tokens);
    } catch {
      copyNote.hidden = false;
      copyNote.textContent = "Não deu para copiar automaticamente. Selecione a saída e copie à mão.";
    }
  }

  copyBtn.addEventListener("click", copyOutput);
  resultEl.addEventListener("click", copyOutput);
  resultEl.setAttribute("title", "Clique para copiar exatamente este texto");
  clearBtn.addEventListener("click", () => {
    acceptStack = [];
    replaceDraft("");
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
