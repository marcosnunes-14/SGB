import {getUser} from '../../auth';
import {loadStudentReport,studentReportCsv} from '../../student-report-data';
export const dynamic='force-dynamic';
export async function GET(){
 const user=await getUser();
 if(!user)return Response.json({error:'Entre novamente.'},{status:401});
 if(!user.institutionId)return Response.json({error:'Selecione uma escola.'},{status:403});
 try{return new Response(studentReportCsv(await loadStudentReport(user.userId)),{headers:{'Content-Type':'text/csv;charset=utf-8','Content-Disposition':'attachment; filename="sgb-relatorio-alunos.csv"','Cache-Control':'private, no-store'}})}
 catch(e){console.error('Student report failed',e);return Response.json({error:'Não foi possível gerar o relatório de alunos.'},{status:503})}
}
