# Transferir o SGB para suas contas

Esta cópia contém o código-fonte e a estrutura/migrações do banco. Não contém os registros reais da biblioteca nem senhas/segredos de produção.

## Partes atuais

- Site: React com Vinext, incluindo páginas e APIs no mesmo projeto.
- Servidor: Cloudflare Workers.
- Banco: Cloudflare D1, binding lógico DB; migrações em drizzle/.
- Ambiente: SGB_SETUP_CODE e SGB_DEVELOPER_CODE (segredos de ativação).
- Código-fonte desta versão: commit b36c9d04557fda9df8447794d0c901d443cabac8.

## Antes de migrar

1. Criar um repositório Git seu e importar esta pasta.
2. Criar um projeto Workers na sua conta Cloudflare compatível com o build atual e um banco D1 próprio, vinculado como DB.
3. Aplicar em ordem as migrações SQL de drizzle/ ao banco novo.
4. Gerar seus próprios códigos secretos para a configuração inicial e para o perfil de desenvolvedor; não publicar segredos no Git.
5. Testar login, livros, empréstimos e acesso simultâneo antes de mudar o domínio da escola.
6. Exportar os dados reais do banco atual e importá-los no banco novo, preservando IDs, owners e hashes se as contas precisarem manter suas senhas. A cópia do código não transfere o conteúdo do banco. Faça essa etapa com um procedimento controlado e cópia de segurança.
7. Só depois apontar o domínio personalizado e verificar HTTPS.

O arquivo .openai/hosting.json referencia a publicação atual gerenciada e não deve ser reutilizado como identificação do seu projeto independente.
