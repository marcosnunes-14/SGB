"""Exercita a migração sobre uma cópia em memória do formato legado."""
import json
import re
import sqlite3
from pathlib import Path

db = sqlite3.connect(':memory:')
for migration in sorted(Path('drizzle').glob('000[0-2]*.sql')):
    db.executescript(migration.read_text())

owner = 'owner-real-da-escola'
db.execute('INSERT INTO users(id,username,owner,salt,hash,role) VALUES(?,?,?,?,?,?)',
           ('administrator', 'leila', owner, 'sal-original', 'hash-original', 'bibliotecario'))
db.execute('INSERT INTO users(id,username,owner,salt,hash,role) VALUES(?,?,?,?,?,?)',
           ('developer', 'marcos', owner, 'sal-dev', 'hash-dev', 'desenvolvedor'))
books = [(f'livro-{i}', owner, f'{i:05}', json.dumps({'title': f'Livro {i}', 'rack': '1', 'shelf': '1'})) for i in range(1600)]
db.executemany('INSERT INTO books(id,owner,registration,data) VALUES(?,?,?,?)', books)
db.execute('INSERT INTO loans(id,owner,data) VALUES(?,?,?)', ('emp-1', owner, json.dumps({'student':'Ana','code':'00001','status':'Emprestado'})))
db.execute('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)', ('hash-sessao','administrator','9999999999999'))
before = {name: db.execute(f'SELECT * FROM {name} ORDER BY rowid').fetchall() for name in ('books','loans')}
credentials = db.execute("SELECT salt,hash,owner FROM users WHERE username='leila'").fetchone()
db.executescript(Path('drizzle/0003_multi_school.sql').read_text())
assert {name: db.execute(f'SELECT * FROM {name} ORDER BY rowid').fetchall() for name in ('books','loans')} == before
assert len(db.execute('SELECT id FROM books').fetchall()) == 1600
assert db.execute("SELECT salt,hash,owner FROM users WHERE username='leila'").fetchone() == credentials
assert db.execute('SELECT id,name,code FROM institutions').fetchone() == (owner,'CETI Demerval Lobão','SGB-0001')
assert db.execute('SELECT user_id,token_hash FROM sessions').fetchone() == ('administrator','hash-sessao')

# Escola nova no mesmo banco, com a chave owner impedindo a leitura cruzada.
db.execute("INSERT INTO institutions(id,code,name) VALUES ('escola-2','SGB-0002','Segunda escola')")
db.execute("INSERT INTO users(id,username,owner,salt,hash,role) VALUES ('user-2','biblioteca2','escola-2','s','h','bibliotecario')")
db.execute("INSERT INTO books(id,owner,registration,data) VALUES ('novo','escola-2','00001','{}')")
assert db.execute('SELECT COUNT(*) FROM books WHERE owner=?', (owner,)).fetchone()[0] == 1600
assert db.execute('SELECT COUNT(*) FROM books WHERE owner=?', ('escola-2',)).fetchone()[0] == 1
assert db.execute("SELECT id FROM books WHERE id='novo' AND owner=?", (owner,)).fetchone() is None
assert db.execute("SELECT id FROM books WHERE id='livro-0' AND owner='escola-2'").fetchone() is None
assert db.execute("SELECT id FROM loans WHERE owner='escola-2'").fetchone() is None
assert db.execute("SELECT id FROM users WHERE username='leila' AND owner=?", (owner,)).fetchone()
# A consulta usada pelo painel deve contabilizar cada escola sem misturar acervos.
source = Path('app/api/admin/route.ts').read_text()
query = re.search(r'db\.prepare\(`(SELECT i\.\*.*?FROM institutions i ORDER BY i\.created_at, i\.code)`\)\.all\(\)', source, re.S)
assert query, 'Consulta administrativa não encontrada'
db.row_factory = sqlite3.Row
dashboard = {row['id']:row for row in db.execute(query.group(1))}
assert dashboard[owner]['books_count'] == 1600
assert dashboard['escola-2']['books_count'] == 1
assert dashboard[owner]['users_count'] == 1
assert dashboard['escola-2']['users_count'] == 1
print('PASS: 1600 livros, empréstimo, sessão e credenciais preservados; escolas isoladas.')
