# Recarregar Extensões

[![CI](https://github.com/puppe1990/refresh-all/actions/workflows/ci.yml/badge.svg)](https://github.com/puppe1990/refresh-all/actions/workflows/ci.yml)

Extensão de Chrome (Manifest V3) com um botão no popup para **recarregar extensões sem passar por `chrome://extensions`**: marque as que quiser ou recarregue todas de uma vez.

Sem build: os arquivos são os que o Chrome carrega — nenhum bundler, nenhum passo de compilação.

## Como usar

1. Abra `chrome://extensions`.
2. Ligue o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione esta pasta.
4. Clique no ícone da extensão na barra de ferramentas para abrir o popup:
   - **Só extensões dev (unpacked)** filtra a lista; vem ligado por padrão e a escolha é lembrada;
   - **Selecionar todas** marca/desmarca a lista visível;
   - **Recarregar selecionadas (n)** recarrega só o que estiver marcado;
   - **Recarregar todas (n)** recarrega a lista visível inteira.

Cada linha mostra o nome, a versão e um selo `dev` quando a extensão é unpacked. Ao final, um resumo indica o que deu certo e o motivo de eventuais falhas.

A seleção e o filtro são lembrados: pode fechar o popup que as extensões marcadas (e o estado do filtro) continuam na próxima abertura (`chrome.storage.local`). Ids de extensões que não existem mais — ou que ficaram fora do filtro — são descartados ao montar a lista.

As permissões `management` e `storage` geram o aviso "Gerenciar seus apps, extensões e temas" na instalação — `management` é o que permite listar e alternar extensões, `storage` guarda seleção e filtro. Se você atualizar os arquivos desta extensão, mudanças no `manifest.json` (como permissões) só entram em vigor depois de recarregá-la em `chrome://extensions` — os demais arquivos o popup lê direto do disco a cada abertura.

## Como funciona

O Chrome não expõe um `chrome.management.reload()`. O que existe é `chrome.management.setEnabled()`, e o código do Chromium trata como **no-op quando o estado pedido já é o atual** (`extensions/browser/api/management/management_api.cc`). Então o reload é:

```js
await chrome.management.setEnabled(id, false); // desliga
await chrome.management.setEnabled(id, true); // liga de novo
```

que força o unload/load completo da extensão. Desabilitar não exige gesto do usuário nem diálogo de confirmação; o prompt nativo só aparece no caso raro de habilitação com "permissions increase" (e aí a falha é reportada na linha).

Limitações que vêm desse mecanismo:

- **Mudanças no `manifest.json`** exigem reload manual pela página `chrome://extensions`.
- **Extensões desabilitadas, temas e apps** não entram na lista (só faz sentido recarregar o que está habilitado); extensões presas por política (`mayDisable === false`) são ignoradas. Com o filtro dev ligado, só entram as unpacked (`installType === 'development'`).
- A **própria extensão** não pode se recarregar (o Chrome bloqueia auto-desabilitar), então ela é excluída da lista.
- Content scripts não são reinjetados em abas já abertas; recarregue a aba da página em desenvolvimento se precisar.

## Estrutura

```
manifest.json   declaração MV3 + permissões management/storage + action.default_popup
popup.html      marcado do popup
popup.css       estilos (claro/escuro)
popup.js        cola fina de DOM: monta as linhas, filtro e persistência de seleção/filtro
lib/selection.js       modelo de seleção (Set), resumo (nenhuma/parcial/todas) e restauração da seleção salva
lib/extension-list.js  filtra (dev/all) e ordena o resultado de chrome.management.getAll()
lib/reload.js          sequência disable→enable, com progresso e erros por item
lib/storage.js         escrita best-effort no storage (nunca lança, mesmo sem a permissão)
test/                  testes unitários dos módulos de lib/
```

Os módulos de `lib/` não conhecem DOM nem o objeto `chrome`: recebem a API por parâmetro, então rodam iguais no popup e no Node.

## Testes

```sh
npm test        # ou: node --test
```

Escritos antes da implementação (TDD): a suíte cobre seleção (incluindo restauração com poda de ids que não existem mais), montagem da lista (exclusões, filtro dev-only e ordenação com acento via `Intl.Collator pt-BR`) e a orquestração do reload (ordem das chamadas, progresso, falha que não interrompe o restante). Usa só o test runner do Node, sem framework de teste.

A camada de DOM (`popup.js`) é fina de propósito e foi verificada carregando a extensão de verdade em um Chrome for Testing (headless), abrindo o popup, clicando em "Recarregar selecionadas" e "Recarregar todas" e reabrindo o popup para conferir seleção e filtro restaurados.

## Scripts e pré-commit

```sh
npm install          # devDependencies + ativa o hook (core.hooksPath=.githooks via prepare)
npm test             # node --test
npm run lint         # ESLint (flat config)
npm run lint:fix     # ESLint com --fix
npm run format       # Prettier --write
npm run format:check # Prettier --check
```

O hook `.githooks/pre-commit` roda **lint + prettier --check + testes** antes de cada commit — commit com lint quebrado, formatação fora do padrão ou teste vermelho é barrado. O `npm install` configura o `core.hooksPath` automaticamente (script `prepare`); para ativar na mão: `git config core.hooksPath .githooks`.

O CI (`.github/workflows/ci.yml`) roda exatamente os mesmos três passos em push para `main` e em pull requests.
