import {redirect} from 'next/navigation';
import {getUser} from '../../auth';
import {loadStudentReport} from '../../student-report-data';
import PrintButton from './print-button';
import '../report.css';
export const dynamic='force-dynamic';
export const metadata={title:'Relatório de alunos | SGB'};
const date=(value?:string)=>value?new Date(value.includes('T')?value:value.slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR'):'—';
export default async function StudentReportPage(){
 const user=await getUser();if(!user)redirect('/');if(!user.institutionId)redirect('/admin');
 const students=await loadStudentReport(user.userId);
 return <main className="reader-report"><header className="reader-report-hero"><h1>ALUNOS</h1><p>SGB</p></header><div className="reader-report-content"><div className="reader-report-summary"><div><strong>{user.institutionName}</strong><p>{students.length} alunos registrados · Histórico completo</p></div><div className="student-report-actions"><a href="/api/student-report">Baixar para Excel · CSV</a><PrintButton/></div></div>{students.length?students.map(s=><section className="student-report-person" key={s.code}><h2>{s.name} <small>{s.code}</small></h2><p>Série: {s.grade} · Cadastro: {date(s.createdAt)} · Total: {s.loans.length} · Ativos: {s.loans.filter(l=>l.status!=='Devolvido').length} · Devolvidos: {s.loans.filter(l=>l.status==='Devolvido').length}</p><div className="student-report-table"><table><thead><tr>{['Registro','Livro','Autor','Empréstimo','Devolução prevista','Situação'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{s.loans.length?s.loans.map((l,i)=><tr key={i}><td>{l.code||'—'}</td><td>{l.title||'—'}</td><td>{l.author||'—'}</td><td>{date(l.delivery)}</td><td>{date(l.due)}</td><td>{l.status||'—'}</td></tr>):<tr><td colSpan={6}>Nenhum empréstimo registrado.</td></tr>}</tbody></table></div></section>):<div className="reader-report-empty">Nenhum aluno registrado nesta escola.</div>}</div></main>
}
