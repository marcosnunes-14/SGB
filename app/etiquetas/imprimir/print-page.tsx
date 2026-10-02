"use client";
import {useEffect,useRef,useState} from 'react';
import BookLabel from '../../book-label';
import {labelIds,labelSizes,validLabelSize,type LabelBook,type LabelSize,type LabelsResponse} from '../../label-rules';
import '../../labels.css';
import './print.css';
export default function LabelPrintPage({readonly}:{readonly:boolean}){
 const [books,setBooks]=useState<LabelBook[]>([]),[school,setSchool]=useState(''),[size,setSize]=useState<LabelSize>('50x30'),[error,setError]=useState(''),[loading,setLoading]=useState(true),[job,setJob]=useState(''),[confirming,setConfirming]=useState(false),[confirmed,setConfirmed]=useState(false);
 const automatic=useRef(false);
 useEffect(()=>{const abort=new AbortController();async function load(){try{
  const key=new URLSearchParams(location.search).get('selecao');if(!key||!/^[-a-f0-9]{36}$/i.test(key))throw Error('Seleção inválida. Volte ao SGB e escolha os exemplares.');
  const raw=sessionStorage.getItem('sgb-label-print-'+key);if(!raw)throw Error('Seleção expirada. Volte ao SGB e escolha os exemplares.');
  const selection=JSON.parse(raw),ids=labelIds(selection.ids);if(!validLabelSize(selection.size))throw Error('Tamanho de etiqueta inválido.');
  const response=await fetch('/api/labels',{signal:abort.signal}),data=await response.json() as LabelsResponse;if(!response.ok)throw Error(data.error);
  const map=new Map<string,LabelBook>(data.books.map(b=>[b.id,b]));if(ids.some(id=>!map.has(id)))throw Error('Um exemplar foi removido ou não pertence à escola atual. Atualize a seleção.');
  setBooks(ids.map(id=>map.get(id)!));setSchool(data.school);setSize(selection.size);
 }catch(e){if(!abort.signal.aborted)setError((e as Error).message)}finally{if(!abort.signal.aborted)setLoading(false)}}load();return()=>abort.abort()},[]);
 function print(){if(readonly||!books.length)return;setError('');setJob(crypto.randomUUID());setConfirmed(false);window.print()}
 useEffect(()=>{if(loading||error||!books.length||readonly||automatic.current)return;const timer=setTimeout(()=>{if(automatic.current)return;automatic.current=true;setJob(crypto.randomUUID());window.print()},300);return()=>clearTimeout(timer)},[loading,error,books,readonly]);
 async function confirm(){setConfirming(true);setError('');try{const response=await fetch('/api/labels',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'confirm-print',jobId:job,ids:books.map(b=>b.id)})});const result=await response.json() as {error?:string};if(!response.ok)throw Error(result.error);setConfirmed(true)}catch(e){setError((e as Error).message)}finally{setConfirming(false)}}
 const dimensions=labelSizes[size];
 return <main className="label-print-page"><style>{`@media print{@page{size:${dimensions.width}mm ${dimensions.height}mm;margin:0}}`}</style><div className="label-print-controls"><h1>Impressão de etiquetas</h1><p>{books.length} etiqueta(s) · {dimensions.width} × {dimensions.height} mm</p><p>Selecione o mesmo tamanho no driver da impressora, escala 100% e desative cabeçalhos e rodapés.</p>{loading?<p>Carregando etiquetas…</p>:!readonly&&<><button type="button" onClick={print} disabled={!books.length||confirming}>Imprimir etiquetas</button><button type="button" onClick={confirm} disabled={!job||confirmed||confirming}>{confirmed?'Impressão registrada':confirming?'Registrando…':'Confirmar que as etiquetas foram impressas'}</button><p>Confirme somente se as etiquetas saíram na impressora. Cancelar ou visualizar não registra impressão.</p></>}{error&&<p role="alert">{error}</p>}<a href="/sistema">Voltar ao SGB</a></div><div className="label-print-sheets">{books.map(b=><BookLabel key={b.id} book={b} school={school} size={size}/>)}</div></main>
}
