import {normalizeBook} from '../book-rules';
import {normalizeBookMove} from '../book-move-rules';
import {normalizeCloneBatch} from '../clone-rules';
import {normalizeOccurrence} from '../loan-list-rules';
import {cleanStudentText,studentKey} from '../student-identity';
export type Row={id:string;[key:string]:unknown};
export type Student={id:number;name:string;grade:string;created_at?:string};
export type Profile={id:string;userId:string;institutionId:string;username:string;institutionName:string;role:string;supportMode:boolean;offlineUntil:number};
export type Snapshot={books:Row[];loans:Row[];students:Student[];labels:Row[]};
export type Base={kind:'book'|'loan';id:string;value:Row};
export type Operation={id:string;at:string;body:Record<string,unknown>;base:Base[]};
export const emptySnapshot=():Snapshot=>({books:[],loans:[],students:[],labels:[]});
export function canonical(value:unknown):string{if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).filter(k=>(value as Record<string,unknown>)[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',')+'}';return JSON.stringify(value)??'null'}
export function dataOf(row:Row){const data:Record<string,unknown>={...row};delete data.id;delete data.studentId;return data}
export function targets(body:Record<string,unknown>):{kind:'book'|'loan';ids:string[]} {
 if(['return','renew','occurrence'].includes(String(body.action)))return {kind:'loan',ids:[String(body.id)]};
 if(body.action==='move'||body.action==='delete')return {kind:'book',ids:Array.isArray(body.ids)?body.ids.map(String):[]};
 if(body.action==='edit'||body.action==='clone')return {kind:'book',ids:[String(body.id)]};
 return {kind:'book',ids:[]};
}
export function bases(state:Snapshot,body:Record<string,unknown>):Base[]{const target=targets(body);return target.ids.map(id=>{const value=(target.kind==='book'?state.books:state.loans).find(r=>r.id===id);if(!value)throw Error('Registro não encontrado nesta escola.');return {kind:target.kind,id,value:structuredClone(value)}})}
function comparable(base:Base){const value=dataOf(base.value);if(base.kind==='loan'){
 value.student=studentKey(String(value.student||''));value.grade=studentKey(String(value.grade||''));
 for(const key of ['renewals','occurrences'])if(Array.isArray(value[key]))value[key]=value[key].map(event=>({...event,userName:undefined}));
 for(const key of ['returnEvent','createdEvent'])if(value[key]&&typeof value[key]==='object')value[key]={...value[key] as object,userName:undefined};
 }return canonical(value)}
export function checkBases(state:Snapshot,op:Operation){const expected=bases(state,op.body);if(op.base.length!==expected.length||expected.some(item=>{const base=op.base.find(b=>b.kind===item.kind&&b.id===item.id);return !base||comparable(base)!==comparable(item)}))throw Error('Este registro foi alterado no site. Revise o conflito antes de sincronizar.')}
const validDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export function applyOperation(original:Snapshot,op:Operation,user:Profile):Snapshot{
 if(!['bibliotecario','desenvolvedor'].includes(user.role))throw Error('Perfil sem permissão para alterar os dados.');
 if(!/^[a-f0-9-]{36}$/i.test(op.id)||!Number.isFinite(Date.parse(op.at))||!op.body||typeof op.body!=='object')throw Error('Operação inválida.');
 const state=structuredClone(original),b=op.body,action=b.action;
 if(action!==undefined&&!['delete','move','clone','return','renew','occurrence','edit','label-print'].includes(String(action)))throw Error('Operação não disponível no aplicativo.');
 if(b.kind==='loan'&&action==='edit')throw Error('Edição de empréstimo não disponível.');
 const row=(kind:'books'|'loans',id:unknown)=>{const found=state[kind].find(r=>r.id===id);if(!found)throw Error('Registro não encontrado nesta escola.');return found};
 const duplicate=(registration:string,id='')=>state.books.some(r=>r.registration===registration&&r.id!==id);
 const active=(registration:unknown)=>state.loans.some(l=>String(l.code||'').trim()===registration&&l.status!=='Devolvido');
 const event={id:op.id,at:op.at,userId:user.id,userName:user.username};
 if(action==='label-print'){
  if(!Array.isArray(b.ids)||!b.ids.length||b.ids.length>5000||typeof b.jobId!=='string'||!/^[a-f0-9-]{36}$/i.test(b.jobId))throw Error('Impressão inválida.');
  for(const id of new Set(b.ids)){const label=state.labels.find(r=>r.id===id);if(!label)throw Error('Etiqueta não disponível. Sincronize os dados.');const jobs=Array.isArray(label.localPrintJobs)?label.localPrintJobs:[];if(!jobs.includes(b.jobId)){label.printCount=Number(label.printCount||0)+1;label.lastPrintedAt=op.at;label.localPrintJobs=[...jobs,b.jobId]}}return state;
 }
 if(action==='delete'||action==='move'){
  const ids=b.ids;if(!Array.isArray(ids)||!ids.length||ids.length>(action==='move'?50:100)||ids.some(id=>typeof id!=='string'))throw Error('Seleção inválida.');
  const selected=[...new Set(ids)].map(id=>row('books',id));
  if(action==='delete'){if(selected.some(book=>active(book.registration)))throw Error('Há livro com empréstimo ativo. Nenhum livro foi excluído.');state.books=state.books.filter(book=>!ids.includes(book.id));state.labels=state.labels.filter(label=>!ids.includes(label.bookId))}
  else{const move=normalizeBookMove(b);for(const book of selected){book.rack=move.rack;book.shelf=move.shelf}}return state;
 }
 if(action==='clone'){
  const source=row('books',b.id),numbers=b.registrations;
  if(!Array.isArray(numbers)||!numbers.length||numbers.length>100||numbers.some(n=>typeof n!=='string'||!n.trim()||n.trim().length>100))throw Error('Informe de 1 a 100 registros válidos.');
  const registrations=numbers.map(n=>n.trim());if(new Set(registrations).size!==registrations.length||registrations.some(n=>duplicate(n)))throw Error('Número de registro repetido ou já utilizado.');
  const changes=normalizeCloneBatch(b.overrides,b.cloneOverrides,numbers.length);
  for(let i=0;i<numbers.length;i++)state.books.push({...source,...changes[i],id:op.id+':'+i,registration:registrations[i]});return state;
 }
 if(['return','renew','occurrence'].includes(String(action))){
  const loan=row('loans',b.id);if(action!=='occurrence'&&loan.status==='Devolvido')throw Error('O empréstimo já foi devolvido.');
  if(action==='return'){loan.status='Devolvido';loan.returnEvent=event}
  if(action==='renew'){if(b.expectedDue!==loan.due)throw Error('O prazo foi alterado. Atualize o empréstimo.');if(!validDate(b.due)||b.due<=String(loan.due)||b.due<String(loan.delivery))throw Error('Escolha uma data posterior ao prazo atual.');loan.renewals=[...(Array.isArray(loan.renewals)?loan.renewals:[]),{...event,previousDue:loan.due,due:b.due}];loan.due=b.due}
  if(action==='occurrence')loan.occurrences=[...(Array.isArray(loan.occurrences)?loan.occurrences:[]),{...event,...normalizeOccurrence(b.occurrenceType,b.note)}];return state;
 }
 if(!b.data||typeof b.data!=='object'||Array.isArray(b.data))throw Error('Dados inválidos.');const input=b.data as Record<string,string>;
 if(b.kind==='book'){
  const book=normalizeBook(input);if(duplicate(book.registration,action==='edit'?String(b.id):''))throw Error('Este registro já está em uso.');
  if(action==='edit'){const current=row('books',b.id);if(current.registration!==book.registration&&active(current.registration))throw Error('Não é permitido mudar o registro de um livro emprestado.');Object.assign(current,book)}else state.books.push({...book,id:op.id});return state;
 }
 if(b.kind==='loan'){
  for(const value of Object.values(input))if(typeof value!=='string'||value.length>1000)throw Error('Dados inválidos.');
  if(!input.student?.trim()||!input.grade?.trim()||!input.code?.trim()||!input.title?.trim()||!input.author?.trim()||!validDate(input.delivery)||!validDate(input.due)||input.due<input.delivery||!['Emprestado','Devolvido'].includes(input.status))throw Error('Confira os dados e datas do empréstimo.');
  let student=state.students.find(s=>studentKey(s.name)===studentKey(input.student)&&studentKey(s.grade)===studentKey(input.grade));
  if(input.studentId&&Number(input.studentId)>0&&!state.students.some(s=>String(s.id)===input.studentId&&studentKey(s.name)===studentKey(input.student)&&studentKey(s.grade)===studentKey(input.grade)))throw Error('Aluno selecionado não pertence a esta escola ou foi alterado.');
  if(!student){student={id:Math.min(0,...state.students.map(s=>s.id))-1,name:cleanStudentText(input.student),grade:cleanStudentText(input.grade),created_at:op.at};state.students.push(student)}
  const fields=['student','grade','code','title','author','delivery','due','status'];
  const loan:Row={...Object.fromEntries(fields.map(key=>[key,input[key]])),id:op.id,student:student.name,grade:student.grade,code:input.code.trim(),studentId:student.id};state.loans.unshift(loan);return state;
 }
 throw Error('Esta operação exige acesso ao site com internet.');
}
export function changes(before:Snapshot,after:Snapshot){return (['books','loans'] as const).flatMap(kind=>{const old=new Map(before[kind].map(r=>[r.id,r])),next=new Map(after[kind].map(r=>[r.id,r]));return [...new Set([...old.keys(),...next.keys()])].filter(id=>canonical(old.get(id)&&dataOf(old.get(id)!))!==canonical(next.get(id)&&dataOf(next.get(id)!))).map(id=>({kind:kind==='books'?'book' as const:'loan' as const,id,before:old.get(id)||null,after:next.get(id)||null}))})}
