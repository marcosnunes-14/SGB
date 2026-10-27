import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import net from 'node:net';
const exec=promisify(execFile),root=await mkdtemp(join(tmpdir(),'sgb-offline-test-')),state=join(root,'state'),log=join(root,'server.log');
const cli='./node_modules/wrangler/bin/wrangler.js',args=['--import','./scripts/sites-env.mjs',cli],config=['--local','--config','wrangler-d1.jsonc','--persist-to',state];
let server,passed=false;
try{
 console.log('Preparando D1 isolado de teste, somente local…');
 await exec(process.execPath,[...args,'d1','migrations','apply','sgb-db',...config],{maxBuffer:5e6});
 const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
 let sql="INSERT INTO institutions(id,code,name,status) VALUES('a-test','SGB-0001','Escola de teste','ativa');\nINSERT INTO users(id,username,owner,salt,hash,role,active,display_name) VALUES('u-test','leila-test','a-test','fixture-only','not-a-real-credential','bibliotecario',1,'Bibliotecária de teste');\nINSERT INTO sessions(token_hash,user_id,expires) VALUES("+quote(createHash('sha256').update('local-fixture-token').digest('hex'))+",'u-test',"+quote(Date.now()+86400000)+");\n";
 for(let i=1;i<=1614;i++)sql+='INSERT INTO books(id,owner,registration,data) VALUES('+[quote('book-'+i),quote('a-test'),quote(i),quote(JSON.stringify({registration:String(i),copies:'1',authors:'Autor de teste',title:'Livro '+i,rack:'1',shelf:'1'}))].join(',')+');\n';
 sql+="INSERT INTO students(id,owner,name,grade,name_key,grade_key) VALUES(1,'a-test','Aluno de teste','2º A DS','aluno de teste','2o a ds');\nINSERT INTO loans(id,owner,data,student_id) VALUES('loan-test','a-test',"+quote(JSON.stringify({student:'Aluno de teste',grade:'2º A DS',code:'1',title:'Livro 1',author:'Autor de teste',delivery:'2026-10-20',due:'2026-11-10',status:'Emprestado'}))+',1);';
 const file=join(root,'fixture.sql');await writeFile(file,sql);await exec(process.execPath,[...args,'d1','execute','sgb-db',...config,'--file',file],{maxBuffer:5e6});
 const port=await new Promise(resolve=>{const socket=net.createServer();socket.listen(0,'127.0.0.1',()=>{const value=socket.address().port;socket.close(()=>resolve(value))})});
 const output=createWriteStream(log);server=spawn(process.execPath,[...args,'dev','--config','wrangler.production.jsonc','--local','--persist-to',state,'--ip','127.0.0.1','--port',String(port),'--inspector-port','0'],{stdio:['ignore','pipe','pipe']});server.stdout.pipe(output);server.stderr.pipe(output);
 const origin='http://127.0.0.1:'+port;
 for(let i=0;i<80;i++){try{if((await fetch(origin+'/manifest.webmanifest')).ok)break}catch{}if(i===79)throw Error('Servidor local não iniciou.');await new Promise(resolve=>setTimeout(resolve,500))}
 const child=spawn(process.execPath,['tests/offline-browser.mjs'],{env:{...process.env,SGB_TEST_ORIGIN:origin},stdio:'inherit'});const exit=await new Promise(resolve=>child.on('exit',resolve));if(exit!==0)throw Error('Teste de navegador falhou.');passed=true;
}finally{
 if(server){server.kill('SIGTERM');await Promise.race([new Promise(resolve=>server.on('exit',resolve)),new Promise(resolve=>setTimeout(resolve,4000))])}
 if(passed)await rm(root,{recursive:true,force:true});else console.error((await readFile(log,'utf8').catch(()=>'' )).split('\n').slice(-15).join('\n'));
}
