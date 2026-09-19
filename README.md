# Ajudante de passphrase

Página **estática**. Não há banco de dados, API nem servidor próprio:
as listas oficiais de passphrase vão no arquivo `words.js` e o
autocomplete roda só no navegador.

## De onde vêm as palavras

O seletor abre na **EFF Large** (Bitwarden / KeePassXC, 7.776 palavras).
**Todas** continua disponível como união (~93 mil).

| Grupo | Lista | Quem usa |
| --- | --- | --- |
| Gerenciadores | EFF Large | Bitwarden, KeePassXC |
| Gerenciadores | 1Password | gerador de passphrase da 1Password |
| Gerenciadores | Inglês comum | ~10 mil palavras frequentes |
| Carteiras | BIP-39 (vários idiomas) | Bitcoin e a maioria das seed phrases |
| Carteiras | SLIP-39 | Trezor Shamir |
| Carteiras | Monero inglês | seed Monero |
| Diceware | original, Beale, 8k, EFF Short 1/2 | método Diceware |
| Orchard Street | Long / Medium / Alpha | listas modernas de passphrase |
| Outras | Niceware | 65.536 palavras (16 bits/palavra) |

## O que esta página não faz

- Não grava a passphrase (`localStorage`, cookies, banco: nenhum).
- Não faz pedido de rede depois que os arquivos carregam.
- Não tem analytics.

O GitHub ainda vê o IP de quem abre o site. Para usar sem host, abra
`index.html` offline.
