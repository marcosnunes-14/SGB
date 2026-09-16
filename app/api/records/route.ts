import {getUser} from '../../auth';
import {database} from '@/db/raw';
import {canClone,normalizeBook,deletionSql,editSql} from '../../book-rules';
export async function GET(){
 const user=await getUser();if(!user)return Response.json({error:'Entre novamente para continuar.'},{status:401});
 try{const db=database();const [books,loans]=await Promise.all([db.prepare('SELECT id,data FROM books WHERE owner=? ORDER BY rowid DESC').bind(user.userId).all(),db.prepare('SELECT id,data FROM loans WHERE owner=? ORDER BY rowid DESC').bind(user.userId).all()]);return Response.json({books:books.results.map((r:any)=>({...JSON.parse(r.data),id:r.id})),loans:loans.results.map((r:any)=>({...JSON.parse(r.data),id:r.id}))},{headers:{'Cache-Control':'no-store'}})}catch(e){console.error(e);return Response.json({error:'Não foi possível carregar os registros. Tente novamente.'},{status:503})}
}
export async function POST(req:Request){
 const user=await getUser();if(!user)return Response.json({error:'Entre novamente para continuar.'},{status:401});
 if(!['bibliotecario','desenvolvedor'].includes(user.role))return Response.json({error:'Perfil sem permissão.'},{status:403});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origem inválida'},{status:403});
 try{
 const {kind,data,action,id,ids,registrations}=await req.json() as {kind:string;data:Record<string,string>;action:string;id:string;ids:string[];registrations:string[]};const db=database();
 if(action==='delete'){
  if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(v=>typeof v!=='string'))throw Error('Selecione de 1 a 100 livros.');
  const unique=[...new Set(ids)];const result=await db.prepare(deletionSql(unique.length)).bind(user.userId,...unique,user.userId,...unique).run();
  if(!result.meta.changes)throw Error('Nenhum livro excluído. A seleção contém um empréstimo ativo ou os livros já foram removidos.');
  return Response.json({ok:true,count:result.meta.changes});
 }
 if(action==='clone'){
  if(!canClone(user.role))return Response.json({error:'Somente o desenvolvedor pode clonar livros.'},{status:403});
  if(!Array.isArray(registrations)||registrations.length<1||registrations.length>100||registrations.some(v=>typeof v!=='string'||!v.trim()||v.trim().length>100))throw Error('Informe de 1 a 100 registros válidos.');
  const numbers=registrations.map(v=>v.trim());if(new Set(numbers).size!==numbers.length)throw Error('Existem números repetidos no lote.');
  const original=await db.prepare('SELECT data FROM books WHERE id=? AND owner=?').bind(id,user.userId).first<{data:string}>();if(!original)throw Error('Livro original não encontrado.');
  const source=JSON.parse(original.data);const existing=await db.prepare('SELECT registration FROM books WHERE owner=? AND registration IN ('+numbers.map(()=>'?').join(',')+')').bind(user.userId,...numbers).all<{registration:string}>();
  if(existing.results.length)throw Error('Registros já cadastrados: '+existing.results.map(r=>r.registration).join(', '));
  await db.batch(numbers.map(registration=>db.prepare('INSERT INTO books(id,owner,registration,data) VALUES(?,?,?,?)').bind(crypto.randomUUID(),user.userId,registration,JSON.stringify({...source,registration}))));return Response.json({ok:true,count:numbers.length});
 }
 if(action==='return'){
  const row=await db.prepare('SELECT data FROM loans WHERE id=? AND owner=?').bind(id,user.userId).first<{data:string}>();if(!row)throw Error('Empréstimo não encontrado.');const loan=JSON.parse(row.data);loan.status='Devolvido';await db.prepare('UPDATE loans SET data=? WHERE id=? AND owner=?').bind(JSON.stringify(loan),id,user.userId).run();return Response.json({ok:true});
 }
 if(!data||!['book','loan'].includes(kind))throw Error('Dados inválidos.');
 if(kind==='book'){
  const book=normalizeBook(data);
  const duplicate=await db.prepare('SELECT id FROM books WHERE owner=? AND registration=? AND id!=?').bind(user.userId,book.registration,action==='edit'?id:'').first();if(duplicate)throw Error('Este número de registro já está cadastrado.');
  if(action==='edit'){
   const result=await db.prepare(editSql).bind(book.registration,JSON.stringify(book),id,user.userId,book.registration).run();
   if(!result.meta.changes)throw Error('Não foi possível editar. O livro foi removido ou está emprestado e seu registro não pode ser alterado.');
  }else await db.prepare('INSERT INTO books(id,owner,registration,data) VALUES(?,?,?,?)').bind(crypto.randomUUID(),user.userId,book.registration,JSON.stringify(book)).run();
 }else{
  for(const value of Object.values(data))if(typeof value!=='string'||value.length>1000)throw Error('Dados inválidos.');
  if(!data.student?.trim()||!data.grade?.trim()||!data.code?.trim()||!data.title?.trim()||!data.author?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(data.delivery)||!/^\d{4}-\d{2}-\d{2}$/.test(data.due)||data.due<data.delivery||!['Emprestado','Devolvido'].includes(data.status))throw Error('Confira os campos e as datas do empréstimo.');
  data.code=data.code.trim();await db.prepare('INSERT INTO loans(id,owner,data) VALUES(?,?,?)').bind(crypto.randomUUID(),user.userId,JSON.stringify(data)).run();
 }
 return Response.json({ok:true});
 }catch(e){const message=e instanceof Error?e.message:'';if(/SQLITE|D1_|constraint/i.test(message)){console.error(e);return Response.json({error:'Não foi possível salvar. Confira se o registro já está em uso e atualize a lista.'},{status:409})}return Response.json({error:message||'Não foi possível salvar.'},{status:400})}
}
