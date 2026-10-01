"use client";

import {useEffect,useRef,useState} from 'react';
import {Menu,ChevronRight} from 'lucide-react';

type Row={id:string;[key:string]:string};
type Props={books:Row[];loans:Row[];loading:boolean;onReports:()=>void};
const labels:Record<string,string>={id:'Identificador',registration:'Número de registro',title:'Título',authors:'Autores',author:'Autor',type:'Tipo da obra',cdd:'CDD',local:'Local',publisher:'Editora',year:'Ano de publicação',pages:'Número de páginas',copies:'Número de exemplares',rack:'Estante',shelf:'Prateleira',student:'Nome do aluno',grade:'Série',code:'Código do livro',delivery:'Data de entrega',due:'Data de devolução',status:'Situação'};

function download(filename:string,body:string,type:string){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function csv(rows:Row[],fields:string[]){const quote=(value:string)=>`"${String(value??'').replaceAll('"','""')}"`;const safe=(value:string)=>/^[\s]*[=+@-]/.test(value)?`'${value}`:value;return '\uFEFF'+[fields.map(field=>quote(labels[field]||field)).join(';'),...rows.map(row=>fields.map(field=>quote(safe(row[field]||''))).join(';'))].join('\r\n')}
function translated(rows:Row[]){return rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[labels[key]||key,value])))}

export default function ExtraMenu({books,loans,loading,onReports}:Props){
  const [open,setOpen]=useState(false),[section,setSection]=useState('');
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);root.current?.querySelector('button')?.focus()}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}},[open]);
  const close=()=>{setOpen(false);setSection('')};
  const action=(label:string,fn:()=>void)=><button type="button" className="extra-menu-item" key={label} onClick={()=>{fn();close()}}>{label}</button>;
  const exportCsv=(name:string,rows:Row[],fields:string[])=>download(`sgb-${name}.csv`,csv(rows,fields),'text/csv;charset=utf-8');
  return <div className="extra-menu" ref={root} onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>{setOpen(false);setSection('')}}>
    <button type="button" className="extra-menu-trigger" aria-label="Menu de Funções Extras" title="Funções extras" aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(true)}><Menu size={22}/></button>
    {open&&<div className="extra-menu-list" role="menu" aria-label="Funções extras">
      {['Relatórios','Exportações'].map(label=><div className="extra-menu-group" key={label} onMouseEnter={()=>setSection(label)} onFocus={()=>setSection(label)}>
        <button type="button" className={'extra-menu-item extra-menu-parent'+(section===label?' active':'')} aria-expanded={section===label} onClick={()=>setSection(section===label?'':label)}>{label}<ChevronRight size={15}/></button>
        {section===label&&<div className="extra-submenu" role="group" aria-label={label}>
          {label==='Relatórios'&&<>{action('Relatório de empréstimos por período',onReports)}<a className="extra-menu-item" href="/relatorio/alunos" target="_blank" rel="noopener noreferrer" onClick={close}>Gerar relatório de alunos</a></>}
          {label==='Exportações'&&<>{loading?<span className="extra-menu-hint">Carregando os dados da escola…</span>:<>{action('Acervo · CSV',()=>exportCsv('acervo',books,['registration','title','authors','publisher','year','copies','rack','shelf']))}{action('Empréstimos · CSV',()=>exportCsv('emprestimos',loans,['student','grade','title','code','delivery','due','status']))}{action('Dados da escola · JSON',()=>download('sgb-dados.json',JSON.stringify({livros:translated(books),emprestimos:translated(loans)},null,2),'application/json;charset=utf-8'))}</>}</>}
        </div>}
      </div>)}
    </div>}
  </div>
}
