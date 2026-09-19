# Spec — 100 testes do case-is-law (passphrase-helper)

## Tarefa

Crie o arquivo `test/qwen-cases.json` neste workdir. E so esse arquivo.
Nao edite `core.js`, `app.js`, `index.html`, `style.css`, `words.js` nem `test/run.cjs`.

O JSON e um objeto com a chave `tests`: array de pelo menos 100 objetos, cada um com:

    id, fn, args, expected, why

`fn` so pode ser um destes nomes, que ja existem em `core.js`:
completePreserving, paintCase, format, copyPayload, splitDraft, damerau,
applyAccept, undoLastAccept, shouldInterceptTab, letterFlags, ghostParts,
formatDestroysUserCase, outputText, uniqueReady.

`test/run.cjs` ja carrega `test/qwen-cases.json` e executa cada caso contra `core.js`.
Nao chame rank (precisa de indice que o loader extra nao monta).

## Regras

Nao invente numero, prazo, versao, tok/s, preco ou fonte alem dos listados em Dados verificados.
Nao declare que um arquivo ja existe se a tarefa pede para cria-lo.
Nao use crase na linha de comando do oraculo.
Nao use declare const como workaround — aqui nao roda TypeScript; a clausula e o principio: artefato inexistente nao se declara, se cria.
Campo nao decidido fica [A DEFINIR], nunca em branco.

## Dados verificados

- Existe `core.js` com `copyPayload`, `completePreserving`, `format`, `damerau`.
- Existe `test/run.cjs`. Ele faz require de `../core.js` e, se `test/qwen-cases.json` existir, roda os casos extras.
- `copyPayload("Ritalin ", "as-typed")` devolve `Ritalin` — maiuscula nao some no copy.
- Estilo desconhecido no `format` junta os tokens como digitados; nao chama `lower.join`.
- Typo: Damerau 1 letra se a query tem 3 caracteres, 1 ou 2 se tem 4 ou mais, e so quando nao ha prefixo.
- Tab: `completePreserving("Rit","ritalin")` = `Ritalin`; `completePreserving("RIT","ritalin")` = `RITALIN`.
- As 8 funcoes de UX ja no nucleo: copyPayload (copy WYSIWYG), formatDestroysUserCase (aviso de formato), shouldInterceptTab, undoLastAccept, uniqueReady, ghostParts, applyAccept, outputText.
- Lista de palavras do runner built-in (nao precisa repetir no JSON): ritalin, ritzy, horse, correct, battery, staple, apple, apply, orange, elephant, eleven, ice, item, aardvark, able, about, yellow, zebra.

## Passos

- Passo 1: leia `core.js` e `test/run.cjs` para casar o schema (`args` e array, `expected` e o retorno real da funcao).
- Passo 2: escreva `test/qwen-cases.json` com >=100 testes detalhados. Prioridade: copy com UPPERCASE, case no Tab, typo 1-2, as 8 funcoes de UX acima. Cada `why` em uma frase.
- Passo 3: rode `bash test/oracle.sh` e so considere pronto se exit 0.

## Oraculo

- comando: bash test/oracle.sh
- exit esperado: 0 = `test/qwen-cases.json` tem >=100 testes, `node test/run.cjs` passa, copy as-typed nao lowercasa. Antes do arquivo existir, exit 1 e o estado CORRETO.

## Verificacao

VERIFICACAO: test -f test/qwen-cases.json && python3 -c "import json; d=json.load(open('test/qwen-cases.json')); t=d['tests'] if isinstance(d,dict) else d; assert len(t)>=100; assert all('fn' in x and 'expected' in x and 'args' in x for x in t)"

## Barra

- nome: test/run.cjs + copyPayload as-typed
- como fetchar: bash test/oracle.sh
- como comparar: oracle exit 0 e a linha passed= do runner com failed=0
