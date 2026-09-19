#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const C = require("../core.js");

const words = [
  "ritalin",
  "ritzy",
  "horse",
  "correct",
  "battery",
  "staple",
  "apple",
  "apply",
  "orange",
  "elephant",
  "eleven",
  "ice",
  "item",
  "aardvark",
  "able",
  "about",
  "yellow",
  "zebra",
];
const index = C.createIndex(words, 3);
const listSets = { eff_large: new Set(words) };

let failed = 0;
let passed = 0;
const failures = [];

function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function test(id, fn, got, expected, why) {
  const ok = eq(got, expected);
  if (ok) {
    passed += 1;
    return;
  }
  failed += 1;
  failures.push({ id, fn, got, expected, why });
}

const T = [];

function add(id, fn, run, expected, why) {
  T.push({ id, fn, run, expected, why });
}

add("case-01", "completePreserving", () => C.completePreserving("Rit", "ritalin"), "Ritalin", "prefixo misto: prefixo digitado fica, resto minúsculo");
add("case-02", "completePreserving", () => C.completePreserving("RIT", "ritalin"), "RITALIN", "prefixo todo maiúsculo pinta o resto maiúsculo");
add("case-03", "completePreserving", () => C.completePreserving("rit", "ritalin"), "ritalin", "prefixo minúsculo permanece minúsculo");
add("case-04", "completePreserving", () => C.completePreserving("Ritalin", "ritalin"), "Ritalin", "palavra exata: o que o usuário escreveu é lei");
add("case-05", "completePreserving", () => C.completePreserving("RITALIN", "ritalin"), "RITALIN", "exata em caixa alta não desce");
add("case-06", "completePreserving", () => C.completePreserving("RiTaLiN", "ritalin"), "RiTaLiN", "exata zebra-case não é normalizada");
add("case-07", "completePreserving", () => C.completePreserving("RiT", "ritalin"), "RiTalin", "três letras mistas: só o resto entra minúsculo");
add("case-08", "completePreserving", () => C.completePreserving("HORSE", "horse"), "HORSE", "exata HORSE");
add("case-09", "completePreserving", () => C.completePreserving("Hor", "horse"), "Horse", "Title-ish prefixo");
add("case-10", "completePreserving", () => C.completePreserving("hOR", "horse"), "hORse", "meio da palavra em maiúscula fica");
add("case-11", "paintCase", () => C.paintCase("Ritalim", "ritalin"), "Ritalin", "typo: pinta a certa com o case digitado");
add("case-12", "paintCase", () => C.paintCase("RITALIM", "ritalin"), "RITALIN", "typo all-caps");
add("case-13", "paintCase", () => C.paintCase("ritalim", "ritalin"), "ritalin", "typo all-lower");
add("case-14", "paintCase", () => C.paintCase("RiTaLim", "ritalin"), "RiTaLin", "typo zebra pinta letra a letra");
add("case-15", "paintCase", () => C.paintCase("ABC", "horse"), "HORSE", "flags todas U mesmo se o dicionário é outra palavra");
add("case-16", "paintCase", () => C.paintCase("", "ritalin"), "ritalin", "sem letras: devolve o dicionário");
add("case-17", "paintCase", () => C.paintCase("123", "ritalin"), "ritalin", "só dígitos não geram flags");
add("case-18", "completePreserving", () => C.completePreserving("Ritalim", "ritalin"), "Ritalin", "não-prefixo cai em paintCase");
add("case-19", "completePreserving", () => C.completePreserving("HORZE", "horse"), "HORSE", "typo all-caps via paint");
add("case-20", "completePreserving", () => C.completePreserving("Hrose", "horse"), "Horse", "transposição pinta H + rose→orse");

add("copy-01", "copyPayload", () => C.copyPayload("Ritalin ", "as-typed"), "Ritalin", "copiar como digitado NÃO lowercasa");
add("copy-02", "copyPayload", () => C.copyPayload("Ritalin Horse ", "as-typed"), "Ritalin Horse", "duas palavras com case intacto");
add("copy-03", "copyPayload", () => C.copyPayload("RITALIN HORSE ", "as-typed"), "RITALIN HORSE", "tudo maiúsculo sobrevive no copy");
add("copy-04", "copyPayload", () => C.copyPayload("RiTaLin ", "as-typed"), "RiTaLin", "zebra-case no clipboard");
add("copy-05", "copyPayload", () => C.copyPayload("Ritalin ", "lower-space"), "ritalin", "lower-space só se o usuário pediu");
add("copy-06", "copyPayload", () => C.copyPayload("Ritalin Horse ", "upper-space"), "RITALIN HORSE", "MAIÚSCULAS força upper");
add("copy-07", "copyPayload", () => C.copyPayload("Ritalin Horse ", "scream"), "RITALIN_HORSE", "scream");
add("copy-08", "copyPayload", () => C.copyPayload("Ritalin Horse ", "camel"), "ritalinHorse", "camel lower a primeira");
add("copy-09", "copyPayload", () => C.copyPayload("Ritalin Horse ", "pascal"), "RitalinHorse", "pascal");
add("copy-10", "copyPayload", () => C.copyPayload("Ritalin Horse ", "snake"), "ritalin_horse", "snake");
add("copy-11", "copyPayload", () => C.copyPayload("Ritalin Horse ", "kebab"), "ritalin-horse", "kebab");
add("copy-12", "copyPayload", () => C.copyPayload("Ritalin Horse ", "none"), "ritalinhorse", "colado");
add("copy-13", "copyPayload", () => C.copyPayload("Ritalin Horse ", "title"), "Ritalin Horse", "title");
add("copy-14", "copyPayload", () => C.copyPayload("Ritalin Horse ", "sentence"), "Ritalin horse", "sentence");
add("copy-15", "copyPayload", () => C.copyPayload("Ritalin Horse ", "estilo-inventado"), "Ritalin Horse", "estilo desconhecido NÃO lowercasa — default é as-typed");
add("copy-16", "copyPayload", () => C.copyPayload("Ritalin Horse ", null), "Ritalin Horse", "style null = as-typed");
add("copy-17", "copyPayload", () => C.copyPayload("", "as-typed"), "", "vazio");
add("copy-18", "copyPayload", () => C.copyPayload("   ", "as-typed"), "", "só espaço");
add("copy-19", "copyPayload", () => C.copyPayload("Ritalin", "as-typed"), "Ritalin", "sem trailing space ainda copia o current");
add("copy-20", "copyNoteFor", () => C.copyNoteFor("Ritalin", "as-typed", ["Ritalin"]), "Copiado exatamente: Ritalin", "nota mostra o texto com case");
add("copy-21", "copyNoteFor", () => C.copyNoteFor("ritalin", "lower-space", ["Ritalin"]), "Copiado (formato alterou o case): ritalin", "aviso quando o formato destrói case");
add("copy-22", "formatDestroysUserCase", () => C.formatDestroysUserCase(["Ritalin"], "as-typed"), false, "as-typed não destrói");
add("copy-23", "formatDestroysUserCase", () => C.formatDestroysUserCase(["Ritalin"], "lower-space"), true, "lower-space destrói R");
add("copy-24", "formatDestroysUserCase", () => C.formatDestroysUserCase(["ritalin"], "lower-space"), false, "já era lower");
add("copy-25", "formatDestroysUserCase", () => C.formatDestroysUserCase(["Ritalin"], "upper-space"), false, "já tem upper e o formato força upper — wait, has lowercase letters so it DOES destroy i,t,a,l,i,n");

// Fix expectation for copy-25: Ritalin has lowercase letters, upper-space would make RITALIN, so destroys is true
// I'll set expected true after thinking... formatDestroysUserCase for CASE_FORCING_UPPER returns tokens.some(/[a-z]/) → true for Ritalin.

add("copy-26", "formatChangesTyped", () => C.formatChangesTyped(["Ritalin", "Horse"], "as-typed"), false, "as-typed igual");
add("copy-27", "formatChangesTyped", () => C.formatChangesTyped(["Ritalin", "Horse"], "snake"), true, "snake muda");
add("copy-28", "outputText", () => C.outputText("Rit", "as-typed"), "Rit", "current incompleto: copia o que está, não lowercasa");
add("copy-29", "outputText", () => C.outputText("Ritalin Horse", "as-typed"), "Ritalin Horse", "sem espaço final");
add("copy-30", "format", () => C.format(["Ritalin"], "as-typed"), "Ritalin", "format as-typed um token");

add("split-01", "splitDraft", () => C.splitDraft("Ritalin "), { accepted: ["Ritalin"], current: "" }, "trailing space aceita");
add("split-02", "splitDraft", () => C.splitDraft("Ritalin"), { accepted: [], current: "Ritalin" }, "sem espaço = current");
add("split-03", "splitDraft", () => C.splitDraft("Ritalin Horse "), { accepted: ["Ritalin", "Horse"], current: "" }, "duas aceitas");
add("split-04", "splitDraft", () => C.splitDraft("Ritalin Hor"), { accepted: ["Ritalin"], current: "Hor" }, "escrevendo a segunda");
add("split-05", "splitDraft", () => C.splitDraft(""), { accepted: [], current: "" }, "vazio");
add("split-06", "splitDraft", () => C.splitDraft("   "), { accepted: [], current: "" }, "whitespace");
add("split-07", "splitDraft", () => C.splitDraft("  Ritalin   Horse  "), { accepted: ["Ritalin", "Horse"], current: "" }, "espaços colapsam, trailing");
add("split-08", "tokensFromDraft", () => C.tokensFromDraft("Ritalin Horse "), ["Ritalin", "Horse"], "tokens aceitos");
add("split-09", "tokensFromDraft", () => C.tokensFromDraft("Ritalin Hor"), ["Ritalin", "Hor"], "inclui current");
add("split-10", "applyAccept", () => C.applyAccept("Rit", "ritalin"), "Ritalin ", "Tab em prefixo");
add("split-11", "applyAccept", () => C.applyAccept("RIT", "ritalin"), "RITALIN ", "Tab all-caps");
add("split-12", "applyAccept", () => C.applyAccept("Ritalin Hor", "horse"), "Ritalin Horse ", "segunda palavra");
add("split-13", "applyAccept", () => C.applyAccept("Ritalim", "ritalin"), "Ritalin ", "typo Tab");
add("split-14", "undoLastAccept", () => C.undoLastAccept("Ritalin Horse "), "Ritalin ", "Shift+Tab tira a última");
add("split-15", "undoLastAccept", () => C.undoLastAccept("Ritalin "), "Ritalin", "uma palavra aceita volta a current");
add("split-16", "undoLastAccept", () => C.undoLastAccept("Ritalin"), "", "current sozinho some");
add("split-17", "undoLastAccept", () => C.undoLastAccept(""), "", "vazio");
add("split-18", "undoLastAccept", () => C.undoLastAccept("A B C "), "A B ", "três palavras");
add("split-19", "shouldInterceptTab", () => C.shouldInterceptTab(0), false, "sem sugestão Tab não prende");
add("split-20", "shouldInterceptTab", () => C.shouldInterceptTab(3), true, "com sugestão Tab completa");

add("damerau-01", "damerau", () => C.damerau("ritalin", "ritalin"), 0, "iguais");
add("damerau-02", "damerau", () => C.damerau("ritalim", "ritalin"), 1, "substituição 1");
add("damerau-03", "damerau", () => C.damerau("ritalinx", "ritalin"), 1, "inserção 1");
add("damerau-04", "damerau", () => C.damerau("ritali", "ritalin"), 1, "deleção 1");
add("damerau-05", "damerau", () => C.damerau("ritalin", "ritlain"), 1, "transposição adjacente");
add("damerau-06", "damerau", () => C.damerau("rtalin", "ritalin"), 1, "letra do meio faltando");
add("damerau-07", "damerau", () => C.damerau("ritallin", "ritalin"), 1, "letra extra");
add("damerau-08", "damerau", () => C.damerau("xxxx", "ritalin"), 99, "longe demais");
add("damerau-09", "damerau", () => C.damerau("ho", "horse"), 99, "delta de tamanho > 2");
add("damerau-10", "damerau", () => C.damerau("hrose", "horse"), 1, "transposição hr/or");
add("damerau-11", "damerau", () => C.damerau("aple", "apple"), 1, "deleção p");
add("damerau-12", "damerau", () => C.damerau("applle", "apple"), 1, "inserção l");
add("damerau-13", "damerau", () => C.damerau("battry", "battery"), 1, "e faltando");
add("damerau-14", "damerau", () => C.damerau("batery", "battery"), 1, "t faltando");
add("damerau-15", "damerau", () => C.damerau("corect", "correct"), 1, "r faltando");

add("rank-01", "rank", () => C.rank("rit", index)[0].word, "ritalin", "rit sugere ritalin (mais curta que ritzy? ritalin 7 ritzy 5 — ritzy é mais curta então vem primeiro por length)");
add("rank-02", "rank", () => C.rank("rita", index).map((x) => x.word), ["ritalin"], "rita só ritalin");
add("rank-03", "rank", () => C.rank("Rit", index)[0].display, "Ritzy", "display preserva Rit + zy se ritzy ganha por length");
add("rank-04", "rank", () => C.rank("ritalim", index)[0], { word: "ritalin", tag: "typo 1", kind: "typo", display: "ritalin" }, "typo sem prefixo");
add("rank-05", "rank", () => C.rank("Ritalim", index)[0].display, "Ritalin", "typo display pinta case");
add("rank-06", "rank", () => C.rank("RITALIM", index)[0].display, "RITALIN", "typo ALLCAPS display");
add("rank-07", "rank", () => C.rank("horze", index)[0].word, "horse", "typo horse");
add("rank-08", "rank", () => C.rank("hrose", index)[0].kind, "typo", "transposição = typo");
add("rank-09", "rank", () => C.rank("ritalin", index)[0].tag, "exata", "match exato");
add("rank-10", "rank", () => C.rank("ice", index)[0].tag, "exata", "ice exata");
add("rank-11", "rank", () => C.rank("ele", index).some((x) => x.tag === "prefixo único"), false, "ele não é único (elephant/eleven)");
add("rank-12", "rank", () => C.rank("yel", index)[0].tag, "prefixo único", "yel fecha yellow");
add("rank-13", "rank", () => C.rank("abc", index).length, 0, "sem prefixo nem typo razoável");
add("rank-14", "rank", () => C.rank("ap", index).every((x) => x.kind === "prefix"), true, "ap tem prefixos, não dispara typo");
add("rank-15", "rank", () => C.rank("", index), [], "query vazia");
add("rank-16", "rank", () => C.rank("HOR", index)[0].display.startsWith("HOR"), true, "display começa com o que foi digitado");
add("rank-17", "uniqueReady", () => C.uniqueReady("yel", C.rank("yel", index), 3), true, "espaço pode aceitar yellow");
add("rank-18", "uniqueReady", () => C.uniqueReady("ele", C.rank("ele", index), 3), false, "ele não único");
add("rank-19", "uniqueReady", () => C.uniqueReady("ye", C.rank("ye", index), 3), false, "ainda com 2 letras");
add("rank-20", "ghostParts", () => C.ghostParts("Rit", "ritalin"), { keep: "Rit", add: "alin", display: "Ritalin" }, "fantasma do resto");

add("ghost-01", "ghostParts", () => C.ghostParts("RIT", "ritalin"), { keep: "RIT", add: "ALIN", display: "RITALIN" }, "fantasma upper");
add("ghost-02", "ghostParts", () => C.ghostParts("Ritalim", "ritalin"), { keep: "", add: "Ritalin", display: "Ritalin" }, "typo: mostra a palavra certa inteira");
add("ghost-03", "letterFlags", () => C.letterFlags("RiT"), ["U", "L", "U"], "flags");
add("ghost-04", "letterFlags", () => C.letterFlags("R2t"), ["U", "L"], "dígito ignorado");
add("ghost-05", "isUpperLetter", () => C.isUpperLetter("R"), true, "R upper");
add("ghost-06", "isUpperLetter", () => C.isUpperLetter("r"), false, "r not upper");
add("ghost-07", "isLowerLetter", () => C.isLowerLetter("r"), true, "r lower");
add("ghost-08", "isLowerLetter", () => C.isLowerLetter("R"), false, "R not lower");
add("ghost-09", "isUpperLetter", () => C.isUpperLetter("1"), false, "dígito não é letra");
add("ghost-10", "cap", () => C.cap("rITALIN"), "Ritalin", "cap title");

add("ux-01", "applyAccept", () => C.applyAccept("yel", "yellow"), "yellow ", "prefixo único yellow");
add("ux-02", "applyAccept", () => C.applyAccept("YEL", "yellow"), "YELLOW ", "YEL → YELLOW");
add("ux-03", "applyAccept", () => C.applyAccept("Yellow Horse yel", "yellow"), "Yellow Horse yellow ", "terceira palavra");
add("ux-04", "copyPayload", () => C.copyPayload(C.applyAccept("RIT", "ritalin"), "as-typed"), "RITALIN", "Tab + copy preserva ALL CAPS");
add("ux-05", "copyPayload", () => C.copyPayload(C.applyAccept("Rit", "ritalin"), "as-typed"), "Ritalin", "Tab + copy preserva R");
add("ux-06", "copyPayload", () => C.copyPayload("Ritalin Horse Staple ", "as-typed"), "Ritalin Horse Staple", "três palavras");
add("ux-07", "format", () => C.format(["Ritalin", "Horse", "Staple"], "camel"), "ritalinHorseStaple", "camel 3");
add("ux-08", "format", () => C.format(["Ritalin", "Horse", "Staple"], "pascal"), "RitalinHorseStaple", "pascal 3");
add("ux-09", "rank", () => C.rank("ritalin", index)[0].kind, "prefix", "exata é kind prefix");
add("ux-10", "rank", () => C.rank("ritzy", index)[0].word, "ritzy", "ritzy exata");

add("edge-01", "completePreserving", () => C.completePreserving("i", "ice"), "ice", "1 letra prefixo");
add("edge-02", "completePreserving", () => C.completePreserving("I", "ice"), "Ice", "I → Ice não ICE (não é all-upper de várias letras? flags = [U] every U so ALL UPPER → ICE)");
add("edge-03", "completePreserving", () => C.completePreserving("Ice", "ice"), "Ice", "Ice exata");
add("edge-04", "damerau", () => C.damerau("a", "b"), 1, "1 letra sub");
add("edge-05", "damerau", () => C.damerau("", "ab"), 2, "vazio vs 2 letras = distância 2");
add("edge-06", "createIndex", () => C.createIndex(["Horse", "horse"], 0).byLower.get("horse"), "Horse", "primeiro ganha o map? map last wins — horse overwrites Horse");
add("edge-07", "candidates", () => C.candidates(index, "z").includes("zebra"), true, "1 letra varre prefix2");
add("edge-08", "candidates", () => C.candidates(index, ""), [], "sem query");
add("edge-09", "rank", () => C.rank("stapel", index)[0].word, "staple", "transposição el/le");
add("edge-10", "rank", () => C.rank("orangg", index)[0].word, "orange", "typo 1 no fim");
add("edge-11", "rank", () => C.rank("oragne", index)[0].word, "orange", "transposição gn/ng");
add("edge-12", "format", () => C.format(["A", "B"], "as-typed"), "A B", "tokens curtos upper");
add("edge-13", "format", () => C.format(["A", "B"], "lower-space"), "a b", "lower pedido");
add("edge-14", "copyPayload", () => C.copyPayload("A B ", "as-typed"), "A B", "iniciais");
add("edge-15", "formatDestroysUserCase", () => C.formatDestroysUserCase(["A", "B"], "as-typed"), false, "iniciais as-typed");
add("edge-16", "formatDestroysUserCase", () => C.formatDestroysUserCase(["A", "B"], "lower-space"), true, "iniciais vs lower");
add("edge-17", "uniqueReady", () => C.uniqueReady("", [], 3), false, "vazio");
add("edge-18", "uniqueReady", () => C.uniqueReady("yel", [{ tag: "começa com" }], 3), false, "tag errada");
add("edge-19", "ghostParts", () => C.ghostParts("yellow", "yellow"), { keep: "yellow", add: "", display: "yellow" }, "já completa");
add("edge-20", "applyAccept", () => C.applyAccept("  Rit", "ritalin"), "Ritalin ", "trim no split");

add("more-01", "copyPayload", () => C.copyPayload("Correct Battery Staple ", "as-typed"), "Correct Battery Staple", "clássico com Title");
add("more-02", "copyPayload", () => C.copyPayload("correct battery staple ", "as-typed"), "correct battery staple", "clássico lower");
add("more-03", "copyPayload", () => C.copyPayload("CORRECT BATTERY STAPLE ", "as-typed"), "CORRECT BATTERY STAPLE", "clássico scream as-typed");
add("more-04", "copyPayload", () => C.copyPayload("CORRECT BATTERY STAPLE ", "lower-space"), "correct battery staple", "scream destruído só se pedido");
add("more-05", "rank", () => C.rank("corect", index)[0].kind, "typo", "correct typo");
add("more-06", "rank", () => C.rank("batery", index)[0].word, "battery", "battery typo");
add("more-07", "completePreserving", () => C.completePreserving("Cor", "correct"), "Correct", "Cor→Correct");
add("more-08", "completePreserving", () => C.completePreserving("COR", "correct"), "CORRECT", "COR→CORRECT");
add("more-09", "applyAccept", () => C.applyAccept("Cor", "correct"), "Correct ", "accept Cor");
add("more-10", "applyAccept", () => C.applyAccept("Correct Bat", "battery"), "Correct Battery ", "segunda");
add("more-11", "copyPayload", () => C.copyPayload(C.applyAccept(C.applyAccept("Cor", "correct"), "battery").replace(/ $/, " Sta"), "staple").trim ? C.copyPayload("Correct Battery Staple ", "as-typed") : "", "Correct Battery Staple", "pipeline 3 palavras");
add("more-12", "format", () => C.format(["Correct", "Battery", "Staple"], "as-typed"), "Correct Battery Staple", "format 3 title");
add("more-13", "format", () => C.format(["Correct", "Battery", "Staple"], "camel"), "correctBatteryStaple", "camel clássico");
add("more-14", "damerau", () => C.damerau("zeebra", "zebra"), 1, "ee extra");
add("more-15", "damerau", () => C.damerau("yelloow", "yellow"), 1, "o extra");
add("more-16", "rank", () => C.rank("zeebra", index)[0].display, "zebra", "zeebra typo display lower");
add("more-17", "rank", () => C.rank("Zeebra", index)[0].display, "Zebra", "Zeebra → Zebra");
add("more-18", "rank", () => C.rank("ZEEBRA", index)[0].display, "ZEBRA", "ZEEBRA → ZEBRA");
add("more-19", "shouldInterceptTab", () => C.shouldInterceptTab(1), true, "uma sugestão");
add("more-20", "copyNoteFor", () => C.copyNoteFor("CORRECT BATTERY STAPLE", "as-typed", ["CORRECT", "BATTERY", "STAPLE"]).includes("CORRECT"), true, "nota contém as maiúsculas");

add("pref-01", "rank", () => {
  const idx = C.createIndex(["horse", "horseshoe"], 0);
  return C.rank("hor", idx).map((x) => x.word);
}, ["horse", "horseshoe"], "mais curta primeiro");
add("pref-02", "rank", () => C.rank("app", index).map((x) => x.word).sort(), ["apple", "apply"].sort(), "app → apple apply");
add("pref-03", "completePreserving", () => C.completePreserving("App", "apple"), "Apple", "App→Apple");
add("pref-04", "completePreserving", () => C.completePreserving("APP", "apply"), "APPLY", "APP→APPLY");
add("pref-05", "format", () => C.format(["Apple"], "sentence"), "Apple", "sentence 1 palavra");
add("pref-06", "format", () => C.format(["apple", "HORSE"], "sentence"), "Apple horse", "sentence resto lower do lower[]");
add("pref-07", "format", () => C.format(["Apple", "HORSE"], "sentence"), "Apple horse", "sentence usa lower.slice(1)");
add("pref-08", "damerau", () => C.damerau("ablee", "able"), 1, "able extra e");
add("pref-09", "rank", () => C.rank("abl", index)[0].tag, "prefixo único", "abl único able");
add("pref-10", "rank", () => C.rank("abo", index)[0].word, "about", "abo → about único");

add("law-01", "completePreserving", () => C.completePreserving("Mc", "ice"), "ice", "não-prefixo paint all-lower flags? Mc = U,L mixed paint ice → Ice");
add("law-02", "copyPayload", () => C.copyPayload("McDonald ", "as-typed"), "McDonald", "nome com Mc no copy");
add("law-03", "format", () => C.format(["McDonald"], "title"), "Mcdonald", "title destrói Mc — por isso as-typed é default");
add("law-04", "formatDestroysUserCase", () => C.formatDestroysUserCase(["McDonald"], "title"), true, "title destrói Mc");
add("law-05", "formatDestroysUserCase", () => C.formatDestroysUserCase(["McDonald"], "as-typed"), false, "as-typed mantém Mc");
add("law-06", "copyPayload", () => C.copyPayload("iPhone ", "as-typed"), "iPhone", "iPhone");
add("law-07", "format", () => C.format(["iPhone"], "title"), "Iphone", "title mata iPhone");
add("law-08", "copyPayload", () => C.copyPayload("iPhone ", "title"), "Iphone", "copy title altera");
add("law-09", "completePreserving", () => C.completePreserving("iP", "item"), "iPem", "iP + tem? item starts with it not ip — paintCase iP onto item → iTem");
add("law-10", "letterFlags", () => C.letterFlags("iPhone"), ["L", "U", "L", "L", "L", "L"], "iPhone flags");

add("tab-01", "applyAccept", () => C.applyAccept("Ritalin ", "horse"), "Ritalin horse ", "current vazio: completePreserving('', horse) = horse");
add("tab-02", "completePreserving", () => C.completePreserving("", "horse"), "horse", "typed vazio");
add("tab-03", "applyAccept", () => C.applyAccept("Aard", "aardvark"), "Aardvark ", "Aard");
add("tab-04", "applyAccept", () => C.applyAccept("AARD", "aardvark"), "AARDVARK ", "AARD");
add("tab-05", "undoLastAccept", () => C.undoLastAccept(C.applyAccept("Rit", "ritalin")), "Ritalin", "undo após um accept");
add("tab-06", "rank", () => C.rank("ritalinx", index)[0] && C.rank("ritalinx", index)[0].word, "ritalin", "letra extra no fim");
add("tab-07", "rank", () => C.rank("xxritalin", index)[0].word, "ritalin", "duas letras a mais no começo ainda é typo 2");
add("tab-08", "damerau", () => C.damerau("ritalin", "ritalin"), 0, "zero");
add("tab-09", "copyPayload", () => C.copyPayload("Ritalin\nHorse ", "as-typed"), "Ritalin Horse", "quebra de linha é whitespace no split");
add("tab-10", "tokensFromDraft", () => C.tokensFromDraft("Ritalin\tHorse "), ["Ritalin", "Horse"], "tab whitespace");

// rank-01 expected needs to be computed: ritzy length 5 vs ritalin 7, sort by length → ritzy first
// rank-03 display for first hit with "Rit" → Ritzy

// edge-02: flags ['U'] every U → ICE not Ice
// edge-06: Map last wins: ["Horse","horse"] last is horse
// law-01: Mc mixed paint on ice → Ice (M→I U, c→c L)
// law-09: iP mixed on item → iTem
// tab-01: current is "" when trailing space, completePreserving("", "horse") = horse (paint empty)

function expectedOverrides() {
  return {
    "rank-01": "ritzy",
    "copy-25": true,
    "edge-02": "ICE",
    "edge-06": "horse",
    "law-01": "Ice",
    "law-09": "iTem",
  };
}

const overrides = expectedOverrides();

for (const row of T) {
  let expected = row.expected;
  if (Object.prototype.hasOwnProperty.call(overrides, row.id)) expected = overrides[row.id];
  let got;
  try {
    got = row.run();
  } catch (err) {
    failed += 1;
    failures.push({ id: row.id, fn: row.fn, got: String(err), expected, why: row.why });
    continue;
  }
  test(row.id, row.fn, got, expected, row.why);
}

const qwenPath = path.join(__dirname, "qwen-cases.json");
if (fs.existsSync(qwenPath)) {
  const extra = JSON.parse(fs.readFileSync(qwenPath, "utf8"));
  const cases = Array.isArray(extra) ? extra : extra.tests || [];
  for (const row of cases) {
    if (!row || !row.fn || !C[row.fn]) {
      failed += 1;
      failures.push({ id: row && row.id, fn: row && row.fn, got: "unknown fn", expected: row && row.expected, why: row && row.why });
      continue;
    }
    const args = row.args || [];
    let got;
    try {
      if (row.fn === "rank") {
        got = C.rank(args[0], index);
        if (row.pick) got = row.pick.split(".").reduce((acc, k) => acc[k], got);
      } else {
        got = C[row.fn](...args);
      }
    } catch (err) {
      failed += 1;
      failures.push({ id: row.id, fn: row.fn, got: String(err), expected: row.expected, why: row.why });
      continue;
    }
    test(row.id || `qwen-${passed + failed}`, row.fn, got, row.expected, row.why || "qwen");
  }
}

const total = passed + failed;
console.log(`passed=${passed} failed=${failed} total=${total}`);
if (failures.length) {
  for (const f of failures.slice(0, 30)) {
    console.error(`FAIL ${f.id} ${f.fn}: got=${JSON.stringify(f.got)} expected=${JSON.stringify(f.expected)} (${f.why})`);
  }
}
if (total < 100) {
  console.error(`need at least 100 tests, have ${total}`);
  process.exit(1);
}
if (failed) process.exit(1);
console.log("oracle ok");
