import {redirect,notFound} from 'next/navigation';
import {getUser} from '../../auth';
import {database} from '@/db/raw';
import type {LoanRecord} from '../../loan-list-rules';
import PrintButton from './print-button';
import './receipt.css';
export const dynamic='force-dynamic';
export const metadata={title:'Comprovante de empréstimo | SGB'};
const date=(value?:string)=>value?new Date(value+'T12:00:00').toLocaleDateString('pt-BR'):'Não registrada';
export default async function LoanReceipt({searchParams}:{searchParams:Promise<{id?:string}>}){
 const user=await getUser();if(!user)redirect('/');if(!user.institutionId)redirect('/admin');
 const {id}=await searchParams;if(!id||typeof id!=='string'||id.length>100)notFound();
 const row=await database().prepare('SELECT data FROM loans WHERE id=? AND owner=?').bind(id,user.userId).first<{data:string}>();if(!row)notFound();
 const loan=JSON.parse(row.data) as LoanRecord;
 return <main className="loan-receipt"><div className="loan-receipt-controls"><a href="/sistema">Voltar ao SGB</a><PrintButton/></div><header><strong>SGB</strong><p>{user.institutionName||'Biblioteca escolar'}</p><h1>Comprovante de {loan.status==='Devolvido'?'devolução':'empréstimo'}</h1></header><dl>{[['Aluno',loan.student],['Série',loan.grade],['Livro',loan.title],['Autor',loan.author],['Registro',loan.code],['Data de entrega',date(loan.delivery)],['Prazo de devolução',date(loan.due)],['Situação',loan.status==='Devolvido'?'Devolvido':'Empréstimo em aberto'],...(loan.status==='Devolvido'?[['Devolução realizada',loan.returnEvent?.at?new Date(loan.returnEvent.at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Data não registrada no histórico antigo']]:[])].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Não informado'}</dd></div>)}</dl><footer><p>Registro do empréstimo: {id}</p><p>Documento emitido pelo SGB em {new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}.</p></footer></main>;
}
