# Ajudante de passphrase

Página estática para transcrever uma passphrase. Você escolhe a lista
(ou **Todas**, a união) e escreve o que conseguir ler da própria letra.
O autocomplete sugere só palavras embutidas nesta página, **Tab** completa,
e o formato (espaços, camelCase, snake_case, …) vale na hora de copiar.

## Listas

- EFF Large (7.776), Short 1 (1.296), Short 2 (1.296) — [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/), EFF
- BIP-39 inglês, português, espanhol, francês, italiano (2.048 cada)
- Diceware original e Beale (7.776 cada)
- Inglês comum (~9.884 palavras frequentes)

O padrão é **Todas** (~29 mil palavras únicas). Nada disso sai do arquivo `words.js`.

## O que esta página não faz

- Não tem servidor além do GitHub Pages entregando arquivos.
- Não grava a passphrase (`localStorage`, cookies, banco: nenhum).
- Não faz pedido de rede depois que os arquivos carregam.
- Não tem analytics.

O que você digita fica na memória da aba. Recarregar apaga.

O GitHub ainda vê o IP de quem abre o site — isso é o host, não o texto.
Para usar sem host, clone ou baixe a pasta e abra `index.html` no navegador.
