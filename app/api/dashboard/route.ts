import {getUser} from '../../auth';
import {database} from '@/db/raw';
import {associateLegacyLoans} from '../../students-data';
import {studentKey} from '../../student-identity';
import {summarizeDashboard} from '../../dashboard-data';

export const dynamic='force-dynamic';
export async function GET(req:Request){
 const user=await getUser();if(!user)return Response.json({error:'Entre novamente.'},{status:401});
 if(!user.institutionId)return Response.json({error:'Selecione uma escola.'},{status:403});
 const params=new URL(req.url).searchParams,start=params.get('start')||'',end=params.get('end')||'',today=params.get('today')||new Date().toISOString().slice(0,10),status=params.get('status')||'todos';
 const validDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s));
 if(!validDate(start)||!validDate(end)||!validDate(today)||start>end||Date.parse(end)-Date.parse(start)>366*3*86400000||!['todos','ativos','devolvidos','atrasados'].includes(status))return Response.json({error:'Confira os filtros do período.'},{status:400});
 try{
  await associateLegacyLoans(user.userId);
  const db=database();const [loans,students]=await Promise.all([
   db.prepare("SELECT student_id,data FROM loans WHERE owner=? AND json_extract(data,'$.delivery')>=? AND json_extract(data,'$.delivery')<=?").bind(user.userId,start,end).all<{student_id:number|null;data:string}>(),
   db.prepare('SELECT id,name,grade,grade_key FROM students WHERE owner=? ORDER BY name').bind(user.userId).all<{id:number;name:string;grade:string;grade_key:string}>()
  ]);
  const grade=params.get('grade')||'';const summary=summarizeDashboard(loans.results,students.results,{start,end,today,status,grade:studentKey(grade)});
  return Response.json({...summary,availableGrades:[...new Set(students.results.map(s=>s.grade))].sort((a,b)=>a.localeCompare(b,'pt-BR'))},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Dashboard failed',e);return Response.json({error:'Não foi possível carregar o Dashboard.'},{status:503})}
}
