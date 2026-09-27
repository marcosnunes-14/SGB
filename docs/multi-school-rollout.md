# Publicação segura da versão multi-escola

Esta versão está na branch `feat/multi-escola-segura`. Não publicar a aplicação nova antes de aplicar a migração 0003 no D1 existente. A migração não reescreve livros, empréstimos, senhas ou IDs: cria a escola usando o `owner` do usuário `leila`.

## Pré-verificação e backup

1. Com acesso autorizado ao D1 de produção, exportar o banco inteiro (sem `--table` e sem `--no-data`):

   ```bash
   mkdir -p backups
   npx wrangler d1 export sgb-db --remote --config wrangler-d1.jsonc --output backups/sgb-before.sql
   ```

2. Guardar o SQL em local privado. O diretório `backups/` está fora do Git, pois o arquivo contém usuários, hashes de senha e sessões.
3. Executar `python3 scripts/verify-multi-school.py backups/sgb-before.sql`. O script recusa a migração caso `leila` não exista, caso outro `owner` possua dados ou caso o ensaio altere contagens, dados ou senha. Conferir também o número exato de livros e empréstimos impresso pelo script.
4. Confirmar que a exportação e a verificação terminaram **antes** de qualquer alteração remota. Se houver divergência, interromper a publicação e investigar a origem dos dados.

## Migração e conferência

1. Aplicar **somente as migrações pendentes** no banco `sgb-db` original, sem recriar o banco:

   ```bash
   npx wrangler d1 migrations apply sgb-db --remote --config wrangler-d1.jsonc
   ```

2. Consultar no D1 as quantidades de livros, empréstimos e usuários após a migração; comparar com o backup. Confirmar que `institutions` contém `CETI Demerval Lobão` com ID igual ao `owner` de `leila` e que o hash de senha dela não mudou.
3. Se qualquer número ou vínculo inesperado surgir, interromper o processo **antes de publicar o código**. O backup permite examinar os dados; qualquer restauração deve ser planejada separadamente para não sobrescrever novos registros.
4. Após validar, publicar a versão da branch principal e testar o login real de `leila`, acervo, prateleiras, empréstimos, relatório, clonagem pela bibliotecária, login do desenvolvedor, cadastro da segunda escola e isolamento por instituição.

A automação de build do GitHub/Cloudflare não executa esta migração por conta própria. A PR permanece em rascunho até a verificação do backup real e dos fluxos autenticados.
