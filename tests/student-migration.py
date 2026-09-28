"""Testa a migração aditiva em uma cópia SQLite com livros e empréstimos legados."""
import sqlite3
from pathlib import Path

db = sqlite3.connect(':memory:')
for path in sorted(Path('drizzle').glob('000[0-2]*.sql')):
    db.executescript(path.read_text())
db.execute("INSERT INTO users(id,username,owner,salt,hash,role) VALUES('l','leila','escola-a','s','h','bibliotecario')")
db.executemany('INSERT INTO books(id,owner,registration,data) VALUES(?,?,?,?)',
               [(f'b{i}', 'escola-a', str(i), '{}') for i in range(1614)])
db.execute("INSERT INTO loans(id,owner,data) VALUES('emprestimo-antigo','escola-a','{\"student\":\"Marcos\",\"grade\":\"2º A DS\"}')")
db.executescript(Path('drizzle/0003_multi_school.sql').read_text())
db.executescript(Path('drizzle/0004_magical_redwing.sql').read_text())
before = {name: db.execute(f'SELECT * FROM {name} ORDER BY rowid').fetchall()
          for name in ('books', 'users', 'sessions')}
loan = db.execute('SELECT id,owner,data FROM loans').fetchone()
db.executescript(Path('drizzle/0005_remarkable_masked_marvel.sql').read_text())
assert all(db.execute(f'SELECT * FROM {name} ORDER BY rowid').fetchall() == rows
           for name, rows in before.items())
assert db.execute('SELECT id,owner,data FROM loans').fetchone() == loan
assert db.execute('SELECT student_id FROM loans').fetchone() == (None,)
db.execute("INSERT INTO students(owner,name,grade,name_key,grade_key) VALUES('escola-a','Marcos','2º A DS','marcos','2º a ds')")
db.execute("INSERT OR IGNORE INTO students(owner,name,grade,name_key,grade_key) VALUES('escola-a','MARCOS','2º A DS','marcos','2º a ds')")
assert db.execute('SELECT COUNT(*) FROM students').fetchone() == (1,)
db.execute("INSERT INTO students(owner,name,grade,name_key,grade_key) VALUES('escola-b','Marcos','2º A DS','marcos','2º a ds')")
assert db.execute('SELECT COUNT(*) FROM students').fetchone() == (2,)
db.execute("UPDATE loans SET student_id=(SELECT id FROM students WHERE owner='escola-a' AND name_key='marcos' AND grade_key='2º a ds') WHERE id='emprestimo-antigo' AND owner='escola-a'")
db.execute("INSERT INTO loans(id,owner,data,student_id) VALUES('emprestimo-novo','escola-a','{}',(SELECT id FROM students WHERE owner='escola-a' AND name_key='marcos' AND grade_key='2º a ds'))")
assert db.execute("SELECT COUNT(DISTINCT student_id),COUNT(*) FROM loans WHERE owner='escola-a'").fetchone() == (1, 2)
suggestions = db.execute("SELECT id,name FROM students WHERE owner=? AND name_key>=? AND name_key<?", ('escola-a', 'mar', 'mar\uffff')).fetchall()
assert len(suggestions) == 1 and suggestions[0][1] == 'Marcos'
assert db.execute("SELECT COUNT(*) FROM students WHERE owner='escola-b'").fetchone() == (1,)
print('PASS: 1614 livros, empréstimo antigo, usuários e sessões preservados; identidades separadas por escola.')
