import {database} from '@/db/raw';
import {cleanStudentText,studentKey} from './student-identity';

type StudentRow={id:number;name:string;grade:string;name_key:string;grade_key:string};

// Pode ser chamado repetidamente. A restrição UNIQUE evita fichas duplicadas até em acessos simultâneos.
export async function associateLegacyLoans(owner:string){
 const db=database();
 const rows=await db.prepare('SELECT id,data FROM loans WHERE owner=? AND student_id IS NULL').bind(owner).all<{id:string;data:string}>();
 for(const row of rows.results){
  let data:Record<string,unknown>;try{data=JSON.parse(row.data)}catch{continue}
  if(!data||typeof data!=='object'||typeof data.student!=='string'||typeof data.grade!=='string'||!studentKey(data.student)||!studentKey(data.grade))continue;
  const name=cleanStudentText(data.student),grade=cleanStudentText(data.grade),nameKey=studentKey(name),gradeKey=studentKey(grade);
  await db.batch([
   db.prepare('INSERT OR IGNORE INTO students(owner,name,grade,name_key,grade_key) VALUES(?,?,?,?,?)').bind(owner,name,grade,nameKey,gradeKey),
   db.prepare('UPDATE loans SET student_id=(SELECT id FROM students WHERE owner=? AND name_key=? AND grade_key=?) WHERE id=? AND owner=? AND student_id IS NULL').bind(owner,nameKey,gradeKey,row.id,owner)
  ]);
 }
}

export async function resolveStudent(owner:string,nameInput:string,gradeInput:string,selectedId?:string){
 const db=database();
 if(selectedId){
  if(!/^\d+$/.test(selectedId))throw Error('Aluno selecionado inválido.');
  const selected=await db.prepare('SELECT id,name,grade,name_key,grade_key FROM students WHERE id=? AND owner=?').bind(Number(selectedId),owner).first<StudentRow>();
  if(!selected)throw Error('Aluno selecionado não pertence a esta escola.');
  if(studentKey(nameInput)!==selected.name_key||studentKey(gradeInput)!==selected.grade_key)throw Error('Nome ou série alterados. Escolha o aluno novamente ou use como novo.');
  return selected;
 }
 const name=cleanStudentText(nameInput),grade=cleanStudentText(gradeInput),nameKey=studentKey(name),gradeKey=studentKey(grade);
 await db.prepare('INSERT OR IGNORE INTO students(owner,name,grade,name_key,grade_key) VALUES(?,?,?,?,?)').bind(owner,name,grade,nameKey,gradeKey).run();
 const row=await db.prepare('SELECT id,name,grade,name_key,grade_key FROM students WHERE owner=? AND name_key=? AND grade_key=?').bind(owner,nameKey,gradeKey).first<StudentRow>();
 if(!row)throw Error('Não foi possível identificar o aluno.');
 return row;
}
