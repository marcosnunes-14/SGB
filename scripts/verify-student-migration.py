"""Simula a migração 0005 em memória a partir de um backup D1 remoto.

Uso: py scripts/verify-student-migration.py backups/sgb-before-students.sql
Não inclua o backup no Git nem compartilhe seu conteúdo.
"""
import sqlite3
import sys
from pathlib import Path


if len(sys.argv) != 2:
    raise SystemExit('Informe o caminho do backup SQL.')

db = sqlite3.connect(':memory:')
db.executescript(Path(sys.argv[1]).read_text(encoding='utf-8'))
tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
if not {'books', 'loans', 'users', 'sessions', 'institutions'}.issubset(tables):
    raise SystemExit('Backup incompleto: faltam tabelas essenciais.')

leila = db.execute("SELECT owner,hash FROM users WHERE username='leila'").fetchone()
if not leila:
    raise SystemExit('Usuária leila não encontrada; migração interrompida.')

before = {table: db.execute(f'SELECT * FROM {table} ORDER BY rowid').fetchall()
          for table in ('books', 'loans', 'users', 'sessions', 'institutions')}
leila_books = db.execute('SELECT COUNT(*) FROM books WHERE owner=?', (leila[0],)).fetchone()[0]
columns = {row[1] for row in db.execute('PRAGMA table_info(loans)')}
if 'student_id' in columns:
    raise SystemExit('A coluna student_id já existe no backup; confira o histórico antes de continuar.')
db.executescript(Path('drizzle/0005_remarkable_masked_marvel.sql').read_text(encoding='utf-8'))
for table in before:
    if table == 'loans':
        after = db.execute('SELECT id,owner,data FROM loans ORDER BY rowid').fetchall()
    else:
        after = db.execute(f'SELECT * FROM {table} ORDER BY rowid').fetchall()
    assert after == before[table], f'A tabela {table} mudou na simulação.'
assert db.execute('SELECT COUNT(*) FROM books WHERE owner=?', (leila[0],)).fetchone()[0] == leila_books
assert db.execute('SELECT owner,hash FROM users WHERE username=?', ('leila',)).fetchone() == leila
print('Backup íntegro; migração 0005 simulada sem alterar livros, empréstimos, usuários ou sessões.')
print('Livros da leila:', leila_books)
print('Registros preservados:', {table: len(rows) for table, rows in before.items()})
