import {studentKey,studentCode} from './student-identity';

type LoanRow={student_id:number|null;data:string};
type StudentRow={id:number;name:string;grade:string};
type Loan=Record<'delivery'|'due'|'status'|'grade'|'title'|'author',string>&{studentId:number|null};
export type DashboardFilters={start:string;end:string;grade:string;status:string;today:string};

export function summarizeDashboard(rows:LoanRow[],students:StudentRow[],filter:DashboardFilters){
 const people=new Map(students.map(s=>[s.id,s]));
 const selected=rows.flatMap<Loan>(row=>{try{return [{...JSON.parse(row.data),studentId:row.student_id} as Loan]}catch{return []}})
  .filter(l=>l.delivery>=filter.start&&l.delivery<=filter.end&&(!filter.grade||studentKey(l.grade||'')===filter.grade))
  .filter(l=>filter.status==='todos'||(filter.status==='devolvidos'?l.status==='Devolvido':filter.status==='atrasados'?l.status!=='Devolvido'&&l.due<filter.today:l.status!=='Devolvido'));
 const peopleCounts=new Map<number,number>(),bookCounts=new Map<string,{title:string;author:string;total:number}>(),gradeCounts=new Map<string,{grade:string;total:number}>(),periodCounts=new Map<string,number>();
 const monthly=(new Date(filter.end+'T12:00:00').getTime()-new Date(filter.start+'T12:00:00').getTime())/(86400*1000)>90;
 for(const l of selected){
  if(l.studentId&&people.has(l.studentId))peopleCounts.set(l.studentId,(peopleCounts.get(l.studentId)||0)+1);
  const bookKey=studentKey(l.title||'')+'|'+studentKey(l.author||'');const book=bookCounts.get(bookKey)||{title:l.title||'Sem título',author:l.author||'Autor não informado',total:0};book.total++;bookCounts.set(bookKey,book);
  const gradeKey=studentKey(l.grade||'');const grade=gradeCounts.get(gradeKey)||{grade:l.grade||'Não informada',total:0};grade.total++;gradeCounts.set(gradeKey,grade);
  const bucket=monthly?l.delivery?.slice(0,7):l.delivery;periodCounts.set(bucket,(periodCounts.get(bucket)||0)+1);
 }
 const timeline=[];const cursor=new Date(filter.start+'T12:00:00');const end=new Date(filter.end+'T12:00:00');
 while(cursor<=end&&timeline.length<750){const key=cursor.toLocaleDateString('sv-SE').slice(0,monthly?7:10);timeline.push({key,label:monthly?`${key.slice(5,7)}/${key.slice(0,4)}`:`${key.slice(8,10)}/${key.slice(5,7)}`,total:periodCounts.get(key)||0});if(monthly)cursor.setMonth(cursor.getMonth()+1,1);else cursor.setDate(cursor.getDate()+1)}
 return {metrics:{loans:selected.length,students:peopleCounts.size,books:bookCounts.size,active:selected.filter(l=>l.status!=='Devolvido').length},timeline,
  topStudents:[...peopleCounts].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([id,total])=>({id:studentCode(id),name:people.get(id)!.name,grade:people.get(id)!.grade,total})),
  topBooks:[...bookCounts.values()].sort((a,b)=>b.total-a.total).slice(0,10),
  grades:[...gradeCounts.values()].sort((a,b)=>b.total-a.total).slice(0,10),monthly};
}
