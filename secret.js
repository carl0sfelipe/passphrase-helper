(() => {
  "use strict";

  const codecLib = window.Bip39Codec;
  const words = window.WORDLISTS && window.WORDLISTS.bip39_en;
  const statusEl = document.getElementById("secret-status");

  if (!codecLib || !words) {
    if (statusEl) statusEl.textContent = "wordlist BIP-39 indisponível neste carregamento.";
    return;
  }
  const B = codecLib.create(words);

  const secretIn = document.getElementById("secret-in");
  const wordsIn = document.getElementById("words-in");
  const outWords = document.getElementById("secret-words");
  const outSecret = document.getElementById("secret-out");
  const encodeBtn = document.getElementById("secret-encode");
  const decodeBtn = document.getElementById("secret-decode");
  const copyWordsBtn = document.getElementById("copy-words");
  const copySecretBtn = document.getElementById("copy-secret");

  const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const unhex = (s) => s.replace(/[^0-9a-fA-F]/g, "").match(/.{1,2}/g).map((x) => parseInt(x, 16));

  function say(message) {
    statusEl.textContent = message;
  }

  // hex se sobrar só hex depois de limpar separadores e o comprimento for par;
  // base64 se decodificar limpo; senão, texto cru (utf-8).
  function parseSecret(text) {
    const t = text.trim();
    if (!t) throw new Error("cole um segredo primeiro");
    const cleaned = t.replace(/[\s:._-]/g, "");
    if (cleaned.length >= 2 && cleaned.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(cleaned)) {
      return { bytes: unhex(cleaned), format: "hex" };
    }
    if (/^[A-Za-z0-9+/]+={0,2}$/.test(t) && t.length % 4 === 0) {
      try {
        const bin = atob(t);
        const bytes = Array.from(bin, (ch) => ch.charCodeAt(0) & 255);
        return { bytes, format: "base64" };
      } catch (err) { /* não era base64 válida */ }
    }
    return {
      bytes: Array.from(new TextEncoder().encode(t)),
      format: "texto",
    };
  }

  function printable(bytes) {
    return bytes.every((b) => b === 9 || b === 10 || b === 13 || (b >= 32 && b <= 126));
  }

  encodeBtn.addEventListener("click", () => {
    outWords.textContent = "";
    try {
      const { bytes, format } = parseSecret(secretIn.value);
      const mnemonic = B.encodeSecret(bytes);
      outWords.textContent = mnemonic.join(" ");
      say(
        mnemonic.length + " palavras · origem: " + format + " · " + bytes.length +
        " bytes · escreva com calma: o checksum acusa troca de palavra"
      );
    } catch (err) {
      say(err.message);
    }
  });

  decodeBtn.addEventListener("click", () => {
    outSecret.textContent = "";
    try {
      const list = wordsIn.value
        .split(/[\s,;]+/)
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean);
      const bytes = B.decodeSecret(list);
      const asHex = hex(bytes);
      let extra = "";
      if (printable(bytes)) {
        extra = "\ntexto: " + new TextDecoder().decode(bytes);
      }
      outSecret.textContent = asHex + extra;
      say("checksum ok · " + bytes.length + " bytes recuperados de " + list.length + " palavras");
    } catch (err) {
      say(err.message);
    }
  });

  function wireCopy(button, source) {
    button.addEventListener("click", () => {
      const text = source.textContent;
      if (!text) return;
      navigator.clipboard.writeText(text).then(
        () => say("copiado — cole onde precisar"),
        () => say("o navegador bloqueou a cópia; selecione e copie manualmente")
      );
    });
  }
  wireCopy(copyWordsBtn, outWords);
  wireCopy(copySecretBtn, outSecret);
})();
