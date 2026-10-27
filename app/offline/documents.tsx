"use client";
import {useState} from 'react';
import {loansInPeriod,validReportPeriod} from '../loan-report';
import {studentCode} from '../student-identity';
import {studentReportCsv} from '../student-report-format';
import LabelPrintPage from '../etiquetas/imprimir/print-page';
import type {Profile,Snapshot,Row} from './model';
const text=(row:Row,key:string)=>String(row[key]||'');
const date=(value:unknown)=>typeof value==='string'&&value?new Date(value.length===10?value+'T12:00:00':value).toLocaleDateString('pt-BR'):'Não registrada';
export default function OfflineDocuments({view,state,user}:{view:string;state:Snapshot;user:Profile}){
 const [printed,setPrinted]=useState(false);const params=new URLSearchParams(location.search);
 if(view==='labels')return <LabelPrintPage readonly={user.role==='direcao'}/>;
 let rows=state.loans,title='Relatório de empréstimos';
 if(view==='receipt'){rows=rows.filter(row=>row.id===params.get('id'));title='Comprovante de empréstimo / devolução'}
 if(view==='report'){const start=params.get('inicio')||'',end=params.get('fim')||'';if(!validReportPeriod(start,end))return <p className="error">Período inválido. Volte ao aplicativo e escolha as datas.</p>;rows=loansInPeriod(rows,start,end)}
 if(view==='students')title='Relatório de alunos';
 function csv(){const people=state.students.map(s=>({code:s.id>0?studentCode(s.id):'Aguardando sincronização',name:s.name,grade:s.grade,createdAt:s.created_at||'',loans:state.loans.filter(l=>Number(l.studentId)===s.id).map(l=>({title:text(l,'title'),author:text(l,'author'),code:text(l,'code'),delivery:text(l,'delivery'),due:text(l,'due'),status:text(l,'status')}))}));const url=URL.createObjectURL(new Blob([studentReportCsv(people)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='sgb-alunos.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <main className="offline-document"><div className="offline-document-controls"><a href="/aplicativo">Voltar ao aplicativo</a><button onClick={()=>{window.print();setPrinted(true)}}>Imprimir / salvar em PDF</button>{view==='students'&&<button onClick={csv}>Exportar alunos · CSV</button>}{printed&&<span>Use a janela de impressão do computador.</span>}</div><header><strong>SGB</strong><p>{user.institutionName}</p><h1>{title}</h1><small>Dados disponíveis neste computador · {new Date().toLocaleString('pt-BR')}</small></header>{view==='students'?<table><thead><tr><th>Aluno</th><th>Série</th><th>Identificação</th><th>Empréstimos</th><th>Pendentes</th></tr></thead><tbody>{state.students.map(s=>{const loans=state.loans.filter(l=>Number(l.studentId)===s.id);return <tr key={s.id}><td>{s.name}</td><td>{s.grade}</td><td>{s.id>0?studentCode(s.id):'Aguardando sincronização'}</td><td>{loans.length}</td><td>{loans.filter(l=>l.status!=='Devolvido').length}</td></tr>})}</tbody></table>:<><table><thead><tr><th>Aluno / Série</th><th>Registro / Livro</th><th>Entrega</th><th>Prazo</th><th>Situação</th></tr></thead><tbody>{rows.map(l=><tr key={l.id}><td>{text(l,'student')}<small>{text(l,'grade')}</small></td><td>{text(l,'code')} · {text(l,'title')}<small>{text(l,'author')}</small></td><td>{date(l.delivery)}</td><td>{date(l.due)}</td><td>{text(l,'status')}{view==='receipt'&&l.status==='Devolvido'&&<small>Devolução: {date((l.returnEvent as {at?:string})?.at)}</small>}</td></tr>)}</tbody></table>{!rows.length&&<p>Nenhum registro encontrado.</p>}</>}</main>;
}
