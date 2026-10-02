# CONTEXTO DO SGB

Documento de continuidade técnica, elaborado em **02/10/2026** a partir da branch **main**, commit **b3d3e822e79e010ba6517ba24f07aad390fd9765**. Repositório: [marcosnunes-14/SGB](https://github.com/marcosnunes-14/SGB).

**Escopo desta entrega: somente documentação.** Não houve alteração de aplicação, schema, migrations, configuração, banco remoto ou publicação do Worker. Os comandos abaixo são referência para trabalho futuro; não foram executados contra produção nesta análise.

“Implementado” significa presente no código analisado. Não equivale a comprovação de que o Worker publicado usa esse commit, de que todas as migrations estão aplicadas no D1 ou de que houve teste físico de impressora/leitor. Não houve acesso autenticado ao banco remoto nesta sessão. Contagens dos testes são fixtures, nunca contagens atuais de produção.

Fontes principais: `app/`, `db/schema.ts`, os sete arquivos SQL e snapshots em `drizzle/`, configurações de build/Cloudflare, scripts, testes, documentos existentes e referências Git remotas. Em divergências com documentação antiga, prevalece o código desse commit. Este documento também deve ser reavaliado depois de mudanças futuras.

# 1. VISÃO GERAL DO SGB

O **Sistema de Gestão Bibliotecária** administra acervo, localização em estantes/prateleiras, empréstimos e devoluções escolares. Oferece consulta para direção e administração institucional para desenvolvedor, com acesso às escolas em modo suporte.

É uma aplicação existente, incremental, derivada de um starter Vinext. Não é necessário reconstruí-la. A versão exibida é **1.0.2**, definida em `app/version.ts`; a versão `0.1.0` do pacote é do manifesto e não representa a versão visual do SGB.

Há três perfis reais: `bibliotecario`, `direcao` e `desenvolvedor`. “Administrador” é a apresentação do desenvolvedor no painel `/admin`, não um quarto valor de role.

A arquitetura multi-escola utiliza uma instituição e um `owner` por contexto. A escola piloto prevista pela migration 0003 é **CETI Demerval Lobão**, código **SGB-0001**, com ID igual ao `owner` da bibliotecária de login `leila`. A migration depende dessa usuária; não prova que ela exista em qualquer banco novo. O setup inicial também contém esse nome padrão.

O código inclui alunos automáticos, Dashboard real, relatórios, CSV/JSON, GRE, suporte, etiquetas Code 128 e atalho WhatsApp. Existem limitações documentadas adiante: controle de exemplares no empréstimo, licença por vencimento e foto do perfil não estão completos. O estado do site remoto não foi confirmado.

# 2. TECNOLOGIAS UTILIZADAS

As versões abaixo são **declarações do package.json**, não uma leitura de pacotes instalados nesta sessão. Intervalos com `^` podem resolver versões diferentes conforme o lockfile.

| Camada/ferramenta | Versão declarada | Uso real |
|---|---|---|
| Node.js | >=22.13.0 | Runtime de desenvolvimento/build; testes usam `node:sqlite` |
| pnpm | 11.25.0 | `packageManager`, lockfile e guia de implantação |
| React / React DOM | 19.2.6 / 19.2.6 | Componentes e estado da interface |
| Next | 16.3.4 | Convenções App Router e imports `next/headers`, `next/navigation`; execução via Vinext |
| Vinext | 1.0.0-beta.5 | Build/runtime compatível com as convenções Next no Worker |
| Vite | 8.0.13 | Build e desenvolvimento |
| TypeScript | 5.9.3 | Aplicação, schema e configuração |
| Cloudflare Vite plugin | 1.37.1 | Ambientes RSC/SSR e bindings locais |
| Cloudflare Workers types | 4.20260515.1 | Tipos Worker/D1/R2 |
| Wrangler | 4.92.0 | Dependência de desenvolvimento; guia existente usa CLI explícita 4.142.0 |
| Cloudflare D1 | Serviço, sem versão no manifesto | SQLite gerenciado de produção |
| Drizzle ORM / Kit | 0.45.2 / 0.31.10 | Schema e geração de migrations; negócio usa principalmente SQL D1 direto |
| Tailwind / PostCSS | 4.2.1 / 4.2.1 | Estilos e infraestrutura UI |
| Recharts | ^3.8.0 | Gráficos do Dashboard |
| JsBarcode | 3.12.3 | Code 128 gerado localmente, SVG |
| lucide-react | ^1.31.0 | Ícones |
| Radix UI / Base UI | ^1.6.7 / ^1.7.0 | Componentes presentes no conjunto UI; uso depende dos imports |
| class-variance-authority / clsx / tailwind-merge | 0.7.1 / 2.1.1 / 3.6.0 | Composição de classes |
| ESLint / eslint-config-next | 9.39.4 / 16.3.4 | Lint |
| @vitejs/plugin-react / plugin-rsc | 6.0.2 / 0.5.26 | Infraestrutura de build |
| react-server-dom-webpack | 19.2.6 | Dependência RSC |

Outras dependências declaradas: `@hookform/resolvers` ^5.7.1, `@shadcn/react` ^0.3.0, `cmdk` ^1.1.1, `date-fns` ^4.4.0, `embla-carousel-react` ^8.6.0, `input-otp` ^1.4.2, `next-themes` ^0.4.6, `react-day-picker` ^10.0.1, `react-hook-form` ^7.85.0, `react-resizable-panels` ^4.12.2, `sonner` ^2.0.8, `vaul` ^1.1.2, `zod` ^3.25.76 e `tw-animate-css` ^1.4.0. Muitas servem aos componentes do starter, não a funcionalidades de biblioteca ativas. Tipos: `@types/node` 22.19.19, React 19.2.14 e React DOM 19.2.3. Override de `miniflare>sharp`: 0.35.4.

Autenticação própria por Web Crypto: PBKDF2 SHA-256 para senhas, SHA-256 para tokens persistidos, cookie HttpOnly e sessões no D1. **Não utiliza JWT nem login ChatGPT para autenticar a bibliotecária.** Python/SQLite são usados pelos scripts de verificação; ReportLab é dependência externa do teste independente de barras, não do site.

# 3. ESTRUTURA DO PROJETO

Não existe uma pasta `src/` para o negócio: a aplicação está diretamente em `app/`.

| Caminho | Responsabilidade |
|---|---|
| `app/page.tsx` | Login, configuração inicial e ativação de desenvolvedor |
| `app/layout.tsx`, `app/globals.css` | HTML pt-BR, metadados e estilos globais |
| `app/library.tsx` | Interface principal e formulários de livros/empréstimos |
| `app/sistema/` | Página autenticada que monta Library |
| `app/admin/` | Página, console e CSS administrativo |
| `app/api/` | Oito rotas de API ativas; ver seção 32 |
| `app/relatorio/` | Relatório por período e relatório de alunos |
| `app/etiquetas/imprimir/` | Página de impressão de etiquetas |
| `app/*-data.ts`, `*-rules.ts`, `student-identity.ts` | Regras, consultas e agregações |
| `components/ui/` | Biblioteca de componentes reutilizáveis; inclui bastante scaffold não utilizado pelo SGB |
| `hooks/use-mobile.ts`, `lib/utils.ts` | Utilitários do conjunto UI |
| `db/` | Schema Drizzle, acesso raw D1 e helper ORM |
| `drizzle/` | SQL incremental 0000–0006 e metadados |
| `drizzle/meta/` | Snapshots de schema e journal de geração; não são exportações de dados reais |
| `scripts/` | Instalação, seleção de runtime, build e verificações de cópias SQL |
| `tests/` | Testes isolados de negócio, SQL, relatórios e etiquetas |
| `examples/d1/` | Exemplo notes, fora de `app/`; não é rota de produção do SGB |
| `build/` | Plugin herdado de Sites e licença correspondente |
| `docs/` | Etiquetas e rollout multi-escola; partes do rollout são históricas |
| `public/` | Logos, favicon e SVGs do starter |
| `vendor/` | CSS shadcn empacotado |
| `.openai/hosting.json` | Metadados herdados de hospedagem Sites e binding lógico; não substitui config de produção Cloudflare |
| `package.json`, `pnpm-lock.yaml`, `package-lock.json` | Dependências e scripts; manter lockfile coerente com o instalador escolhido |
| `vite.config.ts`, `next.config.ts`, `tsconfig.json` | Build/framework/TypeScript |
| `postcss.config.mjs`, `eslint.config.mjs`, `components.json` | CSS, lint e gerador UI |
| `wrangler.production.jsonc`, `wrangler-d1.jsonc` | Worker existente e operações D1 |
| `cloudflare-env.d.ts`, `drizzle.config.ts`, `pnpm-workspace.yaml` | Tipos, geração SQL e política pnpm |
| `README.md`, `TRANSFERENCIA.md` | Starter e transferência para outra conta; não seguir transferência para uma simples atualização |

Assets oficiais usados: `public/sgb-logo.png` no login/Início, `public/sgb-info-logo.webp` no popup, `public/admin-logo.png` no painel admin e `public/favicon.svg`. `sgb-info-books.jpg` existe mas não é referenciado pelo InfoDialog atual; outros SVGs são assets do starter. A fonte CSS é Arial/Helvetica/sans-serif; não há carregamento de fonte via CDN no layout.

Diretórios gerados/locais como `node_modules/`, `dist/`, `.wrangler/`, `.vinext/`, `.sites-runtime/`, `.next/` e `backups/` são ignorados. Não publicar exportações SQL ou arquivos `.env*`.

# 4. ARQUITETURA DO SISTEMA

A interface React no navegador chama APIs **do mesmo domínio** via `fetch`. O Worker Vinext atende páginas server-side e APIs, consulta o D1 com prepared statements e retorna JSON/CSV ou HTML. Não há servidor Express separado nem backend Firebase/Supabase.

As páginas protegidas chamam `getUser()` antes de renderizar. A API repete autenticação e autorização, independentemente de botões escondidos no frontend. `db/raw.ts` retorna `env.DB`; `db/index.ts` oferece Drizzle mas as rotas reais usam o acesso raw.

O cookie identifica uma sessão; a sessão identifica o usuário real e, no caso de desenvolvedor, a instituição em suporte. `getUser()` devolve `id` como ID do usuário e **`userId` como owner efetivo da escola**. Essa nomenclatura é importante: trocar `user.userId` por `user.id` nas consultas de livros/loans quebra isolamento e pode fazer o acervo parecer vazio.

Livros e empréstimos mantêm campos principais em JSON TEXT (`data`) e campos relacionais externos (`owner`, registro, aluno). Alunos/instituições/usuários/etiquetas possuem colunas próprias. Nenhum acervo real acompanha o Git: ele reside no D1.

# 5. BANCO DE DADOS

Fonte: `db/schema.ts`, `drizzle/meta/0006_snapshot.json` e SQL de `drizzle/`. A lista abaixo descreve **o schema esperado após 0006**, não uma inspeção do banco remoto. São **10 tabelas de domínio e 80 colunas**. `NOT NULL` é obrigatoriedade SQL, não exigência de conteúdo não vazio. Campos com default `''` são opcionais no preenchimento, apesar de não aceitarem NULL.

Não há CHECK para JSON válido, roles, GRE ou status. A maioria dos relacionamentos é lógica e validada no aplicativo; não há FK de `owner` para institutions nem de `loans.student_id` para students. A única FK declarada nas migrations é `label_print_events.label_id → book_labels.id`.

## Tabela `institutions`

Cadastro institucional e vínculo de todos os dados de cada escola.

| Coluna | Tipo SQL | NOT NULL | Chave/geração | Default |
|---|---|---|---|---|
| `id` | TEXT | Sim | PK | — |
| `code` | TEXT | Sim | — | — |
| `name` | TEXT | Sim | — | — |
| `library_name` | TEXT | Sim | — | `''` |
| `gre` | INTEGER | Não | — | — |
| `cnpj` | TEXT | Sim | — | `''` |
| `city` | TEXT | Sim | — | `''` |
| `state` | TEXT | Sim | — | `''` |
| `cep` | TEXT | Sim | — | `''` |
| `address` | TEXT | Sim | — | `''` |
| `address_number` | TEXT | Sim | — | `''` |
| `district` | TEXT | Sim | — | `''` |
| `phone` | TEXT | Sim | — | `''` |
| `email` | TEXT | Sim | — | `''` |
| `contact_name` | TEXT | Sim | — | `''` |
| `contact_role` | TEXT | Sim | — | `''` |
| `contact_phone` | TEXT | Sim | — | `''` |
| `contact_email` | TEXT | Sim | — | `''` |
| `logo_url` | TEXT | Sim | — | `''` |
| `activated_at` | TEXT | Sim | — | `''` |
| `status` | TEXT | Sim | — | `'ativa'` |
| `notes` | TEXT | Sim | — | `''` |
| `license_plan` | TEXT | Sim | — | `'Educacional'` |
| `license_status` | TEXT | Sim | — | `'Ativa'` |
| `license_start` | TEXT | Sim | — | `''` |
| `license_end` | TEXT | Sim | — | `''` |
| `license_notes` | TEXT | Sim | — | `''` |
| `created_at` | TEXT | Sim | — | `CURRENT_TIMESTAMP` |
| `updated_at` | TEXT | Sim | — | `CURRENT_TIMESTAMP` |

Índices/constraints:

- `institutions_code_unique`: UNIQUE (`code`).

Chaves estrangeiras SQL: nenhuma.

`code` único (ex.: SGB-0001); `id` é owner usado pelos dados. `gre` é nullable para escolas antigas; UI/API exigem 1–21 nos cadastros novos. API atual edita name, library_name, GRE, city, state, contact_name/phone/email, status e license_start/end. Os demais campos existem no schema mas muitos não têm editor no console atual. Status é ativa/inativa/suspensa. license_status e license_plan não dirigem autorização. updated_at é atualizado pela API, sem trigger de atualização automática.

## Tabela `users`

Logins globais, credenciais derivadas, papel, escola e dados de apresentação.

| Coluna | Tipo SQL | NOT NULL | Chave/geração | Default |
|---|---|---|---|---|
| `id` | TEXT | Sim | PK | — |
| `username` | TEXT | Sim | — | — |
| `owner` | TEXT | Sim | — | — |
| `salt` | TEXT | Sim | — | — |
| `hash` | TEXT | Sim | — | — |
| `role` | TEXT | Sim | — | `'bibliotecario'` |
| `active` | INTEGER | Sim | — | `1` |
| `email` | TEXT | Sim | — | `''` |
| `phone` | TEXT | Sim | — | `''` |
| `last_login_at` | TEXT | Sim | — | `''` |
| `display_name` | TEXT | Sim | — | `''` |

Índices/constraints:

- `users_username_unique`: UNIQUE (`username`).
- `users_owner`: INDEX (`owner`).

Chaves estrangeiras SQL: nenhuma.

`username` é único no banco inteiro, não apenas na escola. `salt` e `hash` são material sensível e nunca devem ser exportados à UI/documentação como valores. `role`: bibliotecario/direcao/desenvolvedor por validação da API. `active`: 0/1 por convenção. `last_login_at` é ISO ao entrar; vazio antes do primeiro login. Não há foto/avatar persistido.

## Tabela `sessions`

Sessões autenticadas por hash de token; contexto de suporte pertence à sessão.

| Coluna | Tipo SQL | NOT NULL | Chave/geração | Default |
|---|---|---|---|---|
| `token_hash` | TEXT | Sim | PK | — |
| `user_id` | TEXT | Sim | — | — |
| `expires` | TEXT | Sim | — | — |
| `support_institution` | TEXT | Não | — | — |

Índices explícitos adicionais: nenhum. A PK fornece a identificação da linha.

Chaves estrangeiras SQL: nenhuma.

`token_hash` recebe SHA-256 do token aleatório; token bruto apenas no cookie. `expires` guarda timestamp em milissegundos como TEXT, convertido para inteiro ao consultar. `support_institution` é NULL normalmente. Relacionamentos user_id→users.id e suporte→institutions.id são lógicos; sem cascade ou FK. Limpeza de sessões expiradas acontece no login.

## Tabela `attempts`

Contador de tentativas de autenticação por chave derivada do IP.

| Coluna | Tipo SQL | NOT NULL | Chave/geração | Default |
|---|---|---|---|---|
| `key` | TEXT | Sim | PK | — |
| `count` | TEXT | Sim | — | — |
| `until` | TEXT | Sim | — | — |

Índices explícitos adicionais: nenhum. A PK fornece a identificação da linha.

Chaves estrangeiras SQL: nenhuma.

`count` e `until` são TEXT embora a aplicação faça operações numéricas. `until` é prazo em milissegundos. Chave é derivada do IP; não é username. Se IP não existe, a aplicação usa a mesma origem lógica unknown, podendo compartilhar limite.

## Tabela `books`

Obras/registros do acervo. Cada linha tem um UUID e declara uma quantidade de exemplares em data.copies.

| Coluna | Tipo SQL | NOT NULL | Chave/geração | Default |
|---|---|---|---|---|
| `id` | TEXT | Sim | PK | — |
| `owner` | TEXT | Sim | — | — |
| `registration` | TEXT | Sim | — | — |
| `data` | TEXT | Sim | — | — |

Índices/constraints:

- `books_owner_registration`: UNIQUE (`owner`, `registration`).

Chaves estrangeiras SQL: nenhuma.

`owner` corresponde a institutions.id. `registration` é único por owner e também é guardado no JSON. `data`: registration, copies, type, cdd, authors, title, local, publisher, year, pages, rack e shelf, tratados como strings pela API. Não há ISBN, created_at ou book-level responsável próprio. A localização está no JSON, não em tabelas de estantes/prateleiras.

## Tabela `loans`

Movimentações históricas, com texto do livro/aluno e vínculo opcional ao aluno interno.

| Coluna | Tipo SQL | NOT NULL | Chave/geração | Default |
|---|---|---|---|---|
| `id` | TEXT | Sim | PK | — |
| `owner` | TEXT | Sim | — | — |
| `data` | TEXT | Sim | — | — |
| `student_id` | INTEGER | Não | — | — |

Índices/constraints:

- `loans_owner`: INDEX (`owner`).
- `loans_owner_student`: INDEX (`owner`, `student_id`).

Chaves estrangeiras SQL: nenhuma.

`data`: student, grade, code, title, author, delivery, due e status. `code` é texto do número de registro, não FK nem barcode. `student_id` liga logicamente ao aluno da mesma escola. Não há book_id, label_id, returned_at, created_at ou usuário executor dentro da linha. O audit log registra algumas ações separadamente.

## Tabela `students`

Identidades automáticas de alunos, delimitadas pela escola, nome normalizado e série normalizada.

| Coluna | Tipo SQL | NOT NULL | Chave/geração | Default |
|---|---|---|---|---|
| `id` | INTEGER | Sim | PK AUTOINCREMENT | — |
| `owner` | TEXT | Sim | — | — |
| `name` | TEXT | Sim | — | — |
| `grade` | TEXT | Sim | — | — |
| `name_key` | TEXT | Sim | — | — |
| `grade_key` | TEXT | Sim | — | — |
| `created_at` | TEXT | Sim | — | `CURRENT_TIMESTAMP` |

Índices/constraints:

- `students_owner_identity`: UNIQUE (`owner`, `name_key`, `grade_key`).
- `students_owner_name`: INDEX (`owner`, `name_key`).

Chaves estrangeiras SQL: nenhuma.

`name_key` e `grade_key` são chaves NFKD sem marcas/acentos, com espaços normalizados e caixa baixa pt-BR. ID inteiro global apresentado como ALU-000001. Contagem/último empréstimo são calculados, não colunas. Troca de série cria outra identidade pelo critério atual; não existe matrícula escolar oficial para resolver homônimos.

## Tabela `audit_logs`

Registro administrativo de ações, associado a usuário e escola.

| Coluna | Tipo SQL | NOT NULL | Chave/geração | Default |
|---|---|---|---|---|
| `id` | TEXT | Sim | PK | — |
| `institution_id` | TEXT | Sim | — | — |
| `user_id` | TEXT | Sim | — | — |
| `action` | TEXT | Sim | — | — |
| `details` | TEXT | Sim | — | `''` |
| `created_at` | TEXT | Sim | — | `CURRENT_TIMESTAMP` |

Índices/constraints:

- `audit_logs_institution_created`: INDEX (`institution_id`, `created_at`).

Chaves estrangeiras SQL: nenhuma.

Relações institution_id→institutions e user_id→users são lógicas. details pode conter descrição/JSON da ação. Console exibe apenas 100 logs recentes globalmente e não apresenta details. Falha de auditoria em records é registrada no console, sem impedir a mutação principal.

## Tabela `book_labels`

Identidades permanentes por exemplar declarado, independentes do registro e do ISBN.

| Coluna | Tipo SQL | NOT NULL | Chave/geração | Default |
|---|---|---|---|---|
| `id` | INTEGER | Sim | PK AUTOINCREMENT | — |
| `book_id` | TEXT | Sim | — | — |
| `copy_number` | INTEGER | Sim | — | — |
| `owner` | TEXT | Sim | — | — |
| `institution_code` | TEXT | Sim | — | — |
| `code` | TEXT | Sim | GENERATED ALWAYS VIRTUAL | — |
| `print_count` | INTEGER | Sim | — | `0` |
| `last_printed_at` | TEXT | Não | — | — |
| `created_at` | TEXT | Sim | — | `CURRENT_TIMESTAMP` |

Índices/constraints:

- `book_labels_book_copy`: UNIQUE (`book_id`, `copy_number`).
- `book_labels_code`: UNIQUE (`code`).
- `book_labels_owner`: INDEX (`owner`).

Chaves estrangeiras SQL: nenhuma.

`book_id` liga ao UUID do livro; `copy_number` identifica a posição 1..copies. `institution_code` guarda prefixo sem SGB- e é congelado com a identidade. code é virtual, calculado como SGB-prefixo-ID de pelo menos seis dígitos. ID AUTOINCREMENT global não reinicia por escola. Sem FK para books: etiquetas antigas ficam preservadas após exclusão da obra, mas JOIN da API deixa de mostrá-las. print_count e last_printed_at são alterados pelo trigger de eventos.

## Tabela `label_print_events`

Confirmações manuais de impressão, idempotentes por trabalho e etiqueta.

| Coluna | Tipo SQL | NOT NULL | Chave/geração | Default |
|---|---|---|---|---|
| `job_id` | TEXT | Sim | — | — |
| `label_id` | INTEGER | Sim | — | — |
| `printed_at` | TEXT | Sim | — | `CURRENT_TIMESTAMP` |

Índices/constraints:

- `label_print_events_job_label`: UNIQUE (`job_id`, `label_id`).

FK declarada: `label_id → book_labels.id`, ON DELETE NO ACTION, ON UPDATE NO ACTION.

Não tem chave primária; a unicidade composta job_id/label_id é o mecanismo de idempotência. FK é NO ACTION em atualização/exclusão. printed_at é horário de confirmação, não comprovação do instante de impressão física.

## Relações e triggers

| Relação | Natureza | Regra |
|---|---|---|
| institutions.id → books/loans/students/users/book_labels.owner | Lógica | Contexto da escola deve ser derivado da sessão |
| users.id → sessions.user_id | Lógica | Usuário ativo e sessão não expirada |
| institutions.id → sessions.support_institution | Lógica, nullable | Apenas desenvolvedor escolhe suporte |
| students.id → loans.student_id | Lógica, nullable | ID consultado com o mesmo owner |
| books.registration → loans.data.code | Texto, por escola | Sem FK; histórico conserva texto original |
| books.id → book_labels.book_id | Lógica | Identidade permanente por copy_number |
| book_labels.id → label_print_events.label_id | FK SQL | Não remover identidades com eventos |
| institutions/users → audit_logs | Lógica | IDs da instituição e do executor real |

Triggers definidos **manualmente em 0006**:

- `books_create_label`: após INSERT de livro, cria uma identidade por exemplar declarado.
- `books_add_labels`: após aumento de copies no JSON, cria apenas posições novas; redução conserva as identidades antigas.
- `book_labels_identity_immutable`: impede UPDATE de id, book_id, copy_number, owner ou institution_code que altere sua identidade.
- `label_print_events_count`: após novo evento, incrementa print_count e atualiza last_printed_at.

`code` usa `'SGB-' || institution_code || '-' || printf('%06d', id)`. Ausência de instituição gera prefixo de fallback `0000`: isso não corrige owners órfãos e deve ser investigado. Reimpressão nunca gera outra identidade.

As migrations também geram estruturas internas SQLite como `sqlite_sequence` para AUTOINCREMENT; o Wrangler pode manter `d1_migrations` para controlar aplicações. Não são tabelas de negócio do schema Drizzle. Seu estado remoto e eventuais tabelas extras só podem ser confirmados consultando sqlite_master. Não resetar sqlite_sequence nem apagar d1_migrations.

# 6. MIGRATIONS

| Ordem/arquivo | Efeito | Dependência/estado atual |
|---|---|---|
| `0000_perfect_donald_blake.sql` | books, loans e UNIQUE(owner,registration) | Base do acervo e circulação |
| `0001_flowery_slapstick.sql` | attempts, sessions, users e username único | Autenticação usa estas estruturas |
| `0002_powerful_mattie_franklin.sql` | users.role, default bibliotecario | Mantém contas antigas como bibliotecárias |
| `0003_multi_school.sql` | institutions, piloto com owner de leila, active/email/phone/last_login_at/display_name em users, support_institution em sessions, audit_logs; índices loans_owner/users_owner | Depende de 0000–0002 e da conta piloto no banco legado |
| `0004_magical_redwing.sql` | institutions.gre INTEGER nullable | Depende de institutions; não atribui GRE fictícia às escolas antigas |
| `0005_remarkable_masked_marvel.sql` | students, índices de identidade/nome, loans.student_id e índice composto | Depende das estruturas anteriores; associação de históricos ocorre no código depois |
| `0006_book_labels.sql` | book_labels, eventos, índices, FK, backfill de exemplares e quatro triggers | Depende de books/institutions; usa JSON copies e prefixo institucional |

**⚠️ NUNCA reaplicar manualmente migrations já aplicadas.** CREATE/ALTER/índices/triggers não são uma sequência genericamente idempotente. 0003 pode tentar reinserir o código piloto; 0004/0005 tentam adicionar colunas existentes; 0006 tenta recriar estruturas/preencher identidades existentes. Não usar `d1 execute --file` em todas as SQLs de um D1 ativo.

Todas continuam importantes para reconstruir o schema de um ambiente novo de testes e interpretar dados existentes. Isso não autoriza recriar produção. Os snapshots/journal documentam geração; o histórico do Wrangler no D1 indica o que foi realmente aplicado. Não editar migration publicada para mudar silenciosamente a semântica.

0003 não reescreve books/loans; seu INSERT piloto específico pode deixar dados de outros owners sem instituição se houver legado não previsto. O verificador multi-escola antigo foi criado para detectar esse cenário. 0005 não altera texto dos empréstimos. 0006 preenche a tabela de etiquetas sem reescrever livros; volume do backfill cresce com soma de copies, não apenas número de livros.

# 7. SISTEMA MULTI-ESCOLA

`institutions.id` é o identificador durável de escola. books, loans, students, users e book_labels guardam esse ID em owner. Código institucional como SGB-0001 é apresentação/prefixo, não substitui owner.

Bibliotecária/direção recebem owner da própria conta. Desenvolvedor fora de suporte tem institutionId NULL e é direcionado ao admin. Em suporte, sessions.support_institution vira owner efetivo. Não se passa owner confiável do navegador para as APIs de biblioteca: elas usam getUser().

`records` filtra leituras/edições/devoluções/exclusões/clones pelo owner; estudantes são resolvidos por ID+owner; Dashboard e relatórios filtram escola; labels faz JOIN owner entre livro e identidade; confirmação de impressão valida seleção inteira contra a escola. Escritas também conferem role e Origin.

`/api/admin` é uma exceção intencional: desenvolvedor vê dados institucionais agregados e usuários/logs de toda a rede. Bibliotecária/direção recebem 403. Diagnóstico exige desenvolvedor em suporte e limita contagens ao contexto.

O banco não oferece row-level security nem FKs de owner. Proteção é responsabilidade de cada consulta. SQL administrativo executado diretamente com credenciais Cloudflare pode acessar todas as escolas: nunca tratá-lo como API limitada ao usuário. Novas rotas devem repetir os filtros e testar troca de suporte, nomes/registros iguais entre escolas e IDs maliciosos de outra escola.

# 8. PERFIS E PERMISSÕES

| Perfil real | Acesso | Escrita |
|---|---|---|
| bibliotecario | /sistema, abas comuns, relatórios/exportações/etiquetas da escola | Livros novos/edição/clones/exclusão protegida; empréstimos/devoluções; confirmação de etiqueta |
| direcao | Mesmas consultas da escola, Dashboard, relatórios e exportações | Sem mutações em records/labels; botões de cadastro, edição, clone, exclusão, devolução e impressão operacional são ocultados |
| desenvolvedor, sem suporte | /admin, rede de escolas/usuários/logs | Criar/editar escola, criar/editar usuários não desenvolvedores, redefinir senha, entrar/sair de suporte |
| desenvolvedor, com suporte | /sistema da escola selecionada, abas adicionais Diagnóstico e Estatísticas; admin continua autorizado | Mesmas mutações de biblioteca da bibliotecária no contexto escolhido |

Não há role `administrador`, `aluno`, `professor` nem login de aluno. Direção pode baixar CSV e usar impressão do relatório; a página de etiquetas em modo leitura oculta controles operacionais, mas CSS/navegador não impedem Ctrl+P. Autorização relevante para contabilização está na API.

`canClone()` permite bibliotecario **e** desenvolvedor; não existe exclusividade do desenvolvedor para clonagem no código atual. Admin não tem exclusão de escola nem botão para apagar o banco. Ativação inicial de desenvolvedor é um fluxo separado protegido por secret, não criação normal de usuário no console.

# 9. LOGIN E SESSÃO

Frontend em `app/page.tsx`; API em `app/api/auth/route.ts`; identidade em `app/auth.ts`.

1. GET /api/auth informa se faltam usuário inicial ou desenvolvedor; não entrega credenciais.
2. Login normaliza username com trim/lowercase; formato 3–50 caracteres `[a-z0-9._-]`. Senha de 10–128 caracteres.
3. PBKDF2 SHA-256, 100.000 iterações, salt aleatório de 24 bytes e derivação 256 bits; verificação com comparação que percorre os tamanhos.
4. Rate limit por hash do IP, janela de 15 minutos; acima de 10 tentativas devolve 429. Autenticação bem-sucedida limpa contador.
5. Usuário precisa estar ativo. Bibliotecária/direção precisam de instituição com status ativa. Prazo license_end não é verificado.
6. Gera token aleatório de 32 bytes, persiste só digest SHA-256 e expiração fixa em 8 horas; elimina sessões expiradas e atualiza last_login_at.
7. Cookie `sgb_session`: HttpOnly, Secure, SameSite strict, Path /, Max-Age 8h. Não é JWT e não é guardado em localStorage.
8. Login de desenvolvedor vai para /admin; demais para /sistema. A página /sistema redireciona desenvolvedor sem suporte ao admin.
9. Logout usa POST action logout, apaga sessão daquele token e expira cookie. Inativação de usuário/reset de senha apagam suas sessões.

O navegador guarda **somente usernames** em `sgb.remembered-usernames.v1`, máximo 20, permitindo escolher/remover nomes e entrar com outro usuário. Isso não é lista de contas do servidor nem autenticação automática. Senha nunca é armazenada por esse código.

Configuração inicial requer SGB_SETUP_CODE, só cria a conta inicial quando não existem usuários e tenta preservar owner legado único. Ativação de desenvolvedor requer SGB_DEVELOPER_CODE e primeira conta bibliotecária; só há um desenvolvedor por esse fluxo. Não registrar valores dos códigos, senhas, salts ou hashes.

Expiração é fixa, não renovada a cada uso. Não existe logout por inatividade com temporizador nem garantia de logout ao fechar o navegador. APIs respondem 401 na próxima consulta; páginas protegidas redirecionam. Algumas telas tratam falha genérica em vez de redirecionar imediatamente, e o cookie só se torna irrelevante após expiração/revogação. Em desenvolvimento HTTP, validar comportamento do cookie Secure no browser utilizado.

Pontos pendentes: nenhuma foto persistida; limite pode ser compartilhado sem cf-connecting-ip; admin logout navega sem verificar status de retorno; falhas de banco durante getUser(), fora de alguns try/catch, podem aparecer como erro de página/API. Não há recuperação por e-mail ou MFA implementados.

# 10. TELAS E NAVEGAÇÃO

| Tela/URL ou aba | Componente | Dados/APIs | Ações/modais e autorização |
|---|---|---|---|
| `/` | app/page.tsx | /api/auth | Entrar, escolher/remover username, outro usuário, setup/ativar desenvolvedor |
| `/sistema`: Início (start) | Library | /api/records carrega mesmo aqui | Logo central, manutenção/suporte WhatsApp; todos no contexto |
| Painel Geral (home) | Library | books/loans carregados | Quatro indicadores, recentes, explorar prateleiras; Novo empréstimo/Registrar livro para escrita |
| Dashboard (dashboard) | DashboardPanel | /api/dashboard | Períodos, série/status, gráfico e rankings |
| Empréstimos (loans) | Library | /api/records | Falta entregar/Entregues, Novo empréstimo, Devolver |
| Prateleiras (shelves) | Library | /api/records | Busca, 12 estantes/5 prateleiras, paginação 50, detalhes expansíveis; editar, clonar, seleção/exclusão e imprimir etiqueta |
| Relatórios (reports), via ☰ | ReportsPanel | HTML /relatorio | Data inicial/final e link Gerar Relatório em nova aba |
| Etiquetas e códigos (labels), via ☰ | LabelsPanel | /api/labels | Pesquisa/filtro/tamanho, seleção, prévia, impressão/reimpressão |
| Diagnóstico (health) | DeveloperPanel | /api/diagnostics | Desenvolvedor em suporte; refresh e últimas 10 medições |
| Estatísticas (stats) | DeveloperPanel | /api/diagnostics | Desenvolvedor em suporte; acervo, circulação, usuários/sessões |
| `/relatorio?inicio=...&fim=...` | app/relatorio/page.tsx | D1 loans por período | Ranking textual de leitores; precisa escola/sessão |
| `/relatorio/alunos` | app/relatorio/alunos/page.tsx | loadStudentReport | Todos alunos/histórico, Baixar para Excel · CSV, Imprimir/Salvar PDF |
| `/etiquetas/imprimir?selecao=...` | página server + LabelPrintPage | sessionStorage da nova aba e /api/labels | Diálogo de impressão, imprimir novamente, confirmar saída física |
| `/admin`: Visão Geral | AdminConsole | /api/admin | Totais rede, cinco primeiras escolas, ir às escolas |
| `/admin`: Escolas | AdminConsole | /api/admin | GRE, cadastro, detalhe, editar, novo usuário, entrar suporte |
| `/admin`: Usuários | AdminConsole | /api/admin | GRE/escola, editar usuário, redefinir senha |
| `/admin`: Logs | AdminConsole | /api/admin | Últimos 100 eventos; sem filtro/exportação de logs |

As abas são **estado React**, não páginas com URL individual. Atualizar /sistema retorna à Início; filtros/aba/seleções não são persistidos. Admin também mantém navegação no estado local.

Barra de biblioteca: **☰ → SGB / Sistema de Gestão Bibliotecária → ?**, abas e perfil com círculo de iniciais/nome/papel/Sair. CSS adapta em duas linhas em telas menores. Em suporte há faixa “Modo de suporte ativo / Você está acessando: [escola] / Sair do modo de suporte”.

Menu ☰ atual: Relatórios > (empréstimos por período, gerar relatório de alunos); Exportações > (acervo CSV, empréstimos CSV, dados da escola JSON); Etiquetas e códigos. **Etiquetas também foi inserida ao final de ambos os submenus**, portanto está repetida. Não há menu ativo Histórico, Dados e Backup, Atividade do Sistema ou Configurações; os rótulos antigos não são funcionalidades atuais.

Menu abre/fecha pelo clique do botão, fecha ao selecionar opção ou clicar fora. Sem mouseleave/mouseout; hover/foco seleciona submenu, que persiste. Não há listener para ESC no ExtraMenu. No desktop submenu abre ao lado, no mobile abaixo. Animação curta extra-menu-show. A navegação por teclado não equivale a um menu ARIA completo (sem roving focus/setas).

Botão ? abre InfoDialog sem buscar API: logo, **“Licenciado para: Escolas Seduc PI”**, equipe e agradecimentos estáticos, versão e ×. Equipe: Marcos Emanuel (desenvolvedor), João Guilherme e Benedito Ribeiro (organização do acervo), Davi Lucas e Flávio Levy (catalogação), Jeremias (colaborador). Agradecimentos: João Mateus, Abraão Lucas, Yzis Gabrieli, Elison Carlos e Isabely Vitória. Não é licença dinâmica da escola atual.

Modais adicionais: cadastro/edição de livro, Novo empréstimo com sugestões de aluno, clonagem em duas etapas, confirmação AlertDialog de exclusão e preview de etiqueta. Console admin utiliza formulários/seções inline para escolas, usuários e senha. Menus e estilo internos existentes não foram alterados nesta entrega.

# 11. LIVROS / PRATELEIRAS / ACERVO

Campos de formulário/JSON: registration (número de registro), copies, type (tipo de obra), cdd, authors, title, local, publisher, year, pages, rack, shelf. `owner` e UUID são adicionados pelo servidor.

Cadastro exige registro, título e autores. normalizeBook aceita apenas strings de até 1.000 caracteres, trim em todos os campos; registro até 100. Copies inteiro 1–100.000; estante 1–12; prateleira 1–5; páginas opcional, inteiro positivo quando preenchido. Ano e CDD são texto, sem validação especializada. ISBN não existe neste formulário/schema de negócio.

**Registro não pode se repetir textualmente dentro da mesma escola**: API pré-consulta e UNIQUE(owner,registration). Pode repetir em escolas diferentes. `1` e `01` são textos diferentes; não existe normalização para remover zeros. Copies declara quantidade dentro de uma mesma linha de obra; etiquetas distinguem exemplares, mas circulação ainda não está vinculada ao exemplar.

Editar mantém UUID; não permite mudar registro quando há empréstimo ativo pelo registro antigo, mas permite mudar outros metadados. A edição normal substitui o JSON pelos campos conhecidos, de modo que extensões futuras precisam ser preservadas conscientemente. Não mover owner do livro manualmente: etiquetas possuem owner/prefixo imutáveis.

Clonar: escolhe 1–100 novas linhas, informa cada registro, copia metadados incluindo quantidade copies, gera UUID por clone e novos códigos pelo trigger. Rejeita duplicação no lote/escola. Pode ser executado por bibliotecária e desenvolvedor em suporte.

Exclusão: seleção até 100; lote inteiro fica bloqueado se qualquer item tiver empréstimo não Devolvido ligado pelo registro e escola. Histórico loans não é removido; etiquetas ficam retidas no banco, fora do JOIN de livros ativos. Há confirmação explícita UI. Não existe lixeira/restauração automática.

Ordenação: compareRegistrations descendente, inteiros com BigInt (evita precisão perdida), numéricos antes de alfanuméricos e collation natural pt-BR como desempate. É aplicada na API e novamente na listagem; não depende da última inclusão. Pesquisa por título/autor/registro da listagem é client-side lowercase, sem remover acentos. Filtros rack/shelf e paginação 50 são client-side. Estantes são configuração fixa, sem cadastro específico.

# 12. EMPRÉSTIMOS

Campos: nome (`student`), série (`grade`), código de registro (`code`), título (`title`), autor (`author`), data de entrega (`delivery`), devolução **prevista** (`due`), status (`Emprestado` ou `Devolvido`); ID UUID, owner e student_id são internos.

No popup, bibliotecária digita os dados normalmente, seleciona ou cria identidade automática de aluno e salva POST records kind loan. Datas precisam de formato YYYY-MM-DD e due >= delivery. API valida formato/ordem lexical, mas não faz round-trip de calendário; tratar datas impossíveis como risco, não supor validação completa.

A API não exige que code exista no acervo, não preenche livro automaticamente e não consulta disponibilidade/copies. **O mesmo registro pode ser emprestado simultaneamente para várias pessoas**, sem limite automático de estoque. Não há FK book_id/label_id e o código de barras não está integrado à criação/devolução. Essa é a implementação atual, não uma garantia de controle físico de exemplares.

Devolver: POST action return, id e owner; altera JSON status para Devolvido e registra auditoria `devolucao`. Não grava data efetiva da devolução; due continua sendo prazo previsto. Não há editar/excluir empréstimo na UI/API atual. Repetir devolução na API pode registrar outro evento, sem mudar estado final.

UI oferece Falta entregar (todos não Devolvido) e Entregues. Atrasado é classificação calculada por due < hoje para ativos, não status persistido. Datas vencendo hoje não são atrasadas pelo critério. Histórico de devolvidos permanece em loans; nomes/livros guardados no JSON são snapshots textuais.

# 13. ALUNOS

**IMPLEMENTADO.** Tabela students e loans.student_id (migration 0005). Não existe aba de cadastro manual. resolveStudent cria/busca ficha durante o salvamento do empréstimo.

Identidade é combinação **owner + name_key + grade_key**. cleanStudentText reduz espaços; studentKey faz NFKD, remove marcas Unicode e lower pt-BR. Variações de caixa/espaçamento/acentos coincidem; nomes apenas parecidos não são mesclados. Série também participa: aluno em série nova fica em outra ficha; homônimos na mesma série/escola coincidem porque matrícula/CPF não existe.

ID é INTEGER AUTOINCREMENT global, mostrado ALU-000001 (mínimo seis dígitos). A ficha guarda nome/série limpos, owner e created_at. Quantidade e último empréstimo são consultas COUNT/MAX de loans da mesma escola. Não são atualizados em colunas contadoras.

Autocomplete: após cerca de 180ms, GET students?q=...; mínimo duas letras, prefixo de nome normalizado, até oito sugestões; AbortController cancela consulta antiga. Mostra nome/série/quantidade. Seleção preenche nome/série e ID; alterar qualquer dos dois limpa ID. “+ Usar como novo aluno” aparece quando não há sugestões. Backend sempre revalida ID, owner e chaves.

UNIQUE evita duplicidade concorrente para identidade exata; INSERT OR IGNORE seguido de SELECT resolve ficha existente. INSERT aluno e INSERT empréstimo não estão numa única transação: falha posterior pode deixar ficha sem empréstimos, incluída no relatório.

associateLegacyLoans processa apenas student_id NULL da escola, cria/associa ficha quando nome/série válidos; não apaga nem reescreve JSON antigo. É chamado nos GET de alunos, Dashboard e relatório de alunos, portanto **essas consultas podem escrever associações internas**. Registros malformados/sem nome/série são ignorados e continuam funcionando como legado, podendo ficar fora de ranking por ID. Não executamos essa associação contra produção nesta análise.

# 14. DASHBOARD

**IMPLEMENTADO** por DashboardPanel, summarizeDashboard e GET /api/dashboard. Dados reais do D1 da escola/suporte; não há dados de demonstração no painel.

Filtros: Hoje; Últimos 7 dias (inclui hoje); Este mês (primeiro dia até hoje); Este ano (1º janeiro até hoje); Período personalizado; série e status Todos/Ativos/Devolvidos/Atrasados. Datas locais são enviadas pela UI; API usa UTC como fallback de today, podendo diferir perto da meia-noite.

Quatro cards: empréstimos no período, alunos atendidos por ID válido, livros diferentes emprestados e empréstimos ativos **dentro do período selecionado**. O critério temporal é delivery, não due nem data real de devolução.

Gráfico Empréstimos por período: linha Recharts, dias com zeros incluídos; intervalos >90 dias agrupam por mês. Top 10 alunos por student_id com ALU, nome/série/total; Top 10 livros por chave normalizada **título+autor**, não por UUID/exemplar; barras horizontais das dez séries mais frequentes. Obras homônimas de mesmo autor são agrupadas mesmo com registros distintos.

API associa legados, seleciona loans de owner com JSON delivery BETWEEN e todos students da escola; agregações e filtros adicionais ocorrem em JavaScript. Limite de intervalo de aproximadamente três anos. JSON inválido de loan é ignorado pela agregação. availableGrades usa séries da ficha de aluno; filtros comparam série do empréstimo, e variações de apresentação podem gerar opções duplicadas.

**Limitações/parcial:** métricas de exemplar exato dependem de futuro vínculo loan→label; homônimos/mudança de série não têm matrícula estável. Não há drill-down/exportação direta de cada gráfico nem atualização por push/stream. Não inventar planos de análise financeira ou metas de leitura ausentes no código.

# 15. RELATÓRIOS

Relatórios saiu da barra principal e é aberto via ☰. Duas funcionalidades reais:

| Relatório | Geração | Conteúdo/consulta | Limites |
|---|---|---|---|
| Empréstimos por período | ReportsPanel escolhe inicio/fim; link target _blank para /relatorio | loans.owner + delivery BETWEEN inclusivo; agrupa nome/série normalizados, ordena quantidade e exibe ranking de leitores | Não usa student_id; não lista títulos nesta página, nem mostra série apesar de separá-la no agrupamento |
| Alunos | Link target _blank /relatorio/alunos | Todos students da escola e seus loans associados; lista ficha, totais ativos/devolvidos, livros/autor/registro/delivery/due/status | Histórico completo, sem filtro por período nesta página |

Período usa validReportPeriod com validação de calendário e início <= fim. Intervalo inválido gera aviso e link de retorno. Relatório por período não exige associação de legados; alunos usa loadStudentReport/associateLegacyLoans. Consulta de loans do relatório de alunos valida owner e student_id pertencente à escola, inclusive vínculos errados de outros owners são excluídos.

Relatório alunos tem Imprimir/Salvar PDF via window.print e download CSV servidor. CSV tem BOM UTF-8, delimitador ponto e vírgula, cabeçalhos em português, aspas escapadas e proteção contra fórmulas iniciadas por =/+/@/-. Uma linha por empréstimo; aluno sem loans gera linha com campos de livro vazios. Inclui identificação, série, criação, total/ativos/devolvidos/último empréstimo e detalhes dos livros. **É CSV compatível com Excel, não arquivo XLSX nativo.** PDF depende da opção Salvar PDF do navegador, sem renderizador PDF no backend.

Por período pode usar impressão padrão do navegador, mas não tem botão dedicado. Não existem todos os relatórios específicos (autor/editora/nunca emprestados/devoluções efetivas etc.) solicitados em versões anteriores: menu atual foi reduzido às funções implementadas. Todos exigem sessão + escola; desenvolvedor precisa suporte para dados de biblioteca.

Exportações ☰: CSV acervo (registro/título/autores/editora/ano/copies/rack/shelf), CSV loans (aluno/série/título/código/delivery/due/status), JSON dos books/loans já carregados com rótulos traduzidos. JSON não é exportação completa do banco nem restauração de backup. Campos internos não presentes no mapa, como studentId, podem manter nome técnico; traduções não são universalmente completas.

# 16. PAINEL ADMINISTRATIVO

/admin monta AdminConsole após exigir desenvolvedor. Apenas quatro vistas: Visão Geral, Escolas, Usuários, Logs. Logo public/admin-logo.png, sidebar própria, perfil de iniciais e botão Sair. Não é o Dashboard da biblioteca.

GET admin retorna instituições com métricas agregadas (livros, copies, loans, ativos, atrasos, usuários, estudantes por texto normalizado SQL simplificado, localizações e último acesso), usuários sem hash/salt e 100 logs recentes. UI utiliza parte dessas métricas. Visão Geral mostra três cards e cinco escolas.

Cadastrar escola exige: nome da escola, nome biblioteca, GRE, cidade, estado, nome responsável, status ativa/inativa/suspensa, início/vencimento licença; telefone/e-mail responsável opcionais. Não há campos CNPJ/endereço/plano no formulário atual apesar de colunas legadas. ID UUID e código sequencial SGB-%04d gerados servidor. E-mail é validado quando preenchido; datas verificadas por formato/ordem, sem round-trip completo.

Editar escola altera os mesmos campos e updated_at. Status inativa/suspensa impede bibliotecária/direção de acessar; getUser verifica status em cada consulta. Licença é período informativo armazenado. **Não há vencimento automático, renovação/cobrança automática ou editor de planos.** Renovar manualmente equivale a editar as datas. Não confundir license_status com institutions.status efetivamente usado.

Novo usuário exige escola existente, nome, username global, senha inicial, perfil bibliotecario/direcao; contatos opcionais. Edição permite nome/role/active/contatos. Reset de senha e inativação revogam sessões. Admin não cria outro desenvolvedor pelo formulário normal nem exclui usuários/escolas.

Logs registram criação/edição institucional/usuário, reset, suporte e ações de biblioteca. UI mostra quando/escola/login/ação; não apresenta details. Usuário desenvolvedor pode aparecer como — porque GET admin exclui desenvolvedores da lista de usuários usada para resolver nomes dos logs.

Modo suporte: POST enter-support verifica escola e altera support_institution na sessão atual do desenvolvedor. /sistema passa a consultar owner dessa escola e mostra banner de contexto. Sair limpa support_institution e retorna /admin. Cookie/usuário real não são trocados. A escola alvo pode estar inativa/suspensa: desenvolvedor tem acesso de suporte mesmo assim. Abrir outra aba admin e trocar suporte afeta o contexto da mesma sessão em todas as abas; recarregar dados ao mudar contexto evita exibir resultado antigo.

# 17. GRES

GRE é `institutions.gre`, INTEGER opcional no banco. Não existe tabela GRE, CRUD de regionais nem vínculo de usuário diretamente com GRE. Lista fixa 1 a 21 criada no componente; apresentação GRE 01–21.

Cadastros/edições novos exigem inteiro 1–21 no backend. Escolas legadas podem manter NULL e aparecem em “GRE não informada”. Console filtra escolas por igualdade da GRE e organiza usuários dentro dessas escolas. A GRE organiza visualização administrativa, **não define fronteira de autorização**; esta continua institutions.id/owner.

Não preencher GRE antiga por adivinhação. Nomes oficiais/endereço da regional não existem nesta estrutura. Status/permissão não são herdados da GRE.

# 18. ETIQUETAS E CÓDIGO DE BARRAS

**IMPLEMENTADO no código**, com migration aditiva 0006. Estado de aplicação remota e impressão física não confirmado.

Acesso ☰ Etiquetas e códigos ou Imprimir etiqueta nos detalhes de livro. LabelsPanel pesquisa título, registro, autor ou código normalizados sem acentos, filtra Todos/Sem etiqueta/Já impressos, seleciona linhas ou todos resultados e pagina em 50 no cliente. “Sem etiqueta” significa print_count=0, não ausência de identidade.

Cada unidade declarada em copies recebe uma linha book_labels. Exemplo **ilustrativo de formato**, não dado real: SGB-0001-001847. Registro e ISBN não compõem identidade. O ID global e prefixo congelado dão unicidade, com índice code unique e trigger de imutabilidade. Edição/reimpressão mantém o mesmo código; redução de copies apenas oculta excedentes, e novo aumento reutiliza identidades guardadas.

Code 128 é calculado via JsBarcode local e renderizado em SVG com quiet zones, adequado em princípio a leitores comuns. Conteúdo: SGB, escola atual, barras, código legível, título e registro. Não inclui preço/inventário complexo.

Tamanhos configuráveis em labelSizes: **50×30, 50×25, 40×30 mm**, com prévia em dimensão física CSS usando o mesmo BookLabel que a impressão. Impressão abre nova aba e diálogo padrão; CSS @page em mm, margem zero, uma etiqueta por página e controles escondidos. Destino esperado é **impressora térmica de etiquetas instalada no Windows**, não uma folha A4 com cards.

Driver precisa ter a medida escolhida, escala 100%, margens zero e cabeçalho/rodapé desativado. O site não consegue forçar impressora específica, parâmetros do Windows, corte/alimentação ou desativação de cabeçalho em todos os browsers. Não existe integração proprietária/ZPL/EPL nesta versão.

Seleção máxima validada: 5.000 IDs; até 80 confirmações por batch. openLabelPrint abre about:blank sincronamente (reduz bloqueio de popup), grava seleção/tamanho no sessionStorage **da nova aba**, remove opener e navega por chave de seleção. Sessão/cookies continuam necessários. Popup bloqueado produz aviso; seleção ausente ou de outra escola não é impressa.

Impressão inicia automaticamente após renderização; “Imprimir novamente” cria novo jobId. **Confirmar que as etiquetas foram impressas** registra saída manualmente, não afterprint automático. Evento unique(jobId,labelId) permite repetir confirmação após erro sem duplicar print_count. Cancelar impressão não deve ser confirmado. last_printed_at é horário da confirmação. Batch grande pode confirmar parcialmente por chunks; repetir mesmo trabalho completa sem duplicar anteriores.

API GET labels?code=... resolve exemplar ativo exato na escola, estrutura preparada para leitor USB futuro. Não integra scanner à tela de loans/devoluções. Códigos de cópias reduzidas ou de obra excluída ficam no banco, mas lookup ativo não os retorna. Recarregar aba de impressão mantém seleção, pode abrir diálogo novamente e gerar outro trabalho: confirmar só se houver nova saída física.

# 19. INTEGRAÇÕES EXTERNAS

| Integração | Estado/arquivo |
|---|---|
| WhatsApp | Link `https://wa.me/5586994577046` em Library/Início; clique abre conversa/contato de suporte em nova aba. Não usa API de envio nem lê conversas |
| Cloudflare Workers/D1 | Infraestrutura real configurada via Wrangler; env.DB no servidor |
| GitHub | Repositório original e histórico; integração com Cloudflare foi informada pelo usuário, mas branch/comandos configurados no dashboard não estão comprovados no código |
| Impressora térmica | Navegador/driver Windows; sem SDK proprietário ou impressão silenciosa |
| Code 128 | Biblioteca npm local, sem requisição a serviço externo |
| Scanner USB | Lookup labels exato preparado; captura automática em loans/devoluções AINDA NÃO IMPLEMENTADA |
| Câmera/OCR | Nenhuma integração ativa encontrada |
| ISBN/catálogo externo | Nenhum campo/pesquisa/API de ISBN ativo encontrado |
| ChatGPT/Sites auth | Helper e plugin herdados do starter, não importados pelas rotas de negócio; não são autenticação real SGB |
| R2/BUCKET | Tipagem/config opcional herdada; produção atual não declara bucket e o SGB não salva imagens nele |
| CDN de assets | UI principal referencia arquivos public e bibliotecas npm; sem dependência de CDN para gerar barras ou dados de negócio |

Não existe SMS, SMTP de recuperação, gateway de licença/pagamento, sincronização com matrícula escolar ou armazenamento de foto ativo. Não chamar algo de integração implementada apenas porque há dependência no package.json.

# 20. CLOUDFLARE

Worker existente **sgb**. Endereço informado pelo proprietário: [sgb.bibliotecalucimargomes.workers.dev/sistema](https://sgb.bibliotecalucimargomes.workers.dev/sistema). O nome do hostname antigo não significa que a interface seja restrita à biblioteca antiga.

`wrangler.production.jsonc`: main dist/server/index.js; no_bundle true; rules ESModule para js/mjs (incluem runtime/chunks gerados); assets dist/client; compatibility_date 2026-05-15, nodejs_compat; keep_vars true; observability/logs habilitados. Não publicar fonte antiga nem dist desatualizado.

Binding `DB` → banco `sgb-db`, database_id `501e257e-e6fe-4720-b326-b36cd015a239`, migrations_dir drizzle. Esse ID é identificador de recurso, **não secret**; não o substituir para atualizar o sistema. `wrangler-d1.jsonc` contém somente identificação/binding para operações de D1, sem entrypoint/assets.

vite.config.ts utiliza Vinext, plugin Sites e plugin Cloudflare com RSC/SSR. Config local deriva binding lógico de .openai/hosting.json e aponta ID do D1 no arquivo, mas desenvolvimento simula banco local: presença de database_id no arquivo não prova uso remoto pelo dev server. O build produz dist/server e dist/client; npm start usa config gerada dist/server/wrangler.json para preview local, não deploy.

Secrets de aplicação esperados: **SGB_SETUP_CODE**, **SGB_DEVELOPER_CODE**, lidos via env no auth. Não há JWT_SECRET no código. Só configurar valores por mecanismo seguro da Cloudflare; nunca escrever valores no repositório/documento. keep_vars não dispensa validar bindings/secrets da conta de destino.

CLI autenticada precisa de acesso à conta e D1 existentes; não registrar token OAuth/API, URLs assinadas de exportação ou conteúdo de credenciais. Histórico do usuário mostrou erro Authentication error 10000 resolvido por wrangler login, mas esta sessão não tem essa autenticação. Erro antigo “No such module _next/static/rolldown-runtime...” foi motivo para regras de módulos no config; confirmar dist/build atual antes de atribuir novo erro à mesma causa.

# 21. D1

Nome sgb-db, binding DB, dados reais externos ao Git. Não executar comandos remotos para mera documentação. Referências de consultas **somente leitura**, quando autorizado/autenticado e na raiz:

```powershell
npx --yes wrangler@4.142.0 d1 migrations list sgb-db --remote --config wrangler-d1.jsonc
npx --yes wrangler@4.142.0 d1 execute sgb-db --remote --config wrangler-d1.jsonc --command "SELECT name,type FROM sqlite_master WHERE type IN ('table','index','trigger') ORDER BY type,name;"
npx --yes wrangler@4.142.0 d1 execute sgb-db --remote --config wrangler-d1.jsonc --command "SELECT (SELECT COUNT(*) FROM books) AS livros, (SELECT COUNT(*) FROM loans) AS emprestimos, (SELECT COUNT(*) FROM users) AS usuarios, (SELECT COUNT(*) FROM institutions) AS escolas;"
npx --yes wrangler@4.142.0 d1 execute sgb-db --remote --config wrangler-d1.jsonc --command "SELECT COUNT(*) AS livros_leila FROM books WHERE owner=(SELECT owner FROM users WHERE username='leila');"
npx --yes wrangler@4.142.0 d1 execute sgb-db --remote --config wrangler-d1.jsonc --command "PRAGMA table_xinfo(book_labels);"
```

table_xinfo, ao contrário de table_info, inclui coluna gerada virtual code. Evitar SELECT * users/sessions em logs compartilhados. Consultar owner da escola não é alterar owner.

**Comando de escrita, apenas em futura atualização que realmente precise de migration:**

```powershell
npx --yes wrangler@4.142.0 d1 migrations apply sgb-db --remote --config wrangler-d1.jsonc
```

Revisar primeiro a lista de pendentes e seus efeitos. Sem --remote, operação é local; não confundir sucesso local com produção atualizada. Não executar migrations para alteração de link, menu, CSS ou documentação. Não aplicar nova estrutura só para conferir se ela existe.

**Perigosos e fora de uma atualização rotineira:** DROP TABLE, DELETE sem escopo, UPDATE owner/IDs em massa, apagar/recriar D1, zerar sequences, apagar histórico d1_migrations, importar dump inteiro sobre dados ativos ou executar SQL antiga repetida. Export D1 pode interromper disponibilidade temporariamente; não é necessário fazer repetidos backups para toda alteração visual/documental. Exportações existentes são privadas e ignoradas por Git; verificador local não autoriza restaurar dados em produção.

# 22. DEPLOY

Guia de referência para **mudança de aplicação**, não para esta entrega documental. Não houve deploy aqui.

1. Entrar na cópia Git correta; verificar remoto/branch e arquivos locais. Não descartar mudanças com reset/clean sem análise.
2. Atualizar main por fast-forward; instalar usando pnpm/lockfile.
3. Executar testes relevantes (seção 34), lint/checagem de tipos conforme alteração e build. Build deve concluir antes de deploy.
4. Se houver alteração de schema, revisar SQL pendente, compatibilidade com aplicativo em execução e contagens relevantes por escola. Consultar migrations list; aplicar **somente pendentes necessárias**. Para mudança visual/documental, pular aplicação.
5. Publicar dist recém-gerado no Worker original com configuração de produção.
6. Validar login, escola/owner, acervo, fluxo afetado e suporte/isolamento na versão publicada. Cache do navegador não substitui confirmar commit/branch de build.

```powershell
cd C:\Users\Marco\SGB-nova-versao
git status --short
git remote -v
git switch main
git pull --ff-only origin main
npx --yes pnpm@11.25.0 install --frozen-lockfile
npx --yes pnpm@11.25.0 build
npx --yes wrangler@4.142.0 deploy --config wrangler.production.jsonc
```

Rodar testes relevantes antes da publicação; se migration necessária, intercalar a revisão/listagem/aplicação da seção 21 **antes de publicar código que exige a coluna nova**. Estes comandos não incluem aplicação automática de migrations. Dependência Wrangler é 4.92.0, enquanto guia existente fixa 4.142.0 explicitamente; não tratar um npx sem versão como ambiente reproduzível.

Caso Cloudflare Workers Builds publique via GitHub, confirmar no dashboard repositório original, branch main, diretório raiz e comando build/deploy compatíveis. Ligação GitHub por si só não aplica D1. Não executar um segundo deploy manual sem necessidade se build integrado já publicou a versão desejada. Erro de submodule no clone ocorre antes do build e exige investigar configuração Git/submódulos do commit realmente usado, não mudar banco.

No Windows: os erros “not a git repository”, “No package.json” e “Could not read wrangler...” ao executar em C:\Users\Marco significam pasta errada. Não corrigir criando novo repo/config/db ali. Executar cd primeiro. Se npx pedir confirmação, responder à confirmação e somente depois executar o próximo comando; não colar um comando Python no prompt de instalação.

# 23. GIT / GITHUB

Repositório original: marcosnunes-14/SGB. Branch de referência atual **main**; SHA analisado no início deste documento. Branches remotas observadas em 02/10/2026:

| Branch | Papel pelo nome/histórico |
|---|---|
| main | Código consolidado atual |
| feat/multi-escola-segura | Rollout anterior multi-escola |
| feat/admin-gre | Administração/GRE |
| feat/dashboard-alunos | Identidade de alunos/Dashboard |
| fix/desempenho-sgb | Trabalho anterior de performance |
| fix/registration-order | Ordenação de registro |
| fix/registration-api-order | Ordenação na API |

Existência de branch não prova que deva ser implantada nem que ainda seja desenvolvimento ativo. Documentação antiga menciona branches feature; atualizações ordinárias devem conferir main atual. Não há processo obrigatório de revisão/CI universal comprovado no código; não inventar uma política de branches.

```powershell
cd C:\Users\Marco\SGB-nova-versao
git remote get-url origin
git status --short
git branch --show-current
git fetch origin
git switch main
git pull --ff-only origin main
```

Para esta documentação, o commit deve incluir somente CONTEXTO_SGB.md, mensagem `docs: adiciona documentação completa de contexto do SGB` e push ao repositório original. Exemplo para trabalho local futuro:

```powershell
git add CONTEXTO_SGB.md
git diff --cached --stat
git commit -m "docs: adiciona documentação completa de contexto do SGB"
git push origin main
```

Evitar git add . quando houver exportações/credenciais desconhecidas. Verificar staged diff antes do commit. Não versionar backups, salts/hashes/token/sessões, arquivos .env, logs autenticados ou URL assinada de exportação. .gitignore já protege várias dessas pastas, mas não substitui revisão.

A pasta Downloads\SGB-codigo-fonte-1.0.0 pode ser cópia antiga sem histórico Git. Atualizar ali não atualiza automaticamente a cópia clonada nem o build da Cloudflare. Confirmar origin e SHA na pasta usada para build/deploy.

# 24. DADOS IMPORTANTES QUE NÃO PODEM SER PERDIDOS

# ⚠️ DADOS CRÍTICOS — NÃO APAGAR

**Acervo real do perfil leila e de todas as escolas é patrimônio do usuário.** Preservar linhas books, UUIDs, owners, registration/zeros à esquerda, JSON bibliográfico, copies e localização. Preservar loans/histórico/student_id, fichas students e chaves normalizadas; institutions.id/code/GRE; usuários e suas credenciais derivadas; sessões/contextos; auditoria; book_labels/códigos imutáveis e eventos de impressão. Não regenerar códigos de etiquetas coladas.

**Contagens atuais remotas: NÃO CONSULTADAS nesta análise.** Não houve credencial Cloudflare/D1 autorizada disponível no ambiente. O schema e fixtures não dão a quantidade de produção.

Referência histórica enviada pelo proprietário em 27/09/2026: consulta após 0003 mostrou **1.614 livros, 3 empréstimos, 2 usuários e escola_leila=1**; posterior verificação de export antes da GRE mostrou **2 instituições, 1.614 livros, 3 empréstimos, 3 usuários e 4 sessões**, com 1.614 livros de leila. Esses números são evidência histórica, **não contagem de 02/10/2026**. Não copiar os números de fixture como se fossem confirmação adicional.

Se acervo “sumir” na UI, investigar owner da conta, instituição efetiva, suporte, migrations existentes, requisição records e versão implantada antes de qualquer escrita. Contagem global não prova vínculo da escola; consultar contagem por owner. Jamais reinicializar banco ou recadastrar 1.600 livros para corrigir problema de contexto.

# 25. REGRAS DE SEGURANÇA PARA FUTUROS GPTs

- Nunca apagar banco ou recriar D1 sem autorização explícita; atualizar o Worker original.
- Nunca apagar/reaplicar migrations antigas ou executar DROP TABLE por conveniência.
- Nunca substituir SGB por projeto novo, mudar arquitetura ou remover funcionalidades sem pedido explícito.
- Fazer alterações incrementais, restritas ao pedido, preservando compatibilidade de JSON/dados legados.
- Analisar schema, SQL/triggers e histórico aplicado antes de gerar/aplicar migration; alterações de UI não pedem migration.
- Explicar impacto antes de mudanças grandes no banco. Respeitar a preferência do proprietário de evitar backups repetitivos; não transformar toda edição em exportação/interrupção do D1.
- Sempre testar owner e suporte; não confiar em owner recebido do navegador, nem em botão oculto como autorização.
- Não colocar mock/fixtures em produção, nem inventar contagens/telas/integrações concluídas.
- Preservar IDs/códigos de aluno/exemplar e vínculos; não mesclar nomes aproximados.
- Não escrever credenciais, secrets, exportação privada ou tokens em documentação/GitHub/logs.
- Confirmar repositório/branch/pasta correta; não enviar dist antigo e não afirmar deploy só porque push funcionou.
- Para trabalho documental como este, não executar migração, refatoração ou deploy adicional.

# 26. BUGS CONHECIDOS

Achados **de leitura estática**, sem correção nesta tarefa. “Risco” não significa incidente confirmado em produção. Busca de TODO/FIXME/HACK/BUG no código de negócio não identificou lista formal de pendências; fontes objetivas abaixo são mais úteis do que supor roadmap.

| Achado | Evidência/impacto |
|---|---|
| Etiquetas repetidas no ☰ | ExtraMenu renderiza ação dentro dos dois submenus e também no nível principal |
| ESC não fecha ExtraMenu | Só há listener click externo; não há keydown. Comportamento anterior solicitado não está implementado |
| Foto de usuário ausente | Library/AdminConsole mostram iniciais; schema users sem foto |
| Licença vencida não bloqueia | auth consulta apenas institutions.status; license_end/status são informativos |
| Empréstimo sem validação de estoque/livro | records salva code/title/author livres; permite concorrentes para mesmo registro |
| Devolução sem data efetiva | action return só muda status; relatório temporal usa delivery, não devolução |
| Identidade aluno depende da série | Mesmo nome em série nova vira novo ID; homônimos mesma série coincidem |
| Relatório antigo usa texto | borrowersFor não agrupa por student_id; série diferencia grupos mas não aparece na página |
| Contagem admin de alunos difere | DISTINCT lower(trim(nome/série)) não usa students IDs nem mesma remoção de espaços/acentos |
| Campos técnicos na exportação residual | Mapa de traduções não inclui studentId; dados JSON podem conter nomes não traduzidos |
| Código institucional concorrente | SELECT MAX + INSERT pode colidir; UNIQUE impede duplicidade, mas usuário precisará tentar novamente |
| Auditoria não é integralmente atômica | records ignora erro de audit após sucesso; algumas ações admin salvam e depois audit, podendo erro após alteração |
| Logs do desenvolvedor sem nome | GET admin não inclui desenvolvedores em users; resolução de log pode mostrar — |
| Falta validação completa de calendário em APIs | records/admin validam formato e ordem; Dashboard usa Date.parse sem round-trip |
| Falta transação aluno+loan | Ficha pode ser criada e loan falhar; ficha vazia não significa perda de empréstimo anterior |
| Leituras de alunos têm efeitos de escrita | associateLegacyLoans é chamado em GETs; custo linear por legado e mutação interna |
| Payload/all rows | records/labels carregam escola inteira, apesar de UI paginada; ver seção 35 |
| JSON inválido | records/relatorio podem falhar ao JSON.parse; Dashboard ignora registros inválidos, alterando totais aparentes |
| Sessão não acompanha atividade | 8h fixas, sem idle logout; algumas telas não redirecionam imediatamente após 401 |
| Suporte compartilhado por sessão | Troca de escola em outra aba pode deixar dados antigos na memória até recarga |
| Cópias reduzidas ocultam lookup | Código retido de exemplar excedente não é resolvido pelo filtro ativo GET labels |
| Limite de impressão não antecipado em toda seleção | Selecionar todos pode exceder 5.000; validação final rejeita lote |
| Documentação antiga contradiz projeto | README ainda diz schema vazio e install:ci/npm ci, mas schema está completo e script usa instalador pnpm; TRANSFERENCIA é migração de conta, não atualização |
| Scaffold não ativo | chatgpt-auth/getDb/examples e muitos UI componentes não devem ser confundidos com fluxos SGB |

Nenhuma dessas entradas autoriza conserto fora de um pedido. Não afirmar que todos os fluxos estão quebrados: muitos são limitações explícitas do modelo atual. Falhas de produção como logo ausente, site antigo ou API lenta dependem de versão/config/rede e não foram reproduzidas nesta análise.

# 27. DÍVIDA TÉCNICA

**ALTA**

- Definir vínculo de empréstimo a exemplar/livro real e regra de disponibilidade preservando loans legados; é melhoria futura, não implementar tacitamente.
- Reduzir leituras integrais e backfill no caminho de GET; medir latência real por escola antes de prometer <1s.
- Ampliar testes de login/autorização/isolamento e suporte em browser; reforçar consistência de auditoria e dados correlacionados.
- Definir política real de licença/vencimento com proprietário antes de bloquear escolas automaticamente.

**MÉDIA**

- Unificar estatísticas por IDs entre admin/relatório/Dashboard; discutir série/homônimos antes de alterar identidade.
- Corrigir duplicação/menu teclado e validar mobile/notebook; foto depende de especificação de armazenamento/upload.
- Validar datas por calendário e reforçar integridade JSON/relacional sem impor constraints incompatíveis ao legado.
- Acompanhar retornos efetivos no futuro e migração de histórico com informação ausente claramente marcada.
- Paginação/consulta server-side para acervo/labels, contagens agregadas e eventuais índices de data após medição.

**BAIXA**

- Atualizar README/transferência e reduzir confusão de scripts/locks/scaffold conforme pedido futuro.
- Melhorar organização de arquivos longos/minificados e CSS com overrides, sem refatorar em lote por estética.
- Completar traduções/exportação de campos internos e UX de limite de etiquetas.

# 28. FUNCIONALIDADES IMPLEMENTADAS

Checklist significa **presença no código**, não teste completo em produção:

- [x] ✅ Login próprio, setup/developer-setup, hash PBKDF2, rate limit, cookie/sessões e logout.
- [x] ✅ Usuários lembrados localmente sem senha; bibliotecária/direção/desenvolvedor.
- [x] ✅ Contexto de escola/owner, administração e modo suporte por sessão.
- [x] ✅ Início com logo oficial, suporte clicável WhatsApp e versão 1.0.2.
- [x] ✅ Painel Geral, Dashboard, empréstimos e prateleiras preservados.
- [x] ✅ Cadastro/edição/clones de livros; registro único por escola, ordenação maior primeiro.
- [x] ✅ Exclusão em lote protegida por empréstimo ativo, histórico preservado.
- [x] ✅ 12 estantes/5 prateleiras, busca e paginação client-side.
- [x] ✅ Empréstimo/devolução e filtros Falta entregar/Entregues.
- [x] ✅ Cadastro automático de aluno, normalização exata, autocomplete, vínculo de loan e associação legada.
- [x] ✅ Dashboard por data/série/status, quatro cards, timeline, alunos/livros/séries.
- [x] ✅ Relatório por período em nova aba e alunos com histórico completo/CSV/impressão.
- [x] ✅ Exportações CSV acervo/loans e JSON parcial da escola com traduções.
- [x] ✅ Menu ☰ por clique persistente, submenus laterais e InfoDialog.
- [x] ✅ Console de quatro vistas, escolas por GRE 01–21, usuários e logs.
- [x] ✅ Cadastro/edição institucional, status e datas de licença; reset/inativação usuários.
- [x] ✅ Diagnóstico/estatísticas para desenvolvedor em suporte.
- [x] ✅ Identidades imutáveis por exemplar, Code 128, prévia, tamanhos térmicos e lote/reimpressão.
- [x] ✅ Registro manual idempotente de impressão e lookup de código no contexto.
- [x] ✅ Scripts/testes isolados e configurações para o Worker/D1 originais.

# 29. FUNCIONALIDADES PLANEJADAS

**🟡 Planejado / parcialmente implementado**, limitado a evidência do código/documentos e pedidos históricos presentes nesta continuidade:

- [ ] Leitor USB nos empréstimos/devoluções: documentação etiquetas diz “lookup preparado”; tela de circulação ainda não o usa.
- [ ] Confirmação física de thermal/USB: docs/etiquetas.md declara necessidade de validação no computador da biblioteca.
- [ ] Foto de perfil: pedido anterior, mas UI atual só tem iniciais; não há armazenamento.
- [ ] Fechar ☰ por ESC e eliminar duplicações: pedido/comportamento histórico, ausente no código atual.
- [ ] Tradução integral de exportações: dicionário existe, faltam campos internos como studentId.
- [ ] Licença operacional/planos/renovação: campos existem, UI edita datas; não há mecanismo de cobrança/vencimento automático confirmado.
- [ ] Métricas por exemplar/registro: etiqueta tem identidade, loans não tem vínculo ao exemplar.

Não marcar scanner por câmera, ISBN, novos menus inativos, PDF servidor, XLSX nativo ou integração ERP como roadmap aprovado apenas por serem ideias plausíveis. As opções antigas Histórico/Configurações/etc. foram retiradas do menu e não são telas implementadas. Issues do GitHub não foram auditadas nesta entrega; não se atribui a elas nenhuma decisão.

# 30. FLUXOS IMPORTANTES

| Fluxo | Passos principais |
|---|---|
| Login | GET auth → username/senha → POST login → senha/status → sessão/cookie → /sistema ou /admin |
| Criar livro | Library abre popup → campos/localização → POST kind book → normalizeBook/registro único/owner → INSERT + trigger etiquetas → audit → reload records |
| Editar livro | Prateleiras Editar → popup preenchido → POST action edit → owner/duplicidade/proteção registro ativo → UPDATE JSON → trigger se copies aumentar → audit/reload |
| Clonar | Escolher obra → quantidade 1–100 → registros novos → POST clone → checar escola/duplicidade → batch UUIDs + triggers → audit/reload |
| Excluir | Selecionar até 100 → confirmação → POST delete → bloquear lote com ativo → excluir books sem apagar loans/labels históricos → audit/reload |
| Criar empréstimo | Novo empréstimo → digitar nome/série ou sugestão → informar livro/datas/status → POST loan → resolveStudent escola/identidade → INSERT loan com student_id → audit/reload |
| Devolver | Aba Falta entregar → Devolver → POST return id → loan da escola → status Devolvido → audit/reload; sem data efetiva |
| Gerar período | ☰ Relatórios → período → inicio/fim → nova aba /relatorio → sessão/owner → SELECT delivery → agrupamento textual |
| Relatório alunos | ☰ Gerar relatório de alunos → nova aba → associação legados → students+loans escola → histórico → CSV ou print |
| Criar escola | Admin Escolas → Cadastrar → dados exigidos/GRE/licença → POST create-school → UUID/código → audit → cadastrar primeiro usuário |
| Criar usuário | Escola selecionada → Novo usuário → nome/login/senha/perfil → POST create-user → hash+salt/owner → audit |
| Suporte | Admin escola → enter-support → atualizar sessão → /sistema banner → owner alvo em APIs |
| Trocar contexto | Sair suporte → limpar sessão → /admin → escolher outra escola → enter-support → recarregar; não mudar owner de livros/usuário |
| Etiqueta | ☰ ou detalhe livro → carregar exemplares escola → pesquisar/selecionar/tamanho → preview → nova aba/print → saída física → confirmar job/IDs → evento/contadores |
| Reimpressão | Mesmo label_id/code → novo trabalho → imprimir → confirmar somente se saiu; identidade permanece |

# 31. MAPA DOS ARQUIVOS IMPORTANTES

| Função | Arquivo(s) |
|---|---|
| Login/seleção local | `app/page.tsx` |
| Credenciais/sessões | `app/auth.ts`, `app/api/auth/route.ts` |
| Entrada biblioteca | `app/sistema/page.tsx` |
| Navegação e formulários | `app/library.tsx` |
| Menu extra/exportações | `app/extra-menu.tsx` |
| Dúvidas/créditos | `app/info-dialog.tsx` |
| Versão visual | `app/version.ts` |
| Layout/estilo geral | `app/layout.tsx`, `app/globals.css` |
| CRUD acervo/loans | `app/api/records/route.ts` |
| Validação/clonagem/exclusão | `app/book-rules.ts` |
| Ordenação registros | `app/registration-order.ts` |
| Identidade alunos | `app/student-identity.ts` |
| Resolver/backfill alunos | `app/students-data.ts` |
| Autocomplete | `app/api/students/route.ts`, `app/library.tsx` |
| Dashboard UI/estilo | `app/dashboard-panel.tsx`, `app/dashboard.css` |
| Dashboard agregação/API | `app/dashboard-data.ts`, `app/api/dashboard/route.ts` |
| Formulário relatório período | `app/loan-panels.tsx` |
| Normalização relatório antigo | `app/loan-report.ts` |
| Página relatório período | `app/relatorio/page.tsx`, `app/relatorio/report.css` |
| Página alunos/print | `app/relatorio/alunos/page.tsx`, `app/relatorio/alunos/print-button.tsx` |
| Dados relatório alunos | `app/student-report-data.ts` |
| Formatação CSV alunos | `app/student-report-format.ts` |
| Download CSV | `app/api/student-report/route.ts` |
| Admin entrada | `app/admin/page.tsx` |
| Console/GRE/formulários | `app/admin/admin-console.tsx`, `app/admin/admin.css` |
| Admin API/suporte/audit | `app/api/admin/route.ts` |
| Diagnóstico/estatísticas | `app/developer-panel.tsx`, `app/api/diagnostics/route.ts` |
| Etiquetas lista/preview | `app/labels-panel.tsx`, `app/labels.css` |
| Tamanhos/regras | `app/label-rules.ts` |
| Barras/etiqueta SVG | `app/label-barcode.tsx`, `app/book-label.tsx` |
| Abrir impressão/seleção | `app/label-print.ts` |
| Print página e CSS | `app/etiquetas/imprimir/page.tsx`, `print-page.tsx`, `print.css` no mesmo diretório |
| Labels API/confirmar | `app/api/labels/route.ts` |
| D1 raw/ORM/schema | `db/raw.ts`, `db/index.ts`, `db/schema.ts` |
| SQL/journal/snapshots | `drizzle/000*.sql`, `drizzle/meta/` |
| Geração migration | `drizzle.config.ts` |
| Deploy Worker/D1 | `wrangler.production.jsonc`, `wrangler-d1.jsonc` |
| Build | `vite.config.ts`, `scripts/run-framework.mjs`, `scripts/build-verified.sh` |
| Perfil/ambiente local | `scripts/execution-profile.mjs`, `scripts/sites-env.mjs`, `scripts/sites-env.sh` |
| Instalação | `scripts/install-pnpm.sh`, `scripts/pnpm-install.mjs`; scripts install-ci herdados |
| Dependências | `package.json`, `pnpm-lock.yaml`, `package-lock.json`, `pnpm-workspace.yaml` |
| Tipos/config frontend | `cloudflare-env.d.ts`, `tsconfig.json`, `next.config.ts` |
| UI compartilhada | `components/ui/button.tsx`, `input.tsx`, `tabs.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `checkbox.tsx`, `select.tsx` |
| Logos/favicon | `public/sgb-logo.png`, `sgb-info-logo.webp`, `admin-logo.png`, `favicon.svg` |
| Teste período | `app/loan-report.test.mjs` |
| Testes gerais | `tests/` (mapa seção 34) |
| Verificação de cópias SQL | `scripts/verify-multi-school.py`, `verify-admin-gre.py`, `verify-student-migration.py` |
| Documentação herdada | `README.md`, `TRANSFERENCIA.md`, `docs/etiquetas.md`, `docs/multi-school-rollout.md` |
| Infra não ativa no negócio | `app/chatgpt-auth.ts`, `examples/d1/`, `build/sites-vite-plugin.ts` |

# 32. APIS / ROTAS

Todas as rotas de negócio estão em app/api/*/route.ts. Resposta JSON de falha geralmente `{error: mensagem}`. GetUser normalmente produz 401 sem sessão e 403 sem permissão/escola. POSTs com mutação verificam Origin igual à origem da URL. Não adicionar owner enviado pelo cliente como autoridade.

| Método/rota | Autenticação | Parâmetros | Resposta/arquivo |
|---|---|---|---|
| GET /api/auth | Pública | Nenhum | `{setup,developerSetup}`; 503 banco; auth/route.ts |
| POST /api/auth | Login/setup públicos sob regras; logout pelo cookie | action login/setup/developer-setup/logout; username,password; code para ativação | `{ok,role}` ou `{ok}`; cookie; 400/401/403/409/429/503; auth/route.ts |
| GET /api/records | Sessão+escola, três roles | Nenhum | `{books:[JSON+id],loans:[JSON+id+studentId]}`; no-store/Server-Timing; records/route.ts |
| POST /api/records | bibliotecario ou desenvolvedor em contexto | kind book/loan,data; action edit com id; delete com ids; clone com id/registrations; return com id | `{ok:true}`, delete/clone também count; 400/403/409; records/route.ts |
| GET /api/students | Sessão+escola | q nome/prefixo | `{students:[{id,code,name,grade,loansCount,lastLoan}]}`, até8; 503; students/route.ts |
| GET /api/dashboard | Sessão+escola | start,end obrigatórios; today opcional; status todos/ativos/devolvidos/atrasados; grade normalizada | metrics,timeline,topStudents,topBooks,grades,availableGrades; 400/503; dashboard/route.ts |
| GET /api/student-report | Sessão+escola | Nenhum | CSV BOM/semicolon attachment sgb-relatorio-alunos.csv, private no-store; student-report/route.ts |
| GET /api/labels | Sessão+escola | code opcional para lookup exato | `{school,books:[LabelBook]}`; exemplares ativos; labels/route.ts |
| POST /api/labels | bibliotecario ou desenvolvedor em contexto | action confirm-print,ids (1–5000),jobId UUID | `{ok:true}`; 400/403/409/503; labels/route.ts |
| GET /api/admin | desenvolvedor | Nenhum | schools,users,logs,version,checkedAt,supportMode; 503; admin/route.ts |
| POST /api/admin | desenvolvedor | action e payload específico abaixo | `{ok:true}` ou `{ok:true,id}`; 400/403/404/409; admin/route.ts |
| GET /api/diagnostics | desenvolvedor em suporte | Nenhum | status,checkedAt,databaseMs,serverMs,version,books,loans,users,sessions; diagnostics/route.ts |

Ações admin:

- create-school: name,library_name,gre,city,state,contact_name,contact_phone,contact_email,status,license_start,license_end.
- update-school: mesmos campos + id.
- create-user: institutionId,display_name,username,password,role,email,phone.
- update-user: id,display_name,role,active,email,phone; não edita login.
- reset-password: id,password; revoga sessões.
- enter-support: institutionId; atualiza sessão identificada pelo cookie.
- exit-support: sem instituição enviada; limpa suporte da sessão atual.

Rotas HTML ativas: `/`, `/sistema`, `/admin`, `/relatorio`, `/relatorio/alunos`, `/etiquetas/imprimir`. Nenhuma rota ativa /api/books, /api/loans, /api/backup, /api/settings ou /api/notes no diretório app. O exemplo `examples/d1/app/api/notes/route.ts` contém GET/POST ilustrativos, não montados no App Router real.

# 33. VARIÁVEIS DE AMBIENTE

**Somente nomes, sem valores.** Não existe lista de secrets reais nesta documentação.

Aplicação/Cloudflare:

- `DB` (binding D1 obrigatório ao negócio)
- `SGB_SETUP_CODE`
- `SGB_DEVELOPER_CODE`
- `BUCKET` (binding R2 opcional de template, não usado no SGB/produção atual)

Ferramentas/build/local, nomes encontrados nos scripts/configuração (não são credenciais e não são todos obrigatórios ao deploy):

- `CODEX_SANDBOX`
- `CLOUDFLARE_CF_FETCH_ENABLED`
- `WRANGLER_SEND_METRICS`
- `WRANGLER_WRITE_LOGS`
- `WRANGLER_LOG_PATH`
- `WRANGLER_REGISTRY_PATH`
- `MINIFLARE_REGISTRY_PATH`
- `SITES_RUNTIME_ROOT`
- `SITES_PROJECT_ROOT`
- `SITES_ENV_READY`
- `SITES_INSTALL_REPORT_PATH`
- `SITES_INSTALL_TIMEOUT`
- `SITES_INSTALL_KILL_AFTER`
- `SITES_BUILD_TIMEOUT`
- `SITES_BUILD_KILL_AFTER`
- `SITES_NPM_CACHE_SEED`
- `SITES_PNPM_BIN`
- `SITES_PNPM_CACHE_SEED`
- `SITES_PNPM_SHARED_STORE`
- `SITES_PNPM_BOOTSTRAP_TIMEOUT`
- `SITES_PNPM_STORE_LOCK_TIMEOUT`
- `SITES_PNPM_STORE_PREPARE_TIMEOUT`
- `SHARP_IGNORE_GLOBAL_LIBVIPS`

Variáveis usuais de Node/pacote/OS podem aparecer nos instaladores, como NODE_ENV, CI, npm_config_cache, HOME e XDG_*; não repurpose HOME para variáveis de tarefa. Configuração GitHub/Cloudflare Builds da conta não foi lida. Não inventar JWT_SECRET/DATABASE_URL como exigências deste aplicativo.

# 34. TESTES

Não há script `test` no package.json; comandos diretos abaixo. Testes usam Node assert/node:test, TypeScript transpileModule, SQLite em memória (Python e node:sqlite), simulação D1, hooks React simulados/renderToStaticMarkup e ReportLab para validação independente de Code 128.

| Arquivo | Cobertura observada | Como rodar na raiz |
|---|---|---|
| app/loan-report.test.mjs | Período inclusivo/invalidade, normalização/grupos/série e ordenação | `node --experimental-strip-types --test app/loan-report.test.mjs` |
| tests/book-management.cjs | NormalizeBook, roles clone, SQL de edição/exclusão/owner e preservação | `node tests/book-management.cjs` (subprocesso chama `python`) |
| tests/multi-school.py | Migration 0003 em SQLite legado, owner/preservação/isolamento SQL | `python tests/multi-school.py` |
| tests/student-migration.py | 0005 aditiva e preservação de dados anteriores | `python tests/student-migration.py` |
| tests/student-dashboard.mjs | Normalização, IDs/ranking, métricas/datas/série/status/timeline e SQL aditivo | `node tests/student-dashboard.mjs` |
| tests/student-report.mjs | CSV português/fórmulas/totais, todos alunos, SQL real por escola e vínculo indevido | `node tests/student-report.mjs` |
| tests/labels.mjs | 0006 preservação, copies/triggers/imutabilidade, roles/origin, lookup/confirmação/lote e fixture Code128 | `node tests/labels.mjs` |
| tests/labels-ui.mjs | Menu clique/submenu/clique fora/seleção, SVG/tamanhos/30 etiquetas, nova aba/pop-up/CSS | `node tests/labels-ui.mjs` |
| tests/label-barcode.py | Decodificação independente Code128/checksum | `python tests/label-barcode.py` **depois de labels.mjs**, no mesmo sistema/tempdir; requer ReportLab |

No Windows, `py` pode substituir python para execução direta. Atenção: book-management.cjs invoca literalmente python; precisa existir no PATH. Testes Python antigos usam read_text sem encoding explícito em partes; Windows com cp1252 pode precisar execução UTF-8 (`py -X utf8 ...`). Scripts verify-* recentes leem UTF-8 explicitamente. Node mínimo declarado pode não garantir todas as flags de stripping idênticas; usar Node compatível com node:sqlite e verificar opção antes de assumir falha de negócio.

Scripts verify-multi-school.py / verify-admin-gre.py / verify-student-migration.py recebem **SQL privado já exportado** e simulam/verificam em memória; não são migrations remotas e não devem receber fixture como se fosse produção. Não é preciso exportar nada novamente para mudar documentação. Dados de teste como 1.614 livros são artificiais.

Checks de projeto: `npx --yes pnpm@11.25.0 exec tsc --noEmit`, `npx --yes pnpm@11.25.0 lint`, `npx --yes pnpm@11.25.0 build`. Lint pode apontar legado/scaffold; relatar origem e não refatorar tudo por conta disso.

**Lacunas:** sem suíte browser E2E real registrada para login/sessões/admin/GRE/dates/support, notebook/mobile/reload, navegação acessível, hardware térmico/leitor ou desempenho remoto. labels-ui usa hooks simulados, não Playwright nem navegador físico. Teste de CSV afirma “menu sem duplicações” por presença/ausência de strings, mas não detecta a repetição atual de Etiquetas; mensagem de teste não substitui ler assert real.

**Nesta entrega documental:** validação do Markdown/schema/inventário e diff restrito ao documento; não se executaram migrations, testes que simulam migrations ou build de aplicação, pois nenhum código executável mudou. Resultados históricos não são apresentados como teste novo.

# 35. PERFORMANCE

- records autentica e carrega **todos books e loans da escola** em consultas paralelas; parseia JSON, ordena e serializa. Library chama mesmo na Início. Paginação 50 limita DOM, não consulta/payload. Erro JSON em uma linha pode derrubar carregamento completo.
- Índice UNIQUE books(owner,registration) ajuda escopo/duplicidade; loans_owner e loans_owner_student ajudam filtro/aluno; students_owner_name ajuda prefixo; labels_owner/code ajudam escopo/lookup. Não há índice de delivery extraído de JSON nem paginação SQL por data.
- Dashboard seleciona loans por JSON delivery e todos students, faz filtros/agregação em JS. Série/status não reduzem todos os dados no SQL. associateLegacyLoans pode fazer dois comandos por legado em batches sequenciais, pesado na primeira leitura.
- Autocomplete chama associação legada antes mesmo de verificar query curta; prefixo é indexável, mas contagem/MAX por aluno usam subconsultas. Debounce/abort evitam parte das requisições redundantes.
- loadStudentReport carrega histórico completo e todas fichas em memória, depois HTML/CSV cresce com total de loans.
- GET admin traz todas escolas/usuários e várias subconsultas correlacionadas por escola; logs têm limite 100. Sem paginação de usuários/escolas. Índice de auditoria começa por institution_id, enquanto última listagem é global por created_at.
- labels traz todas identidades ativas da escola; filtro/busca/páginas são locais. Backfill0006 e impressão crescem por copies; máximo 100.000 copies por obra é potencial volume relevante. Seleção/preview grande gera muitos SVGs.
- labels lookup code usa índice unique, embora ainda JOIN por livro e filtro copies. Confirmações em chunks de 80, até 5.000 selecionados; reenvio idempotente evita duplicar eventos.
- sessions busca por token_hash PK; expires é CAST TEXT. Limpeza no login percorre expiradas sem índice temporal explícito. Auth PBKDF2 é custo proposital só no fluxo de senha; getUser consulta D1 por requisição.
- Diagnóstico mede SELECT1, processamento e round-trip navegador; atualiza a cada 30 s, timeout 15 s, guarda 10 amostras locais. Isso não representa p95 histórico nem disponibilidade externa.
- APIs relevantes usam no-store e páginas dinâmicas; não há cache servidor de estatísticas/acervo, SW/offline ou invalidation distribuída. Assets estáticos são servidos por Workers assets.
- records inclui Server-Timing auth/db/json; usar evidência de rede/medição para separar D1, serialização, render e latência. As branches antigas de performance não garantem todas telas abaixo de 1 s. Nenhum SLA <1s foi verificado aqui.

Melhorias exigem medição e preservação de funcionalidade. Não “otimizar” removendo isolamento, sessão ou dados históricos e não mudar índices/schema sem necessidade comprovada.

# 36. ESTADO ATUAL DO PROJETO

# ESTADO ATUAL DO SGB

Em 02/10/2026, main no commit analisado contém SGB versão visual 1.0.2, React/Vinext em Cloudflare Worker sgb e D1 sgb-db. Login usa cookie/sessões próprios e três roles. Piloto previsto é CETI Demerval Lobão/owner de leila; contexto de cada escola é aplicado no servidor, inclusive desenvolvedor em suporte.

O frontend preserva Início, Painel Geral, Dashboard, Empréstimos e Prateleiras. Relatórios/exportações/etiquetas ficam no ☰. Acervo tem registro único por escola, ordenação numérica descendente, cadastro/edição/clones/exclusão protegida e localização fixa 12×5. Empréstimos criam alunos automaticamente por nome+série normalizados, guardam ID e mantêm legado; retorno muda status. Dashboard agrega dados reais por período e ID de aluno, mas livros são agrupados por título/autor. Relatórios por período e de alunos abrem novas abas; exportações usam CSV/JSON e print do browser.

Admin tem Visão Geral/Escolas/Usuários/Logs, GRE 01–21, cadastro enxuto/status/datas de licença e suporte por sessão. Licença por vencimento, foto, circulação por exemplar e hardware real continuam pendentes/parciais. Menu tem duplicação de etiquetas e sem ESC. Não existem estoque automatizado, ISBN/câmera, cadastro manual de aluno ou módulos extras completos fora dos enumerados.

Schema esperado tem 10 tabelas/80 colunas, sete migrations 0000–0006 e triggers de etiquetas. 0006 cria códigos globais imutáveis Code128 por exemplar declarado, impressão térmica 50×30/50×25/40×30 mm via Windows/browser e contadores após confirmação manual. Não alterar owners/IDs/registrations/códigos já colados. Git não contém dados reais da biblioteca.

Arquivos centrais: Library; auth/records/admin APIs; db/schema e drizzle; students-data/student-identity; dashboard-data/panel; student-report-data/format; labels-panel/rules/barcode/print e API. Deploy de código: pasta Git correta/main, lockfile, testes pertinentes, build e wrangler.production; migrations só se necessárias/listadas. Para entender banco use consultas somente leitura e compare escola, não apenas total global.

**Não houve confirmação de commit publicado no Worker nem inspeção autenticada do D1 nesta análise.** Contagens históricas de 1.614 livros não são certificação atual. Implementações foram identificadas por leitura do código/testes; comportamento físico/produção precisa de validação no ambiente próprio. Esta entrega acrescenta somente CONTEXTO_SGB.md no GitHub; não altera aplicação/banco nem executa deploy.

# 37. INSTRUÇÃO PARA O PRÓXIMO GPT

## LEIA ISTO ANTES DE ALTERAR O SGB

Antes de modificar qualquer coisa:

1. Leia este documento inteiro.
2. Analise os arquivos relacionados à funcionalidade solicitada e confirme o commit atual.
3. Verifique as migrations existentes e diferencie histórico no Git do histórico aplicado no D1.
4. Preserve todos os dados atuais, inclusive IDs, owners e códigos de etiquetas.
5. Faça a menor alteração necessária.
6. Não recrie funcionalidades que já existem.
7. Não recrie o projeto.
8. Não substitua a arquitetura existente sem autorização.
9. Não aplique migration sem verificar se é realmente necessária.
10. Após alterar, teste o funcionamento afetado e isolamento das escolas.
11. Explique exatamente o que foi alterado, testado e publicado; diferencie commit de deploy.
12. Informe qualquer risco encontrado e não declare dados, testes ou produção confirmados sem evidência.
