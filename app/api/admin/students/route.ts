import {getUser} from '../../../auth';
import {database} from '@/db/raw';
import {studentCode,studentKey} from '../../../student-identity';

const pageSize=50;
type Student={id:number;name:string;grade:string;created_at:string;loans_count:number;pending_count:number;last_loan:string|null};
const stats=`SELECT s.id,s.name,s.grade,s.created_at,
 (SELECT COUNT(*) FROM loans l WHERE l.owner=s.owner AND l.student_id=s.id) AS loans_count,
 (SELECT COUNT(*) FROM loans l WHERE l.owner=s.owner AND l.student_id=s.id AND COALESCE(json_extract(l.data,'$.status'),'')!='Devolvido') AS pending_count,
 (SELECT MAX(json_extract(l.data,'$.delivery')) FROM loans l WHERE l.owner=s.owner AND l.student_id=s.id) AS last_loan FROM students s`;
const present=(s:Student)=>({id:String(s.id),code:studentCode(s.id),name:s.name,grade:s.grade,createdAt:s.created_at,loansCount:s.loans_count,pendingCount:s.pending_count,lastLoan:s.last_loan});

export async function GET(req:Request){
 const user=await getUser();
 if(!user)return Response.json({error:'Entre novamente para continuar.'},{status:401});
 if(user.role!=='desenvolvedor')return Response.json({error:'Consulta restrita ao desenvolvedor.'},{status:403});
 const params=new URL(req.url).searchParams,institutionId=params.get('institutionId')||'',studentId=params.get('studentId'),query=params.get('q')||'',grade=params.get('grade')||'',page=Number(params.get('page')||'1');
 if(!institutionId||institutionId.length>100||query.length>150||grade.length>100||!Number.isSafeInteger(page)||page<1||page>100000||studentId!==null&&(!/^\d+$/.test(studentId)||!Number.isSafeInteger(Number(studentId))||Number(studentId)<1))return Response.json({error:'Parâmetros de consulta inválidos.'},{status:400});
 try{
  const db=database();
  const school=await db.prepare('SELECT id FROM institutions WHERE id=?').bind(institutionId).first();
  if(!school)return Response.json({error:'Escola não encontrada.'},{status:404});
  if(studentId){
   const student=await db.prepare(stats+' WHERE s.owner=? AND s.id=?').bind(institutionId,Number(studentId)).first<Student>();
   if(!student)return Response.json({error:'Aluno não encontrado nesta escola.'},{status:404});
   const rows=await db.prepare("SELECT id,data FROM loans WHERE owner=? AND student_id=? ORDER BY json_extract(data,'$.delivery') DESC,rowid DESC LIMIT ? OFFSET ?").bind(institutionId,Number(studentId),pageSize+1,(page-1)*pageSize).all<{id:string;data:string}>();
   const loans=rows.results.slice(0,pageSize).map(row=>{const data=JSON.parse(row.data);return {id:row.id,title:data.title,author:data.author,code:data.code,delivery:data.delivery,due:data.due,status:data.status}});
   return Response.json({student:present(student),loans,page,hasMore:rows.results.length>pageSize},{headers:{'Cache-Control':'no-store'}});
  }
  const term=studentKey(query),codeMatch=/^alu-0*(\d+)$/i.exec(term),codeId=codeMatch?Number(codeMatch[1]):-1;
  const [rows,grades]=await Promise.all([
   db.prepare(stats+" WHERE s.owner=? AND (?='' OR instr(s.name_key,?)>0 OR s.id=?) AND (?='' OR s.grade_key=?) ORDER BY s.name_key,s.id LIMIT ? OFFSET ?").bind(institutionId,term,term,Number.isSafeInteger(codeId)?codeId:-1,grade,studentKey(grade),pageSize+1,(page-1)*pageSize).all<Student>(),
   db.prepare('SELECT DISTINCT grade FROM students WHERE owner=? ORDER BY grade').bind(institutionId).all<{grade:string}>()
  ]);
  return Response.json({students:rows.results.slice(0,pageSize).map(present),grades:grades.results.map(row=>row.grade),page,hasMore:rows.results.length>pageSize},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error(e);return Response.json({error:'Não foi possível consultar os alunos. Tente novamente.'},{status:503})}
}
