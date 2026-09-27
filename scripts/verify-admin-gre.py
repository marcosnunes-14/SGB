"""Confere um backup D1 já migrado para múltiplas escolas e simula a GRE.

Uso: py scripts/verify-admin-gre.py backups/sgb-before-gre.sql
O SQL exportado contém dados privados; mantenha-o na pasta backups ignorada pelo Git.
"""
import sqlite3
import sys
from pathlib import Path


if len(sys.argv) != 2:
    raise SystemExit('Informe o caminho do backup SQL exportado do D1.')

source = Path(sys.argv[1])
db = sqlite3.connect(':memory:')
db.executescript(source.read_text(encoding='utf-8'))
tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
required = {'institutions', 'books', 'loans', 'users', 'sessions'}
if not required.issubset(tables):
    raise SystemExit(f'Backup incompleto: faltam {required - tables}')

leila = db.execute("SELECT id,owner,hash FROM users WHERE username='leila'").fetchone()
if not leila or not db.execute('SELECT id FROM institutions WHERE id=?', (leila[1],)).fetchone():
    raise SystemExit('Escola ou usuária leila ausente no backup.')

counts = {table: db.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
          for table in ('institutions', 'books', 'loans', 'users', 'sessions')}
leila_books = db.execute('SELECT COUNT(*) FROM books WHERE owner=?', (leila[1],)).fetchone()[0]
columns = {row[1] for row in db.execute('PRAGMA table_info(institutions)')}
if 'gre' in columns:
    print('A coluna GRE já existe no backup; nenhuma migração pendente foi simulada.')
else:
    db.executescript(Path('drizzle/0004_magical_redwing.sql').read_text(encoding='utf-8'))
    assert db.execute('SELECT gre FROM institutions WHERE id=?', (leila[1],)).fetchone() == (None,)

after = {table: db.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
         for table in counts}
assert counts == after, (counts, after)
assert db.execute('SELECT COUNT(*) FROM books WHERE owner=?', (leila[1],)).fetchone()[0] == leila_books
assert db.execute("SELECT id,owner,hash FROM users WHERE username='leila'").fetchone() == leila
print('Backup íntegro; migração GRE simulada sem alterar livros, empréstimos, usuários ou sessões.')
print(f'Livros da leila: {leila_books}. Contagens antes/depois: {counts}')
