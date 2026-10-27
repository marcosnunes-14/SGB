# Aplicativo SGB: instalação e funcionamento offline

O aplicativo é uma PWA instalada pelo navegador. Usa o mesmo projeto, o mesmo acervo e o mesmo D1 do site. A área `/sistema` continua funcionando normalmente. O aplicativo fica em `/aplicativo`; não há um segundo cadastro de livros ou uma substituição do banco de produção.

## Primeiro uso no computador da biblioteca

1. Publique a versão atual com o comando de construção `pnpm build`. Esse comando também prepara os arquivos que precisam estar disponíveis sem internet.
2. Com internet, entre no site com o usuário da biblioteca. No menu ☰, abra **Aplicativo · instalar e usar offline**.
3. Aguarde a mensagem de arquivos preparados. Escolha **Preparar o usuário conectado ao site**.
4. Crie e confirme uma senha local de pelo menos oito caracteres. Essa senha protege a cópia dos dados no computador; pode ser diferente da senha do site.
5. Clique em **Preparar dados neste computador** e aguarde **Tudo sincronizado**.
6. Use **Instalar aplicativo**, quando oferecido, ou a opção correspondente no menu do Chrome/Edge. O SGB passa a abrir por um ícone, em uma janela própria.

A preparação precisa ser feita em cada computador. Não use um computador público ou o modo anônimo para guardar a cópia de trabalho da biblioteca. A senha local não é enviada ao servidor e não pode ser recuperada pelo SGB. Sem ela, não é possível abrir os dados locais nem as alterações ainda pendentes.

## Quando a internet cair

Desbloqueie o aplicativo com a senha local. A cópia já preparada permite consultar o acervo, prateleiras, alunos e empréstimos; pesquisar e paginar; cadastrar e editar livros; clonar com dados por livro; mover livros; registrar empréstimos, devoluções, renovações e ocorrências. As exclusões mantêm a proteção para empréstimos ativos.

Dashboard, relatórios, comprovantes e exportações no aplicativo usam a cópia disponível naquele computador, incluindo alterações pendentes. Relatórios e comprovantes abrem dentro da área do aplicativo, em outra janela/aba, com o mesmo desbloqueio local. A impressão usa o navegador e os drivers instalados no computador.

É possível imprimir etiquetas cujos códigos oficiais já tenham sido sincronizados. Livros e exemplares novos recebem os códigos oficiais somente depois de sincronizar, preservando a identidade única gerada pelo D1. O painel administrativo, mudanças de escola/permissões e o primeiro login continuam exigindo internet.

O aplicativo informa se está offline, sincronizando ou com alterações na fila. A confirmação de uma operação local só ocorre depois da gravação no computador. Fechar o aplicativo ou reiniciar o navegador não deve apagar essa fila.

## Retorno da conexão

Ao abrir/desbloquear o aplicativo com internet, ele tenta sincronizar. Também há o botão **Sincronizar**. O envio exige uma sessão válida no site, com o mesmo usuário e escola que prepararam aquele perfil local. Se a sessão terminou, entre novamente no site e retorne ao aplicativo; a fila não é apagada.

O acesso para novas gravações offline vale por sete dias desde a última preparação/sincronização autenticada bem-sucedida. Depois desse período os dados continuam disponíveis para consulta, mas é necessário conectar e sincronizar para renovar o acesso. As permissões atuais sempre são verificadas pelo servidor no momento do envio.

Enquanto o aplicativo estiver fechado ou bloqueado, não há promessa de sincronização em segundo plano. As alterações são enviadas quando ele estiver aberto/desbloqueado. Outros computadores só recebem essas alterações depois de sua sincronização.

## Conflitos

Uma alteração no site pode entrar em conflito com uma alteração offline. O servidor não substitui automaticamente o registro nesse caso. A operação e as seguintes continuam na fila.

Abra **Revisar conflito**. É possível conferir a situação, corrigir registros de livros/clones, reaplicar explicitamente sobre os dados atuais ou remover explicitamente uma alteração local. Cadastros de aluno podem voltar a usar a identificação exata por nome e série. A revisão pede confirmação. Se houver operações dependentes, elas continuam na fila e podem precisar de nova revisão; não são removidas em cascata.

Quando uma operação já foi gravada, mas a resposta se perdeu, seu recibo permite reconhecê-la no próximo envio, sem criar novamente o livro, o empréstimo ou a impressão. A identificação, a alteração e o recibo são gravados na mesma transação do D1. Não apague automaticamente os registros `offline:` da tabela de logs: eles também servem como recibos de sincronização.

## Cuidados com os dados locais

O cofre e a fila ficam cifrados em IndexedDB, separados por usuário e escola. A senha usa PBKDF2; a cifragem usa AES-GCM, com salt e IV aleatórios. O Service Worker guarda somente a estrutura pública e arquivos estáticos; não guarda respostas autenticadas de APIs nem páginas personalizadas do site.

**Não limpe os dados do navegador/aplicativo, exclua o perfil do navegador ou formate o computador enquanto houver alterações pendentes.** Essas ações podem apagar a única cópia de operações ainda não enviadas. O aplicativo solicita armazenamento persistente ao navegador, mas não substitui os cuidados com o computador. O botão Bloquear fecha o acesso local sem apagar a fila.

A atualização do aplicativo não deve apagar o cofre. A troca de versão é oferecida quando o navegador encontra um Service Worker novo. O botão de atualização fica indisponível enquanto houver alterações pendentes no perfil aberto.

## Desenvolvimento e validação

Não foram criadas migrations, tabelas novas ou segredos novos para esta função. Não houve exportação, reinicialização ou alteração do D1 de produção durante o desenvolvimento. Os testes usam SQLite em memória e um D1 local isolado em uma pasta temporária.

- `pnpm test:offline`: modelo, transações, idempotência, isolamento, conflitos, preservação, cifragem e fila do cliente.
- `pnpm test:offline:browser`: requer Playwright e Chromium disponíveis no ambiente. O script cria um D1 temporário com 1.614 livros fictícios, aplica somente as migrations locais, abre o Worker local e testa o navegador. Nunca usa `--remote`. O módulo Playwright e o executável podem ser fornecidos por `SGB_PLAYWRIGHT_MODULE` e `SGB_CHROMIUM_PATH`.
- `pnpm build`: compila e gera `dist/client/offline-assets.json` e o Service Worker com identificação da versão. Não omita a segunda etapa de `scripts/offline-assets.mjs` ao usar comandos de construção personalizados.

A publicação no GitHub não comprova que o Worker público já recebeu essa versão. Confirme o deploy da Cloudflare antes de preparar computadores de produção.
