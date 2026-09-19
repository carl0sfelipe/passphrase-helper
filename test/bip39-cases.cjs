#!/usr/bin/env node
"use strict";

// Testes do bip39.js: vetores oficiais do BIP-39 (entropy -> frase),
// SHA-256 puro contra vetores NIST e roundtrip do wrapper de segredos
// (4 bytes de comprimento + pad + checksum). Roda com `node test/bip39-cases.cjs`.

const fs = require("fs");
const path = require("path");
const codec = require("../bip39.js");

const raw = fs.readFileSync(path.join(__dirname, "..", "words.js"), "utf8");
const start = raw.indexOf("window.WORDLISTS = ");
const jsonStart = raw.indexOf("{", start);
// words.js termina a linha do WORDLISTS com "};\n"
const jsonEnd = raw.indexOf("};", jsonStart);
const wordlists = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
const B = codec.create(wordlists.bip39_en);

const hex = (bytes) => Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
const unhex = (s) => s.trim().replace(/[^0-9a-fA-F]/g, "").match(/.{2}/g).map(x => parseInt(x, 16));

let passed = 0;
let failed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log("PASS  " + name);
  } catch (err) {
    failed++;
    console.log("FAIL  " + name + " :: " + err.message);
  }
}
function eq(a, b, why) {
  if (a !== b) throw new Error(why + ": esperado " + JSON.stringify(b) + ", veio " + JSON.stringify(a));
}

// --- SHA-256 puro (vetores FIPS) ---
check("sha256 abc", () => eq(
  hex(B.sha256(Array.from("abc", c => c.charCodeAt(0)))),
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  "digest"));
check("sha256 vazio", () => eq(
  hex(B.sha256([])),
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "digest"));
check("sha256 64 bytes (limite de bloco)", () => {
  const oneK = Array.from({ length: 64 }, (_, i) => i);
  eq(hex(B.sha256(oneK)), "fdeab9acf3710362bd2658cdc9a29e8f9c757fcf9811603a8c447cd1d9151108", "digest");
});

// --- Vetores oficiais BIP-39 (trezor test vectors, entropy de 16 bytes) ---
const official = [
  ["00000000000000000000000000000000", "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"],
  ["7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f", "legal winner thank year wave sausage worth useful legal winner thank yellow"],
  ["80808080808080808080808080808080", "letter advice cage absurd amount doctor acoustic avoid letter advice cage above"],
  ["ffffffffffffffffffffffffffffffff", "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong"],
];
for (const [entropyHex, mnemonic] of official) {
  check("vetor oficial " + entropyHex.slice(0, 8) + "…", () => {
    eq(B.entropyToMnemonic(unhex(entropyHex)).join(" "), mnemonic, "frase");
    eq(hex(B.mnemonicToEntropy(mnemonic.split(" "))), entropyHex, "entropy");
  });
}

// --- Roundtrip do wrapper de segredos em todos os tamanhos úteis ---
for (const len of [1, 8, 12, 16, 20, 24, 28]) {
  check("roundtrip segredo " + len + " bytes", () => {
    const secret = Array.from({ length: len }, (_, i) => (i * 37 + 11) & 255);
    const words = B.encodeSecret(secret);
    eq(hex(B.decodeSecret(words)), hex(secret), "ida e volta");
  });
}

// --- Caso real: client secret do GitHub (40 hex = 20 bytes -> 18 palavras) ---
check("client secret GitHub (40 hex)", () => {
  const secret = unhex("a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4");
  const words = B.encodeSecret(secret);
  eq(words.length, 18, "18 palavras");
  eq(hex(B.decodeSecret(words)), "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4", "volta");
});

// --- Detecção de erro humano ---
check("palavra errada é rejeitada", () => {
  const words = B.encodeSecret(unhex("00112233445566778899aabbccddeeff"));
  const tampered = words.slice();
  tampered[2] = "zzzzz";
  try {
    B.decodeSecret(tampered);
    throw new Error("aceitou palavra fora da lista");
  } catch (err) {
    if (!/fora da lista/.test(err.message)) throw err;
  }
});
check("troca silenciosa de palavra derruba o checksum", () => {
  const words = B.encodeSecret(unhex("00112233445566778899aabbccddeeff"));
  const tampered = words.slice();
  tampered[3] = words[4];
  tampered[4] = words[3];
  try {
    B.decodeSecret(tampered);
    throw new Error("aceitou frase com checksum quebrado");
  } catch (err) {
    if (!/checksum/.test(err.message)) throw err;
  }
});

console.log(failed === 0 ? "\n" + passed + " ok" : "\n" + failed + " falharam de " + (passed + failed));
process.exit(failed === 0 ? 0 : 1);
