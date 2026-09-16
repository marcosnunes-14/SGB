const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const {spawnSync}=require('node:child_process');
const output=ts.transpileModule(fs.readFileSync('app/book-rules.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;const rules={};new Function('exports',output)(rules);
assert.equal(rules.canClone('bibliotecario'),false);assert.equal(rules.canClone('desenvolvedor'),true);assert.equal(rules.canClone('unknown'),false);
const valid={registration:' 001 ',copies:'1',title:'Livro',authors:'Autor',rack:'1',shelf:'5'};assert.equal(rules.normalizeBook(valid).registration,'001');assert.throws(()=>rules.normalizeBook({...valid,shelf:'6'}));
const script=`import json,sqlite3,sys,pathlib
rules=json.loads(sys.stdin.read()); db=sqlite3.connect(':memory:')
files=sorted(pathlib.Path('drizzle').glob('*.sql'))
for f in files[:2]:db.executescript(f.read_text())
db.execute("INSERT INTO users VALUES ('administrator','biblioteca','library','salt','unchanged-hash')")
for f in files[2:]:db.executescript(f.read_text())
assert db.execute("SELECT role,hash FROM users").fetchone()==('bibliotecario','unchanged-hash')
for id,owner,reg in [('a','library','001'),('b','library','002'),('foreign','other','003')]:db.execute('INSERT INTO books VALUES (?,?,?,?)',(id,owner,reg,json.dumps({'registration':reg,'title':'Livro'})))
db.execute('INSERT INTO loans VALUES (?,?,?)',('loan','library',json.dumps({'code':'001','status':'Emprestado'})))
db.execute(rules['delete2'],('library','a','b','library','a','b'))
assert db.execute('SELECT COUNT(*) FROM books').fetchone()[0]==3
# Active-loan registration cannot change, other fields can.
assert db.execute(rules['edit'],('009','{}','a','library','009')).rowcount==0
assert db.execute(rules['edit'],('001',json.dumps({'title':'Updated'}),'a','library','001')).rowcount==1
# Tenant restriction prevents editing another library.
assert db.execute(rules['edit'],('003','{}','foreign','library','003')).rowcount==0
db.execute("UPDATE loans SET data=? WHERE id='loan'",(json.dumps({'code':'001','status':'Devolvido'}),))
assert db.execute(rules['delete2'],('library','a','b','library','a','b')).rowcount==2
assert db.execute('SELECT COUNT(*) FROM loans').fetchone()[0]==1
assert db.execute('SELECT id FROM books').fetchone()[0]=='foreign'
print('PASS: migration preserves librarian credentials, role restrictions, book validation, batch deletion, active-loan protection, editing, tenant boundaries and loan history.')
`;
const result=spawnSync('python',['-c',script],{input:JSON.stringify({delete2:rules.deletionSql(2),edit:rules.editSql}),encoding:'utf8'});process.stdout.write(result.stdout);process.stderr.write(result.stderr);assert.equal(result.status,0);
