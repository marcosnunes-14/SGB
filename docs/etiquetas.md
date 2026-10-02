# Etiquetas e códigos

Acesse pelo menu ☰. Cada exemplar declarado em `copies` recebe uma identidade em `book_labels`, vinculada ao ID original da obra e à posição do exemplar. O código Code 128 usa o prefixo institucional e a sequência global, não ISBN nem registro. A identidade não muda ao editar a obra, reimprimir ou mudar a quantidade de exemplares. Ao reduzir a quantidade, as identidades excedentes permanecem guardadas, sem aparecer na lista ativa; ao aumentar novamente, são reutilizadas.

`0006_book_labels.sql` é aditiva: cria tabelas, índices e triggers e preenche as identidades existentes. Não reescreve livros, registros, empréstimos, usuários nem sessões. Cadastros/clones criam identidades automaticamente na mesma transação. A API `/api/labels?code=...` resolve o exemplar exato dentro da escola autenticada, incluindo modo suporte.

## Ativação na Cloudflare

Atualize a cópia local da `main`, instale pelo lockfile e aplique a migração antes de publicar o Worker:

```sh
git switch main
git pull origin main
npx --yes pnpm@11.25.0 install --frozen-lockfile
npx --yes wrangler@4.142.0 d1 migrations apply sgb-db --remote --config wrangler-d1.jsonc
npx --yes pnpm@11.25.0 build
npx --yes wrangler@4.142.0 deploy --config wrangler.production.jsonc
```

Não é necessário exportar backup, reinicializar banco ou repetir migrações antigas. A confirmação do Wrangler aplica somente as pendentes. Se a integração GitHub/Cloudflare já publicou o código, basta aplicar a migração.

## Impressão

Tamanhos disponíveis em `labelSizes`: 50 × 30, 50 × 25 e 40 × 30 mm. A prévia e a impressão usam o mesmo componente SVG. Uma etiqueta por página, sem controles de interface na impressão. Use o tamanho correspondente no driver, escala 100%, margens zero e desative cabeçalhos/rodapés do navegador. O navegador não permite ao site controlar estas configurações nem confirmar a saída física.

Depois da impressão, clique em **Confirmar que as etiquetas foram impressas** somente quando a saída física ocorreu. Fechar/cancelar a janela não registra impressão. Cada trabalho possui um identificador; repetir a confirmação após falha de rede não duplica a contagem. Uma nova impressão gera novo trabalho. Há limite de 5.000 exemplares por lote. Ao retornar à tela original, o foco atualiza os indicadores de impressão.

## Verificação

```sh
node tests/labels.mjs
node tests/labels-ui.mjs
python tests/label-barcode.py
```

O primeiro comando gera o fixture de barras na pasta temporária para o último teste; o teste independente usa ReportLab. Os testes cobrem preservação de 1.614 livros e dados relacionados, exemplares múltiplos, imutabilidade, criação futura, reimpressão, lotes, isolamento/roles/origem, lookup por código, filtros, menu por clique, renderização dos tamanhos e Code 128 com checksum. A impressora e o leitor USB reais precisam ser validados no computador da biblioteca.
