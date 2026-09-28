import {getUser} from '../../auth';
import {database} from '@/db/raw';
import {associateLegacyLoans} from '../../students-data';
import {studentCode,studentKey} from '../../student-identity';

export const dynamic='force-dynamic';
export async function GET(req:Request){
 const user=await getUser();if(!user)return Response.json({error:'Entre novamente.'},{status:401});
 if(!user.institutionId)return Response.json({error:'Selecione uma escola.'},{status:403});
 try{
  await associateLegacyLoans(user.userId);
  const query=studentKey(new URL(req.url).searchParams.get('q')||'');
  if(query.length<2)return Response.json({students:[]},{headers:{'Cache-Control':'no-store'}});
  const rows=await database().prepare(`SELECT s.id,s.name,s.grade,s.name_key,
   (SELECT COUNT(*) FROM loans l WHERE l.owner=s.owner AND l.student_id=s.id) AS loans_count,
   (SELECT MAX(json_extract(l.data,'$.delivery')) FROM loans l WHERE l.owner=s.owner AND l.student_id=s.id) AS last_loan
   FROM students s WHERE s.owner=? AND s.name_key>=? AND s.name_key<? ORDER BY s.name_key LIMIT 8`).bind(user.userId,query,query+'\uffff').all<{id:number;name:string;grade:string;name_key:string;loans_count:number;last_loan:string|null}>();
  const students=rows.results.map(s=>({id:String(s.id),code:studentCode(s.id),name:s.name,grade:s.grade,loansCount:s.loans_count,lastLoan:s.last_loan}));
  return Response.json({students},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Student suggestions failed',e);return Response.json({error:'Não foi possível consultar os alunos.'},{status:503})}
}
