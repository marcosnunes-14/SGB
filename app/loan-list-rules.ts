export const LOANS_PAGE_SIZE=50;
// Opções de turma para novos empréstimos. Valores antigos continuam armazenados como estão.
export const LOAN_CLASSES=['1 "A" DS','1 "A" ADM','1 "B" ADM','2 "A" DS','2 "A" MKT','2 "B" MKT','3 "A" DS','3 "B" DS'] as const;
const compactClass=(value:string)=>value.trim().replace(/[º°"“”'‘’\s]/gu,'').toLocaleUpperCase('pt-BR');
export function loanClassLabel(value:string){
 return LOAN_CLASSES.find(turma=>compactClass(turma)===compactClass(value))||value;
}
export function loanClassOptions(current=''){
 const label=loanClassLabel(current);
 const options:{label:string;value:string}[]=LOAN_CLASSES.map(turma=>({label:turma,value:current&&turma===label?current:turma}));
 return options;
}

export const occurrenceTypes=['Observação','Contato com aluno ou responsável','Perda ou extravio','Dano no livro','Livro encontrado','Correção informada','Outro'] as const;
export type LoanEvent={id:string;at:string;userId:string;userName:string};
export type LoanOccurrence=LoanEvent&{type:string;note:string};
export type LoanRenewal=LoanEvent&{previousDue:string;due:string};
export type LoanRecord={id:string;student?:string;grade?:string;code?:string;title?:string;author?:string;delivery?:string;due?:string;status?:string;studentId?:number|string|null;renewals?:LoanRenewal[];occurrences?:LoanOccurrence[];returnEvent?:LoanEvent;createdEvent?:LoanEvent};
export type LoanFilters={view:'pending'|'returned';query:string;grade:string;timing:string;occurrences:boolean;start:string;end:string;sort:string;today:string};
export const loanTextKey=(value:string)=>value.trim().replace(/\s+/gu,' ').normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR');
export function loanStatus(loan:LoanRecord,today:string){return loan.status==='Devolvido'?'Devolvido':loan.due&&loan.due<today?'Atrasado':'Emprestado'}
export function filterLoans(loans:LoanRecord[],filters:LoanFilters){
 const query=loanTextKey(filters.query),grade=loanTextKey(loanClassLabel(filters.grade));
 return loans.filter(l=>filters.view==='returned'?l.status==='Devolvido':l.status!=='Devolvido')
  .filter(l=>!grade||loanTextKey(loanClassLabel(l.grade||''))===grade)
  .filter(l=>!filters.start||(l.delivery||'')>=filters.start).filter(l=>!filters.end||(l.delivery||'')<=filters.end)
  .filter(l=>!filters.occurrences||Array.isArray(l.occurrences)&&l.occurrences.length>0)
  .filter(l=>filters.view==='returned'||filters.timing==='all'||(filters.timing==='late'?!!l.due&&l.due<filters.today:filters.timing==='today'?l.due===filters.today:!!l.due&&l.due>filters.today))
  .filter(l=>!query||loanTextKey([l.student,l.grade,l.code,l.title,l.author,l.studentId?'ALU-'+String(l.studentId).padStart(6,'0'):'',...(Array.isArray(l.occurrences)?l.occurrences.map(o=>o.type+' '+o.note):[])].join(' ')).includes(query))
  .sort((a,b)=>filters.sort==='student'?(a.student||'').localeCompare(b.student||'','pt-BR')||a.id.localeCompare(b.id):filters.sort==='due'?(a.due||'9999').localeCompare(b.due||'9999')||a.id.localeCompare(b.id):filters.sort==='oldest'?(a.delivery||'').localeCompare(b.delivery||'')||a.id.localeCompare(b.id):(b.delivery||'').localeCompare(a.delivery||'')||b.id.localeCompare(a.id));
}
export function normalizeOccurrence(type:unknown,note:unknown){
 if(typeof type!=='string'||!occurrenceTypes.some(value=>value===type))throw Error('Selecione um tipo de ocorrência válido.');
 if(typeof note!=='string'||!note.trim()||note.trim().length>2000)throw Error('Descreva a ocorrência em até 2.000 caracteres.');
 return {type,note:note.trim()};
}
