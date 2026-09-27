"""Confere backup D1 legado antes de aplicar a migração em produção.

Uso: python3 scripts/verify-multi-school.py backups/sgb-antes.sql
O arquivo SQL contém credenciais e sessões: mantenha-o fora do Git.
"""
import sqlite3
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit('Informe o caminho do backup SQL exportado do D1.')
source = Path(sys.argv[1]); db = sqlite3.connect(':memory:')
db.executescript(source.read_text(encoding='utf-8'))
tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
needed = {'books','loans','users','sessions'}
if not needed.issubset(tables):
    raise SystemExit(f'Backup incompleto: faltam {needed-tables}')

leila = db.execute("SELECT id,owner,role,hash FROM users WHERE username='leila'").fetchone()
if not leila or leila[2] != 'bibliotecario':
    raise SystemExit('Usuária leila não encontrada como bibliotecária. Migração interrompida.')
owner = leila[1]
for table in ('books','loans'):
    foreign = db.execute(f'SELECT COUNT(*) FROM {table} WHERE owner!=?',(owner,)).fetchone()[0]
    if foreign:
        raise SystemExit(f'{table}: {foreign} registros pertencem a outro owner. Migração interrompida.')
other_users = db.execute("SELECT COUNT(*) FROM users WHERE owner!=?",(owner,)).fetchone()[0]
if other_users:
    raise SystemExit(f'{other_users} usuários possuem outro owner. Migração interrompida.')

counts = {name:db.execute(f'SELECT COUNT(*) FROM {name}').fetchone()[0] for name in ('books','loans','users','sessions')}
saved = {name:db.execute(f'SELECT * FROM {name} ORDER BY rowid').fetchall() for name in ('books','loans')}
db.executescript(Path('drizzle/0003_multi_school.sql').read_text(encoding='utf-8'))
after = {name:db.execute(f'SELECT COUNT(*) FROM {name}').fetchone()[0] for name in counts}
assert after==counts, (counts,after)
assert all(db.execute(f'SELECT * FROM {name} ORDER BY rowid').fetchall()==saved[name] for name in saved)
assert db.execute("SELECT id FROM institutions WHERE name='CETI Demerval Lobão'").fetchone()==(owner,)
assert db.execute("SELECT hash FROM users WHERE username='leila'").fetchone()==(leila[3],)
print('Backup íntegro; escola leila confirmada; migração simulada sem alterar livros, empréstimos, usuários ou sessões.')
print('Contagens antes/depois:', counts)
