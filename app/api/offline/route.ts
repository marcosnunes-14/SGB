import {getUser,digest} from '../../auth';
import {database} from '@/db/raw';
import {applyOperation,checkBases,canonical,changes,dataOf,emptySnapshot,targets,type Snapshot,type Profile,type Operation} from '../../offline/model';
import {associateLegacyLoans} from '../../students-data';
import {studentKey} from '../../student-identity';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){
 const user=await getUser();if(!user)return Response.json({error:'Entre no site para preparar ou sincronizar o aplicativo.'},{status:401,headers});if(!user.institutionId)return Response.json({error:'Selecione uma escola em modo suporte antes de abrir o aplicativo.'},{status:403,headers});
 try{
  await associateLegacyLoans(user.userId);const db=database();
  const [books,loans,students,labels]=await db.batch([
   db.prepare('SELECT id,data FROM books WHERE owner=? ORDER BY rowid DESC').bind(user.userId),
   db.prepare('SELECT id,data,student_id FROM loans WHERE owner=? ORDER BY rowid DESC').bind(user.userId),
   db.prepare('SELECT id,name,grade,created_at FROM students WHERE owner=?').bind(user.userId),
   db.prepare("SELECT b.id AS book_id,b.registration,b.data,l.id,l.copy_number,l.code,l.print_count,l.last_printed_at FROM books b JOIN book_labels l ON l.book_id=b.id AND l.owner=b.owner WHERE b.owner=? AND l.copy_number<=MAX(1,CAST(COALESCE(json_extract(b.data,'$.copies'),1) AS INTEGER)) ORDER BY l.id DESC").bind(user.userId)
  ]);
  const snapshot:Snapshot={books:(books.results as {id:string;data:string}[]).map(row=>({...JSON.parse(row.data),id:row.id})),loans:(loans.results as {id:string;data:string;student_id:number|null}[]).map(row=>({...JSON.parse(row.data),id:row.id,studentId:row.student_id})),students:students.results as Snapshot['students'],labels:(labels.results as {id:number;book_id:string;registration:string;data:string;copy_number:number;code:string;print_count:number;last_printed_at:string|null}[]).map(row=>{const book=JSON.parse(row.data);return {id:String(row.id),bookId:row.book_id,registration:row.registration,title:book.title||'',authors:book.authors||'',copyNumber:row.copy_number,code:row.code,printCount:row.print_count,lastPrintedAt:row.last_printed_at}})};
  return Response.json({user:{...user,offlineUntil:Date.now()+7*86400000},snapshot,syncedAt:new Date().toISOString()},{headers});
 }catch(e){console.error(e);return Response.json({error:'Não foi possível preparar o aplicativo. Tente novamente com internet.'},{status:503,headers})}
}
// A identificação da operação e os dados são gravados na mesma transação do D1.
const guard=`NOT EXISTS(SELECT 1 FROM json_each(?) e WHERE
 (json_extract(e.value,'$.kind')='book' AND NOT EXISTS(SELECT 1 FROM books b WHERE b.id=json_extract(e.value,'$.id') AND b.owner=? AND b.data=json_extract(e.value,'$.raw')))
 OR (json_extract(e.value,'$.kind')='loan' AND NOT EXISTS(SELECT 1 FROM loans l WHERE l.id=json_extract(e.value,'$.id') AND l.owner=? AND l.data=json_extract(e.value,'$.raw'))))`;
export async function POST(req:Request){
 const user=await getUser();if(!user)return Response.json({error:'Entre novamente no site. As alterações continuam salvas no aplicativo.'},{status:401,headers});
 if(!user.institutionId||!['bibliotecario','desenvolvedor'].includes(user.role))return Response.json({error:'Perfil sem permissão para sincronizar nesta escola.'},{status:403,headers});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origem inválida.'},{status:403,headers});
 let marker='',hash='';const db=database();
 const receipt=async()=>{if(!marker)return false;const previous=await db.prepare('SELECT institution_id,user_id,details FROM audit_logs WHERE id=?').bind(marker).first<{institution_id:string;user_id:string;details:string}>();if(!previous)return false;if(previous.institution_id!==user.institutionId||previous.user_id!==user.id||JSON.parse(previous.details).hash!==hash)throw Error('Identificação de sincronização já utilizada por outra alteração.');return true};
 try{
  const raw=await req.text();if(raw.length>2000000)throw Error('Lote muito grande.');const body=JSON.parse(raw) as {owner:string;actor:string;operation:Operation};const op=body.operation;
  if(body.owner!==user.userId||body.actor!==user.id)throw Error('Entre com o mesmo usuário e escola que prepararam este aplicativo.');
  if(!op||!/^[a-f0-9-]{36}$/i.test(op.id)||!Array.isArray(op.base)||op.base.length>100||!op.body)throw Error('Operação inválida.');
  marker='offline:'+op.id;hash=await digest(canonical(op));if(await receipt())return Response.json({ok:true,replayed:true},{headers});
  const state=emptySnapshot(),target=targets(op.body),bookIds=target.kind==='book'?target.ids:[],loanIds=target.kind==='loan'?target.ids:[];
  const registrations=op.body.action==='clone'?op.body.registrations:op.body.kind==='book'?[(op.body.data as Record<string,unknown>)?.registration]:[];
  const bookRows=await db.prepare('SELECT id,data FROM books WHERE owner=? AND (id IN (SELECT value FROM json_each(?)) OR registration IN (SELECT value FROM json_each(?)))').bind(user.userId,JSON.stringify(bookIds),JSON.stringify(registrations||[])).all<{id:string;data:string}>();
  state.books=bookRows.results.map(r=>({...JSON.parse(r.data),id:r.id}));
  const codes=state.books.map(r=>r.registration);
  const loanRows=await db.prepare("SELECT id,data,student_id FROM loans WHERE owner=? AND (id IN (SELECT value FROM json_each(?)) OR TRIM(json_extract(data,'$.code')) IN (SELECT value FROM json_each(?)))").bind(user.userId,JSON.stringify(loanIds),JSON.stringify(codes)).all<{id:string;data:string;student_id:number|null}>();
  state.loans=loanRows.results.map(r=>({...JSON.parse(r.data),id:r.id,studentId:r.student_id}));
  if(op.body.kind==='loan'){const input=op.body.data as Record<string,string>;const students=await db.prepare('SELECT id,name,grade FROM students WHERE owner=? AND name_key=? AND grade_key=?').bind(user.userId,studentKey(input?.student||''),studentKey(input?.grade||'')).all<Snapshot['students'][number]>();state.students=students.results}
  if(op.body.action==='label-print'){const rows=await db.prepare('SELECT l.id,l.book_id,l.print_count FROM book_labels l JOIN books b ON b.id=l.book_id AND b.owner=l.owner WHERE l.owner=? AND l.copy_number<=MAX(1,CAST(COALESCE(json_extract(b.data,\'$.copies\'),1) AS INTEGER)) AND l.id IN (SELECT value FROM json_each(?))').bind(user.userId,JSON.stringify(op.body.ids)).all<{id:number;book_id:string;print_count:number}>();state.labels=rows.results.map(r=>({id:String(r.id),bookId:r.book_id,printCount:r.print_count}))}
  checkBases(state,op);const profile={...user,offlineUntil:0} as Profile,next=applyOperation(state,op,profile),delta=changes(state,next);
  const rawRows=[...bookRows.results.map(r=>({kind:'book',id:r.id,raw:r.data})),...loanRows.results.map(r=>({kind:'loan',id:r.id,raw:r.data}))];
  // Impede excluir/trocar registro caso um novo empréstimo tenha chegado após a leitura.
  let protection='';const parameters:unknown[]=[];
  if(op.body.action==='delete'||op.body.action==='edit'&&op.body.kind==='book'&&state.books.find(b=>b.id===op.body.id)?.registration!==(op.body.data as Record<string,unknown>)?.registration){protection=" AND NOT EXISTS(SELECT 1 FROM books b JOIN loans l ON l.owner=b.owner AND TRIM(json_extract(l.data,'$.code'))=b.registration WHERE b.owner=? AND b.id IN (SELECT value FROM json_each(?)) AND json_extract(l.data,'$.status')!='Devolvido')";parameters.push(user.userId,JSON.stringify(bookIds))}
  if(op.body.action==='label-print'){const ids=[...new Set(op.body.ids as string[])];protection+=" AND (SELECT COUNT(*) FROM book_labels l JOIN books b ON b.id=l.book_id AND b.owner=l.owner WHERE l.owner=? AND l.id IN (SELECT value FROM json_each(?)) AND l.copy_number<=MAX(1,CAST(COALESCE(json_extract(b.data,'$.copies'),1) AS INTEGER)))=?";parameters.push(user.userId,JSON.stringify(ids),ids.length)}
  const statements=[db.prepare('INSERT INTO audit_logs(id,institution_id,user_id,action,details) SELECT ?,?,?,?,? WHERE '+guard+protection).bind(marker,user.institutionId,user.id,'aplicativo_'+String(op.body.action||op.body.kind),JSON.stringify({hash,deviceAt:op.at,action:op.body.action||op.body.kind}),JSON.stringify(rawRows),user.userId,user.userId,...parameters)];
  const exists='EXISTS(SELECT 1 FROM audit_logs WHERE id=?)';
  const bookDelta=delta.filter(item=>item.kind==='book');
  const removed=bookDelta.filter(item=>!item.after).map(item=>item.id),created=bookDelta.filter(item=>!item.before&&item.after).map(item=>({id:item.id,registration:item.after!.registration,data:JSON.stringify(dataOf(item.after!))})),edited=bookDelta.filter(item=>item.before&&item.after).map(item=>({id:item.id,registration:item.after!.registration,data:JSON.stringify(dataOf(item.after!))}));
  if(removed.length)statements.push(db.prepare('DELETE FROM books WHERE owner=? AND id IN (SELECT value FROM json_each(?)) AND '+exists).bind(user.userId,JSON.stringify(removed),marker));
  if(created.length)statements.push(db.prepare("INSERT INTO books(id,owner,registration,data) SELECT json_extract(value,'$.id'),?,json_extract(value,'$.registration'),json_extract(value,'$.data') FROM json_each(?) WHERE "+exists).bind(user.userId,JSON.stringify(created),marker));
  if(edited.length){const json=JSON.stringify(edited);statements.push(db.prepare("UPDATE books SET registration=(SELECT json_extract(value,'$.registration') FROM json_each(?) WHERE json_extract(value,'$.id')=books.id),data=(SELECT json_extract(value,'$.data') FROM json_each(?) WHERE json_extract(value,'$.id')=books.id) WHERE owner=? AND id IN (SELECT json_extract(value,'$.id') FROM json_each(?)) AND "+exists).bind(json,json,user.userId,json,marker))}
  for(const item of delta.filter(item=>item.kind==='loan')){
   if(item.after){
    if(item.before)statements.push(db.prepare('UPDATE loans SET data=? WHERE id=? AND owner=? AND '+exists).bind(JSON.stringify(dataOf(item.after)),item.id,user.userId,marker));
    else{
     const row=item.after,name=String(row.student),grade=String(row.grade);
     statements.push(db.prepare('INSERT OR IGNORE INTO students(owner,name,grade,name_key,grade_key) SELECT ?,?,?,?,? WHERE '+exists).bind(user.userId,name,grade,studentKey(name),studentKey(grade),marker));
     statements.push(db.prepare('INSERT INTO loans(id,owner,data,student_id) SELECT ?,?,?,(SELECT id FROM students WHERE owner=? AND name_key=? AND grade_key=?) WHERE '+exists).bind(row.id,user.userId,JSON.stringify(dataOf(row)),user.userId,studentKey(name),studentKey(grade),marker));
    }
   }
  }
  if(op.body.action==='label-print')statements.push(db.prepare('INSERT OR IGNORE INTO label_print_events(job_id,label_id) SELECT ?,l.id FROM book_labels l JOIN json_each(?) selection ON CAST(selection.value AS INTEGER)=l.id WHERE l.owner=? AND '+exists).bind(op.body.jobId,JSON.stringify(op.body.ids),user.userId,marker));
  const result=await db.batch(statements);if(!result[0].meta.changes)throw Error('Os dados mudaram enquanto sincronizávamos. Revise e tente novamente.');
  return Response.json({ok:true},{headers});
 }catch(e){try{if(await receipt())return Response.json({ok:true,replayed:true},{headers})}catch{/* Mantém o conflito e nunca aplica outro conteúdo com a mesma identificação. */}console.error('Offline sync',e);const message=e instanceof Error?e.message:'';return Response.json({error:/SQLITE|D1_|constraint/i.test(message)?'Registro já utilizado ou conflito ao gravar. Nenhuma parte desta operação foi aplicada.':message||'Não foi possível sincronizar.'},{status:409,headers})}
}
