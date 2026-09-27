-- O identificador owner já separa livros, empréstimos e usuários.
-- A escola inicial usa exatamente esse identificador: nenhum registro existente é reescrito.
CREATE TABLE institutions (
  id text PRIMARY KEY NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  library_name text NOT NULL DEFAULT '',
  cnpj text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  cep text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  address_number text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  contact_role text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  activated_at text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ativa',
  notes text NOT NULL DEFAULT '',
  license_plan text NOT NULL DEFAULT 'Educacional',
  license_status text NOT NULL DEFAULT 'Ativa',
  license_start text NOT NULL DEFAULT '',
  license_end text NOT NULL DEFAULT '',
  license_notes text NOT NULL DEFAULT '',
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX institutions_code_unique ON institutions(code);
--> statement-breakpoint
INSERT INTO institutions (id,code,name,library_name,city,state,activated_at)
SELECT owner,'SGB-0001','CETI Demerval Lobão','', '', '', date('now')
FROM users WHERE username='leila' AND role='bibliotecario' LIMIT 1;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN active integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN email text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE users ADD COLUMN phone text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE users ADD COLUMN last_login_at text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE users ADD COLUMN display_name text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE sessions ADD COLUMN support_institution text;
--> statement-breakpoint
CREATE TABLE audit_logs (
  id text PRIMARY KEY NOT NULL,
  institution_id text NOT NULL,
  user_id text NOT NULL,
  action text NOT NULL,
  details text NOT NULL DEFAULT '',
  created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX audit_logs_institution_created ON audit_logs(institution_id,created_at);
--> statement-breakpoint
CREATE INDEX loans_owner ON loans(owner);
--> statement-breakpoint
CREATE INDEX users_owner ON users(owner);
