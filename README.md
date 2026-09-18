# Ajudante de passphrase

Página estática para transcrever uma passphrase da lista
[EFF Short Wordlist 2.0](https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases)
(1.296 palavras, prefixo de 3 letras único).

Você escreve o que conseguir ler da própria letra. O autocomplete sugere
só palavras da lista, **Tab** completa, e você escolhe o formato
(espaços, camelCase, snake_case, …) antes de copiar.

## O que esta página não faz

- Não tem servidor além do GitHub Pages entregando arquivos.
- Não grava a passphrase (`localStorage`, cookies, banco: nenhum).
- Não faz pedido de rede depois que os arquivos carregam.
- Não tem analytics.

O que você digita fica na memória da aba. Recarregar apaga.

O GitHub ainda vê o IP de quem abre o site — isso é o host, não o texto.
Para usar sem host, clone ou baixe a pasta e abra `index.html` no navegador.

## Lista

`words.js` é a EFF Short Wordlist 2.0, [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/).
Electronic Frontier Foundation.
