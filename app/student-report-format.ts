export type StudentReport={code:string;name:string;grade:string;createdAt:string;loans:{code?:string;title?:string;author?:string;delivery?:string;due?:string;status?:string}[]};
export function studentReportCsv(students:StudentReport[]){
 const headers=['ID do aluno','Nome do aluno','Série','Data de cadastro','Total de empréstimos','Empréstimos ativos','Empréstimos devolvidos','Último empréstimo','Código do livro','Nome do livro','Autor','Data do empréstimo','Data prevista de devolução','Situação'];
 const quote=(value:unknown)=>{let text=String(value??'');if(/^\s*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'};
 const rows=students.flatMap(s=>{
  const returned=s.loans.filter(l=>l.status==='Devolvido').length;
  const latest=s.loans.reduce((date,l)=>l.delivery&&l.delivery>date?l.delivery:date,'');
  const common=[s.code,s.name,s.grade,s.createdAt,s.loans.length,s.loans.length-returned,returned,latest];
  return s.loans.length?s.loans.map(l=>[...common,l.code,l.title,l.author,l.delivery,l.due,l.status]):[[...common,'','','','','','']];
 });
 return '\uFEFF'+[headers,...rows].map(row=>row.map(quote).join(';')).join('\r\n');
}
