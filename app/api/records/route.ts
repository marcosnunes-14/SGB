import {getUser} from '../../auth';
import {database} from '@/db/raw';
import {canClone,normalizeBook,deletionSql,editSql} from '../../book-rules';
import {resolveStudent} from '../../students-data';
import {compareRegistrations} from '../../registration-order';
async function audit(institutionId:string,userId:string,action:string,details:string){try{await database().prepare('INSERT INTO audit_logs(id,institution_id,user_id,action,details) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),institutionId,userId,action,details).run()}catch(e){console.error('Audit log unavailable',e)}}
export async function GET(req:Request){
 const start=performance.now();
 const user=await getUser();if(!user)return Response.json({error:'Entre novamente para continuar.'},{status:401});
 if(!user.institutionId)return Response.json({error:'Selecione uma escola no Painel SGB.'},{status:403});
 try{const authEnd=performance.now();const db=database();
 const loanId=new URL(req.url).searchParams.get('loanId');
 if(loanId){
  const row=await db.prepare('SELECT data FROM loans WHERE id=? AND owner=?').bind(loanId,user.userId).first<{data:string}>();
  if(!row)return Response.json({error:'Empréstimo não encontrado.'},{status:404});
  const loan=JSON.parse(row.data);
  const book=await db.prepare('SELECT data FROM books WHERE owner=? AND registration=?').bind(user.userId,String(loan.code||'').trim()).first<{data:string}>();
  const location=book?JSON.parse(book.data):null;
  return Response.json({loan:{id:loanId,title:loan.title,code:loan.code,student:loan.student,delivery:loan.delivery,due:loan.due,status:loan.status},location:location?{rack:location.rack||null,shelf:location.shelf||null}:null},{headers:{'Cache-Control':'no-store'}});
 }
 const [books,loans]=await Promise.all([db.prepare('SELECT id,data FROM books WHERE owner=? ORDER BY rowid DESC').bind(user.userId).all(),db.prepare('SELECT id,data,student_id FROM loans WHERE owner=? ORDER BY rowid DESC').bind(user.userId).all()]);const queryEnd=performance.now();const body=JSON.stringify({books:books.results.map((r:any)=>({...JSON.parse(r.data),id:r.id})).sort((a,b)=>compareRegistrations(a.registration,b.registration)),loans:loans.results.map((r:any)=>({...JSON.parse(r.data),id:r.id,studentId:r.student_id}))});const serializeEnd=performance.now();return new Response(body,{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Server-Timing':`auth;dur=${(authEnd-start).toFixed(1)}, db;dur=${(queryEnd-authEnd).toFixed(1)}, json;dur=${(serializeEnd-queryEnd).toFixed(1)}`}})}catch(e){console.error(e);return Response.json({error:'Não foi possível carregar os registros. Tente novamente.'},{status:503})}
}
export async function POST(req:Request){
 const user=await getUser();if(!user)return Response.json({error:'Entre novamente para continuar.'},{status:401});
 if(!user.institutionId||!['bibliotecario','desenvolvedor'].includes(user.role))return Response.json({error:'Perfil sem permissão nesta escola.'},{status:403});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origem inválida'},{status:403});
 try{
 const {kind,data,action,id,ids,registrations,due,expectedDue}=await req.json() as {kind:string;data:Record<string,string>;action:string;id:string;ids:string[];registrations:string[];due:string;expectedDue:string};const db=database();
 if(action==='delete'){
  if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(v=>typeof v!=='string'))throw Error('Selecione de 1 a 100 livros.');
  const unique=[...new Set(ids)];const result=await db.prepare(deletionSql(unique.length)).bind(user.userId,...unique,user.userId,...unique).run();
  if(!result.meta.changes)throw Error('Nenhum livro excluído. A seleção contém um empréstimo ativo ou os livros já foram removidos.');
  await audit(user.institutionId,user.id,'livros_excluidos',JSON.stringify({ids:unique,quantidade:result.meta.changes}));return Response.json({ok:true,count:result.meta.changes});
 }
 if(action==='clone'){
  if(!canClone(user.role))return Response.json({error:'Perfil sem permissão para clonar livros.'},{status:403});
  if(!Array.isArray(registrations)||registrations.length<1||registrations.length>100||registrations.some(v=>typeof v!=='string'||!v.trim()||v.trim().length>100))throw Error('Informe de 1 a 100 registros válidos.');
  const numbers=registrations.map(v=>v.trim());if(new Set(numbers).size!==numbers.length)throw Error('Existem números repetidos no lote.');
  const original=await db.prepare('SELECT data FROM books WHERE id=? AND owner=?').bind(id,user.userId).first<{data:string}>();if(!original)throw Error('Livro original não encontrado.');
  const source=JSON.parse(original.data);const existing=await db.prepare('SELECT registration FROM books WHERE owner=? AND registration IN ('+numbers.map(()=>'?').join(',')+')').bind(user.userId,...numbers).all<{registration:string}>();
  if(existing.results.length)throw Error('Registros já cadastrados: '+existing.results.map(r=>r.registration).join(', '));
  await db.batch(numbers.map(registration=>db.prepare('INSERT INTO books(id,owner,registration,data) VALUES(?,?,?,?)').bind(crypto.randomUUID(),user.userId,registration,JSON.stringify({...source,registration}))));await audit(user.institutionId,user.id,'livros_clonados',JSON.stringify({original:id,quantidade:numbers.length}));return Response.json({ok:true,count:numbers.length});
 }
 if(action==='return'||action==='renew'){
  if(typeof id!=='string'||!id)throw Error('Empréstimo inválido.');
  const row=await db.prepare('SELECT data FROM loans WHERE id=? AND owner=?').bind(id,user.userId).first<{data:string}>();
  if(!row)return Response.json({error:'Empréstimo não encontrado.'},{status:404});
  const loan=JSON.parse(row.data);
  if(loan.status==='Devolvido')return Response.json({error:'Este empréstimo já foi devolvido. Atualize a lista.'},{status:409});
  const event={id:crypto.randomUUID(),at:new Date().toISOString(),userId:user.id,userName:user.username};
  let details:string;
  if(action==='renew'){
   if(expectedDue!==loan.due)return Response.json({error:'O prazo foi alterado. Feche esta janela e abra novamente.'},{status:409});
   if(typeof due!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(due)||!Number.isFinite(Date.parse(due+'T12:00:00Z'))||new Date(due+'T12:00:00Z').toISOString().slice(0,10)!==due||due<=loan.due||due<loan.delivery)throw Error('Escolha uma data válida posterior ao prazo atual.');
   const renewal={...event,previousDue:loan.due,due};
   loan.renewals=[...(Array.isArray(loan.renewals)?loan.renewals:[]),renewal];
   loan.due=due;details=JSON.stringify({loanId:id,student:loan.student,code:loan.code,...renewal});
  }else{
   loan.status='Devolvido';loan.returnEvent=event;
   details=JSON.stringify({loanId:id,student:loan.student,code:loan.code,...event});
  }
  // A comparação protege contra devolução/renovação simultâneas. O log participa da mesma transação.
  const updated=JSON.stringify(loan);
  const results=await db.batch([
   db.prepare('UPDATE loans SET data=? WHERE id=? AND owner=? AND data=?').bind(updated,id,user.userId,row.data),
   db.prepare('INSERT INTO audit_logs(id,institution_id,user_id,action,details) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM loans WHERE id=? AND owner=? AND data=?)').bind(event.id,user.institutionId,user.id,action==='renew'?'renovacao_prazo':'devolucao',details,id,user.userId,updated)
  ]);
  if(!results[0].meta.changes)return Response.json({error:'O empréstimo foi alterado por outro usuário. Atualize a lista.'},{status:409});
  return Response.json({ok:true});
 }
 if(!data||!['book','loan'].includes(kind))throw Error('Dados inválidos.');
 if(kind==='book'){
  const book=normalizeBook(data);
  const duplicate=await db.prepare('SELECT id FROM books WHERE owner=? AND registration=? AND id!=?').bind(user.userId,book.registration,action==='edit'?id:'').first();if(duplicate)throw Error('Este número de registro já está cadastrado.');
  if(action==='edit'){
   const result=await db.prepare(editSql).bind(book.registration,JSON.stringify(book),id,user.userId,book.registration).run();
   if(!result.meta.changes)throw Error('Não foi possível editar. O livro foi removido ou está emprestado e seu registro não pode ser alterado.');
  }else await db.prepare('INSERT INTO books(id,owner,registration,data) VALUES(?,?,?,?)').bind(crypto.randomUUID(),user.userId,book.registration,JSON.stringify(book)).run();
  await audit(user.institutionId,user.id,action==='edit'?'livro_alterado':'livro_cadastrado',book.registration);
 }else{
  for(const value of Object.values(data))if(typeof value!=='string'||value.length>1000)throw Error('Dados inválidos.');
  if(!data.student?.trim()||!data.grade?.trim()||!data.code?.trim()||!data.title?.trim()||!data.author?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(data.delivery)||!/^\d{4}-\d{2}-\d{2}$/.test(data.due)||data.due<data.delivery||!['Emprestado','Devolvido'].includes(data.status))throw Error('Confira os campos e as datas do empréstimo.');
  const selectedId=data.studentId;delete data.studentId;const student=await resolveStudent(user.userId,data.student,data.grade,selectedId);data.student=student.name;data.grade=student.grade;data.code=data.code.trim();await db.prepare('INSERT INTO loans(id,owner,data,student_id) VALUES(?,?,?,?)').bind(crypto.randomUUID(),user.userId,JSON.stringify(data),student.id).run();await audit(user.institutionId,user.id,'emprestimo',data.code);
 }
 return Response.json({ok:true});
 }catch(e){const message=e instanceof Error?e.message:'';if(/SQLITE|D1_|constraint/i.test(message)){console.error(e);return Response.json({error:'Não foi possível salvar. Confira se o registro já está em uso e atualize a lista.'},{status:409})}return Response.json({error:message||'Não foi possível salvar.'},{status:400})}
}
