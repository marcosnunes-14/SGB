import {getUser} from '../../auth';
import {database} from '@/db/raw';
export const dynamic='force-dynamic';
export async function GET(){
 const started=performance.now();
 try{
  const user=await getUser();
  if(!user)return Response.json({error:'Entre novamente para continuar.'},{status:401});
  if(user.role!=='desenvolvedor')return Response.json({error:'Acesso exclusivo do desenvolvedor.'},{status:403});
  const queryStart=performance.now();const db=database();
  const ping=await db.prepare('SELECT 1 AS ok').first();const databaseMs=Math.round((performance.now()-queryStart)*10)/10;
  const [books,loans,users,sessions]=await Promise.all([
   db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(CAST(json_extract(data,'$.copies') AS INTEGER)),0) AS copies,COUNT(DISTINCT json_extract(data,'$.rack')||'-'||json_extract(data,'$.shelf')) AS shelves FROM books WHERE owner=?").bind(user.userId).first(),
   db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN json_extract(data,'$.status')!='Devolvido' THEN 1 ELSE 0 END),0) AS active,COALESCE(SUM(CASE WHEN json_extract(data,'$.status')='Devolvido' THEN 1 ELSE 0 END),0) AS returned FROM loans WHERE owner=?").bind(user.userId).first(),
   db.prepare('SELECT COUNT(*) AS total FROM users WHERE owner=?').bind(user.userId).first(),
   db.prepare('SELECT COUNT(*) AS total FROM sessions s JOIN users u ON u.id=s.user_id WHERE u.owner=? AND CAST(s.expires AS INTEGER)>?').bind(user.userId,Date.now()).first()
  ]);
  return Response.json({status:ping?'ok':'error',checkedAt:new Date().toISOString(),databaseMs,serverMs:Math.round((performance.now()-started)*10)/10,version:'1.0.0',books,loans,users,sessions},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Diagnostics failed',e);return Response.json({error:'A verificação falhou. A API ou o banco pode estar indisponível.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
