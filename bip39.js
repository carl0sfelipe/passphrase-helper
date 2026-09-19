(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.Bip39Codec = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // SHA-256 puro (FIPS 180-4). crypto.subtle não existe em file:// —
  // esta página promete funcionar offline aberta do disco.
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  function sha256(bytes) {
    const l = bytes.length;
    const bitLenHi = Math.floor(l / 536870912);
    const bitLenLo = (l << 3) >>> 0;
    const padded = bytes.slice();
    padded.push(0x80);
    while (padded.length % 64 !== 56) padded.push(0);
    padded.push((bitLenHi >>> 24) & 255, (bitLenHi >>> 16) & 255, (bitLenHi >>> 8) & 255, bitLenHi & 255);
    padded.push((bitLenLo >>> 24) & 255, (bitLenLo >>> 16) & 255, (bitLenLo >>> 8) & 255, bitLenLo & 255);

    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    const w = new Array(64);

    for (let block = 0; block < padded.length; block += 64) {
      for (let t = 0; t < 16; t++) {
        const i = block + t * 4;
        w[t] = ((padded[i] << 24) | (padded[i + 1] << 16) | (padded[i + 2] << 8) | padded[i + 3]) >>> 0;
      }
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e;
        e = (d + temp1) >>> 0;
        d = c; c = b; b = a;
        a = (temp1 + temp2) >>> 0;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
    }
    return [h0, h1, h2, h3, h4, h5, h6, h7].flatMap(x => [
      (x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255,
    ]);
  }

  function rotr(x, n) {
    return ((x >>> n) | (x << (32 - n))) >>> 0;
  }

  // Tamanhos de entropy definidos pelo BIP-39 (bytes).
  const SIZES = [16, 20, 24, 28, 32];
  // O wrapper de segredos usa 4 bytes de comprimento: no máximo 28 bytes úteis.
  const MAX_SECRET = 28;

  function create(words) {
    if (!Array.isArray(words) || words.length !== 2048) {
      throw new Error("a wordlist precisa ter exatamente 2048 palavras");
    }
    const indexOf = new Map();
    words.forEach((word, i) => {
      if (!indexOf.has(word)) indexOf.set(word, i);
    });

    function entropyToMnemonic(entropy) {
      if (!SIZES.includes(entropy.length)) {
        throw new Error("entropy precisa ter 16, 20, 24, 28 ou 32 bytes");
      }
      const csBits = (entropy.length * 8) / 32;
      const hash = sha256(entropy);
      const indexes = [];
      let acc = 0, accBits = 0;
      const push = (value, count) => {
        for (let i = count - 1; i >= 0; i--) {
          acc = ((acc << 1) | ((value >>> i) & 1)) >>> 0;
          if (++accBits === 11) { indexes.push(acc); acc = 0; accBits = 0; }
        }
      };
      for (const byte of entropy) push(byte, 8);
      push(hash[0] >>> (8 - csBits), csBits);
      return indexes.map(i => words[i]);
    }

    function mnemonicToEntropy(mnemonicWords) {
      const list = mnemonicWords.map(w => String(w).toLowerCase().trim()).filter(w => w.length);
      if (list.length < 12 || list.length > 24 || list.length % 3 !== 0) {
        throw new Error("uma frase BIP-39 tem 12, 15, 18, 21 ou 24 palavras");
      }
      const firstBad = list.find(w => !indexOf.has(w));
      if (firstBad !== undefined) {
        const err = new Error('palavra fora da lista BIP-39: "' + firstBad + '"');
        err.badWord = firstBad;
        throw err;
      }
      const bits = [];
      for (const word of list) {
        const value = indexOf.get(word);
        for (let i = 10; i >= 0; i--) {
          bits.push((value >>> i) & 1);
        }
      }
      const total = list.length * 11;
      const entBits = Math.floor((total * 32) / 33);
      const csBits = total - entBits;
      const entropy = [];
      for (let i = 0; i < entBits; i += 8) {
        let byte = 0;
        for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i + b];
        entropy.push(byte);
      }
      let cs = 0;
      for (let i = entBits; i < total; i++) cs = (cs << 1) | bits[i];
      const expected = sha256(entropy)[0] >>> (8 - csBits);
      if (cs !== expected) {
        const err = new Error("checksum não bate: alguma palavra foi trocada ou escrita errada");
        err.checksum = false;
        throw err;
      }
      return entropy;
    }

    function encodeSecret(secret) {
      if (!(secret && secret.length > 0)) throw new Error("segredo vazio");
      if (secret.length > MAX_SECRET) {
        throw new Error("segredo de " + secret.length + " bytes não cabe (máximo " + MAX_SECRET + ")");
      }
      const len = secret.length;
      const payload = [
        (len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255,
      ].concat(secret);
      const size = SIZES.find(s => s >= payload.length);
      while (payload.length < size) payload.push(0);
      return entropyToMnemonic(payload);
    }

    function decodeSecret(mnemonicWords) {
      const payload = mnemonicToEntropy(mnemonicWords);
      const len = (payload[0] << 24) | (payload[1] << 16) | (payload[2] << 8) | payload[3];
      if (len < 1 || len > payload.length - 4) {
        throw new Error("comprimento embutido inválido — frase não veio desta ferramenta");
      }
      return payload.slice(4, 4 + len);
    }

    return {
      words,
      sha256,
      entropyToMnemonic,
      mnemonicToEntropy,
      encodeSecret,
      decodeSecret,
      MAX_SECRET,
    };
  }

  return { create, sha256, SIZES, MAX_SECRET };
});
