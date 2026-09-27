"use client";

import {useEffect,useRef,useState} from 'react';
import {Menu,ChevronRight} from 'lucide-react';

type Row={id:string;[key:string]:string};
type Props={books:Row[];loans:Row[];loading:boolean;onReports:()=>void;onLoans:(filter:'pending'|'returned')=>void};
const labels:Record<string,string>={id:'Identificador',registration:'Número de registro',title:'Título',authors:'Autores',author:'Autor',type:'Tipo da obra',cdd:'CDD',local:'Local',publisher:'Editora',year:'Ano de publicação',pages:'Número de páginas',copies:'Número de exemplares',rack:'Estante',shelf:'Prateleira',student:'Nome do aluno',grade:'Série',code:'Código do livro',delivery:'Data de entrega',due:'Data de devolução',status:'Situação'};

const reportGroups=[
  ['Movimentação','Relatório Geral','Empréstimos','Devoluções','Empréstimos em atraso'],
  ['Alunos','Alunos que mais pegaram livros','Alunos com livros pendentes','Histórico de empréstimos por aluno'],
  ['Acervo','Livros mais emprestados','Livros menos emprestados','Livros nunca emprestados','Livros cadastrados','Livros por prateleira','Livros por autor','Livros por editora','Livros por ano de publicação'],
];

function download(filename:string,body:string,type:string){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csv(rows:Row[],fields:string[]){const quote=(value:string)=>`"${String(value??'').replaceAll('"','""')}"`;const safe=(value:string)=>/^[\s]*[=+@-]/.test(value)?`'${value}`:value;return '\uFEFF'+[fields.map(field=>quote(labels[field]||field)).join(';'),...rows.map(row=>fields.map(field=>quote(safe(row[field]||''))).join(';'))].join('\r\n')}
function translated(rows:Row[]){return rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[labels[key]||key,value])))}

export default function ExtraMenu({books,loans,loading,onReports,onLoans}:Props){
  const [open,setOpen]=useState(false),[section,setSection]=useState('');
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);root.current?.querySelector('button')?.focus()}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}},[open]);
  const close=()=>{setOpen(false);setSection('')};
  const unavailable=(label:string)=><span className="extra-menu-disabled" title="Este tipo de registro ainda não está disponível no sistema" aria-disabled="true" key={label}>{label}</span>;
  const action=(label:string,fn:()=>void)=><button type="button" className="extra-menu-item" key={label} onClick={()=>{fn();close()}}>{label}</button>;
  const exportCsv=(name:string,rows:Row[],fields:string[])=>download(`sgb-${name}.csv`,csv(rows,fields),'text/csv;charset=utf-8');
  const students=Array.from(new Map(loans.filter(l=>l.student).map(l=>[l.student.toLocaleLowerCase('pt-BR').trim(),{id:l.id,student:l.student,grade:l.grade}])).values());
  return <div className="extra-menu" ref={root} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>{setOpen(false);setSection('')}}>
    <button type="button" className="extra-menu-trigger" aria-label="Menu de Funções Extras" title="Funções extras" aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(true)}><Menu size={22}/></button>
    {open&&<div className="extra-menu-list" role="menu" aria-label="Funções extras">
      {['Relatórios','Histórico','Exportações','Dados e Backup','Atividade do Sistema','Configurações'].map(label=><div className="extra-menu-group" key={label} onMouseEnter={()=>setSection(label)} onFocus={()=>setSection(label)}>
        <button type="button" className={'extra-menu-item extra-menu-parent'+(section===label?' active':'')} aria-expanded={section===label} onClick={()=>setSection(section===label?'':label)}>{label}<ChevronRight size={15}/></button>
        {section===label&&<div className="extra-submenu" role="group" aria-label={label}>
          {label==='Relatórios'&&<>{reportGroups.map(([group,...items])=><div key={group}><span className="extra-menu-heading">{group}</span>{items.map(item=>item==='Relatório Geral'||item==='Alunos que mais pegaram livros'?action(item,onReports):unavailable(item))}</div>)}<span className="extra-menu-hint">Selecione Relatório Geral para informar as datas e gerar em nova aba.</span></>}
          {label==='Histórico'&&<>{action('Histórico de empréstimos',()=>onLoans('pending'))}{action('Histórico de devoluções',()=>onLoans('returned'))}{['Histórico de cadastros','Histórico de alterações','Histórico de exclusões'].map(unavailable)}</>}
          {label==='Exportações'&&<>{action('Exportar acervo · CSV',()=>exportCsv('acervo',books,['registration','title','authors','publisher','year','copies','rack','shelf']))}{action('Exportar empréstimos · CSV',()=>exportCsv('emprestimos',loans,['student','grade','title','code','delivery','due','status']))}{action('Exportar alunos · CSV',()=>exportCsv('alunos',students,['student','grade']))}{action('Exportar relatório · PDF',onReports)}<span className="extra-menu-hint">O relatório existente abre em nova aba e pode ser salvo em PDF pelo navegador.</span></>}
          {label==='Dados e Backup'&&<>{action('Backup dos dados · JSON',()=>download('sgb-backup.json',JSON.stringify({livros:translated(books),emprestimos:translated(loans)},null,2),'application/json;charset=utf-8'))}<span className="extra-menu-heading">Informações do banco</span><span className="extra-menu-value">Livros cadastrados: {loading?'…':books.length}</span><span className="extra-menu-value">Empréstimos: {loading?'…':loans.length}</span><span className="extra-menu-value">Registros carregados: {loading?'…':books.length+loans.length}</span></>}
          {label==='Atividade do Sistema'&&<><span className="extra-menu-heading">Últimos livros cadastrados</span>{books.slice(0,3).map(b=><span className="extra-menu-value" key={b.id}>{b.title||b.registration}</span>)}<span className="extra-menu-heading">Últimos empréstimos</span>{loans.slice(0,3).map(l=><span className="extra-menu-value" key={l.id}>{l.student} · {l.title}</span>)}{action('Devoluções registradas',()=>onLoans('returned'))}{unavailable('Últimas alterações e responsável')}</>}
          {label==='Configurações'&&<>{['Informações da biblioteca','Preferências do sistema','Aparência','Dados institucionais'].map(unavailable)}</>}
        </div>}
      </div>)}
    </div>}
  </div>
}
