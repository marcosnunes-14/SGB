import {getUser} from '../../auth';
import {database} from '@/db/raw';
import {labelIds} from '../../label-rules';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const user=await getUser();if(!user)return Response.json({error:'Entre novamente.'},{status:401});
 if(!user.institutionId)return Response.json({error:'Selecione uma escola.'},{status:403});
 try{
  const code=new URL(req.url).searchParams.get('code');
  const query=database().prepare(`SELECT b.id,b.registration,b.data,l.id AS label_id,l.copy_number,l.code,l.print_count,l.last_printed_at FROM books b JOIN book_labels l ON l.book_id=b.id AND l.owner=b.owner WHERE b.owner=? AND l.copy_number<=MAX(1,CAST(COALESCE(json_extract(b.data,'$.copies'),1) AS INTEGER)) ${code?'AND l.code=?':''} ORDER BY l.id DESC`);
  const rows=await (code?query.bind(user.userId,code):query.bind(user.userId)).all<{id:string;registration:string;data:string;label_id:number;copy_number:number;code:string;print_count:number;last_printed_at:string|null}>();
  return Response.json({school:user.institutionName,books:rows.results.map(r=>{const data=JSON.parse(r.data);return {id:String(r.label_id),bookId:r.id,copyNumber:r.copy_number,registration:r.registration,title:data.title||'',authors:data.authors||'',code:r.code,printCount:r.print_count,lastPrintedAt:r.last_printed_at}})},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){console.error('Labels unavailable',e);return Response.json({error:'Não foi possível carregar as etiquetas. Confira se a migração de etiquetas foi aplicada.'},{status:503})}
}
export async function POST(req:Request){
 const user=await getUser();if(!user)return Response.json({error:'Entre novamente.'},{status:401});
 if(!user.institutionId||!['bibliotecario','desenvolvedor'].includes(user.role))return Response.json({error:'Perfil sem permissão para registrar impressões.'},{status:403});
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
 try{
  const body=await req.json() as {action?:unknown;ids?:unknown;jobId?:unknown};if(!body||typeof body!=='object')throw Error('Dados inválidos.');const ids=labelIds(body.ids);
  if(body.action!=='confirm-print'||typeof body.jobId!=='string'||!/^[-a-f0-9]{36}$/i.test(body.jobId))throw Error('Confirmação de impressão inválida.');
  const jobId=body.jobId,db=database();const rows=await db.prepare(`SELECT l.id,l.book_id FROM book_labels l JOIN books b ON b.id=l.book_id AND b.owner=l.owner WHERE l.owner=? AND l.copy_number<=MAX(1,CAST(COALESCE(json_extract(b.data,'$.copies'),1) AS INTEGER))`).bind(user.userId).all<{id:number;book_id:string}>();
  const available=new Map(rows.results.map(r=>[String(r.id),r.id]));
  if(ids.some(id=>!available.has(id)))return Response.json({error:'Um exemplar foi removido ou não pertence à escola atual. Atualize a seleção.'},{status:409});
  // A chave (trabalho, etiqueta) torna cada confirmação idempotente.
  for(let i=0;i<ids.length;i+=80)await db.batch(ids.slice(i,i+80).map(id=>db.prepare('INSERT OR IGNORE INTO label_print_events(job_id,label_id) SELECT ?,l.id FROM book_labels l JOIN books b ON b.id=l.book_id AND b.owner=l.owner WHERE l.id=? AND l.owner=?').bind(jobId,available.get(id)!,user.userId)));
  return Response.json({ok:true,count:ids.length},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Label print confirmation failed',e);return Response.json({error:e instanceof Error&&!/SQLITE|D1_|constraint/i.test(e.message)?e.message:'Não foi possível registrar a impressão. Tente novamente.'},{status:400})}
}
