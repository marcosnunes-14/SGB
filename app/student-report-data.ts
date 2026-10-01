import {database} from '@/db/raw';
import {associateLegacyLoans} from './students-data';
import {studentCode} from './student-identity';
import {studentReportCsv,type StudentReport} from './student-report-format';
export {studentReportCsv};
export async function loadStudentReport(owner:string):Promise<StudentReport[]> {
 await associateLegacyLoans(owner);
 const db=database();
 const [students,loans]=await db.batch([
  db.prepare('SELECT id,name,grade,created_at FROM students WHERE owner=? ORDER BY name_key,grade_key,id').bind(owner),
  db.prepare('SELECT student_id,data FROM loans WHERE owner=? AND student_id IN (SELECT id FROM students WHERE owner=?) ORDER BY json_extract(data,\'$.delivery\') DESC,id').bind(owner,owner)
 ]);
 const grouped=new Map<number,StudentReport['loans']>();
 for(const row of loans.results as {student_id:number;data:string}[]){const list=grouped.get(row.student_id)||[];list.push(JSON.parse(row.data));grouped.set(row.student_id,list)}
 return (students.results as {id:number;name:string;grade:string;created_at:string}[]).map(s=>({code:studentCode(s.id),name:s.name,grade:s.grade,createdAt:s.created_at,loans:grouped.get(s.id)||[]}));
}
